import type { ClientPost } from './client-state.js';
import { renderIcon } from './ui/icons.js';
import { selectHomeHighlights } from './home-signals.js';

const escape = (value: string) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

export function renderHomeHorizon(posts: readonly ClientPost[], connected: boolean, demo: boolean): string {
  const highlights = selectHomeHighlights(posts);
  return `
    <section class="horizon" aria-labelledby="horizon-title">
      <div class="horizon__copy">
        <span class="horizon__eyebrow"><span aria-hidden="true"></span> A LITTLE LESS NOISE. A LOT MORE YOU.</span>
        <h2 id="horizon-title">Your people.<br>Your ideas.<br><em>Your orbit.</em></h2>
        <p>A space for curious minds.<br>Find your community. Make something matter.</p>
        <button type="button" data-action="nav-mode" data-mode="explore" class="horizon__cta">Find your next idea ${renderIcon('externalLink', { size: 18 })}</button>
      </div>
      <div class="horizon__art" aria-hidden="true">
        <span class="horizon__orbit horizon__orbit--one"></span><span class="horizon__orbit horizon__orbit--two"></span><span class="horizon__orbit horizon__orbit--three"></span>
        <span class="horizon__planet"><img src="/logo-mark.svg" alt="" /></span>
        <span class="horizon__satellite horizon__satellite--one">${renderIcon('sparkles', { size: 22 })}</span>
        <span class="horizon__satellite horizon__satellite--two">${renderIcon('users', { size: 22 })}</span>
        <span class="horizon__coordinate">IDEAS CONNECT HERE</span>
      </div>
      <div class="horizon__footer"><span>THE OPEN SOCIAL WORKSPACE</span><span>EDITION / 27</span></div>
    </section>
    <nav class="orbit-shortcuts" aria-label="Workspace shortcuts">
      <button type="button" data-action="nav-mode" data-mode="communities"><span class="orbit-shortcuts__icon">${renderIcon('users', { size: 19 })}</span><span><strong>Find your people</strong><small>Explore communities</small></span>${renderIcon('chevronRight', { size: 16 })}</button>
      <button type="button" data-action="toggle-bookmarks"><span class="orbit-shortcuts__icon">${renderIcon('bookmark', { size: 19 })}</span><span><strong>Keep the good stuff</strong><small>Open saved posts</small></span>${renderIcon('chevronRight', { size: 16 })}</button>
    </nav>
    <section class="orbit-signals" aria-label="Recent conversations">
      <div class="orbit-section-heading"><h2>${highlights.length ? 'On your radar' : 'Make room for discovery'}</h2><span class="orbit-connection ${connected ? 'is-connected' : ''}"><i aria-hidden="true"></i>${demo ? 'Demo content' : connected ? 'Relay connected' : 'Local workspace'}</span></div>
      ${highlights.length ? `<p class="orbit-section-caption">Recent posts available here · last 7 days</p><div class="orbit-signals__grid">${highlights.map((post, index) => `
        <button type="button" class="orbit-signal" data-action="more-open-detail" data-post-id="${escape(post.id)}">
          <span class="orbit-signal__number">0${index + 1} ${renderIcon('externalLink', { size: 16 })}</span>
          <strong>${escape(post.title || post.content.slice(0, 90) || 'Open conversation')}</strong>
          <span class="orbit-signal__channel">${escape(post.channelId)}</span>
        </button>`).join('')}</div>` : `<div class="orbit-signals__empty">${renderIcon('explore', { size: 22 })}<p>Your next conversation starts with a connection.<br><span>Join a community or share the first idea.</span></p><button type="button" data-action="open-composer">Start something ${renderIcon('plus', { size: 16 })}</button></div>`}
    </section>`;
}
