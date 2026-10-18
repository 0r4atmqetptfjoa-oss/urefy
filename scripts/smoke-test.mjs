import { pathToFileURL } from 'node:url';

export async function runSmokeTests({
  baseUrl = process.env.SMOKE_BASE_URL || 'https://urefy.com',
  fetchImpl = fetch,
  log = console.log,
} = {}) {
  const endpoints = [
    { path: '/', kind: 'html' },
    { path: '/api/health', kind: 'json' },
    { path: '/api/channels', kind: 'json' },
    { path: '/api/analytics', kind: 'json' },
  ];
  const results = await Promise.all(endpoints.map(async (endpoint) => {
    const url = new URL(endpoint.path, baseUrl);
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000), redirect: 'follow' });
      if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes(endpoint.kind === 'json' ? 'application/json' : 'text/html')) {
        throw new Error(`Unexpected Content-Type: ${contentType}`);
      }
      if (endpoint.kind === 'json') {
        const payload = await response.json();
        if (!payload || typeof payload !== 'object' || payload.success === false ||
            ['degraded', 'unhealthy', 'operational_state_unverified'].includes(payload.status)) {
          throw new Error('API returned an unsuccessful or unverified state');
        }
      } else {
        if (!response.headers.get('content-security-policy')?.includes("default-src 'self'")) {
          throw new Error('Missing restrictive Content-Security-Policy');
        }
        if (response.headers.get('x-content-type-options')?.toLowerCase() !== 'nosniff') {
          throw new Error('Missing X-Content-Type-Options: nosniff');
        }
        await response.arrayBuffer();
      }
      log(`[PASS] ${endpoint.path}`);
      return true;
    } catch (error) {
      log(`[FAIL] ${endpoint.path}: ${error.message}`);
      return false;
    }
  }));
  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;
  log(`Smoke tests: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runSmokeTests();
    process.exitCode = result.failed > 0 ? 1 : 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
