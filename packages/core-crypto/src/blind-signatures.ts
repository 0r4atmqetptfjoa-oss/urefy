/**
 * @file blind-signatures.ts
 * @package @aetheris/core-crypto
 * @description Complete Chaumian RSA Full-Domain Hash (RSA-FDH) Blind Signature Protocol
 * for 100% unlinkable, anonymous sovereign merit voting and digital cash nullification.
 *
 * Chaumian Blind Signatures mathematically guarantee unconditional sender-vote unlinkability:
 * 1. Voter blinds message hash m with random blinding factor r: m' = (m * r^e) mod N
 * 2. Authority signs blinded hash without seeing m: s' = (m')^d mod N
 * 3. Voter unblinds signature locally: s = (s' * r^-1) mod N
 * 4. Anyone can verify s^e = m mod N without ever knowing r or linking s to the issuance session.
 */

import { sha256 } from '@noble/hashes/sha256';

export interface BlindSignaturePublicKey {
  n: bigint;
  e: bigint;
}

export interface BlindSignaturePrivateKey {
  n: bigint;
  d: bigint;
}

export interface BlindSignatureKeyPair {
  publicKey: BlindSignaturePublicKey;
  privateKey: BlindSignaturePrivateKey;
}

export interface BlindedMessageResult {
  blindedHash: bigint;
  blindingFactor: bigint;
  messageHash: bigint;
}

/** Standard RSA public exponent F4 */
export const RSA_F4 = 65537n;

/**
 * Computes greatest common divisor using Euclidean algorithm.
 */
export function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Computes modular exponentiation: (base^exponent) mod modulus.
 */
export function modExp(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus === 1n) return 0n;
  let res = 1n;
  let b = base % modulus;
  if (b < 0n) b += modulus;
  let exp = exponent;
  while (exp > 0n) {
    if (exp & 1n) {
      res = (res * b) % modulus;
    }
    b = (b * b) % modulus;
    exp >>= 1n;
  }
  return res;
}

/**
 * Computes modular multiplicative inverse using the Extended Euclidean Algorithm.
 * Returns x such that (a * x) mod m = 1.
 */
export function modInverse(a: bigint, m: bigint): bigint {
  let [oldR, r] = [a % m, m];
  let [oldS, s] = [1n, 0n];

  while (r !== 0n) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }

  if (oldR !== 1n) {
    throw new Error('Modular inverse does not exist (inputs are not coprime)');
  }

  return ((oldS % m) + m) % m;
}

/**
 * Generates cryptographically secure random bytes using standard Web Crypto.
 */
