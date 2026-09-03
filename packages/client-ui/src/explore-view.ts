/**
 * Explore & Trending Topics Hub (ExploreView).
 * Supports:
 * 1. Dedicated Search Omnibar with live query filtering for pulses, topics, authors, and hashtags.
 * 2. Category pills (Trending, Cryptography, Privacy, P2P Networks, Security, AI & Zero-Knowledge) with active pulse counts.
 * 3. Hero Featured Sovereign Story Card with high-res background, headline, and post statistics.
 * 4. Ranked Trending Topics list with rank numbers, descriptions, and trend metrics.
 * 5. Live filtered pulse chronicle feed.
 */

import { ClientPost } from './client-state.js';
import { obsidianMediaPlayer } from './media-player.js';
import { pulseActionsEngine } from './pulse-actions.js';
import { markdownRenderer } from './markdown-renderer.js';
import { nodeFederationEngine } from './node-federation.js';

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

export class ExploreView {
  public searchQuery: string = '';
  public activeCategory: ExploreCategory = 'all';

  public featuredStory: FeaturedStory = {
    title: 'Colossus Sovereign Mesh Supercluster scales to next-gen compute benchmarks',
    category: 'Artificial Intelligence · Trending',
    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
    postCount: '342.8K pulses',
    description: 'Decentralized GPU nodes achieve sub-10ms peer-to-peer tensor parallelism over encrypted WebRTC data channels.',
    author: 'genesis-core',
    topic: '#ColossusCluster',
  };

  public trendingTopics: TrendingItem[] = [
    {
      id: 'tr-1',
      rank: 1,
      category: 'Cryptography',
      topic: '#ZeroKnowledge',
      description: 'Groth16 & Plonk circuit recursion enabling instant client-side membership verification.',
      postCount: '184.2K pulses',
      numericPosts: 184200,
    },
    {
      id: 'tr-2',
      rank: 2,
      category: 'P2P Networks',
      topic: '#TreeKEM_MLS',
      description: 'RFC 9420 Messaging Layer Security ratchet scaling to 50,000 peer group channels.',
      postCount: '142.6K pulses',
      numericPosts: 142600,
    },
    {
      id: 'tr-3',
      rank: 3,
      category: 'Security',
      topic: '#ReverseEngineering',
      description: 'Dissecting proprietary telemetry blobs and verifying bit-exact ELF/PE builds.',
      postCount: '98.4K pulses',
      numericPosts: 98400,
    },
    {
      id: 'tr-4',
      rank: 4,
      category: 'Privacy',
      topic: '#AirGapGhost',
      description: 'RAM-only ephemeral relay execution leaving zero forensic trace on disk.',
      postCount: '76.1K pulses',
      numericPosts: 76100,
    },
    {
      id: 'tr-5',
      rank: 5,
      category: 'AI & Zero-Knowledge',
      topic: '#zkML_Inference',
      description: 'Verifiable on-device neural network execution with cryptographic integrity proofs.',
      postCount: '63.5K pulses',
      numericPosts: 63500,
    },
    {
      id: 'tr-6',
      rank: 6,
      category: 'P2P Networks',
      topic: '#BitTorrent_Merkle',
      description: 'Decentralized software distribution with multi-root SHA-256 validation.',
      postCount: '52.3K pulses',
      numericPosts: 52300,
    },
  ];

  public categories: Array<{ id: ExploreCategory; label: string; count: string }> = [
    { id: 'all', label: 'For You', count: '680K+' },
    { id: 'trending', label: 'Trending', count: '340K' },
    { id: 'cryptography', label: 'Cryptography', count: '184K' },
    { id: 'privacy', label: 'Privacy', count: '120K' },
    { id: 'p2p', label: 'P2P Networks', count: '98K' },
    { id: 'security', label: 'Security', count: '89K' },
    { id: 'ai', label: 'AI & ZK', count: '64K' },
  ];

