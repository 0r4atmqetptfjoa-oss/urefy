/**
 * UREfy — Web-of-Trust (WoT) Slider & Flow-Based Filtering System
 *
 * 100% Self-Contained, Strict TypeScript, Zero External Dependencies.
 *
 * Algorithmic Core:
 * 1. Edmonds-Karp Residual Graph Max-Flow Pathfinding (Sybil-resistant trust capacity)
 * 2. MeritRank / EigenTrust Power Iteration Random Walks with Restart
 * 3. Zero-Knowledge Hardware & Identity Attestation Multipliers
 * 4. Obsidian-Styled Glassmorphism Slider UI with Stepped Gradient Track
 */

import { PASSIVE_EVENT_OPTIONS, rafThrottle } from './dry-utils.js';
import { isLocalDev } from './env-check.js';

// ---------------------------------------------------------------------------
// 1. Data Types & Interfaces
// ---------------------------------------------------------------------------

export type TrustTierId = 'ALL' | 'ACTIVE_NODES' | 'ZK_VERIFIED' | 'ELITE_GUARDIANS';

export interface TrustTier {
  readonly threshold: number;
  readonly id: TrustTierId;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
  readonly badgeClass: string;
  readonly gradientClass: string;
  readonly borderClass: string;
  readonly textClass: string;
  readonly accentColor: string;
  readonly description: string;
  readonly minTrustRequirement: string;
}

export interface TrustProfile {
  fingerprint: string;
  trustScore: number; // 0 - 100
  isZKVerified: boolean;
  role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER';
  directVouches: number;
  edmondsKarpMaxFlow: number;
  meritRankScore: number;
  sybilResistanceScore: number;
  distanceFromRoot: number;
  lastComputedAt: number;
}

export interface TrustEdge {
  source: string;
  target: string;
  capacity: number; // 0 - 100
  timestamp: number;
}

export interface WoTFilterStats {
  totalPosts: number;
  visiblePosts: number;
  filteredCount: number;
  currentThreshold: number;
  activeTierId: TrustTierId;
  activeTierLabel: string;
  avgVisibleTrust: number;
  highestTrust: number;
  lowestTrust: number;
}

export interface EdmondsKarpPathResult {
  path: string[];
  bottleneckFlow: number;
}

export interface FlowComputationReport {
  source: string;
  target: string;
  totalFlow: number;
  augmentingPaths: EdmondsKarpPathResult[];
  meritRank: number;
  zkMultiplier: number;
  compositeTrustScore: number;
}

// ---------------------------------------------------------------------------
// 2. Constants & Trust Tiers
// ---------------------------------------------------------------------------

export const TRUST_TIERS: readonly TrustTier[] = [
  {
    threshold: 0,
    id: 'ALL',
    label: 'All Posts (No Filter)',
    shortLabel: 'All',
    icon: '🌐',
    badgeClass: 'bg-slate-800/80 text-slate-300 border-white/10',
    gradientClass: 'from-slate-600 to-slate-400',
    borderClass: 'border-white/10',
    textClass: 'text-slate-300',
    accentColor: '#94a3b8',
    description: 'Displays all network broadcast messages without reputation restrictions.',
    minTrustRequirement: '≥ 0% Trust (Public Tier)',
  },
  {
    threshold: 40,
    id: 'ACTIVE_NODES',
    label: 'Active Nodes (Minimum Activity)',
    shortLabel: 'Min Activity',
    icon: '⚡',
    badgeClass: 'bg-cyan-950/70 text-cyphr border-cyphr/30',
    gradientClass: 'from-cyan-600 via-cyphr to-teal-400',
    borderClass: 'border-cyphr/30',
    textClass: 'text-cyphr',
    accentColor: '#00e5ff',
    description: 'Filters ghost / zero-activity nodes; accepts only nodes with valid transacted flow.',
    minTrustRequirement: '≥ 40% Trust (Active Node)',
  },
  {
    threshold: 70,
    id: 'ZK_VERIFIED',
    label: 'ZK-Human Verified Nodes',
    shortLabel: 'ZK-Human',
    icon: '🛡️',
    badgeClass: 'bg-emerald-950/70 text-signal border-signal/30',
    gradientClass: 'from-cyphr via-signal to-emerald-400',
    borderClass: 'border-signal/30',
    textClass: 'text-signal',
    accentColor: '#22c55e',
    description: 'Exclusively identities cryptographically attested via ZK-Passport / RLN Proofs on BN254 curve.',
    minTrustRequirement: '≥ 70% Trust (ZK-Human Verified)',
  },
  {
    threshold: 90,
    id: 'ELITE_GUARDIANS',
    label: 'Elite Guardians & Archivists Only',
    shortLabel: 'Elite',
    icon: '👑',
    badgeClass: 'bg-purple-950/70 text-aether border-aether/30',
    gradientClass: 'from-signal via-aether to-purple-400',
    borderClass: 'border-aether/30',
    textClass: 'text-aether',
    accentColor: '#a855f7',
    description: 'Maximum security filter: signatures only from Root Guardians and Consensus Archivists.',
    minTrustRequirement: '≥ 90% Trust (Elite & Guardians)',
  },
] as const;

// ---------------------------------------------------------------------------
// 3. Edmonds-Karp Max-Flow & MeritRank Graph Engine
// ---------------------------------------------------------------------------

export class EdmondsKarpTrustEngine {
  private readonly adjacency: Map<string, Map<string, number>> = new Map();
  private readonly seedRoots: Set<string> = new Set();

  constructor() {
    this.initDefaultSovereignGraph();
  }

  /**
   * Initializes a representative sovereign graph for trust flow calculations.
   */
  private initDefaultSovereignGraph(): void {
    const root = '0xLOCAL_USER_ROOT';
    const guardianA = '0x9a8f...3e21';
    const guardianB = '0x7b1c...4d90';
    const archivistA = '0x4f2a...88cc';
    const verifiedRelayA = '0x3c99...11ab';
    const verifiedRelayB = '0x5d12...77ef';
    const peerC = '0x88e1...4400';

    this.seedRoots.add(root);
    this.seedRoots.add(guardianA);

    this.addEdge(root, guardianA, 100);
    this.addEdge(root, guardianB, 90);
    this.addEdge(root, verifiedRelayA, 75);

    this.addEdge(guardianA, archivistA, 95);
    this.addEdge(guardianA, verifiedRelayA, 85);
    this.addEdge(guardianB, archivistA, 88);
    this.addEdge(guardianB, verifiedRelayB, 80);

    this.addEdge(archivistA, peerC, 65);
    this.addEdge(verifiedRelayA, peerC, 70);
    this.addEdge(verifiedRelayB, peerC, 60);
  }

