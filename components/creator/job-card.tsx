import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import type { Job, PublicJob } from '@/lib/types';

export async function feeLabel(job: Pick<Job, 'fee_type' | 'fee' | 'rate_cap'>) {
  const t = await getTranslations('jobs');
  if (job.fee_type === 'fixed' && job.fee) return formatRupiah(job.fee);
  return job.rate_cap ? t('rateCapLabel', { amount: formatRupiah(job.rate_cap) }) : t('openRate');
}

export async function JobCard({ job }: { job: Job | PublicJob }) {
  const t = await getTranslations('jobs');
  const tp = await getTranslations('platform');
  const tt = await getTranslations('jobType');
  const locale = await getLocale();
  return (
    <Link href={`/job/${job.id}`} className="block rounded-2xl border border-garis bg-kertas p-4 hover:border-nila-300">
      <p className="text-[13px] font-medium text-teks-redup">{job.brand_name}</p>
      <p className="font-bold">{job.title}</p>
      <p className="mt-2 text-xl font-extrabold tabular">{await feeLabel(job)}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone="info">{tt(job.job_type)}</Badge>
        {job.platforms.map((p) => <Badge key={p}>{tp(p)}</Badge>)}
      </div>
      <ul className="mt-3 space-y-0.5 text-[13px] text-teks-redup">
        <li>{t('topLabel', { days: job.top_days })}</li>
        {job.content_deadline && <li>{t('contentDeadline', { date: formatDate(job.content_deadline, locale) })}</li>}
        {job.apply_deadline && <li>{t('applyDeadline', { date: formatDate(job.apply_deadline, locale) })}</li>}
      </ul>
    </Link>
  );
}
