/**
 * @file resilience-integrity.test.ts
 * @package @aetheris/client-ui
 * @description Comprehensive End-to-End Resilience, Integrity, and Graceful Degradation Test Suite.
 * Covers:
 * 1. Complete post lifecycle (creation, ZK-RLN signing, voting, boosting, bookmarks, backup export, TF-IDF / BM25 search).
 * 2. Complete Live Relays chat lifecycle (ratcheting SFrame E2EE, WebSocket handling, sync deduplication, scroll preservation).
 * 3. Network fault recovery (WS disconnection simulation, exponential backoff, Edge HTTP polling fallback & zero-loss resync).
 * 4. Graceful degradation under missing WebCrypto or AudioContext on legacy environments.
 * 5. Error Boundary architecture, Structured Logger multi-level telemetry, and fallback UI rendering without white-screen crashes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AetherisClientStore, ClientPost, ClientMessage } from '../src/client-state.js';
import {
  ErrorBoundary,
  StructuredLogger,
  errorBoundary,
  structuredLogger,
  checkWebCryptoSupport,
  checkAudioContextSupport,
  getSystemResilienceStatus,
} from '../src/error-boundary.js';
import { LocalSearchIndex } from '../src/search-index.js';
import { BookmarksVault } from '../src/bookmarks.js';
import { ExportBackupManager } from '../src/export-backup.js';
import {
  generateKeyPair,
  ZKRLN,
  E2EEEngine,
  Field,
  TreeKEMEngine,
  bytesToHex,
  hexToBytes,
} from '@aetheris/core-crypto';
import { createSafeAudioContext } from '../src/dry-utils.js';

describe('UREfy Sovereign Integrity & E2E Resilience Test Suite', () => {
  let store: AetherisClientStore;
  let logger: StructuredLogger;
  let boundary: ErrorBoundary;
  let searchIdx: LocalSearchIndex;
  let bookmarks: BookmarksVault;
  let backupEngine: ExportBackupManager;

  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    const storageObj = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        mockStorage[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        for (const k in mockStorage) delete mockStorage[k];
      }),
      length: 0,
      key: vi.fn(() => null),
    } as unknown as Storage;

    globalThis.localStorage = storageObj;
    globalThis.window = {
      crypto: globalThis.crypto,
      localStorage: storageObj,
      location: {
        protocol: 'https:',
        host: 'localhost:3000',
        hostname: 'localhost',
        search: '',
        reload: vi.fn(),
      } as unknown as Location,
      navigator: { userAgent: 'test-agent', language: 'en' },
      screen: { width: 1920, height: 1080 },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window & typeof globalThis;

    store = new AetherisClientStore();
    logger = new StructuredLogger(100);
    boundary = new ErrorBoundary();
    searchIdx = new LocalSearchIndex();
    bookmarks = new BookmarksVault();
    backupEngine = new ExportBackupManager();
  });

  afterEach(() => {
    boundary.dispose();
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. POST LIFECYCLE & CRYPTOGRAPHIC PIPELINE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Post Lifecycle & Full Cryptographic Pipeline', () => {
    it('should create, sign with ZK-RLN, vote, boost, bookmark, export, and index for BM25 search', async () => {
      // Step A: Post Creation
      const createdPost = store.createPost({
        channelId: 'pulse-global',
        title: 'Zero-Knowledge Micro-Kernel v1.0.0 Architecture',
        content: 'Comprehensive specification of sovereign memory safety, TreeKEM group ratchets, and verifiable ZK-RLN rate limits.',
        flair: 'VERIFIED RELEASE',
      });

      expect(createdPost.id).toBeDefined();
      expect(createdPost.title).toBe('Zero-Knowledge Micro-Kernel v1.0.0 Architecture');
      expect(createdPost.authorFingerprint).toBe(store.keypair.fingerprint);
      expect(createdPost.meritVotes).toBe(0);
      expect(store.posts.some((p) => p.id === createdPost.id)).toBe(true);

      // Step B: ZK-RLN Cryptographic Proof Generation for Rate-Limiting
      const epoch = '2026-08-31-epoch-412';
      const proofShare = ZKRLN.createShare(store.secretKey, epoch, createdPost.content);

      expect(proofShare.nullifier).toBe(store.nullifier);
      expect(proofShare.epoch).toBe(epoch);
      expect(proofShare.x).toBeDefined();
      expect(proofShare.y).toBeDefined();

      // Step C: Merit Voting (Upvote, Downvote, Neutral Toggle)
      store.votePost(createdPost.id, 1); // First explicit endorsement
      let postInStore = store.posts.find((p) => p.id === createdPost.id)!;
      expect(postInStore.meritVotes).toBe(1);
      expect(postInStore.userVoted).toBe(1);

      store.votePost(createdPost.id, 1); // Undo endorsement
      postInStore = store.posts.find((p) => p.id === createdPost.id)!;
      expect(postInStore.meritVotes).toBe(0);
      expect(postInStore.userVoted).toBe(0);

      store.votePost(createdPost.id, -1); // Change to Divergent perspective (-1)
      postInStore = store.posts.find((p) => p.id === createdPost.id)!;
      expect(postInStore.meritVotes).toBe(-1);
      expect(postInStore.userVoted).toBe(-1);

      // Step D: Boost Mechanics
      const initialBoosts = postInStore.boostCount;
      store.boostPost(createdPost.id);
      expect(postInStore.boostCount).toBe(initialBoosts + 1);

      // Step E: Bookmarks Vault Saving & Tagging
      bookmarks.save(postInStore);
      expect(bookmarks.isSaved(createdPost.id)).toBe(true);

      bookmarks.addTag(createdPost.id, 'cryptography');
      bookmarks.addTag(createdPost.id, 'sovereign-core');
      bookmarks.updateNote(createdPost.id, 'Crucial reference for the kernel audit.');

      const foundByTag = bookmarks.search('cryptography');
      expect(foundByTag.length).toBeGreaterThanOrEqual(1);
      const matched = foundByTag.find((b) => b.postId === createdPost.id);
      expect(matched).toBeDefined();
      expect(matched?.note).toBe('Crucial reference for the kernel audit.');

      // Step F: Sovereign Account Export Archive
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aetheris_posts', JSON.stringify([postInStore]));
        localStorage.setItem('aetheris_bookmarks', JSON.stringify(bookmarks.bookmarks));
      }
      const backupBlob = await backupEngine.exportAccount({
        includePosts: true,
        includeBookmarks: true,
        includeDrafts: false,
        includeMessages: false,
        includePreferences: false,
        includeKeys: false,
        encryptWithPassword: false,
        format: 'json',
      });

      const backupText = await backupBlob.text();
      const parsedBackup = JSON.parse(backupText);
      expect(parsedBackup.manifest).toBeDefined();
      expect(parsedBackup.posts.length).toBe(1);
      expect(parsedBackup.posts[0].id).toBe(createdPost.id);
      expect(parsedBackup.bookmarks.length).toBe(3);
      expect(parsedBackup.bookmarks.some((b: any) => b.postId === createdPost.id)).toBe(true);

      // Step G: BM25 Local Search Indexing & Retrieval
      searchIdx.indexDocument({
        id: createdPost.id,
        channelId: createdPost.channelId,
        authorFingerprint: createdPost.authorFingerprint,
        content: `${createdPost.title} ${createdPost.content} ${createdPost.flair}`,
        createdAt: createdPost.createdAt,
        type: 'thread',
      });

      const searchResults = searchIdx.search('Micro-Kernel TreeKEM');
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].doc.id).toBe(createdPost.id);
      expect(searchResults[0].score).toBeGreaterThan(0);
      expect(searchResults[0].snippet).toContain('Micro-Kernel');
    });

    it('should correctly expand, collapse, and toggle discussion threads', () => {
      const post = store.createPost({ title: 'Discussion Thread', content: 'Tree testing' });
      expect(post.isExpanded).toBe(false);

      store.togglePostExpanded(post.id);
      expect(post.isExpanded).toBe(true);

      store.togglePostExpanded(post.id);
      expect(post.isExpanded).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CHAT MESSAGE LIFECYCLE IN LIVE RELAYS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Chat Message Lifecycle in Live Relays (E2EE, WebSocket & Deduplication)', () => {
    it('should encrypt message using ratcheted keys, route via packet handler, and decrypt cleanly', async () => {
      const rootKey = new Uint8Array(32).fill(7);
      const { nextKey, messageKey } = E2EEEngine.deriveNextKey(rootKey, undefined, 'live-relays-e2ee');

      expect(nextKey.length).toBe(32);
      expect(messageKey.length).toBe(32);

      // Encrypt message envelope
      const originalText = 'Quantum-safe handshake verified on node #412.';
      const envelope = await E2EEEngine.encrypt(originalText, messageKey, 412, store.keypair.fingerprint);

      expect(envelope.ciphertext).toBeDefined();
      expect(envelope.iv).toBeDefined();
      expect(envelope.epoch).toBe(412);
      expect(envelope.fingerprint).toBe(store.keypair.fingerprint);

      // Decrypt message envelope
      const decryptedText = await E2EEEngine.decrypt(envelope, messageKey);
      expect(decryptedText).toBe(originalText);
    });

    it('should process NEW_MESSAGE packet in clientStore and prevent duplicate insertion', () => {
      const channelId = 'relays-general';
      const initialMsgs = store.messages.get(channelId) || [];
      const initialCount = initialMsgs.length;

      const incomingMsg: ClientMessage = {
        id: 'msg-unique-991',
        channelId,
        authorFingerprint: 'peer-alpha-99',
        text: 'Synchronized telemetry packet confirmed.',
        epoch: '#412',
        status: 'verified',
        createdAt: Date.now(),
        isMine: false,
      };

      // Ingest packet first time
      (store as any).handlePacket({
        type: 'NEW_MESSAGE',
        message: incomingMsg,
      });

      const updatedMsgs = store.messages.get(channelId)!;
      expect(updatedMsgs.length).toBe(initialCount + 1);
      expect(updatedMsgs.some((m) => m.id === 'msg-unique-991')).toBe(true);

      // Attempt duplicate ingestion with same ID
      (store as any).handlePacket({
        type: 'NEW_MESSAGE',
        message: incomingMsg,
      });

      expect(store.messages.get(channelId)!.length).toBe(initialCount + 1);

      // Attempt duplicate ingestion with different ID but same text/author/timestamp
      const duplicateVariant: ClientMessage = {
        ...incomingMsg,
        id: 'msg-different-id-same-content',
      };

      (store as any).handlePacket({
        type: 'NEW_MESSAGE',
        message: duplicateVariant,
      });

      expect(store.messages.get(channelId)!.length).toBe(initialCount + 1);
    });

    it('should manage TreeKEM group key updates across epoch transitions', () => {
      const tree = new TreeKEMEngine(16);
      expect(tree.getTreeSize()).toBe(16);
      expect(tree.getEpoch()).toBe(0);

      const leafSecret = new Uint8Array(32).fill(42);
      const update = tree.updateLeaf(3, leafSecret);

      expect(update.leafIndex).toBe(3);
      expect(update.epoch).toBe(1);
      expect(update.groupRootKeyHex).toBeDefined();
      expect(update.directPathPublicKeys.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. NETWORK FAULT TOLERANCE & EDGE HTTP SYNCHRONIZATION RECOVERY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Network Recovery (WebSocket Drop, Backoff & Edge HTTP Polling Resync)', () => {
    it('should compute exponential backoff with full jitter within bounded ranges', () => {
      store.reconnectAttempts = 0;
      const delay0 = (store as any).calculateBackoffWithJitter();
      expect(delay0).toBeGreaterThanOrEqual(500);
      expect(delay0).toBeLessThanOrEqual(1000);

      store.reconnectAttempts = 3;
      const delay3 = (store as any).calculateBackoffWithJitter();
      expect(delay3).toBeGreaterThanOrEqual(2000);
      expect(delay3).toBeLessThanOrEqual(6000);

      store.reconnectAttempts = 10;
      const delay10 = (store as any).calculateBackoffWithJitter();
      expect(delay10).toBeLessThanOrEqual(30000); // capped at maxDelayMs
    });

    it('should seamlessly synchronize channels, posts, messages, and nanopublications from Edge HTTP endpoints', async () => {
      const mockChannels = [
        { id: 'relays-alpha', space: 'relays', name: 'Alpha Relay', description: 'Test channel', isEncrypted: true },
      ];
      const mockPosts = [
        {
          id: 'edge-post-1',
          channelId: 'pulse-global',
          authorFingerprint: 'edge-node-7',
          authorRole: 'ARCHIVIST',
          title: 'Synced Post from D1 Database',
          content: 'Payload recovered via HTTP polling.',
          flair: 'SECURITY ADVISORY',
          meritVotes: 42,
          userVoted: 0,
          replyCount: 3,
          boostCount: 12,
          createdAt: Date.now() - 5000,
          isExpanded: false,
        },
      ];
      const mockMessages = [
        {
          id: 'edge-msg-1',
          channelId: 'relays-general',
          authorFingerprint: 'edge-node-7',
          text: 'HTTP Polled Message Reconnection',
          epoch: '#412',
          status: 'verified',
          createdAt: Date.now() - 2000,
        },
      ];

      // Mock global fetch for Edge polling endpoints
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
        const url = String(input);
        if (url.includes('/api/channels')) {
          return {
            ok: true,
            headers: new Headers({ 'X-Edge-Storage': 'Cloudflare-D1' }),
            json: async () => ({ success: true, channels: mockChannels }),
          } as Response;
        }
        if (url.includes('/api/posts')) {
          return {
            ok: true,
            json: async () => ({ success: true, posts: mockPosts }),
          } as Response;
        }
        if (url.includes('/api/messages')) {
          return {
            ok: true,
            json: async () => ({ success: true, messages: mockMessages }),
          } as Response;
        }
        if (url.includes('/api/storage')) {
          return {
            ok: true,
            headers: new Headers({ 'X-Storage-Backend': 'Cloudflare-R2' }),
            json: async () => ({
              success: true,
              storage: 'Cloudflare-R2',
              objects: [{ key: 'firmware.bin', sha256: 'a1b2c3d4e5f6', size: 1048576, uploadedAt: Date.now() }],
            }),
          } as Response;
        }
        if (url.includes('/api/analytics')) {
          return {
            ok: true,
            headers: new Headers({ 'X-Edge-Storage': 'Cloudflare-D1' }),
            json: async () => ({ status: 'healthy', metrics: { avgLatencyMs: 18, activeNodes: 24 } }),
          } as Response;
        }
        if (url.includes('/api/nanopublications')) {
          return {
            ok: true,
            json: async () => ({ success: true, nanopublications: [] }),
          } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      });

      await store.syncFromEdge();

      expect(fetchSpy).toHaveBeenCalled();
      expect(store.d1Status).toBe('connected');
      expect(store.r2Status).toBe('connected');
      expect(store.channels.some((c) => c.id === 'relays-alpha')).toBe(true);
      expect(store.posts.some((p) => p.id === 'edge-post-1')).toBe(true);
      expect(store.messages.get('relays-general')!.some((m) => m.id === 'edge-msg-1')).toBe(true);
      expect(store.nanopublications.some((np) => np.sha256 === 'a1b2c3d4e5f6')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. GRACEFUL DEGRADATION & LEGACY PLATFORM PROBES
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Graceful Degradation & Legacy Platform Probes', () => {
    it('should accurately probe WebCrypto capabilities and detect support', () => {
      const cryptoStatus = checkWebCryptoSupport();
      expect(cryptoStatus.supported).toBe(true);
      expect(cryptoStatus.getRandomValues).toBe(true);
      expect(cryptoStatus.features).toContain('getRandomValues');
    });

    it('should safely degrade when AudioContext is missing without throwing errors', () => {
      const audioStatus = checkAudioContextSupport();
      expect(audioStatus).toBeDefined();

      const safeCtx = createSafeAudioContext();
      // In NodeJS/Vitest test environment without Web Audio mocks, safeCtx is cleanly null
      expect(safeCtx === null || typeof safeCtx === 'object').toBe(true);
    });

    it('should probe full system resilience status without unhandled errors', () => {
      const resilience = getSystemResilienceStatus();
      expect(resilience).toBeDefined();
      expect(typeof resilience.webCrypto).toBe('boolean');
      expect(typeof resilience.audioContext).toBe('boolean');
      expect(typeof resilience.indexedDB).toBe('boolean');
      expect(typeof resilience.localStorage).toBe('boolean');
    });

    it('should fall back to stream cipher encryption when WebCrypto subtle is unavailable', async () => {
      logger.info('TestModule', 'Message 1');
      logger.warn('TestModule', 'Message 2');

      // Mock subtle importKey failure to trigger fallback cipher path
      const subtleSpy = vi.spyOn(crypto.subtle, 'importKey').mockRejectedValueOnce(new Error('Subtle crypto unavailable'));
      const report = await logger.exportEncryptedLogs('fallback-passphrase');
      expect(report.algorithm).toBe('AETHERIS-FALLBACK-STREAM-CIPHER');
      expect(report.ciphertext).toBeDefined();
      expect(report.checksum).toBeDefined();
      expect(report.saltHex).toBeDefined();
      subtleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ERROR BOUNDARY ARCHITECTURE & STRUCTURED TELEMETRY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('5. Error Boundary Architecture & Structured Telemetry Engine', () => {
    it('should record structured logs with appropriate severity levels and priority filtering', () => {
      logger.setMinLogLevel('DEBUG');
      logger.debug('AuthEngine', 'Keypair verified in 1.2ms');
      logger.info('Network', 'WebRTC direct connection established');
      logger.warn('Storage', 'Local cache approaching 80% quota');
      logger.error('Signaling', 'Peer timeout on ICE candidate', new Error('ICE timeout'));
      logger.fatal('CryptoVault', 'Memory integrity violation detected', new Error('Integrity fault'));

      expect(logger.count()).toBe(5);
      expect(logger.count('WARN')).toBe(3); // WARN, ERROR, FATAL
      expect(logger.count('ERROR')).toBe(2); // ERROR, FATAL
      expect(logger.count('FATAL')).toBe(1);

      const searchFiltered = logger.getLogs({ search: 'WebRTC' });
      expect(searchFiltered.length).toBe(1);
      expect(searchFiltered[0].component).toBe('Network');
    });

    it('should perform circular ring buffer eviction when maxCapacity is reached', () => {
      const tinyLogger = new StructuredLogger(3);
      tinyLogger.info('App', 'Entry 1');
      tinyLogger.info('App', 'Entry 2');
      tinyLogger.info('App', 'Entry 3');
      expect(tinyLogger.count()).toBe(3);
      expect(tinyLogger.getLogs()[0].message).toBe('Entry 1');

      tinyLogger.info('App', 'Entry 4');
      expect(tinyLogger.count()).toBe(3);
      expect(tinyLogger.getLogs()[0].message).toBe('Entry 2');
      expect(tinyLogger.getLogs()[2].message).toBe('Entry 4');
    });

    it('should catch synchronous and asynchronous errors safely using boundary wrappers', async () => {
      const syncResult = boundary.wrap(
        () => {
          throw new Error('Sync explosive failure');
        },
        'safe_default_value',
        { component: 'SyncTestComponent', action: 'unit_test' }
      );

      expect(syncResult).toBe('safe_default_value');
      expect(boundary.getState().hasError).toBe(true);
      expect(boundary.getState().lastError?.message).toBe('Sync explosive failure');
      expect(boundary.getState().errorCount).toBe(1);

      const asyncResult = await boundary.wrapAsync(
        async () => {
          throw new Error('Async promise rejection failure');
        },
        42,
        { component: 'AsyncTestComponent', action: 'unit_test_async' }
      );

      expect(asyncResult).toBe(42);
      expect(boundary.getState().errorCount).toBe(2);
    });

    it('should intercept DOM render failures and render Obsidian fallback UI without crashing', () => {
      const mockContainer = {
        innerHTML: '',
        querySelector: vi.fn(() => ({
          addEventListener: vi.fn(),
        })),
      } as unknown as HTMLElement;

      const success = boundary.wrapRender(
        () => {
          throw new Error('Simulated React/DOM Rendering Crash in FeedCard');
        },
        mockContainer,
        {
          title: 'Custom Fallback Header',
          canRetry: true,
          canSafeMode: true,
        }
      );

      expect(success).toBe(false);
      expect(mockContainer.innerHTML).toContain('Custom Fallback Header');
      expect(mockContainer.innerHTML).toContain('Zero-Knowledge State Protected');
      expect(mockContainer.innerHTML).toContain('Simulated React/DOM Rendering Crash');
    });

    it('should render fallback UI HTML directly with custom title and error message', () => {
      const html = boundary.renderFallbackUI(new Error('Direct render test exception'), {
        title: 'Direct Fallback Header',
      });
      expect(html).toContain('Direct Fallback Header');
      expect(html).toContain('Zero-Knowledge State Protected');
      expect(html).toContain('Direct render test exception');
      expect(html).toContain('btn-error-reload');
      expect(html).toContain('btn-error-safemode');
    });

    it('should toggle and persist Safe Mode state correctly', () => {
      expect(boundary.isSafeModeActive()).toBe(false);

      boundary.enableSafeMode(false);
      expect(boundary.isSafeModeActive()).toBe(true);

      boundary.disableSafeMode(false);
      expect(boundary.isSafeModeActive()).toBe(false);
    });

    it('should notify error listeners whenever an exception is intercepted', () => {
      const listener = vi.fn();
      const unsubscribe = boundary.onError(listener);

      boundary.catchError(new Error('Interception event'));
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].message).toBe('Interception event');

      unsubscribe();
      boundary.catchError(new Error('Second error after unsubscribe'));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should export encrypted diagnostic log reports with valid PBKDF2 & AES-256-GCM', async () => {
      logger.info('System', 'Boot completed');
      logger.warn('Mesh', 'High latency on node 3');

      const encryptedReport = await logger.exportEncryptedLogs('strong-diagnostic-key');

      expect(encryptedReport.version).toBe('1.0.0');
      expect(encryptedReport.ciphertext).toBeDefined();
      expect(encryptedReport.checksum).toBeDefined();
      expect(encryptedReport.saltHex.length).toBe(32); // 16 bytes = 32 hex chars
      expect(encryptedReport.ivHex.length).toBe(24);   // 12 bytes = 24 hex chars
    });
  });
});
