import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { ed25519, x25519 } from '@noble/curves/ed25519';
import { BN254_SCALAR_FIELD_ORDER } from './zk-snark.js';
import { E2EEEngine, EncryptedEnvelope } from './e2ee.js';
import { computeFingerprint } from './ed25519.js';

/**
 * Prime field modulus used for Shamir's Secret Sharing (254-bit BN254 scalar field order).
 * p = 21888242871839275222246405745257275088548364400416034343698204186575808495617
 */
export const SHAMIR_PRIME: bigint = BN254_SCALAR_FIELD_ORDER;

/**
 * A discrete secret shard produced by Shamir's Secret Sharing over F_p.
 */
export interface SecretShard {
  version: '1.0';
  index: number;         // 1-based x coordinate (1 to n)
  threshold: number;     // k quorum threshold
  totalShards: number;   // n total shards
  yValues: string[];     // Array of polynomial evaluations (one per 30-byte chunk), serialized as hex
  checksum: string;      // 8-character hex SHA-256 integrity checksum of the original secret
}

/**
 * Encrypted shard package specifically addressed to a designated WoT Guardian.
 */
export interface EncryptedGuardianShardPackage {
  version: '1.0';
  guardianFingerprint: string;
  guardianPublicKey: string; // Hex Ed25519 public key
  ephemeralPublicKey: string; // Hex X25519 public key
  encryptedShard: EncryptedEnvelope;
  shardIndex: number;
  threshold: number;
  totalShards: number;
  timestamp: number;
}

/**
 * Full export package produced when setting up social guardians for an identity.
 */
export interface SocialRecoverySetupPackage {
  version: '1.0';
  userFingerprint: string;
  threshold: number;
  totalShards: number;
  createdAt: number;
  guardianPackages: EncryptedGuardianShardPackage[];
}

// -----------------------------------------------------------------------------
// Finite Field F_p Arithmetic Helpers
// -----------------------------------------------------------------------------

function modP(n: bigint, p: bigint = SHAMIR_PRIME): bigint {
  const r = n % p;
  return r >= 0n ? r : r + p;
}

function expP(base: bigint, exp: bigint, p: bigint = SHAMIR_PRIME): bigint {
  let res = 1n;
  let b = modP(base, p);
  let e = exp;
  while (e > 0n) {
    if (e % 2n === 1n) res = modP(res * b, p);
    b = modP(b * b, p);
    e /= 2n;
  }
  return res;
}

/** Modular multiplicative inverse via Fermat's Little Theorem: a^(p-2) mod p */
function invP(a: bigint, p: bigint = SHAMIR_PRIME): bigint {
  const m = modP(a, p);
  if (m === 0n) throw new Error('Division by zero in prime field F_p');
  return expP(m, p - 2n, p);
}

function randomFieldScalar(p: bigint = SHAMIR_PRIME): bigint {
  const buf = new Uint8Array(32);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < 32; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  let val = 0n;
  for (let i = 0; i < 32; i++) {
    val = (val << 8n) | BigInt(buf[i]);
  }
  val = val % (p - 1n);
  return val === 0n ? 1n : val;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let res = 0n;
  for (let i = 0; i < bytes.length; i++) {
    res = (res << 8n) | BigInt(bytes[i]);
  }
  return res;
}

