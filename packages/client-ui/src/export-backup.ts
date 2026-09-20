import { sovereignDialog } from './dialog-modal.js';
import { renderIcon } from './ui/icons.js';
import { renderExportPanelHTML } from './export-backup-ui.js';
/**
 * @file export-backup.ts
 * @package @aetheris/client-ui
 * @description Sovereign Account Backup, Export & Restore Engine for UREfy.
 * Provides client-side encrypted backups (AES-256-GCM / PBKDF2), multi-file virtual archives,
 * integrity checksums, granular payload selection, responsive Obsidian-styled UI components,
 * and seamless import/export operations without external dependencies.
 */

// ─── INTERFACES & DATA TYPES ──────────────────────────────────────────────────

/**
 * Metadata manifest included in every UREfy backup archive.
 */
export interface BackupManifest {
  version: string;
  createdAt: number;
  deviceFP: string;
  dataTypes: string[];
  itemCount: number;
  encrypted: boolean;
  checksum: string;
}

/**
 * Configuration options for generating an account backup.
 */
export interface ExportOptions {
  includePosts: boolean;
  includeBookmarks: boolean;
  includeDrafts: boolean;
  includeMessages: boolean;
  includePreferences: boolean;
  includeKeys: boolean;
  encryptWithPassword: boolean;
  password?: string;
  format: 'json' | 'zip-json' | 'encrypted-json';
}

/**
 * Detailed size and count telemetry of local data stores.
 */
export interface BackupSizeReport {
  posts: number;
  bookmarks: number;
  drafts: number;
  messages: number;
  keys: number;
  preferences: number;
  totalKB: number;
  totalItems: number;
}

/**
 * Results returned after an account import operation.
 */
export interface ImportReport {
  imported: number;
  errors: number;
  categories: Record<string, number>;
  manifest?: BackupManifest;
  warnings: string[];
}

/**
 * Encrypted envelope format for password-protected archives.
 */
export interface EncryptedBackupEnvelope {
  format: 'aetheris-encrypted-v1' | 'aetheris-encrypted-v2';
  version: string;
  salt: string;
  iv: string;
  iterations: number;
  cipherText: string;
  manifest: BackupManifest;
}

/**
 * Unencrypted payload structure containing all selected entities.
 */
export interface RawBackupPayload {
  manifest: BackupManifest;
  posts?: unknown[];
  bookmarks?: unknown[];
  drafts?: Record<string, unknown>[];
  messages?: unknown[];
  preferences?: Record<string, unknown>;
  keys?: Record<string, unknown>;
  virtualFiles?: Record<string, string>;
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Escapes HTML characters to prevent XSS in rendered templates.
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a Unix timestamp into a relative time description.
 */
function formatRelativeTimeEn(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return 'never';
  const now = Date.now();
  const elapsedSec = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (elapsedSec < 45) return 'just now';
  if (elapsedSec < 120) return '1 minute ago';
  if (elapsedSec < 3600) return `${Math.floor(elapsedSec / 60)} minutes ago`;
  if (elapsedSec < 7200) return '1 hour ago';
  if (elapsedSec < 86400) return `${Math.floor(elapsedSec / 3600)} hours ago`;
  if (elapsedSec < 172800) return 'yesterday';
  if (elapsedSec < 604800) return `${Math.floor(elapsedSec / 86400)} days ago`;
  if (elapsedSec < 2592000) return `${Math.floor(elapsedSec / 604800)} weeks ago`;
  
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Converts a byte array buffer to a hex string.
 */
function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Converts a hex string back to a Uint8Array.
 */
function hexToBuffer(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Converts a Uint8Array into a Base64 string.
 */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string into a Uint8Array.
 */
function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Computes cryptographic SHA-256 hash using Web Crypto API.
 */
async function computeSha256(data: string | Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const buffer = typeof data === 'string' ? enc.encode(data) : data;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', buffer as unknown as BufferSource);
    return bufferToHex(digest);
  }
  throw new Error('Web Crypto is required to verify backup integrity.');
}

/**
 * Generates or retrieves a persistent pseudo-anonymous device fingerprint.
 */
function getDeviceFingerprint(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('aetheris_device_fp');
      if (stored) return stored;
      const nav = window.navigator;
      const screen = window.screen;
      const rawSeed = `${nav.userAgent}|${nav.language}|${screen.width}x${screen.height}|${Date.now()}|${Math.random()}`;
      let hash = 0;
      for (let i = 0; i < rawSeed.length; i++) {
        hash = (hash << 5) - hash + rawSeed.charCodeAt(i);
        hash |= 0;
      }
      const fp = 'fp_' + Math.abs(hash).toString(16).padStart(8, '0') + Math.random().toString(16).substring(2, 6);
      localStorage.setItem('aetheris_device_fp', fp);
      return fp;
    }
  } catch {
    // ignore
  }
  return 'fp_node_isolated_' + Math.random().toString(16).substring(2, 10);
}

