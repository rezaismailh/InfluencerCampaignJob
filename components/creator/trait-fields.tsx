'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/action-form';
import type { AccountType, Gender, Hijab } from '@/lib/types';
import type { Trait } from '@/lib/visit';

const GENDERS: Gender[] = ['female', 'male'];
const HIJAB: Hijab[] = ['hijab', 'non_hijab'];
const ACCOUNT_TYPES: AccountType[] = ['personal', 'couple', 'family', 'group'];

function Choice<T extends string>({ name, label, hint, options, value, onChange, optionLabel }: {
  name: string; label: string; hint?: string; options: T[]; value: T | null; onChange?: (v: T) => void; optionLabel: (v: T) => string;
}) {
  return (
    <fieldset id={`field-${name}`} tabIndex={-1} className="space-y-1.5">
      <legend className="text-[15px] font-bold">{label}</legend>
      {hint && <p className="text-[13px] text-teks-redup">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-garis bg-kertas px-3 has-[:checked]:border-nila-800 has-[:checked]:bg-nila-50">
            <input type="radio" name={name} value={o} defaultChecked={value === o} onChange={() => onChange?.(o)} className="accent-nila-800" />
            <span className="text-[15px]">{optionLabel(o)}</span>
          </label>
        ))}
      </div>
      <FieldError name={name} />
    </fieldset>
  );
}

/**
 * Gender, hijab (asked only for women) and account type. `ask` limits the questions to the
 * traits a job needs (apply form); without it all three are shown (profile and onboarding).
 */
export function TraitFields({ gender, hijab, accountType, ask }: {
  gender: Gender | null; hijab: Hijab | null; accountType: AccountType | null; ask?: Trait[];
}) {
  const t = useTranslations('onboarding');
  const tg = useTranslations('gender');
  const th = useTranslations('hijab');
  const ta = useTranslations('accountType');
  const [current, setCurrent] = useState<Gender | null>(gender);
  const show = (trait: Trait) => !ask || ask.includes(trait);
  return (
    <div className="space-y-4">
      {show('gender') && <Choice name="gender" label={t('gender')} options={GENDERS} value={gender} onChange={setCurrent} optionLabel={(v) => tg(v)} />}
      {show('hijab') && current === 'female' && (
        <Choice name="hijab" label={t('hijab')} options={HIJAB} value={hijab} optionLabel={(v) => th(v)} />
      )}
      {show('account_type') && (
        <Choice name="account_type" label={t('accountType')} hint={t('accountTypeHint')} options={ACCOUNT_TYPES} value={accountType} optionLabel={(v) => ta(v)} />
      )}
    </div>
  );
}
