import { describe, expect, it } from 'vitest';
import { hasHumanPublicIdentity, presentPublicIdentity } from '../src/public-identity.js';

describe('public identity presentation', () => {
  it('uses a configured human identity as the primary social label', () => {
    const profile = { name: 'Alex Rivera', handle: 'alex_r', avatar: '/alex.png' } as any;
    expect(hasHumanPublicIdentity(profile, '060f6ea7d16fbdd7')).toBe(true);
    expect(presentPublicIdentity(profile, '060f6ea7d16fbdd7')).toMatchObject({
      displayName: 'Alex Rivera', handleLabel: '@alex_r', avatar: '/alex.png', needsSetup: false,
    });
  });

  it('does not turn a fingerprint-derived legacy profile into a social identity', () => {
    const profile = { name: 'Member 060f6e', handle: '060f6ea7', avatar: '' } as any;
    expect(hasHumanPublicIdentity(profile, '060f6ea7d16fbdd7')).toBe(false);
    expect(presentPublicIdentity(profile, '060f6ea7d16fbdd7')).toMatchObject({
      displayName: 'Profile not set up', handleLabel: 'Public name pending', needsSetup: true,
    });
  });

  it('gives the owner an actionable setup state without inventing a name', () => {
    expect(presentPublicIdentity(undefined, 'abcdef1234567890', true)).toMatchObject({
      displayName: 'Finish your profile', handleLabel: 'Choose your public name and @handle', needsSetup: true,
      technicalFingerprint: 'abcdef1234567890',
    });
  });
});
