import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page';
import { CreatorTable } from '@/components/admin/creator-table';
import type { InviteJob } from '@/components/admin/invite-panel';
import { canFinance, requireStaff, type Viewer } from '@/lib/auth';
import { buildRows, type DirAccount } from '@/lib/creator-directory';
import { decrypt } from '@/lib/crypto';
import { loadTaxonomy } from '@/lib/taxonomy';
import type { AccountType, Gender, Hijab, ParticipationStatus } from '@/lib/types';

export async function generateMetadata() {
  const t = await getTranslations('admin.creators');
  return { title: t('title') };
}

/** Reads every page of a query (PostgREST returns at most 1000 rows per request). */
async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await page(from, from + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

type ProfileRow = {
  id: string; email: string | null; full_name: string | null; phone_enc: string | null; province: string | null; city: string | null;
  categories: string[]; persona: string | null; gender: Gender | null; hijab: Hijab | null; account_type: AccountType | null;
  onboarded_at: string | null; app_installed_at: string | null; created_at: string;
};

async function load(viewer: Viewer, finance: boolean) {
  const sb = viewer.supabase;
  return Promise.all([
    all<ProfileRow>((a, b) => sb.from('profiles')
      .select('id, email, full_name, phone_enc, province, city, categories, persona, gender, hijab, account_type, onboarded_at, app_installed_at, created_at')
      .eq('role', 'creator').order('created_at', { ascending: false }).range(a, b)),
    all<DirAccount & { creator_id: string }>((a, b) => sb.from('social_accounts').select('creator_id, platform, username, url, followers, status').order('id').range(a, b)),
    all<{ creator_id: string; status: ParticipationStatus; post_confirmed_at: string | null }>((a, b) =>
      sb.from('participations').select('creator_id, status, post_confirmed_at').order('id').range(a, b)),
    finance
      ? all<{ creator_id: string; gross: number }>((a, b) => sb.from('payout_requests').select('creator_id, gross').eq('status', 'transferred').order('id').range(a, b))
      : Promise.resolve(null),
  ]);
}

export default async function Creators() {
  const viewer = await requireStaff('curator');
  const t = await getTranslations('admin.creators');
  const tax = await loadTaxonomy();
  const finance = canFinance(viewer.profile.role);
  const [[profiles, accounts, parts, payouts], { data: jobs }] = await Promise.all([
    load(viewer, finance),
    viewer.supabase.from('jobs').select('id, title, job_type, fee_type').in('status', ['open', 'draft']).order('created_at', { ascending: false }).returns<InviteJob[]>(),
  ]);

  const paid = payouts ? new Map<string, number>() : undefined;
  for (const p of payouts ?? []) paid!.set(p.creator_id, (paid!.get(p.creator_id) ?? 0) + p.gross);
  const rows = buildRows(profiles, accounts, parts, {
    phone: (p) => decrypt((p as ProfileRow).phone_enc) ?? '',
    niche: (k) => tax.name('niche', k),
    persona: (k) => tax.name('persona', k),
    paid,
  });

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <CreatorTable rows={rows} niches={tax.choices('niche', []).map((c) => c.label)} canSeePaid={finance} jobs={jobs ?? []} />
    </div>
  );
}
