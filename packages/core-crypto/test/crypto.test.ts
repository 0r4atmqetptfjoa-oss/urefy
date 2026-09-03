import { describe, it, expect } from 'vitest';
import { generateKeyPair, signMessage, verifySignature } from '../src/ed25519.js';
import { ZKRLN, Field } from '../src/rln.js';
import { MerkleTree } from '../src/merkle.js';
import { E2EEEngine } from '../src/e2ee.js';

describe('Core Cryptography Module', () => {
  describe('Ed25519 Sovereign Identity', () => {
    it('generates keypairs and verifies valid signatures', () => {
      const keypair = generateKeyPair();
      expect(keypair.publicKeyHex.length).toBe(64);
      expect(keypair.fingerprint.length).toBe(16);

      const message = 'Aetheris Sovereign Declaration';
      const signature = signMessage(message, keypair.privateKey);

      const isValid = verifySignature(signature, message, keypair.publicKey);
      expect(isValid).toBe(true);

      const isInvalid = verifySignature(signature, 'Tampered Message', keypair.publicKey);
      expect(isInvalid).toBe(false);
    });
  });

  describe('ZK-RLN & Lagrange Interpolation (Anti-Spam Slashing)', () => {
    it('evaluates polynomial shares and extracts secret key upon duplicate messages in same epoch', () => {
      // User creates a secret key a0
      const userSecret = Field.hashToField('user-secret-passphrase-aetheris');
      const epoch = 'epoch_2026_08_29_20_00';

      // 1. Honest user sends 1 message
      const msg1 = 'Hello sovereign network!';
      const share1 = ZKRLN.createShare(userSecret, epoch, msg1);

      // Verify nullifier matches
      const expectedNullifier = ZKRLN.computeNullifier(userSecret);
      expect(share1.nullifier).toBe(expectedNullifier);

      // 2. Malicious user / spammer sends 2nd different message in the SAME epoch
      const msg2 = 'Spamming the network with DoS!';
      const share2 = ZKRLN.createShare(userSecret, epoch, msg2);

      // 3. Network performs Lagrange interpolation to extract secret key
      const slashingProof = ZKRLN.extractSecretFromViolation(share1, share2);

      expect(slashingProof.verified).toBe(true);
      expect(slashingProof.nullifier).toBe(expectedNullifier);

      // The extracted secret key must mathematically match the original user secret!
      const originalSecretHex = Field.mod(userSecret).toString(16).padStart(64, '0');
      expect(slashingProof.extractedSecretKey).toBe(originalSecretHex);
    });

    it('rejects extraction if messages belong to different epochs', () => {
      const userSecret = Field.hashToField('user-secret-2');
      const share1 = ZKRLN.createShare(userSecret, 'epoch_1', 'Message 1');
      const share2 = ZKRLN.createShare(userSecret, 'epoch_2', 'Message 2');

      expect(() => ZKRLN.extractSecretFromViolation(share1, share2)).toThrow(/different epochs/);
    });
  });

  describe('Merkle Tree Accumulator', () => {
    it('creates tree, produces valid inclusion proofs, and detects tampering', () => {
      const leaves = [
        '01'.repeat(32),
        '02'.repeat(32),
        '03'.repeat(32),
        '04'.repeat(32),
        '05'.repeat(32),
      ];

      const tree = new MerkleTree(leaves);
      const root = tree.getRoot();
      expect(root.length).toBe(64);

      // Proof for leaf 2
      const proof = tree.getProof(leaves[2]);
      expect(MerkleTree.verifyProof(proof)).toBe(true);

      // Tampered proof must fail
      const tamperedProof = { ...proof, leaf: '99'.repeat(32) };
      expect(MerkleTree.verifyProof(tamperedProof)).toBe(false);
    });
  });

  describe('E2EE AES-GCM Ratchet Engine', () => {
    it('encrypts and decrypts messages with derived keys', async () => {
      const rootKey = new Uint8Array(32).fill(7);
      const { nextKey, messageKey } = E2EEEngine.deriveNextKey(rootKey);

      const secretText = 'Confidential technical thread data on Aetheris Vault';
      const envelope = await E2EEEngine.encrypt(secretText, messageKey, 1, 'fingerprint-123');

      expect(envelope.ciphertext.length).toBeGreaterThan(0);
      expect(envelope.iv.length).toBe(24); // 12 bytes = 24 hex

      const decrypted = await E2EEEngine.decrypt(envelope, messageKey);
      expect(decrypted).toBe(secretText);
    });
  });
});
