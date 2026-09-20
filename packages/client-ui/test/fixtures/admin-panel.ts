import type { AdminPanelManager } from "../../src/admin-panel.js";

// Explicit test fixtures; never shipped as live administration data.
export function seedAdminPanelFixtures(panel: AdminPanelManager): void {
  (panel as any).users = [
    { fingerprint: 'genesis-core', role: 'GUARDIAN', status: 'online', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 30, messagesCount: 892, postsCount: 47 },
    { fingerprint: 'c3dc28cb705e', role: 'ARCHIVIST', status: 'online', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 20, messagesCount: 341, postsCount: 23 },
    { fingerprint: 'a89104fa2211', role: 'MODERATOR', status: 'idle', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 15, messagesCount: 156, postsCount: 8 },
    { fingerprint: 'f40019bc88a2', role: 'MEMBER', status: 'idle', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 7, messagesCount: 42, postsCount: 2 },
    { fingerprint: '9b22a011cd44', role: 'MEMBER', status: 'dnd', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 3, messagesCount: 17, postsCount: 0 },
    { fingerprint: 'bad-actor-001', role: 'MEMBER', status: 'offline', isZKVerified: false, isQuarantined: true, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 2, messagesCount: 3, postsCount: 0 },
  ];
  (panel as any).channels = [
    { id: 'relays-general', name: '# general', space: 'relays', isEncrypted: true, isArchived: false, membersCount: 12, messagesCount: 2847, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30 },
    { id: 'relays-dev', name: '# dev-core', space: 'relays', isEncrypted: true, isArchived: false, membersCount: 8, messagesCount: 1204, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 25 },
    { id: 'vault-releases', name: 'c/clean-releases', space: 'vault', isEncrypted: false, isArchived: false, membersCount: 12, messagesCount: 0, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30 },
    { id: 'vault-guides', name: 'c/security-guides', space: 'vault', isEncrypted: false, isArchived: false, membersCount: 12, messagesCount: 0, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20 },
    { id: 'pulse-global', name: '⚡ global-pulse', space: 'pulse', isEncrypted: false, isArchived: false, membersCount: 12, messagesCount: 0, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 28 },
  ];
  (panel as any).bannedIPs = [
    { ip: '185.220.101.5', reason: 'Honeypot Probe: /.env scanner', bannedAt: Date.now() - 60000, expiresAt: Date.now() + 1000 * 60 * 60 * 23 },
    { ip: '45.154.255.89', reason: 'XSS Injection Attempt', bannedAt: Date.now() - 120000, expiresAt: Date.now() + 1000 * 60 * 60 * 22 },
    { ip: '194.26.29.112', reason: 'DDoS Flood (500 req/sec)', bannedAt: Date.now() - 240000, expiresAt: Date.now() + 1000 * 60 * 60 * 21 },
  ];
  (panel as any).adminLogs = [
    { id: 'log-1', action: 'ROLE_CHANGED', targetId: 'a89104fa2211', adminFingerprint: 'genesis-core', timestamp: Date.now() - 300000 },
    { id: 'log-2', action: 'IP_BANNED', targetId: '185.220.101.5', adminFingerprint: 'genesis-core', timestamp: Date.now() - 120000 },
    { id: 'log-3', action: 'POST_DELETED', targetId: 'post-spam-44', adminFingerprint: 'genesis-core', timestamp: Date.now() - 60000 },
  ];
  (panel as any).auditLedger = [
    {
      id: 'audit-001',
      previous_entry_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      current_entry_hash: '3a41e97cf86a7d5b128549303c7343e5e6f6630f9a2e6371c19b486968c92a6b',
      timestamp: Date.now() - 3600000,
      admin_credential_id: 'cred-sovereign-genesis',
      action: 'INIT_GENESIS_ENCLAVE',
      target_resource: 'system/enclave',
      client_ip: '127.0.0.1',
      client_country: 'RO',
      payload_digest: 'd41d8cd98f00b204e9800998ecf8427e',
    },
  ];
  (panel as any).incidents = [
    {
      id: 'inc-001',
      timestamp: Date.now() - 1000 * 60 * 2,
      severity: 'CRITICAL',
      title: 'Honeypot Trigger: Path Traversal Probe',
      description: 'Suspicious scanner probed /.env and /.git/config. Source IP automatically blocked by edge WAF.',
      target: '/.env',
      sourceIp: '185.220.101.5',
      status: 'mitigated',
    },
    {
      id: 'inc-002',
      timestamp: Date.now() - 1000 * 60 * 7,
      severity: 'CRITICAL',
      title: 'Stored XSS Injection Defended',
      description: 'Malicious payload stripped from post input. RLN nullifier slashed and quarantine applied.',
      target: 'post-submit',
      sourceIp: '45.154.255.89',
      status: 'resolved',
    },
    {
      id: 'inc-003',
      timestamp: Date.now() - 1000 * 60 * 18,
      severity: 'WARNING',
      title: 'Edge Rate Limit Exceeded',
      description: 'Rate threshold exceeded: 240 req/min on /api/posts. 429 Too Many Requests returned.',
      target: '/api/posts',
      sourceIp: '194.26.29.112',
      status: 'mitigated',
    },
    {
      id: 'inc-004',
      timestamp: Date.now() - 1000 * 60 * 45,
      severity: 'WARNING',
      title: 'Passkey Auth Lockout (3 Failed Tries)',
      description: 'Repeated biometric challenge mismatch for admin endpoint. Temporary 15m cooling lock applied.',
      target: 'admin-gate',
      status: 'active',
    },
    {
      id: 'inc-005',
      timestamp: Date.now() - 1000 * 60 * 70,
      severity: 'INFO',
      title: 'Automated D1 Snapshot Created',
      description: 'Scheduled backup snapshot created in R2 bucket (snapshot-2026-09-13.sqlite). Size: 8.4 MB.',
      target: 'D1/R2 Backup',
      status: 'resolved',
    },
    {
      id: 'inc-006',
      timestamp: Date.now() - 1000 * 60 * 110,
      severity: 'INFO',
      title: 'Quarantine Status Updated',
      description: 'User bad-actor-001 flagged for review due to repeated spam report threshold.',
      target: 'bad-actor-001',
      status: 'resolved',
    },
  ];
  (panel as any).moderationQueue = [
    {
      id: 'mod-101',
      reportType: 'Spam',
      targetType: 'post',
      targetId: 'post-spam-44',
      reportedBy: 'f40019bc88a2',
      reason: 'Repetitive commercial crypto pump link in comments',
      timestamp: Date.now() - 1000 * 60 * 12,
      status: 'pending',
    },
    {
      id: 'mod-102',
      reportType: 'Harassment',
      targetType: 'user',
      targetId: 'bad-actor-001',
      reportedBy: 'c3dc28cb705e',
      reason: 'Targeted derogatory harassment across multiple threads',
      timestamp: Date.now() - 1000 * 60 * 35,
      status: 'pending',
    },
    {
      id: 'mod-103',
      reportType: 'DSA Notice',
      targetType: 'post',
      targetId: 'post-dsa-89',
      reportedBy: 'dsa-portal@bundesnetzagentur.de',
      reason: 'Article 16 Illegal Content notice: Copyright infringement',
      timestamp: Date.now() - 1000 * 60 * 65,
      status: 'pending',
    },
    {
      id: 'mod-104',
      reportType: 'Impersonation',
      targetType: 'user',
      targetId: 'node-imposter-7',
      reportedBy: 'genesis-core',
      reason: 'Impersonating official relay operator handle',
      timestamp: Date.now() - 1000 * 60 * 120,
      status: 'pending',
    },
    {
      id: 'mod-105',
      reportType: 'Spam',
      targetType: 'comment',
      targetId: 'comment-bot-91',
      reportedBy: 'a89104fa2211',
      reason: 'Automated phishing link injection',
      timestamp: Date.now() - 1000 * 60 * 180,
      status: 'actioned',
    },
  ];
}
