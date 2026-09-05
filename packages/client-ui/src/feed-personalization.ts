import { sovereignDialog } from './dialog-modal.js';
/**
 * Aetheris Omni-Sphere — Feed Personalization & Sovereign Recommendation Engine
 *
 * 100% Self-Contained, Strict TypeScript, Zero External Dependencies, Zero Cloud Telemetry.
 *
 * Algorithmic Architecture:
 * 1. Local Vector Space TF-IDF Topic & Hashtag Affinity Modeling
 * 2. Exponential Temporal Decay & Freshness Curves (Half-life interaction decay)
 * 3. Dwell-Time Weighted Multimodal Interaction Dynamics (view, upvote, downvote, comment, share, bookmark, skip)
 * 4. Sovereign Author Trust & Reputation Transference
 * 5. Transparent & Explainable Recommendation Factors ('Why am I seeing this?')
 * 6. Interactive Dark Glassmorphism Visual Control Panel & Micro-Widgets
 */

// ---------------------------------------------------------------------------
// 1. Data Contracts & Interfaces
// ---------------------------------------------------------------------------

export interface UserInteraction {
  postId: string;
  type: 'view' | 'upvote' | 'downvote' | 'comment' | 'share' | 'bookmark' | 'skip';
  timestamp: number;
  dwellTimeMs: number;
}

export interface ContentSignal {
  postId: string;
  tags: string[];
  flair: string;
  channelId: string;
  score: number;
  authorFP: string;
  createdAt?: number;
  title?: string;
}

export interface PersonalizationBreakdown {
  topicScore: number;
  authorScore: number;
  meritScore: number;
  freshnessScore: number;
  viewPenalty: number;
}

export interface PersonalizationScore {
  postId: string;
  relevanceScore: number;
  reasons: string[];
  breakdown?: PersonalizationBreakdown;
}

export interface TopicAffinityItem {
  topic: string;
  score: number;
  percentage: number;
  interactionCount: number;
  category: string;
}

export interface InteractionStats {
  totalInteractions: number;
  upvotes: number;
  downvotes: number;
  bookmarks: number;
  shares: number;
  comments: number;
  views: number;
  skips: number;
  uniqueAuthorsCount: number;
  topTopic: string;
}

// ---------------------------------------------------------------------------
// 2. Constants & Tuning Hyperparameters
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  USER_HISTORY: 'aetheris_feed_user_history_v1',
  MANUAL_INTERESTS: 'aetheris_feed_manual_interests_v1',
  CONTENT_SIGNALS: 'aetheris_feed_content_signals_v1',
  MUTED_AUTHORS: 'aetheris_feed_muted_authors_v1',
  MUTED_TAGS: 'aetheris_feed_muted_tags_v1',
} as const;

// Interaction type base weight multipliers
const INTERACTION_WEIGHTS: Record<UserInteraction['type'], number> = {
  upvote: 3.5,
  bookmark: 3.2,
  share: 2.8,
  comment: 2.2,
  view: 0.8,      // Modulated by dwell time
  skip: -1.8,
  downvote: -4.5,
};

// Dwell time thresholds in milliseconds
const DWELL_THRESHOLDS = {
  BOUNCE_MS: 2500,        // Less than 2.5s is treated as accidental or negative glance
  ENGAGED_MIN_MS: 8000,   // Meaningful read started
  DEEP_READ_MS: 22000,    // High engagement read
  MAX_EFFECTIVE_MS: 60000 // Cap dwell weight effect
};

// Temporal decay half-lives (in milliseconds)
const HALF_LIFE_INTERACTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days decay for user preferences
const HALF_LIFE_FRESHNESS_MS = 48 * 60 * 60 * 1000;       // 48 hours decay for post freshness

// Default baseline topics for cold-start bootstrapping
const SEED_TOPICS: Record<string, { score: number; category: string }> = {
  '#ZeroKnowledge': { score: 85, category: 'Cryptography' },
  '#TreeKEM_MLS': { score: 78, category: 'Protocol' },
  '#ReverseEngineering': { score: 72, category: 'Security' },
  '#BinaryHygiene': { score: 65, category: 'Vault' },
  '#AirGapGhost': { score: 60, category: 'Privacy' },
  '#Decentralized': { score: 55, category: 'Network' },
  '#Cryptography': { score: 80, category: 'Cryptography' },
  '#Security': { score: 75, category: 'Security' },
};

// Seed realistic content signals for initial hydration
const SEED_CONTENT_SIGNALS: ContentSignal[] = [
  {
    postId: 'post-zk-01',
    tags: ['#ZeroKnowledge', '#Cryptography', '#Privacy'],
    flair: 'VERIFIED RELEASE',
    channelId: 'crypto-core',
    score: 42,
    authorFP: 'aeth_zk_9f82a1b4',
    title: 'Zero-Knowledge Recursive SNARK Verification on Light Nodes',
    createdAt: Date.now() - 3600 * 1000 * 4,
  },
  {
    postId: 'post-treekem-02',
    tags: ['#TreeKEM_MLS', '#Protocol', '#Security'],
    flair: 'SECURITY ADVISORY',
    channelId: 'protocol-lab',
    score: 38,
    authorFP: 'aeth_tree_77ac32',
    title: 'TreeKEM MLS Ratchet Architecture & Asynchronous Epoch Transitions',
    createdAt: Date.now() - 3600 * 1000 * 12,
  },
  {
    postId: 'post-vault-03',
    tags: ['#BinaryHygiene', '#ReverseEngineering', '#Vault'],
    flair: 'TECH DISCUSSION',
    channelId: 'vault-ops',
    score: 29,
    authorFP: 'aeth_archivist_55b8',
    title: 'Deterministic Binary Hygiene & PE Entropy Scan Analysis',
    createdAt: Date.now() - 3600 * 1000 * 20,
  },
  {
    postId: 'post-airgap-04',
    tags: ['#AirGapGhost', '#Privacy', '#Security'],
    flair: 'VERIFIED RELEASE',
    channelId: 'mesh-relays',
    score: 51,
    authorFP: 'aeth_ghost_1102cd',
    title: 'AirGap Ghost Protocol: Ultrasonic Out-of-Band Key Exchange',
    createdAt: Date.now() - 3600 * 1000 * 2,
  },
  {
    postId: 'post-pulse-05',
    tags: ['#Decentralized', '#Network', '#Protocol'],
    flair: 'MICRO-PULSE',
    channelId: 'pulse-global',
    score: 19,
    authorFP: 'aeth_pulse_9901ef',
    title: 'Sovereign Gossip Subnet Latency Benchmarks Across 10k Peered Nodes',
    createdAt: Date.now() - 3600 * 1000 * 6,
  },
];

