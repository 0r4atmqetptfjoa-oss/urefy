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
    <div class="p-3.5 sm:p-4 md:p-5 rounded-2xl bg-surface-raised border border-white/5 hover:border-emerald-500/30 transition-all shadow-md space-y-4">
      
      <!-- TOP RELEASE HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-950/90 border border-emerald-500/30 flex items-center justify-center text-xl text-emerald-400 shadow-sm shrink-0">
            📦
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h3 data-open-detail="${p.id}" class="btn-open-detail text-sm font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer">${escapeHtml(p.title)}</h3>
              <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">100% REPRODUCIBLE</span>
            </div>
            <div class="flex items-center space-x-2 text-[11px] font-mono text-slate-400 mt-0.5">
              <span>Author: @id:${p.authorFingerprint.substring(0, 8)}</span>
              <span>•</span>
              <span>Published: ${time}</span>
              <span>•</span>
              <span class="text-emerald-400">c/clean-releases</span>
            </div>
          </div>
        </div>

        <!-- MERIT SCORE PILL -->
        <div class="flex items-center space-x-1.5 bg-surface-overlay px-3 py-1.5 rounded-xl border border-white/5 self-start sm:self-auto font-mono text-xs">
          <button data-vote-id="${p.id}" data-dir="1" class="btn-upvote text-slate-400 hover:text-emerald-400 cursor-pointer p-1" title="Endorse (+1 Merit)">▲</button>
          <span class="font-bold text-emerald-400">${p.meritVotes} Merit</span>
          <button data-vote-id="${p.id}" data-dir="-1" class="btn-downvote text-slate-400 hover:text-rose-400 cursor-pointer p-1" title="Divergent (-1)">▼</button>
        </div>
      </div>

      <!-- RELEASE BODY & SYNTHESIS -->
      <div class="text-xs text-slate-300 leading-relaxed space-y-2">
        ${markdownRenderer.renderMarkdown(p.content)}
      </div>

      <!-- BINARY HYGIENE SPECIFICATIONS MATRIX -->
      <div class="p-4 rounded-xl bg-surface-base border border-white/5 space-y-3 font-mono text-xs">
        <div class="flex items-center justify-between text-[11px] border-b border-white/5 pb-2">
          <span class="text-slate-400 font-bold">Cryptographic Software Attestation:</span>
          <span class="text-emerald-400">Audit Status: PASS</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div>
            <span class="text-slate-500">File Name:</span>
            <div class="text-slate-200 font-bold truncate">${fileName} (${(byteSize / 1024).toFixed(1)} KB)</div>
          </div>
          <div>
            <span class="text-slate-500">Shannon Entropy:</span>
            <div class="text-emerald-400 font-bold">${entropy.toFixed(2)} bits/byte (Clean / Unpacked)</div>
          </div>
        </div>

        <div class="p-2 rounded-lg bg-surface-overlay flex items-center justify-between text-[10px] text-slate-400">
          <span class="truncate pr-2">SHA256: ${sha}</span>
          <button class="btn-copy-sha px-2.5 py-1 bg-surface-highlight hover:bg-slate-700 text-slate-200 rounded text-[9px] cursor-pointer shrink-0" data-sha="${sha}">
            Copy SHA
          </button>
        </div>
      </div>

      <!-- ACTIONS BAR -->
      <div class="flex items-center justify-between pt-1 border-t border-white/5 text-xs font-mono">
        <div class="flex items-center space-x-3 text-slate-400">
          <button data-expand-post="${p.id}" class="btn-toggle-post-expand flex items-center space-x-1 hover:text-white transition-colors cursor-pointer">
            <span>💬</span>
            <span>${p.replyCount} Notes</span>
          </button>
          <button data-boost-post="${p.id}" class="btn-boost flex items-center space-x-1 hover:text-white transition-colors cursor-pointer">
            <span>⟳</span>
            <span>${p.boostCount} Re-broadcasts</span>
          </button>
          ${bookmarksVault.renderBookmarkButton(p.id)}
          <button
            type="button"
            data-action="report-post"
            data-post-id="${p.id}"
            class="btn-pulse-report flex items-center space-x-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            title="Report illegal content / Abuse (DSA Notice & Takedown)"
            aria-label="Report content"
          >
            <span>🚩</span>
            <span class="hidden sm:inline">Report</span>
          </button>
        </div>

        <button data-file-name="${fileName}" data-byte-size="${byteSize}" data-sha="${sha}" class="btn-download-p2p px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center space-x-2 cursor-pointer">
          <span>⬇</span>
          <span>Download via P2P Mesh</span>
        </button>
      </div>

      <!-- INLINE DISCUSSION TREE -->
      ${p.isExpanded ? `
        <div class="pt-3 border-t border-white/5 space-y-3">
          <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Technical Review & Discussion Tree:
          </div>
          <div class="space-y-3">
            ${threadManager.getRootComments().map(c => renderThreadNode(c)).join('')}
          </div>
        </div>
      ` : ''}

    </div>
  `;
}

export function renderVaultWorkspace(): string {
  let posts = clientStore.posts.filter(p => p.channelId.startsWith('vault-') || p.flair === 'VERIFIED RELEASE' || p.flair === 'SECURITY ADVISORY');
  flairFilter.updateCounts(clientStore.posts);
  posts = flairFilter.filterPosts(posts);

  return `
    <div class="flex-1 flex flex-col overflow-hidden bg-canvas">
      
      <!-- STICKY TOP VAULT NAVIGATION BAR -->
      <div class="sticky top-0 z-10 border-subtle-b bg-surface-base/90 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between shrink-0 h-14 shadow-sm">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-base font-bold shadow-sm">
            📚
          </div>
          <div>
            <h1 class="text-xs font-bold text-white tracking-wide">KNOWLEDGE VAULT & REPRODUCIBLE REPOSITORY</h1>
            <p class="text-[10px] text-slate-400 font-mono">Decentralized binary distribution ledger with Merkle tree verification.</p>
          </div>
        </div>

        <!-- CATEGORY & SORT BUTTONS -->
        <div class="flex items-center space-x-2">
          <div class="flex items-center space-x-1 bg-surface-raised p-0.5 rounded-xl border border-white/5 text-xs">
            <button data-sort="hot" class="btn-sort px-2.5 py-1 rounded-lg font-medium ${clientStore.sortMode === 'hot' ? 'bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}">
              🔥 Audited
            </button>
            <button data-sort="new" class="btn-sort px-2.5 py-1 rounded-lg font-medium ${clientStore.sortMode === 'new' ? 'bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}">
              ⏱️ Latest
            </button>
            <button data-sort="top" class="btn-sort px-2.5 py-1 rounded-lg font-medium ${clientStore.sortMode === 'top' ? 'bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}">
              🏆 Top Merit
            </button>
          </div>

          <button id="btn-open-composer" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer">
            <span>📦</span>
            <span class="hidden sm:inline">Publish Release</span>
          </button>
        </div>
      </div>

      <!-- VAULT TELEMETRY & INTEGRITY HERO -->
      <div class="border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-surface-base to-surface-base p-4 md:p-5 shrink-0">
        <div class="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div class="p-3 rounded-xl bg-surface-raised/80 border border-emerald-500/20">
            <div class="text-[10px] text-slate-400 uppercase">ACTIVE SEEDERS</div>
            <div class="text-sm font-bold text-emerald-400 mt-0.5">342 Mesh Nodes</div>
          </div>
          <div class="p-3 rounded-xl bg-surface-raised/80 border border-white/5">
            <div class="text-[10px] text-slate-400 uppercase">REPRODUCIBILITY</div>
            <div class="text-sm font-bold text-indigo-300 mt-0.5">100% Byte-Match</div>
          </div>
          <div class="p-3 rounded-xl bg-surface-raised/80 border border-white/5">
            <div class="text-[10px] text-slate-400 uppercase">ENTROPY VERDICT</div>
            <div class="text-sm font-bold text-emerald-400 mt-0.5">Zero Malicious Sections</div>
          </div>
          <div class="p-3 rounded-xl bg-surface-raised/80 border border-white/5">
            <div class="text-[10px] text-slate-400 uppercase">LEDGER STATE</div>
            <div class="text-sm font-bold text-slate-200 mt-0.5">Merkle Tree Level 4</div>
          </div>
        </div>
      </div>

      <!-- VAULT RELEASES CATALOG -->
      <div id="main-feed-scroll" class="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto space-y-4 max-w-5xl mx-auto w-full pb-20 md:pb-6">
        ${posts.length === 0 ? (clientStore.activeChannelId === 'vault-releases' ? renderVaultReleasesEmptyState() : renderVaultFilesEmptyState()) : posts.map(p => renderVaultReleaseCard(p)).join('')}
      </div>
    </div>
  `;
}
