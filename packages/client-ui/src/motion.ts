/**
 * @file motion.ts
 * @package @aetheris/client-ui
 * @description Unified Motion Language & Micro-Interactions for UREfy.
 * Provides GPU-accelerated spring animations, stagger entrances,
 * smooth tab transitions, and accessible prefers-reduced-motion support.
 */

export interface MotionConfig {
  reducedMotion: boolean;
  springCurve: string;
  durationFast: number;
  durationNormal: number;
  durationSlow: number;
}

export class UrefyMotionSystem {
  private static instance: UrefyMotionSystem;
  public config: MotionConfig;

  private constructor() {
    const isReduced = typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.config = {
      reducedMotion: Boolean(isReduced),
      springCurve: 'cubic-bezier(0.16, 1, 0.3, 1)',
      durationFast: isReduced ? 0 : 150,
      durationNormal: isReduced ? 0 : 260,
      durationSlow: isReduced ? 0 : 400,
    };

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => {
        this.config.reducedMotion = e.matches;
      });
    }
  }

  public static getInstance(): UrefyMotionSystem {
    if (!UrefyMotionSystem.instance) {
      UrefyMotionSystem.instance = new UrefyMotionSystem();
    }
    return UrefyMotionSystem.instance;
  }

  /**
   * Triggers a smooth staggered entrance on container child elements
   */
  public staggerEntrance(container: HTMLElement | null, itemSelector: string = '> *', stepMs: number = 30): void {
    if (!container || this.config.reducedMotion) return;
    const items = container.querySelectorAll<HTMLElement>(itemSelector);
    items.forEach((item, index) => {
      item.style.animationDelay = `${index * stepMs}ms`;
      item.classList.add('urefy-motion-stagger-in');
    });
  }

  /**
   * Applies subtle interactive button click feedback (scale micro-pulse)
   */
  public attachInteractiveFeedback(element: HTMLElement | null): void {
    if (!element || this.config.reducedMotion) return;
    element.addEventListener('pointerdown', () => {
      element.style.transform = 'scale(0.97)';
      element.style.transition = 'transform 100ms cubic-bezier(0.2, 0.8, 0.2, 1)';
    });
    const reset = () => {
      element.style.transform = '';
      element.style.transition = 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
    };
    element.addEventListener('pointerup', reset);
    element.addEventListener('pointerleave', reset);
  }
}

export const urefyMotion = UrefyMotionSystem.getInstance();
