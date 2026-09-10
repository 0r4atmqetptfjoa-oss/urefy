/**
 * @file social-recovery-modal.ts
 * @package @aetheris/client-ui
 * @description Sovereign Social Identity Recovery Modal Component.
 * Implements Shamir's Secret Sharing (k-of-n threshold) and ECDH/AES-256-GCM
 * guardian shard distribution over the Web-of-Trust graph.
 */

import { clientStore } from './client-state.js';
import { toastManager } from './toast.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { t } from './i18n.js';
import {
  splitSecretIntoShards,
  reconstructSecretFromShards,
  serializeShard,
  deserializeShard,
  encryptShardForGuardian,
  decryptShardFromGuardian,
  createSocialRecoveryPackage,
  SecretShard,
  EncryptedGuardianShardPackage,
  SocialRecoverySetupPackage,
  generateKeyPair,
  bytesToHex,
  validateMnemonic,
  computeFingerprint,
  hexToBytes,
  deriveKeyPairFromMnemonic,
} from '@aetheris/core-crypto';

export interface GuardianContact {
  fingerprint: string;
  name: string;
  role: string;
  publicKeyHex: string;
  trustScore: number;
  isSelected: boolean;
}

export class SocialRecoveryModal {
  public isOpen: boolean = false;
  public activeTab: 'setup' | 'recover' = 'setup';

  // Setup tab state
  public guardians: GuardianContact[] = [];
  public threshold: number = 3;
  public generatedPackage: SocialRecoverySetupPackage | null = null;
  public isGenerating: boolean = false;
  public customGuardianInput: string = '';

  // Recover tab state
  public shardInputs: string[] = ['', '', ''];
  public isRecovering: boolean = false;
  private operationVersion = 0;
  public recoveredMnemonic: string = '';
  public validationStatus: { validCount: number; requiredThreshold: number; message: string } = {
    validCount: 0,
    requiredThreshold: 3,
    message: 'Paste at least 3 guardian shards to initiate recovery.',
  };

  constructor() {
    this._initializeDefaultGuardians();
    try {
      serviceRegistry.registerInstance(SERVICES.SocialRecoveryModal || 'SocialRecoveryModal', this);
    } catch (_) {}
    if (typeof window !== 'undefined') {
      (window as any).socialRecoveryModal = this;
      (window as any).__aetheris_open_social_recovery = (tab?: 'setup' | 'recover') => {
        this.openModal(tab || 'setup');
      };
      (window as any).__aetheris_close_social_recovery = () => {
        this.closeModal();
      };
    }
  }

  private _initializeDefaultGuardians(): void {
    this.guardians = [];
    this._adjustThreshold();
  }

  private _adjustThreshold(): void {
    const selectedCount = this.guardians.filter((g) => g.isSelected).length;
    if (selectedCount < 2) {
      this.threshold = 2;
    } else {
      // Default to majority quorum: ceil((n + 1) / 2), e.g. 3 of 5
      const ideal = Math.ceil((selectedCount + 1) / 2);
      this.threshold = Math.max(2, Math.min(selectedCount, ideal));
    }
  }

  public openModal(tab: 'setup' | 'recover' = 'setup'): void {
    this.isOpen = true;
    this.activeTab = tab;
    this.updateShardValidation();
    clientStore.notifySync();
  }

  public closeModal(): void {
    this.isOpen = false;
    this.operationVersion++;
    this.shardInputs = ['', '', ''];
    this.recoveredMnemonic = '';
    this.generatedPackage = null;
    this.customGuardianInput = '';
    this.isGenerating = false;
    this.isRecovering = false;
    clientStore.notifySync();
  }

  public setTab(tab: 'setup' | 'recover'): void {
    this.activeTab = tab;
    clientStore.notify();
  }

  public toggleGuardian(fingerprint: string): void {
    const g = this.guardians.find((x) => x.fingerprint === fingerprint);
    if (g) {
      g.isSelected = !g.isSelected;
      this._adjustThreshold();
      clientStore.notify();
    }
  }

  public setThreshold(val: number): void {
    const selectedCount = this.guardians.filter((g) => g.isSelected).length;
    const clamped = Math.max(2, Math.min(selectedCount, val));
    this.threshold = clamped;
    clientStore.notify();
  }

