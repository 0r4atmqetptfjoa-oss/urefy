import { handleAdminGate } from './_admin-gate.js';
import type { Env } from './api/_db.js';

export async function onRequest(context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}): Promise<Response> {
  return handleAdminGate({
    ...context,
    next: () => {
      const assetUrl = new URL('/admin', context.request.url);
      if (context.env?.ASSETS?.fetch) {
        return context.env.ASSETS.fetch(assetUrl);
      }
      return context.next();
    },
  });
}
