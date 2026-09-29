// ============================================================================
// awards.ts — UREfy Sovereign Awards & Medals Engine
// Cryptographic Proof-of-Merit, ZK-Badges, and Decentralized Accolades
// 100% Self-contained, TypeScript strict, no external dependencies.
// ============================================================================

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { isDemoModeEnabled } from './demo-mode.js';
import { isLocalDev } from './env-check.js';
import { t } from './i18n.js';

export type SovereignAwardType =
  | 'PLATINUM'
  | 'GOLD'
  | 'SILVER'
  | 'BRONZE'
  | 'ZK_VERIFIED'
  | 'GUARDIAN_CHOICE'
  | 'COMMUNITY_PICK';

export interface Award {
  id: string;
  type: SovereignAwardType;
  emoji: string;
  label: string;
  description: string;
  color: string;
  bgGradient: string;
  meritPoints: number; // Sovereign merit points cost
  aliasNames?: string[];
}

export interface PostAward {
  id?: string;
  type?: string;
  awardId: string;
  postId: string;
  commentId?: string;
  givenBy: string;
  givenAt: number;
  comment?: string;
  meritPoints?: number;
}

export interface GroupedAwardSummary {
  award: Award;
  count: number;
  givers: string[];
  comments: { giver: string; text: string; at: number }[];
  totalMeritValue: number;
}

// ─── Helper Utilities ────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

// ─── AwardsSystem Engine Class ───────────────────────────────────────────────

export class AwardsSystem {
  public readonly AWARDS: Award[] = [
    {
      id: 'SILVER',
      type: 'SILVER',
      emoji: '🥈',
      label: 'Silver Merit',
      description: 'High technical rigor, insightful peer review, or architectural enhancement.',
      color: 'text-slate-300',
      bgGradient: 'from-slate-400/20 via-gray-400/20 to-zinc-400/20 border-slate-400/40 text-slate-200',
      meritPoints: 50,
      aliasNames: ['Silver Merit', 'SILVER_MERIT', 'SILVER'],
    },
    {
      id: 'GOLD',
      type: 'GOLD',
      emoji: '🏆',
      label: 'Gold Guardian',
      description: 'Historic milestone and outstanding sovereign decentralized governance archive.',
      color: 'text-amber',
      bgGradient: 'from-amber-500/20 via-yellow-500/20 to-orange-500/20 border-amber/40 text-amber',
      meritPoints: 100,
      aliasNames: ['Gold Guardian', 'Gold Archive', 'GOLD_GUARDIAN', 'GOLD'],
    },
    {
      id: 'GUARDIAN_CHOICE',
      type: 'GUARDIAN_CHOICE',
      emoji: '👑',
      label: 'Quantum Seal',
      description: 'Special sovereign recognition awarded by network Guardians for protocol defense.',
      color: 'text-aether',
      bgGradient: 'from-purple-600/20 via-fuchsia-600/20 to-violet-600/20 border-aether/40 text-aether',
      meritPoints: 250,
      aliasNames: ['Quantum Seal', "Guardian's Endorsement", 'QUANTUM_SEAL', 'GUARDIAN_CHOICE'],
    },
    {
      id: 'ZK_VERIFIED',
      type: 'ZK_VERIFIED',
      emoji: '🔐',
      label: 'ZK Proof',
      description: 'Zero-Knowledge verified computational integrity and zero-leakage guarantee.',
      color: 'text-cyphr',
      bgGradient: 'from-cyan-500/20 via-teal-500/20 to-emerald-500/20 border-cyphr/40 text-cyphr',
      meritPoints: 500,
      aliasNames: ['ZK Proof', 'ZK Cryptographic Proof', 'ZK_PROOF', 'ZK_VERIFIED'],
    },
    {
      id: 'PLATINUM',
      type: 'PLATINUM',
      emoji: '💎',
      label: 'Diamond Consensus',
      description: 'Paramount merit, peerless cryptographic contribution, and immutable consensus milestone.',
      color: 'text-pink-400',
      bgGradient: 'from-pink-500/20 via-purple-500/20 to-indigo-500/20 border-pink-500/40 text-pink-300',
      meritPoints: 1000,
      aliasNames: ['Diamond Consensus', 'Platinum Proof', 'DIAMOND_CONSENSUS', 'PLATINUM'],
    },
    {
      id: 'BRONZE',
      type: 'BRONZE',
      emoji: '🥉',
      label: 'Bronze Signal',
      description: 'Valuable signal contribution amplifying network clarity and utility.',
      color: 'text-orange-400',
      bgGradient: 'from-orange-600/20 via-amber-600/20 to-yellow-700/20 border-orange-500/40 text-orange-300',
      meritPoints: 25,
      aliasNames: ['Bronze Signal', 'BRONZE_SIGNAL', 'BRONZE'],
    },
    {
      id: 'COMMUNITY_PICK',
      type: 'COMMUNITY_PICK',
      emoji: '✨',
      label: 'Community Gem',
      description: 'Celebrated by the sovereign community for outstanding collaborative impact.',
      color: 'text-signal',
      bgGradient: 'from-emerald-500/20 via-green-500/20 to-cyan-500/20 border-signal/40 text-signal',
      meritPoints: 10,
      aliasNames: ['Community Gem', 'COMMUNITY_GEM', 'COMMUNITY_PICK'],
    },
  ];

  public postAwards: Map<string, PostAward[]> = new Map();
  public commentAwards: Map<string, PostAward[]> = new Map();
  public userMeritBalance: number = 2450;
  private pendingAwards: Map<string, Promise<any>> = new Map();

  private activeModalPostId: string | null = null;
  private activeModalCommentId: string | null = null;
  private selectedAwardType: SovereignAwardType = 'SILVER';

  constructor() {
    const savedAwards = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_awards_cache') : null;
    const savedCommentAwards = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_comment_awards_cache') : null;
    const savedBalance = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_user_merit_balance') : null;
    if (savedBalance !== null) {
      const b = parseInt(savedBalance, 10);
      if (!isNaN(b)) this.userMeritBalance = b;
    }
    if (savedAwards) {
      try {
        const parsed = JSON.parse(savedAwards);
        for (const [k, v] of Object.entries(parsed)) {
          this.postAwards.set(k, v as PostAward[]);
        }
      } catch {}
    } else if (isDemoModeEnabled() && isLocalDev()) {
      this._seedDemoAwards();
    }
    if (savedCommentAwards) {
      try {
        const parsedComments = JSON.parse(savedCommentAwards);
        for (const [k, v] of Object.entries(parsedComments)) {
          this.commentAwards.set(k, v as PostAward[]);
        }
      } catch {}
    }
    this._initGlobalDomListeners();
    if (typeof window !== 'undefined') {
      awardPopoverManager.init();
    }
  }

