/**
 * @file report-modal.ts
 * @package @aetheris/client-ui
 * @description DSA Notice & Action / Notice & Takedown Reporting Modal
 * Compliance: EU Regulation 2022/2065 (Digital Services Act) Article 16
 *
 * All newly added legal policy wording is flagged for professional legal review.
 */

import { clientStore } from './client-state.js';
import { renderIcon } from './ui/icons.js';
import { escapeHtml } from './dry-utils.js';

export interface ReportTargetInfo {
  targetId: string;
  targetType: 'post' | 'comment' | 'vault_file' | 'profile';
  authorFingerprint?: string;
  authorHandle?: string;
  title?: string;
  contentSnippet?: string;
  titleOrSnippet?: string;
  canonicalUrl?: string;
  detectedExternalUrls?: string[];
  externalLinks?: string[];
  category?: ReportCategory;
}

export type ReportCategory =
  | 'copyright_piracy'
  | 'csam'
  | 'illegal_content'
  | 'harassment_hate'
  | 'violence_threats'
  | 'malware_phishing'
  | 'impersonation'
  | 'spam_scam'
  | 'privacy_doxxing'
  | 'other';

export class ReportModalManager {
  private activeTarget: ReportTargetInfo | null = null;
  private isSubmitting = false;
  private returnFocus: HTMLElement | null = null;
  private selectedCategory: ReportCategory = 'copyright_piracy';
  private copyrightSubtype: 'pirated_download' | 'media_reproduction' | 'trademark' = 'pirated_download';

  public get targetType(): string | undefined {
    return this.activeTarget?.targetType;
  }

  public get targetId(): string | undefined {
    return this.activeTarget?.targetId;
  }

  public get externalLinks(): string[] {
    return this.activeTarget?.detectedExternalUrls || this.activeTarget?.externalLinks || [];
  }

  public isOpen(): boolean {
    return this.activeTarget !== null;
  }

  public open(target: ReportTargetInfo): void {
    this.returnFocus = typeof document !== 'undefined' ? document.activeElement as HTMLElement : null;
    const detectedUrls = target.detectedExternalUrls || target.externalLinks || [];
    this.activeTarget = {
      ...target,
      contentSnippet: target.contentSnippet || target.titleOrSnippet,
      detectedExternalUrls: detectedUrls,
      canonicalUrl: target.canonicalUrl || (typeof window !== 'undefined' ? `${window.location.origin}/#post-${target.targetId}` : `https://urefy.com/#post-${target.targetId}`),
    };
    this.selectedCategory = target.category || 'copyright_piracy';
    this.copyrightSubtype = 'pirated_download';
    this.isSubmitting = false;
    this.render();
  }

  public close(): void {
    this.activeTarget = null;
    this.isSubmitting = false;
    if (typeof document !== 'undefined') {
      const el = document.getElementById('urefy-dsa-report-modal-overlay');
      if (el) el.remove();
      if (this.returnFocus?.isConnected) this.returnFocus.focus();
    }
  }

