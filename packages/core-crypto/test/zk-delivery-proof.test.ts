import { describe, it, expect, beforeEach } from 'vitest';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import {
  deriveDeliveryNullifier,
  deriveMemberSecretFromPrivateKey,
  generateZkDeliveryProof,
  verifyZkDeliveryProof,
  DeliveryProofGuard,
  DELIVERY_ACK_CONTEXT,
  ZkDeliveryProof,
} from '../src/zk-delivery-proof.js';
import {
  computeIdentityCommitment,
  computeCircleMerkleRoot,
  BN254G1,
  BN254G2,
  BN254_SCALAR_FIELD_ORDER,
} from '../src/zk-snark.js';

describe('Zero-Metadata Delivery Proofs & Read Receipts (Innovation 3)', () => {
  const alicePrivKey = new Uint8Array(32).fill(1);
  const alicePrivKeyHex = bytesToHex(alicePrivKey);
  const bobPrivKey = new Uint8Array(32).fill(2);
  const evePrivKey = new Uint8Array(32).fill(9);

  let guard: DeliveryProofGuard;

  beforeEach(() => {
    guard = new DeliveryProofGuard();
  });

  describe('1. Delivery Nullifier Derivation', () => {
    it('derives exact HMAC-SHA256 nullifier according to cryptographic specification', () => {
      const messageId = 'msg-quantum-alpha-99';
      const derived = deriveDeliveryNullifier(alicePrivKey, messageId);

      // Verify mathematical formula: HMAC-SHA256(recipientPrivateKey, messageId + "DELIVERY_ACK")
      const expectedData = new TextEncoder().encode(messageId + DELIVERY_ACK_CONTEXT);
      const expectedMac = bytesToHex(hmac(sha256, alicePrivKey, expectedData));

      expect(derived).toBe(expectedMac);
      expect(derived).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic for identical key and messageId', () => {
      const msg = 'msg-sync-101';
      const n1 = deriveDeliveryNullifier(alicePrivKey, msg);
      const n2 = deriveDeliveryNullifier(alicePrivKey, msg);
      expect(n1).toBe(n2);
    });

    it('accepts Uint8Array or hex string representation equivalently', () => {
      const msg = 'msg-poly-202';
      const nBytes = deriveDeliveryNullifier(alicePrivKey, msg);
      const nHex = deriveDeliveryNullifier(alicePrivKeyHex, msg);
      expect(nBytes).toBe(nHex);
    });

    it('produces distinct nullifiers for different messages (unlinkable read events)', () => {
      const n1 = deriveDeliveryNullifier(alicePrivKey, 'msg-001');
      const n2 = deriveDeliveryNullifier(alicePrivKey, 'msg-002');
      expect(n1).not.toBe(n2);
    });

    it('produces distinct nullifiers for different recipient keys on the same message', () => {
      const msg = 'msg-group-broadcast';
      const aliceNullifier = deriveDeliveryNullifier(alicePrivKey, msg);
      const bobNullifier = deriveDeliveryNullifier(bobPrivKey, msg);
      expect(aliceNullifier).not.toBe(bobNullifier);
    });

    it('rejects invalid or empty messageId', () => {
      expect(() => deriveDeliveryNullifier(alicePrivKey, '')).toThrow('Invalid messageId');
      expect(() => deriveDeliveryNullifier(alicePrivKey, null as any)).toThrow('Invalid messageId');
    });
  });

  describe('2. Zero-Knowledge Delivery Proof Generation & Verification', () => {
    it('generates and verifies a genuine Groth16 circle membership delivery proof', () => {
      const aliceSecret = deriveMemberSecretFromPrivateKey(alicePrivKey);
      const bobSecret = deriveMemberSecretFromPrivateKey(bobPrivKey);

      const leafAlice = computeIdentityCommitment(aliceSecret);
      const leafBob = computeIdentityCommitment(bobSecret);
      const groupLeaves = [leafAlice, leafBob];
      const groupRoot = computeCircleMerkleRoot(groupLeaves);

      const messageId = 'msg-e2ee-secure-tx-44';
      const proof = generateZkDeliveryProof({
        messageId,
        recipientPrivateKey: alicePrivKey,
        memberSecret: aliceSecret,
        groupLeaves,
        groupRoot,
        proofType: 'snark-groth16',
      });

      expect(proof.messageId).toBe(messageId);
      expect(proof.nullifier).toMatch(/^[0-9a-f]{64}$/);
      expect(proof.proofType).toBe('snark-groth16');
      expect(proof.groth16Proof).toBeDefined();
      expect(BN254G1.isValid(proof.groth16Proof!.pi_a)).toBe(true);
      expect(BN254G2.isValid(proof.groth16Proof!.pi_b)).toBe(true);
      expect(BN254G1.isValid(proof.groth16Proof!.pi_c)).toBe(true);
      expect(proof.anonymitySetSize).toBe(2);

      // Verification succeeds against the group root
      const result = verifyZkDeliveryProof(proof, messageId, groupRoot);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('generates and verifies a SHA-256 Merkle membership delivery proof', () => {
      const messageId = 'msg-p2p-merkle-mesh';
      const proof = generateZkDeliveryProof({
        messageId,
        recipientPrivateKey: bobPrivKey,
        merkleLeavesHex: [bytesToHex(sha256(alicePrivKey)), bytesToHex(sha256(bobPrivKey))],
        recipientLeafHex: bytesToHex(sha256(bobPrivKey)),
        proofType: 'merkle-sha256',
      });

      expect(proof.proofType).toBe('merkle-sha256');
      expect(proof.merkleProof).toBeDefined();
      const result = verifyZkDeliveryProof(proof, messageId, proof.merkleRoot);
      expect(result.valid).toBe(true);
    });

    it('strictly rejects verification if messageId does not match', () => {
      const aliceSecret = deriveMemberSecretFromPrivateKey(alicePrivKey);
      const leaves = [computeIdentityCommitment(aliceSecret)];
      const root = computeCircleMerkleRoot(leaves);

      const proof = generateZkDeliveryProof({
        messageId: 'original-message-id',
        recipientPrivateKey: alicePrivKey,
        memberSecret: aliceSecret,
        groupLeaves: leaves,
        groupRoot: root,
      });

      const res = verifyZkDeliveryProof(proof, 'tampered-message-id', root);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Message ID mismatch');
    });

    it('strictly rejects verification if group root is unauthorized', () => {
      const aliceSecret = deriveMemberSecretFromPrivateKey(alicePrivKey);
      const leaves = [computeIdentityCommitment(aliceSecret)];
      const root = computeCircleMerkleRoot(leaves);

      const proof = generateZkDeliveryProof({
        messageId: 'msg-confidential',
        recipientPrivateKey: alicePrivKey,
        memberSecret: aliceSecret,
        groupLeaves: leaves,
        groupRoot: root,
      });

      const unauthorizedRoot = (root + 999n) % BN254_SCALAR_FIELD_ORDER;
      const res = verifyZkDeliveryProof(proof, 'msg-confidential', unauthorizedRoot);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Merkle root mismatch');
    });

    it('strictly rejects tampered Groth16 proof points', () => {
      const aliceSecret = deriveMemberSecretFromPrivateKey(alicePrivKey);
      const leaves = [computeIdentityCommitment(aliceSecret)];
      const root = computeCircleMerkleRoot(leaves);

      const proof = generateZkDeliveryProof({
        messageId: 'msg-tamper-check',
        recipientPrivateKey: alicePrivKey,
        memberSecret: aliceSecret,
        groupLeaves: leaves,
        groupRoot: root,
      });

      // Tamper with G1 point pi_c
      const tamperedProof: ZkDeliveryProof = {
        ...proof,
        groth16Proof: {
          ...proof.groth16Proof!,
          pi_c: BN254G1.multiply(proof.groth16Proof!.pi_c, 5n),
        },
      };

      const res = verifyZkDeliveryProof(tamperedProof, 'msg-tamper-check', root);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('equation failed');
    });

    it('rejects malformed delivery nullifier hex', () => {
      const proof: ZkDeliveryProof = {
        messageId: 'msg-bad-nullifier',
        nullifier: 'not-a-valid-64-hex-string',
        merkleRoot: '00'.repeat(32),
        timestamp: Date.now(),
        proofType: 'snark-groth16',
        anonymitySetSize: 1,
      };

      const res = verifyZkDeliveryProof(proof);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Invalid delivery nullifier format');
    });
  });

  describe('3. Double-ACK Defense & Replay Attack Neutralization', () => {
    it('accepts first ACK presentation and consumes nullifier', () => {
      const messageId = 'msg-double-ack-test-01';
      const proof = generateZkDeliveryProof({
        messageId,
        recipientPrivateKey: alicePrivKey,
        proofType: 'merkle-sha256',
      });

      expect(guard.isSpent(proof.nullifier)).toBe(false);
      expect(guard.getMessageStatus(messageId)).toBe('PENDING');

      const outcome = guard.verifyAndConsume(proof);
      expect(outcome.success).toBe(true);
      expect(outcome.error).toBeUndefined();

      expect(guard.isSpent(proof.nullifier)).toBe(true);
      expect(guard.getMessageStatus(messageId)).toBe('READ');
      expect(guard.isZKVerified(messageId)).toBe(true);
      expect(guard.getConsumedCount()).toBe(1);
    });

    it('strictly rejects second presentation with identical nullifier (replay / double-ACK)', () => {
      const messageId = 'msg-double-ack-test-02';
      const proof = generateZkDeliveryProof({
        messageId,
        recipientPrivateKey: alicePrivKey,
        proofType: 'merkle-sha256',
      });

      // 1st presentation succeeds
      const firstRes = guard.verifyAndConsume(proof);
      expect(firstRes.success).toBe(true);

      // 2nd presentation of same ACK is rejected
      const secondRes = guard.verifyAndConsume(proof);
      expect(secondRes.success).toBe(false);
      expect(secondRes.error).toContain('Double-ACK detected');
      expect(guard.getConsumedCount()).toBe(1);
    });

    it('resets guard state properly', () => {
      const proof = generateZkDeliveryProof({
        messageId: 'msg-reset-test',
        recipientPrivateKey: bobPrivKey,
        proofType: 'merkle-sha256',
      });

      guard.verifyAndConsume(proof);
      expect(guard.getConsumedCount()).toBe(1);

      guard.reset();
      expect(guard.getConsumedCount()).toBe(0);
      expect(guard.isSpent(proof.nullifier)).toBe(false);
      expect(guard.getMessageStatus('msg-reset-test')).toBe('PENDING');
    });
  });

  describe('4. Zero-Knowledge Anonymity Preservation', () => {
    it('preserves recipient anonymity: verifier cannot distinguish Alice vs Bob in authorized group', () => {
      const aliceSecret = deriveMemberSecretFromPrivateKey(alicePrivKey);
      const bobSecret = deriveMemberSecretFromPrivateKey(bobPrivKey);

      const leafAlice = computeIdentityCommitment(aliceSecret);
      const leafBob = computeIdentityCommitment(bobSecret);
      const circleLeaves = [leafAlice, leafBob];
      const circleRoot = computeCircleMerkleRoot(circleLeaves);

      // Alice generates a delivery receipt
      const aliceProof = generateZkDeliveryProof({
        messageId: 'msg-anonymous-ring',
        recipientPrivateKey: alicePrivKey,
        memberSecret: aliceSecret,
        groupLeaves: circleLeaves,
        groupRoot: circleRoot,
      });

      // Bob generates a delivery receipt for a different message
      const bobProof = generateZkDeliveryProof({
        messageId: 'msg-anonymous-ring-2',
        recipientPrivateKey: bobPrivKey,
        memberSecret: bobSecret,
        groupLeaves: circleLeaves,
        groupRoot: circleRoot,
      });

      // Both proofs verify against the exact same root
      expect(verifyZkDeliveryProof(aliceProof, 'msg-anonymous-ring', circleRoot).valid).toBe(true);
      expect(verifyZkDeliveryProof(bobProof, 'msg-anonymous-ring-2', circleRoot).valid).toBe(true);

      // The proof points do NOT disclose which leaf index (0 or 1) generated it
      // The public data in ZkDeliveryProof contains only root, nullifier, and blinding points!
      expect(aliceProof.merkleRoot).toBe(bobProof.merkleRoot);
      expect(aliceProof.nullifier).not.toBe(bobProof.nullifier);
      expect(aliceProof.groth16Proof).toBeDefined();
      expect(bobProof.groth16Proof).toBeDefined();

      // Blinded curve points are distinct and non-deterministic
      expect(BN254G1.equals(aliceProof.groth16Proof!.pi_a, bobProof.groth16Proof!.pi_a)).toBe(false);
    });

    it('randomizes Groth16 blinding factors so two proofs from same member are unlinkable', () => {
      const aliceSecret = deriveMemberSecretFromPrivateKey(alicePrivKey);
      const leaves = [computeIdentityCommitment(aliceSecret)];
      const root = computeCircleMerkleRoot(leaves);

      const proof1 = generateZkDeliveryProof({
        messageId: 'msg-unlink-1',
        recipientPrivateKey: alicePrivKey,
        memberSecret: aliceSecret,
        groupLeaves: leaves,
        groupRoot: root,
      });

      const proof2 = generateZkDeliveryProof({
        messageId: 'msg-unlink-2',
        recipientPrivateKey: alicePrivKey,
        memberSecret: aliceSecret,
        groupLeaves: leaves,
        groupRoot: root,
      });

      expect(verifyZkDeliveryProof(proof1, 'msg-unlink-1', root).valid).toBe(true);
      expect(verifyZkDeliveryProof(proof2, 'msg-unlink-2', root).valid).toBe(true);

      // Different message = different nullifiers
      expect(proof1.nullifier).not.toBe(proof2.nullifier);

      // Blinded curve points differ due to random blinding factors
      expect(BN254G1.equals(proof1.groth16Proof!.pi_a, proof2.groth16Proof!.pi_a)).toBe(false);
      expect(BN254G2.equals(proof1.groth16Proof!.pi_b, proof2.groth16Proof!.pi_b)).toBe(false);
      expect(BN254G1.equals(proof1.groth16Proof!.pi_c, proof2.groth16Proof!.pi_c)).toBe(false);
    });

    it('rejects unauthorized outsider from generating valid circle delivery proof', () => {
      const aliceSecret = deriveMemberSecretFromPrivateKey(alicePrivKey);
      const eveSecret = deriveMemberSecretFromPrivateKey(evePrivKey);

      // Group only contains Alice
      const authorizedLeaves = [computeIdentityCommitment(aliceSecret)];
      const root = computeCircleMerkleRoot(authorizedLeaves);

      // Eve (outsider) attempts to generate proof without being in authorizedLeaves
      expect(() => {
        generateZkDeliveryProof({
          messageId: 'msg-outsider-intercept',
          recipientPrivateKey: evePrivKey,
          memberSecret: eveSecret,
          groupLeaves: authorizedLeaves,
          groupRoot: root,
        });
      }).toThrow();
    });
  });
});
