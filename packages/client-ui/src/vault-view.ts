/**
 * @file vault-view.ts
 * @package @aetheris/client-ui
 * @description Sovereign Knowledge Vault & Reproducible Binary Repository Workspace View.
 */

import { clientStore, ClientPost } from './client-state.js';
import { flairFilter } from './flair-filter.js';
import { renderVaultFilesEmptyState, renderVaultReleasesEmptyState } from './empty-states.js';
import { markdownRenderer } from './markdown-renderer.js';
import { bookmarksVault } from './bookmarks.js';
import { threadManager, ThreadComment } from './threads.js';
import { t } from './i18n.js';
import { toastManager } from './toast.js';
import { isDemoModeEnabled } from './demo-mode.js';
import { renderIcon } from './ui/icons.js';
import { canonicalVault } from './canonical-vault.js';

function renderKnowledgeMemoryPlaceholder(): string {
  return `<section class="knowledge-memory" aria-labelledby="memory-title"><header class="memory-heading"><div><span class="context-eyebrow">Your knowledge, with its context</span><h2 id="memory-title">Saved in Vault</h2><p>Your Vault contents are encrypted before leaving your device. Cloudflare stores encrypted data and limited operational metadata but cannot read your private Vault content.</p></div><button type="button" class="context-button" data-action="keep-note">Write a note</button></header>
    <label class="memory-search">Find in your knowledge<input id="memory-search" type="search" placeholder="Search text, author, or collection" autocomplete="off" aria-describedby="memory-search-help"></label>
    <p id="memory-search-help" class="context-help">Local search: &quot;exact phrase&quot;, -exclude, kind:post, author:name, collection:&quot;Reading list&quot;, after:2026-01-01, before:2027-01-01. Dates use UTC.</p>
    <div id="memory-items" aria-live="polite"><p role="status">Opening encrypted knowledge…</p></div></section>`;
}

export interface VaultCollection {
  id: string;
  name: string;
  description: string;
  icon: string;
  count: number;
  createdAt: string;
  tags?: string[];
}

export interface VaultUploadProgress {
  active: boolean;
  fileName: string;
  percent: number;
  chunk: number;
  totalChunks: number;
  sha256Prefix: string;
  totalBytes: number;
}

let activeVaultCategory = 'private';
let selectedCollectionId: string | null = null;
let isNewCollectionModalOpen = false;
let uploadProgress: VaultUploadProgress | null = null;
let uploadTimer: any = null;
let accountStorage: { usedBytes: number; accountQuotaBytes: number; maxFileBytes: number } | null = null;
let storageLoading = false;
let storageIdentity = '';
let storageError = '';

export async function refreshAccountStorage(): Promise<void> {
  if (storageLoading) return;
  storageLoading = true;
  const identity = clientStore.keypair.fingerprint;
  storageIdentity = identity;
  try {
    const response = await fetch('/api/storage?action=account', { cache: 'no-store', headers: { 'X-Sovereign-Envelope': JSON.stringify(clientStore.createSignedEnvelope({ scope: 'urefy-storage-v1', action: 'account' })) } });
    const data = await response.json();
    if (!response.ok || !data.success || !Number.isFinite(data.usedBytes)) throw new Error('Account usage is unavailable.');
    if (clientStore.keypair.fingerprint === identity) { accountStorage = data; storageError = ''; }
  } catch { accountStorage = null; storageError = 'Account usage is unavailable.'; }
  finally { storageLoading = false; clientStore.notify(); }
}

const DEFAULT_COLLECTIONS: VaultCollection[] = [
  {
    id: 'research-papers',
    name: 'Research Papers',
    description: 'Cryptographic whitepapers, reproducible benchmarks, and consensus notes',
    icon: '📄',
    count: 0,
    createdAt: '2026-03-01',
    tags: ['RESEARCH', 'VERIFIED RELEASE'],
  },
  {
    id: 'encrypted-keys',
    name: 'Encrypted Keys',
    description: 'Post-quantum key shares, air-gap backup shards, and identity attestations',
    icon: '🔑',
    count: 0,
    createdAt: '2026-04-12',
    tags: ['SECURITY ADVISORY', 'ENCRYPTED'],
  },
  {
    id: 'archived-posts',
    name: 'Archived Posts',
    description: 'Exported discussion threads, immutable bookmarks, and signed nanopublications',
    icon: '📦',
    count: 0,
    createdAt: '2026-06-20',
    tags: ['SAVED', 'ARCHIVED'],
  },
  {
    id: 'personal-backups',
    name: 'Personal Backups',
    description: 'Encrypted storage bundles, local state snapshots, and media payloads',
    icon: '💾',
    count: 0,
    createdAt: '2026-08-15',
    tags: ['BACKUP', 'REPRODUCIBLE'],
  },
];

