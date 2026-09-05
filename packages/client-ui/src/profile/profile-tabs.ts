/**
 * @file profile-tabs.ts
 * @package @aetheris/client-ui/profile
 * @description Sovereign Profile Timeline & Settings tab bar component.
 */

import { ProfileTab } from './types.js';
import { renderIcon } from '../ui/icons.js';

export interface ProfileTabItem {
  id: ProfileTab;
  label: string;
  iconName: any;
}

export const PROFILE_TABS: ProfileTabItem[] = [
  { id: 'pulses', label: 'Posts', iconName: 'feed' },
  { id: 'replies', label: 'Replies', iconName: 'messages' },
  { id: 'highlights', label: 'Highlights', iconName: 'sparkles' },
  { id: 'media', label: 'Media', iconName: 'paperclip' },
  { id: 'likes', label: 'Likes', iconName: 'heart' },
  { id: 'settings', label: 'Settings', iconName: 'settings' },
];

export function renderProfileTabsHTML(activeTab: ProfileTab, isOwnProfile: boolean): string {
  // Show settings tab prominently if own profile
  const tabsToShow = isOwnProfile ? PROFILE_TABS : PROFILE_TABS.filter(t => t.id !== 'settings');

  return `
    <div class="flex items-center space-x-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
      ${tabsToShow.map(tab => {
        const isActive = activeTab === tab.id;
        return `
          <button
            type="button"
            id="btn-profile-tab-${tab.id}"
            data-profile-tab="${tab.id}" data-action="call-global" data-raw-click="if(window.profileView){ window.profileView.setActiveTab('${tab.id}'); if(window.clientStore) window.clientStore.notify(); }"
            class="px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-2 cursor-pointer border ${
              isActive
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-sm shadow-cyan-500/10'
                : 'bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-slate-200 border-white/5'
            }"
          >
            <span>${renderIcon(tab.iconName, { size: 14 })}</span>
            <span>${tab.label}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}
