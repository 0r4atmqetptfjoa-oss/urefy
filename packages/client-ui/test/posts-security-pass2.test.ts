import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestPost as handlePostsPost } from '../functions/api/posts.js';
import { globalPostsStore, globalSpentNullifiers, type EdgePost } from '../functions/api/_db.js';
import { createSovereignIdentity, createSignedEnvelope } from '@aetheris/core-crypto';

describe('Pass 2: Posts API Security & Trust Boundary Enforcement', () => {
  const aliceKeySet = createSovereignIdentity({ capabilities: ['post:create', 'post:vote'] });
  const bobKeySet = createSovereignIdentity({ capabilities: ['post:create', 'post:vote'] });

  beforeEach(() => {
    globalPostsStore.length = 0;
    globalSpentNullifiers.clear();
  });

  it('strictly forces initial metrics on post creation for non-admin users (prevents metric forging)', async () => {
    const forgedPayload = {
      action: 'create',
      title: 'Attempting to Forge Merit',
      content: 'I want 1,000,000 upvotes immediately.',
      meritVotes: 1000000,
      replyCount: 500,
      boostCount: 200,
    };

    const envelope = createSignedEnvelope(forgedPayload, aliceKeySet);
    const req = new Request('https://urefy.com/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });

    const res = await handlePostsPost({ request: req });
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    // meritVotes MUST be sanitized to 1, replyCount to 0, boostCount to 0
    expect(json.post.meritVotes).toBe(1);
    expect(json.post.replyCount).toBe(0);
    expect(json.post.boostCount).toBe(0);
  });

  it('strictly rejects attempt by non-author to overwrite another users post (HTTP 403)', async () => {
    // 1. Alice creates a post
    const postA: EdgePost = {
      id: 'post-alice-original',
      channelId: 'pulse-global',
      authorFingerprint: aliceKeySet.identity.fingerprint,
      authorRole: 'MEMBER',
      title: 'Alices Original Post',
      content: 'Original content.',
      flair: 'TECH DISCUSSION',
      status: 'published',
      meritVotes: 42,
      replyCount: 5,
      boostCount: 2,
      createdAt: Date.now() - 10000,
      isExpanded: false,
    };
    globalPostsStore.push(postA);

    // 2. Bob attempts to overwrite Alice's post by passing id: 'post-alice-original'
    const hostilePayload = {
      action: 'create',
      id: 'post-alice-original',
      title: 'Hijacked by Bob',
      content: 'Content overwritten.',
    };

    const envelope = createSignedEnvelope(hostilePayload, bobKeySet);
    const req = new Request('https://urefy.com/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });

    const res = await handlePostsPost({ request: req });
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('You cannot modify a post created by another identity');

    // Verify post was NOT overwritten
    const stored = globalPostsStore.find((p) => p.id === 'post-alice-original');
    expect(stored?.title).toBe('Alices Original Post');
    expect(stored?.authorFingerprint).toBe(aliceKeySet.identity.fingerprint);
  });

  it('preserves existing metrics when author edits their own post', async () => {
    const postA: EdgePost = {
      id: 'post-alice-legit',
      channelId: 'pulse-global',
      authorFingerprint: aliceKeySet.identity.fingerprint,
      authorRole: 'MEMBER',
      title: 'Initial Title',
      content: 'Initial content.',
      flair: 'TECH DISCUSSION',
      status: 'published',
      meritVotes: 15,
      replyCount: 3,
      boostCount: 1,
      createdAt: 1700000000,
      isExpanded: false,
    };
    globalPostsStore.push(postA);

    // Alice edits her post
    const editPayload = {
      action: 'create',
      id: 'post-alice-legit',
      title: 'Updated Title',
      content: 'Updated content.',
      meritVotes: 999, // Should NOT overwrite existing meritVotes
    };

    const envelope = createSignedEnvelope(editPayload, aliceKeySet);
    const req = new Request('https://urefy.com/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });

    const res = await handlePostsPost({ request: req });
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.post.title).toBe('Updated Title');
    expect(json.post.meritVotes).toBe(15);
    expect(json.post.replyCount).toBe(3);
    expect(json.post.boostCount).toBe(1);
    expect(json.post.createdAt).toBe(1700000000);
  });

  it('rejects double-spending of Chaumian anonymous vote nullifier (HTTP 409)', async () => {
    const post: EdgePost = {
      id: 'post-vote-target',
      channelId: 'pulse-global',
      authorFingerprint: aliceKeySet.identity.fingerprint,
      authorRole: 'MEMBER',
      title: 'Vote Target',
      content: 'Vote here.',
      flair: 'TECH DISCUSSION',
      status: 'published',
      meritVotes: 10,
      replyCount: 0,
      boostCount: 0,
      createdAt: Date.now(),
      isExpanded: false,
    };
    globalPostsStore.push(post);

    const nullifier = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const votePayload = {
      action: 'anonymous-vote',
      postId: 'post-vote-target',
      direction: 1,
      nullifier,
    };

    // First anonymous vote
    const req1 = new Request('https://urefy.com/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(votePayload),
    });

    const res1 = await handlePostsPost({ request: req1 });
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.success).toBe(true);
    expect(json1.post.meritVotes).toBe(11);

    // Second vote with exact same nullifier must be rejected with 409
    const req2 = new Request('https://urefy.com/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(votePayload),
    });

    const res2 = await handlePostsPost({ request: req2 });
    expect(res2.status).toBe(409);
    const json2 = await res2.json();
    expect(json2.success).toBe(false);
    expect(json2.error).toContain('Ballot nullifier has already been spent');

    // Verify vote count was NOT incremented a second time
    expect(post.meritVotes).toBe(11);
  });

  it('rejects anonymous votes with missing or short nullifiers (< 8 chars)', async () => {
    const post: EdgePost = {
      id: 'post-vote-target-2',
      channelId: 'pulse-global',
      authorFingerprint: aliceKeySet.identity.fingerprint,
      authorRole: 'MEMBER',
      title: 'Vote Target 2',
      content: 'Vote here.',
      flair: 'TECH DISCUSSION',
      status: 'published',
      meritVotes: 5,
      replyCount: 0,
      boostCount: 0,
      createdAt: Date.now(),
      isExpanded: false,
    };
    globalPostsStore.push(post);

    // Missing nullifier
    const reqNoNullifier = new Request('https://urefy.com/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'anonymous-vote',
        postId: 'post-vote-target-2',
        direction: 1,
      }),
    });
    const resNoNullifier = await handlePostsPost({ request: reqNoNullifier });
    expect(resNoNullifier.status).toBe(400);

    // Short nullifier
    const reqShortNullifier = new Request('https://urefy.com/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'anonymous-vote',
        postId: 'post-vote-target-2',
        direction: 1,
        nullifier: 'short',
      }),
    });
    const resShortNullifier = await handlePostsPost({ request: reqShortNullifier });
    expect(resShortNullifier.status).toBe(400);
  });

  it('handles D1 atomic batch rollback on duplicate nullifier unique constraint failure', async () => {
    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          first: async () => ({
            id: 'post-d1-target',
            title: 'D1 Post',
            merit_votes: 20,
            channel_id: 'pulse-global',
            author_fingerprint: aliceKeySet.identity.fingerprint,
          }),
        }),
      }),
      batch: async (stmts: any[]) => {
        // Simulate D1 SQLite throwing UNIQUE constraint violation when inserting existing nullifier into used_nonces
        throw new Error('D1_ERROR: UNIQUE constraint failed: used_nonces.fingerprint, used_nonces.nonce');
      },
    };

    const votePayload = {
      action: 'anonymous-vote',
      postId: 'post-d1-target',
      direction: 1,
      nullifier: 'unique-nullifier-already-in-db-12345',
    };

    const req = new Request('https://urefy.com/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(votePayload),
    });

    const res = await handlePostsPost({
      request: req,
      env: { DB: mockDb as any, ENVIRONMENT: 'production' } as any,
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Ballot nullifier has already been spent');
  });
});

