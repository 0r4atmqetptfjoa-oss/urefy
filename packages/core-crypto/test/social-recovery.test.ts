import { describe, it, expect } from 'vitest';
import {
  splitSecretIntoShards,
  reconstructSecretFromShards,
  serializeShard,
  deserializeShard,
  encryptShardForGuardian,
  decryptShardFromGuardian,
  createSocialRecoveryPackage,
  SecretShard,
} from '../src/social-recovery.js';
import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '../src/mnemonic.js';
import { generateKeyPair } from '../src/ed25519.js';

describe('Social Identity Recovery - Shamir Secret Sharing & Guardian Encryption', () => {
  const sampleSecretText = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const sampleSecret = new TextEncoder().encode(sampleSecretText);

  describe('Shamir k-of-n Threshold Splitting & Reconstruction', () => {
    it('splits secret into n=5 shards with threshold k=3', () => {
      const shards = splitSecretIntoShards(sampleSecret, 5, 3);

      expect(shards).toHaveLength(5);
      for (let i = 0; i < 5; i++) {
        expect(shards[i].index).toBe(i + 1);
        expect(shards[i].threshold).toBe(3);
        expect(shards[i].totalShards).toBe(5);
        expect(shards[i].yValues.length).toBeGreaterThan(0);
        expect(shards[i].checksum).toBeDefined();
        expect(shards[i].checksum).toHaveLength(8);
      }
    });

    it('successfully reconstructs original secret from any 3 of the 5 shards', () => {
      const shards = splitSecretIntoShards(sampleSecret, 5, 3);

      // Combinations of 3 shards
      const combinations: number[][] = [
        [0, 1, 2], // Shards 1, 2, 3
        [1, 3, 4], // Shards 2, 4, 5
        [0, 2, 4], // Shards 1, 3, 5
        [2, 3, 4], // Shards 3, 4, 5
      ];

      for (const combo of combinations) {
        const selected = combo.map((idx) => shards[idx]);
        const reconstructed = reconstructSecretFromShards(selected);
        const reconstructedText = new TextDecoder().decode(reconstructed);
        expect(reconstructedText).toBe(sampleSecretText);
      }
    });

    it('successfully reconstructs from all 5 shards (redundancy)', () => {
      const shards = splitSecretIntoShards(sampleSecret, 5, 3);
      const reconstructed = reconstructSecretFromShards(shards);
      expect(new TextDecoder().decode(reconstructed)).toBe(sampleSecretText);
    });

    it('reconstructs BIP-39 mnemonic seed with 100% cryptographic fidelity', () => {
      const mnemonic = generateMnemonic(128);
      const rawSeed = mnemonicToSeed(mnemonic);
      const shards = splitSecretIntoShards(rawSeed, 5, 3);

      // Take shards 2, 3, 5
      const subset = [shards[1], shards[2], shards[4]];
      const recovered = reconstructSecretFromShards(subset);

      expect(recovered).toEqual(rawSeed);
    });

    it('fails reconstruction when fewer than k shards are provided', () => {
      const shards = splitSecretIntoShards(sampleSecret, 5, 3);

      // Only 2 shards provided for k=3
      const insufficient = [shards[0], shards[1]];
      expect(() => reconstructSecretFromShards(insufficient)).toThrow(
        /Threshold not met: received 2 unique shards, expected at least 3/
      );
    });

    it('detects tampering or corruption in any shard via SHA-256 checksum verification', () => {
      const shards = splitSecretIntoShards(sampleSecret, 5, 3);

      // Create a copy and tamper with the evaluation yValue of the first chunk
      const tamperedShard: SecretShard = {
        ...shards[0],
        yValues: [...shards[0].yValues],
      };
      tamperedShard.yValues[0] = 'deadbeef1234567890';

      const tamperedGroup = [tamperedShard, shards[1], shards[2]];
      expect(() => reconstructSecretFromShards(tamperedGroup)).toThrow(
        /Checksum verification failed: reconstructed secret is corrupted or shards were tampered with/
      );
    });

    it('handles deduplication if the same shard is passed multiple times', () => {
      const shards = splitSecretIntoShards(sampleSecret, 5, 3);

      // 3 entries, but index 1 is duplicated -> only 2 unique shards
      const duplicates = [shards[0], shards[0], shards[1]];
      expect(() => reconstructSecretFromShards(duplicates)).toThrow(/Threshold not met/);
    });

    it('rejects shards from different sharing sessions (mismatched checksum or threshold)', () => {
      const sessionA = splitSecretIntoShards(sampleSecret, 5, 3);
      const otherSecret = new TextEncoder().encode('different sovereign secret');
      const sessionB = splitSecretIntoShards(otherSecret, 5, 3);

      const mixed = [sessionA[0], sessionA[1], sessionB[2]];
      expect(() => reconstructSecretFromShards(mixed)).toThrow(/Shard parameter mismatch/);
    });
  });

  describe('Threshold & Boundary Constraints (2 <= k <= n <= 16)', () => {
    it('accepts boundary threshold k=2, n=2', () => {
      const shards = splitSecretIntoShards(sampleSecret, 2, 2);
      expect(shards).toHaveLength(2);
      const reconstructed = reconstructSecretFromShards(shards);
      expect(new TextDecoder().decode(reconstructed)).toBe(sampleSecretText);
    });

    it('accepts maximum sovereign boundary n=16, k=10', () => {
      const shards = splitSecretIntoShards(sampleSecret, 16, 10);
      expect(shards).toHaveLength(16);

      // Reconstruct using any 10 shards
      const selected = shards.slice(0, 10);
      const reconstructed = reconstructSecretFromShards(selected);
      expect(new TextDecoder().decode(reconstructed)).toBe(sampleSecretText);
    });

    it('rejects threshold < 2', () => {
      expect(() => splitSecretIntoShards(sampleSecret, 5, 1)).toThrow(
        /Invalid threshold 1: must be at least 2/
      );
    });

    it('rejects totalShards < threshold', () => {
      expect(() => splitSecretIntoShards(sampleSecret, 2, 3)).toThrow(
        /Total shards \(2\) cannot be less than threshold \(3\)/
      );
    });

    it('rejects totalShards > 16', () => {
      expect(() => splitSecretIntoShards(sampleSecret, 17, 5)).toThrow(
        /Total shards \(17\) exceeds maximum sovereign limit of 16/
      );
    });

    it('rejects empty secret', () => {
      expect(() => splitSecretIntoShards(new Uint8Array(0), 5, 3)).toThrow(
        /Secret cannot be empty/
      );
    });
  });

  describe('Shard Serialization & Token Portability', () => {
    it('serializes and deserializes a SecretShard to an AETH-SHARD token format', () => {
      const shards = splitSecretIntoShards(sampleSecret, 5, 3);
      const token = serializeShard(shards[0]);

      expect(token).toMatch(/^AETH-SHARD-v1-/);

      const deserialized = deserializeShard(token);
      expect(deserialized.index).toBe(shards[0].index);
      expect(deserialized.threshold).toBe(shards[0].threshold);
      expect(deserialized.totalShards).toBe(shards[0].totalShards);
      expect(deserialized.checksum).toBe(shards[0].checksum);
      expect(deserialized.yValues).toEqual(shards[0].yValues);
    });

    it('throws error when parsing corrupted token string', () => {
      expect(() => deserializeShard('AETH-SHARD-v1-invalid-base64')).toThrow();
    });
  });

  describe('Guardian ECDH / AES-256-GCM End-to-End Encryption', () => {
    it('encrypts a shard for a guardian and successfully decrypts with guardian private key', async () => {
      const guardianKeypair = generateKeyPair();
      const shards = splitSecretIntoShards(sampleSecret, 5, 3);

      const encryptedPackage = await encryptShardForGuardian(
        shards[0],
        guardianKeypair.publicKeyHex,
        guardianKeypair.fingerprint
      );

      expect(encryptedPackage.version).toBe('1.0');
      expect(encryptedPackage.guardianFingerprint).toBe(guardianKeypair.fingerprint);
      expect(encryptedPackage.ephemeralPublicKey).toBeDefined();
      expect(encryptedPackage.encryptedShard.ciphertext).toBeDefined();
      expect(encryptedPackage.encryptedShard.iv).toBeDefined();

      // Guardian decrypts using their private key
      const decryptedShard = await decryptShardFromGuardian(
        encryptedPackage,
        guardianKeypair.privateKeyHex
      );

      expect(decryptedShard.index).toBe(shards[0].index);
      expect(decryptedShard.threshold).toBe(shards[0].threshold);
      expect(decryptedShard.checksum).toBe(shards[0].checksum);
      expect(decryptedShard.yValues).toEqual(shards[0].yValues);
    });

    it('rejects decryption when an incorrect guardian private key is used', async () => {
      const guardianKeypair = generateKeyPair();
      const impostorKeypair = generateKeyPair();
      const shards = splitSecretIntoShards(sampleSecret, 5, 3);

      const encryptedPackage = await encryptShardForGuardian(
        shards[0],
        guardianKeypair.publicKeyHex,
        guardianKeypair.fingerprint
      );

      // Impostor attempts to decrypt
      await expect(
        decryptShardFromGuardian(encryptedPackage, impostorKeypair.privateKeyHex)
      ).rejects.toThrow();
    });

    it('orchestrates a complete social recovery setup package for 5 guardians and recovers secret', async () => {
      const mnemonic = generateMnemonic(128);
      expect(validateMnemonic(mnemonic)).toBe(true);
      const mnemonicBytes = new TextEncoder().encode(mnemonic);

      // Create 5 guardians
      const guardians = [
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair(),
      ];

      const guardianConfigs = guardians.map((g) => ({
        fingerprint: g.fingerprint,
        publicKeyHex: g.publicKeyHex,
      }));

      // 1. Create Social Recovery Package (threshold 3 of 5)
      const setupPkg = await createSocialRecoveryPackage(
        mnemonicBytes,
        guardianConfigs,
        3,
        'user-identity'
      );

      expect(setupPkg.totalShards).toBe(5);
      expect(setupPkg.threshold).toBe(3);
      expect(setupPkg.guardianPackages).toHaveLength(5);

      // 2. Simulate requesting shards from 3 guardians (e.g. Guardian 1, 3, 4)
      const selectedIndices = [0, 2, 3];
      const collectedShards: SecretShard[] = [];

      for (const idx of selectedIndices) {
        const pkg = setupPkg.guardianPackages[idx];
        const guardian = guardians[idx];
        const shard = await decryptShardFromGuardian(pkg, guardian.privateKeyHex);
        collectedShards.push(shard);
      }

      // 3. Reconstruct secret from collected shards
      const recoveredBytes = reconstructSecretFromShards(collectedShards);
      const recoveredMnemonic = new TextDecoder().decode(recoveredBytes);

      expect(recoveredMnemonic).toBe(mnemonic);
      expect(validateMnemonic(recoveredMnemonic)).toBe(true);
    });
  });
});
