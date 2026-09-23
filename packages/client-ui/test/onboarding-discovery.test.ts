import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OnboardingWizard, ONBOARDING_INTERESTS, STARTER_COMMUNITIES, STARTER_CREATORS } from '../src/onboarding.js';
import { feedPersonalization } from '../src/feed-personalization.js';
import { sovereignCircleEngine } from '../src/sovereign-circle.js';
import { profileView } from '../src/profile-view.js';

class MockStorage implements Storage {
  private store: Map<string, string> = new Map();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

const mockStorage = new MockStorage();
(globalThis as any).localStorage = mockStorage;

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    location: { protocol: 'https:', host: 'localhost:5173' },
    localStorage: mockStorage,
    dispatchEvent: vi.fn(),
  };
} else {
  (globalThis as any).window.localStorage = mockStorage;
  if (!(globalThis as any).window.dispatchEvent) {
    (globalThis as any).window.dispatchEvent = vi.fn();
  }
}

(globalThis as any).__UREFY_DEMO_MODE__ = false;

(globalThis as any).fetch = vi.fn().mockImplementation(async () => ({
  ok: true,
  status: 200,
  json: async () => ({ success: true, isMember: true, communities: [] }),
}));

describe('PASS 6: Onboarding & Discovery Integration', () => {
  beforeEach(() => {
    (globalThis as any).__UREFY_DEMO_MODE__ = false;
    mockStorage.clear();
    feedPersonalization.resetInterests();
    for (const c of sovereignCircleEngine.getAllCircles()) {
      c.isJoined = false;
    }
    vi.clearAllMocks();
  });

  it('1. should provide curated interests covering major topics', () => {
    expect(ONBOARDING_INTERESTS.length).toBeGreaterThanOrEqual(10);
    const tech = ONBOARDING_INTERESTS.find(i => i.id === 'tech');
    const gaming = ONBOARDING_INTERESTS.find(i => i.id === 'gaming');
    const ai = ONBOARDING_INTERESTS.find(i => i.id === 'ai');
    const privacy = ONBOARDING_INTERESTS.find(i => i.id === 'privacy');

    expect(tech).toBeDefined();
    expect(tech?.tag).toBe('#Technology');
    expect(gaming?.tag).toBe('#Gaming');
    expect(ai?.tag).toBe('#ArtificialIntelligence');
    expect(privacy?.tag).toBe('#Privacy');
  });

  it('2. toggling interests should persist to localStorage and update feedPersonalization manual overrides', () => {
    const wizard = new OnboardingWizard();
    expect(wizard.selectedInterests.size).toBe(0);

    wizard.toggleInterest('tech');
    expect(wizard.selectedInterests.has('tech')).toBe(true);

    // Verify localStorage persistence
    const saved = JSON.parse(mockStorage.getItem('urefy_user_interests') || '[]');
    expect(saved).toContain('tech');

    // Verify feedPersonalization manual override
    expect(feedPersonalization.manualOverrides.get('#Technology')).toBe(100);

    // Toggle off
    wizard.toggleInterest('tech');
    expect(wizard.selectedInterests.has('tech')).toBe(false);
    expect(feedPersonalization.manualOverrides.get('#Technology')).toBe(0);
  });

  it('3. should provide starter communities and allow 1-click Join', () => {
    expect(STARTER_COMMUNITIES.length).toBeGreaterThanOrEqual(6);
    const techComm = STARTER_COMMUNITIES.find(c => c.id === 'technology');
    expect(techComm).toBeDefined();
    expect(techComm?.handle).toBe('c/technology');

    const wizard = new OnboardingWizard();
    // Test join
    wizard.toggleJoinCommunity('technology');
    const circle = sovereignCircleEngine.findCircle('technology');
    expect(circle?.isJoined).toBe(true);
  });

  it('4. joinAllRecommended should join all starter communities in 1 click', () => {
    const wizard = new OnboardingWizard();
    wizard.joinAllRecommended();

    for (const c of STARTER_COMMUNITIES) {
      const circle = sovereignCircleEngine.findCircle(c.id);
      expect(circle?.isJoined).toBe(true);
    }
  });

  it('5. should provide starter creators and allow 1-click Follow', () => {
    expect(STARTER_CREATORS.length).toBeGreaterThanOrEqual(3);
    const archivist = STARTER_CREATORS.find(c => c.fingerprint === 'aeth_archivist_01');
    expect(archivist).toBeDefined();

    const wizard = new OnboardingWizard();
    wizard.toggleFollowCreator('aeth_archivist_01');
    expect(profileView.isFollowing('aeth_archivist_01')).toBe(true);
  });

  it('6. should auto-complete and bypass onboarding if identity was restored', () => {
    mockStorage.setItem('aetheris_identity_restored', 'true');
    const wizard = new OnboardingWizard();
    expect(wizard.isCompleted).toBe(true);
    expect(wizard.isOpen).toBe(false);
  });
});
