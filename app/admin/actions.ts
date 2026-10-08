'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { parseRupiah } from '@/lib/money';
import { deliverPending } from '@/lib/notify';
import { PLATFORMS, type Platform } from '@/lib/social';
import { taxonomyKey } from '@/lib/taxonomy';
import { TIERS } from '@/lib/tiers';
import { mentionsBrand } from '@/lib/brand';
import { isBrandIcon, LOGO_PATH } from '@/lib/brand-look';
import { dbErrorKey, type ActionState } from '@/lib/action-state';
import type { VisitLocation } from '@/lib/types';

const text = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');
const optionalInt = (v: FormDataEntryValue | null) => parseRupiah(text(v));

function deliverLater() {
  after(() => deliverPending().catch(() => {}));
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
export async function saveClient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff('curator');
  const name = text(formData.get('name'));
  if (name.length < 2) return { error: 'required', fields: { name: 'required' } };
  const { error } = await viewer.supabase.from('clients').insert({
    name,
    pic: text(formData.get('pic')) || null,
    notes: text(formData.get('notes')) || null,
  });
  if (error) return { error: dbErrorKey(error) };
  revalidatePath('/admin/klien');
  return { ok: true, success: 'saved' };
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
function parseLocations(raw: string): VisitLocation[] {
  return raw
    .split('\n')
    .map((line) => line.split('|').map((s) => s.trim()))
    .filter(([name]) => !!name)
    .map(([name, address, maps_url]) => ({
      name,
      ...(address ? { address } : {}),
      ...(maps_url && /^https?:\/\//.test(maps_url) ? { maps_url } : {}),
    }));
}

const jobSchema = z.object({
  client_id: z.string().uuid().nullable(),
  brand_name: z.string().min(1).max(120),
  title: z.string().min(3).max(160),
  product: z.string().max(160).nullable(),
  job_type: z.enum(['non_visit', 'visit']),
  phase: z.string().max(60).nullable(),
  platforms: z.array(z.enum(PLATFORMS)).min(1),
  deliverables: z.string().min(3),
  brief: z.string().min(3),
  requirements: z.string().nullable(),
  tiers: z.array(z.enum(TIERS)),
  niches: z.array(z.string()),
  personas: z.array(z.string()),
  min_followers: z.number().int().min(0),
  fee_type: z.enum(['fixed', 'open', 'tier']),
  fee: z.number().int().positive().nullable(),
  rate_cap: z.number().int().positive().nullable(),
  quota: z.number().int().positive(),
  review_days: z.number().int().positive().nullable(),
  product_option: z.enum(['shipped', 'self_purchase', 'none']),
  visit_locations: z.array(z.object({ name: z.string(), address: z.string().optional(), maps_url: z.string().optional() })),
  require_purchase_proof: z.boolean(),
  apply_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  content_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  top_days: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  top_mode: z.enum(['days', 'monthly']),
  pay_day: z.number().int().min(1).max(28),
  cutoff_day: z.number().int().min(1).max(28),
  require_insight: z.boolean(),
  status: z.enum(['draft', 'open', 'closed', 'completed']),
}).refine((d) => d.fee_type !== 'fixed' || d.fee !== null, { path: ['fee'], message: 'required' });

export async function saveJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff('curator');
  const id = text(formData.get('id'));
  const parsed = jobSchema.safeParse({
    client_id: text(formData.get('client_id')) || null,
    brand_name: text(formData.get('brand_name')),
    title: text(formData.get('title')),
    product: text(formData.get('product')) || null,
    job_type: text(formData.get('job_type')),
    phase: text(formData.get('phase')) || null,
    platforms: formData.getAll('platforms').map(String),
    deliverables: text(formData.get('deliverables')),
    brief: text(formData.get('brief')),
    requirements: text(formData.get('requirements')) || null,
    tiers: formData.getAll('tiers').map(String),
    niches: formData.getAll('niches').map(String),
    personas: formData.getAll('personas').map(String),
    min_followers: optionalInt(formData.get('min_followers')) ?? 0,
    fee_type: text(formData.get('fee_type')),
    fee: optionalInt(formData.get('fee')),
    rate_cap: optionalInt(formData.get('rate_cap')),
    quota: optionalInt(formData.get('quota')) ?? 0,
    review_days: optionalInt(formData.get('review_days')),
    product_option: text(formData.get('product_option')),
    visit_locations: parseLocations(text(formData.get('visit_locations'))),
    require_purchase_proof: formData.get('require_purchase_proof') === 'on',
    apply_deadline: text(formData.get('apply_deadline')) || null,
    content_deadline: text(formData.get('content_deadline')) || null,
    top_days: Number(text(formData.get('top_days'))),
    top_mode: text(formData.get('top_mode')) === 'monthly' ? 'monthly' : 'days',
    pay_day: optionalInt(formData.get('pay_day')) ?? 21,
    cutoff_day: optionalInt(formData.get('cutoff_day')) ?? 14,
    require_insight: formData.get('require_insight') === 'on',
    status: text(formData.get('status')) || 'draft',
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] = issue.message === 'required' ? 'required' : 'invalid';
    return { error: 'invalid', fields };
  }
  const { data: tax } = await viewer.supabase.from('taxonomy').select('kind, key');
  const known = (kind: string, key: string) => (tax ?? []).some((x) => x.kind === kind && x.key === key);
  if (parsed.data.niches.some((k) => !known('niche', k))) return { error: 'invalid', fields: { niches: 'invalid' } };
  if (parsed.data.personas.some((k) => !known('persona', k))) return { error: 'invalid', fields: { personas: 'invalid' } };

  // Disguised brand: creators (and guests) see the alias until they are invited or approved.
  const realName = parsed.data.brand_name;
  const alias = text(formData.get('brand_display')) === 'alias' ? text(formData.get('brand_alias')) : '';
  if (text(formData.get('brand_display')) === 'alias') {
    if (!alias) return { error: 'invalid', fields: { brand_alias: 'required' } };
    if (mentionsBrand(alias, realName)) return { error: 'brand_in_text', fields: { brand_alias: 'brand_in_text' } };
    const d = parsed.data;
    const publicText: Record<string, string | null> = {
      title: d.title, product: d.product, deliverables: d.deliverables, brief: d.brief, requirements: d.requirements,
      visit_locations: d.visit_locations.map((l) => `${l.name} ${l.address ?? ''}`).join('\n'),
    };
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(publicText)) if (mentionsBrand(value, realName)) fields[key] = 'brand_in_text';
    if (Object.keys(fields).length) return { error: 'brand_in_text', fields };
  }

  // Fee per tier: one amount per offered tier; the tier comes from the largest account or the main platform.
  const tierFees: Record<string, number> = {};
  for (const tier of TIERS) {
    const fee = optionalInt(formData.get(`tier_fee_${tier}`));
    if (fee && fee > 0) tierFees[tier] = fee;
  }
  const tierBasis = text(formData.get('tier_basis')) === 'primary' ? 'primary' : 'largest';
  const primaryPlatform = text(formData.get('primary_platform')) || null;
  if (parsed.data.fee_type === 'tier') {
    if (!Object.keys(tierFees).length) return { error: 'invalid', fields: { tier_fees: 'tier_fee_required' } };
    if (tierBasis === 'primary' && (!primaryPlatform || !parsed.data.platforms.includes(primaryPlatform as Platform))) {
      return { error: 'invalid', fields: { primary_platform: 'primary_platform_required' } };
    }
  }

  // A disguised brand's logo goes next to its real name in job_brands (hidden until a creator
  // is invited or approved); a brand shown by name keeps it on the job itself.
  const logo = text(formData.get('brand_logo'));
  if (logo && !LOGO_PATH.test(logo)) return { error: 'invalid', fields: { brand_logo: 'invalid' } };
  const icon = text(formData.get('brand_icon'));

  const row = { ...parsed.data, brand_name: alias || realName,
    brand_logo: alias ? null : logo || null,
    brand_icon: isBrandIcon(icon) ? icon : 'store',
    fee: parsed.data.fee_type === 'fixed' ? parsed.data.fee : null,
    rate_cap: parsed.data.fee_type === 'open' ? parsed.data.rate_cap : null,
    tier_fees: parsed.data.fee_type === 'tier' ? tierFees : {},
    tier_basis: tierBasis,
    primary_platform: primaryPlatform && parsed.data.platforms.includes(primaryPlatform as Platform) ? primaryPlatform : null };

  const result = id
    ? await viewer.supabase.from('jobs').update(row).eq('id', id).select('id').single()
    : await viewer.supabase.from('jobs').insert({ ...row, created_by: viewer.id }).select('id').single();
  if (result.error) return { error: dbErrorKey(result.error) };
  const brand = alias
    ? await viewer.supabase.from('job_brands').upsert({ job_id: result.data.id, real_name: realName, logo: logo || null })
    : await viewer.supabase.from('job_brands').delete().eq('job_id', result.data.id);
  if (brand.error) return { error: dbErrorKey(brand.error) };
  revalidatePath('/admin/job');
  revalidatePath('/job');
  redirect(`/admin/job/${result.data.id}`);
}

