// flair-filter.ts
// UREfy — Flair Filter Engine
// Feed post flair filtering engine

// ---------------------------------------------------------------------------
// Local Types
// ---------------------------------------------------------------------------

export interface FlairDefinition {
  id: string;
  emoji: string;
  color: string; // Combined Tailwind classes: text + bg + border
}

// ---------------------------------------------------------------------------
// MAIN CLASS
// ---------------------------------------------------------------------------

export class FlairFilterEngine {
  // -----------------------------------------------------------------------
  // Constants — flair definitions
  // -----------------------------------------------------------------------

  readonly FLAIRS: FlairDefinition[] = [
    {
      id: 'VERIFIED RELEASE',
      emoji: '✅',
      color: 'text-signal bg-emerald-950/70 border-signal/30',
    },
    {
      id: 'SECURITY ADVISORY',
      emoji: '🛡️',
      color: 'text-aether bg-purple-950/70 border-aether/30',
    },
    {
      id: 'TECH DISCUSSION',
      emoji: '💡',
      color: 'text-slate-200 bg-slate-800 border-white/10',
    },
    {
      id: 'MICRO-PULSE',
      emoji: '⚡',
      color: 'text-cyphr bg-cyan-950/70 border-cyphr/30',
    },
    {
      id: 'ASK COMMUNITY',
      emoji: '🗳️',
      color: 'text-amber bg-yellow-950/70 border-amber/30',
    },
  ];

  // -----------------------------------------------------------------------
  // Internal State
  // -----------------------------------------------------------------------

  activeFlair: string | null = null;
  flairCounts: Map<string, number> = new Map<string, number>();

  // -----------------------------------------------------------------------
  // Constructor — initialize counters to zero
  // -----------------------------------------------------------------------

  constructor() {
    for (const flair of this.FLAIRS) {
      this.flairCounts.set(flair.id, 0);
    }
  }

  // -----------------------------------------------------------------------
  // setFlair — enables or disables a flair filter
  //   If flairId matches current active flair, it toggles off.
  //   If flairId is null, clears any active filter.
  // -----------------------------------------------------------------------

  setFlair(flairId: string | null): void {
    if (flairId === null) {
      this.activeFlair = null;
      return;
    }

    const exists = this.FLAIRS.some((f) => f.id === flairId);
    if (!exists) {
      console.warn(`[FlairFilterEngine] Unknown flair: "${flairId}"`);
      return;
    }

    // Toggle: if the same flair is already active, deactivate it
    this.activeFlair = this.activeFlair === flairId ? null : flairId;
  }

  // -----------------------------------------------------------------------
  // isActive — returns true if an active flair filter exists
  // -----------------------------------------------------------------------

  isActive(): boolean {
    return this.activeFlair !== null;
  }

  // -----------------------------------------------------------------------
  // filterPosts — filters a list of posts by active flair
  //   If no active filter exists, returns original unmodified list.
  // -----------------------------------------------------------------------

  filterPosts<T extends { flair: string }>(posts: T[]): T[] {
    if (!this.isActive()) {
      return posts;
    }

    const target = this.activeFlair as string;
    return posts.filter((post) => post.flair === target);
  }

  // -----------------------------------------------------------------------
  // updateCounts — recalculates counts per flair from post list
  //   Resets all counters to 0 before recalculating.
  // -----------------------------------------------------------------------

  updateCounts(posts: Array<{ flair: string }>): void {
    // Reset
    for (const flair of this.FLAIRS) {
      this.flairCounts.set(flair.id, 0);
    }

    // Count
    for (const post of posts) {
      const current = this.flairCounts.get(post.flair);
      if (current !== undefined) {
        this.flairCounts.set(post.flair, current + 1);
      }
      // Unknown flairs are deliberately ignored
    }
  }

  // -----------------------------------------------------------------------
  // _buildChipClasses — constructs CSS classes for active vs inactive chip
  // -----------------------------------------------------------------------

