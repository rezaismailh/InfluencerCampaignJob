import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ActionForm } from '@/components/action-form';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { SubmitButton } from '@/components/ui/submit-button';
import { payoutTone } from '@/components/status';
import { setPayoutStatus } from '@/app/admin/actions';
import { requireStaff } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { formatDate, formatDateTime, todayWib } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/cn';
import type { PayoutRequest, PayoutStatus } from '@/lib/types';

type Row = PayoutRequest & { profiles: { full_name: string | null; email: string | null; phone_enc: string | null } };
type Event = { payout_request_id: string; from_status: PayoutStatus | null; to_status: PayoutStatus; note: string | null; created_at: string };

export default async function PayoutQueue({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await requireStaff('finance');
  const t = await getTranslations('admin');
  const tp = await getTranslations('payout');
  const tb = await getTranslations('balance');
  const c = await getTranslations('common');
  const locale = await getLocale();
  const { tab } = await searchParams;
  const done = tab === 'selesai';

  let query = viewer.supabase.from('payout_requests').select('*, profiles!payout_requests_creator_id_fkey(full_name, email, phone_enc)');
  query = done
    ? query.in('status', ['transferred', 'failed']).order('requested_at', { ascending: false }).limit(100)
    : query.in('status', ['requested', 'processing']).order('due_date').order('requested_at');
  const { data } = await query.returns<Row[]>();
  const rows = data ?? [];
  const { data: events } = rows.length
    ? await viewer.supabase.from('payout_events').select('*').in('payout_request_id', rows.map((r) => r.id)).order('created_at').returns<Event[]>()
    : { data: [] as Event[] };
  const today = todayWib();

  const tabLink = (href: string, label: string, on: boolean) => (
    <Link href={href} className={cn('inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-medium', on ? 'border-nila-800 bg-nila-800 text-gading' : 'border-garis bg-kertas')}>{label}</Link>
  );

  return (
    <div>
      <PageHeader title={t('payoutQueue')} />
      <div className="mb-4 flex gap-2">
        {tabLink('/admin/pencairan', t('pendingPayouts'), !done)}
        {tabLink('/admin/pencairan?tab=selesai', t('payoutDone'), done)}
      </div>
      {!rows.length && <EmptyState title={t('payoutEmpty')} />}
      <div className="space-y-3">
        {rows.map((r) => {
          const overdue = !done && r.due_date < today;
          return (
            <Card key={r.id} className={cn('space-y-3', overdue && 'border-bahaya')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{r.profiles.full_name ?? r.profiles.email}</p>
                  <p className="text-[13px] text-teks-redup">{decrypt(r.profiles.phone_enc) ?? r.profiles.email} · {formatDateTime(r.requested_at, locale)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {!done && <Badge tone={overdue ? 'danger' : 'warning'}>{t('due', { date: formatDate(r.due_date, locale) })}</Badge>}
                  <Badge tone={payoutTone[r.status]}>{tp(r.status)}</Badge>
                </div>
              </div>

              <div className="grid gap-3 rounded-xl bg-latar p-3 sm:grid-cols-2">
                <div>
                  <p className="text-[13px] text-teks-redup">{tb('net')}</p>
                  <p className="text-2xl font-extrabold tabular">{formatRupiah(r.net)}</p>
                  <p className="text-[13px] text-teks-redup">{tb('totalFee')} {formatRupiah(r.gross)} · {tb('transferFee')} {formatRupiah(r.transfer_fee)}</p>
                </div>
                <div>
                  <p className="text-[13px] text-teks-redup">{t('accountFull')}</p>
                  <p className="font-bold">{r.bank_name}</p>
                  <p className="text-lg font-bold tabular tracking-wide">{decrypt(r.account_number_enc) ?? c('none')}</p>
                  <p className="text-[15px]">{r.holder_name}</p>
                </div>
              </div>

              {r.status === 'transferred' && r.transferred_on && <p className="text-[15px] text-sukses">{tb('transferredOn', { date: formatDate(r.transferred_on, locale) })}{r.reference_note ? ` · ${r.reference_note}` : ''}</p>}
              {r.status === 'failed' && r.failure_reason && <p className="text-[15px] text-bahaya">{r.failure_reason}</p>}

              {r.status === 'requested' && (
                <ActionForm action={setPayoutStatus}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="processing" />
                  <SubmitButton variant="outline">{t('markProcessing')}</SubmitButton>
                </ActionForm>
              )}
              {r.status === 'processing' && (
                <ActionForm action={setPayoutStatus} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="transferred" />
                  <Field label={t('transferDate')} htmlFor={`d-${r.id}`}><Input id={`d-${r.id}`} name="transferred_on" type="date" defaultValue={today} max={today} required /></Field>
                  <Field label={t('referenceNote')} htmlFor={`n-${r.id}`}><Input id={`n-${r.id}`} name="note" /></Field>
                  <SubmitButton>{t('markTransferred')}</SubmitButton>
                </ActionForm>
              )}
              {(r.status === 'requested' || r.status === 'processing') && (
                <details>
                  <summary className="min-h-11 cursor-pointer py-2 font-bold text-bahaya">{t('markFailed')}</summary>
                  <ActionForm action={setPayoutStatus}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value="failed" />
                    <Field label={t('failReason')} htmlFor={`f-${r.id}`}><Input id={`f-${r.id}`} name="note" required /></Field>
                    <SubmitButton variant="danger">{t('markFailed')}</SubmitButton>
                  </ActionForm>
                </details>
              )}
              {r.status === 'transferred' && (
                <details>
                  <summary className="min-h-11 cursor-pointer py-2 font-bold text-teks-redup">{t('undoTransfer')}</summary>
                  <ActionForm action={setPayoutStatus}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value="processing" />
                    <Field label={t('undoReason')} htmlFor={`u-${r.id}`}><Input id={`u-${r.id}`} name="note" required /></Field>
                    <SubmitButton variant="outline">{t('undoTransfer')}</SubmitButton>
                  </ActionForm>
                </details>
              )}

              <details>
                <summary className="min-h-11 cursor-pointer py-2 text-[15px] font-bold text-nila-800">{t('events')}</summary>
                <ul className="space-y-1 text-[13px] text-teks-redup">
                  {(events ?? []).filter((e) => e.payout_request_id === r.id).map((e, i) => (
                    <li key={i}>{formatDateTime(e.created_at, locale)} · {e.from_status ? `${tp(e.from_status)} → ` : ''}{tp(e.to_status)}{e.note ? ` · ${e.note}` : ''}</li>
                  ))}
                </ul>
              </details>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
