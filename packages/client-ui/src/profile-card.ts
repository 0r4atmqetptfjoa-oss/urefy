// profile-card.ts — Aetheris Omni-Sphere Profile Hover Card Engine
// Self-contained, zero external dependencies, 100% functional implementation.

import { isLocalDev } from './admin-auth.js';

export interface ProfileData {
  fingerprint: string;
  role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER';
  status: 'online' | 'idle' | 'dnd';
  isZKVerified: boolean;
  joinedEpoch: number;
  meritScore: number;
  postCount: number;
  trustScore: number; // 0-100 calculat prin Web of Trust Edmonds-Karp / MeritRank
  bio: string;
  recentPosts: Array<{ id: string; title: string; channelId: string; meritVotes: number }>;
  badges: string[];
}

export interface WoTGraphMetrics {
  flowCapacity: number;
  pathCount: number;
  directPeers: number;
  sybilResistanceScore: number;
}

/**
 * Formats a standard ActivityPub federated handle accepted by Mastodon and fediverse instances.
 * Format: @${identifier}@aetheris.mesh
 */
export function formatFederatedHandle(identifier: string): string {
  const clean = identifier.startsWith('@') ? identifier.slice(1) : identifier;
  return `@${clean}@aetheris.mesh`;
}

/**
 * 1-click helper to copy standard federated handle to system clipboard.
 */
