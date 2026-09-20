import { describe, it, expect } from 'vitest';
import {
  cleanMarkdown,
  escapeHtml,
  extractPostImage,
  buildPostJsonLd,
  SeoPostData,
  SeoCommunityData,
  resolveLegacyRoute,
} from '../functions/_seo.js';

describe('Edge SEO Engine (_seo.ts)', () => {
  it('cleanMarkdown strips markdown and truncates cleanly at word boundaries', () => {
    const markdown = `# Main Header

Here is some **bold text** and *italic text* with a [link to somewhere](https://example.com).

\`\`\`typescript
const code = 'should be stripped';
\`\`\`

> Blockquote with crucial insights

And some extra text that should extend beyond the default one hundred and sixty characters limit so we can ensure the word boundary truncation works seamlessly without cutting words in half.`;

    const cleaned = cleanMarkdown(markdown, 160);
    expect(cleaned).not.toContain('#');
    expect(cleaned).not.toContain('**');
    expect(cleaned).not.toContain('```');
    expect(cleaned).not.toContain('should be stripped');
    expect(cleaned).not.toContain('https://example.com');
    expect(cleaned.length).toBeLessThanOrEqual(165);
    expect(cleaned.endsWith('...')).toBe(true);
  });

  it('escapeHtml escapes dangerous HTML characters', () => {
    const raw = '<script>alert("xss") & \'test\'</script>';
    const escaped = escapeHtml(raw);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;) &amp; &#039;test&#039;&lt;/script&gt;');
  });

  it('extractPostImage resolves from images_json or markdown content or fallback', () => {
    const origin = 'https://urefy.com';

    // 1. From imagesJson
    const postWithImages: SeoPostData = {
      id: 'post-img-1',
      title: 'Image Test',
      content: 'Sample post',
      authorId: 'auth123',
      createdAt: Date.now(),
      imagesJson: JSON.stringify(['https://images.unsplash.com/photo-1']),
    };
    expect(extractPostImage(postWithImages, origin)).toBe('https://images.unsplash.com/photo-1');

    // 2. From markdown content
    const postWithMdImg: SeoPostData = {
      id: 'post-md-img',
      title: 'MD Image',
      content: 'Look at this: ![diagram](https://images.unsplash.com/photo-2)',
      authorId: 'auth123',
      createdAt: Date.now(),
    };
    expect(extractPostImage(postWithMdImg, origin)).toBe('https://images.unsplash.com/photo-2');

    // 3. Fallback
    const postPlain: SeoPostData = {
      id: 'post-plain',
      title: 'Plain',
      content: 'No images here',
      authorId: 'auth123',
      createdAt: Date.now(),
    };
    expect(extractPostImage(postPlain, origin)).toBe('https://urefy.com/og-image.png');
  });

  it('buildPostJsonLd generates valid Schema.org DiscussionForumPosting', () => {
    const post: SeoPostData = {
      id: 'p-seo-homelab',
      title: 'Building a Low-Power N100 Proxmox Cluster',
      content: 'Detailed homelab setup guide for 2026...',
      flair: 'HOMELAB',
      authorId: 'user-77',
      authorName: 'Alex Tech',
      authorHandle: '@alextech',
      createdAt: 1773820000000,
      meritVotes: 42,
      replyCount: 15,
    };

    const origin = 'https://urefy.com';
    const canonicalUrl = `${origin}/p/${post.id}`;
    const desc = cleanMarkdown(post.content);

    const jsonLd = buildPostJsonLd(post, canonicalUrl, origin, desc);

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('DiscussionForumPosting');
    expect(jsonLd['@id']).toBe(canonicalUrl);
    expect(jsonLd.headline).toBe(post.title);
    expect(jsonLd.author['@type']).toBe('Person');
    expect(jsonLd.author.name).toBe('Alex Tech');
    expect(jsonLd.author.alternateName).toBe('@alextech');
    expect(jsonLd.interactionStatistic).toHaveLength(2);
    expect(jsonLd.interactionStatistic[0].userInteractionCount).toBe(42);
    expect(jsonLd.interactionStatistic[1].userInteractionCount).toBe(15);
  });

  it('buildPostJsonLd supports creativeWorkStatus for deleted and archived posts', () => {
    const origin = 'https://urefy.com';
    const deletedPost: SeoPostData = {
      id: 'p-del-1',
      title: 'Deleted Post Title',
      content: '[Content removed]',
      authorId: 'auth99',
      createdAt: 1773820000000,
      status: 'deleted',
    };
    const jsonDel = buildPostJsonLd(deletedPost, `${origin}/p/${deletedPost.id}`, origin, 'Deleted');
    expect(jsonDel.creativeWorkStatus).toBe('Deleted');

    const archivedPost: SeoPostData = {
      id: 'p-arc-1',
      title: 'Archived Post Title',
      content: 'Old thread',
      authorId: 'auth99',
      createdAt: 1773820000000,
      status: 'archived',
    };
    const jsonArc = buildPostJsonLd(archivedPost, `${origin}/p/${archivedPost.id}`, origin, 'Archived');
    expect(jsonArc.creativeWorkStatus).toBe('Archived');
  });

  it('buildPostJsonLd supports digitalSourceType for AI agent transparency and comments', () => {
    const origin = 'https://urefy.com';
    const aiPost: SeoPostData = {
      id: 'p-ai-1',
      title: 'AI Generated Analysis',
      content: 'Detailed neural network analysis',
      authorId: 'fp_glitch_reaper',
      createdAt: 1773820000000,
      isAiGenerated: true,
      comments: [
        {
          id: 'c-1',
          authorId: 'auth2',
          authorName: 'Bob',
          authorHandle: '@bob',
          content: 'Great insight',
          createdAt: 1773820060000,
          upvotes: 7,
        },
      ],
    };

    const json = buildPostJsonLd(aiPost, `${origin}/p/${aiPost.id}`, origin, 'Desc');
    expect(json.digitalSourceType).toBe('https://schema.org/TrainedAlgorithmicMediaDigitalSource');
    expect(json.author.url).toBe(`${origin}/u/fp_glitch_reaper`);
    expect(json.comment).toHaveLength(1);
    expect(json.comment[0]['@type']).toBe('Comment');
    expect(json.comment[0].text).toBe('Great insight');
    expect(json.comment[0].author.name).toBe('Bob');
    expect(json.comment[0].author.url).toBe(`${origin}/u/auth2`);
    expect(json.comment[0].interactionStatistic[0].userInteractionCount).toBe(7);
  });

  it('resolveLegacyRoute distinguishes between 301 redirects and 410 gone', () => {
    // 1. URLs with equivalents -> 301 Permanent Redirect
    expect(resolveLegacyRoute('/about-us')).toEqual({ action: 'redirect', target: '/about' });
    expect(resolveLegacyRoute('/privacy-policy')).toEqual({ action: 'redirect', target: '/privacy' });
    expect(resolveLegacyRoute('/terms-of-service')).toEqual({ action: 'redirect', target: '/terms' });
    expect(resolveLegacyRoute('/contact-us')).toEqual({ action: 'redirect', target: '/about' });
    expect(resolveLegacyRoute('/features.html')).toEqual({ action: 'redirect', target: '/features' });

    // 2. Obsolete legacy URLs without equivalent -> 410 Gone
    expect(resolveLegacyRoute('/wp-login.php').action).toBe('gone');
    expect(resolveLegacyRoute('/wp-content/uploads/2021/photo.jpg').action).toBe('gone');
    expect(resolveLegacyRoute('/category/fashion/spring-collection').action).toBe('gone');
    expect(resolveLegacyRoute('/fitness/workout-plan').action).toBe('gone');
    expect(resolveLegacyRoute('/lifestyle-tips').action).toBe('gone');
    expect(resolveLegacyRoute('/shop/cart').action).toBe('gone');

    // 3. Normal platform URLs -> none
    expect(resolveLegacyRoute('/feed').action).toBe('none');
    expect(resolveLegacyRoute('/c/gaming').action).toBe('none');
    expect(resolveLegacyRoute('/p/p-minecraft').action).toBe('none');
  });
});

