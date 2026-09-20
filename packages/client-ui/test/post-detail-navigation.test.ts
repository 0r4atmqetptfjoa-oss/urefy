import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { postDetailView } from '../src/post-detail.js';
import { clientStore } from '../src/client-state.js';
import { router, sovereignRouter } from '../src/router.js';

describe('Post Detail Navigation & Scroll Stability', () => {
  let feedScroll = 0;
  const elements = new Map<string, any>();

  beforeEach(() => {
    feedScroll = 0;
    elements.clear();

    const mockFeed = {
      id: 'main-feed-scroll',
      get scrollTop() { return feedScroll; },
      set scrollTop(v: number) { feedScroll = v; },
      scrollHeight: 1000,
      clientHeight: 500,
    };
    elements.set('main-feed-scroll', mockFeed);

    const mockMainStage = {
      id: 'main-stage',
      innerHTML: '',
    };
    elements.set('main-stage', mockMainStage);

    (globalThis as any).window = {
      location: {
        pathname: '/',
        search: '',
        hash: '#/feed',
      },
      history: {
        back: vi.fn(() => {
          (globalThis as any).window.location.hash = postDetailView.originPath || '#/feed';
        }),
        replaceState: vi.fn((state: any, title: string, url: string) => {
          if (url.startsWith('#')) {
            (globalThis as any).window.location.hash = url;
          } else {
            (globalThis as any).window.location.pathname = url;
          }
        }),
        pushState: vi.fn((state: any, title: string, url: string) => {
          if (url.startsWith('#')) {
            (globalThis as any).window.location.hash = url;
          } else {
            (globalThis as any).window.location.pathname = url;
          }
        }),
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      requestAnimationFrame: (cb: any) => setTimeout(cb, 0),
    };

    (globalThis as any).document = {
      getElementById: (id: string) => elements.get(id) || null,
      querySelector: (sel: string) => {
        if (sel === '#main-feed-scroll') return elements.get('main-feed-scroll') || null;
        if (sel === '#main-stage') return elements.get('main-stage') || null;
        return null;
      },
      querySelectorAll: () => [],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      body: {
        style: {},
      },
      documentElement: {
        setAttribute: vi.fn(),
        style: {
          setProperty: vi.fn(),
        },
      },
    };

    (globalThis as any).CustomEvent = class CustomEvent<T = any> {
      type: string;
      detail: T;
      constructor(type: string, params?: { detail?: T }) {
        this.type = type;
        this.detail = params?.detail as T;
      }
    };

    clientStore.posts = [
      {
        id: 'test-post-p0',
        content: 'Testing P0 navigation stability and scroll recovery.',
        author: 'Tester',
        authorFingerprint: '0x1234567890abcdef',
        timestamp: Date.now(),
        audience: 'public',
        reactions: {},
        replies: [],
      } as any,
    ];
  });

  afterEach(() => {
    if (postDetailView.isOpen()) {
      postDetailView.closePost({ skipHistory: true });
    }
  });

  it('tracks origin route and origin path when opening a post', () => {
    (globalThis as any).window.location.pathname = '/';
    (globalThis as any).window.location.search = '?filter=media';
    (globalThis as any).window.location.hash = '#/feed';

    postDetailView.openPost('test-post-p0', 'feed');

    expect(postDetailView.isOpen()).toBe(true);
    expect(postDetailView.getActivePostId()).toBe('test-post-p0');
    expect(postDetailView.originRoute).toBe('feed');
    expect(postDetailView.originPath).toBe('/?filter=media#/feed');
    expect((globalThis as any).window.location.pathname).toBe('/p/test-post-p0');
  });

  it('restores origin path when closing post detail rather than blindly defaulting to root', () => {
    (globalThis as any).window.location.pathname = '/c/technology';
    (globalThis as any).window.location.search = '';
    (globalThis as any).window.location.hash = '';

    postDetailView.openPost('test-post-p0', 'community');
    expect((globalThis as any).window.location.pathname).toBe('/p/test-post-p0');

    postDetailView.closePost();
    expect(postDetailView.isOpen()).toBe(false);
    expect((globalThis as any).window.location.pathname).toBe('/c/technology');
  });

  it('dispatches POST_DETAIL event on open and close', () => {
    const events: string[] = [];
    const unsubscribe = clientStore.subscribe((event) => {
      events.push(event);
    });

    postDetailView.openPost('test-post-p0');
    expect(events).toContain('POST_DETAIL');

    postDetailView.closePost({ skipHistory: true });
    expect(events.filter((e) => e === 'POST_DETAIL').length).toBe(2);

    unsubscribe();
  });

  it('preserves and restores saved feed scroll top', async () => {
    feedScroll = 350;

    postDetailView.openPost('test-post-p0');
    expect(postDetailView.savedFeedScrollTop).toBe(350);

    feedScroll = 0;
    postDetailView.closePost({ skipHistory: true });

    // Allow requestAnimationFrame / setTimeout to execute
    await new Promise((r) => setTimeout(r, 20));
    expect(feedScroll).toBe(350);
  });

  it('automatically closes open post detail on popstate if user navigates to another route', () => {
    postDetailView.openPost('test-post-p0');
    expect(postDetailView.isOpen()).toBe(true);

    // Simulate navigation away from post view
    (globalThis as any).window.location.pathname = '/messages';
    (globalThis as any).window.location.hash = '#/messages';
    router.handleHashChange();

    expect(postDetailView.isOpen()).toBe(false);
  });
});
