// ===========================================================================
// UREfy — Cloudflare Pages Root Middleware (_middleware.ts)
// 1. Smart legacy route handling:
//    - URLs with modern equivalents -> HTTP 301 Permanent Redirect
//    - Obsolete legacy URLs without equivalent -> HTTP 410 Gone
//    - ZERO mass-redirects to homepage (protecting domain SEO health)
// 2. Enforces global security and anti-tampering headers
// ===========================================================================

import { resolveLegacyRoute } from './_seo.js';
import { seoError } from './_seo-response.js';

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
}

export async function onRequest(context: EventContext<any, any, any>): Promise<Response> {
  const { request, next } = context;
  const url = new URL(request.url);

  if (url.pathname === '/feed' || url.pathname === '/index.html') {
    url.pathname = '/';
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname.length > 1 && url.pathname.endsWith('/') && !url.pathname.startsWith('/api/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
    return Response.redirect(url.toString(), 301);
  }

  // Explicit app-only routes retain their shell without becoming indexable pages.
  if (['/messages', '/vault', '/profile', '/more', '/settings', '/governance', '/notifications'].includes(url.pathname)) {
    const shell = await context.env.ASSETS.fetch(new URL('/', url.origin));
    const headers = new Headers(shell.headers);
    headers.set('X-Robots-Tag', 'noindex, follow');
    return new Response(shell.body, { headers });
  }

  // 1. Check legacy route resolution
  const legacyResolution = resolveLegacyRoute(url.pathname);

  // Case A: Relevant modern equivalent exists -> HTTP 301 Permanent Redirect
  if (legacyResolution.action === 'redirect' && legacyResolution.target) {
    const redirectUrl = new URL(legacyResolution.target, url.origin);
    return new Response(null, {
      status: 301,
      statusText: 'Moved Permanently',
      headers: {
        'Location': redirectUrl.toString(),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  }

  // Case B: Obsolete legacy resource without equivalent -> HTTP 410 Gone
  if (legacyResolution.action === 'gone') {
    return new Response(
      '410 Gone: This legacy resource has been permanently removed. UREfy is a sovereign consumer social network and does not host legacy third-party content.',
      {
        status: 410,
        statusText: 'Gone',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'X-Robots-Tag': 'noindex, nofollow, unavailable_after: 2026-09-19T00:00:00Z',
        },
      }
    );
  }

  // 2. Execute downstream function or serve asset
  const response = await next();

  // Unknown paths must never inherit the root SPA's successful HTML response.
  const publicRoute = /^\/(?:$|explore$|communities$|about$|features$|privacy$|terms$|security$|admin(?:\.html)?$|(?:p|post|c|u)\/[^/]+$)/.test(url.pathname);
  if (!publicRoute && !url.pathname.startsWith('/api/') && response.headers.get('Content-Type')?.includes('text/html')) {
    return seoError(404);
  }

  // 3. Clone and attach essential security headers
  const newHeaders = new Headers(response.headers);
  if (!newHeaders.has('X-Content-Type-Options')) {
    newHeaders.set('X-Content-Type-Options', 'nosniff');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
