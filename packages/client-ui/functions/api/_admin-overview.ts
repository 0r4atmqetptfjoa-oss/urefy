import type { D1Database } from './_db.js';
import type { AdminOverview } from '../../src/admin-overview.js';

export async function readAdminOverview(db: D1Database | null, now = Date.now()): Promise<AdminOverview> {
  const overview: AdminOverview = {
    observedAt: now, source: db ? 'Cloudflare D1' : 'Unavailable',
    counts: { identities: null, posts: null, messages: null, channels: null, pendingReports: null },
    activity: null, unavailable: [],
  };
  const queries = {
    identities: `SELECT COUNT(*) AS count FROM (SELECT author_id AS id FROM posts UNION SELECT author_id AS id FROM messages UNION SELECT fingerprint AS id FROM user_roles) WHERE id IS NOT NULL AND id != ''`,
    posts: 'SELECT COUNT(*) AS count FROM posts',
    messages: 'SELECT COUNT(*) AS count FROM messages',
    channels: 'SELECT COUNT(*) AS count FROM channels',
    pendingReports: "SELECT COUNT(*) AS count FROM dsa_reports WHERE status = 'pending'",
  };
  await Promise.all(Object.entries(queries).map(async ([key, query]) => {
    try {
      if (!db) throw new Error('No database');
      const row = await db.prepare(query).first<{ count: number }>();
      if (!row || !Number.isFinite(row.count)) throw new Error('Unavailable count');
      overview.counts[key as keyof typeof queries] = row.count;
    } catch { overview.unavailable.push(key); }
  }));
  try {
    if (!db) throw new Error('No database');
    const hour = 3_600_000;
    const start = Math.floor(now / hour) * hour - 23 * hour;
    const result = await db.prepare(`SELECT CAST(created_at / 3600000 AS INTEGER) * 3600000 AS hour, kind, COUNT(*) AS count
      FROM (SELECT created_at, 'posts' AS kind FROM posts WHERE created_at >= ? AND created_at <= ?
        UNION ALL SELECT created_at, 'messages' AS kind FROM messages WHERE created_at >= ? AND created_at <= ?)
      GROUP BY hour, kind`).bind(start, now, start, now).all<{ hour: number; kind: 'posts' | 'messages'; count: number }>();
    if (!result.success) throw new Error('Unavailable activity');
    overview.activity = Array.from({ length: 24 }, (_, i) => ({ hour: start + i * hour, posts: 0, messages: 0 }));
    for (const row of result.results) {
      const bucket = overview.activity.find(item => item.hour === row.hour);
      if (bucket && (row.kind === 'posts' || row.kind === 'messages')) bucket[row.kind] = row.count;
    }
  } catch { overview.unavailable.push('activity'); }
  overview.unavailable.sort();
  return overview;
}
