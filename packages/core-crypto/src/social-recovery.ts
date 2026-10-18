import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { ed25519, x25519 } from '@noble/curves/ed25519';
import { BN254_SCALAR_FIELD_ORDER } from './zk-snark.js';
import { E2EEEngine, EncryptedEnvelope } from './e2ee.js';
import { computeFingerprint } from './ed25519.js';
import { zeroize, constantTimeHexEqual } from './security.js';

export const SHAMIR_PRIME: bigint = BN254_SCALAR_FIELD_ORDER;

export interface SecretShard {
  version: '1.0';
  index: number;
  threshold: number;
  totalShards: number;
  yValues: string[];
  checksum: string;
}

export interface EncryptedGuardianShardPackage {
  version: '1.0';
  guardianFingerprint: string;
  guardianPublicKey: string;
  ephemeralPublicKey: string;
  encryptedShard: EncryptedEnvelope;
  shardIndex: number;
  threshold: number;
  totalShards: number;
  timestamp: number;
}

export interface SocialRecoverySetupPackage {
  version: '1.0';
  userFingerprint: string;
  threshold: number;
  totalShards: number;
  createdAt: number;
  guardianPackages: EncryptedGuardianShardPackage[];
}

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
    throw new Error('Cryptographically secure PRNG (crypto.getRandomValues) is required');
  }
  let val = 0n;
  for (let i = 0; i < 32; i++) {
    val = (val << 8n) | BigInt(buf[i]);
  }
  zeroize(buf);
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

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  if (typeof btoa !== 'undefined') {
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) {
      chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    }
    return btoa(chunks.join(''));
  }
  return Buffer.from(bytes).toString('base64');
}

function base64ToUtf8(b64: string): string {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  if (typeof atob !== 'undefined') {
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(padded, 'base64').toString('utf-8');
}

export function splitSecretIntoShards(
  secret: Uint8Array,
  totalShards: number,
  threshold: number
): SecretShard[] {
  if (!secret || secret.length === 0) {
    throw new Error('Secret cannot be empty');
  }
  if (!Number.isInteger(threshold) || threshold < 2) {
    throw new Error(`Invalid threshold ${threshold}: must be at least 2`);
  }
  if (!Number.isInteger(totalShards) || totalShards < threshold) {
    throw new Error(`Total shards (${totalShards}) cannot be less than threshold (${threshold})`);
  }
  if (totalShards > 16) {
    throw new Error(`Total shards (${totalShards}) exceeds maximum sovereign limit of 16`);
  }

  const fullHash = sha256(secret);
  const checksumBytes = fullHash.subarray(0, 4);
  const checksumHex = bytesToHex(checksumBytes);

  const secretLen = secret.length;
  if (secretLen > 65535) {
    throw new Error('Secret length exceeds maximum supported size (65535 bytes)');
  }

  const packed = new Uint8Array(2 + 4 + secretLen);
  packed[0] = (secretLen >> 8) & 0xff;
  packed[1] = secretLen & 0xff;
  packed.set(checksumBytes, 2);
  packed.set(secret, 6);

  try {
    const CHUNK_SIZE = 30;
    const numChunks = Math.ceil(packed.length / CHUNK_SIZE);
    const chunkScalars: bigint[] = [];

    for (let i = 0; i < numChunks; i++) {
      const chunkBytes = new Uint8Array(CHUNK_SIZE);
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, packed.length);
      chunkBytes.set(packed.subarray(start, end), 0);
      chunkScalars.push(bytesToBigInt(chunkBytes));
      zeroize(chunkBytes);
    }

    const polynomials: bigint[][] = [];
    for (let i = 0; i < numChunks; i++) {
      const coeffs: bigint[] = [chunkScalars[i]];
      for (let d = 1; d < threshold; d++) {
        coeffs.push(randomFieldScalar(SHAMIR_PRIME));
      }
      polynomials.push(coeffs);
    }

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
  } finally {
    zeroize(packed);
  }
}

