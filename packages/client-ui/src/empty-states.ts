/**
 * @file empty-states.ts
 * @package @aetheris/client-ui
 * @description Visual empty states for core platform workspaces:
 * - Pulse Stream (No posts / messages)
 * - Knowledge Vault (No files uploaded)
 * - Vault Releases (No audited releases)
 * - Live Relays (No relays connected or empty channels)
 * Each state provides a clear, friendly message and an actionable primary button.
 * Uses high-precision Lucide icons instead of raw platform emojis.
 * All user-visible strings are translated via i18n.t().
 */

import { t } from './i18n.js';
import { renderIcon } from './ui/icons.js';

export interface EmptyStateOptions {
  title?: string;
  description?: string;
  actionText?: string;
  actionId?: string;
  actionType?: 'explore' | 'composer';
  onAction?: string;
  icon?: string;
}

/**
 * 1. Empty state for Pulse Stream when no posts are available
 */
export function renderPulseEmptyState(options?: EmptyStateOptions): string {
  const title = options?.title || t('emptyState.pulseTitle', undefined, 'The feed is quiet');
  const desc = options?.description || t('emptyState.pulseDesc', undefined, 'No posts yet in this channel. Be the first to share a thought on UREfy.');
  const actionText = options?.actionText || t('emptyState.pulseAction', undefined, 'Write the first post');
  const actionId = options?.actionId || 'btn-empty-pulse-composer';
  const isExplore = options?.actionType === 'explore';

  return `
    <div id="empty-state-pulse" class="empty-state-card flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 rounded-2xl border border-dashed border-white/10 bg-surface-base/60 backdrop-blur-none max-w-lg mx-auto select-none animate-in fade-in duration-300">
      <div class="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.15)] mb-4">
        ${renderIcon(isExplore ? 'explore' : 'feed', { size: 30, strokeWidth: 1.75, class: 'text-cyan-400' })}
      </div>
      <h3 class="text-base font-bold text-white mb-2 tracking-wide font-sans">
        ${title}
      </h3>
      <p class="text-xs text-slate-300 leading-relaxed max-w-sm mb-6 font-sans">
        ${desc}
      </p>
      <button
        type="button"
        id="${actionId}" 
        data-action="${isExplore ? 'nav-mode' : 'call-global'}" 
        ${isExplore ? 'data-mode="explore"' : 'data-raw-click="if(window.__aetheris_open_composer){window.__aetheris_open_composer();}else{const btn=document.getElementById(\'btn-open-composer\');if(btn)btn.click();}"'}
        class="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 cursor-pointer flex items-center space-x-2"
        data-empty-action="${isExplore ? 'explore' : 'pulse'}"
      >
        ${renderIcon(isExplore ? 'explore' : 'plus', { size: 14, strokeWidth: 2.5 })}
        <span>${actionText}</span>
      </button>
    </div>
  `;
}

/**
 * 2. Empty state for Knowledge Vault when no files are uploaded
 */
export function renderVaultFilesEmptyState(options?: EmptyStateOptions): string {
  const title = options?.title || t('emptyState.vaultFilesTitle', undefined, 'Your vault is empty');
  const desc = options?.description || t('emptyState.vaultFilesDesc', undefined, 'No encrypted files saved yet. Your files are stored only on your devices.');
  const actionText = options?.actionText || t('emptyState.vaultFilesAction', undefined, 'Upload your first file');
  const actionId = options?.actionId || 'btn-empty-vault-upload';

  return `
    <div id="empty-state-vault-files" class="empty-state-card flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 rounded-2xl border border-dashed border-white/10 bg-surface-base/60 backdrop-blur-none max-w-lg mx-auto select-none animate-in fade-in duration-300">
      <div class="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(34,197,94,0.15)] mb-4">
        ${renderIcon('vault', { size: 30, strokeWidth: 1.75, class: 'text-emerald-400' })}
      </div>
      <h3 class="text-base font-bold text-white mb-2 tracking-wide font-sans">
        ${title}
      </h3>
      <p class="text-xs text-slate-300 leading-relaxed max-w-sm mb-6 font-sans">
        ${desc}
      </p>
      <button
        type="button"
        id="${actionId}" data-action="call-global" data-raw-click="if(window.__aetheris_open_composer){window.__aetheris_open_composer();}else{const btn=document.getElementById('btn-open-composer');if(btn)btn.click();}"
        class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 cursor-pointer flex items-center space-x-2"
        data-empty-action="vault-files"
      >
        ${renderIcon('upload', { size: 14, strokeWidth: 2.5 })}
        <span>${actionText}</span>
      </button>
    </div>
  `;
}

/**
 * 3. Empty state for Vault Releases when no audited releases match
 */
