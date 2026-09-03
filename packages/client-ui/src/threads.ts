import { awardsSystem, PostAward } from './awards.js';
import { markdownRenderer } from './markdown-renderer.js';

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
  isCollapsed: boolean;
  isReplying?: boolean;
  isAuthorOP?: boolean;
  awards?: PostAward[];
  replies: ThreadComment[];
}

export const DEPTH_COLORS = [
  '#00e5ff', // Depth 1: Cyphr Cyan
  '#7c3aed', // Depth 2: Aether Violet
  '#10b981', // Depth 3: Signal Emerald
  '#f59e0b', // Depth 4: Amber Gold
  '#ec4899', // Depth 5: Rose Pink
  '#3b82f6', // Depth 6: Electric Blue
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
  public replyingCommentId: string | null = null;

  constructor() {
    this.seedInitialThread();
    this._initGlobalDomListeners();
  }

  private seedInitialThread(): void {
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

  public getRootComments(): ThreadComment[] {
    return this.rootCommentIds.map(id => this.comments.get(id)!).filter(Boolean);
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

  public addReply(parentId: string, authorFingerprint: string, content: string, postId: string = 'post-1'): ThreadComment {
    const parent = this.comments.get(parentId);
    const newComment: ThreadComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      postId: parent?.postId || postId,
      authorFingerprint,
      authorRole: 'MEMBER',
      content,
      createdAt: Date.now(),
      depth: parent ? parent.depth + 1 : 0,
      meritScore: 1,
      userVote: 1,
      isCollapsed: false,
      replies: [],
    };

    this.comments.set(newComment.id, newComment);

    if (parent) {
      parent.replies.push(newComment);
    } else {
      this.rootCommentIds.unshift(newComment.id);
    }

    this.replyingCommentId = null;
    return newComment;
  }

  public endorseComment(commentId: string): void {
    this.voteComment(commentId, 1);
  }

  public voteComment(commentId: string, direction: number): void {
    const c = this.comments.get(commentId);
    if (!c) return;

    if (c.userVote === direction) {
      c.meritScore -= direction;
      c.userVote = 0;
    } else {
      if (c.userVote !== undefined && c.userVote !== 0) {
        c.meritScore -= c.userVote;
      }
      c.meritScore += direction;
      c.userVote = direction;
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

    if (c.isCollapsed) {
      return `
        <div id="comment-${c.id}" class="py-1 px-2.5 rounded-xl bg-surface-base/50 text-xs text-slate-400 flex items-center space-x-2 border border-white/5 font-mono select-none my-1">
          <button data-collapse-id="${c.id}" class="btn-toggle-collapse text-slate-400 hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-surface-overlay">
            [+]
          </button>
          <span class="font-bold text-slate-200">@id:${c.authorFingerprint.slice(0, 8)}</span>
          <span>• ${c.meritScore} Merit</span>
          <span class="text-slate-500">• (${c.replies.length} replies collapsed)</span>
        </div>
      `;
    }

    return `
      <div 
        id="comment-${c.id}" 
        class="relative group/comment transition-all my-1.5 ${c.depth > 0 ? 'ml-3 sm:ml-5 pl-2.5 sm:pl-3.5' : ''}" 
        style="${c.depth > 0 ? `border-left: 2px solid ${color}40;` : ''}"
      >
        <div class="p-3 rounded-xl bg-surface-base/80 hover:bg-surface-base border border-white/5 hover:border-white/10 transition-all space-y-2 shadow-xs">
          
          <!-- COMMENT HEADER: AVATAR, AUTHOR, OP TAG, YOU TAG, TIMESTAMP, COLLAPSE -->
          <div class="flex items-center justify-between text-xs gap-2 flex-wrap">
            <div class="flex items-center space-x-2 flex-wrap gap-y-1">
              <div class="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 flex items-center justify-center font-mono text-[8px] font-bold text-white shrink-0">
                ${c.authorFingerprint.substring(0, 2).toUpperCase()}
              </div>

              <span class="font-mono text-xs font-bold" style="color: ${color};">
                @id:${c.authorFingerprint.substring(0, 8)}
              </span>

              ${isOP ? `
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono tracking-tight" title="Original Poster">
                  OP
                </span>
              ` : ''}

              ${isMe ? `
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono" title="You">
                  YOU
                </span>
              ` : ''}

              ${c.authorRole ? `
                <span class="text-[8px] font-mono px-1 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">
                  ${c.authorRole}
                </span>
              ` : ''}

              <span class="text-slate-600 text-[10px]">•</span>
              <span class="text-[10px] text-slate-500 font-mono">${time}</span>

              <!-- COMMENT AWARDS BADGES -->
              ${awardsSystem.renderCommentAwardBadges(c.id)}
            </div>

            <!-- COLLAPSE BUTTON -->
            <button 
              data-collapse-id="${c.id}" 
              class="btn-toggle-collapse text-[10px] text-slate-500 hover:text-slate-200 font-mono px-1.5 py-0.5 rounded hover:bg-surface-overlay cursor-pointer ml-auto"
              title="Collapse comment thread"
            >
              [-]
            </button>
          </div>

          <!-- COMMENT CONTENT BODY -->
          <div class="text-xs text-slate-200 leading-relaxed select-text font-normal break-words pl-0.5">
            ${markdownRenderer.renderMarkdown(c.content)}
          </div>

          <!-- COMMENT ACTION FOOTER: VOTES, REPLY, AWARD -->
          <div class="flex items-center space-x-3 pt-1 text-xs text-slate-400 font-mono border-t border-white/5">
            
            <!-- VOTE PILL -->
            <div class="flex items-center space-x-1 bg-surface-overlay/80 px-2 py-0.5 rounded-lg border border-white/5">
              <button 
                data-comment-vote="${c.id}" 
                data-dir="1" 
                class="btn-comment-upvote hover:text-indigo-400 p-0.5 transition-colors cursor-pointer ${c.userVote === 1 ? 'text-indigo-400 font-bold' : 'text-slate-400'}" 
                title="Endorse (+1 Merit)"
              >
                ▲
              </button>
              <span class="text-[11px] font-bold px-1 ${c.userVote === 1 ? 'text-indigo-400' : c.userVote === -1 ? 'text-rose-500' : 'text-slate-300'}">
                ${c.meritScore}
              </span>
              <button 
                data-comment-vote="${c.id}" 
                data-dir="-1" 
                class="btn-comment-downvote hover:text-rose-500 p-0.5 transition-colors cursor-pointer ${c.userVote === -1 ? 'text-rose-500 font-bold' : 'text-slate-400'}" 
                title="Divergent View (-1)"
              >
                ▼
              </button>
            </div>

            <!-- REPLY BUTTON -->
            <button 
              data-toggle-reply="${c.id}" 
              class="btn-comment-toggle-reply flex items-center space-x-1 px-2 py-0.5 rounded-lg hover:bg-surface-overlay hover:text-white transition-colors cursor-pointer"
            >
              <span>💬</span>
              <span>Reply</span>
            </button>

            <!-- BESTOW AWARD ON COMMENT -->
            ${awardsSystem.renderGiveCommentAwardButton(c.id, c.postId || 'post-1', 'GUARDIAN')}
          </div>

          <!-- INLINE REPLY COMPOSER BOX -->
          ${isReplyingThis ? `
            <div class="mt-2.5 p-3 rounded-xl bg-surface-raised border border-indigo-500/30 space-y-2 animate-in fade-in duration-100">
              <div class="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                <span class="text-indigo-400">↳</span>
                <span>Replying to <span class="text-white font-bold">@id:${c.authorFingerprint.slice(0, 8)}</span>:</span>
              </div>
              <textarea 
                id="input-inline-reply-${c.id}"
                rows="2"
                placeholder="What are your thoughts on this cryptographic proof? (Markdown supported)"
                class="w-full bg-surface-base border border-white/10 focus:border-indigo-500 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none font-sans"
                autofocus
              ></textarea>
              <div class="flex items-center justify-end space-x-2">
                <button 
                  type="button" 
                  data-cancel-reply="${c.id}" 
                  class="btn-cancel-reply px-3 py-1 text-xs font-mono text-slate-400 hover:text-white rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  data-submit-reply="${c.id}" 
                  class="btn-submit-reply px-3.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
                >
                  <span>⚡</span>
                  <span>Post Reply</span>
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

  public renderCommentTree(
    comments: ThreadComment[] = this.getRootComments(),
    postAuthorFP: string = 'c3dc28cb705e',
    currentFP: string = ''
  ): string {
    return `
      <div class="space-y-2 thread-comments-root">
        ${comments.map(c => this.renderCommentNode(c, postAuthorFP, currentFP)).join('')}
      </div>
    `;
  }

  private _initGlobalDomListeners(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

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
          this.voteComment(cid, 1);
          this._refreshCommentsTreeInDom();
        }
        return;
      }

      const downvoteBtn = target.closest('.btn-comment-downvote') as HTMLElement | null;
      if (downvoteBtn) {
        e.preventDefault();
        const cid = downvoteBtn.getAttribute('data-comment-vote');
        if (cid) {
          this.voteComment(cid, -1);
          this._refreshCommentsTreeInDom();
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
            const authorFP = (typeof window !== 'undefined' ? window.activeUserFP : undefined) || 'self.sovereign';
            this.addReply(cid, authorFP, text);
            this._refreshCommentsTreeInDom();
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
      treeEl.outerHTML = this.renderCommentTree();
    }
  }
}

export const threadManager = new ThreadManager();
