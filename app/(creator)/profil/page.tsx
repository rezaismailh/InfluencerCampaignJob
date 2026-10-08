import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page';
import { ProfileForm } from '@/components/creator/profile-form';
import { LanguageSwitch } from '@/components/language-switch';
import { PushToggle } from '@/components/push-toggle';
import { InstallPrompt } from '@/components/install-prompt';
import { requireCreator } from '@/lib/auth';
import type { SocialAccount } from '@/lib/types';

export async function generateMetadata() {
  const tm = await getTranslations('profile');
  return { title: tm('title') };
}

export default async function ProfilePage() {
  const viewer = await requireCreator();
  const t = await getTranslations('profile');
  const c = await getTranslations('common');
  const tl = await getTranslations('legal');
  const { data: accounts } = await viewer.supabase
    .from('social_accounts').select('*').eq('creator_id', viewer.id).order('created_at').returns<SocialAccount[]>();

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} subtitle={viewer.profile.email ?? undefined} />

      <Card className="space-y-4">
        <CardTitle>{t('personal')}</CardTitle>
        <ProfileForm profile={viewer.profile} accounts={accounts ?? []} mode="profile" />
      </Card>

      <Card className="space-y-4">
        <CardTitle>{t('account')}</CardTitle>
        <div className="space-y-2">
          <p className="text-[15px] font-bold">{c('language')}</p>
          <LanguageSwitch />
        </div>
        <div className="space-y-2">
          <p className="text-[15px] font-bold">{t('push')}</p>
          <PushToggle />
        </div>
        <InstallPrompt dismissible={false} />
        <div className="flex gap-4 text-[15px]">
          <Link href="/privasi" className="inline-flex min-h-11 items-center font-bold text-nila-800 underline underline-offset-4">{tl('privacyTitle')}</Link>
          <Link href="/ketentuan" className="inline-flex min-h-11 items-center font-bold text-nila-800 underline underline-offset-4">{tl('termsTitle')}</Link>
        </div>
        <form action="/auth/keluar" method="post">
          <Button variant="outline" className="w-full">{c('logout')}</Button>
        </form>
      </Card>
    </div>
  );
}
