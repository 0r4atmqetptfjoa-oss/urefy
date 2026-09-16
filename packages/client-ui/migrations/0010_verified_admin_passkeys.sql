-- Separate verified credentials from the legacy, unverified passkey table.
CREATE TABLE IF NOT EXISTS admin_verified_passkeys (
  credential_id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  origin TEXT NOT NULL,
  user_handle TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);
CREATE TABLE IF NOT EXISTS admin_passkey_challenges (
  id TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK(purpose IN ('registration', 'authentication')),
  origin TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_admin_challenge_expiry ON admin_passkey_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_challenge_ip ON admin_passkey_challenges(ip_hash, expires_at);
