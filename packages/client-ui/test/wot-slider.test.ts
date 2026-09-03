import { describe, it, expect, beforeEach } from 'vitest';
import { wotSlider, WoTSliderManager, TRUST_TIERS } from '../src/wot-slider.js';

describe('Web-of-Trust (WoT) Slider & Flow-Based Filtering System', () => {
  let manager: WoTSliderManager;

  beforeEach(() => {
    manager = new WoTSliderManager();
    manager.resetToDefault();
  });

  // ---------------------------------------------------------------------------
  // 1. Pragul inițial (0% - toate postările)
  // ---------------------------------------------------------------------------
  describe('1. Initial Threshold State', () => {
    it('should initialize with default threshold of 0% (ALL posts)', () => {
      expect(manager.minTrustThreshold).toBe(0);

      const currentTier = manager.getCurrentTier();
      expect(currentTier.id).toBe('ALL');
      expect(currentTier.threshold).toBe(0);
      expect(currentTier.shortLabel).toBe('All');
      expect(currentTier.icon).toBe('🌐');

      const stats = manager.getFilterStats();
      expect(stats.currentThreshold).toBe(0);
      expect(stats.activeTierId).toBe('ALL');
    });

    it('should confirm singleton wotSlider instance resets and behaves consistently', () => {
      wotSlider.resetToDefault();
      expect(wotSlider.minTrustThreshold).toBe(0);
      expect(wotSlider.getCurrentTier().id).toBe('ALL');
    });

    it('should export correct TRUST_TIERS constants', () => {
      expect(TRUST_TIERS.length).toBe(4);
      expect(TRUST_TIERS[0].id).toBe('ALL');
      expect(TRUST_TIERS[0].threshold).toBe(0);
      expect(TRUST_TIERS[1].id).toBe('ACTIVE_NODES');
      expect(TRUST_TIERS[1].threshold).toBe(40);
      expect(TRUST_TIERS[2].id).toBe('ZK_VERIFIED');
      expect(TRUST_TIERS[2].threshold).toBe(70);
      expect(TRUST_TIERS[3].id).toBe('ELITE_GUARDIANS');
      expect(TRUST_TIERS[3].threshold).toBe(90);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Setarea pragului la 40, 70, 90 și clamparea la intervalul [0, 100]
  // ---------------------------------------------------------------------------
  describe('2. Threshold Setting and Clamping [0, 100]', () => {
    it('should set threshold to 40, 70, and 90 correctly', () => {
      manager.setThreshold(40);
      expect(manager.minTrustThreshold).toBe(40);
      expect(manager.getCurrentTier().id).toBe('ACTIVE_NODES');

      manager.setThreshold(70);
      expect(manager.minTrustThreshold).toBe(70);
      expect(manager.getCurrentTier().id).toBe('ZK_VERIFIED');

      manager.setThreshold(90);
      expect(manager.minTrustThreshold).toBe(90);
      expect(manager.getCurrentTier().id).toBe('ELITE_GUARDIANS');
    });

    it('should clamp values below 0 to 0', () => {
      manager.setThreshold(-10);
      expect(manager.minTrustThreshold).toBe(0);
      expect(manager.getCurrentTier().id).toBe('ALL');

      manager.setThreshold(-999);
      expect(manager.minTrustThreshold).toBe(0);
    });

    it('should clamp values above 100 to 100', () => {
      manager.setThreshold(150);
      expect(manager.minTrustThreshold).toBe(100);
      expect(manager.getCurrentTier().id).toBe('ELITE_GUARDIANS');

      manager.setThreshold(999);
      expect(manager.minTrustThreshold).toBe(100);
    });

    it('should round floating-point thresholds to the nearest integer', () => {
      manager.setThreshold(42.4);
      expect(manager.minTrustThreshold).toBe(42);

      manager.setThreshold(69.8);
      expect(manager.minTrustThreshold).toBe(70);
    });

    it('should trigger registered listeners when threshold changes', () => {
      let notifiedThreshold = -1;
      let notifiedTierId = '';

      const unsubscribe = manager.onThresholdChange((threshold, tier) => {
        notifiedThreshold = threshold;
        notifiedTierId = tier.id;
      });

      manager.setThreshold(70);
      expect(notifiedThreshold).toBe(70);
      expect(notifiedTierId).toBe('ZK_VERIFIED');

      // Unsubscribe test
      unsubscribe();
      manager.setThreshold(40);
      expect(notifiedThreshold).toBe(70); // unchanged because unsubscribed
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Metoda filterPosts() cu profile mock (scoruri 10, 50, 75, 95)
  // ---------------------------------------------------------------------------
  describe('3. filterPosts() with Mock Posts and Trust Profiles', () => {
    const mockPosts = [
      { id: 'post-untrusted-10', authorFingerprint: '0x1010...aaaa', title: 'Untrusted Post' },
      { id: 'post-active-50', authorFingerprint: '0x5050...bbbb', title: 'Active Node Post' },
      { id: 'post-zk-75', authorFingerprint: '0x7575...cccc', title: 'ZK-Verified Post' },
      { id: 'post-elite-95', authorFingerprint: '0x9595...dddd', title: 'Elite Guardian Post' },
    ];

    const mockProfiles = new Map<string, { trustScore: number }>([
      ['0x1010...aaaa', { trustScore: 10 }],
      ['0x5050...bbbb', { trustScore: 50 }],
      ['0x7575...cccc', { trustScore: 75 }],
      ['0x9595...dddd', { trustScore: 95 }],
    ]);

    it('should return all posts when threshold is 0', () => {
      manager.setThreshold(0);
      const filtered = manager.filterPosts(mockPosts, mockProfiles);

      expect(filtered.length).toBe(4);
      expect(filtered.map((p) => p.id)).toEqual([
        'post-untrusted-10',
        'post-active-50',
        'post-zk-75',
        'post-elite-95',
      ]);

      const stats = manager.getFilterStats();
      expect(stats.totalPosts).toBe(4);
      expect(stats.visiblePosts).toBe(4);
      expect(stats.filteredCount).toBe(0);
      expect(stats.currentThreshold).toBe(0);
    });

    it('should filter posts properly at threshold 40 (>= 40 trust score)', () => {
      manager.setThreshold(40);
      const filtered = manager.filterPosts(mockPosts, mockProfiles);

      expect(filtered.length).toBe(3);
      expect(filtered.map((p) => p.id)).toEqual([
        'post-active-50',
        'post-zk-75',
        'post-elite-95',
      ]);

      const stats = manager.getFilterStats();
      expect(stats.totalPosts).toBe(4);
      expect(stats.visiblePosts).toBe(3);
      expect(stats.filteredCount).toBe(1);
    });

    it('should filter posts properly at threshold 70 (>= 70 trust score)', () => {
      manager.setThreshold(70);
      const filtered = manager.filterPosts(mockPosts, mockProfiles);

      expect(filtered.length).toBe(2);
      expect(filtered.map((p) => p.id)).toEqual([
        'post-zk-75',
        'post-elite-95',
      ]);

      const stats = manager.getFilterStats();
      expect(stats.totalPosts).toBe(4);
      expect(stats.visiblePosts).toBe(2);
      expect(stats.filteredCount).toBe(2);
      expect(stats.currentThreshold).toBe(70);
      expect(stats.activeTierId).toBe('ZK_VERIFIED');
    });

    it('should filter posts properly at threshold 90 (>= 90 trust score)', () => {
      manager.setThreshold(90);
      const filtered = manager.filterPosts(mockPosts, mockProfiles);

      expect(filtered.length).toBe(1);
      expect(filtered.map((p) => p.id)).toEqual([
        'post-elite-95',
      ]);

      const stats = manager.getFilterStats();
      expect(stats.totalPosts).toBe(4);
      expect(stats.visiblePosts).toBe(1);
      expect(stats.filteredCount).toBe(3);
      expect(stats.activeTierId).toBe('ELITE_GUARDIANS');
    });

    it('should handle empty post list gracefully', () => {
      manager.setThreshold(70);
      const filtered = manager.filterPosts([], mockProfiles);

      expect(filtered.length).toBe(0);
      const stats = manager.getFilterStats();
      expect(stats.totalPosts).toBe(0);
      expect(stats.visiblePosts).toBe(0);
      expect(stats.filteredCount).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Identificarea corectă a tier-ului activ (ALL, ACTIVE_NODES, ZK_VERIFIED, ELITE_GUARDIANS)
  // ---------------------------------------------------------------------------
  describe('4. Active Trust Tier Mapping', () => {
    it('should map threshold [0..39] to ALL tier', () => {
      expect(manager.getTierForThreshold(0).id).toBe('ALL');
      expect(manager.getTierForThreshold(15).id).toBe('ALL');
      expect(manager.getTierForThreshold(39).id).toBe('ALL');

      manager.setThreshold(25);
      expect(manager.getCurrentTier().id).toBe('ALL');
      expect(manager.getCurrentTier().icon).toBe('🌐');
    });

    it('should map threshold [40..69] to ACTIVE_NODES tier', () => {
      expect(manager.getTierForThreshold(40).id).toBe('ACTIVE_NODES');
      expect(manager.getTierForThreshold(55).id).toBe('ACTIVE_NODES');
      expect(manager.getTierForThreshold(69).id).toBe('ACTIVE_NODES');

      manager.setThreshold(50);
      expect(manager.getCurrentTier().id).toBe('ACTIVE_NODES');
      expect(manager.getCurrentTier().icon).toBe('⚡');
    });

    it('should map threshold [70..89] to ZK_VERIFIED tier', () => {
      expect(manager.getTierForThreshold(70).id).toBe('ZK_VERIFIED');
      expect(manager.getTierForThreshold(80).id).toBe('ZK_VERIFIED');
      expect(manager.getTierForThreshold(89).id).toBe('ZK_VERIFIED');

      manager.setThreshold(75);
      expect(manager.getCurrentTier().id).toBe('ZK_VERIFIED');
      expect(manager.getCurrentTier().icon).toBe('🛡️');
    });

    it('should map threshold [90..100] to ELITE_GUARDIANS tier', () => {
      expect(manager.getTierForThreshold(90).id).toBe('ELITE_GUARDIANS');
      expect(manager.getTierForThreshold(95).id).toBe('ELITE_GUARDIANS');
      expect(manager.getTierForThreshold(100).id).toBe('ELITE_GUARDIANS');

      manager.setThreshold(90);
      expect(manager.getCurrentTier().id).toBe('ELITE_GUARDIANS');
      expect(manager.getCurrentTier().icon).toBe('👑');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Generarea HTML renderSliderWidget()
  // ---------------------------------------------------------------------------
  describe('5. HTML Rendering: renderSliderWidget() and UI Components', () => {
    it('should render slider widget container and required DOM IDs', () => {
      const html = manager.renderSliderWidget();

      expect(html).toContain('id="wot-slider-container"');
      expect(html).toContain('id="wot-ascii-rail"');
      expect(html).toContain('id="wot-indicator-badge"');
      expect(html).toContain('id="wot-indicator-value"');
      expect(html).toContain('id="wot-slider-fill"');
      expect(html).toContain('id="wot-slider-range"');
      expect(html).toContain('id="btn-wot-tooltip-toggle"');
      expect(html).toContain('id="btn-wot-open-inspector"');
      expect(html).toContain('id="wot-math-tooltip"');
    });

    it('should render all 4 preset buttons with data attributes', () => {
      const html = manager.renderSliderWidget();

      expect(html).toContain('data-wot-preset="0"');
      expect(html).toContain('data-wot-preset="40"');
      expect(html).toContain('data-wot-preset="70"');
      expect(html).toContain('data-wot-preset="90"');
    });

    it('should reflect current threshold and tier in generated HTML at 70%', () => {
      manager.setThreshold(70);
      const html = manager.renderSliderWidget();

      expect(html).toContain('≥ 70% Trust');
      expect(html).toContain('style="width: 70%;"');
      expect(html).toContain('🛡️');
      expect(html).toContain('text-signal');
    });

    it('should render compact header widget and author trust badges correctly', () => {
      manager.setThreshold(40);
      const compactHtml = manager.renderCompactHeaderWidget();
      expect(compactHtml).toContain('id="wot-compact-widget"');
      expect(compactHtml).toContain('≥ 40%');
      expect(compactHtml).toContain('⚡');

      // Author trust badge
      const badgeHtml = manager.renderAuthorTrustBadge('0x9a8f...3e21', 96);
      expect(badgeHtml).toContain('96%');
      expect(badgeHtml).toContain('👑');
    });

    it('should produce valid ASCII rail representations', () => {
      const ascii0 = manager.getSliderAsciiRepresentation(0);
      expect(ascii0).toContain('All (0%)');
      expect(ascii0).toContain('●');

      const ascii70 = manager.getSliderAsciiRepresentation(70);
      expect(ascii70).toContain('Elite (70%)');
      expect(ascii70).toContain('●');
    });

    it('should export and import state accurately', () => {
      manager.setThreshold(70);
      const serialized = manager.exportState();
      expect(serialized).toContain('"threshold":70');

      const newManager = new WoTSliderManager();
      const success = newManager.importState(serialized);
      expect(success).toBe(true);
      expect(newManager.minTrustThreshold).toBe(70);
      expect(newManager.getCurrentTier().id).toBe('ZK_VERIFIED');
    });
  });
});
