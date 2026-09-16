import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExploreView, exploreView } from '../src/explore-view.js';
import type { ClientPost } from '../src/client-state.js';
import { socialSafety } from '../src/social-safety.js';

describe('ExploreView - Sovereign Explore & Trending Topics Hub', () => {
  let explore: ExploreView;
  let samplePosts: ClientPost[];
  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    explore = new ExploreView();
    samplePosts = [
      {
        id: 'post-1',
        channelId: 'pulse-global',
        authorFingerprint: 'genesis-core',
        authorRole: 'GUARDIAN',
        title: 'Zero Knowledge Invariants in Mesh Networks',
        content: 'Exploring zk-SNARKs recursion for client-side state transitions.',
        flair: 'SECURITY ADVISORY',
        meritVotes: 45,
        userVoted: 1,
        replyCount: 12,
        boostCount: 5,
        createdAt: Date.now() - 10000,
      },
      {
        id: 'post-2',
        channelId: 'relays-general',
        authorFingerprint: 'mesh-navigator',
        authorRole: 'MEMBER',
        title: 'P2P WebRTC Datachannels Benchmarks',
        content: 'Peer to peer direct mesh latency under 12ms across global nodes.',
        flair: 'TECH DISCUSSION',
        meritVotes: 28,
        userVoted: 0,
        replyCount: 6,
        boostCount: 3,
        createdAt: Date.now() - 20000,
      },
      {
        id: 'post-3',
        channelId: 'vault-releases',
        authorFingerprint: 'c3dc28cb705e',
        authorRole: 'ARCHIVIST',
        title: 'AirGap Ghost Relay Release v2.0',
        content: 'RAM-only ephemeral relay execution leaving zero forensic trace on disk.',
        flair: 'VERIFIED RELEASE',
        meritVotes: 98,
        userVoted: 0,
        replyCount: 22,
        boostCount: 15,
        createdAt: Date.now() - 30000,
      },
    ];
  });

  it('should initialize with default category "all" and empty search query', () => {
    expect(explore.activeCategory).toBe('all');
    expect(explore.searchQuery).toBe('');
    expect(explore.categories.length).toBeGreaterThanOrEqual(6);
    expect(explore.getComputedTrendingTopics([])).toEqual([]);
  });

  it('should filter posts by search query across title, content, author, and flair', () => {
    explore.setSearchQuery('Zero Knowledge');
    let results = explore.filterPosts(samplePosts);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('post-1');

    explore.setSearchQuery('c3dc28cb');
    results = explore.filterPosts(samplePosts);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('post-3');

    explore.setSearchQuery('WebRTC');
    results = explore.filterPosts(samplePosts);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('post-2');

    explore.clearSearch();
    expect(explore.searchQuery).toBe('');
    expect(explore.filterPosts(samplePosts).length).toBe(3);
  });

  it('should filter posts by category pills', () => {
    explore.setActiveCategory('p2p');
    let results = explore.filterPosts(samplePosts);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(p => p.id === 'post-2')).toBe(true);

    explore.setActiveCategory('privacy');
    results = explore.filterPosts(samplePosts);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(p => p.id === 'post-3')).toBe(true);

    explore.setActiveCategory('cryptography');
    results = explore.filterPosts(samplePosts);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(p => p.id === 'post-1')).toBe(true);
  });

  it('renders discovery from available conversations without invented trends', () => {
    const html = explore.renderExploreView(samplePosts);
    expect(html).toContain('explore-search-input');
    expect(html).toContain('FOLLOW YOUR CURIOSITY');
    expect(html).toContain('SECURITY ADVISORY');
    expect(html).toContain('1 post');
    expect(html).not.toContain('1.4k posts');
    expect(html).not.toContain('#TreeKEM_MLS');
  });

  it('should render empty state when search returns no matching pulses', () => {
    explore.setSearchQuery('NonExistentKeywordXYZ123');
    const html = explore.renderExploreView(samplePosts);
    expect(html).toContain('No pulses found matching "NonExistentKeywordXYZ123"');
    expect(html).toContain('btn-clear-explore-empty');
  });

  it('finds people beyond the six suggested creators and retains their post count', () => {
    const posts = Array.from({ length: 9 }, (_, i) => ({ ...samplePosts[0], id: `person-post-${i}`, authorFingerprint: `person-${i}` }));
    posts.push({ ...posts[8], id: 'second-person-post-8' });
    explore.setSearchQuery('person-8');
    explore.setActiveSearchTab('people');
    const html = explore.renderExploreView(posts);
    expect(html).toContain('data-fingerprint="person-8"');
    expect(html).toContain('2 posts');
  });

  it('excludes blocked authors from topic counts and people search', () => {
    vi.spyOn(socialSafety, 'isBlocked').mockImplementation(id => id === 'genesis-core');
    expect(explore.getComputedTrendingTopics([samplePosts[0]])).toEqual([]);
    explore.setSearchQuery('genesis-core');
    explore.setActiveSearchTab('people');
    expect(explore.renderExploreView(samplePosts)).not.toContain('data-fingerprint="genesis-core"');
  });
});