  public addCustomGuardian(fingerprintOrPubkey: string): boolean {
    const clean = fingerprintOrPubkey.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(clean)) {
      toastManager.warning('A guardian must provide their full 64-character Ed25519 public key.');
      return false;
    }

    if (this.guardians.some((g) => g.fingerprint === clean || g.publicKeyHex === clean)) {
      toastManager.warning('Guardian already present in candidate list', '⚠️');
      return false;
    }

    const pubkeyHex = clean;
    const fp = computeFingerprint(hexToBytes(clean));

    this.guardians.push({
      fingerprint: fp,
      name: `Custom Guardian (${fp.substring(0, 6)})`,
      role: 'CUSTOM',
      publicKeyHex: pubkeyHex,
      trustScore: 0,
      isSelected: true,
    });

    this._adjustThreshold();
    toastManager.success(`Added guardian ${fp.substring(0, 8)}`, '🛡️');
    clientStore.notify();
    return true;
  }

  public addGuardianFromInput(): void {
    const input = document.getElementById('custom-guardian-public-key') as HTMLInputElement | null;
    if (input && this.addCustomGuardian(input.value)) input.value = '';
  }

  /**
   * Executes Shamir Secret Sharing splitting on the user's active mnemonic
   * and encrypts each shard to the respective guardian's public key.
   */
  public async executeSetup(): Promise<SocialRecoverySetupPackage | null> {
    if (this.isGenerating) return null;
    const mnemonic = clientStore.mnemonic?.trim();
    if (!mnemonic || !validateMnemonic(mnemonic)) {
      toastManager.warning('No active valid BIP-39 mnemonic found in current session.', '⚠️');
      return null;
    }
    const derived = deriveKeyPairFromMnemonic(mnemonic);
    const matches = derived.publicKeyHex === clientStore.keypair.publicKeyHex;
    derived.privateKey.fill(0);
    derived.privateKeyHex = '';
    if (!matches) {
      toastManager.warning('The recovery phrase does not match the active identity.');
      return null;
    }

    const selectedGuardians = this.guardians.filter((g) => g.isSelected);
    if (selectedGuardians.length < 2) {
      toastManager.warning('Select at least 2 guardians to configure social recovery.', '⚠️');
      return null;
    }

    if (this.threshold < 2 || this.threshold > selectedGuardians.length) {
      toastManager.warning(`Threshold must be between 2 and ${selectedGuardians.length}`, '⚠️');
      return null;
    }

    this.isGenerating = true;
    const operation = this.operationVersion;
    const secretBytes = new TextEncoder().encode(mnemonic);
    clientStore.notify();

    try {
      const guardianConfigs = selectedGuardians.map((g) => ({
        fingerprint: g.fingerprint,
        publicKeyHex: g.publicKeyHex,
      }));

      const setupPkg = await createSocialRecoveryPackage(
        secretBytes,
        guardianConfigs,
        this.threshold,
        clientStore.keypair.fingerprint
      );

      if (operation !== this.operationVersion) return null;
      this.generatedPackage = setupPkg;
      toastManager.success(
        `Successfully generated ${setupPkg.totalShards} encrypted shards (Quorum: ${this.threshold})!`,
        '🛡️'
      );
      return setupPkg;
    } catch (err: any) {
      toastManager.warning(`Failed to generate recovery shards: ${err.message}`, '⚠️');
      return null;
    } finally {
      secretBytes.fill(0);
      this.isGenerating = false;
      clientStore.notify();
    }
  }

  public downloadBackupPackage(): void {
    if (!this.generatedPackage) return;
    const jsonStr = JSON.stringify(this.generatedPackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urefy-social-recovery-${this.generatedPackage.userFingerprint.substring(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastManager.success('Social recovery backup package downloaded', '💾');
  }

  // Recover tab methods
  public setShardInput(index: number, val: string): void {
    this.shardInputs[index] = val;
    this.updateShardValidation();
    clientStore.notify();
  }

  public addShardSlot(): void {
    this.shardInputs.push('');
    this.updateShardValidation();
    clientStore.notify();
  }

  public removeShardSlot(index: number): void {
    if (this.shardInputs.length > 2) {
      this.shardInputs.splice(index, 1);
      this.updateShardValidation();
      clientStore.notify();
    }
  }

  public updateShardValidation(): void {
    const validShards: SecretShard[] = [];
    const seenIndices = new Set<number>();
    let requiredK = 3;

    for (const raw of this.shardInputs) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      try {
        const shard = deserializeShard(trimmed);
        if (!seenIndices.has(shard.index)) {
          seenIndices.add(shard.index);
          validShards.push(shard);
          requiredK = shard.threshold;
        }
      } catch (_) {}
    }

    const count = validShards.length;
    this.validationStatus = {
      validCount: count,
      requiredThreshold: requiredK,
      message:
        count >= requiredK
          ? `Quorum reached! ${count} valid unique shards ready for reconstruction.`
          : `${count} of ${requiredK} unique valid shards provided. Need ${requiredK - count} more.`,
    };
  }

  public async executeRecovery(): Promise<boolean> {
    if (this.isRecovering) return false;
    const parsedShards: SecretShard[] = [];
    const seenIndices = new Set<number>();

    for (const raw of this.shardInputs) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      try {
        const s = deserializeShard(trimmed);
        if (!seenIndices.has(s.index)) {
          seenIndices.add(s.index);
          parsedShards.push(s);
        }
      } catch (e: any) {
        toastManager.warning(`Invalid shard format: ${e.message}`, '⚠️');
        return false;
      }
    }

    if (parsedShards.length < 2) {
      toastManager.warning('At least 2 valid shards are required.', '⚠️');
      return false;
    }

    const expectedK = parsedShards[0].threshold;
    if (parsedShards.length < expectedK) {
      toastManager.warning(
        `Quorum threshold not met: have ${parsedShards.length} shards, required ${expectedK}`,
        '⚠️'
      );
      return false;
    }

    let reconstructedBytes: Uint8Array | undefined;
    const operation = this.operationVersion;
    try {
      this.isRecovering = true;
      reconstructedBytes = reconstructSecretFromShards(parsedShards);
      const recoveredStr = new TextDecoder().decode(reconstructedBytes).trim();

      if (!validateMnemonic(recoveredStr)) {
        throw new Error('Reconstructed secret is not a valid BIP-39 mnemonic phrase');
      }

      const restored = clientStore.restoreIdentityFromMnemonic(recoveredStr);

      if (restored) {
        await clientStore.identityPersistence;
        if (operation !== this.operationVersion) return false;
        toastManager.success('✨ Sovereign identity successfully restored from social guardians!', '🛡️');
        this.closeModal();
        return true;
      } else {
        toastManager.warning('Failed to load restored identity into client store.', '⚠️');
        return false;
      }
    } catch (err: any) {
      toastManager.warning(`Recovery failed: ${err.message}`, '⚠️');
      return false;
    } finally {
      reconstructedBytes?.fill(0);
      this.isRecovering = false;
      clientStore.notify();
    }
  }

  /**
   * Renders the complete Social Recovery modal HTML.
   */
  public renderModalHTML(): string {
    if (!this.isOpen) return '';

    const selectedGuardians = this.guardians.filter((g) => g.isSelected);
    const hasActiveMnemonic = Boolean(clientStore.mnemonic && validateMnemonic(clientStore.mnemonic));
    const isQuorumMet = this.validationStatus.validCount >= this.validationStatus.requiredThreshold;

    return `
      <div id="social-recovery-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-150" data-action="close-feature">
        <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-200 font-sans">
          
          <!-- MODAL HEADER -->
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg">
                🛡️
              </div>
              <div>
                <h3 class="text-sm font-bold text-white font-mono flex items-center space-x-2">
                  <span>Social Identity Recovery</span>
                  <span class="text-[9px] px-1.5 py-0.5 rounded font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/30">k-of-n Shamir</span>
                </h3>
                <p class="text-[10px] text-slate-400 font-mono">Web-of-Trust decentralized quorum · 256-bit prime field Lagrange interpolation</p>
              </div>
            </div>
            <button id="btn-close-social-recovery" data-action="close-feature" class="w-8 h-8 rounded-full bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white flex items-center justify-center text-sm border border-white/10 transition-colors cursor-pointer" title="${t('modal.close', undefined, 'Close')} (Esc)" aria-label="${t('modal.close', undefined, 'Close')}">
              ✕
            </button>
          </div>

          <!-- TAB SWITCHER -->
          <div class="flex rounded-xl bg-surface-raised/80 p-1 border border-white/5 text-xs font-mono">
            <button id="tab-btn-setup-guardians" data-action="set-social-recovery-tab" data-tab="setup" class="flex-1 py-2 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              this.activeTab === 'setup'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }">
              <span>🛡️</span>
              <span>Setup Social Guardians</span>
            </button>
            <button id="tab-btn-recover-account" data-action="set-social-recovery-tab" data-tab="recover" class="flex-1 py-2 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              this.activeTab === 'recover'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }">
              <span>🔄</span>
              <span>Recover Account</span>
            </button>
          </div>

          <!-- TAB CONTENT: SETUP -->
          ${
            this.activeTab === 'setup'
              ? `
            <div class="space-y-4 text-xs">
              <!-- STATUS BANNER -->
              <div class="p-3 rounded-xl bg-surface-raised/60 border border-white/5 space-y-1">
                <div class="flex items-center justify-between font-mono">
                  <span class="text-slate-300 font-bold">Active Mnemonic Status:</span>
                  <span class="${hasActiveMnemonic ? 'text-emerald-400' : 'text-amber-400'} font-bold">
                    ${hasActiveMnemonic ? '✓ BIP-39 Seed Loaded' : '⚠️ No Seed Found'}
                  </span>
                </div>
                <p class="text-[11px] text-slate-400">
                  Shamir's Secret Sharing splits your BIP-39 mnemonic phrase into encrypted mathematical shards. No single guardian can reconstruct your key. Only a verified quorum of <b class="text-white">${this.threshold} of ${selectedGuardians.length}</b> guardians can restore your identity.
                </p>
              </div>

              <!-- GUARDIAN SELECTION -->
              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="text-slate-300 font-bold uppercase tracking-wider text-[10px]">Select Trusted WoT Guardians (${selectedGuardians.length} selected):</span>
                  <span class="text-slate-400 text-[10px]">Min: 2 | Max: 16</span>
                </div>

                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  ${this.guardians
                    .map(
                      (g) => `
                    <div class="p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                      g.isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                        : 'bg-surface-raised/40 border-white/5 text-slate-400 hover:bg-surface-raised'
                    }">
                      <div class="flex items-center space-x-2.5">
                        <input type="checkbox" data-guardian-fp="${g.fingerprint}" class="guardian-checkbox rounded border-white/20 text-emerald-500 cursor-pointer" ${
                        g.isSelected ? 'checked' : ''
                      } />
                        <div>
                          <div class="font-bold text-xs flex items-center space-x-1.5">
                            <span>${g.name}</span>
                            <span class="text-[9px] px-1 py-0.2 rounded font-mono bg-white/5 border border-white/10 text-slate-300">${g.role}</span>
                          </div>
                          <div class="text-[10px] font-mono text-slate-400">Fingerprint: ${g.fingerprint.substring(0, 10)}...</div>
                        </div>
                      </div>
                      <div class="text-right font-mono text-[10px]">
                        <span class="text-slate-400">Public key supplied</span>
                      </div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>

              <!-- THRESHOLD SLIDER -->
              <div class="flex flex-wrap gap-2">
                <input id="custom-guardian-public-key" type="text" maxlength="64" spellcheck="false" autocomplete="off" aria-label="Guardian Ed25519 public key" placeholder="Guardian Ed25519 public key (64 hex characters)" class="min-w-0 flex-1 rounded-lg border border-white/20 bg-surface-base px-3 py-2 font-mono text-xs" />
                <button type="button" data-action="call-global" data-global-path="socialRecoveryModal.addGuardianFromInput" class="min-h-11 rounded-lg border border-white/20 px-3 py-2 text-xs">Add guardian</button>
              </div>
              <div class="p-3.5 rounded-xl bg-surface-raised/80 border border-white/5 space-y-2 font-mono">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-300 font-bold">Quorum Threshold (k):</span>
                  <span class="text-emerald-400 font-bold text-sm">${this.threshold} of ${selectedGuardians.length} Guardians</span>
                </div>
                <input id="slider-threshold" type="range" min="2" max="${Math.max(2, selectedGuardians.length)}" value="${this.threshold}" class="w-full h-1.5 bg-surface-base rounded-lg appearance-none cursor-pointer accent-emerald-500" ${
                selectedGuardians.length < 2 ? 'disabled' : ''
              } />
                <div class="flex justify-between text-[9px] text-slate-500">
                  <span>Fast Recovery (k=2)</span>
                  <span>Strict Majority (k=${Math.ceil((selectedGuardians.length + 1) / 2)})</span>
                  <span>Full Consensus (k=${selectedGuardians.length})</span>
                </div>
              </div>

              <!-- ACTION BUTTONS -->
              <div class="pt-2 flex flex-col sm:flex-row gap-2">
                <button id="btn-generate-shards" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer ${
                  !hasActiveMnemonic || selectedGuardians.length < 2 || this.isGenerating ? 'opacity-50 pointer-events-none' : ''
                }">
                  <span>${this.isGenerating ? '🔒 Generating...' : '🛡️ Generate & Encrypt Shards'}</span>
                </button>
                ${
                  this.generatedPackage
                    ? `
                  <button id="btn-download-recovery-pkg" class="py-2.5 px-4 bg-surface-raised hover:bg-surface-overlay text-slate-200 border border-white/10 font-mono font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer">
                    <span>💾</span>
                    <span>Download Package</span>
                  </button>
                `
                    : ''
                }
              </div>

              <!-- GENERATED SHARDS PREVIEW -->
              ${
                this.generatedPackage
                  ? `
                <div class="p-3 rounded-xl bg-surface-raised/90 border border-emerald-500/30 space-y-2.5 animate-in fade-in">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-mono font-bold text-emerald-400 flex items-center space-x-1.5">
                      <span>✓</span>
                      <span>Encrypted Guardian Shards Ready</span>
                    </span>
                    <span class="text-[10px] font-mono text-slate-400">Total: ${this.generatedPackage.totalShards} Shards</span>
                  </div>

                  <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    ${this.generatedPackage.guardianPackages
                      .map(
                        (pkg) => `
                      <div class="p-2 rounded-lg bg-surface-base border border-white/5 flex items-center justify-between text-[11px] font-mono">
                        <div class="truncate">
                          <span class="text-emerald-400 font-bold">Shard #${pkg.shardIndex}</span>
                          <span class="text-slate-400 ml-1">→ ${pkg.guardianFingerprint.substring(0, 10)}...</span>
                        </div>
                        <button class="btn-copy-shard px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded text-[10px] cursor-pointer" data-shard-json='${JSON.stringify(
                          pkg
                        )}'>
                          Copy Encrypted Token
                        </button>
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
          `
              : `
            <!-- TAB CONTENT: RECOVER -->
            <div class="space-y-4 text-xs">
              <div class="p-3 rounded-xl bg-surface-raised/60 border border-white/5 space-y-1 font-mono">
                <div class="flex items-center justify-between">
                  <span class="text-slate-300 font-bold">Quorum Progress:</span>
                  <span class="${isQuorumMet ? 'text-emerald-400' : 'text-amber-400'} font-bold">
                    ${this.validationStatus.validCount} / ${this.validationStatus.requiredThreshold} Valid Shards
                  </span>
                </div>
                <div class="w-full h-2 rounded-full bg-surface-base border border-white/5 overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300" style="width: ${Math.min(
                    100,
                    Math.round((this.validationStatus.validCount / this.validationStatus.requiredThreshold) * 100)
                  )}%;"></div>
                </div>
                <p class="text-[10px] text-slate-400">${this.validationStatus.message}</p>
              </div>

              <!-- SHARD INPUT SLOTS -->
              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="text-slate-300 font-bold uppercase tracking-wider text-[10px]">Paste Guardian Shard Tokens:</span>
                  <button id="btn-add-shard-slot" class="text-emerald-400 hover:text-emerald-300 cursor-pointer text-[10px] flex items-center space-x-1">
                    <span>+ Add Shard Input</span>
                  </button>
                </div>

                <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
                  ${this.shardInputs
                    .map(
                      (val, idx) => `
                    <div class="space-y-1">
                      <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Guardian Shard #${idx + 1}</span>
                        ${
                          this.shardInputs.length > 2
                            ? `<button class="btn-remove-slot text-rose-400 hover:text-rose-300 cursor-pointer" data-slot-idx="${idx}">✕ Remove</button>`
                            : ''
                        }
                      </div>
                      <textarea
                        data-slot-idx="${idx}"
                        class="shard-input-field w-full h-16 p-2 rounded-xl bg-surface-raised border border-white/10 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-emerald-500 placeholder-slate-600 resize-none"
                        placeholder="Paste AETH-SHARD-v1-... token or raw shard JSON"
                      >${val}</textarea>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>

              <!-- RECONSTRUCTION TRIGGER -->
              <button id="btn-execute-recovery" class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer ${
                !isQuorumMet || this.isRecovering ? 'opacity-50 pointer-events-none' : ''
              }">
                <span>${this.isRecovering ? '🔄 Reconstructing Identity...' : '✨ 1-Click Restore Sovereign Identity'}</span>
              </button>
            </div>
          `
          }

        </div>
      </div>
    `;
  }

  public bindEvents(): void {
    if (!this.isOpen) return;

    // Close button
    document.getElementById('btn-close-social-recovery')?.addEventListener('click', () => {
      this.closeModal();
    });

    // Tab buttons
    document.getElementById('tab-btn-setup-guardians')?.addEventListener('click', () => {
      this.setTab('setup');
    });
    document.getElementById('tab-btn-recover-account')?.addEventListener('click', () => {
      this.setTab('recover');
    });

    // Guardian checkboxes
    document.querySelectorAll('.guardian-checkbox').forEach((el) => {
      el.addEventListener('change', (e) => {
        const fp = (e.target as HTMLElement).getAttribute('data-guardian-fp');
        if (fp) this.toggleGuardian(fp);
      });
    });

    // Threshold slider
    document.getElementById('slider-threshold')?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(val)) this.setThreshold(val);
    });

    // Generate Shards button
    document.getElementById('btn-generate-shards')?.addEventListener('click', () => {
      this.executeSetup();
    });

    // Download Backup Package button
    document.getElementById('btn-download-recovery-pkg')?.addEventListener('click', () => {
      this.downloadBackupPackage();
    });

    // Copy individual shard tokens
    document.querySelectorAll('.btn-copy-shard').forEach((el) => {
      el.addEventListener('click', (e) => {
        const btn = e.currentTarget as HTMLElement;
        const rawJson = btn.getAttribute('data-shard-json');
        if (rawJson) {
          try {
            const pkg = JSON.parse(rawJson);
            const token = `AETH-GUARDIAN-PACKAGE-v1-${typeof btoa !== 'undefined' ? btoa(rawJson) : Buffer.from(rawJson).toString('base64')}`;
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(token).then(() => {
                toastManager.success(`Shard #${pkg.shardIndex} copied to clipboard!`, '📋');
              });
            }
          } catch (_) {}
        }
      });
    });

    // Add Shard slot
    document.getElementById('btn-add-shard-slot')?.addEventListener('click', () => {
      this.addShardSlot();
    });

    // Remove Shard slot
    document.querySelectorAll('.btn-remove-slot').forEach((el) => {
      el.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-slot-idx') || '0', 10);
        this.removeShardSlot(idx);
      });
    });

    // Shard input changes
    document.querySelectorAll('.shard-input-field').forEach((el) => {
      el.addEventListener('input', (e) => {
        const idx = parseInt((e.target as HTMLElement).getAttribute('data-slot-idx') || '0', 10);
        const val = (e.target as HTMLTextAreaElement).value;
        this.setShardInput(idx, val);
      });
    });

    // Execute Recovery button
    document.getElementById('btn-execute-recovery')?.addEventListener('click', () => {
      this.executeRecovery();
    });
  }
}

export const socialRecoveryModal = new SocialRecoveryModal();
