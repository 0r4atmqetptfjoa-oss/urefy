/**
 * @file controllers/navigation-controller.ts
 * @package @aetheris/client-ui
 * @description Centralized Navigation & View State Controller.
 * Encapsulates view mode transitions, scroll state preservation across reactive cycles,
 * and URL router synchronization.
 */

import { clientStore, SpaceType } from '../client-state.js';
import { sovereignRouter } from '../router.js';

export class NavigationController {
  private scrollPositions: Map<string, number> = new Map();

  /**
   * Records scroll offset of critical containers before reactive DOM patch
   */
  public captureScroll(containerIds: string[]): void {
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
    for (const id of containerIds) {
      const pos = this.scrollPositions.get(id);
      if (pos !== undefined) {
        const el = document.getElementById(id);
        if (el) {
          el.scrollTop = pos;
        }
      }
    }
  }

  /**
   * Switches workspace destination smoothly
   */
  public switchMode(mode: SpaceType, channelId?: string): void {
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
  }

  /**
   * Toggles between Simple Mode and Sovereign Advanced Mode
   */
  public toggleUiMode(): void {
    clientStore.toggleUiMode();
    clientStore.notifySync();
  }

  /**
   * Explicitly sets UI Mode
   */
  public setUiMode(mode: 'simple' | 'sovereign'): void {
    clientStore.setUiMode(mode);
    clientStore.notifySync();
  }
}

export const navigationController = new NavigationController();
