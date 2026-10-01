import { INDEXABLE_POST_SQL, SITE_ORIGIN, PUBLIC_ROBOTS } from './_discovery.js';
import { getD1Database, type Env } from './api/_db.js';
import { communityPath, communitySlug, postPath } from '../src/public-urls.js';
import { cleanMarkdown, escapeHtml, injectStaticPageSeo } from './_seo.js';
import { seoError } from './_seo-response.js';
import { headHandler } from './_head.js';

const PAGE_SIZE = 40;

/** Public archive stays server-rendered: the app must not replace the selected page. */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  const url = new URL(context.request.url);
  const rawPage = url.searchParams.get('page') ?? '1';
  if (!/^[1-9]\d{0,4}$/.test(rawPage) || Number(rawPage) > 50000) return seoError(404);
  const page = Number(rawPage);
  const db = getD1Database(context.env);
  if (!db) return seoError(503);
  try {
    const requestedCommunity = url.searchParams.get('community');
    let name = '';
    let slug = '';
    let channels: string[] = [];
    if (requestedCommunity !== null) {
      if (!requestedCommunity.trim() || requestedCommunity.length > 200) return seoError(404);
      const requestedSlug = communitySlug(requestedCommunity);
      const community = await db.prepare("SELECT id, name, display_name, channel_id FROM communities WHERE (id = ? OR name = ? OR id = ?) AND NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'community' AND sf.resource_id = communities.id) LIMIT 1")
        .bind(requestedCommunity, requestedSlug, 'c-' + requestedSlug).first<{ id: string; name: string; display_name?: string; channel_id?: string }>();
      if (community) {
        slug = communitySlug(community.name || community.id);
        name = community.display_name || community.name;
        channels = [...new Set([community.channel_id, community.id, 'c/' + community.name, community.name].filter((value): value is string => !!value))];
      } else if (requestedSlug === 'zeroknowledge') {
        slug = 'zeroknowledge'; name = 'Zero-Knowledge & Cryptographic Privacy';
        channels = ['pulse-global', 'c/zeroknowledge'];
      } else return seoError(404);
    }
    const where = INDEXABLE_POST_SQL + (channels.length ? ` AND posts.channel_id IN (${channels.map(() => '?').join(',')})` : '');
    const count = await db.prepare(`SELECT count(*) AS total FROM posts WHERE ${where}`).bind(...channels).first<{ total: number }>();
    if (!count || !Number.isSafeInteger(Number(count.total)) || Number(count.total) < 0) return seoError(503);
    const total = Number(count.total);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > pages) return seoError(404);
    const path = (number: number): string => {
      const search = new URLSearchParams();
      if (slug) search.set('community', slug);
      if (number > 1) search.set('page', String(number));
      return '/discussions' + (search.size ? '?' + search.toString() : '');
    };
    const canonicalUrl = SITE_ORIGIN + path(page);
    if (url.pathname + url.search !== path(page)) return Response.redirect(canonicalUrl, 301);
    const { results } = await db.prepare(`SELECT id, title, content, created_at FROM posts WHERE ${where} ORDER BY created_at DESC, id LIMIT ? OFFSET ?`)
      .bind(...channels, PAGE_SIZE, (page - 1) * PAGE_SIZE).all<{ id: string; title: string; content: string; created_at: number }>();
    const heading = name ? `${name} discussions` : 'Public discussions';
    const title = `${heading}${page > 1 ? ` — Page ${page}` : ''} — UREfy`;
    const description = `Browse ${name ? `public discussions in ${name}` : 'public discussions across UREfy communities'}. Page ${page} of ${pages}. Read a post or continue through the archive.`;
    const label = (post: { title: string; content: string }): string => post.title?.trim() && post.title.toLowerCase() !== 'sovereign pulse'
      ? post.title : cleanMarkdown(post.content, 110) || 'Public media post';
    const pagination = `<nav class="archive-pagination" aria-label="Discussion pages">${page > 1 ? `<a rel="prev" href="${escapeHtml(path(page - 1))}">← Newer discussions</a>` : '<span></span>'}<span aria-current="page">Page ${page} of ${pages}</span>${page < pages ? `<a rel="next" href="${escapeHtml(path(page + 1))}">Older discussions →</a>` : '<span></span>'}</nav>`;
    const bodySnippet = `<main class="discussion-archive"><nav class="archive-top" aria-label="Public navigation"><a href="/">UREfy</a><a href="/explore">Explore</a><a href="/communities">Communities</a>${slug ? `<a href="${escapeHtml(communityPath(slug))}">Open community</a><a href="/discussions">All discussions</a>` : ''}</nav><header class="archive-heading"><p class="archive-eyebrow">UREfy · Public archive</p><h1>${escapeHtml(heading)}</h1><p>${total} public ${total === 1 ? 'discussion' : 'discussions'} · Page ${page} of ${pages}</p></header>${pagination}<ol class="archive-posts" start="${(page - 1) * PAGE_SIZE + 1}">${results.map(post => `<li><article><h2><a href="${escapeHtml(postPath(post.id))}">${escapeHtml(label(post))}</a></h2>${post.created_at > 0 && post.created_at <= 8.64e15 ? `<time datetime="${new Date(post.created_at).toISOString()}">${new Date(post.created_at).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</time>` : ''}<p>${escapeHtml(cleanMarkdown(post.content, 200))}</p></article></li>`).join('')}</ol>${!total ? '<p>No public discussions in this archive yet.</p>' : ''}${pagination}</main>`;
    const base = await context.env!.ASSETS.fetch(new URL('/', context.request.url));
    const response = injectStaticPageSeo(base, {
      title, description, origin: SITE_ORIGIN, canonicalUrl, bodySnippet, standalone: true,
      robots: total ? PUBLIC_ROBOTS : 'noindex, follow',
      jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description, url: canonicalUrl,
        mainEntity: { '@type': 'ItemList', itemListElement: results.map((post, index) => ({ '@type': 'ListItem', position: (page - 1) * PAGE_SIZE + index + 1, name: label(post), url: SITE_ORIGIN + postPath(post.id) })) } },
    });
    return new Response(response.body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': total ? PUBLIC_ROBOTS : 'noindex, follow' } });
  } catch { return seoError(503); }
}

export const onRequestHead = headHandler(onRequestGet);
