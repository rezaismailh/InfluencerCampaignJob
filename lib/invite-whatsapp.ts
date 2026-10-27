import 'server-only';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { decrypt } from './crypto';
import { formatRupiah } from './money';
import { waLink } from './whatsapp';

/** Public origin for links in messages: NEXT_PUBLIC_SITE_URL, else the host of this request. */
async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const h = await headers();
  const host = (h.get('x-forwarded-host') ?? h.get('host'))?.split(',')[0].trim() ?? '';
  const proto = h.get('x-forwarded-proto')?.split(',')[0].trim() ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** WhatsApp invitation for one invited creator, opened from the curator's own WhatsApp. */
export async function inviteWhatsApp(
  creator: { full_name: string | null; phone_enc: string | null },
  job: { title: string; short_code: string },
  fee: number | null,
): Promise<string | null> {
  const t = await getTranslations('admin');
  const text = t('waInvite', {
    name: creator.full_name?.trim().split(/\s+/)[0] || 'none',
    job: job.title,
    fee: fee ? formatRupiah(fee) : '-',
    url: `${await siteOrigin()}/j/${job.short_code}`,
  });
  return waLink(decrypt(creator.phone_enc), text);
}
