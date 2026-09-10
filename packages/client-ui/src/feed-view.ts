/**
 * @file feed-view.ts
 * @package @aetheris/client-ui
 * @description Sovereign Pulse Stream & Collective Discussion Feed View.
 */

import { clientStore, ClientPost } from './client-state.js';
import { flairFilter } from './flair-filter.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { feedControlsEngine } from './feed-controls.js';
import { storiesEngine } from './stories.js';
import { hashtagExplorer } from './hashtag-explorer.js';
import { renderPulseEmptyState, renderPulseFeedSkeleton } from './empty-states.js';
import { omniComposer } from './composer.js';
import { threadManager, ThreadComment } from './threads.js';
import { markdownRenderer } from './markdown-renderer.js';
import { obsidianMediaPlayer } from './media-player.js';
import { pollEngine } from './polls.js';
import { reactionsEngine } from './reactions.js';
import { pulseActionsEngine } from './pulse-actions.js';
import { t } from './i18n.js';

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderThreadNode(c: ThreadComment): string {
  return threadManager.renderCommentNode(c, 'c3dc28cb705e', clientStore.keypair.fingerprint);
}

export function renderInlineQuickComposer(): string {
  return `
    <div class="p-4 rounded-2xl bg-surface-raised/90 border border-white/5 hover:border-white/10 transition-all shadow-sm space-y-3 mb-5">
      <div class="flex space-x-3.5">
        <!-- USER AVATAR -->
        <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 p-0.5 shrink-0">
          <div class="w-full h-full rounded-full bg-[#0c0e14] flex items-center justify-center font-mono text-[10px] font-bold text-white">
            ${clientStore.keypair.fingerprint.substring(0, 2).toUpperCase()}
          </div>
        </div>

        <!-- COMPOSER MAIN -->
        <div class="flex-1 space-y-2.5">
          <div class="flex items-center justify-between">
            <!-- MODE TOGGLE -->
            <div class="flex items-center space-x-1 bg-surface-overlay p-0.5 rounded-xl border border-white/5 text-[11px] font-medium">
              <button id="btn-mode-quick-pulse" type="button" class="px-2.5 py-1 rounded-lg text-indigo-300 font-bold bg-surface-raised border border-indigo-500/30 transition-all cursor-pointer">
                ⚡ Micro-Pulse
              </button>
              <button id="btn-mode-quick-article" type="button" class="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer">
                📦 Verified Release
              </button>
            </div>

            <!-- CIRCLE SELECTOR -->
            <select id="inline-composer-hub" class="bg-surface-overlay border border-white/10 text-slate-300 rounded-xl px-2.5 py-1 text-xs font-mono focus:outline-none cursor-pointer">
              ${sovereignCircleEngine.getAllCircles().map(c => `
                <option value="${c.channelId}" ${c.channelId === clientStore.activeChannelId ? 'selected' : ''}>
                  c/${escapeHtml(c.name)}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- TITLE INPUT (FOR ARTICLES/RELEASES) -->
          <input 
            type="text" 
            id="inline-composer-title" 
            placeholder="Publication Title / Release Header..." 
            class="hidden w-full bg-surface-overlay border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-bold focus:outline-none focus:border-indigo-500/50"
          />

          <!-- MAIN TEXTAREA -->
          <textarea 
            id="inline-composer-textarea"
            rows="2"
            placeholder="${t('pulse.composerPlaceholder', undefined, 'What is happening in the sovereign matrix? (Markdown, #tags and @mentions supported)')}"
            class="w-full bg-transparent border-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
          ></textarea>

          <!-- ATTACHMENT TRAY & ACTIONS -->
          <div class="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
            <div class="flex items-center space-x-2 text-slate-400">
              <button id="btn-inline-open-full" title="Open Full Rich Editor" type="button" class="p-1.5 hover:text-indigo-300 hover:bg-surface-overlay rounded-lg transition-colors cursor-pointer flex items-center space-x-1">
                <span>📝</span>
                <span class="text-[10px] hidden sm:inline">Rich Editor</span>
              </button>
              <button id="btn-inline-attach-media" data-action="open-composer-media" title="Attach Media / Video / Images" type="button" class="p-1.5 hover:text-cyan-300 hover:bg-surface-overlay rounded-lg transition-colors cursor-pointer flex items-center space-x-1">
                <span>🖼️</span>
                <span class="text-[10px] hidden sm:inline">Media</span>
              </button>
              <button id="btn-inline-attach-poll" title="Create Cryptographic Poll" type="button" class="p-1.5 hover:text-indigo-300 hover:bg-surface-overlay rounded-lg transition-colors cursor-pointer flex items-center space-x-1">
                <span>📊</span>
                <span class="text-[10px] hidden sm:inline">Poll</span>
              </button>
              <button id="btn-inline-attach-binary" title="Attach Binary Release" type="button" class="p-1.5 hover:text-emerald-400 hover:bg-surface-overlay rounded-lg transition-colors cursor-pointer flex items-center space-x-1">
                <span>📦</span>
                <span class="text-[10px] hidden sm:inline">Binary</span>
              </button>
              <span class="text-slate-600">|</span>
              ${clientStore.isSovereignMode() ? '<span class="text-[10px] font-mono text-indigo-400">ZK-RLN Protected</span>' : '<span class="text-[10px] font-mono text-slate-500">Spam Protected</span>'}
            </div>

            <div class="flex items-center space-x-2.5">
              <div id="inline-char-ring-container" class="flex items-center">
                ${omniComposer.renderCircularCountdownRing(0, 280)}
              </div>
              <button id="btn-inline-broadcast" type="button" class="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-sm flex items-center space-x-1 cursor-pointer">
                <span>${t('pulse.publishPost', undefined, 'Broadcast')}</span>
                <span>⚡</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderCommunityHeaderBanner(circle: import('./sovereign-circle.js').SovereignCircle): string {
  return `
    <div class="rounded-2xl overflow-hidden bg-surface-raised border border-white/5 shadow-md mb-5 group">
      <!-- COMMUNITY BANNER -->
      <div class="h-28 sm:h-36 w-full relative" style="background: ${circle.banner};">
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"></div>
        <div class="absolute top-3 right-3 flex items-center space-x-2">
          <span class="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[10px] font-mono text-cyan-400 border border-cyan-500/30 shadow-sm">
            ${escapeHtml(circle.category)}
          </span>
        </div>
      </div>

      <!-- COMMUNITY IDENTITY BAR -->
      <div class="px-4 sm:px-6 pb-5 pt-0 relative">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between -mt-10 sm:-mt-12 gap-3 mb-3">
          <!-- AVATAR & TITLES -->
          <div class="flex items-end space-x-3 sm:space-x-4">
            <div class="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-[#0c0e14] border-4 border-[#0c0e14] shadow-xl flex items-center justify-center text-3xl sm:text-4xl shrink-0 overflow-hidden" style="color: ${circle.primaryColor};">
              ${circle.icon || '🏛️'}
            </div>
            <div class="space-y-0.5 pb-1">
              <div class="flex items-center space-x-2 flex-wrap">
                <h1 class="text-base sm:text-xl font-bold text-white tracking-tight">c/${escapeHtml(circle.name)}</h1>
                <span class="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-semibold">
                  🛡️ Sovereign Community
                </span>
              </div>
              <p class="text-xs text-slate-400 font-medium">${escapeHtml(circle.displayName)}</p>
            </div>
          </div>

          <!-- ACTIONS: JOIN & CREATE POST -->
          <div class="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0">
            <button
              type="button"
              data-action="toggle-join-circle"
              data-circle-id="${circle.id}"
              class="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer ${
                circle.isJoined
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-white text-slate-900 hover:bg-slate-200'
              }"
            >
              <span>${circle.isJoined ? '✓' : '+'}</span>
              <span>${circle.isJoined ? 'Joined' : 'Join'}</span>
            </button>

            <button
              type="button"
              data-action="open-composer-for-circle"
              data-channel="${circle.channelId}"
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
            >
              <span>✏️</span>
              <span>Create Post</span>
            </button>

            ${sovereignCircleEngine.isUserModerator(circle.id, clientStore.keypair.fingerprint) ? `
              <button
                type="button"
                data-action="open-circle-mod-tools"
                data-circle-id="${circle.id}"
                class="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                title="Community Moderation & Governance Engine"
              >
                <span>⚙️</span>
                <span>Mod Tools</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- DESCRIPTION & STATS -->
        <div class="space-y-3 pt-1">
          <p class="text-xs text-slate-300 leading-relaxed max-w-2xl">${escapeHtml(circle.description)}</p>

          <div class="flex items-center space-x-4 text-[11px] font-mono text-slate-400 flex-wrap gap-y-1">
            <span class="flex items-center space-x-1">
              <span class="font-bold text-white">${clientStore.posts.filter(post => post.channelId === circle.channelId).length}</span>
              <span>loaded posts</span>
            </span>
            ${circle.createdAt ? `<span>Created ${escapeHtml(circle.createdAt)}</span>` : ''}
          </div>

          <!-- COMMUNITY RULES TAGS -->
          ${circle.rules && circle.rules.length > 0 ? `
            <div class="flex items-center space-x-1.5 overflow-x-auto py-1 text-[10px] text-slate-400 no-scrollbar">
              <span class="font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">Rules:</span>
              ${circle.rules.map((r, i) => `
                <span class="px-2 py-0.5 rounded-lg bg-surface-overlay border border-white/5 whitespace-nowrap text-slate-300" title="${escapeHtml(r.description)}">
                  ${i + 1}. ${escapeHtml(r.title)}
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

export function renderPulseWorkspace(): string {
  let posts = clientStore.posts;
  flairFilter.updateCounts(clientStore.posts);
  posts = flairFilter.filterPosts(posts);

  // Apply Sovereign Circle active flair filter if selected
  if (sovereignCircleEngine.selectedFlair) {
    posts = posts.filter(p => p.flair === sovereignCircleEngine.selectedFlair);
  }

  // Active circle check: find circle matching active channel
  const activeCircle = sovereignCircleEngine.findCircle(clientStore.activeChannelId);

  // If viewing a specific circle, filter posts to that channel
  if (activeCircle && activeCircle.channelId !== 'pulse-global') {
    posts = posts.filter(p => p.channelId === activeCircle.channelId || p.channelId === activeCircle.id || p.channelId === 'c/' + activeCircle.name);
  }

  // Apply Feed Controls sort & timeframe algorithm
  posts = feedControlsEngine.filterAndSortPosts(posts);

  return `
    <div class="flex-1 flex flex-col overflow-hidden bg-canvas">
      
      <!-- STICKY TOP PULSE HEADER -->
      <div class="sticky top-0 z-10 border-subtle-b bg-surface-base/90 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between shrink-0 h-14 shadow-sm">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-base font-bold shadow-sm">
            ${activeCircle ? (activeCircle.icon || '⚡') : '⚡'}
          </div>
          <div>
            <h1 class="text-xs font-bold text-white tracking-wide">
              PULSE STREAM ${activeCircle ? `• c/${escapeHtml(activeCircle.name).toUpperCase()}` : '& SOVEREIGN BOARD'}
            </h1>
            <p class="text-[10px] text-slate-400 font-mono truncate max-w-md">
              ${activeCircle ? escapeHtml(activeCircle.displayName) : 'Real-time uncensored sovereign flash broadcasts & collective discussions.'}
            </p>
          </div>
        </div>
      </div>

      <!-- EPHEMERAL STORIES CAROUSEL -->
      ${storiesEngine.renderStoriesCarousel(clientStore.keypair.fingerprint)}

      <!-- ACTIVE HASHTAG BANNER -->
      ${hashtagExplorer.renderActiveTagBanner()}

      <!-- PULSE POSTS STREAM -->
      <div id="main-feed-scroll" class="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto space-y-4 max-w-3xl mx-auto w-full pb-20 md:pb-6">
        <!-- REDDIT-STYLE SOVEREIGN COMMUNITY HEADER BANNER -->
        ${activeCircle ? renderCommunityHeaderBanner(activeCircle) : ''}

        <!-- INLINE QUICK COMPOSER -->
        ${renderInlineQuickComposer()}

        <!-- FEED CONTROLS: SORT FILTERS (HOT, NEW, TOP, RISING) & VIEW MODES (CARD, CLASSIC, COMPACT) -->
        ${feedControlsEngine.renderFeedControlsToolbar()}

        <!-- POSTS STREAM -->
        ${clientStore.isSyncing && posts.length === 0 
          ? renderPulseFeedSkeleton(3) 
          : (posts.length === 0 
              ? renderPulseEmptyState({
                  title: activeCircle ? `No pulses in c/${activeCircle.name} yet` : undefined,
                  description: activeCircle ? `Be the first sovereign node to publish verified research or code in this circle.` : undefined,
                  actionText: activeCircle ? `✏️ Post in c/${activeCircle.name}` : undefined,
                }) 
              : posts.map(p => feedControlsEngine.renderPost(p, feedControlsEngine.getViewMode())).join(''))}

      </div>
    </div>
  `;
}

export function renderPulsePostCard(p: ClientPost): string {
  const time = new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const rootComments = threadManager.getRootComments();
  const circleName = p.channelId.startsWith('vault-') ? (p.channelId === 'vault-releases' ? 'c/clean-releases' : 'c/security-guides') :
                     p.channelId.startsWith('relays-') ? 'c/p2p-mesh' : 'c/zeroknowledge';

  return `
    <article class="p-3 sm:p-4 md:p-5 rounded-2xl bg-surface-raised border border-white/5 hover:border-white/10 transition-all shadow-sm flex space-x-2.5 sm:space-x-3.5 group">
      
      <!-- MERIT VOTING COLUMN -->
      <div class="flex flex-col items-center justify-start space-y-1 shrink-0 pt-0.5">
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
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center space-x-2 flex-wrap gap-y-1">
            <!-- CIRCLE BADGE -->
            <button data-channel-id="${p.channelId}" class="btn-channel font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-surface-overlay text-white border border-white/5 hover:border-white/20 transition-all cursor-pointer">
              ${circleName}
            </button>

            <!-- AUTHOR HANDLE & PROFILE TRIGGER -->
            <div data-author-profile="${p.authorFingerprint}" class="btn-open-author-profile flex items-center space-x-1.5 cursor-pointer hover:opacity-80 transition-opacity" title="View Sovereign Profile">
              <div class="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 flex items-center justify-center font-mono text-[9px] font-bold text-white shrink-0">
                ${p.authorFingerprint.substring(0, 2).toUpperCase()}
              </div>
              <span class="font-mono text-xs font-semibold text-slate-200 hover:text-indigo-300">@id:${p.authorFingerprint.substring(0, 8)}</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">${p.authorRole}</span>
              ${clientStore.isSovereignMode() ? '<span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/20">🛡️ ZK-Human</span>' : '<span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">✓ Verified</span>'}
            </div>
          </div>
          <span class="text-[10px] font-mono text-slate-500">${time}</span>
        </div>

        <!-- POST TITLE IF PRESENT -->
        ${p.title && p.title !== p.content.substring(0, 50) ? `
          <h3 data-open-detail="${p.id}" class="btn-open-detail text-sm font-bold text-white leading-snug hover:text-indigo-400 transition-colors cursor-pointer select-text">
            ${escapeHtml(p.title)}
          </h3>
        ` : ''}

        <!-- POST BODY -->
        <div class="text-xs text-slate-300 leading-relaxed select-text space-y-2">
          ${markdownRenderer.renderMarkdown(p.content)}
        </div>

        <!-- MULTIMEDIA & POLLS -->
        ${p.video ? obsidianMediaPlayer.renderVideoCard(p.id, p.video.src, p.video.poster) : (obsidianMediaPlayer.extractVideo(p.content) ? obsidianMediaPlayer.renderVideoCard(p.id, p.content) : '')}
        ${p.images && p.images.length > 0 ? obsidianMediaPlayer.renderImageMosaic(p.images) : ''}
        ${p.pollId ? pollEngine.renderPollCard(p.pollId, clientStore.keypair.fingerprint) : ''}

        <!-- QUOTED PULSE PREVIEW IF ATTACHED -->
        ${p.quotedPost ? `
          <div data-open-detail="${p.quotedPost.id}" class="btn-open-detail p-3 rounded-2xl bg-surface-base/80 border border-white/10 hover:border-white/20 transition-all space-y-1.5 my-2 cursor-pointer">
            <div class="flex items-center space-x-2 text-xs">
              <span class="text-indigo-400 font-bold text-[11px]">❝ Quoted Pulse</span>
              <span class="text-slate-500">·</span>
              <span class="font-mono text-xs font-bold text-slate-200">@id:${p.quotedPost.authorFingerprint.substring(0, 8)}</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">${p.quotedPost.authorRole}</span>
            </div>
            ${p.quotedPost.title ? `<div class="text-xs font-bold text-slate-200">${escapeHtml(p.quotedPost.title)}</div>` : ''}
            <div class="text-xs text-slate-400 line-clamp-2">${escapeHtml(p.quotedPost.content)}</div>
          </div>
        ` : ''}

        <!-- EMOJI REACTIONS BAR -->
        <div class="pt-1">
          ${reactionsEngine.renderReactionBar(p.id, clientStore.keypair.fingerprint)}
        </div>

        <!-- MICRO-BROADCASTING ACTION BAR -->
        ${pulseActionsEngine.renderPulseActionBar(p.id, p.replyCount)}

        <!-- INLINE DISCUSSION TREE -->
        ${p.isExpanded ? `
          <div class="pt-3 border-subtle-t space-y-3">
            <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Discussion Tree:
            </div>
            <div class="space-y-3">
              ${rootComments.map(c => renderThreadNode(c)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </article>
  `;
}

export function renderPostCard(p: ClientPost): string {
  return feedControlsEngine.renderPost(p, feedControlsEngine.getViewMode());
}
