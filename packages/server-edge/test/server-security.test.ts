import { describe, it, expect, beforeEach } from 'vitest';
import { WAFDefenseEngine } from '../src/waf-defense.js';
import { PayloadSanitizer } from '../src/payload-sanitizer.js';
import { ThreatHoneypotEngine } from '../src/threat-honeypot.js';

describe('Aetheris Server-Edge Cyber Defense & Anti-DDoS Suite', () => {
  describe('WAFDefenseEngine', () => {
    let waf: WAFDefenseEngine;

    beforeEach(() => {
      waf = new WAFDefenseEngine({
        maxRequestsPerMinute: 60,
        burstCapacity: 10,
        quarantineDurationMs: 10000,
        maxConnectionsPerIP: 3,
      });
    });

    it('allows requests within token bucket and sliding window rate limits', () => {
      const result = waf.evaluateRequest('192.168.1.100');
      expect(result.allowed).toBe(true);
    });

    it('rate-limits requests when token bucket is exhausted', () => {
      const ip = '192.168.1.101';
      // Exhaust 10 tokens
      for (let i = 0; i < 10; i++) {
        const res = waf.evaluateRequest(ip);
        expect(res.allowed).toBe(true);
      }

      // 11th request in the same instant should be rate-limited
      const rateLimited = waf.evaluateRequest(ip);
      expect(rateLimited.allowed).toBe(false);
      expect(rateLimited.reason).toContain('Rate limit exceeded');
    });

    it('triggers automatic IP quarantine during massive DDoS bursts', () => {
      const ip = '10.0.0.99';
      // Simulate extreme DDoS spike (over 2x max requests per minute)
      for (let i = 0; i < 150; i++) {
        waf.evaluateRequest(ip);
      }

      expect(waf.isQuarantined(ip)).toBe(true);
      const blocked = waf.evaluateRequest(ip);
      expect(blocked.allowed).toBe(false);
      expect(blocked.reason).toContain('quarantined');
    });

    it('enforces maximum concurrent connections per IP', () => {
      const ip = '192.168.1.200';
      expect(waf.registerConnection(ip).allowed).toBe(true);
      expect(waf.registerConnection(ip).allowed).toBe(true);
      expect(waf.registerConnection(ip).allowed).toBe(true);

      const fourth = waf.registerConnection(ip);
      expect(fourth.allowed).toBe(false);
      expect(fourth.reason).toContain('Max concurrent connections');

      waf.unregisterConnection(ip);
      expect(waf.registerConnection(ip).allowed).toBe(true);
    });
  });

  describe('PayloadSanitizer', () => {
    it('neutralizes malicious inline <script> tags from strings', () => {
      const dirty = 'Hello <script>alert("hacked")</script> World';
      const clean = PayloadSanitizer.sanitizeString(dirty);
      expect(clean).toBe('Hello  World');
      expect(PayloadSanitizer.hasMaliciousPayload(dirty).dangerous).toBe(true);
    });

    it('strips dangerous HTML inline event handlers (onerror, onload, onclick)', () => {
      const dirty = '<img src="x" onerror="stealCookies()" onload="pwn()" />';
      const clean = PayloadSanitizer.sanitizeString(dirty);
      expect(clean).not.toContain('onerror');
      expect(clean).not.toContain('onload');
      expect(PayloadSanitizer.hasMaliciousPayload(dirty).dangerous).toBe(true);
    });

    it('blocks malicious javascript: and data: text/html pseudo-protocols', () => {
      const dirty = '<a href="javascript:doEvil()">Click</a>';
      const clean = PayloadSanitizer.sanitizeString(dirty);
      expect(clean).not.toContain('javascript:');
      expect(clean).toContain('blocked:');
    });

    it('shields against prototype pollution attacks on parsed objects', () => {
      const maliciousPayload = JSON.stringify({
        title: 'Normal Title',
        __proto__: { isAdmin: true },
        constructor: { prototype: { polluter: 'yes' } },
      });

      const parsed = PayloadSanitizer.safeJSONParse(maliciousPayload);
      expect(parsed.title).toBe('Normal Title');
      expect((parsed as any).isAdmin).toBeUndefined();
      expect((Object.prototype as any).polluter).toBeUndefined();
    });

    it('validates identifier formats', () => {
      expect(PayloadSanitizer.isValidIdentifier('channel-dev_123')).toBe(true);
      expect(PayloadSanitizer.isValidIdentifier('../../../etc/passwd')).toBe(false);
      expect(PayloadSanitizer.isValidIdentifier('channel<script>')).toBe(false);
    });
  });

  describe('ThreatHoneypotEngine', () => {
    let waf: WAFDefenseEngine;
    let honeypot: ThreatHoneypotEngine;

    beforeEach(() => {
      waf = new WAFDefenseEngine();
      honeypot = new ThreatHoneypotEngine(waf);
    });

    it('traps attacker probing /.env decoy and automatically quarantines IP', () => {
      const attackerIp = '198.51.100.42';
      const isTrapped = honeypot.handleRequest('/.env', attackerIp, 'curl/7.68.0');

      expect(isTrapped).toBe(true);
      expect(waf.isQuarantined(attackerIp)).toBe(true);

      const incidents = honeypot.getIncidents();
      expect(incidents).toHaveLength(1);
      expect(incidents[0].threatLevel).toBe('CRITICAL');
      expect(incidents[0].actionTaken).toBe('QUARANTINED');
    });

    it('ignores normal clean requests and does not quarantine', () => {
      const cleanIp = '192.168.1.50';
      const isTrapped = honeypot.handleRequest('/health', cleanIp);

      expect(isTrapped).toBe(false);
      expect(waf.isQuarantined(cleanIp)).toBe(false);
    });
  });
});
