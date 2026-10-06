import { getTranslations } from 'next-intl/server';
import { Wordmark } from '@/components/wordmark';
import { LoginForm } from './login-form';

export async function generateMetadata() {
  const tm = await getTranslations('auth');
  return { title: tm('title') };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const t = await getTranslations('auth');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/lanjut';
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-12 pb-10">
      <Wordmark height={48} />
      <h1 className="mt-8 text-[32px] font-extrabold leading-10 tracking-[-0.5px]">{t('title')}</h1>
      <p className="mt-2 text-teks-redup">{t('subtitle')}</p>
      <div className="mt-8">
        <LoginForm next={safeNext} callbackError={error === 'callback'} />
      </div>
    </main>
  );
}
