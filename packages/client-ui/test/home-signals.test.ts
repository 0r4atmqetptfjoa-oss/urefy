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

  it('keeps untrusted post data out of shared navigation', () => {
    const malicious = { ...post('" onclick="bad', Date.now() - 1), title: '<img src=x onerror=bad>', channelId: '<script>bad</script>' };
    const html = renderHomeHorizon([malicious], false, false);
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('data-post-id');
    expect(html).not.toContain('<script>');
  });

  it('provides working destinations without fabricated activity or a duplicate feed', () => {
    const html = renderHomeHorizon([], false, false);
    expect(html).toContain('href="/communities"');
    expect(html).toContain('data-mode="vault"');
    expect(html).not.toContain('orbit-signal"');
    expect(renderHomeHorizon([], true, false)).not.toContain('E2EE');
    expect(renderHomeHorizon([], true, true)).not.toContain('members');
  });
});
