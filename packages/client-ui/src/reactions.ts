// reactions.ts — UREfy Emoji Reactions Engine
// Self-contained, no external dependencies

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { isDemoModeEnabled } from './demo-mode.js';
import { clientStore } from './client-state.js';
import { soundEffects } from './sound-effects.js';

export interface Reaction {
  emoji: string;
  label: string;
  count: number;
  reactedBy: Set<string>;
}

export type PostReactions = Map<string, Map<string, Reaction>>;

export interface AvailableReaction {
  emoji: string;
  label: string;
}

export class ReactionsEngine {
  public postReactions: PostReactions = new Map();
  private pendingReactions: Map<string, Promise<any>> = new Map();

  public readonly QUICK_REACTIONS: AvailableReaction[] = [
    { emoji: '👍', label: 'Like' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '🔥', label: 'Fire' },
    { emoji: '💡', label: 'Insight' },
    { emoji: '🤔', label: 'Think' },
    { emoji: '🎉', label: 'Celebrate' },
  ];

  public readonly AVAILABLE_REACTIONS: AvailableReaction[] = [
    { emoji: '👍', label: 'Like' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '🔥', label: 'Fire' },
    { emoji: '💡', label: 'Insight' },
    { emoji: '🤔', label: 'Think' },
    { emoji: '🎉', label: 'Celebrate' },
    { emoji: '⚡', label: 'Pulse' },
    { emoji: '🛡️', label: 'Shield' },
    { emoji: '🎯', label: 'Precise' },
    { emoji: '🚀', label: 'Launch' },
  ];

  constructor() {
    if (isDemoModeEnabled()) {
      this._seedDemoReactions();
    }
  }

  // ─── Core Methods ───────────────────────────────────────────────────────────

  public initPost(postId: string): void {
    if (!this.postReactions.has(postId)) {
      this.postReactions.set(postId, new Map<string, Reaction>());
    }
  }

  /**
   * Toggles an emoji reaction on a post for a given user.
   * Enforces a STRICT SINGLE REACTION per user per post policy:
   * - If the user clicks the emoji they already reacted with -> toggles off (removes reaction).
   * - If the user clicks a different emoji -> replaces their previous reaction with the new one.
   * - If the user has not reacted yet -> adds the reaction.
   */
  public toggleReaction(postId: string, emoji: string, userFP: string): void {
    this.initPost(postId);
    const reactions = this.postReactions.get(postId)!;

    const available = this.AVAILABLE_REACTIONS.find((r) => r.emoji === emoji) || { emoji, label: 'Reaction' };

    // Detect if the user already has any reaction on this post
    let previousEmoji: string | null = null;
    for (const [em, rx] of reactions.entries()) {
      if (rx.reactedBy.has(userFP)) {
        previousEmoji = em;
        break;
      }
    }

    const isRemoving = previousEmoji === emoji;
    const active = !isRemoving;

    if (isRemoving) {
      // 1. User clicked the exact same emoji they currently have -> TOGGLE OFF (remove)
      const current = reactions.get(emoji)!;
      current.reactedBy.delete(userFP);
      current.count = current.reactedBy.size;
      if (current.count === 0) {
        reactions.delete(emoji);
      }
    } else {
      // 2. User clicked a different emoji (or had none)
      // If user had a different reaction previously, remove them from it first
      if (previousEmoji) {
        const prevRx = reactions.get(previousEmoji)!;
        prevRx.reactedBy.delete(userFP);
        prevRx.count = prevRx.reactedBy.size;
        if (prevRx.count === 0) {
          reactions.delete(previousEmoji);
        }
      }

      // Add user to the newly selected emoji
      if (!reactions.has(emoji)) {
        reactions.set(emoji, {
          emoji,
          label: available.label,
          count: 0,
          reactedBy: new Set<string>(),
        });
      }

      const newRx = reactions.get(emoji)!;
      newRx.reactedBy.add(userFP);
      newRx.count = newRx.reactedBy.size;
    }

    if (typeof fetch !== 'undefined') {
      const mutationPromise = (async () => {
        try {
          const { persistInteraction } = await import('./interaction-transport.js');
          await persistInteraction(postId, 'reaction', active, emoji, 'post');
        } catch (err: any) {
          // Rollback optimistic state
          this.initPost(postId);
          const rxMap = this.postReactions.get(postId)!;
          if (isRemoving) {
            if (!rxMap.has(emoji)) {
              rxMap.set(emoji, { emoji, label: available.label, count: 0, reactedBy: new Set() });
            }
            const rx = rxMap.get(emoji)!;
            rx.reactedBy.add(userFP);
            rx.count = rx.reactedBy.size;
          } else {
            const curr = rxMap.get(emoji);
            if (curr) {
              curr.reactedBy.delete(userFP);
              curr.count = curr.reactedBy.size;
              if (curr.count === 0) rxMap.delete(emoji);
            }
            if (previousEmoji) {
              if (!rxMap.has(previousEmoji)) {
                const prevAvail = this.AVAILABLE_REACTIONS.find(r => r.emoji === previousEmoji) || { emoji: previousEmoji, label: 'Reaction' };
                rxMap.set(previousEmoji, { emoji: previousEmoji, label: prevAvail.label, count: 0, reactedBy: new Set() });
              }
              const prevRx = rxMap.get(previousEmoji)!;
              prevRx.reactedBy.add(userFP);
              prevRx.count = prevRx.reactedBy.size;
            }
          }
          const { clientStore } = await import('./client-state.js');
          clientStore.showToast(err?.message || 'Failed to save reaction', 'warning');
        }
      })();

      this.pendingReactions.set(postId, mutationPromise);
    }
  }

