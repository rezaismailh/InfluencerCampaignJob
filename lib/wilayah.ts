// Indonesian provinces and their regencies/cities (38 provinces, 514 kabupaten/kota),
// generated from the idn-area-data package (data: Kemendagri codes, ODbL).
import data from './wilayah.json';

export type Region = { province: string; cities: string[] };

export const REGIONS = data as Region[];

export function citiesOf(province: string): string[] {
  return REGIONS.find((r) => r.province === province)?.cities ?? [];
}

export function isValidRegion(province: string, city: string): boolean {
  return citiesOf(province).includes(city);
}

/** The province a stored city belongs to, for profiles saved before the province field existed. */
export function provinceOf(city: string | null): string | null {
  if (!city) return null;
  return REGIONS.find((r) => r.cities.includes(city))?.province ?? null;
}
