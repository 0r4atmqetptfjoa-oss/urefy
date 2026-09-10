import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DraftAutosaveManager, draftAutosave, DraftRecord } from '../src/draft-autosave.js';

/**
 * LocalStorage in-memory mock implementation for headless test environments.
 */
class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('Draft Autosave & Vault Manager', () => {
  let localStorageMock: LocalStorageMock;

  beforeEach(() => {
    localStorageMock = new LocalStorageMock();

    // Set up global environment mocks
    (globalThis as any).window = {
      localStorage: localStorageMock,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      confirm: vi.fn(() => true),
    };
    (globalThis as any).localStorage = localStorageMock;

    (globalThis as any).CustomEvent = class CustomEvent<T = any> {
      type: string;
      detail: T;
      constructor(type: string, params?: { detail?: T }) {
        this.type = type;
        this.detail = params?.detail as T;
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('1. Saves a draft with saveDraft and persists it correctly', () => {
    const manager = new DraftAutosaveManager();
    const testDraft = {
      content: 'Test post',
      title: 'Title',
      channelId: 'general',
      formatType: 'article',
    };

    manager.saveDraft('composer', testDraft);

    // Verify persistence in localStorage mock
    const rawStored = localStorageMock.getItem('aetheris_draft_composer');
    expect(rawStored).toBeDefined();
    expect(rawStored).not.toBeNull();

    const parsedStored = JSON.parse(rawStored!) as DraftRecord;
    expect(parsedStored.key).toBe('composer');
    expect(parsedStored.title).toBe('Title');
    expect(parsedStored.content).toBe('Test post');
    expect(parsedStored.channelId).toBe('general');
    expect(parsedStored.formatType).toBe('article');
    expect(typeof parsedStored.updatedAt).toBe('number');
  });

  it('2. Retrieves draft with getDraft and verifies its content', () => {
    const manager = new DraftAutosaveManager();
    manager.saveDraft('composer', {
      title: 'Authentic Test Title',
      content: 'Detailed content for UREfy.',
      tags: ['crypto', 'zk'],
    });

    const retrieved = manager.getDraft('composer');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.key).toBe('composer');
    expect(retrieved?.title).toBe('Authentic Test Title');
    expect(retrieved?.content).toBe('Detailed content for UREfy.');
    expect(retrieved?.tags).toEqual(['crypto', 'zk']);
    expect(retrieved?.formatType).toBe('article');
    expect(retrieved?.updatedAt).toBeGreaterThan(0);
  });

  it('3. hasDraft returns true for existing key and false for non-existent key', () => {
    const manager = new DraftAutosaveManager();

    // Initially no draft exists
    expect(manager.hasDraft('composer')).toBe(false);
    expect(manager.hasDraft('non_existent_key')).toBe(false);

    // Save draft
    manager.saveDraft('composer', { content: 'Draft present' });

    expect(manager.hasDraft('composer')).toBe(true);
    expect(manager.hasDraft('non_existent_key')).toBe(false);
    expect(manager.hasDraft('random_unknown_id')).toBe(false);
  });

  it('4. Deletes draft with clearDraft and verifies hasDraft becomes false', () => {
    const manager = new DraftAutosaveManager();

    manager.saveDraft('composer', {
      title: 'Title to delete',
      content: 'Temporary content to be removed.',
    });
    expect(manager.hasDraft('composer')).toBe(true);
    expect(manager.getDraft('composer')).not.toBeNull();

    // Clear draft
    manager.clearDraft('composer');

    expect(manager.hasDraft('composer')).toBe(false);
    expect(manager.getDraft('composer')).toBeNull();
    expect(localStorageMock.getItem('aetheris_draft_composer')).toBeNull();
  });

  it('5. getAllDrafts returns list of all saved drafts sorted chronologically', () => {
    const manager = new DraftAutosaveManager();

    manager.saveDraft('draft_1', { title: 'First Draft', content: 'Content 1' });
    manager.saveDraft('draft_2', { title: 'Second Draft', content: 'Content 2' });
    manager.saveDraft('draft_3', { title: 'Third Draft', content: 'Content 3' });

    const allDrafts = manager.getAllDrafts();
    expect(allDrafts.length).toBe(3);

    const keys = allDrafts.map((d) => d.key);
    expect(keys).toContain('draft_1');
    expect(keys).toContain('draft_2');
    expect(keys).toContain('draft_3');

    // Verify descending sort order by updatedAt
    for (let i = 0; i < allDrafts.length - 1; i++) {
      expect(allDrafts[i].updatedAt).toBeGreaterThanOrEqual(allDrafts[i + 1].updatedAt);
    }
  });

  it('6. Correctly generates HTML indicator renderDraftIndicator', () => {
    const manager = new DraftAutosaveManager();

    // Indicator when NO draft exists
    const emptyHtml = manager.renderDraftIndicator('composer');
    expect(emptyHtml).toContain('draft-indicator-composer');
    expect(emptyHtml).toContain('Autosave ready • No unsaved changes');

    // Save draft with content
    manager.saveDraft('composer', {
      title: 'Indicator Title',
      content: 'This is a test for the autosave visual indicator.',
    });

    // Indicator when draft EXISTS
    const savedHtml = manager.renderDraftIndicator('composer');
    expect(savedHtml).toContain('draft-indicator-composer');
    expect(savedHtml).toContain('Draft autosaved');
    expect(savedHtml).toContain('data-draft-action="open-drawer"');
    expect(savedHtml).toContain('data-draft-action="clear"');
    expect(savedHtml).toContain('data-draft-key="composer"');
    expect(savedHtml).toContain('Start fresh');
  });

  it('7. Correctly handles debounced autosaving with setTimeout', () => {
    vi.useFakeTimers();
    const manager = new DraftAutosaveManager();

    manager.debounceSave('typing_post', { content: 'Fast typing...' }, 400);

    // Before 400ms, not saved yet
    expect(manager.getDraft('typing_post')).toBeNull();

    // Advance time by 200ms
    vi.advanceTimersByTime(200);
    expect(manager.getDraft('typing_post')).toBeNull();

    // New typing resets debounce
    manager.debounceSave('typing_post', { content: 'Fast typing... modified' }, 400);
    vi.advanceTimersByTime(300);
    expect(manager.getDraft('typing_post')).toBeNull();

    // Advance remaining time until new timer expires (400ms)
    vi.advanceTimersByTime(150);
    const saved = manager.getDraft('typing_post');
    expect(saved).not.toBeNull();
    expect(saved?.content).toBe('Fast typing... modified');
  });

  it('8. Correctly computes statistics with getStats()', () => {
    const manager = new DraftAutosaveManager();

    manager.saveDraft('stat_1', { title: 'ABC', content: '12345' }); // 3 + 5 = 8 chars
    manager.saveDraft('stat_2', { title: 'D', content: '67' }); // 1 + 2 = 3 chars

    const stats = manager.getStats();
    expect(stats.totalCount).toBe(2);
    expect(stats.totalCharacters).toBe(11);
    expect(stats.totalEstimatedBytes).toBeGreaterThan(0);
    expect(stats.oldestTimestamp).toBeDefined();
    expect(stats.newestTimestamp).toBeDefined();
  });

  it('9. Exports and imports drafts in JSON format with exportDraftsJSON and importDraftsJSON', () => {
    const manager1 = new DraftAutosaveManager();
    manager1.saveDraft('export_1', { title: 'Exported Draft 1', content: 'ZK Content' });
    manager1.saveDraft('export_2', { title: 'Exported Draft 2', content: 'Vault Content' });

    const jsonExport = manager1.exportDraftsJSON();
    expect(jsonExport).toContain('Exported Draft 1');
    expect(jsonExport).toContain('Exported Draft 2');
    expect(jsonExport).toContain('UREfy');

    // Import into new instance
    localStorageMock.clear();
    const manager2 = new DraftAutosaveManager();
    const result = manager2.importDraftsJSON(jsonExport);

    expect(result.imported).toBe(2);
    expect(result.failed).toBe(0);
    expect(manager2.hasDraft('export_1')).toBe(true);
    expect(manager2.hasDraft('export_2')).toBe(true);
    expect(manager2.getDraft('export_1')?.content).toBe('ZK Content');
  });

  it('10. Clears all drafts with clearAllDrafts', () => {
    const manager = new DraftAutosaveManager();
    manager.saveDraft('clear_1', { content: 'Test 1' });
    manager.saveDraft('clear_2', { content: 'Test 2' });
    expect(manager.getAllDrafts().length).toBe(2);

    manager.clearAllDrafts();
    expect(manager.getAllDrafts().length).toBe(0);
    expect(manager.hasDraft('clear_1')).toBe(false);
    expect(manager.hasDraft('clear_2')).toBe(false);
  });

  it('11. Allows subscribing to changes with subscribe', () => {
    const manager = new DraftAutosaveManager();
    const mockListener = vi.fn();

    const unsubscribe = manager.subscribe(mockListener);

    manager.saveDraft('sub_test', { content: 'Subscribed content' });
    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith('sub_test', expect.objectContaining({
      key: 'sub_test',
      content: 'Subscribed content',
    }));

    manager.clearDraft('sub_test');
    expect(mockListener).toHaveBeenCalledTimes(2);
    expect(mockListener).toHaveBeenCalledWith('sub_test', null);

    unsubscribe();
    manager.saveDraft('sub_test_2', { content: 'After unsub' });
    expect(mockListener).toHaveBeenCalledTimes(2); // Was not called again
  });

  it('12. Singleton instance draftAutosave functions as expected', () => {
    expect(draftAutosave).toBeInstanceOf(DraftAutosaveManager);
    draftAutosave.saveDraft('singleton_composer', {
      title: 'Singleton Post',
      content: 'Valid singleton content',
    });

    expect(draftAutosave.hasDraft('singleton_composer')).toBe(true);
    expect(draftAutosave.getDraft('singleton_composer')?.title).toBe('Singleton Post');

    draftAutosave.clearDraft('singleton_composer');
    expect(draftAutosave.hasDraft('singleton_composer')).toBe(false);
  });

  it('13. Renders the drawer with renderDraftsDrawer', () => {
    const manager = new DraftAutosaveManager();
    manager.saveDraft('drawer_test', {
      title: 'Test Drawer',
      content: 'Snippet for side panel.',
      formatType: 'pulse',
    });

    const drawerHtml = manager.renderDraftsDrawer(true);
    expect(drawerHtml).toContain('aetheris-drafts-drawer-container');
    expect(drawerHtml).toContain('Saved Drafts');
    expect(drawerHtml).toContain('Test Drawer');
    expect(drawerHtml).toContain('Micro-Pulse');
  });
});
