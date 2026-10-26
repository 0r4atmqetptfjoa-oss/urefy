import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetAccessJwksCacheForTests,
  verifyAccessJwt,
} from '../functions/api/_access.js';
import { handleAdminGate } from '../functions/_admin-gate.js';
import { onRequestGet, verifyAdminAuthorization } from '../functions/api/admin.js';

const TEAM_DOMAIN = 'urefy.cloudflareaccess.com';
const AUDIENCE = 'urefy-admin-test-audience';
const ALLOWED_EMAIL = 'razvan.ureche88@gmail.com';

let signingKey: CryptoKey;
let publicJwk: JsonWebKey & { kid: string };

function base64Url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createJwt(
  payloadOverrides: Record<string, unknown> = {},
  headerOverrides: Record<string, unknown> = {}
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: publicJwk.kid,
    ...headerOverrides,
  };
  const payload = {
    aud: AUDIENCE,
    iss: `https://${TEAM_DOMAIN}`,
    exp: now + 300,
    iat: now,
    nbf: now - 1,
    email: ALLOWED_EMAIL,
    sub: 'test-admin',
    ...payloadOverrides,
  };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    signingKey,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  return `${encodedHeader}.${encodedPayload}.${base64Url(new Uint8Array(signature))}`;
}

function accessEnv(overrides: Record<string, unknown> = {}): any {
  return {
    ENVIRONMENT: 'production',
    ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
    ACCESS_AUD: AUDIENCE,
    ACCESS_ALLOWED_EMAILS: ALLOWED_EMAIL,
    ...overrides,
  };
}

function accessRequest(token: string): Request {
  return new Request('https://urefy.com/admin.html', {
    headers: { 'Cf-Access-Jwt-Assertion': token },
  });
}

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );
  signingKey = pair.privateKey;
  const exported = await crypto.subtle.exportKey('jwk', pair.publicKey);
  publicJwk = { ...exported, kid: 'urefy-test-key', alg: 'RS256', use: 'sig' };
});

beforeEach(() => {
  resetAccessJwksCacheForTests();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === `https://${TEAM_DOMAIN}/cdn-cgi/access/certs`) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('not found', { status: 404 });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetAccessJwksCacheForTests();
});

describe('Cloudflare Access JWT verification', () => {
  it('accepts a correctly signed assertion for the configured audience and email', async () => {
    const token = await createJwt();
    await expect(verifyAccessJwt(accessRequest(token), accessEnv())).resolves.toBe(true);
  });

  it('accepts a valid assertion passed via CF_Authorization cookie', async () => {
    const token = await createJwt();
    const cookieReq = new Request('https://urefy.com/admin.html', {
      headers: { Cookie: `foo=bar; CF_Authorization=${token}; other=1` },
    });
    await expect(verifyAccessJwt(cookieReq, accessEnv())).resolves.toBe(true);
  });

  it('rejects a signed assertion for a different audience', async () => {
    const token = await createJwt({ aud: 'some-other-application' });
    await expect(verifyAccessJwt(accessRequest(token), accessEnv())).resolves.toBe(false);
  });

  it('rejects an expired assertion', async () => {
    const token = await createJwt({ exp: Math.floor(Date.now() / 1000) - 300 });
    await expect(verifyAccessJwt(accessRequest(token), accessEnv())).resolves.toBe(false);
  });

  it('rejects an assertion with a tampered signature', async () => {
    const token = await createJwt();
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -4)}AAAA`;
    await expect(verifyAccessJwt(accessRequest(tampered), accessEnv())).resolves.toBe(false);
  });

  it('rejects an assertion from a different issuer', async () => {
    const token = await createJwt({ iss: 'https://attacker.cloudflareaccess.com' });
    await expect(verifyAccessJwt(accessRequest(token), accessEnv())).resolves.toBe(false);
  });

  it('rejects an assertion for an email outside the allow-list', async () => {
    const token = await createJwt({ email: 'someone-else@example.com' });
    await expect(verifyAccessJwt(accessRequest(token), accessEnv())).resolves.toBe(false);
  });

  it('fails closed when Access is not configured', async () => {
    const token = await createJwt();
    await expect(
      verifyAccessJwt(accessRequest(token), { ENVIRONMENT: 'production' })
    ).resolves.toBe(false);
  });

  it('allows the admin gate with a valid Access assertion and no knock secret', async () => {
    const token = await createJwt();
    const response = await handleAdminGate({
      request: accessRequest(token),
      env: accessEnv(),
      next: async () =>
        new Response('<html>Admin Console</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('Admin Console');
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
  });

  it('does not let a forged Access header bypass the stealth 404', async () => {
    const forged = await createJwt({ aud: 'wrong-audience' });
    const response = await handleAdminGate({
      request: accessRequest(forged),
      env: accessEnv(),
      next: async () => new Response('<html>Admin Console</html>', { status: 200 }),
    });

    expect(response.status).toBe(404);
  });

  it('treats a valid Access assertion as sufficient admin API authorization', async () => {
    const token = await createJwt();
    const result = await verifyAdminAuthorization(accessRequest(token), accessEnv());
    expect(result.authorized).toBe(true);
    expect(result.reason).toBe('cloudflare-access');
  });

  it('still requires a configured PIN when no Access assertion is present', async () => {
    const result = await verifyAdminAuthorization(
      new Request('https://urefy.com/api/admin'),
      { ENVIRONMENT: 'production' }
    );
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(503);
  });

  it('returns authorized session token on GET /api/admin?action=whoami with Access assertion', async () => {
    const token = await createJwt();
    const whoamiReq = new Request('https://urefy.com/api/admin?action=whoami', {
      headers: { 'Cf-Access-Jwt-Assertion': token },
    });
    const response = await onRequestGet({ request: whoamiReq, env: accessEnv() });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.authorized).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(body.token).toMatch(/^aeth_adm_/);
  });
});
