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
import { i18n } from '../src/i18n.js';

describe('Milestones 1–5: Onboarding, Navigation, Empty States & Performance Verification', () => {
  beforeEach(() => {
    clientStore.activeChannelId = 'pulse-global';
    i18n.setLanguage('ro');
  });

  describe('Milestone 1 — Onboarding & Plain Language', () => {
    it('1. Welcome banner contains plain-language user benefits and zero forced jargon', () => {
      sovereignOnboarding.reset();
      const html = sovereignOnboarding.renderWelcomeBanner();

      expect(html).toContain('Your messages cannot be read by anyone else');
      expect(html).toContain('your files remain strictly yours');
      expect(html).toContain('1. Confidential Messages');
      expect(html).toContain('2. Secure Storage');
      expect(html).toContain('3. Automatic Protection');
      expect(html).toContain('How does it work?');
      expect(html).toContain('btn-onboarding-how-it-works');
      expect(html).toContain('btn-dismiss-onboarding-tour');
    });

    it('2. Technical specifications are available via collapsible panel for power users', () => {
      sovereignOnboarding.reset();
      const html = sovereignOnboarding.renderWelcomeBanner();

      expect(html).toContain('id="onboarding-tech-specs"');
      expect(html).toContain('TreeKEM MLS Chat');
      expect(html).toContain('Merkle Vault');
      expect(html).toContain('Active WAF &amp; Zero-Trust');
    });
  });

  describe('Milestone 2 — Navigation Labels', () => {
    it('3. Mobile tab bar has clear descriptive titles and functional labels', () => {
      const html = mobileTabBar.renderTabBarHTML();

      expect(html).toContain('Feed');
      expect(html).toContain('Vault');
      expect(html).toContain('Relays');
      expect(html).toContain('Profile');
      expect(html).toContain('Feed (Pulse Stream)');
      expect(html).toContain('Relay Servers & Chat Channels');
    });
  });

  describe('Milestone 3 — Visual Empty States', () => {
    it('4. renderPulseEmptyState provides title, explanation, and action button', () => {
      const html = renderPulseEmptyState();

      expect(html).toContain('empty-state-pulse');
      expect(html).toContain('btn-empty-pulse-composer');
      expect(html).toContain('data-empty-action="pulse"');
      // i18n text (RO set in beforeEach)
      expect(html).toContain('Feed-ul este liniștit');
    });

    it('5. renderVaultFilesEmptyState provides title, explanation, and upload action', () => {
      const html = renderVaultFilesEmptyState();

      expect(html).toContain('empty-state-vault-files');
      expect(html).toContain('btn-empty-vault-upload');
      expect(html).toContain('data-empty-action="vault-files"');
      // i18n text (RO set in beforeEach)
      expect(html).toContain('Vault-ul tău este gol');
    });

    it('6. renderVaultReleasesEmptyState provides audited release guidance and action', () => {
      const html = renderVaultReleasesEmptyState();

      expect(html).toContain('empty-state-vault-releases');
      expect(html).toContain('btn-empty-vault-release');
      expect(html).toContain('data-empty-action="vault-releases"');
      // i18n text (RO set in beforeEach)
      expect(html).toContain('Nicio versiune auditată');
    });

    it('7. renderRelaysEmptyState provides clear empty channel guidance and chat action', () => {
      const html = renderRelaysEmptyState();

      expect(html).toContain('empty-state-relays');
      expect(html).toContain('btn-empty-relays-chat');
      expect(html).toContain('btn-empty-add-relay');
      // i18n text (RO set in beforeEach)
      expect(html).toContain('Trimite primul mesaj');
    });
  });

  describe('Milestone 4 — Chromatic Consistency in Navigation', () => {
    it('8. Active tabs use unified accent classes', () => {
      mobileTabBar.setTab('feed');
      const html = mobileTabBar.renderTabBarHTML();

      expect(html).toContain('is-active');
      expect(html).toContain('font-bold scale-105 is-active text-[var(--color-accent,#e59b3c)]');
      expect(html).toContain('bg-[var(--color-accent,#e59b3c)]');
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
