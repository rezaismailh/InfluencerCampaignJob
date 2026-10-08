'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isStandalone } from '@/components/install-prompt';
import { enablePush, getPushState, pushSupported, type PushState } from '@/lib/push-client';

const DISMISS_KEY = 'tali-push-card-dismissed';
const DISMISS_DAYS = 30;
const noopSubscribe = () => () => {};

function eligible() {
  if (!pushSupported() || !isStandalone()) return false;
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !(at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000);
  } catch {
    return true;
  }
}

/**
 * Beranda card, only inside the installed app while notifications are off:
 * one tap asks for permission (browsers require a tap) and subscribes.
 * Disappears once on, when blocked, or for 30 days after closing.
 */
export function EnablePushCard() {
  const t = useTranslations('pushCard');
  const show = useSyncExternalStore(noopSubscribe, eligible, () => false);
  const [state, setState] = useState<PushState | 'unknown' | 'closed'>('unknown');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show) return;
    getPushState().then(setState).catch(() => setState('off'));
  }, [show]);

  if (!show || state !== 'off') return null;

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private mode: it may show again next time.
    }
    setState('closed');
  };

  return (
    <div className="flex gap-3 rounded-2xl border border-nila-200 bg-nila-50 p-4">
      <BellRing className="mt-0.5 size-5 shrink-0 text-nila-800" aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-bold">{t('title')}</p>
        <p className="text-[15px] text-teks-redup">{t('body')}</p>
        <Button size="sm" disabled={busy} onClick={() => { setBusy(true); enablePush().then(setState).finally(() => setBusy(false)); }}>
          {t('enable')}
        </Button>
      </div>
      <button type="button" onClick={close} aria-label={t('dismiss')}
        className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-teks-redup hover:bg-nila-100">
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}
