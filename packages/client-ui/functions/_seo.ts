import { postPath, profilePath, communityPath, communitySlug } from '../src/public-urls.js';
import { SITE_ORIGIN, PUBLIC_ROBOTS, hasPublicPostContent } from './_discovery.js';
import { publicReader } from './_public-reader.js';
// ===========================================================================
// UREfy — Edge SEO & Social Graph Metadata Engine (_seo.ts)
// Automatically renders dynamic OpenGraph, Twitter Cards, Schema.org JSON-LD
// and DiscussionForumPosting metadata for user posts and communities at Edge.
// ===========================================================================

export interface ElementHandler {
  element?(element: any): void | Promise<void>;
  comments?(comment: any): void | Promise<void>;
  text?(text: any): void | Promise<void>;
}

declare class HTMLRewriter {
  constructor();
  on(selector: string, handlers: ElementHandler): this;
  onDocument(handlers: ElementHandler): this;
  transform(response: Response): Response;
}

export interface SeoCommentData {
  id: string;
  authorId: string;
  authorName?: string;
  authorHandle?: string;
  authorProfileId?: string | null;
  content: string;
  createdAt: number;
  upvotes?: number;
}

export interface SeoPostData {
  id: string;
  title: string;
  content: string;
  flair?: string;
  authorId: string;
  authorName?: string;
  authorHandle?: string;
  authorProfileId?: string | null;
  createdAt: number;
  updatedAt?: number;
  meritVotes?: number;
  replyCount?: number;
  imagesJson?: string;
  videoJson?: string;
  attachmentJson?: string;
  quotedPostJson?: string;
  pollId?: string;
  status?: string;
  isAiGenerated?: boolean;
  sharedContent?: {
    id: string;
    title: string;
    url: string;
    authorName?: string;
  };
  comments?: SeoCommentData[];
  relatedPosts?: Array<{ id: string; title: string }>;
}

export interface SeoCommunityData {
  id: string;
  name: string;
  description: string;
  memberCount?: number;
  posts?: Array<{ id: string; title: string }>;
}

/**
 * Strips markdown and special characters from post text to produce a clean SEO snippet (150-160 chars)
 */
export function cleanMarkdown(text: string, maxLen: number = 160): string {
  if (!text) return '';
  let clean = text
    .replace(/```[\s\S]*?```/g, ' ') // remove code blocks
    .replace(/`([^`]+)`/g, '$1')     // remove inline code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // remove image tags
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')  // simplify links
    .replace(/#{1,6}\s+/g, '')       // remove headers
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2')    // italic
    .replace(/~~(.*?)~~/g, '$1')        // strikethrough
    .replace(/>\s+/g, '')               // blockquotes
    .replace(/[-*+]\s+/g, '')           // list bullets
    .replace(/\s+/g, ' ')               // normalize whitespace
    .trim();

  if (clean.length <= maxLen) return clean;
  const sub = clean.slice(0, maxLen);
  const lastSpace = sub.lastIndexOf(' ');
  return (lastSpace > 100 ? sub.slice(0, lastSpace) : sub).trim() + '...';
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Only URLs already present in public content, never data/javascript URLs. */
export function publicMediaUrl(value: unknown, origin: string): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return;
  try { const url = new URL(value, origin); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined; } catch { return; }
}

export function extractPostImages(post: SeoPostData, origin: string): string[] {
  const values: unknown[] = [];
  try { const parsed = JSON.parse(post.imagesJson || '[]'); if (Array.isArray(parsed)) values.push(...parsed); } catch { /* Optional malformed media remains absent. */ }
  for (const match of (post.content || '').matchAll(/!\[[^\]]*\]\(([^\s)]+)\)/g)) values.push(match[1]);
  return [...new Set(values.map(value => publicMediaUrl(value, origin)).filter((value): value is string => !!value))];
}

function postVideo(post: SeoPostData, origin: string): { src: string; embed?: string; poster?: string; title: string } | undefined {
  try {
    const v = JSON.parse(post.videoJson || 'null');
    if (!v || typeof v !== 'object') return;
    const src = publicMediaUrl(v.src || v.embed_url, origin);
    if (!src) return;
    const url = new URL(src);
    const youtube = /^(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)$/.test(url.hostname)
      ? (url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})$/)?.[1])
      : url.hostname === 'youtu.be' ? url.pathname.slice(1) : undefined;
    const id = youtube && /^[\w-]{11}$/.test(youtube) ? youtube : undefined;
    const vimeo = /^(?:www\.|player\.)?vimeo\.com$/.test(url.hostname) ? url.pathname.match(/\/(?:video\/)?(\d+)$/)?.[1] : undefined;
    return { src, title: typeof v.title === 'string' ? v.title : post.title || 'Post video',
      embed: id ? `https://www.youtube-nocookie.com/embed/${id}` : vimeo ? `https://player.vimeo.com/video/${vimeo}` : undefined,
      poster: publicMediaUrl(v.poster, origin),
    };
  } catch { return; }
}

