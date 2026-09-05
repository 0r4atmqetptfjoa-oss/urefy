// ════════════════════════════════════════════════════════════════════════════
// _middleware.ts — Aetheris Edge Intelligence Layer v2
// Cloudflare Pages Functions Middleware
// Features: CORS, CSRF, Rate Limiting, Bot Detection, Geo-Routing, ETag, Perf
// ════════════════════════════════════════════════════════════════════════════

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

// ─── SENSITIVE ROUTES & PERMITTED ORIGINS ────────────────────────────────────
export const SENSITIVE_ROUTES = ['/api/admin', '/api/storage', '/api/push', '/api/cron-backup'];

export function isSensitiveRoute(pathname: string): boolean {
  return SENSITIVE_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

export function isPermittedOrigin(origin: string, requestUrl: URL): boolean {
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    // 1. Same host & port
    if (originUrl.host === requestUrl.host) return true;
    // 2. Localhost / loopback development
    const h = originUrl.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]') return true;
    // 3. Whitelisted sovereign network domains
    if (
      h === 'aetheris.network' ||
      h.endsWith('.aetheris.network') ||
      h === 'aetheris.io' ||
      h.endsWith('.aetheris.io') ||
      h === 'pages.dev' ||
      h.endsWith('.pages.dev') ||
      h.endsWith('.local')
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
    'Content-Type, Authorization, X-Requested-With, Upgrade, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Extensions, Sec-WebSocket-Protocol, X-CSRF-Token, X-Aetheris-CSRF, X-File-Name, X-Author, X-Title, X-Key, X-Sha256, X-Merkle-Root, X-Channel-Id, X-RLN-Nullifier, Cache-Control, X-Admin-PIN, X-Admin-Fingerprint',
  'Access-Control-Expose-Headers':
    'Content-Disposition, Content-Length, Content-Type, X-SHA256-Checksum, X-Merkle-Root, X-Author, X-Title, X-Edge-Storage, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After, ETag, Cache-Control',
  'Access-Control-Max-Age': '86400',
};

export function getCorsHeaders(req: Request): Record<string, string> {
  const url = new URL(req.url);
  const isSensitive = isSensitiveRoute(url.pathname);
  const origin = req.headers.get('Origin');

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, Upgrade, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Extensions, Sec-WebSocket-Protocol, X-CSRF-Token, X-Aetheris-CSRF, X-File-Name, X-Author, X-Title, X-Key, X-Sha256, X-Merkle-Root, X-Channel-Id, X-RLN-Nullifier, Cache-Control, X-Admin-PIN, X-Admin-Fingerprint',
    'Access-Control-Expose-Headers':
      'Content-Disposition, Content-Length, Content-Type, X-SHA256-Checksum, X-Merkle-Root, X-Author, X-Title, X-Edge-Storage, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After, ETag, Cache-Control',
    'Access-Control-Max-Age': '86400',
  };

  if (isSensitive) {
    if (origin && isPermittedOrigin(origin, url)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
      headers['Vary'] = 'Origin';
    }
    // On sensitive routes, DO NOT emit Access-Control-Allow-Origin: '*'
  } else {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }

  return headers;
}

// ─── SECURITY HEADERS ─────────────────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; manifest-src 'self' blob:; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https://*; media-src 'self' blob: data: https://*; connect-src 'self' wss: ws: https:; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;",
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
  // HTTP/3 QUIC upgrade hint
  'Alt-Svc': 'h3=":443"; ma=86400',
};

// ─── BOT DETECTION ────────────────────────────────────────────────────────────
const BAD_BOT_PATTERNS = [
  /sqlmap/i, /nikto/i, /masscan/i, /nmap/i, /dirbuster/i,
  /zgrab/i, /python-requests\/2\.[0-3]/i, /go-http-client\/1\.1/i,
  /curl\/[0-6]/i, /libwww-perl/i, /scrapy/i,
];

