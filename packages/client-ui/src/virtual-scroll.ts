// virtual-scroll.ts
// Aetheris Omni-Sphere — High-Performance Virtual Scrolling & Infinite Feed Engine
// Complete virtualized rendering engine for infinite feeds with constant memory consumption and minimal DOM overhead

import { PASSIVE_EVENT_OPTIONS, rafThrottle, safeRequestAnimationFrame, safeCancelAnimationFrame } from './dry-utils.js';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export type ScrollAlignment = 'start' | 'center' | 'end' | 'auto';
export type ScrollDirection = 'up' | 'down' | 'idle';

export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  overscanStartIndex: number;
  overscanEndIndex: number;
  visibleCount: number;
  totalRendered: number;
}

export interface ItemMeasurement {
  index: number;
  offset: number;
  size: number;
  measured: boolean;
}

export interface VirtualScrollStats {
  totalItems: number;
  renderedItems: number;
  startIndex: number;
  endIndex: number;
  scrollTop: number;
  totalHeight: number;
  topOffset: number;
  bottomOffset: number;
  domNodeRatio: string;
  memorySavedPercent: number;
  isAtTop: boolean;
  isAtBottom: boolean;
  scrollDirection: ScrollDirection;
  averageItemHeight: number;
}

export interface VirtualScrollConfig {
  itemHeight?: number;
  overscanCount?: number;
  containerHeight?: number;
  infiniteThresholdPx?: number;
  dynamicMeasurements?: boolean;
  onRangeChange?: (range: VisibleRange) => void;
  onReachEnd?: () => Promise<void> | void;
  onScroll?: (scrollTop: number, direction: ScrollDirection) => void;
}

// ---------------------------------------------------------------------------
// VirtualScrollEngine
// ---------------------------------------------------------------------------

export class VirtualScrollEngine<T = unknown> {
  // Core State
  public items: T[] = [];
  public itemHeight: number = 220; // Estimated height per card (px)
  public containerHeight: number = typeof window !== 'undefined' ? Math.max(window.innerHeight - 120, 320) : 700;
  public scrollTop: number = 0;
  public overscanCount: number = 3;
  public totalItems: number = 0;

  // Dynamic Measurements & Settings
  public dynamicMeasurements: boolean = true;
  public infiniteThresholdPx: number = 400;
  public isLoadingMore: boolean = false;
  public hasMoreItems: boolean = true;
  public scrollDirection: ScrollDirection = 'idle';

  // Measurement and offset cache
  private measuredSizes: Map<number, number> = new Map();
  private cachedOffsets: number[] = [];
  private lastScrollTop: number = 0;
  private lastRenderedStart: number = -1;
  private lastRenderedEnd: number = -1;

  // DOM References & Callbacks
  private containerElement: HTMLElement | null = null;
  private scrollbarThumbElement: HTMLElement | null = null;
  private scrollbarTrackElement: HTMLElement | null = null;
  private isDraggingThumb: boolean = false;
  private dragStartY: number = 0;
  private dragStartScrollTop: number = 0;
  private scrollListenerAttached: boolean = false;
  private boundScrollHandler: (((e: Event) => void) & { cancel?: () => void }) | null = null;
  private boundResizeHandler: ((() => void) & { cancel?: () => void }) | null = null;
  private boundThumbMouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private boundThumbTouchStartHandler: ((e: TouchEvent) => void) | null = null;
  private boundDocMouseMoveHandler: (((e: MouseEvent) => void) & { cancel?: () => void }) | null = null;
  private boundDocTouchMoveHandler: (((e: TouchEvent) => void) & { cancel?: () => void }) | null = null;
  private boundDocMouseUpHandler: (() => void) | null = null;
  private boundDocTouchEndHandler: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private autoMeasureRafId: number | null = null;

  // External Event Handlers
  public onRangeChange: ((range: VisibleRange) => void) | null = null;
  public onReachEnd: (() => Promise<void> | void) | null = null;
  public onScrollCallback: ((scrollTop: number, direction: ScrollDirection) => void) | null = null;
  public itemRenderer: ((item: T, index: number) => string) | null = null;

  constructor(config?: VirtualScrollConfig) {
    if (config) {
      if (typeof config.itemHeight === 'number' && config.itemHeight > 0) {
        this.itemHeight = config.itemHeight;
      }
      if (typeof config.overscanCount === 'number' && config.overscanCount >= 0) {
        this.overscanCount = config.overscanCount;
      }
      if (typeof config.containerHeight === 'number' && config.containerHeight > 0) {
        this.containerHeight = config.containerHeight;
      }
      if (typeof config.infiniteThresholdPx === 'number' && config.infiniteThresholdPx > 0) {
        this.infiniteThresholdPx = config.infiniteThresholdPx;
      }
      if (typeof config.dynamicMeasurements === 'boolean') {
        this.dynamicMeasurements = config.dynamicMeasurements;
      }
      if (config.onRangeChange) {
        this.onRangeChange = config.onRangeChange;
      }
      if (config.onReachEnd) {
        this.onReachEnd = config.onReachEnd;
      }
      if (config.onScroll) {
        this.onScrollCallback = config.onScroll;
      }
    }

    this.initWindowListeners();
  }

  // -------------------------------------------------------------------------
  // Initialization & Global Listeners
  // -------------------------------------------------------------------------

