// ════════════════════════════════════════════════════════════════════════════
// _middleware.ts — UREfy Edge Intelligence Layer v3 (With Live Access Telemetry)
// Cloudflare Pages Functions Middleware
// Features: CORS, CSRF, Rate Limiting, Bot Detection, Geo-Routing, Live Traffic Telemetry
// ════════════════════════════════════════════════════════════════════════════
import { isProductionEnv, globalBannedIPsStore, getD1Database, type Env } from './_db.js';

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
}

export type PagesFunction<
  Env = unknown,
  Params extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>;

// ─── LIVE EDGE TRAFFIC & ACCESS TELEMETRY ENGINE ─────────────────────────────
export interface EdgeAccessEvent {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  country: string;
  clientType: 'human' | 'good-bot' | 'bad-bot';
  blocked: boolean;
}

export interface RouteMetric {
  path: string;
  hits: number;
  totalDurationMs: number;
  avgMs: number;
  errors: number;
  lastAccessedAt: number;
}

class EdgeTrafficTelemetryEngine {
  public pageViews24h = 0;
  public apiRequests24h = 0;
  public attacksBlocked24h = 0;
  public estimatedEgressBytes24h = 0;
  public totalDurationMs = 0;
  public totalMeasuredRequests = 0;
  public activeVisitorTimestamps = new Map<string, number>(); // visitorHash -> lastSeenMs
  public hourlyHits = new Map<number, { pageViews: number; apiHits: number; blocked: number }>();
  public routeMetrics = new Map<string, RouteMetric>();
  public countryHits = new Map<string, number>();
  public recentRequests: EdgeAccessEvent[] = [];

  public reset(): void {
    this.pageViews24h = 0;
    this.apiRequests24h = 0;
    this.attacksBlocked24h = 0;
    this.estimatedEgressBytes24h = 0;
    this.totalDurationMs = 0;
    this.totalMeasuredRequests = 0;
    this.activeVisitorTimestamps.clear();
    this.hourlyHits.clear();
    this.routeMetrics.clear();
    this.countryHits.clear();
    this.recentRequests.length = 0;
  }