// ─── EXPORT & BACKUP MANAGER CLASS ────────────────────────────────────────────

/**
 * Complete Account Export and Backup Manager for UREfy.
 * Handles granular data extraction, AES-256-GCM encryption with PBKDF2 key derivation,
 * multi-file JSON archiving, integrity verification, safe restoration, and modern UI templates.
 */
export class ExportBackupManager {
  private readonly version: string = '1.4.0';
  private readonly storageKeys = {
    posts: ['aetheris_posts', 'aetheris_client_posts', 'aetheris_feed_posts'],
    bookmarks: ['aetheris_bookmarks', 'aetheris_vault_bookmarks'],
    drafts: ['aetheris_drafts', 'aetheris_draft_v2', 'aetheris_active_draft', 'aetheris_saved_drafts'],
    messages: ['aetheris_direct_messages', 'aetheris_dm_conversations', 'aetheris_channel_messages', 'aetheris_messages'],
    preferences: ['aetheris_theme_preferences', 'aetheris_theme', 'aetheris_density_mode', 'aetheris_sound_enabled', 'aetheris_ui_settings'],
    keys: ['aetheris_keypair', 'aetheris_identity', 'aetheris_zk_nullifier', 'aetheris_rln_secret', 'aetheris_master_seed'],
    lastExportTime: 'aetheris_last_export_time',
    lastExportCount: 'aetheris_last_export_count'
  };

