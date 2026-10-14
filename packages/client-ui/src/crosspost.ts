/**
 * @file crosspost.ts
 * @package @aetheris/client-ui
 * @description 2027 Sovereign Cross-Post Engine.
 * Zero inline <script> or onclick/data-raw-click attributes; uses delegated DOM events.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';

export interface CrossPostRecord {
  id: string;
  originalPostId: string;
  targetChannelId: string;
  crossPostedBy: string;
  crossPostedAt: number;
  note: string;
}

const SHARE_HUB_SVG = `<svg class="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`;

class CrossPostEngine {
  public crossPosts: CrossPostRecord[] = [];
  private isDelegationBound: boolean = false;

  public readonly AVAILABLE_CHANNELS: string[] = [
    'relays-general',
    'relays-dev',
    'vault-releases',
    'vault-guides',
    'pulse-global',
  ];

  public readonly CHANNEL_LABELS: Record<string, string> = {
    'relays-general': '📡 r/relays-general',
    'relays-dev': '🛠️ r/relays-dev',
    'vault-releases': '🛡️ r/clean-releases',
    'vault-guides': '📚 r/vault-guides',
    'pulse-global': '🌐 r/pulse-global',
  };

  constructor() {
    this.bindDelegatedEvents();
  }

  private generateId(): string {
    const ts = Date.now().toString(36);
    const rand = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 8);
    return `cp_${ts}_${rand}`;
  }

  private bindDelegatedEvents(): void {
    if (this.isDelegationBound || typeof document === 'undefined') return;
    this.isDelegationBound = true;

    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. Open Crosspost Modal button
      const openBtn = target.closest<HTMLElement>('[data-crosspost-btn]');
      if (openBtn) {
        const postId = openBtn.getAttribute('data-crosspost-btn');
        if (postId) {
          document.dispatchEvent(new CustomEvent('crosspost:open', { detail: { postId } }));
        }
        return;
      }

      // 2. Select Channel inside Modal
      const channelBtn = target.closest<HTMLElement>('[data-crosspost-channel]');
      if (channelBtn && !channelBtn.hasAttribute('disabled')) {
        const modal = channelBtn.closest<HTMLElement>('[data-crosspost-modal]');
        if (!modal) return;
        modal.querySelectorAll<HTMLElement>('[data-crosspost-channel]').forEach((b) => {
          b.classList.remove('ring-2', 'ring-cyan-400', 'bg-surface-overlay');
          b.setAttribute('aria-pressed', 'false');
        });
        channelBtn.classList.add('ring-2', 'ring-cyan-400', 'bg-surface-overlay');
        channelBtn.setAttribute('aria-pressed', 'true');
        const hiddenInput = modal.querySelector<HTMLInputElement>('[data-crosspost-selected]');
        if (hiddenInput) {
          hiddenInput.value = channelBtn.getAttribute('data-crosspost-channel') || '';
        }
        return;
      }

      // 3. Submit Crosspost
      const submitBtn = target.closest<HTMLElement>('[data-crosspost-submit]');
      if (submitBtn) {
        const modal = submitBtn.closest<HTMLElement>('[data-crosspost-modal]');
        if (!modal) return;
        const postId = submitBtn.getAttribute('data-post-id') || '';
        const userFP = submitBtn.getAttribute('data-user-fp') || '';
        const channelId = modal.querySelector<HTMLInputElement>('[data-crosspost-selected]')?.value || '';
        const note = (modal.querySelector<HTMLTextAreaElement>('[data-crosspost-note]')?.value || '').trim();
        if (!channelId) return;

        document.dispatchEvent(
          new CustomEvent('crosspost:submit', {
            detail: { postId, channelId, note, userFP },
          })
        );
        return;
      }

      // 4. Close Crosspost Modal (close button or backdrop click)
      const closeBtn = target.closest<HTMLElement>('[data-crosspost-close]');
      if (closeBtn || target.hasAttribute('data-crosspost-modal')) {
        const modal = target.closest<HTMLElement>('[data-crosspost-modal]');
        const postId = modal?.getAttribute('data-crosspost-modal') || '';
        document.dispatchEvent(new CustomEvent('crosspost:close', { detail: { postId } }));
      }
    });

    document.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLTextAreaElement | null;
      if (!target || !target.hasAttribute('data-crosspost-note')) return;
      const modal = target.closest<HTMLElement>('[data-crosspost-modal]');
      const counter = modal?.querySelector<HTMLElement>('[data-crosspost-charcount]');
      if (counter) {
        counter.textContent = String(target.value.length);
      }
    });
  }

  public crossPost(
    originalPostId: string,
    targetChannelId: string,
    byFP: string,
    note: string
  ): boolean {
    if (!this.AVAILABLE_CHANNELS.includes(targetChannelId)) return false;
    if (this.hasCrossPosted(originalPostId, targetChannelId, byFP)) return false;

    const record: CrossPostRecord = {
      id: this.generateId(),
      originalPostId,
      targetChannelId,
      crossPostedBy: byFP,
      crossPostedAt: Date.now(),
      note: note.trim(),
    };

    this.crossPosts.push(record);
    return true;
  }

  public getCrossPostsForPost(postId: string): CrossPostRecord[] {
    return this.crossPosts.filter((r) => r.originalPostId === postId);
  }

  public hasCrossPosted(postId: string, channelId: string, byFP: string): boolean {
    return this.crossPosts.some(
      (r) =>
        r.originalPostId === postId &&
        r.targetChannelId === channelId &&
        r.crossPostedBy === byFP
    );
  }

  private uniqueTargetChannels(postId: string): string[] {
    const seen = new Set<string>();
    for (const r of this.getCrossPostsForPost(postId)) {
      seen.add(r.targetChannelId);
    }
    return Array.from(seen);
  }

  public renderCrossPostButton(postId: string): string {
    const eid = this.escapeAttr(postId);
    return `
      <button
        type="button"
        data-crosspost-btn="${eid}"
        title="Share to another Hub"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surface-raised hover:bg-surface-overlay border border-white/10 text-cyan-300 hover:text-white transition-colors duration-150 select-none cursor-pointer"
      >
        ${SHARE_HUB_SVG}
        <span>Share to Hub</span>
      </button>
    `.trim();
  }

  public renderCrossPostModal(postId: string, userFP: string): string {
    const eid = this.escapeAttr(postId);
    const efp = this.escapeAttr(userFP);

    const channelButtons = this.AVAILABLE_CHANNELS.map((channelId) => {
      const label = this.CHANNEL_LABELS[channelId] ?? channelId;
      const already = this.hasCrossPosted(postId, channelId, userFP);
      const ech = this.escapeAttr(channelId);
      const emoji = label.split(' ')[0];
      const rest = label.split(' ').slice(1).join(' ');

      if (already) {
        return `
          <button
            type="button"
            disabled
            title="Already shared to this hub"
            class="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-surface-base border border-white/5 text-white/35 cursor-not-allowed opacity-60 select-none"
          >
            <span class="text-emerald-400 text-sm" aria-hidden="true">✓</span>
            <span class="truncate">${this.escapeHtml(label)}</span>
          </button>
        `.trim();
      }

      return `
        <button
          type="button"
          data-crosspost-channel="${ech}"
          data-crosspost-post="${eid}"
          data-crosspost-fp="${efp}"
          aria-pressed="false"
          title="Share to ${this.escapeAttr(label)}"
          class="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium bg-surface-raised hover:bg-surface-overlay border border-white/10 text-white hover:text-cyan-300 transition-colors duration-150 select-none cursor-pointer"
        >
          <span class="text-base" aria-hidden="true">${this.escapeHtml(emoji)}</span>
          <span class="truncate">${this.escapeHtml(rest)}</span>
        </button>
      `.trim();
    }).join('\n');

    return `
      <div
        data-crosspost-modal="${eid}"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crosspost-title-${eid}"
        class="sovereign-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      >
        <div
          class="sovereign-glass-surface relative w-full max-w-md bg-surface-base border border-white/12 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          data-action="stop-propagation"
        >
          <div class="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-surface-raised">
            <div class="flex items-center gap-2 text-cyan-300">
              ${SHARE_HUB_SVG}
              <h2 id="crosspost-title-${eid}" class="text-base font-semibold text-white">Share to Another Hub</h2>
            </div>
            <button
              type="button"
              data-crosspost-close="${eid}"
              class="min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-surface-overlay transition-colors cursor-pointer"
              aria-label="Close modal"
            >✕</button>
          </div>

          <div class="px-5 py-4 flex flex-col gap-4">
            <div>
              <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Select a Destination Hub</p>
              <div class="grid grid-cols-1 gap-2">
                ${channelButtons}
              </div>
              <input type="hidden" data-crosspost-selected value="" />
            </div>

            <div>
              <label
                class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5"
                for="crosspost-note-${eid}"
              >
                Add Context Note <span class="normal-case font-normal text-slate-500">(optional)</span>
              </label>
              <textarea
                id="crosspost-note-${eid}"
                data-crosspost-note
                rows="3"
                maxlength="280"
                placeholder="Why is this relevant to this hub? (max 280 chars)"
                class="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-slate-500 bg-surface-raised border border-white/12 focus:border-cyan-400 focus:outline-none resize-none transition-colors font-sans"
              ></textarea>
              <p class="text-right text-xs font-mono tabular-nums text-slate-400 mt-1">
                <span data-crosspost-charcount>0</span>/280
              </p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/8 bg-surface-raised">
            <button
              type="button"
              data-crosspost-close="${eid}"
              class="px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-surface-overlay border border-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              data-crosspost-submit
              data-post-id="${eid}"
              data-user-fp="${efp}"
              class="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 transition-colors cursor-pointer"
            >
              ${SHARE_HUB_SVG}
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    `.trim();
  }

  public renderCrossPostBadge(postId: string): string {
    const targets = this.uniqueTargetChannels(postId);
    if (targets.length === 0) return '';

    const count = targets.length;
    const label = count === 1 ? '1 hub' : `${count} hubs`;
    const hubNames = targets.map((ch) => this.CHANNEL_LABELS[ch] ?? ch).join(', ');

    return `
      <span
        title="Also shared to: ${this.escapeAttr(hubNames)}"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-mono tabular-nums bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 select-none"
      >
        ${SHARE_HUB_SVG}
        <span>Also in ${this.escapeHtml(label)}</span>
      </span>
    `.trim();
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttr(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const crossPostEngine = new CrossPostEngine();
serviceRegistry.registerInstance(SERVICES.CrossPostEngine, crossPostEngine);
