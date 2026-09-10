// ===========================================================================
// UREfy — CLOUDFLARE D1 / KV / R2 STORAGE BINDINGS & FALLBACK ENGINE
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
  latencyMs: number | null;
  meritScore: number;
  region: string | null;
  countryCode: string | null;
  uptime: number | null;
  bandwidthMbps: number;
  messagesProcessed: number;
  zkRlnEpoch: number | null;
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

// ─── INITIAL IN-MEMORY SEEDS (CLEAN RUNTIME DEFAULTS) ────────────────────────
import {
  INITIAL_CHANNELS as DEV_CHANNELS,
  INITIAL_MESSAGES as DEV_MESSAGES,
  INITIAL_POSTS as DEV_POSTS,
  INITIAL_NANOPUBLICATIONS as DEV_NANOPUBLICATIONS,
  INITIAL_NODES as DEV_NODES,
} from './_dev-fixtures.js';

// Default runtime state exports are clean empty arrays
export const INITIAL_CHANNELS: EdgeChannel[] = [];
export const INITIAL_MESSAGES: EdgeMessage[] = [];
export const INITIAL_POSTS: EdgePost[] = [];
export const INITIAL_NANOPUBLICATIONS: EdgeNanopublication[] = [];
export const INITIAL_NODES: EdgeNodeTelemetry[] = [];

// ─── GLOBAL ISOLATE IN-MEMORY STORES (PERSISTENT PER ISOLATE LIFETIME) ───────
// In production runtime, stores are initialized empty.
// In non-production/test runtime, they are populated with initial dev fixtures.

const isProductionRuntime =
  typeof process !== 'undefined' &&
  (process.env?.NODE_ENV === 'production' || process.env?.ENVIRONMENT === 'production');

export const globalChannelsStore: EdgeChannel[] = isProductionRuntime ? [] : [...DEV_CHANNELS];
export const globalMessagesStore: EdgeMessage[] = isProductionRuntime ? [] : [...DEV_MESSAGES];
export const globalPostsStore: EdgePost[] = isProductionRuntime ? [] : [...DEV_POSTS];
export const globalNanopublicationsStore: EdgeNanopublication[] = isProductionRuntime ? [] : [...DEV_NANOPUBLICATIONS];
export const globalNodesTelemetryStore: EdgeNodeTelemetry[] = isProductionRuntime ? [] : [...DEV_NODES];
export const globalVotesStore: EdgeVote[] = [];
export const globalPushSubscriptionsStore: EdgePushSubscription[] = [];
export const globalSpentNullifiers: Set<string> = new Set();

// Server start epoch for uptime calculation
export const EDGE_START_TIME = Date.now();
export let TOTAL_MESSAGES_COUNTER = isProductionRuntime ? 0 : DEV_MESSAGES.length + 1000;

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

export function isProductionEnv(env?: Env): boolean {
  return env?.ENVIRONMENT === 'production' || env?.NODE_ENV === 'production';
}

export function createD1UnavailableResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'D1 Database unavailable. In-memory fallback is disabled in production.',
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '5',
      },
    }
  );
}
