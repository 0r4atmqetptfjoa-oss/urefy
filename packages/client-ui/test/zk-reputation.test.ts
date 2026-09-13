import { describe, it, expect, beforeEach } from 'vitest';
import { ZKReputationAggregator, REPUTATION_TIERS } from '../src/zk-reputation';

describe('ZKReputationAggregator � Anonymous Merit Proofs & Credentials', () => {
  let rep: ZKReputationAggregator;

  beforeEach(() => {
    rep = new ZKReputationAggregator();
  });

  it('should resolve correct reputation tier based on merit score', () => {
    expect(rep.getTierForScore(10).tier).toBe('CITIZEN');
    expect(rep.getTierForScore(75).tier).toBe('CONTRIBUTOR');
    expect(rep.getTierForScore(250).tier).toBe('SENTINEL');
    expect(rep.getTierForScore(600).tier).toBe('ARCHON');
    expect(rep.getTierForScore(1500).tier).toBe('GENESIS_GUARDIAN');
  });

  it('should create valid ZK reputation proof with nullifier and merkle root', () => {
    const proof = rep.createProof('node-test-12345', 350, 412);
    expect(proof.proofId).toBeDefined();
    expect(proof.tier).toBe('SENTINEL');
    expect(proof.minScoreThreshold).toBe(200);
    expect(proof.nullifierHash.startsWith('0x')).toBe(true);
    expect(proof.merkleRoot.startsWith('0x')).toBe(true);
    expect(rep.verifyProof(proof)).toBe(true);
  });

  it('should render colored reputation badge HTML', () => {
    const badge = rep.renderReputationBadge(250);
    expect(badge).toContain('🛡️ Sentinel');
    expect(badge).toContain('color: #22c55e');
  });

  it('should toggle reputation center modal state and render modal HTML', () => {
    expect(rep.isOpen).toBe(false);
    rep.open();
    expect(rep.isOpen).toBe(true);

    const html = rep.renderReputationCenterModal('node-alpha', 450);
    expect(html).toContain('Sovereign Identity Passport');
    expect(html).toContain('450 Merit');
    expect(html).toContain('btn-generate-zk-proof');
    expect(html).toContain('btn-close-reputation-modal');

    rep.close();
    expect(rep.isOpen).toBe(false);
  });
});
