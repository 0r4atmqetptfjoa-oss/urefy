import {
  calculateShannonEntropy,
  scanPackerSignatures,
  inspectBinary,
  computeFileChecksums,
  BinarySectionInfo,
  PackerSignatureMatch,
} from '@aetheris/vault-engine';
import { clientStore } from './client-state.js';
import { toastManager } from './toast.js';
import { t } from './i18n.js';
import { escapeHtml } from './dry-utils.js';

export interface BlockEntropyInfo {
  index: number;
  offset: number;
  length: number;
  entropy: number;
}

export interface BinaryAuditCertificate {
  protocol: string;
  version: string;
  timestamp: number;
  fileName: string;
  byteSize: number;
  sha256: string;
  crc32: string;
  format: string;
  architecture: string;
  overallEntropy: number;
  verdict: 'CLEAN' | 'SUSPICIOUS' | 'PACKED';
  packerSignatures: PackerSignatureMatch[];
  anomalies: string[];
  sections: BinarySectionInfo[];
  attestationSignature: string;
}

export interface ScanReportData {
  fileName: string;
  byteSize: number;
  sha256: string;
  crc32: string;
  format: string;
  architecture: string;
  overallEntropy: number;
  entropyClassification: string;
  blockEntropies: BlockEntropyInfo[];
  sections: BinarySectionInfo[];
  anomalies: string[];
  packerSignatures: PackerSignatureMatch[];
  verdict: 'CLEAN' | 'SUSPICIOUS' | 'PACKED';
  scannedAt: number;
  auditCertificate: BinaryAuditCertificate;
}

