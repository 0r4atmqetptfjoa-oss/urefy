import type { UserProfileData } from './profile/types.js';

export interface PublicIdentityPresentation {
  displayName: string;
  handleLabel: string;
  avatar: string;
  needsSetup: boolean;
  technicalFingerprint: string;
}

const GENERATED_NAME = /^(?:Member\s+[a-f0-9]+|User\s+[a-f0-9]+|Sovereign (?:Node|Explorer|User)|UREfy member|Profile not set up)$/i;
const GENERATED_HANDLE = /^(?:user_)?[a-f0-9]{6,30}$/i;

export function hasHumanPublicIdentity(profile: Pick<UserProfileData, 'name' | 'handle'> | null | undefined, fingerprint = ''): boolean {
  const name = profile?.name?.trim() || '';
  const handle = profile?.handle?.replace(/^@/, '').trim() || '';
  if (!name || !handle || GENERATED_NAME.test(name) || GENERATED_HANDLE.test(handle)) return false;
  if (/^[a-f0-9]{12,}$/i.test(fingerprint) && (name.toLowerCase().includes(fingerprint.slice(0, 6).toLowerCase()) || handle.toLowerCase() === fingerprint.slice(0, handle.length).toLowerCase())) return false;
  return true;
}

export function presentPublicIdentity(
  profile: Pick<UserProfileData, 'name' | 'handle' | 'avatar'> | null | undefined,
  fingerprint: string,
  isSelf = false,
): PublicIdentityPresentation {
  const needsSetup = !hasHumanPublicIdentity(profile as Pick<UserProfileData, 'name' | 'handle'> | undefined, fingerprint);
  return {
    displayName: needsSetup ? (isSelf ? 'Finish your profile' : 'Profile not set up') : profile!.name.trim(),
    handleLabel: needsSetup ? (isSelf ? 'Choose your public name and @handle' : 'Public name pending') : `@${profile!.handle.replace(/^@/, '').trim()}`,
    avatar: needsSetup ? '' : (profile?.avatar || ''),
    needsSetup,
    technicalFingerprint: fingerprint,
  };
}
