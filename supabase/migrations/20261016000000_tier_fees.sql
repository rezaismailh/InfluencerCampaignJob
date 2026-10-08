-- Fee per tier: a job can set a fee for each creator tier (nano/micro/macro/mega).
-- The creator's tier comes from their followers, either the largest account on the
-- job's platforms (tier_basis 'largest') or the account on the job's main platform
-- ('primary'), chosen per job. Curators can still override the fee when accepting.

alter type public.fee_type add value if not exists 'tier';

alter table public.jobs
  add column tier_fees jsonb not null default '{}'::jsonb,
  add column tier_basis text not null default 'largest' check (tier_basis in ('largest', 'primary')),
  add column primary_platform public.social_platform;

-- Follower count -> tier (same bands as the app: <10K nano, <100K micro, <1M macro, else mega).
create function public.tier_for(p_followers integer)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when p_followers >= 1000000 then 'mega'
    when p_followers >= 100000 then 'macro'
    when p_followers >= 10000 then 'micro'
    else 'nano'
  end
$$;

-- A creator's tier for a job, or null when they have no matching account.
-- p_verified_only: true when accepting (accounts are verified by then), false when applying.
create function public.creator_tier(p_job public.jobs, p_creator uuid, p_verified_only boolean)
returns text
language sql stable security definer set search_path = ''
as $$
  select public.tier_for(max(sa.followers))
  from public.social_accounts sa
  where sa.creator_id = p_creator
    and sa.status in ('verified', 'pending')
    and (not p_verified_only or sa.status = 'verified')
    and case when p_job.tier_basis = 'primary' and p_job.primary_platform is not null
             then sa.platform = p_job.primary_platform
             else sa.platform = any (p_job.platforms) end
  having count(*) > 0
$$;
revoke execute on function public.creator_tier(public.jobs, uuid, boolean) from public, anon, authenticated;

