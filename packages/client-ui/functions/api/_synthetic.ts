import { D1Database } from './_db.js';

export type SyntheticResourceType = 'community' | 'post' | 'comment';

export interface SyntheticFixtureMetadata {
  syntheticTest: true;
  environment: 'test';
  cleanupRunId: string;
}

const CLEANUP_RUN_ID = /^[a-z0-9][a-z0-9._-]{5,79}$/i;

export function parseSyntheticFixtureMetadata(body: Record<string, any>): SyntheticFixtureMetadata | null {
  if (body.syntheticTest !== true) return null;
  const cleanupRunId = String(body.cleanupRunId || '').trim();
  const environment = String(body.environment || 'test').trim().toLowerCase();
  if (environment !== 'test' || !CLEANUP_RUN_ID.test(cleanupRunId)) {
    throw new Error('Synthetic test content requires environment="test" and a valid cleanupRunId.');
  }
  return { syntheticTest: true, environment: 'test', cleanupRunId };
}

export async function ensureSyntheticFixturesTable(db: D1Database): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS synthetic_fixtures (
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'test',
    cleanup_run_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (resource_type, resource_id)
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_synthetic_fixtures_cleanup ON synthetic_fixtures(cleanup_run_id, resource_type)').run();
}

export async function registerSyntheticFixture(
  db: D1Database,
  resourceType: SyntheticResourceType,
  resourceId: string,
  metadata: SyntheticFixtureMetadata
): Promise<void> {
  await db.prepare(`INSERT OR REPLACE INTO synthetic_fixtures
    (resource_type, resource_id, environment, cleanup_run_id, created_at)
    VALUES (?, ?, ?, ?, ?)`)
    .bind(resourceType, resourceId, metadata.environment, metadata.cleanupRunId, Date.now())
    .run();
}

export const SYNTHETIC_PUBLIC_EXCLUSION = `NOT EXISTS (
  SELECT 1 FROM synthetic_fixtures sf
  WHERE sf.resource_type = ? AND sf.resource_id = id
)`;
