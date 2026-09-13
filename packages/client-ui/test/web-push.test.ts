// ============================================================================
// web-push.test.ts — Unit & Integration Test Suite for Sovereign Web Push (VAPID)
// Tests VAPID key base64 decoding, subscription registration flow, payload generation,
// local notification fallback, permission state handling, connected triggers & Edge API.
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SovereignWebPush,
  sovereignWebPush,
  urlBase64ToUint8Array,
  uint8ArrayToUrlBase64,
  DEFAULT_SOVEREIGN_VAPID_PUBLIC_KEY,
} from '../src/web-push.js';
import {
  onRequestGet as handlePushGet,
  onRequestPost as handlePushPost,
  SOVEREIGN_VAPID_PUBLIC_KEY,
  createVapidJwt,
  base64UrlEncode,
} from '../functions/api/push.js';
import { D1Database, globalPushSubscriptionsStore } from '../functions/api/_db.js';

// ─── MOCK D1 DATABASE GENERATOR ───────────────────────────────────────────────

function createMockD1(): D1Database {
  const subscriptions: any[] = [];

  return {
    prepare(query: string) {
      let boundParams: any[] = [];
      const stmt = {
        bind(...values: any[]) {
          boundParams = values;
          return stmt;
        },
        async first<T = unknown>(): Promise<T | null> {
          if (query.includes('COUNT(*)')) {
            return { count: subscriptions.length } as T;
          }
          return null;
        },
        async run(): Promise<any> {
          if (query.includes('INSERT OR REPLACE INTO push_subscriptions')) {
            const row = {
              id: boundParams[0],
              endpoint: boundParams[1],
              p256dh: boundParams[2],
              auth: boundParams[3],
              fingerprint: boundParams[4],
              createdAt: boundParams[5],
              created_at: boundParams[6] ?? boundParams[5],
            };
            const idx = subscriptions.findIndex((s) => s.endpoint === row.endpoint);
            if (idx >= 0) subscriptions[idx] = row;
            else subscriptions.push(row);
            return { success: true, meta: {} };
          }
          if (query.includes('DELETE FROM push_subscriptions')) {
            const target = boundParams[0];
            const idx = subscriptions.findIndex((s) => s.endpoint === target || s.fingerprint === target);
            if (idx >= 0) subscriptions.splice(idx, 1);
            return { success: true, meta: {} };
          }
          return { success: true, meta: {} };
        },
        async all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: any }> {
          if (query.includes('FROM push_subscriptions')) {
            let res = [...subscriptions];
            if (boundParams.length > 0 && typeof boundParams[0] === 'string') {
              res = res.filter((s) => s.fingerprint === boundParams[0]);
            }
            return { results: res as unknown as T[], success: true, meta: {} };
          }
          return { results: [], success: true, meta: {} };
        },
        async raw() {
          return [];
        },
      };
      return stmt as any;
    },
    async batch() {
      return [];
    },
    async exec() {
      return { count: 0, duration: 0 };
    },
  };
}

// ─── TEST SUITE ───────────────────────────────────────────────────────────────

