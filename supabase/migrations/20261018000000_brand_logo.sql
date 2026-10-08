-- Brand look on job cards: an uploaded logo when the brand is shown by name, or a
-- category icon standing in for a disguised brand (a logo would give the name away).

alter table public.jobs
  add column brand_logo text,
  add column brand_icon text not null default 'store';

-- Paths come from the admin upload: brand-logos/jobs/<uuid>.<ext>.
alter table public.jobs add constraint jobs_brand_logo_path
  check (brand_logo is null or brand_logo ~ '^jobs/[0-9a-f-]{36}\.(png|jpg|webp)$');
alter table public.jobs add constraint jobs_brand_icon_known
  check (brand_icon in ('store', 'food', 'drink', 'beauty', 'fashion', 'tech', 'home', 'health', 'baby', 'travel', 'sport', 'fun'));

-- Public bucket: logos sit on public job pages, so anyone may read them; only staff upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-logos', 'brand-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy brand_logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-logos' and public.is_staff());
create policy brand_logos_update on storage.objects for update to authenticated
  using (bucket_id = 'brand-logos' and public.is_staff());
create policy brand_logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'brand-logos' and public.is_staff());

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
  tier_fees jsonb,
  tier_basis text,
  primary_platform public.social_platform,
  quota integer,
  review_days integer,
  product_option public.product_option,
  visit_location_names text[],
  require_purchase_proof boolean,
  apply_deadline date,
  content_deadline date,
  top_days integer,
  top_mode text,
  pay_day smallint,
  cutoff_day smallint,
  require_insight boolean,
  brand_logo text,
  brand_icon text,
  created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select j.id, j.brand_name, j.title, j.product, j.job_type, j.platforms, j.deliverables, j.requirements,
         j.tiers, j.niches, j.personas, j.min_followers, j.fee_type, j.fee, j.rate_cap, j.tier_fees, j.tier_basis, j.primary_platform, j.quota, j.review_days,
         j.product_option,
         array(select loc ->> 'name' from jsonb_array_elements(j.visit_locations) loc where loc ? 'name'),
         j.require_purchase_proof, j.apply_deadline, j.content_deadline, j.top_days, j.top_mode, j.pay_day, j.cutoff_day, j.require_insight,
         j.brand_logo, j.brand_icon, j.created_at
  from public.jobs j
  where j.status = 'open' and (p_id is null or j.id = p_id)
  order by j.created_at desc
$$;

revoke execute on function public.public_open_jobs(uuid) from public;
grant execute on function public.public_open_jobs(uuid) to anon, authenticated;
