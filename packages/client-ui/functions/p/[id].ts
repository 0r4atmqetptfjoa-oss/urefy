import { headHandler } from '../_head.js';
import { seoError } from '../_seo-response.js';
// ===========================================================================
// UREfy — Cloudflare Pages Edge Function for /p/:id (Automatic Post SEO)
// Fetches post & comments from D1/KV and injects full dynamic SEO metatags,
// DiscussionForumPosting Schema.org with author.url, digitalSourceType, and comments
// ===========================================================================

import { Env, getD1Database, getKVStore } from '../api/_db.js';
import { injectPostSeo, SeoPostData } from '../_seo.js';
import { INDEXABLE_POST_SQL, hasPublicPostContent, PUBLIC_ROBOTS } from '../_discovery.js';

export async function onRequestGet(context: {
  request: Request;
  env?: Env;
  params: { id: string };
  waitUntil?: (p: Promise<any>) => void;
}): Promise<Response> {
  const { request, env, params } = context;
  const url = new URL(request.url);
  let postId: string;
  try { postId = params.id ? decodeURIComponent(params.id).trim() : ''; } catch { return seoError(404); }

  // 1. Fetch the static base HTML from Cloudflare Pages Assets
  let baseResponse: Response | null = null;
  try {
    if ((env as any)?.ASSETS?.fetch) {
      baseResponse = await (env as any).ASSETS.fetch(new URL('/', request.url));
    }
  } catch (_) {}

  if (!baseResponse) {
    baseResponse = new Response('<!DOCTYPE html><html><head><title>UREfy</title></head><body><div id="app"></div></body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (!postId) {
    return seoError(404);
  }

  const db = getD1Database(env);
  const kv = getKVStore(env);

  let post: SeoPostData | null = null;

  // 3. If not cached, query D1 SQL database
  if (!db) return seoError(503);
  if (db) {
    try {
      const row = await db
        .prepare(
          `SELECT p.id, p.title, p.content, p.flair, p.author_id, p.created_at, p.channel_id,
                  p.merit_votes, p.reply_count, p.images_json, p.video_json, p.attachment_json,
                  p.poll_id, p.quoted_post_json, p.status, p.audience, p.facet_id,
                  f.is_publicly_linked, f.status AS facet_status,
                  CASE WHEN u.user_id IS NOT NULL AND (p.facet_id IS NULL OR (f.is_publicly_linked = 1 AND f.status != 'deleted')) THEN u.user_id ELSE NULL END AS public_profile_id,
                  CASE
                    WHEN p.facet_id IS NOT NULL THEN (
                      CASE
                        WHEN f.status = 'deleted' THEN '[Deleted Context]'
                        ELSE COALESCE(f.display_name, '[Deleted Context]')
                      END
                    )
                    ELSE u.display_name
                  END AS display_name,
                  CASE
                    WHEN p.facet_id IS NOT NULL THEN (
                      CASE
                        WHEN f.status = 'deleted' THEN NULL
                        ELSE f.handle
                      END
                    )
                    ELSE u.handle
                  END AS handle
           FROM posts p
           LEFT JOIN facets f ON p.facet_id = f.id
           LEFT JOIN user_profiles u ON p.author_id = u.user_id
           WHERE p.id = ?
             AND NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'post' AND sf.resource_id = p.id)`
        )
        .bind(postId)
        .first<any>();

      if (row) {
        if (row.audience && row.audience !== 'public') return seoError(404);
        if (row.status && !['published', 'pinned', 'locked', 'deleted'].includes(row.status)) return seoError(404);
        // Handle permanently deleted post -> HTTP 410 Gone
        if (row.status === 'deleted') {
          return new Response('410 Gone: This post has been deleted by its author or community moderator.', {
            status: 410,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'public, max-age=86400',
              'X-Robots-Tag': 'noindex, nofollow',
            },
          });
        }

        const isLinked = row.is_publicly_linked === 1 || row.is_publicly_linked === true;
        const authorId = (row.facet_id && !isLinked) ? row.facet_id : row.author_id;

        post = {
          id: row.id,
          title: row.title,
          content: row.content,
          flair: row.flair,
          authorId,
          authorName: row.display_name,
          authorHandle: row.handle,
          authorProfileId: (row.facet_id && !isLinked) ? row.facet_id : (row.public_profile_id || null),
          createdAt: Number(row.created_at) || Date.now(),
          meritVotes: Number(row.merit_votes) || 0,
          replyCount: Number(row.reply_count) || 0,
          imagesJson: row.images_json,
          videoJson: row.video_json,
          attachmentJson: row.attachment_json,
          quotedPostJson: row.quoted_post_json,
          pollId: row.poll_id,
          status: row.status,
        };

        try {
          post.relatedPosts = (await db.prepare(`SELECT id, title FROM posts WHERE channel_id = ? AND id != ? AND ${INDEXABLE_POST_SQL} ORDER BY created_at DESC, id LIMIT 6`).bind(row.channel_id, postId).all<{ id: string; title: string }>()).results;
        } catch { /* The post remains readable if optional related links are unavailable. */ }

        // Query top 5 comments for DiscussionForumPosting Schema & SSR thread
        try {
          const commentRows = await db
            .prepare(
              `SELECT c.id, c.author_id, c.content, c.created_at, c.merit_votes, c.facet_id,
                      f.is_publicly_linked, f.status AS facet_status,
                      CASE WHEN u.user_id IS NOT NULL AND (c.facet_id IS NULL OR (f.is_publicly_linked = 1 AND f.status != 'deleted')) THEN u.user_id ELSE NULL END AS public_profile_id,
                      CASE
                        WHEN c.facet_id IS NOT NULL THEN (
                          CASE
                            WHEN f.status = 'deleted' THEN '[Deleted Context]'
                            ELSE COALESCE(f.display_name, '[Deleted Context]')
                          END
                        )
                        ELSE u.display_name
                      END AS display_name,
                      CASE
                        WHEN c.facet_id IS NOT NULL THEN (
                          CASE
                            WHEN f.status = 'deleted' THEN NULL
                            ELSE f.handle
                          END
                        )
                        ELSE u.handle
                      END AS handle
               FROM comments c
               LEFT JOIN facets f ON c.facet_id = f.id
               LEFT JOIN user_profiles u ON c.author_id = u.user_id
               WHERE c.post_id = ?
                 AND NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'comment' AND sf.resource_id = c.id)
               ORDER BY c.merit_votes DESC, c.created_at ASC
               LIMIT 5`
            )
            .bind(postId)
            .all<any>();

          if (commentRows?.results) {
            post.comments = commentRows.results.map((c: any) => {
              const cLinked = c.is_publicly_linked === 1 || c.is_publicly_linked === true;
              return {
                id: c.id,
                authorId: (c.facet_id && !cLinked) ? c.facet_id : c.author_id,
                authorName: c.display_name,
                authorHandle: c.handle,
                authorProfileId: (c.facet_id && !cLinked) ? c.facet_id : (c.public_profile_id || null),
                content: c.content,
                createdAt: Number(c.created_at) || Date.now(),
                upvotes: Number(c.merit_votes) || 0,
              };
            });
          }
        } catch (_) {}

        // Cache in KV for 5 minutes
        if (request.method === 'GET' && kv && typeof context.waitUntil === 'function') {
          context.waitUntil(
            kv.put(`seo:post:${postId}`, JSON.stringify(post), { expirationTtl: 300 }).catch(() => {})
          );
        }
      }
    } catch (err) {
      return seoError(503);
    }
  }

  if (!post) {
    return seoError(404);
  }

  // 4. Inject dynamic SEO metatags, OpenGraph, Twitter cards & Schema.org JSON-LD
  const modifiedResponse = injectPostSeo(baseResponse, post, url);

  const headers = new Headers(modifiedResponse.headers);
  headers.set('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=300');
  headers.set('X-Robots-Tag', hasPublicPostContent(post) ? PUBLIC_ROBOTS : 'noindex, follow');

  return new Response(modifiedResponse.body, {
    status: 200,
    headers,
  });
}

export const onRequestHead = headHandler(onRequestGet);
