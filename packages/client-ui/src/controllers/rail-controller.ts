/**
 * @file controllers/rail-controller.ts
 * @package @aetheris/client-ui
 * @description Sovereign Left Command Rail Controller.
 * Decouples Left Rail rendering, dock navigation, and More/Collapse inline tools
 * while strictly preserving all contract selectors and Priority 0 CSS rules.
 */

import { clientStore } from '../client-state.js';
import { themeEngine } from '../themes.js';
import { voiceVisualizer } from '../webrtc-voice.js';
import { screenShareEngine } from '../screenshare.js';
import { renderIcon } from '../ui/icons.js';

export interface RailRenderContext {
  isMoreExpanded: boolean;
}

export class RailController {
  /**
   * Renders the complete Left Rail content (Dock items, More expanded panel, Advanced panel)
   */
  public renderLeftRailContent(ctx: RailRenderContext): string {
    const isMoreExpanded = ctx.isMoreExpanded;
    const isSimple = clientStore.isSimpleMode();
    const activeChannel = clientStore.activeChannelId;

    return `
      <!-- PRIMARY NAVIGATION DOCK (EXACT SPEC: 7 ITEMS) -->
      <div class="space-y-1" aria-label="Primary navigation">
        <!-- 1. HOME -->
        <button type="button" data-nav-mode="pulse" data-testid="nav-item-feed" class="btn-nav-mode w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${activeChannel.startsWith('pulse-') ? 'is-active nav-item-active shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}" title="Home">
          <span class="shrink-0 ${activeChannel.startsWith('pulse-') ? 'text-cyan-400' : 'text-slate-400'}">${renderIcon('feed', { size: 18 })}</span>
          <div class="flex flex-col text-left flex-1 min-w-0">
            <span class="font-bold leading-tight">Home</span>
            <span class="text-[10px] text-slate-400 font-normal">Your feed</span>
          </div>
          ${activeChannel.startsWith('pulse-') ? '<span class="w-2 h-2 rounded-full nav-indicator-active shrink-0"></span>' : ''}
        </button>

        <!-- 2. EXPLORE -->
        <button type="button" data-nav-mode="explore" data-testid="nav-item-explore" class="btn-nav-mode w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${activeChannel === 'explore' ? 'is-active nav-item-active shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}" title="Explore">
          <span class="shrink-0 ${activeChannel === 'explore' ? 'text-indigo-400' : 'text-slate-400'}">${renderIcon('explore', { size: 18 })}</span>
          <div class="flex flex-col text-left flex-1 min-w-0">
            <span class="font-bold leading-tight">Explore</span>
            <span class="text-[10px] text-slate-400 font-normal">Discover what's new</span>
          </div>
          ${activeChannel === 'explore' ? '<span class="w-2 h-2 rounded-full nav-indicator-active shrink-0"></span>' : ''}
        </button>

        <!-- 3. COMMUNITIES -->
        <button type="button" data-nav-mode="communities" data-testid="nav-item-communities" class="btn-nav-mode w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${activeChannel === 'communities' || activeChannel.startsWith('c/') ? 'is-active nav-item-active shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}" title="Communities">
          <span class="shrink-0 ${activeChannel === 'communities' || activeChannel.startsWith('c/') ? 'text-indigo-400' : 'text-slate-400'}">${renderIcon('users', { size: 18 })}</span>
          <div class="flex flex-col text-left flex-1 min-w-0">
            <span class="font-bold leading-tight">Communities</span>
            <span class="text-[10px] text-slate-400 font-normal">Find your people</span>
          </div>
          ${activeChannel === 'communities' || activeChannel.startsWith('c/') ? '<span class="w-2 h-2 rounded-full nav-indicator-active shrink-0"></span>' : ''}
        </button>

        <!-- 4. MESSAGES -->
        <button type="button" data-nav-mode="relays" data-testid="nav-item-messages" class="btn-nav-mode w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${activeChannel.startsWith('relays-') || activeChannel.startsWith('relay-') || activeChannel.startsWith('dm-') ? 'is-active nav-item-active shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}" title="Messages">
          <span class="shrink-0 ${activeChannel.startsWith('relays-') || activeChannel.startsWith('relay-') || activeChannel.startsWith('dm-') ? 'text-emerald-400' : 'text-slate-400'}">${renderIcon('messages', { size: 18 })}</span>
          <div class="flex flex-col text-left flex-1 min-w-0">
            <span class="font-bold leading-tight">Messages</span>
            <span class="text-[10px] text-slate-400 font-normal">Private & community chat</span>
          </div>
          ${activeChannel.startsWith('relays-') || activeChannel.startsWith('relay-') || activeChannel.startsWith('dm-') ? '<span class="w-2 h-2 rounded-full nav-indicator-active shrink-0"></span>' : ''}
        </button>

        <!-- 5. VAULT (CONSUMER DESTINATION) -->
        <button type="button" data-nav-mode="vault" data-testid="nav-item-vault" class="btn-nav-mode w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${activeChannel.startsWith('vault') ? 'is-active nav-item-active shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}" title="Vault — Private files & saved knowledge">
          <span class="shrink-0 ${activeChannel.startsWith('vault') ? 'text-cyan-400' : 'text-slate-400'}">${renderIcon('vault', { size: 18 })}</span>
          <div class="flex flex-col text-left flex-1 min-w-0">
            <span class="font-bold leading-tight">Vault</span>
            <span class="text-[10px] text-slate-400 font-normal">Private files & saved knowledge</span>
          </div>
          ${activeChannel.startsWith('vault') ? '<span class="w-2 h-2 rounded-full nav-indicator-active shrink-0"></span>' : ''}
        </button>

        <!-- 6. PROFILE -->
        <button type="button" data-nav-mode="profile" data-testid="nav-item-profile" class="btn-nav-mode w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${activeChannel.startsWith('profile') ? 'is-active nav-item-active shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}" title="Your profile & sovereign identity">
          <span class="shrink-0 ${activeChannel.startsWith('profile') ? 'text-purple-400' : 'text-slate-400'}">${renderIcon('profile', { size: 18 })}</span>
          <div class="flex flex-col text-left flex-1 min-w-0">
            <span class="font-bold leading-tight">Profile</span>
            <span class="text-[10px] text-slate-400 font-normal">Your profile</span>
          </div>
          ${activeChannel.startsWith('profile') ? '<span class="w-2 h-2 rounded-full nav-indicator-active shrink-0"></span>' : ''}
        </button>

        <!-- 7. MORE / COLLAPSE (EXPANDABLE INLINE) -->
        <button type="button" id="btn-rail-more" data-testid="nav-item-more" data-action="toggle-more-rail" aria-expanded="${isMoreExpanded}" aria-controls="rail-expanded-tools" class="btn-nav-more w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${isMoreExpanded ? 'is-active nav-item-active shadow-sm text-white' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}" title="${isMoreExpanded ? 'Collapse secondary tools' : 'More tools, settings & modes'}">
          <span class="shrink-0 ${isMoreExpanded ? 'text-cyan-400' : 'text-slate-400'}">${isMoreExpanded ? renderIcon('chevronUp', { size: 18 }) : renderIcon('chevronDown', { size: 18 })}</span>
          <div class="flex flex-col text-left flex-1 min-w-0">
            <span class="font-bold leading-tight">${isMoreExpanded ? 'Collapse ▲' : 'More ▼'}</span>
            <span class="text-[10px] text-slate-400 font-normal">${isMoreExpanded ? 'Hide tools' : 'Tools & settings'}</span>
          </div>
        </button>
      </div>

      <!-- INLINE EXPANDABLE MORE SECTION (PERSONAL, POWER TOOLS, MODE) -->
      <div id="rail-expanded-tools" class="${isMoreExpanded ? 'block mt-2 pt-2 border-t border-white/10' : 'hidden'} space-y-4">
        
        <!-- SECTION 1: PERSONAL -->
        <div class="space-y-1" aria-label="Personal items">
          <div class="text-[9px] uppercase font-bold text-slate-400 tracking-wider px-2">
            <span>Personal</span>
          </div>

          <button type="button" id="rail-btn-bookmarks" data-action="toggle-bookmarks" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-indigo-400 shrink-0">${renderIcon('bookmark', { size: 16 })}</span>
            <span class="flex-1 truncate">Saved Bookmarks</span>
          </button>

          <button type="button" data-action="open-settings" data-subtab="account" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-slate-400 shrink-0">${renderIcon('settings', { size: 16 })}</span>
            <span class="flex-1 truncate">Settings</span>
          </button>

          <button type="button" id="rail-btn-theme" data-action="open-theme" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-purple-400 shrink-0">${renderIcon('sliders', { size: 16 })}</span>
            <span class="flex-1 truncate">Display & Themes</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 uppercase">${themeEngine.currentThemeId}</span>
          </button>

          <button type="button" data-action="open-settings" data-subtab="privacy" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-emerald-400 shrink-0">${renderIcon('shield', { size: 16 })}</span>
            <span class="flex-1 truncate">Privacy & Safety</span>
          </button>

          <button type="button" data-action="open-legal-modal" data-legal-tab="about" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-cyan-400 shrink-0 text-sm">❓</span>
            <span class="flex-1 truncate">Help & About</span>
          </button>
        </div>

        <!-- SECTION 2: POWER TOOLS -->
        <div class="space-y-1" aria-label="Power tools">
          <div class="text-[9px] uppercase font-bold text-cyan-400 tracking-wider px-2">
            <span>Power Tools</span>
          </div>

          <button type="button" id="btn-open-mesh-matrix" data-action="open-feature" data-feature="mesh-matrix" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-sm shrink-0">🕸️</span>
            <span class="flex-1 truncate">Mesh Matrix</span>
          </button>

          <button type="button" id="nav-btn-dao" data-action="open-feature" data-feature="governance" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-amber-400 shrink-0">${renderIcon('vote', { size: 16 })}</span>
            <span class="flex-1 truncate">DAO Governance</span>
          </button>

          <button type="button" id="btn-open-rss-panel" data-action="open-feature" data-feature="rss" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-orange-400 shrink-0">${renderIcon('rss', { size: 16 })}</span>
            <span class="flex-1 truncate">RSS Importer</span>
          </button>

          <button type="button" id="btn-open-cve-monitor" data-action="open-feature" data-feature="cve" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-rose-400 shrink-0">${renderIcon('shield', { size: 16 })}</span>
            <span class="flex-1 truncate">CVE Monitor</span>
          </button>

          <button type="button" id="btn-open-network-observatory" data-action="open-feature" data-feature="observatory" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-cyan-400 shrink-0">${renderIcon('activity', { size: 16 })}</span>
            <span class="flex-1 truncate">Network Observatory</span>
          </button>

          <button type="button" id="btn-open-wot-graph" data-action="open-feature" data-feature="wot-graph" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-indigo-400 shrink-0">${renderIcon('network', { size: 16 })}</span>
            <span class="flex-1 truncate">Trust Graph</span>
          </button>

          <button type="button" id="btn-open-gossip-viz" data-action="open-feature" data-feature="gossip" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-teal-400 shrink-0">${renderIcon('radio', { size: 16 })}</span>
            <span class="flex-1 truncate">Gossip Visualizer</span>
          </button>

          <button type="button" id="btn-open-backup-export" data-action="open-feature" data-feature="export-backup" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer">
            <span class="text-emerald-400 shrink-0">${renderIcon('download', { size: 16 })}</span>
            <span class="flex-1 truncate">Export & Backup</span>
          </button>

          <button type="button" id="btn-open-steganography" data-action="open-feature" data-feature="steganography" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-cyan-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer" title="Pixel Canvas Steganography">
            <span class="shrink-0">${renderIcon('image', { size: 16 })}</span>
            <span class="flex-1 truncate">Pixel Canvas Steganography</span>
          </button>

          <button type="button" id="btn-open-binary-hygiene-menu" data-action="open-feature" data-feature="binary-hygiene" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-cyan-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer" title="Binary Hygiene (Entropy & UPX Detection)">
            <span class="text-sm shrink-0">🛡️</span>
            <span class="flex-1 truncate">Binary Hygiene Portal</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">FREE</span>
          </button>

          <button type="button" id="btn-open-portable-trust-menu" data-action="open-feature" data-feature="portable-trust" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-purple-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer" title="Portable ZK Trust Score (BN254 Range Proofs)">
            <span class="text-sm shrink-0">💎</span>
            <span class="flex-1 truncate">Portable ZK Trust</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/30">ZK</span>
          </button>

          <button type="button" id="btn-open-microsaas-docs-menu" data-action="open-feature" data-feature="microsaas-docs" class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-emerald-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer" title="Micro-SaaS & Developer APIs">
            <span class="text-sm shrink-0">⚡</span>
            <span class="flex-1 truncate">Micro-SaaS & Dev APIs</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">EDGE</span>
          </button>
        </div>

        <!-- SECTION 3: MODE -->
        <div class="space-y-1 pt-1" aria-label="Mode switcher">
          <div class="p-2.5 rounded-2xl bg-surface-raised/60 border border-white/5 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-xs">⚡</span>
              <div class="flex flex-col">
                <span class="text-[11px] font-bold text-slate-200">Advanced Mode</span>
                <span class="text-[9px] text-slate-400">Security & Dev tools</span>
              </div>
            </div>
            <button type="button" id="btn-toggle-advanced-sidebar" data-action="toggle-ui-mode" class="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer">
              Enable
            </button>
          </div>
        </div>

      </div>

      ${isSimple ? `
        <!-- SIMPLE MODE: DISCREET ADVANCED MODE ENTRY -->
        <div class="pt-2 border-t border-white/5 space-y-2">
          <div class="p-2.5 rounded-2xl bg-surface-raised/40 border border-white/5 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-xs">⚡</span>
              <div class="flex flex-col">
                <span class="text-[11px] font-bold text-slate-300">Advanced Mode</span>
                <span class="text-[9px] text-slate-500">Security & Dev tools</span>
              </div>
            </div>
            <button type="button" id="btn-toggle-advanced-sidebar" class="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-surface-overlay hover:bg-white/10 text-indigo-300 border border-indigo-500/20 transition-all cursor-pointer">
              Enable
            </button>
          </div>
        </div>
      ` : `
        <!-- ADVANCED TOOLS PANEL (ACTIVE) -->
        <div class="pt-2 border-t border-white/5 space-y-1" aria-label="Advanced tools">
          <div class="text-[10px] uppercase font-bold text-indigo-400 tracking-wider mb-2 px-2 flex items-center justify-between">
             <span class="flex items-center space-x-1"><span>⚡</span> <span>ADVANCED MODE</span></span>
             <button type="button" id="btn-return-simple-sidebar" class="text-[9px] font-medium px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-900 cursor-pointer">
               Simple View
             </button>
          </div>

          <button type="button" id="rail-btn-bookmarks" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
            ${renderIcon('bookmark', { size: 18 })}
            <span class="flex-1">Saved Bookmarks</span>
          </button>

          <button type="button" id="rail-btn-theme" data-action="open-theme" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
            ${renderIcon('sliders', { size: 18 })}
            <span class="flex-1">Display & Themes</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">${themeEngine.currentThemeId}</span>
          </button>

          <button type="button" id="btn-open-mesh-matrix" data-action="open-feature" data-feature="mesh-matrix" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer"><span class="text-base">🕸️</span><span class="flex-1">Mesh Matrix</span></button>

          <!-- DAO GOVERNANCE -->
          <button type="button" id="nav-btn-dao" data-action="open-feature" data-feature="governance" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
            ${renderIcon('vote', { size: 18 })}
            <span class="flex-1">DAO Governance</span>
          </button>

          <!-- RSS IMPORTER -->
          <button type="button" id="btn-open-rss-panel" data-action="open-feature" data-feature="rss" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
            ${renderIcon('rss', { size: 18 })}
            <span class="flex-1">RSS Importer</span>
          </button>

          <!-- CVE SECURITY MONITOR -->
          <button type="button" id="btn-open-cve-monitor" data-action="open-feature" data-feature="cve" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
            ${renderIcon('shield', { size: 18 })}
            <span class="flex-1">CVE Monitor</span>
          </button>

          <!-- NETWORK OBSERVATORY -->
          <button type="button" id="btn-open-network-observatory" data-action="open-feature" data-feature="observatory" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
            ${renderIcon('activity', { size: 18 })}
            <span class="flex-1">Network Observatory</span>
          </button>

          <!-- WOT GRAPH -->
          <button type="button" id="btn-open-wot-graph" data-action="open-feature" data-feature="wot-graph" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
            ${renderIcon('network', { size: 18 })}
            <span class="flex-1">Trust Graph</span>
          </button>

          <!-- GOSSIP VISUALIZER -->
          <button type="button" id="btn-open-gossip-viz" data-action="open-feature" data-feature="gossip" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
            ${renderIcon('radio', { size: 18 })}
            <span class="flex-1">Gossip Visualizer</span>
          </button>

          <!-- EXPORT BACKUP -->
          <button type="button" id="btn-open-backup-export" data-action="open-feature" data-feature="export-backup" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
            ${renderIcon('download', { size: 18 })}
            <span class="flex-1">Export & Backup</span>
          </button>

          <!-- PIXEL CANVAS STEGANOGRAPHY -->
          <button type="button" id="btn-open-steganography" data-action="open-feature" data-feature="steganography" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-cyan-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer" title="Pixel Canvas Steganography">
            ${renderIcon('image', { size: 18 })}
            <span class="flex-1">Pixel Canvas Steganography</span>
          </button>

          <!-- BINARY HYGIENE PORTAL -->
          <button type="button" id="btn-open-binary-hygiene-menu" data-action="open-feature" data-feature="binary-hygiene" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-cyan-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer" title="Binary Hygiene (Entropy & UPX Detection)">
            <span class="text-base">🛡️</span>
            <span class="flex-1">Binary Hygiene Portal</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">FREE</span>
          </button>

          <!-- PORTABLE ZK TRUST SCORE -->
          <button type="button" id="btn-open-portable-trust-menu" data-action="open-feature" data-feature="portable-trust" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-purple-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer" title="Portable ZK Trust Score (BN254 Range Proofs)">
            <span class="text-base">💎</span>
            <span class="flex-1">Portable ZK Trust Score</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/30">ZK</span>
          </button>

          <!-- MICRO-SAAS & DEV APIS -->
          <button type="button" id="btn-open-microsaas-docs-menu" data-action="open-feature" data-feature="microsaas-docs" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-emerald-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-2.5 cursor-pointer" title="Micro-SaaS & Developer APIs">
            <span class="text-base">⚡</span>
            <span class="flex-1">Micro-SaaS & Dev APIs</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">EDGE</span>
          </button>
        </div>

        <!-- ACOUSTIC VOICE LOUNGE -->
        <div class="p-3 rounded-2xl bg-surface-raised/90 border border-white/5 space-y-2.5 shadow-sm">
          <div class="flex items-center justify-between text-xs font-bold text-indigo-300">
            <span class="flex items-center space-x-1.5">
              <span class="text-sm">🔊</span>
              <span>Acoustic Lounge</span>
            </span>
          </div>
          
          <canvas id="voice-oscilloscope" width="200" height="20" class="w-full bg-surface-base rounded-xl border border-white/5"></canvas>

          <div class="flex items-center space-x-1.5">
            <button type="button" id="btn-toggle-voice" class="flex-1 py-1.5 text-[10px] font-semibold rounded-xl cursor-pointer ${voiceVisualizer.isConnected ? 'bg-rose-950 text-rose-300 border border-rose-500/30' : 'bg-surface-overlay text-slate-200 hover:text-white border border-white/5'}">
              ${voiceVisualizer.isConnected ? 'Disconnect' : 'Join Voice'}
            </button>
            <button type="button" id="btn-toggle-ghost" title="Private mode" class="py-1.5 px-2.5 text-[10px] rounded-xl border cursor-pointer ${voiceVisualizer.isGhostSpaceActive ? 'bg-indigo-900 text-indigo-200 border-indigo-500/50' : 'bg-surface-overlay text-slate-400 border-white/5'}">
              👻 Ghost
            </button>
          </div>

          <button type="button" id="btn-toggle-screen" class="w-full py-1.5 text-[10px] font-medium rounded-xl border ${screenShareEngine.isStreaming ? 'bg-rose-950 text-rose-300 border-rose-500/40' : 'bg-surface-overlay text-slate-200 hover:text-white border-white/5'} transition-all flex items-center justify-center space-x-1 cursor-pointer">
            <span>📺</span>
            <span>${screenShareEngine.isStreaming ? 'Stop Streaming' : 'Screen Share (Ultrawide)'}</span>
          </button>
        </div>

        <!-- AUDIO NOISE GATE & DSP EQUALIZER -->
        <div class="p-2.5 rounded-2xl bg-surface-raised/50 border border-white/5 flex items-center space-x-1.5">
          <span id="dsp-gate-indicator" class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <button type="button" id="btn-toggle-dsp" class="flex-1 py-1 text-[10px] font-medium rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/5 transition-all flex items-center justify-center space-x-1.5 cursor-pointer">
            <span>🎙️ Audio Noise Filter</span>
          </button>
          <button type="button" id="btn-open-dsp-modal" class="p-1 rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/5 cursor-pointer" title="5-Band DSP Equalizer">
            🎛️
          </button>
        </div>
      `}
    `;
  }
}

export const railController = new RailController();