  public record(params: {
    method: string;
    pathname: string;
    status: number;
    durationMs: number;
    country: string;
    visitorKey: string;
    clientType: 'human' | 'good-bot' | 'bad-bot';
    blocked?: boolean;
    bytesEstimate?: number;
    now?: number;
  }): void {
    const now = params.now ?? Date.now();
    const hourBucket = Math.floor(now / 3_600_000) * 3_600_000;
    const isApi = params.pathname.startsWith('/api/');
    const isFeedRead = params.pathname === '/api/posts' && params.method === 'GET';
    const isPageView = (!isApi && params.method === 'GET') || isFeedRead;

    if (params.blocked || params.status === 403 || params.status === 429) {
      this.attacksBlocked24h++;
    }

    if (isPageView) {
      this.pageViews24h++;
    }
    if (isApi) {
      this.apiRequests24h++;
    }

    this.totalDurationMs += Math.max(1, params.durationMs);
    this.totalMeasuredRequests++;
    this.estimatedEgressBytes24h += params.bytesEstimate ?? (isPageView ? 28_672 : 4_096);

    // Track active & unique visitors (bounded map)
    if (params.visitorKey && params.clientType !== 'bad-bot') {
      if (this.activeVisitorTimestamps.size >= 5000) {
        const cutoff = now - 86_400_000;
        for (const [k, ts] of this.activeVisitorTimestamps.entries()) {
          if (ts < cutoff) this.activeVisitorTimestamps.delete(k);
          if (this.activeVisitorTimestamps.size < 4500) break;
        }
      }
      this.activeVisitorTimestamps.set(params.visitorKey, now);
    }

    // Track hourly bucket (keep last 24h)
    let hBucket = this.hourlyHits.get(hourBucket);
    if (!hBucket) {
      hBucket = { pageViews: 0, apiHits: 0, blocked: 0 };
      this.hourlyHits.set(hourBucket, hBucket);
      if (this.hourlyHits.size > 30) {
        const oldestHour = hourBucket - 25 * 3_600_000;
        for (const k of this.hourlyHits.keys()) {
          if (k < oldestHour) this.hourlyHits.delete(k);
        }
      }
    }
    if (isPageView) hBucket.pageViews++;
    if (isApi) hBucket.apiHits++;
    if (params.blocked || params.status === 403 || params.status === 429) hBucket.blocked++;

    // Normalize route for aggregation
    const normalizedPath = params.pathname
      .replace(/^\/api\/posts\/[^/]+$/, '/api/posts/:id')
      .replace(/^\/post\/[^/]+$/, '/post/:id')
      .replace(/^\/p\/[^/]+$/, '/p/:id')
      .replace(/^\/u\/[^/]+$/, '/u/:id')
      .replace(/^\/c\/[^/]+$/, '/c/:id');

    let rMetric = this.routeMetrics.get(normalizedPath);
    if (!rMetric) {
      if (this.routeMetrics.size >= 200) {
        const firstKey = this.routeMetrics.keys().next().value;
        if (firstKey) this.routeMetrics.delete(firstKey);
      }
      rMetric = {
        path: normalizedPath,
        hits: 0,
        totalDurationMs: 0,
        avgMs: 0,
        errors: 0,
        lastAccessedAt: now,
      };
      this.routeMetrics.set(normalizedPath, rMetric);
    }
    rMetric.hits++;
    rMetric.totalDurationMs += Math.max(1, params.durationMs);
    rMetric.avgMs = Math.round((rMetric.totalDurationMs / rMetric.hits) * 10) / 10;
    if (params.status >= 400) rMetric.errors++;
    rMetric.lastAccessedAt = now;

    // Country distribution
    const country = (params.country || 'XX').toUpperCase();
    this.countryHits.set(country, (this.countryHits.get(country) || 0) + 1);

    // Recent live requests ring buffer (last 80 requests, excluding noisy admin polling)
    if (params.pathname !== '/api/admin') {
      this.recentRequests.unshift({
        id: `req-${now}-${crypto.randomUUID().slice(0, 8)}`,
        timestamp: now,
        method: params.method,
        path: params.pathname,
        status: params.status,
        durationMs: Math.max(1, params.durationMs),
        country,
        clientType: params.clientType,
        blocked: Boolean(params.blocked || params.status === 403 || params.status === 429),
      });
      if (this.recentRequests.length > 80) {
        this.recentRequests.pop();
      }
    }
  }

  public getSnapshot(now = Date.now()) {
    const fiveMinAgo = now - 5 * 60_000;
    const dayAgo = now - 86_400_000;
    let onlineVisitors5m = 0;
    let uniqueVisitors24h = 0;

    for (const ts of this.activeVisitorTimestamps.values()) {
      if (ts >= dayAgo) uniqueVisitors24h++;
      if (ts >= fiveMinAgo) onlineVisitors5m++;
    }

    const recent1m = this.recentRequests.filter((r) => r.timestamp >= now - 60_000).length;
    const liveThroughputReqSec = Math.round((recent1m / 60) * 100) / 100;
    const avgEdgeRttMs =
      this.totalMeasuredRequests > 0
        ? Math.round((this.totalDurationMs / this.totalMeasuredRequests) * 10) / 10
        : 4.2;

    const topRoutes = Array.from(this.routeMetrics.values())
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 15);

