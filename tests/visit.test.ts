import { describe, expect, it } from 'vitest';
import { modeFee, traitCheck, workMode } from '@/lib/visit';
import type { Job } from '@/lib/types';

const both = { job_type: 'both', fee_type: 'fixed', fee: 100000, fee_visit: 200000, tier_fees: { nano: 150000 }, tier_fees_visit: { nano: 250000 } } as unknown as Job;

describe('modeFee (mirrors public.mode_fee)', () => {
  it('picks the fee for the work mode', () => {
    expect(modeFee(both, 'non_visit', null)).toBe(100000);
    expect(modeFee(both, 'visit', null)).toBe(200000);
    const tier = { ...both, fee_type: 'tier' } as Job;
    expect(modeFee(tier, 'visit', 'nano')).toBe(250000);
    expect(modeFee(tier, 'visit', 'micro')).toBeNull();
    const open = { ...both, fee_type: 'open' } as Job;
    expect(modeFee(open, 'visit', null, { proposed_rate: 1, proposed_rate_visit: 2 })).toBe(2);
  });
  it('uses the normal fee on single-mode jobs', () => {
    expect(modeFee({ ...both, job_type: 'visit' } as Job, 'visit', null)).toBe(100000);
  });
  it('reads the work mode', () => {
    expect(workMode({ job_type: 'visit' })).toBe('visit');
    expect(workMode({ job_type: 'both' })).toBeNull();
    expect(workMode({ job_type: 'both' }, { work_mode: 'visit' })).toBe('visit');
  });
});

describe('traitCheck (mirrors apply_to_job)', () => {
  const job = { genders: ['female'], hijab: 'hijab', account_types: ['personal'] } as unknown as Job;
  const none = { gender: null, hijab: null, account_type: null };
  it('lists what is missing', () => {
    expect(traitCheck(job, none)).toEqual({ missing: ['gender', 'hijab', 'account_type'], ineligible: null });
    expect(traitCheck(job, { ...none, gender: 'female', hijab: 'hijab' })).toEqual({ missing: ['account_type'], ineligible: null });
  });
  it('rules out a mismatch', () => {
    expect(traitCheck(job, { ...none, gender: 'male' }).ineligible).toBe('gender');
    expect(traitCheck(job, { ...none, gender: 'female', hijab: 'non_hijab' }).ineligible).toBe('hijab');
    expect(traitCheck(job, { gender: 'female', hijab: 'hijab', account_type: 'couple' }).ineligible).toBe('account_type');
  });
  it('asks nothing when the job has no trait requirements', () => {
    expect(traitCheck({ genders: [], hijab: null, account_types: [] } as unknown as Job, none)).toEqual({ missing: [], ineligible: null });
  });
});
