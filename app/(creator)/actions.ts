'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { requireCreator, safeNext } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';
import { parseRupiah } from '@/lib/money';
import { deliverPending } from '@/lib/notify';
import { PLATFORMS, postMatchesAccounts, profileFromInput, type Platform } from '@/lib/social';
import { isValidRegion } from '@/lib/wilayah';
import { dbErrorKey, type ActionState } from '@/lib/action-state';

const CATEGORIES = ['food', 'beauty', 'fashion', 'lifestyle', 'tech', 'travel', 'parenting', 'gaming', 'health', 'finance', 'education', 'entertainment'];
const PERSONAS = ['genz', 'student', 'foodies', 'lifestyle', 'parent', 'professional', 'other'];

const text = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');

function deliverLater() {
  after(() => deliverPending().catch(() => {}));
}

// ---------------------------------------------------------------------------
// Profile & onboarding
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  full_name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/),
  province: z.string().min(1),
  city: z.string().min(1),
  categories: z.array(z.enum(CATEGORIES)).max(3),
  persona: z.enum(PERSONAS).nullable(),
  address: z.string().max(500),
});

// Field order on the form, so missing items are listed (and scrolled to) top-down.
const MAX_SOCIAL_ROWS = 10;
const PROFILE_FIELDS = ['full_name', 'phone', 'province', 'city', 'categories', 'persona', 'address'] as const;
const FIELD_LABEL: Record<string, string> = {
  full_name: 'fullName', phone: 'phone', province: 'province', city: 'city', categories: 'categories',
  persona: 'persona', address: 'address', social: 'socialLabel',
};

async function socialCount(viewer: Awaited<ReturnType<typeof requireCreator>>) {
  const { count } = await viewer.supabase.from('social_accounts').select('id', { count: 'exact', head: true }).eq('creator_id', viewer.id);
  return count ?? 0;
}

/**
 * Saves the profile. With finish=1 (the onboarding "Done" button) it also checks
 * that there is a social account, then completes onboarding and continues to the
 * job list or the job the creator came from.
 */
export async function saveProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCreator({ allowIncomplete: true });
  const finish = text(formData.get('finish')) === '1';
  const parsed = profileSchema.safeParse({
    full_name: text(formData.get('full_name')),
    phone: text(formData.get('phone')).replace(/[\s-]/g, ''),
    province: text(formData.get('province')),
    city: text(formData.get('city')),
    categories: formData.getAll('categories').map(String),
    persona: text(formData.get('persona')) || null,
    address: text(formData.get('address')),
  });

  const problems: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      problems[key] = key === 'categories' ? 'max_categories' : issue.code === 'too_small' && Number(issue.minimum) <= 2 ? 'required' : 'invalid';
    }
  } else if (!isValidRegion(parsed.data.province, parsed.data.city)) {
    problems.city = 'required';
  }
  // New social accounts, one row per social_<field>_<index>; fully empty rows are ignored.
  const rowKeys: string[] = [];
  const newAccounts: { creator_id: string; platform: Platform; url: string; username: string; followers: number }[] = [];
  for (let i = 0; i < MAX_SOCIAL_ROWS && formData.has(`social_platform_${i}`); i++) {
    const platform = text(formData.get(`social_platform_${i}`));
    const link = text(formData.get(`social_link_${i}`));
    const followersText = text(formData.get(`social_followers_${i}`));
    if (!link && !followersText) continue;
    const keys = { platform: `social_platform_${i}`, link: `social_link_${i}`, followers: `social_followers_${i}` };
    rowKeys.push(keys.platform, keys.link, keys.followers);
    if (!(PLATFORMS as readonly string[]).includes(platform)) { problems[keys.platform] = 'required'; continue; }
    const profile = profileFromInput(platform as Platform, link);
    if (!profile.ok) problems[keys.link] = profile.error;
    const followers = parseRupiah(followersText);
    if (followers === null) problems[keys.followers] = 'required';
    if (profile.ok && followers !== null) {
      newAccounts.push({ creator_id: viewer.id, platform: platform as Platform, url: profile.url, username: profile.username, followers });
    }
  }
  if (finish && !newAccounts.length && !rowKeys.some((k) => problems[k]) && !(await socialCount(viewer))) problems.social = 'needSocial';

  if (Object.keys(problems).length) {
    const t = await getTranslations('onboarding');
    const fields: Record<string, string> = {};
    for (const key of [...PROFILE_FIELDS, ...rowKeys, 'social']) if (problems[key]) fields[key] = problems[key];
    const label = (key: string) => {
      const row = /^social_(platform|link|followers)_(\d+)$/.exec(key);
      return row ? t('socialRowField', { n: Number(row[2]) + 1, field: t(`socialField_${row[1]}`) }) : t(FIELD_LABEL[key]);
    };
    return { error: finish ? 'incomplete' : 'invalid', fields, missing: Object.keys(fields).map(label) };
  }

  if (newAccounts.length) {
    const { error } = await viewer.supabase.from('social_accounts').insert(newAccounts);
    if (error) return { error: dbErrorKey(error) === 'duplicate' ? 'social_duplicate' : dbErrorKey(error) };
  }

  const d = parsed.data!;
  const { error } = await viewer.supabase.from('profiles').update({
    full_name: d.full_name,
    phone_enc: encrypt(d.phone),
    province: d.province,
    city: d.city,
    categories: d.categories,
    persona: d.persona,
    address_enc: d.address ? encrypt(d.address) : null,
    ...(finish ? { onboarded_at: new Date().toISOString() } : {}),
  }).eq('id', viewer.id);
  if (error) return { error: dbErrorKey(error) };
  revalidatePath('/', 'layout');
  if (finish) redirect(safeNext(text(formData.get('next'))) ?? '/job');
  return { ok: true, success: 'saved' };
}

