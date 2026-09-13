import { describe, expect, it } from 'vitest';
import { TrendingEngine } from '../src/trending.js';

describe('Observed hashtag trends', () => {
  it('does not invent activity in an empty feed', () => {
    const engine = new TrendingEngine(() => []);
    expect(engine.getTrendingTopics()).toEqual([]);
    expect(engine.renderTrendingCard()).toContain('No hashtags in loaded posts.');
  });

  it('counts each hashtag once per unique post without case sensitivity', () => {
    const first = { id: 'first', title: '#Privacy', content: '#privacy #Code' };
    const engine = new TrendingEngine(() => [first, first, { id: 'second', title: '', content: '#PRIVACY' }]);
    expect(engine.getTrendingTopics()).toEqual([
      { tag: '#privacy', count: 2, category: 'Loaded posts' },
      { tag: '#code', count: 1, category: 'Loaded posts' },
    ]);
  });

  it('updates from the current feed and only shows the top five tags', () => {
    const posts = [{ id: 'first', title: '', content: '#f #e #d #c #b #a' }];
    const engine = new TrendingEngine(() => posts);
    expect(engine.getTrendingTopics().map(topic => topic.tag)).toEqual(['#a', '#b', '#c', '#d', '#e']);
    posts.length = 0;
    expect(engine.getTrendingTopics()).toEqual([]);
  });

  it('never interpolates HTML or attribute delimiters from post content', () => {
    const engine = new TrendingEngine(() => [{ id: 'first', title: '', content: '#safe" autofocus onfocus="alert(1) <script>attack</script>' }]);
    expect(engine.renderTrendingCard()).toContain('data-search-tag="#safe"');
    expect(engine.renderTrendingCard()).not.toContain('onfocus');
    expect(engine.renderTrendingCard()).not.toContain('<script>');
  });
});
