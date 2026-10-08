-- Insight step and monthly payment terms.
-- * Jobs can require an insight (screenshots of reach/views) after the post is
--   confirmed; the payout date then counts from the day the approved insight was sent.
-- * Payment terms are either "H+N days" (as before) or monthly: sent on/before the
--   cut-off day -> payable on pay_day that month, otherwise pay_day next month.

alter type public.submission_kind add value if not exists 'insight';

alter table public.jobs
  add column require_insight boolean not null default false,
  add column top_mode text not null default 'days' check (top_mode in ('days', 'monthly')),
  add column pay_day smallint not null default 21 check (pay_day between 1 and 28),
  add column cutoff_day smallint not null default 14 check (cutoff_day between 1 and 28);

alter table public.participations add column insight_sent_on date;

-- When a fee becomes payable, counted from p_ref (post confirmation or insight date).
create function public.ready_date(p_job public.jobs, p_ref date)
returns date
language sql stable set search_path = ''
as $$
  select case
    when p_job.top_mode = 'monthly' then (
      select case when d >= p_ref then d else (d + interval '1 month')::date end
      from (
        select (date_trunc('month', p_ref)
                + case when extract(day from p_ref) <= p_job.cutoff_day then interval '0 month' else interval '1 month' end
                + make_interval(days => p_job.pay_day - 1))::date as d
      ) x
    )
    else p_ref + p_job.top_days
  end
$$;

create or replace function public.submit_item(p_part uuid, p_kind public.submission_kind, p_content text, p_photos text[] default '{}')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
  v_latest public.review_status;
  v_version integer;
  v_id uuid;
  v_photo text;
  v_job public.jobs;
