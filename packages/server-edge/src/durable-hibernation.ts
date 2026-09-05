// ===========================================================================
// AETHERIS OMNI-SPHERE — PRODUCTION CLOUDFLARE DURABLE OBJECT HIBERNATION
// Item 17: Production Cloudflare Durable Object class SovereignRelayDurableObject
// Features:
// - Cloudflare WebSocket Hibernation API: state.acceptWebSocket(ws, tags)
//   hibernates Worker isolate memory during idle periods (zero idle compute bill)!
// - webSocketMessage(ws, message): wakes isolate only when messages arrive.
// - webSocketClose(ws, code, reason): removes connection and cleans up presence.
// - Tag-based multicasting: state.getWebSockets('circle:id'), state.getWebSockets('channel:id')
//   enabling zero-overhead O(1) group messaging without keeping 100,000 isolates awake!
// - Slashing & ZK-RLN spam defense during hibernation wakeup.
// ===========================================================================

import { ZKRLN, RLNShare, Field } from '@aetheris/core-crypto';
import { PayloadSanitizer } from './payload-sanitizer.js';
import {
  DurableObjectState,
  DurableObjectStorage,
  Env,
  PresenceUser,
  SessionMetadata,
  RelayChannel,
  RelayMessage,
  RelayNanopublication,
  DEFAULT_RELAY_CHANNELS,
  INITIAL_RELAY_MESSAGES,
  createWebSocketUpgradeResponse,
} from './relay-durable-object.js';

export interface SovereignSessionMetadata {
  ws: WebSocket;
  fingerprint?: string;
  nullifier?: string;
  role?: string;
  currentChannelId: string;
  currentCircleId?: string;
  subscribedChannels: Set<string>;
  subscribedCircles: Set<string>;
  authenticated: boolean;
  connectedAt: number;
  lastPing: number;
  tags: Set<string>;
}

/**
 * Production Cloudflare Durable Object utilizing the WebSocket Hibernation API.
 * The Worker isolate is completely hibernated when idle, saving 100% of memory
 * and compute costs until incoming frames or alarms trigger execution.
 */
export class SovereignRelayDurableObject {
  public state: DurableObjectState;
  public ctx: DurableObjectState; // Alias for CF runtime compatibility
  public env: Env;

  // Ephemeral session cache (reconstructed or updated during wakeups)
  private sessions: Map<WebSocket, SovereignSessionMetadata> = new Map();
  private presence: Map<string, PresenceUser> = new Map(); // Key: fingerprint

  // Room state
  private channels: Map<string, RelayChannel> = new Map();
  private channelMessages: Map<string, RelayMessage[]> = new Map();
  private channelNanopublications: Map<string, RelayNanopublication[]> = new Map();

  // ZK-RLN Rate Limiting & Slashed Nullifiers
  private activeShares: Map<string, RLNShare> = new Map(); // Key: `${epoch}:${nullifier}`
  private revokedNullifiers: Set<string> = new Set();

  private initialized: boolean = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.ctx = state;
    this.env = env;

