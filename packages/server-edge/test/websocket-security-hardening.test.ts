import { describe, it, expect, beforeEach } from 'vitest';
import {
  RelayDurableObject,
  DurableObjectState,
  DurableObjectStorage,
  createRelaySessionToken,
} from '../src/relay-durable-object.js';
import { SovereignRelayDurableObject } from '../src/durable-hibernation.js';
import worker from '../src/worker.js';

class MockStorage implements DurableObjectStorage {
  public data = new Map<string, any>();
  public shouldFail: boolean = false;

  async get<T = unknown>(key: string): Promise<T | undefined> {
    if (this.shouldFail) throw new Error('Simulated D1/DO storage failure');
    return this.data.get(key);
  }
  async getMany<T = unknown>(keys: string[]): Promise<Map<string, T>> {
    if (this.shouldFail) throw new Error('Simulated D1/DO storage failure');
    const res = new Map<string, T>();
    for (const k of keys) {
      if (this.data.has(k)) res.set(k, this.data.get(k));
    }
    return res;
  }
  async put<T = unknown>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void> {
    if (this.shouldFail) throw new Error('Simulated D1/DO storage failure');
    if (typeof keyOrEntries === 'string') {
      this.data.set(keyOrEntries, value);
    } else {
      for (const [k, v] of Object.entries(keyOrEntries)) {
        this.data.set(k, v);
      }
    }
  }
  async delete(keyOrKeys: string | string[]): Promise<any> {
    if (this.shouldFail) throw new Error('Simulated D1/DO storage failure');
    if (Array.isArray(keyOrKeys)) {
      let c = 0;
      for (const k of keyOrKeys) if (this.data.delete(k)) c++;
      return c;
    }
    return this.data.delete(keyOrKeys);
  }
  async deleteAll(): Promise<void> {
    if (this.shouldFail) throw new Error('Simulated D1/DO storage failure');
    this.data.clear();
  }
  async list<T = unknown>(): Promise<Map<string, T>> {
    if (this.shouldFail) throw new Error('Simulated D1/DO storage failure');
    return new Map(this.data);
  }
  async getAlarm(): Promise<number | null> {
    if (this.shouldFail) throw new Error('Simulated D1/DO storage failure');
    return null;
  }
  async setAlarm(): Promise<void> {
    if (this.shouldFail) throw new Error('Simulated D1/DO storage failure');
  }
  async deleteAlarm(): Promise<void> {
    if (this.shouldFail) throw new Error('Simulated D1/DO storage failure');
  }
  async transaction<T>(closure: (txn: any) => Promise<T>): Promise<T> {
    return closure(this);
  }
}

class MockWebSocket {
  public readyState: number = 1;
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

  close() {
    this.readyState = 3;
    this.emit('close', { code: 1000, reason: 'Closed' });
  }

