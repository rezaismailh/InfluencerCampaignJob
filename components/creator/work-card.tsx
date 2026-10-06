import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { participationTone } from '@/components/status';
import { formatRupiah } from '@/lib/money';
import type { PartWithJob } from '@/lib/creator-data';
import type { Step } from '@/lib/work';

export async function WorkCard({ part, steps }: { part: PartWithJob; steps: Step[] }) {
  const t = await getTranslations('work');
  const tps = await getTranslations('participationStatus');
  const next = steps.find((s) => !s.done && !s.optional);
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <Link href={`/partisipasi/${part.id}`} className="block rounded-2xl border border-garis bg-kertas p-4 hover:border-nila-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-teks-redup">{part.jobs.brand_name}</p>
          <p className="font-bold">{part.jobs.title}</p>
        </div>
        <ChevronRight className="mt-1 size-5 shrink-0 text-teks-redup" aria-hidden />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={participationTone[part.status]}>{tps(part.status)}</Badge>
        {part.agreed_fee && <span className="text-[15px] font-bold tabular">{formatRupiah(part.agreed_fee)}</span>}
      </div>
      {part.status === 'approved' && (
        <>
          <div className="mt-3 flex gap-1" aria-hidden>
            {steps.map((s) => <span key={s.key} className={`h-1.5 flex-1 rounded-full ${s.done ? 'bg-sukses' : 'bg-garis'}`} />)}
          </div>
          <p className="mt-2 text-[13px] text-teks-redup">{doneCount}/{steps.length} · {next ? t(next.key) : t('stepPaid')}</p>
        </>
      )}
    </Link>
  );
}
