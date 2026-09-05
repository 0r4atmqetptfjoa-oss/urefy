// ===========================================================================
// AETHERIS OMNI-SPHERE — SOVEREIGN ADMIN & GOVERNANCE EDGE API
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
  globalChannelsStore,
  globalPostsStore,
  globalMessagesStore,
  globalNodesTelemetryStore,
  EdgeChannel,
  EdgePost,
} from './_db.js';

export interface AdminUser {
  fingerprint: string;
  role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER';
  status: 'online' | 'idle' | 'dnd' | 'offline';
  isZKVerified: boolean;
  isQuarantined: boolean;
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

export const globalAdminUsersStore: AdminUser[] = [
  { fingerprint: 'sovereign-root-guardian', role: 'GUARDIAN', status: 'online', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 30, messagesCount: 892, postsCount: 47 },
  { fingerprint: 'c3dc28cb705e', role: 'ARCHIVIST', status: 'online', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 20, messagesCount: 341, postsCount: 23 },
  { fingerprint: 'a89104fa2211', role: 'MODERATOR', status: 'idle', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 15, messagesCount: 156, postsCount: 8 },
  { fingerprint: 'f40019bc88a2', role: 'MEMBER', status: 'idle', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 7, messagesCount: 42, postsCount: 2 },
  { fingerprint: '9b22a011cd44', role: 'MEMBER', status: 'dnd', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 3, messagesCount: 17, postsCount: 0 },
  { fingerprint: 'bad-actor-001', role: 'MEMBER', status: 'offline', isZKVerified: false, isQuarantined: true, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 2, messagesCount: 3, postsCount: 0 },
];

export const globalBannedIPsStore: AdminBannedIP[] = [
  { ip: '185.220.101.5', reason: 'Honeypot Probe: /.env scanner', bannedAt: Date.now() - 60000, expiresAt: Date.now() + 1000 * 60 * 60 * 23 },
  { ip: '45.154.255.89', reason: 'XSS Injection Attempt', bannedAt: Date.now() - 120000, expiresAt: Date.now() + 1000 * 60 * 60 * 22 },
  { ip: '194.26.29.112', reason: 'DDoS Flood (500 req/sec)', bannedAt: Date.now() - 240000, expiresAt: Date.now() + 1000 * 60 * 60 * 21 },
];

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

export const globalAdminLogsStore: AdminLogEntry[] = [
  { id: 'log-1', action: 'ROLE_CHANGED', targetId: 'a89104fa2211', adminFingerprint: 'sovereign-root-guardian', timestamp: Date.now() - 300000 },
  { id: 'log-2', action: 'IP_BANNED', targetId: '185.220.101.5', adminFingerprint: 'sovereign-root-guardian', timestamp: Date.now() - 120000 },
  { id: 'log-3', action: 'POST_DELETED', targetId: 'post-spam-44', adminFingerprint: 'sovereign-root-guardian', timestamp: Date.now() - 60000 },
];

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
    if (host.endsWith('.pages.dev')) {
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

  const configuredPin = hasEnvPin ? env!.ADMIN_PIN : DEFAULT_ADMIN_PIN;
  const authHeader = req.headers.get('Authorization') || '';
  const adminPinHeader = req.headers.get('X-Admin-PIN') || '';

  const url = new URL(req.url);
  const queryPin = url.searchParams.get('pin');
  const queryToken = url.searchParams.get('token');

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

  // Check ?token= (valid HMAC session token or matching configured PIN)
  if (queryToken) {
    const token = queryToken.trim();
    if (token.startsWith('aeth_adm_')) {
      const isValid = await verifyAdminSessionToken(token, configuredPin);
      if (isValid) return { authorized: true };
    } else if (token === configuredPin) {
      return { authorized: true };
    }
  }

  // Check direct PIN in header or query param
  if (adminPinHeader && adminPinHeader === configuredPin) {
    return { authorized: true };
  }
  if (queryPin && queryPin === configuredPin) {
    return { authorized: true };
  }

  return { authorized: false, reason: 'Invalid or missing admin credentials', status: 401 };
}

// ─── OPTIONS PREFLIGHT ───────────────────────────────────────────────────────

export function isPermittedAdminOrigin(origin: string, requestUrl: URL): boolean {
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    if (originUrl.host === requestUrl.host) return true;
    const h = originUrl.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]') return true;
    if (
      h === 'aetheris.network' ||
      h.endsWith('.aetheris.network') ||
      h === 'aetheris.io' ||
      h.endsWith('.aetheris.io') ||
      h === 'pages.dev' ||
      h.endsWith('.pages.dev') ||
      h.endsWith('.local')
    ) {
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
          error: 'Unauthorized: Admin authentication required',
          code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="Aetheris Sovereign Admin"',
          },
        }
      );
    }

    const tab = url.searchParams.get('tab') || 'all';

    const db = getD1Database(context.env);

    // Build comprehensive administrative dashboard payload
    const payload = {
      success: true,
      timestamp: Date.now(),
      stats: {
        totalUsers: globalAdminUsersStore.length,
        onlineUsers: globalAdminUsersStore.filter((u) => u.status === 'online').length,
        quarantinedUsers: globalAdminUsersStore.filter((u) => u.isQuarantined).length,
        totalChannels: globalChannelsStore.length,
        totalPosts: globalPostsStore.length,
        totalMessages: globalMessagesStore.length,
        totalNodes: globalNodesTelemetryStore.length,
        bannedIPsCount: globalBannedIPsStore.length,
      },
      users: tab === 'all' || tab === 'users' ? globalAdminUsersStore : undefined,
      channels: tab === 'all' || tab === 'channels' ? globalChannelsStore : undefined,
      bannedIPs: tab === 'all' || tab === 'waf' ? globalBannedIPsStore : undefined,
      config: tab === 'all' || tab === 'config' ? globalServerConfig : undefined,
      logs: tab === 'all' || tab === 'logs' || tab === 'moderation' ? globalAdminLogsStore : undefined,
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
          error: 'Unauthorized: Valid admin authentication required for administrative actions',
          code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const adminFp = req.headers.get('X-Admin-Fingerprint') || 'sovereign-root-guardian';

    // ── 2. ACTION: PROMOTE USER ───────────────────────────────────────────────
    if (body.action === 'promote-user') {
      const { fingerprint, newRole } = body;
      if (!fingerprint) {
        return new Response(
          JSON.stringify({ success: false, error: 'User fingerprint is required for promotion' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const user = globalAdminUsersStore.find((u) => u.fingerprint === fingerprint);
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: `User with fingerprint ${fingerprint} not found` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const ladder: AdminUser['role'][] = ['MEMBER', 'MODERATOR', 'ARCHIVIST', 'GUARDIAN'];
      if (newRole && ladder.includes(newRole)) {
        user.role = newRole;
      } else {
        const currentIdx = ladder.indexOf(user.role);
        if (currentIdx < ladder.length - 1) {
          user.role = ladder[currentIdx + 1];
        }
      }

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: 'ROLE_CHANGED',
        targetId: fingerprint,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `User ${fingerprint} role updated to ${user.role}`,
          user,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. ACTION: TOGGLE QUARANTINE ─────────────────────────────────────────
    if (body.action === 'toggle-quarantine') {
      const { fingerprint } = body;
      if (!fingerprint) {
        return new Response(
          JSON.stringify({ success: false, error: 'User fingerprint is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const user = globalAdminUsersStore.find((u) => u.fingerprint === fingerprint);
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: `User with fingerprint ${fingerprint} not found` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      user.isQuarantined = body.quarantined !== undefined ? Boolean(body.quarantined) : !user.isQuarantined;

      globalAdminLogsStore.unshift({
        id: `log-${Date.now()}`,
        action: user.isQuarantined ? 'USER_QUARANTINED' : 'USER_UNQUARANTINED',
        targetId: fingerprint,
        adminFingerprint: adminFp,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `User ${fingerprint} quarantine status set to ${user.isQuarantined}`,
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

      const idx = globalPostsStore.findIndex((p) => p.id === postId);
      if (idx < 0) {
        return new Response(
          JSON.stringify({ success: false, error: `Post ${postId} not found` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      globalPostsStore.splice(idx, 1);

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

    // ── 10. UNKNOWN ACTION ─────────────────────────────────────────────────────
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
        JSON.stringify({ success: false, error: 'Unauthorized: Admin authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
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
      const idx = globalPostsStore.findIndex((p) => p.id === postId);
      if (idx < 0) {
        return new Response(
          JSON.stringify({ success: false, error: `Post ${postId} not found` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      globalPostsStore.splice(idx, 1);
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
