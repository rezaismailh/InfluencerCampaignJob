import 'server-only';
import { createTranslator } from 'next-intl';
import webpush from 'web-push';
import messages from '@/messages/id.json';
import { createAdminClient } from './supabase/admin';
import { notificationText } from './notification-text';

type Pending = {
  id: string;
  user_id: string;
  kind: string;
  params: Record<string, unknown>;
  link: string | null;
  profiles: { email: string | null } | null;
};

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? '';

function pushReady() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:halo@example.com', pub, priv);
  return true;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

async function sendEmail(to: string, subject: string, body: string, url: string, cta: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return;
  const html = `<div style="font-family:sans-serif;font-size:16px;line-height:24px;color:#1A174F">
    <p>${escapeHtml(body)}</p>
    <p><a href="${escapeHtml(url)}" style="display:inline-block;background:#24206B;color:#F7F5EF;padding:12px 20px;border-radius:14px;text-decoration:none;font-weight:700">${escapeHtml(cta)}</a></p>
  </div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text: `${body}\n\n${url}` }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

/**
 * Sends email and web push for notifications not delivered yet, then marks them.
 * In-app notifications need nothing: they are read straight from the table.
 */
export async function deliverPending(limit = 50) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('notifications')
    .select('id, user_id, kind, params, link, profiles(email)')
    .is('delivered_at', null)
    .order('created_at')
    .limit(limit)
    .returns<Pending[]>();
  if (error || !data?.length) return { delivered: 0 };

  const t = createTranslator({ locale: 'id', messages, namespace: 'notifications' });
  const tKind = createTranslator({ locale: 'id', messages, namespace: 'kind' });
  const tPlatform = createTranslator({ locale: 'id', messages, namespace: 'platform' });
  const canPush = pushReady();

  let delivered = 0;
  for (const n of data) {
    const body = notificationText(n, t as never, tKind as never, tPlatform as never);
    const url = `${site()}${n.link ?? '/notifikasi'}`;
    try {
      if (n.profiles?.email) await sendEmail(n.profiles.email, t('emailSubject'), body, url, t('emailOpen'));
    } catch {
      // Email failure must not block push or the in-app copy.
    }
    if (canPush) {
      const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', n.user_id);
      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: 'Tali', body, url: n.link ?? '/notifikasi' }),
          );
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }
    await admin.from('notifications').update({ delivered_at: new Date().toISOString() }).eq('id', n.id);
    delivered += 1;
  }
  return { delivered };
}
