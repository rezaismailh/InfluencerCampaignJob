import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page';
import { NotificationList } from '@/components/notification-list';
import { requireStaff } from '@/lib/auth';

export default async function AdminNotifications() {
  const viewer = await requireStaff();
  const t = await getTranslations('notifications');
  return (
    <div className="max-w-2xl">
      <PageHeader title={t('title')} />
      <NotificationList viewer={viewer} />
    </div>
  );
}
