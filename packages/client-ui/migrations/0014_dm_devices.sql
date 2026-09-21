-- ===========================================================================
-- MIGRATION 0014: DM_DEVICES TABLE
-- Target: Cloudflare D1 SQLite Engine
-- Purpose: Per-Device Sovereign Identity Session Registration & Revocation
-- ===========================================================================

CREATE TABLE IF NOT EXISTS dm_devices (
    fingerprint TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_label TEXT,
    registration_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'revoked')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (fingerprint, device_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_devices_fingerprint_status ON dm_devices(fingerprint, status);
