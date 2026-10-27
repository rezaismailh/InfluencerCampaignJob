-- Short share links: every job gets a 6-character code, opened at /j/<code>.
-- Letters and digits that are easy to read aloud and retype (no 0/o, 1/l/i).

create function public.new_job_code()
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.jobs where short_code = code);
  end loop;
  return code;
end;
$$;

-- Existing jobs get their own code: a volatile default is evaluated per row.
alter table public.jobs add column short_code text;
update public.jobs set short_code = public.new_job_code() where short_code is null;
alter table public.jobs
  alter column short_code set default public.new_job_code(),
  alter column short_code set not null,
  add constraint jobs_short_code_key unique (short_code);

-- Resolves a short code for anyone, including guests; the job page itself decides what they may see.
create function public.job_id_by_code(p_code text)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.jobs where short_code = lower(p_code) and status <> 'draft'
$$;
revoke execute on function public.job_id_by_code(text) from public;
grant execute on function public.job_id_by_code(text) to anon, authenticated;

-- Same as before, plus short_code.
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
  genders text[],
  hijab text,
  account_types text[],
  min_followers integer,
  fee_type public.fee_type,
  fee integer,
  fee_visit integer,
  rate_cap integer,
  rate_cap_visit integer,
  tier_fees jsonb,
  tier_fees_visit jsonb,
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
  short_code text,
  created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select j.id, j.brand_name, j.title, j.product, j.job_type, j.platforms, j.deliverables, j.requirements,
         j.tiers, j.niches, j.personas, j.genders, j.hijab, j.account_types, j.min_followers,
         j.fee_type, j.fee, j.fee_visit, j.rate_cap, j.rate_cap_visit, j.tier_fees, j.tier_fees_visit, j.tier_basis, j.primary_platform,
         j.quota, j.review_days, j.product_option,
         array(select loc ->> 'name' from jsonb_array_elements(j.visit_locations) loc where loc ? 'name'),
         j.require_purchase_proof, j.apply_deadline, j.content_deadline, j.top_days, j.top_mode, j.pay_day, j.cutoff_day, j.require_insight,
         j.brand_logo, j.brand_icon, j.short_code, j.created_at
  from public.jobs j
  where j.status = 'open' and (p_id is null or j.id = p_id)
  order by j.created_at desc
$$;

revoke execute on function public.public_open_jobs(uuid) from public;
grant execute on function public.public_open_jobs(uuid) to anon, authenticated;
