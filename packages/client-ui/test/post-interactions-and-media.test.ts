import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clientStore } from '../src/client-state.js';
import { obsidianMediaPlayer } from '../src/media-player.js';
import { linkPreviewEngine } from '../src/link-preview.js';
import { sharePostOrCopyLink } from '../src/dry-utils.js';
import { reactionsEngine } from '../src/reactions.js';

describe('Post Interactions, Boost Toggle, Share & Media Embeds', () => {
  beforeEach(() => {
    // Reset test post
    const p = clientStore.posts.find(x => x.id === 'post-1');
    if (p) {
      p.boostCount = 89;
      p.userBoosted = false;
    }
  });

  describe('1. Boost Button Toggle Behavior (Prevents Infinite Incrementing)', () => {
    it('should boost a post once on first click and set userBoosted to true', () => {
      const p = clientStore.posts.find(x => x.id === 'post-1');
      expect(p).toBeDefined();
      const initialCount = p!.boostCount;

      // 1st click
      clientStore.boostPost('post-1');
      expect(p!.userBoosted).toBe(true);
      expect(p!.boostCount).toBe(initialCount + 1);
    });

    it('should unboost on second click, returning count to original and setting userBoosted to false', () => {
      const p = clientStore.posts.find(x => x.id === 'post-1');
      expect(p).toBeDefined();
      const initialCount = p!.boostCount;

      // 1st click: Boost
      clientStore.boostPost('post-1');
      expect(p!.userBoosted).toBe(true);
      expect(p!.boostCount).toBe(initialCount + 1);

      // 2nd click: Unboost (toggle off)
      clientStore.boostPost('post-1');
      expect(p!.userBoosted).toBe(false);
      expect(p!.boostCount).toBe(initialCount);

      // 3rd click: Boost again
      clientStore.boostPost('post-1');
      expect(p!.userBoosted).toBe(true);
      expect(p!.boostCount).toBe(initialCount + 1);
    });

    it('should not allow boost count to drop below zero', () => {
      const p = clientStore.posts.find(x => x.id === 'post-1');
      p!.boostCount = 0;
      p!.userBoosted = true;

      clientStore.boostPost('post-1');
      expect(p!.userBoosted).toBe(false);
      expect(p!.boostCount).toBe(0);
    });
  });

  describe('2. YouTube & Video Link Extraction & Embeds', () => {
    it('should extract video ID and generate embedUrl from YouTube watch URL', () => {
      const text = 'Check this out: https://www.youtube.com/watch?v=4yEFz5DxHo4';
      const extracted = obsidianMediaPlayer.extractVideo(text);
      expect(extracted).not.toBeNull();
      expect(extracted!.type).toBe('youtube');
      expect(extracted!.videoId).toBe('4yEFz5DxHo4');
      expect(extracted!.embedUrl).toBe('https://www.youtube.com/embed/4yEFz5DxHo4?rel=0&modestbranding=1&enablejsapi=1');
    });

    it('should extract video ID from short youtu.be URL', () => {
      const text = 'Listen here: https://youtu.be/4yEFz5DxHo4';
      const extracted = obsidianMediaPlayer.extractVideo(text);
      expect(extracted).not.toBeNull();
      expect(extracted!.type).toBe('youtube');
      expect(extracted!.videoId).toBe('4yEFz5DxHo4');
    });

    it('should render a responsive 16:9 iframe video card with direct watch fallback', () => {
      const cardHtml = obsidianMediaPlayer.renderVideoCard('test-vid', 'https://www.youtube.com/watch?v=4yEFz5DxHo4');
      expect(cardHtml).toContain('iframe');
      expect(cardHtml).toContain('https://www.youtube.com/embed/4yEFz5DxHo4?rel=0&modestbranding=1');
      expect(cardHtml).toContain('aspect-video');
      expect(cardHtml).toContain('Watch on YouTube');
    });

    it('should not render duplicate static link preview card for video URLs', () => {
      const text = 'https://www.youtube.com/watch?v=4yEFz5DxHo4';
      const previewsHtml = linkPreviewEngine.renderAllPreviewsInText(text);
      // Because it is a video URL, linkPreviewEngine should skip it so only the video player renders
      expect(previewsHtml).toBe('');
    });

    it('should still render rich link preview cards for non-video URLs', () => {
      const text = 'Check the repo: https://github.com/aetheris/core';
      const previewsHtml = linkPreviewEngine.renderAllPreviewsInText(text);
      expect(previewsHtml).toContain('github.com');
      expect(previewsHtml).toContain('Open-source repository');
    });
  });

  describe('3. Share Post / Cryptographic Perma-Link Helper', () => {
    it('should invoke navigator.share if supported and available', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      (globalThis as any).navigator.share = mockShare;

      const success = await sharePostOrCopyLink('post-1', 'Test Title', 'Test Content');
      expect(success).toBe(true);
      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          url: expect.stringContaining('/p/post-1'),
        })
      );
    });

    it('should fallback to clipboard writeText when navigator.share is unavailable', async () => {
      delete (globalThis as any).navigator.share;
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      (globalThis as any).navigator.clipboard = { writeText: mockWriteText };

      const success = await sharePostOrCopyLink('post-1', 'Test Title', 'Test Content');
      expect(success).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('/p/post-1'));
    });
  });

  describe('4. Emoji Reactions & Picker Interactivity', () => {
    it('should render clean reaction bar markup without inline onclick attributes', () => {
      const html = reactionsEngine.renderReactionBar('test-post-react', 'test-user');
      expect(html).toContain('add-reaction-btn');
      expect(html).toContain('React');
      expect(html).toContain('reactions-picker');
      // Must not contain brittle inline onclick
      expect(html).not.toContain('onclick=');
    });

    it('should toggle emoji reactions properly and update counts', () => {
      const postId = 'test-post-react-counts';
      const user = 'user-alice';

      expect(reactionsEngine.hasReacted(postId, '🔥', user)).toBe(false);
      expect(reactionsEngine.getTotalReactions(postId)).toBe(0);

      // Add reaction
      reactionsEngine.toggleReaction(postId, '🔥', user);
      expect(reactionsEngine.hasReacted(postId, '🔥', user)).toBe(true);
      expect(reactionsEngine.getTotalReactions(postId)).toBe(1);

      // Second user reacts
      reactionsEngine.toggleReaction(postId, '🔥', 'user-bob');
      expect(reactionsEngine.getTotalReactions(postId)).toBe(2);

      // Alice removes reaction
      reactionsEngine.toggleReaction(postId, '🔥', user);
      expect(reactionsEngine.hasReacted(postId, '🔥', user)).toBe(false);
      expect(reactionsEngine.getTotalReactions(postId)).toBe(1);
    });

    it('should strictly allow only one reaction per user per post and replace on change', () => {
      const postId = 'test-single-react-post';
      const user = 'user-carol';

      // 1. React with ❤️
      reactionsEngine.toggleReaction(postId, '❤️', user);
      expect(reactionsEngine.getUserReaction(postId, user)).toBe('❤️');
      expect(reactionsEngine.getTotalReactions(postId)).toBe(1);

      // 2. React with 🚀 -> replaces ❤️
      reactionsEngine.toggleReaction(postId, '🚀', user);
      expect(reactionsEngine.getUserReaction(postId, user)).toBe('🚀');
      expect(reactionsEngine.hasReacted(postId, '❤️', user)).toBe(false);
      expect(reactionsEngine.hasReacted(postId, '🚀', user)).toBe(true);
      expect(reactionsEngine.getTotalReactions(postId)).toBe(1);

      // 3. React with 🚀 again -> toggles off
      reactionsEngine.toggleReaction(postId, '🚀', user);
      expect(reactionsEngine.getUserReaction(postId, user)).toBeNull();
      expect(reactionsEngine.getTotalReactions(postId)).toBe(0);
    });
  });
});
