-- Tali MVP schema.
-- Rules that protect money and review order live here (RLS + security definer
-- functions), so the client can never skip them.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('creator', 'curator', 'finance', 'owner');
create type public.social_platform as enum ('instagram', 'tiktok', 'youtube', 'threads', 'x');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.job_type as enum ('non_visit', 'visit');
create type public.fee_type as enum ('fixed', 'open');
create type public.product_option as enum ('shipped', 'self_purchase', 'none');
create type public.job_status as enum ('draft', 'open', 'closed', 'completed');
create type public.participation_status as enum ('invited', 'applied', 'approved', 'rejected', 'cancelled');
create type public.shipment_status as enum ('pending', 'shipped', 'received');
create type public.submission_kind as enum ('storyline', 'draft', 'caption');
create type public.review_status as enum ('pending_review', 'sent_to_brand', 'approved', 'revision', 'rejected');
create type public.payout_status as enum ('requested', 'processing', 'transferred', 'failed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'creator',
  email text,
  full_name text,
  phone_enc text,            -- encrypted by the app (AES-256-GCM)
  city text,
  categories text[] not null default '{}',
  persona text,
  address_enc text,          -- default shipping address, encrypted by the app
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint categories_max_3 check (cardinality(categories) <= 3)
);

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  platform public.social_platform not null,
  url text not null,
  username text not null,
  followers integer not null check (followers >= 0),
  status public.verification_status not null default 'pending',
  reject_reason text,
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
-- One social account belongs to one creator only.
create unique index social_accounts_platform_username on public.social_accounts (platform, lower(username));
create index social_accounts_creator on public.social_accounts (creator_id);

create table public.payout_accounts (
  creator_id uuid primary key references public.profiles (id) on delete cascade,
  bank_name text not null,
  account_number_enc text not null,
  account_last4 text not null check (account_last4 ~ '^[0-9]{1,4}$'),
  holder_name text not null,
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pic text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  brand_name text not null,
  title text not null,
  product text,
  job_type public.job_type not null default 'non_visit',
  phase text,
  platforms public.social_platform[] not null check (cardinality(platforms) >= 1),
  deliverables text not null,
  brief text not null,
  requirements text,
  tiers text[] not null default '{}',
  personas text[] not null default '{}',
  min_followers integer not null default 0 check (min_followers >= 0),
  fee_type public.fee_type not null default 'fixed',
  fee integer check (fee is null or fee > 0),
  rate_cap integer check (rate_cap is null or rate_cap > 0),
  quota integer not null check (quota > 0),
  review_days integer check (review_days is null or review_days > 0),
  product_option public.product_option not null default 'none',
  visit_locations jsonb not null default '[]'::jsonb,
  require_purchase_proof boolean not null default false,
  apply_deadline date,
  content_deadline date,
  top_days integer not null check (top_days in (7, 14, 30)),
  status public.job_status not null default 'draft',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint fixed_fee_required check (fee_type <> 'fixed' or fee is not null)
);
create index jobs_status on public.jobs (status);

create table public.participations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  status public.participation_status not null,
  proposed_rate integer check (proposed_rate is null or proposed_rate > 0),
  agreed_fee integer check (agreed_fee is null or agreed_fee > 0),
  applied_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id),
  shipping_address_enc text,
  shipment_status public.shipment_status,
  courier text,
  tracking_number text,
  visit_location text,
  visit_at timestamptz,
  purchase_proof_path text,
  post_url text,
  posted_on date,
  post_url_matches boolean,
  post_submitted_at timestamptz,
  post_confirmed_at timestamptz,
  ready_at date,
  ready_notified_at timestamptz,
  payout_request_id uuid,
  unique (job_id, creator_id)
);
create index participations_creator on public.participations (creator_id);
create index participations_job on public.participations (job_id);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references public.participations (id) on delete cascade,
  kind public.submission_kind not null,
  version integer not null check (version >= 1),
  content text,
  photo_paths text[] not null default '{}',
  status public.review_status not null default 'pending_review',
  tali_feedback text,
  brand_feedback text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  approved_at timestamptz,
  unique (participation_id, kind, version)
);

create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id),
  gross integer not null check (gross >= 10000),
  transfer_fee integer not null check (transfer_fee >= 0),
  net integer not null check (net > 0),
  bank_name text not null,
  account_last4 text not null,
  account_number_enc text not null,
  holder_name text not null,
  status public.payout_status not null default 'requested',
  requested_at timestamptz not null default now(),
  due_date date not null,
  processing_at timestamptz,
  transferred_on date,
  reference_note text,
  failure_reason text,
  handled_by uuid references public.profiles (id),
  last_reminded_on date
);
create index payout_requests_creator on public.payout_requests (creator_id);
create index payout_requests_status on public.payout_requests (status, due_date);