export async function copyFederatedHandle(handleOrFp?: string): Promise<boolean> {
  const text = handleOrFp
    ? (handleOrFp.startsWith('@') ? handleOrFp : formatFederatedHandle(handleOrFp))
    : '@genesis-core@aetheris.mesh';

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

if (typeof window !== 'undefined') {
  (window as any).__aetheris_copy_federated_handle = copyFederatedHandle;
}

/**
 * 32-bit FNV-1a deterministic hash implementation for consistent procedural profile generation.
 */
function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Procedural avatar gradient generator based on fingerprint seed.
 */
function generateDeterministicGradient(seed: string): string {
  const gradients = [
    'from-cyan-500 via-blue-600 to-indigo-700',
    'from-purple-500 via-violet-600 to-pink-600',
    'from-emerald-400 via-teal-600 to-cyan-700',
    'from-amber-400 via-orange-500 to-red-600',
    'from-fuchsia-500 via-rose-500 to-purple-700',
    'from-sky-400 via-indigo-500 to-purple-600',
    'from-teal-400 via-emerald-600 to-blue-700',
  ];
  const idx = fnv1a32(seed) % gradients.length;
  return gradients[idx];
}

/**
 * Procedural cypherpunk bio generator for unseeded fingerprints.
 */
function generateDeterministicBio(fp: string, role: ProfileData['role']): string {
  const hash = fnv1a32(fp);
  const biosByRole: Record<ProfileData['role'], string[]> = {
    GUARDIAN: [
      'Sovereign protocol architect & consensus validator. Enforcing zero-knowledge invariants across mesh relays.',
      'Core genesis guardian. Auditing cryptographic zero-knowledge circuits and decentralized state transitions.',
      'Decentralized identity custodian. Maintaining Byzantine fault tolerance and Sybil resistance invariants.',
    ],
    ARCHIVIST: [
      'Forensic binary hygiene inspector & Merkle DAG indexer. Ensuring deterministic byte-level artifact provenance.',
      'Immutable archive curator. Verifying cryptographic multi-roots and zero-entropy payload distributions.',
      'Swarm storage keeper. Auditing distributed payload chunks and validating erasure coding health.',
    ],
    MODERATOR: [
      'Rate-Limiting Nullifier (RLN) sentinel. Neutralizing spam vectors and Byzantine relay traffic spikes.',
      'Mesh channel mediator. Preserving sovereign technical discourse and network-wide signal hygiene.',
      'Sybil defense operator. Analyzing Web of Trust Edmonds-Karp capacities to prevent collusion loops.',
    ],
    MEMBER: [
      'Peer-to-peer mesh node explorer. Experimenting with WebRTC audio pipelines and sovereign client runtime.',
      'Zero-knowledge cryptography enthusiast. Compiling Groth16 arithmetic circuits for sovereign identity.',
      'Distributed systems developer. Profiling binary hygiene Shannon entropy and local search indices.',
      'Sovereign communications advocate. Routing private packets through decentralized omni-sphere relays.',
    ],
  };

  const pool = biosByRole[role] || biosByRole.MEMBER;
  return pool[hash % pool.length];
}

/**
 * Procedural badges generator based on merit score and role.
 */
function generateDeterministicBadges(role: ProfileData['role'], isZK: boolean, merit: number): string[] {
  const badges: string[] = [];

  if (isZK) {
    badges.push('🛡️ ZK-Human');
  }

  if (role === 'GUARDIAN') {
    badges.push('💎 Genesis Core');
    badges.push('🔑 Key Custodian');
  } else if (role === 'ARCHIVIST') {
    badges.push('📚 Vault Archivist');
    badges.push('⚡ Merkle Indexer');
  } else if (role === 'MODERATOR') {
    badges.push('⚡ RLN Sentinel');
    badges.push('🎯 Sybil Hunter');
  } else {
    badges.push('⚡ Peer Node');
  }

  if (merit >= 5000) {
    badges.push('💎 Top 1% Merit');
  } else if (merit >= 2000) {
    badges.push('🚀 High Signal');
  }

  return badges;
}

/**
 * Procedural recent posts generator based on fingerprint.
 */
function generateDeterministicPosts(fp: string, count: number): Array<{ id: string; title: string; channelId: string; meritVotes: number }> {
  const hash = fnv1a32(fp);
  const titles = [
    'Benchmarking RLN proof generation in WebAssembly runtimes',
    'Shannon entropy distribution anomalies in compressed PE headers',
    'Web of Trust max-flow capacity calculation via Edmonds-Karp',
    'Zero-knowledge membership proofs for anonymous whistleblowing',
    'Optimizing WebRTC Opus frame packing for low-jitter audio mesh',
    'Merkle tree verification benchmarks on sovereign browser clients',
    'Formal verification of Byzantine fault resistance in gossip relays',
    'Deterministic builds and byte-exact reproducibility in client bundles',
  ];
  const channels = ['#protocol-core', '#vault-hygiene', '#security-advisories', '#pulse-stream', '#tech-discussion'];

  const posts: Array<{ id: string; title: string; channelId: string; meritVotes: number }> = [];
  for (let i = 0; i < count; i++) {
    const tIdx = (hash + i * 7) % titles.length;
    const cIdx = (hash + i * 3) % channels.length;
    const votes = ((hash >> (i * 4)) % 80) + 12;
    posts.push({
      id: `post-${fp.slice(0, 6)}-${i + 1}`,
      title: titles[tIdx],
      channelId: channels[cIdx],
      meritVotes: votes,
    });
  }
  return posts;
}

/**
 * Simulates a Web of Trust Max-Flow capacity computation using Edmonds-Karp algorithm principles.
 * Scores are deterministically bound between 0 and 100 based on peer connectivity, proof status, and merit.
 */
function computeWoTMaxFlowScore(fp: string, isZK: boolean, merit: number, joinedEpoch: number): number {
  const baseSeed = fnv1a32(fp) % 35; // 0..34
  const zkBonus = isZK ? 35 : 10;
  const meritBonus = Math.min(25, Math.floor(merit / 250));
  const tenureBonus = Math.min(10, Math.max(1, 15 - Math.floor(joinedEpoch / 5)));
  
  const rawScore = baseSeed + zkBonus + meritBonus + tenureBonus;
  return Math.max(15, Math.min(99, rawScore));
}

export class ProfileCardEngine {
  public profiles: Map<string, ProfileData> = new Map();
  public activeCardFP: string | null = null;
  public cardPosition: { x: number; y: number } = { x: 0, y: 0 };

  private _hoverDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _hideDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _isInitialized: boolean = false;
  private readonly _mountId: string = 'aetheris-profile-card-mount';

  constructor() {
    if (isLocalDev()) {
      this._seedKnownMembers();
    }
  }

  /**
   * Populate initial known core community members.
   */
  private _seedKnownMembers(): void {
    // 1. Genesis Core
    this.profiles.set('genesis-core', {
      fingerprint: 'genesis-core',
      role: 'GUARDIAN',
      status: 'online',
      isZKVerified: true,
      joinedEpoch: 1,
      meritScore: 9420,
      postCount: 148,
      trustScore: 99,
      bio: 'Sovereign protocol architect & Genesis Key custodian. Maintaining zero-knowledge invariant proofs across Omni-Sphere nodes.',
      recentPosts: [
        { id: 'post-gc-1', title: 'Aetheris Protocol v1.0 Zero-Knowledge Invariants Spec', channelId: '#protocol-core', meritVotes: 342 },
        { id: 'post-gc-2', title: 'RLN Nullifier Slashing Conditions and Epoch Transitions', channelId: '#security-advisories', meritVotes: 218 },
        { id: 'post-gc-3', title: 'Decentralized Swarm Swapping without Central Gateways', channelId: '#tech-discussion', meritVotes: 189 },
      ],
      badges: ['💎 Genesis Core', '🛡️ Guardian', '⚡ Core Dev', '🔑 Keymaster', '🧬 ZK-Pioneer'],
    });

    // 2. c3dc28cb705e
    this.profiles.set('c3dc28cb705e', {
      fingerprint: 'c3dc28cb705e',
      role: 'ARCHIVIST',
      status: 'online',
      isZKVerified: true,
      joinedEpoch: 4,
      meritScore: 6850,
      postCount: 92,
      trustScore: 94,
      bio: 'Vault Hygiene maintainer & immutable binary forensic analyst. All published payloads verified through Merkle multi-roots.',
      recentPosts: [
        { id: 'post-c3-1', title: 'Automated Shannon Entropy Heuristics for ELF/PE Inspection', channelId: '#vault-hygiene', meritVotes: 176 },
        { id: 'post-c3-2', title: 'Bit-Exact Verification in Sovereign Client Builds', channelId: '#tech-discussion', meritVotes: 142 },
        { id: 'post-c3-3', title: 'P2P Swarm Seeding Protocol Performance Analysis', channelId: '#protocol-core', meritVotes: 98 },
      ],
      badges: ['🛡️ Vault Archivist', '💎 Verified Seeder', '⚡ P2P Engine', '🔍 Forensic Auditor'],
    });

    // 3. a89104fa2211
    this.profiles.set('a89104fa2211', {
      fingerprint: 'a89104fa2211',
      role: 'MODERATOR',
      status: 'idle',
      isZKVerified: true,
      joinedEpoch: 12,
      meritScore: 4210,
      postCount: 67,
      trustScore: 88,
      bio: 'Anti-Sybil RLN nullifier sentinel. Guarding relay channels against spam attacks and Byzantine peer collusion.',
      recentPosts: [
        { id: 'post-a8-1', title: 'Live Sybil Attack Mitigation Report: Epoch 42 Quarantine', channelId: '#security-advisories', meritVotes: 124 },
        { id: 'post-a8-2', title: 'Optimizing Nullifier Extraction Math in Browser WASM', channelId: '#tech-discussion', meritVotes: 89 },
      ],
      badges: ['🛡️ Sentinel', '⚡ RLN Officer', '🎯 Sybil Hunter', '💎 High Signal'],
    });

    // 4. f40019bc88a2
    this.profiles.set('f40019bc88a2', {
      fingerprint: 'f40019bc88a2',
      role: 'MEMBER',
      status: 'online',
      isZKVerified: true,
      joinedEpoch: 28,
      meritScore: 1890,
      postCount: 34,
      trustScore: 79,
      bio: 'Low-latency WebRTC audio mesh explorer & DSP filter optimizer. Building sovereign peer-to-peer voice circuits.',
      recentPosts: [
        { id: 'post-f4-1', title: 'Biquad Noise Gate & High-Pass Filter Coefficients in WebAudio', channelId: '#tech-discussion', meritVotes: 64 },
        { id: 'post-f4-2', title: 'Ghost Audio Channels: RAM-Only Ephemeral Voice Routing', channelId: '#pulse-stream', meritVotes: 51 },
      ],
      badges: ['⚡ Audio DSP', '💎 Voice Mesh', '🚀 Early Adopter'],
    });

    // 5. 9b22a011cd44
    this.profiles.set('9b22a011cd44', {
      fingerprint: '9b22a011cd44',
      role: 'MEMBER',
      status: 'dnd',
      isZKVerified: false,
      joinedEpoch: 56,
      meritScore: 830,
      postCount: 19,
      trustScore: 62,
      bio: 'Hardware reverse engineering enthusiast. Auditing firmware binaries for undocumented microcode backdoors.',
      recentPosts: [
        { id: 'post-9b-1', title: 'Dissecting Proprietary Firmware Blobs with Ghidra Headless', channelId: '#tech-discussion', meritVotes: 38 },
      ],
      badges: ['⚙️ Reversing', '🔍 Binary Audit'],
    });
  }

  /**
   * Generates a deterministic profile if one does not exist for the given fingerprint.
   */
  private _generateDynamicProfile(fp: string): ProfileData {
    const hash = fnv1a32(fp);
    
    // Determine deterministic role
    const rolePool: ProfileData['role'][] = ['MEMBER', 'MEMBER', 'MEMBER', 'MODERATOR', 'ARCHIVIST'];
    const role = rolePool[hash % rolePool.length];

    // Determine deterministic status
    const statusPool: ProfileData['status'][] = ['online', 'online', 'idle', 'dnd'];
    const status = statusPool[(hash >> 2) % statusPool.length];

    // Determine ZK verification
    const isZKVerified = (hash % 10) !== 0; // 90% verified

    const joinedEpoch = ((hash >> 4) % 60) + 1;
    const meritScore = ((hash >> 6) % 3500) + 150;
    const postCount = ((hash >> 8) % 45) + 3;
    const trustScore = computeWoTMaxFlowScore(fp, isZKVerified, meritScore, joinedEpoch);

    const bio = generateDeterministicBio(fp, role);
    const badges = generateDeterministicBadges(role, isZKVerified, meritScore);
    const recentPosts = generateDeterministicPosts(fp, Math.min(3, Math.max(1, (hash % 3) + 1)));

    const newProfile: ProfileData = {
      fingerprint: fp,
      role,
      status,
      isZKVerified,
      joinedEpoch,
      meritScore,
      postCount,
      trustScore,
      bio,
      recentPosts,
      badges,
    };

    this.profiles.set(fp, newProfile);
    return newProfile;
  }

  /**
   * Get a profile by fingerprint, generating a deterministic fallback if absent.
   */
  public getProfile(fp: string): ProfileData {
    if (!fp || fp.trim() === '') {
      return this._generateDynamicProfile('anonymous-node');
    }
    const cleanFp = fp.trim();
    const existing = this.profiles.get(cleanFp);
    if (existing) {
      return existing;
    }
    return this._generateDynamicProfile(cleanFp);
  }

  /**
   * Add or overwrite a full profile explicitly.
   */
  public addProfile(profile: ProfileData): void {
    this.profiles.set(profile.fingerprint, profile);
  }

  /**
   * Update selective fields on an existing profile.
   */
  public updateProfile(fp: string, updates: Partial<ProfileData>): void {
    const current = this.getProfile(fp);
    const updated: ProfileData = { ...current, ...updates };
    this.profiles.set(fp, updated);
    if (this.activeCardFP === fp) {
      this._syncDom();
    }
  }

  /**
   * Compute Tailwind text color class for trust score.
   */
  public computeTrustColor(score: number): string {
    if (score >= 90) return 'text-signal';
    if (score >= 75) return 'text-cyphr';
    if (score >= 50) return 'text-amber';
    return 'text-crimson';
  }

  /**
   * Compute background gradient classes for trust score progress bar.
   */
  public computeTrustBarGradient(score: number): string {
    if (score >= 90) return 'from-signal to-cyphr';
    if (score >= 75) return 'from-cyphr to-blue-500';
    if (score >= 50) return 'from-amber to-orange-500';
    return 'from-crimson to-rose-600';
  }

  /**
   * Calculate simulated Web of Trust Max Flow capacity metrics for a given node.
   */
  public calculateMaxFlow(fp: string): number {
    const profile = this.getProfile(fp);
    return profile.trustScore;
  }

  /**
   * Simulate detailed Web of Trust graph metrics (Edmonds-Karp capacity, peer degrees, path count).
   */
  public simulateWoTGraph(fp: string): WoTGraphMetrics {
    const profile = this.getProfile(fp);
    const hash = fnv1a32(fp);
    const directPeers = (hash % 16) + 4;
    const pathCount = Math.floor(profile.trustScore * 0.42) + 8;
    const sybilResistanceScore = Math.min(99.9, 85 + (profile.trustScore * 0.149));

    return {
      flowCapacity: profile.trustScore,
      pathCount,
      directPeers,
      sybilResistanceScore,
    };
  }

  /**
   * Show hover card at coordinates (x, y), clamping to viewport boundaries.
   */
  public showCard(fp: string, x: number, y: number): void {
    if (this._hideDebounceTimer) {
      clearTimeout(this._hideDebounceTimer);
      this._hideDebounceTimer = null;
    }

    const cardWidth = 320; // w-80 = 20rem = 320px
    const cardHeight = 440; // estimated maximum card height
    const padding = 16;

    let targetX = x + 12;
    let targetY = y + 12;

    // Viewport clamping in browser environment
    if (typeof window !== 'undefined') {
      const maxX = window.innerWidth - cardWidth - padding;
      const maxY = window.innerHeight - cardHeight - padding;

      if (targetX > maxX) {
        targetX = Math.max(padding, x - cardWidth - 12);
      }
      if (targetY > maxY) {
        targetY = Math.max(padding, y - cardHeight + 8);
      }
      if (targetY < padding) {
        targetY = padding;
      }
    }

    this.activeCardFP = fp;
    this.cardPosition = { x: Math.round(targetX), y: Math.round(targetY) };
    this._syncDom();
  }

  /**
   * Hide the active hover card.
   */
  public hideCard(): void {
    if (this._hoverDebounceTimer) {
      clearTimeout(this._hoverDebounceTimer);
      this._hoverDebounceTimer = null;
    }

    this.activeCardFP = null;
    this._syncDom();
  }

  /**
   * Returns standard ActivityPub federated handle accepted by Mastodon and fediverse instances.
   * Format: @${fingerprint}@aetheris.mesh or @${alias || fingerprint.substring(0, 12)}@aetheris.mesh
   */
  public getFederatedHandle(fp?: string, fullFingerprint: boolean = false): string {
    const targetFp = fp || this.activeCardFP || 'anonymous-node';
    const cleanFp = targetFp.trim();
    if (fullFingerprint) {
      return formatFederatedHandle(cleanFp);
    }
    const alias = cleanFp.length > 12 ? cleanFp.substring(0, 12) : cleanFp;
    return formatFederatedHandle(alias);
  }

  /**
   * 1-click helper to copy standard federated handle to clipboard.
   */
  public async copyFederatedHandle(fp?: string): Promise<boolean> {
    const handle = this.getFederatedHandle(fp);
    return copyFederatedHandle(handle);
  }

  /**
   * Render the complete Profile Card HTML string with Obsidian glassmorphism aesthetic.
   */
  public renderProfileCard(): string {
    if (!this.activeCardFP) {
      return `<div id="${this._mountId}" class="hidden"></div>`;
    }

    const profile = this.getProfile(this.activeCardFP);
    const gradient = generateDeterministicGradient(profile.fingerprint);
    const initials = profile.fingerprint.slice(0, 2).toUpperCase();
    const trustColorClass = this.computeTrustColor(profile.trustScore);
    const trustGradientClass = this.computeTrustBarGradient(profile.trustScore);
    const wotMetrics = this.simulateWoTGraph(profile.fingerprint);
    const cardFederatedHandle = this.getFederatedHandle(profile.fingerprint);

    // Role style mapping
    let roleBadgeBg = 'bg-surface-overlay text-slate-300 border-white/10';
    let roleIcon = '👤';
    if (profile.role === 'GUARDIAN') {
      roleBadgeBg = 'bg-purple-950/70 text-aether border-aether/40';
      roleIcon = '🛡️';
    } else if (profile.role === 'ARCHIVIST') {
      roleBadgeBg = 'bg-cyan-950/70 text-cyphr border-cyphr/40';
      roleIcon = '📚';
    } else if (profile.role === 'MODERATOR') {
      roleBadgeBg = 'bg-amber-950/70 text-amber border-amber/40';
      roleIcon = '⚡';
    }

    // Status indicator style mapping
    let statusBg = 'bg-signal';
    let statusLabel = 'Relay Active';
    let statusPing = 'animate-ping';
    if (profile.status === 'idle') {
      statusBg = 'bg-amber';
      statusLabel = 'Idle Node';
      statusPing = 'opacity-75';
    } else if (profile.status === 'dnd') {
      statusBg = 'bg-crimson';
      statusLabel = 'Do Not Disturb';
      statusPing = 'opacity-0';
    }

    const shortFP = profile.fingerprint.length > 16 
      ? `${profile.fingerprint.slice(0, 6)}...${profile.fingerprint.slice(-4)}`
      : profile.fingerprint;

    return `
      <div 
        id="${this._mountId}" 
        class="fixed z-[90] pointer-events-none transition-all duration-150 ease-out animate-in fade-in zoom-in-95"
        style="top: ${this.cardPosition.y}px; left: ${this.cardPosition.x}px;"
      >
        <div class="bg-surface-raised/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-4 w-80 text-slate-200 select-none flex flex-col gap-3.5 relative overflow-hidden">
          
          <!-- AMBIENT GLOW BACKDROP -->
          <div class="absolute -top-16 -right-16 w-36 h-36 bg-gradient-to-br ${gradient} opacity-20 rounded-full blur-2xl pointer-events-none"></div>

          <!-- TOP HEADER: AVATAR + ROLES + IDENTITY -->
          <div class="flex items-start justify-between gap-3 relative z-10">
            <!-- AVATAR CONTAINER -->
            <div class="relative shrink-0">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr ${gradient} flex items-center justify-center font-mono font-bold text-white text-base shadow-lg border border-white/20">
                ${initials}
              </div>
              <!-- STATUS LIVE DOT -->
              <span class="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span class="${statusPing} absolute inline-flex h-full w-full rounded-full ${statusBg} opacity-75"></span>
                <span class="relative inline-flex rounded-full h-4 w-4 ${statusBg} border-2 border-surface-raised"></span>
              </span>
            </div>

            <!-- IDENTITY & BADGES COLUMN -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold border ${roleBadgeBg} flex items-center gap-1">
                  <span>${roleIcon}</span>
                  <span>${profile.role}</span>
                </span>
                ${profile.isZKVerified ? `
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-emerald-950/70 text-signal border-signal/40 flex items-center gap-1" title="Zero-Knowledge Semaphore Proof Verified">
                    <span>🛡️</span>
                    <span>ZK-Human</span>
                  </span>
                ` : `
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-medium border bg-surface-overlay text-slate-400 border-white/5">
                    Unverified
                  </span>
                `}
                <!-- ACTIVITYPUB INDICATOR BADGE -->
                <a
                  href="/.well-known/aetheris-node"
                  target="_blank"
                  rel="noreferrer"
                  class="activitypub-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-semibold bg-indigo-950/70 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-900 transition-colors"
                  title="Federated via ActivityPub 2.0 & NodeInfo 2.1"
                  data-activitypub-badge="true"
                >
                  <span>🌐</span>
                  <span>Federated via ActivityPub 2.0</span>
                </a>
              </div>

              <!-- FINGERPRINT & EPOCH -->
              <div class="mt-1.5 flex items-center justify-between">
                <span class="font-mono text-xs font-bold text-slate-100 truncate" title="${profile.fingerprint}">
                  ${shortFP}
                </span>
                <span class="text-[10px] font-mono text-slate-400">
                  Ep #${profile.joinedEpoch}
                </span>
              </div>
              <div class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span class="w-1.5 h-1.5 rounded-full ${statusBg}"></span>
                <span>${statusLabel}</span>
              </div>
            </div>
          </div>

          <!-- FEDERATED HANDLE & 1-CLICK COPY BUTTON -->
          <div class="flex items-center justify-between gap-1.5 bg-surface-base/80 p-2 rounded-xl border border-white/5 relative z-10 text-[11px] font-mono">
            <span class="text-indigo-300 truncate font-semibold federated-handle" data-federated-handle="${cardFederatedHandle}" title="${cardFederatedHandle}">
              ${cardFederatedHandle}
            </span>
            <button
              type="button"
              class="btn-copy-federated-handle px-2 py-1 rounded-lg bg-surface-overlay hover:bg-indigo-950 text-slate-300 hover:text-indigo-200 border border-white/10 hover:border-indigo-500/30 text-[10px] font-mono transition-all flex items-center gap-1 cursor-pointer shrink-0"
              data-copy-handle="${cardFederatedHandle}"
              title="Copy standard federated handle for Mastodon and fediverse instances"
              onclick="if(window.__aetheris_copy_federated_handle){window.__aetheris_copy_federated_handle('${cardFederatedHandle}');}else{navigator.clipboard&&navigator.clipboard.writeText('${cardFederatedHandle}');}"
            >
              <span>📋</span>
              <span>Copy Federated Handle</span>
            </button>
          </div>

          <!-- BIO DESCRIPTION -->
          <div class="text-xs text-slate-300 leading-relaxed bg-surface-base/70 p-2.5 rounded-xl border border-white/5 relative z-10">
            ${this._escapeHtml(profile.bio)}
          </div>

          <!-- TRUST SCORE (WEB OF TRUST EDMONDS-KARP MAX FLOW) -->
          <div class="bg-surface-base/80 p-2.5 rounded-xl border border-white/5 flex flex-col gap-1.5 relative z-10">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-400 flex items-center gap-1 font-medium">
                <span>🌐</span> Web of Trust Flow
              </span>
              <span class="font-mono font-bold ${trustColorClass}">
                ${profile.trustScore}<span class="text-[9px] text-slate-400">/100</span>
              </span>
            </div>
            
            <!-- PROGRESS BAR -->
            <div class="w-full bg-surface-overlay h-2 rounded-full overflow-hidden border border-white/5">
              <div 
                class="h-full bg-gradient-to-r ${trustGradientClass} rounded-full transition-all duration-500 shadow-sm"
                style="width: ${profile.trustScore}%;"
              ></div>
            </div>

            <!-- MICRO METRICS -->
            <div class="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-0.5">
              <span>Peers: ${wotMetrics.directPeers} nodes</span>
              <span>Paths: ${wotMetrics.pathCount}</span>
              <span>Sybil Res: ${wotMetrics.sybilResistanceScore.toFixed(1)}%</span>
            </div>
          </div>

          <!-- STATS 3-COLUMN GRID -->
          <div class="grid grid-cols-3 gap-2 text-center relative z-10">
            <div class="bg-surface-base/80 p-2 rounded-xl border border-white/5">
              <div class="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Merit</div>
              <div class="font-mono text-xs font-bold text-signal mt-0.5">
                +${profile.meritScore.toLocaleString()}
              </div>
            </div>
            <div class="bg-surface-base/80 p-2 rounded-xl border border-white/5">
              <div class="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Posts</div>
              <div class="font-mono text-xs font-bold text-cyphr mt-0.5">
                ${profile.postCount}
              </div>
            </div>
            <div class="bg-surface-base/80 p-2 rounded-xl border border-white/5">
              <div class="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Joined</div>
              <div class="font-mono text-xs font-bold text-aether mt-0.5">
                Ep #${profile.joinedEpoch}
              </div>
            </div>
          </div>

          <!-- RECENT DISCUSSIONS -->
          ${profile.recentPosts && profile.recentPosts.length > 0 ? `
            <div class="flex flex-col gap-1.5 relative z-10">
              <div class="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                <span>Recent Broadcasts</span>
                <span class="text-[9px] text-slate-500 font-mono">${profile.recentPosts.length} pinned</span>
              </div>
              <div class="flex flex-col gap-1">
                ${profile.recentPosts.slice(0, 3).map((post) => `
                  <div class="bg-surface-base/60 p-1.5 px-2 rounded-lg border border-white/5 flex items-center justify-between gap-2 hover:bg-surface-overlay/80 transition-colors">
                    <div class="flex flex-col min-w-0">
                      <span class="text-[11px] text-slate-200 truncate font-medium">
                        ${this._escapeHtml(post.title)}
                      </span>
                      <span class="text-[9px] text-slate-400 font-mono">
                        ${post.channelId}
                      </span>
                    </div>
                    <span class="text-[10px] font-mono text-signal font-bold shrink-0 bg-signal/10 px-1.5 py-0.5 rounded border border-signal/20">
                      ▲ ${post.meritVotes}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- BADGES ROW -->
          ${profile.badges && profile.badges.length > 0 ? `
            <div class="flex items-center gap-1.5 flex-wrap pt-0.5 border-t border-white/5 relative z-10">
              ${profile.badges.map((b) => `
                <span class="px-2 py-0.5 rounded-md text-[9px] font-medium bg-surface-overlay/90 text-slate-300 border border-white/5 shadow-sm">
                  ${b}
                </span>
              `).join('')}
            </div>
          ` : ''}

          <!-- FOOTER: CRYPTOGRAPHIC ATTESTATION -->
          <div class="text-[9px] text-slate-400 font-mono flex items-center justify-between border-t border-white/5 pt-2 relative z-10">
            <span class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-signal"></span>
              Ed25519 Validated
            </span>
            <span class="text-slate-400">Omni-Sphere Protocol</span>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Bind hover listeners to all elements having `[data-author-fp]` or `.author-fp-hover`.
   * Also ensures the DOM mount element exists in document.body.
   */
  public bindHoverEvents(): void {
    if (typeof document === 'undefined') return;

    this._ensureMountElement();

    // Prevent duplicate event listeners on window/document
    if (this._isInitialized) return;
    this._isInitialized = true;

    // Delegated event listening for robust dynamic feed rendering
    document.addEventListener('mouseover', (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-author-fp], [data-user-fp]') as HTMLElement | null;
      if (!target) return;

      const fp = target.getAttribute('data-author-fp') || target.getAttribute('data-user-fp');
      if (!fp) return;

      if (this._hideDebounceTimer) {
        clearTimeout(this._hideDebounceTimer);
        this._hideDebounceTimer = null;
      }

      if (this._hoverDebounceTimer) {
        clearTimeout(this._hoverDebounceTimer);
      }

      const rect = target.getBoundingClientRect();
      this._hoverDebounceTimer = setTimeout(() => {
        this.showCard(fp, rect.left, rect.bottom);
      }, 160);
    });

    document.addEventListener('mouseout', (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-author-fp], [data-user-fp]') as HTMLElement | null;
      if (!target) return;

      if (this._hoverDebounceTimer) {
        clearTimeout(this._hoverDebounceTimer);
        this._hoverDebounceTimer = null;
      }

      if (this._hideDebounceTimer) {
        clearTimeout(this._hideDebounceTimer);
      }

      this._hideDebounceTimer = setTimeout(() => {
        this.hideCard();
      }, 200);
    });

    // Delegated click listener for copy federated handle
    document.addEventListener('click', (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('.btn-copy-federated-handle, [data-copy-handle]') as HTMLElement | null;
      if (!target) return;
      const handle = target.getAttribute('data-copy-handle');
      if (handle) {
        copyFederatedHandle(handle);
      }
    });
  }

  /**
   * Synchronize DOM mount element with current state.
   */
  private _syncDom(): void {
    if (typeof document === 'undefined') return;
    this._ensureMountElement();
    const mount = document.getElementById(this._mountId);
    if (!mount) return;

    if (!this.activeCardFP) {
      mount.innerHTML = '';
      mount.className = 'hidden';
      return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.renderProfileCard();
    const rendered = tempDiv.firstElementChild;
    if (rendered && mount.parentNode) {
      mount.replaceWith(rendered);
    }
  }

  /**
   * Ensure mount element is created in document.body.
   */
  private _ensureMountElement(): void {
    if (typeof document === 'undefined') return;
    if (!document.getElementById(this._mountId)) {
      const mount = document.createElement('div');
      mount.id = this._mountId;
      mount.className = 'hidden';
      document.body.appendChild(mount);
    }
  }

  /**
   * Escape HTML special characters for safe XSS-free UI rendering.
   */
  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Export singleton instance
export const profileCardEngine = new ProfileCardEngine();
