// ============================================================================
// feed-controls.ts — Sovereign Feed Controls & View Mode Switching System
// View Modes: Card, Classic, Compact | Sort Filters: Hot, New, Top (Timeframes), Rising
// 100% Self-contained, TypeScript strict, no external dependencies.
// ============================================================================

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore, ClientPost } from './client-state.js';
import { awardsSystem } from './awards.js';
import { bookmarksVault } from './bookmarks.js';
import { crossPostEngine } from './crosspost.js';
import { markdownRenderer } from './markdown-renderer.js';
import { reactionsEngine } from './reactions.js';
import { obsidianMediaPlayer } from './media-player.js';
import { pollEngine } from './polls.js';
import { linkPreviewEngine } from './link-preview.js';
import { collectionsEngine } from './collections.js';
import { zkReputation } from './zk-reputation.js';
import { threadManager } from './threads.js';

export type ViewMode = 'card' | 'classic' | 'compact';
export type SortType = 'hot' | 'new' | 'top' | 'rising' | 'chrono';
export type TopTimeframe = 'today' | 'week' | 'month' | 'year' | 'all';

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class FeedControlsEngine {
  public viewMode: ViewMode = 'card';
  public sortType: SortType = 'hot';
  public topTimeframe: TopTimeframe = 'all';
  public isTopDropdownOpen: boolean = false;

  constructor() {
    this._initGlobalDomListeners();
  }

  public getViewMode(): ViewMode {
    return this.viewMode;
  }

  public setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    clientStore.notify();
  }

  public getSortType(): SortType {
    return this.sortType;
  }

  public setSortType(sort: SortType): void {
    this.sortType = sort;
    clientStore.sortMode = sort === 'rising' ? 'hot' : sort;
    if (sort !== 'top') {
      this.isTopDropdownOpen = false;
    }
    clientStore.notify();
  }

  public getTopTimeframe(): TopTimeframe {
    return this.topTimeframe;
  }

  public setTopTimeframe(tf: TopTimeframe): void {
    this.topTimeframe = tf;
    this.isTopDropdownOpen = false;
    clientStore.notify();
  }

  public toggleTopDropdown(): boolean {
    this.isTopDropdownOpen = !this.isTopDropdownOpen;
    clientStore.notify();
    return this.isTopDropdownOpen;
  }

  /**
   * Applies sort algorithm and top timeframe filters to a list of posts.
   */
  public filterAndSortPosts(posts: ClientPost[]): ClientPost[] {
    const list = [...posts];
    const now = Date.now();

    if (this.sortType === 'new' || this.sortType === 'chrono') {
      return list.sort((a, b) => b.createdAt - a.createdAt);
    }

    if (this.sortType === 'top') {
      let filtered = list;
      if (this.topTimeframe === 'today') {
        filtered = list.filter(p => now - p.createdAt <= 24 * 3600 * 1000);
      } else if (this.topTimeframe === 'week') {
        filtered = list.filter(p => now - p.createdAt <= 7 * 24 * 3600 * 1000);
      } else if (this.topTimeframe === 'month') {
        filtered = list.filter(p => now - p.createdAt <= 30 * 24 * 3600 * 1000);
      } else if (this.topTimeframe === 'year') {
        filtered = list.filter(p => now - p.createdAt <= 365 * 24 * 3600 * 1000);
      }
      return filtered.sort((a, b) => (b.meritVotes || 0) - (a.meritVotes || 0));
    }

    if (this.sortType === 'rising') {
      // High score velocity over recent time window
      return list.sort((a, b) => {
        const ageHoursA = Math.max(0.5, (now - a.createdAt) / 3600000);
        const ageHoursB = Math.max(0.5, (now - b.createdAt) / 3600000);
        const velocityA = (a.meritVotes + (a.replyCount || 0) * 2) / Math.pow(ageHoursA + 1, 1.4);
        const velocityB = (b.meritVotes + (b.replyCount || 0) * 2) / Math.pow(ageHoursB + 1, 1.4);
        return velocityB - velocityA;
      });
    }

    // Default: 'hot' ranking algorithm
    return list.sort((a, b) => {
      const ageHoursA = (now - a.createdAt) / 3600000;
      const ageHoursB = (now - b.createdAt) / 3600000;
      const scoreA = (a.meritVotes * 2) + ((a.replyCount || 0) * 3) + ((a.boostCount || 0) * 2) - (ageHoursA * 1.5);
      const scoreB = (b.meritVotes * 2) + ((b.replyCount || 0) * 3) + ((b.boostCount || 0) * 2) - (ageHoursB * 1.5);
      return scoreB - scoreA;
    });
  }

  // ─── Rendering Feed Controls Toolbar ──────────────────────────────────────

  public renderFeedControlsToolbar(): string {
    const timeframes: { id: TopTimeframe; label: string }[] = [
      { id: 'today', label: 'Today' },
      { id: 'week', label: 'This Week' },
      { id: 'month', label: 'This Month' },
      { id: 'year', label: 'This Year' },
      { id: 'all', label: 'All Time' },
    ];

    const currentTfLabel = timeframes.find(t => t.id === this.topTimeframe)?.label || 'All Time';

    return `
      <div id="feed-controls-toolbar" class="p-2.5 rounded-2xl bg-surface-base/90 border border-white/10 shadow-sm flex items-center justify-between gap-2 flex-wrap mb-4 select-none">
        
        <!-- LEFT: SORT TABS (HOT, NEW, TOP, RISING) -->
        <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
          <!-- HOT -->
          <button 
            type="button" 
            id="sort-btn-hot" 
            data-feed-sort="hot"
            class="btn-feed-sort px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
              this.sortType === 'hot'
                ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-surface-raised'
            }"
          >
            <span>🔥</span>
            <span>Hot</span>
          </button>

          <!-- NEW -->
          <button 
            type="button" 
            id="sort-btn-new" 
            data-feed-sort="new"
            class="btn-feed-sort px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
              this.sortType === 'new'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-surface-raised'
            }"
          >
            <span>✨</span>
            <span>New</span>
          </button>

          <!-- TOP WITH TIMEFRAME DROPDOWN -->
          <div class="relative inline-block">
            <button 
              type="button" 
              id="sort-btn-top" 
              data-feed-sort="top"
              class="btn-feed-sort px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
                this.sortType === 'top'
                  ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-surface-raised'
              }"
            >
              <span>🏆</span>
              <span>Top</span>
              ${this.sortType === 'top' ? `
                <span class="text-[10px] text-indigo-400 ml-0.5">(${currentTfLabel})</span>
                <span class="text-[9px] text-slate-400">▼</span>
              ` : ''}
            </button>

            <!-- TIMEFRAME DROPDOWN MENU -->
            ${this.sortType === 'top' && this.isTopDropdownOpen ? `
              <div id="top-timeframe-dropdown" class="absolute left-0 top-full mt-1.5 w-36 bg-surface-base border border-white/15 rounded-xl shadow-2xl py-1 z-30 font-mono text-xs animate-in fade-in zoom-in-95 duration-100">
                ${timeframes.map(tf => `
                  <button 
                    type="button" 
                    data-top-timeframe="${tf.id}" 
                    class="btn-top-timeframe w-full text-left px-3 py-1.5 transition-colors flex items-center justify-between cursor-pointer ${
                      this.topTimeframe === tf.id
                        ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                        : 'text-slate-300 hover:bg-surface-raised hover:text-white'
                    }"
                  >
                    <span>${tf.label}</span>
                    ${this.topTimeframe === tf.id ? '<span class="text-indigo-400 text-xs">✓</span>' : ''}
                  </button>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- RISING -->
          <button 
            type="button" 
            id="sort-btn-rising" 
            data-feed-sort="rising"
            class="btn-feed-sort px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
              this.sortType === 'rising'
                ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-surface-raised'
            }"
          >
            <span>📈</span>
            <span>Rising</span>
          </button>
        </div>

        <!-- RIGHT: VIEW MODE SWITCHER (CARD, CLASSIC, COMPACT) -->
        <div class="flex items-center space-x-1 bg-surface-raised p-1 rounded-xl border border-white/10">
          <!-- CARD MODE -->
          <button 
            type="button" 
            id="viewmode-card-btn" 
            data-view-mode="card" 
            class="btn-viewmode p-1.5 rounded-lg transition-all cursor-pointer ${
              this.viewMode === 'card'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-surface-overlay'
            }"
            title="Card View (Full Media Preview & Content)"
          >
            <span class="text-xs">📰</span>
          </button>

          <!-- CLASSIC MODE -->
          <button 
            type="button" 
            id="viewmode-classic-btn" 
            data-view-mode="classic" 
            class="btn-viewmode p-1.5 rounded-lg transition-all cursor-pointer ${
              this.viewMode === 'classic'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-surface-overlay'
            }"
            title="Classic View (Compact 2-Column with Left Thumbnail)"
          >
            <span class="text-xs">📋</span>
          </button>

          <!-- COMPACT MODE -->
          <button 
            type="button" 
            id="viewmode-compact-btn" 
            data-view-mode="compact" 
            class="btn-viewmode p-1.5 rounded-lg transition-all cursor-pointer ${
              this.viewMode === 'compact'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-surface-overlay'
            }"
            title="Compact View (Dense Rows for Ultra-Fast Browsing)"
          >
            <span class="text-xs">📑</span>
          </button>
        </div>

      </div>
    `;
  }

  // ─── Post Layout Rendering By View Mode ────────────────────────────────────

  public renderPost(p: ClientPost, mode: ViewMode = this.viewMode): string {
    if (mode === 'compact') {
      return this.renderCompactPost(p);
    }
    if (mode === 'classic') {
      return this.renderClassicPost(p);
    }
    return this.renderCardPost(p);
  }

  /**
   * 1. COMPACT MODE — Ultra-dense row for ultra-fast skimming.
   */
  public renderCompactPost(p: ClientPost): string {
    const time = new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const circleName = p.channelId.startsWith('vault-') ? (p.channelId === 'vault-releases' ? 'c/clean-releases' : 'c/security-guides') :
                       p.channelId.startsWith('relays-') ? 'c/p2p-mesh' : 'c/zeroknowledge';

    return `
      <article 
        id="post-compact-${p.id}"
        class="group/compact flex items-center justify-between gap-3 px-3.5 py-2.5 bg-surface-raised hover:bg-surface-highlight border border-white/5 hover:border-indigo-500/30 rounded-xl transition-all cursor-pointer select-none text-slate-200"
        data-open-detail="${p.id}"
      >
        <!-- VOTE PILL (HORIZONTAL) -->
        <div class="flex items-center space-x-1 shrink-0 font-mono text-xs" onclick="event.stopPropagation();">
          <button data-vote-id="${p.id}" data-dir="1" class="btn-upvote p-1 rounded hover:bg-surface-overlay text-slate-400 hover:text-indigo-400 transition-colors ${p.userVoted === 1 ? 'text-indigo-400 font-bold' : ''}" title="Endorse (+1)">
            ▲
          </button>
          <span class="font-bold text-xs px-1 ${p.userVoted === 1 ? 'text-indigo-400' : p.userVoted === -1 ? 'text-rose-500' : 'text-slate-300'}">
            ${p.meritVotes}
          </span>
          <button data-vote-id="${p.id}" data-dir="-1" class="btn-downvote p-1 rounded hover:bg-surface-overlay text-slate-400 hover:text-rose-500 transition-colors ${p.userVoted === -1 ? 'text-rose-500 font-bold' : ''}" title="Divergent (-1)">
            ▼
          </button>
        </div>

        <!-- THUMBNAIL (IF MEDIA EXISTS) -->
        ${p.images && p.images.length > 0 ? `
          <div class="w-10 h-10 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/10">
            <img src="${escapeHtml(p.images[0])}" alt="" class="w-full h-full object-cover" loading="lazy" />
          </div>
        ` : p.video ? `
          <div class="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm shrink-0">
            ▶
          </div>
        ` : p.attachment ? `
          <div class="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-sm shrink-0">
            📦
          </div>
        ` : ''}

        <!-- TITLE & CIRCLE / AUTHOR META -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2 flex-wrap">
            <span class="font-mono text-[10px] font-bold text-indigo-400">${circleName}</span>
            <span class="text-slate-600 text-[10px]">•</span>
            <span class="font-mono text-[10px] text-slate-400">@id:${p.authorFingerprint.substring(0, 8)}</span>
            <span class="text-slate-600 text-[10px]">•</span>
            <span class="text-[10px] font-mono text-slate-500">${time}</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">${p.flair}</span>
          </div>
          <h3 class="text-xs font-semibold text-white group-hover/compact:text-indigo-300 transition-colors truncate mt-0.5">
            ${escapeHtml(p.title || p.content.slice(0, 80))}
          </h3>
        </div>

        <!-- RIGHT: COMMENTS & AWARDS -->
        <div class="flex items-center space-x-2 shrink-0 text-xs font-mono text-slate-400">
          ${awardsSystem.renderAwardBadges(p.id)}
          <span class="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-surface-base border border-white/5">
            <span>💬</span>
            <span class="text-[11px] font-bold text-slate-300">${p.replyCount || 0}</span>
          </span>
        </div>
      </article>
    `;
  }

  /**
   * 2. CLASSIC MODE — Compact 2-column layout with left thumbnail preview & metadata.
   */
  public renderClassicPost(p: ClientPost): string {
    const time = new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const circleName = p.channelId.startsWith('vault-') ? (p.channelId === 'vault-releases' ? 'c/clean-releases' : 'c/security-guides') :
                       p.channelId.startsWith('relays-') ? 'c/p2p-mesh' : 'c/zeroknowledge';

    return `
      <article 
        id="post-classic-${p.id}"
        class="group/classic flex space-x-3 p-3.5 bg-surface-raised hover:bg-surface-highlight border border-white/5 hover:border-indigo-500/40 rounded-2xl transition-all shadow-sm cursor-pointer select-none text-slate-200"
        data-open-detail="${p.id}"
      >
        <!-- LEFT COLUMN: VOTES PILL -->
        <div class="flex flex-col items-center justify-start space-y-0.5 bg-surface-base/80 rounded-xl p-1 shrink-0 font-mono text-xs h-fit" onclick="event.stopPropagation();">
          <button data-vote-id="${p.id}" data-dir="1" class="btn-upvote p-1 rounded-lg hover:bg-surface-overlay text-slate-400 hover:text-indigo-400 transition-colors ${p.userVoted === 1 ? 'text-indigo-400 font-bold' : ''}" title="Endorse (+1)">
            ▲
          </button>
          <span class="font-bold text-xs py-0.5 ${p.userVoted === 1 ? 'text-indigo-400' : p.userVoted === -1 ? 'text-rose-500' : 'text-slate-300'}">
            ${p.meritVotes}
          </span>
          <button data-vote-id="${p.id}" data-dir="-1" class="btn-downvote p-1 rounded-lg hover:bg-surface-overlay text-slate-400 hover:text-rose-500 transition-colors ${p.userVoted === -1 ? 'text-rose-500 font-bold' : ''}" title="Divergent (-1)">
            ▼
          </button>
        </div>

        <!-- THUMBNAIL PREVIEW -->
        ${p.images && p.images.length > 0 ? `
          <div class="w-24 h-20 rounded-xl overflow-hidden bg-black/40 shrink-0 border border-white/10">
            <img src="${escapeHtml(p.images[0])}" alt="" class="w-full h-full object-cover" loading="lazy" />
          </div>
        ` : p.video ? `
          <div class="w-24 h-20 rounded-xl bg-gradient-to-tr from-indigo-950 to-surface-base border border-indigo-500/30 flex flex-col items-center justify-center text-indigo-400 shrink-0 space-y-1">
            <span class="text-xl">▶</span>
            <span class="text-[9px] font-mono text-indigo-300 font-bold">Video</span>
          </div>
        ` : p.attachment ? `
          <div class="w-24 h-20 rounded-xl bg-gradient-to-tr from-emerald-950 to-surface-base border border-emerald-500/30 flex flex-col items-center justify-center text-emerald-400 shrink-0 space-y-1">
            <span class="text-xl">📦</span>
            <span class="text-[9px] font-mono text-emerald-300 font-bold">Release</span>
          </div>
        ` : `
          <div class="w-20 h-16 rounded-xl bg-surface-base border border-white/5 flex items-center justify-center text-slate-500 shrink-0 text-lg">
            💬
          </div>
        `}

        <!-- CONTENT & ACTION BAR -->
        <div class="flex-1 min-w-0 flex flex-col justify-between space-y-2">
          <div>
            <!-- META HEADER -->
            <div class="flex items-center space-x-2 flex-wrap text-xs gap-y-1 mb-1">
              <span class="font-mono text-[11px] font-bold text-indigo-400">${circleName}</span>
              <span class="text-slate-600 text-xs">•</span>
              <span class="font-mono text-[11px] text-slate-400">by @id:${p.authorFingerprint.substring(0, 8)}</span>
              <span class="text-slate-600 text-xs">•</span>
              <span class="text-[10px] font-mono text-slate-500">${time}</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">${p.flair}</span>
              ${awardsSystem.renderAwardBadges(p.id)}
            </div>

            <!-- TITLE -->
            <h3 class="text-sm font-bold text-white group-hover/classic:text-indigo-300 transition-colors leading-snug">
              ${escapeHtml(p.title || p.content.slice(0, 90))}
            </h3>

            <!-- EXCERPT -->
            <p class="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
              ${escapeHtml(p.content.slice(0, 160))}
            </p>
          </div>

          <!-- COMPACT ACTION BAR -->
          <div class="flex items-center space-x-3 pt-1 text-xs text-slate-400 font-mono" onclick="event.stopPropagation();">
            <button data-open-detail="${p.id}" class="btn-open-detail flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-surface-base hover:bg-surface-overlay text-slate-300 hover:text-white transition-all">
              <span>💬</span>
              <span>${p.replyCount || 0} Comments</span>
            </button>

            <button data-boost-post="${p.id}" class="btn-boost flex items-center space-x-1 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${p.userBoosted ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30' : 'bg-surface-base hover:bg-surface-overlay text-slate-300 hover:text-emerald-400'}">
              <span>⟳</span>
              <span>${p.boostCount || 0} ${p.userBoosted ? 'Boosted' : 'Boosts'}</span>
            </button>

            <button class="btn-copy-post-link flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-surface-base hover:bg-surface-overlay text-slate-300 hover:text-white transition-all cursor-pointer" data-post-id="${p.id}">
              <span>🔗</span>
              <span>Share</span>
            </button>

            ${bookmarksVault.renderBookmarkButton(p.id)}
            ${awardsSystem.renderGiveAwardButton(p.id, 'GUARDIAN')}
          </div>
        </div>
      </article>
    `;
  }

  /**
   * 3. CARD MODE — Full standard card with media previews, rich markdown, reaction shelf, and discussion tree.
   */
  public renderCardPost(p: ClientPost): string {
    const time = new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const flairStyle = p.flair === 'VERIFIED RELEASE' ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30' :
                      p.flair === 'SECURITY ADVISORY' ? 'bg-indigo-950/70 text-indigo-300 border-indigo-500/30' :
                      p.flair === 'MICRO-PULSE' ? 'bg-slate-800 text-indigo-300 border-indigo-500/30' :
                      'bg-surface-raised text-slate-300 border-white/10';

    const rootComments = threadManager.getRootComments();
    const circleName = p.channelId.startsWith('vault-') ? (p.channelId === 'vault-releases' ? 'c/clean-releases' : 'c/security-guides') :
                       p.channelId.startsWith('relays-') ? 'c/p2p-mesh' : 'c/zeroknowledge';

    return `
      <article class="p-3 sm:p-4 md:p-5 rounded-2xl bg-surface-raised border border-white/5 hover:border-white/10 transition-all shadow-sm flex space-x-2.5 sm:space-x-3.5 group select-text">
        
        <!-- MERIT VOTING COLUMN -->
        <div class="flex flex-col items-center justify-start space-y-1 shrink-0 pt-0.5 select-none" onclick="event.stopPropagation();">
          <button data-vote-id="${p.id}" data-dir="1" class="btn-upvote text-slate-400 hover:text-indigo-400 transition-colors p-1.5 rounded-xl hover:bg-surface-overlay cursor-pointer ${p.userVoted === 1 ? 'text-indigo-400 font-bold bg-indigo-950/60' : ''}" title="Endorse (+1 Merit)">
            ▲
          </button>
          <span class="font-mono text-xs font-bold ${p.userVoted === 1 ? 'text-indigo-400' : p.userVoted === -1 ? 'text-rose-500' : 'text-slate-300'}">
            ${p.meritVotes}
          </span>
          <button data-vote-id="${p.id}" data-dir="-1" class="btn-downvote text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-xl hover:bg-surface-overlay cursor-pointer ${p.userVoted === -1 ? 'text-rose-500 font-bold bg-rose-950/60' : ''}" title="Divergent View (-1)">
            ▼
          </button>
        </div>

        <!-- MAIN CONTENT COLUMN -->
        <div class="flex-1 space-y-2.5 min-w-0">
          <!-- HEADER METADATA -->
          <div class="flex items-center justify-between text-xs select-none">
            <div class="flex items-center space-x-2 flex-wrap gap-y-1">
              <!-- SOVEREIGN CIRCLE PILL -->
              <button data-channel-id="${p.channelId}" class="btn-channel font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-surface-overlay text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                ${circleName}
              </button>

              <!-- AUTHOR HANDLE -->
              <div class="flex items-center space-x-1.5">
                <div class="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 flex items-center justify-center font-mono text-[9px] font-bold text-white shrink-0">
                  ${p.authorFingerprint.substring(0, 2).toUpperCase()}
                </div>
                <span class="font-mono text-xs font-semibold text-slate-200">@id:${p.authorFingerprint.substring(0, 8)}</span>
                ${zkReputation.renderReputationBadge(p.meritVotes || 100)}
                <span class="text-[9px] font-mono px-2 py-0.5 rounded-md border ${flairStyle}">${p.flair}</span>
              </div>
            </div>
            <span class="text-[10px] font-mono text-slate-500">${time}</span>
          </div>

          <!-- AWARDS & SERIES BADGES -->
          <div class="flex items-center space-x-2 flex-wrap gap-y-1">
            ${awardsSystem.renderAwardBadges(p.id)}
            ${collectionsEngine.renderCollectionBadge(p.id)}
            ${crossPostEngine.renderCrossPostBadge(p.id)}
          </div>

          <!-- POST TITLE -->
          <h3 data-open-detail="${p.id}" class="btn-open-detail text-sm md:text-base font-bold text-white leading-snug hover:text-indigo-400 transition-colors cursor-pointer select-text">
            ${escapeHtml(p.title)}
          </h3>

          <!-- POST BODY -->
          <div class="text-xs text-slate-300 leading-relaxed select-text space-y-2">
            ${markdownRenderer.renderMarkdown(p.content)}
          </div>

          <!-- LINK PREVIEWS -->
          ${linkPreviewEngine.renderAllPreviewsInText(p.content)}

          <!-- MULTIMEDIA 1: OBSIDIAN / YOUTUBE VIDEO PLAYER -->
          ${p.video ? obsidianMediaPlayer.renderVideoCard(p.id, p.video.src, p.video.poster) : (obsidianMediaPlayer.extractVideo(p.content) ? obsidianMediaPlayer.renderVideoCard(p.id, p.content) : '')}

          <!-- MULTIMEDIA 2: MOSAIC IMAGE GALLERY -->
          ${p.images ? obsidianMediaPlayer.renderImageMosaic(p.images) : ''}

          <!-- MULTIMEDIA 3: CRYPTOGRAPHIC POLL CARD -->
          ${p.pollId ? pollEngine.renderPollCard(p.pollId, clientStore.keypair.fingerprint) : ''}

          <!-- EMOJI REACTIONS BAR -->
          <div class="pt-1 select-none">
            ${reactionsEngine.renderReactionBar(p.id, clientStore.keypair.fingerprint)}
          </div>

          <!-- ACTION FOOTER -->
          <div class="flex items-center flex-wrap gap-x-4 gap-y-2 md:gap-x-6 pt-1 text-xs text-slate-400 border-t border-white/5 font-mono select-none">
            <button data-expand-post="${p.id}" class="btn-toggle-post-expand flex items-center space-x-1.5 hover:text-indigo-400 transition-colors cursor-pointer">
              <span>💬</span>
              <span>${p.replyCount || 0} Replies</span>
              <span class="text-[10px] text-slate-500">${p.isExpanded ? '▲ Hide' : '▼ View Tree'}</span>
            </button>

            <button data-boost-post="${p.id}" class="btn-boost flex items-center space-x-1.5 transition-all cursor-pointer ${p.userBoosted ? 'text-emerald-400 font-bold bg-emerald-500/15 px-2.5 py-1 rounded-xl border border-emerald-500/30' : 'hover:text-emerald-400'}">
              <span class="${p.userBoosted ? 'rotate-180 transition-transform duration-300' : ''}">⟳</span>
              <span class="boost-counter">${p.boostCount || 0} ${p.userBoosted ? 'Boosted' : 'Boosts'}</span>
            </button>

            <button class="flex items-center space-x-1.5 hover:text-indigo-300 transition-colors btn-copy-post-link cursor-pointer" data-post-id="${p.id}" data-post-title="${escapeHtml(p.title || '')}">
              <span>🔗</span>
              <span class="share-btn-label">Share</span>
            </button>

            ${bookmarksVault.renderBookmarkButton(p.id)}
            ${awardsSystem.renderGiveAwardButton(p.id, 'GUARDIAN')}
            ${crossPostEngine.renderCrossPostButton(p.id)}

            <button data-open-detail="${p.id}" class="btn-open-detail flex items-center space-x-1 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer">
              <span>🔍</span>
              <span>Thread</span>
            </button>
          </div>

          <!-- INLINE DISCUSSION TREE -->
          ${p.isExpanded ? `
            <div class="pt-3 border-t border-white/5 space-y-3">
              <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Discussion Tree:
              </div>
              <div class="space-y-3">
                ${rootComments.map(c => threadManager.renderCommentNode(c, p.authorFingerprint, clientStore.keypair.fingerprint)).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </article>
    `;
  }

  // ─── Interactive DOM Event Handling ────────────────────────────────────────

  private _initGlobalDomListeners(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. View mode buttons
      const viewModeBtn = target.closest('.btn-viewmode') as HTMLElement | null;
      if (viewModeBtn) {
        e.preventDefault();
        const mode = viewModeBtn.getAttribute('data-view-mode') as ViewMode | null;
        if (mode) {
          this.setViewMode(mode);
        }
        return;
      }

      // 2. Sort tabs
      const sortBtn = target.closest('.btn-feed-sort') as HTMLElement | null;
      if (sortBtn) {
        e.preventDefault();
        const sort = sortBtn.getAttribute('data-feed-sort') as SortType | null;
        if (sort) {
          if (sort === 'top' && this.sortType === 'top') {
            this.toggleTopDropdown();
          } else {
            this.setSortType(sort);
            if (sort === 'top') {
              this.isTopDropdownOpen = true;
              clientStore.notify();
            }
          }
        }
        return;
      }

      // 3. Top timeframe option
      const tfBtn = target.closest('.btn-top-timeframe') as HTMLElement | null;
      if (tfBtn) {
        e.preventDefault();
        const tf = tfBtn.getAttribute('data-top-timeframe') as TopTimeframe | null;
        if (tf) {
          this.setTopTimeframe(tf);
        }
        return;
      }
    });
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────
export const feedControlsEngine = new FeedControlsEngine();
serviceRegistry.registerInstance(SERVICES.FeedPersonalization || 'FeedControls', feedControlsEngine);
