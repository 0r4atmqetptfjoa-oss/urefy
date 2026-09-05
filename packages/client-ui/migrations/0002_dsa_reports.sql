-- ===========================================================================
-- AETHERIS OMNI-SPHERE — DSA NOTICE & TAKEDOWN SCHEMA MIGRATION
-- Table: dsa_reports (EU Digital Services Act Regulation 2022/2065 Art. 16)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS dsa_reports (
    id TEXT PRIMARY KEY,
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'post',
    reason TEXT NOT NULL,
    details TEXT,
    reporter_fingerprint TEXT,
    reporter_email TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    reviewed_at INTEGER,
    resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_dsa_reports_created ON dsa_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsa_reports_status ON dsa_reports(status);
