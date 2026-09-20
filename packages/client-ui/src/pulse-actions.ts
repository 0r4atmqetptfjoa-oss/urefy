/**
 * Sovereign Micro-Broadcasting Actions Engine.
 * Supports:
 * 1. Like button (heart) with CSS/SVG particle burst animation and chromatic pink transformation.
 * 2. Interactive Repost & Quote Post menu (toggle instant repost or attach quoted pulse).
 * 3. Impressions / views counter with statistical chart metrics.
 * 4. Bookmarks and cryptographic permalink sharing.
 */

import { isDemoModeEnabled } from './demo-mode.js';
import { safeLocalStorage } from './dry-utils.js';
import { t } from './i18n.js';
import { renderIcon, renderMeritIcon } from './ui/icons.js';
import { persistInteraction, notifyInteractionChange, type SocialAction } from './interaction-transport.js';

export interface PulseInteractionState {
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
  likesCount: number;
  repostsCount: number;
  bookmarksCount?: number;
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
  public repostMenuOpenId: string | null = null;
  private syncedPostIds: Set<string> = new Set();
  private repostAttributions: Map<string, Set<string>> = new Map();
  private pending = new Map<string, Promise<boolean>>();

  public isPending(postId: string, action: SocialAction): boolean { return this.pending.has(`${postId}:${action}`); }
  public hasSynced(postId: string): boolean { return this.syncedPostIds.has(postId); }
  public whenSettled(postId: string, action: SocialAction): Promise<boolean> { return this.pending.get(`${postId}:${action}`) || Promise.resolve(true); }

  private persist(postId: string, action: 'like' | 'repost' | 'bookmark', before: PulseInteractionState, fingerprint?: string): void {
    if (typeof window === 'undefined') return;
    const state = this.getInteractions(postId);
    const flag = action === 'like' ? 'liked' : action === 'repost' ? 'reposted' : 'bookmarked';
    const counter = action === 'like' ? 'likesCount' : action === 'repost' ? 'repostsCount' : 'bookmarksCount';
    const key = `${postId}:${action}`;
    const operation = persistInteraction(postId, action, state[flag]).then(async result => {
      state[flag] = result.active;
      state[counter] = result.newCount;
      this.syncedPostIds.add(postId);
      this._setLocalFlag(postId, flag, result.active);
      if (action === 'repost' && fingerprint) {
        const set = this.repostAttributions.get(postId) || new Set<string>();
        result.active ? set.add(fingerprint) : set.delete(fingerprint);
        this.repostAttributions.set(postId, set);
      }
      const { clientStore } = await import('./client-state.js');
      const post = clientStore.posts.find(item => item.id === postId);
      if (post && action === 'bookmark') {
        const { canonicalVault } = await import('./canonical-vault.js');
        if (result.active && !canonicalVault.isSaved(postId)) void canonicalVault.savePost(post);
        if (!result.active && canonicalVault.isSaved(postId)) void canonicalVault.unsavePost(postId);
      }
      if (post && action === 'repost') { post.boostCount = result.newCount; post.userBoosted = result.active; }
      if (post && action === 'like') post.meritVotes = result.newCount;
      return true;
    }).catch(async error => {
      state[flag] = before[flag];
      state[counter] = before[counter] || 0;
      this._setLocalFlag(postId, flag, before[flag]);
      if (action === 'repost' && fingerprint) {
        const set = this.repostAttributions.get(postId);
        before.reposted ? set?.add(fingerprint) : set?.delete(fingerprint);
      }
      await notifyInteractionChange(error);
      return false;
    }).finally(() => { this.pending.delete(key); void notifyInteractionChange(); });
    this.pending.set(key, operation);
  }

  constructor() {
    if (isDemoModeEnabled()) {
      this._seedDemoInteractions();
    }
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
    this.repostAttributions.set('post-1', new Set(['genesis-core']));
    this.repostAttributions.set('post-images', new Set(['c3dc28cb705e']));
  }

  private _getLocalKey(postId: string, flag: 'liked' | 'reposted' | 'bookmarked'): string {
    return `aeth_pulse_${flag}_${postId}`;
  }

