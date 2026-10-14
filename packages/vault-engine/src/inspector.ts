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

  const peSig = view.getUint32(peOffset, false);
  if (peSig !== 0x50450000) {
    return { architecture: 'UNKNOWN', sections, anomalies: ['INVALID_PE_SIGNATURE'] };
  }

  const machine = view.getUint16(peOffset + 4, true);
  const numberOfSections = view.getUint16(peOffset + 6, true);
  const sizeOfOptionalHeader = view.getUint16(peOffset + 20, true);

  let architecture = 'x86';
  if (machine === 0x8664) architecture = 'x86_64';
  else if (machine === 0xAA64) architecture = 'ARM64';
  else if (machine === 0x014C) architecture = 'i386';

  const sectionTableOffset = peOffset + 24 + sizeOfOptionalHeader;
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

    if (isExecutable && isWritable) {
      anomalies.push(`RWX_SECTION_DETECTED:${name}`);
    }

    const upperName = name.toUpperCase();
    if (upperName.includes('UPX') || upperName.includes('ASPACK') || upperName.includes('THEMIDA')) {
      anomalies.push(`KNOWN_PACKER_SECTION:${name}`);
    }

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

function readNullTerminatedAscii(data: Uint8Array, offset: number, maxLen = 64): string {
  if (offset < 0 || offset >= data.length) return '';
  let out = '';
  const end = Math.min(data.length, offset + maxLen);
  for (let i = offset; i < end; i++) {
    const b = data[i];
    if (b === 0) break;
    if (b >= 32 && b <= 126) out += String.fromCharCode(b);
  }
  return out;
}

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
  const eiData = data[5];  // 1 = little-endian, 2 = big-endian
  const is64 = eiClass === 2;
  const isLittle = eiData !== 2;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const machine = view.getUint16(18, isLittle);

  let archBase = 'x86';
  if (machine === 0x3E) archBase = 'x86_64';
  else if (machine === 0xB7) archBase = 'AArch64';
  else if (machine === 0x03) archBase = 'i386';
  else if (machine === 0xF3) archBase = 'RISC-V';

  const architecture = `${archBase} (${is64 ? '64-bit' : '32-bit'})`;

  const minHeaderSize = is64 ? 64 : 52;
  if (data.length < minHeaderSize) {
    return { architecture, sections, anomalies };
  }

  // Parse Program Headers for RWX segments (PF_X = 0x1, PF_W = 0x2)
  const phOff = is64 ? Number(view.getBigUint64(32, isLittle)) : view.getUint32(28, isLittle);
  const phEntSize = view.getUint16(is64 ? 54 : 42, isLittle);
  const phNum = view.getUint16(is64 ? 56 : 44, isLittle);

  if (phOff > 0 && phEntSize >= (is64 ? 56 : 32) && phNum > 0 && phNum <= 128) {
    for (let i = 0; i < phNum; i++) {
      const pOffset = phOff + i * phEntSize;
      if (pOffset + phEntSize > data.length) break;
      const pType = view.getUint32(pOffset, isLittle);
      const pFlags = is64 ? view.getUint32(pOffset + 4, isLittle) : view.getUint32(pOffset + 24, isLittle);
      // PT_LOAD = 1
      if (pType === 1 && (pFlags & 0x1) !== 0 && (pFlags & 0x2) !== 0) {
        anomalies.push(`RWX_SECTION_DETECTED:PT_LOAD_${i}`);
      }
    }
  }

  // Parse Section Headers if available
  const shOff = is64 ? Number(view.getBigUint64(40, isLittle)) : view.getUint32(32, isLittle);
  const shEntSize = view.getUint16(is64 ? 58 : 46, isLittle);
  const shNum = view.getUint16(is64 ? 60 : 48, isLittle);
  const shStrNdx = view.getUint16(is64 ? 62 : 50, isLittle);

  if (shOff > 0 && shEntSize >= (is64 ? 64 : 40) && shNum > 0 && shNum <= 256 && shOff + shNum * shEntSize <= data.length) {
    let shStrTabOffset = 0;
    if (shStrNdx < shNum) {
      const strHdr = shOff + shStrNdx * shEntSize;
      shStrTabOffset = is64
        ? Number(view.getBigUint64(strHdr + 24, isLittle))
        : view.getUint32(strHdr + 16, isLittle);
    }

    for (let i = 0; i < shNum; i++) {
      const sHdr = shOff + i * shEntSize;
      const nameIdx = view.getUint32(sHdr, isLittle);
      const shFlags = is64
        ? Number(view.getBigUint64(sHdr + 8, isLittle))
        : view.getUint32(sHdr + 8, isLittle);
      const rawPointer = is64
        ? Number(view.getBigUint64(sHdr + 24, isLittle))
        : view.getUint32(sHdr + 16, isLittle);
      const rawSize = is64
        ? Number(view.getBigUint64(sHdr + 32, isLittle))
        : view.getUint32(sHdr + 20, isLittle);

      const name = shStrTabOffset > 0
        ? readNullTerminatedAscii(data, shStrTabOffset + nameIdx) || `.sec${i}`
        : `.sec${i}`;

      // SHF_WRITE = 0x1, SHF_EXECINSTR = 0x4
      const isWritable = (shFlags & 0x1) !== 0;
      const isExecutable = (shFlags & 0x4) !== 0;

      if (isExecutable && isWritable) {
        anomalies.push(`RWX_SECTION_DETECTED:${name}`);
      }

      const upperName = name.toUpperCase();
      if (upperName.includes('UPX') || upperName.includes('ASPACK') || upperName.includes('THEMIDA')) {
        anomalies.push(`KNOWN_PACKER_SECTION:${name}`);
      }

      let sectionEntropy = 0;
      if (rawPointer > 0 && rawSize > 0 && rawPointer + rawSize <= data.length) {
        sectionEntropy = calculateShannonEntropy(data.subarray(rawPointer, rawPointer + rawSize));
      }

      sections.push({
        name,
        virtualSize: rawSize,
        rawSize,
        entropy: sectionEntropy,
        isExecutable,
        isWritable,
      });
    }
  }

  return { architecture, sections, anomalies };
}

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

  if (data.length >= 2 && data[0] === 0x4D && data[1] === 0x5A) {
    format = 'PE';
    const peInfo = parsePE(data);
    architecture = peInfo.architecture;
    sections = peInfo.sections;
    anomalies = peInfo.anomalies;
  } else if (data.length >= 4 && data[0] === 0x7F && data[1] === 0x45 && data[2] === 0x4C && data[3] === 0x46) {
    format = 'ELF';
    const elfInfo = parseELF(data);
    architecture = elfInfo.architecture;
    sections = elfInfo.sections;
    anomalies = elfInfo.anomalies;
  }

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
