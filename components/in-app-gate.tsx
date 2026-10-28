import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { ExternalLink } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { CopyLink } from '@/components/copy-link';
import { Wordmark } from '@/components/wordmark';
import { chromeIntentUrl, GATE_SCRIPT, PAGE_URL_HEADER, safariUrl, stayUrl } from '@/lib/in-app-browser';
import { shouldLeaveInApp } from '@/lib/in-app-server';

/**
 * Full-screen "open Tali in your browser" prompt for visitors in an in-app browser
 * (Threads, Instagram…). Rendered on the server and driven by a tiny inline script, so it
 * still works on phones too old to run the app itself.
 */
export async function InAppGate() {
  const inApp = await shouldLeaveInApp();
  if (!inApp) return null;
  const t = await getTranslations('inApp');
  const android = inApp.os === 'android';
  const app = t(`app.${inApp.app}`);
  // Links are built here from the address proxy.ts passes on; GATE_SCRIPT fills them in if it is missing.
  const page = (await headers()).get(PAGE_URL_HEADER);
  const open = page ? (android ? chromeIntentUrl(page) : safariUrl(page)) : '#';
  const stay = page ? stayUrl(page) : '/api/inapp-stay';
  const path = page ? new URL(page).pathname + new URL(page).search : '/';
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-latar" role="dialog" aria-modal="true" aria-labelledby="tali-inapp-title">
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-5 px-4 py-10">
        <Wordmark height={40} />
        <div className="space-y-2">
          <h1 id="tali-inapp-title" className="text-[26px] font-extrabold leading-8">{t(android ? 'titleAndroid' : 'titleIos')}</h1>
          <p className="text-teks-redup">{t('body', { app })}</p>
        </div>
        <a id="tali-open" data-os={inApp.os} href={open} suppressHydrationWarning className={buttonClass('primary', 'md', 'w-full')}>
          <ExternalLink className="size-5" aria-hidden /> {t(android ? 'openChrome' : 'openSafari')}
        </a>
        <div className="rounded-2xl border border-garis bg-kertas p-4 text-[15px]">
          <p className="font-bold">{t('manualTitle')}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-teks-redup">
            <li>{t(android ? 'manualAndroid1' : 'manualIos1')}</li>
            <li>{t(android ? 'manualAndroid2' : 'manualIos2')}</li>
          </ol>
          {/* Last resort, mostly for iPhones before iOS 17: copy the link and paste it in the browser. */}
          <p className="mt-3 font-bold">{t('copyTitle')}</p>
          <p className="mb-2 text-teks-redup">{t(android ? 'copyAndroid' : 'copyIos')}</p>
          <CopyLink path={path} />
        </div>
        <a id="tali-stay" href={stay} suppressHydrationWarning className="text-center text-[13px] text-teks-redup underline underline-offset-4">
          {t('stay')}
        </a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: GATE_SCRIPT }} />
    </div>
  );
}
