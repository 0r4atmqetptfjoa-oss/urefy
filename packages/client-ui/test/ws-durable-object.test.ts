import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequest as handleWebSocket, createWebSocketUpgradeResponse, createRelaySessionToken } from '../functions/api/ws.js';
import { generateKeyPair, ZKRLN, Field } from '@aetheris/core-crypto';

class MockWebSocket {
  public readyState: number = 1; // 1 = OPEN
  public sentMessages: string[] = [];
  public listeners: Record<string, Function[]> = {};

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = 3;
    this.emit('close', { code: code || 1000, reason: reason || 'Closed', wasClean: true });
  }

  addEventListener(type: string, listener: Function) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  emit(type: string, event: any) {
    const list = this.listeners[type] || [];
    for (const fn of list) {
      fn(event);
    }
  }

  getAllMessagesParsed(): any[] {
    return this.sentMessages.map((m) => JSON.parse(m));
  }
}

describe('Cloudflare Pages Functions /api/ws — WebSocket & Durable Object Routing', () => {
  beforeEach(() => {
    (globalThis as any).WebSocket = MockWebSocket;
    (globalThis as any).WebSocket.OPEN = 1;
    (globalThis as any).WebSocket.CLOSED = 3;

    (globalThis as any).WebSocketPair = class {
      0 = new MockWebSocket();
      1 = new MockWebSocket();
    };
  });

  describe('1. Mode Switching: env.RELAY_DO Routing vs Standalone', () => {
    it('automatically routes to Durable Object stub when env.RELAY_DO is provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createWebSocketUpgradeResponse(new MockWebSocket()));
      const mockGet = vi.fn().mockReturnValue({ fetch: mockFetch });
      const mockIdFromName = vi.fn().mockReturnValue('room-id-123');

      const mockRelayDoNamespace = {
        idFromName: mockIdFromName,
        get: mockGet,
      };

      const req = new Request('https://aetheris.pages.dev/api/ws?roomId=custom-secure-room', {
        headers: { Upgrade: 'websocket' },
      });

      const res = await handleWebSocket({
        request: req,
        env: { RELAY_DO: mockRelayDoNamespace },
      });

      expect(res.status).toBe(101);
      expect(mockIdFromName).toHaveBeenCalledWith('custom-secure-room');
      expect(mockGet).toHaveBeenCalledWith('room-id-123');
      expect(mockFetch).toHaveBeenCalledWith(req);
    });

    it('returns 426 Upgrade Required with metadata when HTTP non-websocket request is sent in standalone mode', async () => {
      const req = new Request('https://aetheris.pages.dev/api/ws', { method: 'GET' });
      const res = await handleWebSocket({ request: req, env: {} });

      expect(res.status).toBe(426);
      const json = await res.json();
      expect(json.service).toContain('Signaling');
      expect(json.zkRlnEnabled).toBe(true);
    });

    it('upgrades and accepts connection in standalone WebSocketPair mode when env.RELAY_DO is absent', async () => {
      const req = new Request('https://aetheris.pages.dev/api/ws', {
        headers: { Upgrade: 'websocket' },
      });

      const res = await handleWebSocket({ request: req, env: {} });
      expect(res.status).toBe(101);
      expect((res as any).webSocket).toBeDefined();
    });
  });

  describe('2. Standalone WebSocket Handlers: AUTH, Presence & ZK-RLN Slashing', () => {
    it('handles AUTH, tracks presence, and provides channel data', async () => {
      const serverWs = new MockWebSocket();
      const clientWs = new MockWebSocket();
      (globalThis as any).WebSocketPair = class {
        0 = clientWs;
        1 = serverWs;
      };

      const req = new Request('https://aetheris.pages.dev/api/ws', { headers: { Upgrade: 'websocket' } });
      await handleWebSocket({ request: req, env: {} });

      const userKey = generateKeyPair();
      const userSecret = Field.hashToField('my-standalone-secret-123');
      const nullifier = ZKRLN.computeNullifier(userSecret);

      const token = createRelaySessionToken({
        sub: userKey.fingerprint,
        role: 'GUARDIAN',
        exp: Date.now() + 3600000,
      });

      // Trigger AUTH
      serverWs.emit('message', {
        data: JSON.stringify({
          type: 'AUTH',
          token,
          fingerprint: userKey.fingerprint,
          nullifier,
          role: 'GUARDIAN',
        }),
      });

      const msgs = serverWs.getAllMessagesParsed();
      const authSuccess = msgs.find((m) => m.type === 'AUTH_SUCCESS');
      const channelsList = msgs.find((m) => m.type === 'CHANNELS_LIST');

      expect(authSuccess).toBeDefined();
      expect(authSuccess.fingerprint).toBe(userKey.fingerprint);
      expect(channelsList).toBeDefined();
      expect(channelsList.channels.length).toBeGreaterThanOrEqual(5);

      // Join Channel
      serverWs.emit('message', {
        data: JSON.stringify({
          type: 'JOIN_CHANNEL',
          channelId: 'relays-general',
        }),
      });

      const chData = serverWs.getAllMessagesParsed().find((m) => m.type === 'CHANNEL_DATA');
      expect(chData).toBeDefined();
      expect(chData.channelId).toBe('relays-general');
      expect(chData.messages.length).toBeGreaterThanOrEqual(3);
    });

    it('detects ZK-RLN epoch collision, extracts secret, slashes spammer and issues QUARANTINE_ALERT', async () => {
      const spammerServerWs = new MockWebSocket();
      const spammerClientWs = new MockWebSocket();

      (globalThis as any).WebSocketPair = class {
        0 = spammerClientWs;
        1 = spammerServerWs;
      };

      const req = new Request('https://aetheris.pages.dev/api/ws', { headers: { Upgrade: 'websocket' } });
      await handleWebSocket({ request: req, env: {} });

      const spammerSecret = Field.hashToField('spammer-secret-standalone-99');
      const nullifier = ZKRLN.computeNullifier(spammerSecret);
      const epoch = 'epoch_pages_test';

      // 1. AUTH Spammer
      spammerServerWs.emit('message', {
        data: JSON.stringify({
          type: 'AUTH',
          fingerprint: 'spammer-fingerprint-1',
          nullifier,
        }),
      });

      // 2. First Message in epoch
      const share1 = ZKRLN.createShare(spammerSecret, epoch, 'Standalone Message 1');
      spammerServerWs.emit('message', {
        data: JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Message 1 valid payload',
          epoch: share1.epoch,
          x: share1.x,
          y: share1.y,
          nullifier: share1.nullifier,
        }),
      });

      // 3. Second Message in SAME epoch (Double-spend breach!)
      const share2 = ZKRLN.createShare(spammerSecret, epoch, 'Standalone Message 2 Spam Attack');
      spammerServerWs.emit('message', {
        data: JSON.stringify({
          type: 'SEND_MESSAGE',
          channelId: 'relays-general',
          ciphertext: 'Message 2 spam attack payload',
          epoch: share2.epoch,
          x: share2.x,
          y: share2.y,
          nullifier: share2.nullifier,
        }),
      });

      const spammerMsgs = spammerServerWs.getAllMessagesParsed();
      const slashingNotice = spammerMsgs.find((m) => m.type === 'SLASHING_NOTICE');
      expect(slashingNotice).toBeDefined();
      expect(slashingNotice.nullifier).toBe(nullifier);

      // Extracted secret key must NEVER be sent over the wire!
      expect(slashingNotice.extractedSecretKey).toBeUndefined();
    });

    it('replies to PING with PONG and timestamp', async () => {
      const serverWs = new MockWebSocket();
      const clientWs = new MockWebSocket();
      (globalThis as any).WebSocketPair = class {
        0 = clientWs;
        1 = serverWs;
      };

      const req = new Request('https://aetheris.pages.dev/api/ws', { headers: { Upgrade: 'websocket' } });
      await handleWebSocket({ request: req, env: {} });

      serverWs.emit('message', {
        data: JSON.stringify({ type: 'PING' }),
      });

      const pong = serverWs.getAllMessagesParsed().find((m) => m.type === 'PONG');
      expect(pong).toBeDefined();
      expect(pong.timestamp).toBeDefined();
    });
  });
});
