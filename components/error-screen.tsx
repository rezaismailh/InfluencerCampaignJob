'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportClientError } from '@/lib/client-errors';
import { detectInApp } from '@/lib/in-app-browser';

/** Shown instead of a blank page when something breaks; reports the error with the device. */
export function ErrorScreen({ error }: { error: Error & { digest?: string } }) {
  const t = useTranslations('errorPage');
  useEffect(() => { reportClientError(error); }, [error]);
  const inApp = typeof navigator !== 'undefined' ? detectInApp(navigator.userAgent) : null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-[26px] font-extrabold leading-8">{t('title')}</h1>
      <p className="text-teks-redup">{t('body')}</p>
      {inApp && <p className="rounded-2xl border border-garis bg-kertas p-4 text-[15px]">{t(inApp.os === 'android' ? 'inAppAndroid' : 'inAppIos')}</p>}
      {/* A full reload also fetches a fresh copy of the app after a new release. */}
      <Button type="button" onClick={() => window.location.reload()} className="w-full">
        <RotateCw className="size-5" aria-hidden /> {t('reload')}
      </Button>
      {/* A plain link on purpose: a full page load, not a client navigation in a broken app. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="text-center text-[13px] font-bold text-nila-800 underline underline-offset-4">{t('home')}</a>
    </main>
  );
}
