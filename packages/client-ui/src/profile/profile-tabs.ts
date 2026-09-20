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
  { id: 'media', label: 'Media', iconName: 'paperclip' },
  { id: 'likes', label: 'Likes', iconName: 'heart' },
  { id: 'communities', label: 'Communities', iconName: 'shield' },
];

export function renderProfileTabsHTML(activeTab: ProfileTab, _isOwnProfile?: boolean): string {
  const tabsToShow = PROFILE_TABS;

  return `
    <div class="flex items-center space-x-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none no-scrollbar">
      ${tabsToShow.map(tab => {
        const isActive = activeTab === tab.id;
        return `
          <button
            type="button"
            id="btn-profile-tab-${tab.id}"
            data-action="set-profile-tab"
            data-tab="${tab.id}"
            data-profile-tab="${tab.id}"
            class="btn-profile-tab px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-2 cursor-pointer border ${
              isActive
                ? 'bg-[var(--color-accent,#e59b3c)]/15 text-[var(--color-accent,#e59b3c)] border-[var(--color-accent,#e59b3c)]/40 font-bold shadow-xs'
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
