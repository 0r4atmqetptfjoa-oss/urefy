-- ===========================================================================
-- AETHERIS 0004: DISTRIBUTED REPLAY PROTECTION NONCE REGISTRY
-- Enforces cross-worker, cross-region replay protection for SovereignSignedEnvelope
-- ===========================================================================

CREATE TABLE IF NOT EXISTS used_nonces (
  fingerprint TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (fingerprint, nonce)
);

CREATE INDEX IF NOT EXISTS idx_nonces_expires ON used_nonces(expires_at);
