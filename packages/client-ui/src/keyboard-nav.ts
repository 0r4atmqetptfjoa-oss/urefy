/**
 * @file keyboard-nav.ts
 * @package @aetheris/client-ui
 * @description 2027 Sovereign Spatial Keyboard Navigation & Vim Command Engine.
 * Strictly CSP-compliant (zero inline eval/onclick strings) with View Transitions API support.
 */

import { clientStore } from './client-state.js';
import { reactionsEngine } from './reactions.js';
import { serviceRegistry, SERVICES } from './service-registry.js';

export interface ShortcutItem {
  key: string;
  description: string;
  category: 'Navigation' | 'Actions' | 'Global';
}

export const SOVEREIGN_SHORTCUTS: ShortcutItem[] = [
  { key: 'J / ↓', description: 'Next pulse in stream', category: 'Navigation' },
  { key: 'K / ↑', description: 'Previous pulse in stream', category: 'Navigation' },
  { key: 'L', description: 'Like / Heart active pulse', category: 'Actions' },
  { key: 'U', description: 'Merit Upvote active pulse', category: 'Actions' },
  { key: 'C', description: 'Open comments / inline reply', category: 'Actions' },
  { key: 'X', description: 'Expand media lightbox', category: 'Actions' },
  { key: 'E / N', description: 'Open Sovereign Composer', category: 'Actions' },
  { key: 'Ctrl + K', description: 'Omni-Search Command Rail', category: 'Global' },
  { key: '?', description: 'Show keyboard shortcuts guide', category: 'Global' },
  { key: 'Esc', description: 'Dismiss active dialog or modal', category: 'Global' },
];

export class KeyboardNavigationEngine {
  public activeIndex: number = -1;
  public isHelpModalOpen: boolean = false;
  private isInitialized: boolean = false;
  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundClickHandler: ((e: MouseEvent) => void) | null = null;

  public init(): void {
    if (this.isInitialized || typeof document === 'undefined') return;
    this.isInitialized = true;

    this.boundKeyHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.boundClickHandler = (e: MouseEvent) => this.handleDelegatedClick(e);

    document.addEventListener('keydown', this.boundKeyHandler);
    document.addEventListener('click', this.boundClickHandler);
  }

  public destroy(): void {
    if (!this.isInitialized || typeof document === 'undefined') return;
    if (this.boundKeyHandler) {
      document.removeEventListener('keydown', this.boundKeyHandler);
      this.boundKeyHandler = null;
    }
    if (this.boundClickHandler) {
      document.removeEventListener('click', this.boundClickHandler);
      this.boundClickHandler = null;
    }
    this.isInitialized = false;
    this.activeIndex = -1;
  }

  private handleDelegatedClick(e: MouseEvent): void {
    if (!this.isHelpModalOpen) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (
      target.id === 'keyboard-shortcuts-backdrop' ||
      target.closest('#btn-close-shortcuts-modal') ||
      target.closest('#btn-dismiss-shortcuts-modal')
    ) {
      e.preventDefault();
      this.closeHelpModal();
    }
  }

  public openHelpModal(): void {
    this.isHelpModalOpen = true;
    clientStore.notifySync();
  }

  public closeHelpModal(): void {
    this.isHelpModalOpen = false;
    clientStore.notifySync();
  }

  public toggleHelpModal(): void {
    this.isHelpModalOpen = !this.isHelpModalOpen;
    clientStore.notifySync();
  }

  private isInputFocused(): boolean {
    if (typeof document === 'undefined') return false;
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    return (
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      (active as HTMLElement).isContentEditable
    );
  }

