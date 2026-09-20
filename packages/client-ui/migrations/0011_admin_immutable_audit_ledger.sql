-- Migration 0011: Immutable Cryptographic WORM Audit Ledger
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

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON admin_immutable_audit_ledger(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_immutable_audit_ledger(action);
