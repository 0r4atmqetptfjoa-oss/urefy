import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  onRequest as handleWebSocket,
  createWebSocketUpgradeResponse,
  createRelaySessionToken,
  verifyRelaySessionToken,
  resetStandaloneWsState,
} from '../functions/api/ws.js';
import { generateKeyPair, signMessage, bytesToHex } from '@aetheris/core-crypto';

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

describe('Standalone WebSocket Authentication Hardening (Finding 2)', () => {
  beforeEach(() => {
    resetStandaloneWsState();
    (globalThis as any).WebSocket = MockWebSocket;
    (globalThis as any).WebSocket.OPEN = 1;
    (globalThis as any).WebSocket.CLOSED = 3;

    (globalThis as any).WebSocketPair = class {
      0 = new MockWebSocket();
      1 = new MockWebSocket();
    };
  });

  // ─── 1. PRODUCTION ENFORCEMENT: CANONICAL DURABLE OBJECT TERMINATION ────────
  describe('1. Production Mode: Mandatory RelayDurableObject Termination', () => {
    it('MUST reject connection and return HTTP 503 in production when RELAY_DO is absent', async () => {
      const req = new Request('https://aetheris.pages.dev/api/ws', {
        headers: { Upgrade: 'websocket' },
      });

      const res = await handleWebSocket({
        request: req,
        env: { ENVIRONMENT: 'production' },
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('RELAY_DO is required in production');
    });

    it('MUST strictly route to RelayDurableObject stub in production when RELAY_DO is bound', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createWebSocketUpgradeResponse(new MockWebSocket()));
      const mockGet = vi.fn().mockReturnValue({ fetch: mockFetch });
      const mockIdFromName = vi.fn().mockReturnValue('room-id-prod-42');

      const mockRelayDo = {
        idFromName: mockIdFromName,
        get: mockGet,
      };

      const req = new Request('https://aetheris.pages.dev/api/ws?roomId=secure-prod-room', {
        headers: { Upgrade: 'websocket' },
      });

      const res = await handleWebSocket({
        request: req,
        env: {
          ENVIRONMENT: 'production',
          RELAY_DO: mockRelayDo,
        },
      });

      expect(res.status).toBe(101);
      expect(mockIdFromName).toHaveBeenCalledWith('secure-prod-room');
      expect(mockGet).toHaveBeenCalledWith('room-id-prod-42');
      expect(mockFetch).toHaveBeenCalledWith(req);
    });
  });

  // ─── 2. STANDALONE FALLBACK: UNVERIFIED ROLE & FINGERPRINT PROTECTION ───────
  describe('2. Standalone Mode: Client-Supplied Role & Fingerprint Authentication', () => {
    it('MUST reject client-supplied ADMIN role from unverified message', async () => {
      const serverWs = new MockWebSocket();
      const clientWs = new MockWebSocket();
      (globalThis as any).WebSocketPair = class {
        0 = clientWs;
        1 = serverWs;
      };

      const req = new Request('https://aetheris.pages.dev/api/ws', { headers: { Upgrade: 'websocket' } });
      await handleWebSocket({ request: req, env: {} });

      // Attacker attempts to claim ADMIN without valid session token or cryptographic signature
      serverWs.emit('message', {
        data: JSON.stringify({
          type: 'AUTH',
          fingerprint: 'forged-admin-fp',
          role: 'ADMIN',
        }),
      });

      const msgs = serverWs.getAllMessagesParsed();
      const authFailed = msgs.find((m) => m.type === 'AUTH_FAILED');
      expect(authFailed).toBeDefined();
      expect(authFailed.error).toContain('Privileged role rejected');
      expect(authFailed.role).toBe('ANONYMOUS');

      // Ensure no AUTH_SUCCESS with ADMIN or forged fingerprint was sent
      const authSuccess = msgs.find((m) => m.type === 'AUTH_SUCCESS');
      expect(authSuccess).toBeUndefined();
    });

    it('MUST reject client-supplied GUARDIAN role from unverified message', async () => {
      const serverWs = new MockWebSocket();
      const clientWs = new MockWebSocket();
      (globalThis as any).WebSocketPair = class {
        0 = clientWs;
        1 = serverWs;
      };

      const req = new Request('https://aetheris.pages.dev/api/ws', { headers: { Upgrade: 'websocket' } });
      await handleWebSocket({ request: req, env: {} });

      // Attacker attempts to claim GUARDIAN role without valid token
      serverWs.emit('message', {
        data: JSON.stringify({
          type: 'AUTH',
          fingerprint: 'forged-guardian-fp',
          role: 'GUARDIAN',
        }),
      });

      const msgs = serverWs.getAllMessagesParsed();
      const authFailed = msgs.find((m) => m.type === 'AUTH_FAILED');
      expect(authFailed).toBeDefined();
      expect(authFailed.error).toContain('Privileged role rejected');
    });

    it('MUST NOT trust arbitrary client-supplied fingerprint without token or signature proof', async () => {
      const serverWs = new MockWebSocket();
      const clientWs = new MockWebSocket();
      (globalThis as any).WebSocketPair = class {
        0 = clientWs;
        1 = serverWs;
      };

      const req = new Request('https://aetheris.pages.dev/api/ws', { headers: { Upgrade: 'websocket' } });
      await handleWebSocket({ request: req, env: {} });

      // Client sends arbitrary unverified fingerprint with standard role
      serverWs.emit('message', {
        data: JSON.stringify({
          type: 'AUTH',
          fingerprint: 'victim-honest-fingerprint',
          role: 'MEMBER',
        }),
      });

      const msgs = serverWs.getAllMessagesParsed();
      const authSuccess = msgs.find((m) => m.type === 'AUTH_SUCCESS');
      expect(authSuccess).toBeDefined();
      expect(authSuccess.authenticated).toBe(false);
      expect(authSuccess.role).toBe('ANONYMOUS');
      // Server MUST NOT reflect the unverified claimed fingerprint as authenticated
      expect(authSuccess.fingerprint).toBeUndefined();
    });

    it('MUST authenticate valid session token with assigned role and subject fingerprint', async () => {
      const serverWs = new MockWebSocket();
      const clientWs = new MockWebSocket();
      (globalThis as any).WebSocketPair = class {
        0 = clientWs;
        1 = serverWs;
      };

      const req = new Request('https://aetheris.pages.dev/api/ws', { headers: { Upgrade: 'websocket' } });
      await handleWebSocket({ request: req, env: {} });

      const validToken = createRelaySessionToken({
        sub: 'alice-canonical-fp',
        role: 'MEMBER',
        exp: Date.now() + 3600000,
      });

      serverWs.emit('message', {
        data: JSON.stringify({
          type: 'AUTH',
          token: validToken,
        }),
      });

      const msgs = serverWs.getAllMessagesParsed();
      const authSuccess = msgs.find((m) => m.type === 'AUTH_SUCCESS');
      expect(authSuccess).toBeDefined();
      expect(authSuccess.authenticated).toBe(true);
      expect(authSuccess.fingerprint).toBe('alice-canonical-fp');
      expect(authSuccess.role).toBe('MEMBER');
    });

    it('MUST authenticate privileged ADMIN role when backed by valid session token', async () => {
      const serverWs = new MockWebSocket();
      const clientWs = new MockWebSocket();
      (globalThis as any).WebSocketPair = class {
        0 = clientWs;
        1 = serverWs;
      };

      const req = new Request('https://aetheris.pages.dev/api/ws', { headers: { Upgrade: 'websocket' } });
      await handleWebSocket({ request: req, env: {} });

      const adminToken = createRelaySessionToken({
        sub: 'root-admin-fp',
        role: 'ADMIN',
        exp: Date.now() + 3600000,
      });

      serverWs.emit('message', {
        data: JSON.stringify({
          type: 'AUTH',
          token: adminToken,
        }),
      });

      const msgs = serverWs.getAllMessagesParsed();
      const authSuccess = msgs.find((m) => m.type === 'AUTH_SUCCESS');
      expect(authSuccess).toBeDefined();
      expect(authSuccess.authenticated).toBe(true);
      expect(authSuccess.fingerprint).toBe('root-admin-fp');
      expect(authSuccess.role).toBe('ADMIN');
    });

    it('MUST reject expired session token and treat as unauthenticated', async () => {
      const serverWs = new MockWebSocket();
      const clientWs = new MockWebSocket();
      (globalThis as any).WebSocketPair = class {
        0 = clientWs;
        1 = serverWs;
      };

      const req = new Request('https://aetheris.pages.dev/api/ws', { headers: { Upgrade: 'websocket' } });
      await handleWebSocket({ request: req, env: {} });

      const expiredToken = createRelaySessionToken({
        sub: 'expired-user-fp',
        role: 'MEMBER',
        exp: Date.now() - 60000, // 1 minute ago
      });

      serverWs.emit('message', {
        data: JSON.stringify({
          type: 'AUTH',
          token: expiredToken,
        }),
      });

      const msgs = serverWs.getAllMessagesParsed();
      const authSuccess = msgs.find((m) => m.type === 'AUTH_SUCCESS');
      expect(authSuccess).toBeDefined();
      expect(authSuccess.authenticated).toBe(false);
      expect(authSuccess.role).toBe('ANONYMOUS');
      expect(authSuccess.fingerprint).toBeUndefined();
    });

    it('MUST reject tampered session token signature and treat as unauthenticated', async () => {
      const serverWs = new MockWebSocket();
      const clientWs = new MockWebSocket();
      (globalThis as any).WebSocketPair = class {
        0 = clientWs;
        1 = serverWs;
      };

      const req = new Request('https://aetheris.pages.dev/api/ws', { headers: { Upgrade: 'websocket' } });
      await handleWebSocket({ request: req, env: {} });

      const validToken = createRelaySessionToken({
        sub: 'honest-user-fp',
        role: 'MEMBER',
        exp: Date.now() + 3600000,
      });

      // Tamper signature suffix
      const tamperedToken = validToken.slice(0, -8) + '00000000';

      serverWs.emit('message', {
        data: JSON.stringify({
          type: 'AUTH',
          token: tamperedToken,
        }),
      });

      const msgs = serverWs.getAllMessagesParsed();
      const authSuccess = msgs.find((m) => m.type === 'AUTH_SUCCESS');
      expect(authSuccess).toBeDefined();
      expect(authSuccess.authenticated).toBe(false);
      expect(authSuccess.role).toBe('ANONYMOUS');
    });

    it('MUST authenticate keypair signature for standard role but reject privilege escalation without session token', async () => {
      const serverWs = new MockWebSocket();
      const clientWs = new MockWebSocket();
      (globalThis as any).WebSocketPair = class {
        0 = clientWs;
        1 = serverWs;
      };

      const req = new Request('https://aetheris.pages.dev/api/ws', { headers: { Upgrade: 'websocket' } });
      await handleWebSocket({ request: req, env: {} });

      const userKey = generateKeyPair();
      const timestamp = Date.now();
      const authPayload = 'auth:' + userKey.fingerprint + ':' + timestamp;
      const signatureHex = bytesToHex(signMessage(authPayload, userKey.privateKeyHex));

      // Attempt privilege escalation to ADMIN with cryptographic keypair signature alone (no session token)
      serverWs.emit('message', {
        data: JSON.stringify({
          type: 'AUTH',
          fingerprint: userKey.fingerprint,
          publicKeyHex: userKey.publicKeyHex,
          signature: signatureHex,
          timestamp,
          role: 'ADMIN',
        }),
      });

      const msgs = serverWs.getAllMessagesParsed();
      const authSuccess = msgs.find((m) => m.type === 'AUTH_SUCCESS');
      expect(authSuccess).toBeDefined();
      expect(authSuccess.authenticated).toBe(true);
      expect(authSuccess.fingerprint).toBe(userKey.fingerprint);
      // Privilege escalation rejected: role defaulted to ANONYMOUS, NOT ADMIN!
      expect(authSuccess.role).toBe('ANONYMOUS');
    });
  });
});
