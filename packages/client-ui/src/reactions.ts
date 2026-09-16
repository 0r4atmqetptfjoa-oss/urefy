// reactions.ts — UREfy Emoji Reactions Engine
// Self-contained, no external dependencies

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { isDemoModeEnabled } from './demo-mode.js';

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

  public readonly AVAILABLE_REACTIONS: AvailableReaction[] = [
    { emoji: '👍', label: 'Like' },
    { emoji: '🔥', label: 'Fire' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '⚡', label: 'Pulse' },
    { emoji: '💡', label: 'Insight' },
    { emoji: '🛡️', label: 'Shield' },
    { emoji: '🎯', label: 'Precise' },
    { emoji: '🚀', label: 'Launch' },
    { emoji: '🤔', label: 'Think' },
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

    if (previousEmoji === emoji) {
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
      fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: postId,
          targetType: 'post',
          userFingerprint: userFP || 'anon-peer',
          action: 'reaction',
          value: emoji,
        }),
      }).catch(() => {});
    }
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

  public renderReactionBar(postId: string, userFP: string): string {
    this.initPost(postId);
    const reactions = this.postReactions.get(postId)!;
    const pickerId = `picker-${postId.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const userActiveEmoji = this.getUserReaction(postId, userFP);

    let pillsHtml = '';
    reactions.forEach((reaction) => {
      const isActive = reaction.reactedBy.has(userFP);
      const activeClasses = isActive
        ? 'bg-surface-overlay border border-[#00e5ff]/50 text-[#00e5ff] font-bold shadow-xs'
        : 'bg-surface-raised border border-white/10 text-white/70 hover:border-white/30 hover:text-white';

      pillsHtml += `<button
          type="button"
          class="btn-toggle-reaction inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans
                 transition-all duration-150 cursor-pointer select-none ${activeClasses} active:scale-95"
          data-post-id="${postId}"
          data-emoji="${this._escapeAttr(reaction.emoji)}"
          title="${this._escapeAttr(reaction.label)}"
          aria-pressed="${isActive ? 'true' : 'false'}"
        ><span class="leading-none text-sm" aria-hidden="true">${reaction.emoji}</span
        ><span class="font-mono text-xs tabular-nums reaction-count font-semibold">${reaction.count}</span
        ></button>`;
    });

    let pickerItems = '';
    this.AVAILABLE_REACTIONS.forEach((avail) => {
      const alreadyActive = avail.emoji === userActiveEmoji;
      const pickerActiveClass = alreadyActive
        ? 'ring-2 ring-[#00e5ff]/60 bg-surface-overlay text-white font-bold'
        : 'hover:bg-surface-overlay text-slate-300 hover:text-white';
      pickerItems += `<button
          type="button"
          class="btn-toggle-reaction flex flex-col items-center gap-0.5 p-2 rounded-xl text-sm
                 transition-all duration-150 cursor-pointer ${pickerActiveClass} active:scale-95"
          data-post-id="${postId}"
          data-emoji="${this._escapeAttr(avail.emoji)}"
          title="${this._escapeAttr(avail.label)}"
        ><span class="text-xl leading-none transition-transform hover:scale-125">${avail.emoji}</span
        ><span class="text-[10px] text-slate-400 font-sans mt-0.5">${this._escapeHtml(avail.label)}</span
        ></button>`;
    });

    return `<div class="reactions-bar flex items-center gap-1.5 flex-wrap relative mt-2 select-none" data-post-id="${postId}">
  <div class="reaction-pills flex items-center gap-1.5 flex-wrap">${pillsHtml}</div>
  <div class="relative inline-block">
    <button
      type="button"
      class="add-reaction-btn inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans
             bg-surface-raised border border-white/10 text-white/70
             hover:border-white/30 hover:text-white transition-all duration-150 cursor-pointer select-none active:scale-95 ${userActiveEmoji ? 'border-[#00e5ff]/40 text-[#00e5ff]' : ''}"
      data-picker-id="${pickerId}"
      data-post-id="${postId}"
      aria-label="Add reaction"
      aria-expanded="false"
    ><span class="text-sm font-bold text-indigo-400 leading-none" aria-hidden="true">${userActiveEmoji || '＋'}</span
    ><span class="text-[11px] font-medium">${userActiveEmoji ? 'Reacted' : 'React'}</span></button>
    <div
      id="${pickerId}"
      class="reactions-picker hidden"
      role="dialog"
      aria-label="Emoji reactions picker"
    >${pickerItems}<div class="col-span-4 border-t border-white/10 mt-1 pt-1.5 flex justify-end"
      ><button type="button" class="close-picker-btn text-[11px] text-slate-400 hover:text-white px-2 py-0.5 font-sans transition-colors cursor-pointer"
               data-picker-id="${pickerId}">Close ✕</button></div></div>
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
    this.AVAILABLE_REACTIONS.forEach((avail) => {
      const alreadyActive = avail.emoji === userActiveEmoji;
      const activeStyle = alreadyActive
        ? 'ring-2 ring-indigo-400 bg-indigo-500/20 text-white font-bold'
        : 'hover:bg-surface-overlay text-slate-300 hover:text-white';

      pickerButtonsHtml += `
        <button
          type="button"
          class="btn-portal-reaction flex flex-col items-center gap-0.5 p-2 rounded-xl text-sm transition-all duration-150 cursor-pointer ${activeStyle} active:scale-95"
          data-post-id="${postId}"
          data-emoji="${this._escapeAttr(avail.emoji)}"
          title="${this._escapeAttr(avail.label)}"
          aria-label="${this._escapeAttr(avail.label)}"
        >
          <span class="text-xl leading-none transition-transform hover:scale-125">${avail.emoji}</span>
          <span class="text-[10px] text-slate-400 font-sans mt-0.5">${this._escapeHtml(avail.label)}</span>
        </button>
      `;
    });

    portal.className = 'reactions-portal fixed z-[10000] animate-in fade-in zoom-in-95 duration-150';
    portal.innerHTML = `
      <div
        class="reactions-picker-portal-card bg-surface-overlay/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-3 grid grid-cols-4 gap-1.5 w-64 max-w-[calc(100vw-1.5rem)] text-white"
        role="dialog"
        aria-label="Emoji reactions selector"
      >
        ${pickerButtonsHtml}
        <div class="col-span-4 border-t border-white/10 mt-1 pt-1.5 flex items-center justify-between">
          <span class="text-[10px] text-slate-400 font-mono">React to post</span>
          <button type="button" class="btn-close-portal text-[11px] text-slate-400 hover:text-white px-2 py-0.5 font-sans transition-colors cursor-pointer rounded hover:bg-white/5">Close ✕</button>
        </div>
      </div>
    `;

    // Position dynamically relative to trigger with collision detection
    this._repositionPortal(triggerEl, portal);

    // Bind item click events inside portal
    portal.querySelectorAll<HTMLButtonElement>('.btn-portal-reaction').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const em = btn.getAttribute('data-emoji');
        if (em) {
          this.toggleReaction(postId, em, userFP);
          if (onReactionSelect) onReactionSelect(em);
          this.closePortalPicker();
        }
      });
    });

    portal.querySelector('.btn-close-portal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closePortalPicker();
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
        this.closePortalPicker();
        triggerEl.focus();
      }
    };
    window.addEventListener('keydown', this.portalKeydownListener);

    // Reposition or dismiss on scroll
    this.portalScrollListener = () => {
      if (this.activePortalTrigger && portal) {
        this._repositionPortal(this.activePortalTrigger, portal);
      }
    };
    window.addEventListener('scroll', this.portalScrollListener, { passive: true });
    window.addEventListener('resize', this.portalScrollListener, { passive: true });
  }

  private _repositionPortal(triggerEl: HTMLElement, portal: HTMLElement): void {
    const rect = triggerEl.getBoundingClientRect();
    const isMobile = window.innerWidth < 480;
    const popoverWidth = 256;
    const popoverHeight = 150;
    const margin = 8;

    if (isMobile) {
      // Anchored compact mobile sheet
      portal.style.left = '50%';
      portal.style.transform = 'translateX(-50%)';
      if (rect.top > popoverHeight + margin) {
        portal.style.top = `${Math.max(margin, rect.top - popoverHeight - margin)}px`;
        portal.style.bottom = 'auto';
      } else {
        portal.style.top = `${Math.min(window.innerHeight - popoverHeight - margin, rect.bottom + margin)}px`;
        portal.style.bottom = 'auto';
      }
      return;
    }

    portal.style.transform = 'none';

    // Vertical positioning: check space above vs below
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    let top = 0;

    if (spaceAbove >= popoverHeight + margin) {
      // Render above trigger
      top = rect.top - popoverHeight - margin;
    } else {
      // Flip below trigger
      top = rect.bottom + margin;
    }

    // Horizontal positioning: align with trigger left, clamp to viewport
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - margin) {
      left = window.innerWidth - popoverWidth - margin;
    }
    left = Math.max(margin, left);

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
