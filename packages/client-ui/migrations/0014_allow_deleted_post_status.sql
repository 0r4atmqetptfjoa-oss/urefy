-- Migration 0014: Support soft-deleted posts, locked posts, and add performance indexes for comments and votes.
-- Preserves all existing posts, comments, interactions, and data.
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS posts_new (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'MEMBER',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    flair TEXT NOT NULL DEFAULT 'TECH DISCUSSION',
    merit_votes INTEGER NOT NULL DEFAULT 0,
    user_voted INTEGER NOT NULL DEFAULT 0,
    reply_count INTEGER NOT NULL DEFAULT 0,
    boost_count INTEGER NOT NULL DEFAULT 0,
    attachment_json TEXT,
    video_json TEXT,
    images_json TEXT,
    poll_id TEXT,
    quoted_post_json TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published', 'draft', 'archived', 'pinned', 'deleted', 'tombstone', 'locked')),
    created_at INTEGER NOT NULL,
    is_expanded INTEGER NOT NULL DEFAULT 0
);

INSERT INTO posts_new (
    id, channel_id, author_id, author_role, title, content, flair,
    merit_votes, user_voted, reply_count, boost_count,
    attachment_json, video_json, images_json, poll_id,
    quoted_post_json, status, created_at, is_expanded
)
SELECT
    id, channel_id, author_id, author_role, title, content, flair,
    merit_votes, user_voted, reply_count, boost_count,
    attachment_json, video_json, images_json, poll_id,
    quoted_post_json, status, created_at, is_expanded
FROM posts;
DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;

PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_posts_status_merit ON posts(status, merit_votes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_channel_id ON posts(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_merit_votes ON posts(merit_votes DESC);
CREATE INDEX IF NOT EXISTS idx_posts_flair ON posts(flair);

-- Ensure comments table exists before indexing
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    parent_id TEXT,
    author_id TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'MEMBER',
    content TEXT NOT NULL,
    merit_votes INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_target ON votes(user_fingerprint, target_type, target_id);
