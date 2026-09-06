import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseSync } from 'node:sqlite';

describe('Aetheris Omni-Sphere — D1 SQLite Migrations Verification', () => {
  it('applies migrations 0001 through 0006 sequentially onto a fresh SQLite database', () => {
    const db = new DatabaseSync(':memory:');

    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    expect(files.length).toBe(6);
    expect(files).toEqual([
      '0001_initial_schema.sql',
      '0002_dsa_reports.sql',
      '0003_interactions.sql',
      '0004_used_nonces.sql',
      '0005_webauthn_credentials.sql',
      '0006_webauthn_challenges.sql',
    ]);

    // Apply migrations in order
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      expect(() => db.exec(sql)).not.toThrow();
    }

    // Verify critical tables exist
    const tablesQuery = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    ).all() as Array<{ name: string }>;
    const tableNames = tablesQuery.map((r) => r.name);

    const expectedTables = [
      'channels',
      'cve_cache',
      'dsa_reports',
      'interactions',
      'messages',
      'nanopublications',
      'nodes_telemetry',
      'posts',
      'push_subscriptions',
      'used_nonces',
      'votes',
      'webauthn_challenges',
      'webauthn_credentials',
    ];

    for (const table of expectedTables) {
      expect(tableNames).toContain(table);
    }

    // Verify seed data from migration 0001
    const postsCount = db.prepare('SELECT COUNT(*) as c FROM posts;').get() as { c: number };
    expect(postsCount.c).toBeGreaterThan(0);

    const channelsCount = db.prepare('SELECT COUNT(*) as c FROM channels;').get() as { c: number };
    expect(channelsCount.c).toBeGreaterThan(0);

    // Test idempotency: re-running all migrations must not throw
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      expect(() => db.exec(sql)).not.toThrow();
    }
  });
});
