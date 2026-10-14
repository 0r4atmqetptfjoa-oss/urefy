/**
 * @file feed-view.ts
 * @package @aetheris/client-ui
 * @description 2027 Spatial Bento Feed Workspace — Memoized Markdown, Restrained Content Grammar,
 * Progressive Disclosure, and Dual-Pane Split Workspace Support.
 */

import { postPath, profilePath, communityPath } from './public-urls.js';
import { clientStore, ClientPost } from './client-state.js';
import { flairFilter } from './flair-filter.js';
import { sovereignCircleEngine, SovereignCircle } from './sovereign-circle.js';
import { profileStore as profileView } from './profile/profile-store.js';
import { presentPublicIdentity } from './public-identity.js';
import { feedControlsEngine } from './feed-controls.js';
import { hashtagExplorer } from './hashtag-explorer.js';
import { renderPulseEmptyState, renderPulseFeedSkeleton, renderFollowingEmptyState } from './empty-states.js';
import { omniComposer } from './composer-hybrid.js';
import { threadManager, ThreadComment } from './threads.js';
import { markdownRenderer } from './markdown-renderer.js';
import { obsidianMediaPlayer } from './media-player.js';
import { pollEngine } from './polls.js';
import { reactionsEngine } from './reactions.js';
import { pulseActionsEngine } from './pulse-actions.js';
import { renderAvatar } from './ui/avatar-generator.js';
import { renderIcon } from './ui/icons.js';
import { renderHomeHorizon } from './home-horizon.js';
import { homeDiscoveryEngine } from './home-discovery.js';
import { mobileFlowEngine } from './mobile-flow.js';
import { countPostsSince } from './home-signals.js';
import { renderWorkspaceLayoutControls, getWorkspaceLayout, getSplitSecondaryPane } from './workspace-layout.js';
import { isDemoModeEnabled } from './demo-mode.js';
import { privacyLens } from './privacy-lens.js';
import { storiesEngine } from './stories.js';
import { aiAssistant } from './ai-assistant.js';

export const quickPostDraft = { content: '', channelId: '' };
let sinceYouWereAwayDismissed = false;
let visibleFeedLimit = 25;

