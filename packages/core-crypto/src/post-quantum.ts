/**
 * @file post-quantum.ts
 * @package @aetheris/core-crypto
 * @description Production-grade Hybrid Post-Quantum Key Encapsulation Mechanism (Hybrid KEM).
 * Combines classical Curve25519 / X25519 Diffie-Hellman with NIST FIPS 203 ML-KEM-768
 * (Module-Lattice Key Encapsulation / Kyber-768) to protect against harvest-now-decrypt-later adversaries.
 */

import { x25519 } from '@noble/curves/ed25519';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import { timingSafeEqual, zeroize } from './security.js';

/**
 * Standard HKDF context info string for Aetheris Hybrid PQC ML-KEM-768 V1.
 */
export const HYBRID_KEM_INFO = 'AETHERIS_HYBRID_PQC_ML_KEM_768_V1';

/**
 * Byte length constants for ML-KEM-768 (NIST FIPS 203) and X25519 primitives.
 */
export const ML_KEM_768_PUBLIC_KEY_SIZE = 1184;
export const ML_KEM_768_SECRET_KEY_SIZE = 2400;
export const ML_KEM_768_CIPHERTEXT_SIZE = 1088;
export const ML_KEM_768_SHARED_SECRET_SIZE = 32;
export const X25519_KEY_SIZE = 32;
export const HYBRID_KEM_SHARED_SECRET_SIZE = 32;
export const HYBRID_KEM_PUBLIC_KEY_SIZE = X25519_KEY_SIZE + ML_KEM_768_PUBLIC_KEY_SIZE; // 1216 bytes
export const HYBRID_KEM_CIPHERTEXT_SIZE = X25519_KEY_SIZE + ML_KEM_768_CIPHERTEXT_SIZE; // 1120 bytes

/**
 * Complete Hybrid KEM Keypair containing classical X25519 and post-quantum ML-KEM-768 keys.
 */
export interface HybridKemKeyPair {
  classicalPublicKey: Uint8Array;
  classicalPrivateKey: Uint8Array;
  pqPublicKey: Uint8Array;
  pqPrivateKey: Uint8Array;
}

/**
 * Recipient public key required for hybrid key encapsulation.
 */
export interface HybridKemPublicKey {
  classicalPublicKey: Uint8Array;
  pqPublicKey: Uint8Array;
}

/**
 * Private key required for hybrid key decapsulation.
 */
export interface HybridKemPrivateKey {
  classicalPrivateKey: Uint8Array;
  pqPrivateKey: Uint8Array;
  classicalPublicKey?: Uint8Array;
}

/**
 * Hybrid KEM Ciphertext containing ephemeral classical public key and ML-KEM-768 ciphertext.
 */
export interface HybridKemCiphertext {
  classicalEphemeralPublicKey: Uint8Array;
  pqCiphertext: Uint8Array;
}

/**
 * Result of encapsulation containing hybrid ciphertext and derived shared secret.
 */
export interface HybridKemEncapsulationResult {
  ciphertext: HybridKemCiphertext;
  sharedSecret: Uint8Array;
}

/**
 * Generates a Hybrid KEM keypair combining X25519 and ML-KEM-768 (NIST FIPS 203).
 *
 * If a seed is supplied, the keypair is derived deterministically using HKDF-SHA256
 * expansion (32 bytes for X25519 private key, 64 bytes for ML-KEM-768 lattice matrix seed).
 * Otherwise, cryptographically secure random values are generated via CSPRNG.
 *
 * @param seed Optional seed for deterministic generation.
 * @returns Complete HybridKemKeyPair.
 */
export function generateHybridKemKeyPair(seed?: Uint8Array): HybridKemKeyPair {
  if (seed !== undefined) {
    if (!(seed instanceof Uint8Array) || seed.length < 32) {
      throw new Error('Hybrid KEM seed must contain at least 32 bytes');
    }
    // Deterministic expansion: 32 bytes for X25519, 64 bytes for ML-KEM-768 seed
    const info = new TextEncoder().encode('AETHERIS_HYBRID_KEM_KEYGEN_V1');
    const salt = new Uint8Array(32);
    const expanded = hkdf(sha256, seed, salt, info, 96);
    const classicalPrivateKey = new Uint8Array(expanded.subarray(0, 32));
    const pqSeed = new Uint8Array(expanded.subarray(32, 96));
    try {
      const classicalPublicKey = x25519.getPublicKey(classicalPrivateKey);
      const pqKeyPair = ml_kem768.keygen(pqSeed);
      return {
        classicalPublicKey,
        classicalPrivateKey,
        pqPublicKey: pqKeyPair.publicKey,
        pqPrivateKey: pqKeyPair.secretKey,
      };
    } catch (error) {
      zeroize(classicalPrivateKey);
      throw error;
    } finally {
      zeroize(expanded);
      zeroize(pqSeed);
    }
  }

  const classicalPrivateKey = x25519.utils.randomPrivateKey();
  try {
    const classicalPublicKey = x25519.getPublicKey(classicalPrivateKey);
    const pqKeyPair = ml_kem768.keygen();
    return { classicalPublicKey, classicalPrivateKey, pqPublicKey: pqKeyPair.publicKey, pqPrivateKey: pqKeyPair.secretKey };
  } catch (error) {
    zeroize(classicalPrivateKey);
    throw error;
  }
}

