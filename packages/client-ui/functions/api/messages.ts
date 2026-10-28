// ===========================================================================
// UREfy — E2EE MESSAGES & RELAY FEED EDGE API
// Supports: Cloudflare D1 (SQL), Cloudflare KV (Real-time caching)
// Automatic fallback to In-Memory Edge Store when bindings are not present.
// ===========================================================================

import {
  Env,
  EdgeMessage,
  getD1Database,
  getKVStore,
  globalMessagesStore,
  incrementMessageCounter,
  isProductionEnv,
  createD1UnavailableResponse,
} from './_db.js';
import { requireAdmin, requireSignedEnvelope } from './_auth.js';

export { EdgeMessage };

export function parseD1MessageRow(row: any): EdgeMessage {
  const cipher = row.ciphertext || '';
  return {
    id: row.id,
    channelId: row.channel_id ?? row.channelId ?? 'relays-general',
    authorFingerprint: row.author_id ?? row.author_fingerprint ?? row.authorFingerprint ?? 'anon-peer',
    text: cipher,
    ciphertext: cipher,
    epoch: row.epoch || '#1',
    status: row.status || 'verified',
    signature: row.signature || undefined,
    createdAt: Number(row.created_at !== undefined ? row.created_at : row.createdAt) || Date.now(),
    isMine: false,
  };
}

