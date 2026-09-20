import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSignedEnvelope, createSovereignIdentity } from '@aetheris/core-crypto';
import { resetReplayNonceCache } from '../functions/api/_auth.js';
import { createProductDatabase } from './helpers/product-database.js';
import { setPostInteraction } from '../functions/api/_interaction-mutations.js';
import { onRequestGet as onInteractionsGet, onRequestPost as onInteractionsPost } from '../functions/api/interactions.js';
import { onRequestGet as onCommentsGet } from '../functions/api/comments.js';

describe('Reactions, Awards, and Multi-User Hydration', () => {
  let fixture: ReturnType<typeof createProductDatabase>;
  const author = createSovereignIdentity();
  const userA = createSovereignIdentity();
  const userB = createSovereignIdentity();
  const env = () => ({ DB: fixture.database, ENVIRONMENT: 'production' });

  beforeEach(() => {
    resetReplayNonceCache();
    fixture = createProductDatabase();

    // Seed post
    fixture.sqlite.prepare(
      'INSERT INTO posts (id, channel_id, author_id, title, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('post-rx-1', 'c/tech', author.identity.fingerprint, 'Reaction & Award Test', 'Testing social integrity', 'published', Date.now());

    // Seed comment
    fixture.sqlite.prepare(
      'INSERT INTO comments (id, post_id, parent_id, author_id, content, merit_votes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('comm-rx-1', 'post-rx-1', null, author.identity.fingerprint, 'Author comment', 0, Date.now());
  });

  afterEach(() => {
    fixture.sqlite.close();
  });

  const mutateInteraction = (
    user: typeof author,
    targetId: string,
    action: 'like' | 'repost' | 'bookmark' | 'reaction' | 'award',
    active: boolean,
    value?: string,
    targetType: 'post' | 'comment' = 'post'
  ) => {
    return setPostInteraction(
      fixture.database,
      user.identity.fingerprint,
      {
        scope: 'urefy-interaction-v1',
        targetId,
        targetType,
        action,
        active,
        value,
      }
    );
  };

  describe('Post Reactions Persistence & Single-Reaction Policy', () => {
    it('persists a reaction to D1 interactions table', async () => {
      const summary = await mutateInteraction(
        userA,
        'post-rx-1',
        'reaction',
        true,
        '🔥',
        'post'
      );
      const res = await summary.json() as any;
      expect(res.success).toBe(true);
      expect(res.active).toBe(true);
      expect(res.value).toBe('🔥');
      expect(res.newCount).toBe(1);

      // Verify row in database
      const row = fixture.sqlite.prepare(
        "SELECT * FROM interactions WHERE target_type = 'post' AND target_id = ? AND user_fingerprint = ? AND interaction_type = 'reaction'"
      ).get('post-rx-1', userA.identity.fingerprint) as any;
      expect(row).toBeDefined();
      expect(row.value).toBe('🔥');
    });

    it('enforces single-reaction replacement when user picks a different emoji', async () => {
      // 1. User A reacts with 🔥
      await mutateInteraction(
        userA,
        'post-rx-1',
        'reaction',
        true,
        '🔥',
        'post'
      );

      // 2. User A switches reaction to ❤️
      const summary = await mutateInteraction(
        userA,
        'post-rx-1',
        'reaction',
        true,
        '❤️',
        'post'
      );
      const res = await summary.json() as any;
      expect(res.success).toBe(true);
      expect(res.value).toBe('❤️');

      // Verify only 1 row exists for User A with ❤️
      const rows = fixture.sqlite.prepare(
        "SELECT * FROM interactions WHERE target_type = 'post' AND target_id = ? AND user_fingerprint = ? AND interaction_type = 'reaction'"
      ).all('post-rx-1', userA.identity.fingerprint) as any[];
      expect(rows.length).toBe(1);
      expect(rows[0].value).toBe('❤️');
    });

    it('removes reaction when toggled off', async () => {
      // 1. Add reaction
      await mutateInteraction(
        userA,
        'post-rx-1',
        'reaction',
        true,
        '⚡',
        'post'
      );

      // 2. Toggle off
      const summary = await mutateInteraction(
        userA,
        'post-rx-1',
        'reaction',
        false,
        '⚡',
        'post'
      );
      const res = await summary.json() as any;
      expect(res.success).toBe(true);
      expect(res.active).toBe(false);

      const rows = fixture.sqlite.prepare(
        "SELECT * FROM interactions WHERE target_type = 'post' AND target_id = ? AND user_fingerprint = ? AND interaction_type = 'reaction'"
      ).all('post-rx-1', userA.identity.fingerprint) as any[];
      expect(rows.length).toBe(0);
    });

    it('hydrates reactions and userReacted per user via GET /api/interactions', async () => {
      // User A reacts 🔥
      await mutateInteraction(userA, 'post-rx-1', 'reaction', true, '🔥', 'post');
      // User B reacts 🔥
      await mutateInteraction(userB, 'post-rx-1', 'reaction', true, '🔥', 'post');
      // User B also reacts 💡 (switches to 💡 per policy)
      await mutateInteraction(userB, 'post-rx-1', 'reaction', true, '💡', 'post');

      // Fetch as User A
      const reqA = new Request(`https://example.test/api/interactions?postIds=post-rx-1&userFingerprint=${userA.identity.fingerprint}`);
      const resA = await onInteractionsGet({ request: reqA, env: env() });
      const dataA = await resA.json() as any;
      expect(dataA.success).toBe(true);
      const postInteractionsA = dataA.interactions ? dataA.interactions['post-rx-1'] : dataA;
      expect(postInteractionsA).toBeDefined();

      const rxFireA = postInteractionsA.reactions.find((r: any) => r.emoji === '🔥');
      const rxLightA = postInteractionsA.reactions.find((r: any) => r.emoji === '💡');
      expect(rxFireA).toBeDefined();
      expect(rxFireA.count).toBe(1);
      expect(rxFireA.userReacted).toBe(true); // User A has reacted with 🔥

      expect(rxLightA).toBeDefined();
      expect(rxLightA.count).toBe(1);
      expect(rxLightA.userReacted).toBe(false); // User A has NOT reacted with 💡

      // Fetch as User B
      const reqB = new Request(`https://example.test/api/interactions?postIds=post-rx-1&userFingerprint=${userB.identity.fingerprint}`);
      const resB = await onInteractionsGet({ request: reqB, env: env() });
      const dataB = await resB.json() as any;
      const postInteractionsB = dataB.interactions ? dataB.interactions['post-rx-1'] : dataB;
      const rxFireB = postInteractionsB.reactions.find((r: any) => r.emoji === '🔥');
      const rxLightB = postInteractionsB.reactions.find((r: any) => r.emoji === '💡');
      expect(rxFireB.userReacted).toBe(false);
      expect(rxLightB.userReacted).toBe(true);
    });

    it('executes full end-to-end signed POST /api/interactions mutation', async () => {
      const envelope = createSignedEnvelope({
        scope: 'urefy-interaction-v1',
        targetId: 'post-rx-1',
        targetType: 'post',
        action: 'reaction',
        active: true,
        value: '🚀',
      }, userA);

      const req = new Request('https://example.test/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await onInteractionsPost({ request: req, env: env() });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.value).toBe('🚀');
      expect(data.active).toBe(true);
    });
  });

  describe('Awards Integrity & Hydration', () => {
    it('rejects self-awarding on posts (400)', async () => {
      const summary = await mutateInteraction(
        author,
        'post-rx-1',
        'award',
        true,
        'GOLD',
        'post'
      );
      expect(summary.status).toBe(400);
      const res = await summary.json() as any;
      expect(res.success).toBe(false);
      expect(res.error).toContain('You cannot award your own post');
    });

    it('allows a peer to bestow an award on a post and increments award count', async () => {
      const summary = await mutateInteraction(
        userA,
        'post-rx-1',
        'award',
        true,
        'PLATINUM',
        'post'
      );
      expect(summary.status).toBe(200);
      const res = await summary.json() as any;
      expect(res.success).toBe(true);
      expect(res.value).toBe('PLATINUM');
      expect(res.newCount).toBe(1);

      // Verify row in D1 interactions table
      const rows = fixture.sqlite.prepare(
        "SELECT * FROM interactions WHERE target_type = 'post' AND target_id = ? AND interaction_type = 'award'"
      ).all('post-rx-1') as any[];
      expect(rows.length).toBe(1);
      expect(rows[0].value).toBe('PLATINUM');
      expect(rows[0].user_fingerprint).toBe(userA.identity.fingerprint);
    });

    it('rejects duplicate award tier from the same user on a post (400)', async () => {
      // 1. First bestowal succeeds
      await mutateInteraction(
        userA,
        'post-rx-1',
        'award',
        true,
        'GOLD',
        'post'
      );

      // 2. Second bestowal of same tier fails
      const summary = await mutateInteraction(
        userA,
        'post-rx-1',
        'award',
        true,
        'GOLD',
        'post'
      );
      expect(summary.status).toBe(400);
      const res = await summary.json() as any;
      expect(res.success).toBe(false);
      expect(res.error).toContain('already bestowed this award tier');
    });

    it('rejects self-awarding on comments (400)', async () => {
      const summary = await mutateInteraction(
        author,
        'comm-rx-1',
        'award',
        true,
        'SILVER',
        'comment'
      );
      expect(summary.status).toBe(400);
      const res = await summary.json() as any;
      expect(res.success).toBe(false);
      expect(res.error).toContain('You cannot award your own comment');
    });

    it('allows a peer to bestow an award on a comment and hydrates via GET /api/comments', async () => {
      // User A awards author comment with SILVER
      const summary = await mutateInteraction(
        userA,
        'comm-rx-1',
        'award',
        true,
        'SILVER',
        'comment'
      );
      expect(summary.status).toBe(200);

      // Fetch comments for post
      const req = new Request(`https://example.test/api/comments?postId=post-rx-1&userFingerprint=${userB.identity.fingerprint}`);
      const res = await onCommentsGet({ request: req, env: env() });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.comments.length).toBe(1);
      const comment = data.comments[0];
      expect(comment.id).toBe('comm-rx-1');
      expect(Array.isArray(comment.awards)).toBe(true);
      expect(comment.awards.length).toBe(1);
      expect(comment.awards[0].awardId).toBe('SILVER');
      expect(comment.awards[0].count).toBe(1);
    });

    it('hydrates post awards via GET /api/interactions', async () => {
      // User A bestows PLATINUM
      await mutateInteraction(userA, 'post-rx-1', 'award', true, 'PLATINUM', 'post');
      // User B bestows PLATINUM
      await mutateInteraction(userB, 'post-rx-1', 'award', true, 'PLATINUM', 'post');
      // User A bestows GOLD
      await mutateInteraction(userA, 'post-rx-1', 'award', true, 'GOLD', 'post');

      const req = new Request('https://example.test/api/interactions?postIds=post-rx-1');
      const res = await onInteractionsGet({ request: req, env: env() });
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      const postData = data.interactions ? data.interactions['post-rx-1'] : data;
      expect(postData.awards).toBeDefined();
      const platAward = postData.awards.find((a: any) => a.awardId === 'PLATINUM');
      const goldAward = postData.awards.find((a: any) => a.awardId === 'GOLD');
      expect(platAward).toBeDefined();
      expect(platAward.count).toBe(2);
      expect(goldAward).toBeDefined();
      expect(goldAward.count).toBe(1);
    });
  });
});
