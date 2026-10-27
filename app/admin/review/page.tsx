import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { reviewTone } from '@/components/status';
import { requireStaff } from '@/lib/auth';
import { realBrand, type BrandEmbed } from '@/lib/brand';
import { addBusinessDays, formatDate, formatDateTime, todayWib } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { reviewSubmission } from '@/app/admin/actions';
import { revisionNumeral } from '@/lib/work';
import type { Submission } from '@/lib/types';

type Row = Submission & {
  participations: { id: string; profiles: { full_name: string | null; email: string | null }; jobs: { title: string; brand_name: string; review_days: number | null; job_brands: BrandEmbed } };
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
      .select('*, participations(id, profiles!participations_creator_id_fkey(full_name, email), jobs(title, brand_name, review_days, job_brands(real_name)))')
      .in('status', ['pending_review', 'sent_to_brand'])
      .order('submitted_at')
      .returns<Row[]>(),
    viewer.supabase.from('holidays').select('day'),
  ]);
  const today = todayWib();
  const off = (holidays ?? []).map((h) => h.day as string);

  return (
    <div>
      <PageHeader title={t('reviewQueue')} subtitle={data?.length ? t('reviewQueueHint', { count: data.length }) : undefined} />
      {!data?.length && <EmptyState title={t('reviewEmpty')} />}
      {!!data?.length && (
        <div className="overflow-x-auto rounded-2xl border border-garis bg-kertas">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="bg-latar text-teks-redup">
              <tr>
                <th scope="col" className="px-3 py-2 font-bold">{t('colSubmitted')}</th>
                <th scope="col" className="px-3 py-2 font-bold">{t('colCreator')}</th>
                <th scope="col" className="px-3 py-2 font-bold">{t('colJob')}</th>
                <th scope="col" className="px-3 py-2 font-bold">{t('colKind')}</th>
                <th scope="col" className="px-3 py-2 font-bold">{t('colStatus')}</th>
                <th scope="col" className="px-3 py-2 font-bold">{t('colDue')}</th>
                <th scope="col" className="px-3 py-2 font-bold">{t('colAction')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-garis">
              {data.map((s) => {
                const days = s.participations.jobs.review_days;
                const due = days ? addBusinessDays(s.submitted_at.slice(0, 10), days, off) : null;
                const overdue = !!due && due < today;
                const numeral = revisionNumeral(s.version);
                const link = s.content && /^https?:\/\//.test(s.content) ? s.content : null;
                return (
                  <tr key={s.id} className={cn('align-top', overdue && 'bg-bahaya/5')}>
                    <td className="px-3 py-2">{formatDateTime(s.submitted_at, locale)}</td>
                    <td className="px-3 py-2 font-bold">{s.participations.profiles.full_name ?? s.participations.profiles.email}</td>
                    <td className="px-3 py-2">
                      <p className="whitespace-normal">{s.participations.jobs.title}</p>
                      <p className="text-teks-redup">{realBrand(s.participations.jobs) ?? s.participations.jobs.brand_name}</p>
                    </td>
                    <td className="px-3 py-2"><p>{tk(s.kind)}</p><p className="text-teks-redup">{numeral ? tr('revisionN', { n: numeral }) : tr('firstVersion')}</p></td>
                    <td className="px-3 py-2"><Badge tone={reviewTone[s.status]}>{tr(s.status)}</Badge></td>
                    <td className="px-3 py-2">
                      {due ? (
                        <>
                          <p className={cn('whitespace-nowrap', overdue && 'font-bold text-bahaya')}>{formatDate(due, locale)}</p>
                          {overdue && <p className="font-bold text-bahaya">{t('overdueReview')}</p>}
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {link && <a href={link} target="_blank" rel="noreferrer" className="font-bold text-nila-800 underline underline-offset-4">{t('openSubmission')}</a>}
                        <Link href={`/admin/partisipasi/${s.participations.id}#${s.kind}`} className="font-bold text-nila-800 underline underline-offset-4">{t('reviewDetail')}</Link>
                        <ActionForm action={reviewSubmission}>
                          <input type="hidden" name="submission_id" value={s.id} />
                          <SubmitButton name="status" value="approved" size="sm" variant="outline">{t('approveItem')}</SubmitButton>
                        </ActionForm>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
