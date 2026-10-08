'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Share, X } from 'lucide-react';
import { markAppInstalled } from '@/app/(creator)/actions';
import { Button } from '@/components/ui/button';

// "Add to home screen" banner. Android/Chrome gets a real install button (beforeinstallprompt);
// iPhone gets the Share → Add to Home Screen steps; in-app browsers (Instagram, TikTok…)
// are asked to open the page in a real browser first, since they cannot install.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export type InstallMode = 'android' | 'ios' | 'inapp' | 'hidden';

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

export function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || !!nav.standalone;
}

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function snapshot(ignoreDismiss: boolean): InstallMode {
  if (isStandalone()) return 'hidden';
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

/** How this device can install Tali; `ignoreDismiss` skips the 30-day "closed the banner" rule. */
export function useInstallMode(ignoreDismiss = false): InstallMode {
  return useSyncExternalStore(subscribe, () => snapshot(ignoreDismiss), () => 'hidden' as InstallMode);
}

/** Shows Android's install dialog (only when mode is "android"). */
export async function promptInstall() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  notify();
}

// The bottom sheet is shown once per device; after that the small banner takes over.
const SHEET_KEY = 'tali-install-sheet-shown';
function sheetShown() {
  try {
    return !!localStorage.getItem(SHEET_KEY);
  } catch {
    return false;
  }
}
export function useSheetShown(): boolean {
  return useSyncExternalStore(subscribe, sheetShown, () => true);
}
export function markSheetShown() {
  try {
    localStorage.setItem(SHEET_KEY, String(Date.now()));
  } catch {
    // Private mode: it may show once more, which is acceptable.
  }
  notify();
}

/**
 * `dismissible` (Beranda): closable, stays hidden for 30 days once closed.
 * Not dismissible (Profile): always there as the "how to install" reference.
 */
export function InstallPrompt({ dismissible = true, installed = false }: { dismissible?: boolean; installed?: boolean }) {
  const t = useTranslations('install');
  const mode = useInstallMode(!dismissible);
  if (installed || mode === 'hidden') return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private mode: the banner simply shows again next time.
    }
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
            <Button size="sm" onClick={promptInstall}>{t('install')}</Button>
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

/**
 * Mounted in the creator app chrome: when Tali runs from the home screen (or Android
 * reports the install), record it on the profile so the banner never shows again.
 */
export function AppInstalledMarker({ installed }: { installed: boolean }) {
  useEffect(() => {
    if (installed) return;
    const mark = () => { markAppInstalled().catch(() => {}); };
    if (isStandalone()) mark();
    window.addEventListener('appinstalled', mark);
    return () => window.removeEventListener('appinstalled', mark);
  }, [installed]);
  return null;
}
