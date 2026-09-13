import { describe, it, expect, beforeEach } from 'vitest';
import { FeedPersonalizationEngine, ContentSignal } from '../src/feed-personalization.js';

describe('Feed Diversity Constraint (Max 2 Consecutive from Same Author/Community)', () => {
  let engine: FeedPersonalizationEngine;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    engine = new FeedPersonalizationEngine();
  });

  it('1. should not permit 3 consecutive posts from the same author', () => {
    // 4 posts from author_A with higher scores, and 2 posts from author_B with slightly lower scores
    const now = Date.now();
    const posts: ContentSignal[] = [
      {
        postId: 'post-a-1',
        tags: ['#ZeroKnowledge'],
        flair: 'ANNOUNCEMENT',
        channelId: 'ch-1',
        score: 100,
        authorFP: 'author_A',
        createdAt: now,
      },
      {
        postId: 'post-a-2',
        tags: ['#ZeroKnowledge'],
        flair: 'ANNOUNCEMENT',
        channelId: 'ch-2',
        score: 95,
        authorFP: 'author_A',
        createdAt: now,
      },
      {
        postId: 'post-a-3',
        tags: ['#ZeroKnowledge'],
        flair: 'ANNOUNCEMENT',
        channelId: 'ch-3',
        score: 90,
        authorFP: 'author_A',
        createdAt: now,
      },
      {
        postId: 'post-a-4',
        tags: ['#ZeroKnowledge'],
        flair: 'ANNOUNCEMENT',
        channelId: 'ch-4',
        score: 85,
        authorFP: 'author_A',
        createdAt: now,
      },
      {
        postId: 'post-b-1',
        tags: ['#ZeroKnowledge'],
        flair: 'ANNOUNCEMENT',
        channelId: 'ch-5',
        score: 80,
        authorFP: 'author_B',
        createdAt: now,
      },
      {
        postId: 'post-b-2',
        tags: ['#ZeroKnowledge'],
        flair: 'ANNOUNCEMENT',
        channelId: 'ch-6',
        score: 75,
        authorFP: 'author_B',
        createdAt: now,
      },
    ];

    const sorted = engine.sortFeed(posts);
    expect(sorted.length).toBe(6);

    // Verify diversity: no 3 consecutive items share the same author
    for (let i = 0; i < sorted.length - 2; i++) {
      const sig0 = engine.contentSignals.get(sorted[i].postId);
      const sig1 = engine.contentSignals.get(sorted[i + 1].postId);
      const sig2 = engine.contentSignals.get(sorted[i + 2].postId);

      const threeConsecutiveSameAuthor =
        sig0?.authorFP === sig1?.authorFP && sig1?.authorFP === sig2?.authorFP;

      expect(threeConsecutiveSameAuthor).toBe(false);
    }

    // Verify that author_B was interleaved after post-a-1 and post-a-2
    const postOrder = sorted.map(s => s.postId);
    expect(postOrder.slice(0, 3)).toEqual(['post-a-1', 'post-a-2', 'post-b-1']);
  });

  it('2. should not permit 3 consecutive posts from the same community/channel', () => {
    const now = Date.now();
    const posts: ContentSignal[] = [
      {
        postId: 'comm-1',
        tags: ['#Privacy'],
        flair: 'DISCUSSION',
        channelId: 'crypto-channel',
        score: 100,
        authorFP: 'author_1',
        createdAt: now,
      },
      {
        postId: 'comm-2',
        tags: ['#Privacy'],
        flair: 'DISCUSSION',
        channelId: 'crypto-channel',
        score: 95,
        authorFP: 'author_2',
        createdAt: now,
      },
      {
        postId: 'comm-3',
        tags: ['#Privacy'],
        flair: 'DISCUSSION',
        channelId: 'crypto-channel',
        score: 90,
        authorFP: 'author_3',
        createdAt: now,
      },
      {
        postId: 'diverse-1',
        tags: ['#Privacy'],
        flair: 'DISCUSSION',
        channelId: 'general-chat',
        score: 80,
        authorFP: 'author_4',
        createdAt: now,
      },
    ];

    const sorted = engine.sortFeed(posts);
    expect(sorted.length).toBe(4);

    // Verify channel diversity: no 3 consecutive from crypto-channel
    for (let i = 0; i < sorted.length - 2; i++) {
      const sig0 = engine.contentSignals.get(sorted[i].postId);
      const sig1 = engine.contentSignals.get(sorted[i + 1].postId);
      const sig2 = engine.contentSignals.get(sorted[i + 2].postId);

      const threeConsecutiveSameChannel =
        sig0?.channelId === sig1?.channelId && sig1?.channelId === sig2?.channelId;

      expect(threeConsecutiveSameChannel).toBe(false);
    }

    // general-chat must be interleaved at index 2
    expect(sorted[2].postId).toBe('diverse-1');
  });

  it('3. should gracefully handle remaining posts when all are from the same author', () => {
    const now = Date.now();
    const posts: ContentSignal[] = [
      { postId: 'solo-1', tags: [], flair: '', channelId: 'c1', score: 50, authorFP: 'solo_author', createdAt: now },
      { postId: 'solo-2', tags: [], flair: '', channelId: 'c2', score: 40, authorFP: 'solo_author', createdAt: now },
      { postId: 'solo-3', tags: [], flair: '', channelId: 'c3', score: 30, authorFP: 'solo_author', createdAt: now },
    ];

    // When there are no diverse candidates available, it shouldn't loop or throw
    const sorted = engine.sortFeed(posts);
    expect(sorted.length).toBe(3);
  });
});
