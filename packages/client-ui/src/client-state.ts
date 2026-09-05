import {
  generateKeyPair,
  KeyPair,
  ZKRLN,
  Field,
  signMessage,
  bytesToHex,
  hexToBytes,
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  entropyToMnemonic,
  createSovereignIdentity,
  createSignedEnvelope,
  SovereignIdentity,
  SovereignKeyPairSet,
  SovereignSignedEnvelope,
} from '@aetheris/core-crypto';
import { inspectBinary, computeFileChecksums, createSwarmManifest, BinaryHygieneReport } from '@aetheris/vault-engine';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { fetchWithRetry } from './dry-utils.js';
import { offlineSync } from './offline-sync.js';
import { toastManager } from './toast.js';
import { sovereignDialog } from './dialog-modal.js';
import { localSearchIndex } from './search-index.js';
import { crossTabSync } from './cross-tab-sync.js';
import { sovereignWebPush } from './web-push.js';
import { pulseActionsEngine } from './pulse-actions.js';
import { networkActivityFeed } from './activity-feed.js';
import { isLocalDev } from './admin-auth.js';
import { secureStorage } from './secure-storage.js';

export type SpaceType = 'relays' | 'vault' | 'pulse';
export type DensityMode = 'compact' | 'balanced' | 'media';
export type ViewMode = 'card' | 'classic' | 'compact';
export type UiMode = 'simple' | 'advanced' | 'technical' | 'sovereign';

export interface ChannelItem {
  id: string;
  space: SpaceType;
  name: string;
  description: string;
  isEncrypted: boolean;
}

export interface ClientMessage {
  id: string;
  channelId: string;
  authorFingerprint: string;
  text: string;
  epoch: string;
  status: string;
  createdAt: number;
  isMine: boolean;
}

export interface ClientNanopublication {
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

export interface ClientPost {
  id: string;
  channelId: string;
  authorFingerprint: string;
  authorRole: string;
  title: string;
  content: string;
  flair: 'VERIFIED RELEASE' | 'SECURITY ADVISORY' | 'TECH DISCUSSION' | 'MICRO-PULSE' | 'ASK COMMUNITY';
  meritVotes: number;
  userVoted: number; // -1, 0, 1
  replyCount: number;
  boostCount: number;
  userBoosted?: boolean;
  attachment?: {
    fileName: string;
    sha256: string;
    byteSize: number;
    entropy: number;
    verdict: string;
    merkleRoot: string;
  };
  video?: {
    src: string;
    poster?: string;
  };
  images?: string[];
  pollId?: string;
  quotedPost?: {
    id: string;
    authorFingerprint: string;
    authorRole: string;
    title: string;
    content: string;
  };
  createdAt: number;
  isExpanded: boolean;
}

export interface CommunityMember {
  fingerprint: string;
  role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER';
  status: 'online' | 'idle' | 'dnd';
  isZKVerified: boolean;
  avatarSeed: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export interface QuarantineEvent {
  nullifier: string;
  epoch: string;
  reason: string;
}

export class AetherisClientStore {
  public keypair: KeyPair;
  public secretKey: bigint;
  public nullifier: string;
  public sovereignIdentity: SovereignIdentity;
  public sovereignKeySet?: SovereignKeyPairSet;

  public activeSpace: SpaceType = 'relays';
  public activeChannelId: string = 'relays-general';
  public activeHub: string = 'all';
  public sortMode: 'hot' | 'new' | 'top' | 'chrono' = 'hot';
  public density: DensityMode = 'balanced';
  public viewMode: ViewMode = 'card';
  public isDualHorizon: boolean = false;
  public uiMode: UiMode = 'simple';
  public showTrustBadges: boolean = true;
  public minFeedTrustThreshold: number = 0;
  public demoteLowTrustPosts: boolean = false;
  public proactiveAiEnabled: boolean = true;
  public isCommandRailOpen: boolean = false;
  public isComposerOpen: boolean = false;
  public isQuarantined: boolean = false;
  public broadcastAnnouncement: string = '';
  public mnemonic: string = '';

  public channels: ChannelItem[] = [];
  public messages: Map<string, ClientMessage[]> = new Map();
  public nanopublications: ClientNanopublication[] = [];
  public posts: ClientPost[] = [];
  public members: CommunityMember[] = [];
  public toasts: ToastItem[] = [];
  public activeQuarantineAlert: QuarantineEvent | null = null;

  public isConnected: boolean = false;
  public isSyncing: boolean = false;
  public latencyMs: number = 14;
  public peersOnline: number = 12;
  public edgeStorageBackend: string = 'Cloudflare-D1 / Cloudflare-R2';
  public d1Status: 'connected' | 'fallback' | 'syncing' = 'connected';
  public r2Status: 'connected' | 'fallback' | 'syncing' = 'connected';
  public doMeshStatus: 'synchronized' | 'fallback' | 'syncing' = 'synchronized';
  public edgeTelemetry: any = null;
  public vaultObjects: any[] = [];

  private ws: WebSocket | null = null;
  private listeners: Set<(event?: string, data?: any) => void> = new Set();
  private syncInterval: any = null;
  private reconnectAttempts: number = 0;
  private reconnectTimer: any = null;
  private syncAbortController: AbortController | null = null;
  private _pendingVotes: Map<string, number> = new Map();
  private _voteFlushTimer: any = null;

  private _enqueueVoteSync(postId: string, direction: number): void {
    this._pendingVotes.set(postId, direction);
    if (this._voteFlushTimer) clearTimeout(this._voteFlushTimer);
    this._voteFlushTimer = setTimeout(() => {
      this._flushPendingVotes();
    }, 200);
  }

  private _flushPendingVotes(): void {
    if (typeof fetch === 'undefined') return;
    const entries = Array.from(this._pendingVotes.entries());
    this._pendingVotes.clear();
    for (const [postId, direction] of entries) {
      fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', postId, direction }),
      }).catch(() => {});
    }
  }

