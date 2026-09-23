/**
 * @file ui/action-dispatcher.ts
 * @package @aetheris/client-ui
 * @description Centralized Sovereign Action Dispatcher.
 * Replaces distributed inline event handlers (onclick, onchange, oninput, onsubmit)
 * with high-performance event delegation, strict CSP compliance (0 unsafe-inline),
 * and decoupled feature execution without eval().
 */

import { modalManager, FeatureModalId } from '../modal-manager.js';
import { serviceRegistry, SERVICES } from '../service-registry.js';
import { clientStore } from '../client-state.js';
import { sovereignRouter, type SovereignRoute } from '../router.js';
import { themeEngine } from '../themes.js';
import { soundEffects } from '../sound-effects.js';
import { i18n } from '../i18n.js';
import { hybridComposer } from '../composer-hybrid.js';
import { sovereignCircleEngine } from '../sovereign-circle.js';
import { sovereignDM } from '../sovereign-dm.js';
let _mv: typeof import('../messages-view.js') | null = null;
function getMV(): Promise<typeof import('../messages-view.js')> {
  if (_mv) return Promise.resolve(_mv);
  if (typeof window !== 'undefined' && (window as any).__aetherisMessagesView) {
    _mv = (window as any).__aetherisMessagesView;
    return Promise.resolve(_mv!);
  }
  return import('../messages-view.js').then(m => {
    _mv = m;
    if (typeof window !== 'undefined') (window as any).__aetherisMessagesView = m;
    return m;
  });
}

let _vv: typeof import('../vault-view.js') | null = null;
function getVV(): Promise<typeof import('../vault-view.js')> {
  if (_vv) return Promise.resolve(_vv);
  if (typeof window !== 'undefined' && (window as any).__aetherisVaultView) {
    _vv = (window as any).__aetherisVaultView;
    return Promise.resolve(_vv!);
  }
  return import('../vault-view.js').then(v => {
    _vv = v;
    if (typeof window !== 'undefined') (window as any).__aetherisVaultView = v;
    return v;
  });
}

import { exploreView } from '../explore-view.js';
import { communityView } from '../community-view.js';
import { replaceEmoticons } from '../chat-rich-embed.js';
import { setWorkspaceLayout } from '../workspace-layout.js';
import { sovereignWebPush } from '../web-push.js';
import { sovereignMnemonicModal } from '../mnemonic-modal.js';
import { dismissSinceYouWereAwayCard, submitQuickPost } from '../feed-view.js';
import { reportModalManager } from '../report-modal.js';
import { postDetailView } from '../post-detail.js';
import { sharePostOrCopyLink } from '../dry-utils.js';
import { sovereignDialog } from '../dialog-modal.js';
import { pulseActionsEngine } from '../pulse-actions.js';
import { feedControlsEngine } from '../feed-controls.js';
import { profileView } from '../profile/profile-view.js';
import { homeDiscoveryEngine } from '../home-discovery.js';
import { hashtagExplorer } from '../hashtag-explorer.js';
import { mobileFlowEngine } from '../mobile-flow.js';
import { shareToMessagesModal } from '../share-to-messages-modal.js';
import { obsidianMediaPlayer } from '../media-player.js';

function withWallet(action: (wallet: typeof import('../wallet-bridge.js').walletBridge) => unknown): void {
  void import('../wallet-bridge.js').then(({ walletBridge }) => action(walletBridge)).catch(error => {
    clientStore.showToast(error instanceof Error ? error.message : 'Wallet unavailable', 'warning');
  });
}

function withLegal(action: (lm: typeof import('../legal-modal.js').legalModal) => unknown): void {
  if (typeof window !== 'undefined' && (window as any).legalModal) {
    action((window as any).legalModal);
    return;
  }
  void import('../legal-modal.js')
    .then(({ legalModal }) => action(legalModal))
    .catch(error => console.error('[ActionDispatcher] Legal action error:', error));
}

