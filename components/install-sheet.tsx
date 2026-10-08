'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bell, PlusSquare, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markSheetShown, promptInstall, useInstallMode, useSheetShown, type InstallMode } from '@/components/install-prompt';

type Reason = 'onboarding' | 'applied';

/**
 * One-time bottom sheet asking to add Tali to the home screen, shown right after
 * a moment that matters (onboarding finished, first application sent). Never in
 * the installed app, never after the profile recorded an install, once per device.
 */
function InstallSheet({ reason, onClose }: { reason: Reason; onClose: () => void }) {
  const t = useTranslations('install');
  const mode = useInstallMode(true);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label={t('later')} onClick={onClose} className="absolute inset-0 bg-nila-950/40 animate-[fade-in_200ms_ease-out]" />
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="install-sheet-title"
        className="relative w-full max-w-md rounded-t-3xl bg-kertas px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg outline-none animate-[sheet-up_250ms_ease-out]">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-garis" aria-hidden />
        <div className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-nila-50 text-nila-800">
          <Bell className="size-6" aria-hidden />
        </div>
        <h2 id="install-sheet-title" className="text-xl font-bold leading-7">{t(`sheetTitle_${reason}`)}</h2>
        <p className="mt-1 text-[15px] text-teks-redup">{t(`sheetBody_${reason}`)}</p>

        <div className="mt-5">
          {mode === 'android' && (
            <Button className="w-full" onClick={async () => { await promptInstall(); onClose(); }}>{t('install')}</Button>
          )}
          {mode === 'ios' && <IosSteps />}
          {mode === 'inapp' && <p className="rounded-2xl bg-latar p-4 text-[15px]">{t('inAppBody')}</p>}
        </div>

        <button type="button" onClick={onClose} className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-[15px] font-bold text-teks-redup">
          {t('later')}
        </button>
      </div>
    </div>
  );
}

function IosSteps() {
  const t = useTranslations('install');
  const steps = [
    { icon: Share, title: t('iosStep1'), hint: t('iosStep1Hint') },
    { icon: PlusSquare, title: t('iosStep2'), hint: t('iosStep2Hint') },
  ];
  return (
    <ol className="space-y-2">
      {steps.map(({ icon: Icon, title, hint }, i) => (
        <li key={title} className="flex items-center gap-3 rounded-2xl bg-latar p-3">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-nila-800 text-[13px] font-bold text-gading">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-5">{title}</p>
            <p className="text-[13px] text-teks-redup">{hint}</p>
          </div>
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-garis bg-kertas text-nila-800">
            <Icon className="size-5" aria-hidden />
          </span>
        </li>
      ))}
    </ol>
  );
}

function useCanShow(installed: boolean) {
  const mode: InstallMode = useInstallMode(true);
  const shown = useSheetShown();
  return !installed && !shown && mode !== 'hidden';
}

/**
 * Server actions redirect with ?pasang=onboarding (onboarding finished) or
 * ?pasang=lamaran (application sent). Shown once; the parameter is then removed.
 */
export function InstallSheetFromRedirect({ installed }: { installed: boolean }) {
  const params = useSearchParams();
  const canShow = useCanShow(installed);
  const [closed, setClosed] = useState(false);
  const flag = params.get('pasang');
  const reason: Reason | null = flag === 'onboarding' ? 'onboarding' : flag === 'lamaran' ? 'applied' : null;
  if (!reason || closed || !canShow) return null;
  const close = () => {
    setClosed(true);
    markSheetShown();
    const url = new URL(window.location.href);
    url.searchParams.delete('pasang');
    window.history.replaceState(window.history.state, '', url);
  };
  return <InstallSheet reason={reason} onClose={close} />;
}
