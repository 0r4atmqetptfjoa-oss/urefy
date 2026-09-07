import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getNodeInfo,
  getNodeActor,
  ed25519PublicKeyToPem,
  createSignedFederatedEnvelope,
  verifyActivityPubSignature,
  getOutboxCollection,
  handleInboxPost,
  onRequestGet,
  onRequestPost,
  NodeInfo21,
  ActivityPubEnvelope,
} from '../functions/api/federation.js';
import {
  NodeFederationEngine,
  nodeFederationEngine,
  FederatedPeer,
} from '../src/node-federation.js';
import { globalPostsStore } from '../functions/api/_db.js';
import { generateKeyPair, bytesToHex } from '@aetheris/core-crypto';

describe('Sovereign Node Federation Protocol (Item 20)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 1. NODEINFO 2.1 SCHEMA VALIDATION ────────────────────────────────────
  describe('NodeInfo 2.1 Schema Validation', () => {
    it('should generate valid NodeInfo 2.1 descriptor matching specification', () => {
      const nodeInfo = getNodeInfo();

      expect(nodeInfo).toBeDefined();
      expect(nodeInfo.version).toBe('2.1');
      expect(nodeInfo.software).toEqual({
        name: 'aetheris-omni-sphere',
        version: '1.0.0',
      });
      expect(Array.isArray(nodeInfo.protocols)).toBe(true);
      expect(nodeInfo.protocols).toContain('activitypub');
      expect(nodeInfo.protocols).toContain('aetheris-gossip-v1');
      expect(nodeInfo.usage).toBeDefined();
      expect(typeof nodeInfo.usage.users.total).toBe('number');
      expect(nodeInfo.usage.users.total).toBeGreaterThanOrEqual(0);
      expect(typeof nodeInfo.usage.localPosts).toBe('number');
      expect(nodeInfo.usage.localPosts).toBeGreaterThanOrEqual(0);
      expect(nodeInfo.openRegistrations).toBe(true);
    });

    it('should serve NodeInfo 2.1 via GET /.well-known/aetheris-node and /api/federation/nodeinfo', async () => {
      // Test /.well-known/aetheris-node
      const wellKnownReq = new Request('https://aetheris.mesh/.well-known/aetheris-node');
      const wellKnownRes = await onRequestGet({ request: wellKnownReq });

      expect(wellKnownRes.status).toBe(200);
      expect(wellKnownRes.headers.get('Content-Type')).toContain('application/json');
      const wellKnownData: NodeInfo21 = await wellKnownRes.json();
      expect(wellKnownData.version).toBe('2.1');
      expect(wellKnownData.software.name).toBe('aetheris-omni-sphere');
      expect(wellKnownData.protocols).toContain('activitypub');

      // Test /api/federation/nodeinfo
      const nodeInfoReq = new Request('https://aetheris.mesh/api/federation/nodeinfo');
      const nodeInfoRes = await onRequestGet({ request: nodeInfoReq });

      expect(nodeInfoRes.status).toBe(200);
      const nodeInfoData: NodeInfo21 = await nodeInfoRes.json();
      expect(nodeInfoData.version).toBe('2.1');
      expect(nodeInfoData.protocols).toContain('aetheris-gossip-v1');

      // Test query parameter fallback /api/federation?endpoint=nodeinfo
      const paramReq = new Request('https://aetheris.mesh/api/federation?endpoint=nodeinfo');
      const paramRes = await onRequestGet({ request: paramReq });
      expect(paramRes.status).toBe(200);
    });
  });

  // ─── 2. ACTOR DESCRIPTOR GENERATION ───────────────────────────────────────
  describe('Public Ed25519 Actor Descriptor Generation', () => {
    it('should generate valid ActivityStreams 2.0 Actor descriptor with Ed25519 public key', () => {
      const origin = 'https://peer-alpha.aetheris.mesh';
      const actor = getNodeActor(origin);

      expect(actor).toBeDefined();
      expect(actor['@context']).toContain('https://www.w3.org/ns/activitystreams');
      expect(actor['@context']).toContain('https://w3id.org/security/v1');
      expect(actor.id).toBe(`${origin}/api/federation/actor`);
      expect(actor.type).toBe('Application');
      expect(actor.preferredUsername).toBe('aetheris-node');
      expect(actor.name).toBe('Aetheris Sovereign Node');
      expect(actor.inbox).toBe(`${origin}/api/federation/inbox`);
      expect(actor.outbox).toBe(`${origin}/api/federation/outbox`);

      // Public key checks
      expect(actor.publicKey).toBeDefined();
      expect(actor.publicKey.id).toBe(`${origin}/api/federation/actor#main-key`);
      expect(actor.publicKey.owner).toBe(`${origin}/api/federation/actor`);
      expect(actor.publicKey.publicKeyHex).toMatch(/^[0-9a-f]{64}$/i);
      expect(actor.publicKey.publicKeyPem).toMatch(/^-----BEGIN PUBLIC KEY-----\n[\s\S]+\n-----END PUBLIC KEY-----$/);
    });

    it('should encode Ed25519 public key in standard RFC 8410 SPKI PEM format', () => {
      const keyPair = generateKeyPair();
      const pem = ed25519PublicKeyToPem(keyPair.publicKey);

      expect(pem.startsWith('-----BEGIN PUBLIC KEY-----')).toBe(true);
      expect(pem.endsWith('-----END PUBLIC KEY-----')).toBe(true);
      expect(pem.length).toBeGreaterThan(60);
    });

    it('should serve Actor descriptor via GET /api/federation/actor', async () => {
      const actorReq = new Request('https://aetheris.mesh/api/federation/actor');
      const actorRes = await onRequestGet({ request: actorReq });

      expect(actorRes.status).toBe(200);
      expect(actorRes.headers.get('Content-Type')).toContain('application/activity+json');
      const actorData = await actorRes.json();
      expect(actorData.type).toBe('Application');
      expect(actorData.publicKey.publicKeyHex).toBeDefined();
    });
  });

  // ─── 3. ACTIVITYPUB INBOX SIGNATURE VERIFICATION ──────────────────────────
  describe('ActivityPub Inbox Signature Verification', () => {
    it('should cryptographically sign and verify an ActivityStreams envelope using Ed25519', () => {
      const keyPair = generateKeyPair();
      const actorUrl = 'https://peer-bravo.eth/actor';
      const note = {
        id: 'urn:pulse:test-101',
        content: 'Zero-Knowledge Recursive SNARK verification confirmed on sovereign edge.',
        title: 'Recursive SNARK Pulse',
        published: new Date().toISOString(),
      };

      const envelope = createSignedFederatedEnvelope(
        actorUrl,
        note,
        keyPair.privateKeyHex,
        keyPair.publicKeyHex
      );

      expect(envelope).toBeDefined();
      expect(envelope['@context']).toBe('https://www.w3.org/ns/activitystreams');
      expect(envelope.type).toBe('Create');
      expect(envelope.actor).toBe(actorUrl);
      expect(envelope.object.content).toBe(note.content);
      expect(envelope.signature).toBeDefined();
      expect(envelope.signature?.signatureValue).toMatch(/^[0-9a-f]{128}$/i);

      // Signature verification should pass
      const isValid = verifyActivityPubSignature(envelope);
      expect(isValid).toBe(true);
    });

    it('should reject tampered envelope content', () => {
      const keyPair = generateKeyPair();
      const envelope = createSignedFederatedEnvelope(
        'https://peer-charlie.eth/actor',
        { content: 'Original untampered sovereign message.' },
        keyPair.privateKeyHex,
        keyPair.publicKeyHex
      );

      // Tamper with content
      envelope.object.content = 'Tampered malicious payload!';
      const isValid = verifyActivityPubSignature(envelope);
      expect(isValid).toBe(false);
    });

    it('should reject forged public key or corrupted signature', () => {
      const legitKey = generateKeyPair();
      const attackerKey = generateKeyPair();

      const envelope = createSignedFederatedEnvelope(
        'https://legit-peer.eth/actor',
        { content: 'Sovereign payload.' },
        legitKey.privateKeyHex,
        legitKey.publicKeyHex
      );

      // Forged key substitution
      envelope.signature!.publicKeyHex = attackerKey.publicKeyHex;
      expect(verifyActivityPubSignature(envelope)).toBe(false);

      // Corrupted signature
      envelope.signature!.publicKeyHex = legitKey.publicKeyHex;
      envelope.signature!.signatureValue = 'deadbeef'.repeat(16);
      expect(verifyActivityPubSignature(envelope)).toBe(false);
    });

    it('should handle POST /api/federation/inbox with valid signature and ingest pulse', async () => {
      const peerKey = generateKeyPair();
      const envelope = createSignedFederatedEnvelope(
        'https://inbox-test-peer.eth/actor',
        {
          id: `urn:pulse:inbox-${Date.now()}`,
          content: 'Decentralized gossip bridge live ingestion test pulse.',
          title: 'Gossip Bridge Ingestion',
          published: new Date().toISOString(),
        },
        peerKey.privateKeyHex,
        peerKey.publicKeyHex
      );

      const inboxReq = new Request('https://aetheris.mesh/api/federation/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/activity+json' },
        body: JSON.stringify(envelope),
      });

      const inboxRes = await onRequestPost({ request: inboxReq });
      expect(inboxRes.status).toBe(201);
      const resJson = await inboxRes.json();
      expect(resJson.success).toBe(true);
      expect(resJson.ingested).toBe(true);
      expect(resJson.postId).toMatch(/^fed-/);

      // Verify the post exists in global in-memory store
      const ingestedPost = globalPostsStore.find((p) => p.id === resJson.postId);
      expect(ingestedPost).toBeDefined();
      expect(ingestedPost?.content).toBe(envelope.object.content);
      expect(ingestedPost?.authorRole).toBe('FEDERATED PEER');
      expect(ingestedPost?.channelId).toBe('pulse-global');
    });

    it('should reject POST /api/federation/inbox with invalid signature (HTTP 401)', async () => {
      const keyPair = generateKeyPair();
      const envelope = createSignedFederatedEnvelope(
        'https://untrusted-peer.eth/actor',
        { content: 'Unauthorized injection attempt.' },
        keyPair.privateKeyHex,
        keyPair.publicKeyHex
      );

      // Invalidate signature
      envelope.signature!.signatureValue = 'ffff'.repeat(32);

      const inboxReq = new Request('https://aetheris.mesh/api/federation/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/activity+json' },
        body: JSON.stringify(envelope),
      });

      const inboxRes = await onRequestPost({ request: inboxReq });
      expect(inboxRes.status).toBe(401);
      const resJson = await inboxRes.json();
      expect(resJson.success).toBe(false);
      expect(resJson.error).toContain('Cryptographic signature verification failed');
    });
  });

  // ─── 4. PULSE INGESTION & OUTBOX SERIALIZATION ────────────────────────────
  describe('Pulse Ingestion and Outbox Serialization', () => {
    it('should serialize public pulses into ActivityStreams 2.0 OrderedCollection', async () => {
      const outbox = await getOutboxCollection('https://aetheris.mesh', undefined, 10, 0);

      expect(outbox).toBeDefined();
      expect(outbox['@context']).toBe('https://www.w3.org/ns/activitystreams');
      expect(outbox.id).toBe('https://aetheris.mesh/api/federation/outbox');
      expect(outbox.type).toBe('OrderedCollection');
      expect(outbox.totalItems).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(outbox.orderedItems)).toBe(true);

      // Verify structure of first ordered item
      const item = outbox.orderedItems[0];
      expect(item).toBeDefined();
      expect(item.type).toBe('Create');
      expect(item.actor).toBe('https://aetheris.mesh/api/federation/actor');
      expect(item.object).toBeDefined();
      expect(item.object.type).toBe('Note');
      expect(item.object.content).toBeDefined();
      expect(item.to).toContain('https://www.w3.org/ns/activitystreams#Public');
    });

    it('should serve outbox via GET /api/federation/outbox with valid headers', async () => {
      const outboxReq = new Request('https://aetheris.mesh/api/federation/outbox?limit=5');
      const outboxRes = await onRequestGet({ request: outboxReq });

      expect(outboxRes.status).toBe(200);
      expect(outboxRes.headers.get('Content-Type')).toContain('application/activity+json');
      const outboxData = await outboxRes.json();
      expect(outboxData.type).toBe('OrderedCollection');
      expect(outboxData.orderedItems.length).toBeLessThanOrEqual(5);
    });
  });

  // ─── 5. NODE DISCOVERY HANDSHAKE & BROADCAST ENGINE ───────────────────────
  describe('NodeFederationEngine Handshake & Broadcast', () => {
    it('should discover external peer node and add it to trusted peers list', async () => {
      const engine = new NodeFederationEngine();
      const mockDomain = 'peer-delta.aetheris.mesh';

      // Mock global fetch for handshake
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('.well-known/aetheris-node')) {
          return new Response(
            JSON.stringify({
              version: '2.1',
              software: { name: 'aetheris-omni-sphere', version: '1.0.0' },
              protocols: ['activitypub', 'aetheris-gossip-v1'],
              usage: { users: { total: 840 }, localPosts: 310 },
              openRegistrations: true,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url.includes('/api/federation/actor')) {
          return new Response(
            JSON.stringify({
              '@context': 'https://www.w3.org/ns/activitystreams',
              id: `https://${mockDomain}/api/federation/actor`,
              type: 'Application',
              name: 'Bucharest Sovereign Delta Relay',
              inbox: `https://${mockDomain}/api/federation/inbox`,
              outbox: `https://${mockDomain}/api/federation/outbox`,
              publicKey: {
                publicKeyHex: '99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff',
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/activity+json' } }
          );
        }
        return new Response('Not Found', { status: 404 });
      });

      vi.stubGlobal('fetch', mockFetch);

      const nodeInfo = await engine.discoverNode(mockDomain);

      expect(nodeInfo).toBeDefined();
      expect(nodeInfo.version).toBe('2.1');
      expect(nodeInfo.protocols).toContain('activitypub');

      // Check that peer was registered in trustedPeers
      const peer = engine.trustedPeers.find((p) => p.domain === mockDomain);
      expect(peer).toBeDefined();
      expect(peer?.name).toBe('Bucharest Sovereign Delta Relay');
      expect(peer?.inboxUrl).toBe(`https://${mockDomain}/api/federation/inbox`);
      expect(peer?.status).toBe('active');
      expect(peer?.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should broadcast cryptographically signed pulse to federated peer inboxes', async () => {
      const engine = new NodeFederationEngine();

      // Configure trusted peers with known inboxes
      engine.trustedPeers = [
        {
          id: 'test-peer-1',
          domain: 'peer1.mesh',
          name: 'Peer 1',
          version: '1.0.0',
          protocols: ['activitypub'],
          publicKeyHex: '11'.repeat(32),
          actorUrl: 'https://peer1.mesh/actor',
          inboxUrl: 'https://peer1.mesh/inbox',
          outboxUrl: 'https://peer1.mesh/outbox',
          status: 'active',
          latencyMs: 15,
          lastSyncAt: Date.now(),
          totalIngested: 0,
        },
        {
          id: 'test-peer-2',
          domain: 'peer2.mesh',
          name: 'Peer 2',
          version: '1.0.0',
          protocols: ['activitypub'],
          publicKeyHex: '22'.repeat(32),
          actorUrl: 'https://peer2.mesh/actor',
          inboxUrl: 'https://peer2.mesh/inbox',
          outboxUrl: 'https://peer2.mesh/outbox',
          status: 'active',
          latencyMs: 25,
          lastSyncAt: Date.now(),
          totalIngested: 0,
        },
      ];

      const postPayloadsSent: any[] = [];
      const mockFetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        if (opts && opts.method === 'POST') {
          postPayloadsSent.push(JSON.parse(opts.body));
          return new Response(JSON.stringify({ success: true, ingested: true }), { status: 201 });
        }
        return new Response('Not Found', { status: 404 });
      });

      vi.stubGlobal('fetch', mockFetch);

      const broadcastResult = await engine.broadcastFederatedPulse({
        id: 'pulse-broadcast-99',
        title: 'Global Sovereign Mesh Synchronization',
        content: 'Zero-knowledge epoch validated across all connected relays.',
        createdAt: Date.now(),
      });

      expect(broadcastResult).toBeDefined();
      expect(broadcastResult.totalPeers).toBe(2);
      expect(broadcastResult.successful).toBe(2);
      expect(broadcastResult.failed).toBe(0);
      expect(postPayloadsSent.length).toBe(2);

      // Verify that envelopes sent to peer inboxes were signed
      const sentEnvelope = postPayloadsSent[0];
      expect(sentEnvelope.type).toBe('Create');
      expect(sentEnvelope.signature).toBeDefined();
      expect(sentEnvelope.signature.signatureValue).toBeDefined();
      expect(sentEnvelope.signature.publicKeyHex).toBe(engine.keyPair.publicKeyHex);
    });

    it('should render the "🌐 Sovereign Federated Mesh" UI card widget', () => {
      const html = nodeFederationEngine.renderFederatedMeshCard();

      expect(html).toBeDefined();
      expect(html).toContain('Sovereign Federated Mesh');
      expect(html).toContain('ActivityPub 2.0');
      expect(html).toContain('Connect External Node');
      expect(html).toContain('id="federation-node-url-input"');
      expect(html).toContain('id="btn-federation-connect-node"');
      expect(html).toContain('id="btn-federation-sync-all"');
      expect(html).toContain('id="btn-federation-broadcast-test"');
      expect(html).toContain('Inbound Federated Pulse Stream');
      expect(html).toContain('Ed25519 Verified');
    });
  });
});
