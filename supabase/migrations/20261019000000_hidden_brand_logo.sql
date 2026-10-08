-- Logo of a disguised brand: kept next to the real name in job_brands, which only staff
-- and invited/approved creators can read, so the logo appears once a creator is accepted.
-- Brands shown by name keep using jobs.brand_logo.

alter table public.job_brands add column logo text
  check (logo is null or logo ~ '^jobs/[0-9a-f-]{36}\.(png|jpg|webp)$');
