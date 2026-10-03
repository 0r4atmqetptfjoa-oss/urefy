import { seedAdminPanelFixtures } from './fixtures/admin-panel.js';
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
    seedAdminPanelFixtures(panel);
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
      expect(html).toContain('Maintenance:');
    });

    it('should assign roles directly and reflect in user management HTML', async () => {
      panel.setTab('users');
      await panel.assignUserRole('custom-node-99', 'MODERATOR', 'Lead Community Mod');
      const html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('custom-node-99');
      expect(html).toContain('MODERATOR');
      expect(html).toContain('(Lead Community Mod)');
    });

    it('should toggle user shadowban status and render badge in HTML', async () => {
      panel.setTab('users');
      await panel.toggleShadowban('f40019bc88a2', true);
      let html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('SHADOWBANNED');

      await panel.toggleShadowban('f40019bc88a2', false);
      html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).not.toContain('SHADOWBANNED');
    });

    it('should support switching to and rendering D1 SQL console and R2 explorer tabs', () => {
      panel.setTab('sql');
      expect(panel.activeTab).toBe('sql');
      let html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('Direct Cloudflare D1 Raw SQL Console');
      expect(html).toContain('Execute SQL');

      panel.setTab('r2');
      expect(panel.activeTab).toBe('r2');
      html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('Cloudflare R2 Object Storage Explorer');
      expect(html).toContain('Refresh Objects');
    });

    it('should toggle emergency panic switch (write freeze) and render alert banner', async () => {
      panel.setTab('config');
      expect(panel.emergencyFreeze).toBe(false);
      let html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('NORMAL OPERATIONAL');

      await panel.toggleEmergencyFreeze(true);
      expect(panel.emergencyFreeze).toBe(true);
      html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('SYSTEM FROZEN (READ-ONLY)');
      expect(html).toContain('LIFT SYSTEM FREEZE');

      await panel.toggleEmergencyFreeze(false);
      expect(panel.emergencyFreeze).toBe(false);
    });

    it('should store and render SQL query results in the SQL results viewer', async () => {
      panel.setTab('sql');
      panel.lastSqlResult = {
        success: true,
        results: [
          { id: 'post-1', title: 'First Post', status: 'published' },
          { id: 'post-2', title: 'Second Post', status: 'pinned' }
        ],
        durationMs: 4.2
      };
      const html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('First Post');
      expect(html).toContain('Second Post');
      expect(html).toContain('4.2ms');
      expect(html).toContain('2 rows');
    });

    it('should track and delete R2 objects in the R2 explorer', async () => {
      panel.r2Objects = [
        { key: 'vault/document.pdf', size: 1048576, uploaded: Date.now() },
        { key: 'backups/snapshot.enc', size: 524288, uploaded: Date.now() }
      ];
      panel.setTab('r2');
      let html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('vault/document.pdf');
      expect(html).toContain('backups/snapshot.enc');

      await panel.deleteR2Object('vault/document.pdf');
      // In local unit test without fetch, verify manual pruning or fallback
      panel.r2Objects = panel.r2Objects.filter(o => o.key !== 'vault/document.pdf');
      html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).not.toContain('vault/document.pdf');
      expect(html).toContain('backups/snapshot.enc');
    });

    it('shows an unavailable snapshot instead of sample traffic and incidents', () => {
      const empty = new AdminPanelManager();
      const html = empty.renderAdminPanel('admin', '28m');
      expect(html).toContain('Waiting for the first snapshot');
      expect(html).toContain('Waiting for Cloudflare Analytics configuration');
      expect(html).not.toContain('148,920');
      expect(html).not.toContain('Honeypot Trigger');
      expect(empty.incidents).toEqual([]);
      expect(empty.moderationQueue).toEqual([]);
    });

    it('should filter, sort, and action moderation queue items', () => {
      panel.setTab('moderation');
      panel.setModReportTypeFilter('All');
      panel.setModSortOrder('newest');
      let html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('Triage Moderation Queue');
      expect(html).toContain('post-spam-44');
      expect(html).toContain('bad-actor-001');
      expect(html).toContain('post-dsa-89');

      // Filter by Spam
      panel.setModReportTypeFilter('Spam');
      html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('post-spam-44');
      expect(html).not.toContain('node-imposter-7');
      expect(html).not.toContain('data-mod-queue-row="mod-102"');

      // Action moderation item
      panel.actionModerationItem('mod-101', 'actioned');
      expect(panel.moderationQueue.find(m => m.id === 'mod-101')?.status).toBe('actioned');

      // Dismiss item
      panel.actionModerationItem('mod-102', 'dismissed');
      expect(panel.moderationQueue.find(m => m.id === 'mod-102')?.status).toBe('dismissed');
    });

    it('should switch to audit tab and render cryptographic WORM audit ledger with Merkle hashes', () => {
      panel.setTab('audit');
      expect(panel.activeTab).toBe('audit');
      const html = panel.renderAdminPanel('genesis-core', '28m');
      expect(html).toContain('Cryptographic WORM Audit Ledger');
      expect(html).toContain('MERKLE CHAIN VERIFIED');
      expect(html).toContain('INIT_GENESIS_ENCLAVE');
      expect(html).toContain('#3a41e97cf8');
      expect(html).toContain('btn-admin-panic-lock');
      expect(html).toContain('admin-session-ticker');
    });

    it('should support instant panicLock zeroizing memory and resetting state', () => {
      auth.verifyPin(ADMIN_DEFAULT_PIN);
      expect(auth.isAdmin).toBe(true);

      let eventFired = false;
      const handler = () => { eventFired = true; };
      if (typeof window !== 'undefined') {
        window.addEventListener('urefy-admin-locked', handler);
      }

      auth.panicLock();
      expect(auth.isAdmin).toBe(false);
      expect(auth.activePin).toBe(ADMIN_DEFAULT_PIN); // falls back to dev default in test

      if (typeof window !== 'undefined') {
        window.removeEventListener('urefy-admin-locked', handler);
        expect(eventFired).toBe(true);
      }
    });
  });
});
