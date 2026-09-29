/** Social-first profile header with identity details progressively disclosed. */

import { UserProfileData, formatFederatedHandle } from './types.js';
import { renderIcon } from '../ui/icons.js';
import { renderAvatar } from '../ui/avatar-generator.js';
import { markdownRenderer } from '../markdown-renderer.js';
import { presentPublicIdentity } from '../public-identity.js';

function escapeAttr(value: string | undefined | null): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function humanRole(role: UserProfileData['role']): string {
  if (role === 'GUARDIAN') return 'UREfy team';
  if (role === 'ARCHIVIST') return 'Contributor';
  if (role === 'MODERATOR') return 'Moderator';
  return '';
}

export function renderProfileHeaderHTML(profile: UserProfileData, isOwnProfile: boolean, isFollowing: boolean, isEditModalOpen: boolean, followPending = false): string {
  const identity = presentPublicIdentity(profile, profile.fingerprint, isOwnProfile);
  const handle = profile.handle ? profile.handle.replace(/^@/, '') : '';
  const displayName = identity.displayName;
  const displayHandle = identity.handleLabel;
  const displayBio = identity.needsSetup ? (isOwnProfile ? 'Set up your public identity before posting, following or messaging.' : '') : profile.bio;
  const displayLocation = profile.location === 'Decentralized P2P' ? '' : profile.location;
  const role = humanRole(profile.role);
  const fedIdentifier = profile.handle ? profile.handle.replace(/^@/, '') : profile.fingerprint;
  const federatedHandle = formatFederatedHandle(fedIdentifier);

  return `
    <section class="profile-hero">
      <div class="profile-hero__banner">
        ${profile.banner ? `<img src="${escapeAttr(profile.banner)}" alt="" loading="eager" />` : '<div class="profile-hero__banner-fallback"></div>'}
      </div>
      <div class="profile-hero__content">
        <div class="profile-hero__topline">
          <div class="profile-avatar-wrap">
            ${renderAvatar(profile.avatar, profile.fingerprint, { size: 128, rounded: 'full', className: 'profile-avatar' })}
            <span class="profile-presence profile-presence--${profile.status}" title="${profile.status}"></span>
          </div>
          <div class="profile-actions">
            <button type="button" id="btn-share-profile" data-action="share-profile" data-handle="${escapeAttr(handle)}" class="secondary-icon-button" title="Share profile" aria-label="Share profile">${renderIcon('share', { size: 18 })}</button>
            ${isOwnProfile ? `
              <button type="button" id="btn-open-edit-profile" data-action="open-edit-profile" class="secondary-button">Edit profile</button>
              <button type="button" id="btn-profile-settings" data-action="set-profile-tab" data-tab="settings" class="secondary-icon-button" title="Settings" aria-label="Settings">${renderIcon('settings', { size: 18 })}</button>
            ` : `
              <button type="button" data-action="open-dm" data-fingerprint="${profile.fingerprint}" class="secondary-icon-button" title="Message" aria-label="Message">${renderIcon('messages', { size: 18 })}</button>
              <button type="button" id="btn-toggle-follow" ${followPending ? 'disabled aria-busy="true"' : ''} aria-pressed="${isFollowing}" data-action="toggle-follow" data-fingerprint="${escapeAttr(profile.fingerprint)}" class="primary-button ${isFollowing ? 'is-following' : ''}">${isFollowing ? 'Following' : 'Follow'}</button>
              <div class="relative profile-more-menu-container"><button type="button" id="btn-profile-more" data-action="toggle-profile-menu" class="secondary-icon-button" aria-label="More profile actions">${renderIcon('more', { size: 18 })}</button>
                <div id="profile-more-dropdown" class="hidden profile-more-menu"><button type="button" data-action="mute-user" data-fingerprint="${profile.fingerprint}" data-handle="${escapeAttr(handle)}">Mute</button><button type="button" data-action="block-user" data-fingerprint="${profile.fingerprint}" data-handle="${escapeAttr(handle)}">Block</button><button type="button" data-action="report-user" data-fingerprint="${profile.fingerprint}" data-handle="${escapeAttr(handle)}">Report</button></div>
              </div>
            `}
          </div>
        </div>

        <div class="profile-identity">
          <div class="profile-name-row"><h1>${escapeAttr(displayName)}</h1>${profile.isZKVerified ? `<span class="verified-badge" title="Verified account">${renderIcon('checkCircle', { size: 17 })}</span>` : ''}${role ? `<span class="role-badge">${role}</span>` : ''}</div>
          <p class="profile-handle">${escapeAttr(displayHandle)}</p>
          ${displayBio ? `<div class="profile-bio">${markdownRenderer.renderMarkdown(displayBio)}</div>` : ''}
          ${(displayLocation || profile.website) ? `<div class="profile-details">${displayLocation ? `<span>${renderIcon('globe', { size: 15 })}${escapeAttr(displayLocation)}</span>` : ''}${profile.website ? `<a href="${escapeAttr(profile.website)}" target="_blank" rel="noopener noreferrer">${renderIcon('link', { size: 15 })}${escapeAttr(profile.website)}</a>` : ''}</div>` : ''}
          <details class="profile-federation-accordion group mt-2 pt-2 border-t border-white/5 text-xs">
            <summary class="cursor-pointer text-slate-400 hover:text-slate-200 flex items-center justify-between select-none py-1">
              <span class="flex items-center space-x-1.5 font-medium">
                <span>🌐</span>
                <span>Technical identity details</span>
              </span>
              <span class="text-[10px] text-indigo-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div class="federated-handle-bar flex flex-wrap items-center gap-2 mt-2 pt-1">
              <span class="federated-handle font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10" data-federated-handle="${escapeAttr(federatedHandle)}">${escapeAttr(federatedHandle)}</span>
              <span class="font-mono text-[10px] text-slate-500 break-all" data-technical-fingerprint>${escapeAttr(profile.fingerprint)}</span>
              <button type="button" class="btn-copy-federated-handle text-indigo-400 hover:text-indigo-300 text-xs px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors cursor-pointer" data-copy-handle="${escapeAttr(federatedHandle)}">Copy Federated Handle</button>
              <a href="/.well-known/aetheris-node" class="activitypub-badge inline-flex items-center text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full hover:underline" data-activitypub-badge="true">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                Federated via ActivityPub 2.0
              </a>
            </div>
          </details>
          ${profile.badges && profile.badges.length ? `
            <div class="profile-badges flex flex-wrap gap-1.5 mt-2">
              ${profile.badges.map(b => `<span class="badge px-2.5 py-0.5 text-xs rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">${escapeAttr(b)}</span>`).join('')}
            </div>
          ` : ''}
          <div class="profile-stats mt-3">
            <button type="button"><strong>${profile.followingCount.toLocaleString()}</strong><span>Following</span></button>
            <button type="button"><strong>${profile.followersCount.toLocaleString()}</strong><span>Followers</span></button>
            <span class="trust-summary">${renderIcon('shield', { size: 15 })}<strong>${profile.trustScore}</strong><span>Trust <span class="sr-only">WoT Max-Flow: ${profile.trustScore}</span></span></span>
            ${isOwnProfile ? `<button type="button" data-action="open-settings" data-subtab="security" class="identity-security-link">Identity & security ${renderIcon('chevronRight', { size: 14 })}</button>` : ''}
          </div>
        </div>
      </div>
    </section>
    ${isEditModalOpen ? renderEditProfileModalHTML(profile) : ''}`;
}

