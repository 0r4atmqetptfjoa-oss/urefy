/**
 * PersistentNonceGuard — Test Suite
 *
 * Uses an in-memory D1-compatible mock so tests run fully offline (no Wrangler).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PersistentNonceGuard, BloomFilter, type D1LikeDatabase, type D1LikeStatement } from '../src/nonce-guard-persistent.js';

// ---------------------------------------------------------------------------
// In-memory D1 mock
// ---------------------------------------------------------------------------

class InMemoryD1 implements D1LikeDatabase {
  /** nonce -> expires_at */
  private nonces: Map<string, number> = new Map();

  prepare(query: string): D1LikeStatement {
    const db = this;
    let boundValues: unknown[] = [];

    const stmt: D1LikeStatement = {
      bind(...values: unknown[]) {
        boundValues = values;
        return stmt;
      },
      async run() {
        const q = query.trim().toUpperCase();

        if (q.startsWith('INSERT OR IGNORE INTO NONCES')) {
          const [nonce, expiresAt] = boundValues as [string, number];
          if (db.nonces.has(nonce)) {
            return { success: true, meta: { changes: 0 } };
          }
          db.nonces.set(nonce, expiresAt);
          return { success: true, meta: { changes: 1 } };
        }

        if (q.startsWith('UPDATE NONCES SET EXPIRES_AT')) {
          const [expiresAt, nonce] = boundValues as [number, string];
          if (db.nonces.has(nonce)) {
            db.nonces.set(nonce, expiresAt);
            return { success: true, meta: { changes: 1 } };
          }
          return { success: true, meta: { changes: 0 } };
        }

        if (q.startsWith('DELETE FROM NONCES WHERE EXPIRES_AT')) {
          const [cutoff] = boundValues as [number];
          let deleted = 0;
          for (const [nonce, exp] of db.nonces) {
            if (exp <= cutoff) { db.nonces.delete(nonce); deleted++; }
          }
          return { success: true, meta: { changes: deleted } };
        }

        return { success: true, meta: { changes: 0 } };
      },
      async first<T>(colName?: string): Promise<T | null> {
        const q = query.trim().toUpperCase();

        if (q.startsWith('SELECT EXPIRES_AT FROM NONCES WHERE NONCE')) {
          const [nonce] = boundValues as [string];
          const exp = db.nonces.get(nonce);
          if (exp === undefined) return null;
          return { expires_at: exp } as T;
        }

        if (q.startsWith('SELECT COUNT(*)')) {
          const [cutoff] = boundValues as [number];
          let cnt = 0;
          for (const exp of db.nonces.values()) {
            if (exp > cutoff) cnt++;
          }
          return { cnt } as T;
        }

        return null;
      },
      async all<T>() {
        return { results: [] as T[] };
      }
    };

    return stmt;
  }

  async exec(_query: string): Promise<unknown> {
    // Schema creation — noop for in-memory mock
    return {};
  }

  async batch(statements: D1LikeStatement[]): Promise<unknown[]> {
    return Promise.all(statements.map(s => s.run()));
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGuard(bloom?: BloomFilter): { guard: PersistentNonceGuard; db: InMemoryD1 } {
  const db = new InMemoryD1();
  const guard = new PersistentNonceGuard(db, bloom);
  return { guard, db };
}

function randomNonce(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BloomFilter', () => {
  it('reports false for items never added', () => {
    const bf = new BloomFilter();
    expect(bf.mightContain('nonce-abc')).toBe(false);
    expect(bf.mightContain('nonce-xyz')).toBe(false);
  });

  it('always reports true for items that were added', () => {
    const bf = new BloomFilter();
    const keys = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];
    for (const k of keys) bf.add(k);
    for (const k of keys) expect(bf.mightContain(k)).toBe(true);
  });

  it('has a positive capacity', () => {
    const bf = new BloomFilter();
    expect(bf.getCapacity()).toBeGreaterThan(0);
  });

  it('does not reset after multiple adds', () => {
    const bf = new BloomFilter();
    bf.add('key-1');
    bf.add('key-2');
    expect(bf.mightContain('key-1')).toBe(true);
    expect(bf.mightContain('key-2')).toBe(true);
  });
});

