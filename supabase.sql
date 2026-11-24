-- Run this once in Supabase → SQL Editor
create table if not exists students    (id text primary key, data jsonb not null);
create table if not exists assignments (id text primary key, data jsonb not null);
create table if not exists submissions (id text primary key, data jsonb not null);
create table if not exists scores      (id text primary key, data jsonb not null);

alter table students    enable row level security;
alter table assignments enable row level security;
alter table submissions enable row level security;
alter table scores      enable row level security;

-- Simple access for a small class (anyone with the link can read/write through the app).
create policy "open students"    on students    for all using (true) with check (true);
create policy "open assignments" on assignments for all using (true) with check (true);
create policy "open submissions" on submissions for all using (true) with check (true);
create policy "open scores"      on scores      for all using (true) with check (true);

-- Public bucket for homework photos
insert into storage.buckets (id, name, public) values ('homework', 'homework', true) on conflict do nothing;
create policy "homework read"   on storage.objects for select using (bucket_id = 'homework');
create policy "homework upload" on storage.objects for insert with check (bucket_id = 'homework');
create policy "homework update" on storage.objects for update using (bucket_id = 'homework');
