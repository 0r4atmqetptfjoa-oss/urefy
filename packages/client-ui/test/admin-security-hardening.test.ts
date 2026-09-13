import { describe, it, expect, beforeEach } from 'vitest';
import {
  onRequestGet as handleAdminGet,
  onRequestPost as handleAdminPost,
  onRequestDelete as handleAdminDelete,
  onRequestOptions as handleAdminOptions,
  createAdminSessionToken,
  verifyAdminSessionToken,
  verifyAdminAuthorization,
  DEFAULT_ADMIN_PIN,
  resetAdminStores,
  isIpLockedOut,
} from '../functions/api/admin.js';
import {
  onRequestGet as handlePushGet,
  onRequestPost as handlePushPost,
  SOVEREIGN_VAPID_PUBLIC_KEY,
} from '../functions/api/push.js';
import {
  getCorsHeaders,
  isPermittedOrigin,
  isSensitiveRoute,
} from '../functions/api/_middleware.js';

describe('UREfy Admin Security Hardening & Zero-Trust Authentication Suite', () => {
  beforeEach(() => {
    resetAdminStores();
  });

  describe('1. Elimination of Magic Bypass Tokens & Headers (HTTP 401 Rejection)', () => {
    const magicTokens = ['genesis-core', 'genesis-token', 'admin-session-active', 'admin-genesis'];

    for (const token of magicTokens) {
      it(`should reject Authorization: Bearer "${token}" with 401 Unauthorized`, async () => {
        const req = new Request('https://urefy.com/api/admin', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const res = await handleAdminGet({ request: req });
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.code).toBe('UNAUTHORIZED');
      });

      it(`should reject ?token=${token} in query parameters with 401 Unauthorized`, async () => {
        const req = new Request(`https://urefy.com/api/admin?token=${token}`);
        const res = await handleAdminGet({ request: req });
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.success).toBe(false);
      });

      it(`should reject X-Admin-PIN: "${token}" with 401 Unauthorized`, async () => {
        const req = new Request('https://urefy.com/api/admin', {
          headers: { 'X-Admin-PIN': token },
        });
        const res = await handleAdminGet({ request: req });
        expect(res.status).toBe(401);
      });
    }

    it('should reject X-Admin-Fingerprint header as an authorization bypass', async () => {
      const req = new Request('https://urefy.com/api/admin', {
        headers: { 'X-Admin-Fingerprint': 'genesis-core' },
      });
      const res = await handleAdminGet({ request: req });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('UNAUTHORIZED');
    });
  });

  describe('2. Cryptographically Secure HMAC-SHA256 Session Tokens', () => {
    const testPin = '987654321';

    it('generates session token with structure: aeth_adm_${timestamp}_${hex_nonce}_${signature}', async () => {
      const token = await createAdminSessionToken(testPin);
      expect(typeof token).toBe('string');
      expect(token).toMatch(/^aeth_adm_\d+_[0-9a-fA-F]{32}_[0-9a-fA-F]{64}$/);

      const parts = token.split('_');
      expect(parts[0]).toBe('aeth');
      expect(parts[1]).toBe('adm');
      const timestamp = parseInt(parts[2], 10);
      expect(Date.now() - timestamp).toBeLessThan(1000);
      expect(parts[3].length).toBe(32); // 16 bytes in hex
      expect(parts[4].length).toBe(64); // SHA-256 HMAC in hex
    });

    it('successfully verifies a freshly generated session token with correct PIN', async () => {
      const token = await createAdminSessionToken(testPin);
      const isValid = await verifyAdminSessionToken(token, testPin);
      expect(isValid).toBe(true);
    });

    it('rejects verification if an incorrect PIN is provided', async () => {
      const token = await createAdminSessionToken(testPin);
      const isValid = await verifyAdminSessionToken(token, 'wrong-pin-000');
      expect(isValid).toBe(false);
    });

    it('rejects verification if token timestamp exceeds sliding TTL (expiration)', async () => {
      const token = await createAdminSessionToken(testPin);
      // Verify with zero TTL -> immediately expired
      const isValidZeroTtl = await verifyAdminSessionToken(token, testPin, 0);
      expect(isValidZeroTtl).toBe(false);

      // Verify with standard TTL -> valid
      const isValidStandard = await verifyAdminSessionToken(token, testPin, 1800000);
      expect(isValidStandard).toBe(true);
    });

    it('rejects tampered or malformed tokens', async () => {
      const validToken = await createAdminSessionToken(testPin);
      const tamperedSig = validToken.substring(0, validToken.length - 4) + '0000';
      const isTamperedValid = await verifyAdminSessionToken(tamperedSig, testPin);
      expect(isTamperedValid).toBe(false);

      expect(await verifyAdminSessionToken('not-a-token', testPin)).toBe(false);
      expect(await verifyAdminSessionToken('aeth_adm_invalid', testPin)).toBe(false);
      expect(await verifyAdminSessionToken('', testPin)).toBe(false);
    });

    it('authorizes requests with valid HMAC session token in Authorization Bearer', async () => {
      const sessionToken = await createAdminSessionToken(DEFAULT_ADMIN_PIN);
      const req = new Request('https://urefy.com/api/admin', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const res = await handleAdminGet({ request: req });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.stats).toBeDefined();
    });

    it('rejects requests with HMAC session token in ?token= query parameter (Finding 12)', async () => {
      const sessionToken = await createAdminSessionToken(DEFAULT_ADMIN_PIN);
      const req = new Request(`https://urefy.com/api/admin?token=${sessionToken}`);
      const res = await handleAdminGet({ request: req });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe('3. Brute-Force Rate Limiting & 10-Minute Lockout', () => {
    it('locks out IP address after 5 consecutive failed PIN attempts with HTTP 429', async () => {
      const testIp = '198.51.100.77';

      // First 5 failed attempts return 401 Unauthorized
      for (let i = 0; i < 5; i++) {
        const req = new Request('https://urefy.com/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CF-Connecting-IP': testIp,
          },
          body: JSON.stringify({ action: 'verify-pin', pin: `invalid-guess-${i}` }),
        });
        const res = await handleAdminPost({ request: req });
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.authorized).toBe(false);
      }

      // Check lockout status helper
      const lockoutState = isIpLockedOut(testIp);
      expect(lockoutState.locked).toBe(true);
      expect(lockoutState.retryAfter).toBeGreaterThan(0);

      // 6th attempt must return HTTP 429 Too Many Requests with required error message
      const req6 = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': testIp,
        },
        body: JSON.stringify({ action: 'verify-pin', pin: DEFAULT_ADMIN_PIN }),
      });
      const res6 = await handleAdminPost({ request: req6 });
      expect(res6.status).toBe(429);
      const json6 = await res6.json();
      expect(json6.success).toBe(false);
      expect(json6.error).toBe('Too many failed login attempts. Locked out for 10 minutes.');
      expect(res6.headers.get('Retry-After')).toBeDefined();

      // Subsequent GET requests from the locked IP are also rejected with 429
      const getReq = new Request('https://urefy.com/api/admin', {
        headers: {
          'CF-Connecting-IP': testIp,
          Authorization: `Bearer ${DEFAULT_ADMIN_PIN}`,
        },
      });
      const getRes = await handleAdminGet({ request: getReq });
      expect(getRes.status).toBe(429);
      const getJson = await getRes.json();
      expect(getJson.error).toBe('Too many failed login attempts. Locked out for 10 minutes.');
    });

    it('clears failed attempts on successful authentication', async () => {
      const testIp = '198.51.100.88';

      // 2 failed attempts
      for (let i = 0; i < 2; i++) {
        await handleAdminPost({
          request: new Request('https://urefy.com/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': testIp },
            body: JSON.stringify({ action: 'verify-pin', pin: 'wrong' }),
          }),
        });
      }

      // Successful attempt
      const successRes = await handleAdminPost({
        request: new Request('https://urefy.com/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': testIp },
          body: JSON.stringify({ action: 'verify-pin', pin: DEFAULT_ADMIN_PIN }),
        }),
      });
      expect(successRes.status).toBe(200);

      // Lockout state should be clear
      expect(isIpLockedOut(testIp).locked).toBe(false);
    });
  });

  describe('4. Strict Production Configuration Requirements (HTTP 503)', () => {
    it('returns HTTP 503 when ADMIN_PIN is missing in a production environment', async () => {
      const prodEnv = { ENVIRONMENT: 'production' };
      const req = new Request('https://urefy.com/api/admin');

      // GET
      const getRes = await handleAdminGet({ request: req, env: prodEnv });
      expect(getRes.status).toBe(503);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(false);
      expect(getJson.error).toBe('ADMIN_PIN not configured in environment variables.');

      // POST verify-pin
      const postReq = new Request('https://urefy.com/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-pin', pin: '12345' }),
      });
      const postRes = await handleAdminPost({ request: postReq, env: prodEnv });
      expect(postRes.status).toBe(503);
      const postJson = await postRes.json();
      expect(postJson.error).toBe('ADMIN_PIN not configured in environment variables.');

      // DELETE
      const delReq = new Request('https://urefy.com/api/admin?ip=1.2.3.4', {
        method: 'DELETE',
      });
      const delRes = await handleAdminDelete({ request: delReq, env: prodEnv });
      expect(delRes.status).toBe(503);
    });

    it('permits access in production when ADMIN_PIN is properly configured', async () => {
      const prodEnv = { ENVIRONMENT: 'production', ADMIN_PIN: 'super-secure-production-pin' };
      const req = new Request('https://urefy.com/api/admin', {
        headers: { Authorization: `Bearer super-secure-production-pin` },
      });
      const res = await handleAdminGet({ request: req, env: prodEnv });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('5. CORS Hardening on Sensitive Routes', () => {
    it('identifies sensitive routes (/api/admin, /api/storage, /api/push, /api/cron-backup)', () => {
      expect(isSensitiveRoute('/api/admin')).toBe(true);
      expect(isSensitiveRoute('/api/storage')).toBe(true);
      expect(isSensitiveRoute('/api/push')).toBe(true);
      expect(isSensitiveRoute('/api/cron-backup')).toBe(true);
      expect(isSensitiveRoute('/api/channels')).toBe(false);
      expect(isSensitiveRoute('/api/messages')).toBe(false);
    });

    it('does NOT emit Access-Control-Allow-Origin: * on sensitive routes', () => {
      const req = new Request('https://urefy.com/api/admin');
      const cors = getCorsHeaders(req);
      expect(cors['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('emits exact matched origin with Allow-Credentials: true for permitted origins', () => {
      const permittedOrigin = 'https://urefy.com';
      const req = new Request('https://urefy.com/api/admin', {
        headers: { Origin: permittedOrigin },
      });
      const cors = getCorsHeaders(req);
      expect(cors['Access-Control-Allow-Origin']).toBe(permittedOrigin);
      expect(cors['Access-Control-Allow-Credentials']).toBe('true');
      expect(cors['Vary']).toBe('Origin');
    });

    it('validates permitted origins correctly (localhost, .pages.dev, sovereign domain)', () => {
      const publicUrl = new URL('https://urefy.com/api/channels');
      expect(isPermittedOrigin('http://localhost:3000', publicUrl)).toBe(true);
      expect(isPermittedOrigin('http://127.0.0.1:5173', publicUrl)).toBe(true);
      expect(isPermittedOrigin('https://preview.pages.dev', publicUrl)).toBe(true);
      expect(isPermittedOrigin('https://urefy.com', publicUrl)).toBe(true);
      expect(isPermittedOrigin('https://malicious-attacker.com', publicUrl)).toBe(false);
      expect(isPermittedOrigin('https://attacker.pages.dev', publicUrl, { ENVIRONMENT: 'production' })).toBe(false);
      expect(isPermittedOrigin('https://aetheris-omni-sphere.pages.dev', publicUrl, { ENVIRONMENT: 'production' })).toBe(true);

      // On sensitive routes, arbitrary .pages.dev is strictly rejected
      const sensitiveUrl = new URL('https://urefy.com/api/admin');
      expect(isPermittedOrigin('https://urefy.com', sensitiveUrl, { ENVIRONMENT: 'production' })).toBe(true);
      expect(isPermittedOrigin('https://www.urefy.com', sensitiveUrl, { ENVIRONMENT: 'production' })).toBe(true);
      expect(isPermittedOrigin('https://preview.pages.dev', sensitiveUrl)).toBe(false);
      expect(isPermittedOrigin('https://attacker.pages.dev', sensitiveUrl)).toBe(false);
    });
  });

  describe('6. Dynamic VAPID Key Configuration & 503 Guard', () => {
    it('returns HTTP 503 on GET /api/push?action=vapid-public-key when missing VAPID keys', async () => {
      const req = new Request('https://urefy.com/api/push?action=vapid-public-key');
      const res = await handlePushGet({ request: req, env: {} });
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('VAPID keys not configured in environment.');
    });

    it('returns HTTP 503 on POST /api/push action=broadcast when missing VAPID keys', async () => {
      const req = new Request('https://urefy.com/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'broadcast', title: 'System Alert' }),
      });
      const res = await handlePushPost({ request: req, env: {} });
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('VAPID keys not configured in environment.');
    });
  });
});
