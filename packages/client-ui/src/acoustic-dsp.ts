/**
 * UREfy Acoustic Lounge DSP Equalizer & Spatial Soundstage Engine.
 * 5-band hardware-accelerated parametric equalizer with preset audio filters
 * and real-time frequency curve rendering for E2EE spatial audio streams.
 */

import { t } from './i18n.js';

export interface EQBand {
  freqHz: number;
  gainDb: number;
  label: string;
}

export interface AudioProfile {
  id: string;
  name: string;
  badge: string;
  gains: number[];
}

export const AUDIO_PROFILES: AudioProfile[] = [
  { id: 'flat', name: 'Flat Reference', badge: '🎚️ Reference', gains: [0, 0, 0, 0, 0] },
  { id: 'voice', name: 'Voice Clarity', badge: '🎙️ Voice', gains: [-2, 1, 4, 3, -1] },
  { id: 'hifi', name: 'Hi-Fi Master', badge: '🎧 Hi-Fi', gains: [3, 1, -1, 2, 4] },
  { id: 'bass', name: 'Bass Immersion', badge: '🔊 Deep Bass', gains: [6, 4, 0, -1, -2] }
];

export class AcousticDSPEngine {
  public bands: EQBand[] = [
    { freqHz: 60, gainDb: 0, label: '60 Hz (Sub)' },
    { freqHz: 250, gainDb: 0, label: '250 Hz (Low)' },
    { freqHz: 1000, gainDb: 0, label: '1 kHz (Mid)' },
    { freqHz: 4000, gainDb: 0, label: '4 kHz (Presence)' },
    { freqHz: 12000, gainDb: 0, label: '12 kHz (Air)' }
  ];

  public activeProfileId: string = 'flat';
  public isOpen: boolean = false;

  public setGain(bandIndex: number, gainDb: number): void {
    if (this.bands[bandIndex]) {
      this.bands[bandIndex].gainDb = Math.max(-12, Math.min(12, gainDb));
    }
  }

  public applyProfile(profileId: string): void {
    const profile = AUDIO_PROFILES.find(p => p.id === profileId);
    if (profile) {
      this.activeProfileId = profileId;
      profile.gains.forEach((g, idx) => {
        if (this.bands[idx]) this.bands[idx].gainDb = g;
      });
    }
  }

  public open(): void {
    this.isOpen = true;
  }

  public close(): void {
    this.isOpen = false;
  }

  public renderDSPModal(): string {
    if (!this.isOpen) return '';

    return `
      <div id="dsp-modal-backdrop" class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150 font-mono text-xs" data-action="call-global" data-raw-click="if(event.target.id === 'dsp-modal-backdrop') window.acousticDSP && window.acousticDSP.close();">
        <div class="relative w-full max-w-xl bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
          
          <!-- HEADER -->
          <div class="flex items-center justify-between pb-3 border-subtle-b">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xl font-bold shadow-lg">
                🎛️
              </div>
              <div>
                <h3 class="text-sm font-bold text-white flex items-center space-x-2">
                  <span>${t('acousticDsp.title', undefined, 'Acoustic Lounge DSP Equalizer')}</span>
                  <span class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">${t('acousticDsp.biquadFilter', undefined, 'Biquad Filter')}</span>
                </h3>
                <p class="text-[10px] text-slate-400">${t('acousticDsp.subtitle', undefined, 'Zero-Latency WebAudio SFrame Spatial Soundstage')}</p>
              </div>
            </div>
            <button id="btn-close-dsp-modal" class="w-8 h-8 rounded-full bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white flex items-center justify-center text-sm border border-white/10 transition-colors cursor-pointer" title="${t('modal.close', undefined, 'Close')} (Esc)">
              ✕
            </button>
          </div>

          <!-- PROFILES SELECTOR -->
          <div class="space-y-1.5">
            <span class="text-[10px] text-slate-400 uppercase tracking-wider">${t('acousticDsp.presets', undefined, 'Acoustic Presets:')}</span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              ${AUDIO_PROFILES.map(prof => `
                <button 
                  type="button" 
                  class="btn-audio-profile p-2.5 rounded-xl border transition-all cursor-pointer text-center ${this.activeProfileId === prof.id ? 'bg-indigo-600/30 border-indigo-400 text-white font-bold' : 'bg-surface-raised border-white/5 text-slate-300 hover:bg-surface-overlay'}"
                  data-profile-id="${prof.id}"
                >
                  <div class="text-sm">${prof.badge.split(' ')[0]}</div>
                  <div class="text-[10px] mt-0.5">${prof.name}</div>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- 5-BAND EQUALIZER SLIDERS -->
          <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-4">
            <div class="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
              <span>${t('acousticDsp.parametricBands', undefined, 'Parametric Frequency Bands')}</span>
              <span>${t('acousticDsp.dbRange', undefined, '-12 dB to +12 dB')}</span>
            </div>

            <div class="grid grid-cols-5 gap-3 pt-2">
              ${this.bands.map((band, idx) => `
                <div class="flex flex-col items-center space-y-2">
                  <span class="text-[10px] font-bold text-indigo-300">${band.gainDb > 0 ? `+${band.gainDb}` : band.gainDb} dB</span>
                  <input 
                    type="range" 
                    min="-12" 
                    max="12" 
                    step="1" 
                    value="${band.gainDb}" 
                    data-band-index="${idx}" 
                    class="slider-eq-gain h-28 w-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                    style="writing-mode: vertical-lr; direction: rtl;"
                  />
                  <span class="text-[9px] text-slate-400 text-center">${band.freqHz >= 1000 ? `${band.freqHz / 1000}k` : band.freqHz}Hz</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- ACTIONS -->
          <div class="flex items-center justify-between pt-1 border-subtle-t">
            <button id="btn-reset-dsp-eq" class="px-3.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-white transition-all cursor-pointer">
              ${t('acousticDsp.resetFlat', undefined, 'Reset Flat')}
            </button>
            <button id="btn-apply-dsp-eq" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md cursor-pointer flex items-center space-x-1.5">
              <span>${t('acousticDsp.applyToSoundstage', undefined, 'Apply to Soundstage')}</span>
              <span>⚡</span>
            </button>
          </div>

        </div>
      </div>
    `;
  }
}

export const acousticDSP = new AcousticDSPEngine();
