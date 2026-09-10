import { describe, expect, it } from 'vitest';
import { canonicalizeJson, MAX_CANONICAL_BYTES, MAX_CANONICAL_DEPTH, MAX_CANONICAL_NODES, createSignedEnvelope, createSovereignIdentity, verifySignedEnvelope } from '../src/identity.js';

describe('Bounded canonical JSON', () => {
  it('preserves existing canonical bytes for ordinary JSON', () => {
    expect(canonicalizeJson({ z: [true, null, 'text'], a: { second: 2, first: 1 } }))
      .toBe('{"a":{"first":1,"second":2},"z":[true,null,"text"]}');
  });

  it('normalizes absent optional fields consistently with the JSON transport', () => {
    expect(canonicalizeJson({ optional: undefined, items: [undefined, , 'value'] })).toBe('{"items":[null,null,"value"]}');
    const envelope = createSignedEnvelope({ optional: undefined, value: 1 }, createSovereignIdentity());
    expect(verifySignedEnvelope(JSON.parse(JSON.stringify(envelope))).authorized).toBe(true);
  });

  it.each([NaN, Infinity, -Infinity, BigInt(1), Symbol('value'), () => 1, new Date(), new Uint8Array(2)])('rejects unsupported value %s', value => {
    expect(() => canonicalizeJson({ value })).toThrow();
  });

  it('does not invoke getters or custom JSON hooks', () => {
    let called = false;
    const accessor = Object.defineProperty({}, 'value', { enumerable: true, get() { called = true; return 1; } });
    expect(() => canonicalizeJson(accessor)).toThrow('accessors');
    expect(() => canonicalizeJson({ toJSON() { called = true; return {}; } })).toThrow();
    expect(called).toBe(false);
  });

  it('rejects cycles but supports shared non-cyclic subobjects', () => {
    const shared = { value: 1 };
    expect(canonicalizeJson([shared, shared])).toBe('[{"value":1},{"value":1}]');
    const cyclic: unknown[] = [];
    cyclic.push(cyclic);
    expect(() => canonicalizeJson(cyclic)).toThrow('cycles');
  });

  it('bounds depth, element count and encoded size', () => {
    let nested: unknown = null;
    for (let depth = 0; depth < MAX_CANONICAL_DEPTH + 2; depth++) nested = [nested];
    expect(() => canonicalizeJson(nested)).toThrow('depth limit');
    expect(() => canonicalizeJson(new Array(MAX_CANONICAL_NODES + 1))).toThrow('node limit');
    expect(() => canonicalizeJson('x'.repeat(MAX_CANONICAL_BYTES))).toThrow('size limit');
  });
});