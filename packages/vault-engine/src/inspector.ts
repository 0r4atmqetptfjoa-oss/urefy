export type BinaryFormat = 'PE' | 'ELF' | 'UNKNOWN';
export type HygieneVerdict = 'CLEAN' | 'PACKED' | 'SUSPICIOUS';

export interface BinarySectionInfo {
  name: string;
  virtualSize: number;
  rawSize: number;
  entropy: number;
  isExecutable: boolean;
  isWritable: boolean;
}

export interface BinaryHygieneReport {
  format: BinaryFormat;
  architecture: string;
  overallEntropy: number;
  entropyClassification: 'LOW' | 'NORMAL' | 'SUSPICIOUS_PACKED' | 'ENCRYPTED';
  sections: BinarySectionInfo[];
  anomalies: string[];
  verdict: HygieneVerdict;
}

/**
 * Calculates the exact Shannon Entropy (0.0 to 8.0 bits per byte) of a byte array.
 * Formula: H(X) = -sum(P(x_i) * log2(P(x_i)))
 */
export function calculateShannonEntropy(data: Uint8Array): number {
  if (data.length === 0) return 0;

  const frequencies = new Uint32Array(256);
  for (let i = 0; i < data.length; i++) {
    frequencies[data[i]]++;
  }

  let entropy = 0;
  const len = data.length;
  for (let i = 0; i < 256; i++) {
    if (frequencies[i] > 0) {
      const p = frequencies[i] / len;
      entropy -= p * Math.log2(p);
    }
  }

  return Math.round(entropy * 1000) / 1000;
}

/**
 * Parses Portable Executable (Windows PE32/PE32+) binaries.
 */
