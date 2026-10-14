/**
 * @file post-detail.ts
 * @package @aetheris/client-ui
 * @description 2027 Spatial Discussion Focus View — Recursive Comment Tree,
 * Inline Markdown Composer, ZK Proof Inspector, and Related Discussions Engine.
 */

import { awardsSystem } from './awards-facade.js';
import { clientStore } from './client-state.js';
import { sharePostOrCopyLink, escapeHtml } from './dry-utils.js';
import { markdownRenderer } from './markdown-renderer.js';
import { t } from './i18n.js';
import { profileStore as profileView } from './profile/profile-store.js';
import { obsidianMediaPlayer } from './media-player.js';
import { reactionsEngine, bindReactionBarEvents } from './reactions.js';
import { presentPublicIdentity } from './public-identity.js';
import { privacyLens } from './privacy-lens.js';
import { pollEngine } from './polls.js';
import { renderAvatar } from './ui/avatar-generator.js';
import { renderIcon } from './ui/icons.js';

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
  flair: string;
  meritVotes: number;
  userVoted: number;
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

export class PostDetailView {
  public activePostId: string | null = null;
  public originRoute: string = 'feed';
  public bookmarkedIds: Set<string> = new Set();
  public collapsedComments: Set<string> = new Set();
  public replyingToCommentId: string | null = null;
  public awardsMap: Map<string, AwardBadge[]> = new Map();
  public activeViewTab: 'discussion' | 'zk-proof' | 'raw-json' = 'discussion';
  public savedFeedScrollTop: number = 0;

  constructor() {
    this.seedDefaultAwards();
  }

  private seedDefaultAwards(): void {
    this.awardsMap.set('post-1', [
      {
        id: 'aw-zk',
        name: 'ZK Proof Verified',
        icon: '🛡️',
        count: 3,
        description: 'Cryptographically attested release',
      },
    ]);
  }

  public isOpen(): boolean {
    return this.activePostId !== null;
  }

  public openPost(postId: string, originRoute: string = 'feed'): void {
    this.activePostId = postId;
    this.originRoute = originRoute;
    this.activeViewTab = 'discussion';
    clientStore.notify('POST_DETAIL_OPENED', postId);
  }

  public closePost(options?: { silent?: boolean; skipHistory?: boolean }): void {
    this.activePostId = null;
    this.replyingToCommentId = null;
    if (!options?.silent) {
      clientStore.notify('POST_DETAIL_CLOSED', this.originRoute);
    }
  }

  public getActivePostId(): string | null {
    return this.activePostId;
  }

  public toggleBookmark(postId: string): boolean {
    if (this.bookmarkedIds.has(postId)) {
      this.bookmarkedIds.delete(postId);
      return false;
    }
    this.bookmarkedIds.add(postId);
    return true;
  }

  public isBookmarked(postId: string): boolean {
    return this.bookmarkedIds.has(postId);
  }

  public toggleCommentCollapse(commentId: string): boolean {
    if (this.collapsedComments.has(commentId)) {
      this.collapsedComments.delete(commentId);
      return false;
    }
    this.collapsedComments.add(commentId);
    return true;
  }

  public isCommentCollapsed(commentId: string): boolean {
    return this.collapsedComments.has(commentId);
  }

  public setReplyingToComment(commentId: string | null): void {
    this.replyingToCommentId = commentId;
  }

  public addAward(
    postId: string,
    name: string,
    icon: string,
    description: string = 'Community Award'
  ): void {
    const list = this.awardsMap.get(postId) || [];
    const existing = list.find((a) => a.name === name);
    if (existing) {
      existing.count += 1;
    } else {
      list.push({ id: `aw-${Date.now()}`, name, icon, count: 1, description });
    }
    this.awardsMap.set(postId, list);
  }

  public getAwards(postId: string): AwardBadge[] {
    return this.awardsMap.get(postId) || [];
  }

  public findRelatedPosts(post: any, allPosts: any[]): any[] {
    if (!post || !Array.isArray(allPosts)) return [];
    const candidates = allPosts.filter((p) => p && p.id !== post.id);
    const titleWords = new Set(
      String(post.title || '')
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3)
    );

