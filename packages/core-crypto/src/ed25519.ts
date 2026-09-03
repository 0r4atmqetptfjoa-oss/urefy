import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  publicKeyHex: string;
  privateKeyHex: string;
  fingerprint: string;
}

/**
 * Generates an Ed25519 cryptographic keypair for sovereign identity.
 * @param seed Optional 32-byte seed for deterministic key derivation
 */
export function generateKeyPair(seed?: Uint8Array): KeyPair {
  const privateKey = seed || ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  const publicKeyHex = bytesToHex(publicKey);
  const privateKeyHex = bytesToHex(privateKey);
  const fingerprint = computeFingerprint(publicKey);

  return {
    publicKey,
    privateKey,
    publicKeyHex,
    privateKeyHex,
    fingerprint,
  };
}

/**
 * Computes a human-readable 8-byte hexadecimal fingerprint from an Ed25519 public key.
 */
export function computeFingerprint(publicKey: Uint8Array): string {
  const hash = sha256(publicKey);
  return bytesToHex(hash.subarray(0, 8));
}

/**
 * Cryptographically signs a message using an Ed25519 private key.
 */
export function signMessage(message: Uint8Array | string, privateKey: Uint8Array | string): Uint8Array {
  const msgBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const privBytes = typeof privateKey === 'string' ? hexToBytes(privateKey) : privateKey;
  return ed25519.sign(msgBytes, privBytes);
}

/**
 * Cryptographically verifies an Ed25519 signature against a public key.
 */
export function verifySignature(
  signature: Uint8Array | string,
  message: Uint8Array | string,
  publicKey: Uint8Array | string
): boolean {
  try {
    const sigBytes = typeof signature === 'string' ? hexToBytes(signature) : signature;
    const msgBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    const pubBytes = typeof publicKey === 'string' ? hexToBytes(publicKey) : publicKey;
    return ed25519.verify(sigBytes, msgBytes, pubBytes);
  } catch {
    return false;
  }
}

export { bytesToHex, hexToBytes };
export { timingSafeEqual, constantTimeHexEqual, zeroize } from './security.js';
