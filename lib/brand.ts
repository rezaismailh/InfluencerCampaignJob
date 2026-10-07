// Disguised brands: jobs.brand_name is what creators see before they are invited
// or approved; the real name comes from job_brands, which RLS only returns to
// staff and to those creators.

export type BrandEmbed = { real_name: string } | { real_name: string }[] | null | undefined;

export function realBrand(job: { job_brands?: BrandEmbed }): string | null {
  const jb = job.job_brands;
  return (Array.isArray(jb) ? jb[0]?.real_name : jb?.real_name) ?? null;
}

/** The brand name this viewer may see: the real one when RLS returned it, otherwise the public name. */
export function visibleBrand(job: { brand_name: string; job_brands?: BrandEmbed }): string {
  return realBrand(job) ?? job.brand_name;
}

/** Words of the real brand name that must not appear in a disguised job's public text. */
export function mentionsBrand(textValue: string | null | undefined, brand: string): boolean {
  const name = brand.trim().toLowerCase();
  if (name.length < 3 || !textValue) return false;
  return textValue.toLowerCase().includes(name);
}
