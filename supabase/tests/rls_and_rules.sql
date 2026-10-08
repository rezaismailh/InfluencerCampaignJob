-- End-to-end checks of RLS and the business functions.
-- Each step switches to a user with set_config + SET ROLE authenticated.

create schema tests;
grant usage on schema tests to public;

create function tests.expect_error(p_sql text, p_msg text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like '%' || p_msg || '%' then return; end if;
    raise exception 'expected error "%" from [%], got "%"', p_msg, p_sql, sqlerrm;
  end;
  raise exception 'expected error "%" from [%], but it succeeded', p_msg, p_sql;
end;
$$;

create function tests.check(p_ok boolean, p_msg text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'check failed: %', p_msg; end if;
end;
$$;

create function tests.act_as(p_user uuid) returns void
language sql as $$ select set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false) $$;

grant execute on all functions in schema tests to public;

-- Users ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@tali.test'),
  ('00000000-0000-0000-0000-000000000002', 'curator@tali.test'),
  ('00000000-0000-0000-0000-000000000003', 'finance@tali.test'),
  ('00000000-0000-0000-0000-00000000000a', 'a@creator.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@creator.test');

select tests.check((select count(*) = 5 from public.profiles), 'profiles created by trigger');
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set role = 'curator' where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set role = 'finance' where id = '00000000-0000-0000-0000-000000000003';

-- Creator A: profile, role protection, social account -----------------------
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000a');
update public.profiles set full_name = 'Creator A', province = 'Jawa Barat', city = 'Kota Bandung', categories = '{food}'
  where id = auth.uid();
select tests.expect_error($$update public.profiles set role = 'owner' where id = auth.uid()$$, 'permission denied');
select tests.check((select count(*) = 1 from public.profiles), 'creator sees only own profile');

select tests.expect_error($$insert into public.social_accounts (creator_id, platform, url, username, followers, status)
  values (auth.uid(), 'tiktok', 'https://www.tiktok.com/@cra', 'cra', 12000, 'verified')$$, 'row-level security');
insert into public.social_accounts (creator_id, platform, url, username, followers)
  values (auth.uid(), 'tiktok', 'https://www.tiktok.com/@cra', 'cra', 12000);

-- Creator B cannot claim the same account, and cannot see A's
select tests.act_as('00000000-0000-0000-0000-00000000000b');
select tests.check((select count(*) = 0 from public.social_accounts), 'B cannot see A social accounts');
select tests.expect_error($$insert into public.social_accounts (creator_id, platform, url, username, followers)
  values (auth.uid(), 'tiktok', 'https://www.tiktok.com/@CRA', 'CRA', 5)$$, 'duplicate key');
insert into public.social_accounts (creator_id, platform, url, username, followers)
  values (auth.uid(), 'tiktok', 'https://www.tiktok.com/@crb', 'crb', 9000);
update public.profiles set full_name = 'Creator B', onboarded_at = now() where id = auth.uid();

-- Curator: client, job, verification ---------------------------------------
select tests.act_as('00000000-0000-0000-0000-000000000002');
insert into public.clients (id, name) values ('10000000-0000-0000-0000-000000000001', 'Nissin');
insert into public.jobs (id, client_id, brand_name, title, platforms, deliverables, brief, fee_type, fee, quota,
  top_days, status, product_option)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Nissin',
  'Review wafer', '{tiktok}', '1 video TikTok', 'Brief', 'fixed', 150000, 1, 7, 'open', 'shipped');

-- Guests: teaser via function only, no direct table read
reset role;
set role anon;
select tests.act_as(null);
select tests.expect_error($$select count(*) from public.jobs$$, 'permission denied');
select tests.check((select count(*) = 1 from public.public_open_jobs()), 'guest sees open job teaser');
select tests.check((select title = 'Review wafer' from public.public_open_jobs('20000000-0000-0000-0000-000000000001')), 'guest sees one job');
reset role;
set role authenticated;

