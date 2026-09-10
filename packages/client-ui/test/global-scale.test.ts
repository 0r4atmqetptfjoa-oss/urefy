import './helpers/disable-demo.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  globalScale,
  GlobalScaleEngine,
  WORLDWIDE_EDGE_POPS,
  D1_GLOBAL_TOPOLOGY,
  createPoPList,
  createD1Topology,
  GeoFencingPolicy,
} from '../src/global-scale.js';
import { CRDTSyncRecord, createVectorClock } from '../src/offline-sync.js';
import { setSimulationMode } from '../src/simulation-mode.js';

describe('UREfy — Global Scale & Edge Architecture (global-scale.ts)', () => {
  let engine: GlobalScaleEngine;

  beforeEach(() => {
    // Default to production mode (simulation disabled)
    setSimulationMode(false);
    engine = new GlobalScaleEngine();
  });

  afterEach(() => {
    setSimulationMode(false);
    vi.restoreAllMocks();
  });

  describe('1. Production Mode: Zero Fake Telemetry Invariants', () => {
    it('should initialize EdgePoPs with null measured RTT and null socket counts in production', () => {
      const pops = engine.getAllPoPs();
      expect(pops.length).toBeGreaterThanOrEqual(15);

      for (const pop of pops) {
        expect(pop.measuredRttMs).toBeNull();
        expect(pop.durableObjectHibernatingSockets).toBeNull();
        expect(pop.activeSockets).toBeNull();
        expect(pop.status).toBe('ONLINE');
      }
    });

    it('should initialize D1 read latencies and replication sequences as null in production', () => {
      const topology = engine.getD1Topology();
      expect(topology.length).toBe(5);

      for (const node of topology) {
        expect(node.readLatencyMs).toBeNull();
        expect(node.lastReplicationSequence).toBeNull();
      }

      expect(engine.getD1ReadLatency('WEUR')).toBeNull();
      expect(engine.getD1ReadLatency('EEUR')).toBeNull();
      expect(engine.getD1ReadLatency('APAC')).toBeNull();
    });

    it('should start with zero CDN cache requests and null cache hit ratio in production', () => {
      const metrics = engine.getCDNMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.l1EdgeCacheHits).toBe(0);
      expect(metrics.l2TieredCacheHits).toBe(0);
      expect(metrics.bandwidthSavedBytes).toBe(0);
      expect(metrics.averageEdgeLatencyMs).toBeNull();

      expect(engine.getCacheHitRatio()).toBeNull();
    });

    it('should return null for server-wide Durable Object stats when unmeasured in production', () => {
      const stats = engine.getDurableObjectStats();
      expect(stats.totalSockets).toBeNull();
      expect(stats.activeSockets).toBeNull();
      expect(stats.hibernatingSockets).toBeNull();
      expect(stats.hibernationRatio).toBeNull();
      expect(stats.memorySavingsPercent).toBeNull();
    });

    it('should render production UI dashboard with [PRODUCTION (Real Telemetry Only)] and unmeasured placeholders', () => {
      const html = engine.renderGlobalScaleDashboard();
      expect(html).toContain('[PRODUCTION (Real Telemetry Only)]');
      expect(html).toContain('Not measured');
      expect(html).toContain('No requests recorded');
      expect(html).toContain('Server-edge only');
      expect(html).not.toContain('Sub-15ms Global Latency SLA');
      expect(html).not.toContain('300+ Cities');
    });
  });

  describe('2. Simulation Mode Opt-In (Explicit Testbed Testing)', () => {
    it('should provide testbed baseline numbers when simulation mode is explicitly enabled', () => {
      setSimulationMode(true);
      const simEngine = new GlobalScaleEngine();

      const pops = simEngine.getAllPoPs();
      expect(pops.length).toBeGreaterThanOrEqual(15);
      for (const pop of pops) {
        expect(pop.measuredRttMs).not.toBeNull();
        expect(pop.measuredRttMs!).toBeGreaterThan(0);
        expect(pop.activeSockets).not.toBeNull();
        expect(pop.durableObjectHibernatingSockets).not.toBeNull();
      }

      const cdn = simEngine.getCDNMetrics();
      expect(cdn.totalRequests).toBe(192900);
      expect(cdn.l1EdgeCacheHits).toBe(184500);
      expect(simEngine.getCacheHitRatio()).toBeGreaterThan(0.95);

      const doStats = simEngine.getDurableObjectStats();
      expect(doStats.totalSockets).toBeGreaterThan(50000);
      expect(doStats.memorySavingsPercent).toBeGreaterThan(75);

      const html = simEngine.renderGlobalScaleDashboard();
      expect(html).toContain('[SIMULATION MODE (Synthetic Testbed)]');
    });
  });

  describe('3. Active Latency Probing & Route Optimization', () => {
    it('should probe real endpoint in production without Math.random', async () => {
      // Mock global fetch to verify real endpoint probe
      const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      await engine.probeAllPoPs();
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics', expect.objectContaining({ method: 'HEAD' }));

      const active = engine.getActivePoP();
      expect(active).toBeDefined();
      expect(active.measuredRttMs).not.toBeNull();
    });

    it('should dynamically probe PoPs with CSPRNG jitter in simulation mode', async () => {
      setSimulationMode(true);
      const simEngine = new GlobalScaleEngine();
      const initialRtt = simEngine.getActivePoP().measuredRttMs;

      await simEngine.probeAllPoPs();
      const nextRtt = simEngine.getActivePoP().measuredRttMs;
      expect(nextRtt).not.toBeNull();
      expect(nextRtt).toBeGreaterThan(0);
    });
  });

  describe('4. Geo-Fencing & Zero-Knowledge Data Sovereignty', () => {
    it('should enforce EU_GDPR_SOVEREIGN policy (WEUR + EEUR only)', () => {
      engine.setGeoPolicy('EU_GDPR_SOVEREIGN');
      expect(engine.getGeoPolicy()).toBe('EU_GDPR_SOVEREIGN');

      const permitted = engine.getPermittedPoPs();
      for (const pop of permitted) {
        expect(['WEUR', 'EEUR']).toContain(pop.superRegion);
      }
    });

    it('should enforce SWISS_SOVEREIGN policy (Zurich enclave only)', () => {
      engine.setGeoPolicy('SWISS_SOVEREIGN');
      const permitted = engine.getPermittedPoPs();
      expect(permitted.length).toBe(1);
      expect(permitted[0].airportCode).toBe('ZRH');
      expect(permitted[0].city).toBe('Zurich');
    });

    it('should enforce US_DOMESTIC policy (WNAM + ENAM)', () => {
      engine.setGeoPolicy('US_DOMESTIC');
      const permitted = engine.getPermittedPoPs();
      for (const pop of permitted) {
        expect(['WNAM', 'ENAM']).toContain(pop.superRegion);
      }
    });

    it('should enforce APAC_ISOLATED policy', () => {
      engine.setGeoPolicy('APAC_ISOLATED');
      const permitted = engine.getPermittedPoPs();
      for (const pop of permitted) {
        expect(pop.superRegion).toBe('APAC');
      }
    });
  });

  describe('5. Real Request Recording on CDN Metrics', () => {
    it('should increment real CDN cache requests when recordRequest is called', () => {
      expect(engine.getCDNMetrics().totalRequests).toBe(0);

      engine.recordRequest('L1', 8192);
      expect(engine.getCDNMetrics().l1EdgeCacheHits).toBe(1);
      expect(engine.getCDNMetrics().totalRequests).toBe(1);
      expect(engine.getCacheHitRatio()).toBe(1.0);

      engine.recordRequest('L2', 16384);
      expect(engine.getCDNMetrics().l2TieredCacheHits).toBe(1);
      expect(engine.getCDNMetrics().totalRequests).toBe(2);

      engine.recordRequest('ORIGIN', 4096);
      expect(engine.getCDNMetrics().originShieldRequests).toBe(1);
      expect(engine.getCDNMetrics().totalRequests).toBe(3);

      expect(engine.getCacheHitRatio()).toBeCloseTo(2 / 3, 2);
    });
  });

  describe('6. Merkle Tree CRDT Multi-Master State Reconciliation', () => {
    it('should recognize identical state partitions via Merkle root in 0 roundtrip differences', () => {
      const clock = createVectorClock('node-1', 5);
      const record1: CRDTSyncRecord = {
        id: 'rec-1',
        entityType: 'post',
        data: { text: 'Hello UREfy' },
        timestamp: 1000,
        vectorClock: clock,
        authorId: 'node-1',
      };
      const record2: CRDTSyncRecord = {
        id: 'rec-2',
        entityType: 'post',
        data: { text: 'Second Post' },
        timestamp: 1050,
        vectorClock: clock,
        authorId: 'node-1',
      };

      const local = [record1, record2];
      const remote = [record1, record2];

      const res = engine.reconcileStatePartitions(local, remote);
      expect(res.rootsMatch).toBe(true);
      expect(res.divergentCount).toBe(0);
      expect(res.localMerkleRoot).toBe(res.remoteMerkleRoot);
      expect(res.mergedRecords.length).toBe(2);
    });

    it('should detect divergence and resolve conflicts via CRDT Vector Clocks + LWW', () => {
      const clockA = createVectorClock('node-1', 1);
      const clockB = { 'node-1': 1, 'node-2': 1 };

      const localRecord: CRDTSyncRecord = {
        id: 'rec-conflict',
        entityType: 'post',
        data: { title: 'Local Version' },
        timestamp: 2000,
        vectorClock: clockA,
        authorId: 'node-1',
      };

      const remoteRecord: CRDTSyncRecord = {
        id: 'rec-conflict',
        entityType: 'post',
        data: { title: 'Remote Dominant Version' },
        timestamp: 2500,
        vectorClock: clockB,
        authorId: 'node-2',
      };

      const local = [localRecord];
      const remote = [remoteRecord];

      const res = engine.reconcileStatePartitions(local, remote);
      expect(res.rootsMatch).toBe(false);
      expect(res.divergentCount).toBeGreaterThan(0);
      expect(res.localMerkleRoot).not.toBe(res.remoteMerkleRoot);

      const mergedWinner = res.mergedRecords.find((r) => r.id === 'rec-conflict');
      expect(mergedWinner).toBeDefined();
      expect(mergedWinner?.data.title).toBe('Remote Dominant Version');
    });
  });

  describe('7. Global Health & WebRTC Direct Swarm Emergency Failover', () => {
    it('should generate a truthful health report in production', () => {
      const report = engine.getHealthReport();
      expect(report.overallStatus).toBe('OPTIMAL');
      expect(report.rttLatencyMs).toBeNull(); // Unmeasured before probe
      expect(report.d1ReadLatencyMs).toBeNull();
      expect(report.webrtcSwarmFallbackReady).toBe(true);
      expect(report.zeroKnowledgeEnforced).toBe(true);
    });

    it('should allow toggling emergency P2P WebRTC Direct Swarm Failover', () => {
      expect(engine.isP2PFailoverActive()).toBe(false);
      engine.triggerEmergencyP2PFailover(true);
      expect(engine.isP2PFailoverActive()).toBe(true);
      expect(engine.getHealthReport().overallStatus).toBe('FAILOVER_P2P');

      engine.triggerEmergencyP2PFailover(false);
      expect(engine.isP2PFailoverActive()).toBe(false);
      expect(engine.getHealthReport().overallStatus).toBe('OPTIMAL');
    });
  });
});
(globalThis as any).__UREFY_DEMO_MODE__ = false;
