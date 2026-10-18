/**
 * Cloudflare Pages Functions Authentication & Cryptographic Authorization Layer
 * Route: /api/* shared security middleware
 * Provides requireAdmin, requireOwnership, requireSignedEnvelope,
 * and distributed atomic replay nonce protection (D1 + KV + LRU memory).
 * Strictly enforces canonical SovereignSignedEnvelope schema (Zero Legacy Auth).
 */

import { Env, isProductionEnv, getD1Database } from './_db.js';
import { verifyAdminAuthorization } from './admin.js';
import {
  verifySignedEnvelope,
  SovereignSignedEnvelope,
  SovereignIdentity,
} from '@aetheris/core-crypto';

export interface AdminAuthResult {
  authorized: boolean;
  response?: Response;
}

/**
 * Enforces admin-level authorization via HMAC session token or exact ADMIN_PIN.
 * Strictly rejects legacy or magic tokens with HTTP 401.
 */
export async function requireAdmin(context: { request: Request; env?: Env }): Promise<AdminAuthResult> {
  const check = await verifyAdminAuthorization(context.request, context.env);
  if (!check.authorized) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: check.reason || 'Unauthorized: Admin authorization required',
        }),
        {
          status: check.status || 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }
  return { authorized: true };
}

/**
 * Enforces resource ownership (requester fingerprint must match resource owner fingerprint,
 * unless requester is an authenticated admin).
 */
export function requireOwnership(requesterFingerprint?: string, resourceOwnerFingerprint?: string): boolean {
  if (!requesterFingerprint || !resourceOwnerFingerprint) return false;
  return requesterFingerprint === resourceOwnerFingerprint;
}

export interface UnifiedAuthResult<T = any> {
  authorized: boolean;
  fingerprint?: string;
  publicKey?: string;
  identity?: SovereignIdentity;
  payload?: T;
  response?: Response;
  error?: string;
}

// ─── BOUNDED LRU MEMORY CACHE (PREVENTS MEMORY EXHAUSTION DOS) ───────────────

export const MAX_NONCES = 10_000;
export const NONCE_CACHE_TTL_MS = 300000; // 5 minutes
export const globalReplayNonceCache = new Map<string, number>();

export function resetReplayNonceCache(): void {
  globalReplayNonceCache.clear();
}

export function cleanExpiredNonces(): void {
  const now = Date.now();
  for (const [nonce, ts] of globalReplayNonceCache.entries()) {
    if (now - ts > NONCE_CACHE_TTL_MS) {
      globalReplayNonceCache.delete(nonce);
    }
  }
}

export function checkAndRecordNonceMemory(key: string): boolean {
  const now = Date.now();
  const ts = globalReplayNonceCache.get(key);
  if (ts !== undefined) {
    if (now - ts <= NONCE_CACHE_TTL_MS) {
      return false; // Replay attack detected
    }
    globalReplayNonceCache.delete(key);
  }

  // Bounded LRU enforcement: prevent memory exhaustion DoS
  if (globalReplayNonceCache.size >= MAX_NONCES) {
    cleanExpiredNonces();
    if (globalReplayNonceCache.size >= MAX_NONCES) {
      const oldestKey = globalReplayNonceCache.keys().next().value;
      if (oldestKey) {
        globalReplayNonceCache.delete(oldestKey);
      }
    }
  }

  globalReplayNonceCache.set(key, now);
  return true;
}

export const nonceTracker = {
  has(nonce: string): boolean {
    cleanExpiredNonces();
    return globalReplayNonceCache.has(nonce);
  },
  add(nonce: string): void {
    checkAndRecordNonceMemory(nonce);
  },
};

// ─── DISTRIBUTED REPLAY NONCES (D1 + KV + BOUNDED LRU MEMORY) ────────────────

/**
 * Verifies and atomically consumes a nonce with distributed replay protection.
 * In production (isProductionEnv(env)):
 * - If D1 database is unavailable or the INSERT fails due to database error (other than UNIQUE constraint),
 *   FAILS CLOSED: returns { fresh: false, error: 'Distributed nonce storage unavailable. Replay protection failed closed.' }.
 * - Does NOT return { fresh: true } based only on local isolate memory when production persistent storage is unavailable or errors.
 */
