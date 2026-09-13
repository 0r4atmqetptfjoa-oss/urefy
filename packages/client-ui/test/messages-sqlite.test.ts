import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestGet, onRequestPost } from '../functions/api/messages.js';
import { globalMessagesStore, type D1Database } from '../functions/api/_db.js';

vi.mock('../functions/api/_auth.js', () => ({
  requireAdmin: vi.fn(async () => ({ authorized: true })),
  requireSignedEnvelope: vi.fn(),
}));

describe('Messages persistence against the canonical SQLite schema', () => {
  let sqlite: DatabaseSync;
  let database: D1Database;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(readFileSync(new URL('../functions/schema.sql', import.meta.url), 'utf8'));
    sqlite.exec('DELETE FROM messages');
    database = {
      prepare(query: string) {
        const statement = sqlite.prepare(query);
        let parameters: any[] = [];
        const adapter = {
          bind(...values: any[]) { parameters = values; return adapter; },
          async first() { return statement.get(...parameters) ?? null; },
          async all() { return { success: true, results: statement.all(...parameters), meta: {} }; },
          async run() { return { success: true, meta: statement.run(...parameters) }; },
        };
        return adapter;
      },
    } as unknown as D1Database;
  });

  afterEach(() => {
    sqlite.close();
    for (let index = globalMessagesStore.length - 1; index >= 0; index--) {
      if (globalMessagesStore[index].id.startsWith('sqlite-test-')) globalMessagesStore.splice(index, 1);
    }
  });

  function post(id: string, author = 'original-author', db: D1Database | undefined = database) {
    return onRequestPost({
      env: { DB: db },
      request: new Request('https://example.test/api/messages', {
        method: 'POST',
        body: JSON.stringify({ id, authorFingerprint: author, channelId: 'relays-general', ciphertext: `encrypted-${author}`, createdAt: 1000 }),
      }),
    });
  }

  it('reads the canonical channel and timestamp columns', async () => {
    expect((await post('sqlite-test-read')).status).toBe(201);
    const response = await onRequestGet({
      env: { DB: database },
      request: new Request('https://example.test/api/messages?channelId=relays-general&since=999&limit=1'),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).messages).toMatchObject([{ id: 'sqlite-test-read', ciphertext: 'encrypted-original-author' }]);
  });

  it('rejects a conflicting ID without overwriting its author or ciphertext', async () => {
    expect((await post('sqlite-test-conflict')).status).toBe(201);
    expect((await post('sqlite-test-conflict', 'different-author')).status).toBe(409);
    expect(sqlite.prepare('SELECT author_id, ciphertext FROM messages WHERE id = ?').get('sqlite-test-conflict'))
      .toMatchObject({ author_id: 'original-author', ciphertext: 'encrypted-original-author' });
  });

  it('rejects duplicate IDs in the development memory store', async () => {
    const request = (author: string) => onRequestPost({ request: new Request('https://example.test/api/messages', {
      method: 'POST', body: JSON.stringify({ id: 'sqlite-test-memory', authorFingerprint: author, ciphertext: 'encrypted' }),
    }) });
    expect((await request('original-author')).status).toBe(201);
    expect((await request('different-author')).status).toBe(409);
    expect(globalMessagesStore.find((message) => message.id === 'sqlite-test-memory')?.authorFingerprint).toBe('original-author');
  });

  it.each(['limit=-1', 'limit=0', 'limit=NaN', 'limit=1.5', 'since=invalid', 'since=-1', 'since='])('rejects invalid pagination: %s', async (query) => {
    const response = await onRequestGet({ env: { DB: database }, request: new Request(`https://example.test/api/messages?${query}`) });
    expect(response.status).toBe(400);
  });
});