export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const channelId = url.searchParams.get('channelId') || 'relays-general';
    const sinceParam = url.searchParams.get('since');
    const since = sinceParam === null ? null : Number(sinceParam);
    const requestedLimit = Number(url.searchParams.get('limit') ?? '100');
    if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1 ||
        (since !== null && (!Number.isSafeInteger(since) || since < 0 || sinceParam?.trim() === ''))) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid pagination parameters' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    const limit = Math.min(requestedLimit, 500);

    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);

    const isProd = isProductionEnv(context.env);
    let messages: EdgeMessage[] = [];

    // 1. Query Cloudflare D1 Database if binding present
    if (db) {
      try {
        let query = 'SELECT * FROM messages WHERE 1=1';
        const params: any[] = [];

        if (channelId && channelId !== 'all') {
          query += ' AND channel_id = ?';
          params.push(channelId);
        }

        if (since !== null && !isNaN(since)) {
          query += ' AND created_at > ?';
          params.push(since);
          query += ' ORDER BY created_at ASC LIMIT ?';
          params.push(limit);
        } else {
          query = `SELECT * FROM (${query} ORDER BY created_at DESC LIMIT ?) sub ORDER BY created_at ASC`;
          params.push(limit);
        }

        const stmt = db.prepare(query).bind(...params);
        const { results } = await stmt.all<any>();

        if (results && results.length > 0) {
          messages = results.map(parseD1MessageRow);
        } else if (isProd) {
          messages = [];
        } else if (since === null || isNaN(since)) {
          // If D1 is empty on initial migration in dev/test, fallback to in-memory seed messages
          const matching = globalMessagesStore.filter((m) => (channelId === 'all' ? true : m.channelId === channelId));
          messages = matching.slice(-limit);
        }
      } catch (dbErr: any) {
        if (isProd) {
          return new Response(
            JSON.stringify({ success: false, error: `Database query failed: ${dbErr?.message || 'D1 error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        console.warn('[D1 Messages Fallback]', dbErr);
        const matching = globalMessagesStore.filter((m) => (channelId === 'all' ? true : m.channelId === channelId));
        messages = matching.slice(-limit);
      }
    } else if (isProd) {
      return createD1UnavailableResponse();
    } else {
      // 2. In-Memory Edge Store Fallback (Dev/Test only)
      let filtered = [...globalMessagesStore];

      if (channelId && channelId !== 'all') {
        filtered = filtered.filter((m) => m.channelId === channelId);
      }

      if (since !== null && !isNaN(since)) {
        filtered = filtered.filter((m) => m.createdAt > since);
      }

      filtered.sort((a, b) => a.createdAt - b.createdAt);
      messages = since !== null && !isNaN(since) ? filtered.slice(0, limit) : filtered.slice(-limit);
    }

    return new Response(
      JSON.stringify({
        success: true,
        channelId,
        count: messages.length,
        messages,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Edge-Storage': db ? 'Cloudflare-D1' : 'Edge-Isolate-Memory',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const rawBody = (await context.request.json()) as any;
    let body: Partial<EdgeMessage> = rawBody;
    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);

    const candidateBody = rawBody.payload && typeof rawBody.payload === 'object' ? rawBody.payload : rawBody;
    const ciphertext = (candidateBody.ciphertext || '').trim();
    if (!ciphertext) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'E2EE violation: ciphertext is required. Plaintext message transmission and storage are strictly prohibited.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authentication: Require Admin OR Cryptographic Identity Signature / SovereignSignedEnvelope
    const adminCheck = await requireAdmin(context);

    // Emergency freeze check
    if (!adminCheck.authorized && db) {
      try {
        const freezeRow: any = await db
          .prepare('SELECT value FROM system_config WHERE key = ?')
          .bind('emergencyFreeze')
          .first();
        if (freezeRow && freezeRow.value === 'true') {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Emergency Freeze Active: All network messaging is temporarily suspended by sovereign administration.',
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (_) {}
    }

    let authorFingerprint = rawBody.authorFingerprint || 'anon-peer';

    if (!adminCheck.authorized) {
      const auth = await requireSignedEnvelope(context, rawBody, 'relay:publish');
      if (!auth.authorized) {
        return (
          auth.response ||
          new Response(
            JSON.stringify({ success: false, error: 'Identity authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }
      authorFingerprint = auth.fingerprint || authorFingerprint;
      if (auth.payload) {
        body = auth.payload;
      }
    } else if (rawBody.payload) {
      body = rawBody.payload;
    }

    // Quarantine check from user_roles in D1
    if (!adminCheck.authorized && db) {
      try {
        const roleRow: any = await db
          .prepare('SELECT is_quarantined FROM user_roles WHERE fingerprint = ?')
          .bind(authorFingerprint)
          .first();
        if (roleRow && roleRow.is_quarantined === 1) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Access Denied: Your identity has been quarantined by network moderation.',
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (_) {}
    }

    const randSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 8)
      : Date.now().toString(36);
    const newMsg: EdgeMessage = {
      id: body.id || `msg-${Date.now()}-${randSuffix}`,
      channelId: body.channelId || 'relays-general',
      authorFingerprint,
      text: ciphertext, // Prohibit plaintext storage - text is set to ciphertext
      ciphertext,
      epoch: body.epoch || '#1',
      status: 'verified',
      signature: body.signature || '',
      createdAt: body.createdAt || Date.now(),
      isMine: false,
    };

    const isProd = isProductionEnv(context.env);

    if (!db && globalMessagesStore.some((message) => message.id === newMsg.id)) {
      return new Response(JSON.stringify({ success: false, error: 'Message ID already exists' }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Insert into Cloudflare D1 if available (only ciphertexts stored)
    if (db) {
      try {
        const stmt = db
          .prepare(
            `INSERT INTO messages (
              id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            newMsg.id,
            newMsg.channelId,
            newMsg.authorFingerprint,
            newMsg.ciphertext,
            (body as any).nonce || null,
            newMsg.epoch,
            newMsg.status,
            newMsg.signature || null,
            newMsg.createdAt
          );

        const runResult = await stmt.run();
        if (isProd && runResult && runResult.success === false) {
          return new Response(
            JSON.stringify({ success: false, error: `Database message insert rejected: ${runResult.error || 'D1 error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (dbErr: any) {
        const errMsg = String(dbErr?.message || '');
        if (/UNIQUE constraint failed: messages\.id/i.test(errMsg)) {
          return new Response(JSON.stringify({ success: false, error: 'Message ID already exists' }), {
            status: 409, headers: { 'Content-Type': 'application/json' },
          });
        }
        if (/FOREIGN KEY constraint failed/i.test(errMsg)) {
          return new Response(JSON.stringify({ success: false, error: `Channel "${newMsg.channelId}" does not exist` }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          });
        }
        if (isProd) {
          return new Response(
            JSON.stringify({ success: false, error: `Database transaction failed: ${errMsg || 'D1 message error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        console.warn('[D1 Message Insert Fallback]', dbErr);
      }
    } else if (isProd) {
      return createD1UnavailableResponse();
    }

    // In-memory isolate store sync
    const existingIndex = globalMessagesStore.findIndex(
      (m) =>
        m.id === newMsg.id ||
        (m.text === newMsg.text &&
          m.authorFingerprint === newMsg.authorFingerprint &&
          Math.abs(m.createdAt - newMsg.createdAt) < 15000)
    );

    if (existingIndex >= 0) {
      globalMessagesStore[existingIndex] = newMsg;
    } else {
      globalMessagesStore.push(newMsg);
    }

    incrementMessageCounter();

    if (globalMessagesStore.length > 2000) {
      globalMessagesStore.splice(0, globalMessagesStore.length - 1500);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: newMsg,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'X-Edge-Storage': db ? 'Cloudflare-D1' : 'Edge-Isolate-Memory',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
