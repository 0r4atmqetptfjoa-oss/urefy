import { describe, it, expect, beforeEach } from 'vitest';
import { FeedPersonalizationEngine, ContentSignal } from '../src/feed-personalization.js';

describe('Facet-Scoped Local Recommendation Personalization', () => {
  let engine: FeedPersonalizationEngine;

  // Mock localStorage for Node environment
  const mockStorage: Record<string, string> = {};
  beforeEach(() => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k];

    (globalThis as any).localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => { mockStorage[key] = String(val); },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { for (const k of Object.keys(mockStorage)) delete mockStorage[k]; },
    };

    engine = new FeedPersonalizationEngine();
    engine.registerContentSignals(samplePosts);
  });

  const samplePosts: ContentSignal[] = [
    {
      postId: 'post-game-1',
      title: 'Unreal Engine 5 Lumen Pipeline',
      tags: ['#Gaming', '#Graphics'],
      flair: 'GameDev',
      channelId: 'game-engines',
      score: 10,
      authorFP: 'author-gamer-bob',
      createdAt: Date.now() - 3600000,
    },
    {
      postId: 'post-crypto-1',
      title: 'Zero Knowledge Rollups & Merkle Trees',
      tags: ['#ZeroKnowledge', '#Cryptography', '#Security'],
      flair: 'Security',
      channelId: 'cryptography',
      score: 10,
      authorFP: 'author-zk-alice',
      createdAt: Date.now() - 3600000,
    },
    {
      postId: 'post-photo-1',
      title: 'Medium Format Film Photography Guide',
      tags: ['#Creative', '#Photography'],
      flair: 'Art',
      channelId: 'photography',
      score: 8,
      authorFP: 'author-photo-dan',
      createdAt: Date.now() - 3600000,
    },
  ];

  it('maintains completely isolated topic affinity and engagement between facets', () => {
    // 1. Switch to Gaming Facet
    engine.setFacetContext('facet-gaming-101');
    expect(engine.currentFacetId).toBe('facet-gaming-101');

    // Simulate interactions on gaming topics
    engine.trackInteraction({
      postId: 'post-game-1',
      type: 'upvote',
      timestamp: Date.now(),
      dwellTimeMs: 30000,
    });
    engine.trackInteraction({
      postId: 'post-game-1',
      type: 'bookmark',
      timestamp: Date.now(),
      dwellTimeMs: 15000,
    });

    const gamingScoreInGamingContext = engine.topicInterests.get('#Gaming') || 0;
    expect(gamingScoreInGamingContext).toBeGreaterThan(60);

    // 2. Switch to Work / Security Facet
    engine.setFacetContext('facet-work-202');
    expect(engine.currentFacetId).toBe('facet-work-202');

    // Gaming interactions must NOT pollute Work facet!
    const gamingScoreInWorkContext = engine.topicInterests.get('#Gaming') || 0;
    expect(gamingScoreInWorkContext).toBeLessThan(gamingScoreInGamingContext);

    // Track security interactions in Work context
    engine.trackInteraction({
      postId: 'post-crypto-1',
      type: 'upvote',
      timestamp: Date.now(),
      dwellTimeMs: 25000,
    });

    const cryptoScoreInWorkContext = engine.topicInterests.get('#ZeroKnowledge') || 0;
    expect(cryptoScoreInWorkContext).toBeGreaterThan(50);

    // Switch back to Gaming -> still has high gaming affinity
    engine.setFacetContext('facet-gaming-101');
    expect(engine.topicInterests.get('#Gaming')).toBe(gamingScoreInGamingContext);
  });

  it('applies facet-specific follows and community memberships to boost scoring', () => {
    // Seed facet-specific follows and community memberships in storage
    mockStorage['urefy_facet_follows_facet-gaming-101'] = JSON.stringify(['author-gamer-bob']);
    mockStorage['urefy_facet_communities_facet-gaming-101'] = JSON.stringify(['game-engines']);

    mockStorage['urefy_facet_follows_facet-work-202'] = JSON.stringify(['author-zk-alice']);
    mockStorage['urefy_facet_communities_facet-work-202'] = JSON.stringify(['cryptography']);

    // Context: Gaming
    engine.setFacetContext('facet-gaming-101');
    const gamePostScoreInGaming = engine.scorePost(samplePosts[0]);
    const cryptoPostScoreInGaming = engine.scorePost(samplePosts[1]);

    expect(gamePostScoreInGaming.reasons.some(r => r.includes('author followed by your active facet'))).toBe(true);
    expect(gamePostScoreInGaming.reasons.some(r => r.includes('community joined by your active facet'))).toBe(true);
    expect(cryptoPostScoreInGaming.reasons.some(r => r.includes('author followed by your active facet'))).toBe(false);

    // Context: Work
    engine.setFacetContext('facet-work-202');
    const gamePostScoreInWork = engine.scorePost(samplePosts[0]);
    const cryptoPostScoreInWork = engine.scorePost(samplePosts[1]);

    expect(gamePostScoreInWork.reasons.some(r => r.includes('author followed by your active facet'))).toBe(false);
    expect(cryptoPostScoreInWork.reasons.some(r => r.includes('author followed by your active facet'))).toBe(true);
    expect(cryptoPostScoreInWork.reasons.some(r => r.includes('community joined by your active facet'))).toBe(true);
  });

  it('diverges feed ranking when switching between facets', () => {
    // Setup Gaming facet state
    mockStorage['urefy_facet_follows_facet-gaming-101'] = JSON.stringify(['author-gamer-bob']);
    mockStorage['urefy_facet_communities_facet-gaming-101'] = JSON.stringify(['game-engines']);

    // Setup Work facet state
    mockStorage['urefy_facet_follows_facet-work-202'] = JSON.stringify(['author-zk-alice']);
    mockStorage['urefy_facet_communities_facet-work-202'] = JSON.stringify(['cryptography']);

    // 1. Sort in Gaming facet
    engine.setFacetContext('facet-gaming-101');
    const gamingFeed = engine.sortFeed(samplePosts);
    expect(gamingFeed[0].postId).toBe('post-game-1');

    // 2. Sort in Work facet
    engine.setFacetContext('facet-work-202');
    const workFeed = engine.sortFeed(samplePosts);
    expect(workFeed[0].postId).toBe('post-crypto-1');
  });

  it('scopes "Not Interested" tuning strictly to the active facet', () => {
    engine.setFacetContext('facet-gaming-101');
    engine.markNotInterested('post-photo-1');

    const scoreInGaming = engine.scorePost(samplePosts[2]);
    expect(scoreInGaming.relevanceScore).toBe(0);
    expect(scoreInGaming.reasons[0]).toContain('Marked as not interested for this facet');

    // Switch to photo/art facet
    engine.setFacetContext('facet-art-303');
    const scoreInArt = engine.scorePost(samplePosts[2]);
    expect(scoreInArt.relevanceScore).toBeGreaterThan(0);
    expect(scoreInArt.reasons[0]).not.toContain('not interested');
  });

  it('resets recommendations for a single facet without affecting other facets', () => {
    // Add interactions to both facets
    engine.setFacetContext('facet-gaming-101');
    engine.setManualInterest('#Gaming', 95);
    engine.markNotInterested('post-photo-1');

    engine.setFacetContext('facet-work-202');
    engine.setManualInterest('#Security', 90);

    // Reset Gaming facet
    engine.resetFacetPreferences('facet-gaming-101');

    // Verify Gaming is reset
    engine.setFacetContext('facet-gaming-101');
    expect(engine.manualOverrides.get('#Gaming')).toBeUndefined();
    expect(engine.notInterestedPosts.has('post-photo-1')).toBe(false);

    // Verify Work is intact
    engine.setFacetContext('facet-work-202');
    expect(engine.manualOverrides.get('#Security')).toBe(90);
  });
});
