/**
 * @file profile-header.ts
 * @package @aetheris/client-ui/profile
 * @description Sovereign Profile Hero Header & Edit Profile modal renderer.
 */

import { UserProfileData, formatFederatedHandle } from './types.js';
import { renderIcon } from '../ui/icons.js';
import { markdownRenderer } from '../markdown-renderer.js';

export function renderProfileHeaderHTML(
  profile: UserProfileData,
  isOwnProfile: boolean,
  isFollowing: boolean,
  isEditModalOpen: boolean
): string {
  const federatedHandle = formatFederatedHandle(profile.handle || profile.fingerprint.substring(0, 12));

  return `
    <div class="relative w-full rounded-3xl overflow-hidden bg-surface-base border border-white/10 shadow-2xl backdrop-blur-xl">
      <!-- COVER BANNER -->
      <div class="relative w-full h-48 sm:h-64 bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 overflow-hidden">
        ${
          profile.banner
            ? `<img src="${profile.banner}" alt="${profile.name} Cover" class="w-full h-full object-cover object-center" />`
            : `<div class="w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-purple-950/20 to-surface-base"></div>`
        }
        <div class="absolute inset-0 bg-gradient-to-t from-surface-base via-transparent to-black/30"></div>

        <!-- FEDERATED IDENTITY BADGE OVERLAY -->
        <div class="absolute top-4 right-4 flex items-center space-x-2">
          <div
            id="activitypub-badge"
            data-activitypub-badge="true"
            class="activitypub-badge px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-cyan-300 flex items-center space-x-1.5 shadow-lg"
          >
            <a href="/.well-known/aetheris-node" target="_blank" rel="noopener noreferrer" class="hover:underline flex items-center space-x-1">
              <span>🌐</span>
              <span>Federated via ActivityPub 2.0</span>
            </a>
            <span class="text-white/40">|</span>
            <button
              type="button"
              id="btn-copy-federated-handle"
              data-copy-handle="${federatedHandle}" data-action="call-global" data-raw-click="if(window.__aetheris_copy_federated_handle){window.__aetheris_copy_federated_handle('${federatedHandle}');}else{navigator.clipboard&&navigator.clipboard.writeText('${federatedHandle}');}"
              title="Copy Federated Handle (${federatedHandle})"
              class="hover:text-white transition-colors cursor-pointer flex items-center space-x-1"
            >
              <span>Copy Federated Handle</span>
              <span>📋</span>
            </button>
          </div>
        </div>
      </div>

      <!-- PROFILE INFO STRIP -->
      <div class="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 relative">
        <!-- AVATAR & PRIMARY ACTIONS BAR -->
        <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between -mt-16 sm:-mt-20 mb-5 gap-4">
          <!-- AVATAR WITH RING & STATUS -->
          <div class="relative group">
            <div class="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl p-1 bg-surface-base border-2 border-white/15 shadow-2xl overflow-hidden relative">
              <img
                src="${profile.avatar}"
                alt="${profile.name}"
                class="w-full h-full object-cover rounded-2xl bg-surface-raised"
                onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'"
              />
            </div>
            <!-- ONLINE STATUS INDICATOR -->
            <div class="absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-surface-base flex items-center justify-center ${
              profile.status === 'online' ? 'bg-emerald-500' : profile.status === 'idle' ? 'bg-amber-500' : 'bg-rose-500'
            }" title="Status: ${profile.status}">
              <div class="w-2 h-2 rounded-full bg-white/80 animate-pulse"></div>
            </div>
          </div>

          <!-- ACTIONS (FOLLOW / EDIT / MESSAGE) -->
          <div class="flex items-center space-x-3 self-end sm:self-auto w-full sm:w-auto justify-end">
            ${
              isOwnProfile
                ? `
                  <button
                    type="button"
                    id="btn-open-edit-profile" data-action="call-global" data-raw-click="if(window.profileView){ window.profileView.isEditProfileModalOpen = true; if(window.clientStore) window.clientStore.notify(); }"
                    class="px-5 py-2 rounded-2xl bg-surface-raised hover:bg-surface-overlay text-white font-semibold text-xs border border-white/10 shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <span>${renderIcon('settings', { size: 14 })}</span>
                    <span>Edit Profile</span>
                  </button>
                  <button
                    type="button"
                    id="btn-profile-settings" data-action="call-global" data-raw-click="if(window.__aetheris_open_settings){ window.__aetheris_open_settings(); } else if(window.profileView){ window.profileView.setActiveTab('settings'); if(window.clientStore) window.clientStore.notify(); }"
                    class="px-4 py-2 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 font-semibold text-xs border border-cyan-500/30 transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>⚙️</span>
                    <span>Settings</span>
                  </button>
                `
                : `
                  <button
                    type="button"
                    id="btn-toggle-follow" data-action="call-global" data-raw-click="if(window.profileView){ window.profileView.toggleFollow('${profile.fingerprint}'); if(window.clientStore) window.clientStore.notify(); }"
                    class="px-6 py-2 rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center space-x-2 cursor-pointer ${
                      isFollowing
                        ? 'bg-surface-raised hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                    }"
                  >
                    <span>${isFollowing ? '✓ Following' : '+ Follow'}</span>
                  </button>
                  <button
                    type="button" data-action="call-global" data-raw-click="if(window.sovereignDM) { window.sovereignDM.openConversation('${profile.fingerprint}'); } if(window.__aetheris_navigate) { window.__aetheris_navigate('messages'); }"
                    class="p-2.5 rounded-2xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                    title="Send Direct Encrypted Message"
                  >
                    ${renderIcon('messages', { size: 16 })}
                  </button>
                `
            }
          </div>
        </div>

        <!-- NAME, HANDLE & ROLES -->
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>${profile.name}</span>
            </h1>
            <!-- VERIFICATION BADGES -->
            <div class="flex items-center space-x-1.5">
              ${profile.badges.map(badge => `
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  ${badge}
                </span>
              `).join('')}
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                🛡️ ${profile.role}
              </span>
            </div>
          </div>

          <!-- IDENTITY HANDLES & BIO -->
          <div class="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
            <span class="text-indigo-400 font-bold">@${profile.handle || profile.fingerprint.substring(0, 10)}</span>
            <span>•</span>
            <span
              id="profile-federated-handle"
              class="federated-handle text-indigo-300"
              data-federated-handle="${federatedHandle}"
            >${federatedHandle}</span>
            <span>•</span>
            <span class="text-slate-500 break-all select-all">fp:${profile.fingerprint.substring(0, 14)}…</span>
            ${profile.location ? `<span>•</span><span>📍 ${profile.location}</span>` : ''}
            ${profile.website ? `<span>•</span><a href="${profile.website}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:underline">🔗 ${profile.website}</a>` : ''}
          </div>

          <!-- BIO -->
          ${profile.bio ? `
            <div class="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl pt-1">
              ${markdownRenderer.renderMarkdown(profile.bio)}
            </div>
          ` : ''}

          <!-- WEB OF TRUST STATS STRIP -->
          <div class="flex flex-wrap items-center gap-6 pt-2 border-t border-white/5 text-xs text-slate-400">
            <div class="flex items-center space-x-1.5">
              <span class="font-bold text-white">${profile.followingCount}</span>
              <span class="text-slate-400">Following</span>
            </div>
            <div class="flex items-center space-x-1.5">
              <span class="font-bold text-white">${profile.followersCount}</span>
              <span class="text-slate-400">Followers</span>
            </div>
            <div class="flex items-center space-x-1.5 font-mono">
              <span class="text-amber-400">⚡ ${profile.meritScore}</span>
              <span class="text-slate-400">Merit</span>
            </div>
            <div class="flex items-center space-x-1.5 font-mono">
              <span class="text-cyan-400">🛡️ WoT Max-Flow: ${profile.trustScore}/100</span>
              <span class="text-slate-400">Trust Score</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- EDIT PROFILE MODAL DIALOG -->
    ${isEditModalOpen ? renderEditProfileModalHTML(profile) : ''}
  `;
}

