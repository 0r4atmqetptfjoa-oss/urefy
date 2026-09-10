/**
 * @file _ssrf-guard.ts
 * @description Fail-closed SSRF Guard for Edge and Serverless Outbound HTTP Requests.
 *
 * Implements strict protection against Server-Side Request Forgery (SSRF) across
 * all node federation, ActivityPub discovery, and external webhook integrations:
 * - Scheme enforcement (HTTPS only in production)
 * - Credential injection rejection (user:pass@host)
 * - Comprehensive private/loopback/link-local/multicast IP blocking (IPv4 and IPv6)
 * - Hex, Octal, Dword, and IPv4-mapped IPv6 encoding normalization
 * - Strict redirect following with per-hop destination validation (max 3 redirects)
 * - Response size capping (1 MB max) and timeout enforcement (default 5000ms)
 */

export interface SafeUrlOptions {
  allowLocalDev?: boolean;
  maxRedirects?: number;
  timeoutMs?: number;
  maxSizeBytes?: number;
  allowedContentTypes?: string[];
  /** Injectable for tests. Production defaults to DNS-over-HTTPS. */
  resolveHostname?: (hostname: string) => Promise<string[]>;
}

function isIpLiteral(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '');
  return host.includes(':') || /^\d{1,4}(?:\.\d{1,4}){3}$/.test(host) || /^0x/i.test(host) || /^\d+$/.test(host);
}

