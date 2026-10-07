import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile, Role } from './types';

export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single<Profile>();
  if (!profile) return null;
  return { id, supabase, profile };
});

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export const isStaffRole = (role: Role) => role !== 'creator';
export const canCurate = (role: Role) => role === 'curator' || role === 'owner';
export const canFinance = (role: Role) => role === 'finance' || role === 'owner';

/** A same-site path to continue to after login or onboarding, or null. */
export function safeNext(next: string | null | undefined): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export function homeFor(role: Role) {
  return isStaffRole(role) ? '/admin' : '/beranda';
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect('/masuk');
  return viewer;
}

/** Creator pages. Staff go to the admin area; creators who have not finished onboarding go there first. */
export async function requireCreator({ allowIncomplete = false } = {}): Promise<Viewer> {
  const viewer = await requireViewer();
  if (isStaffRole(viewer.profile.role)) redirect('/admin');
  if (!allowIncomplete && !viewer.profile.onboarded_at) redirect('/onboarding');
  return viewer;
}

export async function requireStaff(need?: 'curator' | 'finance'): Promise<Viewer> {
  const viewer = await requireViewer();
  const role = viewer.profile.role;
  if (!isStaffRole(role)) redirect('/beranda');
  if (need === 'curator' && !canCurate(role)) redirect('/admin');
  if (need === 'finance' && !canFinance(role)) redirect('/admin');
  return viewer;
}
