-- Canonical tables missing in early installations. Existing tables and data
-- are preserved. Notification column compatibility is handled by the API.
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE TABLE IF NOT EXISTS user_mutes (
  muter_id TEXT NOT NULL,
  muted_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (muter_id, muted_id)
);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muter ON user_mutes(muter_id);
