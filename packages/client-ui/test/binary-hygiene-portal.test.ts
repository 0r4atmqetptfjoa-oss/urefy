import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateShannonEntropy,
  scanPackerSignatures,
  inspectBinary,
} from '@aetheris/vault-engine';
import {
  BinaryHygienePortal,
  binaryHygienePortal,
} from '../src/binary-hygiene-portal.js';
import {
  onRequestPost as handleScanBinaryPost,
  onRequestGet as handleScanBinaryGet,
  onRequestOptions as handleScanBinaryOptions,
  analyzeBinaryPayload,
} from '../functions/api/scan-binary.js';

// Helper to create a minimal synthetic PE32+ executable
function createSyntheticPE(options: {
  isPacked?: boolean;
  hasRWX?: boolean;
  sectionName?: string;
  payloadEntropy?: 'low' | 'high';
}): Uint8Array {
  const size = 1024;
  const buffer = new Uint8Array(size);

  // 1. DOS Header 'MZ'
  buffer[0] = 0x4d;
  buffer[1] = 0x5a;
  const peOffset = 0x80;
  // Offset to PE Header at 0x3C
  buffer[0x3c] = peOffset;

  // 2. PE Signature: "PE\0\0"
  buffer[peOffset] = 0x50;
  buffer[peOffset + 1] = 0x45;
  buffer[peOffset + 2] = 0x00;
  buffer[peOffset + 3] = 0x00;

  // 3. COFF Header (machine = x86_64: 0x8664, numberOfSections = 1, sizeOfOptionalHeader = 240)
  const view = new DataView(buffer.buffer);
  view.setUint16(peOffset + 4, 0x8664, true); // Machine
  view.setUint16(peOffset + 6, 1, true); // NumberOfSections = 1
  view.setUint16(peOffset + 20, 240, true); // SizeOfOptionalHeader = 240

  // 4. Section Header at peOffset + 24 + 240 = peOffset + 264
  const secOffset = peOffset + 24 + 240;
  const name = options.isPacked ? 'UPX0' : (options.sectionName || '.text');
  for (let i = 0; i < Math.min(name.length, 8); i++) {
    buffer[secOffset + i] = name.charCodeAt(i);
  }

  view.setUint32(secOffset + 8, 512, true); // VirtualSize = 512
  view.setUint32(secOffset + 16, 512, true); // RawSize = 512
  const rawPointer = 512;
  view.setUint32(secOffset + 20, rawPointer, true); // PointerToRawData = 512

  // Characteristics: Executable (0x20000000)
  let chars = 0x20000000;
  if (options.hasRWX) {
    chars |= 0x80000000; // Writable + Executable = RWX
  }
  view.setUint32(secOffset + 36, chars, true);

  // 5. Section Data at rawPointer
  if (options.payloadEntropy === 'high' || options.isPacked) {
    // Fill with high-entropy pseudo-random bytes
    for (let i = rawPointer; i < rawPointer + 512; i++) {
      buffer[i] = (i * 181 + 17) % 256;
    }
  } else {
    // Fill with low-entropy repetitive bytes (e.g. standard x86 NOP sled 0x90)
    for (let i = rawPointer; i < rawPointer + 512; i++) {
      buffer[i] = 0x90;
    }
  }

  // Inject UPX raw signature marker if requested
  if (options.isPacked) {
    buffer[peOffset + 10] = 0x55; // 'U'
    buffer[peOffset + 11] = 0x50; // 'P'
    buffer[peOffset + 12] = 0x58; // 'X'
    buffer[peOffset + 13] = 0x21; // '!'
  }

  return buffer;
}

