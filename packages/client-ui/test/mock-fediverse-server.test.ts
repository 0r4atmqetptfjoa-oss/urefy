import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  onRequestGet as handleWebfingerGet,
  type WebFingerResourceDescriptor,
} from '../functions/.well-known/webfinger.js';
import {
  onRequestGet as handleFederationGet,
  onRequestPost as handleFederationPost,
  createSignedActivityPubEnvelope,
  clearTrustedActorKeys,
  type NodeInfo21,
  type ActivityStreamsActor,
} from '../functions/api/federation.js';
import {
  signHttpRequest,
  computeHttpDigest,
} from '../functions/api/_http-signatures.js';
import { generateKeyPair, bytesToHex } from '@aetheris/core-crypto';
import { globalPostsStore } from '../functions/api/_db.js';

/**
 * Mock external Fediverse server (e.g. Mastodon / Lemmy instance).
 */
class MockFediverseServer {
  public domain: string = 'mastodon.social';
  public username: string = 'alice';
  public actorUrl: string;
  public keyId: string;
  public keyPair = generateKeyPair();

  constructor(domain = 'mastodon.social', username = 'alice') {
    this.domain = domain;
    this.username = username;
    this.actorUrl = `https://${this.domain}/users/${this.username}`;
    this.keyId = `${this.actorUrl}#main-key`;
  }

  /**
   * Generates standard ActivityStreams 2.0 Actor document
   */
  public getActorDocument(): any {
    return {
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        'https://w3id.org/security/v1',
      ],
      id: this.actorUrl,
      type: 'Person',
      preferredUsername: this.username,
      name: 'Alice Fediverse',
      inbox: `https://${this.domain}/users/${this.username}/inbox`,
      outbox: `https://${this.domain}/users/${this.username}/outbox`,
      publicKey: {
        id: this.keyId,
        owner: this.actorUrl,
        publicKeyPem: `-----BEGIN PUBLIC KEY-----\n${this.keyPair.publicKeyHex}\n-----END PUBLIC KEY-----`,
        publicKeyHex: this.keyPair.publicKeyHex,
      },
    };
  }

  /**
   * Constructs an ActivityStreams Create(Note) activity envelope
   */
  public createNoteActivity(noteId: string, content: string): any {
    return createSignedActivityPubEnvelope(
      this.actorUrl,
      noteId,
      content,
      this.keyPair.privateKeyHex,
      this.keyPair.publicKeyHex
    );
  }

  /**
   * Crafts an HTTP request with RFC 9421 / draft-cavage HTTP Message Signatures
   */
  public async signAndBuildPostRequest(targetUrl: string, payload: any): Promise<Request> {
    const urlObj = new URL(targetUrl);
    const bodyStr = JSON.stringify(payload);
    const digest = await computeHttpDigest(bodyStr);
    const dateStr = new Date().toUTCString();

    const headers: Record<string, string> = {
      'host': urlObj.host,
      'date': dateStr,
      'digest': digest,
      'content-type': 'application/activity+json',
    };

    const signatureHeader = signHttpRequest(
      'POST',
      urlObj.pathname,
      headers,
      this.keyId,
      this.keyPair.privateKeyHex
    );

    return new Request(targetUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Signature': signatureHeader,
      },
      body: bodyStr,
    });
  }
}

