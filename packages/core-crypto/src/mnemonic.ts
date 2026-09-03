import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { BIP39_WORDLIST } from './bip39-wordlist.js';
import { generateKeyPair, KeyPair } from './ed25519.js';

const WORD_MAP: Map<string, number> = new Map();
for (let i = 0; i < BIP39_WORDLIST.length; i++) {
  WORD_MAP.set(BIP39_WORDLIST[i], i);
}

/**
 * Converts a byte array to a binary string of 0s and 1s.
 */
function bytesToBits(bytes: Uint8Array): string {
  let bits = '';
  for (let i = 0; i < bytes.length; i++) {
    bits += bytes[i].toString(2).padStart(8, '0');
  }
  return bits;
}

/**
 * Converts an entropy Uint8Array into a standard BIP-39 mnemonic phrase.
 * @param entropy 16 to 32 bytes of entropy (multiples of 4 bytes: 16, 20, 24, 28, 32).
 */
export function entropyToMnemonic(entropy: Uint8Array): string {
  const entBits = entropy.length * 8;
  if (entBits < 128 || entBits > 256 || entBits % 32 !== 0) {
    throw new Error(`Invalid entropy length: ${entropy.length} bytes (must be 16, 20, 24, 28, or 32 bytes)`);
  }

  const csBits = entBits / 32;
  const hash = sha256(entropy);
  const hashBits = bytesToBits(hash);
  const totalBits = bytesToBits(entropy) + hashBits.slice(0, csBits);

  const words: string[] = [];
  for (let i = 0; i < totalBits.length; i += 11) {
    const chunk = totalBits.slice(i, i + 11);
    const index = parseInt(chunk, 2);
    words.push(BIP39_WORDLIST[index]);
  }

  return words.join(' ');
}

/**
 * Generates a cryptographically secure random BIP-39 mnemonic phrase.
 * @param strength Number of bits of entropy (128 for 12 words, 256 for 24 words). Default: 128.
 */
export function generateMnemonic(strength: 128 | 256 = 128): string {
  if (strength !== 128 && strength !== 256) {
    throw new Error('Invalid strength: must be 128 (12 words) or 256 (24 words)');
  }
  const entropy = crypto.getRandomValues(new Uint8Array(strength / 8));
  return entropyToMnemonic(entropy);
}

/**
 * Validates a BIP-39 mnemonic phrase (checks word count, vocabulary, and SHA-256 checksum).
 */
export function validateMnemonic(mnemonic: string): boolean {
  try {
    mnemonicToEntropy(mnemonic);
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a valid BIP-39 mnemonic back to its original entropy byte array.
 */
export function mnemonicToEntropy(mnemonic: string): Uint8Array {
  const words = mnemonic.trim().toLowerCase().split(/\s+/);
  if (![12, 15, 18, 21, 24].includes(words.length)) {
    throw new Error(`Invalid mnemonic word count: ${words.length}`);
  }

  let bits = '';
  for (const word of words) {
    const index = WORD_MAP.get(word);
    if (index === undefined) {
      throw new Error(`Invalid word in mnemonic: "${word}"`);
    }
    bits += index.toString(2).padStart(11, '0');
  }

  const csBits = words.length / 3;
  const entBits = bits.length - csBits;
  const entBytesLen = entBits / 8;

  const entropyBits = bits.slice(0, entBits);
  const checksumBits = bits.slice(entBits);

  const entropy = new Uint8Array(entBytesLen);
  for (let i = 0; i < entBytesLen; i++) {
    entropy[i] = parseInt(entropyBits.slice(i * 8, (i + 1) * 8), 2);
  }

  const hash = sha256(entropy);
  const expectedCsBits = bytesToBits(hash).slice(0, csBits);

  if (checksumBits !== expectedCsBits) {
    throw new Error('Invalid mnemonic checksum');
  }

  return entropy;
}

/**
 * Derives a 64-byte binary seed from a BIP-39 mnemonic using PBKDF2 HMAC-SHA512.
 */
export function mnemonicToSeed(mnemonic: string, passphrase = ''): Uint8Array {
  const mnemonicNorm = mnemonic.trim().toLowerCase().normalize('NFKD');
  const saltNorm = ('mnemonic' + passphrase).normalize('NFKD');
  const mnemonicBytes = new TextEncoder().encode(mnemonicNorm);
  const saltBytes = new TextEncoder().encode(saltNorm);

  return pbkdf2(sha512, mnemonicBytes, saltBytes, { c: 2048, dkLen: 64 });
}

/**
 * Derives an Ed25519 sovereign KeyPair deterministically from a BIP-39 mnemonic phrase.
 */
export function deriveKeyPairFromMnemonic(mnemonic: string, passphrase = ''): KeyPair {
  const seed64 = mnemonicToSeed(mnemonic, passphrase);
  return generateKeyPair(seed64.subarray(0, 32));
}

export { BIP39_WORDLIST };