alter table public.participations
  add constraint participations_payout_request_fk
  foreign key (payout_request_id) references public.payout_requests (id) on delete set null;

create table public.payout_events (
  id bigint generated always as identity primary key,
  payout_request_id uuid not null references public.payout_requests (id) on delete cascade,
  from_status public.payout_status,
  to_status public.payout_status not null,
  actor_id uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create table public.holidays (
  day date primary key,
  name text not null
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  params jsonb not null default '{}'::jsonb,
  link text,
  read_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user on public.notifications (user_id, created_at desc);
create index notifications_undelivered on public.notifications (created_at) where delivered_at is null;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.current_role_of_user()
returns public.user_role
language sql stable security definer set search_path = ''
as $$ select p.role from public.profiles p where p.id = auth.uid() $$;

create function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_role_of_user() in ('curator', 'finance', 'owner'), false) $$;

create function public.is_curator()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_role_of_user() in ('curator', 'owner'), false) $$;

create function public.is_finance()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_role_of_user() in ('finance', 'owner'), false) $$;

-- Business dates are in Indonesian western time (WIB).
create function public.today_wib()
returns date
language sql stable set search_path = ''
as $$ select (now() at time zone 'Asia/Jakarta')::date $$;

-- Working days skip Saturday, Sunday and dates in public.holidays.
create function public.add_business_days(p_start date, p_days integer)
returns date
language plpgsql stable set search_path = ''
as $$
declare
  d date := p_start;
  n integer := 0;
begin
  while n < p_days loop
    d := d + 1;
    if extract(isodow from d) < 6
       and not exists (select 1 from public.holidays h where h.day = d) then
      n := n + 1;
    end if;
  end loop;
  return d;
end;
$$;

-- Transfers to BCA and Mandiri are free; every other bank or e-wallet costs Rp 2.500.
create function public.transfer_fee_for(p_bank text)
returns integer
language sql immutable set search_path = ''
as $$ select case when upper(trim(p_bank)) in ('BCA', 'MANDIRI') then 0 else 2500 end $$;

create function public.notify(p_user uuid, p_kind text, p_params jsonb default '{}'::jsonb, p_link text default null)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, kind, params, link)
  values (p_user, p_kind, coalesce(p_params, '{}'::jsonb), p_link);
$$;
revoke execute on function public.notify(uuid, text, jsonb, text) from public, anon, authenticated;

create function public.notify_staff(p_roles public.user_role[], p_kind text, p_params jsonb default '{}'::jsonb, p_link text default null)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, kind, params, link)
  select p.id, p_kind, coalesce(p_params, '{}'::jsonb), p_link
  from public.profiles p where p.role = any (p_roles);
$$;
revoke execute on function public.notify_staff(public.user_role[], text, jsonb, text) from public, anon, authenticated;

-- New auth user -> creator profile.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A creator editing their own social account sends it back to verification.
create function public.social_account_reset_on_edit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    if new.creator_id <> old.creator_id then
      raise exception 'not_allowed';
    end if;
    new.status := 'pending';
    new.reject_reason := null;
    new.verified_by := null;
    new.verified_at := null;
  end if;
  return new;
end;
$$;

create trigger social_account_reset
  before update on public.social_accounts
  for each row execute function public.social_account_reset_on_edit();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.social_accounts enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.clients enable row level security;
alter table public.jobs enable row level security;
alter table public.participations enable row level security;
alter table public.submissions enable row level security;
alter table public.payout_requests enable row level security;
alter table public.payout_events enable row level security;
alter table public.holidays enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles: own row, staff read all. Role is never writable from the app.
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_staff());
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone_enc, city, categories, persona, address_enc, onboarded_at)
  on public.profiles to authenticated;

-- social_accounts: creator manages own (always pending), curator verifies.
create policy social_select on public.social_accounts for select
  using (creator_id = auth.uid() or public.is_staff());
create policy social_insert_own on public.social_accounts for insert
  with check (creator_id = auth.uid() and status = 'pending');
create policy social_update_own on public.social_accounts for update
  using (creator_id = auth.uid() or public.is_curator())
  with check (creator_id = auth.uid() or public.is_curator());
create policy social_delete_own on public.social_accounts for delete
  using (creator_id = auth.uid());

-- payout_accounts: owner manages, finance reads.
create policy payout_accounts_select on public.payout_accounts for select
  using (creator_id = auth.uid() or public.is_finance());