function getSecureRandomBytes(byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Fallback for non-standard runtimes
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

/**
 * Generates a random BigInt of exact bit length with top two bits and bottom bit set.
 */
function getRandomCandidateBigInt(bits: number): bigint {
  const byteLen = Math.ceil(bits / 8);
  const bytes = getSecureRandomBytes(byteLen);
  let value = 0n;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  const mask = (1n << BigInt(bits)) - 1n;
  value &= mask;
  // Ensure exact bit length and odd parity
  value |= (1n << BigInt(bits - 1));
  value |= (1n << BigInt(bits - 2));
  value |= 1n;
  return value;
}

/**
 * Small primes table for fast trial division sieving prior to Miller-Rabin tests.
 */
const SMALL_PRIMES: bigint[] = [
  3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n, 53n,
  59n, 61n, 67n, 71n, 73n, 79n, 83n, 89n, 97n, 101n, 103n, 107n, 109n,
  113n, 127n, 131n, 137n, 139n, 149n, 151n, 157n, 163n, 167n, 173n, 179n,
  181n, 191n, 193n, 197n, 199n, 211n, 223n, 227n, 229n, 233n, 239n, 241n,
  251n, 257n, 263n, 269n, 271n, 277n, 281n, 283n, 293n, 307n, 311n, 313n,
];

/**
 * Miller-Rabin probabilistic primality test with small-prime pre-sieving.
 */
export function isProbablePrime(n: bigint, rounds: number = 20): boolean {
  if (n < 2n) return false;
  if (n === 2n || n === 3n) return true;
  if ((n & 1n) === 0n || n % 3n === 0n) return false;

  for (const p of SMALL_PRIMES) {
    if (n % p === 0n) return n === p;
  }

  let s = 0n;
  let d = n - 1n;
  while ((d & 1n) === 0n) {
    s++;
    d >>= 1n;
  }

  const deterministicBases = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  const testBases = [...deterministicBases];

  for (const a of testBases) {
    if (n <= a) break;
    let x = modExp(a, d, n);
    if (x === 1n || x === n - 1n) continue;

    let composite = true;
    for (let r = 1n; r < s; r++) {
      x = (x * x) % n;
      if (x === n - 1n) {
        composite = false;
        break;
      }
    }
    if (composite) return false;
  }

  // Additional random rounds if requested
  for (let i = 0; i < rounds; i++) {
    const randomBytes = getSecureRandomBytes(32);
    let a = 0n;
    for (let j = 0; j < 32; j++) {
      a = (a << 8n) | BigInt(randomBytes[j]);
    }
    a = (a % (n - 4n)) + 2n;
    let x = modExp(a, d, n);
    if (x === 1n || x === n - 1n) continue;

    let composite = true;
    for (let r = 1n; r < s; r++) {
      x = (x * x) % n;
      if (x === n - 1n) {
        composite = false;
        break;
      }
    }
    if (composite) return false;
  }

  return true;
}

/**
 * Generates a random prime number of the specified bit length where gcd(p - 1, e) = 1.
 */
export function generatePrime(bits: number, e: bigint = RSA_F4): bigint {
  while (true) {
    let candidate = getRandomCandidateBigInt(bits);
    while (!isProbablePrime(candidate)) {
      candidate += 2n;
    }
    if ((candidate - 1n) % e !== 0n && gcd(candidate - 1n, e) === 1n) {
      return candidate;
    }
  }
}

/**
 * Generates an RSA keypair for Chaumian Blind Signatures.
 * Modulus N = p * q with public exponent e = 65537n and private exponent d = e^-1 mod phi(N).
 *
 * @param keyBits RSA modulus bit length (e.g. 512 for high-speed tests, 1024 or 2048 for production).
 */
export function generateBlindSignatureKeyPair(keyBits: number = 1024): BlindSignatureKeyPair {
  const effectiveBits = Math.max(keyBits, 256);
  const pBits = Math.floor(effectiveBits / 2);
  const qBits = effectiveBits - pBits;
  const e = RSA_F4;

  const p = generatePrime(pBits, e);
  let q = generatePrime(qBits, e);

  // Ensure p != q and |p - q| is not dangerously small
  const minDiff = 1n << BigInt(Math.max(pBits - 20, 16));
  while (q === p || (p > q ? p - q : q - p) < minDiff) {
    q = generatePrime(qBits, e);
  }

  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  const d = modInverse(e, phi);

  return {
    publicKey: { n, e },
    privateKey: { n, d },
  };
}

/**
 * Maps an arbitrary message or byte array to an element of Z_N* using SHA-256.
 */
export function hashToZStar(message: Uint8Array | string, n: bigint): bigint {
  const bytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const digest = sha256(bytes);

  let hashVal = 0n;
  for (let i = 0; i < digest.length; i++) {
    hashVal = (hashVal << 8n) | BigInt(digest[i]);
  }

  let m = hashVal % n;
  if (m <= 1n) {
    m = 2n;
  }
  while (gcd(m, n) !== 1n) {
    m = (m + 1n) % n;
    if (m <= 1n) m = 2n;
  }

  return m;
}

/**
 * Generates a uniform random blinding factor r in Z_N* such that gcd(r, N) = 1.
 */
export function generateBlindingFactor(n: bigint): bigint {
  const bitLen = n.toString(2).length;
  const byteLen = Math.ceil(bitLen / 8);

  while (true) {
    const bytes = getSecureRandomBytes(byteLen);
    let r = 0n;
    for (let i = 0; i < bytes.length; i++) {
      r = (r << 8n) | BigInt(bytes[i]);
    }
    r = r % n;
    if (r > 1n && gcd(r, n) === 1n) {
      return r;
    }
  }
}

/**
 * Blinds a message payload using the signer's public key:
 * Computes m' = (m * r^e) mod N, where m = H(message) in Z_N* and r is a random blinding factor.
 *
 * @param message The vote payload or token message to blind
 * @param publicKey Signer's RSA public key (N, e)
 */
export function blindMessage(
  message: Uint8Array | string,
  publicKey: BlindSignaturePublicKey
): BlindedMessageResult {
  const messageHash = hashToZStar(message, publicKey.n);
  const blindingFactor = generateBlindingFactor(publicKey.n);
  const rExpE = modExp(blindingFactor, publicKey.e, publicKey.n);
  const blindedHash = (messageHash * rExpE) % publicKey.n;

  return {
    blindedHash,
    blindingFactor,
    messageHash,
  };
}

/**
 * Blinds a message using an explicitly provided blinding factor (useful for deterministic tests).
 */
export function blindMessageWithFactor(
  message: Uint8Array | string,
  blindingFactor: bigint,
  publicKey: BlindSignaturePublicKey
): BlindedMessageResult {
  if (blindingFactor <= 1n || blindingFactor >= publicKey.n || gcd(blindingFactor, publicKey.n) !== 1n) {
    throw new Error('Blinding factor must be coprime to N and in range (1, N)');
  }
  const messageHash = hashToZStar(message, publicKey.n);
  const rExpE = modExp(blindingFactor, publicKey.e, publicKey.n);
  const blindedHash = (messageHash * rExpE) % publicKey.n;

  return {
    blindedHash,
    blindingFactor,
    messageHash,
  };
}

/**
 * Signer generates a blind signature on the blinded hash m':
 * Computes s' = (m')^d mod N.
 * The signer learns zero information about the original message m.
 *
 * @param blindedHash The blinded message hash m'
 * @param privateKey Signer's RSA private key (N, d)
 */
export function signBlindedMessage(
  blindedHash: bigint,
  privateKey: BlindSignaturePrivateKey
): bigint {
  if (blindedHash <= 0n || blindedHash >= privateKey.n) {
    throw new Error('Blinded hash must be within range (0, N)');
  }
  return modExp(blindedHash, privateKey.d, privateKey.n);
}

/**
 * Directly signs a message without blinding (for comparison and oracle verification):
 * Computes s_direct = m^d mod N.
 */
export function directSignMessage(
  message: Uint8Array | string,
  privateKey: BlindSignaturePrivateKey
): bigint {
  const messageHash = hashToZStar(message, privateKey.n);
  return modExp(messageHash, privateKey.d, privateKey.n);
}

/**
 * Unblinds the blind signature s' using the ephemeral blinding factor r:
 * Computes s = (s' * r^-1) mod N.
 *
 * @param blindSignature Blind signature s' received from the signer
 * @param blindingFactor Blinding factor r retained locally by the requester
 * @param publicKey Signer's RSA public key (N, e)
 */
export function unblindSignature(
  blindSignature: bigint,
  blindingFactor: bigint,
  publicKey: BlindSignaturePublicKey
): bigint {
  if (blindSignature <= 0n || blindSignature >= publicKey.n) {
    throw new Error('Blind signature must be within range (0, N)');
  }
  const rInv = modInverse(blindingFactor, publicKey.n);
  return (blindSignature * rInv) % publicKey.n;
}

/**
 * Verifies that the unblinded signature s is a valid signature on the original message:
 * Verifies s^e == m mod N.
 *
 * @param message The original unblinded message or byte array
 * @param signature The unblinded signature s
 * @param publicKey Signer's RSA public key (N, e)
 */
export function verifyBlindSignature(
  message: Uint8Array | string,
  signature: bigint,
  publicKey: BlindSignaturePublicKey
): boolean {
  if (signature <= 0n || signature >= publicKey.n) {
    return false;
  }
  try {
    const messageHash = hashToZStar(message, publicKey.n);
    const recovered = modExp(signature, publicKey.e, publicKey.n);
    return recovered === messageHash;
  } catch {
    return false;
  }
}

/**
 * Serializes a BigInt to a even-length hexadecimal string (without '0x' prefix).
 */
export function bigintToHex(n: bigint): string {
  let hex = n.toString(16);
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  return hex;
}

/**
 * Deserializes a hexadecimal string (with or without '0x' prefix) into a BigInt.
 */
export function hexToBigint(hex: string): bigint {
  const cleaned = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
  if (cleaned.length === 0) return 0n;
  return BigInt('0x' + cleaned);
}
