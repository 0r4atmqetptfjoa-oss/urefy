import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { constantTimeHexEqual, zeroize } from './security.js';
import {
  createGroth16Setup,
  createGroth16Proof,
  verifyGroth16Proof,
  serializeProof,
  deserializeProof,
  BN254_SCALAR_FIELD_ORDER,
} from './zk-snark.js';
import { Field } from './rln.js';

export interface PassportAttestation {
  realmNullifier: string;
  identityCommitment: string;
  isUnique: boolean;
  zkProofHex: string;
  groth16Proof?: string;
  realm?: string;
  timestamp: number;
}

const ZKPASSPORT_CIRCUIT_SEED = 'aetheris:zkpassport:canonical:v1';
const ZKPASSPORT_SETUP = createGroth16Setup(3, ZKPASSPORT_CIRCUIT_SEED);

function computeTranscriptHash(commitment: string, realmNullifier: string): string {
  const proofBytes = sha256(new TextEncoder().encode(`zk-proof-${commitment}-${realmNullifier}`));
  return bytesToHex(proofBytes);
}

export class ZKPassportVerifier {
  static generateAttestation(
    passportSalt: Uint8Array,
    documentIdHash: string,
    realm: string = 'aetheris-genesis-realm'
  ): PassportAttestation {
    const saltBytes = new Uint8Array(passportSalt);
    const cleanDocHex = documentIdHash.trim().replace(/^0x/, '');
    const docBytes = hexToBytes(cleanDocHex.length % 2 === 0 ? cleanDocHex : '0' + cleanDocHex);

    const combinedCommitment = new Uint8Array(saltBytes.length + docBytes.length);
    combinedCommitment.set(saltBytes, 0);
    combinedCommitment.set(docBytes, saltBytes.length);
    const commitment = bytesToHex(sha256(combinedCommitment));
    zeroize(combinedCommitment);

    const realmBytes = new TextEncoder().encode(realm);
    const combinedNullifier = new Uint8Array(saltBytes.length + realmBytes.length);
    combinedNullifier.set(saltBytes, 0);
    combinedNullifier.set(realmBytes, saltBytes.length);
    const realmNullifier = bytesToHex(sha256(combinedNullifier));
    zeroize(combinedNullifier);
    zeroize(saltBytes);

    const zkProofHex = computeTranscriptHash(commitment, realmNullifier);

    const commitmentScalar = BigInt('0x' + commitment) % BN254_SCALAR_FIELD_ORDER;
    const nullifierScalar = BigInt('0x' + realmNullifier) % BN254_SCALAR_FIELD_ORDER;
    const realmScalar = Field.hashToField('aetheris:zkpassport:realm', realm);

    const groth16 = createGroth16Proof(ZKPASSPORT_SETUP.provingKey, [
      commitmentScalar,
      nullifierScalar,
      realmScalar,
    ]);

    return {
      realmNullifier,
      identityCommitment: commitment,
      isUnique: true,
      zkProofHex,
      groth16Proof: serializeProof(groth16),
      realm,
      timestamp: Date.now(),
    };
  }

  static verifyProof(
    attestation: PassportAttestation,
    revokedNullifiers: Set<string>,
    expectedRealm?: string
  ): { valid: boolean; reason?: string } {
    if (!attestation || typeof attestation !== 'object') {
      return { valid: false, reason: 'Missing attestation payload.' };
    }

    if (!attestation.realmNullifier || !/^[0-9a-fA-F]{64}$/.test(attestation.realmNullifier)) {
      return { valid: false, reason: 'Malformed realm nullifier.' };
    }

    if (!attestation.identityCommitment || !/^[0-9a-fA-F]{64}$/.test(attestation.identityCommitment)) {
      return { valid: false, reason: 'Malformed identity commitment.' };
    }

    if (revokedNullifiers.has(attestation.realmNullifier)) {
      return { valid: false, reason: 'Passport nullifier has been revoked due to ZK-RLN spam slashing.' };
    }

    if (!attestation.zkProofHex || attestation.zkProofHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(attestation.zkProofHex)) {
      return { valid: false, reason: 'Malformed zk-SNARK proof transcript.' };
    }

    const expectedTranscript = computeTranscriptHash(
      attestation.identityCommitment.toLowerCase(),
      attestation.realmNullifier.toLowerCase()
    );
    if (!constantTimeHexEqual(attestation.zkProofHex.toLowerCase(), expectedTranscript)) {
      return { valid: false, reason: 'Transcript commitment binding verification failed.' };
    }

    if (expectedRealm && attestation.realm && attestation.realm !== expectedRealm) {
      return { valid: false, reason: `Realm mismatch: expected ${expectedRealm}, got ${attestation.realm}.` };
    }

    if (attestation.groth16Proof) {
      try {
        const realmToVerify = expectedRealm || attestation.realm || 'aetheris-genesis-realm';
        const commitmentScalar = BigInt('0x' + attestation.identityCommitment) % BN254_SCALAR_FIELD_ORDER;
        const nullifierScalar = BigInt('0x' + attestation.realmNullifier) % BN254_SCALAR_FIELD_ORDER;
        const realmScalar = Field.hashToField('aetheris:zkpassport:realm', realmToVerify);
        const deserialized = deserializeProof(attestation.groth16Proof);
        const snarkValid = verifyGroth16Proof(
          ZKPASSPORT_SETUP.verifyingKey,
          [commitmentScalar, nullifierScalar, realmScalar],
          deserialized
        );
        if (!snarkValid) {
          return { valid: false, reason: 'Groth16 BN254 pairing check failed for passport attestation.' };
        }
      } catch {
        return { valid: false, reason: 'Malformed Groth16 proof points in passport attestation.' };
      }
    }

    return { valid: true };
  }
}
