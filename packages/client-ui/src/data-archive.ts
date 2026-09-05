import { secureStorage } from './secure-storage.js';
/**
 * @file data-archive.ts
 * @package @aetheris/client-ui
 * @description Sovereign Data Archive Engine.
 * Provides 1-click password-protected AES-256-GCM encrypted export and import
 * of all account data (BIP-39 mnemonic, Ed25519 identity, posts, bookmarks,
 * channel messaging history, and client preferences).
 */

import { clientStore, ClientPost, ClientMessage, ChannelItem } from './client-state.js';
import { bookmarksVault, BookmarkEntry } from './bookmarks.js';
import { themeEngine } from './themes.js';
import { bytesToHex, mnemonicToSeed } from '@aetheris/core-crypto';

// ─── CONSTANTS & PROTOCOL ENVELOPE SPECIFICATION ───────────────────────────

export const ARCHIVE_MAGIC = 'AETH_VAULT_V1'; // Exactly 13 ASCII bytes
export const MAGIC_LENGTH = 13;
export const SALT_LENGTH = 16;
export const IV_LENGTH = 12;
export const TAG_LENGTH = 16;
export const HEADER_LENGTH = MAGIC_LENGTH + SALT_LENGTH + IV_LENGTH; // 41 bytes
export const PBKDF2_ITERATIONS = 100000;

export interface SovereignArchivePayload {
  version: 1;
  exportedAt: number;
  platform: 'aetheris-sovereign-vault';
  identity: {
    mnemonic: string;
    seed: string;
    fingerprint: string;
  };
  posts: ClientPost[];
  bookmarks: BookmarkEntry[];
  channels: ChannelItem[];
  messages: Record<string, ClientMessage[]>;
  preferences: {
    theme: string;
    density: string;
    viewMode?: string;
  };
}

export interface ArchiveRestoreResult {
  success: boolean;
  stats: {
    posts: number;
    bookmarks: number;
    messages: number;
  };
}

// ─── CRYPTOGRAPHIC KEY DERIVATION ──────────────────────────────────────────

/**
 * Derives a 256-bit AES-GCM CryptoKey using PBKDF2 with SHA-256 and 100,000 iterations.
 */
export async function deriveArchiveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─── EXPORT SOVEREIGN ARCHIVE ──────────────────────────────────────────────

/**
 * Gathers user account data, serializes to JSON, and encrypts into a binary envelope:
 * `[13 bytes Magic: "AETH_VAULT_V1"] + [16 bytes Salt] + [12 bytes IV] + [Ciphertext with 16-byte Tag]`
 *
 * @param passphrase - User-chosen passphrase to derive the AES-256-GCM encryption key
 * @returns Blob of MIME type 'application/octet-stream'
 */
