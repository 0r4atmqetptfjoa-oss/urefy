import { describe, it, expect, beforeEach } from 'vitest';
import {
  replaceEmoticons,
  searchEmojis,
  extractPostLinks,
  renderChatPostEmbed,
  processChatMessageContent,
  EMOJI_DICTIONARY,
} from '../src/chat-rich-embed.js';
import { clientStore } from '../src/client-state.js';

describe('Chat Rich Embeds & Emoticon Engine (Sections 14, 15, 16)', () => {
  beforeEach(() => {
    // Seed sample post into store for link resolution
    clientStore.posts = [
      {
        id: 'post-embed-123',
        channelId: 'pulse-global',
        authorFingerprint: 'author-alice-777',
        authorRole: 'GUARDIAN',
        title: 'Sovereign Decentralized Mesh Architecture',
        content: 'Zero-knowledge verified p2p networking notes and benchmarks.',
        flair: 'VERIFIED RELEASE',
        meritVotes: 42,
        userVoted: 1,
        replyCount: 9,
        boostCount: 3,
        createdAt: Date.now() - 3600000,
      },
    ];
  });

  describe('1. Emoticon Replacement with Code & URL Safeguards', () => {
    it('converts common shorthand emoticons into unicode emojis', () => {
      expect(replaceEmoticons('Hello world :)')).toContain('🙂');
      expect(replaceEmoticons('Nice move :-) <3')).toContain('🙂');
      expect(replaceEmoticons('Nice move :-) <3')).toContain('❤️');
      expect(replaceEmoticons('Great idea :D')).toContain('😀');
      expect(replaceEmoticons('Wink wink ;)')).toContain('😉');
    });

    it('strictly preserves emoticons inside inline code blocks', () => {
      const input = 'Use `x = :)` in your code';
      const output = replaceEmoticons(input);
      expect(output).toContain('`x = :)`');
      expect(output).not.toContain('🙂');
    });

    it('strictly preserves emoticons inside multiline code blocks', () => {
      const input = '```python\n# smile :)\ndef greet(): pass\n```';
      const output = replaceEmoticons(input);
      expect(output).toContain('smile :)');
      expect(output).not.toContain('🙂');
    });

    it('does not corrupt URLs containing colons or slashes', () => {
      const url = 'https://urefy.com/p/post-embed-123?ref=test';
      const output = replaceEmoticons(`Check this: ${url} :)`);
      expect(output).toContain(url);
      expect(output).toContain('🙂');
    });

    it('preserves Windows and Unix file paths without replacing colons or slashes', () => {
      const winPath = 'C:\\Users\\dev\\project\\file.txt';
      const unixPath = '/usr/local/bin/node';
      const relPath = './src/app.ts';
      const output = replaceEmoticons(`Files: ${winPath} and ${unixPath} and ${relPath} :)`);
      expect(output).toContain(winPath);
      expect(output).toContain(unixPath);
      expect(output).toContain(relPath);
      expect(output).toContain('🙂');
    });

    it('preserves email addresses without corrupting them', () => {
      const email = 'developer@urefy.network';
      const output = replaceEmoticons(`Contact ${email} :)`);
      expect(output).toContain(email);
      expect(output).toContain('🙂');
    });
  });

  describe('2. Colon Shortcode Emoji Search & Dictionary', () => {
    it('provides rich categorized emojis', () => {
      expect(EMOJI_DICTIONARY.length).toBeGreaterThan(30);
      const fire = EMOJI_DICTIONARY.find(e => e.shortcode === 'fire');
      expect(fire).toBeDefined();
      expect(fire?.emoji).toBe('🔥');
    });

    it('searches emojis by partial shortcode or name', () => {
      const hearts = searchEmojis('heart');
      expect(hearts.some(h => h.shortcode === 'heart')).toBe(true);

      const thumbs = searchEmojis('thumb');
      expect(thumbs.some(t => t.shortcode === 'thumbsup')).toBe(true);
    });
  });

  describe('3. Post Link Detection & Editorial Preview Card Generation', () => {
    it('detects /p/:id and full URLs to posts', () => {
      const text1 = 'Check out /p/post-embed-123 for details';
      const matches1 = extractPostLinks(text1);
      expect(matches1).toContain('post-embed-123');

      const text2 = 'Link: https://urefy.com/p/post-embed-123';
      const matches2 = extractPostLinks(text2);
      expect(matches2).toContain('post-embed-123');
    });

    it('renders compact editorial card with title, author, merit votes, and click action', () => {
      const html = renderChatPostEmbed('post-embed-123');
      expect(html).toContain('chat-post-embed');
      expect(html).toContain('Sovereign Decentralized Mesh Architecture');
      expect(html).toContain('42 merits');
      expect(html).toContain('data-action="open-post-detail"');
      expect(html).toContain('data-post-id="post-embed-123"');
    });

    it('handles non-existent post gracefully with fallback card', () => {
      const html = renderChatPostEmbed('missing-post-999');
      expect(html).toContain('View Post');
      expect(html).toContain('missing-post-999');
    });

    it('processes message content end-to-end with emoticons and post embeds', () => {
      const message = 'Hey check this out /p/post-embed-123 :)';
      const processed = processChatMessageContent(message);
      expect(processed).toContain('🙂');
      expect(processed).toContain('Sovereign Decentralized Mesh Architecture');
    });
  });
});
