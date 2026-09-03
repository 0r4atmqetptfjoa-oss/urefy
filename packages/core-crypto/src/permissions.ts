/**
 * Atomic Permissions Bitmask Architecture.
 * Guarantees mathematical isolation of administrative rights.
 * Crucially: HIDE_EXPRESSION is strictly decoupled from DELETE_EXPRESSION.
 */
export enum AtomicPermission {
  NONE               = 0,
  CREATE_EXPRESSION  = 1 << 0, // 1: Send message, post thread
  EDIT_EXPRESSION    = 1 << 1, // 2: Edit own messages
  HIDE_EXPRESSION    = 1 << 2, // 4: Hide offensive/malicious posts (reversible)
  DELETE_EXPRESSION  = 1 << 3, // 8: Irreversible permanent deletion
  ASSIGN_ROLE        = 1 << 4, // 16: Grant community badges/roles
  REVOKE_ROLE        = 1 << 5, // 32: Strip badges/roles
  MANAGE_CHANNELS    = 1 << 6, // 64: Create/archive channels
  EXECUTE_ROLLBACK   = 1 << 7, // 128: 24h Atomic Rollback command
  BYPASS_RATE_LIMIT  = 1 << 8, // 256: Authorized Protocol Daemons
}

export const ROLE_PERMISSIONS: Record<string, number> = {
  GUEST: AtomicPermission.NONE,
  MEMBER: AtomicPermission.CREATE_EXPRESSION | AtomicPermission.EDIT_EXPRESSION,
  CURATOR:
    AtomicPermission.CREATE_EXPRESSION |
    AtomicPermission.EDIT_EXPRESSION |
    AtomicPermission.HIDE_EXPRESSION,
  MODERATOR:
    AtomicPermission.CREATE_EXPRESSION |
    AtomicPermission.EDIT_EXPRESSION |
    AtomicPermission.HIDE_EXPRESSION |
    AtomicPermission.ASSIGN_ROLE |
    AtomicPermission.REVOKE_ROLE,
  ARCHIVIST_DAEMON:
    AtomicPermission.CREATE_EXPRESSION |
    AtomicPermission.BYPASS_RATE_LIMIT,
  GUARDIAN:
    AtomicPermission.CREATE_EXPRESSION |
    AtomicPermission.EDIT_EXPRESSION |
    AtomicPermission.HIDE_EXPRESSION |
    AtomicPermission.DELETE_EXPRESSION |
    AtomicPermission.ASSIGN_ROLE |
    AtomicPermission.REVOKE_ROLE |
    AtomicPermission.MANAGE_CHANNELS |
    AtomicPermission.EXECUTE_ROLLBACK,
};

export class PermissionEngine {
  /**
   * Checks if a user's bitmask satisfies a required permission.
   */
  static hasPermission(userMask: number, required: AtomicPermission): boolean {
    return (userMask & required) === required;
  }

  /**
   * Verifies atomic isolation: confirms that a role holding HIDE_EXPRESSION
   * does NOT accidentally inherit DELETE_EXPRESSION.
   */
  static isSafelyIsolatedModerator(userMask: number): boolean {
    const canHide = this.hasPermission(userMask, AtomicPermission.HIDE_EXPRESSION);
    const canDelete = this.hasPermission(userMask, AtomicPermission.DELETE_EXPRESSION);
    return canHide && !canDelete;
  }

  /**
   * Calculates a combined bitmask from an array of permissions.
   */
  static combine(...permissions: AtomicPermission[]): number {
    return permissions.reduce((acc, p) => acc | p, 0);
  }
}
