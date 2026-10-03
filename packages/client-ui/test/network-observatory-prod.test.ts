import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './helpers/disable-demo.js';
import { NetworkObservatory } from '../src/network-observatory.js';
import { setSimulationMode } from '../src/simulation-mode.js';
import * as adminAuth from '../src/admin-auth.js';

describe('Network Observatory Production Clean Initialization (Finding 4)', () => {
  let observatory: NetworkObservatory;

  beforeEach(() => {
    vi.spyOn(adminAuth, 'isProductionBuild').mockReturnValue(false);
    setSimulationMode(false);
    observatory = new NetworkObservatory();
  });

  afterEach(() => {
    observatory.stopLiveUpdates();
    observatory.close();
    vi.restoreAllMocks();
  });

  describe('1. Production Clean Initialization Invariants', () => {
    it('initializes with strictly 0 synthetic nodes, 0 slashing records, and 0 latency points', () => {
      // 0 synthetic nodes
      expect(observatory.nodes).toEqual([]);
      expect(observatory.nodes.length).toBe(0);

      // 0 slashing records & stats
      expect(observatory.slashingHistory).toEqual([]);
      expect(observatory.slashingHistory.length).toBe(0);
      expect(observatory.slashing7DayStats).toEqual([]);
      expect(observatory.slashing7DayStats.length).toBe(0);

      // 0 latency points
      expect(observatory.latencyHistory).toEqual([]);
      expect(observatory.latencyHistory.length).toBe(0);

      // 0 fake contributors
      expect(observatory.topContributorsList).toEqual([]);
      expect(observatory.topContributorsList.length).toBe(0);

      // Baseline metrics in production
      expect(observatory.metrics.totalNodes).toBe(0);
      expect(observatory.metrics.activeNodes).toBe(0);
      expect(observatory.metrics.messagesPerMinute).toBeNull();
      expect(observatory.metrics.totalSlashings).toBeNull();
      expect(observatory.metrics.networkUptime).toBeNull();
      expect(observatory.metrics.topContributors).toEqual([]);
    });

    it('returns null for avgLatency when empty (NEVER 21.4)', () => {
      expect(observatory.calculateAvgLatency()).toBeNull();
      expect(observatory.calculateAvgLatency()).not.toBe(21.4);
      expect(observatory.metrics.avgLatencyMs).toBeNull();
      expect(observatory.metrics.avgLatencyMs).not.toBe(21.4);
    });

    it('does not run initLatencyHistory in production and does not use Math.random()', () => {
      const mathRandomSpy = vi.spyOn(Math, 'random');

      observatory.initLatencyHistory();

      expect(observatory.latencyHistory.length).toBe(0);
      expect(mathRandomSpy).not.toHaveBeenCalled();
    });

    it('does not run initSlashing7DayStats in production', () => {
      observatory.initSlashing7DayStats();

      expect(observatory.slashing7DayStats.length).toBe(0);
    });
  });

  describe('2. Clean Empty State UI Rendering', () => {
    it('renders "No measured telemetry available" in modal and topology when empty', () => {
      const modalHtml = observatory.renderObservatoryModal();

      // Must render clean empty UI message
      expect(modalHtml).toContain('No measured telemetry available');
      expect(modalHtml).toContain(
        'No measured telemetry available. Nodes will appear as they join the sovereign mesh.'
      );

      // Must not leak fake numbers or fake SLA
      expect(modalHtml).not.toContain('SLA 99.9%');
      expect(modalHtml).toContain('Measured uptime unavailable');
    });

    it('retains clean empty UI when /api/analytics returns 0 nodes or is absent', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'healthy',
          metrics: { totalNodes: 0, activeNodes: 0, messagesProcessed: 0, avgLatencyMs: 0 },
          nodes: [],
        }),
      } as Response);

      try {
        await observatory.fetchRealTelemetry();

        expect(observatory.nodes.length).toBe(0);
        expect(observatory.metrics.totalNodes).toBe(0);

        const modalHtml = observatory.renderObservatoryModal();
        expect(modalHtml).toContain('No measured telemetry available');
        expect(modalHtml).toContain(
          'No measured telemetry available. Nodes will appear as they join the sovereign mesh.'
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles /api/analytics network error cleanly with 0 nodes', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('503 Service Unavailable'));

      try {
        await observatory.fetchRealTelemetry();

        expect(observatory.nodes.length).toBe(0);
        const modalHtml = observatory.renderObservatoryModal();
        expect(modalHtml).toContain('No measured telemetry available');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
(globalThis as any).__UREFY_DEMO_MODE__ = false;
