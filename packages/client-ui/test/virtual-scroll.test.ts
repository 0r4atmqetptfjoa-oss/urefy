import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  VirtualScrollEngine,
  virtualScroll,
  type VirtualScrollConfig,
  type VisibleRange,
  type ScrollDirection
} from '../src/virtual-scroll.js';

interface TestItem {
  id: string;
  title: string;
  height?: number;
}

describe('VirtualScrollEngine — High-Performance Virtual Scrolling', () => {
  let engine: VirtualScrollEngine<TestItem>;

  const createDummyItems = (count: number): TestItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `item-${i}`,
      title: `Virtual Item #${i}`
    }));
  };

  beforeEach(() => {
    engine = new VirtualScrollEngine<TestItem>({
      itemHeight: 100,
      overscanCount: 2,
      containerHeight: 500,
      infiniteThresholdPx: 300,
      dynamicMeasurements: true
    });
  });

  describe('1. Engine Initialization & Configuration', () => {
    it('should initialize with provided config values', () => {
      expect(engine.itemHeight).toBe(100);
      expect(engine.overscanCount).toBe(2);
      expect(engine.containerHeight).toBe(500);
      expect(engine.infiniteThresholdPx).toBe(300);
      expect(engine.dynamicMeasurements).toBe(true);
      expect(engine.scrollTop).toBe(0);
      expect(engine.scrollDirection).toBe('idle');
      expect(engine.items).toEqual([]);
      expect(engine.totalItems).toBe(0);
    });

    it('should initialize with defaults when config is empty', () => {
      const defaultEngine = new VirtualScrollEngine();
      expect(defaultEngine.itemHeight).toBe(220);
      expect(defaultEngine.overscanCount).toBe(3);
      expect(defaultEngine.dynamicMeasurements).toBe(true);
      expect(defaultEngine.infiniteThresholdPx).toBe(400);
    });

    it('should verify singleton export is an instance of VirtualScrollEngine', () => {
      expect(virtualScroll).toBeDefined();
      expect(virtualScroll).toBeInstanceOf(VirtualScrollEngine);
    });

    it('should update configuration via setters', () => {
      engine.setContainerHeight(800);
      expect(engine.containerHeight).toBe(800);

      engine.setOverscanCount(5);
      expect(engine.overscanCount).toBe(5);

      engine.setItemHeightEstimate(150);
      expect(engine.itemHeight).toBe(150);

      const loadMoreFn = vi.fn();
      engine.setInfiniteLoader(loadMoreFn, 250);
      expect(engine.onReachEnd).toBe(loadMoreFn);
      expect(engine.infiniteThresholdPx).toBe(250);
    });
  });

  describe('2. Item Management & Offsets', () => {
    it('should set items and calculate total items correctly', () => {
      const items = createDummyItems(20);
      engine.setItems(items);

      expect(engine.items.length).toBe(20);
      expect(engine.totalItems).toBe(20);
      expect(engine.hasMoreItems).toBe(false);
      expect(engine.getTotalHeight()).toBe(20 * 100);
    });

    it('should support totalExpectedCount greater than items length for infinite feeds', () => {
      const items = createDummyItems(10);
      engine.setItems(items, 50);

      expect(engine.items.length).toBe(10);
      expect(engine.totalItems).toBe(50);
      expect(engine.hasMoreItems).toBe(true);
      expect(engine.getTotalHeight()).toBe(50 * 100);
    });

    it('should append items correctly', () => {
      engine.setItems(createDummyItems(10));
      expect(engine.items.length).toBe(10);

      const newItems = createDummyItems(5).map((it, idx) => ({ ...it, id: `append-${idx}` }));
      engine.appendItems(newItems);

      expect(engine.items.length).toBe(15);
      expect(engine.totalItems).toBe(15);
      expect(engine.getTotalHeight()).toBe(1500);
      expect(engine.items[10].id).toBe('append-0');
    });

    it('should ignore empty append calls', () => {
      engine.setItems(createDummyItems(5));
      engine.appendItems([]);
      expect(engine.items.length).toBe(5);
    });

    it('should prepend items and adjust scroll position', () => {
      engine.setItems(createDummyItems(10));
      engine.scrollTop = 200;

      const prepended = createDummyItems(3).map((it, idx) => ({ ...it, id: `prepend-${idx}` }));
      engine.prependItems(prepended);

      expect(engine.items.length).toBe(13);
      expect(engine.totalItems).toBe(13);
      expect(engine.items[0].id).toBe('prepend-0');
      // ScrollTop shifted by 3 * 100 = 300px
      expect(engine.scrollTop).toBe(500);
    });

    it('should update a specific item', () => {
      engine.setItems(createDummyItems(10));
      engine.updateItem(3, { id: 'item-3', title: 'Updated Title' });

      expect(engine.items[3].title).toBe('Updated Title');
    });

    it('should remove an item by index', () => {
      engine.setItems(createDummyItems(5));
      engine.removeItem(2);

      expect(engine.items.length).toBe(4);
      expect(engine.totalItems).toBe(4);
      expect(engine.items[2].id).toBe('item-3');
    });

    it('should clear all items and reset state', () => {
      engine.setItems(createDummyItems(10));
      engine.scrollTop = 400;
      engine.clear();

      expect(engine.items.length).toBe(0);
      expect(engine.totalItems).toBe(0);
      expect(engine.scrollTop).toBe(0);
      expect(engine.getTotalHeight()).toBe(0);
    });
  });

  describe('3. Dynamic Measurements & Offset Calculation', () => {
    it('should calculate offset for index with uniform heights', () => {
      engine.setItems(createDummyItems(20));

      expect(engine.getOffsetForIndex(0)).toBe(0);
      expect(engine.getOffsetForIndex(1)).toBe(100);
      expect(engine.getOffsetForIndex(5)).toBe(500);
      expect(engine.getOffsetForIndex(10)).toBe(1000);
      expect(engine.getOffsetForIndex(20)).toBe(2000);
    });

    it('should record dynamic item heights and recalculate subsequent offsets', () => {
      engine.setItems(createDummyItems(10));

      // Record item 0 with height 250 instead of 100
      engine.recordItemHeight(0, 250);
      expect(engine.getItemHeight(0)).toBe(250);
      expect(engine.getItemHeight(1)).toBe(100);

      expect(engine.getOffsetForIndex(0)).toBe(0);
      expect(engine.getOffsetForIndex(1)).toBe(250);
      expect(engine.getOffsetForIndex(2)).toBe(350);
      expect(engine.getTotalHeight()).toBe(250 + 9 * 100); // 1150
    });

    it('should find correct index for a given scroll offset using binary search', () => {
      engine.setItems(createDummyItems(20));

      expect(engine.findIndexForOffset(0)).toBe(0);
      expect(engine.findIndexForOffset(50)).toBe(0);
      expect(engine.findIndexForOffset(100)).toBe(1);
      expect(engine.findIndexForOffset(150)).toBe(1);
      expect(engine.findIndexForOffset(499)).toBe(4);
      expect(engine.findIndexForOffset(500)).toBe(5);
      expect(engine.findIndexForOffset(1950)).toBe(19);
    });
  });

  describe('4. Visible Range & Windowing (getVisibleRange & getFullRange)', () => {
    it('should return empty range when no items exist', () => {
      engine.setItems([]);
      const range = engine.getVisibleRange();
      expect(range).toEqual({ startIndex: 0, endIndex: 0 });

      const fullRange = engine.getFullRange();
      expect(fullRange).toEqual({
        startIndex: 0,
        endIndex: 0,
        overscanStartIndex: 0,
        overscanEndIndex: 0,
        visibleCount: 0,
        totalRendered: 0
      });
    });

    it('should calculate visible range at top (scrollTop = 0)', () => {
      // 20 items of 100px each, container height = 500px, overscan = 2
      // At scroll 0: visible indices 0..5 (5 items fill 500px viewport, ends at 5)
      engine.setItems(createDummyItems(20));
      engine.scrollTop = 0;

      const { startIndex, endIndex } = engine.getVisibleRange();
      expect(startIndex).toBe(0); // 0 - overscan(2) clamped to 0
      expect(endIndex).toBe(7); // 5 + overscan(2)

      const full = engine.getFullRange();
      expect(full.startIndex).toBe(0);
      expect(full.endIndex).toBe(5);
      expect(full.overscanStartIndex).toBe(0);
      expect(full.overscanEndIndex).toBe(7);
      expect(full.visibleCount).toBe(5);
      expect(full.totalRendered).toBe(7);
    });

    it('should calculate visible range in the middle (scrollTop = 500)', () => {
      // At scroll 500px: viewport covers [500px, 1000px] -> items 5, 6, 7, 8, 9
      engine.setItems(createDummyItems(20));
      engine.scrollTop = 500;

      const { startIndex, endIndex } = engine.getVisibleRange();
      expect(startIndex).toBe(3); // 5 - 2 = 3
      expect(endIndex).toBe(12); // 10 + 2 = 12

      const full = engine.getFullRange();
      expect(full.startIndex).toBe(5);
      expect(full.endIndex).toBe(10);
      expect(full.overscanStartIndex).toBe(3);
      expect(full.overscanEndIndex).toBe(12);
      expect(full.totalRendered).toBe(9);
    });

    it('should clamp overscanEndIndex to total items at bottom scroll', () => {
      engine.setItems(createDummyItems(20));
      engine.scrollTop = 1500; // max scroll: 2000 - 500 = 1500

      const { startIndex, endIndex } = engine.getVisibleRange();
      expect(startIndex).toBe(13); // 15 - 2 = 13
      expect(endIndex).toBe(20); // 20 clamped to total 20
    });
  });

  describe('5. Scroll Handling & Event Callbacks (onScroll)', () => {
    it('should update scrollTop and detect scroll directions', () => {
      engine.setItems(createDummyItems(30));

      // Scroll Down
      engine.onScroll(150);
      expect(engine.scrollTop).toBe(150);
      expect(engine.scrollDirection).toBe('down');

      // Scroll Down further
      engine.onScroll(300);
      expect(engine.scrollTop).toBe(300);
      expect(engine.scrollDirection).toBe('down');

      // Scroll Up
      engine.onScroll(200);
      expect(engine.scrollTop).toBe(200);
      expect(engine.scrollDirection).toBe('up');

      // Scroll Idle (same position)
      engine.onScroll(200);
      expect(engine.scrollDirection).toBe('idle');
    });

    it('should invoke onScrollCallback when scroll changes', () => {
      const scrollSpy = vi.fn();
      engine.onScrollCallback = scrollSpy;
      engine.setItems(createDummyItems(10));

      engine.onScroll(120);
      expect(scrollSpy).toHaveBeenCalledWith(120, 'down');
    });

    it('should trigger onRangeChange when visible range changes', () => {
      const rangeSpy = vi.fn();
      engine.onRangeChange = rangeSpy;
      engine.setItems(createDummyItems(50));

      // Trigger scroll that changes range
      engine.onScroll(600);
      expect(rangeSpy).toHaveBeenCalled();
      const lastCallArg = rangeSpy.mock.calls[rangeSpy.mock.calls.length - 1][0] as VisibleRange;
      expect(lastCallArg.startIndex).toBe(6);
    });

    it('should trigger infinite loader when scrolling near the bottom', async () => {
      const loadMoreSpy = vi.fn().mockResolvedValue(undefined);
      engine.setItems(createDummyItems(10), 30); // 10 loaded out of 30
      engine.setInfiniteLoader(loadMoreSpy, 300);

      // Total height = 3000px, viewport = 500px, distanceToBottom threshold = 300px
      // Scroll to 2300px -> current bottom = 2800px, distance to bottom = 200px <= 300px
      engine.onScroll(2300);

      expect(loadMoreSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. Programmatic Scrolling', () => {
    beforeEach(() => {
      engine.setItems(createDummyItems(30)); // 3000px total
    });

    it('should scroll to offset clamped to bounds', () => {
      engine.scrollToOffset(800);
      expect(engine.scrollTop).toBe(800);

      // Clamped to max scroll (3000 - 500 = 2500)
      engine.scrollToOffset(5000);
      expect(engine.scrollTop).toBe(2500);

      // Clamped to 0
      engine.scrollToOffset(-100);
      expect(engine.scrollTop).toBe(0);
    });

    it('should scroll to top and bottom', () => {
      engine.scrollToBottom(false);
      expect(engine.scrollTop).toBe(2500);

      engine.scrollToTop(false);
      expect(engine.scrollTop).toBe(0);
    });

    it('should scroll to specific index with alignment', () => {
      // align 'start': offset of index 10 is 1000px
      engine.scrollToIndex(10, 'start', false);
      expect(engine.scrollTop).toBe(1000);

      // align 'end': itemOffset(1000) + itemH(100) - containerH(500) = 600px
      engine.scrollToIndex(10, 'end', false);
      expect(engine.scrollTop).toBe(600);

      // align 'center': itemOffset(1000) - (500 - 100)/2 = 800px
      engine.scrollToIndex(10, 'center', false);
      expect(engine.scrollTop).toBe(800);
    });
  });

  describe('7. HTML Rendering (renderContainer, Skeletons, Empty State)', () => {
    it('should render empty state when no items exist', () => {
      engine.setItems([]);
      const html = engine.renderContainer((item) => `<div>${item.title}</div>`);

      expect(html).toContain('No Events in Active Feed');
      expect(html).toContain('bg-surface-base/40');
      expect(html).toContain('text-cyphr');
    });

    it('should render container with visible items and data-virtual-index attributes', () => {
      engine.setItems(createDummyItems(20));
      const html = engine.renderContainer((item, idx) => `
        <div class="custom-card font-mono text-white">#${idx}: ${item.title}</div>
      `);

      expect(html).toContain('id="virtual-scroll-viewport"');
      expect(html).toContain('class="virtual-scroll-spacer');
      expect(html).toContain('class="virtual-scroll-content');
      expect(html).toContain('data-virtual-index="0"');
      expect(html).toContain('data-virtual-index="1"');
      expect(html).toContain('#0: Virtual Item #0');
      expect(html).toContain('#1: Virtual Item #1');
    });

    it('should render skeleton placeholders for unloaded items in infinite feed', () => {
      engine.setItems(createDummyItems(2), 10); // only 2 loaded out of 10
      const html = engine.renderContainer((item) => `<div>${item.title}</div>`);

      expect(html).toContain('virtual-skeleton-wrapper');
      expect(html).toContain('animate-pulse');
      expect(html).toContain('bg-surface-raised');
    });

    it('should render loading indicator when isLoadingMore is true', () => {
      engine.setItems(createDummyItems(10), 20);
      engine.isLoadingMore = true;

      const html = engine.renderContainer((item) => `<div>${item.title}</div>`);
      expect(html).toContain('Synchronizing ZK-Pulse Feed...');
      expect(html).toContain('animate-spin');
    });

    it('should render skeleton placeholder card structure via renderPlaceholderCard', () => {
      const placeholder = engine.renderPlaceholderCard(5);
      expect(placeholder).toContain('bg-surface-raised/80');
      expect(placeholder).toContain('border-subtle-b');
      expect(placeholder).toContain('animate-pulse');
    });
  });

  describe('8. Custom Obsidian Scrollbar Rendering (renderScrollbar)', () => {
    it('should render custom slim scrollbar with track, thumb, and percentage indicator', () => {
      engine.setItems(createDummyItems(20));
      engine.scrollTop = 500;

      const html = engine.renderScrollbar();
      expect(html).toContain('id="virtual-scrollbar-wrapper"');
      expect(html).toContain('id="virtual-scrollbar-track"');
      expect(html).toContain('id="virtual-scrollbar-thumb"');
      expect(html).toContain('id="virtual-scrollbar-tooltip"');
      expect(html).toContain('bg-surface-base/80');
      expect(html).toContain('from-cyan-400');
      expect(html).toContain('text-cyphr');
      expect(html).toContain('(20/20)');
    });
  });

  describe('9. HUD Performance Stats & Diagnostics', () => {
    it('should compute VirtualScrollStats accurately', () => {
      engine.setItems(createDummyItems(50));
      engine.scrollTop = 0;

      const stats = engine.getStats();
      expect(stats.totalItems).toBe(50);
      expect(stats.renderedItems).toBe(7); // 5 visible + 2 overscan
      expect(stats.isAtTop).toBe(true);
      expect(stats.isAtBottom).toBe(false);
      expect(stats.totalHeight).toBe(5000);
      expect(stats.domNodeRatio).toBe('7/50 nodes');
      expect(stats.memorySavedPercent).toBe(86); // (50 - 7) / 50 = 86%
    });

    it('should render stats badge with cyphr and signal colors', () => {
      engine.setItems(createDummyItems(30));
      const badge = engine.renderStatsBadge();

      expect(badge).toContain('VIRTUAL DOM:');
      expect(badge).toContain('text-cyphr');
      expect(badge).toContain('text-signal');
      expect(badge).toContain('text-aether');
      expect(badge).toContain('MEM');
    });
  });

  describe('10. Lifecycle Teardown & Resource Cleanup', () => {
    it('should cleanly unbind listeners and destroy engine instance', () => {
      const mockContainer = {
        clientHeight: 500,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as HTMLElement;

      engine.onRangeChange = vi.fn();
      engine.onReachEnd = vi.fn();
      engine.onScrollCallback = vi.fn();

      engine.bindScrollListener(mockContainer);

      expect(engine.onRangeChange).toBeDefined();
      engine.destroy();
      expect(engine.onRangeChange).toBeNull();
      expect(engine.onReachEnd).toBeNull();
      expect(engine.onScrollCallback).toBeNull();
    });
  });
});
