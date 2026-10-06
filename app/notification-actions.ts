'use server';

import { revalidatePath } from 'next/cache';
import { requireViewer } from '@/lib/auth';

export async function markAllRead() {
  const viewer = await requireViewer();
  await viewer.supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  revalidatePath('/', 'layout');
}

export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const viewer = await requireViewer();
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  await viewer.supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  const { error } = await viewer.supabase.from('push_subscriptions').insert({
    user_id: viewer.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  });
  return { ok: !error };
}
