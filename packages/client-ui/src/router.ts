/**
 * @file router.ts
 * @package @aetheris/client-ui
 * @description Sovereign Client Router & Hash Navigation Engine.
 * Supports URL history, Back/Forward browser navigation, and route synchronization.
 */

import { clientStore } from './client-state.js';
import { profileView } from './profile-view.js';
import { sovereignCircleEngine } from './sovereign-circle.js';

export type SovereignRoute = 'feed' | 'explore' | 'messages' | 'vault' | 'profile' | 'more';

export class SovereignRouter {
  private currentRoute: SovereignRoute = 'feed';
  private listeners: Array<(route: SovereignRoute) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => this.handleHashChange());
      window.addEventListener('popstate', () => this.handleHashChange());
    }
  }

  public init(): void {
    this.handleHashChange();
  }

  public get route(): SovereignRoute {
    return this.currentRoute;
  }

  public navigateTo(route: SovereignRoute, options: { replace?: boolean; subtab?: string } = {}): void {
    this.currentRoute = route;

    // Synchronize clientStore activeChannelId
    switch (route) {
      case 'feed': {
        const isCircle = Boolean(sovereignCircleEngine.findCircle(clientStore.activeChannelId)) || clientStore.activeChannelId.startsWith('c/');
        if (!isCircle && !clientStore.activeChannelId.startsWith('pulse-')) {
          clientStore.activeChannelId = 'pulse-global';
        }
        break;
      }
      case 'explore':
        clientStore.activeChannelId = 'explore';
        break;
      case 'messages':
        if (!clientStore.activeChannelId.startsWith('relays-')) {
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
            profileView.setActiveTab('settings');
          } else {
            profileView.setActiveTab(options.subtab as any);
          }
        }
        break;
      case 'more':
        clientStore.activeChannelId = 'more';
        break;
    }

    if (typeof window !== 'undefined' && window.location) {
      const targetHash = `#${route}${options.subtab ? `/${options.subtab}` : ''}`;
      if (window.location.hash !== targetHash) {
        if (options.replace) {
          window.history.replaceState(null, '', targetHash);
        } else {
          window.location.hash = targetHash;
        }
      }
    }

    this.notifyListeners();
    clientStore.notify('ROUTE_CHANGED', { route });
  }

  private handleHashChange(): void {
    if (typeof window === 'undefined' || !window.location) return;

    const rawHash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase();
    const [mainRoute, subParam] = rawHash.split('/');

    const validRoutes: SovereignRoute[] = ['feed', 'explore', 'messages', 'vault', 'profile', 'more'];

    if (validRoutes.includes(mainRoute as SovereignRoute)) {
      this.currentRoute = mainRoute as SovereignRoute;
      this.navigateTo(this.currentRoute, { replace: true, subtab: subParam });
    } else if (rawHash.startsWith('settings')) {
      this.navigateTo('profile', { replace: true, subtab: 'settings' });
    } else {
      // Default to feed
      this.currentRoute = 'feed';
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

if (typeof window !== 'undefined') {
  (window as any).sovereignRouter = sovereignRouter;
  (window as any).__aetheris_navigate = (route: SovereignRoute, subtab?: string) => {
    sovereignRouter.navigateTo(route, { subtab });
  };
}
