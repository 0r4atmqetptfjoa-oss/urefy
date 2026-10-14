/**
 * @file vault-view.ts
 * @package @aetheris/client-ui
 * @description 2027 Sovereign Encrypted Knowledge Vault & Verified Binary Release Workspace.
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
import { renderKnowledgeMemory } from './knowledge-memory-view.js';

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

const COLLECTIONS_STORAGE_KEY = 'aetheris_vault_collections_v1';

let selectedCollectionId: string | null = null;
let isNewCollectionModalOpen = false;
let activeVaultCategory: string = 'all';
let vaultSearchQuery: string = '';
let accountStorageSummary = {
  usedBytes: 0,
  accountQuotaBytes: 100 * 1024 * 1024,
  maxFileBytes: 25 * 1024 * 1024,
};

let uploadSimulationState: VaultUploadProgress = {
  active: false,
  fileName: '',
  percent: 0,
  chunk: 0,
  totalChunks: 0,
  sha256Prefix: '',
  totalBytes: 0,
};

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function refreshAccountStorage(): Promise<void> {
  try {
    const fp = clientStore.keypair?.fingerprint || '';
    const res = await fetch(`/api/storage?quota=true&owner=${encodeURIComponent(fp)}`);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.usedBytes === 'number') {
        accountStorageSummary.usedBytes = data.usedBytes;
      }
      if (typeof data.accountQuotaBytes === 'number') {
        accountStorageSummary.accountQuotaBytes = data.accountQuotaBytes;
      }
    }
  } catch {
    // keep cached storage metrics
  }
}

function isVaultCollection(value: unknown): value is VaultCollection {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as VaultCollection).id === 'string' &&
      typeof (value as VaultCollection).name === 'string'
  );
}

function loadCollections(): VaultCollection[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(COLLECTIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(isVaultCollection);
        }
      }
    }
  } catch {
    // ignore
  }
  return [
    {
      id: 'col-zk-papers',
      name: 'Zero-Knowledge Proofs',
      description: 'Groth16, BN254 & RLN protocol specifications',
      icon: '🔐',
      count: 4,
      createdAt: '2026-09-20',
      tags: ['cryptography', 'zk'],
    },
    {
      id: 'col-clean-binaries',
      name: 'Verified Binaries',
      description: 'Reproducible builds with verified Merkle roots',
      icon: '🛡️',
      count: 2,
      createdAt: '2026-09-24',
      tags: ['releases', 'hygiene'],
    },
  ];
}

function saveCollections(cols: VaultCollection[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(cols));
    }
  } catch {
    // ignore
  }
}

export function getVaultCollections(): VaultCollection[] {
  return loadCollections();
}

export function createVaultCollection(name: string, description: string, icon = '📁'): VaultCollection {
  const cols = loadCollections();
  const created: VaultCollection = {
    id: `col-${Date.now()}`,
    name: name.trim() || 'Untitled Collection',
    description: description.trim() || 'Sovereign encrypted collection',
    icon,
    count: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  cols.unshift(created);
  saveCollections(cols);
  void canonicalVault.createCollection(created.name, created.description, icon);
  clientStore.notify('VAULT_COLLECTION_CREATED', created);
  return created;
}

export function deleteVaultCollection(id: string): void {
  const cols = loadCollections().filter((c) => c.id !== id);
  saveCollections(cols);
  if (selectedCollectionId === id) selectedCollectionId = null;
  void canonicalVault.deleteCollection(id, true);
  clientStore.notify('VAULT_COLLECTION_DELETED', id);
}

export function setSelectedVaultCollection(id: string | null): void {
  selectedCollectionId = id;
  clientStore.notify('VAULT_COLLECTION_SELECTED', id);
}

export function getSelectedVaultCollection(): string | null {
  return selectedCollectionId;
}

export function openNewCollectionModal(): void {
  isNewCollectionModalOpen = true;
  clientStore.notify('VAULT_MODAL_CHANGED', true);
}

export function closeNewCollectionModal(): void {
  isNewCollectionModalOpen = false;
  clientStore.notify('VAULT_MODAL_CHANGED', false);
}

export function startUploadSimulation(fileName = 'genome-assembly-v3.bin', totalBytes = 33554432): void {
  if (!isDemoModeEnabled()) return;
  const totalChunks = Math.max(1, Math.ceil(totalBytes / (64 * 1024)));
  uploadSimulationState = {
    active: true,
    fileName,
    percent: 25,
    chunk: Math.floor(totalChunks * 0.25),
    totalChunks,
    sha256Prefix: 'a11fe18f96351880',
    totalBytes,
  };
  clientStore.notify('VAULT_UPLOAD_PROGRESS', uploadSimulationState);
}

export function cancelUploadSimulation(): void {
  uploadSimulationState.active = false;
  clientStore.notify('VAULT_UPLOAD_CANCELLED');
}

export function setActiveVaultCategory(cat: string): void {
  activeVaultCategory = cat;
  clientStore.notify('VAULT_CATEGORY_CHANGED', cat);
}

export function getActiveVaultCategory(): string {
  return activeVaultCategory;
}

export function setVaultSearchQuery(q: string): void {
  vaultSearchQuery = q;
  clientStore.notify('VAULT_SEARCH_CHANGED', q);
}

function renderThreadNode(c: ThreadComment): string {
  return `<div class="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-slate-300">
    <div class="font-mono text-[10px] text-cyan-400">@${escapeHtml(c.authorFingerprint)}</div>
    <div class="mt-1">${markdownRenderer.renderRichContent(c.content)}</div>
  </div>`;
}

export function renderVaultReleaseCard(p: ClientPost): string {
  const att = p.attachment;
  const comments = threadManager.getRootCommentsForPost(p.id);

  return `<article
    id="vault-release-${escapeHtml(p.id)}"
    class="rounded-3xl bg-surface-base/85 backdrop-blur-2xl border border-white/10 hover:border-emerald-400/35 p-5 shadow-xl transition-all"
  >
    <div class="flex items-start justify-between gap-3 mb-2">
      <div>
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          ${escapeHtml(p.flair || 'VERIFIED RELEASE')}
        </span>
        <h3 class="text-base font-extrabold text-white mt-1.5">${escapeHtml(p.title)}</h3>
      </div>
      <span class="text-xs font-mono text-cyan-300 font-bold">▲ ${p.meritVotes}</span>
    </div>

    <div class="text-xs text-slate-300 leading-relaxed mb-3">
      ${markdownRenderer.renderRichContent(p.content)}
    </div>

    ${
      att
        ? `<div class="p-3.5 rounded-2xl bg-slate-950/85 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
            <div class="space-y-0.5 min-w-0">
              <div class="text-white font-bold truncate">📦 ${escapeHtml(att.fileName)} (${Math.round(
            att.byteSize / 1024
          )} KB)</div>
              <div class="text-[11px] text-slate-400 truncate">SHA-256: ${escapeHtml(att.sha256)}</div>
              <div class="text-[11px] text-emerald-400">Shannon Entropy: ${att.entropy} bits/byte · Verdict: ${escapeHtml(
            att.verdict
          )}</div>
            </div>
          </div>`
        : ''
    }

    ${
      comments.length > 0
        ? `<div class="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
            ${comments.slice(0, 2).map(renderThreadNode).join('')}
          </div>`
        : ''
    }
  </article>`;
}

export function exportKnowledgePack(): void {
  const json = canonicalVault.exportBackupJSON();
  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urefy-vault-pack-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  toastManager.success(t('vault.exported', undefined, 'Encrypted Knowledge Pack exported'));
}

export function importKnowledgePack(): void {
  if (typeof document === 'undefined') return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    const count = await canonicalVault.importBackupJSON(text);
    toastManager.success(`Imported ${count} items into your Vault`);
    clientStore.notify('VAULT_IMPORTED', count);
  });
  input.click();
}

function renderStorageQuotaMeter(): string {
  const usedMB = +(accountStorageSummary.usedBytes / (1024 * 1024)).toFixed(2);
  const quotaMB = Math.round(accountStorageSummary.accountQuotaBytes / (1024 * 1024));
  const pct = Math.min(100, Math.round((accountStorageSummary.usedBytes / Math.max(1, accountStorageSummary.accountQuotaBytes)) * 100));

  return `<div class="p-4 rounded-2xl bg-surface-base/80 backdrop-blur-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
    <div>
      <div class="text-xs font-bold text-white flex items-center gap-2">
        <span>🔐 Zero-Knowledge Vault Quota (AES-256-GCM)</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">${usedMB} MB / ${quotaMB} MB</span>
      </div>
      <p class="text-[11px] text-slate-400 mt-0.5">All private notes, saved discussions, and snapshots are encrypted on-device before R2 sync.</p>
    </div>
    <div class="w-48 h-2 rounded-full bg-white/10 overflow-hidden">
      <div class="h-full bg-gradient-to-r from-cyan-400 to-emerald-400" style="width: ${Math.max(2, pct)}%"></div>
    </div>
  </div>`;
}

function renderUploadProgressCard(): string {
  if (!uploadSimulationState.active) return '';
  return `<div class="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/35 text-xs font-mono text-cyan-200 flex items-center justify-between">
    <span>Uploading & Hashing ${escapeHtml(uploadSimulationState.fileName)} (${uploadSimulationState.percent}%)</span>
    <button type="button" data-action="cancelUploadSimulation()" class="text-rose-300 hover:text-white">Cancel</button>
  </div>`;
}

function renderCollectionsView(posts: ClientPost[]): string {
  const cols = loadCollections();
  return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    ${cols
      .map(
        (col) => `<div
          data-vault-collection-id="${escapeHtml(col.id)}"
          class="p-4 rounded-2xl bg-surface-base/80 backdrop-blur-xl border ${
            selectedCollectionId === col.id ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/[0.08] hover:border-white/20'
          } transition-all cursor-pointer"
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xl">${escapeHtml(col.icon)}</span>
            <span class="text-[11px] font-mono text-slate-400">${posts.length} items</span>
          </div>
          <h4 class="text-sm font-bold text-white">${escapeHtml(col.name)}</h4>
          <p class="text-xs text-slate-400 mt-0.5 line-clamp-2">${escapeHtml(col.description)}</p>
        </div>`
      )
      .join('')}
  </div>`;
}

function renderNewCollectionModal(): string {
  if (!isNewCollectionModalOpen) return '';
  return `<div id="vault-new-collection-modal" role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
    <div class="w-full max-w-md rounded-3xl bg-[#0c101b] border border-white/15 p-6 shadow-2xl">
      <h3 class="text-base font-bold text-white mb-2">Create Encrypted Collection</h3>
      <p class="text-xs text-slate-400 mb-4">Organize saved posts, code artifacts, and private notes.</p>
      <div class="flex justify-end gap-2">
        <button type="button" data-action="closeNewCollectionModal()" class="px-4 py-2 rounded-xl bg-white/10 text-xs text-white cursor-pointer">Close</button>
      </div>
    </div>
  </div>`;
}

export function renderVaultWorkspace(): string {
  const allPosts = clientStore.posts || [];
  const vaultPosts = flairFilter.filterPosts(
    allPosts.filter((p) => {
      if (vaultSearchQuery.trim()) {
        const q = vaultSearchQuery.trim().toLowerCase();
        return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
      }
      return p.channelId.startsWith('vault') || p.attachment || bookmarksVault.isSaved(p.id);
    })
  );

  return `<div id="vault-workspace" class="w-full max-w-4xl mx-auto space-y-6 pb-16">
    <header class="rounded-3xl bg-gradient-to-br from-[#0d1522]/95 via-surface-base/90 to-[#0a1815]/95 backdrop-blur-2xl border border-white/10 p-6 shadow-2xl">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            2027 Sovereign Personal Archive
          </span>
          <h1 class="text-xl sm:text-2xl font-extrabold text-white mt-1">Encrypted Knowledge Vault & Verified Releases</h1>
          <p class="text-xs text-slate-400 mt-0.5">Keep saved discussions, private research notes, and SHA-256 verified artifacts synchronized across your devices.</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            id="btn-vault-export-pack"
            data-action="vault.openArchiveModal"
            data-archive-action="export"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 cursor-pointer"
          >
            ${renderIcon('download', { size: 14, ariaHidden: true })}
            <span>Export Archive</span>
          </button>
          <button
            type="button"
            id="btn-open-binary-hygiene"
            data-action="modal.open"
            data-feature="binary-hygiene"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-xs font-bold text-emerald-300 border border-emerald-500/35 cursor-pointer"
          >
            ${renderIcon('shield-check', { size: 15, ariaHidden: true })}
            <span>Scan Binary</span>
          </button>
        </div>
      </div>

      <div class="mt-4 relative flex items-center">
        <span class="absolute left-3.5 text-slate-400 pointer-events-none">
          ${renderIcon('search', { size: 16, ariaHidden: true })}
        </span>
        <input
          id="vault-search-input"
          type="search"
          value="${escapeHtml(vaultSearchQuery)}"
          data-input-action="vault.search"
          placeholder="Filter saved memories, notes, SHA-256 hashes, or releases..."
          aria-label="Search in Vault"
          class="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-2xl bg-black/40 text-xs text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:border-emerald-400/60"
        />
      </div>
    </header>

    ${renderStorageQuotaMeter()}
    ${renderUploadProgressCard()}

    <section aria-labelledby="vault-collections-heading">
      <div class="flex items-center justify-between mb-3">
        <h2 id="vault-collections-heading" class="text-xs font-extrabold uppercase tracking-wider text-slate-300">Collections</h2>
      </div>
      ${renderCollectionsView(vaultPosts)}
    </section>

    <section aria-labelledby="vault-memory-heading">
      ${renderKnowledgeMemory()}
    </section>

    <section aria-labelledby="vault-releases-heading" class="space-y-4">
      <h2 id="vault-releases-heading" class="text-xs font-extrabold uppercase tracking-wider text-slate-300">Verified Releases & Saved Artifacts</h2>
      ${
        vaultPosts.length > 0
          ? vaultPosts.map((p) => renderVaultReleaseCard(p)).join('')
          : renderVaultReleasesEmptyState()
      }
    </section>

    ${renderNewCollectionModal()}
  </div>`;
}
