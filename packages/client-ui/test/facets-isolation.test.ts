import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestGet as onFollowsGet, onRequestPost as onFollowsPost } from '../functions/api/follows.js';
import { onRequestGet as onCommunitiesGet, onRequestPost as onCommunitiesPost } from '../functions/api/communities.js';
import { onRequestPost as onBlocksPost } from '../functions/api/blocks.js';
import {
  globalFacetsStore,
  globalFacetFollowsStore,
  globalFacetMembersStore,
  globalCommunitiesStore,
  globalCommunityMembersStore,
  globalBlocksStore,
} from '../functions/api/_db.js';
import { createSovereignIdentity, createSignedEnvelope } from '@aetheris/core-crypto';
import { resetReplayNonceCache } from '../functions/api/_auth.js';

describe('Facet Social Graph & Community Membership Isolation', () => {
  let alice: ReturnType<typeof createSovereignIdentity>;
  let bob: ReturnType<typeof createSovereignIdentity>;
  let eve: ReturnType<typeof createSovereignIdentity>;

  beforeEach(() => {
    globalFacetsStore.length = 0;
    globalFacetFollowsStore.length = 0;
    globalFacetMembersStore.length = 0;
    globalCommunitiesStore.length = 0;
    globalCommunityMembersStore.length = 0;
    globalBlocksStore.length = 0;
    resetReplayNonceCache();

    alice = createSovereignIdentity({ capabilities: ['*'] });
    bob = createSovereignIdentity({ capabilities: ['*'] });
    eve = createSovereignIdentity({ capabilities: ['*'] });

    // Alice has two distinct contexts
    globalFacetsStore.push(
      {
        id: 'facet-alice-gamedev',
        ownerFingerprint: alice.identity.fingerprint,
        handle: 'alice_games',
        displayName: 'Alice GameDev',
        visibility: 'public',
        isDefault: true,
        isPubliclyLinked: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'facet-alice-photo',
        ownerFingerprint: alice.identity.fingerprint,
        handle: 'alice_photo',
        displayName: 'Alice Photography',
        visibility: 'public',
        isDefault: false,
        isPubliclyLinked: false,
        createdAt: 1001,
        updatedAt: 1001,
      }
    );

    // Bob has a science context
    globalFacetsStore.push({
      id: 'facet-bob-science',
      ownerFingerprint: bob.identity.fingerprint,
      handle: 'bob_science',
      displayName: 'Bob Science',
      visibility: 'public',
      isDefault: true,
      isPubliclyLinked: false,
      createdAt: 2000,
      updatedAt: 2000,
    });

    // Seed test community
    globalCommunitiesStore.push({
      id: 'rust-lang',
      name: 'rust-lang',
      displayName: 'Rust Programming',
      description: 'Systems programming in Rust',
      category: 'tech',
      memberCount: 0,
      createdAt: 3000,
    });
  });

  function createSignedFollowRequest(payload: any, identityKeySet: any) {
    const envelope = createSignedEnvelope(payload, identityKeySet);
    return new Request('https://urefy.com/api/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
  }

  function createSignedCommunityRequest(payload: any, identityKeySet: any) {
    const envelope = createSignedEnvelope(payload, identityKeySet);
    return new Request('https://urefy.com/api/communities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
  }

  function createSignedBlockRequest(payload: any, identityKeySet: any) {
    const envelope = createSignedEnvelope(payload, identityKeySet);
    return new Request('https://urefy.com/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
  }

  describe('1. Social Graph Isolation Across Facets', () => {
    it('following Bob with Alice/GameDev does NOT make Alice/Photography follow Bob', async () => {
      // Alice follows Bob/Science using Alice/GameDev
      const followRes = await onFollowsPost({
        request: createSignedFollowRequest({
          followerFacetId: 'facet-alice-gamedev',
          followingFacetId: 'facet-bob-science',
          action: 'follow',
        }, alice),
      });

      expect(followRes.status).toBe(200);
      const followData = await followRes.json();
      expect(followData.isFollowing).toBe(true);

      // Verify pairwise check for GameDev -> Science is TRUE
      const checkGameDev = await onFollowsGet({
        request: new Request('https://urefy.com/api/follows?followerFacetId=facet-alice-gamedev&followingFacetId=facet-bob-science'),
      });
      const dataGameDev = await checkGameDev.json();
      expect(dataGameDev.isFollowing).toBe(true);

      // Verify pairwise check for Photography -> Science is FALSE!
      const checkPhoto = await onFollowsGet({
        request: new Request('https://urefy.com/api/follows?followerFacetId=facet-alice-photo&followingFacetId=facet-bob-science'),
      });
      const dataPhoto = await checkPhoto.json();
      expect(dataPhoto.isFollowing).toBe(false);

      // Verify query on Alice/GameDev shows 1 following
      const getGameDev = await onFollowsGet({
        request: new Request('https://urefy.com/api/follows?facetId=facet-alice-gamedev'),
      });
      const gameDevData = await getGameDev.json();
      expect(gameDevData.following).toEqual(['facet-bob-science']);

      // Verify query on Alice/Photo shows 0 following
      const getPhoto = await onFollowsGet({
        request: new Request('https://urefy.com/api/follows?facetId=facet-alice-photo'),
      });
      const photoData = await getPhoto.json();
      expect(photoData.following).toEqual([]);
    });

    it('rejects following when caller does not own the follower facet', async () => {
      // Eve attempts to follow Bob using Alice's facet
      const unauthorizedRes = await onFollowsPost({
        request: createSignedFollowRequest({
          followerFacetId: 'facet-alice-gamedev',
          followingFacetId: 'facet-bob-science',
          action: 'follow',
        }, eve),
      });

      expect(unauthorizedRes.status).toBe(403);
      const json = await unauthorizedRes.json();
      expect(json.error).toContain('You do not own the specified follower Facet');
      expect(globalFacetFollowsStore.length).toBe(0);
    });
  });

  describe('2. Community Membership Isolation Across Facets', () => {
    it('joining community with Alice/GameDev does NOT make Alice/Photography a member', async () => {
      // Alice joins rust-lang using GameDev facet
      const joinRes = await onCommunitiesPost({
        request: createSignedCommunityRequest({
          scope: 'urefy-community-v1',
          action: 'join',
          communityId: 'rust-lang',
          facetId: 'facet-alice-gamedev',
        }, alice),
      });

      expect(joinRes.status).toBe(200);
      const joinData = await joinRes.json();
      expect(joinData.isMember).toBe(true);

      // Verify GameDev facet is a member
      const checkGameDev = await onCommunitiesGet({
        request: new Request('https://urefy.com/api/communities?id=rust-lang&facetId=facet-alice-gamedev'),
      });
      const dataGameDev = await checkGameDev.json();
      expect(dataGameDev.community.isMember).toBe(true);
      expect(dataGameDev.community.userRole).toBe('member');

      // Verify Photography facet is NOT a member!
      const checkPhoto = await onCommunitiesGet({
        request: new Request('https://urefy.com/api/communities?id=rust-lang&facetId=facet-alice-photo'),
      });
      const dataPhoto = await checkPhoto.json();
      expect(dataPhoto.community.isMember).toBe(false);
      expect(dataPhoto.community.userRole).toBeNull();
    });

    it('rejects joining community with an unowned facet', async () => {
      const unauthorized = await onCommunitiesPost({
        request: createSignedCommunityRequest({
          scope: 'urefy-community-v1',
          action: 'join',
          communityId: 'rust-lang',
          facetId: 'facet-alice-gamedev',
        }, eve),
      });

      expect(unauthorized.status).toBe(403);
      const json = await unauthorized.json();
      expect(json.error).toContain('You do not own the specified Facet');
      expect(globalFacetMembersStore.length).toBe(0);
    });
  });

  describe('3. Person-Level Blocking & Social Link Severing', () => {
    it('blocking person blocks root identity and deletes follows across all facets', async () => {
      // First, establish follow between Alice/GameDev and Bob/Science
      await onFollowsPost({
        request: createSignedFollowRequest({
          followerFacetId: 'facet-alice-gamedev',
          followingFacetId: 'facet-bob-science',
          action: 'follow',
        }, alice),
      });
      expect(globalFacetFollowsStore.length).toBe(1);

      // Alice blocks Bob by Bob's facet
      const blockRes = await onBlocksPost({
        request: createSignedBlockRequest({
          action: 'block-person',
          targetId: 'facet-bob-science',
        }, alice),
      });

      expect(blockRes.status).toBe(200);
      const blockData = await blockRes.json();
      expect(blockData.resolvedTargetId).toBe(bob.identity.fingerprint);

      // Verify block is recorded on Bob's root identity
      expect(globalBlocksStore.some(b => b.blockerId === alice.identity.fingerprint && b.blockedId === bob.identity.fingerprint)).toBe(true);

      // Verify all facet follows between Alice and Bob are severed!
      expect(globalFacetFollowsStore.length).toBe(0);
    });
  });
});