export function setQuickPostDraft(val: string | { content: string; channelId?: string }): void {
  if (typeof val === 'string') {
    quickPostDraft.content = val;
  } else if (val && typeof val === 'object') {
    quickPostDraft.content = val.content || '';
    if (val.channelId !== undefined) quickPostDraft.channelId = val.channelId;
  }
}

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function relativeTime(timestamp: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function roleLabel(role: string): string {
  switch (role) {
    case 'GUARDIAN':
      return 'Guardian';
    case 'ARCHIVIST':
      return 'Archivist';
    case 'MODERATOR':
      return 'Moderator';
    default:
      return 'Member';
  }
}

export function submitQuickPost(): void {
  if (typeof document !== 'undefined') {
    const input = (document.getElementById('inline-quick-post-input') || document.getElementById('inline-composer-textarea')) as HTMLTextAreaElement | null;
    if (input && input.value.trim()) {
      quickPostDraft.content = input.value;
    }
  }
  const text = (quickPostDraft.content || '').trim();
  if (!text) return;

  const lines = text.split(/\r?\n/);
  const firstLine = lines[0].trim();
  const title = firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;

  clientStore.createPost({
    title: title || 'Sovereign Pulse',
    content: text,
    channelId: quickPostDraft.channelId || clientStore.activeChannelId || 'pulse-global',
    flair: 'MICRO-PULSE',
  });

  quickPostDraft.content = '';
  if (typeof document !== 'undefined') {
    const input = (document.getElementById('inline-quick-post-input') || document.getElementById('inline-composer-textarea')) as HTMLTextAreaElement | null;
    if (input) input.value = '';
  }
}

export function renderInlineQuickComposer(): string {
  const myFp = clientStore.keypair?.fingerprint || 'genesis-core';
  const myProfile = profileView.getProfile(myFp);
  const identity = presentPublicIdentity(myProfile, myFp, true);
  const activeFacet = clientStore.getActiveFacet();

  return `<section id="inline-quick-composer" class="mb-5 rounded-3xl bg-surface-base/80 backdrop-blur-2xl border border-white/[0.08] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all focus-within:border-cyan-400/40">
    <div class="flex items-start gap-3">
      <div class="shrink-0">
        ${renderAvatar(activeFacet?.avatarUrl || identity.avatar, activeFacet?.handle || myFp, { size: 40 })}
      </div>
      <div class="flex-1 min-w-0">
        <textarea
          id="inline-quick-post-input"
          rows="2"
          placeholder="Share an idea, code snippet, or cryptographic pulse with the community..."
          aria-label="Write a new post"
          class="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
        >${escapeHtml(quickPostDraft.content)}</textarea>
        <div class="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-white/[0.06]">
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              id="btn-open-full-composer"
              data-action="composer.open"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-xs font-medium text-slate-300 hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
            >
              ${renderIcon('sparkles', { size: 14, ariaHidden: true })}
              <span>Full Studio & Code</span>
            </button>
            ${privacyLens.renderCompact({
              audience: 'public',
              facetHandle: activeFacet?.handle || identity.handleLabel,
            })}
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              id="btn-submit-quick-post"
              data-action="feed.submitQuickPost"
              class="inline-flex items-center gap-1.5 px-4 py-1.5 min-h-[36px] rounded-xl bg-gradient-to-b from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-[0_2px_14px_rgba(0,229,255,0.28)] transition-all cursor-pointer"
            >
              ${renderIcon('send', { size: 13, ariaHidden: true })}
              <span>Publish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

export function renderCommunityHeaderBanner(circle: SovereignCircle): string {
  return `<header class="mb-5 rounded-3xl overflow-hidden bg-surface-base/85 backdrop-blur-2xl border border-white/10 shadow-xl">
    <div class="h-24 w-full bg-gradient-to-r from-cyan-900/50 via-indigo-900/40 to-emerald-900/40 relative">
      <div class="absolute -bottom-6 left-5 w-14 h-14 rounded-2xl bg-surface-raised border-2 border-[#090a0f] flex items-center justify-center text-2xl shadow-lg">
        ${escapeHtml(circle.icon || '🌐')}
      </div>
    </div>
    <div class="pt-8 pb-5 px-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-lg font-extrabold text-white">${escapeHtml(circle.displayName || circle.name)}</h1>
        <p class="text-xs text-slate-400 mt-0.5 max-w-xl">${escapeHtml(circle.description)}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono text-slate-300">
          ${circle.membersCount.toLocaleString()} members
        </span>
        <button
          type="button"
          data-toggle-join-circle="${escapeHtml(circle.id)}"
          class="px-4 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
            circle.isJoined
              ? 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
          }"
        >${circle.isJoined ? 'Joined ✓' : 'Join Community'}</button>
      </div>
    </div>
  </header>`;
}

export function renderSinceYouWereAwayCard(): string {
  if (sinceYouWereAwayDismissed) return '';
  const lastActive = Date.now() - 6 * 3600 * 1000;
  const freshCount = countPostsSince(clientStore.posts, lastActive);
  if (freshCount <= 0) return '';

  return `<div id="since-you-were-away-card" class="mb-4 px-4 py-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-between gap-3 text-xs text-cyan-200">
    <div class="flex items-center gap-2">
      <span>⚡</span>
      <span><strong>${freshCount} new discussions</strong> published in your communities recently.</span>
    </div>
    <button
      type="button"
      data-action="feed.dismissAwayCard"
      aria-label="Dismiss notification"
      class="text-slate-400 hover:text-white cursor-pointer"
    >✕</button>
  </div>`;
}

export function dismissSinceYouWereAwayCard(): void {
  sinceYouWereAwayDismissed = true;
  if (typeof document !== 'undefined') {
    document.getElementById('since-you-were-away-card')?.remove();
  }
}

export function loadMoreFeedPosts(): void {
  visibleFeedLimit += 20;
  clientStore.notify('FEED_PAGINATED', visibleFeedLimit);
}

interface CachedPostBody {
  rawContent: string;
  hasExplicitVideo: boolean;
  detectedVideo: ReturnType<typeof obsidianMediaPlayer.extractVideo>;
  cleanedContent: string;
  renderedMarkdown: string;
  isClamped: boolean;
}

const bodyMemoCache = new Map<string, CachedPostBody>();

function getMemoizedPostBody(post: ClientPost, hasImages: boolean): CachedPostBody {
  const cacheKey = `${post.id}:${post.content.length}:${hasImages ? 1 : 0}`;
  const cached = bodyMemoCache.get(cacheKey);
  if (cached) return cached;

  const hasExplicitVideo = Boolean(post.video && post.video.src);
  const detectedVideo = !hasExplicitVideo ? obsidianMediaPlayer.extractVideo(post.content) : null;
  const cleanedContent = post.content;
  const renderedMarkdown = markdownRenderer.renderRichContent(cleanedContent);
  const isClamped = cleanedContent.length > 420;

  const entry: CachedPostBody = {
    rawContent: post.content,
    hasExplicitVideo,
    detectedVideo,
    cleanedContent,
    renderedMarkdown,
    isClamped,
  };
  if (bodyMemoCache.size > 300) bodyMemoCache.clear();
  bodyMemoCache.set(cacheKey, entry);
  return entry;
}

export function renderPulsePostCard(post: ClientPost): string {
  const authorProfile = profileView.getProfile(post.authorFingerprint);
  const identity = presentPublicIdentity(
    {
      name: post.facetDisplayName || post.authorDisplayName || authorProfile.name,
      handle: post.facetHandle || post.authorHandle || authorProfile.handle,
      avatar: post.facetAvatarUrl || post.authorAvatarUrl || authorProfile.avatar,
    },
    post.authorFingerprint,
    post.authorFingerprint === clientStore.keypair?.fingerprint
  );

  const circle = sovereignCircleEngine.findCircle(post.channelId);
  const communityName = circle ? circle.displayName || circle.name : post.channelId;
  const communityHref = communityPath(circle?.name || post.channelId);
  const postHref = postPath(post.id);
  const authorHref = profilePath(identity.handleLabel || post.authorFingerprint);

  const hasImages = Array.isArray(post.images) && post.images.length > 0;
  const memo = getMemoizedPostBody(post, hasImages);
  const isSovereign = clientStore.isSovereignMode();

  return `<article
    id="post-card-${escapeHtml(post.id)}"
    data-post-card-id="${escapeHtml(post.id)}"
    class="group relative mb-4 rounded-3xl bg-surface-base/80 backdrop-blur-2xl border border-white/[0.08] hover:border-cyan-400/30 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.32)] transition-all duration-200"
  >
    <header class="flex items-start justify-between gap-3 mb-3">
      <div class="flex items-center gap-3 min-w-0">
        <a href="${escapeHtml(authorHref)}" data-author-fp="${escapeHtml(post.authorFingerprint)}" class="shrink-0">
          ${renderAvatar(identity.avatar, post.authorFingerprint, { size: 40 })}
        </a>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <a href="${escapeHtml(authorHref)}" data-author-fp="${escapeHtml(
    post.authorFingerprint
  )}" class="text-sm font-bold text-white hover:text-cyan-300 transition-colors truncate">
              ${escapeHtml(identity.displayName)}
            </a>
            <span class="text-xs text-slate-400 font-mono truncate">@${escapeHtml(identity.handleLabel)}</span>
            ${
              isSovereign
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.05] text-cyan-300 border border-cyan-500/25">${escapeHtml(
                    roleLabel(post.authorRole)
                  )}</span>`
                : ''
            }
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <a href="${escapeHtml(communityHref)}" class="font-medium text-cyan-400/90 hover:underline truncate">
              c/${escapeHtml(communityName)}
            </a>
            <span>·</span>
            <a href="${escapeHtml(postHref)}" class="hover:text-slate-200">
              <time datetime="${new Date(post.createdAt).toISOString()}">${relativeTime(post.createdAt)}</time>
            </a>
            ${
              post.flair
                ? `<span>·</span><span class="px-2 py-0.2 rounded-md bg-white/[0.05] text-[10px] font-mono text-slate-300">${escapeHtml(
                    post.flair
                  )}</span>`
                : ''
            }
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        ${isSovereign ? aiAssistant.renderAIAssistantButton(post.id) : ''}
        <button
          type="button"
          data-open-post-detail="${escapeHtml(post.id)}"
          aria-label="Open discussion thread"
          class="w-8 h-8 rounded-xl bg-white/[0.03] hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          ${renderIcon('maximize-2', { size: 14, ariaHidden: true })}
        </button>
      </div>
    </header>

    ${
      post.title && post.title.toLowerCase() !== 'sovereign pulse'
        ? `<h2 class="text-base sm:text-lg font-bold text-white mb-2 leading-snug">
            <a href="${escapeHtml(postHref)}" data-open-post-detail="${escapeHtml( post.id )}" class="hover:text-cyan-300 transition-colors">${escapeHtml(post.title)}</a>
          </h2>`
        : ''
    }

    <div class="text-sm text-slate-200 leading-relaxed prose-invert max-w-none ${
      memo.isClamped && !post.isExpanded ? 'line-clamp-6' : ''
    }">
      ${memo.renderedMarkdown}
    </div>

    ${
      memo.isClamped
        ? `<button
            type="button"
            class="btn-toggle-post-expand mt-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
            data-post-id="${escapeHtml(post.id)}"
          >${post.isExpanded ? 'Show less ↑' : 'Read full post ↓'}</button>`
        : ''
    }

    ${
      hasImages
        ? `<div class="mt-3">${obsidianMediaPlayer.renderImageMosaic(post.images!)}</div>`
        : ''
    }

    ${
      memo.hasExplicitVideo && post.video
        ? `<div class="mt-3">${obsidianMediaPlayer.renderVideoCard(post.id, post.video.src, post.video.poster)}</div>`
        : memo.detectedVideo
        ? `<div class="mt-3">${obsidianMediaPlayer.renderVideoCard(
            post.id,
            memo.detectedVideo.embedUrl
          )}</div>`
        : ''
    }

    ${
      post.pollId
        ? `<div class="mt-3">${pollEngine.renderPollCard(post.pollId, clientStore.keypair?.fingerprint || '')}</div>`
        : ''
    }

    ${
      post.attachment
        ? `<div class="mt-3 p-3.5 rounded-2xl bg-slate-950/75 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="text-xs font-bold text-white truncate">📦 ${escapeHtml(post.attachment.fileName)}</div>
              <div class="text-[11px] font-mono text-slate-400 truncate">SHA-256: ${escapeHtml( post.attachment.sha256.slice(0, 20) )}... · Entropy: ${post.attachment.entropy} · <span class="text-emerald-400">${escapeHtml(
            post.attachment.verdict
          )}</span></div>
            </div>
          </div>`
        : ''
    }

    ${aiAssistant.renderAIPanel(post.id, post.content)}

    <footer class="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
      ${pulseActionsEngine.renderPulseActionBar(post.id, post.replyCount)}
      ${reactionsEngine.renderReactionBar(post.id, clientStore.keypair?.fingerprint || '')}
    </footer>
  </article>`;
}

