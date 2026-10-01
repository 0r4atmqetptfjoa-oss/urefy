import { postPath, profilePath, communityPath } from './public-urls.js';
/** Consumer home feed and shared post card. */

import { clientStore, ClientPost } from './client-state.js';
import { flairFilter } from './flair-filter.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { profileView } from './profile-view.js';
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
import { renderWorkspaceLayoutControls } from './workspace-layout.js';
import { isDemoModeEnabled } from './demo-mode.js';
import { privacyLens } from './privacy-lens.js';
import { storiesEngine } from './stories.js';

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
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function roleLabel(role: string): string {
  if (role === 'GUARDIAN') return 'Team';
  if (role === 'ARCHIVIST') return 'Contributor';
  if (role === 'MODERATOR') return 'Moderator';
  return '';
}

function renderPostActions(post: ClientPost): string {
  if (post.deliveryStatus) return `<div class="post-delivery" role="status"><span>${post.deliveryStatus === 'sending' ? 'Publishing…' : escapeHtml(post.deliveryError || 'Not published')}</span>${post.deliveryStatus === 'failed' ? `<button type="button" data-action="retry-publication" data-post-id="${escapeHtml(post.id)}">Retry publication</button>` : ''}</div>`;
  const state = pulseActionsEngine.getInteractions(post.id);
  const metric = (value: number) => pulseActionsEngine.formatMetric(value);
  const replies = post.replyCount ?? state.repliesCount ?? 0;
  const merits = pulseActionsEngine.hasSynced(post.id) ? state.likesCount : Math.max(state.likesCount, post.meritVotes || 0);
  const reposts = pulseActionsEngine.hasSynced(post.id) ? state.repostsCount : Math.max(state.repostsCount, post.boostCount || 0);
  return `
    <div class="post-actions" data-post-id="${post.id}" data-action="stop-propagation">
      <button type="button" ${pulseActionsEngine.isPending(post.id, 'like') ? 'disabled aria-busy="true"' : ''} aria-pressed="${state.liked}" data-pulse-action="like" data-post-id="${post.id}" data-dir="1" class="btn-pulse-like ${state.liked ? 'is-active' : ''}" aria-label="${state.liked ? 'Remove Merit' : 'Give Merit'}" title="Merit">
        ${renderIcon('sparkles', { size: 18, variant: state.liked ? 'solid' : 'outline' })}<span>Merit</span><b>${metric(merits)}</b>
        <i id="particle-burst-${post.id}" aria-hidden="true"></i>
      </button>
      <button type="button" data-pulse-action="reply" data-post-id="${post.id}" class="btn-pulse-reply" aria-label="Reply">
        ${renderIcon('messageSquare', { size: 18 })}<span>Reply</span><b>${metric(replies)}</b>
      </button>
      <div class="post-actions__repost">
        <button type="button" ${pulseActionsEngine.isPending(post.id, 'repost') ? 'disabled aria-busy="true"' : ''} aria-expanded="${pulseActionsEngine.isRepostMenuOpen(post.id)}" data-action="toggle-repost-menu" data-pulse-action="repost-menu" data-post-id="${post.id}" class="btn-pulse-repost-menu ${state.reposted ? 'is-active' : ''}" aria-label="Repost">
          ${renderIcon('repost', { size: 18 })}<span>Repost</span><b>${metric(reposts)}</b>
        </button>
        ${pulseActionsEngine.isRepostMenuOpen(post.id) ? `<div class="repost-menu"><button type="button" data-action="do-repost" data-pulse-action="do-repost" data-post-id="${post.id}">${renderIcon('repost', { size: 16 })}<span>${state.reposted ? 'Undo repost' : 'Repost'}</span></button><button type="button" data-action="do-quote" data-pulse-action="do-quote" data-post-id="${post.id}">${renderIcon('messageSquare', { size: 16 })}<span>Quote post</span></button></div>` : ''}
      </div>
      <button type="button" data-pulse-action="share" data-post-id="${post.id}" class="btn-pulse-share" aria-label="Share">
        ${renderIcon('share', { size: 18 })}<span>Share</span>
      </button>
      <button type="button" ${pulseActionsEngine.isPending(post.id, 'bookmark') ? 'disabled aria-busy="true"' : ''} aria-pressed="${state.bookmarked}" data-pulse-action="bookmark" data-post-id="${post.id}" class="btn-pulse-bookmark ${state.bookmarked ? 'is-active' : ''}" aria-label="${state.bookmarked ? 'Remove bookmark' : 'Bookmark'}">
        ${renderIcon('bookmark', { size: 18, variant: state.bookmarked ? 'solid' : 'outline' })}<span class="sr-only">Bookmark</span>
      </button>
      <div class="post-actions__more relative">
        <button type="button" data-action="open-post-more-menu" data-post-id="${post.id}" class="btn-pulse-more" aria-label="More options" title="More options">
          ${renderIcon('more', { size: 18 })}<span class="sr-only">More</span>
        </button>
      </div>
    </div>`;
}

