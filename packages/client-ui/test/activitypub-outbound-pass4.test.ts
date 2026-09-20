import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  handleInboxPost,
  dispatchOutboundPostFederation,
  actorKeyCache,
  clearActorKeyCache,
  registerTrustedActorKey,
  ActivityPubEnvelope,
} from '../functions/api/federation.js';
import { computeHttpDigest, signHttpRequest } from '../functions/api/_http-signatures.js';
import { generateKeyPair } from '@aetheris/core-crypto';

// In-memory mock D1 database for testing ActivityPub persistence
function createMockD1Database() {
  const followers = new Map<string, { actor: string; inbox: string; shared_inbox?: string | null; public_key_pem?: string | null; created_at: number }>();
  const deliveries = new Map<string, { id: string; post_id: string; target_inbox: string; status: string; attempts: number; last_attempt_at: number; error?: string | null; created_at: number }>();

  return {
    followers,
    deliveries,
    prepare(query: string) {
      const statement = (boundArgs: any[] = []) => ({
        bind(...args: any[]) {
          return statement(args);
        },
        async run() {
          if (query.includes('INSERT INTO activitypub_followers')) {
            const [actor, inbox, shared_inbox, public_key_pem, created_at] = boundArgs;
            followers.set(actor, { actor, inbox, shared_inbox, public_key_pem, created_at });
            return { success: true, meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM activitypub_followers WHERE actor = ?')) {
            const [actor] = boundArgs;
            const existed = followers.delete(actor);
            return { success: true, meta: { changes: existed ? 1 : 0 } };
          }
          if (query.includes('INSERT INTO activitypub_deliveries')) {
            const [id, post_id, target_inbox, attempts, last_attempt_at, created_at] = boundArgs;
            deliveries.set(id, { id, post_id, target_inbox, status: 'pending', attempts, last_attempt_at, created_at });
            return { success: true, meta: { changes: 1 } };
          }
          if (query.includes('UPDATE activitypub_deliveries')) {
            const [status, last_attempt_at, error, id] = boundArgs;
            const record = deliveries.get(id);
            if (record) {
              record.status = status;
              record.last_attempt_at = last_attempt_at;
              record.error = error;
            }
            return { success: true, meta: { changes: 1 } };
          }
          return { success: true };
        },
        async all() {
          if (query.includes('SELECT actor, inbox, shared_inbox FROM activitypub_followers')) {
            return { results: Array.from(followers.values()) };
          }
          return { results: [] };
        },
        async first() {
          return null;
        },
      });
      return statement();
    },
  };
}

describe('ActivityPub Outbound Federation & Follower Persistence (Pass 4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearActorKeyCache();
  });

  it('persists remote follower into D1 database upon receiving valid Follow activity with HTTP signature', async () => {
    const mockDb = createMockD1Database();
    const env = { DB: mockDb as any };

    const remoteActor = 'https://mastodon.social/users/satoshitest';
    const remoteInbox = 'https://mastodon.social/users/satoshitest/inbox';
    const remoteSharedInbox = 'https://mastodon.social/inbox';

    const keyPair = generateKeyPair();
    registerTrustedActorKey(remoteActor, keyPair.publicKeyHex);

    actorKeyCache.set(remoteActor, {
      publicKeyHex: keyPair.publicKeyHex,
      inbox: remoteInbox,
      sharedInbox: remoteSharedInbox,
      expiresAt: Date.now() + 60000,
    });

    // Mock outbound Accept delivery
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const followEnvelope: ActivityPubEnvelope = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `${remoteActor}/activities/follow-1`,
      type: 'Follow',
      actor: remoteActor,
      object: 'https://urefy.com/api/federation/actor',
    };

    const rawBody = JSON.stringify(followEnvelope);
    const digest = await computeHttpDigest(rawBody);
    const dateStr = new Date().toUTCString();

    const headers: Record<string, string> = {
      Host: 'urefy.com',
      Date: dateStr,
      Digest: digest,
      'Content-Type': 'application/activity+json',
    };
    const keyId = `${remoteActor}#main-key`;
    const sigHeader = signHttpRequest('POST', '/api/federation/inbox', headers, keyId, keyPair.privateKeyHex);
    headers['Signature'] = sigHeader;

    const req = new Request('https://urefy.com/api/federation/inbox', {
      method: 'POST',
      headers,
      body: rawBody,
    });

    const response = await handleInboxPost(req, env);
    expect(response.status).toBe(202);

    // Verify follower was stored in D1
    expect(mockDb.followers.has(remoteActor)).toBe(true);
    const stored = mockDb.followers.get(remoteActor);
    expect(stored?.inbox).toBe(remoteInbox);
    expect(stored?.shared_inbox).toBe(remoteSharedInbox);
  });

  it('removes follower from D1 database upon receiving valid Undo(Follow) activity', async () => {
    const mockDb = createMockD1Database();
    const env = { DB: mockDb as any };

    const remoteActor = 'https://mastodon.social/users/unfollower';
    mockDb.followers.set(remoteActor, {
      actor: remoteActor,
      inbox: 'https://mastodon.social/users/unfollower/inbox',
      created_at: Date.now(),
    });
    expect(mockDb.followers.has(remoteActor)).toBe(true);

    const keyPair = generateKeyPair();
    registerTrustedActorKey(remoteActor, keyPair.publicKeyHex);

    actorKeyCache.set(remoteActor, {
      publicKeyHex: keyPair.publicKeyHex,
      inbox: 'https://mastodon.social/users/unfollower/inbox',
      expiresAt: Date.now() + 60000,
    });

    const undoEnvelope: ActivityPubEnvelope = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `${remoteActor}/activities/undo-1`,
      type: 'Undo',
      actor: remoteActor,
      object: {
        type: 'Follow',
        actor: remoteActor,
        object: 'https://urefy.com/api/federation/actor',
      },
    };

    const rawBody = JSON.stringify(undoEnvelope);
    const digest = await computeHttpDigest(rawBody);
    const dateStr = new Date().toUTCString();

    const headers: Record<string, string> = {
      Host: 'urefy.com',
      Date: dateStr,
      Digest: digest,
      'Content-Type': 'application/activity+json',
    };
    const keyId = `${remoteActor}#main-key`;
    const sigHeader = signHttpRequest('POST', '/api/federation/inbox', headers, keyId, keyPair.privateKeyHex);
    headers['Signature'] = sigHeader;

    const req = new Request('https://urefy.com/api/federation/inbox', {
      method: 'POST',
      headers,
      body: rawBody,
    });

    const response = await handleInboxPost(req, env);
    expect(response.status).toBe(200);

    // Verify follower was removed from D1
    expect(mockDb.followers.has(remoteActor)).toBe(false);
  });

  it('dispatchOutboundPostFederation creates Create(Note) and updates delivery status in D1', async () => {
    const mockDb = createMockD1Database();
    const env = { DB: mockDb as any };

    mockDb.followers.set('https://remote.server/users/alice', {
      actor: 'https://remote.server/users/alice',
      inbox: 'https://remote.server/users/alice/inbox',
      shared_inbox: 'https://remote.server/inbox',
      created_at: Date.now(),
    });

    // Mock fetch for deliverFederatedPulse
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const testPost = {
      id: 'test-post-001',
      title: 'Decentralized Sovereign Federation',
      content: 'This post federates outbound to all remote Fediverse followers.',
      authorFingerprint: 'satoshinakamoto',
      status: 'published',
      createdAt: Date.now(),
    };

    const result = await dispatchOutboundPostFederation(env, testPost, 'https://urefy.com', { allowLocalDev: true });

    expect(result.dispatched).toBe(1);
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(0);

    // Verify delivery ledger in D1
    expect(mockDb.deliveries.size).toBe(1);
    const delivery = Array.from(mockDb.deliveries.values())[0];
    expect(delivery.post_id).toBe('test-post-001');
    expect(delivery.target_inbox).toBe('https://remote.server/inbox');
    expect(delivery.status).toBe('delivered');
  });

  it('dispatchOutboundPostFederation does not federate unpublished or draft posts', async () => {
    const mockDb = createMockD1Database();
    const env = { DB: mockDb as any };

    mockDb.followers.set('https://remote.server/users/alice', {
      actor: 'https://remote.server/users/alice',
      inbox: 'https://remote.server/users/alice/inbox',
      created_at: Date.now(),
    });

    const draftPost = {
      id: 'draft-post-001',
      content: 'Private draft',
      status: 'draft',
      createdAt: Date.now(),
    };

    const result = await dispatchOutboundPostFederation(env, draftPost, 'https://urefy.com');
    expect(result.dispatched).toBe(0);
    expect(mockDb.deliveries.size).toBe(0);
  });
});
