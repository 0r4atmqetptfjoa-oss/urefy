/**
 * @file sidebar.ts
 * @package @aetheris/client-ui
 * @description Contextual Right Sidebar Engine.
 * Dynamically renders contextual content based on active mode (Feed, Messages, Vault, Explore, Profile)
 * conforming to Section 25 of the Master UX Specification.
 */

import { clientStore } from './client-state.js';
import { trendingEngine } from './trending.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { renderIcon } from './ui/icons.js';
import { TYPOGRAPHY } from './ui/tokens.js';

export class ContextualSidebar {
  public renderSidebarContent(activeMode: string): string {
    switch (activeMode) {
      case 'vault':
        return this.renderVaultSidebar();
      case 'relays':
      case 'messages':
        return this.renderMessagesSidebar();
      case 'explore':
        return this.renderExploreSidebar();
      case 'profile':
        return this.renderProfileSidebar();
      case 'pulse':
      case 'feed':
      default:
        return this.renderFeedSidebar();
    }
  }

  /**
   * Feed Contextual Sidebar: Trending Topics & Community Suggestions
   */
  private renderFeedSidebar(): string {
    const trending = trendingEngine.getTrendingTopics();

    return `
      <div class="space-y-5 select-none" data-sidebar-context="feed">
        <!-- TRENDING TOPICS -->
        <div class="p-4 rounded-2xl bg-surface-base/80 border border-white/5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="${TYPOGRAPHY.sectionTitle} text-sm flex items-center gap-1.5">
              ${renderIcon('sparkles', { size: 15, class: 'text-amber-400' })}
              <span>Trending</span>
            </h3>
            <span class="text-[10px] font-mono text-slate-500">Live Network</span>
          </div>
          <div class="space-y-2">
            ${trending.slice(0, 5).map((t, idx) => `
              <div class="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                <div>
                  <div class="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">${t.tag}</div>
                  <div class="text-[11px] text-slate-500">${t.count || 12} pulses · ${t.category}</div>
                </div>
                <span class="text-xs text-slate-500 font-mono">#${idx + 1}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- RELEVANT COMMUNITIES -->
        <div class="p-4 rounded-2xl bg-surface-base/80 border border-white/5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="${TYPOGRAPHY.sectionTitle} text-sm flex items-center gap-1.5">
              ${renderIcon('users', { size: 15, class: 'text-cyan-400' })}
              <span>Sovereign Communities</span>
          <!-- SOVEREIGN COMMUNITIES / CIRCLES -->
          <div class="flex items-center justify-between px-1">
            <h3 class="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Sovereign Communities
            </h3>
            <div class="flex items-center space-x-2">
              <button 
                type="button" 
                data-action="open-explore-communities"
                class="text-[10px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Browse All Communities in Directory"
              >
                Directory
              </button>
              <button 
                type="button" 
                data-action="open-create-circle" 
                class="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                title="Create a new Sovereign Community"
              >
                <span>+ Create</span>
              </button>
            </div>
          </div>

          <div class="space-y-3 text-xs">
            ${(() => {
              const all = sovereignCircleEngine.getAllCircles();
              const myCircles = all.filter(c => sovereignCircleEngine.isUserModerator(c.id, clientStore.keypair.fingerprint));
              const otherCircles = all.filter(c => !myCircles.includes(c));

              const renderCircleItem = (c: import('./sovereign-circle.js').SovereignCircle, isMod: boolean) => `
                <div class="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/5 transition-colors group">
                  <div class="flex items-center gap-2 truncate cursor-pointer flex-1 mr-2" data-action="open-community" data-channel="${c.channelId}">
                    <div class="w-7 h-7 rounded-lg bg-surface-raised flex items-center justify-center font-bold text-xs shrink-0 border border-white/10" style="color: ${c.primaryColor};">
                      ${c.icon || '🏛️'}
                    </div>
                    <div class="truncate">
                      <div class="flex items-center gap-1.5">
                        <span class="font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors truncate">c/${c.name}</span>
                        ${isMod ? '<span class="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shrink-0">MOD</span>' : ''}
                      </div>
                      <div class="text-[10px] text-slate-500 truncate">${c.membersCount} members · ${c.category}</div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    data-action="toggle-join-circle" 
                    data-circle-id="${c.id}" 
                    class="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 ${
                      c.isJoined 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25' 
                        : 'bg-white/5 text-cyan-400 hover:text-cyan-300 hover:bg-white/10'
                    }"
                  >
                    ${c.isJoined ? '✓ Joined' : '+ Join'}
                  </button>
                </div>
              `;

              return `
                ${myCircles.length > 0 ? `
                  <div class="space-y-1.5">
                    <div class="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400/80 px-1">⭐ My Communities</div>
                    ${myCircles.map(c => renderCircleItem(c, true)).join('')}
                  </div>
                ` : ''}

                <div class="space-y-1.5">
                  ${myCircles.length > 0 ? '<div class="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 px-1">Network Circles</div>' : ''}
                  ${otherCircles.slice(0, 5).map(c => renderCircleItem(c, false)).join('')}
                </div>
              `;
            })()}
          </div>

          <!-- PROMINENT CREATE COMMUNITY CTA -->
          <div class="pt-2 border-t border-white/5 space-y-1.5">
            <button 
              type="button" 
              data-action="open-create-circle" 
              class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-cyan-600/20 hover:from-indigo-600/30 hover:to-cyan-600/30 text-indigo-200 border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <span>✨</span>
              <span>Create Sovereign Community</span>
            </button>
            <button
              type="button"
              data-action="open-explore-communities"
              class="w-full py-1.5 px-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white text-[11px] font-mono transition-colors flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>🏛️ View All in Directory (${sovereignCircleEngine.getAllCircles().length})</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Messages Contextual Sidebar: Active Conversation Info & Security
   */
  private renderMessagesSidebar(): string {
    const channel = clientStore.activeChannelId || 'relays-general';

    return `
      <div class="space-y-5 select-none" data-sidebar-context="messages">
        <!-- CONVERSATION SECURITY CARD -->
        <div class="p-4 rounded-2xl bg-surface-base/80 border border-white/5 space-y-3">
          <div class="flex items-center gap-2 text-emerald-400">
            ${renderIcon('shield', { size: 16 })}
            <span class="text-xs font-bold font-sans">End-to-End Encrypted</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Messages are sealed with ML-KEM-768 quantum ratchets. No relay server or third party can decrypt contents.
          </p>
          <div class="pt-2 border-t border-white/5 text-[11px] font-mono text-slate-500 flex justify-between">
            <span>Channel ID</span>
            <span class="text-slate-300 truncate max-w-[120px]">${channel}</span>
          </div>
        </div>

        <!-- VOICE MODULE CONTEXTUAL LAUNCHER (SECTION 84) -->
        <div class="p-4 rounded-2xl bg-surface-base/80 border border-white/5 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              ${renderIcon('volume', { size: 15 })}
              <span>Voice Channel</span>
            </span>
            <span class="text-[10px] font-mono text-emerald-400">P2P SFrame</span>
          </div>
          <p class="text-[11px] text-slate-400">Join real-time spatial voice communication with peer participants.</p>
          <button
            type="button"
            id="btn-sidebar-join-voice"
            data-action="toggle-voice"
            class="w-full py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 text-xs font-semibold transition-all border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
          >
            ${renderIcon('radio', { size: 14 })}
            <span>Open Voice</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Vault Contextual Sidebar: Categories & Storage Overview
   */
  private renderVaultSidebar(): string {
    return `
      <div class="space-y-5 select-none" data-sidebar-context="vault">
        <!-- STORAGE METER -->
        <div class="p-4 rounded-2xl bg-surface-base/80 border border-white/5 space-y-3">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-slate-400">Storage Usage</span>
            <span class="text-cyan-300 font-bold">128 MB / 8.0 GB</span>
          </div>
          <div class="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full" style="width: 2%"></div>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Free Tier Protected</span>
            <span class="text-emerald-400">100% Free</span>
          </div>
        </div>

        <!-- VAULT CATEGORIES -->
        <div class="p-4 rounded-2xl bg-surface-base/80 border border-white/5 space-y-2">
          <h3 class="${TYPOGRAPHY.sectionTitle} text-sm flex items-center gap-1.5 mb-2">
            ${renderIcon('vault', { size: 15, class: 'text-cyan-400' })}
            <span>Categories</span>
          </h3>
          <button type="button" data-action="join-channel" data-channel="vault-releases" class="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between bg-white/5 hover:bg-white/10 text-slate-200 transition-colors cursor-pointer">
            <span class="flex items-center gap-2">${renderIcon('checkCircle', { size: 14, class: 'text-emerald-400' })}<span>Verified Releases</span></span>
            <span class="text-[10px] font-mono text-slate-400">14 files</span>
          </button>
          <button type="button" data-action="join-channel" data-channel="vault-guides" class="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-white/5 text-slate-300 transition-colors cursor-pointer">
            <span class="flex items-center gap-2">${renderIcon('fileText', { size: 14, class: 'text-indigo-400' })}<span>Security Guides</span></span>
            <span class="text-[10px] font-mono text-slate-400">8 docs</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Explore Contextual Sidebar: Network Discovery
   */
  private renderExploreSidebar(): string {
    return `
      <div class="space-y-5 select-none" data-sidebar-context="explore">
        <div class="p-4 rounded-2xl bg-surface-base/80 border border-white/5 space-y-3">
          <h3 class="${TYPOGRAPHY.sectionTitle} text-sm flex items-center gap-1.5">
            ${renderIcon('network', { size: 15, class: 'text-cyan-400' })}
            <span>Network Health</span>
          </h3>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between py-1 border-b border-white/5">
              <span class="text-slate-400">Mesh Topology</span>
              <span class="text-emerald-400 font-mono font-bold">Stable (P2P)</span>
            </div>
            <div class="flex justify-between py-1 border-b border-white/5">
              <span class="text-slate-400">Active Relays</span>
              <span class="text-slate-200 font-mono">14 nodes</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-400">Average RTT</span>
              <span class="text-cyan-300 font-mono">18ms</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Profile Contextual Sidebar: Identity Summary & Trust Connections
   */
  private renderProfileSidebar(): string {
    return `
      <div class="space-y-5 select-none" data-sidebar-context="profile">
        <div class="p-4 rounded-2xl bg-surface-base/80 border border-white/5 space-y-3">
          <h3 class="${TYPOGRAPHY.sectionTitle} text-sm flex items-center gap-1.5">
            ${renderIcon('shield', { size: 15, class: 'text-emerald-400' })}
            <span>Sovereign Security</span>
          </h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Your cryptographic keys never leave your device. All identity updates are signed locally.
          </p>
          <div class="pt-2 border-t border-white/5">
            <button
              type="button"
              data-action="open-settings" data-subtab="security"
              class="w-full py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 text-xs font-semibold transition-all border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
            >
              ${renderIcon('settings', { size: 14 })}
              <span>Manage Security</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

export const contextualSidebar = new ContextualSidebar();
