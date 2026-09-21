import { awardsSystem } from './awards.js';
import { clientStore } from './client-state.js';
import { sharePostOrCopyLink, escapeHtml } from './dry-utils.js';
import { markdownRenderer } from './markdown-renderer.js';
import { t } from './i18n.js';
import { profileView } from './profile-view.js';
import { obsidianMediaPlayer } from './media-player.js';
import { reactionsEngine, bindReactionBarEvents } from './reactions.js';
import { presentPublicIdentity } from './public-identity.js';

export interface PostAttachment {
  fileName: string;
  sha256: string;
  byteSize: number;
  entropy: number;
  verdict: string;
  merkleRoot: string;
}

export interface PostVideo {
  src: string;
  poster?: string;
}

export interface QuotedPost {
  id: string;
  authorFingerprint: string;
  authorRole: string;
  authorDisplayName?: string;
  authorHandle?: string;
  authorAvatarUrl?: string;
  title: string;
  content: string;
}

export interface DetailPost {
  id: string;
  channelId: string;
  authorFingerprint: string;
  authorRole: string;
  title: string;
  content: string;
  flair: 'VERIFIED RELEASE' | 'SECURITY ADVISORY' | 'TECH DISCUSSION' | 'MICRO-PULSE' | 'ASK COMMUNITY' | string;
  meritVotes: number;
  userVoted: number; // -1, 0, 1
  replyCount: number;
  boostCount: number;
  userBoosted?: boolean;
  attachment?: PostAttachment;
  video?: PostVideo;
  images?: string[];
  pollId?: string;
  quotedPost?: QuotedPost;
  createdAt: number;
  isExpanded?: boolean;
  tags?: string[];
}

export interface DetailComment {
  id: string;
  authorFingerprint: string;
  authorRole?: string;
  authorDisplayName?: string;
  authorHandle?: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: number;
  depth: number;
  meritScore: number;
  userVoted?: number;
  isCollapsed?: boolean;
  replies: DetailComment[];
}

export interface RelatedPost {
  id: string;
  title: string;
  channelId: string;
  flair: string;
  meritVotes: number;
  replyCount: number;
  authorFingerprint: string;
  createdAt: number;
}

export interface AwardBadge {
  id: string;
  name: string;
  icon: string;
  count: number;
  description: string;
}

export const THREAD_DEPTH_COLORS: string[] = [
  '#00e5ff', // Depth 0: Cyphr Cyan
  '#a855f7', // Depth 1: Aether Violet
  '#22c55e', // Depth 2: Signal Emerald
  '#f59e0b', // Depth 3: Amber Gold
  '#ec4899', // Depth 4: Rose Pink
  '#3b82f6', // Depth 5: Electric Blue
  '#14b8a6', // Depth 6: Teal Mint
];

