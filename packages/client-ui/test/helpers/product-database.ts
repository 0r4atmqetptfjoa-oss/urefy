import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import type { D1Database } from '../../functions/api/_db.js';

/** Executes the real application schema and statements, including atomic D1 batches. */
export function createProductDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../../functions/schema.sql', import.meta.url), 'utf8'));
  const database = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      let values: any[] = [];
      const adapter = {
        bind(...parameters: any[]) { values = parameters; return adapter; },
        async first() { return statement.get(...values) ?? null; },
        async all() { return { success: true, results: statement.all(...values), meta: {} }; },
        async run() { return { success: true, meta: statement.run(...values) }; },
        execute() {
          return /^\s*(SELECT|WITH)\b/i.test(sql)
            ? { success: true, results: statement.all(...values), meta: {} }
            : { success: true, results: [], meta: statement.run(...values) };
        },
      };
      return adapter;
    },
    async batch(statements: Array<{ execute(): unknown }>) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map(statement => statement.execute());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  } as unknown as D1Database;
  return { sqlite, database };
}
