import './helpers/disable-demo.js';
import { describe, it, expect, beforeEach } from 'vitest';
import { CyberDefenseHub } from '../src/cyber-defense-hub.js';
import { SovereignOnboardingTour } from '../src/first-time-onboarding.js';
import { setSimulationMode } from '../src/simulation-mode.js';

describe('UREfy Cyber Defense Hub & First-Time Onboarding', () => {
  describe('CyberDefenseHub', () => {
    let hub: CyberDefenseHub;

    beforeEach(() => {
      setSimulationMode(false);
      hub = new CyberDefenseHub();
    });

    it('initializes with default strict security parameters and zero synthetic metrics when simulation is off', () => {
      const metrics = hub.getMetrics();
      expect(metrics.isStrictMode).toBe(true);
      expect(metrics.powDifficulty).toBe(3);
      expect(metrics.totalAttacksMitigated).toBe(0);
      expect(metrics.recentThreats.length).toBe(0);
    });

    it('populates synthetic threat metrics when simulation mode is explicitly enabled', () => {
      setSimulationMode(true);
      const simHub = new CyberDefenseHub();
      const metrics = simHub.getMetrics();
      expect(metrics.totalAttacksMitigated).toBeGreaterThan(0);
      expect(metrics.recentThreats.length).toBeGreaterThan(0);
      setSimulationMode(false);
    });

    it('opens, closes, and toggles modal visibility state', () => {
      expect(hub.isOpen).toBe(false);
      hub.open();
      expect(hub.isOpen).toBe(true);
      hub.close();
      expect(hub.isOpen).toBe(false);
      hub.toggleModal();
      expect(hub.isOpen).toBe(true);
    });

    it('simulates DDoS attack burst and records mitigation log', () => {
      const prevMitigated = hub.getMetrics().totalAttacksMitigated;
      const log = hub.simulateDDoSAttack();

      expect(log.type).toBe('DDOS_FLOOD');
      expect(log.severity).toBe('CRITICAL');
      expect(log.mitigation).toContain('PoW Challenge');
      expect(hub.getMetrics().totalAttacksMitigated).toBe(prevMitigated + 1);
    });

    it('simulates XSS injection attack and catches malicious tags', () => {
      const log = hub.simulateXSSAttack();
      expect(log.type).toBe('XSS_INJECTION');
      expect(log.severity).toBe('HIGH');
      expect(log.mitigation).toContain('AST Payload Sanitizer');
    });

    it('simulates Nonce Replay attack and rejects duplicate token', () => {
      const log = hub.simulateReplayAttack();
      expect(log.type).toBe('REPLAY_ATTACK');
      expect(log.severity).toBe('MEDIUM');
      expect(log.mitigation).toContain('NonceReplayGuard');
    });

    it('simulates Honeypot decoy probe and triggers automatic quarantine', () => {
      const log = hub.simulateHoneypotProbe();
      expect(log.type).toBe('HONEYPOT_PROBE');
      expect(log.severity).toBe('CRITICAL');
      expect(log.mitigation).toContain('24-Hour IP Quarantine');
    });

    it('renders cyber defense button with WAF ACTIVE badge', () => {
      const html = hub.renderDefenseButton();
      expect(html).toContain('Cyber Defense');
      expect(html).toContain('WAF ACTIVE');
      expect(html).toContain('btn-open-defense-hub');
    });

    it('renders complete Cyber Defense Center modal with all 4 simulation buttons', () => {
      const modalHtml = hub.renderDefenseCenterModal();
      expect(modalHtml).toContain('Enterprise Cyber Defense & WAF Center');
      expect(modalHtml).toContain('sim-btn-ddos');
      expect(modalHtml).toContain('sim-btn-xss');
      expect(modalHtml).toContain('sim-btn-replay');
      expect(modalHtml).toContain('sim-btn-honeypot');
    });
  });

  describe('SovereignOnboardingTour', () => {
    let tour: SovereignOnboardingTour;

    beforeEach(() => {
      tour = new SovereignOnboardingTour();
      tour.reset();
    });

    it('shows welcome banner by default for new visitors', () => {
      expect(tour.shouldShow()).toBe(true);
      const html = tour.renderWelcomeBanner();
      expect(html).toContain('Welcome to UREfy');
      expect(html).toContain('btn-dismiss-onboarding-tour');
    });

    it('dismisses banner and hides it from rendering once acknowledged', () => {
      tour.dismiss();
      expect(tour.shouldShow()).toBe(false);
      expect(tour.renderWelcomeBanner()).toBe('');
    });
  });
});
(globalThis as any).__UREFY_DEMO_MODE__ = false;