-- Creator A applies: onboarding and verification gates
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.check((select count(*) = 1 from public.jobs), 'creator sees open job');
select tests.expect_error($$select public.apply_to_job('20000000-0000-0000-0000-000000000001')$$, 'onboarding_incomplete');
update public.profiles set onboarded_at = now() where id = auth.uid();
-- a pending (not yet verified) account is enough to apply
select tests.check((select status = 'pending' from public.social_accounts), 'account still pending');
select public.apply_to_job('20000000-0000-0000-0000-000000000001');
select tests.expect_error($$select public.apply_to_job('20000000-0000-0000-0000-000000000001')$$, 'already_applied');
select tests.expect_error($$select public.verify_social_account((select id from public.social_accounts limit 1), true)$$, 'forbidden');

-- ...and a rejected account blocks acceptance; verifying it again clears that
select tests.act_as('00000000-0000-0000-0000-000000000002');
select public.verify_social_account(id, false, null, 'Link salah') from public.social_accounts
  where creator_id = '00000000-0000-0000-0000-00000000000a';
select tests.expect_error($$select public.decide_application((select id from public.participations
  where creator_id = '00000000-0000-0000-0000-00000000000a'), true)$$, 'account_not_verified');
select public.verify_social_account(id, true, 12500) from public.social_accounts
  where creator_id = '00000000-0000-0000-0000-00000000000a';
insert into public.jobs (id, brand_name, title, platforms, deliverables, brief, fee_type, fee, quota, top_days, status)
values ('20000000-0000-0000-0000-0000000000f1', 'Uji', 'Job YouTube', '{youtube}', '1 video', 'Brief', 'fixed', 100000, 1, 7, 'open');

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.check((select followers = 12500 and status = 'verified' from public.social_accounts), 'verified with updated followers');
select tests.expect_error($$select public.apply_to_job('20000000-0000-0000-0000-0000000000f1')$$, 'no_social_account');

select tests.act_as('00000000-0000-0000-0000-000000000002');
update public.jobs set status = 'closed' where id = '20000000-0000-0000-0000-0000000000f1';
select tests.act_as('00000000-0000-0000-0000-00000000000a');
-- direct writes are blocked
update public.participations set status = 'approved';
select tests.check((select status = 'applied' from public.participations), 'direct update changes nothing');

select tests.act_as('00000000-0000-0000-0000-00000000000b');
select public.apply_to_job('20000000-0000-0000-0000-000000000001');
select tests.check((select status = 'pending' from public.social_accounts), 'B account still pending');

-- Curator approves A; quota of 1 blocks B
select tests.act_as('00000000-0000-0000-0000-000000000002');
select public.decide_application(id, true) from public.participations
  where creator_id = '00000000-0000-0000-0000-00000000000a';
select tests.expect_error($$select public.decide_application((select id from public.participations
  where creator_id = '00000000-0000-0000-0000-00000000000b'), true)$$, 'quota_full');
select tests.check((select agreed_fee = 150000 and shipment_status = 'pending' from public.participations
  where creator_id = '00000000-0000-0000-0000-00000000000a'), 'fixed fee applied, shipment pending');
select tests.check((select status = 'pending' from public.social_accounts
  where creator_id = '00000000-0000-0000-0000-00000000000b'), 'failed acceptance (quota) does not verify');

-- Disguised brand: real name only for staff and approved/invited creators
insert into public.job_brands (job_id, real_name) values ('20000000-0000-0000-0000-000000000001', 'Nissin');
update public.jobs set brand_name = 'Brand snack nasional' where id = '20000000-0000-0000-0000-000000000001';
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.check((select real_name = 'Nissin' from public.job_brands), 'approved creator sees real brand');
select tests.expect_error($$insert into public.job_brands (job_id, real_name) values ('20000000-0000-0000-0000-0000000000f1', 'X')$$, 'row-level security');
select tests.act_as('00000000-0000-0000-0000-00000000000b');
select tests.check((select count(*) = 0 from public.job_brands), 'applicant does not see real brand');
select tests.check((select brand_name = 'Brand snack nasional' from public.jobs where id = '20000000-0000-0000-0000-000000000001'), 'applicant sees alias');
reset role;
set role anon;
select tests.expect_error($$select count(*) from public.job_brands$$, 'permission denied');
select tests.check((select brand_name = 'Brand snack nasional' from public.public_open_jobs('20000000-0000-0000-0000-000000000001')), 'guest sees alias');
reset role;
set role authenticated;