create policy payout_accounts_insert on public.payout_accounts for insert
  with check (creator_id = auth.uid());
create policy payout_accounts_update on public.payout_accounts for update
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());

-- clients: internal only.
create policy clients_staff on public.clients for all
  using (public.is_staff()) with check (public.is_curator());

-- jobs: creators see open jobs and jobs they are part of; curators manage.
create policy jobs_select on public.jobs for select
  using (
    status = 'open'
    or public.is_staff()
    or exists (select 1 from public.participations pa where pa.job_id = jobs.id and pa.creator_id = auth.uid())
  );
create policy jobs_insert on public.jobs for insert with check (public.is_curator());
create policy jobs_update on public.jobs for update using (public.is_curator()) with check (public.is_curator());
create policy jobs_delete on public.jobs for delete using (public.is_curator() and status = 'draft');

-- participations, submissions, payouts: read via RLS, write only via functions below.
create policy participations_select on public.participations for select
  using (creator_id = auth.uid() or public.is_staff());

create policy submissions_select on public.submissions for select
  using (
    public.is_staff()
    or exists (select 1 from public.participations pa where pa.id = submissions.participation_id and pa.creator_id = auth.uid())
  );

create policy payout_requests_select on public.payout_requests for select
  using (creator_id = auth.uid() or public.is_finance());

create policy payout_events_select on public.payout_events for select
  using (
    public.is_finance()
    or exists (select 1 from public.payout_requests r where r.id = payout_events.payout_request_id and r.creator_id = auth.uid())
  );

create policy holidays_select on public.holidays for select using (auth.uid() is not null);
create policy holidays_manage on public.holidays for all using (public.is_staff()) with check (public.is_staff());

create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy notifications_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy push_select on public.push_subscriptions for select using (user_id = auth.uid());
create policy push_insert on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy push_delete on public.push_subscriptions for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Creator actions
-- ---------------------------------------------------------------------------
create function public.apply_to_job(p_job uuid, p_rate integer default null)
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
  select max(followers) into v_best
  from public.social_accounts
  where creator_id = v_uid and status = 'verified' and platform = any (v_job.platforms);
  if v_best is null then raise exception 'no_verified_account'; end if;
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

