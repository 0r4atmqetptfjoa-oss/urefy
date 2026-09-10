/**
 * UREfy CANONICAL RELAY PROTOCOL ENGINE (FAZA 3)
 * 
 * Provides a single, authoritative packet handling and message dispatching engine
 * shared across Node.js server, Cloudflare Worker, and Cloudflare Durable Objects.
 * Resolves Item 16 of the architectural audit.
 */

import { PayloadSanitizer } from '../payload-sanitizer.js';
import {
  RelayBroadcaster,
  RelayMessage,
  RelayNanopublication,
  RelayPersistence,
  RelaySession,
} from './types.js';
import { RelayStateManager } from './state.js';

export interface ProtocolEngineOptions {
  requireChallengeHandshake?: boolean;
}

export class RelayProtocolEngine {
  private state: RelayStateManager;
  private persistence: RelayPersistence;
  private broadcaster: RelayBroadcaster;
  private options: ProtocolEngineOptions;

  constructor(
    state: RelayStateManager,
    persistence: RelayPersistence,
    broadcaster: RelayBroadcaster,
    options: ProtocolEngineOptions = {}
  ) {
    this.state = state;
    this.persistence = persistence;
    this.broadcaster = broadcaster;
    this.options = options;
  }

  public getState(): RelayStateManager {
    return this.state;
  }

  public getPersistence(): RelayPersistence {
    return this.persistence;
  }

  /**
   * Handles initial connection lifecycle for a new session.
   * Dispatches the initial CHANNELS_LIST packet.
   */
  public async handleConnection(session: RelaySession): Promise<void> {
    const channels = await this.persistence.getChannels();
    this.broadcaster.send(session, {
      type: 'CHANNELS_LIST',
      channels,
    });
  }

  /**
   * Handles disconnection lifecycle and presence cleanup.
   */
  public async handleDisconnection(session: RelaySession): Promise<void> {
    this.state.removeSessionFromAllChannels(session);

    if (session.fingerprint) {
      this.state.removePresence(session.fingerprint);
      this.broadcaster.broadcast(
        {
          type: 'PRESENCE_UPDATE',
          presence: {
            fingerprint: session.fingerprint,
            status: 'offline',
            joinedChannel: session.currentChannelId,
            subscribedChannels: [],
            lastSeen: Date.now(),
            connectedAt: session.connectedAt,
            role: session.role,
          },
        },
        { sender: session }
      );
    }
  }

