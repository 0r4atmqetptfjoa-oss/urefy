/**
 * @file community-view.ts
 * @package @aetheris/client-ui
 * @description 2027 Sovereign 4-Pillar Community Workspace (Discuss, Live Relay, Knowledge Base, About/Rules).
 */

import { clientStore, ClientPost } from './client-state.js';
import { sovereignCircleEngine, SovereignCircle } from './sovereign-circle.js';
import { feedControlsEngine } from './feed-controls.js';
import { markdownRenderer } from './markdown-renderer.js';
import { renderPulseEmptyState } from './empty-states.js';
import { renderIcon } from './ui/icons.js';
import { renderPulsePostCard } from './feed-view.js';
import { communityCategories, filterCommunities } from './discovery-data.js';
import { getLatestCommunityPost, getPublicCommunityDescription, renderDiscoveryCard } from './discovery-card.js';
import { communityPath } from './public-urls.js';

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class CommunityView {
  public activePillar: 'discuss' | 'live' | 'knowledge' | 'about' = 'discuss';
  public searchQuery: string = '';
  public activeCategory: string = 'all';
  public membershipFilter: 'all' | 'joined' = 'all';

  public setActivePillar(pillar: 'discuss' | 'live' | 'knowledge' | 'about'): void {
    this.activePillar = pillar;
    clientStore.notify('COMMUNITY_PILLAR_CHANGED', pillar);
  }

  private _renderLiveRoom(circle: SovereignCircle): string {
    const messages = clientStore.messages.get(circle.channelId) || clientStore.messages.get('relays-general') || [];
    return `<div class="rounded-3xl bg-surface-base/85 backdrop-blur-2xl border border-white/10 p-5 space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-white/10">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <h3 class="text-sm font-bold text-white">Live E2EE Relay Room · #${escapeHtml(circle.name)}</h3>
        </div>
        <span class="text-xs font-mono text-emerald-300">${circle.onlineCount ?? 0} online</span>
      </div>
      <div class="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        ${
          messages.length > 0
            ? messages
                .slice(-15)
                .map(
                  (m) => `<div class="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs">
                    <div class="flex items-center justify-between font-mono text-[10px] text-cyan-400 mb-1">
                      <span>@${escapeHtml(m.authorFingerprint)}</span>
                      <span>${escapeHtml(m.epoch || '#412')}</span>
                    </div>
                    <div class="text-slate-200">${escapeHtml(m.text)}</div>
                  </div>`
                )
                .join('')
            : `<p class="text-xs text-slate-400 py-6 text-center">No live messages in this room yet. Start the conversation in Messages.</p>`
        }
      </div>
    </div>`;
  }

  private _renderKnowledgeBase(_circle: SovereignCircle, posts: ClientPost[]): string {
    const curated = posts.filter(
      (p) => p.flair === 'VERIFIED RELEASE' || p.flair === 'SECURITY ADVISORY' || p.meritVotes >= 50
    );
    if (curated.length === 0) {
      return `<div class="p-8 rounded-3xl bg-surface-base/75 border border-white/10 text-center text-xs text-slate-400">
        High-merit guides and verified releases from this community will automatically surface here.
      </div>`;
    }
    return `<div class="space-y-4">${curated.map((p) => renderPulsePostCard(p)).join('')}</div>`;
  }

  private _renderCommunityContextRailContent(
    circle: SovereignCircle,
    channelPosts: ClientPost[],
    isMod: boolean
  ): string {
    return `<div class="rounded-3xl bg-surface-base/80 backdrop-blur-2xl border border-white/10 p-5 space-y-4">
      <div>
        <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-300">About Community</h3>
        <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">${escapeHtml(
          getPublicCommunityDescription(circle.description)
        )}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-center">
        <div class="p-2.5 rounded-xl bg-white/[0.03]">
          <div class="text-sm font-extrabold text-white font-mono">${circle.membersCount.toLocaleString()}</div>
          <div class="text-[10px] text-slate-400 uppercase">Members</div>
        </div>
        <div class="p-2.5 rounded-xl bg-white/[0.03]">
          <div class="text-sm font-extrabold text-emerald-400 font-mono">${channelPosts.length}</div>
          <div class="text-[10px] text-slate-400 uppercase">Discussions</div>
        </div>
      </div>
      ${
        circle.rules && circle.rules.length > 0
          ? `<div class="pt-3 border-t border-white/10 space-y-2">
              <h4 class="text-xs font-bold text-white">Community Guidelines</h4>
              ${circle.rules
                .map(
                  (r, i) => `<div class="text-xs text-slate-300">
                    <span class="font-mono text-cyan-400">${i + 1}.</span> <strong>${escapeHtml(r.title)}</strong>
                  </div>`
                )
                .join('')}
            </div>`
          : ''
      }
      ${
        isMod
          ? `<div class="pt-3 border-t border-white/10">
              <button
                type="button"
                data-open-circle-mod="${escapeHtml(circle.id)}"
                class="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer"
              >🛡️ Moderator Settings</button>
            </div>`
          : ''
      }
    </div>`;
  }

  public renderCommunityWorkspace(circle: SovereignCircle): string {
    const allPosts = clientStore.posts || [];
    const channelPosts = allPosts.filter(
      (p) =>
        p.channelId === circle.channelId ||
        p.channelId === circle.id ||
        p.channelId === `c/${circle.name}` ||
        p.channelId === circle.name
    );

    const selectedFlair = sovereignCircleEngine.selectedFlair;
    const filteredPosts = selectedFlair
      ? channelPosts.filter((p) => p.flair === selectedFlair)
      : feedControlsEngine.filterAndSortPosts(channelPosts);

    const pinnedPost = circle.pinnedPostId
      ? filteredPosts.find((p) => p.id === circle.pinnedPostId)
      : undefined;
    const streamPosts = pinnedPost
      ? filteredPosts.filter((p) => p.id !== pinnedPost.id)
      : filteredPosts;

    const isMod = sovereignCircleEngine.isUserModerator(circle.id);

    const pillars: Array<{ id: 'discuss' | 'live' | 'knowledge' | 'about'; label: string; icon: string }> = [
      { id: 'discuss', label: `Discussions (${channelPosts.length})`, icon: 'message-square' },
      { id: 'live', label: 'Live Relay Room', icon: 'radio' },
      { id: 'knowledge', label: 'Knowledge Base', icon: 'vault' },
      { id: 'about', label: 'Rules & Governance', icon: 'shield' },
    ];

    return `<div id="community-workspace-${escapeHtml(circle.id)}" class="w-full h-full flex-1 min-h-0 overflow-y-auto max-w-4xl mx-auto space-y-5 px-3 sm:px-6 py-4 pb-32 scroll-smooth" style="-webkit-overflow-scrolling: touch; overscroll-behavior-y: contain;">
      <!-- 2027 Community Hero Header -->
      <header class="rounded-3xl overflow-hidden bg-surface-base/85 backdrop-blur-2xl border border-white/10 shadow-2xl">
        <div class="h-28 w-full bg-gradient-to-r from-cyan-900/50 via-indigo-950/60 to-emerald-900/50 relative">
          <div class="absolute -bottom-7 left-6 w-16 h-16 rounded-2xl bg-surface-raised border-2 border-[#08090d] flex items-center justify-center text-3xl shadow-xl">
            ${escapeHtml(circle.icon || '🌐')}
          </div>
          <div class="absolute top-3 right-4 flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-xs text-slate-300 border border-white/10 ${circle.onlineCount && circle.onlineCount > 0 ? 'flex' : 'hidden'} items-center space-x-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>${circle.onlineCount ?? 0} online</span>
            </span>
          </div>
        </div>
        <div class="pt-9 pb-5 px-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-extrabold text-white">${escapeHtml(
                  circle.displayName || circle.name
                )}</h1>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.06] text-cyan-300 border border-white/10">
                  c/${escapeHtml(circle.name)}
                </span>
              </div>
              <p class="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">${escapeHtml(
                getPublicCommunityDescription(circle.description)
              )}</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                data-action="toggle-join-circle"
                data-circle-id="${escapeHtml(circle.id)}"
                data-toggle-join-circle="${escapeHtml(circle.id)}"
                class="px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  circle.isJoined
                    ? 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_2px_14px_rgba(0,229,255,0.28)]'
                }"
              >${circle.isJoined ? 'Joined ✓' : 'Join Community'}</button>
            </div>
          </div>

          <div role="tablist" class="mt-5 flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-white/[0.07]">
            ${pillars
              .map((pil) => {
                const active = this.activePillar === pil.id;
                return `<button
                  type="button"
                  role="tab"
                  aria-selected="${active ? 'true' : 'false'}"
                  data-community-pillar="${pil.id}"
                  class="inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }"
                >
                  ${renderIcon(pil.icon, { size: 14, ariaHidden: true })}
                  <span>${escapeHtml(pil.label)}</span>
                </button>`;
              })
              .join('')}
          </div>
        </div>
      </header>

      ${
        this.activePillar === 'live'
          ? this._renderLiveRoom(circle)
          : this.activePillar === 'knowledge'
          ? this._renderKnowledgeBase(circle, channelPosts)
          : this.activePillar === 'about'
          ? this._renderCommunityContextRailContent(circle, channelPosts, isMod)
          : `<div class="space-y-4">
              ${
                pinnedPost
                  ? `<div class="relative">
                      <div class="mb-1 text-[11px] font-mono text-amber-300 flex items-center gap-1">📌 Pinned by Community Moderators</div>
                      ${renderPulsePostCard(pinnedPost)}
                    </div>`
                  : ''
              }
              ${
                streamPosts.length > 0
                  ? streamPosts.map((p) => renderPulsePostCard(p)).join('')
                  : renderPulseEmptyState({
                      title: `No discussions in c/${circle.name} yet`,
                      description: 'Be the first to share a post, question, or technical insight in this community.',
                    })
              }
            </div>`
      }
    </div>`;
  }

  public setSearchQuery(q: string): void {
    this.searchQuery = q;
  }

  public setActiveCategory(cat: string): void {
    this.activeCategory = cat;
  }

  private _renderFeaturedLivingSpace(circle: SovereignCircle): string {
    const latest = getLatestCommunityPost(circle);
    return `<article class="rounded-3xl bg-gradient-to-br from-cyan-500/10 via-surface-base/90 to-emerald-500/10 border border-cyan-500/25 p-5 shadow-xl">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-2xl">${escapeHtml(
            circle.icon
          )}</span>
          <div>
            <a href="${escapeHtml(communityPath(circle.name))}" class="text-base font-extrabold text-white hover:text-cyan-300">${escapeHtml(
      circle.displayName || circle.name
    )}</a>
            <div class="text-xs font-mono text-cyan-400">c/${escapeHtml(circle.name)} · ${circle.membersCount.toLocaleString()} members</div>
          </div>
        </div>
        <button
          type="button"
          data-action="toggle-join-circle"
          data-circle-id="${escapeHtml(circle.id)}"
          data-toggle-join-circle="${escapeHtml(circle.id)}"
          class="px-3.5 py-1.5 min-h-[36px] rounded-xl text-xs font-bold cursor-pointer ${
            circle.isJoined ? 'bg-white/10 text-white' : 'bg-cyan-500 text-slate-950'
          }"
        >${circle.isJoined ? 'Joined ✓' : 'Join'}</button>
      </div>
      <p class="text-xs text-slate-300 mt-3 leading-relaxed">${escapeHtml(
        getPublicCommunityDescription(circle.description)
      )}</p>
      ${
        latest
          ? `<div class="mt-3 pt-3 border-t border-white/10 text-xs text-slate-400 truncate">
              Latest: <strong class="text-slate-200">${escapeHtml(latest.title)}</strong>
            </div>`
          : ''
      }
    </article>`;
  }

  public renderCommunitiesHub(): string {
    const allCircles = sovereignCircleEngine.getAllCircles();
    const categories = communityCategories(allCircles);
    const filtered = filterCommunities(allCircles, this.searchQuery, this.activeCategory, 'all');
    const featured = filtered[0] || allCircles[0];

    return `<div id="communities-hub-workspace" class="w-full h-full flex-1 min-h-0 overflow-y-auto max-w-4xl mx-auto space-y-6 px-3 sm:px-6 py-4 pb-32 scroll-smooth" style="-webkit-overflow-scrolling: touch; overscroll-behavior-y: contain;">
      <header class="rounded-3xl bg-surface-base/85 backdrop-blur-2xl border border-white/10 p-6 shadow-2xl">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Sovereign Circles Directory
            </span>
            <h1 class="text-xl sm:text-2xl font-extrabold text-white mt-1">Communities</h1>
            <p class="text-xs text-slate-400 mt-0.5">Join topic-focused communities with independent moderation, live E2EE rooms, and shared vaults.</p>
          </div>
          <button
            type="button"
            id="btn-open-create-circle-modal"
            data-action="open-create-circle"
            data-open-create-circle="true"
            class="inline-flex items-center gap-1.5 px-4 py-2 min-h-[42px] rounded-xl bg-gradient-to-b from-cyan-400 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg cursor-pointer"
          >
            ${renderIcon('plus', { size: 15, ariaHidden: true })}
            <span>Create Community</span>
          </button>
        </div>

        <div class="mt-4 relative flex items-center">
          <span class="absolute left-3.5 text-slate-400 pointer-events-none">
            ${renderIcon('search', { size: 16, ariaHidden: true })}
          </span>
          <input
            id="communities-search-input"
            type="search"
            value="${escapeHtml(this.searchQuery)}"
            data-input-action="community.search"
            placeholder="Filter communities by name, topic, or technology..."
            aria-label="Filter communities"
            class="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-2xl bg-black/40 text-xs text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:border-cyan-400/60"
          />
        </div>

        <div class="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          ${categories
            .map((cat) => {
              const active = this.activeCategory === cat;
              return `<button
                type="button"
                data-action="select-community-category"
                data-category="${escapeHtml(cat)}"
                data-community-category="${escapeHtml(cat)}"
                class="px-3 py-1.5 min-h-[34px] rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white'
                }"
              >${escapeHtml(cat)}</button>`;
            })
            .join('')}
        </div>
      </header>

      ${featured && !this.searchQuery ? this._renderFeaturedLivingSpace(featured) : ''}

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${filtered.map((circle) => renderDiscoveryCard(circle)).join('')}
      </div>
    </div>`;
  }
}

export const communityView = new CommunityView();
