'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { enablePush, getPushState, pushSupported, type PushState } from '@/lib/push-client';

const noopSubscribe = () => () => {};

export function PushToggle() {
  const t = useTranslations('profile');
  const supported = useSyncExternalStore(noopSubscribe, pushSupported, () => true);
  const [state, setState] = useState<PushState | 'unknown'>('unknown');

  useEffect(() => {
    if (!supported) return;
    getPushState().then(setState).catch(() => setState('off'));
  }, [supported]);

  if (!supported) return <p className="text-[15px] text-teks-redup">{t('pushUnsupported')}</p>;
  if (state === 'unknown') return null;
  if (state === 'denied') return <p className="text-[15px] text-teks-redup">{t('pushDenied')}</p>;
  if (state === 'on') return <p className="text-[15px] text-sukses">{t('pushEnabled')}</p>;
  return <Button type="button" variant="outline" className="w-full" onClick={() => enablePush().then(setState)}>{t('pushOn')}</Button>;
}
