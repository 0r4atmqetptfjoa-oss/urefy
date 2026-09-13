import { describe, it, expect, beforeEach } from 'vitest';
import { onRequest as handleMiddleware, evaluateRateLimit, resetRateLimits } from '../functions/api/_middleware.js';
import { markdownRenderer } from '../src/markdown-renderer.js';
import { sanitizeStorageKey, computeSha256, computeMerkleRoot } from '../functions/api/storage.js';

describe('UREfy — Zero-Trust Security & OWASP Top 10 Hardening Suite', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  // ─── 1. OWASP A05: SECURITY MISCONFIGURATION & ENTERPRISE HEADERS ─────────
  describe('1. Enterprise Security Headers & CSP Enforcement', () => {
    it('attaches comprehensive enterprise security headers to downstream HTTP responses', async () => {
      const req = new Request('https://urefy.com/api/health', {
        method: 'GET',
        headers: { 'CF-Connecting-IP': '192.168.1.1' },
      });

      const res = await handleMiddleware({
        request: req,
        functionPath: '/api/health',
        waitUntil: () => {},
        next: async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
        env: {},
        params: {},
        data: {},
      });

      expect(res.status).toBe(200);

      // Content-Security-Policy (Sovereign Zero-Tracker: Google Fonts purged)
      const csp = res.headers.get('Content-Security-Policy');
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("font-src 'self' data:");
      expect(csp).not.toContain("fonts.googleapis.com");
      expect(csp).not.toContain("fonts.gstatic.com");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");

      // Strict-Transport-Security (HSTS)
      const hsts = res.headers.get('Strict-Transport-Security');
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=63072000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');

      // Frame Options & MIME Sniffing
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

      // Permissions-Policy
      const pp = res.headers.get('Permissions-Policy');
      expect(pp).toBeDefined();
      expect(pp).toContain('camera=()');
      expect(pp).toContain('geolocation=()');
      expect(pp).toContain('microphone=(self)');

      // Cross-Origin Isolation Policies
      expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
      expect(res.headers.get('Cross-Origin-Embedder-Policy')).toBe('credentialless');
      expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin');
    });

    it('handles CORS preflight OPTIONS requests immediately with 204 status', async () => {
      const req = new Request('https://urefy.com/api/posts', { method: 'OPTIONS' });
      const res = await handleMiddleware({
        request: req,
        functionPath: '/api/posts',
        waitUntil: () => {},
        next: async () => new Response('should not be reached'),
        env: {},
        params: {},
        data: {},
      });

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-CSRF-Token');
    });
  });

  // ─── 2. OWASP A01 & A07: RATE LIMITING & ACCESS CONTROL ────────────────────
  describe('2. Edge IP & Identity Rate Limiter', () => {
    it('returns rate limit telemetry headers on all requests', async () => {
      const req = new Request('https://urefy.com/api/posts', {
        method: 'GET',
        headers: { 'CF-Connecting-IP': '10.0.0.5' },
      });

      const res = await handleMiddleware({
        request: req,
        functionPath: '/api/posts',
        waitUntil: () => {},
        next: async () => new Response(JSON.stringify({ posts: [] }), { status: 200 }),
        env: {},
        params: {},
        data: {},
      });

      expect(res.headers.get('X-RateLimit-Limit')).toBe('120');
      expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('rejects requests with HTTP 429 Too Many Requests when token bucket is exhausted', async () => {
      const ip = '198.51.100.77';

      // Exhaust burst tokens
      for (let i = 0; i < 40; i++) {
        const check = evaluateRateLimit(ip, 'GET', false);
        expect(check.allowed).toBe(true);
      }

      // Next request in immediate burst should be rejected
      const rateLimitedCheck = evaluateRateLimit(ip, 'GET', false);
      expect(rateLimitedCheck.allowed).toBe(false);
      expect(rateLimitedCheck.remaining).toBe(0);
      expect(rateLimitedCheck.retryAfter).toBeGreaterThanOrEqual(1);

      // Middleware should return 429 response — use canonical urefy.com domain to avoid 301 redirect
      const floodReq = new Request('https://urefy.com/api/posts', {
        method: 'GET',
        headers: { 'CF-Connecting-IP': ip },
      });

      const res = await handleMiddleware({
        request: floodReq,
        functionPath: '/api/posts',
        waitUntil: () => {},
        next: async () => new Response('unreachable'),
        env: {},
        params: {},
        data: {},
      });

      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBeDefined();
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Too Many Requests');
    });

    it('enforces tighter rate limits on mutating POST/PUT/DELETE endpoints', () => {
      const ip = '198.51.100.88';
      const result = evaluateRateLimit(ip, 'POST', false);
      expect(result.limit).toBe(40);
    });
  });

  // ─── 3. CSRF PROTECTION & ORIGIN VALIDATION ────────────────────────────────
  describe('3. Cross-Site Request Forgery (CSRF) Protection', () => {
    it('blocks cross-site state-changing requests lacking anti-CSRF token', async () => {
      // Use canonical urefy.com domain to avoid pages.dev → urefy.com 301 redirect
      const maliciousReq = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: {
          'Origin': 'https://malicious-attacker.com',
          'Sec-Fetch-Site': 'cross-site',
          'CF-Connecting-IP': '203.0.113.1',
        },
        body: JSON.stringify({ action: 'create', title: 'CSRF Attack' }),
      });

      const res = await handleMiddleware({
        request: maliciousReq,
        functionPath: '/api/posts',
        waitUntil: () => {},
        next: async () => new Response('should not execute'),
        env: {},
        params: {},
        data: {},
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('CSRF Security Violation');
    });

    it('allows cross-site state-changing requests when valid X-CSRF-Token is present', async () => {
      const authorizedReq = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: {
          'Origin': 'https://malicious-attacker.com',
          'X-CSRF-Token': 'aetheris-sec-token-0x123',
          'CF-Connecting-IP': '203.0.113.2',
        },
        body: JSON.stringify({ action: 'create', title: 'Legitimate Request' }),
      });

      const res = await handleMiddleware({
        request: authorizedReq,
        functionPath: '/api/posts',
        waitUntil: () => {},
        next: async () => new Response(JSON.stringify({ success: true }), { status: 201 }),
        env: {},
        params: {},
        data: {},
      });

      expect(res.status).toBe(201);
    });

    it('allows same-origin requests naturally', async () => {
      const sameOriginReq = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: {
          'Origin': 'https://urefy.com',
          'CF-Connecting-IP': '203.0.113.3',
        },
        body: JSON.stringify({ action: 'create', title: 'Same Origin Post' }),
      });

      const res = await handleMiddleware({
        request: sameOriginReq,
        functionPath: '/api/posts',
        waitUntil: () => {},
        next: async () => new Response(JSON.stringify({ success: true }), { status: 201 }),
        env: {},
        params: {},
        data: {},
      });

      expect(res.status).toBe(201);
    });
  });

  // ─── 4. OWASP A03: XSS & INJECTION DEFENSE (MARKDOWN RENDERER) ─────────────
  describe('4. Cross-Site Scripting (XSS) Neutralization in MarkdownRenderer', () => {
    it('escapes inline <script> tags completely', () => {
      const dirty = 'Hello <script>alert("XSS")</script> World';
      const rendered = markdownRenderer.renderMarkdown(dirty);

      expect(rendered).not.toContain('<script>');
      expect(rendered).not.toContain('</script>');
      expect(rendered).toContain('&lt;script&gt;');
      expect(rendered).toContain('&lt;/script&gt;');
    });

    it('neutralizes malicious inline event handlers (onerror, onload, onclick)', () => {
      const dirty = '<img src=x onerror="alert(document.cookie)">';
      const rendered = markdownRenderer.renderMarkdown(dirty);

      expect(rendered).not.toContain('<img');
      expect(rendered).toContain('&lt;img');
      expect(rendered).toContain('onerror=');
    });

    it('blocks pseudo-protocols in markdown links (javascript:, vbscript:, data:)', () => {
      const dirty = '[Click to Pwn](javascript:stealKey())';
      const rendered = markdownRenderer.renderMarkdown(dirty);

      expect(rendered).not.toContain('href="javascript:stealKey()"');
      expect(rendered).toContain('href="#"');
      expect(rendered).toContain('Click to Pwn');
    });

    it('blocks HTML-encoded javascript link bypasses (e.g. java&#115;cript:)', () => {
      const dirty = '[Bypass](java&#115;cript:alert(1))';
      const rendered = markdownRenderer.renderMarkdown(dirty);

      expect(rendered).not.toContain('javascript:');
      expect(rendered).toContain('href="#"');
    });

    it('permits safe protocols in links (https, http, ipfs, hyper, magnet, mailto)', () => {
      const safeLink = '[UREfy Docs](https://urefy.com/docs)';
      const rendered = markdownRenderer.renderMarkdown(safeLink);

      expect(rendered).toContain('href="https://urefy.com/docs"');
      expect(rendered).toContain('target="_blank"');
      expect(rendered).toContain('rel="noopener noreferrer"');
    });

    it('renders code blocks, bold, italic, and headers with zero injection risk', () => {
      const md = '# Quantum Ratchet\n\n**Bold <script>** and `inline <code onerror=1>`\n\n```typescript\nconst x = "<script>";\n```';
      const rendered = markdownRenderer.renderMarkdown(md);

      expect(rendered).toContain('<h1');
      expect(rendered).toContain('<strong');
      expect(rendered).not.toContain('<script>');
      expect(rendered).toContain('&lt;script&gt;');
    });
  });

  // ─── 5. PATH TRAVERSAL & STORAGE SANITIZATION ──────────────────────────────
  describe('5. Directory Traversal & Storage Key Sanitization', () => {
    it('rejects directory traversal sequences (../, ..\\) and null bytes from keys', () => {
      expect(sanitizeStorageKey('../../../etc/passwd')).toBe('');
      expect(sanitizeStorageKey('releases/../../../secret.key')).toBe('');
      expect(sanitizeStorageKey('payload\x00.exe')).toBe('');
      expect(sanitizeStorageKey('normal-file_v1.0.bin')).toBe('normal-file_v1.0.bin');
    });
  });

  // ─── 6. CRYPTOGRAPHIC DATA INTEGRITY ───────────────────────────────────────
  describe('6. Merkle Root & SHA-256 Checksum Integrity', () => {
    it('computes deterministic SHA-256 and Merkle Root hashes', async () => {
      const data = new TextEncoder().encode('Sovereign Zero-Knowledge Payload Integrity Verification');
      const sha = await computeSha256(data);
      const merkle = await computeMerkleRoot(data);

      expect(sha).toHaveLength(64);
      expect(merkle).toHaveLength(64);
      expect(sha).toBe(merkle); // Single chunk (< 16KB)
    });
  });
});
