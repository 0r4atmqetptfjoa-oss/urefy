import { describe, it, expect, vi } from 'vitest';
import {
  validateSafeUrl,
  isForbiddenIPv4,
  isForbiddenIPv6,
  parseAndCheckHostIp,
  safeFetch,
} from '../functions/api/_ssrf-guard.js';

describe('SSRF Guard & Outbound URL Hardening (functions/api/_ssrf-guard.ts)', () => {
  describe('Private & Forbidden IPv4 Ranges', () => {
    it('detects loopback addresses (127.0.0.0/8)', () => {
      expect(isForbiddenIPv4('127.0.0.1')).toBe(true);
      expect(isForbiddenIPv4('127.0.0.2')).toBe(true);
      expect(isForbiddenIPv4('127.255.255.254')).toBe(true);
    });

    it('detects private 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16 ranges', () => {
      expect(isForbiddenIPv4('10.0.0.1')).toBe(true);
      expect(isForbiddenIPv4('10.254.0.1')).toBe(true);
      expect(isForbiddenIPv4('172.16.0.1')).toBe(true);
      expect(isForbiddenIPv4('172.31.255.255')).toBe(true);
      expect(isForbiddenIPv4('192.168.1.1')).toBe(true);
      expect(isForbiddenIPv4('192.168.100.254')).toBe(true);
    });

    it('detects cloud metadata and link-local 169.254.0.0/16 range', () => {
      expect(isForbiddenIPv4('169.254.169.254')).toBe(true);
      expect(isForbiddenIPv4('169.254.1.1')).toBe(true);
    });

    it('detects multicast and broadcast ranges', () => {
      expect(isForbiddenIPv4('224.0.0.1')).toBe(true);
      expect(isForbiddenIPv4('239.255.255.255')).toBe(true);
      expect(isForbiddenIPv4('255.255.255.255')).toBe(true);
      expect(isForbiddenIPv4('0.0.0.0')).toBe(true);
    });

    it('allows public IPv4 addresses', () => {
      expect(isForbiddenIPv4('1.1.1.1')).toBe(false);
      expect(isForbiddenIPv4('8.8.8.8')).toBe(false);
      expect(isForbiddenIPv4('93.184.216.34')).toBe(false);
    });
  });

  describe('Private & Forbidden IPv6 Ranges', () => {
    it('detects IPv6 loopback (::1)', () => {
      expect(isForbiddenIPv6('::1')).toBe(true);
      expect(isForbiddenIPv6('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('detects IPv6 unique-local (fc00::/7)', () => {
      expect(isForbiddenIPv6('fc00::1')).toBe(true);
      expect(isForbiddenIPv6('fd12:3456:789a::1')).toBe(true);
    });

    it('detects IPv6 link-local (fe80::/10)', () => {
      expect(isForbiddenIPv6('fe80::1')).toBe(true);
      expect(isForbiddenIPv6('fe90::1234')).toBe(true);
    });

    it('detects IPv4-mapped IPv6 for forbidden IPv4 targets', () => {
      expect(isForbiddenIPv6('::ffff:127.0.0.1')).toBe(true);
      expect(isForbiddenIPv6('::ffff:169.254.169.254')).toBe(true);
      expect(isForbiddenIPv6('::ffff:10.0.0.1')).toBe(true);
      expect(isForbiddenIPv6('::ffff:1.1.1.1')).toBe(false);
    });
  });

  describe('Alternative IP Representations (Hex, Octal, Dword)', () => {
    it('blocks localhost aliases', () => {
      expect(parseAndCheckHostIp('localhost')).toBe(true);
      expect(parseAndCheckHostIp('my-service.local')).toBe(true);
      expect(parseAndCheckHostIp('database.internal')).toBe(true);
    });

    it('blocks hex representations of loopback (0x7f000001)', () => {
      expect(parseAndCheckHostIp('0x7f000001')).toBe(true);
    });

    it('blocks dword integer representations of loopback (2130706433)', () => {
      expect(parseAndCheckHostIp('2130706433')).toBe(true);
    });

    it('blocks octal representations (0177.0.0.1)', () => {
      expect(parseAndCheckHostIp('0177.0.0.1')).toBe(true);
    });
  });

  describe('validateSafeUrl High-Level Policy Enforcement', () => {
    it('enforces HTTPS in production mode and rejects HTTP', () => {
      const httpResult = validateSafeUrl('http://example.com/actor');
      expect(httpResult.safe).toBe(false);
      expect(httpResult.error).toMatch(/Insecure URL protocol/i);

      const httpsResult = validateSafeUrl('https://example.com/actor');
      expect(httpsResult.safe).toBe(true);
    });

    it('allows HTTP in local dev mode if explicitly configured', () => {
      const devResult = validateSafeUrl('http://localhost:3000/actor', { allowLocalDev: true });
      expect(devResult.safe).toBe(true);

      const devLoopbackResult = validateSafeUrl('http://127.0.0.1:3000/actor', { allowLocalDev: true });
      expect(devLoopbackResult.safe).toBe(true);
    });

    it('strictly rejects non-HTTP/HTTPS protocols', () => {
      expect(validateSafeUrl('file:///etc/passwd').safe).toBe(false);
      expect(validateSafeUrl('gopher://127.0.0.1:6379').safe).toBe(false);
      expect(validateSafeUrl('ftp://internal-server').safe).toBe(false);
      expect(validateSafeUrl('javascript:alert(1)').safe).toBe(false);
    });

    it('rejects URLs with embedded credentials (user:pass@host)', () => {
      const credResult = validateSafeUrl('https://admin:secret@remote-node.com/actor');
      expect(credResult.safe).toBe(false);
      expect(credResult.error).toMatch(/Credentials in URL.*forbidden/i);
    });

    it('rejects cloud metadata IP target even over HTTPS', () => {
      const metadataResult = validateSafeUrl('https://169.254.169.254/latest/meta-data/');
      expect(metadataResult.safe).toBe(false);
      expect(metadataResult.error).toMatch(/blocked/i);
    });

    it('accepts legitimate external HTTPS Fediverse instances', () => {
      expect(validateSafeUrl('https://mastodon.social/users/Gargron').safe).toBe(true);
      expect(validateSafeUrl('https://relay.aetheris.network/api/federation/actor').safe).toBe(true);
      expect(validateSafeUrl('https://lemmy.world/c/technology').safe).toBe(true);
    });
  });

  describe('safeFetch Fail-Closed Execution & Redirect Guard', () => {
    it('rejects unsafe destination before network dispatch', async () => {
      await expect(safeFetch('http://169.254.169.254/secret')).rejects.toThrow(
        /SSRF Guard blocked outbound request/i
      );
    });

    it('blocks redirect loops exceeding maxRedirects', async () => {
      const mockFetch = vi.fn(async () => ({
        status: 302,
        headers: new Headers({ location: 'https://example.com/redirect-target' }),
      }));
      vi.stubGlobal('fetch', mockFetch);

      await expect(
        safeFetch('https://example.com/initial', {}, { maxRedirects: 2, resolveHostname: async () => ['93.184.216.34'] })
      ).rejects.toThrow(/Exceeded maximum allowed redirects/i);

      vi.unstubAllGlobals();
    });

    it('blocks redirect leading to an internal or loopback IP', async () => {
      const mockFetch = vi.fn(async (url: string) => {
        if (url === 'https://example.com/start') {
          return {
            status: 302,
            headers: new Headers({ location: 'http://127.0.0.1:8080/internal-admin' }),
          };
        }
        return { status: 200, headers: new Headers() };
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(safeFetch('https://example.com/start', {}, { resolveHostname: async () => ['93.184.216.34'] })).rejects.toThrow(
        /SSRF Guard blocked outbound request/i
      );

      vi.unstubAllGlobals();
    });
  });
});
