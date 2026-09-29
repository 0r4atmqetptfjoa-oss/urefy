/**
 * @file messages-capsule.ts
 * @package @aetheris/client-ui
 * @description Context Capsules: Curated syntheses of discussions, messages, links, and notes.
 * Combines conversation context and Vault integration without AI auto-summaries.
 */

import { clientStore } from './client-state.js';
import { canonicalVault } from './canonical-vault.js';
import { escapeHtml } from './dry-utils.js';

export interface CapsuleItem {
  id: string;
  senderName: string;
  senderHandle: string;
  text: string;
  timestamp: number;
}

export interface ContextCapsule {
  id: string;
  title: string;
  note: string;
  conversationContext: string; // e.g. "Direct with Elena Rostova" or "General Discussion"
  items: CapsuleItem[];
  createdAt: number;
}

class ContextCapsuleManager {
  public isOpen: boolean = false;
  public activeCapsule: ContextCapsule | null = null;
  public stagedItems: CapsuleItem[] = [];
  public targetContextName: string = '';
  public capsuleTitle: string = '';
  public capsuleNote: string = '';

  public openCreator(contextName: string, initialItems: CapsuleItem[] = []): void {
    this.isOpen = true;
    this.targetContextName = contextName;
    this.stagedItems = [...initialItems];
    this.capsuleTitle = '';
    this.capsuleNote = '';
    clientStore.notifySync();
  }

  public closeCreator(): void {
    this.isOpen = false;
    this.stagedItems = [];
    clientStore.notifySync();
  }

  public addItem(item: CapsuleItem): void {
    if (!this.stagedItems.some(i => i.id === item.id)) {
      this.stagedItems.push(item);
      clientStore.notifySync();
    }
  }

  public removeItem(itemId: string): void {
    this.stagedItems = this.stagedItems.filter(i => i.id !== itemId);
    clientStore.notifySync();
  }

  public async saveCapsuleToVault(): Promise<boolean> {
    if (!this.capsuleTitle.trim()) {
      clientStore.showToast('Please enter a title for the Context Capsule', 'warning');
      return false;
    }

    const capsule: ContextCapsule = {
      id: `capsule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: this.capsuleTitle.trim(),
      note: this.capsuleNote.trim(),
      conversationContext: this.targetContextName,
      items: [...this.stagedItems],
      createdAt: Date.now(),
    };

    // Format content for Vault
    const formattedContent = [
      `# Context Capsule: ${capsule.title}`,
      `**Context:** ${capsule.conversationContext} · ${new Date(capsule.createdAt).toLocaleDateString()}`,
      capsule.note ? `\n### Curator Note\n${capsule.note}\n` : '',
      `### Curated Messages (${capsule.items.length})`,
      ...capsule.items.map(item => `> **${item.senderName}** (${item.senderHandle}) · ${new Date(item.timestamp).toLocaleTimeString()}:\n> ${item.text.replace(/\n/g, '\n> ')}\n`),
    ].join('\n');

    await canonicalVault.saveMessage({
      id: capsule.id,
      content: formattedContent,
      authorName: 'You',
      channelId: 'context-capsules',
      createdAt: capsule.createdAt,
    });

    clientStore.showToast('✨ Context Capsule saved to your Vault', 'success');
    this.closeCreator();
    return true;
  }