/**
 * Encapsulates a hybrid shared secret using recipient's classical X25519 and post-quantum ML-KEM-768 public keys.
 *
 * Computation steps:
 * 1. Generates ephemeral X25519 keypair and performs Diffie-Hellman to get classical shared secret (32 bytes).
 * 2. Encapsulates ML-KEM-768 ciphertext and computes lattice shared secret (32 bytes).
 * 3. Derives final 32-byte hybrid shared secret via HKDF-SHA256:
 *    HKDF(IKM = classical_ss || pq_ss, salt = recipientPublicKey.classicalPublicKey, info = "AETHERIS_HYBRID_PQC_ML_KEM_768_V1").
 * 4. Zeroizes intermediate ephemeral private keys and raw shared secrets before returning.
 *
 * @param recipientPublicKey Recipient's classical and post-quantum public keys.
 * @returns Hybrid ciphertext and derived 32-byte shared secret.
 */
export function encapsulateHybrid(
  recipientPublicKey: { classicalPublicKey: Uint8Array; pqPublicKey: Uint8Array }
): { ciphertext: HybridKemCiphertext; sharedSecret: Uint8Array } {
  if (!recipientPublicKey || !recipientPublicKey.classicalPublicKey || !recipientPublicKey.pqPublicKey) {
    throw new Error('Invalid recipient public key: classicalPublicKey and pqPublicKey are required');
  }
  if (!(recipientPublicKey.classicalPublicKey instanceof Uint8Array) || !(recipientPublicKey.pqPublicKey instanceof Uint8Array)) {
    throw new Error('Hybrid KEM public keys must be Uint8Array values');
  }
  if (recipientPublicKey.classicalPublicKey.length !== X25519_KEY_SIZE) {
    throw new Error(
      `Invalid recipient classical public key length: ${recipientPublicKey.classicalPublicKey.length}, expected ${X25519_KEY_SIZE}`
    );
  }
  if (recipientPublicKey.pqPublicKey.length !== ML_KEM_768_PUBLIC_KEY_SIZE) {
    throw new Error(
      `Invalid recipient PQ public key length: ${recipientPublicKey.pqPublicKey.length}, expected ${ML_KEM_768_PUBLIC_KEY_SIZE}`
    );
  }

  let ephemeralPrivateKey: Uint8Array | null = null;
  let classical_ss: Uint8Array | null = null;
  let pq_ss: Uint8Array | null = null;
  let ikm: Uint8Array | null = null;

  try {
    ephemeralPrivateKey = x25519.utils.randomPrivateKey();
    const classicalEphemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey);
    classical_ss = x25519.getSharedSecret(ephemeralPrivateKey, recipientPublicKey.classicalPublicKey);

    const pqEnc = ml_kem768.encapsulate(recipientPublicKey.pqPublicKey);
    pq_ss = pqEnc.sharedSecret;
    const pqCiphertext = pqEnc.cipherText;

    ikm = new Uint8Array(classical_ss.length + pq_ss.length);
    ikm.set(classical_ss, 0);
    ikm.set(pq_ss, classical_ss.length);

    const infoBytes = new TextEncoder().encode(HYBRID_KEM_INFO);
    const sharedSecret = hkdf(
      sha256,
      ikm,
      recipientPublicKey.classicalPublicKey,
      infoBytes,
      HYBRID_KEM_SHARED_SECRET_SIZE
    );

    return {
      ciphertext: {
        classicalEphemeralPublicKey,
        pqCiphertext,
      },
      sharedSecret,
    };
  } finally {
    if (ephemeralPrivateKey) zeroize(ephemeralPrivateKey);
    if (classical_ss) zeroize(classical_ss);
    if (pq_ss) zeroize(pq_ss);
    if (ikm) zeroize(ikm);
  }
}

