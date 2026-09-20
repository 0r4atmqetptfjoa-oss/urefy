// ===========================================================================
// UREfy — Cloudflare Pages Sitemap Index (/sitemap.xml)
// Standards-compliant Sitemap Index connecting modular, scalable child sitemaps
// ===========================================================================

export async function onRequestGet(context: {
  request: Request;
}): Promise<Response> {
  const { request } = context;
  const origin = new URL(request.url).origin;
  const baseDate = '2026-09-19';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <sitemap>
      <loc>${origin}/sitemap-static.xml</loc>
      <lastmod>${baseDate}</lastmod>
   </sitemap>
   <sitemap>
      <loc>${origin}/sitemap-communities.xml</loc>
      <lastmod>${baseDate}</lastmod>
   </sitemap>
   <sitemap>
      <loc>${origin}/sitemap-profiles.xml</loc>
      <lastmod>${baseDate}</lastmod>
   </sitemap>
   <sitemap>
      <loc>${origin}/sitemap-posts-1.xml</loc>
      <lastmod>${baseDate}</lastmod>
   </sitemap>
</sitemapindex>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
