// ===========================================================================
// UREfy — NOTIFICATIONS EDGE API (/api/notifications)
// Supports: Cloudflare D1 SQL, Notification Grouping, Unread Counts,
// Block Suppression, and In-Memory Edge Isolate Fallback.
// ===========================================================================

import {
  Env,
  getD1Database,
  isProductionEnv,
  createD1UnavailableResponse,
  globalNotificationsStore,
  globalBlocksStore,
  EdgeNotification,
} from './_db.js';
import { requireSignedEnvelope, requireAdmin } from './_auth.js';
import { storeNotification } from './_notification-storage.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint, X-Sovereign-Envelope',
  'Cache-Control': 'private, no-store',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export interface GroupedNotification {
  id: string;
  type: string;
  targetId?: string;
  targetType?: string;
  actors: string[];
  totalCount: number;
  previewText?: string;
  isRead: boolean;
  createdAt: number;
  title: string;
}

/**
 * Groups raw notification list to collapse repetitive interactions.
 * E.g. 5 reactions on same post => "Alice and 4 others reacted to your post."
 */
export function groupNotifications(items: EdgeNotification[]): GroupedNotification[] {
  const groups: Map<string, GroupedNotification> = new Map();
  const result: GroupedNotification[] = [];

  for (const item of items) {
    // Only group reactions, awards, and follows
    const isGroupable = ['reaction', 'award', 'follow'].includes(item.type);
    const groupKey = isGroupable ? `${item.type}:${item.targetId || 'global'}` : item.id;

    const existing = groups.get(groupKey);
    const actorLabel = item.actorName || item.actorId.slice(0, 10);

    if (existing && isGroupable) {
      existing.totalCount++;
      if (!existing.actors.includes(actorLabel) && existing.actors.length < 3) {
        existing.actors.push(actorLabel);
      }
      if (!item.isRead) {
        existing.isRead = false;
      }
      if (item.createdAt > existing.createdAt) {
        existing.createdAt = item.createdAt;
      }
      // Recompute title
      const othersCount = existing.totalCount - existing.actors.length;
      if (existing.type === 'reaction') {
        existing.title = othersCount > 0
          ? `${existing.actors.join(', ')} and ${othersCount} other${othersCount > 1 ? 's' : ''} reacted to your post`
          : `${existing.actors.join(', ')} reacted to your post`;
      } else if (existing.type === 'follow') {
        existing.title = othersCount > 0
          ? `${existing.actors.join(', ')} and ${othersCount} other${othersCount > 1 ? 's' : ''} followed you`
          : `${existing.actors.join(', ')} followed you`;
      }
    } else {
      let title = '';
      switch (item.type) {
        case 'follow':
          title = `${actorLabel} followed you`;
          break;
        case 'reply_post':
          title = `${actorLabel} replied to your post`;
          break;
        case 'reply_comment':
          title = `${actorLabel} replied to your comment`;
          break;
        case 'mention':
          title = `${actorLabel} mentioned you`;
          break;
        case 'reaction':
          title = `${actorLabel} reacted to your post`;
          break;
        case 'award':
          title = `${actorLabel} bestowed an award on your post`;
          break;
        case 'mod_action':
          title = `Community moderation action: ${item.previewText || 'Notice'}`;
          break;
        case 'message_request':
          title = `New message request from ${actorLabel}`;
          break;
        case 'message':
          title = `New message from ${actorLabel}`;
          break;
        case 'community_activity':
          title = `Community update: ${item.previewText || 'New activity'}`;
          break;
        default:
          title = `Notification from ${actorLabel}`;
      }

      const grouped: GroupedNotification = {
        id: item.id,
        type: item.type,
        targetId: item.targetId,
        targetType: item.targetType,
        actors: [actorLabel],
        totalCount: 1,
        previewText: item.previewText,
        isRead: item.isRead,
        createdAt: item.createdAt,
        title,
      };

      groups.set(groupKey, grouped);
      result.push(grouped);
    }
  }

  return result;
}