export function renderEditProfileModalHTML(profile: UserProfileData): string {
  return `
    <div
      id="edit-profile-modal-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" data-action="call-global" data-raw-click="if(event.target.id==='edit-profile-modal-overlay'){ if(window.profileView){ window.profileView.isEditProfileModalOpen = false; if(window.clientStore) window.clientStore.notify(); } }"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="relative w-full max-w-lg bg-surface-base border border-white/15 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100 animate-in zoom-in-95 duration-200" data-action="stop-propagation"
      >
        <div class="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 class="text-lg font-bold text-white flex items-center space-x-2">
            <span>✏️</span>
            <span>Edit Profile</span>
          </h2>
          <button
            type="button" data-action="call-global" data-raw-click="if(window.profileView){ window.profileView.isEditProfileModalOpen = false; if(window.clientStore) window.clientStore.notify(); }"
            class="p-2 text-slate-400 hover:text-white rounded-xl bg-surface-raised cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form id="form-edit-profile" class="space-y-4 text-xs" data-submit="call-global" data-global-method="event.preventDefault">
          <div>
            <label class="block text-[11px] font-mono text-slate-400 mb-1">Display Name</label>
            <input
              type="text"
              id="edit-profile-name"
              value="${profile.name.replace(/"/g, '&quot;')}"
              class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label class="block text-[11px] font-mono text-slate-400 mb-1">Sovereign Bio</label>
            <textarea
              id="edit-profile-bio"
              rows="3"
              class="w-full bg-surface-raised border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
            >${profile.bio}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-mono text-slate-400 mb-1">Location</label>
              <input
                type="text"
                id="edit-profile-location"
                value="${profile.location.replace(/"/g, '&quot;')}"
                class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label class="block text-[11px] font-mono text-slate-400 mb-1">Website</label>
              <input
                type="text"
                id="edit-profile-website"
                value="${profile.website.replace(/"/g, '&quot;')}"
                class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-mono text-slate-400 mb-1">Avatar URL</label>
            <input
              type="text"
              id="edit-profile-avatar"
              value="${profile.avatar.replace(/"/g, '&quot;')}"
              class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label class="block text-[11px] font-mono text-slate-400 mb-1">Banner URL</label>
            <input
              type="text"
              id="edit-profile-banner"
              value="${profile.banner.replace(/"/g, '&quot;')}"
              class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              id="btn-cancel-edit-profile" data-action="call-global" data-raw-click="if(window.profileView){ window.profileView.isEditProfileModalOpen = false; if(window.clientStore) window.clientStore.notify(); }"
              class="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-save-profile" data-action="call-global" data-raw-click="if(window.__aetheris_save_profile){ window.__aetheris_save_profile(); }"
              class="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}
