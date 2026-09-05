/**
 * Cloudflare Worker Edge Entry Point for Aetheris Sovereign Platform.
 * Runs on Cloudflare's global edge network connecting to Cloudflare D1 SQL database
 * and Cloudflare Durable Objects for zero-latency hibernating WebSocket signaling.
 */

import {
  RelayDurableObject,
  DEFAULT_RELAY_CHANNELS,
  INITIAL_RELAY_MESSAGES,
  createWebSocketUpgradeResponse,
} from './relay-durable-object.js';
import { ZKRLN, RLNShare } from '@aetheris/core-crypto';
import { PayloadSanitizer } from './payload-sanitizer.js';

export { RelayDurableObject };

export interface Env {
  DB?: any; // Cloudflare D1 Database binding
  RELAY_DO?: any; // Cloudflare Durable Object Namespace binding
  [key: string]: any;
}

// Standalone isolate in-memory state when Durable Object binding is absent
const edgeActiveClients = new Map<WebSocket, { fingerprint?: string; nullifier?: string; role?: string; currentChannelId: string }>();
const edgeActiveShares = new Map<string, RLNShare>();
const edgeRevokedNullifiers = new Set<string>();
const edgePresence = new Map<string, { fingerprint: string; role: string; status: string; joinedChannel: string; lastSeen: number }>();
const edgeMessagesStore: Record<string, any[]> = { ...INITIAL_RELAY_MESSAGES };

