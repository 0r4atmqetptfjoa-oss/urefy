import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProductDatabase } from './helpers/product-database.js';
import { onRequestGet } from '../functions/api/search.js';
import type { Env } from '../functions/api/_db.js';
import { urlset } from '../functions/_sitemaps.js';
import { AutocompleteEngine } from '../src/autocomplete.js';
import { linkPreviewEngine } from '../src/link-preview.js';
import { ProfileView } from '../src/profile/profile-view.js';
import { SOVEREIGN_PERSONAS } from '../src/profile/production-profiles-data.js';
vi.mock('../src/demo-mode.js', () => ({ isDemoModeEnabled: () => false }));

describe('Search SQL against real local SQLite', () => {
  let fixture: ReturnType<typeof createProductDatabase>;
  beforeEach(() => {
    fixture = createProductDatabase();
    const insert = fixture.sqlite.prepare('INSERT INTO posts (id,channel_id,author_id,title,content,status,audience,created_at) VALUES (?,?,?,?,?,?,?,?)');
    for (const [id, status, audience] of [
      ['public', 'published', 'public'], ['pinned', 'pinned', 'public'], ['locked', 'locked', 'public'],
      ['draft', 'draft', 'public'], ['deleted', 'deleted', 'public'], ['archived', 'archived', 'public'],
      ['tombstone', 'tombstone', 'public'], ['private', 'published', 'followers'], ['community', 'published', 'community'],
      ['synthetic', 'published', 'public'], ['blocked', 'published', 'public'],
    ]) {
      insert.run(id, 'general', id === 'blocked' ? 'blocked-author' : 'author', 'needle', 'needle content', status, audience, 1000);
      fixture.sqlite.prepare('INSERT INTO post_tags (post_id,tag,created_at) VALUES (?,?,?)').run(id, 'needle', 1000);
    }
    fixture.sqlite.exec("INSERT INTO synthetic_fixtures (resource_type,resource_id,environment,cleanup_run_id,created_at) VALUES ('post','synthetic','test','repair-pass',1000)");
    fixture.sqlite.exec("INSERT INTO user_blocks (blocker_id,blocked_id,created_at) VALUES ('reader','blocked-author',1000)");
  });
  afterEach(() => fixture.sqlite.close());
  async function search(params: string) {
    const response = await onRequestGet({ request: new Request(`https://urefy.com/api/search?q=needle&${params}`), env: { DB: fixture.database, ENVIRONMENT: 'production' } as Env });
    expect(response.status).toBe(200); return response.json();
  }
  it('returns only visible public posts from unblocked authors', async () => {
    const body = await search('category=posts&userId=reader');
    expect(body.results.posts.map((p: { id: string }) => p.id).sort()).toEqual(['locked', 'pinned', 'public']);
  });
  it('counts only visible unblocked topics', async () => {
    expect((await search('category=topics&userId=reader')).results.topics).toEqual([{ tag: '#needle', postCount: 3 }]);
  });
  it.each(['invalid', 'NaN', 'Infinity', '-1', '0', '1.5', '10000'])('bounds limit %s', async limit => {
    const body = await search(`category=posts&limit=${limit}`);
    expect(body.results.posts.length).toBeGreaterThan(0); expect(body.results.posts.length).toBeLessThanOrEqual(50);
  });
});

