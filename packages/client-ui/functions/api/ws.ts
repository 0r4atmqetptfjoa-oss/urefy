// ===========================================================================
// AETHERIS OMNI-SPHERE — CLOUDFLARE PAGES WEBSOCKET SIGNALING & RELAY ENGINE
// Supports: Cloudflare Durable Objects Hibernation API (when env.RELAY_DO is bound)
// Zero-Config Fallback: In-Isolate Cloudflare Pages WebSocketPair with ZK-RLN & Presence.
// ===========================================================================

import { ZKRLN, RLNShare } from '@aetheris/core-crypto';
import { isProductionEnv } from './_db.js';

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

declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
  [Symbol.iterator](): IterableIterator<WebSocket>;
}

export interface PresenceUser {
  fingerprint: string;
  nullifier?: string;
  role: string;
  status: 'online' | 'idle' | 'dnd' | 'in-call';
  customStatus?: string;
  joinedChannel: string;
  subscribedChannels: string[];
  lastSeen: number;
  connectedAt: number;
}

export interface SocketClient {
  ws: WebSocket;
  fingerprint?: string;
  nullifier?: string;
  role?: string;
  currentChannelId: string;
  subscribedChannels: Set<string>;
  connectedAt: number;
  lastSeen: number;
}

export const DEFAULT_CHANNELS = [
  { id: 'relays-general', space: 'relays', name: 'general', description: 'Sovereign E2EE live voice & text', isEncrypted: 1 },
  { id: 'relays-dev', space: 'relays', name: 'dev-core', description: 'Core cryptography & low-level discussions', isEncrypted: 1 },
  { id: 'vault-releases', space: 'vault', name: 'releases', description: 'Verified software releases & clean binaries', isEncrypted: 0 },
  { id: 'vault-guides', space: 'vault', name: 'security-guides', description: 'In-depth research, reversing & operational security', isEncrypted: 0 },
  { id: 'pulse-global', space: 'pulse', name: 'chrono-feed', description: 'Uncensored chronological sovereign microblogging', isEncrypted: 0 },
];

export const INITIAL_MESSAGES_MAP: Record<string, any[]> = {
  'relays-general': [
    {
      id: 'msg-1',
      channelId: 'relays-general',
      authorFingerprint: 'genesis-core',
      ciphertext: 'Welcome to the Sovereign E2EE Live Relay. All communications in this matrix are quantum-ratcheted via MLS TreeKEM and authenticated with Zero-Knowledge RLN.',
      text: 'Welcome to the Sovereign E2EE Live Relay. All communications in this matrix are quantum-ratcheted via MLS TreeKEM and authenticated with Zero-Knowledge RLN.',
      epoch: '#412',
      status: 'verified',
      createdAt: 1756660000000,
    },
    {
      id: 'msg-2',
      channelId: 'relays-general',
      authorFingerprint: 'c3dc28cb705e',
      ciphertext: 'The BitTorrent Merkle pieces for Micro-Kernel v1.0.0 have fully propagated across all 14 seeder nodes. 100% byte-match verified.',
      text: 'The BitTorrent Merkle pieces for Micro-Kernel v1.0.0 have fully propagated across all 14 seeder nodes. 100% byte-match verified.',
      epoch: '#412',
      status: 'verified',
      createdAt: 1756661500000,
    },
    {
      id: 'msg-3',
      channelId: 'relays-general',
      authorFingerprint: 'a89104fa2211',
      ciphertext: 'Confirmed. Zero packet loss over WebRTC DTLS direct tunnels. Latency stable at 14ms.',
      text: 'Confirmed. Zero packet loss over WebRTC DTLS direct tunnels. Latency stable at 14ms.',
      epoch: '#412',
      status: 'verified',
      createdAt: 1756662400000,
    },
  ],
};

// ─── STANDALONE ISOLATE STATE ────────────────────────────────────────────────
const activeClients = new Map<WebSocket, SocketClient>();
const activeShares = new Map<string, RLNShare>(); // Key: `${epoch}:${nullifier}`
const revokedNullifiers = new Set<string>();
const presenceStore = new Map<string, PresenceUser>();

/**
 * High-efficiency broadcast: serializes payload ONCE with JSON.stringify()
 * then distributes to all open sockets.
 */
