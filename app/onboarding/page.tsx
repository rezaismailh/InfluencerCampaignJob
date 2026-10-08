import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ActionForm } from '@/components/action-form';
import { ProfileForm } from '@/components/creator/profile-form';
import { SocialForm } from '@/components/creator/social-form';
import { SocialList } from '@/components/creator/social-list';
import { SubmitButton } from '@/components/ui/submit-button';
import { Wordmark } from '@/components/wordmark';
import { finishOnboarding } from '@/app/(creator)/actions';
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
  const profileDone = !!(viewer.profile.full_name && viewer.profile.phone_enc && viewer.profile.city);

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <Wordmark height={28} />
      <h1 className="mt-6 text-[32px] font-extrabold leading-10 tracking-[-0.5px]">{t('title')}</h1>
      <p className="mt-1 text-teks-redup">{t('subtitle')}</p>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-bold">{t('profileStep')}</h2>
        <ProfileForm profile={viewer.profile} />
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-bold">{t('socialStep')}</h2>
        <p className="text-[15px] text-teks-redup">{t('socialHint')}</p>
        <SocialList accounts={accounts ?? []} />
        <SocialForm />
      </section>

      <section className="mt-10 space-y-3">
        <p className="text-[15px] text-teks-redup">
          {!profileDone ? t('finishNeedProfile') : !accounts?.length ? t('needSocial') : t('finishHint')}
        </p>
        <ActionForm action={finishOnboarding}>
          {next && <input type="hidden" name="next" value={next} />}
          <SubmitButton className="w-full" disabled={!profileDone || !accounts?.length}>{t('finish')}</SubmitButton>
        </ActionForm>
      </section>
    </main>
  );
}
