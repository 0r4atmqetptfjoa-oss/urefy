import {
  canonicalizeJson,
  validateDirectMessageFrame,
  verifyDirectMessageRegistration,
  verifyDeviceCertificate,
  verifyDeviceSignedEnvelope,
  type DirectMessageFrame,
  type SovereignSignedEnvelope,
  type DeviceSignedEnvelope,
} from '@aetheris/core-crypto';
import { checkAndRecordNonceMemory, requireSignedEnvelope } from './_auth.js';
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
  let envelope: any;
  try { envelope = await readBody(context.request); }
  catch { return json({ success: false, error: 'Invalid or oversized private message request' }, 400); }

  let fingerprint: string;
  let authPublicKey: string;
  let authIdentity: any;
  let isDeviceAuth = false;
  let callerDeviceId: string | undefined;
  let callerDevicePublicKey: string | undefined;

  if (envelope?.authType === 'device') {
    const devVerify = verifyDeviceSignedEnvelope(envelope);
    if (!devVerify.authorized) {
      return json({ success: false, error: devVerify.error || 'Device cryptographic signature verification failed' }, 401);
    }
    if (!checkAndRecordNonceMemory(`device:${envelope.deviceId}:${envelope.nonce}`)) {
      return json({ success: false, error: 'Replay attack detected: duplicate request nonce' }, 401);
    }
    fingerprint = envelope.identityFingerprint;
    authPublicKey = envelope.devicePublicKey.toLowerCase();
    callerDeviceId = envelope.deviceId;
    callerDevicePublicKey = envelope.devicePublicKey.toLowerCase();
    isDeviceAuth = true;

    // Verify calling device exists and is active in D1
    try {
      await database.prepare(`
        CREATE TABLE IF NOT EXISTS dm_devices (
          fingerprint TEXT NOT NULL,
          device_id TEXT NOT NULL,
          device_public_key TEXT NOT NULL DEFAULT '',
          device_label TEXT,
          registration_json TEXT NOT NULL,
          certificate_json TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'revoked')),
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (fingerprint, device_id)
        )
      `).run();
      try { await database.prepare(`ALTER TABLE dm_devices ADD COLUMN device_public_key TEXT NOT NULL DEFAULT ''`).run(); } catch (_) {}
      try { await database.prepare(`ALTER TABLE dm_devices ADD COLUMN certificate_json TEXT`).run(); } catch (_) {}

      const devRow = await database.prepare(
        'SELECT status, device_public_key FROM dm_devices WHERE fingerprint = ? AND device_id = ?'
      ).bind(fingerprint, callerDeviceId).first<{ status: string; device_public_key: string }>();

      if (!devRow) {
        return json({ success: false, error: 'Device is not registered for this sovereign identity' }, 403);
      }
      if (devRow.status === 'revoked') {
        return json({ success: false, error: 'Device has been revoked and cannot send or receive messages' }, 403);
      }
      if (devRow.device_public_key.toLowerCase() !== callerDevicePublicKey) {
        return json({ success: false, error: 'Device public key mismatch' }, 403);
      }
    } catch (_) {}
  } else {
    const auth = await requireSignedEnvelope(context, envelope, 'dm:send');
    if (!auth.authorized) return auth.response!;
    fingerprint = auth.fingerprint!;
    authPublicKey = auth.publicKey!;
    authIdentity = auth.identity;
  }

  const payload = envelope.payload;
  if (!payload || typeof payload !== 'object') return json({ success: false, error: 'A messaging action is required' }, 400);

  // Enforce Authority Boundaries: Root actions require Sovereign Root Authority
  if (isDeviceAuth && ['register', 'register-device', 'revoke-device', 'set-permission'].includes(payload.action)) {
    return json({ success: false, error: 'Sovereign root authority required for this action' }, 403);
  }

  // Routine DM operations claiming a device ID strictly require a valid Device Signature
  if (['send', 'list', 'read-receipt'].includes(payload.action)) {
    const specifiedDevId = payload.deviceId || payload.senderDeviceId || payload.message?.senderDeviceId;
    if (specifiedDevId && !isDeviceAuth) {
      return json({ success: false, error: 'Device signature is required for routine messaging operations' }, 401);
    }
  }

  try {
    const role = await database.prepare('SELECT is_quarantined FROM user_roles WHERE fingerprint = ?').bind(fingerprint).first<{ is_quarantined: number }>();
    if (role?.is_quarantined) return json({ success: false, error: 'Messaging is restricted for this identity' }, 403);

    if (payload.action === 'register') {
      if (!verifyDirectMessageRegistration(envelope, fingerprint)) return json({ success: false, error: 'Public encryption keys must be bound to the signed registration' }, 400);
      await database.prepare(`INSERT INTO dm_identities (fingerprint, signing_public_key, registration_json, updated_at)
        VALUES (?, ?, ?, ?) ON CONFLICT(fingerprint) DO UPDATE SET registration_json = excluded.registration_json, updated_at = excluded.updated_at
        WHERE dm_identities.signing_public_key = excluded.signing_public_key`)
        .bind(fingerprint, authPublicKey, JSON.stringify(envelope), Date.now()).run();
      const registered = await database.prepare('SELECT * FROM dm_identities WHERE fingerprint = ?').bind(fingerprint).first<IdentityRow>();
      if (registered?.signing_public_key !== authPublicKey) return json({ success: false, error: 'This identity is already bound to a different signing key' }, 409);
      return json({ success: true, fingerprint });
    }

    const owner = await database.prepare('SELECT * FROM dm_identities WHERE fingerprint = ?').bind(fingerprint).first<IdentityRow>();
    if (!owner || (!isDeviceAuth && owner.signing_public_key !== authPublicKey)) return json({ success: false, error: 'Register the current messaging identity first' }, 403);
    if (isDeviceAuth && owner) {
      authIdentity = { fingerprint, signingPublicKey: owner.signing_public_key };
    }

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

    if (payload.action === 'register-device') {
      let deviceId = payload.deviceId;
      if (typeof deviceId !== 'string' || !/^[a-zA-Z0-9_-]{4,64}$/.test(deviceId)) {
        return json({ success: false, error: 'Invalid device ID' }, 400);
      }
      const label = typeof payload.deviceLabel === 'string' ? payload.deviceLabel.slice(0, 100) : 'Browser Device';
      let devicePublicKey = typeof payload.devicePublicKey === 'string' && /^[0-9a-fA-F]{64}$/.test(payload.devicePublicKey)
        ? payload.devicePublicKey.toLowerCase()
        : '';
      let certificateJson: string | null = null;

      // Validate Root-Signed Device Certificate if provided
      if (payload.certificate && payload.certificateSignature) {
        const cert = payload.certificate;
        const certSig = payload.certificateSignature;
        if (!verifyDeviceCertificate(cert, certSig, authPublicKey)) {
          return json({ success: false, error: 'Invalid root-signed device certificate' }, 400);
        }
        if (cert.identityFingerprint !== fingerprint) {
          return json({ success: false, error: 'Certificate identity fingerprint mismatch' }, 403);
        }
        deviceId = cert.deviceId;
        devicePublicKey = cert.devicePublicKey.toLowerCase();
        certificateJson = JSON.stringify(cert);
      }

      await database.prepare(`
        CREATE TABLE IF NOT EXISTS dm_devices (
          fingerprint TEXT NOT NULL,
          device_id TEXT NOT NULL,
          device_public_key TEXT NOT NULL DEFAULT '',
          device_label TEXT,
          registration_json TEXT NOT NULL,
          certificate_json TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'revoked')),
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (fingerprint, device_id)
        )
      `).run();
      try { await database.prepare(`ALTER TABLE dm_devices ADD COLUMN device_public_key TEXT NOT NULL DEFAULT ''`).run(); } catch (_) {}
      try { await database.prepare(`ALTER TABLE dm_devices ADD COLUMN certificate_json TEXT`).run(); } catch (_) {}

      // Check if device ID is already revoked
      const existingId = await database.prepare('SELECT status FROM dm_devices WHERE fingerprint = ? AND device_id = ?')
        .bind(fingerprint, deviceId).first<{ status: string }>();
      if (existingId?.status === 'revoked') {
        return json({ success: false, error: 'This device ID has been revoked and cannot be registered' }, 403);
      }

      // Check if device public key is already revoked under ANY device ID for this identity
      if (devicePublicKey) {
        const existingKey = await database.prepare(
          "SELECT device_id FROM dm_devices WHERE fingerprint = ? AND device_public_key = ? AND status = 'revoked'"
        ).bind(fingerprint, devicePublicKey).first<{ device_id: string }>();
        if (existingKey) {
          return json({ success: false, error: 'This device key has been revoked and cannot be re-registered under a new device ID' }, 403);
        }
      }

      // Rate limit: max 5 device registrations per minute per identity
      const recentRegs = await database.prepare(
        'SELECT count(*) as count FROM dm_devices WHERE fingerprint = ? AND created_at > ?'
      ).bind(fingerprint, Date.now() - 60000).first<{ count: number }>();
      if ((recentRegs?.count ?? 0) >= 5) {
        return json({ success: false, error: 'Device registration rate limit exceeded. Please wait a moment.' }, 429);
      }

      // Active device count limit: max 10 active devices per sovereign identity
      const activeCount = await database.prepare(
        "SELECT count(*) as count FROM dm_devices WHERE fingerprint = ? AND status = 'active' AND device_id != ?"
      ).bind(fingerprint, deviceId).first<{ count: number }>();
      if ((activeCount?.count ?? 0) >= 10) {
        return json({ success: false, error: 'Maximum active device limit (10) reached for this sovereign identity' }, 400);
      }

      await database.prepare(`
        INSERT INTO dm_devices (fingerprint, device_id, device_public_key, device_label, registration_json, certificate_json, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
        ON CONFLICT(fingerprint, device_id) DO UPDATE SET
          device_public_key = excluded.device_public_key,
          device_label = excluded.device_label,
          registration_json = excluded.registration_json,
          certificate_json = excluded.certificate_json,
          status = 'active',
          updated_at = excluded.updated_at
      `).bind(fingerprint, deviceId, devicePublicKey, label, JSON.stringify(envelope), certificateJson, Date.now(), Date.now()).run();
      return json({ success: true, deviceId, devicePublicKey, status: 'active' });
    }

    if (payload.action === 'revoke-device') {
      const deviceId = payload.deviceId;
      if (typeof deviceId !== 'string' || !/^[a-zA-Z0-9_-]{4,64}$/.test(deviceId)) {
        return json({ success: false, error: 'Invalid device ID' }, 400);
      }
      try {
        await database.prepare(`
          CREATE TABLE IF NOT EXISTS dm_devices (
            fingerprint TEXT NOT NULL,
            device_id TEXT NOT NULL,
            device_public_key TEXT NOT NULL DEFAULT '',
            device_label TEXT,
            registration_json TEXT NOT NULL,
            certificate_json TEXT,
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'revoked')),
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (fingerprint, device_id)
          )
        `).run();
        try { await database.prepare(`ALTER TABLE dm_devices ADD COLUMN device_public_key TEXT NOT NULL DEFAULT ''`).run(); } catch (_) {}
        try { await database.prepare(`ALTER TABLE dm_devices ADD COLUMN certificate_json TEXT`).run(); } catch (_) {}
        await database.prepare(`
          UPDATE dm_devices SET status = 'revoked', updated_at = ?
          WHERE fingerprint = ? AND (device_id = ? OR (device_public_key = ? AND device_public_key != ''))
        `).bind(Date.now(), fingerprint, deviceId, payload.devicePublicKey || '').run();
      } catch (_) {}
      return json({ success: true, deviceId, status: 'revoked' });
    }

    if (payload.action === 'list-devices') {
      const targetFP = typeof payload.fingerprint === 'string' && /^[0-9a-f]{16}$/i.test(payload.fingerprint)
        ? payload.fingerprint
        : fingerprint;
      try {
        await database.prepare(`
          CREATE TABLE IF NOT EXISTS dm_devices (
            fingerprint TEXT NOT NULL,
            device_id TEXT NOT NULL,
            device_public_key TEXT NOT NULL DEFAULT '',
            device_label TEXT,
            registration_json TEXT NOT NULL,
            certificate_json TEXT,
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'revoked')),
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (fingerprint, device_id)
          )
        `).run();
        try { await database.prepare(`ALTER TABLE dm_devices ADD COLUMN device_public_key TEXT NOT NULL DEFAULT ''`).run(); } catch (_) {}
        try { await database.prepare(`ALTER TABLE dm_devices ADD COLUMN certificate_json TEXT`).run(); } catch (_) {}
        const rows = await database.prepare(`
          SELECT device_id, device_public_key, device_label, status, created_at, updated_at
          FROM dm_devices WHERE fingerprint = ? ORDER BY created_at ASC
        `).bind(targetFP).all<{ device_id: string; device_public_key: string; device_label: string; status: string; created_at: number; updated_at: number }>();
        return json({
          success: true,
          devices: rows.results.map(r => ({
            deviceId: r.device_id,
            devicePublicKey: r.device_public_key,
            label: r.device_label,
            status: r.status,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          })),
        });
      } catch (_) {
        return json({ success: true, devices: [] });
      }
    }

    if (payload.action === 'send') {
      const freeze = await database.prepare('SELECT value FROM system_config WHERE key = ?').bind('emergencyFreeze').first<{ value: string }>();
      if (freeze?.value === 'true') return json({ success: false, error: 'Messaging is temporarily paused by administration' }, 503);
      const message = payload.message as DirectMessageFrame;
      if (!validateDirectMessageFrame(message) || message.sender !== fingerprint || (!isDeviceAuth && message.senderPublicKey !== authPublicKey) ||
          Object.keys(payload).some(key => key !== 'action' && key !== 'message' && key !== 'deviceId' && key !== 'devicePublicKey' && key !== 'storedEnvelope')) {
        return json({ success: false, error: 'A valid signed encrypted message is required' }, 400);
      }
      const messageSenderDeviceId = 'senderDeviceId' in message ? message.senderDeviceId : undefined;
      if (isDeviceAuth && messageSenderDeviceId && callerDeviceId && messageSenderDeviceId !== callerDeviceId) {
        return json({ success: false, error: 'Sender device ID mismatch' }, 403);
      }

      const senderDevId = messageSenderDeviceId || payload.deviceId || callerDeviceId;
      const senderDevKey = payload.devicePublicKey || callerDevicePublicKey;
      if (senderDevId || senderDevKey) {
        try {
          const senderDev = await database.prepare(
            "SELECT status, device_public_key FROM dm_devices WHERE fingerprint = ? AND (device_id = ? OR (device_public_key = ? AND device_public_key != ''))"
          ).bind(fingerprint, senderDevId || '', senderDevKey || '').first<{ status: string; device_public_key: string }>();
          if (senderDev?.status === 'revoked') {
            return json({ success: false, error: 'Sender device has been revoked and cannot send messages' }, 403);
          }
        } catch (_) {}
      }
      const recipient = await database.prepare('SELECT * FROM dm_identities WHERE fingerprint = ?').bind(message.recipient).first<IdentityRow>();
      if (!recipient || recipient.signing_public_key !== message.recipientPublicKey) return json({ success: false, error: 'Recipient key is unavailable or has changed' }, 409);

      // Check user_blocks table: Sender cannot message recipient if either party has blocked the other
      try {
        await database.prepare(`
          CREATE TABLE IF NOT EXISTS user_blocks (
            blocker_id TEXT NOT NULL,
            blocked_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            PRIMARY KEY (blocker_id, blocked_id)
          )
        `).run();
        const isBlocked = await database.prepare(
          'SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1'
        ).bind(message.recipient, fingerprint, fingerprint, message.recipient).first();
        if (isBlocked) {
          return json({ success: false, error: 'Cannot send direct message to this recipient' }, 403);
        }
      } catch (_) {}

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
      const storedJson = payload.storedEnvelope
        ? JSON.stringify(payload.storedEnvelope)
        : JSON.stringify({ ...(envelope.version === 2 ? { version: 2 } : {}), payload, signature: envelope.signature, nonce: envelope.nonce, timestamp: envelope.timestamp, identity: authIdentity || { fingerprint, signingPublicKey: authPublicKey } });
      const inserted = await database.prepare(`INSERT OR IGNORE INTO direct_messages (id, sender_fingerprint, recipient_fingerprint, envelope_json, created_at) VALUES (?, ?, ?, ?, ?)`)
        .bind(message.id, fingerprint, message.recipient, storedJson, Date.now()).run();
      const stored = await database.prepare('SELECT * FROM direct_messages WHERE id = ?').bind(message.id).first<MessageRow>();
      if (!stored || stored.sender_fingerprint !== fingerprint || stored.recipient_fingerprint !== message.recipient ||
          canonicalizeJson(JSON.parse(stored.envelope_json).payload.message) !== canonicalizeJson(message)) {
        return json({ success: false, error: 'Message ID conflict' }, 409);
      }
      return json({ success: true, id: stored.id, sequence: stored.sequence, createdAt: stored.created_at }, inserted.meta?.changes === 1 ? 201 : 200);
    }

    if (payload.action === 'read-receipt') {
      const callerDevId = payload.deviceId || payload.senderDeviceId || callerDeviceId;
      const callerDevKey = payload.devicePublicKey || callerDevicePublicKey;
      if (callerDevId || callerDevKey) {
        try {
          const devRow = await database.prepare(
            "SELECT status, device_public_key FROM dm_devices WHERE fingerprint = ? AND (device_id = ? OR (device_public_key = ? AND device_public_key != ''))"
          ).bind(fingerprint, callerDevId || '', callerDevKey || '').first<{ status: string; device_public_key: string }>();
          if (devRow?.status === 'revoked') {
            return json({ success: false, error: 'Device has been revoked and cannot send read receipts' }, 403);
          }
        } catch (_) {}
      }
      return json({ success: true, count: Array.isArray(payload.messageIds) ? payload.messageIds.length : 0 });
    }

    if (payload.action === 'list') {
      const callerDevId = payload.deviceId || payload.senderDeviceId || callerDeviceId;
      const callerDevKey = payload.devicePublicKey || callerDevicePublicKey;
      if (callerDevId || callerDevKey) {
        try {
          const devRow = await database.prepare(
            "SELECT status, device_public_key FROM dm_devices WHERE fingerprint = ? AND (device_id = ? OR (device_public_key = ? AND device_public_key != ''))"
          ).bind(fingerprint, callerDevId || '', callerDevKey || '').first<{ status: string; device_public_key: string }>();
          if (devRow?.status === 'revoked') {
            return json({ success: false, error: 'Device has been revoked and cannot poll messages' }, 403);
          }
        } catch (_) {}
      }
      const after = payload.after ?? 0;
      if (!Number.isSafeInteger(after) || after < 0) return json({ success: false, error: 'Invalid message cursor' }, 400);
      const rows = await database.prepare(`SELECT * FROM direct_messages WHERE sequence > ? AND (sender_fingerprint = ? OR recipient_fingerprint = ?) ORDER BY sequence ASC LIMIT 100`)
        .bind(after, fingerprint, fingerprint).all<MessageRow>();
      return json({ success: true, messages: rows.results.map(row => ({ sequence: row.sequence, createdAt: row.created_at, envelope: JSON.parse(row.envelope_json) })), nextCursor: rows.results.at(-1)?.sequence ?? after });
    }

    return json({ success: false, error: 'Unknown private messaging action' }, 400);
  } catch (err: any) {
    console.error('[direct-messages error]', err);
    return json({ success: false, error: err?.message || 'Private messaging storage could not complete the request' }, 503);
  }
}