'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Briefcase, Home, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/cn';

const ITEMS = [
  { href: '/beranda', key: 'home', icon: Home },
  { href: '/job', key: 'jobs', icon: Briefcase },
  { href: '/saldo', key: 'balance', icon: Wallet },
  { href: '/profil', key: 'profile', icon: User },
] as const;

export function BottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-garis bg-kertas pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`) || (href === '/beranda' && pathname.startsWith('/partisipasi'));
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? 'page' : undefined}
                className={cn('flex min-h-14 flex-col items-center justify-center gap-0.5 text-[13px] font-medium', active ? 'text-nila-800' : 'text-teks-redup')}>
                <Icon className="size-6" strokeWidth={2} aria-hidden />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
