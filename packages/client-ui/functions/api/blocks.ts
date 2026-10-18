// ===========================================================================
// UREfy — SOCIAL SAFETY: BLOCKS & MUTES EDGE API (/api/blocks)
// Supports: Server-enforced blocking, timeline muting, Cloudflare D1 SQL,
// and In-Memory Edge Isolate Fallback.
// ===========================================================================
import {
  Env,
  getD1Database,
  isProductionEnv,
  createD1UnavailableResponse,
  globalBlocksStore,
  globalMutesStore,
  globalFacetsStore,
  globalFacetFollowsStore,
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

/**
 * GET /api/blocks?userId=...
 * Returns list of blocked and muted user IDs for the requester.
 */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const headerFp = (context.request.headers.get('X-User-Fingerprint') || '').trim();
    const queryUserId = (url.searchParams.get('userId') || '').trim();
    const userId = queryUserId || headerFp;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId parameter and X-User-Fingerprint header are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (!headerFp || (queryUserId && headerFp !== queryUserId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: authenticated X-User-Fingerprint matching userId is required' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);
    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    let blockedUsers: string[] = [];
    let mutedUsers: string[] = [];

    if (db) {
      const [blockRes, muteRes] = await db.batch<{ blocked_id?: string; muted_id?: string }>([
        db.prepare('SELECT blocked_id FROM user_blocks WHERE blocker_id = ?').bind(userId),
        db.prepare('SELECT muted_id FROM user_mutes WHERE muter_id = ?').bind(userId),
      ]);
      blockedUsers = (blockRes?.results || []).map(r => String(r.blocked_id));
      mutedUsers = (muteRes?.results || []).map(r => String(r.muted_id));
    } else {
      blockedUsers = globalBlocksStore
        .filter(b => b.blockerId === userId)
        .map(b => b.blockedId);
      mutedUsers = globalMutesStore
        .filter(m => m.muterId === userId)
        .map(m => m.mutedId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        blockedUsers,
        mutedUsers,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-store',
          ...CORS_HEADERS,
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to fetch blocks/mutes' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

/**
 * POST /api/blocks
 * Requires canonical SovereignSignedEnvelope for cryptographic ownership verification.
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
    if (!auth.authorized || !auth.fingerprint) {
      return auth.response!;
    }

    const userId = auth.fingerprint;
    const payload = (auth.payload || {}) as Record<string, any>;
    const action = String(payload.action || body.action || '').trim().toLowerCase();
    const targetId = String(
      payload.targetId || payload.targetUserId || payload.blockedId || payload.mutedId || body.targetId || ''
    ).trim();

    if (!['block', 'unblock', 'mute', 'unmute', 'block-person', 'block-facet'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action. Must be block, unblock, mute, unmute, block-person, or block-facet' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }
    if (!userId || !targetId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId and targetId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }
    if (userId === targetId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot block or mute yourself' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);
    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    const now = Date.now();
    let resolvedTargetId = targetId;
    if (action === 'block-person' || action === 'block' || payload.blockScope === 'person' || body.blockScope === 'person') {
      if (db) {
        const fRow = await db.prepare('SELECT owner_fingerprint FROM facets WHERE id = ?').bind(targetId).first<{ owner_fingerprint: string }>();
        if (fRow && fRow.owner_fingerprint) resolvedTargetId = fRow.owner_fingerprint;
      } else {
        const fMem = globalFacetsStore.find(f => f.id === targetId);
        if (fMem) resolvedTargetId = fMem.ownerFingerprint;
      }
    }

    if (resolvedTargetId === userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot block your own facet or identity' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (action === 'block' || action === 'block-person' || action === 'block-facet') {
      if (db) {
        await db.batch([
          db.prepare('INSERT OR REPLACE INTO user_blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)').bind(userId, resolvedTargetId, now),
          db.prepare('DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)').bind(userId, resolvedTargetId, resolvedTargetId, userId),
          db.prepare(`DELETE FROM facet_follows WHERE
            (follower_facet_id IN (SELECT id FROM facets WHERE owner_fingerprint = ?) AND following_facet_id IN (SELECT id FROM facets WHERE owner_fingerprint = ?))
            OR (follower_facet_id IN (SELECT id FROM facets WHERE owner_fingerprint = ?) AND following_facet_id IN (SELECT id FROM facets WHERE owner_fingerprint = ?))
          `).bind(userId, resolvedTargetId, resolvedTargetId, userId),
        ]);
      } else {
        const existing = globalBlocksStore.findIndex(b => b.blockerId === userId && b.blockedId === resolvedTargetId);
        if (existing < 0) {
          globalBlocksStore.push({ blockerId: userId, blockedId: resolvedTargetId, createdAt: now });
        }
        const userFacetIds = new Set(globalFacetsStore.filter(f => f.ownerFingerprint === userId).map(f => f.id));
        const targetFacetIds = new Set(globalFacetsStore.filter(f => f.ownerFingerprint === resolvedTargetId || f.id === resolvedTargetId).map(f => f.id));
        for (let i = globalFacetFollowsStore.length - 1; i >= 0; i--) {
          const ff = globalFacetFollowsStore[i];
          if ((userFacetIds.has(ff.followerFacetId) && targetFacetIds.has(ff.followingFacetId)) ||
              (targetFacetIds.has(ff.followerFacetId) && userFacetIds.has(ff.followingFacetId))) {
            globalFacetFollowsStore.splice(i, 1);
          }
        }
      }
      return new Response(
        JSON.stringify({ success: true, action: 'block', userId, targetId, resolvedTargetId }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (action === 'unblock') {
      if (db) {
        await db.prepare('DELETE FROM user_blocks WHERE blocker_id = ? AND (blocked_id = ? OR blocked_id = ?)').bind(userId, targetId, resolvedTargetId).run();
      } else {
        const idx = globalBlocksStore.findIndex(b => b.blockerId === userId && (b.blockedId === targetId || b.blockedId === resolvedTargetId));
        if (idx >= 0) globalBlocksStore.splice(idx, 1);
      }
      return new Response(
        JSON.stringify({ success: true, action: 'unblock', userId, targetId }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (action === 'mute') {
      if (db) {
        await db.prepare('INSERT OR REPLACE INTO user_mutes (muter_id, muted_id, created_at) VALUES (?, ?, ?)').bind(userId, targetId, now).run();
      } else {
        const existing = globalMutesStore.findIndex(m => m.muterId === userId && m.mutedId === targetId);
        if (existing < 0) {
          globalMutesStore.push({ muterId: userId, mutedId: targetId, createdAt: now });
        }
      }
      return new Response(
        JSON.stringify({ success: true, action: 'mute', userId, targetId }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (action === 'unmute') {
      if (db) {
        await db.prepare('DELETE FROM user_mutes WHERE muter_id = ? AND muted_id = ?').bind(userId, targetId).run();
      } else {
        const idx = globalMutesStore.findIndex(m => m.muterId === userId && m.mutedId === targetId);
        if (idx >= 0) globalMutesStore.splice(idx, 1);
      }
      return new Response(
        JSON.stringify({ success: true, action: 'unmute', userId, targetId }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Unhandled action' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to process block/mute action' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
