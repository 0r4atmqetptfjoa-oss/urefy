/** Consumer home feed and shared post card. */

import { clientStore, ClientPost } from './client-state.js';
import { flairFilter } from './flair-filter.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { profileView } from './profile-view.js';
import { feedControlsEngine } from './feed-controls.js';
import { hashtagExplorer } from './hashtag-explorer.js';
import { renderPulseEmptyState, renderPulseFeedSkeleton } from './empty-states.js';
import { omniComposer } from './composer.js';
import { threadManager, ThreadComment } from './threads.js';
import { markdownRenderer } from './markdown-renderer.js';
import { obsidianMediaPlayer } from './media-player.js';
import { pollEngine } from './polls.js';
import { reactionsEngine } from './reactions.js';
import { pulseActionsEngine } from './pulse-actions.js';
import { renderAvatar } from './ui/avatar-generator.js';
import { renderIcon } from './ui/icons.js';

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
  const state = pulseActionsEngine.getInteractions(post.id);
  const metric = (value: number) => pulseActionsEngine.formatMetric(value);
  return `
    <div class="post-actions" data-post-id="${post.id}" data-action="stop-propagation">
      <button type="button" data-pulse-action="like" data-post-id="${post.id}" data-dir="1" class="btn-pulse-like btn-upvote ${state.liked ? 'is-active' : ''}" aria-label="${state.liked ? 'Remove Merit' : 'Give Merit'}" title="Merit">
        ${renderIcon('sparkles', { size: 18, variant: state.liked ? 'solid' : 'outline' })}<span>Merit</span><b>${metric(state.likesCount)}</b>
        <i id="particle-burst-${post.id}" aria-hidden="true"></i>
      </button>
      <button type="button" class="btn-downvote hidden" data-vote-id="${post.id}" data-dir="-1" aria-hidden="true"></button>
      <button type="button" data-pulse-action="reply" data-post-id="${post.id}" class="btn-pulse-reply" aria-label="Reply">
        ${renderIcon('messageSquare', { size: 18 })}<span>Reply</span><b>${metric(post.replyCount || state.repliesCount)}</b>
      </button>
      <div class="post-actions__repost">
        <button type="button" data-pulse-action="repost-menu" data-post-id="${post.id}" class="btn-pulse-repost-menu ${state.reposted ? 'is-active' : ''}" aria-label="Repost">
          ${renderIcon('repost', { size: 18 })}<span>Repost</span><b>${metric(state.repostsCount)}</b>
        </button>
        ${pulseActionsEngine.isRepostMenuOpen(post.id) ? `<div class="repost-menu"><button type="button" data-pulse-action="do-repost" data-post-id="${post.id}">${renderIcon('repost', { size: 16 })}<span>${state.reposted ? 'Undo repost' : 'Repost'}</span></button><button type="button" data-pulse-action="do-quote" data-post-id="${post.id}">${renderIcon('messageSquare', { size: 16 })}<span>Quote post</span></button></div>` : ''}
      </div>
      <button type="button" data-pulse-action="share" data-post-id="${post.id}" class="btn-pulse-share" aria-label="Share">
        ${renderIcon('share', { size: 18 })}<span>Share</span>
      </button>
      <button type="button" data-pulse-action="bookmark" data-post-id="${post.id}" class="btn-pulse-bookmark ${state.bookmarked ? 'is-active' : ''}" aria-label="${state.bookmarked ? 'Remove bookmark' : 'Bookmark'}">
        ${renderIcon('bookmark', { size: 18, variant: state.bookmarked ? 'solid' : 'outline' })}<span class="sr-only">Bookmark</span>
      </button>
    </div>`;
}

function renderThreadNode(comment: ThreadComment): string {
  return threadManager.renderCommentNode(comment, 'c3dc28cb705e', clientStore.keypair.fingerprint);
}

