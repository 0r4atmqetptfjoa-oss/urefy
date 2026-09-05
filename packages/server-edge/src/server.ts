import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server as HttpServer, IncomingMessage, ServerResponse } from 'node:http';
import { AetherisDatabase, MessageRecord, NanopublicationRecord } from './db/database.js';
import { ZKRLN, RLNShare, verifySignature, NonceReplayGuard, PoWChallengeEngine } from '@aetheris/core-crypto';
import { executeAtomicRollback } from './rollback.js';
import { WAFDefenseEngine, defaultWAF } from './waf-defense.js';
import { PayloadSanitizer } from './payload-sanitizer.js';
import { ThreatHoneypotEngine } from './threat-honeypot.js';

export interface ServerConfig {
  port: number;
  dbPath?: string;
  maxPacketSizeBytes?: number;
}

export class AetherisServer {
  private wss: WebSocketServer;
  private httpServer: HttpServer;
  private db: AetherisDatabase;
  private clients: Map<WebSocket, { ip: string; fingerprint?: string; nullifier?: string; channels: Set<string> }>;
  private activeShares: Map<string, RLNShare>; // Key: `${epoch}:${nullifier}`
  private waf: WAFDefenseEngine;
  private honeypot: ThreatHoneypotEngine;
  private nonceGuard: NonceReplayGuard;
  private powEngine: PoWChallengeEngine;
  private maxPacketSizeBytes: number;