export function renderVaultReleasesEmptyState(options?: EmptyStateOptions): string {
  const title = options?.title || t('emptyState.vaultReleasesTitle', undefined, 'No audited releases in this category');
  const desc = options?.description || t('emptyState.vaultReleasesDesc', undefined, 'All versions verified or current filter found no packages. Publish a cryptographically signed release.');
  const actionText = options?.actionText || t('emptyState.vaultReleasesAction', undefined, 'Publish a new audited release');
  const actionId = options?.actionId || 'btn-empty-vault-release';

  return `
    <div id="empty-state-vault-releases" class="empty-state-card flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 rounded-2xl border border-dashed border-white/10 bg-surface-base/60 backdrop-blur-none max-w-lg mx-auto select-none animate-in fade-in duration-300">
      <div class="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.15)] mb-4">
        ${renderIcon('sparkles', { size: 30, strokeWidth: 1.75, class: 'text-cyan-400' })}
      </div>
      <h3 class="text-base font-bold text-white mb-2 tracking-wide font-sans">
        ${title}
      </h3>
      <p class="text-xs text-slate-300 leading-relaxed max-w-sm mb-6 font-sans">
        ${desc}
      </p>
      <button
        type="button"
        id="${actionId}" data-action="call-global" data-raw-click="if(window.__aetheris_open_composer){window.__aetheris_open_composer();}else{const btn=document.getElementById('btn-open-composer');if(btn)btn.click();}"
        class="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 cursor-pointer flex items-center space-x-2"
        data-empty-action="vault-releases"
      >
        ${renderIcon('plus', { size: 14, strokeWidth: 2.5 })}
        <span>${actionText}</span>
      </button>
    </div>
  `;
}

/**
 * 4. Empty state for Live Relays when no relays are connected or channel has no messages
 */
