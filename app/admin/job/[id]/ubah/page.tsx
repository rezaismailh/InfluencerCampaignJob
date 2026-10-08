import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page';
import { JobForm } from '@/components/admin/job-form';
import { requireStaff } from '@/lib/auth';
import { realBrand, visibleLogo, type BrandEmbed } from '@/lib/brand';
import type { Job } from '@/lib/types';

export default async function EditJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireStaff('curator');
  const t = await getTranslations('admin');
  const c = await getTranslations('common');
  const [{ data: job }, { data: clients }] = await Promise.all([
    viewer.supabase.from('jobs').select('*, job_brands(real_name, logo)').eq('id', id).maybeSingle<Job & { job_brands: BrandEmbed }>(),
    viewer.supabase.from('clients').select('id, name').order('name'),
  ]);
  if (!job) notFound();
  return (
    <div>
      <PageHeader back={{ href: `/admin/job/${id}`, label: c('back') }} title={t('editJob')} subtitle={job.title} />
      <Card><JobForm job={job} realBrand={realBrand(job)} logo={visibleLogo(job)} clients={clients ?? []} /></Card>
    </div>
  );
}
