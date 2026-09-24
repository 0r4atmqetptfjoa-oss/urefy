/**
 * UREfy — Sovereign Facet Switcher Component
 * (facet-switcher.ts)
 *
 * Renders the primary context switch in top navigation:
 * "Using UREfy as: [ ActiveFacet ▾ ]"
 * Allows quick switching between sovereign contexts and creating new Facets.
 */

import { clientStore, ClientFacet } from './client-state.js';
import { renderIcon } from './ui/icons.js';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class FacetSwitcher {
  private isOpen = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('click', (e: MouseEvent) => {
        if (!this.isOpen) return;
        const target = e.target as HTMLElement | null;
        if (!target || !target.closest('#facet-switcher-root')) {
          this.isOpen = false;
          this.updateUi();
        }
      });
    }
  }

  public toggle(): void {
    this.isOpen = !this.isOpen;
    this.updateUi();
  }

  public close(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.updateUi();
    }
  }

  public updateUi(): void {
    const el = document.getElementById('facet-switcher-root');
    if (el) {
      el.outerHTML = this.render();
      this.bindEvents();
    }
  }

  public render(): string {
    const activeFacet = clientStore.getActiveFacet() || {
      id: 'default',
      handle: 'sovereign',
      displayName: 'Main Context',
      isDefault: true,
      isPubliclyLinked: false,
      visibility: 'public' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const facets: ClientFacet[] = clientStore.facets.length > 0 ? clientStore.facets : [activeFacet];
    const initial = (activeFacet.displayName || 'U').slice(0, 1).toUpperCase();

    return `
      <div id="facet-switcher-root" class="relative inline-flex items-center text-xs">
        <button
          type="button"
          id="btn-facet-switcher"
          data-action="toggle-facet-switcher"
          class="context-lens-trigger group select-none shadow-sm"
          title="Change your social context (currently here as ${escapeHtml(activeFacet.displayName)})"
          aria-expanded="${this.isOpen}"
          aria-haspopup="true"
        >
          <div class="relative w-6 h-6 rounded-full bg-[var(--color-accent,#e89e38)]/20 text-[var(--color-accent,#e89e38)] flex items-center justify-center font-bold text-[11px] overflow-hidden shrink-0 border border-[var(--color-accent,#e89e38)]/40">
            ${activeFacet.avatarUrl ? `<img src="${escapeHtml(activeFacet.avatarUrl)}" class="w-full h-full object-cover">` : initial}
            <span class="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[var(--color-accent,#e89e38)] ring-1 ring-[#0f1219]"></span>
          </div>
          <div class="flex items-center gap-1.5 text-left leading-tight">
            <span class="text-slate-400 text-[11px] hidden lg:inline">You're here as</span>
            <span class="font-semibold text-slate-100 truncate max-w-[100px] sm:max-w-[130px]">${escapeHtml(activeFacet.displayName)}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono hidden sm:inline">${activeFacet.isDefault ? 'Personal' : 'Context'}</span>
          </div>
          <span class="text-[10px] text-slate-400 transition-transform duration-150 ${this.isOpen ? 'rotate-180 text-[var(--color-accent,#e89e38)]' : ''}">▾</span>
        </button>

        ${this.isOpen ? `
          <div
            id="facet-switcher-menu"
            class="context-lens-panel animate-in fade-in zoom-in-95 duration-150 p-2 shadow-2xl"
            role="menu"
          >
            <div class="px-3.5 py-2.5 border-b border-white/5">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent,#e89e38)]">Context Lens</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400">${facets.length} ${facets.length === 1 ? 'facet' : 'facets'}</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">Switch social contexts without changing your sovereign identity.</p>
            </div>

            <div class="py-1.5 space-y-1 max-h-64 overflow-y-auto" role="none">
              ${facets.map(f => {
                const isCurrent = f.id === activeFacet.id;
                const fInitial = (f.displayName || 'U').slice(0, 1).toUpperCase();
                return `
                  <button
                    type="button"
                    data-action="select-facet"
                    data-facet-id="${escapeHtml(f.id)}"
                    class="context-lens-item ${isCurrent ? 'is-active' : ''}"
                    role="menuitem"
                  >
                    <div class="relative w-8 h-8 rounded-full bg-surface-raised border border-white/10 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0 overflow-hidden">
                      ${f.avatarUrl ? `<img src="${escapeHtml(f.avatarUrl)}" class="w-full h-full object-cover">` : fInitial}
                      ${isCurrent ? '<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[var(--color-accent,#e89e38)] ring-1 ring-[#0f1219]"></span>' : ''}
                    </div>

                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between gap-1">
                        <span class="font-semibold text-xs text-white truncate">${escapeHtml(f.displayName)}</span>
                        ${f.isDefault ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-[var(--color-accent,#e89e38)]/15 text-[var(--color-accent,#e89e38)] font-mono">Personal</span>' : ''}
                      </div>
                      <div class="text-[11px] text-slate-400 truncate">@${escapeHtml(f.handle)}</div>
                      <div class="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        ${f.isPubliclyLinked ? '<span>🔗 Publicly cross-linked</span>' : '<span class="text-emerald-400/80">🛡️ Not publicly linked by UREfy</span>'}
                      </div>
                    </div>

                    ${isCurrent ? '<span class="text-[var(--color-accent,#e89e38)] text-sm font-bold ml-1">✓</span>' : ''}
                  </button>
                `;
              }).join('')}
            </div>

            <div class="pt-2 mt-1 border-t border-white/5">
              <button
                type="button"
                data-action="new-facet"
                class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer border border-white/5"
              >
                <span class="text-base leading-none text-[var(--color-accent,#e89e38)]">+</span>
                <span>Add social context</span>
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  public bindEvents(): void {
    const root = document.getElementById('facet-switcher-root');
    if (!root) return;

    root.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const actionEl = target.closest('[data-action]') as HTMLElement | null;
      if (!actionEl) return;

      const action = actionEl.getAttribute('data-action');
      if (action === 'toggle-facet-switcher') {
        this.toggle();
      } else if (action === 'select-facet') {
        const facetId = actionEl.getAttribute('data-facet-id');
        if (facetId) {
          clientStore.setActiveFacet(facetId);
          this.close();
        }
      } else if (action === 'new-facet') {
        this.close();
        void import('./facet-modal.js').then(({ facetModal }) => {
          facetModal.open();
        });
      }
    });
  }
}

export const facetSwitcher = new FacetSwitcher();
if (typeof window !== 'undefined') {
  (window as any).facetSwitcher = facetSwitcher;
}
