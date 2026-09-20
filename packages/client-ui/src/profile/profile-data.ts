/**
 * @file profile-data.ts
 * @package @aetheris/client-ui/profile
 * @description Data, Storage Footprint & Encrypted Backups settings renderer.
 */

import { UserProfileData } from './types.js';

export function renderProfileDataHTML(profile: UserProfileData): string {
  return `
    <div class="space-y-5" data-settings-section="data">
      <div class="pb-3 border-b border-white/5">
        <h3 class="text-base font-bold text-white flex items-center space-x-2">
          <span>💾</span>
          <span>Data & Encrypted Storage</span>
        </h3>
        <p class="text-xs text-slate-400">Audited local cache, encrypted archive export, and recovery imports</p>
      </div>

      <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
        <div class="space-y-1">
          <div class="text-xs font-bold text-white">Full Cryptographic Backup Export</div>
          <p class="text-[11px] text-slate-400">Download AES-256-GCM encrypted package containing keys, channels, and contacts</p>
        </div>
        <div class="flex items-center space-x-2">
          <button
            type="button"
            id="btn-settings-export-backup"
            data-action="settings-export-backup"
            class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow cursor-pointer"
          >
            Export Backup (.json)
          </button>
          <button
            type="button"
            id="btn-settings-open-backup-panel"
            data-action="open-feature"
            data-feature="export-backup"
            class="px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            Vault Studio
          </button>
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
        <div class="space-y-1">
          <div class="text-xs font-bold text-white">Restore Account from Backup File</div>
          <p class="text-[11px] text-slate-400">Import a previously downloaded .aeth, .json, or .ure-vault backup archive</p>
        </div>
        <label for="settings-restore-file" class="px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-xs font-bold text-slate-200 transition-colors cursor-pointer inline-block">
          Choose Backup File
        </label>
        <input type="file" id="settings-restore-file" data-change="settings-import-backup" accept=".aeth,.json,.ure-vault.json,.ure-backup.json,.zip-json" class="hidden" />
      </div>

      <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2 text-xs">
        <div class="text-slate-200 font-bold">Storage Footprint & Offline Status</div>
        <div class="grid grid-cols-2 gap-3 pt-1 text-[11px] font-mono text-slate-400">
          <div>Private knowledge: <span class="text-slate-300">Encrypted on this device</span></div>
          <div>Cloud usage: <button type="button" data-action="nav-mode" data-mode="vault" class="text-cyan-400 underline">View in Vault</button></div>
          <div>Backup: <span class="text-slate-300">Export before clearing browser data</span></div>
          <div>Unsent posts: <span class="text-slate-300">Retry from your feed</span></div>
        </div>
      </div>
    </div>
  `;
}
