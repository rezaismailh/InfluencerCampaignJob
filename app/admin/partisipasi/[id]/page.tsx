import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { ActionForm, FieldError } from '@/components/action-form';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { SubmitButton } from '@/components/ui/submit-button';
import { participationTone, reviewTone, verificationTone } from '@/components/status';
import { ReviewForm } from '@/components/admin/review-form';
import { SubmissionHistory } from '@/components/work/submission-history';
import { Timeline } from '@/components/work/timeline';
import { cancelParticipation, confirmPost, setShipment, setVisit } from '@/app/admin/actions';
import { requireStaff } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { signedUrls } from '@/lib/storage';
import { latestByKind, timeline } from '@/lib/work';
import type { Job, Participation, Profile, SocialAccount, Submission, SubmissionKind } from '@/lib/types';

const KINDS: SubmissionKind[] = ['storyline', 'draft', 'caption'];

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

export default async function AdminWork({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireStaff('curator');
  const t = await getTranslations('admin');
  const tw = await getTranslations('work');
  const tk = await getTranslations('kind');
  const tr = await getTranslations('review');
  const tps = await getTranslations('participationStatus');
  const tp = await getTranslations('platform');
  const tv = await getTranslations('verification');
  const ts = await getTranslations('shipment');
  const c = await getTranslations('common');
  const locale = await getLocale();

  const { data: part } = await viewer.supabase
    .from('participations').select('*, jobs(*), profiles!participations_creator_id_fkey(*)').eq('id', id)
    .maybeSingle<Participation & { jobs: Job; profiles: Profile }>();
  if (!part) notFound();
  const job = part.jobs;
  const creator = part.profiles;
  const [{ data: subs }, { data: accounts }] = await Promise.all([
    viewer.supabase.from('submissions').select('*').eq('participation_id', id).order('version').returns<Submission[]>(),
    viewer.supabase.from('social_accounts').select('*').eq('creator_id', part.creator_id).returns<SocialAccount[]>(),
  ]);
  const submissions = subs ?? [];
  const latest = latestByKind(submissions);
  const photos = await signedUrls(viewer, [...submissions.flatMap((s) => s.photo_paths), part.purchase_proof_path ?? '']);
  const address = decrypt(part.shipping_address_enc) ?? decrypt(creator.address_enc);

  return (
    <div className="space-y-5">
      <PageHeader back={{ href: `/admin/job/${job.id}`, label: job.title }} title={creator.full_name ?? creator.email ?? ''} subtitle={`${job.brand_name} · ${job.title}`} />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {KINDS.map((kind) => {
            const items = submissions.filter((s) => s.kind === kind);
            const last = latest[kind];
            return (
              <Card key={kind} id={kind} className="space-y-3 scroll-mt-20">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{tk(kind)}</CardTitle>
                  {last && <Badge tone={reviewTone[last.status]}>{tr(last.status)}</Badge>}
                </div>
                {!items.length && <p className="text-[15px] text-teks-redup">{c('none')}</p>}
                {last && (last.status === 'pending_review' || last.status === 'sent_to_brand') && <ReviewForm submission={last} />}
                <SubmissionHistory items={items} photoUrls={photos} />
              </Card>
            );
          })}

          <Card className="space-y-3">
            <CardTitle>{t('post')}</CardTitle>
            {!part.post_url ? (
              <p className="text-[15px] text-teks-redup">{t('postNotYet')}</p>
            ) : (
              <>
                <a href={part.post_url} target="_blank" rel="noreferrer" className="break-all font-bold text-nila-800 underline underline-offset-4">{part.post_url}</a>
                {part.posted_on && <p className="text-[15px]">{tw('postedOn')}: {formatDate(part.posted_on, locale)}</p>}
                <Alert tone={part.post_url_matches === false ? 'warning' : part.post_url_matches ? 'success' : 'info'}>
                  {part.post_url_matches === true ? t('postMatchYes') : part.post_url_matches === false ? t('postMatchNo') : t('postMatchUnknown')}
                </Alert>
                {part.post_confirmed_at ? (
                  <p className="text-[15px] text-sukses">{tw('postConfirmed', { date: formatDate(part.post_confirmed_at, locale) })} {part.ready_at && tw('readyOn', { date: formatDate(part.ready_at, locale) })}</p>
                ) : (
                  <ActionForm action={confirmPost}>
                    <input type="hidden" name="participation_id" value={part.id} />
                    <SubmitButton>{t('confirmPost')}</SubmitButton>
                  </ActionForm>
                )}
              </>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold tabular">{part.agreed_fee ? formatRupiah(part.agreed_fee) : c('none')}</span>
              <Badge tone={participationTone[part.status]}>{tps(part.status)}</Badge>
            </div>
            <p className="text-[15px]"><span className="font-bold">{t('phone')}:</span> {decrypt(creator.phone_enc) ?? c('none')}</p>
            <p className="text-[15px]"><span className="font-bold">Email:</span> {creator.email}</p>
            <ul className="space-y-1 pt-1">
              {(accounts ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 text-[15px]">
                  <a href={a.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{tp(a.platform)} @{a.username}</a>
                  <span className="tabular text-teks-redup">{a.followers.toLocaleString('id-ID')}</span>
                  <Badge tone={verificationTone[a.status]}>{tv(a.status)}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          {part.status === 'approved' && (
            <Card>
              <CardTitle className="mb-3">{tw('timeline')}</CardTitle>
              <Timeline steps={timeline(part, job, latest)} />
            </Card>
          )}

          {(job.product_option === 'shipped' || job.job_type === 'visit') && part.status === 'approved' && (
            <Card className="space-y-3">
              <CardTitle>{t('logistics')}</CardTitle>
              {job.product_option === 'shipped' && (
                <ActionForm action={setShipment}>
                  <input type="hidden" name="participation_id" value={part.id} />
                  <p className="text-[15px]"><span className="font-bold">{t('address')}:</span> <span className="whitespace-pre-line">{address ?? c('none')}</span></p>
                  <Field label={tw('shipmentStatus')} htmlFor="shipment_status">
                    <Select id="shipment_status" name="shipment_status" defaultValue={part.shipment_status ?? 'pending'}>
                      {(['pending', 'shipped', 'received'] as const).map((s) => <option key={s} value={s}>{ts(s)}</option>)}
                    </Select>
                  </Field>
                  <Field label={tw('courier')} htmlFor="courier"><Input id="courier" name="courier" defaultValue={part.courier ?? ''} /></Field>
                  <Field label={tw('tracking')} htmlFor="tracking_number"><Input id="tracking_number" name="tracking_number" defaultValue={part.tracking_number ?? ''} /></Field>
                  <SubmitButton variant="outline" className="w-full">{t('setShipment')}</SubmitButton>
                </ActionForm>
              )}
              {job.job_type === 'visit' && (
                <ActionForm action={setVisit}>
                  <input type="hidden" name="participation_id" value={part.id} />
                  <Field label={t('visitLocation')} htmlFor="visit_location">
                    <Select id="visit_location" name="visit_location" defaultValue={part.visit_location ?? ''}>
                      {job.visit_locations.map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}
                    </Select>
                  </Field>
                  <Field label={t('visitAt')} htmlFor="visit_at">
                    <Input id="visit_at" name="visit_at" type="datetime-local" defaultValue={toLocalInput(part.visit_at)} required />
                    <FieldError name="visit_at" />
                  </Field>
                  <SubmitButton variant="outline" className="w-full">{t('setVisit')}</SubmitButton>
                  {part.visit_at && <p className="text-[13px] text-teks-redup">{formatDateTime(part.visit_at, locale)}</p>}
                </ActionForm>
              )}
              {part.purchase_proof_path && photos[part.purchase_proof_path] && (
                <a href={photos[part.purchase_proof_path]} target="_blank" rel="noreferrer" className="font-bold text-nila-800 underline underline-offset-4">{t('viewProof')}</a>
              )}
            </Card>
          )}

          {['invited', 'applied', 'approved'].includes(part.status) && !part.post_confirmed_at && (
            <Card>
              <details>
                <summary className="min-h-11 cursor-pointer py-2 font-bold text-bahaya">{t('cancelParticipation')}</summary>
                <ActionForm action={cancelParticipation}>
                  <input type="hidden" name="participation_id" value={part.id} />
                  <Field label={t('cancelReason')} htmlFor="reason"><Textarea id="reason" name="reason" required /><FieldError name="reason" /></Field>
                  <SubmitButton variant="danger" className="w-full">{t('cancelParticipation')}</SubmitButton>
                </ActionForm>
              </details>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
