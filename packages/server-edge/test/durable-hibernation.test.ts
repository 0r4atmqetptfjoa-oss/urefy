import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SovereignRelayDurableObject,
} from '../src/durable-hibernation.js';
import {
  DurableObjectState,
  DurableObjectStorage,
  createWebSocketUpgradeResponse,
} from '../src/relay-durable-object.js';
import { ZKRLN, Field } from '@aetheris/core-crypto';

// ─── MOCK IMPLEMENTATIONS FOR CLOUDFLARE DURABLE OBJECTS & HIBERNATION ───────

class MockStorage implements DurableObjectStorage {
  private data = new Map<string, any>();
  private scheduledAlarm: number | null = null;

  async get<T = unknown>(key: string): Promise<T | undefined> {
    return this.data.get(key);
  }

  async getMany<T = unknown>(keys: string[]): Promise<Map<string, T>> {
    const res = new Map<string, T>();
    for (const k of keys) {
      if (this.data.has(k)) res.set(k, this.data.get(k));
    }
    return res;
  }

  async put<T = unknown>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void> {
    if (typeof keyOrEntries === 'string') {
      this.data.set(keyOrEntries, value);
    } else {
      for (const [k, v] of Object.entries(keyOrEntries)) {
        this.data.set(k, v);
      }
    }
  }

  async delete(keyOrKeys: string | string[]): Promise<any> {
    if (Array.isArray(keyOrKeys)) {
      let count = 0;
      for (const k of keyOrKeys) {
        if (this.data.delete(k)) count++;
      }
      return count;
    }
    return this.data.delete(keyOrKeys);
  }

  async deleteAll(): Promise<void> {
    this.data.clear();
  }

  async list<T = unknown>(options?: { prefix?: string }): Promise<Map<string, T>> {
    const res = new Map<string, T>();
    for (const [k, v] of this.data) {
      if (!options?.prefix || k.startsWith(options.prefix)) {
        res.set(k, v);
      }
    }
    return res;
  }

  async getAlarm(): Promise<number | null> {
    return this.scheduledAlarm;
  }

  async setAlarm(scheduledTime: number | Date): Promise<void> {
    this.scheduledAlarm = typeof scheduledTime === 'number' ? scheduledTime : scheduledTime.getTime();
  }

  async deleteAlarm(): Promise<void> {
    this.scheduledAlarm = null;
  }
}

class MockWebSocket {
  public readyState: number = 1; // 1 = OPEN
  public sentMessages: string[] = [];
  public listeners: Record<string, Function[]> = {};

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = 3; // CLOSED
    this.emit('close', { code: code || 1000, reason: reason || 'Normal Closure', wasClean: true });
  }

  addEventListener(type: string, listener: Function) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: Function) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
  }

  emit(type: string, event: any) {
    const list = this.listeners[type] || [];
    for (const fn of list) {
      fn(event);
    }
  }

  getLastMessageParsed(): any {
    if (this.sentMessages.length === 0) return null;
    return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
  }

  getAllMessagesParsed(): any[] {
    return this.sentMessages.map((m) => JSON.parse(m));
  }
}

class MockHibernationDurableObjectState implements DurableObjectState {
  public id = { toString: () => 'sovereign-matrix-relay-do', name: 'sovereign-matrix-relay-do' };
  public storage = new MockStorage();
  public acceptedSockets: MockWebSocket[] = [];
  public socketTags = new Map<MockWebSocket, Set<string>>();

  waitUntil(promise: Promise<any>): void {
    promise.catch(() => {});
  }

  acceptWebSocket(ws: any, tags?: string[]): void {
    this.acceptedSockets.push(ws);
    const tagSet = new Set(tags || []);
    this.socketTags.set(ws, tagSet);
  }

  getWebSockets(tag?: string): WebSocket[] {
    if (!tag) {
      return this.acceptedSockets.filter((s) => s.readyState === 1) as unknown as WebSocket[];
    }
    return this.acceptedSockets.filter((s) => {
      const tags = this.socketTags.get(s);
      return s.readyState === 1 && tags && tags.has(tag);
    }) as unknown as WebSocket[];
  }

