import { communityPath, profilePath } from './public-urls.js';
/** Consumer contextual rail. Everything shown here supports the active social task. */

import { clientStore, ClientPost } from './client-state.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { renderIcon } from './ui/icons.js';
import { postDetailView } from './post-detail.js';
import { threadManager } from './threads.js';
import { profileStore as profileView } from './profile/profile-store.js';
import { privacyLens } from './privacy-lens.js';

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getActiveDiscussions(): ClientPost[] {
  return [...clientStore.posts]
    .sort((a, b) => ((b.replyCount || 0) * 2 + (b.meritVotes || 0)) - ((a.replyCount || 0) * 2 + (a.meritVotes || 0)))
    .slice(0, 4);
}

function formatRelative(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export class ContextualSidebar {
  public renderSidebarContent(activeMode: string): string {
    if (activeMode === 'post-detail' || postDetailView.isOpen()) {
      const activePost = clientStore.posts.find(p => p.id === postDetailView.activePostId);
      if (activePost) return this.renderPostDetailSidebar(activePost);
    }
    if (activeMode.startsWith('relay') || activeMode.startsWith('dm-') || activeMode === 'messages') return this.renderMessagesSidebar();
    if (activeMode.startsWith('profile')) return this.renderProfileSidebar();
    if (activeMode === 'explore') return this.renderExploreSidebar();
    if (activeMode === 'communities' || activeMode.startsWith('c/')) return this.renderCommunitiesSidebar(activeMode);
    if (activeMode.startsWith('vault')) return this.renderVaultSidebar();
    return this.renderFeedSidebar();
  }

  private renderFeedSidebar(): string {
    const discussions = getActiveDiscussions();
    const communities = sovereignCircleEngine.getAllCircles().slice(0, 4);

    return `
      <div class="context-rail" data-sidebar-context="feed">
        <!-- 1. ACTIVE CONVERSATIONS WITH MOMENTUM -->
        <section class="context-rail__section">
          <div class="flex items-center justify-between">
            <span class="context-rail__title">Active Discussions</span>
            <a href="/explore" data-public-link class="text-[11px] text-[var(--color-accent,#e89e38)] hover:underline font-medium">Explore</a>
          </div>
          ${discussions.length ? `
            <div class="space-y-2 mt-1">
              ${discussions.map(post => {
                const author = profileView.getProfile(post.authorFingerprint);
                const authorName = (author?.name && author.name !== 'Profile not set up')
                  ? author.name
                  : (post.authorDisplayName || post.authorHandle || (author?.handle ? `@${author.handle}` : '') || `@${post.authorFingerprint.slice(0, 8)}`);
                return `
                  <button type="button" data-action="open-post-detail" data-post-id="${escapeHtml(post.id)}" data-open-detail="${escapeHtml(post.id)}" class="btn-open-detail w-full text-left p-2.5 rounded-xl bg-surface-raised/40 hover:bg-surface-raised border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
                    <div class="text-xs font-semibold text-slate-200 group-hover:text-[var(--color-accent,#e89e38)] transition-colors line-clamp-2 leading-snug">
                      ${escapeHtml(post.title || post.content.slice(0, 70))}
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1.5 pt-1 border-t border-white/5">
                      <span class="truncate max-w-[120px] text-slate-300">${escapeHtml(authorName)}</span>
                      <div class="flex items-center gap-2 shrink-0">
                        <span>💬 ${post.replyCount || 0}</span>
                        <span>★ ${post.meritVotes || 0}</span>
                      </div>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="p-4 rounded-xl bg-surface-raised/30 border border-dashed border-white/5 text-center text-xs text-slate-400">
              Conversations will appear as they begin on the open network.
            </div>
          `}
        </section>

        <!-- 2. RELEVANT LIVING SPACES -->
        <section class="context-rail__section">
          <div class="flex items-center justify-between">
            <h3 class="context-rail__title text-xs font-bold text-slate-300">Sovereign Communities</h3>
            <div class="flex items-center space-x-2">
              <a href="/communities" data-public-link class="text-[11px] text-[var(--color-accent,#e89e38)] hover:underline font-medium">Directory</a>
              <button type="button" data-action="open-create-circle" class="text-[11px] text-slate-300 hover:text-white font-medium cursor-pointer">+ Create</button>
            </div>
          </div>
          <div class="space-y-2 mt-1">
            ${communities.map(circle => `
              <div class="p-2.5 rounded-xl bg-surface-raised/40 border border-white/5 hover:border-white/10 flex items-center justify-between gap-2 transition-all">
                <a href="${communityPath(circle.name)}" data-public-link class="flex items-center gap-2.5 min-w-0 flex-1 group">
                  <span class="w-8 h-8 rounded-lg bg-surface-base border border-white/10 flex items-center justify-center text-sm shrink-0">
                    ${circle.icon || renderIcon('users', { size: 16 })}
                  </span>
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-slate-200 group-hover:text-[var(--color-accent,#e89e38)] truncate transition-colors">
                      c/${escapeHtml(circle.name)}
                    </div>
                    <div class="text-[10px] text-slate-400 font-mono">
                      ${(circle.membersCount || 0).toLocaleString()} members
                    </div>
                  </div>
                </a>
                <button type="button" class="compact-join-button ${circle.isJoined ? 'is-joined' : ''} shrink-0 text-xs py-1 px-2.5" data-action="toggle-join-circle" data-circle-id="${circle.id}">
                  ${circle.isJoined ? 'Joined' : 'Join'}
                </button>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- 3. QUIET PRIVACY ASSURANCE -->
        <section class="context-rail__section pt-2 border-t border-white/5">
          <div class="flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
            <span class="text-[var(--color-accent,#e89e38)] shrink-0 mt-0.5">${renderIcon('shield', { size: 14 })}</span>
            <span>Your feed is compiled directly on this device. No ads, tracking, or platform surveillance.</span>
          </div>
        </section>
      </div>`;
  }

  private renderPostDetailSidebar(post: ClientPost): string {
    const rootComments = threadManager.getRootCommentsForPost(post.id);
    const authorProfile = profileView.getProfile(post.authorFingerprint);
    const authorName = (authorProfile?.name && authorProfile.name !== 'Profile not set up')
      ? authorProfile.name
      : (post.authorDisplayName || post.authorHandle || (authorProfile?.handle ? `@${authorProfile.handle}` : '') || `@${post.authorFingerprint.slice(0, 8)}`);
    
    // Collect distinct participants (author + comment authors)
    const participantFPs = new Set<string>([post.authorFingerprint]);
    for (const c of rootComments) {
      if (c.authorFingerprint) participantFPs.add(c.authorFingerprint);
    }
    const participants = Array.from(participantFPs).slice(0, 6).map(fp => {
      const p = profileView.getProfile(fp);
      const isOP = fp === post.authorFingerprint;
      const fallback = isOP && (post.authorDisplayName || post.authorHandle)
        ? (post.authorDisplayName || post.authorHandle)
        : `@${fp.slice(0, 8)}`;
      return {
        fp,
        name: (p?.name && p.name !== 'Profile not set up') ? p.name : fallback,
        avatar: p?.avatar || (isOP ? post.authorAvatarUrl : undefined),
        isOP,
      };
    });

    const isCommunity = Boolean(post.channelId && post.channelId.startsWith('c/'));
    const communityName = isCommunity ? post.channelId.replace(/^c\//, '') : '';
    const audience = post.audience || (post.channelId?.startsWith('vault-') ? 'followers' : isCommunity ? 'community' : 'public');

    // Extract table of contents from markdown headings or numbered sections
    const headingMatches = (post.content || '').match(/^(?:#{1,3}\s+|(?:\d+\.\s+))([^\n]+)/gm) || [];
    const sections = headingMatches.slice(0, 5).map(h => {
      const clean = h.replace(/^(?:#{1,3}\s+|\d+\.\s+)/, '').replace(/\*\*/g, '').trim();
      const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return { title: clean, slug };
    }).filter(s => s.title.length > 2);

    // Other discussions in same channel
    const relatedInChannel = clientStore.posts
      .filter(p => p.id !== post.id && (post.channelId ? p.channelId === post.channelId : !p.channelId?.startsWith('c/')))
      .slice(0, 3);

    return `
      <div class="context-rail journal-thread-context space-y-3" data-sidebar-context="post-detail">
        <!-- 1. AUTHOR IDENTITY CARD -->
        <section class="context-rail__section">
          <span class="context-rail__title">Author</span>
          <div class="p-3 rounded-xl bg-surface-raised/40 border border-white/5 mt-1 space-y-2.5">
            <div class="flex items-center space-x-2.5">
              ${authorProfile?.avatar ? `
                <img src="${escapeHtml(authorProfile.avatar)}" alt="${escapeHtml(authorName)}" class="w-9 h-9 rounded-full object-cover border border-white/10" />
              ` : `
                <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-aether/60 to-cyphr/60 flex items-center justify-center font-mono text-xs font-bold text-white shadow-sm">
                  ${(post.authorFingerprint || '??').substring(0, 2).toUpperCase()}
                </div>
              `}
              <div class="min-w-0 flex-1">
                <div class="font-bold text-xs text-white truncate">${escapeHtml(authorName)}</div>
                <div class="text-[11px] font-mono text-slate-400 truncate">@${post.authorFingerprint.slice(0, 8)}</div>
              </div>
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-slate-300 bg-surface-base">
                ${post.authorRole || 'MEMBER'}
              </span>
            </div>
            ${authorProfile?.bio ? `
              <p class="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">${escapeHtml(authorProfile.bio)}</p>
            ` : ''}
            <a href="${profilePath(post.authorFingerprint)}" data-public-link class="block text-center text-[11px] font-semibold py-1 px-2.5 rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 transition-all">
              View Profile
            </a>
          </div>
        </section>

        <!-- 2. TABLE OF CONTENTS / KEY SECTIONS (IF PRESENT) -->
        ${sections.length > 0 ? `
          <section class="context-rail__section">
            <span class="context-rail__title">On This Page</span>
            <div class="space-y-1 mt-1">
              ${sections.map(s => `
                <a href="#${escapeHtml(s.slug)}" class="block py-1.5 px-2.5 rounded-lg hover:bg-surface-raised text-[11.5px] text-slate-300 hover:text-[var(--color-accent,#e89e38)] truncate transition-all">
                  <span class="text-slate-500 mr-1.5">•</span>${escapeHtml(s.title)}
                </a>
              `).join('')}
            </div>
          </section>
        ` : ''}

        <!-- 3. DISCUSSION PARTICIPANTS -->
        <section class="context-rail__section journal-thread-context__participants">
          <span class="context-rail__title">Thread Participants (${participants.length})</span>
          <div class="journal-thread-context__participant-list flex flex-wrap gap-1.5 mt-1">
            ${participants.map(part => `
              <div class="context-rail__participant-chip journal-thread-context__participant">
                ${part.avatar ? `
                  <img src="${escapeHtml(part.avatar)}" alt="${escapeHtml(part.name || 'Member')}" class="w-4 h-4 rounded-full object-cover" />
                ` : `
                  <span class="w-4 h-4 rounded-full bg-surface-overlay text-[9px] font-mono flex items-center justify-center font-bold">
                    ${part.fp.slice(0, 2).toUpperCase()}
                  </span>
                `}
                <span class="truncate max-w-[90px] font-medium">${escapeHtml(part.name || 'Member')}</span>
                ${part.isOP ? `<span class="text-[8px] font-mono font-bold text-[var(--color-accent,#e89e38)]">OP</span>` : ''}
              </div>
            `).join('')}
          </div>
        </section>

        <!-- 4. IN THIS THREAD METRICS -->
        <section class="context-rail__section journal-thread-context__record">
          <span class="context-rail__title">In this thread</span>
          <div class="journal-thread-context__facts grid grid-cols-2 gap-2 mt-1">
            <div class="journal-thread-context__fact p-2 rounded-xl bg-surface-raised/40 border border-white/5">
              <div class="text-[10px] text-slate-400 font-mono uppercase">Replies</div>
              <div class="text-base font-bold text-slate-100">${post.replyCount || rootComments.length}</div>
            </div>
            <div class="journal-thread-context__fact p-2 rounded-xl bg-surface-raised/40 border border-white/5">
              <div class="text-[10px] text-slate-400 font-mono uppercase">Merit Score</div>
              <div class="text-base font-bold text-[var(--color-accent,#e89e38)]">${post.meritVotes || 0}</div>
            </div>
          </div>
          <div class="text-[11px] text-slate-400 font-mono mt-1">
            Started ${formatRelative(post.createdAt || Date.now())}
          </div>
        </section>

        <!-- 5. PRIVACY BOUNDARY LENS -->
        <section class="context-rail__section journal-thread-context__privacy">
          <div class="flex items-center justify-between">
            <span class="context-rail__title">Privacy Boundary</span>
            ${privacyLens.renderCompact((audience as any) || 'public')}
          </div>
          <div class="p-3 rounded-xl bg-surface-raised/40 border border-white/5 text-xs space-y-1.5 mt-1">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-400">Audience</span>
              <span class="text-slate-200 font-medium capitalize">${escapeHtml(audience)}</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-400">Storage</span>
              <span class="text-emerald-400 font-medium font-mono text-[10px]">On-device Vault</span>
            </div>
            <div class="text-[10px] text-slate-400 pt-1 border-t border-white/5">
              Not publicly linked to other social facets.
            </div>
          </div>
        </section>

        <!-- 6. LIVING SPACE CONTEXT (IF POST BELONGS TO COMMUNITY) -->
        ${isCommunity ? `
          <section class="context-rail__section journal-thread-context__place">
            <span class="context-rail__title">Living Space</span>
            <div class="p-2.5 rounded-xl bg-surface-raised/40 border border-white/5 mt-1 space-y-2">
              <div class="text-xs font-bold text-slate-200">c/${escapeHtml(communityName)}</div>
              <a href="${communityPath(communityName)}" data-public-link class="block text-center text-xs font-bold py-1.5 px-3 rounded-lg bg-[var(--color-accent,#e89e38)] text-slate-950 hover:brightness-105 transition-all">
                Browse Community
              </a>
            </div>
          </section>
        ` : ''}

        <!-- 7. MORE IN CHANNEL / RELATED DISCUSSIONS -->
        ${relatedInChannel.length > 0 ? `
          <section class="context-rail__section">
            <span class="context-rail__title">More Discussions</span>
            <div class="space-y-2 mt-1">
              ${relatedInChannel.map(rp => `
                <button type="button" data-action="open-post-detail" data-post-id="${escapeHtml(rp.id)}" data-open-detail="${escapeHtml(rp.id)}" class="btn-open-detail w-full text-left p-2.5 rounded-xl bg-surface-raised/40 hover:bg-surface-raised border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
                  <div class="text-xs font-semibold text-slate-200 group-hover:text-[var(--color-accent,#e89e38)] transition-colors line-clamp-2 leading-snug">
                    ${escapeHtml(rp.title)}
                  </div>
                  <div class="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-1">
                    <span>▲ ${rp.meritVotes || 0}</span>
                    <span>💬 ${rp.replyCount || 0}</span>
                  </div>
                </button>
              `).join('')}
            </div>
          </section>
        ` : ''}
      </div>
    `;
  }

  private renderCommunitiesSidebar(activeMode?: string): string {
    const isSpecificSpace = activeMode && activeMode.startsWith('c/');
    const spaceName = isSpecificSpace ? activeMode.replace(/^c\//, '') : '';
    const circle = isSpecificSpace ? sovereignCircleEngine.getAllCircles().find(c => c.name.toLowerCase() === spaceName.toLowerCase()) : null;

    if (circle) {
      return `
        <div class="context-rail" data-sidebar-context="community-specific">
          <section class="context-rail__section">
            <div class="flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-surface-raised border border-white/10 flex items-center justify-center text-xl shrink-0">
                ${circle.icon || renderIcon('users', { size: 20 })}
              </span>
              <div>
                <h3 class="text-sm font-bold text-white">c/${escapeHtml(circle.name)}</h3>
                <span class="text-[11px] text-slate-400 font-mono">${(circle.membersCount || 0).toLocaleString()} members</span>
              </div>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed mt-2">${escapeHtml(circle.description || 'A sovereign community space on UREfy.')}</p>
          </section>

          <section class="context-rail__section">
            <span class="context-rail__title">Space Actions</span>
            <button type="button" data-action="open-composer" data-channel="${circle.channelId}" class="w-full py-2 px-3 rounded-xl bg-[var(--color-accent,#e89e38)] hover:brightness-105 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <span>✍️</span>
              <span>Start Conversation</span>
            </button>
            <button type="button" class="w-full py-2 px-3 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 text-xs font-semibold transition-all border border-white/5 cursor-pointer mt-1" data-action="toggle-join-circle" data-circle-id="${circle.id}">
              ${circle.isJoined ? '✓ Joined Space' : '+ Join Space'}
            </button>
          </section>

          ${(circle.rules && circle.rules.length > 0) ? `
            <section class="context-rail__section">
              <span class="context-rail__title">Community Principles (${circle.rules.length})</span>
              <div class="space-y-1.5 mt-1 text-xs text-slate-300">
                ${circle.rules.slice(0, 3).map((r: { title: string; description?: string }, i: number) => `
                  <div class="p-2 rounded-lg bg-surface-raised/40 border border-white/5 text-[11px]">
                    <strong>${i + 1}. ${escapeHtml(r.title)}</strong>
                  </div>
                `).join('')}
              </div>
            </section>
          ` : ''}
        </div>
      `;
    }

    const allCircles = sovereignCircleEngine.getAllCircles();
    const joined = allCircles.filter(c => c.isJoined).length;

    return `
      <div class="context-rail" data-sidebar-context="communities">
        <section class="context-rail__section">
          <span class="context-rail__title">Living Spaces</span>
          <p class="text-xs text-slate-300 leading-relaxed mt-1">
            Autonomous gathering places on the open web. Communities are client-governed with zero surveillance algorithms.
          </p>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <div class="p-2 rounded-xl bg-surface-raised/40 border border-white/5 text-center">
              <div class="text-base font-bold text-slate-100">${allCircles.length}</div>
              <div class="text-[10px] text-slate-400 font-mono">Discovered</div>
            </div>
            <div class="p-2 rounded-xl bg-surface-raised/40 border border-white/5 text-center">
              <div class="text-base font-bold text-[var(--color-accent,#e89e38)]">${joined}</div>
              <div class="text-[10px] text-slate-400 font-mono">Joined</div>
            </div>
          </div>
        </section>

        <section class="context-rail__section">
          <span class="context-rail__title">Build A Place</span>
          <p class="text-xs text-slate-400">Bring people together around shared interests.</p>
          <button type="button" data-action="open-create-circle" class="w-full py-2 px-3 rounded-xl bg-[var(--color-accent,#e89e38)] hover:brightness-105 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer mt-1">
            ${renderIcon('plus', { size: 15 })}
            <span>Create Living Space</span>
          </button>
        </section>
      </div>`;
  }

  private renderProfileSidebar(): string {
    const activeFacet = clientStore.getActiveFacet() || {
      id: 'default',
      displayName: 'Main Context',
      handle: 'sovereign',
      role: 'MEMBER',
      visibility: 'public',
    };

    return `
      <div class="context-rail" data-sidebar-context="profile">
        <section class="context-rail__section">
          <span class="context-rail__title">Active Social Context</span>
          <div class="p-3 rounded-xl bg-surface-raised/60 border border-white/10 mt-1 space-y-2">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-700 p-0.5 shrink-0">
                <div class="w-full h-full rounded-xl bg-surface-base flex items-center justify-center font-bold text-xs text-amber-200">
                  ${(activeFacet.displayName || 'U').slice(0, 2).toUpperCase()}
                </div>
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-white truncate">${escapeHtml(activeFacet.displayName)}</div>
                <div class="text-[11px] text-slate-400 font-mono">@${escapeHtml(activeFacet.handle)}</div>
              </div>
            </div>
            <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span class="text-slate-400">Visibility:</span>
              <span class="font-medium text-emerald-400">Public persona</span>
            </div>
          </div>
          <button type="button" data-action="open-context-lens" class="w-full mt-2 py-2 px-3 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 text-xs font-semibold transition-all border border-white/5 flex items-center justify-center gap-2 cursor-pointer">
            <span>⇄</span>
            <span>Switch Context</span>
          </button>
        </section>

        <section class="context-rail__section">
          <span class="context-rail__title">Identity Settings</span>
          <div class="space-y-1.5 mt-1">
            <button type="button" data-action="open-settings" data-subtab="account" class="w-full text-left p-2 rounded-xl hover:bg-surface-raised text-xs text-slate-300 flex items-center gap-2 transition-colors cursor-pointer">
              ${renderIcon('settings', { size: 15 })}
              <span>Account Preferences</span>
            </button>
            <button type="button" data-action="open-settings" data-subtab="security" class="w-full text-left p-2 rounded-xl hover:bg-surface-raised text-xs text-slate-300 flex items-center gap-2 transition-colors cursor-pointer">
              ${renderIcon('shield', { size: 15 })}
              <span>Keys & Sovereign Identity</span>
            </button>
            <button type="button" data-action="open-feature" data-feature="export-backup" class="w-full text-left p-2 rounded-xl hover:bg-surface-raised text-xs text-slate-300 flex items-center gap-2 transition-colors cursor-pointer">
              ${renderIcon('download', { size: 15 })}
              <span>Backup Recovery Kit</span>
            </button>
          </div>
        </section>

        <section class="context-rail__section">
          <div class="text-[10px] text-slate-500 leading-normal">
            Facets on UREfy are unlinked by design. Each persona operates under sovereign client-side boundaries.
          </div>
        </section>
      </div>`;
  }

  private renderExploreSidebar(): string {
    const topics = getRealTopics();

    return `
      <div class="context-rail" data-sidebar-context="explore">
        <section class="context-rail__section">
          <span class="context-rail__title">Directional Discovery</span>
          <p class="text-xs text-slate-300 leading-relaxed mt-1">
            Follow ideas as they travel from sparks into discussions, connect with real thinkers, and gather in living spaces.
          </p>
          <div class="flex items-center justify-between text-[10px] font-mono text-[var(--color-accent,#e89e38)] p-2 rounded-lg bg-surface-raised/40 border border-white/5 mt-2">
            <span>Ideas</span>
            <span>→</span>
            <span>Conversations</span>
            <span>→</span>
            <span>People</span>
            <span>→</span>
            <span>Spaces</span>
          </div>
        </section>

        <section class="context-rail__section">
          <span class="context-rail__title">Top Themes</span>
          ${topics.length ? `
            <div class="space-y-1.5 mt-1">
              ${topics.map(t => `
                <button type="button" class="w-full text-left p-2 rounded-lg bg-surface-raised/40 hover:bg-surface-raised flex items-center justify-between text-xs transition-colors cursor-pointer" data-nav-mode="explore">
                  <span class="font-bold text-slate-200">${escapeHtml(t.tag)}</span>
                  <span class="text-[10px] text-slate-400 font-mono">${t.count} posts</span>
                </button>
              `).join('')}
            </div>
          ` : `
            <div class="text-xs text-slate-400 italic p-2">Topics emerge from real conversation.</div>
          `}
        </section>
      </div>`;
  }

  private renderMessagesSidebar(): string {
    return `
      <div class="context-rail" data-sidebar-context="messages">
        <section class="context-rail__section">
          <span class="context-rail__title">Privacy Boundaries</span>
          <div class="p-3 rounded-xl bg-surface-raised/40 border border-white/5 space-y-2 mt-1 text-xs">
            <div class="flex items-center gap-2 text-emerald-400 font-semibold">
              ${renderIcon('lock', { size: 16 })}
              <span>Direct 1:1 Messages</span>
            </div>
            <p class="text-slate-400 text-[11px] leading-relaxed">
              End-to-end encrypted with hybrid post-quantum cryptography on your device. Only you and the recipient can read them.
            </p>
          </div>
        </section>
      </div>`;
  }

  private renderVaultSidebar(): string {
    return `
      <div class="context-rail" data-sidebar-context="vault">
        <section class="context-rail__section">
          <span class="context-rail__title">Sovereign Vault</span>
          <p class="text-xs text-slate-300 leading-relaxed mt-1">
            Private snapshots and kept conversations are encrypted on this device.
          </p>
        </section>
      </div>`;
  }
}

function getRealTopics(): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const post of clientStore.posts) {
    for (const tag of post.content.match(/#[A-Za-z0-9_]+/g) || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
    if (post.flair) counts.set(post.flair, (counts.get(post.flair) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));
}

export const contextualSidebar = new ContextualSidebar();

export function renderSidebar(mode = 'feed'): string {
  return contextualSidebar.renderSidebarContent(mode);
}

export function hasContextualSidebar(route: string, channelId: string): boolean {
  if (postDetailView.isOpen()) return true;
  if (route === 'explore' || channelId === 'explore') return false;
  if (route === 'communities' || channelId === 'communities') return false;
  if (route === 'profile' || channelId.startsWith('profile')) return false;
  if (route === 'messages' || channelId.startsWith('relays-') || channelId.startsWith('relay-') || channelId.startsWith('dm-') || channelId === 'messages') return false;
  if (route === 'vault' || channelId.startsWith('vault')) return false;
  if (route === 'settings' || channelId === 'settings') return false;
  return true;
}
