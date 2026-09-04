/**
 * @file archive-modal.ts
 * @package @aetheris/client-ui
 * @description Sovereign Data Archive Modal Component.
 * Supports 1-click password-protected AES-256-GCM export and import
 * of all account data with real-time passphrase strength meter,
 * drag-and-drop vault loading, and state rehydration.
 */

import { clientStore } from './client-state.js';
import { toastManager } from './toast.js';
import { exportSovereignArchive, importSovereignArchive, downloadArchiveFile } from './data-archive.js';
import { serviceRegistry, SERVICES } from './service-registry.js';

export interface PasswordStrength {
  score: number; // 0 to 4
  label: string;
  colorClass: string;
  barWidth: string;
}

export function calculatePasswordStrength(passphrase: string): PasswordStrength {
  if (!passphrase || passphrase.length === 0) {
    return { score: 0, label: 'Enter Passphrase', colorClass: 'bg-slate-600', barWidth: '0%' };
  }
  let score = 0;
  if (passphrase.length >= 8) score++;
  if (passphrase.length >= 12) score++;
  if (/[a-z]/.test(passphrase) && /[A-Z]/.test(passphrase)) score++;
  if (/\d/.test(passphrase) && /[^a-zA-Z0-9]/.test(passphrase)) score++;

  switch (score) {
    case 1:
      return { score: 1, label: 'Weak', colorClass: 'bg-rose-500', barWidth: '25%' };
    case 2:
      return { score: 2, label: 'Fair', colorClass: 'bg-amber-500', barWidth: '50%' };
    case 3:
      return { score: 3, label: 'Good', colorClass: 'bg-indigo-500', barWidth: '75%' };
    case 4:
      return { score: 4, label: 'Cryptographically Strong', colorClass: 'bg-emerald-500', barWidth: '100%' };
    default:
      return { score: 0, label: 'Very Weak (< 8 characters)', colorClass: 'bg-rose-600', barWidth: '15%' };
  }
}

export class SovereignArchiveModal {
  public isOpen: boolean = false;
  public activeTab: 'export' | 'restore' = 'export';
  public exportPassphrase: string = '';
  public exportConfirmPassphrase: string = '';
  public restorePassphrase: string = '';
  public restoreFileData: Uint8Array | null = null;
  public restoreFileName: string = '';
  public restoreFileSize: number = 0;
  public isExporting: boolean = false;
  public isRestoring: boolean = false;
  public errorMessage: string = '';
  public successMessage: string = '';
  public showExportPassphrase: boolean = false;
  public showRestorePassphrase: boolean = false;

  constructor() {
    serviceRegistry.registerInstance(SERVICES.ArchiveModal || 'ArchiveModal', this);
  }

  public openModal(tab: 'export' | 'restore' = 'export'): void {
    this.isOpen = true;
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
    clientStore.notifySync();
  }

  public closeModal(): void {
    this.isOpen = false;
    this.errorMessage = '';
    this.successMessage = '';
    clientStore.notifySync();
  }

