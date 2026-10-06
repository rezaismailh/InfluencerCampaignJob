import { getTranslations } from 'next-intl/server';
import { Wordmark } from '@/components/wordmark';

export const dynamic = 'force-static';

export default async function Offline() {
  const t = await getTranslations('errors');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Wordmark height={48} />
      <h1 className="text-2xl font-bold">{t('offlineTitle')}</h1>
      <p className="text-teks-redup">{t('offlineBody')}</p>
    </main>
  );
}
