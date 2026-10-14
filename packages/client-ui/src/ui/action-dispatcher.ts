/**
 * @file ui/action-dispatcher.ts
 * @package @aetheris/client-ui/ui
 * @description 2027 Unified Typed Event Delegation & CSP-Safe Action Dispatcher.
 */

import { modalManager, FeatureModalId } from '../modal-manager.js';
import { clientStore } from '../client-state.js';
import { sovereignRouter, type SovereignRoute } from '../router.js';
import { themeEngine } from '../themes.js';
import { soundEffects } from '../sound-effects.js';
import { i18n } from '../i18n.js';
import { hybridComposer } from '../composer-hybrid.js';
import { sovereignCircleEngine } from '../sovereign-circle.js';
import { sovereignDM } from '../sovereign-dm.js';
import { communityView, exploreView, loadExploreView } from '../optional-workspaces.js';
import { setWorkspaceLayout, setSplitSecondaryPane, type SplitSecondaryPane } from '../workspace-layout.js';
import { sovereignWebPush } from '../web-push.js';
import { dismissSinceYouWereAwayCard, submitQuickPost, loadMoreFeedPosts, setQuickPostDraft } from '../feed-view.js';
import { reportModalManager } from '../report-modal.js';
import { postDetailView } from '../post-detail.js';
import { sharePostOrCopyLink } from '../dry-utils.js';
import { pulseActionsEngine } from '../pulse-actions.js';
import { feedControlsEngine } from '../feed-controls.js';
import { profileStore as profileView } from '../profile/profile-store.js';
import { homeDiscoveryEngine } from '../home-discovery.js';
import { hashtagExplorer } from '../hashtag-explorer.js';
import { mobileFlowEngine } from '../mobile-flow.js';
import { obsidianMediaPlayer } from '../media-player.js';
import { relaysManager } from '../relays-manager.js';
import { commandRailV2 } from '../command-rail-v2.js';

function getMV(): Promise<typeof import('../messages-view.js')> {
  return import('../messages-view.js');
}

function getVV(): Promise<typeof import('../vault-view.js')> {
  return import('../vault-view.js');
}

export function safeExecuteStatement(stmt: string, el: HTMLElement, event: Event): void {
  const clean = stmt.trim().replace(/;$/, '').trim();
  if (!clean) return;

  if (clean === 'event.stopPropagation()') {
    event.stopPropagation();
    return;
  }
  if (clean === 'event.preventDefault()') {
    event.preventDefault();
    return;
  }

  // Handle logical AND: window.foo && window.foo.bar(...)
  if (clean.includes('&&')) {
    const parts = clean.split('&&').map((s) => s.trim());
    safeExecuteStatement(parts[parts.length - 1], el, event);
    return;
  }

  // Handle method call: [window.]path.to.fn(args)
  const callMatch = clean.match(/^(?:window\.)?([a-zA-Z0-9_$.]+)\((.*)\)$/);
  if (callMatch) {
    const fnPath = callMatch[1];
    const rawArgs = callMatch[2].trim();
    const args: any[] = [];
    if (rawArgs.length > 0) {
      const tokens = rawArgs.match(/(?:'[^']*'|"[^"]*"|[^,]+)+/g) || [];
      for (const tok of tokens) {
        const t = tok.trim();
        if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
          args.push(t.slice(1, -1));
        } else if (t === 'true') {
          args.push(true);
        } else if (t === 'false') {
          args.push(false);
        } else if (t === 'null') {
          args.push(null);
        } else if (t === 'this') {
          args.push(el);
        } else if (t === 'this.value') {
          args.push((el as HTMLInputElement).value);
        } else if (t === 'event') {
          args.push(event);
        } else if (!isNaN(Number(t))) {
          args.push(Number(t));
        } else {
          args.push(t);
        }
      }
    }

    const segments = fnPath.split('.');
    let ctx: any = typeof window !== 'undefined' ? window : globalThis;
    for (let i = 0; i < segments.length - 1; i++) {
      ctx = ctx?.[segments[i]];
      if (!ctx) return;
    }
    const fn = ctx?.[segments[segments.length - 1]];
    if (typeof fn === 'function') {
      fn.apply(ctx, args);
    }
  }
}

export function safeExecuteExpression(code: string, el: HTMLElement, event: Event): void {
  if (!code) return;
  const statements = code.split(';');
  for (const stmt of statements) {
    safeExecuteStatement(stmt, el, event);
  }
}

export class ActionDispatcher {
  private bound = false;

  public init(): void {
    if (this.bound || typeof document === 'undefined') return;
    this.bound = true;

    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== 'function') return;

