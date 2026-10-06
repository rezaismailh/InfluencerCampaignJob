'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

export type NavItem = { href: string; key: string };

export function AdminNav({ items }: { items: NavItem[] }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex gap-1 md:flex-col">
        {items.map(({ href, key }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="shrink-0">
              <Link href={href} aria-current={active ? 'page' : undefined}
                className={cn('flex min-h-11 items-center rounded-xl px-3 text-[15px] font-medium',
                  active ? 'bg-nila-800 text-gading' : 'text-teks hover:bg-nila-50')}>
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
