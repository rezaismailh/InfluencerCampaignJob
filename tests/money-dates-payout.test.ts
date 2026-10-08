import { describe, expect, it } from 'vitest';
import { formatRupiah, parseRupiah } from '@/lib/money';
import { addBusinessDays, todayWib } from '@/lib/dates';
import { MIN_PAYOUT, payoutBreakdown, transferFeeFor } from '@/lib/payout';

describe('money', () => {
  it('formats integer rupiah with dot separators', () => {
    expect(formatRupiah(1250000).replace(/\s/g, ' ')).toBe('Rp 1.250.000');
  });
  it('parses user input', () => {
    expect(parseRupiah('Rp 1.250.000')).toBe(1250000);
    expect(parseRupiah('750000')).toBe(750000);
    expect(parseRupiah('')).toBeNull();
  });
});

describe('working days', () => {
  it('skips weekends', () => {
    expect(addBusinessDays('2026-10-09', 3)).toBe('2026-10-14'); // Fri -> Wed
    expect(addBusinessDays('2026-10-10', 1)).toBe('2026-10-12'); // Sat -> Mon
  });
  it('skips holidays', () => {
    expect(addBusinessDays('2026-10-09', 3, ['2026-10-12'])).toBe('2026-10-15');
  });
  it('uses WIB for today', () => {
    expect(todayWib(new Date('2026-10-06T18:30:00Z'))).toBe('2026-10-07');
  });
});

describe('payout', () => {
  it('charges Rp 2.500 except for BCA and Mandiri', () => {
    expect(transferFeeFor('BCA')).toBe(0);
    expect(transferFeeFor('Mandiri')).toBe(0);
    expect(transferFeeFor('BRI')).toBe(2500);
    expect(transferFeeFor('GoPay')).toBe(2500);
  });
  it('computes net and minimum', () => {
    expect(payoutBreakdown(150000, 'BRI')).toEqual({ gross: 150000, fee: 2500, net: 147500, meetsMinimum: true });
    expect(payoutBreakdown(MIN_PAYOUT - 1, 'BCA').meetsMinimum).toBe(false);
  });
});

describe('notificationText counts', () => {
  it('formats follower counts with thousands separators', async () => {
    const { notificationText } = await import('@/lib/notification-text');
    const t = (_k: string, v?: Record<string, string | number>) => `${v?.old} → ${v?.new}`;
    expect(notificationText({ kind: 'followers_updated', params: { old: 9000, new: 15000 } }, t, (k) => k, (k) => k)).toBe('9.000 → 15.000');
  });
});

describe('tiers', () => {
  it('maps followers to tiers and picks the right account', async () => {
    const { tierFor, creatorTier, tierFeeList } = await import('@/lib/tiers');
    expect([9_999, 10_000, 100_000, 1_000_000].map(tierFor)).toEqual(['nano', 'micro', 'macro', 'mega']);
    const accounts = [{ platform: 'tiktok' as const, followers: 200_000 }, { platform: 'instagram' as const, followers: 3_000 }];
    const job = { platforms: ['tiktok', 'instagram'] as ('tiktok' | 'instagram')[], primary_platform: null };
    expect(creatorTier({ ...job, tier_basis: 'largest' }, accounts)).toBe('macro');
    expect(creatorTier({ ...job, tier_basis: 'primary', primary_platform: 'instagram' }, accounts)).toBe('nano');
    expect(creatorTier({ ...job, tier_basis: 'primary', primary_platform: 'youtube' as never }, accounts)).toBeNull();
    expect(tierFeeList({ micro: 500000, nano: 150000, mega: 0 })).toEqual([{ tier: 'nano', fee: 150000 }, { tier: 'micro', fee: 500000 }]);
  });
});

describe('timeline with insight', () => {
  it('adds the insight step only when the job requires it', async () => {
    const { timeline } = await import('@/lib/work');
    const part = { status: 'approved', decided_at: null, post_confirmed_at: '2026-10-10T00:00:00Z' } as never;
    const keys = (require_insight: boolean) => timeline(part, { job_type: 'non_visit', product_option: 'none', require_insight }, {}).map((s) => s.key);
    expect(keys(true)).toContain('stepInsight');
    expect(keys(false)).not.toContain('stepInsight');
    expect(keys(true).indexOf('stepInsight')).toBe(keys(true).indexOf('stepPosted') + 1);
  });
});
