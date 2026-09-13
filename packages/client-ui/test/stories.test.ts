import { describe, it, expect, beforeEach } from 'vitest';
import { StoriesEngine } from '../src/stories';

describe('StoriesEngine — Ephemeral Pulse Stories & Visual Creator', () => {
  let engine: StoriesEngine;

  beforeEach(() => {
    engine = new StoriesEngine();
  });

  it('should initialize with seeded active stories', () => {
    const stories = engine.getActiveStories();
    expect(stories.length).toBeGreaterThanOrEqual(4);
    expect(stories[0].authorFingerprint).toBeDefined();
    expect(stories[0].gradient).toBeDefined();
  });

  it('should allow adding a new ephemeral story with 24h expiry', () => {
    const newStory = engine.addStory('Test sovereign pulse', 'text', 'user-1234', 'MEMBER');
    expect(newStory.id).toBeDefined();
    expect(newStory.content).toBe('Test sovereign pulse');
    expect(newStory.authorFingerprint).toBe('user-1234');
    expect(newStory.expiresAt).toBeGreaterThan(Date.now());
  });

  it('should manage creator modal open/close state', () => {
    expect(engine.isCreatorOpen).toBe(false);
    engine.openCreator();
    expect(engine.isCreatorOpen).toBe(true);
    engine.closeCreator();
    expect(engine.isCreatorOpen).toBe(false);
  });

  it('should render story creator modal with gradient choices and inputs', () => {
    engine.openCreator();
    const html = engine.renderStoryCreatorModal('author-abc');
    expect(html).toContain('Create Ephemeral Pulse Story');
    expect(html).toContain('btn-story-type-select');
    expect(html).toContain('story-creator-content');
    expect(html).toContain('btn-submit-story');
  });

  it('should render stories carousel with + Add Story trigger and story items', () => {
    const carouselHtml = engine.renderStoriesCarousel('author-abc');
    expect(carouselHtml).toContain('btn-add-story-trigger');
    expect(carouselHtml).toContain('btn-open-story');
    expect(carouselHtml).toContain('story-item');
  });

  it('should open and render a story modal with reaction buttons', () => {
    const active = engine.getActiveStories();
    engine.activeStoryId = active[0].id;
    const modalHtml = engine.renderStoryModal('author-abc');
    expect(modalHtml).toContain('story-modal-backdrop');
    expect(modalHtml).toContain('btn-story-react');
    expect(modalHtml).toContain('btn-close-story-modal');
  });

  it('should navigate between next and previous stories', () => {
    const active = engine.getActiveStories();
    if (active.length >= 2) {
      const nextId = engine.getNextStoryId(active[0].id);
      expect(nextId).toBe(active[1].id);
      const prevId = engine.getPreviousStoryId(active[1].id);
      expect(prevId).toBe(active[0].id);
    }
  });
});
