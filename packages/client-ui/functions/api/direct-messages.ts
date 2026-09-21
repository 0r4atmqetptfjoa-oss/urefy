import { canonicalizeJson, validateDirectMessageFrame, verifyDirectMessageRegistration, type DirectMessageFrame, type SovereignSignedEnvelope } from '@aetheris/core-crypto';
import { requireSignedEnvelope } from './_auth.js';
import { getD1Database, type Env } from './_db.js';

interface IdentityRow {
  fingerprint: string;
  signing_public_key: string;
  registration_json: string;
}

interface MessageRow {
  sequence: number;
  id: string;
  sender_fingerprint: string;
  recipient_fingerprint: string;
  envelope_json: string;
  created_at: number;
}

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readBody(request: Request): Promise<any> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Request body is required');
  const decoder = new TextDecoder();
  let text = '';
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1024 * 1024) {
      await reader.cancel();
      throw new Error('Request exceeds the private message size limit');
    }
    text += decoder.decode(value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}

export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  const database = getD1Database(context.env);
  if (!database) return json({ success: false, error: 'Persistent private messaging storage is unavailable' }, 503);
  let envelope: SovereignSignedEnvelope<any>;
  try { envelope = await readBody(context.request); }
  catch { return json({ success: false, error: 'Invalid or oversized private message request' }, 400); }

  const auth = await requireSignedEnvelope(context, envelope, 'dm:send');
  if (!auth.authorized) return auth.response!;
  const fingerprint = auth.fingerprint!;
  const payload = auth.payload;
  if (!payload || typeof payload !== 'object') return json({ success: false, error: 'A messaging action is required' }, 400);

  try {
    const role = await database.prepare('SELECT is_quarantined FROM user_roles WHERE fingerprint = ?').bind(fingerprint).first<{ is_quarantined: number }>();
    if (role?.is_quarantined) return json({ success: false, error: 'Messaging is restricted for this identity' }, 403);

    if (payload.action === 'register') {
      if (!verifyDirectMessageRegistration(envelope, fingerprint)) return json({ success: false, error: 'Public encryption keys must be bound to the signed registration' }, 400);
      await database.prepare(`INSERT INTO dm_identities (fingerprint, signing_public_key, registration_json, updated_at)
        VALUES (?, ?, ?, ?) ON CONFLICT(fingerprint) DO UPDATE SET registration_json = excluded.registration_json, updated_at = excluded.updated_at
        WHERE dm_identities.signing_public_key = excluded.signing_public_key`)
        .bind(fingerprint, auth.publicKey, JSON.stringify(envelope), Date.now()).run();
      const registered = await database.prepare('SELECT * FROM dm_identities WHERE fingerprint = ?').bind(fingerprint).first<IdentityRow>();
      if (registered?.signing_public_key !== auth.publicKey) return json({ success: false, error: 'This identity is already bound to a different signing key' }, 409);
      return json({ success: true, fingerprint });
    }

    const owner = await database.prepare('SELECT * FROM dm_identities WHERE fingerprint = ?').bind(fingerprint).first<IdentityRow>();
    if (owner?.signing_public_key !== auth.publicKey) return json({ success: false, error: 'Register the current messaging identity first' }, 403);

    if (payload.action === 'set-permission') {
      const perm = payload.dmPermission;
      if (!['everyone', 'following', 'shared', 'nobody'].includes(perm)) {
        return json({ success: false, error: 'Invalid DM permission setting' }, 400);
      }
      await database.prepare(`
        CREATE TABLE IF NOT EXISTS dm_permissions (
          fingerprint TEXT PRIMARY KEY,
          permission TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `).run();
      await database.prepare(`
        INSERT INTO dm_permissions (fingerprint, permission, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(fingerprint) DO UPDATE SET permission = excluded.permission, updated_at = excluded.updated_at
      `).bind(fingerprint, perm, Date.now()).run();
      return json({ success: true, dmPermission: perm });
    }

    if (payload.action === 'lookup') {
      if (!/^[0-9a-f]{16}$/i.test(payload.fingerprint ?? '')) return json({ success: false, error: 'Invalid recipient fingerprint' }, 400);
      const recipient = await database.prepare('SELECT * FROM dm_identities WHERE fingerprint = ?').bind(payload.fingerprint).first<IdentityRow>();
      if (!recipient) return json({ success: false, error: 'The recipient has not enabled private messaging yet' }, 404);
      let dmPermission = 'everyone';
      try {
        await database.prepare(`CREATE TABLE IF NOT EXISTS dm_permissions (fingerprint TEXT PRIMARY KEY, permission TEXT NOT NULL, updated_at INTEGER NOT NULL)`).run();
        const permRow = await database.prepare('SELECT permission FROM dm_permissions WHERE fingerprint = ?').bind(payload.fingerprint).first<{ permission: string }>();
        if (permRow?.permission) dmPermission = permRow.permission;
      } catch (_) {}
      return json({ success: true, registration: JSON.parse(recipient.registration_json), dmPermission });
    }

    if (payload.action === 'send') {
      const freeze = await database.prepare('SELECT value FROM system_config WHERE key = ?').bind('emergencyFreeze').first<{ value: string }>();
      if (freeze?.value === 'true') return json({ success: false, error: 'Messaging is temporarily paused by administration' }, 503);
      const message = payload.message as DirectMessageFrame;
      if (!validateDirectMessageFrame(message) || message.sender !== fingerprint || message.senderPublicKey !== auth.publicKey ||
          Object.keys(payload).some(key => key !== 'action' && key !== 'message')) {
        return json({ success: false, error: 'A valid signed encrypted message is required' }, 400);
      }
      const recipient = await database.prepare('SELECT * FROM dm_identities WHERE fingerprint = ?').bind(message.recipient).first<IdentityRow>();
      if (!recipient || recipient.signing_public_key !== message.recipientPublicKey) return json({ success: false, error: 'Recipient key is unavailable or has changed' }, 409);

      let recipientPolicy = 'everyone';
      try {
        await database.prepare(`CREATE TABLE IF NOT EXISTS dm_permissions (fingerprint TEXT PRIMARY KEY, permission TEXT NOT NULL, updated_at INTEGER NOT NULL)`).run();
        const permRow = await database.prepare('SELECT permission FROM dm_permissions WHERE fingerprint = ?').bind(message.recipient).first<{ permission: string }>();
        if (permRow?.permission) recipientPolicy = permRow.permission;
      } catch (_) {}

      if (recipientPolicy === 'nobody') {
        return json({ success: false, error: 'Recipient does not accept direct messages' }, 403);
      }

      if (recipientPolicy === 'following') {
        const isFollow = await database.prepare(
          'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?'
        ).bind(message.recipient, fingerprint).first();
        if (!isFollow) {
          return json({ success: false, error: 'Recipient only accepts messages from people they follow' }, 403);
        }
      }

      if (recipientPolicy === 'shared') {
        const shared = await database.prepare(`
          SELECT 1 FROM community_members cm1
          JOIN community_members cm2 ON cm1.community_id = cm2.community_id
          WHERE cm1.user_id = ? AND cm2.user_id = ?
          LIMIT 1
        `).bind(fingerprint, message.recipient).first();
        if (!shared) {
          return json({ success: false, error: 'Recipient only accepts messages from shared community members' }, 403);
        }
      }
      const serialized = JSON.stringify({ ...(envelope.version === 2 ? { version: 2 } : {}), payload, signature: envelope.signature, nonce: envelope.nonce, timestamp: envelope.timestamp, identity: auth.identity });
      const inserted = await database.prepare(`INSERT OR IGNORE INTO direct_messages (id, sender_fingerprint, recipient_fingerprint, envelope_json, created_at) VALUES (?, ?, ?, ?, ?)`)
        .bind(message.id, fingerprint, message.recipient, serialized, Date.now()).run();
      const stored = await database.prepare('SELECT * FROM direct_messages WHERE id = ?').bind(message.id).first<MessageRow>();
      if (!stored || stored.sender_fingerprint !== fingerprint || stored.recipient_fingerprint !== message.recipient ||
          canonicalizeJson(JSON.parse(stored.envelope_json).payload.message) !== canonicalizeJson(message)) {
        return json({ success: false, error: 'Message ID conflict' }, 409);
      }
      return json({ success: true, id: stored.id, sequence: stored.sequence, createdAt: stored.created_at }, inserted.meta?.changes === 1 ? 201 : 200);
    }

    if (payload.action === 'list') {
      const after = payload.after ?? 0;
      if (!Number.isSafeInteger(after) || after < 0) return json({ success: false, error: 'Invalid message cursor' }, 400);
      const rows = await database.prepare(`SELECT * FROM direct_messages WHERE sequence > ? AND (sender_fingerprint = ? OR recipient_fingerprint = ?) ORDER BY sequence ASC LIMIT 100`)
        .bind(after, fingerprint, fingerprint).all<MessageRow>();
      return json({ success: true, messages: rows.results.map(row => ({ sequence: row.sequence, createdAt: row.created_at, envelope: JSON.parse(row.envelope_json) })), nextCursor: rows.results.at(-1)?.sequence ?? after });
    }

    return json({ success: false, error: 'Unknown private messaging action' }, 400);
  } catch {
    return json({ success: false, error: 'Private messaging storage could not complete the request' }, 503);
  }
}