-- Submissions: storyline first, versions, feedback --------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.check((select count(*) = 1 from public.participations), 'A sees only own participation');
select tests.check((select count(*) = 1 from public.notifications where kind = 'application_approved'), 'A notified');
select tests.expect_error($$select public.submit_item((select id from public.participations), 'draft', 'https://drive.google.com/x')$$, 'storyline_not_approved');
select tests.expect_error($$select public.submit_item((select id from public.participations), 'storyline', 'https://example.com/doc')$$, 'invalid_docs_url');
select public.submit_item((select id from public.participations), 'storyline', 'https://docs.google.com/document/d/abc');
select tests.expect_error($$select public.submit_item((select id from public.participations), 'storyline', 'https://docs.google.com/document/d/abc2')$$, 'submission_locked');

select tests.act_as('00000000-0000-0000-0000-000000000002');
select tests.expect_error($$select public.review_submission((select id from public.submissions), 'revision')$$, 'feedback_required');
select public.review_submission((select id from public.submissions), 'revision', 'Hook kurang kuat', null);

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select public.submit_item((select id from public.participations), 'storyline', 'https://docs.google.com/document/d/abc2');
select tests.check((select max(version) = 2 from public.submissions), 'storyline v2 created');

select tests.act_as('00000000-0000-0000-0000-000000000002');
select public.review_submission(id, 'sent_to_brand') from public.submissions where version = 2;
select tests.expect_error($$select public.review_submission((select id from public.submissions where version = 2), 'sent_to_brand')$$, 'invalid_state');
select public.review_submission(id, 'approved', null, 'OK dari brand') from public.submissions where version = 2;

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.expect_error($$select public.submit_item((select id from public.participations), 'draft', 'https://example.com/v.mp4')$$, 'invalid_drive_url');
select tests.expect_error($$select public.submit_item((select id from public.participations), 'draft', null,
  array['00000000-0000-0000-0000-00000000000b/x.jpg'])$$, 'invalid_path');
select public.submit_item((select id from public.participations), 'draft', 'https://drive.google.com/file/d/v1');
select public.submit_item((select id from public.participations), 'caption', 'Nikmatnya bikin nyaman #promo');
select tests.expect_error($$select public.submit_post((select id from public.participations), 'https://vt.tiktok.com/x', public.today_wib(), null)$$, 'content_not_approved');

select tests.act_as('00000000-0000-0000-0000-000000000002');
select public.review_submission(id, 'approved') from public.submissions where kind in ('draft', 'caption');
select public.set_shipment(id, 'shipped', 'JNE', 'JNE123') from public.participations
  where creator_id = '00000000-0000-0000-0000-00000000000a';

-- Posting and confirmation --------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.expect_error($$select public.submit_post((select id from public.participations), 'https://vt.tiktok.com/x', public.today_wib() + 1, null)$$, 'invalid_date');
select public.submit_post((select id from public.participations), 'https://www.tiktok.com/@cra/video/1', public.today_wib(), true);
select tests.expect_error($$select public.confirm_post((select id from public.participations))$$, 'forbidden');

select tests.act_as('00000000-0000-0000-0000-000000000002');
select public.confirm_post(id) from public.participations where creator_id = '00000000-0000-0000-0000-00000000000a';
select tests.check((select ready_at = public.today_wib() + 7 from public.participations
  where creator_id = '00000000-0000-0000-0000-00000000000a'), 'ready_at = today + TOP');

