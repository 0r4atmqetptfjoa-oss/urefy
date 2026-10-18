/**
 * @file export-backup-ui.ts
 * @package @aetheris/client-ui
 * @description Lightweight UI templates for Sovereign Export & Backup.
 * Separated from heavy cryptographic routines to preserve startup bundle performance.
 */

import { escapeHtml } from './dry-utils.js';
import { renderIcon } from './ui/icons.js';

export interface BackupSizeReportSummary {
  posts: number;
  bookmarks: number;
  drafts: number;
  messages: number;
  keys: number;
  preferences: number;
  totalKB: number;
  totalItems: number;
}

export interface LastExportMetaSummary {
  lastExportTime: number;
  lastExportCount: number;
}

function getLocalBackupSizeSummary(): BackupSizeReportSummary {
  const report: BackupSizeReportSummary = {
    posts: 0,
    bookmarks: 0,
    drafts: 0,
    messages: 0,
    keys: 0,
    preferences: 0,
    totalKB: 0,
    totalItems: 0,
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    return report;
  }

  const keys = {
    posts: ['aetheris_posts', 'aetheris_client_posts', 'aetheris_feed_posts'],
    bookmarks: ['aetheris_bookmarks', 'aetheris_vault_bookmarks'],
    drafts: ['aetheris_drafts', 'aetheris_draft_v2', 'aetheris_active_draft', 'aetheris_saved_drafts'],
    messages: ['aetheris_direct_messages', 'aetheris_dm_conversations', 'aetheris_channel_messages', 'aetheris_messages'],
    preferences: ['aetheris_theme_preferences', 'aetheris_theme', 'aetheris_density_mode', 'aetheris_sound_enabled', 'aetheris_ui_settings'],
    keys: ['aetheris_keypair', 'aetheris_identity', 'aetheris_zk_nullifier', 'aetheris_rln_secret', 'aetheris_master_seed'],
  };

  let totalChars = 0;

  for (const k of keys.posts) {
    const raw = localStorage.getItem(k);
    if (raw) {
      totalChars += raw.length;
      try {
        const parsed = JSON.parse(raw);
        report.posts += Array.isArray(parsed) ? parsed.length : 1;
      } catch {
        report.posts += 1;
      }
    }
  }

  for (const k of keys.bookmarks) {
    const raw = localStorage.getItem(k);
    if (raw) {
      totalChars += raw.length;
      try {
        const parsed = JSON.parse(raw);
        report.bookmarks += Array.isArray(parsed) ? parsed.length : 1;
      } catch {
        report.bookmarks += 1;
      }
    }
  }

  for (const k of keys.drafts) {
    const raw = localStorage.getItem(k);
    if (raw) {
      totalChars += raw.length;
      report.drafts += 1;
    }
  }

  for (const k of keys.preferences) {
    const raw = localStorage.getItem(k);
    if (raw) {
      totalChars += raw.length;
      report.preferences += 1;
    }
  }

  for (const k of keys.messages) {
    const raw = localStorage.getItem(k);
    if (raw) {
      totalChars += raw.length;
      try {
        const parsed = JSON.parse(raw);
        report.messages += Array.isArray(parsed) ? parsed.length : 1;
      } catch {
        report.messages += 1;
      }
    }
  }

  for (const k of keys.keys) {
    const raw = localStorage.getItem(k);
    if (raw) {
      totalChars += raw.length;
      report.keys += 1;
    }
  }

  report.totalItems =
    report.posts +
    report.bookmarks +
    report.drafts +
    report.messages +
    report.keys +
    report.preferences;
  report.totalKB = Math.max(1, Math.round(totalChars / 1024));
  return report;
}

