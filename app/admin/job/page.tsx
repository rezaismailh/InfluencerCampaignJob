import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { requireStaff } from '@/lib/auth';
import { realBrand, type BrandEmbed } from '@/lib/brand';
import { formatDate } from '@/lib/dates';
import type { Job } from '@/lib/types';

export default async function AdminJobs() {
  const viewer = await requireStaff('curator');
  const t = await getTranslations('admin');
  const tst = await getTranslations('jobStatus');
  const tt = await getTranslations('jobType');
  const tj = await getTranslations('jobs');
  const locale = await getLocale();
  const [{ data: jobs }, { data: parts }] = await Promise.all([
    viewer.supabase.from('jobs').select('*, job_brands(real_name)').order('created_at', { ascending: false }).returns<(Job & { job_brands: BrandEmbed })[]>(),
    viewer.supabase.from('participations').select('job_id, status'),
  ]);
  const count = (jobId: string, status: string) => (parts ?? []).filter((p) => p.job_id === jobId && p.status === status).length;

  return (
    <div>
      <PageHeader title={t('jobs')} action={<ButtonLink href="/admin/job/baru" size="sm">{t('newJob')}</ButtonLink>} />
      {!jobs?.length && <EmptyState title={t('jobsEmpty')} />}
      <div className="space-y-2">
        {jobs?.map((job) => {
          const applied = count(job.id, 'applied');
          return (
            <Link key={job.id} href={`/admin/job/${job.id}`} className="block">
              <Card className="hover:border-nila-300">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] text-teks-redup">{realBrand(job) ? t('brandShownAs', { real: realBrand(job)!, alias: job.brand_name }) : job.brand_name}</p>
                    <p className="font-bold">{job.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={job.status === 'open' ? 'success' : 'neutral'}>{tst(job.status)}</Badge>
                    <Badge tone="info">{tt(job.job_type)}</Badge>
                    {applied > 0 && <Badge tone="warning">{t('pendingApplicants')}: {applied}</Badge>}
                  </div>
                </div>
                <p className="mt-2 text-[13px] text-teks-redup">
                  {t('slots', { used: count(job.id, 'approved'), quota: job.quota })}
                  {job.content_deadline && ` · ${tj('contentDeadline', { date: formatDate(job.content_deadline, locale) })}`}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
