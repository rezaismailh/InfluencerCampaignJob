import { getLocale, getTranslations } from 'next-intl/server';
import { Check } from 'lucide-react';
import { formatDate } from '@/lib/dates';
import type { Step } from '@/lib/work';

export async function Timeline({ steps }: { steps: Step[] }) {
  const t = await getTranslations('work');
  const locale = await getLocale();
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && <span className={`absolute left-[11px] top-6 h-[calc(100%-16px)] w-0.5 ${s.done ? 'bg-sukses' : 'bg-garis'}`} aria-hidden />}
          <span className={`relative flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${s.done ? 'border-sukses bg-sukses text-kertas' : 'border-garis bg-kertas'}`}>
            {s.done && <Check className="size-4" strokeWidth={3} aria-hidden />}
          </span>
          <div className="min-w-0 -mt-0.5">
            <p className={s.done ? 'font-bold' : 'text-teks-redup'}>{t(s.key)}</p>
            {s.done && s.date && <p className="text-[13px] text-teks-redup">{formatDate(s.date, locale)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
