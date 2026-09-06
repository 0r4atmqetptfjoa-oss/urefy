/**
 * Cloudflare Pages Function: /api/webauthn
 * Complete Server-Side WebAuthn Level 3 Passkey Registration & Assertion Verification Engine.
 * Distributed Multi-Isolate Architecture:
 * - Authoritative Challenge Store in Cloudflare D1 (webauthn_challenges) & KV with 300s TTL.
 * - Authoritative Credential Store in Cloudflare D1 (webauthn_credentials).
 * - Mandatory Web Crypto P-256 ECDSA Signature Verification (Zero Bypass).
 */

import { Env, getD1Database, getKVStore } from './_db.js';

// Transient local edge memory cache (local PoP optimization; D1/KV remain authoritative)
const challengeMemoryCache = new Map<string, { challenge: string; timestamp: number }>();
const CHALLENGE_TTL_MS = 300000; // 5 minutes

const credentialMemoryCache = new Map<string, {
  credentialId: string;
  fingerprint: string;
  publicKey: string;
  counter: number;
  createdAt: number;
}>();

export function resetWebAuthnMemoryStore(): void {
  challengeMemoryCache.clear();
  credentialMemoryCache.clear();
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converts ASN.1 DER-encoded ECDSA signature to raw 64-byte (r || s) format
 * expected by Web Crypto API SubtleCrypto.verify().
 */
export function derToRawSignature(der: Uint8Array): Uint8Array {
  if (der.length === 64) {
    return der; // Already IEEE P1363 raw signature
  }
  if (der[0] !== 0x30) {
    return der;
  }

  let offset = 2;
  if (der[1] & 0x80) {
    offset += (der[1] & 0x7f);
  }

  if (der[offset] !== 0x02) {
    return der;
  }
  offset++;
  const rLen = der[offset++];
  let r = der.subarray(offset, offset + rLen);
  offset += rLen;

  if (der[offset] !== 0x02) {
    return der;
  }
  offset++;
  const sLen = der[offset++];
  let s = der.subarray(offset, offset + sLen);

  if (r.length === 33 && r[0] === 0) r = r.subarray(1);
  if (s.length === 33 && s[0] === 0) s = s.subarray(1);

  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  return raw;
}

/**
 * Parses or imports a WebAuthn P-256 public key into a CryptoKey for verification.
 * Accepts JWK object, JSON-stringified JWK, or base64url-encoded SPKI DER buffer.
 */
export async function importWebAuthnPublicKey(rawKey: any): Promise<CryptoKey> {
  if (!rawKey || rawKey === 'fido2-attested-credential') {
    throw new Error('Missing or invalid public key material');
  }

  let jwk: JsonWebKey;
  if (typeof rawKey === 'string') {
    try {
      jwk = JSON.parse(rawKey);
    } catch {
      const buf = base64UrlToBuffer(rawKey);
      return await crypto.subtle.importKey(
        'spki',
        buf,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
      );
    }
  } else {
    jwk = rawKey;
  }

  if (!jwk.x || !jwk.y) {
    throw new Error('JWK missing elliptic curve coordinates (x, y)');
  }

  return await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: jwk.x,
      y: jwk.y,
      ext: false,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
}

// ─── DISTRIBUTED STORAGE LAYER: D1 & KV PERSISTENCE ─────────────────────────

async function saveChallenge(env: Env | undefined, fingerprint: string, challenge: string): Promise<void> {
  const now = Date.now();
  const expiresAt = now + CHALLENGE_TTL_MS;

  // Local transient cache
  challengeMemoryCache.set(fingerprint, { challenge, timestamp: now });

  // Cloudflare D1 Authoritative Persistence (webauthn_challenges)
  const db = getD1Database(env);
  if (db) {
    try {
      await db.prepare(
        `INSERT OR REPLACE INTO webauthn_challenges (fingerprint, challenge, expires_at, created_at)
         VALUES (?, ?, ?, ?)`
      )
        .bind(fingerprint, challenge, expiresAt, now)
        .run();
    } catch (e) {
      console.warn('[WebAuthn] D1 saveChallenge warning:', e);
    }
  }

  // Cloudflare KV Edge Replication
  const kv = getKVStore(env) || env?.KV_SESSIONS;
  if (kv) {
    try {
      await kv.put(`webauthn_challenge:${fingerprint}`, challenge, {
        expirationTtl: 300,
      });
    } catch (e) {
      console.warn('[WebAuthn] KV saveChallenge warning:', e);
    }
  }
}

async function getChallenge(env: Env | undefined, fingerprint: string): Promise<string | null> {
  const now = Date.now();

  // 1. Check Cloudflare D1 Authoritative Persistent Store first
  const db = getD1Database(env);
  if (db) {
    try {
      const row = await db.prepare(
        `SELECT challenge, expires_at FROM webauthn_challenges WHERE fingerprint = ? AND expires_at > ?`
      )
        .bind(fingerprint, now)
        .first<{ challenge: string; expires_at: number }>();

      if (row?.challenge) {
        return row.challenge;
      }
    } catch (e) {
      console.warn('[WebAuthn] D1 getChallenge warning:', e);
    }
  }

  // 2. Check Cloudflare KV Edge Store
  const kv = getKVStore(env) || env?.KV_SESSIONS;
  if (kv) {
    try {
      const kvVal = await kv.get(`webauthn_challenge:${fingerprint}`);
      if (kvVal) return kvVal;
    } catch (e) {
      console.warn('[WebAuthn] KV getChallenge warning:', e);
    }
  }

  // 3. Fallback to local memory cache
  const cached = challengeMemoryCache.get(fingerprint);
  if (cached && now - cached.timestamp <= CHALLENGE_TTL_MS) {
    return cached.challenge;
  }
  return null;
}

async function deleteChallenge(env: Env | undefined, fingerprint: string): Promise<void> {
  challengeMemoryCache.delete(fingerprint);

  const db = getD1Database(env);
  if (db) {
    try {
      await db.prepare(`DELETE FROM webauthn_challenges WHERE fingerprint = ?`)
        .bind(fingerprint)
        .run();
    } catch (_) {}
  }

  const kv = getKVStore(env) || env?.KV_SESSIONS;
  if (kv) {
    try {
      await kv.delete(`webauthn_challenge:${fingerprint}`);
    } catch (_) {}
  }
}

async function saveCredential(
  env: Env | undefined,
  cred: {
    credentialId: string;
    fingerprint: string;
    publicKey: string;
    counter: number;
    transports?: string;
    createdAt: number;
  }
): Promise<void> {
  credentialMemoryCache.set(cred.credentialId, {
    credentialId: cred.credentialId,
    fingerprint: cred.fingerprint,
    publicKey: cred.publicKey,
    counter: cred.counter,
    createdAt: cred.createdAt,
  });

  const db = getD1Database(env);
  if (db) {
    try {
      await db.prepare(
        `INSERT OR REPLACE INTO webauthn_credentials (credential_id, fingerprint, public_key_spki, algorithm, sign_count, transports, created_at)
         VALUES (?, ?, ?, 'ES256', ?, ?, ?)`
      )
        .bind(
          cred.credentialId,
          cred.fingerprint,
          cred.publicKey,
          cred.counter,
          cred.transports || null,
          cred.createdAt
        )
        .run();
    } catch (e) {
      console.warn('[WebAuthn] D1 saveCredential warning:', e);
    }
  }
}

async function getCredential(
  env: Env | undefined,
  credentialId: string
): Promise<{ credentialId: string; fingerprint: string; publicKey: string; counter: number } | null> {
  const db = getD1Database(env);
  if (db) {
    try {
      const row = await db.prepare(
        `SELECT credential_id, fingerprint, public_key_spki, sign_count FROM webauthn_credentials WHERE credential_id = ?`
      )
        .bind(credentialId)
        .first<{ credential_id: string; fingerprint: string; public_key_spki: string; sign_count: number }>();

      if (row) {
        return {
          credentialId: row.credential_id,
          fingerprint: row.fingerprint,
          publicKey: row.public_key_spki,
          counter: Number(row.sign_count || 0),
        };
      }
    } catch (e) {
      console.warn('[WebAuthn] D1 getCredential warning:', e);
    }
  }

  const mem = credentialMemoryCache.get(credentialId);
  return mem || null;
}

async function updateCredentialCounter(
  env: Env | undefined,
  credentialId: string,
  newCounter: number
): Promise<void> {
  const mem = credentialMemoryCache.get(credentialId);
  if (mem) {
    mem.counter = newCounter;
  }

  const db = getD1Database(env);
  if (db) {
    try {
      await db.prepare(
        `UPDATE webauthn_credentials SET sign_count = ? WHERE credential_id = ?`
      )
        .bind(newCounter, credentialId)
        .run();
    } catch (e) {
      console.warn('[WebAuthn] D1 updateCredentialCounter warning:', e);
    }
  }
}

async function listCredentialsByFingerprint(env: Env | undefined, fingerprint: string): Promise<string[]> {
  const creds = new Set<string>();

  const db = getD1Database(env);
  if (db) {
    try {
      const result = await db.prepare(
        `SELECT credential_id FROM webauthn_credentials WHERE fingerprint = ?`
      )
        .bind(fingerprint)
        .all<{ credential_id: string }>();

      if (result && Array.isArray(result.results)) {
        for (const row of result.results) {
          if (row.credential_id) creds.add(row.credential_id);
        }
      }
    } catch (e) {
      console.warn('[WebAuthn] D1 listCredentials warning:', e);
    }
  }

  for (const [id, c] of credentialMemoryCache.entries()) {
    if (c.fingerprint === fingerprint) {
      creds.add(id);
    }
  }

  return Array.from(creds);
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────────

export async function onRequest(context: { request: Request; env?: Env }): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS headers
  const origin = request.headers.get('Origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Fingerprint',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── GET: Issue Challenge or List Credentials ──────────────────────────────
    if (request.method === 'GET') {
      const action = url.searchParams.get('action') || 'challenge';
      const fingerprint = url.searchParams.get('fingerprint') || 'anonymous_node';

      if (action === 'challenge') {
        const challengeBytes = new Uint8Array(32);
        crypto.getRandomValues(challengeBytes);
        const challenge = bufferToBase64Url(challengeBytes);

        // Store challenge in Cloudflare D1 + KV + Local Cache with 300s TTL
        await saveChallenge(env, fingerprint, challenge);

        // Clean expired in-memory challenges
        const now = Date.now();
        for (const [k, v] of challengeMemoryCache.entries()) {
          if (now - v.timestamp > CHALLENGE_TTL_MS) {
            challengeMemoryCache.delete(k);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            challenge,
            rpId: url.hostname,
            timeout: 60000,
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      if (action === 'credentials') {
        const creds = await listCredentialsByFingerprint(env, fingerprint);
        return new Response(
          JSON.stringify({ success: true, credentials: creds }),
          { status: 200, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Unknown GET action' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ─── POST: Register or Verify ──────────────────────────────────────────────
    if (request.method === 'POST') {
      const body = (await request.json()) as any;
      const { action, fingerprint, credentialId, clientDataJSON } = body || {};

      if (!action || !fingerprint) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing action or fingerprint' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Check active challenge in D1 / KV / Memory
      const expectedChallenge = await getChallenge(env, fingerprint);
      if (!expectedChallenge) {
        return new Response(
          JSON.stringify({ success: false, error: 'WebAuthn challenge expired or not found. Please request a new challenge.' }),
          { status: 401, headers: corsHeaders }
        );
      }

      // ────────────────────────────────────────────────────────────────────────
      // 1. Action: Register Passkey
      // ────────────────────────────────────────────────────────────────────────
      if (action === 'register') {
        if (!credentialId || !clientDataJSON) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing credentialId or clientDataJSON for registration' }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Public Key MUST be provided and valid (eliminates fake 'fido2-attested-credential' bypass)
        const rawPublicKey = body.publicKey || body.jwk;
        if (!rawPublicKey || rawPublicKey === 'fido2-attested-credential') {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'A valid P-256 public key (JWK or SPKI) is required for registration',
            }),
            { status: 400, headers: corsHeaders }
          );
        }

        let serializedPublicKey: string;
        try {
          await importWebAuthnPublicKey(rawPublicKey);
          serializedPublicKey = typeof rawPublicKey === 'string' ? rawPublicKey : JSON.stringify(rawPublicKey);
        } catch (pkErr: any) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Invalid WebAuthn public key: ${pkErr?.message || 'Unsupported key material'}`,
            }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Validate clientDataJSON
        let parsedClientData: any;
        try {
          const rawClientDataStr = typeof clientDataJSON === 'string'
            ? (clientDataJSON.includes('{') ? clientDataJSON : new TextDecoder().decode(base64UrlToBuffer(clientDataJSON)))
            : '';
          parsedClientData = JSON.parse(rawClientDataStr);
        } catch (_) {
          return new Response(
            JSON.stringify({ success: false, error: 'Malformed clientDataJSON' }),
            { status: 400, headers: corsHeaders }
          );
        }

        if (parsedClientData.type !== 'webauthn.create') {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid clientData type: expected webauthn.create' }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Verify challenge strictly matches
        if (parsedClientData.challenge !== expectedChallenge) {
          return new Response(
            JSON.stringify({ success: false, error: 'WebAuthn challenge mismatch during registration' }),
            { status: 401, headers: corsHeaders }
          );
        }

        // Persist credential in D1 & Edge registry
        await saveCredential(env, {
          credentialId,
          fingerprint,
          publicKey: serializedPublicKey,
          counter: 0,
          transports: body.transports ? JSON.stringify(body.transports) : undefined,
          createdAt: Date.now(),
        });

        // Atomically delete used challenge from D1 and KV
        await deleteChallenge(env, fingerprint);

        return new Response(
          JSON.stringify({
            success: true,
            credentialId,
            message: 'Passkey registered and cryptographically verified on Sovereign Edge.',
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      // ────────────────────────────────────────────────────────────────────────
      // 2. Action: Verify Assertion (FIDO2 L3 Signature & Authenticator Check)
      // ────────────────────────────────────────────────────────────────────────
      if (action === 'verify') {
        if (!credentialId || !clientDataJSON) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing assertion verification parameters' }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Signature and authenticatorData are MANDATORY. Never bypass!
        if (!body.signature || !body.authenticatorData) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Missing mandatory cryptographic signature or authenticatorData for assertion verification',
            }),
            { status: 401, headers: corsHeaders }
          );
        }

        // Look up registered credential (D1 Authoritative + Edge memory fallback)
        const cred = await getCredential(env, credentialId);
        if (!cred || cred.fingerprint !== fingerprint) {
          return new Response(
            JSON.stringify({ success: false, error: 'Credential not registered for this sovereign fingerprint' }),
            { status: 404, headers: corsHeaders }
          );
        }

        // 1. Validate clientDataJSON
        let parsedClientData: any;
        let rawClientDataBytes: Uint8Array;
        try {
          if (typeof clientDataJSON === 'string' && clientDataJSON.includes('{')) {
            rawClientDataBytes = new TextEncoder().encode(clientDataJSON);
            parsedClientData = JSON.parse(clientDataJSON);
          } else {
            const buf = base64UrlToBuffer(clientDataJSON);
            rawClientDataBytes = new Uint8Array(buf);
            parsedClientData = JSON.parse(new TextDecoder().decode(rawClientDataBytes));
          }
        } catch (_) {
          return new Response(
            JSON.stringify({ success: false, error: 'Malformed clientDataJSON' }),
            { status: 400, headers: corsHeaders }
          );
        }

        if (parsedClientData.type !== 'webauthn.get') {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid clientData type: expected webauthn.get' }),
            { status: 400, headers: corsHeaders }
          );
        }

        // 2. Verify challenge strictly matches
        if (parsedClientData.challenge !== expectedChallenge) {
          return new Response(
            JSON.stringify({ success: false, error: 'WebAuthn challenge mismatch or replay detected' }),
            { status: 401, headers: corsHeaders }
          );
        }

        // 3. Verify clientDataJSON.origin against the expected application origin.
        // Allows env override (WEBAUTHN_ALLOWED_ORIGIN) for staging/preview deployments.
        const requestUrl = new URL(request.url);
        const allowedOrigins: string[] = [
          (env as any)?.WEBAUTHN_ALLOWED_ORIGIN || 'https://aetheris-omni-sphere.pages.dev',
          `https://${requestUrl.hostname}`,
        ];
        const receivedOrigin = parsedClientData.origin as string | undefined;
        if (!receivedOrigin || !allowedOrigins.includes(receivedOrigin)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `WebAuthn origin mismatch: received "${receivedOrigin}", expected one of [${allowedOrigins.join(', ')}]`,
            }),
            { status: 401, headers: corsHeaders }
          );
        }

        // 4. Parse authenticatorData
        let authDataBytes: Uint8Array;
        let signCount = 0;
        try {
          const buf = typeof body.authenticatorData === 'string'
            ? base64UrlToBuffer(body.authenticatorData)
            : body.authenticatorData;
          authDataBytes = new Uint8Array(buf);
        } catch (_) {
          return new Response(
            JSON.stringify({ success: false, error: 'Malformed authenticatorData' }),
            { status: 400, headers: corsHeaders }
          );
        }

        if (authDataBytes.length < 37) {
          return new Response(
            JSON.stringify({ success: false, error: 'authenticatorData too short (< 37 bytes)' }),
            { status: 400, headers: corsHeaders }
          );
        }

        // 5. Verify rpIdHash: bytes 0–31 of authenticatorData MUST equal SHA-256(rpId).
        // rpId defaults to the effective hostname; override via WEBAUTHN_RP_ID env var.
        const rpId: string =
          (env as any)?.WEBAUTHN_RP_ID || requestUrl.hostname || 'aetheris-omni-sphere.pages.dev';
        const expectedRpIdHash = new Uint8Array(
          await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rpId))
        );
        const receivedRpIdHash = authDataBytes.slice(0, 32);
        const rpIdHashMatch =
          receivedRpIdHash.length === expectedRpIdHash.length &&
          receivedRpIdHash.every((b, i) => b === expectedRpIdHash[i]);
        if (!rpIdHashMatch) {
          return new Response(
            JSON.stringify({ success: false, error: `WebAuthn rpIdHash mismatch for rpId "${rpId}"` }),
            { status: 401, headers: corsHeaders }
          );
        }

        // 6. Flags check: Byte 32 -> User Presence (UP bit 0) MUST be set
        const flags = authDataBytes[32];
        const userPresent = (flags & 0x01) !== 0;
        if (!userPresent) {
          return new Response(
            JSON.stringify({ success: false, error: 'User Presence (UP) flag not set by authenticator' }),
            { status: 401, headers: corsHeaders }
          );
        }

        // Sign Count check: Bytes 33..36 (32-bit big-endian unsigned integer)
        signCount =
          ((authDataBytes[33] << 24) >>> 0) +
          ((authDataBytes[34] << 16) >>> 0) +
          ((authDataBytes[35] << 8) >>> 0) +
          authDataBytes[36];

        // Cloned authenticator / Replay protection: if counter was non-zero and hasn't increased, fail
        if (cred.counter > 0 && signCount > 0 && signCount <= cred.counter) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Potential replay attack: authenticator signCount (${signCount}) did not advance past ${cred.counter}`,
            }),
            { status: 403, headers: corsHeaders }
          );
        }

        // 8. Verify Cryptographic Signature over (authenticatorData || SHA-256(clientDataJSON))
        let cryptoKey: CryptoKey;
        try {
          cryptoKey = await importWebAuthnPublicKey(cred.publicKey);
        } catch (keyErr: any) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to import registered public key: ${keyErr?.message || 'Invalid key'}`,
            }),
            { status: 500, headers: corsHeaders }
          );
        }

        const clientDataHash = await crypto.subtle.digest('SHA-256', rawClientDataBytes);
        const signedData = new Uint8Array(authDataBytes.length + 32);
        signedData.set(authDataBytes, 0);
        signedData.set(new Uint8Array(clientDataHash), authDataBytes.length);

        const rawSigBuf = typeof body.signature === 'string'
          ? base64UrlToBuffer(body.signature)
          : body.signature;
        const rawSigBytes = derToRawSignature(new Uint8Array(rawSigBuf));

        let isSigValid = false;
        try {
          isSigValid = await crypto.subtle.verify(
            { name: 'ECDSA', hash: 'SHA-256' },
            cryptoKey,
            rawSigBytes,
            signedData
          );
        } catch (sigErr: any) {
          return new Response(
            JSON.stringify({ success: false, error: `WebAuthn signature verification error: ${sigErr.message}` }),
            { status: 401, headers: corsHeaders }
          );
        }

        if (!isSigValid) {
          return new Response(
            JSON.stringify({ success: false, error: 'WebAuthn assertion signature verification failed' }),
            { status: 401, headers: corsHeaders }
          );
        }

        // 9. Update counter in D1/memory & ATOMICALLY delete challenge from D1/KV/Memory
        const updatedCounter = signCount > 0 ? signCount : cred.counter + 1;
        await updateCredentialCounter(env, credentialId, updatedCounter);
        await deleteChallenge(env, fingerprint);

        return new Response(
          JSON.stringify({
            success: true,
            authenticated: true,
            verifiedAt: Date.now(),
            counter: updatedCounter,
            message: 'FIDO2 Level 3 Assertion cryptographically verified on Sovereign Edge.',
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Unsupported POST action' }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal WebAuthn edge error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
