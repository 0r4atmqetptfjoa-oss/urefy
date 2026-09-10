import { afterAll, describe, expect, it } from 'vitest';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '../src/ed25519.js';
import { E2EEEngine } from '../src/e2ee.js';
import { decapsulateHybrid, encapsulateHybrid, generateHybridKemKeyPair, serializeHybridKemPublicKey, deserializeHybridKemPublicKey, deserializeHybridKemCiphertext } from '../src/post-quantum.js';
import { zeroize } from '../src/security.js';

const recipient = generateHybridKemKeyPair(new Uint8Array(32).fill(42));
afterAll(() => { zeroize(recipient.classicalPrivateKey); zeroize(recipient.pqPrivateKey); });

describe('Hybrid KEM key boundaries', () => {
  it('retains the deployed deterministic public-key derivation', () => {
    expect(bytesToHex(sha256(serializeHybridKemPublicKey(recipient)))).toBe('a7115ffcbb5e6e53fbcab17bf7a723447d992b9c3e3372158471fe2d1d91e211');
  });

  it.each([0, 1, 16, 31])('rejects a %s-byte deterministic seed', length => {
    expect(() => generateHybridKemKeyPair(new Uint8Array(length))).toThrow('at least 32 bytes');
  });

  it('refuses a supplied public key which does not belong to the private key', () => {
    const encapsulated = encapsulateHybrid(recipient);
    try {
      expect(() => decapsulateHybrid(encapsulated.ciphertext, { ...recipient, classicalPublicKey: new Uint8Array(32) })).toThrow('do not match');
      const recovered = decapsulateHybrid(encapsulated.ciphertext, { classicalPrivateKey: recipient.classicalPrivateKey, pqPrivateKey: recipient.pqPrivateKey });
      expect(recovered).toEqual(encapsulated.sharedSecret);
      zeroize(recovered);
    } finally { zeroize(encapsulated.sharedSecret); }
  });

  it('rejects low-order X25519 peers', () => {
    expect(() => encapsulateHybrid({ ...recipient, classicalPublicKey: new Uint8Array(32) })).toThrow();
  });

  it('requires authenticated decryption after ML-KEM implicit rejection', async () => {
    const encapsulated = encapsulateHybrid(recipient);
    const altered = { ...encapsulated.ciphertext, pqCiphertext: new Uint8Array(encapsulated.ciphertext.pqCiphertext) };
    altered.pqCiphertext[0] ^= 1;
    const rejectedSecret = decapsulateHybrid(altered, recipient);
    try {
      expect(rejectedSecret).not.toEqual(encapsulated.sharedSecret);
      const encrypted = await E2EEEngine.encrypt('authenticated payload', encapsulated.sharedSecret);
      await expect(E2EEEngine.decrypt(encrypted, rejectedSecret)).rejects.toThrow();
    } finally { zeroize(encapsulated.sharedSecret); zeroize(rejectedSecret); }
  });

  it('rejects array-like transport values instead of silently coercing bytes', () => {
    expect(() => serializeHybridKemPublicKey({ ...recipient, classicalPublicKey: Array(32).fill(0) as never })).toThrow('Uint8Array');
    expect(() => deserializeHybridKemPublicKey(Array(1216).fill(0) as never)).toThrow('Uint8Array');
    expect(() => deserializeHybridKemCiphertext(Array(1120).fill(0) as never)).toThrow('Uint8Array');
  });
});