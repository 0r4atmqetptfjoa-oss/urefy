/**
 * @file mobile-tab-bar.ts
 * @package @aetheris/client-ui
 * @description Native Mobile Bottom Tab Bar (Feed / Vault / Cerc / Profil) for viewports < 1024px (lg:hidden).
 * Provides clean, progressive disclosure on mobile devices with touch swipe navigation,
 * safe-area insets, and active tab indicator tracking.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore } from './client-state.js';
import { i18n } from './i18n.js';

export type MobileTab = 'feed' | 'vault' | 'circle' | 'profile' | 'more';

export interface MobileTabDefinition {
  id: MobileTab;
  label: string;
  icon: string;
  channelTarget?: string;
}

export class MobileTabBar {
  public activeTab: MobileTab = 'feed';
  private readonly tabsOrder: MobileTab[] = ['feed', 'vault', 'circle', 'profile'];
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  constructor() {
    this.syncActiveTabWithStore();
    this.bindStoreSync();
    this.bindTouchSwipe();

    if (typeof window !== 'undefined') {
      (window as any).mobileTabBar = this;
    }
  }

  private syncActiveTabWithStore(): void {
    const channel = clientStore?.activeChannelId || 'pulse-global';
    this.activeTab = this.resolveTabFromChannel(channel);
  }

  private bindStoreSync(): void {
    if (typeof window === 'undefined') return;
    if (clientStore && typeof clientStore.subscribe === 'function') {
      clientStore.subscribe(() => {
        this.syncActiveTabWithStore();
      });
    }
  }

  /**
   * Derives active MobileTab from current channel ID
   */
  public resolveTabFromChannel(channelId: string): MobileTab {
    if (channelId.startsWith('vault-')) {
      return 'vault';
    }
    if (channelId.startsWith('relays-') || channelId.startsWith('dm-') || channelId === 'circle') {
      return 'circle';
    }
    if (channelId.startsWith('profile')) {
      return 'profile';
    }
    return 'feed';
  }

  /**
   * Sets the active tab and navigates the store
   */
  public setTab(tab: MobileTab): void {
    this.activeTab = tab;

    switch (tab) {
      case 'feed':
        clientStore.joinChannel('pulse-global');
        break;
      case 'vault':
        clientStore.joinChannel('vault-releases');
        break;
      case 'circle':
        clientStore.joinChannel('relays-general');
        break;
      case 'profile':
        clientStore.activeChannelId = 'profile';
        if (typeof window !== 'undefined' && (window as any).profileView) {
          (window as any).profileView.setTargetFingerprint(clientStore.keypair.fingerprint);
        }
        clientStore.notify();
        break;
      case 'more':
        if (typeof window !== 'undefined') {
          if ((window as any).__aetheris_open_mobile_drawer) {
            (window as any).__aetheris_open_mobile_drawer();
          } else if ((window as any).__aetheris_toggle_mobile_drawer) {
            (window as any).__aetheris_toggle_mobile_drawer();
          }
        }
        break;
    }
  }

  /**
   * Advances to next tab (e.g. on swipe left)
   */
  public nextTab(): void {
    const currentIndex = this.tabsOrder.indexOf(this.activeTab);
    const nextIndex = (currentIndex + 1) % this.tabsOrder.length;
    this.setTab(this.tabsOrder[nextIndex]);
  }

  /**
   * Reverses to previous tab (e.g. on swipe right)
   */
  public previousTab(): void {
    const currentIndex = this.tabsOrder.indexOf(this.activeTab);
    const prevIndex = (currentIndex - 1 + this.tabsOrder.length) % this.tabsOrder.length;
    this.setTab(this.tabsOrder[prevIndex]);
  }

  /**
   * Binds horizontal touch swipe listeners on mobile viewports (< 1024px)
   */
  private bindTouchSwipe(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    document.addEventListener('touchstart', (e: TouchEvent) => {
      if (window.innerWidth >= 1024 || e.touches.length !== 1) return;
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e: TouchEvent) => {
      if (window.innerWidth >= 1024 || e.changedTouches.length !== 1) return;
      const deltaX = e.changedTouches[0].clientX - this.touchStartX;
      const deltaY = e.changedTouches[0].clientY - this.touchStartY;

      // Ensure horizontal swipe with minimal vertical drift
      if (Math.abs(deltaX) > 75 && Math.abs(deltaY) < 45) {
        if (deltaX < 0) {
          this.nextTab();
        } else {
          this.previousTab();
        }
      }
    }, { passive: true });
  }

  /**
   * Computes unread count for circles/chat channels
   */
  public getUnreadCircleCount(): number {
    let unread = 0;
    if (clientStore?.messages) {
      for (const [channelId, msgs] of clientStore.messages.entries()) {
        if (channelId.startsWith('dm-') || channelId.startsWith('relays-')) {
          unread += msgs.filter(m => !m.isMine).length;
        }
      }
    }
    return Math.min(unread, 99);
  }

  /**
   * Computes unread/new publications count
   */
  public getUnreadFeedCount(): number {
    if (!clientStore?.posts) return 0;
    const oneHourAgo = Date.now() - 3600000;
    return Math.min(clientStore.posts.filter(p => (p.createdAt || 0) > oneHourAgo).length, 9);
  }

  /**
   * Renders the native bottom tab bar HTML markup for mobile devices
   */
  public renderTabBarHTML(): string {
    const currentTab = this.resolveTabFromChannel(clientStore?.activeChannelId || 'pulse-global');
    this.activeTab = currentTab;

    const unreadCircle = this.getUnreadCircleCount();
    const unreadFeed = this.getUnreadFeedCount();

    const tabs: Array<{ id: MobileTab; label: string; sublabel?: string; icon: string; title: string; badge?: number }> = [
      { id: 'feed', label: 'Feed', icon: '📰', title: 'Feed (Flux Pulse)', badge: unreadFeed > 0 ? unreadFeed : undefined },
      { id: 'vault', label: 'Vault', icon: '🗄️', title: 'Seif Fișiere (Vault)' },
      { id: 'circle', label: 'Servere', sublabel: 'Cerc', icon: '📡', title: 'Servere & Canale Chat (Cerc)', badge: unreadCircle > 0 ? unreadCircle : undefined },
      { id: 'profile', label: 'Profil', icon: '👤', title: 'Profil Suveran' },
      { id: 'more' as any, label: 'Mai multe', icon: '☰', title: 'Mai multe opțiuni & unelte' },
    ];

    return `
      <!-- NATIVE MOBILE BOTTOM TAB BAR (lg:hidden) -->
      <nav 
        id="native-mobile-tab-bar" 
        class="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-surface-base/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] flex items-center justify-around px-3 select-none shadow-2xl transition-all"
        style="min-height: 3.5rem; height: calc(3.5rem + env(safe-area-inset-bottom, 0px)); padding-bottom: max(env(safe-area-inset-bottom, 0px), 0px);"
        aria-label="Mobile Sovereign Navigation"
      >
        ${tabs.map(tab => {
          const isActive = currentTab === tab.id;
          const activeClass = isActive 
            ? 'text-cyan-400 font-bold scale-105 is-active' 
            : 'text-slate-400 hover:text-white';
          const indicator = isActive
            ? '<span class="w-1 h-1 rounded-full bg-cyan-400 -mt-0.5"></span>'
            : '';

          const clickAction = tab.id === 'more'
            ? 'if(window.__aetheris_open_mobile_drawer) window.__aetheris_open_mobile_drawer(); else if(window.mobileTabBar) window.mobileTabBar.setTab(\'more\');'
            : `if(window.mobileTabBar) window.mobileTabBar.setTab('${tab.id}')`;

          return `
            <button
              type="button"
              id="btn-mobile-tab-${tab.id}"
              onclick="${clickAction}"
              class="relative flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${activeClass}"
              title="${tab.title}"
              aria-label="${tab.label} ${tab.sublabel || ''}"
            >
              <div class="relative flex items-center justify-center">
                <span class="text-lg leading-none">${tab.icon}</span>
                ${tab.badge !== undefined && tab.badge > 0 ? `
                  <span class="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-cyan-500 text-black text-[9px] font-mono font-bold shadow-xs">
                    ${tab.badge}
                  </span>
                ` : ''}
              </div>
              <span class="text-[10px] font-sans mt-0.5">${tab.label}</span>
              ${tab.sublabel ? `<span class="sr-only">${tab.sublabel}</span>` : ''}
              ${indicator}
            </button>
          `;
        }).join('')}
      </nav>
    `;
  }
}

export const mobileTabBar = new MobileTabBar();
serviceRegistry.registerInstance(SERVICES.MobileTabBar, mobileTabBar);