  public setSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  public setActiveCategory(cat: ExploreCategory): void {
    this.activeCategory = cat;
  }

  public clearSearch(): void {
    this.searchQuery = '';
  }

  /**
   * Filter posts by search query and category.
   */
  public filterPosts(allPosts: ClientPost[]): ClientPost[] {
    let filtered = [...allPosts];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.authorFingerprint.toLowerCase().includes(q) ||
        p.flair.toLowerCase().includes(q) ||
        p.channelId.toLowerCase().includes(q)
      );
    }

    if (this.activeCategory !== 'all') {
      if (this.activeCategory === 'cryptography') {
        filtered = filtered.filter(p => p.content.toLowerCase().includes('zk') || p.title.toLowerCase().includes('zk') || p.content.toLowerCase().includes('crypto') || p.title.toLowerCase().includes('crypto') || p.flair === 'SECURITY ADVISORY');
      } else if (this.activeCategory === 'privacy') {
        filtered = filtered.filter(p => p.content.toLowerCase().includes('privacy') || p.title.toLowerCase().includes('privacy') || p.content.toLowerCase().includes('ghost') || p.title.toLowerCase().includes('ghost') || p.content.toLowerCase().includes('airgap') || p.title.toLowerCase().includes('airgap'));
      } else if (this.activeCategory === 'p2p') {
        filtered = filtered.filter(p => p.content.toLowerCase().includes('mesh') || p.title.toLowerCase().includes('mesh') || p.content.toLowerCase().includes('p2p') || p.title.toLowerCase().includes('p2p') || p.content.toLowerCase().includes('webrtc') || p.title.toLowerCase().includes('webrtc') || p.channelId.includes('mesh'));
      } else if (this.activeCategory === 'security') {
        filtered = filtered.filter(p => p.flair === 'SECURITY ADVISORY' || p.flair === 'VERIFIED RELEASE' || p.content.toLowerCase().includes('entropy') || p.title.toLowerCase().includes('security'));
      } else if (this.activeCategory === 'ai') {
        filtered = filtered.filter(p => p.content.toLowerCase().includes('ai') || p.title.toLowerCase().includes('ai') || p.content.toLowerCase().includes('neural') || p.title.toLowerCase().includes('neural') || p.content.toLowerCase().includes('inference') || p.title.toLowerCase().includes('inference'));
      }
    }

    return filtered;
  }

  /**
   * Renders the entire ExploreView HTML.
   */
  public renderExploreView(allPosts: ClientPost[]): string {
    const searchResults = this.filterPosts(allPosts);

    return `
      <div class="flex-1 flex flex-col overflow-hidden bg-canvas select-none">
        
        <!-- STICKY TOP EXPLORE & SEARCH HEADER -->
        <div class="sticky top-0 z-20 border-subtle-b bg-surface-base/95 backdrop-blur-xl shrink-0 shadow-sm">
          
          <!-- SEARCH OMNIBAR ROW -->
          <div class="px-4 md:px-6 py-3 flex items-center space-x-3">
            <div class="flex-1 flex items-center h-11 rounded-full bg-surface-raised px-4 border border-white/10 focus-within:border-indigo-500 focus-within:bg-black/60 transition-all shadow-inner">
              <svg class="w-4 h-4 text-slate-400 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input
                type="text"
                id="explore-search-input"
                placeholder="Search pulses, topics, cryptographic tags (#ZeroKnowledge), or author @id..."
                value="${this.searchQuery.replace(/"/g, '&quot;')}"
                class="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none font-sans"
              />
              ${this.searchQuery ? `
                <button id="btn-clear-explore-search" class="p-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 shrink-0 cursor-pointer" title="Clear Search">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              ` : ''}
            </div>

            <button type="button" id="btn-explore-refresh" class="p-2.5 rounded-full hover:bg-surface-raised text-slate-400 hover:text-white border border-white/5 transition-colors cursor-pointer" title="Refresh Feed">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
          </div>

          <!-- CATEGORIES NAVIGATION BAR (HORIZONTAL SCROLL) -->
          <div class="flex overflow-x-auto no-scrollbar border-t border-white/5 px-2 md:px-4">
            ${this.categories.map(cat => `
              <button
                type="button"
                data-explore-cat="${cat.id}"
                class="btn-explore-category flex-1 min-w-[105px] py-3 px-3 flex flex-col items-center justify-center hover:bg-surface-raised/50 transition-colors relative cursor-pointer group"
              >
                <div class="flex items-center space-x-1.5">
                  <span class="text-xs font-bold whitespace-nowrap ${this.activeCategory === cat.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}">
                    ${cat.label}
                  </span>
                  <span class="text-[9px] font-mono text-slate-500">(${cat.count})</span>
                </div>
                ${this.activeCategory === cat.id ? `
                  <div class="absolute bottom-0 h-1 w-12 rounded-full bg-indigo-500 shadow-sm"></div>
                ` : ''}
              </button>
            `).join('')}
          </div>

        </div>

        <!-- EXPLORE SCROLLABLE FEED -->
        <div id="explore-feed-scroll" class="flex-1 overflow-y-auto max-w-4xl mx-auto w-full p-3 sm:p-4 md:p-6 space-y-6 pb-20 md:pb-6">
          
          <!-- HERO FEATURED STORY CARD (IF NOT SEARCHING) -->
          ${!this.searchQuery ? `
            <div 
              data-featured-topic="${this.featuredStory.topic}" 
              class="btn-open-featured relative h-64 sm:h-72 rounded-3xl bg-surface-raised overflow-hidden cursor-pointer group border border-white/10 shadow-2xl transition-all hover:border-indigo-500/40"
            >
              <img
                src="${this.featuredStory.coverImage}"
                alt="${this.featuredStory.title}"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                loading="lazy"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent p-6 md:p-8 flex flex-col justify-end">
                <div class="flex items-center space-x-2">
                  <span class="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-500/30">
                    ${this.featuredStory.category}
                  </span>
                  <span class="text-[10px] font-mono text-slate-400">By @id:${this.featuredStory.author}</span>
                </div>

                <h2 class="text-lg md:text-2xl font-extrabold text-white mt-2 leading-tight group-hover:text-indigo-200 transition-colors">
                  ${this.featuredStory.title}
                </h2>
                
                <p class="text-xs text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                  ${this.featuredStory.description}
                </p>

                <div class="flex items-center space-x-3 text-xs font-mono text-slate-400 mt-3 pt-2 border-t border-white/10">
                  <span class="text-emerald-400 font-bold">${this.featuredStory.postCount}</span>
                  <span>·</span>
                  <span class="text-indigo-400 font-bold">${this.featuredStory.topic}</span>
                  <span>·</span>
                  <span>Live Stream Active</span>
                </div>
              </div>
            </div>
          ` : ''}
          
          <!-- SOVEREIGN FEDERATED MESH WIDGET -->
          ${!this.searchQuery ? nodeFederationEngine.renderFederatedMeshCard() : ''}

          <!-- TRENDING TOPICS LIST (IF NOT SEARCHING) -->
          ${!this.searchQuery ? `
            <section class="rounded-3xl bg-surface-raised border border-white/5 p-5 shadow-lg space-y-4">
              <div class="flex items-center justify-between border-b border-white/5 pb-3">
                <div class="flex items-center space-x-2">
                  <span class="text-base">🔥</span>
                  <h3 class="text-xs font-bold text-white uppercase tracking-wider">Trends in Sovereign Mesh</h3>
                </div>
                <span class="text-[10px] font-mono text-slate-500">Algorithm-Free • Pure Frequency</span>
              </div>

              <div class="divide-y divide-white/5">
                ${this.trendingTopics.map(t => `
                  <div
                    data-search-trend="${t.topic}"
                    class="btn-select-trend py-3.5 hover:bg-surface-overlay/60 px-3 rounded-2xl transition-all cursor-pointer flex justify-between items-center group"
                  >
                    <div class="flex flex-col space-y-0.5 min-w-0 pr-4">
                      <span class="text-[10px] font-mono text-slate-500">
                        ${t.rank} · ${t.category}
                      </span>
                      <span class="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                        ${t.topic}
                      </span>
                      <p class="text-xs text-slate-400 line-clamp-1 leading-snug">
                        ${t.description}
                      </p>
                      <span class="text-[10px] font-mono text-slate-500 pt-0.5">${t.postCount}</span>
                    </div>

                    <div class="flex items-center space-x-2 shrink-0">
                      <span class="text-xs text-slate-400 group-hover:text-indigo-400 transition-colors font-bold">Explore</span>
                      <svg class="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                `).join('')}
              </div>
            </section>
          ` : ''}

          <!-- PULSES SEARCH RESULTS OR STREAM -->
          <section class="space-y-4">
            <div class="flex items-center justify-between px-1">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">
                ${this.searchQuery ? `Search Results for "${this.searchQuery}" (${searchResults.length})` : 'Active Pulse Chronicle'}
              </h3>
              <span class="text-[10px] font-mono text-slate-500">ZK-Verified Nodes</span>
            </div>

            ${searchResults.length === 0 ? `
              <div class="p-12 rounded-3xl bg-surface-raised border border-white/5 text-center text-slate-500 space-y-2">
                <span class="text-3xl block">🔍</span>
                <p class="text-sm font-bold text-slate-200">No pulses found matching "${this.searchQuery}"</p>
                <p class="text-xs">Try searching for other topics, cryptographic keywords (#ZeroKnowledge), or author fingerprints.</p>
                <button id="btn-clear-explore-empty" class="mt-3 px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer">
                  Clear Search Filter
                </button>
              </div>
            ` : searchResults.map(p => this.renderPulseCard(p)).join('')}
          </section>

        </div>

      </div>
    `;
  }

  private renderPulseCard(p: ClientPost): string {
    const time = new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <article class="p-5 rounded-3xl bg-surface-raised border border-white/5 hover:border-white/15 transition-all shadow-md space-y-3 group select-text">
        <!-- HEADER ROW -->
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center space-x-2 flex-wrap">
            <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 flex items-center justify-center font-mono text-[9px] font-bold text-white shrink-0">
              ${p.authorFingerprint.substring(0, 2).toUpperCase()}
            </div>
            <span class="font-mono font-bold text-slate-200">@id:${p.authorFingerprint.substring(0, 8)}</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">${p.authorRole}</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/20">ZK-Verified</span>
          </div>
          <span class="text-[10px] font-mono text-slate-500">${time}</span>
        </div>

        <!-- POST TITLE IF ANY -->
        ${p.title && p.title !== p.content.substring(0, 50) ? `
          <h4 data-open-detail="${p.id}" class="btn-open-detail text-sm font-bold text-white hover:text-indigo-400 transition-colors cursor-pointer leading-snug">
            ${p.title}
          </h4>
        ` : ''}

        <!-- POST CONTENT -->
        <div class="text-xs text-slate-300 leading-relaxed">
          ${markdownRenderer.renderMarkdown(p.content)}
        </div>

        <!-- MULTIMEDIA & MEDIA LIGHTBOX INTEGRATION -->
        ${p.video ? obsidianMediaPlayer.renderVideoCard(p.id, p.video.src, p.video.poster) : ''}
        ${p.images && p.images.length > 0 ? obsidianMediaPlayer.renderImageMosaic(p.images) : ''}

        <!-- ACTIONS BAR -->
        ${pulseActionsEngine.renderPulseActionBar(p.id, p.replyCount)}
      </article>
    `;
  }
}

export const exploreView = new ExploreView();
