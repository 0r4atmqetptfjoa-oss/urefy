// ===========================================================================
// UREfy — INDIVIDUAL POST EDGE API & SSR OPENGRAPH FETCHER (/api/posts/:id)
// Supports: Cloudflare D1 SQL query, In-Memory dev fallback,
// Social Crawler OpenGraph HTML rendering, and client JSON API responses.
// ===========================================================================

import {
  Env,
  EdgePost,
  getD1Database,
  getKVStore,
  globalPostsStore,
  isProductionEnv,
  createD1UnavailableResponse,
} from '../_db.js';
import { parseD1PostRow } from '../posts.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint',
};

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SOCIAL_CRAWLER_REGEX =
  /bot|crawler|spider|facebookexternalhit|twitterbot|slackbot|discordbot|linkedinbot|telegrambot|whatsapp|pinterest|vkshare|w3c_validator/i;

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestGet(context: {
  request: Request;
  env?: Env;
  params: { id?: string | string[] };
}): Promise<Response> {
  try {
    const url = new URL(context.request.url);

    // Extract post ID from dynamic route parameter or fallback to URL path segments
    let postId = '';
    if (context.params?.id) {
      postId = Array.isArray(context.params.id) ? context.params.id.join('/') : String(context.params.id);
    }
    if (!postId) {
      const segments = url.pathname.split('/').filter(Boolean);
      postId = segments[segments.length - 1] || '';
    }
    postId = decodeURIComponent(postId).trim();

    if (!postId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Post ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);
    const isProd = isProductionEnv(context.env);

    // 1. Check KV Cache for fast edge read
    const cacheKey = `post:${postId}`;
    let post: EdgePost | null = null;

    if (kv) {
      try {
        const cached = await kv.get<EdgePost>(cacheKey, 'json');
        if (cached && cached.id === postId) {
          post = cached;
        }
      } catch (_) {}
    }

    // 2. Query D1 Database if not in KV
    if (!post && db) {
      try {
        const stmt = db.prepare(
          "SELECT * FROM posts WHERE id = ? AND (status != 'shadowbanned' OR status IS NULL)"
        ).bind(postId);
        const row = await stmt.first<any>();
        if (row) {
          post = parseD1PostRow(row);
        }
      } catch (dbError: any) {
        if (isProd) {
          return new Response(
            JSON.stringify({ success: false, error: `Database error: ${dbError?.message || 'SQL error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
      }
    }

    // 3. In-memory fallback for non-production or isolate cache
    if (!post && !isProd) {
      const found = globalPostsStore.find(p => p.id === postId);
      if (found) {
        post = found;
      }
    }

    if (!post) {
      if (isProd && !db) {
        return createD1UnavailableResponse();
      }
      return new Response(
        JSON.stringify({ success: false, error: `Post not found: ${postId}` }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // Cache in KV for 60s
    if (kv) {
      try {
        await kv.put(cacheKey, JSON.stringify(post), { expirationTtl: 60 });
      } catch (_) {}
    }

    const ua = context.request.headers.get('User-Agent') || '';
    const acceptHeader = context.request.headers.get('Accept') || '';
    const isCrawler = SOCIAL_CRAWLER_REGEX.test(ua);
    const isDirectBrowserVisit = acceptHeader.includes('text/html') && !acceptHeader.includes('application/json');

    // 4. Return Server-Rendered OpenGraph HTML for crawlers and direct browser visits
    if (isCrawler || isDirectBrowserVisit) {
      const canonicalAppUrl = `${url.origin}/#post-${encodeURIComponent(postId)}`;
      const snippet = post.content ? post.content.replace(/\s+/g, ' ').slice(0, 200) : post.title;
      const primaryImage = (post.images && post.images.length > 0) ? post.images[0] : (post.video?.poster || '');
      const communityName = post.channelId ? post.channelId.replace(/^c\//, '') : 'technology';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(post.title)} - UREfy</title>
  <meta name="description" content="${escapeHtml(snippet)}">
  
  <!-- OpenGraph / Facebook / LinkedIn / Discord -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="UREfy">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${escapeHtml(snippet)}">
  <meta property="og:url" content="${escapeHtml(canonicalAppUrl)}">
  <meta property="og:image" content="${escapeHtml(primaryImage || `${url.origin}/icon-512.png`)}">
  
  <!-- Twitter Cards -->
  <meta name="twitter:card" content="${primaryImage ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:site" content="@UREfyNetwork">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${escapeHtml(snippet)}">
  <meta name="twitter:image" content="${escapeHtml(primaryImage || `${url.origin}/icon-512.png`)}">

  <!-- Canonical & Instant Client Navigation -->
  <link rel="canonical" href="${escapeHtml(canonicalAppUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalAppUrl)}">
  <script>
    if (window.location.hash !== '#post-${encodeURIComponent(postId)}') {
      window.location.replace('/#post-' + ${JSON.stringify(postId)});
    }
  </script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 680px;
      margin: 40px auto;
      padding: 0 20px;
      background: #0b0f17;
      color: #e2e8f0;
    }
    a { color: #38bdf8; text-decoration: none; font-weight: bold; }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 9999px;
      background: #1e293b;
      color: #94a3b8;
      font-size: 12px;
      margin-bottom: 12px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    h1 { font-size: 24px; margin: 10px 0 16px; color: #f8fafc; line-height: 1.3; }
    p { line-height: 1.6; color: #cbd5e1; font-size: 15px; }
    .card {
      padding: 24px;
      background: #131b2a;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
    }
  </style>
</head>
<body>
  <div class="card">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
      <img src="${url.origin}/logo-mark.svg" width="28" height="28" alt="UREfy" />
      <span style="font-weight: 800; font-size: 16px; letter-spacing: -0.02em; color: #ffffff;">URE<span style="color: #22d3ee;">fy</span></span>
      <span style="color: #64748b; font-size: 12px; margin-left: auto;">The social network you actually own</span>
    </div>
    <div class="badge">c/${escapeHtml(communityName)} · ${escapeHtml(post.flair || 'Post')}</div>
    <h1>${escapeHtml(post.title)}</h1>
    <p>${escapeHtml(post.content)}</p>
    <p style="margin-top: 24px;">
      <a href="${escapeHtml(canonicalAppUrl)}">Open full thread in UREfy &rarr;</a>
    </p>
  </div>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
          ...CORS_HEADERS,
        },
      });
    }

    // 5. Default: Return standard JSON EdgePost for client API fetches
    return new Response(
      JSON.stringify({
        success: true,
        post,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
          'ETag': `W/"post-${post.id}-${post.createdAt}"`,
          ...CORS_HEADERS,
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
