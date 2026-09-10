import { describe, expect, it } from 'vitest';
import { bytesToHex, generateKeyPair, hexToBytes, signMessage, verifySignature } from '../src/ed25519.js';

describe('Strict Ed25519 verification and key ownership', () => {
  it('matches RFC 8032 test vector 1', () => {
    const seed = hexToBytes('9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60');
    const publicKey = 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a';
    const signature = 'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b';
    const keys = generateKeyPair(seed);
    expect(keys.publicKeyHex).toBe(publicKey);
    expect(bytesToHex(signMessage(new Uint8Array(), keys.privateKey))).toBe(signature);
    expect(verifySignature(signature, new Uint8Array(), publicKey)).toBe(true);
    seed.fill(0);
    keys.privateKey.fill(0);
  });

  it('rejects identity-point signatures which do not demonstrate private-key possession', () => {
    const identityPoint = '01' + '00'.repeat(31);
    const forgedSignature = identityPoint + '00'.repeat(32);
    expect(verifySignature(forgedSignature, 'arbitrary unsigned data', identityPoint)).toBe(false);
  });

  it('owns the derived key buffer independently of the supplied seed', () => {
    const seed = new Uint8Array(32).fill(42);
    const keys = generateKeyPair(seed);
    seed.fill(0);
    expect(keys.privateKey.every(byte => byte === 42)).toBe(true);
    expect(verifySignature(signMessage('message', keys.privateKey), 'message', keys.publicKey)).toBe(true);
    expect(keys.privateKey.every(byte => byte === 42)).toBe(true);
    keys.privateKey.fill(0);
  });

  it.each([0, 16, 31, 33, 64])('rejects a seed with %s bytes', length => {
    expect(() => generateKeyPair(new Uint8Array(length))).toThrow('exactly 32 bytes');
  });
});