  private initWindowListeners(): void {
    if (typeof window === 'undefined') return;

    this.boundResizeHandler = rafThrottle(() => {
      const computedHeight = Math.max(window.innerHeight - 120, 200);
      if (this.containerHeight !== computedHeight) {
        this.containerHeight = computedHeight;
        this.notifyRangeChange();
        this.updateScrollbarPosition();
      }
    });

    window.addEventListener('resize', this.boundResizeHandler, PASSIVE_EVENT_OPTIONS);
  }

  // -------------------------------------------------------------------------
  // Item Management
  // -------------------------------------------------------------------------

  public setItems(newItems: T[], totalExpectedCount?: number): void {
    this.items = Array.isArray(newItems) ? [...newItems] : [];
    this.totalItems = typeof totalExpectedCount === 'number' && totalExpectedCount >= this.items.length
      ? totalExpectedCount
      : this.items.length;
    this.hasMoreItems = this.items.length < this.totalItems;
    this.rebuildOffsetCache();
    this.notifyRangeChange();
    this.updateScrollbarPosition();
  }

  public appendItems(newItems: T[], totalExpectedCount?: number): void {
    if (!Array.isArray(newItems) || newItems.length === 0) return;
    const previousLength = this.items.length;
    this.items = [...this.items, ...newItems];
    
    if (typeof totalExpectedCount === 'number') {
      this.totalItems = Math.max(totalExpectedCount, this.items.length);
    } else if (this.totalItems < this.items.length) {
      this.totalItems = this.items.length;
    }
    
    this.hasMoreItems = this.items.length < this.totalItems;
    this.updateOffsetsFromIndex(previousLength);
    this.notifyRangeChange();
    this.updateScrollbarPosition();
  }

  public prependItems(newItems: T[]): void {
    if (!Array.isArray(newItems) || newItems.length === 0) return;
    const addedCount = newItems.length;
    this.items = [...newItems, ...this.items];
    this.totalItems += addedCount;

    // Shift existing measurement keys
    const newMeasurements = new Map<number, number>();
    for (const [idx, size] of this.measuredSizes.entries()) {
      newMeasurements.set(idx + addedCount, size);
    }
    this.measuredSizes = newMeasurements;

    // Adjust scroll position to maintain current element in visual focus
    const addedHeight = addedCount * this.itemHeight;
    this.scrollTop += addedHeight;
    if (this.containerElement) {
      this.containerElement.scrollTop = this.scrollTop;
    }

    this.rebuildOffsetCache();
    this.notifyRangeChange();
    this.updateScrollbarPosition();
  }

  public updateItem(index: number, updatedItem: T): void {
    if (index < 0 || index >= this.items.length) return;
    this.items[index] = updatedItem;
    // Retain data and invalidate specific dynamic measurement
    this.measuredSizes.delete(index);
    this.updateOffsetsFromIndex(index);
  }

  public removeItem(index: number): void {
    if (index < 0 || index >= this.items.length) return;
    this.items.splice(index, 1);
    this.totalItems = Math.max(0, this.totalItems - 1);
    this.measuredSizes.delete(index);

    // Shift measurements to the left
    const newMeasurements = new Map<number, number>();
    for (const [idx, size] of this.measuredSizes.entries()) {
      if (idx > index) {
        newMeasurements.set(idx - 1, size);
      } else if (idx < index) {
        newMeasurements.set(idx, size);
      }
    }
    this.measuredSizes = newMeasurements;
    this.rebuildOffsetCache();
    this.notifyRangeChange();
    this.updateScrollbarPosition();
  }

  public clear(): void {
    this.items = [];
    this.totalItems = 0;
    this.scrollTop = 0;
    this.measuredSizes.clear();
    this.cachedOffsets = [];
    this.hasMoreItems = false;
    this.isLoadingMore = false;
    if (this.containerElement) {
      this.containerElement.scrollTop = 0;
    }
    this.notifyRangeChange();
    this.updateScrollbarPosition();
  }

  // -------------------------------------------------------------------------
  // Measurements & Offset Calculations
  // -------------------------------------------------------------------------

  public getItemHeight(index: number): number {
    if (this.dynamicMeasurements && this.measuredSizes.has(index)) {
      return this.measuredSizes.get(index)!;
    }
    return this.itemHeight;
  }

  public recordItemHeight(index: number, sizeInPixels: number): void {
    if (!this.dynamicMeasurements || sizeInPixels <= 0) return;
    const current = this.measuredSizes.get(index);
    if (current !== sizeInPixels) {
      this.measuredSizes.set(index, sizeInPixels);
      this.updateOffsetsFromIndex(index);
    }
  }

  private rebuildOffsetCache(): void {
    const count = Math.max(this.items.length, this.totalItems);
    this.cachedOffsets = new Array(count);
    let runningOffset = 0;
    for (let i = 0; i < count; i++) {
      this.cachedOffsets[i] = runningOffset;
      runningOffset += this.getItemHeight(i);
    }
  }

  private updateOffsetsFromIndex(startIndex: number): void {
    const count = Math.max(this.items.length, this.totalItems);
    if (this.cachedOffsets.length < count) {
      this.rebuildOffsetCache();
      return;
    }

    let runningOffset = startIndex === 0 ? 0 : this.cachedOffsets[startIndex] || 0;
    for (let i = startIndex; i < count; i++) {
      this.cachedOffsets[i] = runningOffset;
      runningOffset += this.getItemHeight(i);
    }
  }