export function renderEditProfileModalHTML(profile: UserProfileData, saving = false): string {
  return `
    <div id="edit-profile-modal-overlay" class="modal-overlay" data-action="close-edit-profile" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
      <section class="edit-profile-dialog" data-action="stop-propagation">
        <header><div><span>Profile</span><h2 id="edit-profile-title">Edit profile</h2></div><button type="button" id="btn-close-edit-profile" data-action="close-edit-profile" aria-label="Close">${renderIcon('close', { size: 19 })}</button></header>
        <form id="form-edit-profile" data-submit="save-profile" class="edit-profile-form">
          <div class="profile-media-fields">
            <label><span>Profile photo</span><input type="file" id="edit-profile-avatar-file" accept="image/*" /></label>
            <label><span>Cover photo</span><input type="file" id="edit-profile-banner-file" accept="image/*" /></label>
            <input type="hidden" id="edit-profile-avatar" value="${escapeAttr(profile.avatar)}" />
            <input type="hidden" id="edit-profile-banner" value="${escapeAttr(profile.banner)}" />
          </div>
          <label><span>Display name</span><input type="text" id="edit-profile-name" value="${escapeAttr(profile.name)}" required maxlength="60" /></label>
          <label><span>Handle</span><div class="handle-field"><span>@</span><input type="text" id="edit-profile-handle" value="${escapeAttr(profile.handle.replace(/^@/, ''))}" required pattern="[a-zA-Z0-9_]{3,30}" maxlength="30" /></div></label>
          <label><span>Bio</span><textarea id="edit-profile-bio" rows="4" maxlength="280">${escapeAttr(profile.bio)}</textarea></label>
          <div class="form-grid"><label><span>Location</span><input type="text" id="edit-profile-location" value="${escapeAttr(profile.location)}" /></label><label><span>Website</span><input type="url" id="edit-profile-website" value="${escapeAttr(profile.website)}" /></label></div>
          <footer><button type="button" data-action="close-edit-profile" class="secondary-button">Cancel</button><button type="submit" id="btn-save-profile" ${saving ? 'disabled aria-busy="true"' : ''} class="primary-button">${saving ? 'Saving…' : 'Save changes'}</button></footer>
        </form>
      </section>
    </div>`;
}
