import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page';
import { JobForm } from '@/components/admin/job-form';
import { requireStaff } from '@/lib/auth';
import type { Job } from '@/lib/types';

export default async function EditJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireStaff('curator');
  const t = await getTranslations('admin');
  const c = await getTranslations('common');
  const [{ data: job }, { data: clients }] = await Promise.all([
    viewer.supabase.from('jobs').select('*').eq('id', id).maybeSingle<Job>(),
    viewer.supabase.from('clients').select('id, name').order('name'),
  ]);
  if (!job) notFound();
  return (
    <div>
      <PageHeader back={{ href: `/admin/job/${id}`, label: c('back') }} title={t('editJob')} subtitle={job.title} />
      <Card><JobForm job={job} clients={clients ?? []} /></Card>
    </div>
  );
}
