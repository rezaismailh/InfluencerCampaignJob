-- Notes the Tali team keeps about a creator (Admin → Creator → detail). Staff only;
-- creators never see them.

create table public.creator_notes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id),
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index creator_notes_creator on public.creator_notes (creator_id, created_at desc);

alter table public.creator_notes enable row level security;
revoke all on public.creator_notes from anon;

create policy creator_notes_select on public.creator_notes for select using (public.is_staff());
create policy creator_notes_insert on public.creator_notes for insert
  with check (public.is_curator() and author_id = auth.uid());
create policy creator_notes_delete on public.creator_notes for delete
  using (public.is_curator() and author_id = auth.uid());
