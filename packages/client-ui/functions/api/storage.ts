// ===========================================================================
// UREfy — CLOUDFLARE R2 & EDGE VAULT STORAGE ENGINE
// Supports: Cloudflare R2 (Object Storage: env.VAULT_BUCKET or env.R2).
//           In production, all storage persistence requires Cloudflare R2 (fails closed).
//           In-memory storage is strictly a development/test fixture fallback.
//           Zero-Overage Quota Guardian (In-Flight Telemetry Safety Protection),
//           Directory Listing Caching (60s Class A Saver),
//           SHA-256 Deduplication (Zero-Overage Storage & Class A Saver),
//           CDN Immutable Caching & 304 Not Modified (Class B Saver),
//           RAM Cache for Small Objects (< 2 MB),
//           Cryptographic Merkle Root Generation, HTTP/3 Streaming & Quota Telemetry.
// ===========================================================================

import {
  Env,
  R2Bucket,
  R2Object,
  R2ObjectBody,
  getR2Bucket,
  getD1Database,
  getKVStore,
  isProductionEnv,
} from './_db.js';
import { requireAdmin, requireOwnership, requireSignedEnvelope } from './_auth.js';
import { allocateStorage, releaseStorage, getAccountStorage, storageLimits, validateUploadMime } from './_storage-accounting.js';

export interface StorageMetadata {
  sha256: string;
  merkleRoot: string;
  author: string;
  title: string;
  fileName: string;
  byteSize: number;
  uploadedAt: number;
  contentType: string;
  [key: string]: any;
}

export interface StoredBinaryObject {
  key: string;
  data: Uint8Array;
  contentType: string;
  customMetadata: Record<string, string>;
  size: number;
  sha256: string;
  merkleRoot: string;
  uploadedAt: number;
  storage?: 'Cloudflare-R2' | 'Edge-Isolate-Memory';
}

export interface StorageUploadResult {
  success: boolean;
  key: string;
  fileName: string;
  byteSize: number;
  sha256: string;
  merkleRoot: string;
  author: string;
  title: string;
  contentType: string;
  downloadUrl: string;
  /**
   * Storage backend used to persist object.
   * In production, storage is strictly 'Cloudflare-R2'.
   * 'Edge-Isolate-Memory' is permitted solely in non-production/test environments.
   */
  storage: 'Cloudflare-R2' | 'Edge-Isolate-Memory';
  uploadedAt: number;
  deduplicated?: boolean;
}

// ─── CLOUDFLARE R2 ZERO-OVERAGE QUOTA GUARDIAN INVARIANTS ───────────────────
// ADVISORY / TELEMETRY ONLY:
// These counters track estimated in-flight and isolate-level operations to protect
// the application against runaway loops. They are advisory safety ceilings, NOT
// authoritative Cloudflare billing metrics or authoritative account quota usage.
//
// Cloudflare Free Tier Reference Limits:
// - Storage: 10 GB / month free. Advisory safe limit: 8.0 GB (leaves 2.0 GB safety margin).
// - Class A operations (writes, lists, deletes): 1,000,000 ops / month free. Advisory safe cap: 750,000.
// - Class B operations (reads, gets, heads): 10,000,000 ops / month free. Advisory safe cap: 7,500,000.

export const MAX_STORAGE_CAP_BYTES = 8.0 * 1024 * 1024 * 1024; // 8.0 GB safe limit
export const FREE_TIER_STORAGE_CAP_BYTES = 10.0 * 1024 * 1024 * 1024; // 10.0 GB hard free tier cap
export const CLOUDFLARE_R2_SAFE_CAP_BYTES = MAX_STORAGE_CAP_BYTES;
export const CLOUDFLARE_R2_STORAGE_LIMIT_BYTES = FREE_TIER_STORAGE_CAP_BYTES;
export const MAX_SINGLE_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB max per file
export const MAX_CLASS_A_MONTHLY_OPS = 750_000; // 750k safe cap
export const FREE_TIER_CLASS_A_OPS = 1_000_000; // 1M free cap
export const MAX_CLASS_B_MONTHLY_OPS = 7_500_000; // 7.5M safe cap
export const FREE_TIER_CLASS_B_OPS = 10_000_000; // 10M free cap
export const RAM_CACHE_MAX_BYTES = 2 * 1024 * 1024; // 2 MB RAM cache ceiling
export const LISTING_CACHE_TTL_MS = 60 * 1000; // 60 seconds directory listing cache

// Cloudflare Free-Only Real Pricing Invariants
export const CLOUDFLARE_FREE_ONLY_MODE = true;
export const CLOUDFLARE_PROXY_LIMIT_BYTES = 95 * 1024 * 1024; // 95 MiB (safely within Cloudflare free 100MB body ceiling)

// Tiered User Storage Quotas (Fair-Use Free Allocation)
export const USER_STORAGE_TIERS = {
  NEW: 100 * 1024 * 1024,      // 100 MB for new / unverified accounts
  STANDARD: 250 * 1024 * 1024, // 250 MB for active community members
  TRUSTED: 500 * 1024 * 1024,  // 500 MB for established sovereign nodes
  ADMIN: 1024 * 1024 * 1024,   // 1 GB for Guardians / system administrators
  anonymous: { maxTotalBytes: 100 * 1024 * 1024, maxDailyBytes: 25 * 1024 * 1024 },
  standard: { maxTotalBytes: 250 * 1024 * 1024, maxDailyBytes: 50 * 1024 * 1024 },
  creator: { maxTotalBytes: 500 * 1024 * 1024, maxDailyBytes: 250 * 1024 * 1024 },
  sovereign: { maxTotalBytes: 1024 * 1024 * 1024, maxDailyBytes: 1024 * 1024 * 1024 },
};

// Daily Upload Bandwidth Ceilings
export const DAILY_UPLOAD_LIMITS = {
  NEW: 25 * 1024 * 1024,       // 25 MB / day
  STANDARD: 50 * 1024 * 1024,  // 50 MB / day
  TRUSTED: 250 * 1024 * 1024,  // 250 MB / day
  ADMIN: 1024 * 1024 * 1024,   // 1 GB / day
};

// Velocity & Concurrency Controls
export const MAX_UPLOADS_PER_HOUR = 20;
export const MAX_CONCURRENT_UPLOADS_PER_USER = 3;

// Storage Reservations Registry (Atomic Two-Phase Upload Allocation)
export interface StorageReservation {
  id: string;
  author: string;
  byteSize: number;
  fileName: string;
  expiresAt: number;
}

export const activeStorageReservations = new Map<string, StorageReservation>();
export const userUploadTimestamps = new Map<string, number[]>();

export function cleanExpiredReservations(now: number = Date.now()): void {
  for (const [id, resv] of activeStorageReservations.entries()) {
    if (now > resv.expiresAt) {
      activeStorageReservations.delete(id);
    }
  }
}

export function getActiveReservedBytes(): number {
  cleanExpiredReservations();
  let total = 0;
  for (const resv of activeStorageReservations.values()) {
    total += resv.byteSize;
  }
  return total;
}

export function getStoragePressureRatio(): number {
  const current = getTotalStorageBytes() + getActiveReservedBytes();
  return current / MAX_STORAGE_CAP_BYTES;
}

export function getMaxPermittedUploadBytes(pressureRatio: number): number {
  if (pressureRatio >= 1.0) return 0;
  if (pressureRatio >= 0.95) return 2 * 1024 * 1024; // 2 MB emergency cap
  if (pressureRatio >= 0.90) return 10 * 1024 * 1024; // 10 MB pressure cap
  return MAX_SINGLE_UPLOAD_BYTES; // 25 MB standard upload cap
}

