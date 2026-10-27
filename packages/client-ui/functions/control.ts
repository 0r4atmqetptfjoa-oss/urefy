/**
 * @file control.ts
 * @package @aetheris/client-ui
 * @description Sovereign Mission Control Entry Point — Clean route immune to external Cloudflare Access wildcard interception.
 */
import type { Env } from './api/_db.js';

export async function onRequest(context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}): Promise<Response> {
  const url = new URL(context.request.url);

  // Directly serve the static control.html asset from ASSETS binding
  if (context.env?.ASSETS?.fetch) {
    const assetUrl = new URL('/control.html', url.origin);
    const assetRes = await context.env.ASSETS.fetch(assetUrl);
    if (assetRes.status === 200) {
      const headers = new Headers(assetRes.headers);
      headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      headers.set('Cache-Control', 'no-store, private');
      return new Response(assetRes.body, {
        status: 200,
        headers,
      });
    }
  }

  return context.next();
}
