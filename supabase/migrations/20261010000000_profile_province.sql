-- Domicile is picked from province and regency/city dropdowns; keep the province too.
alter table public.profiles add column province text;
grant update (province) on public.profiles to authenticated;
