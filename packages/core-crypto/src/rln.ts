import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { constantTimeHexEqual } from './security.js';

// Standard 254-bit BN254/BabyJubjub scalar field prime used in ZK-RLN
export const FIELD_PRIME: bigint = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Modular arithmetic operations on the finite field F_p.
 */
export class Field {
  static mod(n: bigint, p: bigint = FIELD_PRIME): bigint {
    const result = n % p;
    return result >= 0n ? result : result + p;
  }

  static add(a: bigint, b: bigint, p: bigint = FIELD_PRIME): bigint {
    return this.mod(a + b, p);
  }

  static sub(a: bigint, b: bigint, p: bigint = FIELD_PRIME): bigint {
    return this.mod(a - b, p);
  }

  static mul(a: bigint, b: bigint, p: bigint = FIELD_PRIME): bigint {
    return this.mod(a * b, p);
  }

  /**
   * Computes modular inverse using Fermat's Little Theorem: a^(p-2) mod p
   */
  static inv(a: bigint, p: bigint = FIELD_PRIME): bigint {
    if (a === 0n) throw new Error("Division by zero in prime field");
    return this.exp(a, p - 2n, p);
  }

  static div(a: bigint, b: bigint, p: bigint = FIELD_PRIME): bigint {
    return this.mul(a, this.inv(b, p), p);
  }

  static exp(base: bigint, exponent: bigint, p: bigint = FIELD_PRIME): bigint {
    let res = 1n;
    let b = this.mod(base, p);
    let exp = exponent;
    while (exp > 0n) {
      if (exp % 2n === 1n) res = this.mul(res, b, p);
      b = this.mul(b, b, p);
      exp /= 2n;
    }
    return res;
  }

  /**
   * Hashes arbitrary string or byte data to an element in F_p.
   */
  static hashToField(...inputs: (string | bigint | Uint8Array)[]): bigint {
    const totalBytes: number[] = [];
    for (const input of inputs) {
      if (typeof input === 'string') {
        totalBytes.push(...new TextEncoder().encode(input));
      } else if (typeof input === 'bigint') {
        const hex = input.toString(16).padStart(64, '0');
        totalBytes.push(...hexToBytes(hex));
      } else {
        totalBytes.push(...input);
      }
    }
    const digest = sha256(new Uint8Array(totalBytes));
    const hex = bytesToHex(digest);
    return this.mod(BigInt('0x' + hex), FIELD_PRIME);
  }
}

export interface RLNShare {
  x: string; // Hex representation of x
  y: string; // Hex representation of y
  epoch: string;
  nullifier: string;
}

export interface SlashingProof {
  breachedEpoch: string;
  nullifier: string;
  extractedSecretKey: string;
  share1: { x: string; y: string };
  share2: { x: string; y: string };
  verified: boolean;
}

/**
 * Rate-Limiting Nullifier (ZK-RLN) Generator & Lagrange Interpolator
 */
export class ZKRLN {
  /**
   * Computes the public nullifier commitment from the user's secret key a_0.
   */
  static computeNullifier(secretKey: bigint): string {
    const nullifier = Field.hashToField("rln_nullifier", secretKey);
    return nullifier.toString(16).padStart(64, '0');
  }

  /**
   * Evaluates Shamir's Secret Sharing polynomial A(x) = a_1 * x + a_0 mod p
   * where a_0 is the user secret and a_1 = Hash(a_0, epoch).
   */
  static createShare(secretKey: bigint, epoch: string, message: string): RLNShare {
    const a0 = Field.mod(secretKey);
    const a1 = Field.hashToField(a0, epoch);
    const x = Field.hashToField(message);
    const y = Field.add(Field.mul(a1, x), a0);

    return {
      x: x.toString(16).padStart(64, '0'),
      y: y.toString(16).padStart(64, '0'),
      epoch,
      nullifier: this.computeNullifier(a0),
    };
  }

  /**
   * Performs Lagrange interpolation to reconstruct the secret key a_0
   * if a user transmits two distinct messages within the same epoch.
   *
   * a_1 = (y2 - y1) / (x2 - x1) mod p
   * a_0 = (y1 - a_1 * x1) mod p
   */
  static extractSecretFromViolation(share1: RLNShare, share2: RLNShare): SlashingProof {
    if (share1.epoch !== share2.epoch) {
      throw new Error("Shares belong to different epochs; no rate limit breach occurred");
    }
    if (share1.nullifier !== share2.nullifier) {
      throw new Error("Shares belong to different identities");
    }

    const x1 = BigInt('0x' + share1.x);
    const y1 = BigInt('0x' + share1.y);
    const x2 = BigInt('0x' + share2.x);
    const y2 = BigInt('0x' + share2.y);

    if (x1 === x2) {
      throw new Error("Identical messages; rate limit violation requires distinct messages");
    }

    // Lagrange Interpolation
    const dy = Field.sub(y2, y1);
    const dx = Field.sub(x2, x1);
    const a1 = Field.div(dy, dx);
    const a0 = Field.sub(y1, Field.mul(a1, x1));

    const extractedSecretHex = a0.toString(16).padStart(64, '0');
    const reconstructedNullifier = this.computeNullifier(a0);
    const verified = constantTimeHexEqual(reconstructedNullifier, share1.nullifier);

    return {
      breachedEpoch: share1.epoch,
      nullifier: share1.nullifier,
      extractedSecretKey: extractedSecretHex,
      share1: { x: share1.x, y: share1.y },
      share2: { x: share2.x, y: share2.y },
      verified,
    };
  }
}
