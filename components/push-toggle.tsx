'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { savePushSubscription } from '@/app/notification-actions';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const noopSubscribe = () => () => {};

export function PushToggle() {
  const t = useTranslations('profile');
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => !!key && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
    () => true,
  );
  const [state, setState] = useState<'unknown' | 'denied' | 'on' | 'off'>('unknown');

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready
      .then(async (reg): Promise<'denied' | 'on' | 'off'> => {
        if (Notification.permission === 'denied') return 'denied';
        return (await reg.pushManager.getSubscription()) ? 'on' : 'off';
      })
      .then(setState)
      .catch(() => setState('off'));
  }, [supported]);

  async function enable() {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return setState('denied');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key!) });
    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const res = await savePushSubscription(json);
    setState(res.ok ? 'on' : 'off');
  }

  if (!supported) return <p className="text-[15px] text-teks-redup">{t('pushUnsupported')}</p>;
  if (state === 'unknown') return null;
  if (state === 'denied') return <p className="text-[15px] text-teks-redup">{t('pushDenied')}</p>;
  if (state === 'on') return <p className="text-[15px] text-sukses">{t('pushEnabled')}</p>;
  return <Button type="button" variant="outline" className="w-full" onClick={enable}>{t('pushOn')}</Button>;
}
