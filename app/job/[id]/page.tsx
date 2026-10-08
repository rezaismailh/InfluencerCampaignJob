import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { CalendarCheck, CalendarClock, ChevronDown, ChevronLeft, CircleCheck, Clapperboard, Clock, Info, Lock, MapPin, ShieldCheck, Users, Wallet, type LucideIcon } from 'lucide-react';
import { ActionForm, FieldError } from '@/components/action-form';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RupiahInput } from '@/components/ui/rupiah-input';
import { BrandAvatar } from '@/components/brand-avatar';
import { SubmitButton } from '@/components/ui/submit-button';
import { feeLabel, payoutLabel } from '@/components/creator/job-card';
import { ShareButton } from '@/components/share-button';
import { applyToJob, respondInvite } from '@/app/(creator)/actions';
import { getViewer, type Viewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadTaxonomy } from '@/lib/taxonomy';
import { creatorTier, tierFeeList } from '@/lib/tiers';
import { formatDate, formatDayMonth, monthlyPaymentExample, todayWib } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/money';
import type { Job, Participation, PublicJob, SocialAccount } from '@/lib/types';
import { visibleBrand, visibleLogo, type BrandEmbed } from '@/lib/brand';

async function publicJob(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc('public_open_jobs', { p_id: id });
  return ((data ?? []) as PublicJob[])[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = /^[0-9a-f-]{36}$/i.test(id) ? await publicJob(id) : null;
  if (!job) return {};
  const title = `${job.title} · ${job.brand_name}`;
  const description = `${await feeLabel(job)} · ${job.deliverables}`.slice(0, 200);
  return { title, description, openGraph: { title, description } };
}

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await getViewer();
  const creator = viewer?.profile.role === 'creator' && viewer.profile.onboarded_at ? viewer : null;
  const t = await getTranslations('jobs');
  const tp = await getTranslations('platform');
  const tt = await getTranslations('jobType');
  const tpo = await getTranslations('productOption');
  const tps = await getTranslations('participationStatus');
  const tn = await getTranslations('nav');
  const ttier = await getTranslations('tier');
  const tax = await loadTaxonomy();
  const locale = await getLocale();

  // Signed-in users read the job through RLS (full brief); guests get the teaser.
  const full = viewer ? (await viewer.supabase.from('jobs').select('*, job_brands(real_name, logo)').eq('id', id).maybeSingle<Job & { job_brands: BrandEmbed }>()).data : null;
  const job: Job | PublicJob | null = full ?? await publicJob(id);
  if (!job) notFound();
  const fee = await feeLabel(job);
  const locations = full ? full.visit_locations : (job as PublicJob).visit_location_names.map((name) => ({ name }));

  const pay = paymentRows(job);
  const hasRequirements = job.requirements || job.min_followers > 0 || job.tiers.length > 0 || job.niches.length > 0 || job.personas.length > 0;

  return (
    <div className="space-y-4">
      <Link href="/job" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-[15px] font-bold text-nila-800">
        <ChevronLeft className="size-5" strokeWidth={2} aria-hidden /> {tn('jobs')}
      </Link>
      <header className="flex items-start gap-3">
        <BrandAvatar logo={full ? visibleLogo(full) : job.brand_logo} icon={job.brand_icon} size={48} />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-teks-redup">{full ? visibleBrand(full) : job.brand_name}</p>
          <h1 className="text-[22px] font-bold leading-7">{job.title}</h1>
        </div>
      </header>

      <Card className="space-y-3">
        <div className="rounded-xl bg-nila-50 p-3">
          <p className="text-[13px] font-medium text-teks-redup">
            {job.fee_type === 'tier' ? t('feeByFollowers') : job.fee_type === 'open' ? t('feeOpen') : t('feeFixed')}
          </p>
          <p className="text-[28px] font-extrabold leading-9 text-nila-800 tabular">{job.fee_type === 'open' ? t('openRate') : fee}</p>
          {job.fee_type === 'open' && job.rate_cap && <p className="text-[15px] font-bold tabular">{t('rateCapShort', { amount: formatRupiah(job.rate_cap) })}</p>}
          {job.platforms.length > 1 && <p className="mt-1 text-[13px] text-teks-redup">{t('feeCombined')}</p>}
        </div>
        {job.fee_type === 'tier' && (
          <div className="space-y-2">
            <ul className="divide-y divide-garis rounded-xl border border-garis">
              {tierFeeList(job.tier_fees).map(({ tier, fee }) => (
                <li key={tier} className="flex items-center justify-between gap-3 px-3 py-2 text-[15px]">
                  <span>{ttier(tier)}</span>
                  <span className="font-bold tabular">{formatRupiah(fee)}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-teks-redup">
              {job.tier_basis === 'primary' && job.primary_platform
                ? t('tierBasisPrimaryNote', { platform: tp(job.primary_platform) })
                : t('tierBasisLargestNote')}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={job.job_type === 'visit' ? 'warning' : 'success'}>{tt(job.job_type)}</Badge>
          {job.platforms.map((p) => <Badge key={p}>{tp(p)}</Badge>)}
        </div>
        <ul className="space-y-2.5 text-[15px]">
          <Fact icon={Wallet}>{await payoutLabel(job)}</Fact>
          {job.apply_deadline && <Fact icon={CalendarClock}>{t('applyDeadline', { date: formatDate(job.apply_deadline, locale) })}</Fact>}
          {job.content_deadline && <Fact icon={CalendarCheck}>{t('contentDeadline', { date: formatDate(job.content_deadline, locale) })}</Fact>}
          <Fact icon={Users}>{t('quota', { count: job.quota })}</Fact>
        </ul>
      </Card>

      <Card className="space-y-3">
        <SectionTitle icon={Clock}>{t('payment')}</SectionTitle>
        <p className="text-[15px]">{pay.intro}</p>
        <ul className="space-y-2 rounded-xl bg-latar p-2">
          {pay.rows.map((row, i) => {
            const Icon = i === 0 ? CircleCheck : CalendarClock;
            return (
              <li key={row.label} className="flex items-center gap-3 rounded-lg bg-kertas px-3 py-2.5">
                <Icon className={cn('size-5 shrink-0', i === 0 ? 'text-sukses' : 'text-teks-redup')} strokeWidth={2} aria-hidden />
                <div className="min-w-0">
                  <p className="text-[13px] text-teks-redup">{row.label}</p>
                  <p className="font-bold text-nila-800">{row.value}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2 rounded-xl bg-nila-50 p-3 text-[13px] text-teks-redup">
          <ShieldCheck className="size-5 shrink-0 text-nila-800" strokeWidth={2} aria-hidden />
          <p>{t('paymentTransfer')}</p>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-3">
          <SectionTitle icon={Clapperboard}>{t('deliverables')}</SectionTitle>
          <p className="whitespace-pre-line rounded-xl bg-latar p-3 text-[15px]">{job.deliverables}</p>
        </div>
        {hasRequirements && (
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-teks-redup">{t('requirements')}</h2>
            <ul className="mt-2 space-y-1.5 text-[15px]">
              {job.min_followers > 0 && <Check>{t('minFollowers', { count: job.min_followers.toLocaleString('id-ID') })}</Check>}
              {job.tiers.length > 0 && <Check>{t('tiers')}: {job.tiers.map((x) => (ttier.has(x) ? ttier(x) : x)).join(', ')}</Check>}
              {job.niches.length > 0 && <Check>{t('niches')}: {job.niches.map((x) => tax.name('niche', x)).join(', ')}</Check>}
              {job.personas.length > 0 && <Check>{t('personas')}: {job.personas.map((x) => tax.name('persona', x)).join(', ')}</Check>}
              {job.require_purchase_proof && <Check>{t('purchaseProof')}</Check>}
            </ul>
            {job.requirements && <p className="mt-2 whitespace-pre-line text-[15px]">{job.requirements}</p>}
          </div>
        )}
      </Card>

      <details className="group rounded-2xl border border-garis bg-kertas">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-bold [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2"><Info className="size-5 text-nila-800" strokeWidth={2} aria-hidden /> {t('moreDetails')}</span>
          <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-4 border-t border-garis p-4">
          {full ? <InfoRow title={t('brief')} body={full.brief} /> : (
            <div className="flex gap-2 rounded-xl bg-latar p-3 text-[15px] text-teks-redup">
              <Lock className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p>{t('briefLocked')}</p>
            </div>
          )}
          <InfoRow title={t('product')} body={[job.product, tpo(job.product_option)].filter(Boolean).join(' · ')} />
          {job.job_type === 'visit' && locations.length > 0 && (
            <div>
              <h2 className="font-bold">{t('visitLocations')}</h2>
              <ul className="mt-1 space-y-2">
                {locations.map((loc: { name: string; address?: string; maps_url?: string }, i) => (
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
          {job.review_days && <p className="text-[15px] text-teks-redup">{t('reviewDays', { days: job.review_days })}</p>}
        </div>
      </details>

      {/* Shares the public name (alias for disguised brands), never the real one. */}
      <ShareButton path={`/job/${job.id}`} title={`${job.title} · ${job.brand_name}`}
        text={t('shareText', { title: job.title, brand: job.brand_name, fee })} />

      {creator && full ? <JoinBlock job={full} viewer={creator} /> : <SignInBlock viewer={viewer} jobId={job.id} />}
    </div>
  );

  /** Concrete payout dates: the next cut-off for monthly terms, a worked example for H+N. */
  function paymentRows(job: Job | PublicJob) {
    const today = todayWib();
    const when = (date: string) => t('paymentOn', { date: formatDayMonth(date, locale) });
    if (job.top_mode === 'monthly') {
      const ex = monthlyPaymentExample(today, job.pay_day, job.cutoff_day);
      const cutoff = formatDayMonth(ex.cutoff, locale);
      return {
        intro: t(job.require_insight ? 'paymentMonthlyInsight' : 'paymentMonthly', { pay: job.pay_day }),
        rows: [
          { label: t(job.require_insight ? 'paymentBeforeInsight' : 'paymentBeforePost', { cutoff }), value: when(ex.before) },
          { label: t(job.require_insight ? 'paymentAfterInsight' : 'paymentAfterPost', { cutoff }), value: when(ex.after) },
        ],
      };
    }
    const ref = job.content_deadline && job.content_deadline > today ? job.content_deadline : today;
    const ready = new Date(`${ref}T00:00:00Z`);
    ready.setUTCDate(ready.getUTCDate() + job.top_days);
    return {
      intro: t(job.require_insight ? 'paymentBodyInsight' : 'paymentBody', { days: job.top_days }),
      rows: [{ label: t(job.require_insight ? 'paymentDaysInsight' : 'paymentDaysPost', { date: formatDayMonth(ref, locale) }), value: when(ready.toISOString().slice(0, 10)) }],
    };
  }

  /** Action area pinned above the bottom nav (creators) or the screen edge (guests). */
  function ActionBar({ children }: { children: React.ReactNode }) {
    return (
      <div className={cn('sticky z-10 -mx-4 space-y-3 border-t border-garis bg-kertas/95 px-4 py-3 backdrop-blur',
        creator ? 'bottom-[calc(57px+env(safe-area-inset-bottom))]' : 'bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]')}>
        {children}
      </div>
    );
  }

  async function SignInBlock({ viewer, jobId }: { viewer: Viewer | null; jobId: string }) {
    if (viewer && viewer.profile.role !== 'creator') return null;
    const next = encodeURIComponent(`/job/${jobId}`);
    return (
      <ActionBar>
        <p className="text-[13px] text-teks-redup">{viewer ? t('completeProfileBody') : t('signInBody')}</p>
        <ButtonLink href={viewer ? `/onboarding?next=${next}` : `/masuk?next=${next}`} className="w-full">
          {viewer ? t('completeProfileCta') : t('signInCta')}
        </ButtonLink>
      </ActionBar>
    );
  }

  async function JoinBlock({ job, viewer }: { job: Job; viewer: Viewer }) {
    const [{ data: part }, { data: accounts }] = await Promise.all([
      viewer.supabase.from('participations').select('*').eq('job_id', job.id).eq('creator_id', viewer.id).maybeSingle<Participation>(),
      viewer.supabase.from('social_accounts').select('*').eq('creator_id', viewer.id).in('status', ['verified', 'pending']).returns<SocialAccount[]>(),
    ]);
    // A pending account is enough to apply; the curator verifies it before approving.
    const matching = (accounts ?? []).filter((a) => job.platforms.includes(a.platform));
    const eligible = matching.length > 0;
    const pendingOnly = eligible && matching.every((a) => a.status === 'pending');
    const best = matching.reduce<SocialAccount | null>((top, a) => (!top || a.followers > top.followers ? a : top), null);
    const link = 'font-bold underline underline-offset-4';
    if (part) {
      if (part.status === 'invited') {
        return (
          <ActionBar>
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
          </ActionBar>
        );
      }
      return (
        <ActionBar>
          <p className="font-bold">{t('yourStatus', { status: tps(part.status) })}</p>
          {part.status === 'applied' && <p className="text-[13px] text-teks-redup">{t('applied')}</p>}
          {part.status === 'approved' && <ButtonLink href={`/partisipasi/${part.id}`} className="w-full">{t('openParticipation')}</ButtonLink>}
        </ActionBar>
      );
    }
    if (job.status !== 'open') return null;
    if (!eligible) {
      return (
        <ActionBar>
          <Alert tone="warning">
            {t('needAccount', { platforms: job.platforms.map((p) => tp(p)).join(' / ') })}{' '}
            <Link href="/profil" className={link}>{t('addAccount')}</Link>
          </Alert>
        </ActionBar>
      );
    }
    // Per-tier fee: show the creator their own fee, or why their tier can't join.
    const tier = job.fee_type === 'tier' ? creatorTier(job, matching) : null;
    if (job.fee_type === 'tier' && !tier && job.tier_basis === 'primary' && job.primary_platform) {
      return (
        <ActionBar>
          <Alert tone="warning">
            {t('needPrimaryAccount', { platform: tp(job.primary_platform) })}{' '}
            <Link href="/profil#field-social" className={link}>{t('addAccount')}</Link>
          </Alert>
        </ActionBar>
      );
    }
    if (tier && !(tier in (job.tier_fees ?? {}))) {
      return <ActionBar><Alert tone="warning">{t('tierNotOffered', { tier: ttier(tier) })}</Alert></ActionBar>;
    }
    if (best && best.followers < job.min_followers) {
      return (
        <ActionBar>
          <Alert tone="warning">
            {t('followersBelowMin', {
              min: job.min_followers.toLocaleString('id-ID'),
              platform: tp(best.platform),
              count: best.followers.toLocaleString('id-ID'),
            })}{' '}
            <Link href="/profil#field-social" className={link}>{t('updateFollowersCta')}</Link>
          </Alert>
        </ActionBar>
      );
    }
    return (
      <ActionBar>
        <ActionForm action={applyToJob} className="space-y-2">
          <input type="hidden" name="job_id" value={job.id} />
          {pendingOnly && <p className="text-[13px] text-teks-redup">{t('pendingAccountNote')}</p>}
          {job.fee_type === 'open' ? (
            <>
              <label htmlFor="rate" className="block text-[15px] font-bold">{t('rate')}</label>
              <div className="flex gap-2">
                <RupiahInput id="rate" name="rate" placeholder="250.000" required className="min-w-0 flex-1" />
                <SubmitButton pendingLabel={t('joining')} className="shrink-0 whitespace-nowrap">{t('joinShort')}</SubmitButton>
              </div>
              <FieldError name="rate" />
              <p className="text-[13px] text-teks-redup">
                {job.rate_cap ? `${t('rateHint')} ${t('rateCapHint', { amount: formatRupiah(job.rate_cap) })}` : t('rateHint')}
              </p>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] text-teks-redup">{tier ? `${t('feeYours')} · ${ttier(tier)}` : t('fee')}</p>
                <p className="text-lg font-extrabold tabular">{tier ? formatRupiah(job.tier_fees[tier]) : fee}</p>
              </div>
              <SubmitButton pendingLabel={t('joining')} className="shrink-0">{t('join')}</SubmitButton>
            </div>
          )}
        </ActionForm>
      </ActionBar>
    );
  }
}

function Fact({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-latar">
        <Icon className="size-4 text-nila-800" strokeWidth={2} aria-hidden />
      </span>
      <span>{children}</span>
    </li>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-lg font-bold">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-nila-50">
        <Icon className="size-4 text-nila-800" strokeWidth={2} aria-hidden />
      </span>
      {children}
    </h2>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <CircleCheck className="mt-0.5 size-5 shrink-0 text-sukses" strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </li>
  );
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
