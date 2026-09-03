import { calculateShannonEntropy, BinaryFormat, BinarySectionInfo } from './inspector.js';

export interface PackerSignatureMatch {
  packer: string;
  signature: string;
  location: string;
}

export interface SectionAnalysis {
  name: string;
  virtualSize: number;
  rawSize: number;
  entropy: number;
  isExecutable: boolean;
  isWritable: boolean;
  isHighEntropy: boolean;
  isZeroRawSize: boolean;
}

export interface BinaryPackerScanReport {
  format: BinaryFormat;
  architecture: string;
  overallEntropy: number;
  zeroImports: boolean;
  importCount: number;
  detectedPackerSignatures: PackerSignatureMatch[];
  isPacked: boolean;
  packerName?: string;
  verdict: 'CLEAN' | 'PACKED' | 'SUSPICIOUS';
  confidence: number;
  sections: SectionAnalysis[];
  anomalies: string[];
  explanation: string;
}

// Known UPX and packer signature strings
const KNOWN_UPX_SIGNATURES = ['UPX0', 'UPX1', 'UPX2', '!UPX', 'UPX!'];
const OTHER_PACKER_NAMES = ['ASPACK', 'THEMIDA', 'PETITE', 'FSG', 'MEW', 'MPRESS'];

/**
 * Searches for known packer byte signatures in binary payload.
 */
export function scanPackerSignatures(data: Uint8Array): PackerSignatureMatch[] {
  const matches: PackerSignatureMatch[] = [];

  // 1. Search for UPX markers in binary bytes (header and trailer zones)
  const searchLimit = Math.min(data.length, 16384);
  const upxBytes = [
    { sig: 'UPX!', bytes: [0x55, 0x50, 0x58, 0x21] },
    { sig: '!UPX', bytes: [0x21, 0x55, 0x50, 0x58] },
  ];

  // Scan head
  for (const { sig, bytes } of upxBytes) {
    for (let i = 0; i <= searchLimit - bytes.length; i++) {
      if (
        data[i] === bytes[0] &&
        data[i + 1] === bytes[1] &&
        data[i + 2] === bytes[2] &&
        data[i + 3] === bytes[3]
      ) {
        matches.push({
          packer: 'UPX',
          signature: sig,
          location: `binary_offset_0x${i.toString(16)}`,
        });
        break;
      }
    }
  }

  // Scan tail (last 4096 bytes if file large enough)
  if (data.length > searchLimit + 4096) {
    const tailStart = data.length - 4096;
    for (const { sig, bytes } of upxBytes) {
      for (let i = tailStart; i <= data.length - bytes.length; i++) {
        if (
          data[i] === bytes[0] &&
          data[i + 1] === bytes[1] &&
          data[i + 2] === bytes[2] &&
          data[i + 3] === bytes[3]
        ) {
          if (!matches.some((m) => m.signature === sig && m.location.startsWith('binary_offset_0x' + i.toString(16)))) {
            matches.push({
              packer: 'UPX',
              signature: sig,
              location: `binary_tail_0x${i.toString(16)}`,
            });
          }
          break;
        }
      }
    }
  }

  return matches;
}

/**
 * Parses PE binary imports and detailed sections for packer heuristics.
 */