function bigIntToBytes(n: bigint, byteLength: number): Uint8Array {
  const buf = new Uint8Array(byteLength);
  let temp = n;
  for (let i = byteLength - 1; i >= 0; i--) {
    buf[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }
  return buf;
}

// -----------------------------------------------------------------------------
// Shamir's Secret Sharing (k-of-n Threshold over 256-bit Prime Field)
// -----------------------------------------------------------------------------

/**
 * Splits an arbitrary secret byte array into n shards with a reconstruction threshold of k.
 * Enforces 2 <= threshold <= totalShards <= 16.
 *
 * @param secret The secret data (e.g. BIP-39 mnemonic seed phrase or entropy)
 * @param totalShards Total number of guardian shards to create (n)
 * @param threshold Quorum threshold needed to reconstruct the secret (k)
 * @returns Array of n SecretShard objects
 */
export function splitSecretIntoShards(
  secret: Uint8Array,
  totalShards: number,
  threshold: number
): SecretShard[] {
  if (!secret || secret.length === 0) {
    throw new Error('Secret cannot be empty');
  }
  if (threshold < 2) {
    throw new Error(`Invalid threshold ${threshold}: must be at least 2`);
  }
  if (totalShards < threshold) {
    throw new Error(`Total shards (${totalShards}) cannot be less than threshold (${threshold})`);
  }
  if (totalShards > 16) {
    throw new Error(`Total shards (${totalShards}) exceeds maximum sovereign limit of 16`);
  }

  // 1. Calculate 4-byte integrity checksum of original secret
  const fullHash = sha256(secret);
  const checksumBytes = fullHash.subarray(0, 4);
  const checksumHex = bytesToHex(checksumBytes);

  // 2. Pack payload: [length (2 bytes, big-endian) | checksum (4 bytes) | secret bytes]
  const secretLen = secret.length;
  if (secretLen > 65535) {
    throw new Error('Secret length exceeds maximum supported size (65535 bytes)');
  }

  const packed = new Uint8Array(2 + 4 + secretLen);
  packed[0] = (secretLen >> 8) & 0xff;
  packed[1] = secretLen & 0xff;
  packed.set(checksumBytes, 2);
  packed.set(secret, 6);

  // 3. Chunk into segments of 30 bytes (240 bits < 254-bit field order)
  const CHUNK_SIZE = 30;
  const numChunks = Math.ceil(packed.length / CHUNK_SIZE);
  const chunkScalars: bigint[] = [];

  for (let i = 0; i < numChunks; i++) {
    const chunkBytes = new Uint8Array(CHUNK_SIZE);
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, packed.length);
    chunkBytes.set(packed.subarray(start, end), 0);
    chunkScalars.push(bytesToBigInt(chunkBytes));
  }

  // 4. Construct random polynomials of degree (threshold - 1) for each chunk
  // P_i(x) = a_{i,0} + a_{i,1}*x + ... + a_{i,k-1}*x^(k-1) mod p
  const polynomials: bigint[][] = [];
  for (let i = 0; i < numChunks; i++) {
    const coeffs: bigint[] = [chunkScalars[i]]; // a_0 is the secret chunk
    for (let d = 1; d < threshold; d++) {
      coeffs.push(randomFieldScalar(SHAMIR_PRIME));
    }
    polynomials.push(coeffs);
  }

  // 5. Evaluate polynomials at x = 1, 2, ..., totalShards for each shard
  const shards: SecretShard[] = [];
  for (let j = 1; j <= totalShards; j++) {
    const x = BigInt(j);
    const yValues: string[] = [];

    for (let i = 0; i < numChunks; i++) {
      const coeffs = polynomials[i];
      let y = coeffs[0];
      let xPower = 1n;

      for (let d = 1; d < threshold; d++) {
        xPower = modP(xPower * x);
        const term = modP(coeffs[d] * xPower);
        y = modP(y + term);
      }

      yValues.push(y.toString(16));
    }

    shards.push({
      version: '1.0',
      index: j,
      threshold,
      totalShards,
      yValues,
      checksum: checksumHex,
    });
  }

  return shards;
}

/**
 * Reconstructs the original secret from any k valid shards using Lagrange polynomial interpolation.
 * Verifies the 32-bit SHA-256 checksum to guarantee zero data corruption.
 *
 * Lagrange Interpolation at x = 0:
 * P(0) = sum_{j=1}^k y_j * prod_{m != j} (-x_m) / (x_j - x_m) mod p
 *
 * @param shards Array containing at least k unique shards
 * @returns Reconstructed Uint8Array secret
 */
