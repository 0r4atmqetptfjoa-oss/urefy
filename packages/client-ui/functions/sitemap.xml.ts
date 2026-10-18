export const onRequestGet = async (context: any): Promise<Response> => {
  const baseUrl = 'https://urefy.com';
  const nowIso = new Date().toISOString();
  const staticRoutes = [
    { path: '/', priority: '1.0', changefreq: 'hourly' },
    { path: '/?view=feed', priority: '0.9', changefreq: 'hourly' },
    { path: '/?view=chat', priority: '0.9', changefreq: 'daily' },
    { path: '/?view=messages', priority: '0.8', changefreq: 'daily' },
    { path: '/?view=explore', priority: '0.8', changefreq: 'daily' },
  ];

  let dynamicChannelUrls = '';
  try {
    const db = context.env?.DB || context.env?.AETHERIS_DB;
    if (db) {
      const { results } = await db
        .prepare('SELECT id, created_at FROM channels LIMIT 100')
        .all();
      if (Array.isArray(results)) {
        for (const ch of results as any[]) {
          const chId = encodeURIComponent(String(ch.id || 'general'));
          dynamicChannelUrls += `
  <url>
    <loc>${baseUrl}/?channel=${chId}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`;
        }
      }
    }
  } catch {
    // Fallback la rutele statice dacă D1 nu răspunde
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticRoutes
  .map(
    (r) => `  <url>
    <loc>${baseUrl}${r.path}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join('\n')}${dynamicChannelUrls}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=3600',
      'X-Robots-Tag': 'all',
    },
  });
};

export const onRequestHead = async (context: any): Promise<Response> => {
  const res = await onRequestGet(context);
  return new Response(null, {
    status: res.status,
    headers: res.headers,
  });
};