function isVaultCollection(value: unknown): value is VaultCollection {
  const col = value as Partial<VaultCollection> | null;
  return !!col && typeof col.id === 'string' && col.id.length > 0 && col.id.length <= 160 &&
    typeof col.name === 'string' && col.name.trim().length > 0 && col.name.length <= 80 &&
    typeof col.description === 'string' && col.description.length <= 500 &&
    typeof col.icon === 'string' && col.icon.length <= 8 &&
    Array.isArray(col.tags) && col.tags.every(tag => typeof tag === 'string' && tag.length <= 80) &&
    typeof col.createdAt === 'string' && col.createdAt.length <= 40 &&
    typeof col.count === 'number' && Number.isFinite(col.count);
}

function loadCollections(): VaultCollection[] {
  if (typeof localStorage === 'undefined') return DEFAULT_COLLECTIONS;
  try {
    const raw = localStorage.getItem('urefy_vault_collections');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(isVaultCollection);
    }
  } catch {}
  return DEFAULT_COLLECTIONS;
}

function saveCollections(cols: VaultCollection[]): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('urefy_vault_collections', JSON.stringify(cols));
    } catch { throw new Error('Collections could not be saved on this device'); }
  }
}

export function getVaultCollections(): VaultCollection[] {
  return loadCollections();
}

export function createVaultCollection(name: string, description: string, icon = '📁'): VaultCollection {
  const cols = loadCollections();
  if (!name.trim() || name.length > 80 || description.length > 500 || cols.length >= 100) throw new Error('Use a collection name under 80 characters (up to 100 collections)');
  const id = `collection-${crypto.randomUUID()}`;
  const newCol: VaultCollection = {
    id,
    name: name.trim(),
    description: description.trim(),
    icon,
    count: 0,
    createdAt: new Date().toISOString().split('T')[0],
    tags: [name.trim().toUpperCase()],
  };
  cols.unshift(newCol);
  saveCollections(cols);
  void canonicalVault.createCollection(name, description, icon);
  return newCol;
}

export function deleteVaultCollection(id: string): void {
  const cols = loadCollections().filter(c => c.id !== id);
  saveCollections(cols);
  void canonicalVault.deleteCollection(id);
  if (selectedCollectionId === id) selectedCollectionId = null;
}

export function setSelectedVaultCollection(id: string | null): void {
  selectedCollectionId = id;
}

export function getSelectedVaultCollection(): string | null {
  return selectedCollectionId;
}

export function openNewCollectionModal(): void {
  isNewCollectionModalOpen = true;
  clientStore.notifySync();
}

export function closeNewCollectionModal(): void {
  isNewCollectionModalOpen = false;
  clientStore.notifySync();
}

export function startUploadSimulation(fileName = 'genome-assembly-v3.bin', totalBytes = 33554432): void {
  if (!isDemoModeEnabled()) return;
  if (uploadTimer) {
    clearInterval(uploadTimer);
    uploadTimer = null;
  }

  const totalChunks = 8;
  let currentChunk = 1;
  const chunkHashes = [
    '4a2b9e18f2', '8c3d11b09a', 'e5f29a00bc', '1d88ca5f4e',
    '7b33a011cd', '2f90ea66ab', 'b84c3300ef', '9e01ad44cc',
  ];

  uploadProgress = {
    active: true,
    fileName,
    percent: 12,
    chunk: 1,
    totalChunks,
    sha256Prefix: chunkHashes[0],
    totalBytes,
  };
  clientStore.notify();

  uploadTimer = setInterval(() => {
    currentChunk++;
    if (currentChunk <= totalChunks) {
      const pct = Math.min(100, Math.round((currentChunk / totalChunks) * 100));
      uploadProgress = {
        active: true,
        fileName,
        percent: pct,
        chunk: currentChunk,
        totalChunks,
        sha256Prefix: chunkHashes[(currentChunk - 1) % chunkHashes.length],
        totalBytes,
      };
      clientStore.notify();
    } else {
      clearInterval(uploadTimer);
      uploadTimer = null;
      uploadProgress = {
        active: false,
        fileName,
        percent: 100,
        chunk: totalChunks,
        totalChunks,
        sha256Prefix: 'a11fe18f96',
        totalBytes,
      };
      toastManager.success(`Verified upload complete: ${fileName} (${(totalBytes / (1024 * 1024)).toFixed(1)} MB)`, '📦');
      setTimeout(() => {
        uploadProgress = null;
        clientStore.notify();
      }, 2500);
    }
  }, 400);
}

export function cancelUploadSimulation(): void {
  if (uploadTimer) {
    clearInterval(uploadTimer);
    uploadTimer = null;
  }
  uploadProgress = null;
  clientStore.notify();
}

export function setActiveVaultCategory(cat: string): void {
  activeVaultCategory = cat;
}

