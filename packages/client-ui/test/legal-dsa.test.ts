import { describe, it, expect, beforeEach } from 'vitest';
import { LegalModal, legalModal } from '../src/legal-modal.js';
import { pulseActionsEngine } from '../src/pulse-actions.js';

describe('Legal & DSA Compliance Suite', () => {
  let modal: LegalModal;

  beforeEach(() => {
    modal = new LegalModal();
  });

  it('should initialize closed', () => {
    expect(modal.isOpen).toBe(false);
    expect(modal.isOpenModal()).toBe(false);
    expect(modal.render()).toBe('');
  });

  it('should open to Terms tab by default and render content', () => {
    modal.open('terms');
    expect(modal.isOpen).toBe(true);
    expect(modal.getActiveTab()).toBe('terms');
    const html = modal.render();
    expect(html).toContain('Termeni și Condiții');
    expect(html).toContain('ZK-RLN Slashing');
  });

  it('should switch to Privacy tab and render GDPR compliance content', () => {
    modal.open('privacy');
    expect(modal.isOpen).toBe(true);
    expect(modal.getActiveTab()).toBe('privacy');
    const html = modal.render();
    expect(html).toContain('Confidențialitate (GDPR)');
    expect(html).toContain('Principiul Zero-Data');
    expect(html).toContain('ML-KEM-768');
  });

  it('should switch to DSA tab and render Notice & Takedown form', () => {
    modal.open('dsa');
    expect(modal.isOpen).toBe(true);
    expect(modal.getActiveTab()).toBe('dsa');
    const html = modal.render();
    expect(html).toContain('Notice & Takedown (DSA)');
    expect(html).toContain('Procedura de Notificare și Eliminare (DSA Art. 16)');
    expect(html).toContain('legal@aetheris.network');
  });

  it('should close cleanly', () => {
    modal.open('dsa');
    expect(modal.isOpen).toBe(true);
    modal.close();
    expect(modal.isOpen).toBe(false);
    expect(modal.render()).toBe('');
  });

  it('should record post report in pulseActionsEngine', () => {
    const reportRes = pulseActionsEngine.reportPost('test-post-123', 'illegal-content');
    expect(reportRes.success).toBe(true);
    expect(reportRes.postId).toBe('test-post-123');
    expect(reportRes.reportedAt).toBeGreaterThan(0);
  });

  it('should render DSA report button in pulse action bar', () => {
    const actionBarHtml = pulseActionsEngine.renderPulseActionBar('post-abc-456');
    expect(actionBarHtml).toContain('btn-pulse-report');
    expect(actionBarHtml).toContain('data-pulse-action="report"');
    expect(actionBarHtml).toContain('DSA Notice & Takedown');
  });
});