export async function decideApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff('curator');
  const part = text(formData.get('participation_id'));
  const { error } = await viewer.supabase.rpc('decide_application', {
    p_part: part,
    p_approve: text(formData.get('decision')) === 'approve',
    p_fee: optionalInt(formData.get('fee')),
  });
  if (error) return { error: dbErrorKey(error) };
  deliverLater();
  revalidatePath('/admin', 'layout');
  return { ok: true, success: 'updated' };
}

export async function inviteCreator(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff('curator');
  const jobId = text(formData.get('job_id'));
  const email = text(formData.get('email')).toLowerCase();
  const { data: creator } = await viewer.supabase.from('profiles').select('id').eq('role', 'creator').ilike('email', email).maybeSingle();
  if (!creator) return { error: 'inviteNotFound' };
  const { error } = await viewer.supabase.rpc('invite_creator', { p_job: jobId, p_creator: creator.id, p_fee: optionalInt(formData.get('fee')) });
  if (error) return { error: dbErrorKey(error) };
  deliverLater();
  revalidatePath(`/admin/job/${jobId}`);
  return { ok: true, success: 'submitted' };
}

export async function cancelParticipation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff('curator');
  const part = text(formData.get('participation_id'));
  const reason = text(formData.get('reason'));
  if (!reason) return { error: 'reason_required', fields: { reason: 'required' } };
  const { error } = await viewer.supabase.rpc('cancel_participation', { p_part: part, p_reason: reason });
  if (error) return { error: dbErrorKey(error) };
  deliverLater();
  revalidatePath(`/admin/partisipasi/${part}`);
  return { ok: true, success: 'updated' };
}

