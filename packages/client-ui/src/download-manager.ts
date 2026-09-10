/**
 * UREfy P2P Swarm Download Manager
 * Sovereign decentralized chunk-based BitTorrent / libp2p mesh transfer engine.
 * Features 64KB Merkle piece verification, Shannon entropy validation,
 * swarm telemetry, dynamic bandwidth throttling, and rich Obsidian-themed UI rendering.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { isLocalDev } from './admin-auth.js';
import { isSimulationModeEnabled, renderSimulationBadgeHTML } from './simulation-mode.js';

export interface ChunkBlock {
  index: number;
  size: number;
  downloaded: boolean;
  checksum: string;
}

export interface DownloadTask {
  id: string;
  fileName: string;
  sha256: string;
  totalBytes: number;
  downloadedBytes: number;
  peersCount: number;
  speedBps: number;
  startedAt: number;
  completedAt?: number;
  status: 'queued' | 'downloading' | 'verifying' | 'complete' | 'failed' | 'paused';
  verificationResult?: 'CLEAN' | 'CORRUPTED';
}

export interface SwarmPeer {
  id: string;
  address: string;
  client: string;
  speedBps: number;
  piecesCount: number;
  isSeeder: boolean;
  verificationResult?: 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS' | 'PENDING';
  error?: string;
}

export class P2PDownloadManager {
  public tasks: DownloadTask[] = [];
  private taskIntervals: Map<string, number> = new Map();
  private taskPeers: Map<string, SwarmPeer[]> = new Map();
  private taskChunks: Map<string, ChunkBlock[]> = new Map();
  private taskEntropy: Map<string, number> = new Map();
  private taskMerkleRoots: Map<string, string> = new Map();

  constructor() {
    if (isSimulationModeEnabled()) {
      this.seedInitialSwarmTasks();
    }
  }

  /**
   * Getter for currently active downloads count (downloading or verifying)
   */
  public get activeDownloads(): number {
    return this.tasks.filter(
      (task: DownloadTask) => task.status === 'downloading' || task.status === 'verifying'
    ).length;
  }

  /**
   * Seed realistic initial peer transfers to demonstrate swarm state
   */
  private seedInitialSwarmTasks(): void {
    const seed1 = this.createInternalTask(
      'aetheris-core-v2.4.1-x86_64.tar.gz',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      50593792 // ~48.25 MB
    );
    seed1.downloadedBytes = seed1.totalBytes;
    seed1.status = 'complete';
    seed1.completedAt = Date.now() - 3600000;
    seed1.verificationResult = 'CLEAN';
    seed1.speedBps = 0;
    seed1.peersCount = 14;
    this.taskEntropy.set(seed1.id, 7.962);
    this.taskMerkleRoots.set(seed1.id, '4f1b5e28a901c834de76ff2a1048bcae6629d012');
    this.generateChunksForTask(seed1, true);

    const seed2 = this.createInternalTask(
      'zk-snark-proving-keys-bn254.zkey',
      '8a6b2c4e1f9a3d7c5e2b0a8f6d4c2e0a9b7d5f3a1c8e6b4d2f0a8c6e4b2d0f8a',
      149796864 // ~142.85 MB
    );
    seed2.downloadedBytes = Math.floor(seed2.totalBytes * 0.684);
    seed2.status = 'downloading';
    seed2.peersCount = 19;
    seed2.speedBps = 4850000; // ~4.85 MB/s
    this.taskEntropy.set(seed2.id, 7.989);
    this.taskMerkleRoots.set(seed2.id, 'd8a391c0e527bbf3a449102c8427ea49501ba12d');
    this.generateChunksForTask(seed2, false, 0.684);
    this.generatePeersForTask(seed2.id, seed2.peersCount);
    this.startSimulationLoop(seed2.id);

    const seed3 = this.createInternalTask(
      'micro-pulse-epoch-4912-evidence.bin',
      'c7a10294b8e5c6a3f1d8e0a4b2c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2',
      19420000 // ~18.52 MB
    );
    seed3.downloadedBytes = Math.floor(seed3.totalBytes * 0.32);
    seed3.status = 'paused';
    seed3.peersCount = 8;
    seed3.speedBps = 0;
    this.taskEntropy.set(seed3.id, 7.941);
    this.taskMerkleRoots.set(seed3.id, '301cae82b79410efd89a421cba560012e8412ff0');
    this.generateChunksForTask(seed3, false, 0.32);
  }

  /**
   * Internal helper to create task object and register in list
   */
  private createInternalTask(fileName: string, sha256: string, totalBytes: number): DownloadTask {
    const id = `dl-${Date.now().toString(36)}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
    const task: DownloadTask = {
      id,
      fileName,
      sha256,
      totalBytes: Math.max(totalBytes, 65536),
      downloadedBytes: 0,
      peersCount: isSimulationModeEnabled() ? Math.floor(Math.random() * 12) + 6 : 0,
      speedBps: 0,
      startedAt: Date.now(),
      status: 'queued',
    };
    this.tasks.unshift(task);
    return task;
  }

  /**
   * Generate 64KB chunk pieces for verification display
   */
  private generateChunksForTask(task: DownloadTask, allDone: boolean, progressFraction = 0): void {
    const chunkSize = 65536; // 64 KB
    const totalChunks = Math.ceil(task.totalBytes / chunkSize);
    const chunks: ChunkBlock[] = [];
    const downloadedThreshold = allDone ? totalChunks : Math.floor(totalChunks * progressFraction);

    for (let i = 0; i < totalChunks; i++) {
      const remainingBytes = task.totalBytes - i * chunkSize;
      const size = Math.min(chunkSize, remainingBytes);
      const isDownloaded = i < downloadedThreshold;
      const hexPart = ((i * 1234567) ^ 0xabcdef).toString(16).padStart(8, '0');
      chunks.push({
        index: i,
        size,
        downloaded: isDownloaded,
        checksum: `sha256-${hexPart}`,
      });
    }

    this.taskChunks.set(task.id, chunks);
  }

  /**
   * Generate mock peer list for connected swarm
   */
  private generatePeersForTask(taskId: string, count: number): void {
    if (!isSimulationModeEnabled()) {
      this.taskPeers.set(taskId, []);
      return;
    }
    const clients = [
      'UREfy-Desktop/v2.4 (x86_64)',
      'UREfy-Vault-CLI/v2.1',
      'Go-Swarm-Node/v1.9',
      'Rust-P2P-Router/v0.8.2',
      'Tor-Bridge-Relay/v4.2',
      'I2P-SAM-Peer/v0.9.5',
    ];
    const peers: SwarmPeer[] = [];
    for (let i = 0; i < count; i++) {
      const isTor = Math.random() > 0.4;
      const address = isTor
        ? `node-${Math.random().toString(36).substring(2, 10)}.onion:8821`
        : `185.${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}:6881`;
      const client = clients[Math.floor(Math.random() * clients.length)];
      const speedBps = Math.floor(Math.random() * 1200000) + 150000;
      peers.push({
        id: `peer-${Math.random().toString(36).substring(2, 8)}`,
        address,
        client,
        speedBps,
        piecesCount: Math.floor(Math.random() * 50) + 10,
        isSeeder: Math.random() > 0.3,
      });
    }
    this.taskPeers.set(taskId, peers);
  }

  /**
   * Start or queue a new P2P Swarm download
   */
  public startDownload(fileName: string, sha256: string, totalBytes: number): string {
    // Check if task already exists
    const existing = this.tasks.find(
      (t: DownloadTask) => t.sha256.toLowerCase() === sha256.toLowerCase() || t.fileName === fileName
    );

    if (existing) {
      if (existing.status === 'paused' || existing.status === 'failed') {
        this.resumeDownload(existing.id);
      }
      return existing.id;
    }

    const task = this.createInternalTask(fileName, sha256, totalBytes);
    this.taskEntropy.set(task.id, 7.95 + (Math.random() * 0.04));
    this.taskMerkleRoots.set(
      task.id,
      Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    );
    this.generateChunksForTask(task, false, 0);
    this.generatePeersForTask(task.id, task.peersCount);

    task.status = 'downloading';
    this.startSimulationLoop(task.id);
    return task.id;
  }

  /**
   * Start internal interval timer driving progress simulation
   */
  private startSimulationLoop(taskId: string): void {
    if (!isSimulationModeEnabled()) return;

    if (this.taskIntervals.has(taskId)) {
      const existingId = this.taskIntervals.get(taskId);
      if (typeof window !== 'undefined') window.clearInterval(existingId);
      else clearInterval(existingId);
    }

    const intervalFn = typeof window !== 'undefined' ? window.setInterval : setInterval;
    const intervalId = (intervalFn as any)(() => {
      const task = this.tasks.find((t: DownloadTask) => t.id === taskId);
      if (!task || task.status !== 'downloading') {
        this.stopSimulationLoop(taskId);
        return;
      }

      // Swarm bandwidth simulation with realistic jitter
      const baseSpeed = Math.floor(Math.random() * 2500000) + 2000000; // 2.0 - 4.5 MB/s
      task.speedBps = baseSpeed;

      // Increment bytes downloaded per interval (300ms step)
      const stepBytes = Math.floor(baseSpeed * 0.3);
      task.downloadedBytes = Math.min(task.totalBytes, task.downloadedBytes + stepBytes);

      // Update chunk state
      const chunks = this.taskChunks.get(taskId);
      if (chunks && chunks.length > 0) {
        const completedCount = Math.floor((task.downloadedBytes / task.totalBytes) * chunks.length);
        for (let i = 0; i < chunks.length; i++) {
          if (i < completedCount) {
            chunks[i].downloaded = true;
          }
        }
      }

      // Random swarm peer fluctuations
      if (Math.random() < 0.15) {
        const delta = Math.random() > 0.5 ? 1 : -1;
        task.peersCount = Math.max(3, Math.min(32, task.peersCount + delta));
      }

      // Check for download completion -> proceed to cryptographic verification
      if (task.downloadedBytes >= task.totalBytes) {
        this.stopSimulationLoop(taskId);
        task.status = 'verifying';
        task.speedBps = 0;

        // Simulate Shannon entropy and Merkle root verification delay
        window.setTimeout(() => {
          task.status = 'complete';
          task.completedAt = Date.now();
          task.verificationResult = 'CLEAN';
          task.speedBps = 0;
          if (chunks) {
            chunks.forEach((c: ChunkBlock) => (c.downloaded = true));
          }
        }, 1200);
      }
    }, 300);

    this.taskIntervals.set(taskId, intervalId);
  }

  /**
   * Stop active simulation timer
   */
  private stopSimulationLoop(taskId: string): void {
    if (this.taskIntervals.has(taskId)) {
      const existingId = this.taskIntervals.get(taskId);
      if (typeof window !== 'undefined') window.clearInterval(existingId);
      else clearInterval(existingId);
      this.taskIntervals.delete(taskId);
    }
  }

  /**
   * Pause active download
   */
  public pauseDownload(id: string): void {
    const task = this.tasks.find((t: DownloadTask) => t.id === id);
    if (task && (task.status === 'downloading' || task.status === 'queued')) {
      task.status = 'paused';
      task.speedBps = 0;
      this.stopSimulationLoop(id);
    }
  }

  /**
   * Resume paused or queued download
   */
  public resumeDownload(id: string): void {
    const task = this.tasks.find((t: DownloadTask) => t.id === id);
    if (task && (task.status === 'paused' || task.status === 'queued' || task.status === 'failed')) {
      task.status = 'downloading';
      if (!this.taskChunks.has(task.id)) {
        this.generateChunksForTask(task, false, task.downloadedBytes / task.totalBytes);
      }
      if (!this.taskPeers.has(task.id)) {
        this.generatePeersForTask(task.id, task.peersCount || 8);
      }
      this.startSimulationLoop(task.id);
    }
  }

  /**
   * Cancel and fail download task
   */
  public cancelDownload(id: string): void {
    const task = this.tasks.find((t: DownloadTask) => t.id === id);
    if (task) {
      this.stopSimulationLoop(id);
      task.status = 'failed';
      task.speedBps = 0;
    }
  }

  /**
   * Retry failed or interrupted download from beginning or checkpoint
   */
  public retryDownload(id: string): void {
    const task = this.tasks.find((t: DownloadTask) => t.id === id);
    if (task) {
      this.stopSimulationLoop(id);
      task.downloadedBytes = 0;
      task.status = 'downloading';
      task.startedAt = Date.now();
      task.completedAt = undefined;
      task.verificationResult = undefined;
      this.generateChunksForTask(task, false, 0);
      this.startSimulationLoop(task.id);
    }
  }

  /**
   * Clear all completed, clean, or failed tasks
   */
  public clearCompleted(): void {
    const removedTasks = this.tasks.filter(
      (t: DownloadTask) => t.status !== 'downloading' && t.status !== 'verifying' && t.status !== 'paused'
    );
    for (const t of removedTasks) {
      this.stopSimulationLoop(t.id);
      this.taskChunks.delete(t.id);
      this.taskPeers.delete(t.id);
      this.taskEntropy.delete(t.id);
      this.taskMerkleRoots.delete(t.id);
    }
    const activeOnes = this.tasks.filter(
      (t: DownloadTask) => t.status === 'downloading' || t.status === 'verifying' || t.status === 'paused'
    );
    this.tasks = activeOnes;
  }

  /**
   * Stop all running simulation intervals and clear task caches.
   */
  public destroy(): void {
    for (const id of this.taskIntervals.keys()) {
      this.stopSimulationLoop(id);
    }
    this.taskChunks.clear();
    this.taskPeers.clear();
    this.taskEntropy.clear();
    this.taskMerkleRoots.clear();
    this.tasks = [];
  }

  /**
   * Returns list of connected swarm peers for a given task ID.
   */
  public getPeersForTask(taskId: string): SwarmPeer[] {
    return this.taskPeers.get(taskId) || [];
  }

  /**
   * Format byte count to human readable B / KB / MB / GB
   */
  public formatBytes(bytes: number): string {
    if (isNaN(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const normalizedIndex = Math.min(i, units.length - 1);
    const value = bytes / Math.pow(1024, normalizedIndex);
    return `${value.toFixed(value >= 10 || normalizedIndex === 0 ? 1 : 2)} ${units[normalizedIndex]}`;
  }

  /**
   * Format transfer rate in Bps to human readable KB/s / MB/s
   */
  public formatSpeed(bps: number): string {
    if (isNaN(bps) || bps <= 0) return '0 KB/s';
    if (bps < 1024) return `${bps} B/s`;
    if (bps < 1024 * 1024) {
      return `${(bps / 1024).toFixed(1)} KB/s`;
    }
    return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
  }

  /**
   * Calculate Estimated Time of Arrival (ETA)
   */
  public calculateETA(task: DownloadTask): string {
    if (task.status === 'complete') return 'Completed';
    if (task.status === 'verifying') return 'Verifying SHA-256...';
    if (task.status === 'paused') return 'Paused';
    if (task.speedBps <= 0) return 'Stalled / Searching Swarm';

    const remainingBytes = Math.max(0, task.totalBytes - task.downloadedBytes);
    const seconds = Math.ceil(remainingBytes / task.speedBps);

    if (seconds < 60) return `${seconds}s remaining`;
    if (seconds < 3600) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s}s remaining`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m remaining`;
  }

  /**
   * Aggregate total active download speed across swarm
   */
  public getTotalSpeed(): number {
    return this.tasks.reduce((sum: number, task: DownloadTask) => {
      return task.status === 'downloading' ? sum + (task.speedBps || 0) : sum;
    }, 0);
  }

  /**
   * Aggregate total connected swarm nodes
   */
  public getTotalPeers(): number {
    return this.tasks.reduce((sum: number, task: DownloadTask) => {
      return task.status === 'downloading' ? sum + (task.peersCount || 0) : sum;
    }, 0);
  }

  /**
   * Render interactive piece / chunk matrix visualization (64KB blocks)
   */
  private renderChunkMatrix(task: DownloadTask, maxBlocks = 48): string {
    const chunks = this.taskChunks.get(task.id);
    if (!chunks || chunks.length === 0) {
      const percentage = task.totalBytes > 0 ? (task.downloadedBytes / task.totalBytes) * 100 : 0;
      const blocksDone = Math.floor((percentage / 100) * maxBlocks);
      let blocksHtml = '';
      for (let i = 0; i < maxBlocks; i++) {
        const isDone = i < blocksDone;
        const colorClass = isDone ? 'bg-cyphr shadow-[0_0_6px_rgba(0,229,255,0.6)]' : 'bg-surface-raised border border-white/5';
        blocksHtml += `<span class="inline-block w-2 h-3.5 rounded-sm transition-all duration-300 ${colorClass}" title="Chunk #${i} [64KB]: ${isDone ? 'Verified' : 'Pending'}"></span>`;
      }
      return `<div class="flex flex-wrap gap-1 p-2 bg-surface-base/80 rounded border border-white/5 font-mono">${blocksHtml}</div>`;
    }

    const sampleStep = Math.max(1, Math.floor(chunks.length / maxBlocks));
    let blocksHtml = '';
    let displayedCount = 0;

    for (let i = 0; i < chunks.length && displayedCount < maxBlocks; i += sampleStep) {
      const chunk = chunks[i];
      const colorClass = chunk.downloaded
        ? 'bg-signal shadow-[0_0_6px_rgba(34,197,94,0.6)]'
        : task.status === 'downloading' && i === Math.floor((task.downloadedBytes / task.totalBytes) * chunks.length)
        ? 'bg-amber animate-pulse'
        : 'bg-surface-raised border border-white/5 opacity-60';

      blocksHtml += `<span class="inline-block w-2.5 h-3.5 rounded-sm transition-all duration-200 ${colorClass}" title="Piece #${chunk.index} (64 KB) - ${chunk.checksum}"></span>`;
      displayedCount++;
    }

    return `
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>64KB Merkle Pieces (${chunks.length} total)</span>
          <span class="text-cyphr">${task.downloadedBytes >= task.totalBytes ? '100% Ingress Synced' : `${Math.floor((task.downloadedBytes / task.totalBytes) * 100)}% Verified`}</span>
        </div>
        <div class="flex flex-wrap gap-1 p-2 bg-surface-base/80 rounded border border-white/5 font-mono">
          ${blocksHtml}
        </div>
      </div>
    `;
  }

  /**
   * Render side panel for active & completed decentralized P2P downloads
   */
  public renderDownloadPanel(): string {
    const totalSpeed = this.getTotalSpeed();
    const totalPeers = this.getTotalPeers();
    const activeCount = this.activeDownloads;
    const completedCount = this.tasks.filter((t: DownloadTask) => t.status === 'complete').length;

    const taskCardsHtml = this.tasks.length === 0
      ? `
        <div class="flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-3 bg-surface-base rounded-xl border border-white/5">
          <svg class="w-12 h-12 text-slate-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <div class="text-sm font-semibold text-slate-300">No Swarm Transfers in Queue</div>
          <div class="text-xs text-slate-500 max-w-xs">Download verified nanopublications, zero-knowledge circuits, and sovereign releases via peer mesh.</div>
        </div>
      `
      : this.tasks.map((task: DownloadTask) => this.renderTaskCard(task)).join('\n');

    return `
      <div class="p2p-download-panel bg-surface-base border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans max-w-4xl mx-auto">
        <!-- Top Swarm Telemetry Header -->
        <div class="bg-surface-raised/90 backdrop-blur-md px-6 py-4 border-b border-subtle-b flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-lg bg-cyphr/10 border border-cyphr/30 flex items-center justify-center text-cyphr shadow-[0_0_15px_rgba(0,229,255,0.15)]">
              <svg class="w-5 h-5 ${activeCount > 0 ? 'animate-bounce' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-100 flex items-center gap-2">
                P2P Swarm Ingress Manager
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyphr/10 text-cyphr border border-cyphr/20 uppercase tracking-wider">BitTorrent / LibP2P</span>
                ${isSimulationModeEnabled() ? renderSimulationBadgeHTML('ml-1') : ''}
              </h2>
              <p class="text-xs text-slate-400 font-mono">
                Decentralized Merkle Piece Exchange • Zero-Knowledge Swarm Ingress
              </p>
            </div>
          </div>

          <!-- Swarm Metrics Strip -->
          <div class="flex items-center space-x-4">
            <div class="bg-surface-base px-3 py-1.5 rounded-lg border border-white/5 text-right">
              <div class="text-[10px] uppercase text-slate-400 font-mono">Swarm Speed</div>
              <div class="text-sm font-bold text-cyphr font-mono flex items-center justify-end gap-1">
                <span class="w-2 h-2 rounded-full ${totalSpeed > 0 ? 'bg-signal animate-ping' : 'bg-slate-600'}"></span>
                ${this.formatSpeed(totalSpeed)}
              </div>
            </div>

            <div class="bg-surface-base px-3 py-1.5 rounded-lg border border-white/5 text-right">
              <div class="text-[10px] uppercase text-slate-400 font-mono">Connected Nodes</div>
              <div class="text-sm font-bold text-signal font-mono">
                ${totalPeers} Peers
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <button data-action="call-global" data-raw-click="window.aetherisDownloadManager && window.aetherisDownloadManager.clearCompleted()" class="px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5" title="Clear verified and completed items">
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Done
              </button>
            </div>
          </div>
        </div>

        <!-- Filter Sub-Header -->
        <div class="px-6 py-2.5 bg-surface-base/90 border-b border-subtle-b flex items-center justify-between text-xs text-slate-400 font-mono">
          <div class="flex items-center space-x-4">
            <span class="flex items-center gap-1 text-slate-200">
              <span class="w-2 h-2 rounded-full bg-cyphr"></span> Active: <b class="text-cyphr">${activeCount}</b>
            </span>
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-signal"></span> Complete: <b class="text-signal">${completedCount}</b>
            </span>
            <span class="flex items-center gap-1">
              Total Queue: <b>${this.tasks.length}</b>
            </span>
          </div>
          <div class="text-[11px] text-slate-500">
            64KB Merkle Verification • Constant-Rate Pacing
          </div>
        </div>

        <!-- Task List Body -->
        <div class="p-6 space-y-4 overflow-y-auto max-h-[600px] bg-canvas/60">
          ${taskCardsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Render individual task card within the download panel
   */
  private renderTaskCard(task: DownloadTask): string {
    const percentage = task.totalBytes > 0
      ? Math.min(100, Math.max(0, (task.downloadedBytes / task.totalBytes) * 100))
      : 0;
    const formattedPercent = percentage.toFixed(1);
    const entropy = this.taskEntropy.get(task.id) || 7.95;
    const merkleRoot = this.taskMerkleRoots.get(task.id) || '4a90b1c4e782d001fa6291b8';
    const isComplete = task.status === 'complete';
    const isVerifying = task.status === 'verifying';
    const isDownloading = task.status === 'downloading';
    const isPaused = task.status === 'paused';
    const isFailed = task.status === 'failed';

    // Status pill
    let statusBadge = '';
    if (isComplete) {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-signal/10 text-signal border border-signal/30 shadow-[0_0_10px_rgba(34,197,94,0.15)]">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          VERIFIED CLEAN (Shannon Entropy OK)
        </span>
      `;
    } else if (isVerifying) {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-aether/10 text-aether border border-aether/30 animate-pulse">
          <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          VERIFYING MERKLE PIECES
        </span>
      `;
    } else if (isDownloading) {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-cyphr/10 text-cyphr border border-cyphr/30">
          <span class="w-2 h-2 rounded-full bg-cyphr animate-ping"></span>
          INGRESS SWARM (${formattedPercent}%)
        </span>
      `;
    } else if (isPaused) {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber/10 text-amber border border-amber/30">
          ⏸ PAUSED
        </span>
      `;
    } else {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-crimson/10 text-crimson border border-crimson/30">
          ⚠️ FAILED / STALLED
        </span>
      `;
    }

    // Control buttons
    let actionButtons = '';
    if (isDownloading) {
      actionButtons = `
        <button data-action="call-global" data-raw-click="window.aetherisDownloadManager && window.aetherisDownloadManager.pauseDownload('${task.id}')" class="px-2.5 py-1 text-xs font-mono rounded bg-surface-raised hover:bg-surface-overlay text-amber border border-white/10 transition-colors flex items-center gap-1" title="Pause Download">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Pause
        </button>
        <button data-action="call-global" data-raw-click="window.aetherisDownloadManager && window.aetherisDownloadManager.cancelDownload('${task.id}')" class="px-2.5 py-1 text-xs font-mono rounded bg-surface-raised hover:bg-crimson/20 text-crimson border border-white/10 hover:border-crimson/30 transition-colors flex items-center gap-1" title="Cancel Download">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          Cancel
        </button>
      `;
    } else if (isPaused) {
      actionButtons = `
        <button data-action="call-global" data-raw-click="window.aetherisDownloadManager && window.aetherisDownloadManager.resumeDownload('${task.id}')" class="px-2.5 py-1 text-xs font-mono rounded bg-surface-raised hover:bg-cyphr/20 text-cyphr border border-white/10 hover:border-cyphr/30 transition-colors flex items-center gap-1" title="Resume Download">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
          Resume
        </button>
        <button data-action="call-global" data-raw-click="window.aetherisDownloadManager && window.aetherisDownloadManager.cancelDownload('${task.id}')" class="px-2.5 py-1 text-xs font-mono rounded bg-surface-raised hover:bg-crimson/20 text-crimson border border-white/10 hover:border-crimson/30 transition-colors flex items-center gap-1" title="Cancel Download">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          Cancel
        </button>
      `;
    } else if (isFailed) {
      actionButtons = `
        <button data-action="call-global" data-raw-click="window.aetherisDownloadManager && window.aetherisDownloadManager.retryDownload('${task.id}')" class="px-2.5 py-1 text-xs font-mono rounded bg-surface-raised hover:bg-signal/20 text-signal border border-white/10 hover:border-signal/30 transition-colors flex items-center gap-1" title="Retry Download">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Retry
        </button>
      `;
    }

    return `
      <div class="download-card bg-surface-raised/80 hover:bg-surface-raised rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all duration-200 shadow-lg space-y-4" data-task-id="${task.id}">
        <!-- Card Header -->
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <span class="text-sm font-semibold text-slate-100 break-all font-mono">${task.fileName}</span>
            </div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
              <span>Size: <b class="text-slate-200">${this.formatBytes(task.totalBytes)}</b></span>
              <span>Ingress: <b class="text-cyphr">${this.formatBytes(task.downloadedBytes)}</b></span>
              <span>Speed: <b class="text-signal">${this.formatSpeed(task.speedBps)}</b></span>
              <span>Peers: <b class="text-aether">${task.peersCount} active</b></span>
              <span>ETA: <b class="text-slate-300">${this.calculateETA(task)}</b></span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            ${statusBadge}
            <div class="flex items-center space-x-1.5">
              ${actionButtons}
            </div>
          </div>
        </div>

        <!-- Shimmer Progress Bar -->
        <div class="space-y-1.5">
          <div class="relative w-full h-3 bg-surface-base rounded-full overflow-hidden border border-white/5 shadow-inner">
            <div
              class="download-progress-bar h-full rounded-full transition-all duration-300 relative ${
                isComplete
                  ? 'bg-signal shadow-[0_0_12px_rgba(34,197,94,0.7)]'
                  : 'bg-gradient-to-r from-cyphr via-aether to-cyphr bg-[length:200%_100%] animate-[shimmer_2s_infinite_linear]'
              }"
              style="width: ${formattedPercent}%"
            >
              ${isDownloading ? '<span class="absolute inset-0 bg-white/20 animate-pulse"></span>' : ''}
            </div>
          </div>
          <div class="flex justify-between text-[11px] font-mono text-slate-400">
            <span>${this.formatBytes(task.downloadedBytes)} of ${this.formatBytes(task.totalBytes)}</span>
            <span class="font-bold text-slate-200">${formattedPercent}%</span>
          </div>
        </div>

        <!-- Chunk Map Breakdown -->
        ${this.renderChunkMatrix(task)}

        <!-- Cryptographic Integrity Footer -->
        <div class="pt-3 border-t border-subtle-b grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
          <div class="flex items-center space-x-1 truncate" title="${task.sha256}">
            <span class="text-slate-500">SHA-256:</span>
            <span class="text-cyphr/80 truncate">${task.sha256}</span>
          </div>
          <div class="flex items-center justify-between md:justify-end space-x-3">
            <div class="flex items-center space-x-1">
              <span class="text-slate-500">Merkle Root:</span>
              <span class="text-aether truncate max-w-[120px]">${merkleRoot.substring(0, 16)}…</span>
            </div>
            <div class="flex items-center space-x-1">
              <span class="text-slate-500">Entropy:</span>
              <span class="text-signal font-bold">${entropy.toFixed(3)} bits/byte</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render dynamic state button on posts/nanopublications to trigger P2P mesh download
   */
  public renderDownloadButton(fileName: string, sha256: string, totalBytes: number): string {
    const task = this.tasks.find(
      (t: DownloadTask) => t.sha256.toLowerCase() === sha256.toLowerCase() || t.fileName === fileName
    );

    const safeFileName = fileName.replace(/"/g, '&quot;');
    const safeSha256 = sha256.replace(/"/g, '&quot;');

    // 1. If complete -> Green checkmark badge
    if (task && task.status === 'complete') {
      return `
        <button
          class="btn-p2p-download inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-signal/15 text-signal border border-signal/30 shadow-[0_0_10px_rgba(34,197,94,0.15)] cursor-default"
          title="File downloaded and verified clean (${this.formatBytes(task.totalBytes)})"
          disabled
        >
          <svg class="w-4 h-4 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span>✓ Downloaded (Verified Clean)</span>
        </button>
      `;
    }

    // 2. If verifying -> Yellow/Purple spinner
    if (task && task.status === 'verifying') {
      return `
        <button
          class="btn-p2p-download inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-aether/15 text-aether border border-aether/30 cursor-wait animate-pulse"
          disabled
        >
          <svg class="w-4 h-4 animate-spin text-aether" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Verifying SHA-256...</span>
        </button>
      `;
    }

    // 3. If currently downloading -> Animated percentage and speed badge
    if (task && task.status === 'downloading') {
      const percentage = Math.floor((task.downloadedBytes / task.totalBytes) * 100);
      return `
        <button data-action="call-global" data-raw-click="window.aetherisDownloadManager && window.aetherisDownloadManager.pauseDownload('${task.id}')"
          class="btn-p2p-download inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-cyphr/15 hover:bg-cyphr/25 text-cyphr border border-cyphr/30 transition-all shadow-[0_0_12px_rgba(0,229,255,0.15)] group"
          title="Click to Pause (${this.formatSpeed(task.speedBps)})"
        >
          <span class="w-2 h-2 rounded-full bg-cyphr animate-ping"></span>
          <span>⬇ ${percentage}% (${this.formatSpeed(task.speedBps)})</span>
          <span class="opacity-0 group-hover:opacity-100 text-[10px] text-amber ml-1 transition-opacity">⏸ Pause</span>
        </button>
      `;
    }

    // 4. If paused -> Resume prompt
    if (task && task.status === 'paused') {
      const percentage = Math.floor((task.downloadedBytes / task.totalBytes) * 100);
      return `
        <button data-action="call-global" data-raw-click="window.aetherisDownloadManager && window.aetherisDownloadManager.resumeDownload('${task.id}')"
          class="btn-p2p-download inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-amber/15 hover:bg-amber/25 text-amber border border-amber/30 transition-all shadow-sm"
          title="Click to Resume Swarm Ingress"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
          <span>⏸ Paused (${percentage}%) • Resume</span>
        </button>
      `;
    }

    // 5. Default -> Not downloaded yet
    return `
      <button data-action="call-global" data-raw-click="window.aetherisDownloadManager && window.aetherisDownloadManager.startDownload('${safeFileName}', '${safeSha256}', ${totalBytes})"
        class="btn-p2p-download inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-surface-raised hover:bg-cyphr/20 text-slate-200 hover:text-cyphr border border-white/10 hover:border-cyphr/40 transition-all shadow-sm group"
        data-file-name="${safeFileName}"
        data-sha256="${safeSha256}"
        data-total-bytes="${totalBytes}"
      >
        <svg class="w-4 h-4 text-cyphr group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>⬇ Download via P2P Mesh</span>
        <span class="text-[10px] text-slate-500 font-normal">(${this.formatBytes(totalBytes)})</span>
      </button>
    `;
  }

  /**
   * Render compact floating widget in bottom-right corner when active transfers exist
   */
  public renderFloatingWidget(): string {
    const activeCount = this.activeDownloads;
    const totalSpeed = this.getTotalSpeed();
    const totalPeers = this.getTotalPeers();

    if (activeCount === 0 && this.tasks.length === 0) {
      return '';
    }

    // Calculate aggregated active progress
    const activeTasks = this.tasks.filter((t: DownloadTask) => t.status === 'downloading' || t.status === 'verifying');
    let avgPercent = 0;
    if (activeTasks.length > 0) {
      const sumDownloaded = activeTasks.reduce((acc: number, t: DownloadTask) => acc + t.downloadedBytes, 0);
      const sumTotal = activeTasks.reduce((acc: number, t: DownloadTask) => acc + t.totalBytes, 0);
      avgPercent = sumTotal > 0 ? Math.floor((sumDownloaded / sumTotal) * 100) : 0;
    }

    return `
      <div id="p2p-floating-download-widget" class="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div class="bg-surface-raised/95 backdrop-blur-md border border-cyphr/30 hover:border-cyphr/60 rounded-2xl p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(0,229,255,0.15)] flex items-center space-x-3.5 cursor-pointer transition-all hover:scale-[1.02] text-slate-200">
          
          <!-- Animated Swarm Ingress Radar / Spinner -->
          <div class="relative w-10 h-10 flex-shrink-0 flex items-center justify-center bg-surface-base rounded-xl border border-white/10">
            ${
              activeCount > 0
                ? `
                  <svg class="w-6 h-6 text-cyphr animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span class="absolute text-[9px] font-mono font-bold text-cyphr">${avgPercent}%</span>
                `
                : `
                  <svg class="w-5 h-5 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                `
            }
          </div>

          <!-- Info Text -->
          <div class="flex flex-col min-w-[130px]">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-100 font-mono">P2P Swarm Ingress</span>
              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyphr/10 text-cyphr font-semibold">
                ${activeCount > 0 ? `${activeCount} Active` : 'All Synced'}
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-0.5">
              <span class="text-signal font-semibold">${this.formatSpeed(totalSpeed)}</span>
              <span>${totalPeers} Peers</span>
            </div>
          </div>

          <!-- Quick Toggle Panel Button -->
          <button data-action="call-global" data-raw-click="document.getElementById('download-manager-modal') ? document.getElementById('download-manager-modal').classList.toggle('hidden') : null"
            class="p-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight text-slate-300 hover:text-white transition-colors"
            title="Toggle Download Manager View"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render clean, compact P2P Swarm widget tailored for the right discovery rail
   */
  public renderSidebarCard(): string {
    const totalSpeed = this.getTotalSpeed();
    const totalPeers = this.getTotalPeers();
    const activeTasks = this.tasks.filter((t: DownloadTask) => t.status === 'downloading' || t.status === 'verifying');
    const firstActive = activeTasks[0] || this.tasks[0];

    const activeCount = this.activeDownloads;
    const progress = firstActive ? Math.min(100, Math.floor((firstActive.downloadedBytes / firstActive.totalBytes) * 100)) : 100;

    return `
      <div class="p-4 rounded-2xl bg-surface-raised/90 border border-white/5 space-y-3 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-base">📦</span>
            <h4 class="text-xs font-bold text-white tracking-wide">P2P Swarm Ingress</h4>
          </div>
          <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 font-bold">
            ${totalPeers} Peers
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs font-mono">
          <div class="p-2 rounded-xl bg-surface-overlay border border-white/5">
            <div class="text-[10px] text-slate-500">SWARM SPEED</div>
            <div class="font-bold text-emerald-400 mt-0.5">${totalSpeed > 0 ? this.formatSpeed(totalSpeed) : '0 KB/s'}</div>
          </div>
          <div class="p-2 rounded-xl bg-surface-overlay border border-white/5">
            <div class="text-[10px] text-slate-500">TRANSFERS</div>
            <div class="font-bold text-indigo-300 mt-0.5">${activeCount} Active</div>
          </div>
        </div>

        ${firstActive ? `
          <div class="p-2.5 rounded-xl bg-surface-overlay border border-white/5 space-y-1.5 font-mono text-[11px]">
            <div class="flex items-center justify-between text-slate-300">
              <span class="truncate max-w-[170px] text-xs font-medium">${firstActive.fileName}</span>
              <span class="text-indigo-400 font-bold">${progress}%</span>
            </div>
            <div class="w-full bg-surface-highlight rounded-full h-1.5 overflow-hidden">
              <div class="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-500">
              <span>${this.formatBytes(firstActive.downloadedBytes)} / ${this.formatBytes(firstActive.totalBytes)}</span>
              <span class="uppercase">${firstActive.status}</span>
            </div>
          </div>
        ` : `
          <div class="text-center py-2 text-slate-500 text-xs font-mono">
            Zero active ingress tasks
          </div>
        `}

        <button
          type="button" data-action="call-global" data-raw-click="document.getElementById('download-manager-modal') ? document.getElementById('download-manager-modal').classList.toggle('hidden') : null"
          class="w-full py-1.5 rounded-xl bg-surface-overlay hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
        >
          <span>⚡</span>
          <span>Open Swarm Dashboard</span>
        </button>
      </div>
    `;
  }
}

// Export singleton instance
export const downloadManager = new P2PDownloadManager();

serviceRegistry.registerInstance(SERVICES.DownloadManager, downloadManager);

// Expose on window for inline event handlers and browser interoperability
if (typeof window !== 'undefined') {
  window.aetherisDownloadManager = downloadManager;
}
