// ===========================================================================
// UREfy — SOVEREIGN NODE FEDERATION PROTOCOL EDGE API
// Implements ActivityPub 2.0 & Sovereign Gossip Bridge:
// 1. GET /.well-known/aetheris-node & GET /api/federation/nodeinfo (NodeInfo 2.1)
// 2. GET /api/federation/actor (Public Ed25519 node actor in ActivityStreams 2.0)
// 3. POST /api/federation/inbox (Cryptographically verified pulse ingestion)
// 4. GET /api/federation/outbox (ActivityStreams 2.0 OrderedCollection pulses)
// ===========================================================================

import {
  Env,
  EdgePost,
  getD1Database,
  getKVStore,
  globalPostsStore,
  isProductionEnv,
  createD1UnavailableResponse,
} from './_db.js';
import {
  generateKeyPair,
  signMessage,
  verifySignature,
  hexToBytes,
  bytesToHex,
  computeFingerprint,
  KeyPair,
} from '@aetheris/core-crypto';
import { safeFetch, validateSafeUrl } from './_ssrf-guard.js';
import {
  verifyHttpRequestSignature,
  signHttpRequest,
  signHttpRequestRsa,
  computeHttpDigest,
  ResolvedHttpVerificationKey,
} from './_http-signatures.js';

// ─── STANDARD ACTIVITYPUB & NODEINFO SCHEMAS ─────────────────────────────────

export interface NodeInfo21 {
  version: '2.1';
  software: {
    name: string;
    version: string;
  };
  protocols: string[];
  usage: {
    users: {
      total: number;
    };
    localPosts: number;
  };
  openRegistrations: boolean;
}

export interface ActivityPubActor {
  '@context': string | string[];
  id: string;
  type: string;
  preferredUsername: string;
  name: string;
  summary: string;
  inbox: string;
  outbox: string;
  publicKey: {
    id: string;
    owner: string;
    publicKeyPem?: string;
    publicKeyHex?: string;
  };
  nodeInfo?: string;
  endpoints?: {
    sharedInbox?: string;
  };
}

export interface ActivityStreamsNote {
  id: string;
  type: 'Note';
  attributedTo?: string;
  published?: string;
  content: string;
  title?: string;
  to?: string[];
  summary?: string;
}

export interface ActivityPubEnvelope {
  '@context': string | string[];
  id?: string;
  type: 'Create' | 'Announce' | 'Update' | 'Delete' | string;
  actor: string;
  published?: string;
  to?: string[];
  cc?: string[];
  object: ActivityStreamsNote | any;
  signature?: {
    type?: string;
    creator?: string;
    created?: string;
    signatureValue?: string;
    value?: string;
    publicKeyHex?: string;
    publicKey?: {
      publicKeyHex?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export interface ActivityStreamsOrderedCollection {
  '@context': string | string[];
  id: string;
  type: 'OrderedCollection';
  totalItems: number;
  orderedItems: any[];
}

// ─── DETERMINISTIC SOVEREIGN NODE KEYPAIR ────────────────────────────────────

const DEFAULT_NODE_SEED = new Uint8Array([
  0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88,
  0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00,
  0x01, 0x12, 0x23, 0x34, 0x45, 0x56, 0x67, 0x78,
  0x89, 0x9a, 0xab, 0xbc, 0xcd, 0xde, 0xef, 0xf1,
]);

export const DEFAULT_NODE_KEYPAIR: KeyPair = generateKeyPair(DEFAULT_NODE_SEED);

/**
 * Retrieves the cryptographic node keypair.
 * In production (isProductionEnv), NODE_PRIVATE_KEY or FEDERATION_PRIVATE_KEY is strictly required.
 * Never silently falls back to DEFAULT_NODE_KEYPAIR in production!
 */
export function getNodeKeyPair(env?: Env): KeyPair {
  const privateKey = env?.NODE_PRIVATE_KEY || (env as any)?.FEDERATION_PRIVATE_KEY;
  if (privateKey && typeof privateKey === 'string') {
    try {
      let clean = privateKey.trim();
      if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
        clean = clean.slice(1, -1).trim();
      }
      if (clean.startsWith('0x') || clean.startsWith('0X')) {
        clean = clean.slice(2);
      }
      if (/^[0-9a-fA-F]{64}$/.test(clean)) {
        const privBytes = hexToBytes(clean);
        if (privBytes.length === 32) {
          return generateKeyPair(privBytes);
        }
      }
      if (/^[0-9a-fA-F]{128}$/.test(clean)) {
        const privBytes = hexToBytes(clean);
        return generateKeyPair(privBytes.slice(0, 32));
      }
      try {
        const bin = atob(clean);
        if (bin.length === 32 || bin.length === 64) {
          const privBytes = new Uint8Array(32);
          for (let i = 0; i < 32; i++) privBytes[i] = bin.charCodeAt(i);
          return generateKeyPair(privBytes);
        }
      } catch (_) {}
    } catch (_) {}
  }

  if (isProductionEnv(env)) {
    throw new Error('Node private key not configured in production environment');
  }

  return DEFAULT_NODE_KEYPAIR;
}

/**
 * Encodes an Ed25519 public key into standard RFC 8410 SPKI PEM format.
 */
export function ed25519PublicKeyToPem(pubKeyBytesOrHex: Uint8Array | string): string {
  const bytes = typeof pubKeyBytesOrHex === 'string' ? hexToBytes(pubKeyBytesOrHex) : pubKeyBytesOrHex;
  // RFC 8410 ASN.1 prefix for Ed25519 public key (12 bytes: 302a300506032b6570032100)
  const prefix = new Uint8Array([
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
  ]);
  const der = new Uint8Array(prefix.length + bytes.length);
  der.set(prefix, 0);
  der.set(bytes, prefix.length);

  let binary = '';
  for (let i = 0; i < der.length; i++) {
    binary += String.fromCharCode(der[i]);
  }
  const b64 = btoa(binary);
  return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
}

// ─── SHA-256 HELPER ──────────────────────────────────────────────────────────

export async function sha256Hex(data: string): Promise<string> {
  const bytes = new TextEncoder().encode(data);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d, h3 = 0x12345678, h4 = 0x98765432;
  for (let i = 0; i < bytes.length; i++) {
    h1 = Math.imul(h1 ^ bytes[i], 2654435761);
    h2 = Math.imul(h2 ^ bytes[i], 1597334677);
    h3 = Math.imul(h3 ^ bytes[i], 3812048473);
    h4 = Math.imul(h4 ^ bytes[i], 2860486313);
  }
  return [h1, h2, h3, h4].map((h) => (h >>> 0).toString(16).padStart(8, '0')).join('');
}

// ─── ACTOR PUBLIC KEY RESOLUTION & CACHING (Finding 1) ───────────────────────

export interface CachedActorKey {
  publicKeyHex?: string;
  publicKeyPem?: string;
  inbox?: string;
  sharedInbox?: string;
  expiresAt: number;
}

export const ACTOR_KEY_TTL_MS = 60 * 60 * 1000; // 1 hour bounded TTL
export const actorKeyCache = new Map<string, CachedActorKey>();
// Empty by default. Deployments may explicitly pin peers at startup, but the
// application never ships synthetic production trust anchors.
export const trustedActorKeyRegistry = new Map<string, string>();

export function registerTrustedActorKey(actorUrl: string, publicKeyHex: string): void {
  trustedActorKeyRegistry.set(actorUrl, publicKeyHex.toLowerCase());
}

export function invalidateActorKey(actorUrl: string): void {
  actorKeyCache.delete(actorUrl);
}


export function clearActorKeyCache(): void {
  actorKeyCache.clear();
}

export function clearTrustedActorKeys(): void {
  trustedActorKeyRegistry.clear();
  actorKeyCache.clear();
}

export const INBOX_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const INBOX_IDEMPOTENCY_MAX_SIZE = 5000;
export const inboxProcessedActivities = new Map<string, number>();

export function checkAndRecordInboxActivity(activityId: string): boolean {
  const now = Date.now();
  if (inboxProcessedActivities.size >= INBOX_IDEMPOTENCY_MAX_SIZE) {
    for (const [id, ts] of inboxProcessedActivities.entries()) {
      if (now - ts > INBOX_IDEMPOTENCY_TTL_MS) {
        inboxProcessedActivities.delete(id);
      }
    }
    if (inboxProcessedActivities.size >= INBOX_IDEMPOTENCY_MAX_SIZE) {
      const oldestKey = inboxProcessedActivities.keys().next().value;
      if (oldestKey) inboxProcessedActivities.delete(oldestKey);
    }
  }

  if (inboxProcessedActivities.has(activityId)) {
    const ts = inboxProcessedActivities.get(activityId)!;
    if (now - ts < INBOX_IDEMPOTENCY_TTL_MS) {
      return false; // Already processed!
    }
  }

  inboxProcessedActivities.set(activityId, now);
  return true; // Newly recorded
}

export function clearInboxProcessedActivities(): void {
  inboxProcessedActivities.clear();
}

/**
 * Converts untrusted federated HTML to escaped plain text. A regex allow-list
 * sanitizer is unsafe for adversarial HTML; preserving rich markup should use
 * a maintained HTML parser/sanitizer in a separate, audited change.
 */
export function sanitizeFederatedContent(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  const text = rawHtml
    .replace(/<(script|style|iframe|object|embed|svg|math)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]!));
}

