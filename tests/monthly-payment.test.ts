import { describe, expect, it } from 'vitest';
import { monthlyPaymentExample, monthlyReadyDate } from '@/lib/dates';
import { isBrandIcon, logoUrl } from '@/lib/brand-look';

describe('monthlyReadyDate (mirrors public.ready_date)', () => {
  it('pays this month up to and including the cut-off', () => {
    expect(monthlyReadyDate('2026-10-14', 21, 14)).toBe('2026-10-21');
    expect(monthlyReadyDate('2026-10-15', 21, 14)).toBe('2026-11-21');
  });
  it('rolls over the year', () => {
    expect(monthlyReadyDate('2026-12-20', 21, 14)).toBe('2027-01-21');
  });
  it('never returns a pay day before the reference date', () => {
    // Cut-off after the pay day: sent on the 10th, pay day the 5th has passed.
    expect(monthlyReadyDate('2026-10-10', 5, 25)).toBe('2026-11-05');
  });
});

describe('monthlyPaymentExample', () => {
  it('uses this month while the cut-off has not passed', () => {
    expect(monthlyPaymentExample('2026-10-08', 21, 14)).toEqual({ cutoff: '2026-10-14', before: '2026-10-21', after: '2026-11-21' });
  });
  it('moves to next month after the cut-off', () => {
    expect(monthlyPaymentExample('2026-10-20', 21, 14)).toEqual({ cutoff: '2026-11-14', before: '2026-11-21', after: '2026-12-21' });
  });
});

describe('brand look', () => {
  it('only builds URLs for uploaded paths', () => {
    expect(logoUrl('jobs/2b1e6f0a-1111-2222-3333-444455556666.png')).toContain('/storage/v1/object/public/brand-logos/jobs/');
    expect(logoUrl('../secret.png')).toBeNull();
    expect(isBrandIcon('food')).toBe(true);
    expect(isBrandIcon('rocket')).toBe(false);
  });
});