  /**
   * Hydrates remote reactions state for a post.
   */
  public hydrate(postId: string, reactionsList: any[], userFP: string = ''): void {
    this.initPost(postId);
    const reactions = this.postReactions.get(postId)!;
    if (!Array.isArray(reactionsList)) return;
    reactions.clear();
    for (const item of reactionsList) {
      if (!item) continue;
      const emoji = item.emoji || (typeof item === 'string' ? item : null);
      if (!emoji) continue;
      const label = item.label || this.AVAILABLE_REACTIONS.find((r) => r.emoji === emoji)?.label || 'Reaction';
      const count = Number(item.count) || 1;
      const reactedBy = new Set<string>(Array.isArray(item.reactedBy) ? item.reactedBy : []);
      if ((item.hasReacted || item.userReacted) && userFP) {
        reactedBy.add(userFP);
      }
      reactions.set(emoji, {
        emoji,
        label,
        count: Math.max(count, reactedBy.size),
        reactedBy,
      });
    }
  }

  /**
   * Awaitable hook ensuring reaction state mutations have settled.
   */
  public async whenSettled(postId?: string): Promise<boolean> {
    if (postId) {
      const p = this.pendingReactions.get(postId);
      if (p) await p.catch(() => {});
    } else {
      await Promise.allSettled(Array.from(this.pendingReactions.values()));
    }
    return true;
  }

  /**
   * Returns the emoji that the user has currently reacted with on this post, or null if none.
   */
  public getUserReaction(postId: string, userFP: string): string | null {
    const reactions = this.postReactions.get(postId);
    if (!reactions) return null;
    for (const [emoji, rx] of reactions.entries()) {
      if (rx.reactedBy.has(userFP)) {
        return emoji;
      }
    }
    return null;
  }

  public getReactions(postId: string): Map<string, Reaction> {
    this.initPost(postId);
    return this.postReactions.get(postId)!;
  }

  public hasReacted(postId: string, emoji: string, userFP: string): boolean {
    const reactions = this.postReactions.get(postId);
    if (!reactions) return false;
    const reaction = reactions.get(emoji);
    if (!reaction) return false;
    return reaction.reactedBy.has(userFP);
  }

