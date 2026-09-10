import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import type { D1Database } from '../../functions/api/_db.js';

export function createDmDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../../migrations/0007_direct_messages.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../../migrations/0004_used_nonces.sql', import.meta.url), 'utf8'));
  sqlite.exec('CREATE TABLE user_roles (fingerprint TEXT PRIMARY KEY, is_quarantined INTEGER DEFAULT 0); CREATE TABLE system_config (key TEXT PRIMARY KEY, value TEXT);');
  const database = {
    prepare(query: string) {
      const statement = sqlite.prepare(query);
      let parameters: any[] = [];
      const adapter = {
        bind(...values: any[]) { parameters = values; return adapter; },
        async first() { return statement.get(...parameters) ?? null; },
        async all() { return { success: true, results: statement.all(...parameters), meta: {} }; },
        async run() { return { success: true, meta: statement.run(...parameters) }; },
      };
      return adapter;
    },
  } as unknown as D1Database;
  return { sqlite, database };
}