/**
 * Decapsulates a hybrid ciphertext using recipient's private key.
 *
 * Computation steps:
 * 1. Computes classical shared secret via X25519 Diffie-Hellman using recipient's classical private key
 *    and ciphertext's ephemeral public key.
 * 2. Decapsulates ML-KEM-768 shared secret using recipient's post-quantum lattice private key.
 * 3. Derives identical 32-byte hybrid shared secret using HKDF-SHA256:
 *    HKDF(IKM = classical_ss || pq_ss, salt = recipientPublicKey.classicalPublicKey, info = "AETHERIS_HYBRID_PQC_ML_KEM_768_V1").
 * 4. Zeroizes intermediate secrets in memory.
 *
 * @param ciphertext Hybrid KEM ciphertext.
 * @param privateKey Recipient's Hybrid KEM private key (or keypair).
 * @returns 32-byte derived shared secret.
 */
export function decapsulateHybrid(
  ciphertext: HybridKemCiphertext,
  privateKey: HybridKemPrivateKey
): Uint8Array {
  if (!ciphertext || !ciphertext.classicalEphemeralPublicKey || !ciphertext.pqCiphertext) {
    throw new Error('Invalid ciphertext: classicalEphemeralPublicKey and pqCiphertext are required');
  }
  if (!(ciphertext.classicalEphemeralPublicKey instanceof Uint8Array) || !(ciphertext.pqCiphertext instanceof Uint8Array)) {
    throw new Error('Hybrid KEM ciphertext must contain Uint8Array values');
  }
  if (ciphertext.classicalEphemeralPublicKey.length !== X25519_KEY_SIZE) {
    throw new Error(
      `Invalid classical ephemeral public key length: ${ciphertext.classicalEphemeralPublicKey.length}, expected ${X25519_KEY_SIZE}`
    );
  }
  if (ciphertext.pqCiphertext.length !== ML_KEM_768_CIPHERTEXT_SIZE) {
    throw new Error(
      `Invalid PQ ciphertext length: ${ciphertext.pqCiphertext.length}, expected ${ML_KEM_768_CIPHERTEXT_SIZE}`
    );
  }

  if (!privateKey || !privateKey.classicalPrivateKey || !privateKey.pqPrivateKey) {
    throw new Error('Invalid private key: classicalPrivateKey and pqPrivateKey are required');
  }
  if (!(privateKey.classicalPrivateKey instanceof Uint8Array) || !(privateKey.pqPrivateKey instanceof Uint8Array)) {
    throw new Error('Hybrid KEM private keys must be Uint8Array values');
  }
  if (privateKey.classicalPrivateKey.length !== X25519_KEY_SIZE) {
    throw new Error(
      `Invalid classical private key length: ${privateKey.classicalPrivateKey.length}, expected ${X25519_KEY_SIZE}`
    );
  }
  if (privateKey.pqPrivateKey.length !== ML_KEM_768_SECRET_KEY_SIZE) {
    throw new Error(
      `Invalid PQ private key length: ${privateKey.pqPrivateKey.length}, expected ${ML_KEM_768_SECRET_KEY_SIZE}`
    );
  }

  const recipientClassicalPublicKey = x25519.getPublicKey(privateKey.classicalPrivateKey);
  if (privateKey.classicalPublicKey !== undefined && (!(privateKey.classicalPublicKey instanceof Uint8Array) ||
      !timingSafeEqual(recipientClassicalPublicKey, privateKey.classicalPublicKey))) {
    throw new Error('Hybrid KEM public and private keys do not match');
  }

  let classical_ss: Uint8Array | null = null;
  let pq_ss: Uint8Array | null = null;
  let ikm: Uint8Array | null = null;

  try {
    classical_ss = x25519.getSharedSecret(
      privateKey.classicalPrivateKey,
      ciphertext.classicalEphemeralPublicKey
    );
    pq_ss = ml_kem768.decapsulate(ciphertext.pqCiphertext, privateKey.pqPrivateKey);

    ikm = new Uint8Array(classical_ss.length + pq_ss.length);
    ikm.set(classical_ss, 0);
    ikm.set(pq_ss, classical_ss.length);

    const infoBytes = new TextEncoder().encode(HYBRID_KEM_INFO);
    return hkdf(
      sha256,
      ikm,
      recipientClassicalPublicKey,
      infoBytes,
      HYBRID_KEM_SHARED_SECRET_SIZE
    );
  } finally {
    if (classical_ss) zeroize(classical_ss);
    if (pq_ss) zeroize(pq_ss);
    if (ikm) zeroize(ikm);
  }
}

/**
 * Serializes a HybridKemPublicKey into a contiguous 1216-byte buffer:
 * [32 bytes classicalPublicKey || 1184 bytes pqPublicKey]
 */
