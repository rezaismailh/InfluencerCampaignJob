import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { reviewTone } from '@/components/status';
import { formatDateTime } from '@/lib/dates';
import { revisionNumeral } from '@/lib/work';
import type { Submission } from '@/lib/types';

/** Every version with its review and feedback, newest first. Shared by creator and curator views. */
export async function SubmissionHistory({ items, photoUrls = {} }: { items: Submission[]; photoUrls?: Record<string, string> }) {
  const t = await getTranslations('review');
  const tw = await getTranslations('work');
  const c = await getTranslations('common');
  const locale = await getLocale();
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => b.version - a.version);
  return (
    <ul className="space-y-3">
      {sorted.map((s) => {
        const numeral = revisionNumeral(s.version);
        return (
          <li key={s.id} className="rounded-xl border border-garis p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{numeral ? t('revisionN', { n: numeral }) : t('firstVersion')}</p>
              <Badge tone={reviewTone[s.status]}>{t(s.status)}</Badge>
            </div>
            <p className="text-[13px] text-teks-redup">{tw('submittedAt', { date: formatDateTime(s.submitted_at, locale) })}</p>
            {s.content && (s.kind === 'caption'
              ? <p className="mt-2 whitespace-pre-line text-[15px]">{s.content}</p>
              : <a href={s.content} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-[15px] font-bold text-nila-800 underline underline-offset-4">{c('openLink')}</a>)}
            {s.photo_paths.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {s.photo_paths.map((p) => photoUrls[p] && (
                  <a key={p} href={photoUrls[p]} target="_blank" rel="noreferrer" className="block size-20 overflow-hidden rounded-lg border border-garis">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrls[p]} alt="" className="size-full object-cover" />
                  </a>
                ))}
              </div>
            )}
            {s.tali_feedback && (
              <div className="mt-2 rounded-lg bg-latar p-2 text-[15px]">
                <p className="text-[13px] font-bold text-teks-redup">{t('taliFeedback')}</p>
                <p className="whitespace-pre-line">{s.tali_feedback}</p>
              </div>
            )}
            {s.brand_feedback && (
              <div className="mt-2 rounded-lg bg-latar p-2 text-[15px]">
                <p className="text-[13px] font-bold text-teks-redup">{t('brandFeedback')}</p>
                <p className="whitespace-pre-line">{s.brand_feedback}</p>
              </div>
            )}
            {s.approved_at && <p className="mt-2 text-[13px] text-sukses">{tw('approvedAt', { date: formatDateTime(s.approved_at, locale) })}</p>}
          </li>
        );
      })}
    </ul>
  );
}