    const topCountries = Array.from(this.countryHits.entries())
      .map(([country, hits]) => ({ country, hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 12);

    const hour = 3_600_000;
    const startHour = Math.floor(now / hour) * hour - 23 * hour;
    const hourlyTraffic = Array.from({ length: 24 }, (_, idx) => {
      const h = startHour + idx * hour;
      const bucket = this.hourlyHits.get(h);
      return {
        hour: h,
        pageViews: bucket?.pageViews || 0,
        apiHits: bucket?.apiHits || 0,
        blocked: bucket?.blocked || 0,
      };
    });

    const hasTraffic = this.totalMeasuredRequests > 0;
    return {
      onlineUsers: onlineVisitors5m > 0 ? onlineVisitors5m : (hasTraffic ? 1 : null),
      uniqueVisitors24h: uniqueVisitors24h > 0 ? uniqueVisitors24h : (hasTraffic ? 1 : null),
      pageViews24h: this.pageViews24h > 0 ? this.pageViews24h : null,
      apiRequests24h: this.apiRequests24h,
      egressGB24h: Math.round((this.estimatedEgressBytes24h / (1024 * 1024 * 1024)) * 1000) / 1000,
      egressMB24h: Math.round((this.estimatedEgressBytes24h / (1024 * 1024)) * 100) / 100,
      attacksBlocked: this.attacksBlocked24h,
      avgEdgeRttMs,
      liveThroughputReqSec,
      requestsPerMinute: recent1m,
      topRoutes,
      topCountries,
      hourlyTraffic,
      recentRequests: this.recentRequests.slice(0, 50),
    };
  }
}

export const edgeTrafficTelemetry = new EdgeTrafficTelemetryEngine();

export function recordEdgeAccess(params: Parameters<EdgeTrafficTelemetryEngine['record']>[0]): void {
  edgeTrafficTelemetry.record(params);
}

export function getEdgeTrafficSnapshot(now = Date.now()) {
  return edgeTrafficTelemetry.getSnapshot(now);
}

export function resetEdgeTrafficTelemetry(): void {
  edgeTrafficTelemetry.reset();
}

// ─── SENSITIVE ROUTES & PERMITTED ORIGINS ────────────────────────────────────
export const SENSITIVE_ROUTES = [
  '/api/admin',
  '/api/storage',
  '/api/push',
  '/api/cron-backup',
  '/api/webauthn',
];

export const CANONICAL_PRODUCTION_ORIGINS = new Set([
  'https://urefy.com',
  'https://www.urefy.com',
  'https://aetheris-omni-sphere.pages.dev',
  'https://aetheris.pages.dev',
  'https://aetheris.io',
]);

export const CANONICAL_PRODUCTION_HOSTS = new Set([
  'urefy.com',
  'www.urefy.com',
  'aetheris-omni-sphere.pages.dev',
  'aetheris.pages.dev',
  'aetheris.network',
  'aetheris.io',
]);

export const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isSensitiveRoute(pathname: string): boolean {
  return SENSITIVE_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

export function isPermittedOrigin(origin: string, requestUrl: URL, env?: any): boolean {
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const h = originUrl.hostname.toLowerCase();
    const isSensitive = isSensitiveRoute(requestUrl.pathname);
    const isProd = isProductionEnv(env);
    if (isSensitive) {
      const configured =
        env?.CORS_ALLOWED_ORIGINS ||
        env?.WEBAUTHN_ALLOWED_ORIGINS ||
        env?.WEBAUTHN_ALLOWED_ORIGIN;
      if (configured && typeof configured === 'string') {
        const list = configured
          .split(',')
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean);
        if (
          list.includes(origin.toLowerCase()) ||
          list.includes(originUrl.origin.toLowerCase()) ||
          list.includes(h)
        ) {
          return true;
        }
      }
      if (CANONICAL_PRODUCTION_HOSTS.has(h)) {
        return true;
      }
      if (!isProd && LOOPBACK_HOSTS.has(h)) {
        return true;
      }
      return false;
    }
    if (originUrl.host === requestUrl.host) return true;
    if (LOOPBACK_HOSTS.has(h)) return true;
    if (
      h === 'urefy.com' ||
      h.endsWith('.urefy.com') ||
      h === 'aetheris.network' ||
      h.endsWith('.aetheris.network') ||
      h === 'aetheris.io' ||
      h.endsWith('.aetheris.io') ||
      CANONICAL_PRODUCTION_HOSTS.has(h) ||
      (!isProd && (h === 'pages.dev' || h.endsWith('.pages.dev'))) ||
      (!isProd && h.endsWith('.local'))
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── CORS HEADERS GENERATOR ──────────────────────────────────────────────────
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, Upgrade, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Extensions, Sec-WebSocket-Protocol, X-URE-CSRF, X-CSRF-Token, X-Aetheris-CSRF, X-File-Name, X-Author, X-Title, X-Key, X-Sha256, X-Merkle-Root, X-Channel-Id, X-RLN-Nullifier, Cache-Control, X-Admin-PIN, X-Admin-Fingerprint, X-Sovereign-Envelope, X-User-Fingerprint, X-Facet-Id',
  'Access-Control-Expose-Headers':
    'Content-Disposition, Content-Length, Content-Type, X-SHA256-Checksum, X-Merkle-Root, X-Author, X-Title, X-Edge-Storage, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After, ETag, Cache-Control',
  'Access-Control-Max-Age': '86400',
};

export function getCorsHeaders(req: Request, env?: any): Record<string, string> {
  const url = new URL(req.url);
  const isSensitive = isSensitiveRoute(url.pathname);
  const origin = req.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': CORS_HEADERS['Access-Control-Allow-Headers'],
    'Access-Control-Expose-Headers': CORS_HEADERS['Access-Control-Expose-Headers'],
    'Access-Control-Max-Age': '86400',
  };
  if (isSensitive) {
    if (origin && isPermittedOrigin(origin, url, env)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
      headers['Vary'] = 'Origin';
    }
  } else {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }
  return headers;
}

// ─── SECURITY HEADERS ─────────────────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; manifest-src 'self' blob:; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https://images.unsplash.com https://*.ytimg.com https://*.youtube.com https://avatars.githubusercontent.com https:; media-src 'self' blob: data: https: https://commondatastorage.googleapis.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com blob:; child-src 'self' blob: https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; connect-src 'self' wss: ws: https:; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'accelerometer=(), ambient-light-sensor=(), autoplay=(self), battery=(), camera=(), display-capture=(self), encrypted-media=(self), fullscreen=(self), geolocation=(), gyroscope=(), interest-cohort=(), magnetometer=(), microphone=(self), midi=(), payment=(), picture-in-picture=(self), publickey-credentials-get=(self), usb=(), xr-spatial-tracking=(), clipboard-write=(self)',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'X-XSS-Protection': '0',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'X-DNS-Prefetch-Control': 'on',
  'Alt-Svc': 'h3=":443"; ma=86400',
};

