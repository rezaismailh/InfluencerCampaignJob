import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { reviewTone } from '@/components/status';
import { requireStaff } from '@/lib/auth';
import { addBusinessDays, formatDateTime, todayWib } from '@/lib/dates';
import { revisionNumeral } from '@/lib/work';
import type { Submission } from '@/lib/types';

type Row = Submission & {
  participations: { id: string; profiles: { full_name: string | null; email: string | null }; jobs: { title: string; brand_name: string; review_days: number | null } };
};

export default async function ReviewQueue() {
  const viewer = await requireStaff('curator');
  const t = await getTranslations('admin');
  const tk = await getTranslations('kind');
  const tr = await getTranslations('review');
  const locale = await getLocale();
  const [{ data }, { data: holidays }] = await Promise.all([
    viewer.supabase
      .from('submissions')
      .select('*, participations(id, profiles!participations_creator_id_fkey(full_name, email), jobs(title, brand_name, review_days))')
      .in('status', ['pending_review', 'sent_to_brand'])
      .order('submitted_at')
      .returns<Row[]>(),
    viewer.supabase.from('holidays').select('day'),
  ]);
  const today = todayWib();
  const off = (holidays ?? []).map((h) => h.day as string);

  return (
    <div>
      <PageHeader title={t('reviewQueue')} />
      {!data?.length && <EmptyState title={t('reviewEmpty')} />}
      <div className="space-y-2">
        {data?.map((s) => {
          const days = s.participations.jobs.review_days;
          const overdue = !!days && addBusinessDays(s.submitted_at.slice(0, 10), days, off) < today;
          const numeral = revisionNumeral(s.version);
          return (
            <Link key={s.id} href={`/admin/partisipasi/${s.participations.id}#${s.kind}`} className="block">
              <Card className={`flex flex-wrap items-center justify-between gap-2 hover:border-nila-300 ${overdue ? 'border-bahaya' : ''}`}>
                <div>
                  <p className="text-[13px] text-teks-redup">{s.participations.jobs.brand_name} · {s.participations.jobs.title}</p>
                  <p className="font-bold">{s.participations.profiles.full_name ?? s.participations.profiles.email} · {tk(s.kind)} · {numeral ? tr('revisionN', { n: numeral }) : tr('firstVersion')}</p>
                  <p className="text-[13px] text-teks-redup">{formatDateTime(s.submitted_at, locale)}</p>
                </div>
                <div className="flex gap-1.5">
                  {overdue && <Badge tone="danger">{t('overdueReview')}</Badge>}
                  <Badge tone={reviewTone[s.status]}>{tr(s.status)}</Badge>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