const GOOD_BOTS = ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider', 'facebookexternalhit', 'MicroBroadcastBot', 'LinkedInBot'];

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
  now = Date.now()
): { allowed: boolean; limit: number; remaining: number; reset: number; retryAfter?: number } {
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
  // Bad bots get much tighter limits
  const limit = isBadBot ? 10 : isMutation ? 40 : 120;
  const burstCapacity = isBadBot ? 3 : isMutation ? 15 : 40;
  const windowMs = 60000;
  const refillRate = limit / 60;

  let record = rateLimitStore.get(ip);
  if (!record) {
    if (rateLimitStore.size >= MAX_STORE_SIZE) {
      const staleThreshold = now - 120000;
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.lastRefill < staleThreshold) rateLimitStore.delete(k);
        if (rateLimitStore.size < MAX_STORE_SIZE - 100) break;
      }
    }
    record = { timestamps: [], tokens: burstCapacity, lastRefill: now };
    rateLimitStore.set(ip, record);
  }

  const elapsedSec = (now - record.lastRefill) / 1000;
  record.tokens = Math.min(burstCapacity, record.tokens + elapsedSec * refillRate);
  record.lastRefill = now;

  const windowStart = now - windowMs;
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

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
  const csrfToken = request.headers.get('X-CSRF-Token') || request.headers.get('X-Aetheris-CSRF');

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
        originUrl.hostname === 'localhost' ||
        originUrl.hostname === '127.0.0.1' ||
        originUrl.hostname.endsWith('.pages.dev');

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
function sanitizeResponseBody(bodyText: string): string {
  return bodyText
    .replace(/(?:-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----)/g, '[REDACTED]')
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
export const onRequest: PagesFunction = async (context) => {
  const req = context.request;
  const method = req.method;
  const url = new URL(req.url);
  const now = Date.now();

  const corsHeaders = getCorsHeaders(req);

  // ── 1. OPTIONS preflight ─────────────────────────────────────────────────
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ── 2. Bot Classification ─────────────────────────────────────────────────
  const { isBadBot, isGoodBot } = classifyRequest(req);

  // Block bad bots outright from mutating endpoints
  if (isBadBot && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // ── 3. Client IP ──────────────────────────────────────────────────────────
  const clientIp =
    req.headers.get('CF-Connecting-IP') ||
    req.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    req.headers.get('X-Real-IP') ||
    'unknown';

  // ── 4. Rate Limiting ──────────────────────────────────────────────────────
  const rl = evaluateRateLimit(clientIp, method, isBadBot, now);
  if (!rl.allowed) {
    const retryAfter = rl.retryAfter || 60;
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

  // ── 5. CSRF Validation ────────────────────────────────────────────────────
  const csrf = validateCSRF(req);
  if (!csrf.valid) {
    return new Response(
      JSON.stringify({ success: false, error: `CSRF Security Violation: ${csrf.reason}` }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders, ...SECURITY_HEADERS },
      }
    );
  }

  // ── 6. Execute route handler ──────────────────────────────────────────────
  const startMs = Date.now();
  const response = await context.next();

  // WebSocket upgrades pass through
  if (response.status === 101) return response;

  const durationMs = Date.now() - startMs;

  // ── 7. Build enriched response headers ───────────────────────────────────
  const newHeaders = new Headers(response.headers);
  const isSensitive = isSensitiveRoute(url.pathname);

  // CORS enforcement: On sensitive routes, never emit Access-Control-Allow-Origin: '*'
  if (isSensitive) {
    if (newHeaders.get('Access-Control-Allow-Origin') === '*') {
      newHeaders.delete('Access-Control-Allow-Origin');
    }
    if (corsHeaders['Access-Control-Allow-Origin']) {
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
  // Security
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(k, v);
  }
  // Rate limit info
  newHeaders.set('X-RateLimit-Limit', String(rl.limit));
  newHeaders.set('X-RateLimit-Remaining', String(rl.remaining));
  newHeaders.set('X-RateLimit-Reset', String(rl.reset));
  // Performance telemetry
  newHeaders.set('X-Response-Duration-Ms', String(durationMs));
  newHeaders.set('Server-Timing', `edge;dur=${durationMs};desc="Cloudflare Edge Worker"`);
  // Edge geo info
  for (const [k, v] of Object.entries(getEdgeHeaders(req))) {
    newHeaders.set(k, v);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

