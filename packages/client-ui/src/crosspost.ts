import { serviceRegistry, SERVICES } from './service-registry.js';

export interface CrossPostRecord {
  id: string;
  originalPostId: string;
  targetChannelId: string;
  crossPostedBy: string;
  crossPostedAt: number;
  note: string;
}

class CrossPostEngine {
  crossPosts: CrossPostRecord[] = [];

  readonly AVAILABLE_CHANNELS: string[] = [
    'relays-general',
    'relays-dev',
    'vault-releases',
    'vault-guides',
    'pulse-global',
  ];

  readonly CHANNEL_LABELS: Record<string, string> = {
    'relays-general':  '📡 r/relays-general',
    'relays-dev':      '🛠️ r/relays-dev',
    'vault-releases':  '🛡️ r/clean-releases',
    'vault-guides':    '📚 r/vault-guides',
    'pulse-global':    '🌐 r/pulse-global',
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private generateId(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    return `cp_${ts}_${rand}`;
  }

  // ─── Core Logic ────────────────────────────────────────────────────────────

  /**
   * Cross-post a post to a target channel.
   * Returns false if the channel is invalid or the user already cross-posted there.
   */
  crossPost(
    originalPostId: string,
    targetChannelId: string,
    byFP: string,
    note: string,
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

  /** All cross-post records for a given original post. */
  getCrossPostsForPost(postId: string): CrossPostRecord[] {
    return this.crossPosts.filter((r) => r.originalPostId === postId);
  }

  /**
   * Check whether a specific fingerprint has already cross-posted this post
   * to the given channel.
   */
  hasCrossPosted(postId: string, channelId: string, byFP: string): boolean {
    return this.crossPosts.some(
      (r) =>
        r.originalPostId === postId &&
        r.targetChannelId === channelId &&
        r.crossPostedBy === byFP,
    );
  }

  /** Unique target channels this post has been cross-posted to (any user). */
  private uniqueTargetChannels(postId: string): string[] {
    const seen = new Set<string>();
    for (const r of this.getCrossPostsForPost(postId)) {
      seen.add(r.targetChannelId);
    }
    return Array.from(seen);
  }

  // ─── UI Rendering ──────────────────────────────────────────────────────────

  /**
   * Renders the small 🔀 Share to Hub button attached to a post card.
   * Clicking it dispatches a custom DOM event to open the modal.
   */
  renderCrossPostButton(postId: string): string {
    const eid = this.escapeAttr(postId);
    return [
      `<button`,
      `  type="button"`,
      `  data-crosspost-btn="${eid}"`,
      ` data-action="call-global" data-global-method="document.dispatchEvent" data-global-args='[new CustomEvent("crosspost:open", { detail: { postId: "${eid}" } })]'`,
      `  title="Share to another Hub"`,
      `  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium`,
      `         bg-surface-raised hover:bg-surface-overlay border border-white/10`,
      `         text-aether hover:text-white transition-all duration-150 select-none"`,
      `>`,
      `  <span aria-hidden="true">🔀</span>`,
      `  <span>Share to Hub</span>`,
      `</button>`,
    ].join('\n');
  }

  /**
   * Renders the full cross-post modal for a post.
   * Shows all available channels as a grid; already-cross-posted channels
   * (by this user) appear as disabled with a ✅ checkmark.
   * Includes an optional note textarea, Submit, and Cancel buttons.
   */
  renderCrossPostModal(postId: string, userFP: string): string {
    const eid   = this.escapeAttr(postId);
    const efp   = this.escapeAttr(userFP);

    const channelButtons = this.AVAILABLE_CHANNELS.map((channelId) => {
      const label   = this.CHANNEL_LABELS[channelId] ?? channelId;
      const already = this.hasCrossPosted(postId, channelId, userFP);
      const ech     = this.escapeAttr(channelId);
      const emoji   = label.split(' ')[0];
      const rest    = label.split(' ').slice(1).join(' ');

      if (already) {
        return [
          `<button type="button" disabled title="Already shared to this hub"`,
          `  class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium`,
          `         bg-surface-base border border-white/5 text-white/30 cursor-not-allowed opacity-60 select-none">`,
          `  <span class="text-signal text-base">✅</span>`,
          `  <span class="truncate">${this.escapeHtml(label)}</span>`,
          `</button>`,
        ].join('\n');
      }

      const onclick = [
        `(function(btn){`,
        `  btn.closest('[data-crosspost-modal]')`,
        `     .querySelectorAll('[data-crosspost-channel]')`,
        `     .forEach(function(b){ b.classList.remove('ring-2','ring-aether','bg-surface-overlay'); });`,
        `  btn.classList.add('ring-2','ring-aether','bg-surface-overlay');`,
        `  btn.closest('[data-crosspost-modal]')`,
        `     .querySelector('[data-crosspost-selected]')`,
        `     .value = btn.dataset.crosspostChannel;`,
        `})(this)`,
      ].join(' ');

      return [
        `<button type="button"`,
        `  data-crosspost-channel="${ech}"`,
        `  data-crosspost-post="${eid}"`,
        `  data-crosspost-fp="${efp}"`,
        ` data-action="call-global" data-raw-click="${this.escapeAttr(onclick)}"`,
        `  title="Share to ${this.escapeAttr(label)}"`,
        `  class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium`,
        `         bg-surface-raised hover:bg-surface-overlay border border-white/10`,
        `         text-white hover:text-cyphr transition-all duration-150 select-none`,
        `         focus:outline-none focus:ring-2 focus:ring-aether">`,
        `  <span class="text-base">${this.escapeHtml(emoji)}</span>`,
        `  <span class="truncate">${this.escapeHtml(rest)}</span>`,
        `</button>`,
      ].join('\n');
    }).join('\n');

    const closeEvt   = `document.dispatchEvent(new CustomEvent('crosspost:close', { detail: { postId: '${eid}' } }))`;
    const submitOnClick = [
      `(function(btn){`,
      `  var modal=btn.closest('[data-crosspost-modal]');`,
      `  var channel=modal.querySelector('[data-crosspost-selected]').value;`,
      `  var note=(modal.querySelector('[data-crosspost-note]').value||'').trim();`,
      `  if(!channel){ return; }`,
      `  document.dispatchEvent(new CustomEvent('crosspost:submit',{`,
      `    detail:{ postId:'${eid}', channelId:channel, note:note, userFP:'${efp}' }`,
      `  }));`,
      `})(this)`,
    ].join(' ');

    const charScript = [
      `<script>`,
      `(function(){`,
      `  var modal=document.querySelector('[data-crosspost-modal="${eid}"]');`,
      `  if(!modal) return;`,
      `  var ta=modal.querySelector('[data-crosspost-note]');`,
      `  var cc=modal.querySelector('[data-crosspost-charcount]');`,
      `  if(ta&&cc){ ta.addEventListener('input',function(){ cc.textContent=String(ta.value.length); }); }`,
      `})();`,
      `</script>`,
    ].join('\n');

    return [
      `<!-- CrossPost Modal Backdrop -->`,
      `<div`,
      `  data-crosspost-modal="${eid}"`,
      `  role="dialog" aria-modal="true" aria-label="Share post to another Hub"`,
      `  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"`,
      ` data-action="call-global" data-raw-click="if(event.target===this) ${closeEvt}"`,
      `>`,
      `  <!-- Modal Panel -->`,
      `  <div class="relative w-full max-w-md bg-surface-base border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-0 overflow-hidden"`,
      ` data-action="stop-propagation">`,
      ``,
      `    <!-- Header -->`,
      `    <div class="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-surface-raised">`,
      `      <div class="flex items-center gap-2">`,
      `        <span class="text-lg" aria-hidden="true">🔀</span>`,
      `        <h2 class="text-base font-semibold text-white">Share to Another Hub</h2>`,
      `      </div>`,
      `      <button type="button" data-action="call-global" data-raw-click="${closeEvt}"`,
      `        class="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-surface-overlay transition-all duration-150"`,
      `        aria-label="Close">✕</button>`,
      `    </div>`,
      ``,
      `    <!-- Body -->`,
      `    <div class="px-5 py-4 flex flex-col gap-4">`,
      ``,
      `      <!-- Channel Grid -->`,
      `      <div>`,
      `        <p class="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Select a Hub</p>`,
      `        <div class="grid grid-cols-1 gap-2">`,
      channelButtons,
      `        </div>`,
      `        <input type="hidden" data-crosspost-selected value="" />`,
      `      </div>`,
      ``,
      `      <!-- Optional Note -->`,
      `      <div>`,
      `        <label class="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5"`,
      `               for="crosspost-note-${eid}">`,
      `          Add a note <span class="normal-case font-normal">(optional)</span>`,
      `        </label>`,
      `        <textarea id="crosspost-note-${eid}" data-crosspost-note rows="3" maxlength="280"`,
      `          placeholder="Why are you sharing this? (max 280 chars)"`,
      `          class="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/25`,
      `                 bg-surface-raised border border-white/10 focus:border-aether/60`,
      `                 focus:ring-1 focus:ring-aether/40 focus:outline-none`,
      `                 resize-none transition-all duration-150 font-sans"></textarea>`,
      `        <p class="text-right text-xs text-white/30 mt-1">`,
      `          <span data-crosspost-charcount>0</span>/280`,
      `        </p>`,
      `      </div>`,
      ``,
      `    </div>`,
      ``,
      `    <!-- Footer -->`,
      `    <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/5 bg-surface-raised">`,
      `      <button type="button" data-action="call-global" data-raw-click="${closeEvt}"`,
      `        class="px-4 py-1.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-surface-overlay border border-white/10 transition-all duration-150">`,
      `        Cancel`,
      `      </button>`,
      `      <button type="button" data-crosspost-submit data-post-id="${eid}" data-user-fp="${efp}"`,
      ` data-action="call-global" data-raw-click="${this.escapeAttr(submitOnClick)}"`,
      `        class="px-4 py-1.5 rounded-lg text-sm font-semibold bg-aether/20 hover:bg-aether/30 text-aether border border-aether/30 hover:border-aether/60 transition-all duration-150">`,
      `        🔀 Share`,
      `      </button>`,
      `    </div>`,
      ``,
      `  </div>`,
      `</div>`,
      charScript,
    ].join('\n');
  }

  /**
   * Renders a small inline badge on a post card indicating cross-post status.
   * Returns empty string if the post has never been cross-posted.
   */
  renderCrossPostBadge(postId: string): string {
    const targets = this.uniqueTargetChannels(postId);
    if (targets.length === 0) return '';

    const count    = targets.length;
    const label    = count === 1 ? '1 hub' : `${count} hubs`;
    const hubNames = targets.map((ch) => this.CHANNEL_LABELS[ch] ?? ch).join(', ');

    return [
      `<span`,
      `  title="Also shared to: ${this.escapeAttr(hubNames)}"`,
      `  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium`,
      `         bg-aether/10 border border-aether/20 text-aether select-none"`,
      `>`,
      `  <span aria-hidden="true">🔀</span>`,
      `  <span>Also in ${this.escapeHtml(label)}</span>`,
      `</span>`,
    ].join('\n');
  }

  // ─── Escape Utilities ──────────────────────────────────────────────────────

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

// ─── Singleton Export ──────────────────────────────────────────────────────────
export const crossPostEngine = new CrossPostEngine();
serviceRegistry.registerInstance(SERVICES.CrossPostEngine, crossPostEngine);