describe('Autocomplete safe rendering and lifecycle', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it('does not seed production suggestions or profiles', () => {
    const engine = new AutocompleteEngine();
    expect(engine.filterMembers('')).toEqual([]); expect(engine.filterTags('')).toEqual([]); expect(SOVEREIGN_PERSONAS).toEqual([]);
  });
  it('does not instantiate seeded or hard-coded demo profiles', () => {
    const profiles = new ProfileView();
    expect(profiles.profileData.size).toBe(0);
    expect(profiles.getProfile('c3dc28cb705e').name).toBe('Profile not set up');
    expect(profiles.getProfile('c3dc28cb705e').handle).toBe('');
  });
  it('escapes highlighted labels and subtitles', () => {
    const engine = new AutocompleteEngine(); engine.query = '<img'; engine.currentPrefix = '@';
    engine.items = [{ type: 'mention', value: 'member', displayLabel: '<img src=x>', subtitle: '<svg onload=x>', badge: '<b>', badgeColor: 'x" data-bad="yes' }];
    const html = engine.renderPopup();
    expect(html).not.toContain('<img'); expect(html).not.toContain('<svg onload'); expect(html).not.toContain('data-bad="yes');
    expect(html).toContain('&lt;img'); expect(html).toContain('&lt;svg');
  });
  it('requires explicit verification and preserves unknown/zero tag counts', () => {
    const engine = new AutocompleteEngine();
    engine.setMembers([{ fingerprint: 'a', role: 'Member' }, { fingerprint: 'b', role: 'Member', isZKVerified: true }]);
    expect(engine.filterMembers('').find(m => m.value === 'a')?.isZKVerified).toBe(false);
    expect(engine.filterMembers('').find(m => m.value === 'b')?.isZKVerified).toBe(true);
    engine.setTags(['unmeasured']); expect(engine.filterTags('')[0].subtitle).toBe('Topic');
    engine.setTags([{ tag: 'empty', count: 0 }]); expect(engine.filterTags('')[0].subtitle).toContain('0 posts');
    engine.setTags([]); engine.setMembers([]); expect(engine.filterTags('')).toEqual([]); expect(engine.filterMembers('')).toEqual([]);
  });
  it('ignores stale blur and keyboard events from another input', () => {
    vi.useFakeTimers(); const engine = new AutocompleteEngine(); const handlers = new Map<string, (event: unknown) => void>();
    const oldInput = { addEventListener: (name: string, callback: (event: unknown) => void) => handlers.set(name, callback) } as unknown as HTMLInputElement;
    const currentInput = {} as HTMLInputElement; engine.attach(oldInput); engine.activeInputElement = currentInput; engine.isVisible = true;
    vi.stubGlobal('document', { activeElement: currentInput });
    const hide = vi.spyOn(engine, 'hide'); const key = vi.spyOn(engine, 'handleKeyDown');
    handlers.get('blur')?.({}); vi.runAllTimers(); handlers.get('keydown')?.({ key: 'Enter', stopPropagation: vi.fn() });
    expect(hide).not.toHaveBeenCalled(); expect(key).not.toHaveBeenCalled();
  });
});

describe('Preview and sitemap bounds', () => {
  it('retains only 256 recent previews', () => {
    linkPreviewEngine.previewCache.clear();
    for (let i = 0; i < 256; i++) linkPreviewEngine.getPreview(`https://example.com/${i}`);
    linkPreviewEngine.getPreview('https://example.com/0'); linkPreviewEngine.getPreview('https://example.com/new');
    expect(linkPreviewEngine.previewCache.size).toBe(256); expect(linkPreviewEngine.previewCache.has('https://example.com/0')).toBe(true);
    expect(linkPreviewEngine.previewCache.has('https://example.com/1')).toBe(false);
  });
  it.each(['javascript:alert(1)', 'data:text/html,hello', 'https://user:password@example.com/', 'not-a-url'])('rejects unsafe preview %s', url => {
    expect(linkPreviewEngine.renderLinkPreviewCard(url)).toBe('');
  });
  it('preserves HTTPS links', () => { expect(linkPreviewEngine.renderLinkPreviewCard('https://example.com/article')).toContain('href="https://example.com/article"'); });
  it('omits out-of-range lastmod without failing the sitemap', () => {
    const xml = urlset([{ loc: 'https://urefy.com/u/a', modified: 1e30 }, { loc: 'https://urefy.com/u/b', modified: 1000 }]);
    expect(xml).toContain('https://urefy.com/u/a'); expect(xml).toContain('1970-01-01T00:00:01.000Z'); expect((xml.match(/<lastmod>/g) || []).length).toBe(1);
  });
});