// ─── CORS POLICY & SECURITY HEADERS ──────────────────────────────────────────

export const STORAGE_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, X-File-Name, X-Author, X-Title, X-Key, X-Sha256, X-Merkle-Root, X-Channel-Id, Cache-Control, If-None-Match',
  'Access-Control-Expose-Headers':
    'Content-Disposition, Content-Length, Content-Type, X-SHA256-Checksum, X-Merkle-Root, X-Author, X-Title, X-Edge-Storage, X-Deduplicated, ETag, Cache-Control',
  'Access-Control-Max-Age': '86400',
};

// ─── STATE TRACKING & TELEMETRY REGISTRIES ───────────────────────────────────

export const globalEdgeStorageMap = new Map<string, StoredBinaryObject>();

export interface KnownSha256Entry {
  key: string;
  size: number;
  sha256: string;
  merkleRoot: string;
  author: string;
  title: string;
  fileName: string;
  contentType: string;
  storage: 'Cloudflare-R2' | 'Edge-Isolate-Memory';
  uploadedAt: number;
}

const knownSha256Index = new Map<string, KnownSha256Entry>();

interface CachedListingEntry {
  timestamp: number;
  objects: Array<{
    key: string;
    size: number;
    sha256?: string;
    merkleRoot?: string;
    fileName?: string;
    author?: string;
    title?: string;
    uploadedAt?: number;
  }>;
  storage: 'Cloudflare-R2' | 'Edge-Isolate-Memory';
}

const listingCache = new Map<string, CachedListingEntry>();

// Advisory / telemetry counters: track in-flight and isolate operations (not authoritative Cloudflare billing usage)
let currentTrackedStorageBytes = 0;
let monthlyClassAOps = 0;
let monthlyClassBOps = 0;

/**
 * Get the current estimated storage in bytes across active vaults.
 */
export function getTotalStorageBytes(): number {
  let memBytes = 0;
  for (const item of globalEdgeStorageMap.values()) {
    memBytes += item.size;
  }
  return Math.max(currentTrackedStorageBytes, memBytes);
}

/**
 * Get recorded Class A operations count for the current billing window.
 */
export function getMonthlyClassAOps(): number {
  return monthlyClassAOps;
}

/**
 * Get recorded Class B operations count for the current billing window.
 */
export function getMonthlyClassBOps(): number {
  return monthlyClassBOps;
}

/**
 * Record Class A operations (writes, lists, deletes).
 */
export function recordClassAOp(count = 1): void {
  monthlyClassAOps += count;
}

/**
 * Record Class B operations (reads, gets, heads).
 */
export function recordClassBOp(count = 1): void {
  monthlyClassBOps += count;
}

/**
 * Invalidate in-memory directory listing cache.
 */
export function clearListingCache(): void {
  listingCache.clear();
}

/**
 * Synchronize quota metrics from persistent Cloudflare KV across Worker isolates.
 */
export async function syncQuotaFromStorage(env?: Env): Promise<void> {
  const kv = getKVStore(env);
  if (kv) {
    try {
      const [storedBytes, storedAOps, storedBOps] = await Promise.all([
        kv.get('r2_quota:storage_bytes'),
        kv.get('r2_quota:class_a_ops'),
        kv.get('r2_quota:class_b_ops'),
      ]);
      if (storedBytes !== null) {
        currentTrackedStorageBytes = Math.max(currentTrackedStorageBytes, Number(storedBytes) || 0);
      }
      if (storedAOps !== null) {
        monthlyClassAOps = Math.max(monthlyClassAOps, Number(storedAOps) || 0);
      }
      if (storedBOps !== null) {
        monthlyClassBOps = Math.max(monthlyClassBOps, Number(storedBOps) || 0);
      }
    } catch (_) {}
  }
}

/**
 * Persist quota metrics to Cloudflare KV across Worker isolates.
 */
export async function persistQuotaToStorage(env?: Env): Promise<void> {
  const kv = getKVStore(env);
  if (kv) {
    try {
      await Promise.all([
        kv.put('r2_quota:storage_bytes', String(currentTrackedStorageBytes)),
        kv.put('r2_quota:class_a_ops', String(monthlyClassAOps)),
        kv.put('r2_quota:class_b_ops', String(monthlyClassBOps)),
      ]);
    } catch (_) {}
  }
}

/**
 * For test injection and quota simulation.
 */
export function setMockQuotaStats(stats: {
  storageBytes?: number;
  classA?: number;
  classB?: number;
}): void {
  if (stats.storageBytes !== undefined) currentTrackedStorageBytes = stats.storageBytes;
  if (stats.classA !== undefined) monthlyClassAOps = stats.classA;
  if (stats.classB !== undefined) monthlyClassBOps = stats.classB;
}

export const R2_LIMITS = {
  FREE_STORAGE_BYTES: FREE_TIER_STORAGE_CAP_BYTES,
  SAFE_STORAGE_BYTES: MAX_STORAGE_CAP_BYTES,
  SAFETY_MARGIN_BYTES: 2.0 * 1024 * 1024 * 1024,
  MAX_SINGLE_UPLOAD_BYTES,
  FREE_CLASS_A_OPS: FREE_TIER_CLASS_A_OPS,
  SAFE_CLASS_A_OPS: MAX_CLASS_A_MONTHLY_OPS,
  DAILY_CLASS_A_OPS: 25_000,
  FREE_CLASS_B_OPS: FREE_TIER_CLASS_B_OPS,
  SAFE_CLASS_B_OPS: MAX_CLASS_B_MONTHLY_OPS,
  LIST_CACHE_TTL_MS: LISTING_CACHE_TTL_MS,
  READ_CACHE_CONTROL: 'public, max-age=31536000, immutable',
};

export const r2QuotaGuardian = {
  limits: R2_LIMITS,
  getUsedStorageBytes: () => getTotalStorageBytes(),
  getClassAOperations: () => getMonthlyClassAOps(),
  getClassBOperations: () => getMonthlyClassBOps(),
  setSimulatedStorageBytes: (bytes: number) => setMockQuotaStats({ storageBytes: bytes }),
  setSimulatedClassAOps: (ops: number) => setMockQuotaStats({ classA: ops }),
  setSimulatedClassBOps: (ops: number) => setMockQuotaStats({ classB: ops }),
  clearCache: () => clearListingCache(),
  reset: () => resetEdgeStorage(),
};

/**
 * Seed initial sample release if in-memory store is empty
 */
function initializeSeedStorage(): void {
  if (globalEdgeStorageMap.size === 0) {
    const seedPayload = new TextEncoder().encode(
      'UREfy Microkernel v1.0.0 Sovereign Binary Payload [Genesis Distribution]'
    );
    const seedSha256 = 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496';
    const seedMerkle = 'a2d2ab5e55249f01020304050607080900000000000000000000000000000000';
    const seedKey = 'releases/aetheris-microkernel-x86_64.bin';

    const seedObj: StoredBinaryObject = {
      key: seedKey,
      data: seedPayload,
      contentType: 'application/octet-stream',
      customMetadata: {
        sha256: seedSha256,
        merkleRoot: seedMerkle,
        author: 'genesis-core',
        title: 'UREfy Microkernel v1.0.0',
        fileName: 'aetheris-microkernel-x86_64.bin',
        byteSize: String(seedPayload.byteLength),
        uploadedAt: String(1756650000000),
      },
      size: seedPayload.byteLength,
      sha256: seedSha256,
      merkleRoot: seedMerkle,
      uploadedAt: 1756650000000,
      storage: 'Edge-Isolate-Memory',
    };

    globalEdgeStorageMap.set(seedKey, seedObj);
    knownSha256Index.set(seedSha256.toLowerCase(), {
      key: seedKey,
      size: seedPayload.byteLength,
      sha256: seedSha256,
      merkleRoot: seedMerkle,
      author: 'genesis-core',
      title: 'UREfy Microkernel v1.0.0',
      fileName: 'aetheris-microkernel-x86_64.bin',
      contentType: 'application/octet-stream',
      storage: 'Edge-Isolate-Memory',
      uploadedAt: 1756650000000,
    });
    currentTrackedStorageBytes = seedPayload.byteLength;
  }
}

