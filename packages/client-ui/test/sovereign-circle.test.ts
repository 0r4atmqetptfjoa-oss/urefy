import { describe, it, expect } from 'vitest';
import { SovereignCircleEngine, sovereignCircleEngine } from '../src/sovereign-circle.js';

describe('Sovereign Circles & Community Governance Engine', () => {
  it('should initialize with default circles, rules, and member metrics', () => {
    const engine = new SovereignCircleEngine();
    const circles = engine.getAllCircles();
    expect(circles.length).toBeGreaterThanOrEqual(4);

    const zkCircle = engine.getCircle('pulse-global');
    expect(zkCircle).toBeDefined();
    expect(zkCircle?.name).toBe('zeroknowledge');
    expect(zkCircle?.rules.length).toBeGreaterThanOrEqual(3);
    expect(zkCircle?.membersCount).toBeGreaterThan(1000);
  });

  it('should support toggling membership and expanding rule accordions', () => {
    const engine = new SovereignCircleEngine();
    const zkCircle = engine.getCircle('pulse-global')!;
    const initialMembers = zkCircle.membersCount;
    const initialJoined = zkCircle.isJoined;

    const newJoined = engine.toggleJoin(zkCircle.id);
    expect(newJoined).toBe(!initialJoined);
    expect(zkCircle.membersCount).toBe(initialMembers + (newJoined ? 1 : -1));

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
  });
});
