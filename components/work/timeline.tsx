import { getLocale, getTranslations } from 'next-intl/server';
import { Check, Lock } from 'lucide-react';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { currentStep, type Step } from '@/lib/work';

/** Vertical stepper: done steps checked, the current one highlighted, later ones locked. */
export async function Timeline({ steps }: { steps: Step[] }) {
  const t = await getTranslations('work');
  const locale = await getLocale();
  const current = currentStep(steps);
  return (
    <ol>
      {steps.map((s, i) => {
        const isCurrent = i === current;
        // Draft and caption run side by side, so a revision can sit on a step after the current one.
        const attention = !s.done && !!s.attention;
        return (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && <span className={cn('absolute left-[13px] top-7 h-[calc(100%-24px)] w-0.5', s.done ? 'bg-sukses' : 'bg-garis')} aria-hidden />}
            <span className={cn('relative flex size-7 shrink-0 items-center justify-center rounded-full',
              s.done ? 'bg-sukses text-kertas' : attention ? 'bg-bahaya text-kertas' : isCurrent ? 'border-2 border-nila-800 bg-nila-50' : 'bg-latar text-teks-redup')}>
              {s.done ? <Check className="size-4" strokeWidth={3} aria-hidden />
                : attention ? <span className="text-[15px] font-extrabold leading-none" aria-hidden>!</span>
                : isCurrent ? <span className="size-2.5 rounded-full bg-nila-800" aria-hidden />
                : <Lock className="size-3.5" strokeWidth={2} aria-hidden />}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn(s.done ? 'font-bold' : attention ? 'font-bold text-bahaya' : isCurrent ? 'font-bold text-nila-800' : 'text-teks-redup')}>
                {t(s.key)}
                {isCurrent && <span className="sr-only"> ({t('nowStep')})</span>}
              </p>
              {s.done && s.date && <p className="text-[13px] text-teks-redup">{formatDate(s.date, locale)}</p>}
              {attention ? <p className="text-[13px] font-medium text-bahaya">{t(s.key === 'stepPaid' ? 'payoutFailedStep' : 'needsRevision')}</p>
                : isCurrent && <p className="text-[13px] font-medium text-nila-800">{t('nowStep')}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
