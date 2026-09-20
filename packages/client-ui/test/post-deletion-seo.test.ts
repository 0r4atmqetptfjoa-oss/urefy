import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSignedEnvelope, createSovereignIdentity } from '@aetheris/core-crypto';
import { resetReplayNonceCache } from '../functions/api/_auth.js';
import { globalPostsStore } from '../functions/api/_db.js';
import { createProductDatabase } from './helpers/product-database.js';
import { onRequestDelete as onDeletePostById, onRequestGet as onGetPostById } from '../functions/api/posts/[id].js';
import { onRequestDelete as onDeletePostGeneral } from '../functions/api/posts.js';
import { onRequestGet as onGetPostSeo } from '../functions/p/[id].js';

describe('Post Deletion & HTTP 410 SEO Integrity', () => {
  let fixture: ReturnType<typeof createProductDatabase>;
  const author = createSovereignIdentity({ capabilities: ['post:create', 'post:vote'] });
  const stranger = createSovereignIdentity({ capabilities: ['post:create', 'post:vote'] });
  const env = () => ({ DB: fixture.database, ENVIRONMENT: 'production' });

  beforeEach(() => {
    resetReplayNonceCache();
    fixture = createProductDatabase();
    globalPostsStore.length = 0;

    (globalThis as any).HTMLRewriter = class MockHTMLRewriter {
      on() { return this; }
      transform(response: Response) {
        return new Response('<!DOCTYPE html><html><head><title>Post Slated for Deletion</title></head><body><div id="app">DiscussionForumPosting</div></body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    };

    // Seed test post in D1
    fixture.sqlite.prepare(
      'INSERT INTO posts (id, channel_id, author_id, title, content, status, merit_votes, reply_count, boost_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      'post-del-1',
      'c/general',
      author.identity.fingerprint,
      'Post Slated for Deletion',
      'This content will be deleted by author and produce 410 Gone for crawlers.',
      'published',
      10,
      2,
      1,
      Date.now()
    );
  });

  afterEach(() => {
    fixture.sqlite.close();
  });

  describe('1. Author-Authenticated Soft-Deletion (/api/posts/:id)', () => {
    it('allows author to soft-delete post with cryptographic signature and returns status 410 marker', async () => {
      const envelope = createSignedEnvelope({
        action: 'delete-post',
        postId: 'post-del-1',
        timestamp: Date.now(),
      }, author);

      const req = new Request('https://urefy.com/api/posts/post-del-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await onDeletePostById({
        request: req,
        env: env(),
        params: { id: 'post-del-1' },
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.deleted).toBe(true);
      expect(data.id).toBe('post-del-1');
      expect(data.status).toBe(410);

      // Verify row in D1 is preserved with status = 'deleted' (not dropped from disk)
      const postRow = fixture.sqlite.prepare('SELECT id, status FROM posts WHERE id = ?').get('post-del-1') as any;
      expect(postRow).toBeDefined();
      expect(postRow.status).toBe('deleted');
    });

    it('returns 404 when querying soft-deleted post via GET /api/posts/:id', async () => {
      // 1. Soft-delete the post
      const envelope = createSignedEnvelope({ action: 'delete-post', postId: 'post-del-1' }, author);
      const delReq = new Request('https://urefy.com/api/posts/post-del-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      await onDeletePostById({ request: delReq, env: env(), params: { id: 'post-del-1' } });

      // 2. Querying the post via GET /api/posts/:id returns 404
      const getReq = new Request('https://urefy.com/api/posts/post-del-1', {
        headers: { Accept: 'application/json' },
      });
      const getRes = await onGetPostById({ request: getReq, env: env(), params: { id: 'post-del-1' } });
      expect(getRes.status).toBe(404);
      const getData = await getRes.json() as any;
      expect(getData.success).toBe(false);
      expect(getData.error).toContain('Post not found');
    });

    it('returns 404 when attempting to delete an already deleted post', async () => {
      // 1. First deletion
      const env1 = createSignedEnvelope({ action: 'delete-post', postId: 'post-del-1' }, author);
      const req1 = new Request('https://urefy.com/api/posts/post-del-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(env1),
      });
      const res1 = await onDeletePostById({ request: req1, env: env(), params: { id: 'post-del-1' } });
      expect(res1.status).toBe(200);

      // 2. Second deletion attempt
      const env2 = createSignedEnvelope({ action: 'delete-post', postId: 'post-del-1' }, author);
      const req2 = new Request('https://urefy.com/api/posts/post-del-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(env2),
      });
      const res2 = await onDeletePostById({ request: req2, env: env(), params: { id: 'post-del-1' } });
      expect(res2.status).toBe(404);
      const data2 = await res2.json() as any;
      expect(data2.success).toBe(false);
      expect(data2.error).toContain('already deleted');
    });
  });

  describe('2. Security & Anti-Poisoning Verification', () => {
    it('rejects unsigned deletion requests with 401', async () => {
      const req = new Request('https://urefy.com/api/posts/post-del-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: 'post-del-1' }),
      });

      const res = await onDeletePostById({
        request: req,
        env: env(),
        params: { id: 'post-del-1' },
      });

      expect(res.status).toBe(401);
      const data = await res.json() as any;
      expect(data.success).toBe(false);
      expect(data.error).toContain('SovereignSignedEnvelope required');
    });

    it('rejects deletion attempt by non-author with 403 Forbidden', async () => {
      const envelope = createSignedEnvelope({
        action: 'delete-post',
        postId: 'post-del-1',
      }, stranger);

      const req = new Request('https://urefy.com/api/posts/post-del-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await onDeletePostById({
        request: req,
        env: env(),
        params: { id: 'post-del-1' },
      });

      expect(res.status).toBe(403);
      const data = await res.json() as any;
      expect(data.success).toBe(false);
      expect(data.error).toContain('only author or administrator can delete this post');

      // Ensure post is still published
      const row = fixture.sqlite.prepare('SELECT status FROM posts WHERE id = ?').get('post-del-1') as any;
      expect(row.status).toBe('published');
    });

    it('rejects replayed deletion nonce with 401', async () => {
      const envelope = createSignedEnvelope({
        action: 'delete-post',
        postId: 'post-del-1',
      }, author);

      const req1 = new Request('https://urefy.com/api/posts/post-del-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res1 = await onDeletePostById({ request: req1, env: env(), params: { id: 'post-del-1' } });
      expect(res1.status).toBe(200);

      // Replay identical envelope
      const req2 = new Request('https://urefy.com/api/posts/post-del-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res2 = await onDeletePostById({ request: req2, env: env(), params: { id: 'post-del-1' } });
      expect(res2.status).toBe(401);
      const data2 = await res2.json() as any;
      expect(data2.error).toContain('Replay attack detected');
    });
  });

  describe('3. HTTP 410 Gone & SEO Crawler Integrity (/p/:id)', () => {
    it('returns HTTP 200 HTML with schema and open graph for published post', async () => {
      const req = new Request('https://urefy.com/p/post-del-1');
      const res = await onGetPostSeo({
        request: req,
        env: env(),
        params: { id: 'post-del-1' },
      });

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Post Slated for Deletion');
      expect(html).toContain('DiscussionForumPosting');
    });

    it('strictly serves HTTP 410 Gone and noindex/nofollow headers for deleted posts', async () => {
      // 1. Delete post
      const envelope = createSignedEnvelope({ action: 'delete-post', postId: 'post-del-1' }, author);
      const delReq = new Request('https://urefy.com/api/posts/post-del-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      await onDeletePostById({ request: delReq, env: env(), params: { id: 'post-del-1' } });

      // 2. Crawler / User visits /p/post-del-1
      const req = new Request('https://urefy.com/p/post-del-1');
      const res = await onGetPostSeo({
        request: req,
        env: env(),
        params: { id: 'post-del-1' },
      });

      expect(res.status).toBe(410);
      expect(res.headers.get('Content-Type')).toContain('text/plain');
      expect(res.headers.get('Cache-Control')).toContain('public');
      const robotsTag = res.headers.get('X-Robots-Tag');
      expect(robotsTag).toBeDefined();
      expect(robotsTag).toContain('noindex');
      expect(robotsTag).toContain('nofollow');

      const bodyText = await res.text();
      expect(bodyText).toContain('410 Gone: This post has been deleted by its author or community moderator.');
    });
  });

  describe('4. General Post Route Deletion (/api/posts)', () => {
    it('soft-deletes post via DELETE /api/posts?postId=...', async () => {
      const envelope = createSignedEnvelope({
        action: 'delete-post',
        postId: 'post-del-1',
      }, author);

      const req = new Request('https://urefy.com/api/posts?postId=post-del-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await onDeletePostGeneral({
        request: req,
        env: env(),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.deleted).toBe(true);

      const row = fixture.sqlite.prepare('SELECT status FROM posts WHERE id = ?').get('post-del-1') as any;
      expect(row.status).toBe('deleted');
    });

    it('soft-deletes in memory store when D1 database is absent in non-prod environment', async () => {
      globalPostsStore.push({
        id: 'mem-del-post',
        channelId: 'pulse-global',
        authorFingerprint: author.identity.fingerprint,
        authorRole: 'MEMBER',
        title: 'Memory Post',
        content: 'Testing in-memory soft-deletion fallback',
        flair: 'GENERAL',
        status: 'published',
        meritVotes: 0,
        replyCount: 0,
        boostCount: 0,
        createdAt: Date.now(),
        isExpanded: false,
      });

      const envelope = createSignedEnvelope({
        action: 'delete-post',
        postId: 'mem-del-post',
      }, author);

      const req = new Request('https://urefy.com/api/posts/mem-del-post', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      // Pass non-prod environment with no DB
      const res = await onDeletePostById({
        request: req,
        env: { ENVIRONMENT: 'development' },
        params: { id: 'mem-del-post' },
      });

      expect(res.status).toBe(200);
      const memPost = globalPostsStore.find(p => p.id === 'mem-del-post');
      expect(memPost).toBeDefined();
      expect(memPost!.status).toBe('deleted');
    });
  });
});