export function serializeHybridKemPublicKey(key: HybridKemPublicKey): Uint8Array {
  if (!(key?.classicalPublicKey instanceof Uint8Array) || !(key?.pqPublicKey instanceof Uint8Array)) throw new Error('Hybrid KEM public keys must be Uint8Array values');
  if (key.classicalPublicKey.length !== X25519_KEY_SIZE) {
    throw new Error(`Invalid classical public key length: ${key.classicalPublicKey.length}`);
  }
  if (key.pqPublicKey.length !== ML_KEM_768_PUBLIC_KEY_SIZE) {
    throw new Error(`Invalid PQ public key length: ${key.pqPublicKey.length}`);
  }
  const result = new Uint8Array(HYBRID_KEM_PUBLIC_KEY_SIZE);
  result.set(key.classicalPublicKey, 0);
  result.set(key.pqPublicKey, X25519_KEY_SIZE);
  return result;
}

/**
 * Deserializes a contiguous 1216-byte buffer into a HybridKemPublicKey.
 */
export function deserializeHybridKemPublicKey(bytes: Uint8Array): HybridKemPublicKey {
  if (!(bytes instanceof Uint8Array)) throw new Error('Serialized hybrid public key must be a Uint8Array');
  if (bytes.length !== HYBRID_KEM_PUBLIC_KEY_SIZE) {
    throw new Error(
      `Invalid serialized public key length: ${bytes.length}, expected ${HYBRID_KEM_PUBLIC_KEY_SIZE}`
    );
  }
  return {
    classicalPublicKey: bytes.slice(0, X25519_KEY_SIZE),
    pqPublicKey: bytes.slice(X25519_KEY_SIZE, HYBRID_KEM_PUBLIC_KEY_SIZE),
  };
}

/**
 * Serializes a HybridKemCiphertext into a contiguous 1120-byte buffer:
 * [32 bytes classicalEphemeralPublicKey || 1088 bytes pqCiphertext]
 */
export function serializeHybridKemCiphertext(ct: HybridKemCiphertext): Uint8Array {
  if (!(ct?.classicalEphemeralPublicKey instanceof Uint8Array) || !(ct?.pqCiphertext instanceof Uint8Array)) throw new Error('Hybrid KEM ciphertext must contain Uint8Array values');
  if (ct.classicalEphemeralPublicKey.length !== X25519_KEY_SIZE) {
    throw new Error(`Invalid classical ephemeral public key length: ${ct.classicalEphemeralPublicKey.length}`);
  }
  if (ct.pqCiphertext.length !== ML_KEM_768_CIPHERTEXT_SIZE) {
    throw new Error(`Invalid PQ ciphertext length: ${ct.pqCiphertext.length}`);
  }
  const result = new Uint8Array(HYBRID_KEM_CIPHERTEXT_SIZE);
  result.set(ct.classicalEphemeralPublicKey, 0);
  result.set(ct.pqCiphertext, X25519_KEY_SIZE);
  return result;
}

/**
 * Deserializes a contiguous 1120-byte buffer into a HybridKemCiphertext.
 */
export function deserializeHybridKemCiphertext(bytes: Uint8Array): HybridKemCiphertext {
  if (!(bytes instanceof Uint8Array)) throw new Error('Serialized hybrid ciphertext must be a Uint8Array');
  if (bytes.length !== HYBRID_KEM_CIPHERTEXT_SIZE) {
    throw new Error(
      `Invalid serialized ciphertext length: ${bytes.length}, expected ${HYBRID_KEM_CIPHERTEXT_SIZE}`
    );
  }
  return {
    classicalEphemeralPublicKey: bytes.slice(0, X25519_KEY_SIZE),
    pqCiphertext: bytes.slice(X25519_KEY_SIZE, HYBRID_KEM_CIPHERTEXT_SIZE),
  };
}

/**
 * Production-grade Hybrid KEM Engine encapsulating full post-quantum lifecycle operations.
 */
export class HybridKemEngine {
  static generateKeyPair(seed?: Uint8Array): HybridKemKeyPair {
    return generateHybridKemKeyPair(seed);
  }

  static encapsulate(recipientPublicKey: HybridKemPublicKey): HybridKemEncapsulationResult {
    return encapsulateHybrid(recipientPublicKey);
  }

  static decapsulate(ciphertext: HybridKemCiphertext, privateKey: HybridKemPrivateKey): Uint8Array {
    return decapsulateHybrid(ciphertext, privateKey);
  }

  static serializePublicKey(key: HybridKemPublicKey): Uint8Array {
    return serializeHybridKemPublicKey(key);
  }

  static deserializePublicKey(bytes: Uint8Array): HybridKemPublicKey {
    return deserializeHybridKemPublicKey(bytes);
  }

  static serializeCiphertext(ct: HybridKemCiphertext): Uint8Array {
    return serializeHybridKemCiphertext(ct);
  }

  static deserializeCiphertext(bytes: Uint8Array): HybridKemCiphertext {
    return deserializeHybridKemCiphertext(bytes);
  }
}
