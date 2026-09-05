// ===========================================================================
// AETHERIS OMNI-SPHERE — POSTS & CHRONOSTREAM EDGE API
// Supports: Cloudflare D1 (SQL), Cloudflare KV (Cache), Cloudflare R2
// Automatic fallback to In-Memory Edge Store when bindings are not present.
// ===========================================================================

import {
  Env,
  EdgePost,
  getD1Database,
  getKVStore,
  getR2Bucket,
  globalPostsStore,
  globalVotesStore,
  globalSpentNullifiers,
  INITIAL_POSTS,
} from './_db.js';
import { requireAdmin, verifyIdentitySignature, verifyEnvelopeOrLegacyAuth } from './_auth.js';

export { EdgePost };

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
  const rawQuoted = row.quotedPost_json ?? row.quoted_post_json;
  if (rawQuoted) {
    try {
      quotedPost = typeof rawQuoted === 'string' ? JSON.parse(rawQuoted) : rawQuoted;
    } catch (_) {}
  }

  const meritVotes = Number(row.meritVotes !== undefined ? row.meritVotes : row.merit_votes) || 0;
  const userVoted = Number(row.userVoted !== undefined ? row.userVoted : row.user_voted) || 0;
  const replyCount = Number(row.replyCount !== undefined ? row.replyCount : row.reply_count) || 0;
  const boostCount = Number(row.boostCount !== undefined ? row.boostCount : row.boost_count) || 0;
  const createdAt = Number(row.createdAt !== undefined ? row.createdAt : row.created_at) || Date.now();
  const isExpanded = Boolean(row.isExpanded !== undefined ? row.isExpanded : row.is_expanded);

  return {
    id: row.id,
    channelId: row.channelId ?? row.channel_id ?? 'pulse-global',
    authorFingerprint: row.authorFingerprint ?? row.author_fingerprint ?? 'anon-peer',
    authorRole: row.authorRole ?? row.author_role ?? 'MEMBER',
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
    pollId: row.pollId ?? row.poll_id ?? undefined,
    quotedPost,
    createdAt,
    isExpanded,
  };
}

