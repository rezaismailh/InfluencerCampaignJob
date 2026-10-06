import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { AdminNav, type NavItem } from '@/components/admin/admin-nav';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/wordmark';
import { canCurate, canFinance, requireStaff } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  const c = await getTranslations('common');
  const role = viewer.profile.role;
  const items: NavItem[] = [{ href: '/admin', key: 'overview' }];
  if (canCurate(role)) {
    items.push({ href: '/admin/job', key: 'adminJobs' }, { href: '/admin/review', key: 'review' }, { href: '/admin/akun-sosial', key: 'social' }, { href: '/admin/klien', key: 'clients' });
  }
  if (canFinance(role)) items.push({ href: '/admin/pencairan', key: 'payouts' });
  items.push({ href: '/admin/libur', key: 'holidays' });
  const { count } = await viewer.supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-garis bg-kertas/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2" aria-label="Tali admin">
            <Wordmark height={28} /><span className="text-[13px] font-bold text-teks-redup">Admin</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/admin/notifikasi" className="relative inline-flex size-11 items-center justify-center rounded-full text-nila-800 hover:bg-nila-50" aria-label={c('notifications')}>
              <Bell className="size-6" strokeWidth={2} aria-hidden />
              {!!count && <span className="absolute right-1.5 top-1.5 min-w-5 rounded-full bg-limau-400 px-1 text-center text-[11px] font-bold leading-5 text-nila-800">{count > 9 ? '9+' : count}</span>}
            </Link>
            <form action="/auth/keluar" method="post"><Button variant="ghost" size="sm">{c('logout')}</Button></form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl gap-6 px-4 py-4 md:grid md:grid-cols-[200px_1fr] md:py-6">
        <aside className="mb-4 md:mb-0"><AdminNav items={items} /></aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
