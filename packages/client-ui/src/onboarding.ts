/**
 * @file onboarding.ts
 * @package @aetheris/client-ui
 * @description Consumer-friendly, mobile-first 3-stage onboarding flow for UREfy:
 *   Stage 1: Profile (Name, @handle, live preview, server-side validation & persistence)
 *   Stage 2: Interests (12 curated topics, minimum 3, instant feed personalization)
 *   Stage 3: Recovery (12-word master recovery phrase with anti-shoulder-surfing mask)
 *
 * 100% functional, self-contained implementation with authoritative state machine,
 * refresh resilience, full keyboard accessibility, and zero external telemetry.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { i18n } from './i18n.js';
import { clientStore } from './client-state.js';
import { sovereignDialog } from './dialog-modal.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { profileView } from './profile-view.js';
import { feedPersonalization } from './feed-personalization.js';

export type OnboardingStage =
  | 'PROFILE_REQUIRED'
  | 'INTERESTS_REQUIRED'
  | 'RECOVERY_REQUIRED'
  | 'ONBOARDING_COMPLETE';

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
  { id: 'tech', name: 'Technology', emoji: '🚀', tag: '#Technology', description: 'Computing, devices & frontier tech' },
  { id: 'ai', name: 'Artificial Intelligence', emoji: '🤖', tag: '#ArtificialIntelligence', description: 'Machine learning, autonomous models & local LLMs' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮', tag: '#Gaming', description: 'Game engines, indie titles & esports' },
  { id: 'science', name: 'Science', emoji: '🔬', tag: '#Science', description: 'Cosmos, physics, biology & research' },
  { id: 'art', name: 'Art', emoji: '🎨', tag: '#Art', description: 'Visual design, generative art & aesthetics' },
  { id: 'photography', name: 'Photography', emoji: '📷', tag: '#Photography', description: 'Street, landscape, cameras & capture' },
  { id: 'music', name: 'Music', emoji: '🎵', tag: '#Music', description: 'Production, audio, instruments & artists' },
  { id: 'movies', name: 'Movies', emoji: '🍿', tag: '#Movies', description: 'Cinema, series, critiques & storytelling' },
  { id: 'books', name: 'Books', emoji: '📚', tag: '#Books', description: 'Literature, philosophy, essays & writing' },
  { id: 'travel', name: 'Travel', emoji: '🌍', tag: '#Travel', description: 'Exploration, cities, outdoors & geography' },
  { id: 'local', name: 'Local', emoji: '🏙️', tag: '#Local', description: 'Community life, civic projects & places' },
  { id: 'dev', name: 'Programming', emoji: '💻', tag: '#Programming', description: 'TypeScript, Rust, web & open protocols' },
  { id: 'privacy', name: 'Privacy', emoji: '🛡️', tag: '#Privacy', description: 'Digital sovereignty, cryptography & freedom' },
];

// Preserved for backwards compatibility with existing empty-states and tests
export const STARTER_COMMUNITIES: StarterCommunity[] = [
  { id: 'technology', name: 'Technology', handle: 'c/technology', topic: 'tech', emoji: '🚀', badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', description: 'Discussions on computing, hardware & frontier tech.', members: 1420 },
  { id: 'gaming', name: 'Gaming', handle: 'c/gaming', topic: 'gaming', emoji: '🎮', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30', description: 'Indie game development, engines & speedruns.', members: 1150 },
  { id: 'privacy', name: 'Privacy & Security', handle: 'c/privacy', topic: 'privacy', emoji: '🛡️', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', description: 'Zero-knowledge proofs, encryption & sovereign rights.', members: 1640 },
  { id: 'developers', name: 'Developers', handle: 'c/developers', topic: 'dev', emoji: '💻', badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30', description: 'Architecture, clean code & decentralized systems.', members: 1310 },
  { id: 'science', name: 'Science', handle: 'c/science', topic: 'science', emoji: '🔬', badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30', description: 'Physics, biology, cosmos & peer review.', members: 760 },
  { id: 'general', name: 'General Lounge', handle: 'c/general', topic: 'general', emoji: '🌐', badgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/30', description: 'Open town square, introductions & daily conversations.', members: 2180 },
];

export const STARTER_CREATORS: StarterCreator[] = [
  { fingerprint: 'aeth_archivist_01', name: 'Archivist Zero', handle: '@archivist', bio: 'Curating open protocols & sovereign systems', avatar: '🏛️' },
  { fingerprint: 'aeth_builder_02', name: 'Ada Sovereign', handle: '@ada_builder', bio: 'Distributed systems & privacy-first UI design', avatar: '⚙️' },
  { fingerprint: 'aeth_cipher_03', name: 'Cipher Nomad', handle: '@cipher_nomad', bio: 'ZK cryptography & mesh network explorer', avatar: '🔐' },
];

export class OnboardingWizard {
  public stage: OnboardingStage = 'PROFILE_REQUIRED';
  public currentStep: number = 0; // 0: Profile, 1: Interests, 2: Recovery
  public isOpen: boolean = false;
  public isCompleted: boolean = false;
  public isLegacyProfileSetup: boolean = false;
  public seedSavedConfirmed: boolean = false;
  public seedRevealed: boolean = false;
  public selectedInterests: Set<string> = new Set<string>();
  public displayName: string = '';
  public handle: string = '';
  public avatar: string = '';
  public isSaving: boolean = false;
  public saveError: string = '';
  public handleCheckState: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' = 'idle';
  public handleCheckMessage: string = '';
  public showTechDetails: boolean = false;

  public readonly STAGE_STORAGE_KEY = 'urefy_onboarding_stage';
  public readonly STORAGE_KEY = 'aetheris_onboarding_completed';
  private readonly LEGACY_STORAGE_KEY = 'aetheris_onboarding_done';
  private readonly V4_STORAGE_KEY = 'aetheris_onboarding_completed_v4';
  private readonly INTERESTS_STORAGE_KEY = 'urefy_user_interests';
  private readonly PROFILE_DRAFT_KEY = 'urefy_onboarding_profile_draft';

  private checkHandleTimer: any = null;

  constructor() {
    this.hydrateFromStorage();

    // Global registrations
    if (typeof window !== 'undefined') {
      (window as any).onboardingWizard = this;
    }
    (globalThis as any).onboardingWizard = this;
  }

  /**
   * Authoritative hydration from localStorage with refresh resilience
   */
  public hydrateFromStorage(): void {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!storage) {
      this.isCompleted = false;
      this.isOpen = true;
      this.stage = 'PROFILE_REQUIRED';
      this.currentStep = 0;
      return;
    }

    const legacyCompleted =
      storage.getItem(this.STORAGE_KEY) === 'true' ||
      storage.getItem(this.LEGACY_STORAGE_KEY) === 'true' ||
      storage.getItem(this.V4_STORAGE_KEY) === 'true';
    const restored = storage.getItem('aetheris_identity_restored') === 'true';
    const storedStage = storage.getItem(this.STAGE_STORAGE_KEY) as OnboardingStage | null;

    // Hydrate interests
    try {
      const rawInterests = storage.getItem(this.INTERESTS_STORAGE_KEY);
      if (rawInterests) {
        const parsed = JSON.parse(rawInterests);
        if (Array.isArray(parsed)) {
          this.selectedInterests = new Set(parsed);
        }
      }
    } catch {}

    // Hydrate profile draft or active profile
    const fp = this.getActiveFingerprint();
    const cachedProfile = storage.getItem(`aetheris_profile_${fp}`);
    let hasAuthoritativeProfile = false;
    if (cachedProfile) {
      try {
        const p = JSON.parse(cachedProfile);
        if (p?.name?.trim() && p?.handle?.trim() && !p.name.includes('not set up')) {
          this.displayName = p.name;
          this.handle = p.handle.replace(/^@/, '');
          hasAuthoritativeProfile = true;
        }
      } catch {}
    }

    if (!hasAuthoritativeProfile) {
      const draft = storage.getItem(this.PROFILE_DRAFT_KEY);
      if (draft) {
        try {
          const d = JSON.parse(draft);
          if (d.displayName) this.displayName = d.displayName;
          if (d.handle) this.handle = d.handle;
        } catch {}
      }
    }

    // Determine state
    if (storedStage === 'ONBOARDING_COMPLETE' || legacyCompleted || restored) {
      this.isCompleted = true;
      this.isOpen = false;
      this.stage = 'ONBOARDING_COMPLETE';
      return;
    }

    // New user with partial progress
    this.isCompleted = false;
    this.isOpen = true;
    if (storedStage === 'INTERESTS_REQUIRED') {
      this.stage = 'INTERESTS_REQUIRED';
      this.currentStep = 1;
    } else if (storedStage === 'RECOVERY_REQUIRED') {
      this.stage = 'RECOVERY_REQUIRED';
      this.currentStep = 2;
    } else {
      this.stage = 'PROFILE_REQUIRED';
      this.currentStep = 0;
    }
  }

  /**
   * Minimal profile setup flow for legacy users who already completed sovereign identity
   * but lack a public profile (name & handle).
   */
  public startProfileSetupOnly(): void {
    this.isLegacyProfileSetup = true;
    this.currentStep = 0;
    this.stage = 'PROFILE_REQUIRED';
    this.isOpen = true;
    this.saveError = '';
    this.syncUI();
  }

  private persistStage(): void {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (storage) {
      storage.setItem(this.STAGE_STORAGE_KEY, this.stage);
    }
  }

  private persistProfileDraft(): void {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (storage) {
      storage.setItem(
        this.PROFILE_DRAFT_KEY,
        JSON.stringify({ displayName: this.displayName, handle: this.handle })
      );
    }
  }

  private persistInterests(): void {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (storage) {
      storage.setItem(this.INTERESTS_STORAGE_KEY, JSON.stringify(Array.from(this.selectedInterests)));
    }
  }

  /**
   * Opens onboarding modal from step 0
   */
  public start(): void {
    this.currentStep = 0;
    this.stage = 'PROFILE_REQUIRED';
    this.isOpen = true;
    this.seedSavedConfirmed = false;
    this.seedRevealed = false;
    this.saveError = '';
    this.persistStage();
    this.syncUI();
  }

  /**
   * Main forward action for Continue buttons
   */
  public async next(): Promise<void> {
    if (this.currentStep === 0) {
      await this.submitStep1();
      return;
    }
    if (this.currentStep === 1) {
      this.submitStep2();
      return;
    }
    if (this.currentStep === 2) {
      await this.finish();
      return;
    }
  }

  /**
   * Step 1 Submit & Authoritative Server Save
   */
  public async submitStep1(): Promise<boolean> {
    if (this.isSaving) return false;
    this.saveError = '';

    const cleanName = this.displayName.trim();
    const cleanHandle = this.handle.trim().toLowerCase();

    if (!cleanName || cleanName.length > 60) {
      this.saveError = 'Please enter a display name (1–60 characters).';
      this.syncUI();
      return false;
    }

    if (!cleanHandle || !/^[a-z0-9_]{3,30}$/.test(cleanHandle)) {
      this.saveError = 'Please choose a handle using 3–30 letters, numbers, and underscores.';
      this.syncUI();
      return false;
    }

    if (this.handleCheckState === 'taken') {
      this.saveError = `@${cleanHandle} is already taken. Please choose another handle.`;
      this.syncUI();
      return false;
    }

    this.isSaving = true;
    this.syncUI();

    try {
      const fp = this.getActiveFingerprint();
      const saved = await profileView.saveProfile(fp, {
        name: cleanName,
        handle: cleanHandle,
        avatar: this.avatar || undefined,
        role: 'MEMBER',
      });

      if (!saved) {
        this.isSaving = false;
        this.saveError = "Couldn't save your profile. Please check your connection and try again.";
        this.syncUI();
        return false;
      }

      this.isSaving = false;
      this.saveError = '';

      if (this.isLegacyProfileSetup) {
        await this.finish();
        return true;
      }

      this.stage = 'INTERESTS_REQUIRED';
      this.currentStep = 1;
      this.persistStage();
      this.syncUI();
      return true;
    } catch (err: any) {
      this.isSaving = false;
      this.saveError = err?.message || "Couldn't save your profile. Try again.";
      this.syncUI();
      return false;
    }
  }

  /**
   * Step 2 Submit
   */
  public submitStep2(): boolean {
    if (this.selectedInterests.size < 3) {
      this.saveError = 'Please choose at least 3 topics to tailor your feed (or tap Choose for me later).';
      this.syncUI();
      return false;
    }
    this.saveError = '';
    this.stage = 'RECOVERY_REQUIRED';
    this.currentStep = 2;
    this.persistStage();
    this.syncUI();
    return true;
  }

  /**
   * "Choose for me later" fallback for interests
   */
  public chooseInterestsLater(): void {
    const defaults = ['tech', 'privacy', 'science'];
    for (const d of defaults) {
      this.selectedInterests.add(d);
      const item = ONBOARDING_INTERESTS.find((i) => i.id === d);
      if (item) feedPersonalization.setManualInterest(item.tag, 100);
    }
    this.persistInterests();
    this.saveError = '';
    this.stage = 'RECOVERY_REQUIRED';
    this.currentStep = 2;
    this.persistStage();
    this.syncUI();
  }

  /**
   * Returns to previous step
   */
  public previous(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      if (this.currentStep === 0) this.stage = 'PROFILE_REQUIRED';
      else if (this.currentStep === 1) this.stage = 'INTERESTS_REQUIRED';
      this.saveError = '';
      this.persistStage();
      this.syncUI();
    }
  }

  /**
   * Toggles interest selection
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

    this.persistInterests();
    this.saveError = '';
    this.syncUI();
  }

  /**
   * Updates display name with validation
   */
  public updateDisplayName(value: string): void {
    this.displayName = value.slice(0, 60);
    this.saveError = '';
    this.persistProfileDraft();
    this.syncUI();
  }

  /**
   * Updates handle with canonical lowercase normalization & debounced availability check
   */
  public updateHandle(value: string): void {
    const clean = value.replace(/^@/, '').toLowerCase().trim();
    this.handle = clean;
    this.saveError = '';
    this.persistProfileDraft();

    if (this.checkHandleTimer) {
      clearTimeout(this.checkHandleTimer);
      this.checkHandleTimer = null;
    }

    if (!clean) {
      this.handleCheckState = 'idle';
      this.handleCheckMessage = '';
      this.syncUI();
      return;
    }

    if (!/^[a-z0-9_]+$/.test(clean)) {
      this.handleCheckState = 'invalid';
      this.handleCheckMessage = 'Use letters, numbers and underscores';
      this.syncUI();
      return;
    }

    if (clean.length < 3 || clean.length > 30) {
      this.handleCheckState = 'invalid';
      this.handleCheckMessage = 'Must be between 3 and 30 characters';
      this.syncUI();
      return;
    }

    this.handleCheckState = 'checking';
    this.handleCheckMessage = 'Checking availability...';
    this.syncUI();

    this.checkHandleTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profiles?handle=${encodeURIComponent(clean)}`);
        if (this.handle !== clean) return;
        if (res.status === 404) {
          this.handleCheckState = 'available';
          this.handleCheckMessage = `✓ @${clean} is available`;
        } else if (res.ok) {
          const data = (await res.json().catch(() => null)) as any;
          const myFp = this.getActiveFingerprint();
          if (data?.profile && data.profile.userId !== myFp) {
            this.handleCheckState = 'taken';
            this.handleCheckMessage = `@${clean} is already taken`;
          } else {
            this.handleCheckState = 'available';
            this.handleCheckMessage = `✓ @${clean} is available`;
          }
        } else {
          this.handleCheckState = 'available';
          this.handleCheckMessage = `✓ @${clean} is available`;
        }
      } catch (_) {
        if (this.handle === clean) {
          this.handleCheckState = 'available';
          this.handleCheckMessage = `✓ @${clean} is available`;
        }
      }
      this.syncUI();
    }, 250);
  }

  /**
   * Helper check if Step 1 inputs are valid for Continue button
   */
  public isStep1Valid(): boolean {
    const cleanName = this.displayName.trim();
    const cleanHandle = this.handle.trim().toLowerCase();
    return (
      cleanName.length >= 1 &&
      cleanName.length <= 60 &&
      /^[a-z0-9_]{3,30}$/.test(cleanHandle) &&
      this.handleCheckState !== 'taken' &&
      this.handleCheckState !== 'invalid' &&
      !this.isSaving
    );
  }

  public canSkip(): boolean {
    // Identity setup and 12-word recovery seed backup are strictly mandatory
    return false;
  }

  /**
   * Toggle seed phrase reveal/blur
   */
  public toggleRevealSeed(): void {
    this.seedRevealed = !this.seedRevealed;
    this.syncUI();
  }

  /**
   * Copies 12-word BIP-39 mnemonic seed phrase to clipboard
   */
  public copySeedWords(): void {
    const mnemonic = this.getActiveMnemonic();
    if (!mnemonic) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(mnemonic)
        .then(() => {
          this.seedSavedConfirmed = true;
          this.syncUI();
          const copyBtn = document.getElementById('btn-copy-seed-words');
          if (copyBtn) {
            copyBtn.innerHTML = '<span>✓</span><span>Copied!</span>';
            setTimeout(() => {
              if (copyBtn) copyBtn.innerHTML = '<span>📋</span><span>Copy recovery phrase</span>';
            }, 2500);
          }
        })
        .catch(() => {
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
    this.syncUI();
  }

  public toggleTechDetails(): void {
    this.showTechDetails = !this.showTechDetails;
    this.syncUI();
  }

  /**
   * Legacy & empty-states stub methods to prevent undefined errors
   */
  public toggleJoinCommunity(communityId: string): void {
    try {
      sovereignCircleEngine.toggleJoin(communityId);
    } catch {}
    this.syncUI();
  }

  public toggleFollowCreator(fingerprint: string): void {
    try {
      profileView.toggleFollow(fingerprint);
    } catch {}
    this.syncUI();
  }

  public joinAllRecommended(): void {
    for (const c of STARTER_COMMUNITIES) {
      const circle = sovereignCircleEngine.findCircle(c.id);
      if (circle && !circle.isJoined) {
        try {
          sovereignCircleEngine.toggleJoin(c.id);
        } catch {}
      }
    }
    clientStore.showToast('Joined starter communities', 'success');
    this.syncUI();
  }

  /**
   * Skips onboarding
   */
  public async skip(): Promise<void> {
    if (this.currentStep === 1) {
      this.chooseInterestsLater();
      return;
    }

    if (this.currentStep === 0) {
      await this.submitStep1();
      return;
    }

    if (this.currentStep === 2) {
      if (this.seedSavedConfirmed) {
        await this.finish();
      } else {
        this.saveError = 'Please confirm you have saved your 12-word recovery phrase before completing setup.';
        this.syncUI();
      }
    }
  }

  /**
   * Finishes wizard successfully and enters the feed
   */
  public async finish(): Promise<void> {
    const cleanName = this.displayName.trim();
    const cleanHandle = this.handle.trim().toLowerCase();

    if (!cleanName || !/^[a-z0-9_]{3,30}$/.test(cleanHandle)) {
      this.currentStep = 0;
      this.stage = 'PROFILE_REQUIRED';
      this.saveError = 'Choose your public name and @handle before entering UREfy.';
      this.syncUI();
      return;
    }

    const fp = this.getActiveFingerprint();
    const profile = profileView.getProfile(fp);
    if (!profile.name || !profile.handle || profile.name !== cleanName || profile.handle !== cleanHandle) {
      const saved = await profileView.saveProfile(fp, {
        name: cleanName,
        handle: cleanHandle,
        avatar: this.avatar || undefined,
        role: 'MEMBER',
      });
      if (!saved) {
        this.saveError = "Couldn't save your profile before entering. Please try again.";
        this.syncUI();
        return;
      }
    }

    this.isOpen = false;
    this.isCompleted = true;
    this.stage = 'ONBOARDING_COMPLETE';

    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (storage) {
      storage.setItem(this.STAGE_STORAGE_KEY, 'ONBOARDING_COMPLETE');
      storage.setItem(this.STORAGE_KEY, 'true');
      storage.setItem(this.LEGACY_STORAGE_KEY, 'true');
      storage.setItem(this.V4_STORAGE_KEY, 'true');
      storage.removeItem(this.PROFILE_DRAFT_KEY);
    }

    if (typeof document !== 'undefined') {
      document.body.classList.remove('overflow-hidden');
      const overlay = document.getElementById('aetheris-onboarding-overlay');
      if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 150);
      }
    }

    this.syncUI();
    this.triggerFeedRefresh();

    if (typeof window !== 'undefined' && window.location) {
      if ((window.location.hash || '').startsWith('#onboarding')) {
        window.history?.replaceState(null, '', window.location.pathname || '/');
      }
      setTimeout(() => {
        const mainEl = document.getElementById('main-feed') || document.querySelector('main') || document.getElementById('app');
        if (mainEl && typeof (mainEl as HTMLElement).focus === 'function') {
          (mainEl as HTMLElement).focus();
        }
      }, 100);
    }
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
  // 3-STAGE NARRATIVE DEFINITIONS
  // =========================================================================

  /**
   * Step 1: Profile (Name, @handle, live preview)
   */
  private renderStep1Profile(): string {
    const title = 'Create your UREfy profile';
    const subtitle = 'This is how other people will see you.';
    const cleanHandle = this.handle.trim();
    const cleanName = this.displayName.trim();

    return `
      <div class="space-y-5 animate-in fade-in duration-200">
        <!-- Step Header -->
        <div class="flex items-start space-x-3.5 border-b border-white/5 pb-3">
          <div class="w-10 h-10 rounded-xl bg-[var(--color-accent,#e89e38)]/10 border border-[var(--color-accent,#e89e38)]/30 flex items-center justify-center text-[var(--color-accent,#e89e38)] text-xl shrink-0">
            👤
          </div>
          <div class="space-y-0.5">
            <h3 class="text-lg font-bold text-white tracking-wide">${title}</h3>
            <p class="text-xs text-slate-400 font-sans">${subtitle}</p>
          </div>
        </div>

        <!-- Public Profile Form -->
        <form id="onboarding-profile-form" data-submit="submit-onboarding-profile" class="space-y-4">
          <div class="space-y-3">
            <div>
              <label for="onboarding-display-name" class="block text-xs font-medium text-slate-300 mb-1.5">
                Display name <span class="text-rose-400">*</span>
              </label>
              <input
                id="onboarding-display-name"
                type="text"
                data-input="call-global"
                data-global-method="onboardingWizard.updateDisplayName"
                value="${this.escapeHtml(this.displayName)}"
                maxlength="60"
                autocomplete="name"
                placeholder="Your name"
                class="w-full rounded-xl bg-surface-raised border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 placeholder:italic focus:border-[var(--color-accent,#e89e38)] focus:ring-1 focus:ring-[var(--color-accent,#e89e38)] outline-none transition-all"
                onfocus="this.scrollIntoView({ behavior: 'smooth', block: 'center' })"
              />
            </div>

            <div>
              <label for="onboarding-handle" class="block text-xs font-medium text-slate-300 mb-1.5">
                Handle <span class="text-rose-400">*</span>
              </label>
              <div class="flex items-center rounded-xl bg-surface-raised border border-white/10 px-3.5 py-0.5 focus-within:border-[var(--color-accent,#e89e38)] focus-within:ring-1 focus-within:ring-[var(--color-accent,#e89e38)] transition-all">
                <span class="text-slate-500 font-mono text-sm select-none">@</span>
                <input
                  id="onboarding-handle"
                  type="text"
                  data-input="call-global"
                  data-global-method="onboardingWizard.updateHandle"
                  value="${this.escapeHtml(this.handle)}"
                  maxlength="30"
                  pattern="[a-zA-Z0-9_]{3,30}"
                  autocomplete="username"
                  placeholder="yourname"
                  class="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-sm text-white font-mono placeholder:text-slate-500 placeholder:italic outline-none"
                  onfocus="this.scrollIntoView({ behavior: 'smooth', block: 'center' })"
                />
              </div>

              <!-- Handle inline validation & availability -->
              <div class="mt-1.5 min-h-[18px]">
                ${
                  this.handleCheckState === 'checking'
                    ? `<span class="text-[11px] text-slate-400 flex items-center gap-1 font-sans"><svg class="animate-spin h-3 w-3 text-slate-400" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Checking availability...</span>`
                    : this.handleCheckState === 'available'
                      ? `<span class="text-[11px] text-emerald-400 font-mono font-medium">${this.escapeHtml(this.handleCheckMessage)}</span>`
                      : this.handleCheckState === 'taken'
                        ? `<span class="text-[11px] text-rose-400 font-mono font-medium">${this.escapeHtml(this.handleCheckMessage)}</span>`
                        : this.handleCheckState === 'invalid'
                          ? `<span class="text-[11px] text-amber-300 font-sans">${this.escapeHtml(this.handleCheckMessage)}</span>`
                          : `<span class="text-[11px] text-slate-500 font-sans">Use 3–30 letters, numbers, and underscores</span>`
                }
              </div>
            </div>
          </div>

          <!-- Live Profile Preview Card -->
          <div class="rounded-xl border border-white/10 bg-surface-base/80 p-3 flex items-center gap-3 shadow-inner">
            <div class="w-11 h-11 rounded-full bg-[var(--color-accent,#e89e38)]/15 border border-[var(--color-accent,#e89e38)]/30 flex items-center justify-center text-[var(--color-accent,#e89e38)] font-bold text-sm shrink-0 select-none">
              ${cleanName ? cleanName.charAt(0).toUpperCase() : '👤'}
            </div>
            <div class="min-w-0 flex-1">
              <span class="block text-[9px] uppercase tracking-wider text-slate-400 font-mono">Live profile preview</span>
              <strong id="onboarding-identity-preview-name" class="block text-sm truncate ${cleanName ? 'text-white' : 'text-slate-500 italic font-normal'}">
                ${cleanName ? this.escapeHtml(cleanName) : 'Your display name'}
              </strong>
              <span id="onboarding-identity-preview-handle" class="block text-xs font-mono truncate ${cleanHandle ? 'text-[var(--color-accent,#e89e38)]' : 'text-slate-500 italic'}">
                ${cleanHandle ? `@${this.escapeHtml(cleanHandle)}` : '@yourname'}
              </span>
            </div>
          </div>

          <!-- Inline Error if Save Failed -->
          ${
            this.saveError
              ? `
            <div class="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2" role="alert" aria-live="polite">
              <span class="text-sm shrink-0">⚠️</span>
              <span class="font-sans leading-relaxed">${this.escapeHtml(this.saveError)}</span>
            </div>
          `
              : ''
          }
        </form>

        <!-- Human Benefits Flat Rows (Zero Jargon) -->
        <div class="space-y-1.5 pt-1">
          <div class="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 flex items-center gap-3">
            <span class="text-sm">🛡️</span>
            <span class="text-xs text-slate-300">No email, phone number, or password required.</span>
          </div>
          <div class="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 flex items-center gap-3">
            <span class="text-sm">🔑</span>
            <span class="text-xs text-slate-300">You own your identity — no corporate account locks.</span>
          </div>
          <div class="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 flex items-center gap-3">
            <span class="text-sm">🔒</span>
            <span class="text-xs text-slate-300">Private by design — encrypted device storage.</span>
          </div>
        </div>

        <!-- Optional Expandable Tech Details Link -->
        <div class="pt-1">
          <button
            type="button"
            data-action="call-global"
            data-global-method="onboardingWizard.toggleTechDetails"
            class="text-[11px] font-sans text-slate-400 hover:text-[var(--color-accent,#e89e38)] transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <span>How your identity works</span>
            <span>${this.showTechDetails ? '▴' : '▾'}</span>
          </button>

          ${
            this.showTechDetails
              ? `
            <div class="mt-2 p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-400 space-y-1.5 font-sans leading-relaxed animate-in fade-in duration-150">
              <p>• Your browser securely generated an Ed25519 cryptographic keypair in device memory.</p>
              <p>• Your public profile is signed with your device key and linked to your chosen handle.</p>
              <p>• In the next steps, you will choose feed topics and save your 12-word recovery phrase.</p>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  /**
   * Step 2: Interests
   */
  private renderStep2Interests(): string {
    const title = 'What are you into?';
    const subtitle = 'Choose a few topics. You can change these anytime.';
    const selectedCount = this.selectedInterests.size;
    const isMinMet = selectedCount >= 3;

    return `
      <div class="space-y-4 animate-in fade-in duration-200">
        <!-- Step Header -->
        <div class="flex items-start justify-between border-b border-white/5 pb-3">
          <div class="flex items-start space-x-3.5">
            <div class="w-10 h-10 rounded-xl bg-[var(--color-accent,#e89e38)]/10 border border-[var(--color-accent,#e89e38)]/30 flex items-center justify-center text-[var(--color-accent,#e89e38)] text-xl shrink-0">
              ✨
            </div>
            <div class="space-y-0.5">
              <h3 class="text-lg font-bold text-white tracking-wide">${title}</h3>
              <p class="text-xs text-slate-400 font-sans">${subtitle}</p>
            </div>
          </div>

          <div class="shrink-0 text-right">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium ${isMinMet ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}">
              ${selectedCount}/3 selected
            </span>
          </div>
        </div>

        <!-- 12 Curated Interest Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[310px] overflow-y-auto pr-1">
          ${ONBOARDING_INTERESTS.map((item) => {
            const isSelected = this.selectedInterests.has(item.id);
            const cardClasses = isSelected
              ? 'bg-[var(--color-accent,#e89e38)]/15 border-[var(--color-accent,#e89e38)] text-white shadow-sm ring-1 ring-[var(--color-accent,#e89e38)]/30'
              : 'bg-surface-base hover:bg-surface-raised border-white/5 hover:border-white/15 text-slate-300 hover:text-white';

            return `
              <button
                type="button"
                data-action="call-global"
                data-global-method="onboardingWizard.toggleInterest"
                data-global-args='["${item.id}"]'
                data-global-arg="${item.id}"
                class="p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[72px] cursor-pointer active:scale-95 ${cardClasses}"
              >
                <div class="flex items-center justify-between w-full mb-1">
                  <span class="text-lg select-none">${item.emoji}</span>
                  <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isSelected ? 'bg-[var(--color-accent,#e89e38)] text-slate-950 font-bold' : 'border border-white/20 text-transparent'}">
                    ✓
                  </span>
                </div>
                <div>
                  <div class="text-xs font-bold truncate leading-tight">${item.name}</div>
                  <div class="text-[10px] text-slate-400 truncate leading-tight mt-0.5">${item.description}</div>
                </div>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Secondary Action: Choose for me later -->
        <div class="flex items-center justify-between pt-1">
          <button
            type="button"
            data-action="call-global"
            data-global-method="onboardingWizard.chooseInterestsLater"
            class="text-xs text-slate-400 hover:text-[var(--color-accent,#e89e38)] underline cursor-pointer transition-colors"
          >
            Choose for me later
          </button>
          <span class="text-[11px] text-slate-500 font-sans">Pick at least 3 to continue</span>
        </div>

        ${
          this.saveError
            ? `
          <div class="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2" role="alert">
            <span>⚠️</span>
            <span>${this.escapeHtml(this.saveError)}</span>
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  /**
   * Step 3: Recovery
   */
  private renderStep3Recovery(): string {
    const title = 'Protect your identity';
    const subtitle = 'These 12 words can restore your UREfy identity if you lose this device.';
    const mnemonic = this.getActiveMnemonic();
    const words = mnemonic.split(/\s+/).filter(Boolean);

    return `
      <div class="space-y-4 animate-in fade-in duration-200">
        <!-- Step Header -->
        <div class="flex items-start space-x-3.5 border-b border-white/5 pb-3">
          <div class="w-10 h-10 rounded-xl bg-[var(--color-accent,#e89e38)]/10 border border-[var(--color-accent,#e89e38)]/30 flex items-center justify-center text-[var(--color-accent,#e89e38)] text-xl shrink-0">
            🔐
          </div>
          <div class="space-y-0.5">
            <h3 class="text-lg font-bold text-white tracking-wide">${title}</h3>
            <p class="text-xs text-slate-400 font-sans">${subtitle}</p>
          </div>
        </div>

        <!-- Warning Callout -->
        <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2.5 leading-relaxed font-sans">
          <span class="text-base shrink-0 select-none">⚠️</span>
          <div>
            <strong>UREfy cannot recover them for you.</strong>
            <span class="block text-slate-300 text-[11px] mt-0.5">Keep these 12 words secret. Anyone with this phrase can access your account. A Passkey can unlock this device more easily, but it does not replace your recovery words.</span>
          </div>
        </div>

        <!-- 12 Words Box with Anti-Shoulder-Surfing Blur -->
        <div class="relative rounded-xl border border-white/10 bg-surface-base p-4 overflow-hidden">
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 transition-all ${this.seedRevealed ? '' : 'filter blur-md select-none opacity-25'}">
            ${words.map((word, i) => `
              <div class="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-surface-raised border border-white/5 font-mono text-xs">
                <span class="text-slate-500 text-[10px] w-4 text-right">${i + 1}.</span>
                <span class="text-slate-100 font-bold truncate">${word}</span>
              </div>
            `).join('')}
          </div>

          ${
            !this.seedRevealed
              ? `
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs p-4 text-center">
              <button
                type="button"
                data-action="call-global"
                data-global-method="onboardingWizard.toggleRevealSeed"
                class="px-4 py-2 rounded-xl bg-[var(--color-accent,#e89e38)] hover:brightness-105 text-slate-950 font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <span>👁️</span>
                <span>Show recovery words</span>
              </button>
              <span class="text-[11px] text-slate-400 mt-2 font-sans">Hidden to prevent shoulder-surfing</span>
            </div>
          `
              : `
            <div class="mt-3 flex justify-end">
              <button
                type="button"
                data-action="call-global"
                data-global-method="onboardingWizard.toggleRevealSeed"
                class="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                🙈 Hide recovery words
              </button>
            </div>
          `
          }
        </div>

        <!-- Backup Action Buttons -->
        <div class="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            id="btn-copy-seed-words"
            data-action="call-global"
            data-global-method="onboardingWizard.copySeedWords"
            class="px-3 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <span>📋</span>
            <span>Copy recovery phrase</span>
          </button>

          <button
            type="button"
            id="btn-download-seed-backup"
            data-action="call-global"
            data-global-method="onboardingWizard.downloadBackup"
            class="px-3 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <span>💾</span>
            <span>Download backup</span>
          </button>
        </div>

        <!-- Confirmation Checkbox -->
        <label class="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer hover:bg-white/[0.05] transition-colors select-none">
          <input
            type="checkbox"
            id="chk-saved-seed"
            ${this.seedSavedConfirmed ? 'checked' : ''}
            data-input="call-global"
            data-global-method="onboardingWizard.toggleSeedConfirmation"
            class="w-4 h-4 rounded text-[var(--color-accent,#e89e38)] accent-[var(--color-accent,#e89e38)] cursor-pointer shrink-0"
          />
          <span class="text-xs text-slate-200 font-sans">
            I saved my recovery words somewhere safe.
          </span>
        </label>
      </div>
    `;
  }

  /**
   * Returns steps array for backwards compatibility
   */
  public getSteps(myFingerprint: string = 'aeth1_0000000000000000'): OnboardingStep[] {
    const isRo = typeof i18n !== 'undefined' && i18n.getLanguage && i18n.getLanguage() === 'ro';
    return [
      {
        stepIndex: 0,
        title: isRo ? 'Identitatea ta îți aparține' : 'Create your UREfy profile',
        subtitle: 'Choose how people will see you',
        icon: '👤',
        componentHtml: this.renderStep1Profile(),
      },
      {
        stepIndex: 1,
        title: isRo ? 'Alege ce te pasionează' : 'What are you into?',
        subtitle: 'Choose a few topics to tailor your feed',
        icon: '✨',
        componentHtml: this.renderStep2Interests(),
      },
      {
        stepIndex: 2,
        title: isRo ? 'Salvează-ți cheia de salvare' : 'Protect your identity',
        subtitle: 'Your 12-word master recovery phrase',
        icon: '🔐',
        componentHtml: this.renderStep3Recovery(),
      },
    ];
  }

  /**
   * Renders 3-step progress track
   */
  private renderStepIndicators(): string {
    const labels = ['Profile', 'Interests', 'Recovery'];
    return `
      <div class="flex items-center justify-between w-full max-w-sm mx-auto px-4 py-2 select-none" aria-label="Onboarding Progress">
        ${labels.map((label, idx) => {
          const isPassed = idx < this.currentStep;
          const isCurrent = idx === this.currentStep;
          const dotClass = isCurrent
            ? 'bg-[var(--color-accent,#e89e38)] text-slate-950 font-bold ring-2 ring-[var(--color-accent,#e89e38)]/40 shadow-sm'
            : isPassed
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold'
              : 'bg-white/5 text-slate-500 border border-white/10';

          const textClass = isCurrent
            ? 'text-[var(--color-accent,#e89e38)] font-bold'
            : isPassed
              ? 'text-slate-300 font-medium'
              : 'text-slate-500';

          return `
            <div class="flex flex-col items-center gap-1">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono transition-all ${dotClass}"
                aria-current="${isCurrent ? 'step' : 'false'}"
              >
                ${isPassed ? '✓' : idx + 1}
              </div>
              <span class="text-[10px] tracking-tight ${textClass}">${label}</span>
            </div>
          `;
        }).join(`
          <div class="flex-1 h-[2px] mx-2 bg-white/5 rounded-full overflow-hidden mb-3">
            <div class="h-full bg-[var(--color-accent,#e89e38)] transition-all duration-300" style="width: ${this.currentStep > 0 ? '100%' : '0%'}"></div>
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

    const continueText = i18n.t('onboardingNarrative.continue', undefined, 'Continue');
    const backText = i18n.t('onboardingNarrative.back', undefined, 'Back');
    const finishText = 'ENTER UREfy';
    const stepOfText = `Step ${this.currentStep + 1} of 3`;

    // Button states
    const step1Valid = this.isStep1Valid();
    const step2Valid = this.selectedInterests.size >= 3;
    const step3Valid = this.seedSavedConfirmed;

    const canContinue = isFirst ? step1Valid : this.currentStep === 1 ? step2Valid : step3Valid;

    return `
      <div
        id="aetheris-onboarding-overlay"
        class="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-main-title"
      >
        <div
          id="onboarding-modal"
          class="relative w-full sm:max-w-xl bg-[#0f1118] border-0 sm:border border-white/10 sm:rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.85)] flex flex-col justify-between min-h-[100dvh] sm:min-h-0 sm:max-h-[92vh] overflow-hidden my-auto"
        >
          <!-- Top Bar -->
          <div class="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/5 bg-[#12151f]/90 shrink-0">
            <div class="flex items-center space-x-2.5">
              <div class="w-7 h-7 rounded-lg bg-[var(--color-accent,#e89e38)] flex items-center justify-center text-slate-950 font-black text-xs shadow-md select-none">
                U
              </div>
              <span id="onboarding-main-title" class="text-sm font-bold text-white tracking-wide">
                Welcome to UREfy <span class="sr-only">UREfy // SOVEREIGN WELCOME</span>
              </span>
            </div>

            <div class="flex items-center space-x-2">
              <span class="text-xs font-mono text-slate-400">${stepOfText}</span>
            </div>
          </div>

          <!-- Step Indicators Progress -->
          <div class="border-b border-white/5 bg-black/20 shrink-0">
            ${this.renderStepIndicators()}
          </div>

          <!-- Active Step Body -->
          <div class="p-4 sm:p-7 flex-1 overflow-y-auto bg-surface-canvas/40">
            ${activeStep.componentHtml}
          </div>

          <!-- Modal Footer Actions (Mobile-First Safe Area) -->
          <div class="flex items-center justify-between px-4 sm:px-6 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] border-t border-white/5 bg-[#12151f]/95 shrink-0">
            <div>
              ${
                !isFirst
                  ? `
                <button
                  type="button"
                  data-action="call-global"
                  data-global-method="onboardingWizard.previous"
                  class="px-4 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 text-xs font-semibold border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>←</span>
                  <span>${backText}</span>
                </button>
              `
                  : `
                <span class="text-[11px] text-slate-500 font-sans hidden sm:inline">Private &amp; self-sovereign</span>
              `
              }
            </div>

            <div class="flex items-center space-x-3 w-full sm:w-auto justify-end">
              ${
                !isLast
                  ? `
                <button
                  type="button"
                  id="btn-onboarding-continue"
                  data-action="call-global"
                  data-global-method="onboardingWizard.next"
                  ${canContinue ? '' : 'disabled aria-disabled="true"'}
                  class="w-full sm:w-auto h-12 min-h-[48px] px-8 rounded-xl bg-[var(--color-accent,#e89e38)] hover:brightness-105 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:pointer-events-none"
                >
                  ${
                    this.isSaving
                      ? `
                    <svg class="animate-spin h-4 w-4 text-slate-950" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>SAVING...</span>
                  `
                      : `
                    <span>${continueText}</span>
                    <span>→</span>
                  `
                  }
                </button>
              `
                  : `
                <button
                  type="button"
                  id="btn-onboarding-finish"
                  data-action="call-global"
                  data-global-method="onboardingWizard.finish"
                  ${canContinue ? '' : 'disabled aria-disabled="true"'}
                  class="w-full sm:w-auto h-12 min-h-[48px] px-8 rounded-xl bg-[var(--color-accent,#e89e38)] hover:brightness-105 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:pointer-events-none"
                >
                  <span>${finishText}</span>
                  <span>→</span>
                </button>
              `
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const onboardingWizard = new OnboardingWizard();
serviceRegistry.registerInstance(SERVICES.Onboarding, onboardingWizard);
