import { getTranslations } from 'next-intl/server';
import { ActionForm, FieldError } from '@/components/action-form';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { saveProfile } from '@/app/(creator)/actions';
import { RegionSelect } from '@/components/creator/region-select';
import { decrypt } from '@/lib/crypto';
import { provinceOf } from '@/lib/wilayah';
import type { Profile } from '@/lib/types';

const CATEGORIES = ['food', 'beauty', 'fashion', 'lifestyle', 'tech', 'travel', 'parenting', 'gaming', 'health', 'finance', 'education', 'entertainment'];
const PERSONAS = ['genz', 'student', 'foodies', 'lifestyle', 'parent', 'professional', 'other'];

export async function ProfileForm({ profile }: { profile: Profile }) {
  const t = await getTranslations('onboarding');
  const tc = await getTranslations('category');
  const tp = await getTranslations('persona');
  const c = await getTranslations('common');
  return (
    <ActionForm action={saveProfile}>
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
      <SubmitButton pendingLabel={c('saving')} className="w-full">{t('saveProfile')}</SubmitButton>
    </ActionForm>
  );
}
