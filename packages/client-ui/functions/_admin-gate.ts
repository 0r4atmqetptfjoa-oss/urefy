import { timingSafeEqual } from './api/admin.js';
import { isProductionEnv, type Env } from './api/_db.js';

export const STEALTH_GATEWAY_TOKEN = 'sovereign-mission-control-v1';
const SESSION_TTL_MS = 30 * 60 * 1000;
const CLOCK_SKEW_MS = 60 * 1000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function signSessionTimestamp(timestamp: number, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`urefy_adm:${timestamp}`));
  return toHex(mac);
}

async function createSignedAdminCookieValue(timestamp: number, secret: string): Promise<string> {
  const sig = await signSessionTimestamp(timestamp, secret);
  return `authorized_${timestamp}_${sig}`;
}

async function verifyAdminSessionCookie(sessionToken: string, secret: string, isProd: boolean): Promise<boolean> {
  const now = Date.now();

  if (sessionToken.startsWith('authorized_')) {
    const parts = sessionToken.split('_');
    const timestamp = parseInt(parts[1] || '', 10);
    if (isNaN(timestamp) || timestamp <= 0 || now - timestamp >= SESSION_TTL_MS || now < timestamp - CLOCK_SKEW_MS) {
      return false;
    }
    if (parts.length === 3 && parts[2].length === 64) {
      const expectedSig = await signSessionTimestamp(timestamp, secret);
      return timingSafeEqual(parts[2], expectedSig);
    }
    // Legacy unsigned fallback allowed strictly in non-production test environments
    return !isProd && parts.length === 2;
  }

  if (sessionToken.startsWith('aeth_adm_')) {
    const parts = sessionToken.split('_');
    if (parts.length === 5 && parts[0] === 'aeth' && parts[1] === 'adm') {
      const timestamp = parseInt(parts[2] || '', 10);
      if (isNaN(timestamp) || timestamp <= 0 || now - timestamp >= SESSION_TTL_MS || now < timestamp - CLOCK_SKEW_MS) {
        return false;
      }
      if (parts[4] && parts[4].length === 64) {
        const expectedSig = await signSessionTimestamp(timestamp, secret);
        return timingSafeEqual(parts[4], expectedSig);
      }
      return !isProd;
    }
  }

  return false;
}

export async function handleAdminGate(context: {
  request: Request;
  env?: Env;
  next: () => Promise<Response>;
}): Promise<Response> {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const isProd = isProductionEnv(env);

  if (!isProd && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    return await next();
  }

  const rawSecret = (env as any)?.ADMIN_GATEWAY_SECRET;
  const configuredSecret =
    typeof rawSecret === 'string' && rawSecret.trim().length > 0
      ? rawSecret.trim()
      : isProd
        ? ''
        : STEALTH_GATEWAY_TOKEN;

  const knock = url.searchParams.get('knock') || url.searchParams.get('gate');
  const hasValidKnock = Boolean(configuredSecret && knock && timingSafeEqual(knock, configuredSecret));

  const headerKnock = request.headers.get('X-Sovereign-Gate');
  const hasValidHeaderKnock = Boolean(
    configuredSecret && headerKnock && timingSafeEqual(headerKnock, configuredSecret)
  );

  const cookies = request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/urefy_adm_session=([^;]+)/);
  const sessionToken = sessionMatch ? sessionMatch[1].trim() : null;
  const signingSecret = configuredSecret || STEALTH_GATEWAY_TOKEN;

  const hasValidSession = sessionToken
    ? await verifyAdminSessionCookie(sessionToken, signingSecret, isProd)
    : false;

  if (hasValidKnock || hasValidHeaderKnock || hasValidSession) {
    const response = await next();
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    headers.set('Cache-Control', 'no-store, private');

    if (hasValidKnock || hasValidHeaderKnock) {
      const signedCookieValue = await createSignedAdminCookieValue(Date.now(), signingSecret);
      headers.append(
        'Set-Cookie',
        `urefy_adm_session=${signedCookieValue}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=1800`
      );
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const pathname = url.pathname.toLowerCase();
  const isProbe =
    pathname.includes('.php') ||
    pathname.includes('.env') ||
    pathname.includes('wp-') ||
    pathname.includes('actuator');
  if (isProbe) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>404 Not Found</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #090a0f; color: #94a3b8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; max-width: 480px; padding: 2rem; }
    h1 { font-size: 3.5rem; color: #f8fafc; margin: 0 0 1rem 0; font-weight: 800; letter-spacing: -0.05em; }
    p { font-size: 1rem; line-height: 1.6; margin: 0 0 1.5rem 0; color: #64748b; }
    a { color: #f59e0b; text-decoration: none; font-weight: 600; font-size: 0.875rem; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.5rem 1.25rem; border-radius: 0.75rem; display: inline-block; transition: all 0.2s; }
    a:hover { background: rgba(245, 158, 11, 0.1); border-color: #f59e0b; }
  </style>
</head>
<body>
  <div class="box">
    <h1>404</h1>
    <p>The requested resource does not exist on this server.</p>
    <a href="/">Return to Home</a>
  </div>
</body>
</html>`,
    {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, private',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  );
}
