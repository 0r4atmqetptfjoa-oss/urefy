import { clientStore } from './client-state.js';
import { toastManager } from './toast.js';
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

  public init(): void {
    if (this.isInitialized || typeof document === 'undefined') return;
    this.isInitialized = true;

    this.boundKeyHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    document.addEventListener('keydown', this.boundKeyHandler);
  }

  public destroy(): void {
    if (!this.isInitialized || typeof document === 'undefined') return;
    if (this.boundKeyHandler) {
      document.removeEventListener('keydown', this.boundKeyHandler);
      this.boundKeyHandler = null;
    }
    this.isInitialized = false;
    this.activeIndex = -1;
  }

  public openHelpModal(): void {
    this.isHelpModalOpen = true;
    clientStore.notify();
  }

  public closeHelpModal(): void {
    this.isHelpModalOpen = false;
    clientStore.notify();
  }

  public toggleHelpModal(): void {
    this.isHelpModalOpen = !this.isHelpModalOpen;
    clientStore.notify();
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
    ).filter((el) => {
      // Exclude cards inside modals or sidebars
      return !el.closest('#app-modal-root') && !el.closest('aside');
    });
  }

  public selectNext(): void {
    const cards = this.getPostCards();
    if (cards.length === 0) return;

    if (this.activeIndex < cards.length - 1) {
      this.setActiveIndex(this.activeIndex + 1, cards);
    } else {
      this.setActiveIndex(0, cards);
    }
  }

  public selectPrevious(): void {
    const cards = this.getPostCards();
    if (cards.length === 0) return;

    if (this.activeIndex > 0) {
      this.setActiveIndex(this.activeIndex - 1, cards);
    } else {
      this.setActiveIndex(cards.length - 1, cards);
    }
  }

  public setActiveIndex(index: number, cardsList?: HTMLElement[]): void {
    const cards = cardsList || this.getPostCards();
    if (cards.length === 0) return;

    // Remove active class from previous
    cards.forEach((c) => c.classList.remove('card-keyboard-active'));

    if (index >= 0 && index < cards.length) {
      this.activeIndex = index;
      const card = cards[index];
      card.classList.add('card-keyboard-active');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  public getActivePostId(): string | null {
    const cards = this.getPostCards();
    if (this.activeIndex < 0 || this.activeIndex >= cards.length) return null;
    const card = cards[this.activeIndex];
    return (
      card.getAttribute('data-post-card-id') ||
      card.getAttribute('data-post-id') ||
      null
    );
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
    if (commentBtn) {
      commentBtn.click();
    }
    const replyInput = card.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    if (replyInput) {
      replyInput.focus();
    }
  }

  public triggerActiveMedia(): void {
    const cards = this.getPostCards();
    if (this.activeIndex < 0 || this.activeIndex >= cards.length) return;
    const card = cards[this.activeIndex];
    const mediaEl = card.querySelector<HTMLElement>('img, video, .media-lightbox-trigger');
    if (mediaEl) {
      mediaEl.click();
    }
  }

  public handleKeyDown(e: KeyboardEvent): void {
    // Esc is handled universally
    if (e.key === 'Escape') {
      if (this.isHelpModalOpen) {
        this.closeHelpModal();
        e.preventDefault();
        return;
      }
    }

    // Question mark (?) toggles the shortcut modal even if shifted
    if (e.key === '?' && !this.isInputFocused()) {
      e.preventDefault();
      this.toggleHelpModal();
      return;
    }

    // Ignore single key navigation when typing into inputs
    if (this.isInputFocused()) return;

    // Do not conflict with Ctrl or Meta modifier combinations (e.g. Ctrl+K)
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

    return `
      <div id="keyboard-shortcuts-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4 animate-fade-in pointer-events-auto">
        <div class="bg-surface-base border border-white/15 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative overflow-hidden" onclick="event.stopPropagation()">
          
          <!-- MODAL HEADER -->
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-lg shadow-inner">
                ⌨️
              </div>
              <div>
                <h3 class="text-base font-bold text-white tracking-wide font-sans flex items-center space-x-2">
                  <span>Keyboard Shortcuts</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-semibold">Vim Mode</span>
                </h3>
                <p class="text-xs text-slate-400 font-sans">Power navigation & sovereign actions</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-shortcuts-modal"
              class="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-sm font-mono"
            >
              ✕
            </button>
          </div>

          <!-- SHORTCUTS LIST -->
          <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            ${SOVEREIGN_SHORTCUTS.map(s => `
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-raised/80 border border-white/5 text-xs">
                <span class="text-slate-300 font-sans font-medium">${s.description}</span>
                <kbd class="px-2.5 py-1 rounded-lg bg-surface-base border border-white/15 text-slate-100 font-mono text-[11px] font-bold shadow-sm">
                  ${s.key}
                </kbd>
              </div>
            `).join('')}
          </div>

          <!-- FOOTER TIP -->
          <div class="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span>Press <kbd class="px-1.5 py-0.5 rounded bg-surface-raised font-mono font-bold text-slate-200 border border-white/10">?</kbd> anywhere to toggle</span>
            <button
              type="button"
              id="btn-dismiss-shortcuts-modal"
              class="px-4 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 text-xs font-bold border border-white/10 transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>

        </div>
      </div>
    `;
  }

  public bindModalEvents(): void {
    if (!this.isHelpModalOpen) return;

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
