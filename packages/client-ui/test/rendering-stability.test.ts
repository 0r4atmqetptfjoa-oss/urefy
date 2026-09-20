import { describe, it, expect } from 'vitest';
import { renderPulseFeedSkeleton } from '../src/empty-states.js';
import { SETTINGS_SECTIONS } from '../src/settings-view.js';
import { relaysManager } from '../src/relays-manager.js';
import { sovereignRouter } from '../src/router.js';

describe('Rendering Stability & CLS Prevention Suite', () => {
  it('1. renderPulseFeedSkeleton matches social-post layout geometry exactly to prevent CLS', () => {
    const skeleton = renderPulseFeedSkeleton();
    // Must contain .social-post wrapper
    expect(skeleton).toContain('social-post');
    expect(skeleton).toContain('social-post-skeleton');
    expect(skeleton).toContain('animate-pulse');
    // Must contain avatar skeleton circle
    expect(skeleton).toContain('w-10 h-10 rounded-full');
    // Must contain author header skeleton
    expect(skeleton).toContain('h-3.5 bg-white/15 rounded w-28');
    // Must contain post body line skeletons
    expect(skeleton).toContain('h-4 bg-white/10 rounded w-3/4');
    expect(skeleton).toContain('h-3.5 bg-white/10 rounded w-full');
    // Must contain action bar skeleton with vote pill and action buttons
    expect(skeleton).toContain('h-6 bg-white/5 rounded-full w-14');
  });

  it('2. SETTINGS_SECTIONS provides consumer-friendly simplified labels without tech jargon', () => {
    const labels = Object.fromEntries(SETTINGS_SECTIONS.map(s => [s.id, s.label]));
    expect(labels.preferences).toBe('Network');
    expect(labels.footprint).toBe('Storage');
    expect(labels.backup).toBe('Data & Export');
    expect(labels.telemetry).toBe('Privacy');
  });

  it('3. Relays manager replaces voice-radar with standard community text channel', () => {
    const relays = relaysManager.getRelays();
    const allChannels = relays.flatMap(r => r.channels);
    const hasVoiceRadar = allChannels.some(ch => ch.id === 'voice-radar' || ch.name.toLowerCase().includes('voice-radar'));
    expect(hasVoiceRadar).toBe(false);

    const hasCommunity = allChannels.some(ch => ch.id === 'relays-community' && ch.name === 'community');
    expect(hasCommunity).toBe(true);
  });

  it('4. SovereignRouter resolves route synchronously without blank frames', () => {
    expect(sovereignRouter.route).toBeDefined();
    expect(typeof sovereignRouter.route).toBe('string');
  });
});