// Seed initial interaction history for realistic cold start
const SEED_INTERACTIONS: UserInteraction[] = [
  { postId: 'post-zk-01', type: 'upvote', timestamp: Date.now() - 3600 * 1000 * 3, dwellTimeMs: 42000 },
  { postId: 'post-zk-01', type: 'bookmark', timestamp: Date.now() - 3600 * 1000 * 3, dwellTimeMs: 42000 },
  { postId: 'post-treekem-02', type: 'view', timestamp: Date.now() - 3600 * 1000 * 10, dwellTimeMs: 28000 },
  { postId: 'post-treekem-02', type: 'upvote', timestamp: Date.now() - 3600 * 1000 * 10, dwellTimeMs: 28000 },
  { postId: 'post-vault-03', type: 'view', timestamp: Date.now() - 3600 * 1000 * 18, dwellTimeMs: 19000 },
  { postId: 'post-airgap-04', type: 'upvote', timestamp: Date.now() - 3600 * 1000 * 1, dwellTimeMs: 35000 },
  { postId: 'post-airgap-04', type: 'share', timestamp: Date.now() - 3600 * 1000 * 1, dwellTimeMs: 35000 },
];

// ---------------------------------------------------------------------------
// 3. Recommendation & Feed Personalization Engine
// ---------------------------------------------------------------------------

export class FeedPersonalizationEngine {
  public userHistory: UserInteraction[] = [];
  public contentSignals: Map<string, ContentSignal> = new Map();
  public topicInterests: Map<string, number> = new Map();
  
  // Auxiliary internal state maps for multi-factor scoring
  public authorAffinities: Map<string, number> = new Map();
  public flairAffinities: Map<string, number> = new Map();
  public channelAffinities: Map<string, number> = new Map();
  public manualOverrides: Map<string, number> = new Map();
  public mutedAuthors: Set<string> = new Set();
  public mutedTags: Set<string> = new Set();

  private cachedScores: Map<string, PersonalizationScore> = new Map();
  private isDirty: boolean = true;
  private readonly maxHistoryLength: number = 2500;

  constructor() {
    this.initializeState();
  }

  // ─── Initialization & Persistence ─────────────────────────────────────────

