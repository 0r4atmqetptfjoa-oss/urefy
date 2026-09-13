/** Social-first profile header with identity details progressively disclosed. */

import { UserProfileData } from './types.js';
import { renderIcon } from '../ui/icons.js';
import { renderAvatar } from '../ui/avatar-generator.js';
import { markdownRenderer } from '../markdown-renderer.js';

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

export function renderProfileHeaderHTML(profile: UserProfileData, isOwnProfile: boolean, isFollowing: boolean, isEditModalOpen: boolean): string {
  const handle = profile.handle ? profile.handle.replace(/^@/, '') : profile.fingerprint.substring(0, 10);
  const isGeneratedProfile = /^Sovereign Node\b/i.test(profile.name) || /^Peer node participating\b/i.test(profile.bio || '');
  const displayName = isGeneratedProfile ? 'UREfy member' : profile.name;
  const displayHandle = isGeneratedProfile ? 'New to UREfy' : `@${handle}`;
  const displayBio = isGeneratedProfile ? 'Here to share, connect, and join good conversations.' : profile.bio;
  const displayLocation = profile.location === 'Decentralized P2P' ? '' : profile.location;
  const role = humanRole(profile.role);

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
              <button type="button" id="btn-profile-settings" data-action="open-settings" data-raw-click="window.__aetheris_open_settings()" class="secondary-icon-button" title="Settings" aria-label="Settings">${renderIcon('settings', { size: 18 })}</button>
            ` : `
              <button type="button" data-action="open-dm" data-fingerprint="${profile.fingerprint}" class="secondary-icon-button" title="Message" aria-label="Message">${renderIcon('messages', { size: 18 })}</button>
              <button type="button" id="btn-toggle-follow" data-action="toggle-follow" data-fingerprint="${profile.fingerprint}" class="primary-button ${isFollowing ? 'is-following' : ''}">${isFollowing ? 'Following' : 'Follow'}</button>
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
          <div class="profile-stats">
            <button type="button"><strong>${profile.followingCount.toLocaleString()}</strong><span>Following</span></button>
            <button type="button"><strong>${profile.followersCount.toLocaleString()}</strong><span>Followers</span></button>
            <span class="trust-summary">${renderIcon('shield', { size: 15 })}<strong>${profile.trustScore}</strong><span>Trust</span></span>
            ${isOwnProfile ? `<button type="button" data-action="open-settings" data-subtab="security" class="identity-security-link">Identity & security ${renderIcon('chevronRight', { size: 14 })}</button>` : ''}
          </div>
        </div>
      </div>
    </section>
    ${isEditModalOpen ? renderEditProfileModalHTML(profile) : ''}`;
}

export function renderEditProfileModalHTML(profile: UserProfileData): string {
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
          <label><span>Display name</span><input type="text" id="edit-profile-name" value="${escapeAttr(profile.name)}" required maxlength="80" /></label>
          <label><span>Handle</span><div class="handle-field"><span>@</span><input type="text" id="edit-profile-handle" value="${escapeAttr(profile.handle.replace(/^@/, ''))}" maxlength="40" /></div></label>
          <label><span>Bio</span><textarea id="edit-profile-bio" rows="4" maxlength="280">${escapeAttr(profile.bio)}</textarea></label>
          <div class="form-grid"><label><span>Location</span><input type="text" id="edit-profile-location" value="${escapeAttr(profile.location)}" /></label><label><span>Website</span><input type="url" id="edit-profile-website" value="${escapeAttr(profile.website)}" /></label></div>
          <footer><button type="button" data-action="close-edit-profile" class="secondary-button">Cancel</button><button type="submit" id="btn-save-profile" class="primary-button">Save changes</button></footer>
        </form>
      </section>
    </div>`;
}
