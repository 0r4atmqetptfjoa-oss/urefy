-- ===========================================================================
-- AETHERIS 0006: PERSISTENT WEBAUTHN / FIDO2 LEVEL 3 CHALLENGE STORE
-- Enforces cross-isolate, distributed single-use expiring challenges in Cloudflare D1
-- ===========================================================================

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  fingerprint TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_challenges_expires ON webauthn_challenges(expires_at);
