import { getTranslations } from 'next-intl/server';
import { ActionForm, FieldError } from '@/components/action-form';
import { Field, Input, Select } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { savePayoutAccount } from '@/app/(creator)/actions';
import { BANKS } from '@/lib/payout';
import type { PayoutAccount } from '@/lib/types';

export async function PayoutAccountForm({ account }: { account: PayoutAccount | null }) {
  const t = await getTranslations('balance');
  const c = await getTranslations('common');
  return (
    <ActionForm action={savePayoutAccount}>
      <Field label={t('bank')} htmlFor="bank_name">
        <Select id="bank_name" name="bank_name" defaultValue={account?.bank_name ?? ''} required>
          <option value="" disabled>{c('none')}</option>
          {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
        </Select>
        <FieldError name="bank_name" />
      </Field>
      <Field label={t('accountNumber')} htmlFor="account_number">
        <Input id="account_number" name="account_number" inputMode="numeric" autoComplete="off" required className="tabular" />
        <FieldError name="account_number" />
      </Field>
      <Field label={t('holderName')} hint={t('holderHint')} htmlFor="holder_name">
        <Input id="holder_name" name="holder_name" defaultValue={account?.holder_name ?? ''} required />
        <FieldError name="holder_name" />
      </Field>
      <SubmitButton pendingLabel={c('saving')} variant="outline" className="w-full">{t('saveAccount')}</SubmitButton>
    </ActionForm>
  );
}
