import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getNodeInfo,
  getNodeActor,
  getNodeKeyPair,
  createSignedFederatedEnvelope,
  verifyActivityPubSignature,
  verifyActivityPubSignatureAsync,
  getCanonicalFederationPayload,
  fetchActorPublicKey,
  registerTrustedActorKey,
  invalidateActorKey,
  clearActorKeyCache,
  actorKeyCache,
  trustedActorKeyRegistry,
  handleInboxPost,
  onRequestGet,
  onRequestPost,
  ActivityPubEnvelope,
} from '../functions/api/federation.js';
import { globalPostsStore } from '../functions/api/_db.js';
import { generateKeyPair, signMessage, bytesToHex } from '@aetheris/core-crypto';

describe('Federation Protocol Cryptographic Hardening (Findings 1, 13, 14, 15)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearActorKeyCache();
  });

  // ─── 1. FORGED SELF-DECLARED KEY MUST FAIL (Finding 1) ──────────────────────
  describe('Finding 1: Self-Attested Public Key Rejection', () => {
    it('MUST reject envelope when key is self-declared by incoming envelope without trusted authority', async () => {
      const attackerKey = generateKeyPair();
      const victimActor = 'https://sovereign-vault.network/api/federation/actor';

      const published = new Date().toISOString();
      const noteObject = {
        id: 'urn:pulse:forged-attack-001',
        type: 'Note' as const,
        attributedTo: victimActor,
        published,
        content: 'Forged message attempting to impersonate sovereign-vault',
      };

      const canonicalPayload = JSON.stringify({
        actor: victimActor,
        id: noteObject.id,
        type: noteObject.type,
        published: noteObject.published,
        content: noteObject.content,
      });

      const attackerSigHex = bytesToHex(signMessage(canonicalPayload, attackerKey.privateKeyHex));

      const forgedEnvelope: ActivityPubEnvelope = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Create',
        actor: victimActor,
        published,
        object: noteObject,
        signature: {
          type: 'Ed25519Signature2020',
          creator: `${victimActor}#main-key`,
          created: published,
          signatureValue: attackerSigHex,
          publicKeyHex: attackerKey.publicKeyHex, // Self-declared attacker key!
        },
      };

      // 1. Synchronous verification without prior trusted registration MUST fail
      const isValidSync = verifyActivityPubSignature(forgedEnvelope);
      expect(isValidSync).toBe(false);

      // 2. Async resolution without remote actor declaring attacker key MUST fail
      const isValidAsync = await verifyActivityPubSignatureAsync(forgedEnvelope);
      expect(isValidAsync).toBe(false);

      // 3. Inbox POST endpoint MUST reject with HTTP 401
      const req = new Request('https://aetheris.mesh/api/federation/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/activity+json' },
        body: JSON.stringify(forgedEnvelope),
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Cryptographic signature verification failed');
    });

    it('MUST reject when envelope signature claims a different key than the canonical actor key', () => {
      const realKey = generateKeyPair();
      const attackerKey = generateKeyPair();
      const actorUrl = 'https://trusted-peer.eth/actor';

      // Register honest key in trusted registry
      registerTrustedActorKey(actorUrl, realKey.publicKeyHex);

      const envelope = createSignedFederatedEnvelope(
        actorUrl,
        {
          id: 'urn:pulse:test-mismatch',
          content: 'Legitimate message signed by real key',
          published: new Date().toISOString(),
        },
        realKey.privateKeyHex,
        realKey.publicKeyHex
      );

      // Attacker tampers signature's self-declared key to attacker key
      envelope.signature!.publicKeyHex = attackerKey.publicKeyHex;

      const isValid = verifyActivityPubSignature(envelope);
      expect(isValid).toBe(false);
    });

    it('MUST resolve actor public key from network when available and cache with bounded TTL', async () => {
      const remoteKey = generateKeyPair();
      const remoteActorUrl = 'https://remote-relay.mesh/actor';

      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === remoteActorUrl) {
          return new Response(
            JSON.stringify({
              id: remoteActorUrl,
              type: 'Application',
              publicKey: {
                id: `${remoteActorUrl}#main-key`,
                owner: remoteActorUrl,
                publicKeyHex: remoteKey.publicKeyHex,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/activity+json' } }
          );
        }
        return new Response('Not Found', { status: 404 });
      });
      vi.stubGlobal('fetch', mockFetch);

      const resolvedKey = await fetchActorPublicKey(remoteActorUrl, true);
      expect(resolvedKey).toBe(remoteKey.publicKeyHex.toLowerCase());

      // Verify cached entry
      expect(actorKeyCache.has(remoteActorUrl)).toBe(true);
      const cached = actorKeyCache.get(remoteActorUrl);
      expect(cached?.publicKeyHex).toBe(remoteKey.publicKeyHex.toLowerCase());
      expect(cached?.expiresAt).toBeGreaterThan(Date.now());

      // Second fetch should use cache without hitting network
      const secondFetchKey = await fetchActorPublicKey(remoteActorUrl);
      expect(secondFetchKey).toBe(remoteKey.publicKeyHex.toLowerCase());
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('MUST invalidate actor key cache on signature verification failure', () => {
      const legitKey = generateKeyPair();
      const actorUrl = 'https://caching-peer.eth/actor';

      const envelope = createSignedFederatedEnvelope(
        actorUrl,
        { content: 'Original pulse', published: new Date().toISOString() },
        legitKey.privateKeyHex,
        legitKey.publicKeyHex
      );

      expect(actorKeyCache.has(actorUrl)).toBe(true);

      // Corrupt signature to trigger verification failure
      envelope.signature!.signatureValue = 'aa'.repeat(64);

      const isValid = verifyActivityPubSignature(envelope);
      expect(isValid).toBe(false);

      // Cache MUST be invalidated
      expect(actorKeyCache.has(actorUrl)).toBe(false);
    });
  });

  // ─── 2. CANONICAL SERIALIZED PAYLOAD BINDING (Finding 1) ───────────────────
  describe('Finding 1: Canonical Payload Serialization & Tamper Resistance', () => {
    it('MUST bind actor, id, type, published, and content to canonical payload', () => {
      const envelope: ActivityPubEnvelope = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Create',
        actor: 'https://peer-alpha.mesh/actor',
        object: {
          id: 'urn:pulse:123',
          type: 'Note',
          published: '2026-09-06T12:00:00.000Z',
          content: 'Immutable content',
        },
      };

      const payload = getCanonicalFederationPayload(envelope);
      expect(payload).toBe(
        JSON.stringify({
          actor: 'https://peer-alpha.mesh/actor',
          id: 'urn:pulse:123',
          type: 'Note',
          published: '2026-09-06T12:00:00.000Z',
          content: 'Immutable content',
        })
      );
    });

    it('MUST fail verification if actor is modified', () => {
      const key = generateKeyPair();
      const envelope = createSignedFederatedEnvelope(
        'https://actor-a.mesh/actor',
        { id: 'urn:pulse:test-mod', content: 'Testing modifications', published: new Date().toISOString() },
        key.privateKeyHex,
        key.publicKeyHex
      );

      envelope.actor = 'https://actor-b.mesh/actor';
      expect(verifyActivityPubSignature(envelope)).toBe(false);
    });

    it('MUST fail verification if note id is modified', () => {
      const key = generateKeyPair();
      const envelope = createSignedFederatedEnvelope(
        'https://actor-a.mesh/actor',
        { id: 'urn:pulse:test-id-orig', content: 'Testing modifications', published: new Date().toISOString() },
        key.privateKeyHex,
        key.publicKeyHex
      );

      envelope.object.id = 'urn:pulse:test-id-tampered';
      expect(verifyActivityPubSignature(envelope)).toBe(false);
    });

    it('MUST fail verification if content is modified', () => {
      const key = generateKeyPair();
      const envelope = createSignedFederatedEnvelope(
        'https://actor-a.mesh/actor',
        { id: 'urn:pulse:test-content', content: 'Original content', published: new Date().toISOString() },
        key.privateKeyHex,
        key.publicKeyHex
      );

      envelope.object.content = 'Tampered content';
      expect(verifyActivityPubSignature(envelope)).toBe(false);
    });

    it('MUST fail verification if published date is modified', () => {
      const key = generateKeyPair();
      const published = new Date().toISOString();
      const envelope = createSignedFederatedEnvelope(
        'https://actor-a.mesh/actor',
        { id: 'urn:pulse:test-date', content: 'Original content', published },
        key.privateKeyHex,
        key.publicKeyHex
      );

      envelope.object.published = new Date(Date.now() - 10000).toISOString();
      expect(verifyActivityPubSignature(envelope)).toBe(false);
    });
  });

  // ─── 3. TIMESTAMP FRESHNESS WINDOW (Finding 14) ────────────────────────────
  describe('Finding 14: Federation Inbox Timestamp Freshness Window', () => {
    it('MUST reject pulse published more than 10 minutes in the future (HTTP 400)', async () => {
      const peerKey = generateKeyPair();
      const actorUrl = 'https://time-travel-peer.mesh/actor';
      const futureTimestamp = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const envelope = createSignedFederatedEnvelope(
        actorUrl,
        {
          id: 'urn:pulse:future-' + Date.now(),
          content: 'Message from the future',
          published: futureTimestamp,
        },
        peerKey.privateKeyHex,
        peerKey.publicKeyHex
      );

      const req = new Request('https://aetheris.mesh/api/federation/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/activity+json' },
        body: JSON.stringify(envelope),
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Timestamp out of freshness window');
    });

    it('MUST reject pulse older than 7 days (HTTP 400)', async () => {
      const peerKey = generateKeyPair();
      const actorUrl = 'https://ancient-peer.mesh/actor';
      const pastTimestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

      const envelope = createSignedFederatedEnvelope(
        actorUrl,
        {
          id: 'urn:pulse:past-' + Date.now(),
          content: 'Ancient replay pulse',
          published: pastTimestamp,
        },
        peerKey.privateKeyHex,
        peerKey.publicKeyHex
      );

      const req = new Request('https://aetheris.mesh/api/federation/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/activity+json' },
        body: JSON.stringify(envelope),
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Timestamp out of freshness window');
    });

    it('MUST accept pulse with valid timestamp within freshness window (HTTP 201)', async () => {
      const peerKey = generateKeyPair();
      const actorUrl = 'https://fresh-peer.mesh/actor';
      const validTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      const envelope = createSignedFederatedEnvelope(
        actorUrl,
        {
          id: 'urn:pulse:fresh-' + Date.now(),
          content: 'Valid fresh federated pulse',
          published: validTimestamp,
        },
        peerKey.privateKeyHex,
        peerKey.publicKeyHex
      );

      const req = new Request('https://aetheris.mesh/api/federation/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/activity+json' },
        body: JSON.stringify(envelope),
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.ingested).toBe(true);
    });
  });

  // ─── 4. IDEMPOTENT INGESTION VIA CANONICAL REMOTE OBJECT ID (Finding 15) ──
  describe('Finding 15: Idempotent Ingestion via Deterministic Post ID', () => {
    it('MUST ingest repeated deliveries of identical ActivityPub object idempotently (single post)', async () => {
      const peerKey = generateKeyPair();
      const actorUrl = 'https://idempotent-peer.mesh/actor';
      const objectId = 'urn:pulse:idempotent-' + Date.now();
      const published = new Date().toISOString();

      const envelope = createSignedFederatedEnvelope(
        actorUrl,
        {
          id: objectId,
          content: 'Deterministic idempotent pulse ingestion payload',
          published,
        },
        peerKey.privateKeyHex,
        peerKey.publicKeyHex
      );

      const req1 = new Request('https://aetheris.mesh/api/federation/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/activity+json' },
        body: JSON.stringify(envelope),
      });

      // First delivery
      const res1 = await onRequestPost({ request: req1 });
      expect(res1.status).toBe(201);
      const json1 = await res1.json();
      expect(json1.success).toBe(true);
      expect(json1.postId).toMatch(/^fed-[0-9a-f]{16}$/);

      // Second delivery (duplicate ActivityPub delivery)
      const req2 = new Request('https://aetheris.mesh/api/federation/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/activity+json' },
        body: JSON.stringify(envelope),
      });

      const res2 = await onRequestPost({ request: req2 });
      expect(res2.status).toBe(201);
      const json2 = await res2.json();
      expect(json2.success).toBe(true);
      expect(json2.postId).toBe(json1.postId);

      // Verify that in-memory store contains exactly ONE instance of this post
      const matchingPosts = globalPostsStore.filter((p) => p.id === json1.postId);
      expect(matchingPosts.length).toBe(1);
    });
  });

  // ─── 5. DETERMINISTIC NODE KEY FALLBACK REMOVAL (Finding 13) ───────────────
  describe('Finding 13: Node Private Key Enforcement in Production', () => {
    it('MUST throw error when NODE_PRIVATE_KEY is missing in production environment', () => {
      const prodEnv = { ENVIRONMENT: 'production' };
      expect(() => getNodeKeyPair(prodEnv)).toThrow(
        'Node private key not configured in production environment'
      );
    });

    it('MUST return HTTP 503 from GET /api/federation/actor when node key is unconfigured in production', async () => {
      const prodReq = new Request('https://aetheris.mesh/api/federation/actor');
      const res = await onRequestGet({
        request: prodReq,
        env: { ENVIRONMENT: 'production' },
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toContain('Node private key not configured in production environment');
    });

    it('MUST succeed in production when valid NODE_PRIVATE_KEY is configured', async () => {
      const customKey = generateKeyPair();
      const prodReq = new Request('https://aetheris.mesh/api/federation/actor');

      const res = await onRequestGet({
        request: prodReq,
        env: {
          ENVIRONMENT: 'production',
          NODE_PRIVATE_KEY: customKey.privateKeyHex,
        },
      });

      expect(res.status).toBe(200);
      const actor = await res.json();
      expect(actor.type).toBe('Application');
      expect(actor.publicKey.publicKeyHex).toBe(customKey.publicKeyHex);
    });

    it('MUST fallback to DEFAULT_NODE_KEYPAIR only in non-production environments', () => {
      const devEnv = { ENVIRONMENT: 'development' };
      const keyPair = getNodeKeyPair(devEnv);
      expect(keyPair).toBeDefined();
      expect(keyPair.publicKeyHex).toBeDefined();

      const noEnv = getNodeKeyPair(undefined);
      expect(noEnv).toBeDefined();
      expect(noEnv.publicKeyHex).toBe(keyPair.publicKeyHex);
    });
  });
});