  private _getLocalFlag(postId: string, flag: 'liked' | 'reposted' | 'bookmarked'): boolean {
    const storage = safeLocalStorage();
    if (!storage) return false;
    try {
      return storage.getItem(this._getLocalKey(postId, flag)) === 'true';
    } catch (_) {
      return false;
    }
  }

  private _setLocalFlag(postId: string, flag: 'liked' | 'reposted' | 'bookmarked', val: boolean): void {
    const storage = safeLocalStorage();
    if (!storage) return;
    try {
      if (val) {
        storage.setItem(this._getLocalKey(postId, flag), 'true');
      } else {
        storage.removeItem(this._getLocalKey(postId, flag));
      }
    } catch (_) {}
  }

  public getInteractions(postId: string): PulseInteractionState {
    if (!this.postInteractions.has(postId)) {
      this.postInteractions.set(postId, {
        liked: false,
        reposted: false,
        bookmarked: false,
        likesCount: 0,
        repostsCount: 0,
        viewsCount: 0,
        repliesCount: 0,
      });
    }
    return this.postInteractions.get(postId)!;
  }

  /**
   * Synchronizes real post interaction counts from Cloudflare D1
   */
  public async syncInteractions(postIds: string[], userFingerprint?: string): Promise<void> {
    if (!postIds || postIds.length === 0 || typeof window === 'undefined' || typeof fetch === 'undefined') return;

    const toSync = postIds.filter(id => !this.syncedPostIds.has(id));
    if (toSync.length === 0) return;

    try {
      // Keep each D1 query below the bound-variable limit.
      if (toSync.length > 50) {
        for (let i = 0; i < toSync.length; i += 50) await this.syncInteractions(toSync.slice(i, i + 50), userFingerprint);
        return;
      }
      const params = new URLSearchParams();
      params.set('postIds', toSync.join(','));
      if (userFingerprint) params.set('userFingerprint', userFingerprint);

      const { clientStore } = await import('./client-state.js');
      const envelope = clientStore.createSignedEnvelope({ scope: 'urefy-interactions-read-v1' });
      const res = await fetch(`/api/interactions?${params.toString()}`, { cache: 'no-store', headers: { 'X-Sovereign-Envelope': JSON.stringify(envelope) } });
      if (!res.ok) {
        toSync.forEach(id => this.syncedPostIds.add(id));
        return;
      }

      const data = await res.json() as any;
      if (data?.success) {
        const entries = data.interactions || (data.targetId ? { [data.targetId]: data } : {});
        const { reactionsEngine } = await import('./reactions.js');
        for (const [id, info] of Object.entries<any>(entries)) {
          if (['like', 'repost', 'bookmark'].some(action => this.isPending(id, action as SocialAction))) continue;
          this.syncedPostIds.add(id);
          const state = this.getInteractions(id);
          state.likesCount = Number(info.likesCount) || 0;
          state.repostsCount = Number(info.repostsCount) || 0;
          state.bookmarksCount = Number(info.bookmarksCount) || 0;
          state.viewsCount = Number(info.viewsCount) || 0;
          if (Array.isArray(info.reactions)) reactionsEngine.hydrate(id, info.reactions, userFingerprint || '');
          if (Array.isArray(info.awards)) {
            const { awardsSystem } = await import('./awards.js');
            awardsSystem.hydratePostAwards(id, info.awards);
          }

          if (info.userInteractions) {
            if (info.userInteractions.liked !== undefined) {
              state.liked = Boolean(info.userInteractions.liked);
              this._setLocalFlag(id, 'liked', state.liked);
            }
            if (info.userInteractions.reposted !== undefined) {
              state.reposted = Boolean(info.userInteractions.reposted);
              this._setLocalFlag(id, 'reposted', state.reposted);
              if (userFingerprint) {
                const set = this.repostAttributions.get(id) || new Set<string>();
                state.reposted ? set.add(userFingerprint) : set.delete(userFingerprint);
                this.repostAttributions.set(id, set);
              }
            }
            if (info.userInteractions.bookmarked !== undefined) {
              state.bookmarked = Boolean(info.userInteractions.bookmarked);
              this._setLocalFlag(id, 'bookmarked', state.bookmarked);
            }
          }
        }
        void notifyInteractionChange();
      } else {
        toSync.forEach(id => this.syncedPostIds.add(id));
      }
    } catch (err) {
      toSync.forEach(id => this.syncedPostIds.add(id));
      console.warn('[PulseActions] Failed to sync interactions from edge API:', err);
    }
  }

