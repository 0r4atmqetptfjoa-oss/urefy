/**
 * @file test/final-launch-verification.test.ts
 * @description Comprehensive test suite verifying all final launch features:
 * - Thread reply post scoping
 * - Repost attribution pipeline
 * - DSA Report modal validation & structure
 * - Messages 2.0 Branches & Chat Outcome Objects
 * - Communities 2.0 3-Pillar Workspace
 * - Cloudflare Free-Tier cost control invariants
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { threadManager } from '../src/threads.js';
import { pulseActionsEngine } from '../src/pulse-actions.js';
import { reportModalManager } from '../src/report-modal.js';
import { communityView } from '../src/community-view.js';
import {
  getBranchesForPeer,
  createBranchForPeer,
  renderOutcomeCard,
} from '../src/messages-view.js';
import {
  CLOUDFLARE_FREE_ONLY_MODE,
  CLOUDFLARE_R2_STORAGE_LIMIT_BYTES,
  CLOUDFLARE_R2_SAFE_CAP_BYTES,
  CLOUDFLARE_PROXY_LIMIT_BYTES,
  USER_STORAGE_TIERS,
} from '../functions/api/storage.js';

describe('Final Launch Pass Verification Suite', () => {
  describe('1. P0.1 Reply Post Scoping & Lifecycle', () => {
    it('should scope root comments specifically by postId', () => {
      threadManager.addReply('root', 'author_alice_01', 'Comment for post A', 'post_aaa_111');
      threadManager.addReply('root', 'author_bob_02', 'Comment for post B', 'post_bbb_222');

      const commentsA = threadManager.getRootCommentsForPost('post_aaa_111');
      const commentsB = threadManager.getRootCommentsForPost('post_bbb_222');

      expect(commentsA.some(c => c.content === 'Comment for post A')).toBe(true);
      expect(commentsA.some(c => c.content === 'Comment for post B')).toBe(false);

      expect(commentsB.some(c => c.content === 'Comment for post B')).toBe(true);
      expect(commentsB.some(c => c.content === 'Comment for post A')).toBe(false);
    });
  });

  describe('2. P0.2 Real Repost Pipeline & Attribution', () => {
    it('should record repost attributions accurately per post', () => {
      const postId = 'post_viral_999';
      const userA = 'user_reposter_01';
      const userB = 'user_reposter_02';

      expect(pulseActionsEngine.isPostRepostedBy(postId, userA)).toBe(false);

      pulseActionsEngine.recordRepost(postId, userA);
      expect(pulseActionsEngine.isPostRepostedBy(postId, userA)).toBe(true);

      pulseActionsEngine.recordRepost(postId, userB);
      const reposters = pulseActionsEngine.getRepostersForPost(postId);
      expect(reposters).toContain(userA);
      expect(reposters).toContain(userB);
    });
  });

  describe('3. P0.6 DSA Notice & Takedown Report Modal', () => {
    beforeEach(() => {
      reportModalManager.close();
    });

    it('should prefill target post details upon open', () => {
      reportModalManager.open({
        targetType: 'post',
        targetId: 'post_infringing_123',
        authorFingerprint: 'author_bad_actor',
        titleOrSnippet: 'Unauthorized leaked asset download link',
        externalLinks: ['https://storage.malicious-domain.com/leaked.bin'],
      });

      expect(reportModalManager.targetType).toBe('post');
      expect(reportModalManager.targetId).toBe('post_infringing_123');
      expect(reportModalManager.externalLinks).toContain('https://storage.malicious-domain.com/leaked.bin');
    });

    it('should render copyright/piracy fields when copyright category is chosen', () => {
      reportModalManager.open({
        targetType: 'post',
        targetId: 'post_copy_456',
        category: 'copyright_piracy',
      });

      const modalHtml = reportModalManager.render();
      expect(modalHtml).toContain('Infringement Type');
      expect(modalHtml).toContain('Good Faith Declaration');
      expect(modalHtml).toContain('EU Regulation 2022/2065');
    });
  });

  describe('4. P3 Messages 2.0 Branches & Outcomes', () => {
    it('requires a delivered source message before a conversation branch can be created', async () => {
      const peer = 'peer_crypto_99';
      expect(getBranchesForPeer(peer)).toContain('main');

      // A branch without provenance would be a fabricated context trail, so it is rejected.
      await expect(createBranchForPeer(peer, 'architecture-plan')).rejects.toThrow(/Send a message/);
      expect(getBranchesForPeer(peer)).toEqual(['main']);
    });

    it('labels author context without claiming verified or resolved outcomes', () => {
      const decisionHtml = renderOutcomeCard('[DECISION] Consensus: Standard R2 Storage with 0 egress fees');
      expect(decisionHtml).toContain('Decision Outcome');
      expect(decisionHtml).toContain('Decision recorded by the message author.');
      expect(decisionHtml).not.toContain('RESOLVED');

      const taskHtml = renderOutcomeCard('[TASK] Verify build bundle size under 552 KiB');
      expect(taskHtml).toContain('Actionable Task');

      const questionHtml = renderOutcomeCard('[QUESTION] Should we enable atomic reservations at 70% threshold?');
      expect(questionHtml).toContain('Structured Question');

      const pollHtml = renderOutcomeCard('[POLL] Upgrade safe cap from 8GB to 9GB?');
      expect(pollHtml).toContain('Chat Poll');
      expect(pollHtml).toContain('Reply to this proposal');
      expect(pollHtml).not.toContain('VOTING ACTIVE');
    });
  });

  describe('5. P4 Communities 2.0 3-Pillar Workspace', () => {
    it('should support switching between Discuss, Live, and Knowledge pillars', () => {
      expect(communityView.activePillar).toBe('discuss');

      communityView.setActivePillar('live');
      expect(communityView.activePillar).toBe('live');

      communityView.setActivePillar('knowledge');
      expect(communityView.activePillar).toBe('knowledge');

      communityView.setActivePillar('discuss');
      expect(communityView.activePillar).toBe('discuss');
    });
  });

  describe('6. P6 Cloudflare Free-Tier Real Cost Control Invariants', () => {
    it('should guarantee free-only mode is permanently enabled', () => {
      expect(CLOUDFLARE_FREE_ONLY_MODE).toBe(true);
    });

    it('should enforce an 8.0 GB safe cap with 2.0 GB safety margin below Cloudflare 10 GB limit', () => {
      expect(CLOUDFLARE_R2_STORAGE_LIMIT_BYTES).toBe(10 * 1024 * 1024 * 1024);
      expect(CLOUDFLARE_R2_SAFE_CAP_BYTES).toBe(8 * 1024 * 1024 * 1024);
      expect(CLOUDFLARE_R2_STORAGE_LIMIT_BYTES - CLOUDFLARE_R2_SAFE_CAP_BYTES).toBe(2 * 1024 * 1024 * 1024);
    });

    it('should enforce 95 MiB upper proxy ceiling below Cloudflare 100 MB free proxy limit', () => {
      expect(CLOUDFLARE_PROXY_LIMIT_BYTES).toBe(95 * 1024 * 1024);
      expect(CLOUDFLARE_PROXY_LIMIT_BYTES).toBeLessThan(100 * 1024 * 1024);
    });

    it('should define strict consumer user tiers within 100MB to 1GB', () => {
      expect(USER_STORAGE_TIERS.anonymous.maxTotalBytes).toBe(100 * 1024 * 1024);
      expect(USER_STORAGE_TIERS.standard.maxTotalBytes).toBe(250 * 1024 * 1024);
      expect(USER_STORAGE_TIERS.creator.maxTotalBytes).toBe(500 * 1024 * 1024);
      expect(USER_STORAGE_TIERS.sovereign.maxTotalBytes).toBe(1024 * 1024 * 1024);
    });
  });
});
