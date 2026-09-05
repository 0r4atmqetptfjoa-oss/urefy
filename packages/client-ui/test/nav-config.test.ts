import { describe, it, expect } from 'vitest';
import {
  PRIMARY_NAV_ITEMS,
  MORE_MENU_ITEMS,
  ADVANCED_TOOLS_ITEMS,
  ALL_NAV_ITEMS,
  getNavItemById,
  getPrimaryNavItemByMode,
} from '../src/nav-config.js';

describe('Navigation Config: Primary Navigation & More Drawer Specification', () => {
  it('1. should export exactly 6 PRIMARY_NAV_ITEMS conforming to Master UX Specification', () => {
    expect(PRIMARY_NAV_ITEMS).toBeDefined();
    expect(PRIMARY_NAV_ITEMS.length).toBe(6);

    const expectedIds = ['feed', 'explore', 'messages', 'vault', 'profile', 'more'];
    PRIMARY_NAV_ITEMS.forEach((item, idx) => {
      expect(item.id).toBe(expectedIds[idx]);
      expect(item.iconName).toBeDefined();
      expect(typeof item.description).toBe('string');
      expect(item.description.length).toBeGreaterThan(0);
    });

    // Check specific labels
    expect(PRIMARY_NAV_ITEMS[0].label).toBe('Feed');
    expect(PRIMARY_NAV_ITEMS[1].label).toBe('Explore');
    expect(PRIMARY_NAV_ITEMS[2].label).toBe('Messages');
    expect(PRIMARY_NAV_ITEMS[3].label).toBe('Vault');
    expect(PRIMARY_NAV_ITEMS[4].label).toBe('Profile');
    expect(PRIMARY_NAV_ITEMS[5].label).toBe('More');
  });

  it('2. should strictly exclude admin from ALL_NAV_ITEMS and MORE_MENU_ITEMS', () => {
    const adminInAll = ALL_NAV_ITEMS.some(item => item.id.includes('admin') || item.label.toLowerCase().includes('admin'));
    expect(adminInAll).toBe(false);

    const adminInMore = MORE_MENU_ITEMS.some(item => item.id.includes('admin') || item.label.toLowerCase().includes('admin'));
    expect(adminInMore).toBe(false);
  });

  it('3. should export MORE_MENU_ITEMS with required categories', () => {
    expect(MORE_MENU_ITEMS).toBeDefined();
    const moreIds = MORE_MENU_ITEMS.map(m => m.id);
    expect(moreIds).toContain('bookmarks');
    expect(moreIds).toContain('notifications');
    expect(moreIds).toContain('communities');
    expect(moreIds).toContain('governance');
    expect(moreIds).toContain('security');
    expect(moreIds).toContain('backup');
    expect(moreIds).toContain('network');
    expect(moreIds).toContain('developer');
  });

  it('4. should resolve items via getNavItemById and getPrimaryNavItemByMode', () => {
    expect(getNavItemById('feed')).toBeDefined();
    expect(getNavItemById('feed')?.label).toBe('Feed');
    expect(getNavItemById('messages')?.label).toBe('Messages');

    expect(getPrimaryNavItemByMode('pulse')?.label).toBe('Feed');
    expect(getPrimaryNavItemByMode('explore')?.label).toBe('Explore');
    expect(getPrimaryNavItemByMode('relays')?.label).toBe('Messages');
    expect(getPrimaryNavItemByMode('vault')?.label).toBe('Vault');
    expect(getPrimaryNavItemByMode('profile')?.label).toBe('Profile');
  });
});