/** Escaped plain Markdown for SSR; raw HTML and executable link protocols stay inert. */
function renderPublicText(value: string): string {
  const inline = (line: string): string => {
    const tokens: string[] = [];
    let html = escapeHtml(line).replace(/`([^`]+)`/g, (_, code) => { tokens.push(`<code>${code}</code>`); return `\u0000${tokens.length - 1}\u0000`; });
    html = html.replace(/!?\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, label, href) => {
      // Images are rendered in the media region, with their original label retained here.
      return match.startsWith('!') ? label : `<a href="${href}" rel="ugc nofollow noreferrer">${label}</a>`;
    }).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return html.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)] || '');
  };
  const blocks: string[] = []; let paragraph: string[] = []; let list: string[] = []; let ordered = false; let code: string[] | null = null; let firstHeadingDepth: number | undefined;
  const flush = () => { if (paragraph.length) { blocks.push(`<p>${paragraph.map(inline).join('<br>')}</p>`); paragraph = []; } if (list.length) { const tag = ordered ? 'ol' : 'ul'; blocks.push(`<${tag}>${list.map(item => `<li>${inline(item)}</li>`).join('')}</${tag}>`); list = []; } };
  for (const line of String(value || '').replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*```/.test(line)) { flush(); if (code) { blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); code = null; } else code = []; continue; }
    if (code) { code.push(line); continue; }
    if (!line.trim()) { flush(); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { flush(); firstHeadingDepth ??= heading[1].length; const level = Math.max(2, Math.min(6, heading[1].length - firstHeadingDepth + 2)); blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`); continue; }
    const item = line.match(/^\s*(?:([-*+])|\d+\.)\s+(.+)$/);
    if (item) { const nextOrdered = !item[1]; if (paragraph.length || (list.length && ordered !== nextOrdered)) flush(); ordered = nextOrdered; list.push(item[2]); continue; }
    if (/^>\s?/.test(line)) { flush(); blocks.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`); continue; }
    if (list.length) flush(); paragraph.push(line);
  }
  flush(); if (code) blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return blocks.join('\n');
}

function authorProfileUrl(author: { authorId: string; authorProfileId?: string | null }, origin: string): string | undefined {
  // null means the database lookup confirmed no public profile. Undefined preserves legacy callers.
  const id = author.authorProfileId === undefined ? author.authorId : author.authorProfileId;
  return id ? origin + profilePath(id) : undefined;
}

/**
 * Parses image URL from images_json or content
 */
export function extractPostImage(post: SeoPostData, origin: string): string {
  return extractPostImages(post, origin)[0] || postVideo(post, origin)?.poster || `${origin}/og-image.png`;
}

/**
 * Builds Schema.org JSON-LD structured data for a forum / social discussion post
 * Supports creativeWorkStatus: 'Deleted' or 'Archived', author.url, digitalSourceType, and threaded comments
 */
