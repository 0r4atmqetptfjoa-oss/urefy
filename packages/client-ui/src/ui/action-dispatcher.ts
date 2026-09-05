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

export function safeExecuteStatement(stmt: string, el: HTMLElement, event: Event): void {
  stmt = stmt.trim();
  if (!stmt) return;

  // 1. Handle if condition: if (...) stmt
  if (stmt.startsWith('if(') || stmt.startsWith('if (')) {
    const openParen = stmt.indexOf('(');
    let depth = 0;
    let closeParen = -1;
    for (let i = openParen; i < stmt.length; i++) {
      if (stmt[i] === '(') depth++;
      else if (stmt[i] === ')') {
        depth--;
        if (depth === 0) {
          closeParen = i;
          break;
        }
      }
    }
    if (closeParen !== -1) {
      const cond = stmt.substring(openParen + 1, closeParen).trim();
      const body = stmt.substring(closeParen + 1).trim();

      // Evaluate condition safely without eval
      let condResult = false;
      if (cond.includes('event.target.id ===') || cond.includes('event.target.id===')) {
        const expectedId = cond.split('===')[1].trim().replace(/['"]/g, '');
        condResult = Boolean(event && event.target && (event.target as HTMLElement).id === expectedId);
      } else if (cond.includes('event.target === this') || cond.includes('event.target===this')) {
        condResult = Boolean(event && event.target === el);
      } else if (cond.includes('event.target.id !==') || cond.includes('event.target.id!==')) {
        const expectedId = cond.split('!==')[1].trim().replace(/['"]/g, '');
        condResult = Boolean(event && event.target && (event.target as HTMLElement).id !== expectedId);
      } else {
        if (typeof window !== 'undefined') {
          const varPath = cond.replace(/^!/, '').trim();
          const parts = varPath.replace(/^window\./, '').split('.');
          let val: any = window;
          for (const p of parts) {
            val = val ? val[p] : undefined;
          }
          condResult = cond.startsWith('!') ? !val : Boolean(val);
        }
      }

      if (condResult) {
        safeExecuteStatement(body, el, event);
      }
      return;
    }
  }

  // 2. Handle ternary: cond ? a : b
  if (stmt.includes('?') && stmt.includes(':') && !stmt.startsWith('{')) {
    const qIdx = stmt.indexOf('?');
    const colonIdx = stmt.lastIndexOf(':');
    const cond = stmt.substring(0, qIdx).trim();
    const branchA = stmt.substring(qIdx + 1, colonIdx).trim();
    const branchB = stmt.substring(colonIdx + 1).trim();

    if (typeof window !== 'undefined') {
      const varPath = cond.replace(/^!/, '').trim();
      const parts = varPath.replace(/^window\./, '').split('.');
      let val: any = window;
      for (const p of parts) {
        val = val ? val[p] : undefined;
      }
      const truthy = cond.startsWith('!') ? !val : Boolean(val);
      if (truthy) {
        safeExecuteStatement(branchA, el, event);
      } else {
        safeExecuteStatement(branchB, el, event);
      }
    }
    return;
  }

  // 3. Handle document.getElementById('...')?.click() or .classList.toggle(...)
  if (stmt.includes('document.getElementById(')) {
    const m = stmt.match(/document\.getElementById\(['"]([^'"]+)['"]\)(\??\.)([a-zA-Z0-9_.]+)(\((.*)\))?/);
    if (m) {
      const id = m[1];
      const method = m[3];
      const argsRaw = m[5];
      const targetEl = typeof document !== 'undefined' ? document.getElementById(id) : null;
      if (targetEl) {
        if (method === 'click') targetEl.click();
        else if (method.startsWith('classList.toggle')) {
          const cls = argsRaw ? argsRaw.replace(/['"]/g, '').trim() : '';
          if (cls) targetEl.classList.toggle(cls);
        } else if (method.startsWith('classList.remove')) {
          const cls = argsRaw ? argsRaw.replace(/['"]/g, '').trim() : '';
          if (cls) targetEl.classList.remove(cls);
        } else if (method.startsWith('classList.add')) {
          const cls = argsRaw ? argsRaw.replace(/['"]/g, '').trim() : '';
          if (cls) targetEl.classList.add(cls);
        } else if (method === 'remove') {
          targetEl.remove();
        }
      }
      return;
    }
  }

  // 4. Handle navigator.clipboard.writeText(...)
  if (stmt.includes('navigator.clipboard') && stmt.includes('writeText')) {
    const m = stmt.match(/writeText\((.*)\)/);
    if (m && typeof navigator !== 'undefined' && navigator.clipboard) {
      let textToCopy = m[1].trim().replace(/^['"]|['"]$/g, '');
      if (textToCopy.includes('document.getElementById')) {
        const idMatch = textToCopy.match(/document\.getElementById\(['"]([^'"]+)['"]\)\.(value|innerText)/);
        if (idMatch && typeof document !== 'undefined') {
          const field = document.getElementById(idMatch[1]) as any;
          textToCopy = field ? (field[idMatch[2]] || '') : '';
        }
      }
      navigator.clipboard.writeText(textToCopy).catch(() => {});
      return;
    }
  }

  // 5. Handle method call: [window.]path.to.func(arg1, arg2)
  const callMatch = stmt.match(/^([a-zA-Z0-9_$.]+)\((.*)\)$/);
  if (callMatch && typeof window !== 'undefined') {
    let funcPath = callMatch[1];
    const argsString = callMatch[2].trim();
    if (funcPath.startsWith('window.')) funcPath = funcPath.substring(7);

    let args: any[] = [];
    if (argsString.length > 0) {
      const argTokens = argsString.split(/,(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/);
      args = argTokens.map(a => {
        a = a.trim();
        if ((a.startsWith("'") && a.endsWith("'")) || (a.startsWith('"') && a.endsWith('"'))) {
          return a.slice(1, -1);
        }
        if (a === 'true') return true;
        if (a === 'false') return false;
        if (a === 'null') return null;
        if (!isNaN(Number(a))) return Number(a);
        return a;
      });
    }

    const parts = funcPath.split('.');
    let obj: any = window;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj ? obj[parts[i]] : undefined;
    }
    const fn = obj ? obj[parts[parts.length - 1]] : undefined;
    if (typeof fn === 'function') {
      try {
        fn.apply(obj, args);
      } catch (e) {
        console.error('[ActionDispatcher] Error invoking ' + funcPath, e);
      }
    }
  }
}

export function safeExecuteExpression(code: string, el: HTMLElement, event: Event): void {
  if (!code || typeof code !== 'string') return;
  code = code.replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let parenDepth = 0;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
    else if (ch === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
    else if (ch === '(' && !inSingleQuote && !inDoubleQuote) parenDepth++;
    else if (ch === ')' && !inSingleQuote && !inDoubleQuote) parenDepth--;
    else if (ch === ';' && !inSingleQuote && !inDoubleQuote && parenDepth === 0) {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) statements.push(current.trim());

  statements.forEach(stmt => safeExecuteStatement(stmt, el, event));
}

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
        if (el.id === 'notification-backdrop' && event.target !== el) {
          break;
        }
        if (typeof window !== 'undefined') {
          if ((window as any).__aetherisCloseNotifs) {
            (window as any).__aetherisCloseNotifs();
          }
          if ((window as any).clientStore) {
            (window as any).clientStore.notifySync();
          }
        }
        const notifWrapper = document.getElementById('notification-modal-wrapper');
        if (notifWrapper) notifWrapper.remove();
        const notifBackdrop = document.getElementById('notification-backdrop');
        if (notifBackdrop) notifBackdrop.remove();
        break;
      }

      case 'set-notif-filter': {
        const filter = (el.getAttribute('data-filter') || 'all') as any;
        if (typeof window !== 'undefined') {
          if ((window as any).__aetherisNotifCenter) {
            (window as any).__aetherisNotifCenter.setFilter(filter);
          }
          if ((window as any).clientStore) {
            (window as any).clientStore.notifySync();
          }
        }
        break;
      }

      case 'notif-mark-all-read': {
        if (typeof window !== 'undefined') {
          if ((window as any).__aetherisNotifCenter) {
            (window as any).__aetherisNotifCenter.markAllRead();
          }
          if ((window as any).clientStore) {
            (window as any).clientStore.notifySync();
          }
        }
        break;
      }

      case 'notif-clear-all': {
        if (typeof window !== 'undefined') {
          if ((window as any).__aetherisNotifCenter) {
            (window as any).__aetherisNotifCenter.clearAll();
          }
          if ((window as any).clientStore) {
            (window as any).clientStore.notifySync();
          }
        }
        break;
      }

      case 'notif-open-item': {
        const notifId = el.getAttribute('data-notif-id');
        const postId = el.getAttribute('data-post-id');
        if (typeof window !== 'undefined') {
          if (notifId && (window as any).__aetherisNotifCenter) {
            (window as any).__aetherisNotifCenter.markRead(notifId);
          }
          if ((window as any).__aetherisCloseNotifs) {
            (window as any).__aetherisCloseNotifs();
          }
          if (postId && (window as any).postDetailView) {
            (window as any).postDetailView.open(postId);
          }
          if ((window as any).clientStore) {
            (window as any).clientStore.notifySync();
          }
        }
        break;
      }

      case 'set-legal-tab': {
        const tab = (el.getAttribute('data-tab') || el.getAttribute('data-legal-tab') || 'about') as any;
        if (typeof window !== 'undefined') {
          if ((window as any).legalModal) {
            (window as any).legalModal.setTab(tab);
          } else if ((window as any).__aetheris_set_legal_tab) {
            (window as any).__aetheris_set_legal_tab(tab);
          }
          if ((window as any).clientStore) {
            (window as any).clientStore.notifySync();
          }
        }
        break;
      }

      case 'close-legal': {
        if (el.id.includes('backdrop') && event.target !== el) break;
        if (typeof window !== 'undefined') {
          if ((window as any).legalModal) (window as any).legalModal.close();
          if ((window as any).__aetheris_close_legal) (window as any).__aetheris_close_legal();
          modalManager.closeFeature();
          if ((window as any).clientStore) (window as any).clientStore.notifySync();
        }
        const parent = el.closest<HTMLElement>('.fixed, .modal-backdrop, [role="dialog"], #legal-modal-backdrop');
        if (parent) parent.remove();
        break;
      }

      case 'set-archive-tab': {
        const tab = (el.getAttribute('data-tab') || 'export') as 'export' | 'restore';
        if (typeof window !== 'undefined') {
          const archiveModal = (window as any).archiveModal;
          if (archiveModal) archiveModal.setTab(tab);
          if ((window as any).clientStore) (window as any).clientStore.notifySync();
        }
        break;
      }

      case 'set-social-recovery-tab': {
        const tab = (el.getAttribute('data-tab') || 'setup') as 'setup' | 'recover';
        if (typeof window !== 'undefined') {
          const srm = (window as any).socialRecoveryModal;
          if (srm) srm.setTab(tab);
          if ((window as any).clientStore) (window as any).clientStore.notifySync();
        }
        break;
      }

      case 'set-portable-trust-tab': {
        const tab = (el.getAttribute('data-tab') || 'export') as 'export' | 'verify';
        if (typeof window !== 'undefined') {
          const ptm = (window as any).portableTrustModal;
          if (ptm) ptm.setTab(tab);
          if ((window as any).clientStore) (window as any).clientStore.notifySync();
        }
        break;
      }

      case 'set-mnemonic-tab': {
        const tab = (el.getAttribute('data-tab') || 'backup') as any;
        if (typeof window !== 'undefined') {
          const smm = (window as any).sovereignMnemonicModal;
          if (smm) smm.setTab(tab);
          if ((window as any).clientStore) (window as any).clientStore.notifySync();
        }
        break;
      }

      case 'set-transparency-tab': {
        const tab = (el.getAttribute('data-tab') || 'pipeline') as any;
        if (typeof window !== 'undefined') {
          const tm = (window as any).transparencyMode || (window as any).__aetherisTransparency;
          if (tm) tm.activeTab = tab;
          if ((window as any).clientStore) (window as any).clientStore.notifySync();
        }
        break;
      }

      case 'set-profile-tab': {
        const tab = (el.getAttribute('data-tab') || el.getAttribute('data-profile-tab') || 'pulses') as any;
        if (typeof window !== 'undefined') {
          if ((window as any).profileView) (window as any).profileView.setActiveTab(tab);
          if ((window as any).clientStore) (window as any).clientStore.notifySync();
        }
        break;
      }

      case 'set-profile-settings-cat': {
        const cat = (el.getAttribute('data-cat') || el.getAttribute('data-settings-cat') || 'account') as any;
        if (typeof window !== 'undefined') {
          if ((window as any).__aetheris_set_settings_cat) {
            (window as any).__aetheris_set_settings_cat(cat);
          } else if ((window as any).profileView) {
            (window as any).profileView.setActiveSettingsCategory(cat);
          }
          if ((window as any).clientStore) (window as any).clientStore.notifySync();
        }
        break;
      }

      case 'save-settings': {
        if (typeof window !== 'undefined') {
          if ((window as any).settingsView) {
            (window as any).settingsView.save();
            (window as any).settingsView.close();
          }
          if ((window as any).__aetheris_close_settings) (window as any).__aetheris_close_settings();
          if ((window as any).clientStore) {
            (window as any).clientStore.showToast?.('✓ Settings saved successfully', 'success');
            (window as any).clientStore.notifySync();
          }
        }
        const settingsBackdrop = document.getElementById('settings-modal-backdrop');
        if (settingsBackdrop) settingsBackdrop.remove();
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

        // 1. Check for data-raw-click (Safe zero-eval execution)
        const rawClick = el.getAttribute('data-raw-click');
        if (rawClick) {
          try {
            safeExecuteExpression(rawClick, el, event);
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
            safeExecuteExpression(`if (${code};`, el, event);
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
          safeExecuteExpression(rawChange, el, event);
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
            safeExecuteExpression(`if (${code};`, el, event);
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
          safeExecuteExpression(rawInput, el, event);
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
            safeExecuteExpression(`if (${code};`, el, event);
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
          safeExecuteExpression(rawSubmit, el, event);
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
