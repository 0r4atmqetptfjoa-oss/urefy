import { describe, it, expect, beforeEach } from 'vitest';
import {
  RelayProtocolEngine,
  RelayStateManager,
  RelayPersistence,
  RelayBroadcaster,
  RelaySession,
  RelayMessage,
  RelayChannel,
  DEFAULT_RELAY_CHANNELS,
} from '../src/relay/index.js';
import {
  generateKeyPair,
  signMessage,
  bytesToHex,
  ZKRLN,
  Field,
} from '@aetheris/core-crypto';

describe('Unified Relay Protocol Engine & Memory-Bounded Transport (Faza 3)', () => {
  let state: RelayStateManager;
  let persistence: RelayPersistence;
  let messagesStore: Map<string, RelayMessage[]>;
  let revokedStore: Set<string>;
  let sentPackets: Map<string, any[]>;
  let broadcastPackets: any[];
  let broadcaster: RelayBroadcaster;

  beforeEach(() => {
    state = new RelayStateManager({
      maxPresenceCount: 100,
      presenceTtlMs: 500, // 500ms for test
      shareTtlMs: 200,    // 200ms for test
      challengeTtlMs: 200,// 200ms for test
    });

    messagesStore = new Map();
    revokedStore = new Set();
    sentPackets = new Map();
    broadcastPackets = [];

    persistence = {
      getChannels: () => DEFAULT_RELAY_CHANNELS,
      getMessages: (channelId: string) => messagesStore.get(channelId) || [],
      insertMessage: (msg: RelayMessage) => {
        const list = messagesStore.get(msg.channelId) || [];
        list.push(msg);
        messagesStore.set(msg.channelId, list);
      },
      isRevoked: (nullifier: string) => revokedStore.has(nullifier),
      revokeNullifier: (nullifier: string) => {
        revokedStore.add(nullifier);
      },
    };

    broadcaster = {
      send: (session: RelaySession, packet: any) => {
        const list = sentPackets.get(session.id) || [];
        list.push(packet);
        sentPackets.set(session.id, list);
      },
      broadcast: (packet: any, options?: { sender?: RelaySession; channelId?: string; tag?: string }) => {
        broadcastPackets.push({ packet, options });
      },
    };
  });

  function createMockSession(id: string = 'session-1'): RelaySession {
    return {
      id,
      socket: {},
      ip: '127.0.0.1',
      role: 'MEMBER',
      authenticated: false,
      currentChannelId: 'relays-general',
      subscribedChannels: new Set(['relays-general']),
      connectedAt: Date.now(),
      lastSeen: Date.now(),
    };
  }

  describe('1. Challenge-Response Handshake Flow', () => {
    it('executes 2-step Ed25519 challenge-response handshake when required', async () => {
      const engine = new RelayProtocolEngine(state, persistence, broadcaster, {
        requireChallengeHandshake: true,
      });

      const session = createMockSession();
      const userKey = generateKeyPair();

      // Step 1: Client initiates AUTH without signature
      await engine.handlePacket(session, {
        type: 'AUTH',
        fingerprint: userKey.fingerprint,
        publicKeyHex: userKey.publicKeyHex,
        role: 'MEMBER',
      });

      const packetsStep1 = sentPackets.get(session.id) || [];
      expect(packetsStep1.length).toBe(1);
      const challengePacket = packetsStep1[0];
      expect(challengePacket.type).toBe('CHALLENGE');
      expect(typeof challengePacket.challenge).toBe('string');
      expect(challengePacket.challenge.length).toBe(64); // 32 bytes hex
      expect(session.authenticated).toBe(false);

      // Step 2: Client signs challenge and sends AUTH_RESPONSE
      const challengeHex = challengePacket.challenge;
      const signatureBytes = signMessage(challengeHex, userKey.privateKey);
      const signatureHex = bytesToHex(signatureBytes);

      await engine.handlePacket(session, {
        type: 'AUTH_RESPONSE',
        challenge: challengeHex,
        signature: signatureHex,
        fingerprint: userKey.fingerprint,
        publicKeyHex: userKey.publicKeyHex,
      });

      const packetsStep2 = sentPackets.get(session.id) || [];
      expect(packetsStep2.some((p) => p.type === 'AUTH_SUCCESS')).toBe(true);
      expect(packetsStep2.some((p) => p.type === 'CHANNELS_LIST')).toBe(true);
      expect(session.authenticated).toBe(true);
      expect(session.fingerprint).toBe(userKey.fingerprint);

      // Verify challenge cannot be reused (replay protection)
      await engine.handlePacket(session, {
        type: 'AUTH_RESPONSE',
        challenge: challengeHex,
        signature: signatureHex,
        fingerprint: userKey.fingerprint,
        publicKeyHex: userKey.publicKeyHex,
      });

      const lastPacket = packetsStep2[packetsStep2.length - 1];
      expect(lastPacket.type).toBe('ERROR');
      expect(lastPacket.message).toMatch(/expired, invalid, or already consumed/i);
    });

    it('rejects AUTH_RESPONSE with invalid cryptographic signature', async () => {
      const engine = new RelayProtocolEngine(state, persistence, broadcaster, {
        requireChallengeHandshake: true,
      });

      const session = createMockSession();
      const userKey = generateKeyPair();
      const attackerKey = generateKeyPair();

      await engine.handlePacket(session, {
        type: 'AUTH',
        fingerprint: userKey.fingerprint,
        publicKeyHex: userKey.publicKeyHex,
      });

      const challengePacket = sentPackets.get(session.id)![0];
      const wrongSignatureHex = bytesToHex(signMessage(challengePacket.challenge, attackerKey.privateKey));

      await engine.handlePacket(session, {
        type: 'AUTH_RESPONSE',
        challenge: challengePacket.challenge,
        signature: wrongSignatureHex,
        fingerprint: userKey.fingerprint,
        publicKeyHex: userKey.publicKeyHex,
      });

      const packets = sentPackets.get(session.id)!;
      const errorPacket = packets.find((p) => p.type === 'ERROR');
      expect(errorPacket).toBeDefined();
      expect(session.authenticated).toBe(false);
    });
  });

  describe('2. Transparent Backward-Compatible Direct Auth', () => {
    it('authenticates legacy clients directly when requireChallengeHandshake is false', async () => {
      const engine = new RelayProtocolEngine(state, persistence, broadcaster, {
        requireChallengeHandshake: false,
      });

      const session = createMockSession();
      const userKey = generateKeyPair();

      await engine.handlePacket(session, {
        type: 'AUTH',
        fingerprint: userKey.fingerprint,
        publicKeyHex: userKey.publicKeyHex,
        nullifier: 'nullifier-direct-1',
        role: 'MEMBER',
      });

      const packets = sentPackets.get(session.id) || [];
      expect(session.authenticated).toBe(true);
      expect(packets.some((p) => p.type === 'AUTH_SUCCESS')).toBe(true);
      expect(packets.some((p) => p.type === 'CHANNELS_LIST')).toBe(true);
    });
  });

  describe('3. Channel Subscription & Presence Tracking', () => {
    it('handles JOIN, delivers CHANNEL_DATA and broadcasts PEER_JOINED', async () => {
      const engine = new RelayProtocolEngine(state, persistence, broadcaster);
      const session = createMockSession();
      session.authenticated = true;
      session.fingerprint = 'fp-user-joiner';

      await engine.handlePacket(session, {
        type: 'JOIN_CHANNEL',
        channelId: 'relays-dev',
      });

      expect(session.subscribedChannels.has('relays-dev')).toBe(true);

      const packets = sentPackets.get(session.id) || [];
      const channelData = packets.find((p) => p.type === 'CHANNEL_DATA');
      expect(channelData).toBeDefined();
      expect(channelData.channelId).toBe('relays-dev');

      const peerJoined = broadcastPackets.find((b) => b.packet.type === 'PEER_JOINED');
      expect(peerJoined).toBeDefined();
      expect(peerJoined.packet.fingerprint).toBe('fp-user-joiner');
      expect(peerJoined.packet.channelId).toBe('relays-dev');
    });

    it('handles LEAVE and broadcasts PEER_LEFT', async () => {
      const engine = new RelayProtocolEngine(state, persistence, broadcaster);
      const session = createMockSession();
      session.authenticated = true;
      session.fingerprint = 'fp-user-leaver';
      session.subscribedChannels.add('relays-dev');
      state.subscribeToChannel('relays-dev', session);

      await engine.handlePacket(session, {
        type: 'LEAVE',
        channelId: 'relays-dev',
      });

      expect(session.subscribedChannels.has('relays-dev')).toBe(false);
      const peerLeft = broadcastPackets.find((b) => b.packet.type === 'PEER_LEFT');
      expect(peerLeft).toBeDefined();
      expect(peerLeft.packet.fingerprint).toBe('fp-user-leaver');
    });
  });

  describe('4. Messaging & Delivery Acknowledgements', () => {
    it('persists message, returns MESSAGE_ACK to sender, and multicasts NEW_MESSAGE to channel', async () => {
      const engine = new RelayProtocolEngine(state, persistence, broadcaster);
      const session = createMockSession();
      session.authenticated = true;
      session.fingerprint = 'fp-author-1';

      await engine.handlePacket(session, {
        type: 'SEND_MESSAGE',
        channelId: 'relays-general',
        ciphertext: 'cipher_hello_sovereign_matrix',
        epoch: 412,
      });

      const sessionPackets = sentPackets.get(session.id) || [];
      const ack = sessionPackets.find((p) => p.type === 'MESSAGE_ACK');
      expect(ack).toBeDefined();
      expect(ack.status).toBe('delivered');
      expect(ack.channelId).toBe('relays-general');

      const broadcastedMsg = broadcastPackets.find((b) => b.packet.type === 'NEW_MESSAGE');
      expect(broadcastedMsg).toBeDefined();
      expect(broadcastedMsg.packet.message.ciphertext).toBe('cipher_hello_sovereign_matrix');
      expect(broadcastedMsg.packet.message.authorFingerprint).toBe('fp-author-1');
      expect(broadcastedMsg.options.channelId).toBe('relays-general');

      // Verified stored in persistence
      const stored = messagesStore.get('relays-general') || [];
      expect(stored.length).toBe(1);
    });

    it('blocks unauthenticated sessions from sending messages', async () => {
      const engine = new RelayProtocolEngine(state, persistence, broadcaster);
      const unauthSession = createMockSession();

      await engine.handlePacket(unauthSession, {
        type: 'SEND_MESSAGE',
        channelId: 'relays-general',
        ciphertext: 'unauthorized message',
      });

      const packets = sentPackets.get(unauthSession.id) || [];
      const errorPacket = packets.find((p) => p.type === 'ERROR');
      expect(errorPacket).toBeDefined();
      expect(errorPacket.message).toMatch(/Unauthorized/i);
    });
  });

  describe('5. ZK-RLN Slashing & Zero-Secret Dissemination', () => {
    it('detects duplicate shares in single epoch, slashes offender and quarantines with ZERO secret leak', async () => {
      const engine = new RelayProtocolEngine(state, persistence, broadcaster);
      const session = createMockSession();
      session.authenticated = true;
      session.fingerprint = 'fp-spammer-target';

      const userSecret = Field.hashToField('spammer-secret-key-material');
      const nullifier = ZKRLN.computeNullifier(userSecret);
      session.nullifier = nullifier;
      const epoch = 'epoch_zk_test_412';

      // 1. Send legitimate share 1
      const share1 = ZKRLN.createShare(userSecret, epoch, 'Valid Message 1');
      await engine.handlePacket(session, {
        type: 'SEND_MESSAGE',
        channelId: 'relays-general',
        ciphertext: 'payload_1',
        epoch: share1.epoch,
        x: share1.x,
        y: share1.y,
        nullifier: share1.nullifier,
      });

      const packets1 = sentPackets.get(session.id) || [];
      expect(packets1.some((p) => p.type === 'MESSAGE_ACK')).toBe(true);

      // 2. Send duplicate attacking share 2 in SAME epoch
      const share2 = ZKRLN.createShare(userSecret, epoch, 'Attacking Duplicate Message 2');
      await engine.handlePacket(session, {
        type: 'SEND_MESSAGE',
        channelId: 'relays-general',
        ciphertext: 'payload_2',
        epoch: share2.epoch,
        x: share2.x,
        y: share2.y,
        nullifier: share2.nullifier,
      });

      // Offender must receive SLASHING_NOTICE
      const packets2 = sentPackets.get(session.id) || [];
      const slashNotice = packets2.find((p) => p.type === 'SLASHING_NOTICE');
      expect(slashNotice).toBeDefined();
      expect(slashNotice.nullifier).toBe(nullifier);

      // Network must receive QUARANTINE_ALERT
      const quarantineAlert = broadcastPackets.find((b) => b.packet.type === 'QUARANTINE_ALERT');
      expect(quarantineAlert).toBeDefined();
      expect(quarantineAlert.packet.nullifier).toBe(nullifier);

      // CRITICAL SECURITY INVARIANT: ZERO secret keys or polynomial secrets must ever be leaked
      expect(quarantineAlert.packet.extractedSecretKey).toBeUndefined();
      expect(quarantineAlert.packet.secretKey).toBeUndefined();
      expect(slashNotice.extractedSecretKey).toBeUndefined();

      // Nullifier must be permanently revoked in persistence and state
      expect(revokedStore.has(nullifier)).toBe(true);
      expect(state.isRevoked(nullifier)).toBe(true);
    });
  });

  describe('6. Memory Bounding & Sliding-Window Epoch Eviction', () => {
    it('evicts expired shares after shareTtlMs elapses', async () => {
      const userSecret = Field.hashToField('ephemeral-user-secret');
      const share = ZKRLN.createShare(userSecret, 'epoch_eviction_1', 'Message for eviction');

      state.recordShareAndCheckViolation(share);
      expect(state.getActiveSharesCount()).toBe(1);

      // Wait for shareTtlMs (200ms configured in beforeEach) + buffer
      await new Promise((r) => setTimeout(r, 220));

      const pruned = state.cleanExpiredShares();
      expect(pruned).toBe(1);
      expect(state.getActiveSharesCount()).toBe(0);
    });

    it('enforces presence LRU ceiling and evicts oldest entries', () => {
      // Max presence set to 100 in beforeEach
      for (let i = 0; i < 110; i++) {
        state.updatePresence({
          fingerprint: `fp-user-${i}`,
          role: 'MEMBER',
          status: 'online',
          joinedChannel: 'relays-general',
          subscribedChannels: ['relays-general'],
          lastSeen: Date.now() + i, // ascending timestamps
          connectedAt: Date.now(),
        });
      }

      // Must be capped at 100
      expect(state.getPresence().length).toBe(100);
      // Oldest entry (fp-user-0) must have been evicted
      expect(state.getPresence().some((u) => u.fingerprint === 'fp-user-0')).toBe(false);
      // Newest entry (fp-user-109) must be retained
      expect(state.getPresence().some((u) => u.fingerprint === 'fp-user-109')).toBe(true);
    });

    it('evicts expired single-use challenges after challengeTtlMs', async () => {
      const challengeObj = state.createChallenge('fp-user-challenge');
      expect(state.getStats().pendingChallengesCount).toBe(1);

      // Wait for challengeTtlMs (200ms) + buffer
      await new Promise((r) => setTimeout(r, 220));

      const pruned = state.cleanExpiredChallenges();
      expect(pruned).toBe(1);
      expect(state.getStats().pendingChallengesCount).toBe(0);
    });
  });

  describe('7. Heartbeat & Signaling Routing', () => {
    it('responds to PING with PONG and timestamp', async () => {
      const engine = new RelayProtocolEngine(state, persistence, broadcaster);
      const session = createMockSession();

      await engine.handlePacket(session, {
        type: 'PING',
        timestamp: 123456789,
      });

      const packets = sentPackets.get(session.id) || [];
      const pong = packets.find((p) => p.type === 'PONG');
      expect(pong).toBeDefined();
      expect(pong.timestamp).toBe(123456789);
    });

    it('routes WEBRTC_SIGNAL to targeted peer session', async () => {
      const engine = new RelayProtocolEngine(state, persistence, broadcaster);
      const session = createMockSession('session-initiator');
      session.fingerprint = 'fp-initiator';

      await engine.handlePacket(session, {
        type: 'WEBRTC_SIGNAL',
        targetFingerprint: 'fp-remote-peer',
        signal: { type: 'offer', sdp: 'v=0...' },
      });

      const signalBroadcast = broadcastPackets.find((b) => b.packet.type === 'WEBRTC_SIGNAL');
      expect(signalBroadcast).toBeDefined();
      expect(signalBroadcast.packet.fromFingerprint).toBe('fp-initiator');
      expect(signalBroadcast.packet.signal.type).toBe('offer');
      expect(signalBroadcast.options.tag).toBe('peer:fp-remote-peer');
    });
  });
});