export function reconstructSecretFromShards(shards: SecretShard[]): Uint8Array {
  if (!Array.isArray(shards) || shards.length === 0) {
    throw new Error('No shards provided for secret reconstruction');
  }

  // Validate shard structure and deduplicate by index (x coordinate)
  const shardMap = new Map<number, SecretShard>();
  for (const s of shards) {
    if (!s || typeof s.index !== 'number' || !Array.isArray(s.yValues)) {
      throw new Error('Invalid shard structure encountered');
    }
    if (!shardMap.has(s.index)) {
      shardMap.set(s.index, s);
    }
  }

  const uniqueShards = Array.from(shardMap.values());
  const threshold = uniqueShards[0].threshold;
  const totalShards = uniqueShards[0].totalShards;
  const expectedChecksum = uniqueShards[0].checksum;
  const numChunks = uniqueShards[0].yValues.length;

  if (threshold < 2 || totalShards < threshold) {
    throw new Error(`Corrupted shard header: threshold ${threshold}, total ${totalShards}`);
  }

  if (uniqueShards.length < threshold) {
    throw new Error(
      `Threshold not met: received ${uniqueShards.length} unique shards, expected at least ${threshold}`
    );
  }

  // Consistency checks across all shards
  for (const s of uniqueShards) {
    if (s.threshold !== threshold || s.yValues.length !== numChunks || s.checksum !== expectedChecksum) {
      throw new Error('Shard parameter mismatch: shards belong to different sharing sessions');
    }
  }

  // Select first k unique shards for Lagrange interpolation
  const activeShards = uniqueShards.slice(0, threshold);
  const CHUNK_SIZE = 30;
  const reconstructedChunks: bigint[] = [];

  for (let i = 0; i < numChunks; i++) {
    let chunkVal = 0n;

    for (let j = 0; j < threshold; j++) {
      const xj = BigInt(activeShards[j].index);
      const yj = BigInt('0x' + activeShards[j].yValues[i]);

      // Compute Lagrange basis polynomial evaluated at x = 0:
      // ell_j(0) = prod_{m != j} (-x_m) / (x_j - x_m) mod p
      let basis = 1n;
      for (let m = 0; m < threshold; m++) {
        if (m === j) continue;
        const xm = BigInt(activeShards[m].index);
        const num = modP(-xm);
        const den = modP(xj - xm);
        const factor = modP(num * invP(den));
        basis = modP(basis * factor);
      }

      const term = modP(yj * basis);
      chunkVal = modP(chunkVal + term);
    }

    reconstructedChunks.push(chunkVal);
  }

  // Reassemble packed payload from 30-byte chunks
  const packed = new Uint8Array(numChunks * CHUNK_SIZE);
  for (let i = 0; i < numChunks; i++) {
    const chunkBytes = bigIntToBytes(reconstructedChunks[i], CHUNK_SIZE);
    packed.set(chunkBytes, i * CHUNK_SIZE);
  }

  // Extract length and checksum: [length (2 bytes) | checksum (4 bytes) | secret bytes]
  if (packed.length < 6) {
    throw new Error('Reconstructed payload too small');
  }

  const secretLen = (packed[0] << 8) | packed[1];
  if (secretLen <= 0 || secretLen > packed.length - 6) {
    throw new Error(
      'Checksum verification failed: reconstructed secret is corrupted or shards were tampered with'
    );
  }

  const extractedChecksumBytes = packed.subarray(2, 6);
  const reconstructedSecret = packed.subarray(6, 6 + secretLen);

  // Checksum verification against extracted checksum and shard header checksum
  const actualHash = sha256(reconstructedSecret);
  const actualChecksumBytes = actualHash.subarray(0, 4);
  const actualChecksumHex = bytesToHex(actualChecksumBytes);

  if (
    bytesToHex(extractedChecksumBytes) !== actualChecksumHex ||
    actualChecksumHex !== expectedChecksum
  ) {
    throw new Error(
      'Checksum verification failed: reconstructed secret is corrupted or shards were tampered with'
    );
  }

  return new Uint8Array(reconstructedSecret);
}

// -----------------------------------------------------------------------------
// Shard Token Serialization
// -----------------------------------------------------------------------------

/**
 * Serializes a SecretShard into a compact portable token string.
 */
export function serializeShard(shard: SecretShard): string {
  const json = JSON.stringify(shard);
  if (typeof btoa !== 'undefined') {
    return `AETH-SHARD-v1-${btoa(json)}`;
  }
  return `AETH-SHARD-v1-${Buffer.from(json, 'utf-8').toString('base64')}`;
}

/**
 * Deserializes a token string back into a SecretShard.
 */
export function deserializeShard(rawToken: string): SecretShard {
  const trimmed = rawToken.trim();
  let jsonStr = trimmed;

  if (trimmed.startsWith('AETH-SHARD-v1-')) {
    const b64 = trimmed.replace('AETH-SHARD-v1-', '');
    if (typeof atob !== 'undefined') {
      jsonStr = atob(b64);
    } else {
      jsonStr = Buffer.from(b64, 'base64').toString('utf-8');
    }
  }

  const parsed = JSON.parse(jsonStr);
  if (
    !parsed ||
    typeof parsed.index !== 'number' ||
    typeof parsed.threshold !== 'number' ||
    !Array.isArray(parsed.yValues) ||
    !parsed.checksum
  ) {
    throw new Error('Invalid SecretShard token format');
  }

  return {
    version: '1.0',
    index: parsed.index,
    threshold: parsed.threshold,
    totalShards: parsed.totalShards,
    yValues: parsed.yValues,
    checksum: parsed.checksum,
  };
}

// -----------------------------------------------------------------------------
// Guardian ECDH / AES-256-GCM Encryption Pipeline
// -----------------------------------------------------------------------------

/**
 * Encrypts a secret shard specifically to a guardian's Ed25519 public key using
 * ECDH (X25519 conversion) and AES-256-GCM.
 *
 * @param shard Shard to encrypt
 * @param guardianPublicKeyHex Ed25519 public key of the guardian (32 bytes hex)
 * @param guardianFingerprint Optional fingerprint of the guardian
 */
