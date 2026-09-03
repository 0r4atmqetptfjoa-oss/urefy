/**
 * AETHERIS OMNI-SPHERE — KNOWLEDGE SERIES & CURATED COLLECTIONS ENGINE
 *
 * Self-contained technical series and curriculum system designed for sovereign peer nodes.
 * Empowers curators to organize multi-part deep dives, cryptographic specifications,
 * reverse-engineering guides, and binary hygiene audits into structured pedagogical tracks.
 */

export interface SeriesItem {
  id: string;
  title: string;
  summary: string;
  emoji: string;
  curatorFingerprint: string;
  curatorRole: string;
  postIds: string[];
  tags: string[];
  createdAt: number;
  subscribersCount: number;
  isSubscribed?: boolean;
}

export interface SeriesEpisodeMeta {
  postId: string;
  title: string;
  authorFingerprint: string;
  authorRole: string;
  flair: string;
  estimatedReadTimeMinutes: number;
  difficulty?: 'Foundational' | 'Intermediate' | 'Advanced' | 'Hardcore';
}

export interface ReadingProgress {
  completed: number;
  total: number;
  percentage: number;
}

export class CollectionsEngine {
  public collections: SeriesItem[] = [];
  public activeSeriesId: string | null = null;
  public selectedCategory: string = 'All';
  public searchQuery: string = '';
  public activeDropdownPostId: string | null = null;
  public readPostIds: Set<string> = new Set();

  /**
   * Fallback metadata catalog for seeded episodes ensuring comprehensive rendering
   * even when isolated from the global live message feed.
   */
  private fallbackCatalog: Record<string, SeriesEpisodeMeta> = {
    'post-1': {
      postId: 'post-1',
      title: 'Aetheris Cryptographic Micro-Kernel v1.0.0 (Verified x86_64 Release)',
      authorFingerprint: 'c3dc28cb705e',
      authorRole: 'ARCHIVIST',
      flair: 'VERIFIED RELEASE',
      estimatedReadTimeMinutes: 12,
      difficulty: 'Hardcore',
    },
    'post-2': {
      postId: 'post-2',
      title: 'Deep-Dive: How ZK-RLN Eradicates Bots without Selling Your Identity to Third-Party KYC',
      authorFingerprint: 'a89104fa2211',
      authorRole: 'MODERATOR',
      flair: 'SECURITY ADVISORY',
      estimatedReadTimeMinutes: 14,
      difficulty: 'Advanced',
    },
    'post-images': {
      postId: 'post-images',
      title: 'Reverse Engineering: Visual Section Analysis of Obfuscated Malware vs Aetheris Clean Builds',
      authorFingerprint: 'f40019bc88a2',
      authorRole: 'MEMBER',
      flair: 'TECH DISCUSSION',
      estimatedReadTimeMinutes: 10,
      difficulty: 'Intermediate',
    },
    'post-video': {
      postId: 'post-video',
      title: 'Live Demo: 120 FPS Zero-Copy PipeWire & Desktop Duplication Streaming on Ultrawide 32:9',
      authorFingerprint: 'genesis-core',
      authorRole: 'GUARDIAN',
      flair: 'TECH DISCUSSION',
      estimatedReadTimeMinutes: 8,
      difficulty: 'Intermediate',
    },
    'zk-series-2': {
      postId: 'zk-series-2',
      title: 'Arithmetic Circuit Synthesis: From R1CS Constraints to QAP Polynomials in Rust & WASM',
      authorFingerprint: 'genesis-core',
      authorRole: 'GUARDIAN',
      flair: 'TECH DISCUSSION',
      estimatedReadTimeMinutes: 18,
      difficulty: 'Advanced',
    },
    'zk-series-3': {
      postId: 'zk-series-3',
      title: 'Groth16 vs PLONK vs Halo2: Zero-Knowledge Prover Benchmarks under Constrained Memory',
      authorFingerprint: 'c3dc28cb705e',
      authorRole: 'ARCHIVIST',
      flair: 'TECH DISCUSSION',
      estimatedReadTimeMinutes: 15,
      difficulty: 'Advanced',
    },
    'zk-series-4': {
      postId: 'zk-series-4',
      title: 'Shamir Secret Sharing & Ephemeral Nullifier Slashing: Mathematical Guarantees of RLN',
      authorFingerprint: 'a89104fa2211',
      authorRole: 'MODERATOR',
      flair: 'SECURITY ADVISORY',
      estimatedReadTimeMinutes: 16,
      difficulty: 'Hardcore',
    },
    'zk-series-5': {
      postId: 'zk-series-5',
      title: 'Recursive SNARK Verification over Ephemeral WebAssembly Runtimes in Browser Nodes',
      authorFingerprint: 'genesis-core',
      authorRole: 'GUARDIAN',
      flair: 'TECH DISCUSSION',
      estimatedReadTimeMinutes: 22,
      difficulty: 'Hardcore',
    },
    'rev-series-3': {
      postId: 'rev-series-3',
      title: 'PE32 & ELF Header Sanitization: Stripping Rich Headers & Debug Artifacts for Zero Watermarking',
      authorFingerprint: 'c3dc28cb705e',
      authorRole: 'ARCHIVIST',
      flair: 'VERIFIED RELEASE',
      estimatedReadTimeMinutes: 11,
      difficulty: 'Advanced',
    },
    'rev-series-4': {
      postId: 'rev-series-4',
      title: 'Shannon Entropy Threshold Heuristics: Detecting Packed Themida & VMProtect Staged Payloads',
      authorFingerprint: 'f40019bc88a2',
      authorRole: 'MEMBER',
      flair: 'SECURITY ADVISORY',
      estimatedReadTimeMinutes: 13,
      difficulty: 'Intermediate',
    },
    'p2p-series-2': {
      postId: 'p2p-series-2',
      title: 'Decentralized Kademlia DHT Routing without Central Bootstrap Oracles in Restricted NATs',
      authorFingerprint: 'a89104fa2211',
      authorRole: 'MODERATOR',
      flair: 'TECH DISCUSSION',
      estimatedReadTimeMinutes: 14,
      difficulty: 'Intermediate',
    },
    'p2p-series-3': {
      postId: 'p2p-series-3',
      title: 'BitTorrent Swarm Merkle Proofs & Piece-Level Cryptographic Integrity Verification',
      authorFingerprint: 'genesis-core',
      authorRole: 'GUARDIAN',
      flair: 'VERIFIED RELEASE',
      estimatedReadTimeMinutes: 17,
      difficulty: 'Advanced',
    },
    'pq-series-1': {
      postId: 'pq-series-1',
      title: 'Lattice Cryptography Primer: Kyber-1024 & Dilithium-5 for Post-Quantum Sovereign Identity',
      authorFingerprint: 'genesis-core',
      authorRole: 'GUARDIAN',
      flair: 'SECURITY ADVISORY',
      estimatedReadTimeMinutes: 19,
      difficulty: 'Hardcore',
    },
    'pq-series-2': {
      postId: 'pq-series-2',
      title: 'Hybrid Ed25519 + ML-KEM Key Encapsulation: Backward Compatibility in Mesh Handshakes',
      authorFingerprint: 'c3dc28cb705e',
      authorRole: 'ARCHIVIST',
      flair: 'TECH DISCUSSION',
      estimatedReadTimeMinutes: 15,
      difficulty: 'Advanced',
    },
  };

