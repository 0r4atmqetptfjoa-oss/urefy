/**
 * @file sidebar.ts
 * @package @aetheris/client-ui
 * @description 2027 Spatial Contextual Right Rail — Dynamically adapts to Feed, Post Detail,
 * Communities, Explore, Messages, and Vault workspaces.
 */

import { communityPath, profilePath } from './public-urls.js';
import { clientStore, ClientPost } from './client-state.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { renderIcon } from './ui/icons.js';
import { postDetailView } from './post-detail.js';
import { threadManager } from './threads.js';
import { profileStore as profileView } from './profile/profile-store.js';
import { privacyLens } from './privacy-lens.js';

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getActiveDiscussions(): ClientPost[] {
  const posts = [...(clientStore.posts || [])];
  return posts.sort((a, b) => b.replyCount * 3 + b.meritVotes - (a.replyCount * 3 + a.meritVotes)).slice(0, 5);
}

function formatRelative(timestamp: number): string {
  const mins = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export class ContextualSidebar {
  public renderSidebarContent(activeMode: string): string {
    if (postDetailView.isOpen()) {
      const activeId = postDetailView.getActivePostId();
      const post = clientStore.posts.find((p) => p.id === activeId);
      if (post) return this.renderPostDetailSidebar(post);
    }

    switch (activeMode) {
      case 'communities':
        return this.renderCommunitiesSidebar();
      case 'profile':
        return this.renderProfileSidebar();
      case 'explore':
        return this.renderExploreSidebar();
      case 'relays':
      case 'messages':
        return this.renderMessagesSidebar();
      case 'vault':
        return this.renderVaultSidebar();
      case 'pulse':
      case 'feed':
      default:
        return this.renderFeedSidebar();
    }
  }

  private renderFeedSidebar(): string {
    const activeDiscussions = getActiveDiscussions();
    const circles = sovereignCircleEngine.getAllCircles().slice(0, 5);

    return `<div class="space-y-4">
      <!-- Active Discussions Bento Card -->
      <section class="rounded-3xl bg-surface-base/80 backdrop-blur-2xl border border-white/[0.08] p-4 shadow-lg">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            ${renderIcon('flame', { size: 14, ariaHidden: true })}
            <span>Active Discussions</span>
          </h3>
        </div>
        <div class="space-y-2.5">
          ${activeDiscussions
            .map(
              (post) => `<button
                type="button"
                data-open-post-detail="${escapeHtml(post.id)}"
                class="w-full text-left p-2.5 rounded-2xl hover:bg-white/[0.05] transition-colors group cursor-pointer"
              >
                <div class="text-xs font-bold text-slate-100 group-hover:text-cyan-300 line-clamp-2 leading-snug">${escapeHtml(
                  post.title
                )}</div>
                <div class="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-1">
                  <span>▲ ${post.meritVotes}</span>
                  <span>·</span>
                  <span>💬 ${post.replyCount}</span>
                  <span>·</span>
                  <span>${formatRelative(post.createdAt)}</span>
                </div>
              </button>`
            )
            .join('')}
        </div>
      </section>

      <!-- Communities Card -->
      <section class="rounded-3xl bg-surface-base/80 backdrop-blur-2xl border border-white/[0.08] p-4 shadow-lg">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-300">Sovereign Communities</h3>
          <a href="/communities" data-action="nav.primary" data-nav-id="communities" class="text-[11px] font-semibold text-cyan-400 hover:underline">See all</a>
        </div>
        <div class="space-y-2">
          ${circles
            .map(
              (c) => `<a
                href="${escapeHtml(communityPath(c.name))}"
                class="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.05] transition-colors"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="text-base">${escapeHtml(c.icon)}</span>
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-white truncate">${escapeHtml(c.displayName || c.name)}</div>
                    <div class="text-[10px] font-mono text-slate-400">${c.membersCount.toLocaleString()} members</div>
                  </div>
                </div>
                <span class="text-xs text-cyan-400">→</span>
              </a>`
            )
            .join('')}
        </div>
      </section>
    </div>`;
  }

  private renderPostDetailSidebar(post: ClientPost): string {
    const circle = sovereignCircleEngine.findCircle(post.channelId);
    const comments = threadManager.getRootCommentsForPost(post.id);
    const participantFps = new Set<string>([post.authorFingerprint]);
    comments.forEach((c) => participantFps.add(c.authorFingerprint));

    return `<div class="space-y-4">
      <section class="rounded-3xl bg-surface-base/80 backdrop-blur-2xl border border-white/[0.08] p-4">
        <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-2">Discussion Context</h3>
        <div class="text-xs text-slate-300 space-y-1.5">
          <div>Community: <strong class="text-cyan-300">c/${escapeHtml(circle?.name || post.channelId)}</strong></div>
          <div>Participants: <strong class="text-white">${participantFps.size}</strong></div>
          <div>Replies: <strong class="text-white">${post.replyCount}</strong></div>
        </div>
        <div class="mt-3 pt-3 border-t border-white/10">
          ${privacyLens.renderReceipt({
            audience: post.audience || 'public',
            channelName: circle?.name || post.channelId,
            facetHandle: post.facetHandle,
          })}
        </div>
      </section>
    </div>`;
  }

  private renderCommunitiesSidebar(): string {
    return this.renderFeedSidebar();
  }

  private renderProfileSidebar(): string {
    const fp = profileView.targetFingerprint || clientStore.keypair?.fingerprint || 'genesis-core';
    const prof = profileView.getProfile(fp);
    return `<div class="space-y-4">
      <section class="rounded-3xl bg-surface-base/80 backdrop-blur-2xl border border-white/[0.08] p-4">
        <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-2">Cryptographic Identity</h3>
        <div class="text-xs font-mono text-cyan-300 break-all">${escapeHtml(fp)}</div>
        <p class="text-[11px] text-slate-400 mt-2">Role: <strong class="text-white">${escapeHtml(prof.role)}</strong> · Trust Score: <strong class="text-emerald-400">${prof.trustScore}%</strong></p>
      </section>
    </div>`;
  }

  private renderExploreSidebar(): string {
    return this.renderFeedSidebar();
  }

  private renderMessagesSidebar(): string {
    return `<div class="space-y-4">
      <section class="rounded-3xl bg-surface-base/80 backdrop-blur-2xl border border-white/[0.08] p-4">
        <h3 class="text-xs font-extrabold uppercase tracking-wider text-emerald-300 mb-1.5">Post-Quantum E2EE Active</h3>
        <p class="text-xs text-slate-400 leading-relaxed">Direct conversations are protected by hybrid X25519 + ML-KEM-768 Double Ratchet and Zero-Metadata ZK Delivery Proofs.</p>
      </section>
    </div>`;
  }

  private renderVaultSidebar(): string {
    return `<div class="space-y-4">
      <section class="rounded-3xl bg-surface-base/80 backdrop-blur-2xl border border-white/[0.08] p-4">
        <h3 class="text-xs font-extrabold uppercase tracking-wider text-cyan-300 mb-1.5">Zero-Knowledge Vault</h3>
        <p class="text-xs text-slate-400 leading-relaxed">Your Vault encrypts notes and saved posts locally using AES-256-GCM derived from your BIP-39 seed before syncing to R2.</p>
      </section>
    </div>`;
  }
}

export const contextualSidebar = new ContextualSidebar();

export function renderSidebar(mode = 'feed'): string {
  return contextualSidebar.renderSidebarContent(mode);
}

export function hasContextualSidebar(route: string, _channelId: string): boolean {
  return ['feed', 'pulse', 'explore', 'communities', 'vault', 'profile'].includes(route);
}