  public renderCreatorModal(): string {
    if (!this.isOpen) return '';

    return `
      <div id="capsule-modal-backdrop" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in" data-action="close-capsule-creator">
        <div class="bg-surface-base border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" data-action="stop-propagation">
          <!-- Header -->
          <div class="p-4 border-b border-white/5 flex items-center justify-between bg-surface-raised/40">
            <div class="flex items-center space-x-2.5">
              <span class="text-base text-[var(--color-accent,#e89e38)] font-serif">◈</span>
              <div>
                <h3 class="text-base font-semibold text-white tracking-tight">Context Capsule</h3>
                <p class="text-xs text-slate-400">A few moments worth keeping together</p>
              </div>
            </div>
            <button type="button" data-action="close-capsule-creator" class="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer text-xs" aria-label="Close">✕</button>
          </div>

          <!-- Body -->
          <div class="capsule-editor-body p-4 overflow-y-auto text-xs">
            <div class="capsule-title-field">
              <label for="input-capsule-title" class="block font-semibold text-slate-300 mb-1">Capsule Title *</label>
              <input
                type="text"
                id="input-capsule-title"
                value="${this.capsuleTitle ? this.capsuleTitle.replace(/"/g, '&quot;') : ''}"
                placeholder="e.g. Release 2.4 Decisions, Roadmap ideas"
                class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e59b3c)]"
                data-input="capsule-title"
              />
            </div>

            <div class="capsule-note-field">
              <label for="input-capsule-note" class="block font-semibold text-slate-300 mb-1">Curator Note (Optional)</label>
              <textarea
                id="input-capsule-note"
                rows="3"
                placeholder="Brief summary or synthesis of these points..."
                class="w-full bg-surface-raised border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e59b3c)] resize-none"
                data-input="capsule-note"
              >${this.capsuleNote ? this.capsuleNote : ''}</textarea>
            </div>

            <div class="capsule-moments">
              <div class="flex items-center justify-between font-semibold text-slate-300 mb-1.5">
                <span>Selected moments · ${this.stagedItems.length}</span>
                <span class="text-[10px] text-slate-500 font-mono">${this.targetContextName}</span>
              </div>
              ${this.stagedItems.length === 0 ? `
                <div class="p-4 border-l border-white/10 text-slate-500">
                  <p>No messages selected yet.</p>
                  <p class="text-xs text-slate-500 mt-0.5">Use a message’s More menu to add it here.</p>
                </div>
              ` : `
                <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                  ${this.stagedItems.map(item => `
                    <div class="p-2.5 border-l border-l-[var(--color-accent,#e89e38)]/50 flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <div class="text-[11px] font-semibold text-slate-200">${item.senderName} <span class="text-slate-500 font-mono text-[10px]">${item.senderHandle}</span></div>
                        <p class="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">${item.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>
                      </div>
                      <button type="button" data-action="remove-capsule-item" data-item-id="${item.id}" class="text-slate-500 hover:text-rose-400 p-1 text-xs shrink-0 cursor-pointer" title="Remove from capsule">✕</button>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          </div>

          <!-- Footer -->
          <div class="p-3 bg-surface-raised/30 border-t border-white/5 flex items-center justify-between text-xs">
            <span class="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>🔒</span>
              <span>Saved locally to Vault</span>
            </span>
            <div class="flex items-center space-x-2">
              <button type="button" data-action="close-capsule-creator" class="px-3 py-1.5 rounded-xl hover:bg-surface-raised text-slate-300 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" data-action="submit-capsule-vault" class="px-4 py-1.5 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold cursor-pointer shadow-sm">Save to Vault</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export const contextCapsuleManager = new ContextCapsuleManager();

export interface RenderCapsuleOptions {
  title: string;
  note?: string;
  conversationContext?: string;
  itemCount?: number;
  authorName?: string;
  createdAt?: number;
  id?: string;
}

export function renderCapsuleArtifact(capsule: RenderCapsuleOptions): string {
  const count = capsule.itemCount ?? 1;
  const author = capsule.authorName || '';
  return `
    <div class="editorial-capsule-insert weave-capsule-card p-4 space-y-2.5 my-3 max-w-xl select-text">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="text-base text-[var(--color-accent,#e89e38)] font-serif">◈</span>
          <span class="text-sm font-semibold text-white tracking-tight uppercase">${escapeHtml(capsule.title)}</span>
        </div>
        <span class="text-[11px] text-[var(--color-accent,#e89e38)]/90 font-mono flex items-center gap-1">
          <span>🔒</span><span>Saved to Vault</span>
        </span>
      </div>
      <div class="text-[12px] text-slate-400">
        <span>${count} moment${count === 1 ? '' : 's'} saved from this conversation</span>
        ${author ? ` · <span class="text-slate-300">Curated by ${escapeHtml(author)}</span>` : ''}
      </div>
      ${capsule.note ? `
        <div class="text-[13px] text-slate-200 leading-relaxed pl-3 border-l-2 border-[var(--color-accent,#e89e38)]/30 italic">
          ${escapeHtml(capsule.note)}
        </div>
      ` : ''}
    </div>
  `;
}

export function parseCapsuleFromText(text: string): RenderCapsuleOptions | null {
  if (text.startsWith('# Context Capsule:') || text.startsWith('[CAPSULE]')) {
    const lines = text.split('\n');
    const firstLine = lines[0];
    const title = firstLine.replace(/^(# Context Capsule:|\[CAPSULE\])\s*/, '').trim();
    let note = '';
    let count = 1;
    let authorName = 'You';

    const noteIdx = lines.findIndex(l => l.includes('### Curator Note'));
    if (noteIdx !== -1 && lines[noteIdx + 1]) {
      note = lines[noteIdx + 1].trim();
    }
    const countMatch = text.match(/### Curated Messages \((\d+)\)/);
    if (countMatch) {
      count = parseInt(countMatch[1], 10);
    }
    const authorMatch = text.match(/note by ([^\n·]+)/i);
    if (authorMatch) {
      authorName = authorMatch[1].trim();
    }

    return { title, note, itemCount: count, authorName };
  }
  return null;
}