export function buildPostJsonLd(post: SeoPostData, canonicalUrl: string, origin: string, description: string): any {
  const authorName = post.authorName || (post.authorHandle ? post.authorHandle.replace(/^@/, '') : 'Profile not set up');
  const authorHandle = post.authorHandle ? (post.authorHandle.startsWith('@') ? post.authorHandle : `@${post.authorHandle}`) : undefined;
  const dateIso = new Date(post.createdAt || Date.now()).toISOString();

  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': canonicalUrl,
    url: canonicalUrl,
    headline: post.title,
    text: cleanMarkdown(post.content, 20000),
    datePublished: dateIso,
    ...(post.updatedAt ? { dateModified: new Date(post.updatedAt).toISOString() } : {}),
    commentCount: Math.max(0, post.replyCount || 0),
    mainEntityOfPage: canonicalUrl,
    ...(extractPostImages(post, origin).length ? { image: extractPostImages(post, origin) } : {}),
    author: {
      '@type': 'Person',
      name: authorName,
      ...(authorHandle ? { alternateName: authorHandle } : {}),
      ...(authorProfileUrl(post, origin) ? { url: authorProfileUrl(post, origin) } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: 'UREfy',
      url: origin,
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/og-image.png`,
      },
    },
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: Math.max(0, post.meritVotes || 0),
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: Math.max(0, post.replyCount || 0),
      },
    ],
  };

  // Google Digital Source Type for AI / Agent Transparency
  if (post.isAiGenerated) {
    jsonLd.digitalSourceType = 'https://schema.org/TrainedAlgorithmicMediaDigitalSource';
  }

  // If repost/share
  if (post.sharedContent) {
    jsonLd.sharedContent = {
      '@type': 'DiscussionForumPosting',
      headline: post.sharedContent.title,
      url: post.sharedContent.url,
      author: {
        '@type': 'Person',
        name: post.sharedContent.authorName || 'Original Author',
      },
    };
  }

  // Visible threaded comments
  if (post.comments && post.comments.length > 0) {
    jsonLd.comment = post.comments.slice(0, 10).map(c => ({
      '@type': 'Comment',
      '@id': `${canonicalUrl}#comment-${c.id}`,
      text: cleanMarkdown(c.content, 20000),
      datePublished: new Date(c.createdAt || Date.now()).toISOString(),
      author: {
        '@type': 'Person',
        name: c.authorName || (c.authorHandle ? c.authorHandle.replace(/^@/, '') : 'Profile not set up'),
        ...(c.authorHandle ? { alternateName: c.authorHandle } : {}),
        ...(authorProfileUrl(c, origin) ? { url: authorProfileUrl(c, origin) } : {}),
      },
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/LikeAction',
          userInteractionCount: Math.max(0, c.upvotes || 0),
        },
      ],
    }));
  }

  if (post.status === 'deleted' || post.status === 'tombstone') {
    jsonLd.creativeWorkStatus = 'Deleted';
  } else if (post.status === 'archived' || post.status === 'locked') {
    jsonLd.creativeWorkStatus = 'Archived';
  }

  return jsonLd;
}

/**
 * Transforms base HTML response using Cloudflare HTMLRewriter with full dynamic SEO metadata
 */