begin
  select * into v_part from public.participations where id = p_part and creator_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if v_part.status <> 'approved' then raise exception 'invalid_state'; end if;
  select * into v_job from public.jobs where id = v_part.job_id;
  if p_kind::text = 'insight' then
    -- Insight comes after the post is confirmed, only on jobs that ask for it.
    if not v_job.require_insight then raise exception 'invalid_state'; end if;
    if v_part.post_confirmed_at is null then raise exception 'post_not_confirmed'; end if;
    if coalesce(cardinality(p_photos), 0) = 0 then raise exception 'insight_photos_required'; end if;
    foreach v_photo in array p_photos loop
      if split_part(v_photo, '/', 1) <> auth.uid()::text then raise exception 'invalid_path'; end if;
    end loop;
  elsif v_part.post_confirmed_at is not null then
    raise exception 'already_posted';
  end if;

  if p_kind in ('draft', 'caption')
     and public.latest_submission_status(p_part, 'storyline') is distinct from 'approved' then
    raise exception 'storyline_not_approved';
  end if;

  v_latest := public.latest_submission_status(p_part, p_kind);
  if v_latest is not null and v_latest <> 'revision' then
    raise exception 'submission_locked';
  end if;

  if p_kind = 'storyline' and (p_content is null or p_content !~* '^https://docs\.google\.com/') then
    raise exception 'invalid_docs_url';
  end if;
  if p_kind = 'draft' then
    if coalesce(cardinality(p_photos), 0) = 0
       and (p_content is null or p_content !~* '^https://drive\.google\.com/') then
      raise exception 'invalid_drive_url';
    end if;
    foreach v_photo in array coalesce(p_photos, '{}') loop
      if split_part(v_photo, '/', 1) <> auth.uid()::text then raise exception 'invalid_path'; end if;
    end loop;
  end if;
  if p_kind = 'caption' and coalesce(trim(p_content), '') = '' then
    raise exception 'caption_required';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.submissions where participation_id = p_part and kind = p_kind;

  insert into public.submissions (participation_id, kind, version, content, photo_paths)
  values (p_part, p_kind, v_version, nullif(trim(p_content), ''), coalesce(p_photos, '{}'))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.confirm_post(p_part uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
  v_job public.jobs;
  v_ready date;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  select * into v_part from public.participations where id = p_part for update;
  if not found then raise exception 'not_found'; end if;
  select * into v_job from public.jobs where id = v_part.job_id;
  if v_part.status <> 'approved' or v_part.post_url is null or v_part.post_confirmed_at is not null then
    raise exception 'invalid_state';
  end if;
  if v_job.require_insight then
    -- The payout date is set once the insight is approved.
    update public.participations set post_confirmed_at = now() where id = p_part;
    perform public.notify(v_part.creator_id, 'insight_requested', '{}'::jsonb, '/partisipasi/' || p_part);
  else
    v_ready := public.ready_date(v_job, public.today_wib());
    update public.participations set post_confirmed_at = now(), ready_at = v_ready where id = p_part;
    perform public.notify(v_part.creator_id, 'post_confirmed', jsonb_build_object('ready_at', v_ready), '/saldo');
  end if;
end;
$$;

create or replace function public.review_submission(p_sub uuid, p_status public.review_status, p_tali text default null, p_brand text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_sub public.submissions;
  v_creator uuid;
  v_job public.jobs;
  v_sent date;
  v_ready date;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  select * into v_sub from public.submissions where id = p_sub for update;
  if not found then raise exception 'not_found'; end if;
  if v_sub.status not in ('pending_review', 'sent_to_brand') then raise exception 'invalid_state'; end if;
  if p_status = 'pending_review' or (v_sub.status = 'sent_to_brand' and p_status = 'sent_to_brand') then
    raise exception 'invalid_state';
  end if;
  if p_status in ('revision', 'rejected') and coalesce(trim(p_tali), '') = '' and coalesce(trim(p_brand), '') = '' then
    raise exception 'feedback_required';
  end if;

  update public.submissions
  set status = p_status,
      tali_feedback = coalesce(nullif(trim(p_tali), ''), tali_feedback),
      brand_feedback = coalesce(nullif(trim(p_brand), ''), brand_feedback),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      approved_at = case when p_status = 'approved' then now() end
  where id = p_sub;

  select creator_id into v_creator from public.participations where id = v_sub.participation_id;
  if v_sub.kind::text = 'insight' and p_status = 'approved' then
    -- Payout date counts from the day the approved insight was sent (WIB).
    select j.* into v_job from public.jobs j join public.participations pa on pa.job_id = j.id where pa.id = v_sub.participation_id;
    v_sent := (v_sub.submitted_at at time zone 'Asia/Jakarta')::date;
    v_ready := public.ready_date(v_job, v_sent);
    update public.participations set insight_sent_on = v_sent, ready_at = v_ready where id = v_sub.participation_id;
    perform public.notify(v_creator, 'insight_approved', jsonb_build_object('ready_at', v_ready), '/saldo');
  elsif p_status <> 'sent_to_brand' then
    perform public.notify(v_creator, 'submission_' || p_status::text,
      jsonb_build_object('kind', v_sub.kind, 'version', v_sub.version), '/partisipasi/' || v_sub.participation_id);
  end if;
end;
$$;

-- Public job teaser also returns the payment terms and whether insight is required.
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
  created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select j.id, j.brand_name, j.title, j.product, j.job_type, j.platforms, j.deliverables, j.requirements,
         j.tiers, j.niches, j.personas, j.min_followers, j.fee_type, j.fee, j.rate_cap, j.tier_fees, j.tier_basis, j.primary_platform, j.quota, j.review_days,
         j.product_option,
         array(select loc ->> 'name' from jsonb_array_elements(j.visit_locations) loc where loc ? 'name'),
         j.require_purchase_proof, j.apply_deadline, j.content_deadline, j.top_days, j.top_mode, j.pay_day, j.cutoff_day, j.require_insight, j.created_at
  from public.jobs j
  where j.status = 'open' and (p_id is null or j.id = p_id)
  order by j.created_at desc
$$;

revoke execute on function public.public_open_jobs(uuid) from public;
grant execute on function public.public_open_jobs(uuid) to anon, authenticated;