  constructor() {
    this.seedInitialCollections();
    this.loadPersistedProgress();
  }

  /**
   * Initializes the engine with prestigious, mathematically rigorous knowledge series.
   */
  private seedInitialCollections(): void {
    this.collections = [
      {
        id: 'series-zk-masterclass',
        title: 'Zero-Knowledge Cryptography Masterclass',
        summary: 'Comprehensive 5-part curriculum covering R1CS arithmetic circuits, Groth16/PLONK prover mechanics, ZK-RLN rate-limiting nullifier economics, and recursive SNARKs executed natively in browser WebAssembly.',
        emoji: '🔐',
        curatorFingerprint: 'genesis-core',
        curatorRole: 'GUARDIAN',
        postIds: ['post-2', 'zk-series-2', 'zk-series-3', 'zk-series-4', 'zk-series-5'],
        tags: ['Cryptography', 'Zero-Knowledge', 'ZK-RLN', 'WASM', 'Math'],
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
        subscribersCount: 428,
        isSubscribed: true,
      },
      {
        id: 'series-reversing-hygiene',
        title: 'Reverse Engineering & Binary Hygiene',
        summary: 'Deconstructing modern PE32/ELF binaries, PE header sanitization, byte-level Shannon entropy visualization, anti-debugger evasion heuristics, and zero-telemetry reproducible compiler verification.',
        emoji: '⚙️',
        curatorFingerprint: 'c3dc28cb705e',
        curatorRole: 'ARCHIVIST',
        postIds: ['post-1', 'post-images', 'rev-series-3', 'rev-series-4'],
        tags: ['Reverse Engineering', 'Binary Hygiene', 'Vault', 'Malware Analysis', 'Security'],
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
        subscribersCount: 312,
        isSubscribed: false,
      },
      {
        id: 'series-p2p-infra',
        title: 'Sovereign P2P Infrastructure',
        summary: 'Architecting resilient peer-to-peer topologies without centralized rendezvous servers. Covers Kademlia DHT routing, WebRTC zero-copy data channels, BitTorrent Swarm Merkle trees, and NAT traversal.',
        emoji: '🌐',
        curatorFingerprint: 'a89104fa2211',
        curatorRole: 'MODERATOR',
        postIds: ['post-video', 'p2p-series-2', 'p2p-series-3'],
        tags: ['P2P', 'WebRTC', 'BitTorrent', 'Distributed Systems', 'Mesh'],
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
        subscribersCount: 256,
        isSubscribed: false,
      },
      {
        id: 'series-post-quantum',
        title: 'Post-Quantum Sovereign Cryptography',
        summary: 'Transitioning sovereign mesh networks to Module-Lattice-based key encapsulation mechanisms (ML-KEM) and stateless hash signatures against harvest-now-decrypt-later adversaries.',
        emoji: '🛡️',
        curatorFingerprint: 'genesis-core',
        curatorRole: 'GUARDIAN',
        postIds: ['pq-series-1', 'pq-series-2'],
        tags: ['Post-Quantum', 'Lattice', 'Kyber', 'Dilithium', 'Security'],
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 25,
        subscribersCount: 189,
        isSubscribed: true,
      },
    ];

    // Seed default read markers for realistic progress visualization
    this.readPostIds.add('post-2');
    this.readPostIds.add('zk-series-2');
    this.readPostIds.add('post-1');
  }

