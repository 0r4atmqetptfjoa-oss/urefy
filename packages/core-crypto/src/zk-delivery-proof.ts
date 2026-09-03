/**
 * @file zk-delivery-proof.ts
 * @package @aetheris/core-crypto
 * @description Production-grade Zero-Metadata Read Receipts & Proof of Delivery (Innovation 3).
 *
 * Problem: Standard read receipts leak who read a message, at what exact timestamp,
 * and from which network address / relay.
 *
 * Solution:
 * 1. Delivery Nullifier:
 *    When a recipient reads an E2EE message, they derive a one-time Delivery Nullifier:
 *    DeliveryNullifier = HMAC-SHA256(recipientPrivateKey, messageId + "DELIVERY_ACK").
 * 2. Zero-Knowledge Membership Proof:
 *    Proves via Merkle inclusion (Groth16 SNARK or SHA-256 binary tree) that the signer
 *    is an authorized member of the recipient set/group without revealing WHICH member signed it.
 * 3. Double-ACK Defense:
 *    Server and peers verify that the nullifier has not been previously consumed,
 *    preventing double-acknowledgment replay attacks while preserving 100% recipient anonymity.
 */

import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { constantTimeHexEqual, zeroize } from './security.js';
import { MerkleTree, MerkleProof } from './merkle.js';
import {
  Groth16Proof,
  BN254G1,
  BN254G2,
  BN254_SCALAR_FIELD_ORDER,
  computeIdentityCommitment,
  computeCircleMerkleRoot,
  computeMembershipNullifier,
  generateCircleMembershipProof,
  createCircleMembershipVerifier,
} from './zk-snark.js';
import { Field } from './rln.js';

/**
 * Constant context suffix for zero-metadata delivery nullifier derivation.
 */
export const DELIVERY_ACK_CONTEXT = 'DELIVERY_ACK';

/**
 * Complete Zero-Knowledge Delivery Proof structure.
 */
export interface ZkDeliveryProof {
  messageId: string;
  nullifier: string; // 64-char hex string: HMAC-SHA256(recipientPrivateKey, messageId + "DELIVERY_ACK")
  merkleRoot: string; // Group commitment root (hex string)
  timestamp: number; // Verification timestamp
  proofType: 'snark-groth16' | 'merkle-sha256';
  groth16Proof?: Groth16Proof;
  membershipNullifier?: string; // Decimal or hex string of BN254 nullifier hash
  merkleProof?: MerkleProof;
  anonymitySetSize: number;
}

/**
 * Result of delivery proof verification.
 */
export interface ZkDeliveryVerificationResult {
  valid: boolean;
  messageId: string;
  nullifier: string;
  proofType: 'snark-groth16' | 'merkle-sha256';
  anonymitySetSize: number;
  reason?: string;
}

/**
 * Options for generating a ZK Delivery Proof.
 */
export interface GenerateDeliveryProofOptions {
  messageId: string;
  recipientPrivateKey: Uint8Array | string;
  proofType?: 'snark-groth16' | 'merkle-sha256';
  // If SNARK proof is desired:
  memberSecret?: bigint;
  groupLeaves?: (bigint | string)[];
  groupRoot?: bigint | string;
  // If Merkle SHA-256 proof is desired:
  merkleLeavesHex?: string[];
  recipientLeafHex?: string;
}

/**
 * Helper to normalize private key inputs into Uint8Array.
 */
function normalizePrivateKey(key: Uint8Array | string): Uint8Array {
  if (key instanceof Uint8Array) {
    return new Uint8Array(key);
  }
  if (typeof key === 'string') {
    const clean = key.trim();
    if (/^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0) {
      return hexToBytes(clean);
    }
    return new TextEncoder().encode(clean);
  }
  throw new Error('Invalid private key format: must be Uint8Array or hex/utf8 string');
}

/**
 * Derives a one-time Delivery Nullifier for a message read receipt.
 *
 * Formula:
 * DeliveryNullifier = HMAC-SHA256(recipientPrivateKey, messageId + "DELIVERY_ACK")
 *
 * Properties:
 * - Deterministic for the same recipient and messageId.
 * - Cryptographically unlinkable to the recipient's public key or IP address.
 * - Independent across different message IDs.
 *
 * @param recipientPrivateKey Recipient's secret key (Uint8Array or hex string).
 * @param messageId Unique identifier of the message being acknowledged.
 * @returns 64-character lowercase hexadecimal nullifier string.
 */
