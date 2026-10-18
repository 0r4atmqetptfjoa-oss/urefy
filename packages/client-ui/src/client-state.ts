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
import type { BinaryHygieneReport } from '@aetheris/vault-engine';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { fetchWithRetry } from './dry-utils.js';
import { offlineSync } from './offline-sync.js';
import { toastManager } from './toast.js';
import { sovereignDialog } from './dialog-modal.js';
import { localSearchIndex } from './search-index.js';
import { crossTabSync } from './cross-tab-sync.js';
import { sovereignWebPush } from './web-push.js';
import { pulseActionsEngine } from './pulse-actions.js';
import { isLocalDev } from './env-check.js';
import { isDemoModeEnabled } from './demo-mode.js';
import { secureStorage } from './secure-storage.js';
import { aethDB } from './indexed-db.js';

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

export interface DirectMessageAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  sha256?: string;
}

export interface ClientMessage {
  id: string;
  channelId: string;
  authorFingerprint: string;
  text: string;
  ciphertext?: string;
  epoch: string;
  status: string;
  createdAt: number;
  isMine: boolean;
  attachment?: DirectMessageAttachment;
}

export interface ChatMessage extends ClientMessage {
  senderId?: string;
  senderName?: string;
  timestamp?: number;
  replyToText?: string;
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

export interface ClientFacet {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  visibility: 'public' | 'contextual' | 'unlisted';
  isDefault: boolean;
  isPubliclyLinked: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ClientPost {
  deliveryStatus?: 'sending' | 'failed';
  deliveryError?: string;
  status?: 'published' | 'draft' | 'archived' | 'pinned' | 'deleted' | 'tombstone' | 'locked';
  id: string;
  channelId: string;
  authorFingerprint: string;
  authorRole: string;
  authorDisplayName?: string;
  authorHandle?: string;
  authorAvatarUrl?: string;
  title: string;
  content: string;
  flair: 'VERIFIED RELEASE' | 'SECURITY ADVISORY' | 'TECH DISCUSSION' | 'MICRO-PULSE' | 'ASK COMMUNITY';
  meritVotes: number;
  userVoted: number; // -1, 0, 1
  replyCount: number;
  boostCount: number;
  userBoosted?: boolean;
  facetId?: string;
  facetHandle?: string;
  facetDisplayName?: string;
  facetAvatarUrl?: string;
  audience?: 'public' | 'community' | 'followers';
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
  name?: string;
  alias?: string;
  handle?: string;
  avatar?: string;
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

export async function deriveChannelKey(channelId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(`urefy-channel-e2ee-v1:${channelId}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('urefy-relay-salt-v1'),
      iterations: 10000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptChannelMessage(channelId: string, plaintext: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return plaintext;
  const key = await deriveChannelKey(channelId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return `e2ee:v1:${bytesToHex(combined)}`;
}

export async function decryptChannelMessage(channelId: string, payload: string): Promise<string> {
  if (!payload || !payload.startsWith('e2ee:v1:')) {
    return payload; // Compatibilitate cu mesajele vechi
  }
  if (typeof crypto === 'undefined' || !crypto.subtle) return payload;
  try {
    const raw = payload.slice('e2ee:v1:'.length);
    let bytes: Uint8Array;
    if (/^[0-9a-fA-F]+$/.test(raw)) {
      bytes = hexToBytes(raw);
    } else {
      const bin = atob(raw);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    }
    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);
    const key = await deriveChannelKey(channelId);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return '[Mesaj criptat E2EE]';
  }
}

export class AetherisClientStore {
  public keypair: KeyPair;
  public secretKey: bigint;
  public nullifier: string;
  public sovereignIdentity: SovereignIdentity;
  public sovereignKeySet?: SovereignKeyPairSet;
  public identityPersistence: Promise<void>;
  public messagesPersistence: Promise<void> = Promise.resolve();

  public activeSpace: SpaceType = 'relays';
  // The consumer experience opens on content. Messaging, vault and protocol
  // tooling remain available without taking over the first-run surface.
  public activeChannelId: string = 'pulse-global';
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
  public facets: ClientFacet[] = [];
  public activeFacetId: string | null = null;
  public members: CommunityMember[] = [];
  public toasts: ToastItem[] = [];
  public activeQuarantineAlert: QuarantineEvent | null = null;
  public pendingRelayAttachment: DirectMessageAttachment | null = null;

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
      const envelope = this.createSignedEnvelope({ action: 'vote', postId, direction });
      fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
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
      this.mnemonic = '';
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
    this.identityPersistence = secureStorage.saveIdentity(this.mnemonic, seed, this.keypair.fingerprint, this.sovereignIdentity);
    void this.identityPersistence.catch(() => this.showToast('Encrypted identity could not be saved. Keep a recovery backup.', 'warning'));
    void import('./social-safety.js').then(({ socialSafety }) => {
      socialSafety.setActiveFingerprint(this.keypair.fingerprint);
      void socialSafety.syncSafetyLists();
    }).catch(() => {});

    if (typeof localStorage !== 'undefined') {
      const savedUiMode = localStorage.getItem('aetheris_ui_mode');
      if (savedUiMode === 'sovereign' || savedUiMode === 'simple' || savedUiMode === 'advanced' || savedUiMode === 'technical') {
        this.uiMode = savedUiMode as UiMode;
      }

      const savedDensity = localStorage.getItem('aetheris_density_mode');
      if (savedDensity === 'compact' || savedDensity === 'balanced' || savedDensity === 'media') {
        this.density = savedDensity as DensityMode;
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
    if (this.isAuthenticated()) {
      this.connect();
    }
    this.syncFromEdge();

    if (typeof window !== 'undefined') {
      this.syncInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        this.syncFromEdge();
      }, 15000);
    }
  }

  /**
   * Checks whether the current user has a stored identity or completed profile.
   */
  public isAuthenticated(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      return Boolean(
        localStorage.getItem('urefy_identity') ||
        localStorage.getItem('sovereign_identity') ||
        localStorage.getItem('aetheris_onboarding_stage_v2') === 'ONBOARDING_COMPLETE' ||
        (typeof secureStorage !== 'undefined' && secureStorage.getIdentitySync())
      );
    } catch {
      return false;
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
    }
  }

  /** Persist all in-memory messages to localStorage and IndexedDB */
  public persistMessagesLocally(): void {
    // Encrypted Vault: persist private messages via AES-GCM-256 in SecureStorage (zero plaintext in localStorage)
    this.messagesPersistence = Promise.all([...this.messages.entries()].map(([channel, messages]) =>
      secureStorage.saveChannelMessages(channel, messages)
    )).then(() => {});
    void this.messagesPersistence.catch(() => this.showToast('Encrypted message history could not be saved.', 'warning'));
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('aetheris_messages_cache');
      } catch (_) {}
    }

  }

  public loadDemoData(): void {
    this._populateDemoPostsAndMembers();
  }

  public getActiveFacet(): ClientFacet | null {
    if (!this.activeFacetId && this.facets.length > 0) {
      const def = this.facets.find(f => f.isDefault) || this.facets[0];
      return def || null;
    }
    return this.facets.find(f => f.id === this.activeFacetId) || (this.facets[0] || null);
  }

  public setActiveFacet(facetId: string): void {
    const found = this.facets.find(f => f.id === facetId);
    if (found) {
      this.activeFacetId = found.id;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('urefy_active_facet_id', found.id);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-active-facet-id', found.id);
        document.documentElement.setAttribute('data-active-facet-name', found.displayName);
      }
      void import('./feed-personalization.js').then(({ feedPersonalization }) => {
        feedPersonalization.setFacetContext(found.id);
      }).catch(() => {});
      this.showToast(`Switched context to ${found.displayName}`, 'info');
      this.notify('facet:changed', found);
    }
  }

  public async fetchFacets(): Promise<ClientFacet[]> {
    try {
      const res = await fetch(`/api/facets?ownerFingerprint=${encodeURIComponent(this.keypair.fingerprint)}`, {
        headers: {
          'X-User-Fingerprint': this.keypair.fingerprint,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.facets)) {
          this.facets = data.facets;
          const savedActive = typeof localStorage !== 'undefined' ? localStorage.getItem('urefy_active_facet_id') : null;
          if (savedActive && this.facets.some(f => f.id === savedActive)) {
            this.activeFacetId = savedActive;
          } else {
            const def = this.facets.find(f => f.isDefault) || this.facets[0];
            this.activeFacetId = def?.id || null;
          }
          void import('./feed-personalization.js').then(({ feedPersonalization }) => {
            feedPersonalization.setFacetContext(this.activeFacetId);
          }).catch(() => {});
          this.notify('facets:updated', this.facets);
          return this.facets;
        }
      }
    } catch {}
    return this.facets;
  }

  private seedInitialPostsAndMembers(): void {
    if (!isDemoModeEnabled() || !isLocalDev()) {
      this.members = [
        { fingerprint: this.keypair.fingerprint, role: 'MEMBER', status: 'online', isZKVerified: true, avatarSeed: 'me' }
      ];
      this.posts = [];
      return;
    }

    this._populateDemoPostsAndMembers();
  }

  private _populateDemoPostsAndMembers(): void {
    this.members = [
      { fingerprint: 'genesis-core', role: 'GUARDIAN', status: 'online', isZKVerified: true, avatarSeed: 'gen', name: 'Alex Rivera', alias: 'Alex Rivera', handle: '@alex_r' },
      { fingerprint: 'c3dc28cb705e', role: 'ARCHIVIST', status: 'online', isZKVerified: true, avatarSeed: 'arc', name: 'Elena Rostova', alias: 'Elena Rostova', handle: '@elena_r' },
      { fingerprint: 'a89104fa2211', role: 'MODERATOR', status: 'online', isZKVerified: true, avatarSeed: 'mod', name: 'David Chen', alias: 'David Chen', handle: '@david_c' },
      { fingerprint: this.keypair.fingerprint, role: 'MEMBER', status: 'online', isZKVerified: true, avatarSeed: 'me', name: 'You', alias: 'You', handle: '@you' },
      { fingerprint: 'f40019bc88a2', role: 'MEMBER', status: 'idle', isZKVerified: true, avatarSeed: 'f4', name: 'Maya Patel', alias: 'Maya Patel', handle: '@maya_p' },
      { fingerprint: '9b22a011cd44', role: 'MEMBER', status: 'dnd', isZKVerified: true, avatarSeed: '9b', name: 'Samira Khan', alias: 'Samira Khan', handle: '@samira' },
    ];

    this.posts = [
      {
        id: 'post-1',
        channelId: 'vault-releases',
        authorFingerprint: 'c3dc28cb705e',
        authorRole: 'ARCHIVIST',
        title: 'UREfy v1.0 is live: The social network you actually own',
        content: 'Welcome to UREfy! Today marks a big step forward for the independent web. A social network designed around community, real privacy, and zero ad surveillance. Everything you create stays under your control. Check out the communities and introduce yourself!',
        flair: 'VERIFIED RELEASE',
        meritVotes: 342,
        userVoted: 1,
        replyCount: 18,
        boostCount: 89,
        attachment: {
          fileName: 'urefy-desktop-v1.0.0.zip',
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
        title: 'Testing our high-performance 4K video player on desktop & mobile',
        content: 'Just deployed the new media engine for UREfy. Hardware-accelerated streaming, zero tracking, instant seek, and clean playback across all devices. Take a look and let us know your thoughts!',
        flair: 'TECH DISCUSSION',
        meritVotes: 489,
        userVoted: 1,
        replyCount: 31,
        boostCount: 142,
        video: {
          src: 'simulation://media-engine-demo',
          poster: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="50%" stop-color="%231e1b4b"/><stop offset="100%" stop-color="%23020617"/></linearGradient><linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="%236366f1"/><stop offset="100%" stop-color="%2306b6d4"/></linearGradient></defs><rect width="800" height="450" fill="url(%23bg)"/><circle cx="400" cy="225" r="120" fill="%236366f1" opacity="0.1" filter="blur(40px)"/><rect x="250" y="160" width="300" height="130" rx="16" fill="%230f172a" stroke="url(%23glow)" stroke-width="2" opacity="0.85"/><text x="400" y="210" fill="%23ffffff" font-family="system-ui,sans-serif" font-size="18" font-weight="bold" text-anchor="middle">UREfy Media Engine</text><text x="400" y="240" fill="%2394a3b8" font-family="system-ui,sans-serif" font-size="12" text-anchor="middle">Hardware-Accelerated 120 FPS Stream</text><circle cx="400" cy="270" r="14" fill="%236366f1"/><polygon points="396,263 407,270 396,277" fill="%23ffffff"/></svg>`,
        },
        createdAt: Date.now() - 1000 * 60 * 80,
        isExpanded: false,
      },
      {
        id: 'post-poll',
        channelId: 'vault-guides',
        authorFingerprint: 'a89104fa2211',
        authorRole: 'MODERATOR',
        title: 'Community Poll: What feature should we focus on next?',
        content: 'We are building UREfy transparently with the community. Vote below to help prioritize our upcoming releases!',
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
        title: 'How UREfy stops bots and spam without collecting personal data',
        content: 'Centralized platforms ask for your phone number, official ID, or scan your face just to prove you are human. On UREfy, advanced privacy mathematics prevent spam locally without ever collecting your personal identity. Your data stays on your device where it belongs.',
        flair: 'SECURITY ADVISORY',
        meritVotes: 218,
        userVoted: 0,
        replyCount: 24,
        boostCount: 56,
        quotedPost: {
          id: 'post-1',
          authorFingerprint: 'c3dc28cb705e',
          authorRole: 'ARCHIVIST',
          title: 'UREfy v1.0 is live: The social network you actually own',
          content: 'Welcome to UREfy! A social network designed around community, real privacy, and zero ad surveillance.',
        },
        createdAt: Date.now() - 1000 * 60 * 360,
        isExpanded: true,
      },
      {
        id: 'post-images',
        channelId: 'pulse-global',
        authorFingerprint: 'f40019bc88a2',
        authorRole: 'MEMBER',
        title: 'Refining the design system: Balanced contrast, typography & layout',
        content: 'A sneak peek at our visual hierarchy updates: comfortable text sizes, restrained surface colors, and clean post cards. A great social platform should feel calm, focused, and easy to read.',
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
        text: 'Welcome to UREfy! This space is private, encrypted, and owned by its members. Feel free to introduce yourself or jump into any community.',
        epoch: '#412',
        status: 'verified',
        createdAt: Date.now() - 1000 * 60 * 45,
        isMine: false,
      },
      {
        id: 'msg-2',
        channelId: 'relays-general',
        authorFingerprint: 'c3dc28cb705e',
        text: 'Really excited about the new media and photo sharing in today\'s release. Tested it on desktop and mobile — looks super clean.',
        epoch: '#412',
        status: 'verified',
        createdAt: Date.now() - 1000 * 60 * 20,
        isMine: false,
      },
      {
        id: 'msg-3',
        channelId: 'relays-general',
        authorFingerprint: 'a89104fa2211',
        text: 'Messages are streaming with zero delay and end-to-end encryption is active. Welcome everyone!',
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

    if (this.syncAbortController) {
      this.syncAbortController.abort();
    }
    this.syncAbortController = new AbortController();
    const signal = this.syncAbortController.signal;

    this.isSyncing = true;
    let hasChanged = false;

    const activeChannel = this.activeChannelId;

    try {
      // Execute all independent Edge API reads concurrently in a single network wave
      const [
        pubSettled,
        chSettled,
        stSettled,
        anSettled,
        postsSettled,
        msgsSettled,
        nanoSettled,
      ] = await Promise.allSettled([
        fetchWithRetry('/api/admin?public=true', { signal, maxRetries: 1 }),
        fetch('/api/channels', { signal }),
        fetch('/api/storage', { signal }),
        fetch('/api/analytics', { signal }),
        fetch('/api/posts?limit=100', { signal }),
        fetch(`/api/messages?channelId=${encodeURIComponent(activeChannel)}`, { signal }),
        fetchWithRetry('/api/nanopublications', { signal, maxRetries: 1 }),
        this.fetchFacets(),
      ]);

      if (signal.aborted) return;

      // 0. Public Broadcast Status
      if (pubSettled.status === 'fulfilled' && pubSettled.value.ok) {
        const pubData = await pubSettled.value.json().catch(() => null);
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

      // 1. Channels (O(1) Map lookup)
      if (chSettled.status === 'fulfilled' && chSettled.value.ok) {
        const chRes = chSettled.value;
        const chData = await chRes.json().catch(() => null);
        const storageHdr = chRes.headers.get('X-Edge-Storage') || (chData?.storage ?? '');
        if (storageHdr.includes('D1')) this.d1Status = 'connected';
        else if (storageHdr.includes('Memory') || storageHdr.includes('Fallback')) this.d1Status = 'fallback';

        if (chData?.success && Array.isArray(chData.channels) && chData.channels.length > 0) {
          const channelMap = new Map(this.channels.map((c, idx) => [c.id, idx]));
          for (const c of chData.channels) {
            const ec: ChannelItem = {
              id: c.id,
              space: c.space || 'relays',
              name: c.name,
              description: c.description || '',
              isEncrypted: c.isEncrypted === true || c.is_encrypted === 1,
            };
            const localIdx = channelMap.get(ec.id);
            if (localIdx === undefined) {
              channelMap.set(ec.id, this.channels.length);
              this.channels.push(ec);
              hasChanged = true;
            } else if (
              this.channels[localIdx].name !== ec.name ||
              this.channels[localIdx].description !== ec.description
            ) {
              this.channels[localIdx] = ec;
              hasChanged = true;
            }
          }
        }
      }

      // 2. Cloudflare R2 Storage Objects (O(1) Set lookup by SHA-256)
      const knownNanoHashes = new Set(this.nanopublications.map((np) => np.sha256));
      const knownNanoIds = new Set(this.nanopublications.map((np) => np.id));

      if (stSettled.status === 'fulfilled' && stSettled.value.ok) {
        const stRes = stSettled.value;
        const stData = await stRes.json().catch(() => null);
        const stBackendHdr = stRes.headers.get('X-Storage-Backend') || stData?.storage;
        if (stBackendHdr?.includes('R2')) {
          this.r2Status = 'connected';
          this.edgeStorageBackend = 'Cloudflare-D1 / Cloudflare-R2';
        } else if (stBackendHdr && (stBackendHdr.includes('Fallback') || stBackendHdr.includes('Memory'))) {
          this.r2Status = 'fallback';
          this.edgeStorageBackend = 'Edge-Isolate-Memory Fallback';
        }

        if (stData?.success && Array.isArray(stData.objects)) {
          this.vaultObjects = stData.objects;
          for (const obj of stData.objects) {
            if (obj.sha256 && !knownNanoHashes.has(obj.sha256)) {
              const id = `vault-nano-${obj.key}`;
              knownNanoHashes.add(obj.sha256);
              knownNanoIds.add(id);
              this.nanopublications.push({
                id,
                channelId: 'vault-releases',
                title: obj.fileName || obj.key,
                fileName: obj.fileName || obj.key,
                byteSize: obj.size || 0,
                sha256: obj.sha256,
                crc32: 'VERIFIED',
                entropy: Number.isFinite(obj.entropy) ? obj.entropy : 0,
                verdict: obj.verdict || 'UNKNOWN',
                merkleRoot: obj.merkleRoot || '',
                seederCount: Number.isSafeInteger(obj.seederCount) ? obj.seederCount : 0,
                createdAt: obj.uploadedAt || Date.now(),
              });
              hasChanged = true;
            }
          }
        }
      }

      // 3. Edge Telemetry
      if (anSettled.status === 'fulfilled' && anSettled.value.ok) {
        const anRes = anSettled.value;
        const anData = await anRes.json().catch(() => null);
        if (anData && (anData.status === 'healthy' || anData.metrics)) {
          this.edgeTelemetry = anData;
          if (typeof anData.metrics?.avgLatencyMs === 'number' && this.latencyMs !== anData.metrics.avgLatencyMs) {
            this.latencyMs = anData.metrics.avgLatencyMs;
          }
          if (typeof anData.metrics?.activeNodes === 'number') {
            this.peersOnline = Math.max(anData.metrics.activeNodes, this.peersOnline);
          }
          if (anRes.headers.get('X-Edge-Storage')?.includes('D1')) {
            this.d1Status = 'connected';
          }
          this.doMeshStatus = 'synchronized';
        }
      }

      // 4. Posts (O(1) Map lookup + selective search indexing)
      if (postsSettled.status === 'fulfilled') {
        const res = postsSettled.value;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success && Array.isArray(data.posts)) {
            const postIndexMap = new Map(this.posts.map((p, i) => [p.id, i]));
            const newlyAddedPosts: ClientPost[] = [];

            for (const ep of data.posts as ClientPost[]) {
              const localIndex = postIndexMap.get(ep.id);
              if (localIndex === undefined) {
                const hydrated: ClientPost = {
                  ...ep,
                  userVoted: ep.authorFingerprint === this.keypair.fingerprint ? 1 : 0,
                };
                postIndexMap.set(ep.id, this.posts.length);
                this.posts.push(hydrated);
                newlyAddedPosts.push(hydrated);
                hasChanged = true;
              } else {
                const lp = this.posts[localIndex];
                if (
                  ep.meritVotes !== lp.meritVotes ||
                  ep.boostCount !== lp.boostCount ||
                  ep.replyCount !== lp.replyCount
                ) {
                  lp.meritVotes = ep.meritVotes;
                  lp.boostCount = ep.boostCount;
                  lp.replyCount = ep.replyCount;
                  hasChanged = true;
                }
              }
            }

            for (const np of newlyAddedPosts) {
              localSearchIndex.indexPost(np);
            }
            if (this.posts.length > 0) {
              pulseActionsEngine.syncInteractions(
                this.posts.map((p) => p.id),
                this.keypair?.fingerprint
              );
            }
          }
        } else if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          if (retryAfter) this.setRateLimitCooldown(parseInt(retryAfter, 10) || 60);
        }
      }

      // 4b. Background social graph & notifications sync
      if (typeof window !== 'undefined') {
        void (window as any).profileView?.syncFollowing?.();
        void (window as any).sovereignCircleEngine?.syncCommunitiesFromApi?.();
      }
      void import('./notifications.js')
        .then(({ notificationCenter }) => notificationCenter.syncFromApi(this.keypair.fingerprint))
        .catch(() => {});

      // 5. Channel Messages
      if (msgsSettled.status === 'fulfilled' && msgsSettled.value.ok) {
        const data = await msgsSettled.value.json().catch(() => null);
        if (data?.success && Array.isArray(data.messages)) {
          let msgsChanged = false;
          for (const em of data.messages) {
            const targetChannel = em.channelId || activeChannel;
            const channelMsgs = this.messages.get(targetChannel) || [];
            let emText = em.text || em.ciphertext || '';
            if (em.ciphertext && em.ciphertext.startsWith('e2ee:v1:')) {
              try {
                emText = await decryptChannelMessage(targetChannel, em.ciphertext);
              } catch (_) {}
            }
            const isDuplicate = channelMsgs.some(
              (x) =>
                x.id === em.id ||
                (x.text === emText &&
                  x.authorFingerprint === em.authorFingerprint &&
                  Math.abs(x.createdAt - (em.createdAt || 0)) < 15000)
            );
            if (!isDuplicate) {
              channelMsgs.push({
                id: em.id,
                channelId: targetChannel,
                authorFingerprint: em.authorFingerprint,
                text: emText,
                epoch: em.epoch || '#1',
                status: em.status || 'verified',
                createdAt: em.createdAt || Date.now(),
                isMine: em.authorFingerprint === this.keypair.fingerprint,
              });
              this.messages.set(targetChannel, channelMsgs);
              msgsChanged = true;
              hasChanged = true;
            }
          }
          if (msgsChanged) {
            this.persistMessagesLocally();
          }
        }
      }

      // 6. Nanopublications
      if (nanoSettled.status === 'fulfilled' && nanoSettled.value.ok) {
        const nanoData = await nanoSettled.value.json().catch(() => null);
        if (nanoData?.success && Array.isArray(nanoData.nanopublications)) {
          for (const en of nanoData.nanopublications) {
            if (!knownNanoIds.has(en.id) && !knownNanoHashes.has(en.sha256)) {
              knownNanoIds.add(en.id);
              if (en.sha256) knownNanoHashes.add(en.sha256);
              this.nanopublications.push({
                id: en.id,
                channelId: en.channelId || 'vault-releases',
                title: en.title || en.fileName,
                fileName: en.fileName,
                byteSize: en.byteSize,
                sha256: en.sha256,
                crc32: en.crc32 || 'UNKNOWN',
                entropy: Number.isFinite(en.entropy) ? en.entropy : 0,
                verdict: en.verdict || 'UNKNOWN',
                merkleRoot: en.merkleRoot || '',
                seederCount: Number.isSafeInteger(en.seederCount) ? en.seederCount : 0,
                createdAt: en.createdAt || Date.now(),
              });
              hasChanged = true;
            }
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }

    if (hasChanged) {
      this.notify();
    }
  }

  public rateLimitCooldownUntil: number = 0;
  private lastToastTime: Record<string, number> = {};

  public setRateLimitCooldown(seconds: number): void {
    const cooldownMs = Math.max(1, seconds) * 1000;
    this.rateLimitCooldownUntil = Math.max(this.rateLimitCooldownUntil, Date.now() + cooldownMs);
    this.notify('RATE_LIMIT_COOLDOWN', { remainingSeconds: this.getRateLimitRemainingSeconds() });
  }

  public getRateLimitRemainingSeconds(): number {
    const remMs = this.rateLimitCooldownUntil - Date.now();
    return remMs > 0 ? Math.ceil(remMs / 1000) : 0;
  }

  public isRateLimited(): boolean {
    return Date.now() < this.rateLimitCooldownUntil;
  }

  public showToast(message: string, type: 'info' | 'success' | 'warning' = 'info'): void {
    let normalizedMessage = message;
    if (message.includes('429') || message.includes('Too Many Requests') || message.includes('Edge rate limit exceeded')) {
      const remaining = this.getRateLimitRemainingSeconds();
      normalizedMessage = remaining > 0
        ? `Network is busy. Please try again in ${remaining}s.`
        : 'Network is busy. Please try again in a few seconds.';
      type = 'warning';
    }

    const now = Date.now();
    const lastTime = this.lastToastTime[normalizedMessage] || 0;
    if (now - lastTime < 3000) {
      return; // Deduplicate identical toasts within 3s window to prevent toast storm
    }
    this.lastToastTime[normalizedMessage] = now;

    const id = `toast-${now}`;
    this.toasts.push({ id, message: normalizedMessage, type });
    this.notify('TOAST', { id, message: normalizedMessage, type });
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
    }

    // Synchronous DOM paint for zero-latency user feedback
    if (typeof document !== 'undefined') {
      document.querySelectorAll<HTMLElement>(`[data-vote-id="${postId}"]`).forEach(btn => {
        const dir = parseInt(btn.getAttribute('data-dir') || '0', 10);
        const isDetail = btn.classList.contains('btn-detail-vote') || Boolean(btn.closest('#post-focus-view'));
        if (isDetail) {
          if (dir === 1) {
            btn.className = `btn-detail-vote p-1.5 rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer ${p.userVoted === 1 ? 'text-cyphr font-bold bg-cyphr/10' : 'text-slate-400 hover:text-cyphr'}`;
          } else if (dir === -1) {
            btn.className = `btn-detail-vote p-1.5 rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer ${p.userVoted === -1 ? 'text-crimson font-bold bg-crimson/10' : 'text-slate-400 hover:text-crimson'}`;
          }
          const container = btn.parentElement;
          if (container) {
            const countSpan = container.querySelector('.detail-vote-count') || container.querySelector('span');
            if (countSpan) {
              countSpan.textContent = String(p.meritVotes);
              countSpan.className = `detail-vote-count font-mono text-sm font-bold px-2 ${p.userVoted === 1 ? 'text-cyphr' : p.userVoted === -1 ? 'text-crimson' : 'text-slate-200'}`;
            }
          }
        } else {
          if (dir === 1) {
            btn.className = `btn-upvote text-slate-400 hover:text-indigo-400 transition-colors p-1.5 rounded-xl hover:bg-surface-overlay cursor-pointer ${p.userVoted === 1 ? 'text-indigo-400 font-bold bg-indigo-950/60' : ''}`;
          } else if (dir === -1) {
            btn.className = `btn-downvote text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-xl hover:bg-surface-overlay cursor-pointer ${p.userVoted === -1 ? 'text-rose-500 font-bold bg-rose-950/60' : ''}`;
          }
          const container = btn.parentElement;
          if (container) {
            const countSpan = container.querySelector('span');
            if (countSpan) {
              countSpan.textContent = String(p.meritVotes);
              countSpan.className = `font-mono text-xs font-bold ${p.userVoted === 1 ? 'text-indigo-400' : p.userVoted === -1 ? 'text-rose-500' : 'text-slate-300'}`;
            }
          }
        }
      });

      document.querySelectorAll<HTMLElement>(`[data-pulse-action="like"][data-post-id="${postId}"], .btn-pulse-like[data-post-id="${postId}"]`).forEach(btn => {
        const isLiked = p.userVoted === 1;
        btn.classList.toggle('is-active', isLiked);
        btn.setAttribute('aria-pressed', String(isLiked));
        const countEl = btn.querySelector('b') || btn.querySelector('.merit-count');
        if (countEl) {
          countEl.textContent = p.meritVotes > 0 ? (p.meritVotes >= 1000 ? `${(p.meritVotes / 1000).toFixed(1)}k` : String(p.meritVotes)) : '0';
        }
      });
    }

    this.notify('VOTE', { postId, direction, meritVotes: p.meritVotes, userVoted: p.userVoted });
    crossTabSync.broadcast('POST_VOTED', { postId, direction, meritVotes: p.meritVotes });

    if (p.userVoted !== 0) {
      void import('./activity-feed.js').then(({ networkActivityFeed }) => {
        networkActivityFeed.addEvent({
          type: 'vote',
          actorFP: this.keypair.fingerprint,
          actorRole: 'member',
          targetTitle: p.title,
          targetId: p.id,
          timestamp: Date.now(),
          meta: { direction: p.userVoted > 0 ? 'up' : 'down' },
        });
      }).catch(() => {});
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

      void import('./activity-feed.js').then(({ networkActivityFeed }) => {
        networkActivityFeed.addEvent({
          type: 'boost',
          actorFP: this.keypair.fingerprint,
          actorRole: 'member',
          targetTitle: p.title,
          targetId: p.id,
          timestamp: Date.now(),
          meta: { boostAmount: p.boostCount },
        });
      }).catch(() => {});
    }

    this.notify('BOOST', { postId, boostCount: p.boostCount, userBoosted: p.userBoosted });

    // Sync boost with Edge Functions
    if (typeof fetch !== 'undefined') {
      const envelope = this.createSignedEnvelope({ action: p.userBoosted ? 'boost' : 'unboost', postId });
      fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
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
    const randSuffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().substring(0, 8)
      : Date.now().toString(36);
    const facet = (post.facetId ? this.facets.find(f => f.id === post.facetId) : null) || this.getActiveFacet();
    const newPost: ClientPost = {
      id: `post-${Date.now()}-${randSuffix}`,
      channelId: post.channelId || this.activeChannelId,
      authorFingerprint: this.keypair.fingerprint,
      authorRole: 'MEMBER',
      title: post.title || 'Sovereign Pulse',
      content: post.content || '',
      flair: post.flair || (post.title ? 'TECH DISCUSSION' : 'MICRO-PULSE'),
      meritVotes: 0,
      userVoted: 0,
      replyCount: 0,
      boostCount: 0,
      attachment: post.attachment,
      video: post.video,
      images: post.images,
      pollId: post.pollId,
      quotedPost: post.quotedPost,
      createdAt: Date.now(),
      isExpanded: false,
      facetId: post.facetId || facet?.id || undefined,
      facetHandle: post.facetHandle || facet?.handle || undefined,
      facetDisplayName: post.facetDisplayName || facet?.displayName || undefined,
      facetAvatarUrl: post.facetAvatarUrl || facet?.avatarUrl || undefined,
      audience: post.audience || 'public',
    };
    this.posts.unshift(newPost);
    localSearchIndex.indexPost(newPost);
    void this.retryPost(newPost.id);

    return newPost;
  }

  private draftWrite: Promise<void> = Promise.resolve();
  private saveUnsentPosts(): Promise<void> {
    const owner = this.keypair.fingerprint;
    const drafts = this.posts.filter(post => post.deliveryStatus && post.authorFingerprint === owner).slice(0, 20).map(post => ({ ...post }));
    this.draftWrite = this.draftWrite.catch(() => {}).then(() => secureStorage.savePrivateState(`post-outbox:${owner}`, drafts));
    return this.draftWrite;
  }

  public async restoreUnsentPosts(): Promise<void> {
    const owner = this.keypair.fingerprint;
    try {
      const drafts = await secureStorage.getPrivateState<ClientPost[]>(`post-outbox:${owner}`);
      if (this.keypair.fingerprint !== owner || !Array.isArray(drafts)) return;
      for (const post of drafts.slice(0, 20)) {
        if (post.authorFingerprint !== owner || typeof post.id !== 'string' || typeof post.content !== 'string' || this.posts.some(item => item.id === post.id)) continue;
        this.posts.unshift({ ...post, deliveryStatus: 'failed', deliveryError: 'Not yet confirmed. Retry to publish.' });
      }
      this.notify();
    } catch { this.showToast('Unsent drafts could not be opened on this device', 'warning'); }
  }

  public async retryPost(postId: string): Promise<boolean> {
    const post = this.posts.find(item => item.id === postId);
    if (!post || post.deliveryStatus === 'sending' || post.authorFingerprint !== this.keypair.fingerprint) return false;
    post.deliveryStatus = 'sending'; post.deliveryError = undefined;
    this.notify();
    try {
      await this.saveUnsentPosts();
      const { deliveryStatus, deliveryError, ...publication } = post;
      const envelope = this.createSignedEnvelope({ action: 'create', ...publication });
      const response = await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || !data.post) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || data?.retryAfterSeconds || 60;
          this.setRateLimitCooldown(Number(retryAfter));
          throw new Error(`Rate limit reached. Please wait ${retryAfter} seconds before trying again. Your draft is kept on this device.`);
        }
        throw new Error(data?.error || 'Publication was not confirmed. Your draft is kept on this device.');
      }
      Object.assign(post, data.post);
      delete post.deliveryStatus; delete post.deliveryError;
      await this.saveUnsentPosts();
      crossTabSync.broadcast('POST_CREATED', post);
      this.showToast('Post published', 'success');
      this.notify();
      return true;
    } catch (error) {
      post.deliveryStatus = 'failed';
      post.deliveryError = error instanceof Error ? error.message : 'Publication failed. Retry when connected.';
      await this.saveUnsentPosts().catch(() => {});
      this.showToast(post.deliveryError, 'warning');
      this.notify();
      return false;
    }
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
  private _pendingEvents: Array<{ event?: string; data?: any }> = [];

