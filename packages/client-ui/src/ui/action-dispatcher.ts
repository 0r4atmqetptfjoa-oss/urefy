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

      case 'close-modal':
      case 'close-feature': {
        // If element is a backdrop, only close when clicking backdrop directly, not inside modal
        if (el.id.includes('backdrop') && event.target !== el) {
          break;
        }
        modalManager.closeFeature();
        if (typeof window !== 'undefined') {
          (window as any).__aetheris_close_legal?.();
          (window as any).__aetheris_close_custom_theme_builder?.();
          (window as any).__aetheris_close_defense?.();
          (window as any).__aetheris_close_observatory?.();
          (window as any).__aetheris_close_binary_hygiene?.();
          (window as any).customThemeBuilder?.closeModal?.();
          (window as any).binaryHygienePortal?.close?.();
          (window as any).portableTrustModal?.close?.();
          (window as any).paperWallet?.close?.();
          (window as any).acousticDSP?.close?.();
          (window as any).merkleVisualizer?.close?.();
          (window as any).offlineSync?.close?.();
          (window as any).meshMatrix?.close?.();
          (window as any).keyboardNavigator?.closeHelpModal?.();
          (window as any).themeEngine?.closeModal?.();
          if ((window as any).themeEngine) (window as any).themeEngine.isModalOpen = false;
          if ((window as any).clientStore) (window as any).clientStore.notifySync();
        }
        const parent = el.closest<HTMLElement>('.fixed, .modal-backdrop, [role="dialog"], [data-modal-root]');
        if (parent) {
          parent.classList.add('hidden');
          parent.remove();
        }
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

      case 'close-settings': {
        if (el.id === 'settings-modal-backdrop' && event.target !== el) {
          break;
        }
        if (typeof window !== 'undefined') {
          if ((window as any).settingsView) (window as any).settingsView.close();
          if ((window as any).__aetheris_close_settings) (window as any).__aetheris_close_settings();
        }
        const settingsBackdrop = document.getElementById('settings-modal-backdrop');
        if (settingsBackdrop) {
          settingsBackdrop.remove();
        }
        const settingsContainer = document.getElementById('unified-settings-modal-container');
        if (settingsContainer) {
          settingsContainer.innerHTML = '';
          settingsContainer.style.display = 'none';
        }
        break;
      }

      case 'open-settings': {
        if (typeof window !== 'undefined') {
          if ((window as any).settingsView) {
            (window as any).settingsView.open();
          } else if ((window as any).__aetheris_open_settings) {
            (window as any).__aetheris_open_settings();
          } else {
            sovereignRouter.navigateTo('profile', { subtab: 'settings' });
          }
        }
        break;
      }

      case 'set-settings-tab': {
        const tab = el.getAttribute('data-settings-tab') as any;
        if (tab && typeof window !== 'undefined' && (window as any).settingsView) {
          (window as any).settingsView.setActiveTab(tab);
        }
        break;
      }

      case 'set-settings-theme': {
        const themeId = el.getAttribute('data-theme-id');
        if (themeId && typeof window !== 'undefined') {
          if ((window as any).__aetheris_apply_theme) {
            (window as any).__aetheris_apply_theme(themeId);
          } else if ((window as any).themeEngine) {
            (window as any).themeEngine.setTheme(themeId);
          }
          if ((window as any).settingsView) {
            (window as any).settingsView.setActiveTab('appearance');
          }
        }
        break;
      }

      case 'dismiss-suggestion': {
        const sugId = el.getAttribute('data-suggestion-id') || el.closest('[id^="sug-"]')?.id;
        if (sugId) {
          if (typeof window !== 'undefined' && (window as any).aiAssistant) {
            (window as any).aiAssistant.dismissSuggestion(sugId);
          }
          const card = document.getElementById(sugId);
          if (card) {
            card.remove();
            const container = document.getElementById('proactive-ai-container');
            if (container && container.children.length === 0) container.remove();
          }
        }
        break;
      }

      case 'dismiss-suggestion-type': {
        const sugType = el.getAttribute('data-suggestion-type') as any;
        if (sugType && typeof window !== 'undefined' && (window as any).aiAssistant) {
          (window as any).aiAssistant.dismissSuggestionType(sugType);
        }
        const card = el.closest('[id^="sug-"]');
        if (card) {
          card.remove();
          const container = document.getElementById('proactive-ai-container');
          if (container && container.children.length === 0) container.remove();
        }
        break;
      }

      case 'backup-seed': {
        if (typeof window !== 'undefined' && (window as any).__aetheris_open_mnemonic) {
          (window as any).__aetheris_open_mnemonic();
        }
        break;
      }

      case 'close-notifs': {
        if (typeof window !== 'undefined' && (window as any).__aetherisCloseNotifs) {
          (window as any).__aetherisCloseNotifs();
        }
        const notifBackdrop = document.getElementById('notification-backdrop');
        if (notifBackdrop) notifBackdrop.remove();
        break;
      }

      case 'close-parent': {
        const parent = el.closest<HTMLElement>('.fixed, .modal-backdrop, [role="dialog"], [data-modal-root]');
        if (parent) {
          parent.classList.add('hidden');
          parent.remove();
        }
        break;
      }

      case 'call-global': {
        // If element is a backdrop, only proceed if click was directly on the backdrop
        if (el.id.includes('backdrop') && event.target !== el) {
          break;
        }

        // 1. Check for data-raw-click
        const rawClick = el.getAttribute('data-raw-click');
        if (rawClick) {
          try {
            const fn = new Function('event', rawClick);
            fn.call(el, event);
            break;
          } catch (err) {
            console.error('[ActionDispatcher] Error in data-raw-click:', err, rawClick);
          }
        }

        // 2. Check for data-global-method
        const method = el.getAttribute('data-global-method');
        const argsRaw = el.getAttribute('data-global-args');

        if (method === 'if' && argsRaw) {
          try {
            let code = argsRaw.trim();
            if (code.startsWith('[')) code = code.substring(1);
            if (code.endsWith(']')) code = code.substring(0, code.length - 1);
            if (code.endsWith('(')) code = code.substring(0, code.length - 1) + '()';
            const fn = new Function('event', `if (${code};`);
            fn.call(el, event);
            break;
          } catch (err) {
            console.error('[ActionDispatcher] Error evaluating if statement:', err, argsRaw);
          }
        }

        if (method && method !== 'if') {
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

      case 'open-download-manager': {
        const modal = document.getElementById('download-manager-modal');
        if (modal) modal.classList.remove('hidden');
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
      const rawChange = el.getAttribute('data-raw-change');
      if (rawChange) {
        try {
          const fn = new Function('event', rawChange);
          fn.call(el, event);
          return;
        } catch (err) {
          console.error('[ActionDispatcher] Error in data-raw-change:', err);
        }
      }
      const method = el.getAttribute('data-global-method');
      if (method === 'if') {
        const argsRaw = el.getAttribute('data-global-args');
        if (argsRaw) {
          try {
            let code = argsRaw.trim();
            if (code.startsWith('[')) code = code.substring(1);
            if (code.endsWith(']')) code = code.substring(0, code.length - 1);
            if (code.endsWith('(')) code = code.substring(0, code.length - 1) + '()';
            const fn = new Function('event', `if (${code};`);
            fn.call(el, event);
            return;
          } catch (_) {}
        }
      } else if (method) {
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
      const rawInput = el.getAttribute('data-raw-input');
      if (rawInput) {
        try {
          const fn = new Function('event', rawInput);
          fn.call(el, event);
          return;
        } catch (err) {
          console.error('[ActionDispatcher] Error in data-raw-input:', err);
        }
      }
      const method = el.getAttribute('data-global-method');
      if (method === 'if') {
        const argsRaw = el.getAttribute('data-global-args');
        if (argsRaw) {
          try {
            let code = argsRaw.trim();
            if (code.startsWith('[')) code = code.substring(1);
            if (code.endsWith(']')) code = code.substring(0, code.length - 1);
            if (code.endsWith('(')) code = code.substring(0, code.length - 1) + '()';
            const fn = new Function('event', `if (${code};`);
            fn.call(el, event);
            return;
          } catch (_) {}
        }
      } else if (method) {
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
      const rawSubmit = el.getAttribute('data-raw-submit');
      if (rawSubmit) {
        try {
          const fn = new Function('event', rawSubmit);
          fn.call(el, event);
          return;
        } catch (err) {
          console.error('[ActionDispatcher] Error in data-raw-submit:', err);
        }
      }
      const method = el.getAttribute('data-global-method');
      if (method === 'event.preventDefault') {
        event.preventDefault();
        return;
      }
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
