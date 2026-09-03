// ===========================================================================
// AETHERIS OMNI-SPHERE — CLOUDFLARE D1 / KV / R2 STORAGE BINDINGS & FALLBACK ENGINE
// Supports: Cloudflare D1 (SQLite), Cloudflare KV, Cloudflare R2
// Seamless zero-latency fallback to In-Memory Edge Store when bindings are absent.
// ===========================================================================

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Response>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Response {
  success: boolean;
  meta: any;
  error?: string;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: any;
  error?: string;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface KVNamespace {
  get(key: string, options?: any): Promise<string | null>;
  get<T>(key: string, type: 'json'): Promise<T | null>;
  get(key: string, type: 'text'): Promise<string | null>;
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  get(key: string, type: 'stream'): Promise<ReadableStream | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: { expiration?: number; expirationTtl?: number; metadata?: any }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: { name: string; expiration?: number; metadata?: any }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  checksums: any;
  uploaded: Date;
  httpMetadata?: any;
  customMetadata?: Record<string, string>;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

export interface R2Bucket {
  head(key: string): Promise<R2Object | null>;
  get(key: string, options?: any): Promise<R2ObjectBody | null>;
  put(key: string, value: any, options?: any): Promise<R2Object | null>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: any): Promise<{ objects: R2Object[]; truncated: boolean; cursor?: string }>;
}

export interface Env {
  DB?: D1Database;
  AETHERIS_DB?: D1Database;
  KV?: KVNamespace;
  CACHE_KV?: KVNamespace;
  R2?: R2Bucket;
  VAULT_BUCKET?: R2Bucket;
  STORAGE_BUCKET?: R2Bucket;
  [key: string]: any;
}

// ─── DATA MODELS ─────────────────────────────────────────────────────────────

export interface EdgeChannel {
  id: string;
  space: 'relays' | 'vault' | 'pulse';
  name: string;
  description: string;
  isEncrypted: boolean;
  createdAt: number;
}

export interface EdgeMessage {
  id: string;
  channelId: string;
  authorFingerprint: string;
  text: string;
  ciphertext?: string;
  epoch: string;
  status: string;
  signature?: string;
  createdAt: number;
  isMine?: boolean;
}

export interface EdgePost {
  id: string;
  channelId: string;
  authorFingerprint: string;
  authorRole: string;
  title: string;
  content: string;
  flair: 'VERIFIED RELEASE' | 'SECURITY ADVISORY' | 'TECH DISCUSSION' | 'MICRO-PULSE' | 'ASK COMMUNITY' | string;
  status?: 'published' | 'draft' | 'archived' | 'pinned';
  meritVotes: number;
  userVoted?: number;
  replyCount: number;
  boostCount: number;
  attachment?: {
    fileName: string;
    sha256: string;
    byteSize: number;
    entropy: number;
    verdict: string;
    merkleRoot: string;
  };
  video?: {
    src: string;
    poster?: string;
  };
  images?: string[];
  pollId?: string;
  quotedPost?: {
    id: string;
    authorFingerprint: string;
    authorRole: string;
    title: string;
    content: string;
  };
  createdAt: number;
  isExpanded: boolean;
}

export interface EdgeVote {
  id: string;
  targetType: 'post' | 'comment' | 'nanopublication';
  targetId: string;
  userFingerprint: string;
  direction: number; // -1 or 1
  createdAt: number;
}

export interface EdgeNanopublication {
  id: string;
  channelId: string;
  title: string;
  fileName: string;
  byteSize: number;
  sha256: string;
  crc32: string;
  entropy: number;
  verdict: string;
  merkleRoot: string;
  seederCount: number;
  r2Key?: string;
  r2Url?: string;
  createdAt: number;
}

export interface EdgeNodeTelemetry {
  id: string;
  nodeId: string;
  name: string;
  role: 'relay' | 'validator' | 'storage' | 'gateway';
  status: 'active' | 'degraded' | 'syncing';
  latencyMs: number;
  meritScore: number;
  region: string;
  countryCode: string;
  uptime: number;
  bandwidthMbps: number;
  messagesProcessed: number;
  zkRlnEpoch: number;
  connections: string[];
  lastHeartbeat: number;
}

export interface EdgeCVECache {
  id: string;
  cveId: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvssScore: number;
  affectedPackages: string[];
  publishedAt: number;
  url: string;
  cachedAt: number;
}

export interface EdgePushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  fingerprint?: string;
  createdAt: number;
}