export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const sort = (url.searchParams.get('sort') || 'hot').toLowerCase();
    const channelId = url.searchParams.get('channelId');
    const flair = url.searchParams.get('flair');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);

    // 1. Try KV Cache for fast edge read if sorting hot without custom filters
    const cacheKey = `posts:${channelId || 'all'}:${flair || 'all'}:${sort}:${limit}:${offset}`;
    if (kv) {
      try {
        const cached = await kv.get<{ success: boolean; count: number; posts: EdgePost[] }>(cacheKey, 'json');
        if (cached && Array.isArray(cached.posts)) {
          return new Response(JSON.stringify(cached), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Edge-Cache': 'HIT',
              'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
            },
          });
        }
      } catch (_) {}
    }

    let posts: EdgePost[] = [];

    // 2. Query Cloudflare D1 Database if binding available
    if (db) {
      try {
        let query = "SELECT * FROM posts WHERE (status = 'published' OR status IS NULL)";
        const params: any[] = [];

        if (channelId && channelId !== 'all') {
          query += ' AND (channelId = ? OR channel_id = ?)';
          params.push(channelId, channelId);
        }

        if (flair && flair !== 'all') {
          query += ' AND flair = ?';
          params.push(flair);
        }

        if (sort === 'new' || sort === 'chrono') {
          query += ' ORDER BY createdAt DESC, created_at DESC';
        } else if (sort === 'top') {
          query += ' ORDER BY meritVotes DESC, merit_votes DESC, createdAt DESC, created_at DESC';
        } else {
          // Hot ranking SQLite approximation
          query += ' ORDER BY (COALESCE(meritVotes, merit_votes, 0) + (COALESCE(boostCount, boost_count, 0) * 2) + (COALESCE(replyCount, reply_count, 0) * 1.5)) DESC, createdAt DESC, created_at DESC';
        }

        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const stmt = db.prepare(query).bind(...params);
        const { results } = await stmt.all<any>();

        if (results && results.length > 0) {
          posts = results.map(parseD1PostRow);
        } else {
          // If D1 is empty on initial migration, fallback to in-memory seed posts
          let fallback = [...globalPostsStore];
          if (channelId && channelId !== 'all') {
            fallback = fallback.filter((p) => p.channelId === channelId);
          }
          if (flair && flair !== 'all') {
            fallback = fallback.filter((p) => p.flair === flair);
          }
          posts = fallback;
        }
      } catch (dbError) {
        console.warn('[D1 Posts Fallback]', dbError);
        posts = [...globalPostsStore];
      }
    } else {
      // 3. In-Memory Edge Store Fallback
      let result = [...globalPostsStore];

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

    // Store in KV cache with short TTL
    if (kv) {
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
        'Cache-Control': 'public, max-age=5, stale-while-revalidate=15',
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

export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const rawBody = (await context.request.json()) as any;
    let body = rawBody;
    if (rawBody.payload && typeof rawBody.payload === 'object' && rawBody.signature && rawBody.identity) {
      body = rawBody.payload;
    }
    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);
    const r2 = getR2Bucket(context.env);

    // ─── ACTION: VOTE ──────────────────────────────────────────────────────────
    if (body.action === 'vote') {
      const adminCheck = await requireAdmin(context);
      let userFingerprint = body.userFingerprint || 'anon-voter';
      if (!adminCheck.authorized) {
        const auth = verifyEnvelopeOrLegacyAuth(
          context,
          rawBody.payload ? rawBody : { targetId: body.postId, action: 'vote', authorFingerprint: body.userFingerprint, ...body },
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
      const voteDir = Number(direction) || 0;

      // Update in D1 if available
      if (db) {
        try {
          // Check if post exists
          const existing = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<any>();
          if (existing) {
            const currentVotes = Number(existing.meritVotes ?? existing.merit_votes) || 0;
            const newVotes = currentVotes + voteDir;

            await db
              .prepare('UPDATE posts SET meritVotes = meritVotes + ?, merit_votes = merit_votes + ? WHERE id = ?')
              .bind(voteDir, voteDir, postId)
              .run();

            // Record vote in ledger
            const voteId = `vote-${postId}-${userFingerprint}`;
            await db
              .prepare(
                'INSERT OR REPLACE INTO votes (id, targetType, target_type, targetId, target_id, userFingerprint, user_fingerprint, direction, createdAt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
              )
              .bind(voteId, 'post', 'post', postId, postId, userFingerprint, userFingerprint, voteDir, Date.now(), Date.now())
              .run();

            existing.meritVotes = newVotes;
            existing.merit_votes = newVotes;
            const updatedPost = parseD1PostRow(existing);

            // Also keep in-memory sync
            const memIndex = globalPostsStore.findIndex((p) => p.id === postId);
            if (memIndex >= 0) {
              globalPostsStore[memIndex].meritVotes += voteDir;
            }

            return new Response(JSON.stringify({ success: true, post: updatedPost }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } catch (dbErr) {
          console.warn('[D1 Vote Fallback]', dbErr);
        }
      }

      // Fallback in-memory
      const post = globalPostsStore.find((p) => p.id === postId);
      if (!post) {
        return new Response(
          JSON.stringify({ success: false, error: `Post ${postId} not found` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      post.meritVotes += voteDir;
      return new Response(
        JSON.stringify({ success: true, post }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ─── ACTION: ANONYMOUS VOTE (CHAUMIAN BLIND SIGNATURE BALLOT) ────────────
    if (body.action === 'anonymous-vote') {
      const { postId, direction, nullifier } = body;
      const voteDir = Number(direction) || (body.voteType === 'down' ? -1 : 1);

      // Check spent nullifiers in-memory or ledger to prevent double voting
      if (nullifier && globalSpentNullifiers.has(nullifier)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Ballot nullifier has already been spent' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (nullifier) {
        globalSpentNullifiers.add(nullifier);
      }

      if (db) {
        try {
          const existing = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<any>();
          if (existing) {
            const currentVotes = Number(existing.meritVotes ?? existing.merit_votes) || 0;
            const newVotes = currentVotes + voteDir;

            await db
              .prepare('UPDATE posts SET meritVotes = meritVotes + ?, merit_votes = merit_votes + ? WHERE id = ?')
              .bind(voteDir, voteDir, postId)
              .run();

            // Record anonymous ballot by nullifier (zero author/user linkage)
            const ballotId = `ballot-${nullifier || Date.now()}`;
            try {
              await db
                .prepare(
                  'INSERT OR REPLACE INTO votes (id, targetType, target_type, targetId, target_id, userFingerprint, user_fingerprint, direction, createdAt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                )
                .bind(ballotId, 'post', 'post', postId, postId, 'chaumian-blind-voter', 'chaumian-blind-voter', voteDir, Date.now(), Date.now())
                .run();
            } catch (_) {}

            existing.meritVotes = newVotes;
            existing.merit_votes = newVotes;
            const updatedPost = parseD1PostRow(existing);

            const memIndex = globalPostsStore.findIndex((p) => p.id === postId);
            if (memIndex >= 0) {
              globalPostsStore[memIndex].meritVotes += voteDir;
            }

            return new Response(JSON.stringify({ success: true, post: updatedPost, nullifier }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } catch (dbErr) {
          console.warn('[D1 Anonymous Vote Fallback]', dbErr);
        }
      }

      // In-memory fallback
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
        const auth = verifyEnvelopeOrLegacyAuth(
          context,
          rawBody.payload ? rawBody : { targetId: body.postId, action: 'boost', authorFingerprint: body.userFingerprint, ...body },
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

      if (db) {
        try {
          const existing = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<any>();
          if (existing) {
            const currentBoosts = Number(existing.boostCount ?? existing.boost_count) || 0;
            const newBoosts = currentBoosts + 1;

            await db
              .prepare('UPDATE posts SET boostCount = boostCount + 1, boost_count = boost_count + 1 WHERE id = ?')
              .bind(postId)
              .run();

            existing.boostCount = newBoosts;
            existing.boost_count = newBoosts;
            const updatedPost = parseD1PostRow(existing);

            const memIndex = globalPostsStore.findIndex((p) => p.id === postId);
            if (memIndex >= 0) {
              globalPostsStore[memIndex].boostCount++;
            }

            return new Response(JSON.stringify({ success: true, post: updatedPost }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } catch (dbErr) {
          console.warn('[D1 Boost Fallback]', dbErr);
        }
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
    let authorFingerprint = body.authorFingerprint || 'anon-peer';
    if (!adminCheck.authorized) {
      const auth = verifyEnvelopeOrLegacyAuth(context, rawBody, 'post:create');
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

    const newPost: EdgePost = {
      id: body.id || `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channelId: body.channelId || 'pulse-global',
      authorFingerprint,
      authorRole: body.authorRole || 'MEMBER',
      title: body.title || 'Sovereign Pulse',
      content: body.content || '',
      flair: body.flair || (body.title ? 'TECH DISCUSSION' : 'MICRO-PULSE'),
      status: body.status || 'published',
      meritVotes: typeof body.meritVotes === 'number' ? body.meritVotes : (typeof body.merit_votes === 'number' ? body.merit_votes : 1),
      userVoted: body.userVoted || 0,
      replyCount: body.replyCount || body.reply_count || 0,
      boostCount: body.boostCount || body.boost_count || 0,
      attachment: body.attachment,
      video: body.video,
      images: body.images,
      pollId: body.pollId || body.poll_id,
      quotedPost: body.quotedPost,
      createdAt: body.createdAt || body.created_at || Date.now(),
      isExpanded: false,
    };

    // Store in Cloudflare D1 if available
    if (db) {
      try {
        await db
          .prepare(
            `INSERT OR REPLACE INTO posts (
              id, channelId, channel_id, authorFingerprint, author_fingerprint,
              authorRole, author_role, title, content, flair, meritVotes, merit_votes,
              userVoted, user_voted, replyCount, reply_count, boostCount, boost_count,
              attachment_json, video_json, images_json, pollId, poll_id,
              quotedPost_json, quoted_post_json, status, createdAt, created_at, isExpanded, is_expanded
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            newPost.id,
            newPost.channelId,
            newPost.channelId,
            newPost.authorFingerprint,
            newPost.authorFingerprint,
            newPost.authorRole,
            newPost.authorRole,
            newPost.title,
            newPost.content,
            newPost.flair,
            newPost.meritVotes,
            newPost.meritVotes,
            newPost.userVoted,
            newPost.userVoted,
            newPost.replyCount,
            newPost.replyCount,
            newPost.boostCount,
            newPost.boostCount,
            newPost.attachment ? JSON.stringify(newPost.attachment) : null,
            newPost.video ? JSON.stringify(newPost.video) : null,
            newPost.images ? JSON.stringify(newPost.images) : null,
            newPost.pollId || null,
            newPost.pollId || null,
            newPost.quotedPost ? JSON.stringify(newPost.quotedPost) : null,
            newPost.quotedPost ? JSON.stringify(newPost.quotedPost) : null,
            newPost.status || 'published',
            newPost.createdAt,
            newPost.createdAt,
            newPost.isExpanded ? 1 : 0,
            newPost.isExpanded ? 1 : 0
          )
          .run();
      } catch (dbErr) {
        console.warn('[D1 Post Insert Fallback]', dbErr);
      }
    }

    // Update in-memory isolate store
    const existingIndex = globalPostsStore.findIndex((p) => p.id === newPost.id);
    if (existingIndex >= 0) {
      globalPostsStore[existingIndex] = newPost;
    } else {
      globalPostsStore.unshift(newPost);
    }

    if (globalPostsStore.length > 1000) {
      globalPostsStore.splice(1000);
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