function renderThreadNode(comment: ThreadComment): string {
  return threadManager.renderCommentNode(comment, 'c3dc28cb705e', clientStore.keypair.fingerprint);
}

// A background response can replace the feed while focus moves to Post. Keep
// the draft independent of DOM focus so a render cannot erase the user's text.
export const quickPostDraft = { content: '', channelId: '' };

export function submitQuickPost(): void {
  const textarea = document.getElementById('inline-composer-textarea') as HTMLTextAreaElement | null;
  const content = (textarea?.value || quickPostDraft.content).trim();
  if (!content) { clientStore.showToast('Write something before posting.', 'warning'); return; }
  if (content.length > 280) { clientStore.showToast('Keep quick posts within 280 characters, or use the full composer.', 'warning'); return; }
  const titleInput = document.getElementById('inline-composer-title') as HTMLInputElement | null;
  const hasTitle = titleInput && !titleInput.classList.contains('hidden') && titleInput.value.trim();
  const channel = (document.getElementById('inline-composer-hub') as HTMLSelectElement | null)?.value || quickPostDraft.channelId || clientStore.activeChannelId;
  quickPostDraft.content = '';
  if (textarea) textarea.value = '';
  clientStore.createPost({ title: hasTitle || content.slice(0, 50), content, channelId: channel, flair: hasTitle ? 'TECH DISCUSSION' : 'MICRO-PULSE' });
  if (titleInput) titleInput.value = '';
}

