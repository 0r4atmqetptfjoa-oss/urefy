// ===========================================================================
// UREfy — POSTS & CHRONOSTREAM EDGE API
// Supports: Cloudflare D1 (SQL), Cloudflare KV (Cache), Cloudflare R2
// Automatic fallback to In-Memory Edge Store when bindings are not present.
// ===========================================================================

import {
  getD1Database,
  getKVStore,
  getR2Bucket,
  globalPostsStore,
  globalVotesStore,
  globalSpentNullifiers,
  globalFacetsStore,
  globalFacetFollowsStore,
  globalFacetMembersStore,
  globalFollowsStore,
  globalCommunityMembersStore,
  isProductionEnv,
  createD1UnavailableResponse,
} from './_db.js';
import type { Env, EdgePost } from './_db.js';
import { requireAdmin, requireSignedEnvelope } from './_auth.js';
import { dispatchOutboundPostFederation } from './federation.js';
import { ensureSyntheticFixturesTable, parseSyntheticFixtureMetadata, registerSyntheticFixture } from './_synthetic.js';
import { scheduleIndexNow } from '../_indexnow.js';
import { postPath } from '../../src/public-urls.js';

export type { EdgePost };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint, X-Facet-Id',
};

/**
 * Parses raw D1 post row into typed EdgePost object
 */
export function parseD1PostRow(row: any): EdgePost {
  let attachment = undefined;
  if (row.attachment_json) {
    try {
      attachment = typeof row.attachment_json === 'string' ? JSON.parse(row.attachment_json) : row.attachment_json;
    } catch (_) {}
  }

  let video = undefined;
  if (row.video_json) {
    try {
      video = typeof row.video_json === 'string' ? JSON.parse(row.video_json) : row.video_json;
    } catch (_) {}
  }

  let images = undefined;
  if (row.images_json) {
    try {
      images = typeof row.images_json === 'string' ? JSON.parse(row.images_json) : row.images_json;
    } catch (_) {}
  }

  let quotedPost = undefined;
  const rawQuoted = row.quoted_post_json ?? row.quotedPost_json;
  if (rawQuoted) {
    try {
      quotedPost = typeof rawQuoted === 'string' ? JSON.parse(rawQuoted) : rawQuoted;
    } catch (_) {}
  }

  const meritVotes = Number(row.merit_votes !== undefined ? row.merit_votes : row.meritVotes) || 0;
  const userVoted = Number(row.user_voted !== undefined ? row.user_voted : row.userVoted) || 0;
  const replyCount = Number(row.reply_count !== undefined ? row.reply_count : row.replyCount) || 0;
  const boostCount = Number(row.boost_count !== undefined ? row.boost_count : row.boostCount) || 0;
  const createdAt = Number(row.created_at !== undefined ? row.created_at : row.createdAt) || Date.now();
  const isExpanded = Boolean(row.is_expanded !== undefined ? row.is_expanded : row.isExpanded);

  return {
    id: row.id,
    channelId: row.channel_id ?? row.channelId ?? 'pulse-global',
    authorFingerprint: row.author_id ?? row.author_fingerprint ?? row.authorFingerprint ?? 'anon-peer',
    authorRole: row.author_role ?? row.authorRole ?? 'MEMBER',
    authorDisplayName: row.author_display_name ?? row.authorDisplayName ?? undefined,
    authorHandle: row.author_handle ?? row.authorHandle ?? undefined,
    authorAvatarUrl: row.author_avatar_url ?? row.authorAvatarUrl ?? undefined,
    title: row.title,
    content: row.content,
    flair: row.flair || 'TECH DISCUSSION',
    status: row.status || 'published',
    meritVotes,
    userVoted,
    replyCount,
    boostCount,
    attachment,
    video,
    images,
    pollId: row.poll_id ?? row.pollId ?? undefined,
    quotedPost,
    createdAt,
    isExpanded,
    facetId: row.facet_id ?? row.facetId ?? undefined,
    audience: row.audience ?? 'public',
  };
}

