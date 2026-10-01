import { getD1Database, type Env } from './api/_db.js';
import { INDEXABLE_PROFILE_SQL, INDEXABLE_POST_SQL, SITE_ORIGIN } from './_discovery.js';
import { escapeHtml } from './_seo.js';

export const SITEMAP_PAGE_SIZE = 1000;
export const STATIC_DISCOVERY_PAGES = [
  { path: '/', modified: '2026-09-30' }, { path: '/explore' }, { path: '/communities' }, { path: '/discussions' },
  { path: '/about', modified: '2026-09-30' }, { path: '/features', modified: '2026-09-30' },
  { path: '/security', modified: '2026-09-30' }, { path: '/privacy', modified: '2026-09-30' }, { path: '/terms' },
  { path: '/faq', modified: '2026-09-30' }, { path: '/guides', modified: '2026-09-30' },
  { path: '/guides/get-started', modified: '2026-09-30' }, { path: '/guides/private-messaging', modified: '2026-09-30' },
];
export function sitemapResponse(xml: string): Response {
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', 'X-Content-Type-Options': 'nosniff' } });
}
export function sitemapUnavailable(): Response {
  return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } });
}
export function urlset(rows: Array<{ loc: string; modified?: unknown }>): string {
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + rows.map(row => {
    const timestamp = Number(row.modified);
    const date = typeof row.modified === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.modified) ? row.modified : Number.isFinite(timestamp) && timestamp > 0 && timestamp <= 8.64e15 ? new Date(timestamp).toISOString() : '';
    return `<url><loc>${escapeHtml(row.loc)}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}</url>`;
  }).join('') + '</urlset>';
}
export async function paginatedSitemap(env: Env | undefined, kind: 'posts' | 'profiles', rawPage: string): Promise<Response> {
  if (!/^[1-9]\d{0,4}$/.test(rawPage) || Number(rawPage) > 50000) return new Response('Not found', { status: 404 });
  const db = getD1Database(env);
  if (!db) return sitemapUnavailable();
  try {
    const offset = (Number(rawPage) - 1) * SITEMAP_PAGE_SIZE;
    const query = kind === 'posts'
      ? `SELECT posts.id, posts.created_at FROM posts WHERE ${INDEXABLE_POST_SQL} ORDER BY posts.created_at DESC, posts.id LIMIT ? OFFSET ?`
      : `SELECT user_profiles.user_id, user_profiles.created_at, user_profiles.updated_at FROM user_profiles WHERE ${INDEXABLE_PROFILE_SQL} ORDER BY user_profiles.created_at DESC, user_profiles.user_id LIMIT ? OFFSET ?`;
    const { results } = await db.prepare(query).bind(SITEMAP_PAGE_SIZE, offset).all<any>();
    if (!results.length && offset > 0) return new Response('Not found', { status: 404 });
    // posts has no reliable edit timestamp. Omit lastmod rather than calling creation time its latest edit.
    return sitemapResponse(urlset(results.map(row => ({ loc: `${SITE_ORIGIN}/${kind === 'posts' ? 'p' : 'u'}/${encodeURIComponent(kind === 'posts' ? row.id : row.user_id)}`, modified: kind === 'profiles' ? row.updated_at : undefined }))));
  } catch { return sitemapUnavailable(); }
}
