import { describe, it, expect, beforeEach } from 'vitest';
import { mobileFlowEngine, MobileFlowEngine } from '../src/mobile-flow.js';
import { clientStore } from '../src/client-state.js';
import type { ClientPost } from '../src/client-state.js';

describe('Mobile Flow Engine (Section 25)', () => {
  let engine: MobileFlowEngine;
  let samplePosts: ClientPost[];

  beforeEach(() => {
    engine = new MobileFlowEngine();
    samplePosts = [
      {
        id: 'flow-post-1',
        channelId: 'pulse-global',
        authorFingerprint: 'genesis-archivist-99',
        authorRole: 'ARCHIVIST',
        title: 'Zero-Knowledge Recursive SNARK Benchmark',
        content: 'Benchmark tests executing across mesh nodes with Nova folding schemes and 1.2ms verification time.',
        flair: 'VERIFIED RELEASE',
        meritVotes: 420,
        userVoted: 1,
        replyCount: 28,
        boostCount: 15,
        createdAt: Date.now() - 3600000,
        images: ['https://example.com/graph.png'],
      },
      {
        id: 'flow-post-2',
        channelId: 'pulse-global',
        authorFingerprint: 'peer-node-101',
        authorRole: 'MEMBER',
        title: 'Editorial Typography in Sovereign Networks',
        content: 'Why high-legibility serif and sans-serif pairings outperform generic UI templates.',
        flair: 'TECH DISCUSSION',
        meritVotes: 85,
        userVoted: 0,
        replyCount: 12,
        boostCount: 4,
        createdAt: Date.now() - 7200000,
      },
    ];
    clientStore.posts = samplePosts;
  });

  it('initializes with classic mode and allows switching to flow mode', () => {
    expect(engine.getMode()).toBe('classic');
    engine.setMode('flow');
    expect(engine.getMode()).toBe('flow');
    engine.setMode('classic');
    expect(engine.getMode()).toBe('classic');
  });

  it('renders mode switcher markup for mobile header', () => {
    const html = engine.renderModeSwitcher();
    expect(html).toContain('mobile-consumption-switcher');
    expect(html).toContain('data-action="set-mobile-mode"');
    expect(html).toContain('data-mobile-mode="flow"');
    expect(html).toContain('data-mobile-mode="classic"');
    expect(html).toContain('Flow');
    expect(html).toContain('Classic');
  });

  it('renders full-screen vertical swipe cards with scroll snapping', () => {
    const html = engine.renderFlowStream(samplePosts);
    expect(html).toContain('urefy-flow-container');
    expect(html).toContain('snap-y');
    expect(html).toContain('snap-mandatory');
    expect(html).toContain('data-post-id="flow-post-1"');
    expect(html).toContain('Zero-Knowledge Recursive SNARK Benchmark');
    expect(html).toContain('Editorial Typography in Sovereign Networks');
  });

  it('includes interactive action bar with merit voting and discussion trigger', () => {
    const html = engine.renderFlowStream(samplePosts);
    expect(html).toContain('data-action="open-flow-discussion"');
    expect(html).toContain('data-post-id="flow-post-1"');
    expect(html).toContain('data-pulse-action="like"');
    expect(html).toContain('data-pulse-action="bookmark"');
    expect(html).toContain('data-pulse-action="share"');
  });

  it('renders layered discussion bottom sheet without losing scroll context', () => {
    engine.openDiscussionSheet('flow-post-1');
    const sheetHtml = engine.renderDiscussionSheet();
    expect(sheetHtml).toContain('flow-discussion-sheet-overlay');
    expect(sheetHtml).toContain('data-action="close-flow-discussion"');
    expect(sheetHtml).toContain('Discussion');
  });
});
