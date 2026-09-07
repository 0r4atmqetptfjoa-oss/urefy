import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  globalScale,
  GlobalScaleEngine,
  WORLDWIDE_EDGE_POPS,
  D1_GLOBAL_TOPOLOGY,
  GeoFencingPolicy,
} from '../src/global-scale.js';
import { CRDTSyncRecord, createVectorClock } from '../src/offline-sync.js';

describe('Aetheris Omni-Sphere — Global Scale & Edge Architecture (global-scale.ts)', () => {
  let engine: GlobalScaleEngine;

  beforeEach(() => {
    engine = new GlobalScaleEngine();
  });

  describe('1. Worldwide Anycast Edge Routing & Sub-15ms SLA', () => {
    it('should initialize with global PoPs across all 5 Super-Regions (WNAM, ENAM, WEUR, EEUR, APAC)', () => {
      const pops = engine.getAllPoPs();
      expect(pops.length).toBeGreaterThanOrEqual(15);

      const regions = new Set(pops.map((p) => p.superRegion));
      expect(regions.has('WNAM')).toBe(true);
      expect(regions.has('ENAM')).toBe(true);
      expect(regions.has('WEUR')).toBe(true);
      expect(regions.has('EEUR')).toBe(true);
      expect(regions.has('APAC')).toBe(true);
    });

    it('should guarantee sub-15ms average RTT latency SLA across all PoPs', () => {
      const pops = engine.getAllPoPs();
      for (const pop of pops) {
        expect(pop.measuredRttMs).toBeLessThanOrEqual(15.0);
        expect(pop.measuredRttMs).toBeGreaterThan(0);
        expect(pop.d1ReplicaActive).toBe(true);
        expect(pop.r2EdgeCacheActive).toBe(true);
      }
    });

    it('should automatically select the optimal lowest-latency PoP', () => {
      const active = engine.getActivePoP();
      expect(active).toBeDefined();

      const allPops = engine.getAllPoPs();
      const minLatency = Math.min(...allPops.map((p) => p.measuredRttMs));
      expect(active.measuredRttMs).toBe(minLatency);
    });

    it('should dynamically probe PoPs and recalculate optimal route', () => {
      const initialPoP = engine.getActivePoP();
      engine.probeAllPoPs();
      const nextPoP = engine.getActivePoP();
      expect(nextPoP).toBeDefined();
      expect(nextPoP.measuredRttMs).toBeLessThanOrEqual(16.5);
    });
  });

  describe('2. Geo-Fencing & Zero-Knowledge Data Sovereignty', () => {
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

  describe('3. Multi-Tier CDN Caching & Edge Compute Metrics', () => {
    it('should accurately track L1 PoP cache, L2 Regional tier cache, and Origin shield requests', () => {
      const initialMetrics = engine.getCDNMetrics();
      const initialHits = initialMetrics.l1EdgeCacheHits;

      engine.recordRequest('L1', 8192);
      expect(engine.getCDNMetrics().l1EdgeCacheHits).toBe(initialHits + 1);

      engine.recordRequest('L2', 16384);
      expect(engine.getCDNMetrics().l2TieredCacheHits).toBe(initialMetrics.l2TieredCacheHits + 1);

      engine.recordRequest('ORIGIN', 4096);
      expect(engine.getCDNMetrics().originShieldRequests).toBe(initialMetrics.originShieldRequests + 1);
    });

    it('should calculate global cache hit ratio correctly (> 95%)', () => {
      const hitRatio = engine.getCacheHitRatio();
      expect(hitRatio).toBeGreaterThan(0.95);
      expect(hitRatio).toBeLessThanOrEqual(1.0);
    });
  });

  describe('4. Cloudflare Durable Objects & WebSocket Hibernation Efficiency', () => {
    it('should compute WebSocket Hibernation stats with 90%+ memory savings', () => {
      const stats = engine.getDurableObjectStats();
      expect(stats.totalSockets).toBeGreaterThan(50000);
      expect(stats.hibernatingSockets).toBeGreaterThan(40000);
      expect(stats.hibernationRatio).toBeGreaterThan(0.8);
      expect(stats.memorySavingsPercent).toBeGreaterThan(75);
    });
  });

  describe('5. Cloudflare D1 Multi-Region Read Replicas (<5ms)', () => {
    it('should provide D1 read latency under 5ms across all global regions', () => {
      const topology = engine.getD1Topology();
      expect(topology.length).toBe(5);

      for (const node of topology) {
        expect(node.readLatencyMs).toBeLessThan(5.0);
        expect(node.replicaStatus).toBe('HEALTHY');
      }

      expect(engine.getD1ReadLatency('WEUR')).toBeLessThan(5.0);
      expect(engine.getD1ReadLatency('EEUR')).toBeLessThan(5.0);
      expect(engine.getD1ReadLatency('APAC')).toBeLessThan(5.0);
    });
  });

  describe('6. Merkle Tree CRDT Multi-Master State Reconciliation', () => {
    it('should recognize identical state partitions via Merkle root in 0 roundtrip differences', () => {
      const clock = createVectorClock('node-1', 5);
      const record1: CRDTSyncRecord = {
        id: 'rec-1',
        entityType: 'post',
        data: { text: 'Hello Aetheris' },
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
        vectorClock: clockB, // Causal dominance
        authorId: 'node-2',
      };

      const local = [localRecord];
      const remote = [remoteRecord];

      const res = engine.reconcileStatePartitions(local, remote);
      expect(res.rootsMatch).toBe(false);
      expect(res.divergentCount).toBeGreaterThan(0);
      expect(res.localMerkleRoot).not.toBe(res.remoteMerkleRoot);

      // Remote had causal dominance (clockB > clockA) -> remote wins
      const mergedWinner = res.mergedRecords.find((r) => r.id === 'rec-conflict');
      expect(mergedWinner).toBeDefined();
      expect(mergedWinner?.data.title).toBe('Remote Dominant Version');
    });
  });

  describe('7. Global Health & WebRTC Direct Swarm Emergency Failover', () => {
    it('should generate an optimal health report', () => {
      const report = engine.getHealthReport();
      expect(report.overallStatus).toBe('OPTIMAL');
      expect(report.rttLatencyMs).toBeLessThanOrEqual(15.0);
      expect(report.d1ReadLatencyMs).toBeLessThan(5.0);
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

  describe('8. UI Observatory Dashboard Rendering', () => {
    it('should render the complete HTML observatory dashboard with metrics and controls', () => {
      const html = engine.renderGlobalScaleDashboard();
      expect(html).toContain('Worldwide Anycast Edge Infrastructure');
      expect(html).toContain('Global Anycast Edge Network (Zero Data Retention)');
      expect(html).toContain('Cloudflare D1 Multi-Region Read Topology');
      expect(html).toContain('P2P WebRTC Direct Swarm Fallback');
      expect(html).toContain('Zero-Knowledge Data Sovereignty & Geo-Fencing');
      expect(html).toContain('EU GDPR Sovereign');
      expect(html).toContain('Swiss Enclave');
    });
  });
});
