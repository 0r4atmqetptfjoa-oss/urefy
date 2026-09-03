import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { zeroize } from './security.js';

export interface EncryptedEnvelope {
  ciphertext: string; // Base64 or Hex
  iv: string;         // Hex IV (12 bytes)
  epoch: number;
  fingerprint: string;
}

/**
 * End-to-End Encryption Engine using AES-GCM and Ratcheting Key Derivation.
 */
export class E2EEEngine {
  /**
   * Derives a next-generation symmetric key from a root key using HKDF-SHA256.
   */
  static deriveNextKey(rootKey: Uint8Array, salt?: Uint8Array, info: string = 'aetheris-ratchet-step'): {
    nextKey: Uint8Array;
    messageKey: Uint8Array;
  } {
    const derived = hkdf(sha256, rootKey, salt || new Uint8Array(32), new TextEncoder().encode(info), 64);
    return {
      nextKey: derived.subarray(0, 32),
      messageKey: derived.subarray(32, 64),
    };
  }

  /**
   * Encrypts plaintext with AES-256-GCM using WebCrypto.
   */
  static async encrypt(
    plaintext: string,
    keyBytes: Uint8Array,
    epoch: number = 0,
    fingerprint: string = ''
  ): Promise<EncryptedEnvelope> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const encoded = new TextEncoder().encode(plaintext);
    try {
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        cryptoKey,
        encoded as unknown as BufferSource
      );

      return {
        ciphertext: bytesToHex(new Uint8Array(encrypted)),
        iv: bytesToHex(iv),
        epoch,
        fingerprint,
      };
    } finally {
      zeroize(encoded);
    }
  }

  /**
   * Decrypts an EncryptedEnvelope with AES-256-GCM using WebCrypto.
   */
  static async decrypt(envelope: EncryptedEnvelope, keyBytes: Uint8Array): Promise<string> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const iv = hexToBytes(envelope.iv);
    const ciphertext = hexToBytes(envelope.ciphertext);

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        cryptoKey,
        ciphertext as unknown as BufferSource
      );

      return new TextDecoder().decode(decrypted);
    } finally {
      zeroize(iv);
      zeroize(ciphertext);
    }
  }
}
