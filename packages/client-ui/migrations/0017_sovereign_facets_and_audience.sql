-- Migration 0017: Sovereign Contexts / Facets & Audience Privacy (Phase 1 MVP)
-- Introduces facets, facet_follows, facet_community_memberships,
-- post audience privacy, and idempotently migrates existing user profiles and content.

PRAGMA foreign_keys = OFF;

-- ===========================================================================
-- 0. ENSURE PREREQUISITE CANONICAL TABLES EXIST (Idempotency Guard)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    pinned_post_id TEXT,
    interests_json TEXT,
    website TEXT,
    location TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    icon TEXT,
    banner TEXT,
    primary_color TEXT,
    channel_id TEXT NOT NULL,
    rules_json TEXT,
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS community_members (
    community_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'moderator', 'admin')),
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (community_id, user_id)
);

-- ===========================================================================
-- 1. FACETS TABLE
-- ===========================================================================
CREATE TABLE IF NOT EXISTS facets (
    id TEXT PRIMARY KEY,
    owner_fingerprint TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public', 'contextual', 'unlisted')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'deactivated', 'deleted')),
    is_default INTEGER NOT NULL DEFAULT 0,
    is_publicly_linked INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_facets_owner ON facets(owner_fingerprint);
CREATE INDEX IF NOT EXISTS idx_facets_handle ON facets(handle);
CREATE INDEX IF NOT EXISTS idx_facets_owner_default ON facets(owner_fingerprint, is_default);

-- ===========================================================================
-- 2. MIGRATE USER_PROFILES TO DEFAULT FACETS (IDEMPOTENT & OPAQUE IDS)
-- ===========================================================================
INSERT OR IGNORE INTO facets (
    id, owner_fingerprint, handle, display_name, avatar_url, bio, visibility, status, is_default, is_publicly_linked, created_at, updated_at
)
SELECT
    'fct-' || lower(hex(randomblob(8))),
    user_id,
    handle,
    display_name,
    avatar_url,
    bio,
    'public',
    'active',
    1,
    0,
    created_at,
    updated_at
FROM user_profiles
WHERE NOT EXISTS (
    SELECT 1 FROM facets WHERE facets.owner_fingerprint = user_profiles.user_id AND facets.is_default = 1
);

-- ===========================================================================
-- 3. FACET_FOLLOWS TABLE (Sovereign Facet Social Graph)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS facet_follows (
    follower_facet_id TEXT NOT NULL,
    following_facet_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (follower_facet_id, following_facet_id),
    FOREIGN KEY(follower_facet_id) REFERENCES facets(id) ON DELETE CASCADE,
    FOREIGN KEY(following_facet_id) REFERENCES facets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_facet_follows_follower ON facet_follows(follower_facet_id);
CREATE INDEX IF NOT EXISTS idx_facet_follows_following ON facet_follows(following_facet_id);

-- Migrate existing follows into facet_follows (Idempotent)
INSERT OR IGNORE INTO facet_follows (follower_facet_id, following_facet_id, created_at)
SELECT
    f_er.id,
    f_ing.id,
    f.created_at
FROM follows f
JOIN facets f_er ON f.follower_id = f_er.owner_fingerprint AND f_er.is_default = 1
JOIN facets f_ing ON f.following_id = f_ing.owner_fingerprint AND f_ing.is_default = 1;

-- ===========================================================================
-- 4. FACET_COMMUNITY_MEMBERSHIPS TABLE (Facet-scoped Community Workspaces)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS facet_community_memberships (
    community_id TEXT NOT NULL,
    facet_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'moderator', 'admin')),
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (community_id, facet_id),
    FOREIGN KEY(community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY(facet_id) REFERENCES facets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_facet_comm_members_facet ON facet_community_memberships(facet_id);
CREATE INDEX IF NOT EXISTS idx_facet_comm_members_comm ON facet_community_memberships(community_id);

-- Migrate existing community_members into facet_community_memberships (Idempotent)
INSERT OR IGNORE INTO facet_community_memberships (community_id, facet_id, role, joined_at)
SELECT
    cm.community_id,
    f.id,
    cm.role,
    cm.joined_at
FROM community_members cm
JOIN facets f ON cm.user_id = f.owner_fingerprint AND f.is_default = 1;

-- ===========================================================================
-- 5. UPGRADE POSTS TABLE WITH FACET_ID & AUDIENCE
-- ===========================================================================
CREATE TABLE IF NOT EXISTS posts_with_facets (
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
    is_expanded INTEGER NOT NULL DEFAULT 0,
    facet_id TEXT,
    audience TEXT NOT NULL DEFAULT 'public' CHECK(audience IN ('public', 'community', 'followers'))
);

INSERT INTO posts_with_facets (
    id, channel_id, author_id, author_role, title, content, flair,
    merit_votes, user_voted, reply_count, boost_count,
    attachment_json, video_json, images_json, poll_id,
    quoted_post_json, status, created_at, is_expanded, facet_id, audience
)
SELECT
    p.id, p.channel_id, p.author_id, p.author_role, p.title, p.content, p.flair,
    p.merit_votes, p.user_voted, p.reply_count, p.boost_count,
    p.attachment_json, p.video_json, p.images_json, p.poll_id,
    p.quoted_post_json, p.status, p.created_at, p.is_expanded,
    COALESCE(
        (SELECT f.id FROM facets f WHERE f.owner_fingerprint = p.author_id AND f.is_default = 1),
        'fct-' || lower(hex(randomblob(8)))
    ) AS facet_id,
    'public' AS audience
FROM posts p;

DROP TABLE posts;
ALTER TABLE posts_with_facets RENAME TO posts;

CREATE INDEX IF NOT EXISTS idx_posts_status_merit ON posts(status, merit_votes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_channel_id ON posts(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_merit_votes ON posts(merit_votes DESC);
CREATE INDEX IF NOT EXISTS idx_posts_flair ON posts(flair);
CREATE INDEX IF NOT EXISTS idx_posts_facet_id ON posts(facet_id);
CREATE INDEX IF NOT EXISTS idx_posts_audience ON posts(audience);

-- ===========================================================================
-- 6. UPGRADE COMMENTS TABLE WITH FACET_ID
-- ===========================================================================
CREATE TABLE IF NOT EXISTS comments_with_facets (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    parent_id TEXT,
    author_id TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'MEMBER',
    content TEXT NOT NULL,
    merit_votes INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    facet_id TEXT,
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
);

INSERT INTO comments_with_facets (
    id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at, facet_id
)
SELECT
    c.id, c.post_id, c.parent_id, c.author_id, c.author_role, c.content, c.merit_votes, c.created_at,
    COALESCE(
        (SELECT f.id FROM facets f WHERE f.owner_fingerprint = c.author_id AND f.is_default = 1),
        'fct-' || lower(hex(randomblob(8)))
    ) AS facet_id
FROM comments c;

DROP TABLE comments;
ALTER TABLE comments_with_facets RENAME TO comments;

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_facet_id ON comments(facet_id);

PRAGMA foreign_keys = ON;
