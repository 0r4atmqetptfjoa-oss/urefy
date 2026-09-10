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
import { soundEffects } from '../sound-effects.js';
import { i18n } from '../i18n.js';
import { hybridComposer } from '../composer-hybrid.js';
import { legalModal } from '../legal-modal.js';
import { sovereignCircleEngine } from '../sovereign-circle.js';
import { sovereignDM } from '../sovereign-dm.js';
import {
  setActiveMessagesTab,
  openNewDMPicker,
  closeNewDMPicker,
  setDMSearchQuery,
  toggleDMEmojiPicker,
  toggleRelayEmojiPicker,
  closeEmojiPickers,
  handleFileAttachment,
  getMessageDraft,
  setMessageDraft,
  captureMessageSelection,
  insertMessageEmoji,
  restoreMessageSelection,
} from '../messages-view.js';
import { binaryHygienePortal } from '../binary-hygiene-portal.js';
import { exploreView } from '../explore-view.js';
import { setWorkspaceLayout } from '../workspace-layout.js';
import { sovereignWebPush } from '../web-push.js';

function withWallet(action: (wallet: typeof import('../wallet-bridge.js').walletBridge) => unknown): void {
  void import('../wallet-bridge.js').then(({ walletBridge }) => action(walletBridge)).catch(error => {
    clientStore.showToast(error instanceof Error ? error.message : 'Wallet unavailable', 'warning');
  });
}

