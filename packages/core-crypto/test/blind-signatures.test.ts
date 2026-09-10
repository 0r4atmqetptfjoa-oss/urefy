import { beforeAll, describe, it, expect } from 'vitest';
import {
  generateBlindSignatureKeyPair,
  blindMessage,
  blindMessageWithFactor,
  signBlindedMessage,
  unblindSignature,
  verifyBlindSignature,
  directSignMessage,
  hashToZStar,
  bigintToHex,
  hexToBigint,
  modExp,
  modInverse,
  gcd,
  isProbablePrime,
  generatePrime,
  validateRsaKeyLength,
  InsecureKeyError,
  MINIMUM_RSA_KEY_BITS,
  type BlindSignatureKeyPair,
} from '../src/blind-signatures.js';

let testRsaKeyPair: BlindSignatureKeyPair;

beforeAll(async () => {
  testRsaKeyPair = await generateBlindSignatureKeyPair(MINIMUM_RSA_KEY_BITS);
});

describe('Chaumian Blind Signatures Protocol (packages/core-crypto)', () => {
  describe('Mathematical Primitives', () => {
    it('computes gcd correctly', () => {
      expect(gcd(54n, 24n)).toBe(6n);
      expect(gcd(65537n, 1000n)).toBe(1n);
      expect(gcd(0n, 10n)).toBe(10n);
      expect(gcd(17n, 0n)).toBe(17n);
    });

    it('computes modular exponentiation', () => {
      expect(modExp(2n, 10n, 1000n)).toBe(24n);
      expect(modExp(7n, 560n, 561n)).toBe(1n);
      expect(modExp(3n, 0n, 13n)).toBe(1n);
    });

    it('computes modular inverse via Extended Euclidean Algorithm', () => {
      const a = 3n;
      const m = 11n;
      const inv = modInverse(a, m);
      expect((a * inv) % m).toBe(1n);

      const x = 65537n;
      const mod = 1000000007n;
      const invX = modInverse(x, mod);
      expect((x * invX) % mod).toBe(1n);

      expect(() => modInverse(4n, 8n)).toThrow('Modular inverse does not exist');
    });

    it('Miller-Rabin primality test recognizes primes and composites', () => {
      expect(isProbablePrime(2n)).toBe(true);
      expect(isProbablePrime(3n)).toBe(true);
      expect(isProbablePrime(65537n)).toBe(true);
      expect(isProbablePrime(1000000007n)).toBe(true);

      expect(isProbablePrime(0n)).toBe(false);
      expect(isProbablePrime(1n)).toBe(false);
      expect(isProbablePrime(4n)).toBe(false);
      expect(isProbablePrime(561n)).toBe(false); // Carmichael number
      expect(isProbablePrime(1000000005n)).toBe(false);
    });

    it('generates prime numbers of requested bit length', () => {
      const prime = generatePrime(64);
      expect(isProbablePrime(prime)).toBe(true);
      expect(prime.toString(2).length).toBe(64);
      expect(gcd(prime - 1n, 65537n)).toBe(1n);
    });
  });

  describe('RSA-2048 Key Generation & Security Enforcement', () => {
    it('generates a valid NIST-compliant RSA-2048 keypair using WebCrypto', async () => {
      const keyPair = await generateBlindSignatureKeyPair(2048);

      expect(keyPair.publicKey.e).toBe(65537n);
      expect(keyPair.publicKey.n.toString(2).length).toBeGreaterThanOrEqual(2048);
      expect(keyPair.privateKey.n).toBe(keyPair.publicKey.n);
      expect(keyPair.privateKey.d).toBeGreaterThan(0n);
      expect(keyPair.publicKey.protocolVersion).toBe('2.0');

      // Verify that (m^e)^d == m mod n for arbitrary test value
      const testMsg = 123456789n;
      const cipher = modExp(testMsg, keyPair.publicKey.e, keyPair.publicKey.n);
      const plain = modExp(cipher, keyPair.privateKey.d, keyPair.publicKey.n);
      expect(plain).toBe(testMsg);
    });

    it('strictly rejects key generation with keyBits < 2048', async () => {
      await expect(generateBlindSignatureKeyPair(512)).rejects.toThrow(InsecureKeyError);
      await expect(generateBlindSignatureKeyPair(1024)).rejects.toThrow(InsecureKeyError);
      await expect(generateBlindSignatureKeyPair(2047)).rejects.toThrow(InsecureKeyError);
    });

    it('validateRsaKeyLength throws InsecureKeyError for moduli under 2048 bits', () => {
      const small512Modulus = (1n << 512n) - 1n;
      const small1024Modulus = (1n << 1024n) - 1n;

      expect(() => validateRsaKeyLength(small512Modulus)).toThrow(InsecureKeyError);
      expect(() => validateRsaKeyLength(small1024Modulus)).toThrow(InsecureKeyError);
      expect(() => validateRsaKeyLength(0n)).toThrow(InsecureKeyError);
      expect(() => validateRsaKeyLength(-5n)).toThrow(InsecureKeyError);
      expect(() => validateRsaKeyLength(testRsaKeyPair.publicKey.n)).not.toThrow();
    });

    it('rejects legacy 512-bit and 1024-bit keys in all protocol functions', () => {
      const legacy512Key = { n: (1n << 512n) - 5n, e: 65537n };
      const legacy512Priv = { n: legacy512Key.n, d: 1234567n };

      expect(() => blindMessage('test', legacy512Key)).toThrow(InsecureKeyError);
      expect(() => blindMessageWithFactor('test', 42n, legacy512Key)).toThrow(InsecureKeyError);
      expect(() => signBlindedMessage(100n, legacy512Priv)).toThrow(InsecureKeyError);
      expect(() => directSignMessage('test', legacy512Priv)).toThrow(InsecureKeyError);
      expect(() => unblindSignature(100n, 42n, legacy512Key)).toThrow(InsecureKeyError);
      expect(() => verifyBlindSignature('test', 100n, legacy512Key)).toThrow(InsecureKeyError);
    });
  });

  describe('Full Blind Signature Roundtrip', () => {
    it('blinds, signs, unblinds, and successfully verifies vote message with RSA-2048', () => {
      const keyPair = testRsaKeyPair;
      const votePayload = 'pulse-vote:post-777:up:nullifier-98765';

      // 1. Voter blinds the message
      const { blindedHash, blindingFactor, messageHash } = blindMessage(
        votePayload,
        keyPair.publicKey
      );

      expect(blindedHash).not.toBe(messageHash);
      expect(blindingFactor).toBeGreaterThan(1n);

      // 2. Validator issues blind signature
      const blindSignature = signBlindedMessage(blindedHash, keyPair.privateKey);
      expect(blindSignature).toBeGreaterThan(0n);

      // 3. Voter unblinds the signature locally
      const unblindedSignature = unblindSignature(
        blindSignature,
        blindingFactor,
        keyPair.publicKey
      );
      expect(unblindedSignature).toBeGreaterThan(0n);

      // 4. Anyone verifies the unblinded signature on the original message
      const isValid = verifyBlindSignature(
        votePayload,
        unblindedSignature,
        keyPair.publicKey
      );
      expect(isValid).toBe(true);
    });

    it('works with Uint8Array binary payloads', () => {
      const keyPair = testRsaKeyPair;
      const binaryMessage = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);

      const { blindedHash, blindingFactor } = blindMessage(
        binaryMessage,
        keyPair.publicKey
      );
      const blindSig = signBlindedMessage(blindedHash, keyPair.privateKey);
      const unblindedSig = unblindSignature(blindSig, blindingFactor, keyPair.publicKey);

      const isValid = verifyBlindSignature(binaryMessage, unblindedSig, keyPair.publicKey);
      expect(isValid).toBe(true);
    });
  });

  describe('Unblinded Signature Matches Direct Signature', () => {
    it('proves mathematically that unblindSignature(s\', r) === directSign(m)', () => {
      const keyPair = testRsaKeyPair;
      const votePayload = 'pulse-merit:post-42:up:nullifier-alpha';

      // Direct signature by validator who sees the message
      const directSig = directSignMessage(votePayload, keyPair.privateKey);

      // Chaumian blinded workflow
      const { blindedHash, blindingFactor } = blindMessage(
        votePayload,
        keyPair.publicKey
      );
      const blindSig = signBlindedMessage(blindedHash, keyPair.privateKey);
      const unblindedSig = unblindSignature(blindSig, blindingFactor, keyPair.publicKey);

      // Both must yield the exact same mathematical signature!
      expect(unblindedSig).toBe(directSig);

      // Both verify identically against public key
      expect(verifyBlindSignature(votePayload, directSig, keyPair.publicKey)).toBe(true);
      expect(verifyBlindSignature(votePayload, unblindedSig, keyPair.publicKey)).toBe(true);
    });
  });

  describe('Information-Theoretic Blindness (Signer Learns Zero Knowledge of m)', () => {
    it('signer cannot distinguish or learn original message m from blinded hash m\'', () => {
      const keyPair = testRsaKeyPair;
      const msg1 = 'vote:proposal-1:support';
      const msg2 = 'vote:proposal-1:divergent';

      const h1 = hashToZStar(msg1, keyPair.publicKey.n);
      const h2 = hashToZStar(msg2, keyPair.publicKey.n);

      const blindResult1 = blindMessage(msg1, keyPair.publicKey);
      const blindResult2 = blindMessage(msg2, keyPair.publicKey);

      // Blinded hashes are completely decoupled from unblinded hashes
      expect(blindResult1.blindedHash).not.toBe(h1);
      expect(blindResult2.blindedHash).not.toBe(h2);
      expect(blindResult1.blindedHash).not.toBe(blindResult2.blindedHash);

      // Multiple blindings of the SAME message yield completely different blinded hashes
      const blindResult1Second = blindMessage(msg1, keyPair.publicKey);
      expect(blindResult1.blindedHash).not.toBe(blindResult1Second.blindedHash);
      expect(blindResult1.blindingFactor).not.toBe(blindResult1Second.blindingFactor);

      // Both unblind to the same valid signature
      const sigA = signBlindedMessage(blindResult1.blindedHash, keyPair.privateKey);
      const sigB = signBlindedMessage(blindResult1Second.blindedHash, keyPair.privateKey);

      const unblindA = unblindSignature(sigA, blindResult1.blindingFactor, keyPair.publicKey);
      const unblindB = unblindSignature(sigB, blindResult1Second.blindingFactor, keyPair.publicKey);

      expect(unblindA).toBe(unblindB);
      expect(verifyBlindSignature(msg1, unblindA, keyPair.publicKey)).toBe(true);
    });

    it('supports deterministic blinding with blindMessageWithFactor', () => {
      const keyPair = testRsaKeyPair;
      const msg = 'deterministic-token-data';
      const factor = 123456789012345678901234567890123456789n;

      const result = blindMessageWithFactor(msg, factor, keyPair.publicKey);
      expect(result.blindingFactor).toBe(factor);

      const blindSig = signBlindedMessage(result.blindedHash, keyPair.privateKey);
      const unblinded = unblindSignature(blindSig, factor, keyPair.publicKey);
      expect(verifyBlindSignature(msg, unblinded, keyPair.publicKey)).toBe(true);
    });
  });

  describe('Tampering and Modification Rejection', () => {
    it('rejects signature if message content is tampered', () => {
      const keyPair = testRsaKeyPair;
      const originalMessage = 'pulse-vote:post-10:up:null-100';
      const tamperedMessage = 'pulse-vote:post-10:down:null-100';

      const { blindedHash, blindingFactor } = blindMessage(
        originalMessage,
        keyPair.publicKey
      );
      const blindSig = signBlindedMessage(blindedHash, keyPair.privateKey);
      const unblindedSig = unblindSignature(blindSig, blindingFactor, keyPair.publicKey);

      // Original verifies
      expect(verifyBlindSignature(originalMessage, unblindedSig, keyPair.publicKey)).toBe(true);

      // Tampered message fails verification
      expect(verifyBlindSignature(tamperedMessage, unblindedSig, keyPair.publicKey)).toBe(false);
    });

    it('rejects tampered signature', () => {
      const keyPair = testRsaKeyPair;
      const msg = 'pulse-vote:post-10:up';

      const { blindedHash, blindingFactor } = blindMessage(msg, keyPair.publicKey);
      const blindSig = signBlindedMessage(blindedHash, keyPair.privateKey);
      const unblindedSig = unblindSignature(blindSig, blindingFactor, keyPair.publicKey);

      // Modify signature
      const tamperedSig = unblindedSig + 1n;
      expect(verifyBlindSignature(msg, tamperedSig, keyPair.publicKey)).toBe(false);
    });

    it('rejects invalid or out-of-range signature parameters', () => {
      const keyPair = testRsaKeyPair;
      const msg = 'test-token';

      expect(verifyBlindSignature(msg, 0n, keyPair.publicKey)).toBe(false);
      expect(verifyBlindSignature(msg, -5n, keyPair.publicKey)).toBe(false);
      expect(verifyBlindSignature(msg, keyPair.publicKey.n + 10n, keyPair.publicKey)).toBe(false);

      // Invalid blinded hash range on signing
      expect(() => signBlindedMessage(0n, keyPair.privateKey)).toThrow();
      expect(() => signBlindedMessage(keyPair.privateKey.n + 1n, keyPair.privateKey)).toThrow();

      // Invalid unblinding inputs
      expect(() => unblindSignature(0n, 123n, keyPair.publicKey)).toThrow();
    });
  });

  describe('Serialization Utilities', () => {
    it('serializes and deserializes BigInt to hex with even length', () => {
      const testValues = [
        0n,
        1n,
        15n,
        16n,
        255n,
        256n,
        65537n,
        0xdeadbeefcafebaben,
        (1n << 256n) - 1n,
      ];

      for (const val of testValues) {
        const hex = bigintToHex(val);
        expect(hex.length % 2).toBe(0);
        const recovered = hexToBigint(hex);
        expect(recovered).toBe(val);

        // Also handles '0x' prefix
        const recoveredWith0x = hexToBigint('0x' + hex);
        expect(recoveredWith0x).toBe(val);
      }
    });

    it('handles empty or edge hex strings safely', () => {
      expect(hexToBigint('')).toBe(0n);
      expect(hexToBigint('0x')).toBe(0n);
      expect(hexToBigint('0')).toBe(0n);
      expect(hexToBigint('0x0')).toBe(0n);
    });
  });
});
