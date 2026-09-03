import { describe, it, expect, beforeEach } from 'vitest';
import { RelaysManager } from '../src/relays-manager.js';

class MockStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

describe('Sovereign Relays & Guilds Manager', () => {
  let manager: RelaysManager;

  beforeEach(() => {
    (globalThis as any).localStorage = new MockStorage();
    manager = new RelaysManager();
  });

  it('should initialize with default Global Sovereign Nexus relay', () => {
    const relays = manager.getRelays();
    expect(relays.length).toBeGreaterThanOrEqual(1);
    expect(relays[0].id).toBe('relay-global-nexus');
    expect(relays[0].name).toBe('Global Sovereign Nexus');
    expect(relays[0].channels.length).toBeGreaterThanOrEqual(2);
  });

  it('should create a new Sovereign Relay guild with custom metadata and channels', () => {
    const relay = manager.createRelay(
      'ZK Research Lab',
      '🔬',
      'Decentralized zero-knowledge proofs workspace',
      'fingerprint-test-123',
      ['research', 'papers', 'voice-lounge']
    );

    expect(relay).toBeDefined();
    expect(relay.name).toBe('ZK Research Lab');
    expect(relay.icon).toBe('🔬');
    expect(relay.ownerFingerprint).toBe('fingerprint-test-123');
    expect(relay.inviteCode).toMatch(/^RELAY-/);
    expect(relay.channels.length).toBe(3);
    expect(relay.channels[0].name).toBe('research');
    expect(manager.activeRelayId).toBe(relay.id);
  });

  it('should generate valid 1-click shareable invite links', () => {
    const relay = manager.createRelay('Cipher Enclave', '🗝️', 'Secure room', 'author-fp');
    const link = manager.generateInviteLink(relay.id);
    expect(link).toContain(`?invite=${relay.inviteCode}`);
  });

  it('should allow joining an existing relay by invite code', () => {
    const relay = manager.createRelay('Cyberpunk Haven', '🌆', 'Vibrant hub', 'owner-fp');
    const joined = manager.joinRelay(relay.inviteCode, 'new-user-456');

    expect(joined).toBeDefined();
    expect(joined?.id).toBe(relay.id);
    expect(joined?.members).toContain('new-user-456');
    expect(manager.activeRelayId).toBe(relay.id);
  });

  it('should allow dynamic channel creation and deletion within a sovereign relay', () => {
    const relay = manager.createRelay('DAO War Room', '⚔️', 'Strategic coordination', 'admin-fp');
    const added = manager.addChannel(relay.id, 'treasury-audit', 'text');
    expect(added).toBe(true);

    const updatedRelay = manager.getRelayById(relay.id);
    const addedChannel = updatedRelay?.channels.find(c => c.name === 'treasury-audit');
    expect(addedChannel).toBeDefined();

    if (addedChannel) {
      const deleted = manager.deleteChannel(relay.id, addedChannel.id);
      expect(deleted).toBe(true);
      const finalRelay = manager.getRelayById(relay.id);
      expect(finalRelay?.channels.some(c => c.id === addedChannel.id)).toBe(false);
    }
  });

  it('should render UI templates without errors', () => {
    const railHTML = manager.renderRelayServerRail();
    expect(railHTML).toContain('data-select-relay');
    expect(railHTML).toContain('btn-open-create-relay');
    expect(railHTML).toContain('btn-open-join-relay');

    manager.isCreateModalOpen = true;
    const createModalHTML = manager.renderCreateRelayModal();
    expect(createModalHTML).toContain('form-create-relay');

    manager.isInviteModalOpen = true;
    manager.targetInviteRelayId = 'relay-global-nexus';
    const inviteModalHTML = manager.renderInviteModal();
    expect(inviteModalHTML).toContain('relay-invite-url-input');
    expect(inviteModalHTML).toContain('btn-copy-relay-invite');

    manager.isJoinModalOpen = true;
    const joinModalHTML = manager.renderJoinRelayModal();
    expect(joinModalHTML).toContain('form-join-relay');
  });
});
