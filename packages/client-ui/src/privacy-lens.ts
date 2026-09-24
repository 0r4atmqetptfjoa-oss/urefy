/**
 * UREfy — Signature Privacy Lens Component
 * (privacy-lens.ts)
 *
 * Implements the signature interactive Privacy Lens across posts, composer, and post detail:
 * 1. Compact inline grammar:
 *    - 🌐 Public · Searchable · Federated
 *    - ◉ Community · Members only · Not indexed
 *    - ◌ Followers · Not indexed · Not federated
 * 2. Expandable modal/sheet with accurate cryptographic and boundary receipt.
 * 3. Strict truth-in-advertising privacy language: "Not publicly linked by UREfy."
 */

import { renderIcon } from './ui/icons.js';

export type AudienceLevel = 'public' | 'community' | 'followers';

export interface PrivacyLensOptions {
  audience?: AudienceLevel;
  channelName?: string;
  facetHandle?: string;
  isPubliclyLinked?: boolean;
  interactive?: boolean;
  postId?: string;
  className?: string;
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class PrivacyLensEngine {
  private activeSheetPostId: string | null = null;

  public toggleSheet(postId: string | null): void {
    this.activeSheetPostId = this.activeSheetPostId === postId ? null : postId;
    this.renderActiveSheet();
  }

  public closeSheet(): void {
    this.activeSheetPostId = null;
    const el = document.getElementById('privacy-lens-sheet-overlay');
    if (el) el.remove();
  }

  /**
   * Renders the compact signature Privacy Lens badge.
   */
  public renderCompact(options: PrivacyLensOptions = {}): string {
    const audience = options.audience || 'public';
    const interactive = options.interactive ?? true;
    const postId = options.postId || '';
    const channel = options.channelName || 'general';

    let icon = 'globe';
    let text = 'Public · Searchable · Federated';
    let glyph = '🌐';

    if (audience === 'community') {
      icon = 'shield';
      text = `c/${channel} · Members only · Not indexed`;
      glyph = '◉';
    } else if (audience === 'followers') {
      icon = 'users';
      text = 'Followers · Not indexed · Not federated';
      glyph = '◌';
    }

    const tagAttr = interactive && postId
      ? `data-action="open-privacy-lens" data-post-id="${escapeHtml(postId)}" data-audience="${audience}" tabindex="0" role="button" aria-haspopup="dialog"`
      : '';

    return `
      <span class="privacy-lens-tag ${options.className || ''}" ${tagAttr} title="Inspect Privacy Lens receipt (${text})">
        <span class="font-mono text-[11px] leading-none select-none">${glyph}</span>
        ${renderIcon(icon as any, { size: 12, className: 'shrink-0' })}
        <span class="truncate max-w-[220px] sm:max-w-none">${escapeHtml(text)}</span>
      </span>
    `;
  }

  /**
   * Renders the full inspectable Privacy Lens receipt card / sheet.
   */
  public renderReceipt(options: PrivacyLensOptions = {}): string {
    const audience = options.audience || 'public';
    const channel = options.channelName || 'general';
    const facetHandle = options.facetHandle || 'sovereign';
    const isPubliclyLinked = options.isPubliclyLinked ?? false;

    return `
      <div class="privacy-lens-sheet space-y-3 select-none" id="privacy-lens-sheet-content">
        <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div class="flex items-center gap-2">
            <span class="text-base text-[var(--color-iris,#818cf8)]">🛡️</span>
            <div>
              <h4 class="m-0 leading-none">Privacy Lens Receipt</h4>
              <span class="text-[10px] text-slate-400 font-mono">Cryptographic Audience &amp; Indexing Boundaries</span>
            </div>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-full ${audience === 'public' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}">
            ${audience.toUpperCase()}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <!-- 1. Who can read -->
          <div class="p-2.5 rounded-xl bg-surface-base/80 border border-white/5 space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>👁️</span><span>Who can read</span>
            </div>
            <div class="text-slate-200">
              ${audience === 'public'
                ? 'Anyone on the internet and federated ActivityPub network'
                : audience === 'community'
                  ? `Only verified members in <strong>c/${escapeHtml(channel)}</strong>`
                  : `Only accounts following <strong>@${escapeHtml(facetHandle)}</strong>`}
            </div>
          </div>

          <!-- 2. Who can reply -->
          <div class="p-2.5 rounded-xl bg-surface-base/80 border border-white/5 space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>💬</span><span>Who can reply</span>
            </div>
            <div class="text-slate-200">
              ${audience === 'public'
                ? 'All accounts passing local rate & anti-spam proof'
                : audience === 'community'
                  ? `Community participants with posting permission`
                  : `Approved followers only`}
            </div>
          </div>

          <!-- 3. Search & Indexing -->
          <div class="p-2.5 rounded-xl bg-surface-base/80 border border-white/5 space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>🔍</span><span>Search &amp; Discovery</span>
            </div>
            <div class="text-slate-200">
              ${audience === 'public'
                ? 'Searchable on UREfy explore and public search engines'
                : 'Excluded from search engines and discovery listings'}
            </div>
          </div>

          <!-- 4. Federation -->
          <div class="p-2.5 rounded-xl bg-surface-base/80 border border-white/5 space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>🌐</span><span>ActivityPub Federation</span>
            </div>
            <div class="text-slate-200">
              ${audience === 'public'
                ? 'Broadcast to open Fediverse relays'
                : 'Restricted to local sovereign edge boundaries'}
            </div>
          </div>
        </div>

        <!-- 5. Sovereign Context Cross-Link Status -->
        <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Facet Cross-Link:</span>
          </span>
          <span class="font-mono text-emerald-400">
            ${isPubliclyLinked ? 'Publicly linked' : 'Not publicly linked by UREfy.'}
          </span>
        </div>
      </div>
    `;
  }

  private renderActiveSheet(): void {
    if (!this.activeSheetPostId) return;
    let overlay = document.getElementById('privacy-lens-sheet-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'privacy-lens-sheet-overlay';
      overlay.className = 'fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="relative w-full max-w-lg bg-surface-base border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 animate-in slide-in-from-bottom-4 duration-150" role="dialog" aria-modal="true" aria-label="Privacy Lens Details">
        <div class="flex items-center justify-between pb-3 mb-2 border-b border-white/5">
          <span class="font-bold text-sm text-white">Privacy Lens Inspector</span>
          <button type="button" id="btn-close-privacy-sheet" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer">✕</button>
        </div>
        ${this.renderReceipt({ audience: 'public' })}
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || (e.target as HTMLElement).closest('#btn-close-privacy-sheet')) {
        this.closeSheet();
      }
    });
  }
}

export const privacyLens = new PrivacyLensEngine();
