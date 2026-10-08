-- Follower updates: creators update their count through a function that
-- tells the Tali team, and a quiet in-app reminder (at most once every 90 days)
-- nudges counts not updated in 90 days.

alter table public.social_accounts
  add column followers_updated_at timestamptz not null default now(),
  add column followers_reminded_at timestamptz;

-- Keep followers_updated_at in step with any change to the count (creator or curator).
create function public.social_followers_touch()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.followers is distinct from old.followers then
    new.followers_updated_at := now();
    new.followers_reminded_at := null;
  end if;
  return new;
end;
$$;

create trigger social_followers_touch
  before update on public.social_accounts
  for each row execute function public.social_followers_touch();

-- A creator updates the follower count of their own account. The account goes back
-- to pending (social_account_reset trigger) and curators get an in-app notification.
create function public.update_social_followers(p_id uuid, p_followers integer)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_acc public.social_accounts;
  v_old integer;
  v_name text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_followers is null or p_followers < 0 then raise exception 'invalid'; end if;
  select * into v_acc from public.social_accounts where id = p_id and creator_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if v_acc.followers = p_followers then return; end if;
  v_old := v_acc.followers;

  update public.social_accounts set followers = p_followers where id = p_id;

  select coalesce(full_name, email) into v_name from public.profiles where id = auth.uid();
  perform public.notify_staff(array['curator', 'owner']::public.user_role[], 'followers_updated',
    jsonb_build_object('name', v_name, 'username', v_acc.username, 'platform', v_acc.platform,
      'old', v_old, 'new', p_followers),
    '/admin/akun-sosial');
end;
$$;
revoke execute on function public.update_social_followers(uuid, integer) from public, anon;
grant execute on function public.update_social_followers(uuid, integer) to authenticated;

create or replace function public.run_daily()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_ready integer := 0;
  v_due integer := 0;
  v_stale integer := 0;
  r record;
begin
  for r in
    select pa.id, pa.creator_id, pa.agreed_fee
    from public.participations pa
    where pa.ready_at is not null and pa.ready_at <= public.today_wib()
      and pa.ready_notified_at is null and pa.payout_request_id is null and pa.status = 'approved'
    for update
  loop
    perform public.notify(r.creator_id, 'payout_ready', jsonb_build_object('amount', r.agreed_fee), '/saldo');
    update public.participations set ready_notified_at = now() where id = r.id;
    v_ready := v_ready + 1;
  end loop;

  select count(*) into v_due from public.payout_requests
  where status in ('requested', 'processing')
    and due_date <= public.add_business_days(public.today_wib(), 1)
    and (last_reminded_on is null or last_reminded_on < public.today_wib());

  if v_due > 0 then
    perform public.notify_staff(array['finance', 'owner']::public.user_role[], 'payout_due_soon',
      jsonb_build_object('count', v_due), '/admin/pencairan');
    update public.payout_requests set last_reminded_on = public.today_wib()
    where status in ('requested', 'processing')
      and due_date <= public.add_business_days(public.today_wib(), 1);
  end if;

  -- Follower counts not updated for 90 days: one gentle in-app reminder per creator
  -- (all their stale accounts together), repeated at most every 90 days.
  for r in
    select sa.creator_id, string_agg('@' || sa.username, ', ' order by sa.username) as accounts
    from public.social_accounts sa
    join public.profiles p on p.id = sa.creator_id and p.onboarded_at is not null
    where sa.status <> 'rejected'
      and sa.followers_updated_at < now() - interval '90 days'
      and (sa.followers_reminded_at is null or sa.followers_reminded_at < now() - interval '90 days')
    group by sa.creator_id
  loop
    perform public.notify(r.creator_id, 'followers_stale', jsonb_build_object('accounts', r.accounts), '/profil#field-social');
    update public.social_accounts set followers_reminded_at = now()
    where creator_id = r.creator_id and status <> 'rejected' and followers_updated_at < now() - interval '90 days';
    v_stale := v_stale + 1;
  end loop;

  return jsonb_build_object('ready_notified', v_ready, 'due_soon', v_due, 'followers_reminded', v_stale);
end;
$$;
revoke execute on function public.run_daily() from public, anon, authenticated;
grant execute on function public.run_daily() to service_role;