export function getActiveVaultCategory(): string {
  return activeVaultCategory;
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderThreadNode(c: ThreadComment): string {
  return threadManager.renderCommentNode(c, 'c3dc28cb705e', clientStore.keypair.fingerprint);
}

export function renderVaultReleaseCard(p: ClientPost): string {
  const time = new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const fileName = p.attachment?.fileName || `${p.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-x86_64.bin`;
  const sha = p.attachment?.sha256 || 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496';
  const byteSize = p.attachment?.byteSize || 131072;
  const entropy = p.attachment?.entropy || 6.12;

  return `
    <div class="workspace-vault__release p-4 sm:p-5 rounded-2xl bg-surface-raised border border-white/5 hover:border-white/10 transition-all shadow-md space-y-3.5">
      
      <!-- TOP RELEASE HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div class="flex items-center space-x-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-surface-base border border-white/10 flex items-center justify-center text-xl text-slate-300 shadow-sm shrink-0">
            📦
          </div>
          <div class="min-w-0">
            <div class="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 data-open-detail="${p.id}" class="btn-open-detail text-sm sm:text-base font-bold text-white hover:text-[var(--color-accent,#e59b3c)] transition-colors cursor-pointer truncate">${escapeHtml(p.title)}</h3>
            </div>
            <div class="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
              <span>By @${p.authorFingerprint.substring(0, 8)}</span>
              <span>•</span>
              <span>${time}</span>
              <span>•</span>
              <span>${(byteSize / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        </div>

        <!-- MERIT SCORE PILL -->
        <div class="flex items-center space-x-2 self-start sm:self-auto shrink-0">
          <div class="flex items-center space-x-1.5 bg-surface-overlay px-2.5 py-1 rounded-xl border border-white/5 text-xs font-mono">
            <button data-vote-id="${p.id}" data-dir="1" class="btn-upvote text-slate-400 hover:text-emerald-400 cursor-pointer p-0.5" title="Endorse (+1 Merit)">▲</button>
            <span class="font-bold text-emerald-400">${p.meritVotes} Merit</span>
            <button data-vote-id="${p.id}" data-dir="-1" class="btn-downvote text-slate-400 hover:text-rose-400 cursor-pointer p-0.5" title="Divergent (-1)">▼</button>
          </div>
        </div>
      </div>

      <!-- CONSUMER BADGES ROW -->
      <p class="public-resource-state text-xs text-slate-400 flex items-center gap-1.5">${renderIcon('globe', { size: 14 })} Public resource · inspect the source before downloading</p>

      <!-- RELEASE BODY & SYNTHESIS -->
      <div class="text-xs sm:text-sm text-slate-300 leading-relaxed">
        ${markdownRenderer.renderMarkdown(p.content)}
      </div>

      <!-- COLLAPSIBLE TECHNICAL & CRYPTOGRAPHIC DETAILS -->
      <details class="vault-card-tech-details rounded-xl bg-surface-base/80 border border-white/5 p-3 text-xs font-mono space-y-2.5 select-none">
        <summary class="cursor-pointer text-slate-400 hover:text-slate-200 text-[11px] font-bold flex items-center justify-between">
          <span class="flex items-center space-x-1.5">
            <span>🔬</span>
            <span>Technical & Cryptographic Verification</span>
          </span>
          <span class="text-[10px] text-slate-400 font-sans">Inspect SHA & Entropy ▾</span>
        </summary>
        <div class="pt-2 space-y-2 border-t border-white/5 text-[11px]">
          <div class="flex items-center justify-between text-[11px] pb-1">
            <span class="text-slate-400 font-bold">Cryptographic Software Attestation:</span>
            <span class="text-slate-400 font-medium">Publisher-supplied metadata</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div>
              <span class="text-slate-500">File Name:</span>
              <div class="text-slate-200 font-bold truncate">${fileName} (${(byteSize / 1024).toFixed(1)} KB)</div>
            </div>
            <div>
              <span class="text-slate-500">Shannon Entropy:</span>
              <div class="text-slate-300 font-medium">${typeof entropy === 'number' ? `${entropy.toFixed(2)} bits/byte` : 'Not measured'}</div>
            </div>
          </div>

          <div class="p-2 rounded-lg bg-surface-overlay flex items-center justify-between text-[10px] text-slate-400">
            <span class="truncate pr-2 font-mono">SHA256: ${sha}</span>
            <button type="button" class="btn-copy-sha px-2.5 py-1 bg-surface-highlight hover:bg-slate-700 text-slate-200 rounded text-[9px] cursor-pointer shrink-0 font-medium" data-sha="${sha}">
              Copy SHA
            </button>
          </div>

          <div class="text-[10px] text-amber-300/80 bg-amber-950/30 border border-amber-500/20 rounded-lg p-2 flex items-start space-x-1.5 font-sans">
            <span>⚠️</span>
            <span>Static Shannon entropy & binary structure metrics provide heuristic safety indicators.</span>
          </div>
        </div>
      </details>

      <!-- ACTIONS BAR -->
      <div class="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
        <div class="flex items-center space-x-2 sm:space-x-3 text-slate-400">
          <button data-expand-post="${p.id}" class="btn-toggle-post-expand flex items-center space-x-1 hover:text-white transition-colors cursor-pointer px-1.5 py-1 rounded-lg hover:bg-white/5">
            <span>💬</span>
            <span class="text-[11px]">${p.replyCount} Notes</span>
          </button>
          <button data-boost-post="${p.id}" class="btn-boost flex items-center space-x-1 hover:text-white transition-colors cursor-pointer px-1.5 py-1 rounded-lg hover:bg-white/5">
            <span>⟳</span>
            <span class="text-[11px]">${p.boostCount} Share</span>
          </button>
          ${bookmarksVault.renderBookmarkButton(p.id)}
          <button
            type="button"
            data-action="report-post"
            data-post-id="${p.id}"
            class="btn-pulse-report flex items-center space-x-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            title="Report illegal content / Abuse (DSA Notice & Takedown)"
            aria-label="${t('actions.report', undefined, 'Report content')}"
          >
            <span>🚩</span>
            <span class="hidden sm:inline">${t('actions.report', undefined, 'Report')}</span>
          </button>
        </div>

        <button data-file-name="${fileName}" data-byte-size="${byteSize}" data-sha="${sha}" class="btn-download-p2p px-4 py-2 bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center space-x-2 cursor-pointer">
          <span>⬇</span>
          <span>Download</span>
        </button>
      </div>

      <!-- INLINE DISCUSSION TREE -->
      ${p.isExpanded ? `
        <div class="pt-3 border-t border-white/5 space-y-3">
          <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Discussion & Notes:
          </div>
          <div class="space-y-3">
            ${threadManager.getRootComments().map(c => renderThreadNode(c)).join('')}
          </div>
        </div>
      ` : ''}

    </div>
  `;
}

export function exportKnowledgePack(): void {
  const collections = getVaultCollections();
  const savedBookmarks = bookmarksVault.bookmarks;
  const vaultPosts = clientStore.posts.filter(p => p.channelId.startsWith('vault-') || p.attachment);

  const pack = {
    version: '1.0',
    type: 'UREFY_VAULT_KNOWLEDGE_PACK',
    exportedAt: new Date().toISOString(),
    creatorFingerprint: clientStore.keypair?.fingerprint || 'anonymous',
    collections,
    itemsCount: vaultPosts.length + savedBookmarks.length,
    bookmarks: savedBookmarks,
    releases: vaultPosts.map(p => ({
      id: p.id,
      title: p.title,
      content: p.content,
      flair: p.flair,
      attachment: p.attachment,
      createdAt: p.createdAt,
    })),
  };

  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `urefy-knowledge-pack-${Date.now()}.vaultpack`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toastManager.success('Exported Knowledge Pack (.vaultpack)', '📦');
}

export function importKnowledgePack(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.vaultpack,.json';
  input.addEventListener('change', async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('Knowledge Pack exceeds the 1 MiB metadata limit');
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.type !== 'UREFY_VAULT_KNOWLEDGE_PACK' || parsed.version !== '1.0' || !Array.isArray(parsed.collections) || parsed.collections.length > 100 || !parsed.collections.every(isVaultCollection)) {
        toastManager.error('Invalid Knowledge Pack format', '⚠️');
        return;
      }
      if (Array.isArray(parsed.collections)) {
        const existing = getVaultCollections();
        const existingIds = new Set(existing.map(c => c.id));
        for (const col of parsed.collections) {
          if (!existingIds.has(col.id)) {
            existing.push(col);
            existingIds.add(col.id);
          }
        }
        saveCollections(existing);
      }
      toastManager.success(`Imported collection metadata from ${file.name}. Source files are not included.`, '📥');
      clientStore.notifySync();
    } catch {
      toastManager.error('Failed to parse .vaultpack file', '⚠️');
    }
  });
  input.click();
}

