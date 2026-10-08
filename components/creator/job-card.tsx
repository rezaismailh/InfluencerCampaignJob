import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { BrandAvatar } from '@/components/brand-avatar';
import { formatDate } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { tierFeeList } from '@/lib/tiers';
import type { Job, PublicJob } from '@/lib/types';

export async function feeLabel(job: Pick<Job, 'fee_type' | 'fee' | 'rate_cap' | 'tier_fees'>) {
  const t = await getTranslations('jobs');
  if (job.fee_type === 'fixed' && job.fee) return formatRupiah(job.fee);
  if (job.fee_type === 'tier') {
    const fees = tierFeeList(job.tier_fees ?? {}).map((x) => x.fee);
    if (!fees.length) return t('openRate');
    const [min, max] = [Math.min(...fees), Math.max(...fees)];
    return min === max ? formatRupiah(min) : t('feeRange', { min: formatRupiah(min), max: formatRupiah(max) });
  }
  return job.rate_cap ? t('rateCapLabel', { amount: formatRupiah(job.rate_cap) }) : t('openRate');
}

/** Short "when you get paid" line for cards and the job summary. */
export async function payoutLabel(job: Pick<Job, 'top_mode' | 'top_days' | 'pay_day' | 'require_insight'>) {
  const t = await getTranslations('jobs');
  if (job.top_mode === 'monthly') return t('topMonthlyLabel', { day: job.pay_day });
  return t(job.require_insight ? 'topLabelInsight' : 'topLabel', { days: job.top_days });
}

export async function JobCard({ job }: { job: Job | PublicJob }) {
  const t = await getTranslations('jobs');
  const tp = await getTranslations('platform');
  const tt = await getTranslations('jobType');
  const locale = await getLocale();
  return (
    <Link href={`/job/${job.id}`} className="block rounded-2xl border border-garis bg-kertas p-4 hover:border-nila-300">
      <div className="flex items-start gap-3">
        <BrandAvatar logo={job.brand_logo} icon={job.brand_icon} />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-teks-redup">{job.brand_name}</p>
          <p className="font-bold">{job.title}</p>
        </div>
      </div>
      <p className="mt-2 text-xl font-extrabold tabular">{job.fee_type === 'open' ? t('openRate') : await feeLabel(job)}</p>
      {job.fee_type === 'open' && job.rate_cap && <p className="text-[13px] font-bold tabular">{t('rateCapShort', { amount: formatRupiah(job.rate_cap) })}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone="info">{tt(job.job_type)}</Badge>
        {job.platforms.map((p) => <Badge key={p}>{tp(p)}</Badge>)}
      </div>
      <ul className="mt-3 space-y-0.5 text-[13px] text-teks-redup">
        <li>{await payoutLabel(job)}</li>
        {job.apply_deadline && <li>{t('applyDeadline', { date: formatDate(job.apply_deadline, locale) })}</li>}
        {job.content_deadline && <li>{t('contentDeadline', { date: formatDate(job.content_deadline, locale) })}</li>}
      </ul>
    </Link>
  );
}