describe('Pillar 4: Binary Hygiene Free Web Portal & API Suite', () => {
  describe('1. Shannon Entropy Calculations', () => {
    it('should calculate 0.0 entropy for uniform byte arrays', () => {
      const zeros = new Uint8Array(500).fill(0);
      expect(calculateShannonEntropy(zeros)).toBe(0);

      const nops = new Uint8Array(500).fill(0x90);
      expect(calculateShannonEntropy(nops)).toBe(0);
    });

    it('should calculate high entropy (> 7.0 b/B) for random/uniform byte distributions', () => {
      // 256 unique bytes repeated evenly gives max 8.0 bits/byte
      const uniform = new Uint8Array(1024);
      for (let i = 0; i < uniform.length; i++) {
        uniform[i] = i % 256;
      }
      const entropy = calculateShannonEntropy(uniform);
      expect(entropy).toBe(8.0);
    });

    it('should calculate realistic binary code entropy for normal executables (between 1.0 and 6.8 b/B)', () => {
      const code = new Uint8Array([0x55, 0x48, 0x89, 0xe5, 0x48, 0x83, 0xec, 0x10, 0x90, 0x90, 0xc3]);
      const entropy = calculateShannonEntropy(code);
      expect(entropy).toBeGreaterThan(1.0);
      expect(entropy).toBeLessThan(6.0);
    });
  });

  describe('2. Packer Signature & Header Inspection', () => {
    it('should detect UPX! byte signature in binary header and trailer', () => {
      const binary = new Uint8Array(512);
      binary[10] = 0x55; // 'U'
      binary[11] = 0x50; // 'P'
      binary[12] = 0x58; // 'X'
      binary[13] = 0x21; // '!'

      const signatures = scanPackerSignatures(binary);
      expect(signatures.length).toBeGreaterThan(0);
      expect(signatures.some((s) => s.packer === 'UPX' && s.signature === 'UPX!')).toBe(true);
    });

    it('should parse PE headers and detect RWX section anomalies', () => {
      const pe = createSyntheticPE({ hasRWX: true });
      const report = inspectBinary(pe);

      expect(report.format).toBe('PE');
      expect(report.architecture).toBe('x86_64');
      expect(report.sections.length).toBe(1);
      expect(report.sections[0].isExecutable).toBe(true);
      expect(report.sections[0].isWritable).toBe(true);
      expect(report.anomalies.some((a) => a.includes('RWX_SECTION_DETECTED'))).toBe(true);
      expect(report.verdict).toBe('SUSPICIOUS');
    });

    it('should identify UPX packed PE with UPX0 section', () => {
      const packedPE = createSyntheticPE({ isPacked: true });
      const report = inspectBinary(packedPE);

      expect(report.format).toBe('PE');
      expect(report.anomalies.some((a) => a.includes('KNOWN_PACKER_SECTION:UPX0'))).toBe(true);
      expect(report.verdict).toBe('PACKED');
    });
  });

  describe('3. BinaryHygienePortal Component Lifecycle & Scanning', () => {
    let portal: BinaryHygienePortal;

    beforeEach(() => {
      portal = new BinaryHygienePortal();
    });

    it('should handle open, close, and toggle modal states', () => {
      expect(portal.isOpen).toBe(false);
      portal.open();
      expect(portal.isOpen).toBe(true);
      portal.close();
      expect(portal.isOpen).toBe(false);
      portal.toggle();
      expect(portal.isOpen).toBe(true);
      portal.toggle();
      expect(portal.isOpen).toBe(false);
    });

    it('should scan clean synthetic PE binary and produce CLEAN verdict', async () => {
      const cleanPE = createSyntheticPE({ payloadEntropy: 'low' });
      const report = await portal.scanFile(cleanPE, 'clean_demo.exe');

      expect(report.fileName).toBe('clean_demo.exe');
      expect(report.format).toBe('PE');
      expect(report.verdict).toBe('CLEAN');
      expect(report.sha256).toBeDefined();
      expect(report.crc32).toBeDefined();
      expect(report.blockEntropies.length).toBeGreaterThan(0);
      expect(report.auditCertificate.attestationSignature).toContain('SOVEREIGN_ATTESTATION_SHA256');
    });

    it('should scan packed synthetic PE binary and produce PACKED verdict', async () => {
      const packedPE = createSyntheticPE({ isPacked: true, payloadEntropy: 'high' });
      const report = await portal.scanFile(packedPE, 'packed_payload.exe');

      expect(report.fileName).toBe('packed_payload.exe');
      expect(report.verdict).toBe('PACKED');
      expect(report.packerSignatures.some((p) => p.packer === 'UPX')).toBe(true);
    });

    it('should scan suspicious RWX PE binary and produce SUSPICIOUS verdict', async () => {
      const suspiciousPE = createSyntheticPE({ hasRWX: true, payloadEntropy: 'low' });
      const report = await portal.scanFile(suspiciousPE, 'injector.exe');

      expect(report.verdict).toBe('SUSPICIOUS');
      expect(report.anomalies.some((a) => a.includes('RWX_SECTION'))).toBe(true);
    });

    it('should inspect Mach-O 64-bit headers', async () => {
      const macho = new Uint8Array(64);
      macho[0] = 0xfe;
      macho[1] = 0xed;
      macho[2] = 0xfa;
      macho[3] = 0xcf; // 0xFEEDFACF (64-bit Mach-O)

      const report = await portal.scanFile(macho, 'macho_app');
      expect(report.format).toBe('Mach-O');
      expect(report.architecture).toContain('64-bit');
    });

    it('should render modal HTML with dropzone and visual elements when open', async () => {
      portal.open();
      const cleanPE = createSyntheticPE({ payloadEntropy: 'low' });
      await portal.scanFile(cleanPE, 'tool.exe');

      const html = portal.renderModalHTML();
      expect(html).toContain('id="binary-hygiene-backdrop"');
      expect(html).toContain('id="btn-close-binary-hygiene"');
      expect(html).toContain('id="binary-hygiene-dropzone"');
      expect(html).toContain('tool.exe');
      expect(html).toContain('VERDICT: CLEAN');
      expect(html).toContain('Shannon Entropy');
      expect(html).toContain('id="binary-sections-table"');
      expect(html).toContain('id="btn-download-audit-cert"');
    });

    it('should verify window augmentation for binaryHygienePortal', () => {
      expect(binaryHygienePortal).toBeDefined();
      if (typeof window !== 'undefined') {
        expect(window.binaryHygienePortal).toBe(binaryHygienePortal);
        expect(typeof window.__aetheris_open_binary_hygiene).toBe('function');
        expect(typeof window.__aetheris_close_binary_hygiene).toBe('function');
      }
    });
  });

  describe('4. Cloudflare Pages Edge Function (/api/scan-binary)', () => {
    it('should analyze raw binary stream via POST application/octet-stream', async () => {
      const cleanPE = createSyntheticPE({ payloadEntropy: 'low' });
      const request = new Request('https://aetheris.network/api/scan-binary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': 'agent.exe',
        },
        body: cleanPE,
      });

      const response = await handleScanBinaryPost({ request });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.fileName).toBe('agent.exe');
      expect(json.format).toBe('PE');
      expect(json.verdict).toBe('CLEAN');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should analyze binary via POST application/json with dataHex', async () => {
      const packedPE = createSyntheticPE({ isPacked: true });
      const hex = Array.from(packedPE)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const request = new Request('https://aetheris.network/api/scan-binary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'packed.exe',
          dataHex: hex,
        }),
      });

      const response = await handleScanBinaryPost({ request });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.fileName).toBe('packed.exe');
      expect(json.verdict).toBe('PACKED');
      expect(json.packerSignatures.length).toBeGreaterThan(0);
    });

    it('should return 400 for empty payload', async () => {
      const request = new Request('https://aetheris.network/api/scan-binary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await handleScanBinaryPost({ request });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
    });

    it('should return micro-SaaS API docs on GET /api/scan-binary', async () => {
      const response = await handleScanBinaryGet();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.endpoint).toBe('/api/scan-binary');
      expect(json.cost).toContain('0.00 USD');
      expect(json.features.length).toBeGreaterThan(0);
    });

    it('should handle CORS preflight OPTIONS request', async () => {
      const response = await handleScanBinaryOptions();
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('6. Sample Binaries & Modal Action Integration', () => {
    let portal: BinaryHygienePortal;

    beforeEach(() => {
      portal = new BinaryHygienePortal();
    });

    it('should generate valid PE samples for clean, upx, and suspicious types', () => {
      const clean = portal.generateSampleBinary('clean');
      const upx = portal.generateSampleBinary('upx');
      const suspicious = portal.generateSampleBinary('suspicious');

      expect(clean.length).toBe(1024);
      expect(upx.length).toBe(1024);
      expect(suspicious.length).toBe(1024);

      // Verify MZ header on all
      expect(clean[0]).toBe(0x4d);
      expect(clean[1]).toBe(0x5a);
      expect(upx[0]).toBe(0x4d);
      expect(suspicious[0]).toBe(0x4d);
    });

    it('should scan clean sample and yield CLEAN verdict', async () => {
      const report = await portal.scanSampleBinary('clean');
      expect(report.verdict).toBe('CLEAN');
      expect(report.fileName).toBe('sample-clean.exe');
      expect(report.overallEntropy).toBeLessThan(6.8);
      expect(portal.scanReport).toBe(report);
    });

    it('should scan UPX sample and yield PACKED verdict with UPX signature', async () => {
      const report = await portal.scanSampleBinary('upx');
      expect(report.verdict).toBe('PACKED');
      expect(report.fileName).toBe('sample-upx-packed.exe');
      expect(report.packerSignatures.some((p) => p.packer === 'UPX')).toBe(true);
    });

    it('should scan suspicious sample and yield SUSPICIOUS verdict with RWX anomaly', async () => {
      const report = await portal.scanSampleBinary('suspicious');
      expect(report.verdict).toBe('SUSPICIOUS');
      expect(report.fileName).toBe('sample-suspicious-rwx.exe');
      expect(report.anomalies.some((a) => a.includes('RWX_SECTION'))).toBe(true);
    });

    it('should render modal with CSP-compliant action attributes and benchmark buttons', () => {
      portal.open();
      const html = portal.renderModalHTML();

      expect(html).toContain('data-action="trigger-binary-file-select"');
      expect(html).toContain('data-change="scan-binary-file"');
      expect(html).toContain('data-action="scan-sample-clean"');
      expect(html).toContain('data-action="scan-sample-upx"');
      expect(html).toContain('data-action="scan-sample-suspicious"');
      expect(html).toContain('data-action="close-binary-hygiene"');
      expect(html).toContain('data-action="close-binary-hygiene-backdrop"');
    });

    it('should attach dropzone listeners safely', () => {
      expect(() => portal.attachDropzoneListeners()).not.toThrow();
    });
  });
});
