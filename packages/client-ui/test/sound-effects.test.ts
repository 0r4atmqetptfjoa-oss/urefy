import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProceduralSoundEffects, soundEffects, type SoundEffectType } from '../src/sound-effects.js';

describe('Procedural Web Audio API Sound Generator', () => {
  let sfx: ProceduralSoundEffects;

  beforeEach(() => {
    (globalThis as any).window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    (globalThis as any).document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      createElement: vi.fn(() => ({
        innerHTML: '',
        style: {},
        classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn(() => false) },
        appendChild: vi.fn(),
        remove: vi.fn(),
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };

    sfx = new ProceduralSoundEffects();
    sfx.isEnabled = true;
    sfx.volume = 0.5;
  });

  it('should initialize with sound enabled and default volume', () => {
    expect(sfx.isEnabled).toBe(true);
    expect(sfx.volume).toBe(0.5);
  });

  it('should toggle sound state and clamp volume correctly', () => {
    sfx.toggleSound();
    expect(sfx.isEnabled).toBe(false);

    sfx.toggleSound();
    expect(sfx.isEnabled).toBe(true);

    sfx.setVolume(1.5);
    expect(sfx.volume).toBe(1.0);

    sfx.setVolume(-0.5);
    expect(sfx.volume).toBe(0.0);

    sfx.setVolume(0.42);
    expect(sfx.volume).toBe(0.42);
  });

  it('should synthesize all procedural sound effects without throwing', () => {
    const effects: SoundEffectType[] = [
      'upvote',
      'downvote',
      'boost',
      'click',
      'send',
      'notification',
      'reaction',
      'rekey',
      'voice-join',
      'voice-leave',
      'success',
      'security-alert',
      'pop',
      'shield',
    ];

    for (const effect of effects) {
      expect(() => sfx.play(effect)).not.toThrow();
    }
  });

  it('should support individual direct methods', () => {
    expect(() => sfx.playUpvote()).not.toThrow();
    expect(() => sfx.playDownvote()).not.toThrow();
    expect(() => sfx.playBoost()).not.toThrow();
    expect(() => sfx.playClick()).not.toThrow();
    expect(() => sfx.playSend()).not.toThrow();
    expect(() => sfx.playNotification()).not.toThrow();
    expect(() => sfx.playReaction()).not.toThrow();
    expect(() => sfx.playRekey()).not.toThrow();
    expect(() => sfx.playVoiceJoin()).not.toThrow();
    expect(() => sfx.playVoiceLeave()).not.toThrow();
    expect(() => sfx.playSuccess()).not.toThrow();
    expect(() => sfx.playSecurityAlert()).not.toThrow();
    expect(() => sfx.playPop()).not.toThrow();
    expect(() => sfx.playShield()).not.toThrow();
  });

  it('should not play when muted', () => {
    sfx.isEnabled = false;
    expect(() => sfx.playUpvote()).not.toThrow();
    expect(() => sfx.playBoost()).not.toThrow();
    expect(() => sfx.playSend()).not.toThrow();
  });

  it('should render sound toggle button and controls HTML', () => {
    const toggleHtml = sfx.renderSoundToggle();
    expect(toggleHtml).toContain('aetheris-sound-toggle-btn');
    expect(toggleHtml).toContain('data-action="toggle-sound"');

    const controlsHtml = sfx.renderSoundControls();
    expect(controlsHtml).toContain('Acoustic Synthesizer');
    expect(controlsHtml).toContain('data-sound-test="upvote"');
    expect(controlsHtml).toContain('data-sound-test="boost"');
    expect(controlsHtml).toContain('data-sound-test="send"');
  });

  it('should bind UI events cleanly', () => {
    expect(() => sfx.bindUIEvents()).not.toThrow();
    expect(() => sfx.bindUIEvents({ querySelectorAll: () => [] } as any)).not.toThrow();
  });

  it('should provide singleton instance', () => {
    expect(soundEffects).toBeDefined();
    expect(soundEffects).toBeInstanceOf(ProceduralSoundEffects);
  });
});