  public getPostCards(): HTMLElement[] {
    if (typeof document === 'undefined') return [];
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-post-card-id], [data-post-id], article.rounded-2xl, .sovereign-post-card'
      )
    ).filter((el) => !el.closest('#app-modal-root') && !el.closest('aside'));
  }

  public selectNext(): void {
    const cards = this.getPostCards();
    if (cards.length === 0) return;

    const nextIdx = this.activeIndex < cards.length - 1 ? this.activeIndex + 1 : 0;
    this.setActiveIndex(nextIdx, cards);
  }

  public selectPrevious(): void {
    const cards = this.getPostCards();
    if (cards.length === 0) return;

    const prevIdx = this.activeIndex > 0 ? this.activeIndex - 1 : cards.length - 1;
    this.setActiveIndex(prevIdx, cards);
  }

  public setActiveIndex(index: number, cardsList?: HTMLElement[]): void {
    const cards = cardsList || this.getPostCards();
    if (cards.length === 0) return;

    const applyFocusRing = () => {
      cards.forEach((c) => {
        c.classList.remove('card-keyboard-active');
        if (typeof c.removeAttribute === 'function') {
          c.removeAttribute('data-keyboard-focused');
        }
      });

      if (index >= 0 && index < cards.length) {
        this.activeIndex = index;
        const card = cards[index];
        card.classList.add('card-keyboard-active');
        if (typeof card.setAttribute === 'function') {
          card.setAttribute('data-keyboard-focused', 'true');
        }
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    applyFocusRing();
  }

  public getActivePostId(): string | null {
    const cards = this.getPostCards();
    if (this.activeIndex < 0 || this.activeIndex >= cards.length) return null;
    const card = cards[this.activeIndex];
    return card.getAttribute('data-post-card-id') || card.getAttribute('data-post-id') || null;
  }

  public triggerActiveLike(): void {
    const cards = this.getPostCards();
    if (this.activeIndex < 0 || this.activeIndex >= cards.length) return;
    const card = cards[this.activeIndex];
    const likeBtn = card.querySelector<HTMLElement>('.btn-pulse-like, .btn-like, [data-action="like"]');
    if (likeBtn) {
      likeBtn.click();
    } else {
      const postId = this.getActivePostId();
      if (postId) {
        reactionsEngine.toggleReaction(postId, '❤️', clientStore.keypair.fingerprint);
      }
    }
  }

  public triggerActiveUpvote(): void {
    const cards = this.getPostCards();
    if (this.activeIndex < 0 || this.activeIndex >= cards.length) return;
    const card = cards[this.activeIndex];
    const upvoteBtn = card.querySelector<HTMLElement>('.btn-upvote, [data-dir="1"]');
    if (upvoteBtn) {
      upvoteBtn.click();
    } else {
      const postId = this.getActivePostId();
      if (postId) {
        clientStore.votePost(postId, 1);
      }
    }
  }

  public triggerActiveComments(): void {
    const cards = this.getPostCards();
    if (this.activeIndex < 0 || this.activeIndex >= cards.length) return;
    const card = cards[this.activeIndex];
    const commentBtn = card.querySelector<HTMLElement>('.btn-comments, [data-action="comments"]');
    if (commentBtn) commentBtn.click();
    const replyInput = card.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    if (replyInput) replyInput.focus();
  }

  public triggerActiveMedia(): void {
    const cards = this.getPostCards();
    if (this.activeIndex < 0 || this.activeIndex >= cards.length) return;
    const card = cards[this.activeIndex];
    const mediaEl = card.querySelector<HTMLElement>('img, video, .media-lightbox-trigger');
    if (mediaEl) mediaEl.click();
  }

  public handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isHelpModalOpen) {
      this.closeHelpModal();
      e.preventDefault();
      return;
    }

    if (e.key === '?' && !this.isInputFocused()) {
      e.preventDefault();
      this.toggleHelpModal();
      return;
    }

    if (this.isInputFocused()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
      case 'j':
      case 'J':
      case 'ArrowDown':
        e.preventDefault();
        this.selectNext();
        break;
      case 'k':
      case 'K':
      case 'ArrowUp':
        e.preventDefault();
        this.selectPrevious();
        break;
      case 'l':
      case 'L':
        e.preventDefault();
        this.triggerActiveLike();
        break;
      case 'u':
      case 'U':
        e.preventDefault();
        this.triggerActiveUpvote();
        break;
      case 'c':
      case 'C':
        e.preventDefault();
        this.triggerActiveComments();
        break;
      case 'x':
      case 'X':
        e.preventDefault();
        this.triggerActiveMedia();
        break;
      case 'e':
      case 'E':
      case 'n':
      case 'N':
        e.preventDefault();
        clientStore.isComposerOpen = true;
        clientStore.notify();
        break;
    }
  }

  public renderHelpModalHTML(): string {
    if (!this.isHelpModalOpen) return '';

    const categories: Array<'Navigation' | 'Actions' | 'Global'> = ['Navigation', 'Actions', 'Global'];

    return `
      <div
        id="keyboard-shortcuts-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        class="sovereign-modal-backdrop fixed inset-0 bg-black/75 backdrop-blur-xl z-[10000] flex items-center justify-center p-4 animate-fade-in pointer-events-auto"
      >
        <div
          class="sovereign-glass-surface bg-surface-base/90 border border-white/15 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative overflow-hidden"
          data-action="stop-propagation"
        >
          <!-- AMBIENT SPECULAR GLOW -->
          <div class="pointer-events-none absolute -top-24 -right-24 w-56 h-56 rounded-full bg-indigo-500/15 blur-3xl"></div>

          <!-- MODAL HEADER -->
          <div class="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
            <div class="flex items-center space-x-3.5">
              <div class="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="4" width="20" height="16" rx="3"/>
                  <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>
                </svg>
              </div>
              <div>
                <h3 id="shortcuts-modal-title" class="text-base font-bold text-white tracking-tight font-sans flex items-center space-x-2">
                  <span>Keyboard Shortcuts</span>
                  <span class="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase font-semibold tracking-wider">Vim Mode</span>
                </h3>
                <p class="text-xs text-slate-400 font-sans">Spatial stream navigation & instant cryptographic actions</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-shortcuts-modal"
              aria-label="Close modal"
              class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-sm font-mono min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          <!-- CATEGORIZED SHORTCUTS BENTO GRID -->
          <div class="space-y-4 max-h-[62vh] overflow-y-auto pr-1 relative z-10">
            ${categories
              .map(
                (cat) => `
              <div class="space-y-2">
                <div class="text-[10px] font-mono uppercase tracking-widest text-indigo-300/80 px-1 font-semibold">${cat}</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  ${SOVEREIGN_SHORTCUTS.filter((s) => s.category === cat)
                    .map(
                      (s) => `
                    <div class="flex items-center justify-between p-2.5 rounded-2xl bg-surface-raised/70 hover:bg-surface-raised border border-white/8 transition-colors text-xs">
                      <span class="text-slate-200 font-sans font-medium pr-2">${s.description}</span>
                      <kbd class="px-2.5 py-1 rounded-lg bg-surface-base/90 border border-white/15 text-indigo-200 font-mono text-[11px] font-bold shadow-sm shrink-0">
                        ${s.key}
                      </kbd>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- FOOTER TIP -->
          <div class="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-sans relative z-10">
            <span>Press <kbd class="px-1.5 py-0.5 rounded bg-surface-raised font-mono font-bold text-slate-200 border border-white/10">?</kbd> anywhere to toggle</span>
            <button
              type="button"
              id="btn-dismiss-shortcuts-modal"
              class="px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-xs font-bold border border-indigo-400/30 transition-all cursor-pointer min-h-[44px]"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    `;
  }

  public bindModalEvents(): void {
    if (!this.isHelpModalOpen || typeof document === 'undefined') return;
    document.getElementById('btn-close-shortcuts-modal')?.addEventListener('click', () => this.closeHelpModal());
    document.getElementById('btn-dismiss-shortcuts-modal')?.addEventListener('click', () => this.closeHelpModal());
    document.getElementById('keyboard-shortcuts-backdrop')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('keyboard-shortcuts-backdrop')) {
        this.closeHelpModal();
      }
    });
  }

  public bindGlobalShortcuts(): void {
    this.init();
  }

  public showModal(): void {
    this.openHelpModal();
  }

  public hideModal(): void {
    this.closeHelpModal();
  }

  public renderModal(): string {
    return this.renderHelpModalHTML();
  }

  public renderHelpModal(): string {
    return this.renderHelpModalHTML();
  }
}

export const keyboardNav = new KeyboardNavigationEngine();
export const keyboardNavigator = keyboardNav;
serviceRegistry.registerInstance(SERVICES.KeyboardNav, keyboardNav);
