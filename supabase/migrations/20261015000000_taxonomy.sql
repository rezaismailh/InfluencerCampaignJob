-- Niches and personas become data the Tali team manages in the admin (instead of
-- lists in the code), and jobs can target niches. Labels are stored per language.
-- Items are deactivated rather than deleted, so profiles and jobs keep their labels.

create type public.taxonomy_kind as enum ('niche', 'persona');

create table public.taxonomy (
  kind public.taxonomy_kind not null,
  key text not null check (key ~ '^[a-z0-9_]{1,40}$'),
  label_id text not null check (length(trim(label_id)) > 0),
  label_en text,
  sort integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (kind, key)
);

alter table public.taxonomy enable row level security;
grant select on public.taxonomy to anon, authenticated;
create policy taxonomy_select on public.taxonomy for select using (active or public.is_staff());
create policy taxonomy_insert on public.taxonomy for insert with check (public.is_curator());
create policy taxonomy_update on public.taxonomy for update using (public.is_curator()) with check (public.is_curator());

insert into public.taxonomy (kind, key, label_id, label_en, sort) values
  ('niche', 'food', 'Kuliner', 'Food', 10),
  ('niche', 'beauty', 'Kecantikan', 'Beauty', 20),
  ('niche', 'fashion', 'Fashion', 'Fashion', 30),
  ('niche', 'lifestyle', 'Lifestyle', 'Lifestyle', 40),
  ('niche', 'tech', 'Teknologi', 'Tech', 50),
  ('niche', 'travel', 'Travel', 'Travel', 60),
  ('niche', 'parenting', 'Parenting', 'Parenting', 70),
  ('niche', 'gaming', 'Gaming', 'Gaming', 80),
  ('niche', 'health', 'Kesehatan', 'Health', 90),
  ('niche', 'finance', 'Keuangan', 'Finance', 100),
  ('niche', 'education', 'Edukasi', 'Education', 110),
  ('niche', 'entertainment', 'Hiburan', 'Entertainment', 120),
  ('persona', 'genz', 'Gen Z', 'Gen Z', 10),
  ('persona', 'student', 'Pelajar/mahasiswa', 'Student', 20),
  ('persona', 'foodies', 'Foodies', 'Foodies', 30),
  ('persona', 'lifestyle', 'Lifestyle', 'Lifestyle', 40),
  ('persona', 'parent', 'Orang tua', 'Parent', 50),
  ('persona', 'professional', 'Profesional', 'Professional', 60),
  ('persona', 'other', 'Lainnya', 'Other', 70)
on conflict (kind, key) do nothing;

alter table public.jobs add column niches text[] not null default '{}';

-- Public job teaser now includes the target niches.
drop function public.public_open_jobs(uuid);
create function public.public_open_jobs(p_id uuid default null)
returns table (
  id uuid,
  brand_name text,
  title text,
  product text,
  job_type public.job_type,
  platforms public.social_platform[],
  deliverables text,
  requirements text,
  tiers text[],
  niches text[],
  personas text[],
  min_followers integer,
  fee_type public.fee_type,
  fee integer,
  rate_cap integer,
  quota integer,
  review_days integer,
  product_option public.product_option,
  visit_location_names text[],
  require_purchase_proof boolean,
  apply_deadline date,
  content_deadline date,
  top_days integer,
  created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select j.id, j.brand_name, j.title, j.product, j.job_type, j.platforms, j.deliverables, j.requirements,
         j.tiers, j.niches, j.personas, j.min_followers, j.fee_type, j.fee, j.rate_cap, j.quota, j.review_days,
         j.product_option,
         array(select loc ->> 'name' from jsonb_array_elements(j.visit_locations) loc where loc ? 'name'),
         j.require_purchase_proof, j.apply_deadline, j.content_deadline, j.top_days, j.created_at
  from public.jobs j
  where j.status = 'open' and (p_id is null or j.id = p_id)
  order by j.created_at desc
$$;

revoke execute on function public.public_open_jobs(uuid) from public;
grant execute on function public.public_open_jobs(uuid) to anon, authenticated;
