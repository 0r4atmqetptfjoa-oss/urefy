/**
 * UREfy — Sovereign Facet Creation & Management Modal
 * (facet-modal.ts)
 *
 * Allows users to create and edit Sovereign Facets under their single root identity:
 * - Display Name & @handle
 * - Avatar & Bio
 * - Visibility: Public / Contextual / Unlisted
 * - Public Unlinkability Toggle: "Show this Facet on my other profiles" (default OFF)
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

export class FacetModal {
  private container: HTMLElement | null = null;
  private editingFacet: ClientFacet | null = null;
  private isSubmitting = false;
  private errorMessage = '';

  public isOpen(): boolean {
    return this.container !== null && !this.container.classList.contains('hidden');
  }

  public open(facet?: ClientFacet): void {
    this.editingFacet = facet || null;
    this.errorMessage = '';
    this.isSubmitting = false;
    this.ensureContainer();
    this.render();
  }

  public close(): void {
    if (this.container) {
      this.container.classList.add('hidden');
      this.container.innerHTML = '';
    }
    this.editingFacet = null;
    this.errorMessage = '';
  }

  private ensureContainer(): HTMLElement {
    if (typeof document === 'undefined') return {} as HTMLElement;
    let el = document.getElementById('facet-modal-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'facet-modal-root';
      el.className = 'urefy-modal-backdrop hidden select-none';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      document.body.appendChild(el);
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen()) {
          this.close();
        }
      });
    }
    this.container = el;
    return el;
  }

  public render(): void {
    if (!this.container) return;
    const isEdit = !!this.editingFacet;
    const facet = this.editingFacet;

    const html = `
      <div class="urefy-modal-card relative w-full max-w-lg rounded-2xl bg-surface-base border border-[var(--surface-rule)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="urefy-sheet-grabber"></div>
        <!-- Header -->
        <div class="p-5 border-b border-[var(--surface-rule)] flex items-center justify-between bg-surface-raised/40">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[var(--color-accent,#e89e38)]/15 text-[var(--color-accent,#e89e38)] flex items-center justify-center font-bold">
              ${renderIcon('users', { size: 20 })}
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-100">
                ${isEdit ? 'Edit Context / Facet' : 'Create New Sovereign Facet'}
              </h2>
              <p class="text-xs text-slate-400">
                ${isEdit ? 'Update your contextual identity profile' : 'Add a distinct social context under your sovereign root identity'}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-action="close-facet-modal"
            class="min-w-[44px] min-h-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Close"
          >
            ${renderIcon('close', { size: 18 })}
          </button>
        </div>

        <!-- Form Body -->
        <form id="facet-form" class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          ${this.errorMessage ? `
            <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>${escapeHtml(this.errorMessage)}</span>
            </div>
          ` : ''}

          <!-- Display Name -->
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1" for="facet-display-name">
              Display Name <span class="text-rose-400">*</span>
            </label>
            <input
              type="text"
              id="facet-display-name"
              required
              maxlength="50"
              placeholder="e.g. Photography, GameDev, Work"
              value="${escapeHtml(facet?.displayName || '')}"
              class="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-surface-raised border border-[var(--surface-rule)] text-slate-100 text-[16px] sm:text-sm focus:outline-none focus:border-[var(--color-accent,#e89e38)]"
            />
          </div>

          <!-- Handle -->
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1" for="facet-handle">
              Handle <span class="text-rose-400">*</span>
            </label>
            <div class="relative">
              <span class="absolute left-3 top-3 text-xs text-slate-500 font-mono">@</span>
              <input
                type="text"
                id="facet-handle"
                required
                maxlength="30"
                pattern="^[a-zA-Z0-9_]{3,30}$"
                placeholder="alice_dev"
                value="${escapeHtml(facet?.handle || '')}"
                class="w-full pl-7 pr-3.5 py-2.5 min-h-[44px] rounded-xl bg-surface-raised border border-[var(--surface-rule)] text-slate-100 text-[16px] sm:text-sm font-mono focus:outline-none focus:border-[var(--color-accent,#e89e38)]"
              />
            </div>
            <p class="text-[11px] text-slate-500 mt-1">3-30 letters, numbers, or underscores.</p>
          </div>

          <!-- Avatar URL -->
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1" for="facet-avatar-url">
              Avatar Image URL
            </label>
            <input
              type="url"
              id="facet-avatar-url"
              placeholder="https://example.com/avatar.jpg"
              value="${escapeHtml(facet?.avatarUrl || '')}"
              class="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-surface-raised border border-[var(--surface-rule)] text-slate-100 text-[16px] sm:text-sm focus:outline-none focus:border-[var(--color-accent,#e89e38)]"
            />
          </div>

          <!-- Bio -->
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1" for="facet-bio">
              Context Bio
            </label>
            <textarea
              id="facet-bio"
              rows="2"
              maxlength="200"
              placeholder="What this context is for..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-[var(--surface-rule)] text-slate-100 text-[16px] sm:text-sm focus:outline-none focus:border-[var(--color-accent,#e89e38)] resize-none"
            >${escapeHtml(facet?.bio || '')}</textarea>
          </div>

          <!-- Visibility Selector -->
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">
              Context Visibility
            </label>
            <div class="grid grid-cols-3 gap-2">
              <label class="flex flex-col p-2.5 rounded-xl border border-[var(--surface-rule)] bg-surface-raised hover:bg-surface-overlay cursor-pointer transition-colors">
                <div class="flex items-center gap-1.5 mb-1">
                  <input
                    type="radio"
                    name="facet-visibility"
                    value="public"
                    ${!facet || facet.visibility === 'public' ? 'checked' : ''}
                    class="accent-[var(--color-accent,#e89e38)]"
                  />
                  <span class="text-xs font-semibold text-slate-200">Public</span>
                </div>
                <span class="text-[10px] text-slate-400">Discoverable across public search &amp; profile</span>
              </label>

              <label class="flex flex-col p-2.5 rounded-xl border border-[var(--surface-rule)] bg-surface-raised hover:bg-surface-overlay cursor-pointer transition-colors">
                <div class="flex items-center gap-1.5 mb-1">
                  <input
                    type="radio"
                    name="facet-visibility"
                    value="contextual"
                    ${facet?.visibility === 'contextual' ? 'checked' : ''}
                    class="accent-[var(--color-accent,#e89e38)]"
                  />
                  <span class="text-xs font-semibold text-slate-200">Contextual</span>
                </div>
                <span class="text-[10px] text-slate-400">Shared communities &amp; followers only</span>
              </label>

              <label class="flex flex-col p-2.5 rounded-xl border border-[var(--surface-rule)] bg-surface-raised hover:bg-surface-overlay cursor-pointer transition-colors">
                <div class="flex items-center gap-1.5 mb-1">
                  <input
                    type="radio"
                    name="facet-visibility"
                    value="unlisted"
                    ${facet?.visibility === 'unlisted' ? 'checked' : ''}
                    class="accent-[var(--color-accent,#e89e38)]"
                  />
                  <span class="text-xs font-semibold text-slate-200">Unlisted</span>
                </div>
                <span class="text-[10px] text-slate-400">Accessible only via direct reference</span>
              </label>
            </div>
          </div>

          <!-- Public Unlinkability Toggle (Default: OFF) -->
          <div class="p-3.5 rounded-xl bg-surface-raised/80 border border-[var(--surface-rule)]">
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="facet-is-publicly-linked"
                ${facet?.isPubliclyLinked ? 'checked' : ''}
                class="mt-1 w-4 h-4 rounded accent-[var(--color-accent,#e89e38)] focus:ring-0 bg-surface-base border-white/20"
              />
              <div>
                <span class="text-xs font-semibold text-slate-200">
                  Show this Facet on my other profiles
                </span>
                <p class="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Default: <strong class="text-emerald-400">OFF (Private Context)</strong>. Not publicly linked by UREfy. Your Facets are not shown as belonging to the same identity unless you choose to link them.
                </p>
                <p class="text-[10px] text-slate-500 mt-1 leading-normal">
                  UREfy infrastructure can associate your Facets with your sovereign identity for authorization, safety, and abuse prevention.
                </p>
              </div>
            </label>
          </div>
        </form>

        <!-- Footer -->
        <div class="p-4 border-t border-[var(--surface-rule)] bg-surface-base flex items-center justify-end gap-2.5">
          <button
            type="button"
            data-action="close-facet-modal"
            class="min-h-[44px] px-5 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-sm font-medium text-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-save-facet"
            data-action="submit-facet"
            ${this.isSubmitting ? 'disabled' : ''}
            class="min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--color-accent,#e89e38)] hover:brightness-110 text-slate-950 text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            ${this.isSubmitting ? '<span>Saving...</span>' : `<span>${isEdit ? 'Save Changes' : 'Create Facet'}</span>`}
          </button>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.container.classList.remove('hidden');
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target === this.container) {
        this.close();
        return;
      }

      const actionEl = target.closest('[data-action]') as HTMLElement | null;
      if (!actionEl) return;

      const action = actionEl.getAttribute('data-action');
      if (action === 'close-facet-modal') {
        this.close();
      } else if (action === 'submit-facet') {
        void this.handleSubmit();
      }
    });

    const form = this.container.querySelector('#facet-form') as HTMLFormElement | null;
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        void this.handleSubmit();
      });
    }
  }

  private async handleSubmit(): Promise<void> {
    if (!this.container || this.isSubmitting) return;

    const nameInput = this.container.querySelector('#facet-display-name') as HTMLInputElement | null;
    const handleInput = this.container.querySelector('#facet-handle') as HTMLInputElement | null;
    const avatarInput = this.container.querySelector('#facet-avatar-url') as HTMLInputElement | null;
    const bioInput = this.container.querySelector('#facet-bio') as HTMLTextAreaElement | null;
    const linkedInput = this.container.querySelector('#facet-is-publicly-linked') as HTMLInputElement | null;
    const visRadio = this.container.querySelector('input[name="facet-visibility"]:checked') as HTMLInputElement | null;

    const displayName = (nameInput?.value || '').trim();
    let handle = (handleInput?.value || '').trim().replace(/^@/, '');
    const avatarUrl = (avatarInput?.value || '').trim();
    const bio = (bioInput?.value || '').trim();
    const isPubliclyLinked = linkedInput?.checked || false;
    const visibility = (visRadio?.value || 'public') as 'public' | 'contextual' | 'unlisted';

    if (!displayName) {
      this.errorMessage = 'Display name is required.';
      this.render();
      return;
    }
    if (!handle || !/^[a-zA-Z0-9_]{3,30}$/.test(handle)) {
      this.errorMessage = 'Handle must be 3-30 alphanumeric characters or underscores.';
      this.render();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.render();

    try {
      const isEdit = !!this.editingFacet;
      const payload: any = {
        action: isEdit ? 'update' : 'create',
        displayName,
        handle,
        avatarUrl: avatarUrl || undefined,
        bio: bio || undefined,
        visibility,
        isPubliclyLinked,
      };

      if (isEdit && this.editingFacet) {
        payload.facetId = this.editingFacet.id;
      }

      const envelope = (clientStore as any).createSignedEnvelope(payload);
      const res = await fetch('/api/facets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to save facet');
      }

      await clientStore.fetchFacets();
      if (data.facet?.id) {
        clientStore.setActiveFacet(data.facet.id);
      }
      clientStore.showToast(isEdit ? 'Facet updated' : 'Sovereign Facet created', 'success');
      this.close();
    } catch (err: any) {
      this.isSubmitting = false;
      this.errorMessage = err.message || 'Operation failed';
      this.render();
    }
  }
}

export const facetModal = new FacetModal();
if (typeof window !== 'undefined') {
  (window as any).facetModal = facetModal;
}
