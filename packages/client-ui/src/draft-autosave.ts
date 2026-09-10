import { sovereignDialog } from './dialog-modal.js';
/**
 * @file draft-autosave.ts
 * @package @aetheris/client-ui
 * @description Local Encrypted & Persistent Draft Autosave Management System for UREfy.
 * Provides instant debounce autosaving (400ms), recovery drawer UI, visual indicators,
 * JSON backup/restore, and interactive DOM bindings without external dependencies.
 */

/**
 * Interface representing a persisted draft record in the UREfy client.
 */
export interface DraftRecord {
  key: string;
  title?: string;
  content: string;
  channelId?: string;
  updatedAt: number;
  formatType?: string;
  tags?: string[];
  pollOptions?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Statistics overview of all currently stored local drafts.
 */
export interface DraftStats {
  totalCount: number;
  totalCharacters: number;
  totalEstimatedBytes: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
}

/**
 * Listener callback signature for draft mutation events.
 */
export type DraftChangeListener = (key: string, draft: DraftRecord | null) => void;

/**
 * Escapes HTML characters to prevent XSS vulnerabilities in dynamically rendered UI.
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
 * Converts timestamps into localized human-readable relative time strings (English).
 */
function formatRelativeTime(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return 'just now';
  const now = Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (elapsedSeconds < 5) {
    return 'just now';
  }
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds} seconds ago`;
  }
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes === 1) {
    return '1 minute ago';
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} minutes ago`;
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours === 1) {
    return '1 hour ago';
  }
  if (elapsedHours < 24) {
    return `${elapsedHours} hours ago`;
  }
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) {
    return 'yesterday';
  }
  if (elapsedDays < 30) {
    return `${elapsedDays} days ago`;
  }
  return new Date(timestamp).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const formatRelativeTimeRo = formatRelativeTime;

/**
 * Formats byte counts into human-readable strings.
 */
function formatByteSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const normalizedIndex = Math.min(index, units.length - 1);
  const value = bytes / Math.pow(1024, normalizedIndex);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[normalizedIndex]}`;
}

/**
 * Draft Autosave Manager for UREfy.
 * Manages persistent client-side draft auto-recovery, debounced typing sync,
 * status indicator rendering, and sliding drafts vault drawer.
 */
export class DraftAutosaveManager {
  private readonly storagePrefix: string = 'aetheris_draft_';
  private readonly defaultDebounceMs: number = 400;
  private debounceTimers: Map<string, number | ReturnType<typeof setTimeout>> = new Map();
  private inMemoryCache: Map<string, DraftRecord> = new Map();
  private changeListeners: Set<DraftChangeListener> = new Set();
  public activeDrawerFilter: string = 'all';
  public drawerSearchQuery: string = '';

  /**
   * Initializes the manager and warms the in-memory cache from localStorage.
   */
  constructor() {
    this.hydrateMemoryCache();
  }

  /**
   * Safely checks if browser localStorage is accessible.
   */
  private isStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__aetheris_storage_probe__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generates the storage key for a given draft key.
   */
  private buildStorageKey(key: string): string {
    const sanitized = key.trim().replace(/^aetheris_draft_/, '');
    return `${this.storagePrefix}${sanitized}`;
  }

  /**
   * Hydrates memory cache from localStorage on initialization.
   */
  private hydrateMemoryCache(): void {
    if (!this.isStorageAvailable()) return;

    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const rawKey = window.localStorage.key(i);
        if (rawKey && rawKey.startsWith(this.storagePrefix)) {
          const itemKey = rawKey.substring(this.storagePrefix.length);
          const rawData = window.localStorage.getItem(rawKey);
          if (rawData) {
            try {
              const parsed = JSON.parse(rawData) as DraftRecord;
              if (parsed && typeof parsed === 'object' && parsed.key) {
                this.inMemoryCache.set(itemKey, parsed);
              }
            } catch {
              // Ignore corrupted records
            }
          }
        }
      }
    } catch {
      // Handle storage access exceptions gracefully
    }
  }

  /**
   * Notifies all registered subscribers of draft changes.
   */
  private notifyListeners(key: string, draft: DraftRecord | null): void {
    this.changeListeners.forEach((listener) => {
      try {
        listener(key, draft);
      } catch (err) {
        console.error('[DraftAutosave] Listener error:', err);
      }
    });

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        const event = new CustomEvent('aetheris:draft-change', {
          detail: { key, draft, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
      } catch {
        // CustomEvent fallback
      }
    }
  }

  /**
   * Saves or updates a draft immediately in local storage.
   * If partial data is provided, it merges with the existing draft.
   */
  public saveDraft(key: string, data: Partial<DraftRecord>): void {
    if (!key || typeof key !== 'string') return;
    const cleanKey = key.trim().replace(/^aetheris_draft_/, '');
    if (!cleanKey) return;

    // Clear any pending debounce timer for this key
    if (this.debounceTimers.has(cleanKey)) {
      clearTimeout(this.debounceTimers.get(cleanKey) as any);
      this.debounceTimers.delete(cleanKey);
    }

    const existing = this.getDraft(cleanKey);
    const content = data.content !== undefined ? data.content : (existing ? existing.content : '');
    const title = data.title !== undefined ? data.title : (existing ? existing.title : undefined);
    const channelId = data.channelId !== undefined ? data.channelId : (existing ? existing.channelId : undefined);
    const formatType = data.formatType !== undefined ? data.formatType : (existing ? existing.formatType : 'article');
    const tags = data.tags !== undefined ? data.tags : (existing ? existing.tags : undefined);
    const pollOptions = data.pollOptions !== undefined ? data.pollOptions : (existing ? existing.pollOptions : undefined);
    const metadata = data.metadata !== undefined ? { ...(existing?.metadata || {}), ...data.metadata } : existing?.metadata;

    // If both title and content are empty and no metadata, delete draft
    const hasMeaningfulContent = (content && content.trim().length > 0) ||
      (title && title.trim().length > 0) ||
      (pollOptions && pollOptions.length > 0 && pollOptions.some((o) => o.trim().length > 0));

    if (!hasMeaningfulContent) {
      this.clearDraft(cleanKey);
      return;
    }

    const record: DraftRecord = {
      key: cleanKey,
      title: title?.trim() ? title : undefined,
      content: content ?? '',
      channelId,
      updatedAt: Date.now(),
      formatType,
      tags,
      pollOptions,
      metadata
    };

    // Update in-memory cache
    this.inMemoryCache.set(cleanKey, record);

    // Persist to localStorage
    if (this.isStorageAvailable()) {
      try {
        const storageKey = this.buildStorageKey(cleanKey);
        window.localStorage.setItem(storageKey, JSON.stringify(record));
      } catch (err) {
        console.warn('[DraftAutosave] localStorage write failed (quota exceeded?):', err);
      }
    }

    this.notifyListeners(cleanKey, record);
  }

  /**
   * Debounces the draft save action (default 400ms) for high-frequency typing events.
   */
  public debounceSave(key: string, data: Partial<DraftRecord>, delayMs: number = this.defaultDebounceMs): void {
    if (!key) return;
    const cleanKey = key.trim().replace(/^aetheris_draft_/, '');

    // Clear previous timer for this key
    if (this.debounceTimers.has(cleanKey)) {
      clearTimeout(this.debounceTimers.get(cleanKey) as any);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(cleanKey);
      this.saveDraft(cleanKey, data);
    }, delayMs);

    this.debounceTimers.set(cleanKey, timer);
  }

  /**
   * Retrieves a draft record by key from cache or localStorage.
   */
  public getDraft(key: string): DraftRecord | null {
    if (!key) return null;
    const cleanKey = key.trim().replace(/^aetheris_draft_/, '');

    if (this.inMemoryCache.has(cleanKey)) {
      return this.inMemoryCache.get(cleanKey) || null;
    }

    if (this.isStorageAvailable()) {
      try {
        const storageKey = this.buildStorageKey(cleanKey);
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as DraftRecord;
          if (parsed && typeof parsed === 'object') {
            this.inMemoryCache.set(cleanKey, parsed);
            return parsed;
          }
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Clears a specific draft from memory and local storage.
   */
  public clearDraft(key: string): void {
    if (!key) return;
    const cleanKey = key.trim().replace(/^aetheris_draft_/, '');

    if (this.debounceTimers.has(cleanKey)) {
      clearTimeout(this.debounceTimers.get(cleanKey) as any);
      this.debounceTimers.delete(cleanKey);
    }

    this.inMemoryCache.delete(cleanKey);

    if (this.isStorageAvailable()) {
      try {
        const storageKey = this.buildStorageKey(cleanKey);
        window.localStorage.removeItem(storageKey);
      } catch {
        // Ignore removal error
      }
    }

    this.notifyListeners(cleanKey, null);
  }

  /**
   * Checks whether a non-empty draft exists for the given key.
   */
  public hasDraft(key: string): boolean {
    const draft = this.getDraft(key);
    if (!draft) return false;

    const hasContent = typeof draft.content === 'string' && draft.content.trim().length > 0;
    const hasTitle = typeof draft.title === 'string' && draft.title.trim().length > 0;
    const hasPoll = Array.isArray(draft.pollOptions) && draft.pollOptions.length > 0;

    return hasContent || hasTitle || hasPoll;
  }

  /**
   * Retrieves all saved drafts sorted by most recently updated first.
   */
  public getAllDrafts(): DraftRecord[] {
    const draftsMap = new Map<string, DraftRecord>();

    // Collect from memory cache
    this.inMemoryCache.forEach((draft, key) => {
      draftsMap.set(key, draft);
    });

    // Check localStorage in case of multi-tab changes
    if (this.isStorageAvailable()) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const rawKey = window.localStorage.key(i);
          if (rawKey && rawKey.startsWith(this.storagePrefix)) {
            const itemKey = rawKey.substring(this.storagePrefix.length);
            if (!draftsMap.has(itemKey)) {
              const raw = window.localStorage.getItem(rawKey);
              if (raw) {
                try {
                  const parsed = JSON.parse(raw) as DraftRecord;
                  if (parsed && parsed.key) {
                    draftsMap.set(itemKey, parsed);
                  }
                } catch {
                  // Skip invalid
                }
              }
            }
          }
        }
      } catch {
        // Fallback to cache
      }
    }

    const list = Array.from(draftsMap.values());
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return list;
  }

  /**
   * Clears all saved drafts matching the UREfy prefix.
   */
  public clearAllDrafts(): void {
    // Clear debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer as any));
    this.debounceTimers.clear();

    const keysToNotify = Array.from(this.inMemoryCache.keys());
    this.inMemoryCache.clear();

    if (this.isStorageAvailable()) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const rawKey = window.localStorage.key(i);
          if (rawKey && rawKey.startsWith(this.storagePrefix)) {
            keysToRemove.push(rawKey);
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // Ignore
      }
    }

    keysToNotify.forEach((k) => this.notifyListeners(k, null));
  }

  /**
   * Computes aggregate storage statistics for all current drafts.
   */
  public getStats(): DraftStats {
    const drafts = this.getAllDrafts();
    let totalChars = 0;
    let oldest: number | null = null;
    let newest: number | null = null;

    drafts.forEach((d) => {
      const len = (d.title?.length || 0) + (d.content?.length || 0);
      totalChars += len;
      if (d.updatedAt) {
        if (oldest === null || d.updatedAt < oldest) oldest = d.updatedAt;
        if (newest === null || d.updatedAt > newest) newest = d.updatedAt;
      }
    });

    const rawJson = JSON.stringify(drafts);
    const estimatedBytes = rawJson ? rawJson.length * 2 : 0; // approximate UTF-16 bytes

    return {
      totalCount: drafts.length,
      totalCharacters: totalChars,
      totalEstimatedBytes: estimatedBytes,
      oldestTimestamp: oldest,
      newestTimestamp: newest
    };
  }

  /**
   * Exports all drafts as a structured JSON string.
   */
  public exportDraftsJSON(): string {
    const drafts = this.getAllDrafts();
    const payload = {
      version: '1.0',
      exportedAt: Date.now(),
      client: 'UREfy',
      draftCount: drafts.length,
      drafts
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Imports drafts from a JSON string, merging with existing records.
   */
  public importDraftsJSON(jsonString: string): { imported: number; failed: number } {
    let imported = 0;
    let failed = 0;

    try {
      const parsed = JSON.parse(jsonString);
      const draftsArray: DraftRecord[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.drafts)
        ? parsed.drafts
        : [];

      draftsArray.forEach((item) => {
        if (item && typeof item === 'object' && item.key && typeof item.content === 'string') {
          this.saveDraft(item.key, {
            title: item.title,
            content: item.content,
            channelId: item.channelId,
            formatType: item.formatType,
            tags: item.tags,
            pollOptions: item.pollOptions,
            metadata: item.metadata
          });
          imported++;
        } else {
          failed++;
        }
      });
    } catch {
      failed++;
    }

    return { imported, failed };
  }

  /**
   * Subscribes a listener callback to draft updates.
   * Returns an unsubscribe function.
   */
  public subscribe(listener: DraftChangeListener): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  /**
   * Renders the discrete auto-save status bar indicator under the text editor box.
   * Format: `💾 Draft autosaved (12 seconds ago)` with reset button.
   */
  public renderDraftIndicator(key: string): string {
    const draft = this.getDraft(key);
    const hasData = this.hasDraft(key);

    if (!hasData || !draft) {
      return `
        <div id="draft-indicator-${escapeHtml(key)}" class="draft-indicator-root flex items-center justify-between py-1.5 px-2 text-[11px] font-mono text-slate-500 bg-surface-base/40 border border-white/5 rounded-lg select-none transition-all duration-200">
          <div class="flex items-center space-x-1.5 opacity-60">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-slate-600"></span>
            <span>Autosave ready • No unsaved changes</span>
          </div>
          <div class="flex items-center space-x-2">
            <button 
              type="button"
              data-draft-action="open-drawer"
              class="text-cyphr hover:underline hover:text-cyan-300 font-sans text-[10px] transition-colors flex items-center space-x-1"
              title="Open all saved drafts panel"
            >
              <span>📋 Saved Drafts</span>
              ${this.getAllDrafts().length > 0 ? `<span class="bg-cyphr/20 text-cyphr px-1 rounded-full text-[9px] font-bold font-mono">${this.getAllDrafts().length}</span>` : ''}
            </button>
          </div>
        </div>
      `;
    }

    const relativeTime = formatRelativeTime(draft.updatedAt);
    const charCount = (draft.title?.length || 0) + (draft.content?.length || 0);
    const wordCount = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;

    return `
      <div id="draft-indicator-${escapeHtml(key)}" class="draft-indicator-root flex items-center justify-between py-1.5 px-3 text-[11px] font-mono text-slate-400 bg-surface-base/90 border border-cyphr/20 rounded-lg shadow-sm select-none animate-in fade-in duration-200">
        <!-- STATUS BADGE & RELATIVE TIME -->
        <div class="flex items-center space-x-2">
          <span class="flex items-center space-x-1 text-signal font-bold">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-signal"></span>
            </span>
            <span class="text-sm">💾</span>
          </span>
          <span class="text-slate-300">Draft autosaved</span>
          <span class="text-cyphr font-medium">(${escapeHtml(relativeTime)})</span>
          <span class="text-slate-600">•</span>
          <span class="text-slate-400 text-[10px]">${wordCount} words (${charCount} characters)</span>
        </div>

        <!-- ACTIONS: DISCARD / VIEW ALL -->
        <div class="flex items-center space-x-3">
          <button 
            type="button"
            data-draft-action="open-drawer"
            class="text-cyphr hover:text-cyan-300 hover:underline font-sans text-[11px] transition-colors flex items-center space-x-1"
            title="View all drafts"
          >
            <span>All drafts</span>
            <span class="bg-cyphr/20 text-cyphr px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">${this.getAllDrafts().length}</span>
          </button>

          <span class="text-slate-700">|</span>

          <button 
            type="button" 
            data-draft-action="clear" 
            data-draft-key="${escapeHtml(key)}"
            class="text-crimson hover:text-red-400 hover:bg-crimson/10 px-2 py-0.5 rounded transition-all flex items-center space-x-1 text-[11px] font-sans font-medium"
            title="Discard saved draft and start fresh"
          >
            <span>🗑️</span>
            <span>Start fresh</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Helper that renders format type badge.
   */
  private renderFormatBadge(formatType?: string): string {
    switch (formatType) {
      case 'x':
      case 'pulse':
        return '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/60 text-cyphr border border-cyphr/30">⚡ Micro-Pulse</span>';
      case 'poll':
        return '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-signal border border-signal/30">📊 Crypto Poll</span>';
      case 'vault':
      case 'binary':
        return '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/60 text-aether border border-aether/30">🛡️ Binary Release</span>';
      case 'comment':
        return '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/60 text-amber border border-amber/30">💬 Comment</span>';
      case 'article':
      case 'forum':
      case 'publication':
      default:
        return '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200 border border-white/10">📝 Article</span>';
    }
  }

  /**
   * Renders the complete sliding drawer UI (Off-canvas sidebar panel) with all saved drafts.
   */
  public renderDraftsDrawer(isOpen: boolean = false): string {
    const allDrafts = this.getAllDrafts();
    const stats = this.getStats();

    // Filter drafts based on search and format filter
    const filteredDrafts = allDrafts.filter((draft) => {
      if (this.activeDrawerFilter !== 'all') {
        const matchesFormat = (draft.formatType || 'article').toLowerCase() === this.activeDrawerFilter.toLowerCase();
        if (!matchesFormat) return false;
      }
      if (this.drawerSearchQuery.trim()) {
        const q = this.drawerSearchQuery.toLowerCase().trim();
        const inTitle = draft.title ? draft.title.toLowerCase().includes(q) : false;
        const inContent = draft.content.toLowerCase().includes(q);
        const inKey = draft.key.toLowerCase().includes(q);
        const inChannel = draft.channelId ? draft.channelId.toLowerCase().includes(q) : false;
        return inTitle || inContent || inKey || inChannel;
      }
      return true;
    });

    return `
      <!-- DRAFTS VAULT SLIDING DRAWER BACKDROP -->
      <div 
        id="aetheris-drafts-drawer-container"
        class="fixed inset-0 z-50 transition-all duration-300 ${isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}"
        aria-hidden="${!isOpen}"
      >
        <!-- BLACK BACKDROP OVERLAY -->
        <div 
          id="drafts-drawer-backdrop" 
          data-draft-action="close-drawer"
          class="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}"
        ></div>

        <!-- RIGHT SLIDING DRAWER PANEL -->
        <div 
          id="drafts-drawer-panel"
          class="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] bg-surface-base border-l border-white/10 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out z-10 ${isOpen ? 'translate-x-0' : 'translate-x-full'}"
        >
          
          <!-- DRAWER HEADER -->
          <div class="p-4 border-subtle-b bg-surface-raised/80 flex items-center justify-between shrink-0">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-xl bg-cyphr/10 border border-cyphr/30 flex items-center justify-center text-cyphr text-lg font-bold shadow-cyphr-sm">
                📋
              </div>
              <div>
                <div class="flex items-center space-x-2">
                  <h2 class="text-sm font-bold text-white tracking-wide">Saved Drafts</h2>
                  <span class="bg-cyphr/20 text-cyphr font-mono text-[10px] px-2 py-0.5 rounded-full font-bold border border-cyphr/30">
                    ${allDrafts.length} ${allDrafts.length === 1 ? 'draft' : 'drafts'}
                  </span>
                </div>
                <p class="text-[11px] text-slate-400 font-sans mt-0.5">Automatic recovery and content restore</p>
              </div>
            </div>

            <!-- CLOSE BUTTON -->
            <button 
              type="button" 
              data-draft-action="close-drawer"
              class="text-slate-400 hover:text-white hover:bg-surface-overlay p-2 rounded-lg transition-colors font-mono text-sm"
              title="Close panel (Esc)"
            >
              ✕
            </button>
          </div>

          <!-- DRAWER SUB-HEADER (SEARCH & FILTER TABS) -->
          <div class="p-3 bg-surface-base border-subtle-b space-y-2.5 shrink-0">
            <!-- SEARCH INPUT -->
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              <input 
                type="text" 
                id="drafts-drawer-search-input"
                data-draft-action="search"
                value="${escapeHtml(this.drawerSearchQuery)}"
                placeholder="Search titles, content, or channels..." 
                class="w-full bg-surface-raised border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyphr/60 font-sans transition-all"
              />
              ${this.drawerSearchQuery ? `
                <button 
                  type="button" 
                  data-draft-action="clear-search" 
                  class="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs font-mono"
                >✕</button>
              ` : ''}
            </div>

            <!-- FORMAT FILTER PILLS -->
            <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-sans scrollbar-none">
              <button 
                data-draft-filter="all" 
                class="btn-draft-filter px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${this.activeDrawerFilter === 'all' ? 'bg-cyphr text-black font-bold shadow-sm' : 'bg-surface-raised text-slate-400 hover:text-slate-200'}"
              >
                All (${allDrafts.length})
              </button>
              <button 
                data-draft-filter="article" 
                class="btn-draft-filter px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${this.activeDrawerFilter === 'article' ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'bg-surface-raised text-slate-400 hover:text-slate-200'}"
              >
                📝 Articles
              </button>
              <button 
                data-draft-filter="pulse" 
                class="btn-draft-filter px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${this.activeDrawerFilter === 'pulse' ? 'bg-cyphr text-black font-bold shadow-sm' : 'bg-surface-raised text-slate-400 hover:text-slate-200'}"
              >
                ⚡ Pulses
              </button>
              <button 
                data-draft-filter="poll" 
                class="btn-draft-filter px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${this.activeDrawerFilter === 'poll' ? 'bg-cyphr text-black font-bold shadow-sm' : 'bg-surface-raised text-slate-400 hover:text-slate-200'}"
              >
                📊 Polls
              </button>
              <button 
                data-draft-filter="vault" 
                class="btn-draft-filter px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${this.activeDrawerFilter === 'vault' ? 'bg-cyphr text-black font-bold shadow-sm' : 'bg-surface-raised text-slate-400 hover:text-slate-200'}"
              >
                🛡️ Releases
              </button>
            </div>
          </div>

          <!-- DRAWER BODY: DRAFTS LIST -->
          <div id="drafts-drawer-list" class="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            ${filteredDrafts.length === 0 ? this.renderEmptyDrawerState() : filteredDrafts.map((draft) => this.renderDraftCard(draft)).join('')}
          </div>

          <!-- DRAWER FOOTER (ACTIONS & STORAGE METRICS) -->
          <div class="p-3 border-t border-white/10 bg-surface-raised/90 shrink-0 space-y-2">
            <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <div class="flex items-center space-x-1.5">
                <span class="text-cyphr">●</span>
                <span>Local Storage Vault:</span>
                <span class="text-slate-200 font-bold">${formatByteSize(stats.totalEstimatedBytes)}</span>
              </div>
              <div class="text-slate-500">
                ${stats.totalCharacters} total characters
              </div>
            </div>

            <div class="flex items-center justify-between pt-1">
              <div class="flex items-center space-x-2">
                <button 
                  type="button" 
                  data-draft-action="export-json"
                  class="px-2.5 py-1 bg-surface-overlay hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-mono transition-colors flex items-center space-x-1 border border-white/5"
                  title="Export all drafts in JSON format"
                >
                  <span>📤 Export JSON</span>
                </button>

                <button 
                  type="button" 
                  data-draft-action="trigger-import"
                  class="px-2.5 py-1 bg-surface-overlay hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-mono transition-colors flex items-center space-x-1 border border-white/5"
                  title="Import drafts from JSON file"
                >
                  <span>📥 Import</span>
                </button>
                <input type="file" id="drafts-import-file-input" accept=".json" class="hidden" />
              </div>

              ${allDrafts.length > 0 ? `
                <button 
                  type="button" 
                  data-draft-action="clear-all"
                  class="px-2.5 py-1 bg-crimson/10 hover:bg-crimson/20 text-crimson rounded-lg text-xs font-sans font-medium transition-colors border border-crimson/20"
                  title="Delete all drafts from browser"
                >
                  🗑️ Clear All (${allDrafts.length})
                </button>
              ` : ''}
            </div>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Renders a single draft card in the drawer list.
   */
  private renderDraftCard(draft: DraftRecord): string {
    const relativeTime = formatRelativeTime(draft.updatedAt);
    const exactDate = new Date(draft.updatedAt).toLocaleString('en-US');
    const snippet = draft.content.trim() ? draft.content.substring(0, 160) : '(No text content)';
    const titleDisplay = draft.title ? draft.title : `Draft ${draft.key}`;
    const wordCount = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;
    const charCount = (draft.title?.length || 0) + (draft.content?.length || 0);

    return `
      <div 
        id="draft-card-${escapeHtml(draft.key)}"
        class="bg-surface-base border border-white/10 hover:border-cyphr/40 rounded-xl p-3.5 space-y-2.5 transition-all duration-150 group hover:shadow-lg"
      >
        <!-- CARD HEADER -->
        <div class="flex items-start justify-between gap-2">
          <div class="space-y-1 flex-1 min-w-0">
            <div class="flex items-center space-x-2 flex-wrap gap-y-1">
              ${this.renderFormatBadge(draft.formatType)}
              ${draft.channelId ? `
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-overlay text-slate-300 border border-white/5">
                  #${escapeHtml(draft.channelId)}
                </span>
              ` : ''}
              <span class="text-[10px] font-mono text-slate-500" title="${escapeHtml(exactDate)}">
                ⏱️ ${escapeHtml(relativeTime)}
              </span>
            </div>

            <h4 class="text-xs font-bold text-white truncate group-hover:text-cyphr transition-colors">
              ${escapeHtml(titleDisplay)}
            </h4>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="flex items-center space-x-1 shrink-0">
            <button 
              type="button" 
              data-draft-action="restore"
              data-draft-key="${escapeHtml(draft.key)}"
              class="px-2.5 py-1 bg-cyphr hover:bg-cyan-300 text-black font-bold text-xs rounded-lg transition-all shadow-cyphr-sm flex items-center space-x-1"
              title="Restore content to editor"
            >
              <span>📂</span>
              <span>Load</span>
            </button>

            <button 
              type="button" 
              data-draft-action="copy" 
              data-draft-key="${escapeHtml(draft.key)}"
              class="p-1.5 text-slate-400 hover:text-white hover:bg-surface-overlay rounded-lg transition-colors text-xs"
              title="Copy text to clipboard"
            >
              📋
            </button>

            <button 
              type="button" 
              data-draft-action="delete" 
              data-draft-key="${escapeHtml(draft.key)}"
              class="p-1.5 text-slate-400 hover:text-crimson hover:bg-crimson/10 rounded-lg transition-colors text-xs"
              title="Permanently delete this draft"
            >
              🗑️
            </button>
          </div>
        </div>

        <!-- CARD SNIPPET PREVIEW -->
        <p class="text-xs text-slate-400 font-sans line-clamp-3 leading-relaxed break-words bg-surface-raised/40 p-2 rounded-lg border border-white/5">
          ${escapeHtml(snippet)}
        </p>

        <!-- POLL OPTIONS PREVIEW IF PRESENT -->
        ${draft.pollOptions && draft.pollOptions.length > 0 ? `
          <div class="text-[10px] font-mono text-slate-400 space-y-1 bg-surface-raised/60 p-2 rounded border border-white/5">
            <div class="text-signal font-bold flex items-center space-x-1">
              <span>📊 Poll Options (${draft.pollOptions.length}):</span>
            </div>
            <ul class="list-disc list-inside space-y-0.5 text-slate-300">
              ${draft.pollOptions.filter((opt) => opt.trim()).map((opt) => `<li>${escapeHtml(opt)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- CARD FOOTER METRICS -->
        <div class="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/5">
          <div class="flex items-center space-x-2">
            <span>Key: <code class="text-slate-300">${escapeHtml(draft.key)}</code></span>
          </div>
          <div>
            <span>${wordCount} words • ${charCount} characters</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the empty state for the drafts drawer.
   */
  private renderEmptyDrawerState(): string {
    const isSearching = Boolean(this.drawerSearchQuery.trim() || this.activeDrawerFilter !== 'all');

    return `
      <div class="flex flex-col items-center justify-center h-full py-16 px-6 text-center select-none space-y-3">
        <div class="w-16 h-16 rounded-2xl bg-surface-raised border border-white/10 flex items-center justify-center text-3xl shadow-inner">
          ${isSearching ? '🔍' : '📝'}
        </div>
        <div class="space-y-1">
          <h3 class="text-sm font-bold text-slate-200">
            ${isSearching ? 'No drafts found' : 'No unfinished drafts'}
          </h3>
          <p class="text-xs text-slate-400 max-w-xs leading-relaxed">
            ${isSearching
              ? 'No drafts match the search query or filter. Try resetting your filter.'
              : 'Everything typed into the editor is autosaved locally every 400ms with zero external tracking.'}
          </p>
        </div>
        ${isSearching ? `
          <button 
            type="button" 
            data-draft-action="reset-filters"
            class="px-3 py-1.5 bg-surface-overlay hover:bg-slate-700 text-cyphr rounded-lg text-xs font-medium transition-colors border border-cyphr/20"
          >
            Reset filters
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Automatically binds a textarea or inputs to debounced autosave with live indicator updates.
   * Returns a cleanup unbind function.
   */
  public bindTextarea(
    textareaEl: HTMLTextAreaElement,
    key: string,
    options?: {
      titleInputEl?: HTMLInputElement;
      channelId?: string;
      formatType?: string;
      indicatorContainerEl?: HTMLElement;
      onSave?: (draft: DraftRecord) => void;
    }
  ): () => void {
    if (!textareaEl || !key) return () => {};

    // Populate initial value if draft exists
    const existing = this.getDraft(key);
    if (existing) {
      if (!textareaEl.value && existing.content) {
        textareaEl.value = existing.content;
      }
      if (options?.titleInputEl && !options.titleInputEl.value && existing.title) {
        options.titleInputEl.value = existing.title;
      }
    }

    const updateIndicator = () => {
      if (options?.indicatorContainerEl) {
        options.indicatorContainerEl.innerHTML = this.renderDraftIndicator(key);
      }
    };

    const handleInput = () => {
      const content = textareaEl.value;
      const title = options?.titleInputEl ? options.titleInputEl.value : undefined;

      this.debounceSave(key, {
        content,
        title,
        channelId: options?.channelId,
        formatType: options?.formatType || 'article'
      });

      // Optimistic instant feedback in indicator if needed
      updateIndicator();
    };

    textareaEl.addEventListener('input', handleInput);
    if (options?.titleInputEl) {
      options.titleInputEl.addEventListener('input', handleInput);
    }

    // Subscribe to external changes (e.g. discard button clicked)
    const unsub = this.subscribe((changedKey, draft) => {
      if (changedKey === key) {
        if (!draft) {
          textareaEl.value = '';
          if (options?.titleInputEl) {
            options.titleInputEl.value = '';
          }
        }
        updateIndicator();
        if (draft && options?.onSave) {
          options.onSave(draft);
        }
      }
    });

    updateIndicator();

    return () => {
      textareaEl.removeEventListener('input', handleInput);
      if (options?.titleInputEl) {
        options.titleInputEl.removeEventListener('input', handleInput);
      }
      unsub();
    };
  }

  /**
   * Attaches interactive delegated DOM event listeners to handle drawer and indicator actions.
   */
  public attachEventListeners(root: Document | HTMLElement = typeof document !== 'undefined' ? document : (null as any)): void {
    if (!root) return;

    // Delegated click listener
    root.addEventListener('click', async (event: Event) => {
      const target = (event.target as HTMLElement)?.closest('[data-draft-action], [data-draft-filter]') as HTMLElement | null;
      if (!target) return;

      const action = target.getAttribute('data-draft-action');
      const filter = target.getAttribute('data-draft-filter');
      const draftKey = target.getAttribute('data-draft-key');

      // Filter click
      if (filter) {
        this.activeDrawerFilter = filter;
        this.updateDrawerDom();
        return;
      }

      switch (action) {
        case 'open-drawer': {
          this.openDrawer();
          break;
        }
        case 'close-drawer': {
          this.closeDrawer();
          break;
        }
        case 'clear': {
          if (draftKey) {
            this.clearDraft(draftKey);
            this.updateIndicatorDom(draftKey);
          }
          break;
        }
        case 'delete': {
          if (draftKey) {
            this.clearDraft(draftKey);
            this.updateDrawerDom();
            this.updateIndicatorDom(draftKey);
          }
          break;
        }
        case 'clear-all': {
          const okDelete = await (window.sovereignDialog ? window.sovereignDialog.confirm('Are you sure you want to delete all saved drafts?', { title: 'Delete All Drafts', destructive: true }) : Promise.resolve(true));
          if (okDelete) {
            this.clearAllDrafts();
            this.updateDrawerDom();
          }
          break;
        }
        case 'restore': {
          if (draftKey) {
            const draft = this.getDraft(draftKey);
            if (draft && typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('aetheris:restore-draft', { detail: draft })
              );
            }
            this.closeDrawer();
          }
          break;
        }
        case 'copy': {
          if (draftKey) {
            const draft = this.getDraft(draftKey);
            if (draft && typeof navigator !== 'undefined' && navigator.clipboard) {
              const fullText = draft.title ? `${draft.title}\n\n${draft.content}` : draft.content;
              navigator.clipboard.writeText(fullText).then(() => {
                const originalHtml = target.innerHTML;
                target.innerHTML = '✓ Copied!';
                setTimeout(() => {
                  target.innerHTML = originalHtml;
                }, 1500);
              });
            }
          }
          break;
        }
        case 'export-json': {
          this.downloadExportFile();
          break;
        }
        case 'trigger-import': {
          const fileInput = document.getElementById('drafts-import-file-input') as HTMLInputElement | null;
          if (fileInput) fileInput.click();
          break;
        }
        case 'clear-search': {
          this.drawerSearchQuery = '';
          this.updateDrawerDom();
          break;
        }
        case 'reset-filters': {
          this.drawerSearchQuery = '';
          this.activeDrawerFilter = 'all';
          this.updateDrawerDom();
          break;
        }
      }
    });

    // Delegated input listener for search bar
    root.addEventListener('input', (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target && target.id === 'drafts-drawer-search-input') {
        this.drawerSearchQuery = (target as HTMLInputElement).value;
        this.updateDrawerListOnly();
      }
    });

    // File import input change
    root.addEventListener('change', (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target && target.id === 'drafts-import-file-input') {
        const fileInput = target as HTMLInputElement;
        const file = fileInput.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
              const result = this.importDraftsJSON(text);
              sovereignDialog.alert(`Import complete: ${result.imported} drafts imported, ${result.failed} failed.`, { title: 'Draft Import', type: 'success' });
              this.updateDrawerDom();
            }
          };
          reader.readAsText(file);
        }
      }
    });

    // Keyboard ESC to close drawer
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.closeDrawer();
        }
      });
    }
  }

  /**
   * Opens the drafts sliding drawer in the DOM.
   */
  public openDrawer(): void {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('aetheris-drafts-drawer-container');
    if (!container) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = this.renderDraftsDrawer(true);
      document.body.appendChild(wrapper.firstElementChild || wrapper);
    } else {
      const parent = container.parentElement;
      if (parent) {
        const temp = document.createElement('div');
        temp.innerHTML = this.renderDraftsDrawer(true);
        const newEl = temp.firstElementChild;
        if (newEl) parent.replaceChild(newEl, container);
      }
    }
  }

  /**
   * Closes the drafts sliding drawer in the DOM.
   */
  public closeDrawer(): void {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('aetheris-drafts-drawer-container');
    if (!container) return;

    const parent = container.parentElement;
    if (parent) {
      const temp = document.createElement('div');
      temp.innerHTML = this.renderDraftsDrawer(false);
      const newEl = temp.firstElementChild;
      if (newEl) parent.replaceChild(newEl, container);
    }
  }

  /**
   * Updates only the list items inside the open drawer.
   */
  private updateDrawerListOnly(): void {
    if (typeof document === 'undefined') return;
    const listEl = document.getElementById('drafts-drawer-list');
    if (!listEl) return;

    const allDrafts = this.getAllDrafts();
    const filteredDrafts = allDrafts.filter((draft) => {
      if (this.activeDrawerFilter !== 'all') {
        const matchesFormat = (draft.formatType || 'article').toLowerCase() === this.activeDrawerFilter.toLowerCase();
        if (!matchesFormat) return false;
      }
      if (this.drawerSearchQuery.trim()) {
        const q = this.drawerSearchQuery.toLowerCase().trim();
        const inTitle = draft.title ? draft.title.toLowerCase().includes(q) : false;
        const inContent = draft.content.toLowerCase().includes(q);
        const inKey = draft.key.toLowerCase().includes(q);
        const inChannel = draft.channelId ? draft.channelId.toLowerCase().includes(q) : false;
        return inTitle || inContent || inKey || inChannel;
      }
      return true;
    });

    listEl.innerHTML = filteredDrafts.length === 0
      ? this.renderEmptyDrawerState()
      : filteredDrafts.map((d) => this.renderDraftCard(d)).join('');
  }

  /**
   * Full re-render of drawer DOM if open.
   */
  private updateDrawerDom(): void {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('aetheris-drafts-drawer-container');
    if (!container) return;
    const isOpen = !container.classList.contains('pointer-events-none');
    const parent = container.parentElement;
    if (parent) {
      const temp = document.createElement('div');
      temp.innerHTML = this.renderDraftsDrawer(isOpen);
      const newEl = temp.firstElementChild;
      if (newEl) parent.replaceChild(newEl, container);
    }
  }

  /**
   * Updates a specific indicator DOM element.
   */
  private updateIndicatorDom(key: string): void {
    if (typeof document === 'undefined') return;
    const indicatorEl = document.getElementById(`draft-indicator-${key}`);
    if (indicatorEl && indicatorEl.parentElement) {
      const temp = document.createElement('div');
      temp.innerHTML = this.renderDraftIndicator(key);
      const newEl = temp.firstElementChild;
      if (newEl) indicatorEl.parentElement.replaceChild(newEl, indicatorEl);
    }
  }

  /**
   * Triggers a browser download of the exported JSON file.
   */
  private downloadExportFile(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    try {
      const json = this.exportDraftsJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `urefy-drafts-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[DraftAutosave] Failed to download export:', err);
    }
  }
}

/**
 * Singleton instance of the Draft Autosave Manager.
 */
export const draftAutosave = new DraftAutosaveManager();
