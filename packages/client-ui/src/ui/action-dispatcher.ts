/**
 * @file ui/action-dispatcher.ts
 * @package @aetheris/client-ui
 * @description Centralized Sovereign Action Dispatcher.
 * Replaces distributed inline onclick handlers with high-performance event delegation,
 * strict CSP compliance (0 unsafe-inline), and decoupled feature execution.
 */

import { modalManager, FeatureModalId } from '../modal-manager.js';
import { clientStore } from '../client-state.js';
import { sovereignRouter } from '../router.js';
import { themeEngine } from '../themes.js';

export class ActionDispatcher {
  private isInitialized = false;

  public init(): void {
    if (this.isInitialized || typeof document === 'undefined') return;
    this.isInitialized = true;

    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const actionEl = target.closest<HTMLElement>('[data-action]');
      if (!actionEl) return;

      const action = actionEl.getAttribute('data-action');
      if (!action) return;

      this.dispatch(action, actionEl, event);
    });
  }

  public dispatch(action: string, el: HTMLElement, event: MouseEvent): void {
    switch (action) {
      
      case 'pwa-install': {
        if (typeof window !== 'undefined' && (window as any).pwaService) {
          (window as any).pwaService.promptInstall();
        }
        break;
      }

      case 'toggle-advanced-overflow': {
        if (typeof window !== 'undefined' && (window as any).__aetheris_toggle_advanced_overflow) {
          (window as any).__aetheris_toggle_advanced_overflow();
        }
        break;
      }

      case 'close-advanced-overflow': {
        if (typeof window !== 'undefined' && (window as any).__aetheris_close_advanced_overflow) {
          (window as any).__aetheris_close_advanced_overflow();
        }
        break;
      }

      case 'set-ui-mode': {
        const mode = (el.getAttribute('data-ui-mode') || 'simple') as any;
        clientStore.setUiMode(mode);
        clientStore.notifySync();
        break;
      }

      case 'toggle-voice': {
        const btn = document.getElementById('btn-toggle-voice');
        if (btn) btn.click();
        break;
      }

      case 'stop-propagation': {
        event.stopPropagation();
        break;
      }

      case 'open-feature': {
        const feature = el.getAttribute('data-feature') as FeatureModalId | null;
        const params = el.getAttribute('data-params');
        if (feature) {
          modalManager.openFeature(feature, params ? JSON.parse(params) : undefined);
        }
        break;
      }

      case 'open-keyboard-help': {
        if (typeof window !== 'undefined' && (window as any).keyboardNavigator) {
          (window as any).keyboardNavigator.toggleHelpModal();
        }
        break;
      }

      case 'close-feature': {
        modalManager.closeFeature();
        break;
      }

      case 'open-legal': {
        const tab = el.getAttribute('data-legal-tab') || 'about';
        modalManager.openFeature('legal', tab);
        break;
      }

      case 'open-theme': {
        themeEngine.openModal();
        clientStore.notifySync();
        break;
      }

      case 'close-theme': {
        themeEngine.closeModal();
        clientStore.notifySync();
        break;
      }

      case 'apply-theme': {
        const themeId = el.getAttribute('data-theme-id');
        if (themeId) {
          themeEngine.setTheme(themeId);
          themeEngine.closeModal();
          clientStore.notifySync();
        }
        break;
      }

      case 'open-settings': {
        if (typeof window !== 'undefined' && (window as any).__aetheris_open_settings) {
          (window as any).__aetheris_open_settings();
        } else {
          sovereignRouter.navigateTo('profile', { subtab: 'settings' });
        }
        break;
      }

      case 'open-lang': {
        if (typeof window !== 'undefined' && (window as any).__aetheris_open_lang) {
          (window as any).__aetheris_open_lang();
        }
        break;
      }

      case 'close-lang': {
        if (typeof window !== 'undefined' && (window as any).__aetheris_close_lang) {
          (window as any).__aetheris_close_lang();
        }
        break;
      }

      case 'open-mobile-drawer': {
        if (typeof window !== 'undefined' && (window as any).__aetheris_open_mobile_drawer) {
          (window as any).__aetheris_open_mobile_drawer();
        }
        break;
      }

      case 'close-mobile-drawer': {
        if (typeof window !== 'undefined' && (window as any).__aetheris_close_mobile_drawer) {
          (window as any).__aetheris_close_mobile_drawer();
        }
        break;
      }

      case 'dismiss-broadcast': {
        if (typeof window !== 'undefined' && (window as any).__aetheris_dismiss_broadcast) {
          (window as any).__aetheris_dismiss_broadcast();
        }
        break;
      }

      case 'join-channel': {
        const channel = el.getAttribute('data-channel');
        if (channel) {
          clientStore.joinChannel(channel);
        }
        break;
      }

      case 'nav-mode': {
        const mode = el.getAttribute('data-mode') as any;
        if (mode) {
          sovereignRouter.navigateTo(mode);
        }
        break;
      }

      case 'open-composer': {
        clientStore.isComposerOpen = true;
        clientStore.notify();
        break;
      }

      case 'toggle-notifs': {
        if (typeof window !== 'undefined' && (window as any).__aetherisToggleNotifs) {
          (window as any).__aetherisToggleNotifs();
        }
        break;
      }

      case 'toggle-ui-mode': {
        const currentMode = clientStore.uiMode || 'simple';
        const nextMode = currentMode === 'simple' ? 'advanced' : currentMode === 'advanced' ? 'technical' : 'simple';
        clientStore.setUiMode(nextMode);
        clientStore.notifySync();
        break;
      }

      case 'copy-text': {
        const text = el.getAttribute('data-copy-text');
        if (text) {
          navigator.clipboard.writeText(text).then(() => {
            clientStore.showToast('Copied to clipboard', 'info');
          });
        }
        break;
      }

      default: {
        // Forward custom action to window listener if registered
        if (typeof window !== 'undefined') {
          const customHandler = (window as any)[`__aetheris_action_${action}`];
          if (typeof customHandler === 'function') {
            customHandler(el, event);
          }
        }
        break;
      }
    }
  }
}

export const actionDispatcher = new ActionDispatcher();
