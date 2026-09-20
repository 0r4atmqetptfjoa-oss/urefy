/**
 * @file router.ts
 * @package @aetheris/client-ui
 * @description Sovereign Client Router & Hash Navigation Engine.
 * Supports URL history, Back/Forward browser navigation, and route synchronization.
 */

import { clientStore } from './client-state.js';
import { profileView } from './profile-view.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { postDetailView } from './post-detail.js';

export type SovereignRoute = 'feed' | 'explore' | 'communities' | 'messages' | 'vault' | 'profile' | 'settings' | 'more' | 'governance';

export class SovereignRouter {
  private currentRoute: SovereignRoute = 'feed';
  private listeners: Array<(route: SovereignRoute) => void> = [];
  private isInternalNavigating: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => this.handleHashChange());
      window.addEventListener('popstate', () => this.handleHashChange());
      this.handleHashChange();
    }

    if (clientStore && typeof clientStore.subscribe === 'function') {
      clientStore.subscribe((event?: string, data?: any) => {
        if (event === 'CHANNEL_CHANGE' && data?.channelId) {
          const ch = data.channelId;
          if (ch.startsWith('relays-') || ch.startsWith('relay-') || ch.startsWith('dm-')) {
            if (this.currentRoute !== 'messages') this.navigateTo('messages');
          } else if (ch.startsWith('vault-')) {
            if (this.currentRoute !== 'vault') this.navigateTo('vault');
          }
        }
      });
    }
  }

  public init(): void {
    this.handleHashChange();
  }

  public get route(): SovereignRoute {
    return this.currentRoute;
  }

  /**
   * Canonical Home Navigation Action.
   * Invoked identically by the UREfy logo, the primary Home button, and mobile nav.
   * Guarantees all overlays, post detail, modals, pickers, more menus, and body locks are destroyed,
   * cleanly resetting state to Home feed without loops or stale overlays.
   */
  public navigateHome(options: { replace?: boolean } = {}): void {
    // 1. Close post detail view immediately if open
    if (postDetailView.isOpen()) {
      postDetailView.closePost({ skipHistory: true });
    }

    // 2. Dismiss any open feature modals or transient overlays
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.modalManager && typeof win.modalManager.closeFeature === 'function') {
        win.modalManager.closeFeature();
      }
      if (win.dialogModal && typeof win.dialogModal.close === 'function') {
        win.dialogModal.close();
      }
      if (win.settingsView && win.settingsView.isOpen && typeof win.settingsView.close === 'function') {
        win.settingsView.close();
      }
      if (win.mnemonicModal && typeof win.mnemonicModal.close === 'function') {
        win.mnemonicModal.close();
      }
    }

    // 3. Close drawers, pickers, menus and release body scroll lock
    if (typeof document !== 'undefined') {
      const backdrop = document.getElementById('mobile-drawer-backdrop');
      if (backdrop) {
        backdrop.classList.add('opacity-0', 'pointer-events-none');
        backdrop.classList.remove('opacity-100');
      }
      const drawerPanel = backdrop?.nextElementSibling as HTMLElement | null;
      if (drawerPanel) {
        drawerPanel.classList.add('-translate-x-full');
        drawerPanel.classList.remove('translate-x-0');
      }

      document.querySelectorAll('.reactions-picker-portal, .reaction-picker, [id$="emoji-popover"]').forEach(el => el.remove());

      document.querySelectorAll('.post-options-dropdown, .rail-expanded-tools, .context-dropdown').forEach(el => {
        el.classList.add('hidden');
      });

      document.querySelectorAll('[data-post-card].is-focused, [data-post-card].border-indigo-500').forEach(card => {
        card.classList.remove('is-focused', 'border-indigo-500');
      });

      document.body.style.overflow = '';
      document.body.classList.remove('overflow-hidden', 'modal-open');
    }

    // 4. Set canonical channel and route
    this.currentRoute = 'feed';
    clientStore.activeChannelId = 'pulse-global';

    // 5. Update browser history cleanly to '/' without duplicate entries or navigation loops
    this.isInternalNavigating = true;
    try {
      if (typeof window !== 'undefined' && window.location) {
        const currentPath = window.location.pathname || '';
        const currentHash = window.location.hash || '';
        const isAlreadyCleanHome = (currentPath === '/' || currentPath === '') && (currentHash === '' || currentHash === '#feed');

        if (!isAlreadyCleanHome) {
          window.history.pushState(null, '', '/');
        }
      }

      // 6. Update active navigation UI state
      this.updateActiveNavIndicators('pulse');
      this.notifyListeners();
      clientStore.notifySync('ROUTE_CHANGED', { route: 'feed' });
      clientStore.notifySync('CHANNEL_CHANGE', { channelId: 'pulse-global' });
    } finally {
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => { this.isInternalNavigating = false; });
      } else {
        setTimeout(() => { this.isInternalNavigating = false; }, 0);
      }
    }
  }

  public updateActiveNavIndicators(activeMode: string): void {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-nav-mode]').forEach(btn => {
      const mode = btn.getAttribute('data-nav-mode');
      const isActive = mode === activeMode || (activeMode === 'pulse' && mode === 'feed');
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
      if (isActive) {
        btn.classList.add('is-active', 'nav-item-active');
      } else {
        btn.classList.remove('is-active', 'nav-item-active');
      }
    });
  }

  public navigateTo(route: SovereignRoute, options: { replace?: boolean; subtab?: string } = {}): void {
    if (route === 'feed' && !options.subtab) {
      this.navigateHome(options);
      return;
    }
    // Close post detail view if open
    if (postDetailView.isOpen()) {
      postDetailView.closePost({ skipHistory: true });
    }

    // Dismiss any open feature modals or transient overlays
    if (typeof window !== 'undefined') {
      if ((window as any).modalManager && typeof (window as any).modalManager.closeFeature === 'function') {
        (window as any).modalManager.closeFeature();
      }
    }

    this.currentRoute = route;

    // Synchronize clientStore activeChannelId
    switch (route) {
      case 'feed': {
        const circle = sovereignCircleEngine.findCircle(clientStore.activeChannelId);
        const isFeedCircle =
          (circle && (circle.channelId?.startsWith('pulse-') || circle.id?.startsWith('pulse-') || circle.id?.startsWith('c/'))) ||
          clientStore.activeChannelId.startsWith('c/');
        if (!isFeedCircle && !clientStore.activeChannelId.startsWith('pulse-')) {
          clientStore.activeChannelId = 'pulse-global';
        }
        break;
      }
      case 'explore':
        clientStore.activeChannelId = 'explore';
        break;
      case 'communities':
        if (clientStore.activeChannelId === 'pulse-global' || (!clientStore.activeChannelId.startsWith('c/') && !clientStore.activeChannelId.startsWith('pulse-'))) {
          clientStore.activeChannelId = 'communities';
        }
        break;
      case 'messages':
        if (!clientStore.activeChannelId.startsWith('relays-') && !clientStore.activeChannelId.startsWith('relay-') && !clientStore.activeChannelId.startsWith('dm-')) {
          clientStore.activeChannelId = 'relays-general';
        }
        break;
      case 'vault':
        if (!clientStore.activeChannelId.startsWith('vault-')) {
          clientStore.activeChannelId = 'vault-releases';
        }
        break;
      case 'profile':
        clientStore.activeChannelId = 'profile';
        if (options.subtab) {
          if (options.subtab === 'settings') {
            this.navigateTo('settings');
            return;
          } else {
            profileView.setActiveTab(options.subtab as any);
          }
        }
        break;
      case 'settings':
        clientStore.activeChannelId = 'settings';
        if (typeof window !== 'undefined') {
          const win = window as any;
          if (win.settingsView && typeof win.settingsView.open === 'function') {
            win.settingsView.open(options.subtab as any);
          } else if (typeof win.__aetheris_open_settings === 'function') {
            win.__aetheris_open_settings(options.subtab as any);
          }
        }
        break;
      case 'governance':
        clientStore.activeChannelId = 'governance';
        if (typeof window !== 'undefined') {
          const win = window as any;
          if (win.modalManager && typeof win.modalManager.openFeature === 'function') {
            win.modalManager.openFeature('governance');
          }
        }
        break;
      case 'more':
        clientStore.activeChannelId = 'more';
        break;
    }

    this.isInternalNavigating = true;
    try {
      if (typeof window !== 'undefined' && window.location) {
        const targetHash = `#${route}${options.subtab ? `/${options.subtab}` : ''}`;
        const currentPath = window.location.pathname || '';
        const isPostPath = /^\/(?:p|post)\//i.test(currentPath);

        if (isPostPath) {
          // Reset path from /p/:id back to / with destination hash
          window.history.pushState(null, '', `/${targetHash}`);
        } else if (window.location.hash !== targetHash) {
          if (options.replace) {
            window.history.replaceState(null, '', targetHash);
          } else {
            window.location.hash = targetHash;
          }
        }
      }

      this.notifyListeners();
      clientStore.notify('ROUTE_CHANGED', { route, subtab: options.subtab });
    } finally {
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => { this.isInternalNavigating = false; });
      } else {
        setTimeout(() => { this.isInternalNavigating = false; }, 0);
      }
    }
  }

  public handleHashChange(): void {
    if (typeof window === 'undefined' || !window.location) return;
    if (this.isInternalNavigating) return;

    const pathname = window.location.pathname || '';
    const originalHash = window.location.hash;
    const rawHash = (originalHash || '').replace(/^#\/?/, '');

    // Support pathname deep link: /p/xxx or /post/xxx
    const postMatch = pathname.match(/^\/(?:p|post)\/([^/?#]+)/i);
    const hasPostHash = /^(post-|p\/)/i.test(rawHash);

    // If navigating back/forward away from post URL or to another hash, cleanly dismiss post focus view
    if ((!postMatch || Boolean(rawHash)) && !hasPostHash && postDetailView.isOpen()) {
      postDetailView.closePost({ skipHistory: true });
    }

    if (postMatch && rawHash && !hasPostHash) {
      try {
        window.history.replaceState(null, '', `/#${rawHash}`);
      } catch (_) {}
    }

    if (postMatch && !rawHash) {
      let postId: string;
      try { postId = decodeURIComponent(postMatch[1]); }
      catch { clientStore.showToast('This post link is invalid', 'warning'); return; }
      this.currentRoute = 'feed';
      clientStore.activeChannelId = 'pulse-global';
      void import('./context-navigation.js').then(module =>
        module.openPostContext(postId, undefined, () => (window.location.pathname || '') === pathname)
      ).catch(error => {
        if ((window.location.pathname || '') === pathname) {
          clientStore.showToast(error instanceof Error ? error.message : 'Post unavailable', 'warning');
          clientStore.notify();
        }
      });
      return;
    }

    // Support pathname community link: /c/xxx
    const commMatch = pathname.match(/^\/c\/([^/?#]+)/i);
    if (commMatch && !rawHash) {
      const commId = decodeURIComponent(commMatch[1]);
      this.currentRoute = 'communities';
      clientStore.activeChannelId = `c/${commId}`;
      clientStore.notify();
      return;
    }

    // Support pathname user profile link: /u/xxx
    const userMatch = pathname.match(/^\/u\/([^/?#]+)/i);
    if (userMatch && !rawHash) {
      const userTarget = decodeURIComponent(userMatch[1]);
      this.currentRoute = 'profile';
      clientStore.activeChannelId = 'profile';
      clientStore.notify();
      void import('./profile-view.js').then(m => {
        m.profileView.setTargetFingerprint(userTarget);
        clientStore.notify();
      }).catch(() => {});
      return;
    }

    if (pathname === '/explore' && !rawHash) {
      this.currentRoute = 'explore';
      clientStore.activeChannelId = 'explore';
      this.notifyListeners();
      clientStore.notify();
      return;
    }
    if (pathname === '/communities' && !rawHash) {
      this.currentRoute = 'communities';
      clientStore.activeChannelId = 'communities';
      clientStore.notify();
      return;
    }
    
    if (!rawHash && ['/messages', '/vault', '/profile', '/more', '/settings', '/governance'].includes(pathname)) {
      this.navigateTo(pathname.slice(1) as SovereignRoute, { replace: true });
      return;
    }

    // Support deep link directly to post: #post-xxx or #p-xxx
    if (/^(post-|p\/)/i.test(rawHash)) {
      let postId: string;
      try { postId = decodeURIComponent(rawHash.replace(/^(post-|p\/)/i, '')); }
      catch { clientStore.showToast('This post link is invalid', 'warning'); return; }
      this.currentRoute = 'feed';
      clientStore.activeChannelId = 'pulse-global';
      void import('./context-navigation.js').then(module => module.openPostContext(postId, undefined, () => window.location.hash === originalHash))
        .catch(error => {
          if (window.location.hash === originalHash) {
            clientStore.showToast(error instanceof Error ? error.message : 'Post unavailable', 'warning');
            clientStore.notify();
          }
        });
      return;
    }

    const [mainRoute, subParam] = rawHash.toLowerCase().split('/');

    const validRoutes: SovereignRoute[] = ['feed', 'explore', 'communities', 'messages', 'vault', 'profile', 'settings', 'more', 'governance'];

    let resolvedRoute: SovereignRoute | null = null;
    if (mainRoute === 'relays' || mainRoute === 'chat' || mainRoute === 'messages') {
      resolvedRoute = 'messages';
    } else if (mainRoute === 'pulse' || mainRoute === 'home' || mainRoute === 'feed') {
      resolvedRoute = 'feed';
    } else if (mainRoute === 'settings') {
      resolvedRoute = 'settings';
    } else if (mainRoute === 'governance' || mainRoute === 'dao') {
      resolvedRoute = 'governance';
    } else if (mainRoute === 'communities' || mainRoute === 'circles' || mainRoute === 'c') {
      resolvedRoute = 'communities';
      if (subParam) {
        clientStore.activeChannelId = `c/${subParam}`;
      }
    } else if (validRoutes.includes(mainRoute as SovereignRoute)) {
      resolvedRoute = mainRoute as SovereignRoute;
    }

    if (resolvedRoute) {
      this.currentRoute = resolvedRoute;
      this.navigateTo(this.currentRoute, { replace: true, subtab: subParam });
    } else {
      // Default to feed (e.g. root / or empty hash)
      this.currentRoute = 'feed';
      clientStore.activeChannelId = 'pulse-global';
      this.notifyListeners();
      clientStore.notify('ROUTE_CHANGED', { route: 'feed' });
    }
  }

  public subscribe(cb: (route: SovereignRoute) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notifyListeners(): void {
    for (const cb of this.listeners) {
      try {
        cb(this.currentRoute);
      } catch (err) {
        console.error('[Router] Error in route listener:', err);
      }
    }
  }
}

export const sovereignRouter = new SovereignRouter();
export const router = sovereignRouter;

if (typeof window !== 'undefined') {
  (window as any).sovereignRouter = sovereignRouter;
  (window as any).router = sovereignRouter;
  (window as any).__aetheris_navigate = (route: SovereignRoute, subtab?: string) => {
    sovereignRouter.navigateTo(route, { subtab });
  };
}
