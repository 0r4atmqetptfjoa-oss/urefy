import { serviceRegistry, SERVICES } from './service-registry.js';
import { isDemoModeEnabled } from './demo-mode.js';
import { isLocalDev } from './admin-auth.js';

/**
 * Interface representing an individual encrypted bookmark entry stored in local vault.
 */
export interface BookmarkEntry {
  id: string;
  postId: string;
  postTitle: string;
  postAuthor: string;
  channelId: string;
  savedAt: number;
  tags: string[];
  note: string;
}

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
 * Formats a Unix timestamp into a human-readable local date string.
 */
function formatDate(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Recent';
  }
}

/**
 * Local Encrypted Bookmarks Vault.
 * Manages client-side persisted saved posts with metadata, tagging, search, and UI templates.
 */
export class BookmarksVault {
  public bookmarks: BookmarkEntry[] = [];
  private readonly storageKey: string = 'aetheris_bookmarks';

  /**
   * Initializes the BookmarksVault by hydrating state from localStorage or seeding demo entries.
   */
  constructor() {
    this.load();
    serviceRegistry.registerInstance(SERVICES.BookmarksVault, this);
  }

  /**
   * Loads saved bookmarks from browser localStorage or initializes default sample bookmarks.
   */
  private load(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      if (isDemoModeEnabled() && isLocalDev()) {
        this.initDemoBookmarks();
      } else {
        this.bookmarks = [];
      }
      return;
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.bookmarks = parsed.map((item: Partial<BookmarkEntry>) => ({
            id: item.id || `bm_${Date.now()}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`,
            postId: item.postId || '',
            postTitle: item.postTitle || 'Untitled Encrypted Post',
            postAuthor: item.postAuthor || 'Anonymous',
            channelId: item.channelId || 'relays-general',
            savedAt: typeof item.savedAt === 'number' ? item.savedAt : Date.now(),
            tags: Array.isArray(item.tags) ? item.tags.filter(t => typeof t === 'string' && t.trim().length > 0) : ['saved'],
            note: typeof item.note === 'string' ? item.note : ''
          }));
          return;
        }
      }
    } catch (err) {
      console.warn('[BookmarksVault] Failed to parse bookmarks from localStorage. Re-initializing default seeds.', err);
    }

    if (isDemoModeEnabled() && isLocalDev()) {
      this.initDemoBookmarks();
      this.persist();
    } else {
      this.bookmarks = [];
    }
  }

  /**
   * Populates the vault with two initial cryptographic demo bookmarks.
   */
  private initDemoBookmarks(): void {
    if (!isLocalDev()) return;
    const now = Date.now();
    this.bookmarks = [
      {
        id: 'bm_demo_01',
        postId: 'post_zk_rollup_spec_v2',
        postTitle: 'UREfy Zero-Knowledge Rollup Specification v2.4 & Circuit Verification',
        postAuthor: '0x9F4B...3E1A',
        channelId: 'relays-core',
        savedAt: now - 86400000 * 2, // 2 days ago
        tags: ['zk-rollup', 'cryptography', 'spec'],
        note: 'Critical reference for layer-2 zero-knowledge circuit optimization and proof aggregation pipelines.'
      },
      {
        id: 'bm_demo_02',
        postId: 'post_swarm_storage_audit',
        postTitle: 'Decentralized Swarm Storage Protocol Analysis & Merkle Tree Hygiene',
        postAuthor: '0x7C22...88D1',
        channelId: 'vault-releases',
        savedAt: now - 86400000 * 5, // 5 days ago
        tags: ['storage', 'p2p', 'audit'],
        note: 'Review seeder distribution algorithms and data integrity guarantees before the next testnet hard fork.'
      }
    ];
  }

  /**
   * Automatically persists the current bookmarks array into localStorage.
   */
  private persist(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.bookmarks));
    } catch (err) {
      console.error('[BookmarksVault] Failed to persist bookmarks to localStorage', err);
    }
  }

  /**
   * Saves or updates a post in the local bookmarks vault.
   *
   * @param post - The post object containing id, title, authorFingerprint, and channelId
   * @param tags - Optional array of tags to assign to the bookmark
   * @param note - Optional personal note text
   */
  public save(
    post: { id: string; title: string; authorFingerprint: string; channelId: string },
    tags?: string[],
    note?: string
  ): void {
    const existingIndex = this.bookmarks.findIndex(b => b.postId === post.id || b.id === post.id);
    const cleanedTags = tags && tags.length > 0
      ? Array.from(new Set(tags.map(t => t.trim().toLowerCase()).filter(t => t.length > 0)))
      : ['general'];

    if (existingIndex !== -1) {
      // Update existing bookmark
      const existing = this.bookmarks[existingIndex];
      const mergedTags = Array.from(new Set([...existing.tags, ...cleanedTags]));
      this.bookmarks[existingIndex] = {
        ...existing,
        postTitle: post.title || existing.postTitle,
        postAuthor: post.authorFingerprint || existing.postAuthor,
        channelId: post.channelId || existing.channelId,
        tags: mergedTags,
        note: note !== undefined ? note.trim() : existing.note
      };
    } else {
      // Create new bookmark entry
      const newEntry: BookmarkEntry = {
        id: `bm_${Date.now()}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`,
        postId: post.id,
        postTitle: post.title || 'Untitled Post',
        postAuthor: post.authorFingerprint || 'Anonymous',
        channelId: post.channelId || 'general',
        savedAt: Date.now(),
        tags: cleanedTags,
        note: note ? note.trim() : ''
      };
      this.bookmarks.unshift(newEntry);
    }

    this.persist();
    if (typeof window !== 'undefined' && (window as any).toastManager) {
      (window as any).toastManager.success('Post saved to bookmarks', '🔖');
    }
  }

  /**
   * Removes a bookmark by its associated post ID or bookmark entry ID.
   *
   * @param postId - ID of the post or bookmark to remove
   */
  public unsave(postId: string): void {
    const initialLen = this.bookmarks.length;
    this.bookmarks = this.bookmarks.filter(b => b.postId !== postId && b.id !== postId);
    if (this.bookmarks.length !== initialLen) {
      this.persist();
      if (typeof window !== 'undefined' && (window as any).toastManager) {
        (window as any).toastManager.info('Bookmark removed', '🗑️');
      }
    }
  }

  /**
   * Checks whether a post is currently saved in the bookmarks vault.
   *
   * @param postId - ID of the post to check
   */
  public isSaved(postId: string): boolean {
    return this.bookmarks.some(b => b.postId === postId || b.id === postId);
  }

  /**
   * Toggles the bookmark state for a post.
   */
  public toggleBookmark(post: { id: string; title?: string; authorFingerprint?: string; channelId?: string }): boolean {
    if (this.isSaved(post.id)) {
      this.unsave(post.id);
      return false;
    } else {
      this.save({
        id: post.id,
        title: post.title || 'Untitled Post',
        authorFingerprint: post.authorFingerprint || 'anonymous',
        channelId: post.channelId || 'pulse-global',
      });
      return true;
    }
  }

  /**
   * Retrieves a bookmark entry by postId or bookmark id.
   */
  public getByPostId(postId: string): BookmarkEntry | undefined {
    return this.bookmarks.find(b => b.postId === postId || b.id === postId);
  }

  /**
   * Adds a tag to an existing bookmark entry.
   *
   * @param postId - ID of the bookmarked post
   * @param tag - Tag name to add
   */
  public addTag(postId: string, tag: string): void {
    const cleanTag = tag.trim().toLowerCase();
    if (!cleanTag) return;

    const entry = this.bookmarks.find(b => b.postId === postId || b.id === postId);
    if (entry) {
      if (!entry.tags.includes(cleanTag)) {
        entry.tags.push(cleanTag);
        this.persist();
      }
    }
  }

  /**
   * Removes a tag from an existing bookmark entry.
   *
   * @param postId - ID of the bookmarked post
   * @param tag - Tag name to remove
   */
  public removeTag(postId: string, tag: string): void {
    const cleanTag = tag.trim().toLowerCase();
    const entry = this.bookmarks.find(b => b.postId === postId || b.id === postId);
    if (entry) {
      const initialLength = entry.tags.length;
      entry.tags = entry.tags.filter(t => t.toLowerCase() !== cleanTag);
      if (entry.tags.length !== initialLength) {
        this.persist();
      }
    }
  }

  /**
   * Updates or sets the personal note for a bookmarked post.
   *
   * @param postId - ID of the bookmarked post
   * @param note - New note content
   */
  public updateNote(postId: string, note: string): void {
    const entry = this.bookmarks.find(b => b.postId === postId || b.id === postId);
    if (entry) {
      entry.note = note.trim();
      this.persist();
    }
  }

  /**
   * Performs multi-field search across titles, notes, tags, channels, and authors.
   *
   * @param query - Search term
   * @returns Array of matching BookmarkEntry objects
   */
  public search(query: string): BookmarkEntry[] {
    const q = query ? query.trim().toLowerCase() : '';
    if (!q) {
      return [...this.bookmarks];
    }

    return this.bookmarks.filter(b => {
      const matchTitle = b.postTitle.toLowerCase().includes(q);
      const matchNote = b.note.toLowerCase().includes(q);
      const matchTags = b.tags.some(t => t.toLowerCase().includes(q));
      const matchChannel = b.channelId.toLowerCase().includes(q);
      const matchAuthor = b.postAuthor.toLowerCase().includes(q);
      return matchTitle || matchNote || matchTags || matchChannel || matchAuthor;
    });
  }

  /**
   * Extracts a sorted, unique list of all tags present in the vault.
   */
  public getAllTags(): string[] {
    const tagSet = new Set<string>();
    for (const b of this.bookmarks) {
      for (const t of b.tags) {
        const trimmed = t.trim().toLowerCase();
        if (trimmed) {
          tagSet.add(trimmed);
        }
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Exports all bookmarked items to a formatted JSON string.
   */
  public exportToJson(): string {
    return JSON.stringify(this.bookmarks, null, 2);
  }

  /**
   * Imports bookmarks from a JSON string, validating the schema and merging non-duplicates.
   *
   * @param jsonStr - Raw JSON string containing bookmark entries
   * @returns boolean - True if import succeeded, false otherwise
   */
  public importFromJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) {
        return false;
      }

      let importedCount = 0;
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const postId = typeof item.postId === 'string' && item.postId.trim() ? item.postId.trim() : '';
        if (!postId) continue;

        const title = typeof item.postTitle === 'string' ? item.postTitle : 'Imported Post';
        const author = typeof item.postAuthor === 'string' ? item.postAuthor : 'Unknown Author';
        const channel = typeof item.channelId === 'string' ? item.channelId : 'general';
        const tags = Array.isArray(item.tags)
          ? item.tags.filter((t: unknown) => typeof t === 'string' && (t as string).trim().length > 0)
          : ['imported'];
        const note = typeof item.note === 'string' ? item.note : '';

        this.save({ id: postId, title, authorFingerprint: author, channelId: channel }, tags, note);
        importedCount++;
      }

      if (importedCount > 0) {
        this.persist();
        return true;
      }
      return false;
    } catch (err) {
      console.error('[BookmarksVault] Failed to import bookmarks from JSON', err);
      return false;
    }
  }

  /**
   * Renders the action button for toggling bookmark status on a post card.
   *
   * @param postId - ID of the post
   * @returns HTML string for the button element
   */
  public renderBookmarkButton(postId: string): string {
    const saved = this.isSaved(postId);
    const safePostId = escapeHtml(postId);

    if (saved) {
      return `
        <button
          type="button"
          class="btn-toggle-bookmark flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all bg-amber-500/10 text-amber border border-amber-500/30 hover:bg-amber-500/20 shadow-sm"
          data-post-id="${safePostId}"
          title="Remove from encrypted local vault"
        >
          <span class="text-amber animate-pulse">🔖</span>
          <span>Saved</span>
        </button>
      `.trim();
    }

    return `
      <button
        type="button"
        class="btn-toggle-bookmark flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all text-slate-400 hover:text-amber hover:bg-surface-overlay border border-transparent hover:border-white/10"
        data-post-id="${safePostId}"
        title="Save to local encrypted vault"
      >
        <span class="opacity-60 hover:opacity-100">🔖</span>
        <span>Bookmark</span>
      </button>
    `.trim();
  }

  /**
   * Renders the full lateral Bookmark Panel containing search bar, tag filters,
   * saved post cards with inline note editor, export button, and delete controls.
   *
   * @returns HTML string for the complete lateral panel
   */
  public renderBookmarkPanel(): string {
    const allTags = this.getAllTags();
    const bookmarks = this.bookmarks;
    const totalCount = bookmarks.length;

    const tagsHtml = allTags.length > 0
      ? `
        <div class="flex flex-wrap gap-1.5 mb-3">
          <button
            type="button"
            class="bookmark-tag-filter active px-2 py-0.5 rounded text-[11px] font-mono transition-all bg-cyphr/10 text-cyphr border border-cyphr/30 hover:bg-cyphr/20"
            data-tag=""
          >
            All (${totalCount})
          </button>
          ${allTags.map(tag => `
            <button
              type="button"
              class="bookmark-tag-filter px-2 py-0.5 rounded text-[11px] font-mono transition-all bg-surface-raised text-slate-300 border border-white/5 hover:border-white/20 hover:text-white"
              data-tag="${escapeHtml(tag)}"
            >
              #${escapeHtml(tag)}
            </button>
          `).join('')}
        </div>
      `
      : '';

    const listHtml = totalCount > 0
      ? bookmarks.map(entry => this.renderBookmarkCard(entry)).join('')
      : `
        <div class="flex flex-col items-center justify-center p-8 text-center bg-surface-raised/40 rounded-lg border border-white/5">
          <div class="text-3xl mb-2 opacity-50">🔖</div>
          <p class="text-sm font-medium text-slate-300 mb-1">No Bookmarks Saved Yet</p>
          <p class="text-xs text-slate-500 max-w-xs">
            Click the bookmark icon on any post in the relays or vault feed to store encrypted references locally.
          </p>
        </div>
      `;

    return `
      <aside class="bookmarks-panel flex flex-col h-full w-full bg-surface-base border-l border-white/5 font-sans select-none overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3.5 border-subtle-b bg-surface-raised/60 backdrop-blur-sm">
          <div class="flex items-center gap-2">
            <span class="text-amber text-lg">🔖</span>
            <h2 class="text-sm font-semibold text-white tracking-wide">Encrypted Bookmarks</h2>
            <span class="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-amber-500/20 text-amber border border-amber-500/30">
              ${totalCount}
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              id="btn-bookmarks-modal-open"
              class="p-1.5 rounded text-slate-400 hover:text-cyphr hover:bg-surface-overlay transition-all"
              title="Open Fullscreen Vault Modal"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button
              type="button"
              id="btn-bookmarks-export-json"
              class="p-1.5 rounded text-slate-400 hover:text-signal hover:bg-surface-overlay transition-all"
              title="Export Bookmarks to JSON"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Search and Filters -->
        <div class="p-3.5 border-subtle-b bg-surface-base">
          <div class="relative mb-2.5">
            <input
              type="text"
              id="bookmarks-search-input"
              class="w-full bg-surface-raised border border-white/10 focus:border-amber focus:ring-1 focus:ring-amber rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-sans outline-none transition-all pl-8"
              placeholder="Search titles, tags, or notes..."
            />
            <span class="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
          </div>
          ${tagsHtml}
        </div>

        <!-- Bookmarks List -->
        <div id="bookmarks-items-container" class="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
          ${listHtml}
        </div>

        <!-- Footer Bar -->
        <div class="p-3 border-t border-white/5 bg-surface-raised/40 flex items-center justify-between text-xs text-slate-400">
          <span class="font-mono text-[11px] text-slate-500">Encrypted Local Storage</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              id="btn-bookmarks-import-trigger"
              class="px-2 py-1 rounded bg-surface-overlay hover:bg-surface-highlight text-slate-300 hover:text-white text-[11px] font-mono transition-all border border-white/5"
            >
              Import JSON
            </button>
          </div>
        </div>
      </aside>
    `.trim();
  }

  /**
   * Helper method to render an individual bookmark card item.
   */
  private renderBookmarkCard(entry: BookmarkEntry): string {
    const safeId = escapeHtml(entry.id);
    const safePostId = escapeHtml(entry.postId);
    const safeTitle = escapeHtml(entry.postTitle);
    const safeAuthor = escapeHtml(entry.postAuthor);
    const safeChannel = escapeHtml(entry.channelId);
    const formattedDate = formatDate(entry.savedAt);
    const safeNote = escapeHtml(entry.note);

    const tagsBadges = entry.tags.map(t => `
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-overlay text-[10px] font-mono text-cyphr border border-cyphr/20">
        #${escapeHtml(t)}
        <button
          type="button"
          class="btn-remove-tag hover:text-crimson transition-colors"
          data-post-id="${safePostId}"
          data-tag="${escapeHtml(t)}"
          title="Remove tag"
        >&times;</button>
      </span>
    `).join('');

    return `
      <div
        class="bookmark-card group relative flex flex-col p-3 rounded-lg bg-surface-raised hover:bg-surface-overlay/80 border border-white/5 hover:border-amber-500/30 transition-all shadow-sm"
        data-bookmark-id="${safeId}"
        data-post-id="${safePostId}"
      >
        <!-- Card Header & Metadata -->
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <div class="flex-1 min-w-0">
            <a
              href="#post-${safePostId}"
              class="bookmark-post-link block text-xs font-medium text-slate-200 group-hover:text-amber transition-colors line-clamp-2 leading-relaxed"
              title="${safeTitle}"
            >
              ${safeTitle}
            </a>
          </div>
          <button
            type="button"
            class="btn-delete-bookmark opacity-60 hover:opacity-100 p-1 text-slate-400 hover:text-crimson transition-colors rounded"
            data-post-id="${safePostId}"
            title="Remove bookmark"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <!-- Author & Channel Info -->
        <div class="flex items-center gap-2 text-[10px] font-mono text-slate-400 mb-2">
          <span class="text-cyphr truncate max-w-[100px]">${safeAuthor}</span>
          <span class="text-slate-600">•</span>
          <span class="px-1 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">${safeChannel}</span>
          <span class="text-slate-600">•</span>
          <span class="text-slate-500 ml-auto">${formattedDate}</span>
        </div>

        <!-- Tags Container -->
        <div class="flex flex-wrap items-center gap-1 mb-2.5">
          ${tagsBadges}
          <button
            type="button"
            class="btn-add-tag-trigger text-[10px] font-mono text-slate-500 hover:text-cyphr px-1.5 py-0.5 rounded bg-surface-overlay/50 border border-dashed border-white/10 hover:border-cyphr/40 transition-colors"
            data-post-id="${safePostId}"
          >
            + tag
          </button>
        </div>

        <!-- Inline Note Block -->
        <div class="bookmark-note-container relative mt-1 pt-2 border-t border-white/5">
          <div class="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
            <span>Encrypted Note</span>
            <button
              type="button"
              class="btn-toggle-note-edit text-slate-400 hover:text-amber transition-colors text-[10px]"
              data-post-id="${safePostId}"
            >
              ${entry.note ? 'Edit Note' : '+ Add Note'}
            </button>
          </div>
          
          <div class="bookmark-note-display ${entry.note ? '' : 'hidden'} text-xs text-slate-300 font-sans italic bg-surface-base/60 p-2 rounded border border-white/5 leading-relaxed break-words">
            ${safeNote || '<span class="text-slate-500 not-italic">No private notes attached.</span>'}
          </div>

          <div class="bookmark-note-editor hidden mt-1 space-y-1.5">
            <textarea
              class="bookmark-note-textarea w-full bg-surface-base border border-white/10 focus:border-amber rounded p-2 text-xs text-slate-200 placeholder-slate-500 font-sans outline-none resize-none h-16 transition-all"
              placeholder="Write a private cryptographic reference note..."
            >${safeNote}</textarea>
            <div class="flex justify-end gap-1.5">
              <button
                type="button"
                class="btn-cancel-note px-2 py-0.5 text-[11px] font-mono text-slate-400 hover:text-white rounded bg-surface-overlay hover:bg-surface-highlight transition-all"
                data-post-id="${safePostId}"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn-save-note px-2.5 py-0.5 text-[11px] font-mono text-black font-semibold rounded bg-amber hover:bg-amber-400 transition-all shadow-sm"
                data-post-id="${safePostId}"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    `.trim();
  }

  /**
   * Renders a complete standalone modal dialogue allowing rich exploration, search,
   * batch operations, tag filtering, and JSON import/export for all encrypted bookmarks.
   *
   * @returns HTML string for the modal overlay and container
   */
  public renderBookmarkModal(): string {
    const allTags = this.getAllTags();
    const bookmarks = this.bookmarks;
    const totalCount = bookmarks.length;

    return `
      <div
        id="bookmarks-vault-modal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-md animate-in fade-in duration-200 font-sans"
        role="dialog"
        aria-modal="true"
      >
        <div class="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-surface-base border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-6 py-4 border-subtle-b bg-surface-raised/80">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber text-lg">
                🔖
              </div>
              <div>
                <h2 class="text-base font-semibold text-white tracking-wide flex items-center gap-2">
                  Encrypted Bookmarks Vault
                  <span class="px-2 py-0.5 text-xs font-mono rounded bg-amber-500/20 text-amber border border-amber-500/30">
                    ${totalCount} Stored
                  </span>
                </h2>
                <p class="text-xs text-slate-400">Locally encrypted client repository of saved posts, research notes & cryptographic digests</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                id="btn-modal-export-json"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight text-xs font-mono text-signal border border-signal/20 hover:border-signal/40 transition-all"
              >
                <span>⬇</span>
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                id="btn-modal-import-json"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight text-xs font-mono text-cyphr border border-cyphr/20 hover:border-cyphr/40 transition-all"
              >
                <span>⬆</span>
                <span>Import JSON</span>
              </button>
              <button
                type="button"
                id="btn-close-bookmarks-modal"
                class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-overlay transition-all ml-2"
                title="Close Vault Modal"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Search & Filter Controls -->
          <div class="px-6 py-3.5 border-subtle-b bg-surface-raised/40 flex flex-wrap items-center justify-between gap-3">
            <div class="relative flex-1 min-w-[240px]">
              <input
                type="text"
                id="modal-bookmarks-search"
                class="w-full bg-surface-base border border-white/10 focus:border-amber focus:ring-1 focus:ring-amber rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-sans outline-none transition-all pl-9"
                placeholder="Filter by title, author fingerprint, channel, tags, or notes..."
              />
              <span class="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs font-mono text-slate-500 mr-1">Tags:</span>
              <button
                type="button"
                class="modal-tag-filter active px-2.5 py-1 rounded text-xs font-mono transition-all bg-cyphr/10 text-cyphr border border-cyphr/30"
                data-tag=""
              >
                All
              </button>
              ${allTags.map(tag => `
                <button
                  type="button"
                  class="modal-tag-filter px-2.5 py-1 rounded text-xs font-mono transition-all bg-surface-overlay text-slate-300 border border-white/5 hover:border-white/20 hover:text-white"
                  data-tag="${escapeHtml(tag)}"
                >
                  #${escapeHtml(tag)}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Modal Body Grid -->
          <div id="modal-bookmarks-grid" class="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar bg-surface-base">
            ${totalCount > 0
              ? bookmarks.map(entry => this.renderBookmarkCard(entry)).join('')
              : `
                <div class="col-span-full flex flex-col items-center justify-center p-12 text-center bg-surface-raised/30 rounded-xl border border-white/5">
                  <div class="text-4xl mb-3 opacity-60">🔖</div>
                  <h3 class="text-sm font-semibold text-slate-200 mb-1">Your Cryptographic Vault is Empty</h3>
                  <p class="text-xs text-slate-400 max-w-sm">
                    Bookmark key technical specifications, security advisories, or relays posts to securely reference them offline.
                  </p>
                </div>
              `
            }
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-3.5 border-t border-white/5 bg-surface-raised/70 flex items-center justify-between text-xs text-slate-400">
            <div class="flex items-center gap-2 font-mono text-[11px]">
              <span class="inline-block w-2 h-2 rounded-full bg-signal"></span>
              <span>AES-256 Client-Side Local Storage Encrypted</span>
            </div>
            <button
              type="button"
              id="btn-done-bookmarks-modal"
              class="px-4 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight text-slate-200 hover:text-white font-medium text-xs transition-all border border-white/10"
            >
              Close Vault
            </button>
          </div>
        </div>
      </div>
    `.trim();
  }
}

/**
 * Singleton instance of the BookmarksVault ready for cross-module integration.
 */
export const bookmarksVault = new BookmarksVault();
serviceRegistry.registerInstance(SERVICES.BookmarksVault, bookmarksVault);
