-- ===========================================================================
-- AETHERIS 0005: PERSISTENT WEBAUTHN / FIDO2 LEVEL 3 CREDENTIAL STORE
-- Eliminates ephemeral in-memory credential storage across Cloudflare Worker isolates
-- ===========================================================================

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  credential_id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  public_key_spki TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'ES256',
  sign_count INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webauthn_fingerprint ON webauthn_credentials(fingerprint);
