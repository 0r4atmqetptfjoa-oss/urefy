import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { timingSafeEqual } from './security.js';

/**
 * Aetheris Dynamic Proof-of-Work (PoW) Challenge Engine — 2027 Edition
 *
 * Features:
 * - Zero-allocation pre-encoded byte prefixing inside the solver hot-loop
 * - Cooperative main-thread yielding via scheduler.yield() every 4096 hashes
 * - Bitwise leading-zero nibble inspection before hex serialization (avoids 99.9% of string allocations)
 */

export interface PoWChallenge {
  challengeId: string;
  prefix: string;
  difficulty: number; // Number of leading zero hex chars required (e.g. 3, 4, 5)
  expiresAt: number;
  salt: string;
}

export interface PoWSolution {
  challengeId: string;
  nonce: number;
  hash: string;
  timeTakenMs: number;
}

/**
 * Fast bitwise check for leading zero hex nibbles directly on the 32-byte SHA-256 digest.
 * Avoids converting failed hashes to 64-char hex strings inside the hot loop.
 */
function hasLeadingZeroNibbles(digest: Uint8Array, difficulty: number): boolean {
  const fullZeroBytes = difficulty >>> 1; // difficulty / 2
  for (let i = 0; i < fullZeroBytes; i++) {
    if (digest[i] !== 0) return false;
  }
  if ((difficulty & 1) === 1) {
    if ((digest[fullZeroBytes] & 0xf0) !== 0) return false;
  }
  return true;
}

export class PoWChallengeEngine {
  private readonly challenges: Map<string, PoWChallenge>;
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs: number = 60000) {
    this.challenges = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  public generateChallenge(difficulty: number = 4, ttlMs?: number): PoWChallenge {
    const randomIdBytes = new Uint8Array(16);
    crypto.getRandomValues(randomIdBytes);
    const challengeId = `pow_${Date.now()}_${bytesToHex(randomIdBytes).substring(0, 16)}`;
    const prefix = `aeth_pow_${Date.now()}`;

    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const salt = bytesToHex(saltBytes);
    const expiresAt = Date.now() + (ttlMs || this.defaultTtlMs);

    const challenge: PoWChallenge = {
      challengeId,
      prefix,
      difficulty,
      expiresAt,
      salt,
    };

    this.challenges.set(challengeId, challenge);
    this._cleanupExpired();

    return challenge;
  }

  public async verifySolution(solution: PoWSolution): Promise<{ valid: boolean; reason?: string }> {
    const challenge = this.challenges.get(solution.challengeId);
    if (!challenge) {
      return { valid: false, reason: 'Challenge not found or expired' };
    }

    if (Date.now() > challenge.expiresAt) {
      this.challenges.delete(solution.challengeId);
      return { valid: false, reason: 'Challenge expired' };
    }

    const dataToHash = `${challenge.prefix}:${challenge.salt}:${solution.nonce}`;
    const computedHash = await this._sha256Hex(dataToHash);

    if (!timingSafeEqual(computedHash, solution.hash)) {
      return { valid: false, reason: 'Computed hash mismatch' };
    }

    const targetPrefix = '0'.repeat(challenge.difficulty);
    if (!computedHash.startsWith(targetPrefix)) {
      return {
        valid: false,
        reason: `Hash does not meet difficulty requirement (${challenge.difficulty} leading zeros)`,
      };
    }

    this.challenges.delete(solution.challengeId);
    return { valid: true };
  }

  /**
   * High-throughput 2027 solver:
   * - Pre-encodes prefix + salt once.
   * - Checks leading zero nibbles on raw bytes before allocating hex strings.
   * - Yields to browser frame scheduler every 4096 iterations to preserve 120fps UI responsiveness.
   */
  public static async solve(challenge: PoWChallenge, maxIterations: number = 500000): Promise<PoWSolution> {
    const startTime = Date.now();
    const encoder = new TextEncoder();
    const basePrefixBytes = encoder.encode(`${challenge.prefix}:${challenge.salt}:`);
    const baseLen = basePrefixBytes.length;

    // Pre-allocate a reusable 128-byte buffer (prefix + salt + up to 20 digits of nonce)
    const scratchBuffer = new Uint8Array(baseLen + 20);
    scratchBuffer.set(basePrefixBytes, 0);

    const difficulty = challenge.difficulty;
    const yieldToMain =
      typeof (globalThis as any).scheduler?.yield === 'function'
        ? () => (globalThis as any).scheduler.yield()
        : () => new Promise<void>((r) => setTimeout(r, 0));

    for (let nonce = 0; nonce < maxIterations; nonce++) {
      // Cooperative yield every 4096 hashes to prevent blocking UI frame rendering
      if ((nonce & 0xfff) === 0 && nonce > 0) {
        await yieldToMain();
      }

      // Fast ASCII digit serialization into scratchBuffer without TextEncoder allocation
      const nonceStr = nonce.toString(10);
      const nLen = nonceStr.length;
      for (let i = 0; i < nLen; i++) {
        scratchBuffer[baseLen + i] = nonceStr.charCodeAt(i);
      }

      const slice = scratchBuffer.subarray(0, baseLen + nLen);
      const digest = sha256(slice);

      if (hasLeadingZeroNibbles(digest, difficulty)) {
        return {
          challengeId: challenge.challengeId,
          nonce,
          hash: bytesToHex(digest),
          timeTakenMs: Date.now() - startTime,
        };
      }
    }

    throw new Error(`Failed to solve PoW challenge within ${maxIterations} iterations`);
  }

  public static async sha256Hex(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    return bytesToHex(sha256(msgBuffer));
  }

  private async _sha256Hex(message: string): Promise<string> {
    return PoWChallengeEngine.sha256Hex(message);
  }

  private _cleanupExpired(): void {
    const now = Date.now();
    for (const [id, challenge] of this.challenges.entries()) {
      if (challenge.expiresAt < now) {
        this.challenges.delete(id);
      }
    }
  }
}

export const defaultPoWEngine = new PoWChallengeEngine();
