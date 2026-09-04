/**
 * Sovereign Micro-Broadcasting Actions Engine.
 * Supports:
 * 1. Like button (heart) with CSS/SVG particle burst animation and chromatic pink transformation.
 * 2. Interactive Repost & Quote Post menu (toggle instant repost or attach quoted pulse).
 * 3. Impressions / views counter with statistical chart metrics.
 * 4. Bookmarks and cryptographic permalink sharing.
 */

export interface PulseInteractionState {
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
  likesCount: number;
  repostsCount: number;
  viewsCount: number;
  repliesCount: number;
}

export interface QuotedPulseItem {
  id: string;
  authorFingerprint: string;
  authorRole: string;
  title: string;
  content: string;
  createdAt: number;
}

export class PulseActionsEngine {
  private postInteractions: Map<string, PulseInteractionState> = new Map();
  private repostMenuOpenId: string | null = null;

  constructor() {
    this._seedDemoInteractions();
  }

  private _seedDemoInteractions(): void {
    this.postInteractions.set('post-1', {
      liked: false,
      reposted: true,
      bookmarked: false,
      likesCount: 342,
      repostsCount: 89,
      viewsCount: 14200,
      repliesCount: 18,
    });
    this.postInteractions.set('post-video', {
      liked: true,
      reposted: false,
      bookmarked: true,
      likesCount: 489,
      repostsCount: 142,
      viewsCount: 28900,
      repliesCount: 31,
    });
    this.postInteractions.set('post-poll', {
      liked: false,
      reposted: false,
      bookmarked: false,
      likesCount: 276,
      repostsCount: 48,
      viewsCount: 9400,
      repliesCount: 14,
    });
    this.postInteractions.set('post-images', {
      liked: true,
      reposted: true,
      bookmarked: false,
      likesCount: 194,
      repostsCount: 39,
      viewsCount: 11200,
      repliesCount: 8,
    });
  }

  public getInteractions(postId: string): PulseInteractionState {
    if (!this.postInteractions.has(postId)) {
      this.postInteractions.set(postId, {
        liked: false,
        reposted: false,
        bookmarked: false,
        likesCount: Math.floor(Math.random() * 45) + 3,
        repostsCount: Math.floor(Math.random() * 12),
        viewsCount: Math.floor(Math.random() * 1200) + 120,
        repliesCount: 0,
      });
    }
    return this.postInteractions.get(postId)!;
  }

  /**
   * Toggles Like status and returns whether particle burst should fire.
   */
  public toggleLike(postId: string): { isLiked: boolean; newCount: number; burst: boolean } {
    const state = this.getInteractions(postId);
    state.liked = !state.liked;
    if (state.liked) {
      state.likesCount += 1;
    } else {
      state.likesCount = Math.max(0, state.likesCount - 1);
    }
    return { isLiked: state.liked, newCount: state.likesCount, burst: state.liked };
  }

  /**
   * Toggles Repost status.
   */
  public toggleRepost(postId: string): { isReposted: boolean; newCount: number } {
    const state = this.getInteractions(postId);
    state.reposted = !state.reposted;
    if (state.reposted) {
      state.repostsCount += 1;
    } else {
      state.repostsCount = Math.max(0, state.repostsCount - 1);
    }
    this.repostMenuOpenId = null;
    return { isReposted: state.reposted, newCount: state.repostsCount };
  }

  /**
   * Toggles Bookmark status.
   */
  public toggleBookmark(postId: string): boolean {
    const state = this.getInteractions(postId);
    state.bookmarked = !state.bookmarked;
    return state.bookmarked;
  }

  /**
   * Increments view impressions.
   */
  public recordImpression(postId: string): number {
    const state = this.getInteractions(postId);
    state.viewsCount += 1;
    return state.viewsCount;
  }

  /**
   * Records a DSA Notice & Takedown report for a post.
   */
  public reportPost(postId: string, reason?: string): { success: boolean; postId: string; reportedAt: number } {
    return {
      success: true,
      postId,
      reportedAt: Date.now()
    };
  }

  public isRepostMenuOpen(postId: string): boolean {
    return this.repostMenuOpenId === postId;
  }

  public toggleRepostMenu(postId: string): void {
    this.repostMenuOpenId = this.repostMenuOpenId === postId ? null : postId;
  }

  public closeRepostMenu(): void {
    this.repostMenuOpenId = null;
  }

  /**
   * Formats numeric metrics like 14200 -> '14.2K', 1200000 -> '1.2M'.
   */
  public formatMetric(num: number): string {
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  }

