import { describe, it, expect } from 'vitest';
import {
  generateHybridKemKeyPair,
  encapsulateHybrid,
  decapsulateHybrid,
  serializeHybridKemPublicKey,
  deserializeHybridKemPublicKey,
  serializeHybridKemCiphertext,
  deserializeHybridKemCiphertext,
  HybridKemEngine,
  HYBRID_KEM_INFO,
  ML_KEM_768_PUBLIC_KEY_SIZE,
  ML_KEM_768_SECRET_KEY_SIZE,
  ML_KEM_768_CIPHERTEXT_SIZE,
  X25519_KEY_SIZE,
  HYBRID_KEM_SHARED_SECRET_SIZE,
  HYBRID_KEM_PUBLIC_KEY_SIZE,
  HYBRID_KEM_CIPHERTEXT_SIZE,
  type HybridKemKeyPair,
  type HybridKemCiphertext,
} from '../src/post-quantum.js';
import { timingSafeEqual } from '../src/security.js';

describe('Hybrid Post-Quantum Cryptography (ML-KEM-768 + X25519)', () => {
  describe('Constants & Parameter Verification', () => {
    it('has standard FIPS 203 ML-KEM-768 and X25519 parameter sizes', () => {
      expect(ML_KEM_768_PUBLIC_KEY_SIZE).toBe(1184);
      expect(ML_KEM_768_SECRET_KEY_SIZE).toBe(2400);
      expect(ML_KEM_768_CIPHERTEXT_SIZE).toBe(1088);
      expect(X25519_KEY_SIZE).toBe(32);
      expect(HYBRID_KEM_SHARED_SECRET_SIZE).toBe(32);
      expect(HYBRID_KEM_PUBLIC_KEY_SIZE).toBe(32 + 1184);
      expect(HYBRID_KEM_CIPHERTEXT_SIZE).toBe(32 + 1088);
      expect(HYBRID_KEM_INFO).toBe('AETHERIS_HYBRID_PQC_ML_KEM_768_V1');
    });
  });

  describe('Keypair Generation (generateHybridKemKeyPair)', () => {
    it('generates random hybrid keypairs with exact NIST FIPS 203 and RFC 7748 byte lengths', () => {
      const keypair = generateHybridKemKeyPair();

      expect(keypair.classicalPublicKey).toBeInstanceOf(Uint8Array);
      expect(keypair.classicalPublicKey.length).toBe(X25519_KEY_SIZE);

      expect(keypair.classicalPrivateKey).toBeInstanceOf(Uint8Array);
      expect(keypair.classicalPrivateKey.length).toBe(X25519_KEY_SIZE);

      expect(keypair.pqPublicKey).toBeInstanceOf(Uint8Array);
      expect(keypair.pqPublicKey.length).toBe(ML_KEM_768_PUBLIC_KEY_SIZE);

      expect(keypair.pqPrivateKey).toBeInstanceOf(Uint8Array);
      expect(keypair.pqPrivateKey.length).toBe(ML_KEM_768_SECRET_KEY_SIZE);
    });

    it('generates distinct keypairs on successive invocations using CSPRNG', () => {
      const kp1 = generateHybridKemKeyPair();
      const kp2 = generateHybridKemKeyPair();

      expect(timingSafeEqual(kp1.classicalPublicKey, kp2.classicalPublicKey)).toBe(false);
      expect(timingSafeEqual(kp1.classicalPrivateKey, kp2.classicalPrivateKey)).toBe(false);
      expect(timingSafeEqual(kp1.pqPublicKey, kp2.pqPublicKey)).toBe(false);
      expect(timingSafeEqual(kp1.pqPrivateKey, kp2.pqPrivateKey)).toBe(false);
    });

    it('generates reproducible keypairs when initialized with deterministic seed', () => {
      const seed = new Uint8Array(32).fill(0x5a);
      const kp1 = generateHybridKemKeyPair(seed);
      const kp2 = generateHybridKemKeyPair(seed);

      expect(timingSafeEqual(kp1.classicalPublicKey, kp2.classicalPublicKey)).toBe(true);
      expect(timingSafeEqual(kp1.classicalPrivateKey, kp2.classicalPrivateKey)).toBe(true);
      expect(timingSafeEqual(kp1.pqPublicKey, kp2.pqPublicKey)).toBe(true);
      expect(timingSafeEqual(kp1.pqPrivateKey, kp2.pqPrivateKey)).toBe(true);

      const diffSeed = new Uint8Array(32).fill(0x5b);
      const kpDiff = generateHybridKemKeyPair(diffSeed);
      expect(timingSafeEqual(kp1.classicalPublicKey, kpDiff.classicalPublicKey)).toBe(false);
      expect(timingSafeEqual(kp1.pqPublicKey, kpDiff.pqPublicKey)).toBe(false);
    });

    it('throws when seed is empty or not a Uint8Array', () => {
      expect(() => generateHybridKemKeyPair(new Uint8Array(0))).toThrow();
      expect(() => generateHybridKemKeyPair('not-a-uint8array' as unknown as Uint8Array)).toThrow();
    });
  });

  describe('Hybrid Encapsulation and Decapsulation Roundtrip', () => {
    it('produces identical 32-byte shared secrets for sender and recipient', () => {
      const recipientKeypair = generateHybridKemKeyPair();

      const { ciphertext, sharedSecret: senderSecret } = encapsulateHybrid({
        classicalPublicKey: recipientKeypair.classicalPublicKey,
        pqPublicKey: recipientKeypair.pqPublicKey,
      });

      expect(ciphertext.classicalEphemeralPublicKey.length).toBe(X25519_KEY_SIZE);
      expect(ciphertext.pqCiphertext.length).toBe(ML_KEM_768_CIPHERTEXT_SIZE);
      expect(senderSecret.length).toBe(HYBRID_KEM_SHARED_SECRET_SIZE);

      const recipientSecret = decapsulateHybrid(ciphertext, {
        classicalPrivateKey: recipientKeypair.classicalPrivateKey,
        pqPrivateKey: recipientKeypair.pqPrivateKey,
        classicalPublicKey: recipientKeypair.classicalPublicKey,
      });

      expect(recipientSecret.length).toBe(HYBRID_KEM_SHARED_SECRET_SIZE);
      expect(timingSafeEqual(senderSecret, recipientSecret)).toBe(true);
    });

    it('allows decapsulating when passing full HybridKemKeyPair directly', () => {
      const recipientKeypair = generateHybridKemKeyPair();

      const { ciphertext, sharedSecret: senderSecret } = encapsulateHybrid(recipientKeypair);
      const recipientSecret = decapsulateHybrid(ciphertext, recipientKeypair);

      expect(timingSafeEqual(senderSecret, recipientSecret)).toBe(true);
    });

    it('derives recipient public key automatically if not passed in private key parameter', () => {
      const recipientKeypair = generateHybridKemKeyPair();

      const { ciphertext, sharedSecret: senderSecret } = encapsulateHybrid(recipientKeypair);
      const recipientSecret = decapsulateHybrid(ciphertext, {
        classicalPrivateKey: recipientKeypair.classicalPrivateKey,
        pqPrivateKey: recipientKeypair.pqPrivateKey,
      });

      expect(timingSafeEqual(senderSecret, recipientSecret)).toBe(true);
    });

    it('works seamlessly via HybridKemEngine class wrapper', () => {
      const bob = HybridKemEngine.generateKeyPair();
      const enc = HybridKemEngine.encapsulate({
        classicalPublicKey: bob.classicalPublicKey,
        pqPublicKey: bob.pqPublicKey,
      });
      const bobSecret = HybridKemEngine.decapsulate(enc.ciphertext, bob);

      expect(timingSafeEqual(enc.sharedSecret, bobSecret)).toBe(true);
    });

    it('generates unique ephemeral keys and ciphertexts across multiple encapsulations to the same recipient', () => {
      const recipient = generateHybridKemKeyPair();

      const enc1 = encapsulateHybrid(recipient);
      const enc2 = encapsulateHybrid(recipient);

      // Ephemeral keys and ciphertexts must be distinct
      expect(
        timingSafeEqual(enc1.ciphertext.classicalEphemeralPublicKey, enc2.ciphertext.classicalEphemeralPublicKey)
      ).toBe(false);
      expect(timingSafeEqual(enc1.ciphertext.pqCiphertext, enc2.ciphertext.pqCiphertext)).toBe(false);
      expect(timingSafeEqual(enc1.sharedSecret, enc2.sharedSecret)).toBe(false);

      // Both independently decapsulate accurately
      const ss1 = decapsulateHybrid(enc1.ciphertext, recipient);
      const ss2 = decapsulateHybrid(enc2.ciphertext, recipient);
      expect(timingSafeEqual(enc1.sharedSecret, ss1)).toBe(true);
      expect(timingSafeEqual(enc2.sharedSecret, ss2)).toBe(true);
    });
  });

  describe('Tampering and Failure Modes', () => {
    it('causes decapsulation failure or different shared secret when classical ephemeral key is tampered with', () => {
      const recipient = generateHybridKemKeyPair();
      const { ciphertext, sharedSecret } = encapsulateHybrid(recipient);

      // Tamper classical ephemeral public key
      const tamperedEphemeral = new Uint8Array(ciphertext.classicalEphemeralPublicKey);
      tamperedEphemeral[0] ^= 0x01;

      const tamperedCiphertext: HybridKemCiphertext = {
        classicalEphemeralPublicKey: tamperedEphemeral,
        pqCiphertext: ciphertext.pqCiphertext,
      };

      try {
        const tamperedSecret = decapsulateHybrid(tamperedCiphertext, recipient);
        // If it computes without error, the shared secret MUST NOT match the authentic shared secret
        expect(timingSafeEqual(sharedSecret, tamperedSecret)).toBe(false);
      } catch (err) {
        // Curve verification rejection is also an acceptable and secure failure mode
        expect(err).toBeDefined();
      }
    });

    it('causes implicit rejection / different shared secret when PQ ciphertext is tampered with', () => {
      const recipient = generateHybridKemKeyPair();
      const { ciphertext, sharedSecret } = encapsulateHybrid(recipient);

      // Tamper a single byte in the lattice polynomial ciphertext
      const tamperedPqCt = new Uint8Array(ciphertext.pqCiphertext);
      tamperedPqCt[15] ^= 0x42;

      const tamperedCiphertext: HybridKemCiphertext = {
        classicalEphemeralPublicKey: ciphertext.classicalEphemeralPublicKey,
        pqCiphertext: tamperedPqCt,
      };

      const tamperedSecret = decapsulateHybrid(tamperedCiphertext, recipient);
      // NIST FIPS 203 implicit rejection produces a pseudorandom secret that differs from sender
      expect(timingSafeEqual(sharedSecret, tamperedSecret)).toBe(false);
    });

    it('throws descriptive error on invalid classical ephemeral public key length', () => {
      const recipient = generateHybridKemKeyPair();
      const { ciphertext } = encapsulateHybrid(recipient);

      const invalidCt: HybridKemCiphertext = {
        classicalEphemeralPublicKey: new Uint8Array(16), // Invalid: 16 bytes instead of 32
        pqCiphertext: ciphertext.pqCiphertext,
      };

      expect(() => decapsulateHybrid(invalidCt, recipient)).toThrow(/Invalid classical ephemeral public key length/);
    });

    it('throws descriptive error on invalid PQ ciphertext length', () => {
      const recipient = generateHybridKemKeyPair();
      const { ciphertext } = encapsulateHybrid(recipient);

      const invalidCt: HybridKemCiphertext = {
        classicalEphemeralPublicKey: ciphertext.classicalEphemeralPublicKey,
        pqCiphertext: new Uint8Array(500), // Invalid: 500 bytes instead of 1088
      };

      expect(() => decapsulateHybrid(invalidCt, recipient)).toThrow(/Invalid PQ ciphertext length/);
    });

    it('throws descriptive error on invalid private key components', () => {
      const recipient = generateHybridKemKeyPair();
      const { ciphertext } = encapsulateHybrid(recipient);

      expect(() =>
        decapsulateHybrid(ciphertext, {
          classicalPrivateKey: new Uint8Array(16), // Invalid
          pqPrivateKey: recipient.pqPrivateKey,
        })
      ).toThrow(/Invalid classical private key length/);

      expect(() =>
        decapsulateHybrid(ciphertext, {
          classicalPrivateKey: recipient.classicalPrivateKey,
          pqPrivateKey: new Uint8Array(100), // Invalid
        })
      ).toThrow(/Invalid PQ private key length/);
    });

    it('throws descriptive error on invalid recipient public key in encapsulateHybrid', () => {
      const valid = generateHybridKemKeyPair();

      expect(() =>
        encapsulateHybrid({
          classicalPublicKey: new Uint8Array(10),
          pqPublicKey: valid.pqPublicKey,
        })
      ).toThrow(/Invalid recipient classical public key length/);

      expect(() =>
        encapsulateHybrid({
          classicalPublicKey: valid.classicalPublicKey,
          pqPublicKey: new Uint8Array(200),
        })
      ).toThrow(/Invalid recipient PQ public key length/);
    });
  });

  describe('Isolation and Multi-Party Independence', () => {
    it('guarantees that different keypairs produce completely different shared secrets', () => {
      const alice = generateHybridKemKeyPair();
      const bob = generateHybridKemKeyPair();

      const encAlice = encapsulateHybrid(alice);
      const encBob = encapsulateHybrid(bob);

      expect(timingSafeEqual(encAlice.sharedSecret, encBob.sharedSecret)).toBe(false);

      // Decapsulating Bob's ciphertext with Alice's key fails or yields different secret
      try {
        const aliceTriesBobCt = decapsulateHybrid(encBob.ciphertext, alice);
        expect(timingSafeEqual(encBob.sharedSecret, aliceTriesBobCt)).toBe(false);
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('fails to produce matching shared secret when classical private key is wrong', () => {
      const alice = generateHybridKemKeyPair();
      const eve = generateHybridKemKeyPair();

      const { ciphertext, sharedSecret } = encapsulateHybrid(alice);

      // Eve uses her classical key with Alice's PQ key
      const mismatchedSecret = decapsulateHybrid(ciphertext, {
        classicalPrivateKey: eve.classicalPrivateKey,
        pqPrivateKey: alice.pqPrivateKey,
      });

      expect(timingSafeEqual(sharedSecret, mismatchedSecret)).toBe(false);
    });

    it('fails to produce matching shared secret when PQ private key is wrong', () => {
      const alice = generateHybridKemKeyPair();
      const eve = generateHybridKemKeyPair();

      const { ciphertext, sharedSecret } = encapsulateHybrid(alice);

      // Eve uses Alice's classical key with her own PQ key
      const mismatchedSecret = decapsulateHybrid(ciphertext, {
        classicalPrivateKey: alice.classicalPrivateKey,
        pqPrivateKey: eve.pqPrivateKey,
      });

      expect(timingSafeEqual(sharedSecret, mismatchedSecret)).toBe(false);
    });
  });

  describe('Wire Format Serialization and Deserialization', () => {
    it('serializes and deserializes public key to exactly 1216 bytes', () => {
      const keypair = generateHybridKemKeyPair();
      const serialized = serializeHybridKemPublicKey(keypair);

      expect(serialized).toBeInstanceOf(Uint8Array);
      expect(serialized.length).toBe(HYBRID_KEM_PUBLIC_KEY_SIZE);

      const deserialized = deserializeHybridKemPublicKey(serialized);
      expect(timingSafeEqual(deserialized.classicalPublicKey, keypair.classicalPublicKey)).toBe(true);
      expect(timingSafeEqual(deserialized.pqPublicKey, keypair.pqPublicKey)).toBe(true);
    });

    it('serializes and deserializes ciphertext to exactly 1120 bytes', () => {
      const keypair = generateHybridKemKeyPair();
      const { ciphertext } = encapsulateHybrid(keypair);

      const serialized = serializeHybridKemCiphertext(ciphertext);
      expect(serialized).toBeInstanceOf(Uint8Array);
      expect(serialized.length).toBe(HYBRID_KEM_CIPHERTEXT_SIZE);

      const deserialized = deserializeHybridKemCiphertext(serialized);
      expect(
        timingSafeEqual(
          deserialized.classicalEphemeralPublicKey,
          ciphertext.classicalEphemeralPublicKey
        )
      ).toBe(true);
      expect(timingSafeEqual(deserialized.pqCiphertext, ciphertext.pqCiphertext)).toBe(true);
    });

    it('completes full end-to-end exchange through serialized wire format', () => {
      // 1. Bob generates keypair and serializes public key to wire format
      const bobKeypair = HybridKemEngine.generateKeyPair();
      const bobWirePubKey = HybridKemEngine.serializePublicKey(bobKeypair);

      // 2. Alice receives Bob's wire public key, deserializes, and encapsulates
      const bobReceivedPubKey = HybridKemEngine.deserializePublicKey(bobWirePubKey);
      const { ciphertext, sharedSecret: aliceSecret } = HybridKemEngine.encapsulate(bobReceivedPubKey);

      // 3. Alice serializes ciphertext to wire format and sends to Bob
      const wireCiphertext = HybridKemEngine.serializeCiphertext(ciphertext);

      // 4. Bob receives wire ciphertext, deserializes, and decapsulates
      const bobReceivedCiphertext = HybridKemEngine.deserializeCiphertext(wireCiphertext);
      const bobDecapsulatedSecret = HybridKemEngine.decapsulate(bobReceivedCiphertext, bobKeypair);

      // 5. Both shared secrets match byte-for-byte
      expect(timingSafeEqual(aliceSecret, bobDecapsulatedSecret)).toBe(true);
    });

    it('throws when deserializing invalid length public key or ciphertext', () => {
      expect(() => deserializeHybridKemPublicKey(new Uint8Array(100))).toThrow(
        /Invalid serialized public key length/
      );
      expect(() => deserializeHybridKemCiphertext(new Uint8Array(100))).toThrow(
        /Invalid serialized ciphertext length/
      );
    });
  });
});
