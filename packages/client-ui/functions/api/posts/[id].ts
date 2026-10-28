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
  globalFacetsStore,
  globalFacetFollowsStore,
  globalFacetMembersStore,
  globalFollowsStore,
  globalCommunityMembersStore,
  isProductionEnv,
  createD1UnavailableResponse,
} from '../_db.js';
import { parseD1PostRow } from '../posts.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint, X-Facet-Id',
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

interface CachedEdgePost extends EdgePost {
  _facetStatus?: string;
  _facetIsPubliclyLinked?: boolean;
}

export async function onRequestGet(context: {
  request: Request;
  env?: Env;
  params: { id?: string | string[] };
}): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    let postId = '';
    if (context.params?.id) {
      postId = Array.isArray(context.params.id)
        ? context.params.id.join('/')
        : String(context.params.id);
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

    // 1. Check KV Cache for fast edge read (canonical unmutated post)
    const cacheKey = `post:${postId}`;
    let post: CachedEdgePost | null = null;
    if (kv) {
      try {
        const cached = await kv.get<CachedEdgePost>(cacheKey, 'json');
        if (
          cached &&
          cached.id === postId &&
          (!cached.status || ['published', 'pinned'].includes(cached.status))
        ) {
          post = cached;
        }
      } catch (_) {}
    }

    // 2. Query D1 Database if not in KV
    let d1Row: any = null;
    if (!post && db) {
      try {
        const stmt = db
          .prepare(
            `SELECT posts.*,
              CASE
                WHEN posts.facet_id IS NOT NULL THEN (
                  CASE
                    WHEN facets.status = 'deleted' THEN '[Deleted Context]'
                    ELSE COALESCE(facets.display_name, '[Deleted Context]')
                  END
                )
                ELSE profiles.display_name
              END AS author_display_name,
              CASE
                WHEN posts.facet_id IS NOT NULL THEN (
                  CASE
                    WHEN facets.status = 'deleted' THEN NULL
                    ELSE facets.handle
                  END
                )
                ELSE profiles.handle
              END AS author_handle,
              CASE
                WHEN posts.facet_id IS NOT NULL THEN (
                  CASE
                    WHEN facets.status = 'deleted' THEN NULL
                    ELSE facets.avatar_url
                  END
                )
                ELSE profiles.avatar_url
              END AS author_avatar_url,
              facets.is_publicly_linked AS facet_is_publicly_linked,
              facets.status AS facet_status
             FROM posts
             LEFT JOIN facets ON facets.id = posts.facet_id
             LEFT JOIN user_profiles profiles ON profiles.user_id = posts.author_id
             WHERE posts.id = ? AND posts.status IN ('published', 'pinned')`
          )
          .bind(postId);
        d1Row = await stmt.first<any>();
        if (d1Row) {
          post = parseD1PostRow(d1Row);
        }
      } catch (dbError: any) {
        if (isProd) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Database error: ${dbError?.message || 'SQL error'}`,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
      }
    }

    // 3. In-memory fallback for non-production or isolate cache
    if (!post && !isProd) {
      const found = globalPostsStore.find(
        (p) => p.id === postId && (!p.status || ['published', 'pinned'].includes(p.status))
      );
      if (found) {
        post = { ...found };
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

    const ua = context.request.headers.get('User-Agent') || '';
    const acceptHeader = context.request.headers.get('Accept') || '';
    const isCrawler = SOCIAL_CRAWLER_REGEX.test(ua);
    const isDirectBrowserVisit =
      acceptHeader.includes('text/html') && !acceptHeader.includes('application/json');
    const callerFingerprint = (context.request.headers.get('X-User-Fingerprint') || '').trim();
    const callerFacetId = (
      url.searchParams.get('facetId') ||
      context.request.headers.get('X-Facet-Id') ||
      ''
    ).trim();

    // Nu permite niciodată ca X-Facet-Id singur să acorde drepturi de proprietar (isOwner),
    // deoarece post.facetId este public și ar dezanonimiza post.authorFingerprint!
    const isOwner = Boolean(callerFingerprint && callerFingerprint === post.authorFingerprint);

    // Enforce Audience Privacy
    if (post.audience && post.audience !== 'public') {
      if (isCrawler || isDirectBrowserVisit) {
        return new Response('404 Not Found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      if (!callerFingerprint && !callerFacetId) {
        return new Response(
          JSON.stringify({ success: false, error: `Post not found: ${postId}` }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
      if (!isOwner) {
        let authorized = false;
        const safePostFacetId = post.facetId ?? null;
        const safeChannelId = post.channelId ?? '';
        const safeAuthorFp = post.authorFingerprint ?? '';

        if (post.audience === 'community') {
          if (callerFacetId) {
            if (db) {
              const memberCheck = await db
                .prepare(
                  'SELECT 1 FROM facet_community_memberships WHERE community_id = ? AND facet_id = ? LIMIT 1'
                )
                .bind(safeChannelId, callerFacetId)
                .first();
              authorized = Boolean(memberCheck);
            } else {
              authorized = globalFacetMembersStore.some(
                (m) => m.communityId === safeChannelId && m.facetId === callerFacetId
              );
            }
          }
          if (!authorized && callerFingerprint) {
            if (db) {
              const memberCheck = await db
                .prepare(
                  `SELECT 1 FROM facet_community_memberships fcm
                   JOIN facets f ON f.id = fcm.facet_id
                   WHERE fcm.community_id = ? AND f.owner_fingerprint = ?
                   UNION
                   SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ? LIMIT 1`
                )
                .bind(safeChannelId, callerFingerprint, safeChannelId, callerFingerprint)
                .first();
              authorized = Boolean(memberCheck);
            } else {
              authorized =
                globalFacetMembersStore.some((m) => {
                  if (m.communityId !== safeChannelId) return false;
                  const f = globalFacetsStore.find((fac) => fac.id === m.facetId);
                  return Boolean(f && f.ownerFingerprint === callerFingerprint);
                }) ||
                globalCommunityMembersStore.some(
                  (m) => m.communityId === safeChannelId && m.userId === callerFingerprint
                );
            }
          }
        } else if (post.audience === 'followers') {
          if (callerFacetId) {
            if (db) {
              if (safePostFacetId) {
                const followCheck = await db
                  .prepare(
                    'SELECT 1 FROM facet_follows WHERE following_facet_id = ? AND follower_facet_id = ? LIMIT 1'
                  )
                  .bind(safePostFacetId, callerFacetId)
                  .first();
                authorized = Boolean(followCheck);
              }
            } else if (safePostFacetId) {
              authorized = globalFacetFollowsStore.some(
                (ff) =>
                  ff.followingFacetId === safePostFacetId &&
                  ff.followerFacetId === callerFacetId
              );
            }
          }
          if (!authorized && callerFingerprint) {
            if (db) {
              const followCheck = await db
                .prepare(
                  `SELECT 1 FROM facet_follows ff
                   JOIN facets f ON f.id = ff.follower_facet_id
                   WHERE ff.following_facet_id = ? AND f.owner_fingerprint = ?
                   UNION
                   SELECT 1 FROM follows WHERE following_id = ? AND follower_id = ? LIMIT 1`
                )
                .bind(safePostFacetId, callerFingerprint, safeAuthorFp, callerFingerprint)
                .first();
              authorized = Boolean(followCheck);
            } else {
              authorized =
                globalFacetFollowsStore.some((ff) => {
                  if (!safePostFacetId || ff.followingFacetId !== safePostFacetId) return false;
                  const f = globalFacetsStore.find((fac) => fac.id === ff.followerFacetId);
                  return Boolean(f && f.ownerFingerprint === callerFingerprint);
                }) ||
                globalFollowsStore.some(
                  (f) => f.followingId === safeAuthorFp && f.followerId === callerFingerprint
                );
            }
          }
        }

        if (!authorized) {
          return new Response(
            JSON.stringify({ success: false, error: `Post not found: ${postId}` }),
            { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
      }
    }

    const facetMem = post.facetId
      ? globalFacetsStore.find((f) => f.id === post!.facetId)
      : undefined;
    const facetStatus = d1Row?.facet_status ?? post._facetStatus ?? facetMem?.status;
    const isPubliclyLinked =
      d1Row?.facet_is_publicly_linked === 1 ||
      post._facetIsPubliclyLinked === true ||
      Boolean(facetMem?.isPubliclyLinked);

    // Cache canonical representation in KV for 60s (strictly public posts only)
    if (kv && (!post.audience || post.audience === 'public') && d1Row) {
      try {
        const canonicalToCache: CachedEdgePost = {
          ...post,
          _facetStatus: facetStatus,
          _facetIsPubliclyLinked: isPubliclyLinked,
        };
        await kv.put(cacheKey, JSON.stringify(canonicalToCache), { expirationTtl: 3600 });
      } catch (_) {}
    }

    // Per-request public unlinkability sanitization
    const sanitizedPost: CachedEdgePost = { ...post };
    delete sanitizedPost._facetStatus;
    delete sanitizedPost._facetIsPubliclyLinked;

    if (sanitizedPost.facetId && facetStatus === 'deleted') {
      sanitizedPost.authorDisplayName = '[Deleted Context]';
      sanitizedPost.authorHandle = undefined;
      sanitizedPost.authorAvatarUrl = undefined;
    }
    if (!isOwner && !isPubliclyLinked && sanitizedPost.facetId) {
      sanitizedPost.authorFingerprint = sanitizedPost.facetId;
    }

    // 4. Return Server-Rendered OpenGraph HTML for crawlers and direct browser visits
    if (isCrawler || isDirectBrowserVisit) {
      const canonicalAppUrl = `${url.origin}/#post-${encodeURIComponent(postId)}`;
      const snippet = sanitizedPost.content
        ? sanitizedPost.content.replace(/\s+/g, ' ').slice(0, 200)
        : sanitizedPost.title;
      const primaryImage =
        sanitizedPost.images && sanitizedPost.images.length > 0
          ? sanitizedPost.images[0]
          : sanitizedPost.video?.poster || '';
      const communityName = sanitizedPost.channelId
        ? sanitizedPost.channelId.replace(/^c\//, '')
        : 'technology';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(sanitizedPost.title)} - UREfy</title>
  <meta name="description" content="${escapeHtml(snippet)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="UREfy">
  <meta property="og:title" content="${escapeHtml(sanitizedPost.title)}">
  <meta property="og:description" content="${escapeHtml(snippet)}">
  <meta property="og:url" content="${escapeHtml(canonicalAppUrl)}">
  <meta property="og:image" content="${escapeHtml(primaryImage || `${url.origin}/icon-512.png`)}">
  <meta name="twitter:card" content="${primaryImage ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:site" content="@UREfyNetwork">
  <meta name="twitter:title" content="${escapeHtml(sanitizedPost.title)}">
  <meta name="twitter:description" content="${escapeHtml(snippet)}">
  <meta name="twitter:image" content="${escapeHtml(primaryImage || `${url.origin}/icon-512.png`)}">
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
    <div class="badge">c/${escapeHtml(communityName)} · ${escapeHtml(sanitizedPost.flair || 'Post')}</div>
    <h1>${escapeHtml(sanitizedPost.title)}</h1>
    <p>${escapeHtml(sanitizedPost.content)}</p>
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
    const isPrivate = Boolean(
      (post.audience && post.audience !== 'public') || callerFingerprint || callerFacetId
    );
    return new Response(
      JSON.stringify({
        success: true,
        post: sanitizedPost,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': isPrivate
            ? 'private, no-cache, no-store, must-revalidate'
            : 'public, max-age=60, s-maxage=3600, stale-while-revalidate=120',
          'Vary': 'Accept, Authorization, X-User-Fingerprint, X-Facet-Id',
          'ETag': `W/"post-${sanitizedPost.id}-${sanitizedPost.createdAt}-${sanitizedPost.replyCount}"`,
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

export { onRequestDelete } from '../posts.js';
