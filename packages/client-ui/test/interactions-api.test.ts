import { describe, it, expect, beforeEach } from 'vitest';
import { createSignedEnvelope, createSovereignIdentity } from '@aetheris/core-crypto';
import {
  onRequestGet,
  onRequestPost,
  onRequestOptions,
  memoryInteractionsStore,
} from '../functions/api/interactions.js';

const owner = createSovereignIdentity();
function signedRequest(targetId: string, action: string): Request {
  return new Request('https://urefy.com/api/interactions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createSignedEnvelope({ targetId, action, userFingerprint: owner.identity.fingerprint }, owner)),
  });
}

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
    const req = new Request('https://urefy.com/api/interactions');
    const res = await onRequestGet({ request: req });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('returns 400 on POST with missing fields', async () => {
    const req = new Request('https://urefy.com/api/interactions', {
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
    const req1 = signedRequest('post-100', 'like');
    const res1 = await onRequestPost({ request: req1 });
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.success).toBe(true);
    expect(data1.active).toBe(true);
    expect(data1.newCount).toBe(1);

    // 2. Query GET to confirm
    const getReq = new Request(`https://urefy.com/api/interactions?postId=post-100&userFingerprint=${owner.identity.fingerprint}`);
    const getRes = await onRequestGet({ request: getReq });
    const getData = await getRes.json();
    expect(getData.success).toBe(true);
    expect(getData.likesCount).toBe(1);
    expect(getData.userInteractions.liked).toBe(true);

    // 3. Second Like (Toggle / Unlike)
    const req2 = signedRequest('post-100', 'like');
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
    const repostReq = signedRequest('post-200', 'repost');
    const repRes = await onRequestPost({ request: repostReq });
    const repData = await repRes.json();
    expect(repData.active).toBe(true);
    expect(repData.newCount).toBe(1);

    // Bookmark
    const bkmkReq = signedRequest('post-200', 'bookmark');
    const bkmkRes = await onRequestPost({ request: bkmkReq });
    const bkmkData = await bkmkRes.json();
    expect(bkmkData.active).toBe(true);

    // Verify GET
    const publicRequest = new Request(`https://urefy.com/api/interactions?postId=post-200&userFingerprint=${owner.identity.fingerprint}`);
    const publicData = await (await onRequestGet({ request: publicRequest })).json();
    expect(publicData.userInteractions.bookmarked).toBe(false);
    const getReq = new Request(publicRequest, { headers: { 'X-Sovereign-Envelope': JSON.stringify(createSignedEnvelope({ scope: 'urefy-interactions-read-v1' }, owner)) } });
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
      request: signedRequest('post-a', 'like'),
    });

    // Like post-b
    await onRequestPost({
      request: signedRequest('post-b', 'like'),
    });

    const batchReq = new Request(`https://urefy.com/api/interactions?postIds=post-a,post-b,post-c&userFingerprint=${owner.identity.fingerprint}`);
    const batchRes = await onRequestGet({ request: batchReq });
    const batchData = await batchRes.json();

    expect(batchData.success).toBe(true);
    expect(batchData.interactions['post-a'].likesCount).toBe(1);
    expect(batchData.interactions['post-a'].userInteractions.liked).toBe(true);
    expect(batchData.interactions['post-b'].likesCount).toBe(1);
    expect(batchData.interactions['post-c'].likesCount).toBe(0);
  });
});
