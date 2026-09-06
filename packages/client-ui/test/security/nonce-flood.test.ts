import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkAndRecordNonceMemory,
  resetReplayNonceCache,
  globalReplayNonceCache,
  MAX_NONCES,
} from '../../functions/api/_auth.js';

describe('Security Gate: Bounded LRU Nonce Memory Cap & Anti-DoS Flood Protection', () => {
  beforeEach(() => {
    resetReplayNonceCache();
  });

  it('strictly caps memory cache size to MAX_NONCES (10,000) under high-throughput flood', () => {
    const FLOOD_COUNT = 15_000;

    for (let i = 0; i < FLOOD_COUNT; i++) {
      const nonce = `flood-nonce-${i.toString(16).padStart(8, '0')}-${Date.now()}`;
      const recorded = checkAndRecordNonceMemory(nonce);
      expect(recorded).toBe(true);
    }

    // Cache must never exceed the bounded cap
    expect(globalReplayNonceCache.size).toBeLessThanOrEqual(MAX_NONCES);
    expect(globalReplayNonceCache.size).toBe(MAX_NONCES);
  });

  it('rejects duplicate nonces while retaining active entries', () => {
    const nonce = 'unique-session-nonce-1234567890';
    const firstCheck = checkAndRecordNonceMemory(nonce);
    expect(firstCheck).toBe(true);

    // Second check must be rejected as duplicate
    const secondCheck = checkAndRecordNonceMemory(nonce);
    expect(secondCheck).toBe(false);
  });
});
