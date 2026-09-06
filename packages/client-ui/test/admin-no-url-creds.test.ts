import { describe, it, expect, beforeEach } from 'vitest';
import {
  onRequestGet as handleAdminGet,
  onRequestPost as handleAdminPost,
  onRequestOptions as handleAdminOptions,
  createAdminSessionToken,
  resetAdminStores,
} from '../functions/api/admin.js';

describe('Admin Security Hardening - No URL Credentials (Finding 12)', () => {
  const PIN = 'SecretAdmin123!';
  const env = {
    ADMIN_PIN: PIN,
    ENVIRONMENT: 'production',
  };

  beforeEach(() => {
    resetAdminStores();
  });

  describe('Strict Query Parameter Prohibition', () => {
    it('strictly rejects GET /api/admin?pin=... with HTTP 401 even with correct PIN', async () => {
      const req = new Request(`https://aetheris.pages.dev/api/admin?pin=${encodeURIComponent(PIN)}`, {
        method: 'GET',
        headers: {
          Origin: 'https://aetheris.pages.dev',
        },
      });

      const res = await handleAdminGet({ request: req, env } as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/credentials in url query parameters are strictly forbidden/i);
    });

    it('strictly rejects GET /api/admin?token=... with HTTP 401 even with valid session token', async () => {
      const validToken = await createAdminSessionToken(PIN);
      const req = new Request(`https://aetheris.pages.dev/api/admin?token=${encodeURIComponent(validToken)}`, {
        method: 'GET',
        headers: {
          Origin: 'https://aetheris.pages.dev',
        },
      });

      const res = await handleAdminGet({ request: req, env } as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/credentials in url query parameters are strictly forbidden/i);
    });

    it('strictly rejects POST /api/admin?pin=... with HTTP 401', async () => {
      const req = new Request(`https://aetheris.pages.dev/api/admin?action=status&pin=${encodeURIComponent(PIN)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://aetheris.pages.dev',
        },
        body: JSON.stringify({ action: 'status' }),
      });

      const res = await handleAdminPost({ request: req, env } as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/credentials in url query parameters are strictly forbidden/i);
    });

    it('strictly rejects POST /api/admin?token=... with HTTP 401', async () => {
      const validToken = await createAdminSessionToken(PIN);
      const req = new Request(`https://aetheris.pages.dev/api/admin?action=status&token=${encodeURIComponent(validToken)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://aetheris.pages.dev',
        },
        body: JSON.stringify({ action: 'status' }),
      });

      const res = await handleAdminPost({ request: req, env } as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/credentials in url query parameters are strictly forbidden/i);
    });
  });

  describe('Legitimate Header-Based Authentication', () => {
    it('authenticates successfully via X-Admin-PIN header', async () => {
      const req = new Request('https://aetheris.pages.dev/api/admin', {
        method: 'GET',
        headers: {
          Origin: 'https://aetheris.pages.dev',
          'X-Admin-PIN': PIN,
        },
      });

      const res = await handleAdminGet({ request: req, env } as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.stats).toBeDefined();
    });

    it('authenticates successfully via Authorization: Bearer <token> header', async () => {
      const validToken = await createAdminSessionToken(PIN);
      const req = new Request('https://aetheris.pages.dev/api/admin', {
        method: 'GET',
        headers: {
          Origin: 'https://aetheris.pages.dev',
          Authorization: `Bearer ${validToken}`,
        },
      });

      const res = await handleAdminGet({ request: req, env } as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.stats).toBeDefined();
    });

    it('authenticates successfully via POST verify-pin with PIN in body', async () => {
      const req = new Request('https://aetheris.pages.dev/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://aetheris.pages.dev',
        },
        body: JSON.stringify({ action: 'verify-pin', pin: PIN }),
      });

      const res = await handleAdminPost({ request: req, env } as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.authorized).toBe(true);
      expect(json.token).toBeDefined();
    });
  });

  describe('CORS Enforcement on Admin Route', () => {
    it('rejects CORS preflight from arbitrary *.pages.dev subdomain', async () => {
      const req = new Request('https://aetheris.pages.dev/api/admin', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://evil-admin.pages.dev',
          'Access-Control-Request-Method': 'POST',
        },
      });

      const res = await handleAdminOptions({ request: req, env } as any);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('allows CORS preflight from exact canonical production origin', async () => {
      const req = new Request('https://aetheris.pages.dev/api/admin', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://aetheris.pages.dev',
          'Access-Control-Request-Method': 'POST',
        },
      });

      const res = await handleAdminOptions({ request: req, env } as any);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://aetheris.pages.dev');
    });
  });
});
