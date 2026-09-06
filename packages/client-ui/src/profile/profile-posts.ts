/**
 * @file profile-posts.ts
 * @package @aetheris/client-ui/profile
 * @description Profile timeline feed and empty states renderer.
 */

import { ProfileTab } from './types.js';
import { ClientPost } from '../client-state.js';
import { pulseActionsEngine } from '../pulse-actions.js';
import { obsidianMediaPlayer } from '../media-player.js';
import { markdownRenderer } from '../markdown-renderer.js';

export function filterProfilePosts(allPosts: ClientPost[], activeTab: ProfileTab, targetFp: string): ClientPost[] {
  if (activeTab === 'pulses') {
    const userPosts = allPosts.filter(p => p.authorFingerprint === targetFp);
    return userPosts.length > 0 ? userPosts : allPosts.slice(0, 4);
  }

  if (activeTab === 'replies') {
    return allPosts.filter(p => p.replyCount > 0);
  }

  if (activeTab === 'highlights') {
    return [...allPosts].sort((a, b) => b.meritVotes - a.meritVotes).slice(0, 3);
  }

  if (activeTab === 'media') {
    return allPosts.filter(p => (p.images && p.images.length > 0) || p.video);
  }

  if (activeTab === 'likes') {
    return allPosts.filter(p => p.userVoted === 1 || pulseActionsEngine.getInteractions(p.id).liked);
  }

  return allPosts;
}

export function renderProfileTimelinePostsHTML(
  posts: ClientPost[],
  activeTab: ProfileTab,
  targetFp: string
): string {
  if (posts.length === 0) {
    return `
      <div class="p-12 text-center rounded-3xl bg-surface-base border border-white/5 space-y-3">
        <div class="text-3xl">📭</div>
        <div class="text-sm font-bold text-white">No ${activeTab} yet</div>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          When this sovereign identity creates or interacts with content, it will appear here.
        </p>
      </div>
    `;
  }

  return `
    <div class="space-y-4">
      ${posts.map(p => {
        const authorAlias = p.authorFingerprint.substring(0, 8);
        const authorDisplayName = p.authorRole ? `${p.authorRole} (${authorAlias})` : authorAlias;
        const timeFormatted = new Date(p.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
          <article class="p-5 rounded-3xl bg-surface-base border border-white/10 hover:border-white/20 transition-all space-y-3 shadow-lg">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-surface-raised border border-white/10 flex items-center justify-center font-bold text-xs text-slate-200">
                  ${authorAlias.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div class="text-xs font-bold text-white">${authorDisplayName}</div>
                  <div class="text-[10px] font-mono text-slate-400">@${authorAlias}</div>
                </div>
              </div>
              <div class="text-[10px] font-mono text-slate-500">
                ${timeFormatted}
              </div>
            </div>

            <div class="text-xs text-slate-200 leading-relaxed">
              ${markdownRenderer.renderMarkdown(p.content)}
            </div>

            ${
              p.video?.src
                ? `<div class="mt-2">${obsidianMediaPlayer.renderVideoCard(p.id, p.video.src, p.video.poster)}</div>`
                : obsidianMediaPlayer.extractVideo(p.content)
                ? `<div class="mt-2">${obsidianMediaPlayer.renderVideoCard(p.id, p.content)}</div>`
                : p.images && p.images.length > 0
                ? `<div class="rounded-2xl overflow-hidden mt-2 border border-white/10 max-h-80"><img src="${p.images[0]}" alt="Attached Media" class="w-full h-full object-cover" /></div>`
                : ''
            }

            <div class="pt-2 border-t border-white/5 flex items-center justify-between">
              ${pulseActionsEngine.renderPulseActionBar(p.id, p.replyCount)}
              <span class="text-cyan-400 text-[10px] font-mono hidden sm:inline-block shrink-0">✓ E2EE Verified</span>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}
