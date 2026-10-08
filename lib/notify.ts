import 'server-only';
import { createTranslator } from 'next-intl';
import webpush from 'web-push';
import messages from '@/messages/id.json';
import { createAdminClient } from './supabase/admin';
import { channelsFor } from './notification-channels';
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

/** "Tali <notifikasi@jointali.online>" → name and address. */
export function parseFrom(from: string): { name: string; address: string } {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim(), address: m[2].trim() } : { name: '', address: from.trim() };
}

/**
 * Sends through Brevo when BREVO_API_KEY is set, otherwise Resend.
 * Does nothing when neither provider or EMAIL_FROM is configured.
 */
export async function sendEmail(to: string, subject: string, body: string, url: string, cta: string) {
  const from = process.env.EMAIL_FROM;
  const brevo = process.env.BREVO_API_KEY;
  const resend = process.env.RESEND_API_KEY;
  if (!from || (!brevo && !resend)) return;
  const html = `<div style="font-family:sans-serif;font-size:16px;line-height:24px;color:#1A174F">
    <p>${escapeHtml(body)}</p>
    <p><a href="${escapeHtml(url)}" style="display:inline-block;background:#24206B;color:#F7F5EF;padding:12px 20px;border-radius:14px;text-decoration:none;font-weight:700">${escapeHtml(cta)}</a></p>
  </div>`;
  const text = `${body}\n\n${url}`;

  if (brevo) {
    const sender = parseFrom(from);
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevo.trim(), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: { name: sender.name || undefined, email: sender.address }, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
    });
    if (!res.ok) throw new Error(`brevo ${res.status}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text }),
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
    const channels = channelsFor(n.kind);
    try {
      if (channels.email && n.profiles?.email) await sendEmail(n.profiles.email, t('emailSubject'), body, url, t('emailOpen'));
    } catch (e) {
      // Email failure must not block push or the in-app copy; log it so it shows in Railway logs.
      console.error('email failed', n.kind, (e as Error).message);
    }
    if (canPush && channels.push) {
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