// ─── INITIAL IN-MEMORY SEEDS ─────────────────────────────────────────────────

export const INITIAL_CHANNELS: EdgeChannel[] = [
  { id: 'relays-general', space: 'relays', name: 'general', description: 'Sovereign E2EE live voice & text', isEncrypted: true, createdAt: 1756600000000 },
  { id: 'relays-dev', space: 'relays', name: 'dev-core', description: 'Core cryptography & low-level discussions', isEncrypted: true, createdAt: 1756600000000 },
  { id: 'vault-releases', space: 'vault', name: 'releases', description: 'Verified software releases & clean binaries', isEncrypted: false, createdAt: 1756600000000 },
  { id: 'vault-guides', space: 'vault', name: 'security-guides', description: 'In-depth research, reversing & operational security', isEncrypted: false, createdAt: 1756600000000 },
  { id: 'pulse-global', space: 'pulse', name: 'chrono-feed', description: 'Uncensored chronological sovereign microblogging', isEncrypted: false, createdAt: 1756600000000 },
];

export const INITIAL_MESSAGES: EdgeMessage[] = [
  {
    id: 'msg-1',
    channelId: 'relays-general',
    authorFingerprint: 'genesis-core',
    text: 'Welcome to the Sovereign E2EE Live Relay. All communications in this matrix are quantum-ratcheted via MLS TreeKEM and authenticated with Zero-Knowledge RLN.',
    ciphertext: 'Welcome to the Sovereign E2EE Live Relay. All communications in this matrix are quantum-ratcheted via MLS TreeKEM and authenticated with Zero-Knowledge RLN.',
    epoch: '#412',
    status: 'verified',
    createdAt: 1756660000000,
    isMine: false,
  },
  {
    id: 'msg-2',
    channelId: 'relays-general',
    authorFingerprint: 'c3dc28cb705e',
    text: 'The BitTorrent Merkle pieces for Micro-Kernel v1.0.0 have fully propagated across all 14 seeder nodes. 100% byte-match verified.',
    ciphertext: 'The BitTorrent Merkle pieces for Micro-Kernel v1.0.0 have fully propagated across all 14 seeder nodes. 100% byte-match verified.',
    epoch: '#412',
    status: 'verified',
    createdAt: 1756661500000,
    isMine: false,
  },
  {
    id: 'msg-3',
    channelId: 'relays-general',
    authorFingerprint: 'a89104fa2211',
    text: 'Confirmed. Zero packet loss over WebRTC DTLS direct tunnels. Latency stable at 14ms.',
    ciphertext: 'Confirmed. Zero packet loss over WebRTC DTLS direct tunnels. Latency stable at 14ms.',
    epoch: '#412',
    status: 'verified',
    createdAt: 1756662400000,
    isMine: false,
  },
  {
    id: 'msg-dev-1',
    channelId: 'relays-dev',
    authorFingerprint: 'genesis-core',
    text: 'Core dev update: Post-Quantum Kyber-1024 Key Encapsulation test vectors integrated into MLS ratchet loop.',
    ciphertext: 'Core dev update: Post-Quantum Kyber-1024 Key Encapsulation test vectors integrated into MLS ratchet loop.',
    epoch: '#412',
    status: 'verified',
    createdAt: 1756662800000,
    isMine: false,
  },
];

