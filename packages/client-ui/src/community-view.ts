/**
 * @file community-view.ts
 * @package @aetheris/client-ui
 * @description Dedicated Subreddit & Discord-style community workspace.
 * Features:
 * - Cover hero banner with gradient/image, live online counter, and category pill
 * - Identity header with custom avatar, community title, join toggle, and creator tools
 * - Two-column responsive layout:
 *   - Left/Center column: Pinned announcement, inline composer, feed toolbar, post stream
 *   - Right rail: About community card, governance rules accordion, moderators roster
 */

import { clientStore, ClientPost } from './client-state.js';
import { sovereignCircleEngine, SovereignCircle } from './sovereign-circle.js';
import { feedControlsEngine } from './feed-controls.js';
import { markdownRenderer } from './markdown-renderer.js';
import { renderPulseEmptyState } from './empty-states.js';
import { renderIcon } from './ui/icons.js';
import { t } from './i18n.js';
import { renderPulsePostCard } from './feed-view.js';

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class CommunityView {
  /**
   * Renders the complete dedicated Community Workspace.
   */
  public renderCommunityWorkspace(circle: SovereignCircle): string {
    const isMod = sovereignCircleEngine.isUserModerator(
      circle.id,
      clientStore.keypair?.fingerprint || ''
    );

    // Filter posts for this specific community
    let channelPosts = clientStore.posts.filter(
      p =>
        p.channelId === circle.channelId ||
        p.channelId === circle.id ||
        p.channelId === `c/${circle.name}`
    );

    // Apply active flair filter if selected
    if (sovereignCircleEngine.selectedFlair) {
      channelPosts = channelPosts.filter(p => p.flair === sovereignCircleEngine.selectedFlair);
    }

    // Locate Pinned Post
    const pinnedPost = circle.pinnedPostId
      ? channelPosts.find(p => p.id === circle.pinnedPostId)
      : undefined;

    // Filter out pinned post from main stream to avoid duplication
    let streamPosts = pinnedPost
      ? channelPosts.filter(p => p.id !== circle.pinnedPostId)
      : channelPosts;

    streamPosts = feedControlsEngine.filterAndSortPosts(streamPosts);

    return `
      <div id="community-view-workspace" class="community-workspace flex-1 flex flex-col overflow-y-auto bg-canvas">
        
        <!-- 1. FULL-WIDTH COMMUNITY HERO BANNER -->
        <div class="community-hero relative w-full h-36 sm:h-52 overflow-hidden" style="background: ${circle.banner || 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)'};">
          <div class="absolute inset-0 bg-gradient-to-t from-canvas via-black/30 to-transparent"></div>
          <div class="absolute top-4 right-4 flex items-center space-x-2">
            <span class="px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-xs font-mono text-cyan-300 border border-white/10 shadow-md">
              ${escapeHtml(circle.category || 'General')}
            </span>
            <span class="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-xs font-mono text-emerald-400 border border-white/10 flex items-center space-x-1.5 shadow-md">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>${circle.onlineCount ?? 0} online</span>
            </span>
          </div>
        </div>

        <!-- 2. COMMUNITY HEADER IDENTITY BAR -->
        <div class="max-w-6xl mx-auto w-full px-4 sm:px-6 -mt-12 sm:-mt-16 relative z-10 mb-6">
          <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/10">
            <div class="flex items-end space-x-4">
              <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-surface-base border-4 border-canvas shadow-2xl flex items-center justify-center shrink-0" style="color: ${circle.primaryColor || '#6366f1'};">
                ${circle.icon && !circle.icon.includes('🏛️') ? circle.icon : renderIcon('users', { size: 36, strokeWidth: 1.75 })}
              </div>
              <div class="space-y-1 pb-1">
                <div class="flex items-center space-x-2 flex-wrap">
                  <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">${escapeHtml(circle.displayName || circle.name)}</h1>
                  <span class="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono inline-flex items-center gap-1.5">
                    ${circle.communityType === 'private' ? `${renderIcon('lock', { size: 12 })} Private` : circle.communityType === 'restricted' ? `${renderIcon('eye', { size: 12 })} Restricted` : `${renderIcon('globe', { size: 12 })} Public`}
                  </span>
                </div>
                <p class="text-xs sm:text-sm text-slate-300 font-medium">c/${escapeHtml(circle.name)}</p>
                <div class="text-xs text-slate-400 font-mono flex items-center space-x-3">
                  <span><b>${(circle.membersCount || 0).toLocaleString()}</b> members</span>
                  <span>•</span>
                  <span><b>${(circle.rules || []).length}</b> rules</span>
                </div>
              </div>
            </div>

            <!-- ACTION BUTTONS -->
            <div class="flex items-center space-x-2 self-start sm:self-auto shrink-0 flex-wrap gap-y-2">
              <button
                type="button"
                data-action="toggle-join-circle"
                data-circle-id="${circle.id}"
                class="px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer ${
                  circle.isJoined
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-white text-slate-900 hover:bg-slate-200'
                }"
              >
                ${circle.isJoined ? renderIcon('check', { size: 14 }) : renderIcon('plus', { size: 14 })}
                <span>${circle.isJoined ? 'Joined' : 'Join Community'}</span>
              </button>

              <button
                type="button"
                data-action="open-composer"
                data-channel="${circle.channelId}"
                class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                ${renderIcon('plus', { size: 14 })}
                <span>Post</span>
              </button>

              ${isMod ? `
                <button
                  type="button"
                  data-action="open-circle-mod-tools"
                  data-circle-id="${circle.id}"
                  class="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
                  title="Community Moderation & Governance Settings"
                >
                  ${renderIcon('shield', { size: 14 })}
                  <span>Mod Tools</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <nav class="community-tabs" aria-label="Community sections">
          <button type="button" data-feed-sort="hot" class="btn-feed-sort is-active">Hot</button>
          <button type="button" data-feed-sort="new" class="btn-feed-sort">New</button>
          <button type="button" data-feed-sort="top" class="btn-feed-sort">Top</button>
          <a href="#community-about">About</a>
        </nav>

        <!-- 3. TWO-COLUMN SUBREDDIT/DISCORD LAYOUT -->
        <div class="max-w-6xl mx-auto w-full px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
          
          <!-- LEFT/CENTER STREAM (8 Cols) -->
          <div class="lg:col-span-8 space-y-4">
            
            <!-- PINNED POST (IF PRESENT) -->
            ${pinnedPost ? `
              <div class="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-surface-raised to-surface-raised border border-amber-500/30 shadow-md space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="flex items-center space-x-1.5 text-amber-300 font-bold font-mono text-[11px] uppercase tracking-wider">
                    ${renderIcon('pin', { size: 14, class: 'text-amber-400' })}
                    <span>Pinned Announcement</span>
                  </span>
                  ${isMod ? `
                    <button type="button" data-action="toggle-pin-post" data-circle-id="${circle.id}" data-post-id="${pinnedPost.id}" class="text-slate-400 hover:text-white text-[11px] cursor-pointer">
                      Unpin
                    </button>
                  ` : ''}
                </div>
                <h3 data-open-detail="${pinnedPost.id}" class="text-sm font-bold text-white hover:text-indigo-300 cursor-pointer transition-colors">
                  ${escapeHtml(pinnedPost.title || 'Community Announcement')}
                </h3>
                <div class="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  ${markdownRenderer.renderMarkdown(pinnedPost.content)}
                </div>
              </div>
            ` : ''}

            <!-- INLINE QUICK COMPOSER -->
            <div class="p-3.5 rounded-2xl bg-surface-raised border border-white/5 shadow-sm">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  ${renderIcon('plus', { size: 16, class: 'text-indigo-400' })}
                </div>
                <input
                  type="text"
                  placeholder="Share a thought, link, or discussion in c/${escapeHtml(circle.name)}..."
                  data-action="open-composer"
                  data-channel="${circle.channelId}"
                  class="flex-1 bg-surface-base border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-300 hover:border-white/20 cursor-pointer focus:outline-none"
                  readonly
                />
              </div>
            </div>

            <!-- FEED CONTROLS -->
            ${feedControlsEngine.renderFeedControlsToolbar()}

            <!-- POST STREAM -->
            ${streamPosts.length === 0 ? renderPulseEmptyState({
                title: `No posts in c/${escapeHtml(circle.name)} yet`,
                description: `Be the first to share an article, discussion, or project with this community.`,
                actionText: `✍️ Create First Post in c/${escapeHtml(circle.name)}`,
              }) : streamPosts.map(renderPulsePostCard).join('')}
          </div>

          <!-- RIGHT RAIL (4 Cols): ABOUT, RULES, MODERATORS -->
          <div class="lg:col-span-4 space-y-4">
            
            <!-- ABOUT CARD -->
            <div id="community-about" class="p-4 rounded-2xl bg-surface-raised border border-white/5 shadow-sm space-y-3">
              <h3 class="text-sm font-bold text-white">About this community</h3>
              <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(circle.description)}</p>
              <div class="pt-3 border-t border-white/5 space-y-2 text-xs font-mono text-slate-400">
                <div class="flex justify-between">
                  <span>Category:</span>
                  <span class="text-white font-semibold">${escapeHtml(circle.category || 'General')}</span>
                </div>
                <div class="flex justify-between">
                  <span>Access:</span>
                  <span class="text-white font-semibold capitalize">${circle.communityType || 'Public'}</span>
                </div>
                <div class="flex justify-between">
                  <span>Total Posts:</span>
                  <span class="text-white font-semibold">${channelPosts.length}</span>
                </div>
                <div class="flex justify-between">
                  <span>Created:</span>
                  <span class="text-slate-300">${circle.createdAt || 'Genesis'}</span>
                </div>
              </div>
            </div>

            <!-- RULES ACCORDION -->
            <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 shadow-sm space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Community Rules (${(circle.rules || []).length})
                </h3>
              </div>
              <div class="space-y-2">
                ${(circle.rules || []).map((rule, idx) => `
                  <div class="p-2.5 rounded-xl bg-surface-base border border-white/5 space-y-1">
                    <div class="font-semibold text-xs text-slate-200">
                      ${idx + 1}. ${escapeHtml(rule.title)}
                    </div>
                    <p class="text-[11px] text-slate-400 leading-relaxed">${escapeHtml(rule.description)}</p>
                  </div>
                `).join('')}
              </div>
            </div>

            ${isMod ? `
              <!-- MODERATOR TOOLS CARD -->
              <div class="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 shadow-md space-y-3">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center space-x-1.5">
                    <span>🛡️</span>
                    <span>Mod Tools</span>
                  </h3>
                  <span class="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">AUTHORIZED</span>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    data-action="open-mod-queue"
                    data-circle-id="${circle.id}"
                    class="px-3 py-2 rounded-xl bg-surface-base hover:bg-surface-overlay border border-white/10 text-xs font-semibold text-slate-200 transition-colors cursor-pointer text-center"
                  >
                    Reports Queue
                  </button>
                  <button
                    type="button"
                    data-action="open-mod-logs"
                    data-circle-id="${circle.id}"
                    class="px-3 py-2 rounded-xl bg-surface-base hover:bg-surface-overlay border border-white/10 text-xs font-semibold text-slate-200 transition-colors cursor-pointer text-center"
                  >
                    Audit Log
                  </button>
                </div>
              </div>
            ` : ''}

            <!-- MODERATORS ROSTER -->
            <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 shadow-sm space-y-3">
              <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Moderators</h3>
              <div class="space-y-2">
                <div class="flex items-center justify-between p-2 rounded-xl bg-surface-base border border-white/5">
                  <div class="flex items-center space-x-2">
                    <span class="text-indigo-400">${renderIcon('award', { size: 14 })}</span>
                    <span class="text-xs font-mono font-semibold text-indigo-300 truncate max-w-[140px]">
                      @${circle.creatorFingerprint ? circle.creatorFingerprint.slice(0, 10) : 'founder'}
                    </span>
                  </div>
                  <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">FOUNDER</span>
                </div>
                ${(circle.moderators || []).filter(m => m !== circle.creatorFingerprint).map(mFp => `
                  <div class="flex items-center justify-between p-2 rounded-xl bg-surface-base border border-white/5">
                    <div class="flex items-center space-x-2">
                      <span class="text-amber-400">${renderIcon('shield', { size: 14 })}</span>
                      <span class="text-xs font-mono text-slate-300 truncate max-w-[140px]">@${mFp.slice(0, 10)}</span>
                    </div>
                    <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">MOD</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- DISCOVER MORE -->
            <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 shadow-sm space-y-3">
              <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Explore Other Communities</h3>
              <div class="space-y-2">
                ${sovereignCircleEngine.getAllCircles()
                  .filter(c => c.id !== circle.id)
                  .slice(0, 3)
                  .map(other => `
                    <div class="flex items-center justify-between p-2 rounded-xl bg-surface-base border border-white/5 hover:border-white/10 transition-colors">
                      <div class="flex items-center space-x-2 min-w-0">
                        <span class="text-base">${other.icon || '🏛️'}</span>
                        <div class="min-w-0">
                          <button type="button" data-action="join-channel" data-channel="${other.channelId}" class="text-xs font-bold text-slate-200 hover:text-indigo-400 truncate block text-left cursor-pointer">
                            c/${escapeHtml(other.name)}
                          </button>
                          <span class="text-[10px] text-slate-400 font-mono">${(other.membersCount || 0).toLocaleString()} members</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        data-action="toggle-join-circle"
                        data-circle-id="${other.id}"
                        class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${other.isJoined ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white hover:bg-white/20'}"
                      >
                        ${other.isJoined ? '✓' : '+ Join'}
                      </button>
                    </div>
                  `).join('')}
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  public renderCommunitiesHub(): string {
    const allCircles = sovereignCircleEngine.getAllCircles();
    const joinedCircles = allCircles.filter(c => c.isJoined);
    const suggestedCircles = allCircles.filter(c => !c.isJoined);

    return `
      <div id="communities-hub-workspace" class="flex-1 flex flex-col overflow-y-auto bg-canvas p-4 sm:p-6 max-w-6xl mx-auto w-full pb-20">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <h1 class="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
              <span class="text-indigo-400">${renderIcon('users', { size: 24, strokeWidth: 1.75 })}</span>
              <span>Communities</span>
            </h1>
            <p class="text-xs sm:text-sm text-slate-400 mt-1">
              Join topic-focused spaces, participate in sovereign discussions, or start your own community.
            </p>
          </div>
          <button
            type="button"
            data-action="open-charter-modal"
            class="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center space-x-2 self-start sm:self-auto"
          >
            ${renderIcon('plus', { size: 14, strokeWidth: 2.5 })}
            <span>Create Community</span>
          </button>
        </div>

        ${joinedCircles.length > 0 ? `
          <div class="mt-8 space-y-4">
            <h2 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <span class="text-amber-400">${renderIcon('sparkles', { size: 14 })}</span>
              <span>Joined Communities (${joinedCircles.length})</span>
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              ${joinedCircles.map(c => this.renderCircleCard(c)).join('')}
            </div>
          </div>
        ` : ''}

        <div class="mt-8 space-y-4">
          <h2 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <span class="text-cyan-400">${renderIcon('globe', { size: 14 })}</span>
            <span>Discover Communities</span>
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${(suggestedCircles.length > 0 ? suggestedCircles : allCircles).map(c => this.renderCircleCard(c)).join('')}
          </div>
        </div>

      </div>
    `;
  }

  private renderCircleCard(circle: SovereignCircle): string {
    return `
      <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 hover:border-white/15 transition-all shadow-sm flex flex-col justify-between space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 rounded-xl bg-surface-base border border-white/10 flex items-center justify-center shadow-inner shrink-0" style="color: ${circle.primaryColor || '#6366f1'};">
              ${circle.icon && !circle.icon.includes('🏛️') ? circle.icon : renderIcon('users', { size: 24, strokeWidth: 1.75 })}
            </div>
            <div>
              <button type="button" data-action="join-channel" data-channel="${circle.channelId}" class="text-sm font-bold text-white hover:text-indigo-400 transition-colors text-left block cursor-pointer">
                c/${escapeHtml(circle.name)}
              </button>
              <p class="text-[11px] text-slate-400 font-medium truncate max-w-[180px]">${escapeHtml(circle.displayName)}</p>
            </div>
          </div>
          <button
            type="button"
            data-action="toggle-join-circle"
            data-circle-id="${circle.id}"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              circle.isJoined
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }"
          >
            ${circle.isJoined ? `${renderIcon('check', { size: 12 })} Joined` : `${renderIcon('plus', { size: 12 })} Join`}
          </button>
        </div>

        <p class="text-xs text-slate-300 leading-relaxed line-clamp-2">${escapeHtml(circle.description)}</p>

        <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>${(circle.membersCount || 0).toLocaleString()} members</span>
          <span class="text-cyan-400">${escapeHtml(circle.category || 'General')}</span>
        </div>
      </div>
    `;
  }
}

export const communityView = new CommunityView();
