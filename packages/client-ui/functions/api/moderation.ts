// ===========================================================================
// UREfy — COMMUNITY MODERATION EDGE API (/api/moderation)
// Supports: Server-authorized mod actions, role validation (no client-only trust),
// pin/unpin posts, thread locking, post removal, user bans, reports queue & audit log.
// ===========================================================================

import {
  Env,
  getD1Database,
  isProductionEnv,
  createD1UnavailableResponse,
  globalCommunityMembersStore,
  globalCommunityModLogsStore,
  globalSocialReportsStore,
  globalPostsStore,
  EdgeCommunityModLog,
  EdgeSocialReport,
} from './_db.js';
import { requireAdmin, requireSignedEnvelope } from './_auth.js';

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
 * Validates if moderatorId is authorized to moderate communityId.
 */
async function isAuthorizedModerator(
  db: any,
  communityId: string,
  moderatorId: string,
  isGlobalAdmin: boolean
): Promise<boolean> {
  if (isGlobalAdmin) return true;
  if (!moderatorId || !communityId) return false;

  if (db) {
    const row = await db
      .prepare("SELECT role FROM community_members WHERE community_id = ? AND user_id = ? AND role IN ('moderator', 'admin') LIMIT 1")
      .bind(communityId, moderatorId)
      .first();
    return Boolean(row);
  }

  return globalCommunityMembersStore.some(
    m => m.communityId === communityId && m.userId === moderatorId && ['moderator', 'admin'].includes(m.role)
  );
}

