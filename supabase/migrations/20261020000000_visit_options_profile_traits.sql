-- 1. One job can offer both non-visit and visit work. Each has its own fee (fixed, per tier,
--    or a rate cap for open fees). Creators tick whether they are willing to visit (open-fee
--    jobs also take a visit rate), and the curator picks the work mode when accepting,
--    following the client's choice.
-- 2. Creator traits a brand may ask for: gender, hijab (women only) and account type.
--    Stored once on the profile; a job can require them, and creators who have not filled
--    them in are asked when they apply to such a job.

alter type public.job_type add value if not exists 'both';

alter table public.jobs
  add column fee_visit integer check (fee_visit is null or fee_visit > 0),
  add column rate_cap_visit integer check (rate_cap_visit is null or rate_cap_visit > 0),
  add column tier_fees_visit jsonb not null default '{}'::jsonb,
  add column genders text[] not null default '{}' check (genders <@ array['female', 'male']),
  add column hijab text check (hijab in ('hijab', 'non_hijab')),
  add column account_types text[] not null default '{}' check (account_types <@ array['personal', 'couple', 'family', 'group']);

alter table public.participations
  add column visit_willing boolean,
  add column proposed_rate_visit integer check (proposed_rate_visit is null or proposed_rate_visit > 0),
  add column work_mode text check (work_mode in ('visit', 'non_visit'));

alter table public.profiles
  add column gender text check (gender in ('female', 'male')),
  add column hijab text check (hijab in ('hijab', 'non_hijab')),
  add column account_type text check (account_type in ('personal', 'couple', 'family', 'group')),
  add constraint profiles_hijab_women_only check (hijab is null or gender = 'female');
grant update (gender, hijab, account_type) on public.profiles to authenticated;

-- Default fee for a work mode: fixed, the tier's fee, or the proposed rate.
create function public.mode_fee(p_job public.jobs, p_part public.participations, p_mode text, p_tier text)
returns integer
language sql stable set search_path = ''
as $$
  select case
    when p_job.fee_type = 'fixed' then case when p_mode = 'visit' and p_job.job_type::text = 'both' then p_job.fee_visit else p_job.fee end
    when p_job.fee_type::text = 'tier' then
      (case when p_mode = 'visit' and p_job.job_type::text = 'both' then p_job.tier_fees_visit else p_job.tier_fees end ->> p_tier)::integer
    else case when p_mode = 'visit' and p_job.job_type::text = 'both' then p_part.proposed_rate_visit else p_part.proposed_rate end
  end
$$;
revoke execute on function public.mode_fee(public.jobs, public.participations, text, text) from public, anon, authenticated;

