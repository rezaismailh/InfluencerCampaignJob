-- Disguised brands: a job can show creators an alias ("Brand snack nasional")
-- until they are invited or approved. jobs.brand_name holds what creators see
-- before that; the real name lives here, readable only by staff and by creators
-- invited to or approved for the job. Jobs without a row show their real name.

create table public.job_brands (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  real_name text not null check (length(trim(real_name)) > 0)
);

alter table public.job_brands enable row level security;
revoke all on public.job_brands from anon;

create policy job_brands_select on public.job_brands for select
  using (
    public.is_staff()
    or exists (
      select 1 from public.participations pa
      where pa.job_id = job_brands.job_id and pa.creator_id = auth.uid() and pa.status in ('invited', 'approved')
    )
  );
create policy job_brands_insert on public.job_brands for insert with check (public.is_curator());
create policy job_brands_update on public.job_brands for update using (public.is_curator()) with check (public.is_curator());
create policy job_brands_delete on public.job_brands for delete using (public.is_curator());