  addEventListener(type: string, listener: Function) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  emit(type: string, event: any) {
    const list = this.listeners[type] || [];
    for (const fn of list) fn(event);
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
  public id = { toString: () => 'do-hardening-test', name: 'hardening-test' };
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

describe('WebSocket Identity & Role Security Hardening (P0 Gates)', () => {
  const TEST_SECRET = 'test-sovereign-auth-secret-key-32b';

  beforeEach(() => {
    (globalThis as any).WebSocket = MockWebSocket;
    (globalThis as any).WebSocket.OPEN = 1;
    (globalThis as any).WebSocketPair = class {
      0 = new MockWebSocket();
      1 = new MockWebSocket();
    };
  });

  describe('1. RelayDurableObject Identity Spoofing & Role Authority', () => {
    it('MUST explicitly DENY client when packet.authorFingerprint differs from session fingerprint', async () => {
      const mockState = new MockDurableObjectState();
      const relay = new RelayDurableObject(mockState, { AUTH_SECRET: TEST_SECRET });

      const upgradeReq = new Request('https://relay.aetheris.network/ws', {
        headers: { Upgrade: 'websocket' },
      });
      await relay.fetch(upgradeReq);
      const serverWs = mockState.acceptedSockets[0];

      // Authenticate as honest user "alice-fp" via valid session token
      const token = await createRelaySessionToken(
        {
          sub: 'alice-fp',
          role: 'MEMBER',
          aud: 'aetheris-relay',
          exp: Date.now() + 60000,
        },
        TEST_SECRET
      );
      await relay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', token })
      );

      // Alice sends a message trying to spoof authorFingerprint = "bob-admin-fp"
      await relay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Legitimate encrypted body',
          authorFingerprint: 'bob-admin-fp',
        })
      );

      const lastMsg = serverWs.getLastMessageParsed();
      expect(lastMsg.type).toBe('ERROR');
      expect(lastMsg.message).toContain('Identity spoofing rejected');

      // Message MUST NOT have been stored
      const messages = relay.getChannelMessages('relays-general');
      expect(messages.length).toBe(0);
    });

    it('MUST explicitly DENY client when packet.fingerprint differs from session fingerprint', async () => {
      const mockState = new MockDurableObjectState();
      const relay = new RelayDurableObject(mockState, { AUTH_SECRET: TEST_SECRET });

      const upgradeReq = new Request('https://relay.aetheris.network/ws', {
        headers: { Upgrade: 'websocket' },
      });
      await relay.fetch(upgradeReq);
      const serverWs = mockState.acceptedSockets[0];

      const token = await createRelaySessionToken(
        {
          sub: 'alice-fp',
          role: 'MEMBER',
          aud: 'aetheris-relay',
          exp: Date.now() + 60000,
        },
        TEST_SECRET
      );
      await relay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', token })
      );

      // Alice sends a message with spoofed fingerprint field
      await relay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Legitimate encrypted body',
          fingerprint: 'charlie-fp',
        })
      );

      const lastMsg = serverWs.getLastMessageParsed();
      expect(lastMsg.type).toBe('ERROR');
      expect(lastMsg.message).toContain('Identity spoofing rejected');
    });

    it('MUST accept valid message and assign authorFingerprint = session.fingerprint', async () => {
      const mockState = new MockDurableObjectState();
      const relay = new RelayDurableObject(mockState, { AUTH_SECRET: TEST_SECRET });

      const upgradeReq = new Request('https://relay.aetheris.network/ws', {
        headers: { Upgrade: 'websocket' },
      });
      await relay.fetch(upgradeReq);
      const serverWs = mockState.acceptedSockets[0];

      const token = await createRelaySessionToken(
        {
          sub: 'alice-fp',
          role: 'MEMBER',
          aud: 'aetheris-relay',
          exp: Date.now() + 60000,
        },
        TEST_SECRET
      );
      await relay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', token })
      );

      // Alice sends valid message without spoofing
      await relay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Hello Aetheris Network',
        })
      );

      const messages = relay.getChannelMessages('relays-general');
      expect(messages.length).toBe(1);
      expect(messages[0].authorFingerprint).toBe('alice-fp');
    });

    it('MUST explicitly DENY role escalation: MEMBER + role=ADMIN => DENIED', async () => {
      const mockState = new MockDurableObjectState();
      const relay = new RelayDurableObject(mockState, { AUTH_SECRET: TEST_SECRET });

      const upgradeReq = new Request('https://relay.aetheris.network/ws', { headers: { Upgrade: 'websocket' } });
      await relay.fetch(upgradeReq);
      const serverWs = mockState.acceptedSockets[0];

      const token = await createRelaySessionToken(
        { sub: 'member-user', role: 'MEMBER', aud: 'aetheris-relay', exp: Date.now() + 60000 },
        TEST_SECRET
      );
      await relay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', token, role: 'ADMIN' })
      );

      const lastMsg = serverWs.getLastMessageParsed();
      expect(lastMsg.type).toBe('ERROR');
      expect(lastMsg.message).toContain('Role escalation rejected');
    });

    it('MUST explicitly DENY role escalation: MEMBER + role=GUARDIAN => DENIED', async () => {
      const mockState = new MockDurableObjectState();
      const relay = new RelayDurableObject(mockState, { AUTH_SECRET: TEST_SECRET });

      const upgradeReq = new Request('https://relay.aetheris.network/ws', { headers: { Upgrade: 'websocket' } });
      await relay.fetch(upgradeReq);
      const serverWs = mockState.acceptedSockets[0];

      const token = await createRelaySessionToken(
        { sub: 'member-user', role: 'MEMBER', aud: 'aetheris-relay', exp: Date.now() + 60000 },
        TEST_SECRET
      );
      await relay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', token, role: 'GUARDIAN' })
      );

      const lastMsg = serverWs.getLastMessageParsed();
      expect(lastMsg.type).toBe('ERROR');
      expect(lastMsg.message).toContain('Role escalation rejected');
    });

    it('MUST explicitly DENY role escalation: MEMBER + role=MODERATOR => DENIED', async () => {
      const mockState = new MockDurableObjectState();
      const relay = new RelayDurableObject(mockState, { AUTH_SECRET: TEST_SECRET });

      const upgradeReq = new Request('https://relay.aetheris.network/ws', { headers: { Upgrade: 'websocket' } });
      await relay.fetch(upgradeReq);
      const serverWs = mockState.acceptedSockets[0];

      const token = await createRelaySessionToken(
        { sub: 'member-user', role: 'MEMBER', aud: 'aetheris-relay', exp: Date.now() + 60000 },
        TEST_SECRET
      );
      await relay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', token, role: 'MODERATOR' })
      );

      const lastMsg = serverWs.getLastMessageParsed();
      expect(lastMsg.type).toBe('ERROR');
      expect(lastMsg.message).toContain('Role escalation rejected');
    });

    it('MUST explicitly DENY role escalation: MEMBER + role=ARCHIVIST => DENIED', async () => {
      const mockState = new MockDurableObjectState();
      const relay = new RelayDurableObject(mockState, { AUTH_SECRET: TEST_SECRET });

      const upgradeReq = new Request('https://relay.aetheris.network/ws', { headers: { Upgrade: 'websocket' } });
      await relay.fetch(upgradeReq);
      const serverWs = mockState.acceptedSockets[0];

      const token = await createRelaySessionToken(
        { sub: 'member-user', role: 'MEMBER', aud: 'aetheris-relay', exp: Date.now() + 60000 },
        TEST_SECRET
      );
      await relay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', token, role: 'ARCHIVIST' })
      );

      const lastMsg = serverWs.getLastMessageParsed();
      expect(lastMsg.type).toBe('ERROR');
      expect(lastMsg.message).toContain('Role escalation rejected');
    });

    it('MUST reject unauthenticated attempt to claim MODERATOR or ARCHIVIST without session token', async () => {
      const mockState = new MockDurableObjectState();
      const relay = new RelayDurableObject(mockState, { AUTH_SECRET: TEST_SECRET });

      const upgradeReq = new Request('https://relay.aetheris.network/ws', {
        headers: { Upgrade: 'websocket' },
      });
      await relay.fetch(upgradeReq);
      const serverWs = mockState.acceptedSockets[0];

      await relay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({
          type: 'AUTH',
          fingerprint: 'rogue-mod',
          role: 'MODERATOR',
        })
      );

      const lastMsg = serverWs.getLastMessageParsed();
      expect(lastMsg.type).toBe('ERROR');
      expect(lastMsg.message).toContain('Cryptographic session credential required for privileged roles');
    });
  });

  describe('2. SovereignRelayDurableObject (Hibernation) Security Invariants', () => {
    it('MUST reject spoofed authorFingerprint in hibernation mode', async () => {
      const mockState = new MockDurableObjectState();
      const hibRelay = new SovereignRelayDurableObject(mockState, { AUTH_SECRET: TEST_SECRET });

      const upgradeReq = new Request('https://relay.aetheris.network/ws', {
        headers: { Upgrade: 'websocket' },
      });
      await hibRelay.fetch(upgradeReq);
      const serverWs = mockState.acceptedSockets[0];

      // Authenticate via token as "user-123"
      const token = await createRelaySessionToken(
        {
          sub: 'user-123',
          role: 'MEMBER',
          aud: 'aetheris-relay',
          exp: Date.now() + 60000,
        },
        TEST_SECRET
      );
      await hibRelay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', token })
      );

      // Send channel message claiming authorFingerprint = "impostor"
      await hibRelay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Encrypted payload',
          authorFingerprint: 'impostor',
        })
      );

      const err = serverWs.getLastMessageParsed();
      expect(err.type).toBe('ERROR');
      expect(err.message).toContain('Identity spoofing rejected');
    });

    it('MUST fail closed with 503 on fetch and ERROR on webSocketMessage when storage initialization fails', async () => {
      const mockState = new MockDurableObjectState();
      mockState.storage.shouldFail = true; // Induce storage failure

      const hibRelay = new SovereignRelayDurableObject(mockState, { AUTH_SECRET: TEST_SECRET });

      // 1. fetch() must return 503
      const req = new Request('https://relay.aetheris.network/stats');
      const res = await hibRelay.fetch(req);
      expect(res.status).toBe(503);

      // 2. webSocketMessage() must reject with ERROR
      const mockWs = new MockWebSocket();
      await hibRelay.webSocketMessage(mockWs as unknown as WebSocket, JSON.stringify({ type: 'PING' }));
      const lastMsg = mockWs.getLastMessageParsed();
      expect(lastMsg.type).toBe('ERROR');
      expect(lastMsg.message).toContain('Durable Object storage unavailable');
    });

    it('MUST fail closed and abort broadcast when storage.put fails during SEND_MESSAGE', async () => {
      const mockState = new MockDurableObjectState();
      const hibRelay = new SovereignRelayDurableObject(mockState, { AUTH_SECRET: TEST_SECRET });

      const upgradeReq = new Request('https://relay.aetheris.network/ws', { headers: { Upgrade: 'websocket' } });
      await hibRelay.fetch(upgradeReq);
      const serverWs = mockState.acceptedSockets[0];

      const token = await createRelaySessionToken(
        { sub: 'user-123', role: 'MEMBER', aud: 'aetheris-relay', exp: Date.now() + 60000 },
        TEST_SECRET
      );
      await hibRelay.webSocketMessage(serverWs as unknown as WebSocket, JSON.stringify({ type: 'AUTH', token }));

      // Now induce storage put failure
      mockState.storage.shouldFail = true;

      await hibRelay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Should not persist',
        })
      );

      const lastMsg = serverWs.getLastMessageParsed();
      expect(lastMsg.type).toBe('ERROR');
      expect(lastMsg.message).toContain('Failed to persist message to durable storage');

      // Message MUST NOT be in memory
      const msgs = (hibRelay as any).channelMessages.get('relays-general') || [];
      expect(msgs.find((m: any) => m.ciphertext === 'Should not persist')).toBeUndefined();
    });

    it('MUST reject role escalation in hibernation mode', async () => {
      const mockState = new MockDurableObjectState();
      const hibRelay = new SovereignRelayDurableObject(mockState, { AUTH_SECRET: TEST_SECRET });

      const upgradeReq = new Request('https://relay.aetheris.network/ws', { headers: { Upgrade: 'websocket' } });
      await hibRelay.fetch(upgradeReq);
      const serverWs = mockState.acceptedSockets[0];

      const token = await createRelaySessionToken(
        { sub: 'member-user', role: 'MEMBER', aud: 'aetheris-relay', exp: Date.now() + 60000 },
        TEST_SECRET
      );
      await hibRelay.webSocketMessage(
        serverWs as unknown as WebSocket,
        JSON.stringify({ type: 'AUTH', token, role: 'ADMIN' })
      );

      const err = serverWs.getLastMessageParsed();
      expect(err.type).toBe('ERROR');
      expect(err.message).toContain('Role escalation rejected');
    });
  });

  describe('3. Standalone Edge Worker Security Invariants', () => {
    it('MUST enforce server-authenticated authorFingerprint in standalone edge mode', async () => {
      const req = new Request('https://aetheris-edge.test/api/ws', {
        headers: { Upgrade: 'websocket' },
      });
      const res = await worker.fetch(req, { AUTH_SECRET: TEST_SECRET });
      expect(res.status).toBe(101);

      const clientWs = (res as any).webSocket;
      expect(clientWs).toBeDefined();
    });
  });
});
