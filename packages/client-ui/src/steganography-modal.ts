/**
 * AETHERIS HYBRID SUITE - SOVEREIGN STEGANOGRAPHY MODAL
 * Cryptographic E2EE Pixel Canvas Steganography (LSB PNG Steganography).
 *
 * Conceals secret text, seed backups, and encrypted credentials inside PNG image pixels.
 * Zero visual degradation, airgapped cold backup protection, and instant sovereign recovery.
 */

import { clientStore } from './client-state.js';
import { toastManager } from './toast.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import {
  encodeSteganography,
  decodeSteganography,
  calculateImageCapacity,
  canvasToPngBlob,
  fileToCanvas,
} from './steganography.js';

export interface ModalStatus {
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export class SovereignSteganographyModal {
  public isOpen: boolean = false;
  public activeTab: 'encode' | 'decode' = 'encode';

  // Encode Tab State
  public encodeCanvas: HTMLCanvasElement | null = null;
  public encodePreviewUrl: string | null = null;
  public encodeImageWidth: number = 0;
  public encodeImageHeight: number = 0;
  public encodeSecretPayload: string = '';
  public encodePassphrase: string = '';
  public isEncoding: boolean = false;
  public encodedBlobUrl: string | null = null;
  public encodeStatus: ModalStatus | null = null;

  // Decode Tab State
  public decodeCanvas: HTMLCanvasElement | null = null;
  public decodePreviewUrl: string | null = null;
  public decodePassphrase: string = '';
  public isDecoding: boolean = false;
  public revealedPayload: string | null = null;
  public isPayloadEncrypted: boolean = false;
  public decodeStatus: ModalStatus | null = null;

  public openModal(tab: 'encode' | 'decode' = 'encode'): void {
    this.isOpen = true;
    this.activeTab = tab;
    this.encodeStatus = null;
    this.decodeStatus = null;
    clientStore.notify();
  }

  public closeModal(): void {
    this.isOpen = false;
    clientStore.notify();
  }

  /**
   * Generates a synthetic procedural sovereign gradient image if user has no image file.
   */
  public generateProceduralCanvas(width: number = 512, height: number = 512): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Cosmic sovereign radial gradient
      const grad = ctx.createRadialGradient(
        width / 2, height / 2, 20,
        width / 2, height / 2, width / 1.4
      );
      grad.addColorStop(0, '#1e1b4b');    // Deep indigo
      grad.addColorStop(0.35, '#0f172a'); // Slate obsidian
      grad.addColorStop(0.7, '#022c22');  // Emerald cipher
      grad.addColorStop(1, '#050505');    // Cosmic void
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle geometric cipher lattice
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    return canvas;
  }

  public async setEncodeSourceFromCanvas(canvas: HTMLCanvasElement): Promise<void> {
    this.encodeCanvas = canvas;
    this.encodeImageWidth = canvas.width;
    this.encodeImageHeight = canvas.height;
    if (this.encodePreviewUrl) {
      URL.revokeObjectURL(this.encodePreviewUrl);
    }
    const blob = await canvasToPngBlob(canvas);
    this.encodePreviewUrl = URL.createObjectURL(blob);
    this.encodeStatus = {
      text: `Carrier canvas ready (${canvas.width}×${canvas.height}px, capacity: ${(calculateImageCapacity(canvas.width, canvas.height) / 1024).toFixed(1)} KB)`,
      type: 'info',
    };
    this.encodedBlobUrl = null;
    clientStore.notify();
  }

  public async handleEncodeImageUpload(file: File): Promise<void> {
    try {
      const canvas = await fileToCanvas(file);
      await this.setEncodeSourceFromCanvas(canvas);
      toastManager.info(`Carrier image loaded: ${canvas.width}×${canvas.height}px`, '🖼️');
    } catch (err: any) {
      this.encodeStatus = {
        text: `Failed to load carrier image: ${err?.message || 'Unknown error'}`,
        type: 'error',
      };
      clientStore.notify();
    }
  }

