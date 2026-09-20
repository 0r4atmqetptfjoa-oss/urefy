import { readAdminOverview } from './_admin-overview.js';
// ===========================================================================
// UREfy — SOVEREIGN ADMIN & GOVERNANCE EDGE API
// Route: /api/admin
// Features: PIN Authentication, User Role Management, WAF IP Ban Ledger,
//           Server Configuration, Audit Logging, and Zero-Trust Telemetry.
// Supports: Cloudflare D1, Cloudflare KV, and In-Memory Edge Store fallback.
// Returns HTTP status codes: 200, 201, 400, 401, 404, 429, 500 with JSON headers.
// ===========================================================================

import {
  Env,
  getD1Database,
  getKVStore,
  getR2Bucket,
  globalChannelsStore,
  globalPostsStore,
  globalMessagesStore,
  globalNodesTelemetryStore,
  EdgeChannel,
  EdgePost,
} from './_db.js';

export type SovereignAdminRole =
  | 'OWNER'
  | 'SECURITY_ADMIN'
  | 'MODERATOR'
  | 'STORAGE_ADMIN'
  | 'AUDITOR'
  | 'GUARDIAN'
  | 'ARCHIVIST'
  | 'MEMBER';

export interface AdminUser {
  fingerprint: string;
  role: SovereignAdminRole;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  isZKVerified: boolean;
  isQuarantined: boolean;
  isShadowbanned?: boolean;
  notes?: string;
  joinedAt: number;
  messagesCount: number;
  postsCount: number;
}

export interface AdminBannedIP {
  ip: string;
  reason: string;
  bannedAt: number;
  expiresAt: number;
}

export interface AdminServerConfig {
  maintenanceMode: boolean;
  emergencyFreeze?: boolean;
  maxConnectionsPerIP: number;
  powDifficulty: number;
  rateLimitPerMinute: number;
  broadcastMessage: string;
  allowNewRegistrations: boolean;
  requireZKVerification: boolean;
  sessionTimeoutMinutes: number;
}

export interface AdminLogEntry {
  id: string;
  action: string;
  targetId: string;
  adminFingerprint: string;
  timestamp: number;
}

// ─── INITIAL IN-MEMORY ADMIN DATA STORE ───────────────────────────────────────

export const DEFAULT_ADMIN_PIN = '11223';

export const globalAdminUsersStore: AdminUser[] = [];

export const globalBannedIPsStore: AdminBannedIP[] = [];

export const globalServerConfig: AdminServerConfig = {
  maintenanceMode: false,
  maxConnectionsPerIP: 20,
  powDifficulty: 3,
  rateLimitPerMinute: 120,
  broadcastMessage: '',
  allowNewRegistrations: true,
  requireZKVerification: true,
  sessionTimeoutMinutes: 30,
};

export const globalAdminLogsStore: AdminLogEntry[] = [];

// Failed auth attempt tracking for 429 rate-limiting (max 5 failed attempts per 10 minutes per IP)
const failedPinAttempts = new Map<string, { count: number; lastAttempt: number }>();
export const LOCKOUT_WINDOW_MS = 600000; // 10 minutes

export function isIpLockedOut(clientIp: string, now = Date.now()): { locked: boolean; retryAfter?: number } {
  const record = failedPinAttempts.get(clientIp);
  if (record && record.count >= 5 && now - record.lastAttempt < LOCKOUT_WINDOW_MS) {
    const retryAfter = Math.ceil((LOCKOUT_WINDOW_MS - (now - record.lastAttempt)) / 1000);
    return { locked: true, retryAfter };
  }
  return { locked: false };
}

export function recordFailedPinAttempt(clientIp: string, now = Date.now()): number {
  const record = failedPinAttempts.get(clientIp);
  let count = 1;
  if (record && now - record.lastAttempt < LOCKOUT_WINDOW_MS) {
    count = record.count + 1;
  }
  failedPinAttempts.set(clientIp, { count, lastAttempt: now });
  return count;
}

export function clearFailedPinAttempts(clientIp: string): void {
  failedPinAttempts.delete(clientIp);
}

export function resetAdminStores(): void {
  globalAdminUsersStore.length = 0;
  globalBannedIPsStore.length = 0;
  globalAdminLogsStore.length = 0;
  failedPinAttempts.clear();
}

// ─── CRYPTOGRAPHIC CONSTANT-TIME & HMAC HELPERS ──────────────────────────────

export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function computeHmacSha256(keyString: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(keyString);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    enc.encode(message)
  );
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Creates a cryptographically secure HMAC-SHA256 session token.
 * Token format: aeth_adm_${timestamp}_${hex_nonce}_${hmac_signature}
 * where signature = HMAC-SHA256(pin, `${timestamp}:${hex_nonce}`).
 */
export async function createAdminSessionToken(pin: string, ttlMs = 1800000): Promise<string> {
  const timestamp = Date.now();
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const hexNonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const message = `${timestamp}:${hexNonce}`;
  const signature = await computeHmacSha256(pin, message);
  return `aeth_adm_${timestamp}_${hexNonce}_${signature}`;
}

/**
 * Verifies an HMAC-SHA256 session token against the configured admin PIN.
 * Rejects expired tokens (sliding TTL check: Date.now() - timestamp > ttlMs).
 */
export async function verifyAdminSessionToken(
  token: string,
  pin: string,
  ttlMs = 1800000
): Promise<boolean> {
  if (!token || typeof token !== 'string' || !pin || typeof pin !== 'string') {
    return false;
  }
  if (!token.startsWith('aeth_adm_')) {
    return false;
  }
  const parts = token.split('_');
  // Expected parts: ['aeth', 'adm', timestamp, hex_nonce, signature]
  if (parts.length !== 5 || parts[0] !== 'aeth' || parts[1] !== 'adm') {
    return false;
  }

  const timestamp = parseInt(parts[2], 10);
  if (isNaN(timestamp) || timestamp <= 0) {
    return false;
  }

  const now = Date.now();
  if (now - timestamp >= ttlMs || now < timestamp - 60000) {
    return false;
  }

  const hexNonce = parts[3];
  if (!hexNonce || hexNonce.length !== 32 || !/^[0-9a-fA-F]+$/.test(hexNonce)) {
    return false;
  }

  const signature = parts[4];
  if (!signature || signature.length !== 64 || !/^[0-9a-fA-F]+$/.test(signature)) {
    return false;
  }

  const message = `${timestamp}:${hexNonce}`;
  const expectedSig = await computeHmacSha256(pin, message);
  return timingSafeEqual(expectedSig, signature);
}

