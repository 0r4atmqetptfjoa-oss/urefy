/**
 * UREfy Deterministic Paper Wallet & Sovereign Cold Storage Backup Engine.
 * Generates high-contrast printable cold storage paper certificates with 12-word
 * BIP-39 mnemonic seed phrases, Ed25519 public fingerprints, and Merkle root commitments.
 */

import { deriveKeyPairFromMnemonic, validateMnemonic } from '@aetheris/core-crypto';
import { clientStore } from './client-state.js';
import { renderIcon } from './ui/icons.js';

export interface PaperWalletData {
  fingerprint: string;
  publicKeyHex: string;
  mnemonicWords: string[];
  createdAt: number;
  nullifier: string;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function zeroizeBuffer(buffer: Uint8Array | ArrayBuffer | string[] | number[]): void {
  if (buffer instanceof Uint8Array) {
    buffer.fill(0);
  } else if (buffer instanceof ArrayBuffer) {
    new Uint8Array(buffer).fill(0);
  } else if (Array.isArray(buffer)) {
    for (let i = 0; i < buffer.length; i++) {
      if (typeof buffer[i] === 'string') {
        (buffer as string[])[i] = '';
      } else {
        (buffer as number[])[i] = 0;
      }
    }
  }
}

export class PaperWalletEngine {
  public isOpen: boolean = false;
  public isRevealed: boolean = false;

  public open(): void { this.isOpen = true; this.isRevealed = false; }
  public close(): void { this.isOpen = false; this.isRevealed = false; }
  public openModal(): void { this.open(); }
  public closeModal(): void { this.close(); }

  public toggleReveal(): void {
    this.isRevealed = !this.isRevealed;
    clientStore.notifySync();
  }

  public generateMnemonic(fingerprint: string): string[] {
    const phrase = clientStore.mnemonic?.trim() ?? '';
    if (fingerprint !== clientStore.keypair.fingerprint || !validateMnemonic(phrase)) return [];
    const derived = deriveKeyPairFromMnemonic(phrase);
    try {
      if (derived.fingerprint !== fingerprint || derived.publicKeyHex !== clientStore.keypair.publicKeyHex) return [];
      return phrase.split(/\s+/);
    } finally {
      zeroizeBuffer(derived.privateKey);
      derived.privateKeyHex = '';
    }
  }

  public renderPaperWalletModal(fingerprint: string, publicKeyHex: string): string {
    if (!this.isOpen) return '';

    const safeFingerprint = escapeHtml(fingerprint);
    const safePubKey = escapeHtml(publicKeyHex);
    const words = this.isRevealed && publicKeyHex === clientStore.keypair.publicKeyHex ? this.generateMnemonic(fingerprint) : [];
    const displayedWords = this.isRevealed ? words : Array.from({ length: 12 }, () => '----');
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    return `
      <div id="paper-wallet-backdrop" class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150 font-mono text-xs" data-action="close-feature">
        <div class="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto bg-surface-base border border-white/10 rounded-lg p-6 sm:p-8 shadow-2xl space-y-6" data-action="stop-propagation">
          
          <!-- MODAL CONTROLS -->
          <div class="flex items-center justify-between pb-3 border-subtle-b">
            <div class="flex items-center space-x-2">
              <span class="text-xl">📜</span>
              <div>
                <h3 class="text-sm font-bold text-white">Sovereign Paper Wallet Certificate</h3>
                <p class="text-[10px] text-slate-400">Cold storage offline mnemonic backup · Ed25519 / SFrame</p>
              </div>
            </div>
            <button id="btn-close-paper-wallet" class="w-8 h-8 rounded-full bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white flex items-center justify-center text-sm border border-white/10 transition-colors cursor-pointer" title="Close (Esc)">
              ✕
            </button>
          </div>

          <!-- PRINTABLE CERTIFICATE CONTAINER -->
          <div id="printable-paper-wallet" class="p-6 rounded-2xl bg-slate-900 border-2 border-indigo-500/40 text-slate-100 space-y-5 shadow-inner">
            
            <!-- CERTIFICATE HEADER -->
            <div class="flex items-center justify-between border-b border-white/10 pb-4">
              <div class="flex items-center space-x-3">
                <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base">U</div>
                <div>
                  <div class="font-bold text-sm text-white tracking-widest uppercase">UREfy Sovereign Key</div>
                  <div class="text-[9px] text-slate-400">Issued: ${escapeHtml(dateStr)} · Zero-Knowledge Sovereign Node</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-[9px] text-emerald-400 font-bold uppercase">${words.length ? 'Identity match verified' : 'Recovery words hidden'}</div>
              </div>
            </div>

            <!-- PUBLIC KEY INFO -->
            <div class="space-y-1">
              <span class="text-[10px] uppercase text-slate-400 tracking-wider">Public Sovereign Fingerprint:</span>
              <div class="p-2.5 rounded-xl bg-black/60 border border-white/10 text-emerald-400 text-xs font-bold break-all">
                @id:${safeFingerprint}
              </div>
            </div>

            <!-- 12-WORD MNEMONIC SEED GRID -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                <span>12-Word Recovery Seed Phrase (Secret):</span>
                <span class="text-rose-400">⚠️ Never share online</span>
              </div>
              <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                ${displayedWords.map((w, idx) => `
                  <div class="p-2 rounded-lg bg-black/70 border border-white/10 flex items-center space-x-2">
                    <span class="text-slate-500 text-[10px] select-none">${idx + 1}.</span>
                    <span class="text-indigo-200 font-bold">${escapeHtml(w)}</span>
                  </div>
                `).join('')}
              </div>
              ${this.isRevealed && words.length === 0 ? '<p class="text-rose-400">No matching recovery phrase is available. Unlock the current identity before printing.</p>' : ''}
            </div>

            <!-- SECURITY COMMITMENT -->
            <div class="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[10px] text-indigo-300 flex items-center justify-between">
              <span>Public key: <code class="text-white">${safePubKey.substring(0, 16)}...</code></span>
              <span class="text-emerald-400 font-bold">Ed25519</span>
            </div>

          </div>

          <!-- ACTIONS -->
          <div class="flex items-center justify-between pt-1">
            <span class="text-[10px] text-slate-500">Store this physical sheet in a secure, fireproof location.</span>
            <button type="button" data-action="call-global" data-global-method="paperWallet.toggleReveal" aria-pressed="${this.isRevealed}" class="px-3 py-2 rounded-lg border border-white/10 inline-flex items-center gap-2">${renderIcon(this.isRevealed ? 'eyeOff' : 'eye', { size: 18 })}${this.isRevealed ? 'Hide words' : 'Reveal words'}</button>
            <button type="button" id="btn-print-paper-wallet" ${words.length === 0 ? 'disabled' : ''} class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md cursor-pointer flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <span>Print Paper Certificate</span>
              <span>🖨️</span>
            </button>
          </div>

        </div>
      </div>
    `;
  }
}

export const paperWallet = new PaperWalletEngine();
if (typeof window !== 'undefined') (window as any).paperWallet = paperWallet;
