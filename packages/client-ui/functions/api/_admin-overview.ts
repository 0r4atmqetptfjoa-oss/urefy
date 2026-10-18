import type { D1Database } from './_db.js';
import type { AdminOverview } from '../../src/admin-overview.js';

export async function readAdminOverview(db: D1Database | null, now = Date.now()): Promise<AdminOverview> {
  const overview: AdminOverview = {
    observedAt: now,
    source: db ? 'Cloudflare D1' : 'Unavailable',
    counts: { identities: null, posts: null, messages: null, channels: null, pendingReports: null },
    activity: null,
    unavailable: [],
  };

  if (!db) {
    overview.unavailable = ['activity', 'channels', 'identities', 'messages', 'pendingReports', 'posts'];
    return overview;
  }

  const hour = 3_600_000;
  const start = Math.floor(now / hour) * hour - 23 * hour;

  const keys = ['identities', 'posts', 'messages', 'channels', 'pendingReports'] as const;

  const queries = {
    identities: `SELECT COUNT(*) AS count FROM (SELECT author_id AS id FROM posts UNION SELECT author_id AS id FROM messages UNION SELECT fingerprint AS id FROM user_roles) WHERE id IS NOT NULL AND id != ''`,
    posts: 'SELECT COUNT(*) AS count FROM posts',
    messages: 'SELECT COUNT(*) AS count FROM messages',
    channels: 'SELECT COUNT(*) AS count FROM channels',
    pendingReports: "SELECT COUNT(*) AS count FROM dsa_reports WHERE status = 'pending'",
  };

  const activityQuery = `SELECT CAST(created_at / 3600000 AS INTEGER) * 3600000 AS hour, kind, COUNT(*) AS count
    FROM (SELECT created_at, 'posts' AS kind FROM posts WHERE created_at >= ? AND created_at <= ?
      UNION ALL SELECT created_at, 'messages' AS kind FROM messages WHERE created_at >= ? AND created_at <= ?)
    GROUP BY hour, kind`;

  let batchSucceeded = false;
  if (typeof db.batch === 'function') {
    try {
      const batchResults = await db.batch<any>([
        db.prepare(queries.identities),
        db.prepare(queries.posts),
        db.prepare(queries.messages),
        db.prepare(queries.channels),
        db.prepare(queries.pendingReports),
        db.prepare(activityQuery).bind(start, now, start, now),
      ]);

      keys.forEach((key, idx) => {
        const res = batchResults[idx];
        const count = res?.results?.[0]?.count ?? (res as any)?.first?.count;
        if (res?.success && typeof count === 'number' && Number.isFinite(count)) {
          overview.counts[key] = count;
        } else {
          overview.unavailable.push(key);
        }
      });

      const actRes = batchResults[5];
      if (actRes?.success && Array.isArray(actRes.results)) {
        overview.activity = Array.from({ length: 24 }, (_, i) => ({
          hour: start + i * hour,
          posts: 0,
          messages: 0,
        }));
        for (const row of actRes.results) {
          const bucket = overview.activity.find((item) => item.hour === row.hour);
          if (bucket) {
            if (row.kind === 'posts') {
              bucket.posts = Number(row.count) || 0;
            } else if (row.kind === 'messages') {
              bucket.messages = Number(row.count) || 0;
            }
          }
        }
      } else {
        overview.unavailable.push('activity');
      }

      batchSucceeded = true;
    } catch {
      // If batch fails (e.g. dropped table or D1 driver issue), fall through to isolated queries
    }
  }

  if (!batchSucceeded) {
    overview.unavailable = [];
    await Promise.all(
      Object.entries(queries).map(async ([key, query]) => {
        try {
          const row = await db.prepare(query).first<{ count: number }>();
          if (!row || !Number.isFinite(row.count)) throw new Error('Unavailable count');
          overview.counts[key as keyof typeof queries] = row.count;
        } catch {
          overview.unavailable.push(key);
        }
      })
    );

    try {
      const result = await db
        .prepare(activityQuery)
        .bind(start, now, start, now)
        .all<{ hour: number; kind: 'posts' | 'messages'; count: number }>();
      if (!result.success) throw new Error('Unavailable activity');
      overview.activity = Array.from({ length: 24 }, (_, i) => ({
        hour: start + i * hour,
        posts: 0,
        messages: 0,
      }));
      for (const row of result.results) {
        const bucket = overview.activity.find((item) => item.hour === row.hour);
        if (bucket) {
          if (row.kind === 'posts') {
            bucket.posts = row.count;
          } else if (row.kind === 'messages') {
            bucket.messages = row.count;
          }
        }
      }
    } catch {
      overview.unavailable.push('activity');
    }
  }

  overview.unavailable.sort();
  return overview;
}