function renderStorageQuotaMeter(): string {
  const posts = clientStore.posts.filter(p => p.attachment);
  const usedBytes = posts.reduce((sum, p) => sum + (p.attachment?.byteSize || 0), 0);
  const usedMb = (usedBytes / (1024 * 1024)).toFixed(1);
  const quotaMb = 250;
  const userPct = Math.min(100, Math.round((usedBytes / (quotaMb * 1024 * 1024)) * 100));

  return `
    <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 shadow-sm mb-4 space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-sm font-bold text-white">Storage &amp; portability</span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">Your Vault contents are encrypted before leaving your device. Cloudflare stores encrypted data and limited operational metadata but cannot read your private Vault content.</p>
        </div>
        <div class="flex items-center space-x-2 shrink-0">
          <button type="button" data-action="export-vaultpack" class="px-3 py-1.5 bg-surface-base hover:bg-surface-overlay text-[var(--color-accent,#e59b3c)] hover:text-white text-xs font-semibold rounded-xl border border-[var(--color-accent,#e59b3c)]/30 transition-all flex items-center space-x-1.5 cursor-pointer" title="Bundle collections and files as .vaultpack">
            <span>📦</span>
            <span>Export metadata</span>
          </button>
          <button type="button" data-action="import-vaultpack" class="px-3 py-1.5 bg-surface-base hover:bg-surface-overlay text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-all flex items-center space-x-1.5 cursor-pointer" title="Import a .vaultpack file">
            <span>📥</span>
            <span>Import</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        <div class="p-3 rounded-xl bg-surface-base border border-white/5 space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-300 font-medium">Listed attachment sizes</span>
            <span class="tabular-nums text-[var(--color-accent,#e59b3c)] font-bold">${usedMb} MB</span>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-500">
            <span>Metadata only · not account storage usage</span>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-surface-base border border-white/5 space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-300 font-medium">Cloud account quota</span>
            <span class="tabular-nums text-slate-400">${accountStorage ? `${(accountStorage.usedBytes / 1048576).toFixed(1)} / ${(accountStorage.accountQuotaBytes / 1048576).toFixed(0)} MiB` : storageLoading ? 'Loading…' : 'Unavailable'}</span>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-500">
            <span>${accountStorage ? `Up to ${(accountStorage.maxFileBytes / 1048576).toFixed(0)} MiB per file` : storageError || 'The server enforces its configured upload limits.'}</span>
            <button type="button" data-action="refresh-storage-usage" class="hover:underline text-[var(--color-accent,#e59b3c)] cursor-pointer" ${storageLoading ? 'disabled' : ''}>Refresh</button>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between pt-1 text-[11px] text-slate-400 flex-wrap gap-2">
        <div class="flex items-center space-x-3">
          <span class="flex items-center space-x-1"><span>💾</span><span>Local (IndexedDB)</span></span>
          <span>•</span>
          <span class="flex items-center space-x-1"><span>☁️</span><span>Cloud (R2 Standard)</span></span>
          <span>•</span>
          <span class="flex items-center space-x-1"><span>🌐</span><span>P2P Mesh (WebRTC)</span></span>
        </div>
        <span class="text-slate-500 text-[10px]">Private knowledge: up to 200 snapshots / 4 MiB locally</span>
      </div>
    </div>
  `;
}

