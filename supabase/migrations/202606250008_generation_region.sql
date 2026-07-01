alter table public.generation_sessions
  add column if not exists region_name text null;

create index if not exists generation_sessions_region_created_at_idx
  on public.generation_sessions (region_name, created_at desc);
