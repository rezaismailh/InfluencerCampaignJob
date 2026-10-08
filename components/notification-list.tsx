import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/page';
import { markAllRead } from '@/app/notification-actions';
import type { Viewer } from '@/lib/auth';
import { formatDateTime } from '@/lib/dates';
import { notificationText } from '@/lib/notification-text';
import { cn } from '@/lib/cn';
import { notificationTone } from '@/lib/notification-channels';
import { Bell, CircleAlert, CircleCheck } from 'lucide-react';
import type { Notification } from '@/lib/types';

export async function NotificationList({ viewer }: { viewer: Viewer }) {
  const t = await getTranslations('notifications');
  const tk = await getTranslations('kind');
  const tp = await getTranslations('platform');
  const locale = await getLocale();
  const { data } = await viewer.supabase
    .from('notifications').select('id, kind, params, link, read_at, created_at')
    .order('created_at', { ascending: false }).limit(100).returns<Notification[]>();
  const items = data ?? [];
  if (!items.length) return <EmptyState title={t('empty')} />;

  return (
    <div className="space-y-3">
      {items.some((n) => !n.read_at) && (
        <form action={markAllRead}><Button variant="ghost" size="sm">{t('markAllRead')}</Button></form>
      )}
      <ul className="space-y-2">
        {items.map((n) => {
          const body = notificationText(n, t as never, (k) => tk(k as never), (k) => tp(k as never), locale);
          const tone = notificationTone(n.kind);
          const Icon = tone === 'urgent' ? CircleAlert : tone === 'good' ? CircleCheck : Bell;
          const inner = (
            <>
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl',
                tone === 'urgent' ? 'bg-bahaya/10 text-bahaya' : tone === 'good' ? 'bg-sukses/10 text-sukses' : 'bg-nila-50 text-nila-800')}>
                <Icon className="size-5" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className={cn('text-[15px]', !n.read_at && 'font-bold')}>{body}</p>
                <p className="mt-0.5 text-[13px] text-teks-redup">{formatDateTime(n.created_at, locale)}</p>
              </div>
            </>
          );
          const cls = cn('flex gap-3 rounded-2xl border p-3',
            n.read_at ? 'border-garis bg-kertas' : tone === 'urgent' ? 'border-bahaya/40 bg-bahaya/5' : 'border-nila-300 bg-kertas');
          return <li key={n.id}>{n.link ? <Link href={n.link} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
        })}
      </ul>
    </div>
  );
}
