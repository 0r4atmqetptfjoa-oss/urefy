import { clientStore } from '../client-state.js';
import { postDetailView } from '../post-detail.js';
import { modernChat2027 } from './modern-chat-2027.js';

class StudioRuntimeController {
  private initialized = false;
  private rafPending = false;

  public init(): void {
    if (this.initialized || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    this.initialized = true;
    (window as any).studioRuntime = this;

    this.bindGlobalDelegatedActions();

    window.addEventListener('hashchange', () => {
      this.scheduleSync();
    });

    clientStore.subscribe(() => {
      this.scheduleSync();
    });

    this.scheduleSync();
  }

  public toggleNotificationsPopover(): void {
    // Delegated via action-dispatcher
  }

  private scheduleSync(): void {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.syncCurrentRouteUI();
    });
  }

  private syncCurrentRouteUI(): void {
    const hash = (window.location.hash || '').toLowerCase();

    // Păstrăm modernChat2027 exclusiv pe ruta demo #studio-chat;
    // rutele /messages și #messages folosesc interfața reală E2EE (messages-view.ts)
    if (hash === '#studio-chat') {
      modernChat2027.mountIfOnMessagesRoute();
      return;
    }

    const legacyChatRoot = document.getElementById('urefy-modern-chat-2027-root');
    if (legacyChatRoot) {
      legacyChatRoot.remove();
      const mainStage = document.getElementById('main-stage');
      if (mainStage) {
        Array.from(mainStage.children).forEach((child) => {
          (child as HTMLElement).style.display = '';
        });
      }
    }
  }

  private bindGlobalDelegatedActions(): void {
    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Închide meniurile contextuale "⋯" deschise dacă s-a dat click în afara lor
      const moreMenuTrigger = target.closest<HTMLElement>('[data-action="toggle-post-more-menu"]');
      if (!moreMenuTrigger) {
        document.querySelectorAll<HTMLElement>('[id^="post-more-menu-"]').forEach((menu) => {
          if (!menu.classList.contains('hidden') && !menu.contains(target)) {
            menu.classList.add('hidden');
          }
        });
      }

      const actionEl = target.closest<HTMLElement>('[data-action]');
      if (!actionEl) return;

      const action = actionEl.getAttribute('data-action');
      const postId = actionEl.getAttribute('data-post-id');

      switch (action) {
        case 'toggle-post-more-menu': {
          if (!postId) return;
          e.preventDefault();
          e.stopPropagation();
          const menu = document.getElementById(`post-more-menu-${postId}`);
          if (menu) {
            const isHidden = menu.classList.contains('hidden');
            document.querySelectorAll<HTMLElement>('[id^="post-more-menu-"]').forEach((m) => {
              m.classList.add('hidden');
            });
            if (isHidden) {
              menu.classList.remove('hidden');
            }
          }
          break;
        }

        case 'open-post-detail': {
          if (!postId) return;
          // Evităm declanșarea dacă utilizatorul a selectat text sau a dat click pe un link intern
          if (window.getSelection()?.toString().length) return;
          if (target.closest('a, button:not([data-action="open-post-detail"])')) return;

          e.preventDefault();
          if (postDetailView && typeof (postDetailView as any).openPost === 'function') {
            (postDetailView as any).openPost(postId);
          } else {
            (clientStore as any).selectPost?.(postId);
          }
          break;
        }

        case 'toggle-post-reaction': {
          if (!postId) return;
          const emoji = actionEl.getAttribute('data-reaction');
          if (!emoji) return;
          e.preventDefault();
          e.stopPropagation();
          if (typeof (clientStore as any).togglePostReaction === 'function') {
            (clientStore as any).togglePostReaction(postId, emoji);
          }
          break;
        }
      }
    });
  }
}

export const studioRuntime = new StudioRuntimeController();