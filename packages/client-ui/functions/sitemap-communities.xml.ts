import { getD1Database, type Env } from './api/_db.js';
import { communityPath } from '../src/public-urls.js';
import { escapeHtml } from './_seo.js';
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  const db = getD1Database(context.env);
  if (!db) return new Response('Sitemap temporarily unavailable', { status: 503 });
  try {
    const rows = await db.prepare('SELECT id, name FROM communities ORDER BY name LIMIT 50000').all<any>();
    const origin = new URL(context.request.url).origin;
    const xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + rows.results.map(row => '<url><loc>' + escapeHtml(origin + communityPath(row.name || row.id)) + '</loc></url>').join('') + '</urlset>';
    return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
  } catch { return new Response('Sitemap temporarily unavailable', { status: 503 }); }
}
