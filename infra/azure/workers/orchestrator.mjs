/**
 * @file orchestrator.mjs
 * @package @aetheris/infra-azure
 * @description Sovereign Azure Worker Orchestrator
 * Coordinates execution of the 5 background workers to continuously exercise
 * Azure services (OpenAI, PostgreSQL, Storage, Service Bus, App Service / Key Vault)
 * for the Microsoft for Startups Founders Hub Level 3 ($25,000 USD credits) tier.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
import { runAiSummaryWorker } from './worker-ai-summary.mjs';
import { runDbSyncWorker } from './worker-db-sync.mjs';
import { runDrBackupWorker } from './worker-dr-backup.mjs';
import { runQueueProcessorWorker } from './worker-queue-processor.mjs';
import { runUptimeSentinelWorker } from './worker-uptime-sentinel.mjs';

const isOnce = process.argv.includes('--once');
const isDaemon = process.argv.includes('--daemon');
const intervalMinutes = parseInt(process.env.WORKER_INTERVAL_MINUTES || '60', 10);

async function runAllWorkers() {
  const startTime = Date.now();
  console.log('\n=============================================================');
  console.log(`[UREfy Azure Orchestrator] Execution cycle starting at ${new Date().toISOString()}`);
  console.log('Target: Founders Hub Level 3 ($25,000 USD) Sustained Usage');
  console.log('=============================================================');

  const summary = {
    startedAt: new Date().toISOString(),
    workers: {}
  };

  // 1. Worker 1: Azure OpenAI Summarization & Classification
  try {
    console.log('\n--> Executing Worker 1: Azure OpenAI Post Summarizer...');
    summary.workers.aiSummary = await runAiSummaryWorker();
  } catch (err) {
    console.error('Worker 1 failed:', err.message);
    summary.workers.aiSummary = { success: false, error: err.message };
  }

  // 2. Worker 2: Azure PostgreSQL Mirror & Secondary Indexer
  try {
    console.log('\n--> Executing Worker 2: PostgreSQL Real-Time Mirror...');
    summary.workers.dbSync = await runDbSyncWorker();
  } catch (err) {
    console.error('Worker 2 failed:', err.message);
    summary.workers.dbSync = { success: false, error: err.message };
  }

  // 3. Worker 3: Azure Blob Storage Multi-Cloud DR Snapshot
  try {
    console.log('\n--> Executing Worker 3: Multi-Cloud Snapshot DR Vault...');
    summary.workers.drBackup = await runDrBackupWorker();
  } catch (err) {
    console.error('Worker 3 failed:', err.message);
    summary.workers.drBackup = { success: false, error: err.message };
  }

  // 4. Worker 4: Azure Service Bus Async Queue Processing
  try {
    console.log('\n--> Executing Worker 4: Enterprise Service Bus Queue Worker...');
    summary.workers.queueProcessor = await runQueueProcessorWorker();
  } catch (err) {
    console.error('Worker 4 failed:', err.message);
    summary.workers.queueProcessor = { success: false, error: err.message };
  }

  // 5. Worker 5: Synthetic Uptime Sentinel & Telemetry Logging
  try {
    console.log('\n--> Executing Worker 5: Multi-Cloud Uptime Sentinel...');
    summary.workers.uptimeSentinel = await runUptimeSentinelWorker();
  } catch (err) {
    console.error('Worker 5 failed:', err.message);
    summary.workers.uptimeSentinel = { success: false, error: err.message };
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=============================================================');
  console.log(`[UREfy Azure Orchestrator] Cycle finished in ${durationSec}s`);
  console.log(`Summary Statuses:`);
  for (const [name, result] of Object.entries(summary.workers)) {
    const status = result?.success ? 'PASS' : result?.skipped ? 'SKIPPED' : 'FAIL';
    console.log(`  - ${name.padEnd(16)}: ${status} ${result?.skipped ? `(${result.reason})` : ''}`);
  }
  console.log('=============================================================\n');

  return summary;
}

// Execution entry point
if (isOnce || !isDaemon) {
  runAllWorkers()
    .then(() => {
      console.log('One-off execution complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Orchestrator error:', err);
      process.exit(1);
    });
} else {
  console.log(`Starting continuous daemon mode (interval: ${intervalMinutes} minutes)...`);
  runAllWorkers().catch(console.error);

  setInterval(() => {
    runAllWorkers().catch(console.error);
  }, intervalMinutes * 60 * 1000);
}