  constructor(config: ServerConfig) {
    this.db = new AetherisDatabase(config.dbPath || ':memory:');
    this.clients = new Map();
    this.activeShares = new Map();
    this.waf = new WAFDefenseEngine();
    this.honeypot = new ThreatHoneypotEngine(this.waf);
    this.nonceGuard = new NonceReplayGuard();
    this.powEngine = new PoWChallengeEngine();
    this.maxPacketSizeBytes = config.maxPacketSizeBytes || 65536; // 64 KB

    this.httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      const clientIp = this.extractClientIP(req);
      const url = req.url || '/';

      // 1. Decoy Honeypot Trap Check
      if (this.honeypot.handleRequest(url, clientIp, req.headers['user-agent'])) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Security Incident: Honeypot Decoy Probed',
          ip: clientIp,
          status: 'PERMANENTLY_QUARANTINED',
        }));
        return;
      }

      // 2. Layer 7 WAF Rate Limit Check
      const wafCheck = this.waf.evaluateRequest(clientIp);
      if (!wafCheck.allowed) {
        res.writeHead(429, {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((wafCheck.retryAfterMs || 1000) / 1000).toString(),
        });
        res.end(JSON.stringify({ error: wafCheck.reason, retryAfterMs: wafCheck.retryAfterMs }));
        return;
      }

      // 3. PoW Challenge Endpoints
      if (url === '/api/pow-challenge') {
        const challenge = this.powEngine.generateChallenge(3); // 3 leading zeros
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(challenge));
        return;
      }

      if (url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', timestamp: Date.now() }));
        return;
      }

      if (url === '/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          peersOnline: this.clients.size,
          channelsCount: this.db.getChannels().length,
          timestamp: Date.now(),
        }));
        return;
      }

      if (url === '/waf-stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          waf: this.waf.getMetrics(),
          honeypot: this.honeypot.getSummary(),
          recentIncidents: this.honeypot.getIncidents(10),
          timestamp: Date.now(),
        }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });

    this.wss = new WebSocketServer({ server: this.httpServer });
    this.setupWebSocket();
  }

  public getDatabase(): AetherisDatabase {
    return this.db;
  }

  public getWAF(): WAFDefenseEngine {
    return this.waf;
  }

  public getHoneypot(): ThreatHoneypotEngine {
    return this.honeypot;
  }

  public getNonceGuard(): NonceReplayGuard {
    return this.nonceGuard;
  }

  public getPoWEngine(): PoWChallengeEngine {
    return this.powEngine;
  }

  private extractClientIP(req: IncomingMessage): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientIp = this.extractClientIP(req);

      // Check WAF connection limits
      const connCheck = this.waf.registerConnection(clientIp);
      if (!connCheck.allowed) {
        ws.close(1008, connCheck.reason || 'Connection rejected by WAF');
        return;
      }

      this.clients.set(ws, { ip: clientIp, channels: new Set() });

      // Send initial channels list
      const channels = this.db.getChannels();
      this.send(ws, { type: 'CHANNELS_LIST', channels });

      ws.on('message', (raw: Buffer) => {
        // Enforce max packet size to prevent memory exhaustion / bomb frames
        if (raw.length > this.maxPacketSizeBytes) {
          this.send(ws, { type: 'ERROR', message: `Packet exceeds maximum allowed size (${this.maxPacketSizeBytes} bytes)` });
          return;
        }

        // WAF rate-limit per packet
        const wafCheck = this.waf.evaluateRequest(clientIp);
        if (!wafCheck.allowed) {
          this.send(ws, { type: 'RATE_LIMIT_ERROR', message: wafCheck.reason });
          return;
        }

        try {
          // Safe JSON parse with prototype pollution stripping
          const rawStr = raw.toString();
          const packet = PayloadSanitizer.safeJSONParse(rawStr);
          this.handlePacket(ws, packet, clientIp);
        } catch (err: any) {
          this.send(ws, { type: 'ERROR', message: `Malformed packet: ${err.message}` });
        }
      });

      ws.on('close', () => {
        this.waf.unregisterConnection(clientIp);
        this.clients.delete(ws);
      });
    });
  }

  private handlePacket(ws: WebSocket, packet: any, clientIp: string): void {
    const client = this.clients.get(ws);
    if (!client) return;

    // Optional Nonce Replay Check for state mutations
    if (packet.nonce && packet.timestamp) {
      const nonceCheck = this.nonceGuard.verifyAndConsume({
        nonce: packet.nonce,
        timestamp: packet.timestamp,
        senderFingerprint: client.fingerprint || clientIp,
      });

      if (!nonceCheck.valid) {
        this.send(ws, { type: 'REPLAY_ERROR', message: nonceCheck.reason });
        return;
      }
    }

    switch (packet.type) {
      case 'AUTH': {
        const { fingerprint, publicKeyHex, nullifier, role } = packet;

        if (!fingerprint || !PayloadSanitizer.isValidIdentifier(fingerprint)) {
          this.send(ws, { type: 'ERROR', message: 'Invalid or disallowed fingerprint format' });
          return;
        }

        client.fingerprint = fingerprint;
        client.nullifier = nullifier;

        const isQuarantined = (nullifier && this.db.isRevoked(nullifier)) ? 1 : 0;
        this.db.upsertIdentity({
          fingerprint,
          publicKeyHex: publicKeyHex || '',
          nullifier: nullifier || '',
          role: role || 'MEMBER',
          isQuarantined,
          createdAt: Date.now(),
        });

        this.send(ws, {
          type: 'AUTH_SUCCESS',
          fingerprint,
          isQuarantined: isQuarantined === 1,
        });
        break;
      }

      case 'JOIN_CHANNEL': {
        const { channelId } = packet;
        if (!channelId || !PayloadSanitizer.isValidIdentifier(channelId)) {
          this.send(ws, { type: 'ERROR', message: 'Invalid channel ID' });
          return;
        }
        client.channels.add(channelId);

        const messages = this.db.getMessages(channelId);
        const nanopublications = this.db.getNanopublications(channelId);
        this.send(ws, { type: 'CHANNEL_DATA', channelId, messages, nanopublications });
        break;
      }

      case 'SEND_MESSAGE': {
        this.handleSendMessage(ws, packet);
        break;
      }

      case 'PUBLISH_NANOPUBLICATION': {
        this.handlePublishNanopublication(ws, packet);
        break;
      }

      case 'WEBRTC_SIGNAL': {
        const { targetFingerprint, signal } = packet;
        for (const [otherWs, otherClient] of this.clients.entries()) {
          if (otherClient.fingerprint === targetFingerprint) {
            this.send(otherWs, {
              type: 'WEBRTC_SIGNAL',
              fromFingerprint: client.fingerprint,
              signal,
            });
            break;
          }
        }
        break;
      }

      case 'EXECUTE_ROLLBACK': {
        if (!client.fingerprint) return;
        const { targetActorFingerprint } = packet;
        const result = executeAtomicRollback(this.db, targetActorFingerprint, client.fingerprint);
        this.send(ws, { type: 'ROLLBACK_RESULT', result });
        this.broadcast({ type: 'AUDIT_NOTIFICATION', action: 'ROLLBACK', targetActorFingerprint });
        break;
      }

      default:
        this.send(ws, { type: 'ERROR', message: `Unknown packet type: ${packet.type}` });
    }
  }

  private handleSendMessage(ws: WebSocket, packet: any): void {
    const client = this.clients.get(ws);
    if (!client || !client.fingerprint) {
      this.send(ws, { type: 'ERROR', message: 'Unauthorized: Complete AUTH first' });
      return;
    }

    const { id, channelId, ciphertext, iv, epoch, x, y, nullifier, signature } = packet;

    if (!channelId || !PayloadSanitizer.isValidIdentifier(channelId)) {
      this.send(ws, { type: 'ERROR', message: 'Invalid channel ID' });
      return;
    }

    // Check if identity is quarantined / slashed
    if (nullifier && this.db.isRevoked(nullifier)) {
      this.send(ws, {
        type: 'ERROR',
        message: 'Forbidden: Your identity is revoked on the ZK-RLN Nullifier Tree',
      });
      return;
    }

    // ZK-RLN Double-Sign Slashing Detection
    const shareKey = `${epoch}:${nullifier}`;
    const currentShare: RLNShare = { nullifier, epoch, x, y };

    if (nullifier && this.activeShares.has(shareKey)) {
      const existingShare = this.activeShares.get(shareKey)!;
      try {
        const verification = ZKRLN.verifyRateLimitBreach(existingShare, currentShare);
        if (verification.verified) {
          this.db.addRevocation({
            nullifier,
            breachedEpoch: String(epoch),
            timestamp: Date.now(),
          });

          this.broadcast({
            type: 'QUARANTINE_ALERT',
            nullifier,
            epoch,
            reason: 'RLN Rate Limit Violation: Double message broadcast in single epoch',
          });

          this.send(ws, {
            type: 'SLASHING_NOTICE',
            message: 'Your identity nullifier has been revoked due to rate limit violation.',
            nullifier,
            epoch,
          });
          return;
        }
      } catch (err: any) {
        console.error('RLN violation verification error:', err.message);
      }
    }

    if (nullifier) {
      if (this.activeShares.size >= 10000) {
        const currentEpoch = Number(epoch) || 0;
        for (const [k, share] of this.activeShares.entries()) {
          if (Number(share.epoch) < currentEpoch - 5 || this.activeShares.size >= 10000) {
            this.activeShares.delete(k);
          }
        }
      }
      this.activeShares.set(shareKey, currentShare);
    }

    // Persist message
    const msgRecord: MessageRecord = {
      id: id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channelId,
      authorFingerprint: client.fingerprint,
      ciphertext,
      iv,
      epoch: epoch || 0,
      x: x || '0',
      y: y || '0',
      nullifier: nullifier || '',
      signature: signature || '',
      status: 'VISIBLE',
      createdAt: Date.now(),
    };

    this.db.insertMessage(msgRecord);

    this.broadcastToChannel(channelId, {
      type: 'NEW_MESSAGE',
      message: msgRecord,
    });
  }

  private handlePublishNanopublication(ws: WebSocket, packet: any): void {
    const { id, channelId, title, fileName, byteSize, sha256, crc32, entropy, verdict, merkleRoot } = packet;

    const safeTitle = PayloadSanitizer.sanitizeString(title || 'Verified Release');
    const safeFileName = PayloadSanitizer.sanitizeString(fileName || 'file.bin');

    const nanoRecord: NanopublicationRecord = {
      id: id || `nano-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channelId,
      title: safeTitle,
      fileName: safeFileName,
      byteSize,
      sha256,
      crc32,
      entropy,
      verdict,
      merkleRoot,
      seederCount: 1,
      createdAt: Date.now(),
    };

    this.db.insertNanopublication(nanoRecord);

    this.broadcastToChannel(channelId, {
      type: 'NEW_NANOPUBLICATION',
      nanopublication: nanoRecord,
    });
  }

  private send(ws: WebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private broadcast(data: any): void {
    const serialized = JSON.stringify(data);
    for (const [ws] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(serialized);
      }
    }
  }

  private broadcastToChannel(channelId: string, data: any): void {
    const serialized = JSON.stringify(data);
    for (const [ws, client] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN && client.channels.has(channelId)) {
        ws.send(serialized);
      }
    }
  }

  public listen(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(port, () => {
        resolve();
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.clients.clear();
      this.activeShares.clear();
      this.wss.close(() => {
        this.httpServer.close(() => {
          this.db.close();
          resolve();
        });
      });
    });
  }
}
