-- ===========================================================================
-- UREfy / AETHERIS — ENCRYPTED CROSS-DEVICE VAULT SYNC (D1 SQLITE)
-- Tracks sovereign encrypted Knowledge Vault state versions and metadata
-- ===========================================================================

CREATE TABLE IF NOT EXISTS vault_sync (
    owner_fingerprint TEXT PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,
    byte_size INTEGER NOT NULL DEFAULT 0,
    item_count INTEGER NOT NULL DEFAULT 0,
    ciphertext_hash TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_sync_updated ON vault_sync(updated_at DESC);
