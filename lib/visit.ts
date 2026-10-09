import type { AccountType, Gender, Hijab, Job, Participation, Profile, WorkMode } from './types';
import type { Tier } from './tiers';

// Jobs can offer non-visit work, visit work, or both. For "both" the curator picks the
// mode when accepting, and each mode has its own fee. Mirrors public.mode_fee.

export const GENDERS: Gender[] = ['female', 'male'];
export const HIJAB: Hijab[] = ['hijab', 'non_hijab'];
export const ACCOUNT_TYPES: AccountType[] = ['personal', 'couple', 'family', 'group'];

export function offersVisit(job: Pick<Job, 'job_type'>): boolean {
  return job.job_type !== 'non_visit';
}

/** How this participation is carried out; null while a "both" job has not picked a mode yet. */
export function workMode(job: Pick<Job, 'job_type'>, part?: Pick<Participation, 'work_mode'> | null): WorkMode | null {
  return job.job_type === 'both' ? (part?.work_mode ?? null) : job.job_type;
}

type FeeJob = Pick<Job, 'job_type' | 'fee_type' | 'fee' | 'fee_visit' | 'tier_fees' | 'tier_fees_visit'>;

/** Default fee for a mode: the fixed fee, the tier's fee, or the proposed rate. */
export function modeFee(job: FeeJob, mode: WorkMode, tier: Tier | null, part?: Pick<Participation, 'proposed_rate' | 'proposed_rate_visit'> | null): number | null {
  const visit = mode === 'visit' && job.job_type === 'both';
  if (job.fee_type === 'fixed') return (visit ? job.fee_visit : job.fee) ?? null;
  if (job.fee_type === 'tier') return tier ? ((visit ? job.tier_fees_visit : job.tier_fees) ?? {})[tier] ?? null : null;
  return (visit ? part?.proposed_rate_visit : part?.proposed_rate) ?? null;
}

export type Trait = 'gender' | 'hijab' | 'account_type';
export type TraitCheck = { missing: Trait[]; ineligible: Trait | null };

/**
 * What a job's trait requirements mean for this profile, in the order apply_to_job checks them:
 * traits still to fill in, or the first one that rules the creator out.
 */
export function traitCheck(
  job: Pick<Job, 'genders' | 'hijab' | 'account_types'>,
  profile: Pick<Profile, 'gender' | 'hijab' | 'account_type'>,
): TraitCheck {
  const missing: Trait[] = [];
  const needsGender = (job.genders?.length ?? 0) > 0 || !!job.hijab;
  if (needsGender) {
    if (!profile.gender) missing.push('gender');
    else if ((job.genders?.length && !job.genders.includes(profile.gender)) || (job.hijab && profile.gender !== 'female')) {
      return { missing: [], ineligible: 'gender' };
    }
  }
  if (job.hijab && profile.gender !== 'male') {
    if (!profile.hijab) missing.push('hijab');
    else if (profile.hijab !== job.hijab) return { missing: [], ineligible: 'hijab' };
  }
  if (job.account_types?.length) {
    if (!profile.account_type) missing.push('account_type');
    else if (!job.account_types.includes(profile.account_type)) return { missing: [], ineligible: 'account_type' };
  }
  return { missing, ineligible: null };
}
