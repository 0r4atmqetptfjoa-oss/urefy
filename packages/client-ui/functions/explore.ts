import { headHandler } from './_head.js';
import { INDEXABLE_PROFILE_SQL, INDEXABLE_POST_SQL, SITE_ORIGIN } from './_discovery.js';
import { getD1Database, type Env } from './api/_db.js';
import { ensureSyntheticFixturesTable } from './api/_synthetic.js';
import { escapeHtml, injectStaticPageSeo } from './_seo.js';
import { seoError } from './_seo-response.js';
import { postPath, profilePath, communityPath } from '../src/public-urls.js';

export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  const { request, env } = context;
  const db = getD1Database(env);
  if (!db) return seoError(503);
  try {
    await ensureSyntheticFixturesTable(db).catch(() => {});
    const [posts, communities, profiles] = await Promise.all([
      db.prepare(`SELECT id, title FROM posts WHERE ${INDEXABLE_POST_SQL} ORDER BY created_at DESC, id LIMIT 20`).all<any>(),
      db.prepare("SELECT id, name, description FROM communities WHERE NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'community' AND sf.resource_id = communities.id) ORDER BY name LIMIT 30").all<any>(),
      db.prepare(`SELECT user_id, display_name, handle FROM user_profiles WHERE ${INDEXABLE_PROFILE_SQL} ORDER BY updated_at DESC LIMIT 12`).all<any>(),
    ]);
    const origin = SITE_ORIGIN;
    const title = 'Explore discussions, communities and people — UREfy';
    const description = 'Discover public conversations, browse communities, and find people to follow on UREfy.';
    const list = (items: any[], path: (row: any) => string, label: (row: any) => string) => `<ul>${items.map(row => `<li><a href="${escapeHtml(path(row))}">${escapeHtml(label(row))}</a></li>`).join('')}</ul>`;
    const response = injectStaticPageSeo(await env!.ASSETS.fetch(new URL('/', request.url)), { title, description, origin, canonicalUrl: `${origin}/explore`,
      jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description, url: `${origin}/explore` },
      bodySnippet: `<main class="public-home-intro"><nav><a href="/">Home</a> · <a href="/communities">All communities</a></nav><h1>Explore UREfy</h1><p>${description}</p><h2>Recent discussions</h2>${list(posts.results, row => postPath(row.id), row => row.title)}<p><a href="/discussions">Browse the complete public archive →</a></p><h2>Communities</h2>${list(communities.results, row => communityPath(row.name || row.id), row => row.name)}<h2>People</h2>${list(profiles.results, row => profilePath(row.user_id), row => row.display_name || row.handle || row.user_id)}</main>` });
    return new Response(response.body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
  } catch { return seoError(503); }
}

export const onRequestHead = headHandler(onRequestGet);
