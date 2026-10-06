import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { ActionForm, FieldError } from '@/components/action-form';
import { PhotoUpload } from '@/components/photo-upload';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
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
import { latestByKind, revisionCount, timeline } from '@/lib/work';
import type { Job, Participation, PayoutRequest, Submission, SubmissionKind } from '@/lib/types';

export default async function Work({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireCreator();
  const t = await getTranslations('work');
  const tn = await getTranslations('nav');
  const tps = await getTranslations('participationStatus');
  const tj = await getTranslations('jobs');
  const locale = await getLocale();

  const { data: part } = await viewer.supabase
    .from('participations').select('*, jobs(*)').eq('id', id).eq('creator_id', viewer.id)
    .maybeSingle<Participation & { jobs: Job }>();
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

  return (
    <div className="space-y-5">
      <PageHeader back={{ href: '/beranda', label: tn('home') }} title={job.title} subtitle={job.brand_name} />

      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-teks-redup">{t('agreedFee')}</p>
          <p className="text-xl font-extrabold tabular">{part.agreed_fee ? formatRupiah(part.agreed_fee) : tj('openRate')}</p>
        </div>
        <Badge tone={participationTone[part.status]}>{tps(part.status)}</Badge>
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
            <CardTitle className="mb-3">{t('timeline')}</CardTitle>
            <Timeline steps={steps} />
          </Card>

          <Prep />

          <SubmissionCard kind="storyline" locked={false} />
          <SubmissionCard kind="draft" locked={!storylineApproved} />
          <SubmissionCard kind="caption" locked={!storylineApproved} />

          <Card className="space-y-3">
            <CardTitle>{t('postingTitle')}</CardTitle>
            {part.post_confirmed_at ? (
              <>
                <Alert tone="success">{t('postConfirmed', { date: formatDate(part.post_confirmed_at, locale) })}</Alert>
                {part.ready_at && (part.ready_at <= todayWib()
                  ? <p className="text-[15px]">{t('readyNow')}</p>
                  : <p className="text-[15px]">{t('readyOn', { date: formatDate(part.ready_at, locale) })}</p>)}
                {payout ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-latar p-3">
                    <span className="font-bold tabular">{formatRupiah(payout.net)}</span>
                    <PayoutBadge status={payout.status} />
                  </div>
                ) : (
                  <ButtonLink href="/saldo" variant="outline" className="w-full">{t('goToBalance')}</ButtonLink>
                )}
              </>
            ) : !contentApproved ? (
              <p className="text-[15px] text-teks-redup">{t('postingLocked')}</p>
            ) : (
              <>
                {part.post_url && (
                  <Alert tone={part.post_url_matches === false ? 'warning' : 'info'}>
                    {part.post_url_matches === false ? t('postMismatch') : t('postSubmitted')}
                  </Alert>
                )}
                <ActionForm action={submitPost}>
                  <input type="hidden" name="participation_id" value={part.id} />
                  <Field label={t('postUrl')} htmlFor="post_url">
                    <Input id="post_url" name="post_url" type="url" inputMode="url" defaultValue={part.post_url ?? ''} required />
                  </Field>
                  <Field label={t('postedOn')} htmlFor="posted_on">
                    <Input id="posted_on" name="posted_on" type="date" max={todayWib()} defaultValue={part.posted_on ?? todayWib()} required />
                  </Field>
                  <SubmitButton className="w-full">{t('submitPost')}</SubmitButton>
                </ActionForm>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );

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

  async function SubmissionCard({ kind, locked }: { kind: SubmissionKind; locked: boolean }) {
    const tk = await getTranslations('kind');
    const tr = await getTranslations('review');
    const items = submissions.filter((s) => s.kind === kind);
    const last = latest[kind];
    const canSubmit = !locked && !part!.post_confirmed_at && (!last || last.status === 'revision');
    const hint = kind === 'storyline' ? t('storylineHint') : kind === 'draft' ? t('draftHint') : t('captionHint');
    const submitLabel = last?.status === 'revision' ? t('submitRevision')
      : kind === 'storyline' ? t('submitStoryline') : kind === 'draft' ? t('submitDraft') : t('submitCaption');

    return (
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{tk(kind)}</CardTitle>
          {last && <Badge tone={reviewTone[last.status]}>{tr(last.status)}</Badge>}
        </div>
        {items.length > 1 && <p className="text-[13px] text-teks-redup">{t('revisions', { count: revisionCount(submissions, kind) })}</p>}
        {locked && <p className="text-[15px] text-teks-redup">{t('lockedUntilStoryline')}</p>}
        {last && (last.status === 'pending_review' || last.status === 'sent_to_brand') && (
          <p className="text-[15px] text-teks-redup">{t('waitingReview')}</p>
        )}
        {canSubmit && (
          <ActionForm action={submitItem} resetOnSuccess>
            <input type="hidden" name="participation_id" value={part!.id} />
            <input type="hidden" name="kind" value={kind} />
            <p className="text-[13px] text-teks-redup">{hint}</p>
            {kind === 'caption' ? (
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
            <SubmitButton className="w-full">{submitLabel}</SubmitButton>
          </ActionForm>
        )}
        {items.length > 0 && (
          <details open={items.length <= 2}>
            <summary className="min-h-11 cursor-pointer py-2 font-bold text-nila-800">{t('history')}</summary>
            <SubmissionHistory items={items} photoUrls={photos} />
          </details>
        )}
      </Card>
    );
  }
}