function parsePE(data: Uint8Array): {
  architecture: string;
  sections: BinarySectionInfo[];
  anomalies: string[];
} {
  const anomalies: string[] = [];
  const sections: BinarySectionInfo[] = [];

  if (!data || data.length < 0x40 || !data.buffer || data.buffer.byteLength === 0) {
    return { architecture: 'UNKNOWN', sections, anomalies: ['TRUNCATED_DOS_HEADER'] };
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const peOffset = view.getUint32(0x3C, true);
  if (peOffset + 24 > data.length) {
    return { architecture: 'UNKNOWN', sections, anomalies: ['INVALID_PE_OFFSET'] };
  }

  // Check PE Signature: "PE\0\0" (0x50, 0x45, 0x00, 0x00)
  const peSig = view.getUint32(peOffset, false);
  if (peSig !== 0x50450000) {
    return { architecture: 'UNKNOWN', sections, anomalies: ['INVALID_PE_SIGNATURE'] };
  }

  // COFF Header (20 bytes after PE signature)
  const machine = view.getUint16(peOffset + 4, true);
  const numberOfSections = view.getUint16(peOffset + 6, true);
  const sizeOfOptionalHeader = view.getUint16(peOffset + 20, true);

  let architecture = 'x86';
  if (machine === 0x8664) architecture = 'x86_64';
  else if (machine === 0xAA64) architecture = 'ARM64';
  else if (machine === 0x014C) architecture = 'i386';

  // Section Table follows the Optional Header
  const sectionTableOffset = peOffset + 24 + sizeOfOptionalHeader;
  const SECTION_HEADER_SIZE = 40;

  for (let i = 0; i < numberOfSections; i++) {
    const offset = sectionTableOffset + i * SECTION_HEADER_SIZE;
    if (offset + SECTION_HEADER_SIZE > data.length) {
      anomalies.push(`TRUNCATED_SECTION_${i}`);
      break;
    }

    // Name (8 bytes ASCII)
    const nameBytes = data.subarray(offset, offset + 8);
    let name = '';
    for (let b of nameBytes) {
      if (b === 0) break;
      name += String.fromCharCode(b);
    }

    const virtualSize = view.getUint32(offset + 8, true);
    const rawSize = view.getUint32(offset + 16, true);
    const rawPointer = view.getUint32(offset + 20, true);
    const characteristics = view.getUint32(offset + 36, true);

    const isExecutable = (characteristics & 0x20000000) !== 0;
    const isWritable = (characteristics & 0x80000000) !== 0;

    // Check RWX (both writable and executable)
    if (isExecutable && isWritable) {
      anomalies.push(`RWX_SECTION_DETECTED:${name}`);
    }

    // Known packers signature
    const upperName = name.toUpperCase();
    if (upperName.includes('UPX') || upperName.includes('ASPACK') || upperName.includes('THEMIDA')) {
      anomalies.push(`KNOWN_PACKER_SECTION:${name}`);
    }

    // Section entropy
    let sectionEntropy = 0;
    if (rawPointer + rawSize <= data.length && rawSize > 0) {
      const sectionData = data.subarray(rawPointer, rawPointer + rawSize);
      sectionEntropy = calculateShannonEntropy(sectionData);
    }

    sections.push({
      name,
      virtualSize,
      rawSize,
      entropy: sectionEntropy,
      isExecutable,
      isWritable,
    });
  }

  return { architecture, sections, anomalies };
}

/**
 * Parses Linux ELF binaries.
 */
function parseELF(data: Uint8Array): {
  architecture: string;
  sections: BinarySectionInfo[];
  anomalies: string[];
} {
  const anomalies: string[] = [];
  const sections: BinarySectionInfo[] = [];

  if (!data || data.length < 20 || !data.buffer || data.buffer.byteLength === 0) {
    return { architecture: 'UNKNOWN', sections, anomalies: ['TRUNCATED_ELF_HEADER'] };
  }

  const eiClass = data[4]; // 1 = 32-bit, 2 = 64-bit
  const eiData = data[5];  // 1 = Little Endian, 2 = Big Endian
  const isLittle = eiData === 1;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const machine = view.getUint16(18, isLittle);

  let architecture = 'x86';
  if (machine === 0x3E) architecture = 'x86_64';
  else if (machine === 0xB7) architecture = 'AArch64';
  else if (machine === 0x03) architecture = 'i386';

  return { architecture: `${architecture} (${eiClass === 2 ? '64-bit' : '32-bit'})`, sections, anomalies };
}

/**
 * Performs a comprehensive Binary Hygiene Inspection.
 */
export function inspectBinary(data: Uint8Array): BinaryHygieneReport {
  const overallEntropy = calculateShannonEntropy(data);
  let entropyClassification: BinaryHygieneReport['entropyClassification'] = 'NORMAL';

  if (overallEntropy < 2.0) entropyClassification = 'LOW';
  else if (overallEntropy > 7.4) entropyClassification = 'ENCRYPTED';
  else if (overallEntropy > 6.9) entropyClassification = 'SUSPICIOUS_PACKED';

  let format: BinaryFormat = 'UNKNOWN';
  let architecture = 'UNKNOWN';
  let sections: BinarySectionInfo[] = [];
  let anomalies: string[] = [];

  // Check DOS/PE: 'MZ' (0x4D, 0x5A)
  if (data.length >= 2 && data[0] === 0x4D && data[1] === 0x5A) {
    format = 'PE';
    const peInfo = parsePE(data);
    architecture = peInfo.architecture;
    sections = peInfo.sections;
    anomalies = peInfo.anomalies;
  }
  // Check ELF: [0x7F, 'E', 'L', 'F']
  else if (data.length >= 4 && data[0] === 0x7F && data[1] === 0x45 && data[2] === 0x4C && data[3] === 0x46) {
    format = 'ELF';
    const elfInfo = parseELF(data);
    architecture = elfInfo.architecture;
    sections = elfInfo.sections;
    anomalies = elfInfo.anomalies;
  }

  // Determine Final Verdict
  let verdict: HygieneVerdict = 'CLEAN';
  const hasRWX = anomalies.some(a => a.startsWith('RWX_SECTION_DETECTED'));
  const hasPacker = anomalies.some(a => a.startsWith('KNOWN_PACKER_SECTION'));

  if (hasRWX) {
    verdict = 'SUSPICIOUS';
  } else if (hasPacker || entropyClassification === 'ENCRYPTED' || entropyClassification === 'SUSPICIOUS_PACKED') {
    verdict = 'PACKED';
  }

  return {
    format,
    architecture,
    overallEntropy,
    entropyClassification,
    sections,
    anomalies,
    verdict,
  };
}
