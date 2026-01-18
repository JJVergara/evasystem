export const AMBASSADOR_CATEGORY = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  DIAMOND: 'diamond',
} as const;

export type AmbassadorCategory = (typeof AMBASSADOR_CATEGORY)[keyof typeof AMBASSADOR_CATEGORY];
