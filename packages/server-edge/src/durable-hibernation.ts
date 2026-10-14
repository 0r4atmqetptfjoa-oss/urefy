/**
 * @file durable-hibernation.ts
 * @package @aetheris/server-edge
 * @description 2027 Sovereign WebSocket Hibernation Durable Object Relay.
 * Sub-millisecond edge fanout with ZK-RLN rate-limit slashing and WebRTC signaling protection.
 */

import { ZKRLN, RLNShare } from '@aetheris/core-crypto';
import { PayloadSanitizer } from './payload-sanitizer.js';
import { resolveRelaySecret } from './relay-secret.js';
import {
  DurableObjectState,
  Env,
  PresenceUser,
  RelayChannel,
  RelayMessage,
  RelayNanopublication,
  DEFAULT_RELAY_CHANNELS,
  INITIAL_RELAY_MESSAGES,
  createWebSocketUpgradeResponse,
  verifyRelaySessionToken,
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
  webrtcSignalCount?: number;
  webrtcSignalWindow?: number;
}

export class SovereignRelayDurableObject {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<WebSocket, SovereignSessionMetadata> = new Map();
  private presence: Map<string, PresenceUser> = new Map();
  private activeShares: Map<string, RLNShare> = new Map();
  private shareTimestamps: Map<string, number> = new Map();
  private revokedNullifiers: Set<string> = new Set();
  private channels: RelayChannel[] = [...DEFAULT_RELAY_CHANNELS];
  private channelMessages: Map<string, RelayMessage[]> = new Map();
  private nanopublications: RelayNanopublication[] = [];
  private initialized: boolean = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.channelMessages.set('relays-general', [...(INITIAL_RELAY_MESSAGES['relays-general'] || [])]);
  }

  public async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    try {
      const storedRevoked = await this.state.storage.get<string[]>('revoked_nullifiers');
      if (Array.isArray(storedRevoked)) {
        storedRevoked.forEach((n) => this.revokedNullifiers.add(n));
      }
    } catch {
      // ignore storage init error in mock env
    }
    this.initialized = true;
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureInitialized();
    const url = new URL(request.url);

    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'online',
          engine: 'SovereignRelayDurableObject-2027',
          activeSockets: this.getActiveSockets().length,
          revokedCount: this.revokedNullifiers.size,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const PairCtor = (globalThis as any).WebSocketPair;
      if (typeof PairCtor === 'function') {
        const pair = new PairCtor();
        const clientWs = pair[0];
        const serverWs = pair[1];
        const defaultTags = ['global', 'channel:relays-general'];
        this.state.acceptWebSocket(serverWs, defaultTags);
        this.sessions.set(serverWs, {
          ws: serverWs,
          currentChannelId: 'relays-general',
          subscribedChannels: new Set(['relays-general']),
          subscribedCircles: new Set(),
          authenticated: false,
          connectedAt: Date.now(),
          lastPing: Date.now(),
          tags: new Set(defaultTags),
        });
        return createWebSocketUpgradeResponse(clientWs);
      }
    }

    return new Response('Expected WebSocket Upgrade', { status: 426 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.ensureInitialized();
    const rawStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
    if (rawStr.length > 65536) {
      this.send(ws, { type: 'ERROR', error: 'Packet exceeds 64KB frame limit' });
      return;
    }

    let packet: any;
    try {
      packet = PayloadSanitizer.safeJSONParse(rawStr);
    } catch {
      this.send(ws, { type: 'ERROR', error: 'Malformed JSON packet' });
      return;
    }

    let session = this.sessions.get(ws);
    if (!session) {
      session = {
        ws,
        currentChannelId: 'relays-general',
        subscribedChannels: new Set(['relays-general']),
        subscribedCircles: new Set(),
        authenticated: false,
        connectedAt: Date.now(),
        lastPing: Date.now(),
        tags: new Set(this.getTags(ws)),
      };
      this.sessions.set(ws, session);
    }
    session.lastPing = Date.now();

    if (session.nullifier && this.revokedNullifiers.has(session.nullifier)) {
      this.send(ws, {
        type: 'QUARANTINE_ALERT',
        nullifier: session.nullifier,
        reason: 'Identity revoked due to ZK-RLN rate-limit violation',
      });
      return;
    }

    switch (packet.type) {
      case 'PING':
        this.send(ws, { type: 'PONG', timestamp: Date.now() });
        break;
      case 'AUTH':
        await this.handleAuth(ws, session, packet);
        break;
      case 'JOIN':
      case 'JOIN_CHANNEL':
        await this.handleJoinChannel(ws, session, packet);
        break;
      case 'LEAVE':
      case 'LEAVE_CHANNEL':
        await this.handleLeaveChannel(ws, session, packet);
        break;
      case 'JOIN_CIRCLE':
        await this.handleJoinCircle(ws, session, packet);
        break;
      case 'LEAVE_CIRCLE':
        await this.handleLeaveCircle(ws, session, packet);
        break;
      case 'SEND_MESSAGE':
        await this.handleSendMessage(ws, session, packet);
        break;
      case 'SEND_CIRCLE_MESSAGE':
        await this.handleSendCircleMessage(ws, session, packet);
        break;
      case 'TYPING':
        this.handleTypingIndicator(ws, session, packet);
        break;
      case 'PRESENCE':
      case 'PRESENCE_UPDATE':
        this.handlePresenceUpdate(ws, session, packet);
        break;
      case 'PUBLISH':
      case 'PUBLISH_NANOPUBLICATION':
        await this.handlePublishNanopublication(ws, session, packet);
        break;
      case 'WEBRTC_SIGNAL':
        this.handleWebRTCSignal(ws, session, packet);
        break;
      default:
        this.send(ws, { type: 'ERROR', error: `Unsupported packet type: ${String(packet.type)}` });
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean?: boolean): Promise<void> {
    const session = this.sessions.get(ws);
    if (session?.fingerprint) {
      this.presence.delete(session.fingerprint);
      this.broadcastGlobal(
        {
          type: 'PEER_LEFT',
          fingerprint: session.fingerprint,
          timestamp: Date.now(),
        },
        ws
      );
    }
    this.sessions.delete(ws);
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    this.sessions.delete(ws);
  }

  public getActiveSockets(): WebSocket[] {
    const fromState = typeof this.state.getWebSockets === 'function' ? this.state.getWebSockets() : [];
    const combined = new Set<WebSocket>([...fromState, ...this.sessions.keys()]);
    return Array.from(combined);
  }

  public getSocketsByTag(tag: string): WebSocket[] {
    if (typeof this.state.getWebSockets === 'function') {
      const tagged = this.state.getWebSockets(tag);
      if (tagged && tagged.length > 0) return tagged;
    }
    const results: WebSocket[] = [];
    for (const [ws, sess] of this.sessions.entries()) {
      if (sess.tags.has(tag)) results.push(ws);
    }
    return results;
  }

  public getSocketsForChannel(channelId: string): WebSocket[] {
    return this.getSocketsByTag(`channel:${channelId}`);
  }

  public getSocketsForCircle(circleId: string): WebSocket[] {
    return this.getSocketsByTag(`circle:${circleId}`);
  }

  public getTags(ws: WebSocket): string[] {
    if (typeof this.state.getTags === 'function') {
      const stateTags = this.state.getTags(ws);
      if (stateTags && stateTags.length > 0) return stateTags;
    }
    const sess = this.sessions.get(ws);
    return sess ? Array.from(sess.tags) : ['global'];
  }

  public setWebSocketTags(ws: WebSocket, tags: string[]): void {
    const sess = this.sessions.get(ws);
    if (sess) {
      sess.tags = new Set(tags);
    }
    if (typeof this.state.setWebSocketTags === 'function') {
      this.state.setWebSocketTags(ws, tags);
    }
  }

  public multicast(tag: string, packet: any, excludeWs?: WebSocket): number {
    const targets = this.getSocketsByTag(tag);
    let sent = 0;
    for (const sock of targets) {
      if (sock !== excludeWs) {
        this.send(sock, packet);
        sent++;
      }
    }
    return sent;
  }

  public multicastToChannel(channelId: string, packet: any, excludeWs?: WebSocket): number {
    return this.multicast(`channel:${channelId}`, packet, excludeWs);
  }

  public multicastToCircle(circleId: string, packet: any, excludeWs?: WebSocket): number {
    return this.multicast(`circle:${circleId}`, packet, excludeWs);
  }

  public broadcastGlobal(packet: any, excludeWs?: WebSocket): number {
    const all = this.getActiveSockets();
    let count = 0;
    for (const sock of all) {
      if (sock !== excludeWs) {
        this.send(sock, packet);
        count++;
      }
    }
    return count;
  }

  public send(ws: WebSocket, data: any): void {
    try {
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    } catch {
      // socket closed
    }
  }

  private async handleAuth(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const fp = PayloadSanitizer.sanitizeString(String(packet.fingerprint || 'anonymous'));
    const nullifier = packet.nullifier ? String(packet.nullifier) : `null_${fp}`;

    if (this.revokedNullifiers.has(nullifier)) {
      this.send(ws, {
        type: 'QUARANTINE_ALERT',
        nullifier,
        reason: 'Nullifier is permanently revoked',
      });
      return;
    }

    let assignedRole = 'MEMBER';
    if (packet.sessionToken) {
      const secret = resolveRelaySecret(this.env);
      if (secret) {
        const verified = await verifyRelaySessionToken(String(packet.sessionToken), secret);
        if (verified.valid && verified.payload?.role) {
          assignedRole = verified.payload.role;
        }
      }
    }

    session.fingerprint = fp;
    session.nullifier = nullifier;
    session.role = assignedRole;
    session.authenticated = true;

    const tags = new Set(session.tags);
    tags.add('global');
    tags.add(`user:${fp}`);
    tags.add(`channel:${session.currentChannelId}`);
    this.setWebSocketTags(ws, Array.from(tags));

    this.presence.set(fp, {
      fingerprint: fp,
      nullifier,
      role: assignedRole,
      status: 'online',
      joinedChannel: session.currentChannelId,
      subscribedChannels: Array.from(session.subscribedChannels),
      lastSeen: Date.now(),
      connectedAt: session.connectedAt,
    });

    this.send(ws, {
      type: 'AUTH_SUCCESS',
      fingerprint: fp,
      role: assignedRole,
      channels: this.channels,
    });
  }

  private async handleJoinChannel(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const channelId = PayloadSanitizer.sanitizeString(String(packet.channelId || 'relays-general'));
    session.currentChannelId = channelId;
    session.subscribedChannels.add(channelId);

    const tags = new Set(session.tags);
    tags.add(`channel:${channelId}`);
    this.setWebSocketTags(ws, Array.from(tags));

    const history = this.channelMessages.get(channelId) || [];
    this.send(ws, {
      type: 'CHANNEL_DATA',
      channelId,
      messages: history.slice(-50),
    });
  }

  private async handleLeaveChannel(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const channelId = PayloadSanitizer.sanitizeString(String(packet.channelId || ''));
    session.subscribedChannels.delete(channelId);
    const tags = new Set(session.tags);
    tags.delete(`channel:${channelId}`);
    this.setWebSocketTags(ws, Array.from(tags));
  }

  private async handleJoinCircle(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const circleId = PayloadSanitizer.sanitizeString(String(packet.circleId || ''));
    if (!circleId) return;
    session.currentCircleId = circleId;
    session.subscribedCircles.add(circleId);
    const tags = new Set(session.tags);
    tags.add(`circle:${circleId}`);
    this.setWebSocketTags(ws, Array.from(tags));
  }

  private async handleLeaveCircle(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const circleId = PayloadSanitizer.sanitizeString(String(packet.circleId || ''));
    session.subscribedCircles.delete(circleId);
    const tags = new Set(session.tags);
    tags.delete(`circle:${circleId}`);
    this.setWebSocketTags(ws, Array.from(tags));
  }

  private async handleSendMessage(ws: WebSocket, session: SovereignSessionMetadata, packet: any): Promise<void> {
    const channelId = PayloadSanitizer.sanitizeString(
      String(packet.channelId || session.currentChannelId || 'relays-general')
    );
    const rlnShare: RLNShare | undefined = packet.rlnShare || (
      packet.x && packet.y && packet.epoch && packet.nullifier
        ? {
            x: String(packet.x),
            y: String(packet.y),
            epoch: String(packet.epoch),
            nullifier: String(packet.nullifier),
          }
        : undefined
    );

    if (rlnShare) {
      if (this.revokedNullifiers.has(rlnShare.nullifier)) {
        this.send(ws, {
          type: 'QUARANTINE_ALERT',
          nullifier: rlnShare.nullifier,
          reason: 'Nullifier is revoked',
        });
        return;
      }

      const shareKey = `${rlnShare.nullifier}:${rlnShare.epoch}`;
      const priorShare = this.activeShares.get(shareKey);
      if (priorShare && priorShare.x !== rlnShare.x) {
        const breach = ZKRLN.verifyRateLimitBreach(priorShare, rlnShare);
        if (breach.verified) {
          this.revokedNullifiers.add(rlnShare.nullifier);
          await this.state.storage.put('revoked_nullifiers', Array.from(this.revokedNullifiers));
          this.broadcastGlobal({
            type: 'QUARANTINE_ALERT',
            nullifier: rlnShare.nullifier,
            epoch: rlnShare.epoch,
            reason: 'ZK-RLN polynomial rate-limit breach slashed',
          });
          return;
        }
      } else {
        this.activeShares.set(shareKey, rlnShare);
        this.shareTimestamps.set(shareKey, Date.now());
      }
    }

    const msg: RelayMessage = {
      id: String(packet.id || `msg_${Date.now()}`),
      channelId,
      authorFingerprint: session.fingerprint || String(packet.authorFingerprint || 'anonymous'),
      ciphertext: PayloadSanitizer.sanitizeString(String(packet.ciphertext || packet.text || '')),
      text: PayloadSanitizer.sanitizeString(String(packet.text || packet.ciphertext || '')),
      epoch: String(packet.epoch || '#1'),
      nullifier: rlnShare?.nullifier || session.nullifier,
      status: 'verified',
      createdAt: Date.now(),
    };

    const list = this.channelMessages.get(channelId) || [];
    list.push(msg);
    if (list.length > 200) list.shift();
    this.channelMessages.set(channelId, list);

    this.multicastToChannel(channelId, {
      type: 'NEW_MESSAGE',
      message: msg,
    });
  }

  private async handleSendCircleMessage(
    ws: WebSocket,
    session: SovereignSessionMetadata,
    packet: any
  ): Promise<void> {
    const circleId = PayloadSanitizer.sanitizeString(
      String(packet.circleId || session.currentCircleId || '')
    );
    if (!circleId) {
      this.send(ws, { type: 'ERROR', error: 'Missing circleId for circle message' });
      return;
    }
    this.multicastToCircle(circleId, {
      type: 'NEW_CIRCLE_MESSAGE',
      circleId,
      message: {
        id: String(packet.id || `cmsg_${Date.now()}`),
        circleId,
        authorFingerprint: session.fingerprint || 'anonymous',
        ciphertext: PayloadSanitizer.sanitizeString(String(packet.ciphertext || packet.text || '')),
        createdAt: Date.now(),
      },
    });
  }

  private handleTypingIndicator(ws: WebSocket, session: SovereignSessionMetadata, packet: any): void {
    const channelId = String(packet.channelId || session.currentChannelId || 'relays-general');
    this.multicastToChannel(
      channelId,
      {
        type: 'TYPING',
        channelId,
        fingerprint: session.fingerprint || 'anonymous',
        timestamp: Date.now(),
      },
      ws
    );
  }

  private handlePresenceUpdate(_ws: WebSocket, session: SovereignSessionMetadata, packet: any): void {
    const fp = session.fingerprint || String(packet.fingerprint || '');
    if (!fp) return;
    const status = ['online', 'idle', 'dnd', 'in-call'].includes(packet.status) ? packet.status : 'online';
    const updated: PresenceUser = {
      fingerprint: fp,
      nullifier: session.nullifier,
      role: session.role || 'MEMBER',
      status,
      joinedChannel: session.currentChannelId,
      subscribedChannels: Array.from(session.subscribedChannels),
      lastSeen: Date.now(),
      connectedAt: session.connectedAt,
    };
    this.presence.set(fp, updated);
    this.broadcastGlobal({
      type: 'PRESENCE_UPDATE',
      presence: Array.from(this.presence.values()),
    });
  }

  private async handlePublishNanopublication(
    _ws: WebSocket,
    _session: SovereignSessionMetadata,
    packet: any
  ): Promise<void> {
    const nano: RelayNanopublication = {
      id: String(packet.id || `nano_${Date.now()}`),
      channelId: String(packet.channelId || 'vault-releases'),
      title: PayloadSanitizer.sanitizeString(String(packet.title || 'Untitled Release')),
      fileName: PayloadSanitizer.sanitizeString(String(packet.fileName || 'artifact.bin')),
      byteSize: Number(packet.byteSize) || 0,
      sha256: String(packet.sha256 || ''),
      crc32: String(packet.crc32 || ''),
      entropy: Number(packet.entropy) || 0,
      verdict: String(packet.verdict || 'CLEAN'),
      merkleRoot: String(packet.merkleRoot || ''),
      seederCount: Number(packet.seederCount) || 1,
      createdAt: Date.now(),
    };
    this.nanopublications.unshift(nano);
    this.broadcastGlobal({
      type: 'NEW_NANOPUBLICATION',
      nanopublication: nano,
    });
  }

  private handleWebRTCSignal(ws: WebSocket, session: SovereignSessionMetadata, packet: any): void {
    const now = Date.now();
    if (!session.webrtcSignalWindow || now - session.webrtcSignalWindow > 10000) {
      session.webrtcSignalWindow = now;
      session.webrtcSignalCount = 0;
    }
    session.webrtcSignalCount = (session.webrtcSignalCount || 0) + 1;
    if (session.webrtcSignalCount > 40) {
      this.send(ws, { type: 'RATE_LIMIT_ERROR', error: 'WebRTC signaling rate limit exceeded' });
      return;
    }

    const targetFp = String(packet.targetFP || packet.targetFingerprint || '');
    if (targetFp) {
      this.multicast(`user:${targetFp}`, packet, ws);
    } else if (packet.channelId) {
      this.multicastToChannel(String(packet.channelId), packet, ws);
    }
  }

  public cleanExpiredShares(ttlMs: number = 120000): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, ts] of this.shareTimestamps.entries()) {
      if (now - ts > ttlMs) {
        this.shareTimestamps.delete(key);
        this.activeShares.delete(key);
        removed++;
      }
    }
    return removed;
  }

  public cleanExpiredPresence(ttlMs: number = 300000): number {
    const now = Date.now();
    let removed = 0;
    for (const [fp, user] of this.presence.entries()) {
      if (now - user.lastSeen > ttlMs) {
        this.presence.delete(fp);
        removed++;
      }
    }
    return removed;
  }

  async alarm(): Promise<void> {
    this.cleanExpiredShares();
    this.cleanExpiredPresence();
  }

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
