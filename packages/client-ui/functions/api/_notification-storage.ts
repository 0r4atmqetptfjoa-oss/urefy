import type { D1Database } from './_db.js';

// Production installations exist with both naming conventions. Inspect once
// per binding instead of assuming that a migration ledger describes every table.
const layouts = new WeakMap<D1Database, Promise<boolean>>();
export async function storeNotification(db: D1Database, notification: {
  id: string; userId: string; actorId: string; actorName?: string; type: string;
  targetId?: string; targetType?: string; previewText?: string; createdAt: number;
}): Promise<void> {
  let layout = layouts.get(db);
  if (!layout) {
    layout = db.prepare('PRAGMA table_info(notifications)').all<{ name: string }>().then(result => {
      const names = new Set(result.results.map(column => column.name));
      if (!names.has('type') && !names.has('action_type')) throw new Error('Notification schema unavailable');
      return !names.has('type') && names.has('action_type');
    });
    layouts.set(db, layout);
    void layout.catch(() => layouts.delete(db));
  }
  const legacy = await layout;
  const typeColumn = legacy ? 'action_type' : 'type';
  const previewColumn = legacy ? 'content_snippet' : 'preview_text';
  await db.prepare(`INSERT INTO notifications (id, user_id, actor_id, actor_name, ${typeColumn}, target_id, target_type, ${previewColumn}, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`).bind(
    notification.id, notification.userId, notification.actorId, notification.actorName || null,
    notification.type, notification.targetId || '', notification.targetType || 'post',
    notification.previewText || null, notification.createdAt,
  ).run();
}
