/**
 * Omni-Sphere Multi-Format Composer.
 * Supports structured articles, real-time micro-pulses with dynamic circular SVG countdown ring,
 * responsive media attachments, quote-posts, cryptographic polls, and binary releases.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';

export interface ComposerAttachment {
  id: string;
  url: string;
  alt?: string;
  type: 'image' | 'video' | 'binary';
}

export interface QuotedPulseData {
  id: string;
  authorFingerprint: string;
  authorRole: string;
  title: string;
  content: string;
  createdAt?: number;
}

export class OmniComposer {
  public activeTab: 'article' | 'pulse' | 'poll' | 'vault' = 'pulse';
  public currentTextLength: number = 0;
  public maxPulseLength: number = 280;
  public attachedMedia: ComposerAttachment[] = [];
  public quotedPulse: QuotedPulseData | null = null;
  public pollOptions: string[] = ['', ''];
  public pollDuration: string = '1 day';
  public audience: 'everyone' | 'circle' = 'everyone';
  public isModalOpen: boolean = false;

  /**
   * Calculates the SVG circular character limit ring metrics.
   * Returns radius, circumference, strokeDashoffset, color, and remaining characters.
   */
  public getCharacterRingMetrics(length: number = this.currentTextLength, max: number = this.maxPulseLength): {
    radius: number;
    circumference: number;
    strokeDashoffset: number;
    strokeColor: string;
    charsLeft: number;
    progressPercent: number;
    isWarning: boolean;
    isExceeded: boolean;
  } {
    const radius = 12;
    const circumference = 2 * Math.PI * radius; // ~75.398
    const charsLeft = max - length;
    const progressPercent = Math.min(100, Math.max(0, (length / max) * 100));
    const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, length) / max));

    let strokeColor = '#6366f1'; // Default Indigo / Cyphr
    const isWarning = charsLeft <= 20 && charsLeft >= 0;
    const isExceeded = charsLeft < 0;

    if (isExceeded || charsLeft <= 10) {
      strokeColor = '#ef4444'; // Red / Danger
    } else if (isWarning) {
      strokeColor = '#ffd400'; // Yellow / Warning
    }

    return {
      radius,
      circumference,
      strokeDashoffset,
      strokeColor,
      charsLeft,
      progressPercent,
      isWarning,
      isExceeded,
    };
  }

  /**
   * Renders the dynamic circular SVG countdown ring HTML.
   */
  public renderCircularCountdownRing(length: number = this.currentTextLength, max: number = this.maxPulseLength): string {
    const metrics = this.getCharacterRingMetrics(length, max);

    return `
      <div class="relative w-8 h-8 flex items-center justify-center select-none" title="${metrics.charsLeft} characters remaining">
        <svg class="w-7 h-7 transform -rotate-90" viewBox="0 0 32 32">
          <!-- Background track circle -->
          <circle
            cx="16"
            cy="16"
            r="${metrics.radius}"
            stroke="#2f3336"
            stroke-width="2.5"
            fill="transparent"
          />
          <!-- Dynamic progress circle -->
          <circle
            cx="16"
            cy="16"
            r="${metrics.radius}"
            stroke="${metrics.strokeColor}"
            stroke-width="2.5"
            stroke-linecap="round"
            fill="transparent"
            stroke-dasharray="${metrics.circumference.toFixed(2)}"
            stroke-dashoffset="${metrics.strokeDashoffset.toFixed(2)}"
            class="transition-all duration-150 ease-out"
          />
        </svg>
        ${metrics.isWarning || metrics.isExceeded ? `
          <span class="absolute text-[10px] font-mono font-bold ${metrics.isExceeded || metrics.charsLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-amber-400'}">
            ${metrics.charsLeft}
          </span>
        ` : ''}
      </div>
    `;
  }

  public addMedia(url: string, alt: string = 'Visual attachment'): void {
    if (this.attachedMedia.length >= 4) return;
    this.attachedMedia.push({
      id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url,
      alt,
      type: 'image',
    });
  }

  public removeMedia(index: number): void {
    if (index >= 0 && index < this.attachedMedia.length) {
      this.attachedMedia.splice(index, 1);
    }
  }

  public setQuotedPulse(pulse: QuotedPulseData | null): void {
    this.quotedPulse = pulse;
  }

  public clearComposer(): void {
    this.currentTextLength = 0;
    this.attachedMedia = [];
    this.quotedPulse = null;
    this.pollOptions = ['', ''];
    this.pollDuration = '1 day';
    this.audience = 'everyone';
    this.isModalOpen = false;
  }

  public renderComposerModal(): string {
    const metrics = this.getCharacterRingMetrics();

    return `
      <div id="composer-modal-overlay" class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in zoom-in-95 duration-150">
        <div class="w-full max-w-[640px] bg-surface-base border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          
          <!-- TOP TABS (CHOOSE POST TYPE) -->
          <div class="p-3.5 border-subtle-b bg-surface-raised/40 flex items-center justify-between">
            <div class="flex items-center space-x-1.5 bg-surface-base p-1 rounded-2xl border border-white/5">
              <button type="button" data-composer-tab="pulse" class="btn-composer-tab px-3.5 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer ${this.activeTab === 'pulse' ? 'bg-surface-overlay text-indigo-400 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}">
                ⚡ Micro-Pulse
              </button>
              <button type="button" data-composer-tab="article" class="btn-composer-tab px-3.5 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer ${this.activeTab === 'article' ? 'bg-surface-overlay text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}">
                📝 Article
              </button>
              <button type="button" data-composer-tab="poll" class="btn-composer-tab px-3.5 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer ${this.activeTab === 'poll' ? 'bg-surface-overlay text-emerald-400 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}">
                📊 Crypto Poll
              </button>
              <button type="button" data-composer-tab="vault" class="btn-composer-tab px-3.5 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer ${this.activeTab === 'vault' ? 'bg-surface-overlay text-emerald-400 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}">
                🛡️ Binary Release
              </button>
            </div>

            <button type="button" id="btn-close-composer" class="text-slate-400 hover:text-white font-mono w-8 h-8 rounded-full hover:bg-surface-overlay flex items-center justify-center cursor-pointer transition-colors" title="Close">
              ✕
            </button>
          </div>

          <!-- FORM CONTAINER -->
          <form id="form-omni-compose" class="p-5 space-y-4 overflow-y-auto flex-1">
            ${this.renderActiveTabFields()}

            <!-- ATTACHED MEDIA GRID PREVIEW -->
            ${this.renderAttachedMediaPreview()}

            <!-- QUOTED PULSE PREVIEW -->
            ${this.renderQuotedPulsePreview()}

            <!-- FOOTER WITH RADIAL RING & SUBMIT -->
            <div class="flex items-center justify-between pt-3 border-subtle-t">
              <div class="flex items-center space-x-3">
                <!-- RADIAL SVG CHARACTER COUNTER RING -->
                ${this.activeTab === 'pulse' ? `
                  <div class="flex items-center space-x-2">
                    ${this.renderCircularCountdownRing()}
                    <div class="w-px h-5 bg-white/10"></div>
                  </div>
                ` : `
                  <span class="text-[10px] text-slate-400">🔒 End-to-end encrypted</span>
                `}
                <span class="text-[10px] text-slate-500">No tracking</span>
              </div>

              <div class="flex items-center space-x-2.5">
                <button type="button" id="btn-cancel-composer" class="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer font-medium">Cancel</button>
                <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-full shadow-lg transition-all hover:brightness-110 active:scale-95 cursor-pointer">
                  Post
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    `;
  }

  public renderAttachedMediaPreview(): string {
    if (this.attachedMedia.length === 0) return '';

    const gridLayoutClass = this.attachedMedia.length === 1 ? 'grid-cols-1' :
      this.attachedMedia.length === 2 ? 'grid-cols-2' :
      this.attachedMedia.length === 3 ? 'grid-cols-2' : 'grid-cols-2';

    return `
      <div class="grid ${gridLayoutClass} gap-2 my-2 rounded-2xl overflow-hidden border border-white/10">
        ${this.attachedMedia.map((m, idx) => `
          <div class="relative group rounded-xl overflow-hidden aspect-video bg-surface-raised">
            <img src="${m.url}" alt="${m.alt || 'attachment'}" class="w-full h-full object-cover" />
            <button
              type="button"
              data-remove-media-idx="${idx}"
              class="btn-remove-composer-media absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors cursor-pointer"
              title="Remove attachment"
            >
              ✕
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  public renderQuotedPulsePreview(): string {
    if (!this.quotedPulse) return '';

    return `
      <div class="p-3.5 rounded-2xl border border-white/10 bg-surface-raised/80 space-y-1.5 relative">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2 text-xs">
            <span class="text-indigo-400 font-bold">❝ Quoted Pulse</span>
            <span class="text-slate-500">·</span>
            <span class="font-mono text-slate-300">@id:${this.quotedPulse.authorFingerprint.substring(0, 8)}</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">${this.quotedPulse.authorRole}</span>
          </div>
          <button type="button" id="btn-remove-quoted-pulse" class="text-xs text-slate-400 hover:text-rose-400 font-mono px-1 cursor-pointer">
            ✕
          </button>
        </div>
        ${this.quotedPulse.title ? `<div class="text-xs font-bold text-slate-200">${this.quotedPulse.title}</div>` : ''}
        <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">${this.quotedPulse.content}</p>
      </div>
    `;
  }

  private renderActiveTabFields(): string {
    if (this.activeTab === 'pulse') {
      return `
        <div class="space-y-2">
          <!-- AUDIENCE SELECTOR -->
          <div class="flex items-center space-x-2 pb-1">
            <span class="text-xs font-bold text-indigo-400 bg-indigo-950/70 border border-indigo-500/30 px-3 py-1 rounded-full cursor-pointer hover:bg-indigo-900/60 transition-colors">
              🌐 ${this.audience === 'everyone' ? 'Public' : 'Community members'}
            </span>
          </div>

          <textarea 
            id="composer-pulse-input" 
            maxlength="${this.maxPulseLength}"
            placeholder="What's on your mind? (Hashtags, markdown, and links supported)..."
            class="w-full bg-surface-raised border border-white/10 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none h-32 leading-relaxed font-sans"
            autofocus
            required
          ></textarea>
        </div>
      `;
    }

    if (this.activeTab === 'poll') {
      return `
        <div class="space-y-3">
          <div>
            <label class="block text-[11px] font-mono text-slate-400 mb-1">Poll Question</label>
            <input 
              type="text" 
              id="composer-poll-question" 
              placeholder="Ask a community question for cryptographic voting..."
              class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <div class="space-y-2">
            <label class="block text-[11px] font-mono text-slate-400">Options (2-4 choices)</label>
            <input type="text" id="poll-opt-0" placeholder="Option 1" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" required />
            <input type="text" id="poll-opt-1" placeholder="Option 2" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" required />
            <input type="text" id="poll-opt-2" placeholder="Option 3 (optional)" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" />
            <input type="text" id="poll-opt-3" placeholder="Option 4 (optional)" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'vault') {
      return `
        <div class="space-y-3">
          <div>
            <label class="block text-[11px] font-mono text-slate-400 mb-1">Release Title</label>
            <input type="text" id="composer-vault-title" placeholder="E.g. WireGuard Micro-Kernel v1.2.0" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" required />
          </div>
          <div>
            <label class="block text-[11px] font-mono text-slate-400 mb-1">Technical Synthesis & Reproducibility Notes</label>
            <textarea id="composer-vault-desc" placeholder="Changelog, build flags, and security notes..." class="w-full bg-surface-raised border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none h-20"></textarea>
          </div>
          <div class="p-4 rounded-2xl border border-dashed border-indigo-500/30 bg-surface-raised text-center cursor-pointer hover:bg-surface-overlay transition-colors">
            <span class="text-xs text-slate-300">Drag & Drop binary file to compute Shannon entropy & SHA-256</span>
          </div>
        </div>
      `;
    }

    // Default: Sovereign Structured Article
    return `
      <div class="space-y-3">
        <div>
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Article Title</label>
          <input 
            type="text" 
            id="composer-article-title" 
            placeholder="Write a clear, descriptive title for the publication..."
            class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>
        <div>
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Circle / Category</label>
          <select id="composer-article-flair" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500">
            <option value="VERIFIED RELEASE">📦 VERIFIED RELEASE</option>
            <option value="SECURITY ADVISORY">🛡️ SECURITY ADVISORY</option>
            <option value="TECH DISCUSSION">💬 TECH DISCUSSION</option>
            <option value="ASK COMMUNITY">❓ ASK COMMUNITY</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Markdown Body</label>
          <textarea 
            id="composer-article-body" 
            placeholder="Write Markdown, code blocks, technical analysis, or benchmarks..."
            class="w-full bg-surface-raised border border-white/10 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none h-28 leading-relaxed font-sans"
            required
          ></textarea>
        </div>
      </div>
    `;
  }
}

export const omniComposer = new OmniComposer();
serviceRegistry.registerInstance(SERVICES.OmniComposer, omniComposer);
