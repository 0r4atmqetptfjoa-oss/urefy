// ===========================================================================
// UREfy — Cloudflare Pages Static Pages Sitemap (/sitemap-static.xml)
// ===========================================================================

export async function onRequestGet(context: {
  request: Request;
}): Promise<Response> {
  const { request } = context;
  const origin = new URL(request.url).origin;
  const releaseDate = '2026-09-19';

  const staticUrls = [
    { loc: `${origin}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${origin}/explore`, priority: '0.9', changefreq: 'daily' },
    { loc: `${origin}/communities`, priority: '0.9', changefreq: 'daily' },
    { loc: `${origin}/about`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${origin}/features`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${origin}/privacy`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${origin}/terms`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${origin}/security`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${origin}/llms.txt`, priority: '0.9', changefreq: 'weekly' },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

  for (const item of staticUrls) {
    xml += `   <url>\n`;
    xml += `      <loc>${item.loc}</loc>\n`;
    xml += `      <lastmod>${releaseDate}</lastmod>\n`;
    xml += `      <changefreq>${item.changefreq}</changefreq>\n`;
    xml += `      <priority>${item.priority}</priority>\n`;
    xml += `   </url>\n`;
  }

  xml += `</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
