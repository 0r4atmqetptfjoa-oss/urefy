// ===========================================================================
// UREfy — SOVEREIGN PROFILES EDGE API (/api/profiles)
// Supports: Public profile queries, handle resolution, profile mutations with
// signed envelopes, follower/following counts, and D1 / in-memory fallback.
// ZERO EXPOSURE of private keys, mnemonics, or internal seeds.
// ===========================================================================

import {
  Env,
  getD1Database,
  isProductionEnv,
  createD1UnavailableResponse,
  globalProfilesStore,
  globalFollowsStore,
  globalPostsStore,
  EdgeUserProfile,
} from './_db.js';
import { requireSignedEnvelope } from './_auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function sanitizeUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const clean = raw.trim();
  if (/^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/.*)?$/i.test(clean)) {
    return clean;
  }
  return undefined;
}

/**
 * GET /api/profiles
 * Query params:
 *  - userId: user fingerprint/ID
 *  - handle: @handle without '@' prefix
 */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const userId = (url.searchParams.get('userId') || '').trim();
    let handle = (url.searchParams.get('handle') || '').trim();
    if (handle.startsWith('@')) handle = handle.slice(1);

    if (!userId && !handle) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either userId or handle parameter is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    let profile: EdgeUserProfile | null = null;
    let followersCount = 0;
    let followingCount = 0;
    let postsCount = 0;

    if (db) {
      let row: any = null;
      if (userId) {
        row = await db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').bind(userId).first();
      } else if (handle) {
        row = await db.prepare('SELECT * FROM user_profiles WHERE handle = ? COLLATE NOCASE').bind(handle).first();
      }

      if (row) {
        let interests: string[] = [];
        try {
          if (row.interests_json) interests = JSON.parse(row.interests_json);
        } catch (_) {}

        profile = {
          userId: row.user_id,
          displayName: row.display_name,
          handle: row.handle,
          bio: row.bio || undefined,
          avatarUrl: row.avatar_url || undefined,
          bannerUrl: row.banner_url || undefined,
          pinnedPostId: row.pinned_post_id || undefined,
          interests,
          website: row.website || undefined,
          location: row.location || undefined,
          createdAt: Number(row.created_at),
          updatedAt: Number(row.updated_at),
        };
      }

      const targetUid = profile ? profile.userId : userId;
      if (targetUid) {
        const fCountRow = await db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').bind(targetUid).first<{ count: number }>();
        followersCount = fCountRow?.count || 0;

        const fingCountRow = await db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').bind(targetUid).first<{ count: number }>();
        followingCount = fingCountRow?.count || 0;

        const pCountRow = await db.prepare('SELECT COUNT(*) as count FROM posts WHERE author_id = ?').bind(targetUid).first<{ count: number }>();
        postsCount = pCountRow?.count || 0;
      }
    } else {
      if (userId) {
        profile = globalProfilesStore.find(p => p.userId === userId) || null;
      } else if (handle) {
        profile = globalProfilesStore.find(p => p.handle.toLowerCase() === handle.toLowerCase()) || null;
      }

      const targetUid = profile ? profile.userId : userId;
      if (targetUid) {
        followersCount = globalFollowsStore.filter(f => f.followingId === targetUid).length;
        followingCount = globalFollowsStore.filter(f => f.followerId === targetUid).length;
        postsCount = globalPostsStore.filter(p => p.authorFingerprint === targetUid).length;
      }
    }

    if (!profile) {
      // Return synthetic default view for valid fingerprint if not yet configured
      if (userId) {
        return new Response(
          JSON.stringify({
            success: true,
            profile: {
              userId,
              displayName: `User ${userId.slice(0, 8)}`,
              handle: `user_${userId.slice(0, 8)}`,
              bio: '',
              avatarUrl: '',
              bannerUrl: '',
              createdAt: 0,
              updatedAt: 0,
            },
            stats: {
              followersCount,
              followingCount,
              postsCount,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile,
        stats: {
          followersCount,
          followingCount,
          postsCount,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to fetch profile' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

/**
 * POST /api/profiles
 * Body: { userId, displayName, handle, bio, avatarUrl, bannerUrl, pinnedPostId, interests, website, location, envelope? }
 * Requires signed envelope or authorized requester matching userId.
 */
export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const raw = await context.request.json().catch(() => null) as Record<string, any> | null;
    if (!raw) {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const auth = await requireSignedEnvelope(context, raw.envelope || raw);
    if (!auth.authorized) return auth.response!;
    const body = auth.payload as Record<string, any>;
    if (body.scope !== 'urefy-profile-v1' || body.action !== 'save') return Response.json({ success: false, error: 'Invalid profile request' }, { status: 400 });
    let userId = auth.fingerprint!;
    let displayName = (body.displayName || '').trim();
    let handle = (body.handle || '').trim();
    let bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 500) : undefined;
    let avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : undefined;
    let bannerUrl = typeof body.bannerUrl === 'string' ? body.bannerUrl.trim() : undefined;
    let pinnedPostId = typeof body.pinnedPostId === 'string' ? body.pinnedPostId.trim() : undefined;
    let interests: string[] = Array.isArray(body.interests) ? body.interests.filter(i => typeof i === 'string') : [];
    let website = sanitizeUrl(body.website);
    let location = typeof body.location === 'string' ? body.location.trim().slice(0, 100) : undefined;

    for (const image of [avatarUrl, bannerUrl]) {
      if (image && !sanitizeUrl(image)) return Response.json({ success: false, error: 'Profile images must use an http or https URL' }, { status: 400 });
    }

    if (handle.startsWith('@')) handle = handle.slice(1);

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (!displayName || displayName.length > 60) {
      return new Response(
        JSON.stringify({ success: false, error: 'displayName must be between 1 and 60 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (!handle || !/^[a-zA-Z0-9_]{3,30}$/.test(handle)) {
      return new Response(
        JSON.stringify({ success: false, error: 'handle must be 3-30 alphanumeric characters or underscores' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    // Check handle uniqueness
    if (db) {
      const existingHandle = await db
        .prepare('SELECT user_id FROM user_profiles WHERE handle = ? COLLATE NOCASE AND user_id != ?')
        .bind(handle, userId)
        .first();
      if (existingHandle) {
        return new Response(
          JSON.stringify({ success: false, error: 'Handle is already taken' }),
          { status: 409, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    } else {
      const existingHandle = globalProfilesStore.find(
        p => p.handle.toLowerCase() === handle.toLowerCase() && p.userId !== userId
      );
      if (existingHandle) {
        return new Response(
          JSON.stringify({ success: false, error: 'Handle is already taken' }),
          { status: 409, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    }

    const now = Date.now();

    const profile: EdgeUserProfile = {
      userId,
      displayName,
      handle,
      bio,
      avatarUrl,
      bannerUrl,
      pinnedPostId,
      interests,
      website,
      location,
      createdAt: now,
      updatedAt: now,
    };

    if (db) {
      await db.prepare(
        `INSERT INTO user_profiles (
          user_id, display_name, handle, bio, avatar_url, banner_url,
          pinned_post_id, interests_json, website, location, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          display_name = excluded.display_name,
          handle = excluded.handle,
          bio = excluded.bio,
          avatar_url = excluded.avatar_url,
          banner_url = excluded.banner_url,
          pinned_post_id = excluded.pinned_post_id,
          interests_json = excluded.interests_json,
          website = excluded.website,
          location = excluded.location,
          updated_at = excluded.updated_at`
      ).bind(
        userId, displayName, handle, bio || null, avatarUrl || null, bannerUrl || null,
        pinnedPostId || null, JSON.stringify(interests), website || null, location || null,
        now, now
      ).run();
    } else {
      const idx = globalProfilesStore.findIndex(p => p.userId === userId);
      if (idx >= 0) {
        profile.createdAt = globalProfilesStore[idx].createdAt;
        globalProfilesStore[idx] = profile;
      } else {
        globalProfilesStore.push(profile);
      }
    }

    return new Response(
      JSON.stringify({ success: true, profile }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to update profile' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
