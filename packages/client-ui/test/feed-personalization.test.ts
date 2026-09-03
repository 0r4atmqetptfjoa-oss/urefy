import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  FeedPersonalizationEngine,
  feedPersonalization,
  type ContentSignal,
  type UserInteraction,
  type PersonalizationScore,
} from '../src/feed-personalization.js';

describe('Feed Personalization & Sovereign Recommendation Engine', () => {
  let engine: FeedPersonalizationEngine;

  beforeEach(() => {
    // Clear localStorage simulation if present
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    engine = new FeedPersonalizationEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 1. INITIALIZATION & BASELINE STATE ─────────────────────────────────────

  describe('1. Default Initialization & Baseline State', () => {
    it('should initialize with default content signals and seed interactions', () => {
      expect(engine.contentSignals.size).toBeGreaterThanOrEqual(5);
      expect(engine.userHistory.length).toBeGreaterThanOrEqual(7);
      expect(engine.topicInterests.size).toBeGreaterThan(0);
      expect(engine.mutedAuthors.size).toBe(0);
      expect(engine.mutedTags.size).toBe(0);

      // Verify known seed content signals
      expect(engine.contentSignals.has('post-zk-01')).toBe(true);
      expect(engine.contentSignals.has('post-treekem-02')).toBe(true);
      expect(engine.contentSignals.has('post-vault-03')).toBe(true);

      const zkSignal = engine.contentSignals.get('post-zk-01');
      expect(zkSignal?.tags).toContain('#ZeroKnowledge');
      expect(zkSignal?.authorFP).toBe('aeth_zk_9f82a1b4');
    });

    it('should export singleton instance feedPersonalization correctly', () => {
      expect(feedPersonalization).toBeInstanceOf(FeedPersonalizationEngine);
      expect(typeof feedPersonalization.scorePost).toBe('function');
      expect(typeof feedPersonalization.sortFeed).toBe('function');
    });
  });

  // ─── 2. SIGNAL REGISTRATION & INTERACTION TRACKING ──────────────────────────

  describe('2. Signal Ingestion & Interaction Tracking Dynamics', () => {
    it('should register single and batch content signals', () => {
      const customSignal: ContentSignal = {
        postId: 'post-quantum-99',
        tags: ['#PostQuantum', '#LatticeCrypto'],
        flair: 'RESEARCH PAPER',
        channelId: 'crypto-research',
        score: 55,
        authorFP: 'aeth_pq_3391aa',
        title: 'Falcon & Dilithium Signature Implementations in Rust',
      };

      engine.registerContentSignal(customSignal);
      expect(engine.contentSignals.has('post-quantum-99')).toBe(true);

      const retrieved = engine.contentSignals.get('post-quantum-99');
      expect(retrieved?.title).toContain('Falcon & Dilithium');
      expect(retrieved?.score).toBe(55);

      // Batch registration
      const batch: ContentSignal[] = [
        {
          postId: 'post-mesh-01',
          tags: ['#MeshNetwork', '#P2P'],
          flair: 'ANNOUNCEMENT',
          channelId: 'relays',
          score: 12,
          authorFP: 'aeth_mesh_88',
        },
      ];
      engine.registerContentSignals(batch);
      expect(engine.contentSignals.has('post-mesh-01')).toBe(true);
    });

    it('should track user interaction and recompute topic affinities', () => {
      const initialScore = engine.topicInterests.get('#ZeroKnowledge') || 0;

      const interaction: UserInteraction = {
        postId: 'post-zk-01',
        type: 'upvote',
        timestamp: Date.now(),
        dwellTimeMs: 30000, // Deep read
      };

      engine.trackInteraction(interaction);

      expect(engine.userHistory.length).toBeGreaterThan(7);
      const last = engine.userHistory[engine.userHistory.length - 1];
      expect(last.postId).toBe('post-zk-01');
      expect(last.type).toBe('upvote');
      expect(last.dwellTimeMs).toBe(30000);
      expect(engine.topicInterests.get('#ZeroKnowledge')).toBeGreaterThanOrEqual(initialScore);
    });

    it('should modulate interaction weights by dwell time tiers', () => {
      // Bounce (< 2500ms)
      const bounceInteraction: UserInteraction = {
        postId: 'post-vault-03',
        type: 'view',
        timestamp: Date.now(),
        dwellTimeMs: 1200,
      };
      engine.trackInteraction(bounceInteraction);
      expect(engine.userHistory[engine.userHistory.length - 1].dwellTimeMs).toBe(1200);

      // Deep read (> 22000ms)
      const deepReadInteraction: UserInteraction = {
        postId: 'post-airgap-04',
        type: 'view',
        timestamp: Date.now(),
        dwellTimeMs: 45000,
      };
      engine.trackInteraction(deepReadInteraction);
      expect(engine.userHistory[engine.userHistory.length - 1].dwellTimeMs).toBe(45000);
    });
  });

  // ─── 3. MULTI-FACTOR SCORING & RECOMMENDATION ALGORITHM ─────────────────────

  describe('3. Multi-Factor Scoring & Composite Recommendations', () => {
    it('should compute high relevance score for content matching user interests', () => {
      const zkSignal = engine.contentSignals.get('post-zk-01')!;
      const score: PersonalizationScore = engine.scorePost(zkSignal);

      expect(score.postId).toBe('post-zk-01');
      expect(score.relevanceScore).toBeGreaterThanOrEqual(50);
      expect(score.relevanceScore).toBeLessThanOrEqual(100);
      expect(score.reasons.length).toBeGreaterThan(0);
      expect(score.breakdown).toBeDefined();
      expect(score.breakdown?.topicScore).toBeGreaterThan(0);
      expect(score.breakdown?.authorScore).toBeGreaterThan(0);
      expect(score.breakdown?.meritScore).toBeGreaterThan(0);
      expect(score.breakdown?.freshnessScore).toBeGreaterThan(0);
    });

    it('should assign score of 0 when author is muted', () => {
      const zkSignal = engine.contentSignals.get('post-zk-01')!;
      engine.muteAuthor(zkSignal.authorFP);

      const score = engine.scorePost(zkSignal);
      expect(score.relevanceScore).toBe(0);
      expect(score.reasons[0]).toContain('Author manually muted');
      expect(score.breakdown?.viewPenalty).toBe(100);
    });

    it('should penalize downvoted content heavily', () => {
      const customSignal: ContentSignal = {
        postId: 'post-spam-01',
        tags: ['#Security'],
        flair: 'DISCUSSION',
        channelId: 'general',
        score: 1,
        authorFP: 'aeth_spammer_99',
      };

      engine.registerContentSignal(customSignal);
      engine.trackInteraction({
        postId: 'post-spam-01',
        type: 'downvote',
        timestamp: Date.now(),
        dwellTimeMs: 1500,
      });

      const score = engine.scorePost(customSignal);
      expect(score.breakdown?.viewPenalty).toBe(90);
      expect(score.reasons.some((r) => r.includes('You downvoted this post'))).toBe(true);
    });

    it('should penalize skipped content appropriately', () => {
      const customSignal: ContentSignal = {
        postId: 'post-skip-02',
        tags: ['#Protocol'],
        flair: 'DISCUSSION',
        channelId: 'general',
        score: 5,
        authorFP: 'aeth_user_11',
      };

      engine.registerContentSignal(customSignal);
      engine.trackInteraction({
        postId: 'post-skip-02',
        type: 'skip',
        timestamp: Date.now(),
        dwellTimeMs: 800,
      });

      const score = engine.scorePost(customSignal);
      expect(score.breakdown?.viewPenalty).toBe(45);
      expect(score.reasons.some((r) => r.includes('Previously skipped post'))).toBe(true);
    });
  });

  // ─── 4. FEED SORTING & EXPLAINABILITY ───────────────────────────────────────

  describe('4. Feed Sorting Pipeline & Explanation API', () => {
    it('should sort feed descending by relevance score', () => {
      const posts: ContentSignal[] = Array.from(engine.contentSignals.values());
      const sorted = engine.sortFeed(posts);

      expect(sorted.length).toBe(posts.length);

      // Verify descending order
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].relevanceScore).toBeGreaterThanOrEqual(sorted[i + 1].relevanceScore);
      }
    });

    it('should explain score for known post IDs', () => {
      const reasons = engine.explainScore('post-zk-01');
      expect(Array.isArray(reasons)).toBe(true);
      expect(reasons.length).toBeGreaterThan(0);
    });

    it('should return fallback message for unknown or missing post ID', () => {
      const emptyReasons = engine.explainScore('');
      expect(emptyReasons[0]).toContain('Missing');

      const unknownReasons = engine.explainScore('non-existent-post-id-12345');
      expect(unknownReasons[0]).toContain('New post');
    });
  });

  // ─── 5. DATA SOVEREIGNTY & MANUAL OVERRIDES ─────────────────────────────────

  describe('5. Manual Overrides, Muting & Sovereignty Controls', () => {
    it('should set manual interest and prioritize it in topic computation', () => {
      engine.setManualInterest('#RustLang', 95);

      expect(engine.manualOverrides.get('#RustLang')).toBe(95);
      expect(engine.topicInterests.get('#RustLang')).toBeGreaterThan(80);

      // Adjust interest by delta
      engine.adjustInterest('#RustLang', -15);
      expect(engine.manualOverrides.get('#RustLang')).toBeGreaterThan(0);
    });

    it('should mute and unmute topics properly', () => {
      engine.muteTopic('#ZeroKnowledge');
      expect(engine.mutedTags.has('#ZeroKnowledge')).toBe(true);
      expect(engine.topicInterests.get('#ZeroKnowledge')).toBeUndefined();

      engine.unmuteTopic('#ZeroKnowledge');
      expect(engine.mutedTags.has('#ZeroKnowledge')).toBe(false);
      engine.computeTopicInterests();
      expect(engine.topicInterests.get('#ZeroKnowledge')).toBeDefined();
    });

    it('should mute and unmute authors properly', () => {
      engine.muteAuthor('aeth_tree_77ac32');
      expect(engine.mutedAuthors.has('aeth_tree_77ac32')).toBe(true);

      engine.unmuteAuthor('aeth_tree_77ac32');
      expect(engine.mutedAuthors.has('aeth_tree_77ac32')).toBe(false);
    });

    it('should reset all manual adjustments cleanly', () => {
      engine.setManualInterest('#CustomTopic', 90);
      engine.muteAuthor('aeth_test_author');
      engine.muteTopic('#SomeTag');

      engine.resetInterests();

      expect(engine.manualOverrides.size).toBe(0);
      expect(engine.mutedAuthors.size).toBe(0);
      expect(engine.mutedTags.size).toBe(0);
    });

    it('should export and import personalization profile via JSON', () => {
      engine.setManualInterest('#ExportTest', 85);
      engine.muteAuthor('aeth_muted_export');

      const jsonStr = engine.exportData();
      expect(typeof jsonStr).toBe('string');
      expect(jsonStr).toContain('#ExportTest');
      expect(jsonStr).toContain('aeth_muted_export');

      const newEngine = new FeedPersonalizationEngine();
      newEngine.clearHistory();

      const success = newEngine.importData(jsonStr);
      expect(success).toBe(true);
      expect(newEngine.manualOverrides.get('#ExportTest')).toBe(85);
      expect(newEngine.mutedAuthors.has('aeth_muted_export')).toBe(true);
    });

    it('should reject invalid JSON gracefully in importData', () => {
      const success = engine.importData('invalid-corrupt-json-string{{{');
      expect(success).toBe(false);
    });
  });

  // ─── 6. ANALYTICS & TELEMETRY ───────────────────────────────────────────────

  describe('6. Telemetry & Analytics Aggregation', () => {
    it('should return top interests sorted by score', () => {
      const top = engine.getTopInterests(5);
      expect(top.length).toBeLessThanOrEqual(5);

      for (let i = 0; i < top.length - 1; i++) {
        expect(top[i].score).toBeGreaterThanOrEqual(top[i + 1].score);
      }
    });

    it('should compute interaction statistics accurately', () => {
      const stats = engine.getStats();

      expect(stats.totalInteractions).toBe(engine.userHistory.length);
      expect(stats.upvotes).toBeGreaterThanOrEqual(0);
      expect(stats.bookmarks).toBeGreaterThanOrEqual(0);
      expect(stats.views).toBeGreaterThanOrEqual(0);
      expect(stats.uniqueAuthorsCount).toBeGreaterThan(0);
      expect(stats.topTopic).toBeDefined();
    });
  });

  // ─── 7. HTML RENDERING & WIDGET GENERATION ──────────────────────────────────

  describe('7. HTML Micro-Widgets & Interests Panel Generation', () => {
    it('should render post personalization widget badge and popover', () => {
      const html = engine.renderPersonalizationWidget('post-zk-01');

      expect(html).toContain('data-personalization-post-id="post-zk-01"');
      expect(html).toContain('Relevance');
      expect(html).toContain('Why am I seeing this?');
      expect(html).toContain('Local TF-IDF');
      expect(html).toContain('Topic Match (TF-IDF):');
      expect(html).toContain('Author Affinity:');
      expect(html).toContain('Merit Consensus:');
      expect(html).toContain('Temporal Freshness:');
      expect(html).toContain('More like this');
      expect(html).toContain('Less like this');
    });

    it('should render full sovereign interests dashboard panel', () => {
      const html = engine.renderInterestsPanel();

      expect(html).toContain('id="sovereign-interests-panel"');
      expect(html).toContain('Sovereign Feed Personalization');
      expect(html).toContain('btn-recompute-interests');
      expect(html).toContain('btn-reset-interests');
      expect(html).toContain('Topic & Tag Interest Scores');
      expect(html).toContain('Local Memory:');
      expect(html).toContain('btn-export-personalization');
      expect(html).toContain('btn-clear-personalization');
      expect(html).toContain('input-custom-topic-tag');
    });
  });
});