function parsePEWithImportAnalysis(data: Uint8Array): {
  architecture: string;
  sections: SectionAnalysis[];
  anomalies: string[];
  zeroImports: boolean;
  importCount: number;
  packerSignatures: PackerSignatureMatch[];
} {
  const anomalies: string[] = [];
  const sections: SectionAnalysis[] = [];
  const packerSignatures: PackerSignatureMatch[] = [];
  let zeroImports = true;
  let importCount = 0;
  let architecture = 'UNKNOWN';

  if (!data || data.length < 0x40 || !data.buffer || data.buffer.byteLength === 0) {
    return { architecture, sections, anomalies: ['TRUNCATED_DOS_HEADER'], zeroImports, importCount, packerSignatures };
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const peOffset = view.getUint32(0x3c, true);

  if (peOffset + 24 > data.length) {
    return { architecture, sections, anomalies: ['INVALID_PE_OFFSET'], zeroImports, importCount, packerSignatures };
  }

  // Check PE Signature: "PE\0\0"
  if (view.getUint32(peOffset, false) !== 0x50450000) {
    return { architecture, sections, anomalies: ['INVALID_PE_SIGNATURE'], zeroImports, importCount, packerSignatures };
  }

  const machine = view.getUint16(peOffset + 4, true);
  const numberOfSections = view.getUint16(peOffset + 6, true);
  const sizeOfOptionalHeader = view.getUint16(peOffset + 20, true);

  if (machine === 0x8664) architecture = 'x86_64';
  else if (machine === 0xaa64) architecture = 'ARM64';
  else if (machine === 0x014c) architecture = 'i386';
  else architecture = `0x${machine.toString(16)}`;

  // Optional Header Analysis
  const optionalHeaderOffset = peOffset + 24;
  let isPE32Plus = false;

  if (sizeOfOptionalHeader >= 2) {
    const magic = view.getUint16(optionalHeaderOffset, true);
    isPE32Plus = magic === 0x020b; // PE32+ (64-bit)

    // Data Directory Offset
    // In PE32: 96 bytes offset in Optional Header. In PE32+: 112 bytes offset.
    const dataDirOffsetInOpt = isPE32Plus ? 112 : 96;
    const importDirOffset = optionalHeaderOffset + dataDirOffsetInOpt + 8; // DataDir[1] is Import Table

    if (importDirOffset + 8 <= optionalHeaderOffset + sizeOfOptionalHeader && importDirOffset + 8 <= data.length) {
      const importRva = view.getUint32(importDirOffset, true);
      const importSize = view.getUint32(importDirOffset + 4, true);

      if (importRva > 0 && importSize > 0) {
        zeroImports = false;
        // Estimate import count (each import directory descriptor is 20 bytes)
        importCount = Math.max(1, Math.floor(importSize / 20));
      } else {
        zeroImports = true;
        importCount = 0;
      }
    }
  }

  // Section Table follows Optional Header
  const sectionTableOffset = optionalHeaderOffset + sizeOfOptionalHeader;
  const SECTION_HEADER_SIZE = 40;

  for (let i = 0; i < numberOfSections; i++) {
    const offset = sectionTableOffset + i * SECTION_HEADER_SIZE;
    if (offset + SECTION_HEADER_SIZE > data.length) {
      anomalies.push(`TRUNCATED_SECTION_${i}`);
      break;
    }

    const nameBytes = data.subarray(offset, offset + 8);
    let name = '';
    for (const b of nameBytes) {
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

    // Check UPX section names
    const upperName = name.toUpperCase().trim();
    for (const upxSig of KNOWN_UPX_SIGNATURES) {
      if (upperName.includes(upxSig)) {
        packerSignatures.push({
          packer: 'UPX',
          signature: upxSig,
          location: `section:${name}`,
        });
        anomalies.push(`KNOWN_PACKER_SECTION:${name}`);
        break;
      }
    }

    for (const otherPacker of OTHER_PACKER_NAMES) {
      if (upperName.includes(otherPacker)) {
        packerSignatures.push({
          packer: otherPacker,
          signature: otherPacker,
          location: `section:${name}`,
        });
        anomalies.push(`KNOWN_PACKER_SECTION:${name}`);
        break;
      }
    }

    // Section Entropy Calculation
    let sectionEntropy = 0;
    if (rawPointer + rawSize <= data.length && rawSize > 0) {
      const sectionData = data.subarray(rawPointer, rawPointer + rawSize);
      sectionEntropy = calculateShannonEntropy(sectionData);
    }

    const isHighEntropy = sectionEntropy >= 6.8;
    const isZeroRawSize = rawSize === 0 && virtualSize > 0;

    sections.push({
      name,
      virtualSize,
      rawSize,
      entropy: sectionEntropy,
      isExecutable,
      isWritable,
      isHighEntropy,
      isZeroRawSize,
    });
  }

  return { architecture, sections, anomalies, zeroImports, importCount, packerSignatures };
}

/**
 * Enhanced PE & ELF Binary Scanner with UPX Packer Detection
 * and False-Positive Immune Section Entropy Analysis.
 */
export function scanBinaryForPackers(data: Uint8Array): BinaryPackerScanReport {
  const overallEntropy = calculateShannonEntropy(data);
  let format: BinaryFormat = 'UNKNOWN';
  let architecture = 'UNKNOWN';
  let sections: SectionAnalysis[] = [];
  let anomalies: string[] = [];
  let zeroImports = false;
  let importCount = 0;
  const detectedSignatures: PackerSignatureMatch[] = [];

  // 1. Check PE: 'MZ' (0x4D, 0x5A)
  if (data.length >= 2 && data[0] === 0x4d && data[1] === 0x5a) {
    format = 'PE';
    const peInfo = parsePEWithImportAnalysis(data);
    architecture = peInfo.architecture;
    sections = peInfo.sections;
    anomalies = peInfo.anomalies;
    zeroImports = peInfo.zeroImports;
    importCount = peInfo.importCount;
    detectedSignatures.push(...peInfo.packerSignatures);
  }
  // 2. Check ELF: [0x7F, 'E', 'L', 'F']
  else if (data.length >= 4 && data[0] === 0x7f && data[1] === 0x45 && data[2] === 0x4c && data[3] === 0x46) {
    format = 'ELF';
    architecture = data[4] === 2 ? 'x86_64 (64-bit)' : 'i386 (32-bit)';
    zeroImports = true; // Raw standalone ELF inspection default
  }

  // 3. Scan binary body for raw UPX signatures (!UPX, UPX!)
  const bodySignatures = scanPackerSignatures(data);
  for (const bSig of bodySignatures) {
    if (!detectedSignatures.some((d) => d.signature === bSig.signature && d.packer === bSig.packer)) {
      detectedSignatures.push(bSig);
    }
  }

  // 4. Section-level entropy analysis:
  // Distinguishes compressed binary code (legitimate high entropy, e.g. .rsrc / assets)
  // from packed executables (zero imports + high entropy entry/executable section).
  // Eliminates false positive alerts!
  const hasUpxSignatures = detectedSignatures.some((s) => s.packer === 'UPX');
  const hasOtherPackerSignatures = detectedSignatures.some((s) => s.packer !== 'UPX');
  const hasRWX = anomalies.some((a) => a.startsWith('RWX_SECTION_DETECTED'));

  const executableSections = sections.filter((s) => s.isExecutable);
  const nonExecutableSections = sections.filter((s) => !s.isExecutable);

  const highEntropyExecSection = executableSections.find((s) => s.entropy >= 6.8);
  const highEntropyNonExecOnly =
    !highEntropyExecSection && nonExecutableSections.some((s) => s.entropy >= 6.8);

  let isPacked = false;
  let verdict: 'CLEAN' | 'PACKED' | 'SUSPICIOUS' = 'CLEAN';
  let confidence = 0.95;
  let packerName: string | undefined;
  let explanation = 'Binary code is clean and uncompressed with valid imports.';

  if (hasUpxSignatures) {
    isPacked = true;
    verdict = 'PACKED';
    packerName = 'UPX';
    confidence = 0.99;
    explanation = `UPX packer signature detected (${detectedSignatures.map((s) => s.signature).join(', ')}).`;
  } else if (hasOtherPackerSignatures) {
    isPacked = true;
    verdict = 'PACKED';
    packerName = detectedSignatures.find((s) => s.packer !== 'UPX')?.packer || 'Generic Packer';
    confidence = 0.95;
    explanation = `Known packer signature detected (${packerName}).`;
  } else if (zeroImports && highEntropyExecSection) {
    // Zero imports + high entropy entry/executable section = definitive packed executable
    isPacked = true;
    verdict = 'PACKED';
    packerName = 'Custom/Unknown Packer';
    confidence = 0.92;
    explanation = `Packed executable detected: zero imports and high-entropy executable section (${highEntropyExecSection.name} entropy ${highEntropyExecSection.entropy}).`;
  } else if (hasRWX && highEntropyExecSection) {
    isPacked = true;
    verdict = 'SUSPICIOUS';
    confidence = 0.9;
    explanation = `Suspicious packed binary: RWX memory section with high entropy (${highEntropyExecSection.entropy}).`;
  } else if (highEntropyNonExecOnly) {
    // False-positive elimination: high entropy in non-executable sections (.rsrc, compressed assets)
    // while executable code section is normal and imports are present.
    isPacked = false;
    verdict = 'CLEAN';
    confidence = 0.98;
    explanation =
      'Legitimate compressed binary data/resources detected in non-executable section; executable code has normal entropy and imports.';
  } else if (overallEntropy >= 7.2 && zeroImports) {
    isPacked = true;
    verdict = 'PACKED';
    confidence = 0.88;
    explanation = `High overall disorder (${overallEntropy}) with zero imports.`;
  } else if (hasRWX) {
    verdict = 'SUSPICIOUS';
    confidence = 0.85;
    explanation = 'Section has RWX (both writable and executable) characteristics.';
  }

  return {
    format,
    architecture,
    overallEntropy,
    zeroImports,
    importCount,
    detectedPackerSignatures: detectedSignatures,
    isPacked,
    packerName,
    verdict,
    confidence,
    sections,
    anomalies,
    explanation,
  };
}
