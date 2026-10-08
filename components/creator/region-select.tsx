'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/action-form';
import { Field, Select } from '@/components/ui/field';
import { REGIONS, citiesOf } from '@/lib/wilayah';

/** Province, then regency/city. The city list follows the chosen province. */
export function RegionSelect({ province: initialProvince, city: initialCity }: { province: string | null; city: string | null }) {
  const t = useTranslations('onboarding');
  const [province, setProvince] = useState(initialProvince ?? '');
  const cities = citiesOf(province);
  const cityDefault = initialCity && cities.includes(initialCity) ? initialCity : '';

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t('province')} htmlFor="province">
        <Select id="province" name="province" value={province} onChange={(e) => setProvince(e.target.value)} required>
          <option value="" disabled>{t('provincePlaceholder')}</option>
          {REGIONS.map((r) => <option key={r.province} value={r.province}>{r.province}</option>)}
        </Select>
        <FieldError name="province" />
      </Field>
      <Field label={t('city')} htmlFor="city">
        {/* Remount when the province changes so the previous city is cleared. */}
        <Select key={province} id="city" name="city" defaultValue={cityDefault} required disabled={!province}>
          <option value="" disabled>{province ? t('cityPlaceholder') : t('cityPickProvince')}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <FieldError name="city" />
      </Field>
    </div>
  );
}
