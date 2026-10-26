import { handleAdminGate } from './_admin-gate.js';
import type { Env } from './api/_db.js';

/**
 * Canonical admin entry point.
 *
 * Cloudflare Pages normalizes /admin.html to /admin with a 308 before serving
 * the static file. Redirecting /admin back to /admin.html therefore created an
 * infinite loop after a successful Cloudflare Access login. The gate runs here
 * and serves the static admin.html asset directly, so both entry points work:
 *   /admin.html -> 308 /admin -> gate -> admin.html
 */
export async function onRequest(context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}): Promise<Response> {
  return handleAdminGate({
    ...context,
    next: () => {
      // env.ASSETS.fetch expects the pretty path (/admin), not the physical
      // file (/admin.html). Passing /admin.html here would trigger Pages'
      // 308 HTML-normalization redirect again.
      const assetUrl = new URL('/admin', context.request.url);
      if (context.env?.ASSETS?.fetch) {
        return context.env.ASSETS.fetch(assetUrl);
      }
      return context.next();
    },
  });
}
