/**
 * Custom Obsidian Video Player & Responsive Multi-Image Gallery Lightbox.
 * Supports smart responsive multi-image layout (1 hero, 2 split 50/50, 3 hero left + 2 stacked, 4 2x2 grid),
 * fullscreen lightbox modal with zoom, left/right keyboard navigation, and Esc key dismissal.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';

export interface VideoPlayerState {
  id: string;
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export class ObsidianMediaPlayer {
  private lightboxActive: boolean = false;
  private currentLightboxSrc: string | null = null;
  private galleryImages: string[] = [];
  private currentGalleryIndex: number = 0;
  private zoomLevel: number = 1;
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this._bindGlobalKeyboard();
  }

  /**
   * Detects YouTube, Vimeo, or direct video URLs within text or media attachments.
   */
  public extractVideo(srcOrText: string): { type: 'youtube' | 'vimeo' | 'direct'; embedUrl: string; videoId: string } | null {
    if (!srcOrText) return null;

    // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
    const ytMatch = srcOrText.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      const vidId = ytMatch[1];
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${vidId}?rel=0&modestbranding=1`,
        videoId: vidId,
      };
    }

    // Vimeo: vimeo.com/ID
    const vimeoMatch = srcOrText.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      const vId = vimeoMatch[1];
      return {
        type: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${vId}`,
        videoId: vId,
      };
    }

    // Direct MP4 / WebM / Ogg video files
    const directMatch = srcOrText.match(/https?:\/\/[^\s"'<>]+\.(?:mp4|webm|ogg)(?:\?[^\s"'<>]*)?/i);
    if (directMatch) {
      return {
        type: 'direct',
        embedUrl: directMatch[0],
        videoId: directMatch[0],
      };
    }

    return null;
  }

  /**
   * Generates a sleek Obsidian video card with custom controls, YouTube iframe embed, or Vimeo player.
   */
  public renderVideoCard(videoId: string, videoSrc: string, posterSrc?: string): string {
    const detected = this.extractVideo(videoSrc);

    if (detected?.type === 'youtube' || detected?.type === 'vimeo') {
      const rawUrl = detected.type === 'youtube'
        ? `https://www.youtube.com/watch?v=${detected.videoId}`
        : `https://vimeo.com/${detected.videoId}`;
      return `
        <div class="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/90 border border-white/10 group select-none my-2.5 shadow-2xl">
          <iframe 
            src="${detected.embedUrl}" 
            title="Embedded Video Player"
            class="w-full h-full border-0 absolute inset-0 z-10" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen 
            loading="lazy">
          </iframe>
          <div class="absolute bottom-2 right-2 z-0 flex items-center space-x-1 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-slate-400 pointer-events-auto">
            <a href="${rawUrl}" target="_blank" rel="noopener noreferrer" class="hover:text-white underline">
              Watch on ${detected.type === 'youtube' ? 'YouTube' : 'Vimeo'} ↗
            </a>
          </div>
        </div>
      `;
    }

    const safeSrc = detected?.type === 'direct' ? detected.embedUrl : videoSrc;

    return `
      <div class="relative rounded-2xl overflow-hidden bg-black border border-white/10 group select-none my-2.5 shadow-2xl">
        <video 
          id="video-${videoId}" 
          src="${safeSrc}" 
          ${posterSrc ? `poster="${posterSrc}"` : ''} 
          class="w-full max-h-[420px] object-contain cursor-pointer bg-black"
          playsinline
          preload="metadata"
          data-action="toggle-video-play"
          data-video-id="${videoId}"
        ></video>

        <!-- OBSIDIAN CUSTOM CONTROLS OVERLAY -->
        <div id="controls-${videoId}" class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3.5 opacity-90 group-hover:opacity-100 transition-opacity duration-200">
          
          <!-- SCRUBBER PROGRESS BAR -->
          <div 
            class="relative w-full h-1.5 bg-white/20 hover:h-2.5 rounded-full mb-2.5 cursor-pointer transition-all"
            data-action="seek-video"
            data-video-id="${videoId}"
            title="Click to seek"
          >
            <div id="progress-${videoId}" class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full pointer-events-none" style="width: 0%;"></div>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-200">
            <div class="flex items-center space-x-3">
              <!-- PLAY/PAUSE -->
              <button data-action="toggle-video-play" data-video-action="toggle-play" data-video-id="${videoId}" class="btn-video-play hover:text-cyan-400 transition-colors p-1 text-sm cursor-pointer">
                ▶
              </button>

              <!-- VOLUME/MUTE -->
              <button data-action="toggle-video-mute" data-video-action="toggle-mute" data-video-id="${videoId}" class="btn-video-mute hover:text-cyan-400 transition-colors p-1 text-sm cursor-pointer">
                🔊
              </button>

              <!-- TIMECODE -->
              <span class="font-mono text-[11px] text-slate-400">
                <span id="time-curr-${videoId}">0:00</span> / <span id="time-dur-${videoId}">0:00</span>
              </span>
            </div>

            <div class="flex items-center space-x-3 text-sm">
              <!-- PICTURE IN PICTURE -->
              <button data-action="toggle-video-pip" data-video-action="pip" data-video-id="${videoId}" class="btn-video-pip hover:text-cyan-400 transition-colors cursor-pointer" title="Picture in Picture">
                ⧉
              </button>

              <!-- FULLSCREEN -->
              <button data-action="toggle-video-fs" data-video-action="fullscreen" data-video-id="${videoId}" class="btn-video-fs hover:text-cyan-400 transition-colors cursor-pointer" title="Fullscreen">
                ⛶
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generates a Responsive Multi-Image Grid (1-4 images):
   * - 1 image: Hero layout (16:9 or 4:3, max-h-[480px], cover)
   * - 2 images: 50/50 vertical split
   * - 3 images: 1 large on left spanning full height + 2 stacked on right
   * - 4 images: 2x2 grid
   */
  public renderImageMosaic(images: string[]): string {
    if (!images || images.length === 0) return '';

    const safeImagesJson = JSON.stringify(images).replace(/"/g, '&quot;');

    // 1 IMAGE: HERO LAYOUT
    if (images.length === 1) {
      return `
        <div class="rounded-2xl overflow-hidden border border-white/10 my-2.5 shadow-lg cursor-pointer bg-surface-raised group">
          <div class="relative overflow-hidden aspect-video max-h-[480px]">
            <img 
              src="${images[0]}" 
              alt="Visual asset" 
              class="btn-lightbox-img w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" 
              data-src="${images[0]}"
              data-all-images="${safeImagesJson}"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-3.5 py-1.5 bg-black/70 backdrop-blur-md text-white rounded-full text-xs font-mono border border-white/10 shadow-lg">
                🔍 Click to Expand
              </span>
            </div>
          </div>
        </div>
      `;
    }

    // 2 IMAGES: 50/50 VERTICAL SPLIT
    if (images.length === 2) {
      return `
        <div class="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden border border-white/10 my-2.5 shadow-lg bg-surface-raised">
          <div class="relative overflow-hidden h-64 sm:h-72 cursor-pointer group">
            <img 
              src="${images[0]}" 
              alt="Visual asset 1" 
              class="btn-lightbox-img w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              data-src="${images[0]}"
              data-all-images="${safeImagesJson}"
              loading="lazy"
            />
          </div>
          <div class="relative overflow-hidden h-64 sm:h-72 cursor-pointer group">
            <img 
              src="${images[1]}" 
              alt="Visual asset 2" 
              class="btn-lightbox-img w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              data-src="${images[1]}"
              data-all-images="${safeImagesJson}"
              loading="lazy"
            />
          </div>
        </div>
      `;
    }

    // 3 IMAGES: 1 LARGE HERO LEFT + 2 STACKED RIGHT
    if (images.length === 3) {
      return `
        <div class="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden border border-white/10 my-2.5 shadow-lg bg-surface-raised h-72 sm:h-80">
          <div class="relative overflow-hidden h-full cursor-pointer group">
            <img 
              src="${images[0]}" 
              alt="Visual asset 1" 
              class="btn-lightbox-img w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              data-src="${images[0]}"
              data-all-images="${safeImagesJson}"
              loading="lazy"
            />
          </div>
          <div class="grid grid-rows-2 gap-1.5 h-full">
            <div class="relative overflow-hidden h-full cursor-pointer group">
              <img 
                src="${images[1]}" 
                alt="Visual asset 2" 
                class="btn-lightbox-img w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                data-src="${images[1]}"
                data-all-images="${safeImagesJson}"
                loading="lazy"
              />
            </div>
            <div class="relative overflow-hidden h-full cursor-pointer group">
              <img 
                src="${images[2]}" 
                alt="Visual asset 3" 
                class="btn-lightbox-img w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                data-src="${images[2]}"
                data-all-images="${safeImagesJson}"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      `;
    }

    // 4 IMAGES: 2x2 EQUAL GRID
    return `
      <div class="grid grid-cols-2 grid-rows-2 gap-1.5 rounded-2xl overflow-hidden border border-white/10 my-2.5 shadow-lg bg-surface-raised h-72 sm:h-80">
        ${images.slice(0, 4).map((img, idx) => `
          <div class="relative overflow-hidden h-full cursor-pointer group">
            <img 
              src="${img}" 
              alt="Visual asset ${idx + 1}" 
              class="btn-lightbox-img w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              data-src="${img}"
              data-all-images="${safeImagesJson}"
              loading="lazy"
            />
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Renders the Lightbox Modal HTML.
   */
  public renderLightboxModal(): string {
    if (!this.lightboxActive || !this.currentLightboxSrc) return '';

    const hasMultiple = this.galleryImages.length > 1;
    const currentNum = this.currentGalleryIndex + 1;
    const totalNum = this.galleryImages.length;

    return `
      <div id="lightbox-overlay" class="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
        
        <!-- TOP TOOLBAR -->
        <div class="absolute top-4 inset-x-4 flex items-center justify-between z-20" data-action="stop-propagation">
          <div class="flex items-center space-x-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-mono text-slate-300 shadow-xl">
            <span class="text-indigo-400 font-bold">📷 Visual Asset</span>
            ${hasMultiple ? `<span class="text-slate-500">|</span><span class="text-white font-bold">${currentNum} / ${totalNum}</span>` : ''}
            <span class="text-slate-500">|</span>
            <span class="text-emerald-400 font-bold">Zoom: ${Math.round(this.zoomLevel * 100)}%</span>
          </div>

          <div class="flex items-center space-x-2">
            <!-- ZOOM CONTROLS -->
            <button id="btn-lightbox-zoom-out" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer shadow-lg" title="Zoom Out (-)">
              🔍-
            </button>
            <button id="btn-lightbox-zoom-in" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer shadow-lg" title="Zoom In (+)">
              🔍+
            </button>
            <button id="btn-lightbox-zoom-reset" class="px-3 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-lg" title="Reset Zoom">
              100%
            </button>
            
            <!-- OPEN ORIGINAL / DOWNLOAD -->
            <a href="${this.currentLightboxSrc}" download="sovereign-asset.png" target="_blank" rel="noreferrer" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-all cursor-pointer shadow-lg" title="Open Original / Download">
              ⬇
            </a>

            <!-- CLOSE BUTTON -->
            <button id="btn-close-lightbox" class="w-10 h-10 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 flex items-center justify-center text-sm font-bold transition-all cursor-pointer shadow-lg" title="Close (Esc)">
              ✕
            </button>
          </div>
        </div>

        <!-- PREV BUTTON -->
        ${hasMultiple ? `
          <button id="btn-lightbox-prev" class="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/60 hover:bg-white/20 text-white text-3xl flex items-center justify-center transition-all cursor-pointer z-20 border border-white/10 shadow-2xl" title="Previous (Left Arrow)">
            ‹
          </button>
          <button id="btn-lightbox-next" class="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/60 hover:bg-white/20 text-white text-3xl flex items-center justify-center transition-all cursor-pointer z-20 border border-white/10 shadow-2xl" title="Next (Right Arrow)">
            ›
          </button>
        ` : ''}

        <!-- IMAGE DISPLAY CANVAS -->
        <div id="lightbox-image-container" class="relative max-w-[90vw] max-h-[85vh] overflow-hidden flex items-center justify-center" data-action="stop-propagation">
          <img 
            id="lightbox-main-img" 
            src="${this.currentLightboxSrc}" 
            alt="Expanded sovereign media"
            class="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl transition-transform duration-200 ease-out" 
            style="transform: scale(${this.zoomLevel});"
          />
        </div>
      </div>
    `;
  }

  public openLightbox(src: string, allImages?: string[]): void {
    this.currentLightboxSrc = src;
    this.galleryImages = allImages && allImages.length > 0 ? allImages : [src];
    this.currentGalleryIndex = this.galleryImages.indexOf(src);
    if (this.currentGalleryIndex === -1) this.currentGalleryIndex = 0;
    this.zoomLevel = 1;
    this.lightboxActive = true;
  }

  public nextImage(): void {
    if (this.galleryImages.length <= 1) return;
    this.currentGalleryIndex = (this.currentGalleryIndex + 1) % this.galleryImages.length;
    this.currentLightboxSrc = this.galleryImages[this.currentGalleryIndex];
    this.zoomLevel = 1;
  }

  public prevImage(): void {
    if (this.galleryImages.length <= 1) return;
    this.currentGalleryIndex = (this.currentGalleryIndex - 1 + this.galleryImages.length) % this.galleryImages.length;
    this.currentLightboxSrc = this.galleryImages[this.currentGalleryIndex];
    this.zoomLevel = 1;
  }

  public zoomIn(): void {
    this.zoomLevel = Math.min(3, +(this.zoomLevel + 0.25).toFixed(2));
  }

  public zoomOut(): void {
    this.zoomLevel = Math.max(0.5, +(this.zoomLevel - 0.25).toFixed(2));
  }

  public resetZoom(): void {
    this.zoomLevel = 1;
  }

  public closeLightbox(): void {
    this.lightboxActive = false;
    this.currentLightboxSrc = null;
    this.galleryImages = [];
    this.zoomLevel = 1;
  }

  public isLightboxOpen(): boolean {
    return this.lightboxActive;
  }

  public getGalleryImages(): string[] {
    return [...this.galleryImages];
  }

  public getCurrentIndex(): number {
    return this.currentGalleryIndex;
  }

  public getZoomLevel(): number {
    return this.zoomLevel;
  }

  private _bindGlobalKeyboard(): void {
    if (typeof window === 'undefined') return;

    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener);
    }

    this.keydownListener = (e: KeyboardEvent) => {
      if (!this.lightboxActive) return;

      if (e.key === 'Escape') {
        this.closeLightbox();
        if (typeof window !== 'undefined' && (window as any).clientStore?.notify) {
          (window as any).clientStore.notify();
        }
      } else if (e.key === 'ArrowRight') {
        this.nextImage();
        if (typeof window !== 'undefined' && (window as any).clientStore?.notify) {
          (window as any).clientStore.notify();
        }
      } else if (e.key === 'ArrowLeft') {
        this.prevImage();
        if (typeof window !== 'undefined' && (window as any).clientStore?.notify) {
          (window as any).clientStore.notify();
        }
      }
    };

    window.addEventListener('keydown', this.keydownListener);
  }

  public bindVideoEvents(videoId: string): void {
    if (typeof document === 'undefined') return;
    const video = document.getElementById(`video-${videoId}`) as HTMLVideoElement;
    if (!video) return;

    const playBtn = document.querySelector(`[data-video-action="toggle-play"][data-video-id="${videoId}"]`);
    const muteBtn = document.querySelector(`[data-video-action="toggle-mute"][data-video-id="${videoId}"]`);
    const pipBtn = document.querySelector(`[data-video-action="pip"][data-video-id="${videoId}"]`);
    const fsBtn = document.querySelector(`[data-video-action="fullscreen"][data-video-id="${videoId}"]`);
    const progressBar = document.getElementById(`progress-${videoId}`);
    const currTime = document.getElementById(`time-curr-${videoId}`);
    const durTime = document.getElementById(`time-dur-${videoId}`);

    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    video.addEventListener('loadedmetadata', () => {
      if (durTime) durTime.textContent = formatTime(video.duration);
    });

    video.addEventListener('timeupdate', () => {
      if (video.duration > 0 && progressBar) {
        const pct = (video.currentTime / video.duration) * 100;
        progressBar.style.width = `${pct}%`;
      }
      if (currTime) currTime.textContent = formatTime(video.currentTime);
    });

    const progressTrack = progressBar?.parentElement;
    progressTrack?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      const rect = progressTrack.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      if (video.duration > 0) {
        video.currentTime = Math.max(0, Math.min(video.duration, pos * video.duration));
      }
    });

    video.addEventListener('play', () => {
      if (playBtn) playBtn.textContent = '❚❚';
    });

    video.addEventListener('pause', () => {
      if (playBtn) playBtn.textContent = '▶';
    });

    playBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (video.paused) video.play();
      else video.pause();
    });

    video.addEventListener('click', () => {
      if (video.paused) video.play();
      else video.pause();
    });

    muteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
      if (muteBtn) muteBtn.textContent = video.muted ? '🔇' : '🔊';
    });

    pipBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (document.pictureInPictureEnabled) {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await video.requestPictureInPicture();
      }
    });

    fsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!document.fullscreenElement) video.requestFullscreen();
      else document.exitFullscreen();
    });
  }
}

export const obsidianMediaPlayer = new ObsidianMediaPlayer();
serviceRegistry.registerInstance(SERVICES.MediaPlayer, obsidianMediaPlayer);
