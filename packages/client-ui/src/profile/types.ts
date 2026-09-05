/**
 * @file types.ts
 * @package @aetheris/client-ui/profile
 * @description Type definitions and federated handle helpers for sovereign profiles.
 */

export type ProfileTab = 'pulses' | 'replies' | 'highlights' | 'media' | 'likes' | 'settings';
export type SettingsCategory = 'account' | 'security' | 'privacy' | 'notifications' | 'appearance' | 'data' | 'advanced';

export interface UserProfileData {
  fingerprint: string;
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  bio: string;
  location: string;
  website: string;
  joinedEpoch: string;
  role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER';
  status: 'online' | 'idle' | 'dnd';
  isZKVerified: boolean;
  followingCount: number;
  followersCount: number;
  meritScore: number;
  trustScore: number; // 0-100 WoT Max Flow
  badges: string[];
}

/**
 * Formats a standard ActivityPub federated handle accepted by Mastodon and fediverse instances.
 * Format: @${identifier}@aetheris.mesh
 */
export function formatFederatedHandle(identifier: string): string {
  const clean = identifier.startsWith('@') ? identifier.slice(1) : identifier;
  return `@${clean}@aetheris.mesh`;
}

/**
 * 1-click helper to copy standard federated handle to system clipboard.
 */
export async function copyFederatedHandle(handleOrFp?: string): Promise<boolean> {
  const text = handleOrFp
    ? (handleOrFp.startsWith('@') ? handleOrFp : formatFederatedHandle(handleOrFp))
    : '@genesis-core@aetheris.mesh';

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

if (typeof window !== 'undefined') {
  (window as any).__aetheris_copy_federated_handle = copyFederatedHandle;
}
