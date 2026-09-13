import { describe, it, expect, beforeEach } from 'vitest';
import {
  RelayDurableObject,
  DurableObjectState,
  DurableObjectStorage,
  createRelaySessionToken,
} from '../src/relay-durable-object.js';
import { SovereignRelayDurableObject } from '../src/durable-hibernation.js';

class MockStorage implements DurableObjectStorage {
  public data = new Map<string, any>();

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
    return null;
  }
  async setAlarm(): Promise<void> {}
  async deleteAlarm(): Promise<void> {}
}

class MockWebSocket {
  public readyState: number = 1;
  public sentMessages: string[] = [];
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
  public id = { toString: () => 'do-security-pass2', name: 'pass2-test' };
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

describe('Relay DO Nanopublication Security & Auth (Pass 2)', () => {
  const SECRET = 'sovereign-relay-test-secret-32-chars-long';
  const VALID_SHA256 = 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496';

  let state: MockDurableObjectState;
  let env: any;
  let relayDO: RelayDurableObject;
  let hibDO: SovereignRelayDurableObject;

  beforeEach(() => {
    state = new MockDurableObjectState();
    env = { RELAY_SECRET: SECRET };
    relayDO = new RelayDurableObject(state as any, env);
    hibDO = new SovereignRelayDurableObject(state as any, env);
  });

  it('rejects PUBLISH_NANOPUBLICATION from unauthenticated guest session', async () => {
    const ws = new MockWebSocket();

    // Guest connects without token
    await relayDO.webSocketMessage(
      ws as any,
      JSON.stringify({ type: 'AUTH', fingerprint: 'anon-guest-1' })
    );

    // Attempts to publish a nanopublication
    await relayDO.webSocketMessage(
      ws as any,
      JSON.stringify({
        type: 'PUBLISH_NANOPUBLICATION',
        channelId: 'vault-releases',
        sha256: VALID_SHA256,
        title: 'Unauthorized Release',
        fileName: 'unauthorized.bin',
        byteSize: 1024,
      })
    );

    const last = ws.getLastMessage();
    expect(last.type).toBe('ERROR');
    expect(last.message).toMatch(/Authenticated session required/i);
  });

  it('rejects PUBLISH_NANOPUBLICATION with invalid sha256 checksum', async () => {
    const ws = new MockWebSocket();
    const token = await createRelaySessionToken(
      { sub: 'auth-user-1', role: 'MEMBER', aud: 'aetheris-relay', exp: Date.now() + 60000, iat: Date.now() },
      SECRET
    );

    // Authenticate with valid session token
    await relayDO.webSocketMessage(ws as any, JSON.stringify({ type: 'AUTH', token }));

    // Send malformed sha256
    await relayDO.webSocketMessage(
      ws as any,
      JSON.stringify({
        type: 'PUBLISH_NANOPUBLICATION',
        channelId: 'vault-releases',
        sha256: 'not-a-valid-sha256-hash',
        title: 'Bad Hash Release',
        fileName: 'bad.bin',
        byteSize: 1024,
      })
    );

    const last = ws.getLastMessage();
    expect(last.type).toBe('ERROR');
    expect(last.message).toMatch(/valid 64-character hex sha256 checksum is mandatory/i);
  });

  it('accepts and broadcasts valid PUBLISH_NANOPUBLICATION from authenticated user', async () => {
    const ws = new MockWebSocket();
    const token = await createRelaySessionToken(
      { sub: 'auth-user-2', role: 'MEMBER', aud: 'aetheris-relay', exp: Date.now() + 60000, iat: Date.now() },
      SECRET
    );

    await relayDO.webSocketMessage(ws as any, JSON.stringify({ type: 'AUTH', token }));

    await relayDO.webSocketMessage(
      ws as any,
      JSON.stringify({
        type: 'PUBLISH_NANOPUBLICATION',
        channelId: 'vault-releases',
        sha256: VALID_SHA256,
        title: 'Authentic Sovereign Release',
        fileName: 'release.bin',
        byteSize: 2048,
        verdict: 'CLEAN',
      })
    );

    // Check that DO storage received the publication
    let found = false;
    for (const [key, value] of state.storage.data.entries()) {
      if (key.startsWith('nano:vault-releases:')) {
        expect(value.sha256).toBe(VALID_SHA256.toLowerCase());
        expect(value.title).toBe('Authentic Sovereign Release');
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('enforces authentication on SovereignRelayDurableObject (hibernation)', async () => {
    const ws = new MockWebSocket();

    // Anonymous session
    await hibDO.webSocketMessage(
      ws as any,
      JSON.stringify({ type: 'AUTH', fingerprint: 'anon-hib-guest' })
    );

    // Try to publish
    await hibDO.webSocketMessage(
      ws as any,
      JSON.stringify({
        type: 'PUBLISH_NANOPUBLICATION',
        channelId: 'vault-releases',
        sha256: VALID_SHA256,
        title: 'Hibernating Release',
      })
    );

    const last = ws.getLastMessage();
    expect(last.type).toBe('ERROR');
    expect(last.message).toMatch(/Authenticated session required/i);
  });
});
