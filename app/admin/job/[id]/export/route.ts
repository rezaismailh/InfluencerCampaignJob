import { NextResponse, type NextRequest } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth';
import { applicantSheet, exportFileName, type ExportRow } from '@/lib/applicant-export';
import { decrypt } from '@/lib/crypto';
import { todayWib } from '@/lib/dates';
import { loadTaxonomy } from '@/lib/taxonomy';
import { xlsx } from '@/lib/xlsx';
import type { Job, Profile, SocialAccount } from '@/lib/types';

/**
 * Applicant spreadsheet for a job. Default: applicants still waiting, without contact
 * details, safe to send to the client for curation. ?internal=1: everyone on the job,
 * with email and WhatsApp, for the Tali team only.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireStaff('curator');
  const internal = request.nextUrl.searchParams.get('internal') === '1';

  const { data: job } = await viewer.supabase.from('jobs').select('*').eq('id', id).maybeSingle<Job>();
  if (!job) return new NextResponse('Not found', { status: 404 });
  let query = viewer.supabase.from('participations')
    .select('*, profiles!participations_creator_id_fkey(full_name, city, email, persona, categories, phone_enc)')
    .eq('job_id', id).order('applied_at');
  if (!internal) query = query.eq('status', 'applied');
  const { data } = await query.returns<(Omit<ExportRow, 'profiles'> & { profiles: ExportRow['profiles'] & Pick<Profile, 'phone_enc'> })[]>();
  // Contact details leave the server only in the internal export.
  const rows: ExportRow[] = (data ?? []).map(({ profiles: { phone_enc, ...profile }, ...r }) => ({
    ...r,
    profiles: { ...profile, phone: internal ? decrypt(phone_enc) : null },
  }));
  const creatorIds = rows.map((r) => r.creator_id);
  const { data: accounts } = creatorIds.length
    ? await viewer.supabase.from('social_accounts').select('*').in('creator_id', creatorIds).returns<SocialAccount[]>()
    : { data: [] as SocialAccount[] };

  const t = await getTranslations('admin.export');
  const tp = await getTranslations('platform');
  const ttier = await getTranslations('tier');
  const tv = await getTranslations('verification');
  const tps = await getTranslations('participationStatus');
  const tax = await loadTaxonomy();
  const { header, body, widths } = applicantSheet(job, rows, accounts ?? [], {
    no: t('no'), id: t('id'), name: t('name'), city: t('city'), niche: t('niche'), persona: t('persona'), tier: t('tier'),
    username: (p) => t('username', { platform: p }), link: (p) => t('link', { platform: p }),
    followers: (p) => t('followers', { platform: p }), accountStatus: (p) => t('accountStatus', { platform: p }),
    fee: job.fee_type === 'open' ? t('proposedRate') : t('fee'), appliedAt: t('appliedAt'), status: t('status'),
    email: t('email'), whatsapp: t('whatsapp'), clientDecision: t('clientDecision'), clientNote: t('clientNote'),
    platform: (p) => tp(p), tierName: (x) => ttier(x), verification: (s) => tv(s), participation: (s) => tps(s),
    nicheName: (k) => tax.name('niche', k), personaName: (k) => tax.name('persona', k),
  }, internal);

  const file = xlsx(t('sheetName'), header, body, widths);
  return new NextResponse(file as BodyInit, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${exportFileName(job.title, todayWib(), internal)}"`,
      'cache-control': 'private, no-store',
    },
  });
}
