// Admin → Creator: one row per registered creator, with search, filters, sorting and
// user-chosen columns. Pure data helpers; the table itself is components/admin/creator-table.tsx.

import { tierFor, type Tier } from './tiers';
import type { AccountType, Gender, Hijab, ParticipationStatus, VerificationStatus } from './types';
import type { Platform } from './social';

export type DirAccount = { platform: Platform; username: string; url: string; followers: number; status: VerificationStatus };

export type CreatorRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  province: string;
  city: string;
  gender: Gender | null;
  hijab: Hijab | null;
  accountType: AccountType | null;
  niches: string[];
  persona: string;
  accounts: DirAccount[];
  maxFollowers: number;
  tier: Tier | null;
  verification: VerificationStatus | 'none';
  applied: number;
  approved: number;
  completed: number;
  /** Total fees transferred; null when the viewer cannot see payouts. */
  paid: number | null;
  createdAt: string;
  onboarded: boolean;
  installed: boolean;
};

export const COLUMN_GROUPS = {
  profile: ['name', 'email', 'phone', 'province', 'city', 'gender', 'hijab', 'accountType', 'niches', 'persona'],
  social: ['accounts', 'maxFollowers', 'tier', 'verification'],
  activity: ['applied', 'approved', 'completed', 'paid', 'createdAt', 'onboarded', 'installed'],
} as const;
export type ColumnKey = (typeof COLUMN_GROUPS)[keyof typeof COLUMN_GROUPS][number];
export const ALL_COLUMNS = Object.values(COLUMN_GROUPS).flat() as ColumnKey[];

export const PRESETS: Record<'default' | 'curation' | 'contact' | 'performance', ColumnKey[]> = {
  default: ['name', 'city', 'gender', 'accountType', 'niches', 'accounts', 'tier', 'verification', 'applied', 'approved', 'createdAt'],
  curation: ['name', 'city', 'gender', 'hijab', 'accountType', 'niches', 'persona', 'accounts', 'maxFollowers', 'tier', 'verification'],
  contact: ['name', 'email', 'phone', 'city', 'accounts', 'createdAt'],
  performance: ['name', 'accounts', 'tier', 'applied', 'approved', 'completed', 'paid'],
};

/** Saved column choice, cleaned of unknown or hidden keys; falls back to the default preset. */
export function cleanColumns(saved: unknown, allowed: ColumnKey[] = ALL_COLUMNS): ColumnKey[] {
  if (!Array.isArray(saved)) return PRESETS.default.filter((k) => allowed.includes(k));
  const keys = saved.filter((k): k is ColumnKey => typeof k === 'string' && allowed.includes(k as ColumnKey));
  const unique = [...new Set(keys)];
  return unique.length ? unique : PRESETS.default.filter((k) => allowed.includes(k));
}

const VERIFICATION_RANK: Record<CreatorRow['verification'], number> = { verified: 3, pending: 2, rejected: 1, none: 0 };

type ProfileIn = {
  id: string; email: string | null; full_name: string | null; province: string | null; city: string | null;
  categories: string[]; persona: string | null; gender: Gender | null; hijab: Hijab | null; account_type: AccountType | null;
  onboarded_at: string | null; app_installed_at: string | null; created_at: string;
};
type PartIn = { creator_id: string; status: ParticipationStatus; post_confirmed_at: string | null };

