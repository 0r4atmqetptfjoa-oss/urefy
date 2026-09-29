/**
 * @file home-discovery.ts
 * @package @aetheris/client-ui
 * @description Home workspace overview for discussions, topics, and communities.
 */

import type { ClientPost } from './client-state.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { pulseActionsEngine } from './pulse-actions.js';
import { postPath, communityPath, profilePath } from './public-urls.js';
import { collectTopics } from './discovery-data.js';
import { getLatestCommunityPost } from './discovery-card.js';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function relativeTime(timestamp: number): string {
  const elapsed = Math.max(0, Date.now() - timestamp);
  if (elapsed < 60_000) return 'just now';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  if (elapsed < 7 * 86_400_000) return `${Math.floor(elapsed / 86_400_000)}d ago`;
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export class HomeDiscoveryEngine {
  private isCollapsed = false;

  public toggleCollapse(): void { this.isCollapsed = !this.isCollapsed; }

  /** A discussion preview that leads into the main conversation stream. */
  public renderDiscoveryCard(post: ClientPost, position = 0): string {
    const circle = sovereignCircleEngine.findCircle(post.channelId);
    const circleName = circle ? `c/${circle.name}` : (post.channelId.startsWith('c/') ? post.channelId : 'UREfy');
    const authorName = post.authorDisplayName || post.authorHandle || `Member ${post.authorFingerprint.slice(0, 6)}`;
    const interactions = pulseActionsEngine.getInteractions(post.id);
    const replies = post.replyCount ?? interactions.repliesCount ?? 0;
    const merits = post.meritVotes ?? interactions.likesCount ?? 0;
    const title = post.title && post.title !== post.content.substring(0, 50) ? post.title : post.content.slice(0, 96).trim();
    const excerpt = post.content.slice(0, 240).trim();
    const imageUrl = post.images?.[0];
    const authorUrl = profilePath(post.authorFingerprint);
    const discussionUrl = postPath(post.id);
    const ordinal = String(position + 1).padStart(2, '0');

    return `
      <article class="social-home-highlight cursor-pointer ${imageUrl ? 'social-home-highlight--illustrated' : ''}" data-post-id="${escapeHtml(post.id)}" data-action="open-post-detail">
        <span class="social-home-highlight__index" aria-hidden="true">${ordinal}</span>
        <div class="social-home-highlight__content">
          <div class="social-home-highlight__meta">
            <a href="${communityPath(circleName)}" data-public-link>${escapeHtml(circleName)}</a>
            <span aria-hidden="true">·</span>
            <a href="${authorUrl}" data-public-link>${escapeHtml(authorName)}</a>
            <time datetime="${new Date(post.createdAt).toISOString()}">${relativeTime(post.createdAt)}</time>
          </div>
          <h3><a href="${discussionUrl}" data-public-link>${escapeHtml(title || 'Untitled discussion')}</a></h3>
          ${imageUrl ? `<a class="social-home-highlight__image" href="${discussionUrl}" data-public-link tabindex="-1" aria-hidden="true"><img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" /></a>` : ''}
          ${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ''}
          <div class="social-home-highlight__footer">
            <a href="${discussionUrl}" data-public-link aria-label="Open discussion with ${replies} replies">${replies} ${replies === 1 ? 'reply' : 'replies'}</a>
            <span>${merits.toLocaleString()} ${merits === 1 ? 'merit' : 'merits'}</span>
          </div>
        </div>
      </article>`;
  }

  /** Home overview and community shortcuts. */
  public renderDiscoveryLayer(posts: readonly ClientPost[]): string {
    if (this.isCollapsed) {
      return `<div class="social-home-collapsed"><span>Community highlights are hidden.</span><button type="button" data-action="toggle-discovery-layer">Show highlights</button></div>`;
    }

    const rankedPosts = [...posts]
      .sort((a, b) => ((b.meritVotes || 0) + (b.replyCount || 0) * 2) - ((a.meritVotes || 0) + (a.replyCount || 0) * 2))
      .slice(0, 4);
    const topics = collectTopics(posts).slice(0, 6);
    const circles = sovereignCircleEngine.getAllCircles()
      .map((circle, index) => ({ circle, index, latest: getLatestCommunityPost(circle) }))
      .sort((a, b) => {
        if (a.latest && b.latest) return Number(b.latest.createdAt || 0) - Number(a.latest.createdAt || 0);
        if (a.latest) return -1;
        if (b.latest) return 1;
        return (b.circle.membersCount || 0) - (a.circle.membersCount || 0) || a.index - b.index;
      })
      .slice(0, 4)
      .map(({ circle }) => circle);

    return `
      <section class="social-home-overview" aria-label="Community highlights">
        <header class="social-home-overview__header">
          <div><span class="social-home-eyebrow">Your UREfy workspace</span><h2>What’s happening</h2></div>
          <button type="button" data-action="toggle-discovery-layer" aria-label="Hide community highlights">Hide</button>
        </header>
        <div class="social-home-overview__layout">
          <section class="social-home-overview__conversations" aria-label="Popular discussions">
            <div class="social-home-overview__section-heading"><h3>Popular discussions</h3><a href="/explore" data-public-link>Explore more</a></div>
            ${rankedPosts.length
              ? `<div class="social-home-highlights">${rankedPosts.map((post, index) => this.renderDiscoveryCard(post, index)).join('')}</div>`
              : `<div class="social-home-empty"><strong>Your feed is ready.</strong><span>Public conversations will appear here when people share them.</span><a href="/explore" data-public-link>Explore UREfy</a></div>`}
          </section>
          <aside class="social-home-overview__index" aria-label="Topics and communities">
            <section class="social-home-index-section">
              <div class="social-home-overview__section-heading"><h3>Topics</h3><a href="/explore" data-public-link>Browse</a></div>
              ${topics.length
                ? `<ul class="social-home-topic-list">${topics.map(topic => `<li><button type="button" data-action="filter-by-topic" data-topic="${escapeHtml(topic.topic)}"><span>${escapeHtml(topic.topic)}</span><small>${topic.count}</small></button></li>`).join('')}</ul>`
                : `<p class="social-home-index-empty">Topics appear as people start conversations.</p>`}
            </section>
            <section class="social-home-index-section">
              <div class="social-home-overview__section-heading"><h3>Communities</h3><a href="/communities" data-public-link>All</a></div>
              ${circles.length
                ? `<ul class="social-home-community-list">${circles.map(circle => `<li><a href="${communityPath(circle.name)}" data-public-link><span class="social-home-community-list__mark" aria-hidden="true">${escapeHtml(circle.icon || '◈')}</span><span>c/${escapeHtml(circle.name)}</span><small>${(circle.membersCount || 0).toLocaleString()}</small></a><button type="button" data-action="toggle-join-circle" data-circle-id="${escapeHtml(circle.id)}" aria-pressed="${circle.isJoined}" aria-label="${circle.isJoined ? 'Leave' : 'Join'} c/${escapeHtml(circle.name)}">${circle.isJoined ? 'Joined' : 'Join'}</button></li>`).join('')}</ul>`
                : `<p class="social-home-index-empty">No communities are listed yet.</p>`}
            </section>
          </aside>
        </div>
      </section>`;
  }
}

export const homeDiscoveryEngine = new HomeDiscoveryEngine();
