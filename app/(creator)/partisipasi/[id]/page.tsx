import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChartColumn, ChevronDown, ChevronLeft, CircleCheck, Clapperboard, FileText, Info, Lock, Send, TrendingUp, Type } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { ActionForm, FieldError } from '@/components/action-form';
import { PhotoUpload } from '@/components/photo-upload';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { BrandAvatar } from '@/components/brand-avatar';
import { cn } from '@/lib/cn';
import { Field, Input, Textarea } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { participationTone, payoutTone, reviewTone } from '@/components/status';
import { SubmissionHistory } from '@/components/work/submission-history';
import { Timeline } from '@/components/work/timeline';
import { markReceived, respondInvite, setPurchaseProof, setShippingAddress, submitItem, submitPost } from '@/app/(creator)/actions';
import { requireCreator } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { formatDate, formatDateTime, todayWib } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { signedUrls } from '@/lib/storage';
import { currentStep, latestByKind, revisionCount, timeline } from '@/lib/work';
import type { Job, Participation, PayoutRequest, Submission, SubmissionKind } from '@/lib/types';
import { visibleBrand, visibleLogo, type BrandEmbed } from '@/lib/brand';

export default async function Work({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireCreator();
  const t = await getTranslations('work');
  const tn = await getTranslations('nav');
  const tps = await getTranslations('participationStatus');
  const tj = await getTranslations('jobs');
  const tk = await getTranslations('kind');
  const locale = await getLocale();

  const { data: part } = await viewer.supabase
    .from('participations').select('*, jobs(*, job_brands(real_name, logo))').eq('id', id).eq('creator_id', viewer.id)
    .maybeSingle<Participation & { jobs: Job & { job_brands: BrandEmbed } }>();
  if (!part) notFound();
  const job = part.jobs;

  const [{ data: subs }, { data: payout }] = await Promise.all([
    viewer.supabase.from('submissions').select('*').eq('participation_id', id).order('version').returns<Submission[]>(),
    part.payout_request_id
      ? viewer.supabase.from('payout_requests').select('*').eq('id', part.payout_request_id).maybeSingle<PayoutRequest>()
      : Promise.resolve({ data: null }),
  ]);
  const submissions = subs ?? [];
  const latest = latestByKind(submissions);
  const photos = await signedUrls(viewer, [...submissions.flatMap((s) => s.photo_paths), part.purchase_proof_path ?? '']);
  const steps = timeline(part, job, latest, payout);
  const storylineApproved = latest.storyline?.status === 'approved';
  const contentApproved = latest.draft?.status === 'approved' && latest.caption?.status === 'approved';
  const active = part.status === 'approved';

  // Each task is open (work on it now), done, or waiting on an earlier step.
  type TaskKind = SubmissionKind | 'posting';
  const stateOf = (kind: TaskKind): 'open' | 'done' | 'locked' => {
    if (kind === 'posting') return part.post_confirmed_at ? 'done' : contentApproved ? 'open' : 'locked';
    if (kind === 'insight') return latest.insight?.status === 'approved' ? 'done' : part.post_confirmed_at ? 'open' : 'locked';
    if (latest[kind]?.status === 'approved') return 'done';
    return kind === 'storyline' || storylineApproved ? 'open' : 'locked';
  };
  const tasks: TaskKind[] = ['storyline', 'draft', 'caption', 'posting', ...(job.require_insight ? ['insight' as const] : [])];
  const current = currentStep(steps);
  const lockReason: Record<TaskKind, string> = {
    storyline: '', draft: t('lockedUntilStoryline'), caption: t('lockedUntilStoryline'),
    posting: t('postingLocked'), insight: t('insightLocked'),
  };

  return (
    <div className="space-y-4">
      <Link href="/beranda" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-[15px] font-bold text-nila-800">
        <ChevronLeft className="size-5" strokeWidth={2} aria-hidden /> {tn('home')}
      </Link>

      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <BrandAvatar logo={visibleLogo(job)} icon={job.brand_icon} size={44} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold uppercase tracking-wide text-nila-800">{visibleBrand(job)}</p>
            <h1 className="text-xl font-bold leading-7">{job.title}</h1>
          </div>
          <Badge tone={participationTone[part.status]} className="shrink-0">{tps(part.status)}</Badge>
        </div>
        <div className="rounded-xl bg-nila-50 p-3">
          <p className="text-[13px] text-teks-redup">{t('agreedFee')}</p>
          <p className="text-[28px] font-extrabold leading-9 text-nila-800 tabular">{part.agreed_fee ? formatRupiah(part.agreed_fee) : tj('openRate')}</p>
        </div>
      </Card>

      {part.status === 'invited' && (
        <Card className="space-y-3">
          <p className="font-bold">{tj('inviteFee', { amount: formatRupiah(part.agreed_fee ?? 0) })}</p>
          <div className="flex gap-2">
            <form action={respondInvite} className="flex-1">
              <input type="hidden" name="id" value={part.id} /><input type="hidden" name="accept" value="1" />
              <Button className="w-full">{tj('acceptInvite')}</Button>
            </form>
            <form action={respondInvite}>
              <input type="hidden" name="id" value={part.id} /><input type="hidden" name="accept" value="0" />
              <Button variant="outline">{tj('declineInvite')}</Button>
            </form>
          </div>
        </Card>
      )}
      {part.status === 'applied' && <Alert tone="info">{tj('applied')}</Alert>}
      {part.status === 'rejected' && <Alert tone="info">{t('rejected')}</Alert>}
      {part.status === 'cancelled' && <Alert tone="warning">{t('cancelled')}</Alert>}

      {active && (
        <>
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <TrendingUp className="size-5 text-nila-800" strokeWidth={2} aria-hidden /> {t('progressTitle')}
              </h2>
              <Badge tone="info" className="shrink-0 whitespace-nowrap">{t('stepOf', { n: current === -1 ? steps.length : current + 1, total: steps.length })}</Badge>
            </div>
            <Timeline steps={steps} />
          </Card>

          <Prep />

          {tasks.filter((k) => stateOf(k) === 'open' || (k === 'posting' && stateOf(k) === 'done')).map((k) =>
            k === 'posting' ? <Posting key={k} /> : <SubmissionCard key={k} kind={k} />)}

          {tasks.some((k) => stateOf(k) === 'locked') && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 px-1 text-[13px] font-bold uppercase tracking-wide text-teks-redup">
                <Lock className="size-4" aria-hidden /> {t('nextSteps')}
              </h2>
              {tasks.filter((k) => stateOf(k) === 'locked').map((k) => (
                <div key={k} className="flex items-center gap-3 rounded-2xl border border-dashed border-garis bg-kertas/60 p-3">
                  <TaskIcon kind={k} muted />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-teks-redup">{k === 'posting' ? t('postingTitle') : tk(k)}</p>
                    <p className="text-[13px] text-teks-redup">{lockReason[k]}</p>
                  </div>
                  <Lock className="size-4 shrink-0 text-teks-redup" aria-hidden />
                </div>
              ))}
            </section>
          )}

          {tasks.some((k) => k !== 'posting' && stateOf(k) === 'done') && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 px-1 text-[13px] font-bold uppercase tracking-wide text-teks-redup">
                <CircleCheck className="size-4" aria-hidden /> {t('doneSteps')}
              </h2>
              {tasks.filter((k): k is SubmissionKind => k !== 'posting' && stateOf(k) === 'done').map((k) => <DoneCard key={k} kind={k} />)}
            </section>
          )}
        </>
      )}
    </div>
  );

  async function Posting() {
    return (
      <Card className="space-y-3">
        <TaskHeader kind="posting" title={t('postingTitle')} />
        {part!.post_confirmed_at ? (
          <>
            <Alert tone="success">{t('postConfirmed', { date: formatDate(part!.post_confirmed_at, locale) })}</Alert>
            {job.require_insight && !part!.ready_at && <p className="text-[15px]">{t('insightNeeded')}</p>}
            {part!.ready_at && (part!.ready_at <= todayWib()
              ? <p className="text-[15px]">{t('readyNow')}</p>
              : <p className="text-[15px]">{t('readyOn', { date: formatDate(part!.ready_at, locale) })}</p>)}
            {payout ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-latar p-3">
                <span className="font-bold tabular">{formatRupiah(payout.net)}</span>
                <PayoutBadge status={payout.status} />
              </div>
            ) : (
              <ButtonLink href="/saldo" variant="outline" className="w-full">{t('goToBalance')}</ButtonLink>
            )}
          </>
        ) : (
          <>
            {part!.post_url && (
              <Alert tone={part!.post_url_matches === false ? 'warning' : 'info'}>
                {part!.post_url_matches === false ? t('postMismatch') : t('postSubmitted')}
              </Alert>
            )}
            <ActionForm action={submitPost}>
              <input type="hidden" name="participation_id" value={part!.id} />
              <Field label={t('postUrl')} htmlFor="post_url">
                <Input id="post_url" name="post_url" type="url" inputMode="url" defaultValue={part!.post_url ?? ''} required />
              </Field>
              <Field label={t('postedOn')} htmlFor="posted_on">
                <Input id="posted_on" name="posted_on" type="date" max={todayWib()} defaultValue={part!.posted_on ?? todayWib()} required />
              </Field>
              <SubmitButton className="w-full"><Send className="size-5" aria-hidden /> {t('submitPost')}</SubmitButton>
            </ActionForm>
          </>
        )}
      </Card>
    );
  }

  async function DoneCard({ kind }: { kind: SubmissionKind }) {
    const items = submissions.filter((s) => s.kind === kind);
    const last = latest[kind];
    return (
      <details className="group rounded-2xl border border-garis bg-kertas">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 [&::-webkit-details-marker]:hidden">
          <TaskIcon kind={kind} />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{tk(kind)}</p>
            <p className="text-[13px] text-teks-redup">
              {last?.approved_at && t('approvedAt', { date: formatDate(last.approved_at, locale) })}
              {items.length > 1 && ` · ${t('revisions', { count: revisionCount(submissions, kind) })}`}
            </p>
          </div>
          <ChevronDown className="size-5 shrink-0 text-teks-redup transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="border-t border-garis p-3"><SubmissionHistory items={items} photoUrls={photos} /></div>
      </details>
    );
  }

  async function PayoutBadge({ status }: { status: PayoutRequest['status'] }) {
    const tp = await getTranslations('payout');
    return <Badge tone={payoutTone[status]}>{tp(status)}</Badge>;
  }

  async function Prep() {
    const hasShipment = job.job_type === 'non_visit' && job.product_option === 'shipped';
    if (job.job_type === 'non_visit' && job.product_option === 'self_purchase') {
      return <Alert tone="info">{t('selfPurchase')}</Alert>;
    }
    if (!hasShipment && job.job_type !== 'visit') return null;
    const ts = await getTranslations('shipment');
    return (
      <Card className="space-y-3">
        <CardTitle>{t('prepTitle')}</CardTitle>
        {hasShipment && (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[15px]">{t('shipmentStatus')}</span>
              <Badge tone={part!.shipment_status === 'received' ? 'success' : part!.shipment_status === 'shipped' ? 'info' : 'warning'}>
                {ts(part!.shipment_status ?? 'pending')}
              </Badge>
            </div>
            {part!.courier && <p className="text-[15px]">{t('courier')}: {part!.courier} · {t('tracking')}: <span className="tabular">{part!.tracking_number}</span></p>}
            {(part!.shipment_status ?? 'pending') === 'pending' && (
              <ActionForm action={setShippingAddress}>
                <input type="hidden" name="participation_id" value={part!.id} />
                <Field label={t('shippingAddress')} hint={t('shippingAddressHint')} htmlFor="address">
                  <Textarea id="address" name="address" defaultValue={decrypt(part!.shipping_address_enc) ?? decrypt(viewer.profile.address_enc) ?? ''} required />
                  <FieldError name="address" />
                </Field>
                <SubmitButton variant="outline" className="w-full">{t('saveAddress')}</SubmitButton>
              </ActionForm>
            )}
            {part!.shipment_status === 'shipped' && (
              <form action={markReceived}>
                <input type="hidden" name="participation_id" value={part!.id} />
                <Button variant="outline" className="w-full">{t('markReceived')}</Button>
              </form>
            )}
            <p className="text-[13px] text-teks-redup">{t('infoOnly')}</p>
          </>
        )}
        {job.job_type === 'visit' && (
          <>
            <div>
              <p className="text-[15px] font-bold">{t('visitSchedule')}</p>
              {part!.visit_at
                ? <p className="text-[15px]">{part!.visit_location} · {formatDateTime(part!.visit_at, locale)}</p>
                : <p className="text-[15px] text-teks-redup">{t('visitNotScheduled')}</p>}
            </div>
            {job.require_purchase_proof && (
              part!.purchase_proof_path ? (
                <p className="text-[15px] text-sukses">{t('proofUploaded')}</p>
              ) : (
                <ActionForm action={setPurchaseProof}>
                  <input type="hidden" name="participation_id" value={part!.id} />
                  <p className="text-[15px] font-bold">{t('purchaseProof')}</p>
                  <PhotoUpload userId={viewer.id} folder={`${part!.id}/proof`} max={1} label={t('uploadProof')} />
                  <SubmitButton variant="outline" className="w-full">{t('uploadProof')}</SubmitButton>
                </ActionForm>
              )
            )}
          </>
        )}
      </Card>
    );
  }

  async function SubmissionCard({ kind }: { kind: SubmissionKind }) {
    const tr = await getTranslations('review');
    const items = submissions.filter((s) => s.kind === kind);
    const last = latest[kind];
    const canSubmit = !last || last.status === 'revision';
    const hint = { storyline: t('storylineHint'), draft: t('draftHint'), caption: t('captionHint'), insight: t('insightHint') }[kind];
    const submitLabel = last?.status === 'revision' ? t('submitRevision')
      : { storyline: t('submitStoryline'), draft: t('submitDraft'), caption: t('submitCaption'), insight: t('submitInsight') }[kind];
    const feedback = last && (last.status === 'revision' || last.status === 'rejected') ? last : null;

    return (
      <Card className={cn('space-y-3', feedback && 'ring-2 ring-bahaya/30')}>
        <TaskHeader kind={kind} title={tk(kind)}
          badge={last && <Badge tone={reviewTone[last.status]} className="shrink-0">{tr(last.status)}</Badge>} />
        {last && (last.status === 'pending_review' || last.status === 'sent_to_brand') && (
          <p className="text-[15px] text-teks-redup">{t('waitingReview')}</p>
        )}
        {feedback?.tali_feedback && (
          <div className="rounded-xl bg-nila-50 p-3">
            <p className="text-[13px] font-bold uppercase tracking-wide text-nila-800">{tr('taliFeedback')}</p>
            <p className="mt-1 whitespace-pre-line text-[15px]">{feedback.tali_feedback}</p>
          </div>
        )}
        {feedback?.brand_feedback && (
          <div className="rounded-xl bg-bahaya/10 p-3">
            <p className="text-[13px] font-bold uppercase tracking-wide text-bahaya">{tr('brandFeedback')}</p>
            <p className="mt-1 whitespace-pre-line text-[15px]">{feedback.brand_feedback}</p>
          </div>
        )}
        {canSubmit && (
          <ActionForm action={submitItem} resetOnSuccess>
            <input type="hidden" name="participation_id" value={part!.id} />
            <input type="hidden" name="kind" value={kind} />
            {kind === 'insight' ? (
              <>
                <Field label={t('insightPhotos')} hint={t('insightPhotosHint')}>
                  <PhotoUpload userId={viewer.id} folder={`${part!.id}/insight`} label={t('insightPhotos')} />
                </Field>
                <Field label={t('insightNote')} htmlFor={`content-${kind}`}>
                  <Textarea id={`content-${kind}`} name="content" rows={3} placeholder={t('insightNotePlaceholder')} />
                </Field>
              </>
            ) : kind === 'caption' ? (
              <Field label={t('captionText')} htmlFor={`content-${kind}`}>
                <Textarea id={`content-${kind}`} name="content" rows={6} required />
              </Field>
            ) : (
              <Field label={kind === 'storyline' ? t('docsLink') : t('driveLink')} htmlFor={`content-${kind}`}>
                <Input id={`content-${kind}`} name="content" type="url" inputMode="url"
                  placeholder={kind === 'storyline' ? 'https://docs.google.com/document/d/…' : 'https://drive.google.com/file/d/…'}
                  required={kind === 'storyline'} />
              </Field>
            )}
            {kind === 'draft' && (
              <Field label={t('photos')} hint={t('photosHint')}>
                <PhotoUpload userId={viewer.id} folder={`${part!.id}/draft`} label={t('photos')} />
              </Field>
            )}
            <div className="flex gap-2 rounded-xl bg-latar p-3 text-[13px] text-teks-redup">
              <Info className="mt-0.5 size-4 shrink-0 text-nila-800" aria-hidden />
              <p>{hint}</p>
            </div>
            <SubmitButton className="w-full"><Send className="size-5" aria-hidden /> {submitLabel}</SubmitButton>
          </ActionForm>
        )}
        {items.length > 0 && (
          <details open={items.length <= 2} className="border-t border-garis pt-2">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between py-2 font-bold">
              {t('history')}
              <span className="text-[13px] font-medium text-teks-redup">{t('versions', { count: items.length })}</span>
            </summary>
            <SubmissionHistory items={items} photoUrls={photos} />
          </details>
        )}
      </Card>
    );
  }
}

const TASK_ICONS = { storyline: FileText, draft: Clapperboard, caption: Type, posting: Send, insight: ChartColumn } as const;

function TaskIcon({ kind, muted }: { kind: keyof typeof TASK_ICONS; muted?: boolean }) {
  const Icon = TASK_ICONS[kind];
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', muted ? 'bg-latar text-teks-redup' : 'bg-nila-50 text-nila-800')}>
      <Icon className="size-5" strokeWidth={2} aria-hidden />
    </span>
  );
}

function TaskHeader({ kind, title, badge }: { kind: keyof typeof TASK_ICONS; title: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <TaskIcon kind={kind} />
      <h2 className="min-w-0 flex-1 text-lg font-bold leading-6">{title}</h2>
      {badge}
    </div>
  );
}