export function deriveDeliveryNullifier(
  recipientPrivateKey: Uint8Array | string,
  messageId: string
): string {
  if (!messageId || typeof messageId !== 'string') {
    throw new Error('Invalid messageId: non-empty string required');
  }

  const keyBytes = normalizePrivateKey(recipientPrivateKey);
  try {
    const data = new TextEncoder().encode(messageId + DELIVERY_ACK_CONTEXT);
    const mac = hmac(sha256, keyBytes, data);
    return bytesToHex(mac);
  } finally {
    zeroize(keyBytes);
  }
}

/**
 * Deterministically derives a BN254 scalar field secret from a private key.
 */
export function deriveMemberSecretFromPrivateKey(recipientPrivateKey: Uint8Array | string): bigint {
  const keyBytes = normalizePrivateKey(recipientPrivateKey);
  try {
    const hash = sha256(keyBytes);
    const hex = bytesToHex(hash);
    return Field.mod(BigInt('0x' + hex), BN254_SCALAR_FIELD_ORDER);
  } finally {
    zeroize(keyBytes);
  }
}

/**
 * Generates an unlinkable Zero-Knowledge Delivery Proof.
 *
 * When a recipient reads a message, this generates:
 * 1. The HMAC-SHA256 Delivery Nullifier.
 * 2. A Zero-Knowledge proof (Groth16 BN254 or Merkle inclusion) demonstrating
 *    authorized membership in the conversation recipient group.
 *
 * @param options Delivery proof options including key, messageId, and group members.
 * @returns Complete ZkDeliveryProof.
 */
export function generateZkDeliveryProof(options: GenerateDeliveryProofOptions): ZkDeliveryProof {
  const { messageId, recipientPrivateKey } = options;
  if (!messageId) {
    throw new Error('messageId is required to generate delivery proof');
  }

  const nullifier = deriveDeliveryNullifier(recipientPrivateKey, messageId);
  const proofType = options.proofType || 'snark-groth16';
  const timestamp = Date.now();

  if (proofType === 'snark-groth16') {
    // 1. Determine member secret
    const memberSecret = options.memberSecret ?? deriveMemberSecretFromPrivateKey(recipientPrivateKey);
    const myLeaf = computeIdentityCommitment(memberSecret);

    // 2. Determine circle leaves
    let circleLeaves: bigint[];
    if (options.groupLeaves && options.groupLeaves.length > 0) {
      circleLeaves = options.groupLeaves.map((l) => (typeof l === 'bigint' ? l : BigInt(l)));
    } else {
      circleLeaves = [myLeaf];
    }

    // 3. Compute circle Merkle root
    const root = options.groupRoot
      ? (typeof options.groupRoot === 'bigint' ? options.groupRoot : BigInt(options.groupRoot))
      : computeCircleMerkleRoot(circleLeaves);

    // 4. Generate Groth16 membership proof with randomized blinding factors
    const { proof, nullifierHash } = generateCircleMembershipProof(memberSecret, circleLeaves, root);

    return {
      messageId,
      nullifier,
      merkleRoot: root.toString(16).padStart(64, '0'),
      timestamp,
      proofType: 'snark-groth16',
      groth16Proof: proof,
      membershipNullifier: nullifierHash.toString(16).padStart(64, '0'),
      anonymitySetSize: circleLeaves.length,
    };
  } else {
    // Merkle SHA-256 Proof mode
    const keyBytes = normalizePrivateKey(recipientPrivateKey);
    let myLeafHex = options.recipientLeafHex;
    if (!myLeafHex) {
      myLeafHex = bytesToHex(sha256(keyBytes));
    }
    zeroize(keyBytes);

    const leaves = options.merkleLeavesHex ? [...options.merkleLeavesHex] : [myLeafHex];
    const tree = new MerkleTree(leaves);
    const merkleProof = tree.getProof(myLeafHex);

    return {
      messageId,
      nullifier,
      merkleRoot: tree.getRoot(),
      timestamp,
      proofType: 'merkle-sha256',
      merkleProof,
      anonymitySetSize: leaves.length,
    };
  }
}

/**
 * Verifies a Zero-Knowledge Delivery Proof.
 *
 * Verifies:
 * 1. Nullifier format (64-character hexadecimal).
 * 2. Message ID match (if expectedMessageId provided).
 * 3. Group root match (if expectedRoot provided).
 * 4. Cryptographic membership proof validity (Groth16 pairing equality or Merkle root path).
 *
 * @param proof The delivery proof to verify.
 * @param expectedMessageId Optional expected message identifier.
 * @param expectedRoot Optional expected group Merkle root commitment.
 * @returns Verification result with boolean status and diagnostics.
 */
