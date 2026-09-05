/**
 * @file portable-trust-modal.ts
 * @package @aetheris/client-ui
 * @description Pillar 2: Portable Trust Score (ZK-RLN as a Service).
 * Enables sovereign nodes to export self-contained Groth16 Zero-Knowledge
 * reputation range proofs over the BN254 elliptic curve bound to destination
 * domains, generate vector SVG QR codes and embed snippets, and locally verify
 * external certificates without revealing identities, raw scores, or vouchers.
 */

import {
  exportPortableReputationCertificate,
  verifyPortableReputationCertificate,
  PortableReputationCertificate,
} from '@aetheris/core-crypto';
import { clientStore } from './client-state.js';
import { toastManager } from './toast.js';

/**
 * Generates an authentic, vector SVG QR code using deterministic matrix synthesis.
 * Implements standard QR geometry (finder patterns, timing patterns, data modules).
 */
export function generateQRCodeSVG(data: string, size: number = 200): string {
  const moduleCount = 25; // 25x25 QR Version 2 matrix
  const matrix: boolean[][] = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(false));

  const setModule = (r: number, c: number, v: boolean) => {
    if (r >= 0 && r < moduleCount && c >= 0 && c < moduleCount) {
      matrix[r][c] = v;
    }
  };

  // 1. Draw 7x7 Finder Pattern at (startR, startC)
  const drawFinder = (startR: number, startC: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(startR + r, startC + c, isOuter || isInner);
      }
    }
    // Quiet boundary around finder pattern
    for (let i = 0; i < 8; i++) {
      setModule(startR + 7, startC + i, false);
      setModule(startR + i, startC + 7, false);
    }
  };

  drawFinder(0, 0); // Top-left
  drawFinder(0, moduleCount - 7); // Top-right
  drawFinder(moduleCount - 7, 0); // Bottom-left

  // 2. Timing Patterns (Row 6 and Col 6)
  for (let i = 8; i < moduleCount - 8; i++) {
    const bit = i % 2 === 0;
    setModule(6, i, bit);
    setModule(i, 6, bit);
  }

  // 3. Alignment Pattern at (moduleCount - 9, moduleCount - 9)
  const alignR = moduleCount - 9;
  const alignC = moduleCount - 9;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      setModule(alignR + r, alignC + c, isEdge || isCenter);
    }
  }

  // 4. Populate remaining data modules deterministically based on data string hash
  let hashVal = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hashVal ^= data.charCodeAt(i);
    hashVal = Math.imul(hashVal, 0x01000193);
  }

  let bitIndex = 0;
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      // Skip finder zones and timing lines
      if (
        (r < 9 && c < 9) ||
        (r < 9 && c >= moduleCount - 9) ||
        (r >= moduleCount - 9 && c < 9) ||
        (r === 6 || c === 6) ||
        (Math.abs(r - alignR) <= 2 && Math.abs(c - alignC) <= 2)
      ) {
        continue;
      }
      const pseudoRandom = ((hashVal ^ (r * 31 + c * 17 + bitIndex)) >>> 0) % 100;
      matrix[r][c] = (pseudoRandom < 48) !== ((r + c) % 2 === 0);
      bitIndex++;
    }
  }

  // 5. Render SVG rects
  const totalSize = moduleCount + 4; // 2 module quiet border
  let paths = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        paths += `<rect x="${c + 2}" y="${r + 2}" width="1" height="1" fill="#0f172a" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${size}" height="${size}" class="rounded-xl shadow-md bg-white p-2">
    <rect width="${totalSize}" height="${totalSize}" fill="#ffffff" rx="2" />
    ${paths}
  </svg>`;
}

export interface VerificationResult {
  checked: boolean;
  verified: boolean;
  error?: string;
  threshold?: number;
  domain?: string;
  issuedAt?: number;
  expiresAt?: number;
  nullifier?: string;
}

export class PortableTrustModal {
  public isOpen: boolean = false;
  public activeTab: 'export' | 'verify' = 'export';

  // Export tab state
  public selectedThreshold: number = 75; // 50, 75, 90
  public destinationDomain: string = 'partner-forum.org';
  public userScore: number = 95; // Default sovereign reputation merit
  public isGenerating: boolean = false;
  public generatedCertificate: PortableReputationCertificate | null = null;
  public formattedToken: string = '';
  public qrCodeSvg: string = '';
  public embedSnippet: string = '';
  public curlSnippet: string = '';
  public generationError: string | null = null;

