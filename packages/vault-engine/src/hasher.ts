import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

// Precomputed CRC32 lookup table for IEEE 802.3 polynomial (0xEDB88320)
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c >>> 0;
}

export interface FileChecksums {
  sha256: string;
  crc32: string;
  byteSize: number;
}

/**
 * Computes CRC-32 checksum (IEEE 802.3) of a byte array.
 */
export function computeCRC32(bytes: Uint8Array): string {
  let crc = 0 ^ (-1);
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  const result = (crc ^ (-1)) >>> 0;
  return result.toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Computes SHA-256 and CRC-32 of a file or buffer.
 */
export function computeFileChecksums(data: Uint8Array): FileChecksums {
  const hash = sha256(data);
  const sha256Hex = bytesToHex(hash);
  const crc32Hex = computeCRC32(data);

  return {
    sha256: sha256Hex,
    crc32: crc32Hex,
    byteSize: data.length,
  };
}
