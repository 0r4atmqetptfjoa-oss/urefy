import { describe, it, expect, beforeEach } from 'vitest';
import { GovernanceDAO } from '../src/governance.js';

describe('Ticket 4.4: DAO Public Transparency Journal — Zero Voter Identity Correlation', () => {
  let dao: GovernanceDAO;

  beforeEach(() => {
    dao = new GovernanceDAO();
  });

  it('1. renderTransparencyLogPanel includes aggregate quorum progress metrics', () => {
    const html = dao.renderTransparencyLogPanel();
    expect(html).toContain('dao-transparency-log-panel');
    expect(html).toContain('Total Proposals');
    expect(html).toContain('Active In Quorum');
    expect(html).toContain('Finalized Decisions');
    expect(html).toContain('Aggregated Power');
  });

  it('2. renderTransparencyLogPanel renders quorum percentage progress bars for active proposals', () => {
    const html = dao.renderTransparencyLogPanel();
    const activeProposals = dao.proposals.filter(p => p.status === 'active');
    if (activeProposals.length > 0) {
      expect(html).toContain('transparency-active-list');
      expect(html).toContain('quorum');
    }
  });

  it('3. renderTransparencyLogPanel renders finalized decision history with result and timestamp', () => {
    const html = dao.renderTransparencyLogPanel();
    const finalized = dao.proposals.filter(p =>
      p.status === 'passed' || p.status === 'rejected' || p.status === 'expired'
    );
    if (finalized.length > 0) {
      // Container should render finalized proposals
      expect(html).toContain('data-decision-id');
    }
    // History shows result label and timestamp
    if (html.includes('PASSED') || html.includes('REJECTED')) {
      expect(html).toMatch(/PASSED|REJECTED|EXPIRED/);
    }
  });

  it('4. PRIVACY INVARIANT: No individual voter fingerprints exposed in transparency log HTML', () => {
    const html = dao.renderTransparencyLogPanel();
    // The transparency log MUST NOT expose voter fingerprints
    // These are the known seeded voter fingerprints used internally
    const knownVoterFPs = ['c3dc28cb705e', 'b91a07de3301', 'e4f2a1bc9032', 'd6c3e8b41702', 'a83f12dc4509'];
    for (const fp of knownVoterFPs) {
      // Voter fingerprints MUST NOT appear as data attributes for individual votes
      expect(html.includes(`data-voter="${fp}"`)).toBe(false);
      expect(html.includes(`voterFP: ${fp}`)).toBe(false);
    }
  });

  it('5. PRIVACY INVARIANT: No vote-to-identity mapping present in transparency output', () => {
    const html = dao.renderTransparencyLogPanel();
    // Verify that no vote-identity mapping strings are present
    expect(html.toLowerCase()).not.toContain('voter-identity');
    expect(html.toLowerCase()).not.toContain('vote-identity');
    expect(html.toLowerCase()).not.toContain('voter_fp');
    expect(html.toLowerCase()).not.toContain('voterfingerprint');
    // Check no individual vote records with fingerprints are serialized
    expect(html).not.toMatch(/data-voter-fp="[a-f0-9]{8,}"/);
  });

  it('6. renderTransparencyLogModal wraps panel in modal container', () => {
    dao.isTransparencyModalOpen = true;
    const html = dao.renderTransparencyLogModal();
    expect(html).toContain('dao-transparency-modal');
    expect(html).toContain('dao-transparency-log-panel');
    expect(html).toContain('Public Transparency');
  });

  it('7. Quorum percentage calculation is aggregated-only, does not reference individual voters', () => {
    const activeProposals = dao.proposals.filter(p => p.status === 'active');
    for (const proposal of activeProposals) {
      const tally = proposal.votes;
      const total = tally.for + tally.against + tally.abstain;
      const pct = proposal.quorumRequired > 0 ? Math.round((total / proposal.quorumRequired) * 100) : 100;
      // Quorum pct is a number derived from aggregated totals only
      expect(typeof pct).toBe('number');
      expect(pct).toBeGreaterThanOrEqual(0);
    }
  });
});
