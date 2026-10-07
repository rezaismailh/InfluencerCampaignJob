'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { parseRupiah } from '@/lib/money';
import { deliverPending } from '@/lib/notify';
import { PLATFORMS } from '@/lib/social';
import { mentionsBrand } from '@/lib/brand';
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
  tiers: z.array(z.enum(['nano', 'micro'])),
  personas: z.array(z.string()),
  min_followers: z.number().int().min(0),
  fee_type: z.enum(['fixed', 'open']),
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
  status: z.enum(['draft', 'open', 'closed', 'completed']),
}).refine((d) => d.fee_type === 'open' || d.fee !== null, { path: ['fee'], message: 'required' });

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
    status: text(formData.get('status')) || 'draft',
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] = issue.message === 'required' ? 'required' : 'invalid';
    return { error: 'invalid', fields };
  }
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

  const row = { ...parsed.data, brand_name: alias || realName,
    fee: parsed.data.fee_type === 'fixed' ? parsed.data.fee : null,
    rate_cap: parsed.data.fee_type === 'open' ? parsed.data.rate_cap : null };

  const result = id
    ? await viewer.supabase.from('jobs').update(row).eq('id', id).select('id').single()
    : await viewer.supabase.from('jobs').insert({ ...row, created_by: viewer.id }).select('id').single();
  if (result.error) return { error: dbErrorKey(result.error) };
  const brand = alias
    ? await viewer.supabase.from('job_brands').upsert({ job_id: result.data.id, real_name: realName })
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
