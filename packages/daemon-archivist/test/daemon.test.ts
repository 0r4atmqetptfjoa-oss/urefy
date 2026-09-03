import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AetherisServer } from '@aetheris/server-edge';
import { ArchivistDaemon } from '../src/daemon.js';

describe('Archivist Autonomous Daemon', () => {
  let server: AetherisServer;
  let daemon: ArchivistDaemon;
  const TEST_PORT = 4198;

  beforeAll(async () => {
    server = new AetherisServer({ port: TEST_PORT });
    await server.listen(TEST_PORT);

    daemon = new ArchivistDaemon(`ws://localhost:${TEST_PORT}`);
    await daemon.connect();
  });

  afterAll(async () => {
    daemon.close();
    await server.close();
  });

  it('ingests file, audits binary hygiene, and publishes verified artifact to Vault', async () => {
    const testData = new Uint8Array(64 * 1024);
    for (let i = 0; i < testData.length; i++) {
      testData[i] = (i * 7) % 256;
    }

    const artifact = await daemon.publishRelease(
      'Rust Zero-Knowledge Verifier Runtime v0.9.4',
      'zk-runtime-amd64.bin',
      testData
    );

    expect(artifact.title).toBe('Rust Zero-Knowledge Verifier Runtime v0.9.4');
    expect(artifact.sha256.length).toBe(64);
    expect(artifact.crc32.length).toBe(8);
    expect(artifact.entropy).toBeGreaterThan(5.0);
    expect(artifact.markdownContent).toContain('Technical Release & Archival Summary');

    // Verify persisted in database
    await new Promise(r => setTimeout(r, 100));
    const nanos = server.getDatabase().getNanopublications('vault-releases');
    expect(nanos.length).toBeGreaterThan(0);
    const found = nanos.find(n => n.fileName === 'zk-runtime-amd64.bin');
    expect(found).toBeDefined();
    expect(found?.sha256).toBe(artifact.sha256);
  });
});
