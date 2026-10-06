import Link from 'next/link';
import { BottomNav } from '@/components/bottom-nav';
import { NotificationBell } from '@/components/notification-bell';
import { Wordmark } from '@/components/wordmark';
import { requireCreator } from '@/lib/auth';

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireCreator();
  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-10 border-b border-garis bg-kertas/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link href="/beranda" aria-label="Tali"><Wordmark height={28} /></Link>
          <NotificationBell viewer={viewer} />
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-5">{children}</main>
      <BottomNav />
    </div>
  );
}
