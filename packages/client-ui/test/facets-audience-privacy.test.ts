import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequestGet as onPostsGet, onRequestPost as onPostsPost } from '../functions/api/posts.js';
import { onRequestGet as onSinglePostGet } from '../functions/api/posts/[id].js';
import { onRequestGet as onCommentsGet, onRequestPost as onCommentsPost } from '../functions/api/comments.js';
import {
  globalPostsStore,
  globalFacetsStore,
  globalFacetFollowsStore,
  globalFacetMembersStore,
  globalCommentsStore,
} from '../functions/api/_db.js';
import { createSovereignIdentity, createSignedEnvelope } from '@aetheris/core-crypto';
import { resetReplayNonceCache } from '../functions/api/_auth.js';

describe('Facet Audience Privacy & Access Control Enforcement', () => {
  let alice: ReturnType<typeof createSovereignIdentity>;
  let bob: ReturnType<typeof createSovereignIdentity>;
  let eve: ReturnType<typeof createSovereignIdentity>;

  beforeEach(() => {
    globalPostsStore.length = 0;
    globalFacetsStore.length = 0;
    globalFacetFollowsStore.length = 0;
    globalFacetMembersStore.length = 0;
    globalCommentsStore.length = 0;
    resetReplayNonceCache();

    alice = createSovereignIdentity({ capabilities: ['*'] });
    bob = createSovereignIdentity({ capabilities: ['*'] });
    eve = createSovereignIdentity({ capabilities: ['*'] });

    // Seed Alice's facets
    globalFacetsStore.push(
      {
        id: 'facet-alice-main',
        ownerFingerprint: alice.identity.fingerprint,
        handle: 'alice_main',
        displayName: 'Alice Main',
        visibility: 'public',
        isDefault: true,
        isPubliclyLinked: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'facet-alice-secret',
        ownerFingerprint: alice.identity.fingerprint,
        handle: 'alice_secret',
        displayName: 'Alice Secret Dev',
        visibility: 'contextual',
        isDefault: false,
        isPubliclyLinked: false,
        createdAt: 1001,
        updatedAt: 1001,
      }
    );

    // Seed Bob's facet
    globalFacetsStore.push({
      id: 'facet-bob-main',
      ownerFingerprint: bob.identity.fingerprint,
      handle: 'bob_dev',
      displayName: 'Bob Dev',
      visibility: 'public',
      isDefault: true,
      isPubliclyLinked: false,
      createdAt: 2000,
      updatedAt: 2000,
    });
  });

  function createSignedPostRequest(payload: any, identityKeySet: any) {
    const envelope = createSignedEnvelope(payload, identityKeySet);
    return new Request('https://urefy.com/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
  }

  function createSignedCommentRequest(payload: any, identityKeySet: any) {
    const envelope = createSignedEnvelope(payload, identityKeySet);
    return new Request('https://urefy.com/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
  }

  describe('1. Post Creation & Facet Ownership Validation', () => {
    it('creates post attributed to specified owned facet', async () => {
      const res = await onPostsPost({
        request: createSignedPostRequest({
          title: 'Alice Secret Post',
          content: 'Secret gamedev notes',
          facetId: 'facet-alice-secret',
          audience: 'followers',
        }, alice),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.post.facetId).toBe('facet-alice-secret');
      expect(json.post.audience).toBe('followers');
      expect(json.post.authorDisplayName).toBe('Alice Secret Dev');
      expect(json.post.authorHandle).toBe('alice_secret');
    });

    it('rejects post creation if caller tries to post as an unowned facet', async () => {
      // Eve attempts to post as Alice's secret facet
      const res = await onPostsPost({
        request: createSignedPostRequest({
          title: 'Impersonation Post',
          content: 'Malicious content',
          facetId: 'facet-alice-secret',
          audience: 'public',
        }, eve),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('You do not own the specified Facet');
      expect(globalPostsStore.length).toBe(0);
    });
  });

  describe('2. Audience Privacy on Posts Feed (/api/posts)', () => {
    beforeEach(async () => {
      // Alice's main facet is a member of crypto-research
      globalFacetMembersStore.push({
        communityId: 'crypto-research',
        facetId: 'facet-alice-main',
        role: 'member',
        joinedAt: Date.now(),
      });

      // Create 3 posts by Alice: public, community, followers
      await onPostsPost({
        request: createSignedPostRequest({
          id: 'post-pub',
          title: 'Public Announcement',
          content: 'Everyone can see this',
          facetId: 'facet-alice-main',
          audience: 'public',
        }, alice),
      });

      await onPostsPost({
        request: createSignedPostRequest({
          id: 'post-comm',
          channelId: 'crypto-research',
          title: 'Community Exclusive Alpha',
          content: 'Only for crypto-research members',
          facetId: 'facet-alice-main',
          audience: 'community',
        }, alice),
      });

      await onPostsPost({
        request: createSignedPostRequest({
          id: 'post-followers',
          title: 'Followers Only Notes',
          content: 'Only for facet-alice-main followers',
          facetId: 'facet-alice-main',
          audience: 'followers',
        }, alice),
      });
    });

    it('anonymous public feed only receives public posts', async () => {
      const res = await onPostsGet({
        request: new Request('https://urefy.com/api/posts'),
      });
      const data = await res.json();
      expect(data.posts.length).toBe(1);
      expect(data.posts[0].id).toBe('post-pub');
    });

    it('author sees all their own posts regardless of audience', async () => {
      const res = await onPostsGet({
        request: new Request('https://urefy.com/api/posts', {
          headers: { 'X-User-Fingerprint': alice.identity.fingerprint },
        }),
      });
      const data = await res.json();
      expect(data.posts.length).toBe(3);
      const ids = data.posts.map((p: any) => p.id);
      expect(ids).toContain('post-pub');
      expect(ids).toContain('post-comm');
      expect(ids).toContain('post-followers');
    });

    it('non-member / non-follower (Bob) only sees public post', async () => {
      const res = await onPostsGet({
        request: new Request('https://urefy.com/api/posts', {
          headers: { 'X-User-Fingerprint': bob.identity.fingerprint },
        }),
      });
      const data = await res.json();
      expect(data.posts.length).toBe(1);
      expect(data.posts[0].id).toBe('post-pub');
    });

    it('member of community sees community post in addition to public', async () => {
      // Bob joins crypto-research community
      globalFacetMembersStore.push({
        communityId: 'crypto-research',
        facetId: 'facet-bob-main',
        role: 'member',
        joinedAt: Date.now(),
      });

      const res = await onPostsGet({
        request: new Request('https://urefy.com/api/posts', {
          headers: { 'X-User-Fingerprint': bob.identity.fingerprint },
        }),
      });
      const data = await res.json();
      const ids = data.posts.map((p: any) => p.id);
      expect(ids).toContain('post-pub');
      expect(ids).toContain('post-comm');
      expect(ids).not.toContain('post-followers'); // still does not follow Alice
    });

    it('follower of facet sees followers post in addition to public', async () => {
      // Bob follows Alice's main facet
      globalFacetFollowsStore.push({
        followerFacetId: 'facet-bob-main',
        followingFacetId: 'facet-alice-main',
        createdAt: Date.now(),
      });

      const res = await onPostsGet({
        request: new Request('https://urefy.com/api/posts', {
          headers: { 'X-User-Fingerprint': bob.identity.fingerprint },
        }),
      });
      const data = await res.json();
      const ids = data.posts.map((p: any) => p.id);
      expect(ids).toContain('post-pub');
      expect(ids).toContain('post-followers');
      expect(ids).not.toContain('post-comm'); // not a community member
    });
  });

  describe('3. Single Post Access & Crawler Leak Prevention (/api/posts/:id)', () => {
    beforeEach(async () => {
      globalFacetMembersStore.push({
        communityId: 'private-guild',
        facetId: 'facet-alice-main',
        role: 'member',
        joinedAt: Date.now(),
      });

      await onPostsPost({
        request: createSignedPostRequest({
          id: 'post-secret-community',
          channelId: 'private-guild',
          title: 'Secret Guild Post',
          content: 'Confidential strategy discussion',
          facetId: 'facet-alice-main',
          audience: 'community',
        }, alice),
      });
    });

    it('denies anonymous access to community post with 404', async () => {
      const res = await onSinglePostGet({
        request: new Request('https://urefy.com/api/posts/post-secret-community'),
        params: { id: 'post-secret-community' },
      });
      expect(res.status).toBe(404);
    });

    it('denies crawlers and direct browser visits with 404 and zero content leakage', async () => {
      // Twitter / Discord crawler
      const crawlerReq = new Request('https://urefy.com/api/posts/post-secret-community', {
        headers: {
          'User-Agent': 'Twitterbot/1.0',
          'Accept': 'text/html',
        },
      });
      const crawlerRes = await onSinglePostGet({
        request: crawlerReq,
        params: { id: 'post-secret-community' },
      });
      expect(crawlerRes.status).toBe(404);
      const text = await crawlerRes.text();
      expect(text).not.toContain('Confidential strategy discussion');
      expect(text).not.toContain('Secret Guild Post');
    });

    it('allows community member to view single post', async () => {
      globalFacetMembersStore.push({
        communityId: 'private-guild',
        facetId: 'facet-bob-main',
        role: 'member',
        joinedAt: Date.now(),
      });

      const res = await onSinglePostGet({
        request: new Request('https://urefy.com/api/posts/post-secret-community', {
          headers: { 'X-User-Fingerprint': bob.identity.fingerprint },
        }),
        params: { id: 'post-secret-community' },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.post.title).toBe('Secret Guild Post');
    });
  });

  describe('4. Comments Audience Isolation', () => {
    beforeEach(async () => {
      await onPostsPost({
        request: createSignedPostRequest({
          id: 'post-followers-only',
          title: 'Followers Only Thread',
          content: 'Topic discussion',
          facetId: 'facet-alice-main',
          audience: 'followers',
        }, alice),
      });

      await onCommentsPost({
        request: createSignedCommentRequest({
          action: 'create-comment',
          postId: 'post-followers-only',
          content: 'Alice exclusive comment',
          facetId: 'facet-alice-main',
        }, alice),
      });
    });

    it('denies comments fetch on private post to non-followers', async () => {
      const res = await onCommentsGet({
        request: new Request('https://urefy.com/api/comments?postId=post-followers-only', {
          headers: { 'X-User-Fingerprint': bob.identity.fingerprint },
        }),
      });
      expect(res.status).toBe(404);
    });

    it('allows comments fetch on private post to authorized followers', async () => {
      globalFacetFollowsStore.push({
        followerFacetId: 'facet-bob-main',
        followingFacetId: 'facet-alice-main',
        createdAt: Date.now(),
      });

      const res = await onCommentsGet({
        request: new Request('https://urefy.com/api/comments?postId=post-followers-only', {
          headers: { 'X-User-Fingerprint': bob.identity.fingerprint },
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.comments.length).toBe(1);
      expect(json.comments[0].content).toBe('Alice exclusive comment');
    });

    it('rejects commenting with an unowned facetId', async () => {
      const res = await onCommentsPost({
        request: createSignedCommentRequest({
          action: 'create-comment',
          postId: 'post-followers-only',
          content: 'Impersonated comment',
          facetId: 'facet-alice-main',
        }, eve),
      });
      expect(res.status).toBe(403);
    });
  });
});
