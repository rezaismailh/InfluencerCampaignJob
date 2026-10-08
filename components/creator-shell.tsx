import Link from 'next/link';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { BottomNav } from '@/components/bottom-nav';
import { AppInstalledMarker } from '@/components/install-prompt';
import { InstallSheetFromRedirect } from '@/components/install-sheet';
import { NotificationBell } from '@/components/notification-bell';
import { ButtonLink } from '@/components/ui/button';
import { Wordmark } from '@/components/wordmark';
import type { Viewer } from '@/lib/auth';

/** App chrome for signed-in creators: header with notifications and the bottom nav. */
export function CreatorShell({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
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
      <AppInstalledMarker installed={!!viewer.profile.app_installed_at} />
      <Suspense>
        <InstallSheetFromRedirect installed={!!viewer.profile.app_installed_at} />
      </Suspense>
    </div>
  );
}

/** Chrome for pages anyone can open (job listing): a sign-in or finish-profile button instead of the nav. */
export async function GuestShell({ viewer, children }: { viewer: Viewer | null; children: React.ReactNode }) {
  const t = await getTranslations('jobs');
  const action = !viewer
    ? { href: '/masuk?next=/job', label: t('signIn') }
    : viewer.profile.role === 'creator'
      ? { href: '/onboarding?next=/job', label: t('completeProfileCta') }
      : { href: '/admin', label: t('toAdmin') };
  return (
    <div className="min-h-dvh pb-10">
      <header className="sticky top-0 z-10 border-b border-garis bg-kertas/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link href="/" aria-label="Tali"><Wordmark height={28} /></Link>
          <ButtonLink href={action.href} size="sm" variant="primary">{action.label}</ButtonLink>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-5">{children}</main>
    </div>
  );
}