// ─── BOT DETECTION ────────────────────────────────────────────────────────────
const BAD_BOT_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /nmap/i,
  /dirbuster/i,
  /zgrab/i,
  /python-requests\/2\.[0-3]/i,
  /go-http-client\/1\.1/i,
  /curl\/[0-6]/i,
  /libwww-perl/i,
  /scrapy/i,
];

const GOOD_BOTS = [
  'Googlebot',
  'Bingbot',
  'Slurp',
  'DuckDuckBot',
  'Baiduspider',
  'facebookexternalhit',
  'MicroBroadcastBot',
  'LinkedInBot',
];

function classifyRequest(req: Request): { isBadBot: boolean; isGoodBot: boolean; isHuman: boolean } {
  const ua = req.headers.get('User-Agent') || '';
  const isBadBot = BAD_BOT_PATTERNS.some((p) => p.test(ua));
  const isGoodBot = GOOD_BOTS.some((b) => ua.includes(b));
  return { isBadBot, isGoodBot, isHuman: !isBadBot && !isGoodBot };
}

// ─── SLIDING-WINDOW + TOKEN BUCKET RATE LIMITER ──────────────────────────────
interface RateLimitRecord {
  timestamps: number[];
  tokens: number;
  lastRefill: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const MAX_STORE_SIZE = 10000;

export function evaluateRateLimit(
  ip: string,
  method: string,
  isBadBot: boolean,
  now = Date.now(),
  pathname = ''
): { allowed: boolean; limit: number; remaining: number; reset: number; retryAfter?: number } {
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
  const isHighThroughput =
    pathname.startsWith('/api/vault-sync') || pathname.startsWith('/api/direct-messages');
  const bucketType = isBadBot ? 'bot' : isHighThroughput ? 'ht' : isMutation ? 'mut' : 'read';
  const storeKey = `${ip}:${bucketType}`;
  const limit = isBadBot ? 10 : isHighThroughput ? 240 : isMutation ? 60 : 120;
  const burstCapacity = isBadBot ? 3 : isHighThroughput ? 80 : isMutation ? 30 : 40;
  const windowMs = 60000;
  const refillRate = limit / 60;

  let record = rateLimitStore.get(storeKey);
  if (!record) {
    if (rateLimitStore.size >= MAX_STORE_SIZE) {
      const staleThreshold = now - 120000;
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.lastRefill < staleThreshold) rateLimitStore.delete(k);
        if (rateLimitStore.size < MAX_STORE_SIZE - 100) break;
      }
    }
    record = { timestamps: [], tokens: burstCapacity, lastRefill: now };
    rateLimitStore.set(storeKey, record);
  }

  const elapsedSec = Math.max(0, (now - record.lastRefill) / 1000);
  record.tokens = Math.min(burstCapacity, record.tokens + elapsedSec * refillRate);
  record.lastRefill = now;

  const windowStart = now - windowMs;
  while (record.timestamps.length > 0 && record.timestamps[0] <= windowStart) {
    record.timestamps.shift();
  }

  const reset = Math.ceil((now + windowMs) / 1000);
  if (record.timestamps.length >= limit * 2 || record.tokens < 1) {
    const retryAfter = Math.max(1, Math.ceil((1 - record.tokens) / refillRate));
    return { allowed: false, limit, remaining: 0, reset, retryAfter };
  }

  record.tokens -= 1;
  record.timestamps.push(now);
  return { allowed: true, limit, remaining: Math.max(0, Math.floor(record.tokens)), reset };
}

