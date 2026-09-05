-- ===========================================================================
-- AETHERIS OMNI-SPHERE — INTERACTIONS & ENGAGEMENT SCHEMA MIGRATION
-- Table: interactions (Likes, Reposts, Bookmarks, Reactions, Awards, Views)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL DEFAULT 'post' CHECK(target_type IN ('post', 'comment', 'nanopublication')),
    target_id TEXT NOT NULL,
    user_fingerprint TEXT NOT NULL,
    interaction_type TEXT NOT NULL CHECK(interaction_type IN ('like', 'repost', 'bookmark', 'reaction', 'award', 'view')),
    value TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE(target_type, target_id, user_fingerprint, interaction_type, value)
);

CREATE INDEX IF NOT EXISTS idx_interactions_target ON interactions(target_id, target_type, interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_fingerprint, interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at DESC);
