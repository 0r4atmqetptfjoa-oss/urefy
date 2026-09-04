import { describe, it, expect, beforeEach } from 'vitest';
import { sovereignOnboarding } from '../src/first-time-onboarding.js';
import { mobileTabBar } from '../src/mobile-tab-bar.js';
import { 
  renderPulseEmptyState, 
  renderVaultFilesEmptyState, 
  renderVaultReleasesEmptyState, 
  renderRelaysEmptyState 
} from '../src/empty-states.js';
import { clientStore } from '../src/client-state.js';

describe('Milestones 1–5: Onboarding, Navigation, Empty States & Performance Verification', () => {
  beforeEach(() => {
    clientStore.activeChannelId = 'pulse-global';
  });

  describe('Milestone 1 — Onboarding & Plain Language', () => {
    it('1. Welcome banner contains plain-language user benefits and zero forced jargon', () => {
      sovereignOnboarding.reset();
      const html = sovereignOnboarding.renderWelcomeBanner();

      expect(html).toContain('Mesajele tale nu pot fi citite de nimeni altcineva');
      expect(html).toContain('fișierele tale rămân doar la tine');
      expect(html).toContain('1. Mesaje Confidențiale');
      expect(html).toContain('2. Fișiere în Siguranță');
      expect(html).toContain('3. Protecție Automată');
      expect(html).toContain('Cum funcționează?');
      expect(html).toContain('btn-onboarding-how-it-works');
      expect(html).toContain('btn-dismiss-onboarding-tour');
    });

    it('2. Technical specifications are available via collapsible panel for power users', () => {
      sovereignOnboarding.reset();
      const html = sovereignOnboarding.renderWelcomeBanner();

      expect(html).toContain('id="onboarding-tech-specs"');
      expect(html).toContain('TreeKEM MLS Chat');
      expect(html).toContain('Merkle Vault');
      expect(html).toContain('Active WAF & Zero-Trust');
    });
  });

  describe('Milestone 2 — Navigation Labels', () => {
    it('3. Mobile tab bar has clear descriptive titles and functional labels', () => {
      const html = mobileTabBar.renderTabBarHTML();

      expect(html).toContain('Feed');
      expect(html).toContain('Vault');
      expect(html).toContain('Servere');
      expect(html).toContain('Profil');
      expect(html).toContain('Feed (Flux Pulse)');
      expect(html).toContain('Servere & Canale Chat (Cerc)');
    });
  });

  describe('Milestone 3 — Visual Empty States', () => {
    it('4. renderPulseEmptyState provides title, explanation, and action button', () => {
      const html = renderPulseEmptyState();

      expect(html).toContain('empty-state-pulse');
      expect(html).toContain('Fluxul de publicații este liniștit');
      expect(html).toContain('btn-empty-pulse-composer');
      expect(html).toContain('Scrie prima publicație');
    });

    it('5. renderVaultFilesEmptyState provides title, explanation, and upload action', () => {
      const html = renderVaultFilesEmptyState();

      expect(html).toContain('empty-state-vault-files');
      expect(html).toContain('Seiful de fișiere este gol');
      expect(html).toContain('btn-empty-vault-upload');
      expect(html).toContain('Încarcă primul fișier în Seif');
    });

    it('6. renderVaultReleasesEmptyState provides audited release guidance and action', () => {
      const html = renderVaultReleasesEmptyState();

      expect(html).toContain('empty-state-vault-releases');
      expect(html).toContain('Fără release-uri auditate');
      expect(html).toContain('btn-empty-vault-release');
      expect(html).toContain('Publică un nou Release auditat');
    });

    it('7. renderRelaysEmptyState provides clear empty channel guidance and chat action', () => {
      const html = renderRelaysEmptyState();

      expect(html).toContain('empty-state-relays');
      expect(html).toContain('btn-empty-relays-chat');
      expect(html).toContain('Trimite primul mesaj în canal');
      expect(html).toContain('btn-empty-add-relay');
    });
  });

  describe('Milestone 4 — Chromatic Consistency in Navigation', () => {
    it('8. Active tabs use unified cyan accent classes', () => {
      mobileTabBar.setTab('feed');
      const html = mobileTabBar.renderTabBarHTML();

      expect(html).toContain('is-active');
      expect(html).toContain('text-cyan-400 font-bold scale-105 is-active');
      expect(html).toContain('bg-cyan-400');
    });
  });

  describe('Milestone 5 — Performance on Long Scrolling Feeds', () => {
    it('9. Empty states and cards avoid backdrop-blur on repetitive scroll elements', () => {
      const pulseHtml = renderPulseEmptyState();
      const vaultHtml = renderVaultFilesEmptyState();
      const releasesHtml = renderVaultReleasesEmptyState();
      const relaysHtml = renderRelaysEmptyState();

      expect(pulseHtml).toContain('backdrop-blur-none');
      expect(vaultHtml).toContain('backdrop-blur-none');
      expect(releasesHtml).toContain('backdrop-blur-none');
      expect(relaysHtml).toContain('backdrop-blur-none');
    });
  });
});