// Ensure initial seed is loaded
initializeSeedStorage();

/**
 * Reset edge storage and quota registers back to genesis baseline.
 */
export function resetEdgeStorage(): void {
  globalEdgeStorageMap.clear();
  knownSha256Index.clear();
  listingCache.clear();
  currentTrackedStorageBytes = 0;
  monthlyClassAOps = 0;
  monthlyClassBOps = 0;
  initializeSeedStorage();
}

/**
 * Find known object by SHA-256 for instant deduplication.
 */
export function findObjectBySha256(sha256: string): KnownSha256Entry | null {
  const normalized = sha256.toLowerCase();
  const indexed = knownSha256Index.get(normalized);
  if (indexed) return indexed;

  for (const item of globalEdgeStorageMap.values()) {
    if (item.sha256.toLowerCase() === normalized) {
      return {
        key: item.key,
        size: item.size,
        sha256: item.sha256,
        merkleRoot: item.merkleRoot,
        author: item.customMetadata?.author || 'anon-peer',
        title: item.customMetadata?.title || item.key.split('/').pop() || 'artifact.bin',
        fileName: item.customMetadata?.fileName || item.key.split('/').pop() || 'artifact.bin',
        contentType: item.contentType || 'application/octet-stream',
        storage: item.storage || 'Edge-Isolate-Memory',
        uploadedAt: item.uploadedAt,
      };
    }
  }
  return null;
}

/**
 * Validate If-None-Match headers against multiple candidate ETags/checksums.
 */
export function checkEtagMatch(
  ifNoneMatchHeader: string | null,
  candidates: Array<string | undefined | null>
): boolean {
  if (!ifNoneMatchHeader) return false;
  const rawMatch = ifNoneMatchHeader.trim();
  if (rawMatch === '*') return true;

  const matchCandidates = rawMatch.split(',').map((s) => s.trim());

  for (const candidate of matchCandidates) {
    const cleanCand = candidate.replace(/^W\//, '').replace(/^"(.*)"$/, '$1');
    for (const etag of candidates) {
      if (!etag) continue;
      const cleanEtag = etag.replace(/^W\//, '').replace(/^"(.*)"$/, '$1');
      if (cleanCand === cleanEtag) return true;
    }
  }
  return false;
}

/**
 * Compute health status string for quota consumption percentage.
 */
function computeQuotaHealth(percentUsed: number): 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'EXCEEDED' {
  if (percentUsed >= 100) return 'EXCEEDED';
  if (percentUsed >= 90) return 'CRITICAL';
  if (percentUsed >= 75) return 'WARNING';
  return 'HEALTHY';
}

// ─── CRYPTOGRAPHIC CHECKSUM & MERKLE ROOT GENERATION ────────────────────────

/**
 * Calculates SHA-256 checksum in hexadecimal format using Web Crypto API.
 */
export async function computeSha256(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a hex string to Uint8Array.
 */
function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Validates and normalizes storage key to prevent directory traversal and key collision attacks.
 * Unsafe keys containing traversal sequences (..), control characters, URL-encoded dots,
 * backslashes, repeated slashes, or unicode slash variants are strictly rejected (returning empty string)
 * to ensure legitimate object keys are never silently transformed into another user's key.
 */
export function sanitizeStorageKey(key: string): string {
  if (!key || typeof key !== 'string') return '';

  // Reject control characters (0x00 - 0x1F, 0x7F) and null bytes
  if (/[\x00-\x1f\x7f]/.test(key)) return '';

  // Reject backslashes and repeated/leading/trailing forward slashes
  if (key.includes('\\') || key.includes('//') || key.startsWith('/') || key.endsWith('/')) {
    return '';
  }

  // Reject Unicode slash-like characters (e.g. U+2215, U+FF0F, U+2044, U+29F8, U+FE68, U+FF3C)
  if (/[\u2215\uFF0F\u2044\u29F8\uFE68\uFF3C]/.test(key)) return '';

  // Reject URL-encoded traversal patterns (e.g. %2e%2e, %2f, %5c, %25)
  if (/%(?:2e|2f|5c|25)/i.test(key)) return '';

  const segments = key.split('/');
  if (segments.length === 0) return '';

  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..') return '';
    // Segment must consist strictly of alphanumeric, dot, underscore, or hyphen characters
    if (!/^[a-zA-Z0-9._-]+$/.test(seg)) return '';
  }

  return segments.join('/');
}

/**
 * Calculates cryptographic Merkle Root over chunks of binary data.
 * Default chunk size is 16KB (16384 bytes).
 */
export async function computeMerkleRoot(
  data: ArrayBuffer | Uint8Array,
  chunkSize = 16384
): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length === 0) {
    return await computeSha256(new Uint8Array(0));
  }

  const leaves: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    const leafHash = await computeSha256(chunk);
    leaves.push(leafHash);
  }

  let layer = leaves;
  while (layer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : left;

      const leftBytes = hexToUint8Array(left);
      const rightBytes = hexToUint8Array(right);
      const combined = new Uint8Array(leftBytes.length + rightBytes.length);
      combined.set(leftBytes, 0);
      combined.set(rightBytes, leftBytes.length);

      const parentHash = await computeSha256(combined);
      nextLayer.push(parentHash);
    }
    layer = nextLayer;
  }

  return layer[0];
}

/**
 * Extracts and resolves Cloudflare R2 bucket binding.
 * Prioritizes `env.VAULT_BUCKET`, then `env.R2`, then `env.STORAGE_BUCKET`.
 */
export function getStorageBucket(env?: Env): R2Bucket | null {
  if (!env) return null;
  return env.VAULT_BUCKET || env.R2 || env.STORAGE_BUCKET || null;
}

// ─── OPTIONS: CORS PREFLIGHT HANDLER ─────────────────────────────────────────

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: STORAGE_CORS_HEADERS,
  });
}

// ─── POST: SECURE BINARY UPLOAD & R2 PERSISTENCE ─────────────────────────────

