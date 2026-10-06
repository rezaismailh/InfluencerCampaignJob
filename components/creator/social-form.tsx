'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ActionForm, FieldError } from '@/components/action-form';
import { Field, Input } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { addSocialAccount } from '@/app/(creator)/actions';
import { parseProfileUrl } from '@/lib/social';

export function SocialForm() {
  const t = useTranslations('social');
  const tp = useTranslations('platform');
  const c = useTranslations('common');
  const [url, setUrl] = useState('');
  const parsed = useMemo(() => (url.trim() ? parseProfileUrl(url) : null), [url]);

  return (
    <ActionForm action={addSocialAccount} resetOnSuccess className="space-y-4 rounded-2xl border border-garis bg-kertas p-4">
      <Field label={t('link')} htmlFor="social-url">
        <Input id="social-url" name="url" type="url" inputMode="url" placeholder={t('linkPlaceholder')}
          value={url} onChange={(e) => setUrl(e.target.value)} required />
        <FieldError name="url" />
        {url.trim() && !parsed && <p className="text-[13px] text-bahaya">{t('unsupported')}</p>}
        {parsed?.username && <p className="text-[13px] text-sukses">{t('detected', { platform: tp(parsed.platform), username: parsed.username })}</p>}
        {parsed && !parsed.username && <p className="text-[13px] text-peringatan">{t('detectedNoUsername', { platform: tp(parsed.platform) })}</p>}
      </Field>
      {parsed && !parsed.username && (
        <Field label={t('username')} htmlFor="social-username">
          <Input id="social-username" name="username" placeholder="@username" required />
          <FieldError name="username" />
        </Field>
      )}
      <Field label={parsed?.platform === 'youtube' ? t('subscribers') : t('followers')} hint={t('followersHint')} htmlFor="social-followers">
        <Input id="social-followers" name="followers" inputMode="numeric" placeholder="12000" required className="tabular" />
        <FieldError name="followers" />
      </Field>
      <SubmitButton pendingLabel={c('saving')} variant="outline" className="w-full" disabled={!parsed}>{t('save')}</SubmitButton>
    </ActionForm>
  );
}
