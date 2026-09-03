import { WebSocket } from 'ws';
import { generateKeyPair, KeyPair, ZKRLN, Field } from '@aetheris/core-crypto';
import { processArtifact, IngestedArtifact } from './crawler.js';

export class ArchivistDaemon {
  private ws: WebSocket | null = null;
  private keypair: KeyPair;
  private secretKey: bigint;
  private nullifier: string;
  private serverUrl: string;

  constructor(serverUrl: string = 'ws://localhost:4000') {
    this.serverUrl = serverUrl;
    // Deterministic daemon seed so the identity remains stable across restarts
    const daemonSeed = new TextEncoder().encode('aetheris-genesis-archivist-daemon').slice(0, 32);
    this.keypair = generateKeyPair(daemonSeed);
    this.secretKey = Field.hashToField('aetheris-daemon-secret-key');
    this.nullifier = ZKRLN.computeNullifier(this.secretKey);
  }

  public getKeypair(): KeyPair {
    return this.keypair;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.on('open', () => {
        // Authenticate as official Archivist Daemon
        this.send({
          type: 'AUTH',
          fingerprint: this.keypair.fingerprint,
          publicKeyHex: this.keypair.publicKeyHex,
          nullifier: this.nullifier,
          role: 'ARCHIVIST_DAEMON',
        });

        // Subscribe to Vault
        this.send({
          type: 'JOIN_CHANNEL',
          channelId: 'vault-releases',
        });

        resolve();
      });

      this.ws.on('error', (err) => {
        reject(err);
      });
    });
  }

  public async publishRelease(
    title: string,
    fileName: string,
    payloadData: Uint8Array
  ): Promise<IngestedArtifact> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Daemon is not connected to Aetheris Server');
    }

    const artifact = await processArtifact(title, fileName, 'vault-releases', payloadData);

    // 1. Publish Nanopublication
    this.send({
      type: 'PUBLISH_NANOPUBLICATION',
      channelId: 'vault-releases',
      title: artifact.title,
      fileName: artifact.fileName,
      byteSize: artifact.byteSize,
      sha256: artifact.sha256,
      crc32: artifact.crc32,
      entropy: artifact.entropy,
      verdict: artifact.verdict,
      merkleRoot: artifact.merkleRoot,
    });

    // 2. Post structured companion discussion thread
    const epoch = `epoch_${Date.now()}`;
    const share = ZKRLN.createShare(this.secretKey, epoch, artifact.markdownContent);

    this.send({
      type: 'SEND_MESSAGE',
      channelId: 'vault-releases',
      ciphertext: artifact.markdownContent,
      iv: '0'.repeat(24),
      epoch: share.epoch,
      x: share.x,
      y: share.y,
      nullifier: share.nullifier,
    });

    return artifact;
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
