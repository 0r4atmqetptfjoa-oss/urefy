CREATE TABLE IF NOT EXISTS dm_identities (
  fingerprint TEXT PRIMARY KEY,
  signing_public_key TEXT NOT NULL,
  registration_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS direct_messages (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  sender_fingerprint TEXT NOT NULL,
  recipient_fingerprint TEXT NOT NULL,
  envelope_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_sequence
  ON direct_messages(sender_fingerprint, sequence);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_sequence
  ON direct_messages(recipient_fingerprint, sequence);