  /**
   * Computes the total item count and memory footprint across all storage categories.
   */
  public computeBackupSize(): BackupSizeReport {
    const report: BackupSizeReport = {
      posts: 0,
      bookmarks: 0,
      drafts: 0,
      messages: 0,
      keys: 0,
      preferences: 0,
      totalKB: 0,
      totalItems: 0
    };

    if (typeof window === 'undefined' || !window.localStorage) {
      return report;
    }

    let totalChars = 0;

    // 1. Posts count & size
    for (const key of this.storageKeys.posts) {
      const raw = localStorage.getItem(key);
      if (raw) {
        totalChars += raw.length;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            report.posts += parsed.length;
          } else if (parsed && typeof parsed === 'object') {
            report.posts += Object.keys(parsed).length;
          }
        } catch {
          report.posts += 1;
        }
      }
    }

    // 2. Bookmarks count & size
    for (const key of this.storageKeys.bookmarks) {
      const raw = localStorage.getItem(key);
      if (raw) {
        totalChars += raw.length;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            report.bookmarks += parsed.length;
          } else if (parsed && typeof parsed === 'object') {
            report.bookmarks += Object.keys(parsed).length;
          }
        } catch {
          report.bookmarks += 1;
        }
      }
    }

    // 3. Drafts count & size
    for (const key of this.storageKeys.drafts) {
      const raw = localStorage.getItem(key);
      if (raw) {
        totalChars += raw.length;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            report.drafts += parsed.length;
          } else if (parsed && typeof parsed === 'object') {
            report.drafts += Object.keys(parsed).length;
          }
        } catch {
          report.drafts += 1;
        }
      }
    }

    // 4. Messages count & size
    for (const key of this.storageKeys.messages) {
      const raw = localStorage.getItem(key);
      if (raw) {
        totalChars += raw.length;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            report.messages += parsed.length;
          } else if (parsed && typeof parsed === 'object') {
            // Check for conversations map
            let count = 0;
            for (const sub of Object.values(parsed)) {
              if (sub && typeof sub === 'object' && Array.isArray((sub as Record<string, unknown>).messages)) {
                count += ((sub as Record<string, unknown>).messages as unknown[]).length;
              } else {
                count++;
              }
            }
            report.messages += count;
          }
        } catch {
          report.messages += 1;
        }
      }
    }

    // 5. Preferences count & size
    for (const key of this.storageKeys.preferences) {
      const raw = localStorage.getItem(key);
      if (raw) {
        totalChars += raw.length;
        report.preferences += 1;
      }
    }

    // 6. Keys count & size
    for (const key of this.storageKeys.keys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        totalChars += raw.length;
        report.keys += 1;
      }
    }

    report.totalItems = report.posts + report.bookmarks + report.drafts + report.messages + report.keys + report.preferences;
    // Estimated UTF-8 / JSON size in Kilobytes (plus structure overhead)
    report.totalKB = Math.max(0.1, Math.round((totalChars / 1024) * 10) / 10);

    return report;
  }

  /**
   * Collects all structured data from localStorage based on export options.
   */
  private collectRawStorageData(options: ExportOptions): { payload: RawBackupPayload; itemCount: number } {
    const dataTypes: string[] = [];
    let itemCount = 0;

    const payload: RawBackupPayload = {
      manifest: {
        version: this.version,
        createdAt: Date.now(),
        deviceFP: getDeviceFingerprint(),
        dataTypes: [],
        itemCount: 0,
        encrypted: options.encryptWithPassword,
        checksum: ''
      }
    };

    if (typeof window === 'undefined' || !window.localStorage) {
      return { payload, itemCount: 0 };
    }

    // 1. Posts
    if (options.includePosts) {
      dataTypes.push('posts');
      const posts: unknown[] = [];
      for (const key of this.storageKeys.posts) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              posts.push(...parsed);
            } else if (parsed) {
              posts.push(parsed);
            }
          } catch {
            // raw string fallback
            posts.push({ rawKey: key, value: raw });
          }
        }
      }
      payload.posts = posts;
      itemCount += posts.length;
    }

    // 2. Bookmarks
    if (options.includeBookmarks) {
      dataTypes.push('bookmarks');
      const bookmarks: unknown[] = [];
      for (const key of this.storageKeys.bookmarks) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              bookmarks.push(...parsed);
            } else if (parsed) {
              bookmarks.push(parsed);
            }
          } catch {
            bookmarks.push({ rawKey: key, value: raw });
          }
        }
      }
      payload.bookmarks = bookmarks;
      itemCount += bookmarks.length;
    }

    // 3. Drafts
    if (options.includeDrafts) {
      dataTypes.push('drafts');
      const drafts: Record<string, unknown>[] = [];
      for (const key of this.storageKeys.drafts) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              drafts.push(...parsed);
            } else if (parsed && typeof parsed === 'object') {
              drafts.push(parsed as Record<string, unknown>);
            }
          } catch {
            drafts.push({ rawKey: key, value: raw });
          }
        }
      }
      payload.drafts = drafts;
      itemCount += drafts.length;
    }

    // 4. Messages & DMs
    if (options.includeMessages) {
      dataTypes.push('messages');
      const messages: unknown[] = [];
      for (const key of this.storageKeys.messages) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              messages.push(...parsed);
            } else if (parsed) {
              messages.push(parsed);
            }
          } catch {
            messages.push({ rawKey: key, value: raw });
          }
        }
      }
      payload.messages = messages;
      itemCount += messages.length;
    }

    // 5. Preferences & UI Theme
    if (options.includePreferences) {
      dataTypes.push('preferences');
      const preferences: Record<string, unknown> = {};
      for (const key of this.storageKeys.preferences) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            preferences[key] = JSON.parse(raw);
          } catch {
            preferences[key] = raw;
          }
          itemCount++;
        }
      }
      payload.preferences = preferences;
    }

    // 6. Cryptographic Keys & ZK Secrets
    if (options.includeKeys) {
      dataTypes.push('keys');
      const keys: Record<string, unknown> = {};
      for (const key of this.storageKeys.keys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            keys[key] = JSON.parse(raw);
          } catch {
            keys[key] = raw;
          }
          itemCount++;
        }
      }
      payload.keys = keys;
    }

    // If simulated multi-file ZIP-JSON format is requested, organize virtual directory structure
    if (options.format === 'zip-json') {
      const virtualFiles: Record<string, string> = {
        'manifest.json': JSON.stringify(payload.manifest, null, 2)
      };
      if (payload.posts) virtualFiles['posts/posts.json'] = JSON.stringify(payload.posts, null, 2);
      if (payload.bookmarks) virtualFiles['bookmarks/bookmarks.json'] = JSON.stringify(payload.bookmarks, null, 2);
      if (payload.drafts) virtualFiles['drafts/drafts.json'] = JSON.stringify(payload.drafts, null, 2);
      if (payload.messages) virtualFiles['messages/direct_messages.json'] = JSON.stringify(payload.messages, null, 2);
      if (payload.preferences) virtualFiles['config/preferences.json'] = JSON.stringify(payload.preferences, null, 2);
      if (payload.keys) virtualFiles['vault/cryptographic_identity.json'] = JSON.stringify(payload.keys, null, 2);
      payload.virtualFiles = virtualFiles;
    }

    payload.manifest.dataTypes = dataTypes;
    payload.manifest.itemCount = itemCount;

    return { payload, itemCount };
  }

  /**
   * Encrypts plaintext JSON data with AES-256-GCM deriving keys via PBKDF2 (100,000 iterations).
   */
  private async encryptPayload(plaintext: string, password: string, manifest: BackupManifest): Promise<EncryptedBackupEnvelope> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('Web Crypto API (SubtleCrypto) is not available in this context.');
    }

    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const iterations = 100000;

    // Import master password
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive 256-bit AES-GCM Key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Encrypt payload
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      enc.encode(plaintext)
    );

    const cipherText = uint8ToBase64(new Uint8Array(cipherBuffer));
    const saltBase64 = uint8ToBase64(salt);
    const ivBase64 = uint8ToBase64(iv);

    return {
      format: 'aetheris-encrypted-v1',
      version: this.version,
      salt: saltBase64,
      iv: ivBase64,
      iterations,
      cipherText,
      manifest
    };
  }

  /**
   * Decrypts an AES-256-GCM envelope using the provided master password.
   */
  private async decryptPayload(envelope: EncryptedBackupEnvelope, password: string): Promise<string> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('Web Crypto API (SubtleCrypto) is not available.');
    }

    const enc = new TextEncoder();
    const dec = new TextDecoder();

    const salt = base64ToUint8(envelope.salt);
    const iv = base64ToUint8(envelope.iv);
    const cipherBytes = base64ToUint8(envelope.cipherText);
    const iterations = envelope.iterations || 100000;

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    try {
      const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        key,
        cipherBytes as unknown as BufferSource
      );
      return dec.decode(plainBuffer);
    } catch {
      throw new Error('Incorrect password or corrupted backup file (AES-GCM tag mismatch).');
    }
  }

  /**
   * Automatically triggers a browser file download for the generated blob.
   */
  private triggerDownload(blob: Blob, filename: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  /**
   * Exports account data into a structured file and triggers client-side download.
   */
  public async exportAccount(options: ExportOptions): Promise<Blob> {
    if (options.includeKeys || options.includeMessages) {
      throw new Error('Use the encrypted recovery archive for identity backups and signed DM transcripts for private messages.');
    }
    const { payload, itemCount } = this.collectRawStorageData(options);

    // Compute integrity checksum over canonical representation
    const unhashedJson = JSON.stringify(payload);
    const checksum = await computeSha256(unhashedJson);
    payload.manifest.checksum = checksum;

    let finalContent: string;
    let extension = 'json';

    if (options.encryptWithPassword) {
      if (!options.password || options.password.length < 1) {
        throw new Error('A password is required to export an encrypted backup.');
      }
      const envelope = await this.encryptPayload(JSON.stringify(payload, null, 2), options.password, payload.manifest);
      finalContent = JSON.stringify(envelope, null, 2);
      extension = options.format === 'zip-json' ? 'ure.zip-json' : 'ure-vault.json';
    } else {
      if (options.format === 'zip-json') {
        finalContent = JSON.stringify(payload, null, 2);
        extension = 'ure.zip-json';
      } else {
        finalContent = JSON.stringify(payload, null, 2);
        extension = 'ure-backup.json';
      }
    }

    // Record last export time & count
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKeys.lastExportTime, Date.now().toString());
        localStorage.setItem(this.storageKeys.lastExportCount, itemCount.toString());
      }
    } catch {
      // ignore
    }

    const blob = new Blob([finalContent], { type: 'application/json;charset=utf-8' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `urefy_backup_${timestamp}.${extension}`;

    this.triggerDownload(blob, filename);
    return blob;
  }

  /**
   * Imports and restores account data from a selected backup file.
   */
  public async importAccount(file: File, providedPassword?: string): Promise<{ imported: number; errors: number }> {
    if (file.size > 10 * 1024 * 1024) throw new Error('Backup exceeds the 10 MiB limit.');
    const report: ImportReport = {
      imported: 0,
      errors: 0,
      categories: {},
      warnings: []
    };

    let fileText: string;
    try {
      fileText = await file.text();
    } catch (err) {
      throw new Error(`Failed to read selected file: ${(err as Error).message}`);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(fileText);
    } catch {
      throw new Error('Selected file does not contain valid JSON.');
    }

    let payload: RawBackupPayload;

    // Detect if this is an encrypted envelope
    const isEncrypted = parsedJson && typeof parsedJson === 'object' && ('cipherText' in (parsedJson as Record<string, unknown>));

    if (isEncrypted) {
      const envelope = parsedJson as EncryptedBackupEnvelope;
      let password = providedPassword;
      if (!password) {
        if (typeof window !== 'undefined' && (window as any).sovereignDialog) {
          password = (await (window as any).sovereignDialog.prompt('Enter the decryption password for this UREfy backup:', { title: 'Decryption Password', inputType: 'password' })) || undefined;
        }
      }
      if (!password) {
        throw new Error('Decryption cancelled: No password was provided.');
      }

      const decryptedText = await this.decryptPayload(envelope, password);
      try {
        payload = JSON.parse(decryptedText) as RawBackupPayload;
      } catch {
        throw new Error('Failed to parse decrypted data.');
      }
    } else {
      payload = parsedJson as RawBackupPayload;
    }

    if (!payload || typeof payload !== 'object') {
      throw new Error('Backup data structure is invalid.');
    }

    if (!payload.manifest || payload.manifest.version !== this.version || !/^[a-f0-9]{64}$/.test(payload.manifest.checksum)) {
      throw new Error('Backup manifest or checksum is invalid.');
    }
    const expectedChecksum = payload.manifest.checksum;
    payload.manifest.checksum = '';
    const actualChecksum = await computeSha256(JSON.stringify(payload));
    payload.manifest.checksum = expectedChecksum;
    if (actualChecksum !== expectedChecksum) throw new Error('Backup checksum does not match its contents.');
    report.manifest = payload.manifest;

    // Handle virtual files unpack if present
    if (payload.virtualFiles && typeof payload.virtualFiles === 'object') {
      if (payload.virtualFiles['posts/posts.json'] && !payload.posts) {
        try { payload.posts = JSON.parse(payload.virtualFiles['posts/posts.json']); } catch { /* ignore */ }
      }
      if (payload.virtualFiles['bookmarks/bookmarks.json'] && !payload.bookmarks) {
        try { payload.bookmarks = JSON.parse(payload.virtualFiles['bookmarks/bookmarks.json']); } catch { /* ignore */ }
      }
      if (payload.virtualFiles['drafts/drafts.json'] && !payload.drafts) {
        try { payload.drafts = JSON.parse(payload.virtualFiles['drafts/drafts.json']); } catch { /* ignore */ }
      }
      if (payload.virtualFiles['messages/direct_messages.json'] && !payload.messages) {
        try { payload.messages = JSON.parse(payload.virtualFiles['messages/direct_messages.json']); } catch { /* ignore */ }
      }
      if (payload.virtualFiles['config/preferences.json'] && !payload.preferences) {
        try { payload.preferences = JSON.parse(payload.virtualFiles['config/preferences.json']); } catch { /* ignore */ }
      }
      if (payload.virtualFiles['vault/cryptographic_identity.json'] && !payload.keys) {
        try { payload.keys = JSON.parse(payload.virtualFiles['vault/cryptographic_identity.json']); } catch { /* ignore */ }
      }
    }

    if (payload.keys || payload.messages) {
      throw new Error('Legacy identity and message imports are not supported. Use the encrypted recovery archive or a signed DM transcript.');
    }
    if (payload.preferences && (Array.isArray(payload.preferences) || typeof payload.preferences !== 'object'
      || Object.keys(payload.preferences).some(key => !this.storageKeys.preferences.includes(key)))) {
      throw new Error('Backup contains unsupported preference keys.');
    }

    // 1. Restore Posts
    if (Array.isArray(payload.posts) && payload.posts.length > 0) {
      try {
        const targetKey = 'aetheris_posts';
        const existing = localStorage.getItem(targetKey);
        let merged = payload.posts;
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            if (Array.isArray(parsed)) {
              const map = new Map<string, unknown>();
              for (const p of parsed) if (p && typeof p === 'object' && 'id' in p) map.set((p as { id: string }).id, p);
              for (const p of payload.posts) if (p && typeof p === 'object' && 'id' in p) map.set((p as { id: string }).id, p);
              merged = Array.from(map.values());
            }
          } catch {
            // use imported as authoritative
          }
        }
        localStorage.setItem(targetKey, JSON.stringify(merged));
        report.imported += payload.posts.length;
        report.categories['posts'] = payload.posts.length;
      } catch (err) {
        report.errors++;
        report.warnings.push(`Failed to restore posts: ${(err as Error).message}`);
      }
    }

    // 2. Restore Bookmarks
    if (Array.isArray(payload.bookmarks) && payload.bookmarks.length > 0) {
      try {
        const targetKey = 'aetheris_bookmarks';
        const existing = localStorage.getItem(targetKey);
        let merged = payload.bookmarks;
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            if (Array.isArray(parsed)) {
              const map = new Map<string, unknown>();
              for (const b of parsed) if (b && typeof b === 'object' && 'id' in b) map.set((b as { id: string }).id, b);
              for (const b of payload.bookmarks) if (b && typeof b === 'object' && 'id' in b) map.set((b as { id: string }).id, b);
              merged = Array.from(map.values());
            }
          } catch {
            // use imported
          }
        }
        localStorage.setItem(targetKey, JSON.stringify(merged));
        report.imported += payload.bookmarks.length;
        report.categories['bookmarks'] = payload.bookmarks.length;
      } catch (err) {
        report.errors++;
        report.warnings.push(`Failed to restore bookmarks: ${(err as Error).message}`);
      }
    }

    // 3. Restore Drafts
    if (Array.isArray(payload.drafts) && payload.drafts.length > 0) {
      try {
        const targetKey = 'aetheris_drafts';
        const existing = localStorage.getItem(targetKey);
        let merged = payload.drafts;
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            if (Array.isArray(parsed)) {
              const map = new Map<string, unknown>();
              for (const d of parsed) if (d && typeof d === 'object' && 'key' in d) map.set((d as { key: string }).key, d);
              for (const d of payload.drafts) if (d && typeof d === 'object' && 'key' in d) map.set((d as { key: string }).key, d);
              merged = Array.from(map.values()) as Record<string, unknown>[];
            }
          } catch {
            // use imported
          }
        }
        localStorage.setItem(targetKey, JSON.stringify(merged));
        report.imported += payload.drafts.length;
        report.categories['drafts'] = payload.drafts.length;
      } catch (err) {
        report.errors++;
        report.warnings.push(`Failed to restore drafts: ${(err as Error).message}`);
      }
    }

    // 5. Restore Preferences
    if (payload.preferences && typeof payload.preferences === 'object') {
      try {
        let count = 0;
        for (const [k, v] of Object.entries(payload.preferences)) {
          if (typeof v === 'string') {
            localStorage.setItem(k, v);
          } else {
            localStorage.setItem(k, JSON.stringify(v));
          }
          count++;
        }
        report.imported += count;
        report.categories['preferences'] = count;
      } catch (err) {
        report.errors++;
        report.warnings.push(`Failed to restore preferences: ${(err as Error).message}`);
      }
    }

    // Dispatch global custom event for reactive UI updates across modules
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aetheris:backup-restored', { detail: report }));
    }

    return {
      imported: report.imported,
      errors: report.errors
    };
  }

  /**
   * Retrieves timestamp and item count of last successful export.
   */
  public getLastExportMeta(): { lastExportTime: number; lastExportCount: number } {
    let lastExportTime = 0;
    let lastExportCount = 0;
    try {
      if (typeof localStorage !== 'undefined') {
        const rawTime = localStorage.getItem(this.storageKeys.lastExportTime);
        const rawCount = localStorage.getItem(this.storageKeys.lastExportCount);
        if (rawTime) lastExportTime = parseInt(rawTime, 10) || 0;
        if (rawCount) lastExportCount = parseInt(rawCount, 10) || 0;
      }
    } catch {
      // ignore
    }

    return { lastExportTime, lastExportCount };
  }

  // ─── UI RENDERING METHODS ───────────────────────────────────────────────────

  /**
   * Renders the complete, responsive Obsidian-styled Account Backup & Export Panel.
   */
  public renderExportPanel(): string {
    const sizeReport = this.computeBackupSize();
    const meta = this.getLastExportMeta();
    return renderExportPanelHTML(sizeReport, meta, this.version);
  }

  /**
   * Renders a quick access settings button for opening the Backup & Export modal.
   */
  public renderExportButton(): string {
    return `
      <button
        type="button"
        id="btn-open-backup-export"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 hover:border-cyphr/40 text-slate-200 hover:text-white text-xs font-medium transition-all shadow-sm group cursor-pointer"
        title="Open Account Backup and Export Panel"
      >
        <span class="text-base group-hover:rotate-12 transition-transform">📂</span>
        <span>Backup &amp; Export</span>
        <span class="w-1.5 h-1.5 rounded-full bg-cyphr"></span>
      </button>
    `;
  }

  /**
   * Attaches interactive DOM listeners to ensure 100% functional operation in browser context.
   */
  public attachEventListeners(root: HTMLElement | Document = document): void {
    if (typeof window === 'undefined') return;

    // Toggle encryption password field visibility
    const encryptToggle = root.querySelector('#toggle-export-encrypt') as HTMLInputElement | null;
    const pwdContainer = root.querySelector('#export-password-container') as HTMLElement | null;
    if (encryptToggle && pwdContainer) {
      encryptToggle.addEventListener('change', () => {
        if (encryptToggle.checked) {
          pwdContainer.classList.remove('hidden');
        } else {
          pwdContainer.classList.add('hidden');
        }
      });
    }

    // Toggle password character visibility
    const togglePwdBtn = root.querySelector('#btn-toggle-export-pwd') as HTMLButtonElement | null;
    const pwdInput = root.querySelector('#export-backup-password') as HTMLInputElement | null;
    if (togglePwdBtn && pwdInput) {
      togglePwdBtn.addEventListener('click', () => {
        if (pwdInput.type === 'password') {
          pwdInput.type = 'text';
        } else {
          pwdInput.type = 'password';
        }
      });
    }

    // Export execution handler
    const runExportBtn = root.querySelector('#btn-run-export') as HTMLButtonElement | null;
    if (runExportBtn) {
      runExportBtn.addEventListener('click', async () => {
        const postsChecked = (root.querySelector('#chk-export-posts') as HTMLInputElement)?.checked ?? true;
        const bookmarksChecked = (root.querySelector('#chk-export-bookmarks') as HTMLInputElement)?.checked ?? true;
        const draftsChecked = (root.querySelector('#chk-export-drafts') as HTMLInputElement)?.checked ?? true;
        const prefsChecked = (root.querySelector('#chk-export-preferences') as HTMLInputElement)?.checked ?? true;
        const encryptChecked = encryptToggle?.checked ?? true;
        const password = pwdInput?.value || '';
        const format = ((root.querySelector('#select-export-format') as HTMLSelectElement)?.value || 'json') as 'json' | 'zip-json' | 'encrypted-json';

        if (encryptChecked && !password) {
          await sovereignDialog.alert('Please enter a password to generate the encrypted backup.', { title: 'Password Required', type: 'warning' });
          pwdInput?.focus();
          return;
        }

        if (!encryptChecked) {
          const proceed = await sovereignDialog.confirm(
            'Warning: This export will be saved in unencrypted plaintext JSON. Anyone with access to this file will be able to read your saved Vault content and private data. Are you sure you want to proceed with an unencrypted export?',
            { title: 'Unencrypted Plaintext Export Warning', danger: true, confirmText: 'Export Unencrypted', cancelText: 'Cancel' }
          );
          if (!proceed) return;
        }

        const progressBarWrap = root.querySelector('#export-progress-bar-wrap') as HTMLElement | null;
        const progressBar = root.querySelector('#export-progress-bar') as HTMLElement | null;
        const progressStatus = root.querySelector('#export-progress-status') as HTMLElement | null;
        const progressPercentage = root.querySelector('#export-progress-percentage') as HTMLElement | null;

        if (progressBarWrap) progressBarWrap.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '20%';
        if (progressPercentage) progressPercentage.textContent = '20%';
        if (progressStatus) progressStatus.textContent = 'Collecting local data...';

        try {
          await new Promise(r => setTimeout(r, 200));
          if (progressBar) progressBar.style.width = '60%';
          if (progressPercentage) progressPercentage.textContent = '60%';
          if (progressStatus) progressStatus.textContent = encryptChecked ? 'Encrypting with AES-256-GCM...' : 'Generating JSON archive...';

          await new Promise(r => setTimeout(r, 200));

          await this.exportAccount({
            includePosts: postsChecked,
            includeBookmarks: bookmarksChecked,
            includeDrafts: draftsChecked,
            includeMessages: false,
            includePreferences: prefsChecked,
            includeKeys: false,
            encryptWithPassword: encryptChecked,
            password: password,
            format: format
          });

          if (progressBar) progressBar.style.width = '100%';
          if (progressPercentage) progressPercentage.textContent = '100%';
          if (progressStatus) progressStatus.textContent = 'Download started successfully!';

          // Update telemetry label
          const telemetryText = root.querySelector('#aether-export-telemetry-text') as HTMLElement | null;
          if (telemetryText) {
            const { lastExportCount } = this.getLastExportMeta();
            telemetryText.innerHTML = `Last export: <span class="text-slate-200 font-semibold">just now</span> | <span class="text-cyphr font-semibold">${lastExportCount} items</span>`;
          }

          setTimeout(() => {
            if (progressBarWrap) progressBarWrap.classList.add('hidden');
          }, 3000);
        } catch (err) {
          if (progressStatus) progressStatus.textContent = `Error: ${(err as Error).message}`;
          await sovereignDialog.alert(`Failed to export backup: ${(err as Error).message}`, { title: 'Export Failed', type: 'error' });
        }
      });
    }

    // Import Dropzone handlers
    const dropzone = root.querySelector('#aether-backup-dropzone') as HTMLElement | null;
    const fileInput = root.querySelector('#aether-backup-file-input') as HTMLInputElement | null;
    const feedbackBox = root.querySelector('#aether-import-feedback') as HTMLElement | null;

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => {
        fileInput.click();
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-signal', 'bg-signal/5');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-signal', 'bg-signal/5');
      });

      dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-signal', 'bg-signal/5');
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          await handleIncomingFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', async () => {
        if (fileInput.files && fileInput.files.length > 0) {
          await handleIncomingFile(fileInput.files[0]);
        }
      });
    }

    const handleIncomingFile = async (file: File) => {
      if (!feedbackBox) return;
      feedbackBox.classList.remove('hidden');
      feedbackBox.className = 'mt-4 p-4 rounded-xl text-xs font-mono bg-surface-raised border border-white/10 text-slate-300';
      feedbackBox.innerHTML = `<span class="text-cyphr animate-pulse">⏳ Processing and validating file: ${escapeHtml(file.name)}...</span>`;

      try {
        const result = await this.importAccount(file);
        feedbackBox.className = 'mt-4 p-4 rounded-xl text-xs font-mono bg-signal/10 border border-signal/30 text-signal';
        feedbackBox.innerHTML = `
          <div class="font-bold text-sm mb-1 flex items-center gap-1.5">
            <span>✅ Restore Completed Successfully!</span>
          </div>
          <div>• Total items restored: <strong>${result.imported}</strong></div>
          <div>• Errors encountered: <strong>${result.errors}</strong></div>
          <div class="mt-2 text-slate-300">Data synchronized to sovereign Local Vault.</div>
        `;
      } catch (err) {
        feedbackBox.className = 'mt-4 p-4 rounded-xl text-xs font-mono bg-crimson/10 border border-crimson/30 text-crimson';
        feedbackBox.innerHTML = `
          <div class="font-bold text-sm mb-1">❌ Restore Error</div>
          <div>${escapeHtml((err as Error).message)}</div>
        `;
      }
    };
  }

  public close(): void {
    if (typeof document !== 'undefined') {
      document.querySelectorAll('#export-modal-backdrop, #export-container-root').forEach(el => el.remove());
    }
  }
}

// ─── SINGLETON EXPORT ─────────────────────────────────────────────────────────

export const exportBackup = new ExportBackupManager();
if (typeof window !== 'undefined') {
  (window as any).exportBackup = exportBackup;
}
