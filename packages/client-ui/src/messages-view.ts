/**
 * @file messages-view.ts
 * @package @aetheris/client-ui
 * @description Sovereign Relays & Live E2EE Chat Workspace View.
 */

import { clientStore, ClientMessage } from './client-state.js';
import { relaysManager } from './relays-manager.js';
import { renderRelaysEmptyState } from './empty-states.js';
import { zkReputation } from './zk-reputation.js';

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderMessageItem(m: ClientMessage): string {
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (clientStore.density === 'compact') {
    return `
      <div class="font-mono text-xs leading-tight py-1 hover:bg-surface-raised/40 px-2 rounded-lg flex items-baseline space-x-2 transition-colors msg-bubble-enter">
        <span class="text-slate-500 text-[10px]">${time}</span>
        <span class="text-cyphr font-bold">&lt;id:${m.authorFingerprint.substring(0, 8)}&gt;</span>
        <span class="text-slate-200 select-text">${escapeHtml(m.text)}</span>
      </div>
    `;
  }

  return `
    <div class="p-3.5 rounded-2xl bg-surface-raised/80 hover:bg-surface-raised border border-white/5 transition-all shadow-sm space-y-1.5 msg-bubble-enter">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center space-x-2.5">
          <div class="w-6 h-6 rounded-xl bg-gradient-to-br from-cyphr/30 to-aether/30 border border-cyphr/30 flex items-center justify-center font-mono text-[10px] font-bold text-white shadow-sm">
            ${m.authorFingerprint.substring(0, 2).toUpperCase()}
          </div>
          <span class="font-mono text-xs font-semibold text-cyphr">id:${m.authorFingerprint.substring(0, 12)}...</span>
          ${m.isMine ? '<span class="text-[9px] font-mono font-bold bg-cyphr/15 text-cyphr border border-cyphr/30 px-1.5 py-0.2 rounded-md">YOU</span>' : '<span class="text-[9px] font-mono bg-emerald-950 text-signal border border-signal/20 px-1.5 py-0.2 rounded-md">ZK-Verified</span>'}
          ${clientStore.showTrustBadges ? zkReputation.renderInlineTrustBadge(m.authorFingerprint) : ''}
        </div>
        <span class="text-[10px] font-mono text-slate-500">${time}</span>
      </div>
      <div class="text-xs text-slate-200 select-text leading-relaxed whitespace-pre-wrap pl-8">${escapeHtml(m.text)}</div>
    </div>
  `;
}

export function renderRelaysWorkspace(): string {
  const activeRelay = relaysManager.getActiveRelay();
  const messages = clientStore.messages.get(clientStore.activeChannelId) || [];
  const channelName = clientStore.activeChannelId.replace(/^relay-.*?-(general|announcements|voice-room|dev-core|dev|voice-radar|lounge)/, '$1').replace('relays-', '');

  return `
    <div class="flex-1 flex overflow-hidden bg-canvas">
      <!-- 1. SOVEREIGN RELAY SERVER RAIL (LEFT-MOST ICON STRIP) -->
      ${relaysManager.renderRelayServerRail()}

      <!-- 2. RELAY CHANNELS LIST & MAIN CHAT AREA -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- RELAY TOP BANNER WITH INVITE FRIENDS BUTTON -->
        ${relaysManager.renderRelayHeader(activeRelay, channelName, clientStore.keypair?.fingerprint)}

        <!-- MESSAGES FEED -->
        <div id="messages-container" class="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto space-y-${clientStore.density === 'compact' ? '1' : clientStore.density === 'balanced' ? '3' : '5'} max-w-4xl mx-auto w-full pb-20 md:pb-6">
          ${messages.length === 0 ? renderRelaysEmptyState({
            title: `Channel #${channelName} has no messages yet`,
            description: `This is the beginning of #${channelName} on server ${escapeHtml(activeRelay.name)}. All messages are encrypted client-side using TreeKEM MLS.`,
            actionText: '💬 Send the first message',
          }) : messages.map(m => renderMessageItem(m)).join('')}
        </div>

        <!-- RELAYS COMPOSER -->
        <div class="p-3 md:p-4 border-subtle-t bg-surface-base shrink-0 shadow-sm">
          <form id="form-send-message" class="flex items-center space-x-2 max-w-4xl mx-auto">
            <div class="relative flex-1">
              <input 
                type="text" 
                id="input-message"
                placeholder="Message #${channelName} (E2EE encrypted & ZK-RLN verified)..."
                class="w-full bg-surface-raised border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all font-sans"
                autocomplete="off"
              />
            </div>
            <button type="submit" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer shrink-0">
              <span>Send</span>
              <span>⚡</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}
