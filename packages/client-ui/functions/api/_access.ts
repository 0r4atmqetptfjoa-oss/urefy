import type { Env } from './_db.js';

/**
 * Cloudflare Access JWT verification.
 *
 * Access sits in front of /admin.html and /api/admin on the canonical domain.
 * The edge adds a signed `Cf-Access-Jwt-Assertion` header after the email
 * one-time-password flow. We verify that assertion locally instead of trusting
 * a bare header, so a request that reaches the Pages origin directly (for
 * example through the pages.dev hostname) cannot forge admin access.
 */

interface AccessJwtPayload {
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nbf?: number;
  iss?: string;
  email?: string;
  sub?: string;
}

interface AccessJwk extends JsonWebKey {
  kid?: string;
}

interface JwksCacheEntry {
  keys: AccessJwk[];
  fetchedAt: number;
}

const JWKS_TTL_MS = 60 * 60 * 1000;
const CLOCK_SKEW_SECONDS = 60;
const jwksCache = new Map<string, JwksCacheEntry>();

function normalizeTeamDomain(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  if (!value || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) return null;
  return value;
}

function parseAudiences(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseAllowedEmails(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeJsonPart<T>(part: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part))) as T;
  } catch {
    return null;
  }
}

async function fetchJwks(teamDomain: string, forceRefresh = false): Promise<AccessJwk[]> {
  const cached = jwksCache.get(teamDomain);
  const now = Date.now();
  if (!forceRefresh && cached && now - cached.fetchedAt < JWKS_TTL_MS) {
    return cached.keys;
  }

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Cloudflare Access JWKS request failed with ${response.status}`);
  }
  const data = (await response.json()) as { keys?: AccessJwk[] };
  if (!Array.isArray(data.keys) || data.keys.length === 0) {
    throw new Error('Cloudflare Access JWKS response did not contain signing keys');
  }
  jwksCache.set(teamDomain, { keys: data.keys, fetchedAt: now });
  return data.keys;
}

async function verifySignature(
  tokenParts: string[],
  keys: AccessJwk[]
): Promise<boolean> {
  const signatureBytes = base64UrlToBytes(tokenParts[2]);
  const signature = new Uint8Array(signatureBytes.length);
  signature.set(signatureBytes);
  const signedData = new TextEncoder().encode(`${tokenParts[0]}.${tokenParts[1]}`);

  for (const jwk of keys) {
    if (jwk.kty !== 'RSA') continue;
    try {
      const key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      );
      const valid = await crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        key,
        signature,
        signedData
      );
      if (valid) return true;
    } catch {
      // Try the next key. A malformed or rotated key must not fail the whole set.
    }
  }
  return false;
}

export async function verifyAccessJwt(request: Request, env?: Env): Promise<boolean> {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  const assertion =
    request.headers.get('Cf-Access-Jwt-Assertion') ||
    (cookieMatch ? cookieMatch[1].trim() : null);
  if (!assertion) return false;

  const teamDomain = normalizeTeamDomain(env?.ACCESS_TEAM_DOMAIN);
  const audiences = parseAudiences(env?.ACCESS_AUD);
  if (!teamDomain || audiences.length === 0) return false;

  const tokenParts = assertion.split('.');
  if (tokenParts.length !== 3) return false;

  const header = decodeJsonPart<{ alg?: string; kid?: string }>(tokenParts[0]);
  const payload = decodeJsonPart<AccessJwtPayload>(tokenParts[1]);
  if (!header || !payload) return false;
  if (header.alg !== 'RS256') return false;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now - CLOCK_SKEW_SECONDS) {
    return false;
  }
  if (
    typeof payload.nbf === 'number' &&
    payload.nbf > now + CLOCK_SKEW_SECONDS
  ) {
    return false;
  }
  if (
    typeof payload.iat === 'number' &&
    payload.iat > now + CLOCK_SKEW_SECONDS
  ) {
    return false;
  }

  const expectedIssuer = `https://${teamDomain}`;
  if (
    typeof payload.iss !== 'string' ||
    payload.iss.replace(/\/+$/, '').toLowerCase() !== expectedIssuer
  ) {
    return false;
  }

  const jwtAudiences = Array.isArray(payload.aud)
    ? payload.aud
    : typeof payload.aud === 'string'
      ? [payload.aud]
      : [];
  if (!audiences.some((audience) => jwtAudiences.includes(audience))) {
    return false;
  }

  const allowedEmails = parseAllowedEmails(env?.ACCESS_ALLOWED_EMAILS);
  if (allowedEmails.length > 0) {
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    if (!email || !allowedEmails.includes(email)) return false;
  }

  let keys = await fetchJwks(teamDomain).catch(() => []);
  if (header.kid) {
    keys = keys.filter((key) => key.kid === header.kid);
    if (keys.length === 0) {
      keys = await fetchJwks(teamDomain, true).catch(() => []);
      keys = keys.filter((key) => key.kid === header.kid);
    }
  }
  if (keys.length === 0) return false;

  return verifySignature(tokenParts, keys);
}

export function resetAccessJwksCacheForTests(): void {
  jwksCache.clear();
}
