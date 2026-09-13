// ===========================================================================
// UREfy — POSTS & CHRONOSTREAM EDGE API
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
  isProductionEnv,
  createD1UnavailableResponse,
} from './_db.js';
import { requireAdmin, requireSignedEnvelope } from './_auth.js';

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

    const isProd = isProductionEnv(context.env);
    let posts: EdgePost[] = [];

    // 2. Query Cloudflare D1 Database if binding available
    if (db) {
      try {
        let query = "SELECT * FROM posts WHERE (status IN ('published', 'pinned', 'locked') OR status IS NULL) AND (status != 'shadowbanned' OR status IS NULL)";
        const params: any[] = [];

        if (channelId && channelId !== 'all') {
          query += ' AND channel_id = ?';
          params.push(channelId);
        }

        if (flair && flair !== 'all') {
          query += ' AND flair = ?';
          params.push(flair);
        }

        if (sort === 'new' || sort === 'chrono') {
          query += ' ORDER BY created_at DESC';
        } else if (sort === 'top') {
          query += ' ORDER BY merit_votes DESC, created_at DESC';
        } else {
          // Hot ranking SQLite approximation
          query += ' ORDER BY (merit_votes + (boost_count * 2) + (reply_count * 1.5)) DESC, created_at DESC';
        }

        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const stmt = db.prepare(query).bind(...params);
        const { results } = await stmt.all<any>();

        if (results && results.length > 0) {
          posts = results.map(parseD1PostRow);
        } else if (isProd) {
          posts = [];
        } else {
          // If D1 is empty on initial migration in dev/test, fallback to in-memory seed posts
          let fallback = [...globalPostsStore];
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
      const voteDir = Number(direction) || 0;

      // Update in D1 if available
      if (db) {
        try {
          // Check if post exists
          const existing = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<any>();
          if (existing) {
            const currentVotes = Number(existing.merit_votes ?? existing.meritVotes) || 0;
            const newVotes = currentVotes + voteDir;

            const updateStmt = db
              .prepare('UPDATE posts SET merit_votes = merit_votes + ? WHERE id = ?')
              .bind(voteDir, postId);

            // Record vote in ledger
            const voteId = `vote-${postId}-${userFingerprint}`;
            const ballotStmt = db
              .prepare(
                'INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES (?, ?, ?, ?, ?, ?)'
              )
              .bind(voteId, 'post', postId, userFingerprint, voteDir, Date.now());

            const batchResults = await db.batch([updateStmt, ballotStmt]);

            if (isProd && batchResults.some((r: any) => r && r.success === false)) {
              return new Response(
                JSON.stringify({ success: false, error: 'Database atomic vote transaction failed in D1' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
              );
            }

            existing.merit_votes = newVotes;
            existing.meritVotes = newVotes;
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
      post.meritVotes += voteDir;
      return new Response(
        JSON.stringify({ success: true, post }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ─── ACTION: ANONYMOUS VOTE (CHAUMIAN BLIND SIGNATURE BALLOT) ────────────
    if (body.action === 'anonymous-vote') {
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

    const randSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 8)
      : Date.now().toString(36);
    const targetPostId = body.id || `post-${Date.now()}-${randSuffix}`;

    const newPost: EdgePost = {
      id: targetPostId,
      channelId: body.channelId || existingPost?.channelId || 'pulse-global',
      authorFingerprint: existingPost ? existingPost.authorFingerprint : authorFingerprint,
      authorRole,
      title: body.title !== undefined ? body.title : (existingPost?.title || 'Sovereign Pulse'),
      content: body.content !== undefined ? body.content : (existingPost?.content || ''),
      flair: body.flair || existingPost?.flair || (body.title ? 'TECH DISCUSSION' : 'MICRO-PULSE'),
      status: postStatus,
      meritVotes: adminCheck.authorized
        ? (typeof body.meritVotes === 'number' ? body.meritVotes : (typeof body.merit_votes === 'number' ? body.merit_votes : (existingPost?.meritVotes ?? 1)))
        : (existingPost ? existingPost.meritVotes : 1),
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
    };

    // Strict input validation
    if (!newPost.title?.trim() && !newPost.content?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Post must contain either a title or content' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
                quoted_post_json = ?, status = ?
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
                quoted_post_json, status, created_at, is_expanded
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
              newPost.isExpanded ? 1 : 0
            );

          const runResult = await insertStmt.run();
          if (isProd && runResult && runResult.success === false) {
            return new Response(
              JSON.stringify({ success: false, error: `Database post insert rejected: ${runResult.error || 'D1 error'}` }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }

        // Invalidate KV cache
        if (kv) {
          try {
            await kv.delete('posts:all:all:hot:50:0');
            await kv.delete(`posts:${newPost.channelId}:all:hot:50:0`);
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
