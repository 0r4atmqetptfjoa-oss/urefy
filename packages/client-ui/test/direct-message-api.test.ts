import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createSignedEnvelope, createSovereignIdentity, decryptDirectMessage, encryptDirectMessage, type SovereignKeyPairSet } from '@aetheris/core-crypto';
import { onRequestPost } from '../functions/api/direct-messages.js';
import { resetReplayNonceCache } from '../functions/api/_auth.js';
import type { D1Database } from '../functions/api/_db.js';

describe('Private messaging API with real SQLite and signatures', () => {
  let sqlite: DatabaseSync;
  let database: D1Database;
  beforeEach(() => {
    resetReplayNonceCache();
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(readFileSync(new URL('../migrations/0007_direct_messages.sql', import.meta.url), 'utf8'));
    sqlite.exec(readFileSync(new URL('../migrations/0004_used_nonces.sql', import.meta.url), 'utf8'));
    sqlite.exec('CREATE TABLE user_roles (fingerprint TEXT PRIMARY KEY, is_quarantined INTEGER DEFAULT 0); CREATE TABLE system_config (key TEXT PRIMARY KEY, value TEXT);');
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
  afterEach(() => sqlite.close());

  function request(envelope: unknown) {
    return onRequestPost({ env: { DB: database, ENVIRONMENT: 'production' }, request: new Request('https://example.test/api/direct-messages', { method: 'POST', body: JSON.stringify(envelope) }) });
  }

  async function register(owner: SovereignKeyPairSet) {
    const response = await request(createSignedEnvelope({ action: 'register', identity: owner.identity }, owner));
    expect(response.status).toBe(200);
  }

  it('preserves an opt-in v2 signature when persisting and reading a private message', async () => {
    const sender = createSovereignIdentity();
    const recipient = createSovereignIdentity();
    await register(sender);
    await register(recipient);
    const encrypted = await encryptDirectMessage({ text: 'Identity-bound message' }, sender, recipient.identity);
    const bound = createSignedEnvelope(encrypted.payload, sender, { version: 2 });
    expect((await request(bound)).status).toBe(201);
    const inbox = await (await request(createSignedEnvelope({ action: 'list', after: 0 }, recipient))).json();
    expect(inbox.messages[0].envelope.version).toBe(2);
    expect(await decryptDirectMessage(inbox.messages[0].envelope, recipient)).toEqual({ text: 'Identity-bound message' });
  });

  it('persists only ciphertext and returns messages only to participants', async () => {
    const sender = createSovereignIdentity();
    const recipient = createSovereignIdentity();
    const outsider = createSovereignIdentity();
    for (const owner of [sender, recipient, outsider]) await register(owner);
    const envelope = await encryptDirectMessage({ text: 'Private API regression content' }, sender, recipient.identity);
    expect((await request(envelope)).status).toBe(201);
    const row = sqlite.prepare('SELECT envelope_json FROM direct_messages').get()!;
    expect(row.envelope_json).not.toContain('Private API regression content');
    const inbox = await (await request(createSignedEnvelope({ action: 'list', after: 0 }, recipient))).json();
    expect(inbox.messages).toHaveLength(1);
    expect(await decryptDirectMessage(inbox.messages[0].envelope, recipient)).toEqual({ text: 'Private API regression content' });
    const otherInbox = await (await request(createSignedEnvelope({ action: 'list', after: 0 }, outsider))).json();
    expect(otherInbox.messages).toEqual([]);
  });

  it('rejects replay while allowing a fresh signed retry of the same encrypted message', async () => {
    const sender = createSovereignIdentity();
    const recipient = createSovereignIdentity();
    await register(sender);
    await register(recipient);
    const envelope = await encryptDirectMessage({ text: 'Idempotent delivery' }, sender, recipient.identity);
    expect((await request(envelope)).status).toBe(201);
    expect((await request(envelope)).status).toBe(401);
    expect((await request(createSignedEnvelope(envelope.payload, sender))).status).toBe(200);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM direct_messages').get()?.count).toBe(1);
  });

  it('does not accept unsigned requests or plaintext message frames', async () => {
    expect((await request({ payload: { action: 'list' } })).status).toBe(401);
    const sender = createSovereignIdentity();
    await register(sender);
    expect((await request(createSignedEnvelope({ action: 'send', message: { text: 'not encrypted' } }, sender))).status).toBe(400);
  });

  it('rejects modified encryption keys and quarantined senders', async () => {
    const sender = createSovereignIdentity();
    const altered = structuredClone(sender.identity);
    altered.encryptionPublicKey = '01'.repeat(32);
    expect((await request(createSignedEnvelope({ action: 'register', identity: altered }, sender))).status).toBe(400);
    sqlite.prepare('INSERT INTO user_roles (fingerprint, is_quarantined) VALUES (?, 1)').run(sender.identity.fingerprint);
    expect((await request(createSignedEnvelope({ action: 'register', identity: sender.identity }, sender))).status).toBe(403);
  });
});
