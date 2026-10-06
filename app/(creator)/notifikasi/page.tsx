import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page';
import { NotificationList } from '@/components/notification-list';
import { requireCreator } from '@/lib/auth';

export async function generateMetadata() {
  const tm = await getTranslations('notifications');
  return { title: tm('title') };
}

export default async function Notifications() {
  const viewer = await requireCreator();
  const t = await getTranslations('notifications');
  return (
    <div>
      <PageHeader title={t('title')} />
      <NotificationList viewer={viewer} />
    </div>
  );
}