-- Payout request ------------------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.expect_error($$select public.submit_item((select id from public.participations), 'caption', 'new')$$, 'already_posted');
select tests.expect_error($$select public.request_payout(array[(select id from public.participations)])$$, 'payout_account_required');
insert into public.payout_accounts (creator_id, bank_name, account_number_enc, account_last4, holder_name)
  values (auth.uid(), 'BRI', 'enc:xyz', '4417', 'Creator A');
select tests.expect_error($$select public.request_payout(array[(select id from public.participations)])$$, 'not_ready');

reset role;
update public.participations set ready_at = public.today_wib()
  where creator_id = '00000000-0000-0000-0000-00000000000a';
set role authenticated;

select public.request_payout(array[(select id from public.participations)]);
select tests.check((select gross = 150000 and transfer_fee = 2500 and net = 147500
  and due_date = public.add_business_days(public.today_wib(), 3) from public.payout_requests), 'fee and due date');
select tests.expect_error($$select public.request_payout(array[(select id from public.participations)])$$, 'not_ready');
select tests.expect_error($$select public.set_payout_status((select id from public.payout_requests), 'processing')$$, 'forbidden');

select tests.act_as('00000000-0000-0000-0000-00000000000b');
select tests.check((select count(*) = 0 from public.payout_requests), 'B cannot see A payout');
select tests.check((select count(*) = 0 from public.payout_accounts), 'B cannot see A account');

select tests.act_as('00000000-0000-0000-0000-000000000002');
select tests.check((select count(*) = 0 from public.payout_requests), 'curator cannot see payouts');

select tests.act_as('00000000-0000-0000-0000-000000000003');
select tests.check((select count(*) = 1 from public.notifications where kind = 'payout_requested'), 'finance notified');
select tests.expect_error($$select public.set_payout_status((select id from public.payout_requests), 'transferred', public.today_wib())$$, 'invalid_transition');
select public.set_payout_status((select id from public.payout_requests), 'processing');
select tests.expect_error($$select public.set_payout_status((select id from public.payout_requests), 'transferred')$$, 'transfer_date_required');
select public.set_payout_status((select id from public.payout_requests), 'transferred', public.today_wib(), 'REF123');
select tests.expect_error($$select public.set_payout_status((select id from public.payout_requests), 'processing')$$, 'reason_required');
select tests.check((select count(*) = 3 from public.payout_events), 'audit trail has 3 events');

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.check((select count(*) = 1 from public.notifications where kind = 'payout_transferred'), 'A notified of transfer');
select tests.check((select count(*) = 3 from public.payout_events), 'A sees own payout events');

-- Failed payout frees the job; minimum amount; BCA is free -------------------
reset role;
insert into public.jobs (id, brand_name, title, platforms, deliverables, brief, fee_type, fee, quota, top_days, status)
values ('20000000-0000-0000-0000-000000000002', 'Mini', 'Kecil', '{tiktok}', 'x', 'x', 'fixed', 5000, 5, 7, 'open'),
       ('20000000-0000-0000-0000-000000000003', 'Open', 'Open rate', '{tiktok}', 'x', 'x', 'open', null, 5, 14, 'open');
update public.jobs set rate_cap = 300000 where id = '20000000-0000-0000-0000-000000000003';
insert into public.participations (job_id, creator_id, status, agreed_fee, ready_at) values
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'approved', 5000, public.today_wib());
set role authenticated;

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.expect_error($$select public.request_payout(array[(select id from public.participations where agreed_fee = 5000)])$$, 'below_minimum');
select tests.expect_error($$select public.apply_to_job('20000000-0000-0000-0000-000000000003')$$, 'rate_required');
select tests.expect_error($$select public.apply_to_job('20000000-0000-0000-0000-000000000003', 400000)$$, 'rate_above_cap');
select public.apply_to_job('20000000-0000-0000-0000-000000000003', 250000);

