import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalAIAssistant } from '../src/ai-assistant.js';
import { clientStore } from '../src/client-state.js';

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
    clientStore,
  };
} else {
  (globalThis as any).window.localStorage = mockStorage;
  (globalThis as any).window.clientStore = clientStore;
}

describe('Ticket 2.2: Proactive Ambient Suggestions from LocalAIAssistant', () => {
  let assistant: LocalAIAssistant;

  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
    assistant = new LocalAIAssistant();
    assistant.setCooldownMs(0); // instant cooldown for granular unit test assertions
    (globalThis as any).window.aiAssistant = assistant;
  });

  afterEach(() => {
    assistant.stopObserver();
  });

  it('1. should start and stop the observer without memory leaks', () => {
    const checkSpy = vi.spyOn(assistant, 'checkAndEmitSuggestions');
    assistant.startObserver(50000);
    expect(checkSpy).toHaveBeenCalled();

    assistant.stopObserver();
    // After stopping, observerTimer is cleared
    expect((assistant as any).observerTimer).toBeNull();
  });

  it('2. should detect low vault entropy when seed is unverified and vault is empty', () => {
    mockStorage.removeItem('aetheris_seed_verified');
    clientStore.posts = []; // empty vault

    const suggestion = assistant.checkAndEmitSuggestions();
    expect(suggestion).not.toBeNull();
    expect(suggestion?.type).toBe('low_vault_entropy');
    expect(suggestion?.title).toContain('Vault Seed Security');
    expect(suggestion?.actionLabel).toBe('Backup Seed');
  });

  it('3. should detect DAO quorum near when proposal has votes close to 50', () => {
    // Mark entropy as verified and dismissed so we hit rule 2
    assistant.dismissedSuggestionTypes.add('low_vault_entropy');
    
    clientStore.posts = [
      {
        id: 'dao-prop-42',
        title: 'Upgrade Swarm Parameters for Q3',
        content: 'Proposed parameter updates...',
        authorFP: 'genesis-core',
        timestamp: Date.now(),
        meritVotes: 44, // 6 votes away from 50
        channelId: 'governance',
      },
    ];

    const suggestion = assistant.checkAndEmitSuggestions();
    expect(suggestion).not.toBeNull();
    expect(suggestion?.type).toBe('dao_quorum_near');
    expect(suggestion?.message).toContain('6 votes away');
    expect(suggestion?.actionLabel).toBe('View Proposal');
  });

  it('4. should detect inactive guardian nodes in the social recovery circle', () => {
    assistant.dismissedSuggestionTypes.add('low_vault_entropy');
    assistant.dismissedSuggestionTypes.add('dao_quorum_near');

    clientStore.members = [
      {
        fingerprint: 'guardian_node_alpha_99',
        alias: 'Guardian Alpha',
        role: 'GUARDIAN',
        joinedAt: Date.now() - 40 * 86400000,
        messagesCount: 0,
        isInactive: true,
      } as any,
    ];

    const suggestion = assistant.checkAndEmitSuggestions();
    expect(suggestion).not.toBeNull();
    expect(suggestion?.type).toBe('guardian_inactive');
    expect(suggestion?.message).toContain('guardian');
    expect(suggestion?.actionLabel).toBe('Check Circle');
  });

  it('5. should enforce cooldown rate limiting between emitted suggestions', () => {
    assistant.setCooldownMs(300000); // 5 minutes standard cooldown
    mockStorage.removeItem('aetheris_seed_verified');
    clientStore.posts = [];

    // First emission succeeds
    const sug1 = assistant.checkAndEmitSuggestions();
    expect(sug1).not.toBeNull();

    // Immediate second attempt fails due to active cooldown
    const sug2 = assistant.checkAndEmitSuggestions();
    expect(sug2).toBeNull();
  });

  it('6. should permanently silence suggestion types when dismissed', () => {
    assistant.setCooldownMs(0);
    mockStorage.removeItem('aetheris_seed_verified');
    clientStore.posts = [];

    // Dismiss low_vault_entropy
    assistant.dismissSuggestionType('low_vault_entropy');
    expect(assistant.dismissedSuggestionTypes.has('low_vault_entropy')).toBe(true);

    const stored = mockStorage.getItem('aetheris_dismissed_suggestions');
    expect(stored).toContain('low_vault_entropy');

    // Next check should skip low_vault_entropy
    const sug = assistant.checkAndEmitSuggestions();
    expect(sug?.type).not.toBe('low_vault_entropy');
  });

  it('7. should respect proactiveEnabled toggle and persist to storage', () => {
    assistant.setProactiveEnabled(false);
    expect(assistant.proactiveEnabled).toBe(false);
    expect(mockStorage.getItem('aetheris_proactive_ai_enabled')).toBe('false');

    const sug = assistant.checkAndEmitSuggestions();
    expect(sug).toBeNull();

    // Re-enable
    assistant.setProactiveEnabled(true);
    expect(assistant.proactiveEnabled).toBe(true);
    expect(mockStorage.getItem('aetheris_proactive_ai_enabled')).toBe('true');
  });

  it('8. should sync with clientStore setProactiveAiEnabled', () => {
    clientStore.setProactiveAiEnabled(false);
    expect(clientStore.proactiveAiEnabled).toBe(false);
    expect(assistant.proactiveEnabled).toBe(false);

    clientStore.setProactiveAiEnabled(true);
    expect(clientStore.proactiveAiEnabled).toBe(true);
    expect(assistant.proactiveEnabled).toBe(true);
  });
});
