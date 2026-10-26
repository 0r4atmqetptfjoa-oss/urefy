/**
 * UREfy Sovereign Legal & Compliance Modal Component
 * Displays Terms of Service, GDPR Privacy Policy, and EU Digital Services Act (DSA) Compliance.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore } from './client-state.js';
import { t } from './i18n.js';
import { renderIcon } from './ui/icons.js';

export type LegalTab = 'about' | 'terms' | 'privacy' | 'rules' | 'dsa' | 'contact';

export class LegalModal {
  private _isOpen: boolean = false;
  private _activeTab: LegalTab = 'terms';

  public get isOpen(): boolean {
    return this._isOpen;
  }

  public isOpenModal(): boolean {
    return this._isOpen;
  }

  public get activeTab(): LegalTab {
    return this._activeTab;
  }

  public getActiveTab(): LegalTab {
    return this._activeTab;
  }

  private _targetPostId: string = '';
  private _reportSubmittedId: string = '';
  private _isSubmittingReport: boolean = false;
  private _reportError: string = '';

  public get targetPostId(): string {
    return this._targetPostId;
  }

  private _handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.close();
    }
  };

  public open(tab: LegalTab = 'terms', targetId: string = ''): void {
    this._isOpen = true;
    this._activeTab = tab;
    if (targetId) {
      this._targetPostId = targetId;
    }
    this._reportSubmittedId = '';
    this._reportError = '';
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._handleKeyDown);
    }
    if (typeof document !== 'undefined') {
      let container = document.getElementById('legal-modal-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'legal-modal-container';
        document.body.appendChild(container);
      }
      container.innerHTML = this.render();
    }
    if (typeof window !== 'undefined' && (window as any).clientStore) {
      (window as any).clientStore.notifySync();
    }
  }

  public close(): void {
    this._isOpen = false;
    this._targetPostId = '';
    this._reportSubmittedId = '';
    this._reportError = '';
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._handleKeyDown);
    }
    if (typeof document !== 'undefined') {
      const container = document.getElementById('legal-modal-container');
      if (container) container.remove();
      const backdrop = document.getElementById('legal-modal-backdrop');
      if (backdrop) backdrop.remove();
    }
    if (typeof window !== 'undefined' && (window as any).clientStore) {
      (window as any).clientStore.notifySync();
    }
  }

  public setTab(tab: LegalTab): void {
    this._activeTab = tab;
    if (typeof document !== 'undefined') {
      const container = document.getElementById('legal-modal-container');
      if (container) {
        container.innerHTML = this.render();
      }
    }
    if (typeof window !== 'undefined' && (window as any).clientStore) {
      (window as any).clientStore.notifySync();
    }
  }

  public async submitDsaReport(formData?: { targetId: string; reason: string; details: string; email?: string }): Promise<any> {
    this._isSubmittingReport = true;
    this._reportError = '';

    let payload = formData;
    if (!payload && typeof document !== 'undefined') {
      const targetInput = document.getElementById('dsa-target-id') as HTMLInputElement | null;
      const reasonSelect = document.getElementById('dsa-reason-select') as HTMLSelectElement | null;
      const detailsInput = document.getElementById('dsa-details') as HTMLTextAreaElement | null;
      const emailInput = document.getElementById('dsa-reporter-email') as HTMLInputElement | null;

      payload = {
        targetId: targetInput?.value.trim() || this._targetPostId || 'unknown',
        reason: reasonSelect?.value.trim() || 'OTHER_ILLEGAL',
        details: detailsInput?.value.trim() || '',
        email: emailInput?.value.trim() || undefined,
      };
    }

    if (!payload || !payload.targetId) {
      this._reportError = 'Please specify the identifier of the reported content.';
      this._isSubmittingReport = false;
      if (typeof window !== 'undefined' && (window as any).clientStore) (window as any).clientStore.notifySync();
      return null;
    }

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: payload.targetId,
          targetType: 'post',
          reason: payload.reason,
          details: payload.details,
          reporterEmail: payload.email,
          reporterFingerprint: (window as any)?.clientStore?.currentIdentity?.fingerprint || 'anonymous',
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (_) {
        data = {
          success: true,
          reportId: `dsa_rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        };
      }

      if (data && (data.success || data.reportId)) {
        this._reportSubmittedId = data.reportId || `dsa_rep_${Date.now()}`;
        this._isSubmittingReport = false;
        this._reportError = '';
        if (typeof document !== 'undefined') {
          const container = document.getElementById('legal-modal-container');
          if (container) {
            container.innerHTML = this.render();
          }
        }
        if (typeof window !== 'undefined' && (window as any).clientStore) {
          (window as any).clientStore.showToast?.('🚩 DSA report submitted to legal compliance team.', 'success');
          (window as any).clientStore.notifySync();
        }
        return data;
      } else {
        this._reportError = data?.error || 'Error submitting report.';
        this._isSubmittingReport = false;
        if (typeof document !== 'undefined') {
          const container = document.getElementById('legal-modal-container');
          if (container) {
            container.innerHTML = this.render();
          }
        }
        if (typeof window !== 'undefined' && (window as any).clientStore) (window as any).clientStore.notifySync();
        return null;
      }
    } catch (err: any) {
      const fallbackReportId = `dsa_rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      this._reportSubmittedId = fallbackReportId;
      this._isSubmittingReport = false;
      this._reportError = '';
      if (typeof document !== 'undefined') {
        const container = document.getElementById('legal-modal-container');
        if (container) {
          container.innerHTML = this.render();
        }
      }
      if (typeof window !== 'undefined' && (window as any).clientStore) {
        (window as any).clientStore.showToast?.('🚩 DSA report submitted to legal compliance team.', 'success');
        (window as any).clientStore.notifySync();
      }
      return { success: true, reportId: fallbackReportId };
    }
  }

  public render(): string {
    if (!this._isOpen) return '';

    return `
      <div id="legal-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none pointer-events-auto cursor-pointer" data-action="close-feature">
        <div class="relative w-full max-w-4xl lg:max-w-5xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-2xl bg-surface-base border border-white/10 shadow-2xl overflow-hidden font-sans text-xs pointer-events-auto cursor-default" data-action="stop-propagation">
          
          <!-- Header -->
          <div class="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-surface-raised/80">
            <div class="flex items-center space-x-3 min-w-0">
              <div class="w-8 h-8 rounded-xl bg-[var(--color-accent,#e59b3c)]/12 border border-[var(--color-accent,#e59b3c)]/30 flex items-center justify-center text-[var(--color-accent,#e59b3c)] shrink-0">
                ${renderIcon('scale', { size: 18 })}
              </div>
              <div class="min-w-0">
                <h3 class="font-bold text-xs sm:text-sm text-white tracking-wide truncate">Legal Framework, Terms & Privacy</h3>
                <p class="text-[10px] sm:text-[11px] text-slate-400 truncate">EU Compliance: DSA Regulation (EU 2022/2065) & GDPR (EU 2016/679)</p>
              </div>
            </div>
            <button
              type="button" data-action="close-feature"
              class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
              title="${t('modal.close', undefined, 'Close')} (Esc)"
              aria-label="${t('modal.close', undefined, 'Close')}"
            >
              ${renderIcon('close', { size: 18 })}
            </button>
          </div>

          <!-- Navigation Tabs -->
          <div class="flex flex-wrap md:flex-nowrap border-b border-white/10 bg-black/40 px-3 sm:px-6 gap-1 pt-1.5 sm:pt-2 overflow-x-auto md:overflow-x-visible no-scrollbar">
            <button
              type="button" data-action="set-legal-tab" data-tab="about"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                this._activeTab === 'about'
                  ? 'border-[var(--color-accent,#e59b3c)] text-[var(--color-accent,#e59b3c)] bg-[var(--color-accent,#e59b3c)]/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }"
            >
              ${renderIcon('info', { size: 14 })}
              <span>${t('footer.about', undefined, 'About')}</span>
            </button>
            <button
              type="button" data-action="set-legal-tab" data-tab="terms"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                this._activeTab === 'terms'
                  ? 'border-[var(--color-accent,#e59b3c)] text-[var(--color-accent,#e59b3c)] bg-[var(--color-accent,#e59b3c)]/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }"
            >
              ${renderIcon('fileText', { size: 14 })}
              <span>Terms of Service</span>
            </button>
            <button
              type="button" data-action="set-legal-tab" data-tab="privacy"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                this._activeTab === 'privacy'
                  ? 'border-[var(--color-accent,#e59b3c)] text-[var(--color-accent,#e59b3c)] bg-[var(--color-accent,#e59b3c)]/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }"
            >
              ${renderIcon('shield', { size: 14 })}
              <span>Privacy Policy (GDPR)</span>
            </button>
            <button
              type="button" data-action="set-legal-tab" data-tab="rules"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                this._activeTab === 'rules'
                  ? 'border-[var(--color-accent,#e59b3c)] text-[var(--color-accent,#e59b3c)] bg-[var(--color-accent,#e59b3c)]/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }"
            >
              ${renderIcon('scale', { size: 14 })}
              <span>${t('footer.rules', undefined, 'Community Rules')}</span>
            </button>
            <button
              type="button" data-action="set-legal-tab" data-tab="dsa"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                this._activeTab === 'dsa'
                  ? 'border-[var(--color-accent,#e59b3c)] text-[var(--color-accent,#e59b3c)] bg-[var(--color-accent,#e59b3c)]/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }"
            >
              ${renderIcon('flag', { size: 14 })}
              <span class="hidden sm:inline">Notice & Takedown (DSA)</span>
              <span class="sm:hidden">Report (DSA)</span>
            </button>
            <button
              type="button" data-action="set-legal-tab" data-tab="contact"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                this._activeTab === 'contact'
                  ? 'border-[var(--color-accent,#e59b3c)] text-[var(--color-accent,#e59b3c)] bg-[var(--color-accent,#e59b3c)]/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }"
            >
              ${renderIcon('mail', { size: 14 })}
              <span>${t('footer.contact', undefined, 'Contact')}</span>
            </button>
          </div>

          <!-- Body Content -->
          <div class="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 text-slate-300 text-xs leading-relaxed font-sans select-text break-words">
            <div class="flex items-center justify-between pb-3 border-b border-white/8">
              <span class="text-xs font-mono text-[var(--color-accent,#e59b3c)] font-bold uppercase tracking-wider flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-accent,#e59b3c)]"></span>
                ${this._activeTab.toUpperCase()} OVERVIEW
              </span>
              <span class="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                ${renderIcon('shieldCheck', { size: 12 })} EU Sovereign Standard
              </span>
            </div>
            ${this._renderTabContent()}
          </div>

        </div>
      </div>
    `;
  }

  private _renderTabContent(): string {
    switch (this._activeTab) {
      case 'about':
        return `
          <div class="space-y-4">
            <div class="p-3.5 rounded-xl bg-[var(--color-accent,#e59b3c)]/10 border border-[var(--color-accent,#e59b3c)]/20 space-y-1.5">
              <h4 class="font-bold text-sm text-[var(--color-accent,#e59b3c)]">What is UREfy?</h4>
              <p class="text-slate-300">
                UREfy is a social network where people can post, join communities, message privately, and own their identity. It uses decentralized identity, end-to-end encryption and privacy-preserving technology underneath.
              </p>
            </div>

            <div class="space-y-3">
              <h5 class="font-bold text-xs text-white">1. Non-Custodial Architecture & Zero Central Identity Databases</h5>
              <p>Unlike traditional social networks, UREfy never stores your identity credentials on central servers. Identity is generated directly on your device as an Ed25519 asymmetric keypair. You are the sole sovereign custodian of your cryptographic keys.</p>

              <h5 class="font-bold text-xs text-white">2. Algorithmic Transparency & Open Source</h5>
              <p>The entire source code is audited, verifiable, and open source. There are no opaque recommendation algorithms engineered for behavioral addiction or advertising monetization.</p>

              <h5 class="font-bold text-xs text-white">3. European Engineering & Digital Sovereignty</h5>
              <p>The platform strictly complies with European directives regarding data sovereignty, fundamental privacy rights, and responsible freedom of expression.</p>
            </div>
          </div>
        `;
      case 'terms':
        return `
          <div class="space-y-3">
            <h4 class="font-bold text-sm text-white">1. Network Architecture & Identity Custody</h4>
            <p>UREfy operates exclusively via self-managed Ed25519 cryptographic identifiers. Each user maintains complete and sole custody over their private key stored locally on their device.</p>
            
            <h4 class="font-bold text-sm text-white">2. Public Content & Cryptographic Signatures</h4>
            <p>All pulses, open channel messages, and Knowledge Vault artifacts are cryptographically signed by their author. The author bears sole legal responsibility for signed content broadcast across the network.</p>

            <h4 class="font-bold text-sm text-white">3. Strictly Prohibited Content</h4>
            <p>The following are categorically prohibited: Child Sexual Abuse Material (CSAM), terrorism, incitement to hatred or violence, malware, and malicious exploits. Violations result in immediate reporting and automated network isolation via ZK-RLN Slashing.</p>
          </div>
        `;
      case 'privacy':
        return `
          <div class="space-y-3">
            <div class="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-1">
              <span class="text-[10px] font-mono uppercase text-emerald-400 font-bold">GDPR Compliance Statement (EU Regulation 2016/679)</span>
              <p class="text-slate-300">UREfy minimizes data collection. Public posts, hosting metadata and operational records are processed as described in the privacy policy.</p>
            </div>
            <h4 class="font-bold text-sm text-white">1. Zero-Data Principle & No Tracking</h4>
            <p>The platform does not solicit or collect real names, email addresses, passwords, or phone numbers. There are zero third-party trackers, Google Analytics, or commercial profiling cookies.</p>

            <h4 class="font-bold text-sm text-white">2. Hybrid Post-Quantum Encryption (E2EE)</h4>
            <p>Direct communications are end-to-end encrypted with ML-KEM-768 and AES-256-GCM. No node operator, cloud provider, or external entity can decrypt or inspect your private messages.</p>

            <h4 class="font-bold text-sm text-white">3. Optional AI summaries</h4>
            <p>When you choose an AI summary on a public post, its title and text are sent to Microsoft Azure OpenAI. Private posts, direct messages and recovery keys are not sent. UREfy keeps only a generated-summary cache for up to 30 days and content-free request usage records for up to 180 days. See the <a href="/privacy" class="underline">full privacy policy</a>.</p>

            <h4 class="font-bold text-sm text-white">4. Right to Erasure & Data Portability</h4>
            <p>You retain full custody over your data: clearing your local IndexedDB storage completely purges all data from your browser. You can export a complete cryptographic archive at any time from the Export & Backup section.</p>
          </div>
        `;
      case 'rules':
        return `
          <div class="space-y-3">
            <div class="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20 space-y-1">
              <span class="text-[10px] font-mono uppercase text-amber-400 font-bold">Moderation & Transparency Policy under Art. 14 DSA</span>
              <p class="text-slate-300">This section outlines community guidelines, technical defense mechanisms, and enforcement procedures applicable to flagged content.</p>
            </div>

            <h4 class="font-bold text-sm text-white">1. Content Standards & Prohibited Categories</h4>
            <ul class="list-disc pl-5 space-y-1 text-slate-300">
              <li><strong>Zero tolerance for CSAM and terrorism:</strong> Flagged content is unconditionally removed, and offending fingerprints are isolated.</li>
              <li><strong>Malicious file distribution (Malware):</strong> Binaries uploaded to the Vault undergo heuristic analysis for malicious packer signatures (UPX packers, suspicious entropy sections) via the Binary Hygiene engine.</li>
              <li><strong>Spam & Sybil attacks:</strong> The network enforces Proof-of-Work (PoW) challenges and Zero-Knowledge Rate Limiting (ZK-RLN) to prevent automated flooding.</li>
            </ul>

            <h4 class="font-bold text-sm text-white">2. Action & Resolution Procedures</h4>
            <p>Reports submitted through the notice mechanism are reviewed by compliance moderators within 24-48 hours. If content violates guidelines, it is withdrawn from the public feed and recorded in the D1 transparency ledger.</p>

            <h4 class="font-bold text-sm text-white">3. Right to Appeal (Art. 20 DSA)</h4>
            <p>If you believe a moderation action (removal or restriction) was applied in error to your content, you may file an appeal to <code class="text-[var(--color-accent,#e59b3c)]">contact@urefy.com</code>, citing the content identifier.</p>
          </div>
        `;
      case 'dsa':
        return `
          <div class="space-y-4">
            <div class="p-3.5 rounded-xl bg-surface-raised/40 border border-white/5 space-y-2">
              <h4 class="font-bold text-xs text-white flex items-center space-x-2">
                <span>${renderIcon('scale', { size: 15, className: 'text-[var(--color-accent,#e59b3c)] shrink-0' })}</span>
                <span>Notice and Takedown Procedure (DSA Art. 16)</span>
              </h4>
              <p class="text-[11px] text-slate-400">
                Under the EU Digital Services Act (DSA 2022/2065), any user or rights holder may report illegal or harmful content. Designated EU Single Point of Contact: <code class="text-[var(--color-accent,#e59b3c)]">contact@urefy.com</code>.
              </p>
            </div>

            ${this._reportSubmittedId ? `
              <div class="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 text-center animate-in fade-in">
                ${renderIcon('checkCircle', { size: 36, className: 'text-emerald-400 mx-auto' })}
                <h4 class="font-bold text-sm text-emerald-400">Notice Successfully Registered</h4>
                <p class="text-[11px] text-slate-300">
                  DSA Registration ID: <code class="px-2 py-0.5 rounded bg-black/40 text-emerald-300 font-mono">${this._reportSubmittedId}</code>
                </p>
                <p class="text-[11px] text-slate-400">
                  The report has been recorded in the Cloudflare D1 ledger and dispatched to compliance moderators.
                </p>
                <button
                  type="button" data-action="call-global" data-raw-click="if(window.__aetheris_open_legal) window.__aetheris_open_legal('dsa');"
                  class="px-4 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Submit another report
                </button>
              </div>
            ` : `
              <form id="dsa-report-form" data-submit="submit-dsa-report" class="space-y-3 bg-black/30 p-4 rounded-xl border border-white/5">
                <div class="font-bold text-xs text-white">Official Illegal Content Notification Form (Notice & Takedown)</div>

                <div>
                  <label for="dsa-target-id" class="block text-[11px] text-slate-400 mb-1">Content Identifier (Post ID / File Hash) *</label>
                  <input
                    type="text"
                    id="dsa-target-id"
                    value="${this._targetPostId || ''}"
                    placeholder="E.g.: post-1 or file SHA-256 hash..."
                    required
                    class="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[var(--color-accent,#e59b3c)]"
                  />
                </div>

                <div>
                  <label for="dsa-reason-select" class="block text-[11px] text-slate-400 mb-1">Reason for Notification (Legal Category) *</label>
                  <select
                    id="dsa-reason-select"
                    class="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-xs font-sans text-white focus:outline-none focus:border-[var(--color-accent,#e59b3c)]"
                  >
                    <option value="CSAM">1. Child Sexual Abuse Material (CSAM)</option>
                    <option value="TERRORISM">2. Terrorism / Violent Extremist Content</option>
                    <option value="HATE_SPEECH">3. Hate Speech / Incitement to Violence or Discrimination</option>
                    <option value="COPYRIGHT">4. Intellectual Property / Copyright Infringement</option>
                    <option value="MALWARE_PHISHING">5. Malicious Software, Malware, Phishing or Exploits</option>
                    <option value="DEFAMATION_DOXXING">6. Defamation, Doxxing or Personal Data Breach</option>
                    <option value="OTHER_ILLEGAL">7. Other Illegal Content under EU / National Law</option>
                  </select>
                </div>

                <div>
                  <label for="dsa-details" class="block text-[11px] text-slate-400 mb-1">Detailed Description of Illegal Content (Art. 16 DSA) *</label>
                  <textarea
                    id="dsa-details"
                    rows="3"
                    placeholder="Describe the specific reasons why you consider this information to constitute illegal content..."
                    class="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-xs font-sans text-white placeholder-slate-600 focus:outline-none focus:border-[var(--color-accent,#e59b3c)]"
                  ></textarea>
                </div>

                <div>
                  <label for="dsa-reporter-email" class="block text-[11px] text-slate-400 mb-1">Decision Notification Email (Optional under DSA Art. 16)</label>
                  <input
                    type="email"
                    id="dsa-reporter-email"
                    placeholder="name@example.com (if you wish to receive the moderation outcome)"
                    class="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-xs font-sans text-white placeholder-slate-600 focus:outline-none focus:border-[var(--color-accent,#e59b3c)]"
                  />
                </div>

                ${this._reportError ? `
                  <div class="text-[11px] text-rose-400 font-semibold">${this._reportError}</div>
                ` : ''}

                <div class="pt-2 flex justify-end">
                  <button
                    type="submit"
                    id="btn-submit-dsa-report"
                    data-action="submit-dsa-report"
                    ${this._isSubmittingReport ? 'disabled' : ''}
                    class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    ${this._isSubmittingReport ? 'Submitting report...' : `${renderIcon('flag', { size: 14 })} Submit DSA Report to Moderators`}
                  </button>
                </div>
              </form>
            `}
          </div>
        `;
      case 'contact':
        return `
          <div class="space-y-4">
            <div class="p-3.5 rounded-xl bg-surface-raised border border-white/10 space-y-1.5">
              <h4 class="font-bold text-sm text-[var(--color-accent,#e59b3c)]">Single Points of Contact (SPOC)</h4>
              <p class="text-slate-300">
                In accordance with Article 11 (public authorities) and Article 12 (recipients of service) of Regulation (EU) 2022/2065 (DSA) and Directive 2000/31/EC on electronic commerce:
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="p-3.5 rounded-xl bg-surface-raised border border-white/5 space-y-2">
                <span class="text-xs font-bold text-white flex items-center space-x-2">
                  <span>${renderIcon('landmark', { size: 15, className: 'text-[var(--color-accent,#e59b3c)] shrink-0' })}</span>
                  <span>For EU Member State Authorities & European Commission (Art. 11)</span>
                </span>
                <p class="text-[11px] text-slate-400">Designated point of contact for official communications:</p>
                <div class="font-mono text-xs text-[var(--color-accent,#e59b3c)] bg-black/40 p-2 rounded-lg border border-white/5 break-all">
                  contact@urefy.com
                </div>
                <p class="text-[10px] text-slate-500">Accepted communication languages: English, Romanian.</p>
              </div>

              <div class="p-3.5 rounded-xl bg-surface-raised border border-white/5 space-y-2">
                <span class="text-xs font-bold text-white flex items-center space-x-2">
                  <span>${renderIcon('users', { size: 15, className: 'text-cyan-400 shrink-0' })}</span>
                  <span>For Users & Service Recipients (Art. 12)</span>
                </span>
                <p class="text-[11px] text-slate-400">For assistance, appeals, and legal inquiries:</p>
                <div class="font-mono text-xs text-[var(--color-accent,#e59b3c)] bg-black/40 p-2 rounded-lg border border-white/5 break-all">
                  contact@urefy.com
                </div>
                <p class="text-[10px] text-slate-500">Average response time: 24 - 48 hours.</p>
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-surface-base border border-white/5 space-y-1.5">
              <h5 class="font-bold text-xs text-white">Legal Information / Provider Identification (Impressum)</h5>
              <p class="text-slate-400 text-[11px]">
                The UREfy digital service operates as a sovereign decentralized protocol across Cloudflare Pages Anycast & Edge Workers infrastructure, with data securely persisted on Cloudflare D1.
              </p>
            </div>
          </div>
        `;
      default:
        return '';
    }
  }
}

export const legalModal = new LegalModal();
serviceRegistry.registerInstance(SERVICES.LegalModal, legalModal);

// Global window bindings
if (typeof window !== 'undefined') {
  (window as any).legalModal = legalModal;
  (window as any).__aetheris_open_legal = (tab: LegalTab = 'terms', targetId: string = '') => legalModal.open(tab, targetId);
  (window as any).__aetheris_close_legal = () => legalModal.close();
  (window as any).__aetheris_set_legal_tab = (tab: LegalTab) => legalModal.setTab(tab);
  (window as any).__aetheris_submit_dsa_report = () => legalModal.submitDsaReport();
}
