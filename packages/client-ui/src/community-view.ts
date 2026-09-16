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

import { clientStore, ClientPost, ClientMessage } from './client-state.js';
import { sovereignCircleEngine, SovereignCircle } from './sovereign-circle.js';
import { feedControlsEngine } from './feed-controls.js';
import { markdownRenderer } from './markdown-renderer.js';
import { renderPulseEmptyState } from './empty-states.js';
import { renderIcon } from './ui/icons.js';
import { t } from './i18n.js';
import { renderPulsePostCard } from './feed-view.js';
import { communityCategories, filterCommunities } from './discovery-data.js';
import { renderDiscoveryCard } from './discovery-card.js';

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class CommunityView {
  public activePillar: 'discuss' | 'live' | 'knowledge' = 'discuss';

  public setActivePillar(pillar: 'discuss' | 'live' | 'knowledge'): void {
    this.activePillar = pillar;
  }

  private _renderLiveRoom(circle: SovereignCircle): string {
    const direct = clientStore.messages.get(circle.channelId) || [];
    const relayMsgs = clientStore.messages.get(`relays-${circle.name}`) || [];
    const channelMsgs: ClientMessage[] = direct.length > 0 ? direct : relayMsgs;
    return `
      <div class="space-y-4">
        <div class="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-surface-raised to-surface-raised border border-emerald-500/30 shadow-md flex items-center justify-between">
          <div class="flex items-center space-x-2.5">
            <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <h3 class="text-xs font-bold text-white uppercase tracking-wider font-mono">Real-Time Community Relay</h3>
              <p class="text-[11px] text-slate-400">Ephemeral mesh broadcast with sovereign cryptographic delivery proofs.</p>
            </div>
          </div>
          <span class="text-xs font-mono text-emerald-400 font-bold">${circle.onlineCount ?? 0} active nodes</span>
        </div>

        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 shadow-sm space-y-3 min-h-[360px] flex flex-col justify-between">
          <div class="space-y-2.5 overflow-y-auto max-h-96 pr-1">
            ${channelMsgs.length === 0 ? `
              <div class="p-8 text-center text-slate-500 text-xs space-y-2">
                <div class="text-2xl">⚡</div>
                <p>No live messages in c/${escapeHtml(circle.name)} yet.</p>
                <p class="text-[11px] text-slate-600">Say hello to other online members in this community!</p>
              </div>
            ` : channelMsgs.map(m => `
              <div class="flex items-start space-x-2.5 text-xs">
                <div class="w-6 h-6 rounded-lg bg-surface-base border border-white/10 flex items-center justify-center text-[10px] font-mono text-cyan-400 font-bold shrink-0">
                  ${(m.authorFingerprint || 'AN').slice(0, 2).toUpperCase()}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center space-x-2 text-[10px] text-slate-400">
                    <span class="font-bold text-slate-200">@${(m.authorFingerprint || 'anon').slice(0, 8)}</span>
                    <span>•</span>
                    <time>${new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                  </div>
                  <div class="text-slate-300 mt-0.5">${escapeHtml(m.text || '')}</div>
                  <div class="mt-1 flex items-center space-x-2 text-[10px]">
                    <button type="button" data-action="live-msg-branch-to-discussion" data-channel="${circle.channelId}" data-text="${escapeHtml(m.text || '')}" class="text-slate-500 hover:text-cyan-400 font-mono transition-colors flex items-center space-x-1 cursor-pointer" title="Branch this live thought into a persistent community discussion">
                      <span>↳</span>
                      <span>Branch to Discussion</span>
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <form id="form-community-live-chat" data-submit="submit-community-live-chat" data-channel="${circle.channelId}" class="flex items-center space-x-2 pt-2 border-t border-white/5">
            <input
              type="text"
              id="input-community-live-msg"
              placeholder="Send a live message in c/${escapeHtml(circle.name)}..."
              class="flex-1 bg-surface-base border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              autocomplete="off"
            />
            <button
              type="submit"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center space-x-1"
            >
              <span>⚡</span>
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    `;
  }

  private _renderKnowledgeBase(circle: SovereignCircle, posts: ClientPost[]): string {
    const knowledgePosts = posts.filter(p => p.attachment || p.flair === 'VERIFIED RELEASE' || p.flair === 'SECURITY ADVISORY');
    return `
      <div class="space-y-4">
        <div class="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-surface-raised to-surface-raised border border-cyan-500/30 shadow-md flex items-center justify-between">
          <div class="flex items-center space-x-2.5">
            <span class="text-xl">📚</span>
            <div>
              <h3 class="text-xs font-bold text-white uppercase tracking-wider font-mono">Community Knowledge Base &amp; Files</h3>
              <p class="text-[11px] text-slate-400">Curated resources, verified binaries, and reproducible guides for c/${escapeHtml(circle.name)}.</p>
            </div>
          </div>
          <button
            type="button"
            data-action="open-composer"
            data-channel="${circle.channelId}"
            class="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
          >
            <span>+</span>
            <span>Add Resource</span>
          </button>
        </div>

        ${knowledgePosts.length === 0 ? `
          <div class="p-8 rounded-2xl bg-surface-raised/40 border border-dashed border-white/10 text-center space-y-3">
            <div class="text-3xl">📦</div>
            <h4 class="text-sm font-bold text-white">No knowledge resources published yet</h4>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">Upload guides, research notes, or verifiable files to build the permanent knowledge base for this community.</p>
            <button
              type="button"
              data-action="open-composer"
              data-channel="${circle.channelId}"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Publish First Resource
            </button>
          </div>
        ` : `
          <div class="space-y-3">
            ${knowledgePosts.map(p => `
              <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 hover:border-cyan-500/30 transition-all shadow-sm space-y-2.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <span class="text-base">${p.attachment ? '📁' : '📄'}</span>
                    <h4 data-open-detail="${p.id}" class="text-xs sm:text-sm font-bold text-white hover:text-cyan-300 cursor-pointer transition-colors truncate max-w-md">${escapeHtml(p.title)}</h4>
                  </div>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-base text-cyan-400 border border-cyan-500/20 font-bold">${p.flair || 'GUIDE'}</span>
                </div>
                <p class="text-xs text-slate-300 line-clamp-2">${escapeHtml(p.content.slice(0, 150))}</p>
                ${p.attachment ? `
                  <div class="flex items-center justify-between p-2 rounded-xl bg-surface-base border border-white/5 text-[11px] font-mono text-slate-400">
                    <span class="truncate">📦 ${escapeHtml(p.attachment.fileName || 'document.bin')} (${((p.attachment.byteSize || 1024) / 1024).toFixed(1)} KB)</span>
                    <span class="text-emerald-400 font-bold">SHA: ${escapeHtml(p.attachment.sha256?.slice(0, 8) || 'verified')}...</span>
                  </div>
                ` : ''}
                <div class="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  <button type="button" data-action="keep-post" data-post-id="${p.id}" class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-surface-base hover:bg-surface-overlay text-amber-400 text-xs font-semibold border border-amber-500/20 transition-all cursor-pointer" title="Keep in sovereign personal Vault">
                    <span>💎</span>
                    <span>Keep in Vault</span>
                  </button>
                  <button type="button" data-action="more-open-detail" data-post-id="${p.id}" class="inline-flex items-center space-x-1 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer">
                    <span>Open Discussion</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }
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
        <nav class="discovery-breadcrumb" aria-label="Community navigation"><button type="button" data-action="nav-mode" data-mode="communities">${renderIcon('users', { size: 16 })} All communities</button><span aria-hidden="true">/</span><span>c/${escapeHtml(circle.name)}</span></nav>
        
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

        <!-- 3-PILLAR COMMUNITY NAVIGATION -->
        <div class="max-w-6xl mx-auto w-full px-4 sm:px-6 mb-4">
          <div class="flex items-center space-x-1.5 p-1 bg-surface-raised/80 rounded-2xl border border-white/10 w-fit">
            <button
              type="button"
              data-action="switch-community-pillar"
              data-pillar="discuss"
              class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                this.activePillar === 'discuss'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }"
            >
              <span>💬</span>
              <span>Discuss</span>
            </button>
            <button
              type="button"
              data-action="switch-community-pillar"
              data-pillar="live"
              class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                this.activePillar === 'live'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }"
            >
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Chat</span>
              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">${circle.onlineCount ?? 3}</span>
            </button>
            <button
              type="button"
              data-action="switch-community-pillar"
              data-pillar="knowledge"
              class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                this.activePillar === 'knowledge'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }"
            >
              <span>📚</span>
              <span>Knowledge</span>
              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">Wiki</span>
            </button>
          </div>
        </div>

        <!-- 3. TWO-COLUMN SUBREDDIT/DISCORD LAYOUT -->
        <div class="max-w-6xl mx-auto w-full px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
          
          <!-- LEFT/CENTER STREAM (8 Cols) -->
          <div class="lg:col-span-8 space-y-4">
            ${
              this.activePillar === 'live'
                ? this._renderLiveRoom(circle)
                : this.activePillar === 'knowledge'
                  ? this._renderKnowledgeBase(circle, channelPosts)
                  : `
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
                    ${streamPosts.length === 0 ? `
                      <div class="p-8 rounded-2xl bg-surface-raised/40 border border-dashed border-white/10 text-center space-y-4 my-2">
                        <div class="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl text-indigo-400">
                          💬
                        </div>
                        <div class="space-y-1">
                          <h3 class="text-sm font-bold text-white">No posts in c/${escapeHtml(circle.name)} yet</h3>
                          <p class="text-xs text-slate-400 max-w-sm mx-auto">Be the first to share an update, start a discussion, or share useful resources with this community.</p>
                        </div>
                        <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
                          <button type="button" data-action="open-composer" data-channel="${circle.channelId}" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center space-x-1.5">
                            <span>✍️</span>
                            <span>Create first post</span>
                          </button>
                          <button type="button" data-action="copy-community-url" data-community="${circle.name}" class="px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5">
                            <span>🔗</span>
                            <span>Invite people</span>
                          </button>
                          <button type="button" data-action="share-community-link" data-community="${circle.name}" class="px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5">
                            <span>📢</span>
                            <span>Share community</span>
                          </button>
                          <button type="button" data-nav-mode="communities" class="px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5">
                            <span>🧭</span>
                            <span>Browse spaces</span>
                          </button>
                        </div>
                      </div>
                    ` : streamPosts.map(renderPulsePostCard).join('')}
                  `
            }
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
                    <span class="text-xs font-semibold text-indigo-300 truncate max-w-[140px]">
                      Community Founder
                    </span>
                  </div>
                  <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">FOUNDER</span>
                </div>
                ${(circle.moderators || []).filter(m => m !== circle.creatorFingerprint).map(mFp => `
                  <div class="flex items-center justify-between p-2 rounded-xl bg-surface-base border border-white/5">
                    <div class="flex items-center space-x-2">
                      <span class="text-amber-400">${renderIcon('shield', { size: 14 })}</span>
                      <span class="text-xs text-slate-300 truncate max-w-[140px]">Moderator</span>
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

  public searchQuery: string = '';
  public activeCategory: string = 'all';
  public membershipFilter: 'all' | 'joined' = 'all';

  public setSearchQuery(q: string): void {
    this.searchQuery = q;
  }

  public setActiveCategory(cat: string): void {
    this.activeCategory = cat;
  }

  public renderCommunitiesHub(): string {
    const allCircles = sovereignCircleEngine.getAllCircles();
    const categories = communityCategories(allCircles);
    const filtered = filterCommunities(allCircles, this.searchQuery, this.activeCategory, this.membershipFilter);
    const joinedCount = allCircles.filter(circle => circle.isJoined).length;
    const isFiltering = this.searchQuery.trim() || this.activeCategory !== 'all' || this.membershipFilter !== 'all';
    return `<div id="communities-hub-workspace" class="discovery-hub">
      <header class="view-header"><div><h1>Communities</h1><p>Small worlds. Shared interests.</p></div><button type="button" class="discovery-create" data-action="open-create-circle">${renderIcon('plus', { size: 17 })}<span>Create community</span></button></header>
      <div id="communities-directory-scroll" class="discovery-hub__scroll">
        <section class="discovery-intro discovery-intro--communities" aria-labelledby="communities-intro-title">
          <div><span class="discovery-eyebrow">FIND YOUR CORNER OF THE INTERNET</span><h2 id="communities-intro-title">Different interests.<br><em>Shared curiosity.</em></h2><p>From a first question to a shared obsession.<br>There is a place for your kind of conversation.</p></div>
          <div class="discovery-constellation" aria-hidden="true"><span>${renderIcon('users', { size: 32 })}</span><span>${renderIcon('terminal', { size: 26 })}</span><span>${renderIcon('sparkles', { size: 28 })}</span></div>
          <footer><span>${allCircles.length} spaces to explore</span><span>${joinedCount} in your circle</span></footer>
        </section>
        <div class="discovery-directory-tools">
          <div class="discovery-segmented" role="group" aria-label="Community membership filter">
            <button type="button" data-action="filter-community-membership" data-membership="all" aria-pressed="${this.membershipFilter === 'all'}">Discover <span>${allCircles.length}</span></button>
            <button type="button" data-action="filter-community-membership" data-membership="joined" aria-pressed="${this.membershipFilter === 'joined'}">My communities <span>${joinedCount}</span></button>
          </div>
          <label class="discovery-search">${renderIcon('search', { size: 18 })}<input type="text" id="input-community-search" data-input="search-communities" aria-label="Search communities" placeholder="Find a community…" value="${escapeHtml(this.searchQuery)}" autocomplete="off" />${this.searchQuery ? `<button type="button" data-action="clear-community-search" aria-label="Clear community search">${renderIcon('close', { size: 17 })}</button>` : ''}</label>
        </div>
        <div class="discovery-category-list" role="group" aria-label="Community topics">${categories.map(category => `<button type="button" data-action="filter-community-category" data-category="${escapeHtml(category)}" aria-pressed="${this.activeCategory.toLowerCase() === category.toLowerCase()}">${category === 'all' ? 'All topics' : escapeHtml(category)}</button>`).join('')}</div>
        <div class="discovery-results-heading"><h2>${this.membershipFilter === 'joined' ? 'Your communities' : 'Explore the possibilities'}</h2><span role="status">${filtered.length} ${filtered.length === 1 ? 'community' : 'communities'}</span></div>
        ${filtered.length ? `<div class="discovery-space-grid">${filtered.map(renderDiscoveryCard).join('')}</div>` : `<div class="discovery-empty discovery-empty--roomy">${renderIcon('search', { size: 28 })}<strong>${this.membershipFilter === 'joined' && !joinedCount ? 'Your circle starts here' : 'No communities match these filters'}</strong><span>Try a different topic, broaden your search, or start a space of your own.</span>${isFiltering ? '<button type="button" data-action="reset-community-filters">Reset filters</button>' : ''}<button type="button" data-action="open-create-circle">Create a community</button></div>`}
      </div>
    </div>`;
  }
}
export const communityView = new CommunityView();
