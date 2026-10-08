-- Remember that a creator opened Tali from the home screen, so the install banner
-- stays hidden in the browser too (iPhone Safari cannot tell the app is installed).
alter table public.profiles add column app_installed_at timestamptz;
grant update (app_installed_at) on public.profiles to authenticated;