  /**
   * Dispatches an incoming raw or parsed WebSocket frame.
   */
  public async handlePacket(session: RelaySession, packet: any): Promise<void> {
    if (!packet || typeof packet !== 'object') {
      this.broadcaster.send(session, { type: 'ERROR', message: 'Malformed packet: payload must be a JSON object' });
      return;
    }

    session.lastSeen = Date.now();
    const packetType = String(packet.type || '').trim().toUpperCase();

    switch (packetType) {
      // ─── 1. AUTHENTICATION & CHALLENGE / RESPONSE ────────────────────────
      case 'AUTH': {
        await this.handleAuth(session, packet);
        break;
      }

      case 'AUTH_RESPONSE': {
        await this.handleAuthResponse(session, packet);
        break;
      }

      // ─── 2. CHANNEL SUBSCRIPTIONS ─────────────────────────────────────────
      case 'JOIN':
      case 'JOIN_CHANNEL': {
        await this.handleJoin(session, packet);
        break;
      }

      case 'LEAVE':
      case 'LEAVE_CHANNEL': {
        await this.handleLeave(session, packet);
        break;
      }

      // ─── 3. MESSAGING & ACKNOWLEDGEMENTS ──────────────────────────────────
      case 'SEND_MESSAGE': {
        await this.handleSendMessage(session, packet);
        break;
      }

      // ─── 4. PUBLICATIONS & VAULT ──────────────────────────────────────────
      case 'PUBLISH':
      case 'PUBLISH_NANOPUBLICATION': {
        await this.handlePublish(session, packet);
        break;
      }

      // ─── 5. PRESENCE & HEARTBEATS ─────────────────────────────────────────
      case 'PRESENCE':
      case 'PRESENCE_UPDATE': {
        await this.handlePresence(session, packet);
        break;
      }

      case 'PING': {
        this.broadcaster.send(session, {
          type: 'PONG',
          timestamp: packet.timestamp || Date.now(),
        });
        break;
      }

      case 'PONG': {
        // Heartbeat ACK recorded
        session.lastSeen = Date.now();
        break;
      }

      // ─── 6. ZK-RLN DIRECT PROOF ───────────────────────────────────────────
      case 'RLN_PROOF': {
        const { epoch, nullifier, x, y } = packet;
        if (!nullifier || !epoch || !x || !y) {
          this.broadcaster.send(session, { type: 'ERROR', message: 'Invalid RLN proof parameters' });
          return;
        }
        const violation = this.state.recordShareAndCheckViolation({
          nullifier,
          epoch: String(epoch),
          x: String(x),
          y: String(y),
        });
        if (violation.violated) {
          await this.persistence.revokeNullifier(nullifier);
          this.broadcaster.send(session, {
            type: 'SLASHING_NOTICE',
            nullifier,
            epoch,
            message: 'Double-sign rate limit breach detected.',
          });
          this.broadcaster.broadcast({
            type: 'QUARANTINE_ALERT',
            nullifier,
            epoch,
            reason: 'Polynomial double-sign rate-limit breach detected.',
          });
        } else {
          this.broadcaster.send(session, {
            type: 'RLN_PROOF_RESULT',
            valid: true,
            nullifier,
            epoch,
          });
        }
        break;
      }

      // ─── 7. P2P WEBRTC SIGNALING ──────────────────────────────────────────
      case 'WEBRTC_SIGNAL': {
        const { targetFingerprint, signal } = packet;
        if (targetFingerprint && signal) {
          this.broadcaster.broadcast(
            {
              type: 'WEBRTC_SIGNAL',
              fromFingerprint: session.fingerprint,
              signal,
            },
            { tag: `peer:${targetFingerprint}` }
          );
        }
        break;
      }

      // ─── 8. GOVERNANCE & TIME-TRAVEL ROLLBACK ────────────────────────────
      case 'EXECUTE_ROLLBACK': {
        if (!session.fingerprint) {
          this.broadcaster.send(session, { type: 'ERROR', message: 'Unauthorized: Complete AUTH first' });
          return;
        }
        const { targetActorFingerprint } = packet;
        if (this.persistence.executeRollback && targetActorFingerprint) {
          const result = await this.persistence.executeRollback(targetActorFingerprint, session.fingerprint);
          this.broadcaster.send(session, { type: 'ROLLBACK_RESULT', result });
          this.broadcaster.broadcast({ type: 'AUDIT_NOTIFICATION', action: 'ROLLBACK', targetActorFingerprint });
        }
        break;
      }

      default:
        this.broadcaster.send(session, { type: 'ERROR', message: `Unknown packet type: ${packetType}` });
    }
  }

  // ─── PRIVATE HANDLERS ──────────────────────────────────────────────────────

  private async handleAuth(session: RelaySession, packet: any): Promise<void> {
    const { fingerprint, publicKeyHex, nullifier, role } = packet;

    if (!fingerprint || !PayloadSanitizer.isValidIdentifier(fingerprint)) {
      this.broadcaster.send(session, { type: 'ERROR', message: 'Invalid or disallowed fingerprint format' });
      return;
    }

    session.fingerprint = fingerprint;
    session.publicKeyHex = publicKeyHex;
    session.nullifier = nullifier;
    session.role = role || 'MEMBER';

    // If challenge-response handshake is requested/required and challenge not provided
    if (this.options.requireChallengeHandshake && !packet.signature && !packet.challenge) {
      const challengeObj = this.state.createChallenge(fingerprint);
      this.broadcaster.send(session, {
        type: 'CHALLENGE',
        challenge: challengeObj.challenge,
        timestamp: challengeObj.timestamp,
      });
      return;
    }

    // Direct / Completed authentication
    session.authenticated = true;
    const isQuarantined = (nullifier && (this.state.isRevoked(nullifier) || await this.persistence.isRevoked(nullifier))) ? 1 : 0;

    if (this.persistence.upsertIdentity) {
      await this.persistence.upsertIdentity({
        fingerprint,
        publicKeyHex: publicKeyHex || '',
        nullifier: nullifier || '',
        role: session.role,
        isQuarantined,
        createdAt: Date.now(),
      });
    }

    this.state.updatePresence({
      fingerprint,
      nullifier,
      role: session.role,
      status: 'online',
      joinedChannel: session.currentChannelId,
      subscribedChannels: Array.from(session.subscribedChannels),
      lastSeen: Date.now(),
      connectedAt: session.connectedAt,
    });

    this.broadcaster.send(session, {
      type: 'AUTH_SUCCESS',
      fingerprint,
      nullifier,
      isQuarantined: isQuarantined === 1,
      role: session.role,
    });

    const channels = await this.persistence.getChannels();
    this.broadcaster.send(session, {
      type: 'CHANNELS_LIST',
      channels,
    });

    this.broadcaster.broadcast(
      {
        type: 'PRESENCE_UPDATE',
        presence: this.state.getPresence().find((p) => p.fingerprint === fingerprint),
      },
      { sender: session }
    );
  }

