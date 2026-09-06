import { describe, it, expect, beforeEach } from 'vitest';
import {
  onRequestGet as handlePushGet,
  onRequestPost as handlePushPost,
} from '../functions/api/push.js';
import { globalPushSubscriptionsStore } from '../functions/api/_db.js';

describe('Push Notifications API Fail-Closed Enforcement (Finding 6)', () => {
  const prodEnvWithoutDb = {
    ENVIRONMENT: 'production',
  };

  const throwingDb = {
    prepare: () => ({
      bind: () => ({
        run: () => Promise.reject(new Error('D1_WRITE_FAILURE')),
        all: () => Promise.reject(new Error('D1_READ_FAILURE')),
        first: () => Promise.reject(new Error('D1_READ_FAILURE')),
      }),
      run: () => Promise.reject(new Error('D1_WRITE_FAILURE')),
      all: () => Promise.reject(new Error('D1_READ_FAILURE')),
      first: () => Promise.reject(new Error('D1_READ_FAILURE')),
    }),
  };

  const failingResultDb = {
    prepare: () => ({
      bind: () => ({
        run: () => Promise.resolve({ success: false, meta: {}, error: 'SQLITE_CONSTRAINT' }),
        all: () => Promise.resolve({ results: [], success: false, meta: {} }),
        first: () => Promise.resolve(null),
      }),
      run: () => Promise.resolve({ success: false, meta: {}, error: 'SQLITE_CONSTRAINT' }),
      all: () => Promise.resolve({ results: [], success: false, meta: {} }),
      first: () => Promise.resolve(null),
    }),
  };

  const workingDb = (rows: any[] = []) => {
    const table = [...rows];
    return {
      prepare: (query: string) => ({
        bind: (...args: any[]) => ({
          run: async () => {
            if (query.includes('INSERT')) {
              table.push({
                id: args[0],
                endpoint: args[1],
                p256dh: args[2],
                auth: args[3],
                fingerprint: args[4],
                created_at: args[5],
              });
            } else if (query.includes('DELETE')) {
              const target = args[0];
              const idx = table.findIndex((r) => r.endpoint === target || r.fingerprint === target);
              if (idx >= 0) table.splice(idx, 1);
            }
            return { success: true, meta: {} };
          },
          all: async () => ({ results: table, success: true, meta: {} }),
          first: async () => ({ count: table.length }),
        }),
      }),
    };
  };

  beforeEach(() => {
    globalPushSubscriptionsStore.length = 0;
  });

  describe('1. Missing D1 Database in Production (HTTP 503)', () => {
    it('returns 503 when subscribing without D1 in production', async () => {
      const req = new Request('https://aetheris.pages.dev/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token-123',
          keys: {
            p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3qcVok45VOWv5AWDptTxq',
            auth: 'tBHItJI5svbpez7KI4CCXg',
          },
        }),
      });

      const res = await handlePushPost({ request: req, env: prodEnvWithoutDb as any });
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Production Push notification registry requires Cloudflare D1 database');
      expect(globalPushSubscriptionsStore.length).toBe(0);
    });

    it('returns 503 when unsubscribing without D1 in production', async () => {
      const req = new Request('https://aetheris.pages.dev/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token-123',
        }),
      });

      const res = await handlePushPost({ request: req, env: prodEnvWithoutDb as any });
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Production Push notification registry requires Cloudflare D1 database');
    });

    it('returns 503 for stats action without D1 in production', async () => {
      const req = new Request('https://aetheris.pages.dev/api/push?action=stats');
      const res = await handlePushGet({ request: req, env: prodEnvWithoutDb as any });
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Production Push notification registry requires Cloudflare D1 database');
    });

    it('returns 503 for broadcast action without D1 in production', async () => {
      const req = new Request('https://aetheris.pages.dev/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          title: 'Emergency Advisory',
          body: 'Critical system notice',
        }),
      });

      const res = await handlePushPost({ request: req, env: prodEnvWithoutDb as any });
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Production Push notification registry requires Cloudflare D1 database');
    });
  });

  describe('2. D1 Write Failure in Production (HTTP 500 Fail-Closed)', () => {
    it('returns 500 when D1 INSERT throws error and does NOT store subscription in memory', async () => {
      const req = new Request('https://aetheris.pages.dev/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          endpoint: 'https://push.example.com/unpersisted-sub',
          keys: {
            p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3qcVok45VOWv5AWDptTxq',
            auth: 'tBHItJI5svbpez7KI4CCXg',
          },
        }),
      });

      const res = await handlePushPost({
        request: req,
        env: { ENVIRONMENT: 'production', DB: throwingDb } as any,
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to persist push subscription to persistent storage');

      // Verify no leakage into memory store in production
      expect(globalPushSubscriptionsStore.some((s) => s.endpoint === 'https://push.example.com/unpersisted-sub')).toBe(false);
    });

    it('returns 500 when D1 INSERT returns !res.success', async () => {
      const req = new Request('https://aetheris.pages.dev/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          endpoint: 'https://push.example.com/failed-result-sub',
          keys: {
            p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3qcVok45VOWv5AWDptTxq',
            auth: 'tBHItJI5svbpez7KI4CCXg',
          },
        }),
      });

      const res = await handlePushPost({
        request: req,
        env: { ENVIRONMENT: 'production', DB: failingResultDb } as any,
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to persist push subscription to persistent storage');
      expect(globalPushSubscriptionsStore.length).toBe(0);
    });

    it('returns 500 when D1 DELETE throws error on unsubscribe', async () => {
      const req = new Request('https://aetheris.pages.dev/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          endpoint: 'https://push.example.com/sub-to-delete',
        }),
      });

      const res = await handlePushPost({
        request: req,
        env: { ENVIRONMENT: 'production', DB: throwingDb } as any,
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to remove push subscription from persistent storage');
    });

    it('returns 500 when D1 DELETE returns !res.success on unsubscribe', async () => {
      const req = new Request('https://aetheris.pages.dev/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          endpoint: 'https://push.example.com/sub-to-delete-fail',
        }),
      });

      const res = await handlePushPost({
        request: req,
        env: { ENVIRONMENT: 'production', DB: failingResultDb } as any,
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to remove push subscription from persistent storage');
    });
  });

  describe('3. Successful Production Persistence with D1', () => {
    it('persists subscription to D1 and returns 201 without updating in-memory store in production', async () => {
      const mockD1 = workingDb();
      const req = new Request('https://aetheris.pages.dev/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          endpoint: 'https://fcm.googleapis.com/fcm/send/valid-prod-token',
          keys: {
            p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3qcVok45VOWv5AWDptTxq',
            auth: 'tBHItJI5svbpez7KI4CCXg',
          },
          fingerprint: 'peer-prod-123',
        }),
      });

      const res = await handlePushPost({
        request: req,
        env: { ENVIRONMENT: 'production', DB: mockD1 } as any,
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.subscription.endpoint).toBe('https://fcm.googleapis.com/fcm/send/valid-prod-token');

      // In production, globalPushSubscriptionsStore must NOT be mutated as authoritative state
      expect(globalPushSubscriptionsStore.length).toBe(0);
    });

    it('removes subscription from D1 successfully in production', async () => {
      const mockD1 = workingDb([
        {
          id: 'sub-prod-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/to-remove',
          p256dh: 'key',
          auth: 'auth',
          fingerprint: 'peer-1',
        },
      ]);

      const req = new Request('https://aetheris.pages.dev/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          endpoint: 'https://fcm.googleapis.com/fcm/send/to-remove',
        }),
      });

      const res = await handlePushPost({
        request: req,
        env: { ENVIRONMENT: 'production', DB: mockD1 } as any,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.unsubscribed).toBe(true);
    });
  });

  describe('4. Development Mode In-Memory Fallback', () => {
    it('allows in-memory fallback when DB is absent in development', async () => {
      const req = new Request('https://aetheris.pages.dev/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          endpoint: 'https://push.dev.local/token-dev',
          keys: {
            p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3qcVok45VOWv5AWDptTxq',
            auth: 'tBHItJI5svbpez7KI4CCXg',
          },
        }),
      });

      const res = await handlePushPost({
        request: req,
        env: { ENVIRONMENT: 'development' } as any,
      });

      expect(res.status).toBe(201);
      expect(globalPushSubscriptionsStore.some((s) => s.endpoint === 'https://push.dev.local/token-dev')).toBe(true);
    });
  });
});