export function renderPostCard(post: ClientPost): string {
  return renderPulsePostCard(post);
}

export function renderPulseWorkspace(): string {
  const layout = getWorkspaceLayout();
  const splitPane = getSplitSecondaryPane();
  const allPosts = clientStore.posts || [];
  const filtered = flairFilter.filterPosts(feedControlsEngine.filterAndSortPosts(allPosts));
  const visiblePosts = filtered.slice(0, visibleFeedLimit);

  const activeCircle = sovereignCircleEngine.findCircle(clientStore.activeChannelId);

  const feedColumnHtml = `<div class="w-full max-w-3xl mx-auto">
    ${renderHomeHorizon(allPosts, clientStore.isConnected, isDemoModeEnabled())}

    ${
      activeCircle && clientStore.activeChannelId !== 'pulse-global'
        ? renderCommunityHeaderBanner(activeCircle)
        : ''
    }

    <div class="flex items-center justify-between gap-2 mb-4 flex-wrap">
      ${feedControlsEngine.renderFeedControlsToolbar()}
      ${renderWorkspaceLayoutControls()}
    </div>

    ${storiesEngine.renderStoriesCarousel(clientStore.keypair?.fingerprint || 'genesis-core')}

    ${renderInlineQuickComposer()}

    ${homeDiscoveryEngine.renderDiscoveryLayer(allPosts)}

    ${renderSinceYouWereAwayCard()}

    ${hashtagExplorer.renderActiveTagBanner()}
    ${flairFilter.renderActiveFlairBadge()}

    ${
      mobileFlowEngine.getMode() === 'flow'
        ? mobileFlowEngine.renderFlowStream(visiblePosts)
        : `<div id="pulse-feed-stream" class="space-y-4">
            ${
              visiblePosts.length > 0
                ? visiblePosts.map((p) => feedControlsEngine.renderPost(p)).join('')
                : feedControlsEngine.getStreamType() === 'following'
                ? renderFollowingEmptyState()
                : renderPulseEmptyState()
            }
          </div>`
    }

    ${
      filtered.length > visibleFeedLimit
        ? `<div class="mt-6 text-center">
            <button
              type="button"
              id="btn-load-more-feed"
              data-action="feed.loadMore"
              class="px-5 py-2.5 min-h-[44px] rounded-2xl bg-surface-raised/80 hover:bg-white/10 text-xs font-bold text-cyan-300 border border-cyan-500/30 cursor-pointer"
            >Load More Discussions (${filtered.length - visibleFeedLimit} remaining)</button>
          </div>`
        : ''
    }
  </div>`;

  if (layout === 'split') {
    return `<div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div class="xl:col-span-7 min-w-0">${feedColumnHtml}</div>
      <aside id="split-secondary-workspace" class="hidden xl:block xl:col-span-5 sticky top-20 rounded-3xl bg-surface-base/85 backdrop-blur-2xl border border-white/10 p-5 shadow-2xl">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
            <h3 class="text-xs font-mono uppercase tracking-wider text-cyan-300">2027 Split Companion · ${escapeHtml(
              splitPane.toUpperCase()
            )}</h3>
          </div>
          <button
            type="button"
            data-action="workspace.setLayout"
            data-layout="standard"
            class="text-xs text-slate-400 hover:text-white cursor-pointer"
          >Close Split ✕</button>
        </div>
        <div class="text-xs text-slate-300 space-y-3">
          <p class="text-slate-400">Simultaneous side-by-side workspace active. Switch companion mode in the layout bar above or jump directly:</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" data-action="nav.primary" data-nav-id="messages" class="px-3 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold cursor-pointer">Open Full E2EE Messages →</button>
            <button type="button" data-action="nav.primary" data-nav-id="vault" class="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold cursor-pointer">Open Full Knowledge Vault →</button>
          </div>
        </div>
      </aside>
    </div>`;
  }

  return feedColumnHtml;
}
