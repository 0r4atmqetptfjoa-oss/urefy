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

export function parseIPv6Words(rawIp: string): number[] | null {
  let ip = rawIp.toLowerCase().trim();
  if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
  if (ip.includes('.')) {
    const lastColon = ip.lastIndexOf(':');
    if (lastColon === -1) return null;
    const ipv4Str = ip.slice(lastColon + 1);
    const parts = ipv4Str.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return null;
    const w6 = (parts[0] << 8) | parts[1];
    const w7 = (parts[2] << 8) | parts[3];
    ip = `${ip.slice(0, lastColon)}:${w6.toString(16)}:${w7.toString(16)}`;
  }
  let parts = ip.split(':');
  if (ip.includes('::')) {
    const halves = ip.split('::');
    if (halves.length > 2) return null;
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const missing = 8 - (left.length + right.length);
    if (missing < 0) return null;
    parts = [...left, ...Array(missing).fill('0'), ...right];
  }
  if (parts.length !== 8) return null;
  const words: number[] = [];
  for (const part of parts) {
    if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
    words.push(parseInt(part, 16));
  }
  return words;
}

export function isForbiddenIPv6(rawIp: string): boolean {
  const words = parseIPv6Words(rawIp);
  if (!words) return true;

  // Unspecified ::
  if (words.every((w) => w === 0)) return true;

  // Loopback ::1
  if (words.slice(0, 7).every((w) => w === 0) && words[7] === 1) return true;

  // IPv4-compatible (::/96)
  if (words.slice(0, 6).every((w) => w === 0)) {
    const ipv4 = `${(words[6] >> 8) & 255}.${words[6] & 255}.${(words[7] >> 8) & 255}.${words[7] & 255}`;
    return isForbiddenIPv4(ipv4);
  }

  // IPv4-mapped (::ffff:0:0/96)
  if (words.slice(0, 5).every((w) => w === 0) && words[5] === 0xffff) {
    const ipv4 = `${(words[6] >> 8) & 255}.${words[6] & 255}.${(words[7] >> 8) & 255}.${words[7] & 255}`;
    return isForbiddenIPv4(ipv4);
  }

  // 6to4 (2002::/16)
  if (words[0] === 0x2002) {
    const ipv4 = `${(words[1] >> 8) & 255}.${words[1] & 255}.${(words[2] >> 8) & 255}.${words[2] & 255}`;
    return isForbiddenIPv4(ipv4);
  }

  // Link-Local (fe80::/10)
  if ((words[0] & 0xffc0) === 0xfe80) return true;

  // Unique Local (fc00::/7)
  if ((words[0] & 0xfe00) === 0xfc00) return true;

  // Multicast (ff00::/8)
  if ((words[0] & 0xff00) === 0xff00) return true;

  // Documentation (2001:db8::/32)
  if (words[0] === 0x2001 && words[1] === 0x0db8) return true;

  // Discard prefix (100::/64)
  if (words[0] === 0x0100) return true;

  return false;
}

export function parseAndCheckHostIp(host: string, allowLocalDev: boolean = false): boolean {
  // Strip IPv6 brackets, trim, lowercase, and strip trailing FQDN dots (e.g. "localhost." -> "localhost")
  const cleanHost = host.replace(/^\[|\]$/g, '').toLowerCase().trim().replace(/\.+$/, '');
  if (!cleanHost) return true;

  if (cleanHost === 'localhost' || cleanHost.endsWith('.localhost') || cleanHost.endsWith('.local') || cleanHost.endsWith('.internal')) {
    return !allowLocalDev;
  }

  // Standard or octal dotted-quad IPv4 (e.g. 127.0.0.1 or 0177.0.0.1)
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

  // Hexadecimal IPv4 representation (e.g. 0x7f000001 or 0x7f.0.0.1)
  if (cleanHost.startsWith('0x') || cleanHost.includes('.0x') || cleanHost.includes('0x')) {
    return true;
  }

  // Octal segment representations
  if (/^0[0-7]+(\.0[0-7]+)*$/.test(cleanHost)) {
    return true;
  }

  // Integer / Dword IPv4 representation (e.g. 2130706433)
  if (/^\d+$/.test(cleanHost)) {
    const num = parseInt(cleanHost, 10);
    if (!isNaN(num) && num >= 0 && num <= 4294967295) {
      const ip = `${(num >>> 24) & 255}.${(num >>> 16) & 255}.${(num >>> 8) & 255}.${num & 255}`;
      if (allowLocalDev && (ip === '127.0.0.1' || ip.startsWith('127.'))) {
        return false;
      }
      return isForbiddenIPv4(ip);
    }
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
