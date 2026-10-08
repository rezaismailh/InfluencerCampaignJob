import type { Platform } from './social';

// Creator tiers a job can target. Tali focuses on nano and micro, but bigger jobs happen.
// Bands by follower count (kept in sync with public.tier_for in the database).
export const TIERS = ['nano', 'micro', 'macro', 'mega'] as const;
export type Tier = (typeof TIERS)[number];

export function tierFor(followers: number): Tier {
  if (followers >= 1_000_000) return 'mega';
  if (followers >= 100_000) return 'macro';
  if (followers >= 10_000) return 'micro';
  return 'nano';
}

export type TierBasis = 'largest' | 'primary';

/**
 * A creator's tier for a job: from the largest account on the job's platforms, or from the
 * account on the job's main platform. Null when no account counts. Mirrors public.creator_tier.
 */
export function creatorTier(
  job: { platforms: Platform[]; tier_basis: TierBasis; primary_platform: Platform | null },
  accounts: { platform: Platform; followers: number }[],
): Tier | null {
  const counted = accounts.filter((a) =>
    job.tier_basis === 'primary' && job.primary_platform ? a.platform === job.primary_platform : job.platforms.includes(a.platform));
  if (!counted.length) return null;
  return tierFor(Math.max(...counted.map((a) => a.followers)));
}

/** Offered tier fees in tier order. */
export function tierFeeList(tierFees: Record<string, number>): { tier: Tier; fee: number }[] {
  return TIERS.filter((t) => typeof tierFees[t] === 'number' && tierFees[t] > 0).map((t) => ({ tier: t, fee: tierFees[t] }));
}
