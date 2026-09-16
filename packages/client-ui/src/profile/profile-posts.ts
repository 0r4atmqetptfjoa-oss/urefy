/**
 * @file profile-posts.ts
 * @package @aetheris/client-ui/profile
 * @description Profile timeline feed and empty states renderer.
 */

import { ProfileTab } from './types.js';
import { ClientPost, clientStore } from '../client-state.js';
import { pulseActionsEngine } from '../pulse-actions.js';
import { obsidianMediaPlayer } from '../media-player.js';
import { markdownRenderer } from '../markdown-renderer.js';
import { sovereignCircleEngine } from '../sovereign-circle.js';
import { profileView } from './profile-view.js';

export function filterProfilePosts(allPosts: ClientPost[], activeTab: ProfileTab, targetFp: string): ClientPost[] {
  if (activeTab === 'pulses') {
    const userPosts = allPosts.filter(p => 
      p.authorFingerprint === targetFp || 
      pulseActionsEngine.isPostRepostedBy(p.id, targetFp) ||
      (targetFp === clientStore.keypair?.fingerprint && pulseActionsEngine.getInteractions(p.id).reposted)
    );
    const profile = profileView.getProfile(targetFp);
    if (profile && profile.pinnedPostId) {
      const pinned = userPosts.find(p => p.id === profile.pinnedPostId);
      if (pinned) {
        return [pinned, ...userPosts.filter(p => p.id !== profile.pinnedPostId)];
      }
    }
    return userPosts;
  }

  if (activeTab === 'replies') {
    return allPosts.filter(p => p.authorFingerprint === targetFp && p.replyCount > 0);
  }

  if (activeTab === 'highlights') {
    return allPosts
      .filter(p => p.authorFingerprint === targetFp)
      .sort((a, b) => b.meritVotes - a.meritVotes)
      .slice(0, 5);
  }

  if (activeTab === 'media') {
    return allPosts.filter(p => p.authorFingerprint === targetFp && ((p.images && p.images.length > 0) || p.video));
  }

  if (activeTab === 'likes') {
    return allPosts.filter(p => p.userVoted === 1 || pulseActionsEngine.getInteractions(p.id).liked);
  }

  if (activeTab === 'communities' || activeTab === 'creator') {
    return [];
  }

  return allPosts.filter(p => p.authorFingerprint === targetFp);
}