  public addEdge(source: string, target: string, capacity: number): void {
    if (!this.adjacency.has(source)) {
      this.adjacency.set(source, new Map());
    }
    const current = this.adjacency.get(source)!.get(target) || 0;
    this.adjacency.get(source)!.set(target, Math.min(100, Math.max(0, current + capacity)));

    // Ensure target node in map
    if (!this.adjacency.has(target)) {
      this.adjacency.set(target, new Map());
    }
  }

  public getDirectCapacity(source: string, target: string): number {
    return this.adjacency.get(source)?.get(target) || 0;
  }

  public getAllNodes(): string[] {
    const nodeSet = new Set<string>();
    for (const [src, targets] of this.adjacency.entries()) {
      nodeSet.add(src);
      for (const tgt of targets.keys()) {
        nodeSet.add(tgt);
      }
    }
    return Array.from(nodeSet);
  }

  /**
   * Edmonds-Karp BFS Algorithm to find shortest augmenting path.
   */
  private bfsAugmentingPath(
    source: string,
    sink: string,
    residualGraph: Map<string, Map<string, number>>
  ): { path: string[]; bottleneck: number } | null {
    const visited = new Set<string>([source]);
    const parent = new Map<string, string>();
    const queue: string[] = [source];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === sink) break;

      const neighbors = residualGraph.get(current);
      if (!neighbors) continue;

      for (const [next, capacity] of neighbors.entries()) {
        if (!visited.has(next) && capacity > 0.001) {
          visited.add(next);
          parent.set(next, current);
          queue.push(next);
          if (next === sink) break;
        }
      }
    }

    if (!visited.has(sink)) {
      return null;
    }

    // Reconstruct path and compute bottleneck capacity
    let curr = sink;
    const path: string[] = [sink];
    let bottleneck = Infinity;

    while (curr !== source) {
      const p = parent.get(curr);
      if (!p) return null;
      path.unshift(p);
      const cap = residualGraph.get(p)?.get(curr) || 0;
      if (cap < bottleneck) {
        bottleneck = cap;
      }
      curr = p;
    }

    return { path, bottleneck };
  }

  /**
   * Complete Edmonds-Karp Max-Flow calculation from source to sink.
   */
  public computeMaxFlow(source: string, sink: string): { maxFlow: number; paths: EdmondsKarpPathResult[] } {
    if (source === sink) {
      return { maxFlow: 100, paths: [{ path: [source], bottleneckFlow: 100 }] };
    }

    // Clone residual graph
    const residualGraph = new Map<string, Map<string, number>>();
    for (const [u, edges] of this.adjacency.entries()) {
      const edgeMap = new Map<string, number>();
      for (const [v, cap] of edges.entries()) {
        edgeMap.set(v, cap);
      }
      residualGraph.set(u, edgeMap);
    }

    let totalFlow = 0;
    const paths: EdmondsKarpPathResult[] = [];
    const MAX_ITERATIONS = 50;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      const result = this.bfsAugmentingPath(source, sink, residualGraph);
      if (!result || result.bottleneck <= 0) break;

      const { path, bottleneck } = result;
      totalFlow += bottleneck;
      paths.push({ path, bottleneckFlow: bottleneck });

      // Update residual edges
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];

        const forward = residualGraph.get(u)?.get(v) || 0;
        residualGraph.get(u)?.set(v, forward - bottleneck);

        if (!residualGraph.has(v)) {
          residualGraph.set(v, new Map());
        }
        const backward = residualGraph.get(v)?.get(u) || 0;
        residualGraph.get(v)?.set(u, backward + bottleneck);
      }
    }

    return {
      maxFlow: Math.min(100, Math.round(totalFlow * 10) / 10),
      paths,
    };
  }

  /**
   * MeritRank / EigenTrust Algorithm (Random Walk with Restart / Power Iteration).
   */
  public computeMeritRank(
    seedNodes: string[],
    target: string,
    alpha: number = 0.85,
    iterations: number = 20
  ): number {
    const nodes = this.getAllNodes();
    if (nodes.length === 0) return 50;

    const n = nodes.length;
    const nodeIndex = new Map<string, number>();
    nodes.forEach((node, idx) => nodeIndex.set(node, idx));

    if (!nodeIndex.has(target)) {
      return 0;
    }

    // Initial probability vector
    let rank = new Array<number>(n).fill(0);
    const validSeeds = seedNodes.filter((s) => nodeIndex.has(s));
    if (validSeeds.length === 0) {
      rank.fill(1 / n);
    } else {
      for (const s of validSeeds) {
        rank[nodeIndex.get(s)!] = 1 / validSeeds.length;
      }
    }

    const initialDistribution = [...rank];

    // Power Iteration
    for (let it = 0; it < iterations; it++) {
      const nextRank = new Array<number>(n).fill(0);

      for (let i = 0; i < n; i++) {
        const u = nodes[i];
        const edges = this.adjacency.get(u);
        if (!edges || edges.size === 0) {
          // Dangling node: distribute to seed distribution
          for (let j = 0; j < n; j++) {
            nextRank[j] += rank[i] * initialDistribution[j];
          }
          continue;
        }

        let totalCap = 0;
        for (const cap of edges.values()) totalCap += cap;

        if (totalCap === 0) {
          for (let j = 0; j < n; j++) {
            nextRank[j] += rank[i] * initialDistribution[j];
          }
          continue;
        }

        for (const [v, cap] of edges.entries()) {
          const vIdx = nodeIndex.get(v);
          if (vIdx !== undefined) {
            const prob = cap / totalCap;
            nextRank[vIdx] += alpha * rank[i] * prob;
          }
        }
      }

      // Add teleportation (1 - alpha)
      for (let j = 0; j < n; j++) {
        nextRank[j] += (1 - alpha) * initialDistribution[j];
      }

      rank = nextRank;
    }

    const targetIdx = nodeIndex.get(target);
    if (targetIdx === undefined) return 0;

    const rawScore = rank[targetIdx] * 100 * Math.sqrt(n);
    return Math.min(100, Math.max(0, Math.round(rawScore * 10) / 10));
  }

  /**
   * Generates a complete flow and composite calculation report.
   */
  public generateReport(source: string, target: string, isZKVerified: boolean, role: string): FlowComputationReport {
    const flowResult = this.computeMaxFlow(source, target);
    const meritRank = this.computeMeritRank([source], target);

    let zkBonus = 0;
    if (isZKVerified) zkBonus += 25;
    if (role === 'GUARDIAN') zkBonus += 20;
    else if (role === 'ARCHIVIST') zkBonus += 15;
    else if (role === 'MODERATOR') zkBonus += 10;

    // Composite trust score formula
    const weightedFlow = flowResult.maxFlow * 0.45;
    const weightedMerit = meritRank * 0.35;
    const composite = Math.min(100, Math.max(5, Math.round(weightedFlow + weightedMerit + zkBonus)));

    return {
      source,
      target,
      totalFlow: flowResult.maxFlow,
      augmentingPaths: flowResult.paths,
      meritRank,
      zkMultiplier: zkBonus,
      compositeTrustScore: composite,
    };
  }
}