function renderUploadProgressCard(): string {
  if (!uploadProgress) return '';
  const isComplete = uploadProgress.percent >= 100;
  return `
    <div class="p-4 rounded-2xl bg-surface-raised border border-white/10 shadow-lg space-y-3 mb-4 animate-in fade-in duration-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2.5 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-surface-base border border-white/10 flex items-center justify-center text-sm ${isComplete ? 'text-emerald-400' : 'text-[var(--color-accent,#e59b3c)] animate-spin'} shrink-0">
            ${isComplete ? '✓' : '⚙️'}
          </div>
          <div class="min-w-0">
            <h4 class="text-xs font-bold text-white truncate">${escapeHtml(uploadProgress.fileName)}</h4>
            <p class="text-[10px] text-slate-400 font-mono mt-0.5">
              ${(uploadProgress.totalBytes / (1024 * 1024)).toFixed(1)} MB • Chunk ${uploadProgress.chunk}/${uploadProgress.totalChunks} [SHA-256: ${uploadProgress.sha256Prefix}...]
            </p>
          </div>
        </div>
        <div class="flex items-center space-x-2 shrink-0">
          <span class="text-xs font-mono font-bold ${isComplete ? 'text-emerald-400' : 'text-[var(--color-accent,#e59b3c)]'}">${uploadProgress.percent}%</span>
          ${!isComplete ? `
            <button type="button" data-action="cancel-upload-sim" class="text-slate-400 hover:text-rose-400 p-1 text-xs cursor-pointer" title="Cancel upload">✕</button>
          ` : ''}
        </div>
      </div>
      <!-- PROGRESS BAR -->
      <div class="w-full bg-surface-base rounded-full h-2 overflow-hidden border border-white/5">
        <div class="bg-[var(--color-accent,#e59b3c)] h-2 rounded-full transition-all duration-300 ease-out" style="width: ${uploadProgress.percent}%"></div>
      </div>
    </div>
  `;
}

