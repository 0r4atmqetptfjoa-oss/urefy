import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSignedEnvelope, createSovereignIdentity } from '@aetheris/core-crypto';
import { createProductDatabase } from './helpers/product-database.js';
import { resetReplayNonceCache } from '../functions/api/_auth.js';
import { onRequestPost as interact, onRequestGet as getInteractions } from '../functions/api/interactions.js';
import { onRequestPost as community, onRequestGet as communities } from '../functions/api/communities.js';
import { onRequestGet as notifications, onRequestPatch as markRead, onRequestDelete as clear, onRequestPost as forgeNotification } from '../functions/api/notifications.js';
import { allocateStorage, getAccountStorage, releaseStorage, validateUploadMime } from '../functions/api/_storage-accounting.js';
import { onRequestPost as upload, onRequestDelete as deleteFile, resetEdgeStorage, globalEdgeStorageMap } from '../functions/api/storage.js';
import { onRequestPost as saveProfile, onRequestGet as getProfile } from '../functions/api/profiles.js';
import { onRequestPost as follow, onRequestDelete as unfollow } from '../functions/api/follows.js';
import { onRequestPost as mutatePost } from '../functions/api/posts.js';

describe('production product integrity against canonical D1 schema', () => {
  let fixture: ReturnType<typeof createProductDatabase>;
  const alice = createSovereignIdentity();
  const bob = createSovereignIdentity();
  const env = () => ({ DB: fixture.database, ENVIRONMENT: 'production' });
  const request = (path: string, payload: unknown, keys = alice, method = 'POST') => new Request(`https://urefy.com/api/${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createSignedEnvelope(payload, keys)) });
  const action = (type: string, active: boolean, value?: string) => request('interactions', { scope: 'urefy-interaction-v1', targetId: 'post', targetType: 'post', action: type, active, value });
  beforeEach(() => {
    resetReplayNonceCache(); resetEdgeStorage(); fixture = createProductDatabase();
    fixture.sqlite.prepare('INSERT INTO posts (id, channel_id, author_id, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('post', 'c/general', alice.identity.fingerprint, 'Discussion', 'Public content', Date.now());
    fixture.sqlite.prepare('INSERT INTO communities (id, name, display_name, category, channel_id, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('community', 'general', 'General', 'General', 'c/general', Date.now());
    fixture.sqlite.prepare('INSERT INTO notifications (id, user_id, actor_id, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('notification', alice.identity.fingerprint, bob.identity.fingerprint, 'reply_post', 0, Date.now());
  });
  afterEach(() => fixture.sqlite.close());

  it('rejects unsigned and forged post interactions', async () => {
    const unsigned = new Request('https://urefy.com/api/interactions', { method: 'POST', body: JSON.stringify({ targetId: 'post', userFingerprint: alice.identity.fingerprint, action: 'repost', active: true }) });
    expect((await interact({ request: unsigned, env: env() })).status).toBe(401);
    const signed = createSignedEnvelope({ targetId: 'post', action: 'repost' }, alice);
    signed.payload.targetId = 'tampered';
    expect((await interact({ request: new Request('https://urefy.com/api/interactions', { method: 'POST', body: JSON.stringify(signed) }), env: env() })).status).toBe(401);
  });
  it('legacy merit votes are idempotent, removable, and cannot use arbitrary weights', async () => {
    for (const direction of [1, 1, 0, -1]) expect((await mutatePost({ request: request('posts', { action: 'vote', postId: 'post', direction }), env: env() })).status).toBe(200);
    expect(fixture.sqlite.prepare("SELECT merit_votes FROM posts WHERE id = 'post'").get()?.merit_votes).toBe(-1);
    expect((await mutatePost({ request: request('posts', { action: 'vote', postId: 'post', direction: 1000 }), env: env() })).status).toBe(400);
  });
  it('does not accept arbitrary nullifiers as anonymous voting proofs in production', async () => {
    const response = await mutatePost({ request: new Request('https://urefy.com/api/posts', { method: 'POST', body: JSON.stringify({ action: 'anonymous-vote', postId: 'post', nullifier: 'invented-nullifier', direction: 1 }) }), env: env() });
    expect(response.status).toBe(503);
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM votes').get()?.n).toBe(0);
  });
  it('reposting is idempotent under duplicate requests and undo survives reload', async () => {
    const responses = await Promise.all([interact({ request: action('repost', true), env: env() }), interact({ request: action('repost', true), env: env() })]);
    expect(responses.map(response => response.status)).toEqual([200, 200]);
    expect(fixture.sqlite.prepare("SELECT COUNT(*) AS n FROM interactions WHERE interaction_type = 'repost'").get()?.n).toBe(1);
    expect(fixture.sqlite.prepare('SELECT boost_count FROM posts').get()?.boost_count).toBe(1);
    const reload = await (await getInteractions({ request: new Request(`https://urefy.com/api/interactions?postId=post&userFingerprint=${alice.identity.fingerprint}`), env: env() })).json();
    expect(reload.userInteractions.reposted).toBe(true);
    expect((await (await interact({ request: action('repost', false), env: env() })).json()).newCount).toBe(0);
    expect(fixture.sqlite.prepare('SELECT boost_count FROM posts').get()?.boost_count).toBe(0);
  });
  it('replaces a reaction transactionally instead of storing multiple reactions per person', async () => {
    await interact({ request: action('reaction', true, '👍'), env: env() });
    await interact({ request: action('reaction', true, '💡'), env: env() });
    const rows = fixture.sqlite.prepare("SELECT value FROM interactions WHERE interaction_type = 'reaction'").all();
    expect(rows).toHaveLength(1); expect(rows[0].value).toBe('💡');
    await interact({ request: action('reaction', false, '💡'), env: env() });
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM interactions').get()?.n).toBe(0);
  });
  it('rejects unavailable posts, quarantined accounts and oversized read batches', async () => {
    fixture.sqlite.exec("UPDATE posts SET status = 'draft'");
    expect((await interact({ request: action('like', true), env: env() })).status).toBe(404);
    fixture.sqlite.exec("UPDATE posts SET status = 'published'");
    fixture.sqlite.prepare('INSERT INTO user_roles (fingerprint, is_quarantined, updated_at) VALUES (?, 1, ?)').run(alice.identity.fingerprint, Date.now());
    expect((await interact({ request: action('like', true), env: env() })).status).toBe(403);
    expect((await getInteractions({ request: new Request(`https://urefy.com/api/interactions?postIds=${Array.from({ length: 51 }, (_, i) => i).join(',')}`), env: env() })).status).toBe(400);
  });
  it('uses signed membership identity and hydrates exact membership after leave', async () => {
    const join = (who = alice) => request('communities', { scope: 'urefy-community-v1', action: 'join', communityId: 'community', userId: bob.identity.fingerprint }, who);
    expect((await community({ request: new Request('https://urefy.com/api/communities', { method: 'POST', body: JSON.stringify({ action: 'join', communityId: 'community', userId: bob.identity.fingerprint }) }), env: env() })).status).toBe(401);
    expect((await community({ request: join(), env: env() })).status).toBe(200);
    expect(fixture.sqlite.prepare('SELECT user_id FROM community_members').get()?.user_id).toBe(alice.identity.fingerprint);
    let data = await (await communities({ request: new Request(`https://urefy.com/api/communities?userId=${alice.identity.fingerprint}`), env: env() })).json();
    expect(data.communities[0]).toMatchObject({ isMember: true, membersCount: 1 });
    await community({ request: request('communities', { scope: 'urefy-community-v1', action: 'leave', communityId: 'community' }), env: env() });
    data = await (await communities({ request: new Request(`https://urefy.com/api/communities?userId=${alice.identity.fingerprint}`), env: env() })).json();
    expect(data.communities[0]).toMatchObject({ isMember: false, membersCount: 0 });
  });
  it('keeps marked synthetic communities out of public discovery while preserving direct audit access', async () => {
    const payload = {
      scope: 'urefy-community-v1',
      action: 'create',
      name: 'pass9-fixture',
      displayName: 'PASS 9 Fixture',
      description: 'Deterministic closed beta fixture',
      syntheticTest: true,
      environment: 'test',
      cleanupRunId: 'pass9-completion-20260921',
    };
    expect((await community({ request: request('communities', payload), env: env() })).status).toBe(201);
    const listing = await (await communities({ request: new Request('https://urefy.com/api/communities'), env: env() })).json();
    expect(listing.communities.map((item: any) => item.id)).not.toContain('c-pass9-fixture');
    const direct = await (await communities({ request: new Request('https://urefy.com/api/communities?id=c-pass9-fixture'), env: env() })).json();
    expect(direct.community).toMatchObject({
      id: 'c-pass9-fixture',
      syntheticTest: true,
      environment: 'test',
      cleanupRunId: 'pass9-completion-20260921',
    });
  });
  it('keeps notifications private and read/delete operations owner-scoped', async () => {
    expect((await notifications({ request: new Request(`https://urefy.com/api/notifications?userId=${alice.identity.fingerprint}`), env: env() })).status).toBe(401);
    const read = (who = alice) => new Request(`https://urefy.com/api/notifications?userId=${alice.identity.fingerprint}`, { headers: { 'X-Sovereign-Envelope': JSON.stringify(createSignedEnvelope({ scope: 'urefy-notifications-v1', action: 'list' }, who)) } });
    expect((await notifications({ request: read(bob), env: env() })).status).toBe(403);
    await markRead({ request: request('notifications', { scope: 'urefy-notifications-v1', action: 'mark-read', markAll: true, userId: alice.identity.fingerprint }, bob, 'PATCH'), env: env() });
    expect(fixture.sqlite.prepare('SELECT is_read FROM notifications').get()?.is_read).toBe(0);
    await markRead({ request: request('notifications', { scope: 'urefy-notifications-v1', action: 'mark-read', markAll: true }, alice, 'PATCH'), env: env() });
    const response = await notifications({ request: read(), env: env() });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect((await response.json()).unreadCount).toBe(0);
    await clear({ request: request('notifications', { scope: 'urefy-notifications-v1', action: 'clear', clearAll: true }, alice, 'DELETE'), env: env() });
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM notifications').get()?.n).toBe(0);
  });
  it('profile edits authenticate the owner, reject tampering and survive a fresh read', async () => {
    const payload = { scope: 'urefy-profile-v1', action: 'save', displayName: 'Alice', handle: 'alice_test', userId: bob.identity.fingerprint, bio: 'A public biography' };
    const unsigned = new Request('https://urefy.com/api/profiles', { method: 'POST', body: JSON.stringify(payload) });
    expect((await saveProfile({ request: unsigned, env: env() })).status).toBe(401);
    expect((await saveProfile({ request: request('profiles', payload), env: env() })).status).toBe(200);
    expect(fixture.sqlite.prepare('SELECT user_id FROM user_profiles').get()?.user_id).toBe(alice.identity.fingerprint);
    const result = await (await getProfile({ request: new Request(`https://urefy.com/api/profiles?userId=${alice.identity.fingerprint}`), env: env() })).json();
    expect(result.profile).toMatchObject({ displayName: 'Alice', bio: 'A public biography' });
  });
  it('follow/unfollow cannot be performed on behalf of another identity', async () => {
    expect((await follow({ request: request('follows', { action: 'follow', followingId: bob.identity.fingerprint, followerId: 'forged' }), env: env() })).status).toBe(200);
    expect(fixture.sqlite.prepare('SELECT follower_id FROM follows').get()?.follower_id).toBe(alice.identity.fingerprint);
    const forged = new Request(`https://urefy.com/api/follows?followerId=${alice.identity.fingerprint}&followingId=${bob.identity.fingerprint}`, { method: 'DELETE' });
    expect((await unfollow({ request: forged, env: env() })).status).toBe(401);
    await unfollow({ request: request('follows', { action: 'unfollow', followingId: bob.identity.fingerprint }, alice, 'DELETE'), env: env() });
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM follows').get()?.n).toBe(0);
  });
  it('rejects fabricated moderation notifications', async () => {
    expect((await forgeNotification({ request: request('notifications', { userId: alice.identity.fingerprint, actorId: bob.identity.fingerprint, type: 'mod_action' }, bob), env: { ...env(), ADMIN_PIN: 'test-admin-configured' } })).status).toBe(401);
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM notifications').get()?.n).toBe(1);
  });
  it('atomically enforces account and global quotas, including concurrent in-flight writes', async () => {
    const config = { ...env(), MAX_ACCOUNT_STORAGE_BYTES: 10, MAX_STORAGE_CAP_BYTES: 15 };
    const results = await Promise.all([allocateStorage(config, 'a', 'alice', 6), allocateStorage(config, 'b', 'alice', 6)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await getAccountStorage(config, 'alice')).usedBytes).toBe(6);
    expect(await allocateStorage(config, 'c', 'bob', 10)).toBe(false);
    await releaseStorage(config, results[0] ? 'a' : 'b');
    expect((await getAccountStorage(config, 'alice')).usedBytes).toBe(0);
  });
  it('rejects MIME spoofing and active documents', () => {
    const html = new TextEncoder().encode('<script>alert(1)</script>');
    expect(validateUploadMime('image/png', html)).toBe(false);
    expect(validateUploadMime('image/svg+xml', html)).toBe(false);
    expect(validateUploadMime('application/pdf', html)).toBe(false);
    expect(validateUploadMime('application/octet-stream', html)).toBe(true);
  });
  it('checks quota on actual uploads and releases bytes only after R2 deletion', async () => {
    const objects = new Map<string, any>();
    const bucket = {
      async head(key: string) { return objects.get(key) || null; },
      async put(key: string, data: Uint8Array, options: any) { const item = { key, size: data.byteLength, customMetadata: options.customMetadata }; objects.set(key, item); return item; },
      async delete(key: string | string[]) { for (const k of [key].flat()) objects.delete(k); },
    };
    const config = { ...env(), VAULT_BUCKET: bucket as any, MAX_ACCOUNT_STORAGE_BYTES: 10 };
    const first = await upload({ request: request('storage', { content: '123456', fileName: 'one.txt', contentType: 'text/plain' }), env: config });
    expect(first.status).toBe(201);
    const data = await first.json();
    expect((await upload({ request: request('storage', { content: 'abcdef', fileName: 'two.txt', contentType: 'text/plain' }), env: config })).status).toBe(507);
    expect(objects.size).toBe(1);
    const deletion = await deleteFile({ request: request(`storage?key=${encodeURIComponent(data.key)}`, { action: 'delete', key: data.key }, alice, 'DELETE'), env: config });
    expect(deletion.status).toBe(200);
    expect(objects.size).toBe(0);
    expect(globalEdgeStorageMap.has(data.key)).toBe(false);
    expect((await getAccountStorage(config, alice.identity.fingerprint)).usedBytes).toBe(0);
  });
});
