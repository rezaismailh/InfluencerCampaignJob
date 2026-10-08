-- Accepting an applicant verifies their pending social accounts on the job's
-- platforms in the same step, so the curator does not have to verify every
-- sign-up separately. Rejected accounts and follower counts below the job's
-- minimum still block acceptance (account_not_verified).

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