/**
 * Resolves the actor's public key from the trusted registry, in-memory cache,
 * or by fetching the actor's ActivityStreams descriptor from the network via safeFetch (SSRF Guard).
 */
export async function fetchActorPublicKey(actorUrl: string, allowLocalDev: boolean = false): Promise<string | null> {
  if (!actorUrl || typeof actorUrl !== 'string') return null;

  // 1. Check trusted registry
  if (trustedActorKeyRegistry.has(actorUrl)) {
    return trustedActorKeyRegistry.get(actorUrl)!;
  }

  // 2. Check cache with bounded TTL
  const cached = actorKeyCache.get(actorUrl);
  if (cached) {
    if (Date.now() < cached.expiresAt) {
      return cached.publicKeyHex || null;
    }
    actorKeyCache.delete(actorUrl);
  }

  // 3. Resolve from actor URL using fail-closed SSRF Guard
  try {
    const resp = await safeFetch(
      actorUrl,
      {
        headers: {
          Accept: 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
        },
      },
      {
        allowLocalDev,
        timeoutMs: 4000,
        allowedContentTypes: ['application/activity+json', 'application/ld+json', 'application/json'],
      }
    );

    if (resp.ok) {
      const data = (await resp.json()) as any;
      if (typeof data?.id !== 'string' || data.id !== actorUrl || data?.publicKey?.owner !== actorUrl) {
        return null;
      }

      const rawKeyId = typeof data?.publicKey?.id === 'string' ? data.publicKey.id : '';
      if (rawKeyId && !(rawKeyId === actorUrl || rawKeyId.startsWith(`${actorUrl}#`) || rawKeyId.startsWith(`${actorUrl}/`))) {
        return null;
      }

      const pubKey =
        data?.publicKey?.publicKeyHex ||
        (typeof data?.publicKey === 'string' && /^[0-9a-f]{64}$/i.test(data.publicKey) ? data.publicKey : null);
      const publicKeyPem = typeof data?.publicKey?.publicKeyPem === 'string'
        ? data.publicKey.publicKeyPem
        : undefined;
      const inbox = typeof data?.inbox === 'string' ? data.inbox : undefined;
      const sharedInbox = typeof data?.endpoints?.sharedInbox === 'string' ? data.endpoints.sharedInbox : undefined;

      if (pubKey && typeof pubKey === 'string' && /^[0-9a-f]{64}$/i.test(pubKey)) {
        const canonicalKey = pubKey.toLowerCase();
        actorKeyCache.set(actorUrl, {
          publicKeyHex: canonicalKey,
          publicKeyPem,
          inbox,
          sharedInbox,
          expiresAt: Date.now() + ACTOR_KEY_TTL_MS,
        });
        return canonicalKey;
      }

      if (publicKeyPem) {
        actorKeyCache.set(actorUrl, { publicKeyPem, inbox, sharedInbox, expiresAt: Date.now() + ACTOR_KEY_TTL_MS });
      }
    }
  } catch (_) {
    // Fail closed on network or SSRF errors
  }

  return null;
}

/** Resolve either an UREfy Ed25519 key or a standard Fediverse RSA SPKI key. */
export async function fetchActorHttpVerificationKey(
  actorUrl: string,
  allowLocalDev: boolean = false
): Promise<ResolvedHttpVerificationKey | null> {
  const registered = trustedActorKeyRegistry.get(actorUrl);
  if (registered) return { algorithm: 'ed25519', publicKey: registered };

  const cached = actorKeyCache.get(actorUrl);
  if (cached && Date.now() < cached.expiresAt) {
    if (cached.publicKeyHex) return { algorithm: 'ed25519', publicKey: cached.publicKeyHex };
    if (cached.publicKeyPem) return { algorithm: 'rsa-sha256', publicKey: cached.publicKeyPem };
  }

  await fetchActorPublicKey(actorUrl, allowLocalDev);
  const resolved = actorKeyCache.get(actorUrl);
  if (resolved?.publicKeyHex) return { algorithm: 'ed25519', publicKey: resolved.publicKeyHex };
  if (resolved?.publicKeyPem) return { algorithm: 'rsa-sha256', publicKey: resolved.publicKeyPem };
  return null;
}