  public render(): string {
    if (!this.activeTarget) return '';

    const tInfo = this.activeTarget;
    const authorStr = tInfo.authorHandle || (tInfo.authorFingerprint ? `@${tInfo.authorFingerprint.slice(0, 8)}` : 'Unknown');

    const html = `
      <div class="relative w-full max-w-xl bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] select-none" data-action="stop-propagation">
        
        <!-- HEADER -->
        <div class="px-5 py-4 border-b border-white/10 bg-surface-raised/80 flex items-center justify-between">
          <div class="flex items-center space-x-2.5">
            <span class="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30">
              ${renderIcon('flag', { size: 18 })}
            </span>
            <div>
              <h2 id="report-title" class="text-sm font-bold text-white tracking-wide">Report content</h2>
              <p class="text-[10px] font-mono text-slate-400">EU Regulation 2022/2065 (Digital Services Act, Art. 16)</p>
            </div>
          </div>
          <button id="btn-close-dsa-report-modal" type="button" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer" aria-label="Close">
            ✕
          </button>
        </div>

        <!-- BODY -->
        <form id="form-submit-dsa-report" class="p-5 overflow-y-auto space-y-4 text-xs select-text">
          
          <!-- PREFILLED TARGET METADATA SUMMARY -->
          <div class="p-3 rounded-xl bg-surface-raised border border-white/5 space-y-1.5 font-mono text-[11px]">
            <div class="flex items-center justify-between text-slate-400">
              <span>Target ID: <strong class="text-slate-200">${escapeHtml(tInfo.targetId)}</strong></span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-overlay text-indigo-300 uppercase">${escapeHtml(tInfo.targetType)}</span>
            </div>
            <div class="text-slate-400 truncate">
              Author: <span class="text-slate-200 font-semibold">${escapeHtml(authorStr)}</span>
            </div>
            <div class="text-slate-400 truncate">
              URL: <span>${escapeHtml(tInfo.canonicalUrl)}</span>
            </div>
            ${tInfo.detectedExternalUrls && tInfo.detectedExternalUrls.length > 0 ? `
              <div class="text-slate-400 pt-1 border-t border-white/5">
                <span class="text-amber-300">Detected External Links:</span>
                <div class="text-[10px] text-slate-300 truncate">${escapeHtml(tInfo.detectedExternalUrls.join(', '))}</div>
              </div>
            ` : ''}
          </div>

          <!-- PRIMARY VIOLATION REASON SELECTOR -->
          <div class="space-y-1.5">
            <label for="select-dsa-reason" class="block font-bold text-slate-200">Violation Category <span class="text-rose-400">*</span></label>
            <select id="select-dsa-reason" class="w-full bg-surface-raised border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer">
              <option value="copyright_piracy" ${this.selectedCategory === 'copyright_piracy' ? 'selected' : ''}>
                ⚖️ Copyright & Intellectual Property / Pirated Content
              </option>
              <option value="csam" ${this.selectedCategory === 'csam' ? 'selected' : ''}>
                🚨 Child Sexual Abuse Material (CSAM) [Immediate Priority Takedown]
              </option>
              <option value="illegal_content" ${this.selectedCategory === 'illegal_content' ? 'selected' : ''}>
                ⚠️ Illegal Content / Terrorism / Unlawful Goods
              </option>
              <option value="harassment_hate" ${this.selectedCategory === 'harassment_hate' ? 'selected' : ''}>
                🛑 Harassment, Bullying or Hate Speech
              </option>
              <option value="violence_threats" ${this.selectedCategory === 'violence_threats' ? 'selected' : ''}>
                🔪 Threats of Violence or Self-Harm
              </option>
              <option value="malware_phishing" ${this.selectedCategory === 'malware_phishing' ? 'selected' : ''}>
                🦠 Malware, Phishing or Malicious Executable Binary
              </option>
              <option value="impersonation" ${this.selectedCategory === 'impersonation' ? 'selected' : ''}>
                🎭 Deceptive Impersonation or Identity Fraud
              </option>
              <option value="spam_scam" ${this.selectedCategory === 'spam_scam' ? 'selected' : ''}>
                📢 Spam, Financial Scam or Coordinated Inauthentic Behavior
              </option>
              <option value="privacy_doxxing" ${this.selectedCategory === 'privacy_doxxing' ? 'selected' : ''}>
                🔒 Personal Data Breach / Doxxing / Private Identity Leak
              </option>
              <option value="other" ${this.selectedCategory === 'other' ? 'selected' : ''}>
                ℹ️ Other Violation of Sovereign Network Guidelines
              </option>
            </select>
          </div>

          <!-- CONDITIONAL COPYRIGHT / PIRACY EXTENSIONS -->
          <div id="dsa-copyright-subpanel" class="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-3 ${this.selectedCategory === 'copyright_piracy' ? '' : 'hidden'}">
            <div class="font-semibold text-indigo-300 text-xs flex items-center space-x-1.5">
              <span>⚖️</span>
              <span>Copyright / Pirated Content Specification</span>
            </div>

            <div class="space-y-1">
              <label class="text-[11px] text-slate-300 font-medium">Specific Infringement Type:</label>
              <select id="select-copyright-subtype" class="w-full bg-surface-base border border-white/10 rounded-lg p-2 text-xs text-slate-200">
                <option value="pirated_download" ${this.copyrightSubtype === 'pirated_download' ? 'selected' : ''}>
                  Unauthorized download link / pirated software / unauthorized media distribution
                </option>
                <option value="media_reproduction" ${this.copyrightSubtype === 'media_reproduction' ? 'selected' : ''}>
                  Direct unauthorized reproduction of copyrighted text, images or audio
                </option>
                <option value="trademark" ${this.copyrightSubtype === 'trademark' ? 'selected' : ''}>
                  Trademark or proprietary brand infringement
                </option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="text-[11px] text-slate-300 font-medium">Original Work / Authorized Source URL (Optional):</label>
              <input 
                type="url" 
                id="input-dsa-original-url"
                placeholder="https://example.com/original-work or registration ID"
                class="w-full bg-surface-base border border-white/10 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div class="space-y-1 pt-1">
              <div class="text-[11px] font-semibold text-slate-200">Good Faith Declaration:</div>
              <label class="flex items-start space-x-2 text-[11px] text-slate-300 cursor-pointer">
                <input type="checkbox" id="check-dsa-perjury" class="mt-0.5 rounded border-white/20 text-indigo-600 focus:ring-0 cursor-pointer" />
                <span>I declare in good faith that I am the copyright owner or authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</span>
              </label>
            </div>
          </div>

          <!-- DETAILED EXPLANATION -->
          <div class="space-y-1.5">
            <label class="block font-bold text-slate-200">
              Evidence & Reason Explanation <span class="text-rose-400">*</span>
            </label>
            <textarea
              id="textarea-dsa-details"
              rows="3"
              required
              placeholder="Explain why this content is illegal or infringing under EU/sovereign law. Provide exact timestamps, links, or file hashes..."
              class="w-full bg-surface-raised border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
            ></textarea>
          </div>

          <!-- REPORTER CONTACT / IDENTITY -->
          <div class="space-y-1.5">
            <label class="block font-bold text-slate-200">
              Contact Email (Optional for notification, recommended for follow-up):
            </label>
            <input
              type="email"
              id="input-dsa-email"
              placeholder="legal@rightsholder.com or your email"
              class="w-full bg-surface-raised border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <!-- LEGAL ADVISORY NOTICE -->
          <div class="p-3 rounded-xl bg-surface-raised/50 border border-white/5 text-[10px] text-slate-400 leading-relaxed font-sans space-y-1">
            <p>
              <strong>Notice:</strong> In accordance with Article 16 of Regulation (EU) 2022/2065 (Digital Services Act), this notice will be timestamped and reviewed by designated moderators. Intentionally submitting misleading, fraudulent or malicious notices may result in legal liability under applicable civil law.
            </p>
            <p class="text-[9px] text-slate-500 italic">
              [Note: Newly added legal notice wording flagged for professional legal review prior to final regulatory sign-off.]
            </p>
          </div>

          <!-- SUBMIT ACTIONS -->
          <div class="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              id="btn-cancel-dsa-report"
              class="px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-dsa-report"
              class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>🚩</span>
              <span>Submit DSA Notice</span>
            </button>
          </div>

        </form>

      </div>
    `;

    if (typeof document !== 'undefined') {
      let overlay = document.getElementById('urefy-dsa-report-modal-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'urefy-dsa-report-modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'report-title');
        overlay.className = 'fixed inset-0 z-[10050] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150';
        document.body.appendChild(overlay);
      }
      overlay.innerHTML = html;
      this.bindEvents(overlay);
      overlay.querySelector<HTMLButtonElement>('#btn-close-dsa-report-modal')?.focus();
    }

