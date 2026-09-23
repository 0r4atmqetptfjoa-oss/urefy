import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OnboardingWizard } from '../src/onboarding.js';
import { i18n } from '../src/i18n.js';
import { profileView } from '../src/profile-view.js';

class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const mockStorage = new LocalStorageMock();
(globalThis as any).localStorage = mockStorage;

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    location: { protocol: 'https:', host: 'localhost:5173', pathname: '/', hash: '' },
    localStorage: mockStorage,
  };
} else {
  (globalThis as any).window.localStorage = mockStorage;
  if (!(globalThis as any).window.location) {
    (globalThis as any).window.location = { protocol: 'https:', host: 'localhost:5173', pathname: '/', hash: '' };
  }
}

describe('Ticket 2.1: Modern 3-Stage User Onboarding Flow', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(profileView, 'saveProfile').mockResolvedValue(true);
  });

  it('1. should automatically trigger onboarding for first-time visitors', () => {
    const wizard = new OnboardingWizard();
    expect(wizard.isCompleted).toBe(false);
    expect(wizard.isOpen).toBe(true);
    expect(wizard.stage).toBe('PROFILE_REQUIRED');
    expect(wizard.currentStep).toBe(0);
  });

  it('2. should not reopen onboarding if already completed in localStorage', () => {
    mockStorage.setItem('aetheris_onboarding_completed', 'true');
    const wizard = new OnboardingWizard();
    expect(wizard.isCompleted).toBe(true);
    expect(wizard.isOpen).toBe(false);
    expect(wizard.stage).toBe('ONBOARDING_COMPLETE');
  });

  it('3. should provide exactly 3 progressive steps: Profile, Interests, Recovery', () => {
    const wizard = new OnboardingWizard();
    const steps = wizard.getSteps('aeth1_test_fingerprint');

    expect(steps.length).toBe(3);

    // Step 0: Profile
    expect(steps[0].icon).toBe('👤');
    expect(steps[0].title).toBe('Create your UREfy profile');
    expect(steps[0].componentHtml).toContain('onboarding-display-name');
    expect(steps[0].componentHtml).toContain('onboarding-handle');
    expect(steps[0].componentHtml).toContain('placeholder="Your name"');
    expect(steps[0].componentHtml).toContain('placeholder="yourname"');

    // Step 1: Interests
    expect(steps[1].icon).toBe('✨');
    expect(steps[1].title).toBe('What are you into?');
    expect(steps[1].componentHtml).toContain('Technology');
    expect(steps[1].componentHtml).toContain('Gaming');

    // Step 2: Recovery Key
    expect(steps[2].icon).toBe('🔐');
    expect(steps[2].title).toBe('Protect your identity');
    expect(steps[2].componentHtml).toContain('btn-copy-seed-words');
    expect(steps[2].componentHtml).toContain('btn-download-seed-backup');
    expect(steps[2].componentHtml).toContain('Show recovery words');
  });

  it('4. should render modal HTML only when isOpen is true', () => {
    const wizard = new OnboardingWizard();
    wizard.isOpen = true;
    const modalHtml = wizard.renderWizardModal('aeth1_test_fingerprint');
    expect(modalHtml).toContain('aetheris-onboarding-overlay');
    expect(modalHtml).toContain('Welcome to UREfy');
    expect(modalHtml).toContain('Step 1 of 3');

    wizard.isOpen = false;
    expect(wizard.renderWizardModal()).toBe('');
  });

  it('5. should progress smoothly through all 3 stages and complete', async () => {
    const wizard = new OnboardingWizard();
    expect(wizard.currentStep).toBe(0);
    expect(wizard.stage).toBe('PROFILE_REQUIRED');

    // Step 1: Profile
    wizard.updateDisplayName('Beta Tester');
    wizard.updateHandle('beta_tester');
    expect(wizard.isStep1Valid()).toBe(true);

    const step1Ok = await wizard.submitStep1();
    expect(step1Ok).toBe(true);
    expect(wizard.stage).toBe('INTERESTS_REQUIRED');
    expect(wizard.currentStep).toBe(1);

    // Step 2: Interests (requires at least 3)
    wizard.toggleInterest('tech');
    wizard.toggleInterest('gaming');
    expect(wizard.submitStep2()).toBe(false); // only 2 selected

    wizard.toggleInterest('science');
    expect(wizard.submitStep2()).toBe(true); // 3 selected
    expect(wizard.stage).toBe('RECOVERY_REQUIRED');
    expect(wizard.currentStep).toBe(2);

    // Step 3: Recovery
    wizard.toggleSeedConfirmation(true);
    await wizard.finish();

    expect(wizard.isOpen).toBe(false);
    expect(wizard.isCompleted).toBe(true);
    expect(wizard.stage).toBe('ONBOARDING_COMPLETE');
    expect(mockStorage.getItem('aetheris_onboarding_completed')).toBe('true');
  });

  it('6. should allow skipping and persist completion when valid', async () => {
    const wizard = new OnboardingWizard();
    wizard.updateDisplayName('Beta Tester');
    wizard.updateHandle('beta_tester');
    await wizard.skip();
    expect(wizard.isOpen).toBe(false);
    expect(wizard.isCompleted).toBe(true);
    expect(mockStorage.getItem('aetheris_onboarding_completed')).toBe('true');
  });

  it('7. should translate narrative steps into Romanian when language is changed', () => {
    i18n.setLanguage('ro');
    const wizard = new OnboardingWizard();
    const steps = wizard.getSteps();

    expect(steps[0].title).toBe('Identitatea ta îți aparține');
    expect(steps[2].title).toBe('Salvează-ți cheia de salvare');

    // Reset back to English
    i18n.setLanguage('en');
  });

  it('8. should resume safely from appropriate onboarding state on refresh', () => {
    // Simulate user in Step 2: Interests
    mockStorage.setItem('urefy_onboarding_stage', 'INTERESTS_REQUIRED');
    const wizardStep2 = new OnboardingWizard();
    expect(wizardStep2.isCompleted).toBe(false);
    expect(wizardStep2.isOpen).toBe(true);
    expect(wizardStep2.currentStep).toBe(1);
    expect(wizardStep2.stage).toBe('INTERESTS_REQUIRED');

    // Simulate user in Step 3: Recovery
    mockStorage.setItem('urefy_onboarding_stage', 'RECOVERY_REQUIRED');
    const wizardStep3 = new OnboardingWizard();
    expect(wizardStep3.isCompleted).toBe(false);
    expect(wizardStep3.isOpen).toBe(true);
    expect(wizardStep3.currentStep).toBe(2);
    expect(wizardStep3.stage).toBe('RECOVERY_REQUIRED');
  });
});
