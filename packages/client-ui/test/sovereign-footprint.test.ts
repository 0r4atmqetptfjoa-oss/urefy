import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SovereignFootprint } from '../src/settings-footprint.js';
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

describe('Ticket 3.3: Sovereign Footprint & Privacy Audit in Settings', () => {
  let footprint: SovereignFootprint;

  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
    footprint = new SovereignFootprint();
  });

  it('1. should compute complete sovereign footprint telemetry metrics', () => {
    const data = footprint.getFootprintData();

    expect(data.bundleSizeBytes).toBeGreaterThan(0);
    expect(data.bundleSizeFormatted).toContain('KB');
    expect(data.thirdPartyTrackersCount).toBe(0);
    expect(data.thirdPartyTrackersStatus).toContain('Zero-telemetry');
    expect(data.localStorageBytes).toBeGreaterThanOrEqual(0);
    expect(data.indexedDbBytes).toBeGreaterThan(0);
    expect(data.connectedP2pPeers).toBeGreaterThan(0);
    expect(data.carbonEfficiency).toContain('0 Dedicated');
    expect(data.networkMode).toBeDefined();
    expect(data.timestamp).toBeGreaterThan(0);
  });

  it('2. should calculate local storage byte footprint dynamically', () => {
    mockStorage.setItem('key1', 'value1');
    mockStorage.setItem('key2', 'value2');
    mockStorage.setItem('aetheris_large_cache', 'a'.repeat(2000));

    const data = footprint.getFootprintData();
    expect(data.localStorageBytes).toBeGreaterThan(2000);
  });

  it('3. should render footprint section HTML with metric cards and action buttons', () => {
    const html = footprint.renderFootprintSectionHTML();

    expect(html).toContain('id="sovereign-footprint-section"');
    expect(html).toContain('Client Bundle');
    expect(html).toContain('3rd-Party Trackers');
    expect(html).toContain('0 / 0');
    expect(html).toContain('Device Storage');
    expect(html).toContain('P2P Mesh Swarm');
    expect(html).toContain('btn-export-footprint-audit');
    expect(html).toContain('btn-clear-local-cache');
  });

  it('4. should clean local storage while preserving sovereign seed phrase when requested', () => {
    mockStorage.setItem('aetheris_mnemonic', 'twelve secret words test phrase');
    mockStorage.setItem('aetheris_seed_verified', 'true');
    mockStorage.setItem('temp_cache_data', 'to_be_deleted');
    mockStorage.setItem('temp_feed_cache', 'also_deleted');

    footprint.clearLocalData(true);

    // Mnemonic and verification are safely retained
    expect(mockStorage.getItem('aetheris_mnemonic')).toBe('twelve secret words test phrase');
    expect(mockStorage.getItem('aetheris_seed_verified')).toBe('true');

    // Ephemeral cache keys are purged
    expect(mockStorage.getItem('temp_cache_data')).toBeNull();
    expect(mockStorage.getItem('temp_feed_cache')).toBeNull();
  });

  it('5. should wipe entire storage when preserveMnemonic is false', () => {
    mockStorage.setItem('aetheris_mnemonic', 'twelve secret words test phrase');
    mockStorage.setItem('temp_cache_data', 'to_be_deleted');

    footprint.clearLocalData(false);

    expect(mockStorage.getItem('aetheris_mnemonic')).toBeNull();
    expect(mockStorage.getItem('temp_cache_data')).toBeNull();
  });
});
