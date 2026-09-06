import { describe, it, expect } from 'vitest';
import { onRequestGet, onRequestPost } from '../functions/api/analytics.js';

describe('Analytics API (/api/analytics) Production Enforcement', () => {
  it('should return 503 in production when D1 database is missing', async () => {
    const req = new Request('https://aetheris-omni-sphere.pages.dev/api/analytics');
    const res = await onRequestGet({ request: req, env: { ENVIRONMENT: 'production' } as any });
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('should return 500 in production when D1 query throws an error', async () => {
    const req = new Request('https://aetheris-omni-sphere.pages.dev/api/analytics');
    const throwingDb = {
      prepare: () => ({
        all: () => Promise.reject(new Error('SQLITE_CORRUPT')),
        first: () => Promise.reject(new Error('SQLITE_CORRUPT')),
      }),
    };
    const res = await onRequestGet({
      request: req,
      env: { ENVIRONMENT: 'production', DB: throwingDb } as any,
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Database telemetry query failed');
  });

  it('should return real 0 values when D1 database is empty in production (zero fake data & no +1000 offset)', async () => {
    const req = new Request('https://aetheris-omni-sphere.pages.dev/api/analytics');
    const emptyDb = {
      prepare: (sql: string) => ({
        all: () => Promise.resolve({ results: [] }),
        first: () => {
          if (sql.includes('COUNT(*)')) return Promise.resolve({ count: 0 });
          return Promise.resolve(null);
        },
      }),
    };
    const res = await onRequestGet({
      request: req,
      env: { ENVIRONMENT: 'production', DB: emptyDb } as any,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.serviceHealthVerified).toBe(true);
    expect(data.uptimePercentage).toBeNull();
    expect(data.uptimeFormatted).toBe('Measured uptime unavailable');
    expect(data.uptimeFormatted).not.toContain('SLA');
    expect(data.uptimeFormatted).not.toContain('continuous');
    expect(data.metrics.totalNodes).toBe(0);
    expect(data.metrics.activeNodes).toBe(0);
    expect(data.metrics.messagesProcessed).toBe(0); // Zero offset (+1000 removed)
    expect(data.metrics.postsCount).toBe(0);
    expect(data.metrics.channelsCount).toBe(0);
    expect(data.metrics.nanopublicationsCount).toBe(0);
    expect(data.metrics.avgLatencyMs).toBe(0);
    expect(data.nodes.length).toBe(0);
  });

  it('should allow memory/seed fallback in development when D1 is absent', async () => {
    const req = new Request('https://aetheris-omni-sphere.pages.dev/api/analytics');
    const res = await onRequestGet({ request: req, env: { ENVIRONMENT: 'development' } as any });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.metrics.totalNodes).toBeGreaterThan(0);
  });

  it('should return 503 on POST /api/analytics in production when D1 is missing', async () => {
    const req = new Request('https://aetheris-omni-sphere.pages.dev/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'secret_pin' },
      body: JSON.stringify({ nodeId: 'node-99', name: 'Relay-Alpha' }),
    });
    const res = await onRequestPost({
      request: req,
      env: { ENVIRONMENT: 'production', ADMIN_PIN: 'secret_pin' } as any,
    });
    expect(res.status).toBe(503);
  });
});