export const INITIAL_POSTS: EdgePost[] = [
  {
    id: 'post-1',
    channelId: 'vault-releases',
    authorFingerprint: 'c3dc28cb705e',
    authorRole: 'ARCHIVIST',
    title: 'Aetheris Cryptographic Micro-Kernel v1.0.0 (Verified x86_64 Release)',
    content:
      'Official microkernel distribution compiled with zero telemetry and verified reproducible build hashes. Tested against GCC 14 and Clang 19 with hardened stack canary protection. Zero dead links via BitTorrent mesh.',
    flair: 'VERIFIED RELEASE',
    status: 'published',
    meritVotes: 342,
    userVoted: 0,
    replyCount: 18,
    boostCount: 89,
    attachment: {
      fileName: 'aetheris-microkernel-x86_64.bin',
      sha256: 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496',
      byteSize: 131072,
      entropy: 6.12,
      verdict: 'CLEAN',
      merkleRoot: 'a2d2ab5e55249f010203040506070809',
    },
    createdAt: 1756650000000,
    isExpanded: false,
  },
  {
    id: 'post-video',
    channelId: 'pulse-global',
    authorFingerprint: 'genesis-core',
    authorRole: 'GUARDIAN',
    title: 'Live Demo: 120 FPS Zero-Copy PipeWire & Desktop Duplication Streaming on Ultrawide 32:9',
    content:
      'Testing hardware-accelerated video streaming with zero telemetry, hardware decoding, and real-time buffer analysis built directly for sovereign P2P networks.',
    flair: 'TECH DISCUSSION',
    status: 'published',
    meritVotes: 489,
    userVoted: 0,
    replyCount: 31,
    boostCount: 142,
    video: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    },
    createdAt: 1756653000000,
    isExpanded: false,
  },
  {
    id: 'post-poll',
    channelId: 'vault-guides',
    authorFingerprint: 'a89104fa2211',
    authorRole: 'MODERATOR',
    title: 'Community Governance: Prioritizing Q4 Sovereign Protocol Roadmap',
    content:
      'Every sovereign node holding an Ed25519 identity keypair has exactly 1 cryptographic vote. Vote below to influence the next engineering milestone.',
    flair: 'ASK COMMUNITY',
    status: 'published',
    meritVotes: 276,
    userVoted: 0,
    replyCount: 14,
    boostCount: 48,
    pollId: 'poll-genesis-1',
    createdAt: 1756645000000,
    isExpanded: false,
  },
  {
    id: 'post-2',
    channelId: 'vault-guides',
    authorFingerprint: 'a89104fa2211',
    authorRole: 'MODERATOR',
    title: 'Deep-Dive: How ZK-RLN Eradicates Bots without Selling Your Identity to Third-Party KYC',
    content:
      'Centralized platforms outsource identity verification to third-party brokers, which periodically leak passport scans. In Aetheris, Shamir Secret Processing polynomials are evaluated locally in WebAssembly. You only ever reveal your secret key if you deliberately violate the rate limit by double-posting in the same epoch.',
    flair: 'SECURITY ADVISORY',
    status: 'published',
    meritVotes: 218,
    userVoted: 0,
    replyCount: 24,
    boostCount: 56,
    quotedPost: {
      id: 'post-1',
      authorFingerprint: 'c3dc28cb705e',
      authorRole: 'ARCHIVIST',
      title: 'Aetheris Cryptographic Micro-Kernel v1.0.0 (Verified x86_64 Release)',
      content:
        'Official microkernel distribution compiled with zero telemetry and verified reproducible build hashes.',
    },
    createdAt: 1756640000000,
    isExpanded: true,
  },
  {
    id: 'post-images',
    channelId: 'pulse-global',
    authorFingerprint: 'f40019bc88a2',
    authorRole: 'MEMBER',
    title: 'Reverse Engineering: Visual Section Analysis of Obfuscated Malware vs Aetheris Clean Builds',
    content:
      'Notice how commercial packers (UPX0, Themida) spike entropy into the 7.8-7.9 bit red zone, while clean compilers distribute code entropy evenly across text and rodata sections.',
    flair: 'TECH DISCUSSION',
    status: 'published',
    meritVotes: 194,
    userVoted: 0,
    replyCount: 8,
    boostCount: 39,
    images: [
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
    ],
    createdAt: 1756635000000,
    isExpanded: false,
  },
];

export const INITIAL_NANOPUBLICATIONS: EdgeNanopublication[] = [
  {
    id: 'nano-1',
    channelId: 'vault-releases',
    title: 'Aetheris Microkernel v1.0.0 x86_64 Binary',
    fileName: 'aetheris-microkernel-x86_64.bin',
    byteSize: 131072,
    sha256: 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496',
    crc32: '94E5A8F1',
    entropy: 6.12,
    verdict: 'CLEAN',
    merkleRoot: 'a2d2ab5e55249f010203040506070809',
    seederCount: 14,
    r2Key: 'releases/aetheris-microkernel-x86_64.bin',
    createdAt: 1756650000000,
  },
  {
    id: 'nano-2',
    channelId: 'vault-releases',
    title: 'Zero-Knowledge RLN WASM Prover Package',
    fileName: 'zk-rln-wasm-prover.tar.gz',
    byteSize: 524288,
    sha256: 'b22ce29fa74619914ccecaebf5e5199710f4b434e81205c4c618e58b403b3507',
    crc32: '83D4F7E2',
    entropy: 7.45,
    verdict: 'CLEAN',
    merkleRoot: 'b3e3bc6f66350a121314151617181920',
    seederCount: 9,
    r2Key: 'releases/zk-rln-wasm-prover.tar.gz',
    createdAt: 1756651200000,
  },
];

