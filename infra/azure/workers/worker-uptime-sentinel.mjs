/**
 * @file worker-uptime-sentinel.mjs
 * @package @aetheris/infra-azure
 * @description Worker 5: Sovereign Uptime Sentinel & Telemetry Logger
 * Probes UREfy production edge, Azure App Service, Key Vault, and OpenAI endpoints.
 * Computes availability, round-trip latency, and logs telemetry snapshots to Azure Blob Storage.
 */
import { BlobServiceClient } from '@azure/storage-blob';

export async function runUptimeSentinelWorker(options = {}) {
  const storageAccount = options.storageAccountName || process.env.AZURE_STORAGE_ACCOUNT_NAME || 'urefystoragezir6b7lk';
  const storageKey = options.storageAccountKey || process.env.AZURE_STORAGE_KEY;

  console.log('[Worker 5: Uptime Sentinel] Commencing synthetic multi-cloud availability checks...');

  const targets = [
    { name: 'UREfy Production Feed', url: 'https://urefy.com/api/posts?limit=1', expectedStatus: 200 },
    { name: 'UREfy Public Health', url: 'https://urefy.com/api/health', expectedStatus: 200 },
    { name: 'Azure App Service Container', url: 'https://urefy-backup-zir6b7lkpxr3m.azurewebsites.net', expectedStatus: [200, 401, 403, 404] },
    { name: 'Azure Key Vault VaultUri', url: 'https://urefy-kv-zir6b7lkpxr3m.vault.azure.net', expectedStatus: [200, 401, 403, 404] },
    { name: 'Azure OpenAI Endpoint', url: 'https://urefy.openai.azure.com', expectedStatus: [200, 401, 404] },
  ];

  const results = [];

  for (const target of targets) {
    const start = performance.now();
    try {
      const res = await fetch(target.url, {
        method: 'GET',
        headers: { 'User-Agent': 'UREfy-Azure-Sentinel/1.0' },
        signal: AbortSignal.timeout(6000),
      }).catch((e) => ({ status: 0, statusText: e.message }));

      const latencyMs = Math.round(performance.now() - start);
      const isExpected = Array.isArray(target.expectedStatus)
        ? target.expectedStatus.includes(res.status)
        : res.status === target.expectedStatus;

      results.push({
        target: target.name,
        url: target.url,
        status: res.status,
        statusText: res.statusText || 'OK',
        latencyMs,
        healthy: isExpected,
        checkedAt: new Date().toISOString(),
      });

      console.log(`  ${isExpected ? '✓' : '⚠'} ${target.name}: HTTP ${res.status} (${latencyMs}ms)`);
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      results.push({
        target: target.name,
        url: target.url,
        status: 0,
        statusText: err.message,
        latencyMs,
        healthy: false,
        checkedAt: new Date().toISOString(),
      });
      console.log(`  ✗ ${target.name}: Failed (${err.message})`);
    }
  }

  const allHealthy = results.every((r) => r.healthy);
  const avgLatency = Math.round(results.reduce((acc, r) => acc + r.latencyMs, 0) / results.length);

  const report = {
    timestamp: Date.now(),
    iso: new Date().toISOString(),
    overallHealthy: allHealthy,
    averageLatencyMs: avgLatency,
    results,
  };

  // Upload telemetry report to Azure Blob Storage if available
  if (storageKey) {
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        `DefaultEndpointsProtocol=https;AccountName=${storageAccount};AccountKey=${storageKey};EndpointSuffix=core.windows.net`
      );
      const containerClient = blobServiceClient.getContainerClient('summaries');
      const blobName = `telemetry-report-${Date.now()}.json`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const dataStr = JSON.stringify(report, null, 2);
      await blockBlobClient.upload(dataStr, dataStr.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' },
      });
      console.log(`[Worker 5: Uptime Sentinel] Telemetry uploaded to Azure Blob Storage: summaries/${blobName}`);
    } catch (err) {
      console.warn('[Worker 5: Uptime Sentinel] Telemetry upload notice:', err.message);
    }
  }

  console.log(`[Worker 5: Uptime Sentinel] Cycle complete. Avg latency: ${avgLatency}ms, Healthy: ${allHealthy}`);
  return { success: true, report };
}