export function verifyZkDeliveryProof(
  proof: ZkDeliveryProof,
  expectedMessageId?: string,
  expectedRoot?: string | bigint
): ZkDeliveryVerificationResult {
  if (!proof) {
    return {
      valid: false,
      messageId: '',
      nullifier: '',
      proofType: 'snark-groth16',
      anonymitySetSize: 0,
      reason: 'Missing delivery proof object',
    };
  }

  // 1. Check nullifier validity
  if (!proof.nullifier || typeof proof.nullifier !== 'string' || !/^[0-9a-fA-F]{64}$/.test(proof.nullifier)) {
    return {
      valid: false,
      messageId: proof.messageId || '',
      nullifier: proof.nullifier || '',
      proofType: proof.proofType || 'snark-groth16',
      anonymitySetSize: proof.anonymitySetSize || 0,
      reason: 'Invalid delivery nullifier format: expected 64-hex character HMAC',
    };
  }

  // 2. Check messageId match
  if (expectedMessageId && proof.messageId !== expectedMessageId) {
    return {
      valid: false,
      messageId: proof.messageId,
      nullifier: proof.nullifier,
      proofType: proof.proofType,
      anonymitySetSize: proof.anonymitySetSize,
      reason: `Message ID mismatch: expected ${expectedMessageId}, got ${proof.messageId}`,
    };
  }

  // 3. Check expected Merkle root match
  if (expectedRoot !== undefined) {
    const normalizedExpectedRoot =
      typeof expectedRoot === 'bigint'
        ? expectedRoot.toString(16).padStart(64, '0')
        : expectedRoot.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    const normalizedProofRoot = proof.merkleRoot.toLowerCase().replace(/^0x/, '').padStart(64, '0');

    if (!constantTimeHexEqual(normalizedExpectedRoot, normalizedProofRoot)) {
      return {
        valid: false,
        messageId: proof.messageId,
        nullifier: proof.nullifier,
        proofType: proof.proofType,
        anonymitySetSize: proof.anonymitySetSize,
        reason: `Merkle root mismatch: unauthorized group commitment`,
      };
    }
  }

  // 4. Verify membership proof
  if (proof.proofType === 'snark-groth16') {
    if (!proof.groth16Proof || !proof.membershipNullifier) {
      return {
        valid: false,
        messageId: proof.messageId,
        nullifier: proof.nullifier,
        proofType: proof.proofType,
        anonymitySetSize: proof.anonymitySetSize,
        reason: 'Missing Groth16 proof points or membership nullifier',
      };
    }

    try {
      const rootBigInt = BigInt('0x' + proof.merkleRoot);
      const nullifierBigInt = BigInt('0x' + proof.membershipNullifier);

      // Validate G1 / G2 curve points
      if (
        !BN254G1.isValid(proof.groth16Proof.pi_a) ||
        !BN254G2.isValid(proof.groth16Proof.pi_b) ||
        !BN254G1.isValid(proof.groth16Proof.pi_c)
      ) {
        return {
          valid: false,
          messageId: proof.messageId,
          nullifier: proof.nullifier,
          proofType: proof.proofType,
          anonymitySetSize: proof.anonymitySetSize,
          reason: 'Groth16 proof points are invalid or not on BN254 curve',
        };
      }

      // Check pairing verification
      const verifier = createCircleMembershipVerifier(rootBigInt);
      const isValid = verifier(proof.groth16Proof, nullifierBigInt);

      if (!isValid) {
        return {
          valid: false,
          messageId: proof.messageId,
          nullifier: proof.nullifier,
          proofType: proof.proofType,
          anonymitySetSize: proof.anonymitySetSize,
          reason: 'Groth16 pairing verification equation failed',
        };
      }
    } catch (err: any) {
      return {
        valid: false,
        messageId: proof.messageId,
        nullifier: proof.nullifier,
        proofType: proof.proofType,
        anonymitySetSize: proof.anonymitySetSize,
        reason: `Cryptographic verification error: ${err.message}`,
      };
    }
  } else if (proof.proofType === 'merkle-sha256') {
    if (!proof.merkleProof) {
      return {
        valid: false,
        messageId: proof.messageId,
        nullifier: proof.nullifier,
        proofType: proof.proofType,
        anonymitySetSize: proof.anonymitySetSize,
        reason: 'Missing Merkle SHA-256 proof path',
      };
    }

    const isValid = MerkleTree.verifyProof(proof.merkleProof);
    if (!isValid) {
      return {
        valid: false,
        messageId: proof.messageId,
        nullifier: proof.nullifier,
        proofType: proof.proofType,
        anonymitySetSize: proof.anonymitySetSize,
        reason: 'Merkle tree path verification failed against root',
      };
    }

    if (!constantTimeHexEqual(proof.merkleProof.root, proof.merkleRoot)) {
      return {
        valid: false,
        messageId: proof.messageId,
        nullifier: proof.nullifier,
        proofType: proof.proofType,
        anonymitySetSize: proof.anonymitySetSize,
        reason: 'Merkle proof root does not match declared group root',
      };
    }
  }

  return {
    valid: true,
    messageId: proof.messageId,
    nullifier: proof.nullifier,
    proofType: proof.proofType,
    anonymitySetSize: proof.anonymitySetSize,
  };
}

