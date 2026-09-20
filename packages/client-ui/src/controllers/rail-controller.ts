import { clientStore } from '../client-state.js';
import { renderIcon, type IconName } from '../ui/icons.js';

export interface RailRenderContext { isMoreExpanded: boolean; }

const destinations: Array<[string, string, string, IconName]> = [
  ['feed', 'pulse', 'Home', 'feed'], ['explore', 'explore', 'Explore', 'explore'],
  ['communities', 'communities', 'Communities', 'users'], ['messages', 'relays', 'Messages', 'messages'],
  ['vault', 'vault', 'Vault', 'vault'], ['profile', 'profile', 'Profile', 'profile'],
];
interface ToolItem {
  id: string;
  feature: string;
  label: string;
  icon: IconName;
}

interface ToolCategory {
  name: string;
  icon: IconName;
  tools: ToolItem[];
}

const toolCategories: ToolCategory[] = [
  {
    name: 'Identity & Federation',
    icon: 'key',
    tools: [
      { id: 'btn-open-portable-trust-menu', feature: 'portable-trust', label: 'Portable ZK Trust', icon: 'key' },
      { id: 'btn-open-wot-graph', feature: 'wot-graph', label: 'Trust Graph', icon: 'network' },
      { id: 'rail-wallet', feature: 'wallet', label: 'Wallet & connected networks', icon: 'wallet' },
    ],
  },
  {
    name: 'Governance',
    icon: 'vote',
    tools: [
      { id: 'nav-btn-dao', feature: 'governance', label: 'DAO Governance', icon: 'vote' },
    ],
  },
  {
    name: 'Security',
    icon: 'shield',
    tools: [
      { id: 'btn-open-cve-monitor', feature: 'cve', label: 'CVE Monitor (Curated DB)', icon: 'shield' },
      { id: 'btn-open-binary-hygiene-menu', feature: 'binary-hygiene', label: 'Binary Hygiene (Client Scanner)', icon: 'shield' },
      { id: 'btn-open-steganography', feature: 'steganography', label: 'Pixel Canvas Steganography', icon: 'image' },
    ],
  },
  {
    name: 'Network & Edge',
    icon: 'network',
    tools: [
      { id: 'btn-open-network-observatory', feature: 'observatory', label: 'Network Observatory', icon: 'activity' },
    ],
  },
  {
    name: 'Labs & Simulators',
    icon: 'cpu',
    tools: [
      { id: 'btn-open-mesh-matrix', feature: 'mesh-matrix', label: 'Mesh Matrix Simulator (Lab)', icon: 'network' },
      { id: 'btn-open-gossip-viz', feature: 'gossip', label: 'Gossip Protocol Simulator (Lab)', icon: 'radio' },
    ],
  },
  {
    name: 'Developer Tools',
    icon: 'terminal',
    tools: [
      { id: 'btn-open-microsaas-docs-menu', feature: 'microsaas-docs', label: 'Micro-SaaS & Dev APIs', icon: 'terminal' },
    ],
  },
  {
    name: 'Import & Export',
    icon: 'download',
    tools: [
      { id: 'btn-open-rss-panel', feature: 'rss', label: 'RSS Importer', icon: 'rss' },
      { id: 'btn-open-backup-export', feature: 'export-backup', label: 'Export & Backup', icon: 'download' },
    ],
  },
];

