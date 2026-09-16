import { clientStore } from './client-state.js';
import { toastManager } from './toast.js';
import { validateMnemonic } from '@aetheris/core-crypto';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { t } from './i18n.js';

export class SovereignMnemonicModal {
  public isOpen: boolean = false;
  public activeTab: 'backup' | 'restore' | 'quiz' = 'backup';
  public isRevealed: boolean = false;
  public quizIndices: number[] = [2, 6, 10]; // 0-based: 3rd, 7th, 11th word
  public quizAnswers: { [key: number]: string } = {};
  public quizPassed: boolean = false;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      this.quizPassed = localStorage.getItem('aetheris_seed_verified') === 'true';
    }
  }

  public generateRandomQuizIndices(): number[] {
    const indices: number[] = [];
    while (indices.length < 3) {
      const rand = Math.floor(Math.random() * 12);
      if (!indices.includes(rand)) indices.push(rand);
    }
    return indices.sort((a, b) => a - b);
  }

  public openModal(tab: 'backup' | 'restore' | 'quiz' = 'backup'): void {
    this.isOpen = true;
    this.activeTab = tab;
    this.isRevealed = false;
    this.quizIndices = this.generateRandomQuizIndices();
    clientStore.notify();
  }

  public remindLater(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('urefy_backup_remind_later', Date.now().toString());
    }
    toastManager.info('We will remind you to verify your backup phrase later.', '⏱️');
    this.closeModal();
  }

  public closeModal(): void {
    this.isOpen = false;
    this.isRevealed = false;
    this.quizAnswers = {};
    clientStore.notifySync();
  }

  public toggleReveal(): void {
    this.isRevealed = !this.isRevealed;
    clientStore.notify();
  }

  public copyMnemonic(): void {
    const phrase = clientStore.mnemonic;
    if (!phrase) {
      toastManager.warning('No active mnemonic seed phrase found', '⚠️');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(phrase).then(() => {
        toastManager.success('Seed phrase copied to clipboard — store it safely offline!', '🔐');
      }).catch(() => {
        toastManager.info('Select and copy the seed words manually', 'ℹ️');
      });
    }
  }

  public submitQuiz(answers: { [key: number]: string }): boolean {
    const words = clientStore.mnemonic.trim().toLowerCase().split(/\s+/);
    let allCorrect = true;

    for (const idx of this.quizIndices) {
      const expected = words[idx];
      const provided = (answers[idx] || '').trim().toLowerCase();
      if (expected !== provided) {
        allCorrect = false;
        break;
      }
    }

    if (allCorrect) {
      this.quizPassed = true;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aetheris_seed_verified', 'true');
      }
      toastManager.success('Backup verified! Your sovereign identity is secured.', '🛡️');
      this.activeTab = 'backup';
      clientStore.notify();
      return true;
    } else {
      toastManager.warning('Verification failed: word mismatch. Check your backup.', '⚠️');
      return false;
    }
  }

  public async restore(phrase: string): Promise<boolean> {
    const clean = phrase.trim().toLowerCase();
    if (!validateMnemonic(clean)) {
      toastManager.warning('Invalid BIP-39 mnemonic phrase or checksum error', '⚠️');
      return false;
    }
    const success = clientStore.restoreIdentityFromMnemonic(clean);
    if (success) {
      try { await clientStore.identityPersistence; }
      catch {
        toastManager.warning('The identity could not be saved. Keep this recovery phrase and retry.', '⚠️');
        return false;
      }
      this.quizPassed = true;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aetheris_seed_verified', 'true');
      }
      this.closeModal();
    }
    return success;
  }

  public downloadMnemonic(): void {
    const phrase = clientStore.mnemonic;
    if (!phrase) {
      toastManager.warning('No active mnemonic seed phrase found', '⚠️');
      return;
    }
    const blob = new Blob([phrase], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urefy-seed-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toastManager.success('Seed phrase downloaded successfully', '💾');
  }

  public renderModalHTML(): string {
    if (!this.isOpen) return '';

    const wordCount = clientStore.mnemonic.trim().split(/\s+/).length;
    const words = this.isRevealed ? clientStore.mnemonic.trim().split(/\s+/) : Array.from({ length: wordCount }, () => '----');

    return `
      <div id="mnemonic-vault-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4 animate-fade-in pointer-events-auto" data-action="close-feature">
        <div class="bg-surface-base border border-white/15 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6 relative overflow-hidden" data-action="stop-propagation">
          
          <!-- MODAL HEADER -->
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/30 border border-amber-500/40 flex items-center justify-center text-amber-300 text-lg shadow-inner">
                🔐
              </div>
              <div>
                <h3 class="text-base font-bold text-white tracking-wide font-sans flex items-center space-x-2">
                  <span>Back up your recovery phrase <span class="sr-only">Sovereign Identity Seed Vault</span></span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-semibold">BIP-39</span>
                </h3>
                <p class="text-xs text-slate-400 font-sans">Keep your account safe by writing down your 12 recovery words.</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-mnemonic-modal" data-action="close-feature"
              class="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-sm font-mono"
              aria-label="${t('modal.close', undefined, 'Close')}"
              title="${t('modal.close', undefined, 'Close')}"
            >
              ✕
            </button>
          </div>

          <!-- TABS -->
          <div class="flex items-center space-x-2 bg-surface-raised p-1 rounded-2xl border border-white/5">
            <button
              type="button"
              id="tab-mnemonic-backup"
              data-action="mnemonic-set-tab" data-tab="backup"
              class="flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'backup' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}"
            >
              📜 Backup Phrase
            </button>
            <button
              type="button"
              id="tab-mnemonic-quiz"
              data-action="mnemonic-set-tab" data-tab="quiz"
              class="flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'quiz' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}"
            >
              🛡️ Verify Backup ${this.quizPassed ? '✅' : ''}
            </button>
            <button
              type="button"
              id="tab-mnemonic-restore"
              data-action="mnemonic-set-tab" data-tab="restore"
              class="flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'restore' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}"
            >
              🔄 Restore Account
            </button>
          </div>

          <!-- TAB CONTENT: BACKUP -->
          ${this.activeTab === 'backup' ? `
            <div class="space-y-4">
              <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start space-x-3">
                <span class="text-base shrink-0">⚠️</span>
                <div>
                  <span class="font-bold">Never share this seed phrase with anyone.</span>
                  <p class="text-[11px] text-amber-300/80 mt-0.5">Anyone holding these 12 words can sign messages, decrypt your direct messages, and control your node.</p>
                </div>
              </div>

              <!-- 12-WORD GRID -->
              <div class="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-surface-raised/80 border border-white/10 relative select-none">
                ${words.map((word, i) => `
                  <div class="flex items-center space-x-2 bg-surface-base px-3 py-2 rounded-xl border border-white/5 text-xs font-mono">
                    <span class="text-slate-500 text-[10px] w-4 text-right">${String(i + 1).padStart(2, '0')}</span>
                    <span class="font-bold tracking-wide transition-all ${this.isRevealed ? 'text-slate-100' : 'text-slate-500 blur-[4px]'}">${word}</span>
                  </div>
                `).join('')}

                ${!this.isRevealed ? `
                  <div class="absolute inset-0 bg-surface-base/70 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center space-y-2">
                    <span class="text-2xl">👁️‍🗨️</span>
                    <button
                      type="button"
                      id="btn-reveal-seed"
                      data-action="mnemonic-toggle-reveal"
                      class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
                    >
                      Click to Reveal Seed Phrase
                    </button>
                  </div>
                ` : ''}
              </div>

              <!-- CONTROLS -->
              <div class="flex items-center justify-between pt-2">
                <button
                  type="button"
                  id="btn-toggle-mask-seed"
                  data-action="mnemonic-toggle-reveal"
                  class="px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <span>${this.isRevealed ? '🙈 Hide Words' : '👁️ Reveal Words'}</span>
                </button>

                <div class="flex items-center space-x-2">
                  <button
                    type="button"
                    id="btn-copy-seed-phrase"
                    data-action="mnemonic-copy"
                    class="px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 hover:text-white text-xs font-bold border border-white/10 transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>📋 Copy</span>
                  </button>
                  <button
                    type="button"
                    id="btn-download-seed-phrase"
                    data-action="mnemonic-download"
                    class="px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 hover:text-white text-xs font-bold border border-white/10 transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>💾 Download</span>
                  </button>
                  <button
                    type="button"
                    id="btn-mnemonic-remind-later"
                    data-action="mnemonic-remind-later"
                    class="px-3 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-slate-200 text-xs font-medium border border-white/5 transition-colors cursor-pointer"
                  >
                    Remind me later
                  </button>
                  <button
                    type="button"
                    id="btn-goto-quiz"
                    data-action="mnemonic-set-tab" data-tab="quiz"
                    class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>🛡️ Verify</span>
                  </button>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- TAB CONTENT: QUIZ -->
          ${this.activeTab === 'quiz' ? `
            <div class="space-y-4">
              <p class="text-xs text-slate-300 font-sans">
                Confirm your backup by entering the corresponding words from your 12-word seed phrase:
              </p>

              <div class="space-y-3">
                ${this.quizIndices.map(idx => `
                  <div class="flex items-center space-x-3 bg-surface-raised p-3 rounded-2xl border border-white/10">
                    <label class="text-xs font-mono text-slate-400 w-24">Word #${idx + 1}:</label>
                    <input
                      type="text"
                      id="quiz-word-${idx}"
                      placeholder="Enter word #${idx + 1}..."
                      autocomplete="off"
                      autocorrect="off"
                      autocapitalize="off"
                      spellcheck="false"
                      class="flex-1 bg-surface-base border border-white/15 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                `).join('')}
              </div>

              <div class="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  id="btn-cancel-quiz"
                  data-action="mnemonic-set-tab" data-tab="backup"
                  class="px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 text-xs font-medium border border-white/10 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  id="btn-submit-quiz"
                  data-action="mnemonic-submit-quiz"
                  class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
                >
                  Verify & Lock Backup
                </button>
              </div>
            </div>
          ` : ''}

          <!-- TAB CONTENT: RESTORE -->
          ${this.activeTab === 'restore' ? `
            <div class="space-y-4">
              <div class="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
                Paste or type your 12 or 24-word BIP-39 mnemonic seed phrase below to restore your cryptographic identity and access your messages.
              </div>

              <textarea
                id="input-restore-mnemonic"
                data-input="mnemonic-validate-restore"
                rows="4"
                placeholder="abandon ability able about above absent absorb abstract absurd abuse access accident..."
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                class="w-full bg-surface-raised border border-white/15 rounded-2xl p-3.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              ></textarea>

              <div class="flex items-center justify-between pt-2">
                <span id="restore-validation-status" class="text-[11px] font-mono text-slate-400">
                  Awaiting 12 or 24 words
                </span>
                <button
                  type="button"
                  id="btn-execute-restore"
                  data-action="mnemonic-execute-restore"
                  class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
                >
                  Restore Identity
                </button>
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }
  public bindEvents(): void {
    // Events are handled by action-dispatcher.ts
  }
}

export const sovereignMnemonicModal = new SovereignMnemonicModal();
serviceRegistry.registerInstance(SERVICES.MnemonicModal, sovereignMnemonicModal);