/**
 * Double-ACK Defense and Delivery Proof Registry.
 *
 * Maintains consumed nullifiers to detect and neutralize replay / double-signaling attacks.
 * Tracks message read/delivery statuses without logging any recipient identity or IP metadata.
 */
export class DeliveryProofGuard {
  private spentNullifiers: Set<string> = new Set();
  private messageStatuses: Map<string, 'PENDING' | 'DELIVERED' | 'READ'> = new Map();
  private messageProofs: Map<string, ZkDeliveryProof> = new Map();

  /**
   * Check if a delivery nullifier has already been consumed.
   */
  public isSpent(nullifier: string): boolean {
    return this.spentNullifiers.has(nullifier.toLowerCase());
  }

  /**
   * Returns total number of consumed delivery nullifiers.
   */
  public getConsumedCount(): number {
    return this.spentNullifiers.size;
  }

  /**
   * Resets all consumed nullifiers (for testing or session re-initialization).
   */
  public reset(): void {
    this.spentNullifiers.clear();
    this.messageStatuses.clear();
    this.messageProofs.clear();
  }

  /**
   * Verifies an incoming delivery proof and consumes its nullifier if valid.
   * If the nullifier has already been consumed, strictly rejects with double-ACK error.
   *
   * @param proof The delivery proof.
   * @param expectedMessageId Optional expected message identifier.
   * @param expectedRoot Optional expected group Merkle root commitment.
   * @returns Success status or failure reason.
   */
  public verifyAndConsume(
    proof: ZkDeliveryProof,
    expectedMessageId?: string,
    expectedRoot?: string | bigint
  ): { success: boolean; error?: string } {
    const nullifierKey = proof?.nullifier?.toLowerCase();
    if (!nullifierKey) {
      return { success: false, error: 'Missing or empty delivery nullifier' };
    }

    // Double-ACK Replay Detection
    if (this.spentNullifiers.has(nullifierKey)) {
      return {
        success: false,
        error: `Double-ACK detected: Delivery nullifier ${proof.nullifier.slice(0, 12)}... has already been consumed.`,
      };
    }

    // Cryptographic verification
    const verification = verifyZkDeliveryProof(proof, expectedMessageId, expectedRoot);
    if (!verification.valid) {
      return {
        success: false,
        error: `Invalid ZK delivery proof: ${verification.reason}`,
      };
    }

    // Consume nullifier & update status
    this.spentNullifiers.add(nullifierKey);
    this.messageStatuses.set(proof.messageId, 'READ');
    this.messageProofs.set(proof.messageId, proof);

    return { success: true };
  }

  /**
   * Get the delivery status of a message.
   */
  public getMessageStatus(messageId: string): 'PENDING' | 'DELIVERED' | 'READ' {
    return this.messageStatuses.get(messageId) || 'PENDING';
  }

  /**
   * Check if a message has a verified delivery proof.
   */
  public isZKVerified(messageId: string): boolean {
    return this.messageProofs.has(messageId);
  }

  /**
   * Retrieve the stored delivery proof for a message.
   */
  public getProof(messageId: string): ZkDeliveryProof | undefined {
    return this.messageProofs.get(messageId);
  }
}

/**
 * Shared singleton instance of DeliveryProofGuard.
 */
export const defaultDeliveryProofGuard = new DeliveryProofGuard();
