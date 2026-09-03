import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OfflineSyncEngine,
  offlineSync,
  createVectorClock,
  incrementVectorClock,
  mergeVectorClocks,
  compareVectorClocks,
  resolveCRDTConflict,
  type CRDTSyncRecord,
  type VectorClock,
} from '../src/offline-sync.js';

describe('OfflineSyncEngine — CRDT Conflict Resolution & Offline Reconnection Daemon', () => {
  let engine: OfflineSyncEngine;

  beforeEach(() => {
    engine = new OfflineSyncEngine('node-test-alpha');
    engine.isOnline = true;
    engine.clearQueue();
    engine.crdtStore.clear();
  });

  // ---------------------------------------------------------------------------
  // 1. Vector Clock Operations
  // ---------------------------------------------------------------------------
  describe('1. Vector Clock Operations & Causality Comparison', () => {
    it('should create and increment vector clocks correctly', () => {
      const clock = createVectorClock('node-A', 0);
      expect(clock['node-A']).toBe(0);

      const inc1 = incrementVectorClock(clock, 'node-A');
      expect(inc1['node-A']).toBe(1);

      const inc2 = incrementVectorClock(inc1, 'node-B');
      expect(inc2['node-A']).toBe(1);
      expect(inc2['node-B']).toBe(1);
    });

    it('should merge vector clocks taking element-wise maximum', () => {
      const clockA: VectorClock = { 'node-A': 3, 'node-B': 1 };
      const clockB: VectorClock = { 'node-A': 1, 'node-B': 4, 'node-C': 2 };

      const merged = mergeVectorClocks(clockA, clockB);
      expect(merged['node-A']).toBe(3);
      expect(merged['node-B']).toBe(4);
      expect(merged['node-C']).toBe(2);
    });

    it('should accurately compare vector clock causal relationships', () => {
      const clock1: VectorClock = { 'node-A': 2, 'node-B': 1 };
      const clock2: VectorClock = { 'node-A': 3, 'node-B': 2 };
      const clockConcurrent: VectorClock = { 'node-A': 1, 'node-B': 4 };

      // clock2 strictly dominates clock1 (GREATER)
      expect(compareVectorClocks(clock2, clock1)).toBe('GREATER');
      // clock1 strictly preceded clock2 (LESS)
      expect(compareVectorClocks(clock1, clock2)).toBe('LESS');
      // Identical clocks (EQUAL)
      expect(compareVectorClocks(clock1, { 'node-A': 2, 'node-B': 1 })).toBe('EQUAL');
      // Concurrent clocks (CONCURRENT)
      expect(compareVectorClocks(clock1, clockConcurrent)).toBe('CONCURRENT');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CRDT Conflict Resolution (Last-Write-Wins + Vector Clock tie-breaker)
  // ---------------------------------------------------------------------------
  describe('2. CRDT Conflict Resolution (resolveCRDTConflict)', () => {
    it('should resolve conflicts using Vector Clock causal dominance when available', () => {
      const local: CRDTSyncRecord = {
        id: 'post-101',
        entityType: 'CREATE_POST',
        data: { text: 'Local draft v1' },
        timestamp: 1000,
        vectorClock: { 'node-A': 1, 'node-B': 1 },
        authorId: '0xAAA',
      };

      const remoteDominating: CRDTSyncRecord = {
        id: 'post-101',
        entityType: 'CREATE_POST',
        data: { text: 'Remote updated v2' },
        timestamp: 950, // Even with earlier physical timestamp, VC dominance wins!
        vectorClock: { 'node-A': 2, 'node-B': 2 },
        authorId: '0xBBB',
      };

      const result = resolveCRDTConflict(local, remoteDominating);
      expect(result.resolutionReason).toBe('VECTOR_CLOCK_DOMINANCE');
      expect(result.winner.data.text).toBe('Remote updated v2');
      expect(result.mergedVectorClock['node-A']).toBe(2);
    });

    it('should fall back to Physical Timestamp Last-Write-Wins (LWW) on concurrent vector clocks', () => {
      const localConcurrent: CRDTSyncRecord = {
        id: 'vote-202',
        entityType: 'VOTE_POST',
        data: { merit: 1 },
        timestamp: 1000,
        vectorClock: { 'node-A': 2, 'node-B': 0 },
        authorId: '0xAAA',
      };

      const remoteConcurrentLater: CRDTSyncRecord = {
        id: 'vote-202',
        entityType: 'VOTE_POST',
        data: { merit: -1 },
        timestamp: 2000, // Later timestamp wins
        vectorClock: { 'node-A': 0, 'node-B': 2 },
        authorId: '0xBBB',
      };

      const result = resolveCRDTConflict(localConcurrent, remoteConcurrentLater);
      expect(result.resolutionReason).toBe('TIMESTAMP_LWW');
      expect(result.winner.data.merit).toBe(-1);
    });

    it('should use deterministic author ID tie-breaker when timestamp and concurrent VC are tied', () => {
      const recordA: CRDTSyncRecord = {
        id: 'settings-1',
        entityType: 'SETTING',
        data: { theme: 'cyber-obsidian' },
        timestamp: 5000,
        vectorClock: { 'node-A': 1, 'node-B': 0 },
        authorId: 'author-alpha',
      };

      const recordB: CRDTSyncRecord = {
        id: 'settings-1',
        entityType: 'SETTING',
        data: { theme: 'matrix-monolith' },
        timestamp: 5000,
        vectorClock: { 'node-A': 0, 'node-B': 1 },
        authorId: 'author-zeta', // author-zeta > author-alpha
      };

      const result = resolveCRDTConflict(recordA, recordB);
      expect(result.resolutionReason).toBe('AUTHOR_TIEBREAKER');
      expect(result.winner.authorId).toBe('author-zeta');
      expect(result.winner.data.theme).toBe('matrix-monolith');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. CRDT Store State Management & Deletions
  // ---------------------------------------------------------------------------
  describe('3. Engine CRDT Store Operations & Deletions', () => {
    it('should set and get CRDT records with auto-incremented vector clocks', () => {
      const rec = engine.setRecord('POST', 'p-1', { title: 'First Post' });
      expect(rec.id).toBe('p-1');
      expect(rec.vectorClock[engine.nodeId]).toBe(1);

      const fetched = engine.getRecord('p-1');
      expect(fetched).toBeDefined();
      expect(fetched?.data.title).toBe('First Post');
    });

    it('should support CRDT tombstone soft-deletion', () => {
      engine.setRecord('POST', 'p-2', { title: 'Post to delete' });
      const tombstone = engine.deleteRecord('p-2');

      expect(tombstone).toBeDefined();
      expect(tombstone?.isDeleted).toBe(true);

      const stats = engine.getCRDTStats();
      expect(stats.tombstonesCount).toBe(1);
    });

    it('should merge batches of remote records and track conflict metrics', () => {
      engine.setRecord('POST', 'shared-1', { text: 'Local text' });

      const remoteBatch: CRDTSyncRecord[] = [
        {
          id: 'shared-1',
          entityType: 'POST',
          data: { text: 'Remote dominating text' },
          timestamp: Date.now() + 1000,
          vectorClock: { 'peer-x': 5 },
          authorId: 'peer-x',
        },
        {
          id: 'new-remote-2',
          entityType: 'MESSAGE',
          data: { text: 'Hello from peer' },
          timestamp: Date.now(),
          vectorClock: { 'peer-x': 1 },
          authorId: 'peer-x',
        },
      ];

      const res = engine.mergeRemoteRecords(remoteBatch);
      expect(res.applied).toBe(2);
      expect(res.conflictsResolved).toBe(1);

      const stats = engine.getCRDTStats();
      expect(stats.totalRecords).toBe(2);
      expect(stats.totalConflictsResolved).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Action Queue, Reconnection & UI Modals
  // ---------------------------------------------------------------------------
  describe('4. Action Queue & Backoff Reconnection', () => {
    it('should enqueue actions and update pending count', () => {
      engine.enqueue('CREATE_POST', { title: 'Test Offline Post', content: 'Offline text' });
      expect(engine.getPendingCount()).toBe(1);
      expect(engine.queue[0].type).toBe('CREATE_POST');
      expect(engine.queue[0].status).toBe('pending');
    });

    it('should process and synchronize queued actions', async () => {
      engine.enqueue('VOTE_POST', { postId: 'p1', dir: 1 });
      const result = await engine.syncQueue();
      expect(result.synced).toBe(1);
      expect(engine.getPendingCount()).toBe(0);
    });

    it('should calculate exponential backoff with full jitter correctly', () => {
      const delay0 = engine.calculateBackoffWithJitter(0);
      expect(delay0).toBeGreaterThanOrEqual(500); // 1000 * 0.5
      expect(delay0).toBeLessThanOrEqual(1000); // 1000 * 1.0

      const delay3 = engine.calculateBackoffWithJitter(3);
      expect(delay3).toBeGreaterThanOrEqual(2000);
      expect(delay3).toBeLessThanOrEqual(30000);
    });

    it('should toggle sync manager modal state and render modal HTML', () => {
      expect(engine.isOpen).toBe(false);
      engine.open();
      expect(engine.isOpen).toBe(true);

      const modalHtml = engine.renderSyncManagerModal();
      expect(modalHtml).toContain('Offline Buffer & Sync Engine');
      expect(modalHtml).toContain('Conflict-Free Replicated Data Types (CRDT)');
      expect(modalHtml).toContain('btn-force-sync-now');
      expect(modalHtml).toContain('btn-close-sync-modal');

      engine.close();
      expect(engine.isOpen).toBe(false);
    });

    it('should render sync status badge when pending actions exist', () => {
      engine.enqueue('ADD_REACTION', { postId: 'p1', emoji: '🔥' });
      const badgeHtml = engine.renderSyncBadge();
      expect(badgeHtml).toContain('btn-open-sync-modal');
      expect(badgeHtml).toContain('1 Pending');
    });

    it('should render offline status badge when offline', () => {
      engine.isOnline = false;
      const badgeHtml = engine.renderSyncBadge();
      expect(badgeHtml).toContain('Offline');
    });

    it('should export singleton instance offlineSync', () => {
      expect(offlineSync).toBeInstanceOf(OfflineSyncEngine);
    });
  });
});
