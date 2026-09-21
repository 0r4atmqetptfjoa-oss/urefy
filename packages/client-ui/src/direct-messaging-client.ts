import {
  canonicalizeJson,
  createSignedEnvelope,
  decryptDirectMessage,
  decryptRatchetedDirectMessage,
  deserializeDoubleRatchetSession,
  encryptRatchetedDirectMessage,
  initiateReceiverDMSession,
  initiateSenderDMSession,
  serializeDoubleRatchetSession,
  verifyDirectMessageRegistration,
  type DirectMessageBootstrap,
  type DirectMessageFrameV2,
  type DirectMessageKeyRegistration,
  type DirectMessageSendPayload,
  type DoubleRatchetSession,
  type SovereignIdentity,
  type SovereignKeyPairSet,
  type SovereignSignedEnvelope,
} from '@aetheris/core-crypto';
import type { DirectMessageAttachment } from './client-state.js';
import { validateMessageContext, type MessageContext } from './conversation-context.js';
import { secureStorage } from './secure-storage.js';

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
  setPermission?(policy: 'everyone' | 'following' | 'shared' | 'nobody'): Promise<void>;
  lookup?(fingerprint: string): Promise<SovereignIdentity & { dmPermission?: string }>;
  getDeviceId?(): Promise<string>;
  setActivePeerDevice?(peerFP: string, peerDeviceId: string): Promise<void>;
  getActivePeerDevice?(peerFP: string): Promise<string | null>;
  registerDevice?(label?: string): Promise<{ deviceId: string; status: string }>;
  revokeDevice?(deviceId: string): Promise<boolean>;
  listDevices?(fingerprint?: string): Promise<Array<{ deviceId: string; status: string; label?: string; createdAt: number }>>;
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

class AsyncMutex {
  private queue: Promise<void> = Promise.resolve();

  public acquire<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.then(() => {}, () => {});
    return next;
  }
}

const localLocks = new Map<string, AsyncMutex>();

function getLocalLock(name: string): AsyncMutex {
  let lock = localLocks.get(name);
  if (!lock) {
    lock = new AsyncMutex();
    localLocks.set(name, lock);
  }
  return lock;
}

export async function withLock<T>(lockName: string, fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(lockName, () => fn());
  }
  return getLocalLock(lockName).acquire(fn);
}

export class DirectMessagingClient implements PrivateMessageTransport {
  private registeredKey = '';
  private sentMessagesCache = new Map<string, PrivateMessageContent>();
  private processedMessageIds = new Set<string>();
  private pendingSends = new Map<string, { content: string; payload: DirectMessageSendPayload; nextSession: DoubleRatchetSession }>();