export const DESTRUCTIVE_ADMIN_ACTIONS = new Set([
  'ban-ip',
  'unban-ip',
  'backup-trigger',
  'server-config-update',
  'clear-audit-logs',
  'broadcast-message',
  'emergency-freeze',
  'purge-cache',
]);

/**
 * Records an immutable entry into the cryptographic WORM audit ledger in Cloudflare D1.
 * Uses SHA-256 Merkle chaining: previous_entry_hash -> current_entry_hash.
 */
export async function recordImmutableAuditEntry(
  db: any,
  entry: {
    adminCredentialId: string;
    action: string;
    targetResource: string;
    clientIp: string;
    clientCountry?: string;
    payload?: any;
  }
): Promise<{ id: string; currentEntryHash: string }> {
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  const payloadStr = entry.payload ? JSON.stringify(entry.payload) : '';
  const payloadDigestBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payloadStr));
  const payloadDigest = Array.from(new Uint8Array(payloadDigestBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
  if (db) {
    try {
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS admin_immutable_audit_ledger (
            id TEXT PRIMARY KEY,
            previous_entry_hash TEXT NOT NULL,
            current_entry_hash TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            admin_credential_id TEXT NOT NULL,
            action TEXT NOT NULL,
            target_resource TEXT NOT NULL,
            client_ip TEXT NOT NULL,
            client_country TEXT NOT NULL,
            payload_digest TEXT NOT NULL
          )`
        )
        .run();

      const lastRow = await db
        .prepare('SELECT current_entry_hash FROM admin_immutable_audit_ledger ORDER BY timestamp DESC LIMIT 1')
        .first();
      if (lastRow && (lastRow as any).current_entry_hash) {
        previousHash = (lastRow as any).current_entry_hash;
      }
    } catch (_) {}
  }

  const messageToHash = `${previousHash}:${timestamp}:${entry.adminCredentialId}:${entry.action}:${entry.targetResource}:${payloadDigest}`;
  const currentHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(messageToHash));
  const currentEntryHash = Array.from(new Uint8Array(currentHashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (db) {
    try {
      await db
        .prepare(
          `INSERT INTO admin_immutable_audit_ledger
          (id, previous_entry_hash, current_entry_hash, timestamp, admin_credential_id, action, target_resource, client_ip, client_country, payload_digest)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          previousHash,
          currentEntryHash,
          timestamp,
          entry.adminCredentialId,
          entry.action,
          entry.targetResource,
          entry.clientIp,
          entry.clientCountry || 'XX',
          payloadDigest
        )
        .run();
    } catch (_) {}
  }

  // Also maintain in-memory fallback
  globalAdminLogsStore.unshift({
    id,
    action: entry.action,
    targetId: entry.targetResource,
    adminFingerprint: entry.adminCredentialId,
    timestamp,
  });
  if (globalAdminLogsStore.length > 500) globalAdminLogsStore.pop();

  return { id, currentEntryHash };
}


export function isNonLocalEnvironment(req: Request, env?: Env): boolean {
  if (env?.ENVIRONMENT === 'production' || env?.NODE_ENV === 'production') {
    return true;
  }
  if (env?.ENVIRONMENT === 'development' || env?.ENVIRONMENT === 'test' || env?.ENVIRONMENT === 'local') {
    return false;
  }
  try {
    const url = new URL(req.url);
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
      return false;
    }
    if (host.endsWith('.local')) {
      return false;
    }
    if (host.endsWith('.pages.dev') || host.endsWith('.network') || host.endsWith('.internal') || host === 'urefy.com' || host === 'www.urefy.com') {
      return env?.ENVIRONMENT === 'production';
    }
    return true;
  } catch {
    return false;
  }
}

// ─── AUTHENTICATION HELPER ───────────────────────────────────────────────────

export async function verifyAdminAuthorization(
  req: Request,
  env?: Env
): Promise<{ authorized: boolean; reason?: string; status?: number }> {
  const isNonLocal = isNonLocalEnvironment(req, env);
  const hasEnvPin = typeof env?.ADMIN_PIN === 'string' && env.ADMIN_PIN.trim().length > 0;

  if (isNonLocal && !hasEnvPin) {
    return {
      authorized: false,
      reason: 'ADMIN_PIN not configured in environment variables.',
      status: 503,
    };
  }

  const url = new URL(req.url);

  // Finding 12: Permanently remove credentials from URL query parameters
  // Never accept credentials in query parameters — strictly fail with 401
  if (url.searchParams.has('pin') || url.searchParams.has('token')) {
    return {
      authorized: false,
      reason: 'Admin credentials in URL query parameters are strictly forbidden. Use Authorization or X-Admin-PIN header.',
      status: 401,
    };
  }

  const configuredPin = hasEnvPin ? env!.ADMIN_PIN : DEFAULT_ADMIN_PIN;
  const authHeader = req.headers.get('Authorization') || '';
  const adminPinHeader = req.headers.get('X-Admin-PIN') || '';

  const rawBearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  // Check Bearer token (valid HMAC session token or matching configured PIN)
  if (rawBearer) {
    if (rawBearer.startsWith('aeth_adm_')) {
      const isValid = await verifyAdminSessionToken(rawBearer, configuredPin);
      if (isValid) return { authorized: true };
    } else if (rawBearer === configuredPin) {
      return { authorized: true };
    }
  }

  // Check direct PIN in X-Admin-PIN header only
  if (adminPinHeader && adminPinHeader === configuredPin) {
    return { authorized: true };
  }

  return { authorized: false, reason: 'Invalid or missing admin credentials', status: 401 };
}

// ─── OPTIONS PREFLIGHT ───────────────────────────────────────────────────────

