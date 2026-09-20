/** Consumer discovery and search surface backed only by real application data. */

import { ClientPost, clientStore } from './client-state.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { socialSafety } from './social-safety.js';
import { profileView } from './profile-view.js';
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

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCount(value: number, singular: string): string {
  return `${value.toLocaleString()} ${value === 1 ? singular : `${singular}s`}`;
}

export class ExploreView {
  public searchQuery = '';
  public activeCategory: ExploreCategory = 'all';
  public activeSubTab: 'pulses' | 'communities' = 'pulses';
  public activeSearchTab: 'posts' | 'people' | 'communities' | 'topics' = 'posts';
  public featuredStory: FeaturedStory | null = null;
  public trendingTopics: TrendingItem[] = [];

  public categories: Array<{ id: ExploreCategory; label: string; count: string }> = [
    { id: 'all', label: 'For you', count: '' },
    { id: 'trending', label: 'Trending', count: '' },
    { id: 'cryptography', label: 'Technology', count: '' },
    { id: 'privacy', label: 'Privacy', count: '' },
    { id: 'p2p', label: 'Communities', count: '' },
    { id: 'security', label: 'Safety', count: '' },
    { id: 'ai', label: 'AI', count: '' },
  ];

  public getRecentSearches(): string[] {
    try { return parseRecentSearches(localStorage.getItem('aetheris_recent_searches_v1')); } catch { return []; }
  }

  public saveRecentSearch(query: string): void {
    query = query.trim().slice(0, 200);
    if (!query) return;
    try {
      const next = [query, ...this.getRecentSearches().filter(item => item.toLowerCase() !== query.toLowerCase())].slice(0, 8);
      localStorage.setItem('aetheris_recent_searches_v1', JSON.stringify(next));
    } catch {}
  }

  public clearRecentSearches(): void {
    try { localStorage.removeItem('aetheris_recent_searches_v1'); } catch {}
  }

  public getComputedTrendingTopics(sourcePosts: ClientPost[] = clientStore.posts): TrendingItem[] {
    return collectTopics(sourcePosts.filter(post => !socialSafety.isBlocked(post.authorFingerprint))).map(({ topic, count }, index) => ({
      id: `trend-${index + 1}`, rank: index + 1, category: topic.startsWith('#') ? 'Topic' : 'Post type',
      topic, description: 'From available posts', postCount: formatCount(count, 'post'), numericPosts: count,
    }));
  }

  public setSearchQuery(query: string, remember = true): void {
    this.searchQuery = query;
    if (remember && query.trim()) this.saveRecentSearch(query.trim());
  }

  public setActiveCategory(category: ExploreCategory): void { this.activeCategory = category; this.activeSubTab = 'pulses'; }
  public setActiveSearchTab(tab: 'posts' | 'people' | 'communities' | 'topics'): void { this.activeSearchTab = tab; }
  public clearSearch(): void { this.searchQuery = ''; }

  public filterPosts(allPosts: ClientPost[]): ClientPost[] {
    let posts = allPosts.filter(post => !socialSafety.isBlocked(post.authorFingerprint));
    const query = this.searchQuery.trim().toLowerCase();
    if (query) posts = posts.filter(post => [post.title, post.content, post.authorFingerprint, post.flair, post.channelId].some(value => String(value || '').toLowerCase().includes(query)));
    if (this.activeCategory === 'trending') posts = [...posts].sort((a, b) => (b.meritVotes + b.replyCount) - (a.meritVotes + a.replyCount));
    if (this.activeCategory === 'cryptography') posts = posts.filter(post => /technology|code|software|crypto|zk|web/i.test(`${post.title} ${post.content} ${post.flair} ${post.channelId}`));
    if (this.activeCategory === 'privacy') posts = posts.filter(post => /privacy|private|identity|recovery|airgap|ghost|vault|forensic/i.test(`${post.title} ${post.content} ${post.flair} ${post.channelId}`));
    if (this.activeCategory === 'p2p') posts = posts.filter(post => /community|mesh|p2p|webrtc/i.test(`${post.title} ${post.content} ${post.flair} ${post.channelId}`));
    if (this.activeCategory === 'security') posts = posts.filter(post => /security|safe|moderation|verified/i.test(`${post.title} ${post.content} ${post.flair}`));
    if (this.activeCategory === 'ai') posts = posts.filter(post => /\bai\b|artificial intelligence|machine learning|neural/i.test(`${post.title} ${post.content}`));
    return posts;
  }

