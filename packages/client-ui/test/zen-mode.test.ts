import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZenModeManager, zenModeManager } from '../src/zen-mode.js';

describe('UREfy — Zen / Focus Mode System', () => {
  let manager: ZenModeManager;

  beforeEach(() => {
    manager = new ZenModeManager();
    // Ensure clean state before each test
    manager.setZen(false);
    manager.resetStats();
  });

  describe('1. Initial State', () => {
    it('should initialize with isZenActive as false', () => {
      expect(manager.isZenActive).toBe(false);
      expect(manager.getIsActive()).toBe(false);
    });

    it('should initialize session metrics correctly', () => {
      const stats = manager.getFocusSessionStats();
      expect(stats.isZenActive).toBe(false);
      expect(stats.sessionDurationSec).toBe(0);
      expect(stats.sessionCount).toBe(0);
      expect(stats.lastActivatedAt).toBeNull();
    });

    it('should verify singleton export is an instance of ZenModeManager', () => {
      expect(zenModeManager).toBeDefined();
      expect(zenModeManager).toBeInstanceOf(ZenModeManager);
    });
  });

  describe('2. Toggle Functionality (toggleZen)', () => {
    it('should toggle state from false to true, then back to false', () => {
      expect(manager.isZenActive).toBe(false);

      // First toggle: false -> true
      manager.toggleZen();
      expect(manager.isZenActive).toBe(true);
      expect(manager.getIsActive()).toBe(true);

      // Second toggle: true -> false
      manager.toggleZen();
      expect(manager.isZenActive).toBe(false);
      expect(manager.getIsActive()).toBe(false);
    });

    it('should increment sessionCount each time Zen mode is activated via toggleZen', () => {
      expect(manager.getFocusSessionStats().sessionCount).toBe(0);

      manager.toggleZen(); // Active (1st session)
      expect(manager.getFocusSessionStats().sessionCount).toBe(1);

      manager.toggleZen(); // Inactive
      expect(manager.getFocusSessionStats().sessionCount).toBe(1);

      manager.toggleZen(); // Active (2nd session)
      expect(manager.getFocusSessionStats().sessionCount).toBe(2);
    });
  });

  describe('3. Explicit State Setter (setZen)', () => {
    it('should activate Zen Mode when setZen(true) is invoked', () => {
      manager.setZen(true);
      expect(manager.isZenActive).toBe(true);
      expect(manager.getIsActive()).toBe(true);

      const stats = manager.getFocusSessionStats();
      expect(stats.isZenActive).toBe(true);
      expect(stats.sessionCount).toBe(1);
      expect(stats.lastActivatedAt).toBeTypeOf('number');
    });

    it('should deactivate Zen Mode when setZen(false) is invoked', () => {
      manager.setZen(true);
      expect(manager.isZenActive).toBe(true);

      manager.setZen(false);
      expect(manager.isZenActive).toBe(false);
      expect(manager.getIsActive()).toBe(false);

      const stats = manager.getFocusSessionStats();
      expect(stats.isZenActive).toBe(false);
      expect(stats.lastActivatedAt).toBeNull();
    });

    it('should be idempotent when setting the same state consecutively', () => {
      manager.setZen(true);
      expect(manager.isZenActive).toBe(true);
      expect(manager.getFocusSessionStats().sessionCount).toBe(1);

      // Consecutive true call should not increment sessionCount
      manager.setZen(true);
      expect(manager.isZenActive).toBe(true);
      expect(manager.getFocusSessionStats().sessionCount).toBe(1);

      manager.setZen(false);
      expect(manager.isZenActive).toBe(false);

      // Consecutive false call should remain false
      manager.setZen(false);
      expect(manager.isZenActive).toBe(false);
    });
  });

  describe('4. Header Zen Button Rendering (renderZenButton)', () => {
    it('should render inactive button markup with aria-pressed="false" and slate styling when inactive', () => {
      manager.setZen(false);
      const html = manager.renderZenButton();

      expect(html).toContain('id="btn-toggle-zen-mode"');
      expect(html).toContain('aria-pressed="false"');
      expect(html).toContain('aria-label="Toggle Zen Focus Mode"');
      expect(html).toContain('bg-surface-raised');
      expect(html).toContain('text-slate-400');
      expect(html).toContain('🧘');
      expect(html).toContain('Zen');
      expect(html).toContain('kbd-badge');
      expect(html).toContain('Z');
    });

    it('should render active button markup with aria-pressed="true" and cyphr glow styling when active', () => {
      manager.setZen(true);
      const html = manager.renderZenButton();

      expect(html).toContain('id="btn-toggle-zen-mode"');
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain('aria-label="Toggle Zen Focus Mode"');
      expect(html).toContain('bg-cyphr/20');
      expect(html).toContain('text-cyphr');
      expect(html).toContain('border-cyphr/40');
      expect(html).toContain('shadow-cyphr-sm');
      expect(html).toContain('🧘');
      expect(html).toContain('Zen');
    });
  });

  describe('5. Floating Exit Indicator Rendering (renderZenFloatingExit)', () => {
    it('should render hidden indicator with opacity-0 and pointer-events-none when inactive', () => {
      manager.setZen(false);
      const html = manager.renderZenFloatingExit();

      expect(html).toContain('id="zen-floating-exit-indicator"');
      expect(html).toContain('hidden');
      expect(html).toContain('pointer-events-none');
      expect(html).toContain('opacity-0');
      expect(html).not.toContain('zen-floating-pill');
      expect(html).toContain('id="btn-zen-exit-pill"');
      expect(html).toContain('Zen Mode Active');
    });

    it('should render visible floating indicator with opacity-100 and zen-floating-pill animation when active', () => {
      manager.setZen(true);
      const html = manager.renderZenFloatingExit();

      expect(html).toContain('id="zen-floating-exit-indicator"');
      expect(html).toContain('opacity-100');
      expect(html).toContain('pointer-events-auto');
      expect(html).toContain('zen-floating-pill');
      expect(html).not.toContain('hidden pointer-events-none opacity-0');
      expect(html).toContain('id="btn-zen-exit-pill"');
      expect(html).toContain('Zen Mode Active');
      expect(html).toContain('text-cyphr');
      expect(html).toContain('bg-surface-overlay/90');
      expect(html).toContain('Press <kbd class="kbd-badge text-[10px] text-cyphr">Z</kbd> or <kbd class="kbd-badge text-[10px] text-slate-300">Esc</kbd> to exit');
    });
  });

  describe('6. State Subscriptions & Listeners', () => {
    it('should notify subscribers when Zen Mode state transitions occur', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      manager.setZen(true);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(true);

      manager.setZen(false);
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledWith(false);

      unsubscribe();

      manager.setZen(true);
      expect(listener).toHaveBeenCalledTimes(2); // Should not be called after unsubscribe
    });
  });

  describe('7. Focus Metrics & Stats Badge Rendering', () => {
    it('should render stats badge with formatted focus duration and signal indicator', () => {
      const badgeHtml = manager.renderZenStatsBadge();

      expect(badgeHtml).toContain('Focus Time:');
      expect(badgeHtml).toContain('text-signal');
      expect(badgeHtml).toContain('text-cyphr');
      expect(badgeHtml).toContain('bg-surface-raised/80');
      expect(badgeHtml).toContain('0m 00s');
    });

    it('should reset stats counters on resetStats()', () => {
      manager.setZen(true);
      expect(manager.getFocusSessionStats().sessionCount).toBe(1);

      manager.resetStats();
      expect(manager.getFocusSessionStats().sessionCount).toBe(0);
    });
  });
});
