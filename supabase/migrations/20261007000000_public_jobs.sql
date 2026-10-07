-- Public job listing: signed-out visitors can browse open jobs, but only a
-- teaser. The full brief and visit addresses stay behind login.

-- Supabase grants table access to anon by default, and jobs_select lets any
-- caller read open jobs. Close that: signed-out reads go through the function below.
revoke select on public.jobs from anon;

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
         j.tiers, j.personas, j.min_followers, j.fee_type, j.fee, j.rate_cap, j.quota, j.review_days,
         j.product_option,
         array(select loc ->> 'name' from jsonb_array_elements(j.visit_locations) loc where loc ? 'name'),
         j.require_purchase_proof, j.apply_deadline, j.content_deadline, j.top_days, j.created_at
  from public.jobs j
  where j.status = 'open' and (p_id is null or j.id = p_id)
  order by j.created_at desc
$$;

revoke execute on function public.public_open_jobs(uuid) from public;
grant execute on function public.public_open_jobs(uuid) to anon, authenticated;
