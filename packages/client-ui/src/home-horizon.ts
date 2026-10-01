import type { ClientPost } from './client-state.js';
import { renderIcon } from './ui/icons.js';
import { renderPublicHomeIntro } from './public-home.js';

/** Two-layer Home: Editorial intro + wayfinding shortcuts */
export function renderHomeHorizon(_posts: readonly ClientPost[], _connected: boolean, _demo: boolean): string {
  let isDismissed = false;
  try {
    isDismissed = typeof localStorage !== 'undefined' && localStorage.getItem('urefy_home_intro_dismissed') === 'true';
  } catch {}

  const showIntro = !isDismissed && !_connected;

  return `
    ${showIntro ? renderPublicHomeIntro(2) : ''}
    <nav class="orbit-shortcuts" aria-label="Workspace shortcuts">
      <a href="/communities" data-public-link class="hover:text-white">
        ${renderIcon('users', { size: 18 })}<span>Communities</span>${renderIcon('chevronRight', { size: 16 })}
      </a>
      <button type="button" data-action="nav-mode" data-mode="vault" class="hover:text-white">
        ${renderIcon('bookmark', { size: 18 })}<span>Kept in Vault</span>${renderIcon('chevronRight', { size: 16 })}
      </button>
    </nav>
  `;
}
