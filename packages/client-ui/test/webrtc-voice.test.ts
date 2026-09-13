import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceVisualizer } from '../src/webrtc-voice.js';

describe('VoiceVisualizer - Privacy and Resource Zeroization', () => {
  let visualizer: VoiceVisualizer;
  let mockTrackStop: ReturnType<typeof vi.fn>;
  let mockAudioClose: ReturnType<typeof vi.fn>;

  const originalWindow = (globalThis as any).window;
  const originalDocument = (globalThis as any).document;
  const originalAudioContext = (globalThis as any).AudioContext;
  const originalRAF = (globalThis as any).requestAnimationFrame;
  const originalCAF = (globalThis as any).cancelAnimationFrame;

  beforeEach(() => {
    visualizer = new VoiceVisualizer();
    mockTrackStop = vi.fn();
    mockAudioClose = vi.fn();

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
      }),
      width: 300,
      height: 100,
    };

    (globalThis as any).document = {
      getElementById: vi.fn((id: string) => {
        if (id === 'test-voice-canvas') return mockCanvas;
        return null;
      }),
    };

    class MockAudioContext {
      createMediaStreamSource() {
        return {
          connect: vi.fn(),
        };
      }
      createAnalyser() {
        return {
          fftSize: 128,
          frequencyBinCount: 64,
          getByteFrequencyData: vi.fn(),
        };
      }
      close = mockAudioClose;
    }

    (globalThis as any).AudioContext = MockAudioContext;
    (globalThis as any).window = {
      AudioContext: MockAudioContext,
      document: (globalThis as any).document,
      requestAnimationFrame: vi.fn().mockReturnValue(101),
      cancelAnimationFrame: vi.fn(),
    };

    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [
            { stop: mockTrackStop, kind: 'audio' },
            { stop: mockTrackStop, kind: 'audio' },
          ],
        }),
      },
      configurable: true,
      writable: true,
    });

    (globalThis as any).requestAnimationFrame = (globalThis as any).window.requestAnimationFrame;
    (globalThis as any).cancelAnimationFrame = (globalThis as any).window.cancelAnimationFrame;
  });

  afterEach(() => {
    visualizer.zeroizeRam();
    vi.restoreAllMocks();
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDocument;
    (globalThis as any).AudioContext = originalAudioContext;
    (globalThis as any).requestAnimationFrame = originalRAF;
    (globalThis as any).cancelAnimationFrame = originalCAF;
  });

  it('initializes canvas context and defaults to disconnected state', () => {
    visualizer.init('test-voice-canvas');
    expect(visualizer.isConnected).toBe(false);
    expect(visualizer.isGhostSpaceActive).toBe(false);
  });

  it('toggles ghost space state', () => {
    expect(visualizer.toggleGhostSpace()).toBe(true);
    expect(visualizer.isGhostSpaceActive).toBe(true);
    expect(visualizer.toggleGhostSpace()).toBe(false);
    expect(visualizer.isGhostSpaceActive).toBe(false);
  });

  it('connects voice and acquires microphone stream', async () => {
    visualizer.init('test-voice-canvas');
    const connected = await visualizer.connectVoice();
    expect(connected).toBe(true);
    expect(visualizer.isConnected).toBe(true);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it('strictly stops all hardware microphone tracks on zeroizeRam()', async () => {
    visualizer.init('test-voice-canvas');
    await visualizer.connectVoice();
    expect(visualizer.isConnected).toBe(true);

    visualizer.zeroizeRam();

    expect(visualizer.isConnected).toBe(false);
    expect(mockTrackStop).toHaveBeenCalledTimes(2);
    expect(mockAudioClose).toHaveBeenCalledTimes(1);
  });

  it('falls back to synthetic render if microphone acquisition fails', async () => {
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(new Error('Permission denied'));
    visualizer.init('test-voice-canvas');

    const connected = await visualizer.connectVoice();
    expect(connected).toBe(true);
    expect(visualizer.isConnected).toBe(true);

    visualizer.zeroizeRam();
    expect(visualizer.isConnected).toBe(false);
  });
});
