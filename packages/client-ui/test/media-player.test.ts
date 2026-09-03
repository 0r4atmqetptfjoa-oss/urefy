import { describe, it, expect, beforeEach } from 'vitest';
import { ObsidianMediaPlayer } from '../src/media-player';

describe('ObsidianMediaPlayer — Video Player & Multi-Image Gallery Lightbox', () => {
  let player: ObsidianMediaPlayer;

  beforeEach(() => {
    player = new ObsidianMediaPlayer();
  });

  it('should render an Obsidian video card with custom controls', () => {
    const html = player.renderVideoCard('v1', 'https://example.com/video.mp4', 'https://example.com/poster.jpg');
    expect(html).toContain('video-v1');
    expect(html).toContain('data-video-action="toggle-play"');
    expect(html).toContain('data-video-action="toggle-mute"');
    expect(html).toContain('data-video-action="fullscreen"');
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
