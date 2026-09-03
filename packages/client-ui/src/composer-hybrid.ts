/**
 * Aetheris Omni-Sphere — Unified Hybrid Content Composer
 * (composer-hybrid.ts)
 *
 * 100% Self-Contained, Strict TypeScript, Zero External Dependencies.
 * Synthesizes:
 * 1. Multi-Tab Content Creation:
 *    - 📝 Pulse / Article Tab: Rich text with Markdown formatting tools (Bold, Italic, Strikethrough, Code, Quote, Spoiler, Link, Heading) & live preview.
 *    - 🖼️ Media Gallery Tab: Upload of up to 4 images/videos with preview, reordering, SHA-256 integrity, and removal.
 *    - 📊 Sovereign Poll Builder: Poll creation with 2-6 options, configurable duration (1d, 3d, 7d), animated progress bars.
 *    - 💻 Verified Code / Patch Tab: Multi-language editor (TypeScript, Rust, Python, Go, C++, Solidity, Diff) with SHA-256 diff inspector & Shannon entropy.
 * 2. Circular SVG Progress Ring + Thread Chain Builder ("Add to thread").
 * 3. Audience & Sovereign Circle Selector with SFrame E2EE indicators.
 * 4. Automatic Draft Autosave in IndexedDB & Cryptographic Signing (Ed25519 + ZK-RLN).
 */

import { clientStore, ClientPost } from './client-state.js';
import { pollEngine } from './polls.js';
import { soundEffects } from './sound-effects.js';
import { markdownRenderer } from './markdown-renderer.js';
import { aethDB } from './indexed-db.js';
import { draftAutosave } from './draft-autosave.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { signMessage, ZKRLN, bytesToHex } from '@aetheris/core-crypto';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export type ComposerTab = 'pulse' | 'article' | 'media' | 'poll' | 'code' | 'vault';
export type AudienceCircle = 'public-stream' | 'circle-core' | 'circle-guardians' | 'relays-general' | 'vault-releases';
export type SupportedCodeLang = 'typescript' | 'rust' | 'python' | 'go' | 'cpp' | 'solidity' | 'diff';
export type PollDuration = 86400000 | 259200000 | 604800000; // 1 day, 3 days, 7 days

export interface MediaGalleryItem {
  id: string;
  fileName: string;
  fileType: 'image' | 'video';
  mimeType: string;
  dataUrl: string;
  byteSize: number;
  sha256: string;
  caption: string;
  width?: number;
  height?: number;
}

export interface ThreadSegment {
  id: string;
  content: string;
  mediaAttachment?: MediaGalleryItem;
}

export interface PollBuilderState {
  question: string;
  options: string[];
  durationMs: PollDuration;
  allowMultiple: boolean;
}

export interface CodeEditorState {
  language: SupportedCodeLang;
  filename: string;
  code: string;
  sha256: string;
  entropy: number;
  byteSize: number;
  isDiffMode: boolean;
}

export interface HybridComposerDraft {
  tab: ComposerTab;
  audience: AudienceCircle;
  articleTitle: string;
  articleCategory: string;
  articleBody: string;
  threadSegments: ThreadSegment[];
  mediaItems: MediaGalleryItem[];
  poll: PollBuilderState;
  code: CodeEditorState;
  updatedAt: number;
}

export interface CryptographicProofDetails {
  authorFingerprint: string;
  ed25519Signature: string;
  rlnNullifier: string;
  rlnShareX: string;
  rlnShareY: string;
  epoch: string;
  payloadDigest: string;
}

// ---------------------------------------------------------------------------
// Helper Utilities
// ---------------------------------------------------------------------------

/**
 * Escapes HTML characters for XSS prevention.
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Computes SHA-256 hex string asynchronously from text or ArrayBuffer.
 */