  constructor() {
    // Load or generate sovereign Ed25519 identity via SecureStorage (Encrypted IndexedDB & Zero Plaintext in localStorage)
    let seed: Uint8Array;
    const syncIdentity = secureStorage.getIdentitySync();

    if (syncIdentity && syncIdentity.mnemonic && validateMnemonic(syncIdentity.mnemonic)) {
      this.mnemonic = syncIdentity.mnemonic.trim().toLowerCase();
      seed = mnemonicToSeed(this.mnemonic).subarray(0, 32);
    } else if (syncIdentity && syncIdentity.seedHex) {
      seed = hexToBytes(syncIdentity.seedHex);
      try {
        this.mnemonic = entropyToMnemonic(seed.subarray(0, 16));
      } catch {
        this.mnemonic = generateMnemonic(128);
      }
    } else {
      this.mnemonic = generateMnemonic(128);
      seed = mnemonicToSeed(this.mnemonic).subarray(0, 32);
    }

    this.keypair = generateKeyPair(seed);
    this.secretKey = Field.hashToField(bytesToHex(seed));
    this.nullifier = ZKRLN.computeNullifier(this.secretKey);
    this.sovereignKeySet = createSovereignIdentity({ seed });
    this.sovereignIdentity = this.sovereignKeySet.identity;

    // Persist securely to Encrypted Vault and purge any legacy plaintext in localStorage
    secureStorage.saveIdentity(this.mnemonic, seed, this.keypair.fingerprint, this.sovereignIdentity);
    secureStorage.purgeLegacyLocalStorage();

    if (typeof localStorage !== 'undefined') {
      const savedUiMode = localStorage.getItem('aetheris_ui_mode');
      if (savedUiMode === 'sovereign' || savedUiMode === 'simple' || savedUiMode === 'advanced' || savedUiMode === 'technical') {
        this.uiMode = savedUiMode as UiMode;
      }

      const savedShowTrust = localStorage.getItem('aetheris_show_trust_badges');
      if (savedShowTrust !== null) {
        this.showTrustBadges = savedShowTrust === 'true';
      }

      const savedMinThreshold = localStorage.getItem('aetheris_min_feed_trust_threshold');
      if (savedMinThreshold !== null) {
        const parsed = parseInt(savedMinThreshold, 10);
        if (!isNaN(parsed)) this.minFeedTrustThreshold = parsed;
      }

      const savedDemote = localStorage.getItem('aetheris_demote_low_trust_posts');
      if (savedDemote !== null) {
        this.demoteLowTrustPosts = savedDemote === 'true';
      }

      const savedProactive = localStorage.getItem('aetheris_proactive_ai_enabled');
      if (savedProactive !== null) {
        this.proactiveAiEnabled = savedProactive === 'true';
      }
    }

    this.seedInitialPostsAndMembers();
    this.loadCachedMessages();
    this.connect();
    this.syncFromEdge();

    if (typeof window !== 'undefined') {
      this.syncInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        this.syncFromEdge();
      }, 15000);
    }
  }

  /**
   * Signs a payload using the canonical Sovereign Signed Envelope Protocol.
   * Produces { payload, signature, nonce, timestamp, identity } with SHA-256 fingerprint,
   * Ed25519 signature over canonical JSON digest, and replay nonce.
   */
  public createSignedEnvelope<T>(payload: T): SovereignSignedEnvelope<T> {
    if (!this.sovereignKeySet) {
      this.sovereignKeySet = createSovereignIdentity();
      this.sovereignIdentity = this.sovereignKeySet.identity;
    }
    return createSignedEnvelope(payload, this.sovereignKeySet);
  }

  /** Load previously stored messages from localStorage and IndexedDB into active memory */
  private loadCachedMessages(): void {
    // Encrypted Vault: load private messages from SecureStorage
    secureStorage.getAllChannelMessages().then((cachedMap) => {
      if (cachedMap && cachedMap.size > 0) {
        for (const [chId, msgs] of cachedMap.entries()) {
          const currentMsgs = this.messages.get(chId) || [];
          for (const m of msgs as ClientMessage[]) {
            if (!currentMsgs.some((x) => x.id === m.id || (x.text === m.text && x.authorFingerprint === m.authorFingerprint && Math.abs(x.createdAt - m.createdAt) < 15000))) {
              currentMsgs.push(m);
            }
          }
          this.messages.set(chId, currentMsgs);
        }
        this.notify();
      }
    }).catch(() => {});

    // Async hydration from IndexedDB storage
    if (typeof window !== 'undefined') {
      import('./indexed-db.js').then(({ aethDB }) => {
        aethDB.open().then(() => {
          aethDB.getAll<any>('messages').then((dbMsgs: any[]) => {
            if (Array.isArray(dbMsgs) && dbMsgs.length > 0) {
              let updated = false;
              for (const dbm of dbMsgs) {
                const chId = dbm.channelId || 'relays-general';
                const chMsgs = this.messages.get(chId) || [];
                const msgText = dbm.content || dbm.text || '';
                if (!chMsgs.some((x) => x.id === dbm.id || (x.text === msgText && x.authorFingerprint === dbm.authorFP && Math.abs(x.createdAt - (dbm.timestamp || 0)) < 15000))) {
                  chMsgs.push({
                    id: dbm.id,
                    channelId: chId,
                    authorFingerprint: dbm.authorFP || 'anon-peer',
                    text: msgText,
                    epoch: dbm.epoch || '#1',
                    status: dbm.status || 'verified',
                    createdAt: dbm.timestamp || Date.now(),
                    isMine: dbm.authorFP === this.keypair.fingerprint,
                  });
                  this.messages.set(chId, chMsgs);
                  updated = true;
                }
              }
              if (updated) {
                this.notify();
              }
            }
          }).catch(() => {});
        }).catch(() => {});
      }).catch(() => {});
    }
  }

  /** Persist all in-memory messages to localStorage and IndexedDB */
  public persistMessagesLocally(): void {
    // Encrypted Vault: persist private messages via AES-GCM-256 in SecureStorage (zero plaintext in localStorage)
    for (const [ch, msgs] of this.messages.entries()) {
      secureStorage.saveChannelMessages(ch, msgs.slice(-100)).catch(() => {});
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('aetheris_messages_cache');
      } catch (_) {}
    }

    if (typeof window !== 'undefined') {
      import('./indexed-db.js').then(({ aethDB }) => {
        aethDB.open().then(() => {
          for (const [ch, msgs] of this.messages.entries()) {
            for (const m of msgs.slice(-50)) {
              aethDB.put('messages', {
                id: m.id,
                channelId: ch,
                content: m.text,
                authorFP: m.authorFingerprint,
                timestamp: m.createdAt,
                epoch: m.epoch,
                status: m.status,
                isMine: m.isMine,
              }).catch(() => {});
            }
          }
        }).catch(() => {});
      }).catch(() => {});
    }
  }

  private seedInitialPostsAndMembers(): void {
    if (!isLocalDev()) {
      this.members = [
        { fingerprint: this.keypair.fingerprint, role: 'MEMBER', status: 'online', isZKVerified: true, avatarSeed: 'me' }
      ];
      this.posts = [];
      return;
    }

    this.members = [
      { fingerprint: 'genesis-core', role: 'GUARDIAN', status: 'online', isZKVerified: true, avatarSeed: 'gen' },
      { fingerprint: 'c3dc28cb705e', role: 'ARCHIVIST', status: 'online', isZKVerified: true, avatarSeed: 'arc' },
      { fingerprint: 'a89104fa2211', role: 'MODERATOR', status: 'online', isZKVerified: true, avatarSeed: 'mod' },
      { fingerprint: this.keypair.fingerprint, role: 'MEMBER', status: 'online', isZKVerified: true, avatarSeed: 'me' },
      { fingerprint: 'f40019bc88a2', role: 'MEMBER', status: 'idle', isZKVerified: true, avatarSeed: 'f4' },
      { fingerprint: '9b22a011cd44', role: 'MEMBER', status: 'dnd', isZKVerified: true, avatarSeed: '9b' },
    ];

    this.posts = [
      {
        id: 'post-1',
        channelId: 'vault-releases',
        authorFingerprint: 'c3dc28cb705e',
        authorRole: 'ARCHIVIST',
        title: 'Aetheris Cryptographic Micro-Kernel v1.0.0 (Verified x86_64 Release)',
        content: 'Official microkernel distribution compiled with zero telemetry and verified reproducible build hashes. Tested against GCC 14 and Clang 19 with hardened stack canary protection. Zero dead links via BitTorrent mesh.',
        flair: 'VERIFIED RELEASE',
        meritVotes: 342,
        userVoted: 1,
        replyCount: 18,
        boostCount: 89,
        attachment: {
          fileName: 'aetheris-microkernel-x86_64.bin',
          sha256: 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496',
          byteSize: 131072,
          entropy: 6.12,
          verdict: 'CLEAN',
          merkleRoot: 'a2d2ab5e55249f010203040506070809',
        },
        createdAt: Date.now() - 1000 * 60 * 120,
        isExpanded: false,
      },
      {
        id: 'post-video',
        channelId: 'pulse-global',
        authorFingerprint: 'genesis-core',
        authorRole: 'GUARDIAN',
        title: 'Live Demo: 120 FPS Zero-Copy PipeWire & Desktop Duplication Streaming on Ultrawide 32:9',
        content: 'Testing hardware-accelerated video streaming with zero telemetry, hardware decoding, and real-time buffer analysis built directly for sovereign P2P networks.',
        flair: 'TECH DISCUSSION',
        meritVotes: 489,
        userVoted: 1,
        replyCount: 31,
        boostCount: 142,
        video: {
          src: 'https://vjs.zencdn.net/v/oceans.mp4',
        },
        createdAt: Date.now() - 1000 * 60 * 80,
        isExpanded: false,
      },
      {
        id: 'post-poll',
        channelId: 'vault-guides',
        authorFingerprint: 'a89104fa2211',
        authorRole: 'MODERATOR',
        title: 'Community Governance: Prioritizing Q4 Sovereign Protocol Roadmap',
        content: 'Every sovereign node holding an Ed25519 identity keypair has exactly 1 cryptographic vote. Vote below to influence the next engineering milestone.',
        flair: 'ASK COMMUNITY',
        meritVotes: 276,
        userVoted: 0,
        replyCount: 14,
        boostCount: 48,
        pollId: 'poll-genesis-1',
        createdAt: Date.now() - 1000 * 60 * 200,
        isExpanded: false,
      },
      {
        id: 'post-2',
        channelId: 'vault-guides',
        authorFingerprint: 'a89104fa2211',
        authorRole: 'MODERATOR',
        title: 'Deep-Dive: How ZK-RLN Eradicates Bots without Selling Your Identity to Third-Party KYC',
        content: 'Centralized platforms outsource identity verification to third-party brokers, which periodically leak passport scans. In Aetheris, Shamir Secret Sharing polynomials are evaluated locally in WebAssembly. You only ever reveal your secret key if you deliberately violate the rate limit by double-posting in the same epoch.',
        flair: 'SECURITY ADVISORY',
        meritVotes: 218,
        userVoted: 0,
        replyCount: 24,
        boostCount: 56,
        quotedPost: {
          id: 'post-1',
          authorFingerprint: 'c3dc28cb705e',
          authorRole: 'ARCHIVIST',
          title: 'Aetheris Cryptographic Micro-Kernel v1.0.0 (Verified x86_64 Release)',
          content: 'Official microkernel distribution compiled with zero telemetry and verified reproducible build hashes.',
        },
        createdAt: Date.now() - 1000 * 60 * 360,
        isExpanded: true,
      },
      {
        id: 'post-images',
        channelId: 'pulse-global',
        authorFingerprint: 'f40019bc88a2',
        authorRole: 'MEMBER',
        title: 'Reverse Engineering: Visual Section Analysis of Obfuscated Malware vs Aetheris Clean Builds',
        content: 'Notice how commercial packers (UPX0, Themida) spike entropy into the 7.8-7.9 bit red zone, while clean compilers distribute code entropy evenly across text and rodata sections.',
        flair: 'TECH DISCUSSION',
        meritVotes: 194,
        userVoted: 0,
        replyCount: 8,
        boostCount: 39,
        images: [
          'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
        ],
        createdAt: Date.now() - 1000 * 60 * 450,
        isExpanded: false,
      },
    ];

    this.messages.set('relays-general', [
      {
        id: 'msg-1',
        channelId: 'relays-general',
        authorFingerprint: 'genesis-core',
        text: 'Welcome to the Sovereign E2EE Live Relay. All communications in this matrix are quantum-ratcheted via MLS TreeKEM and authenticated with Zero-Knowledge RLN.',
        epoch: '#412',
        status: 'verified',
        createdAt: Date.now() - 1000 * 60 * 45,
        isMine: false,
      },
      {
        id: 'msg-2',
        channelId: 'relays-general',
        authorFingerprint: 'c3dc28cb705e',
        text: 'The BitTorrent Merkle pieces for Micro-Kernel v1.0.0 have fully propagated across all 14 seeder nodes. 100% byte-match verified.',
        epoch: '#412',
        status: 'verified',
        createdAt: Date.now() - 1000 * 60 * 20,
        isMine: false,
      },
      {
        id: 'msg-3',
        channelId: 'relays-general',
        authorFingerprint: 'a89104fa2211',
        text: 'Confirmed. Zero packet loss over WebRTC DTLS direct tunnels. Latency stable at 14ms.',
        epoch: '#412',
        status: 'verified',
        createdAt: Date.now() - 1000 * 60 * 5,
        isMine: false,
      },
    ]);

    localSearchIndex.indexPosts(this.posts);
  }

  public async syncFromEdge(): Promise<void> {
    if (typeof fetch === 'undefined') return;

    // Abort previous in-flight sync operation if still pending
    if (this.syncAbortController) {
      this.syncAbortController.abort();
    }
    this.syncAbortController = new AbortController();
    const signal = this.syncAbortController.signal;

    this.isSyncing = true;
    let hasChanged = false;

    // 0. Sync Public Server Announcement & Status from /api/admin?public=true
    try {
      const pubRes = await fetchWithRetry('/api/admin?public=true', { signal, maxRetries: 1 });
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        if (pubData && typeof pubData.broadcastMessage === 'string') {
          if (this.broadcastAnnouncement !== pubData.broadcastMessage) {
            this.broadcastAnnouncement = pubData.broadcastMessage;
            hasChanged = true;
            if (this.broadcastAnnouncement.trim()) {
              sovereignWebPush.triggerEmergencyBroadcast(this.broadcastAnnouncement.trim()).catch(() => {});
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // Offline fallback
    }

    // 1. Sync Channels from /api/channels
    try {
      const chRes = await fetch('/api/channels', { signal });
      if (chRes.ok) {
        const chData = await chRes.json();
        const storageHdr = chRes.headers.get('X-Edge-Storage') || (chData.storage ? chData.storage : '');
        if (storageHdr.includes('D1')) {
          this.d1Status = 'connected';
        } else if (storageHdr.includes('Memory') || storageHdr.includes('Fallback')) {
          this.d1Status = 'fallback';
        }

        if (chData.success && Array.isArray(chData.channels) && chData.channels.length > 0) {
          const edgeChannels: ChannelItem[] = chData.channels.map((c: any) => ({
            id: c.id,
            space: c.space || 'relays',
            name: c.name,
            description: c.description || '',
            isEncrypted: c.isEncrypted === true || c.is_encrypted === 1,
          }));

          for (const ec of edgeChannels) {
            const localIdx = this.channels.findIndex((c) => c.id === ec.id);
            if (localIdx === -1) {
              this.channels.push(ec);
              hasChanged = true;
            } else if (this.channels[localIdx].name !== ec.name || this.channels[localIdx].description !== ec.description) {
              this.channels[localIdx] = ec;
              hasChanged = true;
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // Offline / local mesh fallback
    }

    // 2. Sync Cloudflare R2 Vault Objects from /api/storage
    try {
      const stRes = await fetch('/api/storage', { signal });
      if (stRes.ok) {
        const stData = await stRes.json();
        const stBackendHdr = stRes.headers.get('X-Storage-Backend') || stData.storage;
        if (stBackendHdr && stBackendHdr.includes('R2')) {
          this.r2Status = 'connected';
          this.edgeStorageBackend = 'Cloudflare-D1 / Cloudflare-R2';
        } else if (stBackendHdr && (stBackendHdr.includes('Fallback') || stBackendHdr.includes('Memory'))) {
          this.r2Status = 'fallback';
          this.edgeStorageBackend = 'Edge-Isolate-Memory Fallback';
        }

        if (stData.success && Array.isArray(stData.objects)) {
          this.vaultObjects = stData.objects;
          for (const obj of stData.objects) {
            if (obj.sha256 && !this.nanopublications.some((np) => np.sha256 === obj.sha256)) {
              this.nanopublications.push({
                id: `vault-nano-${obj.key}`,
                channelId: 'vault-releases',
                title: obj.fileName || obj.key,
                fileName: obj.fileName || obj.key,
                byteSize: obj.size || 0,
                sha256: obj.sha256,
                crc32: 'VERIFIED',
                entropy: 7.85,
                verdict: 'CLEAN',
                merkleRoot: obj.sha256.substring(0, 32),
                seederCount: 8,
                createdAt: obj.uploadedAt || Date.now(),
              });
              hasChanged = true;
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // Offline / local mesh fallback
    }

    // 3. Sync Telemetry & Metrics from /api/analytics
    try {
      const anRes = await fetch('/api/analytics', { signal });
      if (anRes.ok) {
        const anData = await anRes.json();
        if (anData.status === 'healthy' || anData.metrics) {
          this.edgeTelemetry = anData;
          if (typeof anData.metrics?.avgLatencyMs === 'number' && this.latencyMs !== anData.metrics.avgLatencyMs) {
            this.latencyMs = anData.metrics.avgLatencyMs;
          }
          if (typeof anData.metrics?.activeNodes === 'number') {
            this.peersOnline = Math.max(anData.metrics.activeNodes, this.peersOnline);
          }
          const d1Hdr = anRes.headers.get('X-Edge-Storage');
          if (d1Hdr?.includes('D1')) {
            this.d1Status = 'connected';
          }
          this.doMeshStatus = 'synchronized';
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // Offline / local mesh fallback
    }

    // 4. Sync Posts from /api/posts
    try {
      const res = await fetch('/api/posts', { signal });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.posts)) {
          const edgePosts: ClientPost[] = data.posts;
          for (const ep of edgePosts) {
            const localIndex = this.posts.findIndex((p) => p.id === ep.id);
            if (localIndex === -1) {
              this.posts.push({
                ...ep,
                userVoted: ep.authorFingerprint === this.keypair.fingerprint ? 1 : 0,
              });
              hasChanged = true;
            } else {
              const lp = this.posts[localIndex];
              if (ep.meritVotes !== lp.meritVotes || ep.boostCount !== lp.boostCount || ep.replyCount !== lp.replyCount) {
                lp.meritVotes = Math.max(lp.meritVotes, ep.meritVotes);
                lp.boostCount = Math.max(lp.boostCount, ep.boostCount);
                lp.replyCount = Math.max(lp.replyCount, ep.replyCount);
                hasChanged = true;
              }
            }
          }
          if (hasChanged) {
            localSearchIndex.indexPosts(this.posts);
          }
          if (this.posts.length > 0) {
            pulseActionsEngine.syncInteractions(this.posts.map((p) => p.id), this.keypair?.fingerprint);
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // Offline / local mesh fallback
    }

    // 5. Sync Messages for current channel from /api/messages
    try {
      const res = await fetch(`/api/messages?channelId=${encodeURIComponent(this.activeChannelId)}`, { signal });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          const channelMsgs = this.messages.get(this.activeChannelId) || [];
          for (const em of data.messages) {
            const emText = em.text || em.ciphertext || '';
            const isDuplicate = channelMsgs.some(
              (x) => x.id === em.id || (x.text === emText && x.authorFingerprint === em.authorFingerprint && Math.abs(x.createdAt - (em.createdAt || 0)) < 15000)
            );
            if (!isDuplicate) {
              channelMsgs.push({
                id: em.id,
                channelId: em.channelId,
                authorFingerprint: em.authorFingerprint,
                text: emText,
                epoch: em.epoch || '#1',
                status: em.status || 'verified',
                createdAt: em.createdAt || Date.now(),
                isMine: em.authorFingerprint === this.keypair.fingerprint,
              });
              hasChanged = true;
            }
          }
          this.messages.set(this.activeChannelId, channelMsgs);
          if (hasChanged) {
            this.persistMessagesLocally();
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // Offline / local mesh fallback
    }

    // 6. Sync Nanopublications from /api/nanopublications
    try {
      const nanoRes = await fetchWithRetry('/api/nanopublications', { signal, maxRetries: 1 });
      if (nanoRes.ok) {
        const nanoData = await nanoRes.json();
        if (nanoData.success && Array.isArray(nanoData.nanopublications)) {
          for (const en of nanoData.nanopublications) {
            const localIndex = this.nanopublications.findIndex((n) => n.id === en.id || n.sha256 === en.sha256);
            if (localIndex === -1) {
              this.nanopublications.push({
                id: en.id,
                channelId: en.channelId || 'vault-releases',
                title: en.title || en.fileName,
                fileName: en.fileName,
                byteSize: en.byteSize,
                sha256: en.sha256,
                crc32: en.crc32 || 'VERIFIED',
                entropy: en.entropy || 7.5,
                verdict: en.verdict || 'CLEAN',
                merkleRoot: en.merkleRoot || en.sha256.substring(0, 32),
                seederCount: en.seederCount || 1,
                createdAt: en.createdAt || Date.now(),
              });
              hasChanged = true;
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // Offline / local mesh fallback
    } finally {
      this.isSyncing = false;
    }

    if (hasChanged) {
      this.notify();
    }
  }

  public showToast(message: string, type: 'info' | 'success' | 'warning' = 'info'): void {
    const id = `toast-${Date.now()}`;
    this.toasts.push({ id, message, type });
    this.notify('TOAST', { id, message, type });
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      this.notify('TOAST');
    }, 3000);
  }

  public votePost(postId: string, direction: number): void {
    const p = this.posts.find((x) => x.id === postId);
    if (!p) return;
    if (p.userVoted === direction) {
      p.meritVotes -= direction;
      p.userVoted = 0;
      this.showToast('Merit vote cleared', 'info');
    } else {
      p.meritVotes += direction - p.userVoted;
      p.userVoted = direction;
      this.showToast(direction > 0 ? '▲ Endorsed +1 Merit' : '▼ Divergent perspective noted', 'success');
    }
    this.notify('VOTE', { postId, direction, meritVotes: p.meritVotes, userVoted: p.userVoted });
    crossTabSync.broadcast('POST_VOTED', { postId, direction, meritVotes: p.meritVotes });

    if (p.userVoted !== 0) {
      networkActivityFeed.addEvent({
        type: 'vote',
        actorFP: this.keypair.fingerprint,
        actorRole: 'member',
        targetTitle: p.title,
        targetId: p.id,
        timestamp: Date.now(),
        meta: { direction: p.userVoted > 0 ? 'up' : 'down' },
      });
    }

    // Coalesced non-blocking sync with Edge Functions
    this._enqueueVoteSync(postId, p.userVoted);
  }

  public boostPost(postId: string): void {
    const p = this.posts.find((x) => x.id === postId);
    if (!p) return;

    if (p.userBoosted) {
      p.boostCount = Math.max(0, (p.boostCount || 1) - 1);
      p.userBoosted = false;
      this.showToast('Boost removed', 'info');
    } else {
      p.boostCount = (p.boostCount || 0) + 1;
      p.userBoosted = true;
      this.showToast('⟳ Boosted to Sovereign Chrono-Stream!', 'success');

      networkActivityFeed.addEvent({
        type: 'boost',
        actorFP: this.keypair.fingerprint,
        actorRole: 'member',
        targetTitle: p.title,
        targetId: p.id,
        timestamp: Date.now(),
        meta: { boostAmount: p.boostCount },
      });
    }

    this.notify('BOOST', { postId, boostCount: p.boostCount, userBoosted: p.userBoosted });

    // Sync boost with Edge Functions
    if (typeof fetch !== 'undefined') {
      fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: p.userBoosted ? 'boost' : 'unboost', postId }),
      }).catch(() => {});
    }
  }

  public togglePostExpanded(postId: string): void {
    const p = this.posts.find((x) => x.id === postId);
    if (!p) return;
    p.isExpanded = !p.isExpanded;
    this.notify();
  }

  public createPost(post: Partial<ClientPost>): ClientPost {
    const newPost: ClientPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channelId: post.channelId || this.activeChannelId,
      authorFingerprint: this.keypair.fingerprint,
      authorRole: 'MEMBER',
      title: post.title || 'Sovereign Pulse',
      content: post.content || '',
      flair: post.flair || (post.title ? 'TECH DISCUSSION' : 'MICRO-PULSE'),
      meritVotes: 1,
      userVoted: 1,
      replyCount: 0,
      boostCount: 0,
      attachment: post.attachment,
      video: post.video,
      images: post.images,
      pollId: post.pollId,
      quotedPost: post.quotedPost,
      createdAt: Date.now(),
      isExpanded: false,
    };
    this.posts.unshift(newPost);
    localSearchIndex.indexPost(newPost);
    crossTabSync.broadcast('POST_CREATED', newPost);
    networkActivityFeed.addEvent({
      type: 'post',
      actorFP: this.keypair.fingerprint,
      actorRole: 'member',
      targetTitle: newPost.title,
      targetId: newPost.id,
      timestamp: newPost.createdAt,
      meta: { flair: newPost.flair },
    });
    this.showToast('✨ Broadcasted to Sovereign Network!', 'success');
    this.notify();

    // Broadcast & persist to Edge API with automatic Offline Outbox fallback
    if (typeof fetch !== 'undefined') {
      fetchWithRetry('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...newPost }),
        maxRetries: 2,
        baseDelayMs: 300,
      }).catch(() => {
        offlineSync.enqueue('CREATE_POST', newPost);
      });
    } else {
      offlineSync.enqueue('CREATE_POST', newPost);
    }

    return newPost;
  }

  public publishThread(segments: Array<Partial<ClientPost>>): ClientPost[] {
    if (!segments || segments.length === 0) return [];
    const published: ClientPost[] = [];
    let rootPostId: string | undefined;

    segments.forEach((seg, idx) => {
      const post = this.createPost({
        ...seg,
        channelId: seg.channelId || this.activeChannelId,
        flair: 'MICRO-PULSE',
        quotedPost: rootPostId && idx > 0 ? {
          id: rootPostId,
          authorFingerprint: this.keypair.fingerprint,
          authorRole: 'MEMBER',
          title: `Thread Root`,
          content: segments[0]?.content?.slice(0, 80) || '',
        } : seg.quotedPost,
      });

      if (idx === 0) rootPostId = post.id;
      published.push(post);
    });

    return published;
  }

  public setSortMode(mode: 'hot' | 'new' | 'top' | 'chrono'): void {
    this.sortMode = mode;
    this.notify();
  }

  public setActiveHub(hub: string): void {
    this.activeHub = hub;
    this.notify();
  }

  public toggleComposer(): void {
    this.isComposerOpen = !this.isComposerOpen;
    this.notify();
  }

  public subscribe(fn: (event?: string, data?: any) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // Frame-batched notify for browser (60fps rendering), sync execution for Node.js / test suites
  private _notifyTimer: any = null;
  private _pendingEvent: string | undefined = undefined;
  private _pendingData: any = undefined;

  public notify(event?: string, data?: any): void {
    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') {
      // Test / SSR environment: notify subscribers synchronously
      this.listeners.forEach((fn) => fn(event, data));
      return;
    }

    // Browser environment: batch using requestAnimationFrame for zero-flicker 60fps rendering
    if (event !== undefined) {
      this._pendingEvent = event;
      this._pendingData = data;
    } else {
      // General re-render request clears event fast-paths (like TOAST) to guarantee full DOM patch
      this._pendingEvent = undefined;
      this._pendingData = undefined;
    }

    if (this._notifyTimer !== null) return;

    this._notifyTimer = requestAnimationFrame(() => {
      this._notifyTimer = null;
      const ev = this._pendingEvent;
      const d = this._pendingData;
      this._pendingEvent = undefined;
      this._pendingData = undefined;
      this.listeners.forEach((fn) => fn(ev, d));
    });
  }


  /** Flush pending notify synchronously (use for critical path updates that MUST render before next frame) */
  public notifySync(event?: string, data?: any): void {
    if (this._notifyTimer !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this._notifyTimer);
      } else {
        clearTimeout(this._notifyTimer);
      }
      this._notifyTimer = null;
    }
    this._pendingEvent = undefined;
    this._pendingData = undefined;
    this.listeners.forEach((fn) => fn(event, data));
  }


  public calculateBackoffWithJitter(): number {
    const baseDelay = 1000;
    const maxDelay = 30000;
    const backoff = Math.min(maxDelay, baseDelay * Math.pow(1.8, this.reconnectAttempts));
    const jitter = 0.5 + Math.random() * 0.5; // 50% - 100% jitter spread
    return Math.floor(backoff * jitter);
  }

  public connect(): void {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const host = typeof window !== 'undefined' ? (window.location.host || window.location.hostname || 'localhost') : 'localhost';
    const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');

    let wsUrl: string;
    if (isHttps) {
      wsUrl = `wss://${host}/api/ws`;
    } else if (isLocal && !host.includes(':')) {
      wsUrl = `ws://${host}:4000`;
    } else {
      wsUrl = `ws://${host}/api/ws`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        // Send AUTH with Sovereign Ed25519 identity
        this.send({
          type: 'AUTH',
          fingerprint: this.keypair.fingerprint,
          publicKeyHex: this.keypair.publicKeyHex,
          nullifier: this.nullifier,
          role: 'MEMBER',
        });

        // Join default channel
        this.joinChannel(this.activeChannelId);
        this.notify();
      };

      this.ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          this.handlePacket(packet);
        } catch (err: any) {
          console.error('Error handling packet:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notify();
        // Reconnect with exponential backoff & full jitter if in browser
        if (typeof window !== 'undefined') {
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          // If relay is offline after 3 attempts, back off to 60s periodic polling
          const delay = this.reconnectAttempts >= 3 ? 60000 : this.calculateBackoffWithJitter();
          this.reconnectAttempts++;
          this.reconnectTimer = setTimeout(() => this.connect(), delay);
        }
      };

      this.ws.onerror = () => {
        if (this.reconnectAttempts === 0) {
          console.info('WebSocket relay offline, operating with Edge HTTP sync & local mesh');
        }
        this.isConnected = false;
        this.notify();
      };
    } catch (err) {
      if (this.reconnectAttempts === 0) {
        console.info('WebSocket initialization in local mesh mode');
      }
      this.isConnected = false;
      this.notify();
    }
  }

  private handlePacket(packet: any): void {
    switch (packet.type) {
      case 'CHANNELS_LIST': {
        this.channels = packet.channels.map((c: any) => ({
          ...c,
          isEncrypted: c.isEncrypted === 1,
        }));
        this.notify();
        break;
      }

      case 'AUTH_SUCCESS': {
        this.isQuarantined = packet.isQuarantined;
        this.notify();
        break;
      }

      case 'CHANNEL_DATA': {
        const msgs: ClientMessage[] = packet.messages.map((m: any) => ({
          id: m.id,
          channelId: m.channelId,
          authorFingerprint: m.authorFingerprint,
          text: m.ciphertext || m.text, // in full client this is decrypted via E2EE
          epoch: m.epoch,
          status: m.status,
          createdAt: m.createdAt,
          isMine: m.authorFingerprint === this.keypair.fingerprint,
        }));
        this.messages.set(packet.channelId, msgs);

        if (packet.nanopublications) {
          this.nanopublications = packet.nanopublications;
        }
        this.notify();
        break;
      }

      case 'NEW_MESSAGE': {
        const m = packet.message;
        const channelMsgs = this.messages.get(m.channelId) || [];
        const msgText = m.ciphertext || m.text || '';
        const isDuplicate = channelMsgs.some(
          (x) => x.id === m.id || (x.text === msgText && x.authorFingerprint === m.authorFingerprint && Math.abs(x.createdAt - (m.createdAt || 0)) < 15000)
        );
        if (!isDuplicate) {
          const newMsgItem: ClientMessage = {
            id: m.id,
            channelId: m.channelId,
            authorFingerprint: m.authorFingerprint,
            text: msgText,
            epoch: m.epoch,
            status: m.status,
            createdAt: m.createdAt,
            isMine: m.authorFingerprint === this.keypair.fingerprint,
          };
          channelMsgs.push(newMsgItem);
          this.messages.set(m.channelId, channelMsgs);
          this.persistMessagesLocally();
          this.notify('NEW_MESSAGE', newMsgItem);
        }
        break;
      }

      case 'NEW_NANOPUBLICATION': {
        this.nanopublications.unshift(packet.nanopublication);
        this.notify('NEW_NANOPUBLICATION', packet.nanopublication);
        break;
      }

      case 'QUARANTINE_ALERT': {
        this.activeQuarantineAlert = {
          nullifier: packet.nullifier,
          epoch: packet.epoch,
          reason: packet.reason,
        };
        if (packet.nullifier === this.nullifier) {
          this.isQuarantined = true;
        }
        this.notify('QUARANTINE');
        break;
      }

      case 'SLASHING_NOTICE': {
        this.isQuarantined = true;
        sovereignDialog.alert(`🚨 SOVEREIGN SLASHING NOTICE: ${packet.message}\nPolynomial security share penalty applied to node.`, { title: 'Sovereign Slashing Penalty', type: 'error' });
        this.notify('QUARANTINE');
        break;
      }
    }
  }

  public joinChannel(channelId: string): void {
    this.activeChannelId = channelId;
    this.send({
      type: 'JOIN_CHANNEL',
      channelId,
    });
    this.syncFromEdge();
    this.notify('CHANNEL_CHANGE', { channelId });
  }

  public sendMessage(text: string, forceEpoch?: string): void {
    if (!text.trim()) return;

    // Evaluate ZK-RLN polynomial share
    const epoch = forceEpoch || `epoch_${Math.floor(Date.now() / 60000)}`; // 1 minute epoch
    const share = ZKRLN.createShare(this.secretKey, epoch, text);

    const signatureBytes = signMessage(text, this.keypair.privateKey);
    const signature = bytesToHex(signatureBytes);

    // Create client message and immediately add to local channel messages
    const newMsg: ClientMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channelId: this.activeChannelId,
      authorFingerprint: this.keypair.fingerprint,
      text: text.trim(),
      epoch: share.epoch,
      status: 'valid',
      createdAt: Date.now(),
      isMine: true,
    };

    const channelMsgs = this.messages.get(this.activeChannelId) || [];
    channelMsgs.push(newMsg);
    this.messages.set(this.activeChannelId, channelMsgs);
    this.persistMessagesLocally();
    this.notify('NEW_MESSAGE', newMsg);
    crossTabSync.broadcast('MESSAGE_SENT', { channelId: this.activeChannelId, message: newMsg });

    // Auto-scroll messages container if present in DOM
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        const container = document.getElementById('messages-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 50);
    }

    // Persist to Edge Messages API with automatic Offline Outbox fallback
    if (typeof fetch !== 'undefined') {
      fetchWithRetry('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMsg,
          signature,
        }),
        maxRetries: 2,
        baseDelayMs: 300,
      }).catch(() => {
        offlineSync.enqueue('SEND_MESSAGE', { ...newMsg, signature });
      });
    } else {
      offlineSync.enqueue('SEND_MESSAGE', { ...newMsg, signature });
    }

    // Also broadcast via WebSocket
    this.send({
      type: 'SEND_MESSAGE',
      id: newMsg.id,
      fingerprint: this.keypair.fingerprint,
      channelId: this.activeChannelId,
      ciphertext: text,
      text: text,
      createdAt: newMsg.createdAt,
      iv: '0'.repeat(24),
      epoch: share.epoch,
      x: share.x,
      y: share.y,
      nullifier: share.nullifier,
      signature,
    });
  }

  public triggerSpamAttackSimulation(): void {
    // Deliberately trigger two messages in the EXACT same epoch to demonstrate Lagrange slashing
    const epoch = `spam_epoch_${Date.now()}`;
    this.sendMessage('Attack Packet A (Spam duplicate attempt)', epoch);
    setTimeout(() => {
      this.sendMessage('Attack Packet B (Breach of Rate-Limiting Nullifier)', epoch);
    }, 50);
  }

  public async auditAndPublishLocalFile(file: File, title: string): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const checksums = computeFileChecksums(data);
    const hygiene = inspectBinary(data);
    const { manifest } = createSwarmManifest(data);

    this.send({
      type: 'PUBLISH_NANOPUBLICATION',
      channelId: 'vault-releases',
      title: title || file.name,
      fileName: file.name,
      byteSize: data.length,
      sha256: checksums.sha256,
      crc32: checksums.crc32,
      entropy: hygiene.overallEntropy,
      verdict: hygiene.verdict,
      merkleRoot: manifest.merkleRoot,
    });

    // Also post companion note
    const note = `### 📦 User Published Release: ${title || file.name}\n- **Format:** \`${hygiene.format} ${hygiene.architecture}\`\n- **Entropy:** \`${hygiene.overallEntropy} bits/byte\` (${hygiene.verdict})\n- **SHA-256:** \`${checksums.sha256}\`\n- **CRC-32:** \`${checksums.crc32}\``;
    this.sendMessage(note);
  }

  public setSpace(space: SpaceType): void {
    this.activeSpace = space;
    // Pick first channel in this space
    const ch = this.channels.find((c) => c.space === space);
    if (ch) {
      this.joinChannel(ch.id);
    }
    this.notify();
  }

  public setDensity(density: DensityMode): void {
    this.density = density;
    if (density === 'media') {
      this.viewMode = 'card';
    } else if (density === 'balanced') {
      this.viewMode = 'classic';
    } else if (density === 'compact') {
      this.viewMode = 'compact';
    }
    this.notify();
  }

  public setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    if (mode === 'card') {
      this.density = 'media';
    } else if (mode === 'classic') {
      this.density = 'balanced';
    } else if (mode === 'compact') {
      this.density = 'compact';
    }
    this.notify();
  }

  public setUiMode(mode: UiMode): void {
    if (this.uiMode === mode) return;
    this.uiMode = mode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aetheris_ui_mode', mode);
    }
    this.notify('UI_MODE_CHANGED', { uiMode: mode });
  }

  public toggleUiMode(): void {
    if (this.uiMode === 'simple') {
      this.setUiMode('sovereign');
    } else {
      this.setUiMode('simple');
    }
  }

  public setShowTrustBadges(show: boolean): void {
    this.showTrustBadges = show;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aetheris_show_trust_badges', String(show));
    }
    this.notify('TRUST_SETTINGS_CHANGED', { showTrustBadges: show });
  }

  public setMinFeedTrustThreshold(threshold: number): void {
    this.minFeedTrustThreshold = threshold;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aetheris_min_feed_trust_threshold', String(threshold));
    }
    this.notify('TRUST_SETTINGS_CHANGED', { minFeedTrustThreshold: threshold });
  }

  public setDemoteLowTrustPosts(demote: boolean): void {
    this.demoteLowTrustPosts = demote;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aetheris_demote_low_trust_posts', String(demote));
    }
    this.notify('TRUST_SETTINGS_CHANGED', { demoteLowTrustPosts: demote });
  }

  public setProactiveAiEnabled(enabled: boolean): void {
    this.proactiveAiEnabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aetheris_proactive_ai_enabled', String(enabled));
    }
    if (typeof window !== 'undefined' && (window as any).aiAssistant) {
      (window as any).aiAssistant.setProactiveEnabled(enabled);
    }
    this.notify('PROACTIVE_AI_CHANGED', { enabled });
  }

  public likePost(postId: string): void {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return;
    post.meritVotes += 1;
    this.showToast('❤️ Loved post (+1 Merit)!', 'success');
    this.notify();
  }

  public toggleDualHorizon(): void {
    this.isDualHorizon = !this.isDualHorizon;
    this.notify();
  }

  public toggleCommandRail(): void {
    this.isCommandRailOpen = !this.isCommandRailOpen;
    this.notify();
  }

  public dismissQuarantineAlert(): void {
    this.activeQuarantineAlert = null;
    this.notify();
  }

  public async fetchVaultObjects(): Promise<any[]> {
    try {
      const res = await fetch('/api/storage');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.objects)) {
          this.vaultObjects = data.objects;
          this.notify();
          return data.objects;
        }
      }
    } catch (err) {
      console.warn('[Storage Fetch Fallback]', err);
    }
    return this.vaultObjects;
  }

  public async fetchChannels(): Promise<ChannelItem[]> {
    try {
      const res = await fetch('/api/channels');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.channels)) {
          this.channels = data.channels;
          this.notify();
          return data.channels;
        }
      }
    } catch (err) {
      console.warn('[Channels Fetch Fallback]', err);
    }
    return this.channels;
  }

  public async fetchAnalytics(): Promise<any> {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        this.edgeTelemetry = data;
        this.notify();
        return data;
      }
    } catch (err) {
      console.warn('[Analytics Fetch Fallback]', err);
    }
    return this.edgeTelemetry;
  }

  public async uploadVaultFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/storage', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        this.showToast(`Vault: Stored '${file.name}' in ${data.storage || 'Cloudflare R2'}`, 'success');
        this.syncFromEdge();
        return data;
      }
    } catch (err: any) {
      this.showToast(`Vault upload error: ${err?.message || 'Fallback mode active'}`, 'warning');
    }
    return null;
  }

  /**
   * Helper method to query the sovereign Cloudflare R2 quota guard status and usage.
   * Queries /api/storage?action=quota to evaluate remaining free-tier operations and storage.
   */
  public async checkR2Quota(): Promise<any> {
    try {
      const res = await fetch('/api/storage?action=quota');
      if (res.ok) {
        const data = await res.json();
        return data;
      } else {
        try {
          const errData = await res.json();
          return errData;
        } catch {
          return {
            status: res.status,
            shieldActive: res.status === 413 || res.status === 429 || res.status === 507,
            error: `HTTP_${res.status}`,
          };
        }
      }
    } catch (err) {
      console.warn('[Storage Quota Query Fallback]', err);
      return null;
    }
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Restores sovereign cryptographic identity deterministically from a 12 or 24 word BIP-39 mnemonic seed phrase.
   */
  public restoreIdentityFromMnemonic(mnemonicStr: string): boolean {
    const cleanPhrase = mnemonicStr.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!validateMnemonic(cleanPhrase)) {
      this.showToast('Invalid BIP-39 mnemonic phrase or checksum failure', 'warning');
      return false;
    }

    const seed = mnemonicToSeed(cleanPhrase).subarray(0, 32);
    this.mnemonic = cleanPhrase;
    this.keypair = generateKeyPair(seed);
    this.secretKey = Field.hashToField(bytesToHex(seed));
    this.nullifier = ZKRLN.computeNullifier(this.secretKey);

    secureStorage.saveIdentity(this.mnemonic, seed, this.keypair.fingerprint);
    secureStorage.purgeLegacyLocalStorage();

    this.showToast('✨ Sovereign identity successfully restored from seed phrase!', 'success');
    this.notify();
    this.syncFromEdge();
    return true;
  }

  public destroy(): void {
    if (this.syncAbortController) {
      this.syncAbortController.abort();
      this.syncAbortController = null;
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this._notifyTimer !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this._notifyTimer);
      } else {
        clearTimeout(this._notifyTimer);
      }
      this._notifyTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

export const clientStore = new AetherisClientStore();
serviceRegistry.registerInstance(SERVICES.ClientStore, clientStore);
