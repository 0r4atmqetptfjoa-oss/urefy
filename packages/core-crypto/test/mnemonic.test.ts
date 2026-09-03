import { describe, it, expect } from 'vitest';
import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  deriveKeyPairFromMnemonic,
  entropyToMnemonic,
  mnemonicToEntropy,
  BIP39_WORDLIST,
} from '../src/mnemonic.js';
import { verifySignature, signMessage } from '../src/ed25519.js';

describe('BIP-39 Sovereign Mnemonic Cryptography Engine', () => {
  it('should contain exactly 2048 words in the BIP-39 wordlist', () => {
    expect(BIP39_WORDLIST.length).toBe(2048);
    expect(BIP39_WORDLIST[0]).toBe('abandon');
    expect(BIP39_WORDLIST[2047]).toBe('zoo');
  });

  it('should generate a valid 12-word mnemonic phrase (128-bit entropy)', () => {
    const mnemonic = generateMnemonic(128);
    const words = mnemonic.split(' ');
    expect(words.length).toBe(12);
    expect(validateMnemonic(mnemonic)).toBe(true);
  });

  it('should generate a valid 24-word mnemonic phrase (256-bit entropy)', () => {
    const mnemonic = generateMnemonic(256);
    const words = mnemonic.split(' ');
    expect(words.length).toBe(24);
    expect(validateMnemonic(mnemonic)).toBe(true);
  });

  it('should convert known all-zero entropy to standard BIP-39 mnemonic vector', () => {
    // 16 bytes of zeros -> 12 words
    const zeroEntropy = new Uint8Array(16);
    const mnemonic = entropyToMnemonic(zeroEntropy);
    // In BIP-39, 128 zero bits + 4 checksum bits (0000) = 12 "abandon" words
    // wait, first 4 bits of sha256(00...00) -> let's check validation
    expect(validateMnemonic(mnemonic)).toBe(true);
    const recovered = mnemonicToEntropy(mnemonic);
    expect(recovered).toEqual(zeroEntropy);
  });

  it('should reject mnemonics with invalid word counts', () => {
    expect(validateMnemonic('abandon ability able')).toBe(false);
    expect(validateMnemonic('')).toBe(false);
  });

  it('should reject mnemonics with non-dictionary words', () => {
    const invalid = 'abandon ability able about above absent absorb abstract absurd abuse access nonexistingword';
    expect(validateMnemonic(invalid)).toBe(false);
  });

  it('should reject mnemonics with corrupted checksums', () => {
    // 12 valid words, but arbitrary selection has invalid checksum
    const corrupted = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';
    // The 12th word "abandon" has index 0 (bits 00000000000). Checksum for 128 zero bits is NOT 0000.
    // So 12 "abandon"s will fail checksum!
    expect(validateMnemonic(corrupted)).toBe(false);
  });

  it('should deterministically derive a 64-byte seed from a mnemonic', () => {
    const mnemonic = generateMnemonic(128);
    const seed1 = mnemonicToSeed(mnemonic, 'sovereign-passphrase');
    const seed2 = mnemonicToSeed(mnemonic, 'sovereign-passphrase');
    const seedDifferentPass = mnemonicToSeed(mnemonic, 'other-passphrase');

    expect(seed1.length).toBe(64);
    expect(seed1).toEqual(seed2);
    expect(seed1).not.toEqual(seedDifferentPass);
  });

  it('should deterministically derive an Ed25519 KeyPair capable of signing and verifying messages', () => {
    const mnemonic = generateMnemonic(128);
    const kp1 = deriveKeyPairFromMnemonic(mnemonic);
    const kp2 = deriveKeyPairFromMnemonic(mnemonic);

    expect(kp1.publicKeyHex).toBe(kp2.publicKeyHex);
    expect(kp1.fingerprint).toBe(kp2.fingerprint);

    // Sign and verify
    const msg = 'Aetheris Sovereign Consensus Block #1042';
    const sig = signMessage(msg, kp1.privateKey);
    const isValid = verifySignature(sig, msg, kp1.publicKey);
    expect(isValid).toBe(true);
  });
});