export function resetRateLimits(): void {
  rateLimitStore.clear();
}

// ─── CSRF VALIDATION ──────────────────────────────────────────────────────────
function validateCSRF(request: Request): { valid: boolean; reason?: string } {
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return { valid: true };
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/federation') || url.pathname.includes('federation')) {
    return { valid: true };
  }
  const secFetchSite = request.headers.get('Sec-Fetch-Site');
  const csrfToken =
    request.headers.get('X-URE-CSRF') ||
    request.headers.get('X-CSRF-Token') ||
    request.headers.get('X-Aetheris-CSRF');
  if (secFetchSite === 'cross-site' && !csrfToken && !request.headers.get('Authorization')) {
    return { valid: false, reason: 'Cross-site state-changing requests require Anti-CSRF token.' };
  }
  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const requestUrl = new URL(request.url);
      const isSameHost = originUrl.host === requestUrl.host;
      const isAllowedLocal =
        LOOPBACK_HOSTS.has(originUrl.hostname.toLowerCase()) ||
        CANONICAL_PRODUCTION_HOSTS.has(originUrl.hostname.toLowerCase());
      if (!isSameHost && !isAllowedLocal && !csrfToken) {
        return { valid: false, reason: `Untrusted Origin: ${origin}` };
      }
    } catch {
      return { valid: false, reason: 'Malformed Origin header' };
    }
  }
  return { valid: true };
}

// ─── SECRET SANITIZATION ──────────────────────────────────────────────────────
export function sanitizeResponseBody(bodyText: string): string {
  return bodyText
    .replace(
      /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----)/g,
      '[REDACTED]'
    )
    .replace(/"(?:password|secret|privateKey|secretKey)":\s*"[^"]+"/gi, '"secret":"[PROTECTED]"');
}

