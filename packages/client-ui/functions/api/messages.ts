// ===========================================================================
// AETHERIS OMNI-SPHERE — E2EE MESSAGES & RELAY FEED EDGE API
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
  INITIAL_MESSAGES,
} from './_db.js';
import { requireAdmin, verifyIdentitySignature } from './_auth.js';

export { EdgeMessage };

export function parseD1MessageRow(row: any): EdgeMessage {
  const cipher = row.ciphertext || row.text || '';
  return {
    id: row.id,
    channelId: row.channelId ?? row.channel_id ?? 'relays-general',
    authorFingerprint: row.authorFingerprint ?? row.author_fingerprint ?? 'anon-peer',
    text: cipher,
    ciphertext: cipher,
    epoch: row.epoch || '#1',
    status: row.status || 'verified',
    signature: row.signature || undefined,
    createdAt: Number(row.createdAt !== undefined ? row.createdAt : row.created_at) || Date.now(),
    isMine: false,
  };
}

export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const channelId = url.searchParams.get('channelId') || 'relays-general';
    const sinceParam = url.searchParams.get('since');
    const since = sinceParam ? parseInt(sinceParam, 10) : null;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);

    let messages: EdgeMessage[] = [];

    // 1. Query Cloudflare D1 Database if binding present
    if (db) {
      try {
        let query = 'SELECT * FROM messages WHERE 1=1';
        const params: any[] = [];

        if (channelId && channelId !== 'all') {
          query += ' AND (channelId = ? OR channel_id = ?)';
          params.push(channelId, channelId);
        }

        if (since !== null && !isNaN(since)) {
          query += ' AND (createdAt > ? OR created_at > ?)';
          params.push(since, since);
        }

        query += ' ORDER BY createdAt ASC, created_at ASC LIMIT ?';
        params.push(limit);

        const stmt = db.prepare(query).bind(...params);
        const { results } = await stmt.all<any>();

        if (results && results.length > 0) {
          messages = results.map(parseD1MessageRow);
        } else if (since === null || isNaN(since)) {
          // If D1 is empty on initial migration, fallback to in-memory seed messages
          messages = globalMessagesStore.filter((m) => (channelId === 'all' ? true : m.channelId === channelId));
        }
      } catch (dbErr) {
        console.warn('[D1 Messages Fallback]', dbErr);
        messages = globalMessagesStore.filter((m) => (channelId === 'all' ? true : m.channelId === channelId));
      }
    } else {
      // 2. In-Memory Edge Store Fallback
      let filtered = [...globalMessagesStore];

      if (channelId && channelId !== 'all') {
        filtered = filtered.filter((m) => m.channelId === channelId);
      }

      if (since !== null && !isNaN(since)) {
        filtered = filtered.filter((m) => m.createdAt > since);
      }

      filtered.sort((a, b) => a.createdAt - b.createdAt);
      messages = filtered.slice(0, limit);
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
    const body = (await context.request.json()) as Partial<EdgeMessage>;
    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);

    const textContent = (body.ciphertext || body.text || '').trim();
    if (!textContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message content cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Enforce E2EE: ciphertext must be present. Reject pure plaintext payloads.
    const ciphertext = (body.ciphertext || '').trim();
    if (!ciphertext) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'E2EE violation: ciphertext is required. Plaintext message transmission and storage are strictly prohibited.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authentication: Require Admin OR Cryptographic Identity Signature
    const adminCheck = await requireAdmin(context);
    let authorFingerprint = body.authorFingerprint || 'anon-peer';

    if (!adminCheck.authorized) {
      const auth = verifyIdentitySignature(body, context.request);
      if (!auth.valid) {
        return (
          auth.response ||
          new Response(
            JSON.stringify({ success: false, error: 'Identity authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }
      authorFingerprint = auth.fingerprint || authorFingerprint;
    }

    const newMsg: EdgeMessage = {
      id: body.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

    // Insert into Cloudflare D1 if available (only ciphertexts stored)
    if (db) {
      try {
        await db
          .prepare(
            `INSERT OR REPLACE INTO messages (
              id, channelId, channel_id, authorFingerprint, author_fingerprint,
              text, ciphertext, epoch, status, signature, createdAt, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            newMsg.id,
            newMsg.channelId,
            newMsg.channelId,
            newMsg.authorFingerprint,
            newMsg.authorFingerprint,
            newMsg.ciphertext,
            newMsg.ciphertext,
            newMsg.epoch,
            newMsg.status,
            newMsg.signature || null,
            newMsg.createdAt,
            newMsg.createdAt
          )
          .run();
      } catch (dbErr) {
        console.warn('[D1 Message Insert Fallback]', dbErr);
      }
    }

    // Cache latest message in KV if available
    if (kv) {
      try {
        await kv.put(`latest_msg:${newMsg.channelId}`, JSON.stringify(newMsg), { expirationTtl: 300 });
      } catch (_) {}
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
