import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSignedEnvelope, createSovereignIdentity } from '@aetheris/core-crypto';
import { onRequestPost, onRequestGet, onRequestDelete } from '../functions/api/comments.js';
import { resetReplayNonceCache } from '../functions/api/_auth.js';
import { createProductDatabase } from './helpers/product-database.js';

describe('authenticated discussion persistence', () => {
  let fixture: ReturnType<typeof createProductDatabase>;
  const owner = createSovereignIdentity();
  const stranger = createSovereignIdentity();
  const request = (body: unknown, method = 'POST') => new Request('https://example.test/api/comments', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const env = () => ({ DB: fixture.database, ENVIRONMENT: 'production' });
  const create = (extra = {}) => createSignedEnvelope({ action: 'create-comment', postId: 'post-a', content: 'A durable reply', ...extra }, owner);
  beforeEach(() => {
    resetReplayNonceCache();
    fixture = createProductDatabase();
    for (const id of ['post-a', 'post-b']) fixture.sqlite.prepare('INSERT INTO posts (id, channel_id, author_id, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, 'c/general', owner.identity.fingerprint, id, 'Public discussion', Date.now());
  });
  afterEach(() => fixture.sqlite.close());

  it('refuses unsigned creation and deletion impersonation', async () => {
    const forged = { postId: 'post-a', content: 'Impersonated', authorId: owner.identity.fingerprint, authorRole: 'GUARDIAN' };
    expect((await onRequestPost({ request: request(forged), env: env() })).status).toBe(401);
    expect((await onRequestDelete({ request: request({ id: 'comment-a', userId: owner.identity.fingerprint }, 'DELETE'), env: env() })).status).toBe(401);
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM comments').get()?.n).toBe(0);
  });

  it('uses signed content and identity, and only server-assigned roles', async () => {
    const response = await onRequestPost({ request: request({ envelope: create({ authorId: 'forged', authorRole: 'GUARDIAN' }), content: 'tampered outside envelope', postId: 'post-b' }), env: env() });
    expect(response.status).toBe(201);
    const data = await response.json() as any;
    expect(data.comment).toMatchObject({ postId: 'post-a', content: 'A durable reply', authorId: owner.identity.fingerprint, authorRole: 'MEMBER' });
    expect(fixture.sqlite.prepare('SELECT content FROM comments').get()?.content).toBe('A durable reply');
  });

  it('rejects modified signatures and replay after a nonce-cache reset', async () => {
    const envelope = create();
    const tampered = structuredClone(envelope);
    tampered.payload.content = 'Changed';
    expect((await onRequestPost({ request: request(tampered), env: env() })).status).toBe(401);
    expect((await onRequestPost({ request: request(envelope), env: env() })).status).toBe(201);
    resetReplayNonceCache();
    expect((await onRequestPost({ request: request(envelope), env: env() })).status).toBe(401);
    expect(fixture.sqlite.prepare('SELECT reply_count FROM posts WHERE id = ?').get('post-a')?.reply_count).toBe(1);
  });

  it('retains nesting and exact counts through reload and deletion', async () => {
    const root = await (await onRequestPost({ request: request(create()), env: env() })).json() as any;
    const child = await (await onRequestPost({ request: request(create({ parentId: root.comment.id, content: 'Nested reply' })), env: env() })).json() as any;
    const response = await onRequestGet({ request: new Request('https://example.test/api/comments?postId=post-a'), env: env() });
    const data = await response.json() as any;
    expect(data.comments).toHaveLength(2);
    expect(data.comments.find((comment: any) => comment.id === child.comment.id).parentId).toBe(root.comment.id);
    expect(fixture.sqlite.prepare('SELECT reply_count FROM posts WHERE id = ?').get('post-a')?.reply_count).toBe(2);
    const deleted = await onRequestDelete({ request: request(createSignedEnvelope({ action: 'delete-comment', id: child.comment.id }, owner), 'DELETE'), env: env() });
    expect(deleted.status).toBe(200);
    expect(fixture.sqlite.prepare('SELECT reply_count FROM posts WHERE id = ?').get('post-a')?.reply_count).toBe(1);
  });

  it('refuses a stranger deleting a comment even with a forged userId', async () => {
    const root = await (await onRequestPost({ request: request(create()), env: env() })).json() as any;
    const response = await onRequestDelete({ request: request(createSignedEnvelope({ action: 'delete-comment', id: root.comment.id, userId: owner.identity.fingerprint }, stranger), 'DELETE'), env: env() });
    expect(response.status).toBe(403);
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM comments').get()?.n).toBe(1);
  });

  it('rejects cross-discussion parents, missing posts and action confusion', async () => {
    const root = await (await onRequestPost({ request: request(create()), env: env() })).json() as any;
    expect((await onRequestPost({ request: request(create({ postId: 'post-b', parentId: root.comment.id })), env: env() })).status).toBe(400);
    expect((await onRequestPost({ request: request(create({ postId: 'missing' })), env: env() })).status).toBe(404);
    expect((await onRequestPost({ request: request(create({ action: 'delete-comment' })), env: env() })).status).toBe(400);
  });

  it('fails closed for quarantined accounts and private draft discussions', async () => {
    fixture.sqlite.prepare('INSERT INTO user_roles (fingerprint, role, is_quarantined, updated_at) VALUES (?, ?, ?, ?)').run(owner.identity.fingerprint, 'MODERATOR', 1, Date.now());
    expect((await onRequestPost({ request: request(create()), env: env() })).status).toBe(403);
    fixture.sqlite.exec("UPDATE posts SET status = 'draft' WHERE id = 'post-a'");
    expect((await onRequestGet({ request: new Request('https://example.test/api/comments?postId=post-a'), env: env() })).status).toBe(404);
  });

  it('returns success for an acknowledged comment when notification storage fails', async () => {
    fixture.sqlite.exec('DROP TABLE notifications');
    const response = await onRequestPost({ request: request(createSignedEnvelope({ action: 'create-comment', postId: 'post-a', content: 'Still stored' }, stranger)), env: env() });
    expect(response.status).toBe(201);
    expect(fixture.sqlite.prepare('SELECT content FROM comments').get()?.content).toBe('Still stored');
  });
});
