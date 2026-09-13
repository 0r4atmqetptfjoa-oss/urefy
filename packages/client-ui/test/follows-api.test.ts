import { describe, it, expect, beforeEach } from 'vitest';
import {
  onRequestGet,
  onRequestPost,
  onRequestDelete,
  onRequestOptions,
} from '../functions/api/follows.js';
import { globalFollowsStore } from '../functions/api/_db.js';

describe('Follows & Social Graph API (/api/follows)', () => {
  beforeEach(() => {
    globalFollowsStore.length = 0;
  });

  it('1. handles OPTIONS preflight request with 204 and CORS headers', async () => {
    const res = await onRequestOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('2. returns 400 when userId is missing on GET', async () => {
    const req = new Request('https://urefy.com/api/follows');
    const res = await onRequestGet({ request: req });
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.success).toBe(false);
  });

  it('3. supports following a user, querying followers/following, and toggling unfollow', async () => {
    const follower = 'user-alice-1111';
    const creator = 'creator-bob-2222';

    // 1. Initial follow
    const followReq = new Request('https://urefy.com/api/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId: follower, followingId: creator, action: 'follow' }),
    });
    const followRes = await onRequestPost({ request: followReq });
    expect(followRes.status).toBe(200);
    const followData = await followRes.json() as any;
    expect(followData.success).toBe(true);
    expect(followData.isFollowing).toBe(true);
    expect(followData.action).toBe('follow');

    // 2. Query creator's followers
    const creatorReq = new Request(`https://urefy.com/api/follows?userId=${creator}&currentUserId=${follower}`);
    const creatorRes = await onRequestGet({ request: creatorReq });
    expect(creatorRes.status).toBe(200);
    const creatorData = await creatorRes.json() as any;
    expect(creatorData.success).toBe(true);
    expect(creatorData.followersCount).toBe(1);
    expect(creatorData.followers).toContain(follower);
    expect(creatorData.isFollowing).toBe(true);

    // 3. Query alice's following list
    const aliceReq = new Request(`https://urefy.com/api/follows?userId=${follower}`);
    const aliceRes = await onRequestGet({ request: aliceReq });
    expect(aliceRes.status).toBe(200);
    const aliceData = await aliceRes.json() as any;
    expect(aliceData.followingCount).toBe(1);
    expect(aliceData.following).toContain(creator);

    // 4. Toggle follow (should unfollow)
    const toggleReq = new Request('https://urefy.com/api/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId: follower, followingId: creator, action: 'toggle' }),
    });
    const toggleRes = await onRequestPost({ request: toggleReq });
    expect(toggleRes.status).toBe(200);
    const toggleData = await toggleRes.json() as any;
    expect(toggleData.isFollowing).toBe(false);
    expect(toggleData.action).toBe('unfollow');

    // 5. Verify unfollow in GET
    const verifyReq = new Request(`https://urefy.com/api/follows?userId=${creator}&currentUserId=${follower}`);
    const verifyRes = await onRequestGet({ request: verifyReq });
    const verifyData = await verifyRes.json() as any;
    expect(verifyData.followersCount).toBe(0);
    expect(verifyData.isFollowing).toBe(false);
  });

  it('4. supports pairwise follow checks (?followerId=A&followingId=B)', async () => {
    globalFollowsStore.push({
      followerId: 'user-a',
      followingId: 'user-b',
      createdAt: Date.now(),
    });

    const checkReq1 = new Request('https://urefy.com/api/follows?followerId=user-a&followingId=user-b');
    const res1 = await onRequestGet({ request: checkReq1 });
    const data1 = await res1.json() as any;
    expect(data1.success).toBe(true);
    expect(data1.isFollowing).toBe(true);

    const checkReq2 = new Request('https://urefy.com/api/follows?followerId=user-b&followingId=user-a');
    const res2 = await onRequestGet({ request: checkReq2 });
    const data2 = await res2.json() as any;
    expect(data2.isFollowing).toBe(false);
  });

  it('5. supports DELETE /api/follows', async () => {
    globalFollowsStore.push({
      followerId: 'user-x',
      followingId: 'user-y',
      createdAt: Date.now(),
    });

    const delReq = new Request('https://urefy.com/api/follows?followerId=user-x&followingId=user-y', {
      method: 'DELETE',
    });
    const delRes = await onRequestDelete({ request: delReq });
    expect(delRes.status).toBe(200);
    const delData = await delRes.json() as any;
    expect(delData.success).toBe(true);
    expect(delData.isFollowing).toBe(false);
    expect(globalFollowsStore.length).toBe(0);
  });

  it('6. rejects following oneself', async () => {
    const req = new Request('https://urefy.com/api/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId: 'self-node', followingId: 'self-node' }),
    });
    const res = await onRequestPost({ request: req });
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('Cannot follow yourself');
  });
});
