import { describe, it, expect, beforeEach } from 'vitest';
import {
  onRequestGet,
  onRequestPost,
  onRequestOptions,
  memoryInteractionsStore,
} from '../functions/api/interactions.js';

describe('Real Interactions API (/api/interactions)', () => {
  beforeEach(() => {
    memoryInteractionsStore.length = 0;
  });

  it('handles OPTIONS preflight with CORS headers', async () => {
    const res = await onRequestOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns 400 on GET without targetId or targetIds', async () => {
    const req = new Request('https://aetheris.network/api/interactions');
    const res = await onRequestGet({ request: req });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('returns 400 on POST with missing fields', async () => {
    const req = new Request('https://aetheris.network/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: 'post-1' }), // missing userFingerprint
    });
    const res = await onRequestPost({ request: req });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('toggles like atomically (like -> unlike)', async () => {
    // 1. First Like
    const req1 = new Request('https://aetheris.network/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': '11223' },
      body: JSON.stringify({
        targetId: 'post-100',
        userFingerprint: 'user-alpha',
        action: 'like',
      }),
    });
    const res1 = await onRequestPost({ request: req1 });
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.success).toBe(true);
    expect(data1.active).toBe(true);
    expect(data1.newCount).toBe(1);

    // 2. Query GET to confirm
    const getReq = new Request('https://aetheris.network/api/interactions?postId=post-100&userFingerprint=user-alpha');
    const getRes = await onRequestGet({ request: getReq });
    const getData = await getRes.json();
    expect(getData.success).toBe(true);
    expect(getData.likesCount).toBe(1);
    expect(getData.userInteractions.liked).toBe(true);

    // 3. Second Like (Toggle / Unlike)
    const req2 = new Request('https://aetheris.network/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': '11223' },
      body: JSON.stringify({
        targetId: 'post-100',
        userFingerprint: 'user-alpha',
        action: 'like',
      }),
    });
    const res2 = await onRequestPost({ request: req2 });
    const data2 = await res2.json();
    expect(data2.active).toBe(false);
    expect(data2.newCount).toBe(0);

    // 4. Query GET to confirm unliked
    const getRes2 = await onRequestGet({ request: getReq });
    const getData2 = await getRes2.json();
    expect(getData2.likesCount).toBe(0);
    expect(getData2.userInteractions.liked).toBe(false);
  });

  it('toggles bookmark and repost', async () => {
    // Repost
    const repostReq = new Request('https://aetheris.network/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': '11223' },
      body: JSON.stringify({
        targetId: 'post-200',
        userFingerprint: 'user-beta',
        action: 'repost',
      }),
    });
    const repRes = await onRequestPost({ request: repostReq });
    const repData = await repRes.json();
    expect(repData.active).toBe(true);
    expect(repData.newCount).toBe(1);

    // Bookmark
    const bkmkReq = new Request('https://aetheris.network/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': '11223' },
      body: JSON.stringify({
        targetId: 'post-200',
        userFingerprint: 'user-beta',
        action: 'bookmark',
      }),
    });
    const bkmkRes = await onRequestPost({ request: bkmkReq });
    const bkmkData = await bkmkRes.json();
    expect(bkmkData.active).toBe(true);

    // Verify GET
    const getReq = new Request('https://aetheris.network/api/interactions?postId=post-200&userFingerprint=user-beta');
    const getRes = await onRequestGet({ request: getReq });
    const getData = await getRes.json();
    expect(getData.repostsCount).toBe(1);
    expect(getData.bookmarksCount).toBe(1);
    expect(getData.userInteractions.reposted).toBe(true);
    expect(getData.userInteractions.bookmarked).toBe(true);
  });

  it('supports batch fetching across multiple posts', async () => {
    // Like post-a
    await onRequestPost({
      request: new Request('https://aetheris.network/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': '11223' },
        body: JSON.stringify({ targetId: 'post-a', userFingerprint: 'user-1', action: 'like' }),
      }),
    });

    // Like post-b
    await onRequestPost({
      request: new Request('https://aetheris.network/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': '11223' },
        body: JSON.stringify({ targetId: 'post-b', userFingerprint: 'user-1', action: 'like' }),
      }),
    });

    const batchReq = new Request('https://aetheris.network/api/interactions?postIds=post-a,post-b,post-c&userFingerprint=user-1');
    const batchRes = await onRequestGet({ request: batchReq });
    const batchData = await batchRes.json();

    expect(batchData.success).toBe(true);
    expect(batchData.interactions['post-a'].likesCount).toBe(1);
    expect(batchData.interactions['post-a'].userInteractions.liked).toBe(true);
    expect(batchData.interactions['post-b'].likesCount).toBe(1);
    expect(batchData.interactions['post-c'].likesCount).toBe(0);
  });
});
