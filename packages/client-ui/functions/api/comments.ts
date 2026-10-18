// ===========================================================================
// UREfy — THREADED COMMENTS & REPLIES EDGE API (/api/comments)
// Supports: Nested discussion trees, sorting (best, top, new, old),
// automatic post reply_count updates, notifications, and D1 / in-memory fallback.
// ===========================================================================
import {
  Env,
  getD1Database,
  getKVStore,
  isProductionEnv,
  createD1UnavailableResponse,
  globalCommentsStore,
  globalPostsStore,
  globalFacetsStore,
  globalFacetFollowsStore,
  globalFacetMembersStore,
  globalFollowsStore,
  globalCommunityMembersStore,
  EdgeComment,
} from './_db.js';
import { requireAdmin, requireSignedEnvelope } from './_auth.js';
import {
  ensureSyntheticFixturesTable,
  parseSyntheticFixtureMetadata,
  registerSyntheticFixture,
} from './_synthetic.js';
import { storeNotification } from './_notification-storage.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint, X-Facet-Id',
};

const failure = (error: string, status: number): Response =>
  new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });

const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z0-9:_-]{1,160}$/i.test(value);

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
    const userFingerprint = (
      url.searchParams.get('userFingerprint') ||
      context.request.headers.get('X-User-Fingerprint') ||
      ''
    ).trim();
    const callerFacetId = (
      url.searchParams.get('facetId') ||
      context.request.headers.get('X-Facet-Id') ||
      ''
    ).trim();

    if (!validId(postId)) {
      return failure('postId parameter is required', 400);
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);
    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    let comments: EdgeComment[] = [];
    if (db) {
      const post = await db
        .prepare(
          "SELECT id, channel_id, author_id, audience, facet_id FROM posts WHERE id = ? AND status IN ('published', 'pinned')"
        )
        .bind(postId)
        .first<any>();
      if (!post) return failure('Discussion not found', 404);

      const isOwner = Boolean(userFingerprint && userFingerprint === post.author_id);
      if (post.audience && post.audience !== 'public' && !isOwner) {
        let authorized = false;
        const safePostFacetId = post.facet_id ?? null;
        const safeChannelId = post.channel_id ?? '';
        const safeAuthorId = post.author_id ?? '';

        if (post.audience === 'community') {
          if (callerFacetId) {
            const memberCheck = await db
              .prepare(
                'SELECT 1 FROM facet_community_memberships WHERE community_id = ? AND facet_id = ? LIMIT 1'
              )
              .bind(safeChannelId, callerFacetId)
              .first();
            authorized = Boolean(memberCheck);
          }
          if (!authorized && userFingerprint) {
            const memberCheck = await db
              .prepare(
                `SELECT 1 FROM facet_community_memberships fcm JOIN facets f ON f.id = fcm.facet_id WHERE fcm.community_id = ? AND f.owner_fingerprint = ?
                 UNION SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ? LIMIT 1`
              )
              .bind(safeChannelId, userFingerprint, safeChannelId, userFingerprint)
              .first();
            authorized = Boolean(memberCheck);
          }
        } else if (post.audience === 'followers') {
          if (callerFacetId && safePostFacetId) {
            const followCheck = await db
              .prepare(
                'SELECT 1 FROM facet_follows WHERE following_facet_id = ? AND follower_facet_id = ? LIMIT 1'
              )
              .bind(safePostFacetId, callerFacetId)
              .first();
            authorized = Boolean(followCheck);
          }
          if (!authorized && userFingerprint) {
            const followCheck = await db
              .prepare(
                `SELECT 1 FROM facet_follows ff JOIN facets f ON f.id = ff.follower_facet_id WHERE ff.following_facet_id = ? AND f.owner_fingerprint = ?
                 UNION SELECT 1 FROM follows WHERE following_id = ? AND follower_id = ? LIMIT 1`
              )
              .bind(safePostFacetId, userFingerprint, safeAuthorId, userFingerprint)
              .first();
            authorized = Boolean(followCheck);
          }
        }
        if (!authorized) return failure('Discussion not found', 404);
      }

      let orderBy = 'merit_votes DESC, created_at DESC';
      if (sort === 'top') orderBy = 'merit_votes DESC';
      else if (sort === 'new') orderBy = 'created_at DESC';
      else if (sort === 'old') orderBy = 'created_at ASC';

      const res = await db
        .prepare(
          `SELECT comments.*,
                  CASE
                    WHEN comments.facet_id IS NOT NULL THEN (
                      CASE
                        WHEN facets.status = 'deleted' THEN '[Deleted Context]'
                        ELSE COALESCE(facets.display_name, '[Deleted Context]')
                      END
                    )
                    ELSE p.display_name
                  END AS author_display_name,
                  CASE
                    WHEN comments.facet_id IS NOT NULL THEN (
                      CASE
                        WHEN facets.status = 'deleted' THEN NULL
                        ELSE facets.handle
                      END
                    )
                    ELSE p.handle
                  END AS author_handle,
                  CASE
                    WHEN comments.facet_id IS NOT NULL THEN (
                      CASE
                        WHEN facets.status = 'deleted' THEN NULL
                        ELSE facets.avatar_url
                      END
                    )
                    ELSE p.avatar_url
                  END AS author_avatar_url,
                  facets.is_publicly_linked AS facet_is_publicly_linked,
                  facets.status AS facet_status
                  FROM comments
                  LEFT JOIN facets ON facets.id = comments.facet_id
                  LEFT JOIN user_profiles p ON p.user_id = comments.author_id
                  WHERE comments.post_id = ?
                  ${
                    userFingerprint
                      ? `
                    AND NOT EXISTS (SELECT 1 FROM user_blocks ub WHERE ub.blocker_id = ? AND ub.blocked_id = comments.author_id)
                    AND NOT EXISTS (SELECT 1 FROM user_mutes um WHERE um.muter_id = ? AND um.muted_id = comments.author_id)
                  `
                      : ''
                  }
                  ORDER BY ${orderBy} LIMIT 200`
        )
        .bind(...(userFingerprint ? [postId, userFingerprint, userFingerprint] : [postId]))
        .all<any>();

      comments = (res.results || []).map((r) => {
        const isCommentOwner = Boolean(userFingerprint && userFingerprint === r.author_id);
        const isPubliclyLinked = r.facet_is_publicly_linked === 1;
        const authorId =
          !isCommentOwner && !isPubliclyLinked && r.facet_id ? r.facet_id : r.author_id;
        return {
          id: r.id,
          postId: r.post_id,
          parentId: r.parent_id || undefined,
          authorId,
          authorRole: r.author_role || 'MEMBER',
          authorDisplayName: r.author_display_name || undefined,
          authorHandle: r.author_handle || undefined,
          authorAvatarUrl: r.author_avatar_url || undefined,
          content: r.content,
          meritVotes: Number(r.merit_votes) || 0,
          createdAt: Number(r.created_at),
          facetId: r.facet_id || undefined,
        };
      });

      if (comments.length > 0) {
        const commentIds = comments.map((c) => c.id);
        const placeholders = commentIds.map(() => '?').join(',');

        const userVotesMap = new Map<string, number>();
        if (userFingerprint) {
          try {
            const votesRes = await db
              .prepare(
                `SELECT target_id, direction FROM votes WHERE target_type = 'comment' AND user_fingerprint = ? AND target_id IN (${placeholders})`
              )
              .bind(userFingerprint, ...commentIds)
              .all<{ target_id: string; direction: number }>();
            if (votesRes.results) {
              for (const v of votesRes.results) {
                userVotesMap.set(v.target_id, Number(v.direction) || 0);
              }
            }
          } catch (_) {}
        }

        const likesCountMap = new Map<string, number>();
        const userLikedSet = new Set<string>();
        try {
          const likesRes = await db
            .prepare(
              `SELECT target_id, user_fingerprint, COUNT(*) as cnt FROM interactions WHERE target_type = 'comment' AND interaction_type = 'like' AND target_id IN (${placeholders}) GROUP BY target_id, user_fingerprint`
            )
            .bind(...commentIds)
            .all<{ target_id: string; user_fingerprint: string; cnt: number }>();
          if (likesRes.results) {
            for (const row of likesRes.results) {
              likesCountMap.set(
                row.target_id,
                (likesCountMap.get(row.target_id) || 0) + (Number(row.cnt) || 1)
              );
              if (userFingerprint && row.user_fingerprint === userFingerprint) {
                userLikedSet.add(row.target_id);
              }
            }
          }
        } catch (_) {}

        const commentAwardsMap = new Map<string, Map<string, number>>();
        try {
          const awardsRes = await db
            .prepare(
              `SELECT target_id, value, COUNT(*) as cnt FROM interactions WHERE target_type = 'comment' AND interaction_type = 'award' AND target_id IN (${placeholders}) GROUP BY target_id, value`
            )
            .bind(...commentIds)
            .all<{ target_id: string; value: string; cnt: number }>();
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
      const post = globalPostsStore.find(
        (p) => p.id === postId && (!p.status || ['published', 'pinned'].includes(p.status))
      );
      if (!post) return failure('Discussion not found', 404);

      const isOwner = Boolean(userFingerprint && userFingerprint === post.authorFingerprint);
      if (post.audience && post.audience !== 'public' && !isOwner) {
        let authorized = false;
        if (post.audience === 'community') {
          if (callerFacetId) {
            authorized = globalFacetMembersStore.some(
              (m) => m.communityId === post.channelId && m.facetId === callerFacetId
            );
          }
          if (!authorized && userFingerprint) {
            authorized =
              globalFacetMembersStore.some((m) => {
                if (m.communityId !== post.channelId) return false;
                const f = globalFacetsStore.find((fac) => fac.id === m.facetId);
                return Boolean(f && f.ownerFingerprint === userFingerprint);
              }) ||
              globalCommunityMembersStore.some(
                (m) => m.communityId === post.channelId && m.userId === userFingerprint
              );
          }
        } else if (post.audience === 'followers') {
          if (callerFacetId && post.facetId) {
            authorized = globalFacetFollowsStore.some(
              (ff) =>
                ff.followingFacetId === post.facetId && ff.followerFacetId === callerFacetId
            );
          }
          if (!authorized && userFingerprint) {
            authorized =
              globalFacetFollowsStore.some((ff) => {
                if (!post.facetId || ff.followingFacetId !== post.facetId) return false;
                const f = globalFacetsStore.find((fac) => fac.id === ff.followerFacetId);
                return Boolean(f && f.ownerFingerprint === userFingerprint);
              }) ||
              globalFollowsStore.some(
                (f) => f.followingId === post.authorFingerprint && f.followerId === userFingerprint
              );
          }
        }
        if (!authorized) return failure('Discussion not found', 404);
      }

      let list = globalCommentsStore.filter((c) => c.postId === postId);
      if (sort === 'new') list = list.sort((a, b) => b.createdAt - a.createdAt);
      else if (sort === 'old') list = list.sort((a, b) => a.createdAt - b.createdAt);
      else list = list.sort((a, b) => b.meritVotes - a.meritVotes || b.createdAt - a.createdAt);

      comments = list.map((c) => {
        const facet = c.facetId ? globalFacetsStore.find((f) => f.id === c.facetId) : null;
        const isCommentOwner = Boolean(userFingerprint && userFingerprint === c.authorId);
        let authorDisplayName = c.authorDisplayName;
        let authorHandle = c.authorHandle;
        let authorAvatarUrl = c.authorAvatarUrl;
        let authorId = c.authorId;

        if (c.facetId) {
          if (!facet || facet.status === 'deleted') {
            authorDisplayName = '[Deleted Context]';
            authorHandle = undefined;
            authorAvatarUrl = undefined;
          } else {
            authorDisplayName = facet.displayName || '[Deleted Context]';
            authorHandle = facet.handle;
            authorAvatarUrl = facet.avatarUrl;
          }
          if (!isCommentOwner && (!facet || !facet.isPubliclyLinked)) {
            authorId = c.facetId;
          }
        }
        return {
          ...c,
          authorDisplayName,
          authorHandle,
          authorAvatarUrl,
          authorId,
        };
      });
    }

    const isPrivate = Boolean(userFingerprint || callerFacetId);
    return new Response(
      JSON.stringify({
        success: true,
        postId,
        count: comments.length,
        comments,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': isPrivate
            ? 'private, no-cache, no-store, must-revalidate'
            : 'public, max-age=5, stale-while-revalidate=15',
          'Vary': 'Accept, Authorization, X-User-Fingerprint, X-Facet-Id',
          ...CORS_HEADERS,
        },
      }
    );
  } catch (err: any) {
    return failure(err?.message || 'Failed to fetch comments', 500);
  }
}

