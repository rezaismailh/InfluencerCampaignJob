import { describe, expect, it } from 'vitest';
import { REGIONS, citiesOf, isValidRegion, provinceOf } from '@/lib/wilayah';

describe('wilayah', () => {
  it('has every province and regency/city', () => {
    expect(REGIONS).toHaveLength(38);
    expect(REGIONS.reduce((n, r) => n + r.cities.length, 0)).toBe(514);
  });
  it('validates province and city pairs', () => {
    expect(isValidRegion('Jawa Barat', 'Kota Bandung')).toBe(true);
    expect(isValidRegion('Jawa Timur', 'Kota Bandung')).toBe(false);
    expect(citiesOf('Tidak ada')).toEqual([]);
  });
  it('finds the province of a stored city', () => {
    expect(provinceOf('Kota Bandung')).toBe('Jawa Barat');
    expect(provinceOf('Bandung')).toBeNull();
  });
});
