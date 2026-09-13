import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RelayDurableObject,
  DurableObjectState,
  DurableObjectStorage,
  createWebSocketUpgradeResponse,
  createRelaySessionToken,
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
  public attachment: any = null;

  serializeAttachment(attachment: any) {
    this.attachment = attachment;
  }

  deserializeAttachment() {
    return this.attachment;
  }

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

      const token = await createRelaySessionToken(
        {
          sub: userKey.fingerprint,
          role: 'ARCHIVIST',
          nullifier,
          aud: 'aetheris-relay',
          exp: Date.now() + 60000,
          iat: Date.now(),
        },
        'aetheris-sovereign-relay-secret'
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          token,
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
      const bobToken = await createRelaySessionToken(
        {
          sub: 'peer-bob',
          role: 'GUARDIAN',
          aud: 'aetheris-relay',
          exp: Date.now() + 60000,
          iat: Date.now(),
        },
        'aetheris-sovereign-relay-secret'
      );
      await relayDO.webSocketMessage(
        ws2 as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          token: bobToken,
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
    it('returns zero demo messages in production on JOIN_CHANNEL and broadcasts PEER_JOINED', async () => {
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
      // Zero demo messages in production!
      expect(channelData.messages.length).toBe(0);

      const ws1Msgs = ws1.getAllMessagesParsed();
      const peerJoined = ws1Msgs.find((m) => m.type === 'PEER_JOINED' && m.fingerprint === 'peer-joiner');
      expect(peerJoined).toBeDefined();
    });

    it('returns seed messages on JOIN_CHANNEL when SIMULATION_MODE is enabled', async () => {
      const simState = new MockDurableObjectState();
      const simDO = new RelayDurableObject(simState, { SIMULATION_MODE: 'true' });
      const ws = new MockWebSocket();
      simState.acceptWebSocket(ws);

      await simDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', fingerprint: 'peer-sim-user' })
      );

      await simDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({ type: 'JOIN_CHANNEL', channelId: 'relays-general' })
      );

      const wsMsgs = ws.getAllMessagesParsed();
      const channelData = wsMsgs.find((m) => m.type === 'CHANNEL_DATA');
      expect(channelData).toBeDefined();
      expect(channelData.channelId).toBe('relays-general');
      expect(channelData.messages.length).toBeGreaterThanOrEqual(3);
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

      // Secret key must NEVER be leaked or broadcast over the wire!
      expect(slashingNotice.extractedSecretKey).toBeUndefined();

      // Victim must receive global QUARANTINE_ALERT broadcast
      const victimMsgs = victimWs.getAllMessagesParsed();
      const quarantineAlert = victimMsgs.find((m) => m.type === 'QUARANTINE_ALERT');
      expect(quarantineAlert).toBeDefined();
      expect(quarantineAlert.nullifier).toBe(nullifier);
      expect(quarantineAlert.extractedSecretKey).toBeUndefined();

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

      const token = await createRelaySessionToken(
        { sub: 'archivist-1', role: 'MEMBER', aud: 'aetheris-relay', exp: Date.now() + 60000, iat: Date.now() },
        'aetheris-sovereign-relay-secret'
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', token })
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
          sha256: 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496',
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
      expect(json.service).toContain('UREfy');
    });
  });

  describe('8. WebSocket Hibernation State Retention & Storage Recovery', () => {
    it('serializes session attachment to WebSocket on AUTH and restores session on isolate wake-up', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      // Authenticate with verified token
      const token = await createRelaySessionToken(
        {
          sub: 'ed25519-hibernation-user-1',
          nullifier: 'nullifier-hib-1',
          role: 'GUARDIAN',
          aud: 'aetheris-relay',
          exp: Date.now() + 60000,
          iat: Date.now(),
        },
        'aetheris-sovereign-relay-secret'
      );
      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          token,
        })
      );

      // Verify attachment was serialized to the socket
      expect(ws.attachment).toBeDefined();
      expect(ws.attachment.fingerprint).toBe('ed25519-hibernation-user-1');
      expect(ws.attachment.role).toBe('GUARDIAN');
      expect(ws.attachment.authenticated).toBe(true);

      // Join channel
      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({ type: 'JOIN_CHANNEL', channelId: 'alpha-ops' })
      );
      expect(ws.attachment.currentChannelId).toBe('alpha-ops');
      expect(ws.attachment.subscribedChannels).toContain('alpha-ops');

      // Simulate Cloudflare Isolate Eviction / Hibernation:
      // A new RelayDurableObject instance is created with the same DO state/storage,
      // simulating isolate eviction and wake-up.
      const freshDO = new RelayDurableObject(mockState, {});

      // Incoming message to the fresh DO instance for this hibernated socket
      await freshDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({ type: 'PING' })
      );

      // Verify that the fresh DO restored session metadata and presence from the socket's attachment!
      const presence = freshDO.getPresence();
      expect(presence.has('ed25519-hibernation-user-1')).toBe(true);
      const user = presence.get('ed25519-hibernation-user-1');
      expect(user?.role).toBe('GUARDIAN');
      expect(user?.joinedChannel).toBe('alpha-ops');
    });

    it('persists messages to DO storage and restores them upon isolate reconstruction', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'ed25519-storage-author',
          nullifier: 'nullifier-store-1',
        })
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Secret encrypted payload across DO hibernation',
          epoch: '#100',
        })
      );

      // Verify message was stored in mockState.storage
      const storedMsgs = await mockState.storage.list({ prefix: 'msg:relays-general:' });
      expect(storedMsgs.size).toBe(1);

      // Simulate new isolate instantiation
      const revivedDO = new RelayDurableObject(mockState, {});
      // Trigger fetch to ensure ensureInitialized() runs
      await revivedDO.fetch(new Request('https://relay.aetheris.network/messages?channelId=relays-general'));

      const messages = revivedDO.getChannelMessages('relays-general');
      expect(messages.some((m) => m.ciphertext === 'Secret encrypted payload across DO hibernation')).toBe(true);
    });

    it('guarantees complete state rehydration after hard isolate reset (Test B: restart persistence)', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'fp-restart-tester',
          nullifier: 'null-restart-1',
        })
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Persistent State Message Alpha',
          epoch: '#200',
        })
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Persistent State Message Beta',
          epoch: '#200',
        })
      );

      // Hard isolate reset: discard old instance completely
      const freshDO = new RelayDurableObject(mockState, {});
      await freshDO.fetch(new Request('https://relay.aetheris.network/messages?channelId=relays-general'));

      const messages = freshDO.getChannelMessages('relays-general');
      expect(messages.some((m) => m.ciphertext === 'Persistent State Message Alpha')).toBe(true);
      expect(messages.some((m) => m.ciphertext === 'Persistent State Message Beta')).toBe(true);
    });

    it('strictly guarantees atomic persistence: storage.put failure rejects message, prevents RAM pollution, and suppresses broadcast', async () => {
      const senderWs = new MockWebSocket();
      const peerWs = new MockWebSocket();
      mockState.acceptWebSocket(senderWs);
      mockState.acceptWebSocket(peerWs);

      // Authenticate sender
      await relayDO.webSocketMessage(
        senderWs as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'fp-atomic-sender',
          nullifier: 'null-atomic-1',
        })
      );

      // Authenticate and join peer
      await relayDO.webSocketMessage(
        peerWs as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'fp-atomic-peer',
          nullifier: 'null-atomic-2',
        })
      );
      await relayDO.webSocketMessage(
        peerWs as unknown as WebSocket,
        JSON.stringify({
          type: 'JOIN_CHANNEL',
          channelId: 'relays-general',
        })
      );

      // Clear peer sent messages
      peerWs.sentMessages = [];
      senderWs.sentMessages = [];

      // Force storage.put failure
      const originalPut = mockState.storage.put.bind(mockState.storage);
      vi.spyOn(mockState.storage, 'put').mockImplementation(async (keyOrEntries: any) => {
        if (typeof keyOrEntries === 'string' && keyOrEntries.startsWith('msg:')) {
          throw new Error('Durable Object simulated disk I/O failure');
        }
        return originalPut(keyOrEntries);
      });

      // Attempt to send message
      await relayDO.webSocketMessage(
        senderWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Message that must never exist in RAM or peers if storage fails',
          epoch: '#999',
        })
      );

      // 1. Sender must receive ERROR
      const errorMsg = senderWs.sentMessages.find((m) => {
        try {
          const parsed = JSON.parse(m);
          return parsed.type === 'ERROR' && parsed.message.includes('persist message to durable storage');
        } catch {
          return false;
        }
      });
      expect(errorMsg).toBeDefined();

      // 2. Sender must NOT receive MESSAGE_ACK
      const ackMsg = senderWs.sentMessages.find((m) => {
        try {
          return JSON.parse(m).type === 'MESSAGE_ACK';
        } catch {
          return false;
        }
      });
      expect(ackMsg).toBeUndefined();

      // 3. Peer must NOT receive any broadcast of this message
      const peerBroadcast = peerWs.sentMessages.find((m) => {
        try {
          const parsed = JSON.parse(m);
          return parsed.type === 'NEW_MESSAGE' && parsed.message?.ciphertext?.includes('must never exist');
        } catch {
          return false;
        }
      });
      expect(peerBroadcast).toBeUndefined();

      // 4. In-memory channelMessages cache must NOT contain this message
      const memMessages = relayDO.getChannelMessages('relays-general');
      expect(memMessages.some((m) => m.ciphertext.includes('must never exist'))).toBe(false);

      // 5. Restore storage.put and check hard isolate reset - message is totally absent
      vi.restoreAllMocks();
      const revivedDO = new RelayDurableObject(mockState, {});
      await revivedDO.fetch(new Request('https://relay.aetheris.network/messages?channelId=relays-general'));
      const revivedMessages = revivedDO.getChannelMessages('relays-general');
      expect(revivedMessages.some((m) => m.ciphertext.includes('must never exist'))).toBe(false);
    });

    it('rejects HTTP fetch with 503 and WebSocket messages with ERROR if storage initialization fails during isolate boot', async () => {
      const brokenState = new MockDurableObjectState();
      brokenState.storage.get = vi.fn().mockRejectedValue(new Error('Corrupt DO storage segment'));
      brokenState.storage.list = vi.fn().mockRejectedValue(new Error('Corrupt DO storage segment'));

      const brokenDO = new RelayDurableObject(brokenState, {});

      // 1. HTTP fetch should return 503 Service Unavailable
      const httpRes = await brokenDO.fetch(new Request('https://relay.aetheris.network/stats'));
      expect(httpRes.status).toBe(503);
      const httpJson = await httpRes.json();
      expect(httpJson.success).toBe(false);
      expect(httpJson.error).toContain('storage initialization failed');

      // 2. WebSocket message should return ERROR
      const ws = new MockWebSocket();
      brokenState.acceptWebSocket(ws);
      await brokenDO.webSocketMessage(ws as unknown as WebSocket, JSON.stringify({ type: 'AUTH', fingerprint: 'test-peer' }));

      const wsMsgs = ws.getAllMessagesParsed();
      const errorMsg = wsMsgs.find((m) => m.type === 'ERROR');
      expect(errorMsg).toBeDefined();
      expect(errorMsg.message).toContain('persistent storage unavailable');
      expect(errorMsg.details).toContain('Corrupt DO storage segment');
    });
  });

  describe('9. Cryptographic WebSocket Authentication & Role Verification (Anti-Privilege Escalation)', () => {
    it('rejects AUTH when client attempts to self-assign role=ADMIN without session credential', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'attacker-node',
          role: 'ADMIN',
        })
      );

      const msgs = ws.getAllMessagesParsed();
      const errorMsg = msgs.find((m) => m.type === 'ERROR');
      expect(errorMsg).toBeDefined();
      expect(errorMsg.message).toContain('Cryptographic session credential required for privileged roles');

      const authSuccess = msgs.find((m) => m.type === 'AUTH_SUCCESS');
      expect(authSuccess).toBeUndefined();
    });

    it('rejects AUTH when client attempts to self-assign role=GUARDIAN or role=MODERATOR without token', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'fake-mod',
          role: 'MODERATOR',
        })
      );

      const msgs = ws.getAllMessagesParsed();
      const errorMsg = msgs.find((m) => m.type === 'ERROR');
      expect(errorMsg).toBeDefined();
      expect(errorMsg.message).toContain('Cryptographic session credential required for privileged roles');
    });

    it('rejects AUTH when token has an invalid cryptographic signature', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      // Create token with attacker secret
      const forgedToken = await createRelaySessionToken(
        {
          sub: 'forged-guardian',
          role: 'GUARDIAN',
          aud: 'aetheris-relay',
          exp: Date.now() + 60000,
          iat: Date.now(),
        },
        'attacker-unauthorized-secret'
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          token: forgedToken,
        })
      );

      const msgs = ws.getAllMessagesParsed();
      const errorMsg = msgs.find((m) => m.type === 'ERROR');
      expect(errorMsg).toBeDefined();
      expect(errorMsg.message).toContain('Authentication rejected: Invalid session signature');
    });

    it('rejects AUTH when token has expired', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      const expiredToken = await createRelaySessionToken(
        {
          sub: 'expired-user',
          role: 'MEMBER',
          aud: 'aetheris-relay',
          exp: Date.now() - 5000, // Expired 5 seconds ago
          iat: Date.now() - 65000,
        },
        'aetheris-sovereign-relay-secret'
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          token: expiredToken,
        })
      );

      const msgs = ws.getAllMessagesParsed();
      const errorMsg = msgs.find((m) => m.type === 'ERROR');
      expect(errorMsg).toBeDefined();
      expect(errorMsg.message).toContain('Session token has expired');
    });

    it('rejects AUTH when token audience does not match relay audience', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      const wrongAudToken = await createRelaySessionToken(
        {
          sub: 'foreign-audience-user',
          role: 'MEMBER',
          aud: 'some-other-app.example.com',
          exp: Date.now() + 60000,
          iat: Date.now(),
        },
        'aetheris-sovereign-relay-secret'
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          token: wrongAudToken,
        })
      );

      const msgs = ws.getAllMessagesParsed();
      const errorMsg = msgs.find((m) => m.type === 'ERROR');
      expect(errorMsg).toBeDefined();
      expect(errorMsg.message).toContain('Wrong audience');
    });

    it('rejects AUTH replay when JTI has already been consumed', async () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      mockState.acceptWebSocket(ws1);
      mockState.acceptWebSocket(ws2);

      const singleUseToken = await createRelaySessionToken(
        {
          sub: 'single-use-user',
          role: 'MEMBER',
          aud: 'aetheris-relay',
          exp: Date.now() + 60000,
          iat: Date.now(),
          jti: 'unique-jti-nonce-12345',
        },
        'aetheris-sovereign-relay-secret'
      );

      // First use: PASS
      await relayDO.webSocketMessage(
        ws1 as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          token: singleUseToken,
        })
      );
      expect(ws1.getAllMessagesParsed().some((m) => m.type === 'AUTH_SUCCESS')).toBe(true);

      // Replay second use: REJECT
      await relayDO.webSocketMessage(
        ws2 as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          token: singleUseToken,
        })
      );
      const ws2Msgs = ws2.getAllMessagesParsed();
      const errorMsg = ws2Msgs.find((m) => m.type === 'ERROR');
      expect(errorMsg).toBeDefined();
      expect(errorMsg.message).toContain('replay detected');
    });

    it('allows anonymous guest connections for public realtime channels with unprivileged status', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'guest-explorer-1',
          status: 'online',
        })
      );

      const msgs = ws.getAllMessagesParsed();
      const authSuccess = msgs.find((m) => m.type === 'AUTH_SUCCESS');
      expect(authSuccess).toBeDefined();
      expect(authSuccess.authenticated).toBe(false);
      expect(authSuccess.role).toBe('MEMBER');

      // Guest can join public channel
      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({ type: 'JOIN_CHANNEL', channelId: 'relays-general' })
      );
      const joinData = ws.getAllMessagesParsed().find((m) => m.type === 'CHANNEL_DATA');
      expect(joinData).toBeDefined();
      expect(joinData.channelId).toBe('relays-general');
    });

    it('rejects privileged operations like EXECUTE_ROLLBACK when caller is unauthenticated or unprivileged', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      // Connect as unauthenticated guest
      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'unprivileged-user',
        })
      );

      // Attempt privileged rollback
      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'EXECUTE_ROLLBACK',
          targetActorFingerprint: 'malicious-actor-99',
        })
      );

      const msgs = ws.getAllMessagesParsed();
      const errorMsg = msgs.find((m) => m.type === 'ERROR' && m.message.includes('privileged role required'));
      expect(errorMsg).toBeDefined();
    });

    it('allows privileged operations like EXECUTE_ROLLBACK when caller has verified GUARDIAN session', async () => {
      const ws = new MockWebSocket();
      mockState.acceptWebSocket(ws);

      const guardianToken = await createRelaySessionToken(
        {
          sub: 'verified-guardian-007',
          role: 'GUARDIAN',
          aud: 'aetheris-relay',
          exp: Date.now() + 60000,
          iat: Date.now(),
        },
        'aetheris-sovereign-relay-secret'
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          token: guardianToken,
        })
      );

      await relayDO.webSocketMessage(
        ws as unknown as WebSocket,
        JSON.stringify({
          type: 'EXECUTE_ROLLBACK',
          targetActorFingerprint: 'malicious-actor-99',
        })
      );

      const msgs = ws.getAllMessagesParsed();
      const errorMsg = msgs.find((m) => m.type === 'ERROR' && m.message.includes('privileged role required'));
      expect(errorMsg).toBeUndefined();
    });
  });
});
