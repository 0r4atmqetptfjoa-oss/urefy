/**
 * @file messages-search.ts
 * @package @aetheris/client-ui
 * @description Local in-chat search across decrypted messages with filters.
 * Runs 100% on-device without leaking plaintext or query indices to remote servers.
 */

import { clientStore } from './client-state.js';
import { sovereignDM } from './sovereign-dm.js';

export interface SearchMatch {
  id: string;
  sourceType: 'dm' | 'relay';
  channelOrPeer: string;
  senderName: string;
  text: string;
  timestamp: number;
  hasMedia: boolean;
  hasLink: boolean;
}

export type SearchFilterType = 'all' | 'media' | 'links' | 'mine';

class ChatSearchEngine {
  public isOpen: boolean = false;
  public query: string = '';
  public activeFilter: SearchFilterType = 'all';

  public openSearch(initialQuery = ''): void {
    this.isOpen = true;
    this.query = initialQuery;
    clientStore.notifySync();
  }

  public closeSearch(): void {
    this.isOpen = false;
    this.query = '';
    clientStore.notifySync();
  }

  public setFilter(filter: SearchFilterType): void {
    this.activeFilter = filter;
    clientStore.notifySync();
  }

  public setQuery(q: string): void {
    this.query = q;
    clientStore.notifySync();
  }

  public search(): SearchMatch[] {
    const q = this.query.trim().toLowerCase();
    const results: SearchMatch[] = [];
    const myFP = clientStore.keypair?.fingerprint || '';

    // Search active relay messages
    for (const [chId, msgs] of clientStore.messages.entries()) {
      for (const m of msgs) {
        const text = m.text || '';
        const hasMedia = Boolean(m.attachment);
        const hasLink = text.includes('http://') || text.includes('https://') || text.includes('/p/');
        const isMine = Boolean(m.isMine || m.authorFingerprint === myFP);

        if (this.activeFilter === 'media' && !hasMedia) continue;
        if (this.activeFilter === 'links' && !hasLink) continue;
        if (this.activeFilter === 'mine' && !isMine) continue;

        if (!q || text.toLowerCase().includes(q)) {
          results.push({
            id: m.id,
            sourceType: 'relay',
            channelOrPeer: chId,
            senderName: isMine ? 'You' : (m.authorFingerprint ? `@${m.authorFingerprint.slice(0, 8)}` : 'Community Member'),
            text,
            timestamp: m.createdAt,
            hasMedia,
            hasLink,
          });
        }
      }
    }

    // Search DMs (decrypted on device)
    for (const conv of sovereignDM.getAllConversations()) {
      for (const m of conv.messages) {
        if (m.context?.reaction) continue;
        const text = m.plaintext || '';
        const hasMedia = Boolean(m.attachment);
        const hasLink = text.includes('http://') || text.includes('https://') || text.includes('/p/');
        const isMine = m.senderFP === myFP;

        if (this.activeFilter === 'media' && !hasMedia) continue;
        if (this.activeFilter === 'links' && !hasLink) continue;
        if (this.activeFilter === 'mine' && !isMine) continue;

        if (!q || text.toLowerCase().includes(q)) {
          results.push({
            id: m.id,
            sourceType: 'dm',
            channelOrPeer: conv.peerFingerprint,
            senderName: isMine ? 'You' : `Peer ${conv.peerFingerprint.slice(0, 8)}`,
            text,
            timestamp: m.timestamp,
            hasMedia,
            hasLink,
          });
        }
      }
    }

    return results.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
  }

  public renderSearchDrawer(): string {
    if (!this.isOpen) return '';
    const results = this.search();

    return `
      <div id="chat-search-overlay" class="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-surface-base/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
        <!-- Search Header -->
        <div class="p-3.5 border-b border-white/5 space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span>🔍</span>
              <h3 class="text-xs font-bold text-white tracking-wide">Search Messages</h3>
            </div>
            <button type="button" data-action="close-chat-search" class="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer text-xs">✕</button>
          </div>

          <div class="relative">
            <input
              type="text"
              id="input-chat-local-search"
              value="${this.query.replace(/"/g, '&quot;')}"
              placeholder="Search words, links, content..."
              class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e59b3c)] font-sans"
              data-input="chat-local-search-query"
              autocomplete="off"
            />
          </div>

          <!-- Filter Pills -->
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] font-semibold">
            <button type="button" data-action="set-search-filter" data-filter="all" class="px-2.5 py-1 rounded-lg transition-all cursor-pointer ${this.activeFilter === 'all' ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold' : 'bg-surface-raised hover:bg-white/10 text-slate-300'}">All</button>
            <button type="button" data-action="set-search-filter" data-filter="links" class="px-2.5 py-1 rounded-lg transition-all cursor-pointer ${this.activeFilter === 'links' ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold' : 'bg-surface-raised hover:bg-white/10 text-slate-300'}">🔗 Links</button>
            <button type="button" data-action="set-search-filter" data-filter="media" class="px-2.5 py-1 rounded-lg transition-all cursor-pointer ${this.activeFilter === 'media' ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold' : 'bg-surface-raised hover:bg-white/10 text-slate-300'}">📎 Files</button>
            <button type="button" data-action="set-search-filter" data-filter="mine" class="px-2.5 py-1 rounded-lg transition-all cursor-pointer ${this.activeFilter === 'mine' ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold' : 'bg-surface-raised hover:bg-white/10 text-slate-300'}">Sent by you</button>
          </div>
        </div>

        <!-- Search Results List -->
        <div class="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
          ${results.length === 0 ? `
            <div class="p-8 text-center text-slate-500 space-y-1">
              <p>No matching messages found.</p>
              <p class="text-[11px] text-slate-600">Searched locally on this device only.</p>
            </div>
          ` : results.map(r => `
            <div class="p-2.5 rounded-xl bg-surface-raised/60 hover:bg-surface-raised border border-white/5 hover:border-[var(--color-accent,#e59b3c)]/30 transition-all cursor-pointer space-y-1 group" data-action="jump-search-result" data-message-id="${r.id}" data-type="${r.sourceType}" data-target="${r.channelOrPeer}">
              <div class="flex items-center justify-between text-[10px] text-slate-400">
                <span class="font-bold text-slate-200 group-hover:text-amber-300 transition-colors">${r.senderName}</span>
                <span class="font-mono">${new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
              <p class="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">${r.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>
              <div class="flex items-center space-x-1.5 text-[9px] font-mono text-slate-500 pt-0.5">
                <span>${r.sourceType === 'dm' ? '🔒 Private' : '💬 Community'}</span>
                ${r.hasMedia ? '<span>• 📎 attachment</span>' : ''}
                ${r.hasLink ? '<span>• 🔗 link</span>' : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Privacy note at bottom -->
        <div class="p-2.5 bg-surface-raised/20 border-t border-white/5 text-[10px] text-slate-400 text-center">
          On-device decrypted search · Queries stay on this device
        </div>
      </div>
    `;
  }
}

export const chatSearchEngine = new ChatSearchEngine();
