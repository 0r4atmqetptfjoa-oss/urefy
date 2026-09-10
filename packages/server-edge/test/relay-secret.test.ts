import { describe, expect, it } from 'vitest';
import { resolveRelaySecret } from '../src/relay-secret.js';

describe('URE relay secret resolution', () => {
  it('fails closed in production when no sufficiently strong secret is configured', () => {
    expect(resolveRelaySecret({ ENVIRONMENT: 'production' })).toBeNull();
    expect(resolveRelaySecret({ ENVIRONMENT: 'production', AUTH_SECRET: 'short' })).toBeNull();
  });

  it('accepts an explicitly configured production secret', () => {
    expect(resolveRelaySecret({
      ENVIRONMENT: 'production',
      AUTH_SECRET: 'production-secret-at-least-16',
    })).toBe('production-secret-at-least-16');
  });

  it('keeps the legacy secret available only outside production for compatibility tests', () => {
    expect(resolveRelaySecret({ ENVIRONMENT: 'test' })).toBe('aetheris-sovereign-relay-secret');
  });
});
