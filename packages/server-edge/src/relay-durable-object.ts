import { ZKRLN, RLNShare, Field } from '@aetheris/core-crypto';
import { PayloadSanitizer } from './payload-sanitizer.js';

export function createWebSocketUpgradeResponse(clientWs: any): Response {
  try {
    return new Response(null, {
      status: 101,
      // @ts-ignore
      webSocket: clientWs,
    } as any);
  } catch {
    const res = new Response(null, { status: 200 });
    Object.defineProperty(res, 'status', { value: 101, configurable: true });
    (res as any).webSocket = clientWs;
    return res;
  }
}

export interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  put<T = unknown>(key: string, value: T): Promise<void>;
  put<T = unknown>(entries: Record<string, T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  delete(keys: string[]): Promise<number>;
  deleteAll(): Promise<void>;
  list<T = unknown>(options?: { prefix?: string; start?: string; end?: string; limit?: number }): Promise<Map<string, T>>;
  getAlarm(): Promise<number | null>;
  setAlarm(scheduledTime: number | Date): Promise<void>;
  deleteAlarm(): Promise<void>;
}

export interface DurableObjectState {
  id: { toString(): string; name?: string };
  storage: DurableObjectStorage;
  waitUntil(promise: Promise<any>): void;
  acceptWebSocket(ws: WebSocket, tags?: string[]): void;
  getWebSockets(tag?: string): WebSocket[];
  getTags(ws: WebSocket): string[];
  setWebSocketTags?(ws: WebSocket, tags: string[]): void;
}

export interface Env {
  DB?: any;
  RELAY_DO?: any;
  [key: string]: any;
}

import {
  PresenceUser,
  RelayChannel,
  RelayMessage,
  RelayNanopublication,
  DEFAULT_RELAY_CHANNELS,
  INITIAL_RELAY_MESSAGES,
} from './relay/index.js';

export {
  PresenceUser,
  RelayChannel,
  RelayMessage,
  RelayNanopublication,
  DEFAULT_RELAY_CHANNELS,
  INITIAL_RELAY_MESSAGES,
};

export interface SessionMetadata {
  ws: WebSocket;
  fingerprint?: string;
  nullifier?: string;
  role?: string;
  currentChannelId: string;
  subscribedChannels: Set<string>;
  authenticated: boolean;
  connectedAt: number;
  lastPing: number;
  tags: Set<string>;
}

/**
 * Cloudflare Durable Object implementation for Aetheris Sovereign Signaling & Messaging.
 * Fully leverages Cloudflare WebSocket Hibernation API for zero idle costs and scale to 10k+ concurrent peers.
 */
export class RelayDurableObject {
  public ctx: DurableObjectState;
  public state: DurableObjectState; // Alias for CF runtime compatibility
  public env: Env;

  // In-memory active session tracking & presence
  private sessions: Map<WebSocket, SessionMetadata> = new Map();
  private presence: Map<string, PresenceUser> = new Map(); // Key: fingerprint

  // Room state
  private channels: Map<string, RelayChannel> = new Map();
  private channelMessages: Map<string, RelayMessage[]> = new Map();
  private channelNanopublications: Map<string, RelayNanopublication[]> = new Map();

  // ZK-RLN Rate Limiting & Slashed Nullifiers
  private activeShares: Map<string, RLNShare> = new Map(); // Key: `${epoch}:${nullifier}`
  private revokedNullifiers: Set<string> = new Set();

  private initialized: boolean = false;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.state = ctx;
    this.env = env;

