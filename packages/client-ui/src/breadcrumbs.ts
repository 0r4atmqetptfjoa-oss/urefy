/**
 * @file breadcrumbs.ts
 * @package @aetheris/client-ui
 * @description Omni-Breadcrumbs & History Navigation Engine for Aetheris Omni-Sphere.
 * Provides hierarchical navigation trails, dual-direction history traversal (Back/Forward),
 * keyboard shortcuts (Alt+Left / Alt+Right), interactive Obsidian-styled path segments,
 * history stack flyout inspector, and Arc Browser-inspired pinned tabs bar with reactive badges.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';

// ─── Interfaces & Types ────────────────────────────────────────────────────────

/**
 * An individual breadcrumb segment along the navigation path.
 */
export interface BreadcrumbItem {
  label: string;
  icon?: string;
  actionType: 'hub' | 'channel' | 'post' | 'custom';
  targetId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Pinned navigation tab stored in the top Arc-style quick access bar.
 */
export interface PinnedTab {
  id: string;
  title: string;
  icon: string;
  channelId: string;
  badgeCount?: number;
  badgeType?: 'signal' | 'cyphr' | 'aether' | 'crimson' | 'amber';
  isPinned: boolean;
  color?: string;
  url?: string;
  lastVisitedAt?: number;
  spaceType?: 'relays' | 'vault' | 'pulse';
}

/**
 * Direction indicator for navigation events.
 */
export type NavigationDirection = 'back' | 'forward' | 'push' | 'jump' | 'tab' | 'reset';

/**
 * Callback listener for breadcrumb route changes.
 */
export type BreadcrumbListener = (
  item: BreadcrumbItem,
  trail: BreadcrumbItem[],
  direction: NavigationDirection
) => void;

/**
 * Snapshot of complete breadcrumb state for persistence and debugging.
 */
export interface BreadcrumbsState {
  historyStack: BreadcrumbItem[][];
  historyIndex: number;
  currentTrail: BreadcrumbItem[];
  pinnedTabs: PinnedTab[];
}

// ─── Pure Utility Functions ───────────────────────────────────────────────────

/**
 * Escapes unsafe characters for direct DOM string injection.
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
 * Formats relative time for history entries.
 */
function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── BreadcrumbsManager Class ─────────────────────────────────────────────────

/**
 * Omni-Breadcrumbs & History Navigation Manager.
 * Orchestrates breadcrumb trails, forward/backward stack traversal, keyboard listeners,
 * Arc pinned tabs bar, and live DOM rendering.
 */
export class BreadcrumbsManager {
  /** The navigation history stack containing trail snapshots. */
  public historyStack: BreadcrumbItem[][] = [];

  /** Pointer to the current active position in the history stack. */
  public historyIndex: number = -1;

  /** The currently active breadcrumb trail. */
  public currentTrail: BreadcrumbItem[] = [];

  /** Pinned quick-access tabs (Arc Browser style). */
  public pinnedTabs: PinnedTab[] = [];

  /** Maximum number of history snapshots retained in memory. */
  public maxHistoryLength: number = 50;

  /** Whether the full history stack dropdown popover is currently visible. */
  public isHistoryDropdownOpen: boolean = false;

  /** Set of registered navigation callbacks. */
  private navigationListeners: Set<BreadcrumbListener> = new Set();

  /** Bound keyboard event handler reference for cleanup. */
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  /** Bound DOM click event handler reference for cleanup. */
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  /** Flag indicating if global DOM event listeners are active. */
  private isInitialized: boolean = false;

  /** LocalStorage key for persisting history stack. */
  private readonly storageKeyHistory: string = 'aetheris_breadcrumbs_history_v1';

  /** LocalStorage key for persisting pinned tabs. */
  private readonly storageKeyPinned: string = 'aetheris_pinned_tabs_v1';

  // ─── Lifecycle & Initialization ─────────────────────────────────────────────

  constructor() {
    this.loadPinnedTabs();
    this.loadHistory();

    if (this.historyStack.length === 0 || this.currentTrail.length === 0) {
      this.initDefaultTrail();
    }

    if (typeof window !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        this.init();
      }
    }
  }

  /**
   * Initializes browser listeners and binds global instance.
   */
  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.setupGlobalKeybindings();
    this.setupDOMDelegation();

