import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestGet, onRequestOptions } from '../functions/api/posts/[id].js';
import { globalPostsStore, EdgePost } from '../functions/api/_db.js';

describe('Posts Detail & OpenGraph Crawler API (/api/posts/:id)', () => {
  const samplePost: EdgePost = {
    id: 'post-test-42',
    channelId: 'c/technology',
    authorFingerprint: 'a1b2c3d4e5f6',
    authorRole: 'MEMBER',
    title: 'Breakthrough in Decentralized Social Graphs',
    content: 'We are publishing the open specifications for sovereign zero-knowledge social graphs with sub-second feed updates.',
    flair: 'TECH DISCUSSION',
    meritVotes: 128,
    replyCount: 14,
    boostCount: 22,
    images: ['https://example.com/banner.png'],
    createdAt: 1756600000000,
    isExpanded: false,
  };

  beforeEach(() => {
    const idx = globalPostsStore.findIndex(p => p.id === samplePost.id);
    if (idx >= 0) {
      globalPostsStore[idx] = samplePost;
    } else {
      globalPostsStore.unshift(samplePost);
    }
  });

  it('1. handles OPTIONS preflight request with 204 and CORS headers', async () => {
    const res = await onRequestOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('2. returns standard JSON payload for standard API fetch', async () => {
    const req = new Request('https://urefy.com/api/posts/post-test-42', {
      headers: { 'Accept': 'application/json' },
    });
    const res = await onRequestGet({
      request: req,
      params: { id: 'post-test-42' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.post).toBeDefined();
    expect(data.post.id).toBe('post-test-42');
    expect(data.post.title).toBe(samplePost.title);
  });

  it('3. returns 404 for non-existent post ID', async () => {
    const req = new Request('https://urefy.com/api/posts/non-existent-9999');
    const res = await onRequestGet({
      request: req,
      params: { id: 'non-existent-9999' },
    });

    expect(res.status).toBe(404);
    const data = await res.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('Post not found');
  });

  it('4. renders OpenGraph and Twitter card HTML tags for social crawler User-Agents', async () => {
    const crawlerUserAgents = [
      'Twitterbot/1.0',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      'TelegramBot (like TwitterBot)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    ];

    for (const ua of crawlerUserAgents) {
      const req = new Request('https://urefy.com/api/posts/post-test-42', {
        headers: { 'User-Agent': ua },
      });
      const res = await onRequestGet({
        request: req,
        params: { id: 'post-test-42' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/html');
      const html = await res.text();

      // OpenGraph tags
      expect(html).toContain('<meta property="og:type" content="article">');
      expect(html).toContain('<meta property="og:site_name" content="UREfy">');
      expect(html).toContain('<meta property="og:title" content="Breakthrough in Decentralized Social Graphs">');
      expect(html).toContain('content="https://example.com/banner.png"');

      // Twitter tags
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
      expect(html).toContain('<meta name="twitter:title" content="Breakthrough in Decentralized Social Graphs">');

      // Canonical and redirect to hash link
      expect(html).toContain('rel="canonical" href="https://urefy.com/#post-post-test-42"');
      expect(html).toContain('window.location.replace');
    }
  });

  it('5. returns HTML redirect page for direct browser visits (Accept: text/html)', async () => {
    const req = new Request('https://urefy.com/api/posts/post-test-42', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const res = await onRequestGet({
      request: req,
      params: { id: 'post-test-42' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Open full thread in UREfy');
    expect(html).toContain('window.location.replace');
  });
});