create or replace function public.apply_to_job(p_job uuid, p_rate integer default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_job public.jobs;
  v_best integer;
  v_id uuid;
  v_tier text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_job from public.jobs where id = p_job;
  if not found or v_job.status <> 'open' then raise exception 'job_not_open'; end if;
  if v_job.apply_deadline is not null and v_job.apply_deadline < public.today_wib() then
    raise exception 'job_closed';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and onboarded_at is not null) then
    raise exception 'onboarding_incomplete';
  end if;
  -- A pending account is enough to apply; curators verify it before approving.
  select max(followers) into v_best
  from public.social_accounts
  where creator_id = v_uid and status in ('verified', 'pending') and platform = any (v_job.platforms);
  if v_best is null then raise exception 'no_social_account'; end if;
  if v_best < v_job.min_followers then raise exception 'followers_below_minimum'; end if;
  if v_job.fee_type::text = 'tier' then
    v_tier := public.creator_tier(v_job, v_uid, false);
    if v_tier is null then raise exception 'no_social_account'; end if;
    if not (v_job.tier_fees ? v_tier) then raise exception 'tier_not_offered'; end if;
  end if;
  if v_job.fee_type = 'open' then
    if p_rate is null or p_rate <= 0 then raise exception 'rate_required'; end if;
    if v_job.rate_cap is not null and p_rate > v_job.rate_cap then raise exception 'rate_above_cap'; end if;
  end if;
  if exists (select 1 from public.participations where job_id = p_job and creator_id = v_uid) then
    raise exception 'already_applied';
  end if;

  insert into public.participations (job_id, creator_id, status, proposed_rate)
  values (p_job, v_uid, 'applied', case when v_job.fee_type = 'open' then p_rate end)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.decide_application(p_part uuid, p_approve boolean, p_fee integer default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
  v_job public.jobs;
  v_fee integer;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  select * into v_part from public.participations where id = p_part for update;
  if not found then raise exception 'not_found'; end if;
  if v_part.status <> 'applied' then raise exception 'invalid_state'; end if;
  select * into v_job from public.jobs where id = v_part.job_id for update;

  if p_approve then
    -- Accepting is the curator's check: verify the applicant's pending accounts on the job's platforms.
    update public.social_accounts
    set status = 'verified', verified_by = auth.uid(), verified_at = now(), reject_reason = null
    where creator_id = v_part.creator_id and status = 'pending' and platform = any (v_job.platforms);
    if not exists (
      select 1 from public.social_accounts
      where creator_id = v_part.creator_id and status = 'verified' and platform = any (v_job.platforms)
        and followers >= v_job.min_followers
    ) then
      raise exception 'account_not_verified';
    end if;
    if (select count(*) from public.participations where job_id = v_job.id and status = 'approved') >= v_job.quota then
      raise exception 'quota_full';
    end if;
    v_fee := case
      when v_job.fee_type = 'fixed' then v_job.fee
      when v_job.fee_type::text = 'tier' then coalesce(p_fee, (v_job.tier_fees ->> public.creator_tier(v_job, v_part.creator_id, true))::integer)
      else coalesce(p_fee, v_part.proposed_rate)
    end;
    if v_fee is null or v_fee <= 0 then raise exception 'fee_required'; end if;
    update public.participations
    set status = 'approved', agreed_fee = v_fee, decided_at = now(), decided_by = auth.uid(),
        shipment_status = case when v_job.product_option = 'shipped' then 'pending'::public.shipment_status end
    where id = p_part;
    perform public.notify(v_part.creator_id, 'application_approved',
      jsonb_build_object('job', v_job.title, 'fee', v_fee), '/partisipasi/' || p_part);
  else
    update public.participations set status = 'rejected', decided_at = now(), decided_by = auth.uid()
    where id = p_part;
    perform public.notify(v_part.creator_id, 'application_rejected',
      jsonb_build_object('job', v_job.title), '/job/' || v_job.id);
  end if;
end;
$$;

create or replace function public.invite_creator(p_job uuid, p_creator uuid, p_fee integer default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_job public.jobs;
  v_fee integer;
  v_id uuid;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  select * into v_job from public.jobs where id = p_job;
  if not found then raise exception 'not_found'; end if;
  v_fee := case
    when v_job.fee_type = 'fixed' then v_job.fee
    when v_job.fee_type::text = 'tier' then coalesce(p_fee, (v_job.tier_fees ->> public.creator_tier(v_job, p_creator, false))::integer)
    else p_fee
  end;
  if v_fee is null or v_fee <= 0 then raise exception 'fee_required'; end if;
  insert into public.participations (job_id, creator_id, status, agreed_fee, decided_by,
    shipment_status)
  values (p_job, p_creator, 'invited', v_fee, auth.uid(),
    case when v_job.product_option = 'shipped' then 'pending'::public.shipment_status end)
  returning id into v_id;
  perform public.notify(p_creator, 'invited', jsonb_build_object('job', v_job.title, 'fee', v_fee),
    '/partisipasi/' || v_id);
  return v_id;
end;
$$;

-- Public job teaser also returns the tier fees and how the tier is decided.
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
  created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select j.id, j.brand_name, j.title, j.product, j.job_type, j.platforms, j.deliverables, j.requirements,
         j.tiers, j.niches, j.personas, j.min_followers, j.fee_type, j.fee, j.rate_cap, j.tier_fees, j.tier_basis, j.primary_platform, j.quota, j.review_days,
         j.product_option,
         array(select loc ->> 'name' from jsonb_array_elements(j.visit_locations) loc where loc ? 'name'),
         j.require_purchase_proof, j.apply_deadline, j.content_deadline, j.top_days, j.created_at
  from public.jobs j
  where j.status = 'open' and (p_id is null or j.id = p_id)
  order by j.created_at desc
$$;

revoke execute on function public.public_open_jobs(uuid) from public;
grant execute on function public.public_open_jobs(uuid) to anon, authenticated;
