/**
 * @file security.ts
 * @package @aetheris/core-crypto
 * @description Cryptographic hardening primitives: Constant-time comparisons (mitigating timing attacks)
 * and secure in-memory buffer zeroization.
 */

/**
 * Constant-time byte/string comparison to eliminate side-channel timing attacks.
 * Compares every byte without early return on mismatch.
 */
export function timingSafeEqual(
  a: Uint8Array | string,
  b: Uint8Array | string
): boolean {
  const aBytes = typeof a === 'string' ? new TextEncoder().encode(a) : a;
  const bBytes = typeof b === 'string' ? new TextEncoder().encode(b) : b;

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }

  return diff === 0;
}

/**
 * Constant-time comparison for hexadecimal strings (case-insensitive).
 */
export function constantTimeHexEqual(hexA: string, hexB: string): boolean {
  if (typeof hexA !== 'string' || typeof hexB !== 'string') {
    return false;
  }
  return timingSafeEqual(hexA.toLowerCase(), hexB.toLowerCase());
}

/**
 * Performs best-effort explicit zeroization of application-owned buffers to reduce the lifetime
 * of sensitive key material in memory.
 *
 * Note: In JavaScript runtime environments (V8, WebCrypto, browser engines), physical memory
 * erasure cannot be guaranteed due to garbage collector movements, string immutability,
 * and heap compaction. This helper explicitly zeroes out mutable TypedArrays and ArrayBuffers
 * immediately when their cryptographic lifecycle ends.
 */
export function zeroize(buffer: Uint8Array | ArrayBuffer | number[]): void {
  if (buffer instanceof Uint8Array) {
    buffer.fill(0);
  } else if (buffer instanceof ArrayBuffer) {
    new Uint8Array(buffer).fill(0);
  } else if (Array.isArray(buffer)) {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = 0;
    }
  }
}
