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

    return `
      <div id="facet-switcher-root" class="relative inline-flex items-center text-xs">
        <button
          type="button"
          id="btn-facet-switcher"
          data-action="toggle-facet-switcher"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-raised/80 hover:bg-surface-raised border border-white/10 text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm"
          title="Switch your active Facet context (using UREfy as ${escapeHtml(activeFacet.displayName)})"
          aria-expanded="${this.isOpen}"
          aria-haspopup="true"
        >
          <span class="text-slate-400 text-[11px] hidden xl:inline">Using UREfy as:</span>
          <div class="w-4 h-4 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-[9px] overflow-hidden flex-shrink-0">
            ${activeFacet.avatarUrl ? `<img src="${escapeHtml(activeFacet.avatarUrl)}" class="w-full h-full object-cover">` : activeFacet.displayName.slice(0, 1).toUpperCase()}
          </div>
          <span class="font-semibold text-slate-100 truncate max-w-[110px]">${escapeHtml(activeFacet.displayName)}</span>
          <span class="text-[10px] text-slate-400">▾</span>
        </button>

        ${this.isOpen ? `
          <div
            id="facet-switcher-menu"
            class="absolute right-0 top-full mt-2 w-72 p-2 rounded-2xl bg-surface-base border border-white/15 shadow-2xl z-50 select-none animate-in fade-in zoom-in-95 duration-150"
            role="menu"
          >
            <div class="px-3 py-2 border-b border-white/5 flex items-center justify-between">
              <div>
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Social Context</div>
                <div class="text-[11px] text-slate-500">Contextual personas on 1 identity</div>
              </div>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400">${facets.length}/5</span>
            </div>

            <div class="py-1.5 space-y-1 max-h-60 overflow-y-auto">
              ${facets.map(f => {
                const isCurrent = f.id === activeFacet.id;
                return `
                  <button
                    type="button"
                    data-action="select-facet"
                    data-facet-id="${escapeHtml(f.id)}"
                    class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${isCurrent ? 'bg-indigo-600/15 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'}"
                    role="menuitem"
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-7 h-7 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-200">
                        ${f.avatarUrl ? `<img src="${escapeHtml(f.avatarUrl)}" class="w-full h-full object-cover">` : f.displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <div class="min-w-0 truncate">
                        <div class="text-xs font-medium truncate text-slate-100 flex items-center gap-1.5">
                          <span>${escapeHtml(f.displayName)}</span>
                          ${f.isDefault ? '<span class="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">Main</span>' : ''}
                        </div>
                        <div class="text-[10px] text-slate-400 truncate">@${escapeHtml(f.handle)}</div>
                      </div>
                    </div>

                    <div class="flex items-center gap-1 flex-shrink-0">
                      ${f.isPubliclyLinked ? `
                        <span class="text-[10px] text-slate-400" title="Publicly linked to other profiles">🔗</span>
                      ` : `
                        <span class="text-[10px] text-emerald-400" title="Not publicly linked by UREfy">🛡️</span>
                      `}
                      ${isCurrent ? '<span class="text-indigo-400 text-xs ml-1 font-bold">✓</span>' : ''}
                    </div>
                  </button>
                `;
              }).join('')}
            </div>

            <div class="pt-1.5 mt-1 border-t border-white/5">
              <button
                type="button"
                data-action="new-facet"
                class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-colors cursor-pointer border border-white/5"
              >
                <span>+</span>
                <span>New Context / Facet</span>
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
