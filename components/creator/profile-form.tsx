import { getTranslations } from 'next-intl/server';
import { ActionForm, FieldError } from '@/components/action-form';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { saveProfile } from '@/app/(creator)/actions';
import { RegionSelect } from '@/components/creator/region-select';
import { decrypt } from '@/lib/crypto';
import { provinceOf } from '@/lib/wilayah';
import { SocialList } from '@/components/creator/social-list';
import { SocialRows } from '@/components/creator/social-rows';
import type { Profile, SocialAccount } from '@/lib/types';

const CATEGORIES = ['food', 'beauty', 'fashion', 'lifestyle', 'tech', 'travel', 'parenting', 'gaming', 'health', 'finance', 'education', 'entertainment'];
const PERSONAS = ['genz', 'student', 'foodies', 'lifestyle', 'parent', 'professional', 'other'];

/**
 * Personal details and social accounts in one form with one button at the bottom.
 * In onboarding the button finishes onboarding; on the profile page it saves.
 */
export async function ProfileForm({ profile, accounts, mode, next }: {
  profile: Profile;
  accounts: SocialAccount[];
  mode: 'onboarding' | 'profile';
  next?: string | null;
}) {
  const t = await getTranslations('onboarding');
  const tc = await getTranslations('category');
  const tp = await getTranslations('persona');
  const c = await getTranslations('common');
  const ts = await getTranslations('social');
  const onboarding = mode === 'onboarding';
  return (
    <ActionForm action={saveProfile} noValidate className="space-y-4">
      {onboarding && <h2 className="pt-2 text-xl font-bold">{t('profileStep')}</h2>}
      <Field label={t('fullName')} htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" defaultValue={profile.full_name ?? ''} required />
        <FieldError name="full_name" />
      </Field>
      <Field label={t('phone')} hint={t('phoneHint')} htmlFor="phone">
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx"
          defaultValue={decrypt(profile.phone_enc) ?? ''} required />
        <FieldError name="phone" />
      </Field>
      <RegionSelect province={profile.province ?? provinceOf(profile.city)} city={profile.city} />
      <fieldset className="space-y-1.5">
        <legend className="text-[15px] font-bold">{t('categories')}</legend>
        <p className="text-[13px] text-teks-redup">{t('categoriesHint')}</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((key) => (
            <label key={key} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-garis bg-kertas px-3 has-[:checked]:border-nila-800 has-[:checked]:bg-nila-50">
              <input type="checkbox" name="categories" value={key} defaultChecked={profile.categories.includes(key)} className="accent-nila-800" />
              <span className="text-[15px]">{tc(key)}</span>
            </label>
          ))}
        </div>
        <FieldError name="categories" />
      </fieldset>
      <Field label={t('persona')} htmlFor="persona">
        <Select id="persona" name="persona" defaultValue={profile.persona ?? ''}>
          <option value="">{c('none')}</option>
          {PERSONAS.map((key) => <option key={key} value={key}>{tp(key)}</option>)}
        </Select>
      </Field>
      <Field label={<>{t('address')} <span className="font-medium text-teks-redup">({c('optional')})</span></>} hint={t('addressHint')} htmlFor="address">
        <Textarea id="address" name="address" autoComplete="street-address" defaultValue={decrypt(profile.address_enc) ?? ''} />
        <FieldError name="address" />
      </Field>

      <section id="field-social" tabIndex={-1} className="space-y-3 pt-6">
        <h2 className="text-xl font-bold">{onboarding ? t('socialStep') : ts('title')}</h2>
        <p className="text-[15px] text-teks-redup">{t('socialHint')}</p>
        <SocialList accounts={accounts} />
        <SocialRows startWithRow={accounts.length === 0} />
        <FieldError name="social" />
      </section>

      {onboarding && next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-2 pt-4">
        {onboarding && <p className="text-[15px] text-teks-redup">{t('finishHint')}</p>}
        <SubmitButton name="finish" value={onboarding ? '1' : '0'} pendingLabel={c('saving')} className="w-full">
          {onboarding ? t('finish') : t('saveProfile')}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
