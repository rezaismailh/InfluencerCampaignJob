import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, PRESETS, buildRows, cleanColumns, filterRows, sortRows } from '@/lib/creator-directory';

const profile = (id: string, extra: Record<string, unknown> = {}) => ({
  id, email: `${id}@x.id`, full_name: id.toUpperCase(), province: 'Jawa Barat', city: 'Kota Bandung', categories: ['food'], persona: null,
  gender: null, hijab: null, account_type: null, onboarded_at: '2026-10-01', app_installed_at: null, created_at: `2026-10-0${id.length}T00:00:00Z`, ...extra,
});
const rows = buildRows(
  [profile('a', { gender: 'female', hijab: 'hijab', account_type: 'personal' }), profile('bb', { city: 'Kota Surabaya', province: 'Jawa Timur', onboarded_at: null }), profile('ccc')],
  [
    { creator_id: 'a', platform: 'tiktok', username: 'rani', url: 'u', followers: 12000, status: 'verified' },
    { creator_id: 'a', platform: 'instagram', username: 'rani.ig', url: 'u', followers: 900000, status: 'rejected' },
    { creator_id: 'bb', platform: 'instagram', username: 'budi', url: 'u', followers: 3000, status: 'pending' },
  ],
  [{ creator_id: 'a', status: 'approved', post_confirmed_at: '2026-10-05' }, { creator_id: 'a', status: 'applied', post_confirmed_at: null }],
  { phone: () => '0812', niche: (k) => (k === 'food' ? 'Kuliner' : k), persona: (k) => k, paid: new Map([['a', 350000]]) },
);

describe('buildRows', () => {
  it('summarises accounts and activity, ignoring rejected accounts for size', () => {
    const a = rows.find((r) => r.id === 'a')!;
    expect(a).toMatchObject({ maxFollowers: 12000, tier: 'micro', verification: 'verified', applied: 2, approved: 1, completed: 1, paid: 350000, niches: ['Kuliner'] });
    expect(rows.find((r) => r.id === 'ccc')).toMatchObject({ verification: 'none', tier: null, paid: 0 });
  });
});

describe('filterRows', () => {
  const ids = (f: Partial<typeof EMPTY_FILTERS>) => filterRows(rows, { ...EMPTY_FILTERS, ...f }).map((r) => r.id);
  it('searches name, username and city', () => {
    expect(ids({ q: '@budi' })).toEqual(['bb']);
    expect(ids({ q: 'surabaya' })).toEqual(['bb']);
  });
  it('combines filters with AND', () => {
    expect(ids({ platform: 'instagram' })).toEqual(['bb']); // A's Instagram is rejected
    expect(ids({ gender: 'female', hasJob: 'yes' })).toEqual(['a']);
    expect(ids({ onboarded: 'no' })).toEqual(['bb']);
    expect(ids({ verification: 'none' })).toEqual(['ccc']);
    expect(ids({ province: 'Jawa Barat', niche: 'Kuliner' })).toEqual(['a', 'ccc']);
  });
});

describe('sortRows and columns', () => {
  it('sorts numbers and text, empty text last', () => {
    expect(sortRows(rows, { key: 'maxFollowers', dir: 'desc' }).map((r) => r.id)).toEqual(['a', 'bb', 'ccc']);
    expect(sortRows(rows, { key: 'gender', dir: 'asc' })[0].id).toBe('a');
  });
  it('cleans saved column choices', () => {
    expect(cleanColumns(['name', 'bogus', 'name', 'tier'])).toEqual(['name', 'tier']);
    expect(cleanColumns('garbage')).toEqual(PRESETS.default);
    expect(cleanColumns(PRESETS.performance, PRESETS.performance.filter((k) => k !== 'paid'))).not.toContain('paid');
  });
});