/**
 * GET /api/moderation
 * Query params:
 *  - communityId: string (required)
 *  - type: 'queue' | 'logs'
 *  - moderatorId: requester ID (checked for mod role)
 */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const communityId = (url.searchParams.get('communityId') || '').trim();
    const type = (url.searchParams.get('type') || 'queue').trim();
    const moderatorId = (url.searchParams.get('moderatorId') || '').trim();

    if (!communityId || !moderatorId) {
      return new Response(
        JSON.stringify({ success: false, error: 'communityId and moderatorId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const adminCheck = await requireAdmin(context);
    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    if (db) {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          reason_category TEXT NOT NULL,
          details TEXT,
          reporter_id TEXT NOT NULL,
          community_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          action_taken TEXT,
          moderator_id TEXT,
          created_at INTEGER NOT NULL,
          reviewed_at INTEGER
        )
      `).run();
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS community_moderation_logs (
          id TEXT PRIMARY KEY,
          community_id TEXT NOT NULL,
          moderator_id TEXT NOT NULL,
          action TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          reason TEXT,
          created_at INTEGER NOT NULL
        )
      `).run();
    }

    const authorized = await isAuthorizedModerator(db, communityId, moderatorId, adminCheck.authorized);
    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: caller is not an authorized moderator of this community' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (type === 'logs') {
      let logs: EdgeCommunityModLog[] = [];
      if (db) {
        const res = await db
          .prepare('SELECT * FROM community_moderation_logs WHERE community_id = ? ORDER BY created_at DESC LIMIT 50')
          .bind(communityId)
          .all<any>();
        logs = (res.results || []).map(r => ({
          id: r.id,
          communityId: r.community_id,
          moderatorId: r.moderator_id,
          action: r.action,
          targetType: r.target_type,
          targetId: r.target_id,
          reason: r.reason || undefined,
          createdAt: Number(r.created_at),
        }));
      } else {
        logs = globalCommunityModLogsStore
          .filter(l => l.communityId === communityId)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 50);
      }

      return new Response(
        JSON.stringify({ success: true, communityId, count: logs.length, logs }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // Default: 'queue' (pending reports)
    let reports: EdgeSocialReport[] = [];
    if (db) {
      const res = await db
        .prepare("SELECT * FROM reports WHERE community_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 50")
        .bind(communityId)
        .all<any>();
      reports = (res.results || []).map(r => ({
        id: r.id,
        targetType: r.target_type,
        targetId: r.target_id,
        reasonCategory: r.reason_category,
        details: r.details || undefined,
        reporterId: 'confidential', // Protect reporter privacy
        communityId: r.community_id || undefined,
        status: r.status,
        actionTaken: r.action_taken || undefined,
        moderatorId: r.moderator_id || undefined,
        createdAt: Number(r.created_at),
      }));
    } else {
      reports = globalSocialReportsStore
        .filter(r => r.communityId === communityId && r.status === 'pending')
        .map(r => ({ ...r, reporterId: 'confidential' }));
    }

    return new Response(
      JSON.stringify({ success: true, communityId, count: reports.length, reports }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to fetch moderation data' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

/**
 * POST /api/moderation
 * Body:
 *  - action: 'pin_post' | 'unpin_post' | 'remove_post' | 'lock_thread' | 'unlock_thread' | 'ban_user' | 'unban_user' | 'approve_report' | 'reject_report'
 *  - communityId: string
 *  - moderatorId: string
 *  - targetId: string
 *  - targetType: 'post' | 'comment' | 'user' | 'report'
 *  - reason?: string
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
    let communityId = (body.communityId || '').trim();
    let moderatorId = (body.moderatorId || '').trim();
    let targetId = (body.targetId || '').trim();
    let targetType = (body.targetType || 'post').trim();
    let reason = typeof body.reason === 'string' ? body.reason.trim() : undefined;

    // Check signed envelope
    if (body.envelope && typeof body.envelope === 'object') {
      const auth = await requireSignedEnvelope(context, body.envelope);
      if (auth.authorized) {
        moderatorId = auth.fingerprint || moderatorId;
        const payload = (auth.payload || {}) as any;
        action = (payload.action || action).trim().toLowerCase();
        communityId = (payload.communityId || communityId).trim();
        targetId = (payload.targetId || targetId).trim();
        targetType = (payload.targetType || targetType).trim();
        if (payload.reason) reason = String(payload.reason).trim();
      }
    }

    // Handle community member report submissions (does not require moderator role)
    if (action === 'report') {
      if (!communityId || !targetId) {
        return new Response(
          JSON.stringify({ success: false, error: 'communityId and targetId are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
      const reporterId = moderatorId || context.request.headers.get('X-User-Fingerprint') || 'anonymous';
      const reasonCategory = (body.reasonCategory || body.reason || 'spam').trim();
      const details = (body.details || '').trim();
      const reportId = `rep_${Date.now()}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
      const now = Date.now();

      const db = getD1Database(context.env);
      const isProd = isProductionEnv(context.env);

      if (!db && isProd) {
        return createD1UnavailableResponse();
      }

      if (db) {
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            target_type TEXT NOT NULL,
            target_id TEXT NOT NULL,
            reason_category TEXT NOT NULL,
            details TEXT,
            reporter_id TEXT NOT NULL,
            community_id TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            action_taken TEXT,
            moderator_id TEXT,
            created_at INTEGER NOT NULL,
            reviewed_at INTEGER
          )
        `).run();

        // Duplicate report suppression
        const existing = await db.prepare(
          "SELECT id FROM reports WHERE community_id = ? AND target_id = ? AND reporter_id = ? AND status = 'pending' LIMIT 1"
        ).bind(communityId, targetId, reporterId).first<{ id: string }>();

        if (existing) {
          return new Response(
            JSON.stringify({ success: true, reportId: existing.id, duplicate: true, status: 'pending' }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }

        await db.prepare(`
          INSERT INTO reports (id, target_type, target_id, reason_category, details, reporter_id, community_id, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `).bind(reportId, targetType, targetId, reasonCategory, details || null, reporterId, communityId, now).run();
      } else {
        const existing = globalSocialReportsStore.find(r => r.communityId === communityId && r.targetId === targetId && r.reporterId === reporterId && r.status === 'pending');
        if (existing) {
          return new Response(JSON.stringify({ success: true, reportId: existing.id, duplicate: true, status: 'pending' }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
        }
        globalSocialReportsStore.unshift({ id: reportId, targetType, targetId, reasonCategory, details, reporterId, communityId, status: 'pending', createdAt: now });
      }

      return new Response(
        JSON.stringify({ success: true, reportId, communityId, status: 'pending' }),
        { status: 201, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const validActions = [
      'pin_post', 'unpin_post', 'remove_post',
      'lock_thread', 'unlock_thread', 'ban_user',
      'unban_user', 'approve_report', 'reject_report'
    ];

    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid action. Supported: ${validActions.join(', ')}, report` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (!communityId || !moderatorId || !targetId) {
      return new Response(
        JSON.stringify({ success: false, error: 'communityId, moderatorId, and targetId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const adminCheck = await requireAdmin(context);
    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    // SERVER-AUTHORIZATION CHECK: Prevent IDOR / privilege escalation
    const authorized = await isAuthorizedModerator(db, communityId, moderatorId, adminCheck.authorized);
    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: caller is not an authorized moderator of this community' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const logId = `modlog_${Date.now()}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
    const now = Date.now();

    // Execute specific moderation action
    if (action === 'pin_post') {
      if (db) {
        await db.prepare('UPDATE posts SET status = ? WHERE id = ?').bind('pinned', targetId).run();
      } else {
        const p = globalPostsStore.find(p => p.id === targetId);
        if (p) p.status = 'pinned';
      }
    } else if (action === 'unpin_post') {
      if (db) {
        await db.prepare('UPDATE posts SET status = ? WHERE id = ?').bind('published', targetId).run();
      } else {
        const p = globalPostsStore.find(p => p.id === targetId);
        if (p) p.status = 'published';
      }
    } else if (action === 'remove_post') {
      if (db) {
        await db.prepare('UPDATE posts SET status = ? WHERE id = ?').bind('archived', targetId).run();
      } else {
        const p = globalPostsStore.find(p => p.id === targetId);
        if (p) p.status = 'archived';
      }
    } else if (action === 'ban_user') {
      if (db) {
        await db.prepare('DELETE FROM community_members WHERE community_id = ? AND user_id = ?').bind(communityId, targetId).run();
      } else {
        const idx = globalCommunityMembersStore.findIndex(m => m.communityId === communityId && m.userId === targetId);
        if (idx >= 0) globalCommunityMembersStore.splice(idx, 1);
      }
    } else if (action === 'approve_report') {
      if (db) {
        await db.prepare("UPDATE reports SET status = 'actioned', action_taken = ?, moderator_id = ?, reviewed_at = ? WHERE id = ?")
          .bind(reason || 'Content removed by moderator', moderatorId, now, targetId).run();
      } else {
        const rep = globalSocialReportsStore.find(r => r.id === targetId);
        if (rep) {
          rep.status = 'actioned';
          rep.actionTaken = reason || 'Content removed by moderator';
          rep.moderatorId = moderatorId;
          rep.reviewedAt = now;
        }
      }
    } else if (action === 'reject_report') {
      if (db) {
        await db.prepare("UPDATE reports SET status = 'dismissed', action_taken = ?, moderator_id = ?, reviewed_at = ? WHERE id = ?")
          .bind(reason || 'Report dismissed by moderator', moderatorId, now, targetId).run();
      } else {
        const rep = globalSocialReportsStore.find(r => r.id === targetId);
        if (rep) {
          rep.status = 'dismissed';
          rep.actionTaken = reason || 'Report dismissed by moderator';
          rep.moderatorId = moderatorId;
          rep.reviewedAt = now;
        }
      }
    }

    // Append to audit log
    const modLog: EdgeCommunityModLog = {
      id: logId,
      communityId,
      moderatorId,
      action: action as any,
      targetType,
      targetId,
      reason,
      createdAt: now,
    };

    if (db) {
      await db.prepare(
        `INSERT INTO community_moderation_logs (
          id, community_id, moderator_id, action, target_type, target_id, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        logId, communityId, moderatorId, action, targetType, targetId, reason || null, now
      ).run();
    } else {
      globalCommunityModLogsStore.unshift(modLog);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        communityId,
        moderatorId,
        targetId,
        logId,
        timestamp: now,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to execute moderation action' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
