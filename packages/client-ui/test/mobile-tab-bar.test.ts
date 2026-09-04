import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MobileTabBar } from '../src/mobile-tab-bar.js';
import { clientStore } from '../src/client-state.js';

describe('Ticket 3.2: Native Mobile Bottom Tab Bar (Feed / Vault / Cerc / Profil)', () => {
  let tabBar: MobileTabBar;

  beforeEach(() => {
    vi.clearAllMocks();
    tabBar = new MobileTabBar();
  });

  it('1. should resolve active tab from channel identifiers', () => {
    expect(tabBar.resolveTabFromChannel('pulse-global')).toBe('feed');
    expect(tabBar.resolveTabFromChannel('vault-releases')).toBe('vault');
    expect(tabBar.resolveTabFromChannel('vault-guides')).toBe('vault');
    expect(tabBar.resolveTabFromChannel('relays-general')).toBe('circle');
    expect(tabBar.resolveTabFromChannel('dm-aeth1_node99')).toBe('circle');
    expect(tabBar.resolveTabFromChannel('profile')).toBe('profile');
    expect(tabBar.resolveTabFromChannel('unknown-channel')).toBe('feed');
  });

  it('2. should set active tab and navigate clientStore channels', () => {
    tabBar.setTab('vault');
    expect(tabBar.activeTab).toBe('vault');
    expect(clientStore.activeChannelId).toBe('vault-releases');

    tabBar.setTab('circle');
    expect(tabBar.activeTab).toBe('circle');
    expect(clientStore.activeChannelId).toBe('relays-general');

    tabBar.setTab('profile');
    expect(tabBar.activeTab).toBe('profile');
    expect(clientStore.activeChannelId).toBe('profile');

    tabBar.setTab('feed');
    expect(tabBar.activeTab).toBe('feed');
    expect(clientStore.activeChannelId).toBe('pulse-global');
  });

  it('3. should advance nextTab and previousTab cyclically for swipe navigation', () => {
    tabBar.setTab('feed');

    tabBar.nextTab();
    expect(tabBar.activeTab).toBe('vault');

    tabBar.nextTab();
    expect(tabBar.activeTab).toBe('circle');

    tabBar.nextTab();
    expect(tabBar.activeTab).toBe('profile');

    tabBar.nextTab(); // cycles back to feed
    expect(tabBar.activeTab).toBe('feed');

    tabBar.previousTab(); // cycles backwards to profile
    expect(tabBar.activeTab).toBe('profile');
  });

  it('4. should render native mobile tab bar HTML with lg:hidden and 4 destinations', () => {
    tabBar.setTab('feed');
    const html = tabBar.renderTabBarHTML();

    expect(html).toContain('id="native-mobile-tab-bar"');
    expect(html).toContain('lg:hidden');
    expect(html).toContain('pb-[env(safe-area-inset-bottom)]');
    expect(html).toContain('btn-mobile-tab-feed');
    expect(html).toContain('btn-mobile-tab-vault');
    expect(html).toContain('btn-mobile-tab-circle');
    expect(html).toContain('btn-mobile-tab-profile');
    expect(html).toContain('Feed');
    expect(html).toContain('Vault');
    expect(html).toContain('Cerc');
    expect(html).toContain('Profil');
  });

  it('5. should highlight active tab with cyan text and indicator dot', () => {
    tabBar.setTab('vault');
    const html = tabBar.renderTabBarHTML();

    // Check that vault tab is marked active
    expect(html).toContain('btn-mobile-tab-vault');
    expect(html).toContain('text-cyan-400');
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
      } as any,
    ]);

    expect(tabBar.getUnreadCircleCount()).toBeGreaterThan(0);
    const html = tabBar.renderTabBarHTML();
    expect(html).toContain('bg-cyan-500');
  });

  it('7. should render 5th "more" tab slot and trigger mobile drawer', () => {
    const html = tabBar.renderTabBarHTML();

    expect(html).toContain('btn-mobile-tab-more');
    expect(html).toContain('Mai multe');
    expect(html).toContain('☰');
    expect(html).toContain('title="Mai multe opțiuni & unelte"');
    expect(html).toContain("if(window.__aetheris_open_mobile_drawer) window.__aetheris_open_mobile_drawer(); else if(window.mobileTabBar) window.mobileTabBar.setTab('more');");

    const drawerMock = vi.fn();
    (globalThis as any).window = { __aetheris_open_mobile_drawer: drawerMock };

    tabBar.setTab('more');
    expect(tabBar.activeTab).toBe('more');
    expect(drawerMock).toHaveBeenCalledTimes(1);

    delete (globalThis as any).window;
  });
});