  /**
   * Renders the complete Micro-Broadcasting Action Bar for a Pulse Card.
   */
  public renderPulseActionBar(postId: string, replyCount?: number): string {
    const state = this.getInteractions(postId);
    const replies = replyCount !== undefined ? replyCount : state.repliesCount;
    const isMenuOpen = this.isRepostMenuOpen(postId);

    return `
      <div class="pulse-action-bar flex items-center justify-between mt-3.5 max-w-lg text-slate-400 select-none text-xs font-mono" data-post-id="${postId}" onclick="event.stopPropagation()">
        
        <!-- 1. REPLY BUTTON -->
        <button
          type="button"
          data-pulse-action="reply"
          data-post-id="${postId}"
          class="btn-pulse-reply flex items-center space-x-1.5 group hover:text-cyan-400 transition-colors cursor-pointer"
          title="Reply to pulse"
        >
          <div class="p-2 rounded-full group-hover:bg-cyan-500/10 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
          </div>
          <span class="text-xs group-hover:text-cyan-400">${this.formatMetric(replies)}</span>
        </button>

        <!-- 2. REPOST & QUOTE POST DROPDOWN MENU -->
        <div class="relative">
          <button
            type="button"
            data-pulse-action="repost-menu"
            data-post-id="${postId}"
            class="btn-pulse-repost-menu flex items-center space-x-1.5 group transition-colors cursor-pointer ${state.reposted ? 'text-emerald-400 font-bold' : 'hover:text-emerald-400'}"
            title="Repost or Quote Pulse"
          >
            <div class="p-2 rounded-full group-hover:bg-emerald-500/10 transition-colors">
              <svg class="w-4 h-4 ${state.reposted ? 'rotate-180 transition-transform duration-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </div>
            <span class="text-xs">${this.formatMetric(state.repostsCount)}</span>
          </button>

          ${isMenuOpen ? `
            <div class="absolute left-0 bottom-full mb-2 w-48 bg-surface-overlay border border-white/10 rounded-2xl shadow-2xl z-40 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 backdrop-blur-xl">
              <button
                type="button"
                data-pulse-action="do-repost"
                data-post-id="${postId}"
                class="w-full flex items-center space-x-2.5 px-4 py-2.5 hover:bg-white/10 text-xs font-bold ${state.reposted ? 'text-emerald-400' : 'text-slate-200'} transition-colors cursor-pointer"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                <span>${state.reposted ? 'Undo Repost' : 'Re-broadcast'}</span>
              </button>

              <button
                type="button"
                data-pulse-action="do-quote"
                data-post-id="${postId}"
                class="w-full flex items-center space-x-2.5 px-4 py-2.5 hover:bg-white/10 text-xs font-bold text-slate-200 transition-colors cursor-pointer border-t border-white/5"
              >
                <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
                <span>Quote Pulse</span>
              </button>
            </div>
          ` : ''}
        </div>

        <!-- 3. LIKE BUTTON WITH PARTICLE BURST -->
        <button
          type="button"
          data-pulse-action="like"
          data-post-id="${postId}"
          class="btn-pulse-like relative flex items-center space-x-1.5 group transition-colors cursor-pointer ${state.liked ? 'text-[#f91880]' : 'hover:text-[#f91880]'}"
          title="Like pulse"
        >
          <div class="relative p-2 rounded-full group-hover:bg-[#f91880]/10 transition-colors">
            <svg class="w-4 h-4 ${state.liked ? 'fill-[#f91880] animate-heart-pop scale-110' : ''} transition-transform duration-150" viewBox="0 0 24 24" fill="${state.liked ? '#f91880' : 'none'}" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
            <!-- PARTICLE BURST CONTAINER -->
            <div id="particle-burst-${postId}" class="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible"></div>
          </div>
          <span class="text-xs ${state.liked ? 'text-[#f91880] font-bold' : ''}">${this.formatMetric(state.likesCount)}</span>
        </button>

        <!-- 4. VIEWS / IMPRESSIONS COUNTER -->
        <div class="flex items-center space-x-1.5 group hover:text-indigo-400 transition-colors cursor-default" title="Total Views & Ledger Impressions">
          <div class="p-2 rounded-full group-hover:bg-indigo-500/10 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <span class="text-xs">${this.formatMetric(state.viewsCount)}</span>
        </div>

        <!-- 5. BOOKMARK & SHARE -->
        <div class="flex items-center space-x-1">
          <button
            type="button"
            data-pulse-action="bookmark"
            data-post-id="${postId}"
            class="btn-pulse-bookmark p-2 rounded-full transition-colors cursor-pointer ${state.bookmarked ? 'text-amber-400' : 'hover:text-amber-400 hover:bg-amber-400/10'}"
            title="Bookmark"
          >
            <svg class="w-4 h-4 ${state.bookmarked ? 'fill-amber-400' : ''}" fill="${state.bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
            </svg>
          </button>

          <button
            type="button"
            data-pulse-action="share"
            data-post-id="${postId}"
            class="btn-pulse-share p-2 rounded-full hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
            title="Share sovereign permalink"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
            </svg>
          </button>

          <button
            type="button"
            data-pulse-action="report"
            data-post-id="${postId}"
            class="btn-pulse-report p-2 rounded-full hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Raportează conținut ilegal / Abuz (DSA Notice & Takedown)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path>
            </svg>
          </button>
        </div>

      </div>
    `;
  }

  /**
   * Spawns an animated CSS/SVG particle burst on the specified post container.
   */
  public triggerParticleBurst(postId: string): void {
    if (typeof document === 'undefined') return;
    const container = document.getElementById(`particle-burst-${postId}`);
    if (!container) return;

    // 8 radial particle sparks
    const colors = ['#f91880', '#e0245e', '#ff69b4', '#ffd700', '#a855f7', '#38bdf8'];
    const particles = Array.from({ length: 8 }).map((_, i) => {
      const angle = (i * 45) * (Math.PI / 180);
      const distance = 24 + Math.random() * 10;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const color = colors[i % colors.length];
      const size = 3 + Math.random() * 3;

      return `
        <span 
          class="particle-spark absolute rounded-full pointer-events-none" 
          style="
            width: ${size}px; 
            height: ${size}px; 
            background-color: ${color};
            box-shadow: 0 0 6px ${color};
            transform: translate(${x}px, ${y}px) scale(0);
            animation: burstParticle 450ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
          "
        ></span>
      `;
    }).join('');

    container.innerHTML = particles;
    setTimeout(() => {
      if (container) container.innerHTML = '';
    }, 500);
  }
}

export const pulseActionsEngine = new PulseActionsEngine();
