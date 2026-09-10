/**
 * pip-float.ts
 * UREfy — Sovereign Picture-in-Picture Scroll-Float Engine
 * 
 * Automatically docks playing in-feed video streams into a high-fidelity floating
 * mini-player at the bottom-right corner when scrolled out of view, maintaining
 * sub-frame synchronization, play/pause states, timecodes, and smooth restore-to-feed.
 */

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export interface FloatingPiPState {
  isFloating: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  videoSrc: string | null;
  posterSrc: string | null;
  title: string;
  postId: string | null;
  streamQuality: string;
  bufferedPercentage: number;
  userDismissed: boolean;
}

export interface PiPObserverOptions {
  threshold?: number[];
  exitThreshold?: number;
  enterThreshold?: number;
  autoFloatOnPlay?: boolean;
}

export type PiPStateListener = (state: FloatingPiPState) => void;

// ---------------------------------------------------------------------------
// Helper Utilities
// ---------------------------------------------------------------------------

function formatTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '0:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  if (hours > 0) {
    const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------------------
// FloatingPiPManager
// ---------------------------------------------------------------------------

export class FloatingPiPManager {
  // Public state conforming to specifications
  public isFloating: boolean = false;
  public activeVideoEl: HTMLVideoElement | null = null;
  public currentVideoSrc: string | null = null;
  public currentPoster: string | null = null;
  public currentTitle: string = 'UREfy Sovereign Stream';
  public currentPostId: string | null = null;
  public currentQuality: string = '1080p60 ZK';

  public currentTime: number = 0;
  public duration: number = 0;
  public isPlaying: boolean = false;
  public isMuted: boolean = false;
  public volume: number = 1.0;
  public playbackRate: number = 1.0;
  public bufferedPercentage: number = 0;

  public autoFloatingEnabled: boolean = true;
  public isUserDismissed: boolean = false;

  // Repositioning / drag state
  public isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private currentPosX: number | null = null;
  private currentPosY: number | null = null;

  // DOM element references
  private containerEl: HTMLElement | null = null;
  private boundContainerEl: HTMLElement | null = null;
  private pipVideoEl: HTMLVideoElement | null = null;
  private progressBarEl: HTMLElement | null = null;
  private progressContainerEl: HTMLElement | null = null;
  private bufferBarEl: HTMLElement | null = null;
  private playBtnEl: HTMLElement | null = null;
  private muteBtnEl: HTMLElement | null = null;
  private timeTextEl: HTMLElement | null = null;
  private rateBtnEl: HTMLElement | null = null;
  private titleTextEl: HTMLElement | null = null;

  // Observer & listeners
  private intersectionObserver: IntersectionObserver | null = null;
  private observedVideos: Set<HTMLVideoElement> = new Set();
  private mutationObserver: MutationObserver | null = null;
  private stateListeners: Set<PiPStateListener> = new Set();
  private isSyncingInternal: boolean = false;

  private readonly availableRates: number[] = [0.75, 1.0, 1.25, 1.5, 2.0];

  constructor() {
    this.initDOM();
  }

  // -------------------------------------------------------------------------
  // DOM Initialization & Mounting
  // -------------------------------------------------------------------------