describe('Etapa 5.2: Mock Fediverse Server Full Handshake & Interoperability', () => {
  let mockFediverse: MockFediverseServer;
  const localTargetDomain = 'aetheris.network';

  beforeEach(() => {
    clearTrustedActorKeys();
    mockFediverse = new MockFediverseServer('mastodon.social', 'alice');
    vi.restoreAllMocks();
  });

  describe('1. RFC 7033 WebFinger Discovery Handshake', () => {
    it('handles WebFinger query for urefy-node from external Fediverse instance', async () => {
      const request = new Request(
        `https://${localTargetDomain}/.well-known/webfinger?resource=acct:urefy-node@${localTargetDomain}`
      );
      const response = await handleWebfingerGet({ request });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/jrd+json');

      const descriptor: WebFingerResourceDescriptor = await response.json();
      expect(descriptor.subject).toBe(`acct:urefy-node@${localTargetDomain}`);

      // Verify self link pointing to ActivityPub actor
      const selfLink = descriptor.links.find((l) => l.rel === 'self');
      expect(selfLink).toBeDefined();
      expect(selfLink?.type).toBe('application/activity+json');
      expect(selfLink?.href).toBe(`https://${localTargetDomain}/api/federation/actor`);

      // Verify NodeInfo link
      const nodeinfoLink = descriptor.links.find(
        (l) => l.rel === 'http://nodeinfo.diaspora.software/ns/schema/2.1'
      );
      expect(nodeinfoLink).toBeDefined();
      expect(nodeinfoLink?.href).toContain('/nodeinfo');
    });

    it('rejects WebFinger query missing resource parameter with HTTP 400', async () => {
      const request = new Request(`https://${localTargetDomain}/.well-known/webfinger`);
      const response = await handleWebfingerGet({ request });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing required');
    });
  });

  describe('2. NodeInfo 2.1 Protocol Capability Negotiation', () => {
    it('returns compliant NodeInfo 2.1 metadata declaring activitypub protocol support', async () => {
      const request = new Request(`https://${localTargetDomain}/api/federation/nodeinfo`);
      const response = await handleFederationGet({ request });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const nodeInfo: NodeInfo21 = await response.json();
      expect(nodeInfo.version).toBe('2.1');
      expect(nodeInfo.protocols).toContain('activitypub');
      expect(nodeInfo.protocols).toContain('aetheris-gossip-v1');
      expect(nodeInfo.openRegistrations).toBe(true);
      expect(nodeInfo.software.name).toBe('urefy');
    });
  });

  describe('3. Actor Profile Resolution', () => {
    it('returns valid ActivityStreams 2.0 Actor document with Ed25519 public key', async () => {
      const request = new Request(`https://${localTargetDomain}/api/federation/actor`);
      const response = await handleFederationGet({ request });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/activity+json');

      const actor: ActivityStreamsActor = await response.json();
      expect(actor['@context']).toContain('https://www.w3.org/ns/activitystreams');
      expect(actor.type).toBe('Application');
      expect(actor.inbox).toBe(`https://${localTargetDomain}/api/federation/inbox`);
      expect(actor.outbox).toBe(`https://${localTargetDomain}/api/federation/outbox`);
      expect(actor.publicKey).toBeDefined();
      expect(actor.publicKey.publicKeyPem).toContain('BEGIN PUBLIC KEY');
    });
  });

  describe('4. Inbound Signed Delivery & Sanitization from Mock Mastodon', () => {
    it('accepts and ingests cryptographically signed Note from external Fediverse server', async () => {
      // Mock outbound fetch so that local node can resolve alice's public key from mastodon.social
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.startsWith('https://mastodon.social/users/alice')) {
          return new Response(JSON.stringify(mockFediverse.getActorDocument()), {
            status: 200,
            headers: { 'Content-Type': 'application/activity+json' },
          });
        }
        return new Response('Not Found', { status: 404 });
      });
      vi.stubGlobal('fetch', mockFetch);

      const rawContent = '<p>Hello sovereign mesh from Mastodon! <script>alert("xss")</script><a href="javascript:steal()">Click</a></p>';
      const activity = mockFediverse.createNoteActivity('post-fed-77', rawContent);

      const signedRequest = await mockFediverse.signAndBuildPostRequest(
        `https://${localTargetDomain}/api/federation/inbox`,
        activity
      );

      const initialCount = globalPostsStore.length;
      const response = await handleFederationPost({ request: signedRequest });

      expect([200, 201, 202]).toContain(response.status);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.ingested).toBe(true);
      expect(json.postId).toBeDefined();

      // Verify the post was ingested into store and HTML was sanitized
      expect(globalPostsStore.length).toBeGreaterThan(initialCount);
      const ingested = globalPostsStore.find((p) => p.id === json.postId);
      expect(ingested).toBeDefined();
      expect(ingested?.authorRole).toBe('FEDERATED PEER');
      expect(ingested?.content).not.toContain('<script>');
      expect(ingested?.content).not.toContain('javascript:');
      expect(ingested?.content).toContain('Hello sovereign mesh from Mastodon!');
    });

    it('rejects tampered or forged HTTP Message Signature with HTTP 401', async () => {
      // Create request signed with one key but tampered payload
      const activity = mockFediverse.createNoteActivity('post-tamper-01', 'Valid content');
      const signedRequest = await mockFediverse.signAndBuildPostRequest(
        `https://${localTargetDomain}/api/federation/inbox`,
        activity
      );

      // Tamper with request headers by corrupting the digest
      const tamperedHeaders = new Headers(signedRequest.headers);
      tamperedHeaders.set('digest', 'SHA-256=INVALID_DIGEST_CORRUPTED==');

      const tamperedRequest = new Request(signedRequest.url, {
        method: 'POST',
        headers: tamperedHeaders,
        body: JSON.stringify(activity),
      });

      const response = await handleFederationPost({ request: tamperedRequest });
      expect([400, 401]).toContain(response.status);
    });

    it('handles Follow and Accept activity cycle from external Fediverse instance', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.startsWith('https://mastodon.social/users/alice')) {
          return new Response(JSON.stringify(mockFediverse.getActorDocument()), {
            status: 200,
            headers: { 'Content-Type': 'application/activity+json' },
          });
        }
        return new Response('Not Found', { status: 404 });
      });
      vi.stubGlobal('fetch', mockFetch);

      const followActivity = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `https://${mockFediverse.domain}/users/alice/follows/1`,
        type: 'Follow',
        actor: mockFediverse.actorUrl,
        object: `https://${localTargetDomain}/api/federation/actor`,
      };

      const signedRequest = await mockFediverse.signAndBuildPostRequest(
        `https://${localTargetDomain}/api/federation/inbox`,
        followActivity
      );

      const response = await handleFederationPost({ request: signedRequest });
      if (response.status !== 200 && response.status !== 202) {
        const errJson = await response.clone().json();
        console.error('Follow test failure:', errJson);
      }
      expect([200, 202]).toContain(response.status);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.accepted).toBe(true);
    });
  });

  describe('5. ActivityStreams 2.0 Outbox Collection Export', () => {
    it('serves public pulses in standard ActivityStreams 2.0 OrderedCollection format', async () => {
      const request = new Request(`https://${localTargetDomain}/api/federation/outbox`);
      const response = await handleFederationGet({ request });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/activity+json');

      const outbox = await response.json();
      expect(outbox['@context']).toContain('https://www.w3.org/ns/activitystreams');
      expect(outbox.type).toBe('OrderedCollection');
      expect(typeof outbox.totalItems).toBe('number');
      expect(Array.isArray(outbox.orderedItems)).toBe(true);
    });
  });
});