select tests.act_as('00000000-0000-0000-0000-000000000002');
select public.decide_application(id, true, 225000) from public.participations
  where job_id = '20000000-0000-0000-0000-000000000003';
select tests.check((select agreed_fee = 225000 and proposed_rate = 250000 from public.participations
  where job_id = '20000000-0000-0000-0000-000000000003'), 'open rate: agreed fee set by curator');

reset role;
update public.participations set ready_at = public.today_wib() where job_id = '20000000-0000-0000-0000-000000000003';
update public.payout_accounts set bank_name = 'BCA' where creator_id = '00000000-0000-0000-0000-00000000000a';
set role authenticated;

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select public.request_payout(array[
  (select id from public.participations where job_id = '20000000-0000-0000-0000-000000000003'),
  (select id from public.participations where job_id = '20000000-0000-0000-0000-000000000002')]);
select tests.check((select gross = 230000 and transfer_fee = 0 and net = 230000 from public.payout_requests
  where status = 'requested'), 'combined jobs, BCA free');

select tests.act_as('00000000-0000-0000-0000-000000000003');
select tests.expect_error($$select public.set_payout_status((select id from public.payout_requests where status = 'requested'), 'failed')$$, 'reason_required');
select public.set_payout_status((select id from public.payout_requests where status = 'requested'), 'failed', null, 'Nama rekening tidak cocok');

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.check((select count(*) = 2 from public.participations where payout_request_id is null
  and job_id <> '20000000-0000-0000-0000-000000000001'), 'failed request frees jobs');

-- Working days --------------------------------------------------------------
reset role;
select tests.check(public.add_business_days('2026-10-09', 3) = '2026-10-14', 'Fri + 3 working days = Wed');
insert into public.holidays (day, name) values ('2026-10-12', 'Libur uji');
select tests.check(public.add_business_days('2026-10-09', 3) = '2026-10-15', 'holiday skipped');
select tests.check(public.transfer_fee_for(' mandiri ') = 0 and public.transfer_fee_for('GoPay') = 2500, 'transfer fee rule');

-- Storage folders -----------------------------------------------------------
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000a');
insert into storage.objects (bucket_id, name) values ('uploads', '00000000-0000-0000-0000-00000000000a/p/1.jpg');
select tests.expect_error($$insert into storage.objects (bucket_id, name) values ('uploads', '00000000-0000-0000-0000-00000000000b/p/1.jpg')$$, 'row-level security');

-- Daily job is service-role only -------------------------------------------
select tests.expect_error($$select public.run_daily()$$, 'permission denied');
reset role;
set role service_role;
select tests.check((public.run_daily() ->> 'ready_notified')::int >= 0, 'run_daily runs for service role');
reset role;

-- Accepting an applicant verifies their pending account ------------------------
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000b');
select public.apply_to_job('20000000-0000-0000-0000-000000000003', 200000);
select tests.act_as('00000000-0000-0000-0000-000000000002');
select public.decide_application(id, true) from public.participations
  where job_id = '20000000-0000-0000-0000-000000000003' and creator_id = '00000000-0000-0000-0000-00000000000b';
select tests.check((select status = 'verified' and verified_by = auth.uid() from public.social_accounts
  where creator_id = '00000000-0000-0000-0000-00000000000b'), 'accepting verified the pending account');
reset role;

-- Follower updates notify curators; stale counts get a reminder ------------------
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000b');
select public.update_social_followers((select id from public.social_accounts), 15000);
select tests.check((select followers = 15000 and status = 'pending' from public.social_accounts), 'followers updated, back to pending');
select tests.expect_error($$select public.update_social_followers((select id from public.social_accounts), -1)$$, 'invalid');
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.expect_error($$select public.update_social_followers((select id from public.social_accounts
  where creator_id = '00000000-0000-0000-0000-00000000000b'), 1)$$, 'not_found');
