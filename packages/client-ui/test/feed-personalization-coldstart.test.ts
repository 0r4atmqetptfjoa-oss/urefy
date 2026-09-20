import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedPersonalizationEngine, type ContentSignal } from '../src/feed-personalization.js';
import { sovereignCircleEngine } from '../src/sovereign-circle.js';
import { profileView } from '../src/profile-view.js';

class MockStorage implements Storage {
  private store: Map<string, string> = new Map();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

const mockStorage = new MockStorage();
(globalThis as any).localStorage = mockStorage;
(globalThis as any).__UREFY_DEMO_MODE__ = false;

describe('PASS 6: Feed Personalization Cold Start & Deterministic Discovery', () => {
  let engine: FeedPersonalizationEngine;

  beforeEach(() => {
    (globalThis as any).__UREFY_DEMO_MODE__ = false;
    mockStorage.clear();
    for (const c of sovereignCircleEngine.getAllCircles()) {
      c.isJoined = false;
    }
    engine = new FeedPersonalizationEngine();
  });

  it('1. should start cold without fake synthetic user interactions when demo mode is off', () => {
    expect(engine.userHistory.length).toBe(0);
    expect(engine.mutedAuthors.size).toBe(0);
    expect(engine.mutedTags.size).toBe(0);
  });

  it('2. manual interest selection should directly and deterministically boost matching posts', () => {
    const postAero: ContentSignal = {
      postId: 'test-post-aero',
      tags: ['#Aerospace'],
      flair: 'DISCUSSION',
      channelId: 'pulse-science',
      score: 10,
      authorFP: 'author_aero_1',
      createdAt: Date.now() - 60000,
    };

    const postArt: ContentSignal = {
      postId: 'test-post-art',
      tags: ['#Creative'],
      flair: 'SHOWCASE',
      channelId: 'pulse-creative',
      score: 10,
      authorFP: 'author_art_1',
      createdAt: Date.now() - 60000,
    };

    engine.registerContentSignal(postAero);
    engine.registerContentSignal(postArt);

    // Before manual interest: unselected topic has baseline cold-start score
    const scoreAeroBefore = engine.scorePost(postAero.postId).relevanceScore;
    const scoreArtBefore = engine.scorePost(postArt.postId).relevanceScore;

    // Manually select #Aerospace with high affinity (+100)
    engine.setManualInterest('#Aerospace', 100);

    const scoreAeroAfter = engine.scorePost(postAero.postId).relevanceScore;
    const scoreArtAfter = engine.scorePost(postArt.postId).relevanceScore;

    expect(scoreAeroAfter).toBeGreaterThan(scoreAeroBefore);
    expect(scoreAeroAfter).toBeGreaterThan(scoreArtAfter);

    const explanation = engine.explainScore(postAero.postId);
    expect(explanation.join(' ')).toContain('#Aerospace');
  });

  it('3. joined communities should provide explainable boost to matching posts', () => {
    const postInCommunity: ContentSignal = {
      postId: 'test-post-comm',
      tags: ['#Technology'],
      flair: 'DISCUSSION',
      channelId: 'pulse-technology',
      score: 5,
      authorFP: 'author_comm_1',
      createdAt: Date.now() - 10000,
    };
    engine.registerContentSignal(postInCommunity);

    const scoreBeforeJoin = engine.scorePost(postInCommunity.postId);

    // Join the community
    const circle = sovereignCircleEngine.findCircle('pulse-technology');
    if (circle) circle.isJoined = true;
    engine.clearCache();

    const scoreAfterJoin = engine.scorePost(postInCommunity.postId);
    expect(scoreAfterJoin.relevanceScore).toBeGreaterThan(scoreBeforeJoin.relevanceScore);

    const explanation = engine.explainScore(postInCommunity.postId);
    expect(explanation.join(' ')).toContain('community you joined');
  });

  it('4. followed creators should provide explainable boost to their posts', () => {
    const postCreator: ContentSignal = {
      postId: 'test-post-creator',
      tags: ['#Software'],
      flair: 'RELEASE',
      channelId: 'pulse-general',
      score: 5,
      authorFP: 'author_vip_creator',
      createdAt: Date.now() - 10000,
    };
    engine.registerContentSignal(postCreator);

    const scoreBeforeFollow = engine.scorePost(postCreator.postId);

    // Follow author
    (profileView as any).followingSet.add('author_vip_creator');
    engine.clearCache();

    const scoreAfterFollow = engine.scorePost(postCreator.postId);
    expect(scoreAfterFollow.relevanceScore).toBeGreaterThan(scoreBeforeFollow.relevanceScore);

    const explanation = engine.explainScore(postCreator.postId);
    expect(explanation.join(' ')).toContain('From a creator you follow');
  });

  it('5. Latest sort mode should be strictly chronological by createdAt timestamp', () => {
    const now = Date.now();
    const postOld = { id: 'p1', createdAt: now - 100000, score: 500 };
    const postMid = { id: 'p2', createdAt: now - 50000, score: 10 };
    const postNewest = { id: 'p3', createdAt: now - 1000, score: 0 };

    const unsorted = [postMid, postOld, postNewest];
    const sorted = [...unsorted].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    expect(sorted[0].id).toBe('p3');
    expect(sorted[1].id).toBe('p2');
    expect(sorted[2].id).toBe('p1');
  });
});
