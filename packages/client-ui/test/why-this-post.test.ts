import { describe, it, expect, beforeEach } from 'vitest';
import { whyThisPostModal } from '../src/why-this-post-modal.js';
import { clientStore } from '../src/client-state.js';

describe('Why Am I Seeing This? Recommendation Transparency (Sections 27, 28)', () => {
  beforeEach(() => {
    whyThisPostModal.close();
    clientStore.posts = [
      {
        id: 'post-explain-1',
        channelId: 'pulse-global',
        authorFingerprint: 'author_crypto_guru',
        authorRole: 'GUARDIAN',
        title: 'Lattice Cryptography Invariants',
        content: 'Exploration of sovereign key exchange protocols.',
        flair: 'VERIFIED RELEASE',
        meritVotes: 95,
        userVoted: 1,
        replyCount: 14,
        boostCount: 7,
        createdAt: Date.now() - 1800000,
      },
    ];
  });

  it('initializes closed and opens with target post', () => {
    expect(whyThisPostModal.isOpen()).toBe(false);
    whyThisPostModal.open('post-explain-1');
    expect(whyThisPostModal.isOpen()).toBe(true);
    expect(whyThisPostModal.getActivePostId()).toBe('post-explain-1');
  });

  it('renders transparent human-readable explanations of ranking signals', () => {
    whyThisPostModal.open('post-explain-1');
    const html = whyThisPostModal.render();

    expect(html).toContain('Why am I seeing this?');
    expect(html).toContain('Lattice Cryptography Invariants');
    expect(html).toContain('Signals that influenced this');
    expect(html).toContain('Community merit');
  });

  it('renders direct feed-tuning controls to empower user sovereignty', () => {
    whyThisPostModal.open('post-explain-1');
    const html = whyThisPostModal.render();

    expect(html).toContain('Tune your feed');
    expect(html).toContain('Show less like this');
    expect(html).toContain('Mute');
    expect(html).toContain('data-action="why-less-like-this"');
    expect(html).toContain('data-action="why-mute-author"');
    expect(html).toContain('data-action="why-mute-tag"');
  });

  it('closes cleanly when requested', () => {
    whyThisPostModal.open('post-explain-1');
    expect(whyThisPostModal.isOpen()).toBe(true);
    whyThisPostModal.close();
    expect(whyThisPostModal.isOpen()).toBe(false);
    expect(whyThisPostModal.render()).toBe('');
  });
});
