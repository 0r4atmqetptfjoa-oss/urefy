import { describe, it, expect, beforeEach } from 'vitest';
import { shareToMessagesModal } from '../src/share-to-messages-modal.js';
import { clientStore } from '../src/client-state.js';

describe('Share to Messages Modal (Sections 14, 15, 16)', () => {
  beforeEach(() => {
    shareToMessagesModal.close();
    clientStore.posts = [
      {
        id: 'post-share-456',
        channelId: 'pulse-global',
        authorFingerprint: 'peer-alice-01',
        authorRole: 'GUARDIAN',
        title: 'Zero-Knowledge Recursive SNARK Benchmark',
        content: 'Benchmark tests executing across mesh nodes.',
        flair: 'VERIFIED RELEASE',
        meritVotes: 42,
        userVoted: 0,
        replyCount: 5,
        boostCount: 2,
        createdAt: Date.now() - 3600000,
      },
    ];
  });

  it('initializes closed and opens with post reference', () => {
    expect(shareToMessagesModal.isOpen()).toBe(false);
    shareToMessagesModal.open('post-share-456');
    expect(shareToMessagesModal.isOpen()).toBe(true);
    expect(shareToMessagesModal.getActivePostId()).toBe('post-share-456');
  });

  it('renders modal with embedded preview card and target selector', () => {
    shareToMessagesModal.open('post-share-456');
    const html = shareToMessagesModal.render();

    expect(html).toContain('Share to Conversation');
    expect(html).toContain('Zero-Knowledge Recursive SNARK Benchmark');
    expect(html).toContain('input-share-modal-note');
    expect(html).toContain('data-action="submit-share-to-messages"');
  });

  it('closes cleanly and clears state', () => {
    shareToMessagesModal.open('post-share-456');
    expect(shareToMessagesModal.isOpen()).toBe(true);
    shareToMessagesModal.close();
    expect(shareToMessagesModal.isOpen()).toBe(false);
    expect(shareToMessagesModal.render()).toBe('');
  });
});