export const INITIAL_NODES: EdgeNodeTelemetry[] = [
  {
    id: 'node-1',
    nodeId: 'node-genesis-fra',
    name: 'Genesis Relay Frankfurt',
    role: 'validator',
    status: 'active',
    latencyMs: 12.4,
    meritScore: 980,
    region: 'eu-central',
    countryCode: 'DE',
    uptime: 99.99,
    bandwidthMbps: 1000.0,
    messagesProcessed: 142050,
    zkRlnEpoch: 412,
    connections: ['node-seeder-ams', 'node-gateway-otp'],
    lastHeartbeat: 1756663000000,
  },
  {
    id: 'node-2',
    nodeId: 'node-seeder-ams',
    name: 'Amsterdam BitTorrent Swarm Core',
    role: 'storage',
    status: 'active',
    latencyMs: 15.8,
    meritScore: 850,
    region: 'eu-west',
    countryCode: 'NL',
    uptime: 99.95,
    bandwidthMbps: 2500.0,
    messagesProcessed: 89320,
    zkRlnEpoch: 412,
    connections: ['node-genesis-fra', 'node-relay-lon'],
    lastHeartbeat: 1756663000000,
  },
  {
    id: 'node-3',
    nodeId: 'node-gateway-otp',
    name: 'Bucharest Sovereign Edge Hub',
    role: 'gateway',
    status: 'active',
    latencyMs: 8.2,
    meritScore: 920,
    region: 'eu-east',
    countryCode: 'RO',
    uptime: 99.98,
    bandwidthMbps: 1000.0,
    messagesProcessed: 114800,
    zkRlnEpoch: 412,
    connections: ['node-genesis-fra'],
    lastHeartbeat: 1756663000000,
  },
  {
    id: 'node-4',
    nodeId: 'node-relay-lon',
    name: 'London TreeKEM Ratchet Relay',
    role: 'relay',
    status: 'active',
    latencyMs: 18.5,
    meritScore: 760,
    region: 'uk-south',
    countryCode: 'GB',
    uptime: 99.90,
    bandwidthMbps: 500.0,
    messagesProcessed: 52100,
    zkRlnEpoch: 412,
    connections: ['node-seeder-ams'],
    lastHeartbeat: 1756663000000,
  },
];

// ─── GLOBAL ISOLATE IN-MEMORY STORES (PERSISTENT PER ISOLATE LIFETIME) ───────

export const globalChannelsStore: EdgeChannel[] = [...INITIAL_CHANNELS];
export const globalMessagesStore: EdgeMessage[] = [...INITIAL_MESSAGES];
export const globalPostsStore: EdgePost[] = [...INITIAL_POSTS];
export const globalNanopublicationsStore: EdgeNanopublication[] = [...INITIAL_NANOPUBLICATIONS];
export const globalNodesTelemetryStore: EdgeNodeTelemetry[] = [...INITIAL_NODES];
export const globalVotesStore: EdgeVote[] = [];
export const globalPushSubscriptionsStore: EdgePushSubscription[] = [];
export const globalSpentNullifiers: Set<string> = new Set();

// Server start epoch for uptime calculation
export const EDGE_START_TIME = Date.now();
export let TOTAL_MESSAGES_COUNTER = INITIAL_MESSAGES.length + 1000;

export function incrementMessageCounter() {
  TOTAL_MESSAGES_COUNTER++;
}

// ─── HELPER FUNCTIONS: CLOUDFLARE BINDINGS EXTRACTION ────────────────────────

export function getD1Database(env?: Env): D1Database | null {
  if (!env) return null;
  return env.DB || env.AETHERIS_DB || null;
}

export function getKVStore(env?: Env): KVNamespace | null {
  if (!env) return null;
  return env.KV || env.CACHE_KV || null;
}

export function getR2Bucket(env?: Env): R2Bucket | null {
  if (!env) return null;
  return env.VAULT_BUCKET || env.R2 || env.STORAGE_BUCKET || null;
}
