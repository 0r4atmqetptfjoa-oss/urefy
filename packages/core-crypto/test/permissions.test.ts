import { describe, it, expect } from 'vitest';
import { AtomicPermission, ROLE_PERMISSIONS, PermissionEngine } from '../src/permissions.js';

describe('Atomic Permissions & Moderation Isolation', () => {
  it('strictly isolates HIDE_EXPRESSION from DELETE_EXPRESSION', () => {
    const curatorMask = ROLE_PERMISSIONS['CURATOR'];

    // Curator can hide
    expect(PermissionEngine.hasPermission(curatorMask, AtomicPermission.HIDE_EXPRESSION)).toBe(true);

    // Curator CANNOT delete
    expect(PermissionEngine.hasPermission(curatorMask, AtomicPermission.DELETE_EXPRESSION)).toBe(false);

    // Verification of atomic isolation helper
    expect(PermissionEngine.isSafelyIsolatedModerator(curatorMask)).toBe(true);
  });

  it('verifies GUARDIAN has full administrative rights', () => {
    const guardianMask = ROLE_PERMISSIONS['GUARDIAN'];

    expect(PermissionEngine.hasPermission(guardianMask, AtomicPermission.DELETE_EXPRESSION)).toBe(true);
    expect(PermissionEngine.hasPermission(guardianMask, AtomicPermission.EXECUTE_ROLLBACK)).toBe(true);
    expect(PermissionEngine.hasPermission(guardianMask, AtomicPermission.MANAGE_CHANNELS)).toBe(true);
  });

  it('combines bitwise permissions without overlap errors', () => {
    const customMask = PermissionEngine.combine(
      AtomicPermission.CREATE_EXPRESSION,
      AtomicPermission.MANAGE_CHANNELS
    );

    expect(PermissionEngine.hasPermission(customMask, AtomicPermission.CREATE_EXPRESSION)).toBe(true);
    expect(PermissionEngine.hasPermission(customMask, AtomicPermission.MANAGE_CHANNELS)).toBe(true);
    expect(PermissionEngine.hasPermission(customMask, AtomicPermission.DELETE_EXPRESSION)).toBe(false);
  });
});
