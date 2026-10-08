// Browser side of Web Push: support check, current state, and turning it on.
import { savePushSubscription } from '@/app/notification-actions';

export type PushState = 'denied' | 'on' | 'off';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupported() {
  return !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushState(): Promise<PushState> {
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) ? 'on' : 'off';
}

/** Must run from a tap: browsers (iPhone especially) only ask for permission after a user gesture. */
export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });
  const res = await savePushSubscription(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
  return res.ok ? 'on' : 'off';
}