const CANONICAL_ADMIN_HOSTS = new Set([
  'urefy.com',
  'www.urefy.com',
  'aetheris-omni-sphere.pages.dev',
  'aetheris.pages.dev',
  'aetheris.network',
  'aetheris.io',
]);

const LOOPBACK_ADMIN_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isPermittedAdminOrigin(origin: string, requestUrl: URL, env?: Env): boolean {
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const h = originUrl.hostname.toLowerCase();

    // Configured origins
    const configured = env?.ADMIN_ALLOWED_ORIGINS || (env as any)?.CORS_ALLOWED_ORIGINS || (env as any)?.WEBAUTHN_ALLOWED_ORIGINS;
    if (configured && typeof configured === 'string') {
      const list = configured.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      if (list.includes(origin.toLowerCase()) || list.includes(originUrl.origin.toLowerCase()) || list.includes(h)) {
        return true;
      }
    }

    // Exact production host set membership only
    if (CANONICAL_ADMIN_HOSTS.has(h)) {
      return true;
    }

    // Loopback development hosts only in non-production
    const isNonLocal = isNonLocalEnvironment(new Request(requestUrl.toString()), env);
    if (!isNonLocal && LOOPBACK_ADMIN_HOSTS.has(h)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function onRequestOptions(context?: { request?: Request }): Promise<Response> {
  const req = context?.request;
  const origin = req?.headers.get('Origin');
  let allowOrigin: string | null = null;

  if (origin && req) {
    try {
      const url = new URL(req.url);
      if (isPermittedAdminOrigin(origin, url)) {
        allowOrigin = origin;
      }
    } catch (_) {}
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-PIN, X-Admin-Fingerprint',
    'Access-Control-Max-Age': '86400',
  };

  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  } else if (!req) {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return new Response(null, {
    status: 204,
    headers,
  });
}

// ─── GET /api/admin ──────────────────────────────────────────────────────────

export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const req = context.request;
    const url = new URL(req.url);

    // Finding 12: Permanently remove credentials from URL query parameters
    if (url.searchParams.has('pin') || url.searchParams.has('token')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Admin credentials in URL query parameters are strictly forbidden. Use Authorization or X-Admin-PIN header.',
          code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // ── Unauthenticated Public Health & Broadcast Status ──────────────────────
    if (url.searchParams.get('public') === 'true' || url.searchParams.get('action') === 'public_status') {
      let broadcastMsg = globalServerConfig.broadcastMessage;
      const db = getD1Database(context.env);
      if (db) {
        try {
          await db.prepare('CREATE TABLE IF NOT EXISTS system_config (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)').run();
          const row: any = await db.prepare('SELECT value FROM system_config WHERE key = ?').bind('broadcastMessage').first();
          if (row && typeof row.value === 'string') {
            broadcastMsg = row.value;
            globalServerConfig.broadcastMessage = row.value;
          }
        } catch (_) {}
      }

      return new Response(
        JSON.stringify({
          success: true,
          maintenanceMode: globalServerConfig.maintenanceMode,
          broadcastMessage: broadcastMsg,
          requireZKVerification: globalServerConfig.requireZKVerification,
          allowNewRegistrations: globalServerConfig.allowNewRegistrations,
          timestamp: Date.now(),
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=1, stale-while-revalidate=4',
          },
        }
      );
    }

    const clientIp =
      req.headers.get('CF-Connecting-IP') ||
      req.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
      '127.0.0.1';

    const lockout = isIpLockedOut(clientIp);
    if (lockout.locked) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many failed login attempts. Locked out for 10 minutes.',
          retryAfterSeconds: lockout.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(lockout.retryAfter),
          },
        }
      );
    }

    const auth = await verifyAdminAuthorization(req, context.env);

    if (!auth.authorized) {
      if (auth.status === 503) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'ADMIN_PIN not configured in environment variables.',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: auth.reason ? `Unauthorized: ${auth.reason}` : 'Unauthorized: Admin authentication required',
          code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="UREfy Sovereign Admin"',
          },
        }
      );
    }

    const tab = url.searchParams.get('tab') || 'all';

    const db = getD1Database(context.env);

    let livePosts: any[] = [];
    let liveMessagesCount: number = globalMessagesStore.length;
    let liveUserRoles: any[] = [];
    let liveChannels: any[] = [];
    let isFrozen = false;

    if (db) {
      try {
        const result = await db.prepare('SELECT c.*, (SELECT COUNT(*) FROM messages m WHERE m.channel_id = c.id) AS message_count FROM channels c ORDER BY created_at ASC').all<any>();
        liveChannels = result.results.map(c => ({ id: c.id, name: c.name, space: c.space,
          description: c.description, isEncrypted: Boolean(c.is_encrypted), isArchived: false,
          membersCount: null, messagesCount: c.message_count, createdAt: c.created_at }));
      } catch { /* Leave unavailable channel details empty; overview count reports its own status. */ }
      try {
        await db
          .prepare(
            `CREATE TABLE IF NOT EXISTS user_roles (
              fingerprint TEXT PRIMARY KEY,
              role TEXT NOT NULL,
              is_quarantined INTEGER DEFAULT 0,
              is_shadowbanned INTEGER DEFAULT 0,
              notes TEXT,
              updated_at INTEGER
            )`
          )
          .run();
      } catch (_) {}

      try {
        await db
          .prepare(
            'CREATE TABLE IF NOT EXISTS system_config (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)'
          )
          .run();
        const freezeRow: any = await db
          .prepare('SELECT value FROM system_config WHERE key = ?')
          .bind('emergencyFreeze')
          .first();
        if (freezeRow && freezeRow.value === 'true') {
          isFrozen = true;
          globalServerConfig.emergencyFreeze = true;
        } else {
          globalServerConfig.emergencyFreeze = false;
        }
      } catch (_) {}

      try {
        const uRoles = await db
          .prepare('SELECT * FROM user_roles ORDER BY updated_at DESC')
          .all<any>();
        if (uRoles && uRoles.results) {
          liveUserRoles = uRoles.results;
        }
      } catch (_) {}

      if (tab === 'all' || tab === 'moderation' || tab === 'posts') {
        try {
          const pRes = await db
            .prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT 100')
            .all<any>();
          if (pRes && pRes.results) {
            livePosts = pRes.results;
          }
        } catch (_) {}
        try {
          const mCountRes: any = await db
            .prepare('SELECT COUNT(*) as cnt FROM messages')
            .first();
          if (mCountRes && typeof mCountRes.cnt === 'number') {
            liveMessagesCount = mCountRes.cnt;
          }
        } catch (_) {}
      }
    }

    // Merge D1 persistent user_roles into active users store
    const mergedUsers: AdminUser[] = [...globalAdminUsersStore];
    for (const r of liveUserRoles) {
      const existing = mergedUsers.find((u) => u.fingerprint === r.fingerprint);
      if (existing) {
        existing.role = r.role;
        existing.isQuarantined = Boolean(r.is_quarantined);
        existing.isShadowbanned = Boolean(r.is_shadowbanned);
        existing.notes = r.notes;
      } else {
        mergedUsers.unshift({
          fingerprint: r.fingerprint,
          role: r.role,
          status: 'offline',
          isZKVerified: false,
          isQuarantined: Boolean(r.is_quarantined),
          isShadowbanned: Boolean(r.is_shadowbanned),
          notes: r.notes,
          joinedAt: r.updated_at || Date.now(),
          messagesCount: 0,
          postsCount: 0,
        });
      }
    }

    let immutableAuditLedger: any[] = [];
    if (db && (tab === 'all' || tab === 'logs' || tab === 'audit' || tab === 'moderation')) {
      try {
        const auditRows = await db
          .prepare('SELECT * FROM admin_immutable_audit_ledger ORDER BY timestamp DESC LIMIT 100')
          .all<any>();
        if (auditRows && auditRows.results) {
          immutableAuditLedger = auditRows.results;
        }
      } catch (_) {}
    }

    const overview = await readAdminOverview(db);

    // Build comprehensive administrative dashboard payload
    const payload = {
      success: true,
      timestamp: Date.now(),
      emergencyFreeze: isFrozen,
      stats: {
        totalUsers: mergedUsers.length,
        onlineUsers: null,
        quarantinedUsers: mergedUsers.filter((u) => u.isQuarantined).length,
        shadowbannedUsers: mergedUsers.filter((u) => u.isShadowbanned).length,
        totalChannels: overview.counts.channels,
        totalPosts: overview.counts.posts,
        totalMessages: overview.counts.messages,
        totalNodes: null,
        bannedIPsCount: globalBannedIPsStore.length,
      },
      overview,
      telemetry: {
        totalUsers: overview.counts.identities, onlineUsers: null,
        pageViews24h: null, egressGB24h: null, attacksBlocked: null,
        avgEdgeRttMs: null, liveThroughputReqSec: null,
      },
      users: tab === 'all' || tab === 'users' ? mergedUsers : undefined,
      userRoles: tab === 'all' || tab === 'users' ? liveUserRoles : undefined,
      channels: tab === 'all' || tab === 'channels' ? liveChannels : undefined,
      posts: tab === 'all' || tab === 'moderation' || tab === 'posts' ? livePosts : undefined,
      bannedIPs: tab === 'all' || tab === 'waf' ? globalBannedIPsStore : undefined,
      config: tab === 'all' || tab === 'config' ? globalServerConfig : undefined,
      logs: tab === 'all' || tab === 'logs' || tab === 'moderation' ? globalAdminLogsStore : undefined,
      auditLedger: tab === 'all' || tab === 'logs' || tab === 'audit' ? (immutableAuditLedger.length > 0 ? immutableAuditLedger : globalAdminLogsStore) : undefined,
      storage: db ? 'Cloudflare-D1' : 'Edge-Isolate-Memory',
    };

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Internal Server Error in Admin API',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ─── POST /api/admin ─────────────────────────────────────────────────────────

