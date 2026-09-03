-- ===========================================================================
-- AETHERIS OMNI-SPHERE — CLOUDFLARE D1 DATABASE SCHEMA
-- Target: Cloudflare D1 SQLite Engine
-- Tables: channels, messages, posts, votes, nanopublications, nodes_telemetry, cve_cache
-- ===========================================================================

-- 1. CHANNELS TABLE
CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    space TEXT NOT NULL CHECK(space IN ('relays', 'vault', 'pulse')),
    name TEXT NOT NULL,
    description TEXT,
    isEncrypted INTEGER NOT NULL DEFAULT 0,
    is_encrypted INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_channels_space ON channels(space);
CREATE INDEX IF NOT EXISTS idx_channels_createdAt ON channels(createdAt ASC);

-- 2. MESSAGES TABLE (E2EE Chat & Relay Feed)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    channelId TEXT NOT NULL,
    channel_id TEXT,
    authorFingerprint TEXT NOT NULL,
    author_fingerprint TEXT,
    text TEXT,
    ciphertext TEXT NOT NULL,
    epoch TEXT DEFAULT '#1',
    status TEXT DEFAULT 'verified',
    signature TEXT,
    createdAt INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(channelId) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_channelId_createdAt ON messages(channelId, createdAt ASC);
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_authorFingerprint ON messages(authorFingerprint);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- 3. POSTS TABLE (Chronostream Microblog & Articles)
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    channelId TEXT NOT NULL,
    channel_id TEXT,
    authorFingerprint TEXT NOT NULL,
    author_fingerprint TEXT,
    authorRole TEXT NOT NULL DEFAULT 'MEMBER',
    author_role TEXT NOT NULL DEFAULT 'MEMBER',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    flair TEXT NOT NULL DEFAULT 'TECH DISCUSSION',
    meritVotes INTEGER NOT NULL DEFAULT 0,
    merit_votes INTEGER NOT NULL DEFAULT 0,
    userVoted INTEGER NOT NULL DEFAULT 0,
    user_voted INTEGER NOT NULL DEFAULT 0,
    replyCount INTEGER NOT NULL DEFAULT 0,
    reply_count INTEGER NOT NULL DEFAULT 0,
    boostCount INTEGER NOT NULL DEFAULT 0,
    boost_count INTEGER NOT NULL DEFAULT 0,
    attachment_json TEXT,
    video_json TEXT,
    images_json TEXT,
    pollId TEXT,
    poll_id TEXT,
    quotedPost_json TEXT,
    quoted_post_json TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published', 'draft', 'archived', 'pinned')),
    createdAt INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    isExpanded INTEGER NOT NULL DEFAULT 0,
    is_expanded INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_posts_status_merit ON posts(status, meritVotes DESC, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_posts_channelId ON posts(channelId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_posts_meritVotes ON posts(meritVotes DESC);
CREATE INDEX IF NOT EXISTS idx_posts_flair ON posts(flair);

-- 4. VOTES TABLE (Merit / Karma Ledger)
CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    targetType TEXT NOT NULL CHECK(targetType IN ('post', 'comment', 'nanopublication')),
    target_type TEXT,
    targetId TEXT NOT NULL,
    target_id TEXT,
    userFingerprint TEXT NOT NULL,
    user_fingerprint TEXT,
    direction INTEGER NOT NULL CHECK(direction IN (-1, 1)),
    createdAt INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(targetType, targetId, userFingerprint)
);

CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(targetId, targetType);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(userFingerprint);

-- 5. NANOPUBLICATIONS TABLE (Verified Cryptographic Artifacts & Manifests)
CREATE TABLE IF NOT EXISTS nanopublications (
    id TEXT PRIMARY KEY,
    channelId TEXT NOT NULL,
    channel_id TEXT,
    title TEXT NOT NULL,
    fileName TEXT NOT NULL,
    file_name TEXT,
    byteSize INTEGER NOT NULL DEFAULT 0,
    byte_size INTEGER DEFAULT 0,
    sha256 TEXT NOT NULL,
    crc32 TEXT,
    entropy REAL NOT NULL DEFAULT 0.0,
    verdict TEXT NOT NULL DEFAULT 'CLEAN',
    merkleRoot TEXT NOT NULL,
    merkle_root TEXT,
    seederCount INTEGER NOT NULL DEFAULT 1,
    seeder_count INTEGER DEFAULT 1,
    r2Key TEXT,
    r2_key TEXT,
    createdAt INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nanopubs_channelId ON nanopublications(channelId);
CREATE INDEX IF NOT EXISTS idx_nanopubs_sha256 ON nanopublications(sha256);
CREATE INDEX IF NOT EXISTS idx_nanopubs_createdAt ON nanopublications(createdAt DESC);

-- 6. NODES_TELEMETRY TABLE (P2P Network Observatory & Mesh Metrics)
CREATE TABLE IF NOT EXISTS nodes_telemetry (
    id TEXT PRIMARY KEY,
    nodeId TEXT NOT NULL UNIQUE,
    node_id TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'relay',
    status TEXT NOT NULL DEFAULT 'active',
    latencyMs REAL NOT NULL DEFAULT 15.0,
    latency_ms REAL DEFAULT 15.0,
    meritScore INTEGER NOT NULL DEFAULT 100,
    merit_score INTEGER DEFAULT 100,
    region TEXT DEFAULT 'GLOBAL',
    countryCode TEXT DEFAULT 'XX',
    country_code TEXT DEFAULT 'XX',
    uptime REAL NOT NULL DEFAULT 99.9,
    bandwidthMbps REAL NOT NULL DEFAULT 100.0,
    bandwidth_mbps REAL DEFAULT 100.0,
    messagesProcessed INTEGER NOT NULL DEFAULT 0,
    messages_processed INTEGER DEFAULT 0,
    zkRlnEpoch INTEGER NOT NULL DEFAULT 1,
    zk_rln_epoch INTEGER DEFAULT 1,
    connections_json TEXT,
    lastHeartbeat INTEGER NOT NULL,
    last_heartbeat INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes_telemetry(status);
CREATE INDEX IF NOT EXISTS idx_nodes_lastHeartbeat ON nodes_telemetry(lastHeartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_nodes_meritScore ON nodes_telemetry(meritScore DESC);

-- 7. CVE_CACHE TABLE (NIST NVD & Sovereign Security Vulnerability Mirror)
CREATE TABLE IF NOT EXISTS cve_cache (
    id TEXT PRIMARY KEY,
    cveId TEXT NOT NULL UNIQUE,
    cve_id TEXT,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    cvssScore REAL NOT NULL,
    cvss_score REAL,
    affectedPackages_json TEXT NOT NULL,
    affected_packages_json TEXT,
    publishedAt INTEGER NOT NULL,
    published_at INTEGER,
    url TEXT NOT NULL,
    cachedAt INTEGER NOT NULL,
    cached_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cve_severity ON cve_cache(severity);
CREATE INDEX IF NOT EXISTS idx_cve_publishedAt ON cve_cache(publishedAt DESC);

-- 8. PUSH_SUBSCRIPTIONS TABLE (Zero-Tracking Sovereign Web Push VAPID Registry)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    fingerprint TEXT,
    createdAt INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_fingerprint ON push_subscriptions(fingerprint);

-- ===========================================================================
-- SEED INITIAL DATA (Idempotent INSERT OR IGNORE)
-- ===========================================================================

-- Channels
INSERT OR IGNORE INTO channels (id, space, name, description, isEncrypted, is_encrypted, createdAt, created_at) VALUES
('relays-general', 'relays', 'general', 'Sovereign E2EE live voice & text', 1, 1, 1756600000000, 1756600000000),
('relays-dev', 'relays', 'dev-core', 'Core cryptography & low-level discussions', 1, 1, 1756600000000, 1756600000000),
('vault-releases', 'vault', 'releases', 'Verified software releases & clean binaries', 0, 0, 1756600000000, 1756600000000),
('vault-guides', 'vault', 'security-guides', 'In-depth research, reversing & operational security', 0, 0, 1756600000000, 1756600000000),
('pulse-global', 'pulse', 'chrono-feed', 'Uncensored chronological sovereign microblogging', 0, 0, 1756600000000, 1756600000000);

-- Initial Messages
INSERT OR IGNORE INTO messages (id, channelId, channel_id, authorFingerprint, author_fingerprint, text, ciphertext, epoch, status, signature, createdAt, created_at) VALUES
('msg-1', 'relays-general', 'relays-general', 'genesis-core', 'genesis-core', 'Welcome to the Sovereign E2EE Live Relay. All communications in this matrix are quantum-ratcheted via MLS TreeKEM and authenticated with Zero-Knowledge RLN.', 'Welcome to the Sovereign E2EE Live Relay. All communications in this matrix are quantum-ratcheted via MLS TreeKEM and authenticated with Zero-Knowledge RLN.', '#412', 'verified', 'sig_genesis_01', 1756660000000, 1756660000000),
('msg-2', 'relays-general', 'relays-general', 'c3dc28cb705e', 'c3dc28cb705e', 'The BitTorrent Merkle pieces for Micro-Kernel v1.0.0 have fully propagated across all 14 seeder nodes. 100% byte-match verified.', 'The BitTorrent Merkle pieces for Micro-Kernel v1.0.0 have fully propagated across all 14 seeder nodes. 100% byte-match verified.', '#412', 'verified', 'sig_archivist_02', 1756661500000, 1756661500000),
('msg-3', 'relays-general', 'relays-general', 'a89104fa2211', 'a89104fa2211', 'Confirmed. Zero packet loss over WebRTC DTLS direct tunnels. Latency stable at 14ms.', 'Confirmed. Zero packet loss over WebRTC DTLS direct tunnels. Latency stable at 14ms.', '#412', 'verified', 'sig_mod_03', 1756662400000, 1756662400000),
('msg-dev-1', 'relays-dev', 'relays-dev', 'genesis-core', 'genesis-core', 'Core dev update: Post-Quantum Kyber-1024 Key Encapsulation test vectors integrated into MLS ratchet loop.', 'Core dev update: Post-Quantum Kyber-1024 Key Encapsulation test vectors integrated into MLS ratchet loop.', '#412', 'verified', 'sig_genesis_dev_01', 1756662800000, 1756662800000);

-- Initial Posts
INSERT OR IGNORE INTO posts (id, channelId, channel_id, authorFingerprint, author_fingerprint, authorRole, author_role, title, content, flair, meritVotes, merit_votes, userVoted, user_voted, replyCount, reply_count, boostCount, boost_count, attachment_json, video_json, images_json, pollId, poll_id, quotedPost_json, quoted_post_json, status, createdAt, created_at, isExpanded, is_expanded) VALUES
('post-1', 'vault-releases', 'vault-releases', 'c3dc28cb705e', 'c3dc28cb705e', 'ARCHIVIST', 'ARCHIVIST', 'Aetheris Cryptographic Micro-Kernel v1.0.0 (Verified x86_64 Release)', 'Official microkernel distribution compiled with zero telemetry and verified reproducible build hashes. Tested against GCC 14 and Clang 19 with hardened stack canary protection. Zero dead links via BitTorrent mesh.', 'VERIFIED RELEASE', 342, 342, 0, 0, 18, 18, 89, 89, '{"fileName":"aetheris-microkernel-x86_64.bin","sha256":"a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496","byteSize":131072,"entropy":6.12,"verdict":"CLEAN","merkleRoot":"a2d2ab5e55249f010203040506070809"}', NULL, NULL, NULL, NULL, NULL, NULL, 'published', 1756650000000, 1756650000000, 0, 0),
('post-video', 'pulse-global', 'pulse-global', 'genesis-core', 'genesis-core', 'GUARDIAN', 'GUARDIAN', 'Live Demo: 120 FPS Zero-Copy PipeWire & Desktop Duplication Streaming on Ultrawide 32:9', 'Testing hardware-accelerated video streaming with zero telemetry, hardware decoding, and real-time buffer analysis built directly for sovereign P2P networks.', 'TECH DISCUSSION', 489, 489, 0, 0, 31, 31, 142, 142, NULL, '{"src":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"}', NULL, NULL, NULL, NULL, NULL, 'published', 1756653000000, 1756653000000, 0, 0),
('post-poll', 'vault-guides', 'vault-guides', 'a89104fa2211', 'a89104fa2211', 'MODERATOR', 'MODERATOR', 'Community Governance: Prioritizing Q4 Sovereign Protocol Roadmap', 'Every sovereign node holding an Ed25519 identity keypair has exactly 1 cryptographic vote. Vote below to influence the next engineering milestone.', 'ASK COMMUNITY', 276, 276, 0, 0, 14, 14, 48, 48, NULL, NULL, NULL, 'poll-genesis-1', 'poll-genesis-1', NULL, NULL, 'published', 1756645000000, 1756645000000, 0, 0),
('post-2', 'vault-guides', 'vault-guides', 'a89104fa2211', 'a89104fa2211', 'MODERATOR', 'MODERATOR', 'Deep-Dive: How ZK-RLN Eradicates Bots without Selling Your Identity to Third-Party KYC', 'Centralized platforms outsource identity verification to third-party brokers, which periodically leak passport scans. In Aetheris, Shamir Secret Processing polynomials are evaluated locally in WebAssembly. You only ever reveal your secret key if you deliberately violate the rate limit by double-posting in the same epoch.', 'SECURITY ADVISORY', 218, 218, 0, 0, 24, 24, 56, 56, NULL, NULL, NULL, NULL, NULL, '{"id":"post-1","authorFingerprint":"c3dc28cb705e","authorRole":"ARCHIVIST","title":"Aetheris Cryptographic Micro-Kernel v1.0.0 (Verified x86_64 Release)","content":"Official microkernel distribution compiled with zero telemetry and verified reproducible build hashes."}', '{"id":"post-1","authorFingerprint":"c3dc28cb705e","authorRole":"ARCHIVIST","title":"Aetheris Cryptographic Micro-Kernel v1.0.0 (Verified x86_64 Release)","content":"Official microkernel distribution compiled with zero telemetry and verified reproducible build hashes."}', 'published', 1756640000000, 1756640000000, 1, 1),
('post-images', 'pulse-global', 'pulse-global', 'f40019bc88a2', 'f40019bc88a2', 'MEMBER', 'MEMBER', 'Reverse Engineering: Visual Section Analysis of Obfuscated Malware vs Aetheris Clean Builds', 'Notice how commercial packers (UPX0, Themida) spike entropy into the 7.8-7.9 bit red zone, while clean compilers distribute code entropy evenly across text and rodata sections.', 'TECH DISCUSSION', 194, 194, 0, 0, 8, 8, 39, 39, NULL, NULL, '["https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80"]', NULL, NULL, NULL, NULL, 'published', 1756635000000, 1756635000000, 0, 0);

-- Initial Nanopublications
INSERT OR IGNORE INTO nanopublications (id, channelId, channel_id, title, fileName, file_name, byteSize, byte_size, sha256, crc32, entropy, verdict, merkleRoot, merkle_root, seederCount, seeder_count, r2Key, r2_key, createdAt, created_at) VALUES
('nano-1', 'vault-releases', 'vault-releases', 'Aetheris Microkernel v1.0.0 x86_64 Binary', 'aetheris-microkernel-x86_64.bin', 'aetheris-microkernel-x86_64.bin', 131072, 131072, 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496', '94E5A8F1', 6.12, 'CLEAN', 'a2d2ab5e55249f010203040506070809', 'a2d2ab5e55249f010203040506070809', 14, 14, 'releases/aetheris-microkernel-x86_64.bin', 'releases/aetheris-microkernel-x86_64.bin', 1756650000000, 1756650000000),
('nano-2', 'vault-releases', 'vault-releases', 'Zero-Knowledge RLN WASM Prover Package', 'zk-rln-wasm-prover.tar.gz', 'zk-rln-wasm-prover.tar.gz', 524288, 524288, 'b22ce29fa74619914ccecaebf5e5199710f4b434e81205c4c618e58b403b3507', '83D4F7E2', 7.45, 'CLEAN', 'b3e3bc6f66350a121314151617181920', 'b3e3bc6f66350a121314151617181920', 9, 9, 'releases/zk-rln-wasm-prover.tar.gz', 'releases/zk-rln-wasm-prover.tar.gz', 1756651200000, 1756651200000);

-- Initial Nodes Telemetry
INSERT OR IGNORE INTO nodes_telemetry (id, nodeId, node_id, name, role, status, latencyMs, latency_ms, meritScore, merit_score, region, countryCode, country_code, uptime, bandwidthMbps, bandwidth_mbps, messagesProcessed, messages_processed, zkRlnEpoch, zk_rln_epoch, connections_json, lastHeartbeat, last_heartbeat) VALUES
('node-1', 'node-genesis-fra', 'node-genesis-fra', 'Genesis Relay Frankfurt', 'validator', 'active', 12.4, 12.4, 980, 980, 'eu-central', 'DE', 'DE', 99.99, 1000.0, 1000.0, 142050, 142050, 412, 412, '["node-seeder-ams","node-gateway-otp"]', 1756663000000, 1756663000000),
('node-2', 'node-seeder-ams', 'node-seeder-ams', 'Amsterdam BitTorrent Swarm Core', 'storage', 'active', 15.8, 15.8, 850, 850, 'eu-west', 'NL', 'NL', 99.95, 2500.0, 2500.0, 89320, 89320, 412, 412, '["node-genesis-fra","node-relay-lon"]', 1756663000000, 1756663000000),
('node-3', 'node-gateway-otp', 'node-gateway-otp', 'Bucharest Sovereign Edge Hub', 'gateway', 'active', 8.2, 8.2, 920, 920, 'eu-east', 'RO', 'RO', 99.98, 1000.0, 1000.0, 114800, 114800, 412, 412, '["node-genesis-fra"]', 1756663000000, 1756663000000),
('node-4', 'node-relay-lon', 'node-relay-lon', 'London TreeKEM Ratchet Relay', 'relay', 'active', 18.5, 18.5, 760, 760, 'uk-south', 'GB', 'GB', 99.90, 500.0, 500.0, 52100, 52100, 412, 412, '["node-seeder-ams"]', 1756663000000, 1756663000000);

-- Initial CVE Cache
INSERT OR IGNORE INTO cve_cache (id, cveId, cve_id, description, severity, cvssScore, cvss_score, affectedPackages_json, affected_packages_json, publishedAt, published_at, url, cachedAt, cached_at) VALUES
('cve-1', 'CVE-2026-3184', 'CVE-2026-3184', 'Remote memory leak in non-hardened TLS 1.3 key exchange handlers prior to zero-telemetry sanitization', 'HIGH', 7.5, 7.5, '["openssl<3.3.1","tls-parser<2.1.0"]', '["openssl<3.3.1","tls-parser<2.1.0"]', 1756500000000, 1756500000000, 'https://nvd.nist.gov/vuln/detail/CVE-2026-3184', 1756660000000, 1756660000000),
('cve-2', 'CVE-2026-4491', 'CVE-2026-4491', 'Heap buffer overflow vulnerability during untrusted X.509 ASN.1 certificate chain reconstruction', 'CRITICAL', 9.8, 9.8, '["asn1-codec<1.4.2"]', '["asn1-codec<1.4.2"]', 1756400000000, 1756400000000, 'https://nvd.nist.gov/vuln/detail/CVE-2026-4491', 1756660000000, 1756660000000);
