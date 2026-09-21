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
  EdgeBlock,
  EdgeMute,
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
    const userId = (url.searchParams.get('userId') || '').trim();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId parameter is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
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
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS user_blocks (
          blocker_id TEXT NOT NULL,
          blocked_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          PRIMARY KEY (blocker_id, blocked_id)
        )
      `).run();
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS user_mutes (
          muter_id TEXT NOT NULL,
          muted_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          PRIMARY KEY (muter_id, muted_id)
        )
      `).run();
      const blockRes = await db
        .prepare('SELECT blocked_id FROM user_blocks WHERE blocker_id = ?')
        .bind(userId)
        .all<{ blocked_id: string }>();
      blockedUsers = (blockRes.results || []).map(r => r.blocked_id);

      const muteRes = await db
        .prepare('SELECT muted_id FROM user_mutes WHERE muter_id = ?')
        .bind(userId)
        .all<{ muted_id: string }>();
      mutedUsers = (muteRes.results || []).map(r => r.muted_id);
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
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
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
 * Body: { action: 'block' | 'unblock' | 'mute' | 'unmute', userId: string, targetId: string }
 * Supports signed envelope for cryptographic verification.
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

    let action = (body.action || '').trim().toLowerCase();
    let userId = (body.userId || body.blockerId || body.muterId || context.request.headers.get('X-User-Fingerprint') || '').trim();
    let targetId = (body.targetId || body.blockedId || body.mutedId || body.targetUserId || '').trim();

    // Check signed envelope
    if (body.envelope && typeof body.envelope === 'object') {
      const auth = await requireSignedEnvelope(context, body.envelope);
      if (auth.authorized) {
        userId = auth.fingerprint || userId;
        const payload = (auth.payload || {}) as any;
        action = (payload.action || action).trim().toLowerCase();
        targetId = (payload.targetId || payload.targetUserId || payload.blockedId || payload.mutedId || targetId).trim();
      }
    }

    if (!['block', 'unblock', 'mute', 'unmute'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action. Must be block, unblock, mute, or unmute' }),
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
    if (db) {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS user_blocks (
          blocker_id TEXT NOT NULL,
          blocked_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          PRIMARY KEY (blocker_id, blocked_id)
        )
      `).run();
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS user_mutes (
          muter_id TEXT NOT NULL,
          muted_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          PRIMARY KEY (muter_id, muted_id)
        )
      `).run();
    }

    const now = Date.now();

    if (action === 'block') {
      if (db) {
        // Also remove any active follows in either direction
        await db.batch([
          db.prepare('INSERT OR REPLACE INTO user_blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)').bind(userId, targetId, now),
          db.prepare('DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)').bind(userId, targetId, targetId, userId),
        ]);
      } else {
        const existing = globalBlocksStore.findIndex(b => b.blockerId === userId && b.blockedId === targetId);
        if (existing < 0) {
          globalBlocksStore.push({ blockerId: userId, blockedId: targetId, createdAt: now });
        }
      }
      return new Response(
        JSON.stringify({ success: true, action: 'block', userId, targetId }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (action === 'unblock') {
      if (db) {
        await db.prepare('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?').bind(userId, targetId).run();
      } else {
        const idx = globalBlocksStore.findIndex(b => b.blockerId === userId && b.blockedId === targetId);
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