export function injectPostSeo(
  response: Response,
  post: SeoPostData,
  url: URL
): Response {
  const origin = SITE_ORIGIN;
  const canonicalUrl = `${origin}${postPath(post.id)}`;
  const indexable = hasPublicPostContent(post);
  const postTitle = post.title?.trim() || cleanMarkdown(post.content, 100) || 'Public post';
  const visibleTitle = indexable ? postTitle : 'Post without public content';
  const pageTitle = `${visibleTitle} — UREfy`;
  const description = cleanMarkdown(post.content, 160) || (indexable
    ? (postTitle.toLowerCase() !== 'sovereign pulse' ? cleanMarkdown(postTitle, 160) : 'A public media post on UREfy.')
    : 'This post does not contain public text, media or a poll. Browse other public discussions on UREfy.');
  const ogImage = extractPostImage(post, origin);
  const jsonLd = indexable ? buildPostJsonLd({ ...post, title: visibleTitle }, canonicalUrl, origin, description)
    : { '@type': 'WebPage', '@id': canonicalUrl, url: canonicalUrl, name: visibleTitle, description };
  const authorName = post.authorName || post.authorHandle || 'Profile not set up';
  const authorUrl = authorProfileUrl(post, origin);
  const video = postVideo(post, origin);
  const images = extractPostImages(post, origin).filter(image => image !== video?.poster);
  const appUrl = postPath(post.id) + '?app=1';
  const articleSnippet = `<main class="reader">
    <nav aria-label="Public navigation"><a href="/">UREfy</a><a href="/discussions">Discussions</a><a href="/communities">Communities</a><a href="${escapeHtml(appUrl)}">Open in app →</a></nav>
    <article><header><span class="reader-eyebrow">${escapeHtml(post.flair || 'Discussion')}</span><h1>${escapeHtml(visibleTitle)}</h1>
    <p class="reader-meta">By ${authorUrl ? `<a href="${escapeHtml(authorUrl)}">${escapeHtml(authorName)}</a>` : escapeHtml(authorName)} · <time datetime="${new Date(post.createdAt).toISOString()}">${new Date(post.createdAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</time> · ${post.meritVotes || 0} Merit · ${post.replyCount || 0} Replies</p></header>
    <div class="reader-content">${images.map((image, i) => `<figure class="reader-media"><img src="${escapeHtml(image)}" alt="${escapeHtml(visibleTitle)}${images.length > 1 ? ` — image ${i + 1}` : ''}" loading="${i ? 'lazy' : 'eager'}" ${i ? '' : 'fetchpriority="high"'} decoding="async"></figure>`).join('')}
    ${renderPublicText(post.content)}${!indexable ? `<p>${escapeHtml(description)}</p>` : ''}
    ${video ? `<section class="reader-video" aria-label="Post video">${video.embed ? `<iframe src="${escapeHtml(video.embed)}" title="${escapeHtml(video.title)}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>` : /\.(mp4|webm|ogg)(?:\?|$)/i.test(video.src) ? `<video controls preload="none" ${video.poster ? `poster="${escapeHtml(video.poster)}"` : ''} src="${escapeHtml(video.src)}"></video>` : ''}<p><a href="${escapeHtml(video.src)}" rel="ugc nofollow noreferrer">Open original video</a></p></section>` : ''}
    ${post.pollId || post.attachmentJson || post.quotedPostJson ? `<p>Additional shared content is available <a href="${escapeHtml(appUrl)}">in the app</a>.</p>` : ''}</div>
    <p><a class="reader-action" href="${escapeHtml(appUrl)}">Reply or react in the app →</a></p></article>
    ${post.comments?.length ? `<section class="reader-replies"><h2>Public replies</h2><p class="reader-meta">Showing ${post.comments.length} loaded replies. Open the app for the full conversation.</p>${post.comments.map(c => {
      const name = escapeHtml(c.authorName || c.authorHandle || 'Profile not set up'); const profileUrl = authorProfileUrl(c, origin);
      return `<article id="comment-${escapeHtml(c.id)}"><p class="reader-meta">${profileUrl ? `<a href="${escapeHtml(profileUrl)}">${name}</a>` : name} · <time datetime="${new Date(c.createdAt).toISOString()}">${new Date(c.createdAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</time></p><div class="reader-content">${renderPublicText(c.content)}</div></article>`;
    }).join('')}</section>` : ''}
    ${post.relatedPosts?.length ? `<section><h2>More public discussions</h2><ul class="reader-links">${post.relatedPosts.map(p => `<li><a href="${postPath(p.id)}">${escapeHtml(p.title)}</a></li>`).join('')}</ul></section>` : ''}
  </main>`;

  const transformed = new HTMLRewriter()
    .on('meta[name="robots"], meta[name="googlebot"], meta[name="bingbot"]', { element(e) { e.setAttribute('content', indexable ? PUBLIC_ROBOTS : 'noindex, follow'); } })
    .on('script[type="application/ld+json"]', { element(e) { e.remove(); } })
    .on('link[hreflang]', { element(e) { e.remove(); } })
    .on('meta[property="og:image:width"], meta[property="og:image:height"], meta[property="og:image:type"]', { element(e) { if (ogImage !== `${origin}/og-image.png`) e.remove(); } })
    .on('title', {
      element(e) {
        e.setInnerContent(pageTitle);
      },
    })
    .on('meta[name="description"]', {
      element(e) {
        e.setAttribute('content', description);
      },
    })
    .on('meta[property="og:title"]', {
      element(e) {
        e.setAttribute('content', visibleTitle);
      },
    })
    .on('meta[property="og:description"]', {
      element(e) {
        e.setAttribute('content', description);
      },
    })
    .on('meta[property="og:url"]', {
      element(e) {
        e.setAttribute('content', canonicalUrl);
      },
    })
    .on('meta[property="og:type"]', {
      element(e) {
        e.setAttribute('content', 'article');
      },
    })
    .on('meta[property="og:image"]', {
      element(e) {
        e.setAttribute('content', ogImage);
      },
    })
    .on('meta[property="og:image:secure_url"]', {
      element(e) {
        e.setAttribute('content', ogImage);
      },
    })
    .on('meta[property="og:image:alt"]', {
      element(e) {
        e.setAttribute('content', visibleTitle);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(e) {
        e.setAttribute('content', visibleTitle);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(e) {
        e.setAttribute('content', description);
      },
    })
    .on('meta[name="twitter:image"]', {
      element(e) {
        e.setAttribute('content', ogImage);
      },
    })
    .on('meta[name="twitter:image:alt"]', { element(e) { e.setAttribute('content', visibleTitle); } })
    .on('link[rel="canonical"]', {
      element(e) {
        e.setAttribute('href', canonicalUrl);
      },
    })
    .on('head', {
      element(e) {
        e.append(`\n  <meta property="article:published_time" content="${new Date(post.createdAt).toISOString()}" />`, { html: true });
        e.append(`\n  <meta property="article:section" content="${escapeHtml(post.flair || 'Technology')}" />`, { html: true });
        e.append(`\n  <script type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', '@graph': [jsonLd, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'UREfy', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: 'Public discussions', item: origin + '/explore' }, { '@type': 'ListItem', position: 3, name: visibleTitle, item: canonicalUrl }] }] }, null, 2).replace(/</g, '\\u003c')}\n  </script>\n`, { html: true });
      },
    })
    .on('#app', {
      element(e) {
        e.setInnerContent(articleSnippet, { html: true });
      },
    })
    .transform(response);
  return publicReader(transformed, url.searchParams.get('app') === '1');
}

/**
 * Transforms base HTML response with community-specific SEO metadata
 */
export function injectCommunitySeo(
  response: Response,
  community: SeoCommunityData,
  url: URL
): Response {
  const origin = SITE_ORIGIN;
  const canonicalUrl = `${origin}${communityPath(community.name || community.id)}`;
  const pageTitle = `${community.name} (c/${communitySlug(community.name || community.id)}) — UREfy Community`;
  const description = cleanMarkdown(community.description || `Read public discussions and join the ${community.name} community on UREfy.`, 160);
  const ogImage = `${origin}/og-image.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: pageTitle,
    description: description,
    publisher: {
      '@type': 'Organization',
      name: 'UREfy',
      url: origin,
      logo: {
        '@type': 'ImageObject',
        url: ogImage,
      },
    },
  };

  const communitySnippet = `
    <main class="reader">
      <nav aria-label="Public navigation"><a href="/">UREfy</a><a href="/communities">Communities</a><a href="/discussions">Discussions</a><a href="${escapeHtml(communityPath(community.name || community.id))}?app=1">Open community in app →</a></nav>
      <header><p class="reader-eyebrow">c/${escapeHtml(communitySlug(community.name || community.id))}</p><h1>${escapeHtml(community.name)}</h1></header>
      <div class="reader-content">${renderPublicText(community.description)}</div>
      <h2>Recent discussions</h2>
      <ul class="reader-links">${(community.posts || []).map(post => `<li><a href="${postPath(post.id)}">${escapeHtml(post.title)}</a></li>`).join('')}</ul>
      <p><a href="/discussions?community=${encodeURIComponent(communitySlug(community.name || community.id))}">Browse the complete public archive →</a></p>
      <p><a class="reader-action" href="${escapeHtml(communityPath(community.name || community.id))}?app=1">Join the conversation in the app →</a></p>
    </main>
  `;

  const transformed = new HTMLRewriter()
    .on('script[type="application/ld+json"]', { element(e) { e.remove(); } })
    .on('link[hreflang]', { element(e) { e.remove(); } })
    .on('meta[name="twitter:title"]', { element(e) { e.setAttribute('content', pageTitle); } })
    .on('meta[name="twitter:description"]', { element(e) { e.setAttribute('content', description); } })
    .on('meta[property="og:image:alt"], meta[name="twitter:image:alt"]', { element(e) { e.setAttribute('content', community.name); } })
    .on('title', {
      element(e) {
        e.setInnerContent(pageTitle);
      },
    })
    .on('meta[name="description"]', {
      element(e) {
        e.setAttribute('content', description);
      },
    })
    .on('meta[property="og:title"]', {
      element(e) {
        e.setAttribute('content', pageTitle);
      },
    })
    .on('meta[property="og:description"]', {
      element(e) {
        e.setAttribute('content', description);
      },
    })
    .on('meta[property="og:url"]', {
      element(e) {
        e.setAttribute('content', canonicalUrl);
      },
    })
    .on('link[rel="canonical"]', {
      element(e) {
        e.setAttribute('href', canonicalUrl);
      },
    })
    .on('head', {
      element(e) {
        e.append(`\n  <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c')}\n  </script>\n`, { html: true });
      },
    })
    .on('#app', {
      element(e) {
        e.setInnerContent(communitySnippet, { html: true });
      },
    })
    .transform(response);
  return publicReader(transformed, url.searchParams.get('app') === '1');
}

