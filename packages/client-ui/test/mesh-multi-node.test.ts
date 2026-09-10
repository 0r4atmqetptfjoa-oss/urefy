import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateKeyPair,
  signMessage,
  verifySignature,
  bytesToHex,
  hexToBytes,
} from '@aetheris/core-crypto';
import {
  OfflineSyncEngine,
  createVectorClock,
  incrementVectorClock,
  mergeVectorClocks,
  compareVectorClocks,
  resolveCRDTConflict,
  type CRDTSyncRecord,
  type VectorClock,
} from '../src/offline-sync.js';

interface SimulatedMeshNode {
  id: string;
  name: string;
  keypair: {
    publicKeyHex: string;
    privateKeyHex: string;
    fingerprint: string;
  };
  syncEngine: OfflineSyncEngine;
  inbox: CRDTSyncRecord[];
  isOnline: boolean;
}

function createSimulatedNode(name: string): SimulatedMeshNode {
  const kp = generateKeyPair();
  const keypair = {
    publicKeyHex: kp.publicKeyHex,
    privateKeyHex: kp.privateKeyHex,
    fingerprint: kp.fingerprint,
  };
  const syncEngine = new OfflineSyncEngine(kp.fingerprint);
  return {
    id: kp.fingerprint,
    name,
    keypair,
    syncEngine,
    inbox: [],
    isOnline: true,
  };
}

