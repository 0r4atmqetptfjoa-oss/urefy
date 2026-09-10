import { clientStore } from './client-state.js';
import { offlineSync } from './offline-sync.js';
import { toastManager } from './toast.js';
import { bookmarksVault } from './bookmarks.js';

export class TouchGestureEngine {
  public isRefreshing: boolean = false;
  public pullDistance: number = 0;
  private startY: number = 0;
  private startX: number = 0;
  private isPulling: boolean = false;
  private hasVibrated: boolean = false;
  private activeSwipedCard: HTMLElement | null = null;
  private swipeStartX: number = 0;
  private swipeStartY: number = 0;
  private swipeDeltaX: number = 0;
  private isSwipingCard: boolean = false;
  private boundTouchStart: ((e: TouchEvent) => void) | null = null;
  private boundTouchMove: ((e: TouchEvent) => void) | null = null;
  private boundTouchEnd: ((e: TouchEvent) => void) | null = null;

  public init(): void {
    if (typeof document === 'undefined') return;

    // Hot reloads and shell re-mounts must never stack gesture listeners.
    this.destroy();

    this.boundTouchStart = (e: TouchEvent) => this.handleTouchStart(e);
    this.boundTouchMove = (e: TouchEvent) => this.handleTouchMove(e);
    this.boundTouchEnd = (e: TouchEvent) => this.handleTouchEnd(e);

    document.addEventListener('touchstart', this.boundTouchStart, { passive: true });
    document.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    document.addEventListener('touchend', this.boundTouchEnd, { passive: true });
    document.addEventListener('touchcancel', this.boundTouchEnd, { passive: true });
  }

  public destroy(): void {
    if (typeof document === 'undefined') return;
    if (this.boundTouchStart) document.removeEventListener('touchstart', this.boundTouchStart);
    if (this.boundTouchMove) document.removeEventListener('touchmove', this.boundTouchMove);
    if (this.boundTouchEnd) {
      document.removeEventListener('touchend', this.boundTouchEnd);
      document.removeEventListener('touchcancel', this.boundTouchEnd);
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    this.startY = touch.clientY;
    this.startX = touch.clientX;
    this.hasVibrated = false;
    this.pullDistance = 0;

    // Check if touch is on a post card
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], #mobile-drawer')) {
      this.isPulling = false;
      this.activeSwipedCard = null;
      return;
    }
    const card = target.closest<HTMLElement>('[data-post-card-id], [data-post-id], article.rounded-2xl');
    if (card && !target.closest('button, a, input, textarea, video, audio')) {
      this.activeSwipedCard = card;
      this.swipeStartX = touch.clientX;
      this.swipeStartY = touch.clientY;
      this.swipeDeltaX = 0;
      this.isSwipingCard = false;
    } else {
      this.activeSwipedCard = null;
    }

