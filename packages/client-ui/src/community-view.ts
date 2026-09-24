/**
 * @file community-view.ts
 * @package @aetheris/client-ui
 * @description Community workspace connecting discussion, live context and shared resources.
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
import { communityPath } from './public-urls.js';

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
        <div class="context-trail community-context-heading">
          <div class="flex items-center space-x-2.5">
            <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <h3>Live conversation</h3>
              <p>Talk with the community. Keep useful messages privately in your Vault.</p>
            </div>
          </div>
          ${circle.onlineCount && circle.onlineCount > 0 ? `<span class="text-xs font-mono text-emerald-400 font-bold">${circle.onlineCount} active in discussion</span>` : ''}
        </div>

        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 shadow-sm space-y-3 min-h-[360px] flex flex-col justify-between">
          <div class="space-y-2.5 overflow-y-auto max-h-96 pr-1">
            ${channelMsgs.length === 0 ? `
              <div class="p-8 text-center text-slate-500 text-xs space-y-2">
                <div class="text-2xl">💬</div>
                <p>No messages in c/${escapeHtml(circle.name)} yet.</p>
                <p class="text-[11px] text-slate-500">Say hello to other members in this community!</p>
              </div>
            ` : channelMsgs.map(m => `
              <div id="context-live-${escapeHtml(m.id)}" tabindex="-1" class="flex items-start space-x-2.5 text-xs">
                <div class="w-6 h-6 rounded-lg bg-surface-base border border-white/10 flex items-center justify-center text-[10px] text-slate-300 font-bold shrink-0">
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
                    <button type="button" data-action="keep-live-message" data-channel="${escapeHtml(direct.length ? circle.channelId : `relays-${circle.name}`)}" data-message-id="${escapeHtml(m.id)}" class="context-button min-h-[32px]" ${m.text?.trim() ? '' : 'disabled'}>
                      <span>Keep in Vault</span>
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
              aria-label="Message this community"
              placeholder="Message c/${escapeHtml(circle.name)}..."
              class="flex-1 bg-surface-base border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e89e38)] min-h-[44px]"
              autocomplete="off"
            />
            <button
              type="submit"
              class="min-h-[44px] px-4 py-2 bg-[var(--color-accent,#e89e38)] hover:brightness-105 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center space-x-1"
            >
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
        <div class="context-trail community-context-heading">
          <div class="flex items-center space-x-2.5">
            <span class="text-xl">📚</span>
            <div>
              <h3>Community resources</h3>
              <p>Shared files and release or security posts from c/${escapeHtml(circle.name)}. Keep a private copy of useful context.</p>
            </div>
          </div>
          <button
            type="button"
            data-action="open-composer"
            data-channel="${circle.channelId}"
            class="px-3 py-1.5 rounded-xl bg-[var(--color-accent,#e89e38)] hover:brightness-105 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
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
                    <h4><button type="button" data-action="more-open-detail" data-post-id="${escapeHtml(p.id)}" class="text-xs sm:text-sm font-bold text-white hover:text-cyan-300 text-left">${escapeHtml(p.title)}</button></h4>
                  </div>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-base text-cyan-400 border border-cyan-500/20 font-bold">${p.flair || 'GUIDE'}</span>
                </div>
                <p class="text-xs text-slate-300 line-clamp-2">${escapeHtml(p.content.slice(0, 150))}</p>
                ${p.attachment ? `
                  <div class="flex items-center justify-between p-2 rounded-xl bg-surface-base border border-white/5 text-[11px] font-mono text-slate-400">
                    <span class="truncate">📦 ${escapeHtml(p.attachment.fileName || 'document.bin')} (${((p.attachment.byteSize || 1024) / 1024).toFixed(1)} KB)</span>
                    <span class="text-slate-400">${p.attachment.sha256 ? `SHA: ${escapeHtml(p.attachment.sha256.slice(0, 8))}…` : 'Checksum unavailable'}</span>
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
        <nav class="discovery-breadcrumb" aria-label="Community navigation"><a href="/communities" data-public-link>${renderIcon('users', { size: 16 })} All communities</a><span aria-hidden="true">/</span><span>c/${escapeHtml(circle.name)}</span></nav>
        
        <!-- 1. FULL-WIDTH COMMUNITY HERO BANNER -->
        <div class="community-hero relative w-full h-36 sm:h-52 overflow-hidden" style="background: ${circle.banner || 'linear-gradient(135deg, #1c1813 0%, #27221b 50%, #362e24 100%)'};">
          <div class="absolute inset-0 bg-gradient-to-t from-canvas via-black/40 to-transparent"></div>
          <div class="absolute top-4 right-4 flex items-center space-x-2">
            <span class="px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-xs text-slate-300 border border-white/10">
              ${escapeHtml(circle.category || 'General')}
            </span>
            <span class="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-xs text-slate-300 border border-white/10 ${circle.onlineCount && circle.onlineCount > 0 ? 'flex' : 'hidden'} items-center space-x-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>${circle.onlineCount ?? 0} online</span>
            </span>
          </div>
        </div>

        <!-- 2. COMMUNITY HEADER IDENTITY BAR -->
        <div class="max-w-6xl mx-auto w-full px-4 sm:px-6 -mt-12 sm:-mt-16 relative z-10 mb-6">
          <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/10">
            <div class="flex items-end space-x-4">
              <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-surface-base border-4 border-canvas shadow-2xl flex items-center justify-center shrink-0" style="color: ${circle.primaryColor || 'var(--color-accent,#e89e38)'};">
                ${circle.icon && !circle.icon.includes('🏛️') ? circle.icon : renderIcon('users', { size: 36, strokeWidth: 1.75 })}
              </div>
              <div class="space-y-1 pb-1">
                <div class="flex items-center space-x-2 flex-wrap">
                  <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">${escapeHtml(circle.displayName || circle.name)}</h1>
                  <span class="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 inline-flex items-center gap-1.5">
                    ${circle.communityType === 'private' ? `${renderIcon('lock', { size: 12 })} Private` : circle.communityType === 'restricted' ? `${renderIcon('eye', { size: 12 })} Restricted` : `${renderIcon('globe', { size: 12 })} Public`}
                  </span>
                </div>
                <p class="text-xs sm:text-sm text-slate-300 font-medium">c/${escapeHtml(circle.name)}</p>
                <div class="text-xs text-slate-400 flex items-center space-x-3">
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
                class="min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer ${
                  circle.isJoined
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-white text-slate-900 hover:bg-slate-200'
                }"
              >
                ${circle.isJoined ? renderIcon('check', { size: 14 }) : renderIcon('plus', { size: 14 })}
                <span>${circle.isJoined ? 'Joined' : 'Join'}</span>
              </button>

              <button
                type="button"
                data-action="open-composer"
                data-channel="${circle.channelId}"
                class="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--color-accent,#e89e38)] hover:brightness-110 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                ${renderIcon('plus', { size: 14 })}
                <span>New Post</span>
              </button>

              <button
                type="button"
                data-action="share-community-link"
                data-community="${circle.name}"
                class="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                title="Share community link"
              >
                ${renderIcon('share', { size: 14 })}
                <span>Share</span>
              </button>

              ${isMod ? `
                <button
                  type="button"
                  data-action="open-circle-mod-tools"
                  data-circle-id="${circle.id}"
                  class="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
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
          <div class="community-pillars" role="group" aria-label="Community spaces">
            <button
              type="button"
              data-action="switch-community-pillar"
              data-pillar="discuss"
              aria-pressed="${this.activePillar === 'discuss'}"
              class="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                this.activePillar === 'discuss'
                  ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }"
            >
              <span>${renderIcon('messageSquare', { size: 15 })}</span>
              <span>Posts</span>
            </button>
            <button
              type="button"
              data-action="switch-community-pillar"
              data-pillar="live"
              aria-pressed="${this.activePillar === 'live'}"
              class="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                this.activePillar === 'live'
                  ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }"
            >
              <span>${renderIcon('messages', { size: 15 })}</span>
              <span>Chat</span>
            </button>
            <button
              type="button"
              data-action="switch-community-pillar"
              data-pillar="knowledge"
              aria-pressed="${this.activePillar === 'knowledge'}"
              class="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                this.activePillar === 'knowledge'
                  ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }"
            >
              <span>${renderIcon('book', { size: 15 })}</span>
              <span>Wiki</span>
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
                        <div class="w-8 h-8 rounded-full bg-[var(--color-accent,#e59b3c)]/20 text-[var(--color-accent,#e59b3c)] flex items-center justify-center font-bold text-xs">
                          ${renderIcon('plus', { size: 16, class: 'text-[var(--color-accent,#e59b3c)]' })}
                        </div>
                        <input
                          type="text"
                          placeholder="Share a perspective, research paper, or discussion in c/${escapeHtml(circle.name)}..."
                          data-action="open-composer"
                          data-channel="${circle.channelId}"
                          class="flex-1 bg-surface-base border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 hover:border-white/20 cursor-pointer focus:outline-none min-h-[44px]"
                          readonly
                        />
                      </div>
                    </div>

                    <!-- TOPIC FLAIR CHIPS (IF PRESENT) -->
                    ${(circle.flairs && circle.flairs.length > 0) ? `
                      <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                        <span class="text-[11px] font-mono text-slate-500 uppercase tracking-wider shrink-0">Topics:</span>
                        <button 
                          type="button" 
                          id="btn-clear-flair-filter" 
                          class="px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer shrink-0 ${!sovereignCircleEngine.selectedFlair ? 'bg-[var(--color-accent,#e59b3c)]/20 text-[var(--color-accent,#e59b3c)] border border-[var(--color-accent,#e59b3c)]/40 font-bold' : 'bg-surface-base text-slate-400 border border-white/5 hover:text-white'}"
                        >
                          All
                        </button>
                        ${circle.flairs.map((flair) => `
                          <button 
                            type="button" 
                            data-select-flair="${escapeHtml(flair)}" 
                            class="btn-flair-filter px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer shrink-0 ${
                              sovereignCircleEngine.selectedFlair === flair
                                ? 'bg-[var(--color-accent,#e59b3c)]/20 text-[var(--color-accent,#e59b3c)] border border-[var(--color-accent,#e59b3c)]/40 font-bold shadow-xs'
                                : 'bg-surface-base text-slate-400 border border-white/5 hover:text-white'
                            }"
                          >
                            ${escapeHtml(flair)}
                          </button>
                        `).join('')}
                      </div>
                    ` : ''}

                    <!-- FEED CONTROLS -->
                    ${feedControlsEngine.renderFeedControlsToolbar()}

                    <!-- POST STREAM -->
                    ${streamPosts.length === 0 ? `
                      <div class="p-8 rounded-2xl bg-surface-raised/40 border border-dashed border-white/10 text-center space-y-4 my-2">
                        <div class="w-12 h-12 mx-auto rounded-2xl bg-[var(--color-accent,#e59b3c)]/15 border border-[var(--color-accent,#e59b3c)]/30 flex items-center justify-center text-2xl text-[var(--color-accent,#e59b3c)]">
                          💬
                        </div>
                        <div class="space-y-1">
                          <h3 class="text-sm font-bold text-white">No posts in c/${escapeHtml(circle.name)} yet</h3>
                          <p class="text-xs text-slate-400 max-w-sm mx-auto">Be the first to share an update, start a discussion, or share useful resources with this community.</p>
                        </div>
                        <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
                          <button type="button" data-action="open-composer" data-channel="${circle.channelId}" class="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-110 text-slate-950 text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center space-x-1.5">
                            <span>✍️</span>
                            <span>Create first post</span>
                          </button>
                          <button type="button" data-action="copy-community-url" data-community="${circle.name}" class="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5">
                            <span>🔗</span>
                            <span>Invite people</span>
                          </button>
                          <button type="button" data-action="share-community-link" data-community="${circle.name}" class="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5">
                            <span>📢</span>
                            <span>Share community</span>
                          </button>
                          <button type="button" data-nav-mode="communities" class="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5">
                            <span>🧭</span>
                            <span>Browse spaces</span>
                          </button>
                        </div>
                      </div>
                    ` : streamPosts.map(renderPulsePostCard).join('')}
                  `
            }
          </div>

          <!-- RIGHT RAIL (4 Cols): ABOUT, RULES, GOVERNANCE, MODERATORS -->
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
                  <details class="group p-2.5 rounded-xl bg-surface-base border border-white/5 space-y-1" ${idx === 0 ? 'open' : ''}>
                    <summary class="btn-toggle-rule font-semibold text-xs text-slate-200 flex items-center justify-between cursor-pointer select-none" data-toggle-rule-circle="${circle.id}" data-rule-idx="${idx}">
                      <span class="truncate pr-2">${idx + 1}. ${escapeHtml(rule.title)}</span>
                      <span class="text-slate-500 text-[10px] group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <p class="text-[11px] text-slate-400 leading-relaxed pt-2 border-t border-white/5 mt-1">
                      ${escapeHtml(rule.description)}
                    </p>
                  </details>
                `).join('')}
              </div>
            </div>

            <!-- GOVERNANCE & TRANSPARENCY (PROGRESSIVE DISCLOSURE) -->
            <details class="group p-4 rounded-2xl bg-surface-raised border border-white/5 shadow-sm space-y-3">
              <summary class="flex items-center justify-between cursor-pointer select-none">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <span>🏛️</span>
                  <span>Governance & Details</span>
                </h3>
                <span class="text-slate-500 text-[10px] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div class="space-y-2 text-xs pt-2 border-t border-white/5">
                <div class="flex items-center justify-between p-2 rounded-xl bg-surface-base border border-white/5">
                  <span class="text-slate-400">Consensus Model</span>
                  <span class="text-slate-200 font-medium">Community Council</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded-xl bg-surface-base border border-white/5">
                  <span class="text-slate-400">Storage Policy</span>
                  <span class="text-slate-200 font-medium">Local & Relay Sync</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded-xl bg-surface-base border border-white/5">
                  <span class="text-slate-400">Zero Ad-Tracking</span>
                  <span class="text-emerald-400 font-medium">Client-Enforced</span>
                </div>
                <div class="pt-1">
                  <button
                    type="button"
                    data-action="open-mod-logs"
                    data-circle-id="${circle.id}"
                    class="w-full px-3 py-2 rounded-xl bg-surface-base hover:bg-surface-overlay border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer text-center flex items-center justify-center space-x-1.5"
                  >
                    <span>📜</span>
                    <span>View Audit Log</span>
                  </button>
                </div>
              </div>
            </details>

            ${isMod ? `
              <!-- MODERATOR TOOLS CARD -->
              <div class="p-4 rounded-2xl bg-[var(--color-accent,#e59b3c)]/10 border border-[var(--color-accent,#e59b3c)]/30 shadow-md space-y-3">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-accent,#e59b3c)] flex items-center space-x-1.5">
                    <span>🛡️</span>
                    <span>Mod Tools</span>
                  </h3>
                  <span class="text-[9px] font-mono px-2 py-0.5 rounded bg-[var(--color-accent,#e59b3c)]/20 text-[var(--color-accent,#e59b3c)] font-bold">AUTHORIZED</span>
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
                    <span class="text-[var(--color-accent,#e59b3c)]">${renderIcon('award', { size: 14 })}</span>
                    <span class="text-xs font-semibold text-[var(--color-accent,#e59b3c)] truncate max-w-[140px]">
                      Community Founder
                    </span>
                  </div>
                  <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-accent,#e59b3c)]/20 text-[var(--color-accent,#e59b3c)] font-bold">FOUNDER</span>
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
                          <button type="button" data-action="join-channel" data-channel="${other.channelId}" class="text-xs font-bold text-slate-200 hover:text-[var(--color-accent,#e59b3c)] truncate block text-left cursor-pointer">
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

  private _renderFeaturedLivingSpace(circle: SovereignCircle): string {
    const latestPost = clientStore.posts.find(p =>
      p.channelId === circle.channelId ||
      p.channelId === `c/${circle.name}` ||
      p.channelId === circle.name
    );

    return `
      <div class="living-space-featured mb-6 relative">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-start gap-4 min-w-0">
            <span class="w-14 h-14 rounded-2xl bg-surface-base border border-white/10 flex items-center justify-center text-3xl shrink-0 shadow-md">
              ${circle.icon ? escapeHtml(circle.icon) : renderIcon('users', { size: 28 })}
            </span>
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[var(--color-accent,#e89e38)]/15 text-[var(--color-accent,#e89e38)] border border-[var(--color-accent,#e89e38)]/30 uppercase">Featured Living Space</span>
                <span class="text-[10px] font-mono text-slate-400 uppercase tracking-wider">${escapeHtml(circle.category || 'General')}</span>
              </div>
              <h2 class="text-xl font-extrabold text-white truncate">
                <a href="${communityPath(circle.name)}" data-public-link class="hover:text-[var(--color-accent,#e89e38)] transition-colors">
                  ${escapeHtml(circle.displayName || circle.name)}
                </a>
                <span class="text-sm font-mono text-slate-400 font-normal ml-1.5">c/${escapeHtml(circle.name)}</span>
              </h2>
              <p class="text-xs text-slate-300 max-w-xl leading-relaxed line-clamp-2">${escapeHtml(circle.description)}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-end flex-wrap">
            <button type="button" data-action="toggle-join-circle" data-circle-id="${circle.id}" class="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${circle.isJoined ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-white text-slate-900 hover:bg-slate-200'}">
              ${circle.isJoined ? '✓ Joined Space' : '+ Join Space'}
            </button>
            <a href="${communityPath(circle.name)}" data-public-link class="min-h-[40px] px-4 py-2 rounded-xl bg-[var(--color-accent,#e89e38)] hover:brightness-105 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
              <span>Enter Space</span>
              <span>→</span>
            </a>
          </div>
        </div>

        <!-- ACTIVE CONVERSATION STRIP -->
        <div class="living-space-conversation-strip mt-4">
          <span class="living-space-pulse-dot" style="${latestPost ? '' : 'background: #64748b; box-shadow: none;'}"></span>
          <div class="min-w-0 flex-1 truncate text-xs">
            ${latestPost ? `
              <span class="text-slate-400">Active River: </span>
              <span class="text-slate-100 font-semibold">"${escapeHtml(latestPost.title || latestPost.content.slice(0, 60))}"</span>
              <span class="text-slate-400 text-[11px] ml-1">(${latestPost.replyCount || 0} replies)</span>
            ` : `
              <span class="text-slate-400 italic text-[11px]">Quiet right now · Start the first conversation in this space</span>
            `}
          </div>
          <button type="button" data-action="open-composer" data-channel="${circle.channelId}" class="text-[11px] text-[var(--color-accent,#e89e38)] hover:underline font-bold shrink-0">
            + Start discussion
          </button>
        </div>
      </div>
    `;
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
        <div class="discovery-directory-tools">
          <div class="discovery-segmented" role="group" aria-label="Community membership filter">
            <button type="button" data-action="filter-community-membership" data-membership="all" aria-pressed="${this.membershipFilter === 'all'}">Discover <span>${allCircles.length}</span></button>
            <button type="button" data-action="filter-community-membership" data-membership="joined" aria-pressed="${this.membershipFilter === 'joined'}">My communities <span>${joinedCount}</span></button>
          </div>
          <label class="discovery-search">${renderIcon('search', { size: 18 })}<input type="text" id="input-community-search" data-input="search-communities" aria-label="Search communities" placeholder="Find a community…" value="${escapeHtml(this.searchQuery)}" autocomplete="off" />${this.searchQuery ? `<button type="button" data-action="clear-community-search" aria-label="Clear community search">${renderIcon('close', { size: 17 })}</button>` : ''}</label>
        </div>
        <div class="discovery-category-list" role="group" aria-label="Community topics">${categories.map(category => `<button type="button" data-action="filter-community-category" data-category="${escapeHtml(category)}" aria-pressed="${this.activeCategory.toLowerCase() === category.toLowerCase()}">${category === 'all' ? 'All topics' : escapeHtml(category)}</button>`).join('')}</div>
        <div class="discovery-results-heading"><h2>${this.membershipFilter === 'joined' ? 'Your communities' : 'Find a conversation'}</h2><span role="status">${filtered.length} ${filtered.length === 1 ? 'community' : 'communities'}</span></div>
        ${filtered.length ? `
          <div class="living-spaces-editorial">
            ${(!isFiltering && filtered.length > 1) ? `
              ${this._renderFeaturedLivingSpace(filtered[0])}
              <div class="discovery-results-heading mt-6 mb-3">
                <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Emerging Living Spaces</h3>
                <span class="text-[11px] font-mono text-slate-500">${filtered.length - 1} spaces</span>
              </div>
              <div class="living-spaces-grid">${filtered.slice(1).map(renderDiscoveryCard).join('')}</div>
            ` : `
              <div class="living-spaces-grid">${filtered.map(renderDiscoveryCard).join('')}</div>
            `}
          </div>
        ` : `<div class="discovery-empty discovery-empty--roomy">${renderIcon('search', { size: 28 })}<strong>${this.membershipFilter === 'joined' && !joinedCount ? 'Your circle starts here' : 'No communities match these filters'}</strong><span>Try a different topic, broaden your search, or start a space of your own.</span>${isFiltering ? '<button type="button" data-action="reset-community-filters">Reset filters</button>' : ''}<button type="button" data-action="open-create-circle">Create a community</button></div>`}
      </div>
    </div>`;
  }
}
export const communityView = new CommunityView();
