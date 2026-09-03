/**
 * context-menu.ts
 * Aetheris Omni-Sphere — Context Menu Engine
 * Right-click contextual actions for posts and comments.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MenuAction {
  id: string;
  label: string;
  emoji: string;
  shortcut?: string;
  isDanger?: boolean;
  isDisabled?: boolean;
  action: () => void;
}

type MenuListener = () => void;

// ---------------------------------------------------------------------------
// Saved-posts in-memory store (no external deps)
// ---------------------------------------------------------------------------

const savedPosts = new Set<string>();

// ---------------------------------------------------------------------------
// ContextMenuEngine
// ---------------------------------------------------------------------------

export class ContextMenuEngine {
  // State
  public isOpen: boolean = false;
  public position: { x: number; y: number } = { x: 0, y: 0 };
  public targetPostId: string | null = null;
  public targetCommentId: string | null = null;

  private menuEl: HTMLElement | null = null;
  private listeners: MenuListener[] = [];

  private readonly _onDocClick: (e: MouseEvent) => void;
  private readonly _onKeyDown: (e: KeyboardEvent) => void;
  private readonly _onContextMenu: (e: MouseEvent) => void;

  constructor() {
    this._onDocClick = (e: MouseEvent) => {
      if (this.menuEl && !this.menuEl.contains(e.target as Node)) {
        this.hide();
      }
    };

    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.hide();
    };

    this._onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const postEl = target.closest<HTMLElement>('[data-post-id]');
      const commentEl = target.closest<HTMLElement>('[data-comment-id]');
      if (postEl || commentEl) {
        e.preventDefault();
        const postId = postEl?.dataset.postId ?? undefined;
        const commentId = commentEl?.dataset.commentId ?? undefined;
        this.show(e.clientX, e.clientY, postId, commentId);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('contextmenu', this._onContextMenu);
    }
  }

  public show(x: number, y: number, postId?: string, commentId?: string): void {
    this.isOpen = true;
    this.targetPostId = postId ?? null;
    this.targetCommentId = commentId ?? null;
    this.position = this._clampPosition(x, y);
    this._mount();
    this._attachGlobalListeners();
    this._notify();
  }

  public hide(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.targetPostId = null;
    this.targetCommentId = null;
    this._unmount();
    this._detachGlobalListeners();
    this._notify();
  }

  public getPostActions(postId: string): MenuAction[] {
    const isSaved = savedPosts.has(postId);
    return [
      {
        id: 'copy-link',
        label: 'Copy Link',
        emoji: '🔗',
        shortcut: 'C',
        action: () => {
          const url = `${window.location.origin}/post/${postId}`;
          navigator.clipboard.writeText(url).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = url;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          });
          this.hide();
        },
      },
      {
        id: 'save-post',
        label: isSaved ? 'Unsave' : 'Save',
        emoji: '🔖',
        shortcut: 'S',
        action: () => {
          if (savedPosts.has(postId)) {
            savedPosts.delete(postId);
          } else {
            savedPosts.add(postId);
          }
          this.hide();
        },
      },
      {
        id: 'share-hub',
        label: 'Share to Hub',
        emoji: '🔀',
        action: () => {
          const shareUrl = `${window.location.origin}/post/${postId}`;
          if (navigator.share) {
            navigator.share({ url: shareUrl }).catch(() => undefined);
          } else {
            navigator.clipboard.writeText(shareUrl).catch(() => undefined);
          }
          this.hide();
        },
      },
      {
        id: 'boost-stream',
        label: 'Boost to Stream',
        emoji: '🔁',
        action: () => {
          document.dispatchEvent(new CustomEvent('aetheris:boost', { detail: { postId } }));
          this.hide();
        },
      },
      {
        id: 'give-award',
        label: 'Give Award',
        emoji: '🏅',
        action: () => {
          document.dispatchEvent(new CustomEvent('aetheris:award', { detail: { postId } }));
          this.hide();
        },
      },
      {
        id: 'open-detail',
        label: 'Open Post Detail',
        emoji: '👁️',
        action: () => {
          window.dispatchEvent(new CustomEvent('aetheris:open-post', { detail: { postId } }));
          this.hide();
        },
      },
      {
        id: 'report-spam',
        label: 'Report Spam',
        emoji: '🚩',
        isDanger: true,
        action: () => {
          document.dispatchEvent(new CustomEvent('aetheris:report', { detail: { postId, reason: 'spam' } }));
          this.hide();
        },
      },
      {
        id: 'mute-author',
        label: 'Mute Author',
        emoji: '🔇',
        isDanger: true,
        action: () => {
          document.dispatchEvent(new CustomEvent('aetheris:mute', { detail: { postId } }));
          this.hide();
        },
      },
    ];
  }

  public getCommentActions(commentId: string): MenuAction[] {
    return [
      {
        id: 'endorse-comment',
        label: 'Endorse Comment',
        emoji: '▲',
        action: () => {
          document.dispatchEvent(new CustomEvent('aetheris:endorse-comment', { detail: { commentId } }));
          this.hide();
        },
      },
      {
        id: 'reply-comment',
        label: 'Reply',
        emoji: '💬',
        action: () => {
          document.dispatchEvent(new CustomEvent('aetheris:reply-comment', { detail: { commentId } }));
          this.hide();
        },
      },
      {
        id: 'copy-link-comment',
        label: 'Copy Link',
        emoji: '🔗',
        action: () => {
          const url = `${window.location.origin}/comment/${commentId}`;
          navigator.clipboard.writeText(url).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = url;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          });
          this.hide();
        },
      },
      {
        id: 'report-comment',
        label: 'Report',
        emoji: '🚩',
        isDanger: true,
        action: () => {
          document.dispatchEvent(new CustomEvent('aetheris:report', { detail: { commentId, reason: 'abuse' } }));
          this.hide();
        },
      },
    ];
  }

  public renderContextMenu(): string {
    const postId = this.targetPostId;
    const commentId = this.targetCommentId;
    if (!this.isOpen || (!postId && !commentId)) return '';

    const actions: MenuAction[] = postId
      ? this.getPostActions(postId)
      : commentId
        ? this.getCommentActions(commentId)
        : [];

    const normalActions = actions.filter((a) => !a.isDanger);
    const dangerActions = actions.filter((a) => a.isDanger);
    const { x, y } = this.position;

    const renderAction = (action: MenuAction): string => {
      const base = 'w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors';
      const color = action.isDanger
        ? 'text-crimson hover:bg-crimson/10'
        : 'text-slate-300 hover:bg-surface-overlay';
      const disabled = action.isDisabled ? 'opacity-40 pointer-events-none' : '';
      const shortcutBadge = action.shortcut
        ? `<span class="ml-2 shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5 leading-none">${action.shortcut}</span>`
        : '';
      return `<button class="${base} ${color} ${disabled}" data-action-id="${action.id}" ${action.isDisabled ? 'disabled' : ''}>
        <span class="flex items-center gap-2 truncate">
          <span class="text-sm leading-none">${action.emoji}</span>
          <span class="truncate">${action.label}</span>
        </span>
        ${shortcutBadge}
      </button>`;
    };

    const separator =
      normalActions.length > 0 && dangerActions.length > 0
        ? `<div class="my-1 border-t border-white/5"></div>`
        : '';

    const rows = [
      ...normalActions.map(renderAction),
      separator,
      ...dangerActions.map(renderAction),
    ].join('\n');

    return `<div id="aetheris-context-menu" style="left:${x}px; top:${y}px;" class="fixed z-[100] w-52 bg-surface-raised border border-white/10 rounded-xl shadow-2xl py-1.5 overflow-hidden animate-in fade-in" role="menu" aria-label="Context menu">
${rows}
</div>`;
  }

  public subscribe(fn: MenuListener): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
  }

  private _clampPosition(x: number, y: number): { x: number; y: number } {
    const MENU_W = 208;
    const MENU_H = 300;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    return { x: Math.min(x, vw - MENU_W - 8), y: Math.min(y, vh - MENU_H - 8) };
  }

  private _mount(): void {
    if (typeof document === 'undefined') return;
    this._unmount();
    const html = this.renderContextMenu();
    if (!html) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.trim();
    const el = wrapper.firstElementChild as HTMLElement | null;
    if (!el) return;

    const postId = this.targetPostId;
    const commentId = this.targetCommentId;
    const actions: MenuAction[] = postId
      ? this.getPostActions(postId)
      : commentId
        ? this.getCommentActions(commentId)
        : [];

    el.querySelectorAll<HTMLButtonElement>('button[data-action-id]').forEach((btn) => {
      const found = actions.find((a) => a.id === btn.dataset.actionId);
      if (found && !found.isDisabled) {
        btn.addEventListener('click', (e) => { e.stopPropagation(); found.action(); });
      }
    });

    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') { this.hide(); return; }
      const match = actions.find((a) => a.shortcut?.toUpperCase() === e.key.toUpperCase() && !a.isDisabled);
      if (match) { e.preventDefault(); match.action(); }
    });

    document.body.appendChild(el);
    this.menuEl = el;
    el.setAttribute('tabindex', '-1');
    requestAnimationFrame(() => el.focus());
  }

  private _unmount(): void {
    if (this.menuEl) { this.menuEl.remove(); this.menuEl = null; }
    if (typeof document !== 'undefined') {
      document.querySelectorAll('#aetheris-context-menu').forEach((el) => el.remove());
    }
  }

  private _attachGlobalListeners(): void {
    if (typeof document === 'undefined') return;
    document.addEventListener('mousedown', this._onDocClick, true);
    document.addEventListener('keydown', this._onKeyDown);
  }

  private _detachGlobalListeners(): void {
    if (typeof document === 'undefined') return;
    document.removeEventListener('mousedown', this._onDocClick, true);
    document.removeEventListener('keydown', this._onKeyDown);
  }

  private _notify(): void {
    for (const fn of this.listeners) { try { fn(); } catch { /* swallow */ } }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const contextMenuEngine = new ContextMenuEngine();