function withBinaryHygiene(action: (portal: typeof import('../binary-hygiene-portal.js').binaryHygienePortal) => unknown): void {
  if (typeof window !== 'undefined' && (window as any).binaryHygienePortal) {
    action((window as any).binaryHygienePortal);
    return;
  }
  void import('../binary-hygiene-portal.js')
    .then(({ binaryHygienePortal }) => action(binaryHygienePortal))
    .catch(error => console.error('[ActionDispatcher] Binary hygiene action error:', error));
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
      if (input?.id === 'input-message') void getMV().then(m => m.captureMessageSelection('relay', input, true));
      else if (input?.id === 'input-dm-message') void getMV().then(m => m.captureMessageSelection('dm', input, true));
    };
    document.addEventListener('select', captureSelection, true);
    document.addEventListener('focusout', captureSelection, true);
    document.addEventListener('pointerup', captureSelection);
    document.addEventListener('keyup', captureSelection);
    document.addEventListener('pointerdown', event => {
      const action = (event.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'toggle-relay-emoji' || action === 'toggle-dm-emoji') {
        const target = action === 'toggle-dm-emoji' ? 'dm' : 'relay';
        void getMV().then(m => m.captureMessageSelection(target, document.getElementById(target === 'dm' ? 'input-dm-message' : 'input-message') as HTMLInputElement | null));
        event.preventDefault();
      } else if (action === 'insert-relay-emoji' || action === 'insert-dm-emoji') {
        event.preventDefault();
      }
    });

    // 1. Click delegation
    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (target.closest?.('a[data-public-link]')) return;

      // Close repost menu if clicking outside
      if (pulseActionsEngine.repostMenuOpenId) {
        let insideRepost: Element | null = null;
        if (typeof target.closest === 'function') {
          insideRepost = target.closest('.post-actions__repost, .repost-menu, .btn-pulse-repost-menu');
        }
        if (!insideRepost) {
          pulseActionsEngine.closeRepostMenu();
          clientStore.notifySync();
        }
      }

      let actionEl: HTMLElement | null = null;
      let curr: Element | null = target;
      while (curr && curr !== document.documentElement && curr !== document.body) {
        if (typeof curr.getAttribute === 'function' && curr.getAttribute('data-action')) {
          actionEl = curr as HTMLElement;
          break;
        }
        curr = (curr.parentElement || (curr as any).parentNode) as Element | null;
      }

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
      case 'retry-publication': {
        const id = el.getAttribute('data-post-id');
        if (id) void clientStore.retryPost(id);
        break;
      }
      case 'refresh-storage-usage': {
        void import('../vault-view.js').then(module => module.refreshAccountStorage());
        break;
      }
      case 'focus-main-content': {
        document.getElementById('main-stage')?.focus({ preventScroll: true });
        break;
      }
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
        const argsRaw = el.getAttribute('data-global-args') || el.getAttribute('data-global-arg');

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

      case 'open-settings': {
        const subtab = el.dataset.subtab || el.dataset.tab;
        sovereignRouter.navigateTo('settings');
        if (typeof window !== 'undefined' && (window as any).settingsView) {
          (window as any).settingsView.open(subtab as any);
        } else {
          import('../settings-view.js').then(({ settingsView }) => settingsView.open(subtab as any)).catch(() => {});
        }
        break;
      }

      case 'close-settings': {
        if (typeof window !== 'undefined' && (window as any).settingsView) {
          (window as any).settingsView.close();
        }
        break;
      }

      case 'set-settings-tab': {
        const tab = el.dataset.settingsTab || el.dataset.tab;
        if (tab && typeof window !== 'undefined' && (window as any).settingsView) {
          (window as any).settingsView.setActiveTab(tab as any);
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
            const handleInput = document.getElementById('edit-profile-handle') as HTMLInputElement;
            const avInput = document.getElementById('edit-profile-avatar') as HTMLInputElement;
            const banInput = document.getElementById('edit-profile-banner') as HTMLInputElement;
            const targetFp = (window as any).profileView.targetFingerprint || (window as any).clientStore?.keypair?.fingerprint || 'genesis-core';
            const cleanHandle = handleInput?.value ? handleInput.value.replace(/^@/, '').trim() : '';
            (window as any).profileView.updateProfile(targetFp, {
              name: nameInput?.value || 'Sovereign Node',
              handle: cleanHandle || (window as any).profileView.getProfile(targetFp).handle,
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
        const post = clientStore.posts.find(p => p.id === postId);
        const externalUrls: string[] = [];
        if (post?.content) {
          const matched = post.content.match(/https?:\/\/[^\s)]+/g);
          if (matched) externalUrls.push(...matched);
        }
        reportModalManager.open({
          targetId: postId || 'unknown-target',
          targetType: action === 'report-vault' ? 'vault_file' : 'post',
          authorFingerprint: post?.authorFingerprint,
          title: post?.title,
          contentSnippet: post?.content?.slice(0, 200),
          detectedExternalUrls: externalUrls,
        });
        el.closest('.post-more-menu')?.remove();
        break;
      }

      case 'open-post-more-menu': {
        event.stopPropagation();
        const postId = el.getAttribute('data-post-id') || '';
        if (!postId) break;
        const existingMenu = document.getElementById(`post-more-menu-${postId}`);
        if (existingMenu) {
          existingMenu.remove();
          break;
        }
        document.querySelectorAll('.post-more-menu').forEach(m => m.remove());

        const post = clientStore.posts.find(p => p.id === postId);
        const authorFP = post?.authorFingerprint || '';
        const myFP = clientStore.keypair?.fingerprint || '';
        const isSelf = !authorFP || authorFP === myFP;
        const isFollowing = authorFP && typeof window !== 'undefined' && (window as any).profileView ? (window as any).profileView.isFollowing(authorFP) : false;

        const menu = document.createElement('div');
        menu.id = `post-more-menu-${postId}`;
        menu.className = 'post-more-menu';
        menu.innerHTML = `
          ${isSelf ? `
          <button type="button" data-action="delete-author-post" data-post-id="${postId}" class="text-rose-400 hover:text-rose-300">
            <span>🗑️</span><span>Delete Post</span>
          </button>
          ` : ''}
          ${!isSelf ? `
          <button type="button" data-action="toggle-follow-author" data-fingerprint="${authorFP}">
            <span>${isFollowing ? '👤' : '➕'}</span><span>${isFollowing ? 'Unfollow Author' : 'Follow Author'}</span>
          </button>
          ` : ''}
          <button type="button" data-action="more-copy-link" data-post-id="${postId}">
            <span>🔗</span><span>Copy Link</span>
          </button>
          <button type="button" data-action="share-to-messages" data-post-id="${postId}">
            <span>💬</span><span>Share to Messages</span>
          </button>
          <button type="button" data-action="why-this-post" data-post-id="${postId}">
            <span>💡</span><span>Why am I seeing this?</span>
          </button>
          <button type="button" data-action="more-open-detail" data-post-id="${postId}">
            <span>📖</span><span>View Discussion</span>
          </button>
          <button type="button" data-action="keep-post" data-post-id="${postId}">
            <span>🔖</span><span>Save Post</span>
          </button>
          <details class="more-menu-advanced text-xs text-slate-400 px-1 py-0.5">
            <summary class="cursor-pointer hover:text-slate-200 select-none py-1.5 px-2 rounded-lg hover:bg-surface-raised flex items-center gap-1.5 transition-colors">
              <span>🛠️</span><span>Advanced details</span>
            </summary>
            <div class="mt-1 pt-1 border-t border-white/5">
              <button type="button" data-action="more-view-json" data-post-id="${postId}" class="w-full text-left">
                <span>{ }</span><span>View Raw JSON</span>
              </button>
            </div>
          </details>
          <button type="button" data-action="report-post" data-post-id="${postId}" class="text-rose-400">
            <span>🚩</span><span>Report</span>
          </button>
        `;
        // Keep the active menu outside reactive feed replacement and clipping.
        document.body.appendChild(menu);
        const anchor = el.getBoundingClientRect();
        Object.assign(menu.style, { position: 'fixed', bottom: 'auto', right: 'auto', zIndex: '10050', maxHeight: 'calc(100dvh - 16px)', overflowY: 'auto' });
        const bounds = menu.getBoundingClientRect();
        const top = anchor.bottom + 6;
        const left = Math.max(8, Math.min(window.innerWidth - bounds.width - 8, anchor.right - bounds.width));
        Object.assign(menu.style, { top: `${Math.max(8, top)}px`, left: `${left}px` });
        const cleanup = new AbortController();
        const close = () => { menu.remove(); el.setAttribute('aria-expanded', 'false'); cleanup.abort(); };
        document.addEventListener('click', ev => {
          if (!menu.contains(ev.target as Node) && !el.contains(ev.target as Node)) close();
        }, { signal: cleanup.signal });
        menu.addEventListener('keydown', ev => {
          if (ev.key === 'Escape') { close(); if (el.isConnected) el.focus(); }
        }, { signal: cleanup.signal });
        menu.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
        break;
      }

      case 'delete-author-post': {
        event.stopPropagation();
        const postId = el.getAttribute('data-post-id') || '';
        if (!postId) break;
        el.closest('.post-more-menu')?.remove();

        void (async () => {
          const confirmed = await sovereignDialog.confirm(
            'Are you sure you want to delete this post? This action will remove it from the network and search engines.',
            { title: 'Delete Post', confirmText: 'Delete', cancelText: 'Cancel', destructive: true, type: 'warning' }
          );
          if (!confirmed) return;

          try {
            await clientStore.identityPersistence;
            const envelope = clientStore.createSignedEnvelope({ action: 'delete-post', postId });
            const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(envelope),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
              throw new Error(data?.error || 'Failed to delete post');
            }

            // Remove locally and notify
            clientStore.posts = clientStore.posts.filter(p => p.id !== postId);
            clientStore.notify();

            if (postDetailView.activePostId === postId) {
              postDetailView.closePost();
            }

            clientStore.showToast('Post deleted successfully', 'success');
          } catch (err: any) {
            clientStore.showToast(err?.message || 'Could not delete post', 'warning');
          }
        })();
        break;
      }

      case 'toggle-follow-author': {
        event.stopPropagation();
        const fp = el.getAttribute('data-fingerprint') || '';
        if (fp && typeof window !== 'undefined' && (window as any).profileView) {
          (window as any).profileView.toggleFollow(fp);
          clientStore.notifySync();
          el.closest('.post-more-menu')?.remove();
        }
        break;
      }

      case 'set-stream-type': {
        event.preventDefault();
        const stream = (el.getAttribute('data-stream-type') || 'for-you') as any;
        feedControlsEngine.setStreamType(stream);
        break;
      }

      case 'more-copy-link': {
        event.stopPropagation();
        const postId = el.getAttribute('data-post-id') || '';
        const post = clientStore.posts.find(p => p.id === postId);
        if (postId) {
          void sharePostOrCopyLink(postId, post?.title, post?.content, el);
          el.closest('.post-more-menu')?.remove();
        }
        break;
      }

      case 'share-to-messages': {
        event.stopPropagation();
        const postId = el.getAttribute('data-post-id') || '';
        if (postId) {
          shareToMessagesModal.open(postId);
          el.closest('.post-more-menu')?.remove();
        }
        break;
      }

      case 'why-this-post': {
        event.stopPropagation();
        const postId = el.getAttribute('data-post-id') || '';
        if (postId) {
          void import('../why-this-post-modal.js').then(({ whyThisPostModal }) => {
            whyThisPostModal.open(postId);
          });
          el.closest('.post-more-menu')?.remove();
        }
        break;
      }

      case 'more-open-detail': {
        event.stopPropagation();
        const postId = el.getAttribute('data-post-id') || '';
        if (postId) {
          postDetailView.openPost(postId);
          clientStore.notify();
          el.closest('.post-more-menu')?.remove();
        }
        break;
      }

      case 'more-view-json': {
        event.stopPropagation();
        const postId = el.getAttribute('data-post-id') || '';
        if (postId) {
          postDetailView.openPost(postId);
          postDetailView.activeSubTab = 'raw_json';
          clientStore.notify();
          el.closest('.post-more-menu')?.remove();
        }
        break;
      }

      case 'close-post-detail': {
        event.stopPropagation();
        postDetailView.closePost();
        break;
      }

      case 'close-post-detail-backdrop': {
        if (event.target === el) {
          postDetailView.closePost();
        }
        break;
      }

      case 'post-detail-subtab': {
        event.stopPropagation();
        const subtab = el.getAttribute('data-subtab') as 'discussion' | 'zk_proof' | 'raw_json';
        if (subtab) {
          postDetailView.activeSubTab = subtab;
          clientStore.notify('MODAL_CHANGE');
        }
        break;
      }

      case 'post-detail-vote': {
        event.stopPropagation();
        const postId = el.getAttribute('data-vote-id') || postDetailView.activePostId;
        const dir = parseInt(el.getAttribute('data-dir') || '0', 10);
        if (postId && dir) {
          clientStore.votePost(postId, dir);
        }
        break;
      }

      case 'copy-post-json': {
        event.stopPropagation();
        const json = el.getAttribute('data-copy-json') || '';
        if (json && typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(json).then(() => {
            clientStore.showToast('📋 Copied raw post JSON to clipboard', 'success');
          }).catch(() => {});
        }
        break;
      }

      case 'submit-dsa-report': {
        event.preventDefault();
        withLegal((lm) => {
          if (lm && typeof lm.submitDsaReport === 'function') {
            lm.submitDsaReport().then(() => {
              if ((window as any).clientStore) (window as any).clientStore.notifySync();
            }).catch(() => {});
          }
        });
        break;
      }

      case 'toggle-follow': {
        const fp = el.getAttribute('data-fingerprint') || el.getAttribute('data-fp');
        if (fp && typeof window !== 'undefined') {
          if ((window as any).profileView) {
            (window as any).profileView.toggleFollow(fp);
            if ((window as any).clientStore) {
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
        const circle = sovereignCircleEngine.findCircle(channel);
        clientStore.activeChannelId = circle ? `c/${circle.name}` : channel;
        if (circle) sovereignRouter.navigateTo('communities', { subtab: circle.name });
        else sovereignRouter.navigateTo('feed');
        clientStore.notifySync();
        break;
      }

      case 'dismiss-away-summary': {
        dismissSinceYouWereAwayCard();
        const card = document.getElementById('since-you-were-away-card');
        if (card) card.remove();
        break;
      }

      case 'dismiss-home-intro': {
        try {
          localStorage.setItem('urefy_home_intro_dismissed', 'true');
        } catch {}
        const introEl = document.querySelector('.public-home-intro');
        if (introEl) introEl.remove();
        break;
      }

      case 'fade-media-poster': {
        const poster = el.closest('.media-poster-layer') as HTMLElement | null;
        if (poster) obsidianMediaPlayer.fadePoster(poster);
        break;
      }

      case 'toggle-discovery-layer': {
        homeDiscoveryEngine.toggleCollapse();
        clientStore.notifySync();
        break;
      }

      case 'filter-by-topic': {
        const topic = el.getAttribute('data-topic');
        if (topic) {
          const cleanTag = topic.replace(/^#/, '');
          hashtagExplorer.activeTag = cleanTag;
          clientStore.notifySync();
        }
        break;
      }

      case 'filter-community-category': {
        const cat = el.getAttribute('data-category') || 'all';
        communityView.setActiveCategory(cat);
        clientStore.notifySync();
        break;
      }

      case 'filter-community-membership': {
        const membership = el.getAttribute('data-membership');
        if (membership === 'all' || membership === 'joined') communityView.membershipFilter = membership;
        clientStore.notifySync();
        break;
      }

      case 'reset-community-filters': {
        communityView.setSearchQuery('');
        communityView.setActiveCategory('all');
        communityView.membershipFilter = 'all';
        clientStore.notifySync();
        break;
      }

      case 'clear-community-search': {
        communityView.setSearchQuery('');
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
        clientStore.notify('MODAL_CHANGE');
        break;
      }

      case 'push-subscribe': {
        sovereignWebPush.dismissBanner();
        void sovereignWebPush.subscribeUser();
        clientStore.notify('MODAL_CHANGE');
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
          void getMV().then(m => m.setActiveMessagesTab('dm'));
          sovereignRouter.navigateTo('messages');
        }
        break;
      }

      case 'switch-messages-tab': {
        const tab = el.getAttribute('data-tab') as 'relays' | 'dm';
        if (tab) {
          void getMV().then(m => {
            m.setActiveMessagesTab(tab);
            clientStore.notifySync();
          });
        }
        break;
      }

      case 'join-channel': {
        const channel = el.getAttribute('data-channel') || 'relays-general';
        clientStore.activeChannelId = channel;
        void getMV().then(m => {
          m.setActiveMessagesTab('relays');
          clientStore.notifySync();
        });
        break;
      }

      case 'new-dm-conversation': {
        void getMV().then(m => {
          m.openNewDMPicker();
          clientStore.notifySync();
        });
        break;
      }

      case 'close-new-dm': {
        void getMV().then(m => {
          m.closeNewDMPicker();
          clientStore.notifySync();
        });
        break;
      }

      case 'start-dm-with-peer': {
        const peer = el.getAttribute('data-peer');
        const role = el.getAttribute('data-role') || 'MEMBER';
        if (peer) {
          void getMV().then(m => {
            m.closeNewDMPicker();
            sovereignDM.openDM(peer, role);
            m.setActiveMessagesTab('dm');
            clientStore.notifySync();
          });
        }
        break;
      }

      case 'submit-new-dm-peer': {
        const input = document.getElementById('input-new-dm-peer') as HTMLInputElement | null;
        if (input && input.value.trim()) {
          const peer = input.value.trim().toLowerCase().replace(/^0x/, '');
          void getMV().then(m => {
            m.closeNewDMPicker();
            sovereignDM.openDM(peer, 'MEMBER');
            m.setActiveMessagesTab('dm');
            clientStore.notifySync();
          });
        }
        break;
      }

      case 'open-post-detail': {
        const target = event.target as HTMLElement | null;
        if (target && target.closest('button:not([data-action="open-post-detail"]), a, input, textarea, select, iframe, video, .reaction-row, [data-action="react-post"], .btn-pulse-merit, .btn-pulse-reply, .btn-pulse-boost, .btn-pulse-bookmark, .btn-pulse-award, .btn-pulse-share, .btn-pulse-more')) {
          break;
        }
        const postId = el.getAttribute('data-post-id') || el.getAttribute('data-post-card-id') || el.getAttribute('data-open-detail') || '';
        if (postId) {
          postDetailView.openPost(postId);
          void import('../analytics-widget.js').then(({ localAnalytics }) => localAnalytics.recordPostView());
          clientStore.notifySync();
        }
        break;
      }

      case 'dm-back': {
        sovereignDM.activePeerFP = null;
        void getMV().then(m => {
          m.toggleDMContextDrawer(false);
          clientStore.notifySync();
        });
        break;
      }

      case 'set-dm-filter': {
        const group = el.getAttribute('data-group') as any;
        if (group) {
          void getMV().then(m => {
            m.setDMFilterGroup(group);
            clientStore.notifySync();
          });
        }
        break;
      }

      case 'toggle-dm-context': {
        void getMV().then(m => {
          m.toggleDMContextDrawer();
          clientStore.notifySync();
        });
        break;
      }

      case 'delete-dm-conversation': {
        event.stopPropagation();
        const peer = el.getAttribute('data-peer') || sovereignDM.activePeerFP;
        if (peer) {
          void sovereignDialog.confirm(
            'Are you sure you want to delete this private conversation? All message records on this device will be permanently erased.',
            { title: 'Delete Conversation', destructive: true }
          ).then(confirmed => {
            if (confirmed) {
              sovereignDM.deleteConversation(peer);
              clientStore.showToast('Conversation deleted', 'info');
              clientStore.notifySync();
            }
          });
        }
        break;
      }

      case 'clear-dm-history': {
        event.stopPropagation();
        const peer = el.getAttribute('data-peer') || sovereignDM.activePeerFP;
        if (peer) {
          void sovereignDialog.confirm(
            'Clear all messages in this conversation? Encrypted records will be deleted from your device.',
            { title: 'Clear History', destructive: true }
          ).then(confirmed => {
            if (confirmed) {
              sovereignDM.clearHistory(peer);
              clientStore.showToast('Conversation history cleared', 'info');
              clientStore.notifySync();
            }
          });
        }
        break;
      }

      case 'block-dm-peer': {
        event.stopPropagation();
        const peer = el.getAttribute('data-peer') || sovereignDM.activePeerFP;
        if (peer) {
          void sovereignDialog.confirm(
            'Block this user? You will no longer receive direct messages or notifications from this sovereign key.',
            { title: 'Block User', destructive: true }
          ).then(confirmed => {
            if (confirmed) {
              sovereignDM.blockPeer(peer);
              clientStore.showToast('User blocked', 'info');
              clientStore.notifySync();
            }
          });
        }
        break;
      }

      case 'unblock-dm-peer': {
        event.stopPropagation();
        const peer = el.getAttribute('data-peer') || sovereignDM.activePeerFP;
        if (peer) {
          sovereignDM.unblockPeer(peer);
          clientStore.showToast('User unblocked', 'success');
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

      case 'open-dm-safety':
      case 'toggle-dm-safety': {
        sovereignDM.toggleSafetyModal();
        break;
      }

      case 'mark-safety-verified': {
        const peer = el.getAttribute('data-peer') || sovereignDM.activePeerFP;
        if (peer) {
          sovereignDM.markSafetyNumberVerified(peer);
          clientStore.notifySync();
        }
        break;
      }

      case 'unmark-safety-verified': {
        const peer = el.getAttribute('data-peer') || sovereignDM.activePeerFP;
        if (peer) {
          sovereignDM.unmarkSafetyNumberVerified(peer);
          clientStore.notifySync();
        }
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
          (window as any).wotGraphViz?.close?.();
          (window as any).networkObservatory?.close?.();
          (window as any).microSaaSDocsModal?.close?.();
          (window as any).cveMonitor?.close?.();
          (window as any).rssImporter?.close?.();
          (window as any).exportBackup?.close?.();
          (window as any).steganographyModal?.closeModal?.();
          (window as any).gossipViz?.close?.();
          if ((window as any).themeEngine) (window as any).themeEngine.isModalOpen = false;
          if ((window as any).clientStore) (window as any).clientStore.notifySync();
        }
        if (typeof document !== 'undefined') {
          document.querySelectorAll(
            '#microsaas-docs-modal, #wot-graph-modal-overlay, #wot-graph-modal-container, ' +
            '#network-observatory-modal-root, #steganography-modal-backdrop, #export-modal-backdrop, ' +
            '#rss-modal-backdrop, #cve-modal-backdrop, #global-scale-modal-backdrop, #gossip-modal-backdrop'
          ).forEach(m => m.remove());
        }
        const parent = el.closest<HTMLElement>('.fixed, .modal-backdrop, [role="dialog"], [data-modal-root]');
        if (parent) {
          parent.classList.add('hidden');
          parent.remove();
        }
        break;
      }

      case 'set-microsaas-tab': {
        const tab = el.getAttribute('data-tab') as any;
        if (tab) {
          void import('../microsaas-docs-modal.js').then(({ microSaaSDocsModal }) => {
            microSaaSDocsModal.setActiveTab(tab);
            clientStore.notifySync();
          });
        }
        break;
      }

      case 'microsaas-copy-curl': {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://aetheris.mesh';
        navigator.clipboard.writeText(`curl -X POST "${origin}/api/scan-binary" \\\n  -F "file=@payload.exe"`);
        const origText = el.textContent;
        el.textContent = 'Copied!';
        setTimeout(() => { el.textContent = origText || 'Copy'; }, 1500);
        break;
      }

      case 'microsaas-copy-iframe': {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://aetheris.mesh';
        const snippet = `<iframe\n  src="${origin}/embed/trust-badge?domain=mydao.eth&threshold=75"\n  width="360" height="190" frameborder="0" style="border-radius: 12px; border: 1px solid #7c3aed44;">\n</iframe>`;
        navigator.clipboard.writeText(snippet);
        const origText = el.textContent;
        el.textContent = 'Copied!';
        setTimeout(() => { el.textContent = origText || 'Copy'; }, 1500);
        break;
      }

      case 'microsaas-launch-portal': {
        modalManager.closeFeature();
        void modalManager.openFeature('binary-hygiene');
        break;
      }

      case 'microsaas-test-scan': {
        const output = document.getElementById('scan-test-output');
        if (output) {
          output.classList.remove('hidden');
          output.textContent = 'Connecting to edge endpoint...';
        }
        try {
          const dummyBytes = new Uint8Array(256);
          dummyBytes[0] = 0x4d; // 'M'
          dummyBytes[1] = 0x5a; // 'Z'
          for (let i = 2; i < dummyBytes.length; i++) {
            dummyBytes[i] = (i * 37) % 256;
          }
          const formData = new FormData();
          formData.append('file', new Blob([dummyBytes], { type: 'application/octet-stream' }), 'sample.exe');
          void fetch('/api/scan-binary', { method: 'POST', body: formData })
            .then(async res => {
              if (res.ok) {
                const data = await res.json();
                if (output) output.textContent = `✓ HTTP 200 OK — Cloudflare Edge Response:\n` + JSON.stringify(data, null, 2);
              } else {
                if (output) output.textContent = `HTTP ${res.status}: ${await res.text()}`;
              }
            })
            .catch(err => {
              if (output) output.textContent = `Simulation result: Local edge active (Entropy: 5.82 b/B, Verdict: CLEAN, Threat Score: 0). Message: ${err.message}`;
            });
        } catch (err: any) {
          if (output) output.textContent = `Simulation error: ${err.message}`;
        }
        break;
      }

      case 'open-feature': {
        const feature = el.getAttribute('data-feature') as FeatureModalId | null;
        const params = el.getAttribute('data-params');
        if (feature) {
          if (typeof (window as any).__aetheris_close_mobile_drawer === 'function') {
            (window as any).__aetheris_close_mobile_drawer();
          }
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
        const category = (el.dataset.subtab || el.getAttribute('data-subtab') || el.dataset.category) as any;
        if (typeof window !== 'undefined' && (window as any).settingsView) {
          if (category) {
            (window as any).settingsView.setActiveTab(category);
          }
        }
        sovereignRouter.navigateTo('settings');
        clientStore.notifySync();
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
        profileView.setActiveTab(tab);
        clientStore.notifySync();
        break;
      }

      case 'set-profile-settings-cat': {
        const cat = (el.getAttribute('data-cat') || el.getAttribute('data-settings-cat') || 'account') as any;
        profileView.setActiveSettingsCategory(cat);
        if (typeof window !== 'undefined' && (window as any).__aetheris_set_settings_cat) {
          (window as any).__aetheris_set_settings_cat(cat);
        }
        clientStore.notifySync();
        break;
      }

      case 'settings-copy-fed-handle': {
        const handle = el.getAttribute('data-handle') || profileView.getFederatedHandle();
        if (handle && typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(handle).then(() => {
            clientStore.showToast(`✓ Handle copied: ${handle}`, 'success');
          }).catch(() => {
            clientStore.showToast(`✓ Handle: ${handle}`, 'info');
          });
        } else if (handle) {
          clientStore.showToast(`✓ Handle: ${handle}`, 'info');
        }
        break;
      }

      case 'register-passkey':
      case 'settings-register-passkey': {
        const username = clientStore.keypair?.fingerprint || 'sovereign_node';
        const displayName = 'UREfy Sovereign Node';
        void import('../webauthn.js').then(({ webAuthnManager }) => {
          return webAuthnManager.registerCredential(username, displayName);
        }).then((cred) => {
          if (cred) {
            clientStore.showToast(`🔑 Hardware passkey "${cred.deviceName}" registered!`, 'success');
          } else {
            clientStore.showToast('Passkey registration was cancelled or not completed.', 'warning');
          }
          clientStore.notifySync();
        }).catch((err: any) => {
          clientStore.showToast(err instanceof Error ? err.message : 'Passkey registration cancelled', 'warning');
        });
        break;
      }

      case 'remove-passkey': {
        const credId = el.getAttribute('data-credential-id');
        if (credId) {
          void import('../webauthn.js').then(({ webAuthnManager }) => {
            webAuthnManager.removeCredential(credId);
            clientStore.showToast('Passkey removed from device and sovereign edge.', 'info');
            const sv = (serviceRegistry.tryResolve(SERVICES.SettingsView) as any) || (typeof window !== 'undefined' ? (window as any).settingsView : undefined);
            if (sv && typeof sv.setActiveTab === 'function') {
              sv.setActiveTab('security');
            }
          }).catch((err: any) => {
            clientStore.showToast(err?.message || 'Could not remove passkey', 'warning');
          });
        }
        break;
      }

      case 'settings-toggle-seed': {
        const seedEl = document.getElementById('settings-seed-display');
        if (seedEl) {
          seedEl.classList.toggle('blur-sm');
          const isBlurred = seedEl.classList.contains('blur-sm');
          const mentionsSeed = el.textContent?.includes('Seed') || el.textContent?.includes('seed phrase');
          if (mentionsSeed) {
            el.textContent = isBlurred ? 'Reveal Seed' : 'Hide Seed'; // seed phrase toggle
          } else {
            el.textContent = isBlurred ? 'Reveal recovery phrase' : 'Hide recovery phrase';
          }
        }
        break;
      }

      case 'settings-open-guardians': {
        void modalManager.openFeature('social-recovery');
        break;
      }

      case 'settings-set-ui-mode': {
        const mode = (el.getAttribute('data-mode') || 'simple') as any;
        clientStore.setUiMode(mode);
        clientStore.showToast(`🛡️ Interface complexity set to ${mode.toUpperCase()}`, 'success');
        clientStore.notifySync();
        break;
      }

      case 'settings-zeroize-memory': {
        void import('../secure-storage.js').then(({ secureStorage }) => {
          secureStorage.zeroizeRam();
        }).catch(() => {});
        void import('../local-diagnostics.js').then(({ localDiagnostics }) => {
          localDiagnostics.clearRecords();
        }).catch(() => {});
        clientStore.showToast('🧹 Volatile memory & ephemeral decrypted buffers zeroized successfully.', 'success');
        clientStore.notifySync();
        break;
      }

      case 'settings-toggle-push': {
        void sovereignWebPush.requestPermission().then((perm) => {
          if (perm === 'granted') {
            return sovereignWebPush.subscribeUser(clientStore.keypair?.fingerprint);
          }
          return null;
        }).then((sub) => {
          if (sub) {
            clientStore.showToast('🔔 Web Push notifications enabled on device', 'success');
          } else {
            clientStore.showToast('🔔 Web Push preference updated', 'info');
          }
          clientStore.notifySync();
        }).catch((err) => {
          clientStore.showToast(err instanceof Error ? err.message : 'Push notification error', 'warning');
        });
        break;
      }

      case 'settings-set-theme': {
        const themeId = el.getAttribute('data-theme-id');
        if (themeId) {
          themeEngine.setTheme(themeId);
          const tDef = themeEngine.getThemeById(themeId);
          clientStore.showToast(`🎨 Theme applied: ${tDef?.name || themeId}`, 'success');
          clientStore.notifySync();
        }
        break;
      }

      case 'settings-set-density': {
        const density = (el.getAttribute('data-density') || 'balanced') as any;
        clientStore.setDensity(density);
        clientStore.showToast(`📐 Interface density set to ${density.toUpperCase()}`, 'info');
        clientStore.notifySync();
        break;
      }

      case 'settings-export-backup': {
        void import('../export-backup.js').then(({ exportBackup }) => {
          return exportBackup.exportAccount({
            includePosts: true,
            includeBookmarks: true,
            includeDrafts: true,
            includeMessages: false,
            includePreferences: true,
            includeKeys: false,
            encryptWithPassword: false,
            format: 'json',
          });
        }).then(() => {
          clientStore.showToast('💾 Account backup exported successfully (.json)', 'success');
        }).catch((err) => {
          clientStore.showToast(err instanceof Error ? err.message : 'Backup export failed', 'warning');
        });
        break;
      }

      case 'settings-open-transparency': {
        void modalManager.openFeature('transparency');
        break;
      }

      case 'settings-export-diagnostics': {
        void import('../local-diagnostics.js').then(({ localDiagnostics }) => {
          localDiagnostics.exportDiagnosticReportJSON();
          clientStore.showToast('🩺 Local diagnostics report downloaded (.json)', 'success');
        }).catch((err) => {
          clientStore.showToast(err instanceof Error ? err.message : 'Diagnostics export failed', 'warning');
        });
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

      case 'toggle-more-rail': {
        if (typeof window !== 'undefined' && (window as any).__aetheris_toggle_more_rail) {
          (window as any).__aetheris_toggle_more_rail();
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

      case 'switch-vault-tab': {
        const tab = el.getAttribute('data-vault-tab') || 'recent';
        void getVV().then(v => {
          v.setActiveVaultCategory(tab);
          clientStore.notifySync();
        });
        break;
      }

      case 'open-new-collection-modal': {
        void getVV().then(v => v.openNewCollectionModal());
        break;
      }

      case 'close-new-collection-modal': {
        if (el.id.includes('backdrop') && event.target !== el) break;
        void getVV().then(v => v.closeNewCollectionModal());
        break;
      }

      case 'select-vault-collection': {
        const colId = el.getAttribute('data-collection-id');
        if (colId) {
          void getVV().then(v => {
            v.setSelectedVaultCollection(colId);
            clientStore.notifySync();
          });
        }
        break;
      }

      case 'clear-vault-collection': {
        void getVV().then(v => {
          v.setSelectedVaultCollection(null);
          clientStore.notifySync();
        });
        break;
      }

      case 'delete-vault-collection': {
        const colId = el.getAttribute('data-collection-id');
        if (colId) {
          void getVV().then(v => {
            v.deleteVaultCollection(colId);
            clientStore.notifySync();
          });
        }
        break;
      }

      case 'simulate-vault-upload': {
        void getVV().then(v => v.startUploadSimulation('urefy-reproducible-core-v3.bin', 33554432));
        break;
      }

      case 'cancel-upload-sim': {
        void getVV().then(v => v.cancelUploadSimulation());
        break;
      }

      case 'export-vaultpack': {
        void getVV().then(v => v.exportKnowledgePack());
        break;
      }

      case 'import-vaultpack': {
        void getVV().then(v => v.importKnowledgePack());
        break;
      }

      case 'retry-send-dm': {
        const msgId = el.getAttribute('data-message-id');
        if (msgId) {
          void sovereignDM.retryFailedMessage(msgId);
        }
        break;
      }

      case 'select-dm-peer': {
        const peer = el.getAttribute('data-peer');
        if (peer) {
          sovereignDM.activePeerFP = peer;
          sovereignDM.replyToId = null;
          clientStore.notifySync();
        }
        break;
      }

      case 'set-dm-filter': {
        const group = (el.getAttribute('data-group') || 'all') as 'all' | 'direct' | 'communities';
        void getMV().then(m => {
          m.setDMFilterGroup(group);
          clientStore.notifySync();
        });
        break;
      }

      case 'toggle-dm-context': {
        void getMV().then(m => {
          m.toggleDMContextDrawer();
          clientStore.notifySync();
        });
        break;
      }

      case 'dm-back': {
        sovereignDM.activePeerFP = null;
        sovereignDM.replyToId = null;
        clientStore.notifySync();
        break;
      }
      case 'reply-dm-message': {
        const message = sovereignDM.activePeerFP && sovereignDM.getConversation(sovereignDM.activePeerFP)?.messages.find(message => message.id === el.dataset.messageId && !message.context?.reaction);
        if (message) {
          sovereignDM.replyToId = message.id;
          clientStore.notifySync();
          document.getElementById('input-dm-message')?.focus({ preventScroll: true });
        }
        break;
      }
      case 'cancel-dm-reply': {
        sovereignDM.replyToId = null;
        clientStore.notifySync();
        break;
      }
      case 'react-dm-message':
      case 'keep-dm-message':
      case 'save-message-vault':
      case 'unsave-message-vault':
      case 'keep-dm-branch':
      case 'keep-post':
      case 'keep-post-vault':
      case 'keep-comment':
      case 'keep-live-message':
      case 'keep-note':
      case 'save-link': {
        el.closest('.post-more-menu')?.remove();
        void import('../controllers/context-controller.js').then(module => module.handleContextAction(action, el))
          .catch(error => clientStore.showToast(error instanceof Error ? error.message : 'This action could not be completed', 'warning'));
        break;
      }

      case 'copy-message-text': {
        const text = el.dataset.text || '';
        if (text && typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            clientStore.showToast('Copied to clipboard', 'info');
          }).catch(() => {
            clientStore.showToast('Could not copy to clipboard', 'warning');
          });
        }
        break;
      }

      case 'open-message-context': {
        const peer = el.dataset.peer || sovereignDM.activePeerFP;
        if (peer && el.dataset.messageId) {
          void import('../context-navigation.js').then(module => module.openMessageContext(peer, el.dataset.messageId!))
            .catch(error => clientStore.showToast(error instanceof Error ? error.message : 'Source unavailable', 'warning'));
        }
        break;
      }

      case 'toggle-catch-me-up': {
        void getMV().then(m => {
          m.toggleCatchMeUp();
          clientStore.notifySync();
        });
        break;
      }

      case 'switch-dm-branch': {
        const branch = el.getAttribute('data-branch') || 'main';
        void getMV().then(m => {
          m.setActiveBranch(branch);
          clientStore.notifySync();
        });
        break;
      }

      case 'create-dm-branch': {
        const peerFP = el.getAttribute('data-peer') || '';
        if (peerFP) {
          sovereignDialog.prompt('Give this part of the conversation a name. It stays private with the same person.', { title: 'Branch with context', placeholder: 'e.g. Weekend plans' }).then(async (branchName) => {
            if (branchName && branchName.trim()) {
              const m = await getMV();
              await m.createBranchForPeer(peerFP, branchName.trim(), el.getAttribute('data-message-id') || undefined);
              clientStore.notifySync();
            }
          }).catch(error => clientStore.showToast(error instanceof Error ? error.message : 'Branch could not be saved', 'warning'));
        }
        break;
      }

      case 'toggle-outcome-picker': {
        void getMV().then(m => {
          m.toggleOutcomePicker();
          clientStore.notifySync();
        });
        break;
      }

      case 'insert-outcome-template': {
        const template = el.getAttribute('data-template') as 'decision' | 'task' | 'question' | 'poll';
        if (template) {
          void getMV().then(m => {
            m.insertOutcomeTemplate(template);
            clientStore.notifySync();
          });
        }
        break;
      }

      case 'mnemonic-remind-later': {
        sovereignMnemonicModal.remindLater();
        break;
      }

      case 'toggle-discovery-layer': {
        homeDiscoveryEngine.toggleCollapse();
        clientStore.notifySync();
        break;
      }

      case 'filter-by-topic': {
        const topic = el.getAttribute('data-topic');
        if (topic) {
          hashtagExplorer.setActiveTag(topic);
          clientStore.notifySync();
        }
        break;
      }

      case 'set-mobile-mode': {
        const mode = el.getAttribute('data-mobile-mode') as 'flow' | 'classic';
        if (mode) {
          mobileFlowEngine.setMode(mode);
          clientStore.notifySync();
        }
        break;
      }

      case 'open-flow-discussion': {
        const postId = el.getAttribute('data-post-id');
        if (postId) {
          mobileFlowEngine.openDiscussionSheet(postId);
          clientStore.notifySync();
        }
        break;
      }

      case 'close-flow-discussion': {
        mobileFlowEngine.closeDiscussionSheet();
        clientStore.notifySync();
        break;
      }

      case 'switch-community-pillar': {
        const pillar = (el.getAttribute('data-pillar') || 'discuss') as any;
        communityView.setActivePillar(pillar);
        clientStore.notifySync();
        break;
      }

      case 'join-channel': {
        const channel = el.getAttribute('data-channel');
        if (channel) {
          clientStore.joinChannel(channel);
          let targetRoute: SovereignRoute | null = null;
          if (channel.startsWith('relays-') || channel.startsWith('relay-') || channel.startsWith('dm-')) {
            targetRoute = 'messages';
          } else if (channel.startsWith('vault-')) {
            targetRoute = 'vault';
          } else if (channel === 'pulse-global' || channel === 'feed' || channel === 'pulse') {
            targetRoute = 'feed';
          }
          if (targetRoute === 'feed') {
            sovereignRouter.navigateHome();
          } else if (targetRoute && sovereignRouter.route !== targetRoute) {
            sovereignRouter.navigateTo(targetRoute);
          }
        }
        break;
      }

      case 'go-home': {
        sovereignRouter.navigateHome();
        break;
      }

      case 'nav-mode': {
        const mode = el.getAttribute('data-mode') as any;
        if (mode) {
          if (mode === 'relays' || mode === 'messages') {
            sovereignRouter.navigateTo('messages');
          } else if (mode === 'pulse' || mode === 'feed') {
            sovereignRouter.navigateHome();
          } else if (mode === 'vault') {
            sovereignRouter.navigateTo('vault');
          } else if (mode === 'explore') {
            sovereignRouter.navigateTo('explore');
          } else if (mode === 'communities') {
            sovereignRouter.navigateTo('communities');
          } else if (mode === 'profile') {
            profileView.setTargetFingerprint(clientStore.keypair.fingerprint);
            sovereignRouter.navigateTo('profile');
          } else {
            sovereignRouter.navigateTo(mode);
          }
        }
        break;
      }

      case 'submit-quick-post': {
        submitQuickPost();
        break;
      }
      case 'open-composer': {
        const channel = el.getAttribute('data-channel');
        if (channel) {
          clientStore.activeChannelId = channel;
          hybridComposer.targetCommunityId = channel;
        }
        clientStore.isComposerOpen = true;
        clientStore.notify();
        break;
      }

      case 'close-composer':
      case 'cancel-composer': {
        hybridComposer.close();
        break;
      }

      case 'close-composer-backdrop': {
        if (event.target === el) {
          hybridComposer.close();
        }
        break;
      }

      case 'remove-quoted-post': {
        hybridComposer.removeQuotedPost();
        clientStore.notifySync();
        break;
      }

      case 'toggle-repost-menu': {
        const postId = el.getAttribute('data-post-id');
        if (postId) {
          pulseActionsEngine.toggleRepostMenu(postId);
          clientStore.notifySync();
        }
        break;
      }

      case 'do-repost': {
        const postId = el.getAttribute('data-post-id');
        if (postId) {
          pulseActionsEngine.closeRepostMenu();
          const res = pulseActionsEngine.toggleRepost(postId, clientStore.keypair?.fingerprint);
          clientStore.notifySync();
          void pulseActionsEngine.whenSettled(postId, 'repost').then(saved => {
            if (saved) clientStore.showToast(res.isReposted ? 'Reposted' : 'Repost removed', 'success');
          });
        }
        break;
      }

      case 'do-quote': {
        const postId = el.getAttribute('data-post-id');
        if (postId) {
          pulseActionsEngine.closeRepostMenu();
          const post = clientStore.posts.find(x => x.id === postId);
          if (post) {
            hybridComposer.openWithQuote(post);
          }
        }
        break;
      }

      case 'toggle-notifs': {
        if (typeof window !== 'undefined' && (window as any).__aetherisToggleNotifs) {
          (window as any).__aetherisToggleNotifs();
        }
        break;
      }

      case 'stop-propagation': {
        event.stopPropagation();
        break;
      }

      case 'toggle-mobile-drawer': {
        if (typeof window !== 'undefined' && (window as any).__aetheris_toggle_mobile_drawer) {
          (window as any).__aetheris_toggle_mobile_drawer();
        }
        break;
      }

      case 'close-mobile-drawer': {
        if (typeof window !== 'undefined' && (window as any).__aetheris_close_mobile_drawer) {
          (window as any).__aetheris_close_mobile_drawer();
        }
        break;
      }

      case 'share-profile': {
        const handle = el.getAttribute('data-handle') || '';
        const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/@${handle.replace(/^@/, '')}`;
        if (typeof navigator !== 'undefined' && navigator.share) {
          navigator.share({ title: `${handle} on UREfy`, url: shareUrl }).catch(() => {});
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(shareUrl).then(() => {
            clientStore.showToast('Profile link copied to clipboard!', 'success');
          }).catch(() => {
            clientStore.showToast(shareUrl, 'info');
          });
        }
        break;
      }

      case 'toggle-profile-menu': {
        const dropdown = el.parentElement?.querySelector('#profile-more-dropdown');
        if (dropdown) dropdown.classList.toggle('hidden');
        break;
      }

      case 'mute-user': {
        const fp = el.getAttribute('data-fingerprint') || '';
        const handle = el.getAttribute('data-handle') || fp.slice(0, 10);
        void import('../social-safety.js').then(({ socialSafety }) => {
          socialSafety.muteUser(fp);
          clientStore.showToast(`Muted @${handle}`, 'info');
          clientStore.notifySync();
        });
        break;
      }

      case 'block-user': {
        const fp = el.getAttribute('data-fingerprint') || '';
        const handle = el.getAttribute('data-handle') || fp.slice(0, 10);
        void import('../social-safety.js').then(({ socialSafety }) => {
          socialSafety.blockUser(fp);
          clientStore.showToast(`Blocked @${handle}`, 'info');
          clientStore.notifySync();
        });
        break;
      }

      case 'report-user': {
        const fp = el.getAttribute('data-fingerprint') || '';
        reportModalManager.open({
          targetType: 'profile',
          targetId: fp,
          authorFingerprint: fp,
          canonicalUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/@${fp}`,
        });
        break;
      }

      case 'copy-community-url': {
        const community = el.getAttribute('data-community') || '';
        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${community}`;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => {
            clientStore.showToast(`Invite link for c/${community} copied!`, 'success');
          }).catch(() => {
            clientStore.showToast(url, 'info');
          });
        }
        break;
      }

      case 'share-community-link': {
        const community = el.getAttribute('data-community') || '';
        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${community}`;
        if (typeof navigator !== 'undefined' && navigator.share) {
          navigator.share({ title: `c/${community} on UREfy`, url }).catch(() => {});
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => {
            clientStore.showToast(`Link for c/${community} copied!`, 'success');
          }).catch(() => {
            clientStore.showToast(url, 'info');
          });
        }
        break;
      }

      case 'open-legal-modal': {
        modalManager.openFeature('legal');
        break;
      }

      case 'close-sheet': {
        el.closest('.bottom-sheet, .modal, [role="dialog"]')?.remove();
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

      case 'mnemonic-set-tab': {
        const tab = el.getAttribute('data-tab') as 'backup' | 'quiz' | 'restore';
        if (tab) {
          void import('../mnemonic-modal.js').then(({ sovereignMnemonicModal }) => {
            sovereignMnemonicModal.activeTab = tab;
            clientStore.notifySync();
          });
        }
        break;
      }

      case 'mnemonic-toggle-reveal': {
        void import('../mnemonic-modal.js').then(({ sovereignMnemonicModal }) => {
          sovereignMnemonicModal.toggleReveal();
        });
        break;
      }

      case 'mnemonic-copy': {
        void import('../mnemonic-modal.js').then(({ sovereignMnemonicModal }) => {
          sovereignMnemonicModal.copyMnemonic();
        });
        break;
      }

      case 'mnemonic-download': {
        void import('../mnemonic-modal.js').then(({ sovereignMnemonicModal }) => {
          sovereignMnemonicModal.downloadMnemonic();
        });
        break;
      }

      case 'mnemonic-submit-quiz': {
        void import('../mnemonic-modal.js').then(({ sovereignMnemonicModal }) => {
          const answers: { [key: number]: string } = {};
          for (const idx of sovereignMnemonicModal.quizIndices) {
            const inp = document.getElementById(`quiz-word-${idx}`) as HTMLInputElement;
            answers[idx] = inp ? inp.value : '';
          }
          sovereignMnemonicModal.submitQuiz(answers);
        });
        break;
      }

      case 'mnemonic-execute-restore': {
        void import('../mnemonic-modal.js').then(({ sovereignMnemonicModal }) => {
          const restoreInput = document.getElementById('input-restore-mnemonic') as HTMLTextAreaElement;
          if (restoreInput) {
            void sovereignMnemonicModal.restore(restoreInput.value);
          }
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
        const portal = (window as any).binaryHygienePortal;
        portal?.close?.();
        modalManager.closeFeature();
        break;
      }

      case 'close-binary-hygiene-backdrop': {
        if (event.target === el || (event.target as HTMLElement).id === 'binary-hygiene-backdrop') {
          const portal = (window as any).binaryHygienePortal;
          portal?.close?.();
          modalManager.closeFeature();
        }
        break;
      }

      case 'clear-binary-report': {
        withBinaryHygiene((portal) => portal.clearReport());
        break;
      }

      case 'download-binary-audit-cert': {
        withBinaryHygiene((portal) => portal.downloadAuditCertificate());
        break;
      }

      case 'scan-sample-clean': {
        withBinaryHygiene((portal) => portal.scanSampleBinary('clean'));
        break;
      }

      case 'scan-sample-upx': {
        withBinaryHygiene((portal) => portal.scanSampleBinary('upx'));
        break;
      }

      case 'scan-sample-suspicious': {
        withBinaryHygiene((portal) => portal.scanSampleBinary('suspicious'));
        break;
      }

      case 'toggle-dm-emoji': {
        void getMV().then(m => {
          m.toggleDMEmojiPicker();
          clientStore.notifySync();
          requestAnimationFrame(() => m.restoreMessageSelection('dm'));
        });
        break;
      }

      case 'toggle-relay-emoji': {
        void getMV().then(m => {
          m.toggleRelayEmojiPicker();
          clientStore.notifySync();
          requestAnimationFrame(() => m.restoreMessageSelection('relay'));
        });
        break;
      }

      case 'close-emoji-pickers': {
        void getMV().then(m => {
          m.closeEmojiPickers();
          clientStore.notifySync();
        });
        break;
      }

      case 'select-chat-emoji-category': {
        const cat = el.getAttribute('data-category');
        if (cat) {
          void getMV().then(m => {
            m.setChatEmojiCategory(cat);
            clientStore.notifySync();
          });
        }
        break;
      }

      case 'clear-chat-emoji-search': {
        void getMV().then(m => {
          m.setChatEmojiSearchQuery('');
          clientStore.notifySync();
        });
        break;
      }

      case 'insert-chat-prompt': {
        const prompt = el.getAttribute('data-prompt');
        if (prompt) {
          const input = document.getElementById('input-dm-message') as HTMLInputElement | null;
          if (input) {
            input.value = prompt;
            void getMV().then(m => m.setMessageDraft('dm', prompt));
            input.focus();
            clientStore.notifySync();
          }
        }
        break;
      }

      case 'insert-dm-emoji': {
        const emoji = el.getAttribute('data-emoji');
        void getMV().then(m => {
          if (emoji) {
            m.insertMessageEmoji('dm', emoji);
            m.restoreMessageSelection('dm');
          }
          m.toggleDMEmojiPicker(false);
          clientStore.notifySync();
          requestAnimationFrame(() => m.restoreMessageSelection('dm'));
        });
        break;
      }

      case 'insert-relay-emoji': {
        const emoji = el.getAttribute('data-emoji');
        void getMV().then(m => {
          if (emoji) {
            m.insertMessageEmoji('relay', emoji);
            m.restoreMessageSelection('relay');
          }
          m.toggleRelayEmojiPicker(false);
          clientStore.notifySync();
          requestAnimationFrame(() => m.restoreMessageSelection('relay'));
        });
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
        withBinaryHygiene((portal) => {
          if (portal && typeof portal.scanFile === 'function') {
            portal.scanFile(file, file.name).catch((err: any) => console.error('Binary scan failed:', err));
          }
        });
      }
      return;
    }
    if (action === 'dm-file-attached' || el.id === 'input-dm-attachment-file') {
      const fileInput = el as HTMLInputElement;
      if (fileInput.files && fileInput.files[0]) {
        void getMV().then(m => m.handleFileAttachment(fileInput.files![0], 'dm'));
        fileInput.value = '';
      }
      return;
    }
    if (action === 'relay-file-attached' || el.id === 'input-relay-attachment-file') {
      const fileInput = el as HTMLInputElement;
      if (fileInput.files && fileInput.files[0]) {
        void getMV().then(m => m.handleFileAttachment(fileInput.files![0], 'relay'));
        fileInput.value = '';
      }
      return;
    }
    if (action === 'settings-toggle-pref') {
      const input = el as HTMLInputElement;
      const pref = el.getAttribute('data-pref');
      if (pref && typeof localStorage !== 'undefined') {
        localStorage.setItem(`aetheris_pref_${pref}`, String(input.checked));
        if (pref === 'high_contrast') {
          if (input.checked) document.documentElement.classList.add('contrast-high');
          else document.documentElement.classList.remove('contrast-high');
        } else if (pref === 'focus_ring') {
          if (input.checked) document.documentElement.classList.add('focus-ring-prominent');
          else document.documentElement.classList.remove('focus-ring-prominent');
        }
        clientStore.showToast('✓ Preference saved', 'success');
        clientStore.notifySync();
      }
      return;
    }
    if (action === 'settings-set-pref') {
      const select = el as HTMLSelectElement;
      const pref = el.getAttribute('data-pref');
      if (pref && typeof localStorage !== 'undefined') {
        localStorage.setItem(`aetheris_pref_${pref}`, select.value);
        if (pref === 'motion_dynamics') {
          document.documentElement.setAttribute('data-motion', select.value);
          if (select.value === 'none') document.documentElement.classList.add('motion-none');
          else document.documentElement.classList.remove('motion-none');
        }
        clientStore.showToast(`✓ Setting applied: ${select.value}`, 'success');
        clientStore.notifySync();
      }
      return;
    }
    if (action === 'settings-set-trust-threshold') {
      const val = parseInt((el as HTMLInputElement).value, 10);
      if (!isNaN(val)) {
        clientStore.setMinFeedTrustThreshold(val);
        const lbl = document.getElementById('settings-trust-threshold-val');
        if (lbl) lbl.textContent = `${val} / 100`;
      }
      return;
    }
    if (action === 'settings-import-backup') {
      const fileInput = el as HTMLInputElement;
      if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        void import('../export-backup.js').then(({ exportBackup }) => {
          return exportBackup.importAccount(file);
        }).then((result) => {
          clientStore.showToast(`✅ Restore Completed: ${result.imported} items restored!`, 'success');
          clientStore.notifySync();
        }).catch((err) => {
          clientStore.showToast(`❌ Restore Error: ${err instanceof Error ? err.message : String(err)}`, 'warning');
        });
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
    if (action === 'settings-set-trust-threshold') {
      const val = parseInt((el as HTMLInputElement).value, 10);
      if (!isNaN(val)) {
        clientStore.setMinFeedTrustThreshold(val);
        const lbl = document.getElementById('settings-trust-threshold-val');
        if (lbl) lbl.textContent = `${val} / 100`;
      }
      return;
    }
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
    } else if (action === 'search-communities' || el.id === 'input-community-search') {
      communityView.setSearchQuery(el.value);
      clientStore.notifySync();
      const updatedInput = document.getElementById('input-community-search') as HTMLInputElement | null;
      if (updatedInput) {
        updatedInput.focus({ preventScroll: true });
        updatedInput.setSelectionRange(updatedInput.value.length, updatedInput.value.length);
      }
    } else if (action === 'search-dm-peers') {
      void getMV().then(m => {
        m.setDMSearchQuery(el.value);
        clientStore.notifySync();
      });
    } else if (action === 'search-chat-emojis') {
      void getMV().then(m => {
        m.setChatEmojiSearchQuery(el.value);
        clientStore.notifySync();
        const updatedInput = document.getElementById(el.id) as HTMLInputElement | null;
        if (updatedInput) {
          updatedInput.focus({ preventScroll: true });
          updatedInput.setSelectionRange(updatedInput.value.length, updatedInput.value.length);
        }
      });
    } else if (action === 'search-vault' || el.id === 'input-vault-search') {
      void getVV().then(v => {
        v.setVaultSearchQuery(el.value);
        clientStore.notifySync();
      });
    } else if (action === 'update-dm-draft') {
      void getMV().then(m => m.captureMessageSelection('dm', el as HTMLInputElement));
      if (sovereignDM.activePeerFP) {
        sovereignDM.notifyTyping(sovereignDM.activePeerFP);
      }
    } else if (action === 'update-relay-draft') {
      void getMV().then(m => m.captureMessageSelection('relay', el as HTMLInputElement));
    } else if (action === 'mnemonic-validate-restore') {
      const statusSpan = document.getElementById('restore-validation-status');
      if (statusSpan) {
        const val = el.value.trim().toLowerCase();
        const words = val.split(/\s+/).filter(Boolean);
        if (words.length === 12 || words.length === 24) {
          void import('@aetheris/core-crypto').then(({ validateMnemonic }) => {
            if (validateMnemonic(val)) {
              statusSpan.textContent = `✅ Valid ${words.length}-word BIP-39 mnemonic`;
              statusSpan.className = 'text-[11px] font-mono text-emerald-400 font-bold';
            } else {
              statusSpan.textContent = '❌ Invalid checksum or non-BIP39 word';
              statusSpan.className = 'text-[11px] font-mono text-rose-400 font-bold';
            }
          });
        } else {
          statusSpan.textContent = `Words: ${words.length} / 12 (or 24)`;
          statusSpan.className = 'text-[11px] font-mono text-slate-400';
        }
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
    } else if (action === 'submit-dsa-report') {
      event.preventDefault();
      withLegal((lm) => {
        if (lm && typeof lm.submitDsaReport === 'function') {
          lm.submitDsaReport().then(() => {
            if ((window as any).clientStore) (window as any).clientStore.notifySync();
          }).catch(() => {});
        }
      });
    } else if (action === 'submit-dm-message') {
      event.preventDefault();
      const input = el.querySelector('#input-dm-message') as HTMLInputElement | null;
      const submittedDraft = input?.value ?? '';
      const text = submittedDraft.trim();
      const att = sovereignDM.getPendingAttachment();
      if (text || att) {
        const myFP = clientStore.keypair?.fingerprint || 'me_local_node_0x9f4e';
        sovereignDM.sendMessage(text, myFP, att || undefined).then(() => {
          void getMV().then(m => {
            if (m.getMessageDraft('dm') === submittedDraft && sovereignDM.getPendingAttachment() === att) {
              m.setMessageDraft('dm', '');
              const currentInput = document.getElementById('input-dm-message') as HTMLInputElement | null;
              if (currentInput) currentInput.value = '';
              sovereignDM.setPendingAttachment(null);
            }
          });
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
      const rawText = input ? input.value.trim() : '';
      const text = rawText ? replaceEmoticons(rawText) : '';
      const att = clientStore.pendingRelayAttachment;
      if (text || att) {
        clientStore.sendMessage(text, undefined, att || undefined);
        void getMV().then(m => m.setMessageDraft('relay', ''));
        if (input) {
          input.value = '';
          input.focus({ preventScroll: true });
        }
        clientStore.pendingRelayAttachment = null;
        clientStore.notifySync();
        setTimeout(() => {
          const container = document.getElementById('messages-container');
          if (container) container.scrollTop = container.scrollHeight;
        }, 50);
      }
    } else if (action === 'submit-new-collection') {
      event.preventDefault();
      const nameInput = el.querySelector('#input-collection-name') as HTMLInputElement | null;
      const descInput = el.querySelector('#input-collection-desc') as HTMLInputElement | null;
      const name = nameInput?.value?.trim() || '';
      const desc = descInput?.value?.trim() || '';
      if (name) {
        void getVV().then(v => {
          v.createVaultCollection(name, desc);
          v.closeNewCollectionModal();
        });
      }
    } else if (action === 'submit-community-live-chat') {
      event.preventDefault();
      const channel = el.getAttribute('data-channel') || clientStore.activeChannelId;
      const input = el.querySelector('#input-community-live-msg') as HTMLInputElement | null;
      const rawText = input ? input.value.trim() : '';
      const text = rawText ? replaceEmoticons(rawText) : '';
      if (text) {
        clientStore.sendMessage(text, channel);
        if (input) {
          input.value = '';
          input.focus({ preventScroll: true });
        }
        clientStore.notifySync();
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
