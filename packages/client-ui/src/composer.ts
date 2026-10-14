/**
 * @file composer.ts
 * @package @aetheris/client-ui
 * @description 2027 Unified Composer Bridge — Delegates to HybridComposer (composer-hybrid.ts)
 * while maintaining full backwards compatibility for all OmniComposer APIs and tests.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';
import { HybridComposer } from './composer-hybrid.js';

export interface ComposerAttachment {
  id: string;
  url: string;
  alt?: string;
  type: 'image' | 'video' | 'binary';
}

export interface QuotedPulseData {
  id: string;
  authorFingerprint: string;
  authorRole: string;
  title: string;
  content: string;
  createdAt?: number;
}

export class OmniComposer extends HybridComposer {
  public currentTextLength: number = 0;
  public maxPulseLength: number = 280;
  public attachedMedia: ComposerAttachment[] = [];

  public getCharacterRingMetrics(
    length: number = this.currentTextLength,
    max: number = this.maxPulseLength
  ): {
    radius: number;
    circumference: number;
    strokeDashoffset: number;
    strokeColor: string;
    charsLeft: number;
    progressPercent: number;
    isWarning: boolean;
    isExceeded: boolean;
    remaining: number;
    percentage: number;
  } {
    const radius = 12;
    const circumference = 2 * Math.PI * radius;
    const charsLeft = max - length;
    const progressPercent = Math.min(100, Math.max(0, Math.round((length / Math.max(1, max)) * 100)));
    const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, length) / Math.max(1, max)));

    let strokeColor = '#6366f1';
    const isWarning = charsLeft <= 20 && charsLeft >= 0;
    const isExceeded = charsLeft < 0;

    if (isExceeded || charsLeft <= 10) {
      strokeColor = '#ef4444';
    } else if (isWarning) {
      strokeColor = '#f59e0b';
    }

    return {
      radius,
      circumference,
      strokeDashoffset,
      strokeColor,
      charsLeft,
      progressPercent,
      isWarning,
      isExceeded,
      remaining: charsLeft,
      percentage: progressPercent,
    };
  }

  public renderCircularCountdownRing(
    length: number = this.currentTextLength,
    max: number = this.maxPulseLength
  ): string {
    const metrics = this.getCharacterRingMetrics(length, max);
    return `
      <div class="relative w-8 h-8 flex items-center justify-center select-none" title="${metrics.charsLeft} characters remaining">
        <svg class="w-7 h-7 transform -rotate-90" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="${metrics.radius}" stroke="#2f3336" stroke-width="2.5" fill="transparent" />
          <circle
            cx="16"
            cy="16"
            r="${metrics.radius}"
            stroke="${metrics.strokeColor}"
            stroke-width="2.5"
            stroke-dasharray="${metrics.circumference}"
            stroke-dashoffset="${metrics.strokeDashoffset}"
            stroke-linecap="round"
            fill="transparent"
            class="transition-all duration-150"
          />
        </svg>
        <span class="absolute text-[10px] font-mono font-bold" style="color: ${metrics.strokeColor}">
          ${metrics.charsLeft <= 20 ? metrics.charsLeft : ''}
        </span>
      </div>
    `;
  }

  public addMedia(url: string, alt: string = 'Visual attachment'): void {
    this.attachedMedia.push({
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      url,
      alt,
      type: 'image',
    });
  }

  public removeMedia(index: number): void {
    if (index >= 0 && index < this.attachedMedia.length) {
      this.attachedMedia.splice(index, 1);
    }
  }

  public renderAttachedMediaPreview(): string {
    if (this.attachedMedia.length === 0) return '';
    return `<div class="grid grid-cols-2 gap-2 mt-3">
      ${this.attachedMedia
        .map(
          (m, idx) => `<div class="relative rounded-xl overflow-hidden border border-white/10">
            <img src="${m.url}" alt="${m.alt || ''}" class="w-full h-24 object-cover" />
            <button type="button" data-remove-media-idx="${idx}" class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs">✕</button>
          </div>`
        )
        .join('')}
    </div>`;
  }

  public renderQuotedPulsePreview(): string {
    const q = (this as any).quotedPulse;
    if (!q) return '';
    return `<div class="mt-3 p-3 rounded-xl bg-white/[0.04] border border-cyan-500/30 text-xs text-slate-300">
      <div class="font-mono text-[10px] text-cyan-400">Quoting @${q.authorFingerprint}</div>
      <div class="font-bold text-white mt-0.5">${q.title || ''}</div>
      <div class="line-clamp-2 mt-0.5">${q.content || ''}</div>
    </div>`;
  }
}

export const omniComposer = new OmniComposer();
if (!serviceRegistry.has(SERVICES.OmniComposer)) {
  serviceRegistry.registerInstance(SERVICES.OmniComposer, omniComposer);
}
