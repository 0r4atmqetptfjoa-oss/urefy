/**
 * @file profile-settings.ts
 * @package @aetheris/client-ui/profile
 * @description Master Settings subtab orchestrator for Sovereign Profiles.
 */

import { UserProfileData, SettingsCategory, formatFederatedHandle } from './types.js';
import { renderProfileSecurityHTML } from './profile-security.js';
import { renderProfilePrivacyHTML } from './profile-privacy.js';
import { renderProfileDataHTML } from './profile-data.js';
import { renderIcon } from '../ui/icons.js';
import { clientStore } from '../client-state.js';
import { themeEngine, THEMES } from '../themes.js';
import { markdownRenderer } from '../markdown-renderer.js';

export interface SettingsCategoryItem {
  id: SettingsCategory;
  label: string;
  iconName: any;
  desc: string;
}

export const SETTINGS_CATEGORIES: SettingsCategoryItem[] = [
  { id: 'account', label: 'Account & Identity', iconName: 'profile', desc: 'Display name, bio, handle, and avatar' },
  { id: 'security', label: 'Security & Recovery', iconName: 'shield', desc: 'Passkeys, recovery seed phrase, and guardians' },
  { id: 'privacy', label: 'Privacy & Trust', iconName: 'lock', desc: 'UI complexity mode, trust thresholds, and data shredding' },
  { id: 'notifications', label: 'Notifications', iconName: 'bell', desc: 'Web push notifications, mentions, and alerts' },
  { id: 'appearance', label: 'Appearance & Themes', iconName: 'slidersHorizontal', desc: 'Themes, OLED black, density, and typography' },
  { id: 'data', label: 'Data & Storage', iconName: 'database', desc: 'Backup export/import, cache quota, and offline sync' },
  { id: 'advanced', label: 'Advanced Diagnostics', iconName: 'terminal', desc: 'Cryptographic pipeline, node telemetry, and mesh' },
];

export function renderProfileSettingsHTML(
  currentCat: SettingsCategory,
  profile: UserProfileData,
  currentUserFp: string
): string {
  return `
    <div id="profile-settings-panel" class="space-y-6 animate-in fade-in duration-200">
      <!-- CATEGORY NAVIGATION PILLS -->
      <div id="profile-settings-nav" role="tablist" aria-label="Profile settings" class="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-white/5">
        ${SETTINGS_CATEGORIES.map(cat => `
          <button
            type="button"
            id="btn-settings-cat-${cat.id}"
            data-action="set-profile-settings-cat"
            data-settings-cat="${cat.id}"
            role="tab" aria-selected="${currentCat === cat.id}"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-2 cursor-pointer border ${
              currentCat === cat.id
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-sm shadow-cyan-500/10'
                : 'bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-slate-200 border-white/5'
            }"
          >
            <span>${renderIcon(cat.iconName, { size: 14 })}</span>
            <span>${cat.label}</span>
          </button>
        `).join('')}
      </div>

      <!-- ACTIVE CATEGORY CONTENT CONTAINER -->
      <div class="p-6 rounded-3xl bg-surface-raised border border-white/10 shadow-xl space-y-6">
        ${renderSettingsCategoryContentHTML(currentCat, profile, currentUserFp)}
      </div>
    </div>
  `;
}

