// sovereign-board-architecture.test.ts — Comprehensive Test Suite
// Validates Sovereign Board Architecture in UREfy Platform
// 100% English, 0% trademark names in codebase.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { feedControlsEngine, FeedControlsEngine, ViewMode, SortType, TopTimeframe } from '../src/feed-controls.js';
import { awardsSystem, AwardsSystem, SovereignAwardType } from '../src/awards.js';
import { sovereignCircleEngine, SovereignCircleEngine } from '../src/sovereign-circle.js';
import { threadManager, ThreadManager, ThreadComment, DEPTH_COLORS } from '../src/threads.js';
import { clientStore, AetherisClientStore, ClientPost } from '../src/client-state.js';

describe('Sovereign Board Architecture — Comprehensive Test Suite', () => {

  // ─── 1. VIEW MODE SWITCHING SYSTEM ──────────────────────────────────────────
  describe('1. View Mode Switching System (Card, Classic, Compact)', () => {
    let engine: FeedControlsEngine;

    beforeEach(() => {
      engine = new FeedControlsEngine();
    });

    it('should initialize with Card mode as the sovereign default', () => {
      expect(engine.getViewMode()).toBe('card');
    });

    it('should switch between Card, Classic, and Compact modes seamlessly', () => {
      engine.setViewMode('classic');
      expect(engine.getViewMode()).toBe('classic');

      engine.setViewMode('compact');
      expect(engine.getViewMode()).toBe('compact');

      engine.setViewMode('card');
      expect(engine.getViewMode()).toBe('card');
    });

    it('should render distinct layout markup for each view mode', () => {
      const mockPost: ClientPost = {
        id: 'p-architecture-1',
        channelId: 'pulse-global',
        authorFingerprint: 'a1b2c3d4e5f6',
        authorRole: 'GUARDIAN',
        title: 'Zero-Knowledge Recursive SNARK Benchmark',
        content: 'Benchmark tests executing across 1024 mesh nodes with Nova folding schemes.',
        flair: 'VERIFIED RELEASE',
        meritVotes: 420,
        userVoted: 1,
        replyCount: 28,
        boostCount: 15,
        createdAt: Date.now() - 1000 * 3600,
        isExpanded: false,
      };

      // 1. Card Mode: rich card with reactions, expand tree button, and full markdown body
      const cardHtml = engine.renderPost(mockPost, 'card');
      expect(cardHtml).toContain('Zero-Knowledge Recursive SNARK Benchmark');
      expect(cardHtml).toContain('btn-toggle-post-expand');
      expect(cardHtml).toContain('btn-open-detail');
      expect(cardHtml).toContain('btn-upvote');

      // 2. Classic Mode: 2-column layout with left vote column and left thumbnail preview
      const classicHtml = engine.renderPost(mockPost, 'classic');
      expect(classicHtml).toContain('post-classic-p-architecture-1');
      expect(classicHtml).toContain('Comments');
      expect(classicHtml).toContain('btn-copy-post-link');

      // 3. Compact Mode: single-line dense row for ultra-fast skimming
      const compactHtml = engine.renderPost(mockPost, 'compact');
      expect(compactHtml).toContain('post-compact-p-architecture-1');
      expect(compactHtml).toContain('c/zeroknowledge');
    });
  });

  // ─── 2. SORT FILTERS BAR WITH TIMEFRAME DROPDOWN ───────────────────────────
  describe('2. Sort Filters Bar (Hot, New, Top with Timeframe Dropdown, Rising)', () => {
    let engine: FeedControlsEngine;
    let mockPosts: ClientPost[];

    beforeEach(() => {
      engine = new FeedControlsEngine();
      const now = Date.now();
      mockPosts = [
        {
          id: 'post-recent',
          channelId: 'pulse-global',
          authorFingerprint: 'author_1',
          authorRole: 'MEMBER',
          title: 'Recent Broadcast',
          content: 'Just published 5 minutes ago.',
          flair: 'MICRO-PULSE',
          meritVotes: 15,
          userVoted: 0,
          replyCount: 2,
          boostCount: 1,
          createdAt: now - 1000 * 60 * 5, // 5 mins ago
          isExpanded: false,
        },
        {
          id: 'post-hot-velocity',
          channelId: 'pulse-global',
          authorFingerprint: 'author_2',
          authorRole: 'GUARDIAN',
          title: 'Hot Velocity Advisory',
          content: 'Massive engagement surge over the past 2 hours.',
          flair: 'SECURITY ADVISORY',
          meritVotes: 250,
          userVoted: 1,
          replyCount: 45,
          boostCount: 30,
          createdAt: now - 1000 * 3600 * 2, // 2 hours ago
          isExpanded: false,
        },
        {
          id: 'post-top-all-time',
          channelId: 'vault-releases',
          authorFingerprint: 'author_3',
          authorRole: 'ARCHIVIST',
          title: 'Top All Time Canonical Release',
          content: 'Historical distribution with maximum accumulated merit.',
          flair: 'VERIFIED RELEASE',
          meritVotes: 1500,
          userVoted: 0,
          replyCount: 120,
          boostCount: 90,
          createdAt: now - 1000 * 3600 * 24 * 60, // 60 days ago
          isExpanded: false,
        },
      ];
    });

    it('should sort posts by New in descending chronological order', () => {
      engine.setSortType('new');
      const sorted = engine.filterAndSortPosts(mockPosts);
      expect(sorted[0].id).toBe('post-recent');
    });

    it('should sort posts by Top with All Time window', () => {
      engine.setSortType('top');
      engine.setTopTimeframe('all');
      const sorted = engine.filterAndSortPosts(mockPosts);
      expect(sorted[0].id).toBe('post-top-all-time');
      expect(sorted[0].meritVotes).toBe(1500);
    });

    it('should filter posts by Top with Today window', () => {
      engine.setSortType('top');
      engine.setTopTimeframe('today');
      const sorted = engine.filterAndSortPosts(mockPosts);
      // Post from 60 days ago should be filtered out
      expect(sorted.some(p => p.id === 'post-top-all-time')).toBe(false);
      expect(sorted[0].id).toBe('post-hot-velocity');
    });

    it('should sort posts by Rising score velocity algorithm', () => {
      engine.setSortType('rising');
      const sorted = engine.filterAndSortPosts(mockPosts);
      expect(sorted.length).toBe(3);
      expect(sorted[0].id).toBe('post-hot-velocity');
    });

    it('should render toolbar with sort buttons and timeframe dropdown', () => {
      engine.setSortType('top');
      engine.isTopDropdownOpen = true;
      const html = engine.renderFeedControlsToolbar();

      expect(html).toContain('sort-btn-hot');
      expect(html).toContain('sort-btn-new');
      expect(html).toContain('sort-btn-top');
      expect(html).toContain('sort-btn-rising');
      expect(html).toContain('top-timeframe-dropdown');
      expect(html).toContain('Today');
      expect(html).toContain('This Week');
      expect(html).toContain('This Month');
      expect(html).toContain('This Year');
      expect(html).toContain('All Time');
    });
  });

  // ─── 3. AWARD MODAL & SOVEREIGN BADGES WITH MERIT POINTS ───────────────────
  describe('3. Sovereign Awards Engine & Merit Points Balance (50, 100, 250, 500, 1000)', () => {
    let awards: AwardsSystem;

    beforeEach(() => {
      awards = new AwardsSystem();
      awards.addMeritPoints(5000); // give balance for testing
    });

    it('should define the 5 primary sovereign award tiers with exact merit costs', () => {
      const silver = awards.getAwardByType('SILVER')!;
      expect(silver.label).toBe('Silver Merit');
      expect(silver.meritPoints).toBe(50);

      const gold = awards.getAwardByType('GOLD')!;
      expect(gold.label).toBe('Gold Guardian');
      expect(gold.meritPoints).toBe(100);

      const quantum = awards.getAwardByType('GUARDIAN_CHOICE')!;
      expect(quantum.label).toBe('Quantum Seal');
      expect(quantum.meritPoints).toBe(250);

      const zkProof = awards.getAwardByType('ZK_VERIFIED')!;
      expect(zkProof.label).toBe('ZK Proof');
      expect(zkProof.meritPoints).toBe(500);

      const diamond = awards.getAwardByType('PLATINUM')!;
      expect(diamond.label).toContain('Diamond Consensus');
      expect(diamond.meritPoints).toBe(1000);
    });

    it('should deduct user merit balance upon bestowing awards', () => {
      const initialBalance = awards.getUserMeritBalance();
      const postId = 'post-award-test-101';

      const success = awards.giveAward(postId, 'SILVER', 'tester_fp', 'GUARDIAN', 'Rigorously verified theorem.');
      expect(success).toBe(true);
      expect(awards.getUserMeritBalance()).toBe(initialBalance - 50);

      const summary = awards.getGroupedAwards(postId);
      expect(summary.length).toBe(1);
      expect(summary[0].award.type).toBe('SILVER');
    });

    it('should support bestowing awards on nested comments', () => {
      const commentId = 'comment-deep-202';
      const postId = 'post-parent-200';

      const success = awards.giveCommentAward(commentId, postId, 'ZK_VERIFIED', 'tester_fp', 'GUARDIAN', 'Valid ZK circuit proof attached.');
      expect(success).toBe(true);

      const commentAwards = awards.getCommentAwards(commentId);
      expect(commentAwards.length).toBe(1);
      expect(commentAwards[0].awardId).toBe('ZK_VERIFIED');

      const badgeHtml = awards.renderCommentAwardBadges(commentId);
      expect(badgeHtml).toContain('🔐');
      expect(badgeHtml).toContain('ZK Proof');
    });

    it('should render the rich award modal with merit cost pills and balance badge', () => {
      const modalHtml = awards.renderAwardModal('post-test-300', 'GUARDIAN');
      expect(modalHtml).toContain('id="aetheris-award-modal"');
      expect(modalHtml).toContain('Silver Merit');
      expect(modalHtml).toContain('50 Merit Points');
      expect(modalHtml).toContain('Diamond Consensus');
      expect(modalHtml).toContain('1,000 Merit Points');
    });
  });

  // ─── 4. SOVEREIGN CIRCLE (COMMUNITY) RULES & SIDEBAR ───────────────────────
  describe('4. Sovereign Circle (Community) Rules, Sidebar & Creation Modal', () => {
    let circleEngine: SovereignCircleEngine;

    beforeEach(() => {
      circleEngine = new SovereignCircleEngine();
    });

    it('should maintain community rules without fabricated member statistics', () => {
      const circles = circleEngine.getAllCircles();
      expect(circles.length).toBeGreaterThanOrEqual(4);

      const zkCircle = circleEngine.getCircle('pulse-global')!;
      expect(zkCircle.name).toBe('zeroknowledge');
      expect(zkCircle.displayName).toBe('Zero-Knowledge & Cryptographic Privacy');
      expect(zkCircle.rules.length).toBeGreaterThanOrEqual(3);
      expect(zkCircle.membersCount).toBe(0);
      expect(zkCircle.onlineCount).toBe(0);
    });

    it('should render sidebar community card with rules accordion and join toggle', () => {
      const sidebarHtml = circleEngine.renderSidebarCircleCard('pulse-global');

      expect(sidebarHtml).toContain('c/zeroknowledge');
      expect(sidebarHtml).toContain('Circle Governance Rules');
      expect(sidebarHtml).toContain('btn-toggle-join-circle');
      expect(sidebarHtml).toContain('btn-open-create-circle-modal');
      expect(sidebarHtml).toContain('Filter by Protocol Flair');
    });

    it('should toggle membership and expand rule accordions correctly', () => {
      const circleId = 'pulse-global';
      const initialJoined = circleEngine.getCircle(circleId)!.isJoined;

      const newJoined = circleEngine.toggleJoin(circleId);
      expect(newJoined).toBe(!initialJoined);

      // Rule accordion toggle
      circleEngine.toggleRuleExpansion(circleId, 0);
      expect(circleEngine.expandedRuleIndices.get(circleId)).toBe(0);

      circleEngine.toggleRuleExpansion(circleId, 0);
      expect(circleEngine.expandedRuleIndices.get(circleId)).toBeNull();
    });

    it('should create new sovereign circles and render creation modal', () => {
      const customCircle = circleEngine.createCircle({
        name: 'formal_verification',
        displayName: 'Formal Verification Collective',
        description: 'Mathematical proofs and Coq/Lean formal verification for sovereign smart contracts.',
        category: 'Protocol & Core Math',
        primaryColor: '#06b6d4',
        rules: [
          { title: 'Machine-checkable proofs only', description: 'All submissions must include reproducible proof files.' },
        ],
      });

      expect(customCircle.name).toBe('formal_verification');
      expect(customCircle.isCustom).toBe(true);

      circleEngine.isCreateModalOpen = true;
      const modalHtml = circleEngine.renderCreateCircleModal();
      expect(modalHtml).toContain('form-create-sovereign-circle');
      expect(modalHtml).toContain('Charter Sovereign Circle');
      expect(modalHtml).toContain('Governance Rules');
    });
  });

  // ─── 5. THREADED HIERARCHICAL COMMENTS ─────────────────────────────────────
  describe('5. Threaded Hierarchical Comments (OP Tag, YOU Tag, Collapse, Reply, Awards)', () => {
    let threads: ThreadManager;

    beforeEach(() => {
      threads = new ThreadManager();
      threads.loadDemoData();
    });

    it('should organize comments in a hierarchical tree structure with depth indicators', () => {
      const root = threads.getRootComments();
      expect(root.length).toBeGreaterThanOrEqual(1);
      expect(root[0].replies.length).toBeGreaterThan(0);
      expect(root[0].replies[0].depth).toBe(1);
      expect(root[0].replies[0].replies[0].depth).toBe(2);
    });

    it('should render OP badge for post author and YOU badge for current user', () => {
      const opFingerprint = 'c3dc28cb705e';
      const myFingerprint = 'my_own_fingerprint';

      const commentOP: ThreadComment = {
        id: 'c-op-test',
        authorFingerprint: opFingerprint,
        authorRole: 'ARCHIVIST',
        content: 'Author followup on cryptographic findings.',
        createdAt: Date.now() - 1000 * 60,
        meritScore: 42,
        userVote: 1,
        depth: 0,
        isCollapsed: false,
        replies: [],
      };

      const commentMe: ThreadComment = {
        id: 'c-me-test',
        authorFingerprint: myFingerprint,
        authorRole: 'MEMBER',
        content: 'My own reply to the author.',
        createdAt: Date.now() - 1000 * 30,
        meritScore: 5,
        userVote: 0,
        depth: 1,
        isCollapsed: false,
        replies: [],
      };

      const opHtml = threads.renderCommentNode(commentOP, opFingerprint, myFingerprint);
      expect(opHtml).toContain('OP');
      expect(opHtml).toContain('title="Original Poster"');

      const meHtml = threads.renderCommentNode(commentMe, opFingerprint, myFingerprint);
      expect(meHtml).toContain('YOU');
      expect(meHtml).toContain('title="You"');
    });

    it('should support comment voting and inline reply box toggling', () => {
      const commentId = 'c-root-1';
      const initialScore = threads.getComment(commentId)!.meritScore;

      // Upvote comment
      threads.voteComment(commentId, 1);
      expect(threads.getComment(commentId)!.meritScore).toBe(initialScore + 1);

      // Toggle inline reply
      threads.toggleReplying(commentId);
      expect(threads.replyingCommentId).toBe(commentId);

      // Add child reply
      const newReply = threads.addReply(commentId, 'my_fp', 'Replying with mathematical validation.', 'post-1');
      expect(newReply).toBeDefined();
      expect(newReply.depth).toBe(1);
    });

    it('should collapse and expand comment branches correctly', () => {
      const commentId = 'c-root-1';
      expect(threads.getComment(commentId)!.isCollapsed).toBe(false);

      threads.toggleCollapse(commentId);
      expect(threads.getComment(commentId)!.isCollapsed).toBe(true);

      const html = threads.renderCommentNode(threads.getComment(commentId)!);
      expect(html).toContain('[+]');
    });
  });

});
