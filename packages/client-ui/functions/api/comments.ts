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
  EdgeComment,
} from './_db.js';
import { requireAdmin, requireSignedEnvelope } from './_auth.js';
import { ensureSyntheticFixturesTable, parseSyntheticFixtureMetadata, registerSyntheticFixture } from './_synthetic.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint',
};

const failure = (error: string, status: number) => new Response(JSON.stringify({ success: false, error }), {
  status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
});
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9:_-]{1,160}$/i.test(value);

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
    const userFingerprint = (url.searchParams.get('userFingerprint') || context.request.headers.get('X-User-Fingerprint') || '').trim();

    if (!validId(postId)) {
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
      const post = await db.prepare("SELECT id FROM posts WHERE id = ? AND status IN ('published', 'pinned')").bind(postId).first();
      if (!post) return failure('Discussion not found', 404);
      let orderBy = 'merit_votes DESC, created_at DESC';
      if (sort === 'top') orderBy = 'merit_votes DESC';
      else if (sort === 'new') orderBy = 'created_at DESC';
      else if (sort === 'old') orderBy = 'created_at ASC';

      const res = await db
        .prepare(`SELECT comments.*, p.display_name AS author_display_name,
                  p.handle AS author_handle, p.avatar_url AS author_avatar_url
                  FROM comments
                  LEFT JOIN user_profiles p ON p.user_id = comments.author_id
                  WHERE comments.post_id = ? ORDER BY ${orderBy} LIMIT 200`)
        .bind(postId)
        .all<any>();

      comments = (res.results || []).map(r => ({
        id: r.id,
        postId: r.post_id,
        parentId: r.parent_id || undefined,
        authorId: r.author_id,
        authorRole: r.author_role || 'MEMBER',
        authorDisplayName: r.author_display_name || undefined,
        authorHandle: r.author_handle || undefined,
        authorAvatarUrl: r.author_avatar_url || undefined,
        content: r.content,
        meritVotes: Number(r.merit_votes) || 0,
        createdAt: Number(r.created_at),
      }));

      if (comments.length > 0) {
        if (userFingerprint) {
          try {
            const blocksRes = await db.prepare('SELECT blocked_id FROM user_blocks WHERE blocker_id = ?').bind(userFingerprint).all<{ blocked_id: string }>();
            const mutesRes = await db.prepare('SELECT muted_id FROM user_mutes WHERE muter_id = ?').bind(userFingerprint).all<{ muted_id: string }>();
            const blockedSet = new Set((blocksRes.results || []).map(r => r.blocked_id));
            const mutedSet = new Set((mutesRes.results || []).map(r => r.muted_id));
            if (blockedSet.size > 0 || mutedSet.size > 0) {
              comments = comments.filter(c => !blockedSet.has(c.authorId) && !mutedSet.has(c.authorId));
            }
          } catch (_) {}
        }
        const commentIds = comments.map(c => c.id);
        const placeholders = commentIds.map(() => '?').join(',');

        // 1. User votes
        const userVotesMap = new Map<string, number>();
        if (userFingerprint) {
          try {
            const votesRes = await db.prepare(
              `SELECT target_id, direction FROM votes WHERE target_type = 'comment' AND user_fingerprint = ? AND target_id IN (${placeholders})`
            ).bind(userFingerprint, ...commentIds).all<{ target_id: string; direction: number }>();
            if (votesRes.results) {
              for (const v of votesRes.results) {
                userVotesMap.set(v.target_id, Number(v.direction) || 0);
              }
            }
          } catch (_) {}
        }

        // 2. Likes count and userLiked
        const likesCountMap = new Map<string, number>();
        const userLikedSet = new Set<string>();
        try {
          const likesRes = await db.prepare(
            `SELECT target_id, user_fingerprint, COUNT(*) as cnt FROM interactions WHERE target_type = 'comment' AND interaction_type = 'like' AND target_id IN (${placeholders}) GROUP BY target_id, user_fingerprint`
          ).bind(...commentIds).all<{ target_id: string; user_fingerprint: string; cnt: number }>();
          if (likesRes.results) {
            for (const row of likesRes.results) {
              likesCountMap.set(row.target_id, (likesCountMap.get(row.target_id) || 0) + (Number(row.cnt) || 1));
              if (userFingerprint && row.user_fingerprint === userFingerprint) {
                userLikedSet.add(row.target_id);
              }
            }
          }
        } catch (_) {}

        // 3. Comment awards
        const commentAwardsMap = new Map<string, Map<string, number>>();
        try {
          const awardsRes = await db.prepare(
            `SELECT target_id, value, COUNT(*) as cnt FROM interactions WHERE target_type = 'comment' AND interaction_type = 'award' AND target_id IN (${placeholders}) GROUP BY target_id, value`
          ).bind(...commentIds).all<{ target_id: string; value: string; cnt: number }>();
          if (awardsRes.results) {
            for (const row of awardsRes.results) {
              if (!commentAwardsMap.has(row.target_id)) {
                commentAwardsMap.set(row.target_id, new Map());
              }
              const m = commentAwardsMap.get(row.target_id)!;
              m.set(row.value, (m.get(row.value) || 0) + (Number(row.cnt) || 1));
            }
          }
        } catch (_) {}

        for (const c of comments) {
          c.userVote = userVotesMap.get(c.id) || 0;
          c.likesCount = likesCountMap.get(c.id) || 0;
          c.userLiked = userLikedSet.has(c.id);
          const awardEntries = commentAwardsMap.get(c.id);
          c.awards = awardEntries
            ? Array.from(awardEntries.entries()).map(([awardId, count]) => ({ awardId, count }))
            : [];
        }
      }
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

    const auth = await requireSignedEnvelope(context, body.envelope || body);
    if (!auth.authorized) return auth.response!;
    const payload = auth.payload;
    if (payload?.action !== 'create-comment') return failure('Invalid comment action', 400);
    const postId = payload.postId;
    const parentId = payload.parentId;
    const authorId = auth.fingerprint!;
    const content = typeof payload.content === 'string' ? payload.content.trim() : '';
    const syntheticMetadata = parseSyntheticFixtureMetadata(payload);
    // Roles are assigned by the server, never by a self-asserted request field.
    let authorRole = 'MEMBER';

    if (!validId(postId) || (parentId !== undefined && !validId(parentId)) || !content) {
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

    if (db) {
      const post = await db.prepare("SELECT id, author_id FROM posts WHERE id = ? AND status IN ('published', 'pinned')").bind(postId).first<{ id: string; author_id: string }>();
      if (!post) return failure('Discussion not found', 404);
      if (parentId && !await db.prepare('SELECT id FROM comments WHERE id = ? AND post_id = ?').bind(parentId, postId).first()) return failure('Reply source is not in this discussion', 400);

      // Enforce user safety block check
      if (post.author_id) {
        try {
          await db.prepare('CREATE TABLE IF NOT EXISTS user_blocks (blocker_id TEXT NOT NULL, blocked_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (blocker_id, blocked_id))').run();
          const isBlocked = await db.prepare(
            'SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1'
          ).bind(post.author_id, authorId, authorId, post.author_id).first();
          if (isBlocked) return failure('Cannot comment on this discussion due to user safety blocks', 403);
        } catch (_) {}
      }

      const role = await db.prepare('SELECT role, is_quarantined FROM user_roles WHERE fingerprint = ?').bind(authorId).first<{ role: string; is_quarantined: number }>();
      if (role?.is_quarantined) return failure('This account cannot post comments', 403);
      if (role?.role) authorRole = role.role;
    } else {
      const post = globalPostsStore.find(post => post.id === postId && (!post.status || ['published', 'pinned'].includes(post.status)));
      if (!post) return failure('Discussion not found', 404);
      if (parentId && !globalCommentsStore.some(comment => comment.id === parentId && comment.postId === postId)) return failure('Reply source is not in this discussion', 400);
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
      ...(syntheticMetadata || {}),
    };

    if (db) {
      await db.batch([
        db.prepare(
          `INSERT INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
        ).bind(commentId, postId, parentId || null, authorId, authorRole, content, now),
        db.prepare('UPDATE posts SET reply_count = (SELECT COUNT(*) FROM comments WHERE post_id = ?) WHERE id = ?').bind(postId, postId),
      ]);
      if (syntheticMetadata) {
        await ensureSyntheticFixturesTable(db);
        await registerSyntheticFixture(db, 'comment', commentId, syntheticMetadata);
      }

      try {
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
        const actorProfile = await db.prepare('SELECT display_name FROM user_profiles WHERE user_id = ?').bind(authorId).first<{ display_name: string }>();
        const notifId = `notif_${Date.now()}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
        await storeNotification(db, { id: notifId, userId: recipientId, actorId: authorId, actorName: actorProfile?.display_name || 'Profile not set up', type: notifType, targetId: postId, targetType: 'post', previewText: content.slice(0, 100), createdAt: now });
      }
      } catch (error) {
        // The comment has committed. Do not turn a notification outage into a
        // failed send and encourage the author to publish the same reply twice.
        console.warn('[Comments] Notification could not be stored', error);
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
    const body = await context.request.json().catch(() => null) as Record<string, any> | null;
    const adminCheck = await requireAdmin(context);
    let id: string;
    let userId = '';
    if (adminCheck.authorized) {
      id = body?.id;
    } else {
      const auth = await requireSignedEnvelope(context, body?.envelope || body);
      if (!auth.authorized) return auth.response!;
      if (auth.payload?.action !== 'delete-comment') return failure('Invalid comment action', 400);
      id = auth.payload.id;
      userId = auth.fingerprint!;
    }
    if (!validId(id)) return failure('A valid comment id is required', 400);
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
        db.prepare('UPDATE posts SET reply_count = (SELECT COUNT(*) FROM comments WHERE post_id = ?) WHERE id = ?').bind(commentRow.post_id, commentRow.post_id),
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

/**
 * PATCH /api/comments
 * Body: signed envelope with { action: 'vote-comment', commentId, direction: 1 | -1 | 0 }
 */
export async function onRequestPatch(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const body = await context.request.json().catch(() => null) as Record<string, any> | null;
    if (!body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const auth = await requireSignedEnvelope(context, body.envelope || body);
    if (!auth.authorized) return auth.response!;
    const payload = auth.payload;
    if (payload?.action !== 'vote-comment') return failure('Invalid comment vote action', 400);

    const commentId = payload.commentId;
    const direction = Number(payload.direction);
    const voterId = auth.fingerprint!;

    if (!validId(commentId) || ![-1, 0, 1].includes(direction)) {
      return failure('Valid commentId and direction (-1, 0, or 1) are required', 400);
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    let newMeritScore = 0;

    if (db) {
      // Check user quarantine
      const role = await db.prepare('SELECT is_quarantined FROM user_roles WHERE fingerprint = ?').bind(voterId).first<{ is_quarantined: number }>();
      if (role?.is_quarantined) return failure('This account cannot vote on comments', 403);

      // Check comment exists and belongs to an active post
      const commentRow = await db.prepare(
        "SELECT c.id, c.merit_votes, p.status FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = ? AND p.status IN ('published', 'pinned')"
      ).bind(commentId).first<{ id: string; merit_votes: number; status: string }>();

      if (!commentRow) {
        return failure('Comment not found or unavailable', 404);
      }

      // Check existing vote
      const prevVote = await db.prepare(
        "SELECT direction FROM votes WHERE target_type = 'comment' AND target_id = ? AND user_fingerprint = ?"
      ).bind(commentId, voterId).first<{ direction: number }>();

      const prevDir = prevVote ? Number(prevVote.direction) : 0;
      const delta = direction - prevDir;

      const voteId = `vote-comm-${commentId}-${voterId}`;
      const statements: any[] = [];

      statements.push(
        db.prepare('UPDATE comments SET merit_votes = merit_votes + ? WHERE id = ?').bind(delta, commentId)
      );

      if (direction === 0) {
        statements.push(
          db.prepare("DELETE FROM votes WHERE target_type = 'comment' AND target_id = ? AND user_fingerprint = ?").bind(commentId, voterId)
        );
      } else {
        statements.push(
          db.prepare(
            'INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(voteId, 'comment', commentId, voterId, direction, Date.now())
        );
      }

      const batchResults = await db.batch(statements);
      if (isProd && batchResults.some(r => r && (r as any).success === false)) {
        return failure('Database atomic comment vote transaction failed', 500);
      }

      newMeritScore = (Number(commentRow.merit_votes) || 0) + delta;
    } else {
      const c = globalCommentsStore.find(x => x.id === commentId);
      if (!c) return failure('Comment not found', 404);
      const prevDir = c.userVote || 0;
      const delta = direction - prevDir;
      c.meritVotes += delta;
      c.userVote = direction === 0 ? undefined : direction;
      newMeritScore = c.meritVotes;
    }

    return new Response(
      JSON.stringify({
        success: true,
        commentId,
        meritVotes: newMeritScore,
        userVote: direction,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to vote on comment' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

import { storeNotification } from './_notification-storage.js';