  private initDOM(): void {
    if (typeof document === 'undefined') return;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.mount());
    } else {
      this.mount();
    }
  }

  /**
   * Mounts or locates the global PiP container in the DOM.
   */
  public mount(targetParent: HTMLElement = document.body): HTMLElement {
    if (typeof document === 'undefined') {
      return null as unknown as HTMLElement;
    }

    let container = document.getElementById('aether-floating-pip-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'aether-floating-pip-root';
      container.className = 'fixed bottom-6 right-6 z-[80] select-none transition-all duration-300 ease-out transform';
      container.style.display = 'none';
      container.innerHTML = this.renderFloatingPlayer();
      targetParent.appendChild(container);
    }

    this.containerEl = container;
    this.cacheDomElements();
    this.bindDOMEvents();

    return container;
  }

  private cacheDomElements(): void {
    if (!this.containerEl) return;
    this.pipVideoEl = this.containerEl.querySelector<HTMLVideoElement>('#pip-video-media');
    this.progressBarEl = this.containerEl.querySelector<HTMLElement>('#pip-progress-filled');
    this.progressContainerEl = this.containerEl.querySelector<HTMLElement>('#pip-progress-container');
    this.bufferBarEl = this.containerEl.querySelector<HTMLElement>('#pip-progress-buffered');
    this.playBtnEl = this.containerEl.querySelector<HTMLElement>('#pip-btn-play');
    this.muteBtnEl = this.containerEl.querySelector<HTMLElement>('#pip-btn-mute');
    this.timeTextEl = this.containerEl.querySelector<HTMLElement>('#pip-time-display');
    this.rateBtnEl = this.containerEl.querySelector<HTMLElement>('#pip-btn-rate');
    this.titleTextEl = this.containerEl.querySelector<HTMLElement>('#pip-title-display');
  }

  // -------------------------------------------------------------------------
  // HTML Rendering
  // -------------------------------------------------------------------------

  /**
   * Generates the Obsidian Picture-in-Picture floating card HTML.
   */
  public renderFloatingPlayer(): string {
    const safeTitle = escapeHtml(this.currentTitle || 'UREfy Sovereign Stream');
    const safePoster = this.currentPoster ? escapeHtml(this.currentPoster) : '';
    const safeSrc = this.currentVideoSrc ? escapeHtml(this.currentVideoSrc) : '';

    return `
      <div 
        id="pip-card-wrapper" 
        class="w-80 sm:w-96 rounded-xl overflow-hidden shadow-2xl border border-cyan-500/30 bg-surface-raised backdrop-blur-xl animate-in slide-in-from-bottom-4 flex flex-col group relative transition-all duration-200 ring-1 ring-white/10 hover:border-cyan-400/50 hover:shadow-cyan-500/10"
      >
        <!-- PIP HEADER / DRAG HANDLE -->
        <div 
          id="pip-drag-header" 
          class="flex items-center justify-between px-3 py-2 bg-surface-overlay/90 border-b border-white/5 cursor-move"
          title="Drag to reposition"
        >
          <div class="flex items-center space-x-2 min-w-0 pr-2">
            <span class="inline-block w-2 h-2 rounded-full bg-cyphr animate-pulse shadow-[0_0_8px_#00e5ff]"></span>
            <span id="pip-title-display" class="text-xs font-semibold text-slate-200 truncate max-w-[140px] sm:max-w-[190px]">
              ${safeTitle}
            </span>
            <span class="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-cyan-950/60 text-cyphr border border-cyan-500/20">
              ${escapeHtml(this.currentQuality)}
            </span>
          </div>

          <div class="flex items-center space-x-1">
            <!-- JUMP TO POST BUTTON -->
            <button 
              id="pip-btn-jump" 
              class="flex items-center space-x-1 px-2 py-0.5 rounded bg-surface-base hover:bg-surface-highlight text-cyan-300 hover:text-cyphr border border-cyan-500/20 hover:border-cyan-500/40 text-[10px] font-mono transition-all"
              title="Jump back to original post in feed"
            >
              <span>↑</span>
              <span class="hidden sm:inline">Jump to Post</span>
              <span class="sm:hidden">Post</span>
            </button>

            <!-- NATIVE PIP TOGGLE -->
            <button 
              id="pip-btn-native-pip" 
              class="p-1 text-slate-400 hover:text-cyphr rounded hover:bg-surface-overlay transition-colors text-xs"
              title="Browser Native PiP"
            >
              ⧉
            </button>

            <!-- CLOSE BUTTON -->
            <button 
              id="pip-btn-close" 
              class="p-1 text-slate-400 hover:text-crimson rounded hover:bg-surface-overlay transition-colors text-xs font-mono"
              title="✕ Close PiP"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- VIDEO CONTAINER -->
        <div class="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          <video 
            id="pip-video-media" 
            src="${safeSrc}" 
            ${safePoster ? `poster="${safePoster}"` : ''} 
            class="w-full h-full object-contain cursor-pointer bg-black"
            playsinline
            preload="metadata"
          ></video>

          <!-- OVERLAY PLAY/PAUSE BIG BADGE (APPEARS ON CLICK) -->
          <div id="pip-overlay-badge" class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 transition-opacity duration-200">
            <div class="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-cyphr text-xl border border-cyan-500/30">
              ▶
            </div>
          </div>
        </div>

        <!-- PROGRESS & SCRUBBER BAR -->
        <div 
          id="pip-progress-container" 
          class="relative w-full h-1.5 hover:h-2.5 bg-slate-800/80 cursor-pointer transition-all duration-150 group/scrub"
          title="Click or drag to seek"
        >
          <!-- BUFFERED BAR -->
          <div 
            id="pip-progress-buffered" 
            class="absolute top-0 left-0 h-full bg-white/20 transition-all duration-200 rounded-r-full"
            style="width: 0%;"
          ></div>
          
          <!-- PLAYED PROGRESS BAR -->
          <div 
            id="pip-progress-filled" 
            class="absolute top-0 left-0 h-full bg-gradient-to-r from-cyphr to-aether rounded-r-full shadow-[0_0_10px_#00e5ff88]"
            style="width: 0%;"
          >
            <!-- THUMB INDICATOR -->
            <div class="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md border border-cyan-400 opacity-0 group-hover/scrub:opacity-100 transition-opacity"></div>
          </div>
        </div>

        <!-- MINI CONTROLS BAR -->
        <div class="flex items-center justify-between px-3 py-2 bg-surface-base/95 text-slate-300 text-xs border-t border-white/5">
          <!-- LEFT CONTROLS (PLAY, REWIND, FAST-FORWARD, TIMECODE) -->
          <div class="flex items-center space-x-2">
            <!-- PLAY/PAUSE -->
            <button 
              id="pip-btn-play" 
              class="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-overlay text-cyphr hover:text-white transition-colors"
              title="Play / Pause"
            >
              ▶
            </button>

            <!-- -10s SEEK -->
            <button 
              id="pip-btn-rewind" 
              class="text-[10px] font-mono text-slate-400 hover:text-cyphr p-1 hover:bg-surface-overlay rounded transition-colors"
              title="Rewind 10 seconds"
            >
              -10s
            </button>

            <!-- +10s SEEK -->
            <button 
              id="pip-btn-forward" 
              class="text-[10px] font-mono text-slate-400 hover:text-cyphr p-1 hover:bg-surface-overlay rounded transition-colors"
              title="Skip 10 seconds"
            >
              +10s
            </button>

            <!-- TIMECODE -->
            <span id="pip-time-display" class="font-mono text-[11px] text-slate-400 tracking-tight pl-1">
              0:00 / 0:00
            </span>
          </div>

          <!-- RIGHT CONTROLS (RATE, VOLUME, FULLSCREEN) -->
          <div class="flex items-center space-x-2">
            <!-- PLAYBACK RATE BUTTON -->
            <button 
              id="pip-btn-rate" 
              class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-overlay hover:bg-surface-highlight text-slate-300 hover:text-cyphr border border-white/10 transition-all"
              title="Cycle playback speed"
            >
              1.0x
            </button>

            <!-- MUTE / UNMUTE -->
            <button 
              id="pip-btn-mute" 
              class="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-overlay hover:text-cyphr transition-colors text-sm"
              title="Mute / Unmute"
            >
              🔊
            </button>

            <!-- MINI VOLUME RANGE -->
            <div class="hidden sm:flex items-center w-12">
              <input 
                id="pip-volume-slider" 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value="${this.volume}" 
                class="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyphr" 
                title="Volume slider"
              />
            </div>

            <!-- FULLSCREEN -->
            <button 
              id="pip-btn-fullscreen" 
              class="p-1 hover:text-cyphr text-slate-400 rounded hover:bg-surface-overlay transition-colors text-xs"
              title="Fullscreen"
            >
              ⛶
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // Event Binding & Interactivity
  // -------------------------------------------------------------------------

  private bindDOMEvents(): void {
    if (!this.containerEl) return;

    // Header buttons
    const btnJump = this.containerEl.querySelector<HTMLButtonElement>('#pip-btn-jump');
    const btnClose = this.containerEl.querySelector<HTMLButtonElement>('#pip-btn-close');
    const btnNativePiP = this.containerEl.querySelector<HTMLButtonElement>('#pip-btn-native-pip');
    const btnRewind = this.containerEl.querySelector<HTMLButtonElement>('#pip-btn-rewind');
    const btnForward = this.containerEl.querySelector<HTMLButtonElement>('#pip-btn-forward');
    const btnFullscreen = this.containerEl.querySelector<HTMLButtonElement>('#pip-btn-fullscreen');
    const volumeSlider = this.containerEl.querySelector<HTMLInputElement>('#pip-volume-slider');
    const dragHeader = this.containerEl.querySelector<HTMLElement>('#pip-drag-header');

    btnJump?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.jumpToPost();
    });

    btnClose?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closePiP();
    });

    btnNativePiP?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.requestNativePiP();
    });

    this.playBtnEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlay();
    });

    this.pipVideoEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlay();
      this.flashPlayOverlay();
    });

    btnRewind?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.seek(Math.max(0, this.currentTime - 10));
    });

    btnForward?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.seek(Math.min(this.duration, this.currentTime + 10));
    });

    this.muteBtnEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMute();
    });

    volumeSlider?.addEventListener('input', (e) => {
      e.stopPropagation();
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.setVolume(val);
    });

    this.rateBtnEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cyclePlaybackRate();
    });

    btnFullscreen?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFullscreen();
    });

    // Scrubber click & drag seek
    if (this.progressContainerEl) {
      let isScrubbing = false;

      const handleScrub = (evt: MouseEvent | TouchEvent) => {
        if (!this.progressContainerEl || this.duration <= 0) return;
        const rect = this.progressContainerEl.getBoundingClientRect();
        const clientX = 'touches' in evt ? evt.touches[0].clientX : evt.clientX;
        const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const percentage = (offsetX / rect.width) * 100;
        this.seekPercentage(percentage);
      };

      this.progressContainerEl.addEventListener('mousedown', (e) => {
        isScrubbing = true;
        handleScrub(e);
      });

      this.progressContainerEl.addEventListener('touchstart', (e) => {
        isScrubbing = true;
        handleScrub(e);
      }, { passive: true });

      window.addEventListener('mousemove', (e) => {
        if (isScrubbing) handleScrub(e);
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (isScrubbing) handleScrub(e);
      }, { passive: true });

      window.addEventListener('mouseup', () => {
        isScrubbing = false;
      }, { passive: true });

      window.addEventListener('touchend', () => {
        isScrubbing = false;
      }, { passive: true });
    }

    // Video media lifecycle listeners on floating video element
    if (this.pipVideoEl) {
      this.pipVideoEl.addEventListener('timeupdate', () => {
        if (this.isSyncingInternal) return;
        if (this.pipVideoEl) {
          this.currentTime = this.pipVideoEl.currentTime;
          this.duration = this.pipVideoEl.duration || this.duration;
          this.updateBuffered();
          this.updateUI();
        }
      });

      this.pipVideoEl.addEventListener('play', () => {
        this.isPlaying = true;
        this.updateUI();
        this.notifyState();
      });

      this.pipVideoEl.addEventListener('pause', () => {
        this.isPlaying = false;
        this.updateUI();
        this.notifyState();
      });

      this.pipVideoEl.addEventListener('volumechange', () => {
        if (this.pipVideoEl) {
          this.isMuted = this.pipVideoEl.muted;
          this.volume = this.pipVideoEl.volume;
          this.updateUI();
        }
      });

      this.pipVideoEl.addEventListener('ended', () => {
        this.isPlaying = false;
        this.updateUI();
      });

      this.pipVideoEl.addEventListener('loadedmetadata', () => {
        if (this.pipVideoEl) {
          this.duration = this.pipVideoEl.duration || 0;
          this.updateUI();
        }
      });
    }

    // Drag header repositioning
    if (dragHeader) {
      this.bindDragEvents(dragHeader);
    }
  }

  /**
   * Enables smooth dragging of the floating player across the viewport.
   */
  private bindDragEvents(handleEl: HTMLElement): void {
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      this.isDragging = true;
      const rect = this.containerEl!.getBoundingClientRect();
      this.dragStartX = e.clientX - rect.left;
      this.dragStartY = e.clientY - rect.top;
      this.containerEl!.style.transition = 'none';
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging || !this.containerEl) return;
      e.preventDefault();
      const maxX = window.innerWidth - this.containerEl.offsetWidth - 8;
      const maxY = window.innerHeight - this.containerEl.offsetHeight - 8;

      let newX = e.clientX - this.dragStartX;
      let newY = e.clientY - this.dragStartY;

      newX = Math.max(8, Math.min(maxX, newX));
      newY = Math.max(8, Math.min(maxY, newY));

      this.containerEl.style.left = `${newX}px`;
      this.containerEl.style.top = `${newY}px`;
      this.containerEl.style.right = 'auto';
      this.containerEl.style.bottom = 'auto';

      this.currentPosX = newX;
      this.currentPosY = newY;
    };

    const onMouseUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      if (this.containerEl) {
        this.containerEl.style.transition = '';
      }
      document.body.style.userSelect = '';
    };

    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('button') || !e.touches[0]) return;
      this.isDragging = true;
      const rect = this.containerEl!.getBoundingClientRect();
      this.dragStartX = e.touches[0].clientX - rect.left;
      this.dragStartY = e.touches[0].clientY - rect.top;
      this.containerEl!.style.transition = 'none';
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!this.isDragging || !this.containerEl || !e.touches[0]) return;
      const maxX = window.innerWidth - this.containerEl.offsetWidth - 8;
      const maxY = window.innerHeight - this.containerEl.offsetHeight - 8;

      let newX = e.touches[0].clientX - this.dragStartX;
      let newY = e.touches[0].clientY - this.dragStartY;

      newX = Math.max(8, Math.min(maxX, newX));
      newY = Math.max(8, Math.min(maxY, newY));

      this.containerEl.style.left = `${newX}px`;
      this.containerEl.style.top = `${newY}px`;
      this.containerEl.style.right = 'auto';
      this.containerEl.style.bottom = 'auto';

      this.currentPosX = newX;
      this.currentPosY = newY;
    };

    handleEl.addEventListener('mousedown', onMouseDown);
    handleEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    window.addEventListener('touchend', onMouseUp, { passive: true });
  }

  // -------------------------------------------------------------------------
  // IntersectionObserver & Scroll-Float Monitoring
  // -------------------------------------------------------------------------

  /**
   * Binds the IntersectionObserver to monitor video elements within a feed container.
   */
  public bindScrollObserver(containerEl?: HTMLElement, options: PiPObserverOptions = {}): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    this.boundContainerEl = containerEl || document.body;
    const thresholds = options.threshold ?? [0, 0.1, 0.25, 0.5, 0.75, 1.0];

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.observedVideos.clear();
    }

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const targetVideo = entry.target as HTMLVideoElement;

        // If the active video is exiting the viewport
        if (targetVideo === this.activeVideoEl) {
          const isLeaving = !entry.isIntersecting || entry.intersectionRatio < (options.exitThreshold ?? 0.20);
          const isEntering = entry.isIntersecting && entry.intersectionRatio >= (options.enterThreshold ?? 0.70);

          if (isLeaving && !this.isFloating && !this.isUserDismissed && this.autoFloatingEnabled) {
            // If the video is currently playing, or was paused midway through
            if (!this.activeVideoEl.paused || this.activeVideoEl.currentTime > 0) {
              this.showFloating();
            }
          } else if (isEntering && this.isFloating) {
            // Auto restore back to in-feed video when user scrolls back
            this.restoreToFeed();
          }
        }
      });
    }, {
      root: containerEl || null,
      threshold: thresholds,
      rootMargin: '0px'
    });

    // Scan and register existing video elements in container
    this.scanAndObserveVideos(this.boundContainerEl);

    // Watch for dynamically loaded posts/videos in the feed
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    this.mutationObserver = new MutationObserver(() => {
      if (this.boundContainerEl) {
        this.scanAndObserveVideos(this.boundContainerEl);
      }
    });

    this.mutationObserver.observe(this.boundContainerEl, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Discovers and registers all <video> elements in the target root.
   */
  public scanAndObserveVideos(root: HTMLElement): void {
    if (!this.intersectionObserver) return;

    const videos = root.querySelectorAll<HTMLVideoElement>('video');
    videos.forEach((video) => {
      // Don't observe the mini-player's own video element
      if (video.id === 'pip-video-media') return;

      if (!this.observedVideos.has(video)) {
        this.observedVideos.add(video);
        this.intersectionObserver?.observe(video);
        this.attachVideoListeners(video);
      }
    });
  }

  /**
   * Attaches listeners to an in-feed video to detect when user starts playback.
   */
  private attachVideoListeners(video: HTMLVideoElement): void {
    video.addEventListener('play', () => {
      // When any feed video starts playing, automatically make it the tracked active video
      if (this.activeVideoEl !== video) {
        this.attachVideo(video);
      }
      this.isPlaying = true;
      this.isUserDismissed = false;
      this.notifyState();
    });

    video.addEventListener('pause', () => {
      if (this.activeVideoEl === video) {
        this.isPlaying = false;
        this.notifyState();
      }
    });

    video.addEventListener('timeupdate', () => {
      if (this.activeVideoEl === video && !this.isFloating) {
        this.currentTime = video.currentTime;
        this.duration = video.duration || this.duration;
      }
    });
  }

  /**
   * Attaches a specific video element explicitly with metadata.
   */
  public attachVideo(
    videoEl: HTMLVideoElement,
    title?: string,
    postId?: string,
    poster?: string
  ): void {
    if (!videoEl) return;

    this.activeVideoEl = videoEl;
    this.currentVideoSrc = videoEl.currentSrc || videoEl.src || null;
    this.currentPoster = poster || videoEl.poster || null;

    // Detect post ID from closest container if not explicitly supplied
    if (postId) {
      this.currentPostId = postId;
    } else {
      const parentPost = videoEl.closest<HTMLElement>('[data-post-id]');
      this.currentPostId = parentPost?.dataset.postId ?? null;
    }

    // Detect title from post title or data attributes
    if (title) {
      this.currentTitle = title;
    } else if (this.currentPostId) {
      const titleEl = document.querySelector(`[data-post-id="${this.currentPostId}"] h3, [data-post-id="${this.currentPostId}"] .post-title`);
      this.currentTitle = titleEl?.textContent?.trim() || 'UREfy Sovereign Stream';
    } else {
      this.currentTitle = 'UREfy Sovereign Stream';
    }

    this.currentTime = videoEl.currentTime || 0;
    this.duration = videoEl.duration || 0;
    this.isPlaying = !videoEl.paused;
    this.isMuted = videoEl.muted;
    this.volume = videoEl.volume;
    this.playbackRate = videoEl.playbackRate || 1.0;

    if (!this.observedVideos.has(videoEl) && this.intersectionObserver) {
      this.observedVideos.add(videoEl);
      this.intersectionObserver.observe(videoEl);
      this.attachVideoListeners(videoEl);
    }

    this.notifyState();
  }

  /**
   * Detaches the currently tracked video and resets.
   */
  public detachVideo(): void {
    if (this.isFloating) {
      this.hideFloating();
    }
    this.activeVideoEl = null;
    this.currentVideoSrc = null;
    this.currentPoster = null;
    this.currentPostId = null;
    this.currentTime = 0;
    this.duration = 0;
    this.isPlaying = false;
    this.notifyState();
  }

  // -------------------------------------------------------------------------
  // Floating PiP Transitions & Synchronization
  // -------------------------------------------------------------------------

  /**
   * Activates the floating PiP window and syncs state from main feed video.
   */
  public showFloating(): void {
    if (!this.containerEl) {
      this.mount();
    }

    if (!this.containerEl || !this.pipVideoEl) return;

    this.isFloating = true;
    this.isUserDismissed = false;

    // Synchronize media source and metadata
    if (this.activeVideoEl) {
      const src = this.activeVideoEl.currentSrc || this.activeVideoEl.src;
      if (this.pipVideoEl.src !== src) {
        this.pipVideoEl.src = src;
      }
      if (this.activeVideoEl.poster) {
        this.pipVideoEl.poster = this.activeVideoEl.poster;
      }

      this.currentTime = this.activeVideoEl.currentTime;
      this.duration = this.activeVideoEl.duration || this.duration;
      this.volume = this.activeVideoEl.volume;
      this.isMuted = this.activeVideoEl.muted;
      this.playbackRate = this.activeVideoEl.playbackRate;
      const wasPlaying = !this.activeVideoEl.paused;

      // Pause active in-feed video to prevent dual-audio echoing
      this.activeVideoEl.pause();

      // Configure floating video
      this.isSyncingInternal = true;
      this.pipVideoEl.currentTime = this.currentTime;
      this.pipVideoEl.volume = this.volume;
      this.pipVideoEl.muted = this.isMuted;
      this.pipVideoEl.playbackRate = this.playbackRate;
      this.isSyncingInternal = false;

      if (wasPlaying) {
        this.pipVideoEl.play().catch(() => {
          // Autoplay policy fallback: mute and play
          if (this.pipVideoEl) {
            this.pipVideoEl.muted = true;
            this.isMuted = true;
            this.pipVideoEl.play().catch(() => {});
          }
        });
      }
    }

    // Display floating container with animation
    this.containerEl.style.display = 'block';
    this.updateUI();
    this.notifyState();
  }

  /**
   * Hides the floating PiP window.
   */
  public hideFloating(): void {
    if (!this.containerEl) return;
    this.isFloating = false;
    this.containerEl.style.display = 'none';

    if (this.pipVideoEl && !this.pipVideoEl.paused) {
      this.pipVideoEl.pause();
    }

    this.notifyState();
  }

  /**
   * Restores playback seamlessly back to the in-feed video and docks PiP.
   */
  public restoreToFeed(): void {
    if (!this.isFloating) return;

    if (this.activeVideoEl && this.pipVideoEl) {
      const currentPos = this.pipVideoEl.currentTime;
      const wasPlaying = !this.pipVideoEl.paused;

      this.activeVideoEl.currentTime = currentPos;
      this.activeVideoEl.volume = this.volume;
      this.activeVideoEl.muted = this.isMuted;
      this.activeVideoEl.playbackRate = this.playbackRate;

      if (wasPlaying) {
        this.activeVideoEl.play().catch(() => {});
      }
    }

    this.hideFloating();
  }

  /**
   * Smoothly scrolls the page back to the original post containing the video.
   */
  public jumpToPost(): void {
    let targetEl: HTMLElement | null = null;

    if (this.currentPostId) {
      targetEl = document.getElementById(`post-${this.currentPostId}`) ||
                 document.querySelector(`[data-post-id="${this.currentPostId}"]`);
    }

    if (!targetEl && this.activeVideoEl) {
      targetEl = this.activeVideoEl.closest('[data-post-id]') || this.activeVideoEl;
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight target element with cyan pulse ring
      targetEl.classList.add('ring-2', 'ring-cyphr', 'transition-all', 'duration-500');
      setTimeout(() => {
        targetEl?.classList.remove('ring-2', 'ring-cyphr');
      }, 2000);

      // Restore to feed once scrolled into view
      setTimeout(() => {
        this.restoreToFeed();
      }, 400);
    }
  }

  /**
   * User explicitly closed the PiP window.
   */
  public closePiP(): void {
    this.isUserDismissed = true;
    if (this.pipVideoEl && !this.pipVideoEl.paused) {
      this.pipVideoEl.pause();
    }
    this.hideFloating();
  }

  // -------------------------------------------------------------------------
  // Playback Controls
  // -------------------------------------------------------------------------

  public togglePlay(): void {
    const video = this.isFloating ? this.pipVideoEl : this.activeVideoEl;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      this.isPlaying = true;
    } else {
      video.pause();
      this.isPlaying = false;
    }
    this.updateUI();
    this.notifyState();
  }

  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.pipVideoEl) this.pipVideoEl.muted = this.isMuted;
    if (this.activeVideoEl) this.activeVideoEl.muted = this.isMuted;
    this.updateUI();
    this.notifyState();
  }

  public setVolume(val: number): void {
    const clamped = Math.max(0, Math.min(1, val));
    this.volume = clamped;
    this.isMuted = clamped === 0;

    if (this.pipVideoEl) {
      this.pipVideoEl.volume = clamped;
      this.pipVideoEl.muted = this.isMuted;
    }
    if (this.activeVideoEl) {
      this.activeVideoEl.volume = clamped;
      this.activeVideoEl.muted = this.isMuted;
    }
    this.updateUI();
    this.notifyState();
  }

  public seek(seconds: number): void {
    const clamped = Math.max(0, Math.min(this.duration || Infinity, seconds));
    this.currentTime = clamped;

    if (this.pipVideoEl) {
      this.pipVideoEl.currentTime = clamped;
    }
    if (this.activeVideoEl) {
      this.activeVideoEl.currentTime = clamped;
    }
    this.updateUI();
  }

  public seekPercentage(percentage: number): void {
    if (this.duration <= 0) return;
    const targetSeconds = (percentage / 100) * this.duration;
    this.seek(targetSeconds);
  }

  public cyclePlaybackRate(): void {
    const currentIndex = this.availableRates.indexOf(this.playbackRate);
    const nextIndex = (currentIndex + 1) % this.availableRates.length;
    this.setPlaybackRate(this.availableRates[nextIndex]);
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.pipVideoEl) this.pipVideoEl.playbackRate = rate;
    if (this.activeVideoEl) this.activeVideoEl.playbackRate = rate;
    this.updateUI();
    this.notifyState();
  }

  public async requestNativePiP(): Promise<void> {
    const video = this.isFloating ? this.pipVideoEl : this.activeVideoEl;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('[FloatingPiPManager] Native Picture-in-Picture error:', err);
    }
  }

  public toggleFullscreen(): void {
    const target = this.containerEl || this.pipVideoEl;
    if (!target) return;

    if (!document.fullscreenElement) {
      target.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // -------------------------------------------------------------------------
  // UI State Synchronization
  // -------------------------------------------------------------------------

  /**
   * Updates all dynamic UI elements without rebuilding the DOM tree.
   */
  public updateUI(): void {
    if (!this.containerEl) return;

    // Update Play/Pause Icon
    if (this.playBtnEl) {
      this.playBtnEl.innerHTML = this.isPlaying ? '❚❚' : '▶';
    }

    // Update Mute Icon
    if (this.muteBtnEl) {
      if (this.isMuted || this.volume === 0) {
        this.muteBtnEl.innerHTML = '🔇';
      } else if (this.volume < 0.5) {
        this.muteBtnEl.innerHTML = '🔉';
      } else {
        this.muteBtnEl.innerHTML = '🔊';
      }
    }

    // Update Scrubber Progress
    if (this.progressBarEl && this.duration > 0) {
      const pct = Math.min(100, Math.max(0, (this.currentTime / this.duration) * 100));
      this.progressBarEl.style.width = `${pct}%`;
    }

    // Update Timecode
    if (this.timeTextEl) {
      this.timeTextEl.textContent = `${formatTime(this.currentTime)} / ${formatTime(this.duration)}`;
    }

    // Update Playback Rate Badge
    if (this.rateBtnEl) {
      this.rateBtnEl.textContent = `${this.playbackRate}x`;
    }

    // Update Title if changed
    if (this.titleTextEl) {
      this.titleTextEl.textContent = this.currentTitle;
    }

    // Update Volume Slider
    const volumeSlider = this.containerEl.querySelector<HTMLInputElement>('#pip-volume-slider');
    if (volumeSlider) {
      volumeSlider.value = this.isMuted ? '0' : this.volume.toString();
    }
  }

  private updateBuffered(): void {
    if (!this.pipVideoEl || !this.bufferBarEl || this.duration <= 0) return;
    const buffered = this.pipVideoEl.buffered;
    if (buffered.length > 0) {
      const end = buffered.end(buffered.length - 1);
      const pct = Math.min(100, (end / this.duration) * 100);
      this.bufferedPercentage = pct;
      this.bufferBarEl.style.width = `${pct}%`;
    }
  }

  private flashPlayOverlay(): void {
    const badge = this.containerEl?.querySelector<HTMLElement>('#pip-overlay-badge');
    if (!badge) return;

    const iconDiv = badge.querySelector('div');
    if (iconDiv) {
      iconDiv.textContent = this.isPlaying ? '▶' : '❚❚';
    }
    badge.style.opacity = '1';
    setTimeout(() => {
      badge.style.opacity = '0';
    }, 350);
  }

  // -------------------------------------------------------------------------
  // State Subscriptions & Inspection
  // -------------------------------------------------------------------------

  public getState(): FloatingPiPState {
    return {
      isFloating: this.isFloating,
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      playbackRate: this.playbackRate,
      videoSrc: this.currentVideoSrc,
      posterSrc: this.currentPoster,
      title: this.currentTitle,
      postId: this.currentPostId,
      streamQuality: this.currentQuality,
      bufferedPercentage: this.bufferedPercentage,
      userDismissed: this.isUserDismissed
    };
  }

  public onStateChange(listener: PiPStateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyState(): void {
    const state = this.getState();
    this.stateListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[FloatingPiPManager] State listener error:', err);
      }
    });
  }

  /**
   * Cleans up observers and listeners.
   */
  public destroy(): void {
    this.hideFloating();
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.containerEl && this.containerEl.parentNode) {
      this.containerEl.parentNode.removeChild(this.containerEl);
      this.containerEl = null;
    }
    this.observedVideos.clear();
    this.stateListeners.clear();
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

export const floatingPiP = new FloatingPiPManager();
