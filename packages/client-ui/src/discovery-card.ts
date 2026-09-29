import { communityPath } from './public-urls.js';
import type { ClientPost } from './client-state.js';
import type { SovereignCircle } from './sovereign-circle.js';
import { clientStore } from './client-state.js';
import { renderIcon } from './ui/icons.js';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

/** Return only posts explicitly attached to this space, newest first. */
export function getLatestCommunityPost(circle: SovereignCircle): ClientPost | undefined {
  const channelIds = new Set([circle.channelId, circle.id, `c/${circle.name}`, circle.name].filter(Boolean));
  return clientStore.posts
    .filter(post => channelIds.has(post.channelId))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
}

/** A handful of imported legacy rows contain UI/debug errors in the public description field. */
export function getPublicCommunityDescription(description: string): string {
  const normalized = description.trim().replace(/[.!…]+$/, '').toLocaleLowerCase();
  const knownInternalErrors = new Set([
    'attempting to duplicate slug',
    'duplicate slug',
    'error: duplicate slug',
  ]);
  return knownInternalErrors.has(normalized) ? '' : description.trim();
}

export function renderDiscoveryCard(circle: SovereignCircle): string {
  const latestPost = getLatestCommunityPost(circle);
  const description = getPublicCommunityDescription(circle.description);
  const recentTitle = latestPost && (latestPost.title?.trim() || latestPost.content?.trim().slice(0, 88));

  return `
    <article class="living-space-tile discovery-space journal-place journal-place-entry" data-community-id="${escape(circle.id)}">
      <header class="journal-place-entry__head">
        <span class="journal-place-entry__emblem" aria-hidden="true">${circle.icon ? escape(circle.icon) : renderIcon('users', { size: 20 })}</span>
        <span class="journal-place-entry__category">${escape(circle.category || 'General')}</span>
      </header>
      <a href="${communityPath(circle.name)}" data-public-link class="discovery-space__identity journal-place-entry__identity">
        <span class="journal-place-entry__slug">c/${escape(circle.name)}</span>
        <h3>${escape(circle.displayName || circle.name)}</h3>
      </a>
      ${description ? `<p class="journal-place-entry__description">${escape(description)}</p>` : ''}

      <div class="journal-place-entry__activity" aria-label="${latestPost ? 'Most recent discussion' : 'No recent discussion'}">
        <span class="journal-place-entry__activity-mark" aria-hidden="true"></span>
        ${recentTitle ? `
          <span class="journal-place-entry__activity-label">Latest discussion</span>
          <span class="journal-place-entry__activity-title">${escape(recentTitle)}</span>
        ` : `<span class="journal-place-entry__quiet">No discussions yet</span>`}
      </div>

      <footer class="journal-place-entry__footer">
        <span class="journal-place-entry__members">${Math.max(0, circle.membersCount || 0).toLocaleString()} members</span>
        <button type="button" data-action="toggle-join-circle" data-circle-id="${escape(circle.id)}" class="compact-join-button journal-place-entry__join ${circle.isJoined ? 'is-joined' : ''}" aria-pressed="${circle.isJoined}" aria-label="${circle.isJoined ? 'Leave' : 'Join'} c/${escape(circle.name)}">
          ${renderIcon(circle.isJoined ? 'check' : 'plus', { size: 13 })}
          <span>${circle.isJoined ? 'Joined' : 'Join space'}</span>
        </button>
      </footer>
    </article>
  `;
}
