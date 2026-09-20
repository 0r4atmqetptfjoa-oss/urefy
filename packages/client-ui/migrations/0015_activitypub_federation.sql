-- ===========================================================================
-- UREfy / AETHERIS — ACTIVITYPUB FEDERATION TABLES (D1 SQLITE)
-- Tracks remote ActivityPub followers and outbound delivery ledger
-- ===========================================================================

CREATE TABLE IF NOT EXISTS activitypub_followers (
    actor TEXT PRIMARY KEY,
    inbox TEXT NOT NULL,
    shared_inbox TEXT,
    public_key_pem TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activitypub_followers_inbox ON activitypub_followers(inbox);

CREATE TABLE IF NOT EXISTS activitypub_deliveries (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    target_inbox TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'delivered', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at INTEGER,
    error TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activitypub_deliveries_status ON activitypub_deliveries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activitypub_deliveries_post ON activitypub_deliveries(post_id);