export function renderSettingsCategoryContentHTML(
  cat: SettingsCategory,
  profile: UserProfileData,
  currentUserFp: string
): string {
  const federatedHandle = formatFederatedHandle(profile.handle || profile.fingerprint.substring(0, 12));

  switch (cat) {
    case 'security':
      return renderProfileSecurityHTML(profile);

    case 'privacy':
      return renderProfilePrivacyHTML(profile);

    case 'data':
      return renderProfileDataHTML(profile);

    case 'account':
      return `
        <div class="space-y-5" data-settings-section="account">
          <div class="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 class="text-base font-bold text-white flex items-center space-x-2">
                <span>👤</span>
                <span>Account & Identity</span>
              </h3>
              <p class="text-xs text-slate-400">Manage your sovereign identity, display alias, and fediverse reach</p>
            </div>
            <button
              type="button"
              id="btn-settings-edit-profile-modal"
              data-action="open-edit-profile"
              class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow cursor-pointer"
            >
              Edit Full Profile
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2">
              <div class="text-[11px] font-mono text-slate-400">Display Name</div>
              <div class="text-sm font-bold text-white">${profile.name}</div>
              <div class="text-[11px] font-mono text-indigo-400">@id:${profile.handle}</div>
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2">
              <div class="text-[11px] font-mono text-slate-400">Federated Fediverse Handle</div>
              <div class="text-xs font-mono font-bold text-indigo-300">${federatedHandle}</div>
              <button
                type="button"
                id="btn-settings-copy-fed-handle" data-action="call-global" data-raw-click="if(window.__aetheris_copy_federated_handle){window.__aetheris_copy_federated_handle('${federatedHandle}');}else{navigator.clipboard&&navigator.clipboard.writeText('${federatedHandle}');}"
                class="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <span>📋</span>
                <span>Copy Handle</span>
              </button>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2 text-xs">
            <div class="text-[11px] font-mono text-slate-400">Public Ed25519 Fingerprint</div>
            <div class="font-mono text-[11px] text-emerald-400 break-all select-all bg-black/40 p-2.5 rounded-xl border border-white/5">${profile.fingerprint}</div>
          </div>

          <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2 text-xs">
            <div class="text-[11px] font-mono text-slate-400">Sovereign Bio</div>
            <p class="text-slate-300 leading-relaxed">${markdownRenderer.renderMarkdown(profile.bio)}</p>
          </div>
        </div>
      `;

    case 'notifications':
      return `
        <div class="space-y-5" data-settings-section="notifications">
          <div class="pb-3 border-b border-white/5">
            <h3 class="text-base font-bold text-white flex items-center space-x-2">
              <span>🔔</span>
              <span>Notifications & Background Push</span>
            </h3>
            <p class="text-xs text-slate-400">Zero-tracking Web Push (VAPID) delivered directly from Cloudflare Edge</p>
          </div>

          <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
            <div class="space-y-1">
              <div class="text-xs font-bold text-white flex items-center space-x-2">
                <span>Web Push Notifications (VAPID)</span>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ZERO-TRACKING</span>
              </div>
              <p class="text-[11px] text-slate-400">Receive encrypted direct messages and community alerts even when closed</p>
            </div>
            <button
              type="button"
              id="btn-settings-toggle-push" data-action="call-global" data-raw-click="if(window.sovereignWebPush){ window.sovereignWebPush.requestPermission(); }"
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow cursor-pointer"
            >
              Enable Push
            </button>
          </div>

          <div class="space-y-3">
            <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between text-xs">
              <span class="text-slate-200">Notify on Direct Encrypted Messages</span>
              <input type="checkbox" checked class="accent-indigo-500 cursor-pointer" />
            </div>
            <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between text-xs">
              <span class="text-slate-200">Notify on Mentions & Replies</span>
              <input type="checkbox" checked class="accent-indigo-500 cursor-pointer" />
            </div>
            <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between text-xs">
              <span class="text-slate-200">Urgent Network & Security Bulletins</span>
              <input type="checkbox" checked class="accent-indigo-500 cursor-pointer" />
            </div>
          </div>
        </div>
      `;

    case 'appearance':
      return `
        <div class="space-y-5" data-settings-section="appearance">
          <div class="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 class="text-base font-bold text-white flex items-center space-x-2">
                <span>🎨</span>
                <span>Appearance & Themes</span>
              </h3>
              <p class="text-xs text-slate-400">Obsidian cyber themes, OLED black mode, and interface density</p>
            </div>
            <button
              type="button"
              id="btn-settings-open-theme-builder" data-action="open-feature" data-feature="custom-theme"
              class="px-3.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Custom Theme Studio
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            ${THEMES.map(t => `
              <button
                type="button"
                data-theme-id="${t.id}" data-action="call-global" data-raw-click="if(window.themeEngine){ window.themeEngine.setTheme('${t.id}'); if(window.profileView) window.profileView.openSettings('appearance'); }"
                class="p-3 rounded-2xl text-left border transition-all cursor-pointer space-y-2 ${
                  themeEngine.currentThemeId === t.id
                    ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30'
                    : 'bg-surface-base border-white/5 hover:border-white/15'
                }"
              >
                <div class="w-full h-8 rounded-xl" style="background-color: ${t.bgCanvas}; border: 1px solid ${t.borderAccent};"></div>
                <div class="text-xs font-bold text-white truncate">${t.name}</div>
                <div class="text-[10px] text-slate-400 truncate">${t.description || ''}</div>
              </button>
            `).join('')}
          </div>

          <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-3">
            <div class="text-xs font-bold text-white">Interface Density Mode</div>
            <div class="grid grid-cols-3 gap-3">
              ${(['compact', 'balanced', 'media'] as const).map(d => `
                <button
                  type="button" data-action="call-global" data-raw-click="if(window.clientStore){ window.clientStore.setDensity('${d}'); if(window.profileView) window.profileView.openSettings('appearance'); }"
                  class="py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    clientStore?.density === d
                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/40'
                      : 'bg-surface-raised text-slate-400 border-white/5 hover:text-white'
                  }"
                >
                  ${d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 text-xs text-slate-400 space-y-1">
            <div class="text-slate-200 font-bold">Fast Native System Font Stack</div>
            <p class="text-[11px]">System native UI typography with zero external HTTP requests to Google Fonts. 100% private, 0ms font blocking.</p>
          </div>
        </div>
      `;

    case 'advanced':
      return `
        <div class="space-y-5" data-settings-section="advanced">
          <div class="pb-3 border-b border-white/5">
            <h3 class="text-base font-bold text-white flex items-center space-x-2">
              <span>⚡</span>
              <span>Advanced Diagnostics & Network</span>
            </h3>
            <p class="text-xs text-slate-400">Real-time cryptographic pipeline inspector and edge network telemetry</p>
          </div>

          <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
            <div class="space-y-1">
              <div class="text-xs font-bold text-white flex items-center space-x-2">
                <span>🔬 Cryptographic Pipeline Transparency Inspector</span>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">LIVE</span>
              </div>
              <p class="text-[11px] text-slate-400">Inspect real-time ML-KEM encapsulation, ZK-RLN polynomial shares, and Merkle proofs</p>
            </div>
            <button
              type="button"
              id="btn-settings-open-transparency" data-action="call-global" data-raw-click="if(window.__aetheris_open_transparency_mode) window.__aetheris_open_transparency_mode();"
              class="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow cursor-pointer"
            >
              Open Inspector
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 space-y-1">
              <div class="text-slate-500 text-[10px]">EDGE LATENCY</div>
              <div class="text-emerald-400 font-bold text-sm">${(clientStore?.latencyMs && clientStore.latencyMs > 0) ? `${clientStore.latencyMs} ms` : 'Measuring...'}</div>
              <div class="text-slate-400 text-[10px]">Cloudflare Global Anycast</div>
            </div>

            <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 space-y-1">
              <div class="text-slate-500 text-[10px]">WEBRTC MESH PEERS</div>
              <div class="text-cyan-400 font-bold text-sm">${clientStore?.peersOnline ?? 0} Nodes</div>
              <div class="text-slate-400 text-[10px]">P2P Swarm Active</div>
            </div>

            <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 space-y-1">
              <div class="text-slate-500 text-[10px]">STORAGE QUOTA CEILING</div>
              <div class="text-amber-400 font-bold text-sm">8.0 GB Safe Cap</div>
              <div class="text-slate-400 text-[10px]">Zero Billing Guaranteed</div>
            </div>
          </div>
        </div>
      `;

    default:
      return renderProfileSecurityHTML(profile);
  }
}
