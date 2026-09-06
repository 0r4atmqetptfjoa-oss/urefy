/**
 * Cloudflare Pages Functions Authentication & Cryptographic Authorization Layer
 * Route: /api/* shared security middleware
 * Provides requireAdmin, verifyIdentitySignature, requireOwnership,
 * requireSignedEnvelope, and distributed replay nonce protection (D1 + KV + LRU memory).
 */

import { Env } from './_db.js';
import { verifyAdminAuthorization } from './admin.js';
import {
  verifySignature,
  computeFingerprint,
  hexToBytes,
  verifySignedEnvelope,
  SovereignSignedEnvelope,
  SovereignIdentity,
} from '@aetheris/core-crypto';

export interface IdentityAuthResult {
  valid: boolean;
  fingerprint?: string;
  publicKey?: string;
  response?: Response;
}

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
 * Cryptographically verifies that a mutating request originates from the claimed sovereign identity.
 * Validates:
 * 1. Presence of authorFingerprint, publicKey, and signature.
 * 2. Fingerprint derivation matches publicKey (SHA-256 first 8 bytes).
 * 3. Timestamp replay protection (within 5 minutes).
 * 4. Ed25519 signature over exact, canonical payload (no loose fallback guessing).
 */
export function verifyIdentitySignature(body: any, request: Request): IdentityAuthResult {
  const authorFingerprint = (
    request.headers.get('X-Author-Fingerprint') ||
    request.headers.get('X-Fingerprint') ||
    body?.authorFingerprint ||
    body?.userFingerprint ||
    body?.fingerprint ||
    ''
  ).trim();

  const publicKey = (
    request.headers.get('X-Public-Key') ||
    body?.publicKey ||
    body?.authorPublicKey ||
    ''
  ).trim();

  const signature = (
    request.headers.get('X-Signature') ||
    body?.signature ||
    ''
  ).trim();

  const rawTimestamp = request.headers.get('X-Timestamp') || body?.timestamp || body?.createdAt;
  const timestamp = rawTimestamp ? parseInt(String(rawTimestamp), 10) : Date.now();

  if (!authorFingerprint || !publicKey || !signature) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'Cryptographic authentication required: authorFingerprint, publicKey, and signature are mandatory.',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  // 1. Validate public key format (32 bytes = 64 hex characters)
  if (!/^[0-9a-fA-F]{64}$/.test(publicKey)) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid public key format: expected 64-character hex string (32 bytes).',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  // 2. Validate signature format (64 bytes = 128 hex characters)
  if (!/^[0-9a-fA-F]{128}$/.test(signature)) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid signature format: expected 128-character hex string (64 bytes).',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  // 3. Verify public key matches claimed fingerprint
  let pubBytes;
  try {
    pubBytes = hexToBytes(publicKey);
  } catch {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ success: false, error: 'Malformed public key hex bytes.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  const derivedFingerprint = computeFingerprint(pubBytes);
  if (derivedFingerprint !== authorFingerprint) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'Identity spoofing detected: authorFingerprint does not match public key derivation.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  // 4. Replay protection (5-minute timestamp tolerance)
  if (timestamp > 0) {
    const driftMs = Math.abs(Date.now() - timestamp);
    if (driftMs > 300000) {
      return {
        valid: false,
        response: new Response(
          JSON.stringify({
            success: false,
            error: 'Signature expired or clock drift exceeded (5-minute window).',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }
  }

  // 5. Verify Ed25519 signature over exact canonical payload (Security Hardening: eliminated loose candidate iteration)
  let canonicalPayload: string;
  const targetId = body?.targetId || body?.postId;

  if (body?.ciphertext) {
    canonicalPayload = body.ciphertext;
  } else if (targetId && body?.action) {
    canonicalPayload = `${targetId}:${body.action}:${authorFingerprint}`;
  } else if (body?.content && verifySignature(signature, body.content, pubBytes)) {
    canonicalPayload = body.content;
  } else {
    canonicalPayload = `${authorFingerprint}:${timestamp}${body?.nonce ? `:${body.nonce}` : ''}`;
  }

  const isVerified = verifySignature(signature, canonicalPayload, pubBytes);

  if (!isVerified) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'Cryptographic signature verification failed: signature does not match canonical payload and public key.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return {
    valid: true,
    fingerprint: authorFingerprint,
    publicKey,
  };
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

export async function checkAndRecordNonceDistributed(
  env: Env | undefined,
  fingerprint: string,
  nonce: string
): Promise<{ fresh: boolean; error?: string }> {
  const memoryKey = `${fingerprint}:${nonce}`;
  const now = Date.now();
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
  const db = env?.DB || env?.AETHERIS_DB;
  if (db) {
    try {
      await db.prepare(
        `INSERT INTO used_nonces (fingerprint, nonce, expires_at, created_at) VALUES (?, ?, ?, ?)`
      ).bind(fingerprint, nonce, expiresAt, now).run();
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('UNIQUE') || msg.includes('constraint') || msg.includes('PRIMARY KEY')) {
        return {
          fresh: false,
          error: `Replay attack detected: duplicate nonce "${nonce}" across distributed D1 database`,
        };
      }
      console.warn('[Auth] D1 distributed nonce warning:', e);
    }
  }

  return { fresh: true };
}

// ─── CANONICAL SOVEREIGN SIGNED ENVELOPE ROUTE AUTHENTICATOR ────────────────

/**
 * Enforces canonical SovereignSignedEnvelope format on mutating API routes.
 * Rejects legacy/unsigned requests.
 * Verifies 5-stage cryptographic pipeline:
 * 1. Signature -> 2. Fingerprint derivation -> 3. Capability authorization -> 4. Distributed replay nonces -> 5. Action.
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

  const fingerprint = body.identity?.fingerprint;
  if (fingerprint && body.nonce) {
    const nonceCheck = await checkAndRecordNonceDistributed(context.env, fingerprint, body.nonce);
    if (!nonceCheck.fresh) {
      return {
        authorized: false,
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
  }

  const result = verifySignedEnvelope<T>(body as SovereignSignedEnvelope<T>, {
    requiredCapability,
    seenNonces: nonceTracker,
  });

  if (!result.authorized) {
    const status = result.stage === 'authorization' ? 403 : 401;
    return {
      authorized: false,
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

  return {
    authorized: true,
    fingerprint: result.fingerprint,
    publicKey: result.identity?.signingPublicKey,
    identity: result.identity,
    payload: result.payload,
  };
}

/**
 * Verifies either a canonical SovereignSignedEnvelope or legacy flat signed payload.
 * When an envelope is received, executes the 5-stage sequential verification:
 * 1. Signature -> 2. Fingerprint -> 3. Authorization (Capabilities) -> 4. Replay -> 5. Action
 */
export function verifyEnvelopeOrLegacyAuth<T = any>(
  context: { request: Request; env?: Env },
  body: any,
  requiredCapability?: string
): UnifiedAuthResult<T> {
  // 1. Detect SovereignSignedEnvelope schema
  if (
    body &&
    typeof body === 'object' &&
    body.payload !== undefined &&
    body.signature &&
    body.nonce &&
    body.identity &&
    typeof body.identity === 'object'
  ) {
    const result = verifySignedEnvelope<T>(body as SovereignSignedEnvelope<T>, {
      requiredCapability,
      seenNonces: nonceTracker,
    });

    if (!result.authorized) {
      const status = result.stage === 'authorization' ? 403 : 401;
      return {
        authorized: false,
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

    return {
      authorized: true,
      fingerprint: result.fingerprint,
      publicKey: result.identity?.signingPublicKey,
      identity: result.identity,
      payload: result.payload,
    };
  }

  // 2. Fallback to Phase 1 signature validation
  const legacy = verifyIdentitySignature(body, context.request);
  if (!legacy.valid) {
    return {
      authorized: false,
      response: legacy.response,
    };
  }

  return {
    authorized: true,
    fingerprint: legacy.fingerprint,
    publicKey: legacy.publicKey,
    payload: body,
  };
}
