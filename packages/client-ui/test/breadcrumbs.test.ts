import { describe, it, expect, beforeEach } from 'vitest';
import {
  BreadcrumbsManager,
  breadcrumbsManager,
  type BreadcrumbItem,
  type PinnedTab,
  type NavigationDirection
} from '../src/breadcrumbs.js';

describe('Omni-Breadcrumbs & History Navigation Engine', () => {
  let manager: BreadcrumbsManager;

  beforeEach(() => {
    manager = new BreadcrumbsManager();
  });

  // ─── 1. Stiva inițială de breadcrumbs ─────────────────────────────────────────
  describe('1. Initial Breadcrumbs State & Stack', () => {
    it('should initialize with a default trail and single history stack entry', () => {
      expect(manager.historyStack.length).toBe(1);
      expect(manager.historyIndex).toBe(0);
      expect(manager.currentTrail.length).toBe(2);

      const trail = manager.getCurrentTrail();
      expect(trail[0]).toEqual({
        label: 'Omni-Hubs',
        icon: '🌐',
        actionType: 'hub',
        targetId: 'all'
      });
      expect(trail[1]).toEqual({
        label: 'r/clean-releases',
        icon: '🛡️',
        actionType: 'channel',
        targetId: 'relays-general'
      });

      const currentItem = manager.getCurrentItem();
      expect(currentItem).not.toBeNull();
      expect(currentItem?.label).toBe('r/clean-releases');
      expect(currentItem?.actionType).toBe('channel');
      expect(currentItem?.targetId).toBe('relays-general');
    });

    it('should report correct initial navigation boundaries (canGoBack = false, canGoForward = false)', () => {
      expect(manager.canGoBack()).toBe(false);
      expect(manager.canGoForward()).toBe(false);
      expect(manager.goBack()).toBe(false);
      expect(manager.goForward()).toBe(false);
      expect(manager.getHistoryIndex()).toBe(0);
    });

    it('should initialize default pinned quick-access tabs', () => {
      const tabs = manager.getPinnedTabs();
      expect(tabs.length).toBeGreaterThanOrEqual(5);

      const channelIds = tabs.map((t: PinnedTab) => t.channelId);
      expect(channelIds).toContain('relays-general');
      expect(channelIds).toContain('relays-zero-day');
      expect(channelIds).toContain('relays-crypto');
      expect(channelIds).toContain('pulse-general');
      expect(channelIds).toContain('vault-zk');
    });

    it('should verify singleton export instance is defined', () => {
      expect(breadcrumbsManager).toBeInstanceOf(BreadcrumbsManager);
      expect(breadcrumbsManager.historyStack.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 2. Adăugarea unui traseu nou cu pushTrail ───────────────────────────────
  describe('2. Pushing New Navigation Trails (pushTrail)', () => {
    it('should add a new trail and update current trail and history index', () => {
      const newTrail: BreadcrumbItem[] = [
        { label: 'All Hubs', actionType: 'hub', targetId: 'hubs' },
        { label: 'r/clean-releases', actionType: 'channel', targetId: 'clean-releases' }
      ];

      manager.pushTrail(newTrail);

      expect(manager.historyStack.length).toBe(2);
      expect(manager.historyIndex).toBe(1);
      expect(manager.getHistoryIndex()).toBe(1);

      const currentTrail = manager.getCurrentTrail();
      expect(currentTrail).toHaveLength(2);
      expect(currentTrail[0].label).toBe('All Hubs');
      expect(currentTrail[0].targetId).toBe('hubs');
      expect(currentTrail[1].label).toBe('r/clean-releases');
      expect(currentTrail[1].targetId).toBe('clean-releases');

      const currentItem = manager.getCurrentItem();
      expect(currentItem).toEqual({
        label: 'r/clean-releases',
        actionType: 'channel',
        targetId: 'clean-releases'
      });
    });

    it('should avoid pushing duplicate identical consecutive trails', () => {
      const trail: BreadcrumbItem[] = [
        { label: 'All Hubs', actionType: 'hub', targetId: 'hubs' },
        { label: 'r/clean-releases', actionType: 'channel', targetId: 'clean-releases' }
      ];

      manager.pushTrail(trail);
      expect(manager.historyStack.length).toBe(2);

      // Push identical trail again
      manager.pushTrail(trail);
      expect(manager.historyStack.length).toBe(2);
      expect(manager.historyIndex).toBe(1);
    });

    it('should support appending single items with pushItem and popping with popTrail', () => {
      const postItem: BreadcrumbItem = {
        label: 'Post #942: Zero-knowledge proofs',
        icon: '📄',
        actionType: 'post',
        targetId: 'post-942'
      };

      manager.pushItem(postItem);
      expect(manager.getCurrentTrail()).toHaveLength(3);
      expect(manager.getCurrentItem()?.targetId).toBe('post-942');

      const popped = manager.popTrail();
      expect(popped).toHaveLength(2);
      expect(manager.getCurrentItem()?.targetId).toBe('relays-general');
    });

    it('should replace current trail in place with replaceCurrentTrail', () => {
      const initialStackLen = manager.historyStack.length;
      const replacedTrail: BreadcrumbItem[] = [
        { label: 'Custom Hub', actionType: 'hub', targetId: 'custom-hub' }
      ];

      manager.replaceCurrentTrail(replacedTrail);
      expect(manager.historyStack.length).toBe(initialStackLen);
      expect(manager.getCurrentTrail()).toEqual(replacedTrail);
    });
  });

  // ─── 3. Verificarea canGoBack() și goBack() ──────────────────────────────────
  describe('3. Backward History Traversal (canGoBack & goBack)', () => {
    it('should accurately navigate back through history stack', () => {
      const trail1: BreadcrumbItem[] = [
        { label: 'All Hubs', actionType: 'hub', targetId: 'hubs' },
        { label: 'r/clean-releases', actionType: 'channel', targetId: 'clean-releases' }
      ];
      const trail2: BreadcrumbItem[] = [
        { label: 'All Hubs', actionType: 'hub', targetId: 'hubs' },
        { label: 'r/zero-day-feed', actionType: 'channel', targetId: 'zero-day' }
      ];

      manager.pushTrail(trail1);
      manager.pushTrail(trail2);

      expect(manager.historyStack.length).toBe(3);
      expect(manager.historyIndex).toBe(2);
      expect(manager.canGoBack()).toBe(true);

      // Step back to trail1
      const back1Success = manager.goBack();
      expect(back1Success).toBe(true);
      expect(manager.historyIndex).toBe(1);
      expect(manager.getCurrentItem()?.targetId).toBe('clean-releases');
      expect(manager.canGoBack()).toBe(true);

      // Step back to default trail
      const back2Success = manager.goBack();
      expect(back2Success).toBe(true);
      expect(manager.historyIndex).toBe(0);
      expect(manager.getCurrentItem()?.targetId).toBe('relays-general');
      expect(manager.canGoBack()).toBe(false);

      // Attempting to go back further should fail gracefully
      const back3Success = manager.goBack();
      expect(back3Success).toBe(false);
      expect(manager.historyIndex).toBe(0);
    });

    it('should fire navigation listeners with "back" direction on goBack()', () => {
      const events: Array<{ item: BreadcrumbItem; direction: NavigationDirection }> = [];
      const unsubscribe = manager.onNavigate((item, _trail, direction) => {
        events.push({ item, direction });
      });

      manager.pushTrail([
        { label: 'All Hubs', actionType: 'hub', targetId: 'hubs' },
        { label: 'r/clean-releases', actionType: 'channel', targetId: 'clean-releases' }
      ]);

      manager.goBack();

      expect(events.length).toBe(2);
      expect(events[0].direction).toBe('push');
      expect(events[1].direction).toBe('back');
      expect(events[1].item.targetId).toBe('relays-general');

      unsubscribe();
    });
  });

  // ─── 4. Verificarea canGoForward() și goForward() ─────────────────────────────
  describe('4. Forward History Traversal (canGoForward & goForward)', () => {
    it('should accurately navigate forward through history stack', () => {
      const trail1: BreadcrumbItem[] = [
        { label: 'All Hubs', actionType: 'hub', targetId: 'hubs' },
        { label: 'r/clean-releases', actionType: 'channel', targetId: 'clean-releases' }
      ];

      manager.pushTrail(trail1);
      expect(manager.canGoForward()).toBe(false);

      manager.goBack();
      expect(manager.canGoForward()).toBe(true);
      expect(manager.historyIndex).toBe(0);

      // Move forward back to trail1
      const forwardSuccess = manager.goForward();
      expect(forwardSuccess).toBe(true);
      expect(manager.historyIndex).toBe(1);
      expect(manager.getCurrentItem()?.targetId).toBe('clean-releases');
      expect(manager.canGoForward()).toBe(false);

      // Attempting to go forward past head should return false
      const forwardAgain = manager.goForward();
      expect(forwardAgain).toBe(false);
    });

    it('should truncate forward history when pushing a new branch after navigating back', () => {
      const trail1: BreadcrumbItem[] = [
        { label: 'Hub A', actionType: 'hub', targetId: 'hub-a' }
      ];
      const trail2: BreadcrumbItem[] = [
        { label: 'Hub B', actionType: 'hub', targetId: 'hub-b' }
      ];
      const trail3: BreadcrumbItem[] = [
        { label: 'Hub C', actionType: 'hub', targetId: 'hub-c' }
      ];

      manager.pushTrail(trail1);
      manager.pushTrail(trail2);
      expect(manager.historyStack.length).toBe(3);

      // Go back to trail1 (index 1)
      manager.goBack();
      expect(manager.historyIndex).toBe(1);
      expect(manager.canGoForward()).toBe(true);

      // Push new branch trail3 -> should truncate trail2
      manager.pushTrail(trail3);
      expect(manager.historyStack.length).toBe(3); // default (0), trail1 (1), trail3 (2)
      expect(manager.historyIndex).toBe(2);
      expect(manager.canGoForward()).toBe(false);
      expect(manager.getCurrentItem()?.targetId).toBe('hub-c');
    });

    it('should support direct history jump with goToHistoryIndex', () => {
      manager.pushTrail([{ label: 'Step 1', actionType: 'hub', targetId: 's1' }]);
      manager.pushTrail([{ label: 'Step 2', actionType: 'hub', targetId: 's2' }]);
      manager.pushTrail([{ label: 'Step 3', actionType: 'hub', targetId: 's3' }]);

      expect(manager.historyStack.length).toBe(4);
      expect(manager.historyIndex).toBe(3);

      const jumpOk = manager.goToHistoryIndex(1);
      expect(jumpOk).toBe(true);
      expect(manager.historyIndex).toBe(1);
      expect(manager.getCurrentItem()?.targetId).toBe('s1');

      // Invalid jumps
      expect(manager.goToHistoryIndex(-1)).toBe(false);
      expect(manager.goToHistoryIndex(99)).toBe(false);
      expect(manager.goToHistoryIndex(1)).toBe(false); // already at index 1
    });

    it('should clear history and reset to default trail with clearHistory', () => {
      manager.pushTrail([{ label: 'Step 1', actionType: 'hub', targetId: 's1' }]);
      manager.pushTrail([{ label: 'Step 2', actionType: 'hub', targetId: 's2' }]);

      manager.clearHistory();
      expect(manager.historyStack.length).toBe(1);
      expect(manager.historyIndex).toBe(0);
      expect(manager.getCurrentItem()?.targetId).toBe('relays-general');
    });
  });

  // ─── 5. Generarea corectă a segmentelor HTML renderBreadcrumbsBar() ──────────
  describe('5. Breadcrumbs Bar HTML Rendering (renderBreadcrumbsBar)', () => {
    it('should render standard breadcrumbs bar with control buttons and segment elements', () => {
      const html = manager.renderBreadcrumbsBar();

      // Root container
      expect(html).toContain('id="omni-breadcrumbs-bar"');
      expect(html).toContain('bg-surface-base/95');

      // Navigation buttons with data actions
      expect(html).toContain('data-action="back"');
      expect(html).toContain('data-action="forward"');
      expect(html).toContain('btn-breadcrumb-history-toggle');
      expect(html).toContain('btn-breadcrumb-copy-path');
      expect(html).toContain('btn-breadcrumb-pin-view');

      // Initial state: Back and Forward buttons should be disabled
      expect(html).toContain('disabled');

      // Check rendered breadcrumb segments
      expect(html).toContain('data-crumb-index="0"');
      expect(html).toContain('data-crumb-index="1"');
      expect(html).toContain('Omni-Hubs');
      expect(html).toContain('r/clean-releases');
      expect(html).toContain('breadcrumb-item-active');
      expect(html).toContain('breadcrumb-item-btn');
    });

    it('should render active and ancestor styling properly when multiple segments are present', () => {
      manager.pushTrail([
        { label: 'Omni-Hubs', icon: '🌐', actionType: 'hub', targetId: 'all' },
        { label: 'r/cryptography', icon: '🧬', actionType: 'channel', targetId: 'relays-crypto' },
        { label: 'Zero-Knowledge Rollup Spec', icon: '📜', actionType: 'post', targetId: 'post-101' }
      ]);

      const html = manager.renderBreadcrumbsBar();

      // Back button should now be enabled and have active styling class
      expect(html).toContain('btn-breadcrumb-nav-back');
      expect(html).toContain('data-action="back"');

      // Check segments
      expect(html).toContain('Omni-Hubs');
      expect(html).toContain('r/cryptography');
      expect(html).toContain('Zero-Knowledge Rollup Spec');
      expect(html).toContain('data-target-id="post-101"');
      expect(html).toContain('data-action-type="post"');
      expect(html).toContain('text-white font-mono');
    });

    it('should include history popover when isHistoryDropdownOpen is true', () => {
      manager.openHistoryDropdown();
      expect(manager.isHistoryDropdownOpen).toBe(true);

      const html = manager.renderBreadcrumbsBar();
      expect(html).toContain('id="breadcrumbs-history-popover"');
      expect(html).toContain('Navigation History Stack');
      expect(html).toContain('history-jump-entry');

      manager.closeHistoryDropdown();
      expect(manager.isHistoryDropdownOpen).toBe(false);
      const closedHtml = manager.renderBreadcrumbsBar();
      expect(closedHtml).not.toContain('id="breadcrumbs-history-popover"');
    });

    it('should render compact bar and complete nav header', () => {
      const compactHtml = manager.renderCompactBar();
      expect(compactHtml).toContain('Omni-Hubs');
      expect(compactHtml).toContain('r/clean-releases');

      const fullHeaderHtml = manager.renderCompleteNavHeader('relays-general');
      expect(fullHeaderHtml).toContain('omni-nav-composite-header');
      expect(fullHeaderHtml).toContain('id="arc-pinned-tabs-bar"');
      expect(fullHeaderHtml).toContain('id="omni-breadcrumbs-bar"');
    });
  });

  // ─── 6. Generarea tab-urilor fixate renderPinnedTabs('active-ch') ─────────────
  describe('6. Arc Pinned Tabs HTML Rendering (renderPinnedTabs)', () => {
    it('should render pinned tabs bar with active state highlighted for matching channel ID', () => {
      const activeChannelId = 'relays-general';
      const html = manager.renderPinnedTabs(activeChannelId);

      expect(html).toContain('id="arc-pinned-tabs-bar"');
      expect(html).toContain('PINNED');
      expect(html).toContain('pinned-tab-item');
      expect(html).toContain('data-channel-id="relays-general"');
      expect(html).toContain('data-channel-id="relays-zero-day"');
      expect(html).toContain('tab-unpin-trigger');
      expect(html).toContain('btn-pin-new-tab');

      // Active tab highlighting
      expect(html).toContain('border-cyphr/50');
    });

    it('should render badges with correct color styles for different badge types', () => {
      manager.setPinnedTabs([
        {
          id: 'tab-signal',
          title: 'Signal Tab',
          icon: '🟢',
          channelId: 'sig-ch',
          badgeCount: 3,
          badgeType: 'signal',
          isPinned: true
        },
        {
          id: 'tab-crimson',
          title: 'Crimson Tab',
          icon: '🔴',
          channelId: 'crim-ch',
          badgeCount: 7,
          badgeType: 'crimson',
          isPinned: true
        },
        {
          id: 'tab-aether',
          title: 'Aether Tab',
          icon: '🟣',
          channelId: 'aeth-ch',
          badgeCount: 4,
          badgeType: 'aether',
          isPinned: true
        },
        {
          id: 'tab-amber',
          title: 'Amber Tab',
          icon: '🟡',
          channelId: 'amb-ch',
          badgeCount: 2,
          badgeType: 'amber',
          isPinned: true
        },
        {
          id: 'tab-cyphr',
          title: 'Cyphr Tab',
          icon: '🔵',
          channelId: 'cyp-ch',
          badgeCount: 9,
          badgeType: 'cyphr',
          isPinned: true
        }
      ]);

      const html = manager.renderPinnedTabs('sig-ch');

      expect(html).toContain('bg-signal/20 text-signal');
      expect(html).toContain('bg-crimson/20 text-crimson');
      expect(html).toContain('bg-aether/20 text-aether');
      expect(html).toContain('bg-amber/20 text-amber');
      expect(html).toContain('bg-cyphr/20 text-cyphr');
      expect(html).toContain('>3<');
      expect(html).toContain('>7<');
      expect(html).toContain('5 tabs');
    });

    it('should support adding, updating badge, removing, and toggling pinned tabs', () => {
      const customTab: PinnedTab = {
        id: 'pin-custom-100',
        title: 'r/quantum-crypt',
        icon: '🌌',
        channelId: 'quantum-crypt',
        badgeCount: 0,
        isPinned: true
      };

      manager.addPinnedTab(customTab);
      expect(manager.getPinnedTabs().some(t => t.id === 'pin-custom-100')).toBe(true);

      manager.updateTabBadge('pin-custom-100', 8, 'aether');
      const updatedTab = manager.getPinnedTabs().find(t => t.id === 'pin-custom-100');
      expect(updatedTab?.badgeCount).toBe(8);
      expect(updatedTab?.badgeType).toBe('aether');

      manager.removePinnedTab('pin-custom-100');
      expect(manager.getPinnedTabs().some(t => t.id === 'pin-custom-100')).toBe(false);
    });

    it('should navigate to pinned tab with navigateToTab and update trail', () => {
      manager.navigateToTab('pin-relays-general');
      const currentTrail = manager.getCurrentTrail();
      expect(currentTrail).toHaveLength(2);
      expect(currentTrail[1].targetId).toBe('relays-general');
      expect(currentTrail[1].label).toBe('r/clean-releases');
    });
  });

  // ─── 7. Segment Interaction & Navigation ────────────────────────────────────
  describe('7. Segment Interaction & Navigation Slicing', () => {
    it('should slice trail when clicking an ancestor segment (navigateToSegment)', () => {
      manager.pushTrail([
        { label: 'Omni-Hubs', icon: '🌐', actionType: 'hub', targetId: 'all' },
        { label: 'r/clean-releases', icon: '🛡️', actionType: 'channel', targetId: 'clean-releases' },
        { label: 'Post #123', icon: '📄', actionType: 'post', targetId: 'p-123' },
        { label: 'Thread #456', icon: '💬', actionType: 'custom', targetId: 't-456' }
      ]);

      expect(manager.getCurrentTrail()).toHaveLength(4);

      // Navigate to index 1 ('r/clean-releases')
      manager.navigateToSegment(1);

      const slicedTrail = manager.getCurrentTrail();
      expect(slicedTrail).toHaveLength(2);
      expect(slicedTrail[0].targetId).toBe('all');
      expect(slicedTrail[1].targetId).toBe('clean-releases');
      expect(manager.getCurrentItem()?.targetId).toBe('clean-releases');
    });
  });
});
