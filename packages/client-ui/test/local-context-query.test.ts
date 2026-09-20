import { describe, expect, it } from 'vitest';
import { compileContextQuery } from '../src/local-context-query.js';

const document = { text: 'Local privacy research and open source', author: 'Alice', kind: 'note', collection: 'Reading list', createdAt: Date.parse('2026-09-18T12:00:00Z') };
describe('local context query grammar', () => {
  it('combines phrases, exclusions and case-insensitive field filters', () => {
    expect(compileContextQuery('"open source" -cloud AUTHOR:alice kind:note collection:"Reading list"')(document)).toBe(true);
    expect(compileContextQuery('"source open"')(document)).toBe(false);
    expect(compileContextQuery('privacy -research')(document)).toBe(false);
    expect(compileContextQuery('kind:post')(document)).toBe(false);
  });
  it('requires every free-text term and normalizes compatibility characters', () => {
    expect(compileContextQuery('local source')(document)).toBe(true);
    expect(compileContextQuery('local missing')(document)).toBe(false);
    expect(compileContextQuery('ｌｏｃａｌ')(document)).toBe(true);
  });
  it('uses inclusive after and exclusive before UTC boundaries', () => {
    expect(compileContextQuery('after:2026-09-18 before:2026-09-19')(document)).toBe(true);
    expect(compileContextQuery('before:2026-09-18')(document)).toBe(false);
    expect(compileContextQuery('after:2026-02-30')(document)).toBe(false);
    expect(compileContextQuery('after:tomorrow')(document)).toBe(false);
    expect(compileContextQuery('after:2026-01-01')({ text: 'no date' })).toBe(false);
  });
  it('keeps unknown operators literal and treats empty query as all items', () => {
    expect(compileContextQuery('')({ text: '' })).toBe(true);
    expect(compileContextQuery('https://example.test')({ text: 'https://example.test' })).toBe(true);
    expect(compileContextQuery('unknown:value')(document)).toBe(false);
  });
});
