import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { zeroize } from './security.js';

export interface EncryptedEnvelope {
  version?: 1 | 2;
  ciphertext: string; // Hex ciphertext with appended authentication tag
  iv: string;         // Hex IV (12 bytes)
  epoch: number;
  fingerprint: string;
}

export const AES_256_KEY_BYTES = 32;
export const AES_GCM_IV_BYTES = 12;
export const AES_GCM_TAG_BYTES = 16;
export const MAX_E2EE_PLAINTEXT_BYTES = 2 * 1024 * 1024;

function requireKey(key: Uint8Array): void {
  if (!(key instanceof Uint8Array) || key.byteLength !== AES_256_KEY_BYTES) throw new Error('AES-256 requires a 32-byte key');
}

async function importKey(key: Uint8Array, usage: KeyUsage): Promise<CryptoKey> {
  requireKey(key);
  const copy = new Uint8Array(key);
  try {
    return await crypto.subtle.importKey('raw', copy, { name: 'AES-GCM' }, false, [usage]);
  } finally {
    zeroize(copy);
  }
}

function authenticatedContext(epoch: number, fingerprint: string, context: string): Uint8Array {
  if (!Number.isSafeInteger(epoch) || epoch < 0 || typeof fingerprint !== 'string' || fingerprint.length > 256 ||
      typeof context !== 'string' || context.length === 0 || context.length > 4096) {
    throw new Error('Invalid authenticated encryption context');
  }
  return new TextEncoder().encode(JSON.stringify(['UREFY_AEAD_V2', epoch, fingerprint, context]));
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
    requireKey(rootKey);
    if (typeof info !== 'string' || !info.length || info.length > 4096) throw new Error('Invalid key derivation context');
    const derived = hkdf(sha256, rootKey, salt || new Uint8Array(32), new TextEncoder().encode(info), 64);
    try {
      return {
        nextKey: new Uint8Array(derived.subarray(0, 32)),
        messageKey: new Uint8Array(derived.subarray(32, 64)),
      };
    } finally {
      zeroize(derived);
    }
  }

  /**
   * Encrypts plaintext with AES-256-GCM using WebCrypto.
   */
  static async encrypt(
    plaintext: string,
    keyBytes: Uint8Array,
    epoch: number = 0,
    fingerprint: string = '',
    context?: string
  ): Promise<EncryptedEnvelope> {
    requireKey(keyBytes);
    if (typeof plaintext !== 'string' || plaintext.length > MAX_E2EE_PLAINTEXT_BYTES) throw new Error('Invalid or oversized plaintext');
    const additionalData = context === undefined ? undefined : authenticatedContext(epoch, fingerprint, context);
    const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
    const encoded = new TextEncoder().encode(plaintext);
    try {
      if (encoded.byteLength > MAX_E2EE_PLAINTEXT_BYTES) throw new Error('Plaintext exceeds the UTF-8 size limit');
      const cryptoKey = await importKey(keyBytes, 'encrypt');
      const params: AesGcmParams = { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: 128 };
      if (additionalData !== undefined) {
        params.additionalData = additionalData as unknown as BufferSource;
      }
      const encrypted = await crypto.subtle.encrypt(
        params,
        cryptoKey,
        encoded as unknown as BufferSource
      );

      return {
        ...(context === undefined ? {} : { version: 2 as const }),
        ciphertext: bytesToHex(new Uint8Array(encrypted)),
        iv: bytesToHex(iv),
        epoch,
        fingerprint,
      };
    } finally {
      zeroize(encoded);
      zeroize(iv);
      if (additionalData) zeroize(additionalData);
    }
  }

  /**
   * Decrypts an EncryptedEnvelope with AES-256-GCM using WebCrypto.
   */
  static async decrypt(envelope: EncryptedEnvelope, keyBytes: Uint8Array, expectedContext?: string): Promise<string> {
    requireKey(keyBytes);
    if (!envelope || (envelope.version !== undefined && envelope.version !== 1 && envelope.version !== 2)) throw new Error('Unsupported encrypted envelope version');
    if (typeof envelope.iv !== 'string' || !/^[0-9a-f]{24}$/i.test(envelope.iv) ||
        typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length < AES_GCM_TAG_BYTES * 2 ||
        envelope.ciphertext.length > (MAX_E2EE_PLAINTEXT_BYTES + AES_GCM_TAG_BYTES) * 2 ||
        envelope.ciphertext.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(envelope.ciphertext)) {
      throw new Error('Invalid AES-GCM envelope encoding');
    }
    if ((envelope.version === 2) !== (expectedContext !== undefined)) throw new Error('Authenticated context is required; legacy downgrade is not permitted');
    const additionalData = envelope.version === 2 ? authenticatedContext(envelope.epoch, envelope.fingerprint, expectedContext!) : undefined;
    const iv = hexToBytes(envelope.iv);
    const ciphertext = hexToBytes(envelope.ciphertext);
    let decrypted: ArrayBuffer | undefined;
    try {
      const cryptoKey = await importKey(keyBytes, 'decrypt');
      const decryptParams: AesGcmParams = { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: 128 };
      if (additionalData !== undefined) {
        decryptParams.additionalData = additionalData as unknown as BufferSource;
      }
      decrypted = await crypto.subtle.decrypt(
        decryptParams,
        cryptoKey,
        ciphertext as unknown as BufferSource
      );

      return new TextDecoder('utf-8', { fatal: true }).decode(decrypted);
    } finally {
      if (decrypted) zeroize(new Uint8Array(decrypted));
      zeroize(iv);
      zeroize(ciphertext);
      if (additionalData) zeroize(additionalData);
    }
  }
}
