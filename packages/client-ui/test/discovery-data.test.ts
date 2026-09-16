import { describe, expect, it } from 'vitest';
import { collectTopics, communityCategories, filterCommunities, parseRecentSearches } from '../src/discovery-data.js';
import type { ClientPost } from '../src/client-state.js';
import type { SovereignCircle } from '../src/sovereign-circle.js';
import { renderDiscoveryCard } from '../src/discovery-card.js';

const post = (id: string, content: string) => ({ id, content, flair: '' } as ClientPost);
const circle = (name: string, category: string, isJoined = false) => ({ id: name, name, displayName: name, description: 'Open discussion', category, isJoined, membersCount: 0 } as SovereignCircle);

describe('discovery data', () => {
  it('counts a topic once per post, merges case variants, and supports Unicode', () => {
    const posts = [post('one', '#Privacy #privacy #Știință'), post('two', '#PRIVACY #Știință'), post('two', '#PRIVACY #Știință')];
    expect(collectTopics(posts).map(item => item.count)).toEqual([2, 2]);
    expect(collectTopics(posts).some(item => item.topic === '#Știință')).toBe(true);
    expect(collectTopics([])).toEqual([]);
  });
  it('recovers from malformed search history and discards nonstrings and duplicates', () => {
    for (const raw of ['{', '{}', 'null', '123']) expect(parseRecentSearches(raw)).toEqual([]);
    expect(parseRecentSearches('[" privacy ",null,42,"PRIVACY","",{},"design"]')).toEqual(['privacy', 'design']);
    expect(parseRecentSearches(JSON.stringify(Array.from({ length: 20 }, (_, i) => `topic ${i}`)))).toHaveLength(8);
  });
  it('uses stored category names and combines search, topic, and membership', () => {
    const circles = [circle('private', 'Privacy & Freedom', true), circle('design', 'Creative'), circle('tools', 'Privacy & Freedom')];
    expect(communityCategories(circles)).toEqual(['all', 'Creative', 'Privacy & Freedom']);
    expect(filterCommunities(circles, 'PRIVATE', 'Privacy & Freedom', 'joined').map(c => c.name)).toEqual(['private']);
    expect(filterCommunities(circles, 'design', 'Privacy & Freedom', 'all')).toEqual([]);
    expect(filterCommunities(circles, '', 'all', 'joined')).toHaveLength(1);
  });
  it('escapes community-supplied text and identifiers in cards', () => {
    const html = renderDiscoveryCard({ ...circle('"<script>', '<img>'), icon: '<img src=x onerror=bad>' });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&quot;&lt;script&gt;');
  });
});
