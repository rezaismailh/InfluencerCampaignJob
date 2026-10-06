import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Viewer } from '@/lib/auth';

export async function NotificationBell({ viewer }: { viewer: Viewer }) {
  const t = await getTranslations('common');
  const { count } = await viewer.supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  return (
    <Link href="/notifikasi" className="relative inline-flex size-11 items-center justify-center rounded-full text-nila-800 hover:bg-nila-50" aria-label={t('notifications')}>
      <Bell className="size-6" strokeWidth={2} aria-hidden />
      {!!count && (
        <span className="absolute right-1.5 top-1.5 min-w-5 rounded-full bg-limau-400 px-1 text-center text-[11px] font-bold leading-5 text-nila-800 tabular">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
