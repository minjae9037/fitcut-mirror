create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx
  on public.profiles (email);

alter table public.profiles enable row level security;

drop policy if exists "service role can manage profiles" on public.profiles;
create policy "service role can manage profiles"
  on public.profiles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