  public async handleDecodeImageUpload(file: File): Promise<void> {
    try {
      const canvas = await fileToCanvas(file);
      this.decodeCanvas = canvas;
      if (this.decodePreviewUrl) {
        URL.revokeObjectURL(this.decodePreviewUrl);
      }
      const blob = await canvasToPngBlob(canvas);
      this.decodePreviewUrl = URL.createObjectURL(blob);
      this.revealedPayload = null;
      this.decodeStatus = {
        text: `Stego-carrier image loaded (${canvas.width}×${canvas.height}px). Enter passphrase if encrypted and click Reveal.`,
        type: 'info',
      };
      clientStore.notify();
      toastManager.info('Candidate image loaded for steganographic scan', '🔍');
    } catch (err: any) {
      this.decodeStatus = {
        text: `Failed to load stego image: ${err?.message || 'Unknown error'}`,
        type: 'error',
      };
      clientStore.notify();
    }
  }

  public async executeEncode(): Promise<void> {
    if (!this.encodeCanvas) {
      // Auto generate procedural canvas if user did not provide an image
      this.encodeCanvas = this.generateProceduralCanvas(512, 512);
      this.encodeImageWidth = 512;
      this.encodeImageHeight = 512;
    }

    const payload = this.encodeSecretPayload.trim();
    if (!payload) {
      this.encodeStatus = { text: 'Secret payload cannot be empty', type: 'warning' };
      clientStore.notify();
      return;
    }

    const capacity = calculateImageCapacity(this.encodeImageWidth, this.encodeImageHeight);
    const estimatedNeededBytes = new TextEncoder().encode(payload).length + 45; // Overhead for IV, salt, tags

    if (estimatedNeededBytes > capacity) {
      this.encodeStatus = {
        text: `Payload too large for carrier image (${estimatedNeededBytes} bytes needed vs ${capacity} bytes available). Use larger canvas or shorter payload.`,
        type: 'error',
      };
      clientStore.notify();
      return;
    }

    this.isEncoding = true;
    this.encodeStatus = { text: 'Encoding steganographic pixels with 2-bit LSB modulation...', type: 'info' };
    clientStore.notify();

    try {
      const stegoCanvas = await encodeSteganography(
        this.encodeCanvas,
        payload,
        this.encodePassphrase.trim() || undefined
      );

      const blob = await canvasToPngBlob(stegoCanvas);
      if (this.encodedBlobUrl) {
        URL.revokeObjectURL(this.encodedBlobUrl);
      }
      this.encodedBlobUrl = URL.createObjectURL(blob);
      this.encodeCanvas = stegoCanvas;

      this.encodeStatus = {
        text: `Successfully encoded payload (${payload.length} chars) into lossless PNG! Ready for sovereign export.`,
        type: 'success',
      };
      toastManager.success('Steganographic PNG synthesized successfully!', '🛡️');
    } catch (err: any) {
      this.encodeStatus = {
        text: `Encoding error: ${err?.message || 'Steganography synthesis failed'}`,
        type: 'error',
      };
      toastManager.error(err?.message || 'Steganography error', '⚠️');
    } finally {
      this.isEncoding = false;
      clientStore.notify();
    }
  }

  public async executeDecode(): Promise<void> {
    if (!this.decodeCanvas) {
      this.decodeStatus = { text: 'Please select or drag & drop a PNG image to inspect', type: 'warning' };
      clientStore.notify();
      return;
    }

    this.isDecoding = true;
    this.decodeStatus = { text: 'Scanning pixel buffer for sovereign magic signature...', type: 'info' };
    this.revealedPayload = null;
    clientStore.notify();

    try {
      const result = await decodeSteganography(
        this.decodeCanvas,
        this.decodePassphrase.trim() || undefined
      );

      this.revealedPayload = result.payload;
      this.isPayloadEncrypted = result.isEncrypted;
      this.decodeStatus = {
        text: result.isEncrypted
          ? 'Authenticated & decrypted AES-256-GCM steganographic payload successfully!'
          : 'Extracted sovereign plaintext steganographic payload successfully!',
        type: 'success',
      };
      toastManager.success('Sovereign payload recovered from image pixels!', '🔓');
    } catch (err: any) {
      this.decodeStatus = {
        text: `${err?.message || 'Steganography decoding failed'}`,
        type: 'error',
      };
      toastManager.warning(err?.message || 'Steganography decode error', '⚠️');
    } finally {
      this.isDecoding = false;
      clientStore.notify();
    }
  }

