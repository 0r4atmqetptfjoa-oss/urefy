import { describe, it, expect, beforeEach } from 'vitest';
import {
  SovereignRelayDurableObject,
  DurableObjectState,
  DurableObjectStorage,
} from '../src/durable-hibernation.js';

class MockStorage implements DurableObjectStorage {
  public data = new Map<string, any>();
  public alarm: number | null = null;

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
      let c = 0;
      for (const k of keyOrKeys) if (this.data.delete(k)) c++;
      return c;
    }
    return this.data.delete(keyOrKeys);
  }
  async deleteAll(): Promise<void> {
    this.data.clear();
  }
  async list<T = unknown>(): Promise<Map<string, T>> {
    return new Map(this.data);
  }
  async getAlarm(): Promise<number | null> {
    return this.alarm;
  }
  async setAlarm(scheduledTime: number | Date): Promise<void> {
    this.alarm = typeof scheduledTime === 'number' ? scheduledTime : scheduledTime.getTime();
  }
  async deleteAlarm(): Promise<void> {
    this.alarm = null;
  }
}

class MockWebSocket {
  public readyState: number = 1;
  public sentMessages: string[] = [];

  send(data: string) {
    this.sentMessages.push(data);
  }
  close() {
    this.readyState = 3;
  }
  getLastMessage(): any {
    if (this.sentMessages.length === 0) return null;
    return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
  }
  getAllMessages(): any[] {
    return this.sentMessages.map((m) => JSON.parse(m));
  }
}

class MockDurableObjectState implements DurableObjectState {
  public id = { toString: () => 'do-webrtc-abuse-test', name: 'webrtc-test' };
  public storage = new MockStorage();
  public acceptedSockets: MockWebSocket[] = [];
  public socketTags = new Map<MockWebSocket, Set<string>>();

  waitUntil(_promise: Promise<any>): void {}
  acceptWebSocket(ws: WebSocket, tags?: string[]): void {
    this.acceptedSockets.push(ws as any);
    this.socketTags.set(ws as any, new Set(tags || []));
  }
  getWebSockets(tag?: string): WebSocket[] {
    if (!tag) return this.acceptedSockets as any;
    return this.acceptedSockets.filter((s) => this.socketTags.get(s)?.has(tag)) as any;
  }
  getTags(ws: WebSocket): string[] {
    return Array.from(this.socketTags.get(ws as any) || []);
  }
  setWebSocketTags(ws: WebSocket, tags: string[]): void {
    this.socketTags.set(ws as any, new Set(tags));
  }
}