  private initializeState(): void {
    this.loadFromStorage();
    this.seedDefaultsIfEmpty();
    this.computeTopicInterests();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      // 1. User History
      const rawHistory = localStorage.getItem(STORAGE_KEYS.USER_HISTORY);
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) {
          this.userHistory = parsed;
        }
      }

      // 2. Manual Topic Overrides
      const rawManual = localStorage.getItem(STORAGE_KEYS.MANUAL_INTERESTS);
      if (rawManual) {
        const parsed = JSON.parse(rawManual);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'number') {
              this.manualOverrides.set(k, v);
            }
          }
        }
      }

      // 3. Content Signals Catalog
      const rawSignals = localStorage.getItem(STORAGE_KEYS.CONTENT_SIGNALS);
      if (rawSignals) {
        const parsed = JSON.parse(rawSignals);
        if (Array.isArray(parsed)) {
          for (const sig of parsed) {
            if (sig && sig.postId) {
              this.contentSignals.set(sig.postId, sig);
            }
          }
        }
      }

      // 4. Muted entities
      const rawMutedAuthors = localStorage.getItem(STORAGE_KEYS.MUTED_AUTHORS);
      if (rawMutedAuthors) {
        const parsed = JSON.parse(rawMutedAuthors);
        if (Array.isArray(parsed)) {
          this.mutedAuthors = new Set(parsed);
        }
      }

      const rawMutedTags = localStorage.getItem(STORAGE_KEYS.MUTED_TAGS);
      if (rawMutedTags) {
        const parsed = JSON.parse(rawMutedTags);
        if (Array.isArray(parsed)) {
          this.mutedTags = new Set(parsed);
        }
      }
    } catch {
      // Gracefully handle storage parse errors or corrupted state
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(
        STORAGE_KEYS.USER_HISTORY,
        JSON.stringify(this.userHistory.slice(-this.maxHistoryLength))
      );

      const manualObj: Record<string, number> = {};
      for (const [k, v] of this.manualOverrides.entries()) {
        manualObj[k] = v;
      }
      localStorage.setItem(STORAGE_KEYS.MANUAL_INTERESTS, JSON.stringify(manualObj));

      const signalsArray = Array.from(this.contentSignals.values()).slice(-500);
      localStorage.setItem(STORAGE_KEYS.CONTENT_SIGNALS, JSON.stringify(signalsArray));

      localStorage.setItem(STORAGE_KEYS.MUTED_AUTHORS, JSON.stringify(Array.from(this.mutedAuthors)));
      localStorage.setItem(STORAGE_KEYS.MUTED_TAGS, JSON.stringify(Array.from(this.mutedTags)));
    } catch {
      // Storage quota exceeded or private mode restriction
    }
  }

  private seedDefaultsIfEmpty(): void {
    // Seed initial content signals if catalog is empty
    if (this.contentSignals.size === 0) {
      for (const sig of SEED_CONTENT_SIGNALS) {
        this.contentSignals.set(sig.postId, sig);
      }
    }

    // Seed baseline interactions if empty
    if (this.userHistory.length === 0) {
      this.userHistory = [...SEED_INTERACTIONS];
    }
  }

  // ─── Signal Ingestion & Content Indexing ───────────────────────────────────

  public registerContentSignal(signal: ContentSignal): void {
    if (!signal || !signal.postId) return;
    const existing = this.contentSignals.get(signal.postId);
    const updated: ContentSignal = {
      ...existing,
      ...signal,
      createdAt: signal.createdAt || existing?.createdAt || Date.now(),
      score: typeof signal.score === 'number' ? signal.score : (existing?.score || 0),
    };
    this.contentSignals.set(signal.postId, updated);
    this.isDirty = true;
    this.saveToStorage();
  }

  public registerContentSignals(signals: ContentSignal[]): void {
    for (const s of signals) {
      this.registerContentSignal(s);
    }
  }

  // ─── Interaction Tracking ──────────────────────────────────────────────────

  public trackInteraction(interaction: UserInteraction): void {
    if (!interaction || !interaction.postId) return;

    // Sanitize values
    const cleanInteraction: UserInteraction = {
      postId: String(interaction.postId),
      type: interaction.type,
      timestamp: interaction.timestamp || Date.now(),
      dwellTimeMs: Math.max(0, interaction.dwellTimeMs || 0),
    };

    this.userHistory.push(cleanInteraction);

    // Limit memory footprint
    if (this.userHistory.length > this.maxHistoryLength) {
      this.userHistory = this.userHistory.slice(-this.maxHistoryLength);
    }

    this.isDirty = true;
    this.cachedScores.clear();
    this.computeTopicInterests();
    this.saveToStorage();

    // Dispatch sovereign event for live reactive updates across UI panels
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aetheris:feed-personalized', {
          detail: { interaction: cleanInteraction },
        })
      );
    }
  }

  // ─── Algorithmic Computation: Topic & Affinity Inference ───────────────────

  public computeTopicInterests(): void {
    const rawTopicAccumulator = new Map<string, number>();
    const authorAccumulator = new Map<string, number>();
    const flairAccumulator = new Map<string, number>();
    const channelAccumulator = new Map<string, number>();

    const now = Date.now();

    // Initialize baseline topic seeds to avoid complete cold-start bias
    for (const [topic, seed] of Object.entries(SEED_TOPICS)) {
      rawTopicAccumulator.set(topic, seed.score * 0.35);
    }

    // Process interaction history with exponential temporal decay
    for (const item of this.userHistory) {
      const signal = this.contentSignals.get(item.postId);
      
      // Calculate temporal decay weight
      const elapsedMs = Math.max(0, now - item.timestamp);
      const timeDecayFactor = Math.pow(0.5, elapsedMs / HALF_LIFE_INTERACTION_MS);

      // Base interaction weight
      let interactionWeight = INTERACTION_WEIGHTS[item.type] ?? 1.0;

      // Modulate view interaction by dwell time
      if (item.type === 'view') {
        if (item.dwellTimeMs < DWELL_THRESHOLDS.BOUNCE_MS) {
          interactionWeight = -0.5; // Fast bounce/skip
        } else if (item.dwellTimeMs >= DWELL_THRESHOLDS.DEEP_READ_MS) {
          const clampedDwell = Math.min(item.dwellTimeMs, DWELL_THRESHOLDS.MAX_EFFECTIVE_MS);
          const dwellBoost = 1.0 + (clampedDwell - DWELL_THRESHOLDS.DEEP_READ_MS) / 25000;
          interactionWeight = 1.6 * dwellBoost;
        } else if (item.dwellTimeMs >= DWELL_THRESHOLDS.ENGAGED_MIN_MS) {
          interactionWeight = 1.1;
        } else {
          interactionWeight = 0.4;
        }
      }

      const effectiveMagnitude = interactionWeight * timeDecayFactor;

      // Attribute weight to content tags
      if (signal && Array.isArray(signal.tags) && signal.tags.length > 0) {
        const perTagWeight = effectiveMagnitude / Math.sqrt(signal.tags.length);
        for (const rawTag of signal.tags) {
          const tag = this.normalizeTag(rawTag);
          if (this.mutedTags.has(tag)) continue;
          const current = rawTopicAccumulator.get(tag) || 0;
          rawTopicAccumulator.set(tag, current + perTagWeight * 12);
        }
      }

      // Attribute to author affinity
      if (signal && signal.authorFP) {
        if (!this.mutedAuthors.has(signal.authorFP)) {
          const currentAuthorScore = authorAccumulator.get(signal.authorFP) || 0;
          authorAccumulator.set(signal.authorFP, currentAuthorScore + effectiveMagnitude * 15);
        }
      }

      // Attribute to flair
      if (signal && signal.flair) {
        const currentFlair = flairAccumulator.get(signal.flair) || 0;
        flairAccumulator.set(signal.flair, currentFlair + effectiveMagnitude * 8);
      }

      // Attribute to channel
      if (signal && signal.channelId) {
        const currentChannel = channelAccumulator.get(signal.channelId) || 0;
        channelAccumulator.set(signal.channelId, currentChannel + effectiveMagnitude * 5);
      }
    }

    // Apply manual user overrides with highest priority
    for (const [tag, manualScore] of this.manualOverrides.entries()) {
      const normalized = this.normalizeTag(tag);
      if (this.mutedTags.has(normalized)) {
        rawTopicAccumulator.set(normalized, 0);
      } else {
        rawTopicAccumulator.set(normalized, manualScore);
      }
    }

    // Zero out muted tags and authors
    for (const tag of this.mutedTags) {
      rawTopicAccumulator.set(tag, 0);
    }
    for (const author of this.mutedAuthors) {
      authorAccumulator.set(author, -100);
    }

    // Normalize topic scores to [0, 100] scale
    let maxTopicVal = 1;
    for (const val of rawTopicAccumulator.values()) {
      if (val > maxTopicVal) maxTopicVal = val;
    }

    this.topicInterests.clear();
    for (const [tag, val] of rawTopicAccumulator.entries()) {
      if (val <= 0) continue;
      const normalized = Math.min(100, Math.max(0, (val / maxTopicVal) * 100));
      this.topicInterests.set(tag, Math.round(normalized * 10) / 10);
    }

    // Assign author and flair affinities
    this.authorAffinities = authorAccumulator;
    this.flairAffinities = flairAccumulator;
    this.channelAffinities = channelAccumulator;
    this.isDirty = false;
  }

  // ─── Core Recommendation Algorithm: TF-IDF & Multimodal Scoring ───────────

  public scorePost(signal: ContentSignal): PersonalizationScore {
    if (!signal || !signal.postId) {
      return { postId: 'unknown', relevanceScore: 50, reasons: ['Default network content'] };
    }

    // Check cache
    if (!this.isDirty && this.cachedScores.has(signal.postId)) {
      return this.cachedScores.get(signal.postId)!;
    }

    // Make sure catalog knows about this signal
    if (!this.contentSignals.has(signal.postId)) {
      this.contentSignals.set(signal.postId, signal);
    }

    // 0. Check for Muted tags or authors
    if (this.mutedAuthors.has(signal.authorFP)) {
      const result: PersonalizationScore = {
        postId: signal.postId,
        relevanceScore: 0,
        reasons: ['🚫 Author manually muted from your feed'],
        breakdown: { topicScore: 0, authorScore: 0, meritScore: 0, freshnessScore: 0, viewPenalty: 100 }
      };
      this.cachedScores.set(signal.postId, result);
      return result;
    }

    const reasons: string[] = [];

    // ── 1. TF-IDF Topic Similarity Computation ──────────────────────────────
    let topicScore = 0;
    const matchedTopics: Array<{ tag: string; weight: number }> = [];

    if (Array.isArray(signal.tags) && signal.tags.length > 0) {
      const N = Math.max(1, this.contentSignals.size);
      let dotProduct = 0;
      let postNormSq = 0;
      let userNormSq = 0;

      for (const rawTag of signal.tags) {
        const tag = this.normalizeTag(rawTag);
        if (this.mutedTags.has(tag)) continue;

        // Calculate Document Frequency (DF)
        let df = 0;
        for (const s of this.contentSignals.values()) {
          if (s.tags && s.tags.some(t => this.normalizeTag(t) === tag)) {
            df++;
          }
        }
        df = Math.max(1, df);

        // Standard smooth Inverse Document Frequency (IDF)
        const idf = Math.log(1 + (N / df)) + 1.0;
        
        // Term Frequency in current document
        const tf = 1.0 / signal.tags.length;
        const postTfidf = tf * idf;
        postNormSq += postTfidf * postTfidf;

        // User affinity for this tag
        const userInterest = (this.topicInterests.get(tag) || 10) / 100;
        userNormSq += userInterest * userInterest;

        dotProduct += postTfidf * userInterest;

        if (userInterest > 0.4) {
          matchedTopics.push({ tag, weight: userInterest });
        }
      }

      const denominator = (Math.sqrt(postNormSq) * Math.sqrt(Math.max(0.01, userNormSq)));
      const cosineSim = denominator > 0 ? (dotProduct / denominator) : 0.2;
      topicScore = Math.min(100, Math.max(0, cosineSim * 100));

      if (matchedTopics.length > 0) {
        matchedTopics.sort((a, b) => b.weight - a.weight);
        const topTagsStr = matchedTopics.slice(0, 2).map(t => t.tag).join(', ');
        reasons.push(`🎯 High resonance with topics of interest: ${topTagsStr}`);
      }
    } else {
      topicScore = 40; // Default baseline for untagged content
    }

    // ── 2. Author Affinity Multiplier ───────────────────────────────────────
    let authorScore = 50;
    const authorAffinityVal = this.authorAffinities.get(signal.authorFP) || 0;
    if (authorAffinityVal > 0) {
      authorScore = Math.min(100, 50 + Math.min(50, authorAffinityVal * 2.5));
      const shortFP = signal.authorFP.slice(0, 10);
      reasons.push(`👤 Trusted recurring author (${shortFP}...) with positive interactions`);
    } else if (authorAffinityVal < -5) {
      authorScore = Math.max(0, 50 + authorAffinityVal * 3);
      reasons.push(`⚠️ Limited or negative interactions with this author`);
    }

    // ── 3. Community Merit Reputation Bonus ──────────────────────────────────
    const meritVotes = Math.max(0, signal.score || 0);
    // Logarithmic scale: 1 vote ~ 14 pts, 10 votes ~ 48 pts, 50 votes ~ 78 pts, 100+ votes ~ 95+ pts
    const meritScore = Math.min(100, Math.log1p(meritVotes) * 20.5);
    if (meritVotes >= 15) {
      reasons.push(`⭐ High merit consensus across sovereign network (${meritVotes} upvotes)`);
    }

    // ── 4. Exponential Temporal Freshness Factor ────────────────────────────
    const createdAt = signal.createdAt || (Date.now() - 3600 * 1000 * 8);
    const ageMs = Math.max(0, Date.now() - createdAt);
    const freshnessDecay = Math.pow(0.5, ageMs / HALF_LIFE_FRESHNESS_MS);
    const freshnessScore = Math.min(100, Math.max(5, freshnessDecay * 100));
    
    if (ageMs < 4 * 3600 * 1000) {
      reasons.push(`⚡ Fresh content (recently published to the network)`);
    }

    // ── 5. Penalty for Already Viewed / Skipped Content ──────────────────────
    let viewPenalty = 0;
    const postInteractions = this.userHistory.filter(h => h.postId === signal.postId);
    const viewCount = postInteractions.filter(h => h.type === 'view').length;
    const hasUpvoted = postInteractions.some(h => h.type === 'upvote' || h.type === 'bookmark');
    const hasDownvoted = postInteractions.some(h => h.type === 'downvote');
    const hasSkipped = postInteractions.some(h => h.type === 'skip');

    if (hasDownvoted) {
      viewPenalty = 90;
      reasons.push(`🚫 You downvoted this post`);
    } else if (hasSkipped) {
      viewPenalty = 45;
      reasons.push(`⏭️ Previously skipped post`);
    } else if (viewCount > 0) {
      if (hasUpvoted) {
        viewPenalty = 10; // Light penalty to allow re-visiting favorites
        reasons.push(`🔖 Confirmed bookmark / previous upvote`);
      } else {
        viewPenalty = Math.min(60, viewCount * 18);
        reasons.push(`👁️ Previously viewed content (${viewCount} views)`);
      }
    }

    // ── 6. Flair & Channel Affinity Boosts ───────────────────────────────────
    if (signal.flair) {
      const flairVal = this.flairAffinities.get(signal.flair) || 0;
      if (flairVal > 5) {
        reasons.push(`🏷️ Category [${signal.flair}] matches your preferences`);
      }
    }

    // ── 7. Weighted Composite Score Formulation ─────────────────────────────
    // Weights: Topic (38%), Author (22%), Merit (20%), Freshness (20%)
    const rawComposite =
      topicScore * 0.38 +
      authorScore * 0.22 +
      meritScore * 0.20 +
      freshnessScore * 0.20;

    // Apply view/skip penalty
    const finalScore = Math.min(100, Math.max(1, Math.round(rawComposite - viewPenalty)));

    // Fallback reason if reasons list is empty
    if (reasons.length === 0) {
      reasons.push('🌱 Discovery content to diversify your sovereign feed');
    }

    const result: PersonalizationScore = {
      postId: signal.postId,
      relevanceScore: finalScore,
      reasons,
      breakdown: {
        topicScore: Math.round(topicScore),
        authorScore: Math.round(authorScore),
        meritScore: Math.round(meritScore),
        freshnessScore: Math.round(freshnessScore),
        viewPenalty: Math.round(viewPenalty),
      },
    };

    this.cachedScores.set(signal.postId, result);
    return result;
  }

  // ─── Feed Sorting ──────────────────────────────────────────────────────────

  public sortFeed(posts: ContentSignal[]): PersonalizationScore[] {
    if (!Array.isArray(posts)) return [];

    // Register all incoming signals
    for (const post of posts) {
      if (post && post.postId) {
        this.contentSignals.set(post.postId, post);
      }
    }

    if (this.isDirty) {
      this.computeTopicInterests();
    }

    // Score all posts
    const scoredList: PersonalizationScore[] = posts.map(p => this.scorePost(p));

    // Sort descending by relevance score
    scoredList.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scoredList;
  }

  // ─── Explanation API ───────────────────────────────────────────────────────

  public explainScore(postId: string): string[] {
    if (!postId) return ['Missing post identifier'];

    const cached = this.cachedScores.get(postId);
    if (cached) {
      return cached.reasons;
    }

    const signal = this.contentSignals.get(postId);
    if (signal) {
      const score = this.scorePost(signal);
      return score.reasons;
    }

    return ['New post — network discovery algorithm applied'];
  }

  // ─── Manual Controls & Data Sovereignty ───────────────────────────────────

  public setManualInterest(topic: string, weight: number): void {
    const normalized = this.normalizeTag(topic);
    const clampedWeight = Math.min(100, Math.max(0, weight));
    this.manualOverrides.set(normalized, clampedWeight);
    this.isDirty = true;
    this.cachedScores.clear();
    this.computeTopicInterests();
    this.saveToStorage();
  }

  public adjustInterest(topic: string, delta: number): void {
    const normalized = this.normalizeTag(topic);
    const current = this.topicInterests.get(normalized) || 50;
    this.setManualInterest(normalized, current + delta);
  }

  public muteTopic(topic: string): void {
    const normalized = this.normalizeTag(topic);
    this.mutedTags.add(normalized);
    this.manualOverrides.delete(normalized);
    this.isDirty = true;
    this.cachedScores.clear();
    this.computeTopicInterests();
    this.saveToStorage();
  }

  public unmuteTopic(topic: string): void {
    const normalized = this.normalizeTag(topic);
    this.mutedTags.delete(normalized);
    this.isDirty = true;
    this.cachedScores.clear();
    this.computeTopicInterests();
    this.saveToStorage();
  }

  public muteAuthor(authorFP: string): void {
    if (!authorFP) return;
    this.mutedAuthors.add(authorFP);
    this.isDirty = true;
    this.cachedScores.clear();
    this.computeTopicInterests();
    this.saveToStorage();
  }

  public unmuteAuthor(authorFP: string): void {
    if (!authorFP) return;
    this.mutedAuthors.delete(authorFP);
    this.isDirty = true;
    this.cachedScores.clear();
    this.computeTopicInterests();
    this.saveToStorage();
  }

  public resetInterests(): void {
    this.manualOverrides.clear();
    this.mutedAuthors.clear();
    this.mutedTags.clear();
    this.isDirty = true;
    this.cachedScores.clear();
    this.computeTopicInterests();
    this.saveToStorage();
  }

  public clearHistory(): void {
    this.userHistory = [];
    this.manualOverrides.clear();
    this.mutedAuthors.clear();
    this.mutedTags.clear();
    this.cachedScores.clear();
    this.seedDefaultsIfEmpty();
    this.isDirty = true;
    this.computeTopicInterests();
    this.saveToStorage();
  }

  public exportData(): string {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        userHistory: this.userHistory,
        manualOverrides: Array.from(this.manualOverrides.entries()),
        mutedAuthors: Array.from(this.mutedAuthors),
        mutedTags: Array.from(this.mutedTags),
        topicInterests: Array.from(this.topicInterests.entries()),
      },
      null,
      2
    );
  }

  public importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (Array.isArray(data.userHistory)) {
        this.userHistory = data.userHistory;
      }
      if (Array.isArray(data.manualOverrides)) {
        this.manualOverrides = new Map(data.manualOverrides);
      }
      if (Array.isArray(data.mutedAuthors)) {
        this.mutedAuthors = new Set(data.mutedAuthors);
      }
      if (Array.isArray(data.mutedTags)) {
        this.mutedTags = new Set(data.mutedTags);
      }
      this.isDirty = true;
      this.cachedScores.clear();
      this.computeTopicInterests();
      this.saveToStorage();
      return true;
    } catch {
      return false;
    }
  }

  // ─── Analytics & Statistics Helper ────────────────────────────────────────

  public getTopInterests(limit: number = 8): TopicAffinityItem[] {
    const list: TopicAffinityItem[] = [];
    for (const [tag, score] of this.topicInterests.entries()) {
      const count = this.userHistory.filter(h => {
        const s = this.contentSignals.get(h.postId);
        return s?.tags?.some(t => this.normalizeTag(t) === tag);
      }).length;

      const category = SEED_TOPICS[tag]?.category || 'General';

      list.push({
        topic: tag,
        score,
        percentage: Math.round(score),
        interactionCount: count,
        category,
      });
    }

    list.sort((a, b) => b.score - a.score);
    return list.slice(0, limit);
  }

  public getStats(): InteractionStats {
    let upvotes = 0;
    let downvotes = 0;
    let bookmarks = 0;
    let shares = 0;
    let comments = 0;
    let views = 0;
    let skips = 0;
    const authorSet = new Set<string>();

    for (const h of this.userHistory) {
      if (h.type === 'upvote') upvotes++;
      else if (h.type === 'downvote') downvotes++;
      else if (h.type === 'bookmark') bookmarks++;
      else if (h.type === 'share') shares++;
      else if (h.type === 'comment') comments++;
      else if (h.type === 'view') views++;
      else if (h.type === 'skip') skips++;

      const s = this.contentSignals.get(h.postId);
      if (s?.authorFP) authorSet.add(s.authorFP);
    }

    const topTopic = this.getTopInterests(1)[0]?.topic || '#ZeroKnowledge';

    return {
      totalInteractions: this.userHistory.length,
      upvotes,
      downvotes,
      bookmarks,
      shares,
      comments,
      views,
      skips,
      uniqueAuthorsCount: authorSet.size,
      topTopic,
    };
  }

  private normalizeTag(tag: string): string {
    if (!tag) return '';
    let clean = tag.trim();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    return clean;
  }

  // ---------------------------------------------------------------------------
  // 4. UI Renderers: Micro-Widgets & Sovereign Interests Panel
  // ---------------------------------------------------------------------------

  /**
   * Generates the expandable "Why am I seeing this?" badge and modal
   * for individual post cards in the feed.
   */
  public renderPersonalizationWidget(postId?: string): string {
    const targetPostId = postId || 'post-zk-01';
    const scoreObj = this.cachedScores.get(targetPostId) ||
      (this.contentSignals.has(targetPostId)
        ? this.scorePost(this.contentSignals.get(targetPostId)!)
        : {
            postId: targetPostId,
            relevanceScore: 88,
            reasons: [
              '🎯 High resonance with topics of interest: #ZeroKnowledge, #Cryptography',
              '⭐ High merit score across sovereign network (42 upvotes)',
              '⚡ Fresh content recently published to the network',
            ],
            breakdown: { topicScore: 92, authorScore: 80, meritScore: 84, freshnessScore: 95, viewPenalty: 0 },
          });

    const score = scoreObj.relevanceScore;
    const bd = scoreObj.breakdown || { topicScore: 85, authorScore: 70, meritScore: 80, freshnessScore: 90, viewPenalty: 0 };
    
    // Color dynamics based on score
    let scoreColor = 'text-cyphr';
    let badgeBg = 'bg-cyphr/10 border-cyphr/30 text-cyphr';
    let glowClass = 'shadow-[0_0_12px_rgba(0,229,255,0.15)]';
    
    if (score >= 80) {
      scoreColor = 'text-cyphr';
      badgeBg = 'bg-cyan-500/10 border-cyan-400/30 text-cyan-400';
    } else if (score >= 60) {
      scoreColor = 'text-signal';
      badgeBg = 'bg-emerald-500/10 border-emerald-400/30 text-emerald-400';
      glowClass = 'shadow-[0_0_12px_rgba(34,197,94,0.15)]';
    } else if (score >= 40) {
      scoreColor = 'text-amber';
      badgeBg = 'bg-amber-500/10 border-amber-400/30 text-amber-400';
      glowClass = 'shadow-[0_0_12px_rgba(245,158,11,0.15)]';
    } else {
      scoreColor = 'text-slate-400';
      badgeBg = 'bg-slate-700/30 border-slate-600/30 text-slate-400';
      glowClass = '';
    }

    const widgetUniqueId = `why-widget-${targetPostId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

    return `
      <!-- Sovereign Personalization Badge & Explainer -->
      <div class="relative inline-block text-left font-sans" data-personalization-post-id="${targetPostId}">
        <!-- Collapsed Trigger Pill -->
        <button
          type="button" data-action="call-global" data-raw-click="const pop = document.getElementById('${widgetUniqueId}');
            if (pop) pop.classList.toggle('hidden')"
          class="group inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${badgeBg} ${glowClass} hover:bg-surface-overlay hover:border-white/20 transition-all duration-200 cursor-pointer"
          title="Sovereign Recommendation Score: ${score}%. Click for full algorithmic breakdown."
        >
          <span class="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
          <span class="font-bold tracking-wide">${score}%</span>
          <span class="text-[10px] opacity-75 group-hover:opacity-100 flex items-center">
            <span>Relevance</span>
            <svg class="w-3 h-3 ml-0.5 transform group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        <!-- Expandable Transparent Explainer Popover -->
        <div
          id="${widgetUniqueId}"
          class="hidden absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-2xl bg-surface-raised/95 backdrop-blur-xl border border-white/10 p-4 shadow-2xl space-y-3.5 text-slate-200 animate-in fade-in zoom-in-95 duration-150"
          style="box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7), 0 0 20px rgba(0, 229, 255, 0.08);"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-subtle-b pb-2.5">
            <div class="flex items-center space-x-2">
              <div class="w-6 h-6 rounded-lg bg-surface-overlay border border-white/10 flex items-center justify-center text-xs">
                🧠
              </div>
              <div>
                <div class="text-xs font-bold text-slate-100 flex items-center space-x-1.5">
                  <span>Why am I seeing this?</span>
                  <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-overlay text-cyphr border border-cyphr/20">
                    Local TF-IDF
                  </span>
                </div>
                <div class="text-[10px] text-slate-400">Score computed strictly on your device</div>
              </div>
            </div>
            <button
              type="button" data-action="call-global" data-global-method="document.getElementById" data-global-args='["${widgetUniqueId}')?.classList.add('hidden"]'
              class="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-surface-overlay transition-colors"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Score Breakdown Radar Bars -->
          <div class="space-y-2 bg-surface-base/80 p-3 rounded-xl border border-white/5 font-mono text-[10px]">
            <div class="flex items-center justify-between text-slate-400 pb-1 border-subtle-b">
              <span>Relevance Factors</span>
              <span class="${scoreColor} font-bold text-xs">${score} / 100</span>
            </div>

            <!-- Topic Match Bar -->
            <div class="space-y-1">
              <div class="flex justify-between text-slate-300">
                <span class="flex items-center space-x-1">
                  <span>🎯</span>
                  <span>Topic Match (TF-IDF):</span>
                </span>
                <span class="text-cyphr font-bold">${bd.topicScore}%</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-surface-overlay overflow-hidden">
                <div class="h-full bg-gradient-to-r from-cyphr to-blue-500 rounded-full transition-all duration-500" style="width: ${bd.topicScore}%;"></div>
              </div>
            </div>

            <!-- Author Affinity Bar -->
            <div class="space-y-1">
              <div class="flex justify-between text-slate-300">
                <span class="flex items-center space-x-1">
                  <span>👤</span>
                  <span>Author Affinity:</span>
                </span>
                <span class="text-aether font-bold">${bd.authorScore}%</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-surface-overlay overflow-hidden">
                <div class="h-full bg-gradient-to-r from-aether to-purple-400 rounded-full transition-all duration-500" style="width: ${bd.authorScore}%;"></div>
              </div>
            </div>

            <!-- Community Merit Bar -->
            <div class="space-y-1">
              <div class="flex justify-between text-slate-300">
                <span class="flex items-center space-x-1">
                  <span>⭐</span>
                  <span>Merit Consensus:</span>
                </span>
                <span class="text-signal font-bold">${bd.meritScore}%</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-surface-overlay overflow-hidden">
                <div class="h-full bg-gradient-to-r from-signal to-emerald-400 rounded-full transition-all duration-500" style="width: ${bd.meritScore}%;"></div>
              </div>
            </div>

            <!-- Freshness Bar -->
            <div class="space-y-1">
              <div class="flex justify-between text-slate-300">
                <span class="flex items-center space-x-1">
                  <span>⚡</span>
                  <span>Temporal Freshness:</span>
                </span>
                <span class="text-amber font-bold">${bd.freshnessScore}%</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-surface-overlay overflow-hidden">
                <div class="h-full bg-gradient-to-r from-amber to-yellow-400 rounded-full transition-all duration-500" style="width: ${bd.freshnessScore}%;"></div>
              </div>
            </div>

            ${bd.viewPenalty > 0 ? `
              <!-- View Penalty -->
              <div class="flex justify-between text-crimson pt-1">
                <span class="flex items-center space-x-1">
                  <span>👁️</span>
                  <span>Re-view Penalty:</span>
                </span>
                <span class="font-bold">-${bd.viewPenalty} pts</span>
              </div>
            ` : ''}
          </div>

          <!-- Reason Bullets -->
          <div class="space-y-1.5">
            <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Identified Signals:</div>
            <div class="space-y-1 text-xs text-slate-300">
              ${scoreObj.reasons.map(r => `
                <div class="flex items-start space-x-2 bg-surface-overlay/60 p-2 rounded-lg border border-white/5">
                  <span class="text-cyphr mt-0.5">•</span>
                  <span class="leading-relaxed text-[11px]">${r}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Quick Feedback Buttons -->
          <div class="pt-2 border-subtle-b flex items-center justify-between gap-1.5">
            <button
              type="button"
              data-action="boost-post-topic"
              data-post-id="${targetPostId}"
              class="flex-1 py-1.5 px-2 rounded-lg bg-surface-overlay hover:bg-cyphr/20 border border-white/10 hover:border-cyphr/40 text-[10px] font-mono text-slate-200 hover:text-cyphr transition-colors text-center"
            >
              + More like this
            </button>
            <button
              type="button"
              data-action="dampen-post-topic"
              data-post-id="${targetPostId}"
              class="flex-1 py-1.5 px-2 rounded-lg bg-surface-overlay hover:bg-crimson/20 border border-white/10 hover:border-crimson/40 text-[10px] font-mono text-slate-200 hover:text-crimson transition-colors text-center"
            >
              - Less like this
            </button>
          </div>

          <!-- Footer Privacy Guarantee -->
          <div class="text-[9px] font-mono text-slate-500 flex items-center justify-between pt-1">
            <span class="flex items-center space-x-1">
              <span class="text-signal">●</span>
              <span>100% On-Device • Zero Cloud Tracking</span>
            </span>
            <button
              type="button" data-action="call-global" data-raw-click="const panel = document.getElementById('sovereign-interests-panel-modal');
                if (panel) panel.classList.remove('hidden');
                document.getElementById('${widgetUniqueId}')?.classList.add('hidden')"
              class="text-cyphr hover:underline"
            >
              Adjust Profile →
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generates the complete Sovereign Topic Interests Dashboard Panel
   * with animated bar graphs, manual sliders, topic tune controls, and data sovereignty actions.
   */
  public renderInterestsPanel(): string {
    const topInterests = this.getTopInterests(10);
    const stats = this.getStats();

    return `
      <!-- Sovereign Recommendation & Interests Panel -->
      <div id="sovereign-interests-panel" class="w-full rounded-2xl bg-surface-raised border border-white/10 p-5 space-y-6 text-slate-200 shadow-xl font-sans">
        
        <!-- Header Banner -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-subtle-b pb-5">
          <div class="space-y-1">
            <div class="flex items-center space-x-2.5">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-cyphr/20 to-aether/20 border border-cyphr/30 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                🧠
              </div>
              <div>
                <h2 class="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span>Sovereign Feed Personalization</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/20 font-normal">
                    Local Algorithm
                  </span>
                </h2>
                <p class="text-xs text-slate-400">
                  Local TF-IDF algorithm & Temporal Decay. Your data never leaves this device.
                </p>
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center space-x-2">
            <button
              type="button"
              id="btn-recompute-interests"
              class="px-3 py-1.5 rounded-xl bg-surface-overlay hover:bg-cyphr/20 border border-white/10 hover:border-cyphr/40 text-xs font-mono text-slate-200 hover:text-cyphr transition-all flex items-center space-x-1.5 shadow-sm"
              title="Recompute interest vector based on full local history"
            >
              <span>🔄</span>
              <span>Recompute</span>
            </button>
            <button
              type="button"
              id="btn-reset-interests"
              class="px-3 py-1.5 rounded-xl bg-surface-overlay hover:bg-crimson/20 border border-white/10 hover:border-crimson/40 text-xs font-mono text-slate-200 hover:text-crimson transition-all flex items-center space-x-1.5 shadow-sm"
              title="Reset manual adjustments"
            >
              <span>↺</span>
              <span>Reset</span>
            </button>
          </div>
        </div>

        <!-- Metric Statistics Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-surface-base p-3 rounded-xl border border-white/5 space-y-1">
            <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Interactions</div>
            <div class="text-lg font-bold font-mono text-cyphr">${stats.totalInteractions}</div>
            <div class="text-[10px] text-slate-400 font-mono">${stats.views} reads • ${stats.upvotes} upvotes</div>
          </div>

          <div class="bg-surface-base p-3 rounded-xl border border-white/5 space-y-1">
            <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Top Topic</div>
            <div class="text-sm font-bold font-mono text-aether truncate" title="${stats.topTopic}">${stats.topTopic}</div>
            <div class="text-[10px] text-slate-400 font-mono">${topInterests.length} active topics</div>
          </div>

          <div class="bg-surface-base p-3 rounded-xl border border-white/5 space-y-1">
            <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Engaged Authors</div>
            <div class="text-lg font-bold font-mono text-signal">${stats.uniqueAuthorsCount}</div>
            <div class="text-[10px] text-slate-400 font-mono">Decentralized trust</div>
          </div>

          <div class="bg-surface-base p-3 rounded-xl border border-white/5 space-y-1">
            <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Privacy Index</div>
            <div class="text-lg font-bold font-mono text-signal">100%</div>
            <div class="text-[10px] text-signal font-mono">0 Cloud Telemetry</div>
          </div>
        </div>

        <!-- Topic Affinities Visual Bar Chart Section -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <span>📊</span>
              <span>Topic & Tag Interest Scores</span>
            </div>
            <span class="text-[11px] font-mono text-slate-400">Direct weight adjustments</span>
          </div>

          <div class="space-y-3" id="topic-interests-bars-container">
            ${topInterests.map((item, idx) => {
              // Color gradient assignment based on rank and category
              let barGradient = 'from-cyphr to-blue-500';
              let textAccent = 'text-cyphr';
              if (idx === 1) {
                barGradient = 'from-aether to-purple-500';
                textAccent = 'text-aether';
              } else if (idx === 2) {
                barGradient = 'from-signal to-emerald-500';
                textAccent = 'text-signal';
              } else if (idx === 3) {
                barGradient = 'from-amber to-orange-500';
                textAccent = 'text-amber';
              }

              const isMuted = this.mutedTags.has(item.topic);
              const isOverridden = this.manualOverrides.has(item.topic);

              return `
                <div class="bg-surface-base p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors space-y-2 group">
                  <div class="flex items-center justify-between text-xs font-mono">
                    <div class="flex items-center space-x-2">
                      <span class="font-bold text-slate-200 group-hover:${textAccent} transition-colors">
                        ${item.topic}
                      </span>
                      <span class="text-[9px] px-1.5 py-0.5 rounded bg-surface-overlay text-slate-400">
                        ${item.category}
                      </span>
                      ${isOverridden ? `
                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-cyphr/10 text-cyphr border border-cyphr/20 font-bold">
                          Manual: ${item.percentage}%
                        </span>
                      ` : ''}
                      ${isMuted ? `
                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-crimson/10 text-crimson border border-crimson/20">
                          Muted
                        </span>
                      ` : ''}
                    </div>

                    <!-- Right Score & Interactive Tune Controls -->
                    <div class="flex items-center space-x-2">
                      <span class="font-bold ${textAccent}">${item.percentage}%</span>
                      <div class="flex items-center space-x-1 pl-2 border-l border-white/10">
                        <button
                          type="button"
                          data-action="decrease-topic"
                          data-topic="${item.topic}"
                          class="w-6 h-6 rounded bg-surface-overlay hover:bg-crimson/20 hover:text-crimson text-slate-400 flex items-center justify-center text-xs transition-colors"
                          title="Decrease interest for ${item.topic}"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          data-action="increase-topic"
                          data-topic="${item.topic}"
                          class="w-6 h-6 rounded bg-surface-overlay hover:bg-cyphr/20 hover:text-cyphr text-slate-400 flex items-center justify-center text-xs transition-colors"
                          title="Increase interest for ${item.topic}"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          data-action="toggle-mute-topic"
                          data-topic="${item.topic}"
                          class="w-6 h-6 rounded bg-surface-overlay hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center text-xs transition-colors"
                          title="${isMuted ? 'Unmute topic' : 'Mute completely from feed'}"
                        >
                          ${isMuted ? '👁️' : '🚫'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Animated Progress Bar -->
                  <div class="w-full h-2 rounded-full bg-surface-overlay overflow-hidden">
                    <div
                      class="h-full bg-gradient-to-r ${barGradient} rounded-full transition-all duration-700 ease-out ${isMuted ? 'opacity-20' : ''}"
                      style="width: ${isMuted ? '0' : item.percentage}%;"
                    ></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Add Custom Topic Override Form -->
        <div class="bg-surface-base p-4 rounded-xl border border-white/5 space-y-3">
          <div class="text-xs font-bold text-slate-300 flex items-center space-x-2">
            <span>➕</span>
            <span>Add or Adjust Topic Manually</span>
          </div>
          <div class="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              id="input-custom-topic-tag"
              placeholder="#TopicName (e.g. #ZK_SNARKs)"
              class="flex-1 w-full px-3 py-2 rounded-xl bg-surface-overlay border border-white/10 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyphr transition-colors"
            />
            <div class="flex items-center space-x-2 w-full sm:w-auto">
              <input
                type="range"
                id="input-custom-topic-weight"
                min="0"
                max="100"
                value="80"
                class="w-full sm:w-28 accent-cyphr cursor-pointer" data-input="call-global" data-raw-input="const lbl = document.getElementById('lbl-custom-weight'); if (lbl) lbl.textContent = this.value + '%'"
              />
              <span id="lbl-custom-weight" class="text-xs font-mono text-cyphr font-bold w-10 text-right">80%</span>
              <button
                type="button"
                id="btn-add-custom-topic"
                class="px-4 py-2 rounded-xl bg-cyphr/20 hover:bg-cyphr/30 border border-cyphr/40 text-cyphr text-xs font-mono font-bold transition-all shrink-0"
              >
                Set
              </button>
            </div>
          </div>
        </div>

        <!-- Data Sovereignty & Management Footer -->
        <div class="border-subtle-b pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-signal"></span>
            <span>Local Memory: ${this.userHistory.length} logged entries</span>
          </div>

          <div class="flex items-center space-x-2">
            <button
              type="button"
              id="btn-export-personalization"
              class="px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight text-slate-300 hover:text-slate-100 border border-white/10 transition-colors"
              title="Export your local profile as JSON"
            >
              📥 Export Data
            </button>
            <button
              type="button"
              id="btn-clear-personalization"
              class="px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-crimson/20 text-slate-300 hover:text-crimson border border-white/10 transition-colors"
              title="Permanently clear all navigation history and recommendations"
            >
              🗑️ Clear History
            </button>
          </div>
        </div>

      </div>
    `;
  }

  // ─── DOM Event Binding & Interactive Hookups ──────────────────────────────

  public bindEvents(container: HTMLElement | Document = typeof document !== 'undefined' ? document : (null as unknown as Document)): void {
    if (!container) return;

    // Delegate clicks for dynamic buttons
    container.addEventListener('click', (e: Event) => {
      const target = (e.target as HTMLElement)?.closest('button') as HTMLButtonElement | null;
      if (!target) return;

      const action = target.getAttribute('data-action');
      const topic = target.getAttribute('data-topic');
      const postId = target.getAttribute('data-post-id');

      if (action === 'increase-topic' && topic) {
        this.adjustInterest(topic, 10);
        this.refreshInterestsPanelInDOM();
      } else if (action === 'decrease-topic' && topic) {
        this.adjustInterest(topic, -10);
        this.refreshInterestsPanelInDOM();
      } else if (action === 'toggle-mute-topic' && topic) {
        if (this.mutedTags.has(topic)) {
          this.unmuteTopic(topic);
        } else {
          this.muteTopic(topic);
        }
        this.refreshInterestsPanelInDOM();
      } else if (action === 'boost-post-topic' && postId) {
        const sig = this.contentSignals.get(postId);
        if (sig && sig.tags) {
          for (const t of sig.tags) {
            this.adjustInterest(t, 15);
          }
        }
        this.trackInteraction({ postId, type: 'upvote', timestamp: Date.now(), dwellTimeMs: 15000 });
        this.refreshInterestsPanelInDOM();
      } else if (action === 'dampen-post-topic' && postId) {
        const sig = this.contentSignals.get(postId);
        if (sig && sig.tags) {
          for (const t of sig.tags) {
            this.adjustInterest(t, -15);
          }
        }
        this.trackInteraction({ postId, type: 'skip', timestamp: Date.now(), dwellTimeMs: 1000 });
        this.refreshInterestsPanelInDOM();
      }

      // Panel action buttons
      if (target.id === 'btn-recompute-interests') {
        this.computeTopicInterests();
        this.refreshInterestsPanelInDOM();
      } else if (target.id === 'btn-reset-interests') {
        this.resetInterests();
        this.refreshInterestsPanelInDOM();
      } else if (target.id === 'btn-clear-personalization') {
        sovereignDialog.confirm('Are you sure you want to completely reset personalization data on this device?', { title: 'Reset Personalization', destructive: true }).then(ok => {
          if (ok) {
            this.clearHistory();
            this.refreshInterestsPanelInDOM();
          }
        });
      } else if (target.id === 'btn-export-personalization') {
        const dataStr = this.exportData();
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aetheris-personalization-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (target.id === 'btn-add-custom-topic') {
        const tagInput = document.getElementById('input-custom-topic-tag') as HTMLInputElement | null;
        const weightInput = document.getElementById('input-custom-topic-weight') as HTMLInputElement | null;
        if (tagInput && tagInput.value.trim()) {
          const weight = weightInput ? parseInt(weightInput.value, 10) : 80;
          this.setManualInterest(tagInput.value.trim(), weight);
          tagInput.value = '';
          this.refreshInterestsPanelInDOM();
        }
      }
    });
  }

  private refreshInterestsPanelInDOM(): void {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('sovereign-interests-panel');
    if (existing && existing.parentElement) {
      const tempWrapper = document.createElement('div');
      tempWrapper.innerHTML = this.renderInterestsPanel();
      const newPanel = tempWrapper.firstElementChild;
      if (newPanel) {
        existing.parentElement.replaceChild(newPanel, existing);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Singleton Export
// ---------------------------------------------------------------------------

export const feedPersonalization = new FeedPersonalizationEngine();
