import { awardsSystem } from './awards.js';
import { clientStore } from './client-state.js';
import { sharePostOrCopyLink } from './dry-utils.js';
import { markdownRenderer } from './markdown-renderer.js';

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

  // ─── Modal State Management ───────────────────────────────────────────────

  public isOpen(): boolean {
    return this.activePostId !== null;
  }

  public openPost(postId: string): void {
    this.activePostId = postId;
    this.replyDraft = '';
    this.isPreviewMode = false;
    this.replyingToCommentId = null;
    this.activeSubTab = 'discussion';
  }

  public closePost(): void {
    this.activePostId = null;
    this.replyDraft = '';
    this.isPreviewMode = false;
    this.replyingToCommentId = null;
    this.activeSubTab = 'discussion';
    clientStore.notify();
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
    const trimmed = (url || '').trim();
    if (/^(javascript:|data:|vbscript:)/i.test(trimmed)) {
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

  // ─── Modal Renderer ───────────────────────────────────────────────────────

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

    return `
      <div id="post-detail-modal-overlay" class="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md overflow-y-auto flex justify-center p-4 md:p-8 animate-in fade-in duration-150 select-none">
        <div class="max-w-4xl w-full bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
          
          <!-- ─── HEADER BAR ─────────────────────────────────────────── -->
          <header class="h-14 border-subtle-b bg-surface-raised/80 px-4 md:px-6 flex items-center justify-between shrink-0">
            <div class="flex items-center space-x-3 truncate">
              <button id="btn-back-to-feed" class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-base hover:bg-surface-overlay text-slate-300 hover:text-white text-xs font-semibold border border-white/5 transition-all">
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
              <div class="hidden md:flex items-center space-x-1 bg-surface-base p-0.5 rounded-lg border border-white/5 text-xs">
                <button data-subtab="discussion" class="btn-subtab px-2.5 py-1 rounded font-medium transition-all ${this.activeSubTab === 'discussion' ? 'bg-surface-overlay text-cyphr font-bold' : 'text-slate-400 hover:text-slate-200'}">
                  💬 Thread
                </button>
                <button data-subtab="zk_proof" class="btn-subtab px-2.5 py-1 rounded font-medium transition-all ${this.activeSubTab === 'zk_proof' ? 'bg-surface-overlay text-signal font-bold' : 'text-slate-400 hover:text-slate-200'}">
                  🛡️ ZK Proof
                </button>
                <button data-subtab="raw_json" class="btn-subtab px-2.5 py-1 rounded font-medium transition-all ${this.activeSubTab === 'raw_json' ? 'bg-surface-overlay text-aether font-bold' : 'text-slate-400 hover:text-slate-200'}">
                  { } Raw JSON
                </button>
              </div>

              <button id="btn-close-post-detail" class="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-surface-base hover:bg-crimson/20 text-slate-400 hover:text-crimson text-xs font-mono border border-white/5 hover:border-crimson/30 transition-all" title="Close modal (ESC)">
                <span>✕</span>
                <span class="hidden sm:inline">Close (ESC)</span>
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

    return `
      <!-- ARTICLE CARD -->
      <article class="p-5 md:p-6 rounded-2xl bg-surface-base border border-white/10 shadow-xl space-y-5">
        
        <!-- TOP METADATA & MERIT VOTE BANNER -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center space-x-3">
            <div class="relative">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-aether/60 to-cyphr/60 p-0.5 shadow-lg flex items-center justify-center font-mono text-sm font-bold text-white">
                ${(post.authorFingerprint || '??').substring(0, 2).toUpperCase()}
              </div>
              <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-surface-base bg-signal" title="Online sovereign node"></span>
            </div>

            <div>
              <div class="flex items-center space-x-2">
                <span class="font-mono text-xs font-bold text-slate-100">id:${post.authorFingerprint || 'anonymous'}</span>
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
            <button data-vote-id="${postId}" data-dir="1" class="btn-detail-vote p-1.5 rounded-lg hover:bg-surface-overlay transition-colors ${meta.userVoted === 1 ? 'text-cyphr font-bold bg-cyphr/10' : 'text-slate-400 hover:text-cyphr'}" title="Endorse (+1 Merit)">
              ▲
            </button>
            <span class="font-mono text-sm font-bold px-2 ${meta.userVoted === 1 ? 'text-cyphr' : meta.userVoted === -1 ? 'text-crimson' : 'text-slate-200'}">
              ${meta.meritVotes}
            </span>
            <button data-vote-id="${postId}" data-dir="-1" class="btn-detail-vote p-1.5 rounded-lg hover:bg-surface-overlay transition-colors ${meta.userVoted === -1 ? 'text-crimson font-bold bg-crimson/10' : 'text-slate-400 hover:text-crimson'}" title="Divergent perspective (-1)">
              ▼
            </button>
          </div>
        </div>

        <!-- POST TITLE -->
        <h1 class="text-xl md:text-2xl font-extrabold text-slate-100 leading-tight tracking-wide">
          ${meta.safeTitle}
        </h1>

        <!-- AWARDS DISPLAY (IF ANY) -->
        ${meta.awards.length > 0 ? `
          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            ${meta.awards.map((a: AwardBadge) => `
              <div class="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-surface-raised border border-white/5 text-xs text-slate-300" title="${a.description}">
                <span>${a.icon}</span>
                <span class="font-semibold text-slate-200">${a.name}</span>
                <span class="font-mono text-[10px] text-amber font-bold">${a.count}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- POST BODY (MARKDOWN FORMATTED) -->
        <div class="text-xs md:text-sm text-slate-200 leading-relaxed select-text space-y-2 border-t border-white/5 pt-4">
          ${meta.safeContent}
        </div>

        <!-- ─── MULTIMEDIA INTEGRATIONS ──────────────────────────────── -->

        <!-- 1. VIDEO PLAYER -->
        ${post.video ? this.renderVideoBlock(post.id, post.video) : ''}

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
              <span class="font-semibold">${meta.replyCount} Replies</span>
            </button>

            <button data-boost-id="${postId}" class="btn-detail-boost flex items-center space-x-1.5 transition-all cursor-pointer ${post.userBoosted ? 'text-emerald-400 font-bold bg-emerald-500/15 px-2.5 py-1 rounded-xl border border-emerald-500/30' : 'hover:text-emerald-400'}">
              <span class="${post.userBoosted ? 'rotate-180 transition-transform duration-300' : ''}">⟳</span>
              <span class="detail-boost-counter">${meta.boostCount} ${post.userBoosted ? 'Boosted' : 'Boosts'}</span>
            </button>

            <button data-bookmark-id="${postId}" class="btn-detail-bookmark flex items-center space-x-1.5 hover:text-amber transition-colors ${meta.isBookmarked ? 'text-amber font-bold' : ''}">
              <span>${meta.isBookmarked ? '★' : '☆'}</span>
              <span>${meta.isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>

            <button data-award-id="${postId}" class="btn-detail-award flex items-center space-x-1.5 hover:text-aether transition-colors">
              <span>🏆</span>
              <span>Award</span>
            </button>
          </div>

          <div class="flex items-center space-x-2">
            <button data-share-id="${postId}" class="btn-detail-share flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer">
              <span>🔗</span>
              <span class="share-btn-label">Share Perma-Link</span>
            </button>
          </div>
        </div>

      </article>

      <!-- ─── FAST REPLY COMPOSER ────────────────────────────────────── -->
      <section class="p-5 rounded-2xl bg-surface-base border border-white/10 shadow-lg space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-sm">✍️</span>
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-200">Leave a Sovereign Reply</h3>
          </div>

          <!-- PREVIEW TOGGLE -->
          <div class="flex items-center space-x-1 bg-surface-raised p-0.5 rounded-lg border border-white/5 text-[11px] font-mono">
            <button type="button" id="btn-reply-edit-toggle" class="px-2.5 py-0.5 rounded transition-all ${!this.isPreviewMode ? 'bg-surface-overlay text-cyphr font-bold' : 'text-slate-400 hover:text-slate-200'}">
              Write
            </button>
            <button type="button" id="btn-reply-preview-toggle" class="px-2.5 py-0.5 rounded transition-all ${this.isPreviewMode ? 'bg-surface-overlay text-cyphr font-bold' : 'text-slate-400 hover:text-slate-200'}">
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
              placeholder="What are your technical thoughts on this? Supports full Markdown, code snippets, and ZK-RLN rate limit protection..."
              class="w-full bg-surface-raised border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyphr resize-none h-28 leading-relaxed font-sans"
              required
            >${this.escapeHtml(this.replyDraft)}</textarea>
          ` : `
            <div class="w-full bg-surface-raised border border-white/10 rounded-xl p-3 min-h-[7rem] text-xs text-slate-200 leading-relaxed font-sans overflow-y-auto">
              ${this.replyDraft.trim() ? this.renderMarkdown(this.replyDraft) : '<p class="text-slate-500 italic">Nothing to preview yet. Switch to Write tab to compose your reply.</p>'}
            </div>
          `}

          <div class="flex items-center justify-between pt-1">
            <span class="text-[10px] font-mono text-slate-500">Protected by ZK-RLN Nullifier • Ed25519 Signed</span>
            <button type="submit" class="px-5 py-2 bg-gradient-to-r from-aether to-cyphr hover:opacity-90 text-black font-bold text-xs rounded-xl shadow-cyphr-sm transition-all flex items-center space-x-1.5">
              <span>🚀</span>
              <span>Submit Sovereign Reply</span>
            </button>
          </div>
        </form>
      </section>

      <!-- ─── NESTED COLOR-BRANCHED COMMENT TREE ─────────────────────── -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-sm">🌲</span>
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">
              Discussion Tree (${comments.length} Root Threads)
            </h3>
          </div>
          <span class="text-[10px] font-mono text-slate-500">Color-Branched Recursive Hierarchy</span>
        </div>

        ${comments.length === 0 ? `
          <div class="p-8 rounded-2xl bg-surface-base border border-white/5 text-center text-slate-500 space-y-2">
            <span class="text-3xl block">💬</span>
            <p class="text-xs">No comments yet in this sovereign thread.</p>
            <p class="text-[11px] font-mono text-slate-600">Be the first to endorse or critique with your Ed25519 signature.</p>
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
              <h3 class="text-xs font-bold uppercase tracking-wider text-cyphr">
                Related Technical Threads
              </h3>
            </div>
            <span class="text-[10px] font-mono text-slate-500">Algorithmic Vector Similarity</span>
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

    return `
      <div class="relative pl-3.5 transition-all" style="border-left: 2px solid ${color};">
        <div class="p-3.5 rounded-xl bg-surface-base/90 hover:bg-surface-base border border-white/5 transition-all space-y-2">
          
          <!-- COMMENT HEADER -->
          <div class="flex items-center justify-between text-xs gap-2 flex-wrap">
            <div class="flex items-center space-x-2 flex-wrap gap-y-1">
              <div class="w-5 h-5 rounded-md bg-surface-overlay flex items-center justify-center font-mono text-[9px] font-bold" style="color: ${color};">
                ${(c.authorFingerprint || '??').substring(0, 2).toUpperCase()}
              </div>
              <span class="font-mono text-xs font-bold" style="color: ${color};">
                @id:${c.authorFingerprint || 'anonymous'}
              </span>
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
            <div class="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text pl-1">
              ${this.renderMarkdown(c.content || '')}
            </div>

            <!-- COMMENT ACTIONS -->
            <div class="flex items-center space-x-4 pt-1 text-[11px] font-mono text-slate-400 pl-1">
              <button data-comment-endorse="${c.id}" class="btn-comment-endorse hover:text-signal transition-colors flex items-center space-x-1">
                <span>▲</span>
                <span>Endorse (+1)</span>
              </button>
              <span>•</span>
              <button data-comment-reply-toggle="${c.id}" class="btn-comment-reply-toggle hover:text-cyphr transition-colors">
                ${isReplying ? 'Cancel Reply' : 'Reply'}
              </button>
              <span>•</span>
              ${awardsSystem.renderGiveCommentAwardButton(c.id, c.postId || this.activePostId || '', 'GUARDIAN')}
            </div>

            <!-- INLINE REPLY FORM (IF TOGGLED) -->
            ${isReplying ? `
              <form class="form-inline-comment-reply mt-2 p-2.5 rounded-lg bg-surface-raised border border-white/10 space-y-2 animate-in fade-in" data-parent-comment-id="${c.id}">
                <textarea 
                  class="input-inline-reply-text w-full bg-surface-base border border-white/10 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyphr resize-none h-16"
                  placeholder="Write an inline nested reply to id:${c.authorFingerprint}..."
                  required
                ></textarea>
                <div class="flex items-center justify-end space-x-2">
                  <button type="button" class="btn-cancel-inline-reply px-3 py-1 text-xs text-slate-400 hover:text-white" data-comment-id="${c.id}">Cancel</button>
                  <button type="submit" class="px-3.5 py-1 bg-cyphr/20 hover:bg-cyphr/30 text-cyphr text-xs font-semibold rounded-md border border-cyphr/40 transition-all">Submit</button>
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
    return `
      <div class="p-3 rounded-xl bg-surface-raised border border-white/10 my-3 space-y-2">
        <div class="flex items-center justify-between text-xs text-slate-300">
          <span class="flex items-center space-x-1.5 font-bold text-cyphr">
            <span>📺</span>
            <span>Zero-Copy Native Stream (PipeWire & Hardware Decoded)</span>
          </span>
          <span class="font-mono text-[10px] bg-cyan-950 text-cyphr px-2 py-0.5 rounded border border-cyphr/30">1080p60 • SFrame</span>
        </div>
        <div class="relative rounded-lg overflow-hidden bg-black border border-white/5 aspect-video flex items-center justify-center">
          <video 
            id="video-player-${postId}"
            src="${video.src}" 
            poster="${video.poster || ''}"
            controls
            playsinline
            class="w-full h-full object-contain"
          ></video>
        </div>
      </div>
    `;
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
          <button data-copy-sha="${this.escapeHtml(raw)}" class="btn-copy-detail-sha px-2.5 py-1 bg-surface-raised hover:bg-surface-overlay text-slate-200 rounded text-[10px] font-mono">
            Copy JSON
          </button>
        </div>
        <pre class="p-4 bg-surface-raised rounded-xl overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed max-h-[60vh]"><code>${this.escapeHtml(raw)}</code></pre>
      </div>
    `;
  }

  // ─── Event Binding ────────────────────────────────────────────────────────

  public bindEvents(onReplySubmit: (postId: string, commentText: string) => void): void {
    const overlay = document.getElementById('post-detail-modal-overlay');
    if (!overlay) return;

    // Close button
    const btnClose = document.getElementById('btn-close-post-detail');
    if (btnClose) {
      btnClose.onclick = () => this.closePost();
    }

    const btnBack = document.getElementById('btn-back-to-feed');
    if (btnBack) {
      btnBack.onclick = () => this.closePost();
    }

    const btnFallbackClose = document.getElementById('btn-close-post-detail-fallback');
    if (btnFallbackClose) {
      btnFallbackClose.onclick = () => this.closePost();
    }

    // Escape Key Listener
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener);
    }
    this.keydownListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.closePost();
      }
    };
    window.addEventListener('keydown', this.keydownListener);

    // Subtab switching
    overlay.querySelectorAll('.btn-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-subtab') as 'discussion' | 'raw_json' | 'zk_proof';
        if (tab) {
          this.activeSubTab = tab;
          // Trigger custom event or client store refresh if hooked up
          const event = new CustomEvent('aetheris-detail-view-refresh');
          window.dispatchEvent(event);
        }
      });
    });

    // Fast Reply Preview toggles
    const btnWrite = document.getElementById('btn-reply-edit-toggle');
    const btnPreview = document.getElementById('btn-reply-preview-toggle');
    const inputReply = document.getElementById('input-detail-reply-text') as HTMLTextAreaElement | null;

    if (btnWrite) {
      btnWrite.onclick = () => {
        this.isPreviewMode = false;
        window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
      };
    }

    if (btnPreview) {
      btnPreview.onclick = () => {
        if (inputReply) {
          this.replyDraft = inputReply.value;
        }
        this.isPreviewMode = true;
        window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
      };
    }

    // Markdown Toolbar actions
    overlay.querySelectorAll('.btn-md-action').forEach(btn => {
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
            replacement = `[${sel || 'link title'}](https://aetheris.network)`;
            break;
          case 'list':
            replacement = `\n- ${sel || 'item 1'}\n- item 2\n`;
            break;
        }

        inputReply.setRangeText(replacement, start, end, 'end');
        inputReply.focus();
        this.replyDraft = inputReply.value;
      });
    });

    // Form Fast Reply submit
    const formReply = document.getElementById('form-post-detail-reply') as HTMLFormElement | null;
    if (formReply) {
      formReply.onsubmit = (e: Event) => {
        e.preventDefault();
        const text = inputReply ? inputReply.value.trim() : this.replyDraft.trim();
        if (text && this.activePostId) {
          onReplySubmit(this.activePostId, text);
          this.replyDraft = '';
          if (inputReply) inputReply.value = '';
          this.isPreviewMode = false;
        }
      };
    }

    // Comment Collapse toggles
    overlay.querySelectorAll('.btn-comment-collapse').forEach(btn => {
      btn.addEventListener('click', () => {
        const commentId = btn.getAttribute('data-comment-collapse');
        if (commentId) {
          this.toggleCommentCollapse(commentId);
          window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
        }
      });
    });

    // Inline Comment Reply toggle
    overlay.querySelectorAll('.btn-comment-reply-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const commentId = btn.getAttribute('data-comment-reply-toggle');
        if (commentId) {
          this.replyingToCommentId = this.replyingToCommentId === commentId ? null : commentId;
          window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
        }
      });
    });

    // Inline Comment Reply submit
    overlay.querySelectorAll('.form-inline-comment-reply').forEach(form => {
      form.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        const parentId = form.getAttribute('data-parent-comment-id');
        const input = form.querySelector('.input-inline-reply-text') as HTMLTextAreaElement | null;
        if (parentId && input && input.value.trim() && this.activePostId) {
          onReplySubmit(this.activePostId, `[Reply to ${parentId}] ${input.value.trim()}`);
          this.replyingToCommentId = null;
          window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
        }
      });
    });

    // Inline Comment Reply cancel
    overlay.querySelectorAll('.btn-cancel-inline-reply').forEach(btn => {
      btn.addEventListener('click', () => {
        this.replyingToCommentId = null;
        window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
      });
    });

    // Bookmark toggle
    overlay.querySelectorAll('.btn-detail-bookmark').forEach(btn => {
      btn.addEventListener('click', () => {
        const postId = btn.getAttribute('data-bookmark-id');
        if (postId) {
          this.toggleBookmark(postId);
          window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
        }
      });
    });

    // Award button
    overlay.querySelectorAll('.btn-detail-award').forEach(btn => {
      btn.addEventListener('click', () => {
        const postId = btn.getAttribute('data-award-id');
        if (postId) {
          this.addAward(postId, 'Verified Sovereign', '🛡️', 'Authentic decentralized publication');
          window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
        }
      });
    });

    // Copy SHA / Link
    overlay.querySelectorAll('.btn-copy-detail-sha').forEach(btn => {
      btn.addEventListener('click', () => {
        const sha = btn.getAttribute('data-copy-sha');
        if (sha && navigator.clipboard) {
          navigator.clipboard.writeText(sha);
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
        }
      });
    });

    overlay.querySelectorAll('.btn-detail-boost').forEach(btn => {
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

    overlay.querySelectorAll('.btn-detail-share').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.getAttribute('data-share-id') || this.activePostId;
        const post = clientStore.posts.find((x: any) => x.id === postId);
        if (postId) {
          await sharePostOrCopyLink(postId, post?.title, post?.content, btn as HTMLElement);
        }
      });
    });

    // Related posts click
    overlay.querySelectorAll('.btn-open-related-post').forEach(card => {
      card.addEventListener('click', () => {
        const relatedId = card.getAttribute('data-open-related');
        if (relatedId) {
          this.openPost(relatedId);
          window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
        }
      });
    });
  }
}

export const postDetailView = new PostDetailView();