  public getOffsetForIndex(index: number): number {
    if (index <= 0) return 0;
    const count = Math.max(this.items.length, this.totalItems);
    if (index >= count) {
      return this.getTotalHeight();
    }
    if (this.cachedOffsets[index] !== undefined) {
      return this.cachedOffsets[index];
    }
    this.rebuildOffsetCache();
    return this.cachedOffsets[index] || index * this.itemHeight;
  }

  public getTotalHeight(): number {
    const count = Math.max(this.items.length, this.totalItems);
    if (count === 0) return 0;
    if (this.cachedOffsets.length === count) {
      const lastIndex = count - 1;
      return this.cachedOffsets[lastIndex] + this.getItemHeight(lastIndex);
    }
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += this.getItemHeight(i);
    }
    return total;
  }

  public findIndexForOffset(targetOffset: number): number {
    const count = Math.max(this.items.length, this.totalItems);
    if (count === 0 || targetOffset <= 0) return 0;

    let low = 0;
    let high = count - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midOffset = this.getOffsetForIndex(mid);
      const midHeight = this.getItemHeight(mid);
      const midEnd = midOffset + midHeight;

      if (targetOffset >= midOffset && targetOffset < midEnd) {
        return mid;
      }
      if (targetOffset < midOffset) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return Math.max(0, Math.min(low, count - 1));
  }

  // -------------------------------------------------------------------------
  // Visible Window Calculation (Windowing)
  // -------------------------------------------------------------------------

  public getVisibleRange(): { startIndex: number; endIndex: number } {
    const total = Math.max(this.items.length, this.totalItems);
    if (total === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    const currentScrollTop = Math.max(0, this.scrollTop);
    const viewportBottom = currentScrollTop + this.containerHeight;

    const rawStartIndex = this.findIndexForOffset(currentScrollTop);
    let rawEndIndex = rawStartIndex;

    while (rawEndIndex < total && this.getOffsetForIndex(rawEndIndex) < viewportBottom) {
      rawEndIndex++;
    }

    const startIndex = Math.max(0, rawStartIndex - this.overscanCount);
    const endIndex = Math.min(total, rawEndIndex + this.overscanCount);

    return { startIndex, endIndex };
  }

  public getFullRange(): VisibleRange {
    const total = Math.max(this.items.length, this.totalItems);
    if (total === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        overscanStartIndex: 0,
        overscanEndIndex: 0,
        visibleCount: 0,
        totalRendered: 0
      };
    }

    const currentScrollTop = Math.max(0, this.scrollTop);
    const viewportBottom = currentScrollTop + this.containerHeight;

    const rawStart = this.findIndexForOffset(currentScrollTop);
    let rawEnd = rawStart;
    while (rawEnd < total && this.getOffsetForIndex(rawEnd) < viewportBottom) {
      rawEnd++;
    }

    const overscanStart = Math.max(0, rawStart - this.overscanCount);
    const overscanEnd = Math.min(total, rawEnd + this.overscanCount);

    return {
      startIndex: rawStart,
      endIndex: Math.min(total, rawEnd),
      overscanStartIndex: overscanStart,
      overscanEndIndex: overscanEnd,
      visibleCount: Math.max(0, Math.min(total, rawEnd) - rawStart),
      totalRendered: Math.max(0, overscanEnd - overscanStart)
    };
  }

  // -------------------------------------------------------------------------
  // Scroll Management & Listeners
  // -------------------------------------------------------------------------

  public onScroll(newScrollTop: number): void {
    const sanitizedScrollTop = Math.max(0, newScrollTop);
    if (sanitizedScrollTop > this.lastScrollTop) {
      this.scrollDirection = 'down';
    } else if (sanitizedScrollTop < this.lastScrollTop) {
      this.scrollDirection = 'up';
    } else {
      this.scrollDirection = 'idle';
    }

    this.scrollTop = sanitizedScrollTop;
    this.lastScrollTop = sanitizedScrollTop;

    if (this.onScrollCallback) {
      this.onScrollCallback(this.scrollTop, this.scrollDirection);
    }

    this.checkInfiniteScroll();
    this.notifyRangeChange();
    this.updateScrollbarPosition();
  }

  public bindScrollListener(containerEl: HTMLElement): void {
    if (!containerEl) return;
    this.unbindScrollListener();
    this.containerElement = containerEl;

    // Update containerHeight if element has determined size
    if (containerEl.clientHeight > 0) {
      this.containerHeight = containerEl.clientHeight;
    }

    this.boundScrollHandler = rafThrottle(() => {
      if (this.containerElement) {
        this.onScroll(this.containerElement.scrollTop);
      }
    });

    this.containerElement.addEventListener('scroll', this.boundScrollHandler, PASSIVE_EVENT_OPTIONS);
    this.scrollListenerAttached = true;

    // Setup ResizeObserver for dynamic viewport adjustments
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newHeight = entry.contentRect.height;
          if (newHeight > 0 && Math.abs(newHeight - this.containerHeight) > 2) {
            this.containerHeight = newHeight;
            this.notifyRangeChange();
            this.updateScrollbarPosition();
          }
        }
      });
      this.resizeObserver.observe(this.containerElement);
    }

    // Attach element auto-measurement after rendering
    this.attachAutoMeasurer(containerEl);
  }

  public unbindScrollListener(): void {
    if (this.containerElement && this.boundScrollHandler) {
      this.containerElement.removeEventListener('scroll', this.boundScrollHandler);
      if (this.boundScrollHandler.cancel) {
        this.boundScrollHandler.cancel();
      }
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.autoMeasureRafId !== null) {
      safeCancelAnimationFrame(this.autoMeasureRafId);
      this.autoMeasureRafId = null;
    }
    this.unbindCustomScrollbar();
    this.containerElement = null;
    this.boundScrollHandler = null;
    this.scrollListenerAttached = false;
  }

  // -------------------------------------------------------------------------
  // Infinite Feed & Trigger Checks
  // -------------------------------------------------------------------------

  public checkInfiniteScroll(): void {
    if (this.isLoadingMore || !this.hasMoreItems || !this.onReachEnd) {
      return;
    }

    const totalH = this.getTotalHeight();
    const currentBottom = this.scrollTop + this.containerHeight;
    const distanceToBottom = totalH - currentBottom;

    if (distanceToBottom <= this.infiniteThresholdPx) {
      this.triggerReachEnd();
    }
  }

  public async triggerReachEnd(): Promise<void> {
    if (this.isLoadingMore || !this.hasMoreItems || !this.onReachEnd) {
      return;
    }

    this.isLoadingMore = true;
    try {
      const result = this.onReachEnd();
      if (result instanceof Promise) {
        await result;
      }
    } catch (err) {
      console.error('[VirtualScrollEngine] Error loading next page:', err);
    } finally {
      this.isLoadingMore = false;
      this.hasMoreItems = this.items.length < this.totalItems;
      this.rebuildOffsetCache();
      this.updateScrollbarPosition();
    }
  }

  // -------------------------------------------------------------------------
  // DOM Auto-Measurement of Rendered Cards
  // -------------------------------------------------------------------------

  public attachAutoMeasurer(container: HTMLElement): void {
    if (!this.dynamicMeasurements || typeof window === 'undefined') return;

    // Scan children with data-virtual-index attribute
    const scheduleMeasure = () => {
      if (!this.containerElement) return;
      const cardNodes = this.containerElement.querySelectorAll<HTMLElement>('[data-virtual-index]');
      let changed = false;

      cardNodes.forEach((node) => {
        const indexStr = node.getAttribute('data-virtual-index');
        if (indexStr !== null) {
          const index = parseInt(indexStr, 10);
          const measuredH = node.getBoundingClientRect().height;
          if (measuredH > 0 && Math.abs(measuredH - this.getItemHeight(index)) > 2) {
            this.measuredSizes.set(index, measuredH);
            changed = true;
          }
        }
      });

      if (changed) {
        this.rebuildOffsetCache();
        this.updateScrollbarPosition();
      }
    };

    if (this.autoMeasureRafId !== null) {
      safeCancelAnimationFrame(this.autoMeasureRafId);
      this.autoMeasureRafId = null;
    }

    // Execute in next animation frame
    this.autoMeasureRafId = safeRequestAnimationFrame(() => {
      this.autoMeasureRafId = null;
      scheduleMeasure();
    });
  }

  // -------------------------------------------------------------------------
  // Programmatic Navigation (Scroll To)
  // -------------------------------------------------------------------------

  public scrollToIndex(
    index: number,
    align: ScrollAlignment = 'auto',
    smooth: boolean = false
  ): void {
    const total = Math.max(this.items.length, this.totalItems);
    if (index < 0 || index >= total) return;

    const itemOffset = this.getOffsetForIndex(index);
    const itemH = this.getItemHeight(index);
    let targetScrollTop = this.scrollTop;

    switch (align) {
      case 'start':
        targetScrollTop = itemOffset;
        break;
      case 'end':
        targetScrollTop = itemOffset + itemH - this.containerHeight;
        break;
      case 'center':
        targetScrollTop = itemOffset - (this.containerHeight - itemH) / 2;
        break;
      case 'auto':
      default:
        if (itemOffset < this.scrollTop) {
          targetScrollTop = itemOffset;
        } else if (itemOffset + itemH > this.scrollTop + this.containerHeight) {
          targetScrollTop = itemOffset + itemH - this.containerHeight;
        }
        break;
    }

    this.scrollToOffset(Math.max(0, targetScrollTop), smooth);
  }

  public scrollToOffset(offset: number, smooth: boolean = false): void {
    const maxScroll = Math.max(0, this.getTotalHeight() - this.containerHeight);
    const clamped = Math.max(0, Math.min(offset, maxScroll));

    if (this.containerElement) {
      if (smooth && 'scrollTo' in this.containerElement) {
        this.containerElement.scrollTo({ top: clamped, behavior: 'smooth' });
      } else {
        this.containerElement.scrollTop = clamped;
      }
    } else {
      this.onScroll(clamped);
    }
  }

  public scrollToTop(smooth: boolean = true): void {
    this.scrollToOffset(0, smooth);
  }

  public scrollToBottom(smooth: boolean = true): void {
    this.scrollToOffset(this.getTotalHeight(), smooth);
  }

  // -------------------------------------------------------------------------
  // Internal Callbacks & Synchronization
  // -------------------------------------------------------------------------

  private notifyRangeChange(): void {
    const range = this.getFullRange();
    if (range.overscanStartIndex !== this.lastRenderedStart || range.overscanEndIndex !== this.lastRenderedEnd) {
      this.lastRenderedStart = range.overscanStartIndex;
      this.lastRenderedEnd = range.overscanEndIndex;
      if (this.onRangeChange) {
        this.onRangeChange(range);
      }
    }
  }

  public setContainerHeight(height: number): void {
    if (height > 0 && this.containerHeight !== height) {
      this.containerHeight = height;
      this.notifyRangeChange();
      this.updateScrollbarPosition();
    }
  }

  public setOverscanCount(count: number): void {
    if (count >= 0 && this.overscanCount !== count) {
      this.overscanCount = count;
      this.notifyRangeChange();
    }
  }

  public setItemHeightEstimate(height: number): void {
    if (height > 0 && this.itemHeight !== height) {
      this.itemHeight = height;
      this.rebuildOffsetCache();
      this.notifyRangeChange();
      this.updateScrollbarPosition();
    }
  }

  public setInfiniteLoader(loadMoreFn: () => Promise<void> | void, thresholdPx?: number): void {
    this.onReachEnd = loadMoreFn;
    if (typeof thresholdPx === 'number' && thresholdPx > 0) {
      this.infiniteThresholdPx = thresholdPx;
    }
  }

  // -------------------------------------------------------------------------
  // HTML Rendering & Virtualized Container
  // -------------------------------------------------------------------------

  /**
   * Render complete virtual scrolling container:
   * - Outer container with computed total height (for accurate native/custom scrollbar)
   * - Inner container positioned via `transform: translateY(offset)` holding strictly visible cards
   * - Shimmering placeholder for unloaded cards or pending fetches
   * - Constant number of DOM nodes in the tree
   */
  public renderContainer(renderItem: (item: T, index: number) => string): string {
    this.itemRenderer = renderItem;
    const total = Math.max(this.items.length, this.totalItems);
    const totalH = this.getTotalHeight();

    if (total === 0) {
      return this.renderEmptyState();
    }

    const { startIndex, endIndex } = this.getVisibleRange();
    const startOffset = this.getOffsetForIndex(startIndex);

    // Generate visible cards (real items or skeleton placeholders)
    const visibleCardsHtml: string[] = [];

    for (let i = startIndex; i < endIndex; i++) {
      if (i < this.items.length) {
        const itemData = this.items[i];
        const cardHtml = renderItem(itemData, i);
        visibleCardsHtml.push(`
          <div data-virtual-index="${i}" class="w-full virtual-item-wrapper transition-opacity duration-150">
            ${cardHtml}
          </div>
        `);
      } else {
        // Shimmering skeleton card for unloaded slots in the infinite feed
        visibleCardsHtml.push(`
          <div data-virtual-index="${i}" class="w-full virtual-item-wrapper virtual-skeleton-wrapper" style="min-height: ${this.itemHeight}px;">
            ${this.renderPlaceholderCard(i)}
          </div>
        `);
      }
    }

    // Loading indicator if fetch is active at bottom of list
    const loadingIndicatorHtml = this.isLoadingMore ? `
      <div class="w-full py-6 flex items-center justify-center space-x-3 text-cyphr bg-surface-raised/40 rounded-xl border border-white/5 backdrop-blur-sm animate-pulse my-4">
        <svg class="w-5 h-5 animate-spin text-cyphr" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-xs font-mono tracking-wider uppercase text-slate-300">Synchronizing ZK-Pulse Feed...</span>
      </div>
    ` : '';

    return `
      <div id="virtual-scroll-viewport" class="relative w-full overflow-hidden" style="min-height: 100%;">
        <!-- Invisible Spacer for Virtual Total Height -->
        <div class="virtual-scroll-spacer w-full pointer-events-none" style="height: ${totalH}px; width: 100%; position: absolute; top: 0; left: 0; z-index: -1;"></div>

        <!-- Translated Container with Visible Elements -->
        <div class="virtual-scroll-content w-full flex flex-col space-y-4 will-change-transform" style="transform: translateY(${startOffset}px); min-height: 50px;">
          ${visibleCardsHtml.join('')}
          ${loadingIndicatorHtml}
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // Skeleton Placeholder Card (Shimmering Obsidian Cyberpunk)
  // -------------------------------------------------------------------------

  public renderPlaceholderCard(index: number): string {
    const seed = (index * 7919) % 100;
    const authorWidth = 80 + (seed % 60);
    const titleWidth = 55 + (seed % 35);
    const textWidth1 = 90 + (seed % 8);
    const textWidth2 = 70 + (seed % 25);

    return `
      <div class="relative p-5 rounded-2xl bg-surface-raised/80 border border-white/5 backdrop-blur-md overflow-hidden shadow-2xl animate-pulse">
        <!-- Shimmer gradient overlay -->
        <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite]"></div>

        <!-- Header Card: Avatar + Fingerprint + Badge -->
        <div class="flex items-center justify-between pb-3 mb-3 border-subtle-b">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-surface-overlay border border-white/10 flex items-center justify-center">
              <div class="w-4 h-4 rounded-full bg-slate-700"></div>
            </div>
            <div class="space-y-1.5">
              <div class="h-3.5 bg-surface-overlay rounded-md" style="width: ${authorWidth}px;"></div>
              <div class="h-2.5 bg-surface-base rounded-md w-24"></div>
            </div>
          </div>
          <div class="h-5 px-2.5 rounded-full bg-surface-overlay border border-white/5 w-20"></div>
        </div>

        <!-- Title Placeholder -->
        <div class="h-5 bg-surface-overlay rounded-md mb-3" style="width: ${titleWidth}%;"></div>

        <!-- Content Lines Placeholder -->
        <div class="space-y-2 mb-4">
          <div class="h-3 bg-surface-base/80 rounded-md" style="width: ${textWidth1}%;"></div>
          <div class="h-3 bg-surface-base/80 rounded-md" style="width: ${textWidth2}%;"></div>
        </div>

        <!-- Footer Actions Placeholder -->
        <div class="flex items-center justify-between pt-3 border-subtle-b">
          <div class="flex items-center space-x-4">
            <div class="h-7 w-16 bg-surface-overlay rounded-lg border border-white/5"></div>
            <div class="h-7 w-14 bg-surface-overlay rounded-lg border border-white/5"></div>
            <div class="h-7 w-14 bg-surface-overlay rounded-lg border border-white/5"></div>
          </div>
          <div class="h-6 w-20 bg-surface-overlay rounded-lg border border-white/5"></div>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // Empty State
  // -------------------------------------------------------------------------

  public renderEmptyState(): string {
    return `
      <div class="flex flex-col items-center justify-center py-20 px-6 text-center bg-surface-base/40 rounded-3xl border border-white/5 backdrop-blur-lg my-8 shadow-inner">
        <div class="relative mb-6">
          <div class="w-20 h-20 rounded-2xl bg-surface-raised/90 border border-white/10 flex items-center justify-center shadow-2xl shadow-cyan-500/10">
            <svg class="w-10 h-10 text-cyphr" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span class="absolute -top-1 -right-1 flex h-4 w-4">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyphr opacity-75"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-cyphr/40 border border-cyphr"></span>
          </span>
        </div>
        <h3 class="text-lg font-bold font-sans text-white tracking-wide mb-2">No Events in Active Feed</h3>
        <p class="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Current feed is empty or the ZK node is awaiting new blocks on the Aetheris P2P network.
        </p>
        <div class="flex items-center space-x-3">
          <button onclick="window.location.reload()" class="px-4 py-2 rounded-xl bg-surface-overlay hover:bg-surface-highlight text-cyphr border border-cyphr/30 text-xs font-mono uppercase tracking-wider transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95">
            Refresh Channel
          </button>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // Custom Slim Obsidian Scrollbar
  // -------------------------------------------------------------------------

  /**
   * HTML rendering for Custom Slim Obsidian Scrollbar
   * Includes track, position indicator, percentage tooltip, and Cyberpunk styling
   */
  public renderScrollbar(): string {
    const totalH = this.getTotalHeight();
    const maxScroll = Math.max(1, totalH - this.containerHeight);
    const scrollPercent = Math.min(100, Math.max(0, Math.round((this.scrollTop / maxScroll) * 100)));

    // Compute thumb height proportional to viewport
    const thumbHeightRatio = totalH > 0 ? Math.min(1, this.containerHeight / totalH) : 1;
    const thumbHeightPx = Math.max(36, Math.round(this.containerHeight * thumbHeightRatio));

    // Compute top thumb position
    const availableTrackH = Math.max(1, this.containerHeight - thumbHeightPx);
    const thumbTopPx = Math.round((this.scrollTop / maxScroll) * availableTrackH);

    return `
      <div id="virtual-scrollbar-wrapper" class="absolute top-0 right-1 bottom-0 w-2.5 z-40 flex flex-col items-center py-2 pointer-events-auto select-none group">
        <!-- Obsidian Track with Fine Border -->
        <div id="virtual-scrollbar-track" class="relative w-1.5 h-full rounded-full bg-surface-base/80 border border-white/5 hover:w-2 hover:bg-surface-raised transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-md">
          <!-- Thumb Indicator with Cyphr Glow -->
          <div id="virtual-scrollbar-thumb" 
               class="absolute w-full rounded-full bg-gradient-to-b from-cyan-400 via-cyphr to-blue-600 shadow-[0_0_12px_rgba(0,229,255,0.4)] group-hover:shadow-[0_0_16px_rgba(0,229,255,0.7)] transition-transform duration-75 cursor-grab active:cursor-grabbing hover:brightness-125"
               style="height: ${thumbHeightPx}px; transform: translateY(${thumbTopPx}px); top: 0; left: 0;">
            <!-- Grip lines micro-indicator -->
            <div class="w-full h-full flex flex-col items-center justify-center space-y-0.5 opacity-60">
              <div class="w-1 h-0.5 bg-white/70 rounded-full"></div>
              <div class="w-1 h-0.5 bg-white/70 rounded-full"></div>
            </div>
          </div>
        </div>

        <!-- Floating Percentage Indicator on Hover -->
        <div id="virtual-scrollbar-tooltip" 
             class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none px-2 py-1 rounded-md bg-surface-raised/95 border border-white/10 shadow-2xl backdrop-blur-md flex items-center space-x-1.5 whitespace-nowrap">
          <span class="w-1.5 h-1.5 rounded-full bg-cyphr animate-ping"></span>
          <span class="text-[10px] font-mono text-cyphr font-bold">${scrollPercent}%</span>
          <span class="text-[9px] font-mono text-slate-400">(${this.items.length}/${this.totalItems})</span>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // Bind Custom Scrollbar to Drag & Click Events
  // -------------------------------------------------------------------------

  public bindCustomScrollbar(trackEl: HTMLElement, thumbEl: HTMLElement): void {
    if (!trackEl || !thumbEl) return;
    this.unbindCustomScrollbar();

    this.scrollbarTrackElement = trackEl;
    this.scrollbarThumbElement = thumbEl;

    // Drag Start on Thumb (Mouse)
    this.boundThumbMouseDownHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.isDraggingThumb = true;
      this.dragStartY = e.clientY;
      this.dragStartScrollTop = this.scrollTop;
      document.body.classList.add('select-none');
    };

    // Drag Start on Thumb (Touch)
    this.boundThumbTouchStartHandler = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        this.isDraggingThumb = true;
        this.dragStartY = e.touches[0].clientY;
        this.dragStartScrollTop = this.scrollTop;
      }
    };

    thumbEl.addEventListener('mousedown', this.boundThumbMouseDownHandler);
    thumbEl.addEventListener('touchstart', this.boundThumbTouchStartHandler, PASSIVE_EVENT_OPTIONS);

    // Direct Click on Track for Instant Jump
    this.scrollbarTrackElement.addEventListener('click', (e: MouseEvent) => {
      if (e.target === thumbEl || thumbEl.contains(e.target as Node)) return;
      const rect = trackEl.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const trackH = rect.height;
      const targetPercent = Math.max(0, Math.min(1, clickY / trackH));
      const totalH = this.getTotalHeight();
      const maxScroll = Math.max(0, totalH - this.containerHeight);
      this.scrollToOffset(targetPercent * maxScroll, true);
    });

    // Drag Move & End on Document (Mouse & Touch) throttled with rAF
    this.boundDocMouseMoveHandler = rafThrottle((e: MouseEvent) => {
      if (!this.isDraggingThumb || !this.scrollbarTrackElement) return;
      const deltaY = e.clientY - this.dragStartY;
      const trackH = this.scrollbarTrackElement.clientHeight;
      const thumbH = this.scrollbarThumbElement?.clientHeight || 36;
      const availableTrackH = Math.max(1, trackH - thumbH);
      const totalH = this.getTotalHeight();
      const maxScroll = Math.max(0, totalH - this.containerHeight);

      const deltaScroll = (deltaY / availableTrackH) * maxScroll;
      this.scrollToOffset(this.dragStartScrollTop + deltaScroll, false);
    });

    this.boundDocTouchMoveHandler = rafThrottle((e: TouchEvent) => {
      if (!this.isDraggingThumb || !this.scrollbarTrackElement || e.touches.length === 0) return;
      const deltaY = e.touches[0].clientY - this.dragStartY;
      const trackH = this.scrollbarTrackElement.clientHeight;
      const thumbH = this.scrollbarThumbElement?.clientHeight || 36;
      const availableTrackH = Math.max(1, trackH - thumbH);
      const totalH = this.getTotalHeight();
      const maxScroll = Math.max(0, totalH - this.containerHeight);

      const deltaScroll = (deltaY / availableTrackH) * maxScroll;
      this.scrollToOffset(this.dragStartScrollTop + deltaScroll, false);
    });

    this.boundDocMouseUpHandler = () => {
      if (this.isDraggingThumb) {
        this.isDraggingThumb = false;
        document.body.classList.remove('select-none');
      }
    };

    this.boundDocTouchEndHandler = () => {
      if (this.isDraggingThumb) {
        this.isDraggingThumb = false;
      }
    };

    window.addEventListener('mousemove', this.boundDocMouseMoveHandler, PASSIVE_EVENT_OPTIONS);
    window.addEventListener('mouseup', this.boundDocMouseUpHandler, PASSIVE_EVENT_OPTIONS);
    window.addEventListener('touchmove', this.boundDocTouchMoveHandler, PASSIVE_EVENT_OPTIONS);
    window.addEventListener('touchend', this.boundDocTouchEndHandler, PASSIVE_EVENT_OPTIONS);
  }

  public unbindCustomScrollbar(): void {
    if (this.scrollbarThumbElement && this.boundThumbMouseDownHandler) {
      this.scrollbarThumbElement.removeEventListener('mousedown', this.boundThumbMouseDownHandler);
    }
    if (this.scrollbarThumbElement && this.boundThumbTouchStartHandler) {
      this.scrollbarThumbElement.removeEventListener('touchstart', this.boundThumbTouchStartHandler);
    }
    if (this.boundDocMouseMoveHandler) {
      window.removeEventListener('mousemove', this.boundDocMouseMoveHandler);
      if (this.boundDocMouseMoveHandler.cancel) {
        this.boundDocMouseMoveHandler.cancel();
      }
    }
    if (this.boundDocTouchMoveHandler) {
      window.removeEventListener('touchmove', this.boundDocTouchMoveHandler);
      if (this.boundDocTouchMoveHandler.cancel) {
        this.boundDocTouchMoveHandler.cancel();
      }
    }
    if (this.boundDocMouseUpHandler) {
      window.removeEventListener('mouseup', this.boundDocMouseUpHandler);
    }
    if (this.boundDocTouchEndHandler) {
      window.removeEventListener('touchend', this.boundDocTouchEndHandler);
    }
    this.scrollbarTrackElement = null;
    this.scrollbarThumbElement = null;
    this.boundThumbMouseDownHandler = null;
    this.boundThumbTouchStartHandler = null;
    this.boundDocMouseMoveHandler = null;
    this.boundDocTouchMoveHandler = null;
    this.boundDocMouseUpHandler = null;
    this.boundDocTouchEndHandler = null;
  }

  public updateScrollbarPosition(): void {
    if (!this.scrollbarThumbElement || !this.scrollbarTrackElement) return;

    const totalH = this.getTotalHeight();
    const trackH = this.scrollbarTrackElement.clientHeight || this.containerHeight;
    const maxScroll = Math.max(1, totalH - this.containerHeight);

    const thumbRatio = totalH > 0 ? Math.min(1, this.containerHeight / totalH) : 1;
    const thumbH = Math.max(36, Math.round(trackH * thumbRatio));
    const availableTrackH = Math.max(1, trackH - thumbH);
    const thumbTop = Math.min(availableTrackH, Math.max(0, (this.scrollTop / maxScroll) * availableTrackH));

    this.scrollbarThumbElement.style.height = `${thumbH}px`;
    this.scrollbarThumbElement.style.transform = `translateY(${thumbTop}px)`;

    // Update tooltip if present
    const tooltipEl = document.getElementById('virtual-scrollbar-tooltip');
    if (tooltipEl) {
      const scrollPercent = Math.min(100, Math.max(0, Math.round((this.scrollTop / maxScroll) * 100)));
      tooltipEl.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full bg-cyphr animate-ping"></span>
        <span class="text-[10px] font-mono text-cyphr font-bold">${scrollPercent}%</span>
        <span class="text-[9px] font-mono text-slate-400">(${this.items.length}/${this.totalItems})</span>
      `;
    }
  }

  // -------------------------------------------------------------------------
  // Virtualization Performance HUD & Diagnostics
  // -------------------------------------------------------------------------

  public getStats(): VirtualScrollStats {
    const range = this.getFullRange();
    const totalH = this.getTotalHeight();
    const maxScroll = Math.max(0, totalH - this.containerHeight);
    const count = Math.max(this.items.length, this.totalItems);
    const rendered = range.totalRendered;
    const memSaved = count > 0 ? Math.max(0, Math.round(((count - rendered) / count) * 100)) : 0;
    const avgH = count > 0 ? Math.round(totalH / count) : this.itemHeight;

    return {
      totalItems: count,
      renderedItems: rendered,
      startIndex: range.overscanStartIndex,
      endIndex: range.overscanEndIndex,
      scrollTop: Math.round(this.scrollTop),
      totalHeight: Math.round(totalH),
      topOffset: Math.round(this.getOffsetForIndex(range.overscanStartIndex)),
      bottomOffset: Math.round(totalH - this.getOffsetForIndex(range.overscanEndIndex)),
      domNodeRatio: `${rendered}/${count} nodes`,
      memorySavedPercent: memSaved,
      isAtTop: this.scrollTop <= 5,
      isAtBottom: this.scrollTop >= maxScroll - 10,
      scrollDirection: this.scrollDirection,
      averageItemHeight: avgH
    };
  }

  public renderStatsBadge(): string {
    const stats = this.getStats();
    return `
      <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-surface-raised/90 border border-white/10 text-[11px] font-mono text-slate-300 backdrop-blur-md shadow-lg">
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-signal"></span>
        </span>
        <span class="text-cyphr font-semibold">VIRTUAL DOM:</span>
        <span class="text-white">${stats.domNodeRatio}</span>
        <span class="text-slate-500">|</span>
        <span class="text-signal">-${stats.memorySavedPercent}% MEM</span>
        <span class="text-slate-500">|</span>
        <span class="text-aether">${stats.totalHeight}px TOTAL</span>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // Direct DOM Re-render (Integration Helper)
  // -------------------------------------------------------------------------

  public refreshDOM(targetContainer?: HTMLElement): void {
    const container = targetContainer || this.containerElement;
    if (!container || !this.itemRenderer) return;

    const html = this.renderContainer(this.itemRenderer);
    container.innerHTML = html;

    // Relink scrollbar if present in DOM
    const track = container.querySelector<HTMLElement>('#virtual-scrollbar-track');
    const thumb = container.querySelector<HTMLElement>('#virtual-scrollbar-thumb');
    if (track && thumb) {
      this.bindCustomScrollbar(track, thumb);
    }

    this.attachAutoMeasurer(container);
  }

  /**
   * Complete teardown of virtual scroll engine: removes window listeners, container listeners,
   * disconnects observers, and releases all references.
   */
  public destroy(): void {
    this.unbindScrollListener();

    if (this.boundResizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.boundResizeHandler);
      if (this.boundResizeHandler.cancel) {
        this.boundResizeHandler.cancel();
      }
      this.boundResizeHandler = null;
    }

    this.onRangeChange = null;
    this.onReachEnd = null;
    this.onScrollCallback = null;
    this.itemRenderer = null;
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

export const virtualScroll = new VirtualScrollEngine();