export async function removeSocialAccount(formData: FormData) {
  const viewer = await requireCreator({ allowIncomplete: true });
  await viewer.supabase.from('social_accounts').delete().eq('id', text(formData.get('id'))).eq('creator_id', viewer.id);
  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
export async function applyToJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCreator();
  const jobId = text(formData.get('job_id'));
  const rate = parseRupiah(text(formData.get('rate')));
  const { error } = await viewer.supabase.rpc('apply_to_job', { p_job: jobId, p_rate: rate });
  if (error) return { error: dbErrorKey(error) };
  revalidatePath(`/job/${jobId}`);
  revalidatePath('/beranda');
  return { ok: true, success: 'applied' };
}

export async function respondInvite(formData: FormData) {
  const viewer = await requireCreator();
  const id = text(formData.get('id'));
  await viewer.supabase.rpc('respond_invite', { p_part: id, p_accept: formData.get('accept') === '1' });
  revalidatePath('/', 'layout');
  redirect(`/partisipasi/${id}`);
}

// ---------------------------------------------------------------------------
// Work on a participation
// ---------------------------------------------------------------------------
export async function submitItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCreator();
  const part = text(formData.get('participation_id'));
  const kind = text(formData.get('kind'));
  if (!['storyline', 'draft', 'caption'].includes(kind)) return { error: 'invalid' };
  let photos: string[] = [];
  try {
    const raw = JSON.parse(text(formData.get('photos')) || '[]');
    photos = Array.isArray(raw) ? raw.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return { error: 'invalid_path' };
  }
  const { error } = await viewer.supabase.rpc('submit_item', {
    p_part: part,
    p_kind: kind,
    p_content: text(formData.get('content')) || null,
    p_photos: photos,
  });
  if (error) return { error: dbErrorKey(error) };
  revalidatePath(`/partisipasi/${part}`);
  return { ok: true, success: 'submitted' };
}

export async function submitPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCreator();
  const part = text(formData.get('participation_id'));
  const url = text(formData.get('post_url'));
  const postedOn = text(formData.get('posted_on'));
  const { data: accounts } = await viewer.supabase.from('social_accounts').select('platform, username').eq('creator_id', viewer.id);
  const matches = postMatchesAccounts(url, accounts ?? []);
  const { error } = await viewer.supabase.rpc('submit_post', {
    p_part: part,
    p_url: url,
    p_posted_on: postedOn || null,
    p_matches: matches,
  });
  if (error) return { error: dbErrorKey(error) };
  revalidatePath(`/partisipasi/${part}`);
  return { ok: true, success: 'submitted' };
}

export async function setShippingAddress(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCreator();
  const part = text(formData.get('participation_id'));
  const address = text(formData.get('address'));
  if (address.length < 10) return { error: 'required', fields: { address: 'required' } };
  const { error } = await viewer.supabase.rpc('set_shipping_address', { p_part: part, p_address_enc: encrypt(address) });
  if (error) return { error: dbErrorKey(error) };
  revalidatePath(`/partisipasi/${part}`);
  return { ok: true, success: 'saved' };
}

export async function markReceived(formData: FormData) {
  const viewer = await requireCreator();
  const part = text(formData.get('participation_id'));
  await viewer.supabase.rpc('mark_product_received', { p_part: part });
  revalidatePath(`/partisipasi/${part}`);
}

export async function setPurchaseProof(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCreator();
  const part = text(formData.get('participation_id'));
  let path = '';
  try {
    path = (JSON.parse(text(formData.get('photos')) || '[]') as string[])[0] ?? '';
  } catch {
    return { error: 'invalid_path' };
  }
  const { error } = await viewer.supabase.rpc('set_purchase_proof', { p_part: part, p_path: path });
  if (error) return { error: dbErrorKey(error) };
  revalidatePath(`/partisipasi/${part}`);
  return { ok: true, success: 'saved' };
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------
const accountSchema = z.object({
  bank_name: z.string().min(2).max(60),
  account_number: z.string().regex(/^[0-9]{6,20}$/),
  holder_name: z.string().min(2).max(100),
});

export async function savePayoutAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCreator();
  const parsed = accountSchema.safeParse({
    bank_name: text(formData.get('bank_name')),
    account_number: text(formData.get('account_number')).replace(/[\s-]/g, ''),
    holder_name: text(formData.get('holder_name')),
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] = 'invalid';
    return { error: 'invalid', fields };
  }
  const d = parsed.data;
  const { error } = await viewer.supabase.from('payout_accounts').upsert({
    creator_id: viewer.id,
    bank_name: d.bank_name,
    account_number_enc: encrypt(d.account_number),
    account_last4: d.account_number.slice(-4),
    holder_name: d.holder_name,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: dbErrorKey(error) };
  revalidatePath('/saldo');
  return { ok: true, success: 'saved' };
}

export async function requestPayout(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCreator();
  const ids = formData.getAll('participation_ids').map(String).filter(Boolean);
  const { error } = await viewer.supabase.rpc('request_payout', { p_parts: ids });
  if (error) return { error: dbErrorKey(error) };
  deliverLater();
  revalidatePath('/', 'layout');
  return { ok: true, success: 'submitted' };
}