describe('PersistentNonceGuard — Basic Replay Defense', () => {
  it('accepts a fresh nonce', async () => {
    const { guard } = makeGuard();
    const ok = await guard.checkAndRecord('fresh-nonce-1', 60_000);
    expect(ok).toBe(true);
  });

  it('rejects the same nonce immediately after recording', async () => {
    const { guard } = makeGuard();
    const nonce = 'replay-nonce-1';
    expect(await guard.checkAndRecord(nonce, 60_000)).toBe(true);
    expect(await guard.checkAndRecord(nonce, 60_000)).toBe(false);
  });

  it('rejects the same nonce on subsequent calls', async () => {
    const { guard } = makeGuard();
    const nonce = 'replay-nonce-2';
    await guard.checkAndRecord(nonce, 60_000);
    for (let i = 0; i < 5; i++) {
      expect(await guard.checkAndRecord(nonce, 60_000)).toBe(false);
    }
  });

  it('accepts different nonces independently', async () => {
    const { guard } = makeGuard();
    for (let i = 0; i < 20; i++) {
      const nonce = `unique-nonce-${i}`;
      expect(await guard.checkAndRecord(nonce, 60_000)).toBe(true);
    }
  });

  it('count returns correct live nonce count', async () => {
    const { guard } = makeGuard();
    for (let i = 0; i < 5; i++) {
      await guard.checkAndRecord(`count-nonce-${i}`, 60_000);
    }
    const cnt = await guard.count();
    expect(cnt).toBe(5);
  });
});

describe('PersistentNonceGuard — TTL and Expiry', () => {
  it('accepts an expired nonce (re-uses the slot) after TTL passes', async () => {
    const { guard } = makeGuard();
    const nonce = 'expiry-nonce-1';

    // Record with a 1ms TTL (effectively already expired)
    await guard.checkAndRecord(nonce, 1);
    // Wait a tiny bit so it's past TTL
    await new Promise(r => setTimeout(r, 10));

    // Should be re-accepted (slot reused)
    const ok = await guard.checkAndRecord(nonce, 60_000);
    expect(ok).toBe(true);
  });
});

describe('PersistentNonceGuard — purgeExpired', () => {
  it('purges expired nonces and returns correct count', async () => {
    const { guard } = makeGuard();

    // Add 3 with a 1ms TTL (will expire immediately)
    for (let i = 0; i < 3; i++) {
      await guard.checkAndRecord(`expired-${i}`, 1);
    }
    // Add 2 with a large TTL
    for (let i = 0; i < 2; i++) {
      await guard.checkAndRecord(`alive-${i}`, 60_000);
    }

    await new Promise(r => setTimeout(r, 20)); // let the expired ones expire

    const deleted = await guard.purgeExpired();
    expect(deleted).toBe(3);
    expect(await guard.count()).toBe(2);
  });

  it('purge of empty table returns 0', async () => {
    const { guard } = makeGuard();
    const deleted = await guard.purgeExpired();
    expect(deleted).toBe(0);
  });
});

describe('PersistentNonceGuard — ensureSchema', () => {
  it('ensureSchema completes without error', async () => {
    const { guard } = makeGuard();
    await expect(guard.ensureSchema()).resolves.not.toThrow();
  });
});

describe('PersistentNonceGuard — Bloom Filter Integration', () => {
  it('uses the provided Bloom Filter', async () => {
    const bloom = new BloomFilter();
    const { guard } = makeGuard(bloom);

    const nonce = 'bloom-test-nonce';
    await guard.checkAndRecord(nonce, 60_000);

    expect(bloom.mightContain(nonce)).toBe(true);
    expect(guard.getBloomFilter()).toBe(bloom);
  });

  it('Bloom Filter avoids false accept even with false-positive', async () => {
    // Simulate a scenario where Bloom says "maybe" but D1 says "not there"
    const bloom = new BloomFilter();
    const nonce = 'bloom-fp-nonce';
    // Pre-add to bloom (false positive) but DON'T insert into D1
    bloom.add(nonce);

    const { guard } = makeGuard(bloom);
    // checkAndRecord will see bloom hit, do SELECT → finds nothing → INSERT
    const ok = await guard.checkAndRecord(nonce, 60_000);
    expect(ok).toBe(true); // false positive handled correctly
  });

  it('second checkAndRecord after bloom+D1 both have the nonce returns false', async () => {
    const { guard } = makeGuard();
    const nonce = 'bloom-d1-both';
    await guard.checkAndRecord(nonce, 60_000);
    // Both bloom and D1 have it now
    const ok = await guard.checkAndRecord(nonce, 60_000);
    expect(ok).toBe(false);
  });
});

describe('PersistentNonceGuard — High Volume', () => {
  it('handles 200 unique nonces without false replays', async () => {
    const { guard } = makeGuard();
    const results: boolean[] = [];

    for (let i = 0; i < 200; i++) {
      results.push(await guard.checkAndRecord(`vol-nonce-${i}`, 60_000));
    }

    expect(results.every(r => r === true)).toBe(true);
    expect(await guard.count()).toBe(200);
  });

  it('random nonces all accepted exactly once', async () => {
    const { guard } = makeGuard();
    const nonces = Array.from({ length: 50 }, () => randomNonce());

    for (const n of nonces) {
      expect(await guard.checkAndRecord(n, 60_000)).toBe(true);
    }
    for (const n of nonces) {
      expect(await guard.checkAndRecord(n, 60_000)).toBe(false);
    }
  });
});
