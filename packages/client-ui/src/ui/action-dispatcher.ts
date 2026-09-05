/**
 * @file ui/action-dispatcher.ts
 * @package @aetheris/client-ui
 * @description Centralized Sovereign Action Dispatcher.
 * Replaces distributed inline event handlers (onclick, onchange, oninput, onsubmit)
 * with high-performance event delegation, strict CSP compliance (0 unsafe-inline),
 * and decoupled feature execution without eval().
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

    // 1. Click delegation
    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const actionEl = target.closest<HTMLElement>('[data-action]');
      if (!actionEl) return;

      const action = actionEl.getAttribute('data-action');
      if (!action) return;

      this.dispatch(action, actionEl, event);
    });

    // 2. Change delegation
    document.addEventListener('change', (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const changeEl = target.closest<HTMLElement>('[data-change]');
      if (!changeEl) return;

      const changeAction = changeEl.getAttribute('data-change');
      if (!changeAction) return;

      this.dispatchChange(changeAction, changeEl as HTMLInputElement | HTMLSelectElement, event);
    });

    // 3. Input delegation
    document.addEventListener('input', (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const inputEl = target.closest<HTMLElement>('[data-input]');
      if (!inputEl) return;

      const inputAction = inputEl.getAttribute('data-input');
      if (!inputAction) return;

      this.dispatchInput(inputAction, inputEl as HTMLInputElement | HTMLTextAreaElement, event);
    });

    // 4. Submit delegation
    document.addEventListener('submit', (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const submitEl = target.closest<HTMLElement>('[data-submit]');
      if (!submitEl) return;

      const submitAction = submitEl.getAttribute('data-submit');
      if (!submitAction) return;

      event.preventDefault();
      this.dispatchSubmit(submitAction, submitEl as HTMLFormElement, event);
    });
  }

  private invokeMethodPath(methodPath: string, args: any[] = []): void {
    if (typeof window === 'undefined') return;
    const parts = methodPath.split('.');
    let obj: any = window;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj?.[parts[i]];
    }
    const fn = obj?.[parts[parts.length - 1]];
    if (typeof fn === 'function') {
      try {
        fn.apply(obj, args);
      } catch (err) {
        console.error(`[ActionDispatcher] Error invoking ${methodPath}:`, err);
      }
    } else {
      console.warn(`[ActionDispatcher] Method ${methodPath} is not a function`);
    }
  }

  public dispatch(action: string, el: HTMLElement, event: MouseEvent): void {
    switch (action) {
      case 'stop-propagation': {
        event.stopPropagation();
        break;
      }

      case 'close-feature': {
        modalManager.closeFeature();
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

      case 'call-global': {
        const method = el.getAttribute('data-global-method');
        const argsRaw = el.getAttribute('data-global-args');
        if (method) {
          let args: any[] = [];
          if (argsRaw) {
            try {
              args = JSON.parse(argsRaw);
            } catch (_) {
              args = [argsRaw];
            }
          }
          this.invokeMethodPath(method, args);
        }
        break;
      }

      case 'close-parent': {
        const parent = el.closest<HTMLElement>('.fixed, .modal-backdrop, [role="dialog"], [data-modal-root]');
        if (parent) parent.remove();
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

      case 'open-keyboard-help': {
        if (typeof window !== 'undefined' && (window as any).keyboardNavigator) {
          (window as any).keyboardNavigator.toggleHelpModal();
        }
        break;
      }

      case 'open-legal': {
        const tab = el.getAttribute('data-legal-tab') || 'about';
        modalManager.openFeature('legal', tab);
        break;
      }

      case 'open-theme': {
        modalManager.openFeature('custom-theme');
        break;
      }

      case 'close-theme': {
        modalManager.closeFeature();
        break;
      }

      case 'open-settings': {
        sovereignRouter.navigateTo('profile', { subtab: 'settings' });
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

      default: {
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

  public dispatchChange(action: string, el: HTMLInputElement | HTMLSelectElement, event: Event): void {
    if (action === 'call-global') {
      const method = el.getAttribute('data-global-method');
      if (method) {
        const val = el.type === 'checkbox' ? (el as HTMLInputElement).checked : el.value;
        this.invokeMethodPath(method, [val, el]);
      }
    } else if (typeof window !== 'undefined') {
      const customHandler = (window as any)[`__aetheris_change_${action}`];
      if (typeof customHandler === 'function') {
        customHandler(el, event);
      }
    }
  }

  public dispatchInput(action: string, el: HTMLInputElement | HTMLTextAreaElement, event: Event): void {
    if (action === 'call-global') {
      const method = el.getAttribute('data-global-method');
      if (method) {
        this.invokeMethodPath(method, [el.value, el]);
      }
    } else if (typeof window !== 'undefined') {
      const customHandler = (window as any)[`__aetheris_input_${action}`];
      if (typeof customHandler === 'function') {
        customHandler(el, event);
      }
    }
  }

  public dispatchSubmit(action: string, el: HTMLFormElement, event: Event): void {
    if (action === 'call-global') {
      const method = el.getAttribute('data-global-method');
      if (method) {
        this.invokeMethodPath(method, [el, event]);
      }
    } else if (typeof window !== 'undefined') {
      const customHandler = (window as any)[`__aetheris_submit_${action}`];
      if (typeof customHandler === 'function') {
        customHandler(el, event);
      }
    }
  }
}

export const actionDispatcher = new ActionDispatcher();
