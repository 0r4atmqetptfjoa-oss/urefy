import { describe, it, expect } from 'vitest';
import {
  PRIMARY_NAV_ITEMS,
  ADVANCED_TOOLS_ITEMS,
  ALL_NAV_ITEMS,
  getNavItemById,
  getPrimaryNavItemByMode,
} from '../src/nav-config.js';

describe('Navigation Config: PRIMARY_NAV_ITEMS and ADVANCED_TOOLS_ITEMS', () => {
  it('1. should export exactly 5 PRIMARY_NAV_ITEMS with correct modes and testIds', () => {
    expect(PRIMARY_NAV_ITEMS).toBeDefined();
    expect(PRIMARY_NAV_ITEMS.length).toBe(5);

    const expectedPrimary = [
      {
        id: 'pulse',
        mode: 'pulse',
        label: 'Feed (Pulse)',
        sublabel: 'Flux publicații & știri',
        icon: '⚡',
        testId: 'nav-item-pulse',
      },
      {
        id: 'explore',
        mode: 'explore',
        label: 'Explorează',
        sublabel: 'Tendințe & noduri',
        icon: '🔍',
        testId: 'nav-item-explore',
      },
      {
        id: 'vault',
        mode: 'vault',
        label: 'Seif (Vault)',
        sublabel: 'Fișiere & release-uri',
        icon: '📚',
        testId: 'nav-item-vault',
      },
      {
        id: 'relays',
        mode: 'relays',
        label: 'Servere (Relays)',
        sublabel: 'Canale & chat E2EE',
        icon: '📡',
        testId: 'nav-item-relays',
      },
      {
        id: 'profile',
        mode: 'profile',
        label: 'Profil',
        sublabel: 'Identitatea ta suverană',
        icon: '👤',
        testId: 'nav-item-profile',
      },
    ];

    expectedPrimary.forEach((expected, index) => {
      const actual = PRIMARY_NAV_ITEMS[index];
      expect(actual.id).toBe(expected.id);
      expect(actual.mode).toBe(expected.mode);
      expect(actual.label).toBe(expected.label);
      expect(actual.sublabel).toBe(expected.sublabel);
      expect(actual.icon).toBe(expected.icon);
      expect(actual.testId).toBe(expected.testId);
      expect(typeof actual.description).toBe('string');
      expect(actual.description.length).toBeGreaterThan(0);
    });
  });

  it('2. should export ADVANCED_TOOLS_ITEMS containing all 10 expected tools with correct testIds and icons', () => {
    expect(ADVANCED_TOOLS_ITEMS).toBeDefined();
    expect(ADVANCED_TOOLS_ITEMS.length).toBe(10);

    const expectedTools = [
      { id: 'bookmarks', label: 'Saved Bookmarks', icon: '🔖', testId: 'rail-btn-bookmarks' },
      { id: 'theme', label: 'Display & Themes', icon: '🎨', testId: 'rail-btn-theme' },
      { id: 'dao', label: 'DAO Governance', icon: '🏛️', testId: 'nav-btn-dao' },
      { id: 'rss', label: 'RSS Importer', icon: '📡', testId: 'btn-open-rss-panel' },
      { id: 'cve', label: 'CVE Monitor', icon: '🛡️', testId: 'btn-open-cve-monitor' },
      { id: 'observatory', label: 'Network Observatory', icon: '🔭', testId: 'btn-open-network-observatory' },
      { id: 'wot', label: 'Trust Graph', icon: '🕸️', testId: 'btn-open-wot-graph' },
      { id: 'gossip', label: 'Gossip Visualizer', icon: '📡', testId: 'btn-open-gossip-viz' },
      { id: 'backup', label: 'Export & Backup', icon: '💾', testId: 'btn-open-backup-export' },
      { id: 'steganography', label: 'Pixel Canvas Steganography', icon: '🖼️', testId: 'drawer-btn-steganography' },
    ];

    expectedTools.forEach(expected => {
      const tool = ADVANCED_TOOLS_ITEMS.find(t => t.id === expected.id);
      expect(tool, `Tool ${expected.id} should exist in ADVANCED_TOOLS_ITEMS`).toBeDefined();
      expect(tool!.label).toBe(expected.label);
      expect(tool!.icon).toBe(expected.icon);
      expect(tool!.testId).toBe(expected.testId);
      expect(typeof tool!.description).toBe('string');
      expect(tool!.description.length).toBeGreaterThan(0);
    });
  });

  it('3. should lookup nav items by ID and primary items by mode', () => {
    expect(getNavItemById('vault')).toEqual(PRIMARY_NAV_ITEMS.find(i => i.id === 'vault'));
    expect(getNavItemById('steganography')).toEqual(ADVANCED_TOOLS_ITEMS.find(i => i.id === 'steganography'));
    expect(getNavItemById('nonexistent')).toBeUndefined();

    expect(getPrimaryNavItemByMode('pulse')).toEqual(PRIMARY_NAV_ITEMS.find(i => i.mode === 'pulse'));
    expect(getPrimaryNavItemByMode('explore')).toEqual(PRIMARY_NAV_ITEMS.find(i => i.mode === 'explore'));
    expect(getPrimaryNavItemByMode('invalid')).toBeUndefined();

    expect(ALL_NAV_ITEMS.length).toBe(15);
  });
});
