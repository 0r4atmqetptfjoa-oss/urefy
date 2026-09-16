import { describe, it, expect, beforeEach } from 'vitest';
import {
  onRequestGet as handleAdminGet,
  onRequestPost as handleAdminPost,
  onRequestDelete as handleAdminDelete,
  onRequestOptions as handleAdminOptions,
  DEFAULT_ADMIN_PIN,
  globalAdminUsersStore,
  globalBannedIPsStore,
  globalServerConfig,
  globalAdminLogsStore,
  resetAdminStores,
} from '../functions/api/admin.js';

describe('Admin Edge API Endpoint (/api/admin) Specification & Status Code Conformance', () => {
  beforeEach(() => {
    resetAdminStores();
  });

  describe('1. OPTIONS & CORS Preflight', () => {
    it('should return 204 No Content with CORS headers on OPTIONS', async () => {
      const res = await handleAdminOptions();
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET, POST, PUT, DELETE, OPTIONS');
    });
  });

  describe('2. Authentication & Authorization (401 vs 200)', () => {
    it('should return 401 Unauthorized on GET when no credentials provided', async () => {
      const req = new Request('https://urefy.com/api/admin');
      const res = await handleAdminGet({ request: req });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('UNAUTHORIZED');
      expect(res.headers.get('Content-Type')).toBe('application/json');
    });

    it('should return 200 OK on GET with valid Authorization Bearer PIN', async () => {
      const req = new Request('https://urefy.com/api/admin', {
        headers: { Authorization: `Bearer ${DEFAULT_ADMIN_PIN}` },
      });
      const res = await handleAdminGet({ request: req });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.stats).toBeDefined();
      expect(json.users).toBeDefined();
    });

    it('should return 401 Unauthorized on GET with X-Admin-Fingerprint header (backdoor removed)', async () => {
      const req = new Request('https://urefy.com/api/admin?tab=waf', {
        headers: { 'X-Admin-Fingerprint': 'genesis-core' },
      });
      const res = await handleAdminGet({ request: req });
      expect(res.status).toBe(401);
    });

    it('should verify PIN via POST action verify-pin (200 on success, 401 on wrong PIN)', async () => {
      // Wrong PIN
      const reqFail = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-pin', pin: '00000' }),
      });
      const resFail = await handleAdminPost({ request: reqFail });
      expect(resFail.status).toBe(401);
      const jsonFail = await resFail.json();
      expect(jsonFail.authorized).toBe(false);

      // Correct PIN
      const reqSuccess = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-pin', pin: DEFAULT_ADMIN_PIN }),
      });
      const resSuccess = await handleAdminPost({ request: reqSuccess });
      expect(resSuccess.status).toBe(200);
      const jsonSuccess = await resSuccess.json();
      expect(jsonSuccess.authorized).toBe(true);
      expect(jsonSuccess.token).toMatch(/^aeth_adm_\d+_[0-9a-fA-F]{32}_[0-9a-fA-F]{64}$/);
    });
  });

  describe('3. Rate Limiting on Brute-Force Authentication (429)', () => {
    it('should trigger 429 Too Many Requests after 5 consecutive failed PIN attempts', async () => {
      const clientIp = '198.51.100.42';
      for (let i = 0; i < 5; i++) {
        const req = new Request('https://urefy.com/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CF-Connecting-IP': clientIp,
          },
          body: JSON.stringify({ action: 'verify-pin', pin: `wrong-${i}` }),
        });
        const res = await handleAdminPost({ request: req });
        expect(res.status).toBe(401);
      }

      // 6th attempt must be 429
      const req6 = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': clientIp,
        },
        body: JSON.stringify({ action: 'verify-pin', pin: 'any-pin' }),
      });
      const res6 = await handleAdminPost({ request: req6 });
      expect(res6.status).toBe(429);
      const json6 = await res6.json();
      expect(json6.success).toBe(false);
      expect(json6.retryAfterSeconds).toBeGreaterThan(0);
      expect(res6.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('4. Administrative Mutations: Status Codes 200, 201, 400, 404', () => {
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEFAULT_ADMIN_PIN}`,
    };

    it('should return 400 Bad Request on malformed body or missing action', async () => {
      const req = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ notAction: 'xyz' }),
      });
      const res = await handleAdminPost({ request: req });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Missing mandatory action field');
    });

    it('should promote user role with 200 OK (and 404 if user missing)', async () => {
      globalAdminUsersStore.push({ fingerprint: 'f40019bc88a2', role: 'MEMBER', status: 'offline',
        isZKVerified: false, isQuarantined: false, joinedAt: Date.now(), messagesCount: 0, postsCount: 0 });
      // 404 case
      const req404 = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ action: 'promote-user', fingerprint: 'non-existent-user-999' }),
      });
      const res404 = await handleAdminPost({ request: req404 });
      expect(res404.status).toBe(404);

      // 200 case
      const req200 = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ action: 'promote-user', fingerprint: 'f40019bc88a2' }),
      });
      const res200 = await handleAdminPost({ request: req200 });
      expect(res200.status).toBe(200);
      const json200 = await res200.json();
      expect(json200.user.role).toBe('MODERATOR');
    });

    it('should toggle user quarantine with 200 OK (and 404 if missing)', async () => {
      const req = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ action: 'toggle-quarantine', fingerprint: '9b22a011cd44' }),
      });
      const res = await handleAdminPost({ request: req });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user.isQuarantined).toBe(true);
    });

    it('should ban IP with 201 Created and unban with 200 OK (404 if unbanning unknown IP)', async () => {
      // Ban IP -> 201 Created
      const banReq = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ action: 'ban-ip', ip: '203.0.113.88', reason: 'Bot spam' }),
      });
      const banRes = await handleAdminPost({ request: banReq });
      expect(banRes.status).toBe(201);
      const banJson = await banRes.json();
      expect(banJson.bannedIP.ip).toBe('203.0.113.88');

      // Unban IP -> 200 OK
      const unbanReq = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ action: 'unban-ip', ip: '203.0.113.88' }),
      });
      const unbanRes = await handleAdminPost({ request: unbanReq });
      expect(unbanRes.status).toBe(200);

      // Unban non-existent IP -> 404 Not Found
      const unban404Req = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ action: 'unban-ip', ip: '1.2.3.4' }),
      });
      const unban404Res = await handleAdminPost({ request: unban404Req });
      expect(unban404Res.status).toBe(404);
    });

    it('should update server config with 200 OK', async () => {
      const req = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          action: 'update-config',
          config: { maintenanceMode: true, powDifficulty: 5 },
        }),
      });
      const res = await handleAdminPost({ request: req });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.config.maintenanceMode).toBe(true);
      expect(json.config.powDifficulty).toBe(5);
    });

    it('should purge logs with 200 OK', async () => {
      const req = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ action: 'purge-logs' }),
      });
      const res = await handleAdminPost({ request: req });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('5. DELETE Requests (/api/admin) Specifications', () => {
    it('should delete banned IP via DELETE ?ip= with 200 OK or 404', async () => {
      // First ban
      await handleAdminPost({
        request: new Request('https://urefy.com/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEFAULT_ADMIN_PIN}` },
          body: JSON.stringify({ action: 'ban-ip', ip: '192.0.2.1' }),
        }),
      });

      // DELETE existing
      const delReq = new Request('https://urefy.com/api/admin?ip=192.0.2.1', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${DEFAULT_ADMIN_PIN}` },
      });
      const delRes = await handleAdminDelete({ request: delReq });
      expect(delRes.status).toBe(200);

      // DELETE non-existent -> 404
      const del404Req = new Request('https://urefy.com/api/admin?ip=192.0.2.1', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${DEFAULT_ADMIN_PIN}` },
      });
      const del404Res = await handleAdminDelete({ request: del404Req });
      expect(del404Res.status).toBe(404);
    });

    it('should return 400 if DELETE is invoked without target parameter', async () => {
      const delReq = new Request('https://urefy.com/api/admin', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${DEFAULT_ADMIN_PIN}` },
      });
      const delRes = await handleAdminDelete({ request: delReq });
      expect(delRes.status).toBe(400);
    });
  });
});