  public setTab(tab: 'export' | 'restore'): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
    clientStore.notify();
  }

  public setRestoreFile(data: Uint8Array, name: string, size: number): void {
    this.restoreFileData = data;
    this.restoreFileName = name;
    this.restoreFileSize = size;
    this.errorMessage = '';
    clientStore.notify();
  }

  public async executeExport(): Promise<void> {
    if (!this.exportPassphrase || this.exportPassphrase.length < 4) {
      this.errorMessage = 'Passphrase must be at least 4 characters long';
      clientStore.notify();
      return;
    }

    if (this.exportPassphrase !== this.exportConfirmPassphrase) {
      this.errorMessage = 'Passphrases do not match. Please retype to confirm.';
      clientStore.notify();
      return;
    }

    this.isExporting = true;
    this.errorMessage = '';
    this.successMessage = '';
    clientStore.notify();

    try {
      const blob = await exportSovereignArchive(this.exportPassphrase);
      const filename = `aetheris-sovereign-vault-${new Date().toISOString().slice(0, 10)}.aeth`;
      downloadArchiveFile(blob, filename);

      this.successMessage = `Encrypted archive successfully generated and downloaded (${(blob.size / 1024).toFixed(1)} KB)!`;
      toastManager.success('Sovereign archive downloaded successfully', '📦');
      this.exportPassphrase = '';
      this.exportConfirmPassphrase = '';
    } catch (err: any) {
      this.errorMessage = err?.message || 'Failed to export archive';
      toastManager.warning(this.errorMessage, '⚠️');
    } finally {
      this.isExporting = false;
      clientStore.notify();
    }
  }

  public async executeRestore(): Promise<void> {
    if (!this.restoreFileData) {
      this.errorMessage = 'Please select or drop an encrypted .aeth archive file';
      clientStore.notify();
      return;
    }

    if (!this.restorePassphrase) {
      this.errorMessage = 'Please enter the passphrase used to encrypt this archive';
      clientStore.notify();
      return;
    }

    this.isRestoring = true;
    this.errorMessage = '';
    this.successMessage = '';
    clientStore.notify();

    try {
      const res = await importSovereignArchive(this.restoreFileData, this.restorePassphrase);
      if (res.success) {
        this.successMessage = `Archive rehydrated: ${res.stats.posts} posts, ${res.stats.bookmarks} bookmarks, ${res.stats.messages} messages!`;
        toastManager.success('✨ Sovereign archive successfully decrypted and restored!', '🛡️');
        this.restoreFileData = null;
        this.restoreFileName = '';
        this.restorePassphrase = '';
      }
    } catch (err: any) {
      this.errorMessage = err?.message || 'Invalid passphrase or corrupted archive';
      toastManager.warning(this.errorMessage, '⚠️');
    } finally {
      this.isRestoring = false;
      clientStore.notify();
    }
  }

  public renderModalHTML(): string {
    if (!this.isOpen) return '';

    const strength = calculatePasswordStrength(this.exportPassphrase);
    const passwordsMatch = this.exportPassphrase.length > 0 && this.exportPassphrase === this.exportConfirmPassphrase;

    return `
      <div id="archive-modal-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4 animate-fade-in pointer-events-auto" onclick="if(event.target.id==='archive-modal-backdrop'){window.__aetheris_close_archive_modal&&window.__aetheris_close_archive_modal();}">
        <div class="bg-surface-base border border-white/15 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6 relative overflow-hidden" onclick="event.stopPropagation()">

          <!-- MODAL HEADER -->
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-lg shadow-inner">
                📦
              </div>
              <div>
                <h3 class="text-base font-bold text-white tracking-wide font-sans flex items-center space-x-2">
                  <span>Sovereign Data Archive</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-semibold">AES-256-GCM</span>
                </h3>
                <p class="text-xs text-slate-400 font-sans">Self-contained encrypted export and deterministic import of account state</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-archive-modal"
              onclick="if(window.__aetheris_close_archive_modal) { window.__aetheris_close_archive_modal(); } else if(window.sovereignArchiveModal) { window.sovereignArchiveModal.closeModal(); }"
              class="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-sm font-mono"
            >
              ✕
            </button>
          </div>

          <!-- TABS -->
          <div class="flex items-center space-x-2 bg-surface-raised p-1 rounded-2xl border border-white/5">
            <button
              type="button"
              id="tab-archive-export"
              class="flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${this.activeTab === 'export' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}"
            >
              <span>📦</span>
              <span>Export Archive</span>
            </button>
            <button
              type="button"
              id="tab-archive-restore"
              class="flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${this.activeTab === 'restore' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}"
            >
              <span>📥</span>
              <span>Restore Archive</span>
            </button>
          </div>

          <!-- ALERT BANNERS -->
          ${this.errorMessage ? `
            <div class="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-start space-x-2.5 animate-fade-in">
              <span class="shrink-0 text-base">⚠️</span>
              <div class="font-sans">${this.errorMessage}</div>
            </div>
          ` : ''}

          ${this.successMessage ? `
            <div class="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-start space-x-2.5 animate-fade-in">
              <span class="shrink-0 text-base">✅</span>
              <div class="font-sans font-medium">${this.successMessage}</div>
            </div>
          ` : ''}

          <!-- TAB 1: EXPORT ARCHIVE -->
          ${this.activeTab === 'export' ? `
            <div class="space-y-4">
              <!-- INFO SUMMARY -->
              <div class="p-3.5 rounded-2xl bg-surface-raised border border-white/5 space-y-2 text-xs">
                <div class="text-slate-300 font-semibold flex items-center justify-between">
                  <span>Vault Payload Inclusions:</span>
                  <span class="text-[10px] font-mono text-indigo-400">100,000 PBKDF2 Iterations</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-slate-400 text-[11px] font-mono">
                  <div class="flex items-center space-x-1.5">
                    <span class="text-emerald-400">✓</span>
                    <span>Ed25519 Identity & Seed</span>
                  </div>
                  <div class="flex items-center space-x-1.5">
                    <span class="text-emerald-400">✓</span>
                    <span>Posts & Transmissions</span>
                  </div>
                  <div class="flex items-center space-x-1.5">
                    <span class="text-emerald-400">✓</span>
                    <span>Bookmarks Vault</span>
                  </div>
                  <div class="flex items-center space-x-1.5">
                    <span class="text-emerald-400">✓</span>
                    <span>Channels & Messages</span>
                  </div>
                </div>
              </div>

              <!-- PASSPHRASE INPUT -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-300 font-sans">
                  Vault Encryption Passphrase
                </label>
                <div class="relative">
                  <input
                    type="${this.showExportPassphrase ? 'text' : 'password'}"
                    id="input-export-passphrase"
                    value="${this.exportPassphrase}"
                    placeholder="Enter a strong personal passphrase..."
                    class="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-white/10 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none pr-10 placeholder-slate-500"
                  />
                  <button
                    type="button"
                    id="btn-toggle-show-export-passphrase"
                    class="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs cursor-pointer p-1"
                  >
                    ${this.showExportPassphrase ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>

                <!-- STRENGTH METER -->
                <div class="space-y-1 pt-1">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-slate-400">Strength:</span>
                    <span class="font-mono font-bold text-slate-300" id="passphrase-strength-label">${strength.label}</span>
                  </div>
                  <div class="w-full bg-surface-raised h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div
                      id="passphrase-strength-bar"
                      class="h-full transition-all duration-300 ${strength.colorClass}"
                      style="width: ${strength.barWidth}"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- CONFIRM PASSPHRASE -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-300 font-sans">
                  Confirm Passphrase
                </label>
                <input
                  type="${this.showExportPassphrase ? 'text' : 'password'}"
                  id="input-export-confirm-passphrase"
                  value="${this.exportConfirmPassphrase}"
                  placeholder="Retype passphrase to confirm..."
                  class="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border ${this.exportConfirmPassphrase && !passwordsMatch ? 'border-rose-500' : 'border-white/10'} text-white text-xs font-mono focus:border-indigo-500 focus:outline-none placeholder-slate-500"
                />
                ${this.exportConfirmPassphrase && !passwordsMatch ? `
                  <span class="text-[11px] text-rose-400 font-mono">Passphrases do not match</span>
                ` : ''}
              </div>

              <!-- DOWNLOAD BUTTON -->
              <button
                type="button"
                id="btn-execute-export"
                ${this.isExporting ? 'disabled' : ''}
                class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                ${this.isExporting ? `
                  <span class="animate-spin">⏳</span>
                  <span>Deriving Keys & Encrypting Vault...</span>
                ` : `
                  <span>📦</span>
                  <span>Download Encrypted Archive (.aeth)</span>
                `}
              </button>
            </div>
          ` : `
            <!-- TAB 2: RESTORE ARCHIVE -->
            <div class="space-y-4">
              <!-- FILE UPLOAD DROPZONE -->
              <div
                id="archive-dropzone"
                class="border-2 border-dashed border-white/15 hover:border-indigo-500/50 rounded-2xl p-6 text-center transition-all bg-surface-raised/40 hover:bg-surface-raised/70 cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <input
                  type="file"
                  id="input-archive-file"
                  accept=".aeth,.bin,application/octet-stream"
                  class="hidden"
                />
                <div class="text-3xl">📥</div>
                ${this.restoreFileName ? `
                  <div class="text-xs text-white font-mono font-bold flex items-center space-x-1.5">
                    <span class="text-emerald-400">✓</span>
                    <span>${this.restoreFileName}</span>
                    <span class="text-slate-400">(${(this.restoreFileSize / 1024).toFixed(1)} KB)</span>
                  </div>
                  <p class="text-[11px] text-indigo-300">Click to choose a different archive file</p>
                ` : `
                  <div class="text-xs text-white font-bold">
                    Drag & Drop your <span class="font-mono text-indigo-400">.aeth</span> archive file here
                  </div>
                  <p class="text-[11px] text-slate-400">or click to browse local files</p>
                `}
              </div>

              <!-- PASSPHRASE INPUT FOR RESTORE -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-300 font-sans">
                  Decryption Passphrase
                </label>
                <div class="relative">
                  <input
                    type="${this.showRestorePassphrase ? 'text' : 'password'}"
                    id="input-restore-passphrase"
                    value="${this.restorePassphrase}"
                    placeholder="Enter the passphrase you used to export this archive..."
                    class="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-white/10 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none pr-10 placeholder-slate-500"
                  />
                  <button
                    type="button"
                    id="btn-toggle-show-restore-passphrase"
                    class="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs cursor-pointer p-1"
                  >
                    ${this.showRestorePassphrase ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
              </div>

              <!-- RESTORE BUTTON -->
              <button
                type="button"
                id="btn-execute-restore"
                ${this.isRestoring || !this.restoreFileData ? 'disabled' : ''}
                class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                ${this.isRestoring ? `
                  <span class="animate-spin">⏳</span>
                  <span>Deriving PBKDF2 & Decrypting Vault...</span>
                ` : `
                  <span>🔓</span>
                  <span>Decrypt & Restore Sovereign Archive</span>
                `}
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  public bindEvents(): void {
    this.bindModalEvents();
  }

  public bindModalEvents(): void {
    if (!this.isOpen) return;

    // Close button
    document.getElementById('btn-close-archive-modal')?.addEventListener('click', () => {
      this.closeModal();
    });

    // Tab buttons
    document.getElementById('tab-archive-export')?.addEventListener('click', () => {
      this.setTab('export');
    });
    document.getElementById('tab-archive-restore')?.addEventListener('click', () => {
      this.setTab('restore');
    });

    // Export Passphrase Input
    const exportPassInput = document.getElementById('input-export-passphrase') as HTMLInputElement | null;
    if (exportPassInput) {
      exportPassInput.addEventListener('input', (e) => {
        this.exportPassphrase = (e.target as HTMLInputElement).value;
        const strength = calculatePasswordStrength(this.exportPassphrase);
        const strengthLabel = document.getElementById('passphrase-strength-label');
        const strengthBar = document.getElementById('passphrase-strength-bar');
        if (strengthLabel) strengthLabel.textContent = strength.label;
        if (strengthBar) {
          strengthBar.style.width = strength.barWidth;
          strengthBar.className = `h-full transition-all duration-300 ${strength.colorClass}`;
        }
      });
    }

    // Export Confirm Passphrase Input
    const exportConfirmInput = document.getElementById('input-export-confirm-passphrase') as HTMLInputElement | null;
    if (exportConfirmInput) {
      exportConfirmInput.addEventListener('input', (e) => {
        this.exportConfirmPassphrase = (e.target as HTMLInputElement).value;
      });
    }

    // Toggle Passphrase Visibility
    document.getElementById('btn-toggle-show-export-passphrase')?.addEventListener('click', () => {
      this.showExportPassphrase = !this.showExportPassphrase;
      clientStore.notify();
    });

    // Execute Export Button
    document.getElementById('btn-execute-export')?.addEventListener('click', () => {
      this.executeExport();
    });

    // Restore Dropzone and File Input
    const dropzone = document.getElementById('archive-dropzone');
    const fileInput = document.getElementById('input-archive-file') as HTMLInputElement | null;

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => {
        fileInput.click();
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-indigo-500', 'bg-surface-raised');
      });

      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-indigo-500', 'bg-surface-raised');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-indigo-500', 'bg-surface-raised');
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          this.handleSelectedFile(files[0]);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length > 0) {
          this.handleSelectedFile(fileInput.files[0]);
        }
      });
    }

    // Restore Passphrase Input
    const restorePassInput = document.getElementById('input-restore-passphrase') as HTMLInputElement | null;
    if (restorePassInput) {
      restorePassInput.addEventListener('input', (e) => {
        this.restorePassphrase = (e.target as HTMLInputElement).value;
      });
    }

    // Toggle Restore Passphrase Visibility
    document.getElementById('btn-toggle-show-restore-passphrase')?.addEventListener('click', () => {
      this.showRestorePassphrase = !this.showRestorePassphrase;
      clientStore.notify();
    });

    // Execute Restore Button
    document.getElementById('btn-execute-restore')?.addEventListener('click', () => {
      this.executeRestore();
    });
  }

  private handleSelectedFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        this.setRestoreFile(new Uint8Array(reader.result), file.name, file.size);
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

export const sovereignArchiveModal = new SovereignArchiveModal();
serviceRegistry.registerInstance(SERVICES.ArchiveModal || 'ArchiveModal', sovereignArchiveModal);
