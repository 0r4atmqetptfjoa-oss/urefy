import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readAdminOverview } from '../functions/api/_admin-overview.js';
import { onRequestGet } from '../functions/api/admin.js';
import { renderAdminOverview } from '../src/admin-overview.js';
import { AdminPanelManager } from '../src/admin-panel.js';

let sql: DatabaseSync;
const now = Date.UTC(2026, 8, 16, 14, 30);
const db: any = { prepare(query: string) {
  let values: any[] = [];
  return { bind(...args: any[]) { values = args; return this; },
    async first() { return sql.prepare(query).get(...values) || null; },
    async all() { return { success: true, results: sql.prepare(query).all(...values) }; },
    async run() { sql.prepare(query).run(...values); return { success: true }; },
  };
} };
beforeEach(() => {
  sql = new DatabaseSync(':memory:');
  sql.exec(`CREATE TABLE posts (id TEXT, author_id TEXT, created_at INTEGER);
    CREATE TABLE messages (id TEXT, author_id TEXT, channel_id TEXT, created_at INTEGER);
    CREATE TABLE channels (id TEXT, name TEXT, space TEXT, description TEXT, is_encrypted INTEGER, created_at INTEGER);
    CREATE TABLE user_roles (fingerprint TEXT, role TEXT, is_quarantined INTEGER, is_shadowbanned INTEGER, notes TEXT, updated_at INTEGER);
    CREATE TABLE dsa_reports (status TEXT);`);
});
afterEach(() => { sql.close(); vi.unstubAllGlobals(); });

describe('truthful administration overview', () => {
  it('distinguishes empty data from unavailable data', async () => {
    const empty = await readAdminOverview(db, now);
    expect(empty.counts).toEqual({ identities: 0, posts: 0, messages: 0, channels: 0, pendingReports: 0 });
    expect(empty.activity).toHaveLength(24);
    expect(renderAdminOverview(empty, false, '')).toContain('No stored activity');
    const missing = await readAdminOverview(null, now);
    expect(Object.values(missing.counts).every(value => value === null)).toBe(true);
    expect(missing.activity).toBeNull();
    expect(renderAdminOverview(missing, false, '')).toContain('Data unavailable');
  });
  it('counts beyond list limits and deduplicates recorded identities', async () => {
    for (let i = 0; i < 145; i++) sql.prepare('INSERT INTO posts VALUES (?, ?, ?)').run(`p${i}`, 'same-author', now);
    sql.prepare('INSERT INTO messages VALUES (?, ?, ?, ?)').run('m1', 'same-author', 'c1', now);
    sql.exec("INSERT INTO user_roles (fingerprint) VALUES ('same-author'), ('another-author'); INSERT INTO dsa_reports VALUES ('pending'), ('dismissed');");
    const result = await readAdminOverview(db, now);
    expect(result.counts.posts).toBe(145);
    expect(result.counts.identities).toBe(2);
    expect(result.counts.pendingReports).toBe(1);
    expect(result.activity?.at(-1)).toMatchObject({ posts: 145, messages: 1 });
  });
  it('uses UTC hour boundaries and excludes old and future timestamps', async () => {
    const start = Date.UTC(2026, 8, 15, 15);
    for (const [id, stamp] of [['old', start - 1], ['first', start], ['latest', now], ['future', now + 1]] as const) {
      sql.prepare('INSERT INTO posts VALUES (?, ?, ?)').run(id, 'author', stamp);
    }
    const result = await readAdminOverview(db, now);
    expect(result.activity?.[0]).toEqual({ hour: start, posts: 1, messages: 0 });
    expect(result.activity?.reduce((sum, item) => sum + item.posts, 0)).toBe(2);
    expect(result.counts.posts).toBe(4);
  });
  it('keeps available counters when one data source fails', async () => {
    sql.exec('DROP TABLE dsa_reports');
    const result = await readAdminOverview(db, now);
    expect(result.counts.posts).toBe(0);
    expect(result.counts.pendingReports).toBeNull();
    expect(result.unavailable).toEqual(['pendingReports']);
    expect(renderAdminOverview(result, false, '')).toContain('Some data is unavailable');
  });
  it('returns durable counts and empty lists through the authenticated API without seeded activity', async () => {
    const response = await onRequestGet({ request: new Request('https://urefy.com/api/admin', { headers: { Authorization: 'Bearer test-overview' } }), env: { DB: db, ADMIN_PIN: 'test-overview', ENVIRONMENT: 'production' } });
    expect(response.status).toBe(200);
    const data: any = await response.json();
    expect(data.posts).toEqual([]);
    expect(data.channels).toEqual([]);
    expect(data.users).toEqual([]);
    expect(data.telemetry.pageViews24h).toBeNull();
    expect(data.telemetry.totalUsers).toBe(0);
    expect(data.stats.totalPosts).toBe(0);
  });
  it('retains the last successful snapshot after refresh failure and notifies the UI', async () => {
    const overview = await readAdminOverview(db, now);
    const panel = new AdminPanelManager();
    panel.onSyncComplete = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, overview }))));
    await panel.syncWithServer();
    expect(panel.overview?.counts.posts).toBe(0);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    await panel.syncWithServer();
    expect(panel.overview).toEqual(overview);
    expect(panel.syncError).toContain('Refresh failed');
    expect(panel.onSyncComplete).toHaveBeenCalledTimes(2);
    expect(panel.renderAdminPanel('admin', '28m')).toContain('last successful snapshot');
  });
  it('escapes snapshot metadata and refresh errors', async () => {
    const overview = await readAdminOverview(db, now);
    overview.source = '<img src=x onerror=alert(1)>';
    const html = renderAdminOverview(overview, false, '<script>bad</script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');
  });
  it('shows report outages separately from an empty report list', async () => {
    const panel = new AdminPanelManager();
    panel.setTab('dsa');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    await panel.fetchDsaReports();
    const html = panel.renderAdminPanel('admin', '28m');
    expect(html).toContain('Report data unavailable');
    expect(html).not.toContain('No reports in the current results');
  });
  it('renders submitted reports as text, including IDs used in action attributes', () => {
    const panel = new AdminPanelManager();
    const attack = '\"><img src=x onerror=alert(1)>';
    panel.setTab('dsa');
    panel.dsaReportsLoaded = true;
    panel.dsaReports = [{ id: attack, targetId: attack, reason: attack, details: attack, reporterFingerprint: attack, reporterEmail: attack, status: 'pending', createdAt: now }];
    const html = panel.renderAdminPanel('admin', '28m');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});
