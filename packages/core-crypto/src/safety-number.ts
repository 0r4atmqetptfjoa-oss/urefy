import { Field } from './rln.js';

const ED25519_HEX_REGEX = /^[0-9a-fA-F]{64}$/;

/**
 * Computes a deterministic, direction-independent Safety Number (fingerprint verification code)
 * between two sovereign Ed25519 signing public keys.
 *
 * Security Invariants:
 * 1. Both keys must be non-empty, valid 32-byte (64 hexadecimal char) Ed25519 public keys.
 * 2. If either key is absent, null, undefined, or malformed, fails closed by throwing an error.
 * 3. Direction-independent: computeSafetyNumber(A, B) === computeSafetyNumber(B, A).
 * 4. Derived via domain-separated cryptographic hashing (`UREFY_DM_SAFETY_V1:<sorted_keys>`).
 * 5. Formatted as 12 groups of 5 decimal digits (60 digits total) separated by single spaces.
 *
 * @param publicKeyA - 64-hex char Ed25519 signing public key
 * @param publicKeyB - 64-hex char Ed25519 signing public key
 * @returns 60-digit formatted Safety Number string
 */
export function computeSafetyNumber(publicKeyA: string, publicKeyB: string): string {
  if (typeof publicKeyA !== 'string' || !ED25519_HEX_REGEX.test(publicKeyA)) {
    throw new Error('Invalid or missing Ed25519 public key A: must be 64 hexadecimal characters');
  }
  if (typeof publicKeyB !== 'string' || !ED25519_HEX_REGEX.test(publicKeyB)) {
    throw new Error('Invalid or missing Ed25519 public key B: must be 64 hexadecimal characters');
  }

  const normA = publicKeyA.toLowerCase();
  const normB = publicKeyB.toLowerCase();
  const sorted = [normA, normB].sort();
  const keyString = sorted.join(':');

  const fieldVal = Field.hashToField(`UREFY_DM_SAFETY_V1:${keyString}`);
  const rawDigits = fieldVal.toString().padStart(76, '0').slice(0, 60);
  const groups = rawDigits.match(/.{5}/g);

  if (!groups || groups.length !== 12) {
    throw new Error('Safety Number digit formatting error');
  }

  return groups.join(' ');
}