/**
 * Canonical payload serializer: strictly binds actor, id, type, published, and content.
 */
export function getCanonicalFederationPayload(envelope: ActivityPubEnvelope): string | null {
  if (!envelope || !envelope.actor || !envelope.object) return null;
  const object = envelope.object;
  if (typeof object !== 'object' || !object.id || !object.type || !object.published || typeof object.content !== 'string') {
    return null;
  }
  return JSON.stringify({
    actor: envelope.actor,
    id: object.id,
    type: object.type,
    published: object.published,
    content: object.content,
  });
}

/**
 * Constructs and signs a federated ActivityStreams envelope using an Ed25519 key.
 */
export function createSignedFederatedEnvelope(
  actorUrl: string,
  note: { id?: string; content: string; title?: string; published?: string },
  privateKeyHex: string,
  publicKeyHex: string
): ActivityPubEnvelope {
  const published = note.published || new Date().toISOString();
  const randSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').substring(0, 8)
    : Date.now().toString(36);
  let noteId = note.id || `urn:pulse:${Date.now()}:${randSuffix}`;
  if (!noteId.startsWith('urn:pulse:')) {
    try {
      const parsed = new URL(noteId);
      if (parsed.protocol !== 'https:') throw new Error('non-HTTPS object id');
    } catch {
      const actorOrigin = new URL(actorUrl).origin;
      noteId = `${actorOrigin}/objects/${encodeURIComponent(noteId)}`;
    }
  }
  const noteObject: ActivityStreamsNote = {
    id: noteId,
    type: 'Note',
    attributedTo: actorUrl,
    published,
    content: note.content,
    ...(note.title ? { title: note.title } : {}),
    to: ['https://www.w3.org/ns/activitystreams#Public'],
  };

  const envelope: ActivityPubEnvelope = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Create',
    actor: actorUrl,
    published,
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    object: noteObject,
  };

  const canonicalPayload = getCanonicalFederationPayload(envelope);
  if (!canonicalPayload) {
    throw new Error('Failed to construct canonical federation payload');
  }

  const sigBytes = signMessage(canonicalPayload, privateKeyHex);
  const signatureHex = bytesToHex(sigBytes);

  envelope.signature = {
    type: 'Ed25519Signature2020',
    creator: `${actorUrl}#main-key`,
    created: published,
    signatureValue: signatureHex,
    publicKeyHex,
  };

  // Register in trusted registry & cache for local/test/offline environments
  registerTrustedActorKey(actorUrl, publicKeyHex);
  actorKeyCache.set(actorUrl, {
    publicKeyHex: publicKeyHex.toLowerCase(),
    expiresAt: Date.now() + ACTOR_KEY_TTL_MS,
  });

  return envelope;
}

export function createSignedActivityPubEnvelope(
  actorUrl: string,
  noteId: string,
  content: string,
  privateKey: Uint8Array | string,
  publicKeyHex: string
): ActivityPubEnvelope {
  const privHex = typeof privateKey === 'string' ? privateKey : bytesToHex(privateKey);
  return createSignedFederatedEnvelope(
    actorUrl,
    { id: noteId, content },
    privHex,
    publicKeyHex
  );
}

/**
 * Cryptographically verifies an ActivityPub envelope's signature using Ed25519 against canonical payload.
 * NEVER trusts self-attested publicKeyHex supplied directly by the incoming envelope as authority.
 */
export function verifyActivityPubSignature(
  envelope: ActivityPubEnvelope,
  trustedPublicKeyHex?: string
): boolean {
  if (!envelope || !envelope.signature || !envelope.object || !envelope.actor) return false;
  const sig = envelope.signature.signatureValue || envelope.signature.value;
  if (!sig) return false;

  // Resolve trusted key: caller-provided, or trusted registry, or cache
  let resolvedKey = trustedPublicKeyHex?.toLowerCase();

  if (!resolvedKey) {
    if (trustedActorKeyRegistry.has(envelope.actor)) {
      resolvedKey = trustedActorKeyRegistry.get(envelope.actor);
    } else if (actorKeyCache.has(envelope.actor)) {
      const cached = actorKeyCache.get(envelope.actor);
      if (cached && Date.now() < cached.expiresAt) {
        resolvedKey = cached.publicKeyHex;
      }
    }
  }

  // Without a trusted or resolved key, reject self-attested key
  if (!resolvedKey) {
    return false;
  }

  // If envelope claims a public key that differs from the canonical resolved key, reject!
  const envelopeClaimedKey = (
    envelope.signature.publicKeyHex ||
    envelope.signature.publicKey?.publicKeyHex
  )?.toLowerCase();
  if (envelopeClaimedKey && envelopeClaimedKey !== resolvedKey) {
    invalidateActorKey(envelope.actor);
    return false;
  }

  // Strictly verify against the single canonical serialized payload
  const canonicalPayload = getCanonicalFederationPayload(envelope);
  if (!canonicalPayload) {
    invalidateActorKey(envelope.actor);
    return false;
  }

  const isValid = verifySignature(sig, canonicalPayload, resolvedKey);
  if (!isValid) {
    invalidateActorKey(envelope.actor);
  }

  return isValid;
}

/**
 * Asynchronously verifies an ActivityPub envelope, resolving the actor key from the network if needed.
 */
export async function verifyActivityPubSignatureAsync(
  envelope: ActivityPubEnvelope,
  trustedPublicKeyHex?: string
): Promise<boolean> {
  if (!envelope || !envelope.actor) return false;

  let resolvedKey = trustedPublicKeyHex;
  if (!resolvedKey) {
    resolvedKey = (await fetchActorPublicKey(envelope.actor)) || undefined;
  }

  return verifyActivityPubSignature(envelope, resolvedKey);
}

// ─── ENDPOINT LOGIC: NODEINFO ────────────────────────────────────────────────

/**
 * Asynchronously queries real counts from D1 or in-memory store for NodeInfo 2.1.
 * Reports actual measured counts or 0; never synthetic or fabricated data.
 */
export async function getNodeInfoAsync(env?: Env): Promise<NodeInfo21> {
  const db = getD1Database(env);
  let postsCount = globalPostsStore.length;
  let usersCount = 0;

  if (db) {
    try {
      const postsRes = await db
        .prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published' OR status IS NULL")
        .first<{ count: number }>();
      if (postsRes && typeof postsRes.count === 'number') {
        postsCount = postsRes.count;
      }
      const usersRes = await db
        .prepare("SELECT COUNT(DISTINCT author_id) as count FROM posts")
        .first<{ count: number }>();
      if (usersRes && typeof usersRes.count === 'number') {
        usersCount = usersRes.count;
      }
    } catch (_) {}
  }

  return {
    version: '2.1',
    software: {
      name: 'urefy',
      version: '1.0.0',
    },
    protocols: ['activitypub', 'aetheris-gossip-v1'],
    usage: {
      users: {
        total: usersCount,
      },
      localPosts: postsCount,
    },
    openRegistrations: true,
  };
}

