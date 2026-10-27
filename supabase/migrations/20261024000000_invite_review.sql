-- Invitations go through the same client review as applications: accepting an
-- invitation turns it into an application (status 'applied') that the curator
-- approves or rejects later. invited_at marks those that started as invitations.

alter table public.participations add column invited_at timestamptz;
update public.participations set invited_at = applied_at where status = 'invited';

-- Same as before, but the invitation no longer counts as a decision.
create or replace function public.invite_creator(p_job uuid, p_creator uuid, p_fee integer default null, p_mode text default null)
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
  insert into public.participations (job_id, creator_id, status, agreed_fee, work_mode, visit_willing, invited_at)
  values (p_job, p_creator, 'invited', v_fee, v_mode, case when v_mode = 'visit' then true end, now())
  returning id into v_id;
  perform public.notify(p_creator, 'invited', jsonb_build_object('job', v_job.title, 'fee', v_fee),
    '/partisipasi/' || v_id);
  return v_id;
end;
$$;

create or replace function public.respond_invite(p_part uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
begin
  select * into v_part from public.participations where id = p_part and creator_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if v_part.status <> 'invited' then raise exception 'invalid_state'; end if;
  if p_accept then
    -- Joins the applicants; quota and accounts are checked when the curator approves.
    update public.participations set status = 'applied', applied_at = now() where id = p_part;
  else
    update public.participations set status = 'cancelled', decided_at = now() where id = p_part;
  end if;
end;
$$;

-- Same as before, plus the offered fee of an accepted invitation.
create or replace function public.decide_application(p_part uuid, p_approve boolean, p_fee integer default null, p_mode text default null)
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
      -- An accepted invitation keeps the fee it offered, unless the curator picks the other work mode.
      else coalesce(p_fee, case when v_part.invited_at is not null and v_part.work_mode = v_mode then v_part.agreed_fee end,
                    public.mode_fee(v_job, v_part, v_mode, public.creator_tier(v_job, v_part.creator_id, true)))
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

-- Invited creators keep seeing the real brand while their application is reviewed.
drop policy job_brands_select on public.job_brands;
create policy job_brands_select on public.job_brands for select
  using (
    public.is_staff()
    or exists (
      select 1 from public.participations pa
      where pa.job_id = job_brands.job_id and pa.creator_id = auth.uid()
        and (pa.status in ('invited', 'approved') or (pa.status = 'applied' and pa.invited_at is not null))
    )
  );