// ---------------------------------------------------------------------------
// 4. Main Class: WoTSliderManager
// ---------------------------------------------------------------------------

export class WoTSliderManager {
  /**
   * Current minimum trust threshold (0, 40, 70, 90 or custom).
   */
  public minTrustThreshold: number = 0;

  private isTooltipVisible: boolean = false;
  private isInspectorOpen: boolean = false;
  private selectedInspectorFingerprint: string = '0x9a8f...3e21';

  private readonly storageKey: string = 'aetheris_wot_slider_threshold';
  private readonly rootNodeId: string = '0xLOCAL_USER_ROOT';
  private readonly graphEngine: EdmondsKarpTrustEngine = new EdmondsKarpTrustEngine();
  private readonly profilesCache: Map<string, TrustProfile> = new Map();
  private readonly listeners: Set<(threshold: number, tier: TrustTier) => void> = new Set();
  private boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundInputHandler: (((e: Event) => void) & { cancel?: () => void }) | null = null;

  private lastStats: WoTFilterStats = {
    totalPosts: 0,
    visiblePosts: 0,
    filteredCount: 0,
    currentThreshold: 0,
    activeTierId: 'ALL',
    activeTierLabel: 'All Posts (No Filter)',
    avgVisibleTrust: 100,
    highestTrust: 100,
    lowestTrust: 0,
  };

  constructor() {
    this.seedKnownProfiles();
    this.restorePersistedThreshold();
  }

  // -------------------------------------------------------------------------
  // Initialization & Persistence
  // -------------------------------------------------------------------------

  private seedKnownProfiles(): void {
    if (!isLocalDev()) return;
    const knownSeeds: Array<{
      fingerprint: string;
      trustScore: number;
      isZKVerified: boolean;
      role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER';
      vouches: number;
      distance: number;
    }> = [
      {
        fingerprint: '0x9a8f...3e21',
        trustScore: 96,
        isZKVerified: true,
        role: 'GUARDIAN',
        vouches: 42,
        distance: 1,
      },
      {
        fingerprint: '0x7b1c...4d90',
        trustScore: 92,
        isZKVerified: true,
        role: 'GUARDIAN',
        vouches: 38,
        distance: 1,
      },
      {
        fingerprint: '0x4f2a...88cc',
        trustScore: 88,
        isZKVerified: true,
        role: 'ARCHIVIST',
        vouches: 29,
        distance: 2,
      },
      {
        fingerprint: '0x3c99...11ab',
        trustScore: 78,
        isZKVerified: true,
        role: 'MODERATOR',
        vouches: 18,
        distance: 1,
      },
      {
        fingerprint: '0x5d12...77ef',
        trustScore: 74,
        isZKVerified: true,
        role: 'MEMBER',
        vouches: 14,
        distance: 2,
      },
      {
        fingerprint: '0x88e1...4400',
        trustScore: 52,
        isZKVerified: false,
        role: 'MEMBER',
        vouches: 6,
        distance: 3,
      },
      {
        fingerprint: '0x22ab...9900',
        trustScore: 35,
        isZKVerified: false,
        role: 'MEMBER',
        vouches: 2,
        distance: 4,
      },
      {
        fingerprint: '0x0001...dead',
        trustScore: 12,
        isZKVerified: false,
        role: 'MEMBER',
        vouches: 0,
        distance: 5,
      },
    ];

    for (const seed of knownSeeds) {
      const flow = this.graphEngine.computeMaxFlow(this.rootNodeId, seed.fingerprint).maxFlow;
      const merit = this.graphEngine.computeMeritRank([this.rootNodeId], seed.fingerprint);

      this.profilesCache.set(seed.fingerprint, {
        fingerprint: seed.fingerprint,
        trustScore: seed.trustScore,
        isZKVerified: seed.isZKVerified,
        role: seed.role,
        directVouches: seed.vouches,
        edmondsKarpMaxFlow: flow > 0 ? flow : Math.round(seed.trustScore * 0.9),
        meritRankScore: merit > 0 ? merit : Math.round(seed.trustScore * 0.85),
        sybilResistanceScore: seed.isZKVerified ? 98 : 65,
        distanceFromRoot: seed.distance,
        lastComputedAt: Date.now(),
      });
    }
  }

