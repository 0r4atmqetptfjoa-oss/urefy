import { describe, it, expect, beforeEach } from 'vitest';
import { PulseActionsEngine, pulseActionsEngine } from '../src/pulse-actions.js';

describe('PulseActionsEngine - Micro-Broadcasting Actions & Particle Burst', () => {
  let engine: PulseActionsEngine;

  beforeEach(() => {
    engine = new PulseActionsEngine();
  });

  it('should format numbers with K and M suffixes', () => {
    expect(engine.formatMetric(42)).toBe('42');
    expect(engine.formatMetric(999)).toBe('999');
    expect(engine.formatMetric(1000)).toBe('1K');
    expect(engine.formatMetric(14200)).toBe('14.2K');
    expect(engine.formatMetric(1200000)).toBe('1.2M');
  });

  it('should toggle like status and fire particle burst on like', () => {
    const postId = 'test-post-pulse-1';
    const initial = engine.getInteractions(postId);
    const initialLikes = initial.likesCount;

    // First like
    const res1 = engine.toggleLike(postId);
    expect(res1.isLiked).toBe(true);
    expect(res1.newCount).toBe(initialLikes + 1);
    expect(res1.burst).toBe(true);

    // Unlike
    const res2 = engine.toggleLike(postId);
    expect(res2.isLiked).toBe(false);
    expect(res2.newCount).toBe(initialLikes);
    expect(res2.burst).toBe(false);
  });

  it('should toggle repost status and manage repost menu state', () => {
    const postId = 'test-post-pulse-2';
    expect(engine.isRepostMenuOpen(postId)).toBe(false);

    engine.toggleRepostMenu(postId);
    expect(engine.isRepostMenuOpen(postId)).toBe(true);

    engine.closeRepostMenu();
    expect(engine.isRepostMenuOpen(postId)).toBe(false);

    const initial = engine.getInteractions(postId);
    const initialReposts = initial.repostsCount;

    const res = engine.toggleRepost(postId);
    expect(res.isReposted).toBe(true);
    expect(res.newCount).toBe(initialReposts + 1);
  });

  it('should toggle bookmark status and record impressions', () => {
    const postId = 'test-post-pulse-3';
    expect(engine.toggleBookmark(postId)).toBe(true);
    expect(engine.toggleBookmark(postId)).toBe(false);

    const initialViews = engine.getInteractions(postId).viewsCount;
    const newViews = engine.recordImpression(postId);
    expect(newViews).toBe(initialViews + 1);
  });

  it('should render pulse action bar with reply, repost menu, like, views, and bookmark', () => {
    const postId = 'test-post-render-bar';
    const html = engine.renderPulseActionBar(postId, 5);

    expect(html).toContain('btn-pulse-reply');
    expect(html).toContain('btn-pulse-repost-menu');
    expect(html).toContain('btn-pulse-like');
    expect(html).toContain('btn-pulse-bookmark');
    expect(html).toContain('btn-pulse-share');
    expect(html).toContain('particle-burst-test-post-render-bar');
  });
});