  public notify(event?: string, data?: any): void {
    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') {
      // Test / SSR environment: notify subscribers synchronously
      this.listeners.forEach((fn) => fn(event, data));
      return;
    }

    // Browser environment: batch using requestAnimationFrame for zero-flicker 60fps rendering
    this._pendingEvents.push({ event, data });

    if (this._notifyTimer !== null) return;

    this._notifyTimer = requestAnimationFrame(() => {
      this._notifyTimer = null;
      const events = this._pendingEvents;
      this._pendingEvents = [];

      let hasGeneralRender = false;
      const specificEvents: Array<{ event?: string; data?: any }> = [];

      for (const ev of events) {
        if (ev.event === undefined) {
          hasGeneralRender = true;
        } else {
          specificEvents.push(ev);
        }
      }

      // Dispatch specific fast-path events first (e.g. TOAST, VOTE)
      for (const { event: ev, data: d } of specificEvents) {
        this.listeners.forEach((fn) => fn(ev, d));
      }

      // If a general re-render was also requested in this frame, dispatch it once
      if (hasGeneralRender || specificEvents.length === 0) {
        this.listeners.forEach((fn) => fn(undefined, undefined));
      }
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
    this._pendingEvents = [];
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
    if (!this.isAuthenticated()) return;
    const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
    const host = typeof window !== 'undefined' ? (window.location?.host || window.location?.hostname || 'localhost') : 'localhost';
    const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');

    // Cloudflare Pages edge deployments (urefy.com and *.pages.dev) do not support
    // raw WebSocket upgrades — operate in HTTP-only mesh mode to avoid noisy console errors & retry loops.
    const isCloudflarePages = host.endsWith('.pages.dev') ||
      host === 'urefy.com' || host.endsWith('.urefy.com') ||
      (typeof (globalThis as any).__CF_PAGES !== 'undefined');
    if (isCloudflarePages) {
      // Pe Cloudflare Pages folosim sincronizarea HTTP securizată (D1 polling)
      // și marcăm clientul ca fiind conectat când browserul este online:
      this.isConnected = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
      this.notify();
      return;
    }

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
        const wasConnected = this.isConnected;
        this.isConnected = false;
        if (wasConnected) {
          this.notify();
        }
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
        const wasConnected = this.isConnected;
        this.isConnected = false;
        if (wasConnected) {
          this.notify();
        }
      };
    } catch (err) {
      if (this.reconnectAttempts === 0) {
        console.info('WebSocket initialization in local mesh mode');
      }
      const wasConnected = this.isConnected;
      this.isConnected = false;
      if (wasConnected) {
        this.notify();
      }
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

      case 'CHALLENGE': {
        if (packet.challenge) {
          const signatureBytes = signMessage(packet.challenge, this.keypair.privateKey);
          const signature = bytesToHex(signatureBytes);
          this.send({
            type: 'AUTH_RESPONSE',
            challenge: packet.challenge,
            signature,
            fingerprint: this.keypair.fingerprint,
            publicKeyHex: this.keypair.publicKeyHex,
            nullifier: this.nullifier,
          });
        }
        break;
      }

      case 'MESSAGE_ACK': {
        const chMsgs = this.messages.get(packet.channelId) || [];
        const target = chMsgs.find((m) => m.id === packet.id);
        if (target) {
          target.status = 'delivered';
          this.notify('MESSAGE_ACK', { id: packet.id, channelId: packet.channelId });
        }
        break;
      }

      case 'PING': {
        this.send({
          type: 'PONG',
          timestamp: packet.timestamp || Date.now(),
        });
        break;
      }
    }
  }