export class RailController {
  public renderLeftRailContent({ isMoreExpanded }: RailRenderContext): string {
    const simple = clientStore.isSimpleMode();
    const channel = clientStore.activeChannelId;
    const isSettings = channel === 'settings';
    const active = isSettings ? 'settings'
      : channel.startsWith('profile') ? 'profile' : channel.startsWith('vault') ? 'vault'
      : /^(dm-|relays?-)/.test(channel) ? 'messages' : channel === 'explore' ? 'explore'
      : channel === 'communities' || channel.startsWith('c/') ? 'communities' : 'feed';
    return `<nav class="space-y-1" aria-label="Primary navigation">
      ${destinations.map(([id, mode, label, icon]) => `<button type="button" data-nav-mode="${mode}" data-testid="nav-item-${id}"
        aria-current="false" class="btn-nav-mode w-full text-left flex items-center gap-3" title="${label}">
        ${renderIcon(icon, { size: 20 })}<span>${label}</span></button>`).join('')}
      <button type="button" id="btn-rail-more" data-testid="nav-item-more" data-action="toggle-more-rail" aria-expanded="${isMoreExpanded}" aria-controls="rail-expanded-tools" class="btn-nav-more w-full flex items-center gap-3">
        ${renderIcon('more', { size: 20 })}<span>${isMoreExpanded ? 'Less' : 'More'}</span>
      </button>
    </nav>
    <div id="rail-expanded-tools" class="${isMoreExpanded ? 'block' : 'hidden'}">
      <div class="rail-tools" aria-label="Personal items">
        <button type="button" id="rail-btn-notifications" data-action="toggle-notifs">${renderIcon('bell', { size: 18 })}Notifications</button>
        <button type="button" id="rail-btn-bookmarks" data-action="toggle-bookmarks">${renderIcon('bookmark', { size: 18 })}Saved to Vault</button>
        <button type="button" data-action="open-settings" data-subtab="account" class="${isSettings ? 'is-active text-indigo-400 font-bold' : ''}">${renderIcon('settings', { size: 18 })}Settings</button>
        <button type="button" id="rail-btn-theme" data-action="open-theme">${renderIcon('sliders', { size: 18 })}Display & Themes</button>
        <button type="button" data-action="open-settings" data-subtab="privacy">${renderIcon('shield', { size: 18 })}Privacy & Safety</button>
        <button type="button" data-action="open-legal-modal" data-legal-tab="about">${renderIcon('info', { size: 18 })}Help & About</button>
      </div>
      <div class="rail-tools rail-mode" aria-label="Mode switcher">
        <button type="button" id="btn-toggle-advanced-sidebar" data-action="toggle-ui-mode" aria-pressed="${!simple}">${renderIcon('sliders', { size: 18 })}${simple ? 'Enable Advanced Mode' : 'Use simple mode'}</button>
      </div>
    </div>
    ${simple ? '' : `<section class="rail-tools" aria-label="Advanced tools">
      <h2 class="rail-section-label">Advanced tools</h2>
      <div class="space-y-1 mt-1">
        ${toolCategories.map(cat => `
          <details class="rail-tool-category group rounded-xl bg-surface-raised/40 border border-white/5 overflow-hidden transition-all text-xs" open>
            <summary class="flex items-center justify-between px-3 py-2 text-slate-300 hover:text-white hover:bg-surface-raised cursor-pointer select-none transition-colors font-medium list-none">
              <span class="flex items-center gap-2">
                ${renderIcon(cat.icon, { size: 16, className: 'text-[var(--color-accent,#e59b3c)]' })}
                <span>${cat.name}</span>
              </span>
              <span class="text-slate-500 group-open:rotate-90 transition-transform duration-150">
                ${renderIcon('chevronRight', { size: 14 })}
              </span>
            </summary>
            <div class="py-1 px-1.5 space-y-0.5 bg-black/20 border-t border-white/5">
              ${cat.tools.map(tool => `
                <button type="button" id="${tool.id}" data-action="open-feature" data-feature="${tool.feature}" class="w-full text-left flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-xs">
                  ${renderIcon(tool.icon, { size: 15 })}
                  <span class="truncate">${tool.label}</span>
                </button>
              `).join('')}
            </div>
          </details>
        `).join('')}
      </div>
      <button type="button" id="btn-return-simple-sidebar" class="mt-2">${renderIcon('chevronLeft', { size: 18 })}Simple View</button>
    </section>`}`;
  }
}
export const railController = new RailController();