export async function exportSovereignArchive(passphrase: string): Promise<Blob> {
  if (!passphrase || typeof passphrase !== 'string' || passphrase.trim().length === 0) {
    throw new Error('A secure passphrase is required to export your sovereign archive');
  }

  // 1. Gather user identity
  let seedHex = '';
  if (typeof localStorage !== 'undefined') {
    seedHex = secureStorage.getIdentitySync()?.seedHex || '';
  }
  if (!seedHex && clientStore.mnemonic) {
    try {
      seedHex = bytesToHex(mnemonicToSeed(clientStore.mnemonic).subarray(0, 32));
    } catch {
      seedHex = '';
    }
  }

  const identity = {
    mnemonic: clientStore.mnemonic || '',
    seed: seedHex,
    fingerprint: clientStore.keypair?.fingerprint || '',
  };

  // 2. Gather user posts
  const myFp = clientStore.keypair?.fingerprint;
  const userPosts = (clientStore.posts || []).filter((p: ClientPost) => {
    if (!myFp) return true;
    return p.authorFingerprint === myFp || !p.authorFingerprint;
  });

  // 3. Gather bookmarks from bookmarksVault
  const bookmarks = Array.isArray(bookmarksVault?.bookmarks)
    ? [...bookmarksVault.bookmarks]
    : [];

  // 4. Gather channels and messages history
  const channels = Array.isArray(clientStore.channels)
    ? [...clientStore.channels]
    : [];

  const messages: Record<string, ClientMessage[]> = {};
  if (clientStore.messages instanceof Map) {
    for (const [chId, msgs] of clientStore.messages.entries()) {
      messages[chId] = Array.isArray(msgs) ? [...msgs] : [];
    }
  } else if (clientStore.messages && typeof clientStore.messages === 'object') {
    for (const [chId, msgs] of Object.entries(clientStore.messages)) {
      messages[chId] = Array.isArray(msgs) ? [...(msgs as ClientMessage[])] : [];
    }
  }

  // 5. Gather user preferences
  const preferences = {
    theme: themeEngine?.currentThemeId || 'obsidian-cyber',
    density: clientStore.density || 'balanced',
    viewMode: clientStore.viewMode || 'card',
  };

  const payload: SovereignArchivePayload = {
    version: 1,
    exportedAt: Date.now(),
    platform: 'aetheris-sovereign-vault',
    identity,
    posts: userPosts,
    bookmarks,
    channels,
    messages,
    preferences,
  };

  // 6. Cryptographic preparation
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const aesKey = await deriveArchiveKey(passphrase, salt);

  // 7. Serialize & Encrypt with AES-256-GCM
  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    aesKey,
    jsonBytes as unknown as BufferSource
  );
  const ciphertextWithTag = new Uint8Array(encryptedBuffer);

  // 8. Assemble binary envelope
  const magicBytes = new TextEncoder().encode(ARCHIVE_MAGIC);
  const totalLength = MAGIC_LENGTH + SALT_LENGTH + IV_LENGTH + ciphertextWithTag.length;
  const envelope = new Uint8Array(totalLength);

  envelope.set(magicBytes, 0);
  envelope.set(salt, MAGIC_LENGTH);
  envelope.set(iv, MAGIC_LENGTH + SALT_LENGTH);
  envelope.set(ciphertextWithTag, HEADER_LENGTH);

  return new Blob([envelope], { type: 'application/octet-stream' });
}

// ─── DOWNLOAD HELPER ───────────────────────────────────────────────────────

/**
 * Triggers a browser download of the sovereign archive Blob.
 */
export function downloadArchiveFile(
  blob: Blob,
  filename?: string
): void {
  const actualFilename = filename || `aetheris-sovereign-archive-${new Date().toISOString().slice(0, 10)}.aeth`;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = actualFilename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 150);
}

// ─── IMPORT SOVEREIGN ARCHIVE ──────────────────────────────────────────────

/**
 * Validates, decrypts, and rehydrates platform state from an AES-256-GCM sovereign archive envelope.
 *
 * @param fileData - ArrayBuffer or Uint8Array containing the binary archive envelope
 * @param passphrase - Passphrase to decrypt the envelope
 * @returns Object with success boolean and restoration count statistics
 */