export function reconstructSecretFromShards(shards: SecretShard[]): Uint8Array {
  if (!Array.isArray(shards) || shards.length === 0) {
    throw new Error('No shards provided for secret reconstruction');
  }

  const shardMap = new Map<number, SecretShard>();
  for (const s of shards) {
    if (!s || typeof s.index !== 'number' || s.index < 1 || !Array.isArray(s.yValues)) {
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

  for (const s of uniqueShards) {
    if (s.threshold !== threshold || s.yValues.length !== numChunks || s.checksum !== expectedChecksum) {
      throw new Error('Shard parameter mismatch: shards belong to different sharing sessions');
    }
  }

  const activeShards = uniqueShards.slice(0, threshold);
  const CHUNK_SIZE = 30;
  const reconstructedChunks: bigint[] = [];

  for (let i = 0; i < numChunks; i++) {
    let chunkVal = 0n;

    for (let j = 0; j < threshold; j++) {
      const xj = BigInt(activeShards[j].index);
      const yj = BigInt('0x' + activeShards[j].yValues[i]);

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

  const packed = new Uint8Array(numChunks * CHUNK_SIZE);
  try {
    for (let i = 0; i < numChunks; i++) {
      const chunkBytes = bigIntToBytes(reconstructedChunks[i], CHUNK_SIZE);
      packed.set(chunkBytes, i * CHUNK_SIZE);
      zeroize(chunkBytes);
    }

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
    const reconstructedSecret = new Uint8Array(packed.subarray(6, 6 + secretLen));

    const actualHash = sha256(reconstructedSecret);
    const actualChecksumBytes = actualHash.subarray(0, 4);
    const actualChecksumHex = bytesToHex(actualChecksumBytes);

    if (
      !constantTimeHexEqual(bytesToHex(extractedChecksumBytes), actualChecksumHex) ||
      !constantTimeHexEqual(actualChecksumHex, expectedChecksum)
    ) {
      zeroize(reconstructedSecret);
      throw new Error(
        'Checksum verification failed: reconstructed secret is corrupted or shards were tampered with'
      );
    }

    return reconstructedSecret;
  } finally {
    zeroize(packed);
  }
}

export function serializeShard(shard: SecretShard): string {
  const json = JSON.stringify(shard);
  return `AETH-SHARD-v1-${utf8ToBase64(json)}`;
}

export function deserializeShard(rawToken: string): SecretShard {
  const trimmed = rawToken.trim();
  let jsonStr = trimmed;

  if (trimmed.startsWith('AETH-SHARD-v1-')) {
    const b64 = trimmed.slice('AETH-SHARD-v1-'.length);
    jsonStr = base64ToUtf8(b64);
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

export async function encryptShardForGuardian(
  shard: SecretShard,
  guardianPublicKeyHex: string,
  guardianFingerprint?: string
): Promise<EncryptedGuardianShardPackage> {
  const guardianEd25519Pub = hexToBytes(
    guardianPublicKeyHex.startsWith('0x') ? guardianPublicKeyHex.slice(2) : guardianPublicKeyHex
  );
  if (guardianEd25519Pub.length !== 32) {
    throw new Error(`Invalid guardian public key length: expected 32 bytes, got ${guardianEd25519Pub.length}`);
  }

  const guardianX25519Pub = ed25519.utils.toMontgomery(guardianEd25519Pub);
  const ephPriv = x25519.utils.randomPrivateKey();
  const ephPub = x25519.getPublicKey(ephPriv);
  const sharedSecret = x25519.getSharedSecret(ephPriv, guardianX25519Pub);

  try {
    const aesKey = hkdf(
      sha256,
      sharedSecret,
      new Uint8Array(32),
      new TextEncoder().encode('aetheris-social-shard-recovery'),
      32
    );

    try {
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
    } finally {
      zeroize(aesKey);
    }
  } finally {
    zeroize(ephPriv);
    zeroize(sharedSecret);
  }
}

export async function decryptShardFromGuardian(
  pkg: EncryptedGuardianShardPackage,
  guardianPrivateKeyHex: string
): Promise<SecretShard> {
  const cleanPriv = guardianPrivateKeyHex.startsWith('0x')
    ? guardianPrivateKeyHex.slice(2)
    : guardianPrivateKeyHex;
  const guardianEd25519Priv = hexToBytes(cleanPriv);
  if (guardianEd25519Priv.length !== 32) {
    throw new Error(`Invalid guardian private key length: expected 32 bytes, got ${guardianEd25519Priv.length}`);
  }

  const guardianX25519Priv = ed25519.utils.toMontgomerySecret(guardianEd25519Priv);
  const ephPub = hexToBytes(pkg.ephemeralPublicKey);
  const sharedSecret = x25519.getSharedSecret(guardianX25519Priv, ephPub);

  try {
    const aesKey = hkdf(
      sha256,
      sharedSecret,
      new Uint8Array(32),
      new TextEncoder().encode('aetheris-social-shard-recovery'),
      32
    );

    try {
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
    } finally {
      zeroize(aesKey);
    }
  } finally {
    zeroize(guardianEd25519Priv);
    zeroize(guardianX25519Priv);
    zeroize(sharedSecret);
  }
}

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
