import { awardsSystem, PostAward } from './awards.js';
import { markdownRenderer } from './markdown-renderer.js';
import { t } from './i18n.js';
import { isDemoModeEnabled } from './demo-mode.js';
import { socialSafety } from './social-safety.js';

export interface ThreadComment {
  id: string;
  postId?: string;
  authorFingerprint: string;
  authorRole?: string;
  content: string;
  createdAt: number;
  depth: number;
  meritScore: number;
  userVote?: number; // 1, 0, -1
  likesCount?: number;
  userLiked?: boolean;
  isCollapsed: boolean;
  isReplying?: boolean;
  isAuthorOP?: boolean;
  awards?: PostAward[];
  replies: ThreadComment[];
}

export const DEPTH_COLORS = [
  'rgba(255, 255, 255, 0.12)', // Depth 1: Neutral Guide
  'rgba(255, 255, 255, 0.08)', // Depth 2: Subtle Guide
  'rgba(255, 255, 255, 0.12)', // Depth 3: Neutral Guide
  'rgba(255, 255, 255, 0.08)', // Depth 4: Subtle Guide
  'rgba(255, 255, 255, 0.12)', // Depth 5: Neutral Guide
  'rgba(255, 255, 255, 0.08)', // Depth 6: Subtle Guide
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class ThreadManager {
  private comments: Map<string, ThreadComment> = new Map();
  private rootCommentIds: string[] = [];
  private postRootComments: Map<string, string[]> = new Map();
  public replyingCommentId: string | null = null;
  public sortMode: 'best' | 'top' | 'new' | 'old' = 'best';

  constructor() {
    if (isDemoModeEnabled()) {
      this.seedInitialThread();
    }
    this._initGlobalDomListeners();
  }

  public loadDemoData(): void {
    this.seedInitialThread();
  }

  public seedInitialThread(): void {
    const root1: ThreadComment = {
      id: 'c-root-1',
      postId: 'post-1',
      authorFingerprint: 'c3dc28cb705e',
      authorRole: 'ARCHIVIST',
      content: 'Kernel binary validated: zero PE RWX sections detected. Entropy is stable at 6.12. Hashes match the git commit tree.',
      createdAt: Date.now() - 1000 * 60 * 45,
      depth: 0,
      meritScore: 18,
      userVote: 0,
      isCollapsed: false,
      isAuthorOP: true,
      replies: [
        {
          id: 'c-sub-1',
          postId: 'post-1',
          authorFingerprint: 'a89104fa2211',
          authorRole: 'MODERATOR',
          content: 'Confirmed on Linux x86_64 under Wayland. PipeWire audio driver connects with zero latency and -54dB noise floor.',
          createdAt: Date.now() - 1000 * 60 * 30,
          depth: 1,
          meritScore: 9,
          userVote: 0,
          isCollapsed: false,
          replies: [
            {
              id: 'c-sub-1-1',
              postId: 'post-1',
              authorFingerprint: '13e0cfc6b203',
              authorRole: 'MEMBER',
              content: 'Excellent. The MLS TreeKEM re-keying also completed in 0.8ms during join. No frame drops observed.',
              createdAt: Date.now() - 1000 * 60 * 15,
              depth: 2,
              meritScore: 5,
              userVote: 0,
              isCollapsed: false,
              replies: [],
            }
          ],
        },
        {
          id: 'c-sub-2',
          postId: 'post-1',
          authorFingerprint: 'f40019bc88a2',
          authorRole: 'MEMBER',
          content: 'Does this release include the SFrame E2EE RTP audio packet payload header?',
          createdAt: Date.now() - 1000 * 60 * 20,
          depth: 1,
          meritScore: 3,
          userVote: 0,
          isCollapsed: false,
          replies: [],
        }
      ],
    };

    this.rootCommentIds = [root1.id];
    this.registerRecursive(root1);
  }

  private registerRecursive(c: ThreadComment): void {
    this.comments.set(c.id, c);
    for (const r of c.replies) {
      this.registerRecursive(r);
    }
  }

  public getComment(id: string): ThreadComment | undefined {
    return this.comments.get(id);
  }

  public setSortMode(mode: 'best' | 'top' | 'new' | 'old'): void {
    this.sortMode = mode;
  }

  public sortComments(comments: ThreadComment[]): ThreadComment[] {
    const list = [...comments];
    if (this.sortMode === 'best') {
      list.sort((a, b) => {
        const scoreA = (a.meritScore + 1) / Math.pow((Date.now() - a.createdAt) / 3600000 + 2, 1.2);
        const scoreB = (b.meritScore + 1) / Math.pow((Date.now() - b.createdAt) / 3600000 + 2, 1.2);
        return scoreB - scoreA;
      });
    } else if (this.sortMode === 'top') {
      list.sort((a, b) => b.meritScore - a.meritScore);
    } else if (this.sortMode === 'new') {
      list.sort((a, b) => b.createdAt - a.createdAt);
    } else if (this.sortMode === 'old') {
      list.sort((a, b) => a.createdAt - b.createdAt);
    }
    return list;
  }

  public getRootComments(): ThreadComment[] {
    const raw = this.rootCommentIds.map(id => this.comments.get(id)!).filter(Boolean);
    return this.sortComments(raw);
  }

  public getRootCommentsForPost(postId?: string): ThreadComment[] {
    if (!postId) return this.getRootComments();
    const rootIds = this.postRootComments.get(postId);
    if (rootIds) {
      const raw = rootIds.map(id => this.comments.get(id)!).filter(Boolean);
      return this.sortComments(raw);
    }
    // Search registered comments matching this post
    const matched: ThreadComment[] = [];
    for (const c of this.comments.values()) {
      if (c.postId === postId && c.depth === 0) {
        matched.push(c);
      }
    }
    if (matched.length > 0) {
      this.postRootComments.set(postId, matched.map(c => c.id));
      return this.sortComments(matched);
    }
    // If post-1 and demo mode, fallback to initial demo thread
    if (postId === 'post-1' && this.rootCommentIds.length > 0) {
      return this.getRootComments();
    }
    return [];
  }

  /**
   * Fetches real comments for a post from Cloudflare D1 / edge API (/api/comments?postId=...)
   */
  public async loadCommentsForPost(postId: string): Promise<ThreadComment[]> {
    if (!postId || typeof window === 'undefined' || typeof fetch === 'undefined') {
      return this.getRootCommentsForPost(postId);
    }

    try {
      let fp = '';
      try {
        const { clientStore } = await import('./client-state.js');
        await clientStore.identityPersistence;
        fp = clientStore.keypair?.fingerprint || '';
      } catch (_) {}

      const url = `/api/comments?postId=${encodeURIComponent(postId)}${fp ? `&userFingerprint=${encodeURIComponent(fp)}` : ''}`;
      const res = await fetch(url, {
        headers: fp ? { 'x-user-fingerprint': fp } : {},
      });
      if (!res.ok) {
        return this.getRootCommentsForPost(postId);
      }
      const data = await res.json() as any;
      if (!data?.success || !Array.isArray(data.comments)) {
        return this.getRootCommentsForPost(postId);
      }

      const edgeComments: any[] = data.comments;
      // A successful response replaces this post's loaded page, including an
      // empty page after moderation. Stale comments must never reappear.
      for (const [id, comment] of this.comments) if (comment.postId === postId) this.comments.delete(id);
      if (edgeComments.length === 0) {
        // If post has no comments, clear postRootComments for this post
        this.postRootComments.set(postId, []);
        return [];
      }

      // Build comments node map
      const nodeMap = new Map<string, ThreadComment>();
      const rootList: ThreadComment[] = [];

      for (const ec of edgeComments) {
        const awardsList = Array.isArray(ec.awards) ? ec.awards : [];
        const tc: ThreadComment = {
          id: ec.id,
          postId: ec.postId || postId,
          authorFingerprint: ec.authorId || 'anon',
          authorRole: ec.authorRole || 'MEMBER',
          content: ec.content || '',
          createdAt: Number(ec.createdAt) || Date.now(),
          depth: 0,
          meritScore: Number(ec.meritVotes) || 0,
          userVote: Number(ec.userVote) || 0,
          likesCount: Number(ec.likesCount) || 0,
          userLiked: Boolean(ec.userLiked),
          awards: awardsList,
          isCollapsed: false,
          replies: [],
        };
        nodeMap.set(tc.id, tc);
        this.comments.set(tc.id, tc);

        if (awardsList.length > 0) {
          awardsSystem.hydrateCommentAwards(tc.id, awardsList);
        }
      }

      // Link parents and children
      for (const ec of edgeComments) {
        const tc = nodeMap.get(ec.id)!;
        if (ec.parentId && nodeMap.has(ec.parentId)) {
          const parent = nodeMap.get(ec.parentId)!;
          tc.depth = parent.depth + 1;
          parent.replies.push(tc);
        } else {
          tc.depth = 0;
          rootList.push(tc);
        }
      }

      const rootIds = rootList.map(r => r.id);
      this.postRootComments.set(postId, rootIds);
      return this.sortComments(rootList);
    } catch (err) {
      console.warn('[ThreadManager] Failed to load comments from edge API:', err);
      return this.getRootCommentsForPost(postId);
    }
  }

  public toggleCollapse(commentId: string): void {
    const c = this.comments.get(commentId);
    if (c) {
      c.isCollapsed = !c.isCollapsed;
    }
  }

  public toggleReplying(commentId: string): void {
    if (this.replyingCommentId === commentId) {
      this.replyingCommentId = null;
    } else {
      this.replyingCommentId = commentId;
    }
  }

  public addReply(parentId: string, authorFingerprint: string, content: string, postId: string = 'post-1', persisted?: { id: string; createdAt: number; meritScore: number }): ThreadComment {
    const parent = this.comments.get(parentId);
    const targetPostId = parent?.postId || postId;
    const newComment: ThreadComment = {
      id: persisted?.id || `c-${Date.now()}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`,
      postId: targetPostId,
      authorFingerprint,
      authorRole: 'MEMBER',
      content,
      createdAt: persisted?.createdAt ?? Date.now(),
      depth: parent ? parent.depth + 1 : 0,
      meritScore: persisted?.meritScore ?? 1,
      userVote: persisted ? 0 : 1,
      isCollapsed: false,
      replies: [],
    };

    this.comments.set(newComment.id, newComment);

    if (parent && parent.id !== targetPostId) {
      parent.replies.push(newComment);
    } else {
      const roots = this.postRootComments.get(targetPostId) || [];
      roots.unshift(newComment.id);
      this.postRootComments.set(targetPostId, roots);
      if (!this.rootCommentIds.includes(newComment.id)) {
        this.rootCommentIds.unshift(newComment.id);
      }
    }

    this.replyingCommentId = null;
    return newComment;
  }

  public async endorseComment(commentId: string): Promise<void> {
    await this.voteComment(commentId, 1);
  }

  public updateCommentVoteInDom(commentId: string): void {
    if (typeof document === 'undefined') return;
    const c = this.comments.get(commentId);
    if (!c) return;
    const scoreSpans = document.querySelectorAll<HTMLElement>(`[data-comment-score="${commentId}"]`);
    scoreSpans.forEach(span => {
      span.textContent = String(c.meritScore);
      span.className = `comment-merit-score text-[11px] font-bold px-1 tabular-nums ${c.userVote === 1 ? 'text-[var(--color-accent,#e59b3c)]' : c.userVote === -1 ? 'text-rose-500' : 'text-slate-300'}`;
    });
    const upvoteBtns = document.querySelectorAll<HTMLButtonElement>(`.btn-comment-upvote[data-comment-vote="${commentId}"]`);
    upvoteBtns.forEach(btn => {
      if (c.userVote === 1) {
        btn.className = 'btn-comment-upvote text-[var(--color-accent,#e59b3c)] font-bold p-1 transition-colors cursor-pointer';
      } else {
        btn.className = 'btn-comment-upvote hover:text-[var(--color-accent,#e59b3c)] p-1 transition-colors cursor-pointer text-slate-400';
      }
    });
    const downvoteBtns = document.querySelectorAll<HTMLButtonElement>(`.btn-comment-downvote[data-comment-vote="${commentId}"]`);
    downvoteBtns.forEach(btn => {
      if (c.userVote === -1) {
        btn.className = 'btn-comment-downvote text-rose-500 font-bold p-1 transition-colors cursor-pointer';
      } else {
        btn.className = 'btn-comment-downvote hover:text-rose-500 p-1 transition-colors cursor-pointer text-slate-400';
      }
    });
  }

  public updateCommentLikeInDom(commentId: string): void {
    if (typeof document === 'undefined') return;
    const c = this.comments.get(commentId);
    if (!c) return;
    const btns = document.querySelectorAll<HTMLButtonElement>(`[data-comment-like="${commentId}"]`);
    btns.forEach(btn => {
      const heartSpan = btn.querySelector('.heart-icon');
      const countSpan = btn.querySelector('.likes-count');
      if (heartSpan) heartSpan.textContent = c.userLiked ? '❤️' : '🤍';
      if (countSpan) countSpan.textContent = String(c.likesCount || 0);
      if (c.userLiked) {
        btn.classList.add('text-rose-400', 'font-medium');
        btn.classList.remove('text-slate-400', 'hover:text-white');
      } else {
        btn.classList.remove('text-rose-400', 'font-medium');
        btn.classList.add('text-slate-400', 'hover:text-white');
      }
    });
  }

  public async voteComment(commentId: string, direction: number): Promise<void> {
    const c = this.comments.get(commentId);
    if (!c) return;

    const prevMerit = c.meritScore;
    const prevVote = c.userVote ?? 0;

    let targetDirection = direction;
    if (prevVote === direction) {
      targetDirection = 0;
    }

    // Optimistic localized UI update
    const delta = targetDirection - prevVote;
    c.meritScore = prevMerit + delta;
    c.userVote = targetDirection;
    this.updateCommentVoteInDom(commentId);

    try {
      const { persistCommentVote } = await import('./interaction-transport.js');
      const res = await persistCommentVote(commentId, targetDirection);
      c.meritScore = res.meritVotes;
      c.userVote = res.userVote;
      this.updateCommentVoteInDom(commentId);
    } catch (err: any) {
      c.meritScore = prevMerit;
      c.userVote = prevVote;
      this.updateCommentVoteInDom(commentId);
      const { clientStore } = await import('./client-state.js');
      clientStore.showToast(err?.message || 'Failed to save comment vote', 'warning');
    }
  }

  public async likeComment(commentId: string): Promise<void> {
    const c = this.comments.get(commentId);
    if (!c) return;

    const prevLiked = !!c.userLiked;
    const prevCount = c.likesCount || 0;
    const newLiked = !prevLiked;
    const newCount = Math.max(0, prevCount + (newLiked ? 1 : -1));

    // Optimistic localized UI update
    c.userLiked = newLiked;
    c.likesCount = newCount;
    this.updateCommentLikeInDom(commentId);

    try {
      const { persistInteraction } = await import('./interaction-transport.js');
      const res = await persistInteraction(commentId, 'like', newLiked, undefined, 'comment');
      c.userLiked = res.active;
      c.likesCount = res.newCount;
      this.updateCommentLikeInDom(commentId);
    } catch (err: any) {
      c.userLiked = prevLiked;
      c.likesCount = prevCount;
      this.updateCommentLikeInDom(commentId);
      const { clientStore } = await import('./client-state.js');
      clientStore.showToast(err?.message || 'Failed to save comment like', 'warning');
    }
  }

  // ─── Rendering Methods ───────────────────────────────────────────────────

  public renderCommentNode(
    c: ThreadComment,
    postAuthorFP: string = 'c3dc28cb705e',
    currentFP: string = ''
  ): string {
    const color = DEPTH_COLORS[c.depth % DEPTH_COLORS.length];
    const time = new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isOP = c.authorFingerprint === postAuthorFP || c.isAuthorOP;
    const isMe = currentFP && c.authorFingerprint === currentFP;
    const isReplyingThis = this.replyingCommentId === c.id;

    const profile = (typeof window !== 'undefined' && (window as any).profileView)
      ? (window as any).profileView.getProfile(c.authorFingerprint)
      : null;
    const authorName = profile?.name || (c.authorFingerprint.startsWith('fp_') ? c.authorFingerprint.slice(3).replace(/_/g, ' ') : `Member ${c.authorFingerprint.substring(0, 6)}`);
    const authorHandle = profile?.handle ? `@${profile.handle.replace(/^@/, '')}` : `@${c.authorFingerprint.substring(0, 8)}`;
    const authorAvatar = profile?.avatar;

    if (socialSafety.isBlocked(c.authorFingerprint)) {
      return `
        <div id="comment-${c.id}" class="py-1.5 px-3 rounded-xl bg-surface-base/40 text-xs text-slate-500 flex items-center space-x-2 border border-white/5 font-mono select-none my-1 opacity-70">
          <span class="text-rose-400">🚫</span>
          <span>[Comment from blocked user hidden]</span>
        </div>
      `;
    }

    if (c.isCollapsed) {
      return `
        <div id="comment-${c.id}" class="py-1 px-2.5 rounded-xl bg-surface-base/50 text-xs text-slate-400 flex items-center space-x-2 border border-white/5 font-mono select-none my-1">
          <button data-collapse-id="${c.id}" class="btn-toggle-collapse text-slate-400 hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-surface-overlay">
            [+]
          </button>
          <span class="font-bold text-slate-200">${escapeHtml(authorName)}</span>
          <span class="text-slate-500 text-[11px]">${escapeHtml(authorHandle)}</span>
          <span>• ${c.meritScore} Merit</span>
          <span class="text-slate-500">• (${c.replies.length} replies collapsed)</span>
        </div>
      `;
    }

    const isDeepMobile = c.depth >= 3;
    const indentClass = c.depth === 0
      ? ''
      : isDeepMobile
        ? 'ml-1 sm:ml-6 pl-1.5 sm:pl-3.5'
        : c.depth === 1
          ? 'ml-2 sm:ml-5 pl-2 sm:pl-3.5'
          : 'ml-2 sm:ml-6 pl-2 sm:pl-3.5';

    return `
      <div 
        id="comment-${c.id}" 
        class="relative group/comment transition-all my-1.5 ${indentClass}" 
        style="${c.depth > 0 ? `border-left: 2px solid ${color};` : ''}"
      >
        ${c.depth >= 5 ? `
          <div class="flex items-center space-x-1.5 text-[11px] text-slate-400 mb-1 pl-1">
            <span>↳</span>
            <span class="font-medium">Continued thread</span>
          </div>
        ` : ''}
        <div class="p-3 rounded-xl bg-surface-base/85 hover:bg-surface-base border border-white/5 hover:border-white/10 transition-all space-y-2 shadow-xs">
          
          <!-- COMMENT HEADER: AVATAR, AUTHOR, OP TAG, YOU TAG, TIMESTAMP, COLLAPSE -->
          <div class="flex items-center justify-between text-xs gap-2 flex-wrap">
            <div class="flex items-center space-x-2 flex-wrap gap-y-1">
              <button type="button" class="flex items-center space-x-2 text-left group/author hover:opacity-90 transition-opacity cursor-pointer min-h-[32px]" data-author-profile="${escapeHtml(c.authorFingerprint)}">
                ${authorAvatar ? `
                  <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)}" class="w-6 h-6 rounded-full object-cover shrink-0 border border-white/10" loading="lazy" />
                ` : `
                  <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-600/60 to-slate-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                    ${c.authorFingerprint.substring(0, 2).toUpperCase()}
                  </div>
                `}
                <div class="flex items-baseline space-x-1.5">
                  <strong class="font-bold text-xs text-white group-hover/author:text-[var(--color-accent,#e59b3c)] transition-colors">${escapeHtml(authorName)}</strong>
                  <span class="text-[11px] text-slate-400">${escapeHtml(authorHandle)}</span>
                </div>
              </button>

              ${isOP ? `
                <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 tracking-tight" title="Original Poster">
                  OP
                </span>
              ` : ''}

              ${isMe ? `
                <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" title="You">
                  YOU
                </span>
              ` : ''}

              ${c.authorRole ? `
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">
                  ${c.authorRole}
                </span>
              ` : ''}

              <span class="text-slate-600 text-[10px]">•</span>
              <span class="text-[11px] text-slate-400">${time}</span>

              <!-- COMMENT AWARDS BADGES -->
              ${awardsSystem.renderCommentAwardBadges(c.id)}
            </div>

            <!-- COLLAPSE BUTTON -->
            <button 
              data-collapse-id="${c.id}" 
              class="btn-toggle-collapse text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-surface-overlay cursor-pointer ml-auto min-h-[32px] flex items-center"
              title="Collapse comment thread"
            >
              [-]
            </button>
          </div>

          <!-- COMMENT CONTENT BODY -->
          <div class="text-base sm:text-[15px] text-slate-100 dark:text-slate-200 leading-[1.65] select-text font-normal break-words pl-0.5 font-sans">
            ${markdownRenderer.renderMarkdown(c.content)}
          </div>

          <!-- COMMENT ACTION FOOTER: VOTES, REPLY, AWARD -->
          <div class="flex items-center space-x-2.5 pt-1 text-xs text-slate-400 border-t border-white/5 flex-wrap gap-y-1.5">
            
            <!-- LIKE BUTTON FOR COMMENT (PRIMARY) -->
            <button 
              data-comment-like="${c.id}" 
              class="btn-comment-like flex items-center space-x-1.5 px-3 py-1 rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer min-h-[36px] sm:min-h-0 ${c.userLiked ? 'text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20' : 'text-slate-300 hover:text-white bg-surface-overlay/60 border border-white/5'}"
              title="Like comment"
            >
              <span class="heart-icon">${c.userLiked ? '❤️' : '🤍'}</span>
              <span class="likes-count text-[11px] font-bold tabular-nums">${c.likesCount || 0}</span>
            </button>

            <!-- REPLY BUTTON (PRIMARY) -->
            <button 
              data-toggle-reply="${c.id}" 
              class="btn-comment-toggle-reply flex items-center space-x-1.5 px-3 py-1 rounded-lg hover:bg-surface-overlay hover:text-white transition-colors cursor-pointer min-h-[36px] sm:min-h-0 text-slate-300 bg-surface-overlay/60 border border-white/5"
            >
              <span>💬</span>
              <span class="text-xs font-medium">${t('feed.reply', undefined, 'Reply')}</span>
            </button>

            <!-- VOTE PILL (SECONDARY) -->
            <div class="flex items-center space-x-1 bg-surface-overlay/40 px-2 py-0.5 rounded-lg border border-white/5 min-h-[36px] sm:min-h-0">
              <button 
                data-comment-vote="${c.id}" 
                data-dir="1" 
                class="btn-comment-upvote hover:text-[var(--color-accent,#e59b3c)] p-1 transition-colors cursor-pointer ${c.userVote === 1 ? 'text-[var(--color-accent,#e59b3c)] font-bold' : 'text-slate-400'}" 
                title="Endorse (+1 Merit)"
              >
                ▲
              </button>
              <span data-comment-score="${c.id}" class="comment-merit-score text-[11px] font-bold px-1 tabular-nums ${c.userVote === 1 ? 'text-[var(--color-accent,#e59b3c)]' : c.userVote === -1 ? 'text-rose-500' : 'text-slate-300'}">
                ${c.meritScore}
              </span>
              <button 
                data-comment-vote="${c.id}" 
                data-dir="-1" 
                class="btn-comment-downvote hover:text-rose-500 p-1 transition-colors cursor-pointer ${c.userVote === -1 ? 'text-rose-500 font-bold' : 'text-slate-400'}" 
                title="Divergent View (-1)"
              >
                ▼
              </button>
            </div>

            <!-- BESTOW AWARD ON COMMENT (SECONDARY) -->
            ${awardsSystem.renderGiveCommentAwardButton(c.id, c.postId || 'post-1', 'GUARDIAN')}

            <!-- COMMENT PERMALINK (SECONDARY) -->
            <button 
              data-comment-permalink="${c.id}" 
              class="btn-comment-permalink flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-surface-overlay hover:text-white transition-colors cursor-pointer min-h-[36px] sm:min-h-0 text-slate-400"
              title="Copy link to comment"
            >
              <span>🔗</span>
              <span>Link</span>
            </button>
          </div>

          <!-- INLINE REPLY COMPOSER BOX -->
          ${isReplyingThis ? `
            <div class="mt-2.5 p-3 rounded-xl bg-surface-raised border border-[var(--color-accent,#e59b3c)]/40 space-y-2 animate-in fade-in duration-100">
              <div class="text-[11px] text-slate-400 flex items-center space-x-1">
                <span class="text-[var(--color-accent,#e59b3c)]">↳</span>
                <span>Replying to <span class="text-white font-bold">${escapeHtml(authorName)}</span>:</span>
              </div>
              <textarea 
                id="input-inline-reply-${c.id}"
                rows="2"
                placeholder="Write a thoughtful reply... (Markdown supported)"
                class="w-full bg-surface-base border border-white/10 focus:border-[var(--color-accent,#e59b3c)] rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none font-sans"
              ></textarea>
              <div class="flex items-center justify-end space-x-2">
                <button 
                  type="button" 
                  data-cancel-reply="${c.id}" 
                  class="btn-cancel-reply min-h-[36px] px-3 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  data-submit-reply="${c.id}" 
                  class="btn-submit-reply min-h-[36px] px-4 py-1 text-xs font-bold bg-[var(--color-accent,#e59b3c)] text-slate-950 rounded-lg hover:brightness-105 transition-all shadow-sm cursor-pointer"
                >
                  Post Reply
                </button>
              </div>
            </div>
          ` : ''}

        </div>

        <!-- RECURSIVE NESTED REPLIES -->
        ${c.replies.length > 0 ? `
          <div class="space-y-1 mt-1">
            ${c.replies.map(r => this.renderCommentNode(r, postAuthorFP, currentFP)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  public renderSortingToolbar(): string {
    const sorts: Array<{ key: 'best' | 'top' | 'new' | 'old'; label: string; icon: string }> = [
      { key: 'best', label: 'Best', icon: '✨' },
      { key: 'top', label: 'Top', icon: '🔥' },
      { key: 'new', label: 'New', icon: '⚡' },
      { key: 'old', label: 'Old', icon: '📜' },
    ];
    return `
      <div class="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-xs">
        <span class="text-slate-400 font-mono text-[11px] font-bold uppercase tracking-wider">Sort comments:</span>
        <div class="flex items-center space-x-1 bg-surface-overlay/80 p-0.5 rounded-lg border border-white/5">
          ${sorts.map(s => `
            <button 
              data-thread-sort="${s.key}" 
              class="px-2.5 py-1 rounded-md text-[11px] font-mono cursor-pointer transition-colors ${this.sortMode === s.key ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'}"
            >
              ${s.icon} ${s.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  public renderCommentTree(
    comments: ThreadComment[] = this.getRootComments(),
    postAuthorFP: string = 'c3dc28cb705e',
    currentFP: string = '',
    postId: string = ''
  ): string {
    return `
      <div class="space-y-2 thread-comments-root" data-post-id="${postId}" data-post-author="${postAuthorFP}">
        ${this.renderSortingToolbar()}
        ${comments.map(c => this.renderCommentNode(c, postAuthorFP, currentFP)).join('')}
      </div>
    `;
  }

  private _initGlobalDomListeners(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('click', async (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Thread sort toggle
      const sortBtn = target.closest('[data-thread-sort]') as HTMLElement | null;
      if (sortBtn) {
        e.preventDefault();
        const mode = sortBtn.getAttribute('data-thread-sort') as 'best' | 'top' | 'new' | 'old';
        if (mode) {
          this.setSortMode(mode);
          this._refreshCommentsTreeInDom();
        }
        return;
      }

      // Permalink copy
      const permalinkBtn = target.closest('.btn-comment-permalink') as HTMLElement | null;
      if (permalinkBtn) {
        e.preventDefault();
        const cid = permalinkBtn.getAttribute('data-comment-permalink');
        if (cid) {
          const url = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#comment-${cid}` : `#comment-${cid}`;
          if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).catch(() => {});
          }
          permalinkBtn.innerText = '✓ Copied';
          setTimeout(() => {
            permalinkBtn.innerHTML = '<span>🔗</span><span>Link</span>';
          }, 1500);
        }
        return;
      }

      // Collapse toggle
      const collapseBtn = target.closest('.btn-toggle-collapse') as HTMLElement | null;
      if (collapseBtn) {
        e.preventDefault();
        const cid = collapseBtn.getAttribute('data-collapse-id');
        if (cid) {
          this.toggleCollapse(cid);
          this._refreshCommentsTreeInDom();
        }
        return;
      }

      // Vote on comment
      const upvoteBtn = target.closest('.btn-comment-upvote') as HTMLElement | null;
      if (upvoteBtn) {
        e.preventDefault();
        const cid = upvoteBtn.getAttribute('data-comment-vote');
        if (cid) {
          await this.voteComment(cid, 1);
        }
        return;
      }

      const downvoteBtn = target.closest('.btn-comment-downvote') as HTMLElement | null;
      if (downvoteBtn) {
        e.preventDefault();
        const cid = downvoteBtn.getAttribute('data-comment-vote');
        if (cid) {
          await this.voteComment(cid, -1);
        }
        return;
      }

      // Like comment
      const likeBtn = target.closest('.btn-comment-like') as HTMLElement | null;
      if (likeBtn) {
        e.preventDefault();
        const cid = likeBtn.getAttribute('data-comment-like');
        if (cid) {
          await this.likeComment(cid);
        }
        return;
      }

      // Toggle inline reply
      const replyToggleBtn = target.closest('.btn-comment-toggle-reply') as HTMLElement | null;
      if (replyToggleBtn) {
        e.preventDefault();
        const cid = replyToggleBtn.getAttribute('data-toggle-reply');
        if (cid) {
          this.toggleReplying(cid);
          this._refreshCommentsTreeInDom();
        }
        return;
      }

      // Cancel inline reply
      const cancelReplyBtn = target.closest('.btn-cancel-reply') as HTMLElement | null;
      if (cancelReplyBtn) {
        e.preventDefault();
        this.replyingCommentId = null;
        this._refreshCommentsTreeInDom();
        return;
      }

      // Submit inline reply
      const submitReplyBtn = target.closest('.btn-submit-reply') as HTMLElement | null;
      if (submitReplyBtn) {
        e.preventDefault();
        const cid = submitReplyBtn.getAttribute('data-submit-reply');
        if (cid) {
          const textarea = document.getElementById(`input-inline-reply-${cid}`) as HTMLTextAreaElement | null;
          const text = textarea ? textarea.value.trim() : '';
          if (text) {
            const parent = this.comments.get(cid);
            const postId = parent?.postId || 'post-1';
            submitReplyBtn.setAttribute('disabled', 'true');
            submitReplyBtn.textContent = 'Posting...';
            try {
              const { publishComment } = await import('./controllers/comment-controller.js');
              await publishComment(postId, text, cid);
              this.replyingCommentId = null;
              this._refreshCommentsTreeInDom();
            } catch (err: any) {
              const { clientStore } = await import('./client-state.js');
              clientStore.showToast(err?.message || 'Failed to post reply. Your draft is still here.', 'warning');
              submitReplyBtn.removeAttribute('disabled');
              submitReplyBtn.textContent = 'Post Reply';
            }
          }
        }
        return;
      }
    });
  }

  private _refreshCommentsTreeInDom(): void {
    if (typeof document === 'undefined') return;
    const treeEl = document.querySelector('.thread-comments-root');
    if (treeEl) {
      const postId = treeEl.getAttribute('data-post-id') || '';
      const postAuthor = treeEl.getAttribute('data-post-author') || 'c3dc28cb705e';
      const comments = postId ? this.getRootCommentsForPost(postId) : this.getRootComments();
      const currentFP = (typeof window !== 'undefined' && (window as any).clientStore?.keypair?.fingerprint) || '';
      treeEl.outerHTML = this.renderCommentTree(comments, postAuthor, currentFP, postId);
    }
    window.dispatchEvent(new CustomEvent('aetheris-detail-view-refresh'));
  }
}

export const threadManager = new ThreadManager();
