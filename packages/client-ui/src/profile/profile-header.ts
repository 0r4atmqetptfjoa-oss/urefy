/**
 * @file profile/profile-header.ts
 * @package @aetheris/client-ui/profile
 * @description 2027 Sovereign Identity Profile Header with ActivityPub 2.0 Federation Badge,
 * WoT Trust Score, and Sovereign Context Facets.
 */

import { UserProfileData, formatFederatedHandle } from './types.js';
import { renderIcon } from '../ui/icons.js';
import { renderAvatar } from '../ui/avatar-generator.js';
import { markdownRenderer } from '../markdown-renderer.js';
import { presentPublicIdentity } from '../public-identity.js';

function escapeAttr(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function humanRole(role: UserProfileData['role']): string {
  switch (role) {
    case 'GUARDIAN':
      return 'Guardian';
    case 'ARCHIVIST':
      return 'Archivist';
    case 'MODERATOR':
      return 'Moderator';
    default:
      return 'Member';
  }
}

export function renderProfileHeaderHTML(
  profile: UserProfileData,
  isOwnProfile: boolean,
  isFollowing: boolean,
  isEditModalOpen: boolean,
  followPending = false
): string {
  const identity = presentPublicIdentity(profile, profile.fingerprint, isOwnProfile);
  const federatedHandle = formatFederatedHandle(profile.handle || profile.fingerprint);

  return `<header class="rounded-3xl overflow-hidden bg-surface-base/85 backdrop-blur-2xl border border-white/10 shadow-2xl mb-6">
    <!-- Banner -->
    <div
      class="h-32 sm:h-40 w-full bg-gradient-to-r from-cyan-950/70 via-indigo-950/70 to-emerald-950/70 relative"
      style="${profile.banner ? `background-image:url('${escapeAttr(profile.banner)}');background-size:cover;background-position:center;` : ''}"
    >
      <div class="absolute -bottom-10 left-6 rounded-3xl p-1 bg-[#08090d] shadow-2xl">
        ${renderAvatar(identity.avatar, profile.fingerprint, { size: 80 })}
      </div>
    </div>

    <div class="pt-12 pb-6 px-6 space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-xl sm:text-2xl font-extrabold text-white">${escapeAttr(profile.name || identity.displayName)}</h1>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              ${escapeAttr(humanRole(profile.role))}
            </span>
            ${
              profile.isZKVerified
                ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">🛡️ ZK Verified</span>`
                : ''
            }
          </div>

          <div class="flex items-center gap-2 flex-wrap text-xs font-mono text-slate-400">
            <span>@${escapeAttr(identity.handleLabel)}</span>
            <span>·</span>
            <span
              class="federated-handle text-cyan-300"
              data-federated-handle="${escapeAttr(federatedHandle)}"
            >${escapeAttr(federatedHandle)}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-copy-federated-handle"
            data-copy-handle="${escapeAttr(federatedHandle)}"
            class="btn-copy-federated-handle inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition-colors cursor-pointer"
          >
            ${renderIcon('copy', { size: 14, ariaHidden: true })}
            <span>Copy Federated Handle</span>
          </button>

          ${
            isOwnProfile
              ? `<button
                  type="button"
                  id="btn-open-edit-profile"
                  data-action="window.__aetheris_open_edit_profile && window.__aetheris_open_edit_profile()"
                  class="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-xs font-bold text-cyan-300 border border-cyan-500/35 transition-all cursor-pointer"
                >
                  ${renderIcon('settings', { size: 14, ariaHidden: true })}
                  <span>Edit Profile</span>
                </button>`
              : `<button
                  type="button"
                  id="btn-toggle-follow-profile"
                  data-follow-fp="${escapeAttr(profile.fingerprint)}"
                  ${followPending ? 'disabled' : ''}
                  class="px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isFollowing
                      ? 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
                      : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                  }"
                >${isFollowing ? 'Following ✓' : 'Follow'}</button>`
          }
        </div>
      </div>

      <!-- Bio -->
      ${
        profile.bio
          ? `<div class="text-sm text-slate-200 leading-relaxed max-w-2xl">
              ${markdownRenderer.renderRichContent(profile.bio)}
            </div>`
          : ''
      }

      <!-- Badges -->
      ${
        profile.badges && profile.badges.length
          ? `<div class="profile-badges flex flex-wrap gap-1.5 mt-2">
              ${profile.badges.map((b) => `<span class="badge px-2.5 py-0.5 text-xs rounded-full bg-[var(--color-accent,#e89e38)]/10 border border-[var(--color-accent,#e89e38)]/20 text-[var(--color-accent,#e89e38)] font-medium">${escapeAttr(b)}</span>`).join('')}
            </div>`
          : ''
      }

      <!-- ActivityPub 2.0 Badge & Telemetry Row -->
      <div class="pt-3 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-4 text-slate-300">
          <span><strong class="text-white font-mono">${profile.followingCount}</strong> Following</span>
          <span><strong class="text-white font-mono">${profile.followersCount}</strong> Followers</span>
          <span><strong class="text-cyan-300 font-mono">${profile.meritScore}</strong> Merit</span>
          <span><strong class="text-emerald-400 font-mono">${profile.trustScore}%</strong> WoT Trust <span class="sr-only">WoT Max-Flow: ${profile.trustScore}</span></span>
        </div>

        <a
          href="/.well-known/aetheris-node"
          data-activitypub-badge="true"
          class="activitypub-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[11px] font-mono transition-colors"
        >
          <span>🌐</span>
          <span>Federated via ActivityPub 2.0</span>
        </a>
      </div>
    </div>

    ${isEditModalOpen ? renderEditProfileModalHTML(profile) : ''}
  </header>`;
}

export function renderEditProfileModalHTML(profile: UserProfileData, saving = false): string {
  return `<div
    id="edit-profile-modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Edit Sovereign Profile"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl p-4"
  >
    <div class="w-full max-w-lg rounded-3xl bg-[#0c101c] border border-white/15 p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-white/10">
        <h3 class="text-base font-extrabold text-white">Edit Public Profile</h3>
        <button
          type="button"
          data-action="window.__aetheris_close_edit_profile && window.__aetheris_close_edit_profile()"
          aria-label="Close modal"
          class="text-slate-400 hover:text-white cursor-pointer"
        >✕</button>
      </div>

      <div class="space-y-3 text-xs">
        <div>
          <label for="edit-profile-name" class="block font-semibold text-slate-300 mb-1">Display Name</label>
          <input
            id="edit-profile-name"
            type="text"
            value="${escapeAttr(profile.name)}"
            class="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-black/40 text-sm text-white border border-white/10"
          />
        </div>
        <div>
          <label for="edit-profile-handle" class="block font-semibold text-slate-300 mb-1">Handle</label>
          <input
            id="edit-profile-handle"
            type="text"
            value="${escapeAttr(profile.handle)}"
            class="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-black/40 text-sm text-white border border-white/10 font-mono"
          />
        </div>
        <div>
          <label for="edit-profile-bio" class="block font-semibold text-slate-300 mb-1">Bio</label>
          <textarea
            id="edit-profile-bio"
            rows="3"
            class="w-full p-3.5 rounded-xl bg-black/40 text-sm text-white border border-white/10"
          >${escapeAttr(profile.bio)}</textarea>
        </div>
        <div>
          <label for="edit-profile-location" class="block font-semibold text-slate-300 mb-1">Location</label>
          <input
            id="edit-profile-location"
            type="text"
            value="${escapeAttr(profile.location)}"
            class="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-black/40 text-sm text-white border border-white/10"
          />
        </div>
        <div>
          <label for="edit-profile-website" class="block font-semibold text-slate-300 mb-1">Website</label>
          <input
            id="edit-profile-website"
            type="url"
            value="${escapeAttr(profile.website)}"
            class="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-black/40 text-sm text-white border border-white/10"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-white/10">
        <button
          type="button"
          data-action="window.__aetheris_close_edit_profile && window.__aetheris_close_edit_profile()"
          class="px-4 py-2 rounded-xl bg-white/10 text-xs text-slate-200 cursor-pointer"
        >Cancel</button>
        <button
          type="button"
          id="btn-save-profile"
          data-action="window.__aetheris_save_profile && window.__aetheris_save_profile()"
          ${saving ? 'disabled' : ''}
          class="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer"
        >${saving ? 'Saving...' : 'Save Changes'}</button>
      </div>
    </div>
  </div>`;
}