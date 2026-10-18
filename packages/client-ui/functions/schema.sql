-- ===========================================================================
-- AETHERIS OMNI-SPHERE — CLOUDFLARE D1 DATABASE SCHEMA
-- Target: Cloudflare D1 SQLite Engine (Pure Canonical snake_case)
-- Tables: channels, messages, posts, votes, nanopublications, nodes_telemetry, cve_cache, push_subscriptions, interactions
-- ===========================================================================

-- 1. CHANNELS TABLE
CREATE TABLE IF NOT EXISTS storage_allocations (
    object_key TEXT PRIMARY KEY,
    owner_fingerprint TEXT NOT NULL,
    byte_size INTEGER NOT NULL CHECK(byte_size > 0),
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_storage_allocations_owner ON storage_allocations(owner_fingerprint);

CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    space TEXT NOT NULL CHECK(space IN ('relays', 'vault', 'pulse')),
    name TEXT NOT NULL,
    description TEXT,
    is_encrypted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_channels_space ON channels(space);
CREATE INDEX IF NOT EXISTS idx_channels_created_at ON channels(created_at ASC);

-- 2. MESSAGES TABLE (E2EE Chat & Relay Feed)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    ciphertext TEXT NOT NULL,
    nonce TEXT,
    epoch TEXT DEFAULT '#1',
    status TEXT DEFAULT 'verified',
    signature TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_author_id ON messages(author_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- 3. POSTS TABLE (Chronostream Microblog & Articles)
CREATE TABLE IF NOT EXISTS posts (
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

CREATE INDEX IF NOT EXISTS idx_posts_status_merit ON posts(status, merit_votes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_channel_id ON posts(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_merit_votes ON posts(merit_votes DESC);
CREATE INDEX IF NOT EXISTS idx_posts_flair ON posts(flair);
CREATE INDEX IF NOT EXISTS idx_posts_facet_id ON posts(facet_id);
CREATE INDEX IF NOT EXISTS idx_posts_audience ON posts(audience);

-- 4. VOTES TABLE (Merit / Karma Ledger)
CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL CHECK(target_type IN ('post', 'comment', 'nanopublication')),
    target_id TEXT NOT NULL,
    user_fingerprint TEXT NOT NULL,
    direction INTEGER NOT NULL CHECK(direction IN (-1, 1)),
    created_at INTEGER NOT NULL,
    UNIQUE(target_type, target_id, user_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_votes_user_target ON votes(user_fingerprint, target_type, target_id);

-- 5. NANOPUBLICATIONS TABLE (Verified Cryptographic Artifacts & Manifests)
CREATE TABLE IF NOT EXISTS nanopublications (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    byte_size INTEGER NOT NULL DEFAULT 0,
    sha256 TEXT NOT NULL,
    crc32 TEXT,
    entropy REAL NOT NULL DEFAULT 0.0,
    verdict TEXT NOT NULL DEFAULT 'CLEAN',
    merkle_root TEXT NOT NULL,
    seeder_count INTEGER NOT NULL DEFAULT 1,
    r2_key TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nanopubs_channel_id ON nanopublications(channel_id);
CREATE INDEX IF NOT EXISTS idx_nanopubs_sha256 ON nanopublications(sha256);
CREATE INDEX IF NOT EXISTS idx_nanopubs_created_at ON nanopublications(created_at DESC);

-- 6. NODES_TELEMETRY TABLE (P2P Network Observatory & Mesh Metrics)
CREATE TABLE IF NOT EXISTS nodes_telemetry (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'relay',
    status TEXT NOT NULL DEFAULT 'active',
    latency_ms REAL NOT NULL DEFAULT 15.0,
    merit_score INTEGER NOT NULL DEFAULT 100,
    region TEXT DEFAULT 'GLOBAL',
    country_code TEXT DEFAULT 'XX',
    uptime REAL NOT NULL DEFAULT 99.9,
    bandwidth_mbps REAL NOT NULL DEFAULT 100.0,
    messages_processed INTEGER NOT NULL DEFAULT 0,
    zk_rln_epoch INTEGER NOT NULL DEFAULT 1,
    connections_json TEXT,
    last_heartbeat INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes_telemetry(status);
CREATE INDEX IF NOT EXISTS idx_nodes_last_heartbeat ON nodes_telemetry(last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_nodes_merit_score ON nodes_telemetry(merit_score DESC);

-- 7. CVE_CACHE TABLE (NIST NVD & Sovereign Security Vulnerability Mirror)
CREATE TABLE IF NOT EXISTS cve_cache (
    id TEXT PRIMARY KEY,
    cve_id TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    cvss_score REAL NOT NULL,
    affected_packages_json TEXT NOT NULL,
    published_at INTEGER NOT NULL,
    url TEXT NOT NULL,
    cached_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cve_severity ON cve_cache(severity);
CREATE INDEX IF NOT EXISTS idx_cve_published_at ON cve_cache(published_at DESC);

-- 8. PUSH_SUBSCRIPTIONS TABLE (Zero-Tracking Sovereign Web Push VAPID Registry)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    fingerprint TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_fingerprint ON push_subscriptions(fingerprint);

-- 9. INTERACTIONS TABLE (Real Likes, Reposts, Bookmarks, Reactions, Awards, Views)
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

-- 10. SYSTEM_CONFIG TABLE (Emergency freeze, broadcast notifications, network configs)
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 11. USER_ROLES TABLE (RBAC, moderation quarantine, shadowban flags)
CREATE TABLE IF NOT EXISTS user_roles (
    fingerprint TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'MEMBER',
    is_quarantined INTEGER NOT NULL DEFAULT 0,
    is_shadowbanned INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_quarantined ON user_roles(is_quarantined);

-- 12. USED_NONCES TABLE (Cross-worker, cross-region atomic replay protection)
CREATE TABLE IF NOT EXISTS used_nonces (
    fingerprint TEXT NOT NULL,
    nonce TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (fingerprint, nonce)
);

CREATE INDEX IF NOT EXISTS idx_nonces_expires ON used_nonces(expires_at);

-- 13. DSA_REPORTS TABLE (EU Digital Services Act Regulation compliance)
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

-- 14. WEBAUTHN_CREDENTIALS TABLE (FIDO2 / Passkey L3 storage)
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    credential_id TEXT PRIMARY KEY,
    fingerprint TEXT NOT NULL,
    public_key_spki TEXT NOT NULL,
    algorithm TEXT NOT NULL DEFAULT 'ES256',
    sign_count INTEGER NOT NULL DEFAULT 0,
    transports TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webauthn_fingerprint ON webauthn_credentials(fingerprint);

-- 15. WEBAUTHN_CHALLENGES TABLE (Expiring single-use auth challenges)
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    fingerprint TEXT PRIMARY KEY,
    challenge TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_challenges_expires ON webauthn_challenges(expires_at);

-- 16. DM_IDENTITIES TABLE (Private E2EE messaging identities)
CREATE TABLE IF NOT EXISTS dm_identities (
    fingerprint TEXT PRIMARY KEY,
    signing_public_key TEXT NOT NULL,
    registration_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 17. DIRECT_MESSAGES TABLE (Encrypted direct message outbox/inbox)
CREATE TABLE IF NOT EXISTS direct_messages (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    sender_fingerprint TEXT NOT NULL,
    recipient_fingerprint TEXT NOT NULL,
    envelope_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_sequence ON direct_messages(sender_fingerprint, sequence);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_sequence ON direct_messages(recipient_fingerprint, sequence);

-- 18. GOVERNANCE_PROPOSALS & VOTES TABLES (Decentralized DAO ballots)
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

-- 19. ACTIVITYPUB_INBOX TABLE (Atomic cross-worker ActivityPub deduplication)
CREATE TABLE IF NOT EXISTS activitypub_inbox (
    id TEXT PRIMARY KEY,
    activity_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    received_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activitypub_inbox_received ON activitypub_inbox(received_at DESC);

-- 20. FOLLOWS TABLE (Sovereign Social Graph)
CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- 21. COMMUNITIES TABLE (Reddit/Discord-style Sovereign Workspaces)
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

CREATE INDEX IF NOT EXISTS idx_communities_name ON communities(name);
CREATE INDEX IF NOT EXISTS idx_communities_category ON communities(category);

-- 22. COMMUNITY_MEMBERS TABLE (Memberships & Moderation Roles)
CREATE TABLE IF NOT EXISTS community_members (
    community_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'moderator', 'admin')),
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY(community_id) REFERENCES communities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);

-- 23. COMMENTS TABLE (Discussion Tree Threads)
CREATE TABLE IF NOT EXISTS comments (
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

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_facet_id ON comments(facet_id);

-- 24. POST_TAGS TABLE (Hashtag & Topic Indices for Discovery)
CREATE TABLE IF NOT EXISTS post_tags (
    post_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (post_id, tag),
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag);

-- 25. NOTIFICATIONS TABLE (Activity & Engagement Alerts)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT,
    type TEXT NOT NULL CHECK(type IN ('follow', 'reply_post', 'reply_comment', 'mention', 'reaction', 'award', 'mod_action', 'message_request', 'message', 'community_activity')),
    target_id TEXT,
    target_type TEXT,
    preview_text TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- 26. USER_BLOCKS TABLE (Sovereign Safety & Content Filtering)
CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id TEXT NOT NULL,
    blocked_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- 27. USER_MUTES TABLE (Feed Timeline Content Muting)
CREATE TABLE IF NOT EXISTS user_mutes (
    muter_id TEXT NOT NULL,
    muted_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (muter_id, muted_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mutes_muter ON user_mutes(muter_id);

-- 28. USER_PROFILES TABLE (Public Sovereign Profiles & Metadata)
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

CREATE INDEX IF NOT EXISTS idx_user_profiles_handle ON user_profiles(handle);
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated ON user_profiles(updated_at DESC);

-- 29. COMMUNITY_MODERATION_LOGS TABLE (Verifiable Audited Mod Actions)
CREATE TABLE IF NOT EXISTS community_moderation_logs (
    id TEXT PRIMARY KEY,
    community_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('pin_post', 'unpin_post', 'remove_post', 'lock_thread', 'unlock_thread', 'mute_user', 'ban_user', 'unban_user', 'edit_info', 'approve_report', 'reject_report')),
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_mod_logs_comm_created ON community_moderation_logs(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_mod_logs_mod ON community_moderation_logs(moderator_id);

-- 30. REPORTS TABLE (Social Safety & Community Moderation Queue)
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL CHECK(target_type IN ('post', 'comment', 'user', 'message', 'community')),
    target_id TEXT NOT NULL,
    reason_category TEXT NOT NULL CHECK(reason_category IN ('spam', 'harassment', 'impersonation', 'illegal', 'malware', 'other')),
    details TEXT,
    reporter_id TEXT NOT NULL,
    community_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
    action_taken TEXT,
    moderator_id TEXT,
    created_at INTEGER NOT NULL,
    reviewed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_reports_community_status ON reports(community_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at DESC);

-- 31. MESSAGE_REQUESTS TABLE (E2EE DM Safety for Non-Mutuals)
CREATE TABLE IF NOT EXISTS message_requests (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'blocked')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(sender_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_message_requests_recipient_status ON message_requests(recipient_id, status, created_at DESC);

-- No social content, engagement, identities or telemetry is seeded by the
-- production schema. Test fixtures supply their own explicit data.

-- ===========================================================================
-- IMMUTABLE CRYPTOGRAPHIC WORM AUDIT LEDGER (Merkle Hash-Chained)
-- ===========================================================================
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

-- ===========================================================================
-- 32. ACTIVITYPUB FEDERATION TABLES (Remote Followers & Outbound Delivery)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS activitypub_followers (
    actor TEXT PRIMARY KEY,
    inbox TEXT NOT NULL,
    shared_inbox TEXT,
    public_key_pem TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activitypub_followers_inbox ON activitypub_followers(inbox);

CREATE TABLE IF NOT EXISTS activitypub_deliveries (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    target_inbox TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'delivered', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at INTEGER,
    error TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activitypub_deliveries_status ON activitypub_deliveries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activitypub_deliveries_post ON activitypub_deliveries(post_id);

-- ===========================================================================
-- 33. ENCRYPTED CROSS-DEVICE VAULT SYNC TABLE
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

-- ===========================================================================
-- 34. DM_DEVICES TABLE (Per-Device Identity Session Registry & Revocation)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS dm_devices (
    fingerprint TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_public_key TEXT NOT NULL DEFAULT '',
    device_label TEXT,
    registration_json TEXT NOT NULL,
    certificate_json TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'revoked')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (fingerprint, device_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_devices_fingerprint_status ON dm_devices(fingerprint, status);

CREATE TABLE IF NOT EXISTS dm_permissions (
    fingerprint TEXT PRIMARY KEY,
    permission TEXT NOT NULL DEFAULT 'everyone',
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dm_permissions_fingerprint ON dm_permissions(fingerprint);

-- ===========================================================================
-- 35. SYNTHETIC FIXTURE REGISTRY (closed beta / load test isolation)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS synthetic_fixtures (
    resource_type TEXT NOT NULL CHECK(resource_type IN ('community', 'post', 'comment')),
    resource_id TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'test' CHECK(environment = 'test'),
    cleanup_run_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_synthetic_fixtures_cleanup ON synthetic_fixtures(cleanup_run_id, resource_type);

-- ===========================================================================
-- 36. FACETS TABLE (Sovereign Contexts / Identities)
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
-- 37. FACET_FOLLOWS TABLE (Sovereign Facet Social Graph)
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

-- ===========================================================================
-- 38. FACET_COMMUNITY_MEMBERSHIPS TABLE (Facet-scoped Community Workspaces)
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

CREATE INDEX IF NOT EXISTS idx_posts_public_discovery ON posts(status, audience, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_posts_channel_public ON posts(channel_id, status, audience, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_covering ON interactions(target_type, target_id, interaction_type, value, user_fingerprint);


