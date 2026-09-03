import { describe, it, expect } from 'vitest';
import { generateKeyPair, signMessage } from '@aetheris/core-crypto';
import {
  ReputationMerkleTree,
  CollaborativeFileReputationVault,
  scanBinaryForPackers,
  scanPackerSignatures,
  calculateShannonEntropy,
} from '../src/index.js';

describe('Innovation 6: Collaborative File Reputation Vault & UPX Packer Detection', () => {
  describe('ReputationMerkleTree & Cryptographic Verification', () => {
    it('initializes with verified hashes and computes deterministic Merkle root', () => {
      const hash1 = 'a'.repeat(64);
      const hash2 = 'b'.repeat(64);
      const tree = new ReputationMerkleTree([hash1, hash2]);

      expect(tree.getVerifiedCount()).toBe(2);
      expect(tree.hasHash(hash1)).toBe(true);
      expect(tree.hasHash(hash2)).toBe(true);
      expect(tree.hasHash('c'.repeat(64))).toBe(false);

      const root = tree.getRoot();
      expect(root).toBeDefined();
      expect(root.length).toBe(64);
    });

    it('dynamically inserts new verified hashes and produces valid Merkle proofs', () => {
      const tree = new ReputationMerkleTree();
      const h1 = '11'.repeat(32);
      const h2 = '22'.repeat(32);
      const h3 = '33'.repeat(32);

      tree.addVerifiedHash(h1);
      tree.addVerifiedHash(h2);
      tree.addVerifiedHash(h3);

      expect(tree.getVerifiedCount()).toBe(3);
      expect(tree.hasHash(h2)).toBe(true);

      const proof = tree.getProof(h2);
      expect(proof.leaf).toBe(h2);
      expect(proof.root).toBe(tree.getRoot());
      expect(ReputationMerkleTree.prototype.verifyProof.call(tree, proof)).toBe(true);
    });
  });

  describe('CollaborativeFileReputationVault & Consensus Scoring', () => {
    it('aggregates signed verdicts from peers and computes weighted consensus', () => {
      const vault = new CollaborativeFileReputationVault();
      const testSha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const keypair1 = generateKeyPair();
      const keypair2 = generateKeyPair();

      const timestamp = Date.now();
      const payload1 = `${testSha}:CLEAN:0.98:25:${timestamp}`;
      const sig1 = signMessage(payload1, keypair1.privateKey);

      const payload2 = `${testSha}:CLEAN:0.95:15:${timestamp}`;
      const sig2 = signMessage(payload2, keypair2.privateKey);

      // Register signed verdicts
      const registered1 = vault.registerVerdict({
        sha256: testSha,
        verdict: 'CLEAN',
        confidence: 0.98,
        seederCount: 25,
        timestamp,
        nodeId: keypair1.fingerprint,
        nodePublicKeyHex: keypair1.publicKeyHex,
        signature: Array.from(sig1).map((b) => b.toString(16).padStart(2, '0')).join(''),
        entropy: 6.12,
      });
      expect(registered1).toBe(true);

      const registered2 = vault.registerVerdict({
        sha256: testSha,
        verdict: 'CLEAN',
        confidence: 0.95,
        seederCount: 15,
        timestamp,
        nodeId: keypair2.fingerprint,
        nodePublicKeyHex: keypair2.publicKeyHex,
        signature: Array.from(sig2).map((b) => b.toString(16).padStart(2, '0')).join(''),
        entropy: 6.12,
      });
      expect(registered2).toBe(true);

      const consensus = vault.lookupReputation(testSha, 6.12);
      expect(consensus).not.toBeNull();
      expect(consensus!.verdict).toBe('CLEAN');
      expect(consensus!.nodeCount).toBe(2);
      expect(consensus!.isMerkleVerified).toBe(true);
      expect(consensus!.summary).toBe('Verified by 2 sovereign nodes (Entropy 6.12, Clean)');
    });

    it('rejects tampered signatures from rogue peers', () => {
      const vault = new CollaborativeFileReputationVault();
      const testSha = 'f'.repeat(64);
      const kp = generateKeyPair();

      // Signed for CLEAN, but payload claims MALICIOUS
      const timestamp = Date.now();
      const legitSig = signMessage(`${testSha}:CLEAN:0.9:5:${timestamp}`, kp.privateKey);

      const res = vault.registerVerdict({
        sha256: testSha,
        verdict: 'MALICIOUS', // Tampered verdict!
        confidence: 0.9,
        seederCount: 5,
        timestamp,
        nodeId: kp.fingerprint,
        nodePublicKeyHex: kp.publicKeyHex,
        signature: Array.from(legitSig).map((b) => b.toString(16).padStart(2, '0')).join(''),
      });

      expect(res).toBe(false);
      expect(vault.lookupReputation(testSha)).toBeNull();
    });

    it('generates exact instant Merkle lookup revelation string for 40 sovereign nodes', () => {
      const verifiedHash = '4'.repeat(64);
      const vault = new CollaborativeFileReputationVault([verifiedHash]);

      const result = vault.lookupReputation(verifiedHash, 6.12);
      expect(result).not.toBeNull();
      expect(result!.isMerkleVerified).toBe(true);
      expect(result!.summary).toBe('Verified by 40 sovereign nodes (Entropy 6.12, Clean)');
    });
  });

  describe('PE/ELF Binary Parser & UPX Packer Detection', () => {
    it('detects UPX packer section signatures UPX0, UPX1 and !UPX', () => {
      // Construct PE with UPX sections
      const buffer = new Uint8Array(1024);
      const view = new DataView(buffer.buffer);

      // DOS Header 'MZ'
      buffer[0] = 0x4d;
      buffer[1] = 0x5a;
      view.setUint32(0x3c, 0x80, true);

      // PE Signature 'PE\0\0'
      view.setUint32(0x80, 0x50450000, false);
      view.setUint16(0x84, 0x8664, true); // machine x86_64
      view.setUint16(0x86, 3, true);      // 3 sections
      view.setUint16(0x94, 0, true);      // optional header size 0

      // Section 1 at 0x98: UPX0
      const upx0 = new TextEncoder().encode('UPX0\0\0\0\0');
      buffer.set(upx0, 0x98);
      view.setUint32(0x98 + 8, 4096, true);  // virtual size
      view.setUint32(0x98 + 16, 0, true);    // raw size 0 (typical UPX0 decompression buffer)
      view.setUint32(0x98 + 36, 0xe0000080, true); // RWX

      // Section 2 at 0x98 + 40 = 0xC0: UPX1
      const upx1 = new TextEncoder().encode('UPX1\0\0\0\0');
      buffer.set(upx1, 0xc0);
      view.setUint32(0xc0 + 8, 4096, true);
      view.setUint32(0xc0 + 16, 512, true);
      view.setUint32(0xc0 + 20, 0x200, true); // raw pointer
      view.setUint32(0xc0 + 36, 0xe0000040, true);

      // Fill section 2 data at 0x200 with high entropy pseudorandom data
      for (let i = 0x200; i < 0x200 + 512; i++) {
        buffer[i] = (i * 97) % 256;
      }

      // Section 3 at 0x98 + 80 = 0xE8: !UPX
      const notUpx = new TextEncoder().encode('!UPX\0\0\0\0');
      buffer.set(notUpx, 0xe8);

      const report = scanBinaryForPackers(buffer);
      expect(report.format).toBe('PE');
      expect(report.isPacked).toBe(true);
      expect(report.verdict).toBe('PACKED');
      expect(report.packerName).toBe('UPX');
      expect(report.detectedPackerSignatures.some((s) => s.signature === 'UPX0')).toBe(true);
      expect(report.detectedPackerSignatures.some((s) => s.signature === 'UPX1')).toBe(true);
      expect(report.detectedPackerSignatures.some((s) => s.signature === '!UPX')).toBe(true);
    });

    it('scans binary body and finds UPX! or !UPX magic marker', () => {
      const data = new Uint8Array(200);
      data.set([0x55, 0x50, 0x58, 0x21], 50); // UPX! at offset 50

      const matches = scanPackerSignatures(data);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].packer).toBe('UPX');
      expect(matches[0].signature).toBe('UPX!');
      expect(matches[0].location).toContain('0x32');
    });

    it('distinguishes legitimate high entropy in resources from packed executables (eliminates false positives)', () => {
      // Binary has normal .text section with normal code entropy and imports,
      // but has high-entropy .rsrc section (e.g. compressed PNG/fonts)
      const buffer = new Uint8Array(1024);
      const view = new DataView(buffer.buffer);

      // DOS Header
      buffer[0] = 0x4d;
      buffer[1] = 0x5a;
      view.setUint32(0x3c, 0x80, true);

      // PE Header
      view.setUint32(0x80, 0x50450000, false);
      view.setUint16(0x84, 0x8664, true);
      view.setUint16(0x86, 2, true); // 2 sections
      // Optional header size 240 bytes (PE32+)
      view.setUint16(0x94, 240, true);

      // Optional Header Magic at 0x98 (0x020B for PE32+)
      view.setUint16(0x98, 0x020b, true);
      // Import Directory in PE32+ is at 0x98 + 112 + 8 = 0x110
      // Set import RVA = 0x1000, Size = 40 bytes (2 descriptors)
      view.setUint32(0x98 + 120, 0x1000, true);
      view.setUint32(0x98 + 124, 40, true);

      // Section table starts at 0x98 + 240 = 0x188
      const secTable = 0x188;

      // Section 1: .text (Executable, code entropy ~5.8)
      buffer.set(new TextEncoder().encode('.text\0\0\0'), secTable);
      view.setUint32(secTable + 8, 256, true);
      view.setUint32(secTable + 16, 256, true);
      view.setUint32(secTable + 20, 0x200, true);
      view.setUint32(secTable + 36, 0x60000020, true); // IMAGE_SCN_MEM_EXECUTE | READ

      // Fill .text with normal code-like data (entropy ~5.8)
      for (let i = 0x200; i < 0x200 + 256; i++) {
        buffer[i] = (i % 32) + 0x20;
      }

      // Section 2: .rsrc (Non-executable, high entropy ~7.9 e.g. compressed media assets)
      const sec2 = secTable + 40;
      buffer.set(new TextEncoder().encode('.rsrc\0\0\0'), sec2);
      view.setUint32(sec2 + 8, 256, true);
      view.setUint32(sec2 + 16, 256, true);
      view.setUint32(sec2 + 20, 0x300, true);
      view.setUint32(sec2 + 36, 0x40000040, true); // READ | INITIALIZED_DATA (NOT EXECUTABLE!)

      // Fill .rsrc with high entropy data
      for (let i = 0x300; i < 0x300 + 256; i++) {
        buffer[i] = (i * 73 + 17) % 256;
      }

      const report = scanBinaryForPackers(buffer);
      expect(report.format).toBe('PE');
      expect(report.zeroImports).toBe(false);
      expect(report.importCount).toBeGreaterThan(0);
      // High entropy is strictly in non-executable .rsrc!
      expect(report.sections.find((s) => s.name === '.rsrc')?.entropy).toBeGreaterThan(6.8);
      // Should NOT be flagged as packed executable (false positive eliminated)
      expect(report.isPacked).toBe(false);
      expect(report.verdict).toBe('CLEAN');
      expect(report.explanation).toContain('Legitimate compressed binary data/resources');
    });

    it('detects packed executable with zero imports and high-entropy code section', () => {
      const buffer = new Uint8Array(1024);
      const view = new DataView(buffer.buffer);

      // DOS Header
      buffer[0] = 0x4d;
      buffer[1] = 0x5a;
      view.setUint32(0x3c, 0x80, true);

      // PE Header
      view.setUint32(0x80, 0x50450000, false);
      view.setUint16(0x84, 0x8664, true);
      view.setUint16(0x86, 1, true); // 1 section
      view.setUint16(0x94, 240, true);

      // Optional Header Magic (0x020B)
      view.setUint16(0x98, 0x020b, true);
      // Set import RVA = 0, Size = 0 -> ZERO IMPORTS!
      view.setUint32(0x98 + 120, 0, true);
      view.setUint32(0x98 + 124, 0, true);

      // Section table at 0x188
      const secTable = 0x188;
      buffer.set(new TextEncoder().encode('.code\0\0\0'), secTable);
      view.setUint32(secTable + 8, 512, true);
      view.setUint32(secTable + 16, 512, true);
      view.setUint32(secTable + 20, 0x200, true);
      view.setUint32(secTable + 36, 0x60000020, true); // EXECUTABLE

      // Fill with high entropy data
      for (let i = 0x200; i < 0x200 + 512; i++) {
        buffer[i] = (i * 97 + 13) % 256;
      }

      const report = scanBinaryForPackers(buffer);
      expect(report.format).toBe('PE');
      expect(report.zeroImports).toBe(true);
      expect(report.isPacked).toBe(true);
      expect(report.verdict).toBe('PACKED');
      expect(report.explanation).toContain('Packed executable detected: zero imports and high-entropy');
    });
  });
});