select tests.act_as('00000000-0000-0000-0000-000000000002');
select tests.check((select count(*) = 1 from public.notifications where kind = 'followers_updated'
  and (params ->> 'old')::int = 9000 and (params ->> 'new')::int = 15000), 'curator notified of follower update');
reset role;
update public.social_accounts set followers_updated_at = now() - interval '100 days'
  where creator_id = '00000000-0000-0000-0000-00000000000a';
set role service_role;
select tests.check((public.run_daily() ->> 'followers_reminded')::int = 1, 'stale followers reminded');
select tests.check((public.run_daily() ->> 'followers_reminded')::int = 0, 'reminder not repeated');
reset role;

-- Creators can record that they installed the app --------------------------------
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000a');
update public.profiles set app_installed_at = now() where id = auth.uid();
select tests.check((select app_installed_at is not null from public.profiles where id = auth.uid()), 'app install recorded');
reset role;

-- Taxonomy: curators manage niches/personas; others only read active items ----------
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-000000000002');
insert into public.taxonomy (kind, key, label_id) values ('niche', 'otomotif', 'Otomotif');
update public.taxonomy set active = false where kind = 'niche' and key = 'gaming';
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.check((select count(*) = 12 from public.taxonomy where kind = 'niche'), 'creator sees active niches only');
select tests.expect_error($$insert into public.taxonomy (kind, key, label_id) values ('niche', 'x', 'X')$$, 'row-level security');
reset role;
set role anon;
select tests.check((select count(*) > 0 from public.taxonomy where kind = 'persona'), 'guests can read personas');
select tests.check((select niches = '{}' from public.public_open_jobs() limit 1), 'teaser has niches');
reset role;

-- Fee per tier ------------------------------------------------------------------
select tests.check(public.tier_for(9999) = 'nano' and public.tier_for(10000) = 'micro'
  and public.tier_for(100000) = 'macro' and public.tier_for(1000000) = 'mega', 'tier bands');
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-000000000002');
insert into public.jobs (id, brand_name, title, platforms, deliverables, brief, fee_type, quota, top_days, status, tier_fees)
values ('20000000-0000-0000-0000-0000000000a1', 'Uji', 'Job per tier', '{tiktok,instagram}', 'x', 'x', 'tier', 5, 7, 'open',
  '{"nano": 100000}');
-- B: TikTok 15.000 followers (micro), no Instagram account
select tests.act_as('00000000-0000-0000-0000-00000000000b');
select tests.expect_error($$select public.apply_to_job('20000000-0000-0000-0000-0000000000a1')$$, 'tier_not_offered');
select tests.act_as('00000000-0000-0000-0000-000000000002');
update public.jobs set tier_fees = '{"nano": 100000, "micro": 300000}', tier_basis = 'primary', primary_platform = 'instagram'
  where id = '20000000-0000-0000-0000-0000000000a1';
select tests.act_as('00000000-0000-0000-0000-00000000000b');
select tests.expect_error($$select public.apply_to_job('20000000-0000-0000-0000-0000000000a1')$$, 'no_social_account');
select tests.act_as('00000000-0000-0000-0000-000000000002');
update public.jobs set tier_basis = 'largest', primary_platform = null where id = '20000000-0000-0000-0000-0000000000a1';
select tests.act_as('00000000-0000-0000-0000-00000000000b');
select public.apply_to_job('20000000-0000-0000-0000-0000000000a1');
select tests.act_as('00000000-0000-0000-0000-000000000002');
select public.decide_application(id, true) from public.participations where job_id = '20000000-0000-0000-0000-0000000000a1';
select tests.check((select agreed_fee = 300000 from public.participations where job_id = '20000000-0000-0000-0000-0000000000a1'),
  'accepted at the micro tier fee');
reset role;
set role anon;
select tests.check((select tier_fees ->> 'micro' = '300000' from public.public_open_jobs('20000000-0000-0000-0000-0000000000a1')), 'teaser shows tier fees');
reset role;