// ═════════════════════════════════════════════════════════════════════════════
// STATIC & SECTION PAGE SEO (About, Features, Privacy, Terms, Security, Communities)
// ═════════════════════════════════════════════════════════════════════════════

export interface SeoStaticPageOptions {
  title: string;
  description: string;
  canonicalUrl: string;
  origin: string;
  jsonLd?: any;
  bodySnippet?: string;
  ogImage?: string;
  robots?: string;
  standalone?: boolean;
}

export interface SeoProfileData {
  userId: string;
  displayName?: string;
  handle?: string;
  bio?: string;
  meritScore?: number;
  createdAt?: number;
  updatedAt?: number;
  avatarUrl?: string;
  postCount?: number;
  posts?: Array<{ id: string; title: string }>;
}

export interface LegacyRouteResolution {
  action: 'redirect' | 'gone' | 'none';
  target?: string;
}

/**
 * Resolves legacy URLs from previous domain occupants.
 * - Relevant equivalents -> HTTP 301 Permanent Redirect
 * - Obsolete legacy URLs without any equivalent -> HTTP 410 Gone
 * - Never mass-redirect to homepage (avoiding soft 404 penalties)
 */
export function resolveLegacyRoute(pathname: string): LegacyRouteResolution {
  if (!pathname) return { action: 'none' };
  const p = pathname.toLowerCase().replace(/\/+$/, '') || '/';

  // 1. Relevant modern equivalents -> HTTP 301 Permanent Redirect
  const redirectMap: Record<string, string> = {
    '/about-us': '/about',
    '/about.html': '/about',
    '/company/about': '/about',
    '/privacy-policy': '/privacy',
    '/privacy.html': '/privacy',
    '/privacy-statement': '/privacy',
    '/terms-of-service': '/terms',
    '/terms-and-conditions': '/terms',
    '/terms.html': '/terms',
    '/tos': '/terms',
    '/legal': '/terms',
    '/contact': '/about',
    '/contact-us': '/about',
    '/contact.html': '/about',
    '/features.html': '/features',
    '/security.html': '/security',
    '/whitepaper': '/security',
    '/communities.html': '/communities',
    '/circles': '/communities',
    '/feed.html': '/feed',
  };

  if (redirectMap[p]) {
    return { action: 'redirect', target: redirectMap[p] };
  }

  // 2. Obsolete legacy URLs without any equivalent -> HTTP 410 Gone
  // WordPress, PHP scripts, trackbacks, xmlrpc
  if (p.includes('.php') || p.startsWith('/wp-') || p.includes('/wp-content/') || p.includes('/wp-includes/') || p.includes('xmlrpc')) {
    return { action: 'gone' };
  }

  // Legacy blog taxonomy
  if (p.startsWith('/category/') || p.startsWith('/tag/') || p.startsWith('/author/') || p.startsWith('/trackback')) {
    return { action: 'gone' };
  }

  // Legacy domain identity keywords ("Fashion, Fitness, Lifestyle", ecommerce)
  const legacyKeywords = [
    '/fashion',
    '/fitness',
    '/lifestyle',
    '/wellness',
    '/beauty',
    '/shop',
    '/cart',
    '/checkout',
    '/product',
    '/products',
    '/outfit',
    '/workout',
    '/diet',
    '/blog',
  ];

  for (const kw of legacyKeywords) {
    if (p === kw || p.startsWith(kw + '/') || p.startsWith(kw + '-')) {
      return { action: 'gone' };
    }
  }

  return { action: 'none' };
}