export function renderExportPanelHTML(
  sizeReport?: BackupSizeReportSummary,
  meta?: LastExportMetaSummary,
  version = '1.4.0'
): string {
  const report = sizeReport || getLocalBackupSizeSummary();
  const lastExportTime = meta?.lastExportTime || 0;
  const lastExportCount = meta?.lastExportCount || 0;
  const formattedExportTime =
    lastExportTime > 0 ? new Date(lastExportTime).toLocaleString() : '';

  return `
    <div id="aetheris-export-backup-container" class="w-full max-w-4xl mx-auto bg-surface-base border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-100 font-sans backdrop-blur-xl animate-in fade-in transition-all">
      <!-- HEADER -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-xl bg-cyphr/10 border border-cyphr/30 flex items-center justify-center text-cyphr shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Sovereign Export &amp; Backup
              <span class="text-xs px-2.5 py-0.5 rounded-full font-mono bg-cyphr/15 text-cyphr border border-cyphr/30">v${version}</span>
            </h2>
            <p class="text-xs sm:text-sm text-slate-400 mt-0.5">
              Maintain full sovereignty over your data: archive, encrypt, or migrate your identity to any node.
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 text-xs text-slate-300 font-mono">
          <span class="w-2 h-2 rounded-full bg-signal animate-pulse"></span>
          <span>Local Vault: ${report.totalKB} KB</span>
        </div>
      </div>

      <!-- GRID: EXPORT OPTIONS & CATEGORIES -->
      <div class="mt-6 space-y-6">
        <div>
          <div class="flex items-center justify-between mb-3">
            <label class="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <svg class="w-4 h-4 text-cyphr" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Data Categories for Export
            </label>
            <span class="text-xs text-slate-400 font-mono" id="aether-selected-counter">${report.totalItems} items selected</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5" id="aether-export-checkbox-grid">
            <!-- Item 1: Posts -->
            <label class="group flex items-start gap-3 p-3.5 rounded-xl bg-surface-raised/80 hover:bg-surface-overlay border border-white/5 hover:border-cyphr/40 transition-all cursor-pointer">
              <input type="checkbox" id="chk-export-posts" checked class="mt-1 rounded bg-surface-base border-white/20 text-cyphr focus:ring-0 focus:ring-offset-0 transition-colors w-4 h-4 cursor-pointer accent-cyan-400" />
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-slate-100 group-hover:text-cyphr transition-colors">Posts &amp; Nanopub</span>
                  <span class="text-xs px-1.5 py-0.5 rounded bg-surface-base text-slate-400 font-mono">${report.posts}</span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">Posts from relays, pulses, and attachments.</p>
              </div>
            </label>

            <!-- Item 2: Bookmarks -->
            <label class="group flex items-start gap-3 p-3.5 rounded-xl bg-surface-raised/80 hover:bg-surface-overlay border border-white/5 hover:border-cyphr/40 transition-all cursor-pointer">
              <input type="checkbox" id="chk-export-bookmarks" checked class="mt-1 rounded bg-surface-base border-white/20 text-cyphr focus:ring-0 focus:ring-offset-0 transition-colors w-4 h-4 cursor-pointer accent-cyan-400" />
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-slate-100 group-hover:text-cyphr transition-colors">Bookmarks &amp; Vault</span>
                  <span class="text-xs px-1.5 py-0.5 rounded bg-surface-base text-slate-400 font-mono">${report.bookmarks}</span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">Saved articles, tags, and personal notes.</p>
              </div>
            </label>

            <!-- Item 3: Drafts -->
            <label class="group flex items-start gap-3 p-3.5 rounded-xl bg-surface-raised/80 hover:bg-surface-overlay border border-white/5 hover:border-cyphr/40 transition-all cursor-pointer">
              <input type="checkbox" id="chk-export-drafts" checked class="mt-1 rounded bg-surface-base border-white/20 text-cyphr focus:ring-0 focus:ring-offset-0 transition-colors w-4 h-4 cursor-pointer accent-cyan-400" />
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-slate-100 group-hover:text-cyphr transition-colors">Drafts &amp; Autosave</span>
                  <span class="text-xs px-1.5 py-0.5 rounded bg-surface-base text-slate-400 font-mono">${report.drafts}</span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">Working revisions and unpublished drafts.</p>
              </div>
            </label>

            <button type="button" data-action="open-dm" class="flex items-center gap-3 p-3.5 rounded-lg bg-surface-raised/80 hover:bg-surface-overlay border border-white/5 text-sm text-slate-100 text-left">
              ${renderIcon('MessageSquare', { size: 20 })}
              <span>Private Message Transcripts</span>
            </button>

            <!-- Item 5: Preferences -->
            <label class="group flex items-start gap-3 p-3.5 rounded-xl bg-surface-raised/80 hover:bg-surface-overlay border border-white/5 hover:border-cyphr/40 transition-all cursor-pointer">
              <input type="checkbox" id="chk-export-preferences" checked class="mt-1 rounded bg-surface-base border-white/20 text-cyphr focus:ring-0 focus:ring-offset-0 transition-colors w-4 h-4 cursor-pointer accent-cyan-400" />
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-slate-100 group-hover:text-cyphr transition-colors">Preferences &amp; Theme</span>
                  <span class="text-xs px-1.5 py-0.5 rounded bg-surface-base text-slate-400 font-mono">${report.preferences}</span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">Obsidian themes, fonts, and UI configurations.</p>
              </div>
            </label>

            <button type="button" data-action="open-feature" data-feature="archive" class="flex items-center gap-3 p-3.5 rounded-lg bg-surface-raised/80 hover:bg-surface-overlay border border-white/5 text-sm text-slate-100 text-left">
              ${renderIcon('FileKey', { size: 20 })}
              <span>Encrypted Recovery Archive</span>
            </button>
          </div>
        </div>

        <!-- ENCRYPTION & SECURITY SECTION -->
        <div class="p-4 sm:p-5 rounded-xl bg-surface-raised border border-white/5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-aether/15 border border-aether/30 flex items-center justify-center text-aether">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h4 class="text-sm font-semibold text-white">Master Password Encryption (AES-256-GCM + PBKDF2)</h4>
                <p class="text-xs text-slate-400">Protects the export archive against unauthorized access.</p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="toggle-export-encrypt" checked class="sr-only peer" />
              <div class="w-11 h-6 bg-surface-base peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyphr"></div>
            </label>
          </div>

          <!-- Password inputs (collapsible) -->
          <form id="export-password-container" data-submit="call-global" data-raw-submit="return false" autocomplete="off" class="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="relative">
              <input
                type="password"
                id="export-backup-password"
                name="export_backup_password"
                autocomplete="new-password"
                placeholder="Enter a strong backup password..."
                class="w-full px-3.5 py-2.5 rounded-lg bg-surface-base border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyphr transition-colors pr-10"
              />
              <button
                type="button"
                id="btn-toggle-export-pwd"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="Toggle password visibility"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>

            <!-- Format selector -->
            <div class="flex items-center gap-2">
              <select id="select-export-format" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-base border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-cyphr transition-colors cursor-pointer">
                <option value="json" selected>Standard JSON Format (.json)</option>
                <option value="zip-json">Virtual Multi-File Format (.zip-json)</option>
                <option value="encrypted-json">Encrypted URE Enclave Container (.ure-vault)</option>
              </select>
            </div>
          </form>
        </div>

        <!-- ACTION BUTTON & PROGRESS -->
        <div class="space-y-3">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              id="btn-run-export"
              class="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyphr to-cyan-500 hover:from-cyan-400 hover:to-cyphr text-slate-950 font-semibold text-sm flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-all transform active:scale-98 cursor-pointer"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>📤 Export Backup (.json)</span>
            </button>

            <div class="text-xs text-slate-400 text-center sm:text-right font-mono" id="aether-export-telemetry-text">
              ${lastExportTime === 0
                ? `<span class="text-slate-500">No backups exported yet</span>`
                : `Last export: <span class="text-slate-200 font-semibold">${escapeHtml(formattedExportTime)}</span> | <span class="text-cyphr font-semibold">${lastExportCount.toLocaleString()} items</span>`
              }
            </div>
          </div>

          <!-- Animated Progress Indicator (Hidden by default) -->
          <div id="export-progress-bar-wrap" class="hidden space-y-1.5">
            <div class="flex justify-between text-xs font-mono text-slate-300">
              <span id="export-progress-status">Encrypting data with AES-256-GCM...</span>
              <span id="export-progress-percentage" class="text-cyphr">0%</span>
            </div>
            <div class="w-full h-2 rounded-full bg-surface-base overflow-hidden border border-white/5">
              <div id="export-progress-bar" class="h-full bg-gradient-to-r from-cyphr via-cyan-400 to-signal transition-all duration-300 w-0"></div>
            </div>
          </div>
        </div>

        <!-- RESTORE / IMPORT SECTION -->
        <div class="mt-8 pt-6 border-t border-white/5">
          <h3 class="text-base font-semibold text-white mb-2 flex items-center gap-2">
            <svg class="w-5 h-5 text-signal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Restore Account from Backup
          </h3>
          <p class="text-xs text-slate-400 mb-4">
            Upload a previous backup file to restore posts, identity keys, bookmarks, and private messages.
          </p>

          <!-- DRAG & DROP DROPZONE -->
          <div
            id="aether-backup-dropzone"
            class="border-2 border-dashed border-white/15 hover:border-signal/60 rounded-xl p-6 sm:p-8 text-center bg-surface-raised/40 hover:bg-surface-overlay/50 transition-all cursor-pointer group relative"
          >
            <input
              type="file"
              id="aether-backup-file-input"
              accept=".json,.zip-json,.ure-vault,.aether-vault"
              class="hidden"
            />
            <div class="flex flex-col items-center justify-center space-y-2">
              <div class="w-12 h-12 rounded-full bg-signal/10 border border-signal/30 text-signal flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div class="text-sm font-medium text-slate-200">
                <span class="text-signal underline cursor-pointer">Click to browse file</span> or drag and drop here
              </div>
              <div class="text-xs text-slate-400">
                Supports Standard JSON (.json), Virtual Multi-File (.zip-json), and Encrypted Vaults (.ure-vault)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