export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const req = context.request;
    const url = new URL(req.url);

    // Finding 12: Permanently remove credentials from URL query parameters
    if (url.searchParams.has('pin') || url.searchParams.has('token')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Admin credentials in URL query parameters are strictly forbidden. Use Authorization or X-Admin-PIN header.',
          code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const clientIp =
      req.headers.get('CF-Connecting-IP') ||
      req.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
      '127.0.0.1';

    const lockout = isIpLockedOut(clientIp);
    if (lockout.locked) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many failed login attempts. Locked out for 10 minutes.',
          retryAfterSeconds: lockout.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(lockout.retryAfter),
          },
        }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body || typeof body !== 'object' || !body.action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing mandatory action field in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isNonLocal = isNonLocalEnvironment(req, context.env);
    const hasEnvPin = typeof context.env?.ADMIN_PIN === 'string' && context.env.ADMIN_PIN.trim().length > 0;
    if (isNonLocal && !hasEnvPin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ADMIN_PIN not configured in environment variables.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const configuredPin = hasEnvPin ? context.env!.ADMIN_PIN : DEFAULT_ADMIN_PIN;

    // ── 1. ACTION: VERIFY PIN ─────────────────────────────────────────────────
    if (body.action === 'verify-pin') {
      const pin = body.pin;
      if (!pin || typeof pin !== 'string') {
        return new Response(
          JSON.stringify({ success: false, error: 'PIN parameter must be a non-empty string' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (pin === configuredPin) {
        clearFailedPinAttempts(clientIp);
        const sessionToken = await createAdminSessionToken(configuredPin);
        return new Response(
          JSON.stringify({
            success: true,
            authorized: true,
            message: 'PIN verified successfully. Sovereign admin session active.',
            token: sessionToken,
            expiresIn: 1800,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } else {
        const currentFails = recordFailedPinAttempt(clientIp);
        return new Response(
          JSON.stringify({
            success: false,
            authorized: false,
            error: 'Access denied: Invalid admin PIN',
            attemptsRemaining: Math.max(0, 5 - currentFails),
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (typeof body.action === 'string' && body.action.startsWith('passkey-')) {
      const { handleAdminPasskey } = await import('./_admin-passkeys.js');
      const response = await handleAdminPasskey(req, context.env, body,
        async () => (await verifyAdminAuthorization(req, context.env)).authorized,
        async () => createAdminSessionToken(configuredPin));
      if (body.action === 'passkey-verify') {
        if (response.ok) clearFailedPinAttempts(clientIp);
        else if (response.status === 401) recordFailedPinAttempt(clientIp);
      }
      return response;
    }
    // ── For all other actions, verify authorization ───────────────────────────
    const auth = await verifyAdminAuthorization(req, context.env);
    if (!auth.authorized) {
      if (auth.status === 503) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'ADMIN_PIN not configured in environment variables.',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: auth.reason ? `Unauthorized: ${auth.reason}` : 'Unauthorized: Valid admin authentication required for administrative actions',
          code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const adminFp = req.headers.get('X-Admin-Fingerprint') || 'sovereign-root-guardian';

    // ── 2. ACTION: ASSIGN ROLE & PROMOTE USER (PERSISTENT D1) ─────────────────
    if (body.action === 'assign-role' || body.action === 'promote-user') {
      const { fingerprint, role, newRole, notes } = body;
      const targetRole = role || newRole;
      if (!fingerprint) {
        return new Response(
          JSON.stringify({ success: false, error: 'User fingerprint is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const ladder: SovereignAdminRole[] = ['MEMBER', 'MODERATOR', 'ARCHIVIST', 'GUARDIAN', 'OWNER'];
      const VALID_ROLES: SovereignAdminRole[] = [
        'OWNER',
        'SECURITY_ADMIN',
        'MODERATOR',
        'STORAGE_ADMIN',
        'AUDITOR',
        'GUARDIAN',
        'ARCHIVIST',
        'MEMBER',
      ];
      let chosenRole: SovereignAdminRole = 'MODERATOR';

      const user = globalAdminUsersStore.find((u) => u.fingerprint === fingerprint);
      if (body.action === 'promote-user' && !user) {
        return new Response(
          JSON.stringify({ success: false, error: `User with fingerprint ${fingerprint} not found` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (targetRole && VALID_ROLES.includes(targetRole as SovereignAdminRole)) {
        chosenRole = targetRole as SovereignAdminRole;
      } else if (user) {
        const currentIdx = ladder.indexOf(user.role as SovereignAdminRole);
        if (currentIdx !== -1 && currentIdx < ladder.length - 1) {
          chosenRole = ladder[currentIdx + 1];
        } else {
          chosenRole = user.role;
        }
      }

      const db = getD1Database(context.env);
      if (db) {
        try {
          await db
            .prepare(
              `CREATE TABLE IF NOT EXISTS user_roles (
                fingerprint TEXT PRIMARY KEY,
                role TEXT NOT NULL,
                is_quarantined INTEGER DEFAULT 0,
                is_shadowbanned INTEGER DEFAULT 0,
                notes TEXT,
                updated_at INTEGER
              )`
            )
            .run();

          await db
            .prepare(
              `INSERT INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at)
               VALUES (?, ?, 0, 0, ?, ?)
               ON CONFLICT(fingerprint) DO UPDATE SET
                 role = excluded.role,
                 notes = COALESCE(excluded.notes, user_roles.notes),
                 updated_at = excluded.updated_at`
            )
            .bind(fingerprint, chosenRole, notes || 'Role updated by sovereign admin', Date.now())
            .run();
        } catch (_) {}
      }

      if (user) {
        user.role = chosenRole;
      } else {
        globalAdminUsersStore.unshift({
          fingerprint,
          role: chosenRole,
          status: 'offline',
          isZKVerified: true,
          isQuarantined: false,
          isShadowbanned: false,
          notes: notes || 'Assigned by admin',
          joinedAt: Date.now(),
          messagesCount: 0,
          postsCount: 0,
        });
      }

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: 'ROLE_ASSIGNED',
        targetId: `${fingerprint}:${chosenRole}`,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `User ${fingerprint} role updated to ${chosenRole} in D1 database`,
          fingerprint,
          role: chosenRole,
          user: user || globalAdminUsersStore[0],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. ACTION: TOGGLE QUARANTINE (PERSISTENT D1) ─────────────────────────
    if (body.action === 'toggle-quarantine') {
      const { fingerprint } = body;
      if (!fingerprint) {
        return new Response(
          JSON.stringify({ success: false, error: 'User fingerprint is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      let user = globalAdminUsersStore.find((u) => u.fingerprint === fingerprint);
      const isQuar = body.quarantined !== undefined ? Boolean(body.quarantined) : user ? !user.isQuarantined : true;

      const db = getD1Database(context.env);
      if (db) {
        try {
          await db
            .prepare(
              `CREATE TABLE IF NOT EXISTS user_roles (
                fingerprint TEXT PRIMARY KEY,
                role TEXT NOT NULL,
                is_quarantined INTEGER DEFAULT 0,
                is_shadowbanned INTEGER DEFAULT 0,
                notes TEXT,
                updated_at INTEGER
              )`
            )
            .run();

          await db
            .prepare(
              `INSERT INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at)
               VALUES (?, 'MEMBER', ?, 0, 'Quarantine updated by admin', ?)
               ON CONFLICT(fingerprint) DO UPDATE SET
                 is_quarantined = excluded.is_quarantined,
                 updated_at = excluded.updated_at`
            )
            .bind(fingerprint, isQuar ? 1 : 0, Date.now())
            .run();
        } catch (_) {}
      }

      if (user) {
        user.isQuarantined = isQuar;
      } else {
        user = {
          fingerprint,
          role: 'MEMBER',
          status: 'offline',
          isZKVerified: false,
          isQuarantined: isQuar,
          isShadowbanned: false,
          joinedAt: Date.now(),
          messagesCount: 0,
          postsCount: 0,
        };
        globalAdminUsersStore.unshift(user);
      }

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: isQuar ? 'USER_QUARANTINED' : 'USER_UNQUARANTINED',
        targetId: fingerprint,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `User ${fingerprint} quarantine status set to ${isQuar} in D1 database`,
          fingerprint,
          isQuarantined: isQuar,
          user,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 3B. ACTION: TOGGLE SHADOWBAN (PERSISTENT D1) ─────────────────────────
    if (body.action === 'toggle-shadowban') {
      const { fingerprint, shadowbanned } = body;
      if (!fingerprint) {
        return new Response(
          JSON.stringify({ success: false, error: 'User fingerprint is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      let user = globalAdminUsersStore.find((u) => u.fingerprint === fingerprint);
      const isShadow = shadowbanned !== undefined ? Boolean(shadowbanned) : user ? !user.isShadowbanned : true;

      const db = getD1Database(context.env);
      if (db) {
        try {
          await db
            .prepare(
              `CREATE TABLE IF NOT EXISTS user_roles (
                fingerprint TEXT PRIMARY KEY,
                role TEXT NOT NULL,
                is_quarantined INTEGER DEFAULT 0,
                is_shadowbanned INTEGER DEFAULT 0,
                notes TEXT,
                updated_at INTEGER
              )`
            )
            .run();

          await db
            .prepare(
              `INSERT INTO user_roles (fingerprint, role, is_quarantined, is_shadowbanned, notes, updated_at)
               VALUES (?, 'MEMBER', 0, ?, 'Shadowban updated by admin', ?)
               ON CONFLICT(fingerprint) DO UPDATE SET
                 is_shadowbanned = excluded.is_shadowbanned,
                 updated_at = excluded.updated_at`
            )
            .bind(fingerprint, isShadow ? 1 : 0, Date.now())
            .run();
        } catch (_) {}
      }

      if (user) {
        user.isShadowbanned = isShadow;
      } else {
        user = {
          fingerprint,
          role: 'MEMBER',
          status: 'offline',
          isZKVerified: true,
          isQuarantined: false,
          isShadowbanned: isShadow,
          joinedAt: Date.now(),
          messagesCount: 0,
          postsCount: 0,
        };
        globalAdminUsersStore.unshift(user);
      }

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: isShadow ? 'USER_SHADOWBANNED' : 'USER_UNSHADOWBANNED',
        targetId: fingerprint,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `User ${fingerprint} shadowban status set to ${isShadow} in D1 database`,
          fingerprint,
          isShadowbanned: isShadow,
          user,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. ACTION: BAN IP ─────────────────────────────────────────────────────
    if (body.action === 'ban-ip') {
      const { ip, reason = 'Administrative WAF Block', durationHours = 24 } = body;
      if (!ip || typeof ip !== 'string') {
        return new Response(
          JSON.stringify({ success: false, error: 'Valid IP address string is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const bannedEntry: AdminBannedIP = {
        ip: ip.trim(),
        reason: reason.trim(),
        bannedAt: Date.now(),
        expiresAt: Date.now() + durationHours * 3600 * 1000,
      };

      const existingIdx = globalBannedIPsStore.findIndex((b) => b.ip === bannedEntry.ip);
      if (existingIdx >= 0) {
        globalBannedIPsStore[existingIdx] = bannedEntry;
      } else {
        globalBannedIPsStore.unshift(bannedEntry);
      }

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: 'IP_BANNED',
        targetId: bannedEntry.ip,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `IP ${bannedEntry.ip} banned successfully`,
          bannedIP: bannedEntry,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // ── 5. ACTION: UNBAN IP ───────────────────────────────────────────────────
    if (body.action === 'unban-ip') {
      const { ip } = body;
      if (!ip) {
        return new Response(
          JSON.stringify({ success: false, error: 'IP address is required for unban' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const idx = globalBannedIPsStore.findIndex((b) => b.ip === ip.trim());
      if (idx < 0) {
        return new Response(
          JSON.stringify({ success: false, error: `IP ${ip} was not found in banned ledger` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      globalBannedIPsStore.splice(idx, 1);

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: 'IP_UNBANNED',
        targetId: ip,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `IP ${ip} unbanned successfully`,
          ip: ip.trim(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 6. ACTION: UPDATE SERVER CONFIG ───────────────────────────────────────
    if (body.action === 'update-config') {
      const { config } = body;
      if (!config || typeof config !== 'object') {
        return new Response(
          JSON.stringify({ success: false, error: 'Config object is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      Object.assign(globalServerConfig, config);

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: 'CONFIG_UPDATED',
        targetId: 'server-config',
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Server runtime configuration updated successfully',
          config: globalServerConfig,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 7. ACTION: PURGE LOGS ─────────────────────────────────────────────────
    if (body.action === 'purge-logs') {
      const count = globalAdminLogsStore.length;
      globalAdminLogsStore.length = 0;

      return new Response(
        JSON.stringify({
          success: true,
          message: `Purged ${count} admin audit log entries`,
          purgedCount: count,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 8. ACTION: MODERATION DELETE POST ─────────────────────────────────────
    if (body.action === 'delete-post') {
      const { postId } = body;
      if (!postId) {
        return new Response(
          JSON.stringify({ success: false, error: 'postId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const db = getD1Database(context.env);
      let d1Deleted = false;
      if (db) {
        try {
          const res = await db.prepare('DELETE FROM posts WHERE id = ?').bind(postId).run();
          d1Deleted = Boolean(res && res.success);
          const kv = getKVStore(context.env);
          if (kv) {
            try {
              await kv.delete('posts:all:all:hot:50:0');
              await kv.delete(`post:${postId}`);
            } catch (_) {}
          }
        } catch (_) {}
      }

      const idx = globalPostsStore.findIndex((p) => p.id === postId);
      if (idx >= 0) {
        globalPostsStore.splice(idx, 1);
      } else if (!db || !d1Deleted) {
        // Only return 404 if not found in D1 or memory
        if (!db) {
          return new Response(
            JSON.stringify({ success: false, error: `Post ${postId} not found` }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: 'POST_DELETED',
        targetId: postId,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({ success: true, message: `Post ${postId} deleted by moderator`, postId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 8B. ACTION: MODERATION EDIT / UPDATE POST ─────────────────────────────
    if (body.action === 'edit-post' || body.action === 'update-post') {
      const { postId, title, content, flair, status } = body;
      if (!postId) {
        return new Response(
          JSON.stringify({ success: false, error: 'postId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const db = getD1Database(context.env);
      if (db) {
        try {
          const existing: any = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first();
          if (existing) {
            const newTitle = typeof title === 'string' && title.trim() ? title.trim() : existing.title;
            const newContent = typeof content === 'string' ? content.trim() : existing.content;
            const newFlair = typeof flair === 'string' && flair.trim() ? flair.trim() : existing.flair;
            const newStatus = typeof status === 'string' && status.trim() ? status.trim() : existing.status;

            await db
              .prepare('UPDATE posts SET title = ?, content = ?, flair = ?, status = ? WHERE id = ?')
              .bind(newTitle, newContent, newFlair, newStatus, postId)
              .run();

            const kv = getKVStore(context.env);
            if (kv) {
              try {
                await kv.delete('posts:all:all:hot:50:0');
                await kv.delete(`post:${postId}`);
              } catch (_) {}
            }
          }
        } catch (_) {}
      }

      const memPost = globalPostsStore.find((p) => p.id === postId);
      if (memPost) {
        if (typeof title === 'string' && title.trim()) memPost.title = title.trim();
        if (typeof content === 'string') memPost.content = content.trim();
        if (typeof flair === 'string' && flair.trim()) (memPost as any).flair = flair.trim();
        if (typeof status === 'string' && status.trim()) (memPost as any).status = status.trim();
      }

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: 'POST_UPDATED',
        targetId: postId,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Post ${postId} modified live in database`,
          postId,
          updates: { title, content, flair, status },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 8C. ACTION: MODERATION PIN POST ───────────────────────────────────────
    if (body.action === 'pin-post') {
      const { postId, pinned } = body;
      if (!postId) {
        return new Response(
          JSON.stringify({ success: false, error: 'postId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const targetStatus = pinned === false ? 'published' : 'pinned';
      const db = getD1Database(context.env);
      if (db) {
        try {
          await db.prepare('UPDATE posts SET status = ? WHERE id = ?').bind(targetStatus, postId).run();
          const kv = getKVStore(context.env);
          if (kv) {
            try {
              await kv.delete('posts:all:all:hot:50:0');
              await kv.delete(`post:${postId}`);
            } catch (_) {}
          }
        } catch (_) {}
      }

      const memPost = globalPostsStore.find((p) => p.id === postId);
      if (memPost) {
        (memPost as any).status = targetStatus;
      }

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: targetStatus === 'pinned' ? 'POST_PINNED' : 'POST_UNPINNED',
        targetId: postId,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Post ${postId} status set to ${targetStatus}`,
          postId,
          status: targetStatus,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 8D. ACTION: MODERATION LOCK THREAD ───────────────────────────────────
    if (body.action === 'lock-thread') {
      const { postId, locked } = body;
      if (!postId) {
        return new Response(
          JSON.stringify({ success: false, error: 'postId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const targetStatus = locked === false ? 'published' : 'locked';
      const db = getD1Database(context.env);
      if (db) {
        try {
          await db.prepare('UPDATE posts SET status = ? WHERE id = ?').bind(targetStatus, postId).run();
        } catch (_) {}
      }

      const memPost = globalPostsStore.find((p) => p.id === postId);
      if (memPost) {
        (memPost as any).status = targetStatus;
      }

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: targetStatus === 'locked' ? 'THREAD_LOCKED' : 'THREAD_UNLOCKED',
        targetId: postId,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Thread ${postId} status set to ${targetStatus}`,
          postId,
          status: targetStatus,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 8E. ACTION: MODERATION DELETE MESSAGE ────────────────────────────────
    if (body.action === 'delete-message') {
      const { messageId } = body;
      if (!messageId) {
        return new Response(
          JSON.stringify({ success: false, error: 'messageId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const db = getD1Database(context.env);
      if (db) {
        try {
          await db.prepare('DELETE FROM messages WHERE id = ?').bind(messageId).run();
        } catch (_) {}
      }

      const idx = globalMessagesStore.findIndex((m) => m.id === messageId);
      if (idx >= 0) {
        globalMessagesStore.splice(idx, 1);
      }

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: 'MESSAGE_DELETED',
        targetId: messageId,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({ success: true, message: `Message ${messageId} deleted`, messageId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 9. ACTION: UPDATE BROADCAST MESSAGE ──────────────────────────────────
    if (body.action === 'update_broadcast' || body.action === 'update-broadcast') {
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      globalServerConfig.broadcastMessage = message;

      const db = getD1Database(context.env);
      if (db) {
        try {
          await db.prepare('CREATE TABLE IF NOT EXISTS system_config (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)').run();
          await db.prepare('INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, ?)').bind('broadcastMessage', message, Date.now()).run();
        } catch (_) {}
      }

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: message ? 'BROADCAST_PUBLISHED' : 'BROADCAST_CLEARED',
        targetId: 'network-broadcast',
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: message ? 'System broadcast published to all clients' : 'System broadcast cleared',
          broadcastMessage: message,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 10. ACTION: DIRECT D1 RAW SQL EXECUTION ──────────────────────────────
    if (body.action === 'execute-sql') {
      const { sql, params = [] } = body;
      if (!sql || typeof sql !== 'string' || !sql.trim()) {
        return new Response(
          JSON.stringify({ success: false, error: 'SQL query string is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const db = getD1Database(context.env);
      if (!db) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cloudflare D1 database binding not available in current environment' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const trimmed = sql.trim();
      const startTime = Date.now();
      try {
        let stmt = db.prepare(trimmed);
        if (Array.isArray(params) && params.length > 0) {
          stmt = stmt.bind(...params);
        }

        const isSelect = /^\s*(SELECT|PRAGMA|EXPLAIN)\b/i.test(trimmed);
        if (isSelect) {
          const res = await stmt.all<any>();
          const elapsedMs = Date.now() - startTime;
          return new Response(
            JSON.stringify({
              success: true,
              type: 'SELECT',
              results: res.results || [],
              rowCount: res.results?.length || 0,
              meta: res.meta,
              elapsedMs,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } else {
          const res = await stmt.run();
          const elapsedMs = Date.now() - startTime;
          globalAdminLogsStore.unshift({
            id: `log-${Date.now()}`,
            action: 'SQL_EXECUTED',
            targetId: trimmed.slice(0, 50),
            adminFingerprint: adminFp,
            timestamp: Date.now(),
          });
          return new Response(
            JSON.stringify({
              success: Boolean(res && res.success !== false),
              type: 'MUTATION',
              meta: res.meta,
              rowsAffected: (res.meta as any)?.changes ?? 0,
              elapsedMs,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (sqlErr: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: sqlErr?.message || 'SQL execution failed in D1',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── 11. ACTION: EMERGENCY PANIC SWITCH (GLOBAL WRITE-FREEZE) ─────────────
    if (body.action === 'toggle-freeze' || body.action === 'toggle-emergency-freeze') {
      const freeze = body.freeze !== undefined ? Boolean(body.freeze) : true;
      globalServerConfig.emergencyFreeze = freeze;

      const db = getD1Database(context.env);
      if (db) {
        try {
          await db.prepare('CREATE TABLE IF NOT EXISTS system_config (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)').run();
          await db.prepare('INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, ?)').bind('emergencyFreeze', freeze ? 'true' : 'false', Date.now()).run();
        } catch (_) {}
      }

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: freeze ? 'EMERGENCY_FREEZE_ACTIVATED' : 'EMERGENCY_FREEZE_DEACTIVATED',
        targetId: 'global-network',
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: freeze ? '🚨 EMERGENCY FREEZE ACTIVATED: All user writes are blocked' : '✅ Emergency freeze deactivated: Normal operations restored',
          emergencyFreeze: freeze,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 12. ACTION: LIST R2 STORAGE OBJECTS ──────────────────────────────────
    if (body.action === 'list-r2-objects') {
      const bucket = getR2Bucket(context.env);
      if (!bucket) {
        return new Response(
          JSON.stringify({ success: false, error: 'R2 bucket binding not available in current environment' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const prefix = typeof body.prefix === 'string' ? body.prefix : undefined;
      const cursor = typeof body.cursor === 'string' ? body.cursor : undefined;
      const limit = typeof body.limit === 'number' ? Math.min(body.limit, 100) : 50;

      const listRes = await bucket.list({ prefix, cursor, limit });
      const objects = listRes.objects.map((o) => ({
        key: o.key,
        size: o.size,
        uploaded: o.uploaded ? o.uploaded.getTime() : Date.now(),
        httpEtag: o.httpEtag,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          objects,
          truncated: listRes.truncated,
          cursor: (listRes as any).cursor,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 13. ACTION: DELETE R2 STORAGE OBJECT ────────────────────────────────
    if (body.action === 'delete-r2-object') {
      const { key } = body;
      if (!key || typeof key !== 'string') {
        return new Response(
          JSON.stringify({ success: false, error: 'R2 object key is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const bucket = getR2Bucket(context.env);
      if (!bucket) {
        return new Response(
          JSON.stringify({ success: false, error: 'R2 bucket binding not available' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      await bucket.delete(key);
      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: 'R2_OBJECT_DELETED',
        targetId: key,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({ success: true, message: `R2 object ${key} deleted`, key }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 14. UNKNOWN ACTION ─────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unrecognized admin action: ${body.action}`,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Internal Server Error in Admin API',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ─── DELETE /api/admin ───────────────────────────────────────────────────────

export async function onRequestDelete(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const req = context.request;
    const url = new URL(req.url);

    // Finding 12: Permanently remove credentials from URL query parameters
    if (url.searchParams.has('pin') || url.searchParams.has('token')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Admin credentials in URL query parameters are strictly forbidden. Use Authorization or X-Admin-PIN header.',
          code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const clientIp =
      req.headers.get('CF-Connecting-IP') ||
      req.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
      '127.0.0.1';

    const lockout = isIpLockedOut(clientIp);
    if (lockout.locked) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many failed login attempts. Locked out for 10 minutes.',
          retryAfterSeconds: lockout.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(lockout.retryAfter),
          },
        }
      );
    }

    const auth = await verifyAdminAuthorization(req, context.env);

    if (!auth.authorized) {
      if (auth.status === 503) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'ADMIN_PIN not configured in environment variables.',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: auth.reason ? `Unauthorized: ${auth.reason}` : 'Unauthorized: Admin authentication required',
          code: 'UNAUTHORIZED',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ip = url.searchParams.get('ip');
    const postId = url.searchParams.get('postId');
    const logId = url.searchParams.get('logId');

    if (ip) {
      const idx = globalBannedIPsStore.findIndex((b) => b.ip === ip.trim());
      if (idx < 0) {
        return new Response(
          JSON.stringify({ success: false, error: `Banned IP ${ip} not found` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      globalBannedIPsStore.splice(idx, 1);
      return new Response(
        JSON.stringify({ success: true, message: `IP ${ip} removed from ban ledger`, ip }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (postId) {
      const db = getD1Database(context.env);
      let d1Deleted = false;
      if (db) {
        try {
          const res = await db.prepare('DELETE FROM posts WHERE id = ?').bind(postId).run();
          d1Deleted = Boolean(res && res.success);
          const kv = getKVStore(context.env);
          if (kv) {
            try {
              await kv.delete('posts:all:all:hot:50:0');
              await kv.delete(`post:${postId}`);
            } catch (_) {}
          }
        } catch (_) {}
      }

      const idx = globalPostsStore.findIndex((p) => p.id === postId);
      if (idx >= 0) {
        globalPostsStore.splice(idx, 1);
      } else if (!db || !d1Deleted) {
        if (!db) {
          return new Response(
            JSON.stringify({ success: false, error: `Post ${postId} not found` }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
      return new Response(
        JSON.stringify({ success: true, message: `Post ${postId} deleted`, postId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (logId) {
      const idx = globalAdminLogsStore.findIndex((l) => l.id === logId);
      if (idx < 0) {
        return new Response(
          JSON.stringify({ success: false, error: `Log entry ${logId} not found` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      globalAdminLogsStore.splice(idx, 1);
      return new Response(
        JSON.stringify({ success: true, message: `Log entry ${logId} deleted`, logId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Specify target parameter: ?ip=, ?postId=, or ?logId=' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Delete error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