// ─── EDGE GEO RESPONSE HEADERS ────────────────────────────────────────────────
function getEdgeHeaders(req: Request): Record<string, string> {
  const cfHeaders: Record<string, string> = {};
  const country = req.headers.get('CF-IPCountry');
  const ray = req.headers.get('CF-Ray');
  const region = req.headers.get('CF-Region');
  if (country) cfHeaders['X-Edge-Country'] = country;
  if (ray) cfHeaders['X-Edge-Ray'] = ray;
  if (region) cfHeaders['X-Edge-Region'] = region;
  cfHeaders['X-Edge-Runtime'] = 'Cloudflare-Workers-v2';
  cfHeaders['X-Response-Time'] = String(Date.now());
  return cfHeaders;
}

// ─── MIDDLEWARE ENTRY POINT ───────────────────────────────────────────────────
export const onRequest: PagesFunction<Env> = async (context) => {
  const req = context.request;
  const method = req.method;
  const url = new URL(req.url);
  const now = Date.now();

  // ── 0. Canonical domain redirect — pages.dev → urefy.com ─────────────────
  const isQaEnv =
    url.hostname.startsWith('qa.') ||
    url.searchParams.get('qa') === '1' ||
    req.headers.get('X-QA-Environment') === '1' ||
    context.env?.ENVIRONMENT === 'staging' ||
    context.env?.ENVIRONMENT === 'qa';
  const isWebSocketUpgrade = req.headers.get('Upgrade')?.toLowerCase() === 'websocket';
  if (
    !isQaEnv &&
    !isWebSocketUpgrade &&
    (url.hostname === 'aetheris-omni-sphere.pages.dev' ||
      (url.hostname.endsWith('.pages.dev') &&
        !url.hostname.startsWith('qa-') &&
        !url.hostname.startsWith('qa.')))
  ) {
    const redirectUrl = new URL(req.url);
    redirectUrl.hostname = 'urefy.com';
    redirectUrl.protocol = 'https:';
    redirectUrl.port = '';
    return Response.redirect(redirectUrl.toString(), 301);
  }

  const corsHeaders = getCorsHeaders(req, context.env);

  // ── 1. OPTIONS preflight ─────────────────────────────────────────────────
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const clientIp =
    req.headers.get('CF-Connecting-IP') ||
    req.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    req.headers.get('X-Real-IP') ||
    'unknown';
  const country = req.headers.get('CF-IPCountry') || 'RO';
  const visitorFp = req.headers.get('X-User-Fingerprint') || clientIp;

  // ── 2. Bot Classification ─────────────────────────────────────────────────
  const { isBadBot, isGoodBot } = classifyRequest(req);
  const clientType: 'human' | 'good-bot' | 'bad-bot' = isBadBot
    ? 'bad-bot'
    : isGoodBot
    ? 'good-bot'
    : 'human';

  if (isBadBot && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    recordEdgeAccess({
      method,
      pathname: url.pathname,
      status: 403,
      durationMs: 1,
      country,
      visitorKey: visitorFp,
      clientType,
      blocked: true,
      now,
    });
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // ── 3. Client IP & WAF IP Ban Ledger ──────────────────────────────────────
  const isMutatingMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
  if (clientIp !== 'unknown') {
    for (let i = globalBannedIPsStore.length - 1; i >= 0; i--) {
      const b = globalBannedIPsStore[i];
      if (b.expiresAt !== 0 && b.expiresAt <= now) {
        globalBannedIPsStore.splice(i, 1);
      }
    }
    let activeBan = globalBannedIPsStore.find(
      (b) => b.ip === clientIp && (b.expiresAt === 0 || b.expiresAt > now)
    );
    if (!activeBan && isMutatingMethod) {
      const db = getD1Database(context.env);
      if (db) {
        try {
          const row = await db
            .prepare(
              'SELECT ip, reason, banned_at, expires_at FROM waf_banned_ips WHERE ip = ? AND (expires_at = 0 OR expires_at > ?) LIMIT 1'
            )
            .bind(clientIp, now)
            .first<{ ip: string; reason: string; banned_at: number; expires_at: number }>();
          if (row) {
            activeBan = {
              ip: row.ip,
              reason: row.reason,
              bannedAt: row.banned_at,
              expiresAt: row.expires_at,
            };
            const existingIdx = globalBannedIPsStore.findIndex((b) => b.ip === row.ip);
            if (existingIdx >= 0) globalBannedIPsStore[existingIdx] = activeBan;
            else {
              globalBannedIPsStore.unshift(activeBan);
              if (globalBannedIPsStore.length > 1000) globalBannedIPsStore.pop();
            }
          }
        } catch (_) {}
      }
    }
    if (activeBan) {
      recordEdgeAccess({
        method,
        pathname: url.pathname,
        status: 403,
        durationMs: 1,
        country,
        visitorKey: visitorFp,
        clientType,
        blocked: true,
        now,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: `Forbidden by Sovereign WAF: ${activeBan.reason || 'Administrative WAF Block'}`,
          expiresAt: activeBan.expiresAt,
          banned: true,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders, ...SECURITY_HEADERS },
        }
      );
    }
  }

  // ── 4. Rate Limiting ──────────────────────────────────────────────────────
  const rl = evaluateRateLimit(clientIp, method, isBadBot, now, url.pathname);
  if (!rl.allowed) {
    const retryAfter = rl.retryAfter || 60;
    recordEdgeAccess({
      method,
      pathname: url.pathname,
      status: 429,
      durationMs: 1,
      country,
      visitorKey: visitorFp,
      clientType,
      blocked: true,
      now,
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Too Many Requests: Edge rate limit exceeded. Please throttle your requests.',
        retryAfterSeconds: retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rl.reset),
          ...corsHeaders,
        },
      }
    );
  }

  const kv = (context.env as any)?.KV || (context.env as any)?.CACHE_KV;
  if (
    kv &&
    typeof kv.get === 'function' &&
    typeof kv.put === 'function' &&
    (isMutatingMethod || rl.remaining < 10)
  ) {
    try {
      const currentMinute = Math.floor(now / 60000);
      const bucketPrefix = isMutatingMethod ? 'mut' : 'read';
      const kvKey = `ratelimit:${bucketPrefix}:${clientIp}:${currentMinute}`;
      const rawCount = await kv.get(kvKey);
      const count = rawCount ? parseInt(rawCount, 10) || 0 : 0;
      if (count >= rl.limit) {
        const retryAfter = Math.max(1, Math.ceil(((currentMinute + 1) * 60000 - now) / 1000));
        recordEdgeAccess({
          method,
          pathname: url.pathname,
          status: 429,
          durationMs: 2,
          country,
          visitorKey: visitorFp,
          clientType,
          blocked: true,
          now,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error:
              'Too Many Requests: Distributed edge rate limit exceeded. Please throttle your requests.',
            retryAfterSeconds: retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(rl.limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String((currentMinute + 1) * 60),
              ...corsHeaders,
            },
          }
        );
      }
      const kvPromise = kv.put(kvKey, String(count + 1), { expirationTtl: 120 });
      if (context.waitUntil) {
        context.waitUntil(kvPromise);
      } else {
        await kvPromise;
      }
    } catch {}
  }

  // ── 5. CSRF Validation ────────────────────────────────────────────────────
  const csrf = validateCSRF(req);
  if (!csrf.valid) {
    recordEdgeAccess({
      method,
      pathname: url.pathname,
      status: 403,
      durationMs: 1,
      country,
      visitorKey: visitorFp,
      clientType,
      blocked: true,
      now,
    });
    return new Response(
      JSON.stringify({ success: false, error: `CSRF Security Violation: ${csrf.reason}` }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders, ...SECURITY_HEADERS },
      }
    );
  }

  // ── 6. Request Correlation ID & Execution ────────────────────────────────
  const requestId =
    req.headers.get('cf-ray') ||
    req.headers.get('x-request-id') ||
    'req_' + Date.now().toString(36) + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  const startMs = Date.now();
  let response: Response;
  try {
    response = await context.next();
  } catch (edgeErr: any) {
    const errorMsg = edgeErr?.message || String(edgeErr);
    console.error(`[EdgeUnhandledError:${requestId}]`, errorMsg);
    recordEdgeAccess({
      method,
      pathname: url.pathname,
      status: 500,
      durationMs: Date.now() - startMs,
      country,
      visitorKey: visitorFp,
      clientType,
      now,
    });
    const isD1DailyLimit =
      errorMsg.includes('daily limit') ||
      errorMsg.includes('D1_ERROR: query rejected') ||
      (errorMsg.includes('D1') && errorMsg.includes('limit'));
    if (isD1DailyLimit) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Daily database query allowance reached on the sovereign edge. UREfy is operating in read-only preservation mode until reset at 00:00 UTC.',
          code: 'D1_DAILY_LIMIT_EXCEEDED',
          retryAfterUtc: '00:00:00Z',
          requestId,
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '3600',
            'X-Request-Id': requestId,
            ...corsHeaders,
            ...SECURITY_HEADERS,
          },
        }
      );
    }
    return new Response(
      JSON.stringify({
        success: false,
        error: `Something went wrong. Reference: ${requestId}`,
        requestId,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
          ...corsHeaders,
          ...SECURITY_HEADERS,
        },
      }
    );
  }

  if (response.status === 101) return response;
  const durationMs = Date.now() - startMs;

  // Record live access telemetry
  recordEdgeAccess({
    method,
    pathname: url.pathname,
    status: response.status,
    durationMs,
    country,
    visitorKey: visitorFp,
    clientType,
    now,
  });

  // ── 7. Build enriched response headers ───────────────────────────────────
  const newHeaders = new Headers(response.headers);
  const isSensitive = isSensitiveRoute(url.pathname);
  if (isSensitive) {
    if (newHeaders.get('Access-Control-Allow-Origin') === '*') {
      newHeaders.delete('Access-Control-Allow-Origin');
      newHeaders.delete('Access-Control-Allow-Credentials');
    }
    const routeAcao = newHeaders.get('Access-Control-Allow-Origin');
    if (routeAcao) {
      if (!isPermittedOrigin(routeAcao, url, context.env)) {
        newHeaders.delete('Access-Control-Allow-Origin');
        newHeaders.delete('Access-Control-Allow-Credentials');
      } else {
        newHeaders.set('Access-Control-Allow-Credentials', 'true');
        newHeaders.set('Vary', 'Origin');
      }
    } else if (corsHeaders['Access-Control-Allow-Origin']) {
      newHeaders.set('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
      newHeaders.set('Access-Control-Allow-Credentials', 'true');
      newHeaders.set('Vary', 'Origin');
    } else {
      newHeaders.delete('Access-Control-Allow-Origin');
      newHeaders.delete('Access-Control-Allow-Credentials');
    }
    for (const [k, v] of Object.entries(corsHeaders)) {
      if (k !== 'Access-Control-Allow-Origin' && k !== 'Access-Control-Allow-Credentials') {
        if (!newHeaders.has(k)) newHeaders.set(k, v);
      }
    }
  } else {
    for (const [k, v] of Object.entries(corsHeaders)) {
      if (!newHeaders.has(k)) newHeaders.set(k, v);
    }
  }

  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(k, v);
  }
  newHeaders.set('X-RateLimit-Limit', String(rl.limit));
  newHeaders.set('X-RateLimit-Remaining', String(rl.remaining));
  newHeaders.set('X-RateLimit-Reset', String(rl.reset));
  newHeaders.set('X-Request-Id', requestId);
  newHeaders.set('X-Response-Duration-Ms', String(durationMs));
  newHeaders.set('Server-Timing', `edge;dur=${durationMs};desc="Cloudflare Edge Worker"`);
  for (const [k, v] of Object.entries(getEdgeHeaders(req))) {
    newHeaders.set(k, v);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