  constructor(
    private readonly getKeys: () => Promise<SovereignKeyPairSet>,
    private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis)
  ) {}

  public async owner(): Promise<SovereignIdentity> {
    return (await this.getKeys()).identity;
  }

  private async post(envelope: SovereignSignedEnvelope): Promise<any> {
    const response = await this.fetcher('/api/direct-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) {
      throw new Error(typeof result?.error === 'string' ? result.error : 'Private messaging service is unavailable');
    }
    return result;
  }

  public async register(): Promise<SovereignIdentity> {
    const keys = await this.getKeys();
    const key = canonicalizeJson(keys.identity);
    if (this.registeredKey !== key) {
      await this.post(createSignedEnvelope({ action: 'register', identity: keys.identity }, keys));
      if (canonicalizeJson((await this.getKeys()).identity) !== key) {
        throw new Error('Identity changed while enabling private messaging');
      }
      this.registeredKey = key;
    }
    return keys.identity;
  }

  public async setPermission(policy: 'everyone' | 'following' | 'shared' | 'nobody'): Promise<void> {
    await this.register();
    const keys = await this.getKeys();
    const result = await this.post(createSignedEnvelope({ action: 'set-permission', dmPermission: policy }, keys));
    if (result?.success !== true) throw new Error(result?.error || 'Failed to update DM permission');
  }

  private peerIdentityCache = new Map<string, SovereignIdentity & { dmPermission?: string }>();

  public async lookup(fingerprint: string): Promise<SovereignIdentity & { dmPermission?: string }> {
    const cached = this.peerIdentityCache.get(fingerprint);
    if (cached) return cached;
    await this.register();
    const result = await this.post(createSignedEnvelope({ action: 'lookup', fingerprint }, await this.getKeys()));
    const registration = result.registration as SovereignSignedEnvelope<DirectMessageKeyRegistration>;
    if (!registration || !verifyDirectMessageRegistration(registration, fingerprint)) {
      throw new Error('Recipient encryption keys could not be authenticated');
    }
    const identity = registration.payload.identity as SovereignIdentity & { dmPermission?: string };
    identity.dmPermission = result.dmPermission || 'everyone';
    this.peerIdentityCache.set(fingerprint, identity);
    return identity;
  }

  private cachedDeviceId: string | null = null;

  public async getDeviceId(): Promise<string> {
    if (this.cachedDeviceId) return this.cachedDeviceId;
    let stored = await secureStorage.getPrivateState<string>('dm_local_device_id');
    if (!stored || typeof stored !== 'string' || stored.length < 8) {
      const randBytes = crypto.getRandomValues(new Uint8Array(8));
      let hex = '';
      for (let i = 0; i < randBytes.length; i++) {
        hex += randBytes[i].toString(16).padStart(2, '0');
      }
      stored = `dev_${hex}`;
      await secureStorage.savePrivateState('dm_local_device_id', stored);
    }
    this.cachedDeviceId = stored;
    return stored;
  }

  private getRatchetStorageKey(ownerFP: string, peerFP: string, peerDeviceId?: string): string {
    if (peerDeviceId && peerDeviceId !== 'default') {
      return `dm_ratchet_${ownerFP}_${peerFP}_${peerDeviceId}`;
    }
    return `dm_ratchet_${ownerFP}_${peerFP}`;
  }

  private async loadRatchetSession(ownerFP: string, peerFP: string, peerDeviceId?: string): Promise<DoubleRatchetSession | null> {
    if (peerDeviceId && peerDeviceId !== 'default') {
      const devKey = `dm_ratchet_${ownerFP}_${peerFP}_${peerDeviceId}`;
      const serialized = await secureStorage.getPrivateState<string>(devKey);
      if (serialized) {
        try {
          return deserializeDoubleRatchetSession(serialized);
        } catch {
          console.warn(`[DirectMessagingClient] Corrupted ratchet session for ${peerFP}:${peerDeviceId}`);
        }
      }
    }
    const fallbackKey = `dm_ratchet_${ownerFP}_${peerFP}`;
    const serialized = await secureStorage.getPrivateState<string>(fallbackKey);
    if (!serialized) return null;
    try {
      return deserializeDoubleRatchetSession(serialized);
    } catch {
      console.warn(`[DirectMessagingClient] Corrupted ratchet session for ${peerFP}`);
      return null;
    }
  }

  private async saveRatchetSession(ownerFP: string, peerFP: string, session: DoubleRatchetSession, peerDeviceId?: string): Promise<void> {
    const key = this.getRatchetStorageKey(ownerFP, peerFP, peerDeviceId);
    const serialized = serializeDoubleRatchetSession(session);
    await secureStorage.savePrivateState(key, serialized);
    if (peerDeviceId && peerDeviceId !== 'default') {
      await secureStorage.savePrivateState(`dm_active_device_${ownerFP}_${peerFP}`, peerDeviceId);
    }
  }

  private cacheSentMessage(id: string, content: PrivateMessageContent): void {
    if (this.sentMessagesCache.size > 500) {
      const first = this.sentMessagesCache.keys().next().value;
      if (first !== undefined) this.sentMessagesCache.delete(first);
    }
    this.sentMessagesCache.set(id, content);
  }

  public async send(recipient: string, content: PrivateMessageContent): Promise<PrivateMessageDelivery> {
    validateContent(content);
    await this.register();
    const keys = await this.getKeys();
    const ownerFP = keys.identity.fingerprint;
    const localDeviceId = await this.getDeviceId();
    const lockName = `urefy_dm_ratchet_${ownerFP}_${recipient}`;

    return await withLock(lockName, async () => {
      const activePeerDeviceId = await secureStorage.getPrivateState<string>(`dm_active_device_${ownerFP}_${recipient}`);
      const pendingKey = `${ownerFP}:${recipient}:${activePeerDeviceId || 'default'}`;
      const serialized = canonicalizeJson(content);
      let pending = this.pendingSends.get(pendingKey);
      let envelope: SovereignSignedEnvelope<DirectMessageSendPayload>;
      let updatedSession: DoubleRatchetSession;

      if (pending && pending.content === serialized) {
        envelope = createSignedEnvelope(pending.payload, keys);
        updatedSession = pending.nextSession;
      } else {
        const peer = await this.lookup(recipient);
        if (peer.dmPermission === 'nobody') {
          throw new Error('Recipient does not accept direct messages');
        }
        const { dmPermission: _perm, ...cleanPeer } = peer;

        let session = await this.loadRatchetSession(ownerFP, recipient, activePeerDeviceId || undefined);
        let bootstrap: DirectMessageBootstrap | undefined;

        if (!session) {
          const init = initiateSenderDMSession(keys, cleanPeer as SovereignIdentity);
          session = init.session;
          bootstrap = init.bootstrap;
        }

        const enc = await encryptRatchetedDirectMessage(
          content,
          session,
          keys,
          cleanPeer as SovereignIdentity,
          bootstrap,
          {
            senderDeviceId: localDeviceId,
            recipientDeviceId: activePeerDeviceId || undefined,
          }
        );
        envelope = enc.envelope;
        updatedSession = enc.session;
        this.pendingSends.set(pendingKey, {
          content: serialized,
          payload: envelope.payload,
          nextSession: updatedSession,
        });
      }

      if ((await this.getKeys()).identity.signingPublicKey !== keys.identity.signingPublicKey) {
        throw new Error('Identity changed before the message was sent');
      }

      // Save updated ratchet state BEFORE network dispatch
      await this.saveRatchetSession(ownerFP, recipient, updatedSession, activePeerDeviceId || undefined);

      const result = await this.post(envelope);
      if (result.id !== envelope.payload.message.id || !Number.isSafeInteger(result.sequence)) {
        throw new Error('Invalid private message receipt');
      }

      this.cacheSentMessage(result.id, content);
      if (this.pendingSends.get(pendingKey)?.payload.message.id === result.id) {
        this.pendingSends.delete(pendingKey);
      }

      return {
        id: result.id,
        sequence: result.sequence,
        createdAt: result.createdAt,
        sender: ownerFP,
        recipient,
        content,
        envelope,
      };
    });
  }

  public async poll(after: number): Promise<PrivateInboxPage> {
    await this.register();
    const keys = await this.getKeys();
    const ownerFP = keys.identity.fingerprint;
    const localDevId = await this.getDeviceId();
    const result = await this.post(createSignedEnvelope({ action: 'list', after }, keys));
    if (!Array.isArray(result.messages) || !Number.isSafeInteger(result.nextCursor) || result.nextCursor < after) {
      throw new Error('Invalid private inbox response');
    }

    const messages: PrivateMessageDelivery[] = [];
    let rejected = 0;

    for (const record of result.messages) {
      try {
        const envelope = record.envelope as SovereignSignedEnvelope<DirectMessageSendPayload>;
        const frame = envelope?.payload?.message;
        if (!frame) {
          rejected++;
          continue;
        }

        const isSender = frame.sender === ownerFP;
        const peerFP = isSender ? frame.recipient : frame.sender;

        let content: PrivateMessageContent;

        if (frame.version === 1) {
          content = await decryptDirectMessage<PrivateMessageContent>(envelope, keys);
          validateContent(content);
        } else if (frame.version === 2) {
          const v2Frame = frame as DirectMessageFrameV2;
          if (isSender) {
            const cached = this.sentMessagesCache.get(frame.id);
            if (cached) {
              content = cached;
            } else {
              content = { text: '[Encrypted sent message]' };
            }
          } else {
            if (this.processedMessageIds.has(frame.id)) {
              continue;
            }

            // If the message is explicitly targeted to another device of this identity, skip gracefully
            if (v2Frame.recipientDeviceId && v2Frame.recipientDeviceId !== localDevId) {
              content = { text: '[Message delivered to another device of this identity]' };
              messages.push({
                id: frame.id,
                sequence: record.sequence,
                createdAt: record.createdAt,
                sender: frame.sender,
                recipient: frame.recipient,
                content,
                envelope,
              });
              continue;
            }

            const peerDeviceId = v2Frame.senderDeviceId || (v2Frame.ratchetEnvelope?.sessionId ? `sess_${v2Frame.ratchetEnvelope.sessionId.slice(0, 16)}` : 'default');
            const lockName = `urefy_dm_ratchet_${ownerFP}_${peerFP}_${peerDeviceId}`;

            content = await withLock(lockName, async () => {
              let session = await this.loadRatchetSession(ownerFP, peerFP, peerDeviceId);

              let dec: { body: PrivateMessageContent; session: DoubleRatchetSession };
              if (session && !v2Frame.bootstrap) {
                dec = await decryptRatchetedDirectMessage<PrivateMessageContent>(envelope, session, keys);
              } else if (session && v2Frame.bootstrap) {
                try {
                  if (session.receiveCount > 0) {
                    dec = await decryptRatchetedDirectMessage<PrivateMessageContent>(envelope, session, keys);
                  } else {
                    throw new Error('Fallback to bootstrap');
                  }
                } catch {
                  const freshSession = initiateReceiverDMSession(keys, envelope.identity, v2Frame.bootstrap);
                  dec = await decryptRatchetedDirectMessage<PrivateMessageContent>(envelope, freshSession, keys);
                }
              } else {
                if (!v2Frame.bootstrap) {
                  throw new Error(`Missing initial bootstrap for peer ${peerFP}:${peerDeviceId}`);
                }
                const freshSession = initiateReceiverDMSession(keys, envelope.identity, v2Frame.bootstrap);
                dec = await decryptRatchetedDirectMessage<PrivateMessageContent>(envelope, freshSession, keys);
              }

              await this.saveRatchetSession(ownerFP, peerFP, dec.session, peerDeviceId);

              if (this.processedMessageIds.size > 2000) {
                const first = this.processedMessageIds.values().next().value;
                if (first !== undefined) this.processedMessageIds.delete(first);
              }
              this.processedMessageIds.add(frame.id);
              return dec.body;
            });
            validateContent(content);
          }
        } else {
          rejected++;
          continue;
        }

        messages.push({
          id: frame.id,
          sequence: record.sequence,
          createdAt: record.createdAt,
          sender: frame.sender,
          recipient: frame.recipient,
          content,
          envelope,
        });
      } catch (err) {
        rejected++;
      }
    }

    if ((await this.getKeys()).identity.signingPublicKey !== keys.identity.signingPublicKey) {
      throw new Error('Identity changed while receiving messages');
    }
    return { messages, nextCursor: result.nextCursor, rejected };
  }

  public async decodeEnvelope(envelope: SovereignSignedEnvelope<DirectMessageSendPayload>): Promise<PrivateMessageDelivery> {
    const keys = await this.getKeys();
    const ownerFP = keys.identity.fingerprint;
    const localDevId = await this.getDeviceId();
    const frame = envelope?.payload?.message;
    if (!frame) throw new Error('Invalid message envelope');

    const isSender = frame.sender === ownerFP;
    const peerFP = isSender ? frame.recipient : frame.sender;
    let content: PrivateMessageContent;

    if (frame.version === 1) {
      content = await decryptDirectMessage<PrivateMessageContent>(envelope, keys);
    } else if (frame.version === 2) {
      const v2Frame = frame as DirectMessageFrameV2;
      if (isSender) {
        content = this.sentMessagesCache.get(frame.id) || { text: '[Encrypted sent message]' };
      } else {
        if (v2Frame.recipientDeviceId && v2Frame.recipientDeviceId !== localDevId) {
          content = { text: '[Message delivered to another device of this identity]' };
        } else {
          const peerDeviceId = v2Frame.senderDeviceId || (v2Frame.ratchetEnvelope?.sessionId ? `sess_${v2Frame.ratchetEnvelope.sessionId.slice(0, 16)}` : 'default');
          const lockName = `urefy_dm_ratchet_${ownerFP}_${peerFP}_${peerDeviceId}`;
          content = await withLock(lockName, async () => {
            let session = await this.loadRatchetSession(ownerFP, peerFP, peerDeviceId);
            let dec: { body: PrivateMessageContent; session: DoubleRatchetSession };
            if (session && !v2Frame.bootstrap) {
              dec = await decryptRatchetedDirectMessage<PrivateMessageContent>(envelope, session, keys);
            } else {
              if (!v2Frame.bootstrap) throw new Error('Cannot decode without active session or bootstrap');
              const freshSession = initiateReceiverDMSession(keys, envelope.identity, v2Frame.bootstrap);
              dec = await decryptRatchetedDirectMessage<PrivateMessageContent>(envelope, freshSession, keys);
            }
            await this.saveRatchetSession(ownerFP, peerFP, dec.session, peerDeviceId);
            return dec.body;
          });
        }
      }
    } else {
      throw new Error('Unsupported direct message frame version');
    }

    validateContent(content);
    if (!Number.isFinite(envelope.timestamp)) throw new Error('Invalid message timestamp');
    return {
      id: frame.id,
      sequence: 0,
      createdAt: envelope.timestamp,
      sender: frame.sender,
      recipient: frame.recipient,
      content,
      envelope,
    };
  }

  public async registerDevice(label?: string): Promise<{ deviceId: string; status: string }> {
    const keys = await this.getKeys();
    const deviceId = await this.getDeviceId();
    const result = await this.post(createSignedEnvelope({
      action: 'register-device',
      deviceId,
      deviceLabel: label || 'Web Browser',
      timestamp: Date.now(),
    }, keys));
    return { deviceId, status: result?.status || 'active' };
  }

  public async revokeDevice(deviceId: string): Promise<boolean> {
    const keys = await this.getKeys();
    const result = await this.post(createSignedEnvelope({
      action: 'revoke-device',
      deviceId,
      timestamp: Date.now(),
    }, keys));
    return result?.success === true;
  }

  public async listDevices(fingerprint?: string): Promise<Array<{ deviceId: string; status: string; label?: string; createdAt: number }>> {
    const keys = await this.getKeys();
    const targetFP = fingerprint || keys.identity.fingerprint;
    const result = await this.post(createSignedEnvelope({
      action: 'list-devices',
      fingerprint: targetFP,
    }, keys));
    return Array.isArray(result?.devices) ? result.devices : [];
  }

  public async setActivePeerDevice(peerFP: string, peerDeviceId: string): Promise<void> {
    const keys = await this.getKeys();
    await secureStorage.savePrivateState(`dm_active_device_${keys.identity.fingerprint}_${peerFP}`, peerDeviceId);
  }

  public async getActivePeerDevice(peerFP: string): Promise<string | null> {
    const keys = await this.getKeys();
    return (await secureStorage.getPrivateState<string>(`dm_active_device_${keys.identity.fingerprint}_${peerFP}`)) ?? null;
  }
}
