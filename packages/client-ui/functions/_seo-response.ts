export function seoError(status: 404 | 503): Response {
  const title = status === 404 ? 'Page not found' : 'Temporarily unavailable';
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title} — UREfy</title><meta name="robots" content="noindex, follow"></head><body style="background:#0d0f12;color:#e2e8f0;font:16px system-ui;padding:3rem;line-height:1.6"><main><h1>${title}</h1><p>${status === 404 ? 'This page does not exist or is no longer public.' : 'Please try again shortly.'}</p><a style="color:#fbbf24" href="/">Home</a> · <a style="color:#fbbf24" href="/communities">Communities</a></main></body></html>`, {
    status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, follow', 'Cache-Control': 'no-store', ...(status === 503 ? { 'Retry-After': '60' } : {}) },
  });
}

export function canonicalRedirect(request: Request, pathname: string): Response | null {
  const url = new URL(request.url);
  if (url.pathname === pathname) return null;
  url.pathname = pathname;
  return Response.redirect(url.toString(), 301);
}
