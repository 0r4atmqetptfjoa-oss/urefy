import { describe, it, expect } from 'vitest';
import {
  ZKReputationProofEngine,
  exportPortableReputationCertificate,
  verifyPortableReputationCertificate,
  computeReputationNullifier,
  PortableReputationCertificate,
} from '../src/zk-wot-reputation.js';
import { WebOfTrustGraph } from '../src/wot.js';
import { generateKeyPair } from '../src/ed25519.js';

describe('ZKReputationProofEngine - Web of Trust & Range Proofs', () => {
  const userKeypair = generateKeyPair();
  const observerAnchor = 'genesis-core';
  const targetUser = userKeypair.fingerprint;
  const testDomain = 'governance.aetheris.eth';

  describe('WoT Graph Trust Score Calculation', () => {
    it('assigns perfect trust score (100) to the trust anchor itself', () => {
      const graph = new WebOfTrustGraph();
      graph.addTrustEdge(observerAnchor, 'node-b', 10);
      const score = ZKReputationProofEngine.calculateTrustScore(graph, observerAnchor, observerAnchor);
      expect(score).toBe(100);
    });

    it('returns 0 for disconnected nodes with zero flow from trust anchor', () => {
      const graph = new WebOfTrustGraph();
      graph.addTrustEdge(observerAnchor, 'trusted-peer', 10);
      graph.addTrustEdge('bot-farm-1', 'bot-farm-2', 100);
      const score = ZKReputationProofEngine.calculateTrustScore(graph, observerAnchor, 'bot-farm-2');
      expect(score).toBe(0);
    });

    it('calculates positive reputation for nodes with trust paths from anchor', () => {
      const graph = new WebOfTrustGraph();
      graph.addTrustEdge(observerAnchor, 'curator-1', 15);
      graph.addTrustEdge('curator-1', targetUser, 10);
      graph.addTrustEdge(observerAnchor, targetUser, 5);

      const score = ZKReputationProofEngine.calculateTrustScore(graph, observerAnchor, targetUser, {
        steps: 2000,
        restartProbability: 0.15,
      });

      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Nullifier Consistency & Double-Spending Prevention', () => {
    it('generates deterministic nullifier for same secret, epoch, and domain context', () => {
      const epoch = 42;
      const nullifier1 = computeReputationNullifier(userKeypair.privateKey, epoch, testDomain);
      const nullifier2 = computeReputationNullifier(userKeypair.privateKey, epoch, testDomain);

      expect(nullifier1).toHaveLength(64);
      expect(nullifier1).toBe(nullifier2);
    });

    it('generates distinct nullifiers across different epochs (temporal unlinkability)', () => {
      const nullifierEpoch1 = computeReputationNullifier(userKeypair.privateKey, 100, testDomain);
      const nullifierEpoch2 = computeReputationNullifier(userKeypair.privateKey, 101, testDomain);

      expect(nullifierEpoch1).not.toBe(nullifierEpoch2);
    });

    it('generates distinct nullifiers across different domains (cross-service unlinkability)', () => {
      const nullifierDomainA = computeReputationNullifier(userKeypair.privateKey, 100, 'governance.aetheris.eth');
      const nullifierDomainB = computeReputationNullifier(userKeypair.privateKey, 100, 'audio-lounge.aetheris.eth');

      expect(nullifierDomainA).not.toBe(nullifierDomainB);
    });

    it('generates distinct nullifiers for different user identities in the same context', () => {
      const otherKeypair = generateKeyPair();
      const n1 = computeReputationNullifier(userKeypair.privateKey, 50, testDomain);
      const n2 = computeReputationNullifier(otherKeypair.privateKey, 50, testDomain);

      expect(n1).not.toBe(n2);
    });
  });

  describe('Zero-Knowledge Range Proof Generation & Verification', () => {
    it('successfully generates and verifies a portable certificate for score >= threshold', async () => {
      const score = 85;
      const threshold = 75;

      const cert = await exportPortableReputationCertificate(
        score,
        threshold,
        userKeypair.privateKey,
        testDomain
      );

      expect(cert.version).toBe('1.0');
      expect(cert.threshold).toBe(75);
      expect(cert.domain).toBe(testDomain);
      expect(cert.nullifier).toHaveLength(64);
      expect(cert.proof).toBeDefined();
      expect(cert.publicInputs).toHaveLength(4);

      const isValid = await verifyPortableReputationCertificate(cert, 75, testDomain);
      expect(isValid).toBe(true);
    });

    it('allows higher reputation tiers to satisfy lower threshold verifiers', async () => {
      // User with score 92 exports certificate for threshold 90
      const cert = await exportPortableReputationCertificate(
        92,
        90,
        userKeypair.privateKey,
        testDomain
      );

      // Verifier only requires threshold 50
      const satisfiesLesserThreshold = await verifyPortableReputationCertificate(cert, 50, testDomain);
      expect(satisfiesLesserThreshold).toBe(true);
    });

    it('strictly rejects range proof generation when user score is below threshold', async () => {
      const lowScore = 48;
      const highThreshold = 75;

      await expect(
        exportPortableReputationCertificate(
          lowScore,
          highThreshold,
          userKeypair.privateKey,
          testDomain
        )
      ).rejects.toThrow(/Reputation score \(48\) is below required threshold \(75\)/);
    });

    it('rejects certificate if verifier requires higher threshold than attested', async () => {
      // Certificate attests to threshold 50
      const cert = await exportPortableReputationCertificate(
        60,
        50,
        userKeypair.privateKey,
        testDomain
      );

      // Verifier expects threshold 80
      const isValid = await verifyPortableReputationCertificate(cert, 80, testDomain);
      expect(isValid).toBe(false);
    });

    it('rejects certificate on domain mismatch (replay protection)', async () => {
      const cert = await exportPortableReputationCertificate(
        80,
        70,
        userKeypair.privateKey,
        'governance.aetheris.eth'
      );

      const isValid = await verifyPortableReputationCertificate(
        cert,
        70,
        'different-application.eth'
      );
      expect(isValid).toBe(false);
    });

    it('rejects expired certificates', async () => {
      const cert = await exportPortableReputationCertificate(
        85,
        75,
        userKeypair.privateKey,
        testDomain,
        1,
        -1000 // negative validity duration -> already expired
      );

      const isValid = await verifyPortableReputationCertificate(cert, 75, testDomain);
      expect(isValid).toBe(false);
    });

    it('rejects tampered Groth16 proofs or manipulated public inputs', async () => {
      const cert = await exportPortableReputationCertificate(
        80,
        75,
        userKeypair.privateKey,
        testDomain
      );

      // Attempt 1: Tamper with threshold public input
      const tamperedCert1: PortableReputationCertificate = {
        ...cert,
        threshold: 95,
        publicInputs: ['95', cert.publicInputs[1], cert.publicInputs[2], cert.publicInputs[3]],
      };
      expect(await verifyPortableReputationCertificate(tamperedCert1, 75, testDomain)).toBe(false);

      // Attempt 2: Tamper with proof JSON
      const parsedProof = JSON.parse(cert.proof);
      parsedProof.pi_a.x = '123456789';
      const tamperedCert2: PortableReputationCertificate = {
        ...cert,
        proof: JSON.stringify(parsedProof),
      };
      expect(await verifyPortableReputationCertificate(tamperedCert2, 75, testDomain)).toBe(false);
    });
  });
});
