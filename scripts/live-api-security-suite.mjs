import { createSignedEnvelope, createSovereignIdentity } from '@aetheris/core-crypto';
import { execSync } from 'node:child_process';

const BASE_URL = 'https://urefy.com';

function d1Query(sql) {
  const cmd = `npx wrangler d1 execute aetheris-db --remote --command "${sql.replace(/"/g, '\\"')}"`;
  const res = execSync(cmd, { cwd: 'packages/client-ui', encoding: 'utf8' });
  try {
    const jsonStart = res.indexOf('[');
    if (jsonStart >= 0) {
      const parsed = JSON.parse(res.substring(jsonStart));
      return parsed[0]?.results || [];
    }
  } catch (e) {
    console.warn('d1Query parse error:', e.message);
  }
  return [];
}

console.log('════════════════════════════════════════════════════════════════');
console.log('  UREfy PASS 1: LIVE API & SECURITY INTEGRITY VERIFICATION');
console.log('  Target:', BASE_URL);
console.log('════════════════════════════════════════════════════════════════\n');

// Identities
const userA = createSovereignIdentity({ capabilities: ['post:create', 'post:vote'] });
const userB = createSovereignIdentity({ capabilities: ['post:create', 'post:vote'] });

console.log('USER A Fingerprint:', userA.identity.fingerprint);
console.log('USER B Fingerprint:', userB.identity.fingerprint);

const results = {};

