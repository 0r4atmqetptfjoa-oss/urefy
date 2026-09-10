/**
 * @file ssrf-guard.ts
 * @package @aetheris/client-ui/src
 * @description Client-side SSRF Guard for node discovery and remote federation endpoints.
 */

export interface SafeUrlOptions {
  allowLocalDev?: boolean;
}

export interface SafeUrlValidationResult {
  safe: boolean;
  error?: string;
  url?: URL;
}

export function isForbiddenIPv4(ip: string): boolean {
  const rawParts = ip.split('.');
  if (rawParts.length !== 4) return true;

  const parts = rawParts.map((p) => {
    if (p.length > 1 && p.startsWith('0') && !p.startsWith('0x')) {
      return parseInt(p, 8);
    }
    return parseInt(p, 10);
  });

  if (parts.some(isNaN) || parts.some((p) => p < 0 || p > 255)) {
    return true;
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8
  if (b0 === 0) return true;
  // 10.0.0.0/8 (Private)
  if (b0 === 10) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 169.254.0.0/16 (Link-local & metadata)
  if (b0 === 169 && b1 === 254) return true;
  // 172.16.0.0/12 (Private)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (b0 === 192 && b1 === 168) return true;
  // 224.0.0.0/4 (Multicast)
  if (b0 >= 224 && b0 <= 239) return true;
  // 240.0.0.0/4 (Reserved) & Broadcast
  if (b0 >= 240) return true;

  return false;
}

export function isForbiddenIPv6(rawIp: string): boolean {
  const ip = rawIp.toLowerCase().trim();
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1' || ip === '::01') return true;
  if (ip === '::' || ip === '0:0:0:0:0:0:0:0') return true;
  if (ip.startsWith('::ffff:') || ip.includes(':ffff:')) {
    const lastColon = ip.lastIndexOf(':');
    const embedded = ip.substring(lastColon + 1);
    if (embedded.includes('.')) {
      return isForbiddenIPv4(embedded);
    }
  }
  if (/^fe[89ab]/i.test(ip)) return true;
  if (/^f[cd]/i.test(ip)) return true;
  if (/^ff/i.test(ip)) return true;
  return false;
}

export function parseAndCheckHostIp(host: string, allowLocalDev: boolean = false): boolean {
  const cleanHost = host.replace(/^\[|\]$/g, '').toLowerCase().trim();

  if (cleanHost === 'localhost' || cleanHost.endsWith('.localhost') || cleanHost.endsWith('.local') || cleanHost.endsWith('.internal')) {
    return !allowLocalDev;
  }

  if (/^\d{1,4}\.\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(cleanHost)) {
    if (allowLocalDev && (cleanHost === '127.0.0.1' || cleanHost.startsWith('127.'))) {
      return false;
    }
    return isForbiddenIPv4(cleanHost);
  }

  if (cleanHost.includes(':')) {
    if (allowLocalDev && cleanHost === '::1') {
      return false;
    }
    return isForbiddenIPv6(cleanHost);
  }

  if (/^0x[0-9a-f]+(\.0x[0-9a-f]+)*$/i.test(cleanHost)) {
    return true;
  }

  if (/^0[0-7]+(\.0[0-7]+)*$/.test(cleanHost)) {
    return true;
  }

  if (/^\d+$/.test(cleanHost)) {
    return true;
  }

  return false;
}

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

  const allowLocal = Boolean(options.allowLocalDev);
  if (allowLocal) {
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { safe: false, error: `Disallowed URL protocol: ${parsed.protocol}` };
    }
  } else {
    if (parsed.protocol !== 'https:') {
      return { safe: false, error: `Insecure URL protocol: ${parsed.protocol}. Strict HTTPS is enforced in production.` };
    }
  }

  if (parsed.username || parsed.password) {
    return { safe: false, error: 'Credentials in URL are strictly forbidden' };
  }

  if (parsed.port && parsed.port !== '443' && parsed.port !== '80') {
    if (!allowLocal) {
      return { safe: false, error: `Non-standard port ${parsed.port} rejected in production` };
    }
  }

  const host = parsed.hostname;
  if (!host) {
    return { safe: false, error: 'URL contains no valid hostname' };
  }

  if (parseAndCheckHostIp(host, allowLocal)) {
    return { safe: false, error: `Access to private, loopback, or cloud-metadata network target (${host}) is blocked` };
  }

  return { safe: true, url: parsed };
}