  public replyingToMessage: ChatMessage | null = null;

  public setReplyingTo(msg: ChatMessage | null): void {
    this.replyingToMessage = msg;
    this.notify();
  }

  public getCurrentUser(): { id: string; name: string } | null {
    if (!this.keypair) return null;
    const activeFacet = this.facets.find((f) => f.id === this.activeFacetId) || this.facets[0];
    return {
      id: this.keypair.fingerprint,
      name: activeFacet?.displayName || 'Anonim',
    };
  }

  public getActiveChannel(): ChannelItem | undefined {
    return this.channels.find((c) => c.id === this.activeChannelId);
  }

  public getMessagesForActiveChannel(): ChatMessage[] {
    const list = this.messages.get(this.activeChannelId) || [];
    const activeFacet = this.facets.find((f) => f.id === this.activeFacetId) || this.facets[0];
    const myName = activeFacet?.displayName || 'Eu';
    return list.map((m) => ({
      ...m,
      senderId: m.authorFingerprint,
      senderName: m.isMine ? myName : m.authorFingerprint.slice(0, 10),
      timestamp: m.createdAt,
    }));
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

  public sendMessage(text: string, forceEpoch?: string, attachment?: DirectMessageAttachment): void {
    const trimmed = text ? text.trim() : '';
    if (!trimmed && !attachment) return;

    // Evaluate ZK-RLN polynomial share
    const epoch = forceEpoch || `epoch_${Math.floor(Date.now() / 60000)}`; // 1 minute epoch
    const share = ZKRLN.createShare(this.secretKey, epoch, trimmed || attachment?.name || 'attachment');

    const signatureBytes = signMessage(trimmed || attachment?.name || '', this.keypair.privateKey);
    const signature = bytesToHex(signatureBytes);

    // Create client message and immediately add to local channel messages
    const randSuffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().substring(0, 8)
      : Date.now().toString(36);
    const newMsg: ClientMessage = {
      id: `msg-${Date.now()}-${randSuffix}`,
      channelId: this.activeChannelId,
      authorFingerprint: this.keypair.fingerprint,
      text: trimmed,
      ciphertext: trimmed,
      epoch: share.epoch,
      status: 'valid',
      createdAt: Date.now(),
      isMine: true,
      attachment,
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
    void (async () => {
      let encryptedPayload = trimmed;
      try {
        encryptedPayload = await encryptChannelMessage(this.activeChannelId, trimmed);
      } catch (_) {}

      const msgEnvelope = this.createSignedEnvelope({
        ...newMsg,
        ciphertext: encryptedPayload,
        signature,
      });

      if (typeof fetch !== 'undefined') {
        fetchWithRetry('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msgEnvelope),
          maxRetries: 2,
          baseDelayMs: 300,
        }).catch(() => {
          offlineSync.enqueue('SEND_MESSAGE', msgEnvelope);
        });
      } else {
        offlineSync.enqueue('SEND_MESSAGE', msgEnvelope);
      }
    })();

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

    const { computeFileChecksums, inspectBinary, createSwarmManifest } = await import('@aetheris/vault-engine');
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
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('aetheris_density_mode', density); } catch {}
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-density', density);
    }
    this.notify('DENSITY_CHANGED', { density });
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

