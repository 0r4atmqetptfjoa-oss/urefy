import { describe, it, expect, beforeEach } from 'vitest';
import { AcousticDSPEngine, AUDIO_PROFILES } from '../src/acoustic-dsp';

describe('AcousticDSPEngine — 5-Band Parametric Equalizer & Audio Profiles', () => {
  let dsp: AcousticDSPEngine;

  beforeEach(() => {
    dsp = new AcousticDSPEngine();
  });

  it('should initialize with 5 frequency bands and Flat profile', () => {
    expect(dsp.bands.length).toBe(5);
    expect(dsp.activeProfileId).toBe('flat');
  });

  it('should set gain on specific bands with min/max clamping', () => {
    dsp.setGain(0, 8);
    expect(dsp.bands[0].gainDb).toBe(8);

    dsp.setGain(1, 20); // Clamped to 12
    expect(dsp.bands[1].gainDb).toBe(12);

    dsp.setGain(2, -25); // Clamped to -12
    expect(dsp.bands[2].gainDb).toBe(-12);
  });

  it('should apply preset audio profile across all bands', () => {
    dsp.applyProfile('voice');
    expect(dsp.activeProfileId).toBe('voice');
    expect(dsp.bands[2].gainDb).toBe(4); // 1kHz boosted in voice profile
  });

  it('should toggle DSP modal open/close state and render modal markup', () => {
    expect(dsp.isOpen).toBe(false);
    dsp.open();
    expect(dsp.isOpen).toBe(true);

    const html = dsp.renderDSPModal();
    expect(html).toContain('Acoustic Lounge DSP Equalizer');
    expect(html).toContain('slider-eq-gain');
    expect(html).toContain('btn-apply-dsp-eq');
    expect(html).toContain('btn-close-dsp-modal');

    dsp.close();
    expect(dsp.isOpen).toBe(false);
  });
});