create function public.respond_invite(p_part uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
  v_job public.jobs;
begin
  select * into v_part from public.participations where id = p_part and creator_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if v_part.status <> 'invited' then raise exception 'invalid_state'; end if;
  if p_accept then
    select * into v_job from public.jobs where id = v_part.job_id;
    if (select count(*) from public.participations where job_id = v_job.id and status = 'approved') >= v_job.quota then
      raise exception 'quota_full';
    end if;
    update public.participations set status = 'approved', decided_at = now() where id = p_part;
  else
    update public.participations set status = 'cancelled', decided_at = now() where id = p_part;
  end if;
end;
$$;

create function public.set_shipping_address(p_part uuid, p_address_enc text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.participations
  set shipping_address_enc = p_address_enc,
      shipment_status = coalesce(shipment_status, 'pending')
  where id = p_part and creator_id = auth.uid() and status = 'approved'
    and coalesce(shipment_status, 'pending') = 'pending';
  if not found then raise exception 'invalid_state'; end if;
end;
$$;

create function public.mark_product_received(p_part uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.participations set shipment_status = 'received'
  where id = p_part and creator_id = auth.uid() and status = 'approved';
  if not found then raise exception 'invalid_state'; end if;
end;
$$;

create function public.set_purchase_proof(p_part uuid, p_path text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_path is null or split_part(p_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid_path';
  end if;
  update public.participations set purchase_proof_path = p_path
  where id = p_part and creator_id = auth.uid() and status = 'approved';
  if not found then raise exception 'invalid_state'; end if;
end;
$$;

create function public.latest_submission_status(p_part uuid, p_kind public.submission_kind)
returns public.review_status
language sql stable security definer set search_path = ''
as $$
  select s.status from public.submissions s
  where s.participation_id = p_part and s.kind = p_kind
  order by s.version desc limit 1
$$;

-- Storyline first; draft and caption only after the storyline is approved.
-- A new version is allowed only when there is none yet or revision was requested.
create function public.submit_item(p_part uuid, p_kind public.submission_kind, p_content text, p_photos text[] default '{}')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
  v_latest public.review_status;
  v_version integer;
  v_id uuid;
  v_photo text;
begin
  select * into v_part from public.participations where id = p_part and creator_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if v_part.status <> 'approved' then raise exception 'invalid_state'; end if;
  if v_part.post_confirmed_at is not null then raise exception 'already_posted'; end if;

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

create function public.submit_post(p_part uuid, p_url text, p_posted_on date, p_matches boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
begin
  select * into v_part from public.participations where id = p_part and creator_id = auth.uid() for update;
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
  set post_url = p_url, posted_on = p_posted_on, post_url_matches = p_matches, post_submitted_at = now()
  where id = p_part;
end;
$$;

-- Minimum Rp 10.000, fee by destination bank, due in 3 working days.
create function public.request_payout(p_parts uuid[])
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_acc public.payout_accounts;
  v_count integer;
  v_gross integer;
  v_fee integer;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_parts is null or cardinality(p_parts) = 0 then raise exception 'nothing_selected'; end if;
  select * into v_acc from public.payout_accounts where creator_id = v_uid;
  if not found then raise exception 'payout_account_required'; end if;

  perform 1 from public.participations where id = any (p_parts) for update;

  select count(*), coalesce(sum(agreed_fee), 0) into v_count, v_gross
  from public.participations
  where id = any (p_parts)
    and creator_id = v_uid
    and status = 'approved'
    and agreed_fee is not null
    and ready_at is not null and ready_at <= public.today_wib()
    and payout_request_id is null;

  if v_count <> cardinality(p_parts) then raise exception 'not_ready'; end if;
  if v_gross < 10000 then raise exception 'below_minimum'; end if;

  v_fee := public.transfer_fee_for(v_acc.bank_name);

  insert into public.payout_requests
    (creator_id, gross, transfer_fee, net, bank_name, account_last4, account_number_enc, holder_name, due_date)
  values
    (v_uid, v_gross, v_fee, v_gross - v_fee, v_acc.bank_name, v_acc.account_last4, v_acc.account_number_enc,
     v_acc.holder_name, public.add_business_days(public.today_wib(), 3))
  returning id into v_id;

  update public.participations set payout_request_id = v_id where id = any (p_parts);
  insert into public.payout_events (payout_request_id, from_status, to_status, actor_id)
  values (v_id, null, 'requested', v_uid);
  perform public.notify_staff(array['finance', 'owner']::public.user_role[], 'payout_requested',
    jsonb_build_object('amount', v_gross - v_fee), '/admin/pencairan');
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Curator actions
-- ---------------------------------------------------------------------------
create function public.verify_social_account(p_id uuid, p_approve boolean, p_followers integer default null, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_acc public.social_accounts;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  update public.social_accounts
  set status = case when p_approve then 'verified'::public.verification_status else 'rejected'::public.verification_status end,
      followers = coalesce(p_followers, followers),
      reject_reason = case when p_approve then null else p_reason end,
      verified_by = auth.uid(),
      verified_at = now()
  where id = p_id
  returning * into v_acc;
  if not found then raise exception 'not_found'; end if;
  perform public.notify(v_acc.creator_id, case when p_approve then 'social_verified' else 'social_rejected' end,
    jsonb_build_object('username', v_acc.username, 'platform', v_acc.platform, 'reason', p_reason), '/profil');
end;
$$;

create function public.decide_application(p_part uuid, p_approve boolean, p_fee integer default null)
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

create function public.invite_creator(p_job uuid, p_creator uuid, p_fee integer default null)
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
  v_fee := case when v_job.fee_type = 'fixed' then v_job.fee else p_fee end;
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

create function public.cancel_participation(p_part uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  update public.participations set status = 'cancelled', decided_at = now(), decided_by = auth.uid()
  where id = p_part and status in ('invited', 'applied', 'approved') and post_confirmed_at is null
  returning * into v_part;
  if not found then raise exception 'invalid_state'; end if;
  perform public.notify(v_part.creator_id, 'participation_cancelled',
    jsonb_build_object('reason', p_reason), '/partisipasi/' || p_part);
end;
$$;

create function public.review_submission(p_sub uuid, p_status public.review_status, p_tali text default null, p_brand text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_sub public.submissions;
  v_creator uuid;
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

  if p_status <> 'sent_to_brand' then
    select creator_id into v_creator from public.participations where id = v_sub.participation_id;
    perform public.notify(v_creator, 'submission_' || p_status::text,
      jsonb_build_object('kind', v_sub.kind, 'version', v_sub.version), '/partisipasi/' || v_sub.participation_id);
  end if;
end;
$$;

create function public.set_shipment(p_part uuid, p_status public.shipment_status, p_courier text default null, p_tracking text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  update public.participations
  set shipment_status = p_status, courier = nullif(trim(p_courier), ''), tracking_number = nullif(trim(p_tracking), '')
  where id = p_part and status = 'approved'
  returning * into v_part;
  if not found then raise exception 'invalid_state'; end if;
  if p_status = 'shipped' then
    perform public.notify(v_part.creator_id, 'product_shipped',
      jsonb_build_object('courier', v_part.courier, 'tracking', v_part.tracking_number), '/partisipasi/' || p_part);
  end if;
end;
$$;

create function public.set_visit(p_part uuid, p_location text, p_at timestamptz)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  update public.participations set visit_location = nullif(trim(p_location), ''), visit_at = p_at
  where id = p_part and status = 'approved'
  returning * into v_part;
  if not found then raise exception 'invalid_state'; end if;
  perform public.notify(v_part.creator_id, 'visit_scheduled',
    jsonb_build_object('location', v_part.visit_location, 'at', v_part.visit_at), '/partisipasi/' || p_part);
end;
$$;

create function public.confirm_post(p_part uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_part public.participations;
  v_top integer;
begin
  if not public.is_curator() then raise exception 'forbidden'; end if;
  select * into v_part from public.participations where id = p_part for update;
  if not found then raise exception 'not_found'; end if;
  select top_days into v_top from public.jobs where id = v_part.job_id;
  if v_part.status <> 'approved' or v_part.post_url is null or v_part.post_confirmed_at is not null then
    raise exception 'invalid_state';
  end if;
  update public.participations
  set post_confirmed_at = now(), ready_at = public.today_wib() + v_top
  where id = p_part;
  perform public.notify(v_part.creator_id, 'post_confirmed',
    jsonb_build_object('ready_at', public.today_wib() + v_top), '/saldo');
end;
$$;

-- ---------------------------------------------------------------------------
-- Finance actions
-- ---------------------------------------------------------------------------
create function public.set_payout_status(
  p_req uuid,
  p_status public.payout_status,
  p_transferred_on date default null,
  p_note text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_req public.payout_requests;
  v_ok boolean;
begin
  if not public.is_finance() then raise exception 'forbidden'; end if;
  select * into v_req from public.payout_requests where id = p_req for update;
  if not found then raise exception 'not_found'; end if;

  v_ok := (v_req.status = 'requested' and p_status in ('processing', 'failed'))
       or (v_req.status = 'processing' and p_status in ('transferred', 'failed'))
       or (v_req.status = 'transferred' and p_status = 'processing');   -- paid status undone, with reason
  if not v_ok then raise exception 'invalid_transition'; end if;
  if p_status = 'transferred' and p_transferred_on is null then raise exception 'transfer_date_required'; end if;
  if p_status = 'failed' and coalesce(trim(p_note), '') = '' then raise exception 'reason_required'; end if;
  if v_req.status = 'transferred' and coalesce(trim(p_note), '') = '' then raise exception 'reason_required'; end if;

  update public.payout_requests
  set status = p_status,
      processing_at = case when p_status = 'processing' then coalesce(processing_at, now()) else processing_at end,
      transferred_on = case when p_status = 'transferred' then p_transferred_on
                            when v_req.status = 'transferred' then null else transferred_on end,
      reference_note = case when p_status = 'transferred' then nullif(trim(p_note), '') else reference_note end,
      failure_reason = case when p_status = 'failed' then trim(p_note) else failure_reason end,
      handled_by = auth.uid()
  where id = p_req;

  -- A failed request frees its jobs so the creator can fix the account and request again.
  if p_status = 'failed' then
    update public.participations set payout_request_id = null where payout_request_id = p_req;
  end if;

  insert into public.payout_events (payout_request_id, from_status, to_status, actor_id, note)
  values (p_req, v_req.status, p_status, auth.uid(), nullif(trim(p_note), ''));

  if p_status in ('processing', 'transferred', 'failed') and v_req.status <> 'transferred' then
    perform public.notify(v_req.creator_id, 'payout_' || p_status::text,
      jsonb_build_object('amount', v_req.net, 'bank', v_req.bank_name, 'last4', v_req.account_last4,
        'date', p_transferred_on, 'reason', p_note), '/saldo');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily job (called by the cron endpoint with the service role key)
-- ---------------------------------------------------------------------------
create function public.run_daily()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_ready integer := 0;
  v_due integer := 0;
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

  return jsonb_build_object('ready_notified', v_ready, 'due_soon', v_due);
end;
$$;
revoke execute on function public.run_daily() from public, anon, authenticated;
grant execute on function public.run_daily() to service_role;

-- ---------------------------------------------------------------------------
-- Storage: one private bucket, files under "<user id>/..."
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false)
on conflict (id) do nothing;

create policy uploads_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy uploads_select on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
create policy uploads_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