async function resolvePublicAddresses(hostname: string): Promise<string[]> {
  const answers: string[] = [];
  for (const type of ['A', 'AAAA']) {
    const endpoint = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`;
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/dns-json' },
      redirect: 'error',
    });
    if (!response.ok) throw new Error(`DNS resolution failed with HTTP ${response.status}`);
    const payload = await response.json() as { Answer?: Array<{ type: number; data: string }> };
    for (const answer of payload.Answer || []) {
      if ((answer.type === 1 || answer.type === 28) && typeof answer.data === 'string') answers.push(answer.data);
    }
  }
  if (answers.length === 0) throw new Error('Hostname resolved to no A or AAAA addresses');
  return answers;
}

async function assertPublicDnsTarget(url: URL, options: SafeUrlOptions): Promise<void> {
  if (options.allowLocalDev || isIpLiteral(url.hostname)) return;
  const resolver = options.resolveHostname || resolvePublicAddresses;
  const addresses = await resolver(url.hostname);
  if (addresses.length === 0 || addresses.some((address) => parseAndCheckHostIp(address, false))) {
    throw new Error(`SSRF Guard rejected DNS resolution for ${url.hostname}`);
  }
}

async function readBoundedResponse(response: Response, maxSizeBytes: number): Promise<Response> {
  if (!response.body) return response;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxSizeBytes) {
      await reader.cancel();
      throw new Error(`Response body exceeds maximum limit (${maxSizeBytes} bytes)`);
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

export interface SafeUrlValidationResult {
  safe: boolean;
  error?: string;
  url?: URL;
}

/** Default response limits */
export const DEFAULT_SSRF_TIMEOUT_MS = 5000;
export const DEFAULT_MAX_REDIRECTS = 3;
export const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024; // 1 MB

/**
 * Checks whether an IPv4 address string falls into any reserved, private, loopback,
 * link-local, or multicast range.
 */
export function isForbiddenIPv4(ip: string): boolean {
  const rawParts = ip.split('.');
  if (rawParts.length !== 4) return true;

  const parts = rawParts.map((p) => {
    // Detect octal notation (e.g. 0177)
    if (p.length > 1 && p.startsWith('0') && !p.startsWith('0x')) {
      return parseInt(p, 8);
    }
    return parseInt(p, 10);
  });

  if (parts.some(isNaN) || parts.some((p) => p < 0 || p > 255)) {
    return true;
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 10.0.0.0/8 (Private)
  if (b0 === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 169.254.0.0/16 (Link-Local & Cloud Metadata e.g. 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 100.64.0.0/10 (carrier-grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 192.168.0.0/16 (Private)
  if (b0 === 192 && b1 === 168) return true;

  // Non-routable protocol and documentation networks
  if (b0 === 192 && b1 === 0 && (parts[2] === 0 || parts[2] === 2)) return true;
  if (b0 === 198 && (b1 === 18 || b1 === 19 || (b1 === 51 && parts[2] === 100))) return true;
  if (b0 === 203 && b1 === 0 && parts[2] === 113) return true;

  // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved) & 255.255.255.255 (Broadcast)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Checks whether an IPv6 address string falls into any reserved, loopback, or private range.
 */
export function isForbiddenIPv6(rawIp: string): boolean {
  const ip = rawIp.toLowerCase().trim();

  // Loopback ::1
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1' || ip === '::01') return true;

  // Unspecified ::
  if (ip === '::' || ip === '0:0:0:0:0:0:0:0') return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x or ::ffff:hex)
  if (ip.startsWith('::ffff:') || ip.includes(':ffff:')) {
    const lastColon = ip.lastIndexOf(':');
    const embedded = ip.substring(lastColon + 1);
    if (embedded.includes('.')) {
      return isForbiddenIPv4(embedded);
    }
    const tail = ip.slice(ip.lastIndexOf('ffff:') + 5).split(':');
    if (tail.length === 2 && tail.every((part) => /^[0-9a-f]{1,4}$/i.test(part))) {
      const high = parseInt(tail[0], 16);
      const low = parseInt(tail[1], 16);
      return isForbiddenIPv4(`${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`);
    }
    return true;
  }

  // Link-Local (fe80::/10 -> fe8, fe9, fea, feb)
  if (/^fe[89ab]/i.test(ip)) return true;

  // Unique Local Address (fc00::/7 -> fc, fd)
  if (/^f[cd]/i.test(ip)) return true;

  // Multicast (ff00::/8)
  if (/^ff/i.test(ip)) return true;

  // Documentation and discard-only ranges
  if (/^2001:db8(?::|$)/i.test(ip) || /^100:(?::|$)/i.test(ip)) return true;

  return false;
}

/**
 * Detects whether a hostname string is an IP address in decimal, hex, octal, or dword format.
 */
export function parseAndCheckHostIp(host: string, allowLocalDev: boolean = false): boolean {
  const cleanHost = host.replace(/^\[|\]$/g, '').toLowerCase().trim();

  // Direct localhost string
  if (cleanHost === 'localhost' || cleanHost.endsWith('.localhost') || cleanHost.endsWith('.local') || cleanHost.endsWith('.internal')) {
    return !allowLocalDev;
  }

  // Standard or octal IPv4 dotted quad pattern (1 to 4 digits per segment)
  if (/^\d{1,4}\.\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(cleanHost)) {
    if (allowLocalDev && (cleanHost === '127.0.0.1' || cleanHost.startsWith('127.'))) {
      return false;
    }
    return isForbiddenIPv4(cleanHost);
  }

  // Standard or compressed IPv6 pattern
  if (cleanHost.includes(':')) {
    if (allowLocalDev && cleanHost === '::1') {
      return false;
    }
    return isForbiddenIPv6(cleanHost);
  }

  // Hex representation (e.g. 0x7f000001 or 0x7f.1)
  if (/^0x[0-9a-f]+(\.0x[0-9a-f]+)*$/i.test(cleanHost)) {
    try {
      const parts = cleanHost.split('.');
      if (parts.length === 1) {
        // Dword hex
        const num = parseInt(parts[0], 16);
        const ip = [
          (num >>> 24) & 255,
          (num >>> 16) & 255,
          (num >>> 8) & 255,
          num & 255,
        ].join('.');
        return isForbiddenIPv4(ip);
      }
    } catch {
      return true;
    }
    return true; // Deny unusual multi-part hex by default
  }

  // Octal representation (e.g. 0177.0.0.1)
  if (/^0[0-7]+(\.0[0-7]+)*$/.test(cleanHost)) {
    return true;
  }

  // Integer / Dword representation (e.g. 2130706433)
  if (/^\d+$/.test(cleanHost)) {
    try {
      const num = parseInt(cleanHost, 10);
      if (num >= 0 && num <= 4294967295) {
        const ip = [
          (num >>> 24) & 255,
          (num >>> 16) & 255,
          (num >>> 8) & 255,
          num & 255,
        ].join('.');
        return isForbiddenIPv4(ip);
      }
    } catch {
      return true;
    }
    return true;
  }

  return false;
}

/**
 * Validates a target URL against SSRF attack vectors.
 * Returns { safe: true, url } if valid, or { safe: false, error } if rejected.
 */
export function validateSafeUrl(
  urlStr: string,
  options: SafeUrlOptions = {}
): SafeUrlValidationResult {
  if (!urlStr || typeof urlStr !== 'string') {
    return { safe: false, error: 'Empty or invalid URL provided' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { safe: false, error: 'Malformed URL' };
  }

  // 1. Protocol / Scheme Check
  const allowLocal = Boolean(options.allowLocalDev);
  if (allowLocal) {
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { safe: false, error: `Disallowed URL protocol: ${parsed.protocol}. Only http: and https: permitted in dev.` };
    }
  } else {
    if (parsed.protocol !== 'https:') {
      return { safe: false, error: `Insecure URL protocol: ${parsed.protocol}. Strict HTTPS is enforced in production.` };
    }
  }

  // 2. Reject credentials in URL (CVE-style credential injection / SSRF bypass)
  if (parsed.username || parsed.password) {
    return { safe: false, error: 'Credentials in URL (user:pass@) are strictly forbidden' };
  }

  // 3. Port Check (allow only standard web ports)
  if (parsed.port && parsed.port !== '443' && parsed.port !== '80') {
    if (!allowLocal) {
      return { safe: false, error: `Non-standard port ${parsed.port} rejected in production` };
    }
  }

  // 4. IP / Hostname Validation
  const host = parsed.hostname;
  if (!host) {
    return { safe: false, error: 'URL contains no valid hostname' };
  }

  if (parseAndCheckHostIp(host, allowLocal)) {
    return { safe: false, error: `Access to private, loopback, or cloud-metadata network target (${host}) is blocked` };
  }

  return { safe: true, url: parsed };
}

/**
 * Performs a safe, fail-closed HTTP fetch with:
 * - Pre-flight and per-redirect SSRF URL validation
 * - Execution timeout via AbortController
 * - Response size capping to prevent denial-of-service / memory exhaustion
 * - Content-Type validation
 */
export async function safeFetch(
  urlStr: string,
  init: RequestInit = {},
  options: SafeUrlOptions = {}
): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SSRF_TIMEOUT_MS;
  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

  let currentUrl = urlStr;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const check = validateSafeUrl(currentUrl, options);
    if (!check.safe || !check.url) {
      throw new Error(`SSRF Guard blocked outbound request to ${currentUrl}: ${check.error}`);
    }
    await assertPublicDnsTarget(check.url, options);

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutTimer = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      const response = await fetch(currentUrl, {
        ...init,
        redirect: 'manual',
        signal: controller?.signal,
      });

      // Handle Redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`Redirect response (${response.status}) missing Location header`);
        }

        redirectsCount++;
        if (redirectsCount > maxRedirects) {
          throw new Error(`Exceeded maximum allowed redirects (${maxRedirects})`);
        }

        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (!isNaN(size) && size > maxSizeBytes) {
          throw new Error(`Response size (${size} bytes) exceeds maximum limit (${maxSizeBytes} bytes)`);
        }
      }
      const allowedTypes = options.allowedContentTypes;
      if (allowedTypes?.length) {
        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        if (!allowedTypes.some((allowed) => contentType.startsWith(allowed.toLowerCase()))) {
          throw new Error(`Unexpected response Content-Type: ${contentType || '(missing)'}`);
        }
      }

      return await readBoundedResponse(response, maxSizeBytes);
    } finally {
      if (timeoutTimer) clearTimeout(timeoutTimer);
    }
  }

  throw new Error('Unexpected redirect loop termination');
}
