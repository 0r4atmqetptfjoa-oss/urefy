import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server as HttpServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AetherisDatabase } from './db/database.js';
import { NonceReplayGuard, PoWChallengeEngine } from '@aetheris/core-crypto';
import { executeAtomicRollback } from './rollback.js';
import { WAFDefenseEngine } from './waf-defense.js';
import { PayloadSanitizer } from './payload-sanitizer.js';
import { ThreatHoneypotEngine } from './threat-honeypot.js';
import {
  RelayProtocolEngine,
  RelayStateManager,
  RelayPersistence,
  RelayBroadcaster,
  RelaySession,
} from './relay/index.js';

export interface ServerConfig {
  port: number;
  dbPath?: string;
  maxPacketSizeBytes?: number;
  requireChallengeHandshake?: boolean;
  trustProxy?: boolean;
}

export class AetherisServer {
  private wss: WebSocketServer;
  private httpServer: HttpServer;
  private db: AetherisDatabase;
  private state: RelayStateManager;
  private engine: RelayProtocolEngine;
  private sessions: Map<WebSocket, RelaySession>;
  private socketMap: Map<string, WebSocket>;
  private waf: WAFDefenseEngine;
  private honeypot: ThreatHoneypotEngine;
  private nonceGuard: NonceReplayGuard;
  private powEngine: PoWChallengeEngine;
  private maxPacketSizeBytes: number;
  private trustProxy: boolean;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: ServerConfig) {
    this.db = new AetherisDatabase(config.dbPath || ':memory:');
    this.sessions = new Map();
    this.socketMap = new Map();
    this.waf = new WAFDefenseEngine();
    this.honeypot = new ThreatHoneypotEngine(this.waf);
    this.nonceGuard = new NonceReplayGuard();
    this.powEngine = new PoWChallengeEngine();
    this.maxPacketSizeBytes = config.maxPacketSizeBytes || 65536; // 64 KB
    this.trustProxy = config.trustProxy ?? false;

    this.state = new RelayStateManager({
      maxPresenceCount: 10000,
      presenceTtlMs: 900000,
      shareTtlMs: 300000,
      challengeTtlMs: 60000,
    });

    const persistence: RelayPersistence = {
      getChannels: () =>
        this.db.getChannels().map((c) => ({
          id: c.id,
          space: c.space,
          name: c.name,
          description: c.description,
          isEncrypted: c.isEncrypted === 1,
        })),
      getMessages: (channelId, limit) =>
        this.db.getMessages(channelId, limit).map((m) => ({
          id: m.id,
          channelId: m.channelId,
          authorFingerprint: m.authorFingerprint,
          ciphertext: m.ciphertext,
          text: m.ciphertext,
          iv: m.iv,
          epoch: m.epoch,
          x: m.x,
          y: m.y,
          nullifier: m.nullifier,
          signature: m.signature,
          status: m.status,
          createdAt: m.createdAt,
        })),
      insertMessage: (msg) => {
        this.db.insertMessage({
          id: msg.id,
          channelId: msg.channelId,
          authorFingerprint: msg.authorFingerprint,
          ciphertext: msg.ciphertext || msg.text || '',
          iv: msg.iv || '',
          epoch: String(msg.epoch || 0),
          x: msg.x || '0',
          y: msg.y || '0',
          nullifier: msg.nullifier || '',
          signature: msg.signature || '',
          status: (msg.status as any) || 'VISIBLE',
          createdAt: msg.createdAt || Date.now(),
        });
      },
      getNanopublications: (channelId) =>
        this.db.getNanopublications(channelId).map((n) => ({
          id: n.id,
          channelId: n.channelId,
          title: n.title,
          fileName: n.fileName,
          byteSize: n.byteSize,
          sha256: n.sha256,
          crc32: n.crc32,
          entropy: n.entropy,
          verdict: n.verdict,
          merkleRoot: n.merkleRoot,
          seederCount: n.seederCount,
          createdAt: n.createdAt,
        })),
      insertNanopublication: (nano) => {
        this.db.insertNanopublication({
          id: nano.id,
          channelId: nano.channelId,
          title: nano.title,
          fileName: nano.fileName,
          byteSize: nano.byteSize,
          sha256: nano.sha256,
          crc32: nano.crc32,
          entropy: nano.entropy,
          verdict: nano.verdict,
          merkleRoot: nano.merkleRoot,
          seederCount: nano.seederCount,
          createdAt: nano.createdAt,
        });
      },
      upsertIdentity: (identity) => {
        this.db.upsertIdentity(identity);
      },
      isRevoked: (nullifier) => this.db.isRevoked(nullifier),
      revokeNullifier: (nullifier) => {
        this.db.addRevocation({
          nullifier,
          breachedEpoch: 'epoch_auto',
          timestamp: Date.now(),
        });
      },
      executeRollback: (targetActorFingerprint, moderatorFingerprint) => {
        return executeAtomicRollback(this.db, targetActorFingerprint, moderatorFingerprint);
      },
    };

    const broadcaster: RelayBroadcaster = {
      send: (session: RelaySession, packet: any) => {
        const ws = this.socketMap.get(session.id) || session.socket;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(packet));
        }
      },
      broadcast: (packet: any, options?: { sender?: RelaySession; channelId?: string; tag?: string }) => {
        const serialized = JSON.stringify(packet);
        for (const [ws, session] of this.sessions.entries()) {
          if (ws.readyState !== WebSocket.OPEN) continue;
          if (options?.sender && session.id === options.sender.id) continue;

          if (options?.channelId) {
            if (
              session.subscribedChannels.has(options.channelId) ||
              session.currentChannelId === options.channelId
            ) {
              ws.send(serialized);
            }
            continue;
          }

          if (options?.tag) {
            if (options.tag.startsWith('peer:')) {
              const targetFingerprint = options.tag.replace('peer:', '');
              if (session.fingerprint === targetFingerprint) {
                ws.send(serialized);
              }
            }
            continue;
          }

          ws.send(serialized);
        }
      },
    };

    this.engine = new RelayProtocolEngine(this.state, persistence, broadcaster, {
      requireChallengeHandshake: config.requireChallengeHandshake ?? false,
    });

    this.httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      const clientIp = this.extractClientIP(req);
      const url = req.url || '/';

      if (this.honeypot.handleRequest(url, clientIp, req.headers['user-agent'])) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'Security Incident: Honeypot Decoy Probed',
            ip: clientIp,
            status: 'PERMANENTLY_QUARANTINED',
          })
        );
        return;
      }

      const wafCheck = this.waf.evaluateRequest(clientIp);
      if (!wafCheck.allowed) {
        res.writeHead(429, {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((wafCheck.retryAfterMs || 1000) / 1000).toString(),
        });
        res.end(JSON.stringify({ error: wafCheck.reason, retryAfterMs: wafCheck.retryAfterMs }));
        return;
      }

      if (url === '/api/pow-challenge') {
        const challenge = this.powEngine.generateChallenge(3);
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
        res.end(
          JSON.stringify({
            peersOnline: this.sessions.size,
            channelsCount: this.db.getChannels().length,
            activeSharesCount: this.state.getActiveSharesCount(),
            revokedNullifiersCount: this.state.getRevokedCount(),
            timestamp: Date.now(),
          })
        );
        return;
      }

      if (url === '/waf-stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            waf: this.waf.getMetrics(),
            honeypot: this.honeypot.getSummary(),
            recentIncidents: this.honeypot.getIncidents(10),
            timestamp: Date.now(),
          })
        );
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });

    // Enforce maxPayload at protocol parser level, with 2x ceiling so custom JSON ERROR packet still fires for normal oversize tests
    this.wss = new WebSocketServer({
      server: this.httpServer,
      maxPayload: Math.max(this.maxPacketSizeBytes * 4, 1024 * 1024),
    });
    this.setupWebSocket();
  }

  public getDatabase(): AetherisDatabase {
    return this.db;
  }

  public getStateManager(): RelayStateManager {
    return this.state;
  }

  public getProtocolEngine(): RelayProtocolEngine {
    return this.engine;
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

  /**
   * Extracts client IP safely. Only trusts X-Forwarded-For if connected via loopback/local
   * reverse proxy or when trustProxy is explicitly enabled.
   */
  private extractClientIP(req: IncomingMessage): string {
    const socketAddr = req.socket?.remoteAddress || '127.0.0.1';
    const isLocalProxy =
      this.trustProxy ||
      socketAddr === '127.0.0.1' ||
      socketAddr === '::1' ||
      socketAddr === '::ffff:127.0.0.1';

    if (isLocalProxy) {
      const cfIp = req.headers['cf-connecting-ip'];
      if (typeof cfIp === 'string' && cfIp.trim()) {
        return cfIp.trim();
      }
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
      }
    }
    return socketAddr;
  }

  private setupWebSocket(): void {
    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      const clientIp = this.extractClientIP(req);

      const connCheck = this.waf.registerConnection(clientIp);
      if (!connCheck.allowed) {
        ws.close(1008, connCheck.reason || 'Connection rejected by WAF');
        return;
      }

      const sessionId = randomUUID();
      const session: RelaySession = {
        id: sessionId,
        socket: ws,
        ip: clientIp,
        role: 'MEMBER',
        authenticated: false,
        currentChannelId: 'relays-general',
        subscribedChannels: new Set(['relays-general']),
        connectedAt: Date.now(),
        lastSeen: Date.now(),
      };

      this.sessions.set(ws, session);
      this.socketMap.set(sessionId, ws);

      ws.on('pong', () => {
        session.lastSeen = Date.now();
      });

      await this.engine.handleConnection(session);

      ws.on('message', async (raw: Buffer) => {
        session.lastSeen = Date.now();

        if (raw.length > this.maxPacketSizeBytes) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: `Packet exceeds maximum allowed size (${this.maxPacketSizeBytes} bytes)`,
              })
            );
          }
          return;
        }

        const wafCheck = this.waf.evaluateRequest(clientIp);
        if (!wafCheck.allowed) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'RATE_LIMIT_ERROR',
                message: wafCheck.reason,
              })
            );
          }
          return;
        }

        try {
          const rawStr = raw.toString();
          const packet = PayloadSanitizer.safeJSONParse(rawStr);

          if (packet.nonce && packet.timestamp) {
            const nonceCheck = this.nonceGuard.verifyAndConsume({
              nonce: packet.nonce,
              timestamp: packet.timestamp,
              senderFingerprint: session.fingerprint || clientIp,
            });

            if (!nonceCheck.valid) {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: 'REPLAY_ERROR',
                    message: nonceCheck.reason,
                  })
                );
              }
              return;
            }
          }

          await this.engine.handlePacket(session, packet);
        } catch (err: any) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: `Malformed packet: ${err.message}`,
              })
            );
          }
        }
      });

      let closed = false;
      const cleanup = async () => {
        if (closed) return;
        closed = true;
        this.waf.unregisterConnection(clientIp);
        await this.engine.handleDisconnection(session);
        this.sessions.delete(ws);
        this.socketMap.delete(sessionId);
      };

      ws.on('close', cleanup);
      ws.on('error', cleanup);
    });

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [ws, session] of this.sessions.entries()) {
        if (now - session.lastSeen > 120_000) {
          ws.terminate();
          continue;
        }
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }
    }, 30_000);
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
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
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      this.sessions.clear();
      this.socketMap.clear();
      this.wss.close(() => {
        this.httpServer.close(() => {
          this.db.close();
          resolve();
        });
      });
    });
  }
}