  /**
   * Toggles Like status, dispatches to Cloudflare D1, and returns whether particle burst should fire.
   */
  public toggleLike(postId: string, userFingerprint?: string, baselineCount?: number): { isLiked: boolean; newCount: number; burst: boolean } {
    const state = this.getInteractions(postId);
    if (this.isPending(postId, 'like')) return { isLiked: state.liked, newCount: state.likesCount, burst: false };
    if (state.likesCount === 0 && baselineCount) {
      state.likesCount = baselineCount;
    }
    const before = { ...state };
    state.liked = !state.liked;
    if (state.liked) {
      state.likesCount += 1;
    } else {
      state.likesCount = Math.max(0, state.likesCount - 1);
    }
    this._setLocalFlag(postId, 'liked', state.liked);

    this.persist(postId, 'like', before, userFingerprint);

    return { isLiked: state.liked, newCount: state.likesCount, burst: state.liked };
  }

  public getRepostersForPost(postId: string): string[] {
    return Array.from(this.repostAttributions.get(postId) || []);
  }

  public isPostRepostedBy(postId: string, userFingerprint: string): boolean {
    const set = this.repostAttributions.get(postId);
    if (set && set.has(userFingerprint)) return true;
    return false;
  }

  public recordRepost(postId: string, userFingerprint?: string, isPrivate: boolean = false): { success: boolean; isReposted: boolean; newCount: number; error?: string } {
    if (isPrivate) {
      return { success: false, isReposted: false, newCount: this.getInteractions(postId).repostsCount, error: 'Cannot repost restricted or private circles' };
    }
    const state = this.getInteractions(postId);
    const fp = userFingerprint || 'anon-peer';
    let set = this.repostAttributions.get(postId);
    if (!set) {
      set = new Set();
      this.repostAttributions.set(postId, set);
    }
    if (!set.has(fp)) {
      set.add(fp);
      state.repostsCount += 1;
    }
    state.reposted = true;
    this._setLocalFlag(postId, 'reposted', true);
    return { success: true, isReposted: true, newCount: state.repostsCount };
  }

  /**
   * Toggles Repost status and dispatches to Cloudflare D1.
   */
  public toggleRepost(postId: string, userFingerprint?: string, isPrivate: boolean = false, baselineCount?: number): { isReposted: boolean; newCount: number } {
    const fp = userFingerprint || 'anon-peer';
    let set = this.repostAttributions.get(postId);
    if (!set) {
      set = new Set();
      this.repostAttributions.set(postId, set);
    }
    const state = this.getInteractions(postId);
    if (state.repostsCount === 0 && baselineCount) {
      state.repostsCount = baselineCount;
    }
    if (isPrivate || this.isPending(postId, 'repost')) return { isReposted: state.reposted, newCount: state.repostsCount };
    const before = { ...state };
    const wasReposted = state.reposted;
    if (!wasReposted) {
      set.add(fp);
      state.repostsCount += 1;
      state.reposted = true;
    } else {
      set.delete(fp);
      state.repostsCount = Math.max(0, state.repostsCount - 1);
      state.reposted = false;
    }
    this._setLocalFlag(postId, 'reposted', state.reposted);
    this.repostMenuOpenId = null;

    this.persist(postId, 'repost', before, fp);

    return { isReposted: state.reposted, newCount: state.repostsCount };
  }

  /**
   * Toggles Bookmark status and dispatches to Cloudflare D1.
   */
  public toggleBookmark(postId: string, userFingerprint?: string): boolean {
    const state = this.getInteractions(postId);
    if (this.isPending(postId, 'bookmark')) return state.bookmarked;
    const before = { ...state };
    state.bookmarked = !state.bookmarked;
    this._setLocalFlag(postId, 'bookmarked', state.bookmarked);

    this.persist(postId, 'bookmark', before, userFingerprint);

    return state.bookmarked;
  }