export async function importSovereignArchive(
  fileData: ArrayBuffer | Uint8Array,
  passphrase: string
): Promise<ArchiveRestoreResult> {
  if (!passphrase || typeof passphrase !== 'string' || passphrase.trim().length === 0) {
    throw new Error('Invalid passphrase or corrupted archive');
  }

  const bytes = fileData instanceof Uint8Array ? fileData : new Uint8Array(fileData);

  // Envelope minimum size check: Header (41) + Tag (16)
  if (bytes.length < HEADER_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid passphrase or corrupted archive');
  }

  // 1. Validate magic bytes "AETH_VAULT_V1"
  const magicBytes = new TextEncoder().encode(ARCHIVE_MAGIC);
  for (let i = 0; i < MAGIC_LENGTH; i++) {
    if (bytes[i] !== magicBytes[i]) {
      throw new Error('Invalid passphrase or corrupted archive: unrecognized magic header');
    }
  }

  // 2. Extract salt, IV, and ciphertext (with appended 16-byte tag)
  const salt = bytes.subarray(MAGIC_LENGTH, MAGIC_LENGTH + SALT_LENGTH);
  const iv = bytes.subarray(MAGIC_LENGTH + SALT_LENGTH, HEADER_LENGTH);
  const ciphertextWithTag = bytes.subarray(HEADER_LENGTH);

  // 3. Derive AES-GCM key from passphrase and salt via PBKDF2 (100,000 iterations)
  const aesKey = await deriveArchiveKey(passphrase, salt);

  // 4. Decrypt ciphertext with AES-256-GCM
  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      aesKey,
      ciphertextWithTag as unknown as BufferSource
    );
  } catch (_err) {
    throw new Error('Invalid passphrase or corrupted archive');
  }

  // 5. Parse JSON and validate payload schema
  let payload: SovereignArchivePayload;
  try {
    const jsonString = new TextDecoder().decode(decryptedBuffer);
    payload = JSON.parse(jsonString);
  } catch (_err) {
    throw new Error('Invalid passphrase or corrupted archive');
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid passphrase or corrupted archive');
  }

  let restoredPosts = 0;
  let restoredBookmarks = 0;
  let restoredMessages = 0;

  // 6. Restore posts into clientStore.posts
  if (Array.isArray(payload.posts)) {
    restoredPosts = payload.posts.length;
    for (let i = payload.posts.length - 1; i >= 0; i--) {
      const post = payload.posts[i];
      if (!post || typeof post !== 'object' || !post.id) continue;
      const existingIdx = clientStore.posts.findIndex((p: ClientPost) => p.id === post.id);
      if (existingIdx >= 0) {
        clientStore.posts[existingIdx] = { ...clientStore.posts[existingIdx], ...post };
      } else {
        clientStore.posts.unshift(post);
      }
    }
  }

  // 7. Restore bookmarks into bookmarksVault
  if (Array.isArray(payload.bookmarks)) {
    restoredBookmarks = payload.bookmarks.length;
    for (let i = payload.bookmarks.length - 1; i >= 0; i--) {
      const bm = payload.bookmarks[i];
      if (!bm || typeof bm !== 'object') continue;
      const existingIdx = bookmarksVault.bookmarks.findIndex(
        (b: BookmarkEntry) => (bm.id && b.id === bm.id) || (bm.postId && b.postId === bm.postId)
      );
      if (existingIdx >= 0) {
        bookmarksVault.bookmarks[existingIdx] = { ...bookmarksVault.bookmarks[existingIdx], ...bm };
      } else {
        bookmarksVault.bookmarks.unshift(bm);
      }
    }
    if (typeof (bookmarksVault as any).persist === 'function') {
      (bookmarksVault as any).persist();
    } else if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('aetheris_bookmarks', JSON.stringify(bookmarksVault.bookmarks));
      } catch {}
    }
  }

  // 8. Restore messages into clientStore.messages
  if (payload.messages) {
    const entries: [string, ClientMessage[]][] = Array.isArray(payload.messages)
      ? payload.messages
      : Object.entries(payload.messages);

    for (const [chId, msgs] of entries) {
      if (!Array.isArray(msgs)) continue;
      restoredMessages += msgs.length;
      const current = clientStore.messages.get(chId) || [];
      const currentIds = new Set(current.map((m: ClientMessage) => m.id));
      const toAdd = msgs.filter((m: ClientMessage) => m && m.id && !currentIds.has(m.id));
      clientStore.messages.set(chId, [...current, ...toAdd]);
    }
    if (typeof clientStore.persistMessagesLocally === 'function') {
      clientStore.persistMessagesLocally();
    }
  }

  // 8b. Restore channels into clientStore.channels
  if (Array.isArray(payload.channels)) {
    for (const ch of payload.channels) {
      if (ch && ch.id && !clientStore.channels.some((c: ChannelItem) => c.id === ch.id)) {
        clientStore.channels.push(ch);
      }
    }
  }

  // 8c. Restore preferences
  if (payload.preferences && typeof payload.preferences === 'object') {
    if (payload.preferences.theme && typeof themeEngine?.setTheme === 'function') {
      try {
        themeEngine.setTheme(payload.preferences.theme);
      } catch {}
    }
    if (payload.preferences.density && typeof clientStore?.setDensity === 'function') {
      try {
        clientStore.setDensity(payload.preferences.density as any);
      } catch {}
    }
  }

  // 9. If mnemonic is present in archive, call clientStore.restoreIdentityFromMnemonic
  if (payload.identity && typeof payload.identity.mnemonic === 'string' && payload.identity.mnemonic.trim().length > 0) {
    clientStore.restoreIdentityFromMnemonic(payload.identity.mnemonic.trim());
  }

  // 10. Call clientStore.notify('ARCHIVE_RESTORED')
  clientStore.notify('ARCHIVE_RESTORED', {
    stats: {
      posts: restoredPosts,
      bookmarks: restoredBookmarks,
      messages: restoredMessages,
    },
  });

  return {
    success: true,
    stats: {
      posts: restoredPosts,
      bookmarks: restoredBookmarks,
      messages: restoredMessages,
    },
  };
}
