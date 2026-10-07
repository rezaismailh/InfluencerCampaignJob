import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CalendarClock, Mail, MessageCircle, MessageSquareText, Wallet } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Wordmark } from '@/components/wordmark';
import { getViewer, homeFor } from '@/lib/auth';
import { contact } from '@/lib/contact';

export default async function Splash() {
  const viewer = await getViewer();
  if (viewer) redirect(viewer.profile.onboarded_at || viewer.profile.role !== 'creator' ? homeFor(viewer.profile.role) : '/onboarding');
  const t = await getTranslations('splash');
  const points = [
    { icon: MessageSquareText, title: t('point1Title'), body: t('point1Body') },
    { icon: CalendarClock, title: t('point2Title'), body: t('point2Body') },
    { icon: Wallet, title: t('point3Title'), body: t('point3Body') },
  ];
  const tl = await getTranslations('legal');
  const { wa, email } = contact();

  return (
    <main className="min-h-dvh bg-nila-800 text-gading">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-16">
        <div className="flex flex-col items-center text-center">
          <Wordmark on="dark" height={96} />
          <p className="mt-2 text-lg font-medium">Tied to trust.</p>
        </div>

        <h1 className="mt-12 text-[32px] font-extrabold leading-10 tracking-[-0.5px]">{t('title')}</h1>
        <p className="mt-3 text-gading/90">{t('body')}</p>

        <ul className="mt-8 space-y-4">
          {points.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <Icon className="mt-0.5 size-6 shrink-0 text-limau-400" strokeWidth={2} aria-hidden />
              <div>
                <p className="font-bold">{title}</p>
                <p className="text-[15px] text-gading/80">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-3 pt-10">
          <ButtonLink href="/masuk" variant="accent" className="w-full">{t('creatorCta')}</ButtonLink>
          <ButtonLink href="/job" variant="outlineLight" className="w-full">{t('browseJobs')}</ButtonLink>
          <ButtonLink href="/masuk" variant="ghostLight" className="w-full">{t('login')}</ButtonLink>
        </div>
        {(wa || email) && (
          <p id="brand" className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-gading/70">
            <span>{t('brandCta')}</span>
            {wa && (
              <a
                href={`https://wa.me/${wa}?text=${encodeURIComponent(t('brandWhatsappMessage'))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 font-bold text-gading underline underline-offset-4"
              >
                <MessageCircle className="size-4" aria-hidden />
                {t('brandWhatsapp')}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}?subject=${encodeURIComponent(t('brandEmailSubject'))}`}
                className="inline-flex min-h-11 items-center gap-1.5 font-bold text-gading underline underline-offset-4"
              >
                <Mail className="size-4" aria-hidden />
                {t('brandEmail')}
              </a>
            )}
          </p>
        )}
        <p className="mt-6 flex justify-center gap-4 text-[13px] text-gading/60">
          <Link href="/privasi" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{tl('privacyLink')}</Link>
          <Link href="/ketentuan" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{tl('termsLink')}</Link>
        </p>
      </div>
    </main>
  );
}
