/**
 * @file share-to-messages-modal.ts
 * @package @aetheris/client-ui
 * @description Direct Post Sharing to Private Messages or Community Channels.
 * Allows users to easily share sovereign publications directly into conversation threads
 * with rich embed cards and optional context notes.
 */

import { clientStore } from './client-state.js';
import { sovereignDM, type DMConversation } from './sovereign-dm.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { profileView } from './profile-view.js';
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

export class ShareToMessagesModal {
  private container: HTMLElement | null = null;
  private currentPostId: string | null = null;
  private selectedDestination: { type: 'dm' | 'channel'; target: string; label: string } | null = null;

  public isOpen(): boolean {
    return this.currentPostId !== null;
  }

  public getActivePostId(): string | null {
    return this.currentPostId;
  }

  public open(postId: string): void {
    this.currentPostId = postId;
    this.selectedDestination = null;
    this.render();
  }

  public close(): void {
    if (this.container) {
      this.container.classList.add('hidden');
      this.container.innerHTML = '';
    }
    this.currentPostId = null;
    this.selectedDestination = null;
  }

  private ensureContainer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('share-to-messages-modal-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'share-to-messages-modal-root';
      el.className = 'fixed inset-0 z-[10003] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md hidden select-none';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', 'Share to Messages');
      document.body.appendChild(el);
    }
    this.container = el;
    return el;
  }

  public render(): string {
    const postId = this.currentPostId;
    if (!postId) return '';
    const el = this.ensureContainer();

    const post = clientStore.posts.find(p => p.id === postId);
    const postTitle = post?.title || post?.content.slice(0, 60) || `Post ${postId.slice(0, 8)}`;

    // Gather DM conversations
    const dmConversations: DMConversation[] = typeof sovereignDM?.getConversations === 'function' 
      ? sovereignDM.getConversations() 
      : Array.from(((sovereignDM as any)?.conversations?.values?.() || []) as DMConversation[]);
    // Gather joined communities
    const communities = sovereignCircleEngine.getAllCircles();

    const html = `
      <div class="w-full max-w-md bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="text-base text-[var(--color-accent,#e59b3c)]">${renderIcon('messages', { size: 20 })}</span>
            <h3 class="text-sm font-bold text-slate-100">Share to Conversation</h3>
          </div>
          <button 
            type="button" 
            data-action="close-share-modal" 
            class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-raised cursor-pointer transition-colors"
            aria-label="Close"
          >
            ${renderIcon('close', { size: 16 })}
          </button>
        </div>

        <!-- Post Preview Snippet -->
        <div class="px-5 py-3 bg-surface-raised/40 border-b border-white/5 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-surface-base border border-white/10 flex items-center justify-center text-xs text-[var(--color-accent,#e59b3c)] font-bold shrink-0">
            📄
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-xs font-semibold text-slate-200 truncate">${escapeHtml(postTitle)}</div>
            <div class="text-[11px] text-slate-500 font-mono">/p/${escapeHtml(postId)}</div>
          </div>
        </div>

        <!-- Destination Selector List -->
        <div class="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          <!-- Private DMs Section -->
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Direct Messages</div>
            ${dmConversations.length === 0 ? `
              <p class="text-xs text-slate-500 py-1 italic">No active direct message threads.</p>
            ` : `
              <div class="space-y-1">
                ${dmConversations.map(conv => {
                  const profile = profileView.getProfile(conv.peerFingerprint);
                  const name = profile?.name || profile?.handle || `@${conv.peerFingerprint.slice(0, 10)}`;
                  const isSelected = this.selectedDestination?.type === 'dm' && this.selectedDestination.target === conv.peerFingerprint;
                  return `
                    <button
                      type="button"
                      data-action="select-share-dest"
                      data-dest-type="dm"
                      data-dest-target="${escapeHtml(conv.peerFingerprint)}"
                      data-dest-label="${escapeHtml(name)}"
                      class="w-full text-left p-2.5 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-[var(--color-accent,#e59b3c)]/15 border border-[var(--color-accent,#e59b3c)]/30 text-white' 
                          : 'hover:bg-surface-raised text-slate-300'
                      }"
                    >
                      <div class="flex items-center gap-2.5 min-w-0">
                        ${renderAvatar(profile?.avatar, conv.peerFingerprint, { size: 24 })}
                        <span class="text-xs font-medium truncate">${escapeHtml(name)}</span>
                      </div>
                      ${isSelected ? '<span class="text-[var(--color-accent,#e59b3c)] text-xs font-bold">✓</span>' : ''}
                    </button>
                  `;
                }).join('')}
              </div>
            `}
          </div>

          <!-- Community Channels Section -->
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Community Channels</div>
            <div class="space-y-1">
              ${communities.map(c => {
                const isSelected = this.selectedDestination?.type === 'channel' && this.selectedDestination.target === c.channelId;
                return `
                  <button
                    type="button"
                    data-action="select-share-dest"
                    data-dest-type="channel"
                    data-dest-target="${escapeHtml(c.channelId)}"
                    data-dest-label="${escapeHtml(c.displayName || c.name)}"
                    class="w-full text-left p-2.5 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-[var(--color-accent,#e59b3c)]/15 border border-[var(--color-accent,#e59b3c)]/30 text-white' 
                        : 'hover:bg-surface-raised text-slate-300'
                    }"
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <span class="w-6 h-6 rounded-lg bg-surface-base border border-white/10 flex items-center justify-center text-xs text-slate-300 shrink-0">
                        💬
                      </span>
                      <span class="text-xs font-medium truncate">c/${escapeHtml(c.name)}</span>
                    </div>
                    ${isSelected ? '<span class="text-[var(--color-accent,#e59b3c)] text-xs font-bold">✓</span>' : ''}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Optional Message Note -->
          <div class="pt-2 border-t border-white/10">
            <label for="input-share-modal-note" class="block text-xs font-medium text-slate-300 mb-1.5">
              Add a note (optional)
            </label>
            <input 
              id="input-share-modal-note" 
              type="text" 
              placeholder="What do you think of this?"
              class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e59b3c)]"
              autocomplete="off"
            />
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="p-4 border-t border-white/10 bg-surface-base flex items-center justify-between gap-3">
          <button
            type="button"
            data-action="close-share-modal"
            class="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-surface-raised cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            data-action="submit-share-to-messages"
            class="px-5 py-2 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:opacity-95 text-slate-950 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            ${this.selectedDestination ? '' : 'disabled'}
          >
            Send Link
          </button>
        </div>
      </div>
    `;

    if (el) {
      el.innerHTML = html;
      el.classList.remove('hidden');
      this.bindEvents();
    }
    return html;
  }

  public selectDestination(type: 'dm' | 'channel', target: string, label: string): void {
    this.selectedDestination = { type, target, label };
    this.render();
  }

  public async submitShare(): Promise<void> {
    if (!this.currentPostId || !this.selectedDestination) return;

    const noteInput = document.getElementById('input-share-modal-note') as HTMLInputElement | null;
    const note = noteInput?.value.trim() || '';
    const origin = typeof window !== 'undefined' ? (window.location.origin || '') : 'https://urefy.com';
    const link = `${origin}/p/${encodeURIComponent(this.currentPostId)}`;
    const fullMessage = note ? `${note}\n${link}` : link;

    try {
      if (this.selectedDestination.type === 'dm') {
        await sovereignDM.sendMessage(this.selectedDestination.target, fullMessage);
      } else {
        clientStore.sendMessage(this.selectedDestination.target, fullMessage);
      }
      clientStore.showToast(`Shared to ${this.selectedDestination.label}`, 'success');
      this.close();
    } catch (err) {
      clientStore.showToast(err instanceof Error ? err.message : 'Failed to send message', 'warning');
    }
  }

  private bindEvents(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const actionEl = target.closest('[data-action]') as HTMLElement | null;
      if (!actionEl) {
        // Click outside modal container dismisses
        if (target === this.container) {
          this.close();
        }
        return;
      }

      const action = actionEl.getAttribute('data-action');
      if (action === 'close-share-modal') {
        this.close();
      } else if (action === 'select-share-dest') {
        const destType = actionEl.getAttribute('data-dest-type') as 'dm' | 'channel';
        const destTarget = actionEl.getAttribute('data-dest-target') || '';
        const destLabel = actionEl.getAttribute('data-dest-label') || '';
        this.selectDestination(destType, destTarget, destLabel);
      } else if (action === 'submit-share-to-messages') {
        void this.submitShare();
      }
    });
  }
}

export const shareToMessagesModal = new ShareToMessagesModal();
if (typeof window !== 'undefined') {
  (window as any).shareToMessagesModal = shareToMessagesModal;
}
