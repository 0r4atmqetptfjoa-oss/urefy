import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThreadManager, ThreadComment } from '../src/threads.js';
import { socialSafety } from '../src/social-safety.js';

describe('Threads Social Features (Sorting, Safety, Permalinks)', () => {
  let tm: ThreadManager;

  beforeEach(() => {
    socialSafety.clearAll();
    tm = new ThreadManager();
  });

  afterEach(() => {
    socialSafety.clearAll();
  });

  it('1. should sort comments correctly according to best, top, new, and old', () => {
    const now = Date.now();
    const comments: ThreadComment[] = [
      {
        id: 'c-1',
        authorFingerprint: 'author_alpha',
        content: 'Old comment with high merit',
        createdAt: now - 3600 * 1000 * 10, // 10 hours ago
        depth: 0,
        meritScore: 50,
        isCollapsed: false,
        replies: [],
      },
      {
        id: 'c-2',
        authorFingerprint: 'author_beta',
        content: 'New comment with moderate merit',
        createdAt: now - 3600 * 1000 * 0.5, // 30 mins ago
        depth: 0,
        meritScore: 20,
        isCollapsed: false,
        replies: [],
      },
      {
        id: 'c-3',
        authorFingerprint: 'author_gamma',
        content: 'Brand new comment',
        createdAt: now - 1000 * 60, // 1 min ago
        depth: 0,
        meritScore: 2,
        isCollapsed: false,
        replies: [],
      },
    ];

    // Top: sorted purely by meritScore descending
    tm.setSortMode('top');
    const topSorted = tm.sortComments(comments);
    expect(topSorted.map(c => c.id)).toEqual(['c-1', 'c-2', 'c-3']);

    // New: sorted purely by createdAt descending (most recent first)
    tm.setSortMode('new');
    const newSorted = tm.sortComments(comments);
    expect(newSorted.map(c => c.id)).toEqual(['c-3', 'c-2', 'c-1']);

    // Old: sorted purely by createdAt ascending (oldest first)
    tm.setSortMode('old');
    const oldSorted = tm.sortComments(comments);
    expect(oldSorted.map(c => c.id)).toEqual(['c-1', 'c-2', 'c-3']);

    // Best: score decaying over time (c-2 with 20 merit at 30 mins vs c-1 with 50 merit at 10 hours)
    tm.setSortMode('best');
    const bestSorted = tm.sortComments(comments);
    expect(bestSorted.length).toBe(3);
    // Recent good comment should rank at top or second
    expect(bestSorted[0].id).toBe('c-2');
  });

  it('2. should suppress content from blocked users in comment tree', async () => {
    const blockedAuthorFP = 'blocked_troll_001';
    const comment: ThreadComment = {
      id: 'c-blocked',
      authorFingerprint: blockedAuthorFP,
      content: 'Harassing or toxic content that should be hidden',
      createdAt: Date.now() - 1000 * 60,
      depth: 0,
      meritScore: -5,
      isCollapsed: false,
      replies: [],
    };

    // Before blocking
    const normalHtml = tm.renderCommentNode(comment);
    expect(normalHtml).toContain('Harassing or toxic content');
    expect(normalHtml).not.toContain('[Comment from blocked user hidden]');

    // After blocking
    await socialSafety.blockUser(blockedAuthorFP);
    const blockedHtml = tm.renderCommentNode(comment);
    expect(blockedHtml).toContain('[Comment from blocked user hidden]');
    expect(blockedHtml).not.toContain('Harassing or toxic content');
  });

  it('3. should render sorting toolbar and permalink buttons', () => {
    const roots = tm.getRootComments();
    const treeHtml = tm.renderCommentTree(roots);

    // Sorting toolbar
    expect(treeHtml).toContain('Sort comments:');
    expect(treeHtml).toContain('data-thread-sort="best"');
    expect(treeHtml).toContain('data-thread-sort="top"');
    expect(treeHtml).toContain('data-thread-sort="new"');
    expect(treeHtml).toContain('data-thread-sort="old"');

    // Permalink button
    expect(treeHtml).toContain('btn-comment-permalink');
    expect(treeHtml).toContain('data-comment-permalink="c-root-1"');
    expect(treeHtml).toContain('title="Copy link to comment"');
  });
});