export function renderInlineQuickComposer(): string {
  const circles = sovereignCircleEngine.getAllCircles();
  return `
    <section class="quick-composer" aria-label="Create a post">
      ${renderAvatar(profileView.getProfile(clientStore.keypair.fingerprint)?.avatar, clientStore.keypair.fingerprint, { size: 42, className: 'quick-composer__avatar' })}
      <div class="quick-composer__body">
        <textarea id="inline-composer-textarea" rows="2" placeholder="What's on your mind?" aria-label="Post text"></textarea>
        <input type="text" id="inline-composer-title" placeholder="Add a title" class="hidden" aria-label="Post title" />
        <div class="quick-composer__footer">
          <div class="composer-tools">
            <button id="btn-inline-attach-media" data-action="open-composer-media" type="button" aria-label="Add media">${renderIcon('image', { size: 18 })}<span>Media</span></button>
            <button id="btn-inline-attach-poll" type="button" aria-label="Add poll">${renderIcon('activity', { size: 18 })}<span>Poll</span></button>
            <button id="btn-inline-open-full" type="button" aria-label="Open full composer">${renderIcon('more', { size: 18 })}<span>More</span></button>
            <button id="btn-mode-quick-pulse" type="button" class="hidden" aria-hidden="true">Post</button>
            <button id="btn-mode-quick-article" type="button" class="hidden" aria-hidden="true">Article</button>
            <button id="btn-inline-attach-binary" type="button" class="hidden" aria-hidden="true">File</button>
          </div>
          <div class="composer-submit-row">
            <select id="inline-composer-hub" aria-label="Choose community">
              ${circles.map(circle => `<option value="${circle.channelId}" ${circle.channelId === clientStore.activeChannelId ? 'selected' : ''}>c/${escapeHtml(circle.name)}</option>`).join('')}
            </select>
            <span id="inline-char-ring-container" class="composer-count">${omniComposer.renderCircularCountdownRing(0, 280)}</span>
            <button id="btn-inline-broadcast" type="button" class="primary-button">Post</button>
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
            <span class="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Sovereign Community</span>
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
          <button type="button" data-action="open-composer-for-circle" data-channel="${circle.channelId}" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">✍️ Post</button>
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

export function renderPulseWorkspace(): string {
  let posts = flairFilter.filterPosts(clientStore.posts);
  flairFilter.updateCounts(clientStore.posts);

  if (sovereignCircleEngine.selectedFlair) posts = posts.filter(post => post.flair === sovereignCircleEngine.selectedFlair);
  const activeCircle = clientStore.activeChannelId === 'pulse-global' ? undefined : sovereignCircleEngine.findCircle(clientStore.activeChannelId);
  if (activeCircle) posts = posts.filter(post => post.channelId === activeCircle.channelId || post.channelId === activeCircle.id || post.channelId === `c/${activeCircle.name}`);
  posts = feedControlsEngine.filterAndSortPosts(posts);

  return `
    <div class="feed-workspace">
      <header class="view-header">
        <div>
          <h1>${activeCircle ? `c/${escapeHtml(activeCircle.name)}` : 'Home'}</h1>
          <p>${activeCircle ? escapeHtml(activeCircle.displayName) : 'Conversations from people and communities you care about.'}</p>
          <span class="sr-only">PULSE STREAM ${activeCircle?.channelId === 'vault-releases' ? 'c/CLEAN-RELEASES Reproducible Binary Knowledge Vault' : ''}</span>
        </div>
        <button type="button" data-action="open-composer" class="view-header__action sm:hidden" aria-label="Create a post">${renderIcon('plus', { size: 19 })}</button>
      </header>
      ${hashtagExplorer.renderActiveTagBanner()}
      <div id="main-feed-scroll" class="feed-scroll">
        ${activeCircle ? renderCommunityHeaderBanner(activeCircle) : ''}
        ${renderInlineQuickComposer()}
        <div class="feed-toolbar-wrap">${feedControlsEngine.renderFeedControlsToolbar()}</div>
        <div class="post-stream" aria-live="polite">
          ${clientStore.isSyncing && posts.length === 0
            ? renderPulseFeedSkeleton(3)
            : posts.length === 0
              ? renderPulseEmptyState({
                  title: activeCircle ? `Start the conversation in c/${activeCircle.name}` : 'Your feed is ready for people',
                  description: activeCircle ? 'Share something useful, ask a question, or welcome the next member.' : 'Follow people and join communities to shape what appears here.',
                  actionText: activeCircle ? 'Create the first post' : 'Explore UREfy',
                })
              : posts.map(renderPulsePostCard).join('')}
        </div>
      </div>
    </div>`;
}

export function renderPulsePostCard(post: ClientPost): string {
  const circle = sovereignCircleEngine.findCircle(post.channelId);
  const circleName = circle ? `c/${circle.name}` : (post.channelId.startsWith('c/') ? post.channelId : 'c/technology');
  const profile = profileView.getProfile(post.authorFingerprint);
  const authorName = profile?.name || profile?.handle || `Member ${post.authorFingerprint.substring(0, 5)}`;
  const authorHandle = profile?.handle ? `@${profile.handle.replace(/^@/, '')}` : `@${post.authorFingerprint.substring(0, 8)}`;
  const role = roleLabel(post.authorRole);
  const comments = threadManager.getRootComments();

  return `
    <article class="social-post" data-post-card-id="${post.id}">
      <div class="social-post__avatar" data-author-profile="${post.authorFingerprint}">${renderAvatar(profile?.avatar, post.authorFingerprint, { size: 42, className: 'w-10 h-10' })}</div>
      <div class="social-post__content">
        <header class="social-post__header">
          <button type="button" class="social-post__author" data-author-profile="${post.authorFingerprint}"><strong>${escapeHtml(authorName)}</strong><span>${escapeHtml(authorHandle)}</span><span class="sr-only">${escapeHtml(post.authorFingerprint.substring(0, 8))}</span></button>
          ${role ? `<span class="role-badge">${role}</span>` : ''}
          <span class="verified-badge" title="Verified account" aria-label="Verified account">${renderIcon('checkCircle', { size: 14 })}</span>
          <span class="social-post__separator">·</span>
          <time datetime="${new Date(post.createdAt).toISOString()}">${relativeTime(post.createdAt)}</time>
          <button type="button" data-action="open-community" data-channel="${post.channelId}" class="social-post__community">${escapeHtml(circleName)}</button>
        </header>

        ${post.title && post.title !== post.content.substring(0, 50) ? `<h2 data-open-detail="${post.id}" class="social-post__title">${escapeHtml(post.title)}</h2>` : ''}
        <div class="social-post__body">${markdownRenderer.renderMarkdown(post.content)}</div>
        ${post.video ? obsidianMediaPlayer.renderVideoCard(post.id, post.video.src, post.video.poster) : (obsidianMediaPlayer.extractVideo(post.content) ? obsidianMediaPlayer.renderVideoCard(post.id, post.content) : '')}
        ${post.images?.length ? `<div class="social-post__media">${obsidianMediaPlayer.renderImageMosaic(post.images)}</div>` : ''}
        ${post.pollId ? pollEngine.renderPollCard(post.pollId, clientStore.keypair.fingerprint) : ''}
        ${post.quotedPost ? `<button type="button" data-open-detail="${post.quotedPost.id}" class="quoted-post"><span>${escapeHtml(post.quotedPost.title || 'Quoted post')}</span><p>${escapeHtml(post.quotedPost.content)}</p></button>` : ''}
        <div class="reaction-row">${reactionsEngine.renderReactionBar(post.id, clientStore.keypair.fingerprint)}</div>
        ${renderPostActions(post)}
        ${post.isExpanded ? `<section class="reply-thread"><h3>Replies</h3>${comments.map(renderThreadNode).join('')}</section>` : ''}
      </div>
    </article>`;
}

export function renderPostCard(post: ClientPost): string {
  return renderPulsePostCard(post);
}
