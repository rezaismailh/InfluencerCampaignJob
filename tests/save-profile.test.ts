import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal fakes around the server action: auth, Supabase, Next helpers, translations.
const db = { socialCount: 0, inserted: [] as unknown[], updated: null as Record<string, unknown> | null };
const supabase = {
  from: (table: string) => ({
    select: () => ({ eq: async () => ({ count: db.socialCount }) }),
    insert: async (rows: unknown[]) => { db.inserted.push(...rows); return { error: null }; },
    update: (row: Record<string, unknown>) => ({ eq: async () => { if (table === 'profiles') db.updated = row; return { error: null }; } }),
  }),
};
vi.mock('@/lib/auth', () => ({
  requireCreator: async () => ({ id: 'u1', supabase, profile: {} }),
  safeNext: (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/server', () => ({ after: () => {} }));
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Error(`REDIRECT ${to}`); } }));
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
}));
vi.mock('@/lib/notify', () => ({ deliverPending: async () => {} }));

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
};
const filled = { full_name: 'Reza', phone: '081234567890', province: 'Jawa Barat', city: 'Kota Bandung' };

beforeEach(() => {
  process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  db.socialCount = 0; db.inserted = []; db.updated = null;
});

describe('saveProfile', () => {
  it('lists what is missing in page order when finishing', async () => {
    const { saveProfile } = await import('@/app/(creator)/actions');
    const res = await saveProfile({}, form({ finish: '1', full_name: '', phone: '', province: 'Jawa Barat', city: '' }));
    expect(res.error).toBe('incomplete');
    expect(Object.keys(res.fields!)).toEqual(['full_name', 'phone', 'city', 'social']);
    expect(res.missing).toEqual(['fullName', 'phone', 'city', 'socialLabel']);
    expect(db.updated).toBeNull();
  });

  it('flags an incomplete social row instead of asking for an account', async () => {
    const { saveProfile } = await import('@/app/(creator)/actions');
    const res = await saveProfile({}, form({ finish: '1', ...filled, social_platform_0: 'tiktok', social_link_0: 'https://www.instagram.com/isreza', social_followers_0: '' }));
    expect(res.fields).toEqual({ social_link_0: 'platform_mismatch', social_followers_0: 'required' });
    expect(res.missing?.[0]).toContain('socialRowField');
  });

  it('saves the profile and new accounts, then finishes onboarding', async () => {
    const { saveProfile } = await import('@/app/(creator)/actions');
    await expect(saveProfile({}, form({
      finish: '1', next: '/job/abc', ...filled,
      social_platform_0: 'instagram', social_link_0: '@isreza', social_followers_0: '1.000',
      social_platform_1: '', social_link_1: '', social_followers_1: '',
    }))).rejects.toThrow('REDIRECT /job/abc?pasang=onboarding');
    expect(db.inserted).toEqual([{ creator_id: 'u1', platform: 'instagram', url: 'https://www.instagram.com/isreza', username: 'isreza', followers: 1000 }]);
    expect(db.updated).toMatchObject({ city: 'Kota Bandung', province: 'Jawa Barat' });
    expect(db.updated?.onboarded_at).toBeTruthy();
  });

  it('just saves on the profile page, without requiring a new account', async () => {
    const { saveProfile } = await import('@/app/(creator)/actions');
    const res = await saveProfile({}, form({ finish: '0', ...filled }));
    expect(res).toEqual({ ok: true, success: 'saved' });
    expect(db.updated?.onboarded_at).toBeUndefined();
  });

  it('accepts finishing with an account saved earlier', async () => {
    db.socialCount = 1;
    const { saveProfile } = await import('@/app/(creator)/actions');
    await expect(saveProfile({}, form({ finish: '1', ...filled }))).rejects.toThrow('REDIRECT /job?pasang=onboarding');
  });
});