/**
 * POST /api/comments
 * Body: { postId, parentId?, authorId, authorRole?, content, envelope? }
 */
export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const body = (await context.request.json().catch(() => null)) as Record<string, any> | null;
    if (!body) {
      return failure('Malformed JSON payload', 400);
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
    let authorRole = 'MEMBER';

    if (!validId(postId) || (parentId !== undefined && !validId(parentId)) || !content) {
      return failure('postId, authorId, and content are required', 400);
    }
    if (content.length > 5000) {
      return failure('Comment exceeds 5,000 character limit', 400);
    }

    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);
    const isProd = isProductionEnv(context.env);
    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    let postRecord: {
      id: string;
      author_id: string;
      channel_id: string;
      audience?: string;
      facet_id?: string | null;
    } | null = null;

    if (db) {
      const post = await db
        .prepare(
          "SELECT id, author_id, channel_id, audience, facet_id FROM posts WHERE id = ? AND status IN ('published', 'pinned')"
        )
        .bind(postId)
        .first<any>();
      if (!post) return failure('Discussion not found', 404);
      postRecord = post;

      if (
        parentId &&
        !(await db
          .prepare('SELECT id FROM comments WHERE id = ? AND post_id = ?')
          .bind(parentId, postId)
          .first())
      ) {
        return failure('Reply source is not in this discussion', 400);
      }

      if (post.author_id) {
        try {
          const isBlocked = await db
            .prepare(
              'SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1'
            )
            .bind(post.author_id, authorId, authorId, post.author_id)
            .first();
          if (isBlocked) {
            return failure('Cannot comment on this discussion due to user safety blocks', 403);
          }
        } catch (_) {}
      }

      const role = await db
        .prepare('SELECT role, is_quarantined FROM user_roles WHERE fingerprint = ?')
        .bind(authorId)
        .first<{ role: string; is_quarantined: number }>();
      if (role?.is_quarantined) return failure('This account cannot post comments', 403);
      if (role?.role) authorRole = role.role;
    } else {
      const post = globalPostsStore.find(
        (p) => p.id === postId && (!p.status || ['published', 'pinned'].includes(p.status))
      );
      if (!post) return failure('Discussion not found', 404);
      postRecord = {
        id: post.id,
        author_id: post.authorFingerprint,
        channel_id: post.channelId,
        audience: post.audience,
        facet_id: post.facetId ?? null,
      };
      if (
        parentId &&
        !globalCommentsStore.some(
          (comment) => comment.id === parentId && comment.postId === postId
        )
      ) {
        return failure('Reply source is not in this discussion', 400);
      }
    }

    let requestedFacetId = typeof payload.facetId === 'string' ? payload.facetId.trim() : '';
    let authorDisplayName: string | undefined;
    let authorHandle: string | undefined;
    let authorAvatarUrl: string | undefined;

    if (requestedFacetId) {
      let facetRecord: any = null;
      if (db) {
        facetRecord = await db
          .prepare(
            'SELECT id, owner_fingerprint, handle, display_name, avatar_url, status FROM facets WHERE id = ?'
          )
          .bind(requestedFacetId)
          .first();
      } else {
        facetRecord = globalFacetsStore.find((f) => f.id === requestedFacetId);
      }
      const facetOwner = facetRecord?.owner_fingerprint || facetRecord?.ownerFingerprint;
      if (!facetRecord || (facetOwner && facetOwner !== authorId)) {
        return failure('You do not own the specified Facet', 403);
      }
      const facetStatus = facetRecord.status || 'active';
      if (facetStatus === 'deleted' || facetStatus === 'deactivated') {
        return failure('Cannot comment using an inactive or deleted Facet', 403);
      }
      authorDisplayName = facetRecord.display_name ?? facetRecord.displayName;
      authorHandle = facetRecord.handle;
      authorAvatarUrl = facetRecord.avatar_url ?? facetRecord.avatarUrl;
    } else {
      let defaultFacet: any = null;
      if (db) {
        defaultFacet = await db
          .prepare(
            'SELECT id, handle, display_name, avatar_url, status FROM facets WHERE owner_fingerprint = ? AND is_default = 1'
          )
          .bind(authorId)
          .first();
      } else {
        defaultFacet = globalFacetsStore.find(
          (f) => f.ownerFingerprint === authorId && f.isDefault
        );
      }
      if (defaultFacet) {
        requestedFacetId = defaultFacet.id;
        authorDisplayName = defaultFacet.display_name ?? defaultFacet.displayName;
        authorHandle = defaultFacet.handle;
        authorAvatarUrl = defaultFacet.avatar_url ?? defaultFacet.avatarUrl;
      }
    }

    if (postRecord) {
      const postAudience = postRecord.audience || 'public';
      const postAuthorId = postRecord.author_id || '';
      const postChannelId = postRecord.channel_id || '';
      const postFacetId = postRecord.facet_id ?? null;
      if (
        postAudience !== 'public' &&
        postAuthorId !== authorId &&
        (!postFacetId || postFacetId !== requestedFacetId)
      ) {
        let authorized = false;
        if (postAudience === 'community') {
          if (requestedFacetId) {
            if (db) {
              const mCheck = await db
                .prepare(
                  'SELECT 1 FROM facet_community_memberships WHERE community_id = ? AND facet_id = ? LIMIT 1'
                )
                .bind(postChannelId, requestedFacetId)
                .first();
              authorized = Boolean(mCheck);
            } else {
              authorized = globalFacetMembersStore.some(
                (m) => m.communityId === postChannelId && m.facetId === requestedFacetId
              );
            }
          }
          if (!authorized && authorId) {
            if (db) {
              const mCheck = await db
                .prepare(
                  `SELECT 1 FROM facet_community_memberships fcm
                   JOIN facets f ON f.id = fcm.facet_id
                   WHERE fcm.community_id = ? AND f.owner_fingerprint = ?
                   UNION
                   SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ? LIMIT 1`
                )
                .bind(postChannelId, authorId, postChannelId, authorId)
                .first();
              authorized = Boolean(mCheck);
            } else {
              authorized =
                globalFacetMembersStore.some((m) => {
                  if (m.communityId !== postChannelId) return false;
                  const f = globalFacetsStore.find((fac) => fac.id === m.facetId);
                  return Boolean(f && f.ownerFingerprint === authorId);
                }) ||
                globalCommunityMembersStore.some(
                  (m) => m.communityId === postChannelId && m.userId === authorId
                );
            }
          }
          if (!authorized) {
            return failure(`Facet is not an authorized member of community ${postChannelId}`, 403);
          }
        } else if (postAudience === 'followers') {
          if (requestedFacetId && postFacetId) {
            if (db) {
              const fCheck = await db
                .prepare(
                  'SELECT 1 FROM facet_follows WHERE following_facet_id = ? AND follower_facet_id = ? LIMIT 1'
                )
                .bind(postFacetId, requestedFacetId)
                .first();
              authorized = Boolean(fCheck);
            } else {
              authorized = globalFacetFollowsStore.some(
                (ff) =>
                  ff.followingFacetId === postFacetId && ff.followerFacetId === requestedFacetId
              );
            }
          }
          if (!authorized && authorId) {
            if (db) {
              const fCheck = await db
                .prepare(
                  `SELECT 1 FROM facet_follows ff
                   JOIN facets f ON f.id = ff.follower_facet_id
                   WHERE ff.following_facet_id = ? AND f.owner_fingerprint = ?
                   UNION
                   SELECT 1 FROM follows WHERE following_id = ? AND follower_id = ? LIMIT 1`
                )
                .bind(postFacetId, authorId, postAuthorId, authorId)
                .first();
              authorized = Boolean(fCheck);
            } else {
              authorized =
                globalFacetFollowsStore.some((ff) => {
                  if (!postFacetId || ff.followingFacetId !== postFacetId) return false;
                  const f = globalFacetsStore.find((fac) => fac.id === ff.followerFacetId);
                  return Boolean(f && f.ownerFingerprint === authorId);
                }) ||
                globalFollowsStore.some(
                  (f) => f.followingId === postAuthorId && f.followerId === authorId
                );
            }
          }
          if (!authorized) {
            return failure('Only followers of this context can comment on this post', 403);
          }
        }
      }
    }

    const commentId = `comm_${Date.now()}_${
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Date.now().toString(36)
    }`;
    const now = Date.now();
    const newComment: EdgeComment = {
      id: commentId,
      postId,
      parentId,
      authorId,
      authorRole,
      authorDisplayName,
      authorHandle,
      authorAvatarUrl,
      facetId: requestedFacetId || undefined,
      content,
      meritVotes: 0,
      createdAt: now,
      ...(syntheticMetadata || {}),
    };

    if (db) {
      await db.batch([
        db
          .prepare(
            `INSERT INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at, facet_id)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
          )
          .bind(
            commentId,
            postId,
            parentId || null,
            authorId,
            authorRole,
            content,
            now,
            newComment.facetId || null
          ),
        db
          .prepare(
            'UPDATE posts SET reply_count = (SELECT COUNT(*) FROM comments WHERE post_id = ?) WHERE id = ?'
          )
          .bind(postId, postId),
      ]);

      if (kv) {
        try {
          await kv.delete(`post:${postId}`);
          await kv.delete('posts:all:all:hot:50:0');
          await kv.delete('posts:v2:all:all:hot:50:0');
        } catch (_) {}
      }

      if (syntheticMetadata) {
        await ensureSyntheticFixturesTable(db);
        await registerSyntheticFixture(db, 'comment', commentId, syntheticMetadata);
      }

      try {
        let recipientId: string | null = null;
        let notifType: 'reply_post' | 'reply_comment' = 'reply_post';
        if (parentId) {
          const parentRow = await db
            .prepare('SELECT author_id FROM comments WHERE id = ?')
            .bind(parentId)
            .first<{ author_id: string }>();
          if (parentRow && parentRow.author_id !== authorId) {
            recipientId = parentRow.author_id;
            notifType = 'reply_comment';
          }
        } else if (postRecord && postRecord.author_id !== authorId) {
          recipientId = postRecord.author_id;
          notifType = 'reply_post';
        }
        if (recipientId) {
          const actorProfile = await db
            .prepare('SELECT display_name FROM user_profiles WHERE user_id = ?')
            .bind(authorId)
            .first<{ display_name: string }>();
          const notifId = `notif_${Date.now()}_${
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID().slice(0, 8)
              : Date.now().toString(36)
          }`;
          await storeNotification(db, {
            id: notifId,
            userId: recipientId,
            actorId: authorId,
            actorName: actorProfile?.display_name || authorDisplayName || 'Profile not set up',
            type: notifType,
            targetId: postId,
            targetType: 'post',
            previewText: content.slice(0, 100),
            createdAt: now,
          });
        }
      } catch (error) {
        console.warn('[Comments] Notification could not be stored', error);
      }
    } else {
      globalCommentsStore.unshift(newComment);
      const post = globalPostsStore.find((p) => p.id === postId);
      if (post) post.replyCount = (post.replyCount || 0) + 1;
    }

    return new Response(JSON.stringify({ success: true, comment: newComment }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err: any) {
    return failure(err?.message || 'Failed to create comment', 500);
  }
}

/**
 * DELETE /api/comments
 * Query or body: { id: string, userId: string }
 */
export async function onRequestDelete(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const body = (await context.request.json().catch(() => null)) as Record<string, any> | null;
    const adminCheck = await requireAdmin(context);
    let id: string;
    let userId = '';

    if (adminCheck.authorized) {
      id = body?.id || new URL(context.request.url).searchParams.get('id') || '';
    } else {
      const auth = await requireSignedEnvelope(context, body?.envelope || body);
      if (!auth.authorized) return auth.response!;
      if (auth.payload?.action !== 'delete-comment') return failure('Invalid comment action', 400);
      id = auth.payload.id;
      userId = auth.fingerprint!;
    }

    if (!validId(id)) return failure('A valid comment id is required', 400);

    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);
    const isProd = isProductionEnv(context.env);
    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    if (db) {
      const commentRow = await db
        .prepare('SELECT post_id, author_id FROM comments WHERE id = ?')
        .bind(id)
        .first<{ post_id: string; author_id: string }>();
      if (!commentRow) {
        return failure('Comment not found', 404);
      }
      if (commentRow.author_id !== userId && !adminCheck.authorized) {
        return failure('Forbidden: only author or admin can delete comment', 403);
      }
      await db.batch([
        db.prepare('DELETE FROM comments WHERE id = ?').bind(id),
        db
          .prepare(
            'UPDATE posts SET reply_count = (SELECT COUNT(*) FROM comments WHERE post_id = ?) WHERE id = ?'
          )
          .bind(commentRow.post_id, commentRow.post_id),
      ]);
      if (kv) {
        try {
          await kv.delete(`post:${commentRow.post_id}`);
          await kv.delete('posts:all:all:hot:50:0');
          await kv.delete('posts:v2:all:all:hot:50:0');
        } catch (_) {}
      }
    } else {
      const idx = globalCommentsStore.findIndex((c) => c.id === id);
      if (idx < 0) {
        return failure('Comment not found', 404);
      }
      const c = globalCommentsStore[idx];
      if (c.authorId !== userId && !adminCheck.authorized) {
        return failure('Forbidden: only author or admin can delete comment', 403);
      }
      globalCommentsStore.splice(idx, 1);
      const post = globalPostsStore.find((p) => p.id === c.postId);
      if (post && post.replyCount > 0) post.replyCount--;
    }

    return new Response(JSON.stringify({ success: true, id, deleted: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err: any) {
    return failure(err?.message || 'Failed to delete comment', 500);
  }
}

/**
 * PATCH /api/comments
 * Body: signed envelope with { action: 'vote-comment', commentId, direction: 1 | -1 | 0 }
 */
export async function onRequestPatch(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const body = (await context.request.json().catch(() => null)) as Record<string, any> | null;
    if (!body) {
      return failure('Malformed JSON payload', 400);
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
      const role = await db
        .prepare('SELECT is_quarantined FROM user_roles WHERE fingerprint = ?')
        .bind(voterId)
        .first<{ is_quarantined: number }>();
      if (role?.is_quarantined) return failure('This account cannot vote on comments', 403);

      const commentRow = await db
        .prepare(
          "SELECT c.id, c.merit_votes, p.status FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = ? AND p.status IN ('published', 'pinned')"
        )
        .bind(commentId)
        .first<{ id: string; merit_votes: number; status: string }>();
      if (!commentRow) {
        return failure('Comment not found or unavailable', 404);
      }

      const prevVote = await db
        .prepare(
          "SELECT direction FROM votes WHERE target_type = 'comment' AND target_id = ? AND user_fingerprint = ?"
        )
        .bind(commentId, voterId)
        .first<{ direction: number }>();
      const prevDir = prevVote ? Number(prevVote.direction) : 0;
      const delta = direction - prevDir;
      const voteId = `vote-comm-${commentId}-${voterId}`;

      const statements: any[] = [
        db
          .prepare('UPDATE comments SET merit_votes = merit_votes + ? WHERE id = ?')
          .bind(delta, commentId),
      ];
      if (direction === 0) {
        statements.push(
          db
            .prepare(
              "DELETE FROM votes WHERE target_type = 'comment' AND target_id = ? AND user_fingerprint = ?"
            )
            .bind(commentId, voterId)
        );
      } else {
        statements.push(
          db
            .prepare(
              'INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES (?, ?, ?, ?, ?, ?)'
            )
            .bind(voteId, 'comment', commentId, voterId, direction, Date.now())
        );
      }

      const batchResults = await db.batch(statements);
      if (isProd && batchResults.some((r) => r && (r as any).success === false)) {
        return failure('Database atomic comment vote transaction failed', 500);
      }
      newMeritScore = (Number(commentRow.merit_votes) || 0) + delta;
    } else {
      const c = globalCommentsStore.find((x) => x.id === commentId);
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
    return failure(err?.message || 'Failed to vote on comment', 500);
  }
}