/**
 * Returns standard NodeInfo 2.1 descriptor matching protocol specifications.
 * Reports actual measured counts or 0; never synthetic or fabricated data.
 */
export function getNodeInfo(env?: Env): NodeInfo21 {
  const postsCount = globalPostsStore.length;
  return {
    version: '2.1',
    software: {
      name: 'urefy',
      version: '1.0.0',
    },
    protocols: ['activitypub', 'aetheris-gossip-v1'],
    usage: {
      users: {
        total: 0,
      },
      localPosts: postsCount,
    },
    openRegistrations: true,
  };
}

// ─── ENDPOINT LOGIC: ACTOR ───────────────────────────────────────────────────

/**
 * Returns the public Ed25519 node actor object in ActivityStreams 2.0 format.
 */
export function getNodeActor(origin: string = 'https://aetheris.mesh', env?: Env): ActivityPubActor {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const actorId = `${cleanOrigin}/api/federation/actor`;
  const rsaPublicKeyPem = typeof env?.FEDERATION_RSA_PUBLIC_KEY_PEM === 'string'
    ? env.FEDERATION_RSA_PUBLIC_KEY_PEM
    : undefined;
  const rsaPrivateKeyPem = typeof env?.FEDERATION_RSA_PRIVATE_KEY_PEM === 'string'
    ? env.FEDERATION_RSA_PRIVATE_KEY_PEM
    : undefined;
  if (Boolean(rsaPublicKeyPem) !== Boolean(rsaPrivateKeyPem)) {
    throw new Error('Both FEDERATION_RSA_PUBLIC_KEY_PEM and FEDERATION_RSA_PRIVATE_KEY_PEM must be configured together');
  }
  const keyPair = rsaPublicKeyPem ? undefined : getNodeKeyPair(env);

  return {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1',
    ],
    id: actorId,
    type: 'Application',
    preferredUsername: 'urefy-node',
    name: 'UREfy Sovereign Node',
    summary: 'Sovereign Zero-Knowledge Hybrid Communication & Archival Node',
    inbox: `${cleanOrigin}/api/federation/inbox`,
    outbox: `${cleanOrigin}/api/federation/outbox`,
    publicKey: {
      id: `${actorId}#main-key`,
      owner: actorId,
      publicKeyPem: rsaPublicKeyPem || ed25519PublicKeyToPem(keyPair!.publicKey),
      ...(keyPair ? { publicKeyHex: keyPair.publicKeyHex } : {}),
    },
    nodeInfo: `${cleanOrigin}/api/federation/nodeinfo`,
    endpoints: {
      sharedInbox: `${cleanOrigin}/api/federation/inbox`,
    },
  };
}

// ─── ENDPOINT LOGIC: INBOX POST ──────────────────────────────────────────────

/**
 * Handles ActivityPub inbox POST: verifies cryptographic signature and ingests pulse.
 */