  public getTotalReactions(postId: string): number {
    const reactions = this.postReactions.get(postId);
    if (!reactions) return 0;
    let total = 0;
    reactions.forEach((r) => { total += r.count; });
    return total;
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  // ─── Render ─────────────────────────────────────────────────────────────────

  public renderReactionBar(postId: string, userFP: string): string {
    this.initPost(postId);
    const reactions = this.postReactions.get(postId)!;
    const pickerId = `picker-${postId.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const userActiveEmoji = this.getUserReaction(postId, userFP);

    // Filter to active reactions and sort descending by count
    const sortedReactions = Array.from(reactions.values()).filter(r => r.count > 0);
    sortedReactions.sort((a, b) => b.count - a.count);

    // Collapsed summary: display top active emojis (up to 4, user's active reaction prioritized)
    const maxVisiblePills = 4;
    let displayReactions: Reaction[] = [];
    if (userActiveEmoji) {
      const userRx = sortedReactions.find(r => r.emoji === userActiveEmoji);
      const otherTop = sortedReactions.filter(r => r.emoji !== userActiveEmoji).slice(0, maxVisiblePills - 1);
      displayReactions = userRx ? [userRx, ...otherTop] : otherTop;
    } else {
      displayReactions = sortedReactions.slice(0, maxVisiblePills);
    }

    const remainingCount = Math.max(0, sortedReactions.length - displayReactions.length);

    let pillsHtml = '';
    displayReactions.forEach((reaction) => {
      const isActive = reaction.reactedBy.has(userFP);
      const activeClasses = isActive
        ? 'bg-amber-500/15 border border-[var(--color-accent,#e59b3c)]/40 text-[var(--color-accent,#e59b3c)] font-bold shadow-xs'
        : 'bg-surface-raised border border-white/10 text-slate-300 hover:border-white/30 hover:text-white';

      pillsHtml += `<button
          type="button"
          class="btn-toggle-reaction inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans
                 transition-all duration-150 cursor-pointer select-none ${activeClasses} active:scale-95 min-h-[32px]"
          data-post-id="${postId}"
          data-emoji="${this._escapeAttr(reaction.emoji)}"
          title="${this._escapeAttr(reaction.label)}"
          aria-label="${this._escapeAttr(reaction.label)}: ${reaction.count}"
          aria-pressed="${isActive ? 'true' : 'false'}"
        ><span class="leading-none text-sm" aria-hidden="true">${reaction.emoji}</span
        ><span class="font-mono text-[11px] tabular-nums reaction-count font-semibold">${reaction.count}</span
        ></button>`;
    });

    if (remainingCount > 0) {
      pillsHtml += `<button
          type="button"
          class="btn-overflow-reactions inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-sans
                 bg-surface-raised/80 border border-white/10 text-slate-400 hover:text-white hover:border-white/25
                 transition-all duration-150 cursor-pointer select-none active:scale-95 min-h-[32px]"
          data-post-id="${postId}"
          title="${remainingCount} more reaction type${remainingCount > 1 ? 's' : ''}"
          aria-label="${remainingCount} more reaction types"
        ><span class="font-mono text-[11px] tabular-nums font-semibold">+${remainingCount}</span></button>`;
    }

    return `<div class="reactions-bar flex items-center gap-1.5 flex-wrap relative select-none" data-post-id="${postId}">
  ${pillsHtml ? `<div class="reaction-pills flex items-center gap-1.5 flex-wrap">${pillsHtml}</div>` : ''}
  <div class="relative inline-block reactions-picker">
    <button
      type="button"
      class="add-reaction-btn inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans
             bg-surface-raised hover:bg-surface-overlay border border-white/10 text-slate-300
             hover:border-white/30 hover:text-white transition-all duration-150 cursor-pointer select-none active:scale-95 min-h-[32px] ${userActiveEmoji ? 'border-[var(--color-accent,#e59b3c)]/40 text-[var(--color-accent,#e59b3c)] font-semibold' : ''}"
      data-picker-id="${pickerId}"
      data-post-id="${postId}"
      aria-label="Add reaction"
      aria-expanded="false"
    ><span class="text-sm leading-none" aria-hidden="true">${userActiveEmoji || '＋'}</span
    ><span class="text-[11px] font-medium">${userActiveEmoji ? 'Reacted' : 'React'}</span></button>
  </div>
</div>`.trim();
  }

  // ─── Global Portal Overlay Architecture (P0 Stacking Context & Clipping Fix) ───

  private activePortalTrigger: HTMLElement | null = null;
  private activePortalPostId: string | null = null;
  private portalOutsideClickListener: ((e: PointerEvent) => void) | null = null;
  private portalKeydownListener: ((e: KeyboardEvent) => void) | null = null;
  private portalScrollListener: (() => void) | null = null;

  /**
   * Opens the reaction picker in a top-level global portal mounted directly on document.body.
   * Eliminates CSS transform stacking context trapping, overflow clipping, and z-index issues.
   */
  public openPortalPicker(
    triggerEl: HTMLElement,
    postId: string,
    userFP: string,
    onReactionSelect?: (emoji: string) => void
  ): void {
    if (typeof document === 'undefined') return;

    // Toggle off if already open for this exact trigger
    if (this.activePortalTrigger === triggerEl && this.activePortalPostId === postId) {
      this.closePortalPicker();
      return;
    }

    this.closePortalPicker();

    this.activePortalTrigger = triggerEl;
    this.activePortalPostId = postId;
    triggerEl.setAttribute('aria-expanded', 'true');

    // Create or locate portal container
    let portal = document.getElementById('reactions-portal-overlay');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'reactions-portal-overlay';
      document.body.appendChild(portal);
    }

    const userActiveEmoji = this.getUserReaction(postId, userFP);
    let pickerButtonsHtml = '';
    this.QUICK_REACTIONS.forEach((avail) => {
      const alreadyActive = avail.emoji === userActiveEmoji;
      const activeStyle = alreadyActive
        ? 'ring-2 ring-[var(--color-accent,#e59b3c)] bg-amber-500/25 text-white font-bold shadow-xs'
        : 'hover:bg-white/10 text-slate-300 hover:text-white';

      pickerButtonsHtml += `
        <button
          type="button"
          class="btn-portal-reaction w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-xl sm:text-2xl transition-all duration-150 hover:scale-125 cursor-pointer ${activeStyle} active:scale-95 shrink-0"
          data-post-id="${postId}"
          data-emoji="${this._escapeAttr(avail.emoji)}"
          title="${this._escapeAttr(avail.label)}"
          aria-label="${this._escapeAttr(avail.label)}"
        >
          <span class="leading-none select-none">${avail.emoji}</span>
        </button>
      `;
    });

    portal.className = 'reactions-portal fixed z-[10000] animate-in fade-in zoom-in-95 duration-150';
    portal.innerHTML = `
      <div
        class="reactions-picker-portal-card reactions-picker-compact-dock flex items-center justify-between sm:justify-start gap-1 p-1.5 bg-surface-overlay/95 backdrop-blur-2xl border border-[var(--surface-rule)] rounded-2xl sm:rounded-full shadow-2xl text-[var(--text-primary)] select-none transition-all duration-150 max-w-[calc(100vw-1.5rem)]"
        role="dialog"
        aria-label="Emoji reactions selector"
      >
        <div class="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar py-0.5 shrink min-w-0">
          ${pickerButtonsHtml}
        </div>
        <div class="w-px h-6 bg-[var(--surface-rule)] mx-0.5 shrink-0"></div>
        <button
          type="button"
          class="btn-portal-more-emojis w-11 h-11 sm:w-10 sm:h-10 rounded-full hover:bg-surface-hover flex items-center justify-center text-base sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shrink-0"
          title="Browse all emojis"
          aria-label="Browse all emojis"
        >
          <span>✨</span>
        </button>
        <button
          type="button"
          class="btn-close-portal w-9 h-9 sm:w-7 sm:h-7 rounded-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-surface-hover flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-0.5"
          title="Close"
          aria-label="Close"
        >✕</button>
      </div>
    `;

    // Position dynamically relative to trigger with collision detection
    this._repositionPortal(triggerEl, portal);

    // Bind quick item click events inside portal
    portal.querySelectorAll<HTMLButtonElement>('.btn-portal-reaction').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const em = btn.getAttribute('data-emoji');
        if (em) {
          this.toggleReaction(postId, em, userFP);
          if (await this.whenSettled(postId)) onReactionSelect?.(em);
          this.closePortalPicker();
        }
      });
    });

    portal.querySelector('.btn-close-portal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closePortalPicker();
    });

    // Handle "More emoji..." lazy loaded full browser
    portal.querySelector('.btn-portal-more-emojis')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const emojiModule = await import('./emoji-data.js');
      let activeCat: any = 'recent';

      const renderCategoryGrid = (catKey: any, query = '') => {
        if (query.trim()) {
          const matched = emojiModule.searchEmojis(query);
          if (matched.length === 0) {
            return `<div class="p-6 text-center text-xs text-slate-400">No matching emojis found</div>`;
          }
          return `
            <div class="grid grid-cols-6 gap-1.5 p-1">
              ${matched.map(item => `
                <button type="button" class="btn-select-full-emoji w-10 h-10 rounded-xl hover:bg-surface-raised flex items-center justify-center text-xl transition-transform active:scale-90 cursor-pointer" data-emoji="${this._escapeAttr(item.emoji)}" title=":${item.shortcode}:">
                  ${item.emoji}
                </button>
              `).join('')}
            </div>
          `;
        }

        const emojis = catKey === 'recent'
          ? emojiModule.getRecentEmojis()
          : (emojiModule.RAW_CATEGORY_EMOJIS as any)[catKey] || [];

        return `
          <div class="grid grid-cols-6 gap-1.5 p-1">
            ${emojis.map((em: string) => `
              <button type="button" class="btn-select-full-emoji w-10 h-10 rounded-xl hover:bg-surface-raised flex items-center justify-center text-xl transition-transform active:scale-90 cursor-pointer" data-emoji="${this._escapeAttr(em)}">
                ${em}
              </button>
            `).join('')}
          </div>
        `;
      };

      const card = portal.querySelector('.reactions-picker-portal-card') as HTMLElement | null;
      if (!card) return;

      const renderFullBrowser = () => {
        card.className = 'reactions-picker-portal-card reactions-picker-full-browser bg-surface-overlay/95 backdrop-blur-2xl border border-[var(--surface-rule)] rounded-2xl shadow-2xl p-3 w-80 max-w-[calc(100vw-1.5rem)] text-[var(--text-primary)]';
        card.innerHTML = `
          <div class="flex flex-col space-y-2.5 w-full">
            <div class="flex items-center justify-between pb-1.5 border-b border-[var(--surface-rule)] gap-2">
              <input
                type="text"
                id="input-emoji-full-search"
                placeholder="Search all emojis..."
                class="flex-1 bg-surface-raised border border-[var(--surface-rule)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--color-accent,#e59b3c)] font-sans"
              />
              <button type="button" class="btn-close-portal text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded hover:bg-surface-hover cursor-pointer">✕</button>
            </div>

            <!-- CATEGORY ICON TABS -->
            <div class="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5" id="emoji-category-tabs">
              ${emojiModule.EMOJI_CATEGORIES.map(cat => `
                <button type="button" data-cat="${cat.key}" class="btn-emoji-cat-tab w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors cursor-pointer shrink-0 ${cat.key === activeCat ? 'bg-amber-500/20 text-[var(--color-accent,#e59b3c)] border border-[var(--color-accent,#e59b3c)]/40 font-bold' : 'text-[var(--text-secondary)] hover:bg-surface-raised hover:text-[var(--text-primary)]'}" title="${cat.label}">
                  ${cat.icon}
                </button>
              `).join('')}
            </div>

            <!-- SCROLLABLE EMOJI GRID -->
            <div id="emoji-full-grid" class="h-56 overflow-y-auto no-scrollbar rounded-xl bg-surface-raised/40 p-1">
              ${renderCategoryGrid(activeCat)}
            </div>
          </div>
        `;

        this._repositionPortal(triggerEl, portal);

        // Bind category switcher
        card.querySelectorAll('.btn-emoji-cat-tab').forEach(tab => {
          tab.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const cat = tab.getAttribute('data-cat');
            if (cat) {
              activeCat = cat;
              renderFullBrowser();
            }
          });
        });

        // Bind search input
        const searchInput = card.querySelector('#input-emoji-full-search') as HTMLInputElement | null;
        searchInput?.focus({ preventScroll: true });
        searchInput?.addEventListener('input', () => {
          const gridEl = card.querySelector('#emoji-full-grid');
          if (gridEl) {
            gridEl.innerHTML = renderCategoryGrid(activeCat, searchInput.value);
            bindEmojiClicks();
          }
        });

        const bindEmojiClicks = () => {
          card.querySelectorAll<HTMLButtonElement>('.btn-select-full-emoji').forEach(b => {
            b.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              const em = b.getAttribute('data-emoji');
              if (em) {
                emojiModule.recordRecentEmoji(em);
                this.toggleReaction(postId, em, userFP);
                if (await this.whenSettled(postId)) onReactionSelect?.(em);
                this.closePortalPicker();
              }
            });
          });
        };

        bindEmojiClicks();

        card.querySelector('.btn-close-portal')?.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.closePortalPicker();
        });
      };

      renderFullBrowser();
    });

    // Dismiss on outside pointerdown
    this.portalOutsideClickListener = (e: PointerEvent) => {
      if (portal && !portal.contains(e.target as Node) && !triggerEl.contains(e.target as Node)) {
        this.closePortalPicker();
      }
    };
    document.addEventListener('pointerdown', this.portalOutsideClickListener, { capture: true });

    // Dismiss on Escape key
    this.portalKeydownListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.closePortalPicker();
        triggerEl.focus({ preventScroll: true });
      } else if (e.key === 'Tab' && portal) {
        const buttons = [...portal.querySelectorAll<HTMLButtonElement>('button')];
        const first = buttons[0];
        const last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', this.portalKeydownListener);

    // Reposition or dismiss on scroll
    this.portalScrollListener = () => {
      if (this.activePortalTrigger && portal) {
        this._repositionPortal(this.activePortalTrigger, portal);
      }
    };
    window.addEventListener('scroll', this.portalScrollListener, { passive: true, capture: true });
    window.addEventListener('resize', this.portalScrollListener, { passive: true });
    portal.querySelector<HTMLButtonElement>('.btn-portal-reaction')?.focus({ preventScroll: true });
  }

  private _repositionPortal(triggerEl: HTMLElement, portal: HTMLElement): void {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth < 640;
    const isFullBrowser = portal.querySelector('.reactions-picker-full-browser') !== null;

    if (isMobile) {
      portal.style.transform = 'none';
      portal.style.top = 'auto';
      portal.style.bottom = '0px';
      portal.style.left = '0px';
      portal.style.right = '0px';
      portal.style.width = '100vw';
      portal.style.maxHeight = isFullBrowser ? '80vh' : 'auto';
      portal.style.overflowY = isFullBrowser ? 'auto' : 'visible';
      portal.style.display = 'flex';
      portal.style.justifyContent = 'center';
      portal.style.alignItems = 'flex-end';
      portal.style.padding = '12px 12px calc(12px + env(safe-area-inset-bottom, 0px)) 12px';
      portal.style.background = 'rgba(0, 0, 0, 0.45)';
      portal.style.backdropFilter = 'blur(6px)';
      return;
    }

    const rect = triggerEl.getBoundingClientRect();
    if (!triggerEl.isConnected || rect.bottom < -100 || rect.top > window.innerHeight + 100) {
      this.closePortalPicker();
      return;
    }
    const cardEl = portal.firstElementChild as HTMLElement | null;
    const popoverWidth = cardEl?.offsetWidth || portal.offsetWidth || 340;
    const popoverHeight = cardEl?.offsetHeight || portal.offsetHeight || (isFullBrowser ? 340 : 54);
    const margin = 12;

    portal.style.transform = 'none';
    portal.style.width = '';
    portal.style.bottom = '';
    portal.style.right = '';
    portal.style.display = '';
    portal.style.padding = '';
    portal.style.background = '';
    portal.style.backdropFilter = '';

    // Check vertical space and video avoidance
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    let prefersBelow = spaceAbove < popoverHeight + margin;

    if (!prefersBelow) {
      // If there's a video immediately above the trigger in the post card, avoid covering it
      const postCard = triggerEl.closest('.social-post, .post-card, [data-post-id]');
      const videoEl = postCard?.querySelector('video, iframe');
      if (videoEl) {
        const vRect = videoEl.getBoundingClientRect();
        if (vRect.bottom > rect.top - popoverHeight - margin && vRect.top < rect.top) {
          if (spaceBelow >= popoverHeight + margin) {
            prefersBelow = true;
          }
        }
      }
    }

    let top = prefersBelow ? (rect.bottom + margin) : (rect.top - popoverHeight - margin);

    // Horizontal positioning: center or clamp to viewport with margin
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left + popoverWidth > window.innerWidth - margin) {
      left = window.innerWidth - popoverWidth - margin;
    }
    left = Math.max(margin, left);

    top = Math.max(margin, Math.min(top, window.innerHeight - popoverHeight - margin));
    portal.style.top = `${Math.round(top)}px`;
    portal.style.left = `${Math.round(left)}px`;
  }

  /**
   * Closes the active global portal reaction picker.
   */
  public closePortalPicker(): void {
    if (this.activePortalTrigger) {
      this.activePortalTrigger.setAttribute('aria-expanded', 'false');
      this.activePortalTrigger = null;
    }
    this.activePortalPostId = null;

    const portal = document.getElementById('reactions-portal-overlay');
    if (portal) {
      portal.remove();
    }

    if (this.portalOutsideClickListener) {
      document.removeEventListener('pointerdown', this.portalOutsideClickListener, { capture: true });
      this.portalOutsideClickListener = null;
    }
    if (this.portalKeydownListener) {
      window.removeEventListener('keydown', this.portalKeydownListener);
      this.portalKeydownListener = null;
    }
    if (this.portalScrollListener) {
      window.removeEventListener('scroll', this.portalScrollListener);
      window.removeEventListener('resize', this.portalScrollListener);
      this.portalScrollListener = null;
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private _addReaction(postId: string, emoji: string, label: string, userFPs: string[]): void {
    this.initPost(postId);
    const reactions = this.postReactions.get(postId)!;
    const reactedBy = new Set<string>(userFPs);
    reactions.set(emoji, { emoji, label, count: reactedBy.size, reactedBy });
  }

  private _seedDemoReactions(): void {
    // Post demo-001: distinct users per reaction to maintain single reaction constraint
    this._addReaction('demo-001','❤️','Love',    ['fp_u01','fp_u02','fp_u03','fp_u04','fp_u05','fp_u06','fp_u07','fp_u08','fp_u09','fp_u10','fp_u11','fp_u12']);
    this._addReaction('demo-001','🔥','Fire',    ['fp_u13','fp_u14','fp_u15','fp_u16','fp_u17','fp_u18','fp_u19']);
    this._addReaction('demo-001','💡','Insight', ['fp_u20','fp_u21','fp_u22']);
    this._addReaction('demo-001','🚀','Launch',  ['fp_u23','fp_u24']);
    // Post demo-002: distinct users per reaction
    this._addReaction('demo-002','⚡','Power',    ['fp_u01','fp_u02','fp_u03','fp_u04','fp_u05']);
    this._addReaction('demo-002','🎯','Precise',  ['fp_u06','fp_u07','fp_u08','fp_u09']);
    this._addReaction('demo-002','🛡️','Security', ['fp_u10','fp_u11','fp_u12']);
    this._addReaction('demo-002','🤔','Think',    ['fp_u13','fp_u14']);
    this._addReaction('demo-002','🔥','Fire',     ['fp_u15']);
    // Post demo-003: distinct users per reaction
    this._addReaction('demo-003','🚀','Launch',  ['fp_u01','fp_u02','fp_u03','fp_u04','fp_u05','fp_u06','fp_u07','fp_u08']);
    this._addReaction('demo-003','💡','Insight', ['fp_u09','fp_u10','fp_u11','fp_u12']);
    this._addReaction('demo-003','❤️','Love',    ['fp_u13','fp_u14','fp_u15']);
    this._addReaction('demo-003','🎯','Precise', ['fp_u16','fp_u17']);
    this._addReaction('demo-003','⚡','Power',   ['fp_u18']);
  }

  /**
   * Spawns a particle burst explosion animation at specified screen coordinates or returns particle descriptors.
   */
  public triggerParticleBurst(x: number, y: number, emoji: string = '❤️'): any[] {
    const count = 12;
    const isDom = typeof document !== 'undefined';
    const particles: any[] = [];
    let container: HTMLElement | null = null;
    if (isDom) {
      container = document.createElement('div');
      container.className = 'particle-burst-container pointer-events-none fixed z-50';
      container.style.left = `${x}px`;
      container.style.top = `${y}px`;
      container.style.position = 'fixed';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.5;
      const velocity = 40 + Math.random() * 60;
      const dx = Math.cos(angle) * velocity;
      const dy = Math.sin(angle) * velocity;

      if (isDom && container) {
        const p = document.createElement('span');
        p.className = 'particle-spark';
        p.textContent = emoji;
        p.style.position = 'absolute';
        p.style.fontSize = '14px';
        p.style.userSelect = 'none';
        p.style.setProperty('--dx', `${dx}px`);
        p.style.setProperty('--dy', `${dy}px`);
        container.appendChild(p);
        particles.push(p);
      } else {
        particles.push({ emoji, dx, dy, textContent: emoji });
      }
    }

    if (isDom && container) {
      setTimeout(() => {
        container?.remove();
      }, 800);
    }

    return particles;
  }

  private _escapeHtml(str: string): string {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  private _escapeAttr(str: string): string {
    return this._escapeHtml(str);
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────
export const reactionsEngine = new ReactionsEngine();

serviceRegistry.registerInstance(SERVICES.Reactions, reactionsEngine);

if (typeof window !== 'undefined') {
  (window as any).__reactionsEngine = reactionsEngine;
  (window as any).reactionsEngine = reactionsEngine;
}

/**
 * In-place update of reaction bars across the DOM for a given post ID.
 * Preserves scroll position and avoids full feed re-renders.
 */
export function updateReactionBarDOM(postId: string): void {
  if (typeof document === 'undefined') return;
  const bars = document.querySelectorAll<HTMLElement>(`.reactions-bar[data-post-id="${postId}"]`);
  if (!bars.length) return;
  const userFP = (window as any).clientStore?.keypair?.fingerprint || '';
  const newHtml = reactionsEngine.renderReactionBar(postId, userFP);
  bars.forEach(bar => {
    const temp = document.createElement('div');
    temp.innerHTML = newHtml;
    const newBar = temp.firstElementChild as HTMLElement | null;
    if (newBar) {
      bar.replaceWith(newBar);
      bindReactionBarEvents(newBar);
    }
  });
}

/**
 * Binds click events on reaction bar buttons within a container or root element.
 */
export function bindReactionBarEvents(_container?: HTMLElement | Document): void {
  // Event handling is fully centralized via global document delegation below.
}

// ─── Global Event Delegation for Reactions ──────────────────────────────────
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Fast delegation for toggle
    const toggleBtn = target.closest<HTMLButtonElement>('.btn-toggle-reaction');
    if (toggleBtn) {
      e.stopPropagation();
      const postId = toggleBtn.getAttribute('data-post-id');
      const emoji = toggleBtn.getAttribute('data-emoji');
      const userFP = (window as any).clientStore?.keypair?.fingerprint || '';
      if (postId && emoji) {
        reactionsEngine.toggleReaction(postId, emoji, userFP);
        updateReactionBarDOM(postId);
      }
      return;
    }

    // Fast delegation for open picker
    const triggerBtn = target.closest<HTMLButtonElement>('.add-reaction-btn, .btn-overflow-reactions');
    if (triggerBtn) {
      e.stopPropagation();
      const postId = triggerBtn.getAttribute('data-post-id');
      const userFP = (window as any).clientStore?.keypair?.fingerprint || '';
      if (postId) {
        reactionsEngine.openPortalPicker(triggerBtn, postId, userFP, () => {
          updateReactionBarDOM(postId);
        });
      }
      return;
    }
  });
}

