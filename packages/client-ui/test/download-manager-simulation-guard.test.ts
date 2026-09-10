import './helpers/disable-demo.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { P2PDownloadManager } from '../src/download-manager.js';
import { setSimulationMode } from '../src/simulation-mode.js';
import * as adminAuth from '../src/admin-auth.js';

describe('Download Manager Simulation Guard & Zero-Fake-Peers Invariant', () => {
  let manager: P2PDownloadManager;

  afterEach(() => {
    if (manager) manager.destroy();
    setSimulationMode(false);
    vi.restoreAllMocks();
  });

  it('strictly returns empty peers in production mode (zero fake peers)', () => {
    vi.spyOn(adminAuth, 'isProductionBuild').mockReturnValue(false);
    setSimulationMode(false);

    manager = new P2PDownloadManager();
    const taskId = manager.startDownload('payload.bin', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 1024 * 1024);

    const peers = manager.getPeersForTask(taskId);
    expect(peers).toEqual([]);
    expect(manager.tasks[0].peersCount).toBe(0);
  });

  it('generates simulated peers when simulation mode is explicitly enabled', () => {
    vi.spyOn(adminAuth, 'isProductionBuild').mockReturnValue(false);
    setSimulationMode(true);

    manager = new P2PDownloadManager();
    const taskId = manager.startDownload('unique-payload.bin', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 1024 * 1024);

    const peers = manager.getPeersForTask(taskId);
    expect(peers.length).toBeGreaterThan(0);
  });
});
(globalThis as any).__UREFY_DEMO_MODE__ = false;
