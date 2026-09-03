import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RelayDurableObject,
  DurableObjectState,
  DurableObjectStorage,
  createWebSocketUpgradeResponse,
} from '../src/relay-durable-object.js';
import worker from '../src/worker.js';
import { generateKeyPair, ZKRLN, Field } from '@aetheris/core-crypto';

// ─── MOCK IMPLEMENTATIONS FOR CLOUDFLARE DURABLE OBJECTS & WEBSOCKETS ────────

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
  public tags: Set<string> = new Set();

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

class MockDurableObjectState implements DurableObjectState {
  public id = { toString: () => 'do-room-matrix-alpha', name: 'room-matrix-alpha' };
  public storage = new MockStorage();
  public acceptedSockets: MockWebSocket[] = [];
  public socketTags = new Map<MockWebSocket, Set<string>>();

  waitUntil(promise: Promise<any>): void {
    // resolve background tasks
    promise.catch(() => {});
  }

  acceptWebSocket(ws: any, tags?: string[]): void {
    this.acceptedSockets.push(ws);
    const tagSet = new Set(tags || []);
    this.socketTags.set(ws, tagSet);
  }

  getWebSockets(tag?: string): WebSocket[] {
    if (!tag) return this.acceptedSockets.filter((s) => s.readyState === 1) as unknown as WebSocket[];
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

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('Cloudflare Durable Objects — RelayDurableObject & WebSocket Hibernation API', () => {
  let mockState: MockDurableObjectState;
  let relayDO: RelayDurableObject;

  beforeEach(() => {
    // Set global WebSocket mock
    (globalThis as any).WebSocket = MockWebSocket;
    (globalThis as any).WebSocket.OPEN = 1;
    (globalThis as any).WebSocket.CLOSED = 3;

    (globalThis as any).WebSocketPair = class {
      0 = new MockWebSocket();
      1 = new MockWebSocket();
    };

    mockState = new MockDurableObjectState();
    relayDO = new RelayDurableObject(mockState, {});
  });

  describe('1. Lifecycle & WebSocket Hibernation API', () => {
    it('handles WebSocket upgrade request and accepts socket into DO hibernation context', async () => {
      const req = new Request('https://relay.aetheris.network/ws', {
        headers: { Upgrade: 'websocket' },
      });

      const res = await relayDO.fetch(req);
      expect(res.status).toBe(101);
      expect((res as any).webSocket).toBeDefined();
      expect(mockState.acceptedSockets.length).toBe(1);
    });

    it('returns 426 Upgrade Required for standard HTTP calls with room metadata', async () => {
      const req = new Request('https://relay.aetheris.network/ws', { method: 'GET' });
      const res = await relayDO.fetch(req);
      expect(res.status).toBe(426);
      const json = await res.json();
      expect(json.service).toContain('Relay Durable Object');
      expect(json.transport).toBe('WebSocket Hibernation API');
    });

    it('serves HTTP REST inspection endpoints (/stats, /channels, /presence, /messages)', async () => {
      // 1. /stats
      const statsReq = new Request('https://relay.aetheris.network/stats');
      const statsRes = await relayDO.fetch(statsReq);
      expect(statsRes.status).toBe(200);
      const statsJson = await statsRes.json();
      expect(statsJson.durableObjectId).toBe('do-room-matrix-alpha');
      expect(statsJson.channelsCount).toBeGreaterThanOrEqual(5);

      // 2. /channels
      const chReq = new Request('https://relay.aetheris.network/channels');
      const chRes = await relayDO.fetch(chReq);
      const chJson = await chRes.json();
      expect(chJson.some((c: any) => c.id === 'relays-general')).toBe(true);

      // 3. /presence
      const presReq = new Request('https://relay.aetheris.network/presence');
      const presRes = await relayDO.fetch(presReq);
      const presJson = await presRes.json();
      expect(presJson.success).toBe(true);
    });
  });

  describe('2. Client Authentication & Presence Matrix', () => {
    it('authenticates user, sets tags, records presence, and sends channel list', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      const userKey = generateKeyPair();
      const userSecret = Field.hashToField('user-secret-key-1');
      const nullifier = ZKRLN.computeNullifier(userSecret);

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: userKey.fingerprint,
          publicKeyHex: userKey.publicKeyHex,
          nullifier,
          role: 'ARCHIVIST',
          status: 'online',
        })
      );

      const msgs = ws.getAllMessagesParsed();
      const authSuccess = msgs.find((m) => m.type === 'AUTH_SUCCESS');
      const channelsList = msgs.find((m) => m.type === 'CHANNELS_LIST');

      expect(authSuccess).toBeDefined();
      expect(authSuccess.fingerprint).toBe(userKey.fingerprint);
      expect(authSuccess.isQuarantined).toBe(false);
      expect(channelsList).toBeDefined();
      expect(channelsList.channels.length).toBeGreaterThanOrEqual(5);

      // Verify Presence Store in Durable Object
      const presence = relayDO.getPresence();
      expect(presence.has(userKey.fingerprint)).toBe(true);
      const user = presence.get(userKey.fingerprint)!;
      expect(user.role).toBe('ARCHIVIST');
      expect(user.status).toBe('online');
    });

    it('broadcasts presence updates and cleans up presence on socket disconnect', async () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      mockState.acceptWebSocket(ws1);
      mockState.acceptWebSocket(ws2);

      // AUTH WS1
      await relayDO.webSocketMessage(
        ws1 as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'peer-alice',
          role: 'MEMBER',
          status: 'online',
        })
      );

