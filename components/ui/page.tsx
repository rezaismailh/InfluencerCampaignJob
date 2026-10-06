import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export function PageHeader({ title, subtitle, back, action }: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <header className="mb-4 space-y-1">
      {back && (
        <Link href={back.href} className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-[15px] font-bold text-nila-800">
          <ChevronLeft className="size-5" strokeWidth={2} aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold leading-8">{title}</h1>
        {action}
      </div>
      {subtitle && <p className="text-[15px] text-teks-redup">{subtitle}</p>}
    </header>
  );
}

export function EmptyState({ title, body, action }: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-garis bg-kertas p-6 text-center">
      <p className="font-bold">{title}</p>
      {body && <p className="mt-1 text-[15px] text-teks-redup">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Section({ title, children, action }: { title: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold leading-7">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
