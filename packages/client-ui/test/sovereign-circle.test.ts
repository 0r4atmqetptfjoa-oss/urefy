import { describe, it, expect } from 'vitest';
import { SovereignCircleEngine, sovereignCircleEngine } from '../src/sovereign-circle.js';

describe('Sovereign Circles & Community Governance Engine', () => {
  it('should initialize default circles without fabricated membership metrics', () => {
    const engine = new SovereignCircleEngine();
    const circles = engine.getAllCircles();
    expect(circles.length).toBeGreaterThanOrEqual(4);

    const zkCircle = engine.getCircle('pulse-global');
    expect(zkCircle).toBeDefined();
    expect(zkCircle?.name).toBe('zeroknowledge');
    expect(zkCircle?.rules.length).toBeGreaterThanOrEqual(3);
    expect(zkCircle?.membersCount).toBe(0);
    expect(zkCircle?.onlineCount).toBe(0);
    expect(zkCircle?.createdAt).toBe('');
  });

  it('should support toggling membership and expanding rule accordions', () => {
    const engine = new SovereignCircleEngine();
    const zkCircle = engine.getCircle('pulse-global')!;
    const initialMembers = zkCircle.membersCount;
    const initialJoined = zkCircle.isJoined;

    const newJoined = engine.toggleJoin(zkCircle.id);
    expect(newJoined).toBe(!initialJoined);
    expect(zkCircle.membersCount).toBe(Math.max(0, initialMembers + (newJoined ? 1 : -1)));

    // Rule expansion
    expect(engine.expandedRuleIndices.get(zkCircle.id)).toBeFalsy();
    engine.toggleRuleExpansion(zkCircle.id, 0);
    expect(engine.expandedRuleIndices.get(zkCircle.id)).toBe(0);
    engine.toggleRuleExpansion(zkCircle.id, 0);
    expect(engine.expandedRuleIndices.get(zkCircle.id)).toBeNull();
  });

  it('should support creating a new sovereign circle', () => {
    const engine = new SovereignCircleEngine();
    const newCircle = engine.createCircle({
      name: 'applied_zk_lab',
      displayName: 'Applied ZK Lab',
      description: 'Zero Knowledge prover circuits benchmark collective.',
      category: 'Cryptography & Security',
      primaryColor: '#6366f1',
      rules: [
        { title: 'Deterministic proofs only', description: 'No unverified arithmetic circuits.' }
      ]
    });

    expect(newCircle.name).toBe('applied_zk_lab');
    expect(newCircle.displayName).toBe('Applied ZK Lab');
    expect(newCircle.isCustom).toBe(true);

    const retrieved = engine.getCircle(`c/${newCircle.name}`);
    expect(retrieved).toBeDefined();
  });

  it('should render sidebar card and modal HTML correctly', () => {
    const engine = new SovereignCircleEngine();
    const sidebarHtml = engine.renderSidebarCircleCard('pulse-global');

    expect(sidebarHtml).toContain('c/zeroknowledge');
    expect(sidebarHtml).toContain('Circle Governance Rules');
    expect(sidebarHtml).toContain('btn-toggle-join-circle');
    expect(sidebarHtml).toContain('btn-open-create-circle-modal');

    engine.isCreateModalOpen = true;
    const modalHtml = engine.renderCreateCircleModal();
    expect(modalHtml).toContain('form-create-sovereign-circle');
    expect(modalHtml).toContain('Charter Sovereign Circle');
    expect(modalHtml).toContain('Governance Rules');
    expect(modalHtml).toContain('Community Type');
    expect(modalHtml).toContain('input-circle-type');
    expect(modalHtml).toContain('Restricted');
  });

  it('should support Reddit-style community types (public, restricted, private) and persist custom circles', () => {
    const engine = new SovereignCircleEngine();
    const created = engine.createCircle({
      name: 'solidity_hacks',
      displayName: 'Solidity Hacks & Exploits',
      description: 'Formal verification and EVM exploit analysis.',
      category: 'Smart Contracts & Web3',
      communityType: 'restricted',
      primaryColor: '#10b981',
      membersCount: 15,
      rules: [
        { title: 'Proof-of-Concept required', description: 'All vulnerability reports must include Foundry PoC.' }
      ]
    });

    expect(created.communityType).toBe('restricted');
    expect(created.isJoined).toBe(true);
    expect(created.isCustom).toBe(true);
    expect(created.channelId).toBe('pulse-solidity_hacks');

    // Verify it is in all circles and retrieved correctly
    const found = engine.getCircle(created.id);
    expect(found).toBeDefined();
    expect(found?.displayName).toBe('Solidity Hacks & Exploits');

    // Verify join toggle updates persistence and count
    const initialCount = created.membersCount;
    expect(initialCount).toBe(15);
    const isNowJoined = engine.toggleJoin(created.id);
    expect(isNowJoined).toBe(false);
    expect(created.membersCount).toBe(14);

    // Re-join
    const isRejoined = engine.toggleJoin(created.id);
    expect(isRejoined).toBe(true);
    expect(created.membersCount).toBe(15);
  });
});
