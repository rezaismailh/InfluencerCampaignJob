import { getLocale, getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/button';
import { formatDate } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { MIN_PAYOUT, maskAccount } from '@/lib/payout';
import type { Balance } from '@/lib/work';
import type { PayoutRequest } from '@/lib/types';

// The one standout element on the creator dashboard: money ready and the next transfer.
export async function BalanceCard({ balance, nextTransfer, showCta = true }: {
  balance: Balance;
  nextTransfer?: PayoutRequest | null;
  showCta?: boolean;
}) {
  const t = await getTranslations('home');
  const locale = await getLocale();
  return (
    <section className="rounded-2xl bg-nila-800 p-5 text-gading">
      <p className="text-[15px] font-medium text-gading/80">{t('readyTitle')}</p>
      <p className="mt-1 text-[40px] font-extrabold leading-[48px] tracking-[-0.5px] tabular text-limau-400">{formatRupiah(balance.ready)}</p>
      {nextTransfer && (
        <p className="mt-3 text-[15px]">
          {t('nextTransfer', {
            amount: formatRupiah(nextTransfer.net),
            bank: nextTransfer.bank_name,
            account: maskAccount(nextTransfer.account_last4),
            date: formatDate(nextTransfer.due_date, locale, true),
          })}
        </p>
      )}
      {balance.waitingTop > 0 && balance.nextReadyDate && (
        <p className="mt-2 text-[15px] text-gading/80">
          {t('waitingTop', { amount: formatRupiah(balance.waitingTop), date: formatDate(balance.nextReadyDate, locale) })}
        </p>
      )}
      {balance.ready === 0 && !nextTransfer && balance.waitingTop === 0 && (
        <p className="mt-2 text-[15px] text-gading/80">{t('nothingYet')}</p>
      )}
      {showCta && balance.ready > 0 && (
        <div className="mt-4">
          <ButtonLink href="/saldo" variant="accent" className="w-full">{t('requestCta')}</ButtonLink>
          {balance.ready < MIN_PAYOUT && <p className="mt-2 text-[13px] text-gading/80">{t('minimumNote', { amount: formatRupiah(MIN_PAYOUT) })}</p>}
        </div>
      )}
    </section>
  );
}
