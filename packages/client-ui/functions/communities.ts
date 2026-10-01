import { SITE_ORIGIN } from './_discovery.js';
import { getD1Database, type Env } from './api/_db.js';
import { ensureSyntheticFixturesTable } from './api/_synthetic.js';
import { escapeHtml, injectStaticPageSeo } from './_seo.js';
import { seoError } from './_seo-response.js';
import { communityPath } from '../src/public-urls.js';

export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  const { request, env } = context;
  const db = getD1Database(env);
  if (!db) return seoError(503);
  try {
    await ensureSyntheticFixturesTable(db).catch(() => {});
    const { results } = await db.prepare("SELECT id, name, display_name, description FROM communities WHERE NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'community' AND sf.resource_id = communities.id) ORDER BY name LIMIT 1000").all<any>();
    const origin = SITE_ORIGIN;
    const title = 'Browse communities — UREfy';
    const description = 'Find communities and public discussions on UREfy. Browse topics and open a community to read its recent posts.';
    const response = injectStaticPageSeo(await env!.ASSETS.fetch(new URL('/', request.url)), {
      title, description, origin, canonicalUrl: `${origin}/communities`,
      jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description, url: `${origin}/communities`,
        mainEntity: { '@type': 'ItemList', itemListElement: results.map((row: any, index: number) => ({
          '@type': 'ListItem', position: index + 1, name: row.display_name || row.name, url: `${origin}${communityPath(row.name)}`,
        })) } },
      bodySnippet: `<main class="public-home-intro"><nav><a href="/">Home</a> · <a href="/explore">Explore discussions</a></nav><h1>Browse communities</h1><p>${description}</p>${results.length ? results.map((row: any) => `<article><h2><a href="${escapeHtml(communityPath(row.name))}">${escapeHtml(row.display_name || row.name)}</a></h2><p>${escapeHtml(row.description || '')}</p></article>`).join('') : '<p>No public communities yet.</p>'}</main>`,
    });
    return new Response(response.body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
  } catch { return seoError(503); }
}