    const scored = candidates.map((cand) => {
      let score = 0;
      if (cand.channelId === post.channelId) score += 25;
      if (cand.flair === post.flair) score += 15;
      if (cand.authorFingerprint === post.authorFingerprint) score += 10;

      const candWords = String(cand.title || '')
        .toLowerCase()
        .split(/\W+/);
      for (const w of candWords) {
        if (titleWords.has(w)) score += 12;
      }
      score += Math.min(20, Math.floor((cand.meritVotes || 0) / 25));
      return { cand, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((s) => s.cand);
  }

  public renderMarkdown(text: string): string {
    return markdownRenderer.renderRichContent(text);
  }

  public escapeHtml(text: string): string {
    return escapeHtml(text);
  }

  public formatRelativeTime(timestamp: number): string {
    const diffSec = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  }

  public renderPostNotFound(): string {
    return `<div class="max-w-2xl mx-auto p-8 rounded-3xl bg-surface-base/85 border border-white/10 text-center space-y-3">
      <h2 class="text-lg font-extrabold text-white">Discussion Unavailable</h2>
      <p class="text-xs text-slate-400">This post may have been removed or is not accessible in your current context.</p>
      <button type="button" id="btn-back-to-feed" class="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer">← Back to Feed</button>
    </div>`;
  }

  public renderCommentNode(c: any, depth: number = 0, postAuthorFP?: string): string {
    const isCollapsed = this.isCommentCollapsed(c.id) || Boolean(c.isCollapsed);
    const prof = profileView.getProfile(c.authorFingerprint);
    const identity = presentPublicIdentity(
      {
        name: c.authorDisplayName || prof.name,
        handle: c.authorHandle || prof.handle,
        avatar: c.authorAvatarUrl || prof.avatar,
      },
      c.authorFingerprint
    );
    const isOP = postAuthorFP && c.authorFingerprint === postAuthorFP;
    const indentClass = depth > 0 ? 'ml-4 sm:ml-6 pl-3.5 border-l border-white/10' : '';

    return `<div
      id="detail-comment-${this.escapeHtml(c.id)}"
      data-comment-id="${this.escapeHtml(c.id)}"
      class="py-3 ${indentClass}"
    >
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <div class="flex items-center gap-2 min-w-0">
          ${renderAvatar(identity.avatar, c.authorFingerprint, { size: 26 })}
          <span class="text-xs font-bold text-white truncate">${this.escapeHtml(identity.displayName)}</span>
          <span class="text-[11px] font-mono text-slate-400 truncate">@${this.escapeHtml(identity.handleLabel)}</span>
          ${
            isOP
              ? `<span class="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">OP</span>`
              : ''
          }
          <span class="text-[11px] text-slate-500">${this.formatRelativeTime(c.createdAt || Date.now())}</span>
        </div>
        <button
          type="button"
          data-collapse-comment="${this.escapeHtml(c.id)}"
          class="text-xs font-mono text-slate-400 hover:text-white px-1.5 cursor-pointer"
        >${isCollapsed ? '[+]' : '[–]'}</button>
      </div>

      ${
        isCollapsed
          ? `<div class="text-xs italic text-slate-500">Comment collapsed</div>`
          : `<div class="text-sm text-slate-200 leading-relaxed pl-8">
              ${this.renderMarkdown(c.content)}
            </div>
            <div class="mt-2 pl-8 flex items-center gap-3 text-xs text-slate-400">
              <button type="button" data-vote-comment="${this.escapeHtml(c.id)}" data-dir="1" class="hover:text-cyan-300 font-mono cursor-pointer">
                ▲ ${c.meritScore ?? c.likesCount ?? 0}
              </button>
              <button type="button" data-reply-comment="${this.escapeHtml(c.id)}" class="hover:text-white cursor-pointer">
                Reply
              </button>
              ${awardsSystem.renderCommentAwardBadges(c.id)}
            </div>
            ${
              Array.isArray(c.replies) && c.replies.length > 0
                ? `<div class="mt-2 space-y-1">
                    ${c.replies.map((r: any) => this.renderCommentNode(r, depth + 1, postAuthorFP)).join('')}
                  </div>`
                : ''
            }`
      }
    </div>`;
  }

  private renderVideoBlock(postId: string, video: PostVideo): string {
    return `<div class="my-3">${obsidianMediaPlayer.renderVideoCard(postId, video.src, video.poster)}</div>`;
  }

  private renderImageMosaicBlock(images: any[]): string {
    return `<div class="my-3">${obsidianMediaPlayer.renderImageMosaic(images)}</div>`;
  }

  private renderPollBlock(pollId: string): string {
    return `<div class="my-3">${pollEngine.renderPollCard(pollId, clientStore.keypair?.fingerprint || '')}</div>`;
  }

  private renderQuotedPostBlock(quoted: QuotedPost): string {
    return `<div class="my-3 p-4 rounded-2xl bg-white/[0.03] border border-cyan-500/25 text-xs space-y-1">
      <div class="font-mono text-cyan-400">@${this.escapeHtml(quoted.authorHandle || quoted.authorFingerprint)}</div>
      <div class="font-bold text-white">${this.escapeHtml(quoted.title)}</div>
      <div class="text-slate-300 line-clamp-3">${this.escapeHtml(quoted.content)}</div>
    </div>`;
  }

  private renderAttachmentBlock(att: PostAttachment): string {
    return `<div class="my-3 p-4 rounded-2xl bg-slate-950/85 border border-emerald-500/30 flex items-center justify-between gap-3 font-mono text-xs">
      <div>
        <div class="text-white font-bold">📦 ${this.escapeHtml(att.fileName)} (${Math.round(att.byteSize / 1024)} KB)</div>
        <div class="text-[11px] text-slate-400">SHA-256: ${this.escapeHtml(att.sha256)}</div>
      </div>
      <span class="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 text-[10px]">${this.escapeHtml(
        att.verdict
      )}</span>
    </div>`;
  }

  private renderRelatedPostCard(rp: any): string {
    return `<button
      type="button"
      data-open-post-detail="${this.escapeHtml(rp.id)}"
      class="text-left p-3.5 rounded-2xl bg-surface-base/75 border border-white/[0.07] hover:border-cyan-400/35 transition-all cursor-pointer"
    >
      <div class="text-[10px] font-mono text-cyan-400 mb-1">c/${this.escapeHtml(rp.channelId)} · ▲ ${rp.meritVotes || 0}</div>
      <div class="text-xs font-bold text-white line-clamp-2">${this.escapeHtml(rp.title)}</div>
    </button>`;
  }

  private renderZkProofView(post: any): string {
    return `<div class="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 font-mono text-xs text-cyan-300 space-y-1.5">
      <div class="text-white font-bold">Zero-Knowledge RLN & Ed25519 Envelope Attestation</div>
      <div>Post ID: ${this.escapeHtml(post.id)}</div>
      <div>Author Fingerprint: ${this.escapeHtml(post.authorFingerprint)}</div>
      <div>Status: VERIFIED_BN254_GROTH16</div>
    </div>`;
  }

  private renderRawJsonView(post: any): string {
    return `<pre class="p-4 rounded-2xl bg-slate-950/90 border border-white/10 font-mono text-[11px] text-slate-300 overflow-x-auto">${this.escapeHtml(
      JSON.stringify(post, null, 2)
    )}</pre>`;
  }

  public renderPostFocusView(post: any, comments: any[] = [], relatedPosts: any[] = []): string {
    if (!post) return this.renderPostNotFound();
    const prof = profileView.getProfile(post.authorFingerprint);
    const identity = presentPublicIdentity(
      {
        name: post.facetDisplayName || post.authorDisplayName || prof.name,
        handle: post.facetHandle || post.authorHandle || prof.handle,
        avatar: post.facetAvatarUrl || post.authorAvatarUrl || prof.avatar,
      },
      post.authorFingerprint
    );

    const related = relatedPosts.length > 0 ? relatedPosts : this.findRelatedPosts(post, clientStore.posts);

    return `<div id="post-focus-view" data-post-detail-id="${this.escapeHtml(post.id)}" class="w-full max-w-3xl mx-auto space-y-5 pb-16">
      <!-- Top Back Bar -->
      <div class="flex items-center justify-between gap-3">
        <button
          type="button"
          id="btn-close-post-detail"
          data-close-post-detail="true"
          class="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-2xl bg-surface-base/80 hover:bg-white/10 text-xs font-bold text-slate-200 border border-white/10 transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>${t('common.back', undefined, 'Back to discussions')}</span>
        </button>

        <div class="flex items-center gap-2">
          ${privacyLens.renderCompact({
            audience: post.audience || 'public',
            channelName: post.channelId,
            facetHandle: identity.handleLabel,
          })}
        </div>
      </div>

      <!-- Main Post Article Card -->
      <article class="rounded-3xl bg-surface-base/90 backdrop-blur-2xl border border-white/10 p-6 shadow-2xl">
        <header class="flex items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-3 min-w-0">
            ${renderAvatar(identity.avatar, post.authorFingerprint, { size: 44 })}
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-extrabold text-white truncate">${this.escapeHtml(identity.displayName)}</span>
                <span class="text-xs font-mono text-cyan-400 truncate">@${this.escapeHtml(identity.handleLabel)}</span>
              </div>
              <div class="text-xs text-slate-400">
                c/${this.escapeHtml(post.channelId)} · ${this.formatRelativeTime(post.createdAt)}
              </div>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[11px] font-mono bg-white/[0.06] text-cyan-300 border border-white/10">
            ${this.escapeHtml(post.flair || 'DISCUSSION')}
          </span>
        </header>

        <h1 class="text-xl sm:text-2xl font-extrabold text-white mb-3 leading-snug">${this.escapeHtml(post.title)}</h1>

        <div class="text-sm sm:text-base text-slate-200 leading-relaxed prose-invert max-w-none">
          ${this.renderMarkdown(post.content)}
        </div>

        ${Array.isArray(post.images) && post.images.length > 0 ? this.renderImageMosaicBlock(post.images) : ''}
        ${post.video ? this.renderVideoBlock(post.id, post.video) : ''}
        ${post.pollId ? this.renderPollBlock(post.pollId) : ''}
        ${post.quotedPost ? this.renderQuotedPostBlock(post.quotedPost) : ''}
        ${post.attachment ? this.renderAttachmentBlock(post.attachment) : ''}

        <footer class="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            ${awardsSystem.renderAwardBadges(post.id)}
            ${awardsSystem.renderGiveAwardButton(post.id)}
          </div>
          ${reactionsEngine.renderReactionBar(post.id, clientStore.keypair?.fingerprint || '')}
        </footer>
      </article>

      <!-- Inline Comment Composer -->
      <section class="rounded-3xl bg-surface-base/85 backdrop-blur-2xl border border-white/10 p-5 shadow-xl">
        <form id="post-detail-reply-form" data-post-id="${this.escapeHtml(post.id)}" class="space-y-3">
          <label for="post-detail-reply-input" class="text-xs font-bold text-slate-300 block">
            Add to the discussion
          </label>
          <textarea
            id="post-detail-reply-input"
            rows="3"
            placeholder="Write a thoughtful reply (Markdown & code blocks supported)..."
            class="w-full p-3.5 rounded-2xl bg-black/40 text-sm text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:border-cyan-400/60 resize-y"
          ></textarea>
          <div class="flex justify-end">
            <button
              type="submit"
              id="btn-submit-post-reply"
              class="px-5 py-2 min-h-[40px] rounded-xl bg-gradient-to-b from-cyan-400 to-cyan-500 text-slate-950 font-bold text-xs shadow cursor-pointer"
            >Post Reply</button>
          </div>
        </form>
      </section>

      <!-- Discussion Tree -->
      <section aria-labelledby="discussion-comments-heading" class="rounded-3xl bg-surface-base/85 backdrop-blur-2xl border border-white/10 p-5 shadow-xl">
        <h2 id="discussion-comments-heading" class="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-3">
          Replies (${comments.length})
        </h2>
        <div id="post-detail-comments-tree" class="divide-y divide-white/[0.06]">
          ${
            comments.length > 0
              ? comments.map((c) => this.renderCommentNode(c, 0, post.authorFingerprint)).join('')
              : `<p class="py-6 text-center text-xs text-slate-400">No replies yet. Start the conversation above.</p>`
          }
        </div>
      </section>

      ${
        related.length > 0
          ? `<section class="space-y-3">
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Related Discussions</h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                ${related.map((rp) => this.renderRelatedPostCard(rp)).join('')}
              </div>
            </section>`
          : ''
      }
    </div>`;
  }

  public renderFullPostModal(post: any, comments: any[] = [], relatedPosts: any[] = []): string {
    return this.renderPostFocusView(post, comments, relatedPosts);
  }

  public bindEvents(
    onReplySubmit: (postId: string, commentText: string, parentId?: string) => void | Promise<void>
  ): void {
    if (typeof document === 'undefined') return;
    bindReactionBarEvents(document);

    const form = document.getElementById('post-detail-reply-form') as HTMLFormElement | null;
    if (form) {
      form.addEventListener('submit', async (e: Event) => {
        e.preventDefault();
        const postId = form.getAttribute('data-post-id') || this.activePostId;
        const input = document.getElementById('post-detail-reply-input') as HTMLTextAreaElement | null;
        const text = input?.value.trim() || '';
        if (!postId || !text) return;
        if (input) input.value = '';
        await onReplySubmit(postId, text, this.replyingToCommentId || undefined);
      });
    }
  }
}

export const postDetailView = new PostDetailView();