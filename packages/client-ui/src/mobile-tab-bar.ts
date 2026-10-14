/**
 * @file mobile-tab-bar.ts
 * @package @aetheris/client-ui
 * @description 2027 Spatial Ergonomic Mobile Navigation Bar (≥44px Tap Targets & Full ARIA Landmarks).
 */

import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore } from './client-state.js';
import { renderIcon, IconName } from './ui/icons.js';
import { sovereignRouter } from './router.js';

export type MobileTab = 'feed' | 'explore' | 'communities' | 'messages' | 'profile' | 'vault' | 'circle';

export interface MobileTabDefinition {
  id: MobileTab;
  label: string;
  iconName: IconName;
  channelTarget?: string;
}

export const MOBILE_TABS: MobileTabDefinition[] = [
  { id: 'feed', label: 'Feed', iconName: 'newspaper', channelTarget: 'pulse-global' },
  { id: 'explore', label: 'Explore', iconName: 'compass' },
  { id: 'messages', label: 'Messages', iconName: 'message-circle', channelTarget: 'relays-general' },
  { id: 'vault', label: 'Vault', iconName: 'vault', channelTarget: 'vault-releases' },
  { id: 'profile', label: 'Profile', iconName: 'user' },
];

export class MobileTabBar {
  public activeTab: MobileTab = 'feed';
  public tabs: MobileTabDefinition[] = MOBILE_TABS;

  constructor() {
    this.syncActiveTabWithStore();
    this.bindStoreSync();
    this.bindTouchSwipe();
  }

  private syncActiveTabWithStore(): void {
    const resolved = this.resolveTabFromChannel(clientStore?.activeChannelId || 'pulse-global');
    if (resolved) {
      this.activeTab = resolved;
    }
  }

  private bindStoreSync(): void {
    if (clientStore && typeof clientStore.subscribe === 'function') {
      clientStore.subscribe(() => {
        this.syncActiveTabWithStore();
      });
    }
  }

  public resolveTabFromChannel(channelId: string): MobileTab | null {
    if (!channelId) return 'feed';
    if (channelId.startsWith('vault')) return 'vault';
    if (channelId.startsWith('relays')) return 'messages';
    if (channelId.startsWith('pulse')) return 'feed';
    return null;
  }

  public setTab(tab: MobileTab): void {
    this.activeTab = tab;
    switch (tab) {
      case 'feed':
        sovereignRouter.navigateTo('feed');
        break;
      case 'explore':
        sovereignRouter.navigateTo('explore');
        break;
      case 'communities':
      case 'circle':
        sovereignRouter.navigateTo('communities');
        break;
      case 'messages':
        sovereignRouter.navigateTo('messages');
        break;
      case 'vault':
        sovereignRouter.navigateTo('vault');
        break;
      case 'profile':
        sovereignRouter.navigateTo('profile');
        break;
    }
    this.syncActiveTabDOM();
  }

  public nextTab(): void {
    const idx = this.tabs.findIndex((t) => t.id === this.activeTab);
    const nextIdx = (idx + 1) % this.tabs.length;
    this.setTab(this.tabs[nextIdx].id);
  }

  public previousTab(): void {
    const idx = this.tabs.findIndex((t) => t.id === this.activeTab);
    const prevIdx = (idx - 1 + this.tabs.length) % this.tabs.length;
    this.setTab(this.tabs[prevIdx].id);
  }

  private isSwipeExcluded(target: EventTarget | null): boolean {
    if (!target || typeof (target as HTMLElement).closest !== 'function') return false;
    const el = target as HTMLElement;
    return Boolean(
      el.closest('input, textarea, select, pre, code, [data-no-swipe="true"], #mesh-radar-canvas')
    );
  }

  private bindTouchSwipe(): void {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    let startX = 0;
    let startY = 0;

    window.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        if (this.isSwipeExcluded(e.target)) return;
        const touch = e.touches?.[0];
        if (touch) {
          startX = touch.clientX;
          startY = touch.clientY;
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'touchend',
      (e: TouchEvent) => {
        if (this.isSwipeExcluded(e.target)) return;
        const touch = e.changedTouches?.[0];
        if (!touch) return;
        const dx = touch.clientX - startX;
        const dy = Math.abs(touch.clientY - startY);
        if (Math.abs(dx) > 95 && dy < 45) {
          if (dx < 0) this.nextTab();
          else this.previousTab();
        }
      },
      { passive: true }
    );
  }

  public getUnreadMessagesCount(): number {
    return 0;
  }

  public getUnreadFeedCount(): number {
    return 0;
  }

  public syncActiveTabDOM(channelId?: string): void {
    if (channelId) {
      const resolved = this.resolveTabFromChannel(channelId);
      if (resolved) this.activeTab = resolved;
    }
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
    const buttons = document.querySelectorAll<HTMLElement>('[data-mobile-tab]');
    buttons.forEach((btn) => {
      const tabId = btn.getAttribute('data-mobile-tab');
      const isCurrent = tabId === this.activeTab;
      btn.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    });
  }

  public renderTabBarHTML(): string {
    const unreadMsgs = this.getUnreadMessagesCount();

    return `<nav
      id="mobile-sovereign-tab-bar"
      role="navigation"
      aria-label="Mobile Sovereign Navigation"
      class="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#0a0d16]/90 backdrop-blur-2xl border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom)] gpu-accelerated no-flicker"
    >
      <div class="flex items-center justify-around max-w-md mx-auto">
        ${this.tabs
          .map((tab) => {
            const isActive = this.activeTab === tab.id;
            const showBadge = tab.id === 'messages' && unreadMsgs > 0;
            return `<button
              type="button"
              id="mobile-tab-btn-${tab.id}"
              data-mobile-tab="${tab.id}"
              data-action="nav.primary"
              data-nav-id="${tab.id}"
              aria-label="${tab.label}"
              title="${tab.label}"
              aria-current="${isActive ? 'page' : 'false'}"
              class="relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-2 px-1 rounded-xl text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                isActive ? 'text-cyan-300' : 'text-slate-400 hover:text-white'
              }"
            >
              ${renderIcon(tab.iconName, {
                size: 19,
                variant: isActive ? 'solid' : 'outline',
                ariaHidden: true,
              })}
              <span class="mt-0.5 tracking-tight">${tab.label}</span>${
                showBadge
                  ? `<span class="absolute top-1.5 right-4 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">${unreadMsgs}</span>`
                  : ''
              }
            </button>`;
          })
          .join('')}
      </div>
    </nav>`;
  }
}

export const mobileTabBar = new MobileTabBar();
serviceRegistry.registerInstance(SERVICES.MobileTabBar, mobileTabBar);