function edgeBroadcast(packet: any, senderWs?: WebSocket, channelId?: string): void {
  const data = typeof packet === 'string' ? packet : JSON.stringify(packet);
  for (const [ws, client] of edgeActiveClients) {
    if (ws !== senderWs && (ws.readyState === (globalThis as any).WebSocket?.OPEN || ws.readyState === 1 || ws.readyState === undefined)) {
      if (!channelId || client.currentChannelId === channelId) {
        try {
          ws.send(data);
        } catch (_) {
          edgeActiveClients.delete(ws);
        }
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx?: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. Health & Edge Stats
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'Aetheris Sovereign Edge Relay',
          edge: 'Cloudflare Workers & Durable Objects',
          region: (request as any).cf?.colo || 'GLOBAL',
          country: (request as any).cf?.country || 'XX',
          durableObjectEnabled: Boolean(env.RELAY_DO),
          d1Enabled: Boolean(env.DB),
          timestamp: Date.now(),
        }),
        {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // 2. Channels Query via D1 or In-Memory
    if (url.pathname === '/api/channels') {
      if (env.DB) {
        try {
          const { results } = await env.DB.prepare('SELECT * FROM channels ORDER BY createdAt ASC').all();
          if (results && results.length > 0) {
            return new Response(JSON.stringify(results), {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
        } catch (err: any) {
          console.warn('[Worker D1 Channels Query Fallback]:', err.message);
        }
      }
      return new Response(JSON.stringify(DEFAULT_RELAY_CHANNELS), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 3. Nanopublications Query via D1 or In-Memory
    if (url.pathname === '/api/nanopublications') {
      if (env.DB) {
        try {
          const { results } = await env.DB.prepare('SELECT * FROM nanopublications ORDER BY createdAt DESC').all();
          return new Response(JSON.stringify(results || []), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 4. WebSocket Upgrade / Signaling Route
    const isWebSocket =
      request.headers.get('Upgrade')?.toLowerCase() === 'websocket' ||
      url.pathname === '/api/ws' ||
      url.pathname === '/ws';

    if (isWebSocket) {
      // ─── A) DURABLE OBJECT MODE (If RELAY_DO binding is present) ───────────
      if (env.RELAY_DO) {
        const roomId =
          url.searchParams.get('roomId') ||
          url.searchParams.get('room') ||
          url.searchParams.get('channelId') ||
          'global-relay';

        const id = env.RELAY_DO.idFromName(roomId);
        const stub = env.RELAY_DO.get(id);
        return stub.fetch(request);
      }

      // ─── B) STANDALONE WEBSOCKETPAIR MODE (Zero-Config Fallback) ────────────
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response(
          JSON.stringify({
            status: 'online',
            service: 'Aetheris Sovereign Edge Signaling (Standalone Mode)',
            transport: 'WebSocket',
            usage: 'Upgrade to WebSocket at /api/ws or /ws',
            activeConnections: edgeActiveClients.size,
          }),
          { status: 426, headers: { 'Content-Type': 'application/json', Upgrade: 'websocket' } }
        );
      }

      const pair = (globalThis as any).WebSocketPair ? new (globalThis as any).WebSocketPair() : null;
      if (!pair) {
        return new Response('WebSocketPair unavailable', { status: 500 });
      }

      const clientWs = pair[0] || pair['0'];
      const serverWs = pair[1] || pair['1'];

      if (typeof (serverWs as any).accept === 'function') {
        (serverWs as any).accept();
      }

      const clientInfo = {
        currentChannelId: 'relays-general',
      };
      edgeActiveClients.set(serverWs, clientInfo);

      serverWs.addEventListener?.('message', (event: any) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
          const packet = PayloadSanitizer.safeJSONParse(raw);

          switch (packet.type) {
            case 'AUTH': {
              const { fingerprint, nullifier, role } = packet;
              (clientInfo as any).fingerprint = fingerprint;
              (clientInfo as any).nullifier = nullifier;
              (clientInfo as any).role = role || 'MEMBER';

              const isQuarantined = Boolean(nullifier && edgeRevokedNullifiers.has(nullifier));
              if (fingerprint) {
                edgePresence.set(fingerprint, {
                  fingerprint,
                  role: (clientInfo as any).role,
                  status: 'online',
                  joinedChannel: clientInfo.currentChannelId,
                  lastSeen: Date.now(),
                });
              }

              serverWs.send(
                JSON.stringify({
                  type: 'AUTH_SUCCESS',
                  isQuarantined,
                  fingerprint,
                })
              );

              serverWs.send(
                JSON.stringify({
                  type: 'CHANNELS_LIST',
                  channels: DEFAULT_RELAY_CHANNELS,
                })
              );

              edgeBroadcast(
                {
                  type: 'PRESENCE_UPDATE',
                  presence: edgePresence.get(fingerprint),
                },
                serverWs
              );
              break;
            }

            case 'JOIN_CHANNEL': {
              const chId = packet.channelId || 'relays-general';
              clientInfo.currentChannelId = chId;

              const channelMsgs = edgeMessagesStore[chId] || [];
              serverWs.send(
                JSON.stringify({
                  type: 'CHANNEL_DATA',
                  channelId: chId,
                  messages: channelMsgs,
                  nanopublications: [],
                })
              );
              break;
            }

            case 'SEND_MESSAGE': {
              const chId = packet.channelId || clientInfo.currentChannelId || 'relays-general';
              const rawNullifier = packet.nullifier || (clientInfo as any).nullifier || '';
              const rawEpoch = String(packet.epoch || '#1');
              const rawX = packet.x ? String(packet.x).replace(/^0x/, '') : '';
              const rawY = packet.y ? String(packet.y).replace(/^0x/, '') : '';

              // Revocation check
              if (rawNullifier && edgeRevokedNullifiers.has(rawNullifier)) {
                serverWs.send(
                  JSON.stringify({
                    type: 'ERROR',
                    message: 'Forbidden: Your identity is revoked on the ZK-RLN Nullifier Tree.',
                  })
                );
                return;
              }

              // ZK-RLN Slashing detection
              if (rawNullifier && rawX && rawY) {
                const shareKey = `${rawEpoch}:${rawNullifier}`;
                const currentShare: RLNShare = {
                  nullifier: rawNullifier,
                  epoch: rawEpoch,
                  x: rawX,
                  y: rawY,
                };

                if (edgeActiveShares.has(shareKey)) {
                  const existingShare = edgeActiveShares.get(shareKey)!;
                  if (existingShare.x !== currentShare.x) {
                    try {
                      const verification = ZKRLN.verifyRateLimitBreach(existingShare, currentShare);
                      if (verification.verified) {
                        edgeRevokedNullifiers.add(rawNullifier);

                        edgeBroadcast({
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
                    } catch (e) {
                      console.warn('[Edge Standalone Slashing Error]', e);
                    }
                  }
                } else {
                  edgeActiveShares.set(shareKey, currentShare);
                }
              }

              const newMsg = {
                id: packet.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                channelId: chId,
                authorFingerprint: packet.fingerprint || (clientInfo as any).fingerprint || 'anon-peer',
                ciphertext: packet.ciphertext || packet.text || '',
                text: packet.text || packet.ciphertext || '',
                epoch: rawEpoch,
                status: 'verified',
                createdAt: packet.createdAt || Date.now(),
              };

              if (!edgeMessagesStore[chId]) edgeMessagesStore[chId] = [];
              edgeMessagesStore[chId].push(newMsg);

              edgeBroadcast(
                {
                  type: 'NEW_MESSAGE',
                  message: newMsg,
                },
                serverWs,
                chId
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

              edgeBroadcast({
                type: 'NEW_NANOPUBLICATION',
                nanopublication: np,
              });
              break;
            }

            case 'PING': {
              serverWs.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
              break;
            }
          }
        } catch (err: any) {
          console.error('[Standalone Edge WS Error]', err);
        }
      });

      const cleanup = () => {
        const fp = (clientInfo as any).fingerprint;
        if (fp) edgePresence.delete(fp);
        edgeActiveClients.delete(serverWs);
      };

      serverWs.addEventListener?.('close', cleanup);
      serverWs.addEventListener?.('error', cleanup);

      return createWebSocketUpgradeResponse(clientWs);
    }

    return new Response('Aetheris Sovereign Edge Relay Active', { status: 200 });
  },

  /**
   * Cloudflare Cron Trigger Handler
   * Executes scheduled tasks, including daily automated D1 database snapshots to Cloudflare R2
   */
  async scheduled(event: any, env: Env, ctx: any): Promise<void> {
    console.info(`[Edge Cron] Scheduled event triggered: ${event.cron || 'cron-trigger'} at ${new Date().toISOString()}`);

    if (!env.DB) {
      console.warn('[Edge Cron Backup] Cloudflare D1 binding (DB) is absent. Skipping snapshot.');
      return;
    }

    try {
      const tables = ['channels', 'messages', 'posts', 'votes', 'nanopublications', 'nodes_telemetry'];
      const snapshot: Record<string, any[]> = {};
      let totalRows = 0;

      for (const table of tables) {
        try {
          const result = await env.DB.prepare(`SELECT * FROM ${table}`).all();
          snapshot[table] = result.results || [];
          totalRows += (result.results || []).length;
        } catch (err: any) {
          console.warn(`[Edge Cron Backup] Could not query table ${table}:`, err.message);
          snapshot[table] = [];
        }
      }

      const isoDate = new Date().toISOString().slice(0, 10);
      const manifest = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        tables: snapshot,
        totalRows,
      };

      const serialized = JSON.stringify(manifest, null, 2);

      if (env.STORAGE_BUCKET) {
        const key = `backups/d1-snapshot-${isoDate}.json`;
        await env.STORAGE_BUCKET.put(key, serialized, {
          customMetadata: {
            createdAt: new Date().toISOString(),
            totalRows: String(totalRows),
          },
        });
        console.info(`[Edge Cron Backup] Successfully uploaded snapshot to R2: ${key} (${totalRows} total rows)`);

        // Rotate backups older than 7 days
        const listed = await env.STORAGE_BUCKET.list({ prefix: 'backups/d1-snapshot-' });
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        for (const obj of listed.objects || []) {
          if (obj.uploaded && now - new Date(obj.uploaded).getTime() > sevenDaysMs) {
            await env.STORAGE_BUCKET.delete(obj.key);
            console.info(`[Edge Cron Backup] Pruned expired backup: ${obj.key}`);
          }
        }
      } else {
        console.info(`[Edge Cron Backup] D1 snapshot completed (${totalRows} rows). STORAGE_BUCKET binding not configured.`);
      }
    } catch (err: any) {
      console.error('[Edge Cron Backup] Fatal error executing scheduled backup:', err);
    }
  },
};

