/**
 * @file mobile-tab-bar.ts
 * @package @aetheris/client-ui
 * @description Native Mobile Bottom Tab Bar (Feed, Explore, Messages, Vault, Profile) for viewports < 1024px (lg:hidden).
 * Provides clean, progressive disclosure on mobile devices conforming to Master UX Specification (Section 18).
 * Eliminates emojis in favor of crisp Lucide vector icons. Touch target >= 44px.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore } from './client-state.js';
import { renderIcon, IconName } from './ui/icons.js';
import { sovereignRouter } from './router.js';
import { t } from './i18n.js';

export type MobileTab = 'feed' | 'explore' | 'communities' | 'messages' | 'profile' | 'vault' | 'circle';

export interface MobileTabDefinition {
  id: MobileTab;
  label: string;
  iconName: IconName;
  channelTarget?: string;
}

export class MobileTabBar {
  public activeTab: MobileTab = 'feed';
  private readonly tabsOrder: MobileTab[] = ['feed', 'explore', 'communities', 'messages', 'profile'];
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
    if (channelId.startsWith('c/') || channelId === 'communities') {
      return 'communities';
    }
    if (channelId.startsWith('vault-') || channelId === 'vault') {
      return 'vault';
    }
    if (channelId.startsWith('explore-') || channelId === 'explore') {
      return 'explore';
    }
    if (channelId.startsWith('relays-') || channelId.startsWith('dm-') || channelId === 'circle' || channelId === 'messages') {
      return 'messages';
    }
    if (channelId.startsWith('profile')) {
      return 'profile';
    }
    return 'feed';
  }

  /**
   * Sets the active tab and navigates the store via the sovereign router.
   * IMPORTANT: all navigation MUST go through sovereignRouter.navigateTo() so
   * that renderMainStage() picks up the correct route (it reads sovereignRouter.route first).
   */
  public setTab(tab: MobileTab): void {
    // If tapping the already active tab, scroll feed to top
    if (this.activeTab === tab) {
      if (typeof window !== 'undefined') {
        const feedScroll = document.getElementById('main-feed-scroll');
        if (feedScroll) {
          feedScroll.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
      return;
    }

    this.activeTab = tab;

    switch (tab) {
      case 'feed':
        sovereignRouter.navigateTo('feed');
        clientStore.activeChannelId = 'pulse-global';
        break;
      case 'explore':
        sovereignRouter.navigateTo('explore');
        clientStore.activeChannelId = 'explore';
        break;
      case 'communities':
        sovereignRouter.navigateTo('communities');
        clientStore.activeChannelId = 'communities';
        break;
      case 'messages':
      case 'circle':
        sovereignRouter.navigateTo('messages');
        clientStore.activeChannelId = 'relays-general';
        break;
      case 'vault':
        sovereignRouter.navigateTo('vault');
        clientStore.activeChannelId = 'vault-releases';
        break;
      case 'profile':
        if (typeof window !== 'undefined' && (window as any).profileView) {
          (window as any).profileView.setTargetFingerprint(
            clientStore.keypair?.fingerprint || ''
          );
        }
        sovereignRouter.navigateTo('profile');
        clientStore.activeChannelId = 'profile';
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

  private isTouchIgnored: boolean = false;

  /**
   * Returns true if a touch started within a component that handles its own horizontal
   * scrolling, sub-tabs, form controls, or modals (e.g. profile view sub-tabs).
   */
  private isSwipeExcluded(target: EventTarget | null): boolean {
    if (!target || !(target instanceof Element)) return false;
    // Don't switch global tabs when user is actively inside the profile view
    if (this.activeTab === 'profile') return true;
    // Don't switch global tabs when interacting inside profile view or its sub-tabs
    if (target.closest('#sovereign-profile-container, #profile-view, [data-view="profile"], .profile-container, [data-profile-tabs], #profile-container, #profile-tab-content-area')) return true;
    // Don't switch global tabs inside post cards or post action bars (prevents gesture collision with card swipe)
    if (target.closest('article, [data-post-card-id], .pulse-action-bar, .post-card, [data-open-detail]')) return true;
    // Don't switch global tabs inside modals, drawers, slide-overs
    if (target.closest('#mobile-drawer, [role="dialog"], .modal, #app-modal-root, #composer-modal-overlay')) return true;
    // Don't switch global tabs inside horizontal scrolling containers or tab lists
    if (target.closest('.overflow-x-auto, [role="tablist"], [role="tab"], nav[aria-label]')) return true;
    // Don't switch global tabs on interactive form controls and media
    if (target.closest('button, input, textarea, select, pre, code, canvas, audio, video')) return true;
    return false;
  }

  /**
   * Binds horizontal touch swipe listeners on mobile viewports (< 1024px)
   */
  private bindTouchSwipe(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    document.addEventListener('touchstart', (e: TouchEvent) => {
      if (window.innerWidth >= 1024 || e.touches.length !== 1) return;
      if (this.isSwipeExcluded(e.target)) {
        this.isTouchIgnored = true;
        return;
      }
      this.isTouchIgnored = false;
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e: TouchEvent) => {
      if (window.innerWidth >= 1024 || e.changedTouches.length !== 1) return;
      if (this.isTouchIgnored) {
        this.isTouchIgnored = false;
        return;
      }
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
   * Computes unread count for messages
   */
  public getUnreadMessagesCount(): number {
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

    const unreadMessages = this.getUnreadMessagesCount();
    const unreadFeed = this.getUnreadFeedCount();

    const tabs: Array<{ id: MobileTab; label: string; defaultLabel: string; iconName: IconName; title: string; defaultTitle: string; badge?: number }> = [
      { id: 'feed', label: t('nav.feed', undefined, 'Home'), defaultLabel: 'Home', iconName: 'feed', title: t('pulse.subtitle', undefined, 'Home'), defaultTitle: 'Home', badge: unreadFeed > 0 ? unreadFeed : undefined },
      { id: 'explore', label: t('nav.explore', undefined, 'Explore'), defaultLabel: 'Explore', iconName: 'explore', title: t('nav.explore', undefined, 'Explore'), defaultTitle: 'Explore' },
      { id: 'messages', label: t('nav.messages', undefined, 'Messages'), defaultLabel: 'Messages Relays', iconName: 'messages', title: t('relays.title', undefined, 'Relays · Relay Servers & Chat Channels'), defaultTitle: 'Relays · Relay Servers & Chat Channels', badge: unreadMessages > 0 ? unreadMessages : undefined },
      { id: 'communities', label: t('nav.communities', undefined, 'Communities'), defaultLabel: 'Communities', iconName: 'users', title: 'Communities', defaultTitle: 'Communities' },
      { id: 'profile', label: t('nav.profile', undefined, 'Profile'), defaultLabel: 'Profile', iconName: 'profile', title: t('profile.sovereignNode', undefined, 'Sovereign Profile'), defaultTitle: 'Sovereign Profile' },
    ];

    return `
      <!-- NATIVE MOBILE BOTTOM TAB BAR (lg:hidden) -->
      <nav 
        id="native-mobile-tab-bar" 
        role="navigation"
        class="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-surface-base/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] flex items-center justify-around px-2 select-none shadow-2xl transition-all"
        style="min-height: 3.5rem; height: calc(3.5rem + env(safe-area-inset-bottom, 0px)); padding-bottom: max(env(safe-area-inset-bottom, 0px), 0px);"
        aria-label="Primary navigation"
      >
        ${tabs.map(tab => {
          const isActive = currentTab === tab.id;
          const activeClass = isActive 
            ? 'text-cyan-400 font-bold scale-105 is-active' 
            : 'text-slate-400 hover:text-slate-200';
          const indicator = isActive
            ? '<span class="w-1 h-1 rounded-full bg-cyan-400 -mt-0.5"></span>'
            : '';

          return `
            <button
              type="button"
              id="btn-mobile-tab-${tab.id}"
              data-tab="${tab.id}"
              data-nav-label="${tab.defaultLabel}"
              data-nav-title="${tab.defaultTitle}"
              class="relative flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${activeClass}"
              title="${tab.title}"
              aria-label="${tab.label}"
            >
              <div class="relative flex items-center justify-center">
                ${renderIcon(tab.iconName, { size: 20, variant: isActive ? 'solid' : 'outline', strokeWidth: 2.0 })}
                ${tab.badge !== undefined && tab.badge > 0 ? `
                  <span class="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-cyan-500 text-black text-[9px] font-mono font-bold shadow-xs">
                    ${tab.badge}
                  </span>
                ` : ''}
              </div>
              <span class="text-[10px] font-medium font-sans mt-1">${tab.label}</span>
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
