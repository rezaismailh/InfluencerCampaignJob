'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { addBusinessDays, formatDate, todayWib } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { MIN_PAYOUT, payoutBreakdown } from '@/lib/payout';

type Item = { id: string; title: string; brand: string; fee: number };

export function PayoutPicker({ items, bank, holidays }: { items: Item[]; bank: string; holidays: string[] }) {
  const t = useTranslations('balance');
  const locale = useLocale();
  const [selected, setSelected] = useState<string[]>(items.map((i) => i.id));
  const gross = items.filter((i) => selected.includes(i.id)).reduce((sum, i) => sum + i.fee, 0);
  const b = payoutBreakdown(gross, bank);
  const due = addBusinessDays(todayWib(), 3, holidays);

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-[15px] font-bold">{t('selectJobs')}</legend>
        {items.map((i) => (
          <label key={i.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-garis p-3 has-[:checked]:border-nila-800">
            <input type="checkbox" name="participation_ids" value={i.id} className="size-5 accent-nila-800"
              checked={selected.includes(i.id)}
              onChange={(e) => setSelected((s) => (e.target.checked ? [...s, i.id] : s.filter((x) => x !== i.id)))} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-teks-redup">{i.brand}</span>
              <span className="block font-medium">{i.title}</span>
            </span>
            <span className="font-bold tabular">{formatRupiah(i.fee)}</span>
          </label>
        ))}
      </fieldset>

      <dl className="space-y-1 rounded-xl bg-latar p-3 text-[15px]">
        <div className="flex justify-between"><dt>{t('totalFee')}</dt><dd className="tabular">{formatRupiah(b.gross)}</dd></div>
        <div className="flex justify-between"><dt>{t('transferFee')}</dt><dd className="tabular">{b.fee ? `−${formatRupiah(b.fee)}` : formatRupiah(0)}</dd></div>
        <div className="flex justify-between border-t border-garis pt-1 font-extrabold"><dt>{t('net')}</dt><dd className="tabular">{formatRupiah(Math.max(0, b.net))}</dd></div>
      </dl>
      <p className="text-[13px] text-teks-redup">{t('freeTransfer')}</p>

      {!b.meetsMinimum && selected.length > 0 && (
        <Alert tone="warning">{t('belowMinimum', { amount: formatRupiah(MIN_PAYOUT), total: formatRupiah(gross) })}</Alert>
      )}
      {b.meetsMinimum && <p className="text-[15px]">{t('dueNote', { date: formatDate(due, locale, true) })}</p>}
      <SubmitButton className="w-full" disabled={!b.meetsMinimum || selected.length === 0}>{t('submit')}</SubmitButton>
    </div>
  );
}