describe('UREfy Sovereign Web Push (VAPID) Engine', () => {
  let mockPushSubscription: any;
  let mockPushManager: any;
  let mockRegistration: any;
  let mockNotificationConstructor: any;
  let eventListenersMap: Map<string, Array<(event: any) => void>>;

  beforeEach(() => {
    eventListenersMap = new Map();
    globalPushSubscriptionsStore.length = 0;

    // Mock PushSubscription
    mockPushSubscription = {
      endpoint: 'https://push.services.sovereign.local/v1/sub_0x9911aabb',
      expirationTime: null,
      options: {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(DEFAULT_SOVEREIGN_VAPID_PUBLIC_KEY),
      },
      getKey: vi.fn().mockImplementation((keyType: string) => {
        if (keyType === 'p256dh') return new Uint8Array([1, 2, 3, 4]);
        if (keyType === 'auth') return new Uint8Array([5, 6, 7, 8]);
        return null;
      }),
      toJSON: vi.fn().mockReturnValue({
        endpoint: 'https://push.services.sovereign.local/v1/sub_0x9911aabb',
        expirationTime: null,
        keys: {
          p256dh: 'BN1234567890abcdef...',
          auth: 'authSecret12345...',
        },
      }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };

    // Mock PushManager
    mockPushManager = {
      subscribe: vi.fn().mockResolvedValue(mockPushSubscription),
      getSubscription: vi.fn().mockResolvedValue(null),
      permissionState: vi.fn().mockResolvedValue('granted'),
    };

    // Mock ServiceWorkerRegistration
    mockRegistration = {
      pushManager: mockPushManager,
      showNotification: vi.fn().mockResolvedValue(undefined),
      active: { state: 'activated' },
    };

    // Mock Notification API
    mockNotificationConstructor = vi.fn().mockImplementation((title: string, options?: any) => ({
      title,
      ...options,
      close: vi.fn(),
    }));
    mockNotificationConstructor.permission = 'granted';
    mockNotificationConstructor.requestPermission = vi.fn().mockResolvedValue('granted');

    (globalThis as any).Notification = mockNotificationConstructor;
    (globalThis as any).PushManager = function () {};

    // Mock navigator.serviceWorker
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          ready: Promise.resolve(mockRegistration),
          getRegistration: vi.fn().mockResolvedValue(mockRegistration),
          register: vi.fn().mockResolvedValue(mockRegistration),
        },
      },
      configurable: true,
      writable: true,
    });

    // Mock window & document
    const mockWindow: any = {
      Notification: mockNotificationConstructor,
      PushManager: globalThis.PushManager,
      addEventListener: (type: string, listener: any) => {
        if (!eventListenersMap.has(type)) eventListenersMap.set(type, []);
        eventListenersMap.get(type)!.push(listener);
      },
      removeEventListener: (type: string, listener: any) => {
        const arr = eventListenersMap.get(type) || [];
        eventListenersMap.set(type, arr.filter((l) => l !== listener));
      },
      dispatchEvent: (event: any) => {
        const handlers = eventListenersMap.get(event.type) || [];
        handlers.forEach((h) => h(event));
        return true;
      },
      clientStore: {
        keypair: {
          fingerprint: 'node_test_0xdeadbeef',
        },
      },
    };

    const mockDocument: any = {
      addEventListener: vi.fn(),
      getElementById: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    };

    (globalThis as any).window = mockWindow;
    (globalThis as any).document = mockDocument;

    // Mock CustomEvent
    (globalThis as any).CustomEvent = class CustomEvent<T = any> {
      type: string;
      detail: T;
      constructor(type: string, params?: { detail?: T }) {
        this.type = type;
        this.detail = params?.detail as T;
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 1. VAPID KEY BASE64 CONVERSION ─────────────────────────────────────────

  describe('1. VAPID Key Base64 & URL-Safe Encoding / Decoding (urlBase64ToUint8Array)', () => {
    it('should decode URL-safe base64 string to Uint8Array correctly', () => {
      const b64url = 'BL9D0PifvsBs6z5XeIgtOW7ITwg3FSe9nMTLOeMpSqBrLL9w-K3SguQ5uojva6eVmSRGGbXe8mIHZC7udbEx6xE';
      const bytes = urlBase64ToUint8Array(b64url);

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(65);
      // First byte of uncompressed EC point must be 0x04
      expect(bytes[0]).toBe(4);
    });

    it('should handle standard base64 strings with + and / characters', () => {
      const standardB64 = 'BL9D0PifvsBs6z5XeIgtOW7ITwg3FSe9nMTLOeMpSqBrLL9w+K3SguQ5uojva6eVmSRGGbXe8mIHZC7udbEx6xE=';
      const bytes = urlBase64ToUint8Array(standardB64);

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(65);
      expect(bytes[0]).toBe(4);
    });

    it('should automatically handle missing base64 padding', () => {
      // Test strings with length % 4 == 2 and 3
      const text = 'Hello Sovereign Mesh';
      const encoded = btoa(text).replace(/=+$/, ''); // strip padding
      const decodedBytes = urlBase64ToUint8Array(encoded);
      const decodedText = new TextDecoder().decode(decodedBytes);

      expect(decodedText).toBe(text);
    });

    it('should round-trip between Uint8Array and URL-safe base64', () => {
      const originalBytes = new Uint8Array([0x04, 0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0xff]);
      const encoded = uint8ArrayToUrlBase64(originalBytes);

      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');

      const restoredBytes = urlBase64ToUint8Array(encoded);
      expect(Array.from(restoredBytes)).toEqual(Array.from(originalBytes));
    });
  });

  // ─── 2. PERMISSION STATE HANDLING ───────────────────────────────────────────

  describe('2. Permission State Handling (getPermissionState & requestPermission)', () => {
    it('should report granted permission when Notification.permission is granted', () => {
      const push = new SovereignWebPush();
      expect(push.getPermissionState()).toBe('granted');
    });

    it('should report denied or default when Notification.permission changes', () => {
      mockNotificationConstructor.permission = 'denied';
      const push = new SovereignWebPush();
      expect(push.getPermissionState()).toBe('denied');

      mockNotificationConstructor.permission = 'default';
      expect(push.getPermissionState()).toBe('default');
    });

    it('should gracefully return denied when Notification API is absent in environment', () => {
      const originalNotif = (globalThis as any).Notification;
      delete (globalThis as any).Notification;

      const push = new SovereignWebPush();
      expect(push.getPermissionState()).toBe('denied');
      expect(push.isSupported()).toBe(false);

      (globalThis as any).Notification = originalNotif;
    });

    it('should request permission and dispatch permission_changed event', async () => {
      mockNotificationConstructor.permission = 'default';
      mockNotificationConstructor.requestPermission.mockResolvedValueOnce('granted');

      const push = new SovereignWebPush();
      let eventDispatched = false;

      (globalThis as any).window.addEventListener('aetheris:push:permission_changed', (e: any) => {
        if (e.detail?.permission === 'granted') {
          eventDispatched = true;
        }
      });

      const result = await push.requestPermission();
      expect(result).toBe('granted');
      expect(mockNotificationConstructor.requestPermission).toHaveBeenCalledTimes(1);
      expect(eventDispatched).toBe(true);
    });
  });

  // ─── 3. SUBSCRIPTION REGISTRATION FLOW & EDGE INTEGRATION ───────────────────

  describe('3. Subscription Registration Flow & Payload Dispatch (subscribeUser & unsubscribeUser)', () => {
    it('should subscribe user through PushManager, fetch VAPID key and post to /api/push', async () => {
      const push = new SovereignWebPush();
      mockNotificationConstructor.permission = 'granted';

      // Mock fetch for VAPID key GET and subscribe POST
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, opts: any) => {
        if (typeof url === 'string' && url.includes('action=vapid-public-key')) {
          return new Response(JSON.stringify({ success: true, publicKey: DEFAULT_SOVEREIGN_VAPID_PUBLIC_KEY }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (typeof url === 'string' && url.includes('/api/push') && opts?.method === 'POST') {
          const body = JSON.parse(opts.body);
          return new Response(JSON.stringify({ success: true, subscription: body }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('Not found', { status: 404 });
      });

      const subscription = await push.subscribeUser('node_genesis_0x1234');

      expect(subscription).toBeDefined();
      expect(subscription?.endpoint).toBe(mockPushSubscription.endpoint);
      expect(mockPushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      });

      // Verify POST call to Edge /api/push
      const postCall = fetchSpy.mock.calls.find((c) => c[0] === '/api/push' && (c[1] as any)?.method === 'POST');
      expect(postCall).toBeDefined();
      const sentPayload = JSON.parse((postCall![1] as any).body);
      expect(sentPayload.action).toBe('subscribe');
      expect(sentPayload.endpoint).toBe(mockPushSubscription.endpoint);
      expect(sentPayload.fingerprint).toBe('node_genesis_0x1234');
      expect(sentPayload.keys.p256dh).toBeDefined();

      fetchSpy.mockRestore();
    });

    it('should return null if user denies permission during subscribeUser flow', async () => {
      mockNotificationConstructor.permission = 'default';
      mockNotificationConstructor.requestPermission.mockResolvedValueOnce('denied');

      const push = new SovereignWebPush();
      const sub = await push.subscribeUser();

      expect(sub).toBeNull();
      expect(mockPushManager.subscribe).not.toHaveBeenCalled();
    });

    it('should unsubscribe user cleanly from PushManager and notify /api/push', async () => {
      mockPushManager.getSubscription.mockResolvedValue(mockPushSubscription);
      const push = new SovereignWebPush();

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, opts: any) => {
        if (typeof url === 'string' && url.includes('/api/push') && opts?.method === 'POST') {
          return new Response(JSON.stringify({ success: true, unsubscribed: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('Not found', { status: 404 });
      });

      const success = await push.unsubscribeUser('node_genesis_0x1234');

      expect(success).toBe(true);
      expect(mockPushSubscription.unsubscribe).toHaveBeenCalledTimes(1);

      // Verify POST call with action: 'unsubscribe'
      const postCall = fetchSpy.mock.calls.find((c) => c[0] === '/api/push' && (c[1] as any)?.method === 'POST');
      expect(postCall).toBeDefined();
      const sentPayload = JSON.parse((postCall![1] as any).body);
      expect(sentPayload.action).toBe('unsubscribe');
      expect(sentPayload.endpoint).toBe(mockPushSubscription.endpoint);

      fetchSpy.mockRestore();
    });
  });

  // ─── 4. LOCAL NOTIFICATION FALLBACK ─────────────────────────────────────────

  describe('4. Local Notification Fallback Mechanism (showLocalNotification)', () => {
    it('should use Service Worker registration.showNotification when SW is available', async () => {
      const push = new SovereignWebPush();
      mockNotificationConstructor.permission = 'granted';

      await push.showLocalNotification('Sovereign Alert', {
        body: 'Encrypted packet received',
        tag: 'tag-1',
      });

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        'Sovereign Alert',
        expect.objectContaining({
          body: 'Encrypted packet received',
          tag: 'tag-1',
          icon: '/favicon.svg',
          badge: '/favicon.svg',
        })
      );
    });

    it('should fallback to window.Notification constructor when SW registration is unavailable', async () => {
      // Remove service worker support
      (globalThis as any).navigator = {};

      const push = new SovereignWebPush();
      mockNotificationConstructor.permission = 'granted';

      await push.showLocalNotification('Fallback Alert', {
        body: 'Window notification fallback executed',
      });

      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        'Fallback Alert',
        expect.objectContaining({
          body: 'Window notification fallback executed',
          icon: '/favicon.svg',
        })
      );
    });

    it('should not dispatch notification if permission is denied', async () => {
      mockNotificationConstructor.permission = 'denied';

      const push = new SovereignWebPush();
      await push.showLocalNotification('Blocked Notification');

      expect(mockRegistration.showNotification).not.toHaveBeenCalled();
      expect(mockNotificationConstructor).not.toHaveBeenCalled();
    });
  });

  // ─── 5. CONNECTED PUSH TRIGGERS (DMs, MENTIONS, EMERGENCY BROADCASTS) ───────

  describe('5. Connected Push Triggers (triggerDMNotification, triggerMentionNotification, triggerEmergencyBroadcast)', () => {
    it('should format and dispatch encrypted DM notifications', async () => {
      const push = new SovereignWebPush();
      const showSpy = vi.spyOn(push, 'showLocalNotification').mockResolvedValue(undefined);

      await push.triggerDMNotification('peer_validator_0xabcdef1234567890', 'Hello from the sovereign E2EE channel!');

      expect(showSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Sovereign E2EE Message'),
        expect.objectContaining({
          body: expect.stringContaining('Hello from the sovereign E2EE channel!'),
          tag: expect.stringContaining('dm-peer_validator_0xabcdef1234567890'),
          data: expect.objectContaining({ type: 'dm', url: '/#relays' }),
        })
      );
    });

    it('should format and dispatch circle mention notifications', async () => {
      const push = new SovereignWebPush();
      const showSpy = vi.spyOn(push, 'showLocalNotification').mockResolvedValue(undefined);

      await push.triggerMentionNotification('Core Cryptography Discussion', 'You were tagged in post #42', 'post-42');

      expect(showSpy).toHaveBeenCalledWith(
        '@ Sovereign Mention: Core Cryptography Discussion',
        expect.objectContaining({
          body: 'You were tagged in post #42',
          tag: expect.stringContaining('mention-post-42'),
          data: expect.objectContaining({ type: 'mention', postId: 'post-42', url: '/#vault?post=post-42' }),
        })
      );
    });

    it('should format and dispatch emergency broadcast notifications with required interaction', async () => {
      const push = new SovereignWebPush();
      const showSpy = vi.spyOn(push, 'showLocalNotification').mockResolvedValue(undefined);

      await push.triggerEmergencyBroadcast('Validator node slashed due to double-sign attempt.');

      expect(showSpy).toHaveBeenCalledWith(
        '🚨 Sovereign Emergency Broadcast',
        expect.objectContaining({
          body: 'Validator node slashed due to double-sign attempt.',
          tag: 'emergency-broadcast',
          requireInteraction: true,
          data: expect.objectContaining({ type: 'emergency_broadcast' }),
        })
      );
    });
  });

  // ─── 6. HELPER UI COMPONENTS (BANNER & SETTINGS WIDGET) ─────────────────────

  describe('6. Helper UI Components & Sovereign Privacy Explanations', () => {
    it('should render Push Opt-In Banner containing the mandatory zero-tracking statement', () => {
      mockNotificationConstructor.permission = 'default';
      const push = new SovereignWebPush();

      const html = push.renderPushOptInBanner();

      expect(html).toContain('id="sovereign-push-opt-in-banner"');
      expect(html).toContain('Sovereign Web Push');
      expect(html).toContain('data-action="push-subscribe"');
      expect(html).toContain('data-action="push-dismiss"');
      // Mandatory sovereign privacy explanation
      expect(html).toContain(
        '100% Zero-Tracking Sovereign Push: No Google Firebase, no third-party trackers, direct E2EE push payloads'
      );
    });

    it('should return empty string when user has already granted permission', () => {
      mockNotificationConstructor.permission = 'granted';
      const push = new SovereignWebPush();

      const html = push.renderPushOptInBanner();
      expect(html).toBe('');
    });

    it('should dismiss banner and not render again once dismissed', () => {
      mockNotificationConstructor.permission = 'default';
      const push = new SovereignWebPush();

      expect(push.isBannerDismissed()).toBe(false);
      push.dismissBanner();
      expect(push.isBannerDismissed()).toBe(true);

      const html = push.renderPushOptInBanner();
      expect(html).toBe('');
    });

    it('should render comprehensive settings widget with status badges and test buttons', () => {
      const push = new SovereignWebPush();
      const html = push.renderPushSettingsWidget();

      expect(html).toContain('id="sovereign-push-settings-widget"');
      expect(html).toContain('Native Sovereign Push Engine');
      expect(html).toContain('RFC 8292 VAPID ECDSA P-256');
      expect(html).toContain('data-action="push-subscribe"');
      expect(html).toContain('data-action="push-test"');
      expect(html).toContain(
        '100% Zero-Tracking Sovereign Push: No Google Firebase, no third-party trackers, direct E2EE push payloads'
      );
    });
  });

  // ─── 7. CLOUDFLARE EDGE PAGES FUNCTION (/api/push) ──────────────────────────

  describe('7. Cloudflare Edge Pages Function (/api/push) GET & POST Handlers', () => {
    const testVapidEnv = {
      VAPID_PUBLIC_KEY: SOVEREIGN_VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY: JSON.stringify({
        kty: 'EC',
        crv: 'P-256',
        x: 'v0PQ-J--wGzrPld4iC05bshPCDcVJ72cxMs54ylKoGs',
        y: 'LL9w-K3SguQ5uojva6eVmSRGGbXe8mIHZC7udbEx6xE',
        d: 'EHGn1Mt3BbvYZQEA_gOjToaEXKjMwuUIjZXy98B10U8',
      }),
    };

    it('GET /api/push?action=vapid-public-key should return sovereign ECDSA P-256 key when configured in env', async () => {
      const req = new Request('https://urefy.com/api/push?action=vapid-public-key');
      const res = await handlePushGet({ request: req, env: testVapidEnv });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.curve).toBe('P-256');
      expect(json.algorithm).toBe('ECDSA');
      expect(json.publicKey).toBe(SOVEREIGN_VAPID_PUBLIC_KEY);
    });

    it('GET /api/push?action=vapid-public-key should return 503 when VAPID keys missing in env', async () => {
      const req = new Request('https://urefy.com/api/push?action=vapid-public-key');
      const res = await handlePushGet({ request: req, env: {} });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('VAPID keys not configured in environment.');
    });

    it('GET /api/push?action=stats should return current subscription count', async () => {
      const req = new Request('https://urefy.com/api/push?action=stats');
      const res = await handlePushGet({ request: req });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(typeof json.count).toBe('number');
    });

    it('POST /api/push action=subscribe should register a new subscription', async () => {
      const payload = {
        action: 'subscribe',
        endpoint: 'https://push.browser.local/token_sub_test_01',
        keys: {
          p256dh: 'BNTestP256dhKey...',
          auth: 'authSecretTest...',
        },
        fingerprint: 'node_test_fingerprint',
      };

      const req = new Request('https://urefy.com/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await handlePushPost({ request: req });
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.subscription.endpoint).toBe(payload.endpoint);
      expect(json.subscription.p256dh).toBe(payload.keys.p256dh);
      expect(json.subscription.fingerprint).toBe(payload.fingerprint);
    });

    it('POST /api/push action=subscribe with Cloudflare D1 persistence', async () => {
      const mockD1 = createMockD1();

      const payload = {
        action: 'subscribe',
        endpoint: 'https://push.browser.local/token_d1_01',
        keys: {
          p256dh: 'BNTestD1...',
          auth: 'authD1...',
        },
        fingerprint: 'node_d1_user',
      };

      const req = new Request('https://urefy.com/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await handlePushPost({ request: req, env: { DB: mockD1 } });
      expect(res.status).toBe(201);

      // Verify D1 stats
      const statsReq = new Request('https://urefy.com/api/push?action=stats');
      const statsRes = await handlePushGet({ request: statsReq, env: { DB: mockD1 } });
      const statsJson = await statsRes.json();
      expect(statsJson.count).toBe(1);
    });

    it('POST /api/push action=unsubscribe should remove registration', async () => {
      // First subscribe
      globalPushSubscriptionsStore.push({
        id: 'sub_test_01',
        endpoint: 'https://push.browser.local/to_delete',
        p256dh: 'key...',
        auth: 'auth...',
        fingerprint: 'user_to_delete',
        createdAt: Date.now(),
      });

      const req = new Request('https://urefy.com/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          endpoint: 'https://push.browser.local/to_delete',
        }),
      });

      const res = await handlePushPost({ request: req });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.unsubscribed).toBe(true);
      expect(globalPushSubscriptionsStore.find((s) => s.endpoint === 'https://push.browser.local/to_delete')).toBeUndefined();
    });

    it('POST /api/push action=broadcast should dispatch notification payload to subscribers', async () => {
      // Add subscriber
      globalPushSubscriptionsStore.push({
        id: 'sub_broadcast_01',
        endpoint: 'https://push.browser.local/subscriber_1',
        p256dh: 'key1...',
        auth: 'auth1...',
        fingerprint: 'user_1',
        createdAt: Date.now(),
      });

      const req = new Request('https://urefy.com/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          title: 'System Emergency Broadcast',
          body: 'Consensus node upgrade required',
          data: { url: '/#relays' },
        }),
      });

      const res = await handlePushPost({ request: req, env: testVapidEnv });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.action).toBe('broadcast');
      expect(json.delivered).toBeGreaterThanOrEqual(1);
      expect(json.payload.title).toBe('System Emergency Broadcast');
      expect(json.payload.body).toBe('Consensus node upgrade required');
    });

    it('POST /api/push action=broadcast should return 503 when VAPID keys missing in env', async () => {
      const req = new Request('https://urefy.com/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          title: 'System Emergency Broadcast',
        }),
      });

      const res = await handlePushPost({ request: req, env: {} });
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('VAPID keys not configured in environment.');
    });

    it('POST /api/push should return 400 for missing mandatory subscription parameters', async () => {
      const req = new Request('https://urefy.com/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe' }), // missing endpoint and keys
      });

      const res = await handlePushPost({ request: req });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Missing required push subscription fields');
    });

    it('POST /api/push should return 400 for invalid action', async () => {
      const req = new Request('https://urefy.com/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unknown_action' }),
      });

      const res = await handlePushPost({ request: req });
      expect(res.status).toBe(400);
    });

    it('createVapidJwt helper creates valid JWT token signed with ECDSA P-256', async () => {
      const audience = 'https://push.services.mozilla.com';
      const jwt = await createVapidJwt(audience);

      expect(typeof jwt).toBe('string');
      const parts = jwt.split('.');
      expect(parts.length).toBe(3);

      const header = JSON.parse(atob(parts[0]));
      expect(header.alg).toBe('ES256');
      expect(header.typ).toBe('JWT');

      const claims = JSON.parse(atob(parts[1]));
      expect(claims.aud).toBe(audience);
      expect(claims.sub).toContain('mailto:');
      expect(claims.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });
});
