-- ===========================================================================
-- UREFY 0009: ADMIN RBAC ROLES, PASSKEY BIOMETRICS & USER RETENTION
-- Provides persistent storage for granular sovereign roles, WebAuthn passkey
-- admin credentials, and user activity summaries for retention features.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS admin_rbac_roles (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_passkey_credentials (
  credential_id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_activity_summaries (
  fingerprint TEXT PRIMARY KEY,
  last_active INTEGER NOT NULL,
  unread_notifs INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_rbac_fingerprint ON admin_rbac_roles(fingerprint);
CREATE INDEX IF NOT EXISTS idx_admin_passkey_fp ON admin_passkey_credentials(fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_activity_last_active ON user_activity_summaries(last_active);
