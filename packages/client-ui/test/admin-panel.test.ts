import { describe, it, expect, beforeEach } from 'vitest';
import { adminAuth, AdminAuthManager, ADMIN_DEFAULT_PIN, clearAdminStorage } from '../src/admin-auth.js';
import { adminPanel, AdminPanelManager } from '../src/admin-panel.js';

describe('Admin Authentication & Control Panel Architecture', () => {
  let auth: AdminAuthManager;
  let panel: AdminPanelManager;

  beforeEach(() => {
    clearAdminStorage();
    auth = new AdminAuthManager();
    panel = new AdminPanelManager();
  });

  describe('1. Admin Authentication & Cryptographic Fingerprint Binding', () => {
    it('should bind the first identity as sovereign admin fingerprint', () => {
      auth.bindFirstAdmin('sovereign-genesis-fp');
      expect(auth.adminFingerprintId).toBe('sovereign-genesis-fp');
    });

    it('should not be authenticated by default', () => {
      expect(auth.isAdmin).toBe(false);
    });

    it('should authenticate with default PIN', () => {
      const ok = auth.verifyPin(ADMIN_DEFAULT_PIN);
      expect(ok).toBe(true);
      expect(auth.isAdmin).toBe(true);
      expect(auth.pinError).toBe('');
    });

    it('should reject invalid PIN and set error message', () => {
      const ok = auth.verifyPin('wrong-pin');
      expect(ok).toBe(false);
      expect(auth.isAdmin).toBe(false);
      expect(auth.pinError).toContain('Access denied');
    });

    it('should allow changing admin PIN when current PIN matches', () => {
      const changed = auth.changePin(ADMIN_DEFAULT_PIN, '99887');
      expect(changed).toBe(true);
      expect(auth.verifyPin('99887')).toBe(true);
    });

    it('should log out and reset admin session', () => {
      auth.verifyPin(ADMIN_DEFAULT_PIN);
      expect(auth.isAdmin).toBe(true);
      auth.logout();
      expect(auth.isAdmin).toBe(false);
    });
  });

  describe('2. Admin Control Panel Actions & Moderation', () => {
    it('should open and switch tabs including new admin subsystems', () => {
      panel.open();
      expect(panel.isOpen).toBe(true);
      panel.setTab('users');
      expect(panel.activeTab).toBe('users');
      panel.setTab('waf');
      expect(panel.activeTab).toBe('waf');
      panel.setTab('cve');
      expect(panel.activeTab).toBe('cve');
      panel.setTab('gossip');
      expect(panel.activeTab).toBe('gossip');
      panel.setTab('observatory');
      expect(panel.activeTab).toBe('observatory');
      panel.setTab('wot');
      expect(panel.activeTab).toBe('wot');
      panel.close();
      expect(panel.isOpen).toBe(false);
    });

    it('should promote user roles along the hierarchy', () => {
      panel.setTab('users');
      panel.promoteUser('f40019bc88a2'); // starts as MEMBER -> MODERATOR
      expect(panel.renderAdminPanel('genesis-core', '28m')).toContain('MODERATOR');
      panel.promoteUser('f40019bc88a2'); // MODERATOR -> ARCHIVIST
      expect(panel.renderAdminPanel('genesis-core', '28m')).toContain('ARCHIVIST');
    });

    it('should toggle user quarantine', () => {
      panel.setTab('users');
      panel.toggleQuarantine('9b22a011cd44');
      const html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('line-through text-slate-600">9b22a011cd44');
      panel.toggleQuarantine('9b22a011cd44');
      const htmlAfter = panel.renderAdminPanel('genesis-core', '28m');
      expect(htmlAfter).not.toContain('line-through text-slate-600">9b22a011cd44');
    });

    it('should ban and unban IPs in WAF defense ledger', () => {
      panel.banIP('10.0.0.99', 'Sybil Attack');
      panel.setTab('waf');
      const html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('10.0.0.99');
      expect(html).toContain('Sybil Attack');

      panel.unbanIP('10.0.0.99');
      const htmlAfter = panel.renderAdminPanel('genesis-core', '28m');
      expect(htmlAfter).not.toContain('10.0.0.99');
    });

    it('should toggle maintenance mode', () => {
      panel.toggleMaintenance();
      panel.setTab('dashboard');
      const html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('Maintenance Mode:');
    });
  });
});
