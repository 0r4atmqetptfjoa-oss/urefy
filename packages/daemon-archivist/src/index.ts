import { ArchivistDaemon } from './daemon.js';

export * from './crawler.js';
export * from './daemon.js';
export * from './importer.js';

const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:4000';

async function main() {
  console.log(`[UREfy Archivist Daemon] Connecting to ${SERVER_URL}...`);
  const daemon = new ArchivistDaemon(SERVER_URL);

  try {
    await daemon.connect();
    console.log(`[UREfy Archivist Daemon] Connected and authenticated. Fingerprint: ${daemon.getKeypair().fingerprint}`);

    // Seed an initial verified security release artifact
    const sampleBinary = new Uint8Array(1024 * 128); // 128 KB
    for (let i = 0; i < sampleBinary.length; i++) {
      sampleBinary[i] = (i * 31 + 17) % 256;
    }

    const artifact = await daemon.publishRelease(
      'UREfy Cryptographic Micro-Kernel v1.0.0',
      'aetheris-microkernel-x86_64.bin',
      sampleBinary
    );

    console.log(`[UREfy Archivist Daemon] Published artifact: ${artifact.title} (SHA-256: ${artifact.sha256.substring(0, 16)}...)`);
  } catch (err: any) {
    console.error(`[UREfy Archivist Daemon] Error: ${err.message}`);
  }
}

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  main();
}