  private async handleAuthResponse(session: RelaySession, packet: any): Promise<void> {
    const { challenge, signature, fingerprint, publicKeyHex } = packet;

    if (!challenge || !signature || !fingerprint) {
      this.broadcaster.send(session, { type: 'ERROR', message: 'Missing challenge, signature, or fingerprint in AUTH_RESPONSE' });
      return;
    }

    const pubKey = publicKeyHex || session.publicKeyHex || '';
    const verification = this.state.verifyChallenge(challenge, signature, pubKey, fingerprint);

    if (!verification.valid) {
      this.broadcaster.send(session, { type: 'ERROR', message: verification.error || 'Authentication challenge verification failed' });
      return;
    }

    session.authenticated = true;
    session.fingerprint = fingerprint;
    session.publicKeyHex = pubKey;

    const nullifier = session.nullifier;
    const isQuarantined = (nullifier && (this.state.isRevoked(nullifier) || await this.persistence.isRevoked(nullifier))) ? 1 : 0;

    this.state.updatePresence({
      fingerprint,
      nullifier,
      role: session.role || 'MEMBER',
      status: 'online',
      joinedChannel: session.currentChannelId,
      subscribedChannels: Array.from(session.subscribedChannels),
      lastSeen: Date.now(),
      connectedAt: session.connectedAt,
    });

    this.broadcaster.send(session, {
      type: 'AUTH_SUCCESS',
      fingerprint,
      nullifier,
      isQuarantined: isQuarantined === 1,
      role: session.role,
    });

    const channels = await this.persistence.getChannels();
    this.broadcaster.send(session, {
      type: 'CHANNELS_LIST',
      channels,
    });

    this.broadcaster.broadcast(
      {
        type: 'PRESENCE_UPDATE',
        presence: this.state.getPresence().find((p) => p.fingerprint === fingerprint),
      },
      { sender: session }
    );
  }

  private async handleJoin(session: RelaySession, packet: any): Promise<void> {
    const channelId = packet.channelId || packet.id;
    if (!channelId || !PayloadSanitizer.isValidIdentifier(channelId)) {
      this.broadcaster.send(session, { type: 'ERROR', message: 'Invalid or disallowed channel ID format' });
      return;
    }

    session.currentChannelId = channelId;
    this.state.subscribeToChannel(channelId, session);

    if (session.fingerprint) {
      const currentPresence = this.state.getPresence().find((p) => p.fingerprint === session.fingerprint);
      if (currentPresence) {
        currentPresence.joinedChannel = channelId;
        if (!currentPresence.subscribedChannels.includes(channelId)) {
          currentPresence.subscribedChannels.push(channelId);
        }
        this.state.updatePresence(currentPresence);
      }
    }

    const messages = await this.persistence.getMessages(channelId);
    let nanopublications: RelayNanopublication[] = [];
    if (this.persistence.getNanopublications) {
      nanopublications = await this.persistence.getNanopublications(channelId);
    }
    const presence = this.state.getPresence(channelId);

    this.broadcaster.send(session, {
      type: 'CHANNEL_DATA',
      channelId,
      messages,
      nanopublications,
      presence,
    });

    if (session.fingerprint) {
      this.broadcaster.broadcast(
        {
          type: 'PEER_JOINED',
          channelId,
          fingerprint: session.fingerprint,
          role: session.role,
        },
        { sender: session, channelId }
      );
    }
  }

  private async handleLeave(session: RelaySession, packet: any): Promise<void> {
    const channelId = packet.channelId;
    if (!channelId) return;

    this.state.unsubscribeFromChannel(channelId, session);

    if (session.fingerprint) {
      this.broadcaster.broadcast(
        {
          type: 'PEER_LEFT',
          channelId,
          fingerprint: session.fingerprint,
        },
        { sender: session, channelId }
      );
    }
  }

