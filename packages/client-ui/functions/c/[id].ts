import { headHandler } from '../_head.js';
import { INDEXABLE_POST_SQL } from '../_discovery.js';
import { getD1Database, type Env } from '../api/_db.js';
import { ensureSyntheticFixturesTable } from '../api/_synthetic.js';
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
    await ensureSyntheticFixturesTable(db).catch(() => {});
    const name = communitySlug(id);
    const row = await db.prepare("SELECT id, name, description, channel_id FROM communities WHERE (id = ? OR name = ? OR id = ?) AND NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'community' AND sf.resource_id = communities.id) LIMIT 1").bind(id, name, 'c-' + name).first<any>();
    if (!row) {
      if (name === 'zeroknowledge' || id === 'zeroknowledge' || id === 'c/zeroknowledge') {
        const zkRow = {
          id: 'pulse-global',
          name: 'zeroknowledge',
          displayName: 'Zero-Knowledge & Cryptographic Privacy',
          description: 'Discussions on digital rights, personal privacy, secure tools, and zero-knowledge cryptographic verification.',
          category: 'Privacy & Freedom',
          channel_id: 'pulse-global',
        };
        const posts = await db.prepare(`SELECT id, title FROM posts WHERE (channel_id = 'pulse-global' OR channel_id = 'c/zeroknowledge') AND ${INDEXABLE_POST_SQL} ORDER BY created_at DESC, id LIMIT 20`).all<any>().catch(() => ({ results: [] }));
        const base = await env!.ASSETS.fetch(new URL('/', request.url));
        const response = injectCommunitySeo(base, { ...zkRow, posts: (posts as any)?.results || [] }, new URL(request.url));
        return new Response(response.body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': 'index, follow' } });
      }
      return seoError(404);
    }
    const redirect = canonicalRedirect(request, communityPath(row.name || row.id));
    if (redirect) return redirect;
    const posts = await db.prepare(`SELECT id, title FROM posts WHERE channel_id IN (?, ?, ?, ?) AND ${INDEXABLE_POST_SQL} ORDER BY created_at DESC, id LIMIT 20`).bind(row.channel_id, row.id, 'c/' + row.name, row.name).all<any>();
    const base = await env!.ASSETS.fetch(new URL('/', request.url));
    const response = injectCommunitySeo(base, { ...row, posts: posts.results }, new URL(request.url));
    return new Response(response.body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': 'index, follow' } });
  } catch { return seoError(503); }
}

export const onRequestHead = headHandler(onRequestGet);
