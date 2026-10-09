'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/action-form';
import { RupiahInput } from '@/components/ui/rupiah-input';

/**
 * "Willing to visit" tick for jobs with a visit. Visit-only jobs require it; jobs with both
 * modes leave it optional and, for open fees, ask a visit rate once it is ticked.
 */
export function VisitChoice({ visitOnly, askRate, capHint }: { visitOnly: boolean; askRate: boolean; capHint?: string }) {
  const t = useTranslations('jobs');
  const [willing, setWilling] = useState(false);
  return (
    <div className="space-y-2">
      <input type="hidden" name="visit_shown" value="1" />
      <label id="field-visit" className="flex min-h-11 items-start gap-3 text-[15px]">
        <input type="checkbox" name="visit" required={visitOnly} checked={willing} onChange={(e) => setWilling(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-nila-800" />
        <span>{visitOnly ? t('visitConsent') : t('visitWilling')}</span>
      </label>
      <FieldError name="visit" />
      {askRate && willing && (
        <div className="space-y-1">
          <label htmlFor="rate_visit" className="block text-[15px] font-bold">{t('rateVisit')}</label>
          <RupiahInput id="rate_visit" name="rate_visit" placeholder="400.000" required />
          <FieldError name="rate_visit" />
          {capHint && <p className="text-[13px] text-teks-redup">{capHint}</p>}
        </div>
      )}
    </div>
  );
}
