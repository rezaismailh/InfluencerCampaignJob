import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ActionForm } from '@/components/action-form';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink, buttonClass } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { SubmitButton } from '@/components/ui/submit-button';
import { participationTone } from '@/components/status';
import { CopyLink } from '@/components/admin/copy-link';
import { feeLabel } from '@/components/creator/job-card';
import { decideApplication, inviteCreator, setJobStatus } from '@/app/admin/actions';
import { requireStaff } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { realBrand, type BrandEmbed } from '@/lib/brand';
import { formatRupiah } from '@/lib/money';
import { loadTaxonomy } from '@/lib/taxonomy';
import { creatorTier } from '@/lib/tiers';
import { modeFee, offersVisit } from '@/lib/visit';
import { latestByKind, timeline } from '@/lib/work';
import type { Job, Participation, Profile, SocialAccount, Submission } from '@/lib/types';

// Status buttons shown for each current status.
const STATUS_ACTIONS: Record<Job['status'], Job['status'][]> = {
  draft: ['open'],
  open: ['closed'],
  closed: ['open', 'completed'],
  completed: ['closed'],
};

type Row = Participation & { profiles: Pick<Profile, 'full_name' | 'city' | 'email' | 'persona' | 'categories' | 'gender' | 'hijab' | 'account_type'> };

