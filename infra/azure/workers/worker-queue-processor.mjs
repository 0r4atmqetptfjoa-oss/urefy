/**
 * @file worker-queue-processor.mjs
 * @package @aetheris/infra-azure
 * @description Worker 4: Enterprise Async Queue & Workload Dispatcher
 * Exercises Azure Service Bus (Standard) queue 'encrypted-backups' and Azure Storage Queues.
 * Dispatches and consumes asynchronous tasks via pure HTTPS REST with HMAC-SHA256 SAS authentication.
 */
import crypto from 'node:crypto';

function parseConnectionString(conn) {
  const parts = Object.fromEntries(
    conn.split(';').map((p) => {
      const idx = p.indexOf('=');
      return [p.substring(0, idx), p.substring(idx + 1)];
    })
  );
  const endpoint = (parts.Endpoint || '').replace(/\/$/, '').replace(/^sb:/, 'https:');
  const host = new URL(endpoint).host;
  return {
    host,
    keyName: parts.SharedAccessKeyName,
    key: parts.SharedAccessKey,
  };
}

function generateSasToken(uri, keyName, key, expirySeconds = 3600) {
  const encoded = encodeURIComponent(uri.toLowerCase());
  const expiry = Math.floor(Date.now() / 1000) + expirySeconds;
  const stringToSign = `${encoded}\n${expiry}`;
  const sig = crypto.createHmac('sha256', key).update(stringToSign).digest('base64');
  return `SharedAccessSignature sr=${encoded}&sig=${encodeURIComponent(sig)}&se=${expiry}&skn=${keyName}`;
}

export async function runQueueProcessorWorker(options = {}) {
  const connectionString = options.serviceBusConnectionString || process.env.AZURE_SERVICEBUS_CONNECTION_STRING;
  const queueName = options.queueName || process.env.AZURE_SERVICEBUS_QUEUE || 'encrypted-backups';

  if (!connectionString) {
    console.warn('[Worker 4: Queue Processor] AZURE_SERVICEBUS_CONNECTION_STRING not provided, skipping execution.');
    return { skipped: true, reason: 'missing_connection_string' };
  }

  const { host, keyName, key } = parseConnectionString(connectionString);
  const queueUri = `https://${host}/${queueName}`;
  const sasToken = generateSasToken(queueUri, keyName, key);

  try {
    console.log(`[Worker 4: Queue Processor] Connected to Azure Service Bus queue: ${queueName} (${host})`);

    // 1. Dispatch a sovereign telemetry & synchronization task into the queue
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const taskPayload = {
      id: taskId,
      action: 'SYNC_RESILIENCE_TELEMETRY',
      source: 'https://urefy.com',
      enqueuedAt: new Date().toISOString(),
      metadata: {
        priority: 'high',
        runtime: 'azure-workers-v1',
        targetTier: 'FoundersHub-Level-3',
      },
    };

    console.log(`[Worker 4: Queue Processor] Enqueuing task ${taskId}...`);
    const sendRes = await fetch(`${queueUri}/messages`, {
      method: 'POST',
      headers: {
        Authorization: sasToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskPayload),
    });

    if (sendRes.status !== 201) {
      throw new Error(`Failed to enqueue message: HTTP ${sendRes.status} ${sendRes.statusText}`);
    }
    console.log(`  ✓ Enqueued task message into Service Bus queue '${queueName}' (HTTP 201 Created)`);

    // 2. Consume pending messages via destructive read (DELETE /messages/head)
    console.log(`[Worker 4: Queue Processor] Polling for pending messages via Service Bus API...`);
    let processedCount = 0;

    for (let i = 0; i < 3; i++) {
      const receiveRes = await fetch(`${queueUri}/messages/head?timeout=2`, {
        method: 'DELETE',
        headers: { Authorization: sasToken },
      });

      if (receiveRes.status === 200) {
        const bodyText = await receiveRes.text();
        let parsedBody;
        try {
          parsedBody = JSON.parse(bodyText);
        } catch {
          parsedBody = bodyText;
        }
        console.log(`  ✓ Consumed message: action=${parsedBody.action || 'task'}`);
        processedCount++;
      } else if (receiveRes.status === 204 || receiveRes.status === 404) {
        // Queue is empty
        break;
      }
    }

    console.log(`[Worker 4: Queue Processor] Successfully processed ${processedCount} queue message(s).`);
    return {
      success: true,
      enqueuedTaskId: taskId,
      processedCount,
    };
  } catch (err) {
    console.error('[Worker 4: Queue Processor] Error executing Service Bus workflow:', err.message);
    return { success: false, error: err.message };
  }
}