drop function public.apply_to_job(uuid, integer);
create function public.apply_to_job(p_job uuid, p_rate integer default null, p_visit boolean default null, p_rate_visit integer default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_job public.jobs;
  v_profile public.profiles;
  v_best integer;
  v_id uuid;
  v_tier text;
  v_both boolean;
  v_visit boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_job from public.jobs where id = p_job;
  if not found or v_job.status <> 'open' then raise exception 'job_not_open'; end if;
  if v_job.apply_deadline is not null and v_job.apply_deadline < public.today_wib() then
    raise exception 'job_closed';
  end if;
  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.onboarded_at is null then raise exception 'onboarding_incomplete'; end if;

  -- Traits the brand asked for. Missing ones are asked in the apply form.
  if cardinality(v_job.genders) > 0 then
    if v_profile.gender is null then raise exception 'profile_gender_required'; end if;
    if not (v_profile.gender = any (v_job.genders)) then raise exception 'gender_not_eligible'; end if;
  end if;
  if v_job.hijab is not null then
    if v_profile.gender is distinct from 'female' then
      if v_profile.gender is null then raise exception 'profile_gender_required'; end if;
      raise exception 'gender_not_eligible';
    end if;
    if v_profile.hijab is null then raise exception 'profile_hijab_required'; end if;
    if v_profile.hijab <> v_job.hijab then raise exception 'hijab_not_eligible'; end if;
  end if;
  if cardinality(v_job.account_types) > 0 then
    if v_profile.account_type is null then raise exception 'profile_account_type_required'; end if;
    if not (v_profile.account_type = any (v_job.account_types)) then raise exception 'account_type_not_eligible'; end if;
  end if;

  -- A pending account is enough to apply; curators verify it before approving.
  select max(followers) into v_best
  from public.social_accounts
  where creator_id = v_uid and status in ('verified', 'pending') and platform = any (v_job.platforms);
  if v_best is null then raise exception 'no_social_account'; end if;
  if v_best < v_job.min_followers then raise exception 'followers_below_minimum'; end if;

  -- Visit willingness: required for visit-only jobs, a choice for jobs with both.
  v_both := v_job.job_type::text = 'both';
  if v_job.job_type = 'visit' then
    if p_visit is not true then raise exception 'visit_consent_required'; end if;
    v_visit := true;
  elsif v_both then
    v_visit := coalesce(p_visit, false);
  else
    v_visit := null;
  end if;

  if v_job.fee_type::text = 'tier' then
    v_tier := public.creator_tier(v_job, v_uid, false);
    if v_tier is null then raise exception 'no_social_account'; end if;
    if not (v_job.tier_fees ? v_tier or (v_both and v_visit and v_job.tier_fees_visit ? v_tier)) then
      raise exception 'tier_not_offered';
    end if;
  end if;
  if v_job.fee_type = 'open' then
    if p_rate is null or p_rate <= 0 then raise exception 'rate_required'; end if;
    if v_job.rate_cap is not null and p_rate > v_job.rate_cap then raise exception 'rate_above_cap'; end if;
    if v_both and v_visit then
      if p_rate_visit is null or p_rate_visit <= 0 then raise exception 'rate_visit_required'; end if;
      if v_job.rate_cap_visit is not null and p_rate_visit > v_job.rate_cap_visit then raise exception 'rate_visit_above_cap'; end if;
    end if;
  end if;
  if exists (select 1 from public.participations where job_id = p_job and creator_id = v_uid) then
    raise exception 'already_applied';
  end if;

  insert into public.participations (job_id, creator_id, status, proposed_rate, proposed_rate_visit, visit_willing)
  values (p_job, v_uid, 'applied',
    case when v_job.fee_type = 'open' then p_rate end,
    case when v_job.fee_type = 'open' and v_both and v_visit then p_rate_visit end,
    v_visit)
  returning id into v_id;
  return v_id;
end;
$$;

drop function public.decide_application(uuid, boolean, integer);
create function public.decide_application(p_part uuid, p_approve boolean, p_fee integer default null, p_mode text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
  v_job public.jobs;
  v_fee integer;
  v_mode text;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  select * into v_part from public.participations where id = p_part for update;
  if not found then raise exception 'not_found'; end if;
  if v_part.status <> 'applied' then raise exception 'invalid_state'; end if;
  select * into v_job from public.jobs where id = v_part.job_id for update;

  if p_approve then
    -- Work mode: the job's own type, or the curator's pick for jobs that offer both.
    if v_job.job_type::text = 'both' then
      if p_mode is null or p_mode not in ('visit', 'non_visit') then raise exception 'work_mode_required'; end if;
      if p_mode = 'visit' and v_part.visit_willing is not true then raise exception 'not_willing_to_visit'; end if;
      v_mode := p_mode;
    else
      v_mode := v_job.job_type::text;
    end if;

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
      when v_job.fee_type = 'fixed' then public.mode_fee(v_job, v_part, v_mode, null)
      else coalesce(p_fee, public.mode_fee(v_job, v_part, v_mode, public.creator_tier(v_job, v_part.creator_id, true)))
    end;
    if v_fee is null or v_fee <= 0 then raise exception 'fee_required'; end if;
    update public.participations
    set status = 'approved', agreed_fee = v_fee, work_mode = v_mode, decided_at = now(), decided_by = auth.uid(),
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

drop function public.invite_creator(uuid, uuid, integer);
create function public.invite_creator(p_job uuid, p_creator uuid, p_fee integer default null, p_mode text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_job public.jobs;
  v_part public.participations;
  v_fee integer;
  v_mode text;
  v_id uuid;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  select * into v_job from public.jobs where id = p_job;
  if not found then raise exception 'not_found'; end if;
  if v_job.job_type::text = 'both' then
    if p_mode is null or p_mode not in ('visit', 'non_visit') then raise exception 'work_mode_required'; end if;
    v_mode := p_mode;
  else
    v_mode := v_job.job_type::text;
  end if;
  v_fee := case
    when v_job.fee_type = 'fixed' then public.mode_fee(v_job, v_part, v_mode, null)
    when v_job.fee_type::text = 'tier' then coalesce(p_fee, public.mode_fee(v_job, v_part, v_mode, public.creator_tier(v_job, p_creator, false)))
    else p_fee
  end;
  if v_fee is null or v_fee <= 0 then raise exception 'fee_required'; end if;
  insert into public.participations (job_id, creator_id, status, agreed_fee, work_mode, visit_willing, decided_by,
    shipment_status)
  values (p_job, p_creator, 'invited', v_fee, v_mode, case when v_mode = 'visit' then true end, auth.uid(),
    case when v_job.product_option = 'shipped' then 'pending'::public.shipment_status end)
  returning id into v_id;
  perform public.notify(p_creator, 'invited', jsonb_build_object('job', v_job.title, 'fee', v_fee),
    '/partisipasi/' || v_id);
  return v_id;
end;
$$;

-- Public teaser: visit fees and trait requirements too.
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
         j.brand_logo, j.brand_icon, j.created_at
  from public.jobs j
  where j.status = 'open' and (p_id is null or j.id = p_id)
  order by j.created_at desc
$$;

revoke execute on function public.public_open_jobs(uuid) from public;
grant execute on function public.public_open_jobs(uuid) to anon, authenticated;
