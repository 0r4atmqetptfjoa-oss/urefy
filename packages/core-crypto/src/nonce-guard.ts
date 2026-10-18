/**
 * Aetheris Nonce & Replay Attack Defense Guard
 *
 * Provides sliding-window timestamp validation (±30s) and a hardened bounded
 * cache for cryptographic nonces to guarantee mathematical one-time execution
 * with fail-closed saturation protection against cache-flooding replay attacks.
 */

export interface SignedPayloadHeader {
  nonce: string;
  timestamp: number;
  senderFingerprint: string;
}

export class NonceReplayGuard {
  private readonly maxClockDriftMs: number;
  private readonly seenNonces: Map<string, number>; // nonceKey -> expiration timestamp
  private readonly maxCacheSize: number;

  constructor(maxClockDriftMs: number = 30000, maxCacheSize: number = 50000) {
    this.maxClockDriftMs = maxClockDriftMs;
    this.maxCacheSize = maxCacheSize;
    this.seenNonces = new Map();
  }

  /**
   * Validates that a timestamp falls within the allowed clock-drift window.
   */
  public isTimestampValid(timestamp: number, referenceTime: number = Date.now()): boolean {
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
      return false;
    }
    const diff = Math.abs(referenceTime - timestamp);
    return diff <= this.maxClockDriftMs;
  }

  /**
   * Checks if a nonce has already been seen.
   * If not seen and timestamp is valid, registers the nonce and returns true.
   * Fail-closed if cache is saturated with unexpired nonces.
   */
  public verifyAndConsume(
    header: SignedPayloadHeader,
    referenceTime: number = Date.now()
  ): { valid: boolean; reason?: string } {
    if (!header || typeof header !== 'object') {
      return { valid: false, reason: 'Missing payload header' };
    }

    if (!header.nonce || typeof header.nonce !== 'string' || header.nonce.trim().length < 8 || header.nonce.length > 128) {
      return { valid: false, reason: 'Invalid or missing nonce' };
    }

    if (!header.senderFingerprint || typeof header.senderFingerprint !== 'string') {
      return { valid: false, reason: 'Invalid or missing sender fingerprint' };
    }

    if (!this.isTimestampValid(header.timestamp, referenceTime)) {
      return {
        valid: false,
        reason: 'Timestamp outside acceptable window (potential replay or clock drift)',
      };
    }

    this._evictExpired(referenceTime);

    const nonceKey = `${header.senderFingerprint}:${header.nonce}`;
    const existingExpiry = this.seenNonces.get(nonceKey);
    if (existingExpiry !== undefined) {
      if (existingExpiry >= referenceTime) {
        return { valid: false, reason: 'Nonce already consumed (replay attack detected)' };
      }
      this.seenNonces.delete(nonceKey);
    }

    // Enforce max cache size safely: only evict if oldest entry is actually expired
    if (this.seenNonces.size >= this.maxCacheSize) {
      this._evictExpired(referenceTime, true);
      if (this.seenNonces.size >= this.maxCacheSize) {
        // Fail-closed: never evict an active nonce within the validity window,
        // otherwise an attacker could flood the cache to replay a captured packet.
        const oldestKey = this.seenNonces.keys().next().value;
        const oldestExpiry = oldestKey ? this.seenNonces.get(oldestKey) : undefined;
        if (oldestKey && oldestExpiry !== undefined && oldestExpiry < referenceTime) {
          this.seenNonces.delete(oldestKey);
        } else {
          return {
            valid: false,
            reason: 'Replay guard capacity saturated; rejecting request to preserve one-time execution guarantee',
          };
        }
      }
    }

    // Nonce must remain blocked until its timestamp can no longer pass isTimestampValid()
    const expiresAt = Math.max(header.timestamp, referenceTime) + this.maxClockDriftMs;
    this.seenNonces.set(nonceKey, expiresAt);

    return { valid: true };
  }

  /**
   * Generates a cryptographically secure random 32-hex character nonce.
   */
  public static generateNonce(): string {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    throw new Error('Cryptographically secure PRNG (crypto.getRandomValues) is required');
  }

  /**
   * Returns the count of actively tracked nonces.
   */
  public getActiveNonceCount(): number {
    return this.seenNonces.size;
  }

  /**
   * Clears all tracked nonces.
   */
  public clear(): void {
    this.seenNonces.clear();
  }

  /**
   * Sweeps expired nonces. Because incoming timestamps can have ±maxClockDriftMs skew,
   * insertion order is only approximately sorted, so we scan up to a bounded budget
   * or perform a full sweep when under memory pressure.
   */
  private _evictExpired(currentTime: number, fullSweep: boolean = false): void {
    let scanned = 0;
    const scanBudget = fullSweep ? this.seenNonces.size : 256;

    for (const [key, expiresAt] of this.seenNonces.entries()) {
      if (expiresAt < currentTime) {
        this.seenNonces.delete(key);
      }
      scanned++;
      if (scanned >= scanBudget) {
        break;
      }
    }
  }
}

export const defaultNonceGuard = new NonceReplayGuard();
