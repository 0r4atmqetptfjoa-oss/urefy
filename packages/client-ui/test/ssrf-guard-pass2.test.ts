import { describe, it, expect } from 'vitest';
import { isForbiddenIPv6, parseAndCheckHostIp, validateSafeUrl } from '../src/ssrf-guard.js';

describe('SSRF Guard Hardening & IPv6 Hex Normalization (Pass 2)', () => {
  describe('IPv4-mapped IPv6 in Hex Format', () => {
    it('blocks IPv4-mapped IPv6 loopback in hex notation', () => {
      // 127.0.0.1 in hex is 7f00:0001
      expect(isForbiddenIPv6('::ffff:7f00:1')).toBe(true);
      expect(isForbiddenIPv6('::ffff:7f00:0001')).toBe(true);
      expect(parseAndCheckHostIp('::ffff:7f00:1')).toBe(true);
    });

    it('blocks IPv4-mapped IPv6 cloud metadata (169.254.169.254) in hex notation', () => {
      // 169.254.169.254 in hex is a9fe:a9fe
      expect(isForbiddenIPv6('::ffff:a9fe:a9fe')).toBe(true);
      expect(parseAndCheckHostIp('::ffff:a9fe:a9fe')).toBe(true);
      const res = validateSafeUrl('https://[::ffff:a9fe:a9fe]/latest/meta-data');
      expect(res.safe).toBe(false);
      expect(res.error).toMatch(/private, loopback, or cloud-metadata/i);
    });

    it('blocks IPv4-mapped IPv6 private 10.0.0.1 in hex notation', () => {
      // 10.0.0.1 in hex is 0a00:0001
      expect(isForbiddenIPv6('::ffff:a00:1')).toBe(true);
      expect(parseAndCheckHostIp('::ffff:a00:1')).toBe(true);
    });

    it('blocks documentation and discard ranges', () => {
      expect(isForbiddenIPv6('2001:db8::1')).toBe(true);
      expect(isForbiddenIPv6('100::1')).toBe(true);
    });

    it('allows valid routable public IPv6 addresses', () => {
      // Cloudflare public DNS 2606:4700:4700::1111
      expect(isForbiddenIPv6('2606:4700:4700::1111')).toBe(false);
      expect(parseAndCheckHostIp('2606:4700:4700::1111')).toBe(false);
      const res = validateSafeUrl('https://[2606:4700:4700::1111]/');
      expect(res.safe).toBe(true);
    });
  });

  describe('Adversarial SSRF Bypass Vectors', () => {
    it('blocks hostnames with trailing FQDN dots (e.g. localhost., 127.0.0.1.)', () => {
      expect(parseAndCheckHostIp('localhost.')).toBe(true);
      expect(parseAndCheckHostIp('sub.localhost.')).toBe(true);
      expect(parseAndCheckHostIp('node.internal.')).toBe(true);
      expect(parseAndCheckHostIp('127.0.0.1.')).toBe(true);
      expect(validateSafeUrl('https://localhost./feed').safe).toBe(false);
      expect(validateSafeUrl('https://sub.localhost./feed').safe).toBe(false);
    });

    it('blocks IPv4-compatible IPv6 (::x.x.x.x)', () => {
      expect(isForbiddenIPv6('::127.0.0.1')).toBe(true);
      expect(isForbiddenIPv6('::169.254.169.254')).toBe(true);
      expect(isForbiddenIPv6('::10.0.0.1')).toBe(true);
      expect(parseAndCheckHostIp('::127.0.0.1')).toBe(true);
      expect(validateSafeUrl('https://[::127.0.0.1]/').safe).toBe(false);
      expect(validateSafeUrl('https://[::169.254.169.254]/').safe).toBe(false);
    });

    it('blocks hexadecimal and octal IPv4 formats', () => {
      expect(parseAndCheckHostIp('0x7f000001')).toBe(true);
      expect(parseAndCheckHostIp('0x7f.0.0.1')).toBe(true);
      expect(parseAndCheckHostIp('0177.0.0.1')).toBe(true);
      expect(validateSafeUrl('https://0x7f000001/').safe).toBe(false);
      expect(validateSafeUrl('https://0177.0.0.1/').safe).toBe(false);
    });

    it('blocks integer / dword IPv4 addresses mapping to private/loopback/metadata ranges', () => {
      // 2130706433 === 127.0.0.1
      expect(parseAndCheckHostIp('2130706433')).toBe(true);
      // 2852039166 === 169.254.169.254
      expect(parseAndCheckHostIp('2852039166')).toBe(true);
      expect(validateSafeUrl('https://2130706433/').safe).toBe(false);
      expect(validateSafeUrl('https://2852039166/').safe).toBe(false);
    });
  });
});