// ---------------------------------------------------------------------------
// Social accounts
// ---------------------------------------------------------------------------
/** Adds or edits a niche/persona. New items get a key from the Indonesian label; items are deactivated, never deleted. */
export async function saveTaxonomyItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff('curator');
  const kind = text(formData.get('kind'));
  if (kind !== 'niche' && kind !== 'persona') return { error: 'invalid' };
  const labelId = text(formData.get('label_id'));
  if (!labelId || labelId.length > 60) return { error: 'invalid', fields: { label_id: 'required' } };
  const row = { label_id: labelId, label_en: text(formData.get('label_en')) || null };
  const key = text(formData.get('key'));

  if (key) {
    const { error } = await viewer.supabase.from('taxonomy').update({
      ...row,
      active: formData.get('active') === 'on',
      sort: optionalInt(formData.get('sort')) ?? 100,
    }).eq('kind', kind).eq('key', key);
    if (error) return { error: dbErrorKey(error) };
  } else {
    const { data: existing } = await viewer.supabase.from('taxonomy').select('key, sort').eq('kind', kind);
    const keys = new Set((existing ?? []).map((x) => x.key));
    const base = taxonomyKey(labelId);
    let next = base;
    for (let n = 2; keys.has(next); n++) next = `${base.slice(0, 36)}_${n}`;
    const sort = Math.max(0, ...(existing ?? []).map((x) => x.sort)) + 10;
    const { error } = await viewer.supabase.from('taxonomy').insert({ kind, key: next, sort, ...row });
    if (error) return { error: dbErrorKey(error) };
  }
  revalidatePath('/', 'layout');
  return { ok: true, success: 'saved' };
}

