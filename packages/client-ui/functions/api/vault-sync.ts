import {
  Env,
  getD1Database,
  getR2Bucket,
  isProductionEnv,
  createD1UnavailableResponse,
} from './_db.js';
import { requireSignedEnvelope } from './_auth.js';

export const VAULT_SYNC_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sovereign-Envelope',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
};

const MAX_VAULT_PAYLOAD_BYTES = 5 * 1024 * 1024;

interface MemoryVaultSyncEntry {
  owner: string;
  version: number;
  byteSize: number;
  itemCount: number;
  ciphertext: string;
  iv: string;
  salt?: string;
  ciphertextHash: string;
  updatedAt: number;
}

const memoryVaultSyncStore = new Map<string, MemoryVaultSyncEntry>();

export function resetMemoryVaultSyncStore(): void {
  memoryVaultSyncStore.clear();
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: VAULT_SYNC_CORS_HEADERS,
  });
}

async function computeSha256Hex(data: string): Promise<string> {
  const enc = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hash), (b: number) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet(context: {
  request: Request;
  env?: Env;
}): Promise<Response> {
  try {
    const req = context.request;
    const url = new URL(req.url);
    const isProd = isProductionEnv(context.env);
    const db = getD1Database(context.env);
    const r2 = getR2Bucket(context.env);

    if (isProd && (!db || !r2)) {
      return createD1UnavailableResponse();
    }

    let envelopeObj: any = null;
    const envelopeHeader = req.headers.get('X-Sovereign-Envelope');
    if (envelopeHeader) {
      try {
        envelopeObj = JSON.parse(envelopeHeader);
      } catch {}
    } else {
      const authParam = url.searchParams.get('auth');
      if (authParam) {
        try {
          envelopeObj = JSON.parse(decodeURIComponent(authParam));
        } catch {}
      }
    }

    const authResult = await requireSignedEnvelope(context, envelopeObj);
    if (!authResult.authorized || !authResult.fingerprint) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error || 'Authentication required' }),
        { status: 401, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const requesterFingerprint = authResult.fingerprint;
    const requestedOwner = (url.searchParams.get('owner') || requesterFingerprint).trim();

    if (requesterFingerprint !== requestedOwner) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Cannot access another identity’s private vault' }),
        { status: 403, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (db && r2) {
      const row = await db
        .prepare('SELECT owner_fingerprint, version, byte_size, item_count, ciphertext_hash, updated_at FROM vault_sync WHERE owner_fingerprint = ?')
        .bind(requestedOwner)
        .first<{
          owner_fingerprint: string;
          version: number;
          byte_size: number;
          item_count: number;
          ciphertext_hash: string;
          updated_at: number;
        }>();

      if (!row) {
        return new Response(
          JSON.stringify({
            success: true,
            notFound: true,
            version: 0,
            updatedAt: 0,
            itemCount: 0,
          }),
          { status: 200, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const r2Key = `vault-sync/${requestedOwner}/sync.enc`;
      const obj = await r2.get(r2Key);
      if (!obj) {
        return new Response(
          JSON.stringify({
            success: true,
            notFound: true,
            version: row.version,
            updatedAt: row.updated_at,
            itemCount: row.item_count,
          }),
          { status: 200, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const text = await obj.text();
      let parsedEnvelope: { ciphertext: string; iv: string; salt?: string } | null = null;
      try {
        parsedEnvelope = JSON.parse(text);
      } catch {
        parsedEnvelope = { ciphertext: text, iv: '' };
      }

      if (parsedEnvelope?.ciphertext && row.ciphertext_hash) {
        const actualHash = await computeSha256Hex(parsedEnvelope.ciphertext);
        if (actualHash !== row.ciphertext_hash) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Vault integrity check failed: ciphertext hash mismatch between D1 and R2',
            }),
            { status: 500, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          version: row.version,
          byteSize: row.byte_size,
          itemCount: row.item_count,
          updatedAt: row.updated_at,
          ciphertext: parsedEnvelope?.ciphertext,
          iv: parsedEnvelope?.iv,
          salt: parsedEnvelope?.salt,
        }),
        {
          status: 200,
          headers: {
            ...VAULT_SYNC_CORS_HEADERS,
            'Content-Type': 'application/json',
            'X-Edge-Storage': 'Cloudflare-R2-D1',
          },
        }
      );
    }

    const memEntry = memoryVaultSyncStore.get(requestedOwner);
    if (!memEntry) {
      return new Response(
        JSON.stringify({
          success: true,
          notFound: true,
          version: 0,
          updatedAt: 0,
          itemCount: 0,
        }),
        { status: 200, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        version: memEntry.version,
        byteSize: memEntry.byteSize,
        itemCount: memEntry.itemCount,
        updatedAt: memEntry.updatedAt,
        ciphertext: memEntry.ciphertext,
        iv: memEntry.iv,
        salt: memEntry.salt,
      }),
      {
        status: 200,
        headers: {
          ...VAULT_SYNC_CORS_HEADERS,
          'Content-Type': 'application/json',
          'X-Edge-Storage': 'Edge-Isolate-Memory',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to read vault sync state' }),
      { status: 500, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestPost(context: {
  request: Request;
  env?: Env;
}): Promise<Response> {
  try {
    const req = context.request;
    const isProd = isProductionEnv(context.env);
    const db = getD1Database(context.env);
    const r2 = getR2Bucket(context.env);

    if (isProd && (!db || !r2)) {
      return createD1UnavailableResponse();
    }

    let body: any = null;
    try {
      body = await req.json();
    } catch {}

    const envelope = body?.envelope || body;
    const authResult = await requireSignedEnvelope(context, envelope);
    if (!authResult.authorized || !authResult.fingerprint) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error || 'Authentication required' }),
        { status: 401, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const payload = authResult.payload || {};
    const owner = (payload.owner || authResult.fingerprint).trim();
    const version = Number(payload.version);
    const itemCount = Number(payload.itemCount) || 0;
    const ciphertext = typeof payload.ciphertext === 'string' ? payload.ciphertext : '';
    const iv = typeof payload.iv === 'string' ? payload.iv : '';
    const salt = typeof payload.salt === 'string' ? payload.salt : '';

    if (authResult.fingerprint !== owner) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Cannot write to another identity’s private vault' }),
        { status: 403, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (!Number.isSafeInteger(version) || version <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid vault sync version: must be a positive integer' }),
        { status: 400, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (!ciphertext || !iv) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payload: ciphertext and iv are required' }),
        { status: 400, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const byteSize = new TextEncoder().encode(ciphertext).byteLength;
    if (byteSize > MAX_VAULT_PAYLOAD_BYTES) {
      return new Response(
        JSON.stringify({ success: false, error: `Vault sync payload exceeds 5 MiB ceiling (${Math.round(byteSize / 1024)} KiB)` }),
        { status: 413, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const ciphertextHash = await computeSha256Hex(ciphertext);
    const now = Date.now();

    if (db && r2) {
      const existing = await db
        .prepare('SELECT version, ciphertext_hash FROM vault_sync WHERE owner_fingerprint = ?')
        .bind(owner)
        .first<{ version: number; ciphertext_hash: string }>();

      if (existing && version < existing.version) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Version conflict: incoming version (${version}) is older than stored version (${existing.version})`,
            currentVersion: existing.version,
          }),
          { status: 409, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const envelopeBody = JSON.stringify({
        version,
        ciphertext,
        iv,
        salt,
        itemCount,
        updatedAt: now,
      });

      const r2Key = `vault-sync/${owner}/sync.enc`;
      await r2.put(r2Key, envelopeBody, {
        customMetadata: {
          owner,
          version: String(version),
          ciphertextHash,
          itemCount: String(itemCount),
          updatedAt: String(now),
        },
      });

      await db
        .prepare(`
          INSERT INTO vault_sync (owner_fingerprint, version, byte_size, item_count, ciphertext_hash, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(owner_fingerprint) DO UPDATE SET
            version = excluded.version,
            byte_size = excluded.byte_size,
            item_count = excluded.item_count,
            ciphertext_hash = excluded.ciphertext_hash,
            updated_at = excluded.updated_at
          WHERE excluded.version >= vault_sync.version
        `)
        .bind(owner, version, byteSize, itemCount, ciphertextHash, now)
        .run();

      return new Response(
        JSON.stringify({
          success: true,
          version,
          itemCount,
          updatedAt: now,
          storage: 'Cloudflare-R2-D1',
        }),
        { status: 200, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const existingMem = memoryVaultSyncStore.get(owner);
    if (existingMem && version < existingMem.version) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Version conflict: incoming version (${version}) is older than stored version (${existingMem.version})`,
          currentVersion: existingMem.version,
        }),
        { status: 409, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    memoryVaultSyncStore.set(owner, {
      owner,
      version,
      byteSize,
      itemCount,
      ciphertext,
      iv,
      salt,
      ciphertextHash,
      updatedAt: now,
    });

    return new Response(
      JSON.stringify({
        success: true,
        version,
        itemCount,
        updatedAt: now,
        storage: 'Edge-Isolate-Memory',
      }),
      { status: 200, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to persist vault sync state' }),
      { status: 500, headers: { ...VAULT_SYNC_CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}
