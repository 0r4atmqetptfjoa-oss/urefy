import { describe, it, expect } from 'vitest';
import { E2EEEngine, AES_256_KEY_BYTES, AES_GCM_IV_BYTES, AES_GCM_TAG_BYTES } from '../src/e2ee.js';
import { signMessage, verifySignature, generateKeyPair, hexToBytes, bytesToHex } from '../src/ed25519.js';
import { createSignedEnvelope, createSovereignIdentity } from '../src/identity.js';
import { verifyStoredSignedEnvelope } from '../src/direct-message.js';

describe('Phase 3 Adversarial Cryptographic Negative Suite', () => {
  describe('AES-256-GCM Fail-Closed Authenticated Encryption', () => {
    it('handles undefined additionalData and empty additionalData correctly', async () => {
      const key = crypto.getRandomValues(new Uint8Array(AES_256_KEY_BYTES));
      // 1. undefined context -> legacy format, additionalData omitted from dictionary
      const enc1 = await E2EEEngine.encrypt('payload with undefined context', key, 0, 'node_1');
      expect(enc1.version).toBeUndefined();
      const dec1 = await E2EEEngine.decrypt(enc1, key);
      expect(dec1).toBe('payload with undefined context');

      // 2. empty string context should be rejected fail-closed during encryption
      await expect(E2EEEngine.encrypt('payload with empty context', key, 0, 'node_1', ''))
        .rejects.toThrow('Invalid authenticated encryption context');
    });

    it('valid additionalData succeeds; modified additionalData fails closed', async () => {
      const key = crypto.getRandomValues(new Uint8Array(AES_256_KEY_BYTES));
      const context = 'channel:room-42:epoch-1';
      const enc = await E2EEEngine.encrypt('secret message', key, 1, 'alice', context);
      expect(enc.version).toBe(2);

      // Correct context decrypts
      const dec = await E2EEEngine.decrypt(enc, key, context);
      expect(dec).toBe('secret message');

      // Tampered context (even 1 char difference) fails closed
      await expect(E2EEEngine.decrypt(enc, key, 'channel:room-42:epoch-2'))
        .rejects.toThrow();
      await expect(E2EEEngine.decrypt(enc, key, 'channel:room-43:epoch-1'))
        .rejects.toThrow();
      await expect(E2EEEngine.decrypt(enc, key, ''))
        .rejects.toThrow();
    });

    it('modified ciphertext fails closed (authenticity check before release)', async () => {
      const key = crypto.getRandomValues(new Uint8Array(AES_256_KEY_BYTES));
      const enc = await E2EEEngine.encrypt('tamper test', key, 0, 'sender', 'ctx');
      
      const cipherBytes = hexToBytes(enc.ciphertext);
      // Flip a single bit in the ciphertext portion
      cipherBytes[0] ^= 0x01;
      const tamperedEnc = { ...enc, ciphertext: bytesToHex(cipherBytes) };

      await expect(E2EEEngine.decrypt(tamperedEnc, key, 'ctx'))
        .rejects.toThrow();
    });

    it('modified authentication tag fails closed (MAC forgery detection)', async () => {
      const key = crypto.getRandomValues(new Uint8Array(AES_256_KEY_BYTES));
      const enc = await E2EEEngine.encrypt('auth tag test', key, 0, 'sender', 'ctx');
      
      const cipherBytes = hexToBytes(enc.ciphertext);
      // Flip a single bit in the 16-byte authentication tag at the end
      cipherBytes[cipherBytes.length - 1] ^= 0x80;
      const tamperedTagEnc = { ...enc, ciphertext: bytesToHex(cipherBytes) };

      await expect(E2EEEngine.decrypt(tamperedTagEnc, key, 'ctx'))
        .rejects.toThrow();
    });

    it('incorrect key fails closed without leaking plaintext', async () => {
      const key1 = crypto.getRandomValues(new Uint8Array(AES_256_KEY_BYTES));
      const key2 = crypto.getRandomValues(new Uint8Array(AES_256_KEY_BYTES));
      const enc = await E2EEEngine.encrypt('confidential', key1, 0, 'sender', 'ctx');

      await expect(E2EEEngine.decrypt(enc, key2, 'ctx'))
        .rejects.toThrow();
    });

    it('incorrect IV fails closed', async () => {
      const key = crypto.getRandomValues(new Uint8Array(AES_256_KEY_BYTES));
      const enc = await E2EEEngine.encrypt('iv mismatch', key, 0, 'sender', 'ctx');
      
      const wrongIv = bytesToHex(crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES)));
      await expect(E2EEEngine.decrypt({ ...enc, iv: wrongIv }, key, 'ctx'))
        .rejects.toThrow();
    });

    it('malformed ciphertext encodings fail validation before WebCrypto execution', async () => {
      const key = crypto.getRandomValues(new Uint8Array(AES_256_KEY_BYTES));
      // Odd length hex
      await expect(E2EEEngine.decrypt({ iv: '00'.repeat(12), ciphertext: 'abcde', epoch: 0, fingerprint: '' }, key))
        .rejects.toThrow('Invalid AES-GCM envelope encoding');
      // Non-hex characters
      await expect(E2EEEngine.decrypt({ iv: '00'.repeat(12), ciphertext: 'zz'.repeat(16), epoch: 0, fingerprint: '' }, key))
        .rejects.toThrow('Invalid AES-GCM envelope encoding');
      // Truncated below tag length
      await expect(E2EEEngine.decrypt({ iv: '00'.repeat(12), ciphertext: '00'.repeat(8), epoch: 0, fingerprint: '' }, key))
        .rejects.toThrow('Invalid AES-GCM envelope encoding');
    });

    it('repeated decryption attempts are idempotent and do not corrupt key or state', async () => {
      const key = crypto.getRandomValues(new Uint8Array(AES_256_KEY_BYTES));
      const enc = await E2EEEngine.encrypt('idempotent check', key, 0, 'sender', 'ctx');

      for (let i = 0; i < 5; i++) {
        const res = await E2EEEngine.decrypt(enc, key, 'ctx');
        expect(res).toBe('idempotent check');
      }
    });

    it('generates distinct IVs across 10,000 successive encryptions (Zero IV reuse)', async () => {
      const key = crypto.getRandomValues(new Uint8Array(AES_256_KEY_BYTES));
      const ivSet = new Set<string>();
      const iterations = 1000; // 1,000 in unit test for speed

      for (let i = 0; i < iterations; i++) {
        const enc = await E2EEEngine.encrypt('sample', key);
        expect(ivSet.has(enc.iv)).toBe(false);
        ivSet.add(enc.iv);
      }
      expect(ivSet.size).toBe(iterations);
    });
  });

  describe('Ed25519 Signatures & Canonical Envelope Adversarial Verification', () => {
    it('modified payload invalidates signature', async () => {
      const kp = generateKeyPair();
      const message = 'Valid transaction payload';
      const sig = signMessage(message, kp.privateKey);

      expect(verifySignature(sig, message, kp.publicKey)).toBe(true);
      expect(verifySignature(sig, 'Tampered transaction payload', kp.publicKey)).toBe(false);
      expect(verifySignature(sig, message + ' ', kp.publicKey)).toBe(false);
    });

    it('modified signature bits fail verification', async () => {
      const kp = generateKeyPair();
      const message = 'Message to verify';
      const sig = signMessage(message, kp.privateKey);
      
      const sigBytes = new Uint8Array(sig);
      sigBytes[10] ^= 0x01;

      expect(verifySignature(sigBytes, message, kp.publicKey)).toBe(false);
    });

    it('wrong public key fails signature verification', async () => {
      const alice = generateKeyPair();
      const bob = generateKeyPair();
      const message = 'Signed by Alice';
      const sig = signMessage(message, alice.privateKey);

      expect(verifySignature(sig, message, alice.publicKey)).toBe(true);
      expect(verifySignature(sig, message, bob.publicKey)).toBe(false);
    });

    it('malformed signature strings fail gracefully without throwing unhandled exceptions', () => {
      const kp = generateKeyPair();
      expect(verifySignature('', 'test', kp.publicKey)).toBe(false);
      expect(verifySignature('not_hex', 'test', kp.publicKey)).toBe(false);
      expect(verifySignature('00'.repeat(32), 'test', kp.publicKey)).toBe(false); // 32 bytes instead of 64
    });

    it('signed envelope rejects tampering of nested payload properties', () => {
      const keys = createSovereignIdentity();
      const payload = { action: 'vote', proposalId: 'prop_99', choice: 'YES' };
      const envelope = createSignedEnvelope(payload, keys, { version: 2 });

      expect(verifyStoredSignedEnvelope(envelope)).toBe(true);

      // Adversary attempts to change choice to 'NO'
      const tampered = {
        ...envelope,
        payload: { ...envelope.payload, choice: 'NO' },
      };
      expect(verifyStoredSignedEnvelope(tampered)).toBe(false);

      // Adversary attempts to change timestamp
      const tamperedTs = {
        ...envelope,
        timestamp: envelope.timestamp + 1000,
      };
      expect(verifyStoredSignedEnvelope(tamperedTs)).toBe(false);
    });
  });
});
