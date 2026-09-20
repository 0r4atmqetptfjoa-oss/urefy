import { postPath, profilePath, communityPath, communitySlug } from '../src/public-urls.js';
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
  createdAt: number;
  updatedAt?: number;
  meritVotes?: number;
  replyCount?: number;
  imagesJson?: string;
  status?: string;
  isAiGenerated?: boolean;
  sharedContent?: {
    id: string;
    title: string;
    url: string;
    authorName?: string;
  };
  comments?: SeoCommentData[];
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

/**
 * Parses image URL from images_json or content
 */
export function extractPostImage(post: SeoPostData, origin: string): string {
  if (post.imagesJson) {
    try {
      const parsed = JSON.parse(post.imagesJson);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        return parsed[0].startsWith('http') ? parsed[0] : `${origin}${parsed[0]}`;
      }
    } catch (_) {}
  }
  // Check for markdown image in content
  const imgMatch = post.content ? post.content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/i) : null;
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  return `${origin}/og-image.png`;
}

/**
 * Builds Schema.org JSON-LD structured data for a forum / social discussion post
 * Supports creativeWorkStatus: 'Deleted' or 'Archived', author.url, digitalSourceType, and threaded comments
 */
export function buildPostJsonLd(post: SeoPostData, canonicalUrl: string, origin: string, description: string): any {
  const authorName = post.authorName || (post.authorHandle ? post.authorHandle.replace(/^@/, '') : `Member ${post.authorId.slice(0, 8)}`);
  const authorHandle = post.authorHandle ? (post.authorHandle.startsWith('@') ? post.authorHandle : `@${post.authorHandle}`) : `@${post.authorId.slice(0, 8)}`;
  const dateIso = new Date(post.createdAt || Date.now()).toISOString();
  const dateModified = new Date(post.updatedAt || post.createdAt || Date.now()).toISOString();

  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': canonicalUrl,
    url: canonicalUrl,
    headline: post.title,
    articleBody: description,
    datePublished: dateIso,
    dateModified: dateModified,
    commentCount: post.replyCount || 0,
    mainEntityOfPage: canonicalUrl,
    author: {
      '@type': 'Person',
      name: authorName,
      alternateName: authorHandle,
      url: `${origin}${profilePath(post.authorId)}`,
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
        userInteractionCount: post.meritVotes || 0,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: post.replyCount || 0,
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
      text: cleanMarkdown(c.content, 250),
      dateCreated: new Date(c.createdAt || Date.now()).toISOString(),
      author: {
        '@type': 'Person',
        name: c.authorName || (c.authorHandle ? c.authorHandle.replace(/^@/, '') : `Member ${c.authorId.slice(0, 8)}`),
        alternateName: c.authorHandle || `@${c.authorId.slice(0, 8)}`,
        url: `${origin}${profilePath(c.authorId)}`,
      },
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/LikeAction',
          userInteractionCount: c.upvotes || 0,
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
  const origin = url.origin;
  const canonicalUrl = `${origin}${postPath(post.id)}`;
  const pageTitle = `${post.title} — UREfy`;
  const description = cleanMarkdown(post.content, 160);
  const ogImage = extractPostImage(post, origin);
  const jsonLd = buildPostJsonLd(post, canonicalUrl, origin, description);
  const authorName = post.authorName || `Member ${post.authorId.slice(0, 8)}`;

  // Server-rendered article content for crawlers and initial render (replaces #app to prevent homepage shell duplication)
  const articleSnippet = `
    <article style="max-width: 800px; margin: 40px auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e2e8f0; background: #12151c; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
      <nav style="margin-bottom: 20px;"><a href="${origin}/" style="color: #e59b3c; text-decoration: none; font-weight: 500;">&larr; Back to UREfy Feed</a></nav>
      <header style="margin-bottom: 24px;">
        <span style="font-size: 12px; color: #e59b3c; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">${escapeHtml(post.flair || 'DISCUSSION')}</span>
        <h1 style="font-size: 28px; line-height: 1.3; margin: 8px 0 12px 0; color: #f8fafc;">${escapeHtml(post.title)}</h1>
        <p style="font-size: 14px; color: #94a3b8; margin: 0;">By <a href="${origin}${profilePath(post.authorId)}" style="color: #e59b3c; text-decoration: none;">${escapeHtml(authorName)}</a> &bull; ${new Date(post.createdAt).toLocaleDateString()} &bull; ${post.meritVotes || 0} Merit &bull; ${post.replyCount || 0} Replies</p>
      </header>
      <div style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">
        ${escapeHtml(post.content).replace(/\n\n/g, '<br/><br/>')}
      </div>
      ${
        post.comments && post.comments.length > 0
          ? `
            <section style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b;">
              <h2 style="font-size: 18px; color: #f8fafc; margin-bottom: 16px;">Comments (${post.comments.length})</h2>
              <div style="display: flex; flex-direction: column; gap: 16px;">
                ${post.comments.map(c => `
                  <div style="background: rgba(255,255,255,0.02); padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">
                      <strong>${escapeHtml(c.authorName || c.authorHandle || `Member ${c.authorId.slice(0, 8)}`)}</strong> &bull; ${new Date(c.createdAt).toLocaleDateString()}
                    </div>
                    <div style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">${escapeHtml(c.content)}</div>
                  </div>
                `).join('')}
              </div>
            </section>
          `
          : ''
      }
    </article>
  `;

  return new HTMLRewriter()
    .on('script[type="application/ld+json"]', { element(e) { e.remove(); } })
    .on('link[hreflang]', { element(e) { e.remove(); } })
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
        e.setAttribute('content', post.title);
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
        e.setAttribute('content', post.title);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(e) {
        e.setAttribute('content', post.title);
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
    .on('link[rel="canonical"]', {
      element(e) {
        e.setAttribute('href', canonicalUrl);
      },
    })
    .on('head', {
      element(e) {
        e.append(`\n  <meta property="article:published_time" content="${new Date(post.createdAt).toISOString()}" />`, { html: true });
        e.append(`\n  <meta property="article:section" content="${escapeHtml(post.flair || 'Technology')}" />`, { html: true });
        e.append(`\n  <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c')}\n  </script>\n`, { html: true });
      },
    })
    .on('#app', {
      element(e) {
        e.setInnerContent(articleSnippet, { html: true });
      },
    })
    .transform(response);
}

/**
 * Transforms base HTML response with community-specific SEO metadata
 */
export function injectCommunitySeo(
  response: Response,
  community: SeoCommunityData,
  url: URL
): Response {
  const origin = url.origin;
  const canonicalUrl = `${origin}${communityPath(community.name || community.id)}`;
  const pageTitle = `${community.name} (c/${communitySlug(community.name || community.id)}) — UREfy Community`;
  const description = community.description || `Join the ${community.name} sovereign community on UREfy. Verified discussions, privacy-first discussions, zero tracking.`;
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
    <div style="max-width: 860px; margin: 40px auto; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e2e8f0; background: #12151c; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); line-height: 1.7;">
      <nav style="margin-bottom: 24px;"><a href="${origin}/communities" style="color: #e59b3c; text-decoration: none; font-weight: 500;">&larr; Back to Communities</a></nav>
      <h1 style="font-size: 32px; color: #f8fafc; margin-bottom: 12px;">${escapeHtml(community.name)} (c/${escapeHtml(communitySlug(community.name || community.id))})</h1>
      <p style="font-size: 18px; color: #94a3b8;">${escapeHtml(community.description)}</p>
      <h2>Recent discussions</h2>
      <ul>${(community.posts || []).map(post => `<li><a href="${postPath(post.id)}" style="color: #e59b3c;">${escapeHtml(post.title)}</a></li>`).join('')}</ul>
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 14px;">Welcome to the sovereign <strong>${escapeHtml(community.name)}</strong> discussion circle on UREfy. Browse public posts and join the conversation.</p>
    </div>
  `;

  return new HTMLRewriter()
    .on('script[type="application/ld+json"]', { element(e) { e.remove(); } })
    .on('link[hreflang]', { element(e) { e.remove(); } })
    .on('meta[name="twitter:title"]', { element(e) { e.setAttribute('content', pageTitle); } })
    .on('meta[name="twitter:description"]', { element(e) { e.setAttribute('content', description); } })
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
}

export interface SeoProfileData {
  userId: string;
  displayName?: string;
  handle?: string;
  bio?: string;
  meritScore?: number;
  createdAt?: number;
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
    .on('script[type="application/ld+json"]', { element(e) { e.remove(); } })
    .on('link[hreflang]', { element(e) { e.remove(); } })
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

  if (/\/(about|features|privacy|terms|security)$/.test(new URL(opts.canonicalUrl).pathname)) {
    rewriter = rewriter.on('script[type="module"]', { element(e) { e.remove(); } })
      .on('link[rel="modulepreload"]', { element(e) { e.remove(); } })
      .on('html', { element(e) { e.setAttribute('style', 'overflow-y: auto !important; height: auto !important; min-height: 100% !important;'); } })
      .on('body', { element(e) { e.setAttribute('style', 'overflow-y: auto !important; height: auto !important; min-height: 100% !important; -webkit-overflow-scrolling: touch; background: #090a0f; color: #e2e8f0; margin: 0; padding: 0;'); } })
      .on('#app', { element(e) { e.setAttribute('style', 'overflow-y: visible !important; height: auto !important; min-height: 100% !important; contain: none !important; padding-bottom: 5rem;'); } });
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
  const origin = url.origin;
  const canonicalUrl = `${origin}${profilePath(profile.userId)}`;
  const displayName = profile.displayName || profile.handle || `Sovereign Member ${profile.userId.slice(0, 8)}`;
  const handle = profile.handle ? (profile.handle.startsWith('@') ? profile.handle : `@${profile.handle}`) : `@${profile.userId.slice(0, 8)}`;
  const pageTitle = `${displayName} (${handle}) — UREfy Profile`;
  const description = profile.bio
    ? cleanMarkdown(profile.bio, 160)
    : `Read ${displayName}'s public profile and community posts on UREfy.`;
  const ogImage = `${origin}/og-image.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: pageTitle,
    mainEntity: {
      '@type': 'Person',
      name: displayName,
      alternateName: handle,
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
    <div style="max-width: 800px; margin: 40px auto; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #e2e8f0; background: #0f172a; border-radius: 12px;">
      <h1 style="font-size: 24px; color: #f8fafc; margin-bottom: 4px;">${escapeHtml(displayName)}</h1>
      <p style="font-size: 14px; color: #818cf8; margin-top: 0;">${escapeHtml(handle)}</p>
      <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">${escapeHtml(description)}</p>
      <h2>Recent public posts</h2>
      <ul>${(profile.posts || []).map(post => `<li><a href="${postPath(post.id)}">${escapeHtml(post.title)}</a></li>`).join('')}</ul>
      <p><a href="${origin}/" style="color: #6366f1;">Back to UREfy Feed</a></p>
    </div>
  `;

  return injectStaticPageSeo(response, {
    title: pageTitle,
    description,
    canonicalUrl,
    origin,
    jsonLd,
    bodySnippet: profileSnippet,
    ogImage,
  });
}

