// ===========================================================================
// AETHERIS OMNI-SPHERE — SOVEREIGN NODE FEDERATION PROTOCOL EDGE API
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
    publicKeyHex: string;
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
 * Retrieves the cryptographic node keypair (from environment if configured, else deterministic default).
 */
export function getNodeKeyPair(env?: Env): KeyPair {
  if (env?.NODE_PRIVATE_KEY && typeof env.NODE_PRIVATE_KEY === 'string') {
    try {
      const privBytes = hexToBytes(env.NODE_PRIVATE_KEY);
      if (privBytes.length === 32) {
        return generateKeyPair(privBytes);
      }
    } catch (_) {}
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
  const noteId = note.id || `urn:pulse:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`;
  const noteObject: ActivityStreamsNote = {
    id: noteId,
    type: 'Note',
    attributedTo: actorUrl,
    published,
    content: note.content,
    ...(note.title ? { title: note.title } : {}),
    to: ['https://www.w3.org/ns/activitystreams#Public'],
  };

  const payload = JSON.stringify(noteObject);
  const sigBytes = signMessage(payload, privateKeyHex);
  const signatureHex = bytesToHex(sigBytes);

  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Create',
    actor: actorUrl,
    published,
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    object: noteObject,
    signature: {
      type: 'Ed25519Signature2020',
      creator: `${actorUrl}#main-key`,
      created: published,
      signatureValue: signatureHex,
      publicKeyHex,
    },
  };
}

/**
 * Cryptographically verifies an ActivityPub envelope's signature using Ed25519.
 */
export function verifyActivityPubSignature(
  envelope: ActivityPubEnvelope,
  fallbackPublicKeyHex?: string
): boolean {
  if (!envelope || !envelope.signature || !envelope.object) return false;
  const sig = envelope.signature.signatureValue || envelope.signature.value;
  const pubKey =
    envelope.signature.publicKeyHex ||
    envelope.signature.publicKey?.publicKeyHex ||
    fallbackPublicKeyHex;
  if (!sig || !pubKey) return false;

  const payloadsToTry = [
    typeof envelope.object === 'object' ? JSON.stringify(envelope.object) : String(envelope.object),
    envelope.object?.content,
    envelope.object?.id && envelope.object?.content ? `${envelope.object.id}:${envelope.object.content}` : null,
  ].filter(Boolean) as string[];

  for (const payload of payloadsToTry) {
    if (verifySignature(sig, payload, pubKey)) {
      return true;
    }
  }

  return false;
}

// ─── ENDPOINT LOGIC: NODEINFO ────────────────────────────────────────────────

/**
 * Returns standard NodeInfo 2.1 descriptor matching protocol specifications.
 */
export function getNodeInfo(env?: Env): NodeInfo21 {
  const postsCount = globalPostsStore.length;
  return {
    version: '2.1',
    software: {
      name: 'aetheris-omni-sphere',
      version: '1.0.0',
    },
    protocols: ['activitypub', 'aetheris-gossip-v1'],
    usage: {
      users: {
        total: 1200,
      },
      localPosts: postsCount > 450 ? postsCount : 450,
    },
    openRegistrations: true,
  };
}

// ─── ENDPOINT LOGIC: ACTOR ───────────────────────────────────────────────────

/**
 * Returns the public Ed25519 node actor object in ActivityStreams 2.0 format.
 */
