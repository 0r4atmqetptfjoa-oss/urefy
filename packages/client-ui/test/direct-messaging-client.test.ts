import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSovereignIdentity } from '@aetheris/core-crypto';
import { DirectMessagingClient } from '../src/direct-messaging-client.js';
import { onRequestPost } from '../functions/api/direct-messages.js';
import { resetReplayNonceCache } from '../functions/api/_auth.js';
import { createDmDatabase } from './helpers/dm-database.js';

describe('Direct messaging clients against the real API handler', () => {
  let fixture: ReturnType<typeof createDmDatabase>;
  let fetcher: typeof fetch;
  beforeEach(() => {
    fixture = createDmDatabase();
    resetReplayNonceCache();
    fetcher = async (url, options) => onRequestPost({ env: { DB: fixture.database, ENVIRONMENT: 'production' }, request: new Request(new URL(String(url), 'https://example.test'), options) });
  });
  afterEach(() => fixture.sqlite.close());

  it('delivers and decrypts a message for two independent identities', async () => {
    const senderKeys = createSovereignIdentity();
    const recipientKeys = createSovereignIdentity();
    const sender = new DirectMessagingClient(async () => senderKeys, fetcher);
    const recipient = new DirectMessagingClient(async () => recipientKeys, fetcher);
    await recipient.register();
    const receipt = await sender.send(recipientKeys.identity.fingerprint, { text: 'Authenticated private message' });
    const inbox = await recipient.poll(0);
    expect(inbox.messages[0].id).toBe(receipt.id);
    expect(inbox.messages[0].content.text).toBe('Authenticated private message');
    expect(inbox.rejected).toBe(0);
    expect((await sender.poll(0)).messages[0].content.text).toBe('Authenticated private message');
    expect((await recipient.poll(inbox.nextCursor)).messages).toEqual([]);
  });

  it('retries a lost acknowledgment without duplicating the encrypted message', async () => {
    const senderKeys = createSovereignIdentity();
    const recipientKeys = createSovereignIdentity();
    await new DirectMessagingClient(async () => recipientKeys, fetcher).register();
    let loseAcknowledgment = true;
    const unreliableFetch: typeof fetch = async (url, options) => {
      const response = await fetcher(url, options);
      if (JSON.parse(String(options?.body)).payload.action === 'send' && loseAcknowledgment) {
        loseAcknowledgment = false;
        throw new Error('Acknowledgment lost');
      }
      return response;
    };
    const sender = new DirectMessagingClient(async () => senderKeys, unreliableFetch);
    await expect(sender.send(recipientKeys.identity.fingerprint, { text: 'Retry safely' })).rejects.toThrow('Acknowledgment lost');
    await sender.send(recipientKeys.identity.fingerprint, { text: 'Retry safely' });
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM direct_messages').get()?.count).toBe(1);
  });

  it('does not claim delivery to an unregistered recipient', async () => {
    const senderKeys = createSovereignIdentity();
    const recipientKeys = createSovereignIdentity();
    const sender = new DirectMessagingClient(async () => senderKeys, fetcher);
    await expect(sender.send(recipientKeys.identity.fingerprint, { text: 'Not delivered' })).rejects.toThrow('not enabled');
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM direct_messages').get()?.count).toBe(0);
  });
});