function renderCollectionsView(posts: ClientPost[]): string {
  const collections = getVaultCollections();

  if (selectedCollectionId) {
    const activeCol = collections.find(c => c.id === selectedCollectionId);
    if (!activeCol) { selectedCollectionId = null; return renderCollectionsView(posts); }
    const tags = activeCol?.tags || [];
    const matchingPosts = posts.filter(p => 
      tags.some(t => p.flair?.toUpperCase().includes(t) || p.title?.toUpperCase().includes(t) || p.channelId?.includes(t.toLowerCase()))
    );

    return `
      <div class="workspace-vault__collection-view space-y-4">
        <!-- BREADCRUMB & COLLECTION HEADER -->
        <div class="workspace-vault__collection-heading p-4 rounded-2xl bg-surface-raised border border-white/5 flex items-center justify-between gap-3">
          <div class="flex items-center space-x-3 min-w-0">
            <button type="button" data-action="clear-vault-collection" class="p-2 rounded-xl bg-surface-base hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 shrink-0">
              <span>←</span>
              <span>All Collections</span>
            </button>
            <div class="min-w-0">
              <div class="flex items-center space-x-2">
                <span class="text-base">${escapeHtml(activeCol.icon)}</span>
                <h3 class="text-sm font-bold text-white truncate">${escapeHtml(activeCol.name)}</h3>
                <span class="text-[10px] tabular-nums px-2 py-0.5 rounded-full bg-surface-base text-slate-300 border border-white/10 font-medium">${matchingPosts.length} items</span>
              </div>
              <p class="text-xs text-slate-400 truncate mt-0.5">${escapeHtml(activeCol.description)}</p>
            </div>
          </div>
          <button type="button" data-action="delete-vault-collection" data-collection-id="${activeCol.id}" class="p-2 text-slate-400 hover:text-rose-400 text-xs rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0" title="Delete collection">
            🗑️
          </button>
        </div>

        <!-- ITEMS IN COLLECTION -->
        ${matchingPosts.length === 0 ? `
          <div class="p-8 text-center bg-surface-raised/40 rounded-2xl border border-white/5 space-y-3">
            <div class="text-3xl">${escapeHtml(activeCol.icon)}</div>
            <h4 class="text-sm font-bold text-white">No items in this collection yet</h4>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">Tag releases or save posts with tags matching "${escapeHtml(tags.join(', '))}" to organize them here.</p>
            <button type="button" data-action="clear-vault-collection" class="px-4 py-2 bg-surface-raised hover:bg-surface-overlay text-slate-200 text-xs font-semibold rounded-xl border border-white/5 cursor-pointer">
              Back to Collections
            </button>
          </div>
        ` : matchingPosts.map(p => renderVaultReleaseCard(p)).join('')}
      </div>
    `;
  }

  return `
    <div class="space-y-4">
      <div class="workspace-vault__collections-heading flex items-center justify-between">
        <div>
          <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Resource collections (${collections.length})</h3>
          <p class="text-xs text-slate-400">Local groups of public resources, matched by tags.</p>
        </div>
        <button type="button" data-action="open-new-collection-modal" class="px-3 py-1.5 bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer">
          <span>+</span>
          <span>New Collection</span>
        </button>
      </div>

      <!-- COLLECTIONS GRID -->
      <div class="workspace-vault__collections grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        ${collections.map(c => `
          <div 
            data-action="select-vault-collection" 
                data-collection-id="${escapeHtml(c.id)}"
            class="workspace-vault__collection p-4 rounded-2xl bg-surface-raised hover:bg-surface-overlay border border-white/5 hover:border-white/15 transition-all shadow-sm cursor-pointer space-y-2.5 group"
          >
            <div class="flex items-start justify-between">
              <div class="w-10 h-10 rounded-xl bg-surface-base border border-white/5 group-hover:border-white/20 flex items-center justify-center text-xl shadow-xs transition-colors shrink-0">
                ${escapeHtml(c.icon)}
              </div>
              <span class="text-[10px] tabular-nums px-2 py-0.5 rounded-full bg-surface-base text-slate-300 border border-white/10 group-hover:text-slate-200 group-hover:border-white/20 transition-colors">
                ${posts.filter(post => c.tags?.some(tag => post.flair?.toUpperCase().includes(tag) || post.title?.toUpperCase().includes(tag) || post.channelId?.includes(tag.toLowerCase()))).length} resources
              </span>
            </div>
            <div>
              <h4 class="text-sm font-bold text-white group-hover:text-[var(--color-accent,#e59b3c)] transition-colors">${escapeHtml(c.name)}</h4>
              <p class="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">${escapeHtml(c.description)}</p>
            </div>
            <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
              <span>Created ${escapeHtml(c.createdAt)}</span>
              <span class="text-slate-400 group-hover:text-[var(--color-accent,#e59b3c)] group-hover:translate-x-0.5 transition-all">Explore →</span>
            </div>
          </div>
        `).join('')}

        <!-- ADD COLLECTION PLACEHOLDER CARD -->
        <div 
          data-action="open-new-collection-modal"
          class="p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 hover:bg-surface-raised/30 transition-all flex flex-col items-center justify-center text-center p-6 space-y-2 cursor-pointer group min-h-[140px]"
        >
          <div class="w-10 h-10 rounded-xl bg-surface-base/80 border border-white/5 flex items-center justify-center text-xl text-slate-400 group-hover:text-slate-200 group-hover:border-white/20 transition-colors">
            +
          </div>
          <span class="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Create Custom Folder</span>
          <span class="text-[10px] text-slate-500">Organize research, private keys, or media</span>
        </div>
      </div>
    </div>
  `;
}

