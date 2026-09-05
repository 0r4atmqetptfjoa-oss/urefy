import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestPost, onRequestGet, onRequestPatch, memoryReportsStore } from '../functions/api/report.js';

describe('DSA Notice & Takedown API (/api/report)', () => {
  beforeEach(() => {
    memoryReportsStore.length = 0;
  });

  it('should reject request with missing targetId', async () => {
    const req = new Request('https://aetheris-omni-sphere.pages.dev/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'CSAM' }),
    });

    const res = await onRequestPost({ request: req });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('targetId is required');
  });

  it('should reject request with missing reason', async () => {
    const req = new Request('https://aetheris-omni-sphere.pages.dev/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: 'post-123' }),
    });

    const res = await onRequestPost({ request: req });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('reason is required');
  });

  it('should successfully register a DSA report and store in queue', async () => {
    const req = new Request('https://aetheris-omni-sphere.pages.dev/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetId: 'post-malicious-456',
        targetType: 'post',
        reason: 'MALWARE_PHISHING',
        details: 'Post contains an obfuscated link redirecting to a credential harvesting site.',
        reporterEmail: 'contact@complainant.eu',
        reporterFingerprint: 'rep_fingerprint_abc',
      }),
    });

    const res = await onRequestPost({ request: req });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.reportId).toMatch(/^dsa_rep_/);
    expect(data.status).toBe('pending');
    expect(data.legalNotice).toContain('Regulamentul (UE) 2022/2065');
    expect(memoryReportsStore.length).toBe(1);
    expect(memoryReportsStore[0].targetId).toBe('post-malicious-456');
  });

  it('should reject GET /api/report without admin authentication', async () => {
    const req = new Request('https://aetheris-omni-sphere.pages.dev/api/report', {
      method: 'GET',
    });

    const res = await onRequestGet({ request: req, env: { ENVIRONMENT: 'production', ADMIN_PIN: 'secret' } as any });
    expect(res.status).toBe(401);
  });

  it('should allow GET /api/report with valid admin credentials', async () => {
    memoryReportsStore.push({
      id: 'dsa_rep_test_1',
      targetId: 'post-999',
      targetType: 'post',
      reason: 'TERRORISM',
      details: 'Test details',
      reporterFingerprint: 'anon',
      status: 'pending',
      createdAt: Date.now(),
    });

    const req = new Request('https://aetheris-omni-sphere.pages.dev/api/report', {
      method: 'GET',
      headers: {
        'X-Admin-PIN': 'secret_pin',
      },
    });

    const res = await onRequestGet({ request: req, env: { ENVIRONMENT: 'production', ADMIN_PIN: 'secret_pin' } as any });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.reports.length).toBeGreaterThanOrEqual(1);
  });

  it('should allow admin to update report status via PATCH', async () => {
    const reportId = 'dsa_rep_update_me';
    memoryReportsStore.push({
      id: reportId,
      targetId: 'post-100',
      targetType: 'post',
      reason: 'COPYRIGHT',
      details: 'Stolen article',
      reporterFingerprint: 'anon',
      status: 'pending',
      createdAt: Date.now(),
    });

    const req = new Request('https://aetheris-omni-sphere.pages.dev/api/report', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-PIN': 'secret_pin',
      },
      body: JSON.stringify({
        reportId,
        status: 'actioned',
        resolutionNotes: 'Post deleted and author warned.',
      }),
    });

    const res = await onRequestPatch({ request: req, env: { ENVIRONMENT: 'production', ADMIN_PIN: 'secret_pin' } as any });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe('actioned');
    expect(memoryReportsStore[0].status).toBe('actioned');
    expect(memoryReportsStore[0].resolutionNotes).toBe('Post deleted and author warned.');
  });
});
