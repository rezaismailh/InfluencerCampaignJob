import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/button';
import { Wordmark } from '@/components/wordmark';

export default async function NotFound() {
  const t = await getTranslations('errors');
  const c = await getTranslations('common');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Wordmark height={48} />
      <h1 className="text-2xl font-bold">{t('notFoundTitle')}</h1>
      <p className="text-teks-redup">{t('notFoundBody')}</p>
      <ButtonLink href="/lanjut">{c('back')}</ButtonLink>
    </main>
  );
}
