/**
 * @file explore-view.ts
 * @package @aetheris/client-ui
 * @description 2027 Organic Desktop Bento Explore & Discovery Engine.
 */

import { ClientPost, clientStore } from './client-state.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { socialSafety } from './social-safety.js';
import { profileStore as profileView } from './profile/profile-store.js';
import { renderAvatar } from './ui/avatar-generator.js';
import { renderIcon } from './ui/icons.js';
import { renderPulsePostCard } from './feed-view.js';
import { collectTopics, parseRecentSearches } from './discovery-data.js';
import { renderDiscoveryCard } from './discovery-card.js';

export type ExploreCategory = 'all' | 'trending' | 'cryptography' | 'privacy' | 'p2p' | 'security' | 'ai';

export interface TrendingItem {
  id: string;
  rank: number;
  category: string;
  topic: string;
  description: string;
  postCount: string;
  numericPosts: number;
}

export interface FeaturedStory {
  title: string;
  category: string;
  coverImage: string;
  postCount: string;
  description: string;
  author: string;
  topic: string;
}

const RECENT_SEARCHES_KEY = 'urefy_recent_searches_v1';

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCount(value: number, singular: string): string {
  const plural = singular === 'community' ? 'communities' : `${singular}s`;
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

export class ExploreView {
  public searchQuery: string = '';
  public activeCategory: ExploreCategory = 'all';
  public activeSearchTab: 'posts' | 'people' | 'communities' | 'topics' = 'posts';
  public activeSubTab: 'pulses' | 'communities' = 'pulses';
  public categories: Array<{ id: ExploreCategory; label: string; emoji: string }> = [
    { id: 'all', label: 'All Signals', emoji: '🌐' },
    { id: 'trending', label: 'Trending', emoji: '🔥' },
    { id: 'cryptography', label: 'Cryptography & ZK', emoji: '🔐' },
    { id: 'privacy', label: 'Privacy', emoji: '🛡️' },
    { id: 'p2p', label: 'P2P & Mesh', emoji: '📡' },
    { id: 'security', label: 'SecOps', emoji: '⚡' },
    { id: 'ai', label: 'Local AI', emoji: '✨' },
  ];

  public getRecentSearches(): string[] {
    try {
      if (typeof localStorage !== 'undefined') {
        return parseRecentSearches(localStorage.getItem(RECENT_SEARCHES_KEY));
      }
    } catch {}
    return [];
  }

  public saveRecentSearch(query: string): void {
    const clean = query.trim();
    if (!clean || clean.length < 2) return;
    try {
      if (typeof localStorage !== 'undefined') {
        const current = this.getRecentSearches().filter((item) => item.toLowerCase() !== clean.toLowerCase());
        current.unshift(clean);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(current.slice(0, 8)));
      }
    } catch {}
  }

  public clearRecentSearches(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(RECENT_SEARCHES_KEY);
      }
    } catch {}
  }

  public getComputedTrendingTopics(sourcePosts: ClientPost[] = clientStore.posts): TrendingItem[] {
    const unblocked = sourcePosts.filter((post) => !socialSafety.isBlocked(post.authorFingerprint));
    const topics = collectTopics(unblocked);
    if (topics.length === 0) return [];

    return topics.slice(0, 8).map((item, idx) => {
      const topicStr = (item as any).tag || item.topic;
      const topicName = topicStr.startsWith('#') ? topicStr : `#${topicStr}`;
      return {
        id: `trend-${idx + 1}`,
        rank: idx + 1,
        category: (item as any).category || (topicStr.startsWith('#') ? 'Topic' : 'Sovereign Pulse'),
        topic: topicName,
        description: `Active discussions & verified insights around ${topicStr}`,
        postCount: formatCount(item.count, 'post'),
        numericPosts: item.count,
      };
    });
  }

  public setSearchQuery(query: string, remember = true): void {
    this.searchQuery = query;
    if (remember && query.trim().length >= 2) {
      this.saveRecentSearch(query);
    }
  }

  public selectTopic(topic: string): void {
    const normalized = topic.replace(/^#/, '');
    this.searchQuery = normalized;
    this.activeSearchTab = 'posts';
  }

  public setActiveCategory(category: ExploreCategory): void {
    this.activeCategory = category;
  }

  public setActiveSearchTab(tab: 'posts' | 'people' | 'communities' | 'topics'): void {
    this.activeSearchTab = tab;
  }

  public clearSearch(): void {
    this.searchQuery = '';
  }

  public filterPosts(allPosts: ClientPost[]): ClientPost[] {
    let posts = allPosts.filter(
      (post) => !socialSafety.isBlocked(post.authorFingerprint) && !socialSafety.isMuted(post.authorFingerprint)
    );
    const q = this.searchQuery.trim().toLowerCase();

    if (this.activeCategory === 'trending') {
      posts = [...posts].sort((a, b) => b.meritVotes + b.replyCount - (a.meritVotes + a.replyCount));
    } else if (this.activeCategory === 'cryptography') {
      posts = posts.filter((post) =>
        /technology|code|software|crypto|zk|web/i.test(`${post.title} ${post.content} ${post.flair} ${post.channelId}`)
      );
    } else if (this.activeCategory === 'privacy') {
      posts = posts.filter((post) =>
        /privacy|private|identity|recovery|airgap|ghost|vault|forensic/i.test(
          `${post.title} ${post.content} ${post.flair} ${post.channelId}`
        )
      );
    } else if (this.activeCategory === 'p2p') {
      posts = posts.filter((post) =>
        /community|mesh|p2p|webrtc/i.test(`${post.title} ${post.content} ${post.flair} ${post.channelId}`)
      );
    } else if (this.activeCategory === 'security') {
      posts = posts.filter((post) =>
        /security|safe|moderation|verified/i.test(`${post.title} ${post.content} ${post.flair}`)
      );
    } else if (this.activeCategory === 'ai') {
      posts = posts.filter((post) =>
        /\bai\b|artificial intelligence|machine learning|neural/i.test(`${post.title} ${post.content}`)
      );
    }

    if (!q) return posts;
    const cleanTag = q.replace(/^#/, '');
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.authorFingerprint.toLowerCase().includes(q) ||
        (post.authorDisplayName && post.authorDisplayName.toLowerCase().includes(q)) ||
        (post.authorHandle && post.authorHandle.toLowerCase().includes(q)) ||
        (post.flair && post.flair.toLowerCase().includes(q)) ||
        (cleanTag && (post.title.toLowerCase().includes(cleanTag) || post.content.toLowerCase().includes(cleanTag)))
    );
  }

  private getPeople(posts: ClientPost[]): Array<{
    fingerprint: string;
    name: string;
    handle: string;
    bio: string;
    avatar: string;
    role: string;
    postCount: number;
  }> {
    const map = new Map<
      string,
      {
        fingerprint: string;
        name: string;
        handle: string;
        bio: string;
        avatar: string;
        role: string;
        postCount: number;
      }
    >();

    for (const post of posts) {
      const fp = post.authorFingerprint;
      if (!fp || socialSafety.isBlocked(fp)) continue;
      const existing = map.get(fp);
      if (existing) {
        existing.postCount += 1;
      } else {
        const prof = profileView.getProfile(fp);
        map.set(fp, {
          fingerprint: fp,
          name: post.authorDisplayName || prof.name || fp.slice(0, 10),
          handle: post.authorHandle || prof.handle || fp.slice(0, 10),
          bio: prof.bio || 'Sovereign network participant',
          avatar: post.authorAvatarUrl || prof.avatar || '',
          role: post.authorRole || prof.role || 'MEMBER',
          postCount: 1,
        });
      }
    }

    const q = this.searchQuery.trim().toLowerCase();
    const list = Array.from(map.values());
    if (!q) return list.slice(0, 12);
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q) ||
        p.bio.toLowerCase().includes(q) ||
        p.fingerprint.toLowerCase().includes(q)
    );
  }

  private renderPeople(posts: ClientPost[], matches = this.getPeople(posts)): string {
    if (matches.length === 0) {
      return `<div class="p-6 rounded-2xl bg-surface-base/60 border border-white/10 text-center text-xs text-slate-400">No matching people found.</div>`;
    }

    return `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
      ${matches
        .map(
          (person) => `<div data-fingerprint="${escapeHtml(person.fingerprint)}" class="p-4 rounded-2xl bg-surface-base/85 backdrop-blur-xl border border-white/[0.08] hover:border-cyan-400/35 flex items-center justify-between gap-3 transition-all shadow-md">
            <div class="flex items-center gap-3 min-w-0">
              ${renderAvatar(person.avatar, person.fingerprint, { size: 42 })}
              <div class="min-w-0">
                <div class="text-sm font-bold text-white truncate">${escapeHtml(person.name)}</div>
                <div class="text-xs font-mono text-cyan-400 truncate">@${escapeHtml(person.handle)} · <span class="text-slate-400 font-normal">${person.postCount} ${person.postCount === 1 ? 'post' : 'posts'}</span></div>
                <div class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">${escapeHtml(person.bio)}</div>
              </div>
            </div>
            <button
              type="button"
              data-open-profile="${escapeHtml(person.fingerprint)}"
              class="px-3 py-1.5 min-h-[36px] rounded-xl bg-white/[0.06] hover:bg-cyan-500/20 text-xs font-semibold text-slate-200 hover:text-cyan-300 border border-white/10 shrink-0 cursor-pointer"
            >View</button>
          </div>`
        )
        .join('')}
    </div>`;
  }

  private renderTopics(posts: ClientPost[]): string {
    const trending = this.getComputedTrendingTopics(posts);
    const q = this.searchQuery.trim().toLowerCase();
    const filtered = q
      ? trending.filter(
          (t) =>
            t.topic.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q)
        )
      : trending;

    return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      ${filtered
        .map(
          (item) => `<button
            type="button"
            data-action="filter-by-topic"
            data-topic="${escapeHtml(item.topic)}"
            data-explore-topic="${escapeHtml(item.topic)}"
            class="text-left p-4 rounded-2xl bg-surface-base/85 backdrop-blur-xl border border-white/[0.08] hover:border-cyan-400/45 hover:bg-surface-raised/85 transition-all group cursor-pointer shadow-lg flex flex-col justify-between"
          >
            <div>
              <div class="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                <span>#${item.rank} · ${escapeHtml(item.category)}</span>
                <span class="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold">${escapeHtml(
                  item.postCount
                )}</span>
              </div>
              <div class="text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors">${escapeHtml(
                item.topic
              )}</div>
              <p class="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">${escapeHtml(
                item.description
              )}</p>
            </div>
            <div class="mt-3 pt-2 border-t border-white/[0.05] text-[11px] font-mono text-cyan-400 flex items-center justify-between">
              <span>Open stream</span>
              <span class="group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </button>`
        )
        .join('')}
    </div>`;
  }

  public renderCommunitiesDirectory(): string {
    const q = this.searchQuery.trim().toLowerCase();
    const circles = sovereignCircleEngine.getAllCircles().filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });

    if (circles.length === 0) {
      return `<div class="p-6 rounded-2xl bg-surface-base/60 border border-white/10 text-center text-xs text-slate-400">No communities match your filter.</div>`;
    }

    return `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      ${circles.map((circle) => renderDiscoveryCard(circle)).join('')}
    </div>`;
  }

  private renderSearchResults(allPosts: ClientPost[]): string {
    const matchingPosts = this.filterPosts(allPosts);
    const matchingPeople = this.getPeople(allPosts);
    const tabs: Array<{ id: 'posts' | 'people' | 'communities' | 'topics'; label: string }> = [
      { id: 'posts', label: `Discussions (${matchingPosts.length})` },
      { id: 'communities', label: 'Communities' },
      { id: 'people', label: `People (${matchingPeople.length})` },
      { id: 'topics', label: 'Topics' },
    ];

    return `<div class="space-y-5">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div role="tablist" class="flex items-center gap-1 p-1 rounded-2xl bg-surface-base/80 border border-white/10">
          ${tabs
            .map((tab) => {
              const active = this.activeSearchTab === tab.id;
              return `<button
                type="button"
                role="tab"
                aria-selected="${active ? 'true' : 'false'}"
                data-action="set-search-result-tab"
                data-search-result-tab="${tab.id}"
                data-explore-search-tab="${tab.id}"
                class="px-3.5 py-1.5 min-h-[36px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35'
                    : 'text-slate-400 hover:text-white'
                }"
              >${escapeHtml(tab.label)}</button>`;
            })
            .join('')}
        </div>
        ${
          this.searchQuery
            ? `<button
                type="button"
                id="btn-clear-explore-search"
                data-action="clear-explore-search"
                class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white cursor-pointer"
              >Clear filter "${escapeHtml(this.searchQuery)}" ✕</button>`
            : ''
        }
      </div>

      ${
        this.activeSearchTab === 'communities'
          ? this.renderCommunitiesDirectory()
          : this.activeSearchTab === 'people'
          ? this.renderPeople(allPosts, matchingPeople)
          : this.activeSearchTab === 'topics'
          ? this.renderTopics(allPosts)
          : matchingPosts.length > 0
          ? `<div class="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">${matchingPosts
              .map((p) => renderPulsePostCard(p))
              .join('')}</div>`
          : `<div class="p-8 rounded-3xl bg-surface-base/60 border border-white/10 text-center text-xs text-slate-400">
              No pulses found matching "${escapeHtml(this.searchQuery)}". Try another keyword or browse Communities.
              <div class="mt-3">
                <button type="button" id="btn-clear-explore-empty" data-action="exploreView.clearSearch()" class="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs cursor-pointer">Clear search</button>
              </div>
            </div>`
      }
    </div>`;
  }

  public renderExploreView(allPosts: ClientPost[]): string {
    const categories = this.categories;
    const filteredPosts = this.filterPosts(allPosts);

    return `<div id="explore-workspace" class="w-full h-full flex-1 overflow-y-auto max-w-6xl mx-auto space-y-6 pb-32 px-2 sm:px-4">
      <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e1424]/95 via-surface-base/90 to-[#0a131c]/95 backdrop-blur-2xl border border-white/10 p-6 shadow-2xl">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div class="max-w-2xl">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 mb-2">
              2027 Sovereign Discovery Radar
            </span>
            <h1 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Explore Communities, Proofs & Live Discussions</h1>
            <p class="text-xs text-slate-400 mt-1">Zero algorithmic manipulation. Ranked transparently by cryptographic merit and community activity.</p>
          </div>
        </div>

        <div class="mt-4 relative flex items-center">
          <span class="absolute left-4 text-slate-400 pointer-events-none">
            ${renderIcon('search', { size: 17, ariaHidden: true })}
          </span>
          <input
            id="explore-search-input"
            type="search"
            value="${escapeHtml(this.searchQuery)}"
            data-input-action="explore.search"
            placeholder="Search posts, @handles, #topics, or communities..."
            aria-label="Search across UREfy"
            class="w-full min-h-[46px] pl-11 pr-4 py-2.5 rounded-2xl bg-black/40 backdrop-blur-xl text-sm text-white placeholder-slate-500 border border-white/15 focus:outline-none focus:border-cyan-400/70 transition-all"
          />
        </div>

        <nav class="directional-pathway mt-4 p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2 text-xs overflow-x-auto select-none" aria-label="Discovery shortcuts">
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px]">1</span>
            <span class="text-white font-bold text-[11px]">Ideas</span>
          </div>
          <span class="text-slate-600 shrink-0">→</span>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="w-5 h-5 rounded-lg bg-surface-base text-slate-400 flex items-center justify-center font-bold text-[10px]">2</span>
            <span class="text-slate-300 font-medium text-[11px]">Discussions</span>
          </div>
          <span class="text-slate-600 shrink-0">→</span>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="w-5 h-5 rounded-lg bg-surface-base text-slate-400 flex items-center justify-center font-bold text-[10px]">3</span>
            <span class="text-slate-300 font-medium text-[11px]">People</span>
          </div>
          <span class="text-slate-600 shrink-0">→</span>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="w-5 h-5 rounded-lg bg-surface-base text-slate-400 flex items-center justify-center font-bold text-[10px]">4</span>
            <span class="text-slate-300 font-medium text-[11px]">Spaces</span>
          </div>
        </nav>

        <div class="mt-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          ${categories
            .map((cat) => {
              const active = this.activeCategory === cat.id;
              return `<button
                type="button"
                data-action="select-explore-category"
                data-explore-cat="${cat.id}"
                data-explore-category="${cat.id}"
                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                    : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/[0.06]'
                }"
              >
                <span>${cat.emoji}</span>
                <span>${escapeHtml(cat.label)}</span>
              </button>`;
            })
            .join('')}
        </div>
      </section>

      ${
        this.searchQuery.trim().length > 0
          ? this.renderSearchResults(allPosts)
          : `<div class="space-y-7">
              <section aria-labelledby="explore-trending-heading">
                <div class="flex items-center justify-between mb-3">
                  <h2 id="explore-trending-heading" class="text-xs font-extrabold uppercase tracking-wider text-slate-300">TRENDING TOPICS & SIGNALS</h2>
                </div>
                ${this.renderTopics(allPosts)}
              </section>

              <section aria-labelledby="explore-communities-heading">
                <div class="flex items-center justify-between mb-3">
                  <h2 id="explore-communities-heading" class="text-xs font-extrabold uppercase tracking-wider text-slate-300">ACTIVE SOVEREIGN COMMUNITIES</h2>
                </div>
                ${this.renderCommunitiesDirectory()}
              </section>

              <section aria-labelledby="explore-people-heading">
                <div class="flex items-center justify-between mb-3">
                  <h2 id="explore-people-heading" class="text-xs font-extrabold uppercase tracking-wider text-slate-300">NOTABLE CONTRIBUTORS</h2>
                </div>
                ${this.renderPeople(allPosts)}
              </section>

              <section aria-labelledby="explore-discussions-heading">
                <div class="flex items-center justify-between mb-3">
                  <h2 id="explore-discussions-heading" class="text-xs font-extrabold uppercase tracking-wider text-slate-300">RECENT PUBLIC DISCUSSIONS</h2>
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                  ${filteredPosts.slice(0, 14).map((post) => renderPulsePostCard(post)).join('')}
                </div>
              </section>
            </div>`
      }
    </div>`;
  }
}

export const exploreView = new ExploreView();
