import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Trash2 } from 'lucide-react';
import { ActionForm, FieldError } from '@/components/action-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { SubmitButton } from '@/components/ui/submit-button';
import { InvitePanel, type InviteJob } from '@/components/admin/invite-panel';
import { participationTone, verificationTone } from '@/components/status';
import { addCreatorNote, deleteCreatorNote } from '@/app/admin/actions';
import { requireStaff } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { loadTaxonomy } from '@/lib/taxonomy';
import { tierFor } from '@/lib/tiers';
import type { Job, Participation, Profile, SocialAccount } from '@/lib/types';

type PartRow = Participation & { jobs: Pick<Job, 'id' | 'title' | 'brand_name' | 'job_type'> };
type Note = { id: string; body: string; created_at: string; author_id: string; profiles: { full_name: string | null; email: string | null } | null };

/** One creator: profile, social accounts, job history, team notes, and an invite form. */
export default async function CreatorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await requireStaff('curator');
  const t = await getTranslations('admin.creators');
  const tn = await getTranslations('nav');
  const tp = await getTranslations('platform');
  const tv = await getTranslations('verification');
  const tps = await getTranslations('participationStatus');
  const tt = await getTranslations('jobType');
  const tg = await getTranslations('gender');
  const th = await getTranslations('hijab');
  const ta = await getTranslations('accountType');
  const ttier = await getTranslations('tier');
  const c = await getTranslations('common');
  const locale = await getLocale();
  const tax = await loadTaxonomy();

  const sb = viewer.supabase;
  const { data: p } = await sb.from('profiles').select('*').eq('id', id).eq('role', 'creator').maybeSingle<Profile>();
  if (!p) notFound();
  const [{ data: accounts }, { data: parts }, { data: notes }, { data: jobs }] = await Promise.all([
    sb.from('social_accounts').select('*').eq('creator_id', id).order('followers', { ascending: false }).returns<SocialAccount[]>(),
    sb.from('participations').select('*, jobs(id, title, brand_name, job_type)').eq('creator_id', id).order('applied_at', { ascending: false }).returns<PartRow[]>(),
    sb.from('creator_notes').select('id, body, created_at, author_id, profiles!creator_notes_author_id_fkey(full_name, email)').eq('creator_id', id)
      .order('created_at', { ascending: false }).returns<Note[]>(),
    sb.from('jobs').select('id, title, job_type, fee_type').in('status', ['open', 'draft']).order('created_at', { ascending: false }).returns<InviteJob[]>(),
  ]);
  const counted = (accounts ?? []).filter((a) => a.status !== 'rejected');
  const largest = counted[0]?.followers;
  const name = p.full_name || p.email || '';
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 py-1.5 text-[15px]"><dt className="text-teks-redup">{label}</dt><dd className="text-right font-medium">{value || c('none')}</dd></div>
  );

  return (
    <div className="space-y-5">
      <PageHeader back={{ href: '/admin/creator', label: tn('creators') }} title={name}
        subtitle={[p.city, t('registeredOn', { date: formatDate(p.created_at, locale) })].filter(Boolean).join(' · ')} />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <CardTitle className="mb-2">{t('profileTitle')}</CardTitle>
            <dl className="divide-y divide-garis">
              {row(t('col.email'), p.email)}
              {row(t('col.phone'), decrypt(p.phone_enc))}
              {row(t('col.province'), [p.province, p.city].filter(Boolean).join(' · '))}
              {row(t('col.gender'), [p.gender && tg(p.gender), p.hijab && th(p.hijab)].filter(Boolean).join(' · '))}
              {row(t('col.accountType'), p.account_type && ta(p.account_type))}
              {row(t('col.niches'), p.categories.map((k) => tax.name('niche', k)).join(', '))}
              {row(t('col.persona'), p.persona && tax.name('persona', p.persona))}
              {row(t('address'), decrypt(p.address_enc))}
              {row(t('col.onboarded'), p.onboarded_at ? formatDate(p.onboarded_at, locale) : t('no'))}
              {row(t('col.installed'), p.app_installed_at ? t('yes') : t('no'))}
            </dl>
          </Card>

          <Card className="space-y-3">
            <CardTitle>{t('col.accounts')}</CardTitle>
            {largest !== undefined && <p className="text-[13px] text-teks-redup">{t('sizeLine', { tier: ttier(tierFor(largest)), followers: largest.toLocaleString('id-ID') })}</p>}
            {!accounts?.length && <p className="text-[15px] text-teks-redup">{t('noAccount')}</p>}
            <ul className="space-y-2">
              {(accounts ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 text-[15px]">
                  <a href={a.url} target="_blank" rel="noreferrer" className="font-bold text-nila-800 underline-offset-4 hover:underline">{tp(a.platform)} @{a.username}</a>
                  <span className="text-teks-redup tabular">{a.followers.toLocaleString('id-ID')}</span>
                  <Badge tone={verificationTone[a.status]}>{tv(a.status)}</Badge>
                  {a.reject_reason && <span className="text-[13px] text-teks-redup">{a.reject_reason}</span>}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="space-y-3">
            <CardTitle>{t('historyTitle', { count: parts?.length ?? 0 })}</CardTitle>
            {!parts?.length && <p className="text-[15px] text-teks-redup">{t('historyEmpty')}</p>}
            <ul className="divide-y divide-garis">
              {(parts ?? []).map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <Link href={x.status === 'applied' ? `/admin/job/${x.job_id}` : `/admin/partisipasi/${x.id}`} className="font-bold text-nila-800 underline-offset-4 hover:underline">
                      {x.jobs.title}
                    </Link>
                    <p className="text-[13px] text-teks-redup">
                      {[x.jobs.brand_name, x.work_mode && tt(x.work_mode), formatDate(x.applied_at, locale), x.post_confirmed_at && t('postedOn', { date: formatDate(x.post_confirmed_at, locale) })].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(x.agreed_fee ?? x.proposed_rate) && <span className="font-bold tabular">{formatRupiah((x.agreed_fee ?? x.proposed_rate)!)}</span>}
                    <Badge tone={participationTone[x.status]}>{tps(x.status)}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="space-y-3">
            <CardTitle>{t('inviteToJob')}</CardTitle>
            <InvitePanel jobs={jobs ?? []} creators={[{ id: p.id, name }]} compact />
          </Card>

          <Card className="space-y-3">
            <CardTitle>{t('notesTitle')}</CardTitle>
            <p className="text-[13px] text-teks-redup">{t('notesHint')}</p>
            <ActionForm action={addCreatorNote} resetOnSuccess className="space-y-2">
              <input type="hidden" name="creator_id" value={p.id} />
              <Textarea name="body" rows={3} maxLength={2000} placeholder={t('notePlaceholder')} required aria-label={t('notesTitle')} />
              <FieldError name="body" />
              <SubmitButton variant="outline" size="sm">{t('addNote')}</SubmitButton>
            </ActionForm>
            <ul className="space-y-2">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="rounded-xl bg-latar p-3">
                  <p className="whitespace-pre-line text-[15px]">{n.body}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[13px] text-teks-redup">
                    <span>{[n.profiles?.full_name ?? n.profiles?.email, formatDateTime(n.created_at, locale)].filter(Boolean).join(' · ')}</span>
                    {n.author_id === viewer.id && (
                      <form action={deleteCreatorNote}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="creator_id" value={p.id} />
                        <button type="submit" className="rounded p-1 hover:bg-kertas" aria-label={c('delete')}><Trash2 className="size-4" aria-hidden /></button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