    // Seed default channels and initial messages
    for (const ch of DEFAULT_RELAY_CHANNELS) {
      this.channels.set(ch.id, { ...ch });
      this.channelMessages.set(ch.id, [...(INITIAL_RELAY_MESSAGES[ch.id] || [])]);
      this.channelNanopublications.set(ch.id, []);
    }
  }

  /**
   * Initializes persistent state from Durable Object Storage if available.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (this.ctx?.storage) {
      try {
        const storedRevocations = await this.ctx.storage.get<string[]>('revoked_nullifiers');
        if (storedRevocations && Array.isArray(storedRevocations)) {
          for (const n of storedRevocations) {
            this.revokedNullifiers.add(n);
          }
        }

        const storedShares = await this.ctx.storage.get<Record<string, RLNShare>>('active_shares');
        if (storedShares && typeof storedShares === 'object') {
          for (const [k, v] of Object.entries(storedShares)) {
            this.activeShares.set(k, v);
          }
        }

        // Setup periodic alarm for pruning old shares if alarm not scheduled
        const currentAlarm = await this.ctx.storage.getAlarm();
        if (currentAlarm === null) {
          // Schedule alarm 10 minutes from now
          await this.ctx.storage.setAlarm(Date.now() + 10 * 60 * 1000);
        }
      } catch (err) {
        console.warn('[RelayDurableObject] Storage initialization fallback to in-memory:', err);
      }
    }
  }

  /**
   * HTTP & WebSocket entrypoint for the Durable Object.
   */
  async fetch(request: Request): Promise<Response> {
    await this.ensureInitialized();
    const url = new URL(request.url);

    // 1. HTTP REST queries for room state & presence
    if (url.pathname === '/presence' || url.pathname.endsWith('/presence')) {
      const channelId = url.searchParams.get('channelId');
      let users = Array.from(this.presence.values());
      if (channelId && channelId !== 'all') {
        users = users.filter((u) => u.joinedChannel === channelId || u.subscribedChannels.includes(channelId));
      }
      return new Response(JSON.stringify({ success: true, count: users.length, presence: users }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (url.pathname === '/stats' || url.pathname.endsWith('/stats')) {
      const activeSocketCount = this.getActiveSockets().length;
      return new Response(
        JSON.stringify({
          status: 'online',
          durableObjectId: this.ctx.id?.toString() || 'relay-do',
          activeSockets: activeSocketCount,
          presenceCount: this.presence.size,
          channelsCount: this.channels.size,
          revokedNullifiersCount: this.revokedNullifiers.size,
          activeSharesCount: this.activeShares.size,
          timestamp: Date.now(),
        }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (url.pathname === '/channels' || url.pathname.endsWith('/channels')) {
      return new Response(JSON.stringify(Array.from(this.channels.values())), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (url.pathname === '/messages' || url.pathname.endsWith('/messages')) {
      const chId = url.searchParams.get('channelId') || 'relays-general';
      const msgs = this.channelMessages.get(chId) || [];
      return new Response(JSON.stringify({ channelId: chId, messages: msgs }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 2. WebSocket Upgrade Request
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response(
        JSON.stringify({
          status: 'online',
          service: 'Aetheris Sovereign Relay Durable Object',
          transport: 'WebSocket Hibernation API',
          activeConnections: this.getActiveSockets().length,
          usage: 'Connect via WebSocket with standard Aetheris signaling protocol',
        }),
        {
          status: 426,
          headers: { 'Content-Type': 'application/json', Upgrade: 'websocket' },
        }
      );
    }

    // Instantiate Cloudflare Worker WebSocket Pair
    // @ts-ignore
    const pair = (globalThis as any).WebSocketPair ? new (globalThis as any).WebSocketPair() : null;
    if (!pair) {
      return new Response(JSON.stringify({ error: 'WebSocketPair unavailable in environment' }), { status: 500 });
    }

    const clientWs = pair[0] || pair['0'];
    const serverWs = pair[1] || pair['1'];

    // Initial tags for WebSocket Hibernation API
    const initialTags = ['channel:relays-general'];

    // Accept server socket into Hibernation context
    if (this.ctx && typeof this.ctx.acceptWebSocket === 'function') {
      this.ctx.acceptWebSocket(serverWs, initialTags);
    } else if (typeof (serverWs as any).accept === 'function') {
      (serverWs as any).accept();
    }

    const session: SessionMetadata = {
      ws: serverWs,
      currentChannelId: 'relays-general',
      subscribedChannels: new Set(['relays-general']),
      authenticated: false,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      tags: new Set(initialTags),
    };
    this.sessions.set(serverWs, session);

    // In non-hibernating / standard environments, listen to socket events directly
    serverWs.addEventListener?.('message', async (event: any) => {
      await this.webSocketMessage(serverWs, event.data);
    });

    serverWs.addEventListener?.('close', async (event: any) => {
      await this.webSocketClose(serverWs, event.code || 1000, event.reason || '', event.wasClean ?? true);
    });

    serverWs.addEventListener?.('error', async (event: any) => {
      await this.webSocketError(serverWs, event.error || event);
    });

    // Return the client end of the pair to the browser with status 101
    return createWebSocketUpgradeResponse(clientWs);
  }

  /**
   * WebSocket Hibernation API: Handles incoming WebSocket messages.
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.ensureInitialized();
    let session = this.sessions.get(ws);
    if (!session) {
      session = {
        ws,
        currentChannelId: 'relays-general',
        subscribedChannels: new Set(['relays-general']),
        authenticated: false,
        connectedAt: Date.now(),
        lastPing: Date.now(),
        tags: new Set(['channel:relays-general']),
      };
      this.sessions.set(ws, session);
    }

    try {
      const rawText = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const packet = PayloadSanitizer.safeJSONParse(rawText);

      switch (packet.type) {
        case 'AUTH': {
          await this.handleAuth(ws, session, packet);
          break;
        }

        case 'JOIN_CHANNEL': {
          await this.handleJoinChannel(ws, session, packet);
          break;
        }

        case 'LEAVE_CHANNEL': {
          await this.handleLeaveChannel(ws, session, packet);
          break;
        }

        case 'SEND_MESSAGE': {
          await this.handleSendMessage(ws, session, packet);
          break;
        }

        case 'TYPING_INDICATOR': {
          this.handleTypingIndicator(ws, session, packet);
          break;
        }

        case 'PRESENCE_UPDATE': {
          this.handlePresenceUpdate(ws, session, packet);
          break;
        }

        case 'PRESENCE_QUERY': {
          this.handlePresenceQuery(ws, session, packet);
          break;
        }

        case 'PUBLISH_NANOPUBLICATION': {
          await this.handlePublishNanopublication(ws, session, packet);
          break;
        }

        case 'WEBRTC_SIGNAL': {
          this.handleWebRTCSignal(ws, session, packet);
          break;
        }

        case 'EXECUTE_ROLLBACK': {
          this.handleRollback(ws, session, packet);
          break;
        }

        case 'GET_ROOM_STATS': {
          this.send(ws, {
            type: 'ROOM_STATS',
            durableObjectId: this.ctx.id?.toString() || 'relay-do',
            activeSockets: this.getActiveSockets().length,
            presenceCount: this.presence.size,
            channels: Array.from(this.channels.values()),
            timestamp: Date.now(),
          });
          break;
        }

        case 'PING': {
          session.lastPing = Date.now();
          this.send(ws, { type: 'PONG', timestamp: Date.now() });
          break;
        }

        default: {
          this.send(ws, { type: 'ERROR', message: `Unknown packet type: ${packet.type}` });
        }
      }
    } catch (err: any) {
      console.error('[RelayDurableObject Message Error]', err);
      this.send(ws, { type: 'ERROR', message: `Malformed packet: ${err.message}` });
    }
  }

  /**
   * WebSocket Hibernation API: Handles WebSocket disconnection.
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    const session = this.sessions.get(ws);
    if (session) {
      if (session.fingerprint) {
        this.presence.delete(session.fingerprint);
        // Broadcast presence leave event
        this.broadcast({
          type: 'PRESENCE_LEAVE',
          fingerprint: session.fingerprint,
          channelId: session.currentChannelId,
          timestamp: Date.now(),
        });
      }
      this.sessions.delete(ws);
    }
  }

  /**
   * WebSocket Hibernation API: Handles WebSocket errors.
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.warn('[RelayDurableObject Socket Error]', error);
    await this.webSocketClose(ws, 1006, 'Connection error', false);
  }

  /**
   * Cloudflare Durable Object Alarm: Periodically cleans up expired state.
   */
  async alarm(): Promise<void> {
    // 1. Prune presence for inactive sessions (> 15 minutes)
    const now = Date.now();
    for (const [fp, user] of this.presence.entries()) {
      if (now - user.lastSeen > 15 * 60 * 1000) {
        this.presence.delete(fp);
      }
    }

    // 2. Persist revoked nullifiers to DO Storage
    if (this.ctx?.storage) {
      try {
        await this.ctx.storage.put('revoked_nullifiers', Array.from(this.revokedNullifiers));
        // Schedule next alarm
        await this.ctx.storage.setAlarm(Date.now() + 10 * 60 * 1000);
      } catch (err) {
        console.warn('[RelayDurableObject Alarm Error]', err);
      }
    }
  }

  // ─── PACKET HANDLERS ────────────────────────────────────────────────────────

  private async handleAuth(ws: WebSocket, session: SessionMetadata, packet: any): Promise<void> {
    const { fingerprint, publicKeyHex, nullifier, role, status } = packet;

    if (!fingerprint || !PayloadSanitizer.isValidIdentifier(fingerprint)) {
      this.send(ws, { type: 'ERROR', message: 'Invalid fingerprint identifier' });
      return;
    }

    session.fingerprint = fingerprint;
    session.nullifier = nullifier;
    session.role = role || 'MEMBER';
    session.authenticated = true;

    // Check if identity was slashed / revoked
    const isQuarantined = Boolean(nullifier && this.revokedNullifiers.has(nullifier));

    // Update tags on hibernating socket if supported
    const userTag = `user:${fingerprint}`;
    const roleTag = `role:${session.role}`;
    session.tags.add(userTag);
    session.tags.add(roleTag);

    if (this.ctx?.setWebSocketTags && typeof this.ctx.setWebSocketTags === 'function') {
      try {
        this.ctx.setWebSocketTags(ws, Array.from(session.tags));
      } catch (_) {}
    }

    // Register user in Presence map
    const presenceUser: PresenceUser = {
      fingerprint,
      nullifier,
      role: session.role || 'MEMBER',
      status: status || 'online',
      joinedChannel: session.currentChannelId,
      subscribedChannels: Array.from(session.subscribedChannels),
      lastSeen: Date.now(),
      connectedAt: session.connectedAt,
    };
    this.presence.set(fingerprint, presenceUser);

    // 1. Reply to client
    this.send(ws, {
      type: 'AUTH_SUCCESS',
      fingerprint,
      nullifier,
      isQuarantined,
      role: session.role,
      channels: Array.from(this.channels.values()),
    });

    this.send(ws, {
      type: 'CHANNELS_LIST',
      channels: Array.from(this.channels.values()),
    });

    // 2. Broadcast presence update to peers with single JSON serialization
    this.broadcast(
      {
        type: 'PRESENCE_UPDATE',
        presence: presenceUser,
      },
      { excludeWs: ws }
    );
  }

  private async handleJoinChannel(ws: WebSocket, session: SessionMetadata, packet: any): Promise<void> {
    const channelId = packet.channelId || 'relays-general';
    if (!PayloadSanitizer.isValidIdentifier(channelId)) {
      this.send(ws, { type: 'ERROR', message: 'Invalid channel ID' });
      return;
    }

    session.currentChannelId = channelId;
    session.subscribedChannels.add(channelId);

    const channelTag = `channel:${channelId}`;
    session.tags.add(channelTag);
    if (this.ctx?.setWebSocketTags && typeof this.ctx.setWebSocketTags === 'function') {
      try {
        this.ctx.setWebSocketTags(ws, Array.from(session.tags));
      } catch (_) {}
    }

    if (session.fingerprint && this.presence.has(session.fingerprint)) {
      const user = this.presence.get(session.fingerprint)!;
      user.joinedChannel = channelId;
      if (!user.subscribedChannels.includes(channelId)) {
        user.subscribedChannels.push(channelId);
      }
      user.lastSeen = Date.now();
    }

    const messages = this.channelMessages.get(channelId) || [];
    const nanopublications = this.channelNanopublications.get(channelId) || [];

    // Send channel data back to joining user
    this.send(ws, {
      type: 'CHANNEL_DATA',
      channelId,
      messages,
      nanopublications,
      presence: Array.from(this.presence.values()).filter(
        (u) => u.joinedChannel === channelId || u.subscribedChannels.includes(channelId)
      ),
    });

    // Notify channel peers of new peer join
    if (session.fingerprint) {
      this.broadcast(
        {
          type: 'PEER_JOINED',
          channelId,
          fingerprint: session.fingerprint,
          role: session.role,
        },
        { channelId, excludeWs: ws }
      );
    }
  }

  private async handleLeaveChannel(ws: WebSocket, session: SessionMetadata, packet: any): Promise<void> {
    const channelId = packet.channelId;
    if (!channelId) return;

    session.subscribedChannels.delete(channelId);
    session.tags.delete(`channel:${channelId}`);

    if (this.ctx?.setWebSocketTags && typeof this.ctx.setWebSocketTags === 'function') {
      try {
        this.ctx.setWebSocketTags(ws, Array.from(session.tags));
      } catch (_) {}
    }

    if (session.fingerprint) {
      this.broadcast(
        {
          type: 'PEER_LEFT',
          channelId,
          fingerprint: session.fingerprint,
        },
        { channelId, excludeWs: ws }
      );
    }
  }

  private async handleSendMessage(ws: WebSocket, session: SessionMetadata, packet: any): Promise<void> {
    const channelId = packet.channelId || session.currentChannelId || 'relays-general';
    const authorFingerprint = packet.authorFingerprint || packet.fingerprint || session.fingerprint || 'anon-peer';
    const ciphertext = packet.ciphertext || packet.text || '';
    const epoch = String(packet.epoch || '#1');
    const rawNullifier = packet.nullifier || session.nullifier || '';
    const rawX = packet.x ? String(packet.x).replace(/^0x/, '') : '';
    const rawY = packet.y ? String(packet.y).replace(/^0x/, '') : '';

    if (!ciphertext.trim()) {
      this.send(ws, { type: 'ERROR', message: 'Message payload cannot be empty' });
      return;
    }

    // 1. Revocation Check on Nullifier
    if (rawNullifier && this.revokedNullifiers.has(rawNullifier)) {
      this.send(ws, {
        type: 'ERROR',
        message: 'Forbidden: Your identity is revoked on the ZK-RLN Nullifier Tree.',
        isQuarantined: true,
      });
      return;
    }

    // 2. ZK-RLN Double-Sign Slashing & Epoch Collision Detection
    if (rawNullifier && rawX && rawY) {
      const shareKey = `${epoch}:${rawNullifier}`;
      const currentShare: RLNShare = {
        nullifier: rawNullifier,
        epoch,
        x: rawX,
        y: rawY,
      };

      if (this.activeShares.has(shareKey)) {
        const existingShare = this.activeShares.get(shareKey)!;

        // Collision detected: check if message shares are distinct
        if (existingShare.x !== currentShare.x) {
          try {
            const verification = ZKRLN.verifyRateLimitBreach(existingShare, currentShare);

            if (verification.verified) {
              // Revoke offender's nullifier
              this.revokedNullifiers.add(rawNullifier);

              // Persist to storage
              if (this.ctx?.storage) {
                this.ctx.waitUntil(this.ctx.storage.put('revoked_nullifiers', Array.from(this.revokedNullifiers)));
              }

              // Broadcast global QUARANTINE_ALERT to all connected sockets (zero secret key disclosure)
              this.broadcast({
                type: 'QUARANTINE_ALERT',
                nullifier: rawNullifier,
                epoch,
                breachedEpoch: epoch,
                reason: 'RLN Rate Limit Violation: Double message broadcast in single epoch',
                timestamp: Date.now(),
              });

              // Send SLASHING_NOTICE directly to the offending client (zero secret key disclosure)
              this.send(ws, {
                type: 'SLASHING_NOTICE',
                message: 'Your identity nullifier has been revoked due to rate limit violation.',
                nullifier: rawNullifier,
                epoch,
              });

              return; // Drop message!
            }
          } catch (err: any) {
            console.warn('[RelayDurableObject] RLN breach verification warning:', err.message);
          }
        }
      } else {
        this.activeShares.set(shareKey, currentShare);
      }
    }

    // 3. Construct Verified Message Record
    const msgRecord: RelayMessage = {
      id: packet.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channelId,
      authorFingerprint,
      ciphertext,
      text: packet.text || ciphertext,
      iv: packet.iv,
      epoch,
      status: 'verified',
      signature: packet.signature,
      createdAt: packet.createdAt || Date.now(),
    };

    // Store in Channel Message Buffer
    if (!this.channelMessages.has(channelId)) {
      this.channelMessages.set(channelId, []);
    }
    const msgs = this.channelMessages.get(channelId)!;
    msgs.push(msgRecord);
    if (msgs.length > 2000) {
      msgs.splice(0, msgs.length - 1500);
    }

    // Optional D1 SQL DB Sync
    if (this.env?.DB) {
      try {
        this.ctx?.waitUntil?.(
          this.env.DB.prepare(
            `INSERT OR REPLACE INTO messages (
              id, channel_id, author_fingerprint, text, ciphertext, epoch, status, signature, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              msgRecord.id,
              msgRecord.channelId,
              msgRecord.authorFingerprint,
              msgRecord.text || msgRecord.ciphertext,
              msgRecord.ciphertext,
              msgRecord.epoch,
              msgRecord.status,
              msgRecord.signature || null,
              msgRecord.createdAt
            )
            .run()
        );
      } catch (d1Err) {
        console.warn('[RelayDurableObject] D1 sync fallback:', d1Err);
      }
    }

    // 4. High-Efficiency Broadcast to Channel Peers (Single JSON.stringify serialization)
    this.broadcast(
      {
        type: 'NEW_MESSAGE',
        message: msgRecord,
      },
      { channelId, excludeWs: ws }
    );

    // Also acknowledge sender
    this.send(ws, {
      type: 'MESSAGE_ACK',
      messageId: msgRecord.id,
      channelId,
      status: 'verified',
    });
  }

  private handleTypingIndicator(ws: WebSocket, session: SessionMetadata, packet: any): void {
    const channelId = packet.channelId || session.currentChannelId;
    const fingerprint = session.fingerprint || packet.fingerprint;
    const isTyping = Boolean(packet.isTyping);

    if (!fingerprint) return;

    this.broadcast(
      {
        type: 'TYPING_INDICATOR',
        channelId,
        fingerprint,
        isTyping,
      },
      { channelId, excludeWs: ws }
    );
  }

  private handlePresenceUpdate(ws: WebSocket, session: SessionMetadata, packet: any): void {
    if (!session.fingerprint) return;

    const user = this.presence.get(session.fingerprint) || {
      fingerprint: session.fingerprint,
      nullifier: session.nullifier,
      role: session.role || 'MEMBER',
      status: 'online',
      joinedChannel: session.currentChannelId,
      subscribedChannels: Array.from(session.subscribedChannels),
      lastSeen: Date.now(),
      connectedAt: session.connectedAt,
    };

    if (packet.status) user.status = packet.status;
    if (packet.customStatus !== undefined) user.customStatus = packet.customStatus;
    user.lastSeen = Date.now();

    this.presence.set(session.fingerprint, user);

    this.broadcast(
      {
        type: 'PRESENCE_UPDATE',
        presence: user,
      },
      { excludeWs: ws }
    );
  }

  private handlePresenceQuery(ws: WebSocket, session: SessionMetadata, packet: any): void {
    const channelId = packet.channelId || session.currentChannelId;
    let users = Array.from(this.presence.values());
    if (channelId && channelId !== 'all') {
      users = users.filter((u) => u.joinedChannel === channelId || u.subscribedChannels.includes(channelId));
    }

    this.send(ws, {
      type: 'PRESENCE_LIST',
      channelId,
      users,
      count: users.length,
    });
  }

  private async handlePublishNanopublication(ws: WebSocket, session: SessionMetadata, packet: any): Promise<void> {
    const channelId = packet.channelId || 'vault-releases';
    const np: RelayNanopublication = {
      id: packet.id || `nano-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channelId,
      title: PayloadSanitizer.sanitizeString(packet.title || 'Verified Release'),
      fileName: PayloadSanitizer.sanitizeString(packet.fileName || 'file.bin'),
      byteSize: Number(packet.byteSize) || 0,
      sha256: packet.sha256,
      crc32: packet.crc32 || '',
      entropy: Number(packet.entropy) || 0,
      verdict: packet.verdict || 'CLEAN',
      merkleRoot: packet.merkleRoot || '',
      seederCount: 1,
      createdAt: Date.now(),
    };

    if (!this.channelNanopublications.has(channelId)) {
      this.channelNanopublications.set(channelId, []);
    }
    const nps = this.channelNanopublications.get(channelId)!;
    nps.push(np);
    if (nps.length > 1000) {
      nps.splice(0, nps.length - 800);
    }

    // Single-serialization broadcast to channel peers
    this.broadcast(
      {
        type: 'NEW_NANOPUBLICATION',
        nanopublication: np,
      },
      { channelId }
    );
  }

  private handleWebRTCSignal(ws: WebSocket, session: SessionMetadata, packet: any): void {
    const { targetFingerprint, signal, channelId } = packet;
    if (!targetFingerprint) return;

    const fromFingerprint = session.fingerprint || 'anon-peer';
    const payload = JSON.stringify({
      type: 'WEBRTC_SIGNAL',
      fromFingerprint,
      targetFingerprint,
      signal,
      channelId: channelId || session.currentChannelId,
    });

    // Send directly to the target peer's WebSocket
    let sent = false;
    for (const [otherWs, otherSession] of this.sessions.entries()) {
      if (otherSession.fingerprint === targetFingerprint && otherWs.readyState === (globalThis as any).WebSocket?.OPEN) {
        try {
          otherWs.send(payload);
          sent = true;
          break;
        } catch (_) {}
      }
    }

    if (!sent && this.ctx?.getWebSockets) {
      const taggedSockets = this.ctx.getWebSockets(`user:${targetFingerprint}`);
      for (const s of taggedSockets) {
        try {
          s.send(payload);
        } catch (_) {}
      }
    }
  }

  private handleRollback(ws: WebSocket, session: SessionMetadata, packet: any): void {
    const { targetActorFingerprint } = packet;
    this.broadcast({
      type: 'AUDIT_NOTIFICATION',
      action: 'ROLLBACK',
      targetActorFingerprint,
      initiator: session.fingerprint || 'admin',
      timestamp: Date.now(),
    });
  }

  // ─── HIGH-EFFICIENCY BROADCAST & SOCKET HELPERS ─────────────────────────────

  /**
   * Retrieves all currently active and hibernated WebSockets for this Durable Object.
   */
  public getActiveSockets(): WebSocket[] {
    if (this.ctx && typeof this.ctx.getWebSockets === 'function') {
      const hibernatedSockets = this.ctx.getWebSockets();
      if (hibernatedSockets && hibernatedSockets.length > 0) {
        return hibernatedSockets;
      }
    }
    return Array.from(this.sessions.keys());
  }

  /**
   * Retrieves sockets subscribed to a specific channel.
   */
  public getSocketsForChannel(channelId: string): WebSocket[] {
    if (this.ctx && typeof this.ctx.getWebSockets === 'function') {
      const tagged = this.ctx.getWebSockets(`channel:${channelId}`);
      if (tagged && tagged.length > 0) return tagged;
    }

    const result: WebSocket[] = [];
    for (const [ws, session] of this.sessions.entries()) {
      if (session.currentChannelId === channelId || session.subscribedChannels.has(channelId)) {
        result.push(ws);
      }
    }
    return result;
  }

  /**
   * Sends a message to a single WebSocket.
   */
  public send(ws: WebSocket, data: any): void {
    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      if (ws.readyState === (globalThis as any).WebSocket?.OPEN || ws.readyState === 1 || ws.readyState === undefined) {
        ws.send(payload);
      }
    } catch (err) {
      console.warn('[RelayDurableObject] send failed:', err);
    }
  }

  /**
   * High-Efficiency Broadcast: Serializes the payload EXACTLY ONCE with JSON.stringify(),
   * then distributes the pre-serialized string to all targeted sockets.
   */
  public broadcast(packet: any, options?: { channelId?: string; excludeWs?: WebSocket }): void {
    const serializedPayload = typeof packet === 'string' ? packet : JSON.stringify(packet);
    const targetSockets = options?.channelId ? this.getSocketsForChannel(options.channelId) : this.getActiveSockets();

    for (const ws of targetSockets) {
      if (ws !== options?.excludeWs) {
        try {
          if (ws.readyState === (globalThis as any).WebSocket?.OPEN || ws.readyState === 1 || ws.readyState === undefined) {
            ws.send(serializedPayload);
          }
        } catch (err) {
          // Socket closed or failed, remove from session map
          this.sessions.delete(ws);
        }
      }
    }
  }

  // Getters for testing & inspection
  public getPresence(): Map<string, PresenceUser> {
    return this.presence;
  }

  public getRevokedNullifiers(): Set<string> {
    return this.revokedNullifiers;
  }

  public getActiveShares(): Map<string, RLNShare> {
    return this.activeShares;
  }

  public getChannelMessages(channelId: string): RelayMessage[] {
    return this.channelMessages.get(channelId) || [];
  }
}
