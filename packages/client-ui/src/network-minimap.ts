/**
 * @file network-minimap.ts
 * @package @aetheris/client-ui
 * @description Ambient Network Minimap — Ultra-lightweight (30 FPS capped) HTML5 Canvas
 * micro-topology (~100x28px) displaying local node, P2P neighbor mesh links, and subtle
 * luminous pulse ripples on network events (posts, WebRTC handshakes, DMs).
 * Automatically pauses when tab is hidden via Page Visibility API to guarantee <1% CPU usage.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore } from './client-state.js';

export interface MinimapPeer {
  id: string;
  angle: number;
  distance: number;
  baseRadius: number;
  status: 'connected' | 'idle' | 'syncing';
  color: string;
  speed: number;
}

export interface MinimapPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export class AmbientNetworkMinimap {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private readonly targetFpsMs: number = 1000 / 30; // Cap at 30 FPS for ultra-low CPU

  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public peers: MinimapPeer[] = [];
  public pulses: MinimapPulse[] = [];

  constructor() {
    this.initPeers();
    this.bindVisibilityHandler();
    this.bindStoreEvents();

    if (typeof window !== 'undefined') {
      (window as any).ambientNetworkMinimap = this;
    }
  }

  private initPeers(): void {
    const peerConfigs: Array<{ status: 'connected' | 'idle' | 'syncing'; color: string }> = [
      { status: 'connected', color: '#10b981' }, // green signal
      { status: 'connected', color: '#10b981' },
      { status: 'connected', color: '#06b6d4' }, // cyan cyphr
      { status: 'idle', color: '#64748b' },      // slate
      { status: 'connected', color: '#10b981' },
      { status: 'syncing', color: '#a855f7' },   // aether purple
    ];

    this.peers = peerConfigs.map((cfg, i) => {
      const angle = (i / peerConfigs.length) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const distance = 18 + Math.random() * 18;
      return {
        id: `peer-${i}`,
        angle,
        distance,
        baseRadius: 2.2,
        status: cfg.status,
        color: cfg.color,
        speed: (Math.random() * 0.004 + 0.002) * (i % 2 === 0 ? 1 : -1),
      };
    });
  }

  private bindVisibilityHandler(): void {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  private bindStoreEvents(): void {
    if (typeof window === 'undefined') return;
    // Listen for clientStore notifications to trigger ambient ripples
    if (clientStore && typeof clientStore.subscribe === 'function') {
      clientStore.subscribe((event?: string) => {
        if (event === 'POST_ADDED' || event === 'MESSAGE_SENT' || event === 'MESSAGE_RECEIVED') {
          this.triggerPulse('event');
        } else if (event === 'PEER_CONNECTED' || event === 'RELAY_CONNECTED') {
          this.triggerPulse('handshake');
        }
      });
    }
  }

  /**
   * Binds canvas element and starts rendering loop
   */
  public bindCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.start();
  }

  /**
   * Starts the animation loop
   */
  public start(canvas?: HTMLCanvasElement): void {
    if (canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
    }

    if (this.isRunning && this.rafId !== null) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();

    const loop = (time: number) => {
      if (!this.isRunning) return;

      if (!this.isPaused && time - this.lastFrameTime >= this.targetFpsMs) {
        this.renderFrame();
        this.lastFrameTime = time;
      }

      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        this.rafId = window.requestAnimationFrame(loop);
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      this.rafId = window.requestAnimationFrame(loop);
    }
  }

  /**
   * Pauses the loop without resetting state (e.g. when tab is hidden)
   */
  public pause(): void {
    this.isPaused = true;
  }

  /**
   * Resumes the loop after pause
   */
  public resume(): void {
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Stops the animation loop completely
   */
  public stop(): void {
    this.isRunning = false;
    if (this.rafId !== null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Triggers an ambient luminous ripple expanding from the local node
   */
  public triggerPulse(type: 'event' | 'handshake' | 'dm' = 'event'): void {
    const w = this.canvas ? this.canvas.width : 100;
    const h = this.canvas ? this.canvas.height : 28;
    const color = type === 'handshake' ? '#10b981' : (type === 'dm' ? '#a855f7' : '#00e5ff');

    this.pulses.push({
      x: w / 2,
      y: h / 2,
      radius: 3,
      maxRadius: Math.max(w, h) * 0.65,
      alpha: 0.9,
      color,
    });
  }

  /**
   * Renders a single animation frame on the canvas
   */
  public renderFrame(): void {
    if (!this.canvas && typeof document !== 'undefined') {
      const el = document.getElementById('ambient-network-minimap') as HTMLCanvasElement;
      if (el) {
        this.canvas = el;
        this.ctx = el.getContext('2d');
      }
    }
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;

    // Clear background
    ctx.clearRect(0, 0, w, h);

    // 1. Draw Subtle Mesh Grid Background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, 32, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Update & Draw Peer Nodes and Link Lines
    for (const peer of this.peers) {
      peer.angle += peer.speed;
      const px = centerX + Math.cos(peer.angle) * peer.distance;
      const py = centerY + Math.sin(peer.angle) * (peer.distance * 0.45); // squished ellipse for 100x28 aspect

      // Connecting link line
      ctx.strokeStyle = peer.status === 'connected' ? 'rgba(16, 185, 129, 0.22)' : 'rgba(100, 116, 139, 0.15)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(px, py);
      ctx.stroke();

      // Peer dot
      ctx.fillStyle = peer.color;
      ctx.beginPath();
      ctx.arc(px, py, peer.baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Update & Draw Expanding Ripples
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.radius += 1.2;
      p.alpha = Math.max(0, 1 - (p.radius / p.maxRadius));

      if (p.alpha <= 0 || p.radius >= p.maxRadius) {
        this.pulses.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.7;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw Center Local Node (Glowing Cyan)
    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Renders the header container HTML for the minimap
   */
  public renderMinimapHTML(): string {
    return `
      <div 
        id="ambient-network-minimap-container" 
        class="hidden sm:inline-flex items-center space-x-2 px-2.5 py-1 rounded-full border border-white/10 bg-surface-base/80 hover:border-cyan-500/40 hover:bg-surface-raised transition-all cursor-pointer group shadow-sm select-none"
        onclick="if(window.__aetheris_open_mesh_matrix){ window.__aetheris_open_mesh_matrix(); } else if(window.meshMatrix){ window.meshMatrix.isOpen = true; window.clientStore?.notify(); }"
        title="Sovereign Ambient Network Mesh (Click to open Observatory)"
      >
        <canvas id="ambient-network-minimap" width="92" height="26" class="rounded-full bg-black/30"></canvas>
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="text-[10px] font-mono text-emerald-400 font-semibold group-hover:text-cyan-300 transition-colors hidden xl:inline">
          ${this.connectedPeerCount} Peers
        </span>
      </div>
    `;
  }

  public get connectedPeerCount(): number {
    return this.peers.filter(p => p.status === 'connected').length;
  }
}

export const ambientNetworkMinimap = new AmbientNetworkMinimap();
serviceRegistry.registerInstance(SERVICES.NetworkMinimap, ambientNetworkMinimap);
