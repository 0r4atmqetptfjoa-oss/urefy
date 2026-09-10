CREATE TABLE IF NOT EXISTS governance_proposals (
  id TEXT PRIMARY KEY,
  author_fingerprint TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('protocol', 'community', 'security', 'funding')),
  quorum INTEGER NOT NULL CHECK(quorum > 0),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  envelope_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS governance_votes (
  proposal_id TEXT NOT NULL REFERENCES governance_proposals(id),
  voter_fingerprint TEXT NOT NULL,
  choice TEXT NOT NULL CHECK(choice IN ('for', 'against', 'abstain')),
  created_at INTEGER NOT NULL,
  envelope_json TEXT NOT NULL,
  PRIMARY KEY (proposal_id, voter_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_governance_proposals_created ON governance_proposals(created_at DESC);