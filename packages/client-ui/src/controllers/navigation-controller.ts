/**
 * @file controllers/navigation-controller.ts
 * @package @aetheris/client-ui
 * @description 2027 Spatial Navigation & View State Controller.
 * Integrates native View Transitions API with sub-frame scroll restoration
 * and reduced-motion accessibility compliance.
 */

import { clientStore, SpaceType } from '../client-state.js';
import { sovereignRouter } from '../router.js';

export class NavigationController {
  private scrollPositions: Map<string, number> = new Map();

  private runWithViewTransition(mutation: () => void): void {
    if (typeof document === 'undefined') {
      mutation();
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };

    if (!prefersReducedMotion && typeof docWithVT.startViewTransition === 'function') {
      try {
        docWithVT.startViewTransition(() => {
          mutation();
        });
        return;
      } catch {
        mutation();
      }
    } else {
      mutation();
    }
  }

  /**
   * Records scroll offset of critical containers before reactive DOM patch
   */
  public captureScroll(containerIds: string[]): void {
    if (typeof document === 'undefined') return;
    for (const id of containerIds) {
      const el = document.getElementById(id);
      if (el) {
        this.scrollPositions.set(id, el.scrollTop);
      }
    }
  }

  /**
   * Restores captured scroll positions after DOM patch
   */
  public restoreScroll(containerIds: string[]): void {
    if (typeof document === 'undefined') return;
    for (const id of containerIds) {
      const pos = this.scrollPositions.get(id);
      if (pos !== undefined) {
        const el = document.getElementById(id);
        if (el && Math.abs(el.scrollTop - pos) > 1) {
          el.scrollTop = pos;
        }
      }
    }
  }

  /**
   * Switches workspace destination smoothly with hardware-accelerated View Transitions
   */
  public switchMode(mode: SpaceType, channelId?: string): void {
    this.runWithViewTransition(() => {
      if (channelId) {
        clientStore.activeChannelId = channelId;
      }
      clientStore.setSpace(mode);
      const routeMap: Record<SpaceType, 'feed' | 'messages' | 'vault'> = {
        pulse: 'feed',
        relays: 'messages',
        vault: 'vault',
      };
      sovereignRouter.navigateTo(routeMap[mode] || 'feed');
      clientStore.notifySync();
    });
  }

  /**
   * Toggles between Simple Mode and Sovereign Advanced Mode
   */
  public toggleUiMode(): void {
    this.runWithViewTransition(() => {
      clientStore.toggleUiMode();
      clientStore.notifySync();
    });
  }

  /**
   * Explicitly sets UI Mode
   */
  public setUiMode(mode: 'simple' | 'sovereign'): void {
    this.runWithViewTransition(() => {
      clientStore.setUiMode(mode);
      clientStore.notifySync();
    });
  }
}

export const navigationController = new NavigationController();
