import { getD1Database, type Env } from '../api/_db.js';
import { injectCommunitySeo } from '../_seo.js';
import { canonicalRedirect, seoError } from '../_seo-response.js';
import { communityPath, communitySlug } from '../../src/public-urls.js';
export async function onRequestGet(context: { request: Request; env?: Env; params: { id: string } }): Promise<Response> {
  const { request, env } = context;
  let id: string;
  try { id = decodeURIComponent(context.params.id).trim(); } catch { return seoError(404); }
  if (!id) return seoError(404);
  const db = getD1Database(env);
  if (!db) return seoError(503);
  try {
    const name = communitySlug(id);
    const row = await db.prepare('SELECT id, name, description, channel_id FROM communities WHERE id = ? OR name = ? OR id = ? LIMIT 1').bind(id, name, 'c-' + name).first<any>();
    if (!row) return seoError(404);
    const redirect = canonicalRedirect(request, communityPath(row.name || row.id));
    if (redirect) return redirect;
    const posts = await db.prepare("SELECT id, title FROM posts WHERE channel_id IN (?, ?, ?, ?) AND (status IN ('published','pinned','locked') OR status IS NULL) ORDER BY created_at DESC LIMIT 20").bind(row.channel_id, row.id, 'c/' + row.name, row.name).all<any>();
    const base = await env!.ASSETS.fetch(new URL('/', request.url));
    const response = injectCommunitySeo(base, { ...row, posts: posts.results }, new URL(request.url));
    return new Response(response.body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': 'index, follow' } });
  } catch { return seoError(503); }
}