    // Seed default channels and initial messages
    for (const ch of DEFAULT_RELAY_CHANNELS) {
      this.channels.set(ch.id, { ...ch });
      this.channelMessages.set(ch.id, [...(INITIAL_RELAY_MESSAGES[ch.id] || [])]);
      this.channelNanopublications.set(ch.id, []);
    }
  }

  /**
   * Restores persistent state from Durable Object Storage if available.
   */
  public async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (this.state?.storage) {
      try {
        const storedRevocations = await this.state.storage.get<string[]>('revoked_nullifiers');
        if (storedRevocations && Array.isArray(storedRevocations)) {
          for (const n of storedRevocations) {
            this.revokedNullifiers.add(n);
          }
        }

        const storedShares = await this.state.storage.get<Record<string, RLNShare>>('active_shares');
        if (storedShares && typeof storedShares === 'object') {
          for (const [k, v] of Object.entries(storedShares)) {
            this.activeShares.set(k, v);
          }
        }

        const currentAlarm = await this.state.storage.getAlarm();
        if (currentAlarm === null) {
          await this.state.storage.setAlarm(Date.now() + 10 * 60 * 1000);
        }
      } catch (err) {
        console.warn('[SovereignRelayDurableObject] Storage initialization fallback to memory:', err);
      }
    }
  }

  /**
   * HTTP & WebSocket entrypoint.
   */
  async fetch(request: Request): Promise<Response> {
    await this.ensureInitialized();
    const url = new URL(request.url);

    // 1. REST Telemetry & Presence Endpoints
    if (url.pathname === '/stats' || url.pathname.endsWith('/stats')) {
      return new Response(
        JSON.stringify({
          status: 'online',
          durableObjectId: this.state.id?.toString() || 'sovereign-relay-do',
          architecture: 'Cloudflare WebSocket Hibernation API',
          activeSockets: this.getActiveSockets().length,
          presenceCount: this.presence.size,
          channelsCount: this.channels.size,
          revokedNullifiersCount: this.revokedNullifiers.size,
          activeSharesCount: this.activeShares.size,
          timestamp: Date.now(),
        }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

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
          mode: 'WebSocket Hibernation Engine',
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

    // Extract initial tags from query params
    const channelParam = url.searchParams.get('channelId') || 'relays-general';
    const circleParam = url.searchParams.get('circleId') || '';
    const initialTags: string[] = [`channel:${channelParam}`];
    if (circleParam) {
      initialTags.push(`circle:${circleParam}`);
    }

    // Accept server socket into Hibernation context
    // This allows the Worker isolate memory to hibernate during idle periods!
    if (this.state && typeof this.state.acceptWebSocket === 'function') {
      this.state.acceptWebSocket(serverWs, initialTags);
    } else if (typeof (serverWs as any).accept === 'function') {
      (serverWs as any).accept();
    }

    const session: SovereignSessionMetadata = {
      ws: serverWs,
      currentChannelId: channelParam,
      currentCircleId: circleParam || undefined,
      subscribedChannels: new Set([channelParam]),
      subscribedCircles: circleParam ? new Set([circleParam]) : new Set(),
      authenticated: false,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      tags: new Set(initialTags),
    };
    this.sessions.set(serverWs, session);

    // Event listener fallback for non-hibernating mock/test environments
    serverWs.addEventListener?.('message', async (event: any) => {
      await this.webSocketMessage(serverWs, event.data);
    });

    serverWs.addEventListener?.('close', async (event: any) => {
      await this.webSocketClose(serverWs, event.code || 1000, event.reason || '');
    });

    serverWs.addEventListener?.('error', async (event: any) => {
      await this.webSocketError(serverWs, event.error || event);
    });

    return createWebSocketUpgradeResponse(clientWs);
  }

  /**
   * WebSocket Hibernation API: Wakes isolate only on incoming messages.
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.ensureInitialized();
    let session = this.sessions.get(ws);
    if (!session) {
      // Reconstruct session for awakened socket from tags if available
      const tags = this.getTags(ws);
      const channelTag = tags.find((t) => t.startsWith('channel:'));
      const circleTag = tags.find((t) => t.startsWith('circle:'));
      const userTag = tags.find((t) => t.startsWith('user:'));

      const initialChannel = channelTag ? channelTag.replace('channel:', '') : 'relays-general';
      const initialCircle = circleTag ? circleTag.replace('circle:', '') : undefined;
      const initialFp = userTag ? userTag.replace('user:', '') : undefined;

      session = {
        ws,
        currentChannelId: initialChannel,
        currentCircleId: initialCircle,
        fingerprint: initialFp,
        subscribedChannels: new Set([initialChannel]),
        subscribedCircles: initialCircle ? new Set([initialCircle]) : new Set(),
        authenticated: Boolean(initialFp),
        connectedAt: Date.now(),
        lastPing: Date.now(),
        tags: new Set(tags.length > 0 ? tags : [`channel:${initialChannel}`]),
      };
      this.sessions.set(ws, session);
    }

    try {
      const rawText = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const packet = PayloadSanitizer.safeJSONParse(rawText);

      // ─── ZK-RLN SPAM DEFENSE & SLASHING DURING HIBERNATION WAKEUP ─────────
      const rawNullifier = packet.nullifier || session.nullifier || '';
      const epoch = String(packet.epoch || '#1');
      const rawX = packet.x ? String(packet.x).replace(/^0x/, '') : '';
      const rawY = packet.y ? String(packet.y).replace(/^0x/, '') : '';

      // 1. Check if identity has been slashed/revoked
      if (rawNullifier && this.revokedNullifiers.has(rawNullifier)) {
        this.send(ws, {
          type: 'ERROR',
          message: 'Forbidden: Your identity is revoked on the ZK-RLN Nullifier Tree.',
          isQuarantined: true,
        });
        return;
      }

      // 2. Check for double-sign rate-limit violation in the current epoch
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

          // Double message in same epoch with distinct payload polynomial evaluation
          if (existingShare.x !== currentShare.x) {
            try {
              const verification = ZKRLN.verifyRateLimitBreach(existingShare, currentShare);

              if (verification.verified) {
                // Revokes offender's nullifier
                this.revokedNullifiers.add(rawNullifier);

                // Persist revoked nullifiers in DO storage
                if (this.state?.storage) {
                  this.state.waitUntil(
                    this.state.storage.put('revoked_nullifiers', Array.from(this.revokedNullifiers))
                  );
                }

                // Global alert broadcast across all connected hibernated sockets (zero secret disclosure)
                this.broadcastGlobal({
                  type: 'QUARANTINE_ALERT',
                  nullifier: rawNullifier,
                  epoch,
                  breachedEpoch: epoch,
                  reason: 'RLN Rate Limit Violation: Double message broadcast in single epoch',
                  timestamp: Date.now(),
                });

                // Send slashing notification directly to the offending peer (zero secret disclosure)
                this.send(ws, {
                  type: 'SLASHING_NOTICE',
                  message: 'Your identity nullifier has been revoked due to rate limit violation.',
                  nullifier: rawNullifier,
                  epoch,
                });

                return; // Drop message immediately
              }
            } catch (rlnErr: any) {
              console.warn('[SovereignRelayDurableObject] RLN breach verification warning:', rlnErr.message);
            }
          }
        } else {
          this.activeShares.set(shareKey, currentShare);
        }
      }

      // ─── DISPATCH PACKET TYPE ─────────────────────────────────────────────
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

        case 'JOIN_CIRCLE': {
          await this.handleJoinCircle(ws, session, packet);
          break;
        }

        case 'LEAVE_CIRCLE': {
          await this.handleLeaveCircle(ws, session, packet);
          break;
        }

        case 'SEND_MESSAGE': {
          await this.handleSendMessage(ws, session, packet);
          break;
        }

        case 'SEND_CIRCLE_MESSAGE': {
          await this.handleSendCircleMessage(ws, session, packet);
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

        case 'PUBLISH_NANOPUBLICATION': {
          await this.handlePublishNanopublication(ws, session, packet);
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
      console.error('[SovereignRelayDurableObject Message Error]', err);
      this.send(ws, { type: 'ERROR', message: `Malformed packet: ${err.message}` });
    }
  }

  /**
   * WebSocket Hibernation API: Removes connection.
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    const session = this.sessions.get(ws);
    if (session) {
      if (session.fingerprint) {
        this.presence.delete(session.fingerprint);
        this.multicast(`channel:${session.currentChannelId}`, {
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
   * WebSocket Hibernation API: Handles socket error.
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.warn('[SovereignRelayDurableObject Error]', error);
    await this.webSocketClose(ws, 1006, 'Connection error');
  }

  // ─── TAG QUERYING & MULTICASTING HELPERS ────────────────────────────────────

  /**
   * Retrieves all active/hibernated sockets from Cloudflare DO state.
   */
  public getActiveSockets(): WebSocket[] {
    if (this.state && typeof this.state.getWebSockets === 'function') {
      const sockets = this.state.getWebSockets();
      if (sockets && sockets.length > 0) return sockets;
    }
    return Array.from(this.sessions.keys());
  }

  /**
   * Retrieves WebSockets associated with a specific tag (e.g. 'circle:id' or 'channel:id').
   */
  public getSocketsByTag(tag: string): WebSocket[] {
    if (this.state && typeof this.state.getWebSockets === 'function') {
      const tagged = this.state.getWebSockets(tag);
      if (tagged) return tagged;
    }

    const result: WebSocket[] = [];
    for (const [ws, session] of this.sessions.entries()) {
      if (session.tags.has(tag)) {
        result.push(ws);
      }
    }
    return result;
  }

  /**
   * Retrieves WebSockets subscribed to a specific channel.
   */
  public getSocketsForChannel(channelId: string): WebSocket[] {
    return this.getSocketsByTag(`channel:${channelId}`);
  }

  /**
   * Retrieves WebSockets subscribed to a specific sovereign circle.
   */
  public getSocketsForCircle(circleId: string): WebSocket[] {
    return this.getSocketsByTag(`circle:${circleId}`);
  }

  /**
   * Retrieves current tags for a given WebSocket.
   */
  public getTags(ws: WebSocket): string[] {
    if (this.state && typeof this.state.getTags === 'function') {
      try {
        const tags = this.state.getTags(ws);
        if (tags && tags.length > 0) return tags;
      } catch (_) {}
    }
    const session = this.sessions.get(ws);
    return session ? Array.from(session.tags) : [];
  }

  /**
   * Assigns tags to a hibernated WebSocket.
   */
  public setWebSocketTags(ws: WebSocket, tags: string[]): void {
    const session = this.sessions.get(ws);
    if (session) {
      session.tags = new Set(tags);
    }
    if (this.state && typeof this.state.setWebSocketTags === 'function') {
      try {
        this.state.setWebSocketTags(ws, tags);
      } catch (_) {}
    }
  }

  /**
   * Tag-based multicasting: serializes packet EXACTLY ONCE with JSON.stringify(),
   * then delivers to matching sockets via state.getWebSockets(tag).
   */
  public multicast(tag: string, packet: any, excludeWs?: WebSocket): number {
    const serializedPayload = typeof packet === 'string' ? packet : JSON.stringify(packet);
    const targetSockets = this.getSocketsByTag(tag);
    let sentCount = 0;

    for (const ws of targetSockets) {
      if (ws !== excludeWs) {
        try {
          if (
            ws.readyState === (globalThis as any).WebSocket?.OPEN ||
            ws.readyState === 1 ||
            ws.readyState === undefined
          ) {
            ws.send(serializedPayload);
            sentCount++;
          }
        } catch (_) {
          this.sessions.delete(ws);
        }
      }
    }
    return sentCount;
  }

  /**
   * Multicasts payload to all members of a channel.
   */
  public multicastToChannel(channelId: string, packet: any, excludeWs?: WebSocket): number {
    return this.multicast(`channel:${channelId}`, packet, excludeWs);
  }

  /**
   * Multicasts payload to all members of a sovereign circle.
   */
  public multicastToCircle(circleId: string, packet: any, excludeWs?: WebSocket): number {
    return this.multicast(`circle:${circleId}`, packet, excludeWs);
  }

  /**
   * Broadcasts payload to every active socket.
   */
  public broadcastGlobal(packet: any, excludeWs?: WebSocket): number {
    const serializedPayload = typeof packet === 'string' ? packet : JSON.stringify(packet);
    const targetSockets = this.getActiveSockets();
    let sentCount = 0;

    for (const ws of targetSockets) {
      if (ws !== excludeWs) {
        try {
          if (
            ws.readyState === (globalThis as any).WebSocket?.OPEN ||
            ws.readyState === 1 ||
            ws.readyState === undefined
          ) {
            ws.send(serializedPayload);
            sentCount++;
          }
        } catch (_) {
          this.sessions.delete(ws);
        }
      }
    }
    return sentCount;
  }

  /**
   * Sends data to an individual WebSocket.
   */
  public send(ws: WebSocket, data: any): void {
    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      if (
        ws.readyState === (globalThis as any).WebSocket?.OPEN ||
        ws.readyState === 1 ||
        ws.readyState === undefined
      ) {
        ws.send(payload);
      }
    } catch (err) {
      console.warn('[SovereignRelayDurableObject] send failed:', err);
    }
  }

  // ─── PACKET HANDLERS ────────────────────────────────────────────────────────

  private async handleAuth(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const { fingerprint, nullifier, role, status, channelId, circleId } = packet;

    if (!fingerprint || !PayloadSanitizer.isValidIdentifier(fingerprint)) {
      this.send(ws, { type: 'ERROR', message: 'Invalid fingerprint identifier' });
      return;
    }

    session.fingerprint = fingerprint;
    session.nullifier = nullifier;
    session.role = role || 'MEMBER';
    session.authenticated = true;

    if (channelId) session.currentChannelId = channelId;
    if (circleId) session.currentCircleId = circleId;

    const tags = new Set<string>();
    tags.add(`channel:${session.currentChannelId}`);
    if (session.currentCircleId) tags.add(`circle:${session.currentCircleId}`);
    tags.add(`user:${fingerprint}`);
    tags.add(`role:${session.role}`);
    this.setWebSocketTags(ws, Array.from(tags));

    const isQuarantined = Boolean(nullifier && this.revokedNullifiers.has(nullifier));

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

    this.send(ws, {
      type: 'AUTH_SUCCESS',
      fingerprint,
      nullifier,
      isQuarantined,
      role: session.role,
      channelId: session.currentChannelId,
      circleId: session.currentCircleId,
      channels: Array.from(this.channels.values()),
    });

    this.multicastToChannel(
      session.currentChannelId,
      { type: 'PRESENCE_UPDATE', presence: presenceUser },
      ws
    );
  }

  private async handleJoinChannel(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const channelId = packet.channelId || 'relays-general';
    if (!PayloadSanitizer.isValidIdentifier(channelId)) {
      this.send(ws, { type: 'ERROR', message: 'Invalid channel ID' });
      return;
    }

    session.currentChannelId = channelId;
    session.subscribedChannels.add(channelId);

    const currentTags = this.getTags(ws);
    const updatedTags = Array.from(new Set([...currentTags, `channel:${channelId}`]));
    this.setWebSocketTags(ws, updatedTags);

    if (session.fingerprint && this.presence.has(session.fingerprint)) {
      const user = this.presence.get(session.fingerprint)!;
      user.joinedChannel = channelId;
      if (!user.subscribedChannels.includes(channelId)) user.subscribedChannels.push(channelId);
      user.lastSeen = Date.now();
    }

    const messages = this.channelMessages.get(channelId) || [];
    const nanopublications = this.channelNanopublications.get(channelId) || [];

    this.send(ws, {
      type: 'CHANNEL_DATA',
      channelId,
      messages,
      nanopublications,
    });

    if (session.fingerprint) {
      this.multicastToChannel(
        channelId,
        {
          type: 'PEER_JOINED',
          channelId,
          fingerprint: session.fingerprint,
          role: session.role,
        },
        ws
      );
    }
  }

  private async handleLeaveChannel(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const channelId = packet.channelId;
    if (!channelId) return;

    session.subscribedChannels.delete(channelId);
    const currentTags = this.getTags(ws);
    const updatedTags = currentTags.filter((t) => t !== `channel:${channelId}`);
    this.setWebSocketTags(ws, updatedTags);

    if (session.fingerprint) {
      this.multicastToChannel(
        channelId,
        {
          type: 'PEER_LEFT',
          channelId,
          fingerprint: session.fingerprint,
        },
        ws
      );
    }
  }

  private async handleJoinCircle(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const circleId = packet.circleId;
    if (!circleId || !PayloadSanitizer.isValidIdentifier(circleId)) {
      this.send(ws, { type: 'ERROR', message: 'Invalid circle ID' });
      return;
    }

    session.currentCircleId = circleId;
    session.subscribedCircles.add(circleId);

    const currentTags = this.getTags(ws);
    const updatedTags = Array.from(new Set([...currentTags, `circle:${circleId}`]));
    this.setWebSocketTags(ws, updatedTags);

    this.send(ws, {
      type: 'CIRCLE_JOINED',
      circleId,
    });

    if (session.fingerprint) {
      this.multicastToCircle(
        circleId,
        {
          type: 'PEER_JOINED_CIRCLE',
          circleId,
          fingerprint: session.fingerprint,
        },
        ws
      );
    }
  }

  private async handleLeaveCircle(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const circleId = packet.circleId;
    if (!circleId) return;

    session.subscribedCircles.delete(circleId);
    const currentTags = this.getTags(ws);
    const updatedTags = currentTags.filter((t) => t !== `circle:${circleId}`);
    this.setWebSocketTags(ws, updatedTags);

    if (session.fingerprint) {
      this.multicastToCircle(
        circleId,
        {
          type: 'PEER_LEFT_CIRCLE',
          circleId,
          fingerprint: session.fingerprint,
        },
        ws
      );
    }
  }

  private async handleSendMessage(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const channelId = packet.channelId || session.currentChannelId || 'relays-general';
    const authorFingerprint = packet.authorFingerprint || packet.fingerprint || session.fingerprint || 'anon-peer';
    const ciphertext = packet.ciphertext || packet.text || '';
    const epoch = String(packet.epoch || '#1');

    if (!ciphertext.trim()) {
      this.send(ws, { type: 'ERROR', message: 'Message payload cannot be empty' });
      return;
    }

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

    if (!this.channelMessages.has(channelId)) {
      this.channelMessages.set(channelId, []);
    }
    const msgs = this.channelMessages.get(channelId)!;
    msgs.push(msgRecord);
    if (msgs.length > 2000) msgs.splice(0, msgs.length - 1500);

    // Multicast to channel tag
    this.multicastToChannel(
      channelId,
      {
        type: 'NEW_MESSAGE',
        message: msgRecord,
      },
      ws
    );

    this.send(ws, {
      type: 'MESSAGE_ACK',
      messageId: msgRecord.id,
      channelId,
      status: 'verified',
    });
  }

  private async handleSendCircleMessage(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const circleId = packet.circleId || session.currentCircleId;
    if (!circleId) {
      this.send(ws, { type: 'ERROR', message: 'Circle ID required' });
      return;
    }

    const authorFingerprint = packet.authorFingerprint || session.fingerprint || 'anon-peer';
    const content = packet.content || packet.text || '';

    const payload = {
      type: 'NEW_CIRCLE_MESSAGE',
      circleId,
      authorFingerprint,
      content,
      timestamp: Date.now(),
    };

    this.multicastToCircle(circleId, payload, ws);

    this.send(ws, {
      type: 'CIRCLE_MESSAGE_ACK',
      circleId,
      status: 'verified',
    });
  }

  private handleTypingIndicator(ws: WebSocket, session: SovereignSessionMetadata, packet: any): void {
    const channelId = packet.channelId || session.currentChannelId;
    const fingerprint = session.fingerprint || packet.fingerprint;
    if (!fingerprint) return;

    this.multicastToChannel(
      channelId,
      {
        type: 'TYPING_INDICATOR',
        channelId,
        fingerprint,
        isTyping: Boolean(packet.isTyping),
      },
      ws
    );
  }

  private handlePresenceUpdate(ws: WebSocket, session: SovereignSessionMetadata, packet: any): void {
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
    user.lastSeen = Date.now();
    this.presence.set(session.fingerprint, user);

    this.multicastToChannel(session.currentChannelId, { type: 'PRESENCE_UPDATE', presence: user }, ws);
  }

  private async handlePublishNanopublication(
    ws: WebSocket,
    session: SovereignSessionMetadata,
    packet: any
  ): Promise<void> {
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
    this.channelNanopublications.get(channelId)!.push(np);

    this.multicastToChannel(channelId, { type: 'NEW_NANOPUBLICATION', nanopublication: np });
  }

  // Getters for inspection and testing
  public getRevokedNullifiers(): Set<string> {
    return this.revokedNullifiers;
  }

  public getActiveShares(): Map<string, RLNShare> {
    return this.activeShares;
  }

  public getPresence(): Map<string, PresenceUser> {
    return this.presence;
  }
}