async function run() {
  // ─── 1. CREATE QA POST BY USER A ───────────────────────────────────────────
  console.log('\n[Test 1] User A creates QA Post...');
  const postPayload = {
    action: 'create',
    channelId: 'c/general',
    title: 'QA Multi-User Acceptance Post — ' + Date.now(),
    content: 'Live automated acceptance test verification for UREfy PASS 1.',
    flair: 'QA-ACCEPTANCE',
  };
  const postEnv = createSignedEnvelope(postPayload, userA);
  const postRes = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postEnv),
  });
  const postData = await postRes.json();
  if (postRes.status !== 201 || !postData.success) {
    throw new Error(`Failed to create post: ${JSON.stringify(postData)}`);
  }
  const postId = postData.post.id;
  console.log('Created Post ID:', postId, 'Status:', postRes.status);
  results.postCreated = { status: postRes.status, postId };

  // ─── 2. CREATE TOP-LEVEL COMMENT A1 BY USER A ──────────────────────────────
  console.log('\n[Test 2] User A creates Top-Level Comment A1...');
  const a1Payload = {
    action: 'create-comment',
    postId,
    content: 'A1: Top-level root discussion thread for multi-user test.',
  };
  const a1Env = createSignedEnvelope(a1Payload, userA);
  const a1Res = await fetch(`${BASE_URL}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(a1Env),
  });
  const a1Data = await a1Res.json();
  const commentA1Id = a1Data.comment?.id;
  console.log('Created Comment A1 ID:', commentA1Id, 'Status:', a1Res.status);
  results.commentA1 = { status: a1Res.status, commentA1Id };

  // ─── 3. USER B CREATES NESTED REPLY B1 TO A1 ───────────────────────────────
  console.log('\n[Test 3] User B creates Nested Reply B1 to A1...');
  const b1Payload = {
    action: 'create-comment',
    postId,
    parentId: commentA1Id,
    content: 'B1: Nested reply by User B referencing parent A1.',
  };
  const b1Env = createSignedEnvelope(b1Payload, userB);
  const b1Res = await fetch(`${BASE_URL}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(b1Env),
  });
  const b1Data = await b1Res.json();
  const commentB1Id = b1Data.comment?.id;
  console.log('Created Comment B1 ID:', commentB1Id, 'ParentId:', b1Data.comment?.parentId, 'Status:', b1Res.status);
  results.commentB1 = { status: b1Res.status, commentB1Id, parentId: b1Data.comment?.parentId };

  // ─── 4. USER B CREATES NESTED REPLY B2 TO B1 ───────────────────────────────
  console.log('\n[Test 4] User B creates Nested Reply B2 to B1 (depth 2)...');
  const b2Payload = {
    action: 'create-comment',
    postId,
    parentId: commentB1Id,
    content: 'B2: Deep nested reply by User B referencing parent B1.',
  };
  const b2Env = createSignedEnvelope(b2Payload, userB);
  const b2Res = await fetch(`${BASE_URL}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(b2Env),
  });
  const b2Data = await b2Res.json();
  const commentB2Id = b2Data.comment?.id;
  console.log('Created Comment B2 ID:', commentB2Id, 'ParentId:', b2Data.comment?.parentId, 'Status:', b2Res.status);
  results.commentB2 = { status: b2Res.status, commentB2Id, parentId: b2Data.comment?.parentId };

  // ─── 5. VERIFY NESTED REPLIES EXIST IN D1 DATABASE ─────────────────────────
  console.log('\n[Test 5] Querying Cloudflare D1 comments table...');
  const d1Comments = d1Query(`SELECT id, post_id, parent_id, author_id, content, created_at FROM comments WHERE post_id = '${postId}' ORDER BY created_at ASC;`);
  console.log('D1 Comments found for post:', d1Comments.length);
  for (const c of d1Comments) {
    console.log(`  - [${c.id}] parent=${c.parent_id || 'ROOT'} author=${c.author_id.substring(0, 12)}... content="${c.content.substring(0, 30)}..."`);
  }
  results.d1Verification = {
    totalInD1: d1Comments.length,
    hasA1: d1Comments.some(c => c.id === commentA1Id && c.parent_id === null),
    hasB1: d1Comments.some(c => c.id === commentB1Id && c.parent_id === commentA1Id),
    hasB2: d1Comments.some(c => c.id === commentB2Id && c.parent_id === commentB1Id),
  };

  // ─── 6. CROSS-POST PARENT SECURITY ─────────────────────────────────────────
  console.log('\n[Test 6] Attempting Cross-Post Parent attack (post A + parent from post B)...');
  const crossPostPayload = {
    action: 'create-comment',
    postId: 'p-sec-1', // An existing post on urefy.com
    parentId: commentA1Id, // Which belongs to our newly created postId, NOT p-sec-1!
    content: 'Malicious cross-post reply attempt.',
  };
  const crossEnv = createSignedEnvelope(crossPostPayload, userB);
  const crossRes = await fetch(`${BASE_URL}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(crossEnv),
  });
  const crossData = await crossRes.json();
  console.log('Cross-post response status:', crossRes.status, 'Body:', crossData);
  results.crossPostAttack = {
    status: crossRes.status,
    rejected: crossRes.status === 400,
    error: crossData.error,
  };

  // ─── 7. COMMENT LIKE BY USER B ─────────────────────────────────────────────
  console.log('\n[Test 7] User B likes Comment A1...');
  const likeEnv = createSignedEnvelope({
    scope: 'urefy-interaction-v1',
    targetId: commentA1Id,
    targetType: 'comment',
    action: 'like',
    active: true,
  }, userB);
  const likeRes = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(likeEnv),
  });
  const likeData = await likeRes.json();
  console.log('Like Comment A1 result:', likeRes.status, likeData);
  results.commentLike = { status: likeRes.status, active: likeData.active, newCount: likeData.newCount };

  // Fetch comments as User A to see if User A sees likesCount = 1
  const aFetchRes = await fetch(`${BASE_URL}/api/comments?postId=${postId}&userFingerprint=${userA.identity.fingerprint}`);
  const aFetchData = await aFetchRes.json();
  const commentA1FetchedByA = aFetchData.comments?.find(c => c.id === commentA1Id);
  console.log('Comment A1 viewed by User A -> likesCount:', commentA1FetchedByA?.likesCount, 'userLiked:', commentA1FetchedByA?.userLiked);
  results.commentLikeViewedByA = {
    likesCount: commentA1FetchedByA?.likesCount,
    userLiked: commentA1FetchedByA?.userLiked,
  };

  // Fetch comments as User B to see if User B sees userLiked = true
  const bFetchRes = await fetch(`${BASE_URL}/api/comments?postId=${postId}&userFingerprint=${userB.identity.fingerprint}`);
  const bFetchData = await bFetchRes.json();
  const commentA1FetchedByB = bFetchData.comments?.find(c => c.id === commentA1Id);
  console.log('Comment A1 viewed by User B -> likesCount:', commentA1FetchedByB?.likesCount, 'userLiked:', commentA1FetchedByB?.userLiked);
  results.commentLikeViewedByB = {
    likesCount: commentA1FetchedByB?.likesCount,
    userLiked: commentA1FetchedByB?.userLiked,
  };

  // Unlike Comment A1 by User B
  console.log('\n[Test 7b] User B unlikes Comment A1...');
  const unlikeEnv = createSignedEnvelope({
    scope: 'urefy-interaction-v1',
    targetId: commentA1Id,
    targetType: 'comment',
    action: 'like',
    active: false,
  }, userB);
  const unlikeRes = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unlikeEnv),
  });
  const unlikeData = await unlikeRes.json();
  console.log('Unlike result:', unlikeRes.status, unlikeData);
  results.commentUnlike = { status: unlikeRes.status, active: unlikeData.active, newCount: unlikeData.newCount };

  // ─── 8. RAPID COMMENT LIKE / DOUBLE-CLICK ──────────────────────────────────
  console.log('\n[Test 8] Rapid like / double click test...');
  const r1 = createSignedEnvelope({ scope: 'urefy-interaction-v1', targetId: commentA1Id, targetType: 'comment', action: 'like', active: true }, userB);
  const r2 = createSignedEnvelope({ scope: 'urefy-interaction-v1', targetId: commentA1Id, targetType: 'comment', action: 'like', active: false }, userB);
  const r3 = createSignedEnvelope({ scope: 'urefy-interaction-v1', targetId: commentA1Id, targetType: 'comment', action: 'like', active: true }, userB);

  await fetch(`${BASE_URL}/api/interactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r1) });
  await fetch(`${BASE_URL}/api/interactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r2) });
  const finalR = await fetch(`${BASE_URL}/api/interactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r3) });
  const finalRData = await finalR.json();
  console.log('Final rapid like response:', finalRData);

  const d1Likes = d1Query(`SELECT * FROM interactions WHERE target_type = 'comment' AND target_id = '${commentA1Id}' AND user_fingerprint = '${userB.identity.fingerprint}';`);
  console.log('Interaction rows in D1 for User B on Comment A1:', d1Likes.length);
  results.rapidLike = {
    finalActive: finalRData.active,
    d1RowsCount: d1Likes.length,
    noDuplication: d1Likes.length === 1,
  };

  // ─── 9. COMMENT MERIT VOTING (DELTA RECONCILIATION) ────────────────────────
  console.log('\n[Test 9] Comment Merit Voting by User B (Upvote -> Downvote)...');
  const upEnv = createSignedEnvelope({ action: 'vote-comment', commentId: commentA1Id, direction: 1 }, userB);
  const upRes = await fetch(`${BASE_URL}/api/comments`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(upEnv) });
  const upData = await upRes.json();
  console.log('Upvote result:', upRes.status, upData);

  const downEnv = createSignedEnvelope({ action: 'vote-comment', commentId: commentA1Id, direction: -1 }, userB);
  const downRes = await fetch(`${BASE_URL}/api/comments`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(downEnv) });
  const downData = await downRes.json();
  console.log('Downvote result:', downRes.status, downData);

  results.commentMerit = {
    upvoteStatus: upRes.status,
    upvoteVotes: upData.meritVotes,
    downvoteStatus: downRes.status,
    downvoteVotes: downData.meritVotes,
  };

  // ─── 10. POST REACTIONS: TWO USERS & REACTION REPLACEMENT ──────────────────
  console.log('\n[Test 10] Post Reactions: User A reacts 🔥, User B reacts 💡...');
  const rxA1 = createSignedEnvelope({ scope: 'urefy-interaction-v1', targetId: postId, targetType: 'post', action: 'reaction', active: true, value: '🔥' }, userA);
  const rxB1 = createSignedEnvelope({ scope: 'urefy-interaction-v1', targetId: postId, targetType: 'post', action: 'reaction', active: true, value: '💡' }, userB);

  await fetch(`${BASE_URL}/api/interactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rxA1) });
  await fetch(`${BASE_URL}/api/interactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rxB1) });

  const rxGetA = await (await fetch(`${BASE_URL}/api/interactions?targetId=${postId}&userFingerprint=${userA.identity.fingerprint}`)).json();
  console.log('User A reactions view:', rxGetA.reactions);

  console.log('User A switches reaction to ❤️...');
  const rxA2 = createSignedEnvelope({ scope: 'urefy-interaction-v1', targetId: postId, targetType: 'post', action: 'reaction', active: true, value: '❤️' }, userA);
  await fetch(`${BASE_URL}/api/interactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rxA2) });

  const rxGetAfter = await (await fetch(`${BASE_URL}/api/interactions?targetId=${postId}&userFingerprint=${userA.identity.fingerprint}`)).json();
  console.log('Reactions view after User A changed reaction:', rxGetAfter.reactions);

  const d1Rx = d1Query(`SELECT user_fingerprint, value FROM interactions WHERE target_type = 'post' AND target_id = '${postId}' AND interaction_type = 'reaction';`);
  console.log('D1 Reactions in DB:', d1Rx);

  results.reactions = {
    reactionsList: rxGetAfter.reactions,
    d1Rows: d1Rx,
    fireCount: rxGetAfter.reactions?.find(r => r.emoji === '🔥')?.count || 0,
    heartCount: rxGetAfter.reactions?.find(r => r.emoji === '❤️')?.count || 0,
    lightCount: rxGetAfter.reactions?.find(r => r.emoji === '💡')?.count || 0,
  };

  // ─── 11. AWARDS & ANTI-SELF-AWARD & DUPLICATE CHECKS ───────────────────────
  console.log('\n[Test 11] Awards: User A attempts Self-Award on post (must fail 400)...');
  const selfAwardEnv = createSignedEnvelope({
    scope: 'urefy-interaction-v1',
    targetId: postId,
    targetType: 'post',
    action: 'award',
    active: true,
    value: 'GOLD',
    targetAuthorId: 'fake_target_bypass_attempt',
  }, userA);
  const selfAwardRes = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selfAwardEnv),
  });
  const selfAwardData = await selfAwardRes.json();
  console.log('Self-award attempt status:', selfAwardRes.status, selfAwardData);
  results.selfAwardPost = {
    status: selfAwardRes.status,
    rejected: selfAwardRes.status === 400,
    error: selfAwardData.error,
  };

  console.log('\n[Test 11b] User B awards User A post with GOLD...');
  const validAwardEnv = createSignedEnvelope({
    scope: 'urefy-interaction-v1',
    targetId: postId,
    targetType: 'post',
    action: 'award',
    active: true,
    value: 'GOLD',
  }, userB);
  const validAwardRes = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validAwardEnv),
  });
  const validAwardData = await validAwardRes.json();
  console.log('Peer award status:', validAwardRes.status, validAwardData);
  results.peerAwardPost = {
    status: validAwardRes.status,
    success: validAwardData.success,
  };

  console.log('\n[Test 11c] User B attempts duplicate GOLD award on same post (must fail 400)...');
  const dupAwardEnv = createSignedEnvelope({
    scope: 'urefy-interaction-v1',
    targetId: postId,
    targetType: 'post',
    action: 'award',
    active: true,
    value: 'GOLD',
  }, userB);
  const dupAwardRes = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dupAwardEnv),
  });
  const dupAwardData = await dupAwardRes.json();
  console.log('Duplicate award status:', dupAwardRes.status, dupAwardData);
  results.duplicateAward = {
    status: dupAwardRes.status,
    rejected: dupAwardRes.status === 400,
    error: dupAwardData.error,
  };

  console.log('\n[Test 11d] User A awards Comment B1 with SILVER...');
  const commAwardEnv = createSignedEnvelope({
    scope: 'urefy-interaction-v1',
    targetId: commentB1Id,
    targetType: 'comment',
    action: 'award',
    active: true,
    value: 'SILVER',
  }, userA);
  const commAwardRes = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(commAwardEnv),
  });
  const commAwardData = await commAwardRes.json();
  console.log('Comment award status:', commAwardRes.status, commAwardData);
  results.commentAward = {
    status: commAwardRes.status,
    success: commAwardData.success,
  };

  // ─── 12. POST DELETION & SECURITY & HTTP 410 GONE ──────────────────────────
  console.log('\n[Test 12] Post Deletion Security...');
  console.log('Non-author User B attempts to delete post (must fail 403)...');
  const bDelEnv = createSignedEnvelope({ action: 'delete-post', postId }, userB);
  const bDelRes = await fetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bDelEnv),
  });
  const bDelData = await bDelRes.json();
  console.log('Non-author delete status:', bDelRes.status, bDelData);
  results.nonAuthorDelete = { status: bDelRes.status, error: bDelData.error };

  console.log('Unsigned delete attempt (must fail 401)...');
  const unsignedRes = await fetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId }),
  });
  const unsignedData = await unsignedRes.json();
  console.log('Unsigned delete status:', unsignedRes.status, unsignedData);
  results.unsignedDelete = { status: unsignedRes.status, error: unsignedData.error };

  console.log('Author User A deletes post...');
  const aDelEnv = createSignedEnvelope({ action: 'delete-post', postId }, userA);
  const aDelRes = await fetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aDelEnv),
  });
  const aDelData = await aDelRes.json();
  console.log('Author delete status:', aDelRes.status, aDelData);
  results.authorDelete = { status: aDelRes.status, data: aDelData };

  console.log('Replay delete envelope (must fail 401)...');
  const replayRes = await fetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aDelEnv),
  });
  const replayData = await replayRes.json();
  console.log('Replay delete status:', replayRes.status, replayData);
  results.replayDelete = { status: replayRes.status, error: replayData.error };

  console.log('Querying deleted post via GET /api/posts/:id...');
  const getDelRes = await fetch(`${BASE_URL}/api/posts/${postId}`, { headers: { Accept: 'application/json' } });
  console.log('GET /api/posts/:id status:', getDelRes.status);
  results.deletedGetApi = { status: getDelRes.status };

  console.log('Querying deleted post via public SEO route /p/:id...');
  const seoRes = await fetch(`${BASE_URL}/p/${postId}`);
  console.log('GET /p/:id status:', seoRes.status);
  console.log('  Content-Type:', seoRes.headers.get('content-type'));
  console.log('  X-Robots-Tag:', seoRes.headers.get('x-robots-tag'));
  const seoBody = await seoRes.text();
  console.log('  Body:', seoBody);
  results.seoHttp410 = {
    status: seoRes.status,
    xRobotsTag: seoRes.headers.get('x-robots-tag'),
    body: seoBody,
  };

  const d1PostStatus = d1Query(`SELECT id, status FROM posts WHERE id = '${postId}';`);
  console.log('D1 Post row status:', d1PostStatus);
  results.d1PostStatus = d1PostStatus[0]?.status;

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  SUMMARY OF API LEVEL EVIDENCE:');
  console.log(JSON.stringify(results, null, 2));
  console.log('════════════════════════════════════════════════════════════════');
}

run().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