    // Check if scroll is at top of page for pull-to-refresh
    const scrollHost = target.closest<HTMLElement>('#main-feed-scroll, [data-scroll-container], .overflow-y-auto');
    const scrollY = scrollHost?.scrollTop ?? window.scrollY ?? document.documentElement.scrollTop ?? 0;
    this.isPulling = scrollY <= 2;
  }

  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dy = touch.clientY - this.startY;
    const dx = touch.clientX - this.startX;

    // 1. Pull-to-Refresh handling
    const target = e.target as HTMLElement;
    const scrollHost = target.closest<HTMLElement>('#main-feed-scroll, [data-scroll-container], .overflow-y-auto');
    const scrollY = scrollHost?.scrollTop ?? window.scrollY ?? document.documentElement.scrollTop ?? 0;
    if (this.isPulling && scrollY <= 2 && dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      // Elastic log-damped curve
      this.pullDistance = Math.min(dy * 0.42, 85);

      if (e.cancelable && this.pullDistance > 10) {
        e.preventDefault(); // Prevent native overscroll when custom pull is active
      }

      const indicator = document.getElementById('pull-to-refresh-indicator');
      if (indicator) {
        indicator.style.transform = `translateY(${this.pullDistance}px) translateZ(0)`;
        indicator.style.opacity = String(Math.min(this.pullDistance / 40, 1));

        const icon = indicator.querySelector('.pull-icon') as HTMLElement;
        if (icon) {
          icon.style.transform = `rotate(${this.pullDistance * 4.5}deg)`;
        }

        if (this.pullDistance >= 55) {
          indicator.classList.add('pull-ready');
          if (!this.hasVibrated) {
            this.hasVibrated = true;
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(15); } catch (_) {}
            }
          }
        } else {
          indicator.classList.remove('pull-ready');
        }
      }
      return;
    }

    // 2. Card horizontal swipe handling
    if (this.activeSwipedCard && Math.abs(dx) > Math.abs(dy) * 1.8 && Math.abs(dx) > 15) {
      this.isSwipingCard = true;
      this.swipeDeltaX = dx * 0.48; // damping
      this.activeSwipedCard.style.transform = `translateX(${this.swipeDeltaX}px) translateZ(0)`;
      this.activeSwipedCard.style.transition = 'none';

      if (Math.abs(this.swipeDeltaX) > 40 && !this.hasVibrated) {
        this.hasVibrated = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(12); } catch (_) {}
        }
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    // 1. Resolve Pull-to-Refresh
    if (this.pullDistance >= 55 && !this.isRefreshing) {
      this.triggerRefresh();
    } else {
      this.resetPullIndicator();
    }

    // 2. Resolve Card Swipe Action
    if (this.activeSwipedCard && this.isSwipingCard) {
      const card = this.activeSwipedCard;
      const postId = card.getAttribute('data-post-card-id') || card.getAttribute('data-post-id');

      if (this.swipeDeltaX > 50) {
        // Swiped Right -> Reply action
        toastManager.info('↩️ Opening reply thread...', '💬');
        const replyBtn = card.querySelector<HTMLElement>('.btn-comments, [data-action="comments"]');
        if (replyBtn) {
          replyBtn.click();
        } else {
          clientStore.isComposerOpen = true;
          clientStore.notify();
        }
      } else if (this.swipeDeltaX < -50 && postId) {
        // Swiped Left -> Bookmark toggle
        const post = clientStore.posts.find(p => p.id === postId);
        if (post) {
          bookmarksVault.toggleBookmark(post);
        }
      }

      // Animate back to original position
      card.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      card.style.transform = 'translateX(0) translateZ(0)';
      setTimeout(() => {
        card.style.transition = '';
      }, 250);
    }

    this.activeSwipedCard = null;
    this.isSwipingCard = false;
    this.isPulling = false;
    this.pullDistance = 0;
  }

  public triggerRefresh(): void {
    this.isRefreshing = true;
    const indicator = document.getElementById('pull-to-refresh-indicator');
    if (indicator) {
      indicator.classList.add('is-refreshing');
      indicator.style.transform = 'translateY(55px) translateZ(0)';
    }

    // Sync from edge and outbox
    Promise.all([
      clientStore.syncFromEdge(),
      offlineSync.syncQueue(),
    ]).finally(() => {
      setTimeout(() => {
        this.isRefreshing = false;
        toastManager.success('✨ Feed synchronized from Sovereign Edge', '⚡');
        this.resetPullIndicator();
      }, 400);
    });
  }

  private resetPullIndicator(): void {
    const indicator = document.getElementById('pull-to-refresh-indicator');
    if (indicator) {
      indicator.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease';
      indicator.style.transform = 'translateY(0) translateZ(0)';
      indicator.style.opacity = '0';
      indicator.classList.remove('pull-ready', 'is-refreshing');
      setTimeout(() => {
        if (indicator) indicator.style.transition = '';
      }, 300);
    }
  }

  public renderIndicatorHTML(): string {
    return `
      <div id="pull-to-refresh-indicator" class="fixed top-12 inset-x-0 mx-auto w-10 h-10 rounded-full bg-surface-raised border border-white/20 shadow-xl flex items-center justify-center z-50 pointer-events-none opacity-0 transition-transform duration-75">
        <span class="pull-icon text-sm text-cyan-400 font-bold transition-transform">⚡</span>
      </div>
    `;
  }
}

export const touchGestureEngine = new TouchGestureEngine();
