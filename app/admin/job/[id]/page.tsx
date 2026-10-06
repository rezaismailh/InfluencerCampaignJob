import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ActionForm } from '@/components/action-form';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { SubmitButton } from '@/components/ui/submit-button';
import { participationTone, verificationTone } from '@/components/status';
import { feeLabel } from '@/components/creator/job-card';
import { decideApplication, inviteCreator } from '@/app/admin/actions';
import { requireStaff } from '@/lib/auth';
import { formatRupiah } from '@/lib/money';
import { latestByKind, timeline } from '@/lib/work';
import type { Job, Participation, Profile, SocialAccount, Submission } from '@/lib/types';

type Row = Participation & { profiles: Pick<Profile, 'full_name' | 'city' | 'email' | 'persona' | 'categories'> };

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

  const { data: job } = await viewer.supabase.from('jobs').select('*').eq('id', id).maybeSingle<Job>();
  if (!job) notFound();
  const { data: rows } = await viewer.supabase
    .from('participations').select('*, profiles!participations_creator_id_fkey(full_name, city, email, persona, categories)')
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
      <PageHeader back={{ href: '/admin/job', label: tn('adminJobs') }} title={job.title} subtitle={job.brand_name}
        action={<ButtonLink href={`/admin/job/${id}/ubah`} variant="outline" size="sm">{t('editJob')}</ButtonLink>} />

      <Card className="flex flex-wrap items-center gap-3">
        <Badge tone={job.status === 'open' ? 'success' : 'neutral'}>{tst(job.status)}</Badge>
        <span className="font-bold tabular">{await feeLabel(job)}</span>
        <span className="text-[15px] text-teks-redup">{t('slots', { used: approvedCount, quota: job.quota })}</span>
        <span className="text-[15px] text-teks-redup">{job.platforms.map((p) => tp(p)).join(' · ')}</span>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t('applicants')} ({applicants.length})</h2>
        {!applicants.length && <p className="text-[15px] text-teks-redup">{t('noApplicants')}</p>}
        <div className="grid gap-3 lg:grid-cols-2">
          {applicants.map((r) => {
            const accs = (accounts ?? []).filter((a) => a.creator_id === r.creator_id);
            return (
              <Card key={r.id} className="space-y-3">
                <div>
                  <p className="font-bold">{r.profiles.full_name ?? r.profiles.email}</p>
                  <p className="text-[13px] text-teks-redup">{[r.profiles.city, r.profiles.email].filter(Boolean).join(' · ')}</p>
                </div>
                <ul className="space-y-1">
                  {accs.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 text-[15px]">
                      <a href={a.url} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">{tp(a.platform)} @{a.username}</a>
                      <span className="tabular text-teks-redup">{a.followers.toLocaleString('id-ID')}</span>
                      <Badge tone={verificationTone[a.status]}>{tv(a.status)}</Badge>
                    </li>
                  ))}
                </ul>
                {r.proposed_rate && <p className="font-bold">{t('proposedRate', { amount: formatRupiah(r.proposed_rate) })}</p>}
                <ActionForm action={decideApplication} className="space-y-3">
                  <input type="hidden" name="participation_id" value={r.id} />
                  {job.fee_type === 'open' && (
                    <Field label={t('agreedFee')} htmlFor={`fee-${r.id}`}>
                      <Input id={`fee-${r.id}`} name="fee" inputMode="numeric" defaultValue={r.proposed_rate ?? ''} className="tabular" />
                    </Field>
                  )}
                  <div className="flex gap-2">
                    <SubmitButton name="decision" value="approve" className="flex-1">{t('approve')}</SubmitButton>
                    <SubmitButton name="decision" value="reject" variant="outline">{t('reject')}</SubmitButton>
                  </div>
                </ActionForm>
              </Card>
            );
          })}
        </div>
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
                    <p className="text-[13px] text-teks-redup">{next ? tw(next.key) : tw('stepPaid')}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
          {job.fee_type === 'open' && (
            <Field label={t('inviteFee')} htmlFor="invite-fee"><Input id="invite-fee" name="fee" inputMode="numeric" required className="tabular" /></Field>
          )}
          <SubmitButton variant="outline">{t('invite')}</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
