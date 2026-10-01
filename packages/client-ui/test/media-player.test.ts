import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObsidianMediaPlayer } from '../src/media-player';

describe('ObsidianMediaPlayer — Video Player & Multi-Image Gallery Lightbox', () => {
  let player: ObsidianMediaPlayer;

  beforeEach(() => {
    player = new ObsidianMediaPlayer();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps external frames in an inert template and offers a Vimeo fallback', () => {
    const html = player.renderVideoCard('vm-lazy', 'https://vimeo.com/123456789');
    expect(html).toMatch(/<template data-video-frame>\s*<iframe/);
    expect(html).toContain('aria-label="Play embedded video"');
    expect(html).toContain('data-video-thumbnail-fallback  class=');
  });

  it('does not pause manually played visible native video when autoplay is disabled', () => {
    let receive: (entries: any[]) => void = () => {};
    class Observer {
      constructor(callback: (entries: any[]) => void) { receive = callback; }
      observe() {} unobserve() {}
    }
    vi.stubGlobal('IntersectionObserver', Observer);
    vi.stubGlobal('window', { IntersectionObserver: Observer });
    vi.stubGlobal('document', { querySelectorAll: () => [] });
    vi.stubGlobal('localStorage', { getItem: () => 'false' });
    const video = { muted: false, play: vi.fn(), pause: vi.fn() };
    const target = { tagName: 'DIV', closest: () => null, querySelector: (selector: string) => selector === 'video' ? video : null };
    player.initAutoplayObserver();
    receive([{ target, isIntersecting: true, intersectionRatio: 1 }]);
    expect(video.play).not.toHaveBeenCalled();
    expect(video.pause).not.toHaveBeenCalled();
    receive([{ target, isIntersecting: false, intersectionRatio: 0 }]);
    expect(video.pause).toHaveBeenCalledOnce();
  });

  it('should render an Obsidian video card with custom controls and NO native controls attribute', () => {
    const html = player.renderVideoCard('v1', 'https://example.com/video.mp4', 'https://example.com/poster.jpg');
    expect(html).toContain('video-v1');
    expect(html).toContain('data-video-action="toggle-play"');
    expect(html).toContain('data-video-action="toggle-mute"');
    expect(html).toContain('data-video-action="fullscreen"');
    // Critical: ensure native browser 'controls' attribute is NOT on <video> tag (prevents duplicate control bars)
    expect(html).not.toMatch(/<video[^>]*\scontrols[\s=>]/i);
    // Ensure custom scrubber has seek-video action
    expect(html).toContain('data-action="seek-video"');
    expect(html).toContain('data-video-id="v1"');
    // Reserved aspect-video container and object-contain prevent initial 0px collapse
    expect(html).toContain('aspect-video');
    expect(html).toContain('object-contain');
  });

  it('should render YouTube embed in a 16:9 aspect-video container with poster overlay to prevent iframe resize jumps', () => {
    const html = player.renderVideoCard('yt1', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(html).toContain('aspect-video');
    expect(html).toContain('media-poster-layer');
    expect(html).toContain('i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(html).toContain('feed-video-frame');
    expect(html).toContain('transition-opacity duration-300');
    expect(html).not.toContain('onload=');
    expect(html).toContain('data-action="fade-media-poster"');
  });

  it('should render Vimeo embed in a 16:9 aspect-video container with poster overlay', () => {
    const html = player.renderVideoCard('vm1', 'https://vimeo.com/123456789', 'https://example.com/vimeo-poster.jpg');
    expect(html).toContain('aspect-video');
    expect(html).toContain('media-poster-layer');
    expect(html).toContain('https://example.com/vimeo-poster.jpg');
    expect(html).toContain('player.vimeo.com/video/123456789');
  });

  it('should render a mosaic gallery for 1, 2, 3, and 4 images', () => {
    const oneImg = player.renderImageMosaic(['img1.jpg']);
    expect(oneImg).toContain('btn-lightbox-img');
    expect(oneImg).toContain('img1.jpg');

    const twoImgs = player.renderImageMosaic(['img1.jpg', 'img2.jpg']);
    expect(twoImgs).toContain('grid-cols-2');

    const threeImgs = player.renderImageMosaic(['img1.jpg', 'img2.jpg', 'img3.jpg']);
    expect(threeImgs).toContain('grid-rows-2');

    const fourImgs = player.renderImageMosaic(['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg']);
    expect(fourImgs).toContain('grid-cols-2');
  });

  it('should open lightbox and render zoom controls and image', () => {
    player.openLightbox('test-img.jpg', ['test-img.jpg', 'test-img-2.jpg']);
    expect(player.isLightboxOpen()).toBe(true);

    const html = player.renderLightboxModal();
    expect(html).toContain('lightbox-overlay');
    expect(html).toContain('btn-lightbox-zoom-in');
    expect(html).toContain('btn-lightbox-zoom-out');
    expect(html).toContain('btn-lightbox-next');
    expect(html).toContain('btn-lightbox-prev');
    expect(html).toContain('test-img.jpg');
  });

  it('should navigate between next and previous images in lightbox', () => {
    const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
    player.openLightbox('img1.jpg', images);

    player.nextImage();
    let html = player.renderLightboxModal();
    expect(html).toContain('img2.jpg');

    player.prevImage();
    html = player.renderLightboxModal();
    expect(html).toContain('img1.jpg');
  });

  it('should adjust zoom levels appropriately', () => {
    player.openLightbox('img1.jpg');
    player.zoomIn();
    player.zoomIn();
    player.zoomOut();
    player.resetZoom();
    expect(player.isLightboxOpen()).toBe(true);
    player.closeLightbox();
    expect(player.isLightboxOpen()).toBe(false);
  });
});
