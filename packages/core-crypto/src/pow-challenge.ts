import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { timingSafeEqual } from './security.js';

/**
 * Aetheris Dynamic Proof-of-Work (PoW) Challenge Engine
 * 
 * Provides dynamic SHA-256 Hashcash-style challenges for anti-DDoS,
 * botnet rate limiting, and computational gatekeeping during burst attacks.
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

export class PoWChallengeEngine {
  private readonly challenges: Map<string, PoWChallenge>;
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs: number = 60000) {
    this.challenges = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Generates a new PoW challenge with the specified difficulty (default: 4 leading hex zeros).
   */
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

  /**
   * Verifies that a client's solution satisfies the challenge.
   */
  public async verifySolution(solution: PoWSolution): Promise<{ valid: boolean; reason?: string }> {
    const challenge = this.challenges.get(solution.challengeId);
    if (!challenge) {
      return { valid: false, reason: 'Challenge not found or expired' };
    }

    if (Date.now() > challenge.expiresAt) {
      this.challenges.delete(solution.challengeId);
      return { valid: false, reason: 'Challenge expired' };
    }

    // Compute SHA-256(prefix + salt + nonce)
    const dataToHash = `${challenge.prefix}:${challenge.salt}:${solution.nonce}`;
    const computedHash = await this._sha256Hex(dataToHash);

    if (!timingSafeEqual(computedHash, solution.hash)) {
      return { valid: false, reason: 'Computed hash mismatch' };
    }

    const targetPrefix = '0'.repeat(challenge.difficulty);
    if (!computedHash.startsWith(targetPrefix)) {
      return { valid: false, reason: `Hash does not meet difficulty requirement (${challenge.difficulty} leading zeros)` };
    }

    // Consume challenge so it cannot be reused
    this.challenges.delete(solution.challengeId);

    return { valid: true };
  }

  /**
   * Solves a challenge on the client side by searching for a matching nonce.
   */
  public static async solve(challenge: PoWChallenge, maxIterations: number = 500000): Promise<PoWSolution> {
    const startTime = Date.now();
    const targetPrefix = '0'.repeat(challenge.difficulty);
    let nonce = 0;

    while (nonce < maxIterations) {
      const data = `${challenge.prefix}:${challenge.salt}:${nonce}`;
      const hash = await PoWChallengeEngine.sha256Hex(data);

      if (hash.startsWith(targetPrefix)) {
        return {
          challengeId: challenge.challengeId,
          nonce,
          hash,
          timeTakenMs: Date.now() - startTime,
        };
      }
      nonce++;
    }

    throw new Error(`Failed to solve PoW challenge within ${maxIterations} iterations`);
  }

  /**
   * Helper to compute SHA-256 synchronously/universally in browser and Node.js.
   */
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
