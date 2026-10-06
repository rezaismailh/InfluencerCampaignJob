import { getLocale, getTranslations } from 'next-intl/server';
import { ActionForm, FieldError } from '@/components/action-form';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { SubmitButton } from '@/components/ui/submit-button';
import { verifySocial } from '@/app/admin/actions';
import { requireStaff } from '@/lib/auth';
import { formatDateTime } from '@/lib/dates';
import type { SocialAccount } from '@/lib/types';

type Row = SocialAccount & { profiles: { full_name: string | null; email: string | null; city: string | null } };

export default async function SocialQueue() {
  const viewer = await requireStaff('curator');
  const t = await getTranslations('admin');
  const tp = await getTranslations('platform');
  const locale = await getLocale();
  const { data } = await viewer.supabase
    .from('social_accounts').select('*, profiles!social_accounts_creator_id_fkey(full_name, email, city)')
    .eq('status', 'pending').order('created_at').returns<Row[]>();

  return (
    <div>
      <PageHeader title={t('socialQueue')} />
      {!data?.length && <EmptyState title={t('socialEmpty')} />}
      <div className="grid gap-3 lg:grid-cols-2">
        {data?.map((a) => (
          <Card key={a.id} className="space-y-3">
            <div>
              <p className="font-bold">{a.profiles.full_name ?? a.profiles.email}</p>
              <p className="text-[13px] text-teks-redup">{[a.profiles.city, formatDateTime(a.created_at, locale)].filter(Boolean).join(' · ')}</p>
            </div>
            <a href={a.url} target="_blank" rel="noreferrer" className="inline-block font-bold text-nila-800 underline underline-offset-4">{tp(a.platform)} @{a.username}</a>
            <p className="text-[15px]">{t('followersClaimed', { count: a.followers.toLocaleString('id-ID') })}</p>
            <ActionForm action={verifySocial} className="space-y-3">
              <input type="hidden" name="id" value={a.id} />
              <Field label={t('followersChecked')} htmlFor={`f-${a.id}`}>
                <Input id={`f-${a.id}`} name="followers" inputMode="numeric" defaultValue={a.followers} className="tabular" />
              </Field>
              <Field label={t('rejectReason')} htmlFor={`r-${a.id}`}>
                <Input id={`r-${a.id}`} name="reason" /><FieldError name="reason" />
              </Field>
              <div className="flex gap-2">
                <SubmitButton name="decision" value="approve" className="flex-1">{t('verify')}</SubmitButton>
                <SubmitButton name="decision" value="reject" variant="outline">{t('reject')}</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        ))}
      </div>
    </div>
  );
}
