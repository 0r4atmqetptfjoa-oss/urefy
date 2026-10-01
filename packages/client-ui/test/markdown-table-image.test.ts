import { describe, it, expect } from 'vitest';
import { markdownRenderer } from '../src/markdown-renderer.js';
import { obsidianMediaPlayer } from '../src/media-player.js';
import { profileView } from '../src/profile/profile-view.js';
import { clientStore } from '../src/client-state.js';

describe('Markdown Table & Image Rendering', () => {
  it('renders markdown pipe tables into structured responsive HTML tables', () => {
    const markdown = `
| Benchmark Suite | Gemini 4 Argon | Claude Opus 5.5 | GPT-6 Astra |
| :--- | :---: | ---: |
| **DeepSWE v1.1** | **77.9%** | 74.2% | 74.1% |
| **Vals Index** | 68.9% | 63.4% | 66.1% |
`;

    const html = markdownRenderer.renderMarkdown(markdown);

    expect(html).toContain('<table');
    expect(html).toContain('<thead');
    expect(html).toContain('<tbody');
    expect(html).toContain('Benchmark Suite');
    expect(html).toContain('Gemini 4 Argon');
    expect(html).toContain('DeepSWE v1.1');
    expect(html).toContain('text-center');
    expect(html).toContain('text-right');
    expect(html).toContain('markdown-table-wrapper');
  });

  it('renders markdown images with safe sanitization and lazy loading', () => {
    const markdown = `Check out this diagram: ![Architecture Diagram](https://example.com/arch.png)`;
    const html = markdownRenderer.renderMarkdown(markdown);

    expect(html).toContain('<img src="https://example.com/arch.png"');
    expect(html).toContain('alt="Architecture Diagram"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });

  it('normalizes object-based images in renderImageMosaic to avoid [object Object] 404s', () => {
    const imagesWithMetadata = [
      {
        url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31',
        caption: 'AI Benchmark chart',
        alt: 'Benchmark performance',
      },
      {
        url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5',
        caption: 'Attention heads',
        alt: 'Neural network diagram',
      },
    ];

    const html = obsidianMediaPlayer.renderImageMosaic(imagesWithMetadata);

    expect(html).not.toContain('[object Object]');
    expect(html).toContain('https://images.unsplash.com/photo-1558494949-ef010cbdcc31');
    expect(html).toContain('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5');
    expect(html).toContain('alt="Benchmark performance"');
    expect(html).toContain('alt="Neural network diagram"');
  });

  it('resolves author names from clientStore.posts when profileView has uncached or Profile not set up state', () => {
    const testFp = 'fp-test-unique-author-99';
    clientStore.posts = [
      {
        id: 'post-test-1',
        channelId: 'c/technology',
        authorFingerprint: testFp,
        authorDisplayName: 'Radu Popescu',
        authorHandle: 'radu_tech',
        title: 'Testing Author Resolution',
        content: 'Content here',
        status: 'published',
        meritVotes: 10,
        replyCount: 2,
        boostCount: 1,
        createdAt: Date.now(),
        isExpanded: false,
      } as any,
    ];

    const profile = profileView.getProfile(testFp);
    expect(profile.name).toBe('Radu Popescu');
    expect(profile.handle).toBe('radu_tech');
  });
});