  private _saveAwardsToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const obj: Record<string, PostAward[]> = {};
      this.postAwards.forEach((v, k) => { obj[k] = v; });
      localStorage.setItem('aetheris_awards_cache', JSON.stringify(obj));

      const commentObj: Record<string, PostAward[]> = {};
      this.commentAwards.forEach((v, k) => { commentObj[k] = v; });
      localStorage.setItem('aetheris_comment_awards_cache', JSON.stringify(commentObj));

      localStorage.setItem('aetheris_user_merit_balance', this.userMeritBalance.toString());
    } catch {}
  }

  // ─── Merit Balance Management ─────────────────────────────────────────────

  public getUserMeritBalance(): number {
    return this.userMeritBalance;
  }

  public addMeritPoints(amount: number): number {
    if (amount > 0) {
      this.userMeritBalance += amount;
    }
    return this.userMeritBalance;
  }

  public deductMeritPoints(amount: number): boolean {
    if (amount > 0 && this.userMeritBalance >= amount) {
      this.userMeritBalance -= amount;
      return true;
    }
    return false;
  }

  // ─── Seed Initial State ───────────────────────────────────────────────────

  private _seedDemoAwards(): void {
    if (!isLocalDev()) return;
    const now = Date.now();

    // Seed post-1 (Main ZK-RLN Release Post)
    this.postAwards.set('post-1', [
      {
        awardId: 'ZK_VERIFIED',
        postId: 'post-1',
        givenBy: 'c8f47a9b01cd',
        givenAt: now - 3600000 * 5,
        comment: 'Zero-leakage rate limiting arithmetic circuit audited and verified.',
        meritPoints: 500,
      },
      {
        awardId: 'PLATINUM',
        postId: 'post-1',
        givenBy: 'a1b2c3d4e5f6',
        givenAt: now - 3600000 * 3,
        comment: 'Masterpiece of decentralized cryptographic architecture.',
        meritPoints: 1000,
      },
      {
        awardId: 'GUARDIAN_CHOICE',
        postId: 'post-1',
        givenBy: 'c8f47a9b01cd',
        givenAt: now - 3600000 * 2,
        comment: 'Guardian core protocol consensus endorsement.',
        meritPoints: 250,
      },
      {
        awardId: 'COMMUNITY_PICK',
        postId: 'post-1',
        givenBy: '7e3d2a1b9c80',
        givenAt: now - 1800000,
        comment: 'Incredible speedup on recursive SNARK verification!',
        meritPoints: 10,
      },
      {
        awardId: 'COMMUNITY_PICK',
        postId: 'post-1',
        givenBy: 'f9e8d7c6b5a4',
        givenAt: now - 900000,
        meritPoints: 10,
      },
    ]);

    // Seed post-video (Ghost Voice & Obsidian Video Demo)
    this.postAwards.set('post-video', [
      {
        awardId: 'GOLD',
        postId: 'post-video',
        givenBy: 'e4f1a2b3c4d5',
        givenAt: now - 3600000 * 7,
        comment: 'Archived permanently in the decentralized sovereign video index.',
        meritPoints: 100,
      },
      {
        awardId: 'COMMUNITY_PICK',
        postId: 'post-video',
        givenBy: '5a4b3c2d1e0f',
        givenAt: now - 3600000 * 4,
        comment: 'The neural audio noise suppression is studio grade.',
        meritPoints: 10,
      },
      {
        awardId: 'BRONZE',
        postId: 'post-video',
        givenBy: '99cc88bb77aa',
        givenAt: now - 3600000 * 1,
        meritPoints: 25,
      },
    ]);

    // Seed post-attachment (Binary Hygiene Passport)
    this.postAwards.set('post-attachment', [
      {
        awardId: 'ZK_VERIFIED',
        postId: 'post-attachment',
        givenBy: 'c8f47a9b01cd',
        givenAt: now - 3600000 * 8,
        comment: 'High entropy distribution validated with zero malicious heuristics.',
        meritPoints: 500,
      },
      {
        awardId: 'SILVER',
        postId: 'post-attachment',
        givenBy: 'e4f1a2b3c4d5',
        givenAt: now - 3600000 * 2,
        comment: 'Merkle root proofs match canonical release hashes.',
        meritPoints: 50,
      },
    ]);

    // Seed post-poll (Architecture voting)
    this.postAwards.set('post-poll', [
      {
        awardId: 'COMMUNITY_PICK',
        postId: 'post-poll',
        givenBy: '112233445566',
        givenAt: now - 1200000,
        comment: 'Crucial governance telemetry.',
        meritPoints: 10,
      },
      {
        awardId: 'BRONZE',
        postId: 'post-poll',
        givenBy: 'aabbccddeeff',
        givenAt: now - 600000,
        meritPoints: 25,
      },
    ]);

    // Seed initial comment award
    this.commentAwards.set('c-root-1', [
      {
        awardId: 'SILVER',
        postId: 'post-1',
        commentId: 'c-root-1',
        givenBy: 'a89104fa2211',
        givenAt: now - 1800000,
        meritPoints: 50,
        comment: 'Accurate binary entropy scan verification.',
      },
    ]);
  }

  // ─── Permission Logic ─────────────────────────────────────────────────────

  /**
   * Evaluates if a given user role has privileges to grant a specific award tier.
   * - GUARDIAN: Unrestricted access to all sovereign awards
   * - ARCHIVIST: GOLD, SILVER, ZK_VERIFIED, BRONZE, COMMUNITY_PICK
   * - MODERATOR: SILVER, BRONZE, COMMUNITY_PICK
   * - MEMBER: BRONZE, COMMUNITY_PICK
   */
  public canGiveAward(giverRole: string, awardType: string): boolean {
    const role = (giverRole || '').trim().toUpperCase();
    const resolved = this.getAwardByType(awardType);
    if (!resolved) return false;
    const type = resolved.type;

    if (role === 'GUARDIAN') {
      return true;
    }

    if (role === 'ARCHIVIST') {
      return type === 'GOLD' || type === 'SILVER' || type === 'ZK_VERIFIED';
    }

    if (role === 'MODERATOR') {
      return type === 'SILVER' || type === 'BRONZE' || type === 'COMMUNITY_PICK';
    }

    if (role === 'MEMBER') {
      return type === 'BRONZE' || type === 'COMMUNITY_PICK';
    }

    return false;
  }

  /**
   * Retrieves allowable award types for a given user role.
   */
  public getAllowedAwardTypes(giverRole: string): SovereignAwardType[] {
    return this.AWARDS.filter((award) => this.canGiveAward(giverRole, award.type)).map(
      (a) => a.type
    );
  }

  // ─── Core Mutation & Retrieval ────────────────────────────────────────────

  public getAwardByType(type: string): Award | undefined {
    if (!type) return undefined;
    const normalized = type.trim().toUpperCase().replace(/[\s-]/g, '_');
    return this.AWARDS.find(
      (a) =>
        a.type === normalized ||
        a.id === normalized ||
        (a.aliasNames && a.aliasNames.some((alias) => alias.toUpperCase().replace(/[\s-]/g, '_') === normalized)) ||
        a.label.toUpperCase().replace(/[\s-]/g, '_') === normalized
    );
  }

  public getAwards(postId: string): PostAward[] {
    return this.postAwards.get(postId) || [];
  }

  public getCommentAwards(commentId: string): PostAward[] {
    return this.commentAwards.get(commentId) || [];
  }

  public getTotalAwardsCount(postId: string): number {
    const list = this.postAwards.get(postId);
    return list ? list.length : 0;
  }

  public getTotalCommentAwardsCount(commentId: string): number {
    const list = this.commentAwards.get(commentId);
    return list ? list.length : 0;
  }

  public getPostAwardsSummary(postId: string): GroupedAwardSummary[] {
    return this.getGroupedAwards(postId);
  }

  /**
   * Groups awards on a post by type with aggregated count, giver fingerprints, comments, and total merit value.
   */
  public getGroupedAwards(postId: string): GroupedAwardSummary[] {
    const list = this.getAwards(postId);
    return this._groupAwardsList(list);
  }

  /**
   * Groups awards on a comment.
   */
  public getGroupedCommentAwards(commentId: string): GroupedAwardSummary[] {
    const list = this.getCommentAwards(commentId);
    return this._groupAwardsList(list);
  }

  private _groupAwardsList(list: PostAward[]): GroupedAwardSummary[] {
    if (!list || list.length === 0) return [];

    const groupMap = new Map<string, GroupedAwardSummary>();

    for (const pa of list) {
      const awardDef = this.getAwardByType(pa.awardId);
      if (!awardDef) continue;

      if (!groupMap.has(awardDef.type)) {
        groupMap.set(awardDef.type, {
          award: awardDef,
          count: 0,
          givers: [],
          comments: [],
          totalMeritValue: 0,
        });
      }

      const entry = groupMap.get(awardDef.type)!;
      entry.count += 1;
      entry.totalMeritValue += awardDef.meritPoints;
      if (!entry.givers.includes(pa.givenBy)) {
        entry.givers.push(pa.givenBy);
      }
      if (pa.comment && pa.comment.trim().length > 0) {
        entry.comments.push({
          giver: pa.givenBy,
          text: pa.comment.trim(),
          at: pa.givenAt,
        });
      }
    }

    return Array.from(groupMap.values());
  }

  /**
   * Grants an award on a post. Deducts merit points if sufficient balance.
   */
  /**
   * Grants an award on a post. Deducts merit points if sufficient balance.
   */
  public giveAward(
    postId: string,
    awardType: string,
    giverFP: string,
    giverRole: string = 'GUARDIAN',
    comment?: string
  ): boolean {
    if (!postId || !awardType || !giverFP) return false;

    const award = this.getAwardByType(awardType);
    if (!award) return false;

    if (!this.canGiveAward(giverRole, award.type)) {
      return false;
    }

    // Deduct points from user balance
    if (this.userMeritBalance >= award.meritPoints) {
      this.userMeritBalance -= award.meritPoints;
    }

    if (!this.postAwards.has(postId)) {
      this.postAwards.set(postId, []);
    }

    const newAward: PostAward = {
      type: award.type,
      awardId: award.type,
      postId,
      givenBy: giverFP,
      givenAt: Date.now(),
      comment: comment && comment.trim().length > 0 ? comment.trim() : undefined,
      meritPoints: award.meritPoints,
    };

    this.postAwards.get(postId)!.push(newAward);
    this._saveAwardsToStorage();

    void import('./activity-feed.js').then(({ networkActivityFeed }) => {
      networkActivityFeed.addEvent({
        type: 'award',
        actorFP: giverFP,
        actorRole: (giverRole.toLowerCase() === 'guardian' ? 'admin' : (giverRole.toLowerCase() === 'moderator' ? 'moderator' : 'member')) as any,
        targetTitle: award.label,
        targetId: postId,
        timestamp: newAward.givenAt,
        meta: { badge: award.label, recipient: postId, meritPoints: award.meritPoints },
      });
    }).catch(() => {});

    // Dispatch sovereign broadcast event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aetheris:award:given', {
          detail: {
            postId,
            award: newAward,
            awardDefinition: award,
            giverFP,
            giverRole,
          },
        })
      );
    }

    // Dispatch signed persistence in background with rollback on rejection
    if (typeof fetch !== 'undefined') {
      const p = (async () => {
        try {
          const { persistInteraction } = await import('./interaction-transport.js');
          await persistInteraction(postId, 'award', true, award.type, 'post');
        } catch (err: any) {
          // Rollback optimistic state
          const list = this.postAwards.get(postId);
          if (list) {
            const idx = list.indexOf(newAward);
            if (idx >= 0) list.splice(idx, 1);
          }
          this.userMeritBalance += award.meritPoints;
          this.refreshPostBadgesInDom(postId);
          const { clientStore } = await import('./client-state.js');
          clientStore.showToast(err?.message || 'Could not bestow award.', 'warning');
        }
      })();
      this.pendingAwards.set(postId, p);
    }

    return true;
  }

  /**
   * Grants an award on a specific comment.
   */
  public giveCommentAward(
    commentId: string,
    postId: string,
    awardType: string,
    giverFP: string,
    giverRole: string = 'GUARDIAN',
    comment?: string
  ): boolean {
    if (!commentId || !awardType || !giverFP) return false;

    const award = this.getAwardByType(awardType);
    if (!award) return false;

    if (!this.canGiveAward(giverRole, award.type)) {
      return false;
    }

    if (this.userMeritBalance >= award.meritPoints) {
      this.userMeritBalance -= award.meritPoints;
    }

    if (!this.commentAwards.has(commentId)) {
      this.commentAwards.set(commentId, []);
    }

    const newAward: PostAward = {
      type: award.type,
      awardId: award.type,
      postId,
      commentId,
      givenBy: giverFP,
      givenAt: Date.now(),
      comment: comment && comment.trim().length > 0 ? comment.trim() : undefined,
      meritPoints: award.meritPoints,
    };

    this.commentAwards.get(commentId)!.push(newAward);
    this._saveAwardsToStorage();

    void import('./activity-feed.js').then(({ networkActivityFeed }) => {
      networkActivityFeed.addEvent({
        type: 'award',
        actorFP: giverFP,
        actorRole: (giverRole.toLowerCase() === 'guardian' ? 'admin' : (giverRole.toLowerCase() === 'moderator' ? 'moderator' : 'member')) as any,
        targetTitle: award.label,
        targetId: commentId,
        timestamp: newAward.givenAt,
        meta: { badge: award.label, recipient: commentId, meritPoints: award.meritPoints },
      });
    }).catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aetheris:comment-award:given', {
          detail: {
            commentId,
            postId,
            award: newAward,
            awardDefinition: award,
            giverFP,
            giverRole,
          },
        })
      );
    }

    if (typeof fetch !== 'undefined') {
      const p = (async () => {
        try {
          const { persistInteraction } = await import('./interaction-transport.js');
          await persistInteraction(commentId, 'award', true, award.type, 'comment');
        } catch (err: any) {
          const list = this.commentAwards.get(commentId);
          if (list) {
            const idx = list.indexOf(newAward);
            if (idx >= 0) list.splice(idx, 1);
          }
          this.userMeritBalance += award.meritPoints;
          this.refreshCommentBadgesInDom(commentId);
          const { clientStore } = await import('./client-state.js');
          clientStore.showToast(err?.message || 'Could not bestow award on comment.', 'warning');
        }
      })();
      this.pendingAwards.set(commentId, p);
    }

    return true;
  }

  /**
   * Awaitable hook ensuring award state mutations have settled.
   */
  public async whenSettled(targetId?: string): Promise<boolean> {
    if (targetId) {
      const p = this.pendingAwards.get(targetId);
      if (p) await p.catch(() => {});
    } else {
      await Promise.allSettled(Array.from(this.pendingAwards.values()));
    }
    return true;
  }

  /**
   * Hydrates post awards from server interaction response.
   */
  public hydratePostAwards(postId: string, awardsList: any[]): void {
    if (!postId || !Array.isArray(awardsList)) return;
    const hydrated: PostAward[] = [];
    for (const item of awardsList) {
      if (!item) continue;
      const awardType = item.awardId || item.type;
      const count = Number(item.count) || 1;
      const awardDef = this.getAwardByType(awardType);
      if (!awardDef) continue;
      if (item.givenBy) {
        hydrated.push(item as PostAward);
      } else {
        for (let i = 0; i < count; i++) {
          hydrated.push({
            type: awardDef.type,
            awardId: awardDef.type,
            postId,
            givenBy: 'peer',
            givenAt: Date.now(),
            meritPoints: awardDef.meritPoints,
          });
        }
      }
    }
    this.postAwards.set(postId, hydrated);
    this.refreshPostBadgesInDom(postId);
  }

  /**
   * Hydrates comment awards from server comments response.
   */
  public hydrateCommentAwards(commentId: string, awardsList: any[]): void {
    if (!commentId || !Array.isArray(awardsList)) return;
    const hydrated: PostAward[] = [];
    for (const item of awardsList) {
      if (!item) continue;
      const awardType = item.awardId || item.type;
      const count = Number(item.count) || 1;
      const awardDef = this.getAwardByType(awardType);
      if (!awardDef) continue;
      if (item.givenBy) {
        hydrated.push(item as PostAward);
      } else {
        for (let i = 0; i < count; i++) {
          hydrated.push({
            type: awardDef.type,
            awardId: awardDef.type,
            postId: item.postId || '',
            commentId,
            givenBy: 'peer',
            givenAt: Date.now(),
            meritPoints: awardDef.meritPoints,
          });
        }
      }
    }
    this.commentAwards.set(commentId, hydrated);
    this.refreshCommentBadgesInDom(commentId);
  }

  // ─── Rendering Methods ────────────────────────────────────────────────────

  /**
   * Renders compact badge chips grouped by medal type (e.g. 💎×2, 🏆×1).
   * Popups are managed via the singleton AwardPopoverManager to prevent overlapping windows.
   */
  public renderAwardBadges(postId: string): string {
    const grouped = this.getGroupedAwards(postId);
    if (grouped.length === 0) {
      return '<div class="award-badges-container inline-flex items-center gap-1.5 empty:hidden" data-post-id="' + postId + '"></div>';
    }

    const badgesHtml = grouped
      .map((g) => {
        const borderClass = g.award.bgGradient.split(' ').find((c) => c.startsWith('border-')) || 'border-white/10';
        const commentsJson = JSON.stringify(g.comments.slice(0, 2));

        return `
          <div 
            class="award-badge-chip inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-surface-overlay/80 hover:bg-surface-overlay border ${borderClass} shadow-xs transition-transform transform hover:scale-105 cursor-pointer select-none relative"
            data-award-type="${escapeHtml(g.award.type)}"
            data-award-label="${escapeHtml(g.award.label)}"
            data-award-emoji="${escapeHtml(g.award.emoji)}"
            data-award-points="${g.award.meritPoints * g.count}"
            data-award-count="${g.count}"
            data-award-desc="${escapeHtml(g.award.description)}"
            data-award-color="${g.award.color}"
            data-award-givers="${escapeHtml(g.givers.slice(0, 4).join(', '))}"
            data-award-comments="${escapeHtml(commentsJson)}"
          >
            <span class="text-sm leading-none">${g.award.emoji}</span>
            <span class="${g.award.color} text-[10px] tracking-tight font-semibold">×${g.count}</span>
          </div>
        `;
      })
      .join('');

    return `
      <div class="award-badges-container flex flex-wrap items-center gap-1.5 my-1" data-post-id="${postId}">
        ${badgesHtml}
      </div>
    `;
  }

  /**
   * Renders award badges on comments with matching singleton popover support.
   */
  public renderCommentAwardBadges(commentId: string): string {
    const grouped = this.getGroupedCommentAwards(commentId);
    if (grouped.length === 0) {
      return `<div class="comment-award-badges inline-flex items-center gap-1 my-0.5 empty:hidden" data-comment-id="${commentId}"></div>`;
    }

    return `
      <div class="comment-award-badges inline-flex items-center gap-1 my-0.5" data-comment-id="${commentId}">
        ${grouped
          .map(
            (g) => `
          <span 
            class="award-badge-chip inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-surface-overlay text-[10px] font-mono ${g.award.color} border border-white/10 cursor-pointer select-none" 
            data-award-type="${escapeHtml(g.award.type)}"
            data-award-label="${escapeHtml(g.award.label)}"
            data-award-emoji="${escapeHtml(g.award.emoji)}"
            data-award-points="${g.award.meritPoints * g.count}"
            data-award-count="${g.count}"
            data-award-desc="${escapeHtml(g.award.description)}"
            data-award-color="${g.award.color}"
            data-award-givers="${escapeHtml(g.givers.slice(0, 4).join(', '))}"
            data-award-comments="${escapeHtml(JSON.stringify(g.comments.slice(0, 2)))}"
          >
            <span>${g.award.emoji}</span>
            ${g.count > 1 ? `<span class="font-bold">×${g.count}</span>` : ''}
          </span>
        `
          )
          .join('')}
      </div>
    `;
  }

  /**
   * Renders the action button triggering the bestow sovereign award modal on a post.
   */
  public renderGiveAwardButton(postId: string, userRole: string = 'GUARDIAN'): string {
    const total = this.getTotalAwardsCount(postId);

    return `
      <button 
        type="button"
        class="btn-open-award-modal group inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-amber border border-white/5 hover:border-amber/30 transition-all font-mono text-xs select-none cursor-pointer"
        data-post-id="${postId}"
        data-user-role="${userRole}"
        title="Bestow Sovereign Proof Award"
      >
        <span class="text-sm group-hover:scale-110 transition-transform">🏅</span>
        <span class="font-medium text-[11px] group-hover:text-amber transition-colors">${t('actions.award', undefined, 'Award')}</span>
        ${total > 0 ? `<span class="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-overlay text-amber font-bold border border-amber/20">${total}</span>` : ''}
      </button>
    `;
  }

  /**
   * Renders the action button triggering the bestow award modal on a comment.
   */
  public renderGiveCommentAwardButton(commentId: string, postId: string, userRole: string = 'GUARDIAN'): string {
    return `
      <button 
        type="button" 
        class="btn-open-comment-award-modal group inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg hover:bg-surface-overlay text-slate-400 hover:text-amber transition-all font-mono text-[11px] cursor-pointer" 
        data-comment-id="${commentId}" 
        data-post-id="${postId}" 
        data-user-role="${userRole}" 
        title="${t('actions.award', undefined, 'Bestow Award on Comment')}" 
      >
        <span class="text-xs group-hover:scale-110 transition-transform">🏅</span>
        <span>${t('actions.award', undefined, 'Award')}</span>
      </button>
    `;
  }

  /**
   * Renders the Sovereign Award modal window with complete interactive grid of sovereign merit medals.
   */
  public renderAwardModal(postId: string, userRole: string = 'GUARDIAN', commentId?: string): string {
    const currentRole = (userRole || 'MEMBER').toUpperCase();
    const allowed = this.getAllowedAwardTypes(currentRole);

    const awardCardsHtml = this.AWARDS.map((award) => {
      const isUnlocked = this.canGiveAward(currentRole, award.type);
      const isSelected = award.type === this.selectedAwardType;

      let roleRequirementText = 'Available for All';
      if (award.type === 'PLATINUM' || award.type === 'GUARDIAN_CHOICE') {
        roleRequirementText = '👑 Guardian Only';
      } else if (award.type === 'GOLD' || award.type === 'ZK_VERIFIED') {
        roleRequirementText = '📜 Archivist+';
      } else if (award.type === 'SILVER') {
        roleRequirementText = '🛡️ Moderator+';
      } else {
        roleRequirementText = '✨ Member+';
      }

      if (!isUnlocked) {
        return `
          <div class="relative p-3.5 rounded-2xl bg-surface-base/40 border border-white/5 opacity-45 grayscale cursor-not-allowed select-none transition-all flex flex-col justify-between">
            <div class="flex items-start space-x-3">
              <div class="text-3xl p-2 rounded-xl bg-surface-overlay/40 shrink-0">
                ${award.emoji}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-400 truncate">${escapeHtml(award.label)}</span>
                  <span class="text-[9px] font-mono text-slate-500 font-bold">🔒 LOCKED</span>
                </div>
                <p class="text-[11px] text-slate-400 leading-snug mt-1 line-clamp-2">
                  ${escapeHtml(award.description)}
                </p>
              </div>
            </div>
            <div class="mt-2.5 text-[9px] font-mono text-crimson/80 bg-crimson/10 px-2 py-0.5 rounded border border-crimson/20 flex items-center justify-between">
              <span>Tier privilege requirement</span>
              <span class="font-bold">${roleRequirementText}</span>
            </div>
          </div>
        `;
      }

      return `
        <label 
          class="award-option-card relative p-3.5 rounded-2xl bg-surface-base hover:bg-surface-raised border cursor-pointer select-none transition-all duration-150 flex flex-col justify-between ${
            isSelected
              ? `border-cyphr bg-surface-raised ring-1 ring-cyphr/50 shadow-cyphr-sm`
              : `border-white/10 hover:border-white/20`
          }"
          data-award-type="${award.type}"
        >
          <div class="flex items-start space-x-3">
            <div class="text-3xl p-2 rounded-xl bg-surface-overlay/80 shrink-0 border border-white/10">
              ${award.emoji}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold ${award.color} truncate">${escapeHtml(award.label)}</span>
                <div class="flex items-center space-x-2">
                  <span class="text-[10px] font-mono text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    +${award.meritPoints.toLocaleString()} Merit Points
                  </span>
                  <input 
                    type="radio" 
                    name="award_selection" 
                    value="${award.type}" 
                    ${isSelected ? 'checked' : ''}
                    class="accent-cyan-400 cursor-pointer h-3.5 w-3.5"
                  />
                </div>
              </div>
              <p class="text-[11px] text-slate-300 leading-snug mt-1">
                ${escapeHtml(award.description)}
              </p>
            </div>
          </div>

          <div class="mt-2.5 flex items-center justify-between text-[9px] font-mono text-signal bg-signal/10 px-2 py-0.5 rounded border border-signal/20">
            <span>● Unlocked for ${escapeHtml(currentRole)}</span>
            <span class="text-slate-400">${roleRequirementText}</span>
          </div>
        </label>
      `;
    }).join('');

    const selectedAward = this.getAwardByType(this.selectedAwardType) || this.AWARDS[0];

    // Format recipient identification
    let recipientDisplay = commentId
      ? `Comment: ${escapeHtml(commentId.slice(0, 12))}`
      : `Post: ${escapeHtml(postId.slice(0, 16))}`;

    return `
      <div id="aetheris-award-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-md animate-in fade-in duration-150" data-post-id="${postId}" ${commentId ? `data-comment-id="${commentId}"` : ''}>
        <div class="relative w-full max-w-2xl bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <!-- MODAL HEADER -->
          <div class="px-5 py-4 border-b border-white/10 bg-surface-raised flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              <div class="w-9 h-9 rounded-xl bg-surface-base flex items-center justify-center text-xl border border-[var(--color-accent,#e59b3c)]/40 shadow-xs">
                🏅
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <span>Bestow Recognition Award</span>
                  <span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-overlay text-cyphr border border-cyphr/30">
                    ${recipientDisplay}
                  </span>
                </h3>
                <p class="text-[11px] text-slate-400 font-sans">
                  Honest peer-to-peer social recognition &bull; Signed with sovereign key
                </p>
              </div>
            </div>

            <button 
              type="button"
              class="btn-close-award-modal text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-surface-overlay transition-colors font-mono text-sm cursor-pointer"
              title="${t('modal.close', undefined, 'Close modal')} (Esc)"
            >
              ✕
            </button>
          </div>

          <!-- MODAL BODY: AWARDS GRID -->
          <div class="p-5 overflow-y-auto space-y-4 flex-1">
            <div class="flex items-center justify-between text-xs font-sans text-slate-400">
              <span class="uppercase tracking-wider text-[10px] font-bold">Select Accolade:</span>
              <span class="text-[10px] text-slate-500">7 Sovereign Recognition Tiers</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${awardCardsHtml}
            </div>

            <!-- COMMENT MEMO INPUT -->
            <div class="pt-2 space-y-1.5">
              <label class="block text-[11px] font-sans text-slate-300 font-semibold">
                Citation or Peer Note <span class="text-slate-500 font-normal">(Optional, publicly visible)</span>
              </label>
              <div class="relative">
                <textarea 
                  id="input-award-comment"
                  rows="2"
                  maxlength="280"
                  placeholder="Add a peer acknowledgement or citation..."
                  class="w-full bg-surface-raised border border-white/10 focus:border-cyphr rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all font-sans resize-none"
                ></textarea>
                <div class="text-[9px] font-mono text-slate-500 text-right pr-1 pt-0.5">Max 280 chars &bull; Encrypted in post metadata</div>
              </div>
            </div>

            <!-- SELECTED AWARD PREVIEW -->
            <div class="p-3.5 rounded-2xl bg-surface-raised border border-white/5 flex items-center space-x-3 text-xs">
              <div class="text-3xl">${selectedAward.emoji}</div>
              <div class="flex-1 min-w-0">
                <div class="font-bold ${selectedAward.color}">Selected: ${escapeHtml(selectedAward.label)}</div>
                <div class="text-[10px] text-slate-400 truncate">${escapeHtml(selectedAward.description)}</div>
              </div>
            </div>
          </div>

          <!-- MODAL FOOTER -->
          <div class="px-5 py-3.5 border-t border-white/10 bg-surface-raised/50 flex items-center justify-between">
            <div class="text-[10px] font-mono text-slate-500 flex items-center space-x-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-signal"></span>
              <span>Signed with Sovereign Key &bull; Cryptographically Verified</span>
            </div>

            <div class="flex items-center space-x-2.5">
              <button 
                type="button"
                class="btn-close-award-modal px-3.5 py-1.5 rounded-xl text-xs font-mono text-slate-300 hover:text-white hover:bg-surface-overlay border border-white/5 transition-all cursor-pointer"
              >
                ${t('common.cancel', undefined, 'Cancel')}
              </button>

              <button 
                type="button"
                id="btn-confirm-give-award"
                class="px-4 py-2 bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-black font-bold text-xs rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                data-post-id="${postId}"
                ${commentId ? `data-comment-id="${commentId}"` : ''}
              >
                <span>🏅</span>
                <span>Bestow ${escapeHtml(selectedAward.label)}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // ─── Interactive DOM Event Handling ────────────────────────────────────────

  private _initGlobalDomListeners(): void {
    if (typeof document === 'undefined') return;

    // Delegate clicks for open, close, select, and submit
    document.addEventListener('click', async (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. Open award modal on post
      const openBtn = target.closest('.btn-open-award-modal, .btn-detail-award') as HTMLElement | null;
      if (openBtn) {
        e.preventDefault();
        const postId = openBtn.getAttribute('data-post-id') || openBtn.getAttribute('data-award-id');
        const userRole = openBtn.getAttribute('data-user-role') || 'GUARDIAN';
        if (postId) {
          this.openModal(postId, userRole);
        }
        return;
      }

      // 1b. Open award modal on comment
      const openCommentBtn = target.closest('.btn-open-comment-award-modal') as HTMLElement | null;
      if (openCommentBtn) {
        e.preventDefault();
        const commentId = openCommentBtn.getAttribute('data-comment-id');
        const postId = openCommentBtn.getAttribute('data-post-id') || '';
        const userRole = openCommentBtn.getAttribute('data-user-role') || 'GUARDIAN';
        if (commentId) {
          this.openCommentModal(commentId, postId, userRole);
        }
        return;
      }

      // 2. Close modal
      const closeBtn = target.closest('.btn-close-award-modal') as HTMLElement | null;
      if (closeBtn) {
        e.preventDefault();
        this.closeModal();
        return;
      }

      // 3. Modal backdrop click to close
      const modal = target as HTMLElement;
      if (modal && modal.id === 'aetheris-award-modal' && e.target === modal) {
        this.closeModal();
        return;
      }

      // 4. Select award card inside modal
      const optionCard = target.closest('.award-option-card') as HTMLElement | null;
      if (optionCard) {
        const type = optionCard.getAttribute('data-award-type') as SovereignAwardType | null;
        if (type) {
          this.selectedAwardType = type;
          const radio = optionCard.querySelector('input[type="radio"]') as HTMLInputElement | null;
          if (radio) radio.checked = true;

          document.querySelectorAll('.award-option-card').forEach((el) => {
            el.classList.remove('border-cyphr', 'ring-1', 'ring-cyphr/50', 'shadow-cyphr-sm');
            el.classList.add('border-white/10');
          });
          optionCard.classList.remove('border-white/10');
          optionCard.classList.add('border-cyphr', 'ring-1', 'ring-cyphr/50', 'shadow-cyphr-sm');

          // Update confirm button text
          const awardDef = this.getAwardByType(type);
          const confirmBtn = document.getElementById('btn-confirm-give-award');
          if (confirmBtn && awardDef) {
            confirmBtn.innerHTML = `<span>🏅</span><span>Bestow ${escapeHtml(awardDef.label)}</span>`;
          }
        }
        return;
      }

      // 5. Confirm grant award button
      const confirmBtn = target.closest('#btn-confirm-give-award') as HTMLElement | null;
      if (confirmBtn) {
        e.preventDefault();
        const postId = confirmBtn.getAttribute('data-post-id') || this.activeModalPostId;
        const commentId = confirmBtn.getAttribute('data-comment-id') || this.activeModalCommentId;
        if (!postId) return;

        const commentInput = document.getElementById('input-award-comment') as HTMLTextAreaElement | null;
        const comment = commentInput ? commentInput.value : '';

        const giverFP = (typeof window !== 'undefined' ? window.activeUserFP : undefined) || 'self.sovereign';
        const giverRole = (typeof window !== 'undefined' ? window.activeUserRole : undefined) || 'GUARDIAN';

        confirmBtn.setAttribute('disabled', 'true');
        const prevText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = `<span>⏳</span><span>Bestowing...</span>`;

        let success = false;
        try {
          if (commentId) {
            success = await this.giveCommentAward(commentId, postId, this.selectedAwardType, giverFP, giverRole, comment);
          } else {
            success = await this.giveAward(postId, this.selectedAwardType, giverFP, giverRole, comment);
          }
        } finally {
          confirmBtn.removeAttribute('disabled');
          confirmBtn.innerHTML = prevText;
        }

        if (success) {
          this.closeModal();
          this.refreshPostBadgesInDom(postId);
          if (commentId) {
            this.refreshCommentBadgesInDom(commentId);
          }
        }
      }
    });

    // Handle Escape key to close modal
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (this.activeModalPostId || this.activeModalCommentId)) {
        this.closeModal();
      }
    });
  }

  public openModal(postId: string, userRole: string = 'GUARDIAN'): void {
    if (typeof document === 'undefined') return;

    this.activeModalPostId = postId;
    this.activeModalCommentId = null;
    const allowed = this.getAllowedAwardTypes(userRole);
    if (allowed.length > 0 && !allowed.includes(this.selectedAwardType)) {
      this.selectedAwardType = allowed[0];
    }

    this.closeModal(); // Remove any existing instance

    const container = document.createElement('div');
    container.id = 'award-modal-root';
    container.innerHTML = this.renderAwardModal(postId, userRole);
    document.body.appendChild(container);
  }

  public openCommentModal(commentId: string, postId: string, userRole: string = 'GUARDIAN'): void {
    if (typeof document === 'undefined') return;

    this.activeModalPostId = postId;
    this.activeModalCommentId = commentId;
    const allowed = this.getAllowedAwardTypes(userRole);
    if (allowed.length > 0 && !allowed.includes(this.selectedAwardType)) {
      this.selectedAwardType = allowed[0];
    }

    this.closeModal();

    const container = document.createElement('div');
    container.id = 'award-modal-root';
    container.innerHTML = this.renderAwardModal(postId, userRole, commentId);
    document.body.appendChild(container);
  }

  public closeModal(): void {
    this.activeModalPostId = null;
    this.activeModalCommentId = null;
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('award-modal-root');
    if (existing) {
      existing.remove();
    }
    const modalDirect = document.getElementById('aetheris-award-modal');
    if (modalDirect) {
      modalDirect.remove();
    }
  }

  public refreshPostBadgesInDom(postId: string): void {
    if (typeof document === 'undefined') return;
    const containers = document.querySelectorAll(`.award-badges-container[data-post-id="${postId}"]`);
    containers.forEach((container) => {
      container.outerHTML = this.renderAwardBadges(postId);
    });
  }

  public refreshCommentBadgesInDom(commentId: string): void {
    if (typeof document === 'undefined') return;
    const containers = document.querySelectorAll(`.comment-award-badges[data-comment-id="${commentId}"]`);
    if (containers.length > 0) {
      containers.forEach((container) => {
        container.outerHTML = this.renderCommentAwardBadges(commentId);
      });
    } else {
      // Fallback: locate comment actions or comment header and append
      const actionBtn = document.querySelector(`.btn-open-comment-award-modal[data-comment-id="${commentId}"]`);
      if (actionBtn) {
        const commentContainer = actionBtn.closest('.border-l-2, .comment-node, div[id^="comment-"]') || actionBtn.parentElement?.parentElement;
        const header = commentContainer?.querySelector('.flex.items-center.space-x-2, .items-center');
        if (header) {
          const temp = document.createElement('div');
          temp.innerHTML = this.renderCommentAwardBadges(commentId);
          if (temp.firstElementChild) {
            header.appendChild(temp.firstElementChild);
          }
        }
      }
    }
  }

  private _refreshPostBadgesInDom(postId: string): void {
    this.refreshPostBadgesInDom(postId);
  }

  private _refreshCommentBadgesInDom(commentId: string): void {
    this.refreshCommentBadgesInDom(commentId);
  }
}

/**
 * Singleton manager for the floating award details popover.
 * Ensures only ONE popover exists on screen at any time, eliminating overlapping / colliding popups.
 */
export class AwardPopoverManager {
  private popoverEl: HTMLElement | null = null;
  private currentTarget: HTMLElement | null = null;
  private hideTimer: any = null;
  private initialized: boolean = false;

  public init(): void {
    if (typeof document === 'undefined') return;
    if (this.initialized) return;
    this.initialized = true;

    let popover = document.getElementById('aetheris-award-popover');
    if (!popover) {
      popover = document.createElement('div');
      popover.id = 'aetheris-award-popover';
      popover.className = 'fixed z-[9999] pointer-events-none opacity-0 transform translate-y-1 transition-all duration-150 ease-out w-64 max-w-[90vw] p-2.5 rounded-xl bg-surface-base/98 border border-white/15 shadow-2xl backdrop-blur-xl text-slate-200 select-none';
      popover.style.display = 'none';
      popover.innerHTML = `
        <div id="award-popover-content"></div>
        <div id="award-popover-arrow" class="absolute w-2.5 h-2.5 bg-surface-base border-r border-b border-white/15 transform rotate-45 pointer-events-none"></div>
      `;
      document.body.appendChild(popover);
    }
    this.popoverEl = popover;

    this.bindEvents();
  }

  private bindEvents(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('mouseover', (e: MouseEvent) => {
      const chip = (e.target as HTMLElement)?.closest('.award-badge-chip') as HTMLElement | null;
      if (chip) {
        clearTimeout(this.hideTimer);
        this.show(chip);
      }
    }, { passive: true });

    document.addEventListener('mouseout', (e: MouseEvent) => {
      const chip = (e.target as HTMLElement)?.closest('.award-badge-chip') as HTMLElement | null;
      if (chip && chip === this.currentTarget) {
        this.hideTimer = setTimeout(() => {
          this.hide();
        }, 80);
      }
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (this.currentTarget) {
        this.hide();
      }
    }, { passive: true });
  }

  public show(chip: HTMLElement): void {
    if (!this.popoverEl) this.init();
    if (!this.popoverEl) return;

    clearTimeout(this.hideTimer);
    this.currentTarget = chip;
    const emoji = chip.getAttribute('data-award-emoji') || '🏆';
    const label = chip.getAttribute('data-award-label') || 'Award';
    const count = chip.getAttribute('data-award-count') || '1';
    const color = chip.getAttribute('data-award-color') || 'text-amber';
    const points = chip.getAttribute('data-award-points') || '10';
    const desc = chip.getAttribute('data-award-desc') || '';
    const givers = chip.getAttribute('data-award-givers') || '';

    let comments: Array<{ giver: string; text: string }> = [];
    try {
      comments = JSON.parse(chip.getAttribute('data-award-comments') || '[]');
    } catch (_) {}

    const commentsHtml = comments.map((c) => `
      <div class="text-[10px] text-slate-300 border-l-2 border-indigo-500/50 pl-2 my-1 bg-surface-overlay/40 py-0.5 rounded-r">
        <span class="font-mono text-cyan-400 font-bold">${escapeHtml(c.giver.slice(0, 8))}</span>: &ldquo;${escapeHtml(c.text)}&rdquo;
      </div>
    `).join('');

    const giversHtml = givers ? `
      <div class="text-[9px] font-mono text-slate-400 pt-1 mt-1 border-t border-white/10 truncate">
        Conferred by: ${escapeHtml(givers)}
      </div>
    ` : '';

    const contentEl = this.popoverEl.querySelector('#award-popover-content');
    if (contentEl) {
      contentEl.innerHTML = `
        <div class="flex items-center space-x-1.5 pb-1 border-b border-white/10">
          <span class="text-base leading-none">${emoji}</span>
          <span class="text-xs font-bold ${color}">${escapeHtml(label)} <span class="text-[10px] text-slate-400 font-normal">(${count})</span></span>
          <span class="text-[10px] font-sans text-amber-400 font-semibold ml-auto bg-amber-500/10 px-1.5 py-0.2 rounded-full border border-amber-500/20">Accolade</span>
        </div>
        ${desc ? `<p class="text-[10px] text-slate-300 leading-snug py-1">${desc}</p>` : ''}
        ${commentsHtml}
        ${giversHtml}
      `;
    }

    this.popoverEl.style.display = 'block';

    // Measure & Position
    const rect = chip.getBoundingClientRect();
    const popoverWidth = this.popoverEl.offsetWidth || 256;
    const popoverHeight = this.popoverEl.offsetHeight || 130;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, left));

    let top = rect.top - popoverHeight - 8;
    const arrow = this.popoverEl.querySelector('#award-popover-arrow') as HTMLElement | null;

    if (top < 12) {
      // Flip below if not enough room on top
      top = rect.bottom + 8;
      if (arrow) {
        arrow.style.top = '-5px';
        arrow.style.bottom = 'auto';
        arrow.style.borderWidth = '1px 0 0 1px';
      }
    } else {
      // Position on top
      if (arrow) {
        arrow.style.top = 'auto';
        arrow.style.bottom = '-5px';
        arrow.style.borderWidth = '0 1px 1px 0';
      }
    }

    if (arrow) {
      const chipCenter = rect.left + rect.width / 2;
      const arrowX = Math.max(16, Math.min(popoverWidth - 16, chipCenter - left));
      arrow.style.left = `${arrowX - 5}px`;
    }

    this.popoverEl.style.left = `${Math.round(left)}px`;
    this.popoverEl.style.top = `${Math.round(top)}px`;
    this.popoverEl.style.opacity = '1';
    this.popoverEl.style.transform = 'translateY(0)';
  }

  public hide(): void {
    if (!this.popoverEl) return;
    clearTimeout(this.hideTimer);
    this.popoverEl.style.opacity = '0';
    this.popoverEl.style.transform = 'translateY(2px)';
    this.hideTimer = setTimeout(() => {
      if (this.popoverEl && this.popoverEl.style.opacity === '0') {
        this.popoverEl.style.display = 'none';
      }
    }, 150);
    this.currentTarget = null;
  }
}

export const awardPopoverManager = new AwardPopoverManager();

// ─── Singleton Export ────────────────────────────────────────────────────────
export const awardsSystem = new AwardsSystem();

serviceRegistry.registerInstance(SERVICES.Awards, awardsSystem);
