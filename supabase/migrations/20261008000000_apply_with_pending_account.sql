-- Creators may apply while their social account is still pending verification,
-- so a new sign-up can join a job right away. The curator must verify a matching
-- account (meeting the job's follower minimum) before approving the application.

create or replace function public.apply_to_job(p_job uuid, p_rate integer default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_job public.jobs;
  v_best integer;
  v_id uuid;
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
    v_fee := case when v_job.fee_type = 'fixed' then v_job.fee else coalesce(p_fee, v_part.proposed_rate) end;
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
