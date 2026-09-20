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
import { themeEngine, THEMES, CURATED_THEMES } from '../themes.js';
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
  { id: 'appearance', label: 'Appearance & Themes', iconName: 'slidersHorizontal', desc: '12 curated themes, OLED mode, density, and typography' },
  { id: 'messaging', label: 'Messaging & Encryption', iconName: 'messages', desc: 'E2EE Double Ratchet, post-quantum KEM, Sealed Sender, Session AEAD' },
  { id: 'data', label: 'Data & Storage', iconName: 'database', desc: 'Backup export/import, cache quota, and offline sync' },
  { id: 'accessibility', label: 'Accessibility & Motion', iconName: 'eye', desc: 'Reduced motion, high contrast mode, and responsive layout' },
  { id: 'advanced', label: 'Advanced Sovereign Controls', iconName: 'terminal', desc: 'Cryptographic pipeline, node telemetry, and mesh' },
];

export function renderProfileSettingsHTML(
  currentCat: SettingsCategory,
  profile: UserProfileData,
  currentUserFp: string
): string {
  return `
    <div id="profile-settings-panel" class="space-y-6">
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
                id="btn-settings-copy-fed-handle"
                data-action="settings-copy-fed-handle"
                data-handle="${federatedHandle}"
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

    case 'notifications': {
      const notifyDm = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_pref_notify_dm') !== 'false' : true;
      const notifyMentions = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_pref_notify_mentions') !== 'false' : true;
      const notifySecurity = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_pref_notify_security') !== 'false' : true;

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
              id="btn-settings-toggle-push"
              data-action="settings-toggle-push"
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow cursor-pointer"
            >
              Enable Push
            </button>
          </div>

          <div class="space-y-3">
            <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between text-xs">
              <span class="text-slate-200">Notify on Direct Encrypted Messages</span>
              <input type="checkbox" ${notifyDm ? 'checked' : ''} data-change="settings-toggle-pref" data-pref="notify_dm" class="accent-indigo-500 cursor-pointer" />
            </div>
            <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between text-xs">
              <span class="text-slate-200">Notify on Mentions & Replies</span>
              <input type="checkbox" ${notifyMentions ? 'checked' : ''} data-change="settings-toggle-pref" data-pref="notify_mentions" class="accent-indigo-500 cursor-pointer" />
            </div>
            <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between text-xs">
              <span class="text-slate-200">Urgent Network & Security Bulletins</span>
              <input type="checkbox" ${notifySecurity ? 'checked' : ''} data-change="settings-toggle-pref" data-pref="notify_security" class="accent-indigo-500 cursor-pointer" />
            </div>
          </div>
        </div>
      `;
    }

    case 'appearance':
      return `
        <div class="space-y-5" data-settings-section="appearance">
          <div class="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 class="text-base font-bold text-white flex items-center space-x-2">
                <span>🎨</span>
                <span>Appearance & Themes</span>
              </h3>
              <p class="text-xs text-slate-400">12 curated sovereign themes, OLED black modes, and interface density</p>
            </div>
            <button
              type="button"
              id="btn-settings-open-theme-builder"
              data-action="open-feature"
              data-feature="custom-theme"
              class="px-3.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Custom Theme Studio
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            ${CURATED_THEMES.map(t => `
              <button
                type="button"
                data-theme-id="${t.id}"
                data-action="settings-set-theme"
                class="p-3 rounded-2xl text-left border transition-all cursor-pointer space-y-2 hover:-translate-y-0.5 ${
                  themeEngine.currentThemeId === t.id
                    ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-500/10'
                    : 'bg-surface-base border-white/5 hover:border-white/20'
                }"
              >
                <div class="w-full h-9 rounded-xl flex items-center justify-between px-2.5" style="background-color: ${t.bgCanvas}; border: 1px solid ${t.borderAccent};">
                  <span class="text-xs">${t.emoji || '✨'}</span>
                  <span class="w-3 h-3 rounded-full" style="background-color: ${t.accentColor}; box-shadow: 0 0 8px ${t.accentColor};"></span>
                </div>
                <div class="text-xs font-bold text-white truncate flex items-center justify-between">
                  <span>${t.name}</span>
                  ${t.mode === 'lights-out' ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-slate-400 border border-white/10 font-mono">OLED</span>' : ''}
                </div>
                <div class="text-[10px] text-slate-400 line-clamp-1 leading-snug">${t.description || ''}</div>
              </button>
            `).join('')}
          </div>

          <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-3">
            <div class="text-xs font-bold text-white">Interface Density Mode</div>
            <div class="grid grid-cols-3 gap-3">
              ${(['compact', 'balanced', 'media'] as const).map(d => `
                <button
                  type="button"
                  data-action="settings-set-density"
                  data-density="${d}"
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

    case 'messaging': {
      const sealedSender = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_pref_sealed_sender') !== 'false' : true;
      const ephemeralTimer = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_pref_ephemeral_timer') || '7d' : '7d';

      return `
        <div class="space-y-5" data-settings-section="messaging">
          <div class="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 class="text-base font-bold text-white flex items-center space-x-2">
                <span>💬</span>
                <span>Messaging & Sovereign Encryption</span>
              </h3>
              <p class="text-xs text-slate-400">Military-grade end-to-end encryption with post-quantum key encapsulation</p>
            </div>
            <span class="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>E2EE ACTIVE</span>
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white flex items-center space-x-2">
                  <span>🔄</span>
                  <span>Double Ratchet Protocol</span>
                </span>
                <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">PER-MESSAGE KEYS</span>
              </div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                Derives fresh ephemeral symmetric keys for every packet. Past messages cannot be decrypted even if long-term keys are compromised (Perfect Forward Secrecy).
              </p>
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white flex items-center space-x-2">
                  <span>⚛️</span>
                  <span>Post-Quantum ML-KEM-768</span>
                </span>
                <span class="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">FIPS 203 READY</span>
              </div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                Hybrid lattice-based cryptography (Kyber / ML-KEM-768 + X25519) immunizes private conversations against quantum harvest-now-decrypt-later attacks.
              </p>
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white flex items-center space-x-2">
                  <span>📬</span>
                  <span>Sealed Sender Routing</span>
                </span>
                <span class="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">METADATA-BLIND</span>
              </div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                Relay nodes route messages using only the recipient token. Your sender identity is encrypted inside the inner payload envelope, hidden from edge relays.
              </p>
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white flex items-center space-x-2">
                  <span>🔒</span>
                  <span>Session-Bound AEAD v3</span>
                </span>
                <span class="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">ANTI-REPLAY</span>
              </div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                Ciphertexts are cryptographically bound to unique session tokens with monotonic message sequence counters, preventing replay or injection across sessions.
              </p>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-4">
            <div class="text-xs font-bold text-white">Direct Message Security Preferences</div>

            <div class="flex items-center justify-between text-xs">
              <div class="space-y-0.5">
                <div class="text-slate-200 font-semibold">Enable Sealed Sender Routing</div>
                <p class="text-[11px] text-slate-400">Prevents edge relays from correlating sender IP and metadata with recipient</p>
              </div>
              <input type="checkbox" ${sealedSender ? 'checked' : ''} data-change="settings-toggle-pref" data-pref="sealed_sender" class="accent-indigo-500 cursor-pointer w-4 h-4" />
            </div>

            <div class="flex items-center justify-between text-xs pt-3 border-t border-white/5">
              <div class="space-y-0.5">
                <div class="text-slate-200 font-semibold">Disappearing Ephemeral Messages</div>
                <p class="text-[11px] text-slate-400">Cryptographically shred local IndexedDB message keys after expiration</p>
              </div>
              <select data-change="settings-set-pref" data-pref="ephemeral_timer" class="bg-surface-raised border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer focus:outline-none focus:border-indigo-500">
                <option value="off" ${ephemeralTimer === 'off' ? 'selected' : ''}>Off (Keep History)</option>
                <option value="24h" ${ephemeralTimer === '24h' ? 'selected' : ''}>24 Hours</option>
                <option value="7d" ${ephemeralTimer === '7d' ? 'selected' : ''}>7 Days</option>
                <option value="30d" ${ephemeralTimer === '30d' ? 'selected' : ''}>30 Days</option>
              </select>
            </div>
          </div>
        </div>
      `;
    }

    case 'accessibility': {
      const motionDynamics = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_pref_motion_dynamics') || 'full' : 'full';
      const highContrast = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_pref_high_contrast') === 'true' : false;
      const focusRing = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_pref_focus_ring') !== 'false' : true;
      const autoPlayVideo = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_pref_autoplay_video') === 'true' : false;

      return `
        <div class="space-y-5" data-settings-section="accessibility">
          <div class="pb-3 border-b border-white/5">
            <h3 class="text-base font-bold text-white flex items-center space-x-2">
              <span>♿</span>
              <span>Accessibility & Motion</span>
            </h3>
            <p class="text-xs text-slate-400">Tune motion dynamics, visual contrast, and assistive reading preferences</p>
          </div>

          <div class="space-y-3">
            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-xs font-bold text-white flex items-center space-x-2">
                  <span>UREfy Motion & Spring Dynamics</span>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">SPRING ENGINE</span>
                </div>
                <p class="text-[11px] text-slate-400">Fluid hover lifts, modal transitions, and card springs. Respects OS prefers-reduced-motion automatically.</p>
              </div>
              <select id="select-settings-motion" data-change="settings-set-pref" data-pref="motion_dynamics" class="bg-surface-raised border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer focus:outline-none focus:border-cyan-500">
                <option value="full" ${motionDynamics === 'full' ? 'selected' : ''}>Fluid Springs (Default)</option>
                <option value="reduced" ${motionDynamics === 'reduced' ? 'selected' : ''}>Reduced Motion (WCAG)</option>
                <option value="none" ${motionDynamics === 'none' ? 'selected' : ''}>Disable All Transitions</option>
              </select>
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-xs font-bold text-white">Enhanced Contrast & Borders</div>
                <p class="text-[11px] text-slate-400">Increases container border definition and card separation for high-glare or low-vision environments</p>
              </div>
              <input type="checkbox" ${highContrast ? 'checked' : ''} data-change="settings-toggle-pref" data-pref="high_contrast" class="accent-cyan-500 cursor-pointer w-4 h-4" />
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-xs font-bold text-white">Focus Ring Accentuation</div>
                <p class="text-[11px] text-slate-400">Prominent keyboard navigation indicators across interactive elements</p>
              </div>
              <input type="checkbox" ${focusRing ? 'checked' : ''} data-change="settings-toggle-pref" data-pref="focus_ring" class="accent-cyan-500 cursor-pointer w-4 h-4" />
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-xs font-bold text-white">Auto-Play Feed Videos</div>
                <p class="text-[11px] text-slate-400">Automatically play video previews on hover or viewport intersection</p>
              </div>
              <input type="checkbox" ${autoPlayVideo ? 'checked' : ''} data-change="settings-toggle-pref" data-pref="autoplay_video" class="accent-cyan-500 cursor-pointer w-4 h-4" />
            </div>
          </div>
        </div>
      `;
    }

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
            <div class="flex items-center space-x-2">
              <button
                type="button"
                id="btn-settings-open-transparency"
                data-action="settings-open-transparency"
                class="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow cursor-pointer"
              >
                Open Inspector
              </button>
              <button
                type="button"
                id="btn-settings-export-diagnostics"
                data-action="settings-export-diagnostics"
                class="px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 border border-white/10 text-xs font-bold transition-colors cursor-pointer"
              >
                Export Telemetry
              </button>
            </div>
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