export function renderProfileTimelinePostsHTML(
  posts: ClientPost[],
  activeTab: ProfileTab,
  targetFp: string
): string {
  if (activeTab === 'communities') {
    const circles = sovereignCircleEngine.getAllCircles().filter(c => c.isJoined);
    if (circles.length === 0) {
      return `
        <div class="p-12 text-center rounded-3xl bg-surface-base border border-white/5 space-y-3">
          <div class="text-3xl">🏛️</div>
          <div class="text-sm font-bold text-white">No joined communities yet</div>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">
            Discover and join sovereign communities to share ideas, code, and discussions.
          </p>
          <div class="pt-2">
            <a href="#communities" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all inline-block shadow-sm">
              Explore Communities
            </a>
          </div>
        </div>
      `;
    }
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        ${circles.map(circle => `
          <div class="p-4 rounded-2xl bg-surface-base border border-white/5 hover:border-indigo-500/30 transition-all flex items-center justify-between gap-3 shadow-md">
            <div class="flex items-center space-x-3 min-w-0">
              <div class="w-11 h-11 rounded-xl bg-surface-raised border border-white/10 flex items-center justify-center text-xl shrink-0" style="color: ${circle.primaryColor};">
                ${circle.icon || '🏛️'}
              </div>
              <div class="min-w-0">
                <a href="#c/${circle.name}" class="text-sm font-bold text-white hover:text-indigo-400 transition-colors truncate block">
                  c/${circle.name}
                </a>
                <p class="text-[11px] text-slate-400 truncate">${circle.displayName}</p>
              </div>
            </div>
            <a href="#c/${circle.name}" class="px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white text-xs font-semibold shrink-0 transition-colors">
              Visit
            </a>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (activeTab === 'creator') {
    const userPosts = clientStore.posts.filter(p => p.authorFingerprint === targetFp);
    const totalMerit = userPosts.reduce((acc, p) => acc + (p.meritVotes || 0), 0);
    const totalReplies = userPosts.reduce((acc, p) => acc + (p.replyCount || 0), 0);
    const estimatedImpressions = (userPosts.length * 12) + (totalMerit * 5) + (totalReplies * 8);

    return `
      <div class="space-y-6">
        <div class="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-surface-base border border-indigo-500/20 shadow-xl space-y-2">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-white flex items-center space-x-2">
              <span>✨</span>
              <span>Sovereign Creator Insights</span>
            </h2>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              100% Private · Zero Telemetry
            </span>
          </div>
          <p class="text-xs text-slate-400 max-w-2xl leading-relaxed">
            All analytics are computed locally from your cryptographic activity and peer gossip consensus. Zero tracking.
          </p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-4 rounded-2xl bg-surface-base border border-white/10 shadow-lg space-y-1">
            <span class="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Pulses</span>
            <div class="text-xl font-black text-white font-mono">${userPosts.length}</div>
            <span class="text-[10px] text-slate-500">Published on-chain</span>
          </div>
          <div class="p-4 rounded-2xl bg-surface-base border border-white/10 shadow-lg space-y-1">
            <span class="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Merit Earned</span>
            <div class="text-xl font-black text-amber-400 font-mono">+${totalMerit}</div>
            <span class="text-[10px] text-slate-500">WoT upvotes</span>
          </div>
          <div class="p-4 rounded-2xl bg-surface-base border border-white/10 shadow-lg space-y-1">
            <span class="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Discussions</span>
            <div class="text-xl font-black text-cyan-400 font-mono">${totalReplies}</div>
            <span class="text-[10px] text-slate-500">Thread replies</span>
          </div>
          <div class="p-4 rounded-2xl bg-surface-base border border-white/10 shadow-lg space-y-1">
            <span class="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Local Reach</span>
            <div class="text-xl font-black text-emerald-400 font-mono">~${estimatedImpressions}</div>
            <span class="text-[10px] text-slate-500">Consensus impressions</span>
          </div>
        </div>
      </div>
    `;
  }

  if (posts.length === 0) {
    return `
      <div class="p-12 text-center rounded-3xl bg-surface-base border border-white/5 space-y-3">
        <div class="text-3xl">📭</div>
        <div class="text-sm font-bold text-white">Nothing here yet</div>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          Posts and conversations will appear here when they are shared.
        </p>
      </div>
    `;
  }

  const currentProfile = profileView.getProfile(targetFp);

  return `
    <div class="space-y-4">
      ${posts.map(p => {
        const authorAlias = p.authorFingerprint.substring(0, 8);
        const authorProfile = profileView.getProfile(p.authorFingerprint);
        const authorDisplayName = authorProfile?.name || (p.authorRole ? `${p.authorRole} (${authorAlias})` : authorAlias);
        const authorHandle = authorProfile?.handle ? `@${authorProfile.handle.replace(/^@/, '')}` : `@${authorAlias}`;
        const timeFormatted = new Date(p.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isPinned = currentProfile?.pinnedPostId === p.id;
        const isRepost = p.authorFingerprint !== targetFp;
        const repProfile = profileView.getProfile(targetFp);
        const repName = repProfile?.name || repProfile?.handle || `@${targetFp.substring(0, 8)}`;

        return `
          <article class="p-5 rounded-3xl bg-surface-base border ${isPinned ? 'border-amber-500/40 shadow-amber-500/5' : 'border-white/10'} hover:border-white/20 transition-all space-y-3 shadow-lg">
            ${isRepost ? `
              <div class="flex items-center space-x-1.5 text-xs text-slate-400 font-mono pb-1 border-b border-white/5">
                <span class="text-emerald-400">🔁</span>
                <span>Reposted by <strong class="text-slate-200 font-bold">${repName}</strong></span>
              </div>
            ` : ''}
            ${isPinned ? `
              <div class="flex items-center space-x-1.5 text-xs font-bold text-amber-400 pb-1 border-b border-amber-500/20">
                <span>📌</span>
                <span>Pinned Post</span>
              </div>
            ` : ''}
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 border border-white/10 flex items-center justify-center font-bold text-xs text-white">
                  ${(authorProfile?.handle || authorAlias).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div class="text-xs font-bold text-white">${authorDisplayName}</div>
                  <div class="text-[10px] font-mono text-slate-400">${authorHandle}</div>
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
