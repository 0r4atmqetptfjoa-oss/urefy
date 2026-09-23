// ===========================================================================
// UREfy — Cloudflare Pages Paginated Posts Sitemap (/sitemap-posts-1.xml)
// Indexes ONLY public, canonical, non-deleted posts.
// Uses genuine lastmod based on actual created_at timestamp.
// ===========================================================================

import { Env, getD1Database } from './api/_db.js';
import { ensureSyntheticFixturesTable } from './api/_synthetic.js';

export async function onRequestGet(context: {
  request: Request;
  env?: Env;
}): Promise<Response> {
  const { request, env } = context;
  const origin = new URL(request.url).origin;

  let postUrls: Array<{ loc: string; lastmod: string; priority: string; changefreq: string }> = [];

  const db = getD1Database(env);
  if (db) {
    try {
      await ensureSyntheticFixturesTable(db).catch(() => {});
      const rows = await db
        .prepare(
          `SELECT id, created_at, flair
           FROM posts
           WHERE (status IN ('published', 'pinned', 'locked') OR status IS NULL)
             AND (audience = 'public' OR audience IS NULL)
             AND NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'post' AND sf.resource_id = posts.id)
           ORDER BY created_at DESC
           LIMIT 50000`
        )
        .all<any>();

      if (rows?.results) {
        postUrls = rows.results.map((r: any) => {
          const postDate = new Date(Number(r.created_at) || 1773820000000)
            .toISOString()
            .split('T')[0];

          return {
            loc: `${origin}/p/${encodeURIComponent(r.id)}`,
            lastmod: postDate,
            priority: '0.8',
            changefreq: 'daily',
          };
        });
      }
    } catch (err) {
      console.warn('[Sitemap] Failed to query posts for sitemap-posts-1:', err);
    }
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const item of postUrls) {
    xml += `   <url>\n`;
    xml += `      <loc>${item.loc}</loc>\n`;
    xml += `      <lastmod>${item.lastmod}</lastmod>\n`;
    xml += `      <changefreq>${item.changefreq}</changefreq>\n`;
    xml += `      <priority>${item.priority}</priority>\n`;
    xml += `   </url>\n`;
  }

  xml += `</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
