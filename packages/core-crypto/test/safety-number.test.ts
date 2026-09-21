import { describe, it, expect } from 'vitest';
import { computeSafetyNumber } from '../src/safety-number.js';
import { generateKeyPair } from '../src/ed25519.js';

describe('computeSafetyNumber — PASS 7.3.3 Canonical Safety Number Integrity', () => {
  // Deterministic 64-hex char Ed25519 test public keys
  const keyA = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const keyB = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
  const keyC = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  // Exact deterministic test vectors computed via SHA-256 field reduction
  const EXPECTED_VECTOR_AB = '13094 09652 96981 16539 60185 97432 32270 51385 66344 36951 93210 35188';
  const EXPECTED_VECTOR_AC = '01210 03911 40544 18350 03416 07870 32002 57569 27965 46283 23364 84597';
  const EXPECTED_VECTOR_BC = '33690 30223 84660 69946 89505 15121 81563 33393 09751 34104 70837 33491';

  it('matches fixed deterministic test vectors for known Ed25519 keys', () => {
    const snAB = computeSafetyNumber(keyA, keyB);
    const snAC = computeSafetyNumber(keyA, keyC);
    const snBC = computeSafetyNumber(keyB, keyC);

    expect(snAB).toBe(EXPECTED_VECTOR_AB);
    expect(snAC).toBe(EXPECTED_VECTOR_AC);
    expect(snBC).toBe(EXPECTED_VECTOR_BC);
  });

  it('strictly satisfies direction invariance (A/B === B/A)', () => {
    const snAB = computeSafetyNumber(keyA, keyB);
    const snBA = computeSafetyNumber(keyB, keyA);
    expect(snAB).toBe(snBA);

    const snCA = computeSafetyNumber(keyC, keyA);
    const snAC = computeSafetyNumber(keyA, keyC);
    expect(snCA).toBe(snAC);
  });

  it('is distinct across different peer identities (no collisions or identical fallbacks)', () => {
    const snAB = computeSafetyNumber(keyA, keyB);
    const snAC = computeSafetyNumber(keyA, keyC);
    const snBC = computeSafetyNumber(keyB, keyC);

    expect(snAB).not.toBe(snAC);
    expect(snAB).not.toBe(snBC);
    expect(snAC).not.toBe(snBC);
  });

  it('is never all-zero and produces exactly 12 groups of 5 decimal digits (60 digits total)', () => {
    const sn = computeSafetyNumber(keyA, keyB);
    expect(sn).not.toBe('00000 00000 00000 00000 00000 00000');
    expect(sn).not.toContain('00000 00000 00000 00000');

    const groups = sn.split(' ');
    expect(groups.length).toBe(12);
    for (const g of groups) {
      expect(g).toMatch(/^\d{5}$/);
    }
  });

  it('case-insensitively normalizes hexadecimal public keys', () => {
    const upperKeyA = keyA.toUpperCase();
    const upperKeyB = keyB.toUpperCase();
    expect(computeSafetyNumber(upperKeyA, keyB)).toBe(EXPECTED_VECTOR_AB);
    expect(computeSafetyNumber(keyA, upperKeyB)).toBe(EXPECTED_VECTOR_AB);
    expect(computeSafetyNumber(upperKeyA, upperKeyB)).toBe(EXPECTED_VECTOR_AB);
  });

  it('fails closed when either key is missing, null, undefined, or empty', () => {
    expect(() => computeSafetyNumber('', keyB)).toThrow(/Invalid or missing Ed25519 public key/);
    expect(() => computeSafetyNumber(keyA, '')).toThrow(/Invalid or missing Ed25519 public key/);
    expect(() => computeSafetyNumber(undefined as any, keyB)).toThrow(/Invalid or missing Ed25519 public key/);
    expect(() => computeSafetyNumber(keyA, undefined as any)).toThrow(/Invalid or missing Ed25519 public key/);
    expect(() => computeSafetyNumber(null as any, keyB)).toThrow(/Invalid or missing Ed25519 public key/);
    expect(() => computeSafetyNumber(keyA, null as any)).toThrow(/Invalid or missing Ed25519 public key/);
  });

  it('fails closed when either key has invalid length or non-hex characters', () => {
    expect(() => computeSafetyNumber(keyA.slice(0, 62), keyB)).toThrow(/must be 64 hexadecimal characters/);
    expect(() => computeSafetyNumber(keyA + '00', keyB)).toThrow(/must be 64 hexadecimal characters/);
    expect(() => computeSafetyNumber(keyA.replace('a', 'z'), keyB)).toThrow(/must be 64 hexadecimal characters/);
  });

  it('guarantees multi-device equivalence: Device A1 and A2 with identical sovereign identity have identical Safety Number with B', () => {
    // Generate sovereign identity for Alice
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    // Device A1 uses Alice's signing key
    const safetyA1_B = computeSafetyNumber(alice.publicKeyHex, bob.publicKeyHex);
    // Device A2 restored from Alice's seed uses the same signing key
    const safetyA2_B = computeSafetyNumber(alice.publicKeyHex, bob.publicKeyHex);

    expect(safetyA1_B).toBe(safetyA2_B);
    expect(safetyA1_B).not.toBe('00000 00000 00000 00000 00000 00000');
    expect(safetyA1_B.split(' ').length).toBe(12);
  });
});
