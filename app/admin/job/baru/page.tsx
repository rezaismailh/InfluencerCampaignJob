import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page';
import { JobForm } from '@/components/admin/job-form';
import { requireStaff } from '@/lib/auth';

export default async function NewJob() {
  const viewer = await requireStaff('curator');
  const t = await getTranslations('admin');
  const tn = await getTranslations('nav');
  const { data: clients } = await viewer.supabase.from('clients').select('id, name').order('name');
  return (
    <div>
      <PageHeader back={{ href: '/admin/job', label: tn('adminJobs') }} title={t('newJob')} />
      <Card><JobForm clients={clients ?? []} /></Card>
    </div>
  );
}
