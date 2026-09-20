import { describe, it, expect } from 'vitest';
import { handleAdminGate, STEALTH_GATEWAY_TOKEN } from '../functions/_admin-gate.js';

describe('Admin Perimeter Stealth Cloaking & Decoy 404 Gate', () => {
  const dummyNext = async () => new Response('<html>Admin Console</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });

  it('should return decoy 404 to unauthenticated public visitors in production environment', async () => {
    const request = new Request('https://urefy.com/admin', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const env = { CF_PAGES_BRANCH: 'main' } as any;

    const response = await handleAdminGate({ request, env, next: dummyNext });
    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toContain('404');
    expect(body).toContain('The requested resource does not exist on this server');
    expect(body).not.toContain('Admin Console');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('should allow access and set session cookie when valid knock parameter is provided', async () => {
    const request = new Request(`https://urefy.com/admin?knock=${STEALTH_GATEWAY_TOKEN}`, {
      headers: { 'User-Agent': 'Admin-Client' },
    });
    const env = { CF_PAGES_BRANCH: 'main' } as any;

    const response = await handleAdminGate({ request, env, next: dummyNext });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('Admin Console');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive');
    expect(response.headers.get('Set-Cookie')).toContain('urefy_adm_session=authorized_');
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
    expect(response.headers.get('Set-Cookie')).toContain('SameSite=Strict');
  });

  it('should allow access when valid X-Sovereign-Gate header is provided', async () => {
    const request = new Request('https://urefy.com/admin', {
      headers: {
        'User-Agent': 'Admin-Client',
        'X-Sovereign-Gate': STEALTH_GATEWAY_TOKEN,
      },
    });
    const env = { CF_PAGES_BRANCH: 'main' } as any;

    const response = await handleAdminGate({ request, env, next: dummyNext });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('Admin Console');
  });

  it('should allow access when valid session cookie is provided', async () => {
    const recentTimestamp = Date.now() - 60000;
    const request = new Request('https://urefy.com/admin', {
      headers: {
        Cookie: `urefy_adm_session=authorized_${recentTimestamp}`,
      },
    });
    const env = { CF_PAGES_BRANCH: 'main' } as any;

    const response = await handleAdminGate({ request, env, next: dummyNext });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('Admin Console');
  });

  it('should reject expired session cookies and return decoy 404', async () => {
    const expiredTimestamp = Date.now() - 3600000; // 1 hour ago (max-age is 30m)
    const request = new Request('https://urefy.com/admin', {
      headers: {
        Cookie: `urefy_adm_session=authorized_${expiredTimestamp}`,
      },
    });
    const env = { CF_PAGES_BRANCH: 'main' } as any;

    const response = await handleAdminGate({ request, env, next: dummyNext });
    expect(response.status).toBe(404);
  });

  it('should allow localhost / dev direct access when not in production environment', async () => {
    const request = new Request('http://localhost:3000/admin');
    const env = {} as any; // not prod

    const response = await handleAdminGate({ request, env, next: dummyNext });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('Admin Console');
  });
});
