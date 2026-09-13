import { describe, it, expect } from 'vitest';
import { onRequestGet, onRequestPost } from '../functions/api/analytics.js';

describe('Analytics Real Telemetry & Synthetic Defaults Removal (Findings 16 & 17)', () => {
  const emptyDb = {
    prepare: (sql: string) => ({
      all: () => Promise.resolve({ results: [] }),
      first: () => {
        if (sql.includes('COUNT(*)')) return Promise.resolve({ count: 0 });
        return Promise.resolve(null);
      },
    }),
  };

  describe('1. Removal of Fabricated Bucharest/OTP Cloudflare Defaults', () => {
    it('returns null for all edge fields when cf object is empty (does NOT fabricate OTP/Bucharest/13335)', async () => {
      const req = new Request('https://urefy.com/api/analytics');
      // No cf object on request
      const res = await onRequestGet({
        request: req,
        env: { ENVIRONMENT: 'production', DB: emptyDb } as any,
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.edge.colo).toBeNull();
      expect(data.edge.colo).not.toBe('OTP');

      expect(data.edge.country).toBeNull();
      expect(data.edge.country).not.toBe('RO');

      expect(data.edge.city).toBeNull();
      expect(data.edge.city).not.toBe('Bucharest');

      expect(data.edge.region).toBeNull();
      expect(data.edge.region).not.toBe('Bucuresti');

      expect(data.edge.httpProtocol).toBeNull();
      expect(data.edge.httpProtocol).not.toBe('HTTP/3');

      expect(data.edge.asn).toBeNull();
      expect(data.edge.asn).not.toBe(13335);
    });

    it('preserves genuine Cloudflare cf properties when present', async () => {
      const req = new Request('https://urefy.com/api/analytics');
      (req as any).cf = {
        colo: 'FRA',
        country: 'DE',
        city: 'Frankfurt',
        region: 'Hesse',
        httpProtocol: 'HTTP/3',
        asn: 24940,
      };

      const res = await onRequestGet({
        request: req,
        env: { ENVIRONMENT: 'production', DB: emptyDb } as any,
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.edge.colo).toBe('FRA');
      expect(data.edge.country).toBe('DE');
      expect(data.edge.city).toBe('Frankfurt');
      expect(data.edge.region).toBe('Hesse');
      expect(data.edge.httpProtocol).toBe('HTTP/3');
      expect(data.edge.asn).toBe(24940);
    });
  });

  describe('2. Service Uptime & Real Measurement Verification', () => {
    it('does NOT return fake 99.98% uptime in production or development without durable monitoring', async () => {
      // In production
      const prodRes = await onRequestGet({
        request: new Request('https://urefy.com/api/analytics'),
        env: { ENVIRONMENT: 'production', DB: emptyDb } as any,
      });
      const prodData = await prodRes.json();
      expect(prodData.uptimePercentage).toBeNull();
      expect(prodData.uptimePercentage).not.toBe(99.98);

      // In development
      const devRes = await onRequestGet({
        request: new Request('https://urefy.com/api/analytics'),
        env: { ENVIRONMENT: 'development' } as any,
      });
      const devData = await devRes.json();
      expect(devData.uptimePercentage).toBeNull();
      expect(devData.uptimePercentage).not.toBe(99.98);
    });

    it('does not present isolate runtime EDGE_START_TIME as measured service uptime', async () => {
      const res = await onRequestGet({
        request: new Request('https://urefy.com/api/analytics'),
        env: { ENVIRONMENT: 'production', DB: emptyDb } as any,
      });
      const data = await res.json();

      expect(data.uptimeSeconds).toBeNull();
      expect(data.uptimeFormatted).toBe('Measured service uptime unavailable');
      expect(data.uptimeFormatted).not.toContain('continuous edge runtime');
    });
  });

  describe('3. Dynamic Epoch & Unmeasured Field Nullability', () => {
    it('uses dynamic current minute epoch instead of hardcoded 412', async () => {
      const beforeMinute = Math.floor((Date.now() - 1000) / 60000);
      const res = await onRequestGet({
        request: new Request('https://urefy.com/api/analytics'),
        env: { ENVIRONMENT: 'production', DB: emptyDb } as any,
      });
      const data = await res.json();
      const afterMinute = Math.floor((Date.now() + 1000) / 60000);

      expect(data.metrics.zkRlnEpoch).not.toBe(412);
      expect(data.metrics.zkRlnEpoch).toBeGreaterThanOrEqual(beforeMinute);
      expect(data.metrics.zkRlnEpoch).toBeLessThanOrEqual(afterMinute);
    });

    it('returns null for unmeasured node fields instead of synthetic defaults (15ms, 99.9%, GLOBAL, etc.)', async () => {
      const unmeasuredDb = {
        prepare: (sql: string) => ({
          all: () => {
            if (sql.includes('nodes_telemetry')) {
              return Promise.resolve({
                results: [
                  {
                    id: 'node-raw-1',
                    node_id: 'node-raw-1',
                    name: 'Raw Unmeasured Node',
                    role: 'validator',
                    status: 'active',
                    latency_ms: null, // Unmeasured
                    merit_score: null, // Unmeasured
                    region: null, // Unmeasured
                    country_code: null, // Unmeasured
                    uptime: null, // Unmeasured
                    bandwidth_mbps: null, // Unmeasured
                    messages_processed: 0,
                    zk_rln_epoch: null,
                  },
                ],
              });
            }
            return Promise.resolve({ results: [] });
          },
          first: () => Promise.resolve({ count: 0 }),
        }),
      };

      const res = await onRequestGet({
        request: new Request('https://urefy.com/api/analytics'),
        env: { ENVIRONMENT: 'production', DB: unmeasuredDb } as any,
      });
      const data = await res.json();

      expect(data.nodes.length).toBe(1);
      const node = data.nodes[0];

      expect(node.latencyMs).toBeNull();
      expect(node.latencyMs).not.toBe(15.0);

      expect(node.meritScore).toBe(0);
      expect(node.meritScore).not.toBe(100);

      expect(node.region).toBeNull();
      expect(node.region).not.toBe('GLOBAL');

      expect(node.uptime).toBeNull();
      expect(node.uptime).not.toBe(99.9);

      expect(node.countryCode).toBeNull();
      expect(node.countryCode).not.toBe('XX');
    });

    it('handles POST /api/analytics with unmeasured fields properly defaulted to null or 0', async () => {
      let savedRecord: any = null;
      const mockD1 = {
        prepare: () => ({
          bind: (...args: any[]) => ({
            run: () => {
              savedRecord = args;
              return Promise.resolve({ success: true });
            },
          }),
        }),
      };

      const req = new Request('https://urefy.com/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': 'test-admin-secret-pin',
        },
        body: JSON.stringify({
          nodeId: 'node-test-unmeasured',
          name: 'Telemetry Peer',
          // latencyMs, meritScore, region, uptime, bandwidthMbps deliberately omitted
        }),
      });

      const res = await onRequestPost({
        request: req,
        env: { ENVIRONMENT: 'production', ADMIN_PIN: 'test-admin-secret-pin', DB: mockD1 } as any,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      expect(data.telemetry.latencyMs).toBeNull();
      expect(data.telemetry.meritScore).toBe(0);
      expect(data.telemetry.region).toBeNull();
      expect(data.telemetry.uptime).toBeNull();
      expect(data.telemetry.bandwidthMbps).toBe(0);
      expect(data.telemetry.zkRlnEpoch).toBe(Math.floor(Date.now() / 60000));
    });
  });
});
