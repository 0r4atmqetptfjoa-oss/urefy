import { timingSafeEqual } from './api/admin.js';
import { isProductionEnv, type Env } from './api/_db.js';

export const STEALTH_GATEWAY_TOKEN = 'sovereign-mission-control-v1';

export async function handleAdminGate(context: {
  request: Request;
  env?: Env;
  next: () => Promise<Response>;
}): Promise<Response> {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const isProd = isProductionEnv(env);

  // In local test / dev without production flag, allow direct access
  if (!isProd && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    return await next();
  }

  // Check 1: Knock query parameter (?knock=... or ?gate=...)
  const knock = url.searchParams.get('knock') || url.searchParams.get('gate');
  const configuredSecret = (env as any)?.ADMIN_GATEWAY_SECRET || STEALTH_GATEWAY_TOKEN;
  const hasValidKnock = knock ? timingSafeEqual(knock, configuredSecret) : false;

  // Check 2: Header knock (X-Sovereign-Gate)
  const headerKnock = request.headers.get('X-Sovereign-Gate');
  const hasValidHeaderKnock = headerKnock ? timingSafeEqual(headerKnock, configuredSecret) : false;

  // Check 3: Session cookie (urefy_adm_session)
  const cookies = request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/urefy_adm_session=([^;]+)/);
  const sessionToken = sessionMatch ? sessionMatch[1] : null;

  let hasValidSession = false;
  if (sessionToken) {
    if (sessionToken.startsWith('aeth_adm_')) {
      const parts = sessionToken.split('_');
      if (parts.length === 5 && parts[0] === 'aeth' && parts[1] === 'adm') {
        const timestamp = parseInt(parts[2], 10);
        const now = Date.now();
        if (!isNaN(timestamp) && timestamp > 0 && now - timestamp < 1800000 && now >= timestamp - 60000) {
          hasValidSession = true;
        }
      }
    } else if (sessionToken.startsWith('authorized_')) {
      const parts = sessionToken.split('_');
      const timestamp = parseInt(parts[1], 10);
      const now = Date.now();
      if (!isNaN(timestamp) && timestamp > 0 && now - timestamp < 1800000) {
        hasValidSession = true;
      }
    }
  }

  if (hasValidKnock || hasValidHeaderKnock || hasValidSession) {
    const response = await next();
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    headers.set('Cache-Control', 'no-store, private');
    if (hasValidKnock) {
      headers.append(
        'Set-Cookie',
        `urefy_adm_session=authorized_${Date.now()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=1800`
      );
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // Tarpit malicious crawlers probing with known exploit paths
  const pathname = url.pathname.toLowerCase();
  const isProbe = pathname.includes('.php') || pathname.includes('.env') || pathname.includes('wp-') || pathname.includes('actuator');
  if (isProbe) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Cloaking: Return generic 404 Not Found to prevent discovery
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
    a { color: #f59e0b; text-decoration: none; font-weight: 600; font-size: 0.875rem; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.5rem 1.25rem; rounded: 0.75rem; border-radius: 0.75rem; display: inline-block; transition: all 0.2s; }
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