  public downloadEncodedImage(): void {
    if (!this.encodedBlobUrl) {
      toastManager.warning('No encoded stego image generated yet', '⚠️');
      return;
    }
    const a = document.createElement('a');
    a.href = this.encodedBlobUrl;
    a.download = `aetheris-stego-backup-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toastManager.success('Stego-PNG image downloaded to local disk', '💾');
  }

  public copyRevealedPayload(): void {
    if (!this.revealedPayload) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.revealedPayload).then(() => {
        toastManager.success('Revealed payload copied to clipboard!', '📋');
      }).catch(() => {
        toastManager.info('Select and copy revealed payload text manually', 'ℹ️');
      });
    }
  }

  public populateFromMnemonic(): void {
    if (!clientStore.mnemonic) {
      toastManager.warning('No active mnemonic seed found in client session', '⚠️');
      return;
    }
    this.encodeSecretPayload = clientStore.mnemonic;
    toastManager.info('Inserted sovereign identity seed phrase into stego payload', '🔑');
    clientStore.notify();
  }

  public restoreIdentityFromRevealed(): void {
    if (!this.revealedPayload) return;
    const clean = this.revealedPayload.trim().toLowerCase();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length !== 12 && words.length !== 24) {
      toastManager.warning(`Payload is not a valid 12 or 24 word mnemonic (detected ${words.length} words)`, '⚠️');
      return;
    }
    const success = clientStore.restoreIdentityFromMnemonic(clean);
    if (success) {
      toastManager.success('Sovereign identity restored from steganographic recovery PNG!', '🛡️');
      this.closeModal();
    }
  }

  public renderModalHTML(): string {
    if (!this.isOpen) return '';

    const currentCap = this.encodeImageWidth > 0 && this.encodeImageHeight > 0
      ? calculateImageCapacity(this.encodeImageWidth, this.encodeImageHeight)
      : 0;

    return `
      <div id="steganography-modal-backdrop" onclick="if(event.target.id==='steganography-modal-backdrop'){if(window.__aetheris_close_steganography){window.__aetheris_close_steganography();}else if(window.steganographyModal){window.steganographyModal.closeModal();}}" class="fixed inset-0 bg-black/85 backdrop-blur-md z-[10000] flex items-center justify-center p-4 animate-fade-in pointer-events-auto">
        <div class="bg-surface-base border border-cyan-500/30 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative overflow-hidden flex flex-col max-h-[90vh]" onclick="event.stopPropagation()">
          
          <!-- MODAL HEADER -->
          <div class="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-lg shadow-inner">
                🖼️
              </div>
              <div>
                <h3 class="text-base font-bold text-white tracking-wide font-sans flex items-center space-x-2">
                  <span>Pixel Canvas Steganography</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase font-semibold">LSB E2EE</span>
                </h3>
                <p class="text-xs text-slate-400 font-sans">Hide encrypted backups & confidential seed phrases inside lossless PNG pixels</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-steg-modal"
              onclick="if(window.__aetheris_close_steganography) { window.__aetheris_close_steganography(); } else if(window.steganographyModal) { window.steganographyModal.closeModal(); }"
              class="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-sm font-mono"
            >
              ✕
            </button>
          </div>

          <!-- TABS -->
          <div class="flex items-center space-x-2 bg-surface-raised p-1 rounded-2xl border border-white/5 shrink-0">
            <button
              type="button"
              id="tab-steg-encode"
              class="flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'encode' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}"
            >
              🔒 Encode Secret to PNG
            </button>
            <button
              type="button"
              id="tab-steg-decode"
              class="flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'decode' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}"
            >
              🔓 Decode & Reveal from PNG
            </button>
          </div>

          <!-- TAB CONTENT SCROLLABLE BODY -->
          <div class="space-y-4 overflow-y-auto pr-1 flex-1">
            ${this.activeTab === 'encode' ? this.renderEncodeTab(currentCap) : this.renderDecodeTab()}
          </div>

          <!-- FOOTER STATUS -->
          ${this.renderFooter()}
        </div>
      </div>
    `;
  }

  private renderEncodeTab(currentCap: number): string {
    return `
      <!-- ENCODE TAB -->
      <div class="space-y-4">
        <!-- CARRIER IMAGE SELECTION -->
        <div class="p-3.5 rounded-2xl bg-surface-raised/80 border border-white/10 space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <span>Carrier Image</span>
              <span class="text-[10px] text-slate-400 font-normal">(${this.encodeImageWidth > 0 ? `${this.encodeImageWidth}×${this.encodeImageHeight}px` : 'None selected'})</span>
            </label>
            <div class="flex items-center space-x-2">
              <button
                type="button"
                id="btn-steg-generate-gradient"
                class="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                title="Create a 512x512 procedural cosmic carrier"
              >
                ✨ Generate Carrier
              </button>
            </div>
          </div>

          <div
            id="steg-encode-dropzone"
            class="border-2 border-dashed border-white/15 hover:border-cyan-500/50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-surface-base/50"
          >
            <input type="file" id="steg-encode-file-input" accept="image/png,image/jpeg,image/webp" class="hidden" />
            ${this.encodePreviewUrl ? `
              <div class="flex items-center space-x-4 w-full">
                <img src="${this.encodePreviewUrl}" class="w-16 h-16 rounded-lg object-cover border border-white/10 shadow-sm" alt="Carrier Preview" />
                <div class="text-left flex-1 min-w-0">
                  <p class="text-xs font-bold text-white truncate">Active Carrier Image</p>
                  <p class="text-[11px] text-slate-400 font-mono">${this.encodeImageWidth}×${this.encodeImageHeight}px · ${(currentCap / 1024).toFixed(1)} KB Max Capacity</p>
                  <p class="text-[10px] text-cyan-400 font-mono mt-0.5">Click or drag new image to replace</p>
                </div>
              </div>
            ` : `
              <span class="text-2xl mb-1">🖼️</span>
              <p class="text-xs text-slate-300 font-medium">Click or Drag & Drop a PNG/JPEG image</p>
              <p class="text-[10px] text-slate-500 mt-1">Or click 'Generate Carrier' above for an instant procedural image</p>
            `}
          </div>
        </div>

        <!-- SECRET PAYLOAD TEXTAREA -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="input-steg-payload" class="text-xs font-bold text-slate-200 flex items-center space-x-2">
              <span>Secret Payload</span>
              <span class="text-[10px] text-slate-400 font-normal">(${this.encodeSecretPayload.length} chars)</span>
            </label>
            <button
              type="button"
              id="btn-steg-use-seed"
              class="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
            >
              🔑 Use Sovereign Seed
            </button>
          </div>
          <textarea
            id="input-steg-payload"
            rows="3"
            placeholder="Type confidential message, private key, or identity seed backup..."
            class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono resize-none"
          >${this.encodeSecretPayload}</textarea>
        </div>

        <!-- OPTIONAL PASSPHRASE ENCRYPTION -->
        <div class="space-y-1.5">
          <label for="input-steg-passphrase" class="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
            <span>Passphrase Encryption (AES-256-GCM)</span>
            <span class="text-[10px] text-slate-400 font-normal">(Optional, recommended)</span>
          </label>
          <input
            type="password"
            id="input-steg-passphrase"
            value="${this.encodePassphrase}"
            placeholder="Set optional decryption passphrase (PBKDF2 50,000 iter)..."
            class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
          />
          <p class="text-[10px] text-slate-400">If set, payload is encrypted with PBKDF2 & AES-256-GCM before LSB injection.</p>
        </div>

        <!-- ACTIONS -->
        <div class="pt-2 flex items-center space-x-3">
          <button
            type="button"
            id="btn-steg-encode-execute"
            class="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            ${this.isEncoding ? 'disabled' : ''}
          >
            <span>${this.isEncoding ? '⏳ Synthesizing Pixels...' : '⚡ Encode Steganographic Image'}</span>
          </button>
          ${this.encodedBlobUrl ? `
            <button
              type="button"
              id="btn-steg-download-png"
              class="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>💾 Download Stego-PNG</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private renderDecodeTab(): string {
    return `
      <!-- DECODE TAB -->
      <div class="space-y-4">
        <!-- STEGO IMAGE UPLOAD -->
        <div class="p-3.5 rounded-2xl bg-surface-raised/80 border border-white/10 space-y-3">
          <label class="text-xs font-bold text-slate-200 block">
            Steganographic PNG Carrier
          </label>

          <div
            id="steg-decode-dropzone"
            class="border-2 border-dashed border-white/15 hover:border-cyan-500/50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-surface-base/50"
          >
            <input type="file" id="steg-decode-file-input" accept="image/png" class="hidden" />
            ${this.decodePreviewUrl ? `
              <div class="flex items-center space-x-4 w-full">
                <img src="${this.decodePreviewUrl}" class="w-16 h-16 rounded-lg object-cover border border-white/10 shadow-sm" alt="Stego Image Preview" />
                <div class="text-left flex-1 min-w-0">
                  <p class="text-xs font-bold text-white truncate">Loaded Stego Image</p>
                  <p class="text-[11px] text-slate-400 font-mono">${this.decodeCanvas?.width}×${this.decodeCanvas?.height}px</p>
                  <p class="text-[10px] text-cyan-400 font-mono mt-0.5">Click or drag new image to replace</p>
                </div>
              </div>
            ` : `
              <span class="text-2xl mb-1">🔍</span>
              <p class="text-xs text-slate-300 font-medium">Click or Drag & Drop a stego-encoded PNG image</p>
              <p class="text-[10px] text-slate-500 mt-1">Must be lossless PNG containing AETH_STEG_01 signature</p>
            `}
          </div>
        </div>

        <!-- PASSPHRASE INPUT (IF ENCRYPTED) -->
        <div class="space-y-1.5">
          <label for="input-steg-decode-passphrase" class="text-xs font-bold text-slate-200 block">
            Decryption Passphrase
          </label>
          <input
            type="password"
            id="input-steg-decode-passphrase"
            value="${this.decodePassphrase}"
            placeholder="Enter passphrase if the payload was encrypted..."
            class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
          />
        </div>

        <!-- DECODE ACTION -->
        <div class="pt-1">
          <button
            type="button"
            id="btn-steg-decode-execute"
            class="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            ${this.isDecoding ? 'disabled' : ''}
          >
            <span>${this.isDecoding ? '⏳ Scanning & Decrypting...' : '🔓 Reveal Sovereign Payload'}</span>
          </button>
        </div>

        <!-- REVEALED RESULTS BOX -->
        ${this.revealedPayload !== null ? `
          <div class="p-4 rounded-2xl bg-surface-raised border border-emerald-500/30 space-y-3 animate-fade-in">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-emerald-400 text-sm">✅</span>
                <span class="text-xs font-bold text-emerald-300">
                  ${this.isPayloadEncrypted ? 'Decrypted Sovereign Secret (AES-256-GCM)' : 'Extracted Sovereign Payload (Plaintext)'}
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  id="btn-steg-copy-revealed"
                  class="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  📋 Copy Text
                </button>
                ${this.revealedPayload.trim().split(/\s+/).length === 12 || this.revealedPayload.trim().split(/\s+/).length === 24 ? `
                  <button
                    type="button"
                    id="btn-steg-restore-identity"
                    class="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                    title="Restore sovereign account from recovered BIP-39 seed"
                  >
                    🛡️ Restore Account
                  </button>
                ` : ''}
              </div>
            </div>
            <pre class="bg-surface-base/80 p-3 rounded-xl border border-white/5 text-xs text-white font-mono break-all whitespace-pre-wrap select-all max-h-40 overflow-y-auto">${this.escapeHTML(this.revealedPayload)}</pre>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderFooter(): string {
    const status = this.activeTab === 'encode' ? this.encodeStatus : this.decodeStatus;
    if (!status) return '';

    const colorClasses = {
      info: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
      success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
      warning: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
      error: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
    }[status.type];

    const icon = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }[status.type];

    return `
      <div class="p-3 rounded-xl border text-xs flex items-center space-x-2 shrink-0 ${colorClasses}">
        <span>${icon}</span>
        <span class="flex-1 font-mono text-[11px] leading-tight">${this.escapeHTML(status.text)}</span>
      </div>
    `;
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  public bindEvents(): void {
    if (!this.isOpen) return;

    // Close button & backdrop click
    document.getElementById('btn-close-steg-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('steganography-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('steganography-modal-backdrop')) {
        this.closeModal();
      }
    });

    // Tab switching
    document.getElementById('tab-steg-encode')?.addEventListener('click', () => {
      this.activeTab = 'encode';
      clientStore.notify();
    });
    document.getElementById('tab-steg-decode')?.addEventListener('click', () => {
      this.activeTab = 'decode';
      clientStore.notify();
    });

    // ── Encode Tab Bindings ──────────────────────────────────────────
    const encodeDropzone = document.getElementById('steg-encode-dropzone');
    const encodeFileInput = document.getElementById('steg-encode-file-input') as HTMLInputElement | null;

    encodeDropzone?.addEventListener('click', () => {
      encodeFileInput?.click();
    });

    encodeDropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      encodeDropzone.classList.add('border-cyan-500');
    });

    encodeDropzone?.addEventListener('dragleave', () => {
      encodeDropzone.classList.remove('border-cyan-500');
    });

    encodeDropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      encodeDropzone.classList.remove('border-cyan-500');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleEncodeImageUpload(files[0]);
      }
    });

    encodeFileInput?.addEventListener('change', () => {
      if (encodeFileInput.files && encodeFileInput.files.length > 0) {
        this.handleEncodeImageUpload(encodeFileInput.files[0]);
      }
    });

    document.getElementById('btn-steg-generate-gradient')?.addEventListener('click', async () => {
      const procedural = this.generateProceduralCanvas(512, 512);
      await this.setEncodeSourceFromCanvas(procedural);
      toastManager.info('Generated 512×512 procedural carrier canvas', '✨');
    });

    const payloadTextarea = document.getElementById('input-steg-payload') as HTMLTextAreaElement | null;
    payloadTextarea?.addEventListener('input', () => {
      this.encodeSecretPayload = payloadTextarea.value;
    });

    document.getElementById('btn-steg-use-seed')?.addEventListener('click', () => {
      this.populateFromMnemonic();
    });

    const passphraseInput = document.getElementById('input-steg-passphrase') as HTMLInputElement | null;
    passphraseInput?.addEventListener('input', () => {
      this.encodePassphrase = passphraseInput.value;
    });

    document.getElementById('btn-steg-encode-execute')?.addEventListener('click', () => {
      if (payloadTextarea) {
        this.encodeSecretPayload = payloadTextarea.value;
      }
      if (passphraseInput) {
        this.encodePassphrase = passphraseInput.value;
      }
      this.executeEncode();
    });

    document.getElementById('btn-steg-download-png')?.addEventListener('click', () => {
      this.downloadEncodedImage();
    });

    // ── Decode Tab Bindings ──────────────────────────────────────────
    const decodeDropzone = document.getElementById('steg-decode-dropzone');
    const decodeFileInput = document.getElementById('steg-decode-file-input') as HTMLInputElement | null;

    decodeDropzone?.addEventListener('click', () => {
      decodeFileInput?.click();
    });

    decodeDropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      decodeDropzone.classList.add('border-cyan-500');
    });

    decodeDropzone?.addEventListener('dragleave', () => {
      decodeDropzone.classList.remove('border-cyan-500');
    });

    decodeDropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      decodeDropzone.classList.remove('border-cyan-500');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleDecodeImageUpload(files[0]);
      }
    });

    decodeFileInput?.addEventListener('change', () => {
      if (decodeFileInput.files && decodeFileInput.files.length > 0) {
        this.handleDecodeImageUpload(decodeFileInput.files[0]);
      }
    });

    const decodePassphraseInput = document.getElementById('input-steg-decode-passphrase') as HTMLInputElement | null;
    decodePassphraseInput?.addEventListener('input', () => {
      this.decodePassphrase = decodePassphraseInput.value;
    });

    document.getElementById('btn-steg-decode-execute')?.addEventListener('click', () => {
      if (decodePassphraseInput) {
        this.decodePassphrase = decodePassphraseInput.value;
      }
      this.executeDecode();
    });

    document.getElementById('btn-steg-copy-revealed')?.addEventListener('click', () => {
      this.copyRevealedPayload();
    });

    document.getElementById('btn-steg-restore-identity')?.addEventListener('click', () => {
      this.restoreIdentityFromRevealed();
    });
  }
}

export const steganographyModal = new SovereignSteganographyModal();
serviceRegistry.registerInstance(SERVICES.SteganographyModal, steganographyModal);
