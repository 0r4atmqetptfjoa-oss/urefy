import { describe, it, expect, beforeEach } from 'vitest';
import {
  verifyAndConsumeNonce,
  checkAndRecordNonceDistributed,
  resetReplayNonceCache,
} from '../functions/api/_auth.js';

describe('Signed-Nonce Replay Protection Fails Closed (Finding 8)', () => {
  beforeEach(() => {
    resetReplayNonceCache();
  });

  describe('Production Environment Fail-Closed Semantics', () => {
    it('fails closed when D1 storage is missing in production', async () => {
      const prodEnv = { ENVIRONMENT: 'production' };
      const res = await verifyAndConsumeNonce(prodEnv, 'user-alice', 'nonce-001');

      expect(res.fresh).toBe(false);
      expect(res.error).toMatch(/replay protection failed closed/i);
    });

    it('checkAndRecordNonceDistributed also fails closed in production without D1', async () => {
      const prodEnv = { ENVIRONMENT: 'production' };
      const res = await checkAndRecordNonceDistributed(prodEnv, 'user-alice', 'nonce-002');

      expect(res.fresh).toBe(false);
      expect(res.error).toMatch(/replay protection failed closed/i);
    });

    it('fails closed when D1 storage encounters a database / connection failure in production', async () => {
      const mockD1 = {
        prepare: () => ({
          bind: () => ({
            run: async () => {
              throw new Error('D1_INTERNAL_STORAGE_ERROR: connection refused');
            },
          }),
        }),
      };

      const prodEnv = { DB: mockD1 as any, ENVIRONMENT: 'production' };
      const res = await verifyAndConsumeNonce(prodEnv, 'user-alice', 'nonce-003');

      expect(res.fresh).toBe(false);
      expect(res.error).toMatch(/replay protection failed closed/i);
    });

    it('detects duplicate nonce via UNIQUE constraint in D1 and rejects replay', async () => {
      let callCount = 0;
      const mockD1 = {
        prepare: () => ({
          bind: () => ({
            run: async () => {
              callCount++;
              if (callCount > 1) {
                throw new Error('D1_ERROR: UNIQUE constraint failed: used_nonces.fingerprint, used_nonces.nonce');
              }
              return { meta: { changes: 1 } };
            },
          }),
        }),
      };

      const prodEnv = { DB: mockD1 as any, ENVIRONMENT: 'production' };

      // First call succeeds
      const first = await verifyAndConsumeNonce(prodEnv, 'user-bob', 'nonce-unique-1');
      expect(first.fresh).toBe(true);

      // Second call fails with replay attack detected
      const second = await verifyAndConsumeNonce(prodEnv, 'user-bob', 'nonce-unique-1');
      expect(second.fresh).toBe(false);
      expect(second.error).toMatch(/replay attack detected/i);
    });
  });

  describe('Timestamp Window Verification', () => {
    it('rejects stale timestamp exceeding TTL window', async () => {
      const staleTimestamp = Date.now() - 400000; // 400 seconds ago (> 300s)
      const res = await verifyAndConsumeNonce({}, 'user-carol', 'nonce-stale', staleTimestamp);

      expect(res.fresh).toBe(false);
      expect(res.error).toMatch(/timestamp outside acceptable freshness window/i);
    });

    it('accepts fresh timestamp within acceptable drift window', async () => {
      const freshTimestamp = Date.now() - 5000; // 5 seconds ago (< 300s)
      const res = await verifyAndConsumeNonce({}, 'user-carol', 'nonce-fresh', freshTimestamp);

      expect(res.fresh).toBe(true);
    });
  });

  describe('Non-Production / Local Development Fallback', () => {
    it('allows in-memory fallback in non-production when D1 is missing', async () => {
      const devEnv = { ENVIRONMENT: 'development' };
      const res = await verifyAndConsumeNonce(devEnv, 'user-dave', 'dev-nonce-1');

      expect(res.fresh).toBe(true);
    });

    it('enforces in-memory replay detection in non-production', async () => {
      const devEnv = { ENVIRONMENT: 'development' };
      const res1 = await verifyAndConsumeNonce(devEnv, 'user-dave', 'dev-nonce-replay');
      expect(res1.fresh).toBe(true);

      const res2 = await verifyAndConsumeNonce(devEnv, 'user-dave', 'dev-nonce-replay');
      expect(res2.fresh).toBe(false);
      expect(res2.error).toMatch(/replay attack detected/i);
    });
  });
});
