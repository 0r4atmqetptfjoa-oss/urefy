import { getD1Database, type Env } from '../api/_db.js';
import { ensureSyntheticFixturesTable } from '../api/_synthetic.js';
import { injectProfileSeo } from '../_seo.js';
import { canonicalRedirect, seoError } from '../_seo-response.js';
import { profilePath } from '../../src/public-urls.js';
export async function onRequestGet(context: { request: Request; env?: Env; params: { id: string } }): Promise<Response> {
  const { request, env } = context;
  let id: string;
  try { id = decodeURIComponent(context.params.id).trim(); } catch { return seoError(404); }
  if (!id) return seoError(404);
  const db = getD1Database(env);
  if (!db) return seoError(503);
  try {
    await ensureSyntheticFixturesTable(db).catch(() => {});
    const row = await db.prepare('SELECT user_id, display_name, handle, bio, created_at FROM user_profiles WHERE user_id = ? OR handle = ? OR handle = ? LIMIT 1').bind(id, id, id.startsWith('@') ? id : '@' + id).first<any>();
    if (!row) return seoError(404);
    const redirect = canonicalRedirect(request, profilePath(row.user_id));
    if (redirect) return redirect;
    const posts = await db.prepare("SELECT id, title FROM posts WHERE author_id = ? AND (status IN ('published','pinned','locked') OR status IS NULL) AND NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'post' AND sf.resource_id = posts.id) ORDER BY created_at DESC LIMIT 20").bind(row.user_id).all<any>();
    const base = await env!.ASSETS.fetch(new URL('/', request.url));
    const response = injectProfileSeo(base, { userId: row.user_id, displayName: row.display_name, handle: row.handle, bio: row.bio, createdAt: row.created_at, posts: posts.results }, new URL(request.url));
    return new Response(response.body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': 'index, follow' } });
  } catch { return seoError(503); }
}
