import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ExportBackupManager,
  exportBackup,
  type ExportOptions,
  type BackupSizeReport,
  type EncryptedBackupEnvelope,
  type RawBackupPayload,
} from '../src/export-backup.js';

describe('Sovereign Account Export & Encrypted Backup Engine', () => {
  let manager: ExportBackupManager;
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
      localStorage: storageObj,
      navigator: { userAgent: 'test-agent', language: 'en' },
      screen: { width: 1920, height: 1080 },
      dispatchEvent: vi.fn(),
    } as unknown as Window & typeof globalThis;

    manager = new ExportBackupManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 1. INITIALIZATION & METADATA TELEMETRY ─────────────────────────────────

  describe('1. Default Initialization & Size Computation', () => {
    it('should compute zero size on empty local vault', () => {
      const report: BackupSizeReport = manager.computeBackupSize();

      expect(report.posts).toBe(0);
      expect(report.bookmarks).toBe(0);
      expect(report.drafts).toBe(0);
      expect(report.messages).toBe(0);
      expect(report.keys).toBe(0);
      expect(report.preferences).toBe(0);
      expect(report.totalItems).toBe(0);
      expect(report.totalKB).toBeGreaterThanOrEqual(0.1);
    });

    it('should accurately compute size and counts across populated storage categories', () => {
      const samplePosts = [
        { id: 'p1', title: 'Post 1', content: 'ZK proof consensus' },
        { id: 'p2', title: 'Post 2', content: 'AirGap ghost protocol' },
      ];
      const sampleBookmarks = [{ id: 'b1', postId: 'p1' }];
      const sampleDrafts = [{ key: 'draft-1', content: 'Draft content in progress' }];
      const sampleMessages = [{ id: 'm1', text: 'Encrypted peer message' }];

      mockStorage['aetheris_posts'] = JSON.stringify(samplePosts);
      mockStorage['aetheris_bookmarks'] = JSON.stringify(sampleBookmarks);
      mockStorage['aetheris_drafts'] = JSON.stringify(sampleDrafts);
      mockStorage['aetheris_direct_messages'] = JSON.stringify(sampleMessages);
      mockStorage['aetheris_theme'] = 'obsidian-cyber';
      mockStorage['aetheris_keypair'] = JSON.stringify({ pub: 'ed25519:abc123' });

      const report = manager.computeBackupSize();

      expect(report.posts).toBe(2);
      expect(report.bookmarks).toBe(1);
      expect(report.drafts).toBe(1);
      expect(report.messages).toBe(1);
      expect(report.preferences).toBe(1);
      expect(report.keys).toBe(1);
      expect(report.totalItems).toBe(7);
      expect(report.totalKB).toBeGreaterThan(0);
    });

    it('should export singleton instance exportBackup correctly', () => {
      expect(exportBackup).toBeInstanceOf(ExportBackupManager);
      expect(typeof exportBackup.exportAccount).toBe('function');
      expect(typeof exportBackup.importAccount).toBe('function');
    });

    it('should retrieve last export metadata cleanly', () => {
      mockStorage['aetheris_last_export_time'] = '1700000000000';
      mockStorage['aetheris_last_export_count'] = '42';

      const meta = manager.getLastExportMeta();
      expect(meta.lastExportTime).toBe(1700000000000);
      expect(meta.lastExportCount).toBe(42);
    });
  });

  // ─── 2. DATA COLLECTION & SELECTION ─────────────────────────────────────────

  describe('2. Granular Storage Extraction & Manifest Generation', () => {
    it('should export unencrypted JSON payload with integrity checksum', async () => {
      mockStorage['aetheris_posts'] = JSON.stringify([{ id: 'p1', title: 'Aetheris Core' }]);
      mockStorage['aetheris_bookmarks'] = JSON.stringify([{ id: 'b1', title: 'Saved Article' }]);

      const options: ExportOptions = {
        includePosts: true,
        includeBookmarks: true,
        includeDrafts: false,
        includeMessages: false,
        includePreferences: false,
        includeKeys: false,
        encryptWithPassword: false,
        format: 'json',
      };

      const blob = await manager.exportAccount(options);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toContain('application/json');

      const text = await blob.text();
      const payload: RawBackupPayload = JSON.parse(text);

      expect(payload.manifest.version).toBe('1.4.0');
      expect(payload.manifest.encrypted).toBe(false);
      expect(payload.manifest.dataTypes).toEqual(['posts', 'bookmarks']);
      expect(payload.manifest.itemCount).toBe(2);
      expect(payload.manifest.checksum).toBeDefined();
      expect(payload.manifest.checksum.length).toBe(64); // SHA-256 hex length
      expect(payload.posts?.length).toBe(1);
      expect(payload.bookmarks?.length).toBe(1);
      expect(payload.drafts).toBeUndefined();
    });

    it('should generate virtualFiles structure when zip-json format is requested', async () => {
      mockStorage['aetheris_posts'] = JSON.stringify([{ id: 'p1', text: 'Hello' }]);
      mockStorage['aetheris_drafts'] = JSON.stringify([{ key: 'd1', text: 'Draft' }]);

      const options: ExportOptions = {
        includePosts: true,
        includeBookmarks: false,
        includeDrafts: true,
        includeMessages: false,
        includePreferences: false,
        includeKeys: false,
        encryptWithPassword: false,
        format: 'zip-json',
      };

      const blob = await manager.exportAccount(options);
      const text = await blob.text();
      const payload: RawBackupPayload = JSON.parse(text);

      expect(payload.virtualFiles).toBeDefined();
      expect(payload.virtualFiles?.['manifest.json']).toBeDefined();
      expect(payload.virtualFiles?.['posts/posts.json']).toBeDefined();
      expect(payload.virtualFiles?.['drafts/drafts.json']).toBeDefined();
    });
  });

  // ─── 3. AES-256-GCM ENCRYPTED EXPORT & KEY DERIVATION ───────────────────────

  describe('3. Cryptographic AES-256-GCM Encrypted Export', () => {
    it('should encrypt payload with PBKDF2 (100k iterations) and AES-256-GCM', async () => {
      mockStorage['aetheris_posts'] = JSON.stringify([{ id: 'p-secret', text: 'Classified Sovereign Protocol' }]);

      const options: ExportOptions = {
        includePosts: true,
        includeBookmarks: false,
        includeDrafts: false,
        includeMessages: false,
        includePreferences: false,
        includeKeys: false,
        encryptWithPassword: true,
        password: 'SovereignPassword2026!',
        format: 'encrypted-json',
      };

      const blob = await manager.exportAccount(options);
      const text = await blob.text();
      const envelope: EncryptedBackupEnvelope = JSON.parse(text);

      expect(envelope.format).toBe('aetheris-encrypted-v1');
      expect(envelope.version).toBe('1.4.0');
      expect(envelope.iterations).toBe(100000);
      expect(envelope.salt).toBeDefined();
      expect(envelope.iv).toBeDefined();
      expect(envelope.cipherText).toBeDefined();
      expect(envelope.manifest.encrypted).toBe(true);

      // Ciphertext should not contain plaintext strings
      expect(text).not.toContain('Classified Sovereign Protocol');
    });

    it('should throw error when encryptWithPassword is true but password is missing', async () => {
      const options: ExportOptions = {
        includePosts: true,
        includeBookmarks: false,
        includeDrafts: false,
        includeMessages: false,
        includePreferences: false,
        includeKeys: false,
        encryptWithPassword: true,
        password: '',
        format: 'encrypted-json',
      };

      await expect(manager.exportAccount(options)).rejects.toThrow('A password is required');
    });
  });

  // ─── 4. RESTORATION & IMPORT ENGINE ─────────────────────────────────────────

  describe('4. Account Restoration & Import Engine', () => {
    it('should import and restore unencrypted backup file cleanly', async () => {
      const payload: RawBackupPayload = {
        manifest: {
          version: '1.4.0',
          createdAt: Date.now(),
          deviceFP: 'fp_test',
          dataTypes: ['posts', 'bookmarks'],
          itemCount: 2,
          encrypted: false,
          checksum: 'abc',
        },
        posts: [{ id: 'restored-post-1', title: 'Restored Sovereign Post' }],
        bookmarks: [{ id: 'restored-bm-1', title: 'Restored Bookmark' }],
      };

      const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
      const result = await manager.importAccount(file);

      expect(result.imported).toBe(2);
      expect(result.errors).toBe(0);

      const storedPosts = JSON.parse(mockStorage['aetheris_posts'] || '[]');
      expect(storedPosts.length).toBe(1);
      expect(storedPosts[0].id).toBe('restored-post-1');

      const storedBookmarks = JSON.parse(mockStorage['aetheris_bookmarks'] || '[]');
      expect(storedBookmarks.length).toBe(1);
      expect(storedBookmarks[0].id).toBe('restored-bm-1');
    });

    it('should import and restore encrypted backup envelope with valid password', async () => {
      mockStorage['aetheris_posts'] = JSON.stringify([{ id: 'p-encrypted-import', title: 'Secret Post' }]);

      // First export encrypted
      const blob = await manager.exportAccount({
        includePosts: true,
        includeBookmarks: false,
        includeDrafts: false,
        includeMessages: false,
        includePreferences: false,
        includeKeys: false,
        encryptWithPassword: true,
        password: 'CorrectMasterKey123',
        format: 'encrypted-json',
      });

      // Clear storage
      mockStorage = {};

      const file = new File([await blob.text()], 'backup.aether-vault', { type: 'application/json' });
      const result = await manager.importAccount(file, 'CorrectMasterKey123');

      expect(result.imported).toBe(1);
      expect(result.errors).toBe(0);

      const restored = JSON.parse(mockStorage['aetheris_posts'] || '[]');
      expect(restored.length).toBe(1);
      expect(restored[0].id).toBe('p-encrypted-import');
    });

    it('should fail decryption when incorrect password is provided', async () => {
      mockStorage['aetheris_posts'] = JSON.stringify([{ id: 'p1', title: 'Sensitive Post' }]);

      const blob = await manager.exportAccount({
        includePosts: true,
        includeBookmarks: false,
        includeDrafts: false,
        includeMessages: false,
        includePreferences: false,
        includeKeys: false,
        encryptWithPassword: true,
        password: 'TruePassword',
        format: 'encrypted-json',
      });

      const file = new File([await blob.text()], 'vault.json', { type: 'application/json' });
      await expect(manager.importAccount(file, 'WrongPassword')).rejects.toThrow('Incorrect password');
    });

    it('should reject invalid non-JSON files with descriptive error', async () => {
      const corruptedFile = new File(['this is not valid JSON!'], 'corrupt.json', { type: 'application/json' });
      await expect(manager.importAccount(corruptedFile)).rejects.toThrow('does not contain valid JSON');
    });

    it('should unpack virtual files from zip-json format during import', async () => {
      const virtualPayload: RawBackupPayload = {
        manifest: {
          version: '1.4.0',
          createdAt: Date.now(),
          deviceFP: 'fp_test',
          dataTypes: ['posts'],
          itemCount: 1,
          encrypted: false,
          checksum: '123',
        },
        virtualFiles: {
          'manifest.json': JSON.stringify({ version: '1.4.0' }),
          'posts/posts.json': JSON.stringify([{ id: 'virtual-p1', title: 'From Virtual File' }]),
        },
      };

      const file = new File([JSON.stringify(virtualPayload)], 'virtual.zip-json', { type: 'application/json' });
      const res = await manager.importAccount(file);

      expect(res.imported).toBe(1);
      const stored = JSON.parse(mockStorage['aetheris_posts'] || '[]');
      expect(stored[0].id).toBe('virtual-p1');
    });
  });

  // ─── 5. HTML TEMPLATE RENDERING ─────────────────────────────────────────────

  describe('5. HTML Component Rendering & UI Templates', () => {
    it('should render complete export panel with all checkboxes and options', () => {
      const html = manager.renderExportPanel();

      expect(html).toContain('id="aetheris-export-backup-container"');
      expect(html).toContain('Sovereign Export &amp; Backup');
      expect(html).toContain('id="chk-export-posts"');
      expect(html).toContain('id="chk-export-bookmarks"');
      expect(html).toContain('id="chk-export-drafts"');
      expect(html).toContain('id="chk-export-messages"');
      expect(html).toContain('id="chk-export-preferences"');
      expect(html).toContain('id="chk-export-keys"');
      expect(html).toContain('id="toggle-export-encrypt"');
      expect(html).toContain('id="export-backup-password"');
      expect(html).toContain('id="btn-run-export"');
      expect(html).toContain('id="aether-backup-dropzone"');
      expect(html).toContain('id="aether-backup-file-input"');
      expect(html).toContain('bg-surface-base');
      expect(html).toContain('bg-surface-raised');
    });

    it('should render quick access export button for settings rail', () => {
      const html = manager.renderExportButton();

      expect(html).toContain('id="btn-open-backup-export"');
      expect(html).toContain('Backup &amp; Export');
      expect(html).toContain('📂');
      expect(html).toContain('bg-surface-raised');
    });

    it('should attach event listeners to DOM root cleanly', () => {
      const mockRoot = {
        querySelector: vi.fn(() => null),
      } as unknown as HTMLElement;

      expect(() => manager.attachEventListeners(mockRoot)).not.toThrow();
    });
  });
});