  private async handleSendMessage(session: RelaySession, packet: any): Promise<void> {
    if (!session.authenticated) {
      this.broadcaster.send(session, { type: 'ERROR', message: 'Unauthorized: Complete AUTH first' });
      return;
    }

    const channelId = packet.channelId || session.currentChannelId;
    if (!channelId || !PayloadSanitizer.isValidIdentifier(channelId)) {
      this.broadcaster.send(session, { type: 'ERROR', message: 'Invalid channel ID' });
      return;
    }

    const nullifier = packet.nullifier || session.nullifier;
    if (nullifier && (this.state.isRevoked(nullifier) || await this.persistence.isRevoked(nullifier))) {
      this.broadcaster.send(session, {
        type: 'ERROR',
        message: 'Forbidden: Your identity is revoked on the ZK-RLN Nullifier Tree.',
        isQuarantined: true,
      });
      return;
    }

    // Evaluate ZK-RLN Double-Sign Rate Limiting
    const { epoch, x, y } = packet;
    if (nullifier && epoch && x && y) {
      const violation = this.state.recordShareAndCheckViolation({
        nullifier,
        epoch: String(epoch),
        x: String(x).replace(/^0x/, ''),
        y: String(y).replace(/^0x/, ''),
      });

      if (violation.violated) {
        await this.persistence.revokeNullifier(nullifier);

        // Notify offender (Zero Secret Key Dissemination)
        this.broadcaster.send(session, {
          type: 'SLASHING_NOTICE',
          nullifier,
          epoch: String(epoch),
          message: 'Double-sign rate limit breach detected. Polynomial security share penalty applied to node.',
        });

        // Broadcast global quarantine alert to network (Zero Secret Key Dissemination)
        this.broadcaster.broadcast({
          type: 'QUARANTINE_ALERT',
          nullifier,
          epoch: String(epoch),
          reason: 'Polynomial double-sign rate-limit breach detected. Nullifier permanently quarantined.',
        });

        return;
      }
    }

    // Construct and persist message
    const randSuffixMsg = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 8)
      : Date.now().toString(36);
    const msgRecord: RelayMessage = {
      id: packet.id || `msg-${Date.now()}-${randSuffixMsg}`,
      channelId,
      authorFingerprint: session.fingerprint || 'anon-peer',
      ciphertext: packet.ciphertext || packet.text || '',
      text: packet.ciphertext || packet.text || '',
      iv: packet.iv,
      epoch: packet.epoch || 0,
      status: 'verified',
      signature: packet.signature,
      createdAt: packet.createdAt || Date.now(),
    };

    await this.persistence.insertMessage(msgRecord);

    // Send MESSAGE_ACK to sender
    this.broadcaster.send(session, {
      type: 'MESSAGE_ACK',
      id: msgRecord.id,
      channelId,
      status: 'delivered',
      timestamp: Date.now(),
    });

    // Multicast NEW_MESSAGE to channel subscribers
    this.broadcaster.broadcast(
      {
        type: 'NEW_MESSAGE',
        message: msgRecord,
      },
      { channelId }
    );
  }

  private async handlePublish(session: RelaySession, packet: any): Promise<void> {
    const channelId = packet.channelId || session.currentChannelId;
    const title = PayloadSanitizer.sanitizeString(packet.title || 'Verified Release');
    const fileName = PayloadSanitizer.sanitizeString(packet.fileName || 'file.bin');

    const randSuffixNano = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 8)
      : Date.now().toString(36);
    const nanoRecord: RelayNanopublication = {
      id: packet.id || `nano-${Date.now()}-${randSuffixNano}`,
      channelId,
      title,
      fileName,
      byteSize: packet.byteSize || 0,
      sha256: packet.sha256 || '',
      crc32: packet.crc32 || 'VERIFIED',
      entropy: packet.entropy || 7.5,
      verdict: packet.verdict || 'CLEAN',
      merkleRoot: packet.merkleRoot || packet.sha256 || '',
      seederCount: packet.seederCount || 1,
      createdAt: Date.now(),
    };

    if (this.persistence.insertNanopublication) {
      await this.persistence.insertNanopublication(nanoRecord);
    }

    this.broadcaster.broadcast(
      {
        type: 'NEW_NANOPUBLICATION',
        nanopublication: nanoRecord,
      },
      { channelId }
    );
  }

  private async handlePresence(session: RelaySession, packet: any): Promise<void> {
    if (!session.fingerprint) return;

    this.state.updatePresence({
      fingerprint: session.fingerprint,
      nullifier: session.nullifier,
      role: session.role,
      status: packet.status || 'online',
      customStatus: packet.customStatus,
      joinedChannel: session.currentChannelId,
      subscribedChannels: Array.from(session.subscribedChannels),
      lastSeen: Date.now(),
      connectedAt: session.connectedAt,
    });

    this.broadcaster.broadcast(
      {
        type: 'PRESENCE_UPDATE',
        presence: this.state.getPresence().find((p) => p.fingerprint === session.fingerprint),
      },
      { sender: session }
    );
  }
}
