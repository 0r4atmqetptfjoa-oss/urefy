import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSignedEnvelope, createSovereignIdentity } from '@aetheris/core-crypto';
import { onRequestPost, onRequestGet, onRequestPatch } from '../functions/api/comments.js';
import { resetReplayNonceCache } from '../functions/api/_auth.js';
import { createProductDatabase } from './helpers/product-database.js';
import { setPostInteraction } from '../functions/api/_interaction-mutations.js';

describe('Comment Likes & Merit Persistence', () => {
  let fixture: ReturnType<typeof createProductDatabase>;
  const author = createSovereignIdentity();
  const voter1 = createSovereignIdentity();
  const voter2 = createSovereignIdentity();
  const env = () => ({ DB: fixture.database, ENVIRONMENT: 'production' });

  beforeEach(() => {
    resetReplayNonceCache();
    fixture = createProductDatabase();
    // Seed post
    fixture.sqlite.prepare('INSERT INTO posts (id, channel_id, author_id, title, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('post-test', 'c/tech', author.identity.fingerprint, 'Test Post', 'Post content', 'published', Date.now());
    // Seed comment
    fixture.sqlite.prepare('INSERT INTO comments (id, post_id, parent_id, author_id, content, merit_votes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('comm-1', 'post-test', null, author.identity.fingerprint, 'Root comment', 0, Date.now());
  });

  afterEach(() => fixture.sqlite.close());

  describe('Comment Merit Voting (PATCH /api/comments)', () => {
    it('allows a user to upvote a comment (+1)', async () => {
      const envelope = createSignedEnvelope({ action: 'vote-comment', commentId: 'comm-1', direction: 1 }, voter1);
      const req = new Request('https://example.test/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await onRequestPatch({ request: req, env: env() });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.commentId).toBe('comm-1');
      expect(data.meritVotes).toBe(1);
      expect(data.userVote).toBe(1);

      // Verify in DB
      const row = fixture.sqlite.prepare('SELECT merit_votes FROM comments WHERE id = ?').get('comm-1') as any;
      expect(row.merit_votes).toBe(1);
      const voteRow = fixture.sqlite.prepare('SELECT direction FROM votes WHERE target_type = ? AND target_id = ? AND user_fingerprint = ?')
        .get('comment', 'comm-1', voter1.identity.fingerprint) as any;
      expect(voteRow.direction).toBe(1);
    });

    it('reconciles vote change from +1 to -1 correctly (delta = -2)', async () => {
      // 1. Upvote
      const env1 = createSignedEnvelope({ action: 'vote-comment', commentId: 'comm-1', direction: 1 }, voter1);
      await onRequestPatch({
        request: new Request('https://example.test/api/comments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(env1) }),
        env: env(),
      });

      // 2. Downvote
      const env2 = createSignedEnvelope({ action: 'vote-comment', commentId: 'comm-1', direction: -1 }, voter1);
      const res = await onRequestPatch({
        request: new Request('https://example.test/api/comments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(env2) }),
        env: env(),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.meritVotes).toBe(-1);
      expect(data.userVote).toBe(-1);

      const row = fixture.sqlite.prepare('SELECT merit_votes FROM comments WHERE id = ?').get('comm-1') as any;
      expect(row.merit_votes).toBe(-1);
    });

    it('withdraws vote with direction = 0', async () => {
      // 1. Upvote
      const env1 = createSignedEnvelope({ action: 'vote-comment', commentId: 'comm-1', direction: 1 }, voter1);
      await onRequestPatch({
        request: new Request('https://example.test/api/comments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(env1) }),
        env: env(),
      });

      // 2. Neutral (0)
      const env0 = createSignedEnvelope({ action: 'vote-comment', commentId: 'comm-1', direction: 0 }, voter1);
      const res = await onRequestPatch({
        request: new Request('https://example.test/api/comments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(env0) }),
        env: env(),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.meritVotes).toBe(0);
      expect(data.userVote).toBe(0);

      const voteRow = fixture.sqlite.prepare('SELECT direction FROM votes WHERE target_type = ? AND target_id = ? AND user_fingerprint = ?')
        .get('comment', 'comm-1', voter1.identity.fingerprint) as any;
      expect(voteRow).toBeUndefined();
    });

    it('rejects unauthenticated request or forged envelope', async () => {
      const forged = { action: 'vote-comment', commentId: 'comm-1', direction: 1 };
      const req = new Request('https://example.test/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forged),
      });
      const res = await onRequestPatch({ request: req, env: env() });
      expect(res.status).toBe(401);
    });

    it('rejects vote on non-existent comment with 404', async () => {
      const envelope = createSignedEnvelope({ action: 'vote-comment', commentId: 'non-existent', direction: 1 }, voter1);
      const req = new Request('https://example.test/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res = await onRequestPatch({ request: req, env: env() });
      expect(res.status).toBe(404);
    });
  });

  describe('Comment Likes (_interaction-mutations)', () => {
    it('toggles comment like and counts correctly across two users', async () => {
      // 1. Voter 1 likes comment
      const body1 = {
        scope: 'urefy-interaction-v1',
        targetId: 'comm-1',
        targetType: 'comment',
        action: 'like',
        active: true,
      };
      const res1 = await setPostInteraction(fixture.database, voter1.identity.fingerprint, body1);
      const data1 = await res1.json() as any;
      expect(data1.success).toBe(true);
      expect(data1.active).toBe(true);
      expect(data1.newCount).toBe(1);

      // 2. Voter 2 likes comment
      const body2 = {
        scope: 'urefy-interaction-v1',
        targetId: 'comm-1',
        targetType: 'comment',
        action: 'like',
        active: true,
      };
      const res2 = await setPostInteraction(fixture.database, voter2.identity.fingerprint, body2);
      const data2 = await res2.json() as any;
      expect(data2.newCount).toBe(2);

      // 3. Voter 1 unlikes comment
      const body1Unlike = {
        scope: 'urefy-interaction-v1',
        targetId: 'comm-1',
        targetType: 'comment',
        action: 'like',
        active: false,
      };
      const res3 = await setPostInteraction(fixture.database, voter1.identity.fingerprint, body1Unlike);
      const data3 = await res3.json() as any;
      expect(data3.active).toBe(false);
      expect(data3.newCount).toBe(1);
    });
  });

  describe('GET Comments Hydration', () => {
    it('hydrates userVote, likesCount, and userLiked for each comment', async () => {
      // Setup voter1 upvoted comm-1 and liked comm-1
      fixture.sqlite.prepare('INSERT INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run('v-1', 'comment', 'comm-1', voter1.identity.fingerprint, 1, Date.now());
      fixture.sqlite.prepare("UPDATE comments SET merit_votes = 1 WHERE id = 'comm-1'").run();
      fixture.sqlite.prepare('INSERT INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run('act-1', 'comment', 'comm-1', voter1.identity.fingerprint, 'like', Date.now());

      const req = new Request(`https://example.test/api/comments?postId=post-test&userFingerprint=${voter1.identity.fingerprint}`);
      const res = await onRequestGet({ request: req, env: env() });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.comments).toHaveLength(1);
      const c = data.comments[0];
      expect(c.id).toBe('comm-1');
      expect(c.meritVotes).toBe(1);
      expect(c.userVote).toBe(1);
      expect(c.likesCount).toBe(1);
      expect(c.userLiked).toBe(true);
    });
  });
});