describe('WebRTC TURN/STUN Relay Abuse & DoS Defense', () => {
  let state: MockDurableObjectState;
  let relayDO: SovereignRelayDurableObject;
  const env = { RELAY_SECRET: 'test-secret-32-chars-long-abc' };

  beforeEach(() => {
    state = new MockDurableObjectState();
    relayDO = new SovereignRelayDurableObject(state as any, env);
  });

  it('rejects unauthenticated WebRTC signaling from connected sockets prior to AUTH', async () => {
    const rawWs = new MockWebSocket();
    state.acceptWebSocket(rawWs as any, ['channel:relays-general', 'auth:0']);

    // Attempt to send WebRTC signal without performing AUTH
    await relayDO.webSocketMessage(
      rawWs as any,
      JSON.stringify({
        type: 'WEBRTC_SIGNAL',
        targetFingerprint: 'target-peer-1',
        signal: { type: 'offer', sdp: 'v=0...' },
      })
    );

    const reply = rawWs.getLastMessage();
    expect(reply.type).toBe('ERROR');
    expect(reply.message).toMatch(/Authenticated identity required for WebRTC signaling/i);
  });

  it('rejects oversized SDP signals (>64KB) to prevent amplification and memory bloat', async () => {
    const aliceWs = new MockWebSocket();
    state.acceptWebSocket(aliceWs as any, ['channel:relays-general', 'user:alice-dev', 'auth:0']);

    // Alice completes guest AUTH
    await relayDO.webSocketMessage(
      aliceWs as any,
      JSON.stringify({ type: 'AUTH', fingerprint: 'alice-dev' })
    );

    // Alice attempts to send a 128KB bloated SDP offer
    const oversizedSdp = 'a=candidate:' + 'X'.repeat(128 * 1024);
    await relayDO.webSocketMessage(
      aliceWs as any,
      JSON.stringify({
        type: 'WEBRTC_SIGNAL',
        targetFingerprint: 'target-bob',
        signal: { type: 'offer', sdp: oversizedSdp },
      })
    );

    const reply = aliceWs.getLastMessage();
    expect(reply.type).toBe('ERROR');
    expect(reply.message).toMatch(/exceeds 64KB limit/i);
  });

  it('rejects malformed non-WebRTC payload signals', async () => {
    const aliceWs = new MockWebSocket();
    state.acceptWebSocket(aliceWs as any, ['channel:relays-general', 'user:alice-dev', 'auth:0']);

    await relayDO.webSocketMessage(
      aliceWs as any,
      JSON.stringify({ type: 'AUTH', fingerprint: 'alice-dev' })
    );

    // Arbitrary JSON / generic tunneling attempt
    await relayDO.webSocketMessage(
      aliceWs as any,
      JSON.stringify({
        type: 'WEBRTC_SIGNAL',
        targetFingerprint: 'target-bob',
        signal: { arbitraryTunnelData: 'attack-vector', count: 1234 },
      })
    );

    const reply = aliceWs.getLastMessage();
    expect(reply.type).toBe('ERROR');
    expect(reply.message).toMatch(/Malformed WebRTC signal/i);
  });

  it('rate-limits aggressive WebRTC signal flooding (>60 signals/minute)', async () => {
    const aliceWs = new MockWebSocket();
    const bobWs = new MockWebSocket();
    state.acceptWebSocket(aliceWs as any, ['channel:relays-general', 'user:alice-fast', 'auth:0']);
    state.acceptWebSocket(bobWs as any, ['channel:relays-general', 'user:bob-target', 'auth:0']);

    await relayDO.webSocketMessage(aliceWs as any, JSON.stringify({ type: 'AUTH', fingerprint: 'alice-fast' }));
    await relayDO.webSocketMessage(bobWs as any, JSON.stringify({ type: 'AUTH', fingerprint: 'bob-target' }));

    // Alice sends 60 valid ICE candidate signals
    for (let i = 0; i < 60; i++) {
      await relayDO.webSocketMessage(
        aliceWs as any,
        JSON.stringify({
          type: 'WEBRTC_SIGNAL',
          targetFingerprint: 'bob-target',
          signal: { candidate: `candidate:${i} 1 UDP 2122260223 192.168.1.1 5000 typ host` },
        })
      );
    }

    // 61st signal must be rate-limited
    await relayDO.webSocketMessage(
      aliceWs as any,
      JSON.stringify({
        type: 'WEBRTC_SIGNAL',
        targetFingerprint: 'bob-target',
        signal: { candidate: 'candidate:61 1 UDP 2122260223 192.168.1.1 5000 typ host' },
      })
    );

    const rateLimitReply = aliceWs.getLastMessage();
    expect(rateLimitReply.type).toBe('ERROR');
    expect(rateLimitReply.message).toMatch(/Rate limit exceeded/i);
  });

  it('verifies Durable Object tag trust model: unauthenticated socket waking up does NOT get authenticated=true', async () => {
    const ws = new MockWebSocket();
    // Simulate isolate wake-up where WS was tagged with a guest fingerprint but auth:0
    state.acceptWebSocket(ws as any, ['channel:relays-general', 'user:anon-12345678', 'auth:0']);

    // Send a PING to wake the isolate and trigger session reconstruction from tags
    await relayDO.webSocketMessage(ws as any, JSON.stringify({ type: 'PING' }));

    // Attempt to publish a nanopublication which strictly requires session.authenticated
    await relayDO.webSocketMessage(
      ws as any,
      JSON.stringify({
        type: 'PUBLISH_NANOPUBLICATION',
        channelId: 'vault-releases',
        sha256: 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496',
        title: 'Unauthorized Nanopub',
        fileName: 'unauthorized.bin',
        byteSize: 1024,
      })
    );

    const last = ws.getLastMessage();
    expect(last.type).toBe('ERROR');
    expect(last.message).toMatch(/Authenticated session required to publish nanopublications/i);
  });
});