function renderNewCollectionModal(): string {
  if (!isNewCollectionModalOpen) return '';
  return `
    <div id="new-collection-modal-backdrop" data-action="close-new-collection-modal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div class="bg-surface-base border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" data-action="stop-propagation">
        <div class="flex items-center justify-between border-b border-white/5 pb-3">
          <div class="flex items-center space-x-2">
            <span class="text-xl">📁</span>
            <h3 class="text-sm font-bold text-white">Create New Collection</h3>
          </div>
          <button type="button" data-action="close-new-collection-modal" class="text-slate-400 hover:text-white text-base cursor-pointer">✕</button>
        </div>

        <form id="form-create-collection" data-submit="submit-new-collection" class="space-y-3.5">
          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-300">Collection Name</label>
            <input
              type="text"
              id="input-collection-name"
              required
              placeholder="e.g. Audit Reports 2026"
              class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e59b3c)]"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-300">Description</label>
            <input
              type="text"
              id="input-collection-desc"
              placeholder="Brief description of this folder..."
              class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e59b3c)]"
            />
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3 border-t border-white/5">
            <button
              type="button"
              data-action="close-new-collection-modal"
              class="px-4 py-2 bg-surface-raised hover:bg-surface-overlay text-slate-300 text-xs font-medium rounded-xl border border-white/5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

let vaultSearchQuery = '';

export function setVaultSearchQuery(q: string): void {
  vaultSearchQuery = q;
  clientStore.notifySync();
}

export function renderVaultWorkspace(): string {
  let posts = clientStore.posts.filter(p => p.channelId.startsWith('vault-') || p.flair === 'VERIFIED RELEASE' || p.flair === 'SECURITY ADVISORY');
  flairFilter.updateCounts(clientStore.posts);
  posts = flairFilter.filterPosts(posts);

  // Category specific filtering
  if (activeVaultCategory === 'saved') {
    const savedIds = canonicalVault.getSavedPostIds();
    const canonicalSaved = canonicalVault.getSavedPosts();
    const feedPosts = clientStore.posts.filter(p => savedIds.has(p.id) || savedIds.has(p.id.replace(/^post:/, '')));
    const feedIds = new Set(feedPosts.map(p => p.id));
    const extraPosts: ClientPost[] = canonicalSaved
      .filter(item => !feedIds.has(item.id.replace(/^post:/, '')) && !feedIds.has(item.source?.id || ''))
      .map(item => ({
        id: item.source?.id || item.id.replace(/^post:/, ''),
        channelId: item.source?.channelId || 'relays-general',
        authorFingerprint: item.source?.author || item.owner,
        authorRole: 'MEMBER' as const,
        title: item.title,
        content: item.content,
        flair: (item.tags[0]?.toUpperCase() as ClientPost['flair']) || 'TECH DISCUSSION',
        meritVotes: 0,
        replyCount: 0,
        boostCount: 0,
        userVoted: 0,
        isExpanded: false,
        createdAt: item.createdAt,
        status: 'published' as const,
      }));
    posts = [...feedPosts, ...extraPosts];
  } else if (activeVaultCategory === 'private') {
    posts = posts.filter(p => p.attachment || p.flair === 'SECURITY ADVISORY');
  } else if (activeVaultCategory === 'downloads') {
    posts = posts.filter(p => p.attachment);
  }

  if (vaultSearchQuery.trim()) {
    const q = vaultSearchQuery.toLowerCase();
    posts = posts.filter(p => (p.title && p.title.toLowerCase().includes(q)) || p.content.toLowerCase().includes(q));
  }

  return `
    <div class="workspace-vault flex-1 flex flex-col overflow-hidden bg-canvas">
      
      <!-- STICKY TOP VAULT NAVIGATION BAR -->
      <div class="workspace-vault__header sticky top-0 z-10 border-b border-white/5 bg-surface-base/90 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between shrink-0 min-h-[56px] py-2 shadow-sm gap-3">
        <div class="flex items-center space-x-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-surface-base border border-white/10 flex items-center justify-center text-[var(--color-accent,#e59b3c)] text-lg font-bold shadow-sm shrink-0">
            📁
          </div>
          <div class="min-w-0">
            <div class="flex items-center space-x-2">
              <h1 class="text-sm font-bold text-white tracking-tight">Vault</h1>
              <span class="sr-only">KNOWLEDGE VAULT</span>
              <span class="text-[10px] font-semibold text-slate-400 hidden sm:inline">Knowledge with context</span>
            </div>
            <p class="text-[11px] text-slate-400 truncate">Private files, saved posts and knowledge.</p>
          </div>
        </div>

        <!-- QUICK ACTIONS & SORT -->
        <div class="flex items-center space-x-2 shrink-0">
          <button type="button" data-action="save-link" class="px-2.5 py-1.5 bg-surface-raised hover:bg-surface-overlay text-slate-200 text-xs font-medium rounded-xl border border-white/5 transition-all flex items-center space-x-1 cursor-pointer" title="Save link">
            <span>🔗</span>
            <span class="hidden md:inline">Save link</span>
          </button>
          <button type="button" data-action="open-new-collection-modal" class="px-2.5 py-1.5 bg-surface-raised hover:bg-surface-overlay text-slate-200 text-xs font-medium rounded-xl border border-white/5 transition-all flex items-center space-x-1 cursor-pointer" title="New collection">
            <span>📁</span>
            <span class="hidden md:inline">New collection</span>
          </button>
          <button id="btn-open-composer" data-action="open-composer" class="px-3.5 py-1.5 bg-surface-raised hover:bg-surface-overlay text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer" title="Publish a public resource">
            <span>+</span>
            <span>Publish resource</span>
          </button>
        </div>
      </div>

      <!-- IN-VAULT SEARCH BAR -->
      <div class="workspace-vault__search px-4 md:px-6 py-2 border-b border-white/5 bg-surface-base/40 flex items-center shrink-0">
        <div class="relative w-full max-w-lg">
          <input
            type="text"
            id="input-vault-search"
            value="${escapeHtml(vaultSearchQuery)}"
            placeholder="Search within Vault..."
            aria-label="Search within Vault"
            data-input="search-vault"
            class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e59b3c)] transition-all font-sans"
          />
        </div>
      </div>

      <!-- PRIVACY REASSURANCE BANNER -->
      <div class="workspace-vault__privacy px-4 md:px-6 py-1.5 bg-surface-raised/30 border-b border-white/5 flex items-center text-[11px] text-slate-400">
        <span class="mr-1.5">🔒</span>
        <span>Your Vault contents are encrypted before leaving your device. Cloudflare stores encrypted data and limited operational metadata but cannot read your private Vault content.</span>
      </div>

      <!-- CONSUMER SECTION CATEGORIES / TABS -->
      <div class="workspace-vault__tabs flex items-center gap-1.5 overflow-x-auto py-2 px-4 md:px-6 border-b border-white/5 bg-surface-base/60 text-xs no-scrollbar shrink-0" role="tablist" aria-label="Vault sections">
        ${[
          { id: 'private', label: 'My knowledge', icon: '🔒' },
          { id: 'saved', label: 'Saved posts', icon: '🔖' },
          { id: 'recent', label: 'Public resources', icon: '⏱️' },
          { id: 'collections', label: 'Collections', icon: '📁' },
          { id: 'downloads', label: 'Attachments', icon: '⬇️' },
        ].map(cat => `
          <button type="button" role="tab" aria-selected="${activeVaultCategory === cat.id}" data-action="switch-vault-tab" data-vault-tab="${cat.id}" class="workspace-vault__tab px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${activeVaultCategory === cat.id ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white hover:bg-surface-raised border border-transparent'}">
            <span>${cat.icon}</span>
            <span>${cat.label}</span>
          </button>
        `).join('')}
      </div>

      <!-- VAULT CONTENT SCROLL AREA (CONTENT FIRST) -->
      <div id="main-feed-scroll" class="workspace-vault__content flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto space-y-4 max-w-5xl mx-auto w-full pb-20 md:pb-6">
        ${renderUploadProgressCard()}
        ${
          activeVaultCategory === 'private'
            ? renderKnowledgeMemoryPlaceholder()
            : activeVaultCategory === 'collections'
            ? renderCollectionsView(posts)
            : posts.length === 0
              ? (clientStore.activeChannelId === 'vault-releases' ? renderVaultReleasesEmptyState() : renderVaultFilesEmptyState())
              : posts.map(p => renderVaultReleaseCard(p)).join('')
        }

        <!-- SECONDARY CONTROLS (COLLAPSIBLE AT BOTTOM) -->
        <details class="vault-storage-details border border-white/5 rounded-2xl bg-surface-base/50 overflow-hidden text-xs select-none mt-8">
          <summary class="px-4 py-3 flex items-center justify-between text-slate-400 hover:text-white cursor-pointer bg-surface-raised/40 transition-colors font-medium">
            <span class="flex items-center gap-2">
              <span>💾</span>
              <span class="text-xs font-semibold text-slate-300">Storage &amp; Portability</span>
            </span>
            <span class="text-[11px] text-slate-500">Details ▾</span>
          </summary>
          <div class="p-4 border-t border-white/5 bg-surface-base">
            ${renderStorageQuotaMeter()}
          </div>
        </details>

        <!-- NODE DIAGNOSTICS (COLLAPSED) -->
        <details class="vault-telemetry-details border border-white/5 rounded-2xl bg-surface-base/50 overflow-hidden text-xs font-mono select-none">
          <summary class="px-4 py-3 flex items-center justify-between text-slate-400 hover:text-white cursor-pointer bg-surface-raised/40 transition-colors">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span class="text-xs font-semibold text-slate-300">Node Diagnostics</span>
            </div>
            <span class="text-[11px] text-slate-500">Diagnostics ▾</span>
          </summary>
          <div class="p-3 md:p-4 bg-surface-base border-t border-white/5">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-3 rounded-xl bg-surface-raised/80 border border-white/10">
                <div class="text-[10px] text-slate-400 uppercase">ACTIVE SEEDERS</div>
                <div class="text-sm text-slate-400 mt-0.5">Not measured</div>
              </div>
              <div class="p-3 rounded-xl bg-surface-raised/80 border border-white/5">
                <div class="text-[10px] text-slate-400 uppercase">REPRODUCIBILITY</div>
                <div class="text-sm text-slate-400 mt-0.5">Inspect each resource</div>
              </div>
              <div class="p-3 rounded-xl bg-surface-raised/80 border border-white/5">
                <div class="text-[10px] text-slate-400 uppercase">ENTROPY VERDICT</div>
                <div class="text-sm text-slate-400 mt-0.5">Not a malware verdict</div>
              </div>
              <div class="p-3 rounded-xl bg-surface-raised/80 border border-white/5">
                <div class="text-[10px] text-slate-400 uppercase">LEDGER STATE</div>
                <div class="text-sm text-slate-400 mt-0.5">Not measured</div>
              </div>
            </div>
          </div>
        </details>
      </div>

      <!-- NEW COLLECTION MODAL -->
      ${renderNewCollectionModal()}
    </div>
  `;
}