  getTags(ws: WebSocket): string[] {
    const tags = this.socketTags.get(ws as unknown as MockWebSocket);
    return tags ? Array.from(tags) : [];
  }

  setWebSocketTags(ws: WebSocket, tags: string[]): void {
    this.socketTags.set(ws as unknown as MockWebSocket, new Set(tags));
  }
}

describe('SovereignRelayDurableObject — Cloudflare WebSocket Hibernation API', () => {
  let mockState: MockHibernationDurableObjectState;
  let relayDO: SovereignRelayDurableObject;
  let mockEnv: any;

  beforeEach(() => {
    mockState = new MockHibernationDurableObjectState();
    mockEnv = {};
    relayDO = new SovereignRelayDurableObject(mockState, mockEnv);
  });

  describe('1. Connection Hibernation & WebSocket Acceptance', () => {
    it('accepts incoming connection into hibernation context via state.acceptWebSocket(ws, tags)', async () => {
      const clientWs = new MockWebSocket();
      const serverWs = new MockWebSocket();

      (globalThis as any).WebSocketPair = function () {
        return [clientWs, serverWs];
      };

      const req = new Request('https://edge.aetheris.network/ws?channelId=relays-general&circleId=pulse-dev', {
        headers: { Upgrade: 'websocket' },
      });

      const res = await relayDO.fetch(req);
      expect(res.status).toBe(101);

      // Verify that serverWs was accepted by state.acceptWebSocket with expected initial tags
      expect(mockState.acceptedSockets).toContain(serverWs);
      const tags = mockState.getTags(serverWs as unknown as WebSocket);
      expect(tags).toContain('channel:relays-general');
      expect(tags).toContain('circle:pulse-dev');
    });

    it('returns 426 when HTTP request is not a WebSocket upgrade', async () => {
      const req = new Request('https://edge.aetheris.network/ws', { method: 'GET' });
      const res = await relayDO.fetch(req);
      expect(res.status).toBe(426);
      const data = await res.json();
      expect(data.mode).toBe('WebSocket Hibernation Engine');
    });

    it('serves /stats and /channels REST queries without waking unnecessary isolates', async () => {
      const statsReq = new Request('https://edge.aetheris.network/stats');
      const statsRes = await relayDO.fetch(statsReq);
      expect(statsRes.status).toBe(200);
      const stats = await statsRes.json();
      expect(stats.status).toBe('online');
      expect(stats.architecture).toContain('Hibernation');

      const chReq = new Request('https://edge.aetheris.network/channels');
      const chRes = await relayDO.fetch(chReq);
      expect(chRes.status).toBe(200);
      const channels = await chRes.json();
      expect(Array.isArray(channels)).toBe(true);
      expect(channels.some((c: any) => c.id === 'relays-general')).toBe(true);
    });
  });

  describe('2. Tag-based Multicasting and Zero-Overhead Group Messaging', () => {
    it('queries WebSockets by circle tag and channel tag with state.getWebSockets()', () => {
      const wsChannel1 = new MockWebSocket();
      const wsChannel2 = new MockWebSocket();
      const wsCircleOnly = new MockWebSocket();

      mockState.acceptWebSocket(wsChannel1, ['channel:relays-general', 'circle:circle-a']);
      mockState.acceptWebSocket(wsChannel2, ['channel:relays-general', 'circle:circle-b']);
      mockState.acceptWebSocket(wsCircleOnly, ['channel:relays-dev', 'circle:circle-a']);

      const channelSockets = relayDO.getSocketsForChannel('relays-general');
      expect(channelSockets).toHaveLength(2);
      expect(channelSockets).toContain(wsChannel1);
      expect(channelSockets).toContain(wsChannel2);
      expect(channelSockets).not.toContain(wsCircleOnly);

      const circleASockets = relayDO.getSocketsForCircle('circle-a');
      expect(circleASockets).toHaveLength(2);
      expect(circleASockets).toContain(wsChannel1);
      expect(circleASockets).toContain(wsCircleOnly);
      expect(circleASockets).not.toContain(wsChannel2);
    });

    it('multicasts pre-serialized payloads to specific tags without broadcasting to unrelated sockets', () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      const wsUnrelated = new MockWebSocket();

      mockState.acceptWebSocket(ws1, ['circle:sovereign-alpha']);
      mockState.acceptWebSocket(ws2, ['circle:sovereign-alpha']);
      mockState.acceptWebSocket(wsUnrelated, ['circle:sovereign-beta']);

      const sentCount = relayDO.multicastToCircle('sovereign-alpha', {
        type: 'CIRCLE_EVENT',
        data: 'Mesh encrypted update',
      });

      expect(sentCount).toBe(2);
      expect(ws1.sentMessages).toHaveLength(1);
      expect(ws2.sentMessages).toHaveLength(1);
      expect(wsUnrelated.sentMessages).toHaveLength(0);

      const parsed = ws1.getLastMessageParsed();
      expect(parsed.type).toBe('CIRCLE_EVENT');
      expect(parsed.data).toBe('Mesh encrypted update');
    });

    it('excludes sending socket when multicasting with excludeWs', () => {
      const senderWs = new MockWebSocket();
      const peerWs = new MockWebSocket();

      mockState.acceptWebSocket(senderWs, ['channel:relays-general']);
      mockState.acceptWebSocket(peerWs, ['channel:relays-general']);

      relayDO.multicastToChannel(
        'relays-general',
        { type: 'PEER_PULSE', message: 'Hello sovereign network' },
        senderWs as unknown as WebSocket
      );

      expect(senderWs.sentMessages).toHaveLength(0);
      expect(peerWs.sentMessages).toHaveLength(1);
    });
  });

  describe('3. Hibernation Wakeup on Message & State Routing', () => {
    it('wakes isolate on AUTH message, updates tags on hibernated socket and registers presence', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws, ['channel:relays-general']);

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'genesis-core',
          nullifier: 'nullifier-valid-001',
          role: 'GUARDIAN',
          channelId: 'relays-general',
          circleId: 'pulse-matrix',
        })
      );

      const lastMsg = ws.getLastMessageParsed();
      expect(lastMsg.type).toBe('AUTH_SUCCESS');
      expect(lastMsg.fingerprint).toBe('genesis-core');
      expect(lastMsg.role).toBe('GUARDIAN');

      // Tags should have been updated
      const updatedTags = mockState.getTags(ws as unknown as WebSocket);
      expect(updatedTags).toContain('user:genesis-core');
      expect(updatedTags).toContain('role:GUARDIAN');
      expect(updatedTags).toContain('circle:pulse-matrix');
    });

    it('wakes isolate on JOIN_CIRCLE and LEAVE_CIRCLE, modifying tags dynamically', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws, ['channel:relays-general']);

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'JOIN_CIRCLE',
          circleId: 'circle-cryptography',
        })
      );

      expect(mockState.getTags(ws as unknown as WebSocket)).toContain('circle:circle-cryptography');
      expect(ws.getLastMessageParsed().type).toBe('CIRCLE_JOINED');

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'LEAVE_CIRCLE',
          circleId: 'circle-cryptography',
        })
      );

      expect(mockState.getTags(ws as unknown as WebSocket)).not.toContain('circle:circle-cryptography');
    });

    it('wakes isolate on SEND_MESSAGE and multicasts verified message to channel members', async () => {
      const senderWs = new MockWebSocket();
      const receiverWs = new MockWebSocket();

      mockState.acceptWebSocket(senderWs, ['channel:relays-general']);
      mockState.acceptWebSocket(receiverWs, ['channel:relays-general']);

      await relayDO.webSocketMessage(
        senderWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          authorFingerprint: 'genesis-core',
          ciphertext: 'Encrypted payload over MLS TreeKEM ratchet',
        })
      );

      // Sender gets ACK
      const ack = senderWs.getLastMessageParsed();
      expect(ack.type).toBe('MESSAGE_ACK');
      expect(ack.status).toBe('verified');

      // Receiver gets NEW_MESSAGE
      const recMsg = receiverWs.getLastMessageParsed();
      expect(recMsg.type).toBe('NEW_MESSAGE');
      expect(recMsg.message.ciphertext).toBe('Encrypted payload over MLS TreeKEM ratchet');
    });
  });

  describe('4. ZK-RLN Spam Defense & Slashing on Hibernation Wakeup', () => {
    it('detects duplicate epoch share, slashes identity, persists revoked nullifier, and broadcasts QUARANTINE_ALERT', async () => {
      const spammerWs = new MockWebSocket();
      const peerWs = new MockWebSocket();

      mockState.acceptWebSocket(spammerWs, ['channel:relays-general']);
      mockState.acceptWebSocket(peerWs, ['channel:relays-general']);

      // Setup ZK-RLN secret and identity
      const secretKey = Field.hashToField('spammer-secret-seed-value');
      const nullifier = ZKRLN.computeNullifier(secretKey);
      const epoch = '#999';

      // First valid message in epoch
      const share1 = ZKRLN.createShare(secretKey, epoch, 'First legitimate message');

      await relayDO.webSocketMessage(
        spammerWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          authorFingerprint: 'spammer-node',
          nullifier,
          epoch,
          x: share1.x,
          y: share1.y,
          ciphertext: 'First legitimate message',
        })
      );

      expect(spammerWs.getLastMessageParsed().type).toBe('MESSAGE_ACK');
      expect(relayDO.getActiveShares().size).toBe(1);

      // Spammer double-broadcasts in the exact same epoch with different content
      const share2 = ZKRLN.createShare(secretKey, epoch, 'Second spam broadcast');

      await relayDO.webSocketMessage(
        spammerWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          authorFingerprint: 'spammer-node',
          nullifier,
          epoch,
          x: share2.x,
          y: share2.y,
          ciphertext: 'Second spam message',
        })
      );

      // Spammer should receive SLASHING_NOTICE
      const slashNotice = spammerWs.getLastMessageParsed();
      expect(slashNotice.type).toBe('SLASHING_NOTICE');
      expect(slashNotice.nullifier).toBe(nullifier);
      expect(slashNotice.extractedSecretKey).toBe(Field.mod(secretKey).toString(16).padStart(64, '0'));

      // Peer should receive QUARANTINE_ALERT
      const quarantineAlert = peerWs.getLastMessageParsed();
      expect(quarantineAlert.type).toBe('QUARANTINE_ALERT');
      expect(quarantineAlert.nullifier).toBe(nullifier);

      // Offender nullifier is marked revoked
      expect(relayDO.getRevokedNullifiers().has(nullifier)).toBe(true);

      // Attempting third message with revoked nullifier is rejected immediately
      await relayDO.webSocketMessage(
        spammerWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          authorFingerprint: 'spammer-node',
          nullifier,
          epoch: '#1000',
          ciphertext: 'Third message after being slashed',
        })
      );

      const rejectedNotice = spammerWs.getLastMessageParsed();
      expect(rejectedNotice.type).toBe('ERROR');
      expect(rejectedNotice.isQuarantined).toBe(true);
      expect(rejectedNotice.message).toContain('revoked');
    });
  });

  describe('5. webSocketClose Disconnection Clean-Up', () => {
    it('removes socket and presence on webSocketClose', async () => {
      const ws = new MockWebSocket();
      const peerWs = new MockWebSocket();

      mockState.acceptWebSocket(ws, ['channel:relays-general']);
      mockState.acceptWebSocket(peerWs, ['channel:relays-general']);

      // Authenticate
      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'disconnecting-peer',
          role: 'MEMBER',
          channelId: 'relays-general',
        })
      );

      expect(relayDO.getPresence().has('disconnecting-peer')).toBe(true);

      // Close socket
      await relayDO.webSocketClose(ws as unknown as WebSocket, 1000, 'Normal closure');

      expect(relayDO.getPresence().has('disconnecting-peer')).toBe(false);

      // Peer receives PRESENCE_LEAVE
      const leaveNotice = peerWs.getLastMessageParsed();
      expect(leaveNotice.type).toBe('PRESENCE_LEAVE');
      expect(leaveNotice.fingerprint).toBe('disconnecting-peer');
    });
  });
});
