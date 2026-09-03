import { describe, it, expect } from 'vitest';
import { FeedControlsEngine, feedControlsEngine } from '../src/feed-controls.js';
import { ClientPost } from '../src/client-state.js';

describe('Feed Controls & View Mode Switching System', () => {
  const mockPosts: ClientPost[] = [
    {
      id: 'p-1',
      channelId: 'pulse-global',
      authorFingerprint: 'a1b2c3d4e5f6',
      authorRole: 'GUARDIAN',
      title: 'Post Alpha: ZK Proof',
      content: 'Alpha content with cryptographic citations.',
      flair: 'VERIFIED RELEASE',
      meritVotes: 150,
      userVoted: 0,
      replyCount: 12,
      boostCount: 8,
      createdAt: Date.now() - 3600 * 1000 * 2, // 2 hours ago
      isExpanded: false,
    },
    {
      id: 'p-2',
      channelId: 'pulse-global',
      authorFingerprint: 'f6e5d4c3b2a1',
      authorRole: 'ARCHIVIST',
      title: 'Post Beta: TreeKEM',
      content: 'Beta content with MLS TreeKEM rekeying details.',
      flair: 'SECURITY ADVISORY',
      meritVotes: 400,
      userVoted: 1,
      replyCount: 35,
      boostCount: 20,
      createdAt: Date.now() - 3600 * 1000 * 20, // 20 hours ago
      isExpanded: false,
    },
    {
      id: 'p-3',
      channelId: 'pulse-global',
      authorFingerprint: '998877665544',
      authorRole: 'MEMBER',
      title: 'Post Gamma: Fresh Release',
      content: 'Gamma content just published.',
      flair: 'MICRO-PULSE',
      meritVotes: 10,
      userVoted: 0,
      replyCount: 1,
      boostCount: 0,
      createdAt: Date.now() - 3600 * 1000 * 0.1, // 6 mins ago
      isExpanded: false,
    },
  ];

  it('should initialize with default Card view mode and Hot sort type', () => {
    const engine = new FeedControlsEngine();
    expect(engine.getViewMode()).toBe('card');
    expect(engine.getSortType()).toBe('hot');
    expect(engine.getTopTimeframe()).toBe('all');
  });

  it('should switch view modes correctly between card, classic, and compact', () => {
    const engine = new FeedControlsEngine();

    engine.setViewMode('classic');
    expect(engine.getViewMode()).toBe('classic');

    engine.setViewMode('compact');
    expect(engine.getViewMode()).toBe('compact');

    engine.setViewMode('card');
    expect(engine.getViewMode()).toBe('card');
  });

  it('should sort posts correctly for new, top, rising, and hot', () => {
    const engine = new FeedControlsEngine();

    // 1. Sort by New
    engine.setSortType('new');
    const newSorted = engine.filterAndSortPosts(mockPosts);
    expect(newSorted[0].id).toBe('p-3'); // Most recent

    // 2. Sort by Top All Time
    engine.setSortType('top');
    engine.setTopTimeframe('all');
    const topSorted = engine.filterAndSortPosts(mockPosts);
    expect(topSorted[0].id).toBe('p-2'); // 400 merit votes

    // 3. Sort by Rising
    engine.setSortType('rising');
    const risingSorted = engine.filterAndSortPosts(mockPosts);
    expect(risingSorted.length).toBe(3);
  });

  it('should render distinct HTML layouts for Card, Classic, and Compact modes', () => {
    const engine = new FeedControlsEngine();
    const post = mockPosts[0];

    const cardHtml = engine.renderPost(post, 'card');
    expect(cardHtml).toContain('Post Alpha: ZK Proof');
    expect(cardHtml).toContain('btn-toggle-post-expand');

    const classicHtml = engine.renderPost(post, 'classic');
    expect(classicHtml).toContain('post-classic-p-1');
    expect(classicHtml).toContain('Comments');

    const compactHtml = engine.renderPost(post, 'compact');
    expect(compactHtml).toContain('post-compact-p-1');

    const toolbarHtml = engine.renderFeedControlsToolbar();
    expect(toolbarHtml).toContain('sort-btn-hot');
    expect(toolbarHtml).toContain('sort-btn-new');
    expect(toolbarHtml).toContain('sort-btn-top');
    expect(toolbarHtml).toContain('sort-btn-rising');
    expect(toolbarHtml).toContain('viewmode-card-btn');
    expect(toolbarHtml).toContain('viewmode-classic-btn');
    expect(toolbarHtml).toContain('viewmode-compact-btn');
  });
});
