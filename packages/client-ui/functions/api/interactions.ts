// ===========================================================================
// AETHERIS OMNI-SPHERE — INTERACTIONS & ENGAGEMENT EDGE API (/api/interactions)
// Handles real likes, reposts, bookmarks, emoji reactions, awards & views.
// Persists directly to Cloudflare D1 SQL table 'interactions' with memory fallback.
// ===========================================================================

import { Env, getD1Database, isProductionEnv, createD1UnavailableResponse } from './_db.js';
import { requireAdmin, requireSignedEnvelope } from './_auth.js';

export interface InteractionRecord {
  id: string;
  targetType: string;
  targetId: string;
  userFingerprint: string;
  interactionType: 'like' | 'repost' | 'bookmark' | 'reaction' | 'award' | 'view';
  value?: string;
  createdAt: number;
}

// In-memory fallback if D1 binding is temporarily absent
export const memoryInteractionsStore: InteractionRecord[] = [];

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

// ─── GET /api/interactions ───────────────────────────────────────────────────
// Supports single target (?targetId=post-1) or batch (?targetIds=post-1,post-2,post-3)
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const targetIdParam = url.searchParams.get('targetId') || url.searchParams.get('postId');
    const targetIdsParam = url.searchParams.get('targetIds') || url.searchParams.get('postIds');
    const userFingerprint = (url.searchParams.get('userFingerprint') || '').trim();
    const targetType = (url.searchParams.get('targetType') || 'post').trim();

    const targetIds = targetIdsParam
      ? targetIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : targetIdParam
      ? [targetIdParam.trim()]
      : [];

    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'targetId or targetIds parameter is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const resultsMap: Record<string, any> = {};

    for (const tid of targetIds) {
      resultsMap[tid] = {
        targetId: tid,
        likesCount: 0,
        repostsCount: 0,
        bookmarksCount: 0,
        viewsCount: 0,
        userInteractions: {
          liked: false,
          reposted: false,
          bookmarked: false,
        },
        reactions: [] as Array<{ emoji: string; count: number; userReacted: boolean }>,
        awards: [] as Array<{ awardId: string; count: number }>,
      };
    }

    if (db) {
      try {
        const placeholders = targetIds.map(() => '?').join(',');
        const query = `
          SELECT target_id, interaction_type, value, user_fingerprint, COUNT(*) as cnt
          FROM interactions
          WHERE target_type = ? AND target_id IN (${placeholders})
          GROUP BY target_id, interaction_type, value, user_fingerprint
        `;
        const res = await db.prepare(query).bind(targetType, ...targetIds).all();

        if (res.results) {
          const reactionCounts: Record<string, Record<string, { count: number; userReacted: boolean }>> = {};
          const awardCounts: Record<string, Record<string, number>> = {};

          for (const row of res.results as any[]) {
            const tid = row.target_id;
            const item = resultsMap[tid];
            if (!item) continue;

            const type = row.interaction_type;
            const cnt = Number(row.cnt) || 1;
            const isSelf = userFingerprint && row.user_fingerprint === userFingerprint;

            if (type === 'like') {
              item.likesCount += cnt;
              if (isSelf) item.userInteractions.liked = true;
            } else if (type === 'repost') {
              item.repostsCount += cnt;
              if (isSelf) item.userInteractions.reposted = true;
            } else if (type === 'bookmark') {
              item.bookmarksCount += cnt;
              if (isSelf) item.userInteractions.bookmarked = true;
            } else if (type === 'view') {
              item.viewsCount += cnt;
            } else if (type === 'reaction' && row.value) {
              reactionCounts[tid] = reactionCounts[tid] || {};
              reactionCounts[tid][row.value] = reactionCounts[tid][row.value] || { count: 0, userReacted: false };
              reactionCounts[tid][row.value].count += cnt;
              if (isSelf) reactionCounts[tid][row.value].userReacted = true;
            } else if (type === 'award' && row.value) {
              awardCounts[tid] = awardCounts[tid] || {};
              awardCounts[tid][row.value] = (awardCounts[tid][row.value] || 0) + cnt;
            }
          }

          for (const tid of targetIds) {
            if (reactionCounts[tid]) {
              resultsMap[tid].reactions = Object.entries(reactionCounts[tid]).map(([emoji, data]) => ({
                emoji,
                count: data.count,
                userReacted: data.userReacted,
              }));
            }
            if (awardCounts[tid]) {
              resultsMap[tid].awards = Object.entries(awardCounts[tid]).map(([awardId, count]) => ({
                awardId,
                count,
              }));
            }
          }
        }
      } catch (dbErr) {
        if (isProductionEnv(context.env)) {
          return new Response(
            JSON.stringify({ success: false, error: 'Database query failed in production environment' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
        console.warn('[Interactions API] D1 query failed, using memory fallback:', dbErr);
        fillFromMemory(targetIds, targetType, userFingerprint, resultsMap);
      }
    } else {
      if (isProductionEnv(context.env)) {
        return createD1UnavailableResponse();
      }
      fillFromMemory(targetIds, targetType, userFingerprint, resultsMap);
    }

    const payload = targetIds.length === 1
      ? { success: true, ...resultsMap[targetIds[0]] }
      : { success: true, interactions: resultsMap };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

// ─── POST /api/interactions ──────────────────────────────────────────────────
// Toggle like/repost/bookmark or record reaction/award/view
export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const rawBody = await context.request.json().catch(() => null) as Record<string, any> | null;
    if (!rawBody) {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }
    const body = rawBody.payload && typeof rawBody.payload === 'object' ? rawBody.payload : rawBody;

    const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : (typeof body.postId === 'string' ? body.postId.trim() : '');
    const targetType = typeof body.targetType === 'string' ? body.targetType.trim() : 'post';
    let userFingerprint = typeof body.userFingerprint === 'string' ? body.userFingerprint.trim() : '';
    if (!userFingerprint && rawBody.identity?.fingerprint) {
      userFingerprint = rawBody.identity.fingerprint;
    }
    const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
    const value = typeof body.value === 'string' ? body.value.trim() : null;

    if (!targetId) {
      return new Response(
        JSON.stringify({ success: false, error: 'targetId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const validActions = ['like', 'repost', 'bookmark', 'reaction', 'award', 'view'];
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // Verify identity signature for mutating actions (prevent forged likes/reactions/awards)
    if (action !== 'view') {
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
              JSON.stringify({
                success: false,
                error: 'Cryptographic identity signature required for mutating interactions',
              }),
              { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
            )
          );
        }
        userFingerprint = auth.fingerprint || userFingerprint;
      }
    }

    if (!userFingerprint) {
      if (action === 'view') {
        userFingerprint = 'anon-view';
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'userFingerprint is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);
    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    const now = Date.now();
    let isActive = false;
    const randSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 8)
      : Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, '0')).join('');
    let interactionId = `act_${now}_${randSuffix}`;

    if (action === 'like' || action === 'repost' || action === 'bookmark') {
      // Toggle logic
      if (db) {
        try {
          const existing = await db
            .prepare(`SELECT id FROM interactions WHERE target_type = ? AND target_id = ? AND user_fingerprint = ? AND interaction_type = ?`)
            .bind(targetType, targetId, userFingerprint, action)
            .first();

          const stmts: any[] = [];
          if (existing) {
            // Remove
            stmts.push(
              db.prepare(`DELETE FROM interactions WHERE target_type = ? AND target_id = ? AND user_fingerprint = ? AND interaction_type = ?`)
                .bind(targetType, targetId, userFingerprint, action)
            );
            isActive = false;
          } else {
            // Add
            stmts.push(
              db.prepare(`INSERT INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
                .bind(interactionId, targetType, targetId, userFingerprint, action, null, now)
            );
            isActive = true;
          }

          // Also keep posts table counters in sync if modifying a post
          if (targetType === 'post') {
            if (action === 'like') {
              const delta = isActive ? 1 : -1;
              stmts.push(
                db.prepare(`UPDATE posts SET merit_votes = MAX(0, merit_votes + ?) WHERE id = ?`)
                  .bind(delta, targetId)
              );
            } else if (action === 'repost') {
              const delta = isActive ? 1 : -1;
              stmts.push(
                db.prepare(`UPDATE posts SET boost_count = MAX(0, boost_count + ?) WHERE id = ?`)
                  .bind(delta, targetId)
              );
            }
          }

          const batchRes = await db.batch(stmts);
          if (isProd && batchRes.some((r: any) => r && r.success === false)) {
            return new Response(
              JSON.stringify({ success: false, error: 'Production database batch failed during interaction update' }),
              { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
            );
          }
        } catch (dbErr) {
          if (isProd) {
            return new Response(
              JSON.stringify({ success: false, error: 'Production database error during interaction update' }),
              { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
            );
          }
          console.warn('[Interactions API] D1 toggle failed, falling back to memory:', dbErr);
          isActive = toggleInMemory(targetType, targetId, userFingerprint, action as any, null, now);
        }
      } else {
        isActive = toggleInMemory(targetType, targetId, userFingerprint, action as any, null, now);
      }
    } else if (action === 'reaction') {
      // Emoji Reaction Toggle or Insert
      if (!value) {
        return new Response(
          JSON.stringify({ success: false, error: 'value (emoji) is required for reaction' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (db) {
        try {
          const existing = await db
            .prepare(`SELECT id FROM interactions WHERE target_type = ? AND target_id = ? AND user_fingerprint = ? AND interaction_type = 'reaction' AND value = ?`)
            .bind(targetType, targetId, userFingerprint, value)
            .first();

          if (existing) {
            await db
              .prepare(`DELETE FROM interactions WHERE target_type = ? AND target_id = ? AND user_fingerprint = ? AND interaction_type = 'reaction' AND value = ?`)
              .bind(targetType, targetId, userFingerprint, value)
              .run();
            isActive = false;
          } else {
            await db
              .prepare(`INSERT INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES (?, ?, ?, ?, 'reaction', ?, ?)`)
              .bind(interactionId, targetType, targetId, userFingerprint, value, now)
              .run();
            isActive = true;
          }
        } catch (dbErr) {
          if (isProd) {
            return new Response(
              JSON.stringify({ success: false, error: 'Production database error during reaction update' }),
              { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
            );
          }
          isActive = toggleInMemory(targetType, targetId, userFingerprint, 'reaction', value, now);
        }
      } else {
        isActive = toggleInMemory(targetType, targetId, userFingerprint, 'reaction', value, now);
      }
    } else if (action === 'award') {
      if (db) {
        try {
          await db
            .prepare(`INSERT INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES (?, ?, ?, ?, 'award', ?, ?)`)
            .bind(interactionId, targetType, targetId, userFingerprint, value || 'gold', now)
            .run();
          isActive = true;
        } catch (dbErr) {
          if (isProd) {
            return new Response(
              JSON.stringify({ success: false, error: 'Production database error during award update' }),
              { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
            );
          }
          memoryInteractionsStore.push({ id: interactionId, targetType, targetId, userFingerprint, interactionType: 'award', value: value || 'gold', createdAt: now });
          isActive = true;
        }
      } else {
        memoryInteractionsStore.push({ id: interactionId, targetType, targetId, userFingerprint, interactionType: 'award', value: value || 'gold', createdAt: now });
        isActive = true;
      }
    } else if (action === 'view') {
      if (db) {
        try {
          // One view per user per post (INSERT OR IGNORE)
          await db
            .prepare(`INSERT OR IGNORE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES (?, ?, ?, ?, 'view', ?, ?)`)
            .bind(interactionId, targetType, targetId, userFingerprint, null, now)
            .run();
          isActive = true;
        } catch (dbErr) {
          if (isProd) {
            return new Response(
              JSON.stringify({ success: false, error: 'Production database error during view update' }),
              { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
            );
          }
          toggleInMemory(targetType, targetId, userFingerprint, 'view', null, now);
          isActive = true;
        }
      } else {
        toggleInMemory(targetType, targetId, userFingerprint, 'view', null, now);
        isActive = true;
      }
    }

    // Fetch updated real count for this action
    let newCount = 0;
    if (db) {
      try {
        const countRow = await db
          .prepare(`SELECT COUNT(*) as cnt FROM interactions WHERE target_type = ? AND target_id = ? AND interaction_type = ?`)
          .bind(targetType, targetId, action)
          .first<{ cnt: number }>();
        newCount = countRow ? Number(countRow.cnt) : (isActive ? 1 : 0);
      } catch (_) {
        if (isProd) {
          return new Response(
            JSON.stringify({ success: false, error: 'Production database error querying interaction count' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
        newCount = memoryInteractionsStore.filter(i => i.targetId === targetId && i.interactionType === action).length;
      }
    } else {
      newCount = memoryInteractionsStore.filter(i => i.targetId === targetId && i.interactionType === action).length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        targetId,
        action,
        value,
        active: isActive,
        newCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

function fillFromMemory(targetIds: string[], targetType: string, userFingerprint: string, resultsMap: Record<string, any>): void {
  for (const tid of targetIds) {
    const records = memoryInteractionsStore.filter(i => i.targetId === tid && i.targetType === targetType);
    const item = resultsMap[tid];
    if (!item) continue;

    item.likesCount = records.filter(i => i.interactionType === 'like').length;
    item.repostsCount = records.filter(i => i.interactionType === 'repost').length;
    item.bookmarksCount = records.filter(i => i.interactionType === 'bookmark').length;
    item.viewsCount = records.filter(i => i.interactionType === 'view').length;

    if (userFingerprint) {
      item.userInteractions.liked = records.some(i => i.interactionType === 'like' && i.userFingerprint === userFingerprint);
      item.userInteractions.reposted = records.some(i => i.interactionType === 'repost' && i.userFingerprint === userFingerprint);
      item.userInteractions.bookmarked = records.some(i => i.interactionType === 'bookmark' && i.userFingerprint === userFingerprint);
    }
  }
}

function toggleInMemory(targetType: string, targetId: string, userFingerprint: string, action: InteractionRecord['interactionType'], value: string | null, now: number): boolean {
  const idx = memoryInteractionsStore.findIndex(
    i => i.targetType === targetType && i.targetId === targetId && i.userFingerprint === userFingerprint && i.interactionType === action && (value ? i.value === value : true)
  );

  if (idx !== -1) {
    memoryInteractionsStore.splice(idx, 1);
    return false;
  } else {
    const randSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 8)
      : Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, '0')).join('');
    memoryInteractionsStore.push({
      id: `act_${now}_${randSuffix}`,
      targetType,
      targetId,
      userFingerprint,
      interactionType: action,
      value: value || undefined,
      createdAt: now,
    });
    return true;
  }
}