      // AUTH WS2
      await relayDO.webSocketMessage(
        ws2 as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'peer-bob',
          role: 'GUARDIAN',
          status: 'online',
        })
      );

      // WS1 receives PRESENCE_UPDATE for peer-bob
      const ws1Msgs = ws1.getAllMessagesParsed();
      const presenceUpdate = ws1Msgs.find((m) => m.type === 'PRESENCE_UPDATE' && m.presence.fingerprint === 'peer-bob');
      expect(presenceUpdate).toBeDefined();
      expect(presenceUpdate.presence.role).toBe('GUARDIAN');

      // Update WS2 status to 'in-call'
      await relayDO.webSocketMessage(
        ws2 as unknown as WebSocket,
        JSON.stringify({
          type: 'PRESENCE_UPDATE',
          status: 'in-call',
          customStatus: 'Audio Session #9',
        })
      );

      const userBob = relayDO.getPresence().get('peer-bob')!;
      expect(userBob.status).toBe('in-call');
      expect(userBob.customStatus).toBe('Audio Session #9');

      // WS2 disconnects
      await relayDO.webSocketClose(ws2 as unknown as WebSocket, 1000, 'User left', true);

      expect(relayDO.getPresence().has('peer-bob')).toBe(false);
      const ws1LeaveMsg = ws1.getAllMessagesParsed().find((m) => m.type === 'PRESENCE_LEAVE' && m.fingerprint === 'peer-bob');
      expect(ws1LeaveMsg).toBeDefined();
    });

    it('answers PRESENCE_QUERY with filtered channel user list', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'peer-querier',
          role: 'MEMBER',
        })
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'PRESENCE_QUERY',
          channelId: 'relays-general',
        })
      );

      const reply = ws.getAllMessagesParsed().find((m) => m.type === 'PRESENCE_LIST');
      expect(reply).toBeDefined();
      expect(reply.channelId).toBe('relays-general');
      expect(Array.isArray(reply.users)).toBe(true);
    });
  });

  describe('3. Channel Join, Leave, and Typing Indicators', () => {
    it('returns seed messages on JOIN_CHANNEL and broadcasts PEER_JOINED', async () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      mockState.acceptWebSocket(ws1);
      mockState.acceptWebSocket(ws2);

      await relayDO.webSocketMessage(
        ws1 as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', fingerprint: 'peer-listener' })
      );
      await relayDO.webSocketMessage(
        ws2 as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', fingerprint: 'peer-joiner' })
      );

      await relayDO.webSocketMessage(
        ws2 as unknown as WebSocket,
        JSON.stringify({ type: 'JOIN_CHANNEL', channelId: 'relays-general' })
      );

      const ws2Msgs = ws2.getAllMessagesParsed();
      const channelData = ws2Msgs.find((m) => m.type === 'CHANNEL_DATA');
      expect(channelData).toBeDefined();
      expect(channelData.channelId).toBe('relays-general');
      expect(channelData.messages.length).toBeGreaterThanOrEqual(3);

      const ws1Msgs = ws1.getAllMessagesParsed();
      const peerJoined = ws1Msgs.find((m) => m.type === 'PEER_JOINED' && m.fingerprint === 'peer-joiner');
      expect(peerJoined).toBeDefined();
    });

    it('relays TYPING_INDICATOR to channel members', async () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      mockState.acceptWebSocket(ws1);
      mockState.acceptWebSocket(ws2);

      await relayDO.webSocketMessage(
        ws1 as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', fingerprint: 'peer-1' })
      );
      await relayDO.webSocketMessage(
        ws2 as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', fingerprint: 'peer-2' })
      );

      await relayDO.webSocketMessage(
        ws1 as unknown as WebSocket,
        JSON.stringify({
          type: 'TYPING_INDICATOR',
          channelId: 'relays-general',
          isTyping: true,
        })
      );

      const typingMsg = ws2.getAllMessagesParsed().find((m) => m.type === 'TYPING_INDICATOR');
      expect(typingMsg).toBeDefined();
      expect(typingMsg.fingerprint).toBe('peer-1');
      expect(typingMsg.isTyping).toBe(true);
    });
  });

  describe('4. ZK-RLN Rate-Limiting & Double-Sign Slashing Detection', () => {
    it('accepts legitimate message with valid ZK-RLN share in an epoch', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      const userSecret = Field.hashToField('secret-valid-user-999');
      const nullifier = ZKRLN.computeNullifier(userSecret);
      const epoch = 'epoch_450';

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'peer-valid-rln',
          nullifier,
        })
      );

      const share = ZKRLN.createShare(userSecret, epoch, 'First legitimate broadcast');

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Encrypted message #1',
          epoch: share.epoch,
          x: share.x,
          y: share.y,
          nullifier: share.nullifier,
        })
      );

      const ack = ws.getAllMessagesParsed().find((m) => m.type === 'MESSAGE_ACK');
      expect(ack).toBeDefined();
      expect(ack.status).toBe('verified');

      const messages = relayDO.getChannelMessages('relays-general');
      expect(messages.some((m) => m.ciphertext === 'Encrypted message #1')).toBe(true);
    });

    it('slashes spammer on duplicate epoch share, extracts secret key via Lagrange interpolation, and broadcasts QUARANTINE_ALERT', async () => {
      const spammerWs = new MockWebSocket();
      const victimWs = new MockWebSocket();
      mockState.acceptWebSocket(spammerWs);
      mockState.acceptWebSocket(victimWs);

      const spammerSecret = Field.hashToField('bad-actor-secret-token-777');
      const nullifier = ZKRLN.computeNullifier(spammerSecret);
      const epoch = 'epoch_collision_test';

      // Spammer AUTH
      await relayDO.webSocketMessage(
        spammerWs as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'spammer-node',
          nullifier,
        })
      );

      // Victim AUTH
      await relayDO.webSocketMessage(
        victimWs as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'innocent-listener',
        })
      );

      // 1. Send Message 1 in epoch
      const share1 = ZKRLN.createShare(spammerSecret, epoch, 'Message 1');
      await relayDO.webSocketMessage(
        spammerWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Legit message 1',
          epoch: share1.epoch,
          x: share1.x,
          y: share1.y,
          nullifier: share1.nullifier,
        })
      );

      // 2. Send Message 2 in the SAME epoch (Duplicate share breach!)
      const share2 = ZKRLN.createShare(spammerSecret, epoch, 'Message 2 Spam Breach');
      await relayDO.webSocketMessage(
        spammerWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Spam attack payload',
          epoch: share2.epoch,
          x: share2.x,
          y: share2.y,
          nullifier: share2.nullifier,
        })
      );

      // Spammer must receive SLASHING_NOTICE
      const spammerMsgs = spammerWs.getAllMessagesParsed();
      const slashingNotice = spammerMsgs.find((m) => m.type === 'SLASHING_NOTICE');
      expect(slashingNotice).toBeDefined();
      expect(slashingNotice.nullifier).toBe(nullifier);

      // The extracted secret key must match the original secret!
      const expectedSecretHex = Field.mod(spammerSecret).toString(16).padStart(64, '0');
      expect(slashingNotice.extractedSecretKey).toBe(expectedSecretHex);

      // Victim must receive global QUARANTINE_ALERT broadcast
      const victimMsgs = victimWs.getAllMessagesParsed();
      const quarantineAlert = victimMsgs.find((m) => m.type === 'QUARANTINE_ALERT');
      expect(quarantineAlert).toBeDefined();
      expect(quarantineAlert.nullifier).toBe(nullifier);
      expect(quarantineAlert.extractedSecretKey).toBe(expectedSecretHex);

      // Verify nullifier is added to revoked set
      expect(relayDO.getRevokedNullifiers().has(nullifier)).toBe(true);

      // 3. Attempting a 3rd message with revoked nullifier must immediately fail with FORBIDDEN/ERROR
      await relayDO.webSocketMessage(
        spammerWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Another spam message',
          nullifier,
        })
      );

      const err = spammerWs.getAllMessagesParsed().find((m) => m.type === 'ERROR' && m.message.includes('revoked'));
      expect(err).toBeDefined();
    });
  });

  describe('5. High-Efficiency Broadcast Performance (Single JSON.stringify)', () => {
    it('distributes message to 500 connected sockets with O(1) single serialization', async () => {
      const sockets: MockWebSocket[] = [];
      const SOCKET_COUNT = 500;

      for (let i = 0; i < SOCKET_COUNT; i++) {
        const ws = new MockWebSocket();
        mockState.acceptWebSocket(ws, ['channel:relays-general']);
        sockets.push(ws);

        await relayDO.webSocketMessage(
          ws as unknown as WebSocket,
          JSON.stringify({ type: 'AUTH', fingerprint: `peer-${i}` })
        );
      }

      const jsonSpy = vi.spyOn(JSON, 'stringify');

      // Broadcast single message
      relayDO.broadcast(
        {
          type: 'NEW_MESSAGE',
          message: { id: 'broadcast-test', text: 'Mass broadcast packet' },
        },
        { channelId: 'relays-general' }
      );

      // Ensure JSON.stringify was called exactly once for broadcast
      expect(jsonSpy).toHaveBeenCalledTimes(1);

      // Verify every socket received the message
      for (const s of sockets) {
        expect(s.sentMessages.some((m) => m.includes('Mass broadcast packet'))).toBe(true);
      }

      jsonSpy.mockRestore();
    });
  });

  describe('6. WebRTC Direct Peer Signaling & Nanopublications', () => {
    it('routes WEBRTC_SIGNAL directly to the target peer fingerprint', async () => {
      const aliceWs = new MockWebSocket();
      const bobWs = new MockWebSocket();
      mockState.acceptWebSocket(aliceWs, ['user:peer-alice']);
      mockState.acceptWebSocket(bobWs, ['user:peer-bob']);

      await relayDO.webSocketMessage(
        aliceWs as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', fingerprint: 'peer-alice' })
      );
      await relayDO.webSocketMessage(
        bobWs as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', fingerprint: 'peer-bob' })
      );

      const sdpSignal = { type: 'offer', sdp: 'v=0\r\no=alice ...' };

      await relayDO.webSocketMessage(
        aliceWs as unknown as WebSocket,
        JSON.stringify({
          type: 'WEBRTC_SIGNAL',
          targetFingerprint: 'peer-bob',
          signal: sdpSignal,
        })
      );

      const bobMsgs = bobWs.getAllMessagesParsed();
      const signalPacket = bobMsgs.find((m) => m.type === 'WEBRTC_SIGNAL');
      expect(signalPacket).toBeDefined();
      expect(signalPacket.fromFingerprint).toBe('peer-alice');
      expect(signalPacket.signal.type).toBe('offer');
    });

    it('publishes and broadcasts verified Nanopublications', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', fingerprint: 'archivist-1' })
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({ type: 'JOIN_CHANNEL', channelId: 'vault-releases' })
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'PUBLISH_NANOPUBLICATION',
          channelId: 'vault-releases',
          title: 'Quantum Ratchet Test Build',
          fileName: 'ratchet-v1.bin',
          byteSize: 102400,
          sha256: 'deadbeef1234567890abcdef',
          crc32: '8FA49B01',
          entropy: 7.82,
          verdict: 'CLEAN',
          merkleRoot: '0102030405060708090a0b0c',
        })
      );

      const npMsg = ws.getAllMessagesParsed().find((m) => m.type === 'NEW_NANOPUBLICATION');
      expect(npMsg).toBeDefined();
      expect(npMsg.nanopublication.fileName).toBe('ratchet-v1.bin');
      expect(npMsg.nanopublication.verdict).toBe('CLEAN');
    });
  });

  describe('7. Cloudflare Worker Automatic Routing (worker.ts)', () => {
    it('seamlessly routes WebSocket requests to Durable Object stub when env.RELAY_DO is present', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createWebSocketUpgradeResponse(new MockWebSocket()));
      const mockGet = vi.fn().mockReturnValue({ fetch: mockFetch });
      const mockIdFromName = vi.fn().mockReturnValue('mock-do-id');

      const mockRelayDoNamespace = {
        idFromName: mockIdFromName,
        get: mockGet,
      };

      const req = new Request('https://worker.aetheris.network/api/ws?roomId=custom-vault-room', {
        headers: { Upgrade: 'websocket' },
      });

      const res = await worker.fetch(req, { RELAY_DO: mockRelayDoNamespace });
      expect(res.status).toBe(101);
      expect(mockIdFromName).toHaveBeenCalledWith('custom-vault-room');
      expect(mockGet).toHaveBeenCalledWith('mock-do-id');
      expect(mockFetch).toHaveBeenCalledWith(req);
    });

    it('falls back to standalone edge WebSocketPair mode when env.RELAY_DO is absent', async () => {
      const req = new Request('https://worker.aetheris.network/api/ws', {
        headers: { Upgrade: 'websocket' },
      });

      const res = await worker.fetch(req, {});
      expect(res.status).toBe(101);
      expect((res as any).webSocket).toBeDefined();
    });

    it('returns worker edge health information on /health', async () => {
      const req = new Request('https://worker.aetheris.network/health');
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('healthy');
      expect(json.service).toContain('Aetheris');
    });
  });
});
