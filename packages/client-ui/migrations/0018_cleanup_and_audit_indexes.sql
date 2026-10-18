-- ===========================================================================
-- Migration 0018: Persistent WAF Bans, Admin Lockouts, Schema Consolidation & Indexes
-- Eliminates runtime DDL in API routes and prevents used_nonces table bloat
-- ===========================================================================

CREATE TABLE IF NOT EXISTS user_roles (
  fingerprint TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  is_quarantined INTEGER DEFAULT 0,
  is_shadowbanned INTEGER DEFAULT 0,
  notes TEXT,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS admin_immutable_audit_ledger (
  id TEXT PRIMARY KEY,
  previous_entry_hash TEXT NOT NULL,
  current_entry_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  admin_credential_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  client_ip TEXT NOT NULL,
  client_country TEXT NOT NULL,
  payload_digest TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS waf_banned_ips (
  ip TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  banned_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_pin_lockouts (
  ip TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 1,
  last_attempt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS synthetic_fixtures (
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'test',
  cleanup_run_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (resource_type, resource_id)
);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS user_mutes (
  muter_id TEXT NOT NULL,
  muted_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (muter_id, muted_id)
);

-- Indecși de performanță pentru curățarea rapidă a nonce-urilor și interogări
CREATE INDEX IF NOT EXISTS idx_used_nonces_expires_at ON used_nonces(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_ledger_timestamp ON admin_immutable_audit_ledger(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_waf_banned_ips_expires ON waf_banned_ips(expires_at);
CREATE INDEX IF NOT EXISTS idx_synthetic_fixtures_cleanup ON synthetic_fixtures(cleanup_run_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, merit_votes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status_created ON posts(status, created_at DESC);
