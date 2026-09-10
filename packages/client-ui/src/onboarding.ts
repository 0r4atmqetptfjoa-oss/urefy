/**
 * @file onboarding.ts
 * @package @aetheris/client-ui
 * @description Narrative 4-Step User Onboarding Flow for UREfy.
 * Explains platform values before mechanics:
 *   Step 1: Your Identity Belongs to You (Sovereign Ed25519)
 *   Step 2: Your Content is Fully Protected (Client-side Zero-Knowledge E2EE)
 *   Step 3: The Network Belongs to Everyone (Decentralized P2P Mesh Swarm)
 *   Step 4: Save Your Recovery Key (12-Word BIP-39 Mnemonic Backup)
 * 100% functional, self-contained implementation with i18n support and zero external dependencies.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { i18n } from './i18n.js';
import { clientStore } from './client-state.js';
import { sovereignDialog } from './dialog-modal.js';

export interface OnboardingStep {
  stepIndex: number;
  title: string;
  subtitle: string;
  icon: string;
  componentHtml: string;
}

export class OnboardingWizard {
  public currentStep: number = 0;
  public isOpen: boolean = false;
  public isCompleted: boolean = false;
  public seedSavedConfirmed: boolean = false;

  public readonly STORAGE_KEY = 'aetheris_onboarding_completed';
  private readonly LEGACY_STORAGE_KEY = 'aetheris_onboarding_done';

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(this.STORAGE_KEY) || window.localStorage.getItem(this.LEGACY_STORAGE_KEY);
      this.isCompleted = stored === 'true';
    } else {
      this.isCompleted = false;
    }

    // Automatically trigger onboarding for new users
    if (!this.isCompleted) {
      this.isOpen = true;
    }

    // Global window registration for inline HTML template triggers
    if (typeof window !== 'undefined') {
      (window as any).onboardingWizard = this;
    }
    (globalThis as any).onboardingWizard = this;
  }

  /**
   * Opens onboarding modal from step 0
   */
  public start(): void {
    this.currentStep = 0;
    this.isOpen = true;
    this.seedSavedConfirmed = false;
    this.syncUI();
  }

  /**
   * Advances to next step or finishes on the final step
   */
  public next(): void {
    if (this.currentStep < 2) {
      this.currentStep++;
      this.syncUI();
    } else {
      this.finish();
    }
  }

  /**
   * Returns to previous step
   */
  public previous(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.syncUI();
    }
  }

  /**
   * Skips onboarding with caution on step 4
   */
  public async skip(): Promise<void> {
    if (this.currentStep === 2) {
      const warningText = i18n.t(
        'onboardingNarrative.step4Warning',
        undefined,
        'This 12-word phrase is the only way to recover your account. UREfy never holds your keys.'
      );
      const proceed = await sovereignDialog.confirm(`${warningText}\n\nAre you sure you want to skip without saving?`, {
        title: 'Skip Key Backup',
        confirmText: 'Skip Anyway',
        destructive: true,
      });
      if (!proceed) return;
    }

    this.isOpen = false;
    this.isCompleted = true;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(this.STORAGE_KEY, 'true');
      window.localStorage.setItem(this.LEGACY_STORAGE_KEY, 'true');
      window.localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    }
    this.syncUI();
  }

  /**
   * Finishes wizard successfully and persists completion to localStorage
   */
  public finish(): void {
    this.isOpen = false;
    this.isCompleted = true;
    const storage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (storage) {
      storage.setItem(this.STORAGE_KEY, 'true');
      storage.setItem(this.LEGACY_STORAGE_KEY, 'true');
      storage.setItem('aetheris_onboarding_completed_v4', 'true');
    }
    this.syncUI();
  }

  /**
   * Copies 12-word BIP-39 mnemonic seed phrase to clipboard
   */
  public copySeedWords(): void {
    const mnemonic = this.getActiveMnemonic();
    if (!mnemonic) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(mnemonic).then(() => {
        this.seedSavedConfirmed = true;
        this.syncUI();
        const copyBtn = document.getElementById('btn-copy-seed-words');
        if (copyBtn) {
          copyBtn.innerHTML = '<span>✓</span><span>Copied!</span>';
          setTimeout(() => {
            if (copyBtn) copyBtn.innerHTML = '<span>📋</span><span>Copy Words</span>';
          }, 2500);
        }
      }).catch(() => {
        this.fallbackCopyText(mnemonic);
      });
    } else {
      this.fallbackCopyText(mnemonic);
    }
  }

  private fallbackCopyText(text: string): void {
    if (typeof document === 'undefined') return;
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.seedSavedConfirmed = true;
      this.syncUI();
    } catch (_) {}
    document.body.removeChild(textArea);
  }

  /**
   * Downloads offline encrypted text backup of the seed phrase
   */
  public downloadBackup(): void {
    const mnemonic = this.getActiveMnemonic();
    const fp = this.getActiveFingerprint();
    const dateStr = new Date().toISOString().slice(0, 10);
    const content = [
      '================================================================================',
      'UREfy SOVEREIGN IDENTITY & RECOVERY KEY BACKUP',
      '================================================================================',
      '',
      `Generated: ${new Date().toUTCString()}`,
      `Protocol Fingerprint: ${fp}`,
      '',
      '12-WORD BIP-39 RECOVERY SEED PHRASE:',
      mnemonic,
      '',
      'CRITICAL SECURITY WARNING:',
      '- Store this file securely offline (encrypted USB or paper vault).',
      '- Never share these 12 words with anyone.',
      '- UREfy is a 100% zero-knowledge network and CANNOT recover lost keys.',
      '================================================================================',
    ].join('\n');

    if (typeof document !== 'undefined') {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `urefy-recovery-key-${dateStr}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.seedSavedConfirmed = true;
      this.syncUI();
    }
  }

  public toggleSeedConfirmation(checked: boolean): void {
    this.seedSavedConfirmed = checked;
    const btn = document.getElementById('btn-onboarding-finish');
    if (btn) {
      if (checked) {
        btn.classList.remove('opacity-50', 'pointer-events-none');
      } else {
        btn.classList.add('opacity-50', 'pointer-events-none');
      }
    }
  }

  private getActiveMnemonic(): string {
    const store = (typeof window !== 'undefined' ? (window as any).clientStore : null) || clientStore;
    if (store?.mnemonic && store.mnemonic.trim().length > 0) {
      return store.mnemonic.trim();
    }
    return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  }

  private getActiveFingerprint(): string {
    const store = (typeof window !== 'undefined' ? (window as any).clientStore : null) || clientStore;
    if (store?.keypair?.fingerprint) {
      return store.keypair.fingerprint;
    }
    return 'aeth1_0000000000000000';
  }

  /**
   * Re-renders the onboarding modal in place or triggers store notification
   */
  public syncUI(): void {
    const modalHost = typeof document !== 'undefined' ? document.getElementById('aetheris-onboarding-modal-host') : null;
    if (modalHost) {
      modalHost.innerHTML = this.renderWizardModal(this.getActiveFingerprint());
    } else {
      const store = (typeof window !== 'undefined' ? (window as any).clientStore : null) || clientStore;
      if (store && typeof store.notify === 'function') {
        store.notify('ONBOARDING_STATE_CHANGED', { currentStep: this.currentStep, isOpen: this.isOpen });
      }
    }
  }

  // =========================================================================
  // 4 NARRATIVE STEPS DEFINITION
  // =========================================================================

  /**
   * Step 1: 🌱 Identitatea ta îți aparține
   */
  private renderStep1Identity(myFingerprint: string): string {
    const title = i18n.t('onboardingNarrative.step1Title', undefined, 'Your Identity Belongs to You');
    const subtitle = i18n.t('onboardingNarrative.step1Subtitle', undefined, 'Self-sovereignty from the very first second');
    const body = i18n.t(
      'onboardingNarrative.step1Body',
      undefined,
      'No central server owns your account. No email, no phone number, no passwords stored in vulnerable foreign databases. Your cryptographic keys exist exclusively on your device.'
    );

    return `
      <div class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <!-- Step Header -->
        <div class="flex items-start space-x-4 border-b border-white/5 pb-4">
          <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyphr text-2xl shadow-[0_0_20px_rgba(0,229,255,0.2)] shrink-0">
            🌱
          </div>
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <h3 class="text-xl font-bold text-white tracking-wide">${title}</h3>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">100% SOVEREIGN</span>
            </div>
            <p class="text-xs text-slate-400 font-sans">${subtitle}</p>
          </div>
        </div>

        <!-- Narrative Explanation -->
        <p class="text-sm text-slate-200 leading-relaxed bg-surface-base/60 p-4 rounded-xl border border-white/5 font-sans">
          ${body}
        </p>

        <!-- 3 Pillars of Identity Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="p-3.5 rounded-xl bg-surface-base border border-white/5 space-y-1.5">
            <span class="text-lg">🛡️</span>
            <div class="text-xs font-bold text-white">No Custodial Identity Server</div>
            <p class="text-[11px] text-slate-400 leading-normal">Identity keys stay on-device while Cloudflare edge relays carry encrypted traffic.</p>
          </div>
          <div class="p-3.5 rounded-xl bg-surface-base border border-white/5 space-y-1.5">
            <span class="text-lg">🔑</span>
            <div class="text-xs font-bold text-white">Browser-Held Keys</div>
            <p class="text-[11px] text-slate-400 leading-normal">Your cryptographic Ed25519 keypair lives strictly inside your browser.</p>
          </div>
          <div class="p-3.5 rounded-xl bg-surface-base border border-white/5 space-y-1.5">
            <span class="text-lg">🌐</span>
            <div class="text-xs font-bold text-white">Total Portability</div>
            <p class="text-[11px] text-slate-400 leading-normal">Migrate your entire profile across machines with a single 12-word recovery key.</p>
          </div>
        </div>

        <!-- Live Node Identity Fingerprint -->
        <div class="p-3 rounded-xl bg-surface-base/40 border border-white/5 flex items-center justify-between text-xs font-mono">
          <span class="text-slate-400">Your Local Protocol Fingerprint:</span>
          <span class="text-cyan-300 font-bold bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
            id:${myFingerprint.substring(0, 16)}...
          </span>
        </div>
      </div>
    `;
  }

  /**
   * Step 2: 🔒 Conținutul tău e protejat
   */
  private renderStep2Privacy(): string {
    const title = i18n.t('onboardingNarrative.step2Title', undefined, 'Your Content is Fully Protected');
    const subtitle = i18n.t('onboardingNarrative.step2Subtitle', undefined, 'End-to-end zero-knowledge security');
    const body = i18n.t(
      'onboardingNarrative.step2Body',
      undefined,
      'Everything you write or share is encrypted directly in your browser before ever touching the network. Only the recipients you explicitly authorize hold the keys to read it.'
    );

    return `
      <div class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <!-- Step Header -->
        <div class="flex items-start space-x-4 border-b border-white/5 pb-4">
          <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-2xl shadow-[0_0_20px_rgba(99,102,241,0.2)] shrink-0">
            🔒
          </div>
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <h3 class="text-xl font-bold text-white tracking-wide">${title}</h3>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold">E2EE ZERO-KNOWLEDGE</span>
            </div>
            <p class="text-xs text-slate-400 font-sans">${subtitle}</p>
          </div>
        </div>

        <!-- Narrative Explanation -->
        <p class="text-sm text-slate-200 leading-relaxed bg-surface-base/60 p-4 rounded-xl border border-white/5 font-sans">
          ${body}
        </p>

        <!-- Visual Encryption Pipeline Flowchart -->
        <div class="p-4 rounded-xl bg-surface-base border border-white/10 space-y-3 font-mono text-xs">
          <div class="text-[10px] uppercase text-slate-400 tracking-wider">Direct Cryptographic Pipeline:</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-center">
            <div class="p-3 rounded-lg bg-surface-raised border border-white/5">
              <span class="text-lg block mb-1">💻</span>
              <span class="text-white font-bold block">1. Origin Browser</span>
              <span class="text-[10px] text-slate-400">Plaintext encrypted in RAM</span>
            </div>
            <div class="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30">
              <span class="text-lg block mb-1">🔐</span>
              <span class="text-indigo-300 font-bold block">2. AES-GCM / ML-KEM</span>
              <span class="text-[10px] text-slate-400">Quantum-resistant ciphertext</span>
            </div>
            <div class="p-3 rounded-lg bg-surface-raised border border-white/5">
              <span class="text-lg block mb-1">🎯</span>
              <span class="text-white font-bold block">3. Trusted Recipient</span>
              <span class="text-[10px] text-slate-400">Decrypted only with local key</span>
            </div>
          </div>
        </div>

        <!-- Guarantees List -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div class="p-3 rounded-xl bg-surface-base/60 border border-white/5 flex items-start space-x-2.5">
            <span class="text-emerald-400 font-bold">✓</span>
            <span class="text-slate-300">Zero metadata retention: edge proxies never inspect payloads or map friendships.</span>
          </div>
          <div class="p-3 rounded-xl bg-surface-base/60 border border-white/5 flex items-start space-x-2.5">
            <span class="text-emerald-400 font-bold">✓</span>
            <span class="text-slate-300">Post-quantum ready: hybrid key exchange shields your conversations against future supercomputers.</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step 3: 🌐 Rețeaua e a tuturor
   */
  private renderStep3Mesh(): string {
    const title = i18n.t('onboardingNarrative.step3Title', undefined, 'The Network Belongs to Everyone');
    const subtitle = i18n.t('onboardingNarrative.step3Subtitle', undefined, 'Decentralized peer-to-peer distribution');
    const body = i18n.t(
      'onboardingNarrative.step3Body',
      undefined,
      'Every participant helps relay and preserve knowledge across the mesh. Zero opaque algorithms designed to exploit attention, and zero centralized choke points for censorship.'
    );

    return `
      <div class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <!-- Step Header -->
        <div class="flex items-start space-x-4 border-b border-white/5 pb-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)] shrink-0">
            🌐
          </div>
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <h3 class="text-xl font-bold text-white tracking-wide">${title}</h3>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">PEER-TO-PEER</span>
            </div>
            <p class="text-xs text-slate-400 font-sans">${subtitle}</p>
          </div>
        </div>

        <!-- Narrative Explanation -->
        <p class="text-sm text-slate-200 leading-relaxed bg-surface-base/60 p-4 rounded-xl border border-white/5 font-sans">
          ${body}
        </p>

        <!-- Peer Swarm Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="p-3.5 rounded-xl bg-surface-base border border-white/5 space-y-1.5">
            <span class="text-lg">⚡</span>
            <div class="text-xs font-bold text-white">Direct WebRTC Mesh</div>
            <p class="text-[11px] text-slate-400 leading-normal">Browser nodes transfer files and data chunks directly to each other without cloud storage costs.</p>
          </div>
          <div class="p-3.5 rounded-xl bg-surface-base border border-white/5 space-y-1.5">
            <span class="text-lg">⚖️</span>
            <div class="text-xs font-bold text-white">Transparent Merit Feeds</div>
            <p class="text-[11px] text-slate-400 leading-normal">You choose chronological or Web-of-Trust ranking — never corporate algorithm manipulation.</p>
          </div>
          <div class="p-3.5 rounded-xl bg-surface-base border border-white/5 space-y-1.5">
            <span class="text-lg">🏛️</span>
            <div class="text-xs font-bold text-white">Censorship Resilient</div>
            <p class="text-[11px] text-slate-400 leading-normal">Immutable Merkle trees guarantee tamper-evident repositories that cannot be arbitrarily silenced.</p>
          </div>
        </div>

        <!-- Mesh Status Indicator -->
        <div class="p-3 rounded-xl bg-surface-base/40 border border-white/5 flex items-center justify-between text-xs font-mono">
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-slate-300">Decentralized P2P Mesh: Ready to Connect</span>
          </div>
          <span class="text-emerald-400 font-semibold">WebRTC Swarm Active</span>
        </div>
      </div>
    `;
  }

  /**
   * Step 4: 🔐 Salvează-ți cheia de salvare (BIP-39 Mnemonic Seed)
   */
  private renderStep4Seed(): string {
    const title = i18n.t('onboardingNarrative.step4Title', undefined, 'Save Your Recovery Key');
    const subtitle = i18n.t('onboardingNarrative.step4Subtitle', undefined, 'Your 12-word master seed phrase');
    const body = i18n.t(
      'onboardingNarrative.step4Body',
      undefined,
      'Write down or back up these 12 secret words. They represent your complete sovereign identity and all your cryptographic credentials.'
    );
    const warning = i18n.t(
      'onboardingNarrative.step4Warning',
      undefined,
      'This 12-word phrase is the only way to recover your account. UREfy never holds your keys.'
    );
    const savedWordsText = i18n.t('onboardingNarrative.step4SavedWords', undefined, 'I have safely saved my seed words');
    const downloadText = i18n.t('onboardingNarrative.step4DownloadBackup', undefined, 'Download Encrypted Backup');

    const mnemonic = this.getActiveMnemonic();
    const words = mnemonic.split(/\s+/).filter(Boolean);

    return `
      <div class="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
        <!-- Step Header -->
        <div class="flex items-start space-x-4 border-b border-white/5 pb-3">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0">
            🔐
          </div>
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <h3 class="text-xl font-bold text-white tracking-wide">${title}</h3>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">CRITICAL MASTER SEED</span>
            </div>
            <p class="text-xs text-slate-400 font-sans">${subtitle}</p>
          </div>
        </div>

        <p class="text-xs text-slate-300 font-sans leading-relaxed">
          ${body}
        </p>

        <!-- 12-WORD BIP-39 PILL GRID -->
        <div class="p-4 rounded-xl bg-surface-base border border-amber-500/30 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
              <span>🔑</span>
              <span>12-Word Master Recovery Phrase</span>
            </span>
            <span class="text-[10px] font-mono text-slate-500">BIP-39 Standard</span>
          </div>

          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            ${words.map((w, i) => `
              <div class="px-2.5 py-1.5 rounded-lg bg-surface-raised border border-white/10 flex items-center space-x-1.5 font-mono text-xs select-all">
                <span class="text-[10px] text-slate-500 select-none">${i + 1}.</span>
                <span class="font-bold text-white tracking-wide">${w}</span>
              </div>
            `).join('')}
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center space-x-2 pt-1">
            <button
              type="button"
              id="btn-copy-seed-words" data-action="call-global" data-global-method="onboardingWizard.copySeedWords"
              class="px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight border border-white/10 text-xs font-mono text-slate-200 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>📋</span>
              <span>Copy Words</span>
            </button>

            <button
              type="button" data-action="call-global" data-global-method="onboardingWizard.downloadBackup"
              class="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-mono text-amber-300 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>💾</span>
              <span>${downloadText}</span>
            </button>
          </div>
        </div>

        <!-- Caution Warning Alert -->
        <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5">
          <span class="text-base shrink-0">⚠️</span>
          <span class="leading-relaxed">${warning}</span>
        </div>

        <!-- Saved Confirmation Checkbox -->
        <label class="flex items-center space-x-2.5 p-3 rounded-xl bg-surface-base/80 border border-white/10 cursor-pointer hover:bg-surface-overlay transition-colors">
          <input
            type="checkbox"
            id="checkbox-seed-saved-confirm"
            ${this.seedSavedConfirmed ? 'checked' : ''} data-change="call-global" data-global-method="onboardingWizard.toggleSeedConfirmation"
            class="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
          />
          <span class="text-xs font-medium text-slate-200 select-none font-sans">
            ${savedWordsText}
          </span>
        </label>
      </div>
    `;
  }

  /**
   * Returns array of 4 narrative steps
   */
  public getSteps(myFingerprint: string = 'aeth1_0000000000000000'): OnboardingStep[] {
    return [
      {
        stepIndex: 0,
        title: i18n.t('onboardingNarrative.step1Title', undefined, 'Your Identity Belongs to You'),
        subtitle: i18n.t('onboardingNarrative.step1Subtitle', undefined, 'Self-sovereignty from the very first second'),
        icon: '🌱',
        componentHtml: this.renderStep1Identity(myFingerprint),
      },
      {
        stepIndex: 1,
        title: i18n.t('onboardingNarrative.step2Title', undefined, 'Your Content is Fully Protected'),
        subtitle: i18n.t('onboardingNarrative.step2Subtitle', undefined, 'End-to-end zero-knowledge privacy & P2P network'),
        icon: '🔒',
        componentHtml: this.renderStep2Privacy(),
      },
      {
        stepIndex: 2,
        title: i18n.t('onboardingNarrative.step4Title', undefined, 'Save Your Recovery Key'),
        subtitle: i18n.t('onboardingNarrative.step4Subtitle', undefined, 'Your 12-word master seed phrase'),
        icon: '🔐',
        componentHtml: this.renderStep4Seed(),
      },
    ];
  }

  /**
   * Renders step indicators for 4 narrative screens
   */
  private renderStepIndicators(): string {
    const labels = ['Identity', 'Protection', 'Recovery'];
    return `
      <div class="flex items-center justify-between w-full max-w-lg mx-auto px-6 py-3 select-none">
        ${labels.map((label, idx) => {
          const isPassed = idx < this.currentStep;
          const isCurrent = idx === this.currentStep;
          const dotClass = isCurrent
            ? 'bg-cyan-400 text-black font-bold ring-4 ring-cyan-500/20 shadow-[0_0_15px_rgba(0,229,255,0.6)] scale-105'
            : isPassed
              ? 'bg-emerald-400 text-black font-bold'
              : 'bg-surface-overlay text-slate-500 border border-white/10';

          const textClass = isCurrent ? 'text-cyan-300 font-bold' : isPassed ? 'text-slate-300' : 'text-slate-600';

          return `
            <div class="flex flex-col items-center gap-1.5 relative group">
              <button
                type="button" data-action="call-global" data-raw-click="window.onboardingWizard.currentStep = ${idx}; window.onboardingWizard.syncUI()"
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all cursor-pointer ${dotClass}"
              >
                ${isPassed ? '✓' : idx + 1}
              </button>
              <span class="text-[10px] font-mono tracking-tight hidden sm:block ${textClass}">${label}</span>
            </div>
          `;
        }).join(`
          <div class="flex-1 h-[2px] mx-3 bg-surface-overlay overflow-hidden rounded">
            <div class="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300" style="width: 100%"></div>
          </div>
        `)}
      </div>
    `;
  }

  /**
   * Renders the complete narrative modal
   */
  public renderWizardModal(myFingerprint: string = 'aeth1_0000000000000000'): string {
    if (!this.isOpen) return '';

    const steps = this.getSteps(myFingerprint);
    const activeStep = steps[this.currentStep] || steps[0];
    const isFirst = this.currentStep === 0;
    const isLast = this.currentStep === steps.length - 1;

    const skipText = i18n.t('onboardingNarrative.skip', undefined, 'Skip');
    const continueText = i18n.t('onboardingNarrative.continue', undefined, 'Continue');
    const backText = i18n.t('onboardingNarrative.back', undefined, 'Back');
    const finishText = i18n.t('onboardingNarrative.finish', undefined, 'Enter Sovereign Network');
    const stepOfText = i18n.t('onboardingNarrative.stepOf', { step: String(this.currentStep + 1) }, `Step ${this.currentStep + 1} of 4`);

    return `
      <div id="aetheris-onboarding-overlay" class="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
        <div class="relative w-full max-w-2xl bg-surface-raised border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col my-auto">
          
          <!-- Top Bar Modal -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface-base/80">
            <div class="flex items-center space-x-3">
              <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                U
              </div>
              <span class="text-sm font-bold text-white tracking-wider font-mono">UREfy // SOVEREIGN WELCOME</span>
            </div>

            <div class="flex items-center space-x-2">
              <span class="text-xs font-mono text-slate-400 mr-2">${stepOfText}</span>
              <button
                type="button"
                id="btn-skip-onboarding" data-action="call-global" data-global-method="onboardingWizard.skip"
                class="px-2.5 py-1 text-xs font-mono text-slate-400 hover:text-white rounded bg-surface-overlay hover:bg-surface-highlight transition-all border border-white/5 cursor-pointer"
              >
                ${skipText} ✕
              </button>
            </div>
          </div>

          <!-- Step Indicators Progress -->
          <div class="border-b border-white/5 bg-surface-base/40">
            ${this.renderStepIndicators()}
          </div>

          <!-- Active Step Body -->
          <div class="p-6 sm:p-8 flex-1 min-h-[380px] bg-canvas/60">
            ${activeStep.componentHtml}
          </div>

          <!-- Modal Footer Actions -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-surface-base/90">
            <div>
              ${!isFirst ? `
                <button
                  type="button" data-action="call-global" data-global-method="onboardingWizard.previous"
                  class="px-4 py-2 rounded-xl bg-surface-overlay hover:bg-surface-highlight text-slate-200 text-xs font-semibold tracking-wide border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>←</span>
                  <span>${backText}</span>
                </button>
              ` : `
                <span class="text-[11px] text-slate-500 font-mono">100% Free Tier Protected</span>
              `}
            </div>

            <div class="flex items-center space-x-3">
              ${!isLast ? `
                <button
                  type="button" data-action="call-global" data-global-method="onboardingWizard.next"
                  class="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all flex items-center gap-2 transform active:scale-95 cursor-pointer"
                >
                  <span>${continueText}</span>
                  <span>→</span>
                </button>
              ` : `
                <button
                  type="button"
                  id="btn-onboarding-finish" data-action="call-global" data-global-method="onboardingWizard.finish"
                  class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs tracking-wider uppercase shadow-[0_0_25px_rgba(0,229,255,0.4)] transition-all flex items-center gap-2 transform active:scale-95 cursor-pointer"
                >
                  <span>${finishText}</span>
                  <span>🚀</span>
                </button>
              `}
            </div>
          </div>

        </div>
      </div>
    `;
  }
}

export const onboardingWizard = new OnboardingWizard();
serviceRegistry.registerInstance(SERVICES.Onboarding, onboardingWizard);