  private getPeople(posts: ClientPost[]): Array<{ fingerprint: string; posts: number }> {
    const counts = new Map<string, number>();
    for (const post of posts) {
      if (socialSafety.isBlocked(post.authorFingerprint) || post.authorFingerprint === clientStore.keypair.fingerprint) continue;
      counts.set(post.authorFingerprint, (counts.get(post.authorFingerprint) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([fingerprint, count]) => ({ fingerprint, posts: count }));
  }

  private renderPeople(posts: ClientPost[], matches = this.getPeople(posts)): string {
    const people = matches.slice(0, 6);
    if (!people.length) return '<div class="discovery-empty"><strong>No people to suggest yet</strong><span>Suggestions appear as public conversations arrive.</span></div>';
    return `<div class="people-grid">${people.map(person => {
      const profile = profileView.getProfile(person.fingerprint);
      const name = profile?.name || profile?.handle || 'UREfy Member';
      const handle = profile?.handle ? `@${profile.handle.replace(/^@/, '')}` : '@member';
      const following = profileView.isFollowing(person.fingerprint);
      return `<article class="person-card">${renderAvatar(profile?.avatar, person.fingerprint, { size: 48, className: 'w-12 h-12' })}<div><button type="button" data-author-profile="${escapeHtml(person.fingerprint)}">${escapeHtml(name)}</button><span>${escapeHtml(handle)}</span><small>${formatCount(person.posts, 'post')}</small></div><button type="button" data-action="toggle-follow" data-fingerprint="${escapeHtml(person.fingerprint)}" class="compact-follow-button" aria-pressed="${following}">${following ? 'Following' : 'Follow'}</button></article>`;
    }).join('')}</div>`;
  }

  private renderTopics(posts: ClientPost[]): string {
    const topics = this.getComputedTrendingTopics(posts);
    if (!topics.length) return '<div class="discovery-empty"><strong>No trending topics yet</strong><span>Topics are calculated from real public posts.</span></div>';
    return `<div class="topic-grid">${topics.map(topic => `<button type="button" class="topic-card btn-select-trend" data-search-trend="${escapeHtml(topic.topic)}"><span>${topic.rank}</span><div><strong>${escapeHtml(topic.topic)}</strong><small>${escapeHtml(topic.postCount)}</small></div>${renderIcon('externalLink', { size: 17 })}</button>`).join('')}</div>`;
  }

  public renderCommunitiesDirectory(): string {
    const query = this.searchQuery.trim().toLowerCase();
    const communities = sovereignCircleEngine.getAllCircles().filter(circle => !query || `${circle.name} ${circle.displayName} ${circle.description} ${circle.category}`.toLowerCase().includes(query));
    return `
      <section class="discovery-section">
        <div class="section-heading"><div><span>Communities</span><h2>Find your next conversation</h2></div><button type="button" data-action="open-create-circle">${renderIcon('plus', { size: 16 })}Create community</button></div>
        ${communities.length ? `<div class="discovery-space-grid">${communities.map(renderDiscoveryCard).join('')}</div>` : '<div class="discovery-empty"><strong>No communities found</strong><span>Try a broader search or create the first one.</span></div>'}
      </section>`;
  }

  private renderSearchResults(allPosts: ClientPost[]): string {
    const posts = this.filterPosts(allPosts);
    const people = this.getPeople(allPosts).filter(person => {
      const profile = profileView.getProfile(person.fingerprint);
      return `${profile?.name || ''} ${profile?.handle || ''} ${person.fingerprint}`.toLowerCase().includes(this.searchQuery.toLowerCase());
    });
    const communities = sovereignCircleEngine.getAllCircles().filter(circle => `${circle.name} ${circle.displayName} ${circle.description}`.toLowerCase().includes(this.searchQuery.toLowerCase()));
    const topics = this.getComputedTrendingTopics(allPosts).filter(topic => topic.topic.toLowerCase().includes(this.searchQuery.toLowerCase()));

    const counts = { posts: posts.length, people: people.length, communities: communities.length, topics: topics.length };
    return `
      <div class="search-result-tabs" role="tablist" aria-label="Search categories">${(['posts', 'people', 'communities', 'topics'] as const).map(tab => `<button type="button" role="tab" data-search-result-tab="${tab}" aria-selected="${this.activeSearchTab === tab}" class="${this.activeSearchTab === tab ? 'is-active' : ''}">${tab[0].toUpperCase() + tab.slice(1)}<span>${counts[tab]}</span></button>`).join('')}</div>
      ${this.activeSearchTab === 'posts' ? (posts.length ? `<div class="post-stream">${posts.map(renderPulsePostCard).join('')}</div>` : `<div class="discovery-empty"><strong>No posts found for “${escapeHtml(this.searchQuery)}”</strong><span class="sr-only">No pulses found matching "${escapeHtml(this.searchQuery)}"</span><span>Try another word, person, or community.</span><button type="button" id="btn-clear-explore-empty">Clear search</button></div>`) : ''}
      ${this.activeSearchTab === 'people' ? this.renderPeople(allPosts, people) : ''}
      ${this.activeSearchTab === 'communities' ? this.renderCommunitiesDirectory() : ''}
      ${this.activeSearchTab === 'topics' ? (topics.length ? `<div class="topic-grid">${topics.map(topic => `<button type="button" class="topic-card btn-select-trend" data-search-trend="${escapeHtml(topic.topic)}"><span>${topic.rank}</span><div><strong>${escapeHtml(topic.topic)}</strong><small>${escapeHtml(topic.postCount)}</small></div></button>`).join('')}</div>` : '<div class="discovery-empty"><strong>No matching topics</strong><span>Try another search.</span></div>') : ''}`;
  }

  public renderExploreView(allPosts: ClientPost[]): string {
    const filteredPosts = this.filterPosts(allPosts);
    const topCommunities = [...sovereignCircleEngine.getAllCircles()].sort((a, b) => (b.membersCount || 0) - (a.membersCount || 0)).slice(0, 4);
    const recentSearches = this.getRecentSearches();

    return `
      <div class="explore-workspace">
        <header class="view-header view-header--search">
          <div><h1>Explore</h1><p>Find people, communities and conversations.</p></div>
          <label class="explore-search">${renderIcon('search', { size: 19 })}<input type="search" id="explore-search-input" aria-label="Search UREfy" placeholder="Search UREfy" value="${escapeHtml(this.searchQuery)}" autocomplete="off" />${this.searchQuery ? `<button type="button" id="btn-clear-explore-search" aria-label="Clear search">${renderIcon('close', { size: 16 })}</button>` : ''}</label>
        </header>

        <div class="explore-category-bar" role="tablist" aria-label="Explore categories">
          ${this.categories.map(category => `<button type="button" data-explore-cat="${category.id}" role="tab" aria-selected="${this.activeSubTab === 'pulses' && this.activeCategory === category.id}" class="btn-explore-category ${this.activeSubTab === 'pulses' && this.activeCategory === category.id ? 'is-active' : ''}">${category.label}</button>`).join('')}
          <button type="button" role="tab" aria-selected="${this.activeSubTab === 'communities'}" data-action="set-explore-subtab" data-subtab="communities" class="${this.activeSubTab === 'communities' ? 'is-active' : ''}">All communities</button>
        </div>

        <div id="explore-feed-scroll" class="explore-scroll">
          ${this.searchQuery ? this.renderSearchResults(allPosts) : this.activeSubTab === 'communities' ? this.renderCommunitiesDirectory() : `
            ${this.activeCategory === 'all' ? `<nav class="discovery-wayfinding" aria-label="Discovery shortcuts"><span>People, ideas and conversations</span><button type="button" data-action="nav-mode" data-mode="communities">Browse communities ${renderIcon('chevronRight', { size: 16 })}</button></nav>` : ''}
            ${recentSearches.length ? `<section class="recent-searches"><span>Recent</span>${recentSearches.slice(0, 5).map(item => `<button type="button" class="btn-select-trend" data-search-trend="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}<button type="button" id="btn-clear-recent-searches">Clear</button></section>` : ''}
            <section class="discovery-section">
              <div class="section-heading">
                <div>
                  <span>Trending conversations</span>
                  <h2>${this.activeCategory === 'all' ? 'Ideas making connections' : escapeHtml(this.categories.find(category => category.id === this.activeCategory)?.label || 'Conversations')}</h2>
                </div>
              </div>
              ${this.renderTopics(filteredPosts)}
            </section>
            <section class="discovery-section">
              <div class="section-heading"><div><span>Communities</span><h2>Spaces to make your own</h2></div><button type="button" data-action="nav-mode" data-mode="communities">See all</button></div>
              <div class="discovery-space-grid">${topCommunities.map(renderDiscoveryCard).join('')}</div>
            </section>
            <section class="discovery-section"><div class="section-heading"><div><span>People</span><h2>Meet the minds behind the ideas</h2></div></div>${this.renderPeople(filteredPosts)}</section>
            <section class="discovery-section"><div class="section-heading"><div><span>Fresh discussions</span><h2>Join a conversation</h2></div></div>${filteredPosts.length ? `<div class="post-stream">${filteredPosts.slice(0, 3).map(renderPulsePostCard).join('')}</div>` : '<div class="discovery-empty"><strong>No public discussions yet</strong><span>New conversations will appear here as they are shared.</span></div>'}</section>
          `}
        </div>
      </div>`;
  }
}

export const exploreView = new ExploreView();
