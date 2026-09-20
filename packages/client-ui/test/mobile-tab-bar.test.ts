import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MobileTabBar } from '../src/mobile-tab-bar.js';
import { clientStore } from '../src/client-state.js';

describe('Mobile Bottom Tab Bar: 5-Tab Master Specification (Feed, Explore, Messages, Vault, Profile)', () => {
  let tabBar: MobileTabBar;

  beforeEach(() => {
    vi.clearAllMocks();
    tabBar = new MobileTabBar();
  });

  it('1. should resolve active tab from channel identifiers', () => {
    expect(tabBar.resolveTabFromChannel('pulse-global')).toBe('feed');
    expect(tabBar.resolveTabFromChannel('explore')).toBe('explore');
    expect(tabBar.resolveTabFromChannel('relays-general')).toBe('messages');
    expect(tabBar.resolveTabFromChannel('dm-aeth1_node99')).toBe('messages');
    expect(tabBar.resolveTabFromChannel('vault-releases')).toBe('vault');
    expect(tabBar.resolveTabFromChannel('vault-guides')).toBe('vault');
    expect(tabBar.resolveTabFromChannel('profile')).toBe('profile');
    expect(tabBar.resolveTabFromChannel('unknown-channel')).toBe('feed');
  });

  it('2. should set active tab and navigate clientStore channels', () => {
    tabBar.setTab('explore');
    expect(tabBar.activeTab).toBe('explore');
    expect(clientStore.activeChannelId).toBe('explore');

    tabBar.setTab('messages');
    expect(tabBar.activeTab).toBe('messages');
    expect(clientStore.activeChannelId).toBe('relays-general');

    tabBar.setTab('vault');
    expect(tabBar.activeTab).toBe('vault');
    expect(clientStore.activeChannelId).toBe('vault-releases');

    tabBar.setTab('profile');
    expect(tabBar.activeTab).toBe('profile');
    expect(clientStore.activeChannelId).toBe('profile');

    tabBar.setTab('feed');
    expect(tabBar.activeTab).toBe('feed');
    expect(clientStore.activeChannelId).toBe('pulse-global');
  });

  it('3. should advance nextTab and previousTab cyclically across all 5 tabs', () => {
    tabBar.setTab('feed');

    tabBar.nextTab();
    expect(tabBar.activeTab).toBe('explore');

    tabBar.nextTab();
    expect(tabBar.activeTab).toBe('messages');

    tabBar.nextTab();
    expect(tabBar.activeTab).toBe('vault');

    tabBar.nextTab();
    expect(tabBar.activeTab).toBe('profile');

    tabBar.nextTab(); // cycles back to feed
    expect(tabBar.activeTab).toBe('feed');

    tabBar.previousTab(); // cycles backwards to profile
    expect(tabBar.activeTab).toBe('profile');
  });

  it('4. should render native mobile tab bar HTML with lg:hidden and 5 destinations', () => {
    tabBar.setTab('feed');
    const html = tabBar.renderTabBarHTML();

    expect(html).toContain('id="native-mobile-tab-bar"');
    expect(html).toContain('lg:hidden');
    expect(html).toContain('pb-[env(safe-area-inset-bottom)]');
    expect(html).toContain('btn-mobile-tab-feed');
    expect(html).toContain('btn-mobile-tab-explore');
    expect(html).toContain('btn-mobile-tab-messages');
    expect(html).toContain('btn-mobile-tab-vault');
    expect(html).toContain('btn-mobile-tab-profile');
    expect(html).toContain('Feed');
    expect(html).toContain('Explore');
    expect(html).toContain('Messages');
    expect(html).toContain('Vault');
    expect(html).toContain('Profile');
  });

  it('5. should highlight active tab with accent text and indicator dot', () => {
    tabBar.setTab('vault');
    const html = tabBar.renderTabBarHTML();

    expect(html).toContain('btn-mobile-tab-vault');
    expect(html).toContain('text-[var(--color-accent,#e59b3c)]');
  });

  it('6. should render unread count badges when available', () => {
    clientStore.messages.set('dm-test', [
      {
        id: 'msg-1',
        channelId: 'dm-test',
        authorFP: 'remote-user',
        content: 'Hey there',
        timestamp: Date.now(),
        isDelivered: false,
        isMine: false,
      } as any,
    ]);

    expect(tabBar.getUnreadMessagesCount()).toBeGreaterThan(0);
    const html = tabBar.renderTabBarHTML();
    expect(html).toContain('bg-[var(--color-accent,#e59b3c)]');
  });
});