  private loadPersistedProgress(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('aetheris_read_posts');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach((id: string) => this.readPostIds.add(id));
          }
        }
        const savedSubs = localStorage.getItem('aetheris_series_subs');
        if (savedSubs) {
          const subs: string[] = JSON.parse(savedSubs);
          this.collections.forEach(c => {
            c.isSubscribed = subs.includes(c.id);
          });
        }
      }
    } catch {
      // Graceful fallback for non-browser or sandbox environments
    }
  }

  private persistProgress(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aetheris_read_posts', JSON.stringify(Array.from(this.readPostIds)));
        const subs = this.collections.filter(c => c.isSubscribed).map(c => c.id);
        localStorage.setItem('aetheris_series_subs', JSON.stringify(subs));
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Creates a new knowledge collection / series.
   */
  public createCollection(
    title: string,
    summary: string,
    emoji: string,
    curatorFP: string,
    curatorRole: string,
    tags: string[]
  ): string {
    const cleanTitle = title.trim() || 'Untitled Knowledge Series';
    const cleanSummary = summary.trim() || 'Curated technical series on sovereign computing.';
    const cleanEmoji = emoji.trim() || '📚';
    const id = `series-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newSeries: SeriesItem = {
      id,
      title: cleanTitle,
      summary: cleanSummary,
      emoji: cleanEmoji,
      curatorFingerprint: curatorFP,
      curatorRole: curatorRole,
      postIds: [],
      tags: tags.length > 0 ? tags : ['Technical', 'Curated'],
      createdAt: Date.now(),
      subscribersCount: 1,
      isSubscribed: true,
    };

    this.collections.unshift(newSeries);
    this.persistProgress();
    return id;
  }

  /**
   * Adds a post to an existing collection if not already included.
   */
  public addPostToCollection(collectionId: string, postId: string): boolean {
    const series = this.collections.find(c => c.id === collectionId);
    if (!series) return false;
    if (series.postIds.includes(postId)) return false;

    series.postIds.push(postId);
    this.persistProgress();
    return true;
  }

  /**
   * Removes a post from a collection.
   */
  public removePostFromCollection(collectionId: string, postId: string): boolean {
    const series = this.collections.find(c => c.id === collectionId);
    if (!series) return false;
    const index = series.postIds.indexOf(postId);
    if (index === -1) return false;

    series.postIds.splice(index, 1);
    this.persistProgress();
    return true;
  }

  /**
   * Toggles the user subscription status for a technical series.
   */
  public toggleSubscribe(collectionId: string): void {
    const series = this.collections.find(c => c.id === collectionId);
    if (!series) return;

    series.isSubscribed = !series.isSubscribed;
    if (series.isSubscribed) {
      series.subscribersCount += 1;
    } else {
      series.subscribersCount = Math.max(0, series.subscribersCount - 1);
    }

    this.persistProgress();
  }

  /**
   * Marks a post as read or unread for progress tracking.
   */
  public togglePostRead(postId: string): void {
    if (this.readPostIds.has(postId)) {
      this.readPostIds.delete(postId);
    } else {
      this.readPostIds.add(postId);
    }
    this.persistProgress();
  }

  public isPostRead(postId: string): boolean {
    return this.readPostIds.has(postId);
  }

  /**
   * Returns all series that contain the specified post ID.
   */
  public getCollectionsForPost(postId: string): SeriesItem[] {
    return this.collections.filter(c => c.postIds.includes(postId));
  }

  /**
   * Retrieves a series by ID.
   */
  public getCollectionById(seriesId: string): SeriesItem | undefined {
    return this.collections.find(c => c.id === seriesId);
  }

  /**
   * Computes reading progress metrics for a given series.
   */
  public getReadingProgress(seriesId: string): ReadingProgress {
    const series = this.getCollectionById(seriesId);
    if (!series || series.postIds.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const total = series.postIds.length;
    let completed = 0;
    for (const pId of series.postIds) {
      if (this.readPostIds.has(pId)) {
        completed++;
      }
    }

    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
  }

  /**
   * Sets the active series for modal inspection.
   */
  public setActiveSeries(seriesId: string | null): void {
    this.activeSeriesId = seriesId;
  }

  /**
   * Filters directory by category tag.
   */
  public setCategoryFilter(category: string): void {
    this.selectedCategory = category;
  }

  /**
   * Sets directory search query.
   */
  public setSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  /**
   * Toggles dropdown open state for a given post.
   */
  public toggleDropdown(postId: string | null): void {
    this.activeDropdownPostId = this.activeDropdownPostId === postId ? null : postId;
  }

  /**
   * Helper to escape HTML characters.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Renders the stylish series badge banner embedded directly inside a post card.
   * e.g. "📚 Part 2 of 5 · Zero-Knowledge Cryptography Masterclass"
   */
  public renderCollectionBadge(postId: string): string {
    const seriesList = this.getCollectionsForPost(postId);
    if (seriesList.length === 0) {
      return '';
    }

    return `
      <div class="flex flex-wrap items-center gap-2 my-2.5">
        ${seriesList
          .map(series => {
            const partIndex = series.postIds.indexOf(postId) + 1;
            const totalParts = series.postIds.length;
            const isRead = this.isPostRead(postId);

            return `
              <div class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-surface-raised/90 hover:bg-surface-overlay border border-cyphr/30 hover:border-cyphr transition-all group shadow-sm">
                <span class="text-sm">${series.emoji}</span>
                <div class="flex items-center space-x-1.5 text-xs font-mono">
                  <span class="font-bold text-cyphr">Part ${partIndex}/${totalParts}</span>
                  <span class="text-slate-500">•</span>
                  <button data-action="open-series-modal" data-series-id="${series.id}" class="btn-open-series font-sans font-medium text-slate-200 group-hover:text-cyphr transition-colors hover:underline text-left truncate max-w-[240px] md:max-w-[320px]">
                    ${this.escapeHtml(series.title)}
                  </button>
                </div>
                ${
                  isRead
                    ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-signal/20 text-signal border border-signal/30 font-mono font-semibold">✓ Completed</span>`
                    : `<span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-base text-slate-400 border border-white/10 font-mono">Unread</span>`
                }
                <button data-action="open-series-modal" data-series-id="${series.id}" title="Inspect full series syllabus" class="btn-open-series text-slate-400 group-hover:text-cyphr transition-transform group-hover:translate-x-0.5 ml-1">
                  →
                </button>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  /**
   * Renders the interactive "+ Series" button and dropdown selector on a post.
   */
  public renderAddToCollectionButton(postId: string, userFP: string = 'genesis-core'): string {
    const isDropdownOpen = this.activeDropdownPostId === postId;
    const collectionsWithPost = this.getCollectionsForPost(postId).map(c => c.id);

    return `
      <div class="relative inline-block text-left">
        <button
          data-action="toggle-series-dropdown"
          data-post-id="${postId}"
          class="btn-toggle-series-dropdown inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-mono font-medium transition-all ${
            collectionsWithPost.length > 0
              ? 'bg-cyphr/10 text-cyphr border border-cyphr/30 hover:bg-cyphr/20'
              : 'bg-surface-raised text-slate-400 hover:text-slate-200 hover:bg-surface-overlay border border-white/5'
          }"
          title="Add or manage in Knowledge Series"
        >
          <span>📚</span>
          <span>${collectionsWithPost.length > 0 ? `Series (${collectionsWithPost.length})` : '+ Series'}</span>
          <span class="text-[9px] opacity-60">▼</span>
        </button>

        ${
          isDropdownOpen
            ? `
          <div class="absolute right-0 mt-2 w-72 rounded-xl bg-surface-raised border border-white/10 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
            <div class="flex items-center justify-between px-2 py-1.5 border-b border-white/5 mb-1.5">
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
                <span>📚</span>
                <span>Curated Knowledge Series</span>
              </span>
              <span class="text-[9px] font-mono text-cyphr">${this.collections.length} Tracks</span>
            </div>

            <div class="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              ${this.collections
                .map(col => {
                  const inSeries = col.postIds.includes(postId);
                  const isCurator = col.curatorFingerprint === userFP;

                  return `
                  <div class="flex items-center justify-between p-2 rounded-lg hover:bg-surface-overlay transition-colors group">
                    <div class="flex items-center space-x-2 min-w-0 pr-2">
                      <span class="text-sm shrink-0">${col.emoji}</span>
                      <div class="min-w-0">
                        <div class="text-xs font-semibold text-slate-200 group-hover:text-cyphr transition-colors truncate">
                          ${this.escapeHtml(col.title)}
                        </div>
                        <div class="text-[10px] font-mono text-slate-500 flex items-center space-x-1.5">
                          <span>${col.postIds.length} articles</span>
                          <span>•</span>
                          <span>${col.subscribersCount} subs</span>
                        </div>
                      </div>
                    </div>

                    <button
                      data-action="${inSeries ? 'remove-from-series' : 'add-to-series'}"
                      data-series-id="${col.id}"
                      data-post-id="${postId}"
                      class="btn-series-action shrink-0 px-2 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                        inSeries
                          ? 'bg-crimson/15 text-crimson hover:bg-crimson/30 border border-crimson/30'
                          : 'bg-cyphr/15 text-cyphr hover:bg-cyphr/30 border border-cyphr/30'
                      }"
                    >
                      ${inSeries ? '✕ Remove' : '+ Add'}
                    </button>
                  </div>
                `;
                })
                .join('')}
            </div>

            <div class="pt-2 mt-2 border-t border-white/5 flex items-center justify-between">
              <button
                data-action="prompt-create-series"
                data-initial-post-id="${postId}"
                class="btn-prompt-create-series w-full py-1.5 px-2 rounded-lg bg-surface-overlay hover:bg-surface-base text-cyphr hover:text-white border border-cyphr/20 text-xs font-mono font-medium flex items-center justify-center space-x-1.5 transition-all shadow-sm"
              >
                <span>➕</span>
                <span>Curate New Series</span>
              </button>
            </div>
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  /**
   * Renders the complete modal syllabus view for an active series,
   * showing chapter-by-chapter progression, read status, difficulty, and jump links.
   */
  public renderSeriesModal(seriesId: string, allPosts: any[] = []): string {
    const series = this.getCollectionById(seriesId);
    if (!series) {
      return '';
    }

    const progress = this.getReadingProgress(seriesId);
    const postMap = new Map<string, any>();
    allPosts.forEach(p => postMap.set(p.id, p));

    // Calculate total estimated reading time
    let totalMinutes = 0;
    const episodes = series.postIds.map((pId, idx) => {
      const livePost = postMap.get(pId);
      const fallback = this.fallbackCatalog[pId] || {
        postId: pId,
        title: livePost ? livePost.title : `Technical Chapter #${idx + 1}`,
        authorFingerprint: livePost ? livePost.authorFingerprint : series.curatorFingerprint,
        authorRole: livePost ? livePost.authorRole : series.curatorRole,
        flair: livePost ? livePost.flair : 'TECH DISCUSSION',
        estimatedReadTimeMinutes: 10,
        difficulty: 'Intermediate' as const,
      };

      const title = livePost ? livePost.title : fallback.title;
      const readMins = fallback.estimatedReadTimeMinutes || 10;
      totalMinutes += readMins;
      const isRead = this.isPostRead(pId);

      return {
        postId: pId,
        chapterNumber: idx + 1,
        title,
        readMins,
        authorFingerprint: livePost ? livePost.authorFingerprint : fallback.authorFingerprint,
        authorRole: livePost ? livePost.authorRole : fallback.authorRole,
        flair: livePost ? livePost.flair : fallback.flair,
        difficulty: fallback.difficulty || 'Intermediate',
        isRead,
      };
    });

    return `
      <div id="series-modal-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
        <div class="bg-surface-base border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
          
          <!-- MODAL HEADER BANNER -->
          <div class="relative bg-gradient-to-br from-surface-overlay via-surface-raised to-surface-base p-6 border-subtle-b">
            <div class="flex items-start justify-between">
              <div class="flex items-center space-x-3.5">
                <div class="w-14 h-14 rounded-2xl bg-surface-base/90 border border-white/10 flex items-center justify-center text-3xl shadow-inner shrink-0">
                  ${series.emoji}
                </div>
                <div>
                  <div class="flex items-center space-x-2 mb-1">
                    <span class="text-[10px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded bg-cyphr/10 text-cyphr border border-cyphr/30">
                      Sovereign Curriculum
                    </span>
                    <span class="text-xs text-slate-400 font-mono">
                      ⏱ ~${totalMinutes} min total read
                    </span>
                  </div>
                  <h2 class="text-xl font-bold text-white tracking-tight">
                    ${this.escapeHtml(series.title)}
                  </h2>
                </div>
              </div>

              <button
                data-action="close-series-modal"
                class="btn-close-modal text-slate-400 hover:text-white p-2 rounded-xl bg-surface-base/60 hover:bg-surface-base border border-white/10 transition-colors"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            <p class="text-sm text-slate-300 mt-3.5 leading-relaxed font-sans">
              ${this.escapeHtml(series.summary)}
            </p>

            <!-- CURATOR & META BAR -->
            <div class="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-white/5 text-xs font-mono">
              <div class="flex items-center space-x-3 text-slate-400">
                <div class="flex items-center space-x-1.5">
                  <span class="text-slate-500">Curator:</span>
                  <span class="text-slate-200 font-bold font-mono">@${series.curatorFingerprint.substring(0, 10)}</span>
                  <span class="text-[9px] px-1.5 py-0.5 rounded bg-surface-overlay text-cyphr border border-cyphr/30 font-bold uppercase">
                    ${series.curatorRole}
                  </span>
                </div>
                <span>•</span>
                <span class="text-slate-300">👥 ${series.subscribersCount} subscribers</span>
              </div>

              <div class="flex items-center space-x-2">
                <button
                  data-action="toggle-subscribe-series"
                  data-series-id="${series.id}"
                  class="btn-toggle-sub px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    series.isSubscribed
                      ? 'bg-signal/15 text-signal hover:bg-signal/25 border border-signal/30'
                      : 'bg-cyphr text-slate-950 hover:bg-cyphr/90 font-bold shadow-cyphr-sm'
                  }"
                >
                  ${series.isSubscribed ? '✓ Subscribed' : '+ Subscribe Series'}
                </button>
              </div>
            </div>
          </div>

          <!-- PROGRESS BAR SECTION -->
          <div class="bg-surface-raised px-6 py-3.5 border-subtle-b flex items-center justify-between gap-4">
            <div class="flex items-center space-x-2.5">
              <span class="text-xs font-mono font-bold text-slate-300">Reading Progress:</span>
              <span class="text-xs font-mono text-cyphr font-bold">${progress.completed} of ${progress.total} Chapters (${progress.percentage}%)</span>
            </div>
            <div class="flex-1 max-w-xs bg-surface-base h-2 rounded-full overflow-hidden border border-white/5">
              <div class="bg-gradient-to-r from-cyphr via-signal to-signal h-full transition-all duration-300" style="width: ${progress.percentage}%"></div>
            </div>
          </div>

          <!-- CHAPTERS / EPISODES LIST -->
          <div class="p-6 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
            <div class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
              <span>Syllabus &amp; Articles</span>
              <span>${episodes.length} Modules</span>
            </div>

            ${episodes
              .map(ep => {
                return `
                <div class="p-3.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border ${
                  ep.isRead ? 'border-signal/20 bg-signal/[0.02]' : 'border-white/5'
                } transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group">
                  
                  <div class="flex items-start space-x-3.5 min-w-0 flex-1">
                    <div class="w-8 h-8 rounded-lg ${
                      ep.isRead ? 'bg-signal/20 text-signal border border-signal/30' : 'bg-surface-base text-slate-400 border border-white/10'
                    } flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      ${ep.isRead ? '✓' : `0${ep.chapterNumber}`.slice(-2)}
                    </div>

                    <div class="min-w-0 flex-1">
                      <div class="flex items-center space-x-2 mb-1">
                        <span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-base text-slate-400 border border-white/5">
                          ${ep.flair}
                        </span>
                        <span class="text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          ep.difficulty === 'Hardcore'
                            ? 'bg-crimson/15 text-crimson border border-crimson/30'
                            : ep.difficulty === 'Advanced'
                            ? 'bg-amber/15 text-amber border border-amber/30'
                            : 'bg-cyphr/15 text-cyphr border border-cyphr/30'
                        }">
                          ${ep.difficulty}
                        </span>
                        <span class="text-[10px] text-slate-500 font-mono">⏱ ${ep.readMins}m</span>
                      </div>

                      <h4 class="text-sm font-semibold text-slate-200 group-hover:text-cyphr transition-colors leading-snug">
                        ${this.escapeHtml(ep.title)}
                      </h4>

                      <div class="text-[10px] font-mono text-slate-500 mt-1">
                        Author: @${ep.authorFingerprint.substring(0, 10)} (${ep.authorRole})
                      </div>
                    </div>
                  </div>

                  <!-- ACTIONS -->
                  <div class="flex items-center space-x-2 self-end sm:self-center shrink-0">
                    <button
                      data-action="toggle-post-read"
                      data-post-id="${ep.postId}"
                      class="btn-toggle-read px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        ep.isRead
                          ? 'bg-signal/15 text-signal hover:bg-signal/25 border border-signal/30'
                          : 'bg-surface-base text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20'
                      }"
                      title="${ep.isRead ? 'Mark as Unread' : 'Mark as Completed'}"
                    >
                      ${ep.isRead ? '✓ Completed' : '○ Mark Read'}
                    </button>

                    <button
                      data-action="jump-to-post"
                      data-post-id="${ep.postId}"
                      class="btn-jump-post px-3 py-1.5 rounded-lg bg-cyphr/10 hover:bg-cyphr text-cyphr hover:text-slate-950 border border-cyphr/30 text-xs font-mono font-bold transition-all flex items-center space-x-1"
                    >
                      <span>Read</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>

          <!-- MODAL FOOTER -->
          <div class="bg-surface-raised px-6 py-3.5 border-t border-white/5 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              ${series.tags
                .map(
                  tag => `
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-base text-slate-400 border border-white/5">
                  #${tag}
                </span>
              `
                )
                .join('')}
            </div>

            <button
              data-action="close-series-modal"
              class="btn-close-modal px-4 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-base text-xs font-mono text-slate-300 hover:text-white border border-white/10 transition-colors"
            >
              Close Syllabus
            </button>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Renders the complete, responsive Directory & Explorer page for Technical Knowledge Series.
   * Includes category tabs, live search input, progress indicators, and curation triggers.
   */
  public renderSeriesDirectory(): string {
    const categories = ['All', 'Cryptography', 'Reverse Engineering', 'Distributed Systems', 'Security', 'Subscribed'];

    let filtered = this.collections.slice();

    if (this.selectedCategory === 'Subscribed') {
      filtered = filtered.filter(c => c.isSubscribed);
    } else if (this.selectedCategory !== 'All') {
      filtered = filtered.filter(c =>
        c.tags.some(t => t.toLowerCase() === this.selectedCategory.toLowerCase()) ||
        c.title.toLowerCase().includes(this.selectedCategory.toLowerCase())
      );
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.title.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    const totalSeries = this.collections.length;
    const totalArticles = this.collections.reduce((acc, c) => acc + c.postIds.length, 0);
    const totalSubscribers = this.collections.reduce((acc, c) => acc + c.subscribersCount, 0);

    return `
      <div class="flex-1 overflow-y-auto bg-canvas p-6 space-y-6 custom-scrollbar animate-in fade-in duration-150 font-sans">
        
        <!-- HERO BANNER -->
        <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-raised via-surface-base to-surface-overlay p-6 md:p-8 border border-white/10 shadow-xl">
          <div class="absolute -right-8 -bottom-8 w-64 h-64 rounded-full bg-cyphr/5 blur-3xl pointer-events-none"></div>
          <div class="absolute -left-8 -top-8 w-64 h-64 rounded-full bg-aether/5 blur-3xl pointer-events-none"></div>

          <div class="max-w-2xl relative z-10">
            <div class="flex items-center space-x-2.5 mb-2.5">
              <span class="text-2xl">📚</span>
              <span class="text-xs uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded bg-cyphr/10 text-cyphr border border-cyphr/30">
                Sovereign Knowledge Repository
              </span>
            </div>
            <h1 class="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Curated Technical Series &amp; Syllabi
            </h1>
            <p class="text-sm text-slate-300 mt-2 leading-relaxed">
              Step-by-step masterclasses, post-quantum cryptographic migration paths, binary reverse-engineering audits, and decentralized P2P specs curated directly by network guardians and archivists.
            </p>
          </div>

          <!-- NETWORK METRICS STRIP -->
          <div class="grid grid-cols-3 gap-3 max-w-lg mt-6 pt-4 border-t border-white/5 font-mono">
            <div class="p-2.5 rounded-xl bg-surface-base/80 border border-white/5">
              <div class="text-[10px] text-slate-500 uppercase font-bold">Total Curations</div>
              <div class="text-lg font-bold text-cyphr">${totalSeries} Series</div>
            </div>
            <div class="p-2.5 rounded-xl bg-surface-base/80 border border-white/5">
              <div class="text-[10px] text-slate-500 uppercase font-bold">Deep Dive Chapters</div>
              <div class="text-lg font-bold text-signal">${totalArticles} Articles</div>
            </div>
            <div class="p-2.5 rounded-xl bg-surface-base/80 border border-white/5">
              <div class="text-[10px] text-slate-500 uppercase font-bold">Network Scholars</div>
              <div class="text-lg font-bold text-aether">${totalSubscribers} Subs</div>
            </div>
          </div>
        </div>

        <!-- SEARCH & CATEGORY BAR -->
        <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-surface-base p-3 rounded-xl border border-white/5">
          
          <!-- CATEGORY PILLS -->
          <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            ${categories
              .map(cat => {
                const isActive = this.selectedCategory === cat;
                return `
                <button
                  data-action="filter-series-category"
                  data-category="${cat}"
                  class="btn-filter-category px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-cyphr text-slate-950 font-bold shadow-cyphr-sm'
                      : 'bg-surface-raised text-slate-400 hover:text-slate-200 hover:bg-surface-overlay'
                  }"
                >
                  ${cat === 'Subscribed' ? '★ ' : ''}${cat}
                </button>
              `;
              })
              .join('')}
          </div>

          <!-- SEARCH INPUT & CREATE ACTION -->
          <div class="flex items-center space-x-2">
            <div class="relative flex-1 md:w-64">
              <input
                type="text"
                id="series-search-input"
                value="${this.escapeHtml(this.searchQuery)}"
                placeholder="Search syllabi, tags, or topics..."
                class="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyphr font-mono"
              />
              ${
                this.searchQuery
                  ? `
                <button data-action="clear-series-search" class="absolute right-2.5 top-1.5 text-slate-500 hover:text-white text-xs">✕</button>
              `
                  : ''
              }
            </div>

            <button
              data-action="prompt-create-series"
              class="btn-prompt-create-series px-3.5 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight text-cyphr hover:text-white border border-cyphr/30 text-xs font-mono font-semibold transition-all flex items-center space-x-1 shrink-0 shadow-sm"
            >
              <span>➕</span>
              <span>New Series</span>
            </button>
          </div>
        </div>

        <!-- SERIES GRID -->
        ${
          filtered.length === 0
            ? `
          <div class="p-12 text-center rounded-2xl bg-surface-base border border-white/5 space-y-3">
            <div class="text-4xl">🔍</div>
            <h3 class="text-base font-bold text-slate-300">No knowledge series match your filter</h3>
            <p class="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria or switch to "All" categories to view all sovereign tracks.
            </p>
            <button data-action="reset-series-filters" class="px-4 py-2 rounded-lg bg-surface-raised hover:bg-surface-overlay text-cyphr font-mono text-xs font-bold transition-colors">
              Reset Filters
            </button>
          </div>
        `
            : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${filtered.map(series => this.renderSeriesCard(series)).join('')}
          </div>
        `
        }

        <!-- CURATION CALLOUT FOOTER -->
        <div class="p-5 rounded-2xl bg-surface-raised border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center space-x-3.5">
            <div class="w-10 h-10 rounded-xl bg-cyphr/10 border border-cyphr/20 flex items-center justify-center text-xl text-cyphr shrink-0">
              💡
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-200">Are you authoring cryptographic or reverse-engineering content?</h4>
              <p class="text-xs text-slate-400">Bundle your posts into structured knowledge series to earn sovereign network endorsement merit.</p>
            </div>
          </div>
          <button
            data-action="prompt-create-series"
            class="btn-prompt-create-series px-4 py-2 rounded-xl bg-gradient-to-r from-cyphr to-aether text-slate-950 hover:brightness-110 font-mono text-xs font-bold transition-all shadow-cyphr-sm shrink-0"
          >
            Create Knowledge Series
          </button>
        </div>

      </div>
    `;
  }

  /**
   * Renders an individual knowledge series card within the directory grid.
   */
  public renderSeriesCard(series: SeriesItem): string {
    const progress = this.getReadingProgress(series.id);

    return `
      <div class="p-5 rounded-2xl bg-surface-base hover:bg-surface-raised/80 border border-white/5 hover:border-cyphr/30 transition-all flex flex-col justify-between space-y-4 group shadow-lg">
        
        <!-- CARD HEADER -->
        <div>
          <div class="flex items-start justify-between gap-2 mb-3">
            <div class="w-12 h-12 rounded-xl bg-surface-raised border border-white/10 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shadow-inner shrink-0">
              ${series.emoji}
            </div>

            <div class="flex items-center space-x-1.5">
              ${
                series.isSubscribed
                  ? `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-signal/15 text-signal border border-signal/30 font-semibold">Subscribed</span>`
                  : ''
              }
              <button
                data-action="toggle-subscribe-series"
                data-series-id="${series.id}"
                class="btn-toggle-sub p-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-cyphr transition-colors"
                title="${series.isSubscribed ? 'Unsubscribe' : 'Subscribe'}"
              >
                ${series.isSubscribed ? '★' : '☆'}
              </button>
            </div>
          </div>

          <h3 class="text-base font-bold text-white group-hover:text-cyphr transition-colors leading-snug">
            ${this.escapeHtml(series.title)}
          </h3>

          <p class="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed font-sans">
            ${this.escapeHtml(series.summary)}
          </p>
        </div>

        <!-- PROGRESS & STATS -->
        <div class="space-y-3 pt-2 border-t border-white/5">
          <!-- PROGRESS BAR -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-[10px] font-mono">
              <span class="text-slate-500">${series.postIds.length} Articles</span>
              <span class="${progress.completed > 0 ? 'text-cyphr font-bold' : 'text-slate-500'}">
                ${progress.completed}/${progress.total} Completed (${progress.percentage}%)
              </span>
            </div>
            <div class="w-full bg-surface-raised h-1.5 rounded-full overflow-hidden border border-white/5">
              <div class="bg-gradient-to-r from-cyphr to-signal h-full" style="width: ${progress.percentage}%"></div>
            </div>
          </div>

          <!-- TAGS PILLS -->
          <div class="flex flex-wrap gap-1">
            ${series.tags.slice(0, 3).map(t => `
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-overlay text-slate-400">
                #${t}
              </span>
            `).join('')}
            ${series.tags.length > 3 ? `<span class="text-[9px] font-mono text-slate-500">+${series.tags.length - 3}</span>` : ''}
          </div>

          <!-- CURATOR & OPEN BUTTON -->
          <div class="flex items-center justify-between pt-2 border-t border-white/5">
            <div class="text-[10px] font-mono text-slate-500">
              By <span class="text-slate-300 font-semibold">@${series.curatorFingerprint.substring(0, 8)}</span>
            </div>

            <button
              data-action="open-series-modal"
              data-series-id="${series.id}"
              class="btn-open-series px-3 py-1.5 rounded-lg bg-cyphr/10 hover:bg-cyphr text-cyphr hover:text-slate-950 border border-cyphr/30 text-xs font-mono font-bold transition-all flex items-center space-x-1 shadow-sm"
            >
              <span>Explore</span>
              <span>→</span>
            </button>
          </div>
        </div>

      </div>
    `;
  }

  /**
   * Renders a compact summary widget for the Right Rail / Sidebar.
   */
  public renderSeriesSidebarWidget(): string {
    const subscribed = this.collections.filter(c => c.isSubscribed);

    return `
      <div class="p-3.5 rounded-xl bg-surface-raised border border-white/5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-100 flex items-center space-x-1.5">
            <span>📚</span>
            <span>Your Series Syllabi</span>
          </span>
          <button data-action="view-all-series" class="text-[10px] font-mono text-cyphr hover:underline">
            Directory →
          </button>
        </div>

        <div class="space-y-2">
          ${
            subscribed.length === 0
              ? `<div class="text-xs text-slate-500 font-mono py-2 text-center">No active subscriptions yet.</div>`
              : subscribed
                  .map(s => {
                    const prog = this.getReadingProgress(s.id);
                    return `
                <button
                  data-action="open-series-modal"
                  data-series-id="${s.id}"
                  class="btn-open-series w-full text-left p-2 rounded-lg bg-surface-base hover:bg-surface-overlay border border-white/5 transition-all group"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-semibold text-slate-200 group-hover:text-cyphr transition-colors truncate max-w-[160px]">
                      ${s.emoji} ${this.escapeHtml(s.title)}
                    </span>
                    <span class="text-[10px] font-mono text-cyphr font-bold">${prog.percentage}%</span>
                  </div>
                  <div class="w-full bg-surface-raised h-1 rounded-full overflow-hidden">
                    <div class="bg-cyphr h-full" style="width: ${prog.percentage}%"></div>
                  </div>
                </button>
              `;
                  })
                  .join('')
          }
        </div>
      </div>
    `;
  }
}

export const collectionsEngine = new CollectionsEngine();
