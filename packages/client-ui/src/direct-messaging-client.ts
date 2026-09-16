import { canonicalizeJson, createSignedEnvelope, decryptDirectMessage, encryptDirectMessage, verifyDirectMessageRegistration, type DirectMessageKeyRegistration, type DirectMessageSendPayload, type SovereignIdentity, type SovereignKeyPairSet, type SovereignSignedEnvelope } from '@aetheris/core-crypto';
import type { DirectMessageAttachment } from './client-state.js';
import { validateMessageContext, type MessageContext } from './conversation-context.js';

export const MAX_PRIVATE_ATTACHMENT_BYTES = 128 * 1024;

export interface PrivateMessageContent {
  text: string;
  attachment?: DirectMessageAttachment;
  context?: MessageContext;
}

export interface PrivateMessageDelivery {
  id: string;
  sequence: number;
  createdAt: number;
  sender: string;
  recipient: string;
  content: PrivateMessageContent;
  envelope: SovereignSignedEnvelope<DirectMessageSendPayload>;
}

export interface PrivateInboxPage {
  messages: PrivateMessageDelivery[];
  nextCursor: number;
  rejected: number;
}

export interface PrivateMessageTransport {
  owner(): Promise<SovereignIdentity>;
  register(): Promise<SovereignIdentity>;
  send(recipient: string, content: PrivateMessageContent): Promise<PrivateMessageDelivery>;
  poll(after: number): Promise<PrivateInboxPage>;
  decodeEnvelope(envelope: SovereignSignedEnvelope<DirectMessageSendPayload>): Promise<PrivateMessageDelivery>;
}

function validateContent(content: PrivateMessageContent): void {
  if (!content || typeof content.text !== 'string') throw new Error('Invalid private message content');
  if (content.context !== undefined) validateMessageContext(content.context);
  const attachment = content.attachment;
  if (attachment && (typeof attachment.name !== 'string' || attachment.name.length > 255 ||
      typeof attachment.dataUrl !== 'string' || !/^data:[a-z0-9.+/-]+;base64,[a-z0-9+/]*={0,2}$/i.test(attachment.dataUrl) ||
      !Number.isSafeInteger(attachment.size) || attachment.size < 0 || attachment.size > MAX_PRIVATE_ATTACHMENT_BYTES)) {
    throw new Error('Private attachments must be valid files no larger than 128 KiB');
  }
}

export class DirectMessagingClient implements PrivateMessageTransport {
  private registeredKey = '';
  private pendingSends = new Map<string, { content: string; payload: DirectMessageSendPayload }>();

  constructor(private readonly getKeys: () => Promise<SovereignKeyPairSet>, private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis)) {}

  public async owner(): Promise<SovereignIdentity> {
    return (await this.getKeys()).identity;
  }

  private async post(envelope: SovereignSignedEnvelope): Promise<any> {
    const response = await this.fetcher('/api/direct-messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope), cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) throw new Error(typeof result?.error === 'string' ? result.error : 'Private messaging service is unavailable');
    return result;
  }

  public async register(): Promise<SovereignIdentity> {
    const keys = await this.getKeys();
    const key = canonicalizeJson(keys.identity);
    if (this.registeredKey !== key) {
      await this.post(createSignedEnvelope({ action: 'register', identity: keys.identity }, keys));
      if (canonicalizeJson((await this.getKeys()).identity) !== key) throw new Error('Identity changed while enabling private messaging');
      this.registeredKey = key;
    }
    return keys.identity;
  }

  public async lookup(fingerprint: string): Promise<SovereignIdentity> {
    await this.register();
    const result = await this.post(createSignedEnvelope({ action: 'lookup', fingerprint }, await this.getKeys()));
    const registration = result.registration as SovereignSignedEnvelope<DirectMessageKeyRegistration>;
    if (!registration || !verifyDirectMessageRegistration(registration, fingerprint)) throw new Error('Recipient encryption keys could not be authenticated');
    return registration.payload.identity;
  }

  public async send(recipient: string, content: PrivateMessageContent): Promise<PrivateMessageDelivery> {
    validateContent(content);
    await this.register();
    const keys = await this.getKeys();
    const pendingKey = `${keys.identity.fingerprint}:${recipient}`;
    const serialized = canonicalizeJson(content);
    let pending = this.pendingSends.get(pendingKey);
    if (!pending || pending.content !== serialized) {
      const peer = await this.lookup(recipient);
      const encrypted = await encryptDirectMessage(content, keys, peer);
      pending = { content: serialized, payload: encrypted.payload };
      this.pendingSends.set(pendingKey, pending);
    }
    if ((await this.getKeys()).identity.signingPublicKey !== keys.identity.signingPublicKey) throw new Error('Identity changed before the message was sent');
    const envelope = createSignedEnvelope(pending.payload, keys);
    const result = await this.post(envelope);
    if (result.id !== envelope.payload.message.id || !Number.isSafeInteger(result.sequence)) throw new Error('Invalid private message receipt');
    if (this.pendingSends.get(pendingKey)?.payload.message.id === result.id) this.pendingSends.delete(pendingKey);
    return { id: result.id, sequence: result.sequence, createdAt: result.createdAt, sender: keys.identity.fingerprint, recipient, content, envelope };
  }

  public async poll(after: number): Promise<PrivateInboxPage> {
    await this.register();
    const keys = await this.getKeys();
    const result = await this.post(createSignedEnvelope({ action: 'list', after }, keys));
    if (!Array.isArray(result.messages) || !Number.isSafeInteger(result.nextCursor) || result.nextCursor < after) throw new Error('Invalid private inbox response');
    const messages: PrivateMessageDelivery[] = [];
    let rejected = 0;
    for (const record of result.messages) {
      try {
        const envelope = record.envelope as SovereignSignedEnvelope<DirectMessageSendPayload>;
        const content = await decryptDirectMessage<PrivateMessageContent>(envelope, keys);
        validateContent(content);
        messages.push({ id: envelope.payload.message.id, sequence: record.sequence, createdAt: record.createdAt, sender: envelope.payload.message.sender, recipient: envelope.payload.message.recipient, content, envelope });
      } catch { rejected++; }
    }
    if ((await this.getKeys()).identity.signingPublicKey !== keys.identity.signingPublicKey) throw new Error('Identity changed while receiving messages');
    return { messages, nextCursor: result.nextCursor, rejected };
  }

  public async decodeEnvelope(envelope: SovereignSignedEnvelope<DirectMessageSendPayload>): Promise<PrivateMessageDelivery> {
    const content = await decryptDirectMessage<PrivateMessageContent>(envelope, await this.getKeys());
    validateContent(content);
    if (!Number.isFinite(envelope.timestamp)) throw new Error('Invalid message timestamp');
    return { id: envelope.payload.message.id, sequence: 0, createdAt: envelope.timestamp,
      sender: envelope.payload.message.sender, recipient: envelope.payload.message.recipient, content, envelope };
  }
}
