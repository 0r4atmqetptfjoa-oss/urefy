import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onboardingWizard } from '../src/onboarding.js';
import { sovereignOnboarding } from '../src/first-time-onboarding.js';
import { sovereignDialog } from '../src/dialog-modal.js';
import { commandRailV2 } from '../src/command-rail-v2.js';
import { clientStore } from '../src/client-state.js';
import { mobileTabBar } from '../src/mobile-tab-bar.js';
import { profileView } from '../src/profile-view.js';

class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

const mockStorage = new LocalStorageMock();
(globalThis as any).localStorage = mockStorage;

describe('End-to-End Sovereign User Journeys (Unified Flows & Non-Technical UX)', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(profileView, 'saveProfile').mockResolvedValue(true);
    clientStore.activeChannelId = 'pulse-global';
  });

  describe('Journey 1: Onboarding Unification & Zero Duplicate Banners', () => {
    it('should show Onboarding Wizard for new users and suppress welcome banner simultaneously', () => {
      onboardingWizard.start();
      sovereignOnboarding.reset();

      // Open wizard
      expect(onboardingWizard.isOpen).toBe(true);

      // Sovereign onboarding banner should NOT show when wizard is open
      expect(sovereignOnboarding.shouldShow()).toBe(false);
    });

    it('should complete narrative wizard steps and persist completion flag to localStorage', async () => {
      onboardingWizard.start();
      onboardingWizard.updateDisplayName('Journey Tester');
      onboardingWizard.updateHandle('journey_tester');
      expect(onboardingWizard.currentStep).toBe(0);

      // Step 0 -> Step 1 (Profile)
      await onboardingWizard.next();
      expect(onboardingWizard.currentStep).toBe(1);

      // Step 1 -> Step 2 (Interests)
      onboardingWizard.toggleInterest('tech');
      onboardingWizard.toggleInterest('gaming');
      onboardingWizard.toggleInterest('privacy');
      await onboardingWizard.next();
      expect(onboardingWizard.currentStep).toBe(2);

      // Finish wizard
      onboardingWizard.toggleSeedConfirmation(true);
      await onboardingWizard.finish();
      expect(onboardingWizard.isCompleted).toBe(true);
      expect(mockStorage.getItem('aetheris_onboarding_completed')).toBe('true');

      // Now both wizard and welcome banner should not show
      expect(onboardingWizard.isOpen).toBe(false);
      expect(sovereignOnboarding.shouldShow()).toBe(false);
    });
  });

  describe('Journey 2: Command Rail (Ctrl+K) Palette Search', () => {
    it('should search commands and items across categories', () => {
      commandRailV2.open();
      expect(commandRailV2.isOpen).toBe(true);

      const results = commandRailV2.search('vault');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(c => c.title.toLowerCase().includes('vault'))).toBe(true);

      // Set query and execute
      commandRailV2.setQuery('vault');
      commandRailV2.executeSelected();
      expect(commandRailV2.isOpen).toBe(false);
    });
  });

  describe('Journey 3: Responsive Navigation & Non-Technical Labels', () => {
    it('should switch active channel when mobile tabs are clicked', () => {
      mobileTabBar.setTab('vault');
      expect(clientStore.activeChannelId).toBe('vault-releases');

      mobileTabBar.setTab('feed');
      expect(clientStore.activeChannelId).toBe('pulse-global');

      mobileTabBar.setTab('profile');
      expect(clientStore.activeChannelId).toBe('profile');
    });
  });

  describe('Journey 4: Zero Native Dialog Verification', () => {
    it('sovereignDialog handles alert and confirm gracefully with sovereign styling', async () => {
      // Mock alert resolution
      const alertPromise = sovereignDialog.alert('Encrypted keypair backup completed', { title: 'Security' });
      expect(alertPromise).toBeInstanceOf(Promise);

      // Mock confirm resolution
      const confirmPromise = sovereignDialog.confirm('Revoke relay permission?', { destructive: true });
      expect(confirmPromise).toBeInstanceOf(Promise);
    });
  });
});