function broadcast(
  packet: any,
  options?: { senderWs?: WebSocket; channelId?: string; targetFingerprint?: string }
): void {
  const data = typeof packet === 'string' ? packet : JSON.stringify(packet);

  for (const [ws, client] of activeClients) {
    if (ws !== options?.senderWs && ws.readyState === WebSocket.OPEN) {
      if (options?.channelId && client.currentChannelId !== options.channelId && !client.subscribedChannels?.has(options.channelId)) {
        continue;
      }
      try {
        ws.send(data);
      } catch (e) {
        // Socket error, cleanup
        activeClients.delete(ws);
      }
    }
  }
}

/**
 * Cloudflare Pages Functions entry point for /api/ws.
 * Seamlessly routes to Cloudflare Durable Objects if env.RELAY_DO is configured,
 * otherwise runs high-performance in-isolate signaling.
 */
export async function onRequest(context: {
  request: Request;
  env?: { RELAY_DO?: any; DB?: any; [key: string]: any };
  waitUntil?: (p: Promise<any>) => void;
}): Promise<Response> {
  const req = context.request;
  const env = context.env || {};
  const url = new URL(req.url);

  // 1. Check if Durable Object binding is available (Cloudflare Workers / Pages DO Mode)
  if (env.RELAY_DO) {
    const roomId =
      url.searchParams.get('roomId') ||
      url.searchParams.get('room') ||
      url.searchParams.get('channelId') ||
      'global-relay';

    const id = env.RELAY_DO.idFromName(roomId);
    const stub = env.RELAY_DO.get(id);
    return stub.fetch(req);
  }

  // In production, standalone in-memory fallback is strictly forbidden
  if (isProductionEnv(env)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Cloudflare Durable Object binding RELAY_DO is required in production. In-memory standalone fallback is disabled.',
        status: 503,
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '5',
        },
      }
    );
  }

  // 2. Standalone Cloudflare Pages WebSocketPair Mode
  const upgradeHeader = req.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response(
      JSON.stringify({
        status: 'online',
        service: 'Aetheris Sovereign WebSocket Signaling Edge',
        transport: 'WebSocket',
        usage: 'Connect via wss://<domain>/api/ws with standard WebSocket protocol',
        activeConnections: activeClients.size,
        protocol: 'Aetheris-Sovereign-v1.0.0',
        durableObjectAvailable: Boolean(env.RELAY_DO),
        zkRlnEnabled: true,
        presenceCount: presenceStore.size,
      }),
      {
        status: 426,
        headers: {
          'Content-Type': 'application/json',
          Upgrade: 'websocket',
        },
      }
    );
  }

  // Instantiate Cloudflare Worker WebSocket Pair
  // @ts-ignore
  const pair = (globalThis as any).WebSocketPair ? new (globalThis as any).WebSocketPair() : new WebSocketPair();
  const clientWs = pair[0];
  const serverWs = pair[1];

  // @ts-ignore
  if (typeof serverWs.accept === 'function') {
    // @ts-ignore
    serverWs.accept();
  }

  const clientInfo: SocketClient = {
    ws: serverWs,
    currentChannelId: 'relays-general',
    subscribedChannels: new Set(['relays-general']),
    connectedAt: Date.now(),
    lastSeen: Date.now(),
  };
  activeClients.set(serverWs, clientInfo);

  serverWs.addEventListener('message', (event: MessageEvent) => {
    try {
      const raw = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data as ArrayBuffer);
      const packet = JSON.parse(raw);

      switch (packet.type) {
        case 'AUTH': {
          clientInfo.fingerprint = packet.fingerprint;
          clientInfo.nullifier = packet.nullifier;
          clientInfo.role = packet.role || 'MEMBER';
          clientInfo.lastSeen = Date.now();

          const isQuarantined = Boolean(packet.nullifier && revokedNullifiers.has(packet.nullifier));

          if (packet.fingerprint) {
            presenceStore.set(packet.fingerprint, {
              fingerprint: packet.fingerprint,
              nullifier: packet.nullifier,
              role: clientInfo.role || 'MEMBER',
              status: packet.status || 'online',
              joinedChannel: clientInfo.currentChannelId,
              subscribedChannels: Array.from(clientInfo.subscribedChannels),
              lastSeen: Date.now(),
              connectedAt: clientInfo.connectedAt,
            });
          }

          serverWs.send(
            JSON.stringify({
              type: 'AUTH_SUCCESS',
              isQuarantined,
              fingerprint: packet.fingerprint,
              nullifier: packet.nullifier,
            })
          );

          serverWs.send(
            JSON.stringify({
              type: 'CHANNELS_LIST',
              channels: DEFAULT_CHANNELS,
            })
          );

          if (packet.fingerprint) {
            broadcast(
              {
                type: 'PRESENCE_UPDATE',
                presence: presenceStore.get(packet.fingerprint),
              },
              { senderWs: serverWs }
            );
          }
          break;
        }

        case 'JOIN_CHANNEL': {
          const chId = packet.channelId || 'relays-general';
          clientInfo.currentChannelId = chId;
          clientInfo.subscribedChannels.add(chId);

          if (clientInfo.fingerprint && presenceStore.has(clientInfo.fingerprint)) {
            const user = presenceStore.get(clientInfo.fingerprint)!;
            user.joinedChannel = chId;
            if (!user.subscribedChannels.includes(chId)) user.subscribedChannels.push(chId);
            user.lastSeen = Date.now();
          }

          const channelMsgs = INITIAL_MESSAGES_MAP[chId] || [];
          serverWs.send(
            JSON.stringify({
              type: 'CHANNEL_DATA',
              channelId: chId,
              messages: channelMsgs,
              nanopublications: [],
              presence: Array.from(presenceStore.values()).filter(
                (p) => p.joinedChannel === chId || p.subscribedChannels.includes(chId)
              ),
            })
          );

          if (clientInfo.fingerprint) {
            broadcast(
              {
                type: 'PEER_JOINED',
                channelId: chId,
                fingerprint: clientInfo.fingerprint,
                role: clientInfo.role,
              },
              { senderWs: serverWs, channelId: chId }
            );
          }
          break;
        }

        case 'LEAVE_CHANNEL': {
          const chId = packet.channelId;
          if (chId) {
            clientInfo.subscribedChannels.delete(chId);
            if (clientInfo.fingerprint) {
              broadcast(
                {
                  type: 'PEER_LEFT',
                  channelId: chId,
                  fingerprint: clientInfo.fingerprint,
                },
                { senderWs: serverWs, channelId: chId }
              );
            }
          }
          break;
        }

        case 'SEND_MESSAGE': {
          const chId = packet.channelId || clientInfo.currentChannelId || 'relays-general';
          const rawNullifier = packet.nullifier || clientInfo.nullifier || '';
          const rawEpoch = String(packet.epoch || '#1');
          const rawX = packet.x ? String(packet.x).replace(/^0x/, '') : '';
          const rawY = packet.y ? String(packet.y).replace(/^0x/, '') : '';

          // 1. Check if nullifier is already revoked/slashed
          if (rawNullifier && revokedNullifiers.has(rawNullifier)) {
            serverWs.send(
              JSON.stringify({
                type: 'ERROR',
                message: 'Forbidden: Your identity is revoked on the ZK-RLN Nullifier Tree.',
                isQuarantined: true,
              })
            );
            return;
          }

          // 2. ZK-RLN Rate Limit & Double-Sign Collision Detection
          if (rawNullifier && rawX && rawY) {
            const shareKey = `${rawEpoch}:${rawNullifier}`;
            const currentShare: RLNShare = {
              nullifier: rawNullifier,
              epoch: rawEpoch,
              x: rawX,
              y: rawY,
            };

            if (activeShares.has(shareKey)) {
              const existingShare = activeShares.get(shareKey)!;
              if (existingShare.x !== currentShare.x) {
                try {
                  const verification = ZKRLN.verifyRateLimitBreach(existingShare, currentShare);
                  if (verification.verified) {
                    revokedNullifiers.add(rawNullifier);

                    // Broadcast QUARANTINE_ALERT globally (zero secret key disclosure)
                    broadcast({
                      type: 'QUARANTINE_ALERT',
                      nullifier: rawNullifier,
                      epoch: rawEpoch,
                      reason: 'RLN Rate Limit Violation: Double message broadcast in single epoch',
                    });

                    serverWs.send(
                      JSON.stringify({
                        type: 'SLASHING_NOTICE',
                        message: 'Your identity nullifier has been revoked due to rate limit violation.',
                        nullifier: rawNullifier,
                        epoch: rawEpoch,
                      })
                    );
                    return;
                  }
                } catch (slashErr) {
                  console.warn('[Edge WS Slashing Error]', slashErr);
                }
              }
            } else {
              activeShares.set(shareKey, currentShare);
            }
          }

          const randSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID().replace(/-/g, '').substring(0, 8)
            : Date.now().toString(36);
          const newMsg = {
            id: packet.id || `msg-${Date.now()}-${randSuffix}`,
            channelId: chId,
            authorFingerprint: packet.fingerprint || clientInfo.fingerprint || 'anon-peer',
            ciphertext: packet.ciphertext || packet.text || '',
            text: packet.text || packet.ciphertext || '',
            epoch: rawEpoch,
            status: 'verified',
            createdAt: packet.createdAt || Date.now(),
          };

          if (!INITIAL_MESSAGES_MAP[chId]) {
            INITIAL_MESSAGES_MAP[chId] = [];
          }
          INITIAL_MESSAGES_MAP[chId].push(newMsg);

          // Broadcast with single JSON.stringify serialization
          broadcast(
            {
              type: 'NEW_MESSAGE',
              message: newMsg,
            },
            { senderWs: serverWs, channelId: chId }
          );

          serverWs.send(
            JSON.stringify({
              type: 'MESSAGE_ACK',
              messageId: newMsg.id,
              channelId: chId,
            })
          );
          break;
        }

        case 'TYPING_INDICATOR': {
          const chId = packet.channelId || clientInfo.currentChannelId;
          const fingerprint = clientInfo.fingerprint || packet.fingerprint;
          if (fingerprint) {
            broadcast(
              {
                type: 'TYPING_INDICATOR',
                channelId: chId,
                fingerprint,
                isTyping: Boolean(packet.isTyping),
              },
              { senderWs: serverWs, channelId: chId }
            );
          }
          break;
        }

        case 'PRESENCE_UPDATE': {
          if (clientInfo.fingerprint && presenceStore.has(clientInfo.fingerprint)) {
            const user = presenceStore.get(clientInfo.fingerprint)!;
            if (packet.status) user.status = packet.status;
            if (packet.customStatus !== undefined) user.customStatus = packet.customStatus;
            user.lastSeen = Date.now();

            broadcast(
              {
                type: 'PRESENCE_UPDATE',
                presence: user,
              },
              { senderWs: serverWs }
            );
          }
          break;
        }

        case 'PRESENCE_QUERY': {
          const chId = packet.channelId || clientInfo.currentChannelId;
          let users = Array.from(presenceStore.values());
          if (chId && chId !== 'all') {
            users = users.filter((u) => u.joinedChannel === chId || u.subscribedChannels.includes(chId));
          }
          serverWs.send(
            JSON.stringify({
              type: 'PRESENCE_LIST',
              channelId: chId,
              users,
              count: users.length,
            })
          );
          break;
        }

        case 'PUBLISH_NANOPUBLICATION': {
          const np = {
            id: `nano-${Date.now()}`,
            channelId: packet.channelId || 'vault-releases',
            title: packet.title,
            fileName: packet.fileName,
            byteSize: packet.byteSize,
            sha256: packet.sha256,
            crc32: packet.crc32,
            entropy: packet.entropy,
            verdict: packet.verdict,
            merkleRoot: packet.merkleRoot,
            seederCount: 1,
            createdAt: Date.now(),
          };

          broadcast({
            type: 'NEW_NANOPUBLICATION',
            nanopublication: np,
          });
          break;
        }

        case 'WEBRTC_SIGNAL': {
          const { targetFingerprint, signal, channelId } = packet;
          if (targetFingerprint) {
            const payload = JSON.stringify({
              type: 'WEBRTC_SIGNAL',
              fromFingerprint: clientInfo.fingerprint || 'anon-peer',
              targetFingerprint,
              signal,
              channelId: channelId || clientInfo.currentChannelId,
            });

            for (const [otherWs, otherClient] of activeClients) {
              if (otherClient.fingerprint === targetFingerprint && otherWs.readyState === WebSocket.OPEN) {
                try {
                  otherWs.send(payload);
                } catch (_) {}
                break;
              }
            }
          }
          break;
        }

        case 'PING': {
          clientInfo.lastSeen = Date.now();
          serverWs.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          break;
        }
      }
    } catch (err) {
      console.error('[Edge WebSocket Error]', err);
    }
  });

  const cleanup = () => {
    if (clientInfo.fingerprint) {
      presenceStore.delete(clientInfo.fingerprint);
      broadcast({
        type: 'PRESENCE_LEAVE',
        fingerprint: clientInfo.fingerprint,
        channelId: clientInfo.currentChannelId,
      });
    }
    activeClients.delete(serverWs);
  };

  serverWs.addEventListener('close', cleanup);
  serverWs.addEventListener('error', cleanup);

  // Return the client end of the pair to the browser with status 101
  return createWebSocketUpgradeResponse(clientWs);
}
