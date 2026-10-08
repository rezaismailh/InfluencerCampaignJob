import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ProfileForm } from '@/components/creator/profile-form';
import { Wordmark } from '@/components/wordmark';
import { requireCreator, safeNext } from '@/lib/auth';
import type { SocialAccount } from '@/lib/types';

export async function generateMetadata() {
  const tm = await getTranslations('onboarding');
  return { title: tm('title') };
}

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const viewer = await requireCreator({ allowIncomplete: true });
  const next = safeNext((await searchParams).next);
  if (viewer.profile.onboarded_at) redirect(next ?? '/beranda');
  const t = await getTranslations('onboarding');
  const { data: accounts } = await viewer.supabase
    .from('social_accounts').select('*').eq('creator_id', viewer.id).order('created_at').returns<SocialAccount[]>();

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <Wordmark height={28} />
      <h1 className="mt-6 text-[32px] font-extrabold leading-10 tracking-[-0.5px]">{t('title')}</h1>
      <p className="mt-1 text-teks-redup">{t('subtitle')}</p>

      <div className="mt-6">
        <ProfileForm profile={viewer.profile} accounts={accounts ?? []} mode="onboarding" next={next} />
      </div>
    </main>
  );
}