export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const rawSort = (url.searchParams.get('sort') || 'hot').toLowerCase().trim();
    const sort = ['hot', 'new', 'chrono', 'top'].includes(rawSort) ? rawSort : 'hot';
    let channelId = url.searchParams.get('channelId')?.trim() || null;
    if (channelId && channelId.length > 128) channelId = channelId.slice(0, 128);
    let flair = url.searchParams.get('flair')?.trim() || null;
    if (flair && flair.length > 64) flair = flair.slice(0, 64);
    const rawLimit = parseInt(url.searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
    const rawOffset = parseInt(url.searchParams.get('offset') || '0', 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const userFingerprint = (url.searchParams.get('userFingerprint') || context.request.headers.get('X-User-Fingerprint') || '').trim();
    const callerFacetId = (url.searchParams.get('facetId') || context.request.headers.get('X-Facet-Id') || '').trim();

    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);
    if (db) await ensureSyntheticFixturesTable(db).catch(() => {});

    // 1. Try KV Cache for fast edge read if sorting hot without custom filters and not personalized
    const cacheKey = `posts:v2:${channelId || 'all'}:${flair || 'all'}:${sort}:${limit}:${offset}`;
    if (kv && !userFingerprint && !callerFacetId) {
      try {
        const cached = await kv.get<{ success: boolean; count: number; posts: EdgePost[] }>(cacheKey, 'json');
        if (cached && Array.isArray(cached.posts)) {
          return new Response(JSON.stringify(cached), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Edge-Cache': 'HIT',
              'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
              'Vary': 'Accept, Authorization, X-User-Fingerprint, X-Facet-Id',
            },
          });
        }
      } catch (_) {}
    }

    const isProd = isProductionEnv(context.env);
    let posts: EdgePost[] = [];

    // 2. Query Cloudflare D1 Database if binding available
    if (db) {
      try {
        let query = `SELECT posts.*,
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
          facets.is_publicly_linked AS facet_is_publicly_linked
          FROM posts
          LEFT JOIN facets ON facets.id = posts.facet_id
          LEFT JOIN user_profiles profiles ON profiles.user_id = posts.author_id
          WHERE (posts.status IN ('published', 'pinned', 'locked') OR posts.status IS NULL)
          AND (posts.status != 'shadowbanned' OR posts.status IS NULL)
          AND NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'post' AND sf.resource_id = posts.id)`;
        const params: any[] = [];

        // Audience privacy filter
        if (!userFingerprint && !callerFacetId) {
          query += " AND (posts.audience = 'public' OR posts.audience IS NULL)";
        } else if (callerFacetId) {
          query += ` AND (
            posts.audience = 'public' OR posts.audience IS NULL
            OR posts.author_id = ?
            OR posts.facet_id = ?
            OR (posts.audience = 'community' AND EXISTS (
                 SELECT 1 FROM facet_community_memberships fcm WHERE fcm.community_id = posts.channel_id AND fcm.facet_id = ?
               ))
            OR (posts.audience = 'followers' AND EXISTS (
                 SELECT 1 FROM facet_follows ff WHERE ff.following_facet_id = posts.facet_id AND ff.follower_facet_id = ?
               ))
          )`;
          params.push(userFingerprint || callerFacetId, callerFacetId, callerFacetId, callerFacetId);
        } else {
          query += ` AND (
            posts.audience = 'public' OR posts.audience IS NULL
            OR posts.author_id = ?
            OR (posts.audience = 'community' AND (
                 EXISTS (SELECT 1 FROM facet_community_memberships fcm JOIN facets f ON f.id = fcm.facet_id WHERE fcm.community_id = posts.channel_id AND f.owner_fingerprint = ?)
                 OR EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = posts.channel_id AND cm.user_id = ?)
               ))
            OR (posts.audience = 'followers' AND (
                 EXISTS (SELECT 1 FROM facet_follows ff JOIN facets f ON f.id = ff.follower_facet_id WHERE ff.following_facet_id = posts.facet_id AND f.owner_fingerprint = ?)
                 OR EXISTS (SELECT 1 FROM follows fws WHERE fws.following_id = posts.author_id AND fws.follower_id = ?)
               ))
          )`;
          params.push(userFingerprint, userFingerprint, userFingerprint, userFingerprint, userFingerprint);
        }

        if (channelId && channelId !== 'all') {
          query += ' AND posts.channel_id = ?';
          params.push(channelId);
        }

        if (flair && flair !== 'all') {
          query += ' AND posts.flair = ?';
          params.push(flair);
        }

        if (userFingerprint) {
          query += `
            AND NOT EXISTS (SELECT 1 FROM user_blocks ub WHERE ub.blocker_id = ? AND ub.blocked_id = posts.author_id)
            AND NOT EXISTS (SELECT 1 FROM user_mutes um WHERE um.muter_id = ? AND um.muted_id = posts.author_id)
          `;
          params.push(userFingerprint, userFingerprint);
        }

        if (sort === 'new' || sort === 'chrono') {
          query += ' ORDER BY posts.created_at DESC';
        } else if (sort === 'top') {
          query += ' ORDER BY posts.merit_votes DESC, posts.created_at DESC';
        } else {
          // Hot ranking SQLite approximation
          query += ' ORDER BY (posts.merit_votes + (posts.boost_count * 2) + (posts.reply_count * 1.5)) DESC, posts.created_at DESC';
        }

        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const stmt = db.prepare(query).bind(...params);
        const { results } = await stmt.all<any>();

        if (results && results.length > 0) {
          posts = results.map(row => {
            const p = parseD1PostRow(row);
            const isOwner = Boolean(userFingerprint && userFingerprint === p.authorFingerprint);
            const isPubliclyLinked = row.facet_is_publicly_linked === 1;
            if (!isOwner && !isPubliclyLinked && p.facetId) {
              p.authorFingerprint = p.facetId;
            }
            return p;
          });
        } else if (isProd) {
          posts = [];
        } else {
          // If D1 is empty on initial migration in dev/test, fallback to in-memory seed posts
          let fallback = [...globalPostsStore];
          if (!userFingerprint && !callerFacetId) {
            fallback = fallback.filter(p => !p.audience || p.audience === 'public');
          }
          if (channelId && channelId !== 'all') {
            fallback = fallback.filter((p) => p.channelId === channelId);
          }
          if (flair && flair !== 'all') {
            fallback = fallback.filter((p) => p.flair === flair);
          }
          posts = fallback;
        }
      } catch (dbError: any) {
        if (isProd) {
          return new Response(
            JSON.stringify({ success: false, error: `Database query failed: ${dbError?.message || 'SQL error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        console.warn('[D1 Posts Fallback]', dbError);
        posts = [...globalPostsStore];
      }
    } else if (isProd) {
      return createD1UnavailableResponse();
    } else {
      // 3. In-Memory Edge Store Fallback (Strictly Dev / Test only)
      let result = [...globalPostsStore];

      // Audience privacy filter in-memory
      if (!userFingerprint && !callerFacetId) {
        result = result.filter(p => !p.audience || p.audience === 'public');
      } else if (callerFacetId) {
        result = result.filter(p => {
          if (!p.audience || p.audience === 'public') return true;
          if (p.facetId === callerFacetId || (userFingerprint && p.authorFingerprint === userFingerprint)) return true;
          if (p.audience === 'community') {
            return globalFacetMembersStore.some(m => m.communityId === p.channelId && m.facetId === callerFacetId);
          }
          if (p.audience === 'followers') {
            return globalFacetFollowsStore.some(ff => ff.followingFacetId === p.facetId && ff.followerFacetId === callerFacetId);
          }
          return false;
        });
      } else {
        result = result.filter(p => {
          if (!p.audience || p.audience === 'public') return true;
          if (p.authorFingerprint === userFingerprint) return true;
          if (p.audience === 'community') {
            const isMember = globalFacetMembersStore.some(m => {
              if (m.communityId !== p.channelId) return false;
              const f = globalFacetsStore.find(fac => fac.id === m.facetId);
              return f && f.ownerFingerprint === userFingerprint;
            }) || globalCommunityMembersStore.some(m => m.communityId === p.channelId && m.userId === userFingerprint);
            return isMember;
          }
          if (p.audience === 'followers') {
            const isFollower = globalFacetFollowsStore.some(ff => {
              if (ff.followingFacetId !== p.facetId) return false;
              const f = globalFacetsStore.find(fac => fac.id === ff.followerFacetId);
              return f && f.ownerFingerprint === userFingerprint;
            }) || globalFollowsStore.some(f => f.followingId === p.authorFingerprint && f.followerId === userFingerprint);
            return isFollower;
          }
          return false;
        });
      }

      // Attribution & public unlinkability in-memory
      result = result.map(p => {
        const facet = p.facetId ? globalFacetsStore.find(f => f.id === p.facetId) : null;
        const isOwner = Boolean(userFingerprint && userFingerprint === p.authorFingerprint);
        let authorDisplayName = p.authorDisplayName;
        let authorHandle = p.authorHandle;
        let authorAvatarUrl = p.authorAvatarUrl;
        let authorFingerprint = p.authorFingerprint;

        if (p.facetId) {
          if (!facet || facet.status === 'deleted') {
            authorDisplayName = '[Deleted Context]';
            authorHandle = undefined;
            authorAvatarUrl = undefined;
          } else {
            authorDisplayName = facet.displayName || '[Deleted Context]';
            authorHandle = facet.handle;
            authorAvatarUrl = facet.avatarUrl;
          }
          if (!isOwner && (!facet || !facet.isPubliclyLinked)) {
            authorFingerprint = p.facetId;
          }
        }
        return {
          ...p,
          authorDisplayName,
          authorHandle,
          authorAvatarUrl,
          authorFingerprint,
        };
      });

      if (channelId && channelId !== 'all') {
        result = result.filter((p) => p.channelId === channelId);
      }

      if (flair && flair !== 'all') {
        result = result.filter((p) => p.flair === flair);
      }

      if (sort === 'new' || sort === 'chrono') {
        result.sort((a, b) => b.createdAt - a.createdAt);
      } else if (sort === 'top') {
        result.sort((a, b) => b.meritVotes - a.meritVotes);
      } else {
        result.sort((a, b) => {
          const scoreA = a.meritVotes + a.boostCount * 2 + a.replyCount * 1.5;
          const scoreB = b.meritVotes + b.boostCount * 2 + b.replyCount * 1.5;
          return scoreB - scoreA;
        });
      }

      posts = result.slice(offset, offset + limit);
    }

    const payload = {
      success: true,
      count: posts.length,
      posts,
    };

    const isPrivateOrAuthed = Boolean(
      userFingerprint || callerFacetId || posts.some(p => p.audience && p.audience !== 'public')
    );

    // Store in KV cache with short TTL (strictly public unauthenticated only)
    if (kv && !isPrivateOrAuthed) {
      try {
        await kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: 30 });
      } catch (_) {}
    }

    const latestPostTime = posts.length > 0 ? (posts[0].createdAt || 0) : 0;
    const etag = `W/"posts-${posts.length}-${latestPostTime}"`;

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': isPrivateOrAuthed
          ? 'private, no-cache, no-store, must-revalidate'
          : 'public, max-age=5, stale-while-revalidate=15',
        'Vary': 'Accept, Authorization, X-User-Fingerprint, X-Facet-Id',
        'ETag': etag,
        'X-Edge-Storage': db ? 'Cloudflare-D1' : 'Edge-Isolate-Memory',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestPost(context: { request: Request; env?: Env; waitUntil?: (task: Promise<unknown>) => void }): Promise<Response> {
  try {
    const rawBody = (await context.request.json()) as any;
    let body = rawBody;
    if (rawBody.payload && typeof rawBody.payload === 'object' && rawBody.signature && rawBody.identity) {
      body = rawBody.payload;
    }
    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);
    const r2 = getR2Bucket(context.env);

    const isProd = isProductionEnv(context.env);

    // ─── ACTION: VOTE ──────────────────────────────────────────────────────────
    if (body.action === 'vote') {
      const adminCheck = await requireAdmin(context);
      let userFingerprint = body.userFingerprint || 'anon-voter';
      if (!adminCheck.authorized) {
        const auth = await requireSignedEnvelope(
          context,
          rawBody,
          'post:vote'
        );
        if (!auth.authorized) {
          return (
            auth.response ||
            new Response(
              JSON.stringify({ success: false, error: 'Identity signature required to vote' }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        userFingerprint = auth.fingerprint || userFingerprint;
      }
      const { postId, direction } = body;
      if (!postId || typeof postId !== 'string' || postId.length > 256) {
        return new Response(
          JSON.stringify({ success: false, error: 'Valid postId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const voteDir = Number(direction);
      if (![-1, 0, 1].includes(voteDir)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Vote direction must be -1, 0, or 1' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Update in D1 if available
      if (db) {
        try {
          // Check if post exists
          const existing = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<any>();
          if (existing) {
            // Check existing vote from this user to ensure idempotence
            const prevVote = await db.prepare(
              "SELECT direction FROM votes WHERE target_type = 'post' AND target_id = ? AND user_fingerprint = ?"
            ).bind(postId, userFingerprint).first<any>();

            const prevDir = prevVote ? Number(prevVote.direction) : 0;
            const delta = voteDir - prevDir;

            if (delta !== 0) {
              const currentVotes = Number(existing.merit_votes ?? existing.meritVotes) || 0;
              const newVotes = currentVotes + delta;

              const updateStmt = db
                .prepare('UPDATE posts SET merit_votes = merit_votes + ? WHERE id = ?')
                .bind(delta, postId);

              let ballotStmt;
              if (voteDir === 0) {
                // Direction 0 is unvote / retraction: delete from votes
                ballotStmt = db
                  .prepare(
                    "DELETE FROM votes WHERE target_type = 'post' AND target_id = ? AND user_fingerprint = ?"
                  )
                  .bind(postId, userFingerprint);
              } else {
                const voteId = `vote-${postId}-${userFingerprint}`;
                ballotStmt = db
                  .prepare(
                    'INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES (?, ?, ?, ?, ?, ?)'
                  )
                  .bind(voteId, 'post', postId, userFingerprint, voteDir, Date.now());
              }

              const batchResults = await db.batch([updateStmt, ballotStmt]);

              if (isProd && batchResults.some((r: any) => r && r.success === false)) {
                return new Response(
                  JSON.stringify({ success: false, error: 'Database atomic vote transaction failed in D1' }),
                  { status: 500, headers: { 'Content-Type': 'application/json' } }
                );
              }

              existing.merit_votes = newVotes;
              existing.meritVotes = newVotes;
            }

            const updatedPost = parseD1PostRow(existing);

            // Also keep in-memory sync
            const memIndex = globalPostsStore.findIndex((p) => p.id === postId);
            if (memIndex >= 0 && delta !== 0) {
              globalPostsStore[memIndex].meritVotes += delta;
            }

            return new Response(JSON.stringify({ success: true, post: updatedPost }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          } else if (isProd) {
            return new Response(
              JSON.stringify({ success: false, error: `Post ${postId} not found` }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
          }
        } catch (dbErr: any) {
          if (isProd) {
            return new Response(
              JSON.stringify({ success: false, error: `Database transaction failed: ${dbErr?.message || 'D1 vote error'}` }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }
          console.warn('[D1 Vote Fallback]', dbErr);
        }
      } else if (isProd) {
        return createD1UnavailableResponse();
      }

      // Fallback in-memory (Dev/Test only)
      const post = globalPostsStore.find((p) => p.id === postId);
      if (!post) {
        return new Response(
          JSON.stringify({ success: false, error: `Post ${postId} not found` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const existingVoteIdx = globalVotesStore.findIndex(
        (v) => v.targetType === 'post' && v.targetId === postId && v.userFingerprint === userFingerprint
      );
      const prevDir = existingVoteIdx >= 0 ? globalVotesStore[existingVoteIdx].direction : 0;
      const delta = voteDir - prevDir;
      if (delta !== 0) {
        post.meritVotes += delta;
        if (voteDir === 0) {
          if (existingVoteIdx >= 0) {
            globalVotesStore.splice(existingVoteIdx, 1);
          }
        } else if (existingVoteIdx >= 0) {
          globalVotesStore[existingVoteIdx].direction = voteDir;
        } else {
          globalVotesStore.push({
            id: `vote-${postId}-${userFingerprint}`,
            targetType: 'post',
            targetId: postId,
            userFingerprint,
            direction: voteDir,
            createdAt: Date.now(),
          });
        }
      }
      return new Response(
        JSON.stringify({ success: true, post }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ─── ACTION: ANONYMOUS VOTE (CHAUMIAN BLIND SIGNATURE BALLOT) ────────────
    if (body.action === 'anonymous-vote') {
      if (isProd) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Anonymous ZK voting is offline in production: proof verifier not connected',
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const { postId, direction, nullifier } = body;
      if (!postId || typeof postId !== 'string' || postId.length > 256) {
        return new Response(
          JSON.stringify({ success: false, error: 'Valid postId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (!nullifier || typeof nullifier !== 'string' || nullifier.length < 8) {
        return new Response(
          JSON.stringify({ success: false, error: 'Valid ballot nullifier is mandatory for anonymous votes' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const voteDir = Number(direction) || (body.voteType === 'down' ? -1 : 1);

      // Fast-path check: in-memory spent nullifier tracking
      if (globalSpentNullifiers.has(nullifier)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Ballot nullifier has already been spent' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (db) {
        try {
          const existing = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<any>();
          if (existing) {
            const currentVotes = Number(existing.merit_votes ?? existing.meritVotes) || 0;
            const newVotes = currentVotes + voteDir;

            // ATOMIC D1 TRANSACTION BATCH:
            // 1. Insert nullifier into used_nonces (PRIMARY KEY constraint enforces unicity)
            // 2. Increment post vote count
            // 3. Insert vote record with nullifier
            const nonceStmt = db
              .prepare('INSERT INTO used_nonces (fingerprint, nonce, expires_at, created_at) VALUES (?, ?, ?, ?)')
              .bind('chaumian-ballot', nullifier, Date.now() + 86400000 * 365, Date.now());

            const updateStmt = db
              .prepare('UPDATE posts SET merit_votes = merit_votes + ? WHERE id = ?')
              .bind(voteDir, postId);

            const ballotId = `ballot-${nullifier}`;
            const ballotVoterId = `chaumian:${nullifier}`;
            const ballotStmt = db
              .prepare(
                'INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES (?, ?, ?, ?, ?, ?)'
              )
              .bind(ballotId, 'post', postId, ballotVoterId, voteDir, Date.now());

            const batchResults = await db.batch([nonceStmt, updateStmt, ballotStmt]);

            if (isProd && batchResults.some((r: any) => r && r.success === false)) {
              return new Response(
                JSON.stringify({ success: false, error: 'Database atomic ballot transaction failed in D1' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
              );
            }

            globalSpentNullifiers.add(nullifier);
            existing.merit_votes = newVotes;
            existing.meritVotes = newVotes;
            const updatedPost = parseD1PostRow(existing);

            const memIndex = globalPostsStore.findIndex((p) => p.id === postId);
            if (memIndex >= 0) {
              globalPostsStore[memIndex].meritVotes += voteDir;
            }

            return new Response(JSON.stringify({ success: true, post: updatedPost, nullifier }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          } else if (isProd) {
            return new Response(
              JSON.stringify({ success: false, error: `Post ${postId} not found` }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
          }
        } catch (dbErr: any) {
          const msg = String(dbErr?.message || '');
          if (msg.includes('UNIQUE') || msg.includes('constraint') || msg.includes('PRIMARY KEY')) {
            return new Response(
              JSON.stringify({ success: false, error: 'Ballot nullifier has already been spent' }),
              { status: 409, headers: { 'Content-Type': 'application/json' } }
            );
          }
          if (isProd) {
            return new Response(
              JSON.stringify({ success: false, error: `Database ballot transaction failed: ${dbErr?.message || 'D1 error'}` }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }
          console.warn('[D1 Anonymous Vote Fallback]', dbErr);
        }
      } else if (isProd) {
        return createD1UnavailableResponse();
      }

      globalSpentNullifiers.add(nullifier);

      // In-memory fallback (Dev/Test only)
      const post = globalPostsStore.find((p) => p.id === postId);
      if (!post) {
        return new Response(
          JSON.stringify({ success: false, error: `Post ${postId} not found` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      post.meritVotes += voteDir;
      return new Response(
        JSON.stringify({ success: true, post, nullifier }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ─── ACTION: BOOST ─────────────────────────────────────────────────────────
    if (body.action === 'boost') {
      const adminCheck = await requireAdmin(context);
      if (!adminCheck.authorized) {
        const auth = await requireSignedEnvelope(
          context,
          rawBody,
          'post:vote'
        );
        if (!auth.authorized) {
          return (
            auth.response ||
            new Response(
              JSON.stringify({ success: false, error: 'Identity signature required to boost' }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
      }
      const { postId } = body;
      if (!postId || typeof postId !== 'string' || postId.length > 256) {
        return new Response(
          JSON.stringify({ success: false, error: 'Valid postId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (db) {
        try {
          const existing = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<any>();
          if (existing) {
            const currentBoosts = Number(existing.boost_count ?? existing.boostCount) || 0;
            const newBoosts = currentBoosts + 1;

            await db
              .prepare('UPDATE posts SET boost_count = boost_count + 1 WHERE id = ?')
              .bind(postId)
              .run();

            existing.boost_count = newBoosts;
            existing.boostCount = newBoosts;
            const updatedPost = parseD1PostRow(existing);

            const memIndex = globalPostsStore.findIndex((p) => p.id === postId);
            if (memIndex >= 0) {
              globalPostsStore[memIndex].boostCount++;
            }

            return new Response(JSON.stringify({ success: true, post: updatedPost }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          } else if (isProd) {
            return new Response(
              JSON.stringify({ success: false, error: `Post ${postId} not found` }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
          }
        } catch (dbErr: any) {
          if (isProd) {
            return new Response(
              JSON.stringify({ success: false, error: `Database boost transaction failed: ${dbErr?.message || 'D1 error'}` }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }
          console.warn('[D1 Boost Fallback]', dbErr);
        }
      } else if (isProd) {
        return createD1UnavailableResponse();
      }

      const post = globalPostsStore.find((p) => p.id === postId);
      if (!post) {
        return new Response(
          JSON.stringify({ success: false, error: `Post ${postId} not found` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      post.boostCount++;
      return new Response(
        JSON.stringify({ success: true, post }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ─── ACTION: CREATE / UPDATE POST ──────────────────────────────────────────
    const adminCheck = await requireAdmin(context);

    // Check emergency freeze
    if (!adminCheck.authorized && db) {
      try {
        const freezeRow: any = await db
          .prepare('SELECT value FROM system_config WHERE key = ?')
          .bind('emergencyFreeze')
          .first();
        if (freezeRow && freezeRow.value === 'true') {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Emergency Freeze Active: All network posts are temporarily suspended by sovereign administration.',
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (_) {}
    }

    let authorFingerprint = body.authorFingerprint || 'anon-peer';
    if (!adminCheck.authorized) {
      const auth = await requireSignedEnvelope(context, rawBody, 'post:create');
      if (!auth.authorized) {
        return (
          auth.response ||
          new Response(
            JSON.stringify({ success: false, error: 'Identity signature required to create posts' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }
      authorFingerprint = auth.fingerprint || authorFingerprint;
      if (auth.payload) {
        body = auth.payload;
      }
    }

    // Resolve authoritative role, quarantine, and shadowban from D1 user_roles
    let authorRole = body.authorRole || 'MEMBER';
    let postStatus = body.status || 'published';

    if (db) {
      try {
        const roleRow: any = await db
          .prepare('SELECT role, is_shadowbanned, is_quarantined FROM user_roles WHERE fingerprint = ?')
          .bind(authorFingerprint)
          .first();
        if (roleRow) {
          if (roleRow.role) authorRole = roleRow.role;
          if (roleRow.is_shadowbanned === 1) postStatus = 'shadowbanned';
          if (roleRow.is_quarantined === 1 && !adminCheck.authorized) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Access Denied: Your identity has been quarantined by network moderation.',
              }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (_) {}
    }

    // Verify ownership and fetch existing post if body.id is supplied
    let existingPost: EdgePost | null = null;
    let isUpdate = false;
    if (body.id) {
      if (db) {
        try {
          const row = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(body.id).first<any>();
          if (row) {
            existingPost = parseD1PostRow(row);
            isUpdate = true;
          }
        } catch (dbErr: any) {
          if (isProd) {
            return new Response(
              JSON.stringify({ success: false, error: `Database error verifying post existence: ${dbErr?.message || 'D1 error'}` }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      }
      if (!existingPost) {
        const memMatch = globalPostsStore.find((p) => p.id === body.id);
        if (memMatch) {
          existingPost = memMatch;
          isUpdate = true;
        }
      }

      if (existingPost && !adminCheck.authorized && existingPost.authorFingerprint !== authorFingerprint) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: You cannot modify a post created by another identity' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const syntheticMetadata = parseSyntheticFixtureMetadata(body);

    // Resolve audience & facet
    const rawAudience = String(body.audience || 'public').trim().toLowerCase();
    const audience: 'public' | 'community' | 'followers' =
      ['public', 'community', 'followers'].includes(rawAudience) ? (rawAudience as any) : 'public';

    let requestedFacetId = typeof body.facetId === 'string' ? body.facetId.trim() : '';
    let authorDisplayName = typeof body.authorDisplayName === 'string' ? body.authorDisplayName : undefined;
    let authorHandle = typeof body.authorHandle === 'string' ? body.authorHandle : undefined;
    let authorAvatarUrl = typeof body.authorAvatarUrl === 'string' ? body.authorAvatarUrl : undefined;
    let isDefaultFacet = false;

    if (requestedFacetId) {
      let facetRecord: any = null;
      try {
        if (db) {
          const stmt = db.prepare(
            'SELECT id, owner_fingerprint, handle, display_name, avatar_url, is_default, status FROM facets WHERE id = ?'
          ).bind(requestedFacetId);
          if (typeof stmt?.first === 'function') {
            facetRecord = await stmt.first();
          }
        } else {
          facetRecord = globalFacetsStore.find(f => f.id === requestedFacetId);
        }
      } catch {
        facetRecord = globalFacetsStore.find(f => f.id === requestedFacetId);
      }

      const facetOwner = facetRecord?.owner_fingerprint || facetRecord?.ownerFingerprint;
      if (!facetRecord || (facetOwner && facetOwner !== authorFingerprint && !adminCheck.authorized)) {
        return new Response(
          JSON.stringify({ success: false, error: 'You do not own the specified Facet' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const facetStatus = facetRecord.status || 'active';
      if (facetStatus === 'deleted' || facetStatus === 'deactivated') {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot post using an inactive or deleted Facet' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      isDefaultFacet = Boolean(facetRecord.is_default ?? facetRecord.isDefault);
      authorDisplayName = facetRecord.display_name ?? facetRecord.displayName ?? authorDisplayName;
      authorHandle = facetRecord.handle ?? authorHandle;
      authorAvatarUrl = facetRecord.avatar_url ?? facetRecord.avatarUrl ?? authorAvatarUrl;
    } else {
      let defaultFacet: any = null;
      try {
        if (db) {
          const stmt = db.prepare(
            'SELECT id, is_default, handle, display_name, avatar_url FROM facets WHERE owner_fingerprint = ? AND is_default = 1'
          ).bind(authorFingerprint);
          if (typeof stmt?.first === 'function') {
            defaultFacet = await stmt.first();
          }
        } else {
          defaultFacet = globalFacetsStore.find(f => f.ownerFingerprint === authorFingerprint && f.isDefault);
        }
      } catch {
        defaultFacet = globalFacetsStore.find(f => f.ownerFingerprint === authorFingerprint && f.isDefault);
      }
      if (defaultFacet) {
        requestedFacetId = defaultFacet.id;
        isDefaultFacet = true;
        authorDisplayName = defaultFacet.display_name ?? defaultFacet.displayName ?? authorDisplayName;
        authorHandle = defaultFacet.handle ?? authorHandle;
        authorAvatarUrl = defaultFacet.avatar_url ?? defaultFacet.avatarUrl ?? authorAvatarUrl;
      } else {
        isDefaultFacet = true;
      }
    }

    const randSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 8)
      : Date.now().toString(36);
    const targetPostId = body.id || `post-${Date.now()}-${randSuffix}`;

    const newPost: EdgePost = {
      id: targetPostId,
      channelId: body.channelId || existingPost?.channelId || 'pulse-global',
      authorFingerprint: existingPost ? existingPost.authorFingerprint : authorFingerprint,
      authorRole,
      authorDisplayName: authorDisplayName || existingPost?.authorDisplayName,
      authorHandle: authorHandle || existingPost?.authorHandle,
      authorAvatarUrl: authorAvatarUrl || existingPost?.authorAvatarUrl,
      facetId: requestedFacetId || existingPost?.facetId,
      audience: audience || existingPost?.audience || 'public',
      title: body.title !== undefined ? body.title : (existingPost?.title || 'Sovereign Pulse'),
      content: body.content !== undefined ? body.content : (existingPost?.content || ''),
      flair: body.flair || existingPost?.flair || (body.title ? 'TECH DISCUSSION' : 'MICRO-PULSE'),
      status: postStatus,
      meritVotes: adminCheck.authorized
        ? (typeof body.meritVotes === 'number' ? body.meritVotes : (typeof body.merit_votes === 'number' ? body.merit_votes : (existingPost?.meritVotes ?? 1)))
        : (existingPost ? existingPost.meritVotes : 0),
      userVoted: existingPost ? existingPost.userVoted : 0,
      replyCount: existingPost ? existingPost.replyCount : 0,
      boostCount: existingPost ? existingPost.boostCount : 0,
      attachment: body.attachment !== undefined ? body.attachment : existingPost?.attachment,
      video: body.video !== undefined ? body.video : existingPost?.video,
      images: body.images !== undefined ? body.images : existingPost?.images,
      pollId: body.pollId || body.poll_id || existingPost?.pollId,
      quotedPost: body.quotedPost !== undefined ? body.quotedPost : existingPost?.quotedPost,
      createdAt: existingPost ? existingPost.createdAt : (body.createdAt || body.created_at || Date.now()),
      isExpanded: false,
      ...(syntheticMetadata || {}),
    };

    // Strict input validation
    if (!newPost.title?.trim() && !newPost.content?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Post must contain either a title or content' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Cross-facet community authorization: facet must independently belong to community
    if (newPost.audience === 'community') {
      let isMember = false;
      if (newPost.facetId) {
        if (db) {
          const mCheck = await db.prepare(
            'SELECT 1 FROM facet_community_memberships WHERE community_id = ? AND facet_id = ?'
          ).bind(newPost.channelId, newPost.facetId).first();
          isMember = Boolean(mCheck);
        } else {
          isMember = globalFacetMembersStore.some(m => m.communityId === newPost.channelId && m.facetId === newPost.facetId);
        }
      } else {
        if (db) {
          const mCheck = await db.prepare(
            'SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?'
          ).bind(newPost.channelId, newPost.authorFingerprint).first();
          isMember = Boolean(mCheck);
        } else {
          isMember = globalCommunityMembersStore.some(m => m.communityId === newPost.channelId && m.userId === newPost.authorFingerprint);
        }
      }

      if (!isMember && !adminCheck.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: `Facet is not an authorized member of community ${newPost.channelId}` }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Store in Cloudflare D1 if available (Explicit UPDATE vs explicit INSERT)
    if (db) {
      try {
        if (isUpdate) {
          const updateStmt = db
            .prepare(
              `UPDATE posts SET
                channel_id = ?, author_role = ?, title = ?, content = ?, flair = ?,
                attachment_json = ?, video_json = ?, images_json = ?, poll_id = ?,
                quoted_post_json = ?, status = ?, facet_id = ?, audience = ?
              WHERE id = ? AND (author_id = ? OR ? = 1)`
            )
            .bind(
              newPost.channelId,
              newPost.authorRole,
              newPost.title,
              newPost.content,
              newPost.flair,
              newPost.attachment ? JSON.stringify(newPost.attachment) : null,
              newPost.video ? JSON.stringify(newPost.video) : null,
              newPost.images ? JSON.stringify(newPost.images) : null,
              newPost.pollId || null,
              newPost.quotedPost ? JSON.stringify(newPost.quotedPost) : null,
              newPost.status || 'published',
              newPost.facetId || null,
              newPost.audience || 'public',
              newPost.id,
              authorFingerprint,
              adminCheck.authorized ? 1 : 0
            );

          const updateResult = await updateStmt.run();
          if (isProd && updateResult && updateResult.success === false) {
            return new Response(
              JSON.stringify({ success: false, error: `Database post update rejected: ${updateResult.error || 'D1 error'}` }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }
        } else {
          // Explicit INSERT: prevents accidental overwrite or ownership theft on ID collisions
          const insertStmt = db
            .prepare(
              `INSERT INTO posts (
                id, channel_id, author_id, author_role, title, content, flair,
                merit_votes, user_voted, reply_count, boost_count,
                attachment_json, video_json, images_json, poll_id,
                quoted_post_json, status, created_at, is_expanded,
                facet_id, audience
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              newPost.id,
              newPost.channelId,
              newPost.authorFingerprint,
              newPost.authorRole,
              newPost.title,
              newPost.content,
              newPost.flair,
              newPost.meritVotes,
              newPost.userVoted,
              newPost.replyCount,
              newPost.boostCount,
              newPost.attachment ? JSON.stringify(newPost.attachment) : null,
              newPost.video ? JSON.stringify(newPost.video) : null,
              newPost.images ? JSON.stringify(newPost.images) : null,
              newPost.pollId || null,
              newPost.quotedPost ? JSON.stringify(newPost.quotedPost) : null,
              newPost.status || 'published',
              newPost.createdAt,
              newPost.isExpanded ? 1 : 0,
              newPost.facetId || null,
              newPost.audience || 'public'
            );

          const runResult = await insertStmt.run();
          if (isProd && runResult && runResult.success === false) {
            return new Response(
              JSON.stringify({ success: false, error: `Database post insert rejected: ${runResult.error || 'D1 error'}` }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }
          if (syntheticMetadata) {
            await ensureSyntheticFixturesTable(db);
            await registerSyntheticFixture(db, 'post', newPost.id, syntheticMetadata);
          }
        }

        // Invalidate KV cache
        if (kv) {
          try {
            await kv.delete('posts:v2:all:all:hot:50:0');
            await kv.delete(`posts:v2:${newPost.channelId}:all:hot:50:0`);
          } catch (_) {}
        }
      } catch (dbErr: any) {
        const msg = String(dbErr?.message || '');
        if (msg.includes('UNIQUE') || msg.includes('constraint') || msg.includes('PRIMARY KEY')) {
          return new Response(
            JSON.stringify({ success: false, error: 'A post with this ID already exists and cannot be overwritten.' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (isProd) {
          return new Response(
            JSON.stringify({ success: false, error: `Database transaction failed: ${dbErr?.message || 'D1 post insert error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        console.warn('[D1 Post Insert Fallback]', dbErr);
      }
    } else if (isProd) {
      return createD1UnavailableResponse();
    }

    // Update in-memory isolate store (Dev/Test or isolate cache)
    const existingIndex = globalPostsStore.findIndex((p) => p.id === newPost.id);
    if (existingIndex >= 0) {
      globalPostsStore[existingIndex] = newPost;
    } else {
      globalPostsStore.unshift(newPost);
    }

    if (globalPostsStore.length > 1000) {
      globalPostsStore.splice(1000);
    }

    // Notify only already-public URLs after successful persistence. No content or identities sent.
    const publiclyVisible = (post: EdgePost | null | undefined) => !!post && (!post.audience || post.audience === 'public') && (!post.status || ['published', 'pinned', 'locked'].includes(post.status));
    if (db && !body.syntheticTest && (publiclyVisible(newPost) || publiclyVisible(existingPost))) {
      const fixture = await db.prepare("SELECT resource_id FROM synthetic_fixtures WHERE resource_type = 'post' AND resource_id = ?").bind(newPost.id).first().catch(() => ({ resource_id: newPost.id }));
      if (!fixture) scheduleIndexNow(context, [postPath(newPost.id), '/explore']);
    }

    // Trigger outbound ActivityPub federation asynchronously
    // Strict privacy rule: ONLY public posts from the default public facet participate in ActivityPub federation!
    if (newPost.status === 'published' && (!newPost.audience || newPost.audience === 'public') && isDefaultFacet) {
      try {
        const origin = new URL(context.request.url).origin;
        const federationPromise = dispatchOutboundPostFederation(context.env, newPost, origin);
        if (typeof (context as any).waitUntil === 'function') {
          (context as any).waitUntil(federationPromise);
        } else {
          federationPromise.catch((fedErr) => {
            console.warn('[ActivityPub Outbound Dispatch Warning]', fedErr);
          });
        }
      } catch (fedErr) {
        console.warn('[ActivityPub Outbound Dispatch Warning]', fedErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: newPost,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'X-Edge-Storage': db ? 'Cloudflare-D1' : 'Edge-Isolate-Memory',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * DELETE /api/posts or /api/posts/:id
 * Body: signed envelope with { action: 'delete-post', postId }
 */
export async function onRequestDelete(context: {
  request: Request;
  env?: Env;
  params?: { id?: string | string[] };
  waitUntil?: (task: Promise<unknown>) => void;
}): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    let postId = '';
    if (context.params?.id) {
      postId = Array.isArray(context.params.id) ? context.params.id.join('/') : String(context.params.id);
    }
    if (!postId) {
      postId = url.searchParams.get('postId') || url.searchParams.get('id') || '';
    }
    if (!postId) {
      const segments = url.pathname.split('/').filter(Boolean);
      const lastSeg = segments[segments.length - 1] || '';
      if (lastSeg && lastSeg !== 'posts') {
        postId = lastSeg;
      }
    }
    postId = decodeURIComponent(postId).trim();

    const rawBodyText = await context.request.clone().text().catch(() => '');
    let body: Record<string, any> | null = null;
    if (rawBodyText) {
      try {
        body = JSON.parse(rawBodyText);
      } catch (_) {}
    }
    if (!postId && body) {
      postId = body.postId || body.id || (body.payload && (body.payload.postId || body.payload.id)) || '';
    }

    if (!postId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Post ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const adminCheck = await requireAdmin(context);
    let callerFingerprint = '';

    if (!adminCheck.authorized) {
      const auth = await requireSignedEnvelope(context, body?.envelope || body);
      if (!auth.authorized) return auth.response!;
      if (auth.payload?.action && auth.payload.action !== 'delete-post') {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid post action' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
      callerFingerprint = auth.fingerprint!;
    }

    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    let channelId = '';
    let wasPublic = false;

    if (db) {
      const postRow = await db.prepare(
        'SELECT id, author_id, channel_id, status, audience FROM posts WHERE id = ?'
      ).bind(postId).first<{ id: string; author_id: string; channel_id: string; status: string; audience?: string }>();

      if (!postRow || postRow.status === 'deleted') {
        return new Response(
          JSON.stringify({ success: false, error: 'Post not found or already deleted' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (!adminCheck.authorized && postRow.author_id !== callerFingerprint) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden: only author or administrator can delete this post' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      channelId = postRow.channel_id;
      wasPublic = (!postRow.audience || postRow.audience === 'public') && (!postRow.status || ['published', 'pinned', 'locked'].includes(postRow.status));

      // Soft-delete post by marking status = 'deleted'
      await db.prepare("UPDATE posts SET status = 'deleted' WHERE id = ?").bind(postId).run();
    } else {
      const post = globalPostsStore.find(p => p.id === postId && p.status !== 'deleted');
      if (!post) {
        return new Response(
          JSON.stringify({ success: false, error: 'Post not found or already deleted' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (!adminCheck.authorized && post.authorFingerprint !== callerFingerprint) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden: only author or administrator can delete this post' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      channelId = post.channelId;
      post.status = 'deleted';
    }

    if (db && wasPublic) {
      const fixture = await db.prepare("SELECT resource_id FROM synthetic_fixtures WHERE resource_type = 'post' AND resource_id = ?").bind(postId).first().catch(() => ({ resource_id: postId }));
      if (!fixture) scheduleIndexNow(context, [postPath(postId), '/explore']);
    }

    // Purge KV cache so edge cache does not serve deleted content
    if (kv) {
      try {
        await kv.delete(`post:${postId}`);
        await kv.delete(`seo:post:${postId}`);
        await kv.delete('posts:all:all:hot:50:0');
        await kv.delete('posts:v2:all:all:hot:50:0');
        if (channelId) {
          await kv.delete(`posts:${channelId}:all:hot:50:0`);
          await kv.delete(`posts:v2:${channelId}:all:hot:50:0`);
        }
      } catch (_) {}
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: postId,
        deleted: true,
        status: 410,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to delete post' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
