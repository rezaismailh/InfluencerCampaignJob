import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Mail, MessageCircle } from 'lucide-react';
import { Wordmark } from '@/components/wordmark';
import { contact } from '@/lib/contact';
import { formatDate } from '@/lib/dates';

type Section = { title: string; body: string[]; items?: string[] };

// Effective date of the current version of each document.
const UPDATED = { privacy: '2026-10-09', terms: '2026-10-07' } as const;

export async function LegalPage({ doc }: { doc: 'privacy' | 'terms' }) {
  const t = await getTranslations('legal');
  const locale = await getLocale();
  const sections = t.raw(doc) as Section[];
  const { wa, email } = contact();
  const other = doc === 'privacy' ? { href: '/ketentuan', label: t('termsTitle') } : { href: '/privasi', label: t('privacyTitle') };

  return (
    <main className="mx-auto max-w-md px-4 pt-10 pb-16">
      <Link href="/" aria-label="Tali" className="inline-block">
        <Wordmark height={40} />
      </Link>
      <h1 className="mt-8 text-[28px] font-extrabold leading-9 tracking-[-0.5px]">{t(doc === 'privacy' ? 'privacyTitle' : 'termsTitle')}</h1>
      <p className="mt-1 text-sm text-teks-redup">{t('updated', { date: formatDate(UPDATED[doc], locale) })}</p>

      <div className="mt-8 space-y-7">
        {sections.map((s, i) => (
          <section key={s.title} className="space-y-2">
            <h2 className="text-lg font-bold leading-6">{i + 1}. {s.title}</h2>
            {s.body.map((p) => <p key={p} className="text-[15px] leading-6">{p}</p>)}
            {s.items && (
              <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-6">
                {s.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}

        {(wa || email) && (
          <section className="space-y-2 rounded-2xl border border-garis bg-kertas p-4">
            <h2 className="text-lg font-bold leading-6">{t('contactTitle')}</h2>
            <p className="text-[15px] leading-6">{t('contactBody')}</p>
            <div className="flex flex-col">
              {wa && (
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-bold text-nila-800 underline underline-offset-4">
                  <MessageCircle className="size-5" aria-hidden /> WhatsApp
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="inline-flex min-h-11 items-center gap-2 font-bold text-nila-800 underline underline-offset-4">
                  <Mail className="size-5" aria-hidden /> {email}
                </a>
              )}
            </div>
          </section>
        )}
      </div>

      <p className="mt-10 text-[15px]">
        <Link href={other.href} className="font-bold text-nila-800 underline underline-offset-4">{other.label}</Link>
      </p>
    </main>
  );
}