export default async function AdminJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireStaff('curator');
  const t = await getTranslations('admin');
  const tn = await getTranslations('nav');
  const tst = await getTranslations('jobStatus');
  const tps = await getTranslations('participationStatus');
  const tp = await getTranslations('platform');
  const tv = await getTranslations('verification');
  const tw = await getTranslations('work');
  const tg = await getTranslations('gender');
  const th = await getTranslations('hijab');
  const ta = await getTranslations('accountType');
  const tt = await getTranslations('jobType');
  const tax = await loadTaxonomy();

  const { data: job } = await viewer.supabase.from('jobs').select('*, job_brands(real_name)').eq('id', id).maybeSingle<Job & { job_brands: BrandEmbed }>();
  if (!job) notFound();
  const both = job.job_type === 'both';
  const { data: rows } = await viewer.supabase
    .from('participations').select('*, profiles!participations_creator_id_fkey(full_name, city, email, persona, categories, gender, hijab, account_type)')
    .eq('job_id', id).order('applied_at').returns<Row[]>();
  const all = rows ?? [];
  const creatorIds = all.map((r) => r.creator_id);
  const partIds = all.map((r) => r.id);
  const [{ data: accounts }, { data: subs }] = await Promise.all([
    creatorIds.length ? viewer.supabase.from('social_accounts').select('*').in('creator_id', creatorIds).returns<SocialAccount[]>() : Promise.resolve({ data: [] as SocialAccount[] }),
    partIds.length ? viewer.supabase.from('submissions').select('*').in('participation_id', partIds).returns<Submission[]>() : Promise.resolve({ data: [] as Submission[] }),
  ]);

  const applicants = all.filter((r) => r.status === 'applied');
  const members = all.filter((r) => r.status === 'approved' || r.status === 'invited');
  const approvedCount = all.filter((r) => r.status === 'approved').length;

  return (
    <div className="space-y-5">
      <PageHeader back={{ href: '/admin/job', label: tn('adminJobs') }} title={job.title} subtitle={realBrand(job) ? t('brandShownAs', { real: realBrand(job)!, alias: job.brand_name }) : job.brand_name}
        action={<ButtonLink href={`/admin/job/${id}/ubah`} variant="outline" size="sm">{t('editJob')}</ButtonLink>} />

      <Card className="flex flex-wrap items-center gap-3">
        <Badge tone={job.status === 'open' ? 'success' : 'neutral'}>{tst(job.status)}</Badge>
        <span className="font-bold tabular">{await feeLabel(job)}</span>
        <span className="text-[15px] text-teks-redup">{t('slots', { used: approvedCount, quota: job.quota })}</span>
        <span className="text-[15px] text-teks-redup">{job.platforms.map((p) => tp(p)).join(' · ')}</span>
        {/* Quick status changes; everything else stays in "Edit job". */}
        <div className="ml-auto flex flex-wrap gap-2">
          {STATUS_ACTIONS[job.status].map((next) => (
            <form key={next} action={setJobStatus}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value={next} />
              <Button type="submit" size="sm" variant={next === 'closed' || next === 'completed' ? 'outline' : 'primary'}>{t(`statusAction.${job.status}_${next}`)}</Button>
            </form>
          ))}
        </div>
      </Card>
      <p className="-mt-3 text-[13px] text-teks-redup">{t(`statusHint.${job.status}`)}</p>

      {job.status !== 'draft' && (
        <Card className="space-y-2">
          <CardTitle>{t('shortLink.title')}</CardTitle>
          <CopyLink path={`/j/${job.short_code}`} />
          <p className="text-[13px] text-teks-redup">{t('shortLink.hint')}</p>
        </Card>
      )}

      <Card className="space-y-3">
        <div>
          <CardTitle>{t('export.title')}</CardTitle>
          <p className="text-[13px] text-teks-redup">{t('export.hint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Plain links: the route answers with a file download. */}
          <a href={`/admin/job/${id}/export`} className={buttonClass('primary', 'sm')} download>
            <Download className="size-4" aria-hidden /> {t('export.client', { count: applicants.length })}
          </a>
          <a href={`/admin/job/${id}/export?internal=1`} className={buttonClass('outline', 'sm')} download>
            <Download className="size-4" aria-hidden /> {t('export.internal')}
          </a>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t('applicants')} ({applicants.length})</h2>
        {!applicants.length && <p className="text-[15px] text-teks-redup">{t('noApplicants')}</p>}
        {applicants.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-garis bg-kertas">
            <table className="w-full min-w-[780px] text-left text-[13px]">
              <thead className="bg-latar text-teks-redup">
                <tr>
                  <th scope="col" className="px-3 py-2 font-bold">{t('colCreator')}</th>
                  <th scope="col" className="px-3 py-2 font-bold">{t('colAccounts')}</th>
                  {(offersVisit(job) || job.fee_type === 'open') && (
                    <th scope="col" className="px-3 py-2 font-bold">{offersVisit(job) && job.fee_type === 'open' ? t('colVisitRate') : offersVisit(job) ? t('colVisit') : t('colRate')}</th>
                  )}
                  <th scope="col" className="px-3 py-2 font-bold">{t('colDecision')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garis">
                {applicants.map((r) => {
                  const accs = (accounts ?? []).filter((a) => a.creator_id === r.creator_id);
                  const eligible = (a: SocialAccount) => job.platforms.includes(a.platform) && a.followers >= job.min_followers;
                  const ready = accs.some((a) => a.status === 'verified' && eligible(a));
                  const pending = !ready && accs.some((a) => a.status === 'pending' && eligible(a));
                  const tier = creatorTier(job, accs.filter((a) => a.status !== 'rejected'));
                  const fees = (['non_visit', 'visit'] as const).map((m) => modeFee(job, m, tier, r));
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="min-w-44 px-3 py-2">
                        <Link href={`/admin/creator/${r.creator_id}`} className="font-bold text-nila-800 underline-offset-4 hover:underline">
                          {r.profiles.full_name ?? r.profiles.email}
                        </Link>
                        <p className="text-teks-redup">
                          {[r.profiles.city, r.profiles.gender && tg(r.profiles.gender), r.profiles.hijab && th(r.profiles.hijab), r.profiles.account_type && ta(r.profiles.account_type)].filter(Boolean).join(' · ')}
                        </p>
                        <p className="text-teks-redup">{[...r.profiles.categories.map((k) => tax.name('niche', k)), r.profiles.persona && tax.name('persona', r.profiles.persona)].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="px-3 py-2">
                        <ul className="space-y-0.5">
                          {accs.map((a) => (
                            <li key={a.id} className="flex items-center gap-1.5 whitespace-nowrap">
                              <a href={a.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">{tp(a.platform)} @{a.username}</a>
                              <span className="tabular text-teks-redup">{a.followers.toLocaleString('id-ID')}</span>
                              <span className={cn('size-2 rounded-full', a.status === 'verified' ? 'bg-sukses' : a.status === 'pending' ? 'bg-peringatan' : 'bg-bahaya')} title={tv(a.status)} aria-label={tv(a.status)} />
                            </li>
                          ))}
                        </ul>
                        {pending && <p className="mt-1 text-teks-redup">{t('acceptVerifies')}</p>}
                        {!ready && !pending && <p className="mt-1 text-peringatan">{t('cannotAcceptShort')}</p>}
                      </td>
                      {(offersVisit(job) || job.fee_type === 'open') && (
                        <td className="whitespace-nowrap px-3 py-2 tabular">
                          {offersVisit(job) && (
                            <Badge tone={r.visit_willing ? 'success' : 'neutral'} className="mb-1">{r.visit_willing ? t('willingVisitShort') : t('notWillingVisitShort')}</Badge>
                          )}
                          {r.proposed_rate && <p className="font-bold">{formatRupiah(r.proposed_rate)}</p>}
                          {r.proposed_rate_visit && <p className="text-teks-redup">{t('visitRateShort', { amount: formatRupiah(r.proposed_rate_visit) })}</p>}
                        </td>
                      )}
                      <td className="w-[300px] px-3 py-2">
                        <ActionForm action={decideApplication} className="space-y-1.5">
                          <input type="hidden" name="participation_id" value={r.id} />
                          {(both || job.fee_type !== 'fixed') && (
                            <div className="flex gap-1.5">
                              {both && (
                                <select name="work_mode" defaultValue={r.visit_willing ? '' : 'non_visit'} aria-label={t('workMode')}
                                  className="h-9 min-w-0 flex-1 rounded-lg border border-garis bg-kertas px-2 text-[13px] text-teks focus:border-nila-500 focus:outline-none"
                                  title={t('workModeHint', { nonVisit: fees[0] ? formatRupiah(fees[0]) : '—', visit: fees[1] ? formatRupiah(fees[1]) : '—' })}>
                                  <option value="">{t('workModePickShort')}</option>
                                  <option value="non_visit">{tt('non_visit')}{fees[0] ? ` · ${formatRupiah(fees[0])}` : ''}</option>
                                  <option value="visit" disabled={!r.visit_willing}>{tt('visit')}{fees[1] ? ` · ${formatRupiah(fees[1])}` : ''}</option>
                                </select>
                              )}
                              {job.fee_type !== 'fixed' && (
                                <input name="fee" inputMode="numeric" aria-label={t('agreedFee')}
                                  className="h-9 w-24 shrink-0 rounded-lg border border-garis bg-kertas px-2 text-[13px] text-teks tabular placeholder:text-teks-redup/70 focus:border-nila-500 focus:outline-none"
                                  placeholder={both ? t('feeAuto') : undefined}
                                  defaultValue={both ? '' : job.fee_type === 'open' ? r.proposed_rate ?? '' : (tier ? job.tier_fees[tier] : undefined) ?? ''} />
                              )}
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            <SubmitButton name="decision" value="approve" size="sm">{t('approve')}</SubmitButton>
                            <SubmitButton name="decision" value="reject" variant="outline" size="sm">{t('reject')}</SubmitButton>
                          </div>
                        </ActionForm>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t('participants')} ({members.length})</h2>
        {!members.length && <p className="text-[15px] text-teks-redup">{t('noParticipants')}</p>}
        <div className="space-y-2">
          {members.map((r) => {
            const steps = timeline(r, job, latestByKind((subs ?? []).filter((s) => s.participation_id === r.id)));
            const next = steps.find((s) => !s.done && !s.optional);
            return (
              <Link key={r.id} href={`/admin/partisipasi/${r.id}`} className="block">
                <Card className="flex flex-wrap items-center justify-between gap-2 hover:border-nila-300">
                  <div>
                    <p className="font-bold">{r.profiles.full_name ?? r.profiles.email}</p>
                    <p className="text-[13px] text-teks-redup">{next ? t('waitingFor', { step: tw(next.key) }) : tw('stepPaid')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {both && r.work_mode && <Badge tone={r.work_mode === 'visit' ? 'warning' : 'success'}>{tt(r.work_mode)}</Badge>}
                    {r.agreed_fee && <span className="font-bold tabular">{formatRupiah(r.agreed_fee)}</span>}
                    <Badge tone={participationTone[r.status]}>{tps(r.status)}</Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <Card className="max-w-lg">
        <CardTitle className="mb-3">{t('invite')}</CardTitle>
        <ActionForm action={inviteCreator} resetOnSuccess>
          <input type="hidden" name="job_id" value={job.id} />
          <Field label={t('inviteEmail')} htmlFor="invite-email"><Input id="invite-email" name="email" type="email" required /></Field>
          {both && (
            <Field label={t('workMode')} htmlFor="invite-mode">
              <Select id="invite-mode" name="work_mode" required defaultValue="">
                <option value="" disabled>{t('workModePick')}</option>
                <option value="non_visit">{tt('non_visit')}</option>
                <option value="visit">{tt('visit')}</option>
              </Select>
            </Field>
          )}
          {job.fee_type === 'open' && (
            <Field label={t('inviteFee')} htmlFor="invite-fee"><Input id="invite-fee" name="fee" inputMode="numeric" required className="tabular" /></Field>
          )}
          {job.fee_type === 'tier' && (
            <Field label={t('inviteFee')} hint={t('inviteTierFeeHint')} htmlFor="invite-fee"><Input id="invite-fee" name="fee" inputMode="numeric" className="tabular" /></Field>
          )}
          <SubmitButton variant="outline">{t('invite')}</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
