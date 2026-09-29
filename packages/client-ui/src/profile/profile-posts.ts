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
import { presentPublicIdentity } from '../public-identity.js';

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
        <div class="journal-profile__empty p-12 text-center rounded-3xl bg-surface-base border border-white/5 space-y-3">
          <div class="text-3xl">🏛️</div>
          <div class="text-sm font-bold text-white">No joined communities yet</div>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">
            Discover and join sovereign communities to share ideas, code, and discussions.
          </p>
          <div class="pt-2">
            <a href="/communities" data-public-link class="journal-profile__empty-link px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all inline-block shadow-sm">
              Explore Communities
            </a>
          </div>
        </div>
      `;
    }
    return `
      <div class="journal-profile__community-list grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        ${circles.map(circle => `
          <div class="journal-profile__community p-4 rounded-2xl bg-surface-base border border-white/5 hover:border-indigo-500/30 transition-all flex items-center justify-between gap-3 shadow-md">
            <div class="flex items-center space-x-3 min-w-0">
              <div class="w-11 h-11 rounded-xl bg-surface-raised border border-white/10 flex items-center justify-center text-xl shrink-0" style="color: ${circle.primaryColor};">
                ${circle.icon || '🏛️'}
              </div>
              <div class="min-w-0">
                <a href="/c/${circle.name}" class="text-sm font-bold text-white hover:text-indigo-400 transition-colors truncate block">
                  c/${circle.name}
                </a>
                <p class="text-[11px] text-slate-400 truncate">${circle.displayName}</p>
              </div>
            </div>
            <a href="/c/${circle.name}" class="px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white text-xs font-semibold shrink-0 transition-colors">
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
    const mediaPosts = userPosts.filter(p => (p.images?.length || 0) > 0 || Boolean(p.video)).length;

    return `
      <div class="journal-profile__creator space-y-6">
        <div class="journal-profile__creator-intro p-6 rounded-2xl bg-surface-base border border-[var(--surface-rule)] space-y-2">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-white flex items-center space-x-2">
              <span class="text-[var(--color-accent,#e89e38)]">✨</span>
              <span>Sovereign Creator Insights</span>
            </h2>
          </div>
          <p class="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Activity summary from posts currently available in this profile view.
          </p>
        </div>

        <div class="journal-profile__creator-record grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-4 rounded-2xl bg-surface-base border border-[var(--surface-rule)] space-y-1">
            <span class="text-sm font-semibold text-slate-400">Posts available here</span>
            <div class="text-xl font-black text-white font-mono">${userPosts.length}</div>
            <span class="text-sm text-slate-500">In this profile view</span>
          </div>
          <div class="p-4 rounded-2xl bg-surface-base border border-[var(--surface-rule)] space-y-1">
            <span class="text-sm font-semibold text-slate-400">Merit votes</span>
            <div class="text-xl font-black text-amber-400 font-mono">+${totalMerit}</div>
            <span class="text-sm text-slate-500">On these posts</span>
          </div>
          <div class="p-4 rounded-2xl bg-surface-base border border-[var(--surface-rule)] space-y-1">
            <span class="text-sm font-semibold text-slate-400">Replies</span>
            <div class="text-xl font-black text-cyan-400 font-mono">${totalReplies}</div>
            <span class="text-sm text-slate-500">On these posts</span>
          </div>
          <div class="p-4 rounded-2xl bg-surface-base border border-[var(--surface-rule)] space-y-1">
            <span class="text-sm font-semibold text-slate-400">Local Reach</span>
            <div class="text-xl font-black text-emerald-400 font-mono">${userPosts.length + totalMerit + totalReplies}</div>
            <span class="text-sm text-slate-500">Total engagements</span>
          </div>
        </div>
      </div>
    `;
  }

  if (posts.length === 0) {
    return `
      <div class="journal-profile__empty p-12 text-center rounded-3xl bg-surface-base border border-white/5 space-y-3">
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
    <div class="journal-profile__timeline space-y-4">
      ${posts.map(p => {
        const authorProfile = profileView.getProfile(p.authorFingerprint);
        const authorIdentity = presentPublicIdentity(p.authorDisplayName || p.authorHandle ? { ...authorProfile, name: p.authorDisplayName || '', handle: p.authorHandle || '' } : authorProfile, p.authorFingerprint, p.authorFingerprint === clientStore.keypair.fingerprint);
        const authorDisplayName = authorIdentity.displayName;
        const authorHandle = authorIdentity.handleLabel;
        const authorAlias = p.authorFingerprint.substring(0, 8);
        const timeFormatted = new Date(p.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isPinned = currentProfile?.pinnedPostId === p.id;
        const isRepost = p.authorFingerprint !== targetFp;
        const repProfile = profileView.getProfile(targetFp);
        const repName = repProfile?.name || repProfile?.handle || `@${targetFp.substring(0, 8)}`;

        const detectedVideo = obsidianMediaPlayer.extractVideo(p.content);
        const videoHtml = p.video?.src
          ? `<div class="mt-2">${obsidianMediaPlayer.renderVideoCard(p.id, p.video.src, p.video.poster)}</div>`
          : (detectedVideo ? `<div class="mt-2">${obsidianMediaPlayer.renderVideoCard(p.id, p.content)}</div>` : '');
        const imagesHtml = p.images && p.images.length > 0
          ? `<div class="rounded-2xl overflow-hidden mt-2 border border-white/10 max-h-80"><img src="${p.images[0]}" alt="Attached Media" class="w-full h-full object-cover" /></div>`
          : '';
        const hasMedia = Boolean(videoHtml || imagesHtml);

        let displayContent = p.content || '';
        if (detectedVideo && !p.video?.src) {
          displayContent = displayContent
            .replace(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}[^\s]*/gi, '')
            .replace(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/\d+[^\s]*/gi, '')
            .replace(/https?:\/\/[^\s"'<>]+\.(?:mp4|webm|ogg)(?:\?[^\s"'<>]*)?/gi, '')
            .trim();
        }

        const isClamped = hasMedia
          ? (displayContent.length > 120 || (displayContent.match(/\n/g) || []).length >= 2)
          : (displayContent.length > 280 || (displayContent.match(/\n/g) || []).length >= 4);

        return `
          <article class="journal-profile__post editorial-post-card p-5 rounded-2xl bg-surface-base border ${isPinned ? 'border-[var(--color-accent,#e89e38)]/40 shadow-sm' : 'border-[var(--surface-rule)]'} hover:border-white/20 transition-all space-y-3 cursor-pointer" data-action="open-post-detail" data-post-id="${p.id}">
            ${isRepost ? `
              <div class="journal-profile__repost flex items-center space-x-1.5 text-xs text-slate-400 font-mono pb-1 border-b border-white/5">
                <span class="text-emerald-400">🔁</span>
                <span>Reposted by <strong class="text-slate-200 font-bold">${repName}</strong></span>
              </div>
            ` : ''}
            ${isPinned ? `
              <div class="journal-profile__pinned flex items-center space-x-1.5 text-xs font-bold text-[var(--color-accent,#e89e38)] pb-1 border-b border-[var(--color-accent,#e89e38)]/20">
                <span>📌</span>
                <span>Pinned Post</span>
              </div>
            ` : ''}
            <div class="journal-profile__post-byline flex items-center justify-between">
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

            ${p.title && p.title !== p.content.substring(0, 50) ? `
              <h2 class="text-sm md:text-base font-bold text-white hover:text-indigo-400 transition-colors">
                <button type="button" data-action="open-post-detail" data-post-id="${p.id}" class="text-left font-bold">${p.title}</button>
              </h2>
            ` : ''}

            ${videoHtml}
            ${imagesHtml}

            ${displayContent ? `
              <div class="social-post__body-wrapper ${hasMedia ? 'has-media' : 'text-only'} ${isClamped ? 'is-clamped' : ''}">
                <div data-action="open-post-detail" data-post-id="${p.id}" class="social-post__body text-[15px] sm:text-base text-slate-200 leading-relaxed cursor-pointer">${markdownRenderer.renderMarkdown(displayContent)}</div>
                ${isClamped ? `
                  <button type="button" data-action="open-post-detail" data-post-id="${p.id}" class="social-post__see-more" aria-label="Read full post">
                    <span>Read full post</span>
                    <svg class="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                ` : ''}
              </div>
            ` : ''}

            <div class="journal-profile__post-actions pt-2 border-t border-white/5 flex items-center justify-between">
              ${pulseActionsEngine.renderPulseActionBar(p.id, p.replyCount)}
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}
