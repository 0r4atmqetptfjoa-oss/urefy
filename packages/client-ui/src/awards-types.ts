/**
 * @file awards-types.ts
 * @package @aetheris/client-ui
 * @description Types and Interfaces for UREfy Sovereign Awards & Medals.
 */

export type SovereignAwardType =
  | 'PLATINUM'
  | 'GOLD'
  | 'SILVER'
  | 'BRONZE'
  | 'ZK_VERIFIED'
  | 'GUARDIAN_CHOICE'
  | 'COMMUNITY_PICK';

export interface Award {
  id: string;
  type: SovereignAwardType;
  emoji: string;
  label: string;
  description: string;
  color: string;
  bgGradient: string;
  meritPoints: number;
  aliasNames?: string[];
}

export interface PostAward {
  id?: string;
  type?: string;
  awardId: string;
  postId: string;
  commentId?: string;
  givenBy: string;
  givenAt: number;
  comment?: string;
  meritPoints?: number;
}

export interface GroupedAwardSummary {
  award: Award;
  count: number;
  givers: string[];
  comments: { giver: string; text: string; at: number }[];
  totalMeritValue: number;
}
