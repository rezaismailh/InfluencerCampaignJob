import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { CalendarCheck, CalendarClock, Wallet, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonClass } from '@/components/ui/button';
import { BrandAvatar } from '@/components/brand-avatar';
import { formatDate } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { tierFeeList } from '@/lib/tiers';
import type { Job, PublicJob } from '@/lib/types';

export async function feeLabel(job: Pick<Job, 'job_type' | 'fee_type' | 'fee' | 'fee_visit' | 'rate_cap' | 'rate_cap_visit' | 'tier_fees' | 'tier_fees_visit'>) {
  const t = await getTranslations('jobs');
  const both = job.job_type === 'both';
  const range = (fees: number[]) => {
    if (!fees.length) return t('openRate');
    const [min, max] = [Math.min(...fees), Math.max(...fees)];
    return min === max ? formatRupiah(min) : t('feeRange', { min: formatRupiah(min), max: formatRupiah(max) });
  };
  if (job.fee_type === 'fixed' && job.fee) return range([job.fee, ...(both && job.fee_visit ? [job.fee_visit] : [])]);
  if (job.fee_type === 'tier') {
    return range([...tierFeeList(job.tier_fees ?? {}), ...(both ? tierFeeList(job.tier_fees_visit ?? {}) : [])].map((x) => x.fee));
  }
  const cap = openCap(job);
  return cap ? t('rateCapLabel', { amount: formatRupiah(cap) }) : t('openRate');
}

/** Highest rate cap across the job's modes, or null when any mode is uncapped. */
export function openCap(job: Pick<Job, 'job_type' | 'rate_cap' | 'rate_cap_visit'>): number | null {
  const caps = [job.rate_cap, ...(job.job_type === 'both' ? [job.rate_cap_visit] : [])];
  return caps.every((c) => c) ? Math.max(...(caps as number[])) : null;
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
  const feeKind = job.fee_type === 'tier' ? t('feeByFollowers') : job.fee_type === 'open' ? t('feeOpen') : t('feeFixed');
  return (
    <Link href={`/job/${job.id}`} className="block space-y-3 rounded-2xl border border-garis bg-kertas p-4 hover:border-nila-300">
      <div className="flex items-start gap-3">
        <BrandAvatar logo={job.brand_logo} icon={job.brand_icon} size={44} />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-teks-redup">{job.brand_name}</p>
          <p className="font-bold leading-6">{job.title}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={job.job_type === 'non_visit' ? 'success' : job.job_type === 'visit' ? 'warning' : 'info'}>{tt(job.job_type)}</Badge>
        {job.platforms.map((p) => <Badge key={p}>{tp(p)}</Badge>)}
      </div>
      <div className="rounded-xl bg-latar p-3">
        <p className="text-[13px] text-teks-redup">{feeKind}</p>
        <p className="text-xl font-extrabold leading-7 tabular">{job.fee_type === 'open' ? t('openRate') : await feeLabel(job)}</p>
        {job.fee_type === 'open' && openCap(job) && <p className="text-[13px] font-bold tabular">{t('rateCapShort', { amount: formatRupiah(openCap(job)!) })}</p>}
      </div>
      <ul className="space-y-1 text-[13px] text-teks-redup">
        <CardFact icon={Wallet}>{await payoutLabel(job)}</CardFact>
        {job.apply_deadline && <CardFact icon={CalendarClock}>{t('applyDeadline', { date: formatDate(job.apply_deadline, locale) })}</CardFact>}
        {job.content_deadline && <CardFact icon={CalendarCheck}>{t('contentDeadline', { date: formatDate(job.content_deadline, locale) })}</CardFact>}
      </ul>
      <span className={buttonClass('primary', 'md', 'w-full')}>{t('seeDetail')}</span>
    </Link>
  );
}

function CardFact({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-nila-800" strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </li>
  );
}
