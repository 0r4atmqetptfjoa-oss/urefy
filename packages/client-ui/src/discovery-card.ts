import { communityPath } from './public-urls.js';
import type { SovereignCircle } from './sovereign-circle.js';
import { clientStore } from './client-state.js';
import { renderIcon } from './ui/icons.js';

const escape = (value: string) => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

export function renderDiscoveryCard(circle: SovereignCircle): string {
  const latestPost = clientStore.posts.find(p =>
    p.channelId === circle.channelId ||
    p.channelId === `c/${circle.name}` ||
    p.channelId === circle.name ||
    p.content.toLowerCase().includes(`#${circle.name.toLowerCase()}`)
  );

  return `
    <article class="living-space-tile discovery-space" data-community-id="${escape(circle.id)}">
      <div>
        <div class="discovery-space__top flex items-center justify-between mb-2">
          <span class="w-10 h-10 rounded-xl bg-surface-base border border-white/10 flex items-center justify-center text-lg shrink-0">
            ${circle.icon ? escape(circle.icon) : renderIcon('users', { size: 20 })}
          </span>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5 uppercase tracking-wider">
            ${escape(circle.category || 'General')}
          </span>
        </div>
        <a href="${communityPath(circle.name)}" data-public-link class="block group">
          <h3 class="text-sm font-bold text-white group-hover:text-[var(--color-accent,#e89e38)] transition-colors">
            ${escape(circle.displayName || circle.name)}
          </h3>
          <span class="text-[11px] font-mono text-[var(--color-accent,#e89e38)]">c/${escape(circle.name)}</span>
        </a>
        <p class="text-xs text-slate-300 leading-relaxed mt-2 line-clamp-2">${escape(circle.description)}</p>
      </div>

      <!-- CONVERSATION MOMENTUM STRIP -->
      <div class="living-space-conversation-strip my-2">
        <span class="living-space-pulse-dot" style="${latestPost ? '' : 'background: #64748b; box-shadow: none;'}"></span>
        <div class="min-w-0 flex-1 truncate text-[11px]">
          ${latestPost ? `
            <span class="text-slate-300">↳ Latest: </span>
            <span class="text-slate-200 font-medium">"${escape(latestPost.title || latestPost.content.slice(0, 45))}"</span>
          ` : `
            <span class="text-slate-400 italic">Quiet right now · Start the conversation</span>
          `}
        </div>
      </div>

      <footer class="flex items-center justify-between pt-2 border-t border-white/5">
        <span class="text-[11px] font-mono text-slate-400">${Math.max(0, circle.membersCount || 0).toLocaleString()} members</span>
        <button type="button" data-action="toggle-join-circle" data-circle-id="${escape(circle.id)}" class="compact-join-button ${circle.isJoined ? 'is-joined' : ''}" aria-pressed="${circle.isJoined}" aria-label="${circle.isJoined ? 'Leave' : 'Join'} c/${escape(circle.name)}">
          ${renderIcon(circle.isJoined ? 'check' : 'plus', { size: 13 })}
          <span>${circle.isJoined ? 'Joined' : 'Join space'}</span>
        </button>
      </footer>
    </article>
  `;
}