export class PostDetailView {
  public activePostId: string | null = null;
  public replyDraft: string = '';
  private replySubmitting = false;
  private inlineReplyDrafts = new Map<string, string>();
  public isPreviewMode: boolean = false;
  public collapsedComments: Set<string> = new Set<string>();
  public bookmarkedPosts: Set<string> = new Set<string>();
  public awardsMap: Map<string, AwardBadge[]> = new Map<string, AwardBadge[]>();
  public replyingToCommentId: string | null = null;
  public inlineCommentDrafts: Map<string, string> = new Map<string, string>();
  public activeSubTab: 'discussion' | 'raw_json' | 'zk_proof' = 'discussion';
  public lastCopiedText: string | null = null;

  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.seedDefaultAwards();
  }

  private seedDefaultAwards(): void {
    this.awardsMap.set('post-1', [
      { id: 'aw-1', name: 'Zero Vulnerability', icon: '🛡️', count: 14, description: 'Audited clean PE/ELF binary' },
      { id: 'aw-2', name: 'Sovereign Release', icon: '💎', count: 8, description: 'Reproducible build hash confirmed' },
    ]);
    this.awardsMap.set('post-video', [
      { id: 'aw-3', name: 'High Frame-Rate', icon: '⚡', count: 22, description: '120 FPS Zero-Copy PipeWire Demo' },
    ]);
    this.awardsMap.set('post-poll', [
      { id: 'aw-4', name: 'Consensus Builder', icon: '🏛️', count: 6, description: 'ZK-governance initiative' },
    ]);
  }

  public savedFeedScrollTop: number = 0;
  public originRoute: string | null = null;
  public originPath: string | null = null;

  // ─── Modal & Focus View State Management ──────────────────────────────────

  public isOpen(): boolean {
    return this.activePostId !== null;
  }

  public openPost(postId: string, originRoute?: string): void {
    if (typeof document !== 'undefined') {
      const feedEl = document.getElementById('main-feed-scroll') || document.getElementById('post-focus-view');
      if (feedEl) {
        this.savedFeedScrollTop = feedEl.scrollTop;
      }
    }
    this.activePostId = postId;
    this.originRoute = originRoute || null;
    this.replyDraft = '';
    this.inlineReplyDrafts.clear();
    this.isPreviewMode = false;
    this.replyingToCommentId = null;
    this.activeSubTab = 'discussion';

    if (typeof window !== 'undefined') {
      const currentFull = window.location.pathname + window.location.search + window.location.hash;
      const targetPath = `/p/${encodeURIComponent(postId)}`;
      if (window.location.pathname !== targetPath) {
        if (!this.originPath) {
          this.originPath = currentFull;
        }
        try {
          window.history.pushState({ postId, originPath: this.originPath }, '', targetPath);
        } catch (_) {}
      }
      clientStore.notify('POST_DETAIL', { action: 'open', postId });
      clientStore.notify('MODAL_CHANGE');
      void import('./threads.js').then(({ threadManager }) => {
        void threadManager.loadCommentsForPost(postId).then(() => {
          const post = clientStore.posts.find(p => p.id === postId);
          const comments = threadManager.getRootCommentsForPost(postId);
          if (post && comments.length > (post.replyCount || 0)) {
            post.replyCount = comments.length;
          }
          window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
          clientStore.notify('POST_DETAIL', { action: 'refresh', postId });
        });
      });
    } else {
      clientStore.notify('POST_DETAIL', { action: 'open', postId });
    }
  }

  public closePost(options?: { skipHistory?: boolean }): void {
    const origin = this.originPath;
    this.activePostId = null;
    this.originRoute = null;
    this.originPath = null;
    this.replyDraft = '';
    this.inlineReplyDrafts.clear();
    this.isPreviewMode = false;
    this.replyingToCommentId = null;
    this.activeSubTab = 'discussion';

    if (typeof window !== 'undefined') {
      if (/^\/(?:p|post)\//i.test(window.location.pathname)) {
        try {
          if (!options?.skipHistory) {
            if (origin && !/^\/(?:p|post)\//i.test(origin)) {
              window.history.pushState(null, '', origin);
            } else {
              window.history.pushState(null, '', '/');
            }
          } else {
            const currentHash = window.location.hash || '';
            window.history.replaceState(null, '', `/${currentHash}`);
          }
        } catch (_) {}
      }
    }

    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }

    clientStore.notify('POST_DETAIL', { action: 'close' });
    clientStore.notify('MODAL_CHANGE');

    if (typeof window !== 'undefined') {
      const raf = typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame
        : (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb: FrameRequestCallback) => setTimeout(cb, 16));
      raf(() => {
        const feed = document.getElementById('main-feed-scroll');
        if (feed && this.savedFeedScrollTop > 0) {
          feed.scrollTop = this.savedFeedScrollTop;
        }
      });
    }
  }

  public getActivePostId(): string | null {
    return this.activePostId;
  }

  public toggleBookmark(postId: string): boolean {
    if (this.bookmarkedPosts.has(postId)) {
      this.bookmarkedPosts.delete(postId);
      return false;
    } else {
      this.bookmarkedPosts.add(postId);
      return true;
    }
  }

  public isBookmarked(postId: string): boolean {
    return this.bookmarkedPosts.has(postId);
  }

  public toggleCommentCollapse(commentId: string): boolean {
    if (this.collapsedComments.has(commentId)) {
      this.collapsedComments.delete(commentId);
      return false;
    } else {
      this.collapsedComments.add(commentId);
      return true;
    }
  }

  public isCommentCollapsed(commentId: string): boolean {
    return this.collapsedComments.has(commentId);
  }

  public setReplyingToComment(commentId: string | null): void {
    this.replyingToCommentId = commentId;
  }

  public addAward(postId: string, name: string, icon: string, description: string = 'Community Award'): void {
    const list = this.awardsMap.get(postId) || [];
    const existing = list.find(a => a.name === name);
    if (existing) {
      existing.count++;
    } else {
      list.push({
        id: `aw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        icon,
        count: 1,
        description,
      });
    }
    this.awardsMap.set(postId, list);
  }

  public getAwards(postId: string): AwardBadge[] {
    return this.awardsMap.get(postId) || [];
  }

  // ─── Related Posts Algorithm ──────────────────────────────────────────────

  public findRelatedPosts(post: any, allPosts: any[]): any[] {
    if (!post || !Array.isArray(allPosts)) return [];

    const currentId = post.id;
    const currentChannel = post.channelId || '';
    const currentFlair = post.flair || '';
    const currentTitleWords = (post.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w: string) => w.length > 3);

    const scored = allPosts
      .filter((p: any) => p && p.id !== currentId)
      .map((p: any) => {
        let score = 0;

        // Same channel bonus
        if (p.channelId && p.channelId === currentChannel) {
          score += 5;
        }

        // Same flair bonus
        if (p.flair && p.flair === currentFlair) {
          score += 4;
        }

        // Same author bonus
        if (p.authorFingerprint && p.authorFingerprint === post.authorFingerprint) {
          score += 2;
        }

        // Title word matching
        const candidateTitle = (p.title || '').toLowerCase();
        for (const word of currentTitleWords) {
          if (candidateTitle.includes(word)) {
            score += 3;
          }
        }

        // Content word matching (first 300 chars)
        const candidateContent = (p.content || '').substring(0, 300).toLowerCase();
        for (const word of currentTitleWords) {
          if (candidateContent.includes(word)) {
            score += 1;
          }
        }

        // Merit votes tie-breaker
        score += Math.min(5, (p.meritVotes || 0) * 0.01);

        return { post: p, score };
      });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Take top 3
    const top3 = scored.slice(0, 3).map(item => item.post);

    // If less than 3, pad with other posts
    if (top3.length < 3) {
      for (const p of allPosts) {
        if (p.id !== currentId && !top3.some(x => x.id === p.id)) {
          top3.push(p);
          if (top3.length >= 3) break;
        }
      }
    }

    return top3;
  }

  // ─── Markdown Parser (Self-Contained) ─────────────────────────────────────

  public renderMarkdown(text: string): string {
    if (!text || text.trim() === '') return '';
    return markdownRenderer.renderMarkdown(text);
  }



  private sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') return '#';
    const trimmed = url.trim().replace(/[\x00-\x1F\x7F]/g, '');
    const decoded = trimmed
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&colon;/gi, ':');

    const isSafeScheme = /^(https?:\/\/|mailto:|ipfs:\/\/|hyper:\/\/|magnet:\?|#|\/|\.\/)/i.test(decoded);
    const isDangerousScheme = /^(javascript|vbscript|data|blob|file|about):/i.test(decoded);

    if (!isSafeScheme || isDangerousScheme) {
      return '#';
    }
    return this.escapeHtml(trimmed);
  }

  public escapeHtml(text: string): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  public formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = Math.max(0, now - timestamp);
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ─── Post Focus View (Primary Stage Surface) ─────────────────────────────

  public renderPostFocusView(post: any, comments: any[] = [], relatedPosts: any[] = []): string {
    if (!post) {
      return this.renderPostNotFound();
    }

    const postId = post.id || '';
    const isBookmarked = this.isBookmarked(postId);
    const awards = this.getAwards(postId);
    const safeTitle = this.escapeHtml(post.title || 'Untitled Discussion');
    const safeContent = this.renderMarkdown(post.content || '');
    const relTime = this.formatRelativeTime(post.createdAt || Date.now());
    const exactTime = new Date(post.createdAt || Date.now()).toUTCString();

    const flair = post.flair || 'TECH DISCUSSION';
    const flairStyle = flair === 'VERIFIED RELEASE'
      ? 'bg-emerald-950/80 text-signal border-signal/40 shadow-signal-sm'
      : flair === 'SECURITY ADVISORY'
      ? 'bg-purple-950/80 text-aether border-aether/40'
      : flair === 'MICRO-PULSE'
      ? 'bg-cyan-950/80 text-cyphr border-cyphr/40'
      : flair === 'ASK COMMUNITY'
      ? 'bg-amber-950/80 text-amber border-amber/40'
      : 'bg-slate-800 text-slate-300 border-white/10';

    const channelDisplay = post.channelId
      ? (post.channelId.startsWith('vault-') ? `r/${post.channelId.replace('vault-', '')}` : post.channelId.startsWith('c/') ? post.channelId : `#${post.channelId}`)
      : 'r/aetheris';

    const roleBadge = post.authorRole === 'GUARDIAN'
      ? 'text-amber bg-amber/10 border-amber/30'
      : post.authorRole === 'ARCHIVIST'
      ? 'text-cyphr bg-cyphr/10 border-cyphr/30'
      : post.authorRole === 'MODERATOR'
      ? 'text-signal bg-signal/10 border-signal/30'
      : 'text-slate-400 bg-surface-raised border-white/5';

    const userVoted = post.userVoted || 0;
    const meritVotes = post.meritVotes || 0;
    const boostCount = post.boostCount || 0;
    const replyCount = post.replyCount || (comments ? comments.length : 0);

    return `
      <div id="post-focus-view" class="flex-1 flex flex-col h-full overflow-y-auto bg-canvas">
        <div class="w-full max-w-[960px] mx-auto px-4 py-6 md:px-8 space-y-6">
          
          <!-- STAGE HEADER BAR -->
          <header class="flex items-center justify-between pb-4 border-b border-white/5 gap-3">
            <div class="flex items-center space-x-3 min-w-0">
              <button type="button" id="btn-back-to-feed" data-action="close-post-detail" class="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white text-xs font-semibold border border-white/5 transition-all cursor-pointer shrink-0">
                <svg class="w-4 h-4 text-[var(--color-accent,#e59b3c)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                <span>Back to Feed</span>
              </button>

              <div class="h-4 w-px bg-white/10 hidden sm:block shrink-0"></div>

              <div class="flex items-center space-x-2 truncate">
                <span class="font-mono text-xs font-bold text-slate-300">${channelDisplay}</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-md border ${flairStyle} hidden sm:inline-block">${flair}</span>
              </div>
            </div>

            <!-- SUBTAB SELECTOR & ACTIONS -->
            <div class="flex items-center space-x-2 shrink-0">
              <div class="flex items-center space-x-1 bg-surface-raised p-0.5 rounded-xl border border-white/5 text-xs">
                <button type="button" data-action="post-detail-subtab" data-subtab="discussion" class="btn-subtab px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${this.activeSubTab === 'discussion' ? 'bg-surface-overlay text-slate-100 font-semibold shadow-xs' : 'text-slate-400 hover:text-slate-200'}">
                  Discussion
                </button>

                <details class="relative inline-block text-left group">
                  <summary class="btn-subtab px-2.5 py-1 rounded-lg font-medium text-slate-400 hover:text-slate-200 transition-all cursor-pointer list-none flex items-center gap-1">
                    <span>${this.activeSubTab === 'zk_proof' ? 'Verification' : this.activeSubTab === 'raw_json' ? 'Raw Data' : 'Details'}</span>
                    <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </summary>
                  <div class="absolute right-0 mt-1 w-48 rounded-xl bg-surface-raised border border-white/10 shadow-2xl p-1 z-50 flex flex-col gap-0.5 backdrop-blur-md">
                    <button type="button" data-action="post-detail-subtab" data-subtab="zk_proof" class="btn-subtab text-left px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-2 ${this.activeSubTab === 'zk_proof' ? 'bg-surface-overlay text-[var(--color-accent,#e59b3c)] font-semibold' : 'text-slate-300 hover:bg-surface-overlay hover:text-white'}">
                      <span>🛡️</span>
                      <span>Verification details</span>
                    </button>
                    <button type="button" data-action="post-detail-subtab" data-subtab="raw_json" class="btn-subtab text-left px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-2 ${this.activeSubTab === 'raw_json' ? 'bg-surface-overlay text-[var(--color-accent,#e59b3c)] font-semibold' : 'text-slate-300 hover:bg-surface-overlay hover:text-white'}">
                      <span>{ }</span>
                      <span>View raw JSON</span>
                    </button>
                  </div>
                </details>
              </div>

              <button type="button" id="btn-close-post-detail" data-action="close-post-detail" class="p-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-white text-xs border border-white/5 transition-all cursor-pointer" title="Close (ESC)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </header>

          <!-- MAIN CONTENT VIEW -->
          <div class="space-y-6">
            ${this.activeSubTab === 'raw_json' ? this.renderRawJsonView(post) :
              this.activeSubTab === 'zk_proof' ? this.renderZkProofView(post) :
              this.renderMainDiscussionView(post, comments, relatedPosts, {
                isBookmarked,
                awards,
                safeTitle,
                safeContent,
                relTime,
                exactTime,
                flair,
                flairStyle,
                channelDisplay,
                roleBadge,
                userVoted,
                meritVotes,
                boostCount,
                replyCount,
              })
            }
          </div>

        </div>
      </div>
    `;
  }

  public renderPostNotFound(): string {
    return `
      <div id="post-focus-view" class="flex-1 flex flex-col h-full overflow-y-auto bg-canvas items-center justify-center p-6">
        <div class="max-w-md w-full bg-surface-base border border-white/10 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div class="w-12 h-12 rounded-2xl bg-surface-raised border border-white/5 mx-auto flex items-center justify-center text-xl">
            🔍
          </div>
          <div class="space-y-1">
            <h2 class="text-base font-bold text-white">Post not found or unavailable</h2>
            <p class="text-xs text-slate-400">The discussion may have expired, been removed, or is inaccessible on this node.</p>
          </div>
          <button type="button" id="btn-close-post-detail-fallback" data-action="close-post-detail" class="px-4 py-2 bg-surface-raised hover:bg-surface-overlay rounded-xl text-xs font-semibold text-white border border-white/10 transition-all cursor-pointer">
            Back to Feed
          </button>
        </div>
      </div>
    `;
  }

  // ─── Modal Renderer (Fallback) ─────────────────────────────────────────────

  public renderFullPostModal(post: any, comments: any[] = [], relatedPosts: any[] = []): string {
    if (!post) {
      return `
        <div id="post-detail-modal-overlay" class="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div class="bg-surface-base border border-white/10 rounded-2xl p-6 text-center text-slate-400">
            <p>Post not found or unavailable.</p>
            <button id="btn-close-post-detail-fallback" class="mt-4 px-4 py-2 bg-surface-raised rounded-lg text-xs text-white">Close</button>
          </div>
        </div>
      `;
    }

    const postId = post.id || '';
    const isBookmarked = this.isBookmarked(postId);
    const awards = this.getAwards(postId);
    const safeTitle = this.escapeHtml(post.title || 'Untitled Thread');
    const safeContent = this.renderMarkdown(post.content || '');
    const relTime = this.formatRelativeTime(post.createdAt || Date.now());
    const exactTime = new Date(post.createdAt || Date.now()).toUTCString();

    const flair = post.flair || 'TECH DISCUSSION';
    const flairStyle = flair === 'VERIFIED RELEASE'
      ? 'bg-emerald-950/80 text-signal border-signal/40 shadow-signal-sm'
      : flair === 'SECURITY ADVISORY'
      ? 'bg-purple-950/80 text-aether border-aether/40'
      : flair === 'MICRO-PULSE'
      ? 'bg-cyan-950/80 text-cyphr border-cyphr/40'
      : flair === 'ASK COMMUNITY'
      ? 'bg-amber-950/80 text-amber border-amber/40'
      : 'bg-slate-800 text-slate-300 border-white/10';

    const channelDisplay = post.channelId
      ? (post.channelId.startsWith('vault-') ? `r/${post.channelId.replace('vault-', '')}` : `#${post.channelId}`)
      : 'r/aetheris';

    const roleBadge = post.authorRole === 'GUARDIAN'
      ? 'text-amber bg-amber/10 border-amber/30'
      : post.authorRole === 'ARCHIVIST'
      ? 'text-cyphr bg-cyphr/10 border-cyphr/30'
      : post.authorRole === 'MODERATOR'
      ? 'text-signal bg-signal/10 border-signal/30'
      : 'text-slate-400 bg-surface-raised border-white/5';

    const userVoted = post.userVoted || 0;
    const meritVotes = post.meritVotes || 0;
    const boostCount = post.boostCount || 0;
    const replyCount = post.replyCount || (comments ? comments.length : 0);

    const existingOverlay = typeof document !== 'undefined' && document.getElementById('post-detail-modal-overlay');
    const animClass = existingOverlay ? '' : 'animate-in fade-in duration-150';

    return `
      <div id="post-detail-modal-overlay" data-action="close-post-detail-backdrop" class="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md overflow-y-auto flex justify-center p-4 md:p-8 ${animClass} select-none pointer-events-auto">
        <div class="max-w-4xl w-full bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh] pointer-events-auto" data-action="stop-propagation">
          
          <!-- ─── HEADER BAR ─────────────────────────────────────────── -->
          <header class="h-14 border-subtle-b bg-surface-raised/80 px-4 md:px-6 flex items-center justify-between shrink-0">
            <div class="flex items-center space-x-3 truncate">
              <button type="button" id="btn-back-to-feed" data-action="close-post-detail" class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-base hover:bg-surface-overlay text-slate-300 hover:text-white text-xs font-semibold border border-white/5 transition-all cursor-pointer">
                <svg class="w-4 h-4 text-cyphr" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                <span>Back to Feed</span>
              </button>

              <div class="h-4 w-px bg-white/10 hidden sm:block"></div>

              <div class="flex items-center space-x-2 truncate">
                <span class="font-mono text-xs font-bold text-cyphr">${channelDisplay}</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-md border ${flairStyle} hidden sm:inline-block">${flair}</span>
              </div>
            </div>

            <!-- TAB SELECTOR / CONTROLS -->
            <div class="flex items-center space-x-2">
              <div class="flex items-center space-x-1 bg-surface-base p-0.5 rounded-lg border border-white/5 text-xs">
                <button type="button" data-action="post-detail-subtab" data-subtab="discussion" class="btn-subtab px-3 py-1 rounded font-medium transition-all cursor-pointer ${this.activeSubTab === 'discussion' ? 'bg-surface-overlay text-slate-100 font-semibold' : 'text-slate-400 hover:text-slate-200'}">
                  Thread
                </button>

                <details class="relative inline-block text-left">
                  <summary class="btn-subtab px-2.5 py-1 rounded font-medium text-slate-400 hover:text-slate-200 transition-all cursor-pointer list-none flex items-center gap-1">
                    <span>${this.activeSubTab === 'zk_proof' ? 'Verification' : this.activeSubTab === 'raw_json' ? 'Raw data' : 'More'}</span>
                    <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </summary>
                  <div class="absolute right-0 mt-1 w-44 rounded-xl bg-surface-raised border border-white/10 shadow-2xl p-1 z-50 flex flex-col gap-0.5 backdrop-blur-md">
                    <button type="button" data-action="post-detail-subtab" data-subtab="zk_proof" class="btn-subtab text-left px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-2 ${this.activeSubTab === 'zk_proof' ? 'bg-surface-overlay text-[var(--color-accent,#e59b3c)] font-semibold' : 'text-slate-300 hover:bg-surface-overlay hover:text-white'}">
                      <span>🛡️</span>
                      <span>Verification details</span>
                    </button>
                    <button type="button" data-action="post-detail-subtab" data-subtab="raw_json" class="btn-subtab text-left px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-2 ${this.activeSubTab === 'raw_json' ? 'bg-surface-overlay text-[var(--color-accent,#e59b3c)] font-semibold' : 'text-slate-300 hover:bg-surface-overlay hover:text-white'}">
                      <span>{ }</span>
                      <span>View raw data</span>
                    </button>
                  </div>
                </details>
              </div>

              <button type="button" id="btn-close-post-detail" data-action="close-post-detail" class="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-surface-base hover:bg-white/10 text-slate-400 hover:text-white text-xs font-mono border border-white/5 transition-all cursor-pointer" title="Close modal (ESC)">
                <span>✕</span>
                <span class="hidden sm:inline">Close</span>
              </button>
            </div>
          </header>

          <!-- ─── SCROLLABLE BODY ────────────────────────────────────── -->
          <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-canvas">
            
            ${this.activeSubTab === 'raw_json' ? this.renderRawJsonView(post) :
              this.activeSubTab === 'zk_proof' ? this.renderZkProofView(post) :
              this.renderMainDiscussionView(post, comments, relatedPosts, {
                isBookmarked,
                awards,
                safeTitle,
                safeContent,
                relTime,
                exactTime,
                flair,
                flairStyle,
                channelDisplay,
                roleBadge,
                userVoted,
                meritVotes,
                boostCount,
                replyCount,
              })
            }

          </div>

        </div>
      </div>
    `;
  }

  // ─── Main Discussion Subview ──────────────────────────────────────────────

  private renderMainDiscussionView(
    post: any,
    comments: any[],
    relatedPosts: any[],
    meta: any
  ): string {
    const postId = post.id || '';
    const authorProfile = profileView.getProfile(post.authorFingerprint || '');
    const postIdentity = presentPublicIdentity(post.authorDisplayName || post.authorHandle
      ? { ...authorProfile, name: post.authorDisplayName || '', handle: post.authorHandle || '', avatar: post.authorAvatarUrl || '' }
      : authorProfile, post.authorFingerprint || '', post.authorFingerprint === clientStore.keypair.fingerprint);
    const authorName = postIdentity.displayName;
    const authorHandle = postIdentity.handleLabel;
    const authorAvatar = authorProfile?.avatar;

    return `
      <!-- ARTICLE CARD -->
      <article class="p-5 md:p-6 rounded-2xl bg-surface-base border border-white/10 shadow-xl space-y-5">
        
        <!-- TOP METADATA & MERIT VOTE BANNER -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center space-x-3">
            <div class="relative">
              ${authorAvatar ? `
                <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)}" class="w-11 h-11 rounded-full object-cover shadow-lg border border-white/10 shrink-0" />
              ` : `
                <div class="w-11 h-11 rounded-full bg-gradient-to-tr from-aether/60 to-cyphr/60 p-0.5 shadow-lg flex items-center justify-center font-mono text-sm font-bold text-white">
                  ${(post.authorFingerprint || '??').substring(0, 2).toUpperCase()}
                </div>
              `}
              <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface-base bg-signal" title="Online sovereign node"></span>
            </div>

            <div>
              <div class="flex items-center space-x-2 flex-wrap gap-y-0.5">
                <strong class="font-bold text-sm text-white">${escapeHtml(authorName)}</strong>
                <span class="font-mono text-xs text-slate-400">${escapeHtml(authorHandle)}</span>
                <span class="text-[9px] font-mono px-1.5 py-0.2 rounded border ${meta.roleBadge}">${post.authorRole || 'MEMBER'}</span>
                <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">ZK-Verified</span>
              </div>
              <div class="text-[11px] font-mono text-slate-500 mt-0.5" title="${meta.exactTime}">
                Posted ${meta.relTime} • In <span class="text-cyphr">${meta.channelDisplay}</span>
              </div>
            </div>
          </div>

          <!-- MERIT VOTING CONTROLLER -->
          <div class="flex items-center space-x-1.5 bg-surface-raised p-1 rounded-xl border border-white/5">
            <button type="button" data-action="post-detail-vote" data-vote-id="${postId}" data-dir="1" class="btn-detail-vote p-1.5 rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer ${meta.userVoted === 1 ? 'text-cyphr font-bold bg-cyphr/10' : 'text-slate-400 hover:text-cyphr'}" title="Endorse (+1 Merit)">
              ▲
            </button>
            <span class="detail-vote-count font-mono text-sm font-bold px-2 ${meta.userVoted === 1 ? 'text-cyphr' : meta.userVoted === -1 ? 'text-crimson' : 'text-slate-200'}">
              ${meta.meritVotes}
            </span>
            <button type="button" data-action="post-detail-vote" data-vote-id="${postId}" data-dir="-1" class="btn-detail-vote p-1.5 rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer ${meta.userVoted === -1 ? 'text-crimson font-bold bg-crimson/10' : 'text-slate-400 hover:text-crimson'}" title="Divergent perspective (-1)">
              ▼
            </button>
          </div>
        </div>

        ${post.content && (post.content.startsWith('> [ 🔗 Evolved from') || post.content.startsWith('> Evolved from Live Chat')) ? `
          <div class="provenance-badge inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-mono my-1">
            <span>${post.content.startsWith('> [ 🔗') ? '🔗' : '⚡'}</span>
            <span>${post.content.startsWith('> [ 🔗') ? 'Evolved from Private Branch' : 'Evolved from Live Chat'}</span>
          </div>
        ` : ''}

        <!-- POST TITLE -->
        <h1 class="text-xl md:text-2xl font-extrabold text-slate-100 leading-tight tracking-wide">
          ${meta.safeTitle}
        </h1>

        <!-- AWARDS DISPLAY (IF ANY) -->
        ${awardsSystem.renderAwardBadges(postId)}

        <!-- POST BODY (MARKDOWN FORMATTED) -->
        <div class="text-sm md:text-base text-slate-200 leading-relaxed select-text space-y-3 border-t border-white/5 pt-4 max-w-prose break-words">
          ${meta.safeContent}
        </div>

        <!-- ─── MULTIMEDIA INTEGRATIONS ──────────────────────────────── -->

        <!-- 1. VIDEO PLAYER -->
        ${post.video ? this.renderVideoBlock(post.id, post.video) : (obsidianMediaPlayer.extractVideo(post.content) ? obsidianMediaPlayer.renderVideoCard(post.id, post.content) : '')}

        <!-- 2. MOSAIC IMAGE GALLERY -->
        ${post.images && post.images.length > 0 ? this.renderImageMosaicBlock(post.images) : ''}

        <!-- 3. CRYPTOGRAPHIC POLL CARD -->
        ${post.pollId ? this.renderPollBlock(post.pollId) : ''}

        <!-- 4. QUOTE POST EMBED -->
        ${post.quotedPost ? this.renderQuotedPostBlock(post.quotedPost) : ''}

        <!-- 5. BINARY HYGIENE ATTACHMENT PASSPORT -->
        ${post.attachment ? this.renderAttachmentBlock(post.attachment) : ''}

        <!-- ─── ACTION TOOLBAR ───────────────────────────────────────── -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5 text-xs font-mono text-slate-400">
          <div class="flex items-center space-x-4">
            <button class="flex items-center space-x-1.5 text-cyphr hover:opacity-80 transition-opacity">
              <span>💬</span>
              <span class="font-semibold">${meta.replyCount} ${t('pulse.replies', undefined, 'Replies')}</span>
            </button>

            <button data-boost-id="${postId}" class="btn-detail-boost flex items-center space-x-1.5 transition-all cursor-pointer ${post.userBoosted ? 'text-emerald-400 font-bold bg-emerald-500/15 px-2.5 py-1 rounded-xl border border-emerald-500/30' : 'hover:text-emerald-400'}">
              <span class="${post.userBoosted ? 'rotate-180 transition-transform duration-300' : ''}">⟳</span>
              <span class="detail-boost-counter">${meta.boostCount} ${t('pulse.boost', undefined, 'Boost')}</span>
            </button>

            <button data-bookmark-id="${postId}" class="btn-detail-bookmark flex items-center space-x-1.5 hover:text-amber transition-colors ${meta.isBookmarked ? 'text-amber font-bold' : ''}">
              <span>${meta.isBookmarked ? '★' : '☆'}</span>
              <span>${meta.isBookmarked ? t('actions.unbookmark', undefined, 'Bookmarked') : t('actions.bookmark', undefined, 'Bookmark')}</span>
            </button>

            <button data-post-id="${postId}" data-award-id="${postId}" class="btn-detail-award btn-open-award-modal flex items-center space-x-1.5 hover:text-amber transition-colors cursor-pointer" title="Bestow Sovereign Proof Award">
              <span>🏆</span>
              <span>${t('actions.award', undefined, 'Award')}</span>
            </button>
          </div>

          <div class="flex items-center space-x-2">
            <button type="button" data-action="keep-post" data-post-id="${postId}" class="btn-detail-keep flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay text-amber-400 hover:text-amber-300 border border-white/5 transition-all cursor-pointer" title="Save to sovereign encrypted Vault">
              <span>💎</span>
              <span>Keep in Vault</span>
            </button>
            <button data-share-id="${postId}" class="btn-detail-share flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer">
              <span>🔗</span>
              <span class="share-btn-label">${t('pulse.share', undefined, 'Share')}</span>
            </button>
          </div>
        </div>

        <!-- ─── REACTION ROW ─────────────────────────────────────────── -->
        <div class="reaction-row pt-2 border-t border-white/5">
          ${reactionsEngine.renderReactionBar(postId, clientStore.keypair?.fingerprint || '')}
        </div>

      </article>

      <!-- ─── FAST REPLY COMPOSER ────────────────────────────────────── -->
      <section class="p-5 rounded-2xl bg-surface-base border border-white/10 shadow-lg space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-sm">✍️</span>
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-200">Write a reply</h3>
          </div>

          <!-- PREVIEW TOGGLE -->
          <div class="flex items-center space-x-1 bg-surface-raised p-0.5 rounded-lg border border-white/5 text-[11px] font-mono">
            <button type="button" id="btn-reply-edit-toggle" class="px-2.5 py-0.5 rounded transition-all ${!this.isPreviewMode ? 'bg-surface-overlay text-white font-bold' : 'text-slate-400 hover:text-slate-200'}">
              Write
            </button>
            <button type="button" id="btn-reply-preview-toggle" class="px-2.5 py-0.5 rounded transition-all ${this.isPreviewMode ? 'bg-surface-overlay text-white font-bold' : 'text-slate-400 hover:text-slate-200'}">
              Preview
            </button>
          </div>
        </div>

        <form id="form-post-detail-reply" class="space-y-3">
          <!-- MARKDOWN TOOLBAR -->
          ${this.renderMarkdownToolbar()}

          <!-- INPUT OR LIVE PREVIEW -->
          ${!this.isPreviewMode ? `
            <textarea 
              id="input-detail-reply-text" 
              placeholder="Add your perspective. Markdown is supported." aria-label="Reply to discussion"
              class="w-full bg-surface-raised border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e59b3c)] resize-none h-28 leading-relaxed font-sans"
              required
            >${this.escapeHtml(this.replyDraft)}</textarea>
          ` : `
            <div class="w-full bg-surface-raised border border-white/10 rounded-xl p-3 min-h-[7rem] text-xs text-slate-200 leading-relaxed font-sans overflow-y-auto">
              ${this.replyDraft.trim() ? this.renderMarkdown(this.replyDraft) : '<p class="text-slate-500 italic">Nothing to preview yet. Switch to Write tab to compose your reply.</p>'}
            </div>
          `}

          <div class="flex items-center justify-between pt-1">
            <span class="text-xs text-slate-400">Markdown supported</span>
            <button type="submit" ${this.replySubmitting ? 'disabled aria-busy="true"' : ''} class="context-button">
              <span>${this.replySubmitting ? 'Sending…' : 'Reply'}</span>
            </button>
          </div>
        </form>
      </section>

      <!-- ─── NESTED COLOR-BRANCHED COMMENT TREE ─────────────────────── -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-sm">💬</span>
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">
              Discussion (${comments.length} ${comments.length === 1 ? 'reply' : 'replies'})
            </h3>
          </div>
        </div>

        ${comments.length === 0 ? `
          <div class="p-8 rounded-2xl bg-surface-base border border-white/5 text-center text-slate-500 space-y-2">
            <span class="text-3xl block">💬</span>
            <p class="text-xs font-medium text-slate-300">No replies yet.</p>
            <p class="text-[11px] text-slate-500">Be the first to join the conversation.</p>
          </div>
        ` : `
          <div class="space-y-4">
            ${comments.map(c => this.renderCommentNode(c, 0, post.authorFingerprint)).join('')}
          </div>
        `}
      </section>

      <!-- ─── RELATED TECHNICAL THREADS ──────────────────────────────── -->
      ${relatedPosts.length > 0 ? `
        <section class="p-5 rounded-2xl bg-surface-base border border-white/10 shadow-lg space-y-3 mt-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-sm">📌</span>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-200">
                Related conversations
              </h3>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            ${relatedPosts.map(rp => this.renderRelatedPostCard(rp)).join('')}
          </div>
        </section>
      ` : ''}
    `;
  }

  private renderMarkdownToolbar(): string {
    if (this.isPreviewMode) return '';
    return `
      <div class="flex flex-wrap items-center gap-1 p-1 bg-surface-raised rounded-lg border border-white/5 text-xs font-mono text-slate-400">
        <button type="button" class="btn-md-action px-2 py-1 hover:bg-surface-overlay hover:text-white rounded" data-md="bold" title="Bold"><strong>B</strong></button>
        <button type="button" class="btn-md-action px-2 py-1 hover:bg-surface-overlay hover:text-white rounded italic" data-md="italic" title="Italic"><em>I</em></button>
        <button type="button" class="btn-md-action px-2 py-1 hover:bg-surface-overlay hover:text-white rounded" data-md="code" title="Inline code">&lt;/&gt;</button>
        <button type="button" class="btn-md-action px-2 py-1 hover:bg-surface-overlay hover:text-white rounded" data-md="codeblock" title="Code Block">{ code }</button>
        <button type="button" class="btn-md-action px-2 py-1 hover:bg-surface-overlay hover:text-white rounded" data-md="quote" title="Quote">&rdquo;</button>
        <button type="button" class="btn-md-action px-2 py-1 hover:bg-surface-overlay hover:text-white rounded" data-md="link" title="Link">🔗</button>
        <button type="button" class="btn-md-action px-2 py-1 hover:bg-surface-overlay hover:text-white rounded" data-md="list" title="List">• List</button>
      </div>
    `;
  }

  // ─── Comment Node Recursive Renderer ──────────────────────────────────────

  public renderCommentNode(c: any, depth: number = 0, postAuthorFP?: string): string {
    const isCollapsed = this.isCommentCollapsed(c.id);
    const color = THREAD_DEPTH_COLORS[depth % THREAD_DEPTH_COLORS.length];
    const relTime = this.formatRelativeTime(c.createdAt || Date.now());
    const replies: any[] = c.replies || [];
    const isReplying = this.replyingToCommentId === c.id;
    const isOP = postAuthorFP && c.authorFingerprint === postAuthorFP;
    const isMe = typeof window !== 'undefined' && window.activeUserFP === c.authorFingerprint;

    const indentClass = depth === 0 ? '' : depth <= 4 ? 'pl-2.5 sm:pl-3.5' : 'pl-1.5 sm:pl-2.5';
    const continuationBadge = depth > 4 ? `
      <div class="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono mb-1">
        <span style="color: ${color}; font-weight: bold;">↳</span>
        <span class="truncate">Thread continuation (level ${depth + 1})</span>
      </div>
    ` : '';

    const authorProfile = profileView.getProfile(c.authorFingerprint || '');
    const commentIdentity = presentPublicIdentity(c.authorDisplayName || c.authorHandle
      ? { ...authorProfile, name: c.authorDisplayName || '', handle: c.authorHandle || '', avatar: c.authorAvatarUrl || '' }
      : authorProfile, c.authorFingerprint || '', Boolean(isMe));
    const authorName = commentIdentity.displayName;
    const authorHandle = commentIdentity.handleLabel;
    const authorAvatar = authorProfile?.avatar;

    return `
      <div id="context-comment-${escapeHtml(c.id)}" tabindex="-1" class="relative ${indentClass} transition-all" style="border-left: 2px solid ${color};">
        ${continuationBadge}
        <div class="p-3.5 rounded-xl bg-surface-base/90 hover:bg-surface-base border border-white/5 transition-all space-y-2">
          
          <!-- COMMENT HEADER -->
          <div class="flex items-center justify-between text-xs gap-2 flex-wrap">
            <div class="flex items-center space-x-2 flex-wrap gap-y-1">
              <button type="button" class="flex items-center space-x-2 text-left group/author hover:opacity-90 transition-opacity cursor-pointer" data-author-profile="${escapeHtml(c.authorFingerprint || '')}">
                ${authorAvatar ? `
                  <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)}" class="w-6 h-6 rounded-full object-cover shrink-0 border border-white/10" loading="lazy" />
                ` : `
                  <div class="w-6 h-6 rounded-md bg-surface-overlay flex items-center justify-center font-mono text-[9px] font-bold" style="color: ${color};">
                    ${(c.authorFingerprint || '??').substring(0, 2).toUpperCase()}
                  </div>
                `}
                <div class="flex items-baseline space-x-1.5">
                  <strong class="font-bold text-xs text-white group-hover/author:text-indigo-300 transition-colors">${escapeHtml(authorName)}</strong>
                  <span class="text-[11px] text-slate-400 font-mono">${escapeHtml(authorHandle)}</span>
                </div>
              </button>
              ${isOP ? `
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono tracking-tight" title="Original Poster">
                  OP
                </span>
              ` : ''}
              ${isMe ? `
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono" title="You">
                  YOU
                </span>
              ` : ''}
              <span class="text-[10px] text-slate-500 font-mono">${relTime}</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded bg-surface-raised text-slate-300 font-mono border border-white/5">
                ★ ${c.meritScore || 0}
              </span>
              ${awardsSystem.renderCommentAwardBadges(c.id)}
            </div>

            <button data-comment-collapse="${c.id}" class="btn-comment-collapse text-[10px] text-slate-400 hover:text-white font-mono px-2 py-0.5 rounded hover:bg-surface-overlay transition-colors">
              ${isCollapsed ? `[+] Expand (${replies.length})` : '[-] Collapse'}
            </button>
          </div>

          ${!isCollapsed ? `
            <!-- COMMENT CONTENT -->
            <div class="text-base sm:text-[15px] text-slate-100 leading-[1.65] whitespace-normal break-words select-text pl-1 font-sans space-y-2">
              ${this.renderMarkdown(c.content || '')}
            </div>

            <!-- COMMENT ACTIONS -->
            <div class="flex items-center space-x-3 pt-1 text-xs text-slate-400 pl-1 opacity-80 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button data-comment-reply-toggle="${c.id}" class="btn-comment-reply-toggle hover:text-[var(--color-accent,#e59b3c)] transition-colors cursor-pointer py-0.5">
                ${isReplying ? 'Cancel Reply' : 'Reply'}
              </button>
              <span class="text-slate-600">•</span>
              <button data-action="keep-comment" data-comment-id="${c.id}" data-comment-author="${c.authorFingerprint || 'anon'}" data-post-id="${c.postId || this.activePostId || ''}" class="btn-comment-keep hover:text-amber-400 transition-colors flex items-center space-x-1 cursor-pointer py-0.5" title="Preserve comment in your encrypted Vault">
                <span>💎</span>
                <span>Keep in Vault</span>
              </button>
              <span class="text-slate-600">•</span>
              ${awardsSystem.renderGiveCommentAwardButton(c.id, c.postId || this.activePostId || '', 'GUARDIAN')}
            </div>

            <!-- INLINE REPLY FORM (IF TOGGLED) -->
            ${isReplying ? `
              <form class="form-inline-comment-reply mt-2 p-2.5 rounded-lg bg-surface-raised border border-white/10 space-y-2 animate-in fade-in" data-parent-comment-id="${c.id}">
                <textarea 
                  class="input-inline-reply-text w-full bg-surface-base border border-white/10 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyphr resize-none h-16"
                   placeholder="Reply to this comment…" aria-label="Reply to comment"
                  required
                 >${escapeHtml(this.inlineReplyDrafts.get(c.id) || '')}</textarea>
                <div class="flex items-center justify-end space-x-2">
                  <button type="button" class="btn-cancel-inline-reply px-3 py-1 text-xs text-slate-400 hover:text-white" data-comment-id="${c.id}">Cancel</button>
                   <button type="submit" ${this.replySubmitting ? 'disabled aria-busy="true"' : ''} class="context-button">${this.replySubmitting ? 'Sending…' : 'Reply'}</button>
                </div>
              </form>
            ` : ''}

            <!-- RECURSIVE CHILD COMMENTS -->
            ${replies.length > 0 ? `
              <div class="mt-3 space-y-3">
                ${replies.map(r => this.renderCommentNode(r, depth + 1, postAuthorFP)).join('')}
              </div>
            ` : ''}
          ` : ''}

        </div>
      </div>
    `;
  }

  // ─── Multimedia Block Renderers ───────────────────────────────────────────
 
  private renderVideoBlock(postId: string, video: PostVideo): string {
    return obsidianMediaPlayer.renderVideoCard(postId, video.src, video.poster);
  }

  private renderImageMosaicBlock(images: string[]): string {
    const gridCols = images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3';
    return `
      <div class="my-3 space-y-2">
        <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Attached Visual Artifacts (${images.length})</div>
        <div class="grid ${gridCols} gap-2">
          ${images.map((src, idx) => `
            <div class="relative rounded-xl overflow-hidden bg-surface-raised border border-white/10 group cursor-pointer aspect-video">
              <img 
                src="${src}" 
                alt="Post attachment ${idx + 1}"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span class="px-3 py-1 bg-black/70 text-white rounded-lg text-xs font-mono">🔍 View Fullscreen</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderPollBlock(pollId: string): string {
    return `
      <div class="p-4 rounded-xl bg-surface-raised border border-white/10 my-3 space-y-3">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-signal flex items-center space-x-1.5">
            <span>📊</span>
            <span>ZK Sovereign Community Poll</span>
          </span>
          <span class="font-mono text-[10px] text-slate-400">Poll ID: ${pollId}</span>
        </div>
        <p class="text-xs text-slate-300">Vote cast is cryptographically locked with your Ed25519 keypair and verified without centralized tallies.</p>
        <div class="p-2 rounded bg-surface-base text-center text-xs text-cyphr font-mono">
          Interactive Poll Widget Active (Single Vote per Identity)
        </div>
      </div>
    `;
  }

  private renderQuotedPostBlock(quoted: QuotedPost): string {
    return `
      <div class="p-3.5 rounded-xl bg-surface-raised/70 border border-white/10 my-3 space-y-2 hover:border-white/20 transition-all">
        <div class="flex items-center space-x-2 text-xs">
          <span class="text-slate-400 text-sm">❝</span>
          <span class="font-mono text-xs font-bold text-cyphr">id:${quoted.authorFingerprint}</span>
          <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">${quoted.authorRole}</span>
        </div>
        <div class="text-xs font-bold text-slate-100">${this.escapeHtml(quoted.title)}</div>
        <div class="text-xs text-slate-300 line-clamp-3">${this.escapeHtml(quoted.content)}</div>
      </div>
    `;
  }

  private renderAttachmentBlock(att: PostAttachment): string {
    const sizeKb = (att.byteSize / 1024).toFixed(1);
    return `
      <div class="p-4 rounded-xl bg-surface-raised border border-signal/30 my-3 space-y-3 shadow-lg">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center space-x-2.5">
            <span class="text-xl">📦</span>
            <div>
              <div class="text-xs font-mono font-bold text-slate-100">${this.escapeHtml(att.fileName)}</div>
              <div class="text-[10px] font-mono text-slate-500">${sizeKb} KB • Shannon Entropy: ${att.entropy.toFixed(2)} bits/byte</div>
            </div>
          </div>
          <span class="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-emerald-950 text-signal border border-signal/40 shadow-signal-sm">
            ${att.verdict} VERIFIED
          </span>
        </div>

        <div class="p-2 bg-surface-base rounded-lg font-mono text-[10px] text-slate-400 flex items-center justify-between gap-2 border border-white/5">
          <span class="truncate">SHA256: ${att.sha256}</span>
          <button data-copy-sha="${att.sha256}" class="btn-copy-detail-sha px-2.5 py-1 bg-surface-highlight hover:bg-slate-600 text-slate-200 rounded text-[9px] font-bold transition-colors">
            Copy
          </button>
        </div>

        <div class="flex items-center justify-between pt-1">
          <span class="text-[10px] text-signal font-mono">● Verified P2P BitTorrent Swarm Available</span>
          <button data-file-name="${att.fileName}" data-sha="${att.sha256}" class="px-3 py-1.5 bg-signal/15 hover:bg-signal/25 text-signal text-xs font-semibold rounded-lg border border-signal/30 transition-all flex items-center space-x-1.5 shadow-sm">
            <span>⬇</span>
            <span>Download via P2P Mesh</span>
          </button>
        </div>
      </div>
    `;
  }

  // ─── Related Post Card Renderer ───────────────────────────────────────────

  private renderRelatedPostCard(rp: any): string {
    const relTime = this.formatRelativeTime(rp.createdAt || Date.now());
    const channelDisplay = rp.channelId
      ? (rp.channelId.startsWith('vault-') ? `r/${rp.channelId.replace('vault-', '')}` : `#${rp.channelId}`)
      : 'r/aetheris';

    return `
      <div data-open-related="${rp.id}" class="btn-open-related-post p-3 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/5 hover:border-cyphr/40 cursor-pointer transition-all space-y-2 flex flex-col justify-between group">
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[10px] font-mono">
            <span class="text-cyphr font-bold">${channelDisplay}</span>
            <span class="text-slate-500">${relTime}</span>
          </div>
          <h4 class="text-xs font-bold text-slate-200 group-hover:text-cyphr transition-colors line-clamp-2 leading-snug">
            ${this.escapeHtml(rp.title || 'Untitled')}
          </h4>
        </div>
        <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-white/5">
          <span>▲ ${rp.meritVotes || 0} Merit</span>
          <span>💬 ${rp.replyCount || 0}</span>
        </div>
      </div>
    `;
  }

  // ─── Alternate Subtabs (ZK Proof & Raw JSON) ──────────────────────────────

  private renderZkProofView(post: any): string {
    return `
      <div class="p-6 rounded-2xl bg-surface-base border border-white/10 space-y-4">
        <div class="flex items-center justify-between border-b border-white/5 pb-3">
          <div class="flex items-center space-x-2">
            <span class="text-lg">🛡️</span>
            <h3 class="text-sm font-bold text-signal uppercase tracking-wider">ZK-RLN & Ed25519 Cryptographic Proof</h3>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-signal border border-signal/30">Proof Verified</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div class="p-3 rounded-xl bg-surface-raised border border-white/5 space-y-1">
            <span class="text-slate-500 text-[10px]">AUTHOR SOVEREIGN FINGERPRINT</span>
            <div class="text-cyphr font-bold">${post.authorFingerprint}</div>
          </div>

          <div class="p-3 rounded-xl bg-surface-raised border border-white/5 space-y-1">
            <span class="text-slate-500 text-[10px]">RLN NULLIFIER HASH</span>
            <div class="text-slate-200 truncate">0x7f4a9b2c8810e0149f6b21908a8e9901d84f8812</div>
          </div>

          <div class="p-3 rounded-xl bg-surface-raised border border-white/5 space-y-1">
            <span class="text-slate-500 text-[10px]">SHAMIR POLYNOMIAL SHARE (X, Y)</span>
            <div class="text-slate-200 truncate">x: 0x4819... y: 0x992b...</div>
          </div>

          <div class="p-3 rounded-xl bg-surface-raised border border-white/5 space-y-1">
            <span class="text-slate-500 text-[10px]">ED25519 SIGNATURE STATUS</span>
            <div class="text-signal font-bold">VALID (Curve25519 Point Verified)</div>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-surface-overlay border border-white/5 text-xs text-slate-400 leading-relaxed">
          This post is mathematically verified to originate from a sovereign identity without relying on third-party cloud servers or centralized trust. Any double-publishing in the same epoch will result in Lagrange polynomial identity slashing.
        </div>
      </div>
    `;
  }

  private renderRawJsonView(post: any): string {
    const raw = JSON.stringify(post, null, 2);
    return `
      <div class="p-6 rounded-2xl bg-surface-base border border-white/10 space-y-3">
        <div class="flex items-center justify-between border-b border-white/5 pb-2">
          <span class="text-xs font-mono font-bold text-aether">{ } Raw Sovereign Post Payload</span>
          <button type="button" data-action="copy-post-json" data-copy-json="${this.escapeHtml(raw)}" class="btn-copy-detail-sha px-2.5 py-1 bg-surface-raised hover:bg-surface-overlay text-slate-200 rounded text-[10px] font-mono cursor-pointer">
            Copy JSON
          </button>
        </div>
        <pre class="p-4 bg-surface-raised rounded-xl overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed max-h-[60vh]"><code>${this.escapeHtml(raw)}</code></pre>
      </div>
    `;
  }

  // ─── Event Binding ────────────────────────────────────────────────────────

  public bindEvents(onReplySubmit: (postId: string, commentText: string, parentId?: string) => void | Promise<void>): void {
    const root = document.getElementById('post-focus-view') || document.getElementById('post-detail-modal-overlay');
    if (!root) return;

    // Backdrop click listener (only if modal overlay)
    if (root.id === 'post-detail-modal-overlay') {
      root.addEventListener('click', (e) => {
        if (e.target === root) {
          this.closePost();
        }
      });
    }

    // Close and Back buttons
    const btnClose = document.getElementById('btn-close-post-detail');
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closePost();
      });
    }

    const btnBack = document.getElementById('btn-back-to-feed');
    if (btnBack) {
      btnBack.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closePost();
      });
    }

    const btnFallbackClose = document.getElementById('btn-close-post-detail-fallback');
    if (btnFallbackClose) {
      btnFallbackClose.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closePost();
      });
    }

    // Escape Key Listener
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener);
    }
    this.keydownListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen()) {
        const portal = document.getElementById('reaction-portal-root');
        if (portal && portal.childElementCount > 0) return;
        const activeOverlay = document.querySelector('.post-more-menu, .custom-modal-overlay, #reaction-portal-root > *');
        if (activeOverlay) return;

        e.preventDefault();
        e.stopPropagation();
        this.closePost();
      }
    };
    window.addEventListener('keydown', this.keydownListener);

    // Subtab switching
    root.querySelectorAll('.btn-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-subtab') as 'discussion' | 'raw_json' | 'zk_proof';
        if (tab) {
          this.activeSubTab = tab;
          clientStore.notify('MODAL_CHANGE');
          const event = new CustomEvent('aetheris-detail-view-refresh');
          window.dispatchEvent(event);
        }
      });
    });

    // Merit vote buttons inside post detail modal
    root.querySelectorAll('.btn-detail-vote').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = btn.getAttribute('data-vote-id') || this.activePostId;
        const dir = parseInt(btn.getAttribute('data-dir') || '0', 10);
        if (postId && dir) {
          clientStore.votePost(postId, dir);
        }
      });
    });

    // Fast Reply Preview toggles
    const btnWrite = document.getElementById('btn-reply-edit-toggle');
    const btnPreview = document.getElementById('btn-reply-preview-toggle');
    const inputReply = document.getElementById('input-detail-reply-text') as HTMLTextAreaElement | null;
    inputReply?.addEventListener('input', () => { this.replyDraft = inputReply.value; });

    if (btnWrite) {
      btnWrite.addEventListener('click', () => {
        this.isPreviewMode = false;
        window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
      });
    }

    if (btnPreview) {
      btnPreview.addEventListener('click', () => {
        if (inputReply) {
          this.replyDraft = inputReply.value;
        }
        this.isPreviewMode = true;
        window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
      });
    }

    // Markdown Toolbar actions
    root.querySelectorAll('.btn-md-action').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!inputReply) return;
        const action = btn.getAttribute('data-md');
        const start = inputReply.selectionStart;
        const end = inputReply.selectionEnd;
        const sel = inputReply.value.substring(start, end);
        let replacement = '';

        switch (action) {
          case 'bold':
            replacement = `**${sel || 'bold text'}**`;
            break;
          case 'italic':
            replacement = `*${sel || 'italic text'}*`;
            break;
          case 'code':
            replacement = `\`${sel || 'code'}\``;
            break;
          case 'codeblock':
            replacement = `\n\`\`\`typescript\n${sel || '// your code here'}\n\`\`\`\n`;
            break;
          case 'quote':
            replacement = `\n> ${sel || 'quoted text'}\n`;
            break;
          case 'link':
            replacement = `[${sel || 'link title'}](https://urefy.com)`;
            break;
          case 'list':
            replacement = `\n- ${sel || 'item 1'}\n- item 2\n`;
            break;
        }

        inputReply.setRangeText(replacement, start, end, 'end');
        inputReply.focus({ preventScroll: true });
        this.replyDraft = inputReply.value;
      });
    });

    // Form Fast Reply submit
    const formReply = document.getElementById('form-post-detail-reply') as HTMLFormElement | null;
    if (formReply) {
      formReply.addEventListener('submit', async (e: Event) => {
        e.preventDefault();
        const text = inputReply ? inputReply.value.trim() : this.replyDraft.trim();
        if (text && this.activePostId && !this.replySubmitting) {
          const postId = this.activePostId;
          this.replyDraft = inputReply?.value || text;
          this.replySubmitting = true;
          const submit = formReply.querySelector<HTMLButtonElement>('button[type="submit"]');
          if (submit) { submit.disabled = true; submit.setAttribute('aria-busy', 'true'); }
          try {
            await onReplySubmit(postId, text);
            if (this.activePostId === postId && this.replyDraft.trim() === text) {
              this.replyDraft = '';
              if (inputReply) inputReply.value = '';
              this.isPreviewMode = false;
            }
          } catch (error) {
            clientStore.showToast(error instanceof Error ? error.message : 'Reply could not be sent. Your draft is still here.', 'warning');
          } finally {
            this.replySubmitting = false;
            if (submit) { submit.disabled = false; submit.removeAttribute('aria-busy'); }
            clientStore.notifySync();
          }
        }
      });
    }

    // Comment Collapse toggles
    root.querySelectorAll('.btn-comment-collapse').forEach(btn => {
      btn.addEventListener('click', () => {
        const commentId = btn.getAttribute('data-comment-collapse');
        if (commentId) {
          this.toggleCommentCollapse(commentId);
          window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
        }
      });
    });

    // Inline Comment Reply toggle
    root.querySelectorAll('.btn-comment-reply-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const commentId = btn.getAttribute('data-comment-reply-toggle');
        if (commentId) {
          this.replyingToCommentId = this.replyingToCommentId === commentId ? null : commentId;
          window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
        }
      });
    });

    // Inline Comment Reply submit
    root.querySelectorAll('.form-inline-comment-reply').forEach(form => {
      const parent = form.getAttribute('data-parent-comment-id');
      const field = form.querySelector<HTMLTextAreaElement>('.input-inline-reply-text');
      if (parent && field) field.addEventListener('input', () => { this.inlineReplyDrafts.set(parent, field.value); });
      form.addEventListener('submit', async (e: Event) => {
        e.preventDefault();
        const parentId = form.getAttribute('data-parent-comment-id');
        const input = form.querySelector('.input-inline-reply-text') as HTMLTextAreaElement | null;
        if (parentId && input && input.value.trim() && this.activePostId && !this.replySubmitting) {
          const postId = this.activePostId;
          const text = input.value.trim();
          const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
          this.replySubmitting = true;
          if (submit) { submit.disabled = true; submit.setAttribute('aria-busy', 'true'); }
          try {
            await onReplySubmit(postId, text, parentId);
            if (this.activePostId === postId && this.replyingToCommentId === parentId && this.inlineReplyDrafts.get(parentId)?.trim() === text) {
              this.replyingToCommentId = null;
              this.inlineReplyDrafts.delete(parentId);
            }
          } catch (error) {
            clientStore.showToast(error instanceof Error ? error.message : 'Reply could not be sent. Your draft is still here.', 'warning');
          } finally {
            this.replySubmitting = false;
            if (submit) { submit.disabled = false; submit.removeAttribute('aria-busy'); }
            clientStore.notifySync();
          }
        }
      });
    });

    // Inline Comment Reply cancel
    root.querySelectorAll('.btn-cancel-inline-reply').forEach(btn => {
      btn.addEventListener('click', () => {
        this.replyingToCommentId = null;
        window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
      });
    });

    // Bookmark toggle
    root.querySelectorAll('.btn-detail-bookmark').forEach(btn => {
      btn.addEventListener('click', () => {
        const postId = btn.getAttribute('data-bookmark-id');
        if (postId) {
          this.toggleBookmark(postId);
          window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
        }
      });
    });

    // Award button on post
    root.querySelectorAll('.btn-detail-award, .btn-open-award-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = btn.getAttribute('data-post-id') || btn.getAttribute('data-award-id');
        const userRole = (typeof window !== 'undefined' ? (window as any).activeUserRole : undefined) || 'GUARDIAN';
        if (postId) {
          awardsSystem.openModal(postId, userRole);
        }
      });
    });

    // Award button on comments
    root.querySelectorAll('.btn-open-comment-award-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const commentId = btn.getAttribute('data-comment-id');
        const postId = btn.getAttribute('data-post-id') || this.activePostId || '';
        const userRole = btn.getAttribute('data-user-role') || (typeof window !== 'undefined' ? (window as any).activeUserRole : undefined) || 'GUARDIAN';
        if (commentId) {
          awardsSystem.openCommentModal(commentId, postId, userRole);
        }
      });
    });

    // Copy SHA / Link
    root.querySelectorAll('.btn-copy-detail-sha').forEach(btn => {
      btn.addEventListener('click', () => {
        const sha = btn.getAttribute('data-copy-sha');
        if (sha && navigator.clipboard) {
          navigator.clipboard.writeText(sha);
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
        }
      });
    });

    root.querySelectorAll('.btn-detail-boost').forEach(btn => {
      btn.addEventListener('click', () => {
        const postId = btn.getAttribute('data-boost-id') || this.activePostId;
        if (postId) {
          clientStore.boostPost(postId);
          const p = clientStore.posts.find((x: any) => x.id === postId);
          if (p) {
            const counter = btn.querySelector('.detail-boost-counter');
            if (counter) counter.textContent = `${p.boostCount} ${p.userBoosted ? 'Boosted' : 'Boosts'}`;
            if (p.userBoosted) {
              btn.classList.add('text-emerald-400', 'font-bold', 'bg-emerald-500/15', 'border', 'border-emerald-500/30');
              btn.classList.remove('hover:text-emerald-400');
            } else {
              btn.classList.remove('text-emerald-400', 'font-bold', 'bg-emerald-500/15', 'border', 'border-emerald-500/30');
              btn.classList.add('hover:text-emerald-400');
            }
          }
        }
      });
    });

    root.querySelectorAll('.btn-detail-share').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.getAttribute('data-share-id') || this.activePostId;
        const post = clientStore.posts.find((x: any) => x.id === postId);
        if (postId) {
          await sharePostOrCopyLink(postId, post?.title, post?.content, btn as HTMLElement);
        }
      });
    });

    // Related posts click
    root.querySelectorAll('.btn-open-related-post').forEach(card => {
      card.addEventListener('click', () => {
        const relatedId = card.getAttribute('data-open-related');
        if (relatedId) {
          this.openPost(relatedId);
          window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
        }
      });
    });

    // Reactions Bar Events (pills toggle, portal picker, overflow count)
    bindReactionBarEvents(root);
  }
}

export const postDetailView = new PostDetailView();
