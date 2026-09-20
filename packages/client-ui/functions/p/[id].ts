import { seoError } from '../_seo-response.js';
// ===========================================================================
// UREfy — Cloudflare Pages Edge Function for /p/:id (Automatic Post SEO)
// Fetches post & comments from D1/KV and injects full dynamic SEO metatags,
// DiscussionForumPosting Schema.org with author.url, digitalSourceType, and comments
// ===========================================================================

import { Env, getD1Database, getKVStore } from '../api/_db.js';
import { injectPostSeo, SeoPostData } from '../_seo.js';

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
  let baseResponse: Response;
  try {
    baseResponse = await (env as any)?.ASSETS?.fetch(new URL('/', request.url));
  } catch (_) {
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
          `SELECT p.id, p.title, p.content, p.flair, p.author_id, p.created_at,
                  p.merit_votes, p.reply_count, p.images_json, p.status,
                  u.display_name, u.handle
           FROM posts p
           LEFT JOIN user_profiles u ON p.author_id = u.user_id
           WHERE p.id = ?`
        )
        .bind(postId)
        .first<any>();

      if (row) {
        if (row.status && !['published', 'pinned', 'locked', 'deleted'].includes(row.status)) return seoError(404);
        // Handle permanently deleted post -> HTTP 410 Gone
        if (row.status === 'deleted') {
          return new Response('410 Gone: This post has been deleted by its author or community moderator.', {
            status: 410,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'public, max-age=86400',
              'X-Robots-Tag': 'noindex, nofollow, unavailable_after: 2026-09-19T00:00:00Z',
            },
          });
        }

        post = {
          id: row.id,
          title: row.title,
          content: row.content,
          flair: row.flair,
          authorId: row.author_id,
          authorName: row.display_name,
          authorHandle: row.handle,
          createdAt: Number(row.created_at) || Date.now(),
          updatedAt: Number(row.created_at) || Date.now(),
          meritVotes: Number(row.merit_votes) || 0,
          replyCount: Number(row.reply_count) || 0,
          imagesJson: row.images_json,
          status: row.status,
        };

        // Query top 5 comments for DiscussionForumPosting Schema & SSR thread
        try {
          const commentRows = await db
            .prepare(
              `SELECT c.id, c.author_id, c.content, c.created_at, c.merit_votes, u.display_name, u.handle
               FROM comments c
               LEFT JOIN user_profiles u ON c.author_id = u.user_id
               WHERE c.post_id = ?
               ORDER BY c.merit_votes DESC, c.created_at ASC
               LIMIT 5`
            )
            .bind(postId)
            .all<any>();

          if (commentRows?.results) {
            post.comments = commentRows.results.map((c: any) => ({
              id: c.id,
              authorId: c.author_id,
              authorName: c.display_name,
              authorHandle: c.handle,
              content: c.content,
              createdAt: Number(c.created_at) || Date.now(),
              upvotes: Number(c.merit_votes) || 0,
            }));
          }
        } catch (_) {}

        // Cache in KV for 5 minutes
        if (kv && typeof context.waitUntil === 'function') {
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
  headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  headers.set('X-Robots-Tag', 'index, follow, max-image-preview:large, max-snippet:-1');

  return new Response(modifiedResponse.body, {
    status: 200,
    headers,
  });
}
