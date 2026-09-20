// ===========================================================================
// UREfy — Cloudflare Pages Public Profiles Sitemap (/sitemap-profiles.xml)
// Indexes public user profiles from D1
// ===========================================================================

import { Env, getD1Database } from './api/_db.js';

export async function onRequestGet(context: {
  request: Request;
  env?: Env;
}): Promise<Response> {
  const { request, env } = context;
  const origin = new URL(request.url).origin;

  let profileUrls: Array<{ loc: string; lastmod: string }> = [];

  const db = getD1Database(env);
  if (db) {
    try {
      const rows = await db
        .prepare(
          `SELECT user_id, handle, created_at, updated_at
           FROM user_profiles
           ORDER BY created_at DESC LIMIT 50000`
        )
        .all<any>();

      if (rows?.results) {
        profileUrls = rows.results.map((r: any) => {
          const dateStr = new Date(Number(r.updated_at || r.created_at) || 1773820000000).toISOString().split('T')[0];
          return {
            loc: `${origin}/u/${encodeURIComponent(r.user_id)}`,
            lastmod: dateStr,
          };
        });
      }
    } catch (err) {
      console.warn('[Sitemap] Failed to query profiles:', err);
    }
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const item of profileUrls) {
    xml += `   <url>\n`;
    xml += `      <loc>${item.loc}</loc>\n`;
    xml += `      <lastmod>${item.lastmod}</lastmod>\n`;
    xml += `      <changefreq>weekly</changefreq>\n`;
    xml += `      <priority>0.6</priority>\n`;
    xml += `   </url>\n`;
  }

  xml += `</urlset>\n`;

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
