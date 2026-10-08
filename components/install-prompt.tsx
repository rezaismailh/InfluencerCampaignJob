'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// "Add to home screen" banner. Android/Chrome gets a real install button (beforeinstallprompt);
// iPhone gets the Share → Add to Home Screen steps; in-app browsers (Instagram, TikTok…)
// are asked to open the page in a real browser first, since they cannot install.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Mode = 'android' | 'ios' | 'inapp' | 'hidden';

const DISMISS_KEY = 'tali-install-dismissed';
const DISMISS_DAYS = 30;
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function snapshot(ignoreDismiss: boolean): Mode {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia('(display-mode: standalone)').matches || nav.standalone) return 'hidden';
  if (!ignoreDismiss && dismissedRecently()) return 'hidden';
  const ua = navigator.userAgent;
  if (/Instagram|FBAN|FBAV|Line\/|musical_ly|BytedanceWebview|TikTok/i.test(ua)) return 'inapp';
  if (deferred) return 'android';
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return ios ? 'ios' : 'hidden';
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * `dismissible` (Beranda): closable, stays hidden for 30 days once closed.
 * Not dismissible (Profile): always there as the "how to install" reference.
 */
export function InstallPrompt({ dismissible = true }: { dismissible?: boolean }) {
  const t = useTranslations('install');
  const mode = useSyncExternalStore(subscribe, () => snapshot(!dismissible), () => 'hidden' as Mode);
  if (mode === 'hidden') return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private mode: the banner simply shows again next time.
    }
    notify();
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    notify();
  };

  return (
    <div className="flex gap-3 rounded-2xl border border-nila-200 bg-nila-50 p-4">
      <Download className="mt-0.5 size-5 shrink-0 text-nila-800" aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-bold">{t('title')}</p>
        {mode === 'android' && (
          <>
            <p className="text-[15px] text-teks-redup">{t('androidBody')}</p>
            <Button size="sm" onClick={install}>{t('install')}</Button>
          </>
        )}
        {mode === 'ios' && (
          <p className="text-[15px] text-teks-redup">
            {t.rich('iosBody', { share: () => <Share className="inline size-4 align-[-2px]" aria-label={t('shareIcon')} /> })}
          </p>
        )}
        {mode === 'inapp' && <p className="text-[15px] text-teks-redup">{t('inAppBody')}</p>}
      </div>
      {dismissible && <button type="button" onClick={dismiss} aria-label={t('dismiss')}
        className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-teks-redup hover:bg-nila-100">
        <X className="size-5" aria-hidden />
      </button>}
    </div>
  );
}
