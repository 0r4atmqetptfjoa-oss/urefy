/**
 * @file why-this-post-modal.ts
 * @package @aetheris/client-ui
 * @description Transparent Recommendation Explainability Modal ("Why am I seeing this?").
 *
 * Implements full sovereign transparency over algorithmic feed signals:
 * 1. Explains why a post appeared in the user's feed (author follow, community membership, topic affinity, network merit, freshness).
 * 2. Provides direct tuning controls to adjust or mute signals without black-box mystery.
 */

import { clientStore } from './client-state.js';
import { feedPersonalization, ContentSignal } from './feed-personalization.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { profileStore as profileView } from './profile/profile-store.js';
import { renderIcon } from './ui/icons.js';
import { renderAvatar } from './ui/avatar-generator.js';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class WhyThisPostModal {
  private container: HTMLElement | null = null;
  private currentPostId: string | null = null;

  public isOpen(): boolean {
    return this.currentPostId !== null;
  }

  public getActivePostId(): string | null {
    return this.currentPostId;
  }

  public open(postId: string): void {
    this.currentPostId = postId;
    this.render();
  }

  public close(): void {
    if (typeof document === 'undefined') {
      this.currentPostId = null;
      return;
    }
    if (this.container) {
      this.container.classList.add('hidden');
      this.container.style.display = 'none';
      this.container.style.pointerEvents = 'none';
      this.container.innerHTML = '';
      this.container.remove();
      this.container = null;
    }
    const root = document.getElementById('why-this-post-modal-root');
    if (root) {
      root.remove();
    }
    this.currentPostId = null;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    const mainLayout = document.getElementById('main-layout') || document.getElementById('app');
    if (mainLayout) {
      mainLayout.removeAttribute('inert');
      mainLayout.removeAttribute('aria-hidden');
    }
  }

  private ensureContainer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('why-this-post-modal-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'why-this-post-modal-root';
      el.className = 'urefy-modal-backdrop select-none';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', 'Why am I seeing this?');
      document.body.appendChild(el);
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen()) {
          this.close();
        }
      });
    } else {
      el.className = 'urefy-modal-backdrop select-none';
      el.style.display = '';
      el.style.pointerEvents = '';
    }
    this.container = el;
    return el;
  }

  public render(): string {
    const postId = this.currentPostId;
    if (!postId) return '';
    const el = this.ensureContainer();

    const post = clientStore.posts.find(p => p.id === postId);
    if (!post) {
      this.close();
      return '';
    }

    const circle = sovereignCircleEngine.findCircle(post.channelId);
    const circleName = circle ? `c/${circle.name}` : (post.channelId.startsWith('c/') ? post.channelId : 'c/general');
    const isCircleMember = circle?.isJoined || false;

    const profile = profileView.getProfile(post.authorFingerprint);
    const authorName = profile?.name || profile?.handle || `@${post.authorFingerprint.slice(0, 8)}`;
    const isFollowingAuthor = profileView.isFollowing(post.authorFingerprint);

    // Score the post signals
    const signal: ContentSignal = {
      postId: post.id,
      tags: (post as any).tags || (post.flair ? [post.flair] : []),
      flair: post.flair || '',
      channelId: post.channelId || '',
      score: post.meritVotes || 0,
      authorFP: post.authorFingerprint || '',
      createdAt: post.createdAt,
      title: post.title,
    };

    const scoreResult = feedPersonalization.scorePost(signal);

    // Build human reasons list
    const humanReasons: Array<{ icon: string; title: string; desc: string }> = [];

    if (isFollowingAuthor) {
      humanReasons.push({
        icon: renderIcon('user', { size: 16 }),
        title: 'Author you follow',
        desc: `You follow ${authorName}, so their posts appear in your feed.`,
      });
    }

    if (isCircleMember) {
      humanReasons.push({
        icon: renderIcon('users', { size: 16 }),
        title: 'Community membership',
        desc: `You joined ${circleName}, where this discussion was posted.`,
      });
    }

    if (post.meritVotes && post.meritVotes > 0) {
      humanReasons.push({
        icon: renderIcon('sparkles', { size: 16 }),
        title: 'Community merit',
        desc: `This discussion has accumulated ${post.meritVotes} merits from readers.`,
      });
    }

    if (scoreResult.reasons && scoreResult.reasons.length > 0) {
      for (const r of scoreResult.reasons) {
        if (!r.includes('Author manually muted')) {
          humanReasons.push({
            icon: renderIcon('compass', { size: 16 }),
            title: 'Topic interest',
            desc: r.replace(/^[^\w]+/, ''),
          });
        }
      }
    }

    if (humanReasons.length === 0) {
      humanReasons.push({
        icon: renderIcon('globe', { size: 16 }),
        title: 'Network discovery',
        desc: 'This post is circulating across UREfy public discussions.',
      });
    }

    const postTitle = post.title || post.content.slice(0, 60);

    const html = `
      <div class="urefy-modal-card w-full max-w-md bg-surface-base border border-[var(--surface-rule)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        <div class="urefy-sheet-grabber"></div>
        <!-- Header -->
        <div class="px-5 py-4 border-b border-[var(--surface-rule)] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="text-base text-[var(--color-accent,#e59b3c)]">${renderIcon('info', { size: 18 })}</span>
            <h3 class="text-sm font-bold text-slate-100">Why am I seeing this?</h3>
          </div>
          <button 
            type="button" 
            data-action="close-why-modal" 
            class="min-w-[44px] min-h-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-raised cursor-pointer transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            ${renderIcon('close', { size: 16 })}
          </button>
        </div>

        <!-- Post Preview -->
        <div class="px-5 py-3 bg-surface-raised/40 border-b border-white/5 flex items-center gap-3">
          ${renderAvatar(profile?.avatar, post.authorFingerprint, { size: 32 })}
          <div class="min-w-0 flex-1">
            <div class="text-xs font-semibold text-slate-200 truncate">${escapeHtml(postTitle)}</div>
            <div class="text-[11px] text-slate-400 truncate">By ${escapeHtml(authorName)} in ${escapeHtml(circleName)}</div>
          </div>
        </div>

        <!-- Explanation Points -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Signals that influenced this</div>
          <div class="space-y-2.5">
            ${humanReasons.map(hr => `
              <div class="p-3 rounded-xl bg-surface-raised border border-white/5 flex items-start gap-3">
                <span class="text-slate-400 shrink-0 mt-0.5">${hr.icon}</span>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold text-slate-200">${escapeHtml(hr.title)}</div>
                  <div class="text-[11px] text-slate-400 mt-0.5 leading-relaxed">${escapeHtml(hr.desc)}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Controls to Adjust Signals -->
          <div class="pt-3 border-t border-white/10 space-y-2">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tune your feed</div>
            
            <button
              type="button"
              data-action="why-less-like-this"
              data-post-id="${escapeHtml(post.id)}"
              class="w-full p-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/5 transition-colors text-left flex items-center justify-between cursor-pointer group"
            >
              <div class="flex items-center gap-2.5">
                <span class="text-slate-400 group-hover:text-white">${renderIcon('filter', { size: 16 })}</span>
                <div>
                  <div class="text-xs font-medium text-slate-200 group-hover:text-white">Show less like this</div>
                  <div class="text-[10px] text-slate-500">Down-weights similar topics and signals</div>
                </div>
              </div>
              <span class="text-slate-500 text-xs">→</span>
            </button>

            <button
              type="button"
              data-action="why-not-interested"
              data-post-id="${escapeHtml(post.id)}"
              class="w-full p-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/5 transition-colors text-left flex items-center justify-between cursor-pointer group"
            >
              <div class="flex items-center gap-2.5">
                <span class="text-rose-400 group-hover:text-rose-300">${renderIcon('eyeOff', { size: 16 })}</span>
                <div>
                  <div class="text-xs font-medium text-slate-200 group-hover:text-white">Not interested</div>
                  <div class="text-[10px] text-slate-500">Hide this post and exclude from active facet recommendations</div>
                </div>
              </div>
              <span class="text-slate-500 text-xs">→</span>
            </button>

            <button
              type="button"
              data-action="why-mute-author"
              data-author-fp="${escapeHtml(post.authorFingerprint)}"
              class="w-full p-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/5 transition-colors text-left flex items-center justify-between cursor-pointer group"
            >
              <div class="flex items-center gap-2.5">
                <span class="text-slate-400 group-hover:text-white">${renderIcon('eyeOff', { size: 16 })}</span>
                <div>
                  <div class="text-xs font-medium text-slate-200 group-hover:text-white">Mute ${escapeHtml(authorName)}</div>
                  <div class="text-[10px] text-slate-500">Hide posts by this author across your feeds</div>
                </div>
              </div>
              <span class="text-slate-500 text-xs">→</span>
            </button>

            ${post.flair ? `
              <button
                type="button"
                data-action="why-mute-tag"
                data-tag="${escapeHtml(post.flair)}"
                class="w-full p-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/5 transition-colors text-left flex items-center justify-between cursor-pointer group"
              >
                <div class="flex items-center gap-2.5">
                  <span class="text-slate-400 group-hover:text-white">${renderIcon('bookmark', { size: 16 })}</span>
                  <div>
                    <div class="text-xs font-medium text-slate-200 group-hover:text-white">Mute tag #${escapeHtml(post.flair)}</div>
                    <div class="text-[10px] text-slate-500">Hide posts tagged with #${escapeHtml(post.flair)}</div>
                  </div>
                </div>
                <span class="text-slate-500 text-xs">→</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-[var(--surface-rule)] bg-surface-base flex justify-end">
          <button
            type="button"
            data-action="close-why-modal"
            class="min-h-[44px] px-5 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-sm font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    `;

    if (el) {
      el.innerHTML = html;
      el.classList.remove('hidden');
      el.style.display = '';
      el.style.pointerEvents = '';
      this.bindEvents();
    }
    return html;
  }

  private bindEvents(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const actionEl = target.closest('[data-action]') as HTMLElement | null;
      if (!actionEl) {
        if (target === this.container) {
          this.close();
        }
        return;
      }

      const action = actionEl.getAttribute('data-action');
      if (action === 'close-why-modal') {
        this.close();
      } else if (action === 'why-not-interested') {
        const postId = actionEl.getAttribute('data-post-id') || '';
        if (postId) {
          feedPersonalization.markNotInterested(postId);
          clientStore.showToast('Post hidden and marked not interested for this context', 'info');
          clientStore.notifySync();
          this.close();
        }
      } else if (action === 'why-less-like-this') {
        const postId = actionEl.getAttribute('data-post-id') || '';
        if (postId) {
          feedPersonalization.recordInteraction(postId, 'skip', 1000);
          clientStore.showToast('Recommendation signals tuned: you will see less of this content', 'info');
          clientStore.notifySync();
          this.close();
        }
      } else if (action === 'why-mute-author') {
        const authorFP = actionEl.getAttribute('data-author-fp') || '';
        if (authorFP) {
          feedPersonalization.muteAuthor(authorFP);
          clientStore.showToast('Author muted from your feeds', 'info');
          clientStore.notifySync();
          this.close();
        }
      } else if (action === 'why-mute-tag') {
        const tag = actionEl.getAttribute('data-tag') || '';
        if (tag) {
          feedPersonalization.muteTag(tag);
          clientStore.showToast(`Tag #${tag} muted from your feeds`, 'info');
          clientStore.notifySync();
          this.close();
        }
      }
    });
  }
}

export const whyThisPostModal = new WhyThisPostModal();
if (typeof window !== 'undefined') {
  (window as any).whyThisPostModal = whyThisPostModal;
}
