-- Durable accounting includes in-flight R2 writes, unlike publication metadata.
CREATE TABLE IF NOT EXISTS storage_allocations (
  object_key TEXT PRIMARY KEY,
  owner_fingerprint TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK(byte_size > 0),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_storage_allocations_owner ON storage_allocations(owner_fingerprint);