export function renderInlineQuickComposer(): string {
  const circles = sovereignCircleEngine.getAllCircles();
  const activeFacet = clientStore.getActiveFacet() || {
    displayName: 'Main Context',
    handle: 'sovereign',
    avatarUrl: '',
  };
  return `
    <section class="quick-composer social-home-composer" aria-label="Create a post">
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs pb-2 mb-2 border-b border-white/5 text-slate-400">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-[11px] shrink-0">Posting as</span>
          <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-base border border-white/10 text-white font-medium min-w-0">
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-accent,#e89e38)] shrink-0"></span>
            <span class="truncate">${escapeHtml(activeFacet.displayName)}</span>
            <span class="text-slate-400 text-[10px] font-mono truncate">@${escapeHtml(activeFacet.handle)}</span>
          </div>
        </div>
        <div class="shrink-0">${privacyLens.renderCompact({ audience: 'public', interactive: false })}</div>
      </div>
      <div class="flex gap-3">
        ${renderAvatar(profileView.getProfile(clientStore.keypair.fingerprint)?.avatar, clientStore.keypair.fingerprint, { size: 40, className: 'quick-composer__avatar shrink-0 w-10 h-10 rounded-xl' })}
        <div class="quick-composer__body flex-1 min-w-0">
          <textarea id="inline-composer-textarea" rows="2" placeholder="Share a dispatch or start a discussion..." aria-label="Post text">${escapeHtml(quickPostDraft.content)}</textarea>
          <input type="text" id="inline-composer-title" placeholder="Add a title (optional)" class="hidden" aria-label="Post title" />
          <div class="quick-composer__footer">
            <div class="composer-tools">
              <button id="btn-inline-attach-media" data-action="open-composer-media" type="button" aria-label="Add media">${renderIcon('image', { size: 17 })}<span>Media</span></button>
              <button id="btn-inline-attach-poll" type="button" aria-label="Add poll">${renderIcon('activity', { size: 17 })}<span>Poll</span></button>
              <button id="btn-inline-open-full" type="button" aria-label="Open full composer">${renderIcon('more', { size: 17 })}<span>More</span></button>
              <button id="btn-mode-quick-pulse" type="button" class="hidden" aria-hidden="true">Post</button>
              <button id="btn-mode-quick-article" type="button" class="hidden" aria-hidden="true">Article</button>
              <button id="btn-inline-attach-binary" type="button" class="hidden" aria-hidden="true">File</button>
            </div>
            <div class="composer-submit-row">
              <select id="inline-composer-hub" aria-label="Choose community">
                ${circles.map(circle => `<option value="${circle.channelId}" ${circle.channelId === (quickPostDraft.channelId || clientStore.activeChannelId) ? 'selected' : ''}>c/${escapeHtml(circle.name)}</option>`).join('')}
              </select>
              <span id="inline-char-ring-container" class="composer-count">${omniComposer.renderCircularCountdownRing(0, 280)}</span>
              <button id="btn-inline-broadcast" data-action="submit-quick-post" type="button" class="primary-button">Post</button>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

export function renderCommunityHeaderBanner(circle: import('./sovereign-circle.js').SovereignCircle): string {
  const postCount = clientStore.posts.filter(post => post.channelId === circle.channelId).length;
  return `
    <section class="feed-community-banner p-4 rounded-2xl bg-surface-raised border border-white/5 mb-4 space-y-3" style="--community-banner:${circle.banner}">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="community-avatar community-avatar--large w-12 h-12 rounded-xl bg-surface-base flex items-center justify-center text-2xl border border-white/10">${circle.icon || renderIcon('users', { size: 24 })}</span>
          <div>
            <span class="text-[11px] font-bold text-[var(--color-accent,#e59b3c)] uppercase tracking-wider">Sovereign Community</span>
            <h1 class="text-base font-bold text-white">c/${escapeHtml(circle.name)}</h1>
            <p class="text-xs text-slate-300">${escapeHtml(circle.description)}</p>
            <div class="text-xs text-slate-400 mt-1">
              <span>${circle.membersCount || 0} members</span> · 
              <span class="font-bold text-white">${postCount}</span> <span>loaded posts</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="compact-join-button ${circle.isJoined ? 'is-joined' : ''} px-3 py-1.5 rounded-xl text-xs font-bold bg-surface-overlay text-white hover:bg-white/10" data-action="toggle-join-circle" data-circle-id="${circle.id}">${circle.isJoined ? 'Joined' : 'Join'}</button>
          <button type="button" data-action="open-composer-for-circle" data-channel="${circle.channelId}" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 cursor-pointer">✍️ Post</button>
        </div>
      </div>
      ${circle.rules && circle.rules.length > 0 ? `
        <div class="pt-2 border-t border-white/5 text-xs text-slate-400">
          <span class="font-bold text-slate-300">Rules:</span>
          <span class="ml-1">${escapeHtml(circle.rules[0].title)}</span>
        </div>
      ` : ''}
    </section>`;
}

let awayCardDismissed = false;

export function renderSinceYouWereAwayCard(): string {
  if (awayCardDismissed) return '';
  let lastActive = 0;
  try { lastActive = Number(localStorage.getItem('urefy_last_active')); } catch {}
  const count = countPostsSince(clientStore.posts, lastActive);
  if (!count) return '';
  return `<div id="since-you-were-away-card" class="orbit-return" role="status">
    <span>${renderIcon('activity', { size: 17 })} ${count} new ${count === 1 ? 'post' : 'posts'} available since your last visit</span>
    <button type="button" data-action="dismiss-away-summary" aria-label="Dismiss summary">${renderIcon('close', { size: 17 })}</button>
  </div>`;
}
export function dismissSinceYouWereAwayCard(): void {
  awayCardDismissed = true;
  try { localStorage.setItem('urefy_last_active', String(Date.now())); } catch {}
}

const FEED_PAGE_SIZE = 20;
let feedScope = '';
let feedVisibleCount = FEED_PAGE_SIZE;

export function loadMoreFeedPosts(): void {
  feedVisibleCount += FEED_PAGE_SIZE;
  clientStore.notifySync();
}

export function renderPulseWorkspace(): string {
  let posts = flairFilter.filterPosts(clientStore.posts);
  flairFilter.updateCounts(clientStore.posts);

  if (sovereignCircleEngine.selectedFlair) posts = posts.filter(post => post.flair === sovereignCircleEngine.selectedFlair);
  const activeCircle = clientStore.activeChannelId === 'pulse-global' ? undefined : sovereignCircleEngine.findCircle(clientStore.activeChannelId);
  if (activeCircle) posts = posts.filter(post => post.channelId === activeCircle.channelId || post.channelId === activeCircle.id || post.channelId === `c/${activeCircle.name}`);
  posts = feedControlsEngine.filterAndSortPosts(posts);

  const scope = JSON.stringify([clientStore.activeChannelId, flairFilter.activeFlair,
    sovereignCircleEngine.selectedFlair, hashtagExplorer.activeTag,
    feedControlsEngine.getStreamType(), feedControlsEngine.getSortType(), feedControlsEngine.getTopTimeframe()]);
  if (scope !== feedScope) {
    feedScope = scope;
    feedVisibleCount = FEED_PAGE_SIZE;
  }
  const visiblePosts = posts.slice(0, feedVisibleCount);
  const isFlow = mobileFlowEngine.getMode() === 'flow'
    && typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

  const classicStreamHtml = isFlow ? '' : `
    <div class="river-stream" aria-live="polite">
      ${clientStore.isSyncing && posts.length === 0
        ? renderPulseFeedSkeleton(3)
        : posts.length === 0
          ? (feedControlsEngine.getStreamType() === 'following'
              ? renderFollowingEmptyState()
              : renderPulseEmptyState({
                  title: activeCircle 
                    ? `Start the conversation in c/${activeCircle.name}` 
                    : 'Your feed is ready for people',
                  description: activeCircle 
                    ? 'Share something useful, ask a question, or welcome the next member.' 
                    : 'Follow people and join communities to shape what appears here.',
                  actionText: activeCircle 
                    ? 'Create the first post' 
                    : 'Explore UREfy',
                  actionType: activeCircle ? 'composer' : 'explore',
                }))
          : visiblePosts.map(renderPulsePostCard).join('')}
    </div>
  `;

  const discoveryLayerHtml = (!activeCircle && !hashtagExplorer.activeTag) 
    ? homeDiscoveryEngine.renderDiscoveryLayer(posts) 
    : '';

  return `
    <div class="feed-workspace social-home">
      <header class="view-header social-home__header">
        <div>
          <h1>${activeCircle ? `c/${escapeHtml(activeCircle.name)}` : 'Home'}</h1>
          ${activeCircle ? `<p>${escapeHtml(activeCircle.displayName)}</p>` : ''}
          <span class="sr-only">PULSE STREAM ${activeCircle?.channelId === 'vault-releases' ? 'c/CLEAN-RELEASES Reproducible Binary Knowledge Vault' : ''}</span>
        </div>
        <div class="orbit-layout-tools">${renderWorkspaceLayoutControls()}</div>
      </header>
      ${hashtagExplorer.renderActiveTagBanner()}
      <div id="main-feed-scroll" data-feed-scope="${escapeHtml(scope + (isFlow ? ':flow' : ':classic'))}" class="feed-scroll social-home__scroll">
        ${activeCircle ? renderCommunityHeaderBanner(activeCircle) : ''}
        <div class="feed-toolbar-wrap social-home__feed-switcher">${feedControlsEngine.renderFeedControlsToolbar()}</div>
        ${renderInlineQuickComposer()}
        ${!activeCircle ? storiesEngine.renderStoriesCarousel(clientStore.keypair.fingerprint) : ''}
        ${!activeCircle ? renderSinceYouWereAwayCard() : ''}
        ${discoveryLayerHtml}
        ${!activeCircle ? renderHomeHorizon(posts, clientStore.isConnected, isDemoModeEnabled()) : ''}
        <div class="social-home__stream">
          ${isFlow ? mobileFlowEngine.renderFlowStream(visiblePosts) : classicStreamHtml}
          ${posts.length > visiblePosts.length ? `<div class="flex justify-center py-6"><button type="button" class="secondary-button" data-action="load-more-feed-posts">Load more posts <span class="sr-only">(${posts.length - visiblePosts.length} remaining)</span></button></div>` : ''}
        </div>
      </div>
    </div>`;
}

export function renderPulsePostCard(post: ClientPost): string {
  const circle = sovereignCircleEngine.findCircle(post.channelId);
  const circleName = circle ? `c/${circle.name}` : (post.channelId.startsWith('c/') ? post.channelId : 'c/technology');
  const profile = post.authorDisplayName || post.authorHandle
    ? { ...profileView.getProfile(post.authorFingerprint), name: post.authorDisplayName || '', handle: post.authorHandle || '', avatar: post.authorAvatarUrl || '' }
    : profileView.getProfile(post.authorFingerprint);
  const publicIdentity = presentPublicIdentity(profile, post.authorFingerprint, post.authorFingerprint === clientStore.keypair.fingerprint);
  const authorName = publicIdentity.displayName;
  const authorHandle = publicIdentity.handleLabel;
  const role = roleLabel(post.authorRole);
  const comments = threadManager.getRootCommentsForPost(post.id);

  const reposters = pulseActionsEngine.getRepostersForPost(post.id);
  const reposterFP = (post as any).repostedBy || (reposters.length > 0 ? reposters[0] : null);
  let repostAttribution = '';
  if (reposterFP && reposterFP !== post.authorFingerprint) {
    const repProfile = profileView.getProfile(reposterFP);
    const repName = presentPublicIdentity(repProfile, reposterFP, reposterFP === clientStore.keypair.fingerprint).displayName;
    repostAttribution = `
      <div class="repost-attribution-pill flex items-center space-x-1.5 text-xs text-slate-400 font-sans mb-2 pl-0.5">
        ${renderIcon('repost', { size: 14, className: 'text-emerald-400 shrink-0' })}
        <span>Reposted by <strong class="text-slate-200 font-bold">${escapeHtml(repName)}</strong></span>
      </div>
    `;
  }

  // Media detection
  const detectedVideo = obsidianMediaPlayer.extractVideo(post.content);
  const videoHtml = post.video
    ? obsidianMediaPlayer.renderVideoCard(post.id, post.video.src, post.video.poster)
    : (detectedVideo ? obsidianMediaPlayer.renderVideoCard(post.id, post.content) : '');
  const uniqueImages = post.images?.filter(img => img && img !== post.video?.poster) || [];
  const imagesHtml = uniqueImages.length
    ? `<div class="social-post__media">${obsidianMediaPlayer.renderImageMosaic(uniqueImages)}</div>`
    : '';
  const hasMedia = Boolean(videoHtml || imagesHtml);

  // Content clean-up
  let displayContent = post.content || '';
  if (detectedVideo && !post.video) {
    displayContent = displayContent
      .replace(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}[^\s]*/gi, '')
      .replace(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/\d+[^\s]*/gi, '')
      .replace(/https?:\/\/[^\s"'<>]+\.(?:mp4|webm|ogg)(?:\?[^\s"'<>]*)?/gi, '')
      .trim();
  }

  const isClamped = hasMedia
    ? (displayContent.length > 120 || (displayContent.match(/\n/g) || []).length >= 2)
    : (displayContent.length > 280 || (displayContent.match(/\n/g) || []).length >= 4);

  // Restrained Content Grammar
  const replyCount = post.replyCount ?? 0;
  const isStarter = Boolean(post.title && post.title !== post.content.substring(0, 50) && replyCount < 3);
  const isDeepDiscussion = replyCount >= 3;
  const isCommunity = Boolean(circle && !isStarter);

  let grammarClass = 'post-grammar--standard';
  if (isDeepDiscussion) grammarClass = 'post-grammar--deep-discussion';
  else if (isStarter) grammarClass = 'post-grammar--starter';
  else if (hasMedia) grammarClass = 'post-grammar--media';
  else if (isCommunity) grammarClass = 'post-grammar--community-discussion';

  return `
    <article class="river-item social-post ${grammarClass} cursor-pointer" data-post-card-id="${post.id}" data-action="open-post-detail" data-post-id="${post.id}">
      <div class="river-anchor">
        <div class="social-post__avatar" data-author-profile="${post.authorFingerprint}">
          ${renderAvatar(profile?.avatar, post.authorFingerprint, { size: 40, className: 'w-10 h-10 rounded-full border border-white/10' })}
        </div>
      </div>
      <div class="social-post__content min-w-0">
        ${repostAttribution}
        <header class="social-post__header flex items-center justify-between gap-2 flex-wrap mb-1">
          <div class="flex items-center gap-1.5 min-w-0 flex-wrap">
            <a href="${profilePath(post.authorFingerprint)}" data-public-link class="social-post__author font-semibold text-slate-100 hover:text-white">
              <strong>${escapeHtml(authorName)}</strong>
              <span class="text-slate-400 text-xs">${escapeHtml(authorHandle)}</span>
              <span class="sr-only">${escapeHtml(post.authorFingerprint.substring(0, 8))}</span>
            </a>
            ${role ? `<span class="role-badge">${role}</span>` : ''}
            <span class="social-post__separator text-slate-500">·</span>
            <a href="${postPath(post.id)}" data-public-link aria-label="Open post" class="text-xs text-slate-400 hover:text-white"><time datetime="${new Date(post.createdAt).toISOString()}">${relativeTime(post.createdAt)}</time></a>
            <a href="${communityPath(circleName)}" data-public-link class="social-post__community inline-flex items-center px-2 py-0.5 rounded-full bg-surface-raised border border-white/10 text-[11px] font-medium text-[var(--color-accent,#e59b3c)] hover:bg-surface-overlay hover:border-white/25 transition-all">${escapeHtml(circleName)}</a>
          </div>
          <div class="flex items-center shrink-0">
            ${privacyLens.renderCompact({ audience: post.audience || 'public', postId: post.id, channelName: circle?.name, facetHandle: post.facetHandle || authorHandle })}
          </div>
        </header>

        ${post.content.startsWith('> [ 🔗 Evolved from') || post.content.startsWith('> Evolved from Live Chat') ? `
          <div class="provenance-badge inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-surface-raised border border-white/10 text-slate-300 text-[10px] font-sans my-1">
            <span>${post.content.startsWith('> [ 🔗') ? '🔗' : '💬'}</span>
            <span>${post.content.startsWith('> [ 🔗') ? 'Evolved from Private Branch' : 'Evolved from Chat'}</span>
          </div>
        ` : ''}

        ${post.title && post.title !== post.content.substring(0, 50) ? `<h2 class="social-post__title"><a href="${postPath(post.id)}" data-public-link>${escapeHtml(post.title)}</a></h2>` : ''}
        ${videoHtml}
        ${imagesHtml}
        ${displayContent ? `
          <div class="social-post__body-wrapper ${hasMedia ? 'has-media' : 'text-only'} ${isClamped ? 'is-clamped' : ''}">
            <div data-action="open-post-detail" data-post-id="${post.id}" class="social-post__body cursor-pointer text-[15px] sm:text-base leading-relaxed text-slate-200">${markdownRenderer.renderMarkdown(displayContent)}</div>
            ${isClamped ? `
              <button type="button" data-action="open-post-detail" data-post-id="${escapeHtml(post.id)}" class="social-post__see-more" aria-label="Read full post">
                <span>Read full post</span>
                <svg class="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
            ` : ''}
          </div>
        ` : ''}

        ${replyCount > 0 ? `
          <div class="river-branch-marker" title="${replyCount} active responses">
            <span>↳</span>
            <span>${replyCount} ${replyCount === 1 ? 'reply in river' : 'replies continuing in river'}</span>
          </div>
        ` : ''}

        ${post.pollId ? pollEngine.renderPollCard(post.pollId, clientStore.keypair.fingerprint) : ''}
        ${post.quotedPost ? `<button type="button" data-open-detail="${post.quotedPost.id}" class="quoted-post"><span>${escapeHtml(post.quotedPost.title || 'Quoted post')}</span><p>${escapeHtml(post.quotedPost.content)}</p></button>` : ''}
        ${!post.deliveryStatus ? `<div class="reaction-row" data-action="stop-propagation">${reactionsEngine.renderReactionBar(post.id, clientStore.keypair.fingerprint)}</div>` : ''}
        ${renderPostActions(post)}
        <span class="hidden" style="display:none !important;" aria-hidden="true"><button type="button" class="btn-downvote" data-vote-id="${post.id}" data-dir="-1" aria-hidden="true" tabindex="-1"></button></span>
        ${post.isExpanded ? `<section class="reply-thread"><h3>Replies</h3>${comments.map(renderThreadNode).join('')}</section>` : ''}
      </div>
    </article>`;
}

export function renderPostCard(post: ClientPost): string {
  return renderPulsePostCard(post);
}
