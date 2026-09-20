/**
 * @file mobile-flow.ts
 * @package @aetheris/client-ui
 * @description UREfy Flow: Immersive mobile swipe-first reading experience.
 *
 * Characteristics:
 * - NOT TikTok: Content-led, typography-focused, calm and respectful.
 * - Text posts are treated as first-class editorial content with breathable typography.
 * - Media posts (images, video embeds, polls, links) naturally integrate.
 * - Core actions (React, Reply, Repost, Save, Share, More) remain accessible.
 * - Discussion sheet: Layered bottom sheet allowing comment exploration without losing scroll position.
 * - User sovereignty: Mobile users can seamlessly switch between Flow and Classic mode.
 */

import { ClientPost, clientStore } from './client-state.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { profileView } from './profile-view.js';
import { pulseActionsEngine } from './pulse-actions.js';
import { threadManager } from './threads.js';
import { markdownRenderer } from './markdown-renderer.js';
import { obsidianMediaPlayer } from './media-player.js';
import { pollEngine } from './polls.js';
import { renderAvatar } from './ui/avatar-generator.js';
import { renderIcon } from './ui/icons.js';
import { postPath, communityPath, profilePath } from './public-urls.js';

export type MobileConsumptionMode = 'flow' | 'classic';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function relativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export class MobileFlowEngine {
  private activeSheetPostId: string | null = null;
  private mode: MobileConsumptionMode = 'classic';

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('urefy_mobile_consumption_mode');
      if (saved === 'flow' || saved === 'classic') {
        this.mode = saved;
      }
    }
  }

  public getMode(): MobileConsumptionMode {
    return this.mode;
  }

  public setMode(mode: MobileConsumptionMode): void {
    this.mode = mode;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('urefy_mobile_consumption_mode', mode);
      } catch (_) {}
    }
  }

  public openDiscussionSheet(postId: string): void {
    this.activeSheetPostId = postId;
  }

  public closeDiscussionSheet(): void {
    this.activeSheetPostId = null;
  }

  public isDiscussionSheetOpen(): boolean {
    return this.activeSheetPostId !== null;
  }

  public getActiveSheetPostId(): string | null {
    return this.activeSheetPostId;
  }

  /**
   * Renders the Flow | Classic toggle control for mobile.
   */
  public renderModeSwitcher(): string {
    const isFlow = this.mode === 'flow';
    return `
      <div class="mobile-consumption-switcher flex items-center p-0.5 rounded-xl bg-surface-raised border border-white/10 text-xs select-none">
        <button
          type="button"
          data-action="set-mobile-mode"
          data-mobile-mode="classic"
          class="px-2.5 py-1 rounded-lg font-medium transition-all ${!isFlow ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'}"
          title="Classic compact feed"
        >
          Classic
        </button>
        <button
          type="button"
          data-action="set-mobile-mode"
          data-mobile-mode="flow"
          class="px-2.5 py-1 rounded-lg font-medium transition-all ${isFlow ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'}"
          title="Flow swipe-first reading"
        >
          Flow
        </button>
      </div>
    `;
  }

  /**
   * Renders an individual Flow item card.
   */
  public renderFlowCard(post: ClientPost, index: number, total: number): string {
    const circle = sovereignCircleEngine.findCircle(post.channelId);
    const circleName = circle ? `c/${circle.name}` : (post.channelId.startsWith('c/') ? post.channelId : 'c/technology');
    const profile = profileView.getProfile(post.authorFingerprint);
    const authorName = profile?.name || `@${post.authorFingerprint.substring(0, 8)}`;
    const authorHandle = profile?.handle ? `@${profile.handle.replace(/^@/, '')}` : `@${post.authorFingerprint.substring(0, 8)}`;
    const state = pulseActionsEngine.getInteractions(post.id);
    const merits = state.likesCount ?? post.meritVotes ?? 0;
    const replies = post.replyCount ?? state.repliesCount ?? 0;

    // Detect media
    const detectedVideo = obsidianMediaPlayer.extractVideo(post.content);
    const videoHtml = post.video
      ? obsidianMediaPlayer.renderVideoCard(post.id, post.video.src, post.video.poster)
      : (detectedVideo ? obsidianMediaPlayer.renderVideoCard(post.id, post.content) : '');
    const imagesHtml = post.images?.length
      ? `<div class="flow-post__media my-3 rounded-2xl overflow-hidden">${obsidianMediaPlayer.renderImageMosaic(post.images)}</div>`
      : '';
    const hasMedia = Boolean(videoHtml || imagesHtml);

    let displayContent = post.content || '';
    if (detectedVideo && !post.video) {
      displayContent = displayContent
        .replace(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}[^\s]*/gi, '')
        .replace(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/\d+[^\s]*/gi, '')
        .replace(/https?:\/\/[^\s"'<>]+\.(?:mp4|webm|ogg)(?:\?[^\s"'<>]*)?/gi, '')
        .trim();
    }

    const title = post.title && post.title !== post.content.substring(0, 50) ? post.title : '';

    return `
      <section 
        class="urefy-flow-card relative w-full h-[calc(100dvh-7.5rem)] snap-start shrink-0 flex flex-col justify-between p-4 overflow-hidden bg-canvas border-b border-white/5"
        data-flow-index="${index}"
        data-post-id="${escapeHtml(post.id)}"
        aria-label="Flow post ${index + 1} of ${total}"
      >
        <!-- Top Metadata Header -->
        <header class="flow-card-header flex items-center justify-between text-xs z-10">
          <div class="flex items-center gap-2.5 min-w-0">
            <a href="${profilePath(post.authorFingerprint)}" data-public-link class="shrink-0">
              ${renderAvatar(profile?.avatar, post.authorFingerprint, { size: 36, className: 'w-9 h-9' })}
            </a>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <a href="${profilePath(post.authorFingerprint)}" data-public-link class="font-bold text-slate-100 truncate hover:underline">
                  ${escapeHtml(authorName)}
                </a>
                <span class="text-slate-500 text-[11px] truncate">${escapeHtml(authorHandle)}</span>
              </div>
              <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
                <a href="${communityPath(circleName)}" data-public-link class="font-semibold text-[var(--color-accent,#e59b3c)] hover:underline truncate">
                  ${escapeHtml(circleName)}
                </a>
                <span>·</span>
                <time datetime="${new Date(post.createdAt).toISOString()}">${relativeTime(post.createdAt)}</time>
              </div>
            </div>
          </div>

          <span class="text-[10px] tabular-nums text-slate-500 px-2 py-0.5 rounded-full bg-surface-raised">
            ${index + 1}/${total}
          </span>
        </header>

        <!-- Main Content (Centered & Scrollable if long) -->
        <div class="flow-card-content flex-1 overflow-y-auto my-3 pr-1 space-y-3 flex flex-col justify-center">
          ${title ? `
            <h2 class="text-lg md:text-xl font-bold tracking-tight text-white leading-snug">
              <a href="${postPath(post.id)}" data-public-link class="hover:underline">${escapeHtml(title)}</a>
            </h2>
          ` : ''}

          ${videoHtml}
          ${imagesHtml}

          ${displayContent ? `
            <div class="flow-card-body text-slate-200 text-sm md:text-base leading-relaxed ${!hasMedia ? 'font-serif text-base md:text-lg leading-relaxed max-w-lg' : ''}">
              ${markdownRenderer.renderMarkdown(displayContent)}
            </div>
          ` : ''}

          ${post.pollId ? pollEngine.renderPollCard(post.pollId, clientStore.keypair.fingerprint) : ''}
        </div>

        <!-- Bottom Action Bar -->
        <footer class="flow-card-footer pt-3 border-t border-white/5 flex items-center justify-between text-xs z-10">
          <div class="flex items-center gap-1">
            <!-- Merit / Like -->
            <button
              type="button"
              data-pulse-action="like"
              data-post-id="${escapeHtml(post.id)}"
              data-dir="1"
              class="min-h-[44px] px-3 rounded-xl flex items-center gap-1.5 ${state.liked ? 'text-[var(--color-accent,#e59b3c)] font-bold' : 'text-slate-300 hover:text-white'} transition-colors cursor-pointer"
              aria-label="${state.liked ? 'Remove Merit' : 'Give Merit'}"
            >
              ${renderIcon('sparkles', { size: 18, variant: state.liked ? 'solid' : 'outline' })}
              <span class="text-xs tabular-nums font-medium">${merits}</span>
            </button>

            <!-- Reply / Discussion Sheet -->
            <button
              type="button"
              data-action="open-flow-discussion"
              data-post-id="${escapeHtml(post.id)}"
              class="min-h-[44px] px-3 rounded-xl flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="View ${replies} replies"
            >
              ${renderIcon('messageSquare', { size: 18 })}
              <span class="text-xs tabular-nums font-medium">${replies}</span>
            </button>

            <!-- Repost -->
            <button
              type="button"
              data-action="toggle-repost-menu"
              data-pulse-action="repost-menu"
              data-post-id="${escapeHtml(post.id)}"
              class="min-h-[44px] px-2.5 rounded-xl flex items-center gap-1 ${state.reposted ? 'text-emerald-400 font-bold' : 'text-slate-300 hover:text-white'} transition-colors cursor-pointer"
              aria-label="Repost"
            >
              ${renderIcon('repost', { size: 18 })}
            </button>

            <!-- Bookmark / Save -->
            <button
              type="button"
              data-pulse-action="bookmark"
              data-post-id="${escapeHtml(post.id)}"
              class="min-h-[44px] px-2.5 rounded-xl flex items-center text-slate-300 hover:text-white transition-colors cursor-pointer ${state.bookmarked ? 'text-[var(--color-accent,#e59b3c)]' : ''}"
              aria-label="${state.bookmarked ? 'Remove bookmark' : 'Bookmark'}"
            >
              ${renderIcon('bookmark', { size: 18, variant: state.bookmarked ? 'solid' : 'outline' })}
            </button>
          </div>

          <div class="flex items-center gap-1">
            <!-- Share -->
            <button
              type="button"
              data-pulse-action="share"
              data-post-id="${escapeHtml(post.id)}"
              class="min-h-[44px] px-2.5 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Share post"
            >
              ${renderIcon('share', { size: 18 })}
            </button>

            <!-- More / Why this post -->
            <button
              type="button"
              data-action="open-post-more-menu"
              data-post-id="${escapeHtml(post.id)}"
              class="min-h-[44px] px-2.5 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="More options"
            >
              ${renderIcon('more', { size: 18 })}
            </button>
          </div>
        </footer>
      </section>
    `;
  }

  /**
   * Renders the layered Discussion Sheet for a post in Flow mode.
   */
  public renderDiscussionSheet(): string {
    if (!this.activeSheetPostId) return '';
    const post = clientStore.posts.find(p => p.id === this.activeSheetPostId);
    if (!post) return '';

    const comments = threadManager.getRootCommentsForPost(post.id);

    return `
      <div 
        id="flow-discussion-sheet-overlay" 
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Discussion for post"
      >
        <div class="w-full max-w-lg max-h-[85vh] bg-surface-base border-t border-white/15 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
          <!-- Sheet Header -->
          <div class="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div>
              <h3 class="text-sm font-bold text-white">Discussion</h3>
              <p class="text-xs text-slate-400 font-mono">${comments.length} replies</p>
            </div>
            <button
              type="button"
              data-action="close-flow-discussion"
              class="min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-white rounded-xl bg-surface-raised cursor-pointer flex items-center justify-center"
              aria-label="Close discussion sheet"
            >
              ${renderIcon('close', { size: 18 })}
            </button>
          </div>

          <!-- Comments List -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            ${comments.length === 0 ? `
              <div class="text-center py-8 text-xs text-slate-400">
                <p>No replies yet.</p>
                <p class="text-[11px] text-slate-500 mt-1">Be the first to share a thought.</p>
              </div>
            ` : comments.map(c => threadManager.renderCommentNode(c, post.authorFingerprint, clientStore.keypair.fingerprint)).join('')}
          </div>

          <!-- Inline reply row in sheet -->
          <div class="p-3 border-t border-white/10 bg-surface-raised shrink-0">
            <button
              type="button"
              data-action="open-post-detail"
              data-post-id="${escapeHtml(post.id)}"
              class="w-full py-2.5 px-4 rounded-xl bg-surface-base border border-white/10 text-xs text-slate-300 hover:text-white text-left flex items-center justify-between cursor-pointer"
            >
              <span>Add a reply...</span>
              <span class="text-[var(--color-accent,#e59b3c)] font-bold">Reply</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the complete Flow Stream container.
   */
  public renderFlowStream(posts: readonly ClientPost[]): string {
    if (posts.length === 0) {
      return `
        <div class="h-[calc(100dvh-8rem)] flex flex-col items-center justify-center p-6 text-center text-slate-400 text-xs">
          <p class="text-sm font-semibold text-slate-200">No posts in Flow</p>
          <p class="mt-1">Follow people or join communities to discover conversations here.</p>
        </div>
      `;
    }

    return `
      <div 
        id="urefy-flow-container" 
        class="urefy-flow-container w-full h-[calc(100dvh-7rem)] overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-none"
        tabindex="0"
        aria-label="UREfy Flow Stream"
      >
        ${posts.map((p, idx) => this.renderFlowCard(p, idx, posts.length)).join('')}
      </div>
      ${this.renderDiscussionSheet()}
    `;
  }
}

export const mobileFlowEngine = new MobileFlowEngine();
