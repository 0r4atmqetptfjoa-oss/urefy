import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSmokeTests } from './smoke-test.mjs';

function responseFor(url) {
  if (url.pathname === '/') return new Response('<html></html>', { headers: {
    'content-type': 'text/html',
    'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
    'x-content-type-options': 'nosniff',
  } });
  return Response.json({ status: 'healthy' });
}

test('passes only when all endpoint contracts succeed', async () => {
  const result = await runSmokeTests({ baseUrl: 'https://example.test', fetchImpl: async (url) => responseFor(url), log: () => {} });
  assert.deepEqual(result, { passed: 4, failed: 0 });
});

for (const [name, failure] of [
  ['HTTP failure', () => new Response('unavailable', { status: 503 })],
  ['HTML fallback on an API route', () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } })],
  ['unhealthy JSON payload', () => Response.json({ status: 'degraded' })],
  ['network failure', () => { throw new Error('Network unavailable'); }],
]) {
  test(`fails closed on ${name}`, async () => {
    const result = await runSmokeTests({ baseUrl: 'https://example.test', log: () => {},
      fetchImpl: async (url) => url.pathname === '/api/health' ? failure() : responseFor(url),
    });
    assert.equal(result.failed, 1);
  });
}

test('rejects a home page without security headers', async () => {
  const result = await runSmokeTests({ baseUrl: 'https://example.test', log: () => {},
    fetchImpl: async (url) => url.pathname === '/' ? new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) : responseFor(url),
  });
  assert.equal(result.failed, 1);
});