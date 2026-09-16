import { describe, expect, it } from 'vitest';
import type { ClientPost } from '../src/client-state.js';
import { countPostsSince, selectHomeHighlights } from '../src/home-signals.js';
import { renderHomeHorizon } from '../src/home-horizon.js';

const now = 1800000000000;
const post = (id: string, createdAt: number): ClientPost => ({
  id, createdAt, channelId: 'c/design', title: 'A useful idea', content: 'Hello',
  authorFingerprint: 'author', authorRole: 'MEMBER', flair: 'MICRO-PULSE',
  meritVotes: 0, userVoted: 0, replyCount: 0, boostCount: 0, isExpanded: false,
});

describe('home signals', () => {
  it('shows recent unique posts in time order without mutating the feed', () => {
    const posts = [post('a', now - 5), post('old', now - 8 * 86400000), post('b', now - 1), post('a', now - 5), post('future', now + 1), post('invalid', NaN), post('c', now - 2), post('d', now - 3)];
    const original = [...posts];
    expect(selectHomeHighlights(posts, now).map(p => p.id)).toEqual(['b', 'c', 'd']);
    expect(posts).toEqual(original);
    expect(selectHomeHighlights([], now)).toEqual([]);
  });

  it('counts only distinct arrivals after a valid recorded visit', () => {
    const posts = [post('before', now - 20), post('after', now - 5), post('after', now - 5), post('future', now + 5)];
    expect(countPostsSince(posts, now - 10, now)).toBe(1);
    for (const lastActive of [0, NaN, -1, now, now + 1]) expect(countPostsSince(posts, lastActive, now)).toBe(0);
  });

  it('escapes externally supplied titles, channels and action identifiers', () => {
    const malicious = { ...post('" onclick="bad', Date.now() - 1), title: '<img src=x onerror=bad>', channelId: '<script>bad</script>' };
    const html = renderHomeHorizon([malicious], false, false);
    expect(html).toContain('&lt;img src=x onerror=bad&gt;');
    expect(html).toContain('&lt;script&gt;bad&lt;/script&gt;');
    expect(html).toContain('data-post-id="&quot; onclick=&quot;bad"');
    expect(html).not.toContain('<script>');
  });

  it('distinguishes local, connected and demo states without fabricated activity', () => {
    const html = renderHomeHorizon([], false, false);
    expect(html).toContain('Local workspace');
    expect(html).toContain('Join a community or share the first idea.');
    expect(html).not.toContain('orbit-signal"');
    expect(renderHomeHorizon([], true, false)).toContain('Relay connected');
    expect(renderHomeHorizon([], true, true)).toContain('Demo content');
  });
});