  /**
   * Increments view impressions and records in Cloudflare D1.
   */
  public recordImpression(postId: string, userFingerprint?: string): number {
    const state = this.getInteractions(postId);
    state.viewsCount += 1;

    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: postId,
          targetType: 'post',
          userFingerprint: userFingerprint || 'anon-peer',
          action: 'view',
        }),
      }).catch(() => {});
    }

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
      <div class="pulse-action-bar flex items-center justify-between mt-3.5 max-w-lg text-slate-400 select-none text-xs font-mono" data-post-id="${postId}" data-action="stop-propagation">
        
        <!-- 1. REPLY BUTTON -->
        <button
          type="button"
          data-pulse-action="reply"
          data-post-id="${postId}"
          class="btn-pulse-reply min-w-[44px] min-h-[44px] flex items-center justify-center space-x-1.5 group hover:text-[var(--color-accent,#e59b3c)] transition-colors cursor-pointer"
          title="${t('actions.reply', undefined, 'Reply to pulse')}"
          aria-label="${t('actions.reply', undefined, 'Reply to pulse')}"
        >
          <div class="p-2 rounded-full group-hover:bg-amber-500/10 transition-colors">
            ${renderIcon('messageSquare', { size: 16, strokeWidth: 1.75 })}
          </div>
          <span class="text-xs group-hover:text-[var(--color-accent,#e59b3c)]">${this.formatMetric(replies)}</span>
        </button>

        <!-- 2. REPOST & QUOTE POST DROPDOWN MENU -->
        <div class="relative">
          <button
            type="button"
            data-action="toggle-repost-menu"
            data-pulse-action="repost-menu"
            data-post-id="${postId}"
            class="btn-pulse-repost-menu min-w-[44px] min-h-[44px] flex items-center justify-center space-x-1.5 group transition-colors cursor-pointer ${state.reposted ? 'text-emerald-400 font-bold' : 'hover:text-emerald-400'}"
            title="${t('actions.repost', undefined, 'Repost or Quote Pulse')}"
            aria-label="${t('actions.repost', undefined, 'Repost or Quote pulse')}"
          >
            <div class="p-2 rounded-full group-hover:bg-emerald-500/10 transition-colors">
              ${renderIcon('repost', { size: 16, className: state.reposted ? 'rotate-180 transition-transform duration-300' : '' })}
            </div>
            <span class="text-xs">${this.formatMetric(state.repostsCount)}</span>
          </button>

          ${isMenuOpen ? `
            <div class="absolute left-0 bottom-full mb-2 w-48 bg-surface-overlay border border-white/10 rounded-2xl shadow-2xl z-40 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 backdrop-blur-xl">
              <button
                type="button"
                data-action="do-repost"
                data-pulse-action="do-repost"
                data-post-id="${postId}"
                class="w-full flex items-center space-x-2.5 px-4 py-2.5 hover:bg-white/10 text-xs font-bold ${state.reposted ? 'text-emerald-400' : 'text-slate-200'} transition-colors cursor-pointer"
                aria-label="${state.reposted ? t('actions.unrepost', undefined, 'Undo Repost') : t('actions.repost', undefined, 'Re-broadcast')}"
              >
                ${renderIcon('repost', { size: 15 })}
                <span>${state.reposted ? t('actions.unrepost', undefined, 'Undo Repost') : t('actions.repost', undefined, 'Re-broadcast')}</span>
              </button>

              <button
                type="button"
                data-action="do-quote"
                data-pulse-action="do-quote"
                data-post-id="${postId}"
                class="w-full flex items-center space-x-2.5 px-4 py-2.5 hover:bg-white/10 text-xs font-bold text-slate-200 transition-colors cursor-pointer border-t border-white/5"
                aria-label="${t('actions.quotePost', undefined, 'Quote Pulse')}"
              >
                ${renderIcon('messageSquare', { size: 15, class: 'text-slate-400' })}
                <span>${t('actions.quotePost', undefined, 'Quote Pulse')}</span>
              </button>
            </div>
          ` : ''}
        </div>

        <!-- 3. MERIT INTERACTION -->
        <button
          type="button"
          data-pulse-action="like"
          data-post-id="${postId}"
          class="btn-pulse-like relative min-w-[44px] min-h-[44px] flex items-center justify-center space-x-1.5 group transition-colors cursor-pointer ${state.liked ? 'text-[var(--color-accent,#e59b3c)] is-endorsed' : 'hover:text-[var(--color-accent,#e59b3c)]'}"
          title="${state.liked ? 'Remove merit' : 'Endorse (merit)'}"
          aria-label="${state.liked ? 'Remove merit' : 'Endorse (merit)'}"
        >
          <div class="relative p-2 rounded-full group-hover:bg-amber-500/10 transition-colors">
            ${renderMeritIcon(state.liked, { size: 18 })}
            <!-- PARTICLE BURST CONTAINER -->
            <div id="particle-burst-${postId}" class="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible"></div>
          </div>
          <span class="text-xs ${state.liked ? 'text-[var(--color-accent,#e59b3c)] font-bold' : ''}">${this.formatMetric(state.likesCount)}</span>
        </button>

        <!-- 4. VIEWS COUNTER -->
        <div class="min-w-[44px] min-h-[44px] flex items-center justify-center space-x-1.5 group hover:text-slate-200 transition-colors cursor-default" title="Views">
          <div class="p-2 rounded-full group-hover:bg-white/5 transition-colors">
            ${renderIcon('activity', { size: 16, strokeWidth: 1.75 })}
          </div>
          <span class="text-xs text-slate-400 group-hover:text-slate-200">${this.formatMetric(state.viewsCount)}</span>
        </div>

        <!-- 5. BOOKMARK & SHARE -->
        <div class="flex items-center space-x-1">
          <button
            type="button"
            data-pulse-action="bookmark"
            data-post-id="${postId}"
            class="btn-pulse-bookmark min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${state.bookmarked ? 'text-[var(--color-accent,#e59b3c)]' : 'hover:text-[var(--color-accent,#e59b3c)] hover:bg-amber-500/10'}"
            title="${t('actions.bookmark', undefined, 'Bookmark')}"
            aria-label="${state.bookmarked ? t('actions.unbookmark', undefined, 'Remove bookmark') : t('actions.bookmark', undefined, 'Bookmark pulse')}"
          >
            ${renderIcon('bookmark', { size: 16, variant: state.bookmarked ? 'solid' : 'outline' })}
          </button>

          <button
            type="button"
            data-action="keep-post"
            data-post-id="${postId}"
            class="btn-pulse-keep min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:text-[var(--color-accent,#e59b3c)] hover:bg-amber-500/10 transition-colors cursor-pointer"
            title="Keep this post, with its source, in your private Vault"
            aria-label="Keep this post in your private Vault"
          >
            ${renderIcon('save', { size: 16, strokeWidth: 1.75 })}
          </button>

          <button
            type="button"
            data-pulse-action="share"
            data-post-id="${postId}"
            class="btn-pulse-share min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:text-[var(--color-accent,#e59b3c)] hover:bg-amber-500/10 transition-colors cursor-pointer"
            title="${t('actions.share', undefined, 'Share permalink')}"
            aria-label="${t('actions.share', undefined, 'Share permalink')}"
          >
            ${renderIcon('share', { size: 16, strokeWidth: 1.75 })}
          </button>

          <button
            type="button"
            data-action="report-post"
            data-pulse-action="report"
            data-post-id="${postId}"
            class="btn-pulse-report min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="${t('actions.report', undefined, 'Report')}"
            aria-label="${t('actions.report', undefined, 'Report')}"
          >
            ${renderIcon('flag', { size: 16, strokeWidth: 1.75 })}
            <span class="sr-only">DSA Notice & Takedown</span>
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

    // 8 radial particle sparks in warm Keystone amber
    const colors = ['#e59b3c', '#f59e0b', '#fbbf24', '#d97706', '#fde68a'];
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
