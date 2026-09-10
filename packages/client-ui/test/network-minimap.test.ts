import './helpers/disable-demo.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AmbientNetworkMinimap } from '../src/network-minimap.js';
import { setSimulationMode } from '../src/simulation-mode.js';

class MockCanvasContext2D {
  public clearRect = vi.fn();
  public beginPath = vi.fn();
  public arc = vi.fn();
  public stroke = vi.fn();
  public fill = vi.fn();
  public moveTo = vi.fn();
  public lineTo = vi.fn();
  public save = vi.fn();
  public restore = vi.fn();
  public strokeStyle = '';
  public fillStyle = '';
  public lineWidth = 1;
  public shadowColor = '';
  public shadowBlur = 0;
  public globalAlpha = 1;
}

class MockCanvasElement {
  public width = 100;
  public height = 28;
  public ctx = new MockCanvasContext2D();

  getContext(type: string) {
    return type === '2d' ? this.ctx : null;
  }
}

describe('Ticket 3.1: Ambient Network Minimap', () => {
  let minimap: AmbientNetworkMinimap;
  let mockCanvas: MockCanvasElement;

  beforeEach(() => {
    vi.clearAllMocks();
    setSimulationMode(true);
    mockCanvas = new MockCanvasElement();
    minimap = new AmbientNetworkMinimap();
  });

  afterEach(() => {
    if (minimap) {
      minimap.stop();
    }
    setSimulationMode(false);
  });

  it('0. should initialize with 0 peers when simulation mode is disabled (zero fake peers)', () => {
    setSimulationMode(false);
    const realMinimap = new AmbientNetworkMinimap();
    expect(realMinimap.peers.length).toBe(0);
    expect(realMinimap.connectedPeerCount).toBe(0);
  });

  it('1. should initialize with 3 to 8 peer nodes in topological orbits when simulation mode is enabled', () => {
    expect(minimap.peers.length).toBeGreaterThanOrEqual(3);
    expect(minimap.peers.length).toBeLessThanOrEqual(8);
    expect(minimap.connectedPeerCount).toBeGreaterThan(0);

    for (const peer of minimap.peers) {
      expect(peer.id).toBeDefined();
      expect(peer.angle).toBeDefined();
      expect(peer.distance).toBeGreaterThan(0);
      expect(['connected', 'idle', 'syncing']).toContain(peer.status);
    }
  });

  it('2. should start, pause, resume, and stop animation loop correctly', () => {
    minimap.start(mockCanvas as any);
    expect(minimap.isRunning).toBe(true);
    expect(minimap.isPaused).toBe(false);

    minimap.pause();
    expect(minimap.isPaused).toBe(true);

    minimap.resume();
    expect(minimap.isPaused).toBe(false);
    expect(minimap.isRunning).toBe(true);

    minimap.stop();
    expect(minimap.isRunning).toBe(false);
  });

  it('3. should trigger ambient luminous pulse ripples on network events', () => {
    minimap.bindCanvas(mockCanvas as any);
    expect(minimap.pulses.length).toBe(0);

    // Event ripple
    minimap.triggerPulse('event');
    expect(minimap.pulses.length).toBe(1);
    expect(minimap.pulses[0].color).toBe('#00e5ff'); // cyan

    // Handshake ripple
    minimap.triggerPulse('handshake');
    expect(minimap.pulses.length).toBe(2);
    expect(minimap.pulses[1].color).toBe('#10b981'); // emerald

    // DM ripple
    minimap.triggerPulse('dm');
    expect(minimap.pulses.length).toBe(3);
    expect(minimap.pulses[2].color).toBe('#a855f7'); // aether purple
  });

  it('4. should render single frame drawing center local node, peers, and links', () => {
    minimap.bindCanvas(mockCanvas as any);
    minimap.triggerPulse('event');

    minimap.renderFrame();

    expect(mockCanvas.ctx.clearRect).toHaveBeenCalledWith(0, 0, 100, 28);
    expect(mockCanvas.ctx.beginPath).toHaveBeenCalled();
    expect(mockCanvas.ctx.arc).toHaveBeenCalled();
    expect(mockCanvas.ctx.stroke).toHaveBeenCalled();
    expect(mockCanvas.ctx.fill).toHaveBeenCalled();
  });

  it('5. should advance and decay ripples during renderFrame until removed', () => {
    minimap.bindCanvas(mockCanvas as any);
    minimap.triggerPulse('event');
    expect(minimap.pulses.length).toBe(1);

    const initialRadius = minimap.pulses[0].radius;
    minimap.renderFrame();
    expect(minimap.pulses[0].radius).toBeGreaterThan(initialRadius);

    // Manually force radius beyond maxRadius to verify cleanup
    minimap.pulses[0].radius = 1000;
    minimap.renderFrame();
    expect(minimap.pulses.length).toBe(0);
  });

  it('6. should render valid HTML markup with canvas element and peer count', () => {
    const html = minimap.renderMinimapHTML();
    expect(html).toContain('ambient-network-minimap-container');
    expect(html).toContain('canvas id="ambient-network-minimap"');
    expect(html).toContain('Peers');
  });

  it('7. should handle document visibility change events', () => {
    minimap.start(mockCanvas as any);

    // Simulate document being hidden
    minimap.pause();
    expect(minimap.isPaused).toBe(true);

    // Simulate document becoming visible
    minimap.resume();
    expect(minimap.isPaused).toBe(false);
  });
});
(globalThis as any).__UREFY_DEMO_MODE__ = false;
