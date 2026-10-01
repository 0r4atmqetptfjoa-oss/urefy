import { headHandler } from './_head.js';
import { getD1Database, type Env } from './api/_db.js';
import { INDEXABLE_POST_SQL, INDEXABLE_PROFILE_SQL, SITE_ORIGIN } from './_discovery.js';
import { SITEMAP_PAGE_SIZE, sitemapResponse, sitemapUnavailable } from './_sitemaps.js';
export async function onRequestGet(context: { env?: Env }): Promise<Response> {
  const db = getD1Database(context.env);
  if (!db) return sitemapUnavailable();
  try {
    const counts = await db.batch<any>([
      db.prepare(`SELECT count(*) AS total FROM posts WHERE ${INDEXABLE_POST_SQL}`),
      db.prepare(`SELECT count(*) AS total FROM user_profiles WHERE ${INDEXABLE_PROFILE_SQL}`),
    ]);
    if (counts.length !== 2 || counts.some(result => !result.success || result.results?.[0]?.total === undefined)) return sitemapUnavailable();
    const paths = ['/sitemap-static.xml', '/sitemap-communities.xml'];
    for (const [index, kind] of ['posts', 'profiles'].entries()) {
      const count = Number(counts[index].results?.[0]?.total || 0);
      if (!Number.isSafeInteger(count) || count < 0 || count > 50000 * SITEMAP_PAGE_SIZE) return sitemapUnavailable();
      for (let page = 1; page <= Math.max(1, Math.ceil(count / SITEMAP_PAGE_SIZE)); page++) paths.push(`/sitemaps/${kind}/${page}`);
    }
    if (paths.length > 50000) return sitemapUnavailable();
    return sitemapResponse('<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + paths.map(p => `<sitemap><loc>${SITE_ORIGIN}${p}</loc></sitemap>`).join('') + '</sitemapindex>');
  } catch { return sitemapUnavailable(); }
}

export const onRequestHead = headHandler(onRequestGet);