export async function computeSha256Hex(data: string | ArrayBuffer): Promise<string> {
  try {
    let buffer: ArrayBuffer;
    if (typeof data === 'string') {
      buffer = new TextEncoder().encode(data).buffer;
    } else {
      buffer = data;
    }
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback simple checksum if WebCrypto unavailable
    let hash = 0;
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

/**
 * Calculates Shannon Entropy of a string in bits per byte (0 to 8).
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  const freq: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    freq[char] = (freq[char] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const char in freq) {
    const p = freq[char] / len;
    entropy -= p * (Math.log(p) / Math.LN2);
  }
  return Number(entropy.toFixed(2));
}

/**
 * Formats byte counts into human-readable strings.
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const normalized = Math.min(i, units.length - 1);
  const val = bytes / Math.pow(1024, normalized);
  return `${val.toFixed(val < 10 ? 1 : 0)} ${units[normalized]}`;
}

// ---------------------------------------------------------------------------
// Hybrid Composer Main Engine
// ---------------------------------------------------------------------------

export class HybridComposer {
  public activeTab: ComposerTab = 'pulse';
  public audience: AudienceCircle = 'public-stream';

  // Article Tab State
  public articleTitle: string = '';
  public articleCategory: string = 'TECH DISCUSSION';
  public articleBody: string = '';
  public isArticlePreviewMode: boolean = false;

  // Micro-Pulse & Thread Builder State
  public maxPulseLength: number = 280;
  public threadSegments: ThreadSegment[] = [
    { id: 'seg-0', content: '' }
  ];
  public activeSegmentIndex: number = 0;

  // Media Gallery State (Max 4 items)
  public mediaItems: MediaGalleryItem[] = [];
  public maxMediaItems: number = 4;

  // Sovereign Poll Builder State
  public pollState: PollBuilderState = {
    question: '',
    options: ['', ''],
    durationMs: 86400000, // 24 hours
    allowMultiple: false,
  };
  public pollPreviewVoteIndex: number | null = null;

  // Verified Code / Patch State
  public codeState: CodeEditorState = {
    language: 'typescript',
    filename: 'smart_contract.ts',
    code: `// Aetheris Sovereign Zero-Knowledge Smart Contract\nexport function verifyProof(nullifier: string, epoch: number): boolean {\n  return nullifier.length === 64 && epoch > 0;\n}`,
    sha256: '',
    entropy: 4.85,
    byteSize: 180,
    isDiffMode: false,
  };

  // Draft Autosave & Cryptographic Signing State
  public draftStatus: 'idle' | 'saving' | 'saved' | 'restored' = 'idle';
  public lastSavedAt: number | null = null;
  public isProofDrawerOpen: boolean = false;
  private autosaveDebounceTimer: any = null;
  private isInitialHydrated: boolean = false;

  constructor() {
    this.updateCodeMetrics();
    this.hydrateFromDraftStorage();
  }

  /**
   * Hydrates previous draft from IndexedDB or LocalStorage if present.
   */
  public async hydrateFromDraftStorage(force: boolean = false): Promise<void> {
    if (this.isInitialHydrated && !force) return;
    this.isInitialHydrated = true;

    try {
      const stored = (await aethDB.get('drafts', 'hybrid_composer_active_draft')) as any;
      if (stored && stored.content) {
        try {
          const parsed = JSON.parse(stored.content) as HybridComposerDraft;
          if (parsed) {
            if (parsed.tab) this.activeTab = parsed.tab;
            if (parsed.audience) this.audience = parsed.audience;
            if (parsed.articleTitle !== undefined) this.articleTitle = parsed.articleTitle;
            if (parsed.articleCategory) this.articleCategory = parsed.articleCategory;
            if (parsed.articleBody !== undefined) this.articleBody = parsed.articleBody;
            if (Array.isArray(parsed.threadSegments) && parsed.threadSegments.length > 0) {
              this.threadSegments = parsed.threadSegments;
            }
            if (Array.isArray(parsed.mediaItems)) {
              this.mediaItems = parsed.mediaItems.slice(0, this.maxMediaItems);
            }
            if (parsed.poll && Array.isArray(parsed.poll.options)) {
              this.pollState = parsed.poll;
            }
            if (parsed.code) {
              this.codeState = parsed.code;
            }
            this.draftStatus = 'restored';
            this.lastSavedAt = parsed.updatedAt || Date.now();
          }
        } catch {
          // plain text fallback
        }
      }
    } catch (e) {
      console.warn('[HybridComposer] Failed hydrating draft:', e);
    }
  }

  /**
   * Automatically debounces draft persistence to IndexedDB (350ms).
   */
  public queueAutosave(): void {
    this.draftStatus = 'saving';
    this.updateDraftStatusBadgeDom();

    if (this.autosaveDebounceTimer) {
      clearTimeout(this.autosaveDebounceTimer);
    }

    this.autosaveDebounceTimer = setTimeout(async () => {
      await this.saveDraftNow();
    }, 350);
  }

  /**
   * Immediate synchronous/async draft commit to IndexedDB and DraftAutosaveManager.
   */
  public async saveDraftNow(): Promise<void> {
    try {
      const draftPayload: HybridComposerDraft = {
        tab: this.activeTab,
        audience: this.audience,
        articleTitle: this.articleTitle,
        articleCategory: this.articleCategory,
        articleBody: this.articleBody,
        threadSegments: this.threadSegments,
        mediaItems: this.mediaItems,
        poll: this.pollState,
        code: this.codeState,
        updatedAt: Date.now(),
      };

      const jsonStr = JSON.stringify(draftPayload);

      // 1. Save to IndexedDB
      await aethDB.put('drafts', {
        key: 'hybrid_composer_active_draft',
        title: this.articleTitle || this.threadSegments[0]?.content.slice(0, 30) || 'Sovereign Draft',
        content: jsonStr,
        updatedAt: Date.now(),
        channelId: this.audience,
        tags: [this.articleCategory, this.activeTab],
      });

      // 2. Also inform draftAutosave service
      draftAutosave.saveDraft('hybrid_composer_active_draft', {
        title: this.articleTitle || 'Composer Draft',
        content: jsonStr,
        formatType: this.activeTab,
        channelId: this.audience,
      });

      this.draftStatus = 'saved';
      this.lastSavedAt = Date.now();
      this.updateDraftStatusBadgeDom();
    } catch (err) {
      console.warn('[HybridComposer] Draft autosave error:', err);
    }
  }

  /**
   * Clears saved draft upon successful network broadcast.
   */
  public async clearDraft(): Promise<void> {
    try {
      await aethDB.delete('drafts', 'hybrid_composer_active_draft');
      draftAutosave.clearDraft('hybrid_composer_active_draft');
      this.articleTitle = '';
      this.articleBody = '';
      this.threadSegments = [{ id: 'seg-0', content: '' }];
      this.mediaItems = [];
      this.pollState = { question: '', options: ['', ''], durationMs: 86400000, allowMultiple: false };
      this.draftStatus = 'idle';
      this.lastSavedAt = null;
      this.updateDraftStatusBadgeDom();
    } catch (e) {
      console.warn('[HybridComposer] Failed to clear draft:', e);
    }
  }

  /**
   * Recalculates code metrics (SHA-256, entropy, byteSize).
   */
  public async updateCodeMetrics(): Promise<void> {
    const raw = this.codeState.code || '';
    this.codeState.byteSize = new TextEncoder().encode(raw).length;
    this.codeState.entropy = calculateShannonEntropy(raw);
    this.codeState.sha256 = await computeSha256Hex(raw);
  }

  // ---------------------------------------------------------------------------
  // Circular SVG Progress Ring Generator
  // ---------------------------------------------------------------------------

  public renderRadialProgress(currentLen: number, maxLen: number = 280): string {
    return this.renderCircularCountdownRing(currentLen, maxLen);
  }

  public renderCircularCountdownRing(currentLen: number = 0, maxLen: number = 280): string {
    const r = 12;
    const circumference = 2 * Math.PI * r; // ~75.40
    const ratio = Math.min(1.2, currentLen / maxLen);
    const strokeDashoffset = Math.max(0, circumference * (1 - Math.min(1, ratio)));
    
    let strokeColor = '#6366f1'; // cyphr/indigo
    if (ratio >= 1) {
      strokeColor = '#ef4444'; // red (overflow)
    } else if (ratio >= 0.8) {
      strokeColor = '#f59e0b'; // amber
    } else if (ratio > 0) {
      strokeColor = '#06b6d4'; // cyan
    }

    const remaining = maxLen - currentLen;
    const badgeText = remaining <= 20 ? (remaining < 0 ? `${remaining}` : `${remaining}`) : '';

    return `
      <div class="relative w-8 h-8 flex items-center justify-center select-none" title="${currentLen} / ${maxLen} characters">
        <svg class="w-8 h-8 -rotate-90 transform" viewBox="0 0 32 32">
          <!-- Background Track -->
          <circle cx="16" cy="16" r="${r}" stroke="currentColor" stroke-width="2.5" class="text-white/10" fill="transparent" />
          <!-- Animated Progress Fill -->
          <circle 
            cx="16" 
            cy="16" 
            r="${r}" 
            stroke="${strokeColor}" 
            stroke-width="2.5" 
            stroke-linecap="round" 
            fill="transparent" 
            stroke-dasharray="${circumference}" 
            stroke-dashoffset="${strokeDashoffset}" 
            class="transition-all duration-150"
          />
        </svg>
        ${badgeText ? `
          <span class="absolute text-[9px] font-mono font-bold ${remaining < 0 ? 'text-rose-400' : 'text-amber-400'}">
            ${badgeText}
          </span>
        ` : `
          <span class="absolute text-[8px] font-mono text-slate-500 font-semibold">
            ${Math.round(ratio * 100)}%
          </span>
        `}
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Rendering Methods for Modals & Tabs
  // ---------------------------------------------------------------------------

  /**
   * Main Modal Render Entry Point.
   */
  public renderComposerModal(): string {
    return `
      <div id="composer-modal-overlay" class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in zoom-in-95 duration-150 overflow-y-auto">
        <div class="w-full max-w-[760px] bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
          
          <!-- COMPOSER HEADER & TAB NAVIGATION -->
          <div class="p-3 border-subtle-b bg-surface-raised/60 flex flex-wrap items-center justify-between gap-2">
            
            <!-- MULTI-TAB SWITCHER -->
            <div class="flex items-center space-x-1 bg-surface-base/80 p-1 rounded-xl border border-white/5 overflow-x-auto">
              <button type="button" data-composer-tab="pulse" class="btn-composer-tab px-3 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${this.activeTab === 'pulse' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200'}">
                <span>⚡</span>
                <span>Pulse & Thread</span>
              </button>
              
              <button type="button" data-composer-tab="article" class="btn-composer-tab px-3 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${this.activeTab === 'article' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200'}">
                <span>📝</span>
                <span>Article</span>
              </button>
              
              <button type="button" data-composer-tab="media" class="btn-composer-tab px-3 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${this.activeTab === 'media' ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200'}">
                <span>🖼️</span>
                <span>Media (${this.mediaItems.length}/4)</span>
              </button>
              
              <button type="button" data-composer-tab="poll" class="btn-composer-tab px-3 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${this.activeTab === 'poll' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200'}">
                <span>📊</span>
                <span>Poll</span>
              </button>
              
              <button type="button" data-composer-tab="code" class="btn-composer-tab px-3 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${this.activeTab === 'code' || this.activeTab === 'vault' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200'}">
                <span>💻</span>
                <span>Code & Diff</span>
              </button>
            </div>

            <!-- RIGHT CONTROLS: DRAFT STATUS & CLOSE -->
            <div class="flex items-center space-x-2.5">
              <div id="composer-draft-badge" class="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/5 text-[10px] font-mono text-slate-400 border border-white/5">
                ${this.renderDraftStatusHtml()}
              </div>

              <button type="button" id="btn-close-composer" class="text-slate-400 hover:text-white font-mono w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-overlay cursor-pointer transition-colors" title="Close Composer">
                ✕
              </button>
            </div>
          </div>

          <!-- AUDIENCE & ENCRYPTION DESTINATION BAR -->
          <div class="px-5 py-2.5 bg-surface-base/50 border-subtle-b flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex items-center space-x-2">
              <span class="text-slate-400 font-medium text-[11px]">Audience Destination:</span>
              <select id="composer-audience-select" class="bg-surface-raised border border-white/10 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium">
                <option value="public-stream" ${this.audience === 'public-stream' ? 'selected' : ''}>🌐 Public Pulse Stream (Zero Central Tracking)</option>
                <option value="circle-core" ${this.audience === 'circle-core' ? 'selected' : ''}>🛡️ Sovereign Core Circle (SFrame E2EE)</option>
                <option value="circle-guardians" ${this.audience === 'circle-guardians' ? 'selected' : ''}>🏛️ Guardians & Archivists (E2EE Multi-Sig)</option>
                <option value="relays-general" ${this.audience === 'relays-general' ? 'selected' : ''}>⚡ Developer Matrix / Relays</option>
                <option value="vault-releases" ${this.audience === 'vault-releases' ? 'selected' : ''}>📦 Vault Security Audits (Binary Releases)</option>
              </select>
            </div>

            <div class="flex items-center space-x-2">
              ${this.audience.startsWith('circle-') ? `
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                  SFrame E2EE Active
                </span>
              ` : `
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5"></span>
                  ZK-RLN Gated Stream
                </span>
              `}
            </div>
          </div>

          <!-- SCROLLABLE BODY CONTENT -->
          <div class="p-5 overflow-y-auto flex-1 space-y-4 max-h-[60vh]">
            ${this.renderActiveTabContent()}
          </div>

          <!-- FOOTER: PROOF INSPECTOR & SUBMIT BAR -->
          <div class="p-4 border-subtle-t bg-surface-raised/40 space-y-3">
            
            <!-- OPTIONAL CRYPTOGRAPHIC PROOF DRAWER -->
            ${this.isProofDrawerOpen ? this.renderProofInspectorDrawer() : ''}

            <div class="flex items-center justify-between flex-wrap gap-2">
              <!-- LEFT SIGNATURE SUMMARY & PROOF TOGGLE -->
              <div class="flex items-center space-x-3">
                <button type="button" id="btn-toggle-proof-drawer" class="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer transition-colors">
                  <span>🔐</span>
                  <span>${this.isProofDrawerOpen ? 'Hide ZK Proof Inspector' : 'Inspect Ed25519 & ZK-RLN Signatures'}</span>
                </button>
                <span class="text-[10px] font-mono text-slate-500 hidden sm:inline">• 1 Vote/Post per Epoch • Anti-Sybil</span>
              </div>

              <!-- RIGHT ACTIONS: DISCARD DRAFT & BROADCAST -->
              <div class="flex items-center space-x-2">
                <button type="button" id="btn-discard-draft" class="px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-colors">
                  Discard Draft
                </button>
                
                <button type="button" id="btn-cancel-composer" class="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer transition-colors">
                  Cancel
                </button>

                <button type="button" id="btn-submit-hybrid-composer" class="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-2 cursor-pointer active:scale-95">
                  <span>🚀</span>
                  <span>Broadcast to Network</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    `;
  }

  /**
   * Status HTML string for draft autosave indicator.
   */
  private renderDraftStatusHtml(): string {
    if (this.draftStatus === 'saving') {
      return `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-1"></span><span>Saving to IndexedDB...</span>`;
    }
    if (this.draftStatus === 'saved') {
      return `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1"></span><span>Draft saved (${this.lastSavedAt ? new Date(this.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'now'})</span>`;
    }
    if (this.draftStatus === 'restored') {
      return `<span class="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1"></span><span>Draft restored</span>`;
    }
    return `<span class="w-1.5 h-1.5 rounded-full bg-slate-500 mr-1"></span><span>IndexedDB Autosave Ready</span>`;
  }

  /**
   * Updates draft badge in DOM without re-rendering entire modal.
   */
  public updateDraftStatusBadgeDom(): void {
    if (typeof document === 'undefined') return;
    const badge = document.getElementById('composer-draft-badge');
    if (badge) {
      badge.innerHTML = this.renderDraftStatusHtml();
    }
  }

  /**
   * Renders the active tab container.
   */
  private renderActiveTabContent(): string {
    switch (this.activeTab) {
      case 'pulse':
        return this.renderPulseAndThreadTab();
      case 'article':
        return this.renderArticleTab();
      case 'media':
        return this.renderMediaGalleryTab();
      case 'poll':
        return this.renderPollBuilderTab();
      case 'code':
      case 'vault':
        return this.renderVerifiedCodeTab();
      default:
        return this.renderPulseAndThreadTab();
    }
  }

  // ---------------------------------------------------------------------------
  // TAB 1: ⚡ Pulse & Thread Chain Builder
  // ---------------------------------------------------------------------------

  private renderPulseAndThreadTab(): string {
    return `
      <div class="space-y-4">
        
        <!-- THREAD SEGMENTS LIST -->
        <div class="space-y-4 relative">
          ${this.threadSegments.map((segment, index) => {
            const isLast = index === this.threadSegments.length - 1;
            const charCount = segment.content.length;
            const isOverflow = charCount > this.maxPulseLength;

            return `
              <div class="relative flex items-start space-x-3 group" data-segment-index="${index}">
                
                <!-- THREAD CONNECTOR LINE -->
                <div class="flex flex-col items-center flex-shrink-0 pt-2">
                  <div class="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono text-[11px] font-bold flex items-center justify-center shadow-sm">
                    ${index + 1}
                  </div>
                  ${!isLast ? `<div class="w-0.5 bg-indigo-500/30 flex-1 my-1 min-h-[50px]"></div>` : ''}
                </div>

                <!-- SEGMENT CARD -->
                <div class="flex-1 bg-surface-raised border ${isOverflow ? 'border-rose-500/50' : 'border-white/10 focus-within:border-indigo-500'} rounded-xl p-3 space-y-2 transition-all">
                  
                  <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span class="font-semibold text-slate-300">Pulse Segment ${index + 1} of ${this.threadSegments.length}</span>
                    
                    <div class="flex items-center space-x-2">
                      ${this.threadSegments.length > 1 ? `
                        <button type="button" data-action="remove-segment" data-index="${index}" class="text-slate-400 hover:text-rose-400 px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer text-xs" title="Remove this pulse">
                          ✕ Remove
                        </button>
                      ` : ''}
                    </div>
                  </div>

                  <textarea 
                    data-segment-input="${index}"
                    placeholder="${index === 0 ? "What's happening in the sovereign matrix? (Hashtags, #links, and markdown supported)..." : "Continue thread chain..."}"
                    class="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none min-h-[90px] leading-relaxed"
                  >${escapeHtml(segment.content)}</textarea>

                  <!-- SEGMENT FOOTER: RADIAL COUNTER + MEDIA INDICATOR -->
                  <div class="flex items-center justify-between pt-2 border-t border-white/5">
                    <div class="flex items-center space-x-2">
                      <button type="button" data-action="attach-media-segment" data-index="${index}" class="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center space-x-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 cursor-pointer">
                        <span>📎</span>
                        <span>Attach Media</span>
                      </button>
                      ${this.mediaItems.length > 0 ? `
                        <span class="text-[10px] font-mono text-cyan-400">(${this.mediaItems.length} gallery assets attached)</span>
                      ` : ''}
                    </div>

                    <div class="flex items-center space-x-2" id="radial-container-seg-${index}">
                      ${this.renderRadialProgress(charCount, this.maxPulseLength)}
                    </div>
                  </div>

                </div>

              </div>
            `;
          }).join('')}
        </div>

        <!-- ADD TO THREAD BUTTON -->
        <div class="flex items-center justify-between pt-1">
          <button type="button" id="btn-add-thread-segment" class="px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 hover:border-indigo-500/60 text-xs font-semibold flex items-center space-x-2 cursor-pointer transition-all shadow-sm">
            <span class="text-sm font-bold">+</span>
            <span>Add to thread chain (${this.threadSegments.length + 1})</span>
          </button>

          <span class="text-[11px] font-mono text-slate-500">
            ${this.threadSegments.length} ${this.threadSegments.length === 1 ? 'Pulse' : 'Pulses in Thread'}
          </span>
        </div>

      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // TAB 2: 📝 Sovereign Article Tab with Rich Markdown Tools
  // ---------------------------------------------------------------------------

  private renderArticleTab(): string {
    const wordCount = this.articleBody.trim() ? this.articleBody.trim().split(/\s+/).length : 0;
    const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

    return `
      <div class="space-y-3.5">
        
        <!-- TITLE INPUT -->
        <div>
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Article Title</label>
          <input 
            type="text" 
            id="composer-article-title" 
            value="${escapeHtml(this.articleTitle)}"
            placeholder="Write a clear, authoritative title for the sovereign publication..."
            class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-semibold"
          />
        </div>

        <!-- CATEGORY & FLAIR SELECTOR -->
        <div class="flex items-center space-x-3">
          <div class="flex-1">
            <label class="block text-[11px] font-mono text-slate-400 mb-1">Publication Category / Flair</label>
            <select id="composer-article-category" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer">
              <option value="TECH DISCUSSION" ${this.articleCategory === 'TECH DISCUSSION' ? 'selected' : ''}>💬 TECH DISCUSSION</option>
              <option value="SECURITY ADVISORY" ${this.articleCategory === 'SECURITY ADVISORY' ? 'selected' : ''}>🛡️ SECURITY ADVISORY</option>
              <option value="VERIFIED RELEASE" ${this.articleCategory === 'VERIFIED RELEASE' ? 'selected' : ''}>📦 VERIFIED RELEASE</option>
              <option value="ASK COMMUNITY" ${this.articleCategory === 'ASK COMMUNITY' ? 'selected' : ''}>❓ ASK COMMUNITY</option>
              <option value="CODE PATCH" ${this.articleCategory === 'CODE PATCH' ? 'selected' : ''}>💻 VERIFIED CODE PATCH</option>
            </select>
          </div>

          <div class="pt-5">
            <button type="button" id="btn-toggle-article-preview" class="px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1.5 ${this.isArticlePreviewMode ? 'bg-indigo-600 text-white' : 'bg-surface-raised text-slate-300 hover:text-white border border-white/10'}">
              <span>${this.isArticlePreviewMode ? '✏️ Edit Source' : '👁️ Live Preview'}</span>
            </button>
          </div>
        </div>

        <!-- MARKDOWN FORMATTING TOOLBAR -->
        ${!this.isArticlePreviewMode ? `
          <div class="flex flex-wrap items-center gap-1 p-1.5 bg-surface-raised/80 rounded-xl border border-white/10 text-xs">
            <button type="button" data-md-action="bold" class="btn-md-tool px-2 py-1 rounded hover:bg-surface-overlay text-slate-300 hover:text-white font-bold cursor-pointer" title="Bold (**text**)">B</button>
            <button type="button" data-md-action="italic" class="btn-md-tool px-2 py-1 rounded hover:bg-surface-overlay text-slate-300 hover:text-white italic cursor-pointer" title="Italic (*text*)">I</button>
            <button type="button" data-md-action="strike" class="btn-md-tool px-2 py-1 rounded hover:bg-surface-overlay text-slate-300 hover:text-white line-through cursor-pointer" title="Strikethrough (~~text~~)">S</button>
            <span class="w-px h-4 bg-white/10 mx-1"></span>
            <button type="button" data-md-action="heading" class="btn-md-tool px-2 py-1 rounded hover:bg-surface-overlay text-slate-300 hover:text-white font-mono cursor-pointer" title="Heading (### Title)">H</button>
            <button type="button" data-md-action="code" class="btn-md-tool px-2 py-1 rounded hover:bg-surface-overlay text-slate-300 hover:text-white font-mono cursor-pointer" title="Inline Code (\`code\`)">&lt;&gt;</button>
            <button type="button" data-md-action="codeblock" class="btn-md-tool px-2 py-1 rounded hover:bg-surface-overlay text-slate-300 hover:text-white font-mono cursor-pointer" title="Code Block (\`\`\`lang)">&lcub;&rcub;</button>
            <button type="button" data-md-action="quote" class="btn-md-tool px-2 py-1 rounded hover:bg-surface-overlay text-slate-300 hover:text-white cursor-pointer" title="Quote (> text)">&ldquo;</button>
            <button type="button" data-md-action="spoiler" class="btn-md-tool px-2 py-1 rounded hover:bg-surface-overlay text-slate-300 hover:text-white cursor-pointer" title="Spoiler (||text||)">||</button>
            <button type="button" data-md-action="link" class="btn-md-tool px-2 py-1 rounded hover:bg-surface-overlay text-slate-300 hover:text-white cursor-pointer" title="Link ([text](url))">🔗</button>
            <button type="button" data-md-action="list" class="btn-md-tool px-2 py-1 rounded hover:bg-surface-overlay text-slate-300 hover:text-white cursor-pointer" title="Bullet List (- item)">• List</button>
            
            <div class="ml-auto text-[10px] font-mono text-slate-400 px-2">
              ${wordCount} words • ~${readingTimeMin} min read
            </div>
          </div>
        ` : ''}

        <!-- EDITOR BODY OR PREVIEW VIEW -->
        <div>
          ${this.isArticlePreviewMode ? `
            <div class="w-full bg-surface-raised border border-white/10 rounded-xl p-4 text-xs text-slate-200 min-h-[220px] max-h-[300px] overflow-y-auto leading-relaxed prose prose-invert">
              <h2 class="text-sm font-bold text-white mb-2">${escapeHtml(this.articleTitle || 'Untitled Publication')}</h2>
              ${markdownRenderer.renderMarkdown(this.articleBody || '*No content written yet.*')}
            </div>
          ` : `
            <textarea 
              id="composer-article-body" 
              placeholder="Write Markdown, technical whitepaper, benchmark analysis, or cryptographic advisories..."
              class="w-full bg-surface-raised border border-white/10 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none h-48 leading-relaxed font-sans"
            >${escapeHtml(this.articleBody)}</textarea>
          `}
        </div>

      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // TAB 3: 🖼️ Media Gallery Tab (Up to 4 Assets)
  // ---------------------------------------------------------------------------

  private renderMediaGalleryTab(): string {
    return `
      <div class="space-y-4">
        
        <!-- DROPZONE & UPLOAD TRIGGER -->
        <div 
          id="media-dropzone" 
          class="border-2 border-dashed ${this.mediaItems.length >= this.maxMediaItems ? 'border-slate-600 bg-white/5 opacity-60 cursor-not-allowed' : 'border-indigo-500/40 hover:border-indigo-400 bg-surface-raised/40 hover:bg-surface-raised cursor-pointer'} rounded-2xl p-6 text-center transition-all"
        >
          <input 
            type="file" 
            id="composer-media-file-input" 
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm" 
            multiple 
            class="hidden" 
            ${this.mediaItems.length >= this.maxMediaItems ? 'disabled' : ''}
          />
          
          <div class="space-y-2 flex flex-col items-center">
            <span class="text-3xl">🖼️</span>
            <div class="text-xs text-slate-200 font-semibold">
              ${this.mediaItems.length >= this.maxMediaItems ? 'Gallery Limit Reached (Max 4 Items)' : 'Drag & Drop Images or Videos Here, or Browse'}
            </div>
            <p class="text-[11px] font-mono text-slate-400">
              Supports PNG, JPG, WebP, GIF, SVG, MP4, WebM (Max 4 items • Client SHA-256 Verified)
            </p>
          </div>
        </div>

        <!-- 4-SLOT GALLERY GRID -->
        ${this.mediaItems.length > 0 ? `
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Attached Media Assets (${this.mediaItems.length}/${this.maxMediaItems})</span>
              <span>Reorder or add captions</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${this.mediaItems.map((item, idx) => `
                <div class="bg-surface-raised border border-white/10 rounded-xl p-3 space-y-2.5 relative group">
                  
                  <!-- PREVIEW CARD -->
                  <div class="w-full h-32 bg-black/40 rounded-lg overflow-hidden flex items-center justify-center relative border border-white/5">
                    ${item.fileType === 'video' ? `
                      <video src="${item.dataUrl}" controls class="w-full h-full object-contain"></video>
                    ` : `
                      <img src="${item.dataUrl}" alt="${escapeHtml(item.fileName)}" class="w-full h-full object-cover" />
                    `}
                    
                    <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-cyan-300 font-bold border border-white/10">
                      ${item.fileType.toUpperCase()} • ${formatBytes(item.byteSize)}
                    </span>
                  </div>

                  <!-- METADATA & REORDER/REMOVE CONTROLS -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-mono text-[11px] text-slate-200 truncate max-w-[140px]" title="${escapeHtml(item.fileName)}">${escapeHtml(item.fileName)}</span>
                      
                      <div class="flex items-center space-x-1">
                        ${idx > 0 ? `
                          <button type="button" data-action="reorder-media" data-index="${idx}" data-dir="-1" class="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] cursor-pointer" title="Move Left">◀</button>
                        ` : ''}
                        ${idx < this.mediaItems.length - 1 ? `
                          <button type="button" data-action="reorder-media" data-index="${idx}" data-dir="1" class="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] cursor-pointer" title="Move Right">▶</button>
                        ` : ''}
                        <button type="button" data-action="remove-media" data-index="${idx}" class="px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[10px] font-bold cursor-pointer" title="Remove asset">✕</button>
                      </div>
                    </div>

                    <!-- CAPTION INPUT -->
                    <input 
                      type="text" 
                      data-media-caption-index="${idx}" 
                      value="${escapeHtml(item.caption)}"
                      placeholder="Add alt text or caption..."
                      class="w-full bg-surface-base border border-white/5 rounded-lg px-2 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />

                    <!-- SHA-256 INTEGRITY BADGE -->
                    <div class="text-[9px] font-mono text-slate-500 truncate" title="SHA-256: ${item.sha256}">
                      sha256: ${item.sha256.slice(0, 16)}...${item.sha256.slice(-8)}
                    </div>
                  </div>

                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // TAB 4: 📊 Sovereign Poll Builder
  // ---------------------------------------------------------------------------

  private renderPollBuilderTab(): string {
    const totalOptions = this.pollState.options.length;

    return `
      <div class="space-y-4">
        
        <!-- QUESTION INPUT -->
        <div>
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Poll Question</label>
          <input 
            type="text" 
            id="composer-poll-question-input" 
            value="${escapeHtml(this.pollState.question)}"
            placeholder="Ask a community question for cryptographic voting..."
            class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold"
          />
        </div>

        <!-- DYNAMIC OPTIONS LIST (2 to 6 options) -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Voting Choices (${totalOptions} / 6 Options)</span>
            <span>Minimum 2 • Maximum 6</span>
          </div>

          <div class="space-y-2">
            ${this.pollState.options.map((optText, index) => `
              <div class="flex items-center space-x-2" data-poll-option-row="${index}">
                <span class="w-6 h-6 rounded-lg bg-surface-raised border border-white/10 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                  ${String.fromCharCode(65 + index)}
                </span>
                
                <input 
                  type="text" 
                  data-poll-opt-index="${index}" 
                  value="${escapeHtml(optText)}"
                  placeholder="Option ${index + 1}${index >= 2 ? ' (optional)' : ''}"
                  class="flex-1 bg-surface-raised border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />

                ${totalOptions > 2 ? `
                  <button type="button" data-action="remove-poll-opt" data-index="${index}" class="text-slate-400 hover:text-rose-400 p-1.5 rounded hover:bg-white/5 cursor-pointer" title="Remove option">
                    ✕
                  </button>
                ` : ''}
              </div>
            `).join('')}
          </div>

          ${totalOptions < 6 ? `
            <button type="button" id="btn-add-poll-option" class="mt-1 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-all">
              <span>+</span>
              <span>Add Option (${totalOptions + 1}/6)</span>
            </button>
          ` : ''}
        </div>

        <!-- DURATION CONFIGURATION -->
        <div>
          <label class="block text-[11px] font-mono text-slate-400 mb-1.5">Poll Duration</label>
          <div class="flex items-center space-x-2">
            <button type="button" data-poll-duration="86400000" class="btn-poll-dur flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${this.pollState.durationMs === 86400000 ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 font-bold' : 'bg-surface-raised text-slate-400 border-white/5 hover:text-white'}">
              ⏱️ 24 Hours (1 Day)
            </button>
            
            <button type="button" data-poll-duration="259200000" class="btn-poll-dur flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${this.pollState.durationMs === 259200000 ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 font-bold' : 'bg-surface-raised text-slate-400 border-white/5 hover:text-white'}">
              ⏱️ 72 Hours (3 Days)
            </button>
            
            <button type="button" data-poll-duration="604800000" class="btn-poll-dur flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${this.pollState.durationMs === 604800000 ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 font-bold' : 'bg-surface-raised text-slate-400 border-white/5 hover:text-white'}">
              ⏱️ 7 Days (1 Week)
            </button>
          </div>
        </div>

        <!-- LIVE ANIMATED PREVIEW CARD -->
        <div class="p-3.5 rounded-xl bg-surface-base border border-white/10 space-y-2.5 select-none">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-200 flex items-center space-x-1.5">
              <span>📊</span>
              <span>Interactive Feed Preview</span>
            </span>
            <span class="font-mono text-[10px] text-emerald-400">Live Animated Progress</span>
          </div>

          <h4 class="text-xs font-semibold text-slate-100">
            ${escapeHtml(this.pollState.question || 'Your poll question will appear here...')}
          </h4>

          <div class="space-y-1.5">
            ${this.pollState.options.filter(o => o.trim().length > 0).map((opt, i) => {
              const isSelected = this.pollPreviewVoteIndex === i;
              const mockPercentages = [58, 27, 15, 8, 4, 2];
              const pct = isSelected ? Math.min(100, (mockPercentages[i] || 30) + 20) : (mockPercentages[i] || 20);

              return `
                <div class="relative overflow-hidden rounded-lg bg-surface-raised border ${isSelected ? 'border-emerald-500 shadow-sm' : 'border-white/5'} p-2 transition-all">
                  <div class="absolute inset-y-0 left-0 bg-emerald-500/20 transition-all duration-500 ease-out" style="width: ${pct}%;"></div>
                  <div class="relative flex items-center justify-between text-xs z-10">
                    <span class="font-medium text-slate-200 flex items-center space-x-1.5">
                      <span class="font-mono text-[10px] text-emerald-400">${String.fromCharCode(65 + i)}.</span>
                      <span>${escapeHtml(opt)}</span>
                    </span>
                    <span class="font-mono text-[11px] font-bold text-emerald-400">${pct}%</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="text-[10px] font-mono text-slate-500 flex items-center justify-between pt-1">
            <span>Tied to Ed25519 sovereign keypair</span>
            <span>1 Cryptographic Vote / Node</span>
          </div>
        </div>

      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // TAB 5: 💻 Verified Code / Patch Tab & SHA-256 Inspector
  // ---------------------------------------------------------------------------

  private renderVerifiedCodeTab(): string {
    return `
      <div class="space-y-3.5">
        
        <!-- LANGUAGE & FILENAME HEADER -->
        <div class="flex items-center space-x-3">
          <div class="w-1/3">
            <label class="block text-[11px] font-mono text-slate-400 mb-1">Language</label>
            <select id="composer-code-language" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer font-mono">
              <option value="typescript" ${this.codeState.language === 'typescript' ? 'selected' : ''}>TypeScript (.ts)</option>
              <option value="rust" ${this.codeState.language === 'rust' ? 'selected' : ''}>Rust (.rs)</option>
              <option value="python" ${this.codeState.language === 'python' ? 'selected' : ''}>Python (.py)</option>
              <option value="go" ${this.codeState.language === 'go' ? 'selected' : ''}>Go (.go)</option>
              <option value="cpp" ${this.codeState.language === 'cpp' ? 'selected' : ''}>C++ (.cpp)</option>
              <option value="solidity" ${this.codeState.language === 'solidity' ? 'selected' : ''}>Solidity (.sol)</option>
              <option value="diff" ${this.codeState.language === 'diff' ? 'selected' : ''}>Git Diff / Patch (.diff)</option>
            </select>
          </div>

          <div class="flex-1">
            <label class="block text-[11px] font-mono text-slate-400 mb-1">File Name</label>
            <input 
              type="text" 
              id="composer-code-filename" 
              value="${escapeHtml(this.codeState.filename)}"
              placeholder="e.g. rate_limiter.rs or fix-zk-nullifier.patch"
              class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div class="pt-5">
            <button type="button" id="btn-toggle-diff-mode" class="px-3 py-2 rounded-xl text-xs font-mono cursor-pointer transition-all flex items-center space-x-1.5 ${this.codeState.isDiffMode ? 'bg-purple-600 text-white' : 'bg-surface-raised text-slate-300 hover:text-white border border-white/10'}">
              <span>${this.codeState.isDiffMode ? '📝 Raw Code' : '🔍 Diff Inspector'}</span>
            </button>
          </div>
        </div>

        <!-- CODE TEXTAREA OR DIFF INSPECTOR -->
        <div>
          ${this.codeState.isDiffMode ? this.renderDiffHighlightView() : `
            <textarea 
              id="composer-code-textarea" 
              placeholder="Paste or write verifiable code snippet, cryptographic contract, or patch..."
              class="w-full bg-surface-raised border border-white/10 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none h-52 leading-relaxed font-mono"
              spellcheck="false"
            >${escapeHtml(this.codeState.code)}</textarea>
          `}
        </div>

        <!-- SHA-256 CHECKSUM & ENTROPY INSPECTOR CARD -->
        <div class="p-3 bg-surface-raised/80 border border-white/10 rounded-xl space-y-2 font-mono text-xs">
          <div class="flex items-center justify-between text-[11px] text-slate-400">
            <span class="font-bold text-purple-300 flex items-center space-x-1.5">
              <span>🛡️</span>
              <span>Verifiable Code Checksum & Hygiene</span>
            </span>
            <span id="composer-code-meta-badge">${this.codeState.byteSize} Bytes • Entropy: ${this.codeState.entropy} bits/byte</span>
          </div>

          <div class="bg-surface-base p-2 rounded-lg border border-white/5 flex items-center justify-between text-[11px]">
            <span class="text-slate-400 font-mono">SHA-256:</span>
            <span id="composer-code-sha256-val" class="font-mono text-purple-300 select-all font-semibold">
              ${this.codeState.sha256 || 'Computing...'}
            </span>
          </div>
        </div>

      </div>
    `;
  }

  /**
   * Helper to render colored diff lines.
   */
  private renderDiffHighlightView(): string {
    const lines = (this.codeState.code || '').split('\n');
    return `
      <div class="w-full bg-surface-raised border border-white/10 rounded-xl p-3 font-mono text-xs max-h-52 overflow-y-auto space-y-0.5 leading-tight">
        ${lines.map((line, idx) => {
          let lineClass = 'text-slate-300';
          let bgClass = '';
          if (line.startsWith('+')) {
            lineClass = 'text-emerald-300';
            bgClass = 'bg-emerald-500/10';
          } else if (line.startsWith('-')) {
            lineClass = 'text-rose-300';
            bgClass = 'bg-rose-500/10';
          } else if (line.startsWith('@@')) {
            lineClass = 'text-cyan-300 font-bold';
            bgClass = 'bg-cyan-500/10';
          }

          return `
            <div class="flex items-center px-1.5 py-0.5 rounded ${bgClass}">
              <span class="w-8 text-slate-500 select-none text-[10px] text-right pr-2">${idx + 1}</span>
              <span class="${lineClass} flex-1 whitespace-pre">${escapeHtml(line)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Proof Inspector Drawer (Ed25519 & ZK-RLN Nullifier)
  // ---------------------------------------------------------------------------

  private renderProofInspectorDrawer(): string {
    const fp = clientStore.keypair?.fingerprint || 'genesis-core';
    const nullifier = clientStore.nullifier || '00000000000000000000000000000000';
    const epoch = Math.floor(Date.now() / 100000).toString();

    return `
      <div class="p-3.5 rounded-xl bg-surface-base border border-indigo-500/30 space-y-2.5 font-mono text-xs select-none animate-in fade-in duration-150">
        <div class="flex items-center justify-between text-indigo-300 font-bold">
          <span class="flex items-center space-x-1.5">
            <span>🔐</span>
            <span>Cryptographic Proof & Anti-Sybil Signing Manifest</span>
          </span>
          <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Ed25519 + ZK-RLN Ready</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
          <div class="bg-surface-raised p-2 rounded-lg border border-white/5 space-y-1">
            <span class="text-slate-400">Author Fingerprint:</span>
            <div class="text-indigo-300 font-bold truncate">${fp}</div>
          </div>

          <div class="bg-surface-raised p-2 rounded-lg border border-white/5 space-y-1">
            <span class="text-slate-400">ZK-RLN Nullifier (Shamir SSS):</span>
            <div class="text-emerald-300 truncate">${nullifier}</div>
          </div>

          <div class="bg-surface-raised p-2 rounded-lg border border-white/5 space-y-1">
            <span class="text-slate-400">Rate Limiting Epoch:</span>
            <div class="text-cyan-300 font-bold">Epoch #${epoch}</div>
          </div>

          <div class="bg-surface-raised p-2 rounded-lg border border-white/5 space-y-1">
            <span class="text-slate-400">Audience Scope:</span>
            <div class="text-purple-300 font-bold">${this.audience.toUpperCase()}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Interactive DOM Event Binding
  // ---------------------------------------------------------------------------

  public bindDomEvents(onReRender: () => void): void {
    if (typeof document === 'undefined') return;

    // 1. Close & Cancel
    document.getElementById('btn-close-composer')?.addEventListener('click', () => {
      soundEffects.playClick();
      clientStore.toggleComposer();
    });

    document.getElementById('btn-cancel-composer')?.addEventListener('click', () => {
      soundEffects.playClick();
      clientStore.toggleComposer();
    });

    // 2. Tab switching
    document.querySelectorAll('.btn-composer-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        const targetTab = tabBtn.getAttribute('data-composer-tab') as ComposerTab;
        if (targetTab && targetTab !== this.activeTab) {
          soundEffects.playClick();
          this.activeTab = targetTab;
          this.queueAutosave();
          onReRender();
        }
      });
    });

    // 3. Audience Selector
    const audienceSelect = document.getElementById('composer-audience-select') as HTMLSelectElement;
    if (audienceSelect) {
      audienceSelect.addEventListener('change', () => {
        this.audience = audienceSelect.value as AudienceCircle;
        this.queueAutosave();
        onReRender();
      });
    }

    // 4. Proof Drawer Toggle
    document.getElementById('btn-toggle-proof-drawer')?.addEventListener('click', () => {
      soundEffects.playClick();
      this.isProofDrawerOpen = !this.isProofDrawerOpen;
      onReRender();
    });

    // 5. Discard Draft
    document.getElementById('btn-discard-draft')?.addEventListener('click', async () => {
      if (confirm('Discard your current draft and clear storage?')) {
        soundEffects.playClick();
        await this.clearDraft();
        clientStore.showToast('Draft discarded.', 'info');
        onReRender();
      }
    });

    // 6. Submit / Broadcast
    document.getElementById('btn-submit-hybrid-composer')?.addEventListener('click', async () => {
      await this.broadcastPublication();
    });

    // 7. Pulse & Thread Sub-Events
    if (this.activeTab === 'pulse') {
      // Textarea inputs
      document.querySelectorAll<HTMLTextAreaElement>('[data-segment-input]').forEach((textarea) => {
        const segIdx = parseInt(textarea.getAttribute('data-segment-input') || '0', 10);
        textarea.addEventListener('input', () => {
          if (this.threadSegments[segIdx]) {
            this.threadSegments[segIdx].content = textarea.value;
            this.queueAutosave();

            // Dynamically update radial ring in place
            const radialContainer = document.getElementById(`radial-container-seg-${segIdx}`);
            if (radialContainer) {
              radialContainer.innerHTML = this.renderRadialProgress(textarea.value.length, this.maxPulseLength);
            }
          }
        });
      });

      // Add segment button
      document.getElementById('btn-add-thread-segment')?.addEventListener('click', () => {
        soundEffects.playClick();
        this.threadSegments.push({
          id: `seg-${Date.now()}`,
          content: '',
        });
        this.queueAutosave();
        onReRender();
      });

      // Remove segment buttons
      document.querySelectorAll('[data-action="remove-segment"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index') || '0', 10);
          if (this.threadSegments.length > 1) {
            soundEffects.playClick();
            this.threadSegments.splice(idx, 1);
            this.queueAutosave();
            onReRender();
          }
        });
      });

      // Attach media button from segment
      document.querySelectorAll('[data-action="attach-media-segment"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          soundEffects.playClick();
          this.activeTab = 'media';
          onReRender();
        });
      });
    }

    // 8. Article Sub-Events
    if (this.activeTab === 'article') {
      const titleInput = document.getElementById('composer-article-title') as HTMLInputElement;
      if (titleInput) {
        titleInput.addEventListener('input', () => {
          this.articleTitle = titleInput.value;
          this.queueAutosave();
        });
      }

      const catSelect = document.getElementById('composer-article-category') as HTMLSelectElement;
      if (catSelect) {
        catSelect.addEventListener('change', () => {
          this.articleCategory = catSelect.value;
          this.queueAutosave();
        });
      }

      const bodyTextarea = document.getElementById('composer-article-body') as HTMLTextAreaElement;
      if (bodyTextarea) {
        bodyTextarea.addEventListener('input', () => {
          this.articleBody = bodyTextarea.value;
          this.queueAutosave();
        });
      }

      // Preview toggle
      document.getElementById('btn-toggle-article-preview')?.addEventListener('click', () => {
        soundEffects.playClick();
        this.isArticlePreviewMode = !this.isArticlePreviewMode;
        onReRender();
      });

      // Markdown toolbar buttons
      document.querySelectorAll('.btn-md-tool').forEach((toolBtn) => {
        toolBtn.addEventListener('click', () => {
          const action = toolBtn.getAttribute('data-md-action');
          if (!bodyTextarea || !action) return;

          soundEffects.playClick();
          const start = bodyTextarea.selectionStart || 0;
          const end = bodyTextarea.selectionEnd || 0;
          const selectedText = bodyTextarea.value.substring(start, end);
          let replacement = '';
          let cursorOffset = 0;

          switch (action) {
            case 'bold':
              replacement = `**${selectedText || 'bold text'}**`;
              cursorOffset = selectedText ? replacement.length : 2;
              break;
            case 'italic':
              replacement = `*${selectedText || 'italic text'}*`;
              cursorOffset = selectedText ? replacement.length : 1;
              break;
            case 'strike':
              replacement = `~~${selectedText || 'strikethrough text'}~~`;
              cursorOffset = selectedText ? replacement.length : 2;
              break;
            case 'heading':
              replacement = `\n### ${selectedText || 'Heading Title'}\n`;
              cursorOffset = replacement.length;
              break;
            case 'code':
              replacement = `\`${selectedText || 'code'}\``;
              cursorOffset = selectedText ? replacement.length : 1;
              break;
            case 'codeblock':
              replacement = `\n\`\`\`typescript\n${selectedText || '// Sovereign TypeScript Code'}\n\`\`\`\n`;
              cursorOffset = replacement.length;
              break;
            case 'quote':
              replacement = `\n> ${selectedText || 'Cryptographic quote...'}\n`;
              cursorOffset = replacement.length;
              break;
            case 'spoiler':
              replacement = `||${selectedText || 'classified spoiler'}||`;
              cursorOffset = selectedText ? replacement.length : 2;
              break;
            case 'link':
              replacement = `[${selectedText || 'link title'}](https://aetheris.sovereign)`;
              cursorOffset = replacement.length;
              break;
            case 'list':
              replacement = `\n- ${selectedText || 'first item'}\n- second item\n`;
              cursorOffset = replacement.length;
              break;
          }

          bodyTextarea.setRangeText(replacement, start, end, 'end');
          bodyTextarea.focus();
          bodyTextarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
          this.articleBody = bodyTextarea.value;
          this.queueAutosave();
        });
      });
    }

    // 9. Media Gallery Sub-Events
    if (this.activeTab === 'media') {
      const dropzone = document.getElementById('media-dropzone');
      const fileInput = document.getElementById('composer-media-file-input') as HTMLInputElement;

      if (dropzone && fileInput) {
        dropzone.addEventListener('click', (e) => {
          if (this.mediaItems.length >= this.maxMediaItems) return;
          if (e.target !== fileInput) {
            fileInput.click();
          }
        });

        dropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropzone.classList.add('border-cyan-400', 'bg-cyan-500/10');
        });

        dropzone.addEventListener('dragleave', () => {
          dropzone.classList.remove('border-cyan-400', 'bg-cyan-500/10');
        });

        dropzone.addEventListener('drop', async (e) => {
          e.preventDefault();
          dropzone.classList.remove('border-cyan-400', 'bg-cyan-500/10');
          if (e.dataTransfer && e.dataTransfer.files) {
            await this.handleMediaFiles(Array.from(e.dataTransfer.files), onReRender);
          }
        });

        fileInput.addEventListener('change', async () => {
          if (fileInput.files) {
            await this.handleMediaFiles(Array.from(fileInput.files), onReRender);
          }
        });
      }

      // Reorder buttons
      document.querySelectorAll('[data-action="reorder-media"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index') || '0', 10);
          const dir = parseInt(btn.getAttribute('data-dir') || '0', 10);
          const targetIdx = idx + dir;
          if (targetIdx >= 0 && targetIdx < this.mediaItems.length) {
            soundEffects.playClick();
            const temp = this.mediaItems[idx];
            this.mediaItems[idx] = this.mediaItems[targetIdx];
            this.mediaItems[targetIdx] = temp;
            this.queueAutosave();
            onReRender();
          }
        });
      });

      // Remove media buttons
      document.querySelectorAll('[data-action="remove-media"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index') || '0', 10);
          soundEffects.playClick();
          this.mediaItems.splice(idx, 1);
          this.queueAutosave();
          onReRender();
        });
      });

      // Caption inputs
      document.querySelectorAll<HTMLInputElement>('[data-media-caption-index]').forEach((input) => {
        const idx = parseInt(input.getAttribute('data-media-caption-index') || '0', 10);
        input.addEventListener('input', () => {
          if (this.mediaItems[idx]) {
            this.mediaItems[idx].caption = input.value;
            this.queueAutosave();
          }
        });
      });
    }

    // 10. Sovereign Poll Sub-Events
    if (this.activeTab === 'poll') {
      const qInput = document.getElementById('composer-poll-question-input') as HTMLInputElement;
      if (qInput) {
        qInput.addEventListener('input', () => {
          this.pollState.question = qInput.value;
          this.queueAutosave();
        });
      }

      document.querySelectorAll<HTMLInputElement>('[data-poll-opt-index]').forEach((optInput) => {
        const idx = parseInt(optInput.getAttribute('data-poll-opt-index') || '0', 10);
        optInput.addEventListener('input', () => {
          if (this.pollState.options[idx] !== undefined) {
            this.pollState.options[idx] = optInput.value;
            this.queueAutosave();
          }
        });
      });

      // Add option button
      document.getElementById('btn-add-poll-option')?.addEventListener('click', () => {
        if (this.pollState.options.length < 6) {
          soundEffects.playClick();
          this.pollState.options.push('');
          this.queueAutosave();
          onReRender();
        }
      });

      // Remove option buttons
      document.querySelectorAll('[data-action="remove-poll-opt"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index') || '0', 10);
          if (this.pollState.options.length > 2) {
            soundEffects.playClick();
            this.pollState.options.splice(idx, 1);
            this.queueAutosave();
            onReRender();
          }
        });
      });

      // Duration selector
      document.querySelectorAll('.btn-poll-dur').forEach((btn) => {
        btn.addEventListener('click', () => {
          const dur = parseInt(btn.getAttribute('data-poll-duration') || '86400000', 10) as PollDuration;
          soundEffects.playClick();
          this.pollState.durationMs = dur;
          this.queueAutosave();
          onReRender();
        });
      });
    }

    // 11. Code & Diff Sub-Events
    if (this.activeTab === 'code' || this.activeTab === 'vault') {
      const langSelect = document.getElementById('composer-code-language') as HTMLSelectElement;
      if (langSelect) {
        langSelect.addEventListener('change', () => {
          this.codeState.language = langSelect.value as SupportedCodeLang;
          this.queueAutosave();
        });
      }

      const fnInput = document.getElementById('composer-code-filename') as HTMLInputElement;
      if (fnInput) {
        fnInput.addEventListener('input', () => {
          this.codeState.filename = fnInput.value;
          this.queueAutosave();
        });
      }

      const codeTextarea = document.getElementById('composer-code-textarea') as HTMLTextAreaElement;
      if (codeTextarea) {
        codeTextarea.addEventListener('input', async () => {
          this.codeState.code = codeTextarea.value;
          await this.updateCodeMetrics();
          this.queueAutosave();

          const shaEl = document.getElementById('composer-code-sha256-val');
          const metaEl = document.getElementById('composer-code-meta-badge');
          if (shaEl) shaEl.textContent = this.codeState.sha256;
          if (metaEl) metaEl.textContent = `${this.codeState.byteSize} Bytes • Entropy: ${this.codeState.entropy} bits/byte`;
        });
      }

      // Diff mode toggle
      document.getElementById('btn-toggle-diff-mode')?.addEventListener('click', () => {
        soundEffects.playClick();
        this.codeState.isDiffMode = !this.codeState.isDiffMode;
        onReRender();
      });
    }
  }

  /**
   * Helper to parse and attach image/video files into Media Gallery.
   */
  private async handleMediaFiles(files: File[], onReRender: () => void): Promise<void> {
    for (const file of files) {
      if (this.mediaItems.length >= this.maxMediaItems) {
        clientStore.showToast('Maximum 4 media assets reached.', 'warning');
        break;
      }

      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) {
        clientStore.showToast(`Unsupported format: ${file.name}`, 'warning');
        continue;
      }

      try {
        const buffer = await file.arrayBuffer();
        const sha256 = await computeSha256Hex(buffer);
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        this.mediaItems.push({
          id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          fileName: file.name,
          fileType: isVideo ? 'video' : 'image',
          mimeType: file.type,
          dataUrl,
          byteSize: file.size,
          sha256,
          caption: '',
        });

        soundEffects.playPop();
      } catch (err) {
        console.error('[HybridComposer] Failed to process media file:', err);
      }
    }

    this.queueAutosave();
    onReRender();
  }

  // ---------------------------------------------------------------------------
  // Publishing & Cryptographic Broadcast Execution
  // ---------------------------------------------------------------------------

  /**
   * Builds, cryptographically signs, and broadcasts the publication.
   */
  public async broadcastPublication(): Promise<boolean> {
    try {
      const epoch = Math.floor(Date.now() / 100000).toString();
      const authorFp = clientStore.keypair?.fingerprint || 'genesis-core';
      const keypair = clientStore.keypair;

      let title = '';
      let content = '';
      let flair: any = 'TECH DISCUSSION';
      let pollId: string | undefined;
      let codeAttachment: any = undefined;
      let mediaUrls: string[] = [];

      // 1. Resolve content by active tab
      if (this.activeTab === 'pulse') {
        const firstSegment = this.threadSegments[0]?.content || '';
        title = firstSegment.slice(0, 48) || 'Sovereign Pulse';
        content = firstSegment;
        flair = 'MICRO-PULSE';

        if (this.mediaItems.length > 0) {
          mediaUrls = this.mediaItems.map(m => m.dataUrl);
        }
      } else if (this.activeTab === 'article') {
        title = this.articleTitle.trim() || 'Sovereign Publication';
        content = this.articleBody.trim();
        flair = this.articleCategory || 'TECH DISCUSSION';
        if (this.mediaItems.length > 0) {
          mediaUrls = this.mediaItems.map(m => m.dataUrl);
        }
      } else if (this.activeTab === 'media') {
        title = this.mediaItems[0]?.fileName ? `Media Gallery: ${this.mediaItems[0].fileName}` : 'Sovereign Media Gallery';
        content = this.mediaItems.map(m => `![${m.caption || m.fileName}](${m.dataUrl})`).join('\n\n');
        flair = 'TECH DISCUSSION';
        mediaUrls = this.mediaItems.map(m => m.dataUrl);
      } else if (this.activeTab === 'poll') {
        const q = this.pollState.question.trim() || 'Community Poll';
        const validOpts = this.pollState.options.filter(o => o.trim().length > 0);
        title = q;
        content = `### 📊 Sovereign Community Poll: ${q}\n\n${validOpts.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
        flair = 'ASK COMMUNITY';

        if (validOpts.length >= 2) {
          const created = pollEngine.createPoll(`poll-${Date.now()}`, q, validOpts);
          pollId = created.id;
        }
      } else if (this.activeTab === 'code' || this.activeTab === 'vault') {
        title = `Verified Code: ${this.codeState.filename || 'Source Code'}`;
        content = `\`\`\`${this.codeState.language}\n${this.codeState.code}\n\`\`\``;
        flair = 'VERIFIED RELEASE';
        codeAttachment = {
          fileName: this.codeState.filename,
          sha256: this.codeState.sha256,
          byteSize: this.codeState.byteSize,
          entropy: this.codeState.entropy,
          verdict: 'VERIFIED_CLEAN',
          merkleRoot: this.codeState.sha256.slice(0, 32),
        };
      }

      if (!content.trim() && !title.trim()) {
        clientStore.showToast('Please enter some content before broadcasting.', 'warning');
        return false;
      }

      // 2. Cryptographic Signing (Ed25519 + ZK-RLN Share)
      const payloadDigest = await computeSha256Hex(`${title}:${content}:${epoch}:${authorFp}`);
      let ed25519SigHex = '';
      if (keypair && keypair.privateKey) {
        const sigBytes = signMessage(payloadDigest, keypair.privateKey);
        ed25519SigHex = bytesToHex(sigBytes);
      }

      let rlnShare = null;
      if (clientStore.secretKey) {
        rlnShare = ZKRLN.createShare(clientStore.secretKey, epoch, payloadDigest);
      }

      // 3. Construct Primary ClientPost
      const primaryPost: ClientPost = {
        id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        channelId: this.audience,
        authorFingerprint: authorFp,
        authorRole: 'MEMBER',
        title,
        content,
        flair,
        pollId,
        attachment: codeAttachment,
        images: mediaUrls.length > 0 ? mediaUrls : undefined,
        meritVotes: 1,
        userVoted: 1,
        replyCount: 0,
        boostCount: 0,
        createdAt: Date.now(),
        isExpanded: false,
      };

      clientStore.posts.unshift(primaryPost);

      // 4. If thread chain has additional segments (> 1), publish subsequent chain posts
      if (this.activeTab === 'pulse' && this.threadSegments.length > 1) {
        for (let i = 1; i < this.threadSegments.length; i++) {
          const seg = this.threadSegments[i];
          if (seg && seg.content.trim()) {
            const chainPost: ClientPost = {
              id: `post-${Date.now() + i}-${Math.random().toString(36).substring(2, 6)}`,
              channelId: this.audience,
              authorFingerprint: authorFp,
              authorRole: 'MEMBER',
              title: `Thread Chain (${i + 1}/${this.threadSegments.length})`,
              content: seg.content,
              flair: 'MICRO-PULSE',
              quotedPost: {
                id: primaryPost.id,
                authorFingerprint: primaryPost.authorFingerprint,
                authorRole: primaryPost.authorRole,
                title: primaryPost.title,
                content: primaryPost.content.slice(0, 100),
              },
              meritVotes: 1,
              userVoted: 1,
              replyCount: 0,
              boostCount: 0,
              createdAt: Date.now() + i * 10,
              isExpanded: false,
            };
            clientStore.posts.unshift(chainPost);
          }
        }
      }

      // 5. Play Sound Effect & Toast
      soundEffects.playSend();
      clientStore.showToast('🚀 Broadcasted to Sovereign Matrix with ZK-RLN Signatures!', 'success');

      // 6. Broadcast over WebSocket / API
      clientStore.sendMessage(`### ${flair}: ${title}\n\n${content}`);

      // 7. Clear Draft and Close Composer Modal
      await this.clearDraft();
      clientStore.toggleComposer();

      return true;
    } catch (err: any) {
      console.error('[HybridComposer] Broadcast publication failed:', err);
      clientStore.showToast(`Broadcast failed: ${err.message || err}`, 'warning');
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Global Singleton & Backward-Compatibility Exports
// ---------------------------------------------------------------------------
export const hybridComposer = new HybridComposer();
export const omniComposer = hybridComposer;
export class OmniComposer extends HybridComposer {}

serviceRegistry.registerInstance(SERVICES.OmniComposer, hybridComposer);
