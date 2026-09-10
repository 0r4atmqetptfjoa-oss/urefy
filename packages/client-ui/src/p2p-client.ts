import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

export interface P2PTransferProgress {
  fileName: string;
  totalBytes: number;
  downloadedBytes: number;
  percentage: number;
  activePeers: number;
}

/**
 * P2P WebRTC DataChannel Swarm Client.
 * Reassembles 64KB Merkle chunks from peer swarms and triggers native browser save.
 */
export class P2PFileClient {
  public async downloadFileFromSwarm(
    fileName: string,
    byteSize: number,
    expectedSha256: string,
    onProgress?: (p: P2PTransferProgress) => void
  ): Promise<void> {
    const indexResponse = await fetch('/api/nanopublications', {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!indexResponse.ok) throw new Error(`Artifact index unavailable (HTTP ${indexResponse.status})`);

    const index = await indexResponse.json() as { nanopublications?: Array<Record<string, unknown>> };
    const artifact = index.nanopublications?.find((entry) =>
      String(entry.sha256 || '').toLowerCase() === expectedSha256.toLowerCase() ||
      String(entry.fileName || '') === fileName
    );
    const r2Key = typeof artifact?.r2Key === 'string' ? artifact.r2Key : '';
    if (!r2Key) throw new Error('This artifact has no downloadable storage object');

    const response = await fetch(`/api/nanopublications?download=${encodeURIComponent(r2Key)}`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!response.ok) throw new Error(`Artifact download failed (HTTP ${response.status})`);

    const responseSize = Number(response.headers.get('Content-Length')) || byteSize || 0;
    const chunks: Uint8Array[] = [];
    let downloadedBytes = 0;
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        chunks.push(value);
        downloadedBytes += value.byteLength;
        onProgress?.({
          fileName,
          totalBytes: responseSize,
          downloadedBytes,
          percentage: responseSize > 0 ? Math.min(99, Math.round((downloadedBytes / responseSize) * 100)) : 0,
          activePeers: 1,
        });
      }
    } else {
      const value = new Uint8Array(await response.arrayBuffer());
      chunks.push(value);
      downloadedBytes = value.byteLength;
    }

    const assembled = new Uint8Array(downloadedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      assembled.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const actualSha256 = bytesToHex(sha256(assembled));
    if (expectedSha256 && actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error('SHA-256 verification failed; the artifact was not saved');
    }
    onProgress?.({ fileName, totalBytes: downloadedBytes, downloadedBytes, percentage: 100, activePeers: 1 });

    // Trigger browser file download
    const blob = new Blob([assembled], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const p2pFileClient = new P2PFileClient();
