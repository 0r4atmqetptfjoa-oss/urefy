import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OnboardingWizard } from '../src/onboarding.js';
import { profileView } from '../src/profile-view.js';

class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
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

describe('Negative Tests: Onboarding Form Validation & Error Recovery', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.restoreAllMocks();
  });

  it('1. should reject empty name and disable Continue', async () => {
    const wizard = new OnboardingWizard();
    wizard.updateDisplayName('   ');
    wizard.updateHandle('alice');

    expect(wizard.isStep1Valid()).toBe(false);

    const advanced = await wizard.submitStep1();
    expect(advanced).toBe(false);
    expect(wizard.currentStep).toBe(0);
    expect(wizard.stage).toBe('PROFILE_REQUIRED');
    expect(wizard.saveError).toContain('Please enter a display name');
  });

  it('2. should reject empty handle and disable Continue', async () => {
    const wizard = new OnboardingWizard();
    wizard.updateDisplayName('Alice Smith');
    wizard.updateHandle('   ');

    expect(wizard.isStep1Valid()).toBe(false);

    const advanced = await wizard.submitStep1();
    expect(advanced).toBe(false);
    expect(wizard.currentStep).toBe(0);
    expect(wizard.stage).toBe('PROFILE_REQUIRED');
    expect(wizard.saveError).toContain('Please choose a handle');
  });

  it('3. should reject invalid handle characters (e.g. spaces, symbols, too short)', async () => {
    const wizard = new OnboardingWizard();
    wizard.updateDisplayName('Alice Smith');

    // Too short (2 chars)
    wizard.updateHandle('al');
    expect(wizard.handleCheckState).toBe('invalid');
    expect(wizard.isStep1Valid()).toBe(false);

    // Invalid symbols
    wizard.updateHandle('alice-smith!');
    expect(wizard.handleCheckState).toBe('invalid');
    expect(wizard.handleCheckMessage).toContain('letters, numbers and underscores');
    expect(wizard.isStep1Valid()).toBe(false);

    const advanced = await wizard.submitStep1();
    expect(advanced).toBe(false);
    expect(wizard.currentStep).toBe(0);
  });

  it('4. should reject taken handle and prevent advance with collision notice', async () => {
    const wizard = new OnboardingWizard();
    wizard.updateDisplayName('Alice Smith');
    wizard.updateHandle('taken_user');
    wizard.handleCheckState = 'taken';
    wizard.handleCheckMessage = '@taken_user is already taken';

    expect(wizard.isStep1Valid()).toBe(false);

    const advanced = await wizard.submitStep1();
    expect(advanced).toBe(false);
    expect(wizard.currentStep).toBe(0);
    expect(wizard.saveError).toContain('is already taken');
  });

  it('5. should handle network/server 500 failure during profile save without advancing or losing input', async () => {
    const wizard = new OnboardingWizard();
    wizard.updateDisplayName('Alice Smith');
    wizard.updateHandle('alice_ok');

    vi.spyOn(profileView, 'saveProfile').mockResolvedValue(false);

    const advanced = await wizard.submitStep1();
    expect(advanced).toBe(false);
    expect(wizard.currentStep).toBe(0);
    expect(wizard.stage).toBe('PROFILE_REQUIRED');
    expect(wizard.saveError).toContain("Couldn't save your profile");
    expect(wizard.displayName).toBe('Alice Smith');
    expect(wizard.handle).toBe('alice_ok');
    expect(wizard.isSaving).toBe(false);
  });

  it('6. should ignore duplicate clicks while saving is in progress', async () => {
    const wizard = new OnboardingWizard();
    wizard.updateDisplayName('Alice Smith');
    wizard.updateHandle('alice_fast');

    let resolveSave: (val: boolean) => void;
    const savePromise = new Promise<boolean>((resolve) => {
      resolveSave = resolve;
    });

    const saveSpy = vi.spyOn(profileView, 'saveProfile').mockImplementation(() => savePromise);

    // First click
    const click1 = wizard.submitStep1();
    expect(wizard.isSaving).toBe(true);

    // Second immediate click
    const click2 = wizard.submitStep1();
    await expect(click2).resolves.toBe(false);

    // Only 1 profileView.saveProfile call dispatched
    expect(saveSpy).toHaveBeenCalledTimes(1);

    resolveSave!(true);
    await click1;
    expect(wizard.isSaving).toBe(false);
    expect(wizard.currentStep).toBe(1);
  });

  it('7. should handle server 429 rate limit error gracefully and allow retry', async () => {
    const wizard = new OnboardingWizard();
    wizard.updateDisplayName('Alice Smith');
    wizard.updateHandle('alice_rate');

    vi.spyOn(profileView, 'saveProfile').mockRejectedValue(new Error('Too Many Requests (429)'));

    const advanced = await wizard.submitStep1();
    expect(advanced).toBe(false);
    expect(wizard.currentStep).toBe(0);
    expect(wizard.saveError).toContain('Too Many Requests (429)');
    expect(wizard.isSaving).toBe(false);

    // User retries after cooldown
    vi.spyOn(profileView, 'saveProfile').mockResolvedValue(true);
    const retryAdvanced = await wizard.submitStep1();
    expect(retryAdvanced).toBe(true);
    expect(wizard.currentStep).toBe(1);
    expect(wizard.stage).toBe('INTERESTS_REQUIRED');
  });

  it('8. should never trap the user permanently on refresh during save', () => {
    // If the page refreshed while in step 0, draft remains in localStorage
    mockStorage.setItem('urefy_onboarding_profile_draft', JSON.stringify({ displayName: 'Alice Saved', handle: 'alicesaved' }));
    const restoredWizard = new OnboardingWizard();
    expect(restoredWizard.displayName).toBe('Alice Saved');
    expect(restoredWizard.handle).toBe('alicesaved');
    expect(restoredWizard.currentStep).toBe(0);
    expect(restoredWizard.isSaving).toBe(false);
  });
});
