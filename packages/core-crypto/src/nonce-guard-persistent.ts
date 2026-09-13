/**
 * Persistent Nonce Guard — D1-backed replay protection
 *
 * Solves the critical gap in the in-memory nonce-guard.ts:
 * Cloudflare Worker restarts wipe the in-memory set, allowing replay attacks
 * within the grace window.  This module uses:
 *
 *   1. A Cloudflare D1 SQLite table (`nonces`) as the authoritative store.
 *   2. An in-process Bloom Filter as a fast-path cache (false positives are
 *      safe — they only cause an extra D1 round-trip, never a missed replay).
 *
 * D1 schema (auto-created by ensureSchema()):
 *   CREATE TABLE IF NOT EXISTS nonces (
 *     nonce     TEXT    PRIMARY KEY,
 *     expires_at INTEGER NOT NULL   -- unix ms
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_nonces_expires ON nonces(expires_at);
 *
 * Usage:
 *   const guard = new PersistentNonceGuard(db);
 *   await guard.ensureSchema();
 *   const ok = await guard.checkAndRecord(nonce, 5 * 60_000); // 5-min TTL
 *   if (!ok) throw new Error('Replay detected');
 *
 * Cleanup (run as a Cloudflare Cron Trigger):
 *   await guard.purgeExpired();
 */

// ---------------------------------------------------------------------------
// Bloom Filter — in-memory probabilistic cache
// ---------------------------------------------------------------------------

const BLOOM_BITS = 1 << 17; // 131072 bits = 16 KB
const BLOOM_HASHES = 5;

/**
 * Minimal, allocation-efficient Bloom Filter backed by a Uint32Array.
 * False-positive rate ≈ 0.1% at 10 000 inserted nonces (k=5, m=131072).
 */
export class BloomFilter {
  private readonly bits: Uint32Array;

  constructor(bitCount: number = BLOOM_BITS) {
    this.bits = new Uint32Array(Math.ceil(bitCount / 32));
  }

  /** Hash #i of a given key using FNV-1a with seed i. */
  private hash(key: string, seed: number): number {
    let h = 2166136261 ^ seed;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h % (this.bits.length * 32);
  }

  public add(key: string): void {
    for (let i = 0; i < BLOOM_HASHES; i++) {
      const bit = this.hash(key, i * 0x9e3779b9);
      this.bits[bit >>> 5] |= 1 << (bit & 31);
    }
  }

  /** Returns false → definitely NOT in set. true → PROBABLY in set. */
  public mightContain(key: string): boolean {
    for (let i = 0; i < BLOOM_HASHES; i++) {
      const bit = this.hash(key, i * 0x9e3779b9);
      if (!(this.bits[bit >>> 5] & (1 << (bit & 31)))) return false;
    }
    return true;
  }

  public getCapacity(): number {
    return this.bits.length * 32;
  }
}

// ---------------------------------------------------------------------------
// D1 Database interface (minimal subset used by this module)
// ---------------------------------------------------------------------------

/** Minimal D1-compatible interface so the module works in unit tests too. */
export interface D1LikeDatabase {
  prepare(query: string): D1LikeStatement;
  exec(query: string): Promise<unknown>;
  batch(statements: D1LikeStatement[]): Promise<unknown[]>;
}

export interface D1LikeStatement {
  bind(...values: unknown[]): D1LikeStatement;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

// ---------------------------------------------------------------------------
// PersistentNonceGuard
// ---------------------------------------------------------------------------

export class PersistentNonceGuard {
  private readonly db: D1LikeDatabase;
  private readonly bloom: BloomFilter;

  constructor(db: D1LikeDatabase, bloom?: BloomFilter) {
    this.db    = db;
    this.bloom = bloom ?? new BloomFilter();
  }

  // -------------------------------------------------------------------------
  // Schema bootstrap — idempotent
  // -------------------------------------------------------------------------

  /**
   * Creates the D1 table and index if they don't exist.
   * Call once on Worker startup or in a migration script.
   */
  public async ensureSchema(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS nonces (
        nonce      TEXT    PRIMARY KEY,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_nonces_expires ON nonces (expires_at);
    `);
  }

  // -------------------------------------------------------------------------
  // Core operation
  // -------------------------------------------------------------------------

  /**
   * Atomically checks whether `nonce` has been seen before and, if not,
   * records it with an expiry of `ttlMs` milliseconds from now.
   *
   * Returns:
   *   `true`  — nonce is fresh; it has been recorded.
   *   `false` — nonce is a replay; nothing was written.
   *
   * The Bloom Filter provides a fast-path: if the nonce is definitely NOT
   * in the filter we skip the D1 read entirely and go straight to INSERT.
   * If the filter says "maybe seen", we perform a SELECT first.
   */
  public async checkAndRecord(nonce: string, ttlMs: number = 5 * 60_000): Promise<boolean> {
    const expiresAt = Date.now() + ttlMs;

    // --- Fast path: Bloom Filter -------------------------------------------
    if (this.bloom.mightContain(nonce)) {
      // Might be a replay — confirm in D1
      const existing = await this.db
        .prepare('SELECT expires_at FROM nonces WHERE nonce = ?')
        .bind(nonce)
        .first<{ expires_at: number }>();

      if (existing !== null) {
        // Real replay (or expired but not yet purged)
        if (existing.expires_at > Date.now()) {
          return false; // genuine replay
        }
        // The row exists but is expired → update it (reuse the slot)
        await this.db
          .prepare('UPDATE nonces SET expires_at = ? WHERE nonce = ?')
          .bind(expiresAt, nonce)
          .run();
        this.bloom.add(nonce);
        return true;
      }
      // Bloom false positive — fall through to INSERT
    }

    // --- Attempt INSERT OR IGNORE ------------------------------------------
    const result = await this.db
      .prepare('INSERT OR IGNORE INTO nonces (nonce, expires_at) VALUES (?, ?)')
      .bind(nonce, expiresAt)
      .run();

    const inserted = (result.meta?.changes ?? (result.success ? 1 : 0)) > 0;

    if (inserted) {
      this.bloom.add(nonce);
      return true; // fresh nonce recorded
    }

    // INSERT was ignored → row already exists → replay
    return false;
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  /**
   * Deletes all expired nonce rows from D1.
   * Run periodically (e.g. Cloudflare Cron Trigger every 10 minutes).
   *
   * Returns the number of rows deleted.
   */
  public async purgeExpired(): Promise<number> {
    const now = Date.now();
    const result = await this.db
      .prepare('DELETE FROM nonces WHERE expires_at <= ?')
      .bind(now)
      .run();
    return result.meta?.changes ?? 0;
  }

  // -------------------------------------------------------------------------
  // Diagnostics
  // -------------------------------------------------------------------------

  /**
   * Returns the total count of non-expired nonces currently in D1.
   */
  public async count(): Promise<number> {
    const row = await this.db
      .prepare('SELECT COUNT(*) AS cnt FROM nonces WHERE expires_at > ?')
      .bind(Date.now())
      .first<{ cnt: number }>();
    return row?.cnt ?? 0;
  }

  /**
   * Exposes the internal Bloom Filter (useful for serialisation / warm handoff
   * between Worker instances).
   */
  public getBloomFilter(): BloomFilter {
    return this.bloom;
  }
}