    return html;
  }

  private bindEvents(overlay: HTMLElement): void {
    overlay.onkeydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); this.close(); }
      if (event.key !== 'Tab') return;
      const controls = [...overlay.querySelectorAll<HTMLElement>('button:not([disabled]), select, input, textarea, a[href]')].filter(el => el.getClientRects().length > 0);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    };
    const btnClose = overlay.querySelector('#btn-close-dsa-report-modal');
    const btnCancel = overlay.querySelector('#btn-cancel-dsa-report');
    const form = overlay.querySelector('#form-submit-dsa-report') as HTMLFormElement | null;
    const selectReason = overlay.querySelector('#select-dsa-reason') as HTMLSelectElement | null;
    const copyrightPanel = overlay.querySelector('#dsa-copyright-subpanel') as HTMLElement | null;

    btnClose?.addEventListener('click', () => this.close());
    btnCancel?.addEventListener('click', () => this.close());

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    selectReason?.addEventListener('change', () => {
      this.selectedCategory = (selectReason.value || 'other') as ReportCategory;
      if (copyrightPanel) {
        if (this.selectedCategory === 'copyright_piracy') {
          copyrightPanel.classList.remove('hidden');
        } else {
          copyrightPanel.classList.add('hidden');
        }
      }
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.isSubmitting || !this.activeTarget) return;

      const detailsInput = overlay.querySelector('#textarea-dsa-details') as HTMLTextAreaElement | null;
      const emailInput = overlay.querySelector('#input-dsa-email') as HTMLInputElement | null;
      const originalUrlInput = overlay.querySelector('#input-dsa-original-url') as HTMLInputElement | null;
      const subtypeInput = overlay.querySelector('#select-copyright-subtype') as HTMLSelectElement | null;
      const perjuryCheck = overlay.querySelector('#check-dsa-perjury') as HTMLInputElement | null;
      const submitBtn = overlay.querySelector('#btn-submit-dsa-report') as HTMLButtonElement | null;

      const details = detailsInput?.value.trim() || '';
      const email = emailInput?.value.trim() || '';
      const originalUrl = originalUrlInput?.value.trim() || '';
      const subtype = subtypeInput?.value || '';

      if (this.selectedCategory === 'copyright_piracy' && perjuryCheck && !perjuryCheck.checked) {
        clientStore.showToast('Please confirm the copyright declaration checkbox', 'warning');
        return;
      }

      if (!details) {
        clientStore.showToast('Please provide details for the report', 'warning');
        return;
      }

      this.isSubmitting = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      const payload = {
        targetId: this.activeTarget.targetId,
        targetType: this.activeTarget.targetType,
        reason: this.selectedCategory,
        details: `${this.selectedCategory === 'copyright_piracy' ? `[Copyright Subtype: ${subtype}] ${originalUrl ? `[Original: ${originalUrl}] ` : ''}` : ''}${details}`,
        reporterFingerprint: clientStore.keypair?.fingerprint || 'anonymous',
        reporterEmail: email || undefined,
      };

      try {
        const res = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json() as any;
        if (res.ok && data?.success && typeof data.reportId === 'string' && data.reportId) {
          this.showSuccessConfirmation(data.reportId);
        } else {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
      } catch (err: any) {
        this.isSubmitting = false;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit report'; }
        let error = overlay.querySelector<HTMLElement>('[data-report-error]');
        if (!error) { error = document.createElement('p'); error.dataset.reportError = ''; error.setAttribute('role', 'alert'); form?.appendChild(error); }
        error.textContent = `Report not submitted. ${err?.message || 'Check your connection and try again.'} Your details are still in the form.`;
      }
    });
  }

  private showSuccessConfirmation(reportId: string): void {
    const overlay = document.getElementById('urefy-dsa-report-modal-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
      <div class="relative w-full max-w-md bg-surface-base border border-emerald-500/30 rounded-2xl shadow-2xl p-6 text-center space-y-4 my-auto animate-in zoom-in-95">
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30 text-2xl">
          ✓
        </div>
        <h2 id="report-title" class="text-base font-bold text-white">DSA Notice Successfully Logged</h2>
        <p class="text-xs text-slate-300 leading-relaxed">
          Your notice has been registered under <strong>EU Digital Services Act (Regulation 2022/2065, Art. 16)</strong>.
        </p>
        <div class="p-3 bg-surface-raised rounded-xl font-mono text-[11px] text-emerald-300 break-all border border-white/5">
          Reference ID: ${escapeHtml(reportId)}
        </div>
        <p class="text-[10px] text-slate-400">
          The content will be reviewed promptly by sovereign network moderators.
        </p>
        <button
          type="button"
          id="btn-dsa-done"
          class="w-full py-2.5 bg-surface-overlay hover:bg-white/10 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    `;

    overlay.querySelector('#btn-dsa-done')?.addEventListener('click', () => this.close());
    overlay.querySelector<HTMLButtonElement>('#btn-dsa-done')?.focus();
    clientStore.showToast('🚩 DSA Notice submitted successfully', 'success');
  }
}

export const reportModalManager = new ReportModalManager();