    if (typeof window !== 'undefined') {
      window.breadcrumbsManager = this;
    }
  }

  /**
   * Initializes a default starting breadcrumb trail if none exists.
   */
  private initDefaultTrail(): void {
    const defaultTrail: BreadcrumbItem[] = [
      {
        label: 'Omni-Hubs',
        icon: '🌐',
        actionType: 'hub',
        targetId: 'all'
      },
      {
        label: 'r/clean-releases',
        icon: '🛡️',
        actionType: 'channel',
        targetId: 'relays-general'
      }
    ];

    this.historyStack = [[...defaultTrail]];
    this.historyIndex = 0;
    this.currentTrail = [...defaultTrail];
    this.persistHistory();
  }

  /**
   * Seeds default pinned quick-access tabs if storage is empty.
   */
  private initDefaultPinnedTabs(): void {
    this.pinnedTabs = [
      {
        id: 'pin-relays-general',
        title: 'r/clean-releases',
        icon: '🛡️',
        channelId: 'relays-general',
        badgeCount: 3,
        badgeType: 'signal',
        isPinned: true,
        spaceType: 'relays'
      },
      {
        id: 'pin-zero-day',
        title: 'r/zero-day-feed',
        icon: '⚡',
        channelId: 'relays-zero-day',
        badgeCount: 1,
        badgeType: 'crimson',
        isPinned: true,
        spaceType: 'vault'
      },
      {
        id: 'pin-crypto-core',
        title: 'r/cryptography',
        icon: '🧬',
        channelId: 'relays-crypto',
        badgeCount: 5,
        badgeType: 'aether',
        isPinned: true,
        spaceType: 'relays'
      },
      {
        id: 'pin-pulse-lobby',
        title: 'r/pulse-lobby',
        icon: '📡',
        channelId: 'pulse-general',
        badgeCount: 12,
        badgeType: 'cyphr',
        isPinned: true,
        spaceType: 'pulse'
      },
      {
        id: 'pin-zk-vault',
        title: 'r/zk-discussions',
        icon: '🔒',
        channelId: 'vault-zk',
        badgeCount: 0,
        badgeType: 'signal',
        isPinned: true,
        spaceType: 'vault'
      }
    ];
    this.persistPinnedTabs();
  }

  // ─── Stack & Trail Navigation ───────────────────────────────────────────────

  /**
   * Pushes a new breadcrumb trail to the history stack, truncating any forward history.
   *
   * @param trail The new sequence of breadcrumb segments.
   */
  public pushTrail(trail: BreadcrumbItem[]): void {
    if (!trail || trail.length === 0) return;

    // Check if the new trail is identical to current trail to avoid redundant stack items
    if (this.currentTrail.length > 0 && this.areTrailsEqual(this.currentTrail, trail)) {
      return;
    }

    // Truncate forward history if we navigated back previously
    if (this.historyIndex >= 0 && this.historyIndex < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    }

    // Clone trail defensively
    const trailCopy = trail.map(item => ({ ...item }));
    this.historyStack.push(trailCopy);

    // Limit history stack depth
    if (this.historyStack.length > this.maxHistoryLength) {
      this.historyStack.shift();
    }

    this.historyIndex = this.historyStack.length - 1;
    this.currentTrail = trailCopy;

    this.persistHistory();
    this.notifyListeners(this.getCurrentItem()!, this.currentTrail, 'push');
    this.syncDOM();
  }

  /**
   * Appends an individual breadcrumb segment to the current trail and commits it to history.
   *
   * @param item The breadcrumb item to append.
   */
  public pushItem(item: BreadcrumbItem): void {
    const newTrail = [...this.currentTrail, { ...item }];
    this.pushTrail(newTrail);
  }

  /**
   * Pops the topmost segment from current trail and navigates back if more than 1 item remains.
   */
  public popTrail(): BreadcrumbItem[] {
    if (this.currentTrail.length <= 1) {
      return this.currentTrail;
    }
    const newTrail = this.currentTrail.slice(0, -1);
    this.pushTrail(newTrail);
    return this.currentTrail;
  }

  /**
   * Sets the current trail without pushing a duplicate state if identical.
   */
  public setTrail(trail: BreadcrumbItem[]): void {
    this.pushTrail(trail);
  }

  /**
   * Replaces the current history frame trail in place without altering the stack size.
   */
  public replaceCurrentTrail(trail: BreadcrumbItem[]): void {
    if (!trail || trail.length === 0) return;
    const trailCopy = trail.map(item => ({ ...item }));
    this.currentTrail = trailCopy;

    if (this.historyIndex >= 0 && this.historyIndex < this.historyStack.length) {
      this.historyStack[this.historyIndex] = trailCopy;
    } else {
      this.historyStack = [trailCopy];
      this.historyIndex = 0;
    }

    this.persistHistory();
    this.notifyListeners(this.getCurrentItem()!, this.currentTrail, 'reset');
    this.syncDOM();
  }

  /**
   * Navigates backward one step in the history stack.
   *
   * @returns true if backward navigation succeeded; false if at start of history.
   */
  public goBack(): boolean {
    if (!this.canGoBack()) {
      return false;
    }

    this.historyIndex--;
    this.currentTrail = [...this.historyStack[this.historyIndex]];
    this.persistHistory();

    const activeItem = this.getCurrentItem();
    if (activeItem) {
      this.notifyListeners(activeItem, this.currentTrail, 'back');
      this.executeAction(activeItem);
    }

    this.syncDOM();
    return true;
  }

  /**
   * Navigates forward one step in the history stack.
   *
   * @returns true if forward navigation succeeded; false if at head of history.
   */
  public goForward(): boolean {
    if (!this.canGoForward()) {
      return false;
    }

    this.historyIndex++;
    this.currentTrail = [...this.historyStack[this.historyIndex]];
    this.persistHistory();

    const activeItem = this.getCurrentItem();
    if (activeItem) {
      this.notifyListeners(activeItem, this.currentTrail, 'forward');
      this.executeAction(activeItem);
    }

    this.syncDOM();
    return true;
  }

  /**
   * Checks whether backward history navigation is available.
   */
  public canGoBack(): boolean {
    return this.historyIndex > 0 && this.historyStack.length > 1;
  }

  /**
   * Checks whether forward history navigation is available.
   */
  public canGoForward(): boolean {
    return this.historyIndex >= 0 && this.historyIndex < this.historyStack.length - 1;
  }

  /**
   * Jumps directly to a specific index within the history stack.
   *
   * @param index Target zero-based history stack index.
   */
  public goToHistoryIndex(index: number): boolean {
    if (index < 0 || index >= this.historyStack.length || index === this.historyIndex) {
      return false;
    }

    this.historyIndex = index;
    this.currentTrail = [...this.historyStack[this.historyIndex]];
    this.isHistoryDropdownOpen = false;
    this.persistHistory();

    const activeItem = this.getCurrentItem();
    if (activeItem) {
      this.notifyListeners(activeItem, this.currentTrail, 'jump');
      this.executeAction(activeItem);
    }

    this.syncDOM();
    return true;
  }

  /**
   * Clears the history stack and resets to the default trail.
   */
  public clearHistory(): void {
    this.initDefaultTrail();
    this.isHistoryDropdownOpen = false;
    this.notifyListeners(this.getCurrentItem()!, this.currentTrail, 'reset');
    this.syncDOM();
  }

  /**
   * Returns a copy of the current active trail.
   */
  public getCurrentTrail(): BreadcrumbItem[] {
    return [...this.currentTrail];
  }

  /**
   * Returns the leaf (active) breadcrumb item of the current trail, or null if empty.
   */
  public getCurrentItem(): BreadcrumbItem | null {
    if (this.currentTrail.length === 0) return null;
    return { ...this.currentTrail[this.currentTrail.length - 1] };
  }

  /**
   * Returns a deep copy of the full history stack.
   */
  public getHistory(): BreadcrumbItem[][] {
    return this.historyStack.map(trail => trail.map(item => ({ ...item })));
  }

  /**
   * Returns the current history index pointer.
   */
  public getHistoryIndex(): number {
    return this.historyIndex;
  }

  // ─── Segment Interaction & Routing ──────────────────────────────────────────

  /**
   * Handles clicking on a specific breadcrumb segment index in the current trail.
   * Slices the trail up to that segment and pushes the resulting trail.
   *
   * @param index The 0-based index of the clicked breadcrumb segment.
   */
  public navigateToSegment(index: number): void {
    if (index < 0 || index >= this.currentTrail.length) return;

    // If clicking on the active leaf, trigger refresh action
    if (index === this.currentTrail.length - 1) {
      const activeItem = this.currentTrail[index];
      this.executeAction(activeItem);
      this.notifyListeners(activeItem, this.currentTrail, 'jump');
      return;
    }

    const newTrail = this.currentTrail.slice(0, index + 1);
    const targetItem = newTrail[newTrail.length - 1];

    this.pushTrail(newTrail);
    this.executeAction(targetItem);
  }

  /**
   * Navigates directly to a specified item by creating a trail or finding it.
   */
  public navigateToItem(item: BreadcrumbItem, direction: NavigationDirection = 'jump'): void {
    this.pushItem(item);
    this.executeAction(item);
    this.notifyListeners(item, this.currentTrail, direction);
  }

  /**
   * Dispatches internal browser custom events and invokes registered listeners.
   */
  private executeAction(item: BreadcrumbItem): void {
    if (typeof window === 'undefined') return;

    // Dispatch global custom event for application components to catch
    const event = new CustomEvent('aetheris:navigate-action', {
      bubbles: true,
      composed: true,
      detail: {
        item,
        trail: this.currentTrail,
        historyIndex: this.historyIndex
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Registers a listener callback invoked whenever navigation occurs.
   *
   * @returns Unsubscribe function.
   */
  public onNavigate(callback: BreadcrumbListener): () => void {
    this.navigationListeners.add(callback);
    return () => {
      this.navigationListeners.delete(callback);
    };
  }

  /**
   * Notifies all registered listeners and emits standard custom events.
   */
  private notifyListeners(
    item: BreadcrumbItem,
    trail: BreadcrumbItem[],
    direction: NavigationDirection
  ): void {
    for (const listener of this.navigationListeners) {
      try {
        listener(item, trail, direction);
      } catch (err) {
        console.error('[BreadcrumbsManager] Listener invocation failed:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aetheris:breadcrumb-change', {
          bubbles: true,
          detail: {
            item,
            trail,
            direction,
            historyIndex: this.historyIndex,
            canGoBack: this.canGoBack(),
            canGoForward: this.canGoForward()
          }
        })
      );
    }
  }

  /**
   * Copies the current breadcrumb path string to the system clipboard.
   *
   * @returns Promise resolving to true if copied successfully.
   */
  public async copyCurrentPath(): Promise<boolean> {
    if (this.currentTrail.length === 0) return false;

    const pathText = this.currentTrail
      .map(item => `${item.icon ? item.icon + ' ' : ''}${item.label}`)
      .join(' › ');

    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pathText);
        this.showToastFeedback('Path copied to clipboard');
        return true;
      }
    } catch (err) {
      console.warn('[BreadcrumbsManager] Clipboard API failed:', err);
    }
    return false;
  }

  /**
   * Displays temporary feedback notification if toast manager or DOM allows.
   */
  private showToastFeedback(message: string): void {
    if (typeof window === 'undefined') return;

    const toast = document.createElement('div');
    toast.className =
      'fixed bottom-6 right-6 z-50 px-4 py-2 bg-surface-overlay text-cyphr border border-cyphr/40 shadow-[0_0_16px_rgba(0,229,255,0.25)] rounded-lg font-mono text-xs animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none flex items-center gap-2';
    toast.innerHTML = `<span>📋</span><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ─── Pinned Tabs Management (Arc Browser Style) ──────────────────────────────

  /**
   * Adds or activates a pinned tab in the top Arc-style bar.
   *
   * @param tab The tab configuration to pin.
   */
  public addPinnedTab(tab: PinnedTab): void {
    const existingIndex = this.pinnedTabs.findIndex(
      t => t.id === tab.id || t.channelId === tab.channelId
    );

    if (existingIndex >= 0) {
      this.pinnedTabs[existingIndex] = {
        ...this.pinnedTabs[existingIndex],
        ...tab,
        isPinned: true,
        lastVisitedAt: Date.now()
      };
    } else {
      this.pinnedTabs.push({
        ...tab,
        isPinned: true,
        lastVisitedAt: Date.now()
      });
    }

    this.persistPinnedTabs();
    this.syncDOM();
  }

  /**
   * Removes a pinned tab from the quick access bar.
   *
   * @param tabId Identifier of the pinned tab.
   */
  public removePinnedTab(tabId: string): void {
    this.pinnedTabs = this.pinnedTabs.filter(t => t.id !== tabId);
    this.persistPinnedTabs();
    this.syncDOM();
  }

  /**
   * Toggles the pinned status of a tab.
   */
  public togglePinTab(tabId: string): void {
    const tab = this.pinnedTabs.find(t => t.id === tabId);
    if (tab) {
      this.removePinnedTab(tabId);
    }
  }

  /**
   * Returns all current pinned tabs.
   */
  public getPinnedTabs(): PinnedTab[] {
    return this.pinnedTabs.map(t => ({ ...t }));
  }

  /**
   * Sets the full list of pinned tabs.
   */
  public setPinnedTabs(tabs: PinnedTab[]): void {
    this.pinnedTabs = tabs.map(t => ({ ...t }));
    this.persistPinnedTabs();
    this.syncDOM();
  }

  /**
   * Updates the unread badge count and theme color for a pinned tab.
   *
   * @param tabId Pinned tab identifier or channel ID.
   * @param count Numeric badge count.
   * @param type Color theme category for the badge pill.
   */
  public updateTabBadge(
    tabId: string,
    count: number,
    type: PinnedTab['badgeType'] = 'signal'
  ): void {
    const tab = this.pinnedTabs.find(t => t.id === tabId || t.channelId === tabId);
    if (tab) {
      tab.badgeCount = Math.max(0, count);
      tab.badgeType = type;
      this.persistPinnedTabs();
      this.syncDOM();
    }
  }

  /**
   * Pins the current breadcrumb trail as a tab in the Arc pinned bar.
   */
  public pinCurrentTrail(): void {
    const currentItem = this.getCurrentItem();
    if (!currentItem) return;

    const newTab: PinnedTab = {
      id: `pin-${currentItem.targetId || Date.now()}`,
      title: currentItem.label,
      icon: currentItem.icon || '📌',
      channelId: currentItem.targetId,
      badgeCount: 0,
      badgeType: 'cyphr',
      isPinned: true,
      lastVisitedAt: Date.now()
    };

    this.addPinnedTab(newTab);
    this.showToastFeedback(`Pinned "${currentItem.label}" to tabs`);
  }

  /**
   * Navigates to the channel or target represented by a pinned tab.
   */
  public navigateToTab(tabId: string): void {
    const tab = this.pinnedTabs.find(t => t.id === tabId || t.channelId === tabId);
    if (!tab) return;

    tab.lastVisitedAt = Date.now();
    this.persistPinnedTabs();

    const newTrail: BreadcrumbItem[] = [
      {
        label: 'Omni-Hubs',
        icon: '🌐',
        actionType: 'hub',
        targetId: 'all'
      },
      {
        label: tab.title,
        icon: tab.icon,
        actionType: 'channel',
        targetId: tab.channelId
      }
    ];

    this.pushTrail(newTrail);
    this.executeAction(newTrail[newTrail.length - 1]);
  }

  // ─── Dropdown State & History Popover ───────────────────────────────────────

  /**
   * Toggles visibility of the history stack inspector dropdown.
   */
  public toggleHistoryDropdown(): void {
    this.isHistoryDropdownOpen = !this.isHistoryDropdownOpen;
    this.syncDOM();
  }

  /**
   * Closes the history stack dropdown if open.
   */
  public closeHistoryDropdown(): void {
    if (this.isHistoryDropdownOpen) {
      this.isHistoryDropdownOpen = false;
      this.syncDOM();
    }
  }

  /**
   * Opens the history stack dropdown.
   */
  public openHistoryDropdown(): void {
    if (!this.isHistoryDropdownOpen) {
      this.isHistoryDropdownOpen = true;
      this.syncDOM();
    }
  }

  // ─── Rendering Engine: Breadcrumbs Bar ──────────────────────────────────────

  /**
   * Renders the Obsidian-styled breadcrumbs bar HTML string.
   * Includes Back/Forward history buttons, live trail segments with hover glow,
   * copy path button, pin view button, and embedded history stack popover.
   */
  public renderBreadcrumbsBar(): string {
    const canBack = this.canGoBack();
    const canFwd = this.canGoForward();
    const trail = this.currentTrail;

    return `
      <div id="omni-breadcrumbs-bar" class="w-full bg-surface-base/95 backdrop-blur-md border-b border-white/5 px-3 py-1.5 flex items-center justify-between gap-3 text-xs select-none relative z-20">
        
        <!-- Left: Navigation Control Group (Back / Forward / History Stack) -->
        <div class="flex items-center space-x-1 shrink-0">
          
          <!-- Back Button (Alt+Left) -->
          <button
            type="button"
            class="btn-breadcrumb-nav-back ${canBack
              ? 'flex items-center justify-center w-7 h-7 rounded-md bg-surface-raised hover:bg-surface-overlay text-cyphr border border-white/10 hover:border-cyphr/50 hover:shadow-[0_0_10px_rgba(0,229,255,0.2)] active:scale-95 transition-all duration-150 cursor-pointer group'
              : 'flex items-center justify-center w-7 h-7 rounded-md bg-surface-raised/30 text-slate-600 border border-white/5 cursor-not-allowed opacity-40'
            }"
            ${!canBack ? 'disabled' : ''}
            title="Go Back (Alt+Left)"
            data-action="back"
          >
            <span class="font-mono text-xs group-hover:-translate-x-0.5 transition-transform">←</span>
          </button>

          <!-- Forward Button (Alt+Right) -->
          <button
            type="button"
            class="btn-breadcrumb-nav-forward ${canFwd
              ? 'flex items-center justify-center w-7 h-7 rounded-md bg-surface-raised hover:bg-surface-overlay text-cyphr border border-white/10 hover:border-cyphr/50 hover:shadow-[0_0_10px_rgba(0,229,255,0.2)] active:scale-95 transition-all duration-150 cursor-pointer group'
              : 'flex items-center justify-center w-7 h-7 rounded-md bg-surface-raised/30 text-slate-600 border border-white/5 cursor-not-allowed opacity-40'
            }"
            ${!canFwd ? 'disabled' : ''}
            title="Go Forward (Alt+Right)"
            data-action="forward"
          >
            <span class="font-mono text-xs group-hover:translate-x-0.5 transition-transform">→</span>
          </button>

          <!-- History Stack Counter & Toggle Button -->
          <button
            type="button"
            class="btn-breadcrumb-history-toggle flex items-center gap-1.5 px-2 h-7 rounded-md bg-surface-raised hover:bg-surface-overlay ${this.isHistoryDropdownOpen ? 'border-cyphr/60 bg-surface-overlay text-cyphr shadow-[0_0_8px_rgba(0,229,255,0.2)]' : 'border-white/10 text-slate-400 hover:text-cyphr'} border text-[11px] font-mono transition-all duration-150 cursor-pointer"
            title="History Stack (Alt+H) — ${this.historyIndex + 1} of ${this.historyStack.length}"
            data-action="toggle-history"
          >
            <span class="text-xs">🕒</span>
            <span class="font-mono text-[10px] text-slate-300">${this.historyIndex + 1}/${this.historyStack.length}</span>
          </button>
        </div>

        <!-- Center: Interactive Breadcrumb Path Segments -->
        <nav aria-label="Breadcrumbs" class="flex-1 flex items-center space-x-1.5 overflow-x-auto no-scrollbar min-w-0 py-0.5">
          ${trail.map((item, idx) => {
            const isLast = idx === trail.length - 1;
            const isFirst = idx === 0;

            return `
              ${!isFirst ? `<span class="text-slate-600 text-xs font-mono select-none shrink-0 px-0.5">›</span>` : ''}

              ${isLast
                ? `
                  <!-- Active Leaf Segment -->
                  <span
                    class="breadcrumb-item-active flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-overlay border border-cyphr/40 shadow-[0_0_12px_rgba(0,229,255,0.15)] text-white font-mono text-xs font-semibold shrink-0 cursor-default select-none group"
                    data-crumb-index="${idx}"
                    data-target-id="${escapeHtml(item.targetId)}"
                    data-action-type="${escapeHtml(item.actionType)}"
                    title="${escapeHtml(item.label)} (Current View)"
                  >
                    ${item.icon ? `<span class="text-sm shrink-0">${item.icon}</span>` : ''}
                    <span class="truncate max-w-[240px] tracking-wide">${escapeHtml(item.label)}</span>
                    <span class="w-1.5 h-1.5 rounded-full bg-cyphr animate-pulse shrink-0"></span>
                  </span>
                `
                : `
                  <!-- Interactive Ancestor Segment -->
                  <button
                    type="button"
                    class="breadcrumb-item-btn flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-raised/50 hover:bg-surface-overlay border border-transparent hover:border-cyphr/30 hover:shadow-[0_0_8px_rgba(0,229,255,0.15)] text-slate-400 hover:text-cyphr font-mono text-xs font-medium transition-all duration-150 cursor-pointer shrink-0 group select-none"
                    data-crumb-index="${idx}"
                    data-target-id="${escapeHtml(item.targetId)}"
                    data-action-type="${escapeHtml(item.actionType)}"
                    title="Navigate to ${escapeHtml(item.label)}"
                  >
                    ${item.icon ? `<span class="text-sm opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-all duration-150 shrink-0">${item.icon}</span>` : ''}
                    <span class="truncate max-w-[180px] group-hover:underline underline-offset-2">${escapeHtml(item.label)}</span>
                  </button>
                `
              }
            `;
          }).join('')}
        </nav>

        <!-- Right: Utility Actions (Copy Path, Pin View) -->
        <div class="flex items-center space-x-1.5 shrink-0">
          
          <!-- Copy Breadcrumb Path -->
          <button
            type="button"
            class="btn-breadcrumb-copy-path flex items-center gap-1 px-2 h-7 rounded-md bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-cyphr border border-white/10 hover:border-cyphr/40 text-[11px] font-mono transition-all duration-150 cursor-pointer shrink-0"
            title="Copy path to clipboard"
            data-action="copy-path"
          >
            <span>📋</span>
            <span class="hidden sm:inline">Copy</span>
          </button>

          <!-- Pin Current Trail to Arc Tabs -->
          <button
            type="button"
            class="btn-breadcrumb-pin-view flex items-center gap-1 px-2 h-7 rounded-md bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-amber border border-white/10 hover:border-amber/40 text-[11px] font-mono transition-all duration-150 cursor-pointer shrink-0"
            title="Pin current location to quick tabs"
            data-action="pin-current"
          >
            <span>📌</span>
            <span class="hidden sm:inline">Pin</span>
          </button>
        </div>

        <!-- Floating History Stack Popover -->
        ${this.isHistoryDropdownOpen ? this.renderHistoryDropdown() : ''}
      </div>
    `.trim();
  }

  // ─── Rendering Engine: Arc Browser Pinned Tabs ──────────────────────────────

  /**
   * Renders the top Arc Browser-style pinned tabs bar HTML string.
   *
   * @param activeChannelId The channel ID currently active in client view.
   */
  public renderPinnedTabs(activeChannelId: string): string {
    const tabs = this.pinnedTabs;

    return `
      <div id="arc-pinned-tabs-bar" class="w-full bg-surface-base border-b border-white/5 px-3 py-1 flex items-center justify-between gap-2 text-xs select-none z-10">
        
        <!-- Pinned Tabs List -->
        <div class="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          
          <!-- Pinned Tag Label -->
          <div class="flex items-center space-x-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold shrink-0">
            <span class="text-cyphr">◆</span>
            <span class="hidden sm:inline">PINNED</span>
          </div>

          <!-- Pinned Tab Items -->
          ${tabs.map(tab => {
            const isActive = tab.channelId === activeChannelId || tab.id === activeChannelId;
            const hasBadge = typeof tab.badgeCount === 'number' && tab.badgeCount > 0;

            // Resolve badge color class
            let badgeClass = 'bg-surface-overlay text-slate-300 border-white/10';
            if (tab.badgeType === 'signal') {
              badgeClass = 'bg-signal/20 text-signal border-signal/40 shadow-[0_0_6px_rgba(34,197,94,0.3)]';
            } else if (tab.badgeType === 'cyphr') {
              badgeClass = 'bg-cyphr/20 text-cyphr border-cyphr/40 shadow-[0_0_6px_rgba(0,229,255,0.3)]';
            } else if (tab.badgeType === 'aether') {
              badgeClass = 'bg-aether/20 text-aether border-aether/40 shadow-[0_0_6px_rgba(168,85,247,0.3)]';
            } else if (tab.badgeType === 'crimson') {
              badgeClass = 'bg-crimson/20 text-crimson border-crimson/40 shadow-[0_0_6px_rgba(239,68,68,0.3)]';
            } else if (tab.badgeType === 'amber') {
              badgeClass = 'bg-amber/20 text-amber border-amber/40 shadow-[0_0_6px_rgba(245,158,11,0.3)]';
            }

            return `
              <div
                class="pinned-tab-item flex items-center space-x-2 px-3 py-1 rounded-lg text-xs font-mono border transition-all duration-150 cursor-pointer group shrink-0 ${
                  isActive
                    ? 'bg-surface-overlay text-cyphr border-cyphr/50 shadow-[0_0_12px_rgba(0,229,255,0.2)] font-semibold'
                    : 'bg-surface-raised/60 hover:bg-surface-overlay text-slate-400 hover:text-slate-200 border-white/5 hover:border-white/20'
                }"
                data-tab-id="${tab.id}"
                data-channel-id="${tab.channelId}"
                title="${escapeHtml(tab.title)}"
              >
                <!-- Tab Icon -->
                <span class="text-sm group-hover:scale-110 transition-transform">${tab.icon || '📌'}</span>
                
                <!-- Tab Title -->
                <span class="truncate max-w-[120px]">${escapeHtml(tab.title)}</span>

                <!-- Unread / Activity Badge -->
                ${hasBadge
                  ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold border ${badgeClass}">${tab.badgeCount}</span>`
                  : ''
                }

                <!-- Unpin / Close Trigger Button -->
                <button
                  type="button"
                  class="tab-unpin-trigger ml-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] text-slate-500 hover:text-crimson hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-tab-id="${tab.id}"
                  title="Unpin tab"
                >
                  ×
                </button>
              </div>
            `;
          }).join('')}

          <!-- Add Quick Pin Button -->
          <button
            type="button"
            class="btn-pin-new-tab flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-raised/40 hover:bg-surface-overlay text-slate-500 hover:text-cyphr border border-dashed border-white/10 hover:border-cyphr/40 text-[11px] font-mono transition-all duration-150 cursor-pointer shrink-0"
            title="Pin current view"
            data-action="pin-current"
          >
            <span class="text-xs font-bold">+</span>
            <span class="hidden md:inline">Add Pin</span>
          </button>
        </div>

        <!-- Right Quick Counter -->
        <div class="flex items-center text-[10px] font-mono text-slate-500 shrink-0">
          <span>${tabs.length} tabs</span>
        </div>
      </div>
    `.trim();
  }

  // ─── Rendering Engine: History Stack Popover ────────────────────────────────

  /**
   * Renders the flyout dropdown inspector for traversing the full history stack.
   */
  public renderHistoryDropdown(): string {
    const stack = this.historyStack;
    const currentIndex = this.historyIndex;

    return `
      <div
        id="breadcrumbs-history-popover"
        class="absolute left-3 top-10 w-96 max-h-96 bg-surface-raised border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl flex flex-col z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <!-- Popover Header -->
        <div class="px-3.5 py-2.5 bg-surface-overlay border-b border-white/5 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-cyphr font-bold text-xs">🧭</span>
            <span class="font-mono text-xs font-semibold text-slate-200">Navigation History Stack</span>
            <span class="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono text-slate-400">${stack.length} steps</span>
          </div>
          <button
            type="button"
            class="btn-close-history-popover text-slate-400 hover:text-white text-xs font-mono p-1 rounded hover:bg-white/5 transition-all"
            data-action="close-history"
          >
            ✕
          </button>
        </div>

        <!-- History Stack Scrollable List -->
        <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-72">
          ${stack.map((trail, idx) => {
            const isCurrent = idx === currentIndex;
            const isFuture = idx > currentIndex;
            const itemLabel = trail.map(t => `${t.icon ? t.icon + ' ' : ''}${t.label}`).join(' › ');

            return `
              <div
                class="history-jump-entry flex items-center justify-between p-2 rounded-lg text-xs font-mono cursor-pointer transition-all duration-150 border ${
                  isCurrent
                    ? 'bg-surface-overlay text-cyphr border-cyphr/40 shadow-[0_0_10px_rgba(0,229,255,0.15)] font-semibold'
                    : isFuture
                      ? 'bg-surface-base/40 text-slate-500 border-white/5 hover:bg-surface-overlay/60 hover:text-slate-300'
                      : 'bg-surface-base/70 text-slate-300 border-white/5 hover:bg-surface-overlay hover:text-white'
                }"
                data-history-idx="${idx}"
                title="Jump to step #${idx + 1}"
              >
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <!-- Index Number Badge -->
                  <span class="px-1.5 py-0.5 rounded text-[10px] ${
                    isCurrent
                      ? 'bg-cyphr/20 text-cyphr font-bold'
                      : 'bg-white/5 text-slate-500'
                  }">
                    #${idx + 1}
                  </span>

                  <!-- Trail String Preview -->
                  <span class="truncate text-[11px]">${escapeHtml(itemLabel)}</span>
                </div>

                <!-- Current Indicator -->
                ${isCurrent
                  ? `<span class="ml-2 px-1.5 py-0.2 rounded-full text-[9px] font-mono uppercase bg-cyphr text-canvas font-bold shrink-0">Current</span>`
                  : `<span class="text-[10px] text-slate-600 font-mono shrink-0">${idx < currentIndex ? 'Past' : 'Forward'}</span>`
                }
              </div>
            `;
          }).join('')}
        </div>

        <!-- Popover Footer -->
        <div class="px-3.5 py-2 bg-surface-overlay/80 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div class="flex items-center gap-2">
            <span>Alt+←</span>
            <span>/</span>
            <span>Alt+→</span>
          </div>
          <button
            type="button"
            class="btn-clear-history-stack text-crimson hover:text-crimson/80 hover:underline cursor-pointer"
            data-action="clear-history"
          >
            Clear History
          </button>
        </div>
      </div>
    `.trim();
  }

  // ─── Combined Header Component ───────────────────────────────────────────────

  /**
   * Renders the complete omni-navigation header uniting pinned tabs and breadcrumbs.
   *
   * @param activeChannelId The active channel identifier.
   */
  public renderCompleteNavHeader(activeChannelId: string): string {
    return `
      <div class="omni-nav-composite-header w-full flex flex-col shrink-0">
        ${this.renderPinnedTabs(activeChannelId)}
        ${this.renderBreadcrumbsBar()}
      </div>
    `.trim();
  }

  /**
   * Renders a ultra-compact inline trail suitable for embed cards or modals.
   */
  public renderCompactBar(): string {
    const trail = this.currentTrail;
    return `
      <div class="flex items-center space-x-1 text-[11px] font-mono text-slate-400 overflow-x-auto no-scrollbar">
        ${trail.map((item, idx) => `
          ${idx > 0 ? `<span class="text-slate-600">›</span>` : ''}
          <span class="${idx === trail.length - 1 ? 'text-cyphr font-medium' : 'hover:text-white cursor-pointer'}" data-crumb-index="${idx}">
            ${item.icon ? `<span class="mr-1">${item.icon}</span>` : ''}${escapeHtml(item.label)}
          </span>
        `).join('')}
      </div>
    `.trim();
  }

  // ─── DOM Event Listeners & Delegation ───────────────────────────────────────

  /**
   * Sets up global keyboard shortcuts: Alt+Left, Alt+Right, Alt+H, Escape.
   */
  private setupGlobalKeybindings(): void {
    if (typeof window === 'undefined') return;

    this.keydownHandler = (e: KeyboardEvent) => {
      // Ignore keybindings when user is typing in form inputs
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Alt + ArrowLeft / Alt + Left -> Go Back
      if (e.altKey && (e.key === 'ArrowLeft' || e.code === 'ArrowLeft')) {
        e.preventDefault();
        this.goBack();
        return;
      }

      // Alt + ArrowRight / Alt + Right -> Go Forward
      if (e.altKey && (e.key === 'ArrowRight' || e.code === 'ArrowRight')) {
        e.preventDefault();
        this.goForward();
        return;
      }

      // Ctrl + [ -> Go Back (macOS / Vim shortcut)
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        this.goBack();
        return;
      }

      // Ctrl + ] -> Go Forward (macOS / Vim shortcut)
      if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        this.goForward();
        return;
      }

      // Alt + H -> Toggle History Stack
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        this.toggleHistoryDropdown();
        return;
      }

      // Escape -> Close History Stack Popover
      if (e.key === 'Escape' && this.isHistoryDropdownOpen) {
        e.preventDefault();
        this.closeHistoryDropdown();
        return;
      }

      // Alt + 1..9 -> Jump to Pinned Tab index
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        const tabIdx = parseInt(e.key, 10) - 1;
        if (tabIdx < this.pinnedTabs.length) {
          e.preventDefault();
          this.navigateToTab(this.pinnedTabs[tabIdx].id);
        }
      }
    };

    window.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * Attaches event delegation listeners to the document body for UI clicks.
   */
  private setupDOMDelegation(): void {
    if (typeof document === 'undefined') return;

    this.clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // 1. Breadcrumb segment button click
      const segmentBtn = target.closest<HTMLElement>('.breadcrumb-item-btn, [data-crumb-index]');
      if (segmentBtn && !target.closest('.tab-unpin-trigger')) {
        const idxStr = segmentBtn.getAttribute('data-crumb-index');
        if (idxStr !== null) {
          const idx = parseInt(idxStr, 10);
          if (!isNaN(idx)) {
            e.preventDefault();
            this.navigateToSegment(idx);
            return;
          }
        }
      }

      // 2. Back button click
      const backBtn = target.closest<HTMLElement>('[data-action="back"], .btn-breadcrumb-nav-back');
      if (backBtn) {
        e.preventDefault();
        this.goBack();
        return;
      }

      // 3. Forward button click
      const fwdBtn = target.closest<HTMLElement>('[data-action="forward"], .btn-breadcrumb-nav-forward');
      if (fwdBtn) {
        e.preventDefault();
        this.goForward();
        return;
      }

      // 4. Toggle history popover button
      const toggleHistoryBtn = target.closest<HTMLElement>('[data-action="toggle-history"], .btn-breadcrumb-history-toggle');
      if (toggleHistoryBtn) {
        e.preventDefault();
        this.toggleHistoryDropdown();
        return;
      }

      // 5. Close history popover button
      const closeHistoryBtn = target.closest<HTMLElement>('[data-action="close-history"], .btn-close-history-popover');
      if (closeHistoryBtn) {
        e.preventDefault();
        this.closeHistoryDropdown();
        return;
      }

      // 6. Jump to specific history entry click
      const historyEntry = target.closest<HTMLElement>('.history-jump-entry, [data-history-idx]');
      if (historyEntry) {
        const histIdxStr = historyEntry.getAttribute('data-history-idx');
        if (histIdxStr !== null) {
          const histIdx = parseInt(histIdxStr, 10);
          if (!isNaN(histIdx)) {
            e.preventDefault();
            this.goToHistoryIndex(histIdx);
            return;
          }
        }
      }

      // 7. Clear history button click
      const clearHistoryBtn = target.closest<HTMLElement>('[data-action="clear-history"], .btn-clear-history-stack');
      if (clearHistoryBtn) {
        e.preventDefault();
        this.clearHistory();
        return;
      }

      // 8. Copy path button click
      const copyBtn = target.closest<HTMLElement>('[data-action="copy-path"], .btn-breadcrumb-copy-path');
      if (copyBtn) {
        e.preventDefault();
        this.copyCurrentPath();
        return;
      }

      // 9. Pin view button click
      const pinBtn = target.closest<HTMLElement>('[data-action="pin-current"], .btn-breadcrumb-pin-view, .btn-pin-new-tab');
      if (pinBtn) {
        e.preventDefault();
        this.pinCurrentTrail();
        return;
      }

      // 10. Pinned tab unpin button click
      const unpinBtn = target.closest<HTMLElement>('.tab-unpin-trigger, [data-tab-id]');
      if (unpinBtn && target.classList.contains('tab-unpin-trigger')) {
        e.preventDefault();
        e.stopPropagation();
        const tabId = unpinBtn.getAttribute('data-tab-id');
        if (tabId) {
          this.removePinnedTab(tabId);
        }
        return;
      }

      // 11. Pinned tab click
      const tabItem = target.closest<HTMLElement>('.pinned-tab-item, [data-tab-id]');
      if (tabItem && !target.classList.contains('tab-unpin-trigger')) {
        const tabId = tabItem.getAttribute('data-tab-id');
        if (tabId) {
          e.preventDefault();
          this.navigateToTab(tabId);
          return;
        }
      }

      // 12. Click outside popover to close it
      if (
        this.isHistoryDropdownOpen &&
        !target.closest('#breadcrumbs-history-popover') &&
        !target.closest('[data-action="toggle-history"]')
      ) {
        this.closeHistoryDropdown();
      }
    };

    document.addEventListener('click', this.clickHandler);
  }

  /**
   * Synchronizes rendered DOM elements if mounted in the document.
   */
  public syncDOM(): void {
    if (typeof document === 'undefined') return;

    // Update breadcrumbs bar if it exists in DOM
    const barEl = document.getElementById('omni-breadcrumbs-bar');
    if (barEl) {
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = this.renderBreadcrumbsBar();
      const newEl = tempContainer.firstElementChild;
      if (newEl && barEl.parentNode) {
        barEl.parentNode.replaceChild(newEl, barEl);
      }
    }

    // Update pinned tabs bar if it exists in DOM
    const pinnedEl = document.getElementById('arc-pinned-tabs-bar');
    if (pinnedEl) {
      const activeChannel = this.getCurrentItem()?.targetId || '';
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = this.renderPinnedTabs(activeChannel);
      const newPinned = tempContainer.firstElementChild;
      if (newPinned && pinnedEl.parentNode) {
        pinnedEl.parentNode.replaceChild(newPinned, pinnedEl);
      }
    }
  }

  // ─── Storage Persistence ───────────────────────────────────────────────────

  /**
   * Saves the history stack to local storage.
   */
  private persistHistory(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      const payload = {
        stack: this.historyStack,
        index: this.historyIndex,
        current: this.currentTrail
      };
      localStorage.setItem(this.storageKeyHistory, JSON.stringify(payload));
    } catch (err) {
      console.warn('[BreadcrumbsManager] Failed to persist history to localStorage:', err);
    }
  }

  /**
   * Loads the history stack from local storage.
   */
  private loadHistory(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKeyHistory);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.stack) && parsed.stack.length > 0) {
          this.historyStack = parsed.stack;
          this.historyIndex =
            typeof parsed.index === 'number' && parsed.index >= 0 && parsed.index < this.historyStack.length
              ? parsed.index
              : this.historyStack.length - 1;
          this.currentTrail = Array.isArray(parsed.current) && parsed.current.length > 0
            ? parsed.current
            : [...this.historyStack[this.historyIndex]];
        }
      }
    } catch (err) {
      console.warn('[BreadcrumbsManager] Failed to load history from localStorage:', err);
    }
  }

  /**
   * Saves the pinned tabs to local storage.
   */
  private persistPinnedTabs(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.storageKeyPinned, JSON.stringify(this.pinnedTabs));
    } catch (err) {
      console.warn('[BreadcrumbsManager] Failed to persist pinned tabs to localStorage:', err);
    }
  }

  /**
   * Loads the pinned tabs from local storage.
   */
  private loadPinnedTabs(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      this.initDefaultPinnedTabs();
      return;
    }
    try {
      const raw = localStorage.getItem(this.storageKeyPinned);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.pinnedTabs = parsed;
          return;
        }
      }
    } catch (err) {
      console.warn('[BreadcrumbsManager] Failed to load pinned tabs from localStorage:', err);
    }

    this.initDefaultPinnedTabs();
  }

  /**
   * Compares two trails for structural equality.
   */
  private areTrailsEqual(a: BreadcrumbItem[], b: BreadcrumbItem[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].targetId !== b[i].targetId || a[i].actionType !== b[i].actionType || a[i].label !== b[i].label) {
        return false;
      }
    }
    return true;
  }

  // ─── Teardown & Clean Up ────────────────────────────────────────────────────

  /**
   * Removes global event handlers and frees references.
   */
  public destroy(): void {
    if (typeof window !== 'undefined') {
      if (this.keydownHandler) {
        window.removeEventListener('keydown', this.keydownHandler);
      }
      if (this.clickHandler) {
        document.removeEventListener('click', this.clickHandler);
      }
    }
    this.navigationListeners.clear();
    this.isInitialized = false;
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/**
 * Singleton instance of the BreadcrumbsManager for cross-module integration.
 */
export const breadcrumbsManager = new BreadcrumbsManager();

serviceRegistry.registerInstance(SERVICES.Breadcrumbs, breadcrumbsManager);