      const actionEl = target.closest<HTMLElement>('[data-action]');
      if (actionEl) {
        const action = actionEl.getAttribute('data-action') || '';
        if (action) {
          this.dispatch(action, actionEl, e);
        }
      }
    });

    document.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target) return;
      if (target.id === 'inline-quick-post-input') {
        setQuickPostDraft(target.value);
        return;
      }
      const action = target.getAttribute?.('data-input-action') || target.getAttribute?.('data-action');
      if (action) {
        this.dispatchInput(action, target, e);
      }
    });

    document.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement | null;
      if (!target) return;
      const action = target.getAttribute?.('data-change-action') || target.getAttribute?.('data-action');
      if (action) {
        this.dispatchChange(action, target, e);
      }
    });

    document.addEventListener('submit', (e: Event) => {
      const form = e.target as HTMLFormElement | null;
      if (!form) return;
      const action = form.getAttribute?.('data-submit-action') || form.getAttribute?.('data-action');
      if (action) {
        e.preventDefault();
        this.dispatchSubmit(action, form, e);
      }
    });
  }

  public dispatch(action: string, el: HTMLElement, event: MouseEvent): void {
    switch (action) {
      case 'nav.primary': {
        const navId = (el.getAttribute('data-nav-id') || 'feed') as SovereignRoute;
        sovereignRouter.navigateTo(navId);
        return;
      }
      case 'workspace.setLayout': {
        const layout = el.getAttribute('data-layout');
        if (layout) {
          setWorkspaceLayout(layout);
        }
        return;
      }
      case 'workspace.setSplitPane': {
        const pane = el.getAttribute('data-pane') as SplitSecondaryPane | null;
        if (pane) {
          setSplitSecondaryPane(pane);
        }
        return;
      }
      case 'command.open': {
        commandRailV2.open();
        return;
      }
      case 'notifications.toggle': {
        if (typeof (window as any).__aetherisToggleNotifs === 'function') {
          (window as any).__aetherisToggleNotifs();
        }
        return;
      }
      case 'theme.open': {
        themeEngine.openModal();
        return;
      }
      case 'theme.close': {
        themeEngine.closeModal();
        return;
      }
      case 'theme.apply': {
        const themeId = el.getAttribute('data-theme-id');
        if (themeId) themeEngine.setTheme(themeId);
        return;
      }
      case 'theme.setAccent': {
        const hex = el.getAttribute('data-accent-hex');
        if (hex) themeEngine.setAccentColor(hex);
        return;
      }
      case 'lang.open': {
        if (typeof (window as any).__aetheris_open_lang === 'function') {
          (window as any).__aetheris_open_lang();
        }
        return;
      }
      case 'header.toggleOverflow': {
        if (typeof (window as any).__aetheris_toggle_advanced_overflow === 'function') {
          (window as any).__aetheris_toggle_advanced_overflow();
        }
        return;
      }
      case 'header.dismissBroadcast': {
        (clientStore as any).broadcastDismissed = true;
        if (typeof (window as any).__aetheris_dismiss_broadcast === 'function') {
          (window as any).__aetheris_dismiss_broadcast();
        }
        el.closest('#system-broadcast-banner')?.remove();
        return;
      }
      case 'composer.open': {
        hybridComposer.isModalOpen = true;
        clientStore.notify('COMPOSER_TOGGLED', true);
        return;
      }
      case 'feed.submitQuickPost': {
        submitQuickPost();
        return;
      }
      case 'feed.dismissAwayCard': {
        dismissSinceYouWereAwayCard();
        return;
      }
      case 'feed.loadMore': {
        loadMoreFeedPosts();
        return;
      }
      case 'modal.open': {
        const feature = el.getAttribute('data-feature') as FeatureModalId | null;
        if (feature) {
          void modalManager.openFeature(feature);
        }
        return;
      }
      case 'toggle-sound': {
        soundEffects.toggleSound();
        return;
      }
      default: {
        // Fallback for inline expression actions
        if (action.includes('(') || action.includes('.')) {
          safeExecuteExpression(action, el, event);
        }
      }
    }
  }

  public dispatchChange(action: string, el: HTMLInputElement | HTMLSelectElement, event: Event): void {
    if (action === 'i18n.setLanguage') {
      i18n.setLanguage(el.value);
      return;
    }
    safeExecuteExpression(action, el, event);
  }

  public dispatchInput(action: string, el: HTMLInputElement | HTMLTextAreaElement, event: Event): void {
    if (action === 'explore.search') {
      void loadExploreView().then(() => {
        exploreView?.setSearchQuery(el.value);
      });
      return;
    }
    if (action === 'community.search') {
      communityView?.setSearchQuery(el.value);
      return;
    }
    if (action === 'vault.search') {
      void getVV().then((m) => m.setVaultSearchQuery(el.value));
      return;
    }
    if (action === 'dm.search') {
      void getMV().then((m) => m.setDMSearchQuery(el.value));
      return;
    }
    safeExecuteExpression(action, el, event);
  }

  public dispatchSubmit(action: string, el: HTMLFormElement, event: Event): void {
    safeExecuteExpression(action, el, event);
  }
}

export const actionDispatcher = new ActionDispatcher();