/**
 * GET /api/notifications
 * Query params:
 *   - userId: ID/fingerprint of the recipient
 *   - unreadOnly: boolean (optional)
 *   - limit: number (default 50, max 100)
 *   - offset: number (default 0)
 */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const rawEnvelope = context.request.headers.get('X-Sovereign-Envelope');
    let envelope: unknown;
    try { envelope = JSON.parse(rawEnvelope || 'null'); } catch { envelope = null; }
    const auth = await requireSignedEnvelope(context, envelope);
    if (!auth.authorized) return auth.response!;
    if (auth.payload?.scope !== 'urefy-notifications-v1' || auth.payload?.action !== 'list') return Response.json({ success: false, error: 'Invalid notification request' }, { status: 400 });
    const userId = auth.fingerprint!;
    if (url.searchParams.has('userId') && url.searchParams.get('userId') !== userId) return Response.json({ success: false, error: 'Recipient mismatch' }, { status: 403 });
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    let notifications: EdgeNotification[] = [];
    let unreadCount = 0;

    if (db) {
      // 1. Get blocked users to suppress notifications from them
      const blockedStmt = db.prepare('SELECT blocked_id FROM user_blocks WHERE blocker_id = ?').bind(userId);
      const blockedRes = await blockedStmt.all<{ blocked_id: string }>();
      const blockedSet = new Set((blockedRes.results || []).map(r => r.blocked_id));

      // 2. Count unread
      const countStmt = db.prepare(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
      ).bind(userId);
      const countRow = await countStmt.first<{ count: number }>();
      unreadCount = countRow?.count || 0;

      // 3. Fetch notifications
      let query = 'SELECT * FROM notifications WHERE user_id = ?';
      const params: any[] = [userId];

      if (unreadOnly) {
        query += ' AND is_read = 0';
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const res = await db.prepare(query).bind(...params).all<any>();
      notifications = (res.results || [])
        .filter(r => !blockedSet.has(r.actor_id))
        .map(r => ({
          id: r.id,
          userId: r.user_id,
          actorId: r.actor_id,
          actorName: r.actor_name || undefined,
          type: r.type || r.action_type,
          targetId: r.target_id || undefined,
          targetType: r.target_type || undefined,
          previewText: r.preview_text || r.content_snippet || undefined,
          isRead: Boolean(r.is_read),
          createdAt: Number(r.created_at),
        }));
    } else {
      // In-memory fallback
      const blockedSet = new Set(
        globalBlocksStore.filter(b => b.blockerId === userId).map(b => b.blockedId)
      );

      const userNotifs = globalNotificationsStore
        .filter(n => n.userId === userId && !blockedSet.has(n.actorId))
        .sort((a, b) => b.createdAt - a.createdAt);

      unreadCount = userNotifs.filter(n => !n.isRead).length;

      let filtered = unreadOnly ? userNotifs.filter(n => !n.isRead) : userNotifs;
      notifications = filtered.slice(offset, offset + limit);
    }

    const grouped = groupNotifications(notifications);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        unreadCount,
        total: notifications.length,
        notifications,
        groupedNotifications: grouped,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to fetch notifications' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

/**
 * POST /api/notifications
 * Body: { userId, actorId, actorName, type, targetId, targetType, previewText }
 */
export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    // Public clients cannot fabricate security/moderation notifications. Domain APIs
    // create notifications alongside their own authorized mutations.
    const admin = await requireAdmin(context);
    if (!admin.authorized) return admin.response!;
    const body = await context.request.json().catch(() => null) as Record<string, any> | null;
    if (!body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const actorId = typeof body.actorId === 'string' ? body.actorId.trim() : '';
    const actorName = typeof body.actorName === 'string' ? body.actorName.trim() : undefined;
    const type = typeof body.type === 'string' ? body.type.trim() : '';
    const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : undefined;
    const targetType = typeof body.targetType === 'string' ? body.targetType.trim() : undefined;
    const previewText = typeof body.previewText === 'string' ? body.previewText.trim().slice(0, 280) : undefined;

    const validTypes = [
      'follow', 'reply_post', 'reply_comment', 'mention',
      'reaction', 'award', 'mod_action', 'message_request',
      'message', 'community_activity'
    ];

    if (!userId || !actorId || !validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId, actorId, and valid type are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // Suppress self-notifications
    if (userId === actorId) {
      return new Response(
        JSON.stringify({ success: true, suppressed: true, reason: 'self_notification' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    // Check if recipient has blocked actor
    if (db) {
      const blockedStmt = db.prepare(
        'SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ? LIMIT 1'
      ).bind(userId, actorId);
      const isBlocked = await blockedStmt.first();
      if (isBlocked) {
        return new Response(
          JSON.stringify({ success: true, suppressed: true, reason: 'recipient_blocked_actor' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    } else {
      const isBlocked = globalBlocksStore.some(b => b.blockerId === userId && b.blockedId === actorId);
      if (isBlocked) {
        return new Response(
          JSON.stringify({ success: true, suppressed: true, reason: 'recipient_blocked_actor' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    }

    const id = `notif_${Date.now()}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
    const now = Date.now();

    const notification: EdgeNotification = {
      id,
      userId,
      actorId,
      actorName,
      type: type as any,
      targetId,
      targetType,
      previewText,
      isRead: false,
      createdAt: now,
    };

    if (db) {
      await storeNotification(db, notification);
    } else {
      globalNotificationsStore.unshift(notification);
      if (globalNotificationsStore.length > 1000) {
        globalNotificationsStore.splice(1000);
      }
    }

    return new Response(
      JSON.stringify({ success: true, notification }),
      { status: 201, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to create notification' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

/**
 * PATCH /api/notifications
 * Body: { id?: string, markAll?: boolean, userId: string }
 */
export async function onRequestPatch(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const raw = await context.request.json().catch(() => null);
    if (!raw) {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const auth = await requireSignedEnvelope(context, raw);
    if (!auth.authorized) return auth.response!;
    const body = auth.payload;
    if (body?.scope !== 'urefy-notifications-v1' || body?.action !== 'mark-read') return Response.json({ success: false, error: 'Invalid notification action' }, { status: 400 });
    const userId = auth.fingerprint!;
    const notifId = typeof body.id === 'string' ? body.id.trim() : '';
    const markAll = Boolean(body.markAll);

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    if (markAll) {
      if (db) {
        await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').bind(userId).run();
      } else {
        for (const n of globalNotificationsStore) {
          if (n.userId === userId) n.isRead = true;
        }
      }
      return new Response(
        JSON.stringify({ success: true, markAll: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (!notifId) {
      return new Response(
        JSON.stringify({ success: false, error: 'id or markAll: true is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (db) {
      await db.prepare(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
      ).bind(notifId, userId).run();
    } else {
      const found = globalNotificationsStore.find(n => n.id === notifId && n.userId === userId);
      if (found) found.isRead = true;
    }

    return new Response(
      JSON.stringify({ success: true, id: notifId, isRead: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to update notification' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

/**
 * DELETE /api/notifications
 * Body or query: { id?: string, clearAll?: boolean, userId: string }
 */
export async function onRequestDelete(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const raw = await context.request.json().catch(() => null);
    const auth = await requireSignedEnvelope(context, raw);
    if (!auth.authorized) return auth.response!;
    const body = auth.payload;
    if (body?.scope !== 'urefy-notifications-v1' || body?.action !== 'clear') return Response.json({ success: false, error: 'Invalid notification action' }, { status: 400 });
    const userId = auth.fingerprint!;
    const notifId = typeof body.id === 'string' ? body.id : '';
    const clearAll = body.clearAll === true;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    if (clearAll) {
      if (db) {
        await db.prepare('DELETE FROM notifications WHERE user_id = ?').bind(userId).run();
      } else {
        const remaining = globalNotificationsStore.filter(n => n.userId !== userId);
        globalNotificationsStore.length = 0;
        globalNotificationsStore.push(...remaining);
      }
      return new Response(
        JSON.stringify({ success: true, cleared: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (!notifId) {
      return new Response(
        JSON.stringify({ success: false, error: 'id or clearAll: true is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (db) {
      await db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').bind(notifId, userId).run();
    } else {
      const idx = globalNotificationsStore.findIndex(n => n.id === notifId && n.userId === userId);
      if (idx >= 0) globalNotificationsStore.splice(idx, 1);
    }

    return new Response(
      JSON.stringify({ success: true, id: notifId, deleted: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to delete notification' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