export async function encryptShardForGuardian(
  shard: SecretShard,
  guardianPublicKeyHex: string,
  guardianFingerprint?: string
): Promise<EncryptedGuardianShardPackage> {
  const guardianEd25519Pub = hexToBytes(guardianPublicKeyHex.startsWith('0x') ? guardianPublicKeyHex.slice(2) : guardianPublicKeyHex);
  if (guardianEd25519Pub.length !== 32) {
    throw new Error(`Invalid guardian public key length: expected 32 bytes, got ${guardianEd25519Pub.length}`);
  }

  // Convert Guardian's Ed25519 public key to Montgomery X25519 public key
  const guardianX25519Pub = ed25519.utils.toMontgomery(guardianEd25519Pub);

  // Generate ephemeral X25519 keypair
  const ephPriv = x25519.utils.randomPrivateKey();
  const ephPub = x25519.getPublicKey(ephPriv);

  // Compute ECDH shared secret
  const sharedSecret = x25519.getSharedSecret(ephPriv, guardianX25519Pub);

  // Derive AES-256-GCM symmetric key via HKDF-SHA256
  const aesKey = hkdf(
    sha256,
    sharedSecret,
    new Uint8Array(32),
    new TextEncoder().encode('aetheris-social-shard-recovery'),
    32
  );

  const fp = guardianFingerprint || computeFingerprint(guardianEd25519Pub);
  const serializedShard = JSON.stringify(shard);

  const encryptedShard = await E2EEEngine.encrypt(
    serializedShard,
    aesKey,
    shard.threshold,
    fp
  );

  return {
    version: '1.0',
    guardianFingerprint: fp,
    guardianPublicKey: bytesToHex(guardianEd25519Pub),
    ephemeralPublicKey: bytesToHex(ephPub),
    encryptedShard,
    shardIndex: shard.index,
    threshold: shard.threshold,
    totalShards: shard.totalShards,
    timestamp: Date.now(),
  };
}

/**
 * Decrypts a guardian shard package using the guardian's private key.
 *
 * @param pkg The encrypted shard package
 * @param guardianPrivateKeyHex Guardian's 32-byte Ed25519 private key or seed
 */
export async function decryptShardFromGuardian(
  pkg: EncryptedGuardianShardPackage,
  guardianPrivateKeyHex: string
): Promise<SecretShard> {
  const cleanPriv = guardianPrivateKeyHex.startsWith('0x') ? guardianPrivateKeyHex.slice(2) : guardianPrivateKeyHex;
  const guardianEd25519Priv = hexToBytes(cleanPriv);
  if (guardianEd25519Priv.length !== 32) {
    throw new Error(`Invalid guardian private key length: expected 32 bytes, got ${guardianEd25519Priv.length}`);
  }

  // Convert Guardian's Ed25519 private key to Montgomery X25519 private key
  const guardianX25519Priv = ed25519.utils.toMontgomerySecret(guardianEd25519Priv);
  const ephPub = hexToBytes(pkg.ephemeralPublicKey);

  // Recompute identical ECDH shared secret
  const sharedSecret = x25519.getSharedSecret(guardianX25519Priv, ephPub);

  // Derive symmetric key via HKDF
  const aesKey = hkdf(
    sha256,
    sharedSecret,
    new Uint8Array(32),
    new TextEncoder().encode('aetheris-social-shard-recovery'),
    32
  );

  const decryptedJson = await E2EEEngine.decrypt(pkg.encryptedShard, aesKey);
  const shard = JSON.parse(decryptedJson) as SecretShard;

  if (
    !shard ||
    typeof shard.index !== 'number' ||
    typeof shard.threshold !== 'number' ||
    !Array.isArray(shard.yValues) ||
    !shard.checksum
  ) {
    throw new Error('Decrypted payload does not match SecretShard schema');
  }

  return shard;
}

/**
 * Convenience orchestrator to generate full social recovery setup package for a list of guardians.
 */
export async function createSocialRecoveryPackage(
  secret: Uint8Array,
  guardians: Array<{ fingerprint: string; publicKeyHex: string }>,
  threshold: number,
  userFingerprint: string = 'self'
): Promise<SocialRecoverySetupPackage> {
  const totalShards = guardians.length;
  const shards = splitSecretIntoShards(secret, totalShards, threshold);

  const guardianPackages: EncryptedGuardianShardPackage[] = [];
  for (let i = 0; i < totalShards; i++) {
    const guardian = guardians[i];
    const encryptedPkg = await encryptShardForGuardian(
      shards[i],
      guardian.publicKeyHex,
      guardian.fingerprint
    );
    guardianPackages.push(encryptedPkg);
  }

  return {
    version: '1.0',
    userFingerprint,
    threshold,
    totalShards,
    createdAt: Date.now(),
    guardianPackages,
  };
}
