import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { JobCard } from '@/components/creator/job-card';
import { createClient } from '@/lib/supabase/server';
import { PLATFORMS, type Platform } from '@/lib/social';
import { cn } from '@/lib/cn';
import type { PublicJob } from '@/lib/types';

export async function generateMetadata() {
  const tm = await getTranslations('jobs');
  return { title: tm('title') };
}

export default async function Jobs({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const supabase = await createClient();
  const t = await getTranslations('jobs');
  const tp = await getTranslations('platform');
  const { platform } = await searchParams;
  const active = (PLATFORMS as readonly string[]).includes(platform ?? '') ? (platform as Platform) : null;

  // Same teaser for everyone, so the list works signed out.
  let query = supabase.rpc('public_open_jobs');
  if (active) query = query.contains('platforms', [active]);
  const { data } = await query;
  const jobs = (data ?? []) as PublicJob[];

  const chip = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} className={cn('inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-medium',
      on ? 'border-nila-800 bg-nila-800 text-gading' : 'border-garis bg-kertas text-teks')}>{label}</Link>
  );

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {chip('/job', t('filterAll'), !active)}
        {PLATFORMS.map((p) => chip(`/job?platform=${p}`, tp(p), active === p))}
      </div>
      {jobs.length ? (
        <div className="space-y-3">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
      ) : (
        <EmptyState title={t('empty')} body={t('emptyBody')} />
      )}
    </div>
  );
}