export async function handleInboxPost(request: Request, env?: Env): Promise<Response> {
  try {
    const isProd = isProductionEnv(env);

    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > 1024 * 1024) {
      return new Response(JSON.stringify({ success: false, error: 'ActivityPub request exceeds 1 MB' }), {
        status: 413, headers: { 'Content-Type': 'application/activity+json' },
      });
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 1024 * 1024) {
      return new Response(JSON.stringify({ success: false, error: 'ActivityPub request exceeds 1 MB' }), {
        status: 413, headers: { 'Content-Type': 'application/activity+json' },
      });
    }
    let envelope: ActivityPubEnvelope;
    try {
      envelope = JSON.parse(rawBody) as ActivityPubEnvelope;
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body payload' }),
        { status: 400, headers: { 'Content-Type': 'application/activity+json' } }
      );
    }

    if (!envelope || !envelope.object || !envelope.actor) {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed ActivityStreams envelope: actor or object missing' }),
        { status: 400, headers: { 'Content-Type': 'application/activity+json' } }
      );
    }

    // Authenticate before routing, including Follow/Delete/Undo. Standard
    // Fediverse HTTP signatures and the versioned UREfy envelope are accepted
    // as alternative authenticated transports.
    let authenticatedByHttp = false;
    const sigHeader = request.headers.get('signature') || request.headers.get('authorization');
    if (sigHeader && sigHeader.includes('keyId=')) {
      const reqUrl = new URL(request.url);
      const httpSigResult = await verifyHttpRequestSignature(
        request.method,
        reqUrl.pathname + reqUrl.search,
        request.headers,
        rawBody,
        async (keyId: string) => {
          let actorUrl = keyId.split('#')[0];
          let res = await fetchActorHttpVerificationKey(actorUrl, !isProd);
          if (!res && actorUrl.includes('/')) {
            const parentUrl = actorUrl.substring(0, actorUrl.lastIndexOf('/'));
            res = await fetchActorHttpVerificationKey(parentUrl, !isProd);
          }
          return res;
        }
      );
      const parsedKeyId = httpSigResult.keyId || '';
      const keyMatchesActor = Boolean(
        parsedKeyId === envelope.actor ||
        parsedKeyId.startsWith(`${envelope.actor}#`) ||
        parsedKeyId.startsWith(`${envelope.actor}/`)
      );
      authenticatedByHttp = Boolean(httpSigResult.valid && keyMatchesActor);
      if (!authenticatedByHttp) {
        return new Response(JSON.stringify({ success: false, error: `HTTP Signature verification failed: ${httpSigResult.error || 'actor/keyId mismatch'}` }), {
          status: 401, headers: { 'Content-Type': 'application/activity+json' },
        });
      }
    }
    let authenticatedByEnvelope = false;
    if (!authenticatedByHttp && envelope.signature) {
      authenticatedByEnvelope = verifyActivityPubSignature(envelope) || await verifyActivityPubSignatureAsync(envelope);
    }
    if (!authenticatedByHttp && !authenticatedByEnvelope) {
      return new Response(JSON.stringify({ success: false, error: 'Cryptographic signature verification failed: a valid HTTP or UREfy federation signature is required' }), {
        status: 401, headers: { 'Content-Type': 'application/activity+json' },
      });
    }

    const object = envelope.object;

    const supportedTypes = new Set(['Create', 'Update', 'Follow', 'Delete', 'Undo', 'Reject']);
    if (!supportedTypes.has(envelope.type)) {
      return new Response(JSON.stringify({ success: false, error: `Unsupported ActivityPub activity type: ${envelope.type}` }), {
        status: 422, headers: { 'Content-Type': 'application/activity+json' },
      });
    }

    // ─── IDEMPOTENT DELIVERY & CONCURRENCY REPLAY SHIELD ───────────────────────
    const activityId = envelope.id || (typeof object === 'object' && object?.id ? `${envelope.type}:${object.id}` : null);
    if (activityId) {
      if (!checkAndRecordInboxActivity(activityId)) {
        if (envelope.type === 'Create' || envelope.type === 'Update') {
          const rawId = `${envelope.actor}:${object?.id || activityId}`;
          const hash = (await sha256Hex(rawId)).substring(0, 16);
          const postId = `fed-${hash}`;
          return new Response(
            JSON.stringify({
              success: true,
              ingested: true,
              duplicate: true,
              postId,
              message: 'External federated pulse already ingested (idempotent)',
              actor: envelope.actor,
            }),
            {
              status: 201,
              headers: {
                'Content-Type': 'application/activity+json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            duplicate: true,
            status: 'already_processed',
            activityId,
            message: 'Activity already processed; duplicate delivery suppressed idempotently',
          }),
          {
            status: 202,
            headers: {
              'Content-Type': 'application/activity+json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      const db = getD1Database(env);
      if (db) {
        try {
          await db.prepare(
            `INSERT INTO activitypub_inbox (id, activity_type, actor, received_at) VALUES (?, ?, ?, ?)`
          ).bind(activityId, envelope.type, envelope.actor || '', Date.now()).run();
        } catch (dbErr: any) {
          const errMsg = dbErr?.message || '';
          if (errMsg.includes('UNIQUE') || errMsg.includes('PRIMARY KEY') || errMsg.includes('SQLITE_CONSTRAINT')) {
            if (envelope.type === 'Create' || envelope.type === 'Update') {
              const rawId = `${envelope.actor}:${object?.id || activityId}`;
              const hash = (await sha256Hex(rawId)).substring(0, 16);
              const postId = `fed-${hash}`;
              return new Response(
                JSON.stringify({
                  success: true,
                  ingested: true,
                  duplicate: true,
                  postId,
                  message: 'External federated pulse already recorded in D1 (idempotent)',
                  actor: envelope.actor,
                }),
                {
                  status: 201,
                  headers: {
                    'Content-Type': 'application/activity+json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                  },
                }
              );
            }

            return new Response(
              JSON.stringify({
                success: true,
                duplicate: true,
                status: 'already_processed',
                activityId,
                message: 'Activity already recorded in D1 ledger; duplicate delivery suppressed',
              }),
              {
                status: 202,
                headers: {
                  'Content-Type': 'application/activity+json; charset=utf-8',
                  'Access-Control-Allow-Origin': '*',
                },
              }
            );
          }
        }
      }
    }

    // ─── STANDARD ACTIVITYPUB ACTIVITY ROUTING ─────────────────────────────────
    const cleanOrigin = new URL(request.url).origin;

    // A. Follow Activity: respond with standard Accept
    if (envelope.type === 'Follow') {
      const localActor = `${cleanOrigin}/api/federation/actor`;
      const followTarget = typeof object === 'string' ? object : object?.id;
      if (followTarget !== localActor) {
        return new Response(JSON.stringify({ success: false, error: 'Follow target does not match this actor' }), {
          status: 403, headers: { 'Content-Type': 'application/activity+json' },
        });
      }
      const acceptEnvelope = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `${cleanOrigin}/api/federation/activities/accept-${Date.now()}`,
        type: 'Accept',
        actor: localActor,
        object: envelope,
      } as ActivityPubEnvelope;
      const remoteInbox = actorKeyCache.get(envelope.actor)?.inbox;
      if (isProd && !remoteInbox) {
        return new Response(JSON.stringify({ success: false, error: 'Remote actor did not publish an inbox' }), {
          status: 502, headers: { 'Content-Type': 'application/activity+json' },
        });
      }
      if (remoteInbox) {
        const rsaPrivateKeyPem = typeof env?.FEDERATION_RSA_PRIVATE_KEY_PEM === 'string'
          ? env.FEDERATION_RSA_PRIVATE_KEY_PEM
          : undefined;
        const delivery = await deliverFederatedPulse(
          remoteInbox,
          acceptEnvelope,
          rsaPrivateKeyPem ? undefined : getNodeKeyPair(env),
          cleanOrigin,
          { allowLocalDev: !isProd, rsaPrivateKeyPem }
        );
        if (!delivery.success && isProd) {
          return new Response(JSON.stringify({ success: false, error: 'Could not deliver signed Accept activity' }), {
            status: 502, headers: { 'Content-Type': 'application/activity+json' },
          });
        }
      }

      // Persist remote follower in D1 database
      const db = getD1Database(env);
      if (db && remoteInbox) {
        try {
          const cached = actorKeyCache.get(envelope.actor);
          await db.prepare(
            `INSERT INTO activitypub_followers (actor, inbox, shared_inbox, public_key_pem, created_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(actor) DO UPDATE SET
               inbox = excluded.inbox,
               shared_inbox = excluded.shared_inbox,
               public_key_pem = excluded.public_key_pem,
               created_at = excluded.created_at`
          ).bind(
            envelope.actor,
            remoteInbox,
            cached?.sharedInbox || null,
            cached?.publicKeyPem || null,
            Date.now()
          ).run();
        } catch (dbErr) {
          console.warn('[ActivityPub Follower Storage Error]', dbErr);
        }
      }

      return new Response(JSON.stringify({ success: true, accepted: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/activity+json; charset=utf-8' },
      });
    }

    // B. Delete Activity: mark federated post deleted
    if (envelope.type === 'Delete') {
      const targetId = typeof object === 'string' ? object : object?.id;
      const db = getD1Database(env);
      if (targetId && db) {
        try {
          const canonicalId = `fed-${(await sha256Hex(`${envelope.actor}:${targetId}`)).substring(0, 16)}`;
          await db.prepare("UPDATE posts SET status = 'deleted' WHERE id = ?")
            .bind(canonicalId)
            .run();
        } catch (_) {}
      }
      return new Response(JSON.stringify({ success: true, status: 'deleted', id: targetId }), {
        status: 200,
        headers: { 'Content-Type': 'application/activity+json; charset=utf-8' },
      });
    }

    // C. Undo / Reject Activity
    if (envelope.type === 'Undo' || envelope.type === 'Reject') {
      if (envelope.type === 'Undo') {
        const undoneObject = envelope.object;
        const undoneType = typeof undoneObject === 'object' && undoneObject ? (undoneObject as any).type : undefined;
        if (undoneType === 'Follow') {
          const db = getD1Database(env);
          if (db) {
            try {
              await db.prepare('DELETE FROM activitypub_followers WHERE actor = ?')
                .bind(envelope.actor)
                .run();
            } catch (dbErr) {
              console.warn('[ActivityPub Undo Follow Error]', dbErr);
            }
          }
        }
      }
      return new Response(JSON.stringify({ success: true, status: 'acknowledged', type: envelope.type }), {
        status: 200,
        headers: { 'Content-Type': 'application/activity+json; charset=utf-8' },
      });
    }

    if (typeof object !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed ActivityStreams envelope: object must be an object' }),
        { status: 400, headers: { 'Content-Type': 'application/activity+json' } }
      );
    }

    if ((envelope.type === 'Create' || envelope.type === 'Update') && object.attributedTo !== envelope.actor) {
      return new Response(
        JSON.stringify({ success: false, error: 'Activity actor does not match object.attributedTo' }),
        { status: 403, headers: { 'Content-Type': 'application/activity+json' } }
      );
    }

    if (envelope.type === 'Create' || envelope.type === 'Update') {
      if (object.type !== 'Note' || typeof object.id !== 'string') {
        return new Response(
          JSON.stringify({ success: false, error: 'Only ActivityStreams Note objects with an HTTPS id are accepted' }),
          { status: 422, headers: { 'Content-Type': 'application/activity+json' } }
        );
      }
      try {
        const actorUrl = new URL(envelope.actor);
        const isUrefyUrn = object.id.startsWith('urn:pulse:');
        const objectUrl = isUrefyUrn ? null : new URL(object.id);
        if (actorUrl.protocol !== 'https:' || (objectUrl && (objectUrl.protocol !== 'https:' || actorUrl.origin !== objectUrl.origin))) {
          throw new Error('origin mismatch');
        }
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: 'Object id must be an actor-owned HTTPS URL or a UREfy urn:pulse identifier' }),
          { status: 403, headers: { 'Content-Type': 'application/activity+json' } }
        );
      }
    }

    // ─── Finding 14: Timestamp Freshness Window ──────────────────────────────
    const now = Date.now();
    if (!object.published) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing published timestamp in object' }),
        { status: 400, headers: { 'Content-Type': 'application/activity+json' } }
      );
    }
    const createdAt = Date.parse(object.published);
    if (isNaN(createdAt)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid published timestamp format' }),
        { status: 400, headers: { 'Content-Type': 'application/activity+json' } }
      );
    }

    // Reject if published is > 10 minutes in future (600,000 ms) or older than 7 days (7 * 86,400,000 ms)
    if (createdAt > now + 600000 || createdAt < now - 7 * 86400000) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Timestamp out of freshness window: published time cannot be more than 10 minutes in future or older than 7 days',
        }),
        { status: 400, headers: { 'Content-Type': 'application/activity+json' } }
      );
    }

    // ─── Finding 1: Cryptographic signature verification ─────────────────────
    // Extract & sanitize note details
    const rawContent = object.content || '';
    if (!rawContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot ingest empty pulse content' }),
        { status: 400, headers: { 'Content-Type': 'application/activity+json' } }
      );
    }
    const content = sanitizeFederatedContent(rawContent).slice(0, 100_000);

    const title = sanitizeFederatedContent(
      object.title || (content.length > 60 ? content.slice(0, 57) + '...' : content)
    ).slice(0, 300);
    let authorFingerprint = 'federated-peer';
    const pubKeyHex =
      envelope.signature?.publicKeyHex ||
      envelope.signature?.publicKey?.publicKeyHex ||
      trustedActorKeyRegistry.get(envelope.actor) ||
      actorKeyCache.get(envelope.actor)?.publicKeyHex;

    if (pubKeyHex) {
      try {
        authorFingerprint = computeFingerprint(hexToBytes(pubKeyHex));
      } catch (_) {
        authorFingerprint = envelope.actor ? envelope.actor.replace(/https?:\/\//, '').slice(0, 12) : 'federated-peer';
      }
    } else if (envelope.actor) {
      authorFingerprint = envelope.actor.replace(/https?:\/\//, '').slice(0, 12);
    }

    // ─── Finding 15: Idempotent Ingestion via Canonical Remote Object ID ─────
    const rawId = `${envelope.actor}:${object.id}`;
    const hash = (await sha256Hex(rawId)).substring(0, 16);
    const postId = `fed-${hash}`;

    const newPost: EdgePost = {
      id: postId,
      channelId: 'pulse-global',
      authorFingerprint,
      authorRole: 'FEDERATED PEER',
      title,
      content,
      flair: 'MICRO-PULSE',
      status: 'published',
      meritVotes: 1,
      userVoted: 0,
      replyCount: 0,
      boostCount: 0,
      createdAt,
      isExpanded: false,
    };

    const db = getD1Database(env);
    if (isProd && !db) {
      return createD1UnavailableResponse();
    }

    // Create is idempotent. Update may mutate only the same canonical actor-owned row.
    if (db) {
      try {
        const conflictAction = envelope.type === 'Update'
          ? `DO UPDATE SET
               title = excluded.title,
               content = excluded.content,
               status = excluded.status,
               created_at = excluded.created_at
             WHERE posts.author_id = excluded.author_id`
          : 'DO NOTHING';
        await db.prepare(
          `INSERT INTO posts (
             id, channel_id, author_id, author_role, title, content, flair,
             merit_votes, user_voted, reply_count, boost_count, status, created_at, is_expanded
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) ${conflictAction}`
        ).bind(
          newPost.id,
          newPost.channelId,
          newPost.authorFingerprint,
          newPost.authorRole,
          newPost.title,
          newPost.content,
          newPost.flair,
          newPost.meritVotes,
          newPost.userVoted,
          newPost.replyCount,
          newPost.boostCount,
          newPost.status,
          newPost.createdAt,
          0
        ).run();
      } catch (err) {
        if (isProd) {
          return new Response(
            JSON.stringify({ success: false, error: 'Database error storing federated post in production' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        console.error('[Federation Edge] D1 insert error:', err);
      }
    }

    if (!isProd) {
      // Ingest into in-memory global store only in development / test, idempotently
      const existingIdx = globalPostsStore.findIndex((p) => p.id === newPost.id);
      if (existingIdx === -1) {
        globalPostsStore.unshift(newPost);
      } else if (envelope.type === 'Update' && globalPostsStore[existingIdx].authorFingerprint === newPost.authorFingerprint) {
        globalPostsStore[existingIdx] = newPost;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ingested: true,
        postId: newPost.id,
        message: 'External federated pulse ingested into sovereign stream',
        actor: envelope.actor,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/activity+json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal error handling inbox post' }),
      { status: 500, headers: { 'Content-Type': 'application/activity+json; charset=utf-8' } }
    );
  }
}

/**
 * Dispatches an ActivityPub envelope to a remote actor's inbox using safeFetch (SSRF Guard)
 * and draft-cavage HTTP Signatures, the format currently deployed by major
 * ActivityPub implementations.
 */
export async function deliverFederatedPulse(
  recipientInboxUrl: string,
  envelope: ActivityPubEnvelope,
  keyPair: KeyPair | undefined,
  origin: string = 'https://aetheris.mesh',
  options?: { allowLocalDev?: boolean; rsaPrivateKeyPem?: string }
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const rawBody = JSON.stringify(envelope);
    const digest = await computeHttpDigest(rawBody);
    const parsedUrl = new URL(recipientInboxUrl);
    const dateStr = new Date().toUTCString();

    const headers: Record<string, string> = {
      Host: parsedUrl.host,
      Date: dateStr,
      Digest: digest,
      'Content-Type': 'application/activity+json',
      Accept: 'application/activity+json, application/ld+json',
    };

    const keyId = `${origin}/api/federation/actor#main-key`;
    const targetPath = parsedUrl.pathname + parsedUrl.search;
    const sigHeader = options?.rsaPrivateKeyPem
      ? await signHttpRequestRsa('POST', targetPath, headers, keyId, options.rsaPrivateKeyPem)
      : keyPair
        ? signHttpRequest('POST', targetPath, headers, keyId, keyPair.privateKeyHex)
        : (() => { throw new Error('No federation signing key configured'); })();
    headers['Signature'] = sigHeader;

    const response = await safeFetch(
      recipientInboxUrl,
      {
        method: 'POST',
        headers,
        body: rawBody,
      },
      {
        allowLocalDev: options?.allowLocalDev,
        timeoutMs: 5000,
        maxSizeBytes: 64 * 1024,
      }
    );

    return {
      success: response.ok,
      status: response.status,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed outbound federation delivery',
    };
  }
}

/**
 * Asynchronously delivers a newly published public post to all remote ActivityPub followers.
 * Gathers unique inboxes (preferring shared_inbox for multi-actor Fediverse instances),
 * creates an ActivityStreams Create(Note) activity, signs with draft-cavage HTTP Signatures,
 * dispatches via SSRF safeFetch guard, and logs delivery attempts in D1 `activitypub_deliveries`.
 */
export async function dispatchOutboundPostFederation(
  env: Env | undefined,
  post: {
    id: string;
    title?: string;
    content: string;
    authorFingerprint?: string;
    authorId?: string;
    createdAt?: number;
    status?: string;
    channelId?: string;
    audience?: string;
    facetId?: string;
  },
  origin: string = 'https://urefy.com',
  options?: { allowLocalDev?: boolean }
): Promise<{ dispatched: number; successful: number; failed: number }> {
  // Only federate published public posts (not private, deleted, community, followers, or drafts)
  if (post.status && post.status !== 'published') {
    return { dispatched: 0, successful: 0, failed: 0 };
  }
  if (post.audience && post.audience !== 'public') {
    return { dispatched: 0, successful: 0, failed: 0 };
  }

  const db = getD1Database(env);
  if (!db) {
    return { dispatched: 0, successful: 0, failed: 0 };
  }

  let followers: Array<{ actor: string; inbox: string; shared_inbox?: string | null }> = [];
  try {
    const res = await db.prepare(
      'SELECT actor, inbox, shared_inbox FROM activitypub_followers'
    ).all<{ actor: string; inbox: string; shared_inbox?: string | null }>();
    if (res && Array.isArray(res.results)) {
      followers = res.results;
    }
  } catch (err) {
    console.warn('[ActivityPub Outbound Query Error]', err);
    return { dispatched: 0, successful: 0, failed: 0 };
  }

  if (followers.length === 0) {
    return { dispatched: 0, successful: 0, failed: 0 };
  }

  // Deduplicate destination inboxes: prefer shared_inbox when available
  const targetInboxes = new Set<string>();
  for (const f of followers) {
    const target = f.shared_inbox || f.inbox;
    if (target) targetInboxes.add(target);
  }

  const cleanOrigin = origin.replace(/\/+$/, '');
  const localActor = `${cleanOrigin}/api/federation/actor`;
  const postUrl = `${cleanOrigin}/p/${post.id}`;
  const publishedIso = new Date(post.createdAt || Date.now()).toISOString();

function escapeActivityHtml(raw: string): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

  const safeTitle = post.title ? escapeActivityHtml(post.title) : '';
  const safeContent = escapeActivityHtml(post.content);
  const noteObject = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: postUrl,
    type: 'Note',
    attributedTo: localActor,
    published: publishedIso,
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`${localActor}/followers`],
    content: safeTitle ? `<strong>${safeTitle}</strong><p>${safeContent}</p>` : `<p>${safeContent}</p>`,
    url: postUrl,
  };

  const createActivity: ActivityPubEnvelope = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${cleanOrigin}/api/federation/activities/create-${post.id}`,
    type: 'Create',
    actor: localActor,
    published: publishedIso,
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`${localActor}/followers`],
    object: noteObject,
  };

  const rsaPrivateKeyPem = typeof env?.FEDERATION_RSA_PRIVATE_KEY_PEM === 'string'
    ? env.FEDERATION_RSA_PRIVATE_KEY_PEM
    : undefined;
  const isProd = isProductionEnv(env);
  const keyPair = rsaPrivateKeyPem ? undefined : getNodeKeyPair(env);

  let successful = 0;
  let failed = 0;

  for (const inboxUrl of targetInboxes) {
    const deliveryId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b: number) => b.toString(16).padStart(2, '0')).join('');
    const now = Date.now();

    // Insert pending delivery ledger record
    try {
      await db.prepare(
        `INSERT INTO activitypub_deliveries (id, post_id, target_inbox, status, attempts, last_attempt_at, created_at)
         VALUES (?, ?, ?, 'pending', 1, ?, ?)`
      ).bind(deliveryId, post.id, inboxUrl, now, now).run();
    } catch (_) {}

    // Deliver via deliverFederatedPulse with draft-cavage signatures and SSRF guard
    const deliveryResult = await deliverFederatedPulse(
      inboxUrl,
      createActivity,
      keyPair,
      cleanOrigin,
      {
        allowLocalDev: options?.allowLocalDev ?? !isProd,
        rsaPrivateKeyPem,
      }
    );

    const isSuccess = deliveryResult.success;
    if (isSuccess) {
      successful++;
    } else {
      failed++;
    }

    // Update delivery record status
    try {
      await db.prepare(
        `UPDATE activitypub_deliveries
         SET status = ?, last_attempt_at = ?, error = ?
         WHERE id = ?`
      ).bind(
        isSuccess ? 'delivered' : 'failed',
        Date.now(),
        deliveryResult.error || (isSuccess ? null : `HTTP status ${deliveryResult.status}`),
        deliveryId
      ).run();
    } catch (_) {}
  }

  return { dispatched: targetInboxes.size, successful, failed };
}

// ─── ENDPOINT LOGIC: OUTBOX GET ──────────────────────────────────────────────

/**
 * Builds the ActivityStreams 2.0 OrderedCollection outbox for public pulses.
 */
export async function getOutboxCollection(
  origin: string,
  env?: Env,
  limit: number = 50,
  offset: number = 0
): Promise<ActivityStreamsOrderedCollection> {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const db = getD1Database(env);
  let posts: EdgePost[] = [];

  if (db) {
    try {
      const res = await db.prepare(
        "SELECT * FROM posts WHERE (status = 'published' OR status IS NULL) ORDER BY created_at DESC LIMIT ? OFFSET ?"
      ).bind(limit, offset).all<EdgePost>();
      if (res && Array.isArray(res.results)) {
        posts = res.results.map((row: any) => ({
          id: row.id,
          channelId: row.channel_id ?? row.channelId ?? 'pulse-global',
          authorFingerprint: row.author_id ?? row.author_fingerprint ?? row.authorFingerprint ?? 'anon-peer',
          authorRole: row.author_role ?? row.authorRole ?? 'MEMBER',
          title: row.title,
          content: row.content,
          flair: row.flair || 'TECH DISCUSSION',
          status: row.status || 'published',
          meritVotes: Number(row.merit_votes ?? row.meritVotes ?? 0),
          replyCount: Number(row.reply_count ?? row.replyCount ?? 0),
          boostCount: Number(row.boost_count ?? row.boostCount ?? 0),
          createdAt: Number(row.created_at ?? row.createdAt ?? Date.now()),
          isExpanded: false,
        }));
      }
    } catch (err) {
      if (isProductionEnv(env)) {
        throw new Error('Database query failed in production environment: ' + (err as any)?.message);
      }
      posts = globalPostsStore.slice(offset, offset + limit);
    }
  } else {
    if (isProductionEnv(env)) {
      throw new Error('D1 Database unavailable. In-memory fallback is disabled in production.');
    }
    posts = globalPostsStore.slice(offset, offset + limit);
  }

  const actorUrl = `${cleanOrigin}/api/federation/actor`;

  const orderedItems = posts.map((post) => {
    const published = new Date(post.createdAt).toISOString();
    const pulseUri = `${cleanOrigin}/api/federation/pulse/${post.id}`;
    return {
      id: pulseUri,
      type: 'Create',
      actor: actorUrl,
      published,
      to: ['https://www.w3.org/ns/activitystreams#Public'],
      object: {
        id: pulseUri,
        type: 'Note',
        attributedTo: actorUrl,
        published,
        content: post.content,
        title: post.title,
        to: ['https://www.w3.org/ns/activitystreams#Public'],
      },
    };
  });

  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${cleanOrigin}/api/federation/outbox`,
    type: 'OrderedCollection',
    totalItems: posts.length,
    orderedItems,
  };
}

/**
 * Handles ActivityStreams outbox request.
 */
export async function handleOutboxGet(request: Request, env?: Env): Promise<Response> {
  const isProd = isProductionEnv(env);
  const db = getD1Database(env);
  if (isProd && !db) {
    return createD1UnavailableResponse();
  }

  const url = new URL(request.url);
  const origin = url.origin || 'https://aetheris.mesh';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  try {
    const outbox = await getOutboxCollection(origin, env, limit, offset);

    return new Response(JSON.stringify(outbox, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/activity+json; charset=utf-8',
        'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    if (isProd) {
      return new Response(JSON.stringify({ error: err?.message || 'Database error in production' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    throw err;
  }
}

// ─── CLOUDFLARE PAGES FUNCTIONS REQUEST DISPATCHERS ──────────────────────────

/**
 * Handles GET /api/federation/* and /.well-known/aetheris-node
 */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const origin = url.origin || 'https://aetheris.mesh';
    const pathname = url.pathname;
    const endpoint = url.searchParams.get('endpoint') || url.searchParams.get('action');

    // 1. NodeInfo 2.1 Descriptor
    if (
      pathname.endsWith('/nodeinfo') ||
      pathname.endsWith('/aetheris-node') ||
      pathname.includes('/.well-known/aetheris-node') ||
      endpoint === 'nodeinfo'
    ) {
      const nodeInfo = await getNodeInfoAsync(context.env);
      return new Response(JSON.stringify(nodeInfo, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; profile="http://nodeinfo.diaspora.software/ns/schema/2.1#"',
          'Cache-Control': 'public, max-age=60',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 2. Public Ed25519 Actor Descriptor
    if (pathname.endsWith('/actor') || endpoint === 'actor') {
      try {
        const actor = getNodeActor(origin, context.env);
        return new Response(JSON.stringify(actor, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/activity+json; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (err: any) {
        if (isProductionEnv(context.env)) {
          return new Response(
            JSON.stringify({ error: err?.message || 'Node private key not configured in production environment' }),
            { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
        throw err;
      }
    }

    // 3. Outbox Public Pulses
    if (pathname.endsWith('/outbox') || endpoint === 'outbox') {
      return handleOutboxGet(context.request, context.env);
    }

    // Default: Return NodeInfo 2.1 descriptor
    const defaultNodeInfo = getNodeInfo(context.env);
    return new Response(JSON.stringify(defaultNodeInfo, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; profile="http://nodeinfo.diaspora.software/ns/schema/2.1#"',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    const isProd = isProductionEnv(context.env);
    const status = isProd && err?.message?.includes('Node private key not configured') ? 503 : 500;
    return new Response(
      JSON.stringify({ error: err?.message || 'Federation Edge GET error' }),
      { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

/**
 * Handles POST /api/federation/inbox
 */
export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  const endpoint = url.searchParams.get('endpoint') || url.searchParams.get('action');

  if (pathname.endsWith('/inbox') || endpoint === 'inbox' || pathname.includes('federation')) {
    return handleInboxPost(context.request, context.env);
  }

  return new Response(JSON.stringify({ error: 'Endpoint Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

/**
 * Generic router for all methods (GET, POST, OPTIONS)
 */
export async function onRequest(context: { request: Request; env?: Env }): Promise<Response> {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Signature, Digest, X-CSRF-Token',
      },
    });
  }
  if (context.request.method === 'POST') {
    return onRequestPost(context);
  }
  return onRequestGet(context);
}