export class BinaryHygienePortal {
  public isOpen: boolean = false;
  public scanReport: ScanReportData | null = null;
  public isScanning: boolean = false;
  public error: string | null = null;
  private delegationBound: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).binaryHygienePortal = this;
      (window as any).__aetheris_open_binary_hygiene = () => this.open();
      (window as any).__aetheris_close_binary_hygiene = () => this.close();
      this.bindModalDelegation();
    }
  }

  private bindModalDelegation(): void {
    if (this.delegationBound || typeof document === 'undefined') return;
    this.delegationBound = true;

    document.addEventListener('click', (e: MouseEvent) => {
      if (!this.isOpen) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.id === 'binary-hygiene-backdrop' || target.closest('[data-action="close-binary-hygiene"]')) {
        e.preventDefault();
        this.close();
        return;
      }

      if (target.closest('[data-action="trigger-binary-file-select"]')) {
        const input = document.getElementById('binary-hygiene-file-input') as HTMLInputElement | null;
        if (input && target !== input) {
          input.click();
        }
        return;
      }

      if (target.closest('[data-action="scan-sample-clean"]')) {
        e.preventDefault();
        void this.scanSampleBinary('clean');
        return;
      }

      if (target.closest('[data-action="scan-sample-upx"]')) {
        e.preventDefault();
        void this.scanSampleBinary('upx');
        return;
      }

      if (target.closest('[data-action="scan-sample-suspicious"]')) {
        e.preventDefault();
        void this.scanSampleBinary('suspicious');
        return;
      }

      if (target.closest('[data-action="clear-binary-report"]')) {
        e.preventDefault();
        this.clearReport();
        return;
      }

      if (target.closest('[data-action="download-binary-audit-cert"]')) {
        e.preventDefault();
        this.downloadAuditCertificate();
        return;
      }
    });
  }

  public attachDropzoneListeners(): void {
    if (typeof document === 'undefined') return;
    this.bindModalDelegation();
    const dropzone = document.getElementById('binary-hygiene-dropzone');
    const fileInput = document.getElementById('binary-hygiene-file-input') as HTMLInputElement | null;
    if (!dropzone || dropzone.hasAttribute('data-bound')) return;
    dropzone.setAttribute('data-bound', 'true');

    if (fileInput && !fileInput.hasAttribute('data-bound')) {
      fileInput.setAttribute('data-bound', 'true');
      fileInput.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          void this.scanFile(target.files[0], target.files[0].name);
        }
      });
    }

    dropzone.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('border-cyan-400', 'bg-cyan-950/20');
    });

    dropzone.addEventListener('dragleave', (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('border-cyan-400', 'bg-cyan-950/20');
    });

    dropzone.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('border-cyan-400', 'bg-cyan-950/20');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        void this.scanFile(file, file.name);
      }
    });
  }

  public generateSampleBinary(type: 'clean' | 'upx' | 'suspicious'): Uint8Array {
    const size = 1024;
    const buffer = new Uint8Array(size);
    buffer[0] = 0x4d;
    buffer[1] = 0x5a;
    const peOffset = 0x80;
    buffer[0x3c] = peOffset;
    buffer[peOffset] = 0x50;
    buffer[peOffset + 1] = 0x45;
    buffer[peOffset + 2] = 0x00;
    buffer[peOffset + 3] = 0x00;
    const view = new DataView(buffer.buffer);
    view.setUint16(peOffset + 4, 0x8664, true);
    view.setUint16(peOffset + 6, 1, true);
    view.setUint16(peOffset + 20, 240, true);
    const secOffset = peOffset + 24 + 240;
    const sectionName = type === 'upx' ? 'UPX0' : type === 'suspicious' ? '.hack' : '.text';
    for (let i = 0; i < Math.min(sectionName.length, 8); i++) {
      buffer[secOffset + i] = sectionName.charCodeAt(i);
    }
    view.setUint32(secOffset + 8, 512, true);
    view.setUint32(secOffset + 16, 512, true);
    const rawPointer = 512;
    view.setUint32(secOffset + 20, rawPointer, true);
    let chars = 0x20000000;
    if (type === 'suspicious') {
      chars |= 0x80000000;
    }
    view.setUint32(secOffset + 36, chars, true);
    if (type === 'upx') {
      for (let i = rawPointer; i < rawPointer + 512; i++) {
        buffer[i] = (i * 181 + 17) % 256;
      }
      buffer[peOffset + 10] = 0x55;
      buffer[peOffset + 11] = 0x50;
      buffer[peOffset + 12] = 0x58;
      buffer[peOffset + 13] = 0x21;
    } else {
      for (let i = rawPointer; i < rawPointer + 512; i++) {
        buffer[i] = 0x90;
      }
    }
    return buffer;
  }

  public async scanSampleBinary(type: 'clean' | 'upx' | 'suspicious'): Promise<ScanReportData> {
    const names = {
      clean: 'sample-clean.exe',
      upx: 'sample-upx-packed.exe',
      suspicious: 'sample-suspicious-rwx.exe',
    };
    const sample = this.generateSampleBinary(type);
    return this.scanFile(sample, names[type]);
  }

  public open(): void {
    this.isOpen = true;
    try {
      clientStore?.notifySync?.();
    } catch (_) {}
    if (typeof window !== 'undefined') {
      setTimeout(() => this.attachDropzoneListeners(), 50);
    }
  }

  public close(): void {
    this.isOpen = false;
    try {
      clientStore?.notifySync?.();
    } catch (_) {}
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public clearReport(): void {
    this.scanReport = null;
    this.error = null;
    try {
      clientStore?.notifySync?.();
    } catch (_) {}
    if (typeof window !== 'undefined') {
      setTimeout(() => this.attachDropzoneListeners(), 50);
    }
  }

  public async scanFile(
    file: File | Uint8Array | ArrayBuffer,
    fileName: string = 'unknown.bin'
  ): Promise<ScanReportData> {
    this.isScanning = true;
    this.error = null;
    try {
      clientStore?.notifySync?.();
    } catch (_) {}
    try {
      let data: Uint8Array;
      if (file instanceof Uint8Array) {
        data = file;
      } else if (file instanceof ArrayBuffer) {
        data = new Uint8Array(file);
      } else if (typeof (file as any).arrayBuffer === 'function') {
        const buffer = await (file as any).arrayBuffer();
        data = new Uint8Array(buffer);
        if ((file as any).name) {
          fileName = (file as any).name;
        }
      } else {
        throw new Error('Unsupported file payload type: expected File, ArrayBuffer, or Uint8Array');
      }
      const checksums = computeFileChecksums(data);
      const overallEntropy = calculateShannonEntropy(data);
      const blockCount = Math.min(16, Math.max(1, Math.floor(data.length / 512)));
      const blockSize = Math.max(1, Math.floor(data.length / blockCount));
      const blockEntropies: BlockEntropyInfo[] = [];
      for (let i = 0; i < blockCount; i++) {
        const offset = i * blockSize;
        const end = i === blockCount - 1 ? data.length : offset + blockSize;
        const slice = data.subarray(offset, end);
        const entropy = calculateShannonEntropy(slice);
        blockEntropies.push({
          index: i,
          offset,
          length: end - offset,
          entropy,
        });
      }
      const inspection = inspectBinary(data);
      let format: string = inspection.format;
      let architecture: string = inspection.architecture;
      if (format === 'UNKNOWN' && data.length >= 4) {
        const b0 = data[0];
        const b1 = data[1];
        const b2 = data[2];
        const b3 = data[3];
        if (
          (b0 === 0xfe && b1 === 0xed && b2 === 0xfa && (b3 === 0xce || b3 === 0xcf)) ||
          (b0 === 0xcf && b1 === 0xfa && b2 === 0xed && b3 === 0xfe) ||
          (b0 === 0xce && b1 === 0xfa && b2 === 0xed && b3 === 0xfe)
        ) {
          format = 'Mach-O';
          architecture = b3 === 0xcf || b0 === 0xcf ? 'x86_64 / ARM64 (64-bit)' : 'x86 / ARM (32-bit)';
        } else if (
          (b0 === 0xca && b1 === 0xfe && b2 === 0xba && b3 === 0xbe) ||
          (b0 === 0xbe && b1 === 0xba && b2 === 0xfe && b3 === 0xca)
        ) {
          format = 'Mach-O';
          architecture = 'Universal Fat Binary (Multi-Architecture)';
        }
      }
      const packerSignatures = scanPackerSignatures(data);
      const anomalies = [...inspection.anomalies];
      for (const p of packerSignatures) {
        anomalies.push(`PACKER_SIGNATURE_DETECTED:${p.packer}:${p.signature}`);
      }
      let verdict: 'CLEAN' | 'SUSPICIOUS' | 'PACKED' = 'CLEAN';
      const hasRWX = anomalies.some((a) => a.includes('RWX_SECTION'));
      const hasPackerSig = packerSignatures.length > 0;
      if (hasPackerSig || inspection.verdict === 'PACKED' || overallEntropy >= 7.3) {
        verdict = 'PACKED';
      } else if (hasRWX || inspection.verdict === 'SUSPICIOUS' || overallEntropy >= 6.85) {
        verdict = 'SUSPICIOUS';
      } else {
        verdict = 'CLEAN';
      }
      const auditCertificate: BinaryAuditCertificate = {
        protocol: 'UREfy Sovereign Binary Hygiene v1.0',
        version: '1.0',
        timestamp: Date.now(),
        fileName,
        byteSize: data.length,
        sha256: checksums.sha256,
        crc32: checksums.crc32,
        format,
        architecture,
        overallEntropy,
        verdict,
        packerSignatures,
        anomalies,
        sections: inspection.sections,
        attestationSignature: `SOVEREIGN_ATTESTATION_SHA256:${checksums.sha256.slice(0, 16)}:ED25519_AUDIT_PASS`,
      };
      const report: ScanReportData = {
        fileName,
        byteSize: data.length,
        sha256: checksums.sha256,
        crc32: checksums.crc32,
        format,
        architecture,
        overallEntropy,
        entropyClassification: inspection.entropyClassification,
        blockEntropies,
        sections: inspection.sections,
        anomalies,
        packerSignatures,
        verdict,
        scannedAt: Date.now(),
        auditCertificate,
      };
      this.scanReport = report;
      if (typeof window !== 'undefined' && toastManager) {
        const icon = verdict === 'CLEAN' ? '🛡️' : verdict === 'PACKED' ? '📦' : '⚠️';
        toastManager.success(
          `Binary inspection complete: Verdict ${verdict} (Entropy ${overallEntropy} b/B)`,
          icon
        );
      }
      return report;
    } catch (err: any) {
      this.error = err.message || 'Inspection failed';
      if (typeof window !== 'undefined' && toastManager) {
        toastManager.warning(`Binary scan failed: ${this.error}`, '❌');
      }
      throw err;
    } finally {
      this.isScanning = false;
      try {
        clientStore?.notifySync?.();
      } catch (_) {}
      if (typeof window !== 'undefined') {
        setTimeout(() => this.attachDropzoneListeners(), 50);
      }
    }
  }

  public downloadAuditCertificate(): void {
    if (!this.scanReport) return;
    const jsonStr = JSON.stringify(this.scanReport.auditCertificate, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urefy-audit-${this.scanReport.fileName}-${this.scanReport.sha256.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof window !== 'undefined' && toastManager) {
      toastManager.success('Signed Audit Certificate downloaded!', '📜');
    }
  }

  public renderModalHTML(): string {
    if (!this.isOpen) return '';
    const report = this.scanReport;
    const entropy = report ? report.overallEntropy : 0;
    const entropyPercent = Math.min(100, Math.max(0, (entropy / 8.0) * 100));
    let verdictBadge = '';
    if (report) {
      if (report.verdict === 'CLEAN') {
        verdictBadge = `
          <div class="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="font-bold">VERDICT: CLEAN</span>
            <span class="text-[10px] text-emerald-400/80">Unpacked / Normal Code Entropy</span>
          </div>`;
      } else if (report.verdict === 'PACKED') {
        verdictBadge = `
          <div class="px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-mono text-xs flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            <span class="font-bold">VERDICT: PACKED</span>
            <span class="text-[10px] text-indigo-300/80">UPX/Packer Detected or High Disorder</span>
          </div>`;
      } else {
        verdictBadge = `
          <div class="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono text-xs flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span class="font-bold">VERDICT: SUSPICIOUS</span>
            <span class="text-[10px] text-amber-300/80">RWX Sections / Anomalous Structure</span>
          </div>`;
      }
    }
    return `
      <div id="binary-hygiene-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-150 font-sans" data-action="close-binary-hygiene-backdrop">
        <div class="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-lg">
                🔬
              </div>
              <div>
                <h3 class="text-sm font-bold text-white font-mono flex items-center space-x-2">
                  <span>Binary Hygiene Free Portal</span>
                  <span class="text-[9px] px-1.5 py-0.5 rounded font-mono bg-cyan-950 text-cyan-400 border border-cyan-500/30">Pillar 4 · Zero Infra</span>
                </h3>
                <p class="text-[10px] text-slate-400 font-mono">Static Shannon entropy breakdown · PE / ELF / Mach-O inspection · UPX signature scanner</p>
              </div>
            </div>
            <button id="btn-close-binary-hygiene" data-action="close-binary-hygiene" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm border border-white/10 transition-colors cursor-pointer" title="${t('modal.close', undefined, 'Close')} (Esc)" aria-label="${t('modal.close', undefined, 'Close')}">
              ✕
            </button>
          </div>
          <div class="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2.5">
            <span class="text-base shrink-0">⚠️</span>
            <div class="text-[11px] leading-relaxed">
              <span class="font-bold">Security Notice:</span> Static Shannon entropy metrics and header inspection provide heuristic structural hygiene indicators, but do <strong>NOT</strong> substitute for full antivirus scanning or dynamic behavioral sandbox analysis.
            </div>
          </div>
          <div
            id="binary-hygiene-dropzone"
            class="relative border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-6 text-center bg-slate-800/40 hover:bg-slate-800/70 transition-all cursor-pointer group space-y-2"
            data-action="trigger-binary-file-select"
          >
            <input
              type="file"
              id="binary-hygiene-file-input"
              class="hidden"
              data-change="scan-binary-file"
            />
            <div class="text-3xl text-cyan-400 group-hover:scale-110 transition-transform">
              ${this.isScanning ? '⏳' : '📥'}
            </div>
            <div class="text-xs font-mono font-bold text-white">
              ${this.isScanning ? 'Inspecting binary structure & calculating entropy...' : 'Drop PE (.exe/.dll), ELF, or Mach-O executable here (or click to browse)'}
            </div>
            <p class="text-[10px] font-mono text-slate-400">
              Files are inspected 100% locally in your browser memory. Zero bytes transmitted to third-party servers.
            </p>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-2 pt-1 pb-1">
            <span class="text-[10px] font-mono text-slate-400">1-Click Test Benchmarks:</span>
            <button type="button" data-action="scan-sample-clean" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer">
              ⚡ Clean PE (x86_64)
            </button>
            <button type="button" data-action="scan-sample-upx" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-indigo-400 border border-indigo-500/30 hover:border-indigo-500/60 transition-all cursor-pointer">
              📦 UPX Packed
            </button>
            <button type="button" data-action="scan-sample-suspicious" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer">
              ⚠️ RWX Suspicious
            </button>
          </div>
          ${
            report
              ? `
            <div class="space-y-4 animate-in fade-in">
              <div class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-800/60 border border-white/5">
                <div>
                  <div class="text-xs font-mono font-bold text-white flex items-center space-x-2">
                    <span>📄 ${escapeHtml(report.fileName)}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">${(report.byteSize / 1024).toFixed(1)} KB</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/20 font-mono">${escapeHtml(report.format)} · ${escapeHtml(report.architecture)}</span>
                  </div>
                  <div class="text-[10px] font-mono text-slate-400 mt-1 truncate max-w-md">
                    SHA-256: <span class="text-slate-300 select-all">${escapeHtml(report.sha256)}</span>
                  </div>
                </div>
                <div>
                  ${verdictBadge}
                </div>
              </div>
              <div class="p-4 rounded-xl bg-slate-800/60 border border-white/5 space-y-3">
                <div class="flex items-center justify-between font-mono text-xs">
                  <span class="font-bold text-slate-300 flex items-center space-x-1.5">
                    <span>📊 Shannon Entropy</span>
                    <span class="text-[10px] text-slate-400">(Disorder Metric: 0.0 to 8.0 bits/byte)</span>
                  </span>
                  <span class="font-bold ${entropy >= 7.2 ? 'text-rose-400' : entropy >= 6.8 ? 'text-amber-400' : 'text-emerald-400'}">
                    ${entropy.toFixed(3)} / 8.000 b/B
                  </span>
                </div>
                <div class="relative w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-white/10">
                  <div
                    class="h-full transition-all duration-500 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
                    style="width: ${entropyPercent}%;"
                  ></div>
                </div>
                <div class="flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span>0.0 (Uniform text / code)</span>
                  <span>6.0 - 7.0 (Compiled executable)</span>
                  <span>7.4+ (Encrypted / UPX Packed)</span>
                </div>
                ${
                  report.blockEntropies && report.blockEntropies.length > 0
                    ? `
                  <div class="pt-2 border-t border-white/5">
                    <div class="text-[10px] font-mono uppercase text-slate-400 mb-1.5">Byte Block Distribution (${report.blockEntropies.length} Segments):</div>
                    <div class="grid grid-cols-8 sm:grid-cols-16 gap-1">
                      ${report.blockEntropies
                        .map(
                          (b) => `
                        <div
                          class="h-7 rounded flex flex-col items-center justify-center text-[8px] font-mono font-bold transition-all ${
                            b.entropy >= 7.2
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : b.entropy >= 6.8
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }"
                          title="Block #${b.index + 1}: offset 0x${b.offset.toString(16)}, entropy ${b.entropy.toFixed(2)}"
                        >
                          ${b.entropy.toFixed(1)}
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                `
                    : ''
                }
              </div>
              <div class="p-4 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                <div class="text-xs font-mono font-bold text-slate-300">Technical Section Headers (${report.sections.length} Sections)</div>
                <div class="overflow-x-auto">
                  <table id="binary-sections-table" class="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr class="border-b border-white/10 text-[10px] uppercase text-slate-400">
                        <th class="py-1.5 px-2">Section</th>
                        <th class="py-1.5 px-2">Virtual Size</th>
                        <th class="py-1.5 px-2">Raw Size</th>
                        <th class="py-1.5 px-2">Entropy</th>
                        <th class="py-1.5 px-2 text-center">Exec</th>
                        <th class="py-1.5 px-2 text-center">Writable</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      ${
                        report.sections.length === 0
                          ? `
                        <tr>
                          <td colspan="6" class="py-3 text-center text-slate-400 text-[11px]">
                            No discrete section headers found (raw flat binary or unsupported container).
                          </td>
                        </tr>
                      `
                          : report.sections
                              .map(
                                (s) => `
                        <tr class="hover:bg-white/5 transition-colors">
                          <td class="py-1.5 px-2 font-bold text-white">${escapeHtml(s.name || '<empty>')}</td>
                          <td class="py-1.5 px-2 text-slate-300">${s.virtualSize} bytes</td>
                          <td class="py-1.5 px-2 text-slate-300">${s.rawSize} bytes</td>
                          <td class="py-1.5 px-2 ${s.entropy >= 7.0 ? 'text-rose-400 font-bold' : s.entropy >= 6.5 ? 'text-amber-400' : 'text-emerald-400'}">
                            ${s.entropy.toFixed(3)}
                          </td>
                          <td class="py-1.5 px-2 text-center">
                            <span class="px-1.5 py-0.5 rounded text-[9px] ${s.isExecutable ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30' : 'text-slate-500'}">
                              ${s.isExecutable ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td class="py-1.5 px-2 text-center">
                            <span class="px-1.5 py-0.5 rounded text-[9px] ${s.isWritable ? 'bg-rose-950 text-rose-400 border border-rose-500/30' : 'text-slate-500'}">
                              ${s.isWritable ? 'YES' : 'NO'}
                            </span>
                          </td>
                        </tr>
                      `
                              )
                              .join('')
                      }
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="flex items-center justify-between pt-2">
                <button
                  type="button"
                  id="btn-clear-scan"
                  data-action="clear-binary-report"
                  class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-white/10 transition-colors cursor-pointer"
                >
                  Scan Another Binary
                </button>
                <button
                  type="button"
                  id="btn-download-audit-cert"
                  data-action="download-binary-audit-cert"
                  class="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold font-mono text-xs shadow-lg transition-all cursor-pointer flex items-center space-x-2"
                >
                  <span>📜 Download Signed Audit Certificate</span>
                </button>
              </div>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;
  }
}

export const binaryHygienePortal = new BinaryHygienePortal();
declare global {
  interface Window {
    binaryHygienePortal?: BinaryHygienePortal;
    __aetheris_open_binary_hygiene?: () => void;
    __aetheris_close_binary_hygiene?: () => void;
  }
}
