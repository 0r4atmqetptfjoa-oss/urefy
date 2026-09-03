export interface ScreenShareMetrics {
  width: number;
  height: number;
  aspectRatio: number;
  isUltrawide: boolean;
  frameRate: number;
}

/**
 * Ultrawide (21:9 / 32:9) & PipeWire-Ready Screen Sharing Pipeline.
 * Hardware-accelerated with zero telemetry and crisp frame reproduction.
 */
export class ScreenShareEngine {
  private mediaStream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  public isStreaming: boolean = false;
  public currentMetrics: ScreenShareMetrics | null = null;

  public async startCapture(previewVideoElement?: HTMLVideoElement): Promise<ScreenShareMetrics | null> {
    try {
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          frameRate: { ideal: 60, max: 120 },
        } as any,
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
        },
      });

      this.videoTrack = this.mediaStream.getVideoTracks()[0];
      const settings = this.videoTrack.getSettings();

      const width = settings.width || 1920;
      const height = settings.height || 1080;
      const aspectRatio = Math.round((width / height) * 100) / 100;
      const isUltrawide = aspectRatio > 2.0; // 21:9 (~2.33) or 32:9 (~3.55)

      this.currentMetrics = {
        width,
        height,
        aspectRatio,
        isUltrawide,
        frameRate: settings.frameRate || 60,
      };

      if (previewVideoElement) {
        previewVideoElement.srcObject = this.mediaStream;
        previewVideoElement.play();
      }

      this.isStreaming = true;

      this.videoTrack.onended = () => {
        this.stopCapture();
      };

      return this.currentMetrics;
    } catch (err: any) {
      console.warn('[ScreenShare Engine] Stream capture canceled or unsupported:', err.message);
      this.isStreaming = false;
      return null;
    }
  }

  public async enablePictureInPicture(videoElement: HTMLVideoElement): Promise<void> {
    if (document.pictureInPictureEnabled && videoElement) {
      await videoElement.requestPictureInPicture();
    }
  }

  public stopCapture(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    this.videoTrack = null;
    this.isStreaming = false;
    this.currentMetrics = null;
  }
}

export const screenShareEngine = new ScreenShareEngine();