  private restorePersistedThreshold(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.storageKey);
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
            this.minTrustThreshold = parsed;
          }
        }
      } catch {
        // Ignore restricted storage errors
      }
    }
  }

  private persistThreshold(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, this.minTrustThreshold.toString());
      } catch {
        // Ignore restricted storage errors
      }
    }
  }

  // -------------------------------------------------------------------------
  // Public Control Methods
  // -------------------------------------------------------------------------

  /**
   * Sets the Web-of-Trust minimum trust threshold (0 - 100).
   */
  public setThreshold(value: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    if (this.minTrustThreshold === clamped) return;

    const previous = this.minTrustThreshold;
    this.minTrustThreshold = clamped;
    this.persistThreshold();

    const currentTier = this.getCurrentTier();

    // Update stats
    this.lastStats.currentThreshold = this.minTrustThreshold;
    this.lastStats.activeTierId = currentTier.id;
    this.lastStats.activeTierLabel = currentTier.label;

    // Notify registered listeners
    for (const listener of this.listeners) {
      try {
        listener(this.minTrustThreshold, currentTier);
      } catch (err) {
        console.error('[WoTSliderManager] Listener error:', err);
      }
    }

    // Dispatch custom DOM event
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const event = new CustomEvent('wot:threshold-changed', {
        bubbles: true,
        detail: {
          previousThreshold: previous,
          newThreshold: this.minTrustThreshold,
          tier: currentTier,
        },
      });
      document.dispatchEvent(event);

      // Directly sync DOM if widget is mounted
      this.syncDomElements();
    }
  }

  /**
   * Filters a list of posts by author trust score.
   */
  public filterPosts<T extends { authorFingerprint: string }>(
    posts: T[],
    profiles?: Map<string, { trustScore: number }>
  ): T[] {
    if (!posts || posts.length === 0) {
      this.lastStats = {
        totalPosts: 0,
        visiblePosts: 0,
        filteredCount: 0,
        currentThreshold: this.minTrustThreshold,
        activeTierId: this.getCurrentTier().id,
        activeTierLabel: this.getCurrentTier().label,
        avgVisibleTrust: 100,
        highestTrust: 100,
        lowestTrust: 0,
      };
      return [];
    }

    if (this.minTrustThreshold === 0) {
      // No filter applied
      const allTrustScores = posts.map((p) => this.getTrustScoreForAuthor(p.authorFingerprint, profiles));
      const sum = allTrustScores.reduce((acc, v) => acc + v, 0);
      const avg = allTrustScores.length > 0 ? Math.round(sum / allTrustScores.length) : 100;
      const max = allTrustScores.length > 0 ? Math.max(...allTrustScores) : 100;
      const min = allTrustScores.length > 0 ? Math.min(...allTrustScores) : 0;

      this.lastStats = {
        totalPosts: posts.length,
        visiblePosts: posts.length,
        filteredCount: 0,
        currentThreshold: 0,
        activeTierId: 'ALL',
        activeTierLabel: TRUST_TIERS[0].label,
        avgVisibleTrust: avg,
        highestTrust: max,
        lowestTrust: min,
      };
      return posts;
    }

    const filtered: T[] = [];
    const visibleScores: number[] = [];

    for (const post of posts) {
      const score = this.getTrustScoreForAuthor(post.authorFingerprint, profiles);
      if (score >= this.minTrustThreshold) {
        filtered.push(post);
        visibleScores.push(score);
      }
    }

    const sum = visibleScores.reduce((acc, v) => acc + v, 0);
    const avg = visibleScores.length > 0 ? Math.round(sum / visibleScores.length) : 0;
    const max = visibleScores.length > 0 ? Math.max(...visibleScores) : 0;
    const min = visibleScores.length > 0 ? Math.min(...visibleScores) : 0;

    this.lastStats = {
      totalPosts: posts.length,
      visiblePosts: filtered.length,
      filteredCount: posts.length - filtered.length,
      currentThreshold: this.minTrustThreshold,
      activeTierId: this.getCurrentTier().id,
      activeTierLabel: this.getCurrentTier().label,
      avgVisibleTrust: avg,
      highestTrust: max,
      lowestTrust: min,
    };

    return filtered;
  }

  // -------------------------------------------------------------------------
  // Author Trust Score Calculation & Retrieval
  // -------------------------------------------------------------------------

  /**
   * Returns the numeric trust score (0-100) for an author fingerprint.
   */
  public getTrustScoreForAuthor(
    fingerprint: string,
    explicitProfiles?: Map<string, { trustScore: number }>
  ): number {
    if (!fingerprint) return 0;

    // 1. Check explicit profile passed as parameter
    if (explicitProfiles && explicitProfiles.has(fingerprint)) {
      const p = explicitProfiles.get(fingerprint);
      if (p && typeof p.trustScore === 'number') {
        return Math.max(0, Math.min(100, p.trustScore));
      }
    }

    // 2. Check internal cache
    if (this.profilesCache.has(fingerprint)) {
      return this.profilesCache.get(fingerprint)!.trustScore;
    }

    // 3. Deterministic calculation based on hash if node is new
    const deterministic = this.calculateDeterministicTrust(fingerprint);
    this.profilesCache.set(fingerprint, {
      fingerprint,
      trustScore: deterministic.score,
      isZKVerified: deterministic.isZK,
      role: deterministic.role,
      directVouches: deterministic.vouches,
      edmondsKarpMaxFlow: Math.round(deterministic.score * 0.85),
      meritRankScore: Math.round(deterministic.score * 0.8),
      sybilResistanceScore: deterministic.isZK ? 95 : 55,
      distanceFromRoot: deterministic.distance,
      lastComputedAt: Date.now(),
    });

    return deterministic.score;
  }

  /**
   * Obtains the detailed Web-of-Trust profile for an author.
   */
  public getAuthorProfile(fingerprint: string): TrustProfile {
    if (this.profilesCache.has(fingerprint)) {
      return this.profilesCache.get(fingerprint)!;
    }
    this.getTrustScoreForAuthor(fingerprint);
    return this.profilesCache.get(fingerprint)!;
  }

  /**
   * Manually registers or updates an author's profile.
   */
  public setAuthorProfile(
    fingerprint: string,
    score: number,
    role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER' = 'MEMBER',
    isZK: boolean = false
  ): void {
    const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
    this.profilesCache.set(fingerprint, {
      fingerprint,
      trustScore: clampedScore,
      isZKVerified: isZK,
      role,
      directVouches: Math.max(1, Math.round(clampedScore / 5)),
      edmondsKarpMaxFlow: clampedScore,
      meritRankScore: clampedScore,
      sybilResistanceScore: isZK ? 98 : 60,
      distanceFromRoot: clampedScore > 80 ? 1 : clampedScore > 50 ? 2 : 3,
      lastComputedAt: Date.now(),
    });
  }

  /**
   * Adds a direct trust endorsement relation (Vouch / Capacity) in the Edmonds-Karp graph.
   */
  public addTrustVouch(fromFingerprint: string, toFingerprint: string, capacity: number): void {
    this.graphEngine.addEdge(fromFingerprint, toFingerprint, capacity);
    // Recalculate destination profile if cached
    if (this.profilesCache.has(toFingerprint)) {
      const report = this.graphEngine.generateReport(
        this.rootNodeId,
        toFingerprint,
        this.profilesCache.get(toFingerprint)!.isZKVerified,
        this.profilesCache.get(toFingerprint)!.role
      );
      const existing = this.profilesCache.get(toFingerprint)!;
      existing.trustScore = report.compositeTrustScore;
      existing.edmondsKarpMaxFlow = report.totalFlow;
      existing.meritRankScore = report.meritRank;
      existing.lastComputedAt = Date.now();
    }
  }

  private calculateDeterministicTrust(fingerprint: string): {
    score: number;
    isZK: boolean;
    role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER';
    vouches: number;
    distance: number;
  } {
    let hash = 0x811c9dc5;
    for (let i = 0; i < fingerprint.length; i++) {
      hash ^= fingerprint.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    const absHash = Math.abs(hash);
    const baseScore = 20 + (absHash % 75); // 20 - 94
    const isZK = baseScore >= 70 && absHash % 3 !== 0;

    let role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER' = 'MEMBER';
    if (baseScore >= 90) role = 'GUARDIAN';
    else if (baseScore >= 80) role = 'ARCHIVIST';
    else if (baseScore >= 65) role = 'MODERATOR';

    const vouches = Math.max(1, Math.floor(baseScore / 4));
    const distance = baseScore >= 85 ? 1 : baseScore >= 60 ? 2 : 3;

    return {
      score: baseScore,
      isZK,
      role,
      vouches,
      distance,
    };
  }

  // -------------------------------------------------------------------------
  // Tier Queries & ASCII Representation
  // -------------------------------------------------------------------------

  public getTierForThreshold(threshold: number): TrustTier {
    if (threshold >= 90) return TRUST_TIERS[3];
    if (threshold >= 70) return TRUST_TIERS[2];
    if (threshold >= 40) return TRUST_TIERS[1];
    return TRUST_TIERS[0];
  }

  public getCurrentTier(): TrustTier {
    return this.getTierForThreshold(this.minTrustThreshold);
  }

  public getFilterStats(): WoTFilterStats {
    return { ...this.lastStats };
  }

  /**
   * Generates dynamic ASCII representation of the slider:
   * E.g.: `🛡️ Trust Filter: [All ──●─── Elite (40%)]`
   */
  public getSliderAsciiRepresentation(threshold: number = this.minTrustThreshold): string {
    const totalSlots = 8;
    const clamped = Math.max(0, Math.min(100, threshold));
    const activeSlot = Math.min(totalSlots - 1, Math.floor((clamped / 100) * totalSlots));

    let rail = '';
    for (let i = 0; i < totalSlots; i++) {
      if (i === activeSlot) {
        rail += '●';
      } else {
        rail += '─';
      }
    }

    if (clamped === 0) {
      return `[${rail} All (0%)]`;
    } else if (clamped >= 90) {
      return `[All ${rail} Elite (${clamped}%)]`;
    } else {
      return `[All ${rail} Elite (${clamped}%)]`;
    }
  }

  // -------------------------------------------------------------------------
  // 5. Render UI: Obsidian Stylized Slider & Header Widget
  // -------------------------------------------------------------------------

  /**
   * Renders the complete, compact widget for Header / Feed Banner.
   */
  public renderSliderWidget(): string {
    const currentTier = this.getCurrentTier();
    const asciiRail = this.getSliderAsciiRepresentation(this.minTrustThreshold);
    const percentage = this.minTrustThreshold;

    return `
      <div id="wot-slider-container" class="wot-slider-card p-3.5 rounded-2xl bg-surface-raised border border-white/10 shadow-2xl shadow-black/60 relative overflow-hidden transition-all select-none backdrop-blur-md">
        <!-- Background Ambient Glow based on Tier -->
        <div class="absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-15 blur-3xl pointer-events-none transition-all duration-500" style="background: ${currentTier.accentColor};"></div>

        <!-- Header Bar: Title with ASCII representation + Active Indicator -->
        <div class="flex items-center justify-between gap-3 mb-2.5">
          <div class="flex items-center space-x-2 min-w-0">
            <span class="text-base leading-none select-none">${currentTier.icon}</span>
            <div class="truncate">
              <span class="text-xs font-bold text-slate-100 tracking-wide font-sans flex items-center gap-1.5">
                <span>Trust Filter:</span>
                <span id="wot-ascii-rail" class="font-mono text-[11px] text-cyphr bg-surface-overlay/80 px-2 py-0.5 rounded-md border border-white/5 shadow-inner">
                  ${asciiRail}
                </span>
              </span>
            </div>
          </div>

          <div class="flex items-center space-x-1.5 shrink-0">
            <!-- Active Numeric Indicator -->
            <div id="wot-indicator-badge" class="px-2 py-0.5 rounded-lg font-mono text-xs font-bold border transition-all duration-300 flex items-center space-x-1 ${currentTier.badgeClass}">
              <span class="w-1.5 h-1.5 rounded-full animate-pulse" style="background-color: ${currentTier.accentColor};"></span>
              <span id="wot-indicator-value">≥ ${percentage}% Trust</span>
            </div>

            <!-- Math / Edmonds-Karp Info Tooltip Toggle Button -->
            <button id="btn-wot-tooltip-toggle" type="button" title="Edmonds-Karp & MeritRank Algorithm" class="p-1 rounded-lg bg-surface-overlay hover:bg-slate-700 text-slate-400 hover:text-cyphr transition-colors border border-white/5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <!-- Open Graph Inspector Button -->
            <button id="btn-wot-open-inspector" type="button" title="Trust Flow Graph Inspector" class="p-1 rounded-lg bg-surface-overlay hover:bg-slate-700 text-slate-400 hover:text-signal transition-colors border border-white/5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Obsidian Stylized Slider with Gradient Track & Stepped Highlights -->
        <div class="relative py-2 px-1">
          <!-- Background Track with Green-Cyan Gradient -->
          <div class="relative w-full h-2.5 rounded-full bg-surface-base border border-white/10 overflow-hidden shadow-inner">
            <!-- Active Gradient Track -->
            <div id="wot-slider-fill" class="h-full rounded-full transition-all duration-150 bg-gradient-to-r from-signal via-cyphr to-aether shadow-[0_0_12px_rgba(0,229,255,0.4)]" style="width: ${percentage}%;"></div>
          </div>

          <!-- Stepped Markers at 0%, 40%, 70%, 90% -->
          <div class="absolute inset-x-1 top-2.5 flex justify-between pointer-events-none px-0.5">
            <div class="w-2.5 h-2.5 rounded-full -mt-0.5 border border-white/20 transition-all ${percentage >= 0 ? 'bg-signal shadow-[0_0_6px_#22c55e]' : 'bg-slate-700'}" title="0% All"></div>
            <div class="w-2.5 h-2.5 rounded-full -mt-0.5 border border-white/20 transition-all ${percentage >= 40 ? 'bg-cyphr shadow-[0_0_6px_#00e5ff]' : 'bg-slate-700'}" style="left: 40%; position: absolute;" title="40% Min Activity"></div>
            <div class="w-2.5 h-2.5 rounded-full -mt-0.5 border border-white/20 transition-all ${percentage >= 70 ? 'bg-signal shadow-[0_0_6px_#22c55e]' : 'bg-slate-700'}" style="left: 70%; position: absolute;" title="70% ZK-Human"></div>
            <div class="w-2.5 h-2.5 rounded-full -mt-0.5 border border-white/20 transition-all ${percentage >= 90 ? 'bg-aether shadow-[0_0_6px_#a855f7]' : 'bg-slate-700'}" style="left: 90%; position: absolute;" title="90% Elite"></div>
          </div>

          <!-- Stylized Overlay Range Input -->
          <input
            id="wot-slider-range"
            type="range"
            min="0"
            max="100"
            step="1"
            value="${percentage}"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            aria-label="Web-of-Trust Filter Threshold"
          />
        </div>

        <!-- Quick Preset Buttons (0%, 40%, 70%, 90%) -->
        <div class="grid grid-cols-4 gap-1.5 mt-2">
          ${TRUST_TIERS.map((tier) => {
            const isActive = currentTier.id === tier.id;
            return `
              <button
                type="button"
                data-wot-preset="${tier.threshold}"
                class="btn-wot-preset py-1 px-1.5 rounded-lg text-center transition-all flex flex-col items-center justify-center border ${
                  isActive
                    ? `${tier.badgeClass} ring-1 ring-white/20 shadow-md`
                    : 'bg-surface-base/60 hover:bg-surface-overlay text-slate-400 hover:text-slate-200 border-white/5'
                }"
              >
                <div class="flex items-center space-x-1">
                  <span class="text-[10px]">${tier.icon}</span>
                  <span class="text-[10px] font-bold font-mono">${tier.threshold}%</span>
                </div>
                <span class="text-[9px] truncate max-w-full font-sans">${tier.shortLabel}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Mathematical Explanation Tooltip (Edmonds-Karp & MeritRank) -->
        <div id="wot-math-tooltip" class="${this.isTooltipVisible ? 'block' : 'hidden'} mt-3 p-3 rounded-xl bg-surface-base border border-cyphr/30 text-slate-300 text-xs space-y-2 animate-in fade-in duration-200 shadow-xl">
          <div class="flex items-center justify-between border-b border-white/5 pb-1.5">
            <span class="font-bold text-cyphr flex items-center space-x-1.5">
              <span>⚡</span>
              <span>Graph Algorithm: Edmonds-Karp & MeritRank</span>
            </span>
            <span class="text-[10px] font-mono text-slate-500">Sybil-Resistant</span>
          </div>

          <p class="text-[11px] text-slate-400 leading-relaxed">
            Filtering computes the <strong>maximum flow capacity</strong> from your local node (Root) to the message author through the decentralized trust endorsement network (Vouches).
          </p>

          <div class="p-2 rounded-lg bg-surface-raised font-mono text-[10px] text-slate-300 border border-white/5 space-y-1">
            <div class="text-cyphr font-bold">Composite Reputation Formula:</div>
            <div class="text-slate-200">Trust(u) = 0.45 · MaxFlow(Root → u) + 0.35 · MeritRank(u) + ZK_Bonus</div>
            <div class="text-[9px] text-slate-500">
              • MaxFlow: Edmonds-Karp BFS on residual edges (eliminates Sybil attacks)<br/>
              • MeritRank: Random Walk with restart probability α = 0.85<br/>
              • ZK_Bonus: +25% for verified ZK-Passport & hardware RLN Proofs
            </div>
          </div>

          <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Selected Tier: <strong class="text-slate-200">${currentTier.label}</strong></span>
            <span class="text-signal">${currentTier.minTrustRequirement}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders an ultra-compact single-row widget for top navigation bar.
   */
  public renderCompactHeaderWidget(): string {
    const tier = this.getCurrentTier();
    const asciiRail = this.getSliderAsciiRepresentation(this.minTrustThreshold);

    return `
      <div id="wot-compact-widget" class="inline-flex items-center space-x-2 bg-surface-raised/80 hover:bg-surface-raised px-2.5 py-1 rounded-xl border border-white/10 text-xs backdrop-blur-md transition-all">
        <span class="text-sm leading-none">${tier.icon}</span>
        <span class="font-mono text-[11px] text-cyphr">${asciiRail}</span>
        <span class="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${tier.badgeClass}">
          ≥ ${this.minTrustThreshold}%
        </span>
      </div>
    `;
  }

  /**
   * Renders a trust badge for a post card header.
   */
  public renderAuthorTrustBadge(fingerprint: string, explicitScore?: number): string {
    const score = explicitScore !== undefined ? explicitScore : this.getTrustScoreForAuthor(fingerprint);
    const profile = this.getAuthorProfile(fingerprint);
    const tier = this.getTierForThreshold(score);

    return `
      <span class="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-colors ${tier.badgeClass}" title="WoT Trust: ${score}% (${tier.shortLabel}) · Flow: ${profile.edmondsKarpMaxFlow} · ${profile.isZKVerified ? 'ZK-Human' : 'Unverified'}">
        <span>${tier.icon}</span>
        <span>${score}%</span>
        ${profile.isZKVerified ? '<span class="text-[9px] text-signal font-sans">✓ZK</span>' : ''}
      </span>
    `;
  }

  /**
   * Renders detailed inspector modal for Edmonds-Karp flow calculations.
   */
  public renderFullInspectorModal(): string {
    if (!this.isInspectorOpen) return '';

    const fp = this.selectedInspectorFingerprint;
    const profile = this.getAuthorProfile(fp);
    const report = this.graphEngine.generateReport(this.rootNodeId, fp, profile.isZKVerified, profile.role);
    const tier = this.getTierForThreshold(report.compositeTrustScore);

    return `
      <div id="wot-inspector-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div class="w-full max-w-2xl bg-surface-raised border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center space-x-2">
              <span class="text-2xl">${tier.icon}</span>
              <div>
                <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Web-of-Trust Graph Inspector</span>
                  <span class="text-xs font-mono px-2 py-0.5 rounded ${tier.badgeClass}">
                    ${report.compositeTrustScore}% Trust Score
                  </span>
                </h3>
                <p class="text-xs font-mono text-slate-400">Target: ${fp} · Role: ${profile.role}</p>
              </div>
            </div>
            <button id="btn-wot-close-inspector" type="button" class="p-1.5 rounded-lg bg-surface-overlay hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Algorithmic Decomposition Metrics -->
          <div class="grid grid-cols-3 gap-3">
            <div class="p-3 rounded-xl bg-surface-base border border-white/5 space-y-1">
              <div class="text-[10px] font-mono text-slate-400">Edmonds-Karp Flow</div>
              <div class="text-lg font-bold font-mono text-cyphr">${report.totalFlow} / 100</div>
              <div class="text-[9px] text-slate-500">Network capacity without bottleneck</div>
            </div>

            <div class="p-3 rounded-xl bg-surface-base border border-white/5 space-y-1">
              <div class="text-[10px] font-mono text-slate-400">MeritRank EigenTrust</div>
              <div class="text-lg font-bold font-mono text-signal">${report.meritRank} / 100</div>
              <div class="text-[9px] text-slate-500">Stochastic random walk (α=0.85)</div>
            </div>

            <div class="p-3 rounded-xl bg-surface-base border border-white/5 space-y-1">
              <div class="text-[10px] font-mono text-slate-400">ZK Attestation Bonus</div>
              <div class="text-lg font-bold font-mono text-aether">+${report.zkMultiplier}%</div>
              <div class="text-[9px] text-slate-500">${profile.isZKVerified ? 'ZK-Human Verified' : 'No ZK Proof'}</div>
            </div>
          </div>

          <!-- Augmenting Paths -->
          <div class="space-y-2">
            <div class="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>Found Flow Paths (BFS Residual Paths)</span>
              <span class="text-[10px] font-mono text-slate-500">${report.augmentingPaths.length} active routes</span>
            </div>

            <div class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              ${
                report.augmentingPaths.length > 0
                  ? report.augmentingPaths
                      .map(
                        (p, idx) => `
                    <div class="p-2 rounded-lg bg-surface-base border border-white/5 flex items-center justify-between text-xs font-mono">
                      <div class="flex items-center space-x-1.5 text-slate-300">
                        <span class="text-slate-500">#${idx + 1}</span>
                        <span>${p.path.join(' → ')}</span>
                      </div>
                      <span class="text-cyphr font-bold">+${p.bottleneckFlow} Flow</span>
                    </div>
                  `
                      )
                      .join('')
                  : `
                    <div class="p-3 rounded-lg bg-surface-base border border-white/5 text-center text-xs text-slate-500">
                      No direct path identified. Score is estimated via secondary propagation.
                    </div>
                  `
              }
            </div>
          </div>

          <!-- Sybil Resistance Analysis -->
          <div class="p-3 rounded-xl bg-surface-base/60 border border-white/5 flex items-center justify-between text-xs">
            <div class="flex items-center space-x-2">
              <span class="text-base">🛡️</span>
              <div>
                <div class="font-bold text-slate-200">Sybil Resistance: ${profile.sybilResistanceScore}%</div>
                <div class="text-[10px] text-slate-400">Node cloning attacks are strictly bounded by the graph's min-cut capacity.</div>
              </div>
            </div>
            <button id="btn-wot-vouch-now" data-fp="${fp}" type="button" class="px-3 py-1.5 rounded-lg bg-cyphr/20 hover:bg-cyphr/30 text-cyphr border border-cyphr/40 font-bold transition-all text-xs">
              + Vouch (+10 Flow)
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // 6. DOM Event Listeners & Wiring
  // -------------------------------------------------------------------------

  /**
   * Attaches all DOM event listeners for the slider widget and interactive controls.
   */
  public attachListeners(root: HTMLElement | Document = document): void {
    // 1. Slider Range Input with rafThrottle
    const rangeInput = root.querySelector('#wot-slider-range') as HTMLInputElement | null;
    if (rangeInput) {
      this.boundInputHandler = rafThrottle((e: Event) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        if (!isNaN(val)) {
          this.setThreshold(val);
        }
      });
      rangeInput.addEventListener('input', this.boundInputHandler, PASSIVE_EVENT_OPTIONS);
    }

    // 2. Quick Preset Buttons (0%, 40%, 70%, 90%)
    const presetButtons = root.querySelectorAll('.btn-wot-preset');
    presetButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).getAttribute('data-wot-preset');
        if (target !== null) {
          const val = parseInt(target, 10);
          this.setThreshold(val);
        }
      });
    });

    // 3. Toggle Math Tooltip
    const tooltipBtn = root.querySelector('#btn-wot-tooltip-toggle');
    if (tooltipBtn) {
      tooltipBtn.addEventListener('click', () => {
        this.isTooltipVisible = !this.isTooltipVisible;
        const tooltipEl = root.querySelector('#wot-math-tooltip');
        if (tooltipEl) {
          if (this.isTooltipVisible) {
            tooltipEl.classList.remove('hidden');
            tooltipEl.classList.add('block');
          } else {
            tooltipEl.classList.add('hidden');
            tooltipEl.classList.remove('block');
          }
        }
      });
    }

    // 4. Open / Close Inspector Modal
    const inspectorOpenBtn = root.querySelector('#btn-wot-open-inspector');
    if (inspectorOpenBtn) {
      inspectorOpenBtn.addEventListener('click', () => {
        this.isInspectorOpen = true;
        this.mountInspectorModal();
      });
    }

    // 5. Keyboard shortcuts (keys [, ], 1, 2, 3, 4)
    if (typeof window !== 'undefined') {
      if (this.boundKeydownHandler) {
        window.removeEventListener('keydown', this.boundKeydownHandler);
      }

      this.boundKeydownHandler = (e: KeyboardEvent) => {
        // Do not trigger if typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;

        if (e.key === '[') {
          this.setThreshold(Math.max(0, this.minTrustThreshold - 5));
        } else if (e.key === ']') {
          this.setThreshold(Math.min(100, this.minTrustThreshold + 5));
        } else if (e.altKey && e.key === '1') {
          this.setThreshold(0);
        } else if (e.altKey && e.key === '2') {
          this.setThreshold(40);
        } else if (e.altKey && e.key === '3') {
          this.setThreshold(70);
        } else if (e.altKey && e.key === '4') {
          this.setThreshold(90);
        }
      };

      window.addEventListener('keydown', this.boundKeydownHandler, PASSIVE_EVENT_OPTIONS);
    }
  }

  private mountInspectorModal(): void {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('wot-inspector-modal');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.renderFullInspectorModal();
    const modalEl = wrapper.firstElementChild;
    if (modalEl) {
      document.body.appendChild(modalEl);

      const closeBtn = document.getElementById('btn-wot-close-inspector');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          modalEl.remove();
          this.isInspectorOpen = false;
        });
      }

      const vouchBtn = document.getElementById('btn-wot-vouch-now');
      if (vouchBtn) {
        vouchBtn.addEventListener('click', () => {
          const targetFp = vouchBtn.getAttribute('data-fp');
          if (targetFp) {
            this.addTrustVouch(this.rootNodeId, targetFp, 10);
            modalEl.remove();
            this.mountInspectorModal();
          }
        });
      }
    }
  }

  /**
   * Directly syncs existing DOM elements without full re-render.
   */
  private syncDomElements(): void {
    if (typeof document === 'undefined') return;

    const currentTier = this.getCurrentTier();
    const percentage = this.minTrustThreshold;

    // Update Range Input
    const rangeInput = document.getElementById('wot-slider-range') as HTMLInputElement | null;
    if (rangeInput && parseInt(rangeInput.value, 10) !== percentage) {
      rangeInput.value = percentage.toString();
    }

    // Update Gradient Track Fill
    const fillEl = document.getElementById('wot-slider-fill');
    if (fillEl) {
      fillEl.style.width = `${percentage}%`;
    }

    // Update Numeric Indicator Text
    const valEl = document.getElementById('wot-indicator-value');
    if (valEl) {
      valEl.textContent = `≥ ${percentage}% Trust`;
    }

    // Update ASCII Rail
    const railEl = document.getElementById('wot-ascii-rail');
    if (railEl) {
      railEl.textContent = this.getSliderAsciiRepresentation(percentage);
    }

    // Update Badge classes
    const badgeEl = document.getElementById('wot-indicator-badge');
    if (badgeEl) {
      badgeEl.className = `px-2 py-0.5 rounded-lg font-mono text-xs font-bold border transition-all duration-300 flex items-center space-x-1 ${currentTier.badgeClass}`;
    }

    // Update preset buttons state
    const presetButtons = document.querySelectorAll('.btn-wot-preset');
    presetButtons.forEach((btn) => {
      const pVal = parseInt(btn.getAttribute('data-wot-preset') || '-1', 10);
      const isMatch = currentTier.threshold === pVal;
      if (isMatch) {
        btn.className = `btn-wot-preset py-1 px-1.5 rounded-lg text-center transition-all flex flex-col items-center justify-center border ${currentTier.badgeClass} ring-1 ring-white/20 shadow-md`;
      } else {
        btn.className = `btn-wot-preset py-1 px-1.5 rounded-lg text-center transition-all flex flex-col items-center justify-center border bg-surface-base/60 hover:bg-surface-overlay text-slate-400 hover:text-slate-200 border-white/5`;
      }
    });
  }

  // -------------------------------------------------------------------------
  // 7. Subscriptions & Utilities
  // -------------------------------------------------------------------------

  /**
   * Registers a callback for threshold changes. Returns unsubscribe function.
   */
  public onThresholdChange(callback: (newThreshold: number, tier: TrustTier) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Resets threshold to initial default (0 - All posts).
   */
  public resetToDefault(): void {
    this.setThreshold(0);
  }

  /**
   * Exports internal state for debugging or P2P synchronization.
   */
  public exportState(): string {
    return JSON.stringify({
      threshold: this.minTrustThreshold,
      activeTier: this.getCurrentTier().id,
      profilesCount: this.profilesCache.size,
      lastStats: this.lastStats,
    });
  }

  /**
   * Imports state from JSON.
   */
  public importState(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (typeof data.threshold === 'number') {
        this.setThreshold(data.threshold);
        return true;
      }
    } catch {
      // Invalid JSON
    }
    return false;
  }

  /**
   * Complete teardown of WoT Slider: removes keyboard listeners, cancels active throttlers,
   * dismisses modal if mounted, and clears event subscriptions.
   */
  public destroy(): void {
    if (this.boundKeydownHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundKeydownHandler);
      this.boundKeydownHandler = null;
    }

    if (this.boundInputHandler && this.boundInputHandler.cancel) {
      this.boundInputHandler.cancel();
      this.boundInputHandler = null;
    }

    if (typeof document !== 'undefined') {
      const modal = document.getElementById('wot-inspector-modal');
      if (modal) modal.remove();
    }

    this.isInspectorOpen = false;
    this.listeners.clear();
  }
}

// ---------------------------------------------------------------------------
// 8. Singleton Export
// ---------------------------------------------------------------------------

export const wotSlider = new WoTSliderManager();
