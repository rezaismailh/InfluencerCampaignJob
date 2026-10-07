import { describe, expect, it } from 'vitest';
import { mentionsBrand, realBrand, visibleBrand } from '@/lib/brand';

describe('brand helpers', () => {
  it('reads the embedded real name as object or array', () => {
    expect(realBrand({ job_brands: { real_name: 'Nissin' } })).toBe('Nissin');
    expect(realBrand({ job_brands: [{ real_name: 'Nissin' }] })).toBe('Nissin');
    expect(realBrand({ job_brands: null })).toBeNull();
    expect(realBrand({ job_brands: [] })).toBeNull();
  });
  it('falls back to the public name', () => {
    expect(visibleBrand({ brand_name: 'Brand snack nasional', job_brands: null })).toBe('Brand snack nasional');
    expect(visibleBrand({ brand_name: 'Brand snack nasional', job_brands: { real_name: 'Nissin' } })).toBe('Nissin');
  });
  it('detects the brand in text, case-insensitively', () => {
    expect(mentionsBrand('Review NISSIN wafer', 'Nissin')).toBe(true);
    expect(mentionsBrand('Review wafer coklat', 'Nissin')).toBe(false);
    expect(mentionsBrand('ab cd', 'ab')).toBe(false);
    expect(mentionsBrand(null, 'Nissin')).toBe(false);
  });
});
