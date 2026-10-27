import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { InAppGate } from '@/components/in-app-gate';
import { ServiceWorker } from '@/components/service-worker';
import { ERROR_SCRIPT } from '@/lib/client-errors';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('splash');
  return {
    title: { default: 'Tali', template: '%s · Tali' },
    description: t('body'),
    applicationName: 'Tali',
    icons: { icon: '/icons/favicon.svg', apple: '/icons/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: 'Tali', statusBarStyle: 'black-translucent' },
  };
}

export const viewport: Viewport = {
  themeColor: '#24206B',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-dvh antialiased">
        {/* First thing on the page, so it also catches failures of the app bundle. */}
        <script dangerouslySetInnerHTML={{ __html: ERROR_SCRIPT }} />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <InAppGate />
        <ServiceWorker />
      </body>
    </html>
  );
}