export async function verifySocial(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff('curator');
  const approve = text(formData.get('decision')) === 'approve';
  const reason = text(formData.get('reason'));
  if (!approve && !reason) return { error: 'reason_required', fields: { reason: 'required' } };
  const { error } = await viewer.supabase.rpc('verify_social_account', {
    p_id: text(formData.get('id')),
    p_approve: approve,
    p_followers: optionalInt(formData.get('followers')),
    p_reason: reason || null,
  });
  if (error) return { error: dbErrorKey(error) };
  deliverLater();
  revalidatePath('/admin', 'layout');
  return { ok: true, success: 'updated' };
}

// ---------------------------------------------------------------------------
// Reviews, logistics, posting
// ---------------------------------------------------------------------------
export async function reviewSubmission(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff('curator');
  const status = text(formData.get('status'));
  if (!['sent_to_brand', 'approved', 'revision', 'rejected'].includes(status)) return { error: 'invalid' };
  const { error } = await viewer.supabase.rpc('review_submission', {
    p_sub: text(formData.get('submission_id')),
    p_status: status,
    p_tali: text(formData.get('tali_feedback')) || null,
    p_brand: text(formData.get('brand_feedback')) || null,
  });
  if (error) return { error: dbErrorKey(error) };
  deliverLater();
  revalidatePath('/admin', 'layout');
  return { ok: true, success: 'reviewed' };
}

export async function setShipment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff('curator');
  const part = text(formData.get('participation_id'));
  const { error } = await viewer.supabase.rpc('set_shipment', {
    p_part: part,
    p_status: text(formData.get('shipment_status')),
    p_courier: text(formData.get('courier')) || null,
    p_tracking: text(formData.get('tracking_number')) || null,
  });
  if (error) return { error: dbErrorKey(error) };
  deliverLater();
  revalidatePath(`/admin/partisipasi/${part}`);
  return { ok: true, success: 'saved' };
}

export async function setVisit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff('curator');
  const part = text(formData.get('participation_id'));
  const at = text(formData.get('visit_at'));
  if (!at) return { error: 'required', fields: { visit_at: 'required' } };
  const { error } = await viewer.supabase.rpc('set_visit', {
    p_part: part,
    p_location: text(formData.get('visit_location')),
    // datetime-local has no zone; the team works in WIB.
    p_at: `${at}:00+07:00`,
  });
  if (error) return { error: dbErrorKey(error) };
  deliverLater();
  revalidatePath(`/admin/partisipasi/${part}`);
  return { ok: true, success: 'saved' };
}

export async function confirmPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff('curator');
  const part = text(formData.get('participation_id'));
  const { error } = await viewer.supabase.rpc('confirm_post', { p_part: part });
  if (error) return { error: dbErrorKey(error) };
  deliverLater();
  revalidatePath('/admin', 'layout');
  return { ok: true, success: 'updated' };
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------
export async function setPayoutStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff('finance');
  const status = text(formData.get('status'));
  if (!['processing', 'transferred', 'failed'].includes(status)) return { error: 'invalid' };
  const { error } = await viewer.supabase.rpc('set_payout_status', {
    p_req: text(formData.get('id')),
    p_status: status,
    p_transferred_on: text(formData.get('transferred_on')) || null,
    p_note: text(formData.get('note')) || null,
  });
  if (error) return { error: dbErrorKey(error) };
  deliverLater();
  revalidatePath('/admin', 'layout');
  return { ok: true, success: 'updated' };
}

// ---------------------------------------------------------------------------
// Holidays
// ---------------------------------------------------------------------------
export async function addHoliday(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireStaff();
  const day = text(formData.get('day'));
  const name = text(formData.get('name'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !name) return { error: 'required' };
  const { error } = await viewer.supabase.from('holidays').upsert({ day, name });
  if (error) return { error: dbErrorKey(error) };
  revalidatePath('/admin/libur');
  return { ok: true, success: 'saved' };
}

export async function removeHoliday(formData: FormData) {
  const viewer = await requireStaff();
  await viewer.supabase.from('holidays').delete().eq('day', text(formData.get('day')));
  revalidatePath('/admin/libur');
}
