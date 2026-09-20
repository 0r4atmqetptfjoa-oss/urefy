import { communityPath } from './public-urls.js';
import type { SovereignCircle } from './sovereign-circle.js';
import { renderIcon } from './ui/icons.js';

const escape = (value: string) => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

export function renderDiscoveryCard(circle: SovereignCircle): string {
  return `<article class="discovery-space" data-community-id="${escape(circle.id)}">
    <div class="discovery-space__top"><span class="discovery-space__symbol">${circle.icon ? escape(circle.icon) : renderIcon('users', { size: 24 })}</span><span class="discovery-space__category">${escape(circle.category || 'General')}</span></div>
    <a href="${communityPath(circle.name)}" data-public-link class="discovery-space__identity"><h3>${escape(circle.displayName || circle.name)}</h3><span>c/${escape(circle.name)}</span></a>
    <p>${escape(circle.description)}</p>
    <footer><span>${Math.max(0, circle.membersCount || 0).toLocaleString()} members</span><button type="button" data-action="toggle-join-circle" data-circle-id="${escape(circle.id)}" class="compact-join-button ${circle.isJoined ? 'is-joined' : ''}" aria-pressed="${circle.isJoined}" aria-label="${circle.isJoined ? 'Leave' : 'Join'} c/${escape(circle.name)}">${renderIcon(circle.isJoined ? 'check' : 'plus', { size: 14 })}${circle.isJoined ? 'Joined' : 'Join community'}</button></footer>
  </article>`;
}