export async function onRequestPost(context: {
  request: Request;
  env?: Env;
}): Promise<Response> {
  try {
    const req = context.request;
    const url = new URL(req.url);
    const action = (url.searchParams.get('action') || '').trim().toLowerCase();

    // ─── 0. ATOMIC TWO-PHASE UPLOAD RESERVATION (action=reserve) ───────────────
    if (action === 'reserve') {
      const body = await req.json().catch(() => null) as Record<string, any> | null;
      if (!body || typeof body.byteSize !== 'number') {
        return new Response(
          JSON.stringify({ success: false, error: 'byteSize number is required for storage reservation' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
        );
      }
      const byteSize = Number(body.byteSize) || 0;
      const author = typeof body.author === 'string' && body.author.trim() ? body.author.trim() : (req.headers.get('X-Author') || 'anon-peer');
      const fileName = typeof body.fileName === 'string' && body.fileName.trim() ? body.fileName.trim() : (req.headers.get('X-File-Name') || 'file.bin');

      // Velocity rate limiting (max 20 uploads / hr)
      const now = Date.now();
      cleanExpiredReservations(now);
      const userTimestamps = (userUploadTimestamps.get(author) || []).filter(t => now - t < 3600000);
      if (userTimestamps.length >= MAX_UPLOADS_PER_HOUR) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Upload velocity limit exceeded (max ${MAX_UPLOADS_PER_HOUR} uploads per hour). Please retry later.`,
          }),
          { status: 429, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
        );
      }

      // Check dynamic storage pressure thresholds
      const pressure = getStoragePressureRatio();
      const maxAllowed = getMaxPermittedUploadBytes(pressure);
      if (byteSize > maxAllowed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Dynamic storage pressure limit: file size of ${(byteSize / (1024 * 1024)).toFixed(1)}MB exceeds current permitted ceiling of ${(maxAllowed / (1024 * 1024)).toFixed(1)}MB (pressure at ${(pressure * 100).toFixed(0)}%).`,
          }),
          { status: 413, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
        );
      }

      // Check global storage capacity
      const reservedBytes = getActiveReservedBytes();
      if (getTotalStorageBytes() + reservedBytes + byteSize > MAX_STORAGE_CAP_BYTES) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Vault storage capacity reached in Cloudflare Free Tier (8.0 GB safe cap). Existing data remains fully accessible. Failover to P2P WebRTC Direct Swarm.',
          }),
          { status: 507, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
        );
      }

      const randHex = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, '0')).join('');
      const reservationId = `resv_${now}_${randHex}`;

      // Authoritative atomic allocation in D1 across all Cloudflare isolates
      if (getD1Database(context.env)) {
        try {
          const allocated = await allocateStorage(context.env, reservationId, author, byteSize);
          if (!allocated) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Account or platform storage quota reached. Remove files before uploading more.',
              }),
              { status: 507, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
            );
          }
        } catch (allocErr: any) {
          if (isProductionEnv(context.env)) {
            return new Response(
              JSON.stringify({ success: false, error: 'Storage accounting is unavailable. Reservation failed.' }),
              { status: 503, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
            );
          }
        }
      }

      activeStorageReservations.set(reservationId, {
        id: reservationId,
        author,
        byteSize,
        fileName,
        expiresAt: now + 15 * 60 * 1000, // 15-minute reservation TTL
      });

      return new Response(
        JSON.stringify({
          success: true,
          reservationId,
          expiresAt: now + 15 * 60 * 1000,
          permitted: true,
          storageTier: 'Cloudflare-Free-Tier-Standard',
          maxStorageBytes: MAX_STORAGE_CAP_BYTES,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
      );
    }

    // ─── 0.1 CANCEL STORAGE RESERVATION (action=release) ────────────────────────
    if (action === 'release') {
      const body = await req.json().catch(() => null) as Record<string, any> | null;
      const reservationId = (body?.reservationId || url.searchParams.get('reservationId') || '').trim();
      if (reservationId) {
        activeStorageReservations.delete(reservationId);
        if (getD1Database(context.env)) {
          try {
            await releaseStorage(context.env, reservationId);
          } catch (_) {}
        }
      }
      return new Response(
        JSON.stringify({ success: true, released: true, reservationId }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
      );
    }

    const rawContentType = req.headers.get('Content-Type') || '';

    // Validate Content-Type
    if (!rawContentType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Content-Type header. Specify binary MIME type or multipart/form-data.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...STORAGE_CORS_HEADERS,
          },
        }
      );
    }

    let binaryData: Uint8Array;
    let fileName = req.headers.get('X-File-Name') || '';
    let author = req.headers.get('X-Author') || 'anon-peer';
    let title = req.headers.get('X-Title') || '';
    let customKey = req.headers.get('X-Key') || '';
    let channelId = req.headers.get('X-Channel-Id') || 'vault-releases';
    let detectedContentType = rawContentType.split(';')[0].trim();
    let envelopeObj: any = null;
    const envHeader = req.headers.get('X-Sovereign-Envelope');
    if (envHeader) {
      try {
        envelopeObj = JSON.parse(envHeader);
      } catch (_) {}
    }

    // 1. Multipart Form-Data
    if (rawContentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const formFile = formData.get('file') as File | null;
      const formPayload = formData.get('payload') || formData.get('data');

      if (formFile && typeof formFile === 'object' && 'arrayBuffer' in formFile) {
        binaryData = new Uint8Array(await formFile.arrayBuffer());
        fileName = formFile.name || fileName;
        detectedContentType = formFile.type || 'application/octet-stream';
      } else if (typeof formPayload === 'string') {
        binaryData = new TextEncoder().encode(formPayload);
      } else {
        binaryData = new Uint8Array(0);
      }

      fileName = (formData.get('fileName') as string) || fileName;
      author = (formData.get('author') as string) || author;
      title = (formData.get('title') as string) || title;
      customKey = (formData.get('key') as string) || customKey;
      channelId = (formData.get('channelId') as string) || channelId;
    }
    // 2. Application JSON (Base64 payload or structured data)
    else if (rawContentType.includes('application/json')) {
      const rawJson = (await req.json()) as any;
      let jsonBody = rawJson;
      if (rawJson && rawJson.payload && typeof rawJson.payload === 'object' && rawJson.signature && rawJson.identity) {
        envelopeObj = rawJson;
        jsonBody = rawJson.payload;
      }
      if (!jsonBody || (!jsonBody.data && !jsonBody.base64 && !jsonBody.content)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'JSON body must contain data, base64 or content field',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
          }
        );
      }

      if (jsonBody.base64) {
        const binaryStr = atob(jsonBody.base64);
        binaryData = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          binaryData[i] = binaryStr.charCodeAt(i);
        }
      } else if (jsonBody.content) {
        binaryData = new TextEncoder().encode(jsonBody.content);
      } else if (Array.isArray(jsonBody.data)) {
        binaryData = new Uint8Array(jsonBody.data);
      } else {
        binaryData = new TextEncoder().encode(String(jsonBody.data));
      }

      fileName = jsonBody.fileName || fileName;
      author = jsonBody.author || author;
      title = jsonBody.title || title;
      customKey = jsonBody.key || customKey;
      channelId = jsonBody.channelId || channelId;
      detectedContentType = jsonBody.contentType || 'application/octet-stream';
    }
    // 3. Direct Binary Body (application/octet-stream, zip, wasm, images, etc.)
    else {
      const arrayBuffer = await req.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Empty binary payload received',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
          }
        );
      }
      binaryData = new Uint8Array(arrayBuffer);
    }

    fileName = fileName.replace(/[\r\n\0]/g, '').trim();
    author = author.replace(/[\r\n\0]/g, '').trim() || 'anon-peer';
    title = title.replace(/[\r\n\0]/g, '').trim();

    if (binaryData.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Binary payload cannot be empty',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
        }
      );
    }

    // Maximum single upload limit: 25MB (Cloudflare R2 Sovereign Safety Guard)
    if (binaryData.byteLength > storageLimits(context.env).maxFileBytes) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Payload exceeds the configured ${storageLimits(context.env).maxFileBytes} byte upload limit`,
        }),
        {
          status: 413,
          headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
        }
      );
    }

    // Compute Cryptographic Checksums
    if (!validateUploadMime(detectedContentType, binaryData)) return Response.json({ success: false, error: 'Unsupported file type or file contents do not match the declared MIME type' }, { status: 415 });
    const sha256 = await computeSha256(binaryData);
    const merkleRoot = await computeMerkleRoot(binaryData);
    const byteSize = binaryData.byteLength;

    if (!fileName) {
      fileName = `release-${sha256.slice(0, 10)}.bin`;
    }
    if (!title) {
      title = fileName;
    }

    // ─── HARD SAFETY LIMIT CHECKS (Class A Ceiling & Storage Cap) ───────────────
    await syncQuotaFromStorage(context.env);
    if (monthlyClassAOps >= MAX_CLASS_A_MONTHLY_OPS) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'SOVEREIGN_R2_QUOTA_GUARD: Class A operation safety ceiling reached (750,000 / 1,000,000 free cap). Failover to P2P WebRTC Direct Swarm.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...STORAGE_CORS_HEADERS,
          },
        }
      );
    }

    const currentTotalStorage = getTotalStorageBytes();
    if (currentTotalStorage + byteSize > MAX_STORAGE_CAP_BYTES) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'SOVEREIGN_R2_QUOTA_GUARD: Sovereign storage safety cap (8.0 GB / 10.0 GB free tier) reached. Upload rejected to preserve Cloudflare free tier. Failover to P2P WebRTC Direct Swarm.',
        }),
        {
          status: 507,
          headers: {
            'Content-Type': 'application/json',
            ...STORAGE_CORS_HEADERS,
          },
        }
      );
    }

    // ─── AUTHENTICATION & IDENTITY VERIFICATION GUARD ───
    const adminCheck = await requireAdmin(context);
    if (!adminCheck.authorized) {
      const identityAuth = await requireSignedEnvelope(context, envelopeObj || {}, 'storage:upload');
      if (!identityAuth.authorized) {
        return (
          identityAuth.response ||
          new Response(
            JSON.stringify({
              success: false,
              error: 'Authentication required for storage upload: valid Admin session or signed identity required.',
            }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
            }
          )
        );
      }
      if (identityAuth.fingerprint) {
        author = identityAuth.fingerprint;
      }
      if (!rawContentType.includes('application/json') && (envelopeObj?.payload?.sha256 !== sha256 || envelopeObj?.payload?.fileName !== fileName)) {
        return Response.json({ success: false, error: 'The signed upload must match the file checksum and filename' }, { status: 403 });
      }
    }

    const bucket = getStorageBucket(context.env);

    // ─── SHA-256 DEDUPLICATION (Zero Class A ops, Zero storage consumed) ────────
    const existingMatch = findObjectBySha256(sha256);
    if (existingMatch && existingMatch.author === author) {
      const existingKey = existingMatch.key;
      const existingName = existingMatch.fileName || existingKey.split('/').pop() || fileName;
      const existingAuthor = existingMatch.author || author;
      const existingTitle = existingMatch.title || title;
      const existingSize = existingMatch.size;
      const existingMerkle = existingMatch.merkleRoot;
      const existingStorage: 'Cloudflare-R2' | 'Edge-Isolate-Memory' =
        isProductionEnv(context.env) ? 'Cloudflare-R2' : (existingMatch.storage || (bucket ? 'Cloudflare-R2' : 'Edge-Isolate-Memory'));
      const existingUploadedAt = existingMatch.uploadedAt || Date.now();

      const downloadUrl = `/api/storage?key=${encodeURIComponent(existingKey)}`;
      const responsePayload: StorageUploadResult = {
        success: true,
        key: existingKey,
        fileName: existingName,
        byteSize: existingSize,
        sha256,
        merkleRoot: existingMerkle,
        author: existingAuthor,
        title: existingTitle,
        contentType: existingMatch.contentType || detectedContentType,
        downloadUrl,
        storage: existingStorage,
        uploadedAt: existingUploadedAt,
        deduplicated: true,
      };

      return new Response(JSON.stringify(responsePayload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-SHA256-Checksum': sha256,
          'X-Merkle-Root': existingMerkle,
          'X-Edge-Storage': existingStorage,
          'X-Deduplicated': 'true',
          ...STORAGE_CORS_HEADERS,
        },
      });
    }

    // Determine storage key
    if (customKey && !sanitizeStorageKey(customKey)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid custom storage key: path traversal sequences, control characters, and ambiguous separators are prohibited',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
      );
    }
    let key = customKey ? sanitizeStorageKey(customKey) : '';
    if (!key) {
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      key = `releases/${crypto.randomUUID()}-${sanitizedName}`;
    }

    if ((bucket && await bucket.head(key)) || globalEdgeStorageMap.has(key)) return Response.json({ success: false, error: 'A file already exists at this key. Use a new key.' }, { status: 409 });
    if (bucket || isProductionEnv(context.env)) {
      if (!bucket || !getD1Database(context.env)) return Response.json({ success: false, error: 'R2 storage and durable accounting must both be available' }, { status: 503 });
      try {
        if (!await allocateStorage(context.env, key, author, byteSize)) return Response.json({ success: false, error: 'Account or platform storage quota reached. Remove files before uploading more.' }, { status: 507 });
      } catch {
        return Response.json({ success: false, error: 'Storage accounting is unavailable. No file was uploaded.' }, { status: 503 });
      }
    }

    let storageType: 'Cloudflare-R2' | 'Edge-Isolate-Memory' = 'Edge-Isolate-Memory';

    const customMetadata: Record<string, string> = {
      sha256,
      merkleRoot,
      author,
      title,
      fileName,
      byteSize: String(byteSize),
      uploadedAt: String(Date.now()),
    };

    // Storing in Cloudflare R2 if binding is available
    if (bucket) {
      try {
        recordClassAOp();
        await bucket.put(key, binaryData, {
          httpMetadata: {
            contentType: detectedContentType || 'application/octet-stream',
          },
          customMetadata,
        });
        storageType = 'Cloudflare-R2';

        // Synchronize metadata with Cloudflare D1 if available
        const db = getD1Database(context.env);
        if (db) {
          try {
            const nanopubId = `nano-${Date.now()}-${sha256.substring(0, 8)}`;
            await db
              .prepare(
                `INSERT OR REPLACE INTO nanopublications (
                  id, channel_id, title, file_name, byte_size, sha256, crc32,
                  entropy, verdict, merkle_root, seeder_count, r2_key, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                nanopubId,
                channelId || 'vault-releases',
                title || fileName,
                fileName,
                byteSize,
                sha256,
                '',
                0.0,
                'UNSCANNED',
                merkleRoot,
                0,
                key,
                Date.now()
              )
              .run();
          } catch (dbErr: any) {
            if (isProductionEnv(context.env)) {
              // Roll back R2 upload to prevent orphan inconsistency
              try {
                await bucket.delete(key);
                await releaseStorage(context.env, key);
              } catch (_) {}
              return new Response(
                JSON.stringify({
                  success: false,
                  error: `Metadata registration in D1 failed: ${dbErr?.message || 'Database error'}. R2 storage object was cleaned up.`,
                }),
                {
                  status: 500,
                  headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
                }
              );
            }
            console.warn('[D1 Metadata Sync Warning]:', dbErr);
          }
        }

        // RAM cache: Keep small files (< 2 MB) in edge isolate memory
        if (byteSize <= RAM_CACHE_MAX_BYTES) {
          globalEdgeStorageMap.set(key, {
            key,
            data: binaryData,
            contentType: detectedContentType,
            customMetadata: {
              ...customMetadata,
              storage: 'Cloudflare-R2',
            },
            size: byteSize,
            sha256,
            merkleRoot,
            uploadedAt: Date.now(),
            storage: 'Cloudflare-R2',
          });
        }
      } catch (r2Err: any) {
        // Uncertain writes retain their allocation unless deletion succeeds.
        try { await bucket.delete(key); await releaseStorage(context.env, key); } catch { /* retained for reconciliation */ }
        if (isProductionEnv(context.env)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Cloudflare R2 upload failed: ${r2Err?.message || 'Storage error'}. In-memory fallback is disabled in production.`,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
            }
          );
        }
        console.warn('[R2 Storage Put Failed, Falling back to Edge Memory]:', r2Err);
        storageType = 'Edge-Isolate-Memory';
        globalEdgeStorageMap.set(key, {
          key,
          data: binaryData,
          contentType: detectedContentType,
          customMetadata,
          size: byteSize,
          sha256,
          merkleRoot,
          uploadedAt: Date.now(),
          storage: 'Edge-Isolate-Memory',
        });
      }
    } else if (isProductionEnv(context.env)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cloudflare R2 storage bucket unavailable. In-memory storage fallback is disabled in production.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
        }
      );
    } else {
      // Distributed Edge Isolate In-Memory Storage (Development / Test only)
      globalEdgeStorageMap.set(key, {
        key,
        data: binaryData,
        contentType: detectedContentType,
        customMetadata,
        size: byteSize,
        sha256,
        merkleRoot,
        uploadedAt: Date.now(),
        storage: 'Edge-Isolate-Memory',
      });
    }

    // Invalidate listing cache and update quota tracking
    clearListingCache();
    currentTrackedStorageBytes += byteSize;
    await persistQuotaToStorage(context.env);

    knownSha256Index.set(sha256.toLowerCase(), {
      key,
      size: byteSize,
      sha256,
      merkleRoot,
      author,
      title,
      fileName,
      contentType: detectedContentType,
      storage: storageType,
      uploadedAt: Date.now(),
    });

    const downloadUrl = `/api/storage?key=${encodeURIComponent(key)}`;

    const responsePayload: StorageUploadResult = {
      success: true,
      key,
      fileName,
      byteSize,
      sha256,
      merkleRoot,
      author,
      title,
      contentType: detectedContentType,
      downloadUrl,
      storage: storageType,
      uploadedAt: Date.now(),
    };

    const pressureRatio = getStoragePressureRatio();
    const pressurePercent = (pressureRatio * 100).toFixed(1);
    const uploadHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-SHA256-Checksum': sha256,
      'X-Merkle-Root': merkleRoot,
      'X-Edge-Storage': storageType,
      'X-Storage-Pressure': `${pressurePercent}%`,
      'X-Storage-Class': 'Standard',
      'X-Free-Tier-Only': 'true',
      ...STORAGE_CORS_HEADERS,
    };
    if (pressureRatio >= 0.70) {
      uploadHeaders['X-Storage-Pressure-Status'] = 'elevated';
    }

    return new Response(JSON.stringify(responsePayload, null, 2), {
      status: 201,
      headers: uploadHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Storage upload error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...STORAGE_CORS_HEADERS,
        },
      }
    );
  }
}

// ─── GET: HIGH-PERFORMANCE STREAMING DOWNLOAD & VERIFICATION ─────────────────

export async function onRequestGet(context: {
  request: Request;
  env?: Env;
}): Promise<Response> {
  try {
    const url = new URL(context.request.url);

    // ─── 0. QUOTA TELEMETRY ENDPOINT ─────────────────────────────────────────
    const action = url.searchParams.get('action');
    if (action === 'account') {
      let envelope: unknown;
      try { envelope = JSON.parse(context.request.headers.get('X-Sovereign-Envelope') || 'null'); } catch { envelope = null; }
      const auth = await requireSignedEnvelope(context, envelope);
      if (!auth.authorized) return auth.response!;
      if (auth.payload?.scope !== 'urefy-storage-v1' || auth.payload?.action !== 'account') return Response.json({ success: false, error: 'Invalid storage request' }, { status: 400 });
      return Response.json({ success: true, ...await getAccountStorage(context.env, auth.fingerprint!) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const quotaQuery = url.searchParams.get('quota');
    if (action === 'quota' || quotaQuery === 'true') {
      await syncQuotaFromStorage(context.env);
      const totalBytes = getTotalStorageBytes();
      const classACount = getMonthlyClassAOps();
      const classBCount = getMonthlyClassBOps();

      const storagePercent = Number(((totalBytes / MAX_STORAGE_CAP_BYTES) * 100).toFixed(2));
      const classAPercent = Number(((classACount / MAX_CLASS_A_MONTHLY_OPS) * 100).toFixed(2));
      const classBPercent = Number(((classBCount / MAX_CLASS_B_MONTHLY_OPS) * 100).toFixed(2));

      const isHealthy =
        storagePercent < 100 && classAPercent < 100 && classBPercent < 100;

      const telemetryPayload = {
        success: true,
        accountingType: 'ADVISORY_TELEMETRY_COUNTERS',
        notice: 'Local quota metrics are advisory telemetry counters for in-flight circuit breaking and do not represent authoritative Cloudflare billing usage.',
        protectionMode: 'STRICT_FREE_TIER_ENFORCED',
        circuitBreaker: isHealthy ? 'ARMED_AND_PROTECTED' : 'TRIPPED_FAILOVER_TO_MESH',
        storage: {
          usedBytes: totalBytes,
          usedMB: Math.round(totalBytes / 1048576),
          usedGB: Number((totalBytes / 1073741824).toFixed(3)),
          safeLimitGB: 8.0,
          freeTierCapGB: 10.0,
          percentUsed: storagePercent,
          status: computeQuotaHealth(storagePercent),
        },
        classA: {
          monthOps: classACount,
          safeLimitOps: 750000,
          freeTierCapOps: 1000000,
          percentUsed: classAPercent,
          status: computeQuotaHealth(classAPercent),
        },
        classB: {
          monthOps: classBCount,
          safeLimitOps: 7500000,
          freeTierCapOps: 10000000,
          percentUsed: classBPercent,
          status: computeQuotaHealth(classBPercent),
        },
      };

      return new Response(JSON.stringify(telemetryPayload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...STORAGE_CORS_HEADERS,
        },
      });
    }

    const rawKey =
      url.searchParams.get('key') ||
      url.searchParams.get('id') ||
      url.searchParams.get('file') ||
      url.searchParams.get('download');
    if (rawKey && !sanitizeStorageKey(rawKey)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid storage key: path traversal sequences, control characters, and ambiguous separators are prohibited',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
      );
    }
    const key = rawKey ? sanitizeStorageKey(rawKey) : null;
    const sha256Query = url.searchParams.get('sha256')
      ? url.searchParams.get('sha256')!.trim().toLowerCase()
      : null;

    const isList = url.searchParams.get('list') === 'true' || (!key && !sha256Query);
    const isMetaOnly =
      url.searchParams.get('meta') === 'true' || url.searchParams.get('info') === 'true';

    const bucket = getStorageBucket(context.env);
    if (isProductionEnv(context.env) && !bucket) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cloudflare R2 storage bucket unavailable. In-memory storage fallback is disabled in production.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
        }
      );
    }

    // ─── 1. OBJECT LISTING (60s In-Memory Cache — Class A Saver) ─────────────
    if (isList && !key && !sha256Query) {
      const prefix = url.searchParams.get('prefix') || '';
      const cacheKey = `${bucket ? 'r2' : 'edge'}:${prefix}`;
      const now = Date.now();
      const cached = listingCache.get(cacheKey);

      // Subsequent GET /api/storage calls within 60s return the cached listing without calling bucket.list()
      if (cached && now - cached.timestamp < LISTING_CACHE_TTL_MS) {
        return new Response(
          JSON.stringify({
            success: true,
            count: cached.objects.length,
            storage: cached.storage,
            objects: cached.objects,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control':
                'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
              ...STORAGE_CORS_HEADERS,
            },
          }
        );
      }

      let objects: Array<{
        key: string;
        size: number;
        sha256?: string;
        merkleRoot?: string;
        fileName?: string;
        author?: string;
        title?: string;
        uploadedAt?: number;
      }> = [];

      if (bucket) {
        try {
          recordClassAOp();
          const listRes = await bucket.list({ prefix: prefix || undefined });
          objects = listRes.objects.map((o) => ({
            key: o.key,
            size: o.size,
            sha256: o.customMetadata?.sha256,
            merkleRoot: o.customMetadata?.merkleRoot,
            fileName: o.customMetadata?.fileName || o.key.split('/').pop(),
            author: o.customMetadata?.author,
            title: o.customMetadata?.title,
            uploadedAt: o.uploaded ? o.uploaded.getTime() : undefined,
          }));
        } catch (_) {}
      }

      // Merge / fallback with in-memory store (development only)
      if (objects.length === 0 && !isProductionEnv(context.env)) {
        for (const [k, v] of globalEdgeStorageMap.entries()) {
          if (!prefix || k.startsWith(prefix)) {
            objects.push({
              key: k,
              size: v.size,
              sha256: v.sha256,
              merkleRoot: v.merkleRoot,
              fileName: v.customMetadata?.fileName || k.split('/').pop(),
              author: v.customMetadata?.author,
              title: v.customMetadata?.title,
              uploadedAt: v.uploadedAt,
            });
          }
        }
      }

      const listingStorage = bucket ? 'Cloudflare-R2' : 'Edge-Isolate-Memory';
      listingCache.set(cacheKey, {
        timestamp: now,
        objects,
        storage: listingStorage,
      });

      return new Response(
        JSON.stringify({
          success: true,
          count: objects.length,
          storage: listingStorage,
          objects,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control':
              'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
            ...STORAGE_CORS_HEADERS,
          },
        }
      );
    }

    const ifNoneMatch = context.request.headers.get('if-none-match');

    // ─── 2. LOOKUP IN RAM CACHE (Class B Saver: Small Files < 2MB or Edge Memory) ─
    let memItem: StoredBinaryObject | undefined;
    if (!isProductionEnv(context.env)) {
      if (key) {
        memItem = globalEdgeStorageMap.get(key);
      }
      if (!memItem && sha256Query) {
        memItem = Array.from(globalEdgeStorageMap.values()).find(
          (item) => item.sha256.toLowerCase() === sha256Query.toLowerCase()
        );
      }
      if (!memItem && key) {
        // Fallback matching by suffix / filename
        memItem = Array.from(globalEdgeStorageMap.values()).find(
          (item) => item.key.endsWith(key) || item.customMetadata?.fileName === key
        );
      }
    }

    if (memItem) {
      const fileName =
        memItem.customMetadata?.fileName || memItem.key.split('/').pop() || 'artifact.bin';
      const itemStorage =
        memItem.storage ||
        memItem.customMetadata?.storage ||
        (bucket ? 'Cloudflare-R2' : 'Edge-Isolate-Memory');
      const etag = `"${memItem.sha256}"`;

      // 304 NOT MODIFIED CHECK (Class B Saver)
      if (
        checkEtagMatch(ifNoneMatch, [
          etag,
          memItem.sha256,
          memItem.customMetadata?.etag,
        ])
      ) {
        const headers = new Headers();
        for (const [k, v] of Object.entries(STORAGE_CORS_HEADERS)) {
          headers.set(k, v);
        }
        headers.set('ETag', etag);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('X-SHA256-Checksum', memItem.sha256);
        headers.set('X-Merkle-Root', memItem.merkleRoot);
        headers.set('X-Edge-Storage', itemStorage);
        return new Response(null, {
          status: 304,
          headers,
        });
      }

      if (isMetaOnly) {
        return new Response(
          JSON.stringify({
            success: true,
            key: memItem.key,
            fileName,
            byteSize: memItem.size,
            sha256: memItem.sha256,
            merkleRoot: memItem.merkleRoot,
            author: memItem.customMetadata?.author || '',
            title: memItem.customMetadata?.title || '',
            contentType: memItem.contentType,
            etag,
            storage: itemStorage,
            uploadedAt: memItem.uploadedAt,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=60',
              ...STORAGE_CORS_HEADERS,
            },
          }
        );
      }

      const headers = new Headers();
      for (const [k, v] of Object.entries(STORAGE_CORS_HEADERS)) {
        headers.set(k, v);
      }

      const safeFileName = fileName.replace(/["\r\n\\]/g, '_');
      headers.set('Content-Type', memItem.contentType || 'application/octet-stream');
      headers.set('Content-Length', String(memItem.size));
      headers.set('Content-Disposition', `attachment; filename="${safeFileName}"`);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
      headers.set('X-Frame-Options', 'DENY');
      headers.set('ETag', etag);
      headers.set('X-SHA256-Checksum', memItem.sha256);
      headers.set('X-Merkle-Root', memItem.merkleRoot);
      headers.set('X-Edge-Storage', itemStorage);

      if (memItem.customMetadata?.author) {
        headers.set('X-Author', memItem.customMetadata.author.replace(/[\r\n]/g, ''));
      }
      if (memItem.customMetadata?.title) {
        headers.set('X-Title', memItem.customMetadata.title.replace(/[\r\n]/g, ''));
      }

      return new Response(memItem.data as unknown as BodyInit, {
        status: 200,
        headers,
      });
    }

    // ─── 3. LOOKUP IN R2 STORAGE BUCKET (When not cached in RAM) ─────────────
    let lookupKey = key;
    if (!lookupKey && sha256Query) {
      const indexed = knownSha256Index.get(sha256Query);
      if (indexed) {
        lookupKey = indexed.key;
      }
    }

    if (bucket && lookupKey) {
      // Check Class B safety ceiling before calling bucket.get()
      if (monthlyClassBOps >= MAX_CLASS_B_MONTHLY_OPS) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              'SOVEREIGN_R2_QUOTA_GUARD: Class B operation safety ceiling reached (7,500,000 / 10,000,000 free cap). Failover to P2P WebRTC Direct Swarm.',
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...STORAGE_CORS_HEADERS,
            },
          }
        );
      }

      try {
        recordClassBOp();
        const object = await bucket.get(lookupKey);
        if (object) {
          const sha256 = object.customMetadata?.sha256 || '';
          const merkleRoot = object.customMetadata?.merkleRoot || '';
          const author = object.customMetadata?.author || '';
          const title = object.customMetadata?.title || '';
          const fileName =
            object.customMetadata?.fileName || lookupKey.split('/').pop() || 'artifact.bin';
          const contentType =
            object.httpMetadata?.contentType || 'application/octet-stream';
          const etag = object.httpEtag || object.etag || `"${sha256 || lookupKey}"`;

          // 304 NOT MODIFIED CHECK (Class B Saver)
          if (
            checkEtagMatch(ifNoneMatch, [
              etag,
              object.etag,
              object.httpEtag,
              sha256,
            ])
          ) {
            const headers = new Headers();
            for (const [k, v] of Object.entries(STORAGE_CORS_HEADERS)) {
              headers.set(k, v);
            }
            headers.set('ETag', etag);
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            if (sha256) headers.set('X-SHA256-Checksum', sha256);
            if (merkleRoot) headers.set('X-Merkle-Root', merkleRoot);
            headers.set('X-Edge-Storage', 'Cloudflare-R2');
            return new Response(null, {
              status: 304,
              headers,
            });
          }

          // Return JSON metadata only if requested
          if (isMetaOnly) {
            return new Response(
              JSON.stringify({
                success: true,
                key: object.key,
                fileName,
                byteSize: object.size,
                sha256,
                merkleRoot,
                author,
                title,
                contentType,
                etag,
                storage: 'Cloudflare-R2',
                uploadedAt: object.uploaded ? object.uploaded.getTime() : Date.now(),
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'public, max-age=60',
                  ...STORAGE_CORS_HEADERS,
                },
              }
            );
          }

          // Build streaming HTTP/3 response
          const headers = new Headers();
          for (const [k, v] of Object.entries(STORAGE_CORS_HEADERS)) {
            headers.set(k, v);
          }

          const safeFileName = fileName.replace(/["\r\n\\]/g, '_');
          headers.set('Content-Type', contentType);
          headers.set('Content-Length', String(object.size));
          headers.set('Content-Disposition', `attachment; filename="${safeFileName}"`);
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
          headers.set('X-Content-Type-Options', 'nosniff');
          headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
          headers.set('X-Frame-Options', 'DENY');
          headers.set('ETag', etag);
          headers.set('X-Edge-Storage', 'Cloudflare-R2');

          if (sha256) headers.set('X-SHA256-Checksum', sha256);
          if (merkleRoot) headers.set('X-Merkle-Root', merkleRoot);
          if (author) headers.set('X-Author', author.replace(/[\r\n]/g, ''));
          if (title) headers.set('X-Title', title.replace(/[\r\n]/g, ''));

          // RAM cache: Keep small files (< 2 MB) in edge isolate memory
          if (object.size <= RAM_CACHE_MAX_BYTES) {
            const arrayBuf = await object.arrayBuffer();
            const binaryBytes = new Uint8Array(arrayBuf);
            globalEdgeStorageMap.set(lookupKey, {
              key: object.key,
              data: binaryBytes,
              contentType,
              customMetadata: {
                ...(object.customMetadata || {}),
                sha256,
                merkleRoot,
                author,
                title,
                fileName,
                storage: 'Cloudflare-R2',
              },
              size: object.size,
              sha256,
              merkleRoot,
              uploadedAt: object.uploaded ? object.uploaded.getTime() : Date.now(),
              storage: 'Cloudflare-R2',
            });
            return new Response(binaryBytes, {
              status: 200,
              headers,
            });
          }

          return new Response(object.body, {
            status: 200,
            headers,
          });
        }
      } catch (r2GetErr: any) {
        if (isProductionEnv(context.env)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Cloudflare R2 fetch error: ${r2GetErr?.message || r2GetErr}`,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
            }
          );
        }
        console.warn('[R2 Get Fallback]', r2GetErr);
      }
    }

    // ─── 4. NOT FOUND ────────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: false,
        error: `Object not found in sovereign storage: ${key || sha256Query}`,
        key: key || sha256Query,
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...STORAGE_CORS_HEADERS,
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Storage download error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...STORAGE_CORS_HEADERS,
        },
      }
    );
  }
}

