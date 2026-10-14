import { headHandler } from './_head.js';
import { getD1Database, type Env } from './api/_db.js';
import { escapeHtml, cleanMarkdown, injectStaticPageSeo } from './_seo.js';
import { INDEXABLE_POST_SQL, PUBLIC_ROBOTS, SITE_ORIGIN } from './_discovery.js';
import { HOME_DESCRIPTION, renderPublicHomeIntro } from '../src/public-home.js';

export async function onRequestGet(context: { request: Request; env: Env & { ASSETS: { fetch(input: URL): Promise<Response> } } }): Promise<Response> {
  const base = await context.env.ASSETS.fetch(new URL('/', context.request.url));
  const db = getD1Database(context.env);
  let posts: Array<{ id: string; title: string; content: string }> = [];
  if (db) {
    try { posts = (await db.prepare(`SELECT id, title, content FROM posts WHERE ${INDEXABLE_POST_SQL} ORDER BY created_at DESC LIMIT 12`).all<any>()).results; }
    catch { /* A useful static introduction remains available during a database interruption. */ }
  }
  const title = 'UREfy — Communities and encrypted messaging';
  const body = renderPublicHomeIntro() + (posts.length ? `<section class="public-home-intro" aria-labelledby="recent-public-title"><h2 id="recent-public-title">Recent public discussions</h2>${posts.map(p => `<article><h3><a href="${SITE_ORIGIN}/p/${encodeURIComponent(p.id)}">${escapeHtml(p.title)}</a></h3><p>${escapeHtml(cleanMarkdown(p.content, 180))}</p></article>`).join('')}<a href="${SITE_ORIGIN}/explore">Explore more discussions</a></section>` : '');
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebSite', '@id': SITE_ORIGIN + '/#website', name: 'UREfy', url: SITE_ORIGIN + '/', description: HOME_DESCRIPTION, inLanguage: 'en', publisher: { '@id': SITE_ORIGIN + '/#organization' } },
    { '@type': 'Organization', '@id': SITE_ORIGIN + '/#organization', name: 'UREfy', url: SITE_ORIGIN + '/', logo: SITE_ORIGIN + '/icon-512.png' },
    { '@type': 'WebPage', '@id': SITE_ORIGIN + '/#page', url: SITE_ORIGIN + '/', name: title, description: HOME_DESCRIPTION, isPartOf: { '@id': SITE_ORIGIN + '/#website' } },
  ] };
  const response = injectStaticPageSeo(base, { title, description: HOME_DESCRIPTION, canonicalUrl: SITE_ORIGIN + '/', origin: SITE_ORIGIN, jsonLd, bodySnippet: body });
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  headers.set('X-Robots-Tag', PUBLIC_ROBOTS);
  return new Response(response.body, { status: response.status, headers });
}

export const onRequestHead = headHandler(onRequestGet);
