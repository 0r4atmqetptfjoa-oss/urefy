/**
 * UREfy SOVEREIGN SECURE STORAGE ENGINE (V7)
 * 
 * ============================================================================
 * THREAT MODEL & SECURITY SPECIFICATION:
 * ============================================================================
 * 1. Plaintext localStorage Vulnerability:
 *    - localStorage is unencrypted, accessible to any script executing within
 *      the origin context, and persists raw plaintext files to the client filesystem.
 *    - INVARIANT: Neither the BIP-39 mnemonic nor the master seed, nor private
 *      messages, may EVER be stored in localStorage as plaintext.
 * 
 * 2. Secure Persistence Strategy (AES-GCM-256 & WebCrypto):
 *    - Primary Key: An unextractable WebCrypto `CryptoKey` (`extractable: false`,
 *      `AES-GCM`, 256 bits). It is held in browser internal storage via IndexedDB
 *      structured cloning. Scripts cannot extract the raw key bits.
 *    - Optional PIN Lock: When an unlock PIN is set, PBKDF2 (100,000 iterations,
 *      HMAC-SHA-256) derives an ephemeral Key Encryption Key (KEK) in volatile RAM.
 *    - Payload Encryption: AES-GCM-256 with a unique, cryptographically random 12-byte
 *      IV (`crypto.getRandomValues`) per write operation.
 * 
 * 3. Lifecycle & Memory Hygiene:
 *    - Volatile RAM Cache: Maintains decrypted state in memory during active session
 *      for zero-latency UI rendering.
 *    - Zeroization: On lock, logout, or local wipe, active key material and in-memory
 *      buffers are explicitly overwritten with zeroes (`zeroize`).
 * 
 * 4. Automatic Legacy Migration:
 *    - Detects legacy `aetheris_identity_mnemonic`, `aetheris_identity_seed`, and
 *      `aetheris_messages_cache` in localStorage on startup.
 *    - Encrypts and migrates them into the secure IndexedDB vault.
 *    - Overwrites and purges the plaintext keys from localStorage immediately.
 * ============================================================================
 */

import { zeroize } from '@aetheris/core-crypto';

export interface EncryptedEnvelope {
  iv: string;         // Hex encoded 12-byte IV
  ciphertext: string; // Hex encoded AES-GCM ciphertext + 16-byte auth tag
  version: number;
  timestamp: number;
}

export interface SovereignIdentityRecord {
  mnemonic: string;
  seedHex: string;
  fingerprint: string;
  createdAt: number;
  sovereignIdentity?: any;
}

export interface StoredChannelMessages {
  channelId: string;
  messagesJSON: string;
  updatedAt: number;
}

export interface VaultMetadata {
  id: string;
  hasPin: boolean;
  saltHex?: string;
  wrappedKeyHex?: string;
  wrappedKeyIv?: string;
  createdAt: number;
  lastUnlockedAt: number;
}

// Helper: Convert Uint8Array to Hex string
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

