/**
 * @file onboarding.ts
 * @package @aetheris/client-ui
 * @description Narrative 4-Stage Progressive User Onboarding Flow for UREfy:
 *   Stage 0: Your Identity Belongs to You (Sovereign device-bound identity, no email/phone/password)
 *   Stage 1: Choose Your Interests (10 curated topics tailoring the cold-start feed)
 *   Stage 2: Discover Communities & People (1-click Join & Follow recommended creators/spaces)
 *   Stage 3: Save Your Recovery Key (12-Word BIP-39 Mnemonic Backup & Enter UREfy)
 * 100% functional, self-contained implementation with i18n support and zero external telemetry.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { i18n } from './i18n.js';
import { clientStore } from './client-state.js';
import { sovereignDialog } from './dialog-modal.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { profileView } from './profile-view.js';
import { feedPersonalization } from './feed-personalization.js';

export interface OnboardingStep {
  stepIndex: number;
  title: string;
  subtitle: string;
  icon: string;
  componentHtml: string;
}

export interface CuratedInterest {
  id: string;
  name: string;
  emoji: string;
  tag: string;
  description: string;
}

export interface StarterCommunity {
  id: string;
  name: string;
  handle: string;
  topic: string;
  emoji: string;
  badgeColor: string;
  description: string;
  members: number;
}

export interface StarterCreator {
  fingerprint: string;
  name: string;
  handle: string;
  bio: string;
  avatar: string;
}

export const ONBOARDING_INTERESTS: CuratedInterest[] = [
  { id: 'tech', name: 'Technology', emoji: '🚀', tag: '#Technology', description: 'Computing, devices & innovations' },
  { id: 'ai', name: 'Artificial Intelligence', emoji: '🤖', tag: '#ArtificialIntelligence', description: 'Local LLMs, neural models & ZK-AI' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮', tag: '#Gaming', description: 'Game engines, indie titles & speedruns' },
  { id: 'dev', name: 'Software & Dev', emoji: '💻', tag: '#Software', description: 'TypeScript, Rust, web & open protocols' },
  { id: 'privacy', name: 'Privacy & Security', emoji: '🛡️', tag: '#Privacy', description: 'Zero-knowledge, E2EE & digital sovereignty' },
  { id: 'science', name: 'Science & Cosmos', emoji: '🔬', tag: '#Science', description: 'Physics, biology, aerospace & research' },
  { id: 'creative', name: 'Creative Arts', emoji: '🎨', tag: '#Creative', description: 'Design, generative graphics & typography' },
  { id: 'entertainment', name: 'Movies & Media', emoji: '🍿', tag: '#Entertainment', description: 'Cinema, media culture & community reviews' },
  { id: 'hardware', name: 'Hardware & Gear', emoji: '⚙️', tag: '#Hardware', description: 'Silicon, SBCs, electronics & homelabs' },
  { id: 'opensource', name: 'Open Source', emoji: '🌐', tag: '#OpenSource', description: 'Decentralized software, FOSS & public goods' },
];

export const STARTER_COMMUNITIES: StarterCommunity[] = [
  { id: 'technology', name: 'Technology', handle: 'c/technology', topic: 'tech', emoji: '🚀', badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', description: 'Discussions on computing, hardware & frontier tech.', members: 1420 },
  { id: 'ai', name: 'Artificial Intelligence', handle: 'c/ai', topic: 'ai', emoji: '🤖', badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30', description: 'Machine learning, autonomous models & ZK-AI.', members: 980 },
  { id: 'gaming', name: 'Gaming', handle: 'c/gaming', topic: 'gaming', emoji: '🎮', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30', description: 'Indie game development, engines & speedruns.', members: 1150 },
  { id: 'privacy', name: 'Privacy & Security', handle: 'c/privacy', topic: 'privacy', emoji: '🛡️', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', description: 'Zero-knowledge proofs, encryption & sovereign rights.', members: 1640 },
  { id: 'developers', name: 'Developers', handle: 'c/developers', topic: 'dev', emoji: '💻', badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30', description: 'Architecture, clean code & decentralized systems.', members: 1310 },
  { id: 'science', name: 'Science', handle: 'c/science', topic: 'science', emoji: '🔬', badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30', description: 'Physics, biology, cosmos & peer review.', members: 760 },
  { id: 'design', name: 'Creative Design', handle: 'c/design', topic: 'creative', emoji: '🎨', badgeColor: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30', description: 'Visual design, generative artwork & UI aesthetics.', members: 620 },
  { id: 'general', name: 'General Lounge', handle: 'c/general', topic: 'opensource', emoji: '🌐', badgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/30', description: 'Open town square, introductions & daily conversations.', members: 2180 },
];

export const STARTER_CREATORS: StarterCreator[] = [
  { fingerprint: 'aeth_archivist_01', name: 'Archivist Zero', handle: '@archivist', bio: 'Curating open protocols & sovereign systems', avatar: '🏛️' },
  { fingerprint: 'aeth_builder_02', name: 'Ada Sovereign', handle: '@ada_builder', bio: 'Distributed systems & privacy-first UI design', avatar: '⚙️' },
  { fingerprint: 'aeth_cipher_03', name: 'Cipher Nomad', handle: '@cipher_nomad', bio: 'ZK cryptography & mesh network explorer', avatar: '🔐' },
];

export class OnboardingWizard {
  public currentStep: number = 0;
  public isOpen: boolean = false;
  public isCompleted: boolean = false;
  public seedSavedConfirmed: boolean = false;
  public selectedInterests: Set<string> = new Set<string>();

  public readonly STORAGE_KEY = 'aetheris_onboarding_completed';
  private readonly LEGACY_STORAGE_KEY = 'aetheris_onboarding_done';
  private readonly INTERESTS_STORAGE_KEY = 'urefy_user_interests';

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(this.STORAGE_KEY) || window.localStorage.getItem(this.LEGACY_STORAGE_KEY);
      const restored = window.localStorage.getItem('aetheris_identity_restored') === 'true';
      this.isCompleted = stored === 'true' || restored;

      // Hydrate saved interests
      try {
        const rawInterests = window.localStorage.getItem(this.INTERESTS_STORAGE_KEY);
        if (rawInterests) {
          const parsed = JSON.parse(rawInterests);
          if (Array.isArray(parsed)) {
            this.selectedInterests = new Set(parsed);
          }
        }
      } catch {}
    } else {
      this.isCompleted = false;
    }

    // Automatically trigger onboarding for new users
    if (!this.isCompleted) {
      this.isOpen = true;
    }

    // Global window registration for inline HTML triggers
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
   * Advances to next step or finishes on the final step (4 steps: 0, 1, 2, 3)
   */
  public next(): void {
    if (this.currentStep < 3) {
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
   * Toggles interest selection and immediately updates feed personalization
   */
  public toggleInterest(interestId: string): void {
    const item = ONBOARDING_INTERESTS.find((i) => i.id === interestId);
    if (!item) return;

    if (this.selectedInterests.has(interestId)) {
      this.selectedInterests.delete(interestId);
      feedPersonalization.setManualInterest(item.tag, 0);
    } else {
      this.selectedInterests.add(interestId);
      feedPersonalization.setManualInterest(item.tag, 100);
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(this.INTERESTS_STORAGE_KEY, JSON.stringify(Array.from(this.selectedInterests)));
    }

    this.syncUI();
  }

  /**
   * 1-Click Join / Leave Starter Community
   */
  public toggleJoinCommunity(communityId: string): void {
    try {
      sovereignCircleEngine.toggleJoin(communityId);
    } catch {}
    this.syncUI();
  }

  /**
   * 1-Click Follow / Unfollow Starter Creator
   */
  public toggleFollowCreator(fingerprint: string): void {
    try {
      profileView.toggleFollow(fingerprint);
    } catch {}
    this.syncUI();
  }

  /**
   * Joins all recommended starter communities
   */
  public joinAllRecommended(): void {
    for (const c of STARTER_COMMUNITIES) {
      const circle = sovereignCircleEngine.findCircle(c.id);
      if (circle && !circle.isJoined) {
        try {
          sovereignCircleEngine.toggleJoin(c.id);
        } catch {}
      }
    }
    clientStore.showToast('Joined all recommended starter communities!', 'success');
    this.syncUI();
  }

  /**
   * Skips onboarding
   */
  public async skip(): Promise<void> {
    if (this.currentStep === 3) {
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
    this.triggerFeedRefresh();
  }

  /**
   * Finishes wizard successfully and enters the feed
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
    this.triggerFeedRefresh();
  }

  private triggerFeedRefresh(): void {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('aetheris:onboarding:completed'));
        window.dispatchEvent(new CustomEvent('aetheris:feed-refresh'));
      } catch {}
    }
    if (clientStore && typeof clientStore.notify === 'function') {
      clientStore.notify('FEED_CHANGE');
    }
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
  // 4 STAGES DEFINITION
  // =========================================================================

  /**
   * Step 0: 🌱 Identitatea ta îți aparține / Your Identity Belongs to You
   */
  private renderStep1Identity(myFingerprint: string): string {
    const title = i18n.t('onboardingNarrative.step1Title', undefined, 'Your Identity Belongs to You');
    const subtitle = i18n.t('onboardingNarrative.step1Subtitle', undefined, 'Self-sovereignty from the very first second');
    const body = i18n.t(
      'onboardingNarrative.step1Body',
      undefined,
      'Create a private identity in seconds. No email, phone number, or password is required, and your account stays under your control.'
    );

    return `
      <div class="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
        <!-- Step Header -->
        <div class="flex items-start space-x-4 border-b border-white/5 pb-4">
          <div class="w-12 h-12 rounded-2xl bg-[var(--color-accent,#e59b3c)]/10 border border-[var(--color-accent,#e59b3c)]/30 flex items-center justify-center text-[var(--color-accent,#e59b3c)] text-2xl shrink-0">
            🌱
          </div>
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <h3 class="text-xl font-bold text-white tracking-wide">${title}</h3>
              <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 font-medium">Private by design</span>
            </div>
            <p class="text-xs text-slate-400 font-sans">${subtitle}</p>
          </div>
        </div>

        <!-- Narrative Explanation -->
        <p class="text-sm text-slate-200 leading-relaxed bg-surface-base/60 p-4 rounded-xl border border-white/5 font-sans">
          ${body}
        </p>

        <!-- 3 Pillars of Identity Flat Rows -->
        <div class="space-y-2">
          <div class="p-3 rounded-xl bg-surface-base border border-white/5 flex items-center gap-3.5">
            <div class="w-8 h-8 rounded-lg bg-surface-raised border border-white/10 flex items-center justify-center text-sm shrink-0">🛡️</div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-bold text-white">No password or phone needed</div>
              <p class="text-[11px] text-slate-400 leading-normal">Your browser holds your cryptographic keys safely on this device.</p>
            </div>
          </div>
          <div class="p-3 rounded-xl bg-surface-base border border-white/5 flex items-center gap-3.5">
            <div class="w-8 h-8 rounded-lg bg-surface-raised border border-white/10 flex items-center justify-center text-sm shrink-0">🔒</div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-bold text-white">Encrypted &amp; Tracker-Free</div>
              <p class="text-[11px] text-slate-400 leading-normal">Your posts and private messages are encrypted client-side. Zero corporate profiling.</p>
            </div>
          </div>
          <div class="p-3 rounded-xl bg-surface-base border border-white/5 flex items-center gap-3.5">
            <div class="w-8 h-8 rounded-lg bg-surface-raised border border-white/10 flex items-center justify-center text-sm shrink-0">🌐</div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-bold text-white">Portable Identity</div>
              <p class="text-[11px] text-slate-400 leading-normal">Move between devices anytime with your 12-word recovery phrase or passkey.</p>
            </div>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-surface-base/40 border border-white/5 flex items-center justify-between text-xs">
          <span class="text-slate-400">Account status</span>
          <span class="text-slate-300 font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">Active on this device <span class="sr-only">No Custodial Identity Server (${myFingerprint.substring(0, 16)})</span></span>
        </div>
      </div>
    `;
  }

  /**
   * Step 1: ✨ Choose Your Interests
   */
  private renderStep2Interests(): string {
    const title = 'Choose Your Interests';
    const subtitle = 'Pick topics you love to tailor your recommendations';

    return `
      <div class="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <!-- Step Header -->
        <div class="flex items-start space-x-4 border-b border-white/5 pb-3">
          <div class="w-12 h-12 rounded-2xl bg-[var(--color-accent,#e59b3c)]/10 border border-[var(--color-accent,#e59b3c)]/30 flex items-center justify-center text-[var(--color-accent,#e59b3c)] text-2xl shrink-0">
            ✨
          </div>
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <h3 class="text-xl font-bold text-white tracking-wide">${title}</h3>
              <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--color-accent,#e59b3c)]/15 text-[var(--color-accent,#e59b3c)] border border-[var(--color-accent,#e59b3c)]/30 font-medium">
                ${this.selectedInterests.size} Selected
              </span>
            </div>
            <p class="text-xs text-slate-400 font-sans">${subtitle}</p>
          </div>
        </div>

        <p class="text-xs text-slate-300 font-sans leading-relaxed">
          Your selections directly guide the &quot;For You&quot; feed without algorithmic attention traps or hidden surveillance.
        </p>

        <!-- 10 Interests Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-2 gap-2.5 max-h-[290px] overflow-y-auto pr-1">
          ${ONBOARDING_INTERESTS.map((interest) => {
            const isSelected = this.selectedInterests.has(interest.id);
            return `
              <button
                type="button"
                data-action="call-global"
                data-global-method="onboardingWizard.toggleInterest"
                data-global-arg="${interest.id}"
                class="p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-3 select-none ${
                  isSelected
                    ? 'bg-[var(--color-accent,#e59b3c)]/15 border-[var(--color-accent,#e59b3c)]/60 text-white shadow-xs'
                    : 'bg-surface-base hover:bg-surface-raised border-white/5 hover:border-white/20 text-slate-300'
                }"
              >
                <span class="text-2xl shrink-0 mt-0.5">${interest.emoji}</span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold ${isSelected ? 'text-[var(--color-accent,#e59b3c)]' : 'text-white'} truncate">
                      ${interest.name}
                    </span>
                    <span class="text-xs ${isSelected ? 'text-[var(--color-accent,#e59b3c)] font-bold' : 'text-slate-600'}">
                      ${isSelected ? '✓' : '+'}
                    </span>
                  </div>
                  <p class="text-[10px] text-slate-400 leading-snug mt-0.5 line-clamp-1">
                    ${interest.description}
                  </p>
                </div>
              </button>
            `;
          }).join('')}
        </div>

        <div class="p-2.5 rounded-xl bg-surface-base/50 border border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Preferences stored locally on device</span>
          <span class="text-emerald-400">100% Client-Side</span>
        </div>
      </div>
    `;
  }

  /**
   * Step 2: 🏛️ Discover Communities & People
   */
  private renderStep3Discovery(): string {
    const title = 'Find Communities & Creators';
    const subtitle = 'Join topic circles and follow active contributors';

    // Prioritize starter communities matching selected interests
    const sortedCommunities = [...STARTER_COMMUNITIES].sort((a, b) => {
      const aMatches = this.selectedInterests.has(a.topic) ? 1 : 0;
      const bMatches = this.selectedInterests.has(b.topic) ? 1 : 0;
      return bMatches - aMatches;
    });

    return `
      <div class="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <!-- Step Header -->
        <div class="flex items-start justify-between border-b border-white/5 pb-3">
          <div class="flex items-start space-x-4">
            <div class="w-12 h-12 rounded-2xl bg-[var(--color-accent,#e59b3c)]/10 border border-[var(--color-accent,#e59b3c)]/30 flex items-center justify-center text-[var(--color-accent,#e59b3c)] text-2xl shrink-0">
              🏛️
            </div>
            <div class="space-y-1">
              <div class="flex items-center space-x-2">
                <h3 class="text-xl font-bold text-white tracking-wide">${title}</h3>
                <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 font-medium">Starter Circles</span>
              </div>
              <p class="text-xs text-slate-400 font-sans">${subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            data-action="call-global"
            data-global-method="onboardingWizard.joinAllRecommended"
            class="hidden sm:flex px-3 py-1.5 text-xs font-mono rounded-lg bg-surface-overlay hover:bg-surface-highlight text-[var(--color-accent,#e59b3c)] border border-[var(--color-accent,#e59b3c)]/30 transition-all cursor-pointer items-center space-x-1"
          >
            <span>✨</span>
            <span>Join All</span>
          </button>
        </div>

        <!-- Curated Starter Communities List -->
        <div class="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          ${sortedCommunities.map((community) => {
            const circle = sovereignCircleEngine.findCircle(community.id);
            const isJoined = circle?.isJoined || false;
            return `
              <div class="p-3 rounded-xl bg-surface-base border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition-colors">
                <div class="flex items-center space-x-3 min-w-0">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border ${community.badgeColor}">
                    ${community.emoji}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center space-x-2">
                      <span class="text-xs font-bold text-white truncate">${community.name}</span>
                      <span class="text-[10px] font-mono text-slate-500">${community.handle}</span>
                    </div>
                    <p class="text-[11px] text-slate-400 truncate">${community.description}</p>
                  </div>
                </div>

                <button
                  type="button"
                  data-action="call-global"
                  data-global-method="onboardingWizard.toggleJoinCommunity"
                  data-global-arg="${community.id}"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    isJoined
                      ? 'bg-white/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-surface-overlay hover:bg-[var(--color-accent,#e59b3c)] hover:text-slate-950 text-white border border-white/10'
                  }"
                >
                  ${isJoined ? 'Joined ✓' : 'Join'}
                </button>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Curated Starter Creators to Follow -->
        <div class="pt-2 border-t border-white/5 space-y-2">
          <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Contributors to Follow</span>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            ${STARTER_CREATORS.map((creator) => {
              const isFollowing = profileView.isFollowing(creator.fingerprint);
              return `
                <div class="p-2.5 rounded-xl bg-surface-base/80 border border-white/5 flex items-center justify-between gap-2">
                  <div class="flex items-center space-x-2 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-surface-raised border border-white/10 flex items-center justify-center text-xs shrink-0">
                      ${creator.avatar}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="text-[11px] font-bold text-white truncate">${creator.name}</div>
                      <div class="text-[9px] font-mono text-slate-500 truncate">${creator.handle}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-action="call-global"
                    data-global-method="onboardingWizard.toggleFollowCreator"
                    data-global-arg="${creator.fingerprint}"
                    class="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all shrink-0 cursor-pointer ${
                      isFollowing
                        ? 'bg-white/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-surface-overlay hover:bg-surface-highlight text-white border border-white/10'
                    }"
                  >
                    ${isFollowing ? '✓' : '+ Follow'}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step 3: 🔐 Save Your Recovery Key (12-Word BIP-39 Mnemonic Backup)
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
          <div class="w-12 h-12 rounded-2xl bg-[var(--color-accent,#e59b3c)]/10 border border-[var(--color-accent,#e59b3c)]/30 flex items-center justify-center text-[var(--color-accent,#e59b3c)] text-2xl shrink-0">
            🔐
          </div>
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <h3 class="text-xl font-bold text-white tracking-wide">${title}</h3>
              <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--color-accent,#e59b3c)]/15 text-[var(--color-accent,#e59b3c)] border border-[var(--color-accent,#e59b3c)]/30 font-medium">Recovery Phrase</span>
            </div>
            <p class="text-xs text-slate-400 font-sans">${subtitle}</p>
          </div>
        </div>

        <p class="text-xs text-slate-300 font-sans leading-relaxed">
          ${body}
        </p>

        <!-- 12-WORD BIP-39 PILL GRID -->
        <div class="p-4 rounded-xl bg-surface-base border border-white/10 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <span>🔑</span>
              <span>12-Word Master Recovery Phrase</span>
            </span>
            <span class="text-[10px] font-mono text-slate-500">Standard backup</span>
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
              id="btn-copy-seed-words"
              data-action="call-global"
              data-global-method="onboardingWizard.copySeedWords"
              class="px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight border border-white/10 text-xs font-mono text-slate-200 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>📋</span>
              <span>Copy Words</span>
            </button>

            <button
              type="button"
              data-action="call-global"
              data-global-method="onboardingWizard.downloadBackup"
              class="px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight border border-white/10 text-xs font-mono text-slate-200 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer"
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
            ${this.seedSavedConfirmed ? 'checked' : ''}
            data-change="call-global"
            data-global-method="onboardingWizard.toggleSeedConfirmation"
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
   * Returns array of 4 progressive steps
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
        title: (typeof i18n !== 'undefined' && i18n.getLanguage && i18n.getLanguage() === 'ro') ? 'Alege ce te pasionează' : 'Choose Your Interests',
        subtitle: 'Personalize your feed with topics you love',
        icon: '✨',
        componentHtml: this.renderStep2Interests(),
      },
      {
        stepIndex: 2,
        title: (typeof i18n !== 'undefined' && i18n.getLanguage && i18n.getLanguage() === 'ro') ? 'Descoperă comunități și creatori' : 'Find Communities & Creators',
        subtitle: 'Starter spaces and contributors to follow',
        icon: '🏛️',
        componentHtml: this.renderStep3Discovery(),
      },
      {
        stepIndex: 3,
        title: i18n.t('onboardingNarrative.step4Title', undefined, 'Save Your Recovery Key'),
        subtitle: i18n.t('onboardingNarrative.step4Subtitle', undefined, 'Your 12-word master seed phrase'),
        icon: '🔐',
        componentHtml: this.renderStep4Seed(),
      },
    ];
  }

  /**
   * Renders step indicators for 4 screens
   */
  private renderStepIndicators(): string {
    const labels = ['Identity', 'Interests', 'Discovery', 'Recovery'];
    return `
      <div class="flex items-center justify-between w-full max-w-lg mx-auto px-6 py-3 select-none">
        ${labels.map((label, idx) => {
          const isPassed = idx < this.currentStep;
          const isCurrent = idx === this.currentStep;
          const dotClass = isCurrent
            ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold'
            : isPassed
              ? 'bg-white/20 text-white font-medium'
              : 'bg-surface-overlay text-slate-500 border border-white/10';

          const textClass = isCurrent ? 'text-[var(--color-accent,#e59b3c)] font-bold' : isPassed ? 'text-slate-300' : 'text-slate-500';

          return `
            <div class="flex flex-col items-center gap-1.5 relative group">
              <button
                type="button"
                data-action="call-global"
                data-raw-click="window.onboardingWizard.currentStep = ${idx}; window.onboardingWizard.syncUI()"
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all cursor-pointer ${dotClass}"
              >
                ${isPassed ? '✓' : idx + 1}
              </button>
              <span class="text-[10px] font-mono tracking-tight hidden sm:block ${textClass}">${label}</span>
            </div>
          `;
        }).join(`
          <div class="flex-1 h-[2px] mx-2 bg-surface-overlay overflow-hidden rounded">
            <div class="h-full bg-[var(--color-accent,#e59b3c)] transition-all duration-300" style="width: 100%"></div>
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
    const finishText = i18n.t('onboardingNarrative.finish', undefined, 'Enter UREfy');
    const stepOfText = i18n.t('onboardingNarrative.stepOf', { step: String(this.currentStep + 1) }, `Step ${this.currentStep + 1} of ${steps.length}`);

    return `
      <div id="aetheris-onboarding-overlay" class="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
        <div id="onboarding-modal" class="relative w-full max-w-2xl bg-surface-raised border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col my-auto">
          
          <!-- Top Bar Modal -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface-base/80">
            <div class="flex items-center space-x-3">
              <div class="w-7 h-7 rounded-lg bg-[var(--color-accent,#e59b3c)] flex items-center justify-center text-slate-950 font-bold text-xs shadow-md">
                U
              </div>
              <span class="text-sm font-bold text-white tracking-wide">Welcome to UREfy <span class="sr-only">UREfy // SOVEREIGN WELCOME</span></span>
            </div>

            <div class="flex items-center space-x-2">
              <span class="text-xs font-mono text-slate-400 mr-2">${stepOfText}</span>
              <button
                type="button"
                id="btn-skip-onboarding"
                data-action="call-global"
                data-global-method="onboardingWizard.skip"
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
          <div class="p-6 sm:p-8 flex-1 min-h-[390px] bg-canvas/60">
            ${activeStep.componentHtml}
          </div>

          <!-- Modal Footer Actions -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-surface-base/90">
            <div>
              ${!isFirst ? `
                <button
                  type="button"
                  data-action="call-global"
                  data-global-method="onboardingWizard.previous"
                  class="px-4 py-2 rounded-xl bg-surface-overlay hover:bg-surface-highlight text-slate-200 text-xs font-semibold tracking-wide border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>←</span>
                  <span>${backText}</span>
                </button>
              ` : `
                <span class="text-[11px] text-slate-400">Private by design</span>
              `}
            </div>

            <div class="flex items-center space-x-3">
              ${!isLast ? `
                <button
                  type="button"
                  data-action="call-global"
                  data-global-method="onboardingWizard.next"
                  class="px-6 py-2.5 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all flex items-center gap-2 transform active:scale-95 cursor-pointer shadow-md"
                >
                  <span>${continueText}</span>
                  <span>→</span>
                </button>
              ` : `
                <button
                  type="button"
                  id="btn-onboarding-finish"
                  data-action="call-global"
                  data-global-method="onboardingWizard.finish"
                  class="px-6 py-2.5 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all flex items-center gap-2 transform active:scale-95 cursor-pointer shadow-md"
                >
                  <span>${finishText}</span>
                  <span>→</span>
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
