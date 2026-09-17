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
    <div class="space-y-4 animate-pulse w-full max-w-3xl mx-auto" aria-busy="true" aria-label="${loadingLabel}">
      ${Array.from({ length: count }).map(() => `
        <div class="p-4 rounded-2xl bg-surface-raised/50 border border-white/5 space-y-3">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-full bg-slate-800/80 shrink-0"></div>
            <div class="space-y-1.5 flex-1">
              <div class="h-3.5 bg-slate-800/80 rounded w-1/4"></div>
              <div class="h-2.5 bg-slate-800/50 rounded w-1/6"></div>
            </div>
          </div>
          <div class="space-y-2 pt-1">
            <div class="h-3.5 bg-slate-800/70 rounded w-3/4"></div>
            <div class="h-3 bg-slate-800/50 rounded w-full"></div>
            <div class="h-3 bg-slate-800/40 rounded w-2/3"></div>
          </div>
          <div class="flex items-center space-x-6 pt-2">
            <div class="h-3.5 bg-slate-800/60 rounded w-12"></div>
            <div class="h-3.5 bg-slate-800/60 rounded w-12"></div>
            <div class="h-3.5 bg-slate-800/60 rounded w-12"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