export async function verifyAndConsumeNonce(
  context: { env?: Env } | Env | undefined,
  fingerprint: string,
  nonce: string,
  timestamp?: number
): Promise<{ fresh: boolean; error?: string }> {
  const env = context && typeof context === 'object' && 'env' in context ? context.env : (context as Env | undefined);
  const isProd = isProductionEnv(env);

  const now = Date.now();

  // Check timestamp freshness if provided
  if (timestamp !== undefined) {
    if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > NONCE_CACHE_TTL_MS) {
      return {
        fresh: false,
        error: `Timestamp outside acceptable freshness window: delta ${Math.abs(now - timestamp)}ms exceeds ${NONCE_CACHE_TTL_MS}ms`,
      };
    }
  }

  const memoryKey = `${fingerprint}:${nonce}`;
  const expiresAt = now + NONCE_CACHE_TTL_MS;

  // 1. Isolate Memory Check with Bounded LRU Cache (Fast path)
  if (!checkAndRecordNonceMemory(memoryKey)) {
    return {
      fresh: false,
      error: `Replay attack detected: duplicate nonce "${nonce}" already observed in edge isolate memory`,
    };
  }

  // 2. Cloudflare KV Check (Distributed edge read/write)
  const kv = env?.KV_SESSIONS || env?.CACHE_KV || env?.KV;
  if (kv) {
    try {
      const kvKey = `nonce:${fingerprint}:${nonce}`;
      const existing = await kv.get(kvKey);
      if (existing) {
        return {
          fresh: false,
          error: `Replay attack detected: duplicate nonce "${nonce}" across edge KV`,
        };
      }
      await kv.put(kvKey, String(now), { expirationTtl: 300 });
    } catch (e) {
      console.warn('[Auth] KV distributed nonce warning:', e);
    }
  }

  // 3. Cloudflare D1 Database Check (used_nonces table with PRIMARY KEY (fingerprint, nonce))
  const db = getD1Database(env);

  // In production, D1 persistent storage is mandatory. Fail closed if unavailable.
  if (isProd && !db) {
    return {
      fresh: false,
      error: 'Distributed nonce storage unavailable. Replay protection failed closed.',
    };
  }

  if (db) {
    try {
      if (typeof db.batch === 'function') {
        await db.batch([
          db.prepare('DELETE FROM used_nonces WHERE expires_at < ?').bind(now),
          db.prepare(
            'INSERT INTO used_nonces (fingerprint, nonce, expires_at, created_at) VALUES (?, ?, ?, ?)'
          ).bind(fingerprint, nonce, expiresAt, now),
        ]);
      } else {
        await db.prepare(
          'INSERT INTO used_nonces (fingerprint, nonce, expires_at, created_at) VALUES (?, ?, ?, ?)'
        ).bind(fingerprint, nonce, expiresAt, now).run();
      }
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('UNIQUE') || msg.includes('constraint') || msg.includes('PRIMARY KEY')) {
        return {
          fresh: false,
          error: `Replay attack detected: duplicate nonce "${nonce}" across distributed D1 database`,
        };
      }
      // If D1 fails with any other error in production, FAIL CLOSED!
      if (isProd) {
        return {
          fresh: false,
          error: 'Distributed nonce storage unavailable. Replay protection failed closed.',
        };
      }
      console.warn('[Auth] D1 distributed nonce warning:', e);
    }
  }

  return { fresh: true };
}

export async function checkAndRecordNonceDistributed(
  env: Env | undefined,
  fingerprint: string,
  nonce: string,
  timestamp?: number
): Promise<{ fresh: boolean; error?: string }> {
  return verifyAndConsumeNonce(env, fingerprint, nonce, timestamp);
}

// ─── CANONICAL SOVEREIGN SIGNED ENVELOPE ROUTE AUTHENTICATOR ────────────────

/**
 * Enforces canonical SovereignSignedEnvelope format on all mutating API routes.
 * Strictly executes the anti-poisoning verification pipeline:
 * 1. Parse envelope & validate schema
 * 2. Verify cryptographic signature & fingerprint derivation
 * 3. Verify timestamp freshness (drift < 300s)
 * 4. Verify capability authorization
 * 5. ATOMICALLY check and record nonce in D1 / KV / Bounded Memory (ONLY AFTER signature verified!)
 * 6. Execute authorized action
 */
export async function requireSignedEnvelope<T = any>(
  context: { request: Request; env?: Env },
  body: any,
  requiredCapability?: string
): Promise<UnifiedAuthResult<T>> {
  if (
    !body ||
    typeof body !== 'object' ||
    body.payload === undefined ||
    !body.signature ||
    !body.nonce ||
    !body.identity ||
    typeof body.identity !== 'object'
  ) {
    return {
      authorized: false,
      error: 'SovereignSignedEnvelope required: payload, signature, nonce, and identity are mandatory.',
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'SovereignSignedEnvelope required: payload, signature, nonce, and identity are mandatory.',
          stage: 'signature',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  // STEP 1-4: Cryptographically verify signature, fingerprint, capabilities, and timestamp FIRST.
  // Note: seenNonces is intentionally omitted here to prevent nonce poisoning if signature fails!
  const result = verifySignedEnvelope<T>(body as SovereignSignedEnvelope<T>, {
    requiredCapability,
  });

  if (!result.authorized) {
    const status = result.stage === 'authorization' ? 403 : 401;
    return {
      authorized: false,
      error: result.error || 'Sovereign envelope authorization failed',
      response: new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Sovereign envelope authorization failed',
          stage: result.stage,
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  // STEP 5: ATOMIC check and record nonce ONLY AFTER cryptographic verification succeeds!
  const fingerprint = result.identity?.fingerprint || body.identity.fingerprint;
  const nonceCheck = await checkAndRecordNonceDistributed(context.env, fingerprint, body.nonce, body.timestamp);
  if (!nonceCheck.fresh) {
    return {
      authorized: false,
      error: nonceCheck.error || 'Replay attack detected: duplicate nonce',
      response: new Response(
        JSON.stringify({
          success: false,
          error: nonceCheck.error || 'Replay attack detected: duplicate nonce',
          stage: 'replay',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  // STEP 6: Complete
  return {
    authorized: true,
    fingerprint: result.fingerprint,
    publicKey: result.identity?.signingPublicKey,
    identity: result.identity,
    payload: result.payload,
  };
}
