import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSovereignIdentity,
  createSignedEnvelope,
} from '@aetheris/core-crypto';
import {
  globalPostsStore,
  globalFacetsStore,
  globalFacetFollowsStore,
  globalFacetMembersStore,
  globalCommentsStore,
  globalProfilesStore,
  globalBlocksStore,
  globalFollowsStore,
  globalCommunityMembersStore,
} from '../functions/api/_db.js';
import { onRequestGet as getPosts, onRequestPost as createPost } from '../functions/api/posts.js';
import { onRequestGet as getPostById } from '../functions/api/posts/[id].js';
import { onRequestGet as getComments, onRequestPost as createComment } from '../functions/api/comments.js';
import { onRequestPost as handleFollow } from '../functions/api/follows.js';
import { onRequestGet as getFacets, onRequestPost as handleFacetAction } from '../functions/api/facets.js';
import { onRequestGet as search } from '../functions/api/search.js';
import { resetReplayNonceCache } from '../functions/api/_auth.js';

describe('Sovereign Contexts / Facets: Phase 1 Final Privacy & Truth Lock', () => {
  const aliceIdentity = createSovereignIdentity({
    capabilities: ['post:create', 'post:vote', 'facet:manage', 'user:follow', '*'],
  });
  const bobIdentity = createSovereignIdentity({
    capabilities: ['post:create', 'post:vote', 'facet:manage', 'user:follow', '*'],
  });
  const aliceRoot = aliceIdentity.identity.fingerprint;
  const bobRoot = bobIdentity.identity.fingerprint;

  const aliceGameDevFacet = {
    id: 'fct-alice-gamedev-01',
    ownerFingerprint: aliceRoot,
    handle: 'alice_games',
    displayName: 'Alice GameDev',
    bio: 'Building indie engines',
    visibility: 'public' as const,
    status: 'active' as const,
    isDefault: true,
    isPubliclyLinked: false,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const alicePhotoFacet = {
    id: 'fct-alice-photo-02',
    ownerFingerprint: aliceRoot,
    handle: 'alice_photo',
    displayName: 'Alice Photography',
    bio: '35mm film captures',
    visibility: 'public' as const,
    status: 'active' as const,
    isDefault: false,
    isPubliclyLinked: false,
    createdAt: 2000,
    updatedAt: 2000,
  };

  const bobMusicFacet = {
    id: 'fct-bob-music-01',
    ownerFingerprint: bobRoot,
    handle: 'bob_synth',
    displayName: 'Bob Modular',
    bio: 'Analog modular synths',
    visibility: 'public' as const,
    status: 'active' as const,
    isDefault: true,
    isPubliclyLinked: false,
    createdAt: 3000,
    updatedAt: 3000,
  };

  beforeEach(() => {
    resetReplayNonceCache();

    // Reset edge isolate stores
    globalPostsStore.length = 0;
    globalFacetsStore.length = 0;
    globalFacetFollowsStore.length = 0;
    globalFacetMembersStore.length = 0;
    globalCommentsStore.length = 0;
    globalProfilesStore.length = 0;
    globalBlocksStore.length = 0;
    globalFollowsStore.length = 0;
    globalCommunityMembersStore.length = 0;

    globalFacetsStore.push(
      { ...aliceGameDevFacet },
      { ...alicePhotoFacet },
      { ...bobMusicFacet }
    );

    globalProfilesStore.push(
      {
        userId: aliceRoot,
        displayName: 'Alice Sovereign Root',
        handle: 'alice_root',
        bio: 'Private root persona',
        createdAt: 500,
      },
      {
        userId: bobRoot,
        displayName: 'Bob Sovereign Root',
        handle: 'bob_root',
        bio: 'Private root persona',
        createdAt: 600,
      }
    );
  });

  describe('1. Cross-Facet Authorization & Community Containment', () => {
    it('rejects post creation with community audience if facet is not a member', async () => {
      // Alice/GameDev joins c/gamedev, but Alice/Photo does NOT
      globalFacetMembersStore.push({
        facetId: aliceGameDevFacet.id,
        communityId: 'c/gamedev',
        role: 'member',
        joinedAt: 1000,
      });

      const envelope = createSignedEnvelope(
        {
          authorFingerprint: aliceRoot,
          facetId: alicePhotoFacet.id,
          channelId: 'c/gamedev',
          audience: 'community',
          title: 'Photo in GameDev Community',
          content: 'Should be rejected',
        },
        aliceIdentity
      );

      const postReq = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await createPost({ request: postReq });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('is not an authorized member of community c/gamedev');
    });

    it('permits post creation when posting facet is a legitimate member', async () => {
      globalFacetMembersStore.push({
        facetId: aliceGameDevFacet.id,
        communityId: 'c/gamedev',
        role: 'member',
        joinedAt: 1000,
      });

      const envelope = createSignedEnvelope(
        {
          authorFingerprint: aliceRoot,
          facetId: aliceGameDevFacet.id,
          channelId: 'c/gamedev',
          audience: 'community',
          title: 'Shader compilation optimization in WebGPU',
          content: 'WGSL tips for high frame rate compute passes.',
        },
        aliceIdentity
      );

      const postReq = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await createPost({ request: postReq });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.post.facetId).toBe(aliceGameDevFacet.id);
      expect(json.post.audience).toBe('community');
    });

    it('rejects reading community posts when querying with non-member facet', async () => {
      // Seed a community post
      globalPostsStore.push({
        id: 'post-gamedev-secrets',
        channelId: 'c/gamedev',
        authorFingerprint: aliceRoot,
        facetId: aliceGameDevFacet.id,
        audience: 'community',
        title: 'Confidential Game Roadmap',
        content: 'Exclusive shader blueprints',
        meritVotes: 5,
        replyCount: 0,
        boostCount: 0,
        createdAt: 2000,
        status: 'published',
      });

      // Bob's music facet is NOT in c/gamedev
      const readReq = new Request('https://urefy.com/api/posts?channelId=c/gamedev', {
        headers: {
          'X-User-Fingerprint': bobRoot,
          'X-Facet-Id': bobMusicFacet.id,
        },
      });

      const res = await getPosts({ request: readReq });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.posts.find((p: any) => p.id === 'post-gamedev-secrets')).toBeUndefined();
    });
  });

  describe('2. Comment Authorization & Audience Inheritance', () => {
    beforeEach(() => {
      globalPostsStore.push({
        id: 'post-secret-dev',
        channelId: 'c/gamedev',
        authorFingerprint: aliceRoot,
        facetId: aliceGameDevFacet.id,
        audience: 'community',
        title: 'Alpha Testing Feedback',
        content: 'Members only feedback thread',
        meritVotes: 10,
        replyCount: 0,
        boostCount: 0,
        createdAt: 1000,
        status: 'published',
      });
    });

    it('rejects comment if commenter facet is not a member of the post community', async () => {
      const envelope = createSignedEnvelope(
        {
          action: 'create-comment',
          postId: 'post-secret-dev',
          content: 'I want to comment from my music facet',
          facetId: bobMusicFacet.id,
        },
        bobIdentity
      );

      const envelopeReq = new Request('https://urefy.com/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await createComment({ request: envelopeReq });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('is not an authorized member of community c/gamedev');
    });

    it('permits comment when facet joins the community', async () => {
      globalFacetMembersStore.push({
        facetId: bobMusicFacet.id,
        communityId: 'c/gamedev',
        role: 'member',
        joinedAt: 1500,
      });

      const envelope = createSignedEnvelope(
        {
          action: 'create-comment',
          postId: 'post-secret-dev',
          content: 'Audio engine looks very solid!',
          facetId: bobMusicFacet.id,
        },
        bobIdentity
      );

      const envelopeReq = new Request('https://urefy.com/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await createComment({ request: envelopeReq });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.comment.authorDisplayName).toBe('Bob Modular');
      expect(json.comment.facetId).toBe(bobMusicFacet.id);
    });
  });

  describe('3. Person-Level Block Bypass Prevention', () => {
    it('prevents a user from following their own facet or identity', async () => {
      const envelope = createSignedEnvelope(
        {
          action: 'follow',
          followerFacetId: alicePhotoFacet.id,
          followingFacetId: aliceGameDevFacet.id,
        },
        aliceIdentity
      );

      const selfFollowReq = new Request('https://urefy.com/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const selfRes = await handleFollow({ request: selfFollowReq });
      expect(selfRes.status).toBe(400);
      const selfJson = await selfRes.json();
      expect(selfJson.error).toContain('Cannot follow your own Facet or identity');
    });

    it('rejects follow attempt when following target is an inactive or deleted facet', async () => {
      const f = globalFacetsStore.find(x => x.id === alicePhotoFacet.id);
      if (f) f.status = 'deleted';

      const envelope = createSignedEnvelope(
        {
          action: 'follow',
          followerFacetId: bobMusicFacet.id,
          followingFacetId: alicePhotoFacet.id,
        },
        bobIdentity
      );

      const followReq = new Request('https://urefy.com/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handleFollow({ request: followReq });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain('Target Facet not found or is no longer active');
    });
  });

  describe('4. Facet Deletion Lifecycle & Attribution Protection', () => {
    it('soft deletes facet, sets status to deleted, and preserves attribution as [Deleted Context] without root leak', async () => {
      globalPostsStore.push({
        id: 'post-alice-photo-01',
        channelId: 'pulse-global',
        authorFingerprint: aliceRoot,
        facetId: alicePhotoFacet.id,
        authorDisplayName: alicePhotoFacet.displayName,
        authorHandle: alicePhotoFacet.handle,
        audience: 'public',
        title: 'Sunset in the Mountains',
        content: '35mm Kodak Portra 400 scan',
        meritVotes: 42,
        replyCount: 0,
        boostCount: 0,
        createdAt: 2000,
        status: 'published',
      });

      const envelope = createSignedEnvelope(
        {
          action: 'delete',
          facetId: alicePhotoFacet.id,
        },
        aliceIdentity
      );

      const deleteReq = new Request('https://urefy.com/api/facets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const delRes = await handleFacetAction({ request: deleteReq });
      expect(delRes.status).toBe(200);
      const delJson = await delRes.json();
      expect(delJson.success).toBe(true);

      // Verify facet record is soft-deleted
      const deletedFacet = globalFacetsStore.find(f => f.id === alicePhotoFacet.id);
      expect(deletedFacet?.status).toBe('deleted');
      expect(deletedFacet?.displayName).toBe('[Deleted Context]');

      // Now query historical post: attribution must be [Deleted Context] and NEVER 'Alice Sovereign Root'
      const postReq = new Request('https://urefy.com/api/posts');
      const getRes = await getPosts({ request: postReq });
      const getJson = await getRes.json();
      const p = getJson.posts.find((x: any) => x.id === 'post-alice-photo-01');

      expect(p).toBeDefined();
      expect(p.authorDisplayName).toBe('[Deleted Context]');
      expect(p.authorHandle).toBeUndefined();
      expect(p.authorDisplayName).not.toBe('Alice Sovereign Root');
      expect(p.authorFingerprint).toBe(alicePhotoFacet.id);
    });

    it('unauthenticated callers receive 404 when querying deleted facet directly', async () => {
      const f = globalFacetsStore.find(x => x.id === alicePhotoFacet.id);
      if (f) f.status = 'deleted';

      const queryReq = new Request(`https://urefy.com/api/facets?id=${alicePhotoFacet.id}`);
      const res = await getFacets({ request: queryReq });
      expect(res.status).toBe(404);
    });
  });

  describe('5. Search Boundary & Root Fingerprint Protection', () => {
    it('does not return root fingerprints when searching by handle', async () => {
      const searchReq = new Request('https://urefy.com/api/search?q=alice_games&category=people');
      const res = await search({ request: searchReq });
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.results.people.length).toBeGreaterThan(0);
      const found = json.results.people.find((p: any) => p.handle === 'alice_games');
      expect(found).toBeDefined();
      expect(found.userId).toBe(aliceGameDevFacet.id);
      expect(found.userId).not.toBe(aliceRoot);

      // Unlinked sibling facet alice_photo is NOT returned
      const sibling = json.results.people.find((p: any) => p.handle === 'alice_photo');
      expect(sibling).toBeUndefined();
    });

    it('does not allow searching by root user_id or opaque facet id', async () => {
      const searchReq = new Request(`https://urefy.com/api/search?q=${aliceRoot}&category=people`);
      const res = await search({ request: searchReq });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.results.people.length).toBe(0);
    });
  });

  describe('6. Cache-Control & Privacy Headers Matrix', () => {
    it('sets public caching headers for unauthenticated public requests', async () => {
      globalPostsStore.push({
        id: 'post-public-01',
        channelId: 'pulse-global',
        authorFingerprint: aliceRoot,
        facetId: aliceGameDevFacet.id,
        audience: 'public',
        title: 'Public post',
        content: 'Hello World',
        meritVotes: 1,
        replyCount: 0,
        boostCount: 0,
        createdAt: 1000,
        status: 'published',
      });

      const req = new Request('https://urefy.com/api/posts');
      const res = await getPosts({ request: req });
      expect(res.status).toBe(200);
      const cacheControl = res.headers.get('Cache-Control');
      expect(cacheControl).toContain('public');
    });

    it('sets private no-cache headers whenever request is authenticated or accesses non-public post', async () => {
      globalPostsStore.push({
        id: 'post-comm-01',
        channelId: 'c/gamedev',
        authorFingerprint: aliceRoot,
        facetId: aliceGameDevFacet.id,
        audience: 'community',
        title: 'Community secret',
        content: 'Not for public eyes',
        meritVotes: 1,
        replyCount: 0,
        boostCount: 0,
        createdAt: 1000,
        status: 'published',
      });

      const authReq = new Request('https://urefy.com/api/posts', {
        headers: {
          'X-User-Fingerprint': aliceRoot,
        },
      });

      const res = await getPosts({ request: authReq });
      expect(res.status).toBe(200);
      const cacheControl = res.headers.get('Cache-Control');
      expect(cacheControl).toContain('private');
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).toContain('no-store');
      expect(res.headers.get('Vary')).toContain('X-User-Fingerprint');
      expect(res.headers.get('Vary')).toContain('X-Facet-Id');
    });
  });

  describe('7. Public Endpoint Leak Audit', () => {
    it('never leaks ownerFingerprint to third party unauthenticated callers', async () => {
      const facetReq = new Request(`https://urefy.com/api/facets?id=${aliceGameDevFacet.id}`);
      const res = await getFacets({ request: facetReq });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.facet.ownerFingerprint).toBeUndefined();
    });

    it('includes ownerFingerprint when queried by the authenticated owner', async () => {
      const facetReq = new Request(`https://urefy.com/api/facets?id=${aliceGameDevFacet.id}`, {
        headers: {
          'X-User-Fingerprint': aliceRoot,
        },
      });
      const res = await getFacets({ request: facetReq });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.facet.ownerFingerprint).toBe(aliceRoot);
    });
  });
});
