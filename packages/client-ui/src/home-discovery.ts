/**
 * @file home-discovery.ts
 * @package @aetheris/client-ui
 * @description Editorial Discovery Layer for UREfy Home.
 * Provides curated, content-adaptive editorial shelves:
 * 1. Trending Discussions (adaptive cards: text-led or media-led)
 * 2. Topics Gaining Momentum (curated hashtag/flair chips)
 * 3. Recommended Communities (themed destination cards with 1-click join)
 * 4. Fresh Conversations
 */

import { ClientPost, clientStore } from './client-state.js';
import { sovereignCircleEngine, SovereignCircle } from './sovereign-circle.js';
import { profileView } from './profile-view.js';
import { pulseActionsEngine } from './pulse-actions.js';
import { renderIcon } from './ui/icons.js';
import { postPath, communityPath, profilePath } from './public-urls.js';
import { collectTopics } from './discovery-data.js';
import { renderAvatar } from './ui/avatar-generator.js';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class HomeDiscoveryEngine {
  private isCollapsed = false;

  public toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  /**
   * Renders an editorial discussion card that naturally adapts to its content type.
   * Text discussions are given first-class typographic dignity without fake thumbnails.
   */
  public renderDiscoveryCard(post: ClientPost): string {
    const circle = sovereignCircleEngine.findCircle(post.channelId);
    const circleName = circle ? `c/${circle.name}` : (post.channelId.startsWith('c/') ? post.channelId : 'c/technology');
    const profile = profileView.getProfile(post.authorFingerprint);
    const authorName = profile?.name || `@${post.authorFingerprint.substring(0, 8)}`;
    const interactions = pulseActionsEngine.getInteractions(post.id);
    const replies = post.replyCount ?? interactions.repliesCount ?? 0;
    const merits = post.meritVotes ?? interactions.likesCount ?? 0;
    const title = post.title && post.title !== post.content.substring(0, 50) ? post.title : '';
    const excerpt = post.content.slice(0, 140).trim();
    const hasImage = Boolean(post.images && post.images.length > 0);
    const imageUrl = hasImage ? post.images![0] : null;

    return `
      <article 
        class="editorial-discovery-card snap-start group shrink-0 w-72 sm:w-80 rounded-2xl bg-surface-base border border-white/10 hover:border-white/20 transition-all p-4 flex flex-col justify-between cursor-pointer select-none shadow-sm hover:shadow-md"
        data-action="open-post-detail"
        data-post-id="${escapeHtml(post.id)}"
        tabindex="0"
        role="button"
        aria-label="Open discussion: ${escapeHtml(title || excerpt)}"
      >
        <div class="space-y-2.5">
          <!-- Top row: Community and author -->
          <div class="flex items-center justify-between text-xs">
            <a 
              href="${communityPath(circleName)}" 
              data-public-link 
              data-action="stop-propagation"
              class="font-semibold text-xs text-[var(--color-accent,#e59b3c)] hover:underline truncate max-w-[150px]"
            >
              ${escapeHtml(circleName)}
            </a>
            <span class="text-[11px] text-slate-400 font-mono">${merits} merits</span>
          </div>

          ${imageUrl ? `
            <div class="w-full h-32 rounded-xl overflow-hidden bg-surface-raised relative">
              <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title || 'Post image')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            </div>
          ` : ''}

          <!-- Title or Quote -->
          <div>
            ${title ? `
              <h3 class="text-sm font-bold text-slate-100 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                ${escapeHtml(title)}
              </h3>
            ` : ''}
            <p class="text-xs text-slate-300 ${imageUrl ? 'line-clamp-2 mt-1' : 'line-clamp-3 mt-1 font-serif text-[13px] leading-relaxed italic'}">
              ${escapeHtml(excerpt)}
            </p>
          </div>
        </div>

        <!-- Footer row: Author & Replies -->
        <div class="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div class="flex items-center gap-1.5 min-w-0">
            ${renderAvatar(profile?.avatar, post.authorFingerprint, { size: 20, className: 'w-5 h-5 shrink-0' })}
            <span class="truncate text-[11px]">${escapeHtml(authorName)}</span>
          </div>
          <span class="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
            ${renderIcon('messageSquare', { size: 13 })}
            <span>${replies}</span>
          </span>
        </div>
      </article>
    `;
  }

  /**
   * Renders the complete Two-Layer Discovery Shelf.
   */
  public renderDiscoveryLayer(posts: readonly ClientPost[]): string {
    if (this.isCollapsed) {
      return `
        <div class="editorial-discovery-collapsed mb-3 flex items-center justify-between px-3 py-2 rounded-xl bg-surface-base border border-white/5 text-xs text-slate-400">
          <span class="flex items-center gap-2">
            ${renderIcon('sparkles', { size: 15, className: 'text-[var(--color-accent,#e59b3c)]' })}
            <span>Editorial Discovery Shelves hidden</span>
          </span>
          <button type="button" data-action="toggle-discovery-layer" class="text-xs text-slate-200 hover:text-white font-medium cursor-pointer">
            Show Discovery
          </button>
        </div>
      `;
    }

    // Curate trending discussions (posts with high merits or replies)
    const trendingPosts = [...posts]
      .sort((a, b) => ((b.meritVotes || 0) + (b.replyCount || 0) * 2) - ((a.meritVotes || 0) + (a.replyCount || 0) * 2))
      .slice(0, 6);

    // Curate top momentum topics
    const topics = collectTopics(posts).slice(0, 6);

    // Curate recommended communities
    const circles = sovereignCircleEngine.getAllCircles().slice(0, 4);

    return `
      <section class="editorial-discovery-layer mb-4 space-y-4 select-none" aria-label="Editorial Discovery">
        <!-- Shelf Header with Wayfinding -->
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <span class="text-base">${renderIcon('compass', { size: 18, className: 'text-[var(--color-accent,#e59b3c)]' })}</span>
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-300">Discover Discussions &amp; Communities</h2>
          </div>
          <div class="flex items-center gap-2">
            <button 
              type="button" 
              data-action="toggle-discovery-layer" 
              class="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Hide discovery shelves for this session"
            >
              Hide
            </button>
          </div>
        </div>

        <!-- Shelf 1: Trending Discussions (Horizontal Scroll Carousel) -->
        ${trendingPosts.length > 0 ? `
          <div class="space-y-2">
            <div class="editorial-shelf-row flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/10" tab-index="0" aria-label="Trending discussions carousel">
              ${trendingPosts.map(p => this.renderDiscoveryCard(p)).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Shelf 2: Topics Gaining Momentum & Recommended Spaces (Dual Row) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Topics Momentum -->
          <div class="p-3 rounded-2xl bg-surface-base/70 border border-white/5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-300">Trending topics</span>
              <a href="/explore" data-public-link class="text-[11px] text-[var(--color-accent,#e59b3c)] hover:underline">View all</a>
            </div>
            <div class="flex flex-wrap gap-1.5">
              ${topics.map(t => `
                <button 
                  type="button" 
                  data-action="filter-by-topic" 
                  data-topic="${escapeHtml(t.topic)}"
                  class="px-2.5 py-1 rounded-lg text-xs bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span class="font-medium">${escapeHtml(t.topic)}</span>
                  <span class="text-[10px] text-slate-400 font-mono">${t.count}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Recommended Communities -->
          <div class="p-3 rounded-2xl bg-surface-base/70 border border-white/5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-300">Suggested communities</span>
              <a href="/communities" data-public-link class="text-[11px] text-[var(--color-accent,#e59b3c)] hover:underline">Browse</a>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${circles.map((circle: SovereignCircle) => `
                <div class="p-2 rounded-xl bg-surface-raised border border-white/5 flex items-center justify-between gap-2">
                  <a href="${communityPath(circle.name)}" data-public-link class="min-w-0 flex items-center gap-2 hover:opacity-90">
                    <span class="w-7 h-7 rounded-lg bg-surface-base flex items-center justify-center text-sm border border-white/10 shrink-0">
                      ${circle.icon || '💬'}
                    </span>
                    <div class="min-w-0">
                      <div class="text-xs font-bold text-slate-200 truncate">c/${escapeHtml(circle.name)}</div>
                      <div class="text-[10px] text-slate-400 truncate">${circle.membersCount || 0} members</div>
                    </div>
                  </a>
                  <button 
                    type="button" 
                    data-action="toggle-join-circle" 
                    data-circle-id="${escapeHtml(circle.id)}"
                    class="px-2.5 py-1 rounded-lg text-[11px] font-medium ${circle.isJoined ? 'bg-surface-overlay text-slate-400' : 'bg-surface-base hover:bg-surface-overlay text-slate-200 border border-white/10'} transition-all cursor-pointer shrink-0"
                    aria-label="${circle.isJoined ? 'Leave' : 'Join'} ${escapeHtml(circle.name)}"
                  >
                    ${circle.isJoined ? 'Joined' : 'Join'}
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </section>
    `;
  }
}

export const homeDiscoveryEngine = new HomeDiscoveryEngine();
