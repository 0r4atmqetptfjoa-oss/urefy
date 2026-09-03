import { describe, it, expect } from 'vitest';
import { AwardsSystem, awardsSystem, awardPopoverManager } from '../src/awards.js';

describe('Sovereign Awards & Medals Engine', () => {
  it('should initialize with 7 sovereign medals and correct merit point tiers', () => {
    const system = new AwardsSystem();
    expect(system.AWARDS.length).toBe(7);

    const types = system.AWARDS.map((a) => a.type);
    expect(types).toContain('PLATINUM');
    expect(types).toContain('GOLD');
    expect(types).toContain('SILVER');
    expect(types).toContain('BRONZE');
    expect(types).toContain('ZK_VERIFIED');
    expect(types).toContain('GUARDIAN_CHOICE');
    expect(types).toContain('COMMUNITY_PICK');

    // Check merit points
    const silver = system.getAwardByType('SILVER');
    expect(silver?.meritPoints).toBe(50);
    expect(silver?.label).toBe('Silver Merit');

    const gold = system.getAwardByType('GOLD');
    expect(gold?.meritPoints).toBe(100);
    expect(gold?.label).toBe('Gold Guardian');

    const quantum = system.getAwardByType('GUARDIAN_CHOICE');
    expect(quantum?.meritPoints).toBe(250);
    expect(quantum?.label).toBe('Quantum Seal');

    const zk = system.getAwardByType('ZK_VERIFIED');
    expect(zk?.meritPoints).toBe(500);
    expect(zk?.label).toBe('ZK Proof');

    const diamond = system.getAwardByType('PLATINUM');
    expect(diamond?.meritPoints).toBe(1000);
    expect(diamond?.label).toBe('Diamond Consensus');
  });

  it('should enforce role-based award permissions strictly', () => {
    const system = new AwardsSystem();

    // GUARDIAN can give anything
    expect(system.canGiveAward('GUARDIAN', 'PLATINUM')).toBe(true);
    expect(system.canGiveAward('GUARDIAN', 'GOLD')).toBe(true);
    expect(system.canGiveAward('GUARDIAN', 'SILVER')).toBe(true);
    expect(system.canGiveAward('GUARDIAN', 'BRONZE')).toBe(true);
    expect(system.canGiveAward('GUARDIAN', 'ZK_VERIFIED')).toBe(true);
    expect(system.canGiveAward('GUARDIAN', 'GUARDIAN_CHOICE')).toBe(true);
    expect(system.canGiveAward('GUARDIAN', 'COMMUNITY_PICK')).toBe(true);

    // ARCHIVIST: GOLD, SILVER, ZK_VERIFIED
    expect(system.canGiveAward('ARCHIVIST', 'GOLD')).toBe(true);
    expect(system.canGiveAward('ARCHIVIST', 'SILVER')).toBe(true);
    expect(system.canGiveAward('ARCHIVIST', 'ZK_VERIFIED')).toBe(true);
    expect(system.canGiveAward('ARCHIVIST', 'PLATINUM')).toBe(false);
    expect(system.canGiveAward('ARCHIVIST', 'GUARDIAN_CHOICE')).toBe(false);
    expect(system.canGiveAward('ARCHIVIST', 'BRONZE')).toBe(false);

    // MODERATOR: SILVER, BRONZE, COMMUNITY_PICK
    expect(system.canGiveAward('MODERATOR', 'SILVER')).toBe(true);
    expect(system.canGiveAward('MODERATOR', 'BRONZE')).toBe(true);
    expect(system.canGiveAward('MODERATOR', 'COMMUNITY_PICK')).toBe(true);
    expect(system.canGiveAward('MODERATOR', 'GOLD')).toBe(false);
    expect(system.canGiveAward('MODERATOR', 'PLATINUM')).toBe(false);

    // MEMBER: BRONZE, COMMUNITY_PICK
    expect(system.canGiveAward('MEMBER', 'BRONZE')).toBe(true);
    expect(system.canGiveAward('MEMBER', 'COMMUNITY_PICK')).toBe(true);
    expect(system.canGiveAward('MEMBER', 'SILVER')).toBe(false);
    expect(system.canGiveAward('MEMBER', 'GOLD')).toBe(false);
    expect(system.canGiveAward('MEMBER', 'PLATINUM')).toBe(false);
    expect(system.canGiveAward('MEMBER', 'ZK_VERIFIED')).toBe(false);
  });

  it('should grant awards, deduct merit points, group badges, and render HTML correctly', () => {
    const system = new AwardsSystem();
    const initialBalance = system.getUserMeritBalance();
    expect(initialBalance).toBeGreaterThan(1000);

    const postId = 'test-post-audit';

    // Member grants COMMUNITY_PICK (10 pts)
    const granted1 = system.giveAward(
      postId,
      'COMMUNITY_PICK',
      'fp_member_123',
      'MEMBER',
      'Brilliant zero knowledge proof!'
    );
    expect(granted1).toBe(true);
    expect(system.getUserMeritBalance()).toBe(initialBalance - 10);

    // Member tries to grant PLATINUM (disallowed)
    const grantedDisallowed = system.giveAward(
      postId,
      'PLATINUM',
      'fp_member_123',
      'MEMBER'
    );
    expect(grantedDisallowed).toBe(false);

    // Guardian grants PLATINUM (1000 pts)
    const beforePlatinum = system.getUserMeritBalance();
    const granted2 = system.giveAward(
      postId,
      'PLATINUM',
      'fp_guardian_999',
      'GUARDIAN',
      'Canonical consensus milestone.'
    );
    expect(granted2).toBe(true);
    expect(system.getUserMeritBalance()).toBe(beforePlatinum - 1000);

    const postAwards = system.getAwards(postId);
    expect(postAwards.length).toBe(2);

    const grouped = system.getGroupedAwards(postId);
    expect(grouped.length).toBe(2);

    const badgesHtml = system.renderAwardBadges(postId);
    expect(badgesHtml).toContain('💎');
    expect(badgesHtml).toContain('✨');
    expect(badgesHtml).toContain('award-badges-container');

    const buttonHtml = system.renderGiveAwardButton(postId, 'GUARDIAN');
    expect(buttonHtml).toContain('btn-open-award-modal');
    expect(buttonHtml).toContain('data-post-id="test-post-audit"');

    const modalHtml = system.renderAwardModal(postId, 'MEMBER');
    expect(modalHtml).toContain('aetheris-award-modal');
    expect(modalHtml).toContain('🔒 LOCKED');
    expect(modalHtml).toContain('Unlocked for MEMBER');
    expect(modalHtml).toContain('Merit Points');
  });

  it('should support granting awards to comments', () => {
    const system = new AwardsSystem();
    const commentId = 'c-comment-101';
    const postId = 'test-post-audit';

    const granted = system.giveCommentAward(commentId, postId, 'SILVER', 'fp_guardian_999', 'GUARDIAN', 'Superb review');
    expect(granted).toBe(true);

    const awards = system.getCommentAwards(commentId);
    expect(awards.length).toBe(1);
    expect(awards[0].awardId).toBe('SILVER');

    const commentBadges = system.renderCommentAwardBadges(commentId);
    expect(commentBadges).toContain('🥈');

    const giveCommentBtn = system.renderGiveCommentAwardButton(commentId, postId, 'GUARDIAN');
    expect(giveCommentBtn).toContain('btn-open-comment-award-modal');
    expect(giveCommentBtn).toContain(`data-comment-id="${commentId}"`);
  });

  it('should render clean award badge chips and delegate to singleton AwardPopoverManager without overlapping popups', () => {
    const system = new AwardsSystem();
    const postId = 'test-post-popover';

    system.giveAward(postId, 'PLATINUM', 'fp_alice', 'GUARDIAN');
    system.giveAward(postId, 'GOLD', 'fp_bob', 'GUARDIAN');

    const html = system.renderAwardBadges(postId);

    // Verify chips render cleanly
    expect(html).toContain('award-badge-chip');
    expect(html).toContain('data-award-label="Diamond Consensus"');
    expect(html).toContain('data-award-label="Gold Guardian"');

    // Verify no nested colliding popups
    expect(html).not.toContain('group-hover:opacity-100');
    expect(html).not.toContain('group-hover:pointer-events-auto');
    expect(html).not.toContain('<!-- HOVER TOOLTIP POPUP -->');

    // Popover manager handles safe SSR / Node environment
    expect(awardPopoverManager).toBeDefined();
    awardPopoverManager.init();
    awardPopoverManager.hide();
  });
});
