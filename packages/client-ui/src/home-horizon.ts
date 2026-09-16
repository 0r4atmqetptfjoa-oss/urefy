import type { ClientPost } from './client-state.js';
import { renderIcon } from './ui/icons.js';
import { selectHomeHighlights } from './home-signals.js';

const escape = (value: string) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

export function renderHomeHorizon(posts: readonly ClientPost[], connected: boolean, demo: boolean): string {
  const highlights = selectHomeHighlights(posts);
  return `
    <section class="horizon" aria-labelledby="horizon-title">
      <div class="horizon__copy">
        <span class="horizon__eyebrow"><span aria-hidden="true"></span> Sovereign Social Workspace</span>
        <h2 id="horizon-title">Your people. Your ideas.<br><em>Your sovereign space.</em></h2>
        <p>A social product where public discovery transforms into meaningful discussion, community knowledge, and sovereign personal memory.</p>
        <div class="horizon__actions">
          <button type="button" data-action="nav-mode" data-mode="explore" class="horizon__cta">Explore Discovery ${renderIcon('explore', { size: 16 })}</button>
          <button type="button" data-action="open-composer" class="horizon__secondary-cta">Start a Discussion ${renderIcon('plus', { size: 16 })}</button>
          <button type="button" data-action="nav-mode" data-mode="vault" class="horizon__secondary-cta">Knowledge Vault ${renderIcon('vault', { size: 16 })}</button>
        </div>
      </div>
      <div class="horizon__status-bar">
        <div class="horizon__badges">
          <span class="horizon__badge">${renderIcon('shield', { size: 12 })} Sovereign &amp; E2EE</span>
          <span class="horizon__badge">${renderIcon('sparkles', { size: 12 })} Zero Cloud Lock-in</span>
        </div>
        <span class="orbit-connection ${connected ? 'is-connected' : ''}">
          <i aria-hidden="true"></i>${demo ? 'Demo content' : connected ? 'Relay connected' : 'Local workspace'}
        </span>
      </div>
    </section>
    <nav class="orbit-shortcuts" aria-label="Workspace shortcuts">
      <button type="button" data-action="nav-mode" data-mode="communities">
        <span class="orbit-shortcuts__icon">${renderIcon('users', { size: 19 })}</span>
        <span><strong>Find your people</strong><small>Explore communities &amp; live chats</small></span>
        ${renderIcon('chevronRight', { size: 16 })}
      </button>
      <button type="button" data-action="toggle-bookmarks">
        <span class="orbit-shortcuts__icon">${renderIcon('bookmark', { size: 19 })}</span>
        <span><strong>Keep the good stuff</strong><small>Open saved posts &amp; snapshots</small></span>
        ${renderIcon('chevronRight', { size: 16 })}
      </button>
    </nav>
    <section class="orbit-signals" aria-label="Recent conversations">
      <div class="orbit-section-heading">
        <h2>${highlights.length ? 'On your radar' : 'Make room for discovery'}</h2>
        <span class="orbit-connection ${connected ? 'is-connected' : ''}"><i aria-hidden="true"></i>${demo ? 'Demo content' : connected ? 'Relay connected' : 'Local workspace'}</span>
      </div>
      ${highlights.length ? `
        <p class="orbit-section-caption">Recent posts available here · last 7 days</p>
        <div class="orbit-signals__grid">
          ${highlights.map((post, index) => `
            <button type="button" class="orbit-signal" data-action="more-open-detail" data-post-id="${escape(post.id)}">
              <span class="orbit-signal__number">0${index + 1} ${renderIcon('externalLink', { size: 16 })}</span>
              <strong>${escape(post.title || post.content.slice(0, 90) || 'Open conversation')}</strong>
              <span class="orbit-signal__channel">${escape(post.channelId)}</span>
            </button>
          `).join('')}
        </div>` : `
        <div class="orbit-signals__empty">
          ${renderIcon('explore', { size: 22 })}
          <p>Your next conversation starts with a connection.<br><span>Join a community or share the first idea.</span></p>
          <button type="button" data-action="open-composer">Start something ${renderIcon('plus', { size: 16 })}</button>
        </div>`}
    </section>`;
}