// ─── HEAD: METADATA & INTEGRITY HEADERS WITHOUT BODY ─────────────────────────

export async function onRequestHead(context: {
  request: Request;
  env?: Env;
}): Promise<Response> {
  const getRes = await onRequestGet(context);
  return new Response(null, {
    status: getRes.status,
    headers: getRes.headers,
  });
}

// ─── DELETE: REMOVE OBJECT FROM VAULT / R2 ───────────────────────────────────

export async function onRequestDelete(context: {
  request: Request;
  env?: Env;
}): Promise<Response> {
  try {
    await syncQuotaFromStorage(context.env);
    const url = new URL(context.request.url);
    const rawKey = url.searchParams.get('key') || url.searchParams.get('id');

    if (!rawKey || !sanitizeStorageKey(rawKey)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Valid non-traversal storage key parameter required for DELETE',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
        }
      );
    }

    const key = sanitizeStorageKey(rawKey);

    if (monthlyClassAOps >= MAX_CLASS_A_MONTHLY_OPS) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'SOVEREIGN_R2_QUOTA_GUARD: Class A operation safety ceiling reached (750,000 / 1,000,000 free cap). Failover to P2P WebRTC Direct Swarm.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...STORAGE_CORS_HEADERS,
          },
        }
      );
    }

    // ─── AUTHENTICATION & OWNERSHIP AUTHORIZATION GUARD ───
    const adminCheck = await requireAdmin(context);
    const bucket = getStorageBucket(context.env);

    if (!adminCheck.authorized) {
      let delEnvelope: any = null;
      const envHdr = context.request.headers.get('X-Sovereign-Envelope');
      if (envHdr) {
        try {
          delEnvelope = JSON.parse(envHdr);
        } catch (_) {}
      }
      if (!delEnvelope && context.request.headers.get('content-type')?.includes('application/json')) {
        try {
          delEnvelope = await context.request.clone().json();
        } catch (_) {}
      }
      const identityAuth = await requireSignedEnvelope(
        context,
        delEnvelope || {},
        'storage:delete'
      );
      if (!identityAuth.authorized) {
        return (
          identityAuth.response ||
          new Response(
            JSON.stringify({
              success: false,
              error: 'Unauthorized: Admin authorization or owner signature required to delete storage objects.',
            }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
            }
          )
        );
      }

      // Verify that the signed envelope explicitly targets this key
      const payloadKey = delEnvelope?.payload?.key || delEnvelope?.payload?.targetKey || delEnvelope?.payload?.fileKey;
      if (!payloadKey || payloadKey !== key) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Forbidden: Signed envelope key "${payloadKey || '(missing)'}" does not match target deletion key "${key}".`,
          }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
        );
      }
      const envelopeAction = delEnvelope?.payload?.action;
      if (envelopeAction !== 'delete' && envelopeAction !== 'storage:delete') {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Forbidden: Signed envelope action "${envelopeAction || '(missing)'}" is not authorized for deletion. Must be "delete" or "storage:delete".`,
          }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
        );
      }

      // Check object existence and author in R2 or memory
      let objectAuthor: string | undefined;
      if (bucket) {
        try {
          const headObj = await bucket.head(key);
          if (headObj) {
            objectAuthor = headObj.customMetadata?.author;
          }
        } catch (_) {}
      }
      if (!objectAuthor) {
        const memObj = globalEdgeStorageMap.get(key);
        if (memObj) {
          objectAuthor = memObj.customMetadata?.author;
        }
      }

      if (!objectAuthor) {
        return new Response(
          JSON.stringify({ success: false, error: 'Object not found.' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
          }
        );
      }

      if (!requireOwnership(identityAuth.fingerprint, objectAuthor)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Forbidden: You do not have permission to delete this object (author mismatch).',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
          }
        );
      }
    }

    let deletedFromR2 = false;

    if (bucket) {
      try {
        recordClassAOp();
        await bucket.delete(key);
        deletedFromR2 = true;
        await releaseStorage(context.env, key);
      } catch (err: any) {
        if (isProductionEnv(context.env)) {
          return new Response(
            JSON.stringify({ success: false, error: `R2 delete failed: ${err?.message || err}` }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
          );
        }
      }
    } else if (isProductionEnv(context.env)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cloudflare R2 storage bucket unavailable. In-memory storage fallback is disabled in production.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS } }
      );
    }

    const memItem = globalEdgeStorageMap.get(key);
    const deletedSize = memItem ? memItem.size : 0;
    // The production map is a read cache, not a fallback. Evict it after a
    // confirmed deletion so an isolate cannot continue serving removed bytes.
    const deletedFromMemory = globalEdgeStorageMap.delete(key);

    if (deletedSize > 0) {
      currentTrackedStorageBytes = Math.max(0, currentTrackedStorageBytes - deletedSize);
    }
    await persistQuotaToStorage(context.env);

    // Remove from known SHA index
    for (const [hash, record] of knownSha256Index.entries()) {
      if (record.key === key) {
        knownSha256Index.delete(hash);
        break;
      }
    }

    // Invalidate directory listing cache
    clearListingCache();

    const wasDeleted = isProductionEnv(context.env) ? deletedFromR2 : (deletedFromR2 || deletedFromMemory);
    return new Response(
      JSON.stringify({
        success: wasDeleted,
        key,
        deletedFromR2,
        deletedFromMemory,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Delete error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...STORAGE_CORS_HEADERS },
      }
    );
  }
}
