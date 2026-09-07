async function runSmokeTests() {
  const endpoints = [
    { name: 'Pages Home', url: 'https://aetheris-omni-sphere.pages.dev' },
    { name: 'NodeInfo Federation', url: 'https://aetheris-omni-sphere.pages.dev/.well-known/aetheris-node' },
    { name: 'Analytics API (Real Telemetry)', url: 'https://aetheris-omni-sphere.pages.dev/api/analytics' },
    { name: 'WebAuthn Challenge', url: 'https://aetheris-omni-sphere.pages.dev/api/webauthn?action=challenge' },
    { name: 'Worker Relay Health', url: 'https://aetheris-edge-relay.love4jpx.workers.dev/health' },
    { name: 'Worker Relay Stats', url: 'https://aetheris-edge-relay.love4jpx.workers.dev/stats' }
  ];

  console.log('=====================================================');
  console.log('       AETHERIS LIVE CLOUDFLARE SMOKE TESTS          ');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    try {
      const t0 = performance.now();
      const res = await fetch(ep.url, {
        headers: { 'User-Agent': 'AetherisSmokeTest/1.0' }
      });
      const elapsed = (performance.now() - t0).toFixed(1);
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      let preview = '';
      if (ct.includes('json')) {
        try {
          const parsed = JSON.parse(text);
          preview = JSON.stringify(parsed).slice(0, 110) + '...';
        } catch {
          preview = text.slice(0, 80);
        }
      } else {
        preview = text.slice(0, 80).replace(/\s+/g, ' ');
      }

      if (res.status >= 200 && res.status < 400) {
        console.log(`[PASS] ${ep.name}`);
        console.log(`       URL: ${ep.url}`);
        console.log(`       Status: ${res.status} ${res.statusText} (${elapsed}ms)`);
        console.log(`       Body: ${preview}\n`);
        passed++;
      } else {
        console.log(`[WARN/FAIL] ${ep.name}`);
        console.log(`       URL: ${ep.url}`);
        console.log(`       Status: ${res.status} ${res.statusText} (${elapsed}ms)`);
        console.log(`       Body: ${preview}\n`);
        failed++;
      }
    } catch (err) {
      console.error(`[ERROR] ${ep.name} (${ep.url}): ${err.message}\n`);
      failed++;
    }
  }

  console.log('=====================================================');
  console.log(`Summary: ${passed} passed, ${failed} failed.`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTests();