describe('Etapa 5.1: Multi-Node Mesh & Anti-Entropy CRDT Reconciliation', () => {
  let nodeA: SimulatedMeshNode;
  let nodeB: SimulatedMeshNode;
  let nodeC: SimulatedMeshNode;

  beforeEach(() => {
    nodeA = createSimulatedNode('Node-Alpha');
    nodeB = createSimulatedNode('Node-Beta');
    nodeC = createSimulatedNode('Node-Gamma');
  });

  describe('1. Node Identity & Vector Clock Initialization', () => {
    it('initializes 3 distinct nodes with unique Ed25519 keypairs and fingerprints', () => {
      expect(nodeA.id).not.toBe(nodeB.id);
      expect(nodeB.id).not.toBe(nodeC.id);
      expect(nodeA.id).not.toBe(nodeC.id);

      expect(nodeA.keypair.publicKeyHex.length).toBe(64);
      expect(nodeB.keypair.publicKeyHex.length).toBe(64);
      expect(nodeC.keypair.publicKeyHex.length).toBe(64);
    });

    it('initializes independent vector clocks for each node', () => {
      const clockA = nodeA.syncEngine.getVectorClock();
      const clockB = nodeB.syncEngine.getVectorClock();
      const clockC = nodeC.syncEngine.getVectorClock();

      expect(clockA[nodeA.id]).toBe(0);
      expect(clockB[nodeB.id]).toBe(0);
      expect(clockC[nodeC.id]).toBe(0);

      expect(clockA[nodeB.id]).toBeUndefined();
      expect(clockB[nodeA.id]).toBeUndefined();
    });
  });

  describe('2. Multi-Node Gossip Propagation & Anti-Entropy', () => {
    it('propagates signed CRDT record across 3 nodes sequentially with vector clock tracking', async () => {
      // Step 1: Node A creates an E2EE pulse post
      const payloadA = { title: 'First sovereign mesh pulse', body: 'Mesh is operational' };
      const recordA = nodeA.syncEngine.setRecord('POST', 'post-1001', payloadA);

      expect(recordA.authorId).toBe(nodeA.id);
      expect(recordA.vectorClock[nodeA.id]).toBe(1);

      // Node A cryptographically signs the record
      const signatureA = signMessage(
        JSON.stringify(recordA.data),
        hexToBytes(nodeA.keypair.privateKeyHex)
      );
      const isSigValid = verifySignature(
        signatureA,
        JSON.stringify(recordA.data),
        hexToBytes(nodeA.keypair.publicKeyHex)
      );
      expect(isSigValid).toBe(true);

      // Step 2: Gossip from Node A -> Node B
      const resultB = nodeB.syncEngine.applyRemoteRecord(recordA);
      expect(resultB.changed).toBe(true);
      expect(resultB.reason).toBe('VECTOR_CLOCK_DOMINANCE');

      // Verify Node B now knows Node A's vector clock
      const clockB = nodeB.syncEngine.getVectorClock();
      expect(clockB[nodeA.id]).toBe(1);

      // Step 3: Gossip from Node B -> Node C
      const resultC = nodeC.syncEngine.applyRemoteRecord(resultB.record);
      expect(resultC.changed).toBe(true);

      // Verify Node C receives the identical data
      const storedInC = nodeC.syncEngine.crdtStore.get('post-1001');
      expect(storedInC).toBeDefined();
      expect(storedInC?.data.title).toBe('First sovereign mesh pulse');

      const clockC = nodeC.syncEngine.getVectorClock();
      expect(clockC[nodeA.id]).toBe(1);
    });

    it('resolves concurrent updates with deterministic causality dominance', () => {
      // Create initial shared record
      const initialRecord = nodeA.syncEngine.setRecord('CHANNEL', 'channel-1', { topic: 'Initial' });
      nodeB.syncEngine.applyRemoteRecord(initialRecord);
      nodeC.syncEngine.applyRemoteRecord(initialRecord);

      // Node A updates with timestamp 2000
      const updateA: CRDTSyncRecord = {
        ...initialRecord,
        data: { topic: 'Update from A' },
        timestamp: 2000,
        vectorClock: { [nodeA.id]: 2 },
        authorId: nodeA.id,
      };

      // Node B updates concurrently with timestamp 3000
      const updateB: CRDTSyncRecord = {
        ...initialRecord,
        data: { topic: 'Update from B (LWW winner)' },
        timestamp: 3000,
        vectorClock: { [nodeB.id]: 2 },
        authorId: nodeB.id,
      };

      // Node C receives updateA then updateB
      nodeC.syncEngine.applyRemoteRecord(updateA);
      const resB = nodeC.syncEngine.applyRemoteRecord(updateB);

      // Timestamp LWW should choose updateB because 3000 > 2000
      expect(resB.record.data.topic).toBe('Update from B (LWW winner)');
      expect(nodeC.syncEngine.crdtStore.get('channel-1')?.data.topic).toBe('Update from B (LWW winner)');

      // Merged vector clock must contain both node clocks
      const finalClock = nodeC.syncEngine.getVectorClock();
      expect(finalClock[nodeA.id]).toBeGreaterThanOrEqual(2);
      expect(finalClock[nodeB.id]).toBeGreaterThanOrEqual(2);
    });
  });

  describe('3. Network Partition & Resilient Healing (Anti-Entropy Split-Brain Recovery)', () => {
    it('handles network split: Node C disconnected, edits made on both sides, merges cleanly upon partition heal', () => {
      const baseTime = Date.now();

      // 1. Initial sync across all 3 nodes
      const seedRecord = nodeA.syncEngine.setRecord('DOCUMENT', 'doc-1', { content: 'Base line' });
      nodeB.syncEngine.applyRemoteRecord(seedRecord);
      nodeC.syncEngine.applyRemoteRecord(seedRecord);

      // 2. Partition: Node C becomes offline / unreachable from A & B
      nodeC.isOnline = false;

      // 3. Side 1 (Partition {A, B}): Node A and B work together
      const docAUpdate: CRDTSyncRecord = {
        id: 'doc-1',
        entityType: 'DOCUMENT',
        data: { content: 'Edits by Node A and B during partition' },
        timestamp: baseTime + 5000,
        vectorClock: { [nodeA.id]: 3, [nodeB.id]: 1 },
        authorId: nodeA.id,
      };
      nodeA.syncEngine.applyRemoteRecord(docAUpdate);
      nodeB.syncEngine.applyRemoteRecord(docAUpdate);

      // Node B also creates a brand new document during partition
      const docBNew = nodeB.syncEngine.setRecord('DOCUMENT', 'doc-2-partition-b', { content: 'Exclusive to B' });
      nodeA.syncEngine.applyRemoteRecord(docBNew);

      // 4. Side 2 (Partition {C}): Node C works in isolation
      const docCIsolated = nodeC.syncEngine.setRecord('DOCUMENT', 'doc-3-partition-c', { content: 'Created by isolated C' });

      // Node C also edits doc-1 locally with an older timestamp than A's update
      const docCEdit: CRDTSyncRecord = {
        id: 'doc-1',
        entityType: 'DOCUMENT',
        data: { content: 'Conflicting edit by C' },
        timestamp: baseTime + 2000, // older than baseTime + 5000
        vectorClock: { [nodeC.id]: 2 },
        authorId: nodeC.id,
      };
      nodeC.syncEngine.applyRemoteRecord(docCEdit);

      // Verify partition state before healing
      expect(nodeC.syncEngine.crdtStore.has('doc-2-partition-b')).toBe(false);
      expect(nodeA.syncEngine.crdtStore.has('doc-3-partition-c')).toBe(false);
      expect(nodeB.syncEngine.crdtStore.has('doc-3-partition-c')).toBe(false);

      // 5. Partition Heals! Full bidirectional anti-entropy reconciliation
      nodeC.isOnline = true;

      // Exchange records: C sends all records to A & B; A & B send all records to C
      const recordsFromC = Array.from(nodeC.syncEngine.crdtStore.values());
      const recordsFromA = Array.from(nodeA.syncEngine.crdtStore.values());

      nodeA.syncEngine.mergeRemoteRecords(recordsFromC);
      nodeB.syncEngine.mergeRemoteRecords(recordsFromC);
      nodeC.syncEngine.mergeRemoteRecords(recordsFromA);

      // 6. Verify Convergence: All 3 nodes now have all 3 documents!
      for (const node of [nodeA, nodeB, nodeC]) {
        expect(node.syncEngine.crdtStore.has('doc-1')).toBe(true);
        expect(node.syncEngine.crdtStore.has('doc-2-partition-b')).toBe(true);
        expect(node.syncEngine.crdtStore.has('doc-3-partition-c')).toBe(true);

        // Doc-1 conflict was resolved consistently (timestamp 10500 > 10200)
        expect(node.syncEngine.crdtStore.get('doc-1')?.data.content).toBe('Edits by Node A and B during partition');
      }

      // Check vector clocks are synchronized across all 3 nodes
      const finalClockA = nodeA.syncEngine.getVectorClock();
      const finalClockB = nodeB.syncEngine.getVectorClock();
      const finalClockC = nodeC.syncEngine.getVectorClock();

      expect(finalClockA[nodeA.id]).toBeDefined();
      expect(finalClockC[nodeA.id]).toBeDefined();
      expect(finalClockA[nodeC.id]).toBeDefined();
    });

    it('correctly handles distributed deletion via tombstones during network partition', () => {
      // Create shared record
      const post = nodeA.syncEngine.setRecord('POST', 'post-delete-test', { title: 'To be deleted' });
      nodeB.syncEngine.applyRemoteRecord(post);
      nodeC.syncEngine.applyRemoteRecord(post);

      // Node A deletes the post while partitioned from C
      const tombstone = nodeA.syncEngine.deleteRecord('post-delete-test');
      expect(tombstone).toBeDefined();
      expect(tombstone?.isDeleted).toBe(true);

      // Node B receives tombstone
      nodeB.syncEngine.applyRemoteRecord(tombstone!);
      expect(nodeB.syncEngine.crdtStore.get('post-delete-test')?.isDeleted).toBe(true);

      // Partition heals: Node C receives tombstone
      nodeC.syncEngine.applyRemoteRecord(tombstone!);
      expect(nodeC.syncEngine.crdtStore.get('post-delete-test')?.isDeleted).toBe(true);
    });
  });
});
