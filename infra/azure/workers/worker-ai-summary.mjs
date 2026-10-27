/**
 * @file worker-ai-summary.mjs
 * @package @aetheris/infra-azure
 * @description Worker 1: Sovereign AI Post Summarizer & Classifier
 * Exercises Azure OpenAI (Cognitive Services) with gpt-5-mini reasoning model.
 * Saves summaries to Azure Blob Storage ('summaries' container).
 */
import { BlobServiceClient } from '@azure/storage-blob';

export async function runAiSummaryWorker(options = {}) {
  const endpoint = options.openAiEndpoint || process.env.AZURE_OPENAI_ENDPOINT || 'https://urefy.openai.azure.com/';
  const apiKey = options.openAiKey || process.env.AZURE_OPENAI_KEY;
  const deployment = options.deployment || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-mini';
  const apiVersion = options.apiVersion || '2024-10-21';
  const storageConn = options.storageConnectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
  const storageAccount = options.storageAccountName || 'urefystoragezir6b7lk';
  const storageKey = options.storageAccountKey || process.env.AZURE_STORAGE_KEY;

  if (!apiKey) {
    console.warn('[Worker 1: AI Summary] AZURE_OPENAI_KEY not provided, skipping execution.');
    return { skipped: true, reason: 'missing_key' };
  }

  console.log(`[Worker 1: AI Summary] Fetching latest posts from UREfy production feed...`);
  const feedRes = await fetch('https://urefy.com/api/posts?limit=10');
  const feedData = await feedRes.json();
  const posts = feedData.posts || [];

  console.log(`[Worker 1: AI Summary] Processing ${posts.length} posts with Azure OpenAI (${deployment})...`);
  const results = [];

  for (const post of posts) {
    const prompt = `Summarize this community post concisely in 2 sentences with key takeaways:\n\nTitle: ${post.title}\nContent: ${(post.content || '').slice(0, 1500)}`;
    try {
      const aiRes = await fetch(`${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          max_completion_tokens: 600,
        }),
      });

      const aiJson = await aiRes.json();
      const content = aiJson.choices?.[0]?.message?.content || '';
      const usage = aiJson.usage || {};

      results.push({
        postId: post.id,
        title: post.title,
        summary: content,
        usage,
        timestamp: new Date().toISOString(),
      });
      console.log(`  ✓ Summarized "${post.title.slice(0, 40)}..." (tokens: ${usage.total_tokens || 0})`);
    } catch (err) {
      console.error(`  ✗ Failed to summarize post ${post.id}:`, err.message);
    }
  }

  // Upload results to Blob Storage if connection/key is available
  if (storageKey) {
    try {
      const blobUrl = `https://${storageAccount}.blob.core.windows.net`;
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        `DefaultEndpointsProtocol=https;AccountName=${storageAccount};AccountKey=${storageKey};EndpointSuffix=core.windows.net`
      );
      const containerClient = blobServiceClient.getContainerClient('summaries');
      const blobName = `summary-batch-${Date.now()}.json`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const dataStr = JSON.stringify(results, null, 2);
      await blockBlobClient.upload(dataStr, dataStr.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' },
      });
      console.log(`[Worker 1: AI Summary] Uploaded summary batch to Azure Blob Storage: summaries/${blobName}`);
    } catch (err) {
      console.error('[Worker 1: AI Summary] Blob storage upload note:', err.message);
    }
  }

  return { success: true, processedCount: results.length, results };
}