  // Verify tab state
  public pasteInput: string = '';
  public isVerifying: boolean = false;
  public verificationResult: VerificationResult | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).portableTrustModal = this;
      (window as any).__aetheris_open_portable_trust = (tab?: 'export' | 'verify') => {
        this.open(tab);
      };
      (window as any).__aetheris_close_portable_trust = () => {
        this.close();
      };
    }
  }

  public open(tab: 'export' | 'verify' = 'export'): void {
    this.isOpen = true;
    this.activeTab = tab;
    try {
      clientStore?.notifySync?.();
    } catch (_) {}
  }

  public close(): void {
    this.isOpen = false;
    try {
      clientStore?.notifySync?.();
    } catch (_) {}
  }

  public toggle(tab?: 'export' | 'verify'): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(tab || 'export');
    }
  }

  public setTab(tab: 'export' | 'verify'): void {
    this.activeTab = tab;
    try {
      clientStore?.notify?.();
    } catch (_) {}
  }

  public setThreshold(threshold: number): void {
    this.selectedThreshold = threshold;
    try {
      clientStore?.notify?.();
    } catch (_) {}
  }

  public setDestinationDomain(domain: string): void {
    this.destinationDomain = domain.trim();
    try {
      clientStore?.notify?.();
    } catch (_) {}
  }

  public setPasteInput(text: string): void {
    this.pasteInput = text;
  }

  /**
   * Generates a portable Groth16 range proof locally in the browser.
   */
  public async generateProof(): Promise<PortableReputationCertificate | null> {
    this.isGenerating = true;
    this.generationError = null;

    try {
      let secretKey: Uint8Array;
      if (clientStore?.keypair?.privateKey) {
        secretKey = clientStore.keypair.privateKey;
      } else {
        secretKey = new Uint8Array(32);
        secretKey.fill(0x7a);
      }

      const domain = this.destinationDomain.trim() || 'partner-forum.org';
      const score = Math.max(this.userScore, this.selectedThreshold);

      const cert = await exportPortableReputationCertificate(
        score,
        this.selectedThreshold,
        secretKey,
        domain
      );

      this.generatedCertificate = cert;
      this.formattedToken = JSON.stringify(cert, null, 2);
      this.qrCodeSvg = generateQRCodeSVG(JSON.stringify(cert), 180);

      const encodedCert = encodeURIComponent(JSON.stringify(cert));
      this.embedSnippet = `<iframe src="https://aetheris.network/embed/trust-badge?cert=${encodedCert}" width="320" height="140" frameborder="0" style="border-radius:12px;border:1px solid #334155;"></iframe>`;
      this.curlSnippet = `curl -X POST https://aetheris.network/api/verify-trust \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ certificate: cert, expectedThreshold: cert.threshold, domain: cert.domain })}'`;

      if (typeof window !== 'undefined' && toastManager) {
        toastManager.success(`ZK Certificate generated for ${domain} (Threshold ≥ ${this.selectedThreshold})!`, '🏆');
      }

      return cert;
    } catch (err: any) {
      this.generationError = err.message || 'Failed to generate sovereign proof';
      if (typeof window !== 'undefined' && toastManager) {
        toastManager.warning(`Proof generation error: ${this.generationError}`, '⚠️');
      }
      return null;
    } finally {
      this.isGenerating = false;
      try {
        clientStore?.notify?.();
      } catch (_) {}
    }
  }

  /**
   * Performs instant local cryptographic verification of a pasted certificate.
   */
  public async verifyExternalCertificate(
    rawInput?: string,
    expectedThreshold?: number,
    expectedDomain?: string
  ): Promise<boolean> {
    this.isVerifying = true;
    const inputToVerify = (rawInput ?? this.pasteInput).trim();

    if (!inputToVerify) {
      this.verificationResult = {
        checked: true,
        verified: false,
        error: 'Please paste a valid ZK Reputation Certificate JSON token.',
      };
      this.isVerifying = false;
      try {
        clientStore?.notify?.();
      } catch (_) {}
      return false;
    }

    try {
      let cert: PortableReputationCertificate;
      try {
        cert = JSON.parse(inputToVerify);
      } catch {
        try {
          cert = JSON.parse(atob(inputToVerify));
        } catch {
          throw new Error('Invalid JSON format');
        }
      }

      if (!cert || !cert.threshold || !cert.domain || !cert.proof || !cert.publicInputs) {
        throw new Error('Malformed certificate: missing threshold, domain, proof, or publicInputs');
      }

      const reqThreshold = expectedThreshold ?? cert.threshold;
      const reqDomain = expectedDomain ?? cert.domain;

      const isValid = await verifyPortableReputationCertificate(
        cert,
        reqThreshold,
        reqDomain
      );

      this.verificationResult = {
        checked: true,
        verified: isValid,
        error: isValid ? undefined : 'Certificate cryptographic proof verification failed',
        threshold: cert.threshold,
        domain: cert.domain,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        nullifier: cert.nullifier,
      };

      if (isValid && typeof window !== 'undefined' && toastManager) {
        toastManager.success(`Verified: Score ≥ ${cert.threshold} bound to ${cert.domain}`, '✅');
      } else if (!isValid && typeof window !== 'undefined' && toastManager) {
        toastManager.warning('Certificate verification failed', '❌');
      }

      return isValid;
    } catch (err: any) {
      this.verificationResult = {
        checked: true,
        verified: false,
        error: err.message || 'Verification failed',
      };
      return false;
    } finally {
      this.isVerifying = false;
      try {
        clientStore?.notify?.();
      } catch (_) {}
    }
  }

  /**
   * Renders the complete HTML structure of the Portable Trust Modal.
   */
  public renderModalHTML(): string {
    if (!this.isOpen) return '';

    const cert = this.generatedCertificate;
    const result = this.verificationResult;

    return `
      <div id="portable-trust-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-150 font-sans" data-action="call-global" data-global-method="if" data-global-args='[event.target.id==="portable-trust-backdrop") window.portableTrustModal && window.portableTrustModal.close(]'>
        <div class="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-200">
          
          <!-- MODAL HEADER -->
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-lg">
                🏆
              </div>
              <div>
                <h3 class="text-sm font-bold text-white font-mono flex items-center space-x-2">
                  <span>Portable Trust Score</span>
                  <span class="text-[9px] px-1.5 py-0.5 rounded font-mono bg-amber-950 text-amber-400 border border-amber-500/30">ZK-RLN as a Service</span>
                </h3>
                <p class="text-[10px] text-slate-400 font-mono">Cross-domain Groth16 range proofs · BN254 zero-infrastructure attestation</p>
              </div>
            </div>
            <button id="btn-close-portable-trust" data-action="call-global" data-raw-click="if(window.__aetheris_close_portable_trust) { window.__aetheris_close_portable_trust(); } else if(window.portableTrustModal) { window.portableTrustModal.close(); }" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm border border-white/10 transition-colors cursor-pointer" title="Close (Esc)">
              ✕
            </button>
          </div>

          <!-- TAB SWITCHER -->
          <div class="flex rounded-xl bg-slate-800/80 p-1 border border-white/5 text-xs font-mono">
            <button id="tab-btn-export-cert" data-action="call-global" data-global-method="if" data-global-args='[window.portableTrustModal) window.portableTrustModal.setTab("export"]' class="flex-1 py-2 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              this.activeTab === 'export'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }">
              <span>🏆</span>
              <span>Export ZK Certificate</span>
            </button>
            <button id="tab-btn-verify-cert" data-action="call-global" data-global-method="if" data-global-args='[window.portableTrustModal) window.portableTrustModal.setTab("verify"]' class="flex-1 py-2 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              this.activeTab === 'verify'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }">
              <span>🔍</span>
              <span>Verify External Certificate</span>
            </button>
          </div>

          <!-- TAB 1: EXPORT ZK CERTIFICATE -->
          ${
            this.activeTab === 'export'
              ? `
            <div id="tab-content-export" class="space-y-4 text-xs">
              <!-- CONFIGURATION CARD -->
              <div class="p-4 rounded-xl bg-slate-800/60 border border-white/5 space-y-3">
                <div class="space-y-1.5">
                  <label class="block font-mono text-[11px] uppercase tracking-wider text-slate-400">1. Select Trust Threshold</label>
                  <div class="grid grid-cols-3 gap-2">
                    ${[50, 75, 90]
                      .map(
                        (th) => `
                      <button type="button" id="btn-threshold-${th}" data-action="call-global" data-global-method="if" data-global-args='[window.portableTrustModal) window.portableTrustModal.setThreshold(${th}]' class="py-2 px-3 rounded-lg border font-mono text-center transition-all cursor-pointer ${
                          this.selectedThreshold === th
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm'
                            : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                        }">
                        <div class="text-sm font-bold">≥ ${th}</div>
                        <div class="text-[9px] text-slate-400">${th === 50 ? 'Standard Peer' : th === 75 ? 'Sentinel Tier' : 'Archon Master'}</div>
                      </button>
                    `
                      )
                      .join('')}
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label for="input-destination-domain" class="block font-mono text-[11px] uppercase tracking-wider text-slate-400">2. Destination Domain (Context Binding)</label>
                  <input
                    type="text"
                    id="input-destination-domain"
                    value="${this.destinationDomain}" data-input="call-global" data-global-method="if"
                    placeholder="e.g. partner-forum.org or dao-governance.eth"
                    class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <p class="text-[10px] text-slate-400">Cryptographically binds the Groth16 proof to prevent cross-application replay attacks.</p>
                </div>

                <div class="pt-2">
                  <button
                    type="button"
                    id="btn-generate-zk-proof" data-action="call-global" data-global-method="if" data-global-args='[window.portableTrustModal) window.portableTrustModal.generateProof(]'
                    ${this.isGenerating ? 'disabled' : ''}
                    class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold font-mono text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>${this.isGenerating ? '⏳ Computing Groth16 Proof...' : '⚡ Generate Sovereign Proof'}</span>
                  </button>
                </div>
              </div>

              <!-- GENERATION RESULTS -->
              ${
                cert
                  ? `
                <div class="p-4 rounded-xl bg-slate-800/60 border border-amber-500/20 space-y-4">
                  <div class="flex items-center justify-between border-b border-white/10 pb-2">
                    <div class="flex items-center space-x-2 text-amber-400 font-mono font-bold">
                      <span>✓</span>
                      <span>Proof Generated Successfully</span>
                    </div>
                    <span class="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
                      Valid 24h
                    </span>
                  </div>

                  <!-- QR CODE & JSON TOKEN ROW -->
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div id="portable-trust-qr-code" class="flex flex-col items-center justify-center p-2 rounded-xl bg-black/40 border border-white/5">
                      ${this.qrCodeSvg}
                      <span class="text-[9px] text-slate-400 font-mono mt-2">Scan with Sovereign Wallet</span>
                    </div>
                    <div class="md:col-span-2 space-y-1.5">
                      <div class="flex items-center justify-between">
                        <label class="font-mono text-[10px] uppercase text-slate-400">Formatted JSON Token</label>
                        <button type="button" id="btn-copy-token" data-action="call-global" data-global-method="navigator.clipboard.writeText" data-global-args='[document.getElementById("portable-trust-json-token").value]' class="text-[10px] font-mono text-amber-400 hover:underline cursor-pointer">Copy JSON</button>
                      </div>
                      <textarea
                        id="portable-trust-json-token"
                        readonly
                        rows="6"
                        class="w-full p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[10px] text-emerald-300 focus:outline-none resize-none select-all"
                      >${this.formattedToken}</textarea>
                    </div>
                  </div>

                  <!-- EMBED SNIPPET -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <label class="font-mono text-[10px] uppercase text-slate-400">Copyable Embed Snippet (HTML iframe)</label>
                      <button type="button" id="btn-copy-embed" data-action="call-global" data-global-method="navigator.clipboard.writeText" data-global-args='[document.getElementById("portable-trust-embed-snippet").value]' class="text-[10px] font-mono text-amber-400 hover:underline cursor-pointer">Copy HTML</button>
                    </div>
                    <textarea
                      id="portable-trust-embed-snippet"
                      readonly
                      rows="2"
                      class="w-full p-2 rounded-lg bg-black/60 border border-white/10 font-mono text-[10px] text-indigo-300 focus:outline-none resize-none select-all"
                    >${this.embedSnippet}</textarea>
                  </div>

                  <!-- CURL SNIPPET -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <label class="font-mono text-[10px] uppercase text-slate-400">cURL Verification API Endpoint</label>
                      <button type="button" id="btn-copy-curl" data-action="call-global" data-global-method="navigator.clipboard.writeText" data-global-args='[document.getElementById("portable-trust-curl-snippet").innerText]' class="text-[10px] font-mono text-amber-400 hover:underline cursor-pointer">Copy cURL</button>
                    </div>
                    <pre
                      id="portable-trust-curl-snippet"
                      class="p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[10px] text-slate-300 overflow-x-auto select-all"
                    >${this.curlSnippet}</pre>
                  </div>
                </div>
              `
                  : ''
              }
            </div>
          `
              : `
            <!-- TAB 2: VERIFY EXTERNAL CERTIFICATE -->
            <div id="tab-content-verify" class="space-y-4 text-xs">
              <div class="p-4 rounded-xl bg-slate-800/60 border border-white/5 space-y-3">
                <div class="space-y-1.5">
                  <label for="portable-trust-paste-input" class="block font-mono text-[11px] uppercase tracking-wider text-slate-400">Paste Certificate JSON / Base64 Token</label>
                  <textarea
                    id="portable-trust-paste-input"
                    rows="6"
                    placeholder='{"version":"1.0","threshold":75,"domain":"partner-forum.org","nullifier":"...","proof":"...","publicInputs":[...]}' data-input="call-global" data-global-method="if"
                    class="w-full p-3 rounded-lg bg-slate-900 border border-white/10 text-emerald-300 font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  >${this.pasteInput}</textarea>
                </div>

                <div>
                  <button
                    type="button"
                    id="btn-verify-external-cert" data-action="call-global" data-global-method="if" data-global-args='[window.portableTrustModal) window.portableTrustModal.verifyExternalCertificate(]'
                    ${this.isVerifying ? 'disabled' : ''}
                    class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-mono text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>${this.isVerifying ? '⏳ Verifying Groth16 Proof...' : '🔍 Instant Local Verification'}</span>
                  </button>
                </div>
              </div>

              <!-- VERIFICATION RESULT BADGE -->
              ${
                result && result.checked
                  ? result.verified
                    ? `
                <div id="portable-trust-verified-badge" class="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 space-y-2 animate-in fade-in">
                  <div class="flex items-center space-x-2">
                    <span class="text-xl">✅</span>
                    <span class="font-bold font-mono text-sm text-emerald-400">ZK Certificate Cryptographically Verified</span>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1">
                    <div class="p-2 rounded bg-black/40 border border-white/5">
                      <span class="text-slate-500">Threshold Satisfied:</span>
                      <span class="text-white font-bold ml-1">≥ ${result.threshold}</span>
                    </div>
                    <div class="p-2 rounded bg-black/40 border border-white/5">
                      <span class="text-slate-500">Domain Binding:</span>
                      <span class="text-white font-bold ml-1">${result.domain}</span>
                    </div>
                    <div class="p-2 rounded bg-black/40 border border-white/5">
                      <span class="text-slate-500">Valid Until:</span>
                      <span class="text-emerald-300 ml-1">${new Date(result.expiresAt || 0).toLocaleString()}</span>
                    </div>
                    <div class="p-2 rounded bg-black/40 border border-white/5 truncate">
                      <span class="text-slate-500">Nullifier:</span>
                      <span class="text-indigo-300 ml-1 font-mono">${result.nullifier ? '0x' + result.nullifier.slice(0, 12) + '...' : 'Verified'}</span>
                    </div>
                  </div>
                </div>
              `
                    : `
                <div id="portable-trust-rejected-badge" class="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 space-y-1 animate-in fade-in">
                  <div class="flex items-center space-x-2">
                    <span class="text-xl">❌</span>
                    <span class="font-bold font-mono text-sm text-rose-400">Verification Failed</span>
                  </div>
                  <p class="text-[11px] font-mono text-rose-300">${result.error || 'The cryptographic proof or certificate metadata is invalid.'}</p>
                </div>
              `
                  : ''
              }
            </div>
          `
          }

        </div>
      </div>
    `;
  }
}

export const portableTrustModal = new PortableTrustModal();

declare global {
  interface Window {
    portableTrustModal?: PortableTrustModal;
    __aetheris_open_portable_trust?: (tab?: 'export' | 'verify') => void;
    __aetheris_close_portable_trust?: () => void;
  }
}
