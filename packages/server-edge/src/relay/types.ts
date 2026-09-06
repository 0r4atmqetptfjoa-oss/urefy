/**
 * AETHERIS SOVEREIGN RELAY PROTOCOL SPECIFICATION (FAZA 3)
 * 
 * Defines the canonical packet frame types, data structures, and transport
 * abstraction interfaces shared identically across:
 * - Node.js Standalone Relay Server (server.ts)
 * - Cloudflare Worker Edge Relay (worker.ts)
 * - Cloudflare Durable Object (relay-durable-object.ts)
 * - Cloudflare Durable Object Hibernation Engine (durable-hibernation.ts)
 * - Cloudflare Pages WebSocket Gateway (ws.ts)
 */

import { SovereignIdentity, SovereignSignedEnvelope, RLNShare } from '@aetheris/core-crypto';

export type RelayPacketType =
  | 'AUTH'
  | 'CHALLENGE'
  | 'AUTH_RESPONSE'
  | 'AUTH_SUCCESS'
  | 'JOIN'
  | 'JOIN_CHANNEL'
  | 'LEAVE'
  | 'LEAVE_CHANNEL'
  | 'SEND_MESSAGE'
  | 'MESSAGE_ACK'
  | 'NEW_MESSAGE'
  | 'CHANNEL_DATA'
  | 'CHANNELS_LIST'
  | 'PUBLISH'
  | 'PUBLISH_NANOPUBLICATION'
  | 'NEW_NANOPUBLICATION'
  | 'PRESENCE'
  | 'PRESENCE_UPDATE'
  | 'PEER_JOINED'
  | 'PEER_LEFT'
  | 'RLN_PROOF'
  | 'RLN_REVOCATION'
  | 'QUARANTINE_ALERT'
  | 'SLASHING_NOTICE'
  | 'PING'
  | 'PONG'
  | 'WEBRTC_SIGNAL'
  | 'EXECUTE_ROLLBACK'
  | 'ROLLBACK_RESULT'
  | 'AUDIT_NOTIFICATION'
  | 'ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'REPLAY_ERROR';

export interface RelayChannel {
  id: string;
  space: string;
  name: string;
  description: string;
  isEncrypted: boolean;
}

export interface RelayMessage {
  id: string;
  channelId: string;
  authorFingerprint: string;
  ciphertext: string;
  text?: string;
  iv?: string;
  epoch: string | number;
  x?: string;
  y?: string;
  nullifier?: string;
  status: string;
  signature?: string;
  createdAt: number;
}

export interface RelayNanopublication {
  id: string;
  channelId: string;
  title: string;
  fileName: string;
  byteSize: number;
  sha256: string;
  crc32: string;
  entropy: number;
  verdict: string;
  merkleRoot: string;
  seederCount: number;
  createdAt: number;
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
  region?: string;
}

export interface RelaySession {
  id: string;
  socket: any;
  fingerprint?: string;
  publicKeyHex?: string;
  nullifier?: string;
  role: string;
  authenticated: boolean;
  currentChannelId: string;
  subscribedChannels: Set<string>;
  connectedAt: number;
  lastSeen: number;
  ip?: string;
  tags?: Set<string>;
}

export interface RelayBroadcaster {
  send(session: RelaySession, packet: any): void;
  broadcast(packet: any, options?: { sender?: RelaySession; channelId?: string; tag?: string }): void;
}

export interface RelayPersistence {
  getChannels(): RelayChannel[] | Promise<RelayChannel[]>;
  getMessages(channelId: string, limit?: number): RelayMessage[] | Promise<RelayMessage[]>;
  insertMessage(message: RelayMessage): void | Promise<void>;
  getNanopublications?(channelId: string): RelayNanopublication[] | Promise<RelayNanopublication[]>;
  insertNanopublication?(nano: RelayNanopublication): void | Promise<void>;
  upsertIdentity?(identity: {
    fingerprint: string;
    publicKeyHex: string;
    nullifier: string;
    role: string;
    isQuarantined: number;
    createdAt: number;
  }): void | Promise<void>;
  isRevoked(nullifier: string): boolean | Promise<boolean>;
  revokeNullifier(nullifier: string): void | Promise<void>;
  executeRollback?(targetActorFingerprint: string, moderatorFingerprint: string): any | Promise<any>;
}

export const DEFAULT_RELAY_CHANNELS: RelayChannel[] = [
  { id: 'relays-general', space: 'relays', name: 'general', description: 'Sovereign E2EE live voice & text', isEncrypted: true },
  { id: 'relays-dev', space: 'relays', name: 'dev-core', description: 'Core cryptography & low-level discussions', isEncrypted: true },
  { id: 'vault-releases', space: 'vault', name: 'releases', description: 'Verified software releases & clean binaries', isEncrypted: false },
  { id: 'vault-guides', space: 'vault', name: 'security-guides', description: 'In-depth research, reversing & operational security', isEncrypted: false },
  { id: 'pulse-global', space: 'pulse', name: 'chrono-feed', description: 'Uncensored chronological sovereign microblogging', isEncrypted: false },
];

export const INITIAL_RELAY_MESSAGES: Record<string, RelayMessage[]> = {
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