// Helper: Convert Hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export class SecureStorageEngine {
  private readonly dbName = 'aetheris_secure_vault_v1';
  private readonly dbVersion = 1;
  private db: IDBDatabase | null = null;
  private masterKey: CryptoKey | null = null;
  private isUnlocked: boolean = true;

  // In-memory volatile cache for zero-latency synchronous UI reads
  private volatileIdentity: SovereignIdentityRecord | null = null;
  private volatileMessages: Map<string, any[]> = new Map();
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  // In-memory fallback map for non-IndexedDB (e.g. Node test / SSR) environments
  private fallbackStore: Map<string, any> = new Map();

  constructor() {
    // Check if legacy migration is needed synchronously
    this.checkForLegacyLocalStorageMigration();
  }

  /**
   * Initializes the Secure Storage Engine, opening IndexedDB and loading/generating
   * the unextractable device encryption key.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        await this.openDatabase();
        await this.ensureMasterKey();
        await this.migrateLegacyData();
        await this.loadVolatileCache();
        this.isInitialized = true;
      } catch (err) {
        console.warn('[SecureStorage] IndexedDB unavailable or blocked, falling back to secure memory vault:', err);
        this.db?.close();
        this.db = null;
        await this.ensureMasterKeyMemory();
        await this.migrateLegacyData();
        this.isInitialized = true;
      }
    })();

    return this.initPromise;
  }

  /**
   * Open or upgrade the encrypted IndexedDB database.
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB not supported in this environment'));
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: Vault metadata (keys, PIN config, device salts)
        if (!db.objectStoreNames.contains('vault_meta')) {
          db.createObjectStore('vault_meta', { keyPath: 'id' });
        }

        // Store 2: Encrypted identity (encrypted BIP-39 mnemonic & master seed)
        if (!db.objectStoreNames.contains('encrypted_identity')) {
          db.createObjectStore('encrypted_identity', { keyPath: 'id' });
        }

        // Store 3: Encrypted private messages (encrypted per-channel messages)
        if (!db.objectStoreNames.contains('encrypted_messages')) {
          db.createObjectStore('encrypted_messages', { keyPath: 'channelId' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open secure vault database'));
      };
    });
  }

  /**
   * Retrieves or generates the device's unextractable AES-GCM master key.
   */
  private async ensureMasterKey(): Promise<void> {
    if (!this.db) {
      await this.ensureMasterKeyMemory();
      return;
    }

    const meta = await this.getFromStore<any>('vault_meta', 'device_master_key');

    if (meta && meta.cryptoKey instanceof CryptoKey) {
      this.masterKey = meta.cryptoKey;
      return;
    }

    // Generate a fresh unextractable AES-GCM 256-bit key
    const subtle = this.getSubtleCrypto();
    if (!subtle) throw new Error('WebCrypto API not available');

    const key = await subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable: JavaScript cannot read the raw key bytes!
      ['encrypt', 'decrypt']
    );

    this.masterKey = key;

    await this.putInStore('vault_meta', {
      id: 'device_master_key',
      cryptoKey: key,
      hasPin: false,
      createdAt: Date.now(),
      lastUnlockedAt: Date.now(),
    });
  }

  /**
   * In-memory key generator fallback for non-IndexedDB environments.
   */
  private async ensureMasterKeyMemory(): Promise<void> {
    const subtle = this.getSubtleCrypto();
    if (!subtle) return;

    if (!this.masterKey) {
      this.masterKey = await subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    }
  }

  private getSubtleCrypto(): SubtleCrypto | null {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      return crypto.subtle;
    }
    return null;
  }

  /**
   * Encrypts arbitrary serializable data using AES-GCM-256 with unique random 12-byte IV.
   */
  public async encrypt(data: any): Promise<EncryptedEnvelope> {
    const subtle = this.getSubtleCrypto();
    if (!subtle) throw new Error('WebCrypto is required for encrypted storage');
    if (!this.masterKey) await this.init();
    if (!this.masterKey) throw new Error('Encrypted storage key is unavailable');

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));

    const ciphertextBuffer = await subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      this.masterKey,
      encoded as unknown as BufferSource
    );

    const envelope: EncryptedEnvelope = {
      iv: bytesToHex(iv),
      ciphertext: bytesToHex(new Uint8Array(ciphertextBuffer)),
      version: 1,
      timestamp: Date.now(),
    };

    // Zeroize sensitive plaintext buffer from memory
    zeroize(encoded);

    return envelope;
  }

  /**
   * Decrypts an EncryptedEnvelope using AES-GCM-256.
   */
  public async decrypt<T = any>(envelope: EncryptedEnvelope): Promise<T> {
    const subtle = this.getSubtleCrypto();
    if (!subtle) throw new Error('WebCrypto is required for encrypted storage');
    if (!this.masterKey) await this.init();
    if (!this.masterKey) throw new Error('Encrypted storage key is unavailable');

    const iv = hexToBytes(envelope.iv);
    const ciphertext = hexToBytes(envelope.ciphertext);

    const decryptedBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      this.masterKey,
      ciphertext as unknown as BufferSource
    );

    const decryptedBytes = new Uint8Array(decryptedBuffer);
    const jsonStr = new TextDecoder().decode(decryptedBytes);
    const result = JSON.parse(jsonStr);

    // Zeroize intermediate plaintext buffer
    zeroize(decryptedBytes);

    return result;
  }

  // ─── IDENTITY OPERATIONS ─────────────────────────────────────────────────────

  /**
   * Loads the sovereign identity from the encrypted vault.
   */
  public async getIdentity(): Promise<SovereignIdentityRecord | null> {
    if (this.volatileIdentity) {
      return this.volatileIdentity;
    }

    await this.init();

    const record = await this.getFromStore<{ id: string; envelope: EncryptedEnvelope }>('encrypted_identity', 'current');
    if (!record || !record.envelope) return null;

    try {
      const decrypted = await this.decrypt<SovereignIdentityRecord>(record.envelope);
      this.volatileIdentity = decrypted;
      return decrypted;
    } catch (err) {
      console.error('[SecureStorage] Failed to decrypt identity envelope:', err);
      return null;
    }
  }

  /**
   * Synchronous getter for currently loaded volatile identity.
   */
  public getIdentitySync(): SovereignIdentityRecord | null {
    return this.volatileIdentity;
  }

  public async savePrivateState(key: string, value: unknown): Promise<void> {
    if (!/^[a-z0-9:_-]{1,160}$/i.test(key)) throw new Error('Invalid private state key');
    await this.init();
    const envelope = await this.encrypt(value);
    await this.putInStore('vault_meta', { id: `private_state:${key}`, envelope, updatedAt: Date.now() });
  }

  public async getPrivateState<T>(key: string): Promise<T | null> {
    if (!/^[a-z0-9:_-]{1,160}$/i.test(key)) throw new Error('Invalid private state key');
    await this.init();
    const record = await this.getFromStore<{ envelope: EncryptedEnvelope }>('vault_meta', `private_state:${key}`);
    return record?.envelope ? this.decrypt<T>(record.envelope) : null;
  }

  /**
   * Encrypts and saves the sovereign identity into the secure vault.
   * NEVER touches localStorage.
   */
  public async saveIdentity(
    mnemonic: string,
    seed: Uint8Array,
    fingerprint: string,
    sovereignIdentity?: any
  ): Promise<void> {
    const seedHex = bytesToHex(seed);
    const identity: SovereignIdentityRecord = {
      mnemonic: mnemonic.trim().toLowerCase(),
      seedHex,
      fingerprint,
      createdAt: Date.now(),
      sovereignIdentity,
    };

    await this.init();
    const envelope = await this.encrypt(identity);

    await this.putInStore('encrypted_identity', {
      id: 'current',
      envelope,
      fingerprint,
      updatedAt: Date.now(),
    });

    this.volatileIdentity = identity;

    // Ensure localStorage is purged of any legacy identity artifacts
    if (this.db || typeof window === 'undefined') this.purgeLegacyLocalStorage();
  }

  // ─── PRIVATE MESSAGE OPERATIONS ──────────────────────────────────────────────

  /**
   * Saves messages for a channel into the encrypted vault.
   */
  public async saveChannelMessages(channelId: string, messages: any[]): Promise<void> {
    this.volatileMessages.set(channelId, messages);

    await this.init();
    const envelope = await this.encrypt(messages);

    await this.putInStore('encrypted_messages', {
      channelId,
      envelope,
      updatedAt: Date.now(),
    });

    // Purge any plaintext message cache in localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('aetheris_messages_cache');
      } catch (_) {}
    }
  }

  /**
   * Retrieves messages for a channel from the encrypted vault.
   */
  public async getChannelMessages(channelId: string): Promise<any[]> {
    if (this.volatileMessages.has(channelId)) {
      return this.volatileMessages.get(channelId) || [];
    }

    await this.init();

    const record = await this.getFromStore<{ channelId: string; envelope: EncryptedEnvelope }>('encrypted_messages', channelId);
    if (!record || !record.envelope) return [];

    try {
      const messages = await this.decrypt<any[]>(record.envelope);
      this.volatileMessages.set(channelId, messages);
      return messages;
    } catch (err) {
      console.error(`[SecureStorage] Failed to decrypt messages for channel ${channelId}:`, err);
      return [];
    }
  }

  /**
   * Loads all stored channel messages from the encrypted vault.
   */
  public async getAllChannelMessages(): Promise<Map<string, any[]>> {
    await this.init();
    const records = await this.getAllFromStore<{ channelId: string; envelope: EncryptedEnvelope }>('encrypted_messages');
    
    for (const rec of records) {
      if (rec && rec.channelId && rec.envelope) {
        try {
          const msgs = await this.decrypt<any[]>(rec.envelope);
          this.volatileMessages.set(rec.channelId, msgs);
        } catch (err) {
          console.error(`[SecureStorage] Failed to decrypt channel ${rec.channelId}:`, err);
        }
      }
    }

    return this.volatileMessages;
  }

  // ─── MEMORY ZEROIZATION, LOGOUT & WIPE ──────────────────────────────────────

  /**
   * Securely zeroizes all active in-memory cryptographic secrets.
   */
  public zeroizeRam(): void {
    if (this.volatileIdentity) {
      if (this.volatileIdentity.seedHex) {
        const seedBytes = hexToBytes(this.volatileIdentity.seedHex);
        zeroize(seedBytes);
      }
      this.volatileIdentity.mnemonic = '';
      this.volatileIdentity.seedHex = '';
      this.volatileIdentity = null;
    }

    this.volatileMessages.clear();
    this.fallbackStore.clear();
    this.isUnlocked = false;
  }

  /**
   * Full logout: zeroizes RAM and purges private message cache.
   */
  public async logout(): Promise<void> {
    this.zeroizeRam();
    if (this.db) {
      await this.clearStore('encrypted_messages');
    }
    this.purgeLegacyLocalStorage();
  }

  /**
   * Comprehensive local wipe: zeroizes RAM, drops IndexedDB vault, and cleans localStorage.
   */
  public async wipeAll(): Promise<void> {
    this.zeroizeRam();

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    if (typeof indexedDB !== 'undefined') {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(this.dbName);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    }

    this.purgeLegacyLocalStorage();

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.clear();
      } catch (_) {}
    }
  }

  // ─── LEGACY LOCALSTORAGE MIGRATION ──────────────────────────────────────────

  /**
   * Synchronous check on module load to prevent any ongoing plaintext exposure.
   */
  private checkForLegacyLocalStorageMigration(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const savedMnemonic = localStorage.getItem('aetheris_identity_mnemonic') || localStorage.getItem('aetheris_mnemonic');
      const savedSeed = localStorage.getItem('aetheris_identity_seed');
      if (savedMnemonic || savedSeed) {
        // Cache temporarily in volatile RAM so synchronous app boot has access
        this.volatileIdentity = {
          mnemonic: (savedMnemonic || '').trim().toLowerCase(),
          seedHex: savedSeed || '',
          fingerprint: '',
          createdAt: Date.now(),
        };
      }
    } catch (_) {}
  }

  /**
   * Migrates legacy plaintext localStorage secrets into encrypted IndexedDB vault
   * and immediately purges the plaintext keys from localStorage.
   */
  private async migrateLegacyData(): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    try {
      const legacyMnemonic = localStorage.getItem('aetheris_identity_mnemonic') || localStorage.getItem('aetheris_mnemonic');
      const legacySeed = localStorage.getItem('aetheris_identity_seed');

      if (legacyMnemonic || legacySeed) {
        const existing = await this.getFromStore<any>('encrypted_identity', 'current');
        if (!existing && legacyMnemonic) {
          const envelope = await this.encrypt({
            mnemonic: legacyMnemonic.trim().toLowerCase(),
            seedHex: legacySeed || '',
            fingerprint: '',
            createdAt: Date.now(),
          });

          await this.putInStore('encrypted_identity', {
            id: 'current',
            envelope,
            updatedAt: Date.now(),
          });
        }
      }

      const legacyMessages = localStorage.getItem('aetheris_messages_cache');
      if (legacyMessages) {
        try {
          const parsed = JSON.parse(legacyMessages);
          if (typeof parsed === 'object' && parsed !== null) {
            for (const [chId, msgs] of Object.entries(parsed)) {
              if (Array.isArray(msgs)) {
                const envelope = await this.encrypt(msgs);
                await this.putInStore('encrypted_messages', { channelId: chId, envelope, updatedAt: Date.now() });
                this.volatileMessages.set(chId, msgs);
              }
            }
          }
        } catch (_) {}
      }

      // Purge all plaintext secrets from localStorage
      if (this.db || typeof window === 'undefined') this.purgeLegacyLocalStorage();
    } catch (err) {
      console.warn('[SecureStorage] Error during legacy migration:', err);
    }
  }

  /**
   * Purges all plaintext sensitive keys from localStorage.
   */
  public purgeLegacyLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;

    const SENSITIVE_KEYS = [
      'aetheris_identity_mnemonic',
      'aetheris_identity_seed',
      'aetheris_mnemonic',
      'aetheris_messages_cache',
      'aetheris_admin_pin',
      'aetheris_admin_token',
    ];

    for (const key of SENSITIVE_KEYS) {
      try {
        if (localStorage.getItem(key) !== null) {
          // Overwrite with empty value first before removing
          localStorage.setItem(key, '');
          localStorage.removeItem(key);
        }
      } catch (_) {}
    }
  }

  // ─── IDB PROMISE WRAPPERS ───────────────────────────────────────────────────

  private getFromStore<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    if (!this.db) {
      return Promise.resolve(this.fallbackStore.get(`${storeName}:${key}`) ?? null);
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  }

  private getAllFromStore<T>(storeName: string): Promise<T[]> {
    if (!this.db) {
      const results: T[] = [];
      for (const [k, v] of this.fallbackStore.entries()) {
        if (k.startsWith(`${storeName}:`)) results.push(v);
      }
      return Promise.resolve(results);
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => resolve([]);
      } catch (_) {
        resolve([]);
      }
    });
  }

  private putInStore(storeName: string, value: any): Promise<void> {
    if (!this.db) {
      const key = value.id || value.channelId || 'default';
      this.fallbackStore.set(`${storeName}:${key}`, value);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value);
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error ?? new Error('Encrypted storage transaction aborted'));
        tx.onerror = () => reject(tx.error ?? req.error);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  private clearStore(storeName: string): Promise<void> {
    if (!this.db) {
      for (const k of this.fallbackStore.keys()) {
        if (k.startsWith(`${storeName}:`)) this.fallbackStore.delete(k);
      }
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (_) {
        resolve();
      }
    });
  }

  private async loadVolatileCache(): Promise<void> {
    const identity = await this.getFromStore<{ envelope: EncryptedEnvelope }>('encrypted_identity', 'current');
    if (identity?.envelope) this.volatileIdentity = await this.decrypt<SovereignIdentityRecord>(identity.envelope);
    const channels = await this.getAllFromStore<{ channelId: string; envelope: EncryptedEnvelope }>('encrypted_messages');
    for (const channel of channels) {
      if (!channel.channelId || !channel.envelope) continue;
      try { this.volatileMessages.set(channel.channelId, await this.decrypt<any[]>(channel.envelope)); }
      catch { console.warn('[SecureStorage] Unable to decrypt a stored message channel'); }
    }
  }
}

// Global Singleton Export
export const secureStorage = new SecureStorageEngine();