/**
 * Backward compatible check: returns true if path should return 410 Gone
 */
export function isLegacySpamPath(pathname: string): boolean {
  return resolveLegacyRoute(pathname).action === 'gone';
}

/**
 * Injects SEO metadata for static authority pages (/about, /features, /privacy, /terms, /security, /communities)
 */
export function injectStaticPageSeo(
  response: Response,
  opts: SeoStaticPageOptions
): Response {
  const ogImage = opts.ogImage || `${opts.origin}/og-image.png`;

  let rewriter = new HTMLRewriter()
    .on('meta[name="robots"], meta[name="googlebot"], meta[name="bingbot"]', { element(e) { e.setAttribute('content', opts.robots || PUBLIC_ROBOTS); } })
    .on('script[type="application/ld+json"]', { element(e) { e.remove(); } })
    .on('link[hreflang]', { element(e) { e.remove(); } })
    .on('meta[property="og:image:secure_url"]', { element(e) { e.setAttribute('content', ogImage); } })
    .on('meta[property="og:image:alt"], meta[name="twitter:image:alt"]', { element(e) { e.setAttribute('content', opts.title); } })
    .on('meta[property="og:image:width"], meta[property="og:image:height"], meta[property="og:image:type"]', { element(e) { if (ogImage !== `${opts.origin}/og-image.png`) e.remove(); } })
    .on('title', {
      element(e) {
        e.setInnerContent(opts.title);
      },
    })
    .on('meta[name="description"]', {
      element(e) {
        e.setAttribute('content', opts.description);
      },
    })
    .on('meta[property="og:title"]', {
      element(e) {
        e.setAttribute('content', opts.title);
      },
    })
    .on('meta[property="og:description"]', {
      element(e) {
        e.setAttribute('content', opts.description);
      },
    })
    .on('meta[property="og:url"]', {
      element(e) {
        e.setAttribute('content', opts.canonicalUrl);
      },
    })
    .on('meta[property="og:image"]', {
      element(e) {
        e.setAttribute('content', ogImage);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(e) {
        e.setAttribute('content', opts.title);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(e) {
        e.setAttribute('content', opts.description);
      },
    })
    .on('meta[name="twitter:image"]', {
      element(e) {
        e.setAttribute('content', ogImage);
      },
    })
    .on('link[rel="canonical"]', {
      element(e) {
        e.setAttribute('href', opts.canonicalUrl);
      },
    });

  if (opts.standalone || /\/(about|features|privacy|terms|security)$/.test(new URL(opts.canonicalUrl).pathname)) {
    rewriter = rewriter.on('script[type="module"]', { element(e) { e.remove(); } })
      .on('link[rel="modulepreload"]', { element(e) { e.remove(); } })
      .on('link[rel="stylesheet"], link[rel="preload"][as="style"]', { element(e) { e.remove(); } })
      .on('html', { element(e) { e.setAttribute('data-public-reader', 'true'); e.setAttribute('lang', 'en'); e.setAttribute('style', 'overflow-y: auto !important; height: auto !important; min-height: 100% !important;'); } })
      .on('body', { element(e) { e.setAttribute('style', 'overflow-y: auto !important; height: auto !important; min-height: 100% !important; -webkit-overflow-scrolling: touch; background: #090a0f; color: #e2e8f0; margin: 0; padding: 0;'); } })
      .on('#app', { element(e) { e.setAttribute('style', 'overflow-y: visible !important; height: auto !important; min-height: 100% !important; contain: none !important; padding-bottom: 5rem;'); } });
  }

  if (opts.standalone) {
    rewriter = rewriter
      .on('#boot-shell', { element(e) { e.remove(); } })
      .on('head', { element(e) { e.append(`<style>
        html.app-booting #app{visibility:visible!important}
        body{background:var(--bg-canvas,#090a0f)!important;color:var(--text-primary,#e2e8f0)!important}
        .discussion-archive{max-width:1080px;margin:auto;padding:24px clamp(20px,5vw,56px);font:16px/1.65 'Segoe UI Variable','Segoe UI',Arial,sans-serif}
        .discussion-archive a{color:var(--color-accent,#e59b3c);text-decoration:none}
        .discussion-archive a:hover{text-decoration:underline}
        .discussion-archive a:focus-visible{outline:2px solid var(--color-accent,#e59b3c);outline-offset:5px}
        .archive-top{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;padding-bottom:24px;border-bottom:1px solid var(--border-subtle,rgba(128,128,128,.25))}
        .archive-top a{display:inline-flex;align-items:center;min-height:44px}
        .archive-top a:first-child{font-size:24px;font-weight:750;margin-right:auto}
        .archive-heading{padding:32px 0 20px}.archive-heading h1{font:700 clamp(26px,4vw,42px)/1.2 'Segoe UI Variable','Segoe UI',Arial,sans-serif;letter-spacing:-.02em;margin:8px 0 12px;max-width:30ch}
        .archive-eyebrow{color:var(--text-secondary,#94a3b8);font-size:13px;letter-spacing:.08em}
        .archive-pagination{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:center;padding:16px 0;border-top:1px solid var(--border-subtle,rgba(128,128,128,.25));border-bottom:1px solid var(--border-subtle,rgba(128,128,128,.25))}
        .archive-pagination a{display:inline-flex;align-items:center;min-height:44px}.archive-pagination span{color:var(--text-secondary,#94a3b8)}
        .archive-posts{list-style:none;margin:0;padding:0}.archive-posts li{padding:24px 0;border-bottom:1px solid var(--border-subtle,rgba(128,128,128,.25))}
        .archive-posts h2{font:650 clamp(19px,2.5vw,24px)/1.35 'Segoe UI Variable','Segoe UI',Arial,sans-serif;margin:0 0 8px;max-width:65ch;overflow-wrap:anywhere}
        .archive-posts h2 a{color:var(--text-primary,#e2e8f0)}.archive-posts time{font-size:13px;color:var(--text-secondary,#94a3b8)}
        .archive-posts p{max-width:76ch;overflow-wrap:anywhere;margin:12px 0 0;color:var(--text-secondary,#94a3b8)}
      </style>`, { html: true }); } });
  }

  if (opts.jsonLd) {
    const jsonStr = JSON.stringify(opts.jsonLd, null, 2).replace(/</g, '\\u003c');
    rewriter = rewriter.on('head', {
      element(e) {
        e.append(`\n  <script type="application/ld+json">\n${jsonStr}\n  </script>\n`, { html: true });
      },
    });
  }

  if (opts.bodySnippet) {
    const snippet = opts.bodySnippet;
    rewriter = rewriter.on('#app', {
      element(e) {
        e.setInnerContent(snippet, { html: true });
      },
    });
  }

  return rewriter.transform(response);
}

/**
 * Injects SEO metadata for public user profiles (/u/:id)
 */
export function injectProfileSeo(
  response: Response,
  profile: SeoProfileData,
  url: URL
): Response {
  const origin = SITE_ORIGIN;
  const canonicalUrl = `${origin}${profilePath(profile.userId)}`;
  const displayName = profile.displayName || profile.handle || 'Profile not set up';
  const handle = profile.handle ? (profile.handle.startsWith('@') ? profile.handle : `@${profile.handle}`) : '';
  const pageTitle = `${displayName}${handle ? ` (${handle})` : ''} — UREfy Profile`;
  const description = profile.bio
    ? cleanMarkdown(profile.bio, 160)
    : `Read ${displayName}'s public profile and community posts on UREfy.`;
  const avatar = publicMediaUrl(profile.avatarUrl, origin);
  const ogImage = avatar || `${origin}/og-image.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: pageTitle,
    ...(profile.createdAt && profile.createdAt > 0 && profile.createdAt <= Date.now() ? { dateCreated: new Date(profile.createdAt).toISOString() } : {}),
    ...(profile.updatedAt && profile.updatedAt > 0 && profile.updatedAt <= Date.now() ? { dateModified: new Date(profile.updatedAt).toISOString() } : {}),
    mainEntity: {
      '@type': 'Person',
      name: displayName,
      ...(handle ? { alternateName: handle } : {}),
      ...(avatar ? { image: avatar } : {}),
      identifier: profile.userId,
      description: description,
      url: canonicalUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'UREfy',
      url: origin,
    },
  };

  const profileSnippet = `
    <main class="reader">
      <nav aria-label="Public navigation"><a href="/">UREfy</a><a href="/discussions">Discussions</a><a href="/communities">Communities</a><a href="${escapeHtml(profilePath(profile.userId))}?app=1">Open profile in app →</a></nav>
      <header>${avatar ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(displayName)}" width="88" height="88" decoding="async" style="border-radius:16px;object-fit:cover">` : ''}<p class="reader-eyebrow">Public profile</p><h1>${escapeHtml(displayName)}</h1>${handle ? `<p class="reader-meta">${escapeHtml(handle)}</p>` : ''}</header>
      <div class="reader-content">${renderPublicText(profile.bio || description)}</div>
      <h2>Recent public posts</h2>
      <ul class="reader-links">${(profile.posts || []).map(post => `<li><a href="${postPath(post.id)}">${escapeHtml(post.title)}</a></li>`).join('')}</ul>
      <p><a class="reader-action" href="${escapeHtml(profilePath(profile.userId))}?app=1">Open profile in app →</a></p>
    </main>
  `;

  const transformed = injectStaticPageSeo(response, {
    title: pageTitle,
    description,
    canonicalUrl,
    origin,
    jsonLd,
    bodySnippet: profileSnippet,
    ogImage,
    robots: !profile.bio?.trim() && !profile.posts?.length ? 'noindex, follow' : PUBLIC_ROBOTS,
  });
  return publicReader(transformed, url.searchParams.get('app') === '1');
}

