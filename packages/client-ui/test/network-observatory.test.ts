import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NetworkObservatory,
  networkObservatory,
  type NetworkMetrics,
  type LatencyDataPoint,
  type TopologyNode,
  type SlashingRecord,
  type SlashingDayStat,
  type TopContributor,
  type TopologyFilter,
} from '../src/network-observatory.js';

describe('Network Observatory Telemetry & Cryptographic Monitoring System', () => {
  let observatory: NetworkObservatory;

  beforeEach(() => {
    observatory = new NetworkObservatory();
  });

  afterEach(() => {
    observatory.stopLiveUpdates();
    observatory.close();
  });

  // ─── 1. INITIALIZARE ȘI METRICI DE BAZĂ ─────────────────────────────────────

  describe('1. Initialization & Core Telemetry Matrix', () => {
    it('should initialize NetworkObservatory with default metrics and nodes', () => {
      expect(observatory).toBeInstanceOf(NetworkObservatory);
      expect(observatory.isOpen).toBe(false);
      expect(observatory.isLiveUpdating).toBe(false);
      expect(observatory.selectedNodeId).toBeNull();
      expect(observatory.activeFilter).toBe('all');
      expect(observatory.activeTab).toBe('overview');

      const metrics = observatory.metrics;
      expect(metrics.totalNodes).toBe(256);
      expect(metrics.activeNodes).toBe(242);
      expect(metrics.messagesPerMinute).toBe(4890);
      expect(metrics.avgLatencyMs).toBeGreaterThan(0);
      expect(metrics.totalSlashings).toBe(37);
      expect(metrics.networkUptime).toBe(99.98);
      expect(metrics.topContributors.length).toBeGreaterThanOrEqual(5);
    });

    it('should initialize topology nodes array with seeded nodes across roles', () => {
      expect(observatory.nodes.length).toBeGreaterThanOrEqual(15);

      const roles = observatory.nodes.map((n: TopologyNode) => n.role);
      expect(roles).toContain('gateway');
      expect(roles).toContain('relay');
      expect(roles).toContain('validator');
      expect(roles).toContain('storage');

      const primeGw = observatory.nodes.find((n: TopologyNode) => n.id === 'node-prime-gw');
      expect(primeGw).toBeDefined();
      expect(primeGw?.name).toBe('Aether-Prime Gateway');
      expect(primeGw?.role).toBe('gateway');
      expect(primeGw?.status).toBe('active');
      expect(primeGw?.meritScore).toBe(9840);
      expect(primeGw?.connections.length).toBeGreaterThan(0);
    });

    it('should initialize latency history with exactly 100 data points', () => {
      expect(observatory.latencyHistory.length).toBe(100);

      observatory.latencyHistory.forEach((point: LatencyDataPoint) => {
        expect(point.timestamp).toBeGreaterThan(0);
        expect(point.latencyMs).toBeGreaterThanOrEqual(10);
        expect(point.latencyMs).toBeLessThanOrEqual(100);
        expect(typeof point.nodeId).toBe('string');
      });
    });

    it('should initialize 7-day slashing stats with historical data', () => {
      expect(observatory.slashing7DayStats.length).toBe(7);

      const todayStat = observatory.slashing7DayStats[6];
      expect(todayStat.dayLabel).toBe('Today');
      expect(todayStat.totalSlashings).toBeGreaterThanOrEqual(0);
      expect(todayStat.totalPenaltiesAETH).toBeGreaterThanOrEqual(0);

      observatory.slashing7DayStats.forEach((stat: SlashingDayStat) => {
        expect(stat.doubleSignCount).toBeGreaterThanOrEqual(0);
        expect(stat.rateLimitCount).toBeGreaterThanOrEqual(0);
        expect(stat.epochGriefingCount).toBeGreaterThanOrEqual(0);
        expect(stat.totalSlashings).toBe(
          stat.doubleSignCount + stat.rateLimitCount + stat.epochGriefingCount
        );
      });
    });

    it('should initialize top contributors list with 5 nodes and correct metrics', () => {
      expect(observatory.topContributorsList.length).toBe(5);

      const top1 = observatory.topContributorsList[0];
      expect(top1.rank).toBe(1);
      expect(top1.name).toBe('Aether-Prime Gateway');
      expect(top1.tier).toBe('Archon');
      expect(top1.meritScore).toBe(9840);
      expect(top1.uptimePct).toBe(99.99);
      expect(top1.zkProofsVerified).toBeGreaterThan(100000);
    });

    it('should export singleton instance networkObservatory properly', () => {
      expect(networkObservatory).toBeInstanceOf(NetworkObservatory);
      expect(networkObservatory.metrics.totalNodes).toBe(256);
    });
  });

  // ─── 2. ACTUALIZARE METRICI ȘI TELEMETRIE LIVE ─────────────────────────────

  describe('2. Telemetry Updates & Live Monitoring Engine', () => {
    it('should update metrics, recalculate average latency, and push new data point', () => {
      const initialCount = observatory.latencyHistory.length;
      const initialMsgs = observatory.metrics.messagesPerMinute;

      observatory.updateMetrics();

      expect(observatory.latencyHistory.length).toBe(100); // capped at 100
      expect(observatory.metrics.avgLatencyMs).toBeGreaterThan(0);
      expect(observatory.metrics.activeNodes).toBeGreaterThanOrEqual(230);
      expect(observatory.metrics.activeNodes).toBeLessThanOrEqual(254);

      const latestPoint = observatory.latencyHistory[observatory.latencyHistory.length - 1];
      expect(latestPoint).toBeDefined();
      expect(latestPoint.timestamp).toBeGreaterThan(0);
      expect(latestPoint.latencyMs).toBeGreaterThanOrEqual(10);
    });

    it('should maintain max 100 points when adding multiple latency points', () => {
      for (let i = 0; i < 25; i++) {
        observatory.updateMetrics();
      }
      expect(observatory.latencyHistory.length).toBe(100);
    });

    it('should update individual nodes telemetry and top contributor counters during updateMetrics', () => {
      const initialMessages = observatory.nodes[0].messagesProcessed;
      const initialTopBandwidth = observatory.topContributorsList[0].bandwidthContributedGB;

      observatory.updateMetrics();

      expect(observatory.nodes[0].messagesProcessed).toBeGreaterThan(initialMessages);
      expect(observatory.topContributorsList[0].bandwidthContributedGB).toBeGreaterThanOrEqual(
        initialTopBandwidth
      );
    });

    it('should manage live updates timer with startLiveUpdates and stopLiveUpdates', () => {
      vi.useFakeTimers();

      expect(observatory.isLiveUpdating).toBe(false);
      observatory.startLiveUpdates(1000);
      expect(observatory.isLiveUpdating).toBe(true);

      const initialPoints = [...observatory.latencyHistory];
      vi.advanceTimersByTime(3500);

      // Should have triggered at least 3 updates
      observatory.stopLiveUpdates();
      expect(observatory.isLiveUpdating).toBe(false);

      vi.useRealTimers();
    });

    it('should handle subscribers notifications on telemetry updates', () => {
      let callCount = 0;
      const unsubscribe = observatory.subscribe(() => {
        callCount++;
      });

      observatory.updateMetrics();
      observatory.updateMetrics();
      expect(callCount).toBe(2);

      unsubscribe();
      observatory.updateMetrics();
      expect(callCount).toBe(2);
    });
  });

  // ─── 3. EXPORT METRICI ÎN FORMAT JSON ──────────────────────────────────────

  describe('3. Telemetry JSON Export Engine', () => {
    it('should export complete metrics payload as formatted JSON string', () => {
      const jsonStr = observatory.exportMetricsJSON();
      expect(typeof jsonStr).toBe('string');

      const parsed = JSON.parse(jsonStr);
      expect(parsed).toBeDefined();
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.networkMetrics).toBeDefined();
      expect(parsed.networkMetrics.totalNodes).toBe(256);
      expect(parsed.networkMetrics.activeNodes).toBe(observatory.metrics.activeNodes);

      expect(parsed.latencyAnalysis).toBeDefined();
      expect(parsed.latencyAnalysis.pointsCount).toBe(observatory.latencyHistory.length);
      expect(parsed.latencyAnalysis.avg).toBe(observatory.metrics.avgLatencyMs);
      expect(parsed.latencyAnalysis.min).toBeGreaterThanOrEqual(0);
      expect(parsed.latencyAnalysis.max).toBeGreaterThanOrEqual(parsed.latencyAnalysis.min);
      expect(Array.isArray(parsed.latencyAnalysis.recentPoints)).toBe(true);

      expect(Array.isArray(parsed.slashing7DayStats)).toBe(true);
      expect(parsed.slashing7DayStats.length).toBe(7);

      expect(Array.isArray(parsed.recentSlashingRecords)).toBe(true);
      expect(Array.isArray(parsed.topContributors)).toBe(true);
      expect(parsed.topContributors.length).toBe(5);

      expect(Array.isArray(parsed.topologyNodesSummary)).toBe(true);
      expect(parsed.topologyNodesSummary.length).toBe(observatory.nodes.length);
      expect(parsed.topologyNodesSummary[0].id).toBe('node-prime-gw');
    });
  });

  // ─── 4. RENDERARE OBSERVATORY MODAL (SVG RADAR, LATENCY, SLASHING) ─────────

  describe('4. Modal HTML & Interactive Telemetry Rendering', () => {
    it('should render complete observatory modal HTML with 4 core sections', () => {
      const html = observatory.renderObservatoryModal();

      // Modal container and headers
      expect(html).toContain('id="network-observatory-modal-root"');
      expect(html).toContain('Aetheris Network Observatory');
      expect(html).toContain('ZK-MESH');
      expect(html).toContain('LIVE SYNC');

      // Global KPI ribbon
      expect(html).toContain('Total Nodes');
      expect(html).toContain('Active Nodes');
      expect(html).toContain('Mesh Traffic');
      expect(html).toContain('Average Latency');
      expect(html).toContain('ZK-RLN Slashing');
      expect(html).toContain('Network Uptime');

      // Section 1: Topology Radar SVG
      expect(html).toContain('1. P2P Network Topology Map (Radar Mesh)');
      expect(html).toContain('viewBox="0 0 800 440"');
      expect(html).toContain('topology-links');
      expect(html).toContain('topology-nodes');
      expect(html).toContain('radarSweepGrad');

      // Section 2: Latency Real-Time Chart
      expect(html).toContain('2. Real-Time Latency Chart');
      expect(html).toContain('latencyAreaGrad');
      expect(html).toContain('Current Latency:');
      expect(html).toContain('Min');
      expect(html).toContain('Average');
      expect(html).toContain('P95');
      expect(html).toContain('Max (P99)');

      // Section 3: Slashing ZK-RLN Bar Chart
      expect(html).toContain('3. ZK-RLN Slashing Statistics (7 Days)');
      expect(html).toContain('Double-Sign');
      expect(html).toContain('RLN Rate-Limit');
      expect(html).toContain('Epoch Griefing');

      // Section 4: Top Contributors Leaderboard
      expect(html).toContain('4. Top 5 Contributors (Merit Leaderboard)');
      expect(html).toContain('Aether-Prime Gateway');
      expect(html).toContain('Tokyo-Validator-Alpha');
      expect(html).toContain('Frankfurt-Relay-01');
      expect(html).toContain('Amsterdam-Validator-Delta');
      expect(html).toContain('Zurich-Validator-Gamma');
      expect(html).toContain('Archon');
      expect(html).toContain('Sentinel');

      // Footer
      expect(html).toContain('BFT Consensus Finality');
      expect(html).toContain('Circom ZK Verifier');
      expect(html).toContain('Close Observatory');
    });

    it('should filter topology nodes when activeFilter is changed', () => {
      observatory.setFilter('relay');
      expect(observatory.activeFilter).toBe('relay');
      const relayHtml = observatory.renderObservatoryModal();
      expect(relayHtml).toContain('svg-node-node-fra-01');
      expect(relayHtml).not.toContain('svg-node-node-prime-gw'); // gateway should be excluded

      observatory.setFilter('validator');
      expect(observatory.activeFilter).toBe('validator');
      const valHtml = observatory.renderObservatoryModal();
      expect(valHtml).toContain('svg-node-node-tok-val');
      expect(valHtml).toContain('svg-node-node-zur-val');

      observatory.setFilter('all');
      expect(observatory.activeFilter).toBe('all');
    });

    it('should select a node and render detailed drawer HUD', () => {
      expect(observatory.selectedNodeId).toBeNull();

      observatory.selectNode('node-prime-gw');
      expect(observatory.selectedNodeId).toBe('node-prime-gw');

      const modalWithDrawer = observatory.renderObservatoryModal();
      expect(modalWithDrawer).toContain('Aether-Prime Gateway');
      expect(modalWithDrawer).toContain('Frankfurt Core');
      expect(modalWithDrawer).toContain('Nym Mixnet L3');
      expect(modalWithDrawer).toContain('ZK-RLN Epoch');
      expect(modalWithDrawer).toContain('ZK Ping Test');

      // Deselect node
      observatory.selectNode('node-prime-gw');
      expect(observatory.selectedNodeId).toBeNull();
    });

    it('should switch active tab and toggle modal visibility', () => {
      observatory.setActiveTab('topology');
      expect(observatory.activeTab).toBe('topology');

      observatory.open();
      expect(observatory.isOpen).toBe(true);
      expect(observatory.isLiveUpdating).toBe(true);

      observatory.close();
      expect(observatory.isOpen).toBe(false);
      expect(observatory.selectedNodeId).toBeNull();

      observatory.toggle();
      expect(observatory.isOpen).toBe(true);
      observatory.toggle();
      expect(observatory.isOpen).toBe(false);
    });
  });

  // ─── 5. RENDERARE BUTON OBSERVATORY ────────────────────────────────────────

  describe('5. Observatory Trigger Button Rendering', () => {
    it('should render standalone trigger button with active node counter and live ping', () => {
      const buttonHtml = observatory.renderObservatoryButton();

      expect(buttonHtml).toContain('id="btn-network-observatory-trigger"');
      expect(buttonHtml).toContain('📡');
      expect(buttonHtml).toContain('Observatory');
      expect(buttonHtml).toContain('bg-signal');
      expect(buttonHtml).toContain(`${observatory.metrics.activeNodes} Nodes`);
      expect(buttonHtml).toContain('window.__aetheris_observatory_toggle');
    });
  });
});
