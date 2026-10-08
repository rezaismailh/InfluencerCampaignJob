// Creator tiers a job can target. Tali focuses on nano and micro, but bigger jobs happen.
// Ranges follow the common industry split by follower count.
export const TIERS = ['nano', 'micro', 'macro', 'mega'] as const;
export type Tier = (typeof TIERS)[number];
