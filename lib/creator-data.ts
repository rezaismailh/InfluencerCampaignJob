import 'server-only';
import type { Viewer } from './auth';
import type { Job, Participation, PayoutRequest, Submission } from './types';

export type PartWithJob = Participation & { jobs: Pick<Job, 'id' | 'title' | 'brand_name' | 'job_type' | 'product_option' | 'platforms' | 'content_deadline' | 'top_days'> };

export async function loadCreatorWork(viewer: Viewer) {
  const [{ data: parts }, { data: requests }, { data: subs }] = await Promise.all([
    viewer.supabase
      .from('participations')
      .select('*, jobs(id, title, brand_name, job_type, product_option, platforms, content_deadline, top_days)')
      .eq('creator_id', viewer.id)
      .order('applied_at', { ascending: false })
      .returns<PartWithJob[]>(),
    viewer.supabase.from('payout_requests').select('*').eq('creator_id', viewer.id).order('requested_at', { ascending: false }).returns<PayoutRequest[]>(),
    viewer.supabase.from('submissions').select('*').returns<Submission[]>(),
  ]);
  return { parts: parts ?? [], requests: requests ?? [], submissions: subs ?? [] };
}