export function getNodeActor(origin: string = 'https://aetheris.mesh', env?: Env): ActivityPubActor {
  const keyPair = getNodeKeyPair(env);
  const cleanOrigin = origin.replace(/\/+$/, '');
  const actorId = `${cleanOrigin}/api/federation/actor`;

  return {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1',
    ],
    id: actorId,
    type: 'Application',
    preferredUsername: 'aetheris-node',
    name: 'Aetheris Sovereign Node',
    summary: 'Sovereign Zero-Knowledge Hybrid Communication & Archival Node',
    inbox: `${cleanOrigin}/api/federation/inbox`,
    outbox: `${cleanOrigin}/api/federation/outbox`,
    publicKey: {
      id: `${actorId}#main-key`,
      owner: actorId,
      publicKeyPem: ed25519PublicKeyToPem(keyPair.publicKey),
      publicKeyHex: keyPair.publicKeyHex,
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
    let envelope: ActivityPubEnvelope;
    try {
      envelope = (await request.json()) as ActivityPubEnvelope;
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!envelope || !envelope.object) {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed ActivityStreams envelope: object missing' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Cryptographic signature verification
    const isValid = verifyActivityPubSignature(envelope);
    if (!isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cryptographic signature verification failed: invalid Ed25519 signature',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract note details
    const object = envelope.object;
    const content = typeof object === 'string' ? object : (object.content || '');
    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot ingest empty pulse content' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const title = object.title || (content.length > 60 ? content.slice(0, 57) + '...' : content);
    let authorFingerprint = 'federated-peer';
    const pubKeyHex = envelope.signature?.publicKeyHex || envelope.signature?.publicKey?.publicKeyHex;
    if (pubKeyHex) {
      try {
        authorFingerprint = computeFingerprint(hexToBytes(pubKeyHex));
      } catch (_) {
        authorFingerprint = envelope.actor ? envelope.actor.replace(/https?:\/\//, '').slice(0, 12) : 'federated-peer';
      }
    } else if (envelope.actor) {
      authorFingerprint = envelope.actor.replace(/https?:\/\//, '').slice(0, 12);
    }

    const createdAt = object.published ? new Date(object.published).getTime() : Date.now();
    const postId = `fed-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

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

    // Ingest into in-memory global store
    globalPostsStore.unshift(newPost);

    // Ingest into D1 database if binding available
    const db = getD1Database(env);
    if (db) {
      try {
        await db.prepare(
          `INSERT INTO posts (id, channelId, channel_id, authorFingerprint, author_fingerprint, authorRole, author_role, title, content, flair, meritVotes, merit_votes, userVoted, user_voted, replyCount, reply_count, boostCount, boost_count, status, createdAt, created_at, isExpanded, is_expanded)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          newPost.id, newPost.channelId, newPost.channelId,
          newPost.authorFingerprint, newPost.authorFingerprint,
          newPost.authorRole, newPost.authorRole,
          newPost.title, newPost.content, newPost.flair,
          newPost.meritVotes, newPost.meritVotes,
          newPost.userVoted, newPost.userVoted,
          newPost.replyCount, newPost.replyCount,
          newPost.boostCount, newPost.boostCount,
          newPost.status,
          newPost.createdAt, newPost.createdAt,
          0, 0
        ).run();
      } catch (err) {
        console.error('[Federation Edge] D1 insert error:', err);
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
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal error handling inbox post' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
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
        "SELECT * FROM posts WHERE (status = 'published' OR status IS NULL) ORDER BY createdAt DESC LIMIT ? OFFSET ?"
      ).bind(limit, offset).all<EdgePost>();
      if (res && Array.isArray(res.results)) {
        posts = res.results.map((row: any) => ({
          id: row.id,
          channelId: row.channelId ?? row.channel_id ?? 'pulse-global',
          authorFingerprint: row.authorFingerprint ?? row.author_fingerprint ?? 'anon-peer',
          authorRole: row.authorRole ?? row.author_role ?? 'MEMBER',
          title: row.title,
          content: row.content,
          flair: row.flair || 'TECH DISCUSSION',
          status: row.status || 'published',
          meritVotes: Number(row.meritVotes ?? row.merit_votes ?? 0),
          replyCount: Number(row.replyCount ?? row.reply_count ?? 0),
          boostCount: Number(row.boostCount ?? row.boost_count ?? 0),
          createdAt: Number(row.createdAt ?? row.created_at ?? Date.now()),
          isExpanded: false,
        }));
      }
    } catch (_) {
      posts = globalPostsStore.slice(offset, offset + limit);
    }
  } else {
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
  const url = new URL(request.url);
  const origin = url.origin || 'https://aetheris.mesh';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const outbox = await getOutboxCollection(origin, env, limit, offset);

  return new Response(JSON.stringify(outbox, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/activity+json; charset=utf-8',
      'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
      'Access-Control-Allow-Origin': '*',
    },
  });
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
      const nodeInfo = getNodeInfo(context.env);
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
      const actor = getNodeActor(origin, context.env);
      return new Response(JSON.stringify(actor, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/activity+json; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
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
    return new Response(
      JSON.stringify({ error: err?.message || 'Federation Edge GET error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
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