export function renderRelaysEmptyState(options?: EmptyStateOptions): string {
  const title = options?.title || t('emptyState.relaysTitle', undefined, 'No servers connected or messages');
  const desc = options?.description || t('emptyState.relaysDesc', undefined, 'Not connected to any live server or this channel has no messages yet. Connect a server or send the first E2EE encrypted message.');
  const actionText = options?.actionText || t('emptyState.relaysAction', undefined, 'Send the first message');
  const connectText = 'Join a chat';
  const actionId = options?.actionId || 'btn-empty-relays-chat';

  return `
    <div id="empty-state-relays" class="empty-state-card flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 rounded-2xl border border-dashed border-white/10 bg-surface-base/60 backdrop-blur-none max-w-lg mx-auto select-none animate-in fade-in duration-300">
      <div class="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.15)] mb-4">
        ${renderIcon('messages', { size: 30, strokeWidth: 1.75, class: 'text-cyan-400' })}
      </div>
      <h3 class="text-base font-bold text-white mb-2 tracking-wide font-sans">
        ${title}
      </h3>
      <p class="text-xs text-slate-300 leading-relaxed max-w-sm mb-6 font-sans">
        ${desc}
      </p>
      <div class="flex items-center space-x-3 flex-wrap justify-center gap-y-2">
        <button
          type="button"
          id="${actionId}" data-action="call-global" data-raw-click="const inp=document.getElementById('input-message');if(inp){inp.focus();}else{const form=document.getElementById('form-send-message');if(form)form.scrollIntoView();}"
          class="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 cursor-pointer flex items-center space-x-2"
          data-empty-action="relays-message"
        >
          ${renderIcon('send', { size: 14, strokeWidth: 2.5 })}
          <span>${actionText}</span>
        </button>
        <button
          type="button"
          id="btn-empty-add-relay" data-action="call-global" data-raw-click="if(window.__aetheris_open_relay_invite){window.__aetheris_open_relay_invite();}else{const btn=document.getElementById('btn-add-relay-server');if(btn)btn.click();}"
          class="px-4 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer flex items-center space-x-2"
          data-empty-action="add-relay"
        >
          ${renderIcon('radio', { size: 14, strokeWidth: 2 })}
          <span>${connectText}</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * 5. Visual loading skeleton for Pulse Stream while initializing or synchronizing
 */
export function renderPulseFeedSkeleton(count = 3): string {
  const loadingLabel = t('emptyState.loadingPulses', undefined, 'Loading pulses...');
  return `
    <div class="post-stream-skeleton w-full divide-y divide-white/5" aria-busy="true" aria-label="${loadingLabel}">
      ${Array.from({ length: count }).map(() => `
        <article class="social-post social-post-skeleton animate-pulse" style="pointer-events: none;">
          <div class="social-post__avatar">
            <div class="w-10 h-10 rounded-full bg-white/10 shrink-0"></div>
          </div>
          <div class="social-post__content space-y-2.5">
            <header class="social-post__header flex items-center gap-2">
              <div class="h-3.5 bg-white/15 rounded w-28"></div>
              <div class="h-3 bg-white/10 rounded w-16"></div>
              <div class="h-3 bg-white/5 rounded w-20 ml-auto"></div>
            </header>
            <div class="h-4 bg-white/10 rounded w-3/4"></div>
            <div class="space-y-1.5 pt-0.5">
              <div class="h-3.5 bg-white/10 rounded w-full"></div>
              <div class="h-3.5 bg-white/5 rounded w-4/5"></div>
            </div>
            <div class="flex items-center space-x-4 pt-2">
              <div class="h-6 bg-white/5 rounded-full w-14"></div>
              <div class="h-6 bg-white/5 rounded-full w-14"></div>
              <div class="h-6 bg-white/5 rounded-full w-14"></div>
            </div>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

/**
 * 6. Actionable empty state for Following feed when user follows 0 authors/communities
 */
export function renderFollowingEmptyState(): string {
  return `
    <div id="empty-state-following" class="empty-state-card flex flex-col items-center justify-center text-center p-6 sm:p-10 my-6 rounded-2xl border border-dashed border-white/10 bg-surface-base/60 max-w-xl mx-auto select-none animate-in fade-in duration-300">
      <div class="w-16 h-16 rounded-2xl bg-[var(--color-accent,#e59b3c)]/10 border border-[var(--color-accent,#e59b3c)]/30 flex items-center justify-center text-[var(--color-accent,#e59b3c)] text-3xl mb-4">
        👥
      </div>
      <h3 class="text-base font-bold text-white mb-1.5 font-sans">
        Your Following feed is quiet
      </h3>
      <p class="text-xs text-slate-300 leading-relaxed max-w-sm mb-6 font-sans">
        Follow contributors or join communities below to see their posts and updates directly in this feed.
      </p>

      <!-- Actionable Discovery Section -->
      <div class="w-full space-y-4 text-left border-t border-white/5 pt-4">
        <!-- Recommended Communities -->
        <div>
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Recommended Communities</span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div class="p-2.5 rounded-xl bg-surface-raised border border-white/5 flex items-center justify-between gap-2">
              <div class="flex items-center space-x-2 min-w-0">
                <span class="text-lg shrink-0">🚀</span>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-white truncate">Technology</div>
                  <div class="text-[10px] text-slate-400">c/technology</div>
                </div>
              </div>
              <button type="button" data-action="call-global" data-global-method="onboardingWizard.toggleJoinCommunity" data-global-arg="technology" class="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-surface-overlay hover:bg-[var(--color-accent,#e59b3c)] hover:text-slate-950 text-white border border-white/10 transition-all shrink-0 cursor-pointer">Join</button>
            </div>

            <div class="p-2.5 rounded-xl bg-surface-raised border border-white/5 flex items-center justify-between gap-2">
              <div class="flex items-center space-x-2 min-w-0">
                <span class="text-lg shrink-0">🤖</span>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-white truncate">AI &amp; Neural</div>
                  <div class="text-[10px] text-slate-400">c/ai</div>
                </div>
              </div>
              <button type="button" data-action="call-global" data-global-method="onboardingWizard.toggleJoinCommunity" data-global-arg="ai" class="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-surface-overlay hover:bg-[var(--color-accent,#e59b3c)] hover:text-slate-950 text-white border border-white/10 transition-all shrink-0 cursor-pointer">Join</button>
            </div>

            <div class="p-2.5 rounded-xl bg-surface-raised border border-white/5 flex items-center justify-between gap-2">
              <div class="flex items-center space-x-2 min-w-0">
                <span class="text-lg shrink-0">🎮</span>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-white truncate">Gaming</div>
                  <div class="text-[10px] text-slate-400">c/gaming</div>
                </div>
              </div>
              <button type="button" data-action="call-global" data-global-method="onboardingWizard.toggleJoinCommunity" data-global-arg="gaming" class="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-surface-overlay hover:bg-[var(--color-accent,#e59b3c)] hover:text-slate-950 text-white border border-white/10 transition-all shrink-0 cursor-pointer">Join</button>
            </div>

            <div class="p-2.5 rounded-xl bg-surface-raised border border-white/5 flex items-center justify-between gap-2">
              <div class="flex items-center space-x-2 min-w-0">
                <span class="text-lg shrink-0">🛡️</span>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-white truncate">Privacy</div>
                  <div class="text-[10px] text-slate-400">c/privacy</div>
                </div>
              </div>
              <button type="button" data-action="call-global" data-global-method="onboardingWizard.toggleJoinCommunity" data-global-arg="privacy" class="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-surface-overlay hover:bg-[var(--color-accent,#e59b3c)] hover:text-slate-950 text-white border border-white/10 transition-all shrink-0 cursor-pointer">Join</button>
            </div>
          </div>
        </div>

        <!-- Recommended Creators -->
        <div>
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Contributors to Follow</span>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div class="p-2 rounded-xl bg-surface-raised border border-white/5 flex items-center justify-between gap-1.5">
              <div class="min-w-0">
                <div class="text-[11px] font-bold text-white truncate">Archivist Zero</div>
                <div class="text-[9px] text-slate-400">@archivist</div>
              </div>
              <button type="button" data-action="call-global" data-global-method="onboardingWizard.toggleFollowCreator" data-global-arg="aeth_archivist_01" class="px-2 py-0.5 text-[10px] font-medium rounded bg-surface-overlay hover:bg-surface-highlight text-white border border-white/10 shrink-0 cursor-pointer">+ Follow</button>
            </div>

            <div class="p-2 rounded-xl bg-surface-raised border border-white/5 flex items-center justify-between gap-1.5">
              <div class="min-w-0">
                <div class="text-[11px] font-bold text-white truncate">Ada Sovereign</div>
                <div class="text-[9px] text-slate-400">@ada_builder</div>
              </div>
              <button type="button" data-action="call-global" data-global-method="onboardingWizard.toggleFollowCreator" data-global-arg="aeth_builder_02" class="px-2 py-0.5 text-[10px] font-medium rounded bg-surface-overlay hover:bg-surface-highlight text-white border border-white/10 shrink-0 cursor-pointer">+ Follow</button>
            </div>

            <div class="p-2 rounded-xl bg-surface-raised border border-white/5 flex items-center justify-between gap-1.5">
              <div class="min-w-0">
                <div class="text-[11px] font-bold text-white truncate">Cipher Nomad</div>
                <div class="text-[9px] text-slate-400">@cipher_nomad</div>
              </div>
              <button type="button" data-action="call-global" data-global-method="onboardingWizard.toggleFollowCreator" data-global-arg="aeth_cipher_03" class="px-2 py-0.5 text-[10px] font-medium rounded bg-surface-overlay hover:bg-surface-highlight text-white border border-white/10 shrink-0 cursor-pointer">+ Follow</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Action button to explore directory -->
      <div class="pt-4 mt-2">
        <button
          type="button"
          data-action="nav-mode"
          data-mode="explore"
          class="px-5 py-2 rounded-xl bg-surface-overlay hover:bg-surface-highlight text-white text-xs font-semibold border border-white/10 transition-all flex items-center space-x-1.5 cursor-pointer mx-auto"
        >
          <span>🔍</span>
          <span>Explore All Communities &amp; Topics</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * 7. Actionable empty state for Search
 */
export function renderSearchEmptyState(query = ''): string {
  return `
    <div id="empty-state-search" class="empty-state-card flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 rounded-2xl border border-dashed border-white/10 bg-surface-base/60 max-w-lg mx-auto select-none animate-in fade-in duration-300">
      <div class="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
        ${renderIcon('search', { size: 30, strokeWidth: 1.75, class: 'text-indigo-400' })}
      </div>
      <h3 class="text-base font-bold text-white mb-2 tracking-wide font-sans">
        ${query ? `No results for "${query}"` : 'Explore UREfy'}
      </h3>
      <p class="text-xs text-slate-300 leading-relaxed max-w-sm mb-5 font-sans">
        ${query ? 'Try searching for another keyword, tag, or topic.' : 'Search across sovereign discussions, encrypted vault, and community circles.'}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-1.5 max-w-sm">
        <span class="text-[11px] text-slate-500 w-full mb-1">Popular Topics:</span>
        <button type="button" data-action="search-tag" data-tag="Technology" class="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-overlay text-cyan-400 border border-white/5 text-xs font-mono transition-all cursor-pointer">#Technology</button>
        <button type="button" data-action="search-tag" data-tag="ArtificialIntelligence" class="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-overlay text-purple-400 border border-white/5 text-xs font-mono transition-all cursor-pointer">#AI</button>
        <button type="button" data-action="search-tag" data-tag="Gaming" class="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-overlay text-amber-400 border border-white/5 text-xs font-mono transition-all cursor-pointer">#Gaming</button>
        <button type="button" data-action="search-tag" data-tag="Privacy" class="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-overlay text-emerald-400 border border-white/5 text-xs font-mono transition-all cursor-pointer">#Privacy</button>
        <button type="button" data-action="search-tag" data-tag="OpenSource" class="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-overlay text-sky-400 border border-white/5 text-xs font-mono transition-all cursor-pointer">#OpenSource</button>
      </div>
    </div>
  `;
}