export function safeExecuteStatement(stmt: string, el: HTMLElement, event: Event): void {
  stmt = stmt.trim();
  if (!stmt) return;

  // 0. Unwrap curly braces if entire statement is wrapped: { ... }
  if (stmt.startsWith('{') && stmt.endsWith('}')) {
    stmt = stmt.slice(1, -1).trim();
    safeExecuteExpression(stmt, el, event);
    return;
  }

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
      let body = stmt.substring(closeParen + 1).trim();
      if (body.startsWith('{') && body.endsWith('}')) {
        body = body.slice(1, -1).trim();
      }

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
        safeExecuteExpression(body, el, event);
      }
      return;
    }
  }

  // 1b. Handle logical AND: window.foo && window.foo.bar()
  if (stmt.includes('&&') && !stmt.startsWith('if')) {
    const parts = stmt.split('&&');
    for (const part of parts) {
      safeExecuteStatement(part.trim(), el, event);
    }
    return;
  }

  // 1c. Handle property assignment: [window.]path.to.prop = value
  if (stmt.includes('=') && !stmt.includes('==') && !stmt.includes('!=') && !stmt.includes('<=') && !stmt.includes('>=')) {
    const eqIdx = stmt.indexOf('=');
    let targetPath = stmt.substring(0, eqIdx).trim();
    let valStr = stmt.substring(eqIdx + 1).trim();
    if (targetPath.startsWith('window.')) targetPath = targetPath.substring(7);
    const parts = targetPath.split('.');
    let obj: any = typeof window !== 'undefined' ? window : {};
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj ? obj[parts[i]] : undefined;
    }
    if (obj && parts.length > 0) {
      let val: any = valStr;
      if (valStr === 'true') val = true;
      else if (valStr === 'false') val = false;
      else if (valStr === 'null') val = null;
      else if (!isNaN(Number(valStr)) && valStr !== '') val = Number(valStr);
      else if ((valStr.startsWith("'") && valStr.endsWith("'")) || (valStr.startsWith('"') && valStr.endsWith('"'))) {
        val = valStr.slice(1, -1);
      }
      obj[parts[parts.length - 1]] = val;
    }
    return;
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

    const captureSelection = (event: Event) => {
      const input = event.target as HTMLInputElement | null;
      if (input?.id === 'input-message') captureMessageSelection('relay', input);
      else if (input?.id === 'input-dm-message') captureMessageSelection('dm', input);
    };
    document.addEventListener('select', captureSelection, true);
    document.addEventListener('focusout', captureSelection, true);
    document.addEventListener('pointerup', captureSelection);
    document.addEventListener('keyup', captureSelection);
    document.addEventListener('pointerdown', event => {
      const action = (event.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'toggle-relay-emoji' || action === 'toggle-dm-emoji') {
        const target = action === 'toggle-dm-emoji' ? 'dm' : 'relay';
        captureMessageSelection(target, document.getElementById(target === 'dm' ? 'input-dm-message' : 'input-message') as HTMLInputElement | null);
        event.preventDefault();
      } else if (action === 'insert-relay-emoji' || action === 'insert-dm-emoji') {
        event.preventDefault();
      }
    });

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

    // 4. Submit delegation - unconditionally prevent default page refresh in SPA
    document.addEventListener('submit', (event: Event) => {
      event.preventDefault();
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const submitEl = target.closest<HTMLElement>('[data-submit]');
      if (!submitEl) return;

      const submitAction = submitEl.getAttribute('data-submit');
      if (!submitAction) return;

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

      case 'open-edit-profile': {
        if (typeof window !== 'undefined') {
          if ((window as any).profileView) {
            (window as any).profileView.isEditProfileModalOpen = true;
          }
          if ((window as any).clientStore) {
            (window as any).clientStore.notifySync();
          }
        }
        break;
      }

      case 'close-edit-profile': {
        if (typeof window !== 'undefined') {
          if ((window as any).profileView) {
            (window as any).profileView.isEditProfileModalOpen = false;
          }
          if ((window as any).clientStore) {
            (window as any).clientStore.notifySync();
          }
        }
        const overlay = document.getElementById('edit-profile-modal-overlay');
        if (overlay) overlay.remove();
        break;
      }

      case 'save-profile': {
        if (typeof window !== 'undefined') {
          if (typeof (window as any).__aetheris_save_profile === 'function') {
            (window as any).__aetheris_save_profile();
          } else if ((window as any).profileView) {
            const nameInput = document.getElementById('edit-profile-name') as HTMLInputElement;
            const bioInput = document.getElementById('edit-profile-bio') as HTMLTextAreaElement;
            const locInput = document.getElementById('edit-profile-location') as HTMLInputElement;
            const webInput = document.getElementById('edit-profile-website') as HTMLInputElement;
            const avInput = document.getElementById('edit-profile-avatar') as HTMLInputElement;
            const banInput = document.getElementById('edit-profile-banner') as HTMLInputElement;
            const targetFp = (window as any).profileView.targetFingerprint || (window as any).clientStore?.keypair?.fingerprint || 'genesis-core';
            (window as any).profileView.updateProfile(targetFp, {
              name: nameInput?.value || 'Sovereign Node',
              bio: bioInput?.value || '',
              location: locInput?.value || '',
              website: webInput?.value || '',
              avatar: avInput?.value || (window as any).profileView.getProfile(targetFp).avatar,
              banner: banInput?.value || (window as any).profileView.getProfile(targetFp).banner,
            });
            (window as any).profileView.isEditProfileModalOpen = false;
            if ((window as any).clientStore) {
              (window as any).clientStore.showToast?.('✨ Sovereign Profile updated!', 'success');
              (window as any).clientStore.notifySync();
            }
          }
        }
        break;
      }

      case 'report-post':
      case 'report-vault': {
        event.stopPropagation();
        const postId = el.getAttribute('data-post-id') || el.getAttribute('data-id') || '';
        if (typeof window !== 'undefined') {
          if (typeof (window as any).__aetheris_open_legal === 'function') {
            (window as any).__aetheris_open_legal('dsa', postId);
          } else {
            modalManager.openFeature('legal', { tab: 'dsa', targetId: postId });
          }
          if ((window as any).clientStore) {
            (window as any).clientStore.notifySync();
          }
        }
        break;
      }

      case 'submit-dsa-report': {
        event.preventDefault();
        if (typeof window !== 'undefined') {
          const lm = (window as any).legalModal || legalModal;
          if (lm && typeof lm.submitDsaReport === 'function') {
            lm.submitDsaReport().then(() => {
              if ((window as any).clientStore) (window as any).clientStore.notifySync();
            }).catch(() => {});
          }
        }
        break;
      }

      case 'toggle-follow': {
        const fp = el.getAttribute('data-fingerprint') || el.getAttribute('data-fp');
        if (fp && typeof window !== 'undefined') {
          if ((window as any).profileView) {
            const isFollowing = (window as any).profileView.toggleFollow(fp);
            if ((window as any).clientStore) {
              (window as any).clientStore.showToast?.(isFollowing ? `🤝 Trust connection established with @id:${fp.substring(0, 8)}` : `Trust connection removed`, 'info');
              (window as any).clientStore.notifySync();
            }
          }
        }
        break;
      }

      case 'toggle-join-circle': {
        const cid = el.getAttribute('data-circle-id') || el.getAttribute('data-cid');
        if (cid) {
          sovereignCircleEngine.toggleJoin(cid);
        }
        break;
      }

      case 'open-create-circle': {
        sovereignCircleEngine.openCreateModal();
        break;
      }

      case 'close-create-circle': {
        sovereignCircleEngine.closeCreateModal();
        break;
      }

      case 'open-community': {
        const channel = el.getAttribute('data-channel') || el.getAttribute('data-channel-id') || el.getAttribute('data-id') || 'pulse-global';
        clientStore.activeChannelId = channel;
        sovereignRouter.navigateTo('feed');
        clientStore.notifySync();
        break;
      }

      case 'open-explore-communities': {
        exploreView.activeSubTab = 'communities';
        sovereignRouter.navigateTo('explore');
        clientStore.notifySync();
        break;
      }

      case 'set-explore-subtab': {
        const subtab = el.getAttribute('data-subtab') as 'pulses' | 'communities';
        if (subtab) {
          exploreView.activeSubTab = subtab;
          clientStore.notifySync();
        }
        break;
      }

      case 'open-circle-mod-tools': {
        const circleId = el.getAttribute('data-circle-id') || clientStore.activeChannelId;
        sovereignCircleEngine.openModModal(circleId);
        break;
      }

      case 'set-workspace-layout': {
        setWorkspaceLayout(el.getAttribute('data-layout'));
        break;
      }

      case 'push-dismiss': {
        sovereignWebPush.dismissBanner();
        break;
      }

      case 'push-subscribe': {
        void sovereignWebPush.subscribeUser();
        break;
      }

      case 'close-circle-mod-tools': {
        sovereignCircleEngine.closeModModal();
        break;
      }

      case 'set-circle-mod-tab': {
        const tab = el.getAttribute('data-tab') as 'settings' | 'rules' | 'flairs' | 'moderation';
        if (tab) sovereignCircleEngine.setModTab(tab);
        break;
      }

      case 'select-mod-color': {
        const col = el.getAttribute('data-color');
        const input = document.getElementById('input-mod-color') as HTMLInputElement | null;
        if (col && input) {
          input.value = col;
          const circleId = sovereignCircleEngine.modModalCircleId;
          if (circleId) {
            const circle = sovereignCircleEngine.findCircle(circleId) || sovereignCircleEngine.getCircle(circleId);
            if (circle) {
              circle.primaryColor = col;
              clientStore.notifySync();
            }
          }
        }
        break;
      }

      case 'save-circle-settings': {
        const circleId = el.getAttribute('data-circle-id') || sovereignCircleEngine.modModalCircleId;
        if (!circleId) break;
        const title = (document.getElementById('input-mod-display-title') as HTMLInputElement)?.value;
        const desc = (document.getElementById('input-mod-description') as HTMLTextAreaElement)?.value;
        const cat = (document.getElementById('input-mod-category') as HTMLSelectElement)?.value;
        const access = (document.getElementById('input-mod-access-type') as HTMLSelectElement)?.value as any;
        const col = (document.getElementById('input-mod-color') as HTMLInputElement)?.value;
        sovereignCircleEngine.updateCircleSettings(circleId, {
          displayName: title,
          description: desc,
          category: cat,
          communityType: access,
          primaryColor: col,
        });
        break;
      }

      case 'add-circle-rule': {
        const circleId = el.getAttribute('data-circle-id') || sovereignCircleEngine.modModalCircleId;
        if (!circleId) break;
        const title = (document.getElementById('input-new-rule-title') as HTMLInputElement)?.value || '';
        const desc = (document.getElementById('input-new-rule-desc') as HTMLTextAreaElement)?.value || '';
        if (title.trim()) {
          sovereignCircleEngine.addRule(circleId, title, desc);
        }
        break;
      }

      case 'delete-circle-rule': {
        const circleId = el.getAttribute('data-circle-id') || sovereignCircleEngine.modModalCircleId;
        const ruleId = parseInt(el.getAttribute('data-rule-id') || '0', 10);
        if (circleId && ruleId) {
          sovereignCircleEngine.deleteRule(circleId, ruleId);
        }
        break;
      }

      case 'add-circle-flair': {
        const circleId = el.getAttribute('data-circle-id') || sovereignCircleEngine.modModalCircleId;
        const flair = (document.getElementById('input-new-flair') as HTMLInputElement)?.value || '';
        if (circleId && flair.trim()) {
          sovereignCircleEngine.addFlair(circleId, flair);
        }
        break;
      }

      case 'delete-circle-flair': {
        const circleId = el.getAttribute('data-circle-id') || sovereignCircleEngine.modModalCircleId;
        const flair = el.getAttribute('data-flair') || '';
        if (circleId && flair) {
          sovereignCircleEngine.deleteFlair(circleId, flair);
        }
        break;
      }

      case 'ban-circle-node': {
        const circleId = el.getAttribute('data-circle-id') || sovereignCircleEngine.modModalCircleId;
        const fp = (document.getElementById('input-mod-ban-fp') as HTMLInputElement)?.value || '';
        if (circleId && fp.trim()) {
          sovereignCircleEngine.banNode(circleId, fp);
        }
        break;
      }

      case 'unban-circle-node': {
        const circleId = el.getAttribute('data-circle-id') || sovereignCircleEngine.modModalCircleId;
        const fp = el.getAttribute('data-fp') || '';
        if (circleId && fp) {
          sovereignCircleEngine.unbanNode(circleId, fp);
        }
        break;
      }

      case 'add-circle-mod': {
        const circleId = el.getAttribute('data-circle-id') || sovereignCircleEngine.modModalCircleId;
        const fp = (document.getElementById('input-mod-add-fp') as HTMLInputElement)?.value || '';
        if (circleId && fp.trim()) {
          sovereignCircleEngine.addModerator(circleId, fp);
        }
        break;
      }

      case 'mod-pin-post': {
        const circleId = el.getAttribute('data-circle-id') || clientStore.activeChannelId;
        const postId = el.getAttribute('data-post-id') || '';
        if (circleId && postId) {
          sovereignCircleEngine.togglePinPost(circleId, postId);
        }
        break;
      }

      case 'mod-remove-post': {
        const circleId = el.getAttribute('data-circle-id') || clientStore.activeChannelId;
        const postId = el.getAttribute('data-post-id') || '';
        if (circleId && postId) {
          sovereignCircleEngine.modRemovePost(circleId, postId);
        }
        break;
      }

      case 'open-composer-for-circle': {
        const channel = el.getAttribute('data-channel') || clientStore.activeChannelId;
        if (channel) {
          clientStore.activeChannelId = channel;
        }
        clientStore.toggleComposer();
        clientStore.notifySync();
        break;
      }

      case 'open-dm': {
        const fp = el.getAttribute('data-fingerprint') || el.getAttribute('data-fp');
        const role = el.getAttribute('data-peer-role') || el.getAttribute('data-role') || 'MEMBER';
        if (fp) {
          sovereignDM.openDM(fp, role);
          setActiveMessagesTab('dm');
          sovereignRouter.navigateTo('messages');
        }
        break;
      }

      case 'switch-messages-tab': {
        const tab = el.getAttribute('data-tab') as 'relays' | 'dm';
        if (tab) {
          setActiveMessagesTab(tab);
          clientStore.notifySync();
        }
        break;
      }

      case 'new-dm-conversation': {
        openNewDMPicker();
        clientStore.notifySync();
        break;
      }

      case 'close-new-dm': {
        closeNewDMPicker();
        clientStore.notifySync();
        break;
      }

      case 'start-dm-with-peer': {
        const peer = el.getAttribute('data-peer');
        const role = el.getAttribute('data-role') || 'MEMBER';
        if (peer) {
          closeNewDMPicker();
          sovereignDM.openDM(peer, role);
          setActiveMessagesTab('dm');
          clientStore.notifySync();
        }
        break;
      }

      case 'submit-new-dm-peer': {
        const input = document.getElementById('input-new-dm-peer') as HTMLInputElement | null;
        if (input && input.value.trim()) {
          const peer = input.value.trim().toLowerCase().replace(/^0x/, '');
          closeNewDMPicker();
          sovereignDM.openDM(peer, 'MEMBER');
          setActiveMessagesTab('dm');
          clientStore.notifySync();
        }
        break;
      }

      case 'select-dm-peer': {
        const peer = el.getAttribute('data-peer');
        if (peer) {
          sovereignDM.setActivePeer(peer);
          clientStore.notifySync();
        }
        break;
      }

      case 'open-dm-safety': {
        sovereignDM.toggleSafetyModal();
        break;
      }

      case 'toggle-dm-ciphertext': {
        sovereignDM.showCiphertextToggle = !sovereignDM.showCiphertextToggle;
        clientStore.notifySync();
        break;
      }

      case 'send-dm-ping': {
        const activeFP = sovereignDM.activePeerFP;
        if (activeFP) {
          const myFP = clientStore.keypair?.fingerprint || 'me_local_node_0x9f4e';
          sovereignDM.sendMessage('🔐 URE secure connectivity check', myFP).then(() => {
            clientStore.notifySync();
            setTimeout(() => {
              const container = document.getElementById('dm-thread-messages');
              if (container) container.scrollTop = container.scrollHeight;
            }, 50);
          }).catch(() => clientStore.showToast('Secure ping could not be sent.', 'warning'));
        }
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
          (window as any).walletBridge?.closeModal?.();
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
        if (typeof window !== 'undefined' && typeof (window as any).__aetheris_open_legal === 'function') {
          (window as any).__aetheris_open_legal(tab);
        } else {
          modalManager.openFeature('legal', tab);
        }
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
          if (channel.startsWith('relays-') || channel.startsWith('relay-') || channel.startsWith('dm-')) {
            sovereignRouter.navigateTo('messages');
          } else if (channel.startsWith('vault-')) {
            sovereignRouter.navigateTo('vault');
          } else if (channel.startsWith('pulse-') || channel.startsWith('c/')) {
            sovereignRouter.navigateTo('feed');
          }
        }
        break;
      }

      case 'nav-mode': {
        const mode = el.getAttribute('data-mode') as any;
        if (mode) {
          if (mode === 'relays' || mode === 'messages') {
            clientStore.joinChannel('relays-general');
            sovereignRouter.navigateTo('messages');
          } else if (mode === 'pulse' || mode === 'feed') {
            clientStore.joinChannel('pulse-global');
            sovereignRouter.navigateTo('feed');
          } else if (mode === 'vault') {
            clientStore.joinChannel('vault-releases');
            sovereignRouter.navigateTo('vault');
          } else {
            sovereignRouter.navigateTo(mode);
          }
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
        clientStore.toggleUiMode();
        clientStore.notifySync();
        break;
      }

      case 'toggle-sound': {
        const sfx = (window as any).soundEffects || soundEffects;
        if (sfx && typeof sfx.toggleSound === 'function') {
          sfx.toggleSound();
          if (typeof window !== 'undefined' && (window as any).clientStore) {
            (window as any).clientStore.showToast?.(
              sfx.isEnabled ? '🔊 Sound FX Enabled' : '🔇 Sound FX Muted',
              'info'
            );
            (window as any).clientStore.notifySync();
          }
        }
        break;
      }

      case 'open-lang-picker': {
        if (typeof window !== 'undefined') {
          if (typeof (window as any).__aetheris_open_lang === 'function') {
            (window as any).__aetheris_open_lang();
          }
          if ((window as any).clientStore) (window as any).clientStore.notifySync();
        }
        break;
      }

      case 'close-lang': {
        if (typeof window !== 'undefined') {
          if (typeof (window as any).__aetheris_close_lang === 'function') {
            (window as any).__aetheris_close_lang();
          }
          if ((window as any).clientStore) (window as any).clientStore.notifySync();
        }
        break;
      }

      case 'select-lang': {
        const code = el.getAttribute('data-lang');
        if (code && typeof window !== 'undefined') {
          const i18nEngine = (window as any).i18n || i18n;
          if (i18nEngine && typeof i18nEngine.setLanguage === 'function') {
            i18nEngine.setLanguage(code as any);
          }
          if (typeof (window as any).__aetheris_close_lang === 'function') {
            (window as any).__aetheris_close_lang();
          }
          if ((window as any).clientStore) {
            (window as any).clientStore.showToast?.(`🌐 Language: ${code.toUpperCase()}`, 'info');
            (window as any).clientStore.notifySync();
          }
        }
        break;
      }

      case 'connect-metamask': {
        withWallet(async wallet => {
          await wallet.connectMetaMask();
          clientStore.notifySync();
        });
        break;
      }

      case 'disconnect-wallet': {
        withWallet(wallet => {
          wallet.disconnect();
          clientStore.notifySync();
        });
        break;
      }

      case 'set-wallet-tab': {
        const tab = el.getAttribute('data-tab');
        if (tab === 'identity' || tab === 'signatures' || tab === 'token-gate' || tab === 'networks') withWallet(wallet => {
          wallet.setTab(tab);
          clientStore.notifySync();
        });
        break;
      }

      case 'add-wallet-token': {
        const address = (document.getElementById('wallet-token-address') as HTMLInputElement | null)?.value ?? '';
        const threshold = (document.getElementById('wallet-token-threshold') as HTMLInputElement | null)?.value ?? '';
        withWallet(wallet => wallet.addTokenCheck(address, threshold));
        break;
      }

      case 'open-composer-media': {
        if (typeof window !== 'undefined') {
          const hc = (window as any).hybridComposer || hybridComposer;
          if (hc) hc.activeTab = 'media';
          clientStore.isComposerOpen = true;
          clientStore.notifySync();
        }
        break;
      }

      case 'toggle-bookmarks': {
        if (typeof window !== 'undefined') {
          if (typeof (window as any).__aetheris_toggle_bookmarks === 'function') {
            (window as any).__aetheris_toggle_bookmarks();
          } else {
            const btn = document.getElementById('btn-open-bookmarks-modal');
            btn?.click();
          }
        }
        break;
      }

      case 'toggle-video-play': {
        event.stopPropagation();
        const vid = el.getAttribute('data-video-id');
        const videoEl = (vid ? document.getElementById(`video-${vid}`) : null) || (el instanceof HTMLVideoElement ? el : el.closest('.group, [class*="relative rounded-2xl"]')?.querySelector('video'));
        if (videoEl instanceof HTMLVideoElement) {
          if (videoEl.paused) {
            videoEl.play().catch(() => {});
          } else {
            videoEl.pause();
          }
        }
        break;
      }

      case 'toggle-video-mute': {
        event.stopPropagation();
        const vid = el.getAttribute('data-video-id');
        const videoEl = (vid ? document.getElementById(`video-${vid}`) : null) || el.closest('.group, [class*="relative rounded-2xl"]')?.querySelector('video');
        if (videoEl instanceof HTMLVideoElement) {
          videoEl.muted = !videoEl.muted;
          el.textContent = videoEl.muted ? '🔇' : '🔊';
        }
        break;
      }

      case 'toggle-video-pip': {
        event.stopPropagation();
        const vid = el.getAttribute('data-video-id');
        const videoEl = (vid ? document.getElementById(`video-${vid}`) : null) || el.closest('.group, [class*="relative rounded-2xl"]')?.querySelector('video');
        if (videoEl instanceof HTMLVideoElement) {
          if (document.pictureInPictureElement === videoEl) {
            document.exitPictureInPicture().catch(() => {});
          } else if (videoEl.requestPictureInPicture) {
            videoEl.requestPictureInPicture().catch(() => {});
          }
        }
        break;
      }

      case 'toggle-video-fs': {
        event.stopPropagation();
        const vid = el.getAttribute('data-video-id');
        const videoEl = (vid ? document.getElementById(`video-${vid}`) : null) || el.closest('.group, [class*="relative rounded-2xl"]')?.querySelector('video');
        if (videoEl instanceof HTMLVideoElement) {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else if (videoEl.requestFullscreen) {
            videoEl.requestFullscreen().catch(() => {});
          }
        }
        break;
      }

      case 'seek-video': {
        event.stopPropagation();
        const vid = el.getAttribute('data-video-id');
        const videoEl = (vid ? document.getElementById(`video-${vid}`) : null) || el.closest('.group, [class*="relative rounded-2xl"]')?.querySelector('video');
        if (videoEl instanceof HTMLVideoElement && videoEl.duration > 0) {
          const rect = el.getBoundingClientRect();
          const pos = (event.clientX - rect.left) / rect.width;
          videoEl.currentTime = Math.max(0, Math.min(videoEl.duration, pos * videoEl.duration));
        }
        break;
      }

      case 'trigger-binary-file-select': {
        const fileInput = document.getElementById('binary-hygiene-file-input') as HTMLInputElement | null;
        if (fileInput) {
          fileInput.click();
        }
        break;
      }

      case 'close-binary-hygiene': {
        const portal = (window as any).binaryHygienePortal || binaryHygienePortal;
        portal?.close();
        modalManager.closeFeature();
        break;
      }

      case 'close-binary-hygiene-backdrop': {
        if (event.target === el || (event.target as HTMLElement).id === 'binary-hygiene-backdrop') {
          const portal = (window as any).binaryHygienePortal || binaryHygienePortal;
          portal?.close();
          modalManager.closeFeature();
        }
        break;
      }

      case 'clear-binary-report': {
        const portal = (window as any).binaryHygienePortal || binaryHygienePortal;
        portal?.clearReport();
        break;
      }

      case 'download-binary-audit-cert': {
        const portal = (window as any).binaryHygienePortal || binaryHygienePortal;
        portal?.downloadAuditCertificate();
        break;
      }

      case 'scan-sample-clean': {
        const portal = (window as any).binaryHygienePortal || binaryHygienePortal;
        portal?.scanSampleBinary('clean');
        break;
      }

      case 'scan-sample-upx': {
        const portal = (window as any).binaryHygienePortal || binaryHygienePortal;
        portal?.scanSampleBinary('upx');
        break;
      }

      case 'scan-sample-suspicious': {
        const portal = (window as any).binaryHygienePortal || binaryHygienePortal;
        portal?.scanSampleBinary('suspicious');
        break;
      }

      case 'toggle-dm-emoji': {
        toggleDMEmojiPicker();
        clientStore.notifySync();
        requestAnimationFrame(() => restoreMessageSelection('dm'));
        break;
      }

      case 'toggle-relay-emoji': {
        toggleRelayEmojiPicker();
        clientStore.notifySync();
        requestAnimationFrame(() => restoreMessageSelection('relay'));
        break;
      }

      case 'close-emoji-pickers': {
        closeEmojiPickers();
        clientStore.notifySync();
        break;
      }

      case 'insert-dm-emoji': {
        const emoji = el.getAttribute('data-emoji');
        if (emoji) {
          insertMessageEmoji('dm', emoji);
          restoreMessageSelection('dm');
        }
        toggleDMEmojiPicker(false);
        clientStore.notifySync();
        requestAnimationFrame(() => restoreMessageSelection('dm'));
        break;
      }

      case 'insert-relay-emoji': {
        const emoji = el.getAttribute('data-emoji');
        if (emoji) {
          insertMessageEmoji('relay', emoji);
          restoreMessageSelection('relay');
        }
        toggleRelayEmojiPicker(false);
        clientStore.notifySync();
        requestAnimationFrame(() => restoreMessageSelection('relay'));
        break;
      }

      case 'trigger-dm-attachment': {
        const fileInput = document.getElementById('input-dm-attachment-file') as HTMLInputElement | null;
        if (fileInput) fileInput.click();
        break;
      }

      case 'trigger-relay-attachment': {
        const fileInput = document.getElementById('input-relay-attachment-file') as HTMLInputElement | null;
        if (fileInput) fileInput.click();
        break;
      }

      case 'clear-dm-attachment': {
        sovereignDM.setPendingAttachment(null);
        clientStore.notifySync();
        break;
      }

      case 'clear-relay-attachment': {
        clientStore.pendingRelayAttachment = null;
        clientStore.notifySync();
        break;
      }

      case 'open-lightbox': {
        const src = el.getAttribute('data-src');
        if (src) {
          window.open(src, '_blank');
        }
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
    if (action === 'scan-binary-file' || el.id === 'binary-hygiene-file-input') {
      const fileInput = el as HTMLInputElement;
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const portal = (window as any).binaryHygienePortal || binaryHygienePortal;
        if (portal && typeof portal.scanFile === 'function') {
          portal.scanFile(file, file.name).catch((err: any) => console.error('Binary scan failed:', err));
        }
      }
      return;
    }
    if (action === 'dm-file-attached' || el.id === 'input-dm-attachment-file') {
      const fileInput = el as HTMLInputElement;
      if (fileInput.files && fileInput.files[0]) {
        handleFileAttachment(fileInput.files[0], 'dm');
        fileInput.value = '';
      }
      return;
    }
    if (action === 'relay-file-attached' || el.id === 'input-relay-attachment-file') {
      const fileInput = el as HTMLInputElement;
      if (fileInput.files && fileInput.files[0]) {
        handleFileAttachment(fileInput.files[0], 'relay');
        fileInput.value = '';
      }
      return;
    }
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
    } else if (action === 'search-dm-peers') {
      setDMSearchQuery(el.value);
      clientStore.notifySync();
    } else if (action === 'update-dm-draft') {
      captureMessageSelection('dm', el as HTMLInputElement);
    } else if (action === 'update-relay-draft') {
      captureMessageSelection('relay', el as HTMLInputElement);
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
    } else if (action === 'submit-dsa-report') {
      event.preventDefault();
      if (typeof window !== 'undefined') {
        const lm = (window as any).legalModal || legalModal;
        if (lm && typeof lm.submitDsaReport === 'function') {
          lm.submitDsaReport().then(() => {
            if ((window as any).clientStore) (window as any).clientStore.notifySync();
          }).catch(() => {});
        }
      }
    } else if (action === 'submit-dm-message') {
      event.preventDefault();
      const input = el.querySelector('#input-dm-message') as HTMLInputElement | null;
      const submittedDraft = input?.value ?? '';
      const text = submittedDraft.trim();
      const att = sovereignDM.getPendingAttachment();
      if (text || att) {
        const myFP = clientStore.keypair?.fingerprint || 'me_local_node_0x9f4e';
        sovereignDM.sendMessage(text, myFP, att || undefined).then(() => {
          if (getMessageDraft('dm') === submittedDraft && sovereignDM.getPendingAttachment() === att) {
            setMessageDraft('dm', '');
            const currentInput = document.getElementById('input-dm-message') as HTMLInputElement | null;
            if (currentInput) currentInput.value = '';
            sovereignDM.setPendingAttachment(null);
          }
          clientStore.notifySync();
          setTimeout(() => {
            const container = document.getElementById('dm-thread-messages');
            if (container) container.scrollTop = container.scrollHeight;
          }, 50);
        }).catch(error => {
          clientStore.showToast(error instanceof Error ? error.message : 'Private message could not be sent', 'warning');
        });
      }
    } else if (action === 'submit-relay-message') {
      event.preventDefault();
      const input = el.querySelector('#input-message') as HTMLInputElement | null;
      const text = input ? input.value.trim() : '';
      const att = clientStore.pendingRelayAttachment;
      if (text || att) {
        clientStore.sendMessage(text, undefined, att || undefined);
        setMessageDraft('relay', '');
        if (input) {
          input.value = '';
          input.focus();
        }
        clientStore.pendingRelayAttachment = null;
        clientStore.notifySync();
        setTimeout(() => {
          const container = document.getElementById('messages-container');
          if (container) container.scrollTop = container.scrollHeight;
        }, 50);
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
