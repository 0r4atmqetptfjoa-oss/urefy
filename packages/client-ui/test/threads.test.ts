import { describe, it, expect } from 'vitest';
import { ThreadManager, threadManager } from '../src/threads.js';

describe('Threaded Hierarchical Comments Engine', () => {
  it('should initialize with hierarchical comments structure and OP tag', () => {
    const tm = new ThreadManager();
    tm.loadDemoData();
    const roots = tm.getRootComments();
    expect(roots.length).toBeGreaterThanOrEqual(1);

    const root = roots[0];
    expect(root.authorFingerprint).toBe('c3dc28cb705e');
    expect(root.replies.length).toBe(2);
    expect(root.replies[0].replies.length).toBe(1);

    // Render tree with OP matching root author
    const html = tm.renderCommentTree(roots, 'c3dc28cb705e', '13e0cfc6b203');
    expect(html).toContain('OP');
    expect(html).toContain('YOU');
    expect(html).toContain('comment-c-root-1');
  });

  it('should support collapsing and expanding comment threads', () => {
    const tm = new ThreadManager();
    tm.loadDemoData();
    const root = tm.getRootComments()[0];

    expect(root.isCollapsed).toBe(false);
    tm.toggleCollapse(root.id);
    expect(root.isCollapsed).toBe(true);

    const collapsedHtml = tm.renderCommentNode(root);
    expect(collapsedHtml).toContain('replies collapsed');
    expect(collapsedHtml).toContain('[+]');

    tm.toggleCollapse(root.id);
    expect(root.isCollapsed).toBe(false);
  });

  it('should support adding replies, comment upvoting and downvoting', () => {
    const tm = new ThreadManager();
    tm.loadDemoData();
    const root = tm.getRootComments()[0];
    const initialMerit = root.meritScore;

    // Upvote
    tm.voteComment(root.id, 1);
    expect(root.meritScore).toBe(initialMerit + 1);
    expect(root.userVote).toBe(1);

    // Downvote
    tm.voteComment(root.id, -1);
    expect(root.meritScore).toBe(initialMerit - 1);
    expect(root.userVote).toBe(-1);

    // Reply
    const reply = tm.addReply(root.id, 'user_test_999', 'Verified with zero-knowledge prover.');
    expect(reply.depth).toBe(root.depth + 1);
    expect(root.replies.some((r) => r.id === reply.id)).toBe(true);
  });

  it('should support inline reply toggling and rendering', () => {
    const tm = new ThreadManager();
    tm.loadDemoData();
    const root = tm.getRootComments()[0];

    expect(tm.replyingCommentId).toBeNull();
    tm.toggleReplying(root.id);
    expect(tm.replyingCommentId).toBe(root.id);

    const htmlWithReplyBox = tm.renderCommentNode(root);
    expect(htmlWithReplyBox).toContain(`input-inline-reply-${root.id}`);
    expect(htmlWithReplyBox).toContain('Post Reply');
    expect(htmlWithReplyBox).toContain('btn-submit-reply');
  });
});
