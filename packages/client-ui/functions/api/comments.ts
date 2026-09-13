// ===========================================================================
// UREfy — THREADED COMMENTS & REPLIES EDGE API (/api/comments)
// Supports: Nested discussion trees, sorting (best, top, new, old),
// automatic post reply_count updates, notifications, and D1 / in-memory fallback.
// ===========================================================================

import {
  Env,
  getD1Database,
  isProductionEnv,
  createD1UnavailableResponse,
  globalCommentsStore,
  globalPostsStore,
  globalNotificationsStore,
  globalBlocksStore,
  EdgeComment,
} from './_db.js';
import { requireAdmin, requireSignedEnvelope } from './_auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * GET /api/comments
 * Query params:
 *  - postId: string (required)
 *  - sort: 'best' | 'top' | 'new' | 'old' (default 'best')
 */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const postId = (url.searchParams.get('postId') || '').trim();
    const sort = (url.searchParams.get('sort') || 'best').trim().toLowerCase();

    if (!postId) {
      return new Response(
        JSON.stringify({ success: false, error: 'postId parameter is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    let comments: EdgeComment[] = [];

    if (db) {
      let orderBy = 'merit_votes DESC, created_at DESC';
      if (sort === 'top') orderBy = 'merit_votes DESC';
      else if (sort === 'new') orderBy = 'created_at DESC';
      else if (sort === 'old') orderBy = 'created_at ASC';

      const res = await db
        .prepare(`SELECT * FROM comments WHERE post_id = ? ORDER BY ${orderBy} LIMIT 200`)
        .bind(postId)
        .all<any>();

      comments = (res.results || []).map(r => ({
        id: r.id,
        postId: r.post_id,
        parentId: r.parent_id || undefined,
        authorId: r.author_id,
        authorRole: r.author_role || 'MEMBER',
        content: r.content,
        meritVotes: Number(r.merit_votes) || 0,
        createdAt: Number(r.created_at),
      }));
    } else {
      let list = globalCommentsStore.filter(c => c.postId === postId);
      if (sort === 'new') list = list.sort((a, b) => b.createdAt - a.createdAt);
      else if (sort === 'old') list = list.sort((a, b) => a.createdAt - b.createdAt);
      else list = list.sort((a, b) => b.meritVotes - a.meritVotes || b.createdAt - a.createdAt);
      comments = list;
    }

    return new Response(
      JSON.stringify({
        success: true,
        postId,
        count: comments.length,
        comments,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to fetch comments' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

/**
 * POST /api/comments
 * Body: { postId, parentId?, authorId, authorRole?, content, envelope? }
 */
export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const body = await context.request.json().catch(() => null) as Record<string, any> | null;
    if (!body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    let postId = (body.postId || '').trim();
    let parentId = typeof body.parentId === 'string' && body.parentId.trim() ? body.parentId.trim() : undefined;
    let authorId = (body.authorId || '').trim();
    let authorRole = (body.authorRole || 'MEMBER').trim();
    let content = (body.content || '').trim();

    // Check signed envelope
    if (body.envelope && typeof body.envelope === 'object') {
      const auth = await requireSignedEnvelope(context, body.envelope);
      if (auth.authorized) {
        authorId = auth.fingerprint || authorId;
        const payload = (auth.payload || {}) as any;
        postId = (payload.postId || postId).trim();
        parentId = payload.parentId ? String(payload.parentId).trim() : parentId;
        content = (payload.content || content).trim();
        if (payload.authorRole) authorRole = String(payload.authorRole).trim();
      }
    }

    if (!postId || !authorId || !content) {
      return new Response(
        JSON.stringify({ success: false, error: 'postId, authorId, and content are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (content.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Comment exceeds 5,000 character limit' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    const commentId = `comm_${Date.now()}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
    const now = Date.now();

    const newComment: EdgeComment = {
      id: commentId,
      postId,
      parentId,
      authorId,
      authorRole,
      content,
      meritVotes: 0,
      createdAt: now,
    };

    if (db) {
      await db.batch([
        db.prepare(
          `INSERT INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
        ).bind(commentId, postId, parentId || null, authorId, authorRole, content, now),
        db.prepare('UPDATE posts SET reply_count = reply_count + 1 WHERE id = ?').bind(postId),
      ]);

      // Trigger notification to target recipient (post author or parent comment author)
      let recipientId: string | null = null;
      let notifType: 'reply_post' | 'reply_comment' = 'reply_post';

      if (parentId) {
        const parentRow = await db.prepare('SELECT author_id FROM comments WHERE id = ?').bind(parentId).first<{ author_id: string }>();
        if (parentRow && parentRow.author_id !== authorId) {
          recipientId = parentRow.author_id;
          notifType = 'reply_comment';
        }
      } else {
        const postRow = await db.prepare('SELECT author_id FROM posts WHERE id = ?').bind(postId).first<{ author_id: string }>();
        if (postRow && postRow.author_id !== authorId) {
          recipientId = postRow.author_id;
          notifType = 'reply_post';
        }
      }

      if (recipientId) {
        const notifId = `notif_${Date.now()}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
        await db.prepare(
          `INSERT INTO notifications (id, user_id, actor_id, actor_name, type, target_id, target_type, preview_text, is_read, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
        ).bind(
          notifId, recipientId, authorId, authorId.slice(0, 10), notifType, postId, 'post', content.slice(0, 100), now
        ).run();
      }
    } else {
      globalCommentsStore.unshift(newComment);
      const post = globalPostsStore.find(p => p.id === postId);
      if (post) post.replyCount = (post.replyCount || 0) + 1;
    }

    return new Response(
      JSON.stringify({ success: true, comment: newComment }),
      { status: 201, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to create comment' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

/**
 * DELETE /api/comments
 * Query or body: { id: string, userId: string }
 */
export async function onRequestDelete(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    let id = (url.searchParams.get('id') || '').trim();
    let userId = (url.searchParams.get('userId') || '').trim();

    if (!id || !userId) {
      const body = await context.request.json().catch(() => null) as Record<string, any> | null;
      if (body) {
        id = typeof body.id === 'string' ? body.id.trim() : id;
        userId = typeof body.userId === 'string' ? body.userId.trim() : userId;
      }
    }

    if (!id || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'id and userId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const adminCheck = await requireAdmin(context);
    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    if (db) {
      const commentRow = await db.prepare('SELECT post_id, author_id FROM comments WHERE id = ?').bind(id).first<{ post_id: string; author_id: string }>();
      if (!commentRow) {
        return new Response(
          JSON.stringify({ success: false, error: 'Comment not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (commentRow.author_id !== userId && !adminCheck.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden: only author or admin can delete comment' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      await db.batch([
        db.prepare('DELETE FROM comments WHERE id = ?').bind(id),
        db.prepare('UPDATE posts SET reply_count = MAX(0, reply_count - 1) WHERE id = ?').bind(commentRow.post_id),
      ]);
    } else {
      const idx = globalCommentsStore.findIndex(c => c.id === id);
      if (idx >= 0) {
        const c = globalCommentsStore[idx];
        if (c.authorId !== userId && !adminCheck.authorized) {
          return new Response(
            JSON.stringify({ success: false, error: 'Forbidden: only author or admin can delete comment' }),
            { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
        globalCommentsStore.splice(idx, 1);
        const post = globalPostsStore.find(p => p.id === c.postId);
        if (post && post.replyCount > 0) post.replyCount--;
      }
    }

    return new Response(
      JSON.stringify({ success: true, id, deleted: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to delete comment' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
