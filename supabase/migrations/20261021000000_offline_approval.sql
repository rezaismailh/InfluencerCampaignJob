-- While Tali is being introduced, content may be agreed outside the app (WhatsApp, email).
-- Curators can mark a content idea, draft or caption as approved without a submission from
-- the creator, and enter the post link on the creator's behalf. Such approvals are flagged
-- `offline` so the history shows where they came from.

alter table public.submissions add column offline boolean not null default false;

create function public.mark_offline_approved(p_part uuid, p_kind public.submission_kind, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
  v_last public.submissions;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  if p_kind::text not in ('storyline', 'draft', 'caption') then raise exception 'invalid_state'; end if;
  select * into v_part from public.participations where id = p_part for update;
  if not found then raise exception 'not_found'; end if;
  if v_part.status <> 'approved' then raise exception 'invalid_state'; end if;

  -- Keep the order: draft and caption come after an approved content idea.
  if p_kind::text <> 'storyline' and public.latest_submission_status(p_part, 'storyline') is distinct from 'approved' then
    perform public.mark_offline_approved(p_part, 'storyline', p_note);
  end if;

  select * into v_last from public.submissions
  where participation_id = p_part and kind = p_kind order by version desc limit 1;
  if found and v_last.status = 'approved' then return; end if;

  if found and v_last.status in ('pending_review', 'sent_to_brand') then
    -- A submission is waiting: approve it rather than adding another version.
    update public.submissions
    set status = 'approved', offline = true, reviewed_by = auth.uid(), reviewed_at = now(), approved_at = now(),
        tali_feedback = coalesce(nullif(trim(p_note), ''), tali_feedback)
    where id = v_last.id;
  else
    insert into public.submissions (participation_id, kind, version, content, status, offline, tali_feedback,
      reviewed_by, reviewed_at, approved_at)
    values (p_part, p_kind, coalesce(v_last.version, 0) + 1, null, 'approved', true, nullif(trim(p_note), ''),
      auth.uid(), now(), now());
  end if;

  perform public.notify(v_part.creator_id, 'submission_approved',
    jsonb_build_object('kind', p_kind, 'version', coalesce(v_last.version, 0) + 1), '/partisipasi/' || p_part);
end;
$$;

-- Post link entered by the team (the creator sent it outside the app).
create function public.staff_submit_post(p_part uuid, p_url text, p_posted_on date)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  select * into v_part from public.participations where id = p_part for update;
  if not found then raise exception 'not_found'; end if;
  if v_part.status <> 'approved' then raise exception 'invalid_state'; end if;
  if v_part.post_confirmed_at is not null then raise exception 'already_posted'; end if;
  if public.latest_submission_status(p_part, 'draft') is distinct from 'approved'
     or public.latest_submission_status(p_part, 'caption') is distinct from 'approved' then
    raise exception 'content_not_approved';
  end if;
  if p_url is null or p_url !~* '^https?://' then raise exception 'invalid_url'; end if;
  if p_posted_on is null or p_posted_on > public.today_wib() then raise exception 'invalid_date'; end if;
  update public.participations
  set post_url = p_url, posted_on = p_posted_on, post_url_matches = null, post_submitted_at = now()
  where id = p_part;
end;
$$;