  public isSovereignMode(): boolean {
    return this.uiMode === 'sovereign' || this.uiMode === 'advanced' || this.uiMode === 'technical';
  }

  public isSimpleMode(): boolean {
    return this.uiMode === 'simple';
  }

  public setUiMode(mode: UiMode): void {
    if (this.uiMode === mode) return;
    this.uiMode = mode;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('aetheris_ui_mode', mode); } catch {}
    }
    const isSov = this.isSovereignMode();
    try {
      toastManager.info(
        isSov
          ? '⚡ Advanced Mode active: Security diagnostics and developer tools unlocked'
          : '🌱 Simple Mode active: Clean, social-first interface',
        isSov ? '⚡' : '🌱'
      );
    } catch (_) {}
    this.notify('UI_MODE_CHANGED', { uiMode: mode });
  }

  public toggleUiMode(): void {
    if (this.isSimpleMode()) {
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
      if (file.size > 25 * 1024 * 1024) throw new Error('Maximum cloud file size is 25 MiB');
      const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      const sha256 = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
      const envelope = this.createSignedEnvelope({ action: 'storage:upload', sha256, fileName: file.name });
      const res = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'X-Sovereign-Envelope': JSON.stringify(envelope) },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Upload rejected (${res.status})`);
      }
      if (res.ok) {
        const data = await res.json();
        this.showToast(`Vault: Stored '${file.name}' in ${data.storage || 'Cloudflare R2'}`, 'success');
        this.syncFromEdge();
        return data;
      }
    } catch (err: any) {
      this.showToast(`Vault upload error: ${err?.message || 'Check your connection and retry'}`, 'warning');
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
    return this.restoreIdentityFromSeed(bytesToHex(seed), cleanPhrase);
  }

  public restoreIdentityFromSeed(seedHex: string, mnemonic = ''): boolean {
    if (!/^[0-9a-f]{64}$/i.test(seedHex)) return false;
    if (mnemonic && (!validateMnemonic(mnemonic) || bytesToHex(mnemonicToSeed(mnemonic).subarray(0, 32)) !== seedHex.toLowerCase())) return false;
    const seed = hexToBytes(seedHex);
    this.mnemonic = mnemonic;
    this.keypair = generateKeyPair(seed);
    this.secretKey = Field.hashToField(bytesToHex(seed));
    this.nullifier = ZKRLN.computeNullifier(this.secretKey);
    this.sovereignKeySet = createSovereignIdentity({ seed });
    this.sovereignIdentity = this.sovereignKeySet.identity;

    this.identityPersistence = secureStorage.saveIdentity(this.mnemonic, seed, this.keypair.fingerprint, this.sovereignIdentity);
    void this.identityPersistence.catch(() => this.showToast('The restored identity could not be saved. Do not close this session without a backup.', 'warning'));

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    const restoredFingerprint = this.keypair.fingerprint;
    void this.identityPersistence.then(() => {
      if (this.keypair.fingerprint !== restoredFingerprint) return;
      this.showToast('Identity restored and saved in the encrypted vault.', 'success');
      void import('./social-safety.js').then(({ socialSafety }) => {
        socialSafety.setActiveFingerprint(restoredFingerprint);
        void socialSafety.syncSafetyLists();
      }).catch(() => {});
      this.connect();
      this.notify('IDENTITY_RESTORED', { fingerprint: restoredFingerprint });
    }).catch(() => {});
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
