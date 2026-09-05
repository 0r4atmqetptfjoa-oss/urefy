import { describe, it, expect, beforeEach } from 'vitest';
import { legalFooter } from '../src/footer.js';
import { legalModal } from '../src/legal-modal.js';
import { i18n } from '../src/i18n.js';

describe('EU Legal & Regulatory Footer Suite', () => {
  beforeEach(() => {
    i18n.setLanguage('ro');
  });
  it('should render the multi-column global legal footer with all mandatory EU sections', () => {
    const html = legalFooter.renderGlobalLegalFooter();
    expect(html).toContain('aetheris-global-footer');
    expect(html).toContain('AETHERIS OMNI-SPHERE');
    // EU DSA Art. 14 / Terms
    expect(html).toContain('Terms & Conditions of Use');
    expect(html).toContain('terms');
    // GDPR
    expect(html).toContain('Privacy & GDPR (EU 2016/679)');
    expect(html).toContain('privacy');
    // Rules / Content Moderation DSA Art. 14
    expect(html).toContain('Community Rules & Moderation (Art. 14 DSA)');
    expect(html).toContain('rules');
    // Notice & Takedown DSA Art. 16
    expect(html).toContain('Report Illegal Content (Art. 16 DSA)');
    expect(html).toContain('dsa');
    // Point of Contact DSA Art. 11/12
    expect(html).toContain('Single Points of Contact (Art. 11/12)');
    expect(html).toContain('contact');
    // Zero-Tracker / Certificates
    expect(html).toContain('Zero Tracking Cookies');
    expect(html).toContain('legal@aetheris.network');
  });

  it('should render the compact sidebar snippet for aside rail', () => {
    const html = legalFooter.renderSidebarLegalSnippet();
    expect(html).toContain('sidebar-legal-snippet');
    // i18n RO (set in beforeEach)
    expect(html).toContain('Despre noi');
    expect(html).toContain('Termeni');
    expect(html).toContain('Confidențialitate');
    expect(html).toContain('Regulament');
    // DSA report — roDict has 'Raportare DSA'
    expect(html).toContain('Raport');
    expect(html).toContain('Contact');
    expect(html).toContain('0 Trackers');
  });

  it('should render the status bar legal snippet with quick triggers', () => {
    const html = legalFooter.renderStatusBarLegalSnippet();
    expect(html).toContain('Termeni');
    expect(html).toContain('GDPR');
    expect(html).toContain('Raport');
  });

  it('should render the complete bottom status bar with centered legal links and no empty void', () => {
    const html = legalFooter.renderBottomStatusBar();
    expect(html).toContain('app-bottom-bar');
    expect(html).toContain('Despre noi');
    expect(html).toContain('Termeni');
    // 'Politică de Confidențialitate (GDPR)' contains 'Confidențialitate'
    expect(html).toContain('Confidențialitate');
    expect(html).toContain('Regulament');
    // 'Raportare DSA' or 'Raportează conținut' — both contain 'Raport'
    expect(html).toContain('Raport');
    expect(html).toContain('Contact');
    expect(html).toContain('EU DSA Compliant');
    expect(html).toContain('0 Trackers');
  });

  it('should support all 6 legal tabs in legalModal', () => {
    // 1. About
    legalModal.open('about');
    expect(legalModal.isOpen).toBe(true);
    expect(legalModal.activeTab).toBe('about');
    let content = legalModal.render();
    expect(content).toContain('What is Aetheris Omni-Sphere?');
    expect(content).toContain('Non-Custodial Architecture');

    // 2. Terms
    legalModal.setTab('terms');
    expect(legalModal.activeTab).toBe('terms');
    content = legalModal.render();
    expect(content).toContain('Terms of Service');
    expect(content).toContain('ZK-RLN Slashing');

    // 3. Privacy
    legalModal.setTab('privacy');
    expect(legalModal.activeTab).toBe('privacy');
    content = legalModal.render();
    expect(content).toContain('GDPR Compliance Statement');
    expect(content).toContain('Zero-Data Principle');

    // 4. Rules
    legalModal.setTab('rules');
    expect(legalModal.activeTab).toBe('rules');
    content = legalModal.render();
    expect(content).toContain('Moderation & Transparency Policy under Art. 14 DSA');
    expect(content).toContain('Zero tolerance for CSAM');

    // 5. DSA Notice & Action
    legalModal.setTab('dsa');
    expect(legalModal.activeTab).toBe('dsa');
    content = legalModal.render();
    expect(content).toContain('Official Illegal Content Notification Form');
    expect(content).toContain('Notice and Takedown Procedure (DSA Art. 16)');

    // 6. Contact & SPOC
    legalModal.setTab('contact');
    expect(legalModal.activeTab).toBe('contact');
    content = legalModal.render();
    expect(content).toContain('Single Points of Contact');
    expect(content).toContain('legal@aetheris.network');
    expect(content).toContain('love4jpx@gmail.com');

    legalModal.close();
    expect(legalModal.isOpen).toBe(false);
  });
});
