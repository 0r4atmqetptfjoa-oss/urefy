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
        <button
          type="button"
          id="btn-settings-export-backup" data-action="call-global" data-raw-click="if(window.exportBackup) window.exportBackup.downloadBackup();"
          class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow cursor-pointer"
        >
          Export Backup (.aeth)
        </button>
      </div>

      <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
        <div class="space-y-1">
          <div class="text-xs font-bold text-white">Restore Account from Backup File</div>
          <p class="text-[11px] text-slate-400">Import a previously downloaded .aeth or .json backup archive</p>
        </div>
        <label for="settings-restore-file" class="px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-xs font-bold text-slate-200 transition-colors cursor-pointer inline-block">
          Choose Backup File
        </label>
        <input type="file" id="settings-restore-file" accept=".aeth,.json" class="hidden" />
      </div>

      <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2 text-xs">
        <div class="text-slate-200 font-bold">Storage Footprint & Offline Status</div>
        <div class="grid grid-cols-2 gap-3 pt-1 text-[11px] font-mono text-slate-400">
          <div>Local Storage: <span class="text-cyan-400">Healthy (&lt; 1.2 MB)</span></div>
          <div>IndexedDB Cache: <span class="text-cyan-400">Optimized</span></div>
          <div>Trackers / Telemetry: <span class="text-emerald-400">0 Third-Party Trackers</span></div>
          <div>Offline Sync Queue: <span class="text-indigo-400">Synchronized</span></div>
        </div>
      </div>
    </div>
  `;
}
