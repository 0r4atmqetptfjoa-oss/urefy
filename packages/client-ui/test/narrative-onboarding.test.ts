import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OnboardingWizard } from '../src/onboarding.js';
import { i18n } from '../src/i18n.js';
import { AetherisClientStore } from '../src/client-state.js';

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
    location: { protocol: 'https:', host: 'localhost:5173' },
    localStorage: mockStorage,
  };
} else {
  (globalThis as any).window.localStorage = mockStorage;
  if (!(globalThis as any).window.location) {
    (globalThis as any).window.location = { protocol: 'https:', host: 'localhost:5173' };
  }
}

describe('Ticket 2.1: Narrative 4-Step User Onboarding Flow', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  it('1. should automatically trigger onboarding for first-time visitors', () => {
    const wizard = new OnboardingWizard();
    expect(wizard.isCompleted).toBe(false);
    expect(wizard.isOpen).toBe(true);
    expect(wizard.currentStep).toBe(0);
  });

  it('2. should not reopen onboarding if already completed in localStorage', () => {
    mockStorage.setItem('aetheris_onboarding_completed', 'true');
    const wizard = new OnboardingWizard();
    expect(wizard.isCompleted).toBe(true);
    expect(wizard.isOpen).toBe(false);
  });

  it('3. should provide exactly 3 narrative steps explaining values before mechanics', () => {
    const wizard = new OnboardingWizard();
    const steps = wizard.getSteps('aeth1_test_fingerprint');

    expect(steps.length).toBe(3);

    // Step 1: Identity
    expect(steps[0].icon).toBe('🌱');
    expect(steps[0].title).toBe('Your Identity Belongs to You');
    expect(steps[0].componentHtml).toContain('Zero Central Servers');
    expect(steps[0].componentHtml).toContain('aeth1_test_fingerprint'.substring(0, 16));

    // Step 2: Protection / E2EE & Network
    expect(steps[1].icon).toBe('🔒');
    expect(steps[1].title).toBe('Your Content is Fully Protected');
    expect(steps[1].componentHtml).toContain('AES-GCM / ML-KEM');

    // Step 3: Recovery Key
    expect(steps[2].icon).toBe('🔐');
    expect(steps[2].title).toBe('Save Your Recovery Key');
    expect(steps[2].componentHtml).toContain('12-Word Master Recovery Phrase');
    expect(steps[2].componentHtml).toContain('btn-copy-seed-words');
    expect(steps[2].componentHtml).toContain('Download Encrypted Backup');
  });

  it('4. should render modal HTML only when isOpen is true', () => {
    const wizard = new OnboardingWizard();
    wizard.isOpen = true;
    const modalHtml = wizard.renderWizardModal('aeth1_test_fingerprint');
    expect(modalHtml).toContain('aetheris-onboarding-overlay');
    expect(modalHtml).toContain('AETHERIS // SOVEREIGN WELCOME');

    wizard.isOpen = false;
    expect(wizard.renderWizardModal()).toBe('');
  });

  it('5. should progress smoothly through all 3 steps and complete', () => {
    const wizard = new OnboardingWizard();
    expect(wizard.currentStep).toBe(0);

    wizard.next();
    expect(wizard.currentStep).toBe(1);

    wizard.next();
    expect(wizard.currentStep).toBe(2);

    // Finishing on step 2 persists to storage
    wizard.finish();
    expect(wizard.isOpen).toBe(false);
    expect(wizard.isCompleted).toBe(true);
    expect(mockStorage.getItem('aetheris_onboarding_completed')).toBe('true');
  });

  it('6. should allow skipping and persist completion', () => {
    const wizard = new OnboardingWizard();
    wizard.skip();
    expect(wizard.isOpen).toBe(false);
    expect(wizard.isCompleted).toBe(true);
    expect(mockStorage.getItem('aetheris_onboarding_completed')).toBe('true');
  });

  it('7. should translate narrative steps into Romanian when language is changed', () => {
    i18n.setLanguage('ro');
    const wizard = new OnboardingWizard();
    const steps = wizard.getSteps();

    expect(steps[0].title).toBe('Identitatea ta \u00ee\u021bi apar\u021bine');
    expect(steps[1].title).toBe('Con\u021binutul t\u0103u e protejat');
    expect(steps[2].title).toBe('Salveaz\u0103-\u021bi cheia de salvare');

    // Reset back to English
    i18n.setLanguage('en');
  });
});
