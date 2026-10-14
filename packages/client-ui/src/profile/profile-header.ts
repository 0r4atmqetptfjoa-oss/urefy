/**
 * @file profile/profile-header.ts
 * @package @aetheris/client-ui/profile
 * @description 2027 Swiss Sovereign Studio Profile Header — Architectural geometric studio mesh,
 * sanitized single-at handles, verified identity pills, Web of Trust telemetry, and ActivityPub 2.0 federation badge.
 */

import { UserProfileData, formatFederatedHandle } from './types.js';
import { clientStore } from '../client-state.js';
import { profileStore } from './profile-store.js';

function escapeHtml(str: string | undefined | null): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderProfileHeaderHTML(
  profile: UserProfileData,
  isOwnProfileParam?: boolean,
  isFollowingParam?: boolean,
  isEditModalOpen = false,
  followPending = false
): string {
  const myFp = clientStore?.keypair?.fingerprint || '';
  const isOwnProfile =
    isOwnProfileParam !== undefined
      ? isOwnProfileParam
      : !profile.fingerprint || profile.fingerprint === myFp;
  const isFollowing =
    isFollowingParam !== undefined
      ? isFollowingParam
      : profileStore.isFollowing(profile.fingerprint);

  const cleanHandle = (profile.handle || profile.fingerprint.slice(0, 10)).replace(/^@+/, '');
  const federatedHandle = formatFederatedHandle(profile.handle || profile.fingerprint);

  const displayName =
    profile.name && profile.name !== 'Profile not set up'
      ? profile.name
      : cleanHandle.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return `
    <section
      id="profile-workspace-root"
      class="rounded-2xl bg-surface-base border border-subtle overflow-hidden shadow-lg mb-6"
    >
      <!-- Architectural Studio Banner (Zero Stock AI Gradient Slop) -->
      <div
        class="relative h-36 sm:h-44 w-full overflow-hidden border-b border-subtle"
        style="${profile.banner ? `background-image:url('${escapeHtml(profile.banner)}');background-size:cover;background-position:center;` : 'background: radial-gradient(circle at 18% 35%, rgba(229, 169, 60, 0.16), transparent 55%), radial-gradient(circle at 82% 20%, rgba(56, 189, 248, 0.12), transparent 50%), linear-gradient(180deg, #12151E 0%, #0B0D13 100%);'}"
      >
        <div
          class="absolute inset-0 opacity-20"
          style="background-image: linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 28px 28px;"
        ></div>

        <!-- Top-Right Cryptographic Identity Pill inside Banner -->
        <div class="absolute top-3.5 right-4 flex items-center gap-2">
          <span class="px-2.5 py-1 rounded-lg bg-black/55 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>ID: ${escapeHtml(profile.fingerprint.slice(0, 12))}</span>
          </span>
        </div>
      </div>

      <!-- Profile Body -->
      <div class="px-5 sm:px-7 pb-6">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4 relative z-10">
          <!-- Avatar -->
          <div class="flex items-end gap-4">
            ${
              profile.avatar
                ? `<img src="${escapeHtml(profile.avatar)}" alt="${escapeHtml(displayName)}" class="w-24 h-24 rounded-2xl object-cover border-4 border-[#0E1015] bg-surface-raised shadow-xl" />`
                : `<div class="w-24 h-24 rounded-2xl border-4 border-[#0E1015] bg-surface-raised flex items-center justify-center text-2xl font-bold text-amber-400 shadow-xl font-mono">${escapeHtml(initials || 'U')}</div>`
            }
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center flex-wrap gap-2.5">
            <button
              type="button"
              id="btn-copy-federated-handle"
              data-action="copy-federated-handle"
              data-copy-handle="${escapeHtml(federatedHandle)}"
              data-fp="${escapeHtml(profile.fingerprint)}"
              class="btn-copy-federated-handle h-9 px-3.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-subtle text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Copy Federated Handle</span>
            </button>

            ${
              isOwnProfile
                ? `
                <button
                  type="button"
                  id="btn-open-edit-profile"
                  data-action="open-edit-profile"
                  class="h-9 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold transition-all cursor-pointer shadow-sm"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  id="btn-profile-settings"
                  data-action="open-settings"
                  class="h-9 px-3.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-subtle text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Settings</span>
                </button>
              `
                : `
                <button
                  type="button"
                  id="btn-toggle-follow-profile"
                  data-action="toggle-follow-profile"
                  data-follow-fp="${escapeHtml(profile.fingerprint)}"
                  data-fp="${escapeHtml(profile.fingerprint)}"
                  ${followPending ? 'disabled' : ''}
                  class="h-9 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isFollowing
                      ? 'bg-surface-raised text-slate-200 border border-subtle hover:border-rose-500/40 hover:text-rose-300'
                      : 'bg-amber-400 text-black hover:bg-amber-300'
                  }"
                >
                  ${isFollowing ? 'Following ✓' : 'Follow'}
                </button>
                <button
                  type="button"
                  data-action="open-dm-with-peer"
                  data-fp="${escapeHtml(profile.fingerprint)}"
                  class="h-9 px-3.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-subtle text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  Message
                </button>
              `
            }
          </div>
        </div>

        <!-- Identity & Handle -->
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">${escapeHtml(displayName)}</h1>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase bg-amber-500/15 text-amber-300 border border-amber-400/30">
              ${escapeHtml(profile.role || 'MEMBER')}
            </span>
            ${
              profile.isZKVerified
                ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Verified Key</span>`
                : ''
            }
          </div>

          <div class="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <span>@${escapeHtml(cleanHandle)}</span>
            <span>·</span>
            <span class="federated-handle text-slate-400" data-federated-handle="${escapeHtml(federatedHandle)}">${escapeHtml(federatedHandle)}</span>
          </div>

          ${
            profile.bio
              ? `<p class="text-sm text-slate-200 leading-relaxed max-w-2xl pt-1">${escapeHtml(profile.bio)}</p>`
              : `<p class="text-sm text-slate-500 italic pt-1">No bio added yet.</p>`
          }

          <!-- Badges -->
          ${
            profile.badges && profile.badges.length
              ? `<div class="profile-badges flex flex-wrap gap-1.5 mt-2">
                  ${profile.badges.map((b) => `<span class="badge px-2.5 py-0.5 text-xs rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono font-medium">${escapeHtml(b)}</span>`).join('')}
                </div>`
              : ''
          }
        </div>

        <!-- Structured Metrics Bar -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-subtle">
          <div class="p-2.5 rounded-xl bg-surface-raised/60 border border-subtle">
            <div class="text-[11px] text-slate-400">Following</div>
            <div class="text-sm font-bold font-mono text-white">${profile.followingCount || 0}</div>
          </div>
          <div class="p-2.5 rounded-xl bg-surface-raised/60 border border-subtle">
            <div class="text-[11px] text-slate-400">Followers</div>
            <div class="text-sm font-bold font-mono text-white">${profile.followersCount || 0}</div>
          </div>
          <div class="p-2.5 rounded-xl bg-surface-raised/60 border border-subtle">
            <div class="text-[11px] text-slate-400">Community Merit</div>
            <div class="text-sm font-bold font-mono text-amber-400">${profile.meritScore || 0}</div>
          </div>
          <div class="p-2.5 rounded-xl bg-surface-raised/60 border border-subtle">
            <div class="text-[11px] text-slate-400">Web of Trust</div>
            <div class="text-sm font-bold font-mono text-emerald-400">
              ${profile.trustScore || 50}%
              <span class="sr-only">WoT Max-Flow: ${profile.trustScore || 50}</span>
            </div>
          </div>
        </div>

        <!-- ActivityPub 2.0 Badge Row -->
        <div class="mt-4 pt-3 border-t border-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
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
    </section>
  `;
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
          data-action="close-edit-profile"
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
            value="${escapeHtml(profile.name)}"
            class="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-black/40 text-sm text-white border border-white/10"
          />
        </div>
        <div>
          <label for="edit-profile-handle" class="block font-semibold text-slate-300 mb-1">Handle</label>
          <input
            id="edit-profile-handle"
            type="text"
            value="${escapeHtml(profile.handle)}"
            class="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-black/40 text-sm text-white border border-white/10 font-mono"
          />
        </div>
        <div>
          <label for="edit-profile-bio" class="block font-semibold text-slate-300 mb-1">Bio</label>
          <textarea
            id="edit-profile-bio"
            rows="3"
            class="w-full p-3.5 rounded-xl bg-black/40 text-sm text-white border border-white/10"
          >${escapeHtml(profile.bio)}</textarea>
        </div>
        <div>
          <label for="edit-profile-location" class="block font-semibold text-slate-300 mb-1">Location</label>
          <input
            id="edit-profile-location"
            type="text"
            value="${escapeHtml(profile.location)}"
            class="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-black/40 text-sm text-white border border-white/10"
          />
        </div>
        <div>
          <label for="edit-profile-website" class="block font-semibold text-slate-300 mb-1">Website</label>
          <input
            id="edit-profile-website"
            type="url"
            value="${escapeHtml(profile.website)}"
            class="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-black/40 text-sm text-white border border-white/10"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-white/10">
        <button
          type="button"
          data-action="close-edit-profile"
          class="px-4 py-2 rounded-xl bg-white/10 text-xs text-slate-200 cursor-pointer"
        >Cancel</button>
        <button
          type="button"
          id="btn-save-profile"
          data-action="save-profile"
          ${saving ? 'disabled' : ''}
          class="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs cursor-pointer"
        >${saving ? 'Saving...' : 'Save Changes'}</button>
      </div>
    </div>
  </div>`;
}