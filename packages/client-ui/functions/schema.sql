-- ===========================================================================
-- AETHERIS OMNI-SPHERE — CLOUDFLARE D1 DATABASE SCHEMA
-- Target: Cloudflare D1 SQLite Engine (Pure Canonical snake_case)
-- Tables: channels, messages, posts, votes, nanopublications, nodes_telemetry, cve_cache, push_subscriptions, interactions
-- ===========================================================================

-- 1. CHANNELS TABLE
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
    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published', 'draft', 'archived', 'pinned')),
    created_at INTEGER NOT NULL,
    is_expanded INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_posts_status_merit ON posts(status, merit_votes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_channel_id ON posts(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_merit_votes ON posts(merit_votes DESC);
CREATE INDEX IF NOT EXISTS idx_posts_flair ON posts(flair);

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
    created_at INTEGER NOT NULL
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
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);

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

-- ===========================================================================
-- SEED INITIAL DATA (Idempotent INSERT OR IGNORE)
-- ===========================================================================

-- Communities Seed
INSERT OR IGNORE INTO communities (id, name, display_name, description, category, icon, banner, primary_color, channel_id, member_count, created_at) VALUES
('c-technology', 'technology', 'Technology & Computing', 'Latest tech breakthroughs, computing, AI hardware, and developer software.', 'Technology', '💻', 'linear-gradient(135deg, #0ea5e9, #6366f1)', '#38bdf8', 'c/technology', 1420, 1756600000000),
('c-privacy-ai', 'privacy-ai', 'Privacy, AI & Autonomy', 'Local AI models, open weights, privacy engineering, and autonomous agents.', 'Artificial Intelligence', '🤖', 'linear-gradient(135deg, #8b5cf6, #ec4899)', '#a855f7', 'c/privacy-ai', 980, 1756600000000),
('c-opensource', 'opensource', 'Open Source & Dev Hub', 'Free software, Linux kernel, developer tooling, and self-hosted tools.', 'Software & Dev', '🌐', 'linear-gradient(135deg, #10b981, #06b6d4)', '#34d399', 'c/opensource', 1150, 1756600000000),
('c-gaming', 'gaming', 'Gaming & Digital Worlds', 'Indie game development, open gaming rigs, modding, and game design.', 'Gaming', '🎮', 'linear-gradient(135deg, #f59e0b, #ef4444)', '#fbbf24', 'c/gaming', 820, 1756600000000),
('c-creative', 'creative', 'Design & Digital Arts', 'Generative art, UI/UX design, electronic music, and creative coding.', 'Creative Arts', '🎨', 'linear-gradient(135deg, #ec4899, #8b5cf6)', '#f472b6', 'c/creative', 640, 1756600000000),
('c-digitalfreedom', 'digitalfreedom', 'Digital Rights & Freedom', 'Decentralized speech, civil liberties, encryption rights, and open protocols.', 'Society & Rights', '⚡', 'linear-gradient(135deg, #6366f1, #0ea5e9)', '#818cf8', 'c/digitalfreedom', 1290, 1756600000000);

-- Channels
INSERT OR IGNORE INTO channels (id, space, name, description, is_encrypted, created_at) VALUES
('relays-general', 'relays', 'general', 'Sovereign E2EE live voice & text', 1, 1756600000000),
('relays-dev', 'relays', 'dev-core', 'Core cryptography & low-level discussions', 1, 1756600000000),
('vault-releases', 'vault', 'releases', 'Verified software releases & clean binaries', 0, 1756600000000),
('vault-guides', 'vault', 'security-guides', 'In-depth research, reversing & operational security', 0, 1756600000000),
('pulse-global', 'pulse', 'chrono-feed', 'Uncensored chronological sovereign microblogging', 0, 1756600000000);

-- Initial Messages
INSERT OR IGNORE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES
('msg-1', 'relays-general', 'genesis-core', 'Welcome to the Sovereign E2EE Live Relay. All communications in this matrix are quantum-ratcheted via MLS TreeKEM and authenticated with Zero-Knowledge RLN.', 'nonce_01', '#412', 'verified', 'sig_genesis_01', 1756660000000),
('msg-2', 'relays-general', 'c3dc28cb705e', 'The BitTorrent Merkle pieces for Micro-Kernel v1.0.0 have fully propagated across all 14 seeder nodes. 100% byte-match verified.', 'nonce_02', '#412', 'verified', 'sig_archivist_02', 1756661500000),
('msg-3', 'relays-general', 'a89104fa2211', 'Confirmed. Zero packet loss over WebRTC DTLS direct tunnels. Latency stable at 14ms.', 'nonce_03', '#412', 'verified', 'sig_mod_03', 1756662400000),
('msg-dev-1', 'relays-dev', 'genesis-core', 'Core dev update: Post-Quantum Kyber-1024 Key Encapsulation test vectors integrated into MLS ratchet loop.', 'nonce_dev_01', '#412', 'verified', 'sig_genesis_dev_01', 1756662800000);

-- Initial Posts
INSERT OR IGNORE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES
('post-1', 'vault-releases', 'c3dc28cb705e', 'ARCHIVIST', 'Aetheris Cryptographic Micro-Kernel v1.0.0 (Verified x86_64 Release)', 'Official microkernel distribution compiled with zero telemetry and verified reproducible build hashes. Tested against GCC 14 and Clang 19 with hardened stack canary protection. Zero dead links via BitTorrent mesh.', 'VERIFIED RELEASE', 342, 0, 18, 89, '{"fileName":"aetheris-microkernel-x86_64.bin","sha256":"a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496","byteSize":131072,"entropy":6.12,"verdict":"CLEAN","merkleRoot":"a2d2ab5e55249f010203040506070809"}', NULL, NULL, NULL, NULL, 'published', 1756650000000, 0),
('post-video', 'pulse-global', 'genesis-core', 'GUARDIAN', 'Live Demo: 120 FPS Zero-Copy PipeWire & Desktop Duplication Streaming on Ultrawide 32:9', 'Testing hardware-accelerated video streaming with zero telemetry, hardware decoding, and real-time buffer analysis built directly for sovereign P2P networks.', 'TECH DISCUSSION', 489, 0, 31, 142, NULL, '{"src":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"}', NULL, NULL, NULL, 'published', 1756653000000, 0),
('post-poll', 'vault-guides', 'a89104fa2211', 'MODERATOR', 'Community Governance: Prioritizing Q4 Sovereign Protocol Roadmap', 'Every sovereign node holding an Ed25519 identity keypair has exactly 1 cryptographic vote. Vote below to influence the next engineering milestone.', 'ASK COMMUNITY', 276, 0, 14, 48, NULL, NULL, NULL, 'poll-genesis-1', NULL, 'published', 1756645000000, 0),
('post-2', 'vault-guides', 'a89104fa2211', 'MODERATOR', 'Deep-Dive: How ZK-RLN Eradicates Bots without Selling Your Identity to Third-Party KYC', 'Centralized platforms outsource identity verification to third-party brokers, which periodically leak passport scans. In Aetheris, Shamir Secret Processing polynomials are evaluated locally in WebAssembly. You only ever reveal your secret key if you deliberately violate the rate limit by double-posting in the same epoch.', 'SECURITY ADVISORY', 218, 0, 24, 56, NULL, NULL, NULL, NULL, '{"id":"post-1","authorFingerprint":"c3dc28cb705e","authorRole":"ARCHIVIST","title":"Aetheris Cryptographic Micro-Kernel v1.0.0 (Verified x86_64 Release)","content":"Official microkernel distribution compiled with zero telemetry and verified reproducible build hashes."}', 'published', 1756640000000, 1),
('post-images', 'pulse-global', 'f40019bc88a2', 'MEMBER', 'Reverse Engineering: Visual Section Analysis of Obfuscated Malware vs Aetheris Clean Builds', 'Notice how commercial packers (UPX0, Themida) spike entropy into the 7.8-7.9 bit red zone, while clean compilers distribute code entropy evenly across text and rodata sections.', 'TECH DISCUSSION', 194, 0, 8, 39, NULL, NULL, '["https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80"]', NULL, NULL, 'published', 1756635000000, 0);

-- Initial Nanopublications
INSERT OR IGNORE INTO nanopublications (id, channel_id, title, file_name, byte_size, sha256, crc32, entropy, verdict, merkle_root, seeder_count, r2_key, created_at) VALUES
('nano-1', 'vault-releases', 'Aetheris Microkernel v1.0.0 x86_64 Binary', 'aetheris-microkernel-x86_64.bin', 131072, 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496', '94E5A8F1', 6.12, 'CLEAN', 'a2d2ab5e55249f010203040506070809', 14, 'releases/aetheris-microkernel-x86_64.bin', 1756650000000),
('nano-2', 'vault-releases', 'Zero-Knowledge RLN WASM Prover Package', 'zk-rln-wasm-prover.tar.gz', 524288, 'b22ce29fa74619914ccecaebf5e5199710f4b434e81205c4c618e58b403b3507', '83D4F7E2', 7.45, 'CLEAN', 'b3e3bc6f66350a121314151617181920', 9, 'releases/zk-rln-wasm-prover.tar.gz', 1756651200000);

-- Initial Nodes Telemetry
INSERT OR IGNORE INTO nodes_telemetry (id, node_id, name, role, status, latency_ms, merit_score, region, country_code, uptime, bandwidth_mbps, messages_processed, zk_rln_epoch, connections_json, last_heartbeat) VALUES
('node-1', 'node-genesis-fra', 'Genesis Relay Frankfurt', 'validator', 'active', 12.4, 980, 'eu-central', 'DE', 99.99, 1000.0, 142050, 412, '["node-seeder-ams","node-gateway-otp"]', 1756663000000),
('node-2', 'node-seeder-ams', 'Amsterdam BitTorrent Swarm Core', 'storage', 'active', 15.8, 850, 'eu-west', 'NL', 99.95, 2500.0, 89320, 412, '["node-genesis-fra","node-relay-lon"]', 1756663000000),
('node-3', 'node-gateway-otp', 'Bucharest Sovereign Edge Hub', 'gateway', 'active', 8.2, 920, 'eu-east', 'RO', 99.98, 1000.0, 114800, 412, '["node-genesis-fra"]', 1756663000000),
('node-4', 'node-relay-lon', 'London TreeKEM Ratchet Relay', 'relay', 'active', 18.5, 760, 'uk-south', 'GB', 99.90, 500.0, 52100, 412, '["node-seeder-ams"]', 1756663000000);

-- Initial CVE Cache
INSERT OR IGNORE INTO cve_cache (id, cve_id, description, severity, cvss_score, affected_packages_json, published_at, url, cached_at) VALUES
('cve-1', 'CVE-2026-3184', 'Remote memory leak in non-hardened TLS 1.3 key exchange handlers prior to zero-telemetry sanitization', 'HIGH', 7.5, '["openssl<3.3.1","tls-parser<2.1.0"]', 1756500000000, 'https://nvd.nist.gov/vuln/detail/CVE-2026-3184', 1756660000000),
('cve-2', 'CVE-2026-4491', 'Heap buffer overflow vulnerability during untrusted X.509 ASN.1 certificate chain reconstruction', 'CRITICAL', 9.8, '["asn1-codec<1.4.2"]', 1756400000000, 'https://nvd.nist.gov/vuln/detail/CVE-2026-4491', 1756660000000);
