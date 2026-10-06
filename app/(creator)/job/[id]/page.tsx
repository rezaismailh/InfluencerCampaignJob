import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { MapPin } from 'lucide-react';
import { ActionForm, FieldError } from '@/components/action-form';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { SubmitButton } from '@/components/ui/submit-button';
import { feeLabel } from '@/components/creator/job-card';
import { applyToJob, respondInvite } from '@/app/(creator)/actions';
import { requireCreator } from '@/lib/auth';
import { formatDate } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import type { Job, Participation, SocialAccount } from '@/lib/types';

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireCreator();
  const t = await getTranslations('jobs');
  const tp = await getTranslations('platform');
  const tt = await getTranslations('jobType');
  const tpo = await getTranslations('productOption');
  const tps = await getTranslations('participationStatus');
  const tn = await getTranslations('nav');
  const ttier = await getTranslations('tier');
  const tper = await getTranslations('persona');
  const locale = await getLocale();

  const { data: job } = await viewer.supabase.from('jobs').select('*').eq('id', id).maybeSingle<Job>();
  if (!job) notFound();
  const [{ data: part }, { data: accounts }] = await Promise.all([
    viewer.supabase.from('participations').select('*').eq('job_id', id).eq('creator_id', viewer.id).maybeSingle<Participation>(),
    viewer.supabase.from('social_accounts').select('*').eq('creator_id', viewer.id).eq('status', 'verified').returns<SocialAccount[]>(),
  ]);
  const eligible = (accounts ?? []).some((a) => job.platforms.includes(a.platform));

  return (
    <div className="space-y-5">
      <PageHeader back={{ href: '/job', label: tn('jobs') }} title={job.title} subtitle={job.brand_name} />

      <Card className="space-y-3">
        <p className="text-[13px] font-medium text-teks-redup">{t('fee')}</p>
        <p className="text-[32px] font-extrabold leading-10 tabular">{await feeLabel(job)}</p>
        {job.platforms.length > 1 && <p className="text-[13px] text-teks-redup">{t('feeCombined')}</p>}
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="info">{tt(job.job_type)}</Badge>
          {job.platforms.map((p) => <Badge key={p}>{tp(p)}</Badge>)}
        </div>
        <div className="rounded-xl bg-latar p-3 text-[15px]">
          <p className="font-bold">{t('payment')}</p>
          <p className="text-teks-redup">{t('paymentBody', { days: job.top_days })}</p>
        </div>
        <ul className="space-y-0.5 text-[15px] text-teks-redup">
          {job.content_deadline && <li>{t('contentDeadline', { date: formatDate(job.content_deadline, locale) })}</li>}
          {job.apply_deadline && <li>{t('applyDeadline', { date: formatDate(job.apply_deadline, locale) })}</li>}
          <li>{t('quota', { count: job.quota })}</li>
          {job.review_days && <li>{t('reviewDays', { days: job.review_days })}</li>}
        </ul>
      </Card>

      <JoinBlock job={job} part={part} eligible={eligible} />

      <Card className="space-y-4">
        <InfoRow title={t('deliverables')} body={job.deliverables} />
        <InfoRow title={t('brief')} body={job.brief} />
        {(job.requirements || job.min_followers > 0 || job.tiers.length > 0 || job.personas.length > 0) && (
          <div>
            <h2 className="font-bold">{t('requirements')}</h2>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[15px]">
              {job.min_followers > 0 && <li>{t('minFollowers', { count: job.min_followers.toLocaleString('id-ID') })}</li>}
              {job.tiers.length > 0 && <li>{t('tiers')}: {job.tiers.map((x) => (ttier.has(x) ? ttier(x) : x)).join(', ')}</li>}
              {job.personas.length > 0 && <li>{t('personas')}: {job.personas.map((x) => (tper.has(x) ? tper(x) : x)).join(', ')}</li>}
            </ul>
            {job.requirements && <p className="mt-2 whitespace-pre-line text-[15px]">{job.requirements}</p>}
          </div>
        )}
        <InfoRow title={t('product')} body={[job.product, tpo(job.product_option)].filter(Boolean).join(' · ')} />
        {job.require_purchase_proof && <p className="text-[15px]">{t('purchaseProof')}</p>}
        {job.job_type === 'visit' && job.visit_locations.length > 0 && (
          <div>
            <h2 className="font-bold">{t('visitLocations')}</h2>
            <ul className="mt-1 space-y-2">
              {job.visit_locations.map((loc, i) => (
                <li key={i} className="flex gap-2 text-[15px]">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-nila-800" aria-hidden />
                  <div>
                    <p className="font-medium">{loc.name}</p>
                    {loc.address && <p className="text-teks-redup">{loc.address}</p>}
                    {loc.maps_url && <a href={loc.maps_url} target="_blank" rel="noreferrer" className="font-bold text-nila-800 underline underline-offset-4">{t('maps')}</a>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );

  async function JoinBlock({ job, part, eligible }: { job: Job; part: Participation | null; eligible: boolean }) {
    if (part) {
      if (part.status === 'invited') {
        return (
          <Card className="space-y-3">
            <p className="font-bold">{t('inviteFee', { amount: formatRupiah(part.agreed_fee ?? 0) })}</p>
            <div className="flex gap-2">
              <form action={respondInvite} className="flex-1">
                <input type="hidden" name="id" value={part.id} />
                <input type="hidden" name="accept" value="1" />
                <Button className="w-full">{t('acceptInvite')}</Button>
              </form>
              <form action={respondInvite}>
                <input type="hidden" name="id" value={part.id} />
                <input type="hidden" name="accept" value="0" />
                <Button variant="outline">{t('declineInvite')}</Button>
              </form>
            </div>
          </Card>
        );
      }
      return (
        <Card className="space-y-3">
          <p className="font-bold">{t('yourStatus', { status: tps(part.status) })}</p>
          {part.status === 'applied' && <p className="text-[15px] text-teks-redup">{t('applied')}</p>}
          {part.status === 'approved' && <ButtonLink href={`/partisipasi/${part.id}`} className="w-full">{t('openParticipation')}</ButtonLink>}
        </Card>
      );
    }
    if (job.status !== 'open') return null;
    if (!eligible) {
      return <Alert tone="warning">{t('needVerified', { platforms: job.platforms.map((p) => tp(p)).join(' / ') })}</Alert>;
    }
    return (
      <ActionForm action={applyToJob} className="space-y-4 rounded-2xl border border-garis bg-kertas p-4">
        <input type="hidden" name="job_id" value={job.id} />
        {job.fee_type === 'open' && (
          <Field label={t('rate')} hint={job.rate_cap ? `${t('rateHint')} ${t('rateCapHint', { amount: formatRupiah(job.rate_cap) })}` : t('rateHint')} htmlFor="rate">
            <Input id="rate" name="rate" inputMode="numeric" placeholder="250000" required className="tabular" />
            <FieldError name="rate" />
          </Field>
        )}
        <SubmitButton pendingLabel={t('joining')} className="w-full">{t('join')}</SubmitButton>
      </ActionForm>
    );
  }
}

function InfoRow({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <div>
      <h2 className="font-bold">{title}</h2>
      <p className="mt-1 whitespace-pre-line text-[15px]">{body}</p>
    </div>
  );
}
