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
    remaining: number;
    percentage: number;
    strokeColor: string;
    isWarning: boolean;
    isExceeded: boolean;
  } {
    const remaining = max - length;
    const percentage = Math.min(100, Math.max(0, Math.round((length / Math.max(1, max)) * 100)));
    const isExceeded = remaining < 0;
    const isWarning = !isExceeded && remaining <= 20;
    const strokeColor = isExceeded ? '#f43f5e' : isWarning ? '#f59e0b' : '#00e5ff';

    return {
      remaining,
      percentage,
      strokeColor,
      isWarning,
      isExceeded,
    };
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