  private _buildChipClasses(flair: FlairDefinition, isSelected: boolean): string {
    const base =
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ' +
      'font-sans cursor-pointer select-none transition-all duration-150 ';

    if (isSelected) {
      // Active chip — brighter border + ring + high brightness
      return (
        base +
        flair.color +
        ' brightness-125 ring-1 ring-offset-1 ring-offset-transparent ' +
        'shadow-lg shadow-black/30 scale-105'
      );
    } else {
      // Inactive chip — lower opacity, hover for visual feedback
      return (
        base +
        flair.color +
        ' opacity-60 hover:opacity-90 hover:scale-105 hover:brightness-110'
      );
    }
  }

  // -----------------------------------------------------------------------
  // renderFlairFilterBar — renders complete flair filter toolbar
  //   Includes:
  //     - "Filter by Type:" label
  //     - "All" button for clearing filter
  //     - One chip per flair with post count in parentheses
  // -----------------------------------------------------------------------

  renderFlairFilterBar(): string {
    const allButtonClasses =
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ' +
      'font-sans cursor-pointer select-none transition-all duration-150 ' +
      (!this.isActive()
        ? 'text-white bg-surface-overlay border-white/20 ring-1 ring-white/20 shadow-md scale-105'
        : 'text-slate-400 bg-surface-raised border-white/5 opacity-60 hover:opacity-90 hover:text-white');

    const allButton = `
      <button
        class="${allButtonClasses}"
        data-flair-clear="true"
        aria-pressed="${!this.isActive()}"
        title="Show all posts"
      >
        <span>🌐</span>
        <span>All</span>
        <span class="text-slate-500 font-normal">(${this._totalCount()})</span>
      </button>`;

    const chips = this.FLAIRS.map((flair) => {
      const isSelected = this.activeFlair === flair.id;
      const count = this.flairCounts.get(flair.id) ?? 0;
      const chipClasses = this._buildChipClasses(flair, isSelected);

      return `
        <button
          class="${chipClasses}"
          data-flair-id="${this._escapeAttr(flair.id)}"
          aria-pressed="${isSelected}"
          title="Filter by: ${this._escapeHtml(flair.id)}"
        >
          <span>${flair.emoji}</span>
          <span>${this._escapeHtml(flair.id)}</span>
          <span class="${isSelected ? 'text-white/70' : 'text-slate-500'} font-normal">(${count})</span>
        </button>`;
    }).join('');

    return `
<div
  class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/5 bg-surface-base/30"
  role="toolbar"
  aria-label="Filter by post type"
>
  <span class="text-xs font-medium text-slate-400 font-sans mr-1 shrink-0 self-center">
    Filter by Type:
  </span>
  ${allButton}
  ${chips}
</div>`;
  }

  // -----------------------------------------------------------------------
  // renderActiveFlairBadge — small badge shown in sub-header when filter is
  //   active, indicating user is viewing a filtered subset.
  // -----------------------------------------------------------------------

  renderActiveFlairBadge(): string {
    if (!this.isActive()) {
      return '';
    }

    const flairDef = this.FLAIRS.find((f) => f.id === this.activeFlair);
    if (!flairDef) {
      return '';
    }

    const count = this.flairCounts.get(flairDef.id) ?? 0;

    return `
<div
  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${flairDef.color}
         text-xs font-semibold font-sans animate-in fade-in duration-200 shadow-sm"
  role="status"
  aria-live="polite"
  aria-label="Active filter: ${this._escapeAttr(flairDef.id)}"
>
  <span>${flairDef.emoji}</span>
  <span>Active filter:</span>
  <span class="font-bold">${this._escapeHtml(flairDef.id)}</span>
  <span class="text-white/50 font-normal">${count} posts</span>
  <button
    class="ml-1 w-4 h-4 flex items-center justify-center rounded-full
           bg-white/10 hover:bg-white/25 transition-colors duration-100
           text-white/70 hover:text-white font-bold text-[10px] leading-none"
    data-flair-clear="true"
    aria-label="Clear flair filter"
    title="Clear filter"
  >✕</button>
</div>`;
  }

  // -----------------------------------------------------------------------
  // Private Utilities
  // -----------------------------------------------------------------------

  /** Total sum of all posts recorded in flairCounts */
  private _totalCount(): number {
    let total = 0;
    for (const count of this.flairCounts.values()) {
      total += count;
    }
    return total;
  }

  /** Escape HTML characters for safe attribute/text insertion */
  private _escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Escape for HTML attribute values */
  private _escapeAttr(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const flairFilter = new FlairFilterEngine();