export function buildRows(
  profiles: ProfileIn[],
  accounts: (DirAccount & { creator_id: string })[],
  parts: PartIn[],
  opts: { phone: (p: ProfileIn) => string; niche: (k: string) => string; persona: (k: string) => string; paid?: Map<string, number> },
): CreatorRow[] {
  const accBy = new Map<string, DirAccount[]>();
  for (const a of accounts) accBy.set(a.creator_id, [...(accBy.get(a.creator_id) ?? []), a]);
  const partBy = new Map<string, PartIn[]>();
  for (const p of parts) partBy.set(p.creator_id, [...(partBy.get(p.creator_id) ?? []), p]);

  return profiles.map((p) => {
    const accs = (accBy.get(p.id) ?? []).sort((a, b) => b.followers - a.followers);
    const counted = accs.filter((a) => a.status !== 'rejected');
    const maxFollowers = counted.length ? counted[0].followers : 0;
    const verification = accs.reduce<CreatorRow['verification']>((best, a) => (VERIFICATION_RANK[a.status] > VERIFICATION_RANK[best] ? a.status : best), 'none');
    const ps = partBy.get(p.id) ?? [];
    return {
      id: p.id,
      name: p.full_name ?? '',
      email: p.email ?? '',
      phone: opts.phone(p),
      province: p.province ?? '',
      city: p.city ?? '',
      gender: p.gender,
      hijab: p.hijab,
      accountType: p.account_type,
      niches: (p.categories ?? []).map(opts.niche),
      persona: p.persona ? opts.persona(p.persona) : '',
      accounts: accs,
      maxFollowers,
      tier: counted.length ? tierFor(maxFollowers) : null,
      verification,
      applied: ps.length,
      approved: ps.filter((x) => x.status === 'approved').length,
      completed: ps.filter((x) => x.status === 'approved' && x.post_confirmed_at).length,
      paid: opts.paid ? opts.paid.get(p.id) ?? 0 : null,
      createdAt: p.created_at,
      onboarded: !!p.onboarded_at,
      installed: !!p.app_installed_at,
    };
  });
}

export type Filters = {
  q: string;
  platform: Platform | '';
  tier: Tier | '';
  gender: Gender | '';
  hijab: Hijab | '';
  accountType: AccountType | '';
  niche: string;
  province: string;
  verification: CreatorRow['verification'] | '';
  onboarded: 'yes' | 'no' | '';
  hasJob: 'yes' | 'no' | '';
};

export const EMPTY_FILTERS: Filters = {
  q: '', platform: '', tier: '', gender: '', hijab: '', accountType: '', niche: '', province: '', verification: '', onboarded: '', hasJob: '',
};

/** Search matches name, email, phone, username or city; filters combine with AND. */
export function filterRows(rows: CreatorRow[], f: Filters): CreatorRow[] {
  const q = f.q.trim().toLowerCase().replace(/^@/, '');
  return rows.filter((r) => {
    if (q) {
      const hay = [r.name, r.email, r.phone, r.city, ...r.accounts.map((a) => a.username)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.platform && !r.accounts.some((a) => a.platform === f.platform && a.status !== 'rejected')) return false;
    if (f.tier && r.tier !== f.tier) return false;
    if (f.gender && r.gender !== f.gender) return false;
    if (f.hijab && r.hijab !== f.hijab) return false;
    if (f.accountType && r.accountType !== f.accountType) return false;
    if (f.niche && !r.niches.includes(f.niche)) return false;
    if (f.province && r.province !== f.province) return false;
    if (f.verification && r.verification !== f.verification) return false;
    if (f.onboarded && r.onboarded !== (f.onboarded === 'yes')) return false;
    if (f.hasJob && (r.approved > 0) !== (f.hasJob === 'yes')) return false;
    return true;
  });
}

export type Sort = { key: ColumnKey; dir: 'asc' | 'desc' };

function sortValue(r: CreatorRow, key: ColumnKey): string | number {
  switch (key) {
    case 'accounts': case 'maxFollowers': return r.maxFollowers;
    case 'tier': return r.maxFollowers;
    case 'verification': return VERIFICATION_RANK[r.verification];
    case 'niches': return r.niches.join(', ');
    case 'applied': case 'approved': case 'completed': return r[key];
    case 'paid': return r.paid ?? 0;
    case 'onboarded': case 'installed': return r[key] ? 1 : 0;
    default: return String(r[key] ?? '').toLowerCase();
  }
}

export function sortRows(rows: CreatorRow[], sort: Sort): CreatorRow[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const [x, y] = [sortValue(a, sort.key), sortValue(b, sort.key)];
    // Empty text sorts last either way.
    if (x === '' && y !== '') return 1;
    if (y === '' && x !== '') return -1;
    return x < y ? -dir : x > y ? dir : 0;
  });
}
