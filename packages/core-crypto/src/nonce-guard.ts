/**
 * Aetheris Nonce & Replay Attack Defense Guard
 * 
 * Provides sliding-window timestamp validation (±30s) and an in-memory LRU
 * cache for cryptographic nonces to ensure mathematical one-time execution.
 */

export interface SignedPayloadHeader {
  nonce: string;
  timestamp: number;
  senderFingerprint: string;
}

export class NonceReplayGuard {
  private readonly maxClockDriftMs: number;
  private readonly seenNonces: Map<string, number>; // nonce -> expiration timestamp
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
    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
      return false;
    }
    const diff = Math.abs(referenceTime - timestamp);
    return diff <= this.maxClockDriftMs;
  }

  /**
   * Checks if a nonce has already been seen.
   * If not seen and timestamp is valid, registers the nonce and returns true.
   * If seen or timestamp expired/future-skewed, returns false.
   */
  public verifyAndConsume(header: SignedPayloadHeader, referenceTime: number = Date.now()): { valid: boolean; reason?: string } {
    if (!header.nonce || typeof header.nonce !== 'string' || header.nonce.length < 8) {
      return { valid: false, reason: 'Invalid or missing nonce' };
    }

    if (!this.isTimestampValid(header.timestamp, referenceTime)) {
      return { valid: false, reason: 'Timestamp outside acceptable window (potential replay or clock drift)' };
    }

    this._evictExpired(referenceTime);

    const nonceKey = `${header.senderFingerprint}:${header.nonce}`;
    if (this.seenNonces.has(nonceKey)) {
      return { valid: false, reason: 'Nonce already consumed (replay attack detected)' };
    }

    // Enforce max cache size
    if (this.seenNonces.size >= this.maxCacheSize) {
      const oldestKey = this.seenNonces.keys().next().value;
      if (oldestKey) this.seenNonces.delete(oldestKey);
    }

    // Register nonce with expiration time = header.timestamp + maxClockDriftMs
    const expiresAt = header.timestamp + this.maxClockDriftMs;
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
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
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

  private _evictExpired(currentTime: number): void {
    for (const [key, expiresAt] of this.seenNonces.entries()) {
      if (expiresAt < currentTime - this.maxClockDriftMs) {
        this.seenNonces.delete(key);
      } else {
        break;
      }
    }
  }
}

export const defaultNonceGuard = new NonceReplayGuard();
