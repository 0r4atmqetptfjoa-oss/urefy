import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AetherisClientStore, ClientPost } from '../src/client-state.js';
import { zkReputation, REPUTATION_TIERS } from '../src/zk-reputation.js';
import { feedControlsEngine } from '../src/feed-controls.js';

class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const mockStorage = new LocalStorageMock();
(globalThis as any).localStorage = mockStorage;

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    location: { protocol: 'https:', host: 'localhost:5173' },
  };
} else if (!(globalThis as any).window.location) {
  (globalThis as any).window.location = { protocol: 'https:', host: 'localhost:5173' };
}

describe('Ticket 1.2: Inline Web-of-Trust Badges & Feed Ranking Demotion', () => {
  let store: AetherisClientStore;

  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
    store = new AetherisClientStore();
    (window as any).clientStore = store;
  });

  it('1. should resolve correct tier and merit score for known and unknown fingerprints', () => {
    const guardianTier = zkReputation.getTierForFingerprint('genesis-core');
    expect(guardianTier.tier).toBe('GENESIS_GUARDIAN');
    expect(zkReputation.getScoreForFingerprint('genesis-core')).toBe(1250);

    const archonTier = zkReputation.getTierForFingerprint('c3dc28cb705e');
    expect(archonTier.tier).toBe('ARCHON');
    expect(zkReputation.getScoreForFingerprint('c3dc28cb705e')).toBe(550);

    const sentinelTier = zkReputation.getTierForFingerprint('a89104fa2211');
    expect(sentinelTier.tier).toBe('SENTINEL');
    expect(zkReputation.getScoreForFingerprint('a89104fa2211')).toBe(250);

    // Unknown fingerprint fallback should never throw
    const unknownScore = zkReputation.getScoreForFingerprint('unknown-peer-404');
    expect(typeof unknownScore).toBe('number');
    expect(unknownScore).toBeGreaterThanOrEqual(0);
    const unknownTier = zkReputation.getTierForFingerprint('unknown-peer-404');
    expect(unknownTier).toBeDefined();
    expect(unknownTier.label).toBeDefined();
  });

  it('2. should render inline badge with signal green for >= SENTINEL and neutral/muted for lower tiers', () => {
    const sentinelHtml = zkReputation.renderInlineTrustBadge('a89104fa2211');
    expect(sentinelHtml).toContain('text-emerald-400');
    expect(sentinelHtml).toContain('🛡️');
    expect(sentinelHtml).toContain('Trust 250');

    const lowTrustHtml = zkReputation.renderInlineTrustBadge('bad-actor-001');
    expect(lowTrustHtml).toContain('bg-surface-overlay');
    expect(lowTrustHtml).toContain('Trust 5');
  });

  it('3. should manage trust preferences in AetherisClientStore and localStorage', () => {
    expect(store.showTrustBadges).toBe(true);
    expect(store.minFeedTrustThreshold).toBe(0);
    expect(store.demoteLowTrustPosts).toBe(false);

    store.setShowTrustBadges(false);
    expect(store.showTrustBadges).toBe(false);
    expect(mockStorage.getItem('aetheris_show_trust_badges')).toBe('false');

    store.setMinFeedTrustThreshold(150);
    expect(store.minFeedTrustThreshold).toBe(150);
    expect(mockStorage.getItem('aetheris_min_feed_trust_threshold')).toBe('150');

    store.setDemoteLowTrustPosts(true);
    expect(store.demoteLowTrustPosts).toBe(true);
    expect(mockStorage.getItem('aetheris_demote_low_trust_posts')).toBe('true');
  });

  it('4. should render trust badge inline on posts when enabled and hide when disabled', () => {
    const samplePost: ClientPost = {
      id: 'post-test-1',
      title: 'Cryptographic Protocol Specification',
      content: 'Zero knowledge verifiable computation specification...',
      authorFingerprint: 'a89104fa2211',
      authorRole: 'MODERATOR',
      channelId: 'vault-releases',
      createdAt: Date.now(),
      meritVotes: 42,
      replyCount: 3,
      boostCount: 1,
      flair: 'VERIFIED RELEASE'
    };

    store.setShowTrustBadges(true);
    const cardHtmlWithBadge = feedControlsEngine.renderCardPost(samplePost);
    expect(cardHtmlWithBadge).toContain('Trust 250');
    expect(cardHtmlWithBadge).toContain('text-emerald-400');

    store.setShowTrustBadges(false);
    const cardHtmlWithoutBadge = feedControlsEngine.renderCardPost(samplePost);
    expect(cardHtmlWithoutBadge).not.toContain('Trust 250');
  });

  it('5. should softly demote low-trust posts with opacity-70 and sort them to the end without deleting them', () => {
    const highTrustPost: ClientPost = {
      id: 'post-high',
      title: 'Genesis Block Ceremony',
      content: 'Consensus verified...',
      authorFingerprint: 'genesis-core', // Score 1250
      authorRole: 'GUARDIAN',
      channelId: 'pulse-global',
      createdAt: Date.now() - 1000,
      meritVotes: 10,
      replyCount: 0,
      boostCount: 0,
      flair: 'MICRO-PULSE'
    };

    const lowTrustPost: ClientPost = {
      id: 'post-low',
      title: 'Unverified Rumor',
      content: 'Suspicious payload...',
      authorFingerprint: 'bad-actor-001', // Score 5
      authorRole: 'MEMBER',
      channelId: 'pulse-global',
      createdAt: Date.now(), // Newer post
      meritVotes: 50, // Higher merit votes
      replyCount: 0,
      boostCount: 0,
      flair: 'MICRO-PULSE'
    };

    // Before demotion enabled:
    store.demoteLowTrustPosts = false;
    store.minFeedTrustThreshold = 0;
    const postHtmlNormal = feedControlsEngine.renderCardPost(lowTrustPost);
    expect(postHtmlNormal).not.toContain('opacity-70');

    // Enable demotion for threshold = 100:
    store.demoteLowTrustPosts = true;
    store.minFeedTrustThreshold = 100;

    // The low trust post should have opacity-70
    const postHtmlDemoted = feedControlsEngine.renderCardPost(lowTrustPost);
    expect(postHtmlDemoted).toContain('opacity-70');

    // High trust post should not have opacity-70
    const postHtmlHigh = feedControlsEngine.renderCardPost(highTrustPost);
    expect(postHtmlHigh).not.toContain('opacity-70');

    // Sort order: low trust post should be demoted to end of list
    const sorted = feedControlsEngine.filterAndSortPosts([lowTrustPost, highTrustPost]);
    expect(sorted.length).toBe(2);
    expect(sorted[0].id).toBe('post-high');
    expect(sorted[1].id).toBe('post-low');
  });
});
