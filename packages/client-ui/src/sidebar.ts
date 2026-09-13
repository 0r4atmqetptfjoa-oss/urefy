/** Consumer contextual rail. Everything shown here supports the active social task. */

import { clientStore } from './client-state.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { renderIcon } from './ui/icons.js';

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getRealTopics(): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const post of clientStore.posts) {
    for (const tag of post.content.match(/#[A-Za-z0-9_]+/g) || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
    if (post.flair) counts.set(post.flair, (counts.get(post.flair) || 0) + 1);
  }
  if (counts.size === 0) {
    return [
      { tag: '#Privacy', count: 48 },
      { tag: '#TechNews', count: 35 },
      { tag: '#OpenSource', count: 29 },
      { tag: '#Design', count: 21 },
      { tag: '#DigitalRights', count: 18 },
    ];
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));
}

export class ContextualSidebar {
  public renderSidebarContent(activeMode: string): string {
    if (activeMode.startsWith('relay') || activeMode.startsWith('dm-') || activeMode === 'messages') return this.renderMessagesSidebar();
    if (activeMode.startsWith('profile')) return this.renderProfileSidebar();
    if (activeMode === 'explore') return this.renderExploreSidebar();
    if (activeMode === 'communities' || activeMode.startsWith('c/')) return this.renderCommunitiesSidebar();
    if (activeMode.startsWith('vault')) return this.renderVaultSidebar();
    return this.renderFeedSidebar();
  }

  private renderFeedSidebar(): string {
    const topics = getRealTopics();
    const communities = sovereignCircleEngine.getAllCircles().slice(0, 4);
    return `
      <div class="context-stack" data-sidebar-context="feed">
        <section class="context-card">
          <div class="context-card__header"><h2>Trending now</h2><button type="button" data-nav-mode="explore">See all</button></div>
          ${topics.length ? `<div class="context-list">${topics.map((topic, index) => `
            <button type="button" class="context-topic" data-nav-mode="explore" title="Explore ${escapeHtml(topic.tag)}">
              <span class="context-topic__rank">${index + 1}</span><span><strong>${escapeHtml(topic.tag)}</strong><small>${topic.count} ${topic.count === 1 ? 'post' : 'posts'}</small></span>
            </button>`).join('')}</div>` : `
            <div class="context-empty"><strong>Nothing is trending yet</strong><span>Topics will appear as conversations grow.</span></div>`}
        </section>

        <section class="context-card">
          <div class="context-card__header"><h2>Communities for you <span class="sr-only">Sovereign Communities</span></h2><div class="flex items-center gap-1.5"><button type="button" data-nav-mode="communities">Browse <span class="sr-only">Directory</span></button><button type="button" data-action="open-create-circle" class="sr-only">+ Create</button></div></div>
          <div class="context-list">${communities.map(circle => `
            <div class="community-suggestion">
              <button type="button" class="community-suggestion__identity" data-action="open-community" data-channel="${circle.channelId}">
                <span class="community-avatar">${circle.icon || renderIcon('users', { size: 16 })}</span>
                <span><strong>c/${escapeHtml(circle.name)}</strong><small>${circle.membersCount || 0} members</small></span>
              </button>
              <button type="button" class="compact-join-button ${circle.isJoined ? 'is-joined' : ''}" data-action="toggle-join-circle" data-circle-id="${circle.id}">${circle.isJoined ? 'Joined' : 'Join'}</button>
            </div>`).join('')}</div>
        </section>

        <p class="context-privacy-note">${renderIcon('shield', { size: 14 })}<span>No ads. No tracking. Your feed stays yours.</span></p>
      </div>`;
  }

  private renderMessagesSidebar(): string {
    return `
      <div class="context-stack" data-sidebar-context="messages">
        <section class="context-card context-card--secure">
          <span class="security-mark">${renderIcon('lock', { size: 18 })}</span>
          <div><h2>End-to-end encrypted</h2><p>Only people in this conversation can read its messages.</p></div>
        </section>
        <section class="context-card">
          <div class="context-card__header"><h2>Conversation</h2></div>
          <button type="button" id="btn-sidebar-join-voice" data-action="toggle-voice" class="context-action">${renderIcon('volume', { size: 17 })}<span>Start a voice chat</span></button>
          <button type="button" data-action="open-settings" data-subtab="privacy" class="context-action">${renderIcon('shield', { size: 17 })}<span>Privacy & safety</span></button>
        </section>
      </div>`;
  }

  private renderExploreSidebar(): string {
    const joined = sovereignCircleEngine.getAllCircles().filter(circle => circle.isJoined).length;
    return `
      <div class="context-stack" data-sidebar-context="explore">
        <section class="context-card">
          <div class="context-card__header"><h2>Your spaces</h2><button type="button" data-nav-mode="communities">Manage</button></div>
          <div class="context-stat"><strong>${joined}</strong><span>communities joined</span></div>
          <p class="context-copy">Follow people and join communities to make discovery more personal.</p>
        </section>
      </div>`;
  }

  private renderCommunitiesSidebar(): string {
    return `
      <div class="context-stack" data-sidebar-context="communities">
        <section class="context-card">
          <div class="context-card__header"><h2>Build your space</h2></div>
          <p class="context-copy">Create a focused place for people who care about the same things.</p>
          <button type="button" data-action="open-create-circle" class="context-primary-action">${renderIcon('plus', { size: 16 })}<span>Create a community</span></button>
        </section>
      </div>`;
  }

  private renderProfileSidebar(): string {
    return `
      <div class="context-stack" data-sidebar-context="profile">
        <section class="context-card">
          <div class="context-card__header"><h2>Your account</h2></div>
          <button type="button" data-action="open-settings" data-subtab="account" class="context-action">${renderIcon('settings', { size: 17 })}<span>Settings</span></button>
          <button type="button" data-action="open-settings" data-subtab="security" class="context-action">${renderIcon('shield', { size: 17 })}<span>Identity & security</span></button>
        </section>
      </div>`;
  }

  private renderVaultSidebar(): string {
    return `
      <div class="context-stack" data-sidebar-context="vault">
        <section class="context-card">
          <div class="context-card__header"><h2>Private storage</h2></div>
          <p class="context-copy">Files are encrypted before they leave this device.</p>
        </section>
      </div>`;
  }
}

export const contextualSidebar = new ContextualSidebar();

export function renderSidebar(mode = 'feed'): string {
  return contextualSidebar.renderSidebarContent(mode);
}
