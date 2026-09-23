// ===========================================================================
// UREfy — SOVEREIGN SOCIAL GRAPH & FOLLOWS EDGE API (/api/follows)
// Supports: Cloudflare D1 SQL queries, Following/Follower counts,
// Toggle follow/unfollow, and in-memory Edge isolate fallback.
// ===========================================================================

import {
  Env,
  getD1Database,
  isProductionEnv,
  createD1UnavailableResponse,
  globalFollowsStore,
  globalFacetsStore,
  globalFacetFollowsStore,
  EdgeFollow,
} from './_db.js';
import { requireAdmin, requireSignedEnvelope } from './_auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint, X-Facet-Id',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * GET /api/follows
 * Query Params:
 *  - userId / target: Target user or community ID
 *  - currentUserId / userFingerprint: Optional requester ID to check isFollowing
 *  - followerId & followingId: Check specific follow relation
 */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const userId = (url.searchParams.get('userId') || url.searchParams.get('target') || '').trim();
    const currentUserId = (url.searchParams.get('currentUserId') || url.searchParams.get('userFingerprint') || '').trim();
    const queryFollowerId = (url.searchParams.get('followerId') || '').trim();
    const queryFollowingId = (url.searchParams.get('followingId') || '').trim();

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    const facetId = (url.searchParams.get('facetId') || '').trim();
    const followerFacetId = (url.searchParams.get('followerFacetId') || '').trim();
    const followingFacetId = (url.searchParams.get('followingFacetId') || '').trim();

    // Direct pairwise facet follow check: /api/follows?followerFacetId=A&followingFacetId=B
    if (followerFacetId && followingFacetId) {
      let isFollowing = false;
      if (db) {
        const stmt = db.prepare(
          'SELECT 1 FROM facet_follows WHERE follower_facet_id = ? AND following_facet_id = ? LIMIT 1'
        ).bind(followerFacetId, followingFacetId);
        const row = await stmt.first();
        isFollowing = Boolean(row);
      } else {
        isFollowing = globalFacetFollowsStore.some(
          f => f.followerFacetId === followerFacetId && f.followingFacetId === followingFacetId
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          followerFacetId,
          followingFacetId,
          isFollowing,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // Direct pairwise follow check: /api/follows?followerId=A&followingId=B
    if (queryFollowerId && queryFollowingId) {
      let isFollowing = false;
      if (db) {
        const stmt = db.prepare(
          'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1'
        ).bind(queryFollowerId, queryFollowingId);
        const row = await stmt.first();
        isFollowing = Boolean(row);
      } else {
        isFollowing = globalFollowsStore.some(
          f => f.followerId === queryFollowerId && f.followingId === queryFollowingId
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          followerId: queryFollowerId,
          followingId: queryFollowingId,
          isFollowing,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // Query follows for a specific Facet: /api/follows?facetId=...
    if (facetId) {
      let following: string[] = [];
      let followers: string[] = [];
      if (db) {
        const fingRes = await db.prepare('SELECT following_facet_id FROM facet_follows WHERE follower_facet_id = ? ORDER BY created_at DESC LIMIT 200').bind(facetId).all<any>();
        following = (fingRes.results || []).map(r => r.following_facet_id);

        const fersRes = await db.prepare('SELECT follower_facet_id FROM facet_follows WHERE following_facet_id = ? ORDER BY created_at DESC LIMIT 200').bind(facetId).all<any>();
        followers = (fersRes.results || []).map(r => r.follower_facet_id);
      } else {
        following = globalFacetFollowsStore.filter(f => f.followerFacetId === facetId).map(f => f.followingFacetId);
        followers = globalFacetFollowsStore.filter(f => f.followingFacetId === facetId).map(f => f.followerFacetId);
      }
      return new Response(
        JSON.stringify({
          success: true,
          facetId,
          following,
          followers,
          followingCount: following.length,
          followersCount: followers.length,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId or target parameter is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    let following: string[] = [];
    let followers: string[] = [];
    let isFollowing = false;

    if (db) {
      try {
        // Query users followed by target
        const followingStmt = db.prepare(
          'SELECT following_id FROM follows WHERE follower_id = ? ORDER BY created_at DESC LIMIT 200'
        ).bind(userId);
        const followingRes = await followingStmt.all<{ following_id: string }>();
        following = (followingRes.results || []).map(r => r.following_id);

        // Query followers of target
        const followersStmt = db.prepare(
          'SELECT follower_id FROM follows WHERE following_id = ? ORDER BY created_at DESC LIMIT 200'
        ).bind(userId);
        const followersRes = await followersStmt.all<{ follower_id: string }>();
        followers = (followersRes.results || []).map(r => r.follower_id);

        // Check if current requester is following target
        if (currentUserId) {
          const isFollowingStmt = db.prepare(
            'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1'
          ).bind(currentUserId, userId);
          const isFollowingRow = await isFollowingStmt.first();
          isFollowing = Boolean(isFollowingRow);
        }
      } catch (dbErr: any) {
        if (isProd) {
          return new Response(
            JSON.stringify({ success: false, error: `Database error: ${dbErr?.message || 'SQL error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
      }
    } else {
      // In-Memory store fallback
      following = globalFollowsStore
        .filter(f => f.followerId === userId)
        .map(f => f.followingId);
      followers = globalFollowsStore
        .filter(f => f.followingId === userId)
        .map(f => f.followerId);
      if (currentUserId) {
        isFollowing = globalFollowsStore.some(
          f => f.followerId === currentUserId && f.followingId === userId
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        following,
        followers,
        followingCount: following.length,
        followersCount: followers.length,
        isFollowing,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=5, stale-while-revalidate=15',
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

/**
 * POST /api/follows
 * Body:
 *  - followingId / targetId: The user or community to follow
 *  - followerId: The requester's fingerprint/ID (can be derived from auth envelope)
 *  - action: 'follow' | 'unfollow' | 'toggle' (default: 'toggle')
 */
export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    let rawBody: any = null;
    try {
      rawBody = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const body = rawBody?.payload && typeof rawBody.payload === 'object' ? rawBody.payload : rawBody;
    const followingId = String(body?.followingFacetId || body?.followingId || body?.targetId || '').trim();
    let followerId = String(body?.followerFacetId || body?.followerId || '').trim();
    const action = String(body?.action || 'toggle').trim().toLowerCase();

    if (!followingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'followingId or targetId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    let callerFingerprint = followerId;

    // Verify authentication in production or if signed envelope is provided
    const isProd = isProductionEnv(context.env);
    if (isProd || rawBody?.signature) {
      const adminCheck = await requireAdmin(context);
      if (!adminCheck.authorized) {
        const auth = await requireSignedEnvelope(context, rawBody, 'user:follow');
        if (!auth.authorized) {
          if (isProd) {
            return (
              auth.response ||
              new Response(
                JSON.stringify({ success: false, error: 'Cryptographic signature required to follow' }),
                { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
              )
            );
          }
        } else {
          callerFingerprint = auth.fingerprint || callerFingerprint;
          followerId = auth.fingerprint || followerId;
        }
      }
    }

    if (!followerId && !callerFingerprint) {
      return new Response(
        JSON.stringify({ success: false, error: 'followerId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (followerId === followingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot follow yourself' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    const now = Date.now();

    const followerFacetId = String(body?.followerFacetId || (followerId.startsWith('facet-') ? followerId : '')).trim();
    const followingFacetId = String(body?.followingFacetId || (followingId.startsWith('facet-') ? followingId : '')).trim();

    if (followerFacetId && followingFacetId) {
      if (followerFacetId === followingFacetId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot follow the same Facet' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      // Verify that caller owns followerFacetId and target exists
      let facetRecord: any = null;
      let targetFacetRecord: any = null;
      try {
        if (db) {
          facetRecord = await db.prepare('SELECT owner_fingerprint, status FROM facets WHERE id = ?').bind(followerFacetId).first();
          targetFacetRecord = await db.prepare('SELECT owner_fingerprint, status FROM facets WHERE id = ?').bind(followingFacetId).first();
        } else {
          facetRecord = globalFacetsStore.find(f => f.id === followerFacetId);
          targetFacetRecord = globalFacetsStore.find(f => f.id === followingFacetId);
        }
      } catch {
        facetRecord = globalFacetsStore.find(f => f.id === followerFacetId);
        targetFacetRecord = globalFacetsStore.find(f => f.id === followingFacetId);
      }

      if (!targetFacetRecord || targetFacetRecord.status === 'deleted' || targetFacetRecord.status === 'deactivated') {
        return new Response(
          JSON.stringify({ success: false, error: 'Target Facet not found or is no longer active' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      const followerOwner = facetRecord?.owner_fingerprint || facetRecord?.ownerFingerprint;
      const targetOwner = targetFacetRecord?.owner_fingerprint || targetFacetRecord?.ownerFingerprint;

      if (!facetRecord || (followerOwner && followerOwner !== callerFingerprint)) {
        return new Response(
          JSON.stringify({ success: false, error: 'You do not own the specified follower Facet' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (facetRecord.status === 'deleted' || facetRecord.status === 'deactivated') {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot follow using an inactive or deleted Facet' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (followerOwner && targetOwner && followerOwner === targetOwner) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot follow your own Facet or identity' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      // Root identity block check: Person B cannot follow Person A across new facets
      if (followerOwner && targetOwner && db) {
        try {
          await db.prepare('CREATE TABLE IF NOT EXISTS user_blocks (blocker_id TEXT NOT NULL, blocked_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (blocker_id, blocked_id))').run();
          const isBlocked = await db.prepare(
            'SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1'
          ).bind(followerOwner, targetOwner, targetOwner, followerOwner).first();
          if (isBlocked) {
            return new Response(
              JSON.stringify({ success: false, error: 'Cannot follow this user due to privacy blocks' }),
              { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
            );
          }
        } catch (_) {}
      }

      let isFacetFollowing = false;
      if (db) {
        const existing = await db.prepare(
          'SELECT 1 FROM facet_follows WHERE follower_facet_id = ? AND following_facet_id = ? LIMIT 1'
        ).bind(followerFacetId, followingFacetId).first();
        isFacetFollowing = Boolean(existing);
      } else {
        isFacetFollowing = globalFacetFollowsStore.some(
          f => f.followerFacetId === followerFacetId && f.followingFacetId === followingFacetId
        );
      }

      let shouldFollowFacet = false;
      if (action === 'follow') shouldFollowFacet = true;
      else if (action === 'unfollow') shouldFollowFacet = false;
      else shouldFollowFacet = !isFacetFollowing;

      if (shouldFollowFacet) {
        if (db) {
          await db.prepare(
            'INSERT OR REPLACE INTO facet_follows (follower_facet_id, following_facet_id, created_at) VALUES (?, ?, ?)'
          ).bind(followerFacetId, followingFacetId, now).run();
        }
        const idx = globalFacetFollowsStore.findIndex(
          f => f.followerFacetId === followerFacetId && f.followingFacetId === followingFacetId
        );
        if (idx < 0) {
          globalFacetFollowsStore.push({ followerFacetId, followingFacetId, createdAt: now });
        }
      } else {
        if (db) {
          await db.prepare(
            'DELETE FROM facet_follows WHERE follower_facet_id = ? AND following_facet_id = ?'
          ).bind(followerFacetId, followingFacetId).run();
        }
        const idx = globalFacetFollowsStore.findIndex(
          f => f.followerFacetId === followerFacetId && f.followingFacetId === followingFacetId
        );
        if (idx >= 0) {
          globalFacetFollowsStore.splice(idx, 1);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          followerFacetId,
          followingFacetId,
          isFollowing: shouldFollowFacet,
          action: shouldFollowFacet ? 'follow' : 'unfollow',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (followerId && followingId && db) {
      try {
        await db.prepare('CREATE TABLE IF NOT EXISTS user_blocks (blocker_id TEXT NOT NULL, blocked_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (blocker_id, blocked_id))').run();
        const isBlocked = await db.prepare(
          'SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1'
        ).bind(followerId, followingId, followingId, followerId).first();
        if (isBlocked) {
          return new Response(
            JSON.stringify({ success: false, error: 'Cannot follow this user due to privacy blocks' }),
            { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
      } catch (_) {}
    }

    let currentlyFollowing = false;

    if (db) {
      const existing = await db.prepare(
        'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1'
      ).bind(followerId, followingId).first();
      currentlyFollowing = Boolean(existing);
    } else {
      currentlyFollowing = globalFollowsStore.some(
        f => f.followerId === followerId && f.followingId === followingId
      );
    }

    let shouldFollow = false;
    if (action === 'follow') {
      shouldFollow = true;
    } else if (action === 'unfollow') {
      shouldFollow = false;
    } else {
      // toggle
      shouldFollow = !currentlyFollowing;
    }

    if (shouldFollow) {
      if (db) {
        await db.prepare(
          'INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)'
        ).bind(followerId, followingId, now).run();
      }
      const existingIdx = globalFollowsStore.findIndex(
        f => f.followerId === followerId && f.followingId === followingId
      );
      if (existingIdx < 0) {
        globalFollowsStore.push({ followerId, followingId, createdAt: now });
      }
    } else {
      if (db) {
        await db.prepare(
          'DELETE FROM follows WHERE follower_id = ? AND following_id = ?'
        ).bind(followerId, followingId).run();
      }
      const existingIdx = globalFollowsStore.findIndex(
        f => f.followerId === followerId && f.followingId === followingId
      );
      if (existingIdx >= 0) {
        globalFollowsStore.splice(existingIdx, 1);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        followerId,
        followingId,
        isFollowing: shouldFollow,
        action: shouldFollow ? 'follow' : 'unfollow',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

/**
 * DELETE /api/follows
 * Query Params or JSON Body:
 *  - followerId & followingId
 */
export async function onRequestDelete(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const raw = await context.request.json().catch(() => null);
    const auth = await requireSignedEnvelope(context, raw, 'user:follow');
    if (!auth.authorized) return auth.response!;
    if (auth.payload?.action !== 'unfollow') return Response.json({ success: false, error: 'Invalid follow action' }, { status: 400 });
    const followerId = auth.fingerprint!;
    const followingId = String(auth.payload.followingId || '').trim();

    if (!followerId || !followingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Both followerId and followingId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    if (db) {
      await db.prepare(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?'
      ).bind(followerId, followingId).run();
    }

    const existingIdx = globalFollowsStore.findIndex(
      f => f.followerId === followerId && f.followingId === followingId
    );
    if (existingIdx >= 0) {
      globalFollowsStore.splice(existingIdx, 1);
    }

    return new Response(
      JSON.stringify({
        success: true,
        followerId,
        followingId,
        isFollowing: false,
        action: 'unfollow',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
