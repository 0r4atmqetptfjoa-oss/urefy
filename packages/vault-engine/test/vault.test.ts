import { describe, it, expect } from 'vitest';
import {
  calculateShannonEntropy,
  computeCRC32,
  computeFileChecksums,
  inspectBinary,
  createSwarmManifest,
  reassembleSwarm,
} from '../src/index.js';

describe('Vault Engine & Binary Hygiene', () => {
  describe('Shannon Entropy & Checksums', () => {
    it('calculates accurate entropy for low and high disorder data', () => {
      // 1. Uniform zero data: entropy must be 0
      const zeros = new Uint8Array(1000).fill(0);
      expect(calculateShannonEntropy(zeros)).toBe(0);

      // 2. High disorder / pseudorandom data: entropy must approach 8.0 bits
      const randomData = crypto.getRandomValues(new Uint8Array(4096));
      const entropy = calculateShannonEntropy(randomData);
      expect(entropy).toBeGreaterThan(7.7);
    });

    it('calculates standard IEEE 802.3 CRC32 checksum accurately', () => {
      // Standard CRC32 check vector: "123456789" -> 0xCBF43926
      const testVec = new TextEncoder().encode('123456789');
      const crc = computeCRC32(testVec);
      expect(crc).toBe('CBF43926');
    });

    it('computes combined SHA-256 and CRC-32 metadata', () => {
      const sample = new TextEncoder().encode('Aetheris Clean Binary Payload');
      const meta = computeFileChecksums(sample);
      expect(meta.sha256.length).toBe(64);
      expect(meta.crc32.length).toBe(8);
      expect(meta.byteSize).toBe(sample.length);
    });
  });

  describe('PE Binary Parser & Static Hygiene Inspection', () => {
    it('parses valid PE header and flags suspicious packer sections', () => {
      // Construct a minimal synthetic PE32+ (x86_64) binary buffer
      const buffer = new Uint8Array(512);
      const view = new DataView(buffer.buffer);

      // DOS Header: 'MZ'
      buffer[0] = 0x4d;
      buffer[1] = 0x5a;
      // e_lfanew at 0x3C -> points to offset 0x80
      view.setUint32(0x3c, 0x80, true);

      // PE Signature at 0x80: 'PE\0\0'
      view.setUint32(0x80, 0x50450000, false);

      // COFF Header at 0x84
      view.setUint16(0x84, 0x8664, true); // Machine: x86_64
      view.setUint16(0x86, 2, true);      // NumberOfSections: 2
      view.setUint16(0x94, 0, true);      // SizeOfOptionalHeader: 0

      // Section 1 at 0x84 + 20 = 0x98 (Name: ".text", size: 64, char: Executable)
      const textName = new TextEncoder().encode('.text\0\0\0');
      buffer.set(textName, 0x98);
      view.setUint32(0x98 + 8, 64, true);
      view.setUint32(0x98 + 16, 64, true);
      view.setUint32(0x98 + 36, 0x20000020, true); // IMAGE_SCN_MEM_EXECUTE | CODE

      // Section 2 at 0x98 + 40 = 0xC0 (Name: "UPX0", char: Executable + Writable RWX)
      const upxName = new TextEncoder().encode('UPX0\0\0\0\0');
      buffer.set(upxName, 0xc0);
      view.setUint32(0xc0 + 8, 64, true);
      view.setUint32(0xc0 + 16, 64, true);
      view.setUint32(0xc0 + 36, 0xa0000020, true); // EXECUTE | WRITE (RWX!)

      const report = inspectBinary(buffer);

      expect(report.format).toBe('PE');
      expect(report.architecture).toBe('x86_64');
      expect(report.sections.length).toBe(2);
      expect(report.sections[0].name).toBe('.text');
      expect(report.sections[1].name).toBe('UPX0');
      expect(report.anomalies.some(a => a.includes('RWX_SECTION_DETECTED'))).toBe(true);
      expect(report.anomalies.some(a => a.includes('KNOWN_PACKER_SECTION:UPX0'))).toBe(true);
      expect(report.verdict).toBe('SUSPICIOUS');
    });
  });

  describe('P2P Swarm Chunker & Merkle Reassembly', () => {
    it('chunks file, verifies Merkle tree, and reassembles perfectly', () => {
      // 150 KB test data (spans 3 x 64KB pieces)
      const fileData = new Uint8Array(150 * 1024);
      for (let i = 0; i < fileData.length; i++) {
        fileData[i] = i % 256;
      }

      const { manifest, pieces } = createSwarmManifest(fileData);
      expect(manifest.pieceCount).toBe(3);
      expect(manifest.merkleRoot.length).toBe(64);
      expect(pieces.length).toBe(3);

      // Reassemble
      const reassembled = reassembleSwarm(manifest, pieces);
      expect(reassembled.length).toBe(fileData.length);
      expect(reassembled).toEqual(fileData);
    });

    it('detects and rejects corrupted pieces during swarm reassembly', () => {
      const fileData = new Uint8Array(80 * 1024);
      const { manifest, pieces } = createSwarmManifest(fileData);

      // Corrupt piece 0
      const corruptedPieces = [...pieces];
      const badData = new Uint8Array(corruptedPieces[0].data);
      badData[10] ^= 0xff; // flip byte
      corruptedPieces[0] = { ...corruptedPieces[0], data: badData };

      expect(() => reassembleSwarm(manifest, corruptedPieces)).toThrow(/Corrupt piece detected/);
    });
  });
});
