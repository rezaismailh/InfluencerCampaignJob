import { getLocale, getTranslations } from 'next-intl/server';
import { ActionForm } from '@/components/action-form';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page';
import { payoutTone } from '@/components/status';
import { BalanceCard } from '@/components/creator/balance-card';
import { PayoutAccountForm } from '@/components/creator/payout-account-form';
import { PayoutPicker } from '@/components/creator/payout-picker';
import { requestPayout } from '@/app/(creator)/actions';
import { requireCreator } from '@/lib/auth';
import { loadCreatorWork } from '@/lib/creator-data';
import { formatDate, todayWib } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { maskAccount } from '@/lib/payout';
import { balance } from '@/lib/work';
import type { PayoutAccount } from '@/lib/types';

export async function generateMetadata() {
  const tm = await getTranslations('balance');
  return { title: tm('title') };
}

export default async function Balance() {
  const viewer = await requireCreator();
  const t = await getTranslations('balance');
  const tp = await getTranslations('payout');
  const locale = await getLocale();
  const { parts, requests } = await loadCreatorWork(viewer);
  const [{ data: account }, { data: holidays }] = await Promise.all([
    viewer.supabase.from('payout_accounts').select('*').eq('creator_id', viewer.id).maybeSingle<PayoutAccount>(),
    viewer.supabase.from('holidays').select('day').gte('day', todayWib()),
  ]);

  const bal = balance(parts, requests, todayWib());
  const readyItems = parts
    .filter((p) => bal.readyIds.includes(p.id))
    .map((p) => ({ id: p.id, title: p.jobs.title, brand: p.jobs.brand_name, fee: p.agreed_fee ?? 0 }));
  const nextTransfer = requests.find((r) => r.status === 'requested' || r.status === 'processing') ?? null;
  const jobsByRequest = new Map<string, number>();
  for (const p of parts) if (p.payout_request_id) jobsByRequest.set(p.payout_request_id, (jobsByRequest.get(p.payout_request_id) ?? 0) + 1);

  const stats = [
    { label: t('waitingTop'), value: bal.waitingTop },
    { label: t('ready'), value: bal.ready },
    { label: t('inProcess'), value: bal.inProcess },
    { label: t('paid'), value: bal.paid },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} />
      <BalanceCard balance={bal} nextTransfer={nextTransfer} showCta={false} />

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-3">
            <p className="text-[13px] text-teks-redup">{s.label}</p>
            <p className="font-extrabold tabular">{formatRupiah(s.value)}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <CardTitle>{t('requestTitle')}</CardTitle>
        {!readyItems.length ? (
          <p className="text-[15px] text-teks-redup">{t('nothingReady')}</p>
        ) : !account ? (
          <>
            <Alert tone="info">{t('accountNeeded')}</Alert>
            <PayoutAccountForm account={null} />
          </>
        ) : (
          <>
            <p className="text-[15px]">{t('toAccount', { bank: account.bank_name, account: maskAccount(account.account_last4) })} · {account.holder_name}</p>
            <ActionForm action={requestPayout}>
              <PayoutPicker items={readyItems} bank={account.bank_name} holidays={(holidays ?? []).map((h) => h.day as string)} />
            </ActionForm>
          </>
        )}
      </Card>

      {account && (
        <Card className="space-y-3">
          <CardTitle>{t('accountTitle')}</CardTitle>
          <p className="text-[15px]">{account.bank_name} {maskAccount(account.account_last4)} · {account.holder_name}</p>
          <details>
            <summary className="min-h-11 cursor-pointer py-2 font-bold text-nila-800">{t('changeAccount')}</summary>
            <PayoutAccountForm account={account} />
          </details>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t('historyTitle')}</h2>
        {!requests.length && <p className="text-[15px] text-teks-redup">{t('historyEmpty')}</p>}
        {requests.map((r) => (
          <Card key={r.id} className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-extrabold tabular">{formatRupiah(r.net)}</p>
              <Badge tone={payoutTone[r.status]}>{tp(r.status)}</Badge>
            </div>
            <p className="text-[13px] text-teks-redup">
              {t('toAccount', { bank: r.bank_name, account: maskAccount(r.account_last4) })}
              {jobsByRequest.get(r.id) ? ` · ${t('jobsCount', { count: jobsByRequest.get(r.id)! })}` : ''}
            </p>
            <p className="text-[13px] text-teks-redup">{t('requestedOn', { date: formatDate(r.requested_at, locale) })}</p>
            {r.status === 'transferred' && r.transferred_on && <p className="text-[15px] text-sukses">{t('transferredOn', { date: formatDate(r.transferred_on, locale) })}</p>}
            {(r.status === 'requested' || r.status === 'processing') && <p className="text-[15px]">{t('dueBy', { date: formatDate(r.due_date, locale, true) })}</p>}
            {r.status === 'failed' && <p className="text-[15px] text-bahaya">{t('failedReason', { reason: r.failure_reason ?? '' })}</p>}
            {r.transfer_fee > 0 && <p className="text-[13px] text-teks-redup">{t('totalFee')} {formatRupiah(r.gross)} · {t('transferFee')} {formatRupiah(r.transfer_fee)}</p>}
          </Card>
        ))}
      </section>
    </div>
  );
}
