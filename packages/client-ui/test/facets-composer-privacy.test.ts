import { describe, it, expect, beforeEach } from 'vitest';
import { HybridComposer } from '../src/composer-hybrid.js';
import { clientStore } from '../src/client-state.js';

describe('Facet Selection & Audience Privacy Receipt in Hybrid Composer', () => {
  let composer: HybridComposer;

  beforeEach(() => {
    composer = new HybridComposer();
    clientStore.posts = [];
    clientStore.facets = [
      {
        id: 'facet-root-default',
        handle: 'alice_main',
        displayName: 'Alice Sovereign',
        bio: 'Default root profile',
        avatarUrl: 'https://example.com/avatar1.png',
        isDefault: true,
        isPubliclyLinked: false,
        visibility: 'public',
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'facet-gamedev-sec',
        handle: 'alice_games',
        displayName: 'Alice Games & Tech',
        bio: 'Game dev & shaders',
        avatarUrl: 'https://example.com/avatar2.png',
        isDefault: false,
        isPubliclyLinked: false,
        visibility: 'public',
        createdAt: 2000,
        updatedAt: 2000,
      },
      {
        id: 'facet-linked-public',
        handle: 'alice_public',
        displayName: 'Alice Open',
        bio: 'Publicly linked facet',
        isDefault: false,
        isPubliclyLinked: true,
        visibility: 'public',
        createdAt: 3000,
        updatedAt: 3000,
      }
    ];
    clientStore.activeFacetId = 'facet-root-default';
  });

  describe('1. Dynamic Privacy Receipt ("Who will see this?")', () => {
    it('should display public audience copy for public posts', () => {
      composer.selectedFacetId = 'facet-root-default';
      composer.postAudience = 'public';
      const html = composer.renderComposerModal();

      expect(html).toContain('Who will see this?');
      expect(html).toContain('PUBLIC');
      expect(html).toContain('Anyone on the internet can read this post');
    });

    it('should display community audience copy when community is selected', () => {
      composer.selectedFacetId = 'facet-root-default';
      composer.postAudience = 'community';
      composer.targetCommunityId = 'c/gamedev';
      const html = composer.renderComposerModal();

      expect(html).toContain('Who will see this?');
      expect(html).toContain('COMMUNITY');
      expect(html).toContain('Only members of <strong>c/gamedev</strong> can read this post');
    });

    it('should display followers audience copy scoped to the chosen facet handle', () => {
      composer.selectedFacetId = 'facet-gamedev-sec';
      composer.postAudience = 'followers';
      const html = composer.renderComposerModal();

      expect(html).toContain('Who will see this?');
      expect(html).toContain('FOLLOWERS');
      expect(html).toContain('Only followers of <strong>@alice_games</strong> can read this post');
    });
  });

  describe('2. ActivityPub Federation & Public Unlinkability Warnings', () => {
    it('should allow ActivityPub federation ONLY for the default facet with public audience', () => {
      composer.selectedFacetId = 'facet-root-default';
      composer.postAudience = 'public';
      let html = composer.renderComposerModal();
      expect(html).toContain('Federates to ActivityPub');
      expect(html).not.toContain('Will NOT federate to ActivityPub');

      // Change audience to followers -> federation must be disabled
      composer.postAudience = 'followers';
      html = composer.renderComposerModal();
      expect(html).toContain('Will NOT federate to ActivityPub');

      // Change audience back to public, but switch to secondary facet -> federation must be disabled
      composer.selectedFacetId = 'facet-gamedev-sec';
      composer.postAudience = 'public';
      html = composer.renderComposerModal();
      expect(html).toContain('Will NOT federate to ActivityPub');
    });

    it('should clearly indicate linking status vs private context', () => {
      // Unlinked facet (isPubliclyLinked = false)
      composer.selectedFacetId = 'facet-gamedev-sec';
      let html = composer.renderComposerModal();
      expect(html).toContain('Other Facets are not publicly linked');
      expect(html).not.toContain('Linked to your other public profiles');

      // Publicly linked facet (isPubliclyLinked = true)
      composer.selectedFacetId = 'facet-linked-public';
      html = composer.renderComposerModal();
      expect(html).toContain('Linked to your other public profiles');
      expect(html).not.toContain('Other Facets are not publicly linked');
    });
  });

  describe('3. Post Creation with Facet Metadata and Audience Scope', () => {
    it('should create post stamped with selected facet and audience', async () => {
      composer.selectedFacetId = 'facet-gamedev-sec';
      composer.postAudience = 'community';
      composer.targetCommunityId = 'c/pixelart';
      composer.activeTab = 'pulse';
      composer.threadSegments = [{ id: 'seg-0', content: 'Crafting new 2D tilemaps today!' }];

      await composer.broadcastPublication();

      expect(clientStore.posts.length).toBe(1);
      const post = clientStore.posts[0];
      expect(post.facetId).toBe('facet-gamedev-sec');
      expect(post.facetHandle).toBe('alice_games');
      expect(post.facetDisplayName).toBe('Alice Games & Tech');
      expect(post.facetAvatarUrl).toBe('https://example.com/avatar2.png');
      expect(post.audience).toBe('community');
      expect(post.channelId).toBe('c/pixelart');
      expect(post.content).toBe('Crafting new 2D tilemaps today!');
    });

    it('should propagate facet and audience across thread segments', async () => {
      composer.selectedFacetId = 'facet-gamedev-sec';
      composer.postAudience = 'followers';
      composer.activeTab = 'pulse';
      composer.threadSegments = [
        { id: 'seg-0', content: 'Part 1 of our devlog' },
        { id: 'seg-1', content: 'Part 2: shader optimizations' }
      ];

      await composer.broadcastPublication();

      expect(clientStore.posts.length).toBe(2);
      for (const p of clientStore.posts) {
        expect(p.facetId).toBe('facet-gamedev-sec');
        expect(p.facetHandle).toBe('alice_games');
        expect(p.audience).toBe('followers');
      }
    });
  });
});
