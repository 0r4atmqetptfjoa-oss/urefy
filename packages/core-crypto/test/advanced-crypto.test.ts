import { describe, it, expect } from 'vitest';
import { WebOfTrustGraph } from '../src/wot.js';
import { TreeKEMEngine } from '../src/treekem.js';
import { ZKPassportVerifier } from '../src/zkpassport.js';

describe('Advanced Cryptographic & Graph Primitives', () => {
  describe('Web of Trust (Edmonds-Karp & MeritRank)', () => {
    it('computes max-flow and isolates untrusted bot clusters', () => {
      const graph = new WebOfTrustGraph();

      // Honest network: Alice (anchor) -> Bob (10) -> Charlie (5)
      graph.addTrustEdge('alice', 'bob', 10);
      graph.addTrustEdge('bob', 'charlie', 5);

      // Bot farm: Bot1 <-> Bot2 (isolated from Alice)
      graph.addTrustEdge('bot1', 'bot2', 100);
      graph.addTrustEdge('bot2', 'bot1', 100);

      // Max flow from Alice to Charlie
      const flowToCharlie = graph.computeMaxFlow('alice', 'charlie');
      expect(flowToCharlie).toBe(5);

      // Max flow from Alice to Bot1 must be 0!
      const flowToBot = graph.computeMaxFlow('alice', 'bot1');
      expect(flowToBot).toBe(0);
    });

    it('computes personalized MeritRank reputation scores', () => {
      const graph = new WebOfTrustGraph();
      graph.addTrustEdge('anchor', 'dev1', 5);
      graph.addTrustEdge('dev1', 'dev2', 3);

      const ranks = graph.computeMeritRank('anchor', 2000, 0.2);
      expect(ranks.get('anchor')).toBeGreaterThan(0.2);
      expect(ranks.get('dev1')).toBeGreaterThan(0.1);
      expect(ranks.get('dev2')).toBeDefined();
    });
  });

  describe('TreeKEM MLS Group Key Agreement (RFC 9420)', () => {
    it('executes logarithmic direct path updates for large groups', () => {
      const tree = new TreeKEMEngine(16); // 16 leaves -> 31 total tree nodes
      expect(tree.getTreeSize()).toBe(16);

      const leafSeed = new Uint8Array(32).fill(42);
      const update = tree.updateLeaf(3, leafSeed);

      expect(update.leafIndex).toBe(3);
      expect(update.directPathPublicKeys.length).toBe(4); // log2(16) = 4 steps to root
      expect(update.groupRootKeyHex.length).toBe(64);
      expect(tree.getGroupRootKey()).toBe(update.groupRootKeyHex);
    });
  });

  describe('ZKPassport Sovereign Attestation', () => {
    it('generates privacy-preserving realm nullifiers and checks revocation', () => {
      const salt = new Uint8Array(32).fill(9);
      const docHash = 'aa'.repeat(32);

      const attestation = ZKPassportVerifier.generateAttestation(salt, docHash);
      expect(attestation.realmNullifier.length).toBe(64);
      expect(attestation.identityCommitment.length).toBe(64);

      // Verification on active nullifiers
      const revoked = new Set<string>();
      expect(ZKPassportVerifier.verifyProof(attestation, revoked).valid).toBe(true);

      // Verification after slashing revocation
      revoked.add(attestation.realmNullifier);
      expect(ZKPassportVerifier.verifyProof(attestation, revoked).valid).toBe(false);
    });